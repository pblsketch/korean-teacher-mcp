# AGENTS.md — korean-teacher-mcp 프로젝트 가이드

> 이 파일은 OpenAI Codex CLI 등 AGENTS.md를 인식하는 AI 에이전트를 위한 프로젝트 컨텍스트입니다.

## 프로젝트 개요

**korean-teacher-mcp**는 한국 중등 국어 교과서(교과서) 데이터를 기반으로, 교사의 수업 설계·평가·자료 제작을 AI로 지원하는 MCP(Model Context Protocol) 서버입니다.

## 핵심 아키텍처

```
교사 요청 → AI + Skills(전문성) → MCP Tools(도구) → DB 검색 → 출력(HWPX/PPTX/Mermaid)
```

### Skills (스킬) = "어떻게 해야 하는가" (절차와 품질 기준)

AI가 교육 전문가처럼 행동하기 위한 워크플로우 가이드입니다. MCP 리소스(`skill://teacher/...`)로 접근 가능합니다.

| 스킬 | 설명 | 트리거 키워드 |
|------|------|--------------|
| teacher-rubric | Susan M. Brookhart 원칙 기반 루브릭 제작 | 루브릭, 평가 기준표, 수행 수준, 채점 기준 |
| teacher-pbl | 프로젝트 기반 학습 설계 | PBL, 프로젝트 주제, 탐구질문, Driving Question |
| teacher-udl | 보편적 학습 설계 | UDL, 보편적 설계, 다양한 학습자, 접근성 |
| teacher-thinking-routines | 사고 루틴 설계 | 사고 루틴, Visible Thinking, 생각 도구 |
| teacher-assessment | 평가 계획 및 수행과제 설계 | 수행평가, 형성평가, 평가 계획, 과정중심평가 |
| teacher-quiz | 퀴즈/문항 제작 | 퀴즈, 문항, 선택형, 서술형, 시험 문제 |
| teacher-lesson-planning | 수업·단원 설계 | 수업 설계, 단원 계획, 차시 계획, 교수학습 |
| teacher-differentiation | 수준별 맞춤 수업 | 수준별, 맞춤형, 개별화, 차별화 수업 |
| teacher-instructional-materials | 학습지·활동지 제작 | 학습지, 활동지, 워크시트, 수업 자료 |
| teacher-ai-task-redesign | AI 시대 과제 재설계 | SAMR, AI 과제, 과제 재설계, 블룸 |
| teacher-sdgs | SDGs 연계 수업 | SDGs, 지속가능발전, 세계시민교육 |
| teacher-concept-based-inquiry | 개념 기반 탐구 수업 | 개념 기반, 빅 아이디어, 전이, 탐구 |

### Tools (도구) = "무엇을 할 수 있는가" (기능)

MCP 프로토콜로 호출 가능한 14개 함수입니다.

| 도구 | 기능 |
|------|------|
| search_content | 교과서 DB에서 지문·활동·평가 검색 |
| ingest_pdf | PDF 교과서 파싱 후 DB 저장 |
| generate_worksheet | 활동지 마크다운 생성 |
| generate_assessment | 평가지 마크다운 생성 |
| generate_discussion | 토론 수업 설계 |
| generate_pbl | PBL 주제 추천 |
| export_hwpx | 마크다운 → HWPX(한글) 변환 |
| export_pptx | 마크다운 → PPTX 변환 |
| thinking_tool | 사고 루틴 활동지 생성 |
| export_thinking_tool | 사고 루틴 HWPX 내보내기 |
| generate_student_comment | 생활기록부 코멘트 가이드 |
| generate_rubric | 루브릭 생성 가이드 |
| generate_differentiated_text | 수준별 지문 변환 가이드 |
| analyze_vocabulary_level | 어휘 난이도 분석 가이드 |
| generate_mindmap | 마인드맵/다이어그램 Mermaid 코드 생성 |

## 워크플로우 규칙

1. **교사의 요청이 들어오면**, 먼저 해당하는 스킬의 트리거 키워드를 매칭합니다.
2. **스킬을 참조**하여 워크플로우(절차)를 따릅니다.
3. **MCP 도구를 호출**하여 DB에서 데이터를 가져오거나 결과물을 생성합니다.
4. **출력 형식**은 교사의 요청에 따라 마크다운, HWPX, PPTX, Mermaid 중 선택합니다.

## 스킬 라우팅 (겹치는 요청 처리)

- "루브릭 만들어줘" → `teacher-rubric`
- "수행평가 전체 계획" → `teacher-assessment`
- "퀴즈/시험 문제" → `teacher-quiz`
- "학습지/활동지" → `teacher-instructional-materials`
- "수업 설계/단원 계획" → `teacher-lesson-planning`
- "PBL/프로젝트" → `teacher-pbl`
- "수준별/맞춤형" → `teacher-differentiation`

## 기술 스택

- TypeScript + Node.js 18+
- MCP SDK (`@modelcontextprotocol/sdk`)
- Turso/libSQL (SQLite 호환 DB)
- Drizzle ORM
- Python 3.10+ (HWPX 빌드용 `build_hwpx.py`)
- Express (HTTP 모드)
