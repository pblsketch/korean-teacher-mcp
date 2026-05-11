---
name: teacher-rubric
description: >
  Susan M. Brookhart 원칙 기반 분석적 루브릭을 JSON으로 제작합니다.
  "루브릭 만들어줘", "평가 기준표 설계해줘"라고 요청하세요.
  성취기준 1:1 정렬, 준거 5개, 수준 3~5단계, 평행 구조 수행 수준 기술 보장.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 루브릭 (Korean Teacher Rubric)

> korean-teacher-mcp | 프로젝트 수업 루브릭 전문 스킬

참조 가이드:
- `references/rubric-types.md` — 분석적/총체적 루브릭, 준거 선정 기준, 피해야 할 오류
- `references/level-descriptors.md` — 수준 기술어 작성법, 평행 구조, 서술적 표현 원칙
- `references/rubric-templates.md` — JSON 응답 스키마와 교과별 준거 예시

## 트리거 키워드

루브릭, 평가 기준표, 수행 수준, 분석적 루브릭, 총체적 루브릭, 평가 준거, criteria, Brookhart, 채점 기준

## 워크플로우

### 1단계: 성취기준 확보
- `search_content`로 성취기준 원문을 확보하여 준거 선정 근거로 고정

### 2단계: 평가 준거 5개 도출
- "학생 작품의 어떤 특성이 이 성취기준의 학습 증거인가?" 질문으로 준거 도출 (`references/rubric-types.md`)
- 과제 구성요소·단순 계수·판단 용어 금지, 7가지 선정 기준(적절성·정의가능성·관찰가능성·독립성·완전성·연속성·정렬성) 충족

### 3단계: 수행 수준 기술 작성
- 3~5단계 중 요청에 맞게 선택, 평행 구조로 같은 측면을 다른 질적 수준으로 기술 (`references/level-descriptors.md`)

### 4단계: 출력
- `references/rubric-templates.md`의 JSON 스키마로 반환, 요청 시 `export_hwpx`로 한글 문서 변환

## MCP 도구 연동

- `search_content` — 성취기준 원문 확보로 준거 정렬(Aligned) 보장
- `export_hwpx` — 루브릭을 한글 문서로 내보내기 (요청 시)

## 산출물

- `thinking` + `criteria[5]` + `usageSuggestions` 구조의 순수 JSON 루브릭
- 각 준거별 3~5단계 수행 수준 기술 (평행 구조, 서술적 표현)
- 교사(before/during/after)·학생(planning/process/reflection) 활용 제안

## 사용 예시

- "중3 과학 '환경 문제 해결 프로젝트' 4단계 루브릭 만들어줘"
- "고1 국어 논증적 말하기 수행평가용 루브릭, 준거 5개 수준 4단계"
- "초6 사회 역사 글쓰기 루브릭, 학생 자기평가 버전까지"
- "이 수행과제 루브릭인데 준거가 '표지/본문/그림'으로 잘못됐어 — 다시 만들어줘"
- "중2 수학 문제해결 과정 평가 루브릭 3단계로 간단히"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 준거가 과제 구성요소가 됐다 | `references/rubric-types.md` 6절 오류 유형 참고, "학습 결과" 중심으로 재도출 |
| 수준이 "우수함/미흡" 판단어뿐이다 | `references/level-descriptors.md` 변환표로 관찰 가능한 서술어로 교체 |
| 성취기준과 준거가 어긋난다 | 준거마다 rationale에 반영한 성취기준 문장 명시, 정렬성(Aligned) 기준 재검토 |

## 이 스킬을 사용하지 말아야 할 때

- **평가 문항·퀴즈 제작** → `teacher-quiz` 스킬 사용
- **평가 전체 계획·수행과제·변형·데이터 분석** → `teacher-assessment` 스킬 사용
- **수업·단원 설계** → `teacher-lesson-planning` 스킬 사용
- **학습지·활동지 제작** → `teacher-instructional-materials` 스킬 사용