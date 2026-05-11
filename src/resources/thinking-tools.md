# 사고 도구 활동지 가이드 (Thinking Tools Worksheet Guide)

`export_thinking_tool` 도구를 사용하여 Project Zero 기반 사고 루틴 활동지를 생성합니다.

## 지원하는 사고 루틴 (10종)

### 3-칼럼 레이아웃

| 루틴 | routine 값 | 영역 키 (content) | 설명 |
|------|-----------|-------------------|------|
| SEE-THINK-WONDER | `see-think-wonder` | `see`, `think`, `wonder` | 관찰 → 사고 → 궁금증 |
| K-W-L | `kwl` | `know`, `wonder`, `learned` | 아는 것 → 알고 싶은 것 → 배운 것 |
| P-M-I | `pmi` | `plus`, `minus`, `interesting` | 긍정 → 부정 → 흥미 |
| C-S-I | `csi` | `color`, `symbol`, `image` | 색 → 기호 → 이미지 |
| 3 WHY | `3why` | `why1`, `why2`, `why3` | 나 → 주변 → 세상에 왜 중요한가 |
| THINK PUZZLE EXPLORE | `think-puzzle-explore` | `think`, `puzzle`, `explore` | 아는 것 → 궁금한 것 → 탐구 방법 |

### 2x2 그리드 레이아웃

| 루틴 | routine 값 | 영역 키 (content) | 설명 |
|------|-----------|-------------------|------|
| 4C | `4c` | `connections`, `challenges`, `concepts`, `changes` | 연관 → 도전 → 개념 → 변화 |

### 나침반 레이아웃 (X형 대각선)

| 루틴 | routine 값 | 영역 키 (content) | 설명 |
|------|-----------|-------------------|------|
| COMPASS POINTS | `compass-points` | `needs`, `excitements`, `worries`, `suggestions` | 필요 → 흥미 → 걱정 → 제안 |

### 2-행 레이아웃

| 루틴 | routine 값 | 영역 키 (content) | 설명 |
|------|-----------|-------------------|------|
| 예전 생각, 지금 생각 | `i-used-to-think-now-i-think` | `used_to_think`, `now_i_think` | 이전 사고 → 현재 사고 비교 |

### 자유 레이아웃 (별+소원)

| 루틴 | routine 값 | 영역 키 (content) | 설명 |
|------|-----------|-------------------|------|
| TWO STARS AND A WISH | `two-stars-and-a-wish` | `star1`, `star2`, `wish` | 좋았던 점 2가지 + 바라는 점 |

## 사용 예시

### 빈 활동지 생성 (PPTX)
```json
{
  "routine": "see-think-wonder",
  "topic": "인상주의 미술",
  "format": "pptx"
}
```

### 내용이 채워진 활동지
```json
{
  "routine": "pmi",
  "topic": "AI 기반 학습 도구 도입",
  "format": "pptx",
  "content": {
    "plus": "학생 맞춤형 피드백 가능\n학습 속도 자율 조절",
    "minus": "기기 의존성 증가\n사회성 발달 우려",
    "interesting": "교사 역할의 변화\n평가 방식의 혁신 가능성"
  }
}
```

### HWPX 형식으로 생성
```json
{
  "routine": "kwl",
  "topic": "지속가능한 발전",
  "format": "hwpx"
}
```
HWPX 형식 선택 시, section_xml이 반환됩니다. 이를 `export_hwpx` 도구의 `section_xml` 파라미터로 전달하여 최종 .hwpx 파일을 생성하세요.

## 출력 형식별 특징

| 특징 | PPTX | HWPX |
|------|------|------|
| 시각적 완성도 | 높음 (색상 배지, 워터마크, 그라데이션) | 보통 (표 기반 레이아웃) |
| 편집 용이성 | PowerPoint에서 자유 편집 | 한글에서 표 편집 |
| 인쇄 최적화 | 16:9 가로 | A4 세로 |
| 추천 용도 | 수업 프레젠테이션, 디지털 활동지 | 인쇄용 활동지, 학교 공문서 연동 |
