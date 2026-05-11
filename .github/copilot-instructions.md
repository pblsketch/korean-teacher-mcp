# GitHub Copilot Instructions — korean-teacher-mcp

## 프로젝트 설명

이 프로젝트는 한국 중등 국어 교과서(교과서) 데이터를 기반으로 교사의 수업 설계, 평가, 자료 제작을 AI로 지원하는 MCP(Model Context Protocol) 서버입니다.

## 아키텍처

교사의 요청은 다음 흐름으로 처리됩니다: 교사 요청 → AI가 Skills(스킬)로 방법을 학습 → MCP Tools(도구)로 실행 → DB 검색 → 결과물 출력(HWPX/PPTX/Mermaid).

Skills는 "어떻게 해야 하는가"를 정의하는 워크플로우 가이드이며, Tools는 "무엇을 할 수 있는가"를 제공하는 실행 함수입니다. 이 둘은 상호보완 관계로, Skills가 절차와 품질 기준을 제공하고 Tools가 실제 데이터 접근과 기계적 처리를 담당합니다.

## 12개 Skills

teacher-rubric(루브릭), teacher-pbl(PBL), teacher-udl(UDL), teacher-thinking-routines(사고루틴), teacher-assessment(평가), teacher-quiz(퀴즈), teacher-lesson-planning(수업설계), teacher-differentiation(수준별), teacher-instructional-materials(학습지), teacher-ai-task-redesign(AI과제), teacher-sdgs(SDGs), teacher-concept-based-inquiry(개념탐구)

## 14개 Tools

search_content, ingest_pdf, generate_worksheet, generate_assessment, generate_discussion, generate_pbl, export_hwpx, export_pptx, thinking_tool, export_thinking_tool, generate_student_comment, generate_rubric, generate_differentiated_text, analyze_vocabulary_level, generate_mindmap

## 코드 수정 가이드

새 도구를 추가할 때는 `src/tools/` 폴더에 파일을 생성하고, `server.ts`에서 import 및 등록합니다. 도구 등록 함수는 `(server: McpServer, db: DbInstance)` 시그니처를 따릅니다. 새 스킬을 추가할 때는 `src/resources/skills/` 폴더에 디렉토리를 만들고 SKILL.md와 references를 배치하면 서버가 자동으로 MCP 리소스로 등록합니다.
