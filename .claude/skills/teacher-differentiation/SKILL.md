---
name: teacher-differentiation
description: >
  개인화 피드백·수준별 과제·소그룹 지원·다국어 학습자 지원 등 개별화 수업을 설계합니다.
  "수준별 활동 만들어줘", "개인화 피드백 작성해줘"라고 요청하세요.
  PARTS 프롬프트 적용, 학습자 특성별 전략, 선택형 과제·체크리스트 산출.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 개별화 (Korean Teacher Differentiation)

> korean-teacher-mcp | 개별화 수업 전문 스킬

참조 가이드:
- `references/differentiation-strategies.md` — 6가지 개별화 프롬프트 유형(피드백·소그룹·UDL·다국어·선택판)과 PARTS 적용
- `references/tiered-tasks.md` — 기초·표준·심화 3단계 수준별 과제 템플릿과 매트릭스

## 트리거 키워드

개별화, Differentiation, 수준별, 개인화 피드백, 소그룹 지원, 선택형 과제, Choice Board, 다문화 학습자, 기초 학력

## 워크플로우

### 1단계: 학습자 특성 수집
- 학년·교과·학습 목표·학생 특성(수준·언어·주의력 등)을 확인
- `search_content`로 성취기준·교과서 원문 확보

### 2단계: 개별화 유형 분류
- 피드백/수준별 활동/소그룹/UDL/다국어/선택판 중 어떤 유형인지 판단
- `references/differentiation-strategies.md`에서 해당 템플릿 선택

### 3단계: PARTS 적용 설계
- Persona·Act·Recipient·Theme·Structure 5요소를 학습자 맥락에 맞춰 구체화
- 동일 학습 목표 유지, 도달 경로만 차별화

### 4단계: 출력
- 체크리스트·선택판·수준별 카드 등 즉시 실행 가능한 형식으로 산출
- 한글 문서가 필요하면 `export_hwpx`

## MCP 도구 연동

- `search_content` — 성취기준·교과서 원문 검색으로 학습 목표 정합성 확보
- `export_hwpx` — 개별화 활동지·체크리스트·선택판을 한글 문서로 내보내기 (요청 시)

## 산출물

- 학습자 특성별 개인화 피드백·전략 카드
- 기초·표준·심화 3단계 수준별 활동 (동일 학습 목표, 차별화된 경로)
- 6옵션 선택판(Choice Board), 소그룹 지원 계획, 공통 루브릭

## 사용 예시

- "중1 일차방정식 활용 단원에 쓸 3단계 수준별 활동 설계해줘"
- "중2 국어 논술문에 개인화 피드백 작성해줘, 학생 특성: 아이디어 풍부, 문장 구성 약함"
- "기후 변화 단원으로 6옵션 선택판 만들어줘, 공통 루브릭 포함"
- "KSL 학생 3명 있는 사회 수업에 다국어 지원 전략 알려줘"
- "기초 학력 5명 대상 3일 소그룹 지원 계획 짜줘"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 기초 수준이 단순 양 축소가 됨 | `tiered-tasks.md`의 자주 하는 실수 표 — 양이 아닌 구조·지원 조정 |
| 학생 라벨링 우려 | 수준 명칭 중립화(색깔·기호), 유동적 그룹 운영 |
| 피드백이 일반론이 된다 | PARTS의 Recipient를 학습 특성·수준 중심으로 구체화 |

## 이 스킬을 사용하지 말아야 할 때

- **UDL 3원칙 기반 보편적 수업 설계** → `teacher-udl` 스킬 사용
- **수업 전체·차시 설계** → `teacher-lesson-planning` 스킬 사용
- **학습지·활동지 단독 제작** → `teacher-instructional-materials` 스킬 사용