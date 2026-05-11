---
name: teacher-concept-based-inquiry
description: >
  개념 기반 탐구 학습(CBI)으로 3D 사고·전이 가능한 이해를 촉진하는 수업을 설계합니다.
  "개념 기반 수업 설계해줘", "일반화 도출 수업 만들어줘"라고 요청하세요.
  Erickson·Lanning·French 프레임워크, 6단계 탐구 모델, 2022 개정 교육과정 연계.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 개념 기반 탐구 학습 (Korean Teacher Concept-Based Inquiry)

> korean-teacher-mcp | 개념 기반 탐구 수업 설계 전문 스킬

참조 가이드:
- `references/concept-framework.md` — Erickson·Lanning·French 프레임워크(지식/과정의 구조, 3D 사고, 9단계 설계 절차)
- `references/inquiry-questions.md` — 6단계 탐구 모델과 사실적·개념적·논쟁적 질문 설계

## 트리거 키워드

개념 기반 탐구, Concept-Based Inquiry, CBI, CBCI, 개념적 렌즈, 일반화, 전이, 3D 사고, 시너지 사고, 핵심 아이디어

## 워크플로우

### 1단계: 성취기준·핵심 아이디어 해석
- 2022 개정 교육과정 성취기준을 핵심 아이디어(일반화) 중심으로 해석
- `search_content`로 성취기준·내용 체계 원문 확보

### 2단계: 개념적 렌즈 선택
- 단원을 관통하는 핵심 개념 1-2개 선정 (예: 갈등, 변화, 체계, 정체성)
- 개념적 렌즈를 활용한 일반화 1-2개 반드시 포함

### 3단계: 안내 질문·탐구 경험 설계
- 사실적·개념적·논쟁적 질문 세트 (`references/inquiry-questions.md`)
- 6단계 탐구 모델(Engage→Focus→Investigate→Organize→Generalize→Transfer) 적용

### 4단계: 출력
- 개념적 렌즈·일반화·안내 질문·차시별 설계·3단계 평가 구조화
- 한글 문서가 필요하면 `export_hwpx`

## MCP 도구 연동

- `search_content` — 2022 개정 교육과정 성취기준·핵심 아이디어·내용 요소 검색
- `export_hwpx` — 단원 설계안·탐구 질문 세트·루브릭을 한글 문서로 내보내기 (요청 시)

## 산출물

- 개념적 렌즈 + 일반화 3-5개(강한 동사 사용)
- 안내 질문 세트(사실적 3-5·개념적 3-5·논쟁적 1-2)
- 6단계 탐구 모델 기반 차시별 학습 경험과 교사 발문 가이드
- 사실적·개념적·전이 3단계 평가 과제와 루브릭

## 사용 예시

- "중2 사회 '민주주의와 시민' 단원을 CBI로 설계해줘, 개념적 렌즈 포함"
- "고1 국어 소설 단원에 적용할 개념 기반 탐구 질문 세트 만들어줘"
- "이 성취기준에서 일반화 5개 뽑아줘, 강한 동사로"
- "Engage 단계에 쓸 도발적 자료와 교사 발문 예시 달라"
- "3단계(사실·개념·전이) 평가 과제와 루브릭 설계해줘"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 일반화가 특정 사례에 묶여 전이 불가 | 시간·장소 초월 언어로 재진술, `concept-framework.md` 개념 정의 참조 |
| 교사가 일반화를 먼저 말해버림 | Generalize 단계 발문 가이드 적용, 귀납적 도출 설계로 재구성 |
| 사실적 질문만 나열됨 | `inquiry-questions.md`의 세 유형 균형 점검, 개념적·논쟁적 질문 보강 |

## 이 스킬을 사용하지 말아야 할 때

- **프로젝트 기반 학습(PBL) 설계** → `teacher-pbl` 스킬 사용
- **일반 수업·차시 설계** → `teacher-lesson-planning` 스킬 사용
- **Project Zero 사고 루틴 추천** → `teacher-thinking-routines` 스킬 사용
