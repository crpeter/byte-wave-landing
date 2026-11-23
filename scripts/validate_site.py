#!/usr/bin/env python3
"""Validate the static ByteWave site using only the Python standard library."""
from __future__ import annotations

import hashlib
from datetime import date
from fnmatch import fnmatchcase
import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

SOURCE_ROOT = Path(__file__).resolve().parents[1]
ROOT = SOURCE_ROOT / "_site"
BASE = "https://bytewaveai.com"
# Reuse canonical language pages for regional App Store locales.
LOCALE_SLUGS = {"pt-PT": "pt", "pt-BR": "pt-br", "zh-Hant": "zh-hant"}
REGION_ALIASES = {
    "en-US": "en", "en-GB": "en", "en-CA": "en",
    "es-ES": "es", "es-MX": "es",
    "fr-FR": "fr", "de-DE": "de", "nl-NL": "nl",
}
SITE_LOCALES = {
    "en", "es", "fr", "de", "it", "nl", "pt-PT", "pt-BR", "sv",
    "no", "fi", "pl", "tr", "uk", "ja", "ko", "zh-Hant",
}
EXPANDED_LOCALES = set(json.loads((SOURCE_ROOT / '_data/expanded_languages.json').read_text()))
APP_STORE_LOCALES = {
    "de-DE", "en-CA", "en-GB", "en-US", "es-ES", "es-MX",
    "fi", "fr-FR", "it", "ja", "ko", "nl-NL", "no", "pl",
    "pt-BR", "pt-PT", "sv", "tr", "uk", "zh-Hant",
}
def locale_slug(lang: str) -> str:
    return LOCALE_SLUGS.get(lang, lang.lower())

REQUIRED = {
    "description", "og:title", "og:description", "og:url", "og:image",
    "og:image:alt", "twitter:card", "twitter:title", "twitter:description",
    "twitter:image", "twitter:image:alt",
}
PLACEHOLDERS = [r"\[date\]", r"\[last name\]", r"\[N\]", r"\b(?-i:TODO)\b", r"href=[\"']#[\"']"]


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""; self.in_title = False; self.h1 = 0; self.metas = {}; self.canonicals = []
        self.links = []; self.media = []; self.stylesheets = []; self.ids = set(); self.images = []; self.jsonld = []; self.in_jsonld = False; self.buf = []
        self.lang = ""; self.alternates = []
        self.main_count = 0; self.footer_links = []; self.in_footer = False
        self.updated_dates = []; self.in_meta = False; self.meta_tag = None; self.meta_buf = []; self.meta_texts = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html": self.lang = a.get("lang", "")
        if tag == "link" and "alternate" in a.get("rel", "").split() and "hreflang" in a:
            self.alternates.append((a["hreflang"], a.get("href", "")))
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


def authored_pages():
    # GitHub Pages also renders repository notes and asset READMEs to HTML.
    # Check every authored HTML page, plus Markdown pages that opt into Jekyll.
    for source in sorted(SOURCE_ROOT.rglob("*")):
        if source.suffix not in {".html", ".md"}:
            continue
        rel = source.relative_to(SOURCE_ROOT)
        if any(part.startswith(("_", ".")) for part in rel.parts):
            continue
        if source.suffix == ".html" or source.read_text(encoding="utf-8").startswith("---\n"):
            yield rel.with_suffix(".html")


def validate_sitemap(path: Path, canonical_urls: set[str], today: date | None = None):
    """Check each sitemap entry before reducing URLs to a set."""
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    errors = []; dates = {}; today = today or date.today()
    try:
        tree = ET.parse(path)
    except (ET.ParseError, OSError) as exc:
        return {}, [f"sitemap cannot be read: {exc}"]
    if tree.getroot().tag != f"{{{ns['s']}}}urlset":
        errors.append("sitemap must contain a namespaced urlset")
    for entry in tree.findall("s:url", ns):
        locations = entry.findall("s:loc", ns)
        url = locations[0].text if len(locations) == 1 else None
        if not url or url != url.strip():
            errors.append("sitemap entry must have one nonempty URL")
            continue
        if url in dates:
            errors.append(f"duplicate sitemap URL: {url}")
        modifications = entry.findall("s:lastmod", ns)
        modified = modifications[0].text if len(modifications) == 1 else None
        if len(modifications) > 1:
            errors.append(f"{url}: expected at most one sitemap lastmod")
        if modifications:
            try:
                if not modified or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", modified):
                    raise ValueError
                parsed = date.fromisoformat(modified)
                if parsed > today:
                    errors.append(f"{url}: sitemap lastmod is in the future: {modified}")
            except ValueError:
                errors.append(f"{url}: invalid sitemap lastmod: {modified}")
        dates[url] = modified
    sitemap_urls = set(dates)
    for url in sorted(sitemap_urls - canonical_urls):
        errors.append(f"sitemap URL is not canonical indexable page: {url}")
    for url in sorted(canonical_urls - sitemap_urls):
        errors.append(f"canonical indexable page missing from sitemap: {url}")
    return dates, errors


def main(config_path=SOURCE_ROOT / "_config.yml") -> int:
    if not (ROOT / "index.html").is_file():
        print("Build the site with Jekyll first (expected _site/index.html).")
        return 1
    errors = []; pages = {}; canon = {}; titles = {}; descs = {}; redirects = {}
    # This site's config uses a top-level YAML list of unquoted exclusion paths.
    config = config_path.read_text(encoding="utf-8")
    exclude_block = re.search(r"^exclude:\s*\n((?:[ \t]+[^\n]*\n)*)", config, re.M)
    excludes = re.findall(r"^\s+-\s+([^\s#]+)\s*$", exclude_block[1], re.M) if exclude_block else []
    for rel in authored_pages():
        file = ROOT / rel
        if not file.is_file():
            errors.append(f"{rel}: page missing from Jekyll output")
            continue
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
            is_localized = p.lang != "en" and rel.parts[0] == locale_slug(p.lang)
            section = Path(*rel.parts[1:]) if is_localized else rel
            if ((section.parent == Path("blog") and section.name != "index.html")
                    or (section.parts[0] == "tutorials" and section != Path("tutorials/index.html"))):
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
                    disclosures = {
                        "es": ("Aviso sobre IA:", "generado con un modelo de lenguaje de IA (LLM)"),
                        "fr": ("Information sur l’IA :", "texte généré à l’aide d’un modèle de langage"),
                        "de": ("KI-Hinweis:", "KI-Sprachmodell"),
                        "it": ("Informativa sull", "modello linguistico di intelligenza artificiale"),
                        "nl": ("AI-vermelding:", "AI-taalmodel"),
                        "pt-PT": ("Aviso sobre IA:", "modelo de linguagem"),
                        "pt-BR": ("Aviso sobre IA:", "modelo de linguagem"),
                        "sv": ("AI-information:", "AI-språkmodell"),
                        "no": ("KI-merknad:", "KI-språkmodell"),
                        "fi": ("Tekoälyilmoitus:", "tekoälyn kielimallilla"),
                        "pl": ("Informacja o AI:", "model językowy"),
                        "tr": ("Yapay zekâ açıklaması:", "yapay zekâ dil modeli"),
                        "uk": ("Повідомлення про ШІ:", "мовною моделлю"),
                        "ja": ("AI利用の開示：", "AI言語モデル"),
                        "ko": ("AI 사용 안내:", "인공지능 언어 모델"),
                        "zh-Hant": ("AI 使用聲明：", "語言模型"),
                    }
                    if p.lang in EXPANDED_LOCALES:
                        translated = json.loads((SOURCE_ROOT / '_data/i18n' / f'{p.lang}.json').read_text())['disclosure']
                        disclosures[p.lang] = (translated['label'], translated['text'])
                    disclosure = disclosures.get(p.lang, ("AI disclosure:", "generated with an AI language model (LLM)"))
                    if not all(phrase in text for phrase in disclosure):
                        errors.append(f"{rel}: disclosure must explicitly identify AI-generated text")
                    prefix = re.sub(r'<(?P<tag>p|div) class="(?:eyebrow|meta)">.*?</(?P=tag)>', "", content[:notice.start()], flags=re.S)
                    if re.search(r"<(?:p|h2|ul|ol|table)\b", prefix):
                        errors.append(f"{rel}: AI disclosure must precede the article body")
            if not p.title.strip(): errors.append(f"{rel}: missing title")
            if p.main_count != 1: errors.append(f"{rel}: expected one main landmark")
            if "#main" not in p.links or "main" not in p.ids: errors.append(f"{rel}: missing skip link or target")
            required_footer = {"/", "/gallery/", "/tutorials/", "/blog/", "/about.html", "/press.html", "/privacy.html", "/free-expression.html", "/dmca.html"}
            if is_localized and p.lang in EXPANDED_LOCALES:
                # These languages currently cover the homepage and tutorials.
                required_footer.remove('/'); required_footer.add(f'/{locale_slug(p.lang)}/')
                required_footer.remove('/tutorials/'); required_footer.add(f'/{locale_slug(p.lang)}/tutorials/')
            elif is_localized:
                required_footer.remove("/"); required_footer.add(f"/{locale_slug(p.lang)}/")
                required_footer.remove("/press.html")
                required_footer.add(f"/{locale_slug(p.lang)}/press.html")
                required_footer.remove("/about.html")
                required_footer.add(f"/{locale_slug(p.lang)}/about.html")
                required_footer.remove("/privacy.html")
                required_footer.add(f"/{locale_slug(p.lang)}/privacy.html")
                required_footer.remove("/free-expression.html")
                required_footer.add(f"/{locale_slug(p.lang)}/free-expression.html")
                for section in ("blog", "gallery", "tutorials"):
                    required_footer.remove(f"/{section}/")
                    required_footer.add(f"/{locale_slug(p.lang)}/{section}/")
            if not required_footer.issubset(p.footer_links): errors.append(f"{rel}: missing shared footer links")
            if not p.metas.get("description"): errors.append(f"{rel}: missing description")
            for key in REQUIRED:
                if not p.metas.get(key): errors.append(f"{rel}: missing {key}")
            for val, pool, label in [(p.title.strip(), titles, "title"), (p.metas.get("description", ""), descs, "description")]:
                # Related languages can naturally share wording. Still reject
                # duplicate metadata on different pages in the same language.
                key = (p.lang, val)
                if key in pool: errors.append(f"{rel}: duplicate {label} with {pool[key]}")
                pool[key] = rel
        for data in p.jsonld:
            try: json.loads(data)
            except Exception as exc: errors.append(f"{file.relative_to(ROOT)}: invalid JSON-LD: {exc}")
        for img in p.images:
            if "alt" not in img: errors.append(f"{file.relative_to(ROOT)}: image missing alt")
            if "width" not in img or "height" not in img: errors.append(f"{file.relative_to(ROOT)}: image missing dimensions")
        for pattern in PLACEHOLDERS:
            if re.search(pattern, raw, re.I): errors.append(f"{file.relative_to(ROOT)}: placeholder/fake link matches {pattern}")
        if p.lang == "pt-BR":
            # Guard against malformed fragments caused by broad string replacements.
            malformed = ("nseu", "dseu", "pelsuas", "parsuas",
                         "compartilhamentod", "compartilhamentor",
                         "no tela", "a compartilhamento", "uma endereço")
            for fragment in malformed:
                if fragment in raw:
                    errors.append(f"{file.relative_to(ROOT)}: malformed Brazilian Portuguese copy: {fragment}")


    for url, file in canon.items():
        page = pages[file]
        rel = file.relative_to(ROOT)
        is_localized = page.lang != "en" and rel.parts[0] == locale_slug(page.lang)
        if not page.alternates and not is_localized: continue
        versions = dict(page.alternates)
        section = Path(*rel.parts[1:]) if is_localized else rel
        expected_locales = SITE_LOCALES
        if section == Path('index.html') or section.parts[0] in {'tutorials', 'layout'}:
            expected_locales = SITE_LOCALES | EXPANDED_LOCALES
        if (len(versions) != len(page.alternates)
                or not expected_locales.issubset(versions)
                or not APP_STORE_LOCALES.issubset(versions)
                or versions.get(page.lang) != url
                or versions.get("x-default") != versions.get("en")):
            errors.append(f"{rel}: missing or incorrect language alternates")
        for lang, target in versions.items():
            if lang == "x-default": continue
            expected_lang = REGION_ALIASES.get(lang, lang)
            peer = pages.get(canon.get(target))
            if not peer or peer.lang != expected_lang or dict(peer.alternates) != versions:
                errors.append(f"{rel}: missing reciprocal {lang} alternate: {target}")
            if expected_lang != page.lang and urlparse(target).path not in page.links:
                errors.append(f"{rel}: missing visible switch to {lang}")

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

    sitemap_dates, sitemap_errors = validate_sitemap(ROOT / "sitemap.xml", set(canon))
    errors.extend(sitemap_errors)
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
    print(f"Validated {len(pages)} HTML files and {len(sitemap_dates)} sitemap URLs successfully."); return 0


if __name__ == "__main__": sys.exit(main())
