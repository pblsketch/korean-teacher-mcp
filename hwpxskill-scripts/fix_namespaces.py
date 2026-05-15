#!/usr/bin/env python3
"""Namespace repair helpers for HWPX XML files.

The HWPX builder mostly works with repository-managed XML templates, but
`export_hwpx` can also receive AI/user-generated `section0.xml`. In that path
it is easy to produce prefixed elements such as `<hs:sec>` or `<hp:p>` while
forgetting the matching namespace declarations on the document root.

`fix_namespaces()` performs a conservative textual repair: it only adds known
OWPML namespace declarations when the prefix is used and the declaration is
absent. It does not rewrite element names, reorder content, or pretty-print the
file, so it is safe to run as a final normalization step in `build_hwpx.py`.
"""

from __future__ import annotations

import re
from pathlib import Path

# Known namespaces used by the templates and generated section XML.
KNOWN_NAMESPACES: dict[str, str] = {
    "hs": "http://www.hancom.co.kr/hwpml/2011/section",
    "hp": "http://www.hancom.co.kr/hwpml/2011/paragraph",
    "hh": "http://www.hancom.co.kr/hwpml/2011/head",
    "hc": "http://www.hancom.co.kr/hwpml/2011/core",
    "ha": "http://www.hancom.co.kr/hwpml/2011/app",
    "hp10": "http://www.hancom.co.kr/hwpml/2016/paragraph",
}


def _root_start_tag_span(xml: str) -> tuple[int, int] | None:
    """Return the span of the root start tag, ignoring XML declarations/comments."""
    pos = 0
    while True:
        match = re.search(r"<[^!?][^>]*>", xml[pos:])
        if not match:
            return None
        start = pos + match.start()
        end = pos + match.end()
        tag = xml[start:end]
        # Skip closing tags just in case malformed leading text exists.
        if not tag.startswith("</"):
            return start, end
        pos = end


def fix_namespaces(path: str | Path) -> bool:
    """Add missing known namespace declarations to an XML file.

    Parameters
    ----------
    path:
        XML file to normalize.

    Returns
    -------
    bool
        True when the file was modified, False when no change was needed.
    """
    xml_path = Path(path)
    text = xml_path.read_text(encoding="utf-8")

    missing: list[tuple[str, str]] = []
    for prefix, uri in KNOWN_NAMESPACES.items():
        # Prefix is used in element/attribute names but not declared anywhere.
        if re.search(rf"[</\s]{re.escape(prefix)}:", text) and f"xmlns:{prefix}=" not in text:
            missing.append((prefix, uri))

    if not missing:
        return False

    span = _root_start_tag_span(text)
    if span is None:
        return False

    start, end = span
    root_tag = text[start:end]
    # Self-closing root is not expected for HWPX sections/headers, but keep the
    # insertion before '/>' if it ever appears.
    insert_at = len(root_tag) - (2 if root_tag.endswith("/>") else 1)
    additions = "".join(f' xmlns:{prefix}="{uri}"' for prefix, uri in missing)
    fixed_root_tag = root_tag[:insert_at] + additions + root_tag[insert_at:]

    fixed = text[:start] + fixed_root_tag + text[end:]
    xml_path.write_text(fixed, encoding="utf-8")
    return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Add missing known HWPX namespace declarations")
    parser.add_argument("xml", type=Path)
    args = parser.parse_args()
    changed = fix_namespaces(args.xml)
    print("fixed" if changed else "ok")
