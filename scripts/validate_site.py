#!/usr/bin/env python3
"""Validate the static ByteWave site using only the Python standard library."""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://bytewaveai.com"
REQUIRED = {
    "description", "og:title", "og:description", "og:url", "og:image",
    "og:image:alt", "twitter:card", "twitter:title", "twitter:description",
    "twitter:image", "twitter:image:alt",
}
PLACEHOLDERS = [r"\[date\]", r"\[last name\]", r"\[N\]", r"TODO", r"Coming soon", r"href=[\"']#[\"']"]


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""; self.in_title = False; self.h1 = 0; self.metas = {}; self.canonicals = []
        self.links = []; self.ids = set(); self.images = []; self.jsonld = []; self.in_jsonld = False; self.buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title": self.in_title = True
        if tag == "h1": self.h1 += 1
        if "id" in a: self.ids.add(a["id"])
        if tag == "meta":
            key = a.get("name") or a.get("property")
            if key: self.metas[key.lower()] = a.get("content", "")
        if tag == "link" and "canonical" in a.get("rel", "").lower(): self.canonicals.append(a.get("href", ""))
        if tag == "a" and "href" in a: self.links.append(a["href"])
        if tag == "img": self.images.append(a)
        if tag == "script" and a.get("type") == "application/ld+json": self.in_jsonld = True; self.buf = []

    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
        if tag == "script" and self.in_jsonld: self.jsonld.append("".join(self.buf)); self.in_jsonld = False

    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.in_jsonld: self.buf.append(data)


def local_path(url: str, source: Path) -> tuple[Path, str]:
    parsed = urlparse(url); path = unquote(parsed.path); frag = parsed.fragment
    if not path: target = source
    elif path.endswith("/"): target = ROOT / path.lstrip("/") / "index.html"
    else: target = ROOT / path.lstrip("/")
    return target, frag


def main() -> int:
    errors = []; pages = {}; canon = {}; titles = {}; descs = {}
    for file in sorted(ROOT.rglob("*.html")):
        if ".git" in file.parts: continue
        raw = file.read_text(encoding="utf-8"); p = PageParser(); p.feed(raw); pages[file] = p
        noindex = "noindex" in p.metas.get("robots", "").lower()
        if not noindex:
            rel = file.relative_to(ROOT)
            if len(p.canonicals) != 1: errors.append(f"{rel}: expected one canonical")
            elif p.canonicals[0] in canon: errors.append(f"{rel}: duplicate canonical with {canon[p.canonicals[0]]}")
            else: canon[p.canonicals[0]] = file
            if p.h1 != 1: errors.append(f"{rel}: expected one H1, found {p.h1}")
            if not p.title.strip(): errors.append(f"{rel}: missing title")
            if not p.metas.get("description"): errors.append(f"{rel}: missing description")
            for key in REQUIRED:
                if not p.metas.get(key): errors.append(f"{rel}: missing {key}")
            for val, pool, label in [(p.title.strip(), titles, "title"), (p.metas.get("description", ""), descs, "description")]:
                if val in pool: errors.append(f"{rel}: duplicate {label} with {pool[val]}")
                pool[val] = rel
        for data in p.jsonld:
            try: json.loads(data)
            except Exception as exc: errors.append(f"{file.relative_to(ROOT)}: invalid JSON-LD: {exc}")
        for img in p.images:
            if "alt" not in img: errors.append(f"{file.relative_to(ROOT)}: image missing alt")
            if "width" not in img or "height" not in img: errors.append(f"{file.relative_to(ROOT)}: image missing dimensions")
        for pattern in PLACEHOLDERS:
            if re.search(pattern, raw, re.I): errors.append(f"{file.relative_to(ROOT)}: placeholder/fake link matches {pattern}")

    for file, p in pages.items():
        for href in p.links:
            parsed = urlparse(href)
            if parsed.scheme in {"http", "https", "mailto", "tel"} and parsed.netloc != "bytewaveai.com": continue
            if parsed.scheme in {"mailto", "tel"}: continue
            target, frag = local_path(href, file)
            if not target.exists(): errors.append(f"{file.relative_to(ROOT)}: broken link {href}"); continue
            if frag and target.suffix == ".html" and frag not in pages.get(target, PageParser()).ids:
                errors.append(f"{file.relative_to(ROOT)}: broken fragment {href}")

    tree = ET.parse(ROOT / "sitemap.xml"); ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap = {n.text for n in tree.findall("s:url/s:loc", ns)}
    canonical_set = set(canon)
    for url in sorted(sitemap - canonical_set): errors.append(f"sitemap URL is not canonical indexable page: {url}")
    for url in sorted(canonical_set - sitemap): errors.append(f"canonical indexable page missing from sitemap: {url}")
    if errors:
        print("Site validation failed:", *[f"\n- {e}" for e in errors]); return 1
    print(f"Validated {len(pages)} HTML files and {len(sitemap)} sitemap URLs successfully."); return 0


if __name__ == "__main__": sys.exit(main())
