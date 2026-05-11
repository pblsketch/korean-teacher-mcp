---
name: teacher-udl
description: >
  보편적 학습 설계(UDL) 3원칙으로 모든 학습자가 접근 가능한 수업을 설계합니다.
  "UDL 수업 설계해줘", "다양한 학습자를 위한 수업 만들어줘"라고 요청하세요.
  참여·표현·행동과 표현 3원칙, 성취기준 기반, 한국 교실 맥락 반영.
user-invocable: true
metadata:
  version: "2.0.0"
  status: "stable"
  updated: "2026-04-13"
---

# 교과서 UDL (Korean Teacher Universal Design for Learning)

> korean-teacher-mcp | 보편적 학습 설계 전문 스킬

참조 가이드:
- `references/udl-principles.md` — UDL 3원칙(참여·표현·행동과 표현)과 핵심 가치
- `references/implementation-guide.md` — 교과별 적용 전략과 참고자료 활용 원칙

## 트리거 키워드

UDL, 보편적 학습 설계, Universal Design for Learning, 참여, 표현, 행동과 표현, 학습 장벽, 다양한 학습자, 접근성

## 워크플로우

### 1단계: 성취기준·맥락 확보
- 학년·교과·성취기준·학급 특성·교사 어려움을 확인
- `search_content`로 교과서·성취기준 원문 확보 (참고자료 우선 검토)

### 2단계: 학습 장벽 진단
- 현재 수업에서 어떤 학생이 막히는지 분석
- 장벽이 학습자가 아닌 교육과정에 있다는 원칙 적용

### 3단계: 3원칙 매핑
- 참여(Engagement) — 흥미·자기조절 진입점
- 표현(Representation) — 정보 제시 다중 경로
- 행동과 표현(Action & Expression) — 학습 결과 표현 옵션

### 4단계: 출력
- 체크리스트·선택 과제 형식의 실행 전략 제공
- 한글 문서가 필요하면 `export_hwpx`

## MCP 도구 연동

- `search_content` — 성취기준·교과서 원문 검색으로 참고자료 확보
- `export_hwpx` — UDL 수업안·체크리스트를 한글 문서로 내보내기 (요청 시)

## 산출물

- 3원칙별 구체 전략 (참여·표현·행동과 표현 각 2~3개)
- 성취기준 기반 학습 장벽 진단과 대응 방안
- 체크리스트 또는 선택 과제 형식의 즉시 실행 자료

## 사용 예시

- "중1 과학 물질의 상태 변화 단원, 주의집중 어려운 학생 포함된 학급용 UDL 수업 설계해줘"
- "고2 국어 비문학 독해를 UDL로 재설계해줘, 다문화 학생 2명 있어"
- "이 성취기준으로 UDL 체크리스트 만들어줘"
- "UDL 3원칙별로 표현 옵션 늘리는 전략 알려줘"
- "수업안에서 학습 장벽이 어디 있는지 진단해줘"

## 문제 해결

| 상황 | 해결 방법 |
|------|-----------|
| 전략이 추상적이다 | `implementation-guide.md`의 교과별 적용 예시로 구체화 |
| 한 차시에 3원칙 모두 어렵다 | 단계적 도입 — 한 원칙씩 점진 적용, 점검 후 확장 |
| 참고자료가 무시된다 | 참고자료 활용 5단계 원칙 재적용, 자료 내 개념·활동을 직접 인용 |

## 이 스킬을 사용하지 말아야 할 때

- **수준별·개별 학생 맞춤 과제 설계** → `teacher-differentiation` 스킬 사용
- **수업 전체·차시 설계** → `teacher-lesson-planning` 스킬 사용
- **학습지·활동지 제작** → `teacher-instructional-materials` 스킬 사용
