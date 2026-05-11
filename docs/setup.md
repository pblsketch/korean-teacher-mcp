# korean-teacher-mcp 설치 가이드

교과서 국어 교과서 MCP 서버 설치 및 설정 안내

## 요구 사항

- Node.js 18 이상
- Claude Code 또는 Claude Desktop

## 설치

```bash
cd korean-teacher-mcp
npm install
npm run build
```

## Claude Code 설정

`~/.claude.json` 또는 프로젝트의 `.claude/settings.json`에 추가:

```json
{
  "mcpServers": {
    "teacher-korean": {
      "command": "node",
      "args": ["/absolute/path/to/korean-teacher-mcp/dist/server.js"]
    }
  }
}
```

개발 중 (tsx 사용):

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

## Claude Desktop 설정

`claude_desktop_config.json`에 추가:

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

## 교과서 자료 인제스트

MCP 서버 연결 후 Claude에게 요청:

```
교과서 교과서 자료를 인제스트해줘.
경로: E:\github\korean-teacher-mcp\documents
```

또는 특정 파일만:

```
이 파일을 인제스트해줘: E:\github\korean-teacher-mcp\documents\middle\1-1\1-1-1\공통 자료\중학 국어1-1_1단원_교과서 본문.pdf
```

## 사용 예시

### 자료 검색
```
중1 1학기 1단원 자료를 검색해줘
```

### 활동지 생성
```
중1 1학기 1단원 비유 소단원으로 활동지 만들어줘. 우리 반은 토론을 좋아해.
```

### PBL 수업 설계
```
공통국어1 1단원으로 PBL 4차시 수업 설계해줘.
```

### 형성평가 만들기
```
중2 1학기 2단원 서술형 평가 5문항 만들어줘.
```

### 토론 수업 설계
```
이 단원 지문으로 찬반토론 수업 자료 만들어줘. 모둠은 4명이야.
```

## 문서 출력 (선택)

한글 파일(.hwpx) 출력이 필요하면:
- [hwpxskill](https://github.com/Canine89/hwpxskill) 설치

PPT 파일(.pptx) 출력이 필요하면:
- [pptx-design-styles](https://github.com/corazzon/pptx-design-styles) 설치

## MCP 도구 목록

| 도구 | 설명 |
|------|------|
| `ingest_materials` | HWP/PDF 파일을 파싱하여 DB에 저장 |
| `search_content` | 학년/과목/단원/키워드로 자료 검색 |
| `generate_worksheet` | 활동지 생성을 위한 컨텍스트 반환 |
| `generate_assessment` | 평가 생성을 위한 컨텍스트 반환 |
| `generate_pbl` | PBL 수업 설계를 위한 컨텍스트 반환 |
| `generate_discussion` | 토론 수업 자료를 위한 컨텍스트 반환 |

## MCP 리소스 (교수법 프롬프트)

| 리소스 | 교수법 |
|--------|--------|
| `prompt://teacher/pbl` | PBL 수업 설계 |
| `prompt://teacher/rubric` | 루브릭 생성 |
| `prompt://teacher/udl` | 보편적 학습 설계 (UDL) |
| `prompt://teacher/thinking-routines` | 사고 루틴 (Project Zero) |
| `prompt://teacher/ai-task-redesign` | AI 대응 과제 재설계 |
| `prompt://teacher/quiz` | 퀴즈/형성평가 |
| `prompt://teacher/sdgs` | SDGs 연계 수업 |
| `prompt://teacher/lesson-planning` | 수업 설계 |
| `prompt://teacher/assessment` | 평가 개발 |
| `prompt://teacher/instructional-materials` | 수업 자료 |
| `prompt://teacher/differentiation` | 개별화 학습 |
