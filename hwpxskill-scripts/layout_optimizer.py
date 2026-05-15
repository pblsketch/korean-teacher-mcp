#!/usr/bin/env python3
"""Conservative text layout normalization for generated HWPX section XML.

This module intentionally avoids aggressive Korean rewriting. HWPX generation
must preserve teacher-authored wording, legal/public-document phrasing, and
placeholders. The optimizer therefore only applies safe, XML-level text cleanup
that reduces obvious spacing artifacts without changing sentence meaning.
"""

from __future__ import annotations

import re
from pathlib import Path

from lxml import etree

HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
NS = {"hp": HP_NS}


def _normalize_text(text: str, style: str) -> str:
    """Apply meaning-preserving cleanup to a single hp:t text node."""
    if not text:
        return text

    # Preserve deliberate leading/trailing whitespace used in signature lines.
    leading = re.match(r"^\s*", text).group(0)
    trailing = re.search(r"\s*$", text).group(0)
    core = text[len(leading): len(text) - len(trailing) if trailing else len(text)]

    # Normalize accidental excessive internal spaces/tabs while keeping newlines.
    core = re.sub(r"[ \t]{3,}", "  ", core)
    # Remove spaces just inside Korean-style punctuation artifacts.
    core = re.sub(r"\s+([,.;:!?])", r"\1", core)
    core = re.sub(r"([([{<])\s+", r"\1", core)
    core = re.sub(r"\s+([\])}>])", r"\1", core)

    # `style` is reserved for future policies. For now both 'gaejosk' and
    # 'seosul' use the same conservative cleanup to avoid unintended rewrites.
    return leading + core + trailing


def optimize_section_xml(path: str | Path, style: str = "gaejosk") -> bool:
    """Normalize hp:t text nodes in a section XML file.

    Returns True if the file changed. If XML parsing fails, the caller's normal
    validation step should surface the precise parse error, so this function does
    not mask it.
    """
    xml_path = Path(path)
    parser = etree.XMLParser(remove_blank_text=False, resolve_entities=False)
    tree = etree.parse(str(xml_path), parser)
    changed = False

    for text_el in tree.xpath("//hp:t", namespaces=NS):
        old = text_el.text
        if old is None:
            continue
        new = _normalize_text(old, style)
        if new != old:
            text_el.text = new
            changed = True

    if changed:
        tree.write(str(xml_path), encoding="UTF-8", xml_declaration=True)
    return changed


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Conservatively optimize HWPX section XML text")
    parser.add_argument("xml", type=Path)
    parser.add_argument("--style", default="gaejosk", choices=["gaejosk", "seosul"])
    args = parser.parse_args()
    changed = optimize_section_xml(args.xml, style=args.style)
    print("optimized" if changed else "ok")
