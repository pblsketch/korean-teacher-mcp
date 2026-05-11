# 출력 형식 (JSON 스키마)

> korean-teacher-mcp | teacher-quiz 참조 가이드

반드시 아래 구조로 **JSON만** 출력합니다. 추가 설명, 인사말, 코드 블록은 포함하지 않습니다.

## JSON 스키마

```json
{
  "metadata": {
    "generatedAt": "ISO 8601",
    "contentSource": "출처 요약 (30자 이내)",
    "totalQuestions": 숫자,
    "pblStage": "pre-class|during-class|post-class",
    "averageDifficulty": 1.0-5.0
  },
  "questions": [
    {
      "id": "고유ID",
      "type": "multiple_choice|true_false|short_answer|hinge_question|essay",
      "stem": "질문",
      "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
      "difficulty": "easy|medium|hard",
      "difficultyScore": 1-5,
      "optionCount": "선택지수 (서술형/단답형은 null)",
      "options": ["선택지1", "..."],
      "correctAnswerIndex": "정답인덱스 (서술형/단답형은 null)",
      "expectedAnswerKeywords": ["단답형 예상 정답 키워드"],
      "modelAnswer": "서술형 모범 답안 (essay 유형 필수)",
      "essayRubric": "서술형 채점 루브릭 (essay 유형 필수)",
      "explanation": "해설",
      "tags": ["키워드1", "키워드2"]
    }
  ]
}
```

## 필드별 규칙

- **metadata.pblStage**: `pre-class` | `during-class` | `post-class` — PBL 단계에 맞춰 설정
- **metadata.averageDifficulty**: 1.0~5.0 실수. 모든 문항 difficultyScore 평균값
- **questions[].type**: 5종 — multiple_choice / true_false / short_answer / hinge_question / essay
- **questions[].bloomLevel**: 블룸 분류 6수준 중 하나
- **questions[].optionCount / options / correctAnswerIndex**: 서술형·단답형은 null 처리
- **questions[].expectedAnswerKeywords**: 단답형에서 다양한 정답 표현을 배열로 수록
- **questions[].modelAnswer**: essay 유형 필수. 모범 답안 예시
- **questions[].essayRubric**: essay 유형 필수. 평가 준거·수준별 기준·총점 포함
- **questions[].explanation**: 정답 근거를 콘텐츠에 비추어 간단히 서술
- **questions[].tags**: 검색·분류용 키워드 배열

## 출력 시 재확인 체크

1. 순수 JSON만 반환했는가?
2. 모든 문항 id가 유일한가?
3. 힌지 질문에 misconceptionMap, teacherGuidance가 포함되어 있는가?
4. 서술형에 modelAnswer, essayRubric이 모두 포함되어 있는가?
5. averageDifficulty 값이 개별 difficultyScore 평균과 일치하는가?