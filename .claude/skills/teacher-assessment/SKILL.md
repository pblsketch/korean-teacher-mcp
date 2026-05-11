---
name: teacher-assessment
description: >
  형성·총괄·수행·진단 평가 전체 계획과 루브릭·문항·데이터 분석 프롬프트를 제공합니다.
  "평가 계획 세워줘", "수행평가 설계해줘"라고 요청하세요.
  Bloom 수준별 문항, 한국 평가 맥락(지필+수행) 반영, 변형·분석·재지도 설계.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 평가 개발 (Korean Teacher Assessment)

> korean-teacher-mcp | 평가 계획·수행평가·데이터 분석 전문 스킬

참조 가이드:
- `references/assessment-types.md` — 형성/총괄/수행/진단 평가 유형별 가이드, PARTS 적용
- `references/bloom-taxonomy.md` — Bloom 6수준별 동사·키워드·문항 설계
- `references/prompt-templates.md` — 평가 유형별 기본 템플릿과 예시 프롬프트

## 트리거 키워드

평가 계획, 수행평가, 총괄평가, 진단평가, 평가 설계, Bloom 수준, 평가 변형, 평가 분석, 오개념 분석, 채점 기준

## 워크플로우

### 1단계: 평가 맥락 확인
- 학교급·학년·교과·단원·평가 목적(형성/총괄/수행/진단)을 명확히 파악

### 2단계: PARTS 프레임 구성
- Persona(평가 설계 전문가)·Act·Recipient·Theme·Structure를 채워 프롬프트 골격 확정

### 3단계: 평가 유형별 템플릿 적용
- `references/prompt-templates.md`에서 해당 유형 템플릿 선택 (퀴즈/수행과제/루브릭/변형/데이터 분석/사례 기반)
- Bloom 수준 분배를 `references/bloom-taxonomy.md`로 균형 조정

### 4단계: 출력
- `generate_assessment`로 문항·루브릭 JSON 생성, 요청 시 `export_hwpx`로 한글 문서 변환

## MCP 도구 연동

- `search_content` — 성취기준·교과서 단원 원문 확보로 평가 근거 고정
- `generate_assessment` — 문항·수행과제·루브릭·변형안 JSON 생성
- `export_hwpx` — 한글 문서로 내보내기 (요청 시)

## 산출물

- 형성/총괄/수행평가 설계안 (학생용 안내문 + 루브릭 + 과정 체크포인트)
- Bloom 수준별로 균형 분배된 문항 세트와 오개념 분석
- 평가 결과 데이터 분석 보고서 및 수준별 소그룹·후속 지도 제안

## 사용 예시

- "중3 수학 연립방정식 수행평가 2주짜리 루브릭 포함해서 설계해줘"
- "고1 국어 '논증적 말하기' 수행과제 만들어줘, 모둠+개별 평가로"
- "이 일차방정식 시험을 기초·표준·심화 3단계로 변형해줘"
- "중2 과학 형성평가 결과 데이터 분석해서 재지도 계획 짜줘"
- "Bloom 6단계 균형 분배된 총괄평가 20문항 설계해줘"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 성취기준-문항이 어긋난다 | `search_content`로 성취기준 코드 확인 후 문항별 평가 요소 재정렬 |
| 인지 수준이 하위에 치우친다 | `references/bloom-taxonomy.md`의 수준별 동사로 적용·분석·평가·창안 문항 보강 |
| 지필과 수행 비중이 안 맞는다 | 한국 평가 맥락 40-60% 기준으로 재배분, 형성평가는 비반영으로 분리 |

## 이 스킬을 사용하지 말아야 할 때

- **단일 형성평가 문항만 출제** → `teacher-quiz` 스킬 사용
- **채점 루브릭만 단독 제작** → `teacher-rubric` 스킬 사용
- **수업·단원 계획 수립** → `teacher-lesson-planning` 스킬 사용
- **학습지·활동지 제작** → `teacher-instructional-materials` 스킬 사용