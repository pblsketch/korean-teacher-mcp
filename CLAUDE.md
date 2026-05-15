# korean-teacher-mcp

교과서 교육용 MCP 서버 — 한국 교과서 출판사를 위한 AI 교육 도구 모음

## 구조
- `src/tools/` — MCP 도구 (export-hwpx, export-pptx, export-thinking-tool, generate-*)
- `src/prompts/` — 교육 프롬프트 12종 (PBL, 루브릭, UDL, 평가 등)
- `src/resources/` — MCP 리소스 (pptx-styles.md 등)
- `hwpxskill-templates/` — HWPX 문서 템플릿 (XML 구조)
- `scripts/` — 유틸리티 스크립트
- `.claude/skills/` — Skill Creator 2.0 형식 스킬 파일

## 빌드/실행
- `npm run build` — TypeScript 컴파일 + 리소스 복사
- `npm run dev` — tsx로 개발 실행
- `npm start` — 프로덕션 실행

## 핵심 컨벤션
- HWPX 정규 스타일 계약:
  - 폰트: 함초롬바탕 통일 (본문/제목/소제목/강조 모두)
  - charPrIDRef: 0=본문(10pt), 7=제목(16pt볼드), 8=소제목(12pt볼드), 9=강조(10pt볼드), 10=배너(24pt볼드)
  - borderFillIDRef: 3=기본테두리, 4=헤더셀(회색), 5=강조셀(연청색), 6=구분선(하단만)
  - paraPrIDRef: 0~19=기본(양쪽정렬), 20=가운데정렬(160% 행간)
- 표 최대 폭: 42520 (페이지 여백 left=8504, right=8504 기준)
- HWPX cellMargin 표준: left=510 right=510 top=141 bottom=141
- HWPX 구조 규칙: 중첩 표 금지, 래퍼 표 금지, 단락-표 교차 구조 필수
- HWPX 표 필수 규칙 (build_hwpx.py가 자동 교정하지만, 처음부터 올바르게 생성할 것):
  - treatAsChar="1" 필수 (인라인 표). treatAsChar="0" (플로팅 표) 절대 금지 — 표 겹침 원인
  - borderFillIDRef는 1~6 범위만 사용. 7 이상 사용 금지 — header.xml에 미정의 시 테두리 누락
  - 모든 데이터 셀: borderFillIDRef="3", 헤더 셀: borderFillIDRef="4"
  - hp:tbl에 vertRelTo, horzRelTo, vertAlign, horzAlign, vertOffset, horzOffset 속성 사용 금지
  - hp:tbl에 rowCnt, colCnt 속성 필수
- borderFillIDRef=4(회색)는 표 헤더 행에만 사용, 데이터 행은 borderFillIDRef=3
- HWPX 템플릿은 {{placeholder}} 사용, build_hwpx.py의 strip_placeholders()가 자동 제거
- HWPX 모바일 필수: hp:tc 내 hp:p는 반드시 hp:subList로 감싸야 함 (모바일 한컴오피스 SC_ERROR: -1 방지). build_hwpx.py의 ensure_sublist()가 빌드 시 자동 교정하지만, 템플릿에서 처음부터 올바르게 작성할 것
  - hp:subList 필수 속성: id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="셀폭-좌우마진" fieldName=""
  - hp:tc 필수 속성: name="" header="0" hasMargin="1" borderFillIDRef="N" editableAtFormMode="0"
- hp:linesegarray 금지: 레이아웃 캐시이므로 section XML에 포함하지 않음 — 한글이 열 때 자동 재계산. 잘못된 값이 있으면 자간 겹침 발생. build_hwpx.py의 strip_linesegarray()가 빌드 시 자동 제거
- hp:tbl에 rowCnt/colCnt 필수: 누락 시 한글에서 파일 열기 실패
- PPTX 스타일: pptx-styles 리소스에 12종 정의, theme override로 적용

## DB
- Turso (libsql) — 교과서/성취기준 데이터
- 환경변수: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN (.env에서 로드)
