---
name: teacher-lesson-planning
description: >
  PARTS 프레임워크 기반 수업·단원·교과 연계·교사 연수 설계 프롬프트를 제공합니다.
  "수업 설계해줘", "단원 계획 만들어줘"라고 요청하세요.
  5E·백워드·프로젝트·UDL 등 수업 모형별 템플릿과 성취기준 연계.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 수업 설계 (Korean Teacher Lesson Planning)

> korean-teacher-mcp | 수업·단원 설계 전문 스킬

참조 가이드:
- `references/parts-framework.md` — PARTS 프레임워크, 성취기준 표기법, 핵심역량 연계
- `references/lesson-models.md` — 수업/단원/교과 연계/연수/시퀀스 모형별 템플릿
- `references/prompt-templates.md` — 교실 맥락별 예시 프롬프트 (5E, 백워드, 융합 등)

## 트리거 키워드

수업 설계, 단원 계획, 교육과정 정렬, 5E 모형, 백워드 설계, 교과 연계, 교사 연수, 학습 시퀀스, 성취기준

## 워크플로우

### 1단계: 맥락 확인
- 학교급·학년·교과·차시·학급 특성을 먼저 명확화

### 2단계: PARTS 골격 구성
- Persona/Act/Recipient/Theme/Structure를 채워 프롬프트 기본 뼈대 확정

### 3단계: 모형별 템플릿 적용
- 수업/단원/융합/연수/시퀀스 중 목적에 맞는 템플릿을 `references/lesson-models.md`에서 선택

### 4단계: 출력
- `generate_discussion`으로 초안 생성, 요청 시 `export_hwpx`로 한글 문서 변환

## MCP 도구 연동

- `search_content` — 성취기준·교과서 단원 원문 확보
- `generate_discussion` — 수업·단원·연수 설계안 초안 생성
- `export_hwpx` — 한글 문서로 내보내기 (요청 시)

## 산출물

- 도입-전개-정리 단계 또는 5E/백워드 단계별 수업안
- 단원 주차별 계획, 핵심 질문, 평가 계획 (형성+총괄)
- 교과 연계 프로젝트·교사 연수 일정·학습 시퀀스 표

## 사용 예시

- "중2 과학 DNA 수업을 5E 모형으로 2차시로 설계해줘"
- "고1 국어 '비평적 읽기와 쓰기' 4주 단원을 백워드로 설계"
- "중3 과학+국어 융합 2주 프로젝트 설계해줘"
- "AI 활용 교사 90분 연수 기획안 만들어줘"
- "중2 물리 '힘과 운동' 5일 학습 시퀀스 표로 정리해줘"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 성취기준이 불명확 | `search_content`로 [학년군-교과-영역-번호] 코드 확인 후 재구성 |
| 수업 시간이 안 맞는다 | 시퀀스 표로 차시별 핵심 개념만 남기고 단계 축소 |
| 학급 수준 편차가 크다 | UDL·개별화 조정안을 후속 프롬프트로 연결 요청 |

## 이 스킬을 사용하지 말아야 할 때

- **형성평가 문항 제작** → `teacher-quiz` 스킬 사용
- **평가 전체 계획** → `teacher-assessment` 스킬 사용
- **프로젝트 기반 학습(PBL) 설계** → `teacher-pbl` 스킬 사용
- **학습지·활동지 제작** → `teacher-instructional-materials` 스킬 사용
