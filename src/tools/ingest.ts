import { z } from 'zod';
import path from 'node:path';
import { readdir, stat, access } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { parseDocument } from '../ingester/parser.js';
import { chunkDocument } from '../ingester/chunker.js';
import { writeToDb } from '../ingester/db-writer.js';
import { parseFilePath } from '../ingester/path-parser.js';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DOCUMENTS_ROOT = path.resolve(__dirname, '../../documents');

const SUPPORTED_EXTENSIONS = new Set(['.hwp', '.hwpx', '.pdf']);

async function collectFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
    } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function registerIngestTool(server: McpServer, db: Client) {
  server.tool(
    'ingest_materials',
    `교과서 자료(PDF/HWP/HWPX)를 파싱하여 DB에 저장합니다.

사용법:
1. 파일 경로 지정: file_path에 PDF/HWP 파일 또는 디렉토리의 절대 경로를 입력
2. 메타데이터 직접 지정: grade, unit_number 등을 직접 입력하면 경로 규칙 없이도 사용 가능

지원 형식: .pdf, .hwp, .hwpx
DB가 비어있다면 먼저 이 도구로 교과서 자료를 업로드하세요.`,
    {
      file_path: z.string().describe('PDF/HWP 파일 또는 디렉토리의 절대 경로'),
      documents_root: z.string().optional().describe('documents 루트 디렉토리 (기본: ./documents)'),
      grade: z.string().optional().describe('학년/과목 (예: "중1-1", "중2-1", "공통국어1", "문학"). 지정하면 경로 규칙을 무시하고 이 값을 사용합니다.'),
      unit_number: z.number().optional().describe('단원 번호 (예: 1, 2, 3). 지정하면 경로 규칙을 무시합니다.'),
      sub_unit: z.string().optional().describe('소단원명 (예: "(1) 비유와 상징"). 지정하면 경로 규칙을 무시합니다.'),
      source_type: z.enum(['textbook', 'research-textbook', 'teacher-guide', 'worksheet', 'activity', 'lesson-plan', 'pbl', 'discussion']).optional().describe('자료 유형. 지정하지 않으면 파일명에서 자동 감지합니다.'),
    },
    async ({ file_path, documents_root, grade, unit_number, sub_unit, source_type }) => {
      // 파일 존재 여부 확인
      if (!await fileExists(file_path)) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              error: true,
              message: `파일 또는 디렉토리를 찾을 수 없습니다: ${file_path}`,
              hint: '절대 경로를 사용해주세요. 예: /Users/teacher/Documents/국어교과서.pdf',
            }, null, 2),
          }],
        };
      }

      const root = documents_root ?? DEFAULT_DOCUMENTS_ROOT;
      let files: string[];

      const fileStat = await stat(file_path);
      if (fileStat.isDirectory()) {
        files = await collectFiles(file_path);
        if (files.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                error: true,
                message: `디렉토리에 지원되는 파일이 없습니다: ${file_path}`,
                hint: '지원 형식: .pdf, .hwp, .hwpx',
              }, null, 2),
            }],
          };
        }
      } else {
        const ext = path.extname(file_path).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.has(ext)) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                error: true,
                message: `지원하지 않는 파일 형식입니다: ${ext}`,
                supported: ['.pdf', '.hwp', '.hwpx'],
                hint: 'PDF, HWP, HWPX 파일만 업로드 가능합니다.',
              }, null, 2),
            }],
          };
        }
        files = [file_path];
      }

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const ingested: string[] = [];

      for (const f of files) {
        // Skip if already ingested
        const existing = await db.execute({ sql: 'SELECT id FROM sources WHERE file_path = ?', args: [f] });
        if (existing.rows.length > 0) {
          skipCount++;
          continue;
        }

        try {
          const parsed = await parseDocument(f);

          // 메타데이터: 사용자 지정 값 우선, 없으면 경로에서 추출
          let meta = parseFilePath(f, root);

          // 사용자가 직접 지정한 메타데이터로 오버라이드
          if (grade) meta.grade = grade;
          if (unit_number !== undefined) meta.unit_number = unit_number;
          if (sub_unit !== undefined) meta.sub_unit = sub_unit;
          if (source_type) meta.source_type = source_type;

          // grade가 비어있으면 파일명에서 추론 시도
          if (!meta.grade) {
            const fileName = path.basename(f, path.extname(f));
            meta.grade = fileName; // 파일명을 grade로 사용
          }

          const chunked = chunkDocument(parsed.markdown, meta.source_type);
          await writeToDb(db, chunked, meta, f);
          successCount++;
          ingested.push(path.basename(f));
        } catch (err) {
          errorCount++;
          errors.push(`${path.basename(f)}: ${err instanceof Error ? err.message : String(err)}`);

          // Graceful fallback: 파싱 실패해도 기본 정보는 저장
          try {
            let meta = parseFilePath(f, root);
            if (grade) meta.grade = grade;
            if (unit_number !== undefined) meta.unit_number = unit_number;
            if (sub_unit !== undefined) meta.sub_unit = sub_unit;
            if (source_type) meta.source_type = source_type;
            if (!meta.grade) meta.grade = path.basename(f, path.extname(f));

            const fallbackDoc = {
              title: path.basename(f, path.extname(f)),
              passages: [{ title: path.basename(f), author: '', genre: '기타', content: `[파싱 실패] ${f}` }],
              activities: [],
              teacherNotes: [],
              assessments: [],
              rawContent: '',
            };
            await writeToDb(db, fallbackDoc, meta, f);
          } catch {
            // Skip entirely
          }
        }
      }

      // DB 현황 조회
      const totalSources = await db.execute('SELECT COUNT(*) as cnt FROM sources');
      const totalPassages = await db.execute('SELECT COUNT(*) as cnt FROM passages');
      const totalUnits = await db.execute('SELECT COUNT(*) as cnt FROM units');

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            result: '인제스트 완료',
            total_files: files.length,
            success: successCount,
            skipped_already_exists: skipCount,
            errors: errorCount,
            ingested_files: ingested.slice(0, 20),
            error_details: errors.slice(0, 10),
            db_status: {
              total_sources: Number(totalSources.rows[0]?.cnt ?? 0),
              total_units: Number(totalUnits.rows[0]?.cnt ?? 0),
              total_passages: Number(totalPassages.rows[0]?.cnt ?? 0),
            },
            next_steps: successCount > 0
              ? '업로드 완료! 이제 search_content, generate_worksheet, generate_assessment 등의 도구를 사용할 수 있습니다.'
              : skipCount > 0
                ? '이미 업로드된 파일입니다. 다른 파일을 업로드하거나 search_content로 검색해보세요.'
                : '파일 업로드에 실패했습니다. 파일 경로와 형식을 확인해주세요.',
          }, null, 2),
        }],
      };
    },
  );

  // DB 상태 확인 도구 추가
  server.tool(
    'db_status',
    `현재 DB의 상태를 확인합니다. 업로드된 교과서 자료의 수, 단원, 지문 등의 현황을 보여줍니다.
DB가 비어있다면 ingest_materials 도구로 교과서 PDF를 먼저 업로드하세요.`,
    {},
    async () => {
      const sources = await db.execute('SELECT COUNT(*) as cnt FROM sources');
      const units = await db.execute('SELECT COUNT(*) as cnt FROM units');
      const passages = await db.execute('SELECT COUNT(*) as cnt FROM passages');
      const activities = await db.execute('SELECT COUNT(*) as cnt FROM activities');
      const assessments = await db.execute('SELECT COUNT(*) as cnt FROM assessments');

      const gradeList = await db.execute('SELECT DISTINCT grade FROM sources ORDER BY grade');
      const grades = gradeList.rows.map(r => r.grade as string);

      const recentSources = await db.execute('SELECT file_path, grade, source_type, parsed_at FROM sources ORDER BY parsed_at DESC LIMIT 5');

      const isEmpty = Number(sources.rows[0]?.cnt ?? 0) === 0;

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            db_mode: process.env.TURSO_DATABASE_URL ? 'turso_cloud' : 'local_sqlite',
            is_empty: isEmpty,
            statistics: {
              sources: Number(sources.rows[0]?.cnt ?? 0),
              units: Number(units.rows[0]?.cnt ?? 0),
              passages: Number(passages.rows[0]?.cnt ?? 0),
              activities: Number(activities.rows[0]?.cnt ?? 0),
              assessments: Number(assessments.rows[0]?.cnt ?? 0),
            },
            available_grades: grades,
            recent_uploads: recentSources.rows.map(r => ({
              file: path.basename(r.file_path as string),
              grade: r.grade,
              type: r.source_type,
              date: r.parsed_at,
            })),
            message: isEmpty
              ? '⚠️ DB가 비어있습니다. ingest_materials 도구로 교과서 PDF를 업로드하세요.\n예시: ingest_materials({ file_path: "/path/to/교과서.pdf", grade: "중1-1", unit_number: 1 })'
              : `✅ ${grades.length}개 학년/과목, ${Number(passages.rows[0]?.cnt ?? 0)}개 지문이 준비되어 있습니다.`,
          }, null, 2),
        }],
      };
    },
  );
}
