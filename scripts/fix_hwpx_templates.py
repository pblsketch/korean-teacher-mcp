#!/usr/bin/env python3
"""Fix HWPX charPrIDRef issues using pure regex (no lxml).

Preserves exact XML formatting - only changes attribute values.

PBL: charPrIDRef="5" outside tables -> "7" (first=title) / "8" (rest=subtitle)
Discussion: charPrIDRef="7" inside tables -> "9" (bold body)

Uses robust depth tracking: monitors both <hp:tbl> and <hp:tc> tags.
A run is "inside table" if it's between <hp:tbl> open and </hp:tbl> close.
"""

import re
from pathlib import Path

TEMPLATES = Path(__file__).resolve().parent.parent / "hwpxskill-templates"

# Pattern to find XML tags (opening, closing, self-closing)
TAG_RE = re.compile(r"<(/?)hp:(tbl|tc|run)\b([^>]*)(/?)>")


def scan_and_fix_pbl(xml: str) -> tuple[str, int]:
    """Fix PBL: charPrIDRef=5 outside tables -> 7/8, charPrIDRef=7 inside tables -> 9."""
    first_title = True
    changes = 0
    tbl_depth = 0

    def replacer(m):
        nonlocal tbl_depth, first_title, changes
        is_close = m.group(1) == "/"
        tagname = m.group(2)
        attrs = m.group(3)
        is_selfclose = m.group(4) == "/"

        # Track table depth
        if tagname == "tbl":
            if is_close:
                tbl_depth -= 1
            elif not is_selfclose:
                tbl_depth += 1

        if tagname == "run" and not is_close:
            new_attrs = None

            # Fix charPrIDRef=5 OUTSIDE tables -> 7/8
            if tbl_depth == 0 and 'charPrIDRef="5"' in attrs:
                if first_title:
                    new_attrs = attrs.replace('charPrIDRef="5"', 'charPrIDRef="7"')
                    first_title = False
                else:
                    new_attrs = attrs.replace('charPrIDRef="5"', 'charPrIDRef="8"')

            # Fix charPrIDRef=7 INSIDE tables -> 9 (bold body)
            elif tbl_depth > 0 and 'charPrIDRef="7"' in attrs:
                new_attrs = attrs.replace('charPrIDRef="7"', 'charPrIDRef="9"')

            if new_attrs is not None:
                changes += 1
                close = "/" if is_selfclose else ""
                return f"<hp:run{new_attrs}{close}>"

        return m.group(0)

    result = TAG_RE.sub(replacer, xml)
    return result, changes


def scan_and_fix_discussion(xml: str) -> tuple[str, int]:
    """Fix Discussion: charPrIDRef=7 inside tables -> 9."""
    changes = 0
    tbl_depth = 0

    def replacer(m):
        nonlocal tbl_depth, changes
        is_close = m.group(1) == "/"
        tagname = m.group(2)
        attrs = m.group(3)
        is_selfclose = m.group(4) == "/"

        if tagname == "tbl":
            if is_close:
                tbl_depth -= 1
            elif not is_selfclose:
                tbl_depth += 1

        # Fix charPrIDRef=7 in <hp:run> INSIDE tables
        if tagname == "run" and not is_close and tbl_depth > 0:
            if 'charPrIDRef="7"' in attrs:
                new_attrs = attrs.replace('charPrIDRef="7"', 'charPrIDRef="9"')
                changes += 1
                close = "/" if is_selfclose else ""
                return f"<hp:run{new_attrs}{close}>"

        return m.group(0)

    result = TAG_RE.sub(replacer, xml)
    return result, changes


def process(name, path, fix_fn):
    print(f"\n=== {name}: {path.name} ===")
    xml = path.read_text(encoding="utf-8")
    fixed, changes = fix_fn(xml)
    if changes > 0:
        path.write_text(fixed, encoding="utf-8")
        delta = len(fixed) - len(xml)
        print(f"  {changes} charPrIDRef changes")
        print(f"  Size: {len(xml)} -> {len(fixed)} (delta={delta})")
    else:
        print("  No changes needed")
    return changes


if __name__ == "__main__":
    total = 0
    total += process("PBL", TEMPLATES / "pbl" / "section0.xml", scan_and_fix_pbl)
    total += process("Discussion", TEMPLATES / "discussion" / "section0.xml", scan_and_fix_discussion)
    print(f"\nTotal: {total} changes")
