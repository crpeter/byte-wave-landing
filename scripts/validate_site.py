#!/usr/bin/env python3
"""Validate the static ByteWave site using only the Python standard library."""
from __future__ import annotations

import hashlib
from fnmatch import fnmatchcase
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
PLACEHOLDERS = [r"\[date\]", r"\[last name\]", r"\[N\]", r"TODO", r"href=[\"']#[\"']"]


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""; self.in_title = False; self.h1 = 0; self.metas = {}; self.canonicals = []
        self.links = []; self.media = []; self.stylesheets = []; self.ids = set(); self.images = []; self.jsonld = []; self.in_jsonld = False; self.buf = []
        self.main_count = 0; self.footer_links = []; self.in_footer = False
        self.updated_dates = []; self.in_meta = False; self.meta_tag = None; self.meta_buf = []; self.meta_texts = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "main": self.main_count += 1
        if tag == "footer": self.in_footer = True
        if tag in {"p", "div"} and "meta" in a.get("class", "").split():
            self.in_meta = True; self.meta_tag = tag; self.meta_buf = []
        if tag == "a" and self.in_footer: self.footer_links.append(a.get("href", ""))
        if tag == "title": self.in_title = True
        if tag == "h1": self.h1 += 1
        if "id" in a: self.ids.add(a["id"])
        if tag == "meta":
            key = a.get("name") or a.get("property") or a.get("http-equiv")
            if key: self.metas[key.lower()] = a.get("content", "")
        if tag == "link" and "canonical" in a.get("rel", "").lower(): self.canonicals.append(a.get("href", ""))
        if tag == "link" and "stylesheet" in a.get("rel", "").lower(): self.stylesheets.append(a.get("href", ""))
        if tag == "a" and "href" in a: self.links.append(a["href"])
        if tag == "img": self.images.append(a)
        if tag in {"img", "video", "source"}:
            self.media.extend(a[key] for key in ("src", "poster", "data-stream", "data-compatible") if a.get(key))
        if tag == "script" and a.get("type") == "application/ld+json": self.in_jsonld = True; self.buf = []

    def handle_endtag(self, tag):
        if tag == "footer": self.in_footer = False
        if self.in_meta and tag == self.meta_tag:
            self.meta_texts.append("".join(self.meta_buf)); self.in_meta = False
        if tag == "title": self.in_title = False
        if tag == "script" and self.in_jsonld: self.jsonld.append("".join(self.buf)); self.in_jsonld = False

    def handle_data(self, data):
        if self.in_meta: self.meta_buf.append(data)
        if self.in_title: self.title += data
        if self.in_jsonld: self.buf.append(data)


def local_path(url: str, source: Path) -> tuple[Path, str]:
    parsed = urlparse(url); path = unquote(parsed.path); frag = parsed.fragment
    if not path: target = source
    elif path.endswith("/"): target = ROOT / path.lstrip("/") / "index.html"
    else: target = ROOT / path.lstrip("/")
    return target, frag


def main() -> int:
    errors = []; pages = {}; canon = {}; titles = {}; descs = {}; redirects = {}
    # This site's config uses a top-level YAML list of unquoted exclusion paths.
    config = (ROOT / "_config.yml").read_text(encoding="utf-8")
    exclude_block = re.search(r"^exclude:\s*\n((?:[ \t]+[^\n]*\n)*)", config, re.M)
    excludes = re.findall(r"^\s+-\s+([^\s#]+)\s*$", exclude_block[1], re.M) if exclude_block else []
    for file in sorted(ROOT.rglob("*.html")):
        if ".git" in file.parts: continue
        raw = file.read_text(encoding="utf-8"); p = PageParser(); p.feed(raw); pages[file] = p
        noindex = "noindex" in p.metas.get("robots", "").lower()
        refresh = p.metas.get("refresh")
        if refresh is not None and not noindex:
            rel = file.relative_to(ROOT)
            match = re.fullmatch(r"0\s*;\s*url=(https://bytewaveai\.com/[^\s]+)", refresh, re.I)
            if not match:
                errors.append(f"{rel}: expected an immediate redirect to a ByteWave URL")
            else:
                destination = match.group(1)
                redirects[file] = destination
                if p.canonicals != [destination]: errors.append(f"{rel}: redirect canonical must match destination")
                if destination not in p.links: errors.append(f"{rel}: redirect needs a fallback link to destination")
        if not noindex and refresh is None:
            rel = file.relative_to(ROOT)
            if len(p.canonicals) != 1: errors.append(f"{rel}: expected one canonical")
            elif p.canonicals[0] in canon: errors.append(f"{rel}: duplicate canonical with {canon[p.canonicals[0]]}")
            else: canon[p.canonicals[0]] = file
            if p.h1 != 1: errors.append(f"{rel}: expected one H1, found {p.h1}")
            if (file.parent == ROOT / "blog" and file.name != "index.html") or (ROOT / "tutorials" in file.parents and file != ROOT / "tutorials/index.html"):
                article = re.search(r"<article\b[^>]*>(.*?)</article>", raw, re.S)
                content = article.group(1) if article else ""
                notices = list(re.finditer(
                    r'<(?P<tag>p|div)\b[^>]*class="[^"]*\bai-disclosure\b[^"]*"[^>]*>'
                    r'(?P<text>.*?)</(?P=tag)>', content, re.S))
                if len(notices) != 1:
                    errors.append(f"{rel}: expected one visible AI disclosure in the article")
                else:
                    notice = notices[0]
                    text = re.sub(r"<[^>]+>", "", notice.group("text"))
                    if "AI disclosure:" not in text or "generated with an AI language model (LLM)" not in text:
                        errors.append(f"{rel}: disclosure must explicitly identify AI-generated text")
                    prefix = re.sub(r'<(?P<tag>p|div) class="(?:eyebrow|meta)">.*?</(?P=tag)>', "", content[:notice.start()], flags=re.S)
                    if re.search(r"<(?:p|h2|ul|ol|table)\b", prefix):
                        errors.append(f"{rel}: AI disclosure must precede the article body")
            if not p.title.strip(): errors.append(f"{rel}: missing title")
            if p.main_count != 1: errors.append(f"{rel}: expected one main landmark")
            if "#main" not in p.links or "main" not in p.ids: errors.append(f"{rel}: missing skip link or target")
            required_footer = {"/", "/gallery/", "/tutorials/", "/blog/", "/about.html", "/press.html", "/privacy.html", "/free-expression.html"}
            if not required_footer.issubset(p.footer_links): errors.append(f"{rel}: missing shared footer links")
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

    for file, destination in redirects.items():
        target, frag = local_path(destination, file)
        if frag or canon.get(destination) != target:
            errors.append(f"{file.relative_to(ROOT)}: redirect destination must be a canonical indexable page")

    for file, p in pages.items():
        for href in set(p.links + p.media):
            parsed = urlparse(href)
            if parsed.scheme in {"http", "https", "mailto", "tel"} and parsed.netloc != "bytewaveai.com": continue
            if parsed.scheme in {"mailto", "tel"}: continue
            target, frag = local_path(href, file)
            if not target.exists(): errors.append(f"{file.relative_to(ROOT)}: broken link {href}"); continue
            # Jekyll 3 EntryFilter matches both globs and literal path prefixes.
            # A bare 'warped-sunset' also excludes 'warped-sunset-4k'.
            relative = target.relative_to(ROOT)
            candidates = [relative.as_posix(), *(p.as_posix() for p in relative.parents)]
            if any(fnmatchcase(path, rule) or path.startswith(rule) for path in candidates for rule in excludes):
                errors.append(f"{file.relative_to(ROOT)}: linked resource excluded from publication: {href}")
            if frag and target.suffix == ".html" and frag not in pages.get(target, PageParser()).ids:
                errors.append(f"{file.relative_to(ROOT)}: broken fragment {href}")

    tree = ET.parse(ROOT / "sitemap.xml"); ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap = {n.text for n in tree.findall("s:url/s:loc", ns)}
    canonical_set = set(canon)
    for url in sorted(sitemap - canonical_set): errors.append(f"sitemap URL is not canonical indexable page: {url}")
    for url in sorted(canonical_set - sitemap): errors.append(f"canonical indexable page missing from sitemap: {url}")
    sitemap_dates = {n.findtext("s:loc", namespaces=ns): n.findtext("s:lastmod", namespaces=ns) for n in tree.findall("s:url", ns)}
    def objects(value):
        if isinstance(value, dict):
            yield value
            for child in value.values(): yield from objects(child)
        elif isinstance(value, list):
            for child in value: yield from objects(child)
    for url, file in canon.items():
        p = pages[file]; rel = file.relative_to(ROOT); modified = set()
        for raw in p.jsonld:
            try:
                modified.update(str(o["dateModified"])[:10] for o in objects(json.loads(raw)) if "dateModified" in o)
            except (ValueError, TypeError): continue  # Reported above.
        meta_modified = p.metas.get("article:modified_time")
        if meta_modified: modified.add(meta_modified[:10])
        for value in modified:
            if value != sitemap_dates.get(url): errors.append(f"{rel}: dateModified {value} disagrees with sitemap lastmod {sitemap_dates.get(url)}")
        for meta in p.meta_texts:
            visible_dates = re.findall(r"Updated\s+([A-Za-z]+ \d{1,2}, \d{4})", meta)
            if len(visible_dates) > 1: errors.append(f"{rel}: duplicate visible Updated dates")
            if visible_dates:
                from datetime import datetime
                try: visible = datetime.strptime(visible_dates[0], "%B %d, %Y").date().isoformat()
                except ValueError: errors.append(f"{rel}: invalid visible update date"); continue
                if visible != sitemap_dates.get(url): errors.append(f"{rel}: visible Updated date disagrees with sitemap lastmod")
        for href in p.stylesheets:
            path, _ = local_path(href, file)
            if path.exists() and href.startswith("/assets/css/"):
                version = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
                if f"?v={version}" not in href: errors.append(f"{rel}: stylesheet needs current content version: {path.name}")
    # A content version prevents cached homepage CSS from surviving a markup update.
    css_version = hashlib.sha256((ROOT / "assets/css/landing.css").read_bytes()).hexdigest()[:12]
    expected_css = f"/assets/css/landing.css?v={css_version}"
    if expected_css not in pages[ROOT / "index.html"].stylesheets:
        errors.append(f"index.html: update the landing stylesheet href to {expected_css}")
    if errors:
        print("Site validation failed:", *[f"\n- {e}" for e in errors]); return 1
    print(f"Validated {len(pages)} HTML files and {len(sitemap)} sitemap URLs successfully."); return 0


if __name__ == "__main__": sys.exit(main())
