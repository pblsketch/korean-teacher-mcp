---
name: teacher-quiz
description: >
  교육과정 전문가 기반 PBL 형성평가 문항을 콘텐츠 근거로 생성합니다.
  "퀴즈 만들어줘", "형성평가 문항 생성해줘"라고 요청하세요.
  선다형·힌지·진위형·단답형·서술형 5종, 할루시네이션 방지, JSON 스키마 출력.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 퀴즈 (Korean Teacher Quiz)

> korean-teacher-mcp | PBL 형성평가 문항 전문 스킬

참조 가이드:
- `references/question-design.md` — 5종 문항 유형 설계 원칙 (선다형/힌지/진위형/단답형/서술형)
- `references/quality-rules.md` — 할루시네이션 방지 및 콘텐츠 기반 원칙
- `references/output-format.md` — JSON 스키마 및 필드 규칙

## 트리거 키워드

퀴즈, 형성평가, 평가 문항, 힌지 질문, 선다형, 서술형, 단답형, 진위형, 오개념 진단

## 워크플로우

### 1단계: 콘텐츠 확보
- `search_content`로 교과서·성취기준 원문을 먼저 확보하여 출제 근거로 고정

### 2단계: 콘텐츠 분석
- 핵심 개념·사실 정보·관계·주장을 추출 (`references/question-design.md` 1단계)

### 3단계: 유형별 문항 설계
- 난이도·PBL 단계(pre/during/post)에 맞춰 5종 중 선택해 설계
- 힌지는 misconceptionMap, 서술형은 modelAnswer + essayRubric 필수

### 4단계: 출력
- `generate_assessment`로 JSON을 생성하고, 요청 시 `export_hwpx`로 한글 문서 변환

## MCP 도구 연동

- `search_content` — 교과서/성취기준 원문 검색으로 출제 근거 확보
- `generate_assessment` — JSON 스키마 기반 형성평가 문항 생성
- `export_hwpx` — 한글 문서로 내보내기 (요청 시)

## 산출물

- `metadata` + `questions[]` 구조의 순수 JSON
- 5종 문항 유형 혼합 (선다형·힌지·진위형·단답형·서술형)
- 힌지 질문의 오개념 진단 맵, 서술형 채점 루브릭 포함

## 사용 예시

- "3단원 본문으로 5문항 형성평가 만들어줘"
- "힌지 질문 3개 만들어줘, 오답마다 오개념 진단까지"
- "중2 과학 DNA 지문으로 서술형 2문항 루브릭 포함해서"
- "PBL during-class용 단답형 5문항 뽑아줘"
- "이 지문 기반 선다형 10문항, 4지선다로"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 콘텐츠가 부족하다 | 문항 수보다 품질 우선 — 요청 개수를 줄이고 근거 가능한 문항만 생성 |
| 오답이 너무 뻔하다 | 콘텐츠 내 다른 개념과 혼동 유도, 일반적 오개념 반영 |
| 서술형 채점이 막막하다 | modelAnswer + essayRubric 블록을 수준별 기준과 총점으로 함께 출력 |

## 이 스킬을 사용하지 말아야 할 때

- **평가 전체 계획 수립** → `teacher-assessment` 스킬 사용
- **채점 루브릭만 단독 제작** → `teacher-rubric` 스킬 사용
- **수업 계획 설계** → `teacher-lesson-planning` 스킬 사용
- **학습지 제작** → `teacher-instructional-materials` 스킬 사용