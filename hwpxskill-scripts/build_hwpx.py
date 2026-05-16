#!/usr/bin/env python3
"""Build an HWPX document from templates and XML overrides.

Assembles a valid HWPX file by:
1. Copying the base template
2. Optionally overlaying a document-type template (gonmun, report, minutes)
3. Optionally overriding header.xml and/or section0.xml with custom files
4. Optionally setting metadata (title, creator)
5. Validating XML well-formedness
6. Packaging as HWPX (ZIP with mimetype first, ZIP_STORED)

Usage:
    # Empty document from base template
    python build_hwpx.py --output result.hwpx

    # Using a document-type template
    python build_hwpx.py --template gonmun --output result.hwpx

    # Custom section XML override
    python build_hwpx.py --template gonmun --section my_section0.xml --output result.hwpx

    # Custom header and section
    python build_hwpx.py --header my_header.xml --section my_section0.xml --output result.hwpx

    # With metadata
    python build_hwpx.py --template gonmun --section my.xml --title "제목" --creator "작성자" --output result.hwpx
"""

import argparse
import re
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile

from lxml import etree

from fix_namespaces import fix_namespaces
from layout_optimizer import optimize_section_xml

# Resolve paths relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
TEMPLATES_DIR = SKILL_DIR / "hwpxskill-templates"
BASE_DIR = TEMPLATES_DIR / "base"

AVAILABLE_TEMPLATES = ["gonmun", "report", "minutes", "proposal", "worksheet", "lesson-plan", "assessment", "performance-assessment", "pbl", "discussion", "parent-newsletter", "checklist", "roster"]


def validate_border_fills(work_dir: Path) -> None:
    """Check that all borderFillIDRef values in section0.xml are defined in header.xml.

    Fixes three categories:
      1. Undefined IDs (not in header.xml) → remap to 3 (solid border)
      2. Invisible IDs (1, 2 = type NONE) on table cells (hp:tc) → remap to 3
      3. Invisible IDs on table elements (hp:tbl) → remap to 3
    """
    header = work_dir / "Contents" / "header.xml"
    section0 = work_dir / "Contents" / "section0.xml"
    if not header.is_file() or not section0.is_file():
        return

    hdr_text = header.read_text(encoding="utf-8")
    defined = set(int(m.group(1)) for m in re.finditer(r'<hh:borderFill\s+id="(\d+)"', hdr_text))
    if not defined:
        return

    sec_text = section0.read_text(encoding="utf-8")
    used = set(int(m.group(1)) for m in re.finditer(r'borderFillIDRef="(\d+)"', sec_text))
    undefined = used - defined

    # borderFillIDRef 1 and 2 have type="NONE" on all sides — invisible borders
    invisible_ids = {1, 2}

    fixed = sec_text

    # 1. Remap undefined borderFillIDRef everywhere
    if undefined:
        def _remap_undefined(m: re.Match) -> str:
            val = int(m.group(1))
            return 'borderFillIDRef="3"' if val in undefined else m.group(0)
        fixed = re.sub(r'borderFillIDRef="(\d+)"', _remap_undefined, fixed)

    # 2. Fix invisible borders in table cells (hp:tc)
    def _remap_tag_border(m: re.Match) -> str:
        tag = m.group(0)
        bf_match = re.search(r'borderFillIDRef="(\d+)"', tag)
        if bf_match and int(bf_match.group(1)) in invisible_ids:
            return tag.replace(bf_match.group(0), 'borderFillIDRef="3"')
        return tag
    fixed = re.sub(r'<hp:tc\b[^>]*>', _remap_tag_border, fixed)

    # 3. Fix invisible borders on table elements (hp:tbl)
    fixed = re.sub(r'<hp:tbl\b[^>]*>', _remap_tag_border, fixed)

    if fixed != sec_text:
        section0.write_text(fixed, encoding="utf-8")
        print(
            f"FIX: Remapped borderFillIDRef in section0.xml "
            f"(undefined: {sorted(undefined) if undefined else 'none'}, "
            f"invisible borders on tc/tbl: ids {sorted(invisible_ids)} -> 3)",
            file=sys.stderr,
        )


def validate_char_pr_refs(work_dir: Path) -> None:
    """Fix charPrIDRef issues in section0.xml.

    Three-phase fix:
      Phase 1: Map ALL undefined charPrIDRef → 0 (body text, 10pt).
               AI-generated templates use random charPrIDRef values not defined
               in header.xml. Inline style hints are unreliable (garbage heights),
               so simple remapping to body text is the safest approach.
      Phase 2: Remap charPrIDRef="5" (blue TOC, 16pt) → "7" (black bold title)
               in content runs that have text. charPr 5 is a defined style but
               wrong for content — it's blue and meant for TOC headings only.
      Phase 3: Strip garbage inline <hp:charPr> elements from <hp:rPr> inside
               runs. AI generates random height/bold overrides that conflict
               with the style definitions in header.xml.
    """
    header = work_dir / "Contents" / "header.xml"
    section0 = work_dir / "Contents" / "section0.xml"
    if not header.is_file() or not section0.is_file():
        return

    hdr_text = header.read_text(encoding="utf-8")
    defined = set(
        int(m.group(1))
        for m in re.finditer(r'<hh:charPr\s+id="(\d+)"', hdr_text)
    )
    if not defined:
        return

    sec_text = section0.read_text(encoding="utf-8")
    used = set(
        int(m.group(1))
        for m in re.finditer(r'charPrIDRef="(\d+)"', sec_text)
    )
    missing = used - defined

    msgs = []

    # --- Phase 1: Map ALL undefined charPrIDRef → 0 (body text) ---
    undef_count = 0
    if missing:
        def _remap_undefined(m: re.Match) -> str:
            nonlocal undef_count
            val = int(m.group(1))
            if val in missing:
                undef_count += 1
                return 'charPrIDRef="0"'
            return m.group(0)
        sec_text = re.sub(r'charPrIDRef="(\d+)"', _remap_undefined, sec_text)
        msgs.append(f"Remapped {undef_count} undefined charPrIDRef→0 ({len(missing)} IDs: {sorted(missing)})")

    # --- Phase 2: Remap charPrIDRef="5" (blue TOC) → "7" (black title) in content runs ---
    blue_count = 0
    if 5 in defined and 7 in defined:
        def _remap_blue(m: re.Match) -> str:
            nonlocal blue_count
            run_xml = m.group(0)
            if 'charPrIDRef="5"' not in run_xml:
                return run_xml
            text_m = re.search(r'<hp:t>(.*?)</hp:t>', run_xml, re.DOTALL)
            if text_m and text_m.group(1).strip():
                blue_count += 1
                return run_xml.replace('charPrIDRef="5"', 'charPrIDRef="7"')
            return run_xml
        sec_text = re.sub(
            r'<hp:run\b[^>]*>.*?</hp:run>', _remap_blue, sec_text, flags=re.DOTALL,
        )
        if blue_count:
            msgs.append(f"Remapped {blue_count} blue TOC charPrIDRef 5→7")

    # --- Phase 3: Strip garbage inline <hp:charPr> from <hp:rPr> inside runs ---
    # AI generates random height values (e.g. 22000, 42900) that override
    # the correct style definitions from header.xml. Remove them.
    strip_count = 0
    def _strip_inline_charpr(m: re.Match) -> str:
        nonlocal strip_count
        run_xml = m.group(0)
        # Remove <hp:charPr .../> or <hp:charPr ...>...</hp:charPr> inside rPr
        cleaned = re.sub(r'<hp:charPr\b[^>]*/>', '', run_xml)
        cleaned = re.sub(r'<hp:charPr\b[^>]*>.*?</hp:charPr>', '', cleaned, flags=re.DOTALL)
        # Remove empty <hp:rPr></hp:rPr> or <hp:rPr/>
        cleaned = re.sub(r'<hp:rPr\s*/>', '', cleaned)
        cleaned = re.sub(r'<hp:rPr>\s*</hp:rPr>', '', cleaned)
        if cleaned != run_xml:
            strip_count += 1
        return cleaned
    sec_text = re.sub(
        r'<hp:run\b[^>]*>.*?</hp:run>', _strip_inline_charpr, sec_text, flags=re.DOTALL,
    )
    if strip_count:
        msgs.append(f"Stripped {strip_count} garbage inline charPr overrides from runs")

    section0.write_text(sec_text, encoding="utf-8")
    if msgs:
        print(f"FIX: {'; '.join(msgs)}", file=sys.stderr)


def validate_para_pr_refs(work_dir: Path) -> None:
    """Remap undefined paraPrIDRef values to 0 (default body paragraph).

    Templates may use paraPrIDRef values (e.g. 23-48) that are not defined in
    header.xml (which only defines 0-22). Undefined paraPrIDRef causes
    unpredictable paragraph formatting (line spacing, alignment, indentation).
    Remaps all undefined values to 0 (JUSTIFY, 160% line spacing).
    """
    header = work_dir / "Contents" / "header.xml"
    section0 = work_dir / "Contents" / "section0.xml"
    if not header.is_file() or not section0.is_file():
        return

    hdr_text = header.read_text(encoding="utf-8")
    defined = set(
        int(m.group(1))
        for m in re.finditer(r'<hh:paraPr\s+id="(\d+)"', hdr_text)
    )
    if not defined:
        return

    sec_text = section0.read_text(encoding="utf-8")
    used = set(
        int(m.group(1))
        for m in re.finditer(r'paraPrIDRef="(\d+)"', sec_text)
    )
    missing = used - defined
    if not missing:
        return

    count = 0
    def _remap_para(m: re.Match) -> str:
        nonlocal count
        val = int(m.group(1))
        if val in missing:
            count += 1
            return 'paraPrIDRef="0"'
        return m.group(0)

    fixed = re.sub(r'paraPrIDRef="(\d+)"', _remap_para, sec_text)
    section0.write_text(fixed, encoding="utf-8")
    print(
        f"FIX: Remapped {count} undefined paraPrIDRef(s) to 0 "
        f"(undefined IDs: {sorted(missing)})",
        file=sys.stderr,
    )


def ensure_sublist(work_dir: Path) -> None:
    """Wrap bare <hp:p> elements inside <hp:tc> with <hp:subList>.

    Mobile Hangul (한컴오피스 모바일) requires all paragraph content inside
    table cells to be wrapped in <hp:subList>. Desktop Hangul tolerates bare
    <hp:p> directly inside <hp:tc>, but mobile returns SC_ERROR: -1.

    Also ensures hp:tc has required attributes (name, header, hasMargin,
    editableAtFormMode) that mobile Hangul expects.
    """
    section0 = work_dir / "Contents" / "section0.xml"
    if not section0.is_file():
        return

    HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
    tree = etree.parse(str(section0))
    root = tree.getroot()
    nsmap = {"hp": HP}
    fix_count = 0

    for tc in root.iter(f"{{{HP}}}tc"):
        # --- 1. Ensure required hp:tc attributes ---
        if tc.get("name") is None:
            tc.set("name", "")
        if tc.get("header") is None:
            tc.set("header", "0")
        if tc.get("hasMargin") is None:
            # Check if cellMargin exists with non-zero values
            cm = tc.find(f"{{{HP}}}cellMargin", nsmap)
            has_margin = "0"
            if cm is not None:
                for side in ("left", "right", "top", "bottom"):
                    if cm.get(side, "0") != "0":
                        has_margin = "1"
                        break
            tc.set("hasMargin", has_margin)
        if tc.get("editableAtFormMode") is None:
            tc.set("editableAtFormMode", "0")

        # --- 2. Check if hp:p elements are direct children (not wrapped in subList) ---
        direct_paras = [
            child for child in tc
            if child.tag == f"{{{HP}}}p"
        ]
        if not direct_paras:
            continue  # Already wrapped in subList or no paragraphs

        # Has bare <hp:p> elements — need to wrap in <hp:subList>
        fix_count += 1

        # Calculate textWidth from cellSz width minus cellMargin left+right
        cell_sz = tc.find(f"{{{HP}}}cellSz", nsmap)
        cell_margin = tc.find(f"{{{HP}}}cellMargin", nsmap)
        cell_w = int(cell_sz.get("width", "0")) if cell_sz is not None else 0
        margin_lr = 0
        if cell_margin is not None:
            margin_lr = int(cell_margin.get("left", "0")) + int(cell_margin.get("right", "0"))
        text_width = max(cell_w - margin_lr, 0)

        # Create <hp:subList> element
        sub = etree.SubElement(tc, f"{{{HP}}}subList")
        sub.set("id", "")
        sub.set("textDirection", "HORIZONTAL")
        sub.set("lineWrap", "BREAK")
        sub.set("vertAlign", "CENTER")
        sub.set("linkListIDRef", "0")
        sub.set("linkListNextIDRef", "0")
        sub.set("textWidth", str(text_width))
        sub.set("fieldName", "")

        # Move all bare <hp:p> elements into subList
        for p in direct_paras:
            tc.remove(p)
            sub.append(p)

        # Ensure subList is the LAST child of tc
        # (after cellAddr, cellSpan, cellSz, cellMargin)
        # It was appended via SubElement so it's already last

    if fix_count:
        tree.write(str(section0), xml_declaration=True, encoding="UTF-8")
        print(
            f"FIX: Wrapped bare paragraphs in hp:subList for {fix_count} table cell(s) "
            f"(required for mobile Hangul compatibility)",
            file=sys.stderr,
        )


def fix_float_tables(work_dir: Path) -> None:
    """Convert floating tables/objects to inline and remove overlap-causing attributes.

    Fixes:
      1. treatAsChar="0" (floating) → "1" (inline) on all elements
      2. Remove absolute positioning attributes (vertRelTo, horzRelTo, etc.)
      3. Remove textWrap on inline tables (unnecessary, can cause layout issues)
      4. Remove allowOverlap on tables
    """
    section0 = work_dir / "Contents" / "section0.xml"
    if not section0.is_file():
        return

    content = section0.read_text(encoding="utf-8")
    original = content

    # 1. Convert floating tables/objects to inline
    content = content.replace('treatAsChar="0"', 'treatAsChar="1"')

    # 2. Remove absolute positioning attributes from hp:pos elements only
    def _strip_pos_attrs(m: re.Match) -> str:
        tag = m.group(0)
        for attr in ["vertRelTo", "horzRelTo", "vertAlign", "horzAlign",
                      "vertOffset", "horzOffset", "allowOverlap"]:
            tag = re.sub(rf'\s+{attr}="[^"]*"', '', tag)
        return tag
    content = re.sub(r'<hp:pos\b[^>]*/?\s*>', _strip_pos_attrs, content)

    # 3. Remove textWrap from table elements (inline tables don't need it)
    def _strip_text_wrap_on_tbl(m: re.Match) -> str:
        tag = m.group(0)
        if 'treatAsChar="1"' in tag or 'treatAsChar' not in tag:
            return re.sub(r'\s+textWrap="[^"]*"', '', tag)
        return tag
    content = re.sub(r'<hp:tbl\b[^>]*>', _strip_text_wrap_on_tbl, content)

    if content != original:
        section0.write_text(content, encoding="utf-8")
        print("FIX: Converted floating tables to inline, removed overlap-causing attrs", file=sys.stderr)


def validate_table_widths(work_dir: Path) -> None:
    """Fix tables whose width exceeds the printable area.

    Reads page width from <hp:pagePr> and margins from <hp:margin>.
    For each overflowing table:
      1. Scales the table <hp:sz> width down to printable width
      2. Proportionally scales all <hp:cellSz> widths in every row
    """
    section0 = work_dir / "Contents" / "section0.xml"
    if not section0.is_file():
        return

    content = section0.read_text(encoding="utf-8")

    # Extract page width from <hp:pagePr width="...">
    pw_match = re.search(r'<hp:pagePr\b[^>]*\bwidth="(\d+)"', content)
    page_width = int(pw_match.group(1)) if pw_match else 59528

    # Extract margins from <hp:margin ... left="..." right="...">
    margin_match = re.search(r'<hp:margin\b([^>]*)>', content)
    if not margin_match:
        return
    attrs = margin_match.group(1)
    left_match = re.search(r'\bleft="(\d+)"', attrs)
    right_match = re.search(r'\bright="(\d+)"', attrs)
    if not left_match or not right_match:
        return

    left = int(left_match.group(1))
    right = int(right_match.group(1))
    printable_width = page_width - left - right

    fix_count = 0

    def _fix_table(m: re.Match) -> str:
        nonlocal fix_count
        tbl_xml = m.group(0)

        # Read table <hp:sz width="W">
        sz_m = re.search(r'(<hp:sz\s+width=")(\d+)(")', tbl_xml)
        if not sz_m:
            return tbl_xml
        tbl_w = int(sz_m.group(2))
        if tbl_w <= printable_width:
            return tbl_xml

        # Scale factor
        scale = printable_width / tbl_w

        # Scale table width
        tbl_xml = tbl_xml[:sz_m.start()] + sz_m.group(1) + str(printable_width) + sz_m.group(3) + tbl_xml[sz_m.end():]

        # Scale all cellSz widths proportionally
        def _scale_cell(cm: re.Match) -> str:
            old_w = int(cm.group(2))
            new_w = max(1, int(old_w * scale))
            return cm.group(1) + str(new_w) + cm.group(3)
        tbl_xml = re.sub(r'(<hp:cellSz\s+width=")(\d+)(")', _scale_cell, tbl_xml)

        fix_count += 1
        return tbl_xml

    content = re.sub(
        r'<hp:tbl\b[^>]*>.*?</hp:tbl>', _fix_table, content, flags=re.DOTALL,
    )

    if fix_count:
        section0.write_text(content, encoding="utf-8")
        print(
            f"FIX: Scaled {fix_count} overflowing table(s) to fit printable width {printable_width} "
            f"(page={page_width}, left={left}, right={right})",
            file=sys.stderr,
        )


def validate_xml(filepath: Path) -> None:
    """Check that an XML file is well-formed. Raises on error."""
    try:
        etree.parse(str(filepath))
    except etree.XMLSyntaxError as e:
        raise SystemExit(f"Malformed XML in {filepath.name}: {e}")


def strip_placeholders(section_path: Path) -> None:
    """Remove any unreplaced {{placeholder}} patterns from section XML."""
    import re
    content = section_path.read_text(encoding='utf-8')
    cleaned = re.sub(r'\{\{[^}]*\}\}', '', content)
    if content != cleaned:
        section_path.write_text(cleaned, encoding='utf-8')


def strip_linesegarray(section_path: Path) -> None:
    """Remove all <hp:linesegarray>...</hp:linesegarray> from section XML.

    linesegarray is a layout cache that Hangul recalculates on open.
    Stale/incorrect values cause character spacing overlap (자간 겹침).
    See: https://forum.developer.hancom.com/t/hwpx-linesegarray-lineseg-textpos/1677
    """
    import re
    content = section_path.read_text(encoding='utf-8')
    cleaned = re.sub(r'<hp:linesegarray>.*?</hp:linesegarray>', '', content, flags=re.DOTALL)
    if content != cleaned:
        section_path.write_text(cleaned, encoding='utf-8')


def update_metadata(content_hpf: Path, title: str | None, creator: str | None) -> None:
    """Update title and/or creator in content.hpf."""
    if not title and not creator:
        return

    tree = etree.parse(str(content_hpf))
    root = tree.getroot()
    ns = {"opf": "http://www.idpf.org/2007/opf/"}

    if title:
        title_el = root.find(".//opf:title", ns)
        if title_el is not None:
            title_el.text = title

    now = datetime.now(timezone.utc)
    iso_now = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    for meta in root.findall(".//opf:meta", ns):
        name = meta.get("name", "")
        if creator and name == "creator":
            meta.text = creator
        elif creator and name == "lastsaveby":
            meta.text = creator
        elif name == "CreatedDate":
            meta.text = iso_now
        elif name == "ModifiedDate":
            meta.text = iso_now
        elif name == "date":
            meta.text = now.strftime("%Y년 %m월 %d일")

    etree.indent(root, space="  ")
    tree.write(
        str(content_hpf),
        pretty_print=True,
        xml_declaration=True,
        encoding="UTF-8",
    )


def pack_hwpx(input_dir: Path, output_path: Path) -> None:
    """Create HWPX archive with mimetype as first entry (ZIP_STORED)."""
    mimetype_file = input_dir / "mimetype"
    if not mimetype_file.is_file():
        raise SystemExit(f"Missing 'mimetype' in {input_dir}")

    all_files = sorted(
        p.relative_to(input_dir).as_posix()
        for p in input_dir.rglob("*")
        if p.is_file()
    )

    with ZipFile(output_path, "w", ZIP_DEFLATED) as zf:
        zf.write(mimetype_file, "mimetype", compress_type=ZIP_STORED)
        for rel_path in all_files:
            if rel_path == "mimetype":
                continue
            zf.write(input_dir / rel_path, rel_path, compress_type=ZIP_DEFLATED)


def validate_hwpx(hwpx_path: Path) -> list[str]:
    """Quick structural validation of the output HWPX."""
    errors: list[str] = []
    required = [
        "mimetype",
        "Contents/content.hpf",
        "Contents/header.xml",
        "Contents/section0.xml",
    ]

    try:
        from zipfile import BadZipFile
        zf = ZipFile(hwpx_path, "r")
    except BadZipFile:
        return [f"Not a valid ZIP: {hwpx_path}"]

    with zf:
        names = zf.namelist()
        for r in required:
            if r not in names:
                errors.append(f"Missing: {r}")

        if "mimetype" in names:
            content = zf.read("mimetype").decode("utf-8").strip()
            if content != "application/hwp+zip":
                errors.append(f"Bad mimetype content: {content}")
            if names[0] != "mimetype":
                errors.append("mimetype is not the first ZIP entry")
            info = zf.getinfo("mimetype")
            if info.compress_type != ZIP_STORED:
                errors.append("mimetype is not ZIP_STORED")

        for name in names:
            if name.endswith(".xml") or name.endswith(".hpf"):
                try:
                    etree.fromstring(zf.read(name))
                except etree.XMLSyntaxError as e:
                    errors.append(f"Malformed XML: {name}: {e}")

    return errors


def build(
    template: str | None,
    header_override: Path | None,
    section_override: Path | None,
    title: str | None,
    creator: str | None,
    output: Path,
) -> None:
    """Main build logic."""

    if not BASE_DIR.is_dir():
        raise SystemExit(f"Base template not found: {BASE_DIR}")

    with tempfile.TemporaryDirectory() as tmpdir:
        work = Path(tmpdir) / "build"

        # 1. Copy base template
        shutil.copytree(BASE_DIR, work)

        # 2. Apply template overlay
        if template:
            overlay_dir = TEMPLATES_DIR / template
            if not overlay_dir.is_dir():
                raise SystemExit(
                    f"Template '{template}' not found. "
                    f"Available: {', '.join(AVAILABLE_TEMPLATES)}"
                )
            for overlay_file in overlay_dir.iterdir():
                if overlay_file.is_file() and overlay_file.suffix == ".xml":
                    # Always skip template header.xml — use base header.xml only.
                    # Template headers often contain AI-generated garbage style
                    # definitions that defeat the validate_char_pr_refs() fix.
                    if overlay_file.name == "header.xml":
                        continue
                    dest = work / "Contents" / overlay_file.name
                    shutil.copy2(overlay_file, dest)

        # 3. Apply custom overrides
        if header_override:
            if not header_override.is_file():
                raise SystemExit(f"Header file not found: {header_override}")
            shutil.copy2(header_override, work / "Contents" / "header.xml")

        if section_override:
            if not section_override.is_file():
                raise SystemExit(f"Section file not found: {section_override}")
            shutil.copy2(section_override, work / "Contents" / "section0.xml")

        # 3b. Strip any unreplaced placeholders from section XML
        strip_placeholders(work / "Contents" / "section0.xml")

        # 3b-1. 한국어 텍스트 품질 최적화 (개조식 변환, 접미사 정리, 장문 분리)
        # 가정통신문(parent-newsletter)은 학부모 대상 서술식(~합니다) 유지
        SEOSUL_TEMPLATES = {"parent-newsletter"}
        text_style = "seosul" if template in SEOSUL_TEMPLATES else "gaejosk"
        optimize_section_xml(work / "Contents" / "section0.xml", style=text_style)

        # 3c. Strip linesegarray (layout cache) to prevent character spacing overlap
        strip_linesegarray(work / "Contents" / "section0.xml")

        # 4. Update metadata
        update_metadata(work / "Contents" / "content.hpf", title, creator)

        # 5. Validate all XML files
        for xml_file in work.rglob("*.xml"):
            validate_xml(xml_file)
        for hpf_file in work.rglob("*.hpf"):
            validate_xml(hpf_file)

        # 5b. 네임스페이스 정규화 (AI 생성 XML의 누락된 선언 보충)
        fix_namespaces(work / "Contents" / "section0.xml")
        fix_namespaces(work / "Contents" / "header.xml")

        # 6. Validate and fix styles & tables
        validate_char_pr_refs(work)
        validate_para_pr_refs(work)
        validate_border_fills(work)
        ensure_sublist(work)
        fix_float_tables(work)
        validate_table_widths(work)

        # 7. Pack
        pack_hwpx(work, output)

    # 8. Final validation
    errors = validate_hwpx(output)
    if errors:
        print(f"WARNING: {output} has issues:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
    else:
        print(f"VALID: {output}")
        print(f"  Template: {template or 'base'}")
        if header_override:
            print(f"  Header: {header_override}")
        if section_override:
            print(f"  Section: {section_override}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build HWPX document from templates and XML overrides"
    )
    parser.add_argument(
        "--template", "-t",
        choices=AVAILABLE_TEMPLATES,
        help="Document type template to use as overlay",
    )
    parser.add_argument(
        "--header",
        type=Path,
        help="Custom header.xml to override",
    )
    parser.add_argument(
        "--section",
        type=Path,
        help="Custom section0.xml to override",
    )
    parser.add_argument(
        "--title",
        help="Document title (updates content.hpf metadata)",
    )
    parser.add_argument(
        "--creator",
        help="Document creator (updates content.hpf metadata)",
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        required=True,
        help="Output .hwpx file path",
    )
    args = parser.parse_args()

    build(
        template=args.template,
        header_override=args.header,
        section_override=args.section,
        title=args.title,
        creator=args.creator,
        output=args.output,
    )


if __name__ == "__main__":
    main()
