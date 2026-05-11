---
name: teacher-ai-task-redesign
description: >
  인간-AI 증강 관점과 GRASPS 프레임워크로 기존 과제를 AI 시대에 맞게 재설계합니다.
  "이 과제 AI 시대에 맞게 바꿔줘", "AI 활용 모드 정해줘"라고 요청하세요.
  5단계 진단·5종 AI 활용 모드·4종 재설계 전략·교사용 운영 가이드 JSON 출력.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 AI 과제 재설계 (Korean Teacher AI Task Redesign)

> korean-teacher-mcp | AI 시대 과제설계 전문 스킬

참조 가이드:
- `references/samr-model.md` — 인간-AI 증강 철학, SAMR 관점, 취약점 진단 5영역, AI 활용 모드 5종, 재설계 전략 4종
- `references/redesign-cases.md` — GRASPS 프레임워크, 교사용 운영 가이드, JSON 응답 스키마

## 트리거 키워드

AI 과제, 과제 재설계, 인간-AI 증강, GRASPS, AI 활용 모드, 프롬프트 로그, 과정 중심 평가, AI 오용 대응, 학문적 진실성

## 워크플로우

### 1단계: 취약점 진단
- `search_content`로 성취기준·교과 맥락 확보
- 5개 영역(AI 대체 가능성·고유 사고 요구·과정 가시화·실제성·검증 가능성)으로 현재 과제 진단

### 2단계: AI 활용 모드 결정
- 5종 모드(forbidden/restricted/collaborative/leading/experimental) 중 선택
- 복합 과제(3차시 이상)는 `aiLevelMatrix`로 차수별 차등 적용

### 3단계: 재설계 전략 선택
- 4종 전략(실생활 연결·과정 중심 평가·AI 접근 불가 정보·발표·토론 연계) 중 1-3개 조합

### 4단계: GRASPS 재설계
- Goal·Role·Audience·Situation·Product·Standards 항목별 상세 작성, 성취기준 연계

### 5단계: 교사용 운영 가이드 + 출력
- 운영 체크리스트·학생 FAQ·AI 오용 대응·프롬프트 로그 양식 포함 JSON 출력
- 한글 문서 필요 시 `export_hwpx`

## MCP 도구 연동

- `search_content` — 성취기준·교과서 원문 검색으로 재설계 근거 확보
- `export_hwpx` — 재설계 과제·교사 운영 가이드를 한글 문서로 내보내기 (요청 시)

## 산출물

- 5영역 취약점 진단, 추천 AI 활용 모드·레벨, 차수별 aiLevelMatrix
- GRASPS 기반 재설계 과제(JSON)와 Before/After comparison
- 교사용 운영 가이드(체크리스트·FAQ·오용 대응·프롬프트 로그 양식)

## 사용 예시

- "고2 국어 독후감 과제를 AI 시대에 맞게 재설계해줘"
- "이 PBL 과제 3차시 구성인데 차시별 AI 모드 정해줘"
- "중3 사회 보고서 과제 취약점 진단해줘"
- "AI 오용 의심될 때 대응 방안 포함해서 과제 다시 설계해줘"
- "성취기준 [9사-09-02] 기반 과제를 과정 중심 평가로 전환해줘"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 진단이 원론적이고 구체성이 부족하다 | 5개 영역 모두 핵심 질문·판정 근거·구체 설명을 명시 |
| AI 활용 모드가 과제 전반에 일괄 적용된다 | 복합 과제는 `aiLevelMatrix`로 차시별 차등 적용 |
| 결과물 중심 평가에 머무른다 | 과정 중심 평가 전략(B) 적용 — 결과물 50% 이하로 조정 |

## 이 스킬을 사용하지 말아야 할 때

- **수업 전체·차시 설계** → `teacher-lesson-planning` 스킬 사용
- **평가 계획·루브릭·문항 제작** → `teacher-assessment` 스킬 사용
- **PBL 주제 추천·설계** → `teacher-pbl` 스킬 사용