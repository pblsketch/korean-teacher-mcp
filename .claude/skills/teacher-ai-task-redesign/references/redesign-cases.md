# 과제 재설계 사례와 GRASPS 프레임워크

> korean-teacher-mcp | teacher-ai-task-redesign 참조 가이드

4단계 GRASPS 재설계 작성과 5단계 교사용 운영 가이드, 그리고 JSON 응답 스키마를 정리합니다. Before/After 사례 작성 시 진단 → 모드 → 전략 → GRASPS → 운영 가이드의 순서를 유지합니다.

## 4단계: 재설계 과제 작성 (GRASPS)

GRASPS 프레임워크를 적용하여 상세한 재설계 과제를 작성합니다 (PBL 초안 생성과 일관성 유지):

- **G(Goal)**: 학생이 달성해야 할 과제의 목표
- **R(Role)**: 학생이 맡을 구체적인 역할
- **A(Audience)**: 결과물을 발표하고 설득해야 할 청중/대상
- **S(Situation)**: 과제를 수행할 구체적인 배경과 맥락
- **P(Product)**: 학생이 최종적으로 만들어낼 산출물
- **S(Standards)**: 결과물이 충족해야 할 평가 기준 (성취기준 연계)

`taskDescription`은 학생이 바로 이해할 수 있게 구체적으로 단계별 마크다운으로 작성합니다.

## 5단계: 교사용 운영 가이드

다음 내용을 포함하여 상세히 제공합니다:

1. **운영 체크리스트**: 사전 준비(before), 진행 중(during), 평가 시(after) 점검 사항
2. **학생 질문 FAQ**: 예상 질문 3-5개와 권장 답변
3. **AI 오용 대응 방안**: 의심 상황별 구체적 대응 방법
4. **프롬프트 로그 양식**: 학생 배포용 양식 제공(마크다운)

## JSON 응답 스키마

다음 JSON 형식으로 정확히 응답합니다:

```json
{
  "vulnerabilityDiagnosis": [
    {
      "area": "aiReplaceability | uniqueThinking | processVisibility | authenticity | verifiability",
      "areaLabel": "영역 한글명",
      "coreQuestion": "핵심 질문",
      "level": "높음 | 중간 | 낮음",
      "explanation": "구체적 설명"
    }
  ],
  "recommendedAIMode": "forbidden | restricted | collaborative | leading | experimental",
  "recommendedAILevel": "1-5",
  "aiLevelRationale": "모드 선정 이유",
  "aiLevelMatrix": [
    {
      "session": "1차시",
      "activity": "활동 내용",
      "aiMode": "forbidden | restricted | collaborative | leading | experimental",
      "aiLevel": "1-5",
      "rationale": "선정 이유"
    }
  ],
  "appliedStrategies": [
    {
      "strategy": "authenticTask | processEvaluation | aiInaccessible | presentationDebate",
      "strategyLabel": "전략명",
      "application": "적용 방법"
    }
  ],
  "redesignedTask": {
    "taskName": "과제명",
    "learningObjective": "학습 목표",
    "aiUsageMode": "forbidden | restricted | collaborative | leading | experimental",
    "aiUsageLevel": "1-5",
    "grasps": {
      "goal": "학생이 달성해야 할 목표",
      "role": "학생이 맡을 역할",
      "audience": "결과물의 청중/대상",
      "situation": "과제 수행 상황/맥락",
      "product": "최종 결과물/산출물",
      "standards": ["평가 기준 1", "평가 기준 2", "..."]
    },
    "taskDescription": "단계별 상세 안내 (마크다운)",
    "aiGuidelines": {
      "allowed": ["허용 사항"],
      "prohibited": ["금지 사항"]
    },
    "submissions": [
      { "item": "제출물", "deadline": "마감" }
    ],
    "evaluationCriteria": [
      { "area": "평가 영역", "weight": "배점", "description": "평가 내용" }
    ],
    "academicIntegrityNote": "학문적 진실성 안내"
  },
  "teacherGuide": {
    "checklist": {
      "before": ["사전 준비 항목"],
      "during": ["진행 중 점검 항목"],
      "after": ["평가 시 점검 항목"]
    },
    "studentFAQ": [
      { "question": "예상 질문", "answer": "권장 답변" }
    ],
    "aiMisuseResponse": [
      { "situation": "의심 상황", "response": "대응 방법" }
    ],
    "promptLogTemplate": "프롬프트 로그 양식 (마크다운)"
  },
  "comparison": [
    { "aspect": "비교 관점", "original": "원본", "redesigned": "재설계" }
  ]
}
```

## 출력 규칙

- `vulnerabilityDiagnosis`는 반드시 5개 영역 모두 포함
- 복합 과제(3차시 이상)인 경우 `aiLevelMatrix` 필수 포함
- `taskDescription`은 학생이 바로 이해할 수 있게 구체적으로 작성
- 모든 텍스트는 한국어로 작성
- `comparison` 배열로 Before/After 비교 관점을 명시해 재설계 이유를 교사에게 드러냄