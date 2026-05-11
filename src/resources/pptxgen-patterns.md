# PptxGenJS 코드 패턴 — 한국 교육 맥락

> export_pptx 도구의 차트·표·도형·레이아웃 생성 시 참조하는 코드 패턴집입니다.
> 교육 자료(수업 자료, 학생 발표, 교사 연수)에 자주 쓰이는 패턴만 선별했습니다.

---

## 1. addTable() 패턴

### 1.1 스타일 상수 (교육용 표 기본)
```javascript
const headerStyle = {
  bold: true,
  fontSize: 13,
  color: 'FFFFFF',
  fill: { color: '2C3E50' },       // titleBg
  align: 'center',
  valign: 'middle',
  fontFace: 'Malgun Gothic',
};

const cellStyle = {
  fontSize: 11,
  color: '333333',
  fill: { color: 'FFFFFF' },
  valign: 'middle',
  fontFace: 'Malgun Gothic',
};

const cellAltStyle = {
  ...cellStyle,
  fill: { color: 'F5F5F5' },       // 얼룩 (짝수 행)
};

const cellAccentStyle = {
  ...cellStyle,
  fill: { color: 'DAEEF3' },       // 연청색 — 성취기준/주제 강조
  bold: true,
};
```

### 1.2 성취기준 매핑 표
```javascript
slide.addTable([
  [
    { text: '성취기준', options: headerStyle },
    { text: '학습 목표', options: headerStyle },
    { text: '평가 요소', options: headerStyle },
  ],
  [
    { text: '[9국02-01]', options: cellAccentStyle },
    { text: '작품의 주제를 파악한다', options: cellStyle },
    { text: '서술형·발표', options: cellStyle },
  ],
  [
    { text: '[9국02-02]', options: cellAccentStyle },
    { text: '맥락을 고려해 해석한다', options: cellStyle },
    { text: '토의·관찰', options: cellAltStyle },
  ],
], {
  x: 0.5, y: 1.5, w: 9,
  colW: [1.8, 4.6, 2.6],
  border: { type: 'solid', pt: 0.5, color: 'CCCCCC' },
});
```

### 1.3 수업 시간표 (주간 계획)
```javascript
slide.addTable([
  [
    { text: '교시', options: headerStyle },
    { text: '월', options: headerStyle },
    { text: '화', options: headerStyle },
    { text: '수', options: headerStyle },
    { text: '목', options: headerStyle },
    { text: '금', options: headerStyle },
  ],
  [
    { text: '1교시', options: headerStyle },
    { text: '국어', options: cellStyle },
    { text: '수학', options: cellAltStyle },
    { text: '국어', options: cellStyle },
    { text: '사회', options: cellAltStyle },
    { text: '과학', options: cellStyle },
  ],
  // ... 반복
], {
  x: 0.3, y: 1.5, w: 9.4,
  colW: [0.9, 1.7, 1.7, 1.7, 1.7, 1.7],
});
```

### 1.4 루브릭 표 (평가 기준)
```javascript
const rubricHeaderStyle = {
  ...headerStyle,
  fill: { color: '3498DB' },  // accent 색상
};

slide.addTable([
  [
    { text: '평가 요소', options: rubricHeaderStyle },
    { text: '상 (우수)', options: rubricHeaderStyle },
    { text: '중 (보통)', options: rubricHeaderStyle },
    { text: '하 (노력)', options: rubricHeaderStyle },
  ],
  [
    { text: '주제 파악', options: cellAccentStyle },
    { text: '작품의 핵심 주제를 정확히 설명', options: cellStyle },
    { text: '주제를 개괄적으로 설명', options: cellAltStyle },
    { text: '주제 파악에 어려움', options: cellStyle },
  ],
], {
  x: 0.5, y: 1.5, w: 9,
  colW: [1.8, 2.4, 2.4, 2.4],
});
```

---

## 2. addChart() 패턴 (교육용 3종)

### 2.1 Bar 차트 — 학생 성취도 비교
```javascript
const barData = [
  {
    name: '1반',
    labels: ['읽기', '쓰기', '말하기', '듣기'],
    values: [85, 72, 90, 88],
  },
  {
    name: '2반',
    labels: ['읽기', '쓰기', '말하기', '듣기'],
    values: [78, 81, 85, 82],
  },
  {
    name: '3반',
    labels: ['읽기', '쓰기', '말하기', '듣기'],
    values: [92, 88, 76, 80],
  },
];

slide.addChart('bar', barData, {
  x: 0.5, y: 1.5, w: 9, h: 4.5,
  barDir: 'bar',
  catAxisLabelFontFace: 'Malgun Gothic',
  valAxisLabelFontFace: 'Malgun Gothic',
  catAxisLabelFontSize: 11,
  valAxisLabelFontSize: 10,
  showLegend: true,
  legendPos: 'b',
  legendFontSize: 10,
  legendFontFace: 'Malgun Gothic',
  chartColors: ['3498DB', 'E74C3C', '2ECC71'],
  showTitle: true,
  title: '반별 영역 성취도',
  titleFontSize: 14,
  titleFontFace: 'Malgun Gothic',
  titleColor: '2C3E50',
});
```

### 2.2 Pie / Doughnut — 교과 구성 비율
```javascript
const pieData = [{
  name: '교과 비율',
  labels: ['문학', '독서', '작문', '문법'],
  values: [35, 25, 20, 20],
}];

slide.addChart('pie', pieData, {
  x: 1.5, y: 1.5, w: 7, h: 4.5,
  chartColors: ['3498DB', 'E74C3C', '2ECC71', 'F39C12'],
  showLegend: true,
  legendPos: 'r',
  legendFontSize: 11,
  legendFontFace: 'Malgun Gothic',
  showPercent: true,
  dataLabelFontFace: 'Malgun Gothic',
  dataLabelFontSize: 10,
  dataLabelColor: 'FFFFFF',
});
```

### 2.3 Radar — 핵심역량 달성도
```javascript
const radarData = [
  {
    name: '학급 평균',
    labels: ['의사소통', '창의적 사고', '공동체', '자기관리', '지식정보처리', '심미적 감성'],
    values: [85, 72, 88, 76, 82, 78],
  },
  {
    name: '학년 평균',
    labels: ['의사소통', '창의적 사고', '공동체', '자기관리', '지식정보처리', '심미적 감성'],
    values: [78, 75, 80, 74, 79, 76],
  },
];

slide.addChart('radar', radarData, {
  x: 1, y: 1.5, w: 8, h: 4.5,
  chartColors: ['3498DB', 'E74C3C'],
  showLegend: true,
  legendPos: 'b',
  legendFontFace: 'Malgun Gothic',
  legendFontSize: 10,
  radarStyle: 'standard',
  catAxisLabelFontFace: 'Malgun Gothic',
  catAxisLabelFontSize: 10,
});
```

### 2.4 Line — 학기별 추이
```javascript
const lineData = [{
  name: '평균 점수',
  labels: ['3월', '4월', '5월', '6월', '7월'],
  values: [72, 75, 78, 82, 85],
}];

slide.addChart('line', lineData, {
  x: 0.5, y: 1.5, w: 9, h: 4.5,
  chartColors: ['3498DB'],
  lineSize: 3,
  lineSmooth: true,
  showLegend: false,
  catAxisLabelFontFace: 'Malgun Gothic',
  valAxisLabelFontFace: 'Malgun Gothic',
});
```

---

## 3. addShape() 패턴

### 3.1 카드형 배경 (ROUNDED_RECT)
```javascript
slide.addShape('roundRect', {
  x: 0.5, y: 1.5, w: 4.2, h: 3.5,
  fill: { color: 'F5F5F5' },
  line: { type: 'none' },
  rectRadius: 0.15,
});
slide.addText('카드 내부 텍스트', {
  x: 0.7, y: 1.7, w: 3.8, h: 3.1,
  fontFace: 'Malgun Gothic', fontSize: 13, color: '333333',
});
```

### 3.2 구분선 (LINE)
```javascript
slide.addShape('line', {
  x: 0.5, y: 1.3, w: 9, h: 0,
  line: { color: '3498DB', width: 2 },
});
```

### 3.3 강조 박스 (좌측 세로 바 + 배경)
```javascript
// 왼쪽 강조 바
slide.addShape('rect', {
  x: 0.5, y: 2.0, w: 0.15, h: 2.5,
  fill: { color: '3498DB' },
  line: { type: 'none' },
});
// 본문 박스
slide.addShape('rect', {
  x: 0.65, y: 2.0, w: 8.5, h: 2.5,
  fill: { color: 'F8FAFD' },
  line: { type: 'none' },
});
slide.addText('핵심 메시지', {
  x: 0.9, y: 2.1, w: 8.1, h: 2.3,
  fontFace: 'Malgun Gothic', fontSize: 14, color: '2C3E50',
});
```

### ⚠️ 주의: "도형으로 차트/표를 그리지 마세요"
- 막대 그래프를 여러 개의 rect로 조합 → **addChart('bar', ...) 사용**
- 원 차트를 여러 개의 부채꼴로 조합 → **addChart('pie', ...) 사용**
- 데이터 표를 rect + text 반복으로 구현 → **addTable(...) 사용**
도형은 **장식·레이아웃 보조**용으로만 사용하세요.

---

## 4. 슬라이드 헬퍼 함수

### 4.1 titleBar() — 상단 타이틀 바
```javascript
function titleBar(slide, titleText, theme) {
  slide.addShape('rect', {
    x: 0, y: 0, w: 10, h: 1.2,
    fill: { color: theme.titleBg },
    line: { type: 'none' },
  });
  slide.addText(titleText, {
    x: 0.5, y: 0.2, w: 9, h: 0.8,
    fontFace: theme.titleFont.fontFace,
    fontSize: 24,
    color: theme.titleFont.color,
    bold: true,
  });
}
```

### 4.2 pageNumber() — 우하단 페이지 번호
```javascript
function pageNumber(slide, current, total, theme) {
  slide.addText(`${current} / ${total}`, {
    x: 8.8, y: 5.3, w: 1.0, h: 0.3,
    fontFace: theme.bodyFont.fontFace,
    fontSize: 9,
    color: '999999',
    align: 'right',
  });
}
```

### 4.3 cardLayout() — 2×2 카드 배치 (Bento 스타일)
```javascript
function cardLayout(slide, cards, theme) {
  // cards: [{title, body}, ...] (최대 4개)
  const positions = [
    { x: 0.5, y: 1.5, w: 4.2, h: 1.85 },
    { x: 5.3, y: 1.5, w: 4.2, h: 1.85 },
    { x: 0.5, y: 3.5, w: 4.2, h: 1.85 },
    { x: 5.3, y: 3.5, w: 4.2, h: 1.85 },
  ];
  cards.slice(0, 4).forEach((card, i) => {
    const p = positions[i];
    slide.addShape('roundRect', {
      ...p,
      fill: { color: 'F5F5F5' },
      line: { type: 'none' },
      rectRadius: 0.12,
    });
    slide.addText(card.title, {
      x: p.x + 0.2, y: p.y + 0.1, w: p.w - 0.4, h: 0.5,
      fontFace: theme.titleFont.fontFace,
      fontSize: 14, color: theme.accent, bold: true,
    });
    slide.addText(card.body, {
      x: p.x + 0.2, y: p.y + 0.7, w: p.w - 0.4, h: p.h - 0.8,
      fontFace: theme.bodyFont.fontFace,
      fontSize: 11, color: theme.bodyFont.color,
    });
  });
}
```

### 4.4 twoColumn() — 2단 레이아웃
```javascript
function twoColumn(slide, left, right, theme) {
  const common = { y: 1.5, w: 4.4, h: 3.8, valign: 'top' };
  slide.addText(left, {
    x: 0.5, ...common,
    fontFace: theme.bodyFont.fontFace,
    fontSize: 13, color: theme.bodyFont.color,
  });
  // 세로 구분선
  slide.addShape('line', {
    x: 5.0, y: 1.5, w: 0, h: 3.8,
    line: { color: 'CCCCCC', width: 1 },
  });
  slide.addText(right, {
    x: 5.2, ...common,
    fontFace: theme.bodyFont.fontFace,
    fontSize: 13, color: theme.bodyFont.color,
  });
}
```

---

## 5. 12 디자인 스타일별 차트 팔레트

pptx-styles.md의 각 스타일과 매칭되는 차트 색상/표 스타일 값입니다.

| 스타일 | 차트 색상 4종 | 헤더 배경 | 강조 셀 |
|--------|------------|----------|---------|
| Dark Academia | `C9A84C, 8A7340, D4BF9A, 6B4C2A` | `1A1208` | `3A2E14` |
| Swiss International | `111111, E8000D, 444444, 888888` | `111111` | `FFE5E5` |
| Nordic Minimalism | `3D3530, 8A7A6A, C8B9A5, 6B5E4E` | `3D3530` | `EDE5DA` |
| Bento Grid | `1A1A2E, E8FF3B, FF6B6B, 4ECDC4` | `1A1A2E` | `FFF9D0` |
| Pastel Soft UI | `F9C6E8, C6E8F9, B8E6C1, FFD8A8` | `F0EDE8` | `FDF0F8` |
| Gradient Mesh | `FF6EC7, 7B61FF, 00D4FF, FFB347` | `7B61FF` | `F5EAFF` |
| Glassmorphism | `67E8F9, A78BFA, 6B21A8, 1E3A5F` | `0F0F2D` | `1A1A4E` |
| Architectural Blueprint | `64C8FF, 96DCFF, 3D7FB8, 0D2240` | `0D2240` | `1A3A60` |
| Monochrome Minimal | `1A1A1A, 666666, AAAAAA, E0E0E0` | `1A1A1A` | `FAFAFA` |
| Editorial Magazine | `1A1A1A, E63030, 666666, BBBBBB` | `1A1A1A` | `FFE5E5` |
| Typographic Bold | `1A1A1A, E63030, 888888, 555555` | `0A0A0A` | `FFE5E5` |
| Duotone Color Split | `FF4500, 1A1A2E, FF8C42, 4A4A6E` | `1A1A2E` | `FFE5D0` |

### 사용 예시
```javascript
// Dark Academia 스타일 적용 시
slide.addChart('bar', data, {
  chartColors: ['C9A84C', '8A7340', 'D4BF9A', '6B4C2A'],
  titleColor: 'C9A84C',
  catAxisLabelColor: 'D4BF9A',
  valAxisLabelColor: 'D4BF9A',
  // ...
});
```

---

## 6. 한국어 폰트 주의사항

### 6.1 기본 폰트
- **Malgun Gothic**: Windows에 내장, 가장 안전 (기본값)
- **Apple SD Gothic Neo**: macOS 내장
- **Noto Sans KR**: Linux/다국가 환경

### 6.2 프리셋 폰트 (fontPreset 옵션 사용 시)
| 프리셋 | 제목 | 본문 | 설치 필요 |
|--------|------|------|---------|
| `default` | Malgun Gothic | Malgun Gothic | ❌ (기본 내장) |
| `pretendard` | Pretendard | Pretendard | ✅ **PC에 설치 필수** |
| `mixed` | KoPubWorldDotum | Malgun Gothic | ✅ KoPubWorldDotum 설치 필요 |
| `serif` | Nanum Myeongjo | Malgun Gothic | ✅ Nanum Myeongjo 설치 필요 |

**중요**: Pretendard / KoPubWorldDotum / Nanum Myeongjo는 PC에 설치되어 있어야 PowerPoint에서 정상 표시됩니다. 미설치 환경에서는 PowerPoint가 시스템 기본 폰트로 자동 대체하므로, 발표 환경을 사전 확인하세요.

### 6.3 cowork-plugins 원본과의 차이
cowork-plugins의 pptx-designer는 Pretendard+명조 기반이지만, 본 MCP는 **Malgun Gothic을 기본값**으로 하여 Windows 미설치 환경에서도 안전하게 동작하도록 설계되었습니다.

---

## 7. 차트 힌트 주석 문법 (export_pptx 전용)

export_pptx 도구는 마크다운 내 HTML 주석으로 차트 유형을 지정합니다:

```markdown
# 학생 성취도 분석

<!-- chart:bar -->
| 영역 | 1반 | 2반 | 3반 |
|------|-----|-----|-----|
| 읽기 | 85 | 78 | 92 |
| 쓰기 | 72 | 81 | 88 |

# 교과 구성 비율

<!-- chart:pie -->
| 영역 | 비율 |
|------|------|
| 문학 | 35 |
| 독서 | 25 |
```

### 지원 유형
- `<!-- chart:bar -->` — 막대 그래프 (다계열 가능)
- `<!-- chart:line -->` — 선 그래프 (추이)
- `<!-- chart:pie -->` — 원 그래프 (단일 시리즈, 두 열 표)

힌트 주석 없으면 표는 일반 테이블로 렌더링됩니다 (기존 동작).
