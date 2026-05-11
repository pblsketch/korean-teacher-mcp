#!/usr/bin/env python3
"""Generate 9 HWPX sample documents to verify style normalization.

Each document includes:
- Title (charPrIDRef=7, 16pt bold)
- Subtitle (charPrIDRef=8, 12pt bold)
- Body text (charPrIDRef=0, 10pt)
- Emphasis (charPrIDRef=9, 10pt bold)
- Table with header cells (borderFillIDRef=4, #D9D9D9) and normal cells (borderFillIDRef=3)

Verification points:
- Font: 함초롬바탕 unified across all documents
- charPrIDRef 0/7/8/9 consistent size/bold
- Table width ≤ 42520 (printable area)
- Header cell background: #D9D9D9
- cellMargin: 510/510/141/141
"""

import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BUILD_SCRIPT = SCRIPT_DIR.parent / "hwpxskill-scripts" / "build_hwpx.py"
OUTPUT_DIR = Path.home() / "Downloads"

# ── XML building helpers ─────────────────────────────────────────────

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

def next_pid():
    global PID
    PID += 1
    return PID


def para(text: str, char_pr: int = 0) -> str:
    """Create a paragraph with the given text and character style."""
    # lineseg sizes based on charPr
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
    """Create an empty paragraph for spacing."""
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
    """Create a table cell."""
    bf = 4 if is_header else 3
    cp = 9 if is_header else char_pr
    vs = 1000
    pid = next_pid()
    content_width = width - 510 - 510  # subtract left+right cellMargin
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


def table(headers: list[str], rows: list[list[str]], col_count: int = None) -> str:
    """Create a table with header row and data rows. Total width = 42520."""
    if col_count is None:
        col_count = len(headers)

    # Distribute width evenly, adjust last column for remainder
    base_w = 42520 // col_count
    widths = [base_w] * col_count
    widths[-1] = 42520 - base_w * (col_count - 1)

    row_count = 1 + len(rows)
    total_height = row_count * 800

    # Build column widths list
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


def table_para(headers: list[str], rows: list[list[str]]) -> str:
    """Wrap a table in a paragraph (treatAsChar=1)."""
    pid = next_pid()
    tbl = table(headers, rows)
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
    """Build a complete section0.xml string."""
    # First paragraph includes secPr
    first_p_content = paragraphs[0] if paragraphs else ''

    # The secPr goes inside the first run of the first paragraph
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


# ── Document content definitions ─────────────────────────────────────

DOCUMENTS = {
    "worksheet": {
        "title": "독서 활동지",
        "content": lambda: [
            para("독서 활동지", 7),
            empty_para(),
            para("1. 책 정보", 8),
            para("아래 표에 읽은 책의 정보를 정리해 봅시다.", 0),
            empty_para(),
            table_para(
                ["항목", "내용", "비고"],
                [
                    ["책 제목", "(                    )", ""],
                    ["지은이", "(                    )", ""],
                    ["출판사", "(                    )", ""],
                    ["읽은 날짜", "(     )년 (  )월 (  )일", ""],
                ],
            ),
            empty_para(),
            para("2. 내용 이해", 8),
            para("이 책에서 가장 인상 깊었던 장면은 무엇인가요? 그 이유를 함께 써 봅시다.", 0),
            para("핵심 질문: 등장인물의 행동이 나에게 주는 교훈은 무엇인가?", 9),
            empty_para(),
            para("3. 생각 나누기", 8),
            para("친구에게 이 책을 추천한다면, 어떤 점을 강조하고 싶은지 자유롭게 적어 봅시다.", 0),
        ],
    },
    "lesson-plan": {
        "title": "과학 수업 지도안",
        "content": lambda: [
            para("과학 수업 지도안", 7),
            empty_para(),
            para("수업 개요", 8),
            para("본 수업은 초등학교 5학년 과학 '날씨와 우리 생활' 단원의 3차시 수업입니다.", 0),
            para("학습 목표: 기온, 습도, 바람이 날씨에 미치는 영향을 설명할 수 있다.", 9),
            empty_para(),
            table_para(
                ["단계", "교수·학습 활동", "시간", "자료 및 유의점"],
                [
                    ["도입", "날씨 관련 경험 나누기", "5분", "사진 자료"],
                    ["전개 1", "기온·습도 측정 실험", "15분", "온습도계"],
                    ["전개 2", "모둠별 결과 분석 토의", "10분", "활동지"],
                    ["정리", "학습 내용 정리 및 퀴즈", "10분", "퀴즈 카드"],
                ],
            ),
            empty_para(),
            para("평가 계획", 8),
            para("형성평가를 통해 기온과 습도의 관계를 설명할 수 있는지 확인합니다.", 0),
        ],
    },
    "assessment": {
        "title": "수학 단원평가",
        "content": lambda: [
            para("수학 단원평가", 7),
            empty_para(),
            para("단원: 분수의 덧셈과 뺄셈", 8),
            para("다음 문제를 읽고 풀이 과정과 답을 쓰시오.", 0),
            para("주의사항: 풀이 과정을 반드시 기록하세요. 풀이 없는 답은 감점됩니다.", 9),
            empty_para(),
            table_para(
                ["문항", "배점", "정답 여부"],
                [
                    ["1. 1/3 + 2/5 를 계산하시오.", "10점", ""],
                    ["2. 7/8 - 3/4 를 계산하시오.", "10점", ""],
                    ["3. 2와 1/2 + 1과 3/4 를 계산하시오.", "15점", ""],
                    ["4. 5 - 2와 2/3 를 계산하시오.", "15점", ""],
                ],
            ),
            empty_para(),
            para("서술형 문제", 8),
            para("5. 철수는 피자 3/4조각을 먹고, 영희는 2/3조각을 먹었습니다. 누가 더 많이 먹었는지 풀이 과정과 함께 설명하시오. (25점)", 0),
        ],
    },
    "pbl": {
        "title": "환경 프로젝트",
        "content": lambda: [
            para("환경 프로젝트 학습 자료", 7),
            empty_para(),
            para("프로젝트 개요", 8),
            para("우리 학교 주변의 환경 문제를 조사하고 해결 방안을 제안하는 프로젝트입니다.", 0),
            para("핵심 질문: 우리가 일상에서 실천할 수 있는 환경 보호 활동은 무엇인가?", 9),
            empty_para(),
            para("프로젝트 일정", 8),
            table_para(
                ["주차", "활동 내용", "산출물"],
                [
                    ["1주", "환경 문제 조사 및 주제 선정", "주제 선정 보고서"],
                    ["2주", "현장 조사 및 데이터 수집", "조사 기록장"],
                    ["3주", "해결 방안 설계 및 제작", "프로토타입/포스터"],
                    ["4주", "발표 및 성찰", "발표 자료, 성찰 일지"],
                ],
            ),
            empty_para(),
            para("평가 기준", 8),
            para("자기평가, 동료평가, 교사평가를 종합하여 최종 성적을 산출합니다.", 0),
        ],
    },
    "discussion": {
        "title": "인공지능 윤리 토론",
        "content": lambda: [
            para("인공지능 윤리 토론 활동지", 7),
            empty_para(),
            para("토론 주제", 8),
            para("인공지능이 인간의 일자리를 대체하는 것은 바람직한가?", 0),
            para("핵심 쟁점: AI 기술 발전과 인간 노동의 가치 사이의 균형", 9),
            empty_para(),
            para("찬반 논거 정리", 8),
            table_para(
                ["구분", "찬성 측 논거", "반대 측 논거"],
                [
                    ["경제적 관점", "생산성 향상과 비용 절감", "실업률 증가와 소득 불균형"],
                    ["사회적 관점", "위험한 업무 대체로 안전 확보", "인간 소외와 정체성 상실"],
                    ["윤리적 관점", "인간의 창의적 활동 시간 확보", "기술 의존에 따른 자율성 약화"],
                ],
            ),
            empty_para(),
            para("토론 규칙", 8),
            para("상대방의 의견을 경청하고, 근거를 들어 논리적으로 반박합니다.", 0),
        ],
    },
    "report": {
        "title": "학교 운영 보고서",
        "content": lambda: [
            para("2024학년도 학교 운영 보고서", 7),
            empty_para(),
            para("1. 학교 현황", 8),
            para("본교는 2024학년도에 총 24학급을 운영하였으며, 학생 수는 612명입니다.", 0),
            empty_para(),
            para("2. 주요 성과", 8),
            table_para(
                ["분야", "추진 내용", "성과", "비고"],
                [
                    ["교육과정", "프로젝트 수업 확대", "전 학년 적용 완료", ""],
                    ["학생 활동", "자율동아리 활성화", "동아리 수 15→22개", ""],
                    ["시설", "도서관 리모델링", "장서 3,000권 확충", ""],
                    ["지역연계", "마을교육공동체 운영", "협력기관 8곳", ""],
                ],
            ),
            empty_para(),
            para("3. 향후 과제", 8),
            para("디지털 리터러시 교육 강화와 학부모 참여 확대가 필요합니다.", 0),
            para("핵심 추진 방향: AI 활용 수업 모델 개발 및 전 교과 확산", 9),
        ],
    },
    "gonmun": {
        "title": "행사 안내 공문",
        "content": lambda: [
            para("행사 안내 공문", 7),
            empty_para(),
            para("2024학년도 학부모 공개수업 안내", 8),
            para("학부모님께 안녕하십니까. 본교에서는 아래와 같이 학부모 공개수업을 실시하오니 많은 참여 부탁드립니다.", 0),
            empty_para(),
            para("행사 세부 일정", 8),
            table_para(
                ["일시", "대상 학년", "장소"],
                [
                    ["5월 15일(수) 2교시", "1~2학년", "각 교실"],
                    ["5월 15일(수) 3교시", "3~4학년", "각 교실"],
                    ["5월 16일(목) 2교시", "5~6학년", "각 교실"],
                ],
            ),
            empty_para(),
            para("유의사항: 주차 공간이 제한되오니 대중교통을 이용해 주시기 바랍니다.", 9),
            empty_para(),
            para("붙임: 학부모 공개수업 시간표 1부. 끝.", 0),
        ],
    },
    "minutes": {
        "title": "교직원 회의록",
        "content": lambda: [
            para("교직원 회의록", 7),
            empty_para(),
            para("회의 개요", 8),
            para("일시: 2024년 4월 10일(수) 16:00~17:30 / 장소: 본관 3층 회의실 / 참석: 전 교직원 32명", 0),
            empty_para(),
            para("안건 및 논의 내용", 8),
            table_para(
                ["안건", "논의 내용", "결정 사항"],
                [
                    ["체험학습 일정", "5월 현장체험학습 장소 논의", "학년별 자율 선정"],
                    ["평가 계획", "1학기 평가 방법 및 일정 확인", "원안 의결"],
                    ["생활지도", "등하교 안전지도 인력 배치", "교사 2인 교대 근무"],
                    ["기타", "교내 연수 주제 선정", "AI 활용 교육 선정"],
                ],
            ),
            empty_para(),
            para("특기사항: 다음 회의는 5월 8일(수) 동일 시간에 진행 예정", 9),
        ],
    },
    "proposal": {
        "title": "방과후 프로그램 제안서",
        "content": lambda: [
            para("방과후 프로그램 제안서", 7),
            empty_para(),
            para("프로그램 개요", 8),
            para("본 제안서는 2024학년도 2학기 방과후학교 코딩 교실 운영을 위한 것입니다.", 0),
            para("핵심 목표: 학생들의 컴퓨팅 사고력 및 문제해결력 신장", 9),
            empty_para(),
            para("운영 계획", 8),
            table_para(
                ["항목", "세부 내용", "비고"],
                [
                    ["대상", "4~6학년 희망학생 20명", "선착순 모집"],
                    ["기간", "9월~12월 (16주)", "매주 화·목"],
                    ["시간", "15:00~16:30", "90분 수업"],
                    ["강사", "외부 전문강사 1명", "SW교육 자격"],
                    ["예산", "총 320만원", "강사비+재료비"],
                ],
            ),
            empty_para(),
            para("기대 효과", 8),
            para("학생들이 블록코딩에서 텍스트코딩으로 자연스럽게 전환하며, 실생활 문제를 코딩으로 해결하는 경험을 합니다.", 0),
        ],
    },
}


def generate_all():
    """Generate all 9 HWPX sample documents."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    results = []

    for template_name, doc in DOCUMENTS.items():
        global PID
        PID = 0  # Reset paragraph ID counter per document

        title = doc["title"]
        paragraphs = doc["content"]()
        section_xml = build_section(paragraphs)

        # Write section XML to temp file
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".xml", encoding="utf-8", delete=False
        ) as f:
            f.write(section_xml)
            tmp_path = f.name

        output_path = OUTPUT_DIR / f"sample_{template_name}.hwpx"

        cmd = [
            sys.executable,
            str(BUILD_SCRIPT),
            "--template", template_name,
            "--section", tmp_path,
            "--title", title,
            "--creator", "스타일 검증 도구",
            "--output", str(output_path),
        ]

        print(f"\n{'='*60}")
        print(f"Generating: {template_name} — {title}")
        print(f"Output: {output_path}")

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.stdout:
            print(result.stdout.strip())
        if result.stderr:
            print(f"STDERR: {result.stderr.strip()}")

        success = result.returncode == 0 and "VALID:" in (result.stdout or "")
        results.append((template_name, title, success, output_path))

        # Clean up temp file
        Path(tmp_path).unlink(missing_ok=True)

    # Summary
    print(f"\n{'='*60}")
    print("GENERATION SUMMARY")
    print(f"{'='*60}")
    for name, title, success, path in results:
        status = "✓ VALID" if success else "✗ FAILED"
        size = path.stat().st_size if path.exists() else 0
        print(f"  {status}  {name:15s}  {title:20s}  ({size:,} bytes)")

    ok = sum(1 for _, _, s, _ in results if s)
    print(f"\n  Total: {ok}/{len(results)} valid")
    return all(s for _, _, s, _ in results)


if __name__ == "__main__":
    success = generate_all()
    sys.exit(0 if success else 1)
