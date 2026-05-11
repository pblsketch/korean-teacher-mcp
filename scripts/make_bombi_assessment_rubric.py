#!/usr/bin/env python3
"""중1-1 시 단원 「봄비」 수행평가 + 분석적 루브릭 HWPX 생성.

출처: search_content(grade='중1-1', genre='시') → passage unit_id=b8962d50-...
대상 작품: 「봄비」 (중1-1 1단원 (2) 상징과 운율, 교과서 31쪽)

- 수행평가 안내지: template=assessment → 시감상_수행평가.hwpx
- 분석적 루브릭: template=report → 시감상_루브릭.hwpx

OWPML 규칙: 함초롬바탕, charPrIDRef 0/7/8/9, 헤더=4 데이터=3,
cellMargin 510/141, 표 폭 42520 이하, 중첩/래퍼 표 없음, 단락-표 교차.
"""

import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BUILD_SCRIPT = SCRIPT_DIR.parent / "hwpxskill-scripts" / "build_hwpx.py"
OUTPUT_DIR = Path.home() / "Downloads"

NS = (
    'xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" '
    'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" '
    'xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"'
)

SEC_PR = (
    '<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" '
    'tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" '
    'outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">'
    '<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0" />'
    '<hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0" />'
    '<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" '
    'border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0" />'
    '<hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0" />'
    '<hp:pagePr landscape="WIDELY" width="59528" height="84188" gutterType="LEFT_ONLY">'
    '<hp:margin header="3118" footer="3118" gutter="0" left="8504" right="8504" top="3685" bottom="2834" />'
    '</hp:pagePr>'
    '<hp:footNotePr>'
    '<hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0" />'
    '<hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000" />'
    '<hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850" />'
    '<hp:numbering type="CONTINUOUS" newNum="1" />'
    '<hp:placement place="EACH_COLUMN" beneathText="0" />'
    '</hp:footNotePr>'
    '<hp:endNotePr>'
    '<hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0" />'
    '<hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000" />'
    '<hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850" />'
    '<hp:numbering type="CONTINUOUS" newNum="1" />'
    '<hp:placement place="END_OF_DOCUMENT" beneathText="0" />'
    '</hp:endNotePr>'
    '<hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="PAPER" '
    'headerInside="0" footerInside="0" fillArea="PAPER">'
    '<hp:offset left="1417" right="1417" top="1417" bottom="1417" />'
    '</hp:pageBorderFill>'
    '</hp:secPr>'
)

PID = 0


def next_pid() -> int:
    global PID
    PID += 1
    return PID


def para(text: str, char_pr: int = 0) -> str:
    """단락 (charPrIDRef: 0=본문, 7=제목, 8=소제목, 9=강조)."""
    sizes = {0: 1000, 7: 1600, 8: 1200, 9: 1000}
    vs = sizes.get(char_pr, 1000)
    baseline = int(vs * 0.85)
    spacing = int(vs * 0.6)
    pid = next_pid()
    return (
        f'<hp:p id="{pid}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
        f'<hp:run charPrIDRef="{char_pr}"><hp:t>{text}</hp:t></hp:run>'
        f'<hp:linesegarray>'
        f'<hp:lineseg textpos="0" vertpos="0" vertsize="{vs}" textheight="{vs}" '
        f'baseline="{baseline}" spacing="{spacing}" horzpos="0" horzsize="42520" flags="393216" />'
        f'</hp:linesegarray>'
        f'</hp:p>'
    )


def empty_para() -> str:
    pid = next_pid()
    return (
        f'<hp:p id="{pid}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
        f'<hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>'
        f'<hp:linesegarray>'
        f'<hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" '
        f'baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216" />'
        f'</hp:linesegarray>'
        f'</hp:p>'
    )


def table_cell(text: str, col_addr: int, row_addr: int, width: int,
               is_header: bool = False, char_pr: int = 0) -> str:
    bf = 4 if is_header else 3
    cp = 9 if is_header else char_pr
    vs = 1000
    pid = next_pid()
    content_width = width - 510 - 510
    return (
        f'<hp:tc name="" header="{1 if is_header else 0}" hasMargin="0" protect="0" '
        f'editable="0" dirty="0" borderFillIDRef="{bf}">'
        f'<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" '
        f'linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">'
        f'<hp:p id="{pid}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
        f'<hp:run charPrIDRef="{cp}"><hp:t>{text}</hp:t></hp:run>'
        f'<hp:linesegarray>'
        f'<hp:lineseg textpos="0" vertpos="0" vertsize="{vs}" textheight="{vs}" '
        f'baseline="850" spacing="600" horzpos="0" horzsize="{content_width}" flags="393216" />'
        f'</hp:linesegarray>'
        f'</hp:p>'
        f'</hp:subList>'
        f'<hp:cellAddr colAddr="{col_addr}" rowAddr="{row_addr}" />'
        f'<hp:cellSpan colSpan="1" rowSpan="1" />'
        f'<hp:cellSz width="{width}" height="282" />'
        f'<hp:cellMargin left="510" right="510" top="141" bottom="141" />'
        f'</hp:tc>'
    )


def table(headers: list[str], rows: list[list[str]], widths: list[int] | None = None) -> str:
    col_count = len(headers)
    if widths is None:
        base_w = 42520 // col_count
        widths = [base_w] * col_count
        widths[-1] = 42520 - base_w * (col_count - 1)
    assert sum(widths) == 42520, f"폭 합계 오류: {sum(widths)} != 42520"

    row_count = 1 + len(rows)
    total_height = row_count * 800
    col_w_xml = ''.join(f'<hp:colSz width="{w}" />' for w in widths)

    result = (
        f'<hp:tbl id="{next_pid()}" zOrder="0" numberingType="TABLE" '
        f'textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" '
        f'pageBreak="CELL" repeatHeader="1" rowCnt="{row_count}" colCnt="{col_count}" '
        f'cellSpacing="0" borderFillIDRef="3" noAdjust="0">'
        f'<hp:sz width="42520" widthRelTo="ABSOLUTE" height="{total_height}" '
        f'heightRelTo="ABSOLUTE" protect="0" />'
        f'<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" '
        f'holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" '
        f'horzAlign="LEFT" vertOffset="0" horzOffset="0" />'
        f'<hp:outMargin left="0" right="0" top="0" bottom="0" />'
        f'<hp:inMargin left="510" right="510" top="141" bottom="141" />'
        f'{col_w_xml}'
    )

    # Header row
    result += '<hp:tr>'
    for ci, h in enumerate(headers):
        result += table_cell(h, ci, 0, widths[ci], is_header=True)
    result += '</hp:tr>'

    # Data rows
    for ri, row in enumerate(rows):
        result += '<hp:tr>'
        for ci, cell in enumerate(row):
            result += table_cell(cell, ci, ri + 1, widths[ci], is_header=False)
        result += '</hp:tr>'

    result += '</hp:tbl>'
    return result


def table_para(headers: list[str], rows: list[list[str]], widths: list[int] | None = None) -> str:
    pid = next_pid()
    tbl = table(headers, rows, widths)
    return (
        f'<hp:p id="{pid}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
        f'<hp:run charPrIDRef="0">{tbl}</hp:run>'
        f'<hp:linesegarray>'
        f'<hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" '
        f'baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216" />'
        f'</hp:linesegarray>'
        f'</hp:p>'
    )


def build_section(paragraphs: list[str]) -> str:
    first_pid = next_pid()
    first_para = (
        f'<hp:p id="{first_pid}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
        f'<hp:run charPrIDRef="0">{SEC_PR}</hp:run>'
        f'<hp:linesegarray>'
        f'<hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" '
        f'baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216" />'
        f'</hp:linesegarray>'
        f'</hp:p>'
    )
    body = first_para + ''.join(paragraphs)
    return (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'
        f'<hs:sec {NS}>'
        f'{body}'
        f'</hs:sec>'
    )


# ── 수행평가 안내지 콘텐츠 ──────────────────────────────────────────
def assessment_content() -> list[str]:
    """teacher-assessment: 과제 안내지 (단락-표 교차 구조)."""
    return [
        para("시 감상 수행평가 — 「봄비」 비유·상징·운율", 7),
        empty_para(),
        para("학년·학기: 중학교 1학년 1학기 / 대상 단원: 1단원 (2) 상징과 운율 / 제재: 「봄비」 (교과서 31쪽)", 0),
        empty_para(),

        para("1. 평가 개요", 8),
        para("「봄비」를 감상하고 비유·상징·운율의 효과를 근거를 들어 설명한 뒤, 자신의 감상을 짧은 시나 감상문으로 창작한다.", 0),
        empty_para(),
        table_para(
            ["항목", "내용"],
            [
                ["평가 유형", "수행평가 (감상문 + 창작시 / 과정 중심)"],
                ["평가 시간", "2차시 (블록 수업 90분) + 가정 학습 1회"],
                ["모둠 구성", "4인 모둠 → 개별 제출"],
                ["총배점", "100점 (감상 분석 60점 + 창작 30점 + 참여 10점)"],
            ],
            widths=[12756, 29764],
        ),
        empty_para(),

        para("2. 성취기준 및 인지 수준", 8),
        para("2022 개정 국어과 중학교 1~3학년군 성취기준을 근거로 한다.", 0),
        empty_para(),
        table_para(
            ["코드", "성취기준 본문", "Bloom 수준"],
            [
                ["[9국05-02]", "비유와 상징의 효과를 바탕으로 작품을 수용하고 생산한다.", "분석·창안"],
                ["[9국05-03]", "운율, 비유, 상징의 특성과 효과에 유의하며 작품을 감상한다.", "이해·분석"],
                ["[9국05-09]", "근거의 차이에 따른 다양한 해석을 비교하며 작품을 감상한다.", "평가"],
            ],
            widths=[6380, 27504, 8636],
        ),
        empty_para(),

        para("3. 수행 단계", 8),
        para("각 단계는 학습자가 직접 기록하는 산출물이 남아야 하며, 교사는 순회 관찰로 과정을 체크한다.", 0),
        empty_para(),
        table_para(
            ["단계", "학습 활동", "시간", "산출물"],
            [
                ["열기", "「봄비」 낭독 듣기 → 떠오른 감각·소리 메모", "10분", "감각 메모장"],
                ["펼치기 1", "비유 표현 찾기 — 원관념·보조관념·공통 속성 정리", "20분", "비유 분석표"],
                ["펼치기 2", "운율 요소 분석 — 음보·반복·의성어·의태어", "15분", "운율 분석표"],
                ["펼치기 3", "상징 해석 — 봄비가 상징하는 바에 근거 2개 이상 제시", "20분", "감상문 초고"],
                ["창작", "자신의 경험 하나를 악기·소리에 빗댄 짧은 시 쓰기", "20분", "창작시 1편"],
                ["닫기", "모둠 상호 피드백 후 감상문·창작시 최종 제출", "5분", "최종 제출본"],
            ],
            widths=[5314, 22000, 4250, 10956],
        ),
        empty_para(),

        para("4. 제출물 및 형식", 8),
        para("제출 파일은 A4 2쪽 이내, 본문 함초롬바탕 10pt, 줄간격 160%로 통일한다.", 0),
        para("유의: 생성형 AI로 전체 감상문·창작시를 산출한 경우 0점 처리. 아이디어 메모 단계의 보조 활용은 허용하되 출처 표기 필수.", 9),
        empty_para(),

        para("5. 평가 비중 및 인지 수준 분배", 8),
        table_para(
            ["영역", "배점", "주요 인지 수준", "평가 방법"],
            [
                ["비유·상징 분석", "30점", "분석 · 평가", "서술형 채점 + 루브릭"],
                ["운율 분석", "20점", "이해 · 분석", "서술형 채점"],
                ["감상문 서술", "20점", "적용 · 평가", "분석적 루브릭"],
                ["창작시 산출", "20점", "창안", "분석적 루브릭"],
                ["참여·협력", "10점", "—", "교사 관찰 체크리스트"],
            ],
            widths=[11000, 5000, 11520, 15000],
        ),
        empty_para(),

        para("6. 안내 및 유의사항", 8),
        para("1) 채점은 별도의 분석적 루브릭(준거 5개·수준 4단계)을 공개 기준으로 사용한다.", 0),
        para("2) 감상의 근거는 본문에서 인용한 시구를 반드시 포함한다.", 0),
        para("3) 특수교육 대상·다국어 학습자는 감각 메모·창작 분량을 절반으로 조정할 수 있다.", 0),
        para("4) 제출 후 3일 이내 교사 피드백, 희망자는 재제출 기회 1회 부여.", 0),
    ]


# ── 분석적 루브릭 콘텐츠 ────────────────────────────────────────────
def rubric_content() -> list[str]:
    """teacher-rubric: Brookhart 원칙 기반 준거 5개 · 수준 4단계 평행 서술."""
    # 5열 표 폭 = 42520 / 5 = 8504 each
    level_widths = [8504, 8504, 8504, 8504, 8504]
    return [
        para("시 감상 수행평가 분석적 루브릭 — 「봄비」", 7),
        empty_para(),
        para("대상 학년·단원: 중1-1 / 1단원 (2) 상징과 운율 · 제재 「봄비」", 0),
        para("설계 원칙: Brookhart(2013) 분석적 루브릭 7원칙 — 준거는 학습 결과 중심, 수준 기술은 평행 구조·관찰 가능한 서술.", 9),
        empty_para(),

        para("1. 준거와 성취기준 정렬", 8),
        para("5개 준거는 각각 성취기준과 1:1로 연결되며, 서로 독립적으로 관찰·채점할 수 있다.", 0),
        empty_para(),
        table_para(
            ["준거", "학습 결과로서의 초점", "근거 성취기준"],
            [
                ["비유의 분석",      "원관념·보조관념·공통 속성을 구분해 시의 비유 효과를 설명한다.", "[9국05-02]"],
                ["상징의 해석",      "시어·소재가 환기하는 상징 의미를 본문 근거와 함께 해석한다.", "[9국05-02]"],
                ["운율의 분석",      "음보·반복·의성어·의태어가 만드는 리듬 효과를 분석한다.",        "[9국05-03]"],
                ["감상의 논리",      "해석을 뒷받침하는 근거를 2개 이상 제시하며 감상을 전개한다.",  "[9국05-09]"],
                ["창작의 표현",      "경험을 소리·악기에 빗대어 자신만의 비유적 시구를 산출한다.",  "[9국05-02]"],
            ],
            widths=[8504, 25512, 8504],
        ),
        empty_para(),

        para("2. 수행 수준 기술 (4단계 평행 구조)", 8),
        para("같은 측면을 다른 질적 수준으로 기술하며, 판단어(우수/미흡) 대신 관찰 가능한 행동·산출 특성으로 서술한다.", 0),
        empty_para(),
        table_para(
            ["준거", "탁월 (4)", "능숙 (3)", "발달 (2)", "기초 (1)"],
            [
                [
                    "비유의 분석",
                    "세 개 이상의 비유를 원관념·보조관념·공통 속성으로 분리해 효과까지 설명한다.",
                    "두 개의 비유를 원관념·보조관념으로 구분해 설명한다.",
                    "비유 표현을 찾아내지만 원관념·보조관념의 구분이 부분적으로만 드러난다.",
                    "비유 표현을 제시하는 수준에 머문다.",
                ],
                [
                    "상징의 해석",
                    "봄비의 상징 의미를 본문 근거 두 개 이상으로 뒷받침해 해석한다.",
                    "봄비의 상징 의미를 본문 근거 한 개로 뒷받침해 해석한다.",
                    "상징 의미를 언급하지만 본문 근거가 모호하다.",
                    "상징 의미를 피상적으로 서술한다.",
                ],
                [
                    "운율의 분석",
                    "음보·반복·의성어·의태어 중 세 요소 이상의 효과를 본문 인용으로 제시한다.",
                    "두 요소의 효과를 본문 인용으로 제시한다.",
                    "한 요소의 효과만 제시하거나 인용이 부분적이다.",
                    "운율 요소를 나열하는 수준에 머문다.",
                ],
                [
                    "감상의 논리",
                    "해석을 뒷받침하는 근거 두 개 이상을 서로 다른 측면에서 제시한다.",
                    "근거 두 개를 제시하되 일부가 동일한 측면에 치우친다.",
                    "근거 한 개만 제시한다.",
                    "근거 없이 감상만 진술한다.",
                ],
                [
                    "창작의 표현",
                    "자기 경험을 소리·악기에 빗댄 새로운 비유로 두 행 이상의 시구를 구성한다.",
                    "자기 경험을 악기나 소리에 빗댄 한 행의 비유 시구를 쓴다.",
                    "빗댄 표현을 시도하지만 원관념과의 연결이 약하다.",
                    "경험을 서술식으로만 표현한다.",
                ],
            ],
            widths=level_widths,
        ),
        empty_para(),

        para("3. 환산 점수 및 최종 등급", 8),
        para("각 준거의 수준 점수(4·3·2·1)를 합산한 뒤 아래 기준으로 최종 등급을 부여한다.", 0),
        empty_para(),
        table_para(
            ["합계 점수", "최종 등급", "의미"],
            [
                ["18~20",  "A (도달)",   "성취기준을 일관되게 충족하며 자율적으로 감상·창작한다."],
                ["14~17",  "B (부분 도달)", "성취기준을 대부분 충족하며 일부 준거에서 보완이 필요하다."],
                ["10~13",  "C (부분 부도달)", "두 개 이상의 준거에서 근거·서술이 부족하다."],
                ["5~9",    "D (부도달)", "다수의 준거에서 재지도가 필요하다."],
            ],
            widths=[8504, 10016, 24000],
        ),
        empty_para(),

        para("4. 활용 제안", 8),
        para("교사: 수업 전 루브릭을 학생에게 공개해 평가 근거를 명확히 하고, 수업 중 순회 관찰로 준거별 체크를, 수업 후 재제출 피드백의 기준으로 사용한다.", 0),
        para("학생: 계획 단계에서 준거로 자기 점검표를 구성하고, 과정에서는 모둠 상호 피드백에, 마무리 단계에서는 자기 성찰의 언어로 활용한다.", 0),
        para("주의: 준거·수준을 임의로 가감하면 평행 구조가 깨지므로, 수정이 필요할 경우 설계자(교사)와 협의 후 전체를 다시 정렬한다.", 9),
    ]


def write_and_build(template: str, title: str, content_fn, filename: str) -> tuple[bool, Path, str]:
    global PID
    PID = 0
    paragraphs = content_fn()
    section_xml = build_section(paragraphs)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".xml", encoding="utf-8", delete=False) as f:
        f.write(section_xml)
        tmp_path = f.name

    output_path = OUTPUT_DIR / f"{filename}.hwpx"

    cmd = [
        sys.executable,
        str(BUILD_SCRIPT),
        "--template", template,
        "--section", tmp_path,
        "--title", title,
        "--creator", "korean-teacher-mcp",
        "--output", str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    Path(tmp_path).unlink(missing_ok=True)

    ok = result.returncode == 0 and "VALID:" in (result.stdout or "")
    log = (result.stdout or "").strip() + ("\nSTDERR: " + result.stderr.strip() if result.stderr else "")
    return ok, output_path, log


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("assessment", "시 감상 수행평가 — 「봄비」 비유·상징·운율", assessment_content, "시감상_수행평가"),
        ("report",     "시 감상 수행평가 분석적 루브릭 — 「봄비」",    rubric_content,     "시감상_루브릭"),
    ]
    all_ok = True
    for template, title, fn, filename in jobs:
        print(f"\n{'='*60}\n[{template}] {title}\n → {OUTPUT_DIR / (filename + '.hwpx')}")
        ok, path, log = write_and_build(template, title, fn, filename)
        print(log)
        size = path.stat().st_size if path.exists() else 0
        print(f"  {'OK' if ok else 'FAIL'}  size={size:,} bytes")
        all_ok = all_ok and ok
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
