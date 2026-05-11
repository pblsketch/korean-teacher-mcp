# 교과서 MCP 스킬 리팩토링 계획서

> 작성일: 2026-04-13
> 대상: korean-teacher-mcp/.claude/skills/ (12개 스킬)
> 패턴: cowork-plugins (modu-ai/cowork-plugins) 스킬 구조

---

## 1. 현황 진단

### 현재 스킬 목록 (12개)

| # | 스킬 | 현재 타입 | 문제점 |
|---|------|----------|--------|
| 1 | teacher-lesson-planning | 가이드 문서 | 트리거/워크플로우 없음, PARTS 프레임워크가 본문에 혼재 |
| 2 | teacher-assessment | 가이드 문서 | 평가 유형별 템플릿이 SKILL.md에 전부 들어있음 |
| 3 | teacher-quiz | 시스템 프롬프트 | 200줄+ 단일 파일, 5종 문항 유형+JSON 스키마+규칙 혼재 |
| 4 | teacher-pbl | 시스템 프롬프트 | 역할+주제예시+JSON 형식이 하나에 섞임 |
| 5 | teacher-rubric | 시스템 프롬프트 | 루브릭 유형별 상세가 분리 안됨 |
| 6 | teacher-thinking-routines | 시스템 프롬프트 | Project Zero 루틴 DB가 SKILL.md에 직접 포함 (매우 길음) |
| 7 | teacher-udl | 가이드 문서 | UDL 3원칙 상세가 분리 안됨 |
| 8 | teacher-differentiation | 가이드 문서 | 수준별 전략이 본문에 혼재 |
| 9 | teacher-concept-based-inquiry | 가이드 문서 | 탐구 프레임워크가 분리 안됨 |
| 10 | teacher-sdgs | 가이드 문서 | SDGs 17개 목표 연계표가 본문에 혼재 |
| 11 | teacher-instructional-materials | 가이드 문서 | 자료 유형별 가이드가 분리 안됨 |
| 12 | teacher-ai-task-redesign | 가이드 문서 | SAMR 모형+사례가 혼재 |

### 공통 문제점 3가지

1. **트리거 키워드 없음** — Claude가 사용자 요청을 스킬에 매칭하지 못함
2. **워크플로우 없음** — 실행 순서가 불명확하여 Claude가 일관된 결과를 못 만듦
3. **references 분리 안됨** — 상세 지식이 SKILL.md에 전부 들어있어 파일이 비대하고 유지보수 어려움

---

## 2. 목표 구조 (cowork-plugins 패턴)

### 스킬 1개의 표준 구조

```
teacher-{스킬이름}/
├── SKILL.md              ← 가볍게! (50~80줄)
│   ├── 프론트매터 (name, description, user-invocable, metadata)
│   ├── # 제목 + 개요 (2~3줄)
│   ├── ## 트리거 키워드
│   ├── ## 워크플로우 (단계별)
│   ├── ## 산출물
│   ├── ## 문제 해결
│   └── ## 이 스킬을 사용하지 말아야 할 때
└── references/           ← 상세 지식 (각 파일 100~200줄)
    ├── {가이드-a}.md
    └── {가이드-b}.md
```

### SKILL.md 프론트매터 표준

```yaml
---
name: teacher-{이름}
description: >
  {한 줄 설명}.
  "{사용자가 이렇게 말하면}", "{이렇게도 말하면}"이라고 요청하세요.
  {핵심 기능 나열}.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---
```

### description 작성 규칙

- 첫 문장: 이 스킬이 뭘 하는지 (동사로 끝)
- 둘째 문장: "~해줘"라고 요청하세요 (2~3개 예시)
- 셋째 문장: 핵심 기능 키워드 나열
- 총 3줄 이내

---

## 3. 스킬별 리팩토링 상세 계획

### 3.1 teacher-lesson-planning (수업 설계)

**SKILL.md 핵심 내용:**
- 트리거: 수업 계획, 수업 설계, 단원 설계, 교과 연계, 차시 계획, 5E, 백워드 설계
- 워크플로우: 학습 주제 확인 → 성취기준 검색(MCP) → 수업 모형 선택 → 차시별 설계 → 산출물 생성
- MCP 연동: search_content로 해당 단원 콘텐츠 검색

**references 분리:**
- `references/parts-framework.md` — PARTS(Persona-Act-Recipient-Theme-Structure) 프레임워크 상세
- `references/lesson-models.md` — 수업 모형별 템플릿 (5E, 백워드, PBL, UDL, 직접교수)
- `references/prompt-templates.md` — 프롬프트 유형별 예시 (수업 계획, 단원 설계, 교과 연계, 연수 설계)

---

### 3.2 teacher-assessment (평가 개발)

**SKILL.md 핵심 내용:**
- 트리거: 평가, 형성평가, 총괄평가, 수행평가, 평가 계획, 평가 도구, 서술형 평가
- 워크플로우: 평가 목적 파악 → 성취기준 연결 → 평가 유형 선택 → 문항/과제 설계 → 채점 기준 작성
- 다른 스킬과의 분기: 퀴즈 문항 → teacher-quiz, 루브릭 → teacher-rubric

**references 분리:**
- `references/assessment-types.md` — 형성평가/총괄평가/수행평가/진단평가 유형별 가이드
- `references/bloom-taxonomy.md` — Bloom 수준별 문항 설계 + 평가 맥락 PARTS 적용
- `references/prompt-templates.md` — 평가 프롬프트 유형별 예시

---

### 3.3 teacher-quiz (퀴즈 생성)

**SKILL.md 핵심 내용:**
- 트리거: 퀴즈, 형성평가 문항, 문제 출제, 시험 문제, 단원 평가, 선다형, 서술형, OX, 힌지 질문
- 워크플로우: 콘텐츠 확보(MCP search) → 출제 조건 확인 → 문항 생성 → JSON 출력
- MCP 연동: search_content → generate_assessment 도구 체인

**references 분리:**
- `references/question-design.md` — 문항 유형 5종 상세 (선다형, 힌지, 진위형, 단답형, 서술형)
- `references/quality-rules.md` — 할루시네이션 방지 원칙 (허용/금지 목록, 콘텐츠 기반 원칙)
- `references/output-format.md` — JSON 출력 스키마 + 예시

---

### 3.4 teacher-pbl (PBL 수업 설계)

**SKILL.md 핵심 내용:**
- 트리거: PBL, 프로젝트 수업, 프로젝트 기반 학습, 프로젝트 주제, 탐구 프로젝트
- 워크플로우: 교과/학년 확인 → 성취기준 검색 → 주제 추천 → PBL 설계 → 산출물(JSON/HWPX)
- MCP 연동: search_content → generate_pbl 도구 체인

**references 분리:**
- `references/pbl-design.md` — PBL 설계 프레임워크 (주제 선정 기준 5가지, 단계별 설계)
- `references/topic-examples.md` — 영역별 주제 예시 (환경/사회/기술/경제/건강)
- `references/output-format.md` — JSON 출력 형식 + 규칙

---

### 3.5 teacher-rubric (루브릭 개발)

**SKILL.md 핵심 내용:**
- 트리거: 루브릭, 채점 기준, 평가 기준표, 수행평가 루브릭, 채점표
- 워크플로우: 평가 과제 확인 → 평가 요소 추출 → 수준 기술어 작성 → 루브릭 표 생성
- 산출물: 분석적 루브릭 표, 총체적 루브릭, HWPX/DOCX 내보내기

**references 분리:**
- `references/rubric-types.md` — 분석적/총체적/단일특성 루브릭 유형별 가이드
- `references/level-descriptors.md` — 수준 기술어 작성법 (상/중/하, 4단계, 6단계 등)
- `references/rubric-templates.md` — 교과별 루브릭 템플릿 예시

---

### 3.6 teacher-thinking-routines (사고 루틴)

**SKILL.md 핵심 내용:**
- 트리거: 사고 루틴, Thinking Routine, Project Zero, 보이는 사고, See Think Wonder, CSI, KWL
- 워크플로우: 수업 맥락 확인 → 활용 목적 매칭 → 루틴 3개 추천 → 적용 예시 생성
- MCP 연동: export_thinking_tool로 이미지 템플릿 연결

**references 분리:**
- `references/routines-database.md` — Project Zero 공식 루틴 DB (40개+, 분류/핵심질문/URL)
- `references/school-level-guide.md` — 학교급별(초저/초고/중/고) 적용 가이드
- `references/selection-matrix.md` — 활용 목적별 루틴 매칭 매트릭스

---

### 3.7 teacher-udl (보편적 학습 설계)

**SKILL.md 핵심 내용:**
- 트리거: UDL, 보편적 학습 설계, Universal Design, 학습 접근성, 다양한 학습자
- 워크플로우: 학습 목표 확인 → UDL 3원칙 적용 → 표상/행동표현/참여 수단 설계 → 수업안 생성

**references 분리:**
- `references/udl-principles.md` — UDL 3원칙 상세 (다양한 표상/행동과표현/참여 수단)
- `references/implementation-guide.md` — 교과별 UDL 적용 전략 + 체크리스트

---

### 3.8 teacher-differentiation (수준별 수업)

**SKILL.md 핵심 내용:**
- 트리거: 수준별, 개별화, 맞춤형 수업, 학습 격차, 상위권, 하위권, 수준별 과제
- 워크플로우: 학습자 수준 파악 → 차별화 영역 선택(내용/과정/산출물/환경) → 수준별 과제 설계

**references 분리:**
- `references/differentiation-strategies.md` — Tomlinson 차별화 모형 4영역 상세
- `references/tiered-tasks.md` — 수준별 과제 설계 예시 + 스캐폴딩 전략

---

### 3.9 teacher-concept-based-inquiry (개념 기반 탐구)

**SKILL.md 핵심 내용:**
- 트리거: 개념 기반, 빅 아이디어, 탐구 질문, 일반화, 개념 렌즈, Erickson
- 워크플로우: 교과 단원 확인 → 핵심 개념 추출 → 일반화 문장 작성 → 탐구 질문 설계

**references 분리:**
- `references/concept-framework.md` — Erickson 개념 기반 탐구 프레임워크
- `references/inquiry-questions.md` — 사실적/개념적/논쟁적 질문 설계 가이드

---

### 3.10 teacher-sdgs (SDGs 연계 수업)

**SKILL.md 핵심 내용:**
- 트리거: SDGs, 지속가능발전목표, 세계시민교육, ESG, 환경교육, 글로벌 이슈
- 워크플로우: 교과/단원 확인 → SDGs 목표 매칭 → 수업 활동 설계 → 실천 과제 제안

**references 분리:**
- `references/sdgs-curriculum-map.md` — SDGs 17개 목표 × 교과별 연계표
- `references/activity-examples.md` — SDGs 연계 수업 활동 사례집

---

### 3.11 teacher-instructional-materials (수업 자료 제작)

**SKILL.md 핵심 내용:**
- 트리거: 학습지, 활동지, 워크시트, 수업 자료, 학습 자료, 유인물, 교구
- 워크플로우: 자료 유형 확인 → 콘텐츠 검색(MCP) → 자료 설계 → HWPX/PPTX 내보내기
- MCP 연동: search_content → generate_worksheet → export_hwpx 도구 체인

**references 분리:**
- `references/material-types.md` — 자료 유형별 제작 가이드 (학습지/활동지/안내문/게임자료)
- `references/copyright-checklist.md` — 교육 자료 저작권 체크리스트

---

### 3.12 teacher-ai-task-redesign (AI 과제 재설계)

**SKILL.md 핵심 내용:**
- 트리거: AI 과제, 과제 재설계, SAMR, AI 시대 평가, ChatGPT 과제, AI 활용 수업
- 워크플로우: 기존 과제 분석 → SAMR 수준 판별 → AI 활용 재설계 → 새 과제안 제시

**references 분리:**
- `references/samr-model.md` — SAMR 모형 상세 (대체/증강/변형/재정의)
- `references/redesign-cases.md` — AI 과제 재설계 사례집 (교과별 Before/After)

---

## 4. 스킬 간 라우팅 맵

"이 스킬을 사용하지 말아야 할 때" 섹션에서 서로를 안내하는 라우팅:

```
사용자 요청
    │
    ├─ "수업 계획 세워줘" ──────────→ teacher-lesson-planning
    ├─ "평가 계획 세워줘" ──────────→ teacher-assessment
    ├─ "퀴즈 만들어줘" ────────────→ teacher-quiz
    ├─ "PBL 수업 설계해줘" ────────→ teacher-pbl
    ├─ "루브릭 만들어줘" ──────────→ teacher-rubric
    ├─ "사고 루틴 추천해줘" ───────→ teacher-thinking-routines
    ├─ "UDL 적용해줘" ─────────────→ teacher-udl
    ├─ "수준별 수업 만들어줘" ─────→ teacher-differentiation
    ├─ "개념 기반 탐구 설계해줘" ──→ teacher-concept-based-inquiry
    ├─ "SDGs 연계 수업 만들어줘" ──→ teacher-sdgs
    ├─ "학습지 만들어줘" ──────────→ teacher-instructional-materials
    └─ "AI 과제 재설계해줘" ───────→ teacher-ai-task-redesign
```

### 겹치기 쉬운 스킬 쌍 (라우팅 필수)

| 헷갈리는 요청 | 올바른 스킬 | 이유 |
|-------------|-----------|------|
| "수행평가 루브릭" | teacher-rubric (평가 계획은 assessment) | 채점 기준표 = rubric |
| "퀴즈 10문제" | teacher-quiz (평가 전체 계획은 assessment) | 문항 생성 = quiz |
| "수업 자료 만들어줘" | teacher-instructional-materials (수업 계획은 lesson-planning) | 물리적 자료 = materials |
| "프로젝트 수업" | teacher-pbl (일반 수업은 lesson-planning) | PBL 전용 = pbl |

---

## 5. 실행 순서

### Phase 1: 핵심 3개 먼저 (MCP 도구 연동 스킬)
1. `teacher-quiz` — 가장 복잡, references 분리 효과 큼
2. `teacher-lesson-planning` — 가장 많이 쓰임
3. `teacher-pbl` — MCP generate_pbl 연동

### Phase 2: 평가 클러스터 (3개)
4. `teacher-assessment`
5. `teacher-rubric`
6. `teacher-instructional-materials`

### Phase 3: 교수법 클러스터 (4개)
7. `teacher-thinking-routines`
8. `teacher-udl`
9. `teacher-differentiation`
10. `teacher-concept-based-inquiry`

### Phase 4: 특수 목적 (2개)
11. `teacher-sdgs`
12. `teacher-ai-task-redesign`

---

## 6. 검증 체크리스트

각 스킬 리팩토링 후 확인:

- [ ] SKILL.md 프론트매터에 name, description(3줄), user-invocable: true 있음
- [ ] description에 "~해줘"라고 요청하세요 포함
- [ ] 트리거 키워드 섹션 있음 (최소 5개)
- [ ] 워크플로우 섹션 있음 (3~5단계)
- [ ] 워크플로우에 MCP 도구 연동 명시 (해당 시)
- [ ] references/ 폴더에 상세 지식 분리됨
- [ ] SKILL.md에서 references 파일 경로 참조
- [ ] 산출물 섹션 있음
- [ ] "이 스킬을 사용하지 말아야 할 때" 섹션 있음 (다른 스킬 안내)
- [ ] SKILL.md 총 길이 80줄 이내
- [ ] references 각 파일 200줄 이내
