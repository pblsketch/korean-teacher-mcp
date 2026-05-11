# OWPML Conventions — HWPX(한글) 문서 규격 레퍼런스

> export_hwpx 도구 사용 시 참조하는 OWPML(Open Word Processor Markup Language) 규격 문서입니다.
> 한글(HWP) 문서 포맷의 XML 구조를 한국 교육 자료 생성 맥락에 맞게 정리했습니다.

---

## 1. OWPML 네임스페이스

| prefix | URI | 역할 |
|--------|-----|------|
| `hp` | paragraph | 문단, 런, 텍스트, 표, 이미지 등 본문 요소 |
| `hs` | section | 섹션 및 그 속성 (`hs:sec`, `hs:secPr`) |
| `hh` | head | 메타 정보, 폰트/문자속성/단락속성/스타일/테두리 정의 (header.xml) |
| `hc` | core | 색상, 치수, 좌표 등 공통 기본 타입 |
| `odf` | manifest | content-type, relationships 선언 (META-INF) |

### 주요 엘리먼트 (hp 네임스페이스)
- `hp:p` — 단락
- `hp:run` — 인라인 런 (동일 문자속성 적용 구간)
- `hp:t` — 실제 텍스트 노드
- `hp:tbl` — 표
- `hp:tr` / `hp:tc` — 행 / 셀
- `hp:subList` — 셀 내부 컨텐츠 컨테이너
- `hp:ctrl` / `hp:secPr` — 컨트롤 및 섹션 속성

---

## 2. 스타일 ID 매핑

export-hwpx.ts의 tool description과 build_hwpx.py가 공유하는 고정값입니다.
**반드시 아래 ID를 그대로 사용**하세요. 변경하면 header.xml에 사전 정의된 스타일이 맞지 않아 깨짐이 발생합니다.

### 문자 속성 (charPrIDRef)
| ID | 용도 | 스펙 |
|----|------|------|
| `0` | 본문 | 10pt 함초롬바탕 |
| `1` | 본문 보조 | 10pt 함초롬돋움 |
| `7` | 제목 | 16pt 함초롬바탕 볼드 |
| `8` | 소제목 | 12pt 함초롬바탕 볼드 |
| `9` | 강조 | 10pt 함초롬바탕 볼드 |

### 테두리/배경 (borderFillIDRef)
| ID | 용도 | 스펙 |
|----|------|------|
| `3` | 기본 표 테두리 | 검정 실선 0.12mm, 4면 |
| `4` | 표 헤더 셀 | 검정 실선 + 회색 배경 `#D9D9D9` |
| `5` | 강조 셀 | 검정 실선 + 연청색 배경 `#DAEEF3` |
| `6` | 구분선 | 하단만 실선 |

**사용 규칙**
- `borderFillIDRef="4"` (회색) → 표의 **첫 번째 행(헤더)에만** 사용
- 데이터 행은 **전부** `borderFillIDRef="3"`
- `borderFillIDRef="5"` (연청색) → 성취기준/주제 등 시각적 강조가 필요한 셀

---

## 3. 표(Table) 규격

### 치수 규격
| 항목 | 값 | 단위 |
|------|-----|------|
| 인쇄 가능 폭 (max) | `42520` | HWPUNIT |
| 페이지 왼쪽 여백 | `8504` | HWPUNIT |
| 페이지 오른쪽 여백 | `8504` | HWPUNIT |
| 셀 margin left/right | `510` | HWPUNIT (고정) |
| 셀 margin top/bottom | `141` | HWPUNIT (고정) |

### 열 너비 계산
- 전체 표 폭 ≤ 42520
- 모든 행의 셀 폭 합 = 표 전체 폭 (`hp:sz width`)
- 셀 내부 `textWidth` = `cellSz.width` − `cellMargin.left` − `cellMargin.right`
- 예: `cellSz.width=8504` → `textWidth = 8504 − 510 − 510 = 7484`

### 필수 속성
- `hp:tbl` 에 **반드시** `rowCnt`, `colCnt` 속성 포함 — 누락 시 한글에서 파일 열기 실패
- `hp:tc` 는 `borderFillIDRef` 필수
- `hp:cellAddr colAddr` / `rowAddr` 필수
- `hp:cellSpan colSpan` / `rowSpan` 필수 (병합 없어도 `1`)

---

## 4. 폰트 규격

### 기본 폰트 (통일)
**함초롬바탕** — 본문, 제목, 소제목, 강조 모두 동일

### 크기 단위
한글은 크기를 `1/100 pt` 단위로 지정:
| 의도 크기 | 값 |
|----------|-----|
| 9pt | `900` |
| 10pt (본문) | `1000` |
| 12pt (소제목) | `1200` |
| 16pt (제목) | `1600` |

### header.xml의 hh:fontface 선언
모든 템플릿은 `hh:fontface` 에 함초롬바탕을 사전 등록합니다. 섹션 XML에서 `charPrIDRef` 만 사용하면 자동으로 해당 폰트가 적용됩니다.

---

## 5. 금지 패턴 (반드시 회피)

### ❌ 중첩 표 (nested table)
```xml
<!-- 금지 -->
<hp:tbl>
  <hp:tc>
    <hp:tbl>  <!-- ← 셀 안에 또 표 -->
```
한글에서 레이아웃 붕괴, 인쇄 시 잘림 발생.

### ❌ 래퍼 표 (wrapper table)
```xml
<!-- 금지: 문서 전체를 하나의 표로 감싸기 -->
<hp:tbl>
  <hp:tc>
    <hp:p>제목</hp:p>
    <hp:p>본문</hp:p>
    ...
```
제목/본문은 **독립 단락(hp:p)** 으로 작성.

### ❌ hp:linesegarray 포함
```xml
<!-- 금지 -->
<hp:linesegarray>...</hp:linesegarray>
```
레이아웃 캐시이므로 section XML에 포함하지 않음. 한글이 열 때 자동 재계산하며, 잘못된 값이 있으면 **자간(글자 간격) 겹침** 발생. `build_hwpx.py`의 `strip_linesegarray()`가 빌드 시 자동 제거합니다.

### ❌ XML 선언 중복
`<?xml version="1.0" encoding="UTF-8"?>` 는 파일 최상단 한 번만.

### ❌ rowCnt/colCnt 누락
`hp:tbl` 에 이 속성이 없으면 한글 파일 열기 실패.

---

## 6. 올바른 섹션 XML 기본 구조

### 6.1 단락 (본문)
```xml
<hp:p id="ID" paraPrIDRef="0" styleIDRef="0"
      pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0">
    <hp:t>본문 텍스트</hp:t>
  </hp:run>
</hp:p>
```

### 6.2 제목 단락
```xml
<hp:p id="TITLE_ID" paraPrIDRef="0" styleIDRef="0"
      pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="7">  <!-- 제목 -->
    <hp:t>단원 1. 소설의 이해</hp:t>
  </hp:run>
</hp:p>
```

### 6.3 표 (단락 안에 래핑)
표는 반드시 `hp:p > hp:run > hp:tbl` 구조:
```xml
<hp:p id="WRAPPER_ID" paraPrIDRef="0" styleIDRef="0"
      pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0">
    <hp:tbl id="TBL_ID" zOrder="0" numberingType="TABLE"
            textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES"
            lock="0" dropcapstyle="None" pageBreak="CELL"
            repeatHeader="0" cellSpacing="0"
            borderFillIDRef="3" noAdjust="0"
            rowCnt="2" colCnt="2">
      <hp:sz width="42520" widthRelTo="ABSOLUTE"
             height="4800" heightRelTo="ABSOLUTE" protect="0"/>
      <hp:pos treatAsChar="1" affectLSpacing="0"
              flowWithText="1" allowOverlap="0" holdAnchorAndSO="0"
              vertRelTo="PARA" horzRelTo="COLUMN"
              vertAlign="TOP" horzAlign="LEFT"
              vertOffset="0" horzOffset="0"/>
      <hp:outMargin left="0" right="0" top="0" bottom="0"/>
      <hp:inMargin left="0" right="0" top="0" bottom="0"/>

      <!-- 헤더 행 -->
      <hp:tr>
        <hp:tc borderFillIDRef="4">  <!-- 회색 배경 -->
          <hp:cellAddr colAddr="0" rowAddr="0"/>
          <hp:cellSpan colSpan="1" rowSpan="1"/>
          <hp:cellSz width="21260" height="2400"/>
          <hp:cellMargin left="510" right="510"
                         top="141" bottom="141"/>
          <hp:subList id="" textDirection="HORIZONTAL"
                      lineWrap="BREAK" vertAlign="CENTER"
                      linkListIDRef="0" linkListNextIDRef="0"
                      textWidth="20240" fieldName="">
            <hp:p id="H1" paraPrIDRef="21" styleIDRef="0"
                  pageBreak="0" columnBreak="0" merged="0">
              <hp:run charPrIDRef="9">  <!-- 강조 -->
                <hp:t>항목</hp:t>
              </hp:run>
            </hp:p>
          </hp:subList>
        </hp:tc>
        <!-- 두 번째 헤더 셀 ... -->
      </hp:tr>

      <!-- 데이터 행 -->
      <hp:tr>
        <hp:tc borderFillIDRef="3">  <!-- 기본 -->
          ... (charPrIDRef="0" 본문)
        </hp:tc>
      </hp:tr>
    </hp:tbl>
  </hp:run>
</hp:p>
```

### 6.4 올바른 문서 구조 (단락-표 교차)
```
hp:p (제목, charPrIDRef=7)
hp:p (본문 설명, charPrIDRef=0)
hp:p → hp:tbl (표1)
hp:p (소제목, charPrIDRef=8)
hp:p (본문)
hp:p → hp:tbl (표2)
```

---

## 7. 교육 자료 작성 팁

### 학습지/활동지 (worksheet)
- 상단 메타 표: borderFillIDRef=4(헤더) → 3(데이터) 2행
- 문제 번호는 `hp:p` 독립 단락, charPrIDRef=9(강조)
- 답란은 borderFillIDRef=5(연청색) 셀

### 수업 지도안 (lesson-plan)
- 단계(도입/전개/정리)는 각각 제목 단락(charPrIDRef=8) + 표 조합
- 학습활동 표: 3열(단계·활동·자료) 또는 4열(시간·활동·자료·평가)

### PBL 수업자료 (pbl)
- 상단: 프로젝트 개요 2열 표 (borderFillIDRef=4/3)
- 중간: 성취기준 강조 셀 (borderFillIDRef=5)
- 하단: 단계별 활동 표

### 평가지 (assessment)
- 제시문 영역: 독립 단락 (표 금지)
- 선택지/서술형 칸: 표로 구성, 답 공간은 충분히 (각 줄 최소 height=1200)
- 루브릭: 마지막에 분석 루브릭 표

---

## 8. 빌드 파이프라인

1. **입력**: tool 파라미터로 받은 `section_xml` (placeholder 포함 가능)
2. **전처리**: `build_hwpx.py`의 `strip_placeholders()` → `{{...}}` 제거
3. **정화**: `strip_linesegarray()` → 레이아웃 캐시 제거
4. **검증**: 표 폭 합 체크, rowCnt/colCnt 체크, XML well-formedness
5. **패킹**: 템플릿의 header.xml/styles + 주입된 section0.xml → ZIP → .hwpx
6. **VALID 마커**: stdout에 `VALID: <path>` 출력 시 성공

---

## 참고 링크
- OWPML 공식 스펙: 한글과컴퓨터 OWPML 표준 문서
- HWPX 템플릿: `hwpxskill-templates/` (XML 구조 사전 정의)
- 빌드 스크립트: `hwpxskill-scripts/build_hwpx.py`
