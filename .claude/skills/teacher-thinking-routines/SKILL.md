---
name: teacher-thinking-routines
description: >
  Project Zero 사고 루틴을 수업 맥락에 맞게 추천하고 교실 사고 문화 조성을 돕습니다.
  "사고 루틴 추천해줘", "학생 사고 가시화 루틴 알려줘"라고 요청하세요.
  공식 루틴 정보 기반, 학교급·교과목 맞춤 3개 추천, 적용 시나리오·워크시트 포함.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 사고 루틴 (Korean Teacher Thinking Routines)

> korean-teacher-mcp | Project Zero 사고 루틴 전문 스킬

참조 가이드:
- `references/routines-database.md` — Project Zero 루틴 DB 참조 지침과 응답 품질 기준
- `references/school-level-guide.md` — 학교급별(초·중·고) 적용 전략과 정착 단계
- `references/selection-matrix.md` — 목적별 루틴 매칭 매트릭스와 다양성 조합

## 트리거 키워드

사고 루틴, Thinking Routines, Project Zero, 사고 가시화, Visible Thinking, 메타인지, See Think Wonder, 교실 사고 문화

## 워크플로우

### 1단계: 맥락 수집
- 학교급, 교과목, 단원·주제, 활용 목적(도입/탐구/성찰)을 확인
- 필요 시 `search_content`로 성취기준·교과서 원문 확보

### 2단계: 루틴 선택
- `references/selection-matrix.md`로 목적별 분류 매칭
- 서로 다른 사고 유형 3개 조합 (관찰·추론·성찰 등)

### 3단계: 맥락화
- 입력된 학년·성취기준·주제에 맞춰 적용 예시(applicationExample) 창의적 생성
- `references/school-level-guide.md`의 학교급별 조정 원칙 적용

### 4단계: 출력
- `export_thinking_tool`로 사고 루틴 JSON/문서 생성
- 토론·대화 시나리오가 필요하면 `generate_discussion` 병행, 한글 문서는 `export_hwpx`

## MCP 도구 연동

- `search_content` — 성취기준·교과서 원문 검색으로 맥락 확보
- `generate_discussion` — 루틴 기반 토론·대화 질문 세트 생성
- `export_thinking_tool` — 사고 루틴 워크시트·가이드 문서화
- `export_hwpx` — 한글 문서로 내보내기 (요청 시)

## 산출물

- 3개 루틴 JSON (`routines[]`) — 제목·원제·분류·목표·핵심 질문·절차·적용 예시·팁·워크시트 포함
- 학급·교과 맥락 기반 적용 시나리오와 교사 멘트 예시
- 워크시트 구성 요소 목록 (관찰한 것/생각한 것/궁금한 것 등)

## 사용 예시

- "초등 5학년 과학 물의 순환 단원 도입용 사고 루틴 추천해줘"
- "중3 사회 민주주의 논쟁 수업에 쓸 다관점 루틴 3개 뽑아줘"
- "고1 국어 시 감상에 쓸 성찰 루틴 알려줘, 워크시트도"
- "학생 사전 지식을 드러내는 루틴 있어? 중학생용으로"
- "See Think Wonder 교사 멘트 예시 만들어줘"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 학생이 '생각'과 '관찰'을 구분 못 한다 | See 단계에서 해석 금지 멘트 강화, facilitationTips 참조 |
| 루틴이 일회성으로 끝난다 | `school-level-guide.md`의 3단계 정착 프로세스 적용 |
| 3개 루틴이 모두 비슷한 유형이다 | `selection-matrix.md`의 다양성 조합 예시로 재선택 |

## 이 스킬을 사용하지 말아야 할 때

- **수업 전체·단원 설계** → `teacher-lesson-planning` 스킬 사용
- **평가 문항·루브릭 제작** → `teacher-assessment` 스킬 사용
- **프로젝트 기반 학습(PBL) 설계** → `teacher-pbl` 스킬 사용