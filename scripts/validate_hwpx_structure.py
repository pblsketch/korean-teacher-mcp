#!/usr/bin/env python3
"""Validate HWPX structural rules - final version.

HWPX structure: section > p > run > tbl > tr > tc
borderFillIDRef is on tc element directly.
"""
import zipfile
import re
from collections import Counter
from pathlib import Path
from lxml import etree

HOME = Path.home()
files = {
    "PBL": HOME / "Downloads" / "pbl_test.hwpx",
    "Discussion": HOME / "Downloads" / "discussion_test.hwpx",
}

HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HC = "http://www.hancom.co.kr/hwpml/2011/core"


def local(el):
    return el.tag.split("}")[-1] if "}" in el.tag else el.tag


def is_inside_table(el):
    p = el.getparent()
    while p is not None:
        if local(p) in ("tbl", "tc"):
            return True
        p = p.getparent()
    return False


def get_run_text(run):
    parts = []
    for t in run.iter(f"{{{HC}}}t"):
        if t.text:
            parts.append(t.text)
    return "".join(parts)[:60]


def check(name, path):
    print(f"\n{'='*70}")
    print(f"  [{name}] {path.name}")
    print(f"{'='*70}")

    with zipfile.ZipFile(path, "r") as zf:
        sec_xml = zf.read("Contents/section0.xml")
        hdr_str = zf.read("Contents/header.xml").decode("utf-8")

    root = etree.fromstring(sec_xml)
    all_p = list(root.iter(f"{{{HP}}}p"))
    all_tbl = list(root.iter(f"{{{HP}}}tbl"))
    results = {}

    # ── 1. Titles as independent paragraphs outside tables ──
    print("\n[1] 제목/소제목 표 밖 독립 단락 확인 (charPrIDRef 7=제목, 8=소제목)")
    out_titles, in_titles = [], []
    for p in all_p:
        for run in p.iter(f"{{{HP}}}run"):
            cpr = run.get("charPrIDRef", "")
            if cpr in ("7", "8"):
                txt = get_run_text(run)
                (in_titles if is_inside_table(p) else out_titles).append((cpr, txt))

    for cpr, txt in out_titles[:5]:
        lbl = "제목" if cpr == "7" else "소제목"
        print(f"    OK [{lbl}] \"{txt}\"")
    if len(out_titles) > 5:
        print(f"       ... 외 {len(out_titles)-5}개")
    for cpr, txt in in_titles[:3]:
        lbl = "제목" if cpr == "7" else "소제목"
        print(f"    XX [{lbl}] 표 안: \"{txt}\"")
    if len(in_titles) > 3:
        print(f"       ... 외 {len(in_titles)-3}개")

    if not out_titles and not in_titles:
        cprs = Counter(r.get("charPrIDRef","?") for r in root.iter(f"{{{HP}}}run"))
        print(f"    !! 7/8 미발견. charPrIDRef 분포: {dict(cprs)}")
    pass1 = len(in_titles) == 0 and len(out_titles) > 0
    print(f"    => {'PASS' if pass1 else 'FAIL'} (밖 {len(out_titles)}, 안 {len(in_titles)})")
    results["1_titles_outside"] = pass1

    # ── 2. No nested tables ──
    print(f"\n[2] 중첩 표 금지")
    nested = 0
    for tbl in all_tbl:
        cnt = sum(1 for _ in tbl.iter(f"{{{HP}}}tbl")) - 1
        nested += cnt
    pass2 = nested == 0
    print(f"    표 {len(all_tbl)}개, 중첩 {nested}개")
    print(f"    => {'PASS' if pass2 else 'FAIL'}")
    results["2_no_nested"] = pass2

    # ── 3. No wrapper table ──
    print(f"\n[3] 래퍼 표 금지 (단락-표 교차 구조)")
    # In HWPX, tables live inside p > run > tbl
    # A "wrapper table" means one table wraps everything
    # Check: paragraphs exist outside tables
    p_in_tbl = set()
    for tbl in all_tbl:
        for p in tbl.iter(f"{{{HP}}}p"):
            p_in_tbl.add(id(p))
    p_outside = sum(1 for p in all_p if id(p) not in p_in_tbl)

    # Count top-level p elements that contain tables vs plain text
    top_p_with_tbl = 0
    top_p_text_only = 0
    for child in root:
        if local(child) == "p":
            has_tbl = any(True for _ in child.iter(f"{{{HP}}}tbl"))
            if has_tbl:
                top_p_with_tbl += 1
            else:
                top_p_text_only += 1

    is_wrapper = (len(all_tbl) == 1 and top_p_text_only <= 1)
    pass3 = not is_wrapper
    print(f"    최상위 단락: {top_p_text_only}(텍스트) + {top_p_with_tbl}(표 포함)")
    print(f"    표 밖 단락: {p_outside}개")
    print(f"    => {'PASS' if pass3 else 'FAIL'}")
    results["3_no_wrapper"] = pass3

    # ── 4. borderFillIDRef on tc ──
    print(f"\n[4] borderFillIDRef (헤더행=4/회색, 데이터행=3/흰색)")
    # borderFillIDRef is attribute of tc element
    all_tc_refs = Counter()
    border_ok = True
    issues = []

    for i, tbl in enumerate(all_tbl):
        rows = [ch for ch in tbl if local(ch) == "tr"]
        for j, tr in enumerate(rows):
            cells = [ch for ch in tr if local(ch) == "tc"]
            refs = set()
            for tc in cells:
                ref = tc.get("borderFillIDRef", "?")
                refs.add(ref)
                all_tc_refs[ref] += 1

            expected = "4" if j == 0 else "3"
            ok = refs == {expected}
            if not ok:
                border_ok = False
                if len(issues) < 10:
                    row_type = "헤더" if j == 0 else "데이터"
                    issues.append(
                        f"    XX 표{i+1} 행{j+1}({row_type}): "
                        f"bf={','.join(sorted(refs))} (기대: {expected})"
                    )

    print(f"    borderFillIDRef tc 분포: {dict(all_tc_refs)}")
    has_std_4 = "4" in all_tc_refs
    has_std_3 = "3" in all_tc_refs
    print(f"    표준값 사용: 3={has_std_3}, 4={has_std_4}")

    for iss in issues:
        print(iss)
    if len(issues) >= 10:
        print(f"       ... (이슈 추가 존재)")

    pass4 = border_ok
    print(f"    => {'PASS' if pass4 else 'FAIL'}")
    results["4_border_fill"] = pass4

    # ── 5. Font unification ──
    print(f"\n[5] 폰트 통일 (함초롬바탕)")
    faces = sorted(set(re.findall(r'face="([^"]+)"', hdr_str)))
    print(f"    선언 폰트: {', '.join(faces)}")

    has_ham = any("\ud568\ucd08\ub86c\ubc14\ud0d5" in f for f in faces)
    print(f"    \ud568\ucd08\ub86c\ubc14\ud0d5 포함: {'예' if has_ham else '아니오'}")

    # Check if non-standard fonts are used in charPr definitions
    hangul_ids = Counter(re.findall(r'hangul="(\d+)"', hdr_str))
    print(f"    hangul fontRef IDs: {dict(hangul_ids)}")

    pass5 = has_ham
    print(f"    => {'PASS' if pass5 else 'FAIL'}")
    results["5_font_unified"] = pass5

    # Summary
    print(f"\n  {'~'*40}")
    total = len(results)
    passed = sum(v for v in results.values())
    for k, v in results.items():
        print(f"  {'PASS' if v else 'FAIL'}  {k}")
    print(f"  => {passed}/{total}")
    return results


all_res = {}
for n, p in files.items():
    all_res[n] = check(n, p)

print(f"\n{'='*70}")
print(f"  FINAL SUMMARY")
print(f"{'='*70}")
for n, r in all_res.items():
    ok = sum(v for v in r.values())
    tot = len(r)
    fails = [k for k, v in r.items() if not v]
    s = "ALL PASS" if ok == tot else f"{ok}/{tot} FAIL: {', '.join(fails)}"
    print(f"  [{n}] {s}")
print(f"{'='*70}")
