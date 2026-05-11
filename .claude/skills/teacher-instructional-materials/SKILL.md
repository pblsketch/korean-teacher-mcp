---
name: teacher-instructional-materials
description: >
  학습지·읽기 자료·실험 가이드·토론 가이드·기능 연습 활동을 교실에 맞게 제작합니다.
  "학습지 만들어줘", "실험 가이드 만들어줘"라고 요청하세요.
  수준 조정(다중 수준), 한글 파일 호환 형식, 자기 점검·피드백 공간 포함.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 수업 자료 (Korean Teacher Instructional Materials)

> korean-teacher-mcp | 학습지·활동지·수업 자료 전문 스킬

참조 가이드:
- `references/material-types.md` — 읽기 자료/학습지/실험/토론/기능 연습/개인화 유형별 템플릿
- `references/copyright-checklist.md` — 저작권·안전·UDL·HWPX 호환 체크리스트

## 트리거 키워드

학습지, 활동지, 워크시트, 읽기 자료, 수준 조정, 실험 가이드, 실습 자료, 토론 가이드, 하브루타, 기능 연습, 콘텐츠 개인화

## 워크플로우

### 1단계: 맥락 확인
- 학교급·학년·교과·학습 목표·대상 학생 특성(읽기 수준, 학습 격차)을 명확화

### 2단계: 자료 유형 선택
- 6종(읽기 수준 조정/학습지/실험/토론/기능 연습/개인화) 중 목적에 맞는 유형을 `references/material-types.md`에서 선택

### 3단계: PARTS 프레임 구성
- Persona(자료 개발자)·Act·Recipient(학년·읽기 수준)·Theme·Structure를 채워 프롬프트 골격 확정

### 4단계: 품질·저작권 체크
- `references/copyright-checklist.md`로 저작권·안전·UDL·HWPX 호환성 점검

### 5단계: 출력
- `generate_worksheet`로 학습지 초안 생성, 요청 시 `export_hwpx`로 한글 문서 변환

## MCP 도구 연동

- `search_content` — 교과서 단원·성취기준 원문 확보
- `generate_worksheet` — 학습지·활동지·실험 가이드 초안 생성
- `export_hwpx` — 한글 파일로 내보내기 (요청 시)

## 산출물

- A4 1~2장 분량 학생용 학습지 (안내문·활동·자기 점검·피드백 공간)
- 다중 수준(기초/표준/심화) 읽기 자료 세트와 어휘 목록
- 실험 안내서(안전 수칙·단계·관찰 기록표·탐구 질문)·토론 가이드·기능 연습 활동

## 사용 예시

- "중1 과학 광합성 읽기 자료 3수준으로 만들어줘"
- "중2 국어 '문학 작품의 관점 분석' 학습지 A4 2장으로"
- "중2 과학 DNA 추출 실험 가이드, 안전 수칙부터 탐구 질문까지"
- "고2 사회 기본소득제 하브루타 토론 가이드 50분짜리"
- "중2 국어 근거 들어 주장하기 기능 연습 30분 활동"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 학급 내 읽기 수준 격차가 크다 | 다중 수준 읽기 자료(3수준) 템플릿으로 동일 개념을 수준별로 제공 |
| 한글 파일로 안 붙는다 | `references/copyright-checklist.md` HWPX 호환성 체크 — cellMargin 510/141, 표 폭 ≤42520 |
| 저작권이 걱정된다 | `references/copyright-checklist.md` 저작권 확인 절차, 교과서 출처 표시, 수업 목적 이용 한도 준수 |

## 이 스킬을 사용하지 말아야 할 때

- **수업·단원 전체 계획 수립** → `teacher-lesson-planning` 스킬 사용
- **평가 문항·퀴즈 제작** → `teacher-quiz` 스킬 사용
- **평가 전체 계획·수행평가·루브릭** → `teacher-assessment` 스킬 사용
- **루브릭 단독 제작** → `teacher-rubric` 스킬 사용
