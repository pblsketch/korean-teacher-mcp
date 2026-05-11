import 'dotenv/config';
import { initDb } from './db/schema.js';
import { parseDocument } from './ingester/parser.js';
import { chunkDocument } from './ingester/chunker.js';
import { writeToDb } from './ingester/db-writer.js';
import { parseFilePath } from './ingester/path-parser.js';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCUMENTS_ROOT = path.resolve(__dirname, '../documents');
const SUPPORTED = new Set(['.hwp', '.hwpx', '.pdf']);
const CONCURRENCY = 5;

async function collectFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
    } else if (SUPPORTED.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function processFile(db: Awaited<ReturnType<typeof initDb>>, f: string): Promise<'success' | 'skip' | 'error'> {
  const existing = await db.execute({ sql: 'SELECT id FROM sources WHERE file_path = ?', args: [f] });
  if (existing.rows.length > 0) return 'skip';

  try {
    const parsed = await parseDocument(f);
    const meta = parseFilePath(f, DOCUMENTS_ROOT);
    const chunked = chunkDocument(parsed.markdown, meta.source_type);
    await writeToDb(db, chunked, meta, f);
    return 'success';
  } catch (err) {
    console.error(`[ERROR] ${path.basename(f)}: ${err instanceof Error ? err.message : err}`);
    // Fallback
    try {
      const meta = parseFilePath(f, DOCUMENTS_ROOT);
      const fallbackDoc = {
        title: path.basename(f, path.extname(f)),
        passages: [{ title: path.basename(f), author: '', genre: '기타', content: `[파싱 실패] ${f}` }],
        activities: [], teacherNotes: [], assessments: [], rawContent: '',
      };
      await writeToDb(db, fallbackDoc, meta, f);
    } catch { /* skip */ }
    return 'error';
  }
}

async function main() {
  console.log('DB 초기화...');
  const db = await initDb();

  console.log('파일 수집...');
  const files = await collectFiles(DOCUMENTS_ROOT);
  console.log(`총 ${files.length}개 파일 발견`);

  let success = 0, skip = 0, errors = 0, done = 0;

  // Process in parallel batches
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(f => processFile(db, f)));

    for (const r of results) {
      if (r === 'success') success++;
      else if (r === 'skip') skip++;
      else errors++;
    }
    done += batch.length;

    if (done % 20 === 0 || done === files.length) {
      console.log(`[${done}/${files.length}] 성공: ${success}, 건너뜀: ${skip}, 실패: ${errors}`);
    }
  }

  console.log(`\n완료! 성공: ${success}, 건너뜀: ${skip}, 실패: ${errors}`);
}

main().catch(console.error);
