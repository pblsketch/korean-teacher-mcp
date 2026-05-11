# korean-teacher-mcp Design Document

> **Summary**: 교과서 국어 교과서 자료를 SQLite DB로 구조화하고 Claude Code에서 MCP 도구로 호출하는 로컬 MCP 서버
>
> **Project**: korean-teacher-mcp
> **Author**: 교과서 AI 협업 프로젝트
> **Date**: 2026-04-10
> **Status**: Draft
> **Planning Doc**: [korean-teacher-mcp.plan.md](../../01-plan/features/korean-teacher-mcp.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- PDF 자료 → SQLite 자동 파싱·저장 파이프라인 구축 (kordoc 활용)
- MCP 프로토콜로 Claude Code와 통합, 6개 도구 제공
- 지문·활동지·지도서·평가 자료를 단원/학년 단위로 검색·주입
- kordoc `markdownToHwpx`로 생성 결과물을 HWPX 파일로 직접 출력
- 서버 없이 로컬 SQLite만으로 동작 (교과서 내부 배포)

### 1.2 Design Principles

- **로컬 우선**: 외부 서버 없이 `teacher.db` 하나로 완결
- **파싱 독립성**: kordoc이 지원하지 않는 케이스는 graceful fallback (원문 텍스트 저장)
- **도구 단순성**: 각 MCP 도구는 단일 책임, 컨텍스트 주입은 Claude가 처리
- **한국어 특화**: SQLite FTS5 `unicode61` tokenizer, 장르·학년·단원 메타 필터

---

## 2. Architecture

### 2.1 전체 구조

```
Claude Code (사용자)
       │  MCP Protocol (stdio)
       ▼
┌─────────────────────────────────┐
│         MCP Server              │
│  server.ts (McpServer)          │
│                                 │
│  Tools                          │
│  ├── ingest_materials           │
│  ├── search_content             │
│  ├── generate_worksheet         │
│  ├── generate_assessment        │
│  ├── generate_pbl               │
│  └── generate_discussion        │
└──────────┬──────────────────────┘
           │
    ┌──────┴──────┐
    │  SQLite DB  │  (teacher.db, 로컬 파일)
    │  better-    │
    │  sqlite3    │
    └──────┬──────┘
           │
    ┌──────┴──────┐
    │   kordoc    │  (PDF → Markdown → HWPX)
    └─────────────┘
```

### 2.2 Ingestion Flow

```
[PDF 파일]
    │
    ▼  kordoc.parseFile()
[Markdown 텍스트]
    │
    ▼  chunker.ts (정규식 기반 분리)
[단원 / 지문 / 활동 / 교사노트 / 평가]
    │
    ▼  db-writer.ts
[SQLite: sources → units → passages → activities → ...]
    │
    ▼  FTS5 트리거 or 수동 인덱싱
[content_fts 가상 테이블]
```

### 2.3 Generation Flow

```
[Claude 호출: generate_worksheet({unit_id, class_info})]
    │
    ▼  search_content() 내부 호출
[passages + activities + teacher_notes 쿼리]
    │
    ▼  컨텍스트 구성 (Markdown)
[Claude 생성 → Markdown 결과물]
    │
    ▼  kordoc.markdownToHwpx()
[HWPX 파일 출력]
```

### 2.4 Dependencies

| 패키지 | 버전 목표 | 용도 |
|--------|-----------|------|
| `@modelcontextprotocol/sdk` | latest | MCP 서버 SDK |
| `better-sqlite3` | ^9.x | SQLite 동기 드라이버 |
| `@types/better-sqlite3` | ^9.x | TypeScript 타입 |
| `kordoc` | latest | PDF 파싱 + HWPX 출력 |
| `uuid` | ^9.x | ID 생성 |
| `typescript` | ^5.x | 빌드 |
| `tsx` | latest | 개발 실행 (ts-node 대체) |
| `zod` | ^3.x | 도구 입력 스키마 검증 |

---

## 3. Data Model

### 3.1 TypeScript 타입 정의

```typescript
// src/types/index.ts

export type SourceType =
  | 'textbook'
  | 'teacher-guide'
  | 'activity'
  | 'pbl'
  | 'discussion'
  | 'assessment';

export type Grade = '중1' | '중2' | '중3' | '고1' | '고2' | '고3';

export type Genre =
  | '시' | '소설' | '수필' | '극'
  | '설명문' | '논설문' | '기사문' | '기타';

export type ActivityType =
  | '읽기' | '쓰기' | '말하기' | '듣기' | '문법' | '문학';

export type QuestionType = '선택형' | '서술형' | '논술형';

export interface Source {
  id: string;
  file_path: string;
  source_type: SourceType;
  grade: Grade;
  semester: number;
  parsed_at: string;
}

export interface Unit {
  id: string;
  source_id: string;
  unit_number: number;
  title: string;
  learning_objectives: string[];  // JSON 직렬화 → TEXT
  achievement_std: string[];      // 성취기준 코드 JSON
}

export interface Passage {
  id: string;
  unit_id: string;
  title: string;
  author: string;
  genre: Genre;
  content: string;
  lesson: number;
}

export interface Activity {
  id: string;
  unit_id: string;
  passage_id: string | null;
  activity_type: ActivityType;
  sequence: number;
  content: string;
  objectives: string;
}

export interface TeacherNote {
  id: string;
  unit_id: string;
  passage_id: string | null;
  tips: string;
  questions: string[];  // 발문 목록 JSON
}

export interface Assessment {
  id: string;
  unit_id: string;
  passage_id: string | null;
  question_type: QuestionType;
  content: string;
  answer: string;
  scoring_criteria: string;
}

// MCP 도구 입출력 타입
export interface SearchResult {
  passages: Passage[];
  activities: Activity[];
  teacher_notes: TeacherNote[];
  assessments: Assessment[];
}

export interface GenerateOptions {
  unit_id: string;
  class_info?: string;
  num_questions?: number;
  question_types?: QuestionType[];
  num_sessions?: number;
  discussion_type?: '찬반' | '원탁' | '소그룹' | '패널';
}
```

### 3.2 DB 스키마 (최종)

```sql
-- src/db/schema.ts 에서 실행

CREATE TABLE IF NOT EXISTS sources (
  id          TEXT PRIMARY KEY,
  file_path   TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN (
    'textbook','teacher-guide','activity','pbl','discussion','assessment'
  )),
  grade       TEXT NOT NULL,
  semester    INTEGER NOT NULL DEFAULT 1,
  parsed_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id                  TEXT PRIMARY KEY,
  source_id           TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  unit_number         INTEGER NOT NULL,
  title               TEXT NOT NULL,
  learning_objectives TEXT NOT NULL DEFAULT '[]',
  achievement_std     TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS passages (
  id       TEXT PRIMARY KEY,
  unit_id  TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  author   TEXT NOT NULL DEFAULT '',
  genre    TEXT NOT NULL DEFAULT '기타',
  content  TEXT NOT NULL,
  lesson   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS activities (
  id            TEXT PRIMARY KEY,
  unit_id       TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  passage_id    TEXT REFERENCES passages(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  sequence      INTEGER NOT NULL DEFAULT 0,
  content       TEXT NOT NULL,
  objectives    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS teacher_notes (
  id         TEXT PRIMARY KEY,
  unit_id    TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  passage_id TEXT REFERENCES passages(id) ON DELETE SET NULL,
  tips       TEXT NOT NULL DEFAULT '',
  questions  TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS assessments (
  id               TEXT PRIMARY KEY,
  unit_id          TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  passage_id       TEXT REFERENCES passages(id) ON DELETE SET NULL,
  question_type    TEXT NOT NULL CHECK(question_type IN ('선택형','서술형','논술형')),
  content          TEXT NOT NULL,
  answer           TEXT NOT NULL DEFAULT '',
  scoring_criteria TEXT NOT NULL DEFAULT ''
);

-- FTS5 전문 검색 (지문 + 활동 통합 검색)
CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
  row_id UNINDEXED,   -- passages.id 또는 activities.id
  table_name UNINDEXED, -- 'passages' 또는 'activities'
  content,
  title,
  tokenize='unicode61'
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_units_source ON units(source_id);
CREATE INDEX IF NOT EXISTS idx_passages_unit ON passages(unit_id);
CREATE INDEX IF NOT EXISTS idx_passages_genre ON passages(genre);
CREATE INDEX IF NOT EXISTS idx_activities_unit ON activities(unit_id);
CREATE INDEX IF NOT EXISTS idx_activities_passage ON activities(passage_id);
CREATE INDEX IF NOT EXISTS idx_assessments_unit ON assessments(unit_id);
```

---

## 4. MCP 도구 상세 명세

### 4.1 `ingest_materials`

**입력 스키마 (Zod)**
```typescript
z.object({
  file_path: z.string().describe('PDF 파일 절대 경로'),
  source_type: z.enum(['textbook','teacher-guide','activity','pbl','discussion','assessment']),
  grade: z.enum(['중1','중2','중3','고1','고2','고3']),
  semester: z.number().int().min(1).max(2).default(1),
})
```

**처리 로직**
1. `kordoc.parseFile(file_path)` → Markdown 텍스트 반환
2. `chunker.chunkDocument(markdown, source_type)` → 단원/지문/활동 배열
3. DB 트랜잭션: sources → units → passages/activities/teacher_notes/assessments 순 저장
4. FTS5 인덱스 업데이트: passages, activities 내용 삽입

**출력**
```json
{
  "source_id": "uuid",
  "units_count": 8,
  "passages_count": 24,
  "activities_count": 96,
  "message": "인제스트 완료: 중2 1학기 교과서"
}
```

---

### 4.2 `search_content`

**입력 스키마**
```typescript
z.object({
  grade: z.enum(['중1','중2','중3','고1','고2','고3']).optional(),
  unit_number: z.number().int().optional(),
  genre: z.enum(['시','소설','수필','극','설명문','논설문','기사문','기타']).optional(),
  source_type: z.enum([...]).optional(),
  keyword: z.string().optional().describe('FTS5 키워드 검색'),
  unit_id: z.string().optional().describe('직접 단원 ID 지정'),
  limit: z.number().int().default(10),
})
```

**처리 로직**
```sql
-- 1단계: 단원 필터링
SELECT u.* FROM units u
JOIN sources s ON s.id = u.source_id
WHERE (s.grade = ? OR ? IS NULL)
  AND (u.unit_number = ? OR ? IS NULL)
  AND (s.source_type = ? OR ? IS NULL)

-- 2단계: 키워드가 있으면 FTS5
SELECT row_id, table_name FROM content_fts
WHERE content_fts MATCH ?
ORDER BY rank LIMIT ?

-- 3단계: 연관 데이터 조회
-- passages, activities, teacher_notes, assessments JOIN
```

**출력**: `SearchResult` 객체 (JSON)

---

### 4.3 `generate_worksheet`

**입력 스키마**
```typescript
z.object({
  unit_id: z.string(),
  class_info: z.string().optional().describe('e.g. "토론 좋아하는 반, 독해력 중상"'),
  activity_types: z.array(z.enum(['읽기','쓰기','말하기','듣기','문법','문학'])).optional(),
  output_path: z.string().optional().describe('HWPX 저장 경로, 기본: ./output/{unit_id}.hwpx'),
})
```

**처리 로직**
1. `search_content({ unit_id })` 호출 → 지문 + 활동 + 교사노트 수집
2. 컨텍스트 Markdown 구성 (지문 원문, 기존 활동, 교사 발문, 학급 정보)
3. Claude에 프롬프트 전달 → 생성된 활동지 Markdown 반환
4. `kordoc.markdownToHwpx(markdown, output_path)` → HWPX 파일 생성

**출력**
```json
{
  "hwpx_path": "/absolute/path/output/unit_001.hwpx",
  "preview_markdown": "## 1단원 활동지\n...",
  "activities_count": 5
}
```

---

### 4.4 `generate_assessment`

**입력 스키마**
```typescript
z.object({
  unit_id: z.string(),
  num_questions: z.number().int().min(1).max(50).default(10),
  question_types: z.array(z.enum(['선택형','서술형','논술형'])).default(['선택형']),
  difficulty: z.enum(['하','중','상','혼합']).default('혼합'),
  include_answers: z.boolean().default(true),
  output_path: z.string().optional(),
})
```

**처리 로직**
1. `search_content({ unit_id })` → 지문 + 기존 assessments 수집
2. 기존 문항을 참고 예시로 Claude에 제공
3. 문항 수·유형·난이도 지시와 함께 Claude 생성 요청
4. HWPX 출력 (문제지 + 별지 정답·채점기준)

---

### 4.5 `generate_pbl`

**입력 스키마**
```typescript
z.object({
  unit_id: z.string(),
  num_sessions: z.number().int().min(1).max(10).default(4),
  class_characteristics: z.string().optional(),
  output_format: z.enum(['markdown', 'hwpx']).default('hwpx'),
})
```

**출력**: PBL 수업 설계안 + 평가 루브릭 (HWPX or Markdown)

---

### 4.6 `generate_discussion`

**입력 스키마**
```typescript
z.object({
  passage_id: z.string(),
  discussion_type: z.enum(['찬반','원탁','소그룹','패널']).default('찬반'),
  group_size: z.number().int().min(2).max(8).default(4),
  output_path: z.string().optional(),
})
```

**출력**: 진행 시나리오 + 역할 카드 (HWPX)

---

## 5. Chunker 설계 (`src/ingester/chunker.ts`)

kordoc이 반환하는 Markdown을 의미 단위로 분리하는 핵심 로직.

### 5.1 단원 분리 규칙

```
# 제목 (H1) → 단원 제목으로 인식
## 소제목 (H2) → 지문 또는 활동 섹션 구분
### 세부 (H3) → 세부 활동 구분
```

### 5.2 지문 추출 패턴

```typescript
const PASSAGE_PATTERNS = [
  /^## \d+\.\s+(.+)/,       // ## 1. 봄봄
  /^## 지문\s*[:：]\s*(.+)/, // ## 지문: 봄봄
  /^> \*\*(.+)\*\*/,         // > **작품명**
];

const AUTHOR_PATTERN = /작가[：:]\s*(.+)|저자[：:]\s*(.+)/;
const GENRE_KEYWORDS = { '시': ['연', '행', '수미'], '소설': ['서사', '인물'] };
```

### 5.3 활동 추출 패턴

```typescript
const ACTIVITY_PATTERNS = [
  /^\d+\.\s+다음을?\s+/,      // 1. 다음을 읽고
  /^활동\s*\d+[.：:]/,        // 활동 1:
  /^\[활동\]/,                 // [활동]
];
```

### 5.4 교사용 지도서 전용 패턴

```typescript
const TEACHER_TIP_PATTERN = /지도\s*(?:팁|포인트|방법)[：:]/;
const QUESTION_PATTERN = /발문\s*\d*[：:]/;
```

---

## 6. MCP 서버 구현 (`src/server.ts`)

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initDb } from './db/schema.js';
import { registerIngestTool } from './tools/ingest.js';
import { registerSearchTool } from './tools/search.js';
import { registerWorksheetTool } from './tools/generate-worksheet.js';
import { registerAssessmentTool } from './tools/generate-assessment.js';
import { registerPblTool } from './tools/generate-pbl.js';
import { registerDiscussionTool } from './tools/generate-discussion.js';

async function main() {
  const db = initDb();

  const server = new McpServer({
    name: 'korean-teacher-mcp',
    version: '1.0.0',
  });

  registerIngestTool(server, db);
  registerSearchTool(server, db);
  registerWorksheetTool(server, db);
  registerAssessmentTool(server, db);
  registerPblTool(server, db);
  registerDiscussionTool(server, db);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

---

## 7. 파일 구조 (구현 대상)

```
korean-teacher-mcp/
├── src/
│   ├── server.ts                     ← MCP 서버 진입점
│   ├── types/
│   │   └── index.ts                  ← 모든 타입 정의
│   ├── db/
│   │   ├── schema.ts                 ← initDb(), CREATE TABLE 실행
│   │   └── queries.ts                ← 재사용 쿼리 함수들
│   ├── ingester/
│   │   ├── pdf-parser.ts             ← kordoc.parseFile() 래퍼
│   │   ├── chunker.ts                ← Markdown → 구조화 청크
│   │   └── db-writer.ts             ← 청크 → SQLite 저장
│   └── tools/
│       ├── ingest.ts                 ← ingest_materials 도구
│       ├── search.ts                 ← search_content 도구
│       ├── generate-worksheet.ts     ← generate_worksheet 도구
│       ├── generate-assessment.ts    ← generate_assessment 도구
│       ├── generate-pbl.ts           ← generate_pbl 도구
│       └── generate-discussion.ts   ← generate_discussion 도구
├── teacher.db                        ← SQLite (로컬, .gitignore)
├── output/                           ← HWPX 출력 디렉토리
├── package.json
├── tsconfig.json
└── setup.md                          ← 교과서 배포용 설치 가이드
```

---

## 8. 쿼리 패턴 (`src/db/queries.ts`)

```typescript
import Database from 'better-sqlite3';

export function getUnitsByFilter(db: Database.Database, params: {
  grade?: string;
  unit_number?: number;
  source_type?: string;
}): Unit[] {
  let sql = `
    SELECT u.* FROM units u
    JOIN sources s ON s.id = u.source_id
    WHERE 1=1
  `;
  const args: unknown[] = [];
  if (params.grade) { sql += ' AND s.grade = ?'; args.push(params.grade); }
  if (params.unit_number) { sql += ' AND u.unit_number = ?'; args.push(params.unit_number); }
  if (params.source_type) { sql += ' AND s.source_type = ?'; args.push(params.source_type); }
  return db.prepare(sql).all(...args) as Unit[];
}

export function ftsSearch(db: Database.Database, keyword: string, limit = 10) {
  return db.prepare(`
    SELECT row_id, table_name, snippet(content_fts, 2, '<b>', '</b>', '...', 20) AS snippet
    FROM content_fts
    WHERE content_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(keyword, limit);
}

export function insertFts(db: Database.Database, row_id: string, table_name: string, content: string, title: string) {
  db.prepare(`
    INSERT INTO content_fts(row_id, table_name, content, title) VALUES (?, ?, ?, ?)
  `).run(row_id, table_name, content, title);
}
```

---

## 9. package.json

```json
{
  "name": "korean-teacher-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/server.ts",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "better-sqlite3": "^9.0.0",
    "kordoc": "latest",
    "uuid": "^9.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^9.0.0",
    "@types/uuid": "^9.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 10. Claude Desktop 연결 설정

교과서 배포 시 `claude_desktop_config.json`에 추가:

```json
{
  "mcpServers": {
    "teacher-korean": {
      "command": "node",
      "args": ["/absolute/path/to/korean-teacher-mcp/dist/server.js"],
      "env": {}
    }
  }
}
```

개발 중 (`tsx` 사용):
```json
{
  "mcpServers": {
    "teacher-korean": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/korean-teacher-mcp/src/server.ts"]
    }
  }
}
```

---

## 11. 구현 순서 (Do Phase 기준)

1. [ ] `package.json` + `tsconfig.json` 초기화
2. [ ] `src/types/index.ts` — 모든 타입 정의
3. [ ] `src/db/schema.ts` — initDb(), CREATE TABLE/INDEX/FTS5
4. [ ] `src/db/queries.ts` — getUnitsByFilter, ftsSearch, insertFts 등
5. [ ] `src/ingester/pdf-parser.ts` — kordoc.parseFile() 래퍼
6. [ ] `src/ingester/chunker.ts` — Markdown → 구조화 청크 분리
7. [ ] `src/ingester/db-writer.ts` — 청크 → SQLite 저장 트랜잭션
8. [ ] `src/tools/ingest.ts` — ingest_materials MCP 도구
9. [ ] `src/tools/search.ts` — search_content MCP 도구
10. [ ] `src/server.ts` — MCP 서버 진입점 + 도구 등록
11. [ ] `src/tools/generate-worksheet.ts` — 활동지 생성
12. [ ] `src/tools/generate-assessment.ts` — 형성평가 생성
13. [ ] `src/tools/generate-pbl.ts` — PBL 설계안 생성
14. [ ] `src/tools/generate-discussion.ts` — 토의토론 자료 생성
15. [ ] `setup.md` — 교과서 배포 가이드

---

## 12. 에러 처리 전략

| 상황 | 처리 방식 |
|------|-----------|
| kordoc 파싱 실패 | 원문 텍스트 전체를 단일 passage로 저장, 경고 반환 |
| HWPX 변환 실패 | Markdown 파일로 fallback 저장 |
| FTS5 검색 결과 없음 | 메타데이터 필터로만 재시도 |
| 단원 ID 없음 | 에러 메시지 + 사용 가능한 grade/unit 목록 반환 |
| DB 파일 없음 | initDb() 자동 실행 후 재시도 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-04-10 | Initial design — MCP 서버 구조, DB 스키마, 6개 도구 명세 |
