---
name: teacher-pbl
description: >
  프로젝트 기반 학습(PBL) 주제 추천과 설계 컨설팅을 제공합니다.
  "PBL 주제 추천해줘", "프로젝트 수업 설계해줘"라고 요청하세요.
  8가지 핵심 요소, 영역별 주제 예시, 교사 맞춤 컨설팅 챗봇 통합.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 PBL (Korean Teacher PBL)

> korean-teacher-mcp | 프로젝트 기반 학습 전문 스킬

참조 가이드:
- `references/pbl-design.md` — PBL 설계 프레임워크 (역할·원칙·8가지 핵심 요소·용어)
- `references/topic-examples.md` — 영역별 주제 예시 (환경/사회/기술/경제/건강)
- `references/output-format.md` — 주제 추천 JSON 출력 형식과 규칙

## 트리거 키워드

PBL, 프로젝트 기반 학습, 프로젝트 주제, 탐구질문, 핵심질문, 공개 결과물, 실제성, 학생 주도성, Driving Question

## 워크플로우

### 1단계: 맥락 파악
- 학교급(초/중/고), 교과, 학급 특성을 확인. 미지정 시 일반 답변 + 맞춤화 제안

### 2단계: 주제 또는 질문 유형 분류
- 주제 추천인지, 개념 설명/방법론/사례/문제 해결 컨설팅인지 판단 (`references/pbl-design.md`)

### 3단계: 설계 원칙 적용
- 5가지 주제 선정 기준과 PBL 8가지 핵심 요소 중 해당 항목 반영

### 4단계: 출력
- 주제 추천은 `generate_pbl`로 JSON 반환, 컨설팅은 구조화된 답변, 요청 시 `export_hwpx`로 한글 문서화

## MCP 도구 연동

- `search_content` — 성취기준·교과 내용과 PBL 주제 연결 근거 확보
- `generate_pbl` — 3~5개 프로젝트 주제를 JSON으로 생성
- `export_hwpx` — 한글 문서로 내보내기 (요청 시)

## 산출물

- `{"topics": [...]}` 형식의 순수 JSON 주제 목록 (3~5개)
- 각 주제별 2-3문장 설명 (왜 중요한지, 무엇을 탐구할 수 있는지)
- PBL 설계·실행 관련 구조화된 교사 컨설팅 답변

## 사용 예시

- "중3 사회 수업으로 쓸 PBL 주제 5개 추천해줘"
- "고1 과학 환경 단원에 맞는 프로젝트 주제 뽑아줘"
- "PBL 수업을 설계할 때 반드시 고려해야 하는 요소가 뭐야?"
- "Driving Question 잘 만드는 방법 알려줘"
- "중학교에서 2주 PBL을 작게 시작하려면 어떻게 해야 해?"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 주제가 현실과 동떨어진다 | 5가지 선정 기준(실제성·시의성·성취기준·탐구 가능성·발달 적합성) 재검토 |
| 8가지 핵심 요소 중 일부 누락 | `references/pbl-design.md`의 8요소 체크리스트로 보강 |
| 교사가 시간·자원이 부족 | "작게 시작하기" 원칙에 따라 축소형 2주 프로젝트로 대안 제시 |

## 이 스킬을 사용하지 말아야 할 때

- **일반 수업·단원 설계** → `teacher-lesson-planning` 스킬 사용
- **학습지·활동지 제작** → `teacher-instructional-materials` 스킬 사용
- **평가 계획·루브릭·문항 제작** → `teacher-assessment` 스킬 사용
