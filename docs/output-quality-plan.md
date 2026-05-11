# 교과서 MCP HWPX/PPTX 출력 품질 개선 계획

> 코워크 플러그인(hwpxskill, pptx-designer) 참조 기반
> 최우선 원칙: **기존 출력물 품질 절대 하락 금지**

---

## 0. 핵심 안전 원칙

### 절대 규칙
1. **기존 코드 삭제/수정 금지** — 모든 개선은 "추가(additive)" 방식으로만 진행
2. **기존 템플릿 9개 건드리지 않음** — worksheet, lesson-plan, assessment, pbl, discussion, report, gonmun, minutes, proposal
3. **기존 theme 기본값 변경 금지** — Dark Academia 테마는 그대로 유지, 새 테마는 별도 옵션으로 추가
4. **매 단계 완료 후 회귀 테스트** — 기존 기능으로 문서 생성하여 이전과 동일한 결과 확인
5. **함초롬바탕 + Malgun Gothic 기본값 유지** — 새 폰트는 선택적 옵션으로만 제공

### 회귀 테스트 체크리스트 (매 단계 필수)
```
[ ] HWPX: worksheet 템플릿으로 문서 생성 → 한글에서 정상 열림
[ ] HWPX: markdown 모드로 문서 생성 → 한글에서 정상 열림
[ ] HWPX: 표가 포함된 assessment 문서 생성 → 표 렌더링 정상
[ ] PPTX: 기본 테마로 5슬라이드 생성 → PowerPoint에서 정상 열림
[ ] PPTX: 표가 포함된 슬라이드 생성 → 표 렌더링 정상
[ ] PPTX: pptx-styles에서 Glassmorphism 스타일 적용 → 색상 정상 적용
```

---

## 1. 현재 상태 진단

### HWPX (export-hwpx.ts) — 현재 점수: 7/10
**잘 되어 있는 것 (건드리지 않을 것)**
- 9개 교육용 템플릿
- OWPML XML 직접 제어 (charPrIDRef, borderFillIDRef 세밀 스타일링)
- hp:linesegarray 자동 제거 (실전 버그 방지)
- 함초롬바탕 폰트 통일, 셀 마진 규격 (510/510/141/141)
- build_hwpx.py 파이프라인

**개선 가능한 것**
- tool description에 OWPML 스펙이 3000자+ 하드코딩 → AI 컨텍스트 낭비
- markdown 모드(kordoc) 품질이 template 모드 대비 현저히 낮음
- 생성 후 검증이 "VALID:" 마커 체크뿐 → 구조적 검증 부재
- 템플릿 채우기가 raw XML 전달 방식 → 실수 가능성 높음

### PPTX (export-pptx.ts) — 현재 점수: 6/10
**잘 되어 있는 것 (건드리지 않을 것)**
- 12개 교육특화 디자인 스타일 (pptx-styles.md)
- 교육 목적별 스타일 추천 매트릭스
- PptxGenJS 기반 안정적 생성
- HEX 코드, 폰트, anti-pattern 문서화

**개선 가능한 것**
- addText + 기본 addTable만 사용 → 차트(addChart) 완전 미지원
- "타이틀 바 + 불릿 리스트" 단일 레이아웃 → 단조로운 슬라이드
- Malgun Gothic 단일 폰트 → 제목/본문 구분 없음
- 마스터 슬라이드 미사용 → 일관성 부족

---

## 2. 개선 항목 상세

### Phase 1: 레퍼런스 분리 (안전도: ★★★★★)
> 코드 변경 없음. references/ 폴더에 파일 추가만.

**1-1. OWPML 컨벤션 레퍼런스 생성**
- 출처: 코워크 `hwpx-writer/references/owpml-spec.md` (5.5KB) + 교과서 export-hwpx.ts의 tool description 내 스펙 정보
- 생성 파일: `src/resources/owpml-conventions.md`
- 내용 구성:
  - OWPML 네임스페이스 (hp, hs, hh, hc, odf)
  - 폰트 단위 규칙 (1/100pt: 900=9pt, 1000=10pt, 1200=12pt)
  - 교과서 전용 charPrIDRef 매핑 (0=본문, 7=제목, 8=소제목, 9=볼드)
  - 교과서 전용 borderFillIDRef 매핑 (3=기본, 4=헤더회색, 5=강조파랑)
  - 표 최대 너비 42520, 셀 마진 510/510/141/141
  - 금지 패턴: 중첩 표, 래퍼 표, hp:linesegarray
- **위험도: 0** — 파일 추가만, 기존 코드 무변경

**1-2. PptxGenJS 코드 패턴 레퍼런스 도입**
- 출처: 코워크 `pptx-designer/references/pptxgen-code-patterns.md` (18.7KB)
- 생성 파일: `src/resources/pptxgen-patterns.md`
- 내용 구성:
  - addTable() 스타일 상수 및 헬퍼 함수
  - addChart() 6종 차트 패턴 (Bar, Line, Pie, Doughnut, Area, Radar)
  - addImage() 삽입 패턴
  - addShape() 배경/카드/구분선 패턴
  - 슬라이드 헬퍼 함수 (타이틀 바, 카드, 페이지 번호)
- 교과서 맥락 추가:
  - 교육자료에서 자주 쓰는 차트 유형별 예시 (성취도 Bar, 비율 Pie, 역량 Radar)
  - 12개 교육 스타일과 차트 색상 매핑
- **위험도: 0** — 파일 추가만, 기존 코드 무변경

**1-3. 슬라이드 레이아웃 가이드 생성**
- 출처: 코워크 `pptx-designer/references/guide.md`의 12 레이아웃 섹션
- 생성 파일: `src/resources/slide-layouts.md`
- 내용 구성:
  - 12개 레이아웃 정의 (Title, Title+Content, Two Column, Comparison, Statistics, Quote, Section Header, Three Column, Timeline, Process, Closing, Image Full)
  - 각 레이아웃의 ASCII 다이어그램
  - 교육 콘텐츠 유형 → 레이아웃 자동 매핑 규칙
  - 교과서 12개 디자인 스타일별 레이아웃 호환성
- **위험도: 0** — 파일 추가만, 기존 코드 무변경

---

### Phase 2: PPTX 기능 확장 (안전도: ★★★★☆)
> 기존 함수 수정 없음. 새 함수/옵션 추가만.

**2-1. addChart 지원 추가**
- 위치: `export-pptx.ts`
- 방법: 기존 `parseMarkdownToSlides()` 함수는 **그대로 유지**
- 새로 추가할 것:
  - `parseChartData()` 함수 — 마크다운 표를 차트 데이터로 변환
  - `renderChartSlide()` 함수 — SlideData에 chartType 필드가 있을 때만 실행
  - 지원 차트: Bar, Line, Pie (3종만 — 안정성 우선)
- 트리거 조건: 마크다운에 `<!-- chart:bar -->` 같은 힌트 주석이 있을 때만 차트 모드 활성화
- **기존 동작 보호**: 힌트 주석 없으면 100% 기존 로직 실행

**2-2. 다중 레이아웃 지원 추가**
- 위치: `export-pptx.ts`
- 방법: 기존 단일 레이아웃 렌더링은 **그대로 유지** (default로 동작)
- 새로 추가할 것:
  - `selectLayout()` 함수 — 슬라이드 콘텐츠 분석하여 레이아웃 제안
  - `renderTwoColumnSlide()` — 비교 콘텐츠용
  - `renderStatisticsSlide()` — 수치 강조용
  - `renderQuoteSlide()` — 인용문용
- 활성화 조건: theme 객체에 `autoLayout: true` 옵션이 있을 때만
- **기존 동작 보호**: autoLayout 미지정 시 현재와 100% 동일하게 동작

**2-3. 타이포그래피 옵션 확장**
- 위치: `export-pptx.ts`의 theme 타입 정의
- 방법: 기존 theme 기본값은 **절대 변경하지 않음**
- 새로 추가할 것:
  - theme에 `titleFont`와 `bodyFont`를 분리 지정할 수 있는 옵션
  - `fontPreset` 옵션: `"pretendard"` (Pretendard+명조), `"noto"` (Noto Sans KR+Noto Serif KR)
  - fontPreset 미지정 시 기존 Malgun Gothic 유지
- pptx-styles.md 업데이트: 각 스타일에 권장 fontPreset 추가
- **기존 동작 보호**: 새 옵션 미사용 시 Malgun Gothic 그대로

---

### Phase 3: HWPX 품질 강화 (안전도: ★★★☆☆)
> 신중하게 진행. 각 항목 독립 적용 가능.

**3-1. Markdown 모드 품질 개선**
- 현재 문제: kordoc `markdownToHwpx()`의 결과물이 불안정
- 개선 방법: **kordoc 호출 전에 마크다운 정제 단계 삽입**
  - `preprocessMarkdown()` 함수 추가
  - 표 정규화 (파이프 정렬, 빈 셀 처리)
  - 제목 레벨 정규화 (H1→hp:p with charPrIDRef=7)
  - 빈 줄 정리, 특수문자 이스케이프
- 기존 kordoc 호출 코드는 그대로, **앞에** 전처리만 추가
- **롤백 방법**: preprocessMarkdown 호출 한 줄만 주석 처리하면 원복

**3-2. 생성 후 검증 강화**
- 현재: "VALID:" 마커만 체크
- 추가할 것:
  - `validateHwpxStructure()` 함수
  - ZIP 구조 확인 (Content_Types.xml, _rels/ 존재 여부)
  - section XML의 well-formedness 체크
  - 금지 패턴 검출 (중첩 표, hp:linesegarray 잔존)
- 실행 시점: 기존 "VALID:" 체크 **이후** 추가 실행
- 검증 실패 시: 경고 메시지 반환 (기존 파일은 그대로 전달 — 차단하지 않음)
- **기존 동작 보호**: 검증은 정보 제공용, 기존 출력 차단하지 않음

**3-3. fill_template 패턴 도입 (선택적)**
- 코워크 패턴: python-hwpx의 `find_and_replace` 고수준 API 활용
- 적용 방법: 기존 raw XML 전달 방식은 유지하되, **별도 경로** 추가
  - 새 파라미터: `templateMode: "fill"` 옵션
  - `fill` 모드: 플레이스홀더 기반 ({{title}}, {{content}}, {{date}})
  - 기존 모드: `templateMode` 미지정 시 현재 raw XML 방식 그대로
- **이 항목은 python-hwpx 의존성 추가 필요 → 별도 검토 후 진행**

---

### Phase 4: 마스터 슬라이드 도입 (안전도: ★★★☆☆)
> Phase 2 완료 후 진행. 가장 체감 효과 큰 개선.

**4-1. defineSlideMaster 적용**
- PptxGenJS의 `pptx.defineSlideMaster()` API 활용
- 마스터에 포함할 것:
  - 슬라이드 번호 (우하단, 8pt, 회색)
  - 배경색 (theme.contentBg)
  - 타이틀 바 영역 (theme.titleBg, 고정 높이)
- 활성화 조건: theme에 `useMaster: true` 옵션이 있을 때만
- **기존 동작 보호**: useMaster 미지정 시 현재 개별 스타일링 방식 유지

**4-2. 교과서 브랜딩 프리셋**
- 새 파일: `src/resources/teacher-brand.md`
- 내용: 교과서 CI 색상, 로고 위치, 기본 폰트 조합
- theme에서 `brand: "teacher"` 지정하면 자동 적용
- **선택적 기능 — 미지정 시 기존 동작 유지**

---

## 3. 실행 순서 및 타임라인

```
Phase 1 (레퍼런스 분리) ──→ 회귀테스트 ──→ Phase 2 (PPTX 확장)
     │                                          │
     │ 코드 변경 없음                             │ 새 함수 추가만
     │ 위험도: 0                                  │ 위험도: 낮음
     ▼                                          ▼
  즉시 적용                                   회귀테스트
                                                │
                                                ▼
                              Phase 3 (HWPX 강화) ──→ 회귀테스트
                                   │
                                   │ 전처리 삽입 + 검증 추가
                                   │ 위험도: 중간
                                   ▼
                              Phase 4 (마스터 슬라이드)
                                   │
                                   │ 선택적 옵션으로만 동작
                                   │ 위험도: 중간
                                   ▼
                                 완료
```

### Phase별 예상 변경 파일

**Phase 1** (추가만)
- 새 파일: `src/resources/owpml-conventions.md`
- 새 파일: `src/resources/pptxgen-patterns.md`
- 새 파일: `src/resources/slide-layouts.md`

**Phase 2** (추가 + 소폭 수정)
- 수정: `src/tools/export-pptx.ts` — 새 함수 추가, 기존 함수 내부 분기 추가
- 수정: `src/resources/pptx-styles.md` — fontPreset 권장 정보 추가

**Phase 3** (추가 + 소폭 수정)
- 수정: `src/tools/export-hwpx.ts` — 전처리 함수 추가, 검증 함수 추가
- (선택) 새 파일: `scripts/fill_template.py`

**Phase 4** (추가 + 소폭 수정)
- 수정: `src/tools/export-pptx.ts` — defineSlideMaster 호출 추가
- 새 파일: `src/resources/teacher-brand.md`

---

## 4. 품질 하락 방지 안전장치

### 원칙: "옵트인(Opt-in) 전략"
모든 새 기능은 **명시적으로 활성화해야만 동작**합니다.

| 새 기능 | 활성화 조건 | 미지정 시 동작 |
|---------|------------|---------------|
| 차트 슬라이드 | `<!-- chart:bar -->` 주석 | 기존 불릿 리스트 |
| 다중 레이아웃 | `autoLayout: true` | 기존 단일 레이아웃 |
| Pretendard 폰트 | `fontPreset: "pretendard"` | Malgun Gothic |
| 마스터 슬라이드 | `useMaster: true` | 개별 스타일링 |
| 마크다운 전처리 | 항상 적용 (단, 롤백 가능) | - |
| 구조 검증 | 항상 실행 (단, 차단 안 함) | - |
| fill_template | `templateMode: "fill"` | 기존 raw XML |

### 회귀 테스트 자동화
```bash
# 각 Phase 완료 후 실행할 테스트 스크립트
# test-regression.sh

echo "=== HWPX 회귀 테스트 ==="
# 1. worksheet 템플릿 생성
node test-hwpx-worksheet.js
# 2. markdown 모드 생성
node test-hwpx-markdown.js
# 3. 표 포함 assessment 생성
node test-hwpx-assessment-table.js

echo "=== PPTX 회귀 테스트 ==="
# 4. 기본 테마 슬라이드 생성
node test-pptx-default.js
# 5. 표 슬라이드 생성
node test-pptx-table.js
# 6. 스타일 적용 생성
node test-pptx-style.js

echo "=== 파일 무결성 ==="
# 7. HWPX ZIP 구조 확인
python3 -c "import zipfile; z=zipfile.ZipFile('test.hwpx'); print(z.namelist())"
# 8. PPTX ZIP 구조 확인
python3 -c "import zipfile; z=zipfile.ZipFile('test.pptx'); print(z.namelist())"
```

---

## 5. 코워크 참조 출처 매핑

| 교과서 개선 항목 | 코워크 출처 파일 | 차용 범위 |
|----------------|----------------|----------|
| OWPML 레퍼런스 | hwpx-writer/references/owpml-spec.md | 구조 참고, 교과서 전용값 추가 |
| PptxGenJS 패턴 | pptx-designer/references/pptxgen-code-patterns.md | addChart, addShape 패턴 직접 활용 |
| 슬라이드 레이아웃 | pptx-designer/references/guide.md | 12 레이아웃 정의 + ASCII 다이어그램 |
| 타이포그래피 | pptx-designer/SKILL.md | Pretendard+명조 조합 컨셉 |
| 문서 검증 | hwpx-writer/SKILL.md | validate.py, unpack.py 패턴 |
| fill_template | hwpx-writer/references/guide.md | 플레이스홀더 패턴 컨셉 |
| 마스터 슬라이드 | pptx-designer/references/guide.md | defineSlideMaster 패턴 |

---

## 6. 성공 기준

### 정량 기준
- Phase 1 완료 후: export-hwpx.ts tool description 사이즈 50% 이상 감소
- Phase 2 완료 후: PPTX에서 차트 슬라이드 생성 가능 (Bar, Line, Pie)
- Phase 2 완료 후: 슬라이드 레이아웃 4종 이상 자동 선택 가능
- Phase 3 완료 후: markdown 모드 HWPX의 표 렌더링 오류율 50% 이상 감소

### 정성 기준
- 기존 사용자가 아무 옵션 없이 사용해도 **이전과 100% 동일한 결과**
- 새 옵션을 사용하면 **눈에 띄게 향상된 결과**
- AI가 자동으로 적절한 차트/레이아웃을 선택하는 "스마트" 모드 동작
