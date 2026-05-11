import { createClient, type Client } from '@libsql/client';
import path from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import 'dotenv/config';

/**
 * DB 연결 모드:
 * 1. Turso 모드: TURSO_DATABASE_URL 환경변수가 설정되어 있으면 Turso 클라우드 DB에 연결
 * 2. 로컬 모드 (기본): 로컬 SQLite 파일을 사용 (설치 후 바로 사용 가능)
 *
 * 로컬 DB 저장 위치 우선순위:
 *   1) TEACHER_MCP_DB_PATH 환경변수로 지정된 경로
 *   2) 현재 작업 디렉토리의 ./teacher-data/teacher-data.db
 */
function resolveLocalDbPath(): string {
  if (process.env.TEACHER_MCP_DB_PATH) {
    return process.env.TEACHER_MCP_DB_PATH;
  }

  const dataDir = path.resolve(process.cwd(), 'teacher-data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'teacher-data.db');
}

export async function initDb(): Promise<Client> {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  let db: Client;

  if (tursoUrl) {
    // Turso 클라우드 모드
    db = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
    console.error('[DB] Turso 클라우드 DB에 연결됨:', tursoUrl);
  } else {
    // 로컬 SQLite 모드 (기본)
    const localPath = resolveLocalDbPath();
    db = createClient({
      url: `file:${localPath}`,
    });
    console.error(`[DB] 로컬 SQLite DB 사용: ${localPath}`);

    if (!existsSync(localPath)) {
      console.error('[DB] 새 데이터베이스를 생성합니다. ingest_materials 도구로 교과서 PDF를 업로드하세요.');
    }
  }

  // 테이블 생성 (이미 존재하면 무시)
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sources (
      id          TEXT PRIMARY KEY,
      file_path   TEXT NOT NULL UNIQUE,
      source_type TEXT NOT NULL,
      grade       TEXT NOT NULL,
      unit_number INTEGER NOT NULL DEFAULT 0,
      sub_unit    TEXT NOT NULL DEFAULT '',
      parsed_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS units (
      id                  TEXT PRIMARY KEY,
      source_id           TEXT NOT NULL,
      unit_number         INTEGER NOT NULL,
      title               TEXT NOT NULL,
      sub_unit            TEXT NOT NULL DEFAULT '',
      learning_objectives TEXT NOT NULL DEFAULT '[]',
      achievement_std     TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS passages (
      id       TEXT PRIMARY KEY,
      unit_id  TEXT NOT NULL,
      title    TEXT NOT NULL,
      author   TEXT NOT NULL DEFAULT '',
      genre    TEXT NOT NULL DEFAULT '기타',
      content  TEXT NOT NULL,
      lesson   INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS activities (
      id            TEXT PRIMARY KEY,
      unit_id       TEXT NOT NULL,
      passage_id    TEXT,
      activity_type TEXT NOT NULL,
      sequence      INTEGER NOT NULL DEFAULT 0,
      content       TEXT NOT NULL,
      objectives    TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS teacher_notes (
      id         TEXT PRIMARY KEY,
      unit_id    TEXT NOT NULL,
      passage_id TEXT,
      tips       TEXT NOT NULL DEFAULT '',
      questions  TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id               TEXT PRIMARY KEY,
      unit_id          TEXT NOT NULL,
      passage_id       TEXT,
      question_type    TEXT NOT NULL DEFAULT '서술형',
      content          TEXT NOT NULL,
      answer           TEXT NOT NULL DEFAULT '',
      scoring_criteria TEXT NOT NULL DEFAULT ''
    );
  `);

  // 인덱스 생성
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_units_source ON units(source_id)',
    'CREATE INDEX IF NOT EXISTS idx_passages_unit ON passages(unit_id)',
    'CREATE INDEX IF NOT EXISTS idx_passages_genre ON passages(genre)',
    'CREATE INDEX IF NOT EXISTS idx_activities_unit ON activities(unit_id)',
    'CREATE INDEX IF NOT EXISTS idx_activities_passage ON activities(passage_id)',
    'CREATE INDEX IF NOT EXISTS idx_assessments_unit ON assessments(unit_id)',
    'CREATE INDEX IF NOT EXISTS idx_sources_grade ON sources(grade)',
  ];

  for (const sql of indexes) {
    try { await db.execute(sql); } catch { /* index may already exist */ }
  }

  return db;
}
