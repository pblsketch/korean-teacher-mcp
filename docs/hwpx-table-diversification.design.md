# HWPX Table Diversification Design Document

> **Summary**: export_hwpx 도구가 생성하는 활동지 표를 "균등폭 + 회색 헤더 + 단순 데이터행" 단일 패턴에서 벗어나, 한국 교육 활동지에 맞는 6대 표 패턴(루브릭·PBL 단계·토의 T-Chart·지도안 세안·읽기 인용·체크리스트)을 표현하기 위한 프리셋 디렉티브 + GFM 폭 비율 확장 아키텍처
>
> **Project**: korean-teacher-mcp
> **Feature**: hwpx-table-diversification
> **Author**: 교과서 AI 협업 프로젝트
> **Date**: 2026-04-13
> **Status**: Draft
> **Related**: [korean-teacher-mcp.design.md](./korean-teacher-mcp.design.md), [teacher-output-quality-plan.md](./teacher-output-quality-plan.md)

---

## 1. Background & Problem

### 1.1 현행 한계

[src/tools/export-hwpx.ts:247-291](../src/tools/export-hwpx.ts#L247-L291) `buildOwpmlTable()`이 markdown 표를 OWPML로 변환할 때 다음과 같이 단순화한다.

| 항목 | 현행 동작 | 한계 |
| --- | --- | --- |
| 열 폭 | `42520 / colCnt` 균등 분할 | 라벨열 좁게/응답열 넓게 같은 비대칭 불가 |
| 셀 스타일 | 헤더 1행 회색(=4), 데이터 단일(=3) | 강조셀(=5)·구분선(=6)·zebra·라벨열 음영 표현 불가 |
| 셀 병합 | `colSpan/rowSpan=1` 고정 | 지도안 단계 rowSpan, 인용 박스 colSpan 전체 불가 |
| 셀 내용 | `<hp:run>` 1개 | 다단락(T 발문/S 예상반응), 체크박스, 빈 응답란 불가 |
| 행 높이 | 일괄 2400 | 응답란 고정 4800·6000 불가 |

44개 템플릿 셀 모두 병합 0%, borderFillIDRef 4·3 두 종류만 사용 — Explore 에이전트가 확인.

### 1.2 문제의 영향

PBL 평가 루브릭·토의토론 발언 기록표·차시 지도안 세안 등 교과서 데모 핵심 산출물이 모두 한국 교육 표준 형태와 거리가 멀다. 5월 데모에서 "활동지 표가 너무 단순하다"는 사용자 피드백 발생.

### 1.3 설계 목표

1. **6대 활동지 표 패턴**(루브릭·PBL 단계·T-Chart·지도안·인용+분석·체크리스트)을 LLM이 짧은 입력으로 표현
2. **기존 markdown 표 100% 후방호환** — 디렉티브 없는 호출은 동일 결과
3. **OWPML 무결성 보존** — 폭 합 42520, rowCnt/colCnt 정합, 한컴오피스 열기 검증
4. **신규 코드 표면 최소화** — `expandMdTablesInSectionXml` 라인 스캐너 위에 디렉티브 1줄 + 셀 prefix만 추가

### 1.4 비목표

- JSON 표 블록 입력 (LLM 토큰 30~50% 증가, OWPML 표현력보다 빈약)
- 별도 MCP 도구 분리 (LLM이 두 호출 동기화하는 부담)
- 중첩 표·이미지 셀·외부 차트 (CLAUDE.md 규칙 위반)

---

## 2. Architecture

### 2.1 전체 흐름

```
LLM section_xml
    │  (markdown 표 + <!-- table:rubric --> 디렉티브 + @@/>> prefix)
    ▼
expandMdTablesInSectionXml()  ── export-hwpx.ts:299
    │  ① 라인 스캔
    │  ② parseDirective() → PresetCall | null
    │  ③ tryParseMdTable()  → MdTable
    ▼
expandPreset(PresetCall, MdTable) → TableSpec   (신규 IR)
    │
    ▼
buildOwpmlTableV2(TableSpec) → OWPML hp:tbl 문자열   (신규 단일 빌더)
    │  ・폭 합 42520 검증
    │  ・rowSpan sentinel 처리
    │  ・borderFillIDRef/charPrIDRef 매핑
    ▼
section_xml (디렉티브·markdown 자리에 hp:tbl 삽입)
    │
    ▼
build_hwpx.py → .hwpx
```

### 2.2 신규 모듈 구조

```
src/tools/
  export-hwpx.ts                  (기존, 라인 스캐너만 확장)
  hwpx-table/                     (신규)
    types.ts                      (TableSpec, CellStyle, PresetCall)
    builder.ts                    (buildOwpmlTableV2)
    directive.ts                  (parseDirective, expandPreset)
    presets/
      rubric.ts
      lesson-plan.ts
      discussion-log.ts
      kwl.ts
      checklist.ts
      concept-map.ts
    index.ts                      (re-export)
```

### 2.3 핵심 타입 (IR)

```ts
// src/tools/hwpx-table/types.ts

export type CellStyle =
  | 'header'    // borderFillIDRef=4, charPrIDRef=9, vertAlign=CENTER
  | 'label'     // borderFillIDRef=4, charPrIDRef=8 (소제목 볼드)
  | 'emphasis'  // borderFillIDRef=5 (연청색), charPrIDRef=9
  | 'data'      // borderFillIDRef=3, charPrIDRef=0
  | 'blank';    // borderFillIDRef=3, charPrIDRef=0, 빈 응답란 (rowHeight 확장)

export interface TableColumn {
  weight: number;              // 합 = 1.0 (또는 정수면 자동 정규화)
  align?: 'left' | 'center' | 'right';
}

export interface TableCell {
  text: string;                // 줄바꿈 \n → 다단락 hp:p
  style?: CellStyle;           // 기본 'data'
  colSpan?: number;            // 기본 1
  rowSpan?: number;            // 기본 1
}

export interface TableSpec {
  cols: TableColumn[];
  rows: (TableCell | null)[][]; // null = 상위 rowSpan에 가려진 자리
  rowHeights?: number[];        // 미지정 시 2400, blank 셀이 있는 행은 자동 4800
}

export interface PresetCall {
  name: 'rubric' | 'lesson-plan' | 'discussion-log' | 'kwl' | 'checklist' | 'concept-map';
  options: Record<string, string>;  // cols, weights, align 등
}
```

### 2.4 디렉티브 구문

**프리셋 호출 (의미적 80%)**:
```
<!-- table:rubric cols="준거,수준4,수준3,수준2,수준1" weights="28,18,18,18,18" -->
| 준거 | 매우우수 | 우수 | 보통 | 미흡 |
| --- | --- | --- | --- | --- |
| 내용이해 | … | … | … | … |
```

**GFM 폭 비율 확장 (탈출구 20%)**:
```
| 단계 | 교사활동 | 학생활동 | 자료 |
| :---:1.0fr | ---:3.0fr | ---:3.0fr | :---:1.0fr |
| 도입 | … | … | PPT |
```
- `:---:` / `:---` / `---:` → align center/left/right
- `Nfr` → 폭 비율 (기본 1.0fr 균등). 합산 후 42520 비례 분배

**셀 prefix (행 단위 명시)**:
```
| @@핵심 개념 | >>colSpan=3 정의                  | (생략) | (생략) |
| ^^rowSpan=2 도입 | T: 발문\nS: 예상반응 | … | PPT |
```
- `@@` → emphasis 스타일 (연청색)
- `>>colSpan=N` / `^^rowSpan=N` → 명시적 병합. 가려진 자리는 `(생략)` 또는 빈 문자열로 표시 (파서가 자동 null sentinel 변환)
- 셀 내 `\n` → 다단락
- **prefix 우선순위**: `^^rowSpan` → `>>colSpan` → `@@` 순으로 한 셀에 중첩 가능. 예: `^^rowSpan=2 >>colSpan=2 @@핵심`. 파서는 셀 첫 토큰부터 좌→우로 소비.
- **escape 규칙**: 본문에서 `@@` `>>` `^^` 자체를 표시하려면 첫 위치에 `\` 추가 (`\@@`). LLM 신뢰성이 낮으므로 Phase 2 종료 시 5회 샘플 출력으로 escape 누락률 측정.

**디렉티브 배치 규칙 (필수)**:
- 디렉티브 주석 `<!-- table:NAME ... -->` 은 반드시 **블록 형제 위치**(상위 `<hp:p>`/`<hp:tbl>` 와 같은 레벨)에 배치.
- `<hp:t>` 내부, `<hp:run>` 내부에 두면 OWPML 파서가 텍스트로 렌더링되거나 무시되어 깨짐.
- `parseDirective`는 디렉티브 라인의 앞 라인이 닫는 태그(`</hp:p>`, `</hs:sec>`)이거나 빈 줄이거나 다른 디렉티브일 때만 유효 처리. 그 외는 경고 후 원본 보존.

### 2.5 빌더 핵심 알고리즘

```ts
function buildOwpmlTableV2(spec: TableSpec): string {
  // 1. 폭 분배: round(42520 * weight / sum), 마지막 열이 잔차 흡수
  const widths = distributeWidths(spec.cols.map(c => c.weight), 42520);
  console.assert(widths.reduce((a, b) => a + b, 0) === 42520);

  // 2. rowCnt/colCnt: 논리 행/열 수 (병합 무관)
  const rowCnt = spec.rows.length;
  const colCnt = spec.cols.length;

  // 3. 행 높이: blank 셀 포함 행은 max(4800, rowHeights[r])
  const heights = computeRowHeights(spec);

  // 4. 셀 렌더: null sentinel 자리는 skip (rowSpan에 가려진 자리)
  //    - cellSz.width = sum of spanned widths
  //    - textWidth = width - 510*2  (음수 시 throw)
  //    - borderFillIDRef / charPrIDRef = STYLE_MAP[cell.style]
  //    - 다단락: text.split('\n').map(line => <hp:p>...)

  // 5. <hp:tbl> 래퍼: rowCnt/colCnt/borderFillIDRef=3/cellSpacing=0
  //    sz width=42520, height = sum(heights)
}
```

### 2.6 스타일 매핑

| CellStyle | borderFillIDRef | charPrIDRef | paraPrIDRef | vertAlign | 비고 |
| --- | --- | --- | --- | --- | --- |
| header | 4 (회색) | 9 (10pt 볼드) | 21 | CENTER | 헤더 행. 다행이어도 CENTER 유지 |
| label | 4 (회색) | 8 (12pt 소제목 볼드) | 21 | CENTER | 좌측 라벨열 |
| emphasis | 5 (연청색) | 9 (볼드) | 21 | CENTER | 인용 박스, 강조 |
| data | 3 (기본) | 0 (10pt 본문) | 21 | TOP | 일반 데이터 |
| blank | 3 | 0 | 21 | TOP | 빈 응답란 (rowHeight 자동 ≥4800) |

**paraPrIDRef 일관성**: 기존 [export-hwpx.ts:266](../src/tools/export-hwpx.ts#L266)이 모든 셀에 `paraPrIDRef="21"` 고정 사용 중. 다단락 셀의 모든 `hp:p` 도 동일한 값을 쓴다 (서로 다른 paraPr 혼용 시 한글 열기 실패 사례 있음).

`borderFillIDRef=6`(구분선)은 Phase 2의 zebra·점선 응답란 확장 시 신규 borderFill 정의 추가 후 사용.

---

## 3. Preset Catalog

각 프리셋은 `expandPreset(call, body)` 안에서 `TableSpec`을 생성한다. body 행 수에 무관하게 동작.

### 3.1 rubric — PBL 평가 루브릭

- **호출**: `<!-- table:rubric cols="준거,수준4,3,2,1" weights="28,18,18,18,18" -->`
- **변환**: 1열 = label, 2~N열 = data, 헤더행 = header
- **typical 5×5 구조**: 평가 준거 4행 + 가중치 옵션
- **확장**: `weights` 미지정 시 첫 열 28%, 나머지 균등

### 3.2 lesson-plan — 차시 지도안 세안

- **호출**: `<!-- table:lesson-plan cols="단계,교사활동,학생활동,자료" weights="14,36,36,14" -->`
- **변환**: 1·4열 = emphasis, 2·3열 = data
- **다단락 셀**: 교사활동에 `T: 발문\nS: 예상반응` 작성 시 `\n` 분리
- **rowSpan**: 단계 열에 `^^rowSpan=3 도입` 표기로 도입/전개/정리 묶기

### 3.3 discussion-log — 토의 기록표

- **호출**: `<!-- table:discussion-log cols="역할,발언,근거" weights="15,55,30" -->`
- **변환**: 1열 = label, 2·3열 = blank (응답란, rowHeight 자동 4800)
- **확장**: T-Chart 변형은 옵션 `mode="t-chart"`로 2분할 4열 자동 생성

### 3.4 kwl — KWL/PMI 사고 정리표

- **호출**: `<!-- table:kwl cols="K,W,L" -->` (균등)
- **변환**: 헤더만 강조, 본문은 blank (rowHeight 6000)
- **변형**: `cols="P,M,I"` → PMI

### 3.5 checklist — 자기점검표

- **호출**: `<!-- table:checklist cols="항목,상,중,하" weights="64,12,12,12" -->`
- **변환**: 1열 = label, 점수열 = data + center align
- **확장**: 옵션 `checkbox="true"` 시 점수열에 □ 자동 삽입

### 3.6 concept-map — 핵심개념 정리

- **호출**: `<!-- table:concept-map cols="개념,정의,예시" weights="20,45,35" -->`
- **변환**: 1열 = emphasis, 2·3열 = data

---

## 4. Backward Compatibility

### 4.1 호환성 보장

- 디렉티브 없는 markdown 표 → 기존 `tryParseMdTable` → `buildOwpmlTable` (Phase 1에서 내부적으로 `TableSpec`으로 변환 후 `buildOwpmlTableV2` 호출하도록 위임). 외부 동작 100% 동일.
- 사용자가 hp:tbl XML을 직접 작성한 경우 라인 스캐너가 인식하지 않으므로 무영향.
- `hwpxskill-templates/` XML 템플릿은 빌드 후 동일 출력.

### 4.2 회귀 테스트

- `scripts/test-hwpx.ts`에 기존 markdown 표 케이스 5종 추가 (균등 2·3·4·5·6열)
- 기존 `test-output/t6-hwpx.hwpx`, `t6b.hwpx` 바이트 동일성 확인 (실제 zip 내부 XML diff)

---

## 5. Roadmap

### Phase 1 — 최소가치 (3일)

1. `src/tools/hwpx-table/` 모듈 생성 (`types.ts`, `builder.ts`, `directive.ts`)
2. `buildOwpmlTableV2` 구현 + `distributeWidths`·`computeRowHeights` 단위 테스트
3. 기존 `buildOwpmlTable`을 `TableSpec` 변환 위임으로 전환 (회귀 확인)
4. 프리셋 3종: `rubric`, `lesson-plan`, `discussion-log`
5. `parseDirective` 라인 스캐너 통합 (배치 규칙 검증 포함)
6. **Phase 1 scope 명확화**: 다단락(`\n` 분리)은 지원, **셀 prefix(`@@`/`>>`/`^^`)는 raw 텍스트로 통과시키고 경고만 출력**. prefix 정식 파싱은 Phase 2. 이로써 기존 markdown 표 위임 전환 시 prefix 충돌 없음.
7. **Acceptance**: 위 3 프리셋으로 PBL/지도안/토의 활동지 .hwpx 생성 → 한컴오피스에서 정상 열기

### Phase 2 — 확장 (2일)

1. 나머지 프리셋 3종: `kwl`, `checklist`, `concept-map`
2. GFM 폭 비율 확장 (`Nfr`, 정렬 표기) — 디렉티브 없는 markdown 표에서도 활성
3. 셀 prefix 파서: `@@`, `>>colSpan=N`, `^^rowSpan=N`, `\n` 다단락
4. 신규 borderFill 정의 (점선 응답란용) — `hwpxskill-templates/base/header.xml`에 추가
5. **Acceptance**: 6대 패턴 모두 한 .hwpx에 통합한 종합 샘플 생성

### Phase 3 — 통합 (1일)

1. `src/prompts/` 중 PBL·토의·지도안·루브릭 4종 프롬프트가 새 디렉티브를 출력하도록 갱신
2. `src/resources/owpml-conventions.md` 에 프리셋 6종 + GFM 확장 사용법 추가
3. `.claude/skills/teacher-pbl`, `teacher-rubric` 등 관련 스킬 가이드 갱신
4. **Acceptance**: 사용자가 자연어로 "PBL 루브릭 만들어줘" 요청 시 새 디렉티브가 자동 출력

---

## 6. Testing Strategy

### 6.1 단위 테스트 (`scripts/test-hwpx.ts` 확장)

| 케이스 | 검증 내용 |
| --- | --- |
| `distributeWidths([28,18,18,18,18], 42520)` | 합 = 42520, 마지막 잔차 흡수 |
| `distributeWidths([1,1,1], 42520)` | 정수 정규화, 14173/14173/14174 |
| `buildOwpmlTableV2` 폭 음수 | `weight=0.001` 시 textWidth ≤ 0 → throw |
| rowSpan sentinel | `null` 자리 셀 skip, 실제 cellSz.height 합산 정확 |
| colSpan 폭 합 | `colSpan=3` 셀의 `cellSz.width` = 해당 3개 열 폭 합 |
| 다단락 셀 | `\n` 분리 후 hp:p 여러 개 생성, 모두 paraPrIDRef=21 |
| 스타일 렌더 검증 | style별 borderFillIDRef/charPrIDRef 문자열 grep으로 확인 (header=4/9, emphasis=5/9, data=3/0) |
| 한글 XML escape | `<` `>` `&` `"` 포함 텍스트 안전 escape, 한글 깨짐 없음 |
| sentinel 변환 | 본문 `(생략)` `||` 빈 셀 모두 null로 변환 |
| 디렉티브 미존재 | 기존 균등 분할 fallback |
| 디렉티브 잘못된 위치 | `<hp:t>` 내부 디렉티브 → 경고 + 원본 보존 |

### 6.2 통합 테스트

- Phase 1 종료 시: PBL 루브릭 + 지도안 + 토의 기록표 통합 .hwpx 생성, 한컴오피스 2024로 열어 시각 확인
- ZIP 무결성: 기존 `validateHwpxStructure` 통과
- linesegarray 잔존 0건 (이미 build 단계에서 제거)

### 6.3 LLM 출력 검증 (Phase 3)

- 4종 프롬프트별 5회 샘플 출력 → 디렉티브 사용률 ≥ 80%
- 폭 합 42520 위반 0건

---

## 7. Risks & Mitigations

| 위험 | 영향 | 완화 |
| --- | --- | --- |
| 폭 정수 반올림으로 합 ≠ 42520 | 한글 파일 거부 | `distributeWidths` 마지막 열 잔차 흡수 + assert |
| rowSpan 가려진 자리 누락 | 한글 파일 거부 | IR에서 명시적 `null` sentinel, 빌더 단위 테스트 강제 |
| `rowCnt`/`colCnt` 누락 (CLAUDE.md 규칙) | 한글 열기 실패 | 빌더가 무조건 출력, 테스트 grep 검증 |
| 셀 prefix가 본문 텍스트와 충돌 | 의도치 않은 병합 | prefix는 행의 첫 문자만 인식, 본문 `@@`는 escape `\@@` 지원. LLM escape 누락률을 Phase 2 종료 시 5회 샘플로 측정, 5% 초과 시 디렉티브 옵션으로 강제 비활성 |
| 프리셋 카탈로그가 너무 좁음 | 신규 활동지 패턴 등장 시 fallback 필요 | GFM 폭 비율 확장이 탈출구 역할 |
| LLM이 새 디렉티브를 잘못 출력 | 표가 깨짐 | `parseDirective` 실패 시 경고와 함께 균등 fallback (실패 안 함) |
| header 셀이 다행일 때 vertAlign 불일치 | 헤더와 데이터 정렬 어긋남 | header/label/emphasis = CENTER, data/blank = TOP 고정. 단위 테스트에서 grep 검증 |
| `borderFillIDRef=6`(점선) 신규 정의 미동기화 | 일부 템플릿에서만 깨짐 | Phase 2 진입 전 `hwpxskill-templates/base/header.xml` 1곳에만 정의하고 모든 템플릿이 base를 상속하는지 확인. 미상속 템플릿 발견 시 일괄 패치 PR |
| 디렉티브 주석이 `<hp:t>` 내부에 들어감 | 표가 텍스트로 렌더 | `parseDirective`가 앞 라인 컨텍스트 검사, 위반 시 경고 |

---

## 8. Open Questions

1. **borderFillIDRef=6(점선) 신규 정의 위치** — `header.xml` 에 추가 시 모든 템플릿 일괄 적용 가능. Phase 2 착수 전 결정 필요.
2. **셀 prefix `^^rowSpan` 가려진 자리 표기** — `(생략)` vs 빈 셀 vs 명시적 `^^` 어느 쪽이 LLM이 일관되게 출력하기 좋은가? Phase 1 종료 후 LLM 5회 샘플로 결정.
3. **프리셋 옵션 검증 엄격도** — 알 수 없는 옵션 키가 들어오면 무시 vs 경고 vs 실패? 기본은 "무시 + stderr 경고"로 시작.

---

## 9. Definition of Done

- [ ] Phase 1·2·3 acceptance 모두 충족
- [ ] 기존 markdown 표 회귀 0건 (test-output 기존 .hwpx ZIP 내부 XML diff = 0)
- [ ] 한컴오피스 2024에서 6대 패턴 .hwpx 정상 열기·인쇄 확인
- [ ] `src/resources/owpml-conventions.md` 사용법 문서화
- [ ] PBL/지도안/토의/루브릭 프롬프트 4종 갱신
- [ ] CLAUDE.md "표 작성 규칙" 절에 새 문법 추가
- [ ] 단위 테스트 6.1 표 12케이스 100% 통과
- [ ] LLM 출력 검증 (Phase 3): 4종 프롬프트 × 5회 샘플 → 디렉티브 사용률 ≥ 80%, 폭 합 위반 0건, prefix escape 누락률 ≤ 5%
- [ ] 빌드 성능: 표 20개 포함 section 빌드 시간 ≤ 2초 (`scripts/test-hwpx.ts` 측정)
