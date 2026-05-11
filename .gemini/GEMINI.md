# korean-teacher-mcp — Gemini CLI 프로젝트 가이드

## 프로젝트 개요

**korean-teacher-mcp**는 한국 중등 국어 교과서(교과서) 데이터를 기반으로 교사의 수업 설계·평가·자료 제작을 AI로 지원하는 MCP 서버입니다.

## MCP 서버 연결

이 프로젝트의 MCP 서버가 연결되어 있다면, 다음 도구와 리소스를 사용할 수 있습니다.

## 핵심 원칙: Skills + Tools

- **Skills** (스킬): "어떻게 해야 하는가" — 교육 전문가의 절차와 품질 기준
  - MCP 리소스 URI: `skill://teacher/{스킬명}/{문서명}`
  - 작업 전 해당 스킬 리소스를 읽어 워크플로우를 확인하세요
- **Tools** (도구): "무엇을 할 수 있는가" — DB 검색, 문서 생성 등 기능 실행

## 작업 흐름

1. 교사의 요청에서 **트리거 키워드**를 파악합니다
2. 해당 **스킬 리소스**를 읽어 워크플로우를 확인합니다
3. 워크플로우에 따라 **MCP 도구**를 호출합니다
4. 결과물을 요청된 형식으로 출력합니다

## 12개 스킬 목록

| 스킬 ID | 용도 | 트리거 키워드 |
|---------|------|--------------|
| teacher-rubric | 루브릭 제작 | 루브릭, 평가 기준표, 채점 기준 |
| teacher-pbl | PBL 설계 | PBL, 프로젝트, 탐구질문 |
| teacher-udl | 보편적 학습 설계 | UDL, 보편적 설계, 접근성 |
| teacher-thinking-routines | 사고 루틴 | 사고 루틴, Visible Thinking |
| teacher-assessment | 평가 계획 | 수행평가, 형성평가, 과정중심 |
| teacher-quiz | 퀴즈/문항 | 퀴즈, 문항, 시험 문제 |
| teacher-lesson-planning | 수업 설계 | 수업 설계, 단원 계획, 차시 |
| teacher-differentiation | 수준별 수업 | 수준별, 맞춤형, 개별화 |
| teacher-instructional-materials | 학습지 제작 | 학습지, 활동지, 워크시트 |
| teacher-ai-task-redesign | AI 과제 재설계 | SAMR, AI 과제 |
| teacher-sdgs | SDGs 연계 | SDGs, 지속가능발전 |
| teacher-concept-based-inquiry | 개념 기반 탐구 | 개념 기반, 빅 아이디어 |

## 14개 MCP 도구

| 도구명 | 기능 |
|--------|------|
| search_content | 교과서 DB 검색 (지문, 활동, 평가) |
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
| generate_mindmap | 마인드맵/다이어그램 생성 |

## 출력 형식

- 기본: 마크다운
- "한글 파일로" → `export_hwpx` 사용
- "PPT로" → `export_pptx` 사용
- "다이어그램으로" → `generate_mindmap` 사용 (Mermaid.js)

## 스킬 라우팅 (겹치는 요청)

- "루브릭" → teacher-rubric (teacher-assessment 아님)
- "수행평가 전체 계획" → teacher-assessment
- "퀴즈/시험 문제" → teacher-quiz
- "학습지/활동지" → teacher-instructional-materials
- "수업 설계" → teacher-lesson-planning
- "PBL/프로젝트" → teacher-pbl
