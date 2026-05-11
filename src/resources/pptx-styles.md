# PPTX 디자인 스타일 가이드 (교육용 선별)

> 출처: [pptx-design-styles](https://github.com/corazzon/pptx-design-styles) by corazzon (TodayCode)
> 교육 현장에 적합한 12개 스타일을 선별하였습니다.

## 스타일 추천 매트릭스 (교육용)

| 발표 목적 | 추천 스타일 |
|-----------|------------|
| 수업/강의/연구 발표 | Dark Academia, Swiss International, Nordic Minimalism |
| 학생 프로젝트/모둠 발표 | Bento Grid, Pastel Soft UI, Gradient Mesh |
| 학교/기관 공식 발표 | Swiss International, Monochrome Minimal, Editorial Magazine |
| 교과서/교재 소개 | Editorial Magazine, Typographic Bold, Dark Academia |
| 비교/분석 발표 | Duotone Color Split, Bento Grid, Architectural Blueprint |
| 과학/기술 발표 | Glassmorphism, Architectural Blueprint, Swiss International |
| 예술/문화 발표 | Gradient Mesh, Monochrome Minimal, Nordic Minimalism |

## 사용법
1. export_pptx 도구 호출 시 이 리소스를 참조하여 적절한 스타일 선택
2. 선택한 스타일의 Colors, Fonts 섹션에서 HEX 값과 폰트명 추출
3. export_pptx의 theme 파라미터로 전달

## ⚠️ 폰트 설치 안내 (중요)

theme.fontPreset 옵션 사용 시 아래 폰트가 **발표 PC에 설치되어 있어야** 정상 표시됩니다.
미설치 환경에서는 PowerPoint가 시스템 기본 폰트로 자동 대체하므로 디자인이 달라질 수 있습니다.

| fontPreset | 제목 폰트 | 본문 폰트 | 설치 필요 |
|-----------|----------|----------|----------|
| `default` | Malgun Gothic | Malgun Gothic | ❌ (Windows 기본 내장) |
| `pretendard` | Pretendard | Pretendard | ✅ [Pretendard 다운로드](https://github.com/orioncactus/pretendard) |
| `mixed` | KoPubWorldDotum | Malgun Gothic | ✅ KoPubWorld 공식 사이트 |
| `serif` | Nanum Myeongjo | Malgun Gothic | ✅ 네이버 나눔글꼴 |

**권장**: 한국 교실·연수처럼 발표 환경이 불확실할 때는 `fontPreset` 지정하지 말고 기본값(Malgun Gothic) 사용.
각 디자인 스타일 원본이 Pretendard/영문 폰트(Segoe UI, Inter 등)를 지정하더라도, 한글 환경에서는 Malgun Gothic으로 대체해도 시각적 품질 손실이 크지 않습니다.

예시:
- titleBg: 스타일의 Background 또는 dark color
- contentBg: 스타일의 Background 또는 light color  
- accent: 스타일의 Accent color
- titleFontFace, bodyFontFace: 스타일의 Fonts 섹션 참조
- titleColor, bodyColor: 스타일의 Colors 표 참조

---

## 01. Glassmorphism

**Mood**: Premium, tech, futuristic  
**Best For**: SaaS, app launches, AI product decks

### Background
- Deep 3-color gradient: `#1A1A4E → #6B21A8 → #1E3A5F`
- Or deep single-tone blue: `#0F0F2D`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Glass card fill | White translucent | `#FFFFFF` @ 15–20% opacity |
| Glass card border | White translucent | `#FFFFFF` @ 25% opacity |
| Title text | White | `#FFFFFF` |
| Body text | Soft white | `#E0E0F0` |
| Accent | Cyan or violet | `#67E8F9` or `#A78BFA` |

### Fonts
- Title: **Segoe UI Light / Calibri Light**, 36–44pt, bold
- Body: **Segoe UI**, 14–16pt, regular

### Layout
- Card-based: frosted-glass rectangles as content containers
- Rounded corners, blurred glow blobs in background

### Signature Elements
- Translucent card (fill 15–20%, white border 25%)
- Blurred glow blobs in background

### Avoid
- White backgrounds, fully opaque cards, bright saturated solid colors

---

## 03. Bento Grid

**Mood**: Modular, informational, Apple-inspired  
**Best For**: Feature comparisons, product overviews, data summaries

### Background
- Near-white: `#F8F8F2` or `#F0F0F0`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Background | Off-white | `#F8F8F2` |
| Cell 1 (dark) | Deep navy | `#1A1A2E` |
| Cell 2 (accent 1) | Bright yellow | `#E8FF3B` |
| Cell 3 (accent 2) | Coral red | `#FF6B6B` |
| Cell 4 (accent 3) | Teal | `#4ECDC4` |

### Fonts
- Cell title: **SF Pro / Inter**, 18–24pt, semibold
- Cell body: **Inter**, 12–14pt, regular

### Layout
- CSS Grid-style layout with asymmetric cell sizes
- One dark anchor cell with white text

### Avoid
- Equal-sized cells, too many colors (max 5), dense text

---

## 04. Dark Academia

**Mood**: Scholarly, vintage, refined, literary  
**Best For**: Education, historical research, book presentations, university talks

### Background
- Deep warm dark brown: `#1A1208`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Background | Deep warm brown | `#1A1208` |
| Title text | Antique gold | `#C9A84C` |
| Body text | Warm parchment | `#D4BF9A` |
| Accent | Muted gold | `#8A7340` |

### Fonts
- Title: **Playfair Display Italic / Georgia Italic**, 36–48pt
- Body: **EB Garamond / Georgia**, 13–16pt

### Layout
- Inset border frame, centered title, serif body text
- Decorative horizontal rule line (thin, gold tint)

### Signature Elements
- Double inset border, italic serif title in gold
- Monospace footnote in muted gold

### Avoid
- Modern sans-serif fonts, bright colors, clean minimal layouts

---

## 05. Gradient Mesh

**Mood**: Artistic, vibrant, sensory, brand-forward  
**Best For**: Brand launches, creative portfolios, music/film promotions

### Background
- Multi-point radial gradient: `#FF6EC7` + `#7B61FF` + `#00D4FF` + `#FFB347`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Mesh node 1 | Hot pink | `#FF6EC7` |
| Mesh node 2 | Violet | `#7B61FF` |
| Mesh node 3 | Cyan | `#00D4FF` |
| Text | Pure white | `#FFFFFF` |

### Fonts
- Title: **Bebas Neue / Barlow Condensed ExtraBold**, 48–72pt
- Body: **Outfit / Poppins Light**, 14–16pt

### Layout
- Full-bleed gradient background, minimal text overlay
- White text with drop shadow

### Avoid
- Linear two-color gradients, dark text, overcrowded layouts

---

## 07. Swiss International Style

**Mood**: Functional, authoritative, timeless, corporate  
**Best For**: Consulting, finance, government, institutional presentations

### Background
- Pure white: `#FFFFFF`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Background | White | `#FFFFFF` |
| Primary text | Near-black | `#111111` |
| Accent bar | Signal red | `#E8000D` |
| Secondary text | Dark grey | `#444444` |

### Fonts
- Title: **Helvetica Neue Bold / Arial Bold**, 32–44pt
- Body: **Helvetica Neue / Arial**, 12–14pt

### Layout
- Strict grid, vertical red rule on left edge
- Horizontal divider rule at mid-slide

### Signature Elements
- Left-edge vertical red bar
- Grid-aligned text blocks with generous margins

### Avoid
- Decorative elements, rounded corners, more than 2 fonts

---

## 10. Nordic Minimalism

**Mood**: Calm, natural, considered, Scandinavian  
**Best For**: Wellness, lifestyle, non-profit, sustainable brands

### Background
- Warm cream: `#F4F1EC`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Background | Warm cream | `#F4F1EC` |
| Primary text | Dark warm brown | `#3D3530` |
| Secondary text | Taupe | `#8A7A6A` |

### Fonts
- Title: **Canela / DM Serif Display**, 36–52pt, light weight
- Body: **Inter Light / Lato Light**, 13–15pt

### Layout
- Generous whitespace (40%+ empty), organic blob shape
- Thin horizontal rule near bottom

### Signature Elements
- Organic blob background shape, 3-dot color accent
- Wide letter-spacing caption in monospace

### Avoid
- Bright colors, dense text, sans-serif display fonts

---

## 11. Typographic Bold

**Mood**: Editorial, impactful, design-driven  
**Best For**: Brand statements, manifestos, headline announcements

### Background
- Off-white linen: `#F0EDE8` or pure black: `#0A0A0A`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Background | Off-white | `#F0EDE8` |
| Primary type | Near-black | `#1A1A1A` |
| Accent word | Signal red | `#E63030` |

### Fonts
- Display: **Bebas Neue / Anton**, 80–120pt
- Body: **Space Mono**, 9pt

### Layout
- Type fills the slide, 2–3 lines maximum
- One word in accent color

### Avoid
- Images or icons, more than 3 lines, multiple font families

---

## 12. Duotone / Color Split

**Mood**: Dramatic, comparative, energetic  
**Best For**: Strategy decks, before/after, compare/contrast slides

### Background
- Left half: `#FF4500`, Right half: `#1A1A2E`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Left panel | Orange-red | `#FF4500` |
| Right panel | Deep navy | `#1A1A2E` |
| Left text | White | `#FFFFFF` |
| Right text | Orange-red | `#FF4500` |

### Fonts
- Panel text: **Bebas Neue**, 40–56pt
- Caption: **Space Mono**, 9pt

### Layout
- Strict 50/50 vertical split with white divider line

### Avoid
- Three or more panels, similar hues, busy content

---

## 13. Monochrome Minimal

**Mood**: Restrained, luxury, precise, gallery-like  
**Best For**: Luxury brands, portfolio, art direction, high-end consulting

### Background
- Near-white: `#FAFAFA` or jet black: `#0A0A0A`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Background | Near-white | `#FAFAFA` |
| Heavy type | Near-black | `#1A1A1A` |
| Thin rule/border | Light grey | `#E0E0E0` |
| Footnote | Pale grey | `#CCCCCC` |

### Fonts
- Display: **Helvetica Neue Thin / Futura Light**, 24–36pt
- Body: **Helvetica Neue**, 11–13pt

### Layout
- Extreme negative space, thin circle outline centered
- Width-varying bars as visual hierarchy

### Avoid
- Any color, decorative illustration, crowded layouts

---

## 15. Editorial Magazine

**Mood**: Journalistic, narrative, sophisticated  
**Best For**: Annual reports, brand stories, long-form content decks

### Background
- White `#FFFFFF` with dark block `#1A1A1A`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Background | White | `#FFFFFF` |
| Dark block | Near-black | `#1A1A1A` |
| Rule line | Signal red | `#E63030` |
| Caption | Light grey | `#BBBBBB` |

### Fonts
- Title: **Playfair Display Italic**, 34–48pt
- Subhead: **Space Mono**, 8–9pt
- Body: **Georgia**, 11–13pt

### Layout
- Asymmetric two-zone: left 55% white, right 45% dark
- Red horizontal rule below title

### Avoid
- Symmetric layouts, sans-serif display fonts, full-bleed colors

---

## 16. Pastel Soft UI

**Mood**: Gentle, modern app, healthcare-friendly  
**Best For**: Healthcare, beauty, education startups, consumer apps

### Background
- Soft tricolor gradient: `#FCE4F3 → #E8F4FF → #F0FCE4`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Card fill | White semi-transparent | `#FFFFFF` @ 70% |
| Dot accent 1 | Blush pink | `#F9C6E8` |
| Dot accent 2 | Sky blue | `#C6E8F9` |

### Fonts
- Title: **Nunito Bold / DM Sans Medium**, 28–36pt
- Body: **Nunito / DM Sans**, 13–15pt

### Layout
- Floating frosted-white cards on gradient background
- Soft color-matched shadows

### Avoid
- Dark backgrounds, saturated colors, hard drop shadows

---

## 27. Architectural Blueprint

**Mood**: Precise, technical, professional  
**Best For**: Architecture, urban planning, engineering, spatial design

### Background
- Blueprint blue: `#0D2240`

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Background | Blueprint navy | `#0D2240` |
| Grid/lines | Blueprint cyan | `#64C8FF` |
| Title | Blueprint white | `#96DCFF` |

### Fonts
- All text: **Space Mono**, 8–13pt (monospace only)

### Layout
- Fine grid + major grid layered
- Geometric shapes with dimension lines
- Circular blueprint stamp

### Avoid
- Color or decorative elements, non-monospace fonts
