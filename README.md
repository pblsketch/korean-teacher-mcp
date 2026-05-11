# Korean Teacher MCP

**한국 교사를 위한 AI 수업 도우미** — 교과서 PDF를 업로드하면 활동지, 평가지, 생기부 코멘트, 루브릭, HWPX/PPTX 문서를 AI와 함께 자동 생성할 수 있는 MCP(Model Context Protocol) 서버입니다.

> **설치 후 바로 사용 가능** — 별도의 클라우드 DB 설정 없이, `npx` 한 줄로 실행하고 자신의 교과서 PDF를 업로드하면 됩니다.

---

## ⚡ 1분 시작 가이드

### 방법 1: npx로 바로 실행 (권장)

```bash
npx @pblsketch/korean-teacher-mcp
```

이것만으로 MCP 서버가 실행됩니다. 로컬 SQLite DB가 자동 생성되며, AI 클라이언트에서 바로 연결할 수 있습니다.

### 방법 2: 소스에서 빌드

```bash
git clone https://github.com/pblsketch/korean-teacher-mcp.git
cd korean-teacher-mcp
npm install
npm run build
npm start
```

### 요구 사항

- **Node.js** 18.x 이상
- **Python** 3.10 이상 (HWPX 생성 시 필요)
- **Python 패키지**: `lxml` (`pip install lxml`)

---

## 📚 사용 흐름

```
┌─────────────────────────────────────────────────────────────┐
│  1. MCP 서버 실행                                            │
│     npx @pblsketch/korean-teacher-mcp                       │
│                                                             │
│  2. 내 교과서 PDF 업로드 (AI에게 요청)                         │
│     "이 PDF를 ingest_materials로 업로드해줘"                  │
│     → 로컬 DB에 자동 파싱 및 저장                             │
│                                                             │
│  3. 수업 자료 생성 (AI에게 요청)                              │
│     "1단원 소설 지문으로 활동지 만들어줘"                       │
│     "김민수 학생 교과세특 코멘트 작성해줘"                      │
│     "이 단원 마인드맵 만들어줘"                                │
│                                                             │
│  4. 문서 출력                                                │
│     → HWPX(한글), PPTX(파워포인트) 파일로 자동 변환            │
└─────────────────────────────────────────────────────────────┘
```

### DB 모드

| 모드 | 설정 | 설명 |
|------|------|------|
| **로컬 SQLite (기본)** | 설정 불필요 | 서버 실행 시 `./teacher-data/teacher-data.db` 자동 생성. 자신의 PDF를 업로드하여 사용 |
| **Turso 클라우드** | `.env`에 `TURSO_DATABASE_URL` 설정 | 팀 공유나 원격 접속이 필요한 경우 사용 |

```env
# .env (Turso 클라우드 사용 시에만 필요)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token_here
```

---

## 🔌 AI 클라이언트 연결 가이드

이 MCP 서버는 **stdio**(로컬 1:1 연결)와 **Streamable HTTP**(원격/다중 연결) 두 가지 전송 방식을 지원합니다.

### Claude Desktop / Claude Code

`claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "korean-teacher": {
      "command": "npx",
      "args": ["@pblsketch/korean-teacher-mcp"]
    }
  }
}
```

### Cursor IDE

`.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "korean-teacher": {
      "command": "npx",
      "args": ["@pblsketch/korean-teacher-mcp"]
    }
  }
}
```

### Google Gemini CLI

`~/.gemini/settings.json`:
```json
{
  "mcpServers": {
    "korean-teacher": {
      "command": "npx",
      "args": ["@pblsketch/korean-teacher-mcp"]
    }
  }
}
```

### OpenAI Codex CLI

```bash
codex mcp add korean-teacher -- npx @pblsketch/korean-teacher-mcp
```

### HTTP 모드 (원격 서버, Manus 등)

```bash
npx @pblsketch/korean-teacher-mcp --http
# → http://localhost:3000/mcp
```

Manus나 원격 AI 클라이언트에서는 이 URL을 Custom MCP Server URL로 등록합니다.

---

## 📋 제공 도구 (Tools) — 총 16개

### 데이터 관리

| 도구명 | 설명 |
|--------|------|
| `ingest_materials` | 교과서 PDF/HWP/HWPX를 파싱하여 DB에 저장. 메타데이터(학년, 단원) 직접 지정 가능 |
| `db_status` | DB 현황 확인 (업로드된 자료 수, 학년 목록, 최근 업로드 내역) |
| `search_content` | 저장된 지문, 활동, 평가 문항을 키워드/조건으로 검색 |

### 수업 자료 생성

| 도구명 | 설명 |
|--------|------|
| `generate_worksheet` | 활동지 생성 (단원 데이터 기반) |
| `generate_assessment` | 형성평가/수행평가 문항 생성 |
| `generate_pbl` | PBL(프로젝트 기반 학습) 설계 |
| `generate_discussion` | 토론 활동 설계 |

### 교사 업무 지원

| 도구명 | 설명 |
|--------|------|
| `generate_student_comment` | 생기부 코멘트 작성 가이드 (교과세특/행동특성/독서활동/창체) |
| `generate_rubric` | 루브릭(평가기준표) 3~5단계 자동 생성 |
| `generate_differentiated_text` | 수준별 지문 변환 (기초/일반/심화 3단계) |
| `analyze_vocabulary_level` | 어휘 난이도 분석 (A~D 등급) 및 학습 자료 생성 |
| `generate_mindmap` | 마인드맵/다이어그램 Mermaid.js 코드 생성 |

### 문서 출력

| 도구명 | 설명 |
|--------|------|
| `export_hwpx` | HWPX(한글) 문서 출력 |
| `export_pptx` | PPTX(파워포인트) 출력 (12종 교육용 테마) |
| `export_thinking_tool` | 사고 도구 활동지(PPTX) 출력 |

---

## 🧠 Skills (AI 전문성 레시피)

이 MCP 서버는 도구(Tools)뿐만 아니라 **Skills**도 제공합니다. Skills는 AI에게 "교육 전문가처럼 행동하는 방법"을 알려주는 지침입니다.

| 구분 | Tools (도구) | Skills (스킬) |
|------|-------------|--------------|
| **역할** | "무엇을 할 수 있는가" (기능) | "어떻게 해야 하는가" (노하우) |
| **비유** | 주방 도구 (칼, 오븐) | 요리 레시피 (절차, 팁) |
| **접근** | MCP 프로토콜로 호출 | MCP 리소스 또는 AI별 규칙 파일로 자동 로드 |

### 제공 Skills (12종)

PBL 수업 설계 · 루브릭 작성 · 토론 수업 설계 · UDL 수업 설계 · 사고 루틴 설계 · HWPX 작성법 · PPTX 작성법 · 수준별 수업 설계 · 교과서 분석 · 평가 문항 출제 · 활동지 설계 · 생기부 작성

### AI별 Skills 자동 인식

| AI 클라이언트 | 규칙 파일 | 자동 인식 |
|-------------|----------|----------|
| Claude Code | `.claude/skills/` | ✅ |
| OpenAI Codex | `AGENTS.md` | ✅ |
| Cursor | `.cursor/rules/` | ✅ |
| Gemini CLI | `.gemini/GEMINI.md` | ✅ |
| Windsurf | `.windsurfrules` | ✅ |
| GitHub Copilot | `.github/copilot-instructions.md` | ✅ |
| 모든 MCP 클라이언트 | `skill://teacher/...` 리소스 | ✅ |

---

## 🛠️ 개발 및 스크립트

```bash
# 개발 모드 (Stdio)
npm run dev

# 개발 모드 (HTTP, 포트 3000)
npm run dev:http

# 프로덕션 빌드 후 실행 (Stdio)
npm run start

# 프로덕션 빌드 후 실행 (HTTP)
npm run start:http
```

### 환경 변수

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `TURSO_DATABASE_URL` | (없음 → 로컬 SQLite) | Turso 클라우드 DB URL |
| `TURSO_AUTH_TOKEN` | (없음) | Turso 인증 토큰 |
| `TEACHER_MCP_DB_PATH` | `./teacher-data/teacher-data.db` | 로컬 DB 파일 경로 커스텀 |
| `PORT` | `3000` | HTTP 모드 포트 |
| `TRANSPORT` | `stdio` | 전송 방식 (`stdio` 또는 `http`) |

---

## 📄 라이선스 및 저작권

이 프로젝트의 코드는 자유롭게 사용할 수 있습니다. 단, 업로드하는 교과서 자료의 저작권은 해당 출판사에 있으므로, 각 사용자가 자신이 보유한 자료만 사용해야 합니다.
