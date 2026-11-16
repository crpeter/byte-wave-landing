#!/usr/bin/env python3
"""Verify that localized secondary pages have complete, rendered content.

This prevents a Jekyll page with an empty or missing locale-data object from
passing generic canonical/link checks while showing blank gallery/tutorial cards.
"""
import json
import re
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1]
RENDERED = SOURCE / "_site"
LOCALES = {
    "es":"es", "fr":"fr", "de":"de", "it":"it", "nl":"nl",
    "pt-PT":"pt", "pt-BR":"pt-br", "sv":"sv", "no":"no",
    "fi":"fi", "pl":"pl", "tr":"tr", "uk":"uk", "ja":"ja",
    "ko":"ko", "zh-Hant":"zh-hant",
}
GALLERY_IDS = [
    "all-scroll", "horizontal-scroll-mobius-warp", "horizontal-scroll-waves",
    "sunset-hexagons-landscape", "warped-sunset-4k", "seaside-grid-to-beach",
    "sunset-hexagons", "air-show", "quadruple-dive", "free-as-in-geese",
    "hummingbird", "harbor", "red-leaves",
]
TUTORIAL_HREFS = [
    "/layout/", "/tutorials/animated-captions/",
    "/tutorials/caption-text-effects/", "/tutorials/import-custom-fonts/",
    "/tutorials/animate-stickers/", "/tutorials/motion-blur/",
    "/tutorials/frame-rate-conversion/", "/tutorials/temporal-noise-reduction/",
    "/tutorials/check-c2pa-content-credentials/",
    "/tutorials/remove-location-metadata/",
]

class Markup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.h1 = 0
        self.h2 = 0
        self.gallery_video = 0
        self.gallery_figcaption = 0
        self.tutorial_cards = 0
        self.video_with_labels = 0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=="h1": self.h1+=1
        if tag=="h2": self.h2+=1
        if tag=="figcaption": self.gallery_figcaption+=1
        if tag=="video":
            self.gallery_video+=1
            if a.get("data-bw-labels"): self.video_with_labels+=1
        if tag=="a" and "tutorial-card" in a.get("class","").split():
            self.tutorial_cards+=1

checked=0
for lang,slug in LOCALES.items():
    gallery = json.loads((SOURCE/"_data"/"gallery_hub"/f"{lang}.json").read_text())
    tutorials = json.loads((SOURCE/"_data"/"tutorial_hub"/f"{lang}.json").read_text())
    assert len(gallery["cards"]) == 13, (lang, "gallery count")
    assert [x["id"] for x in gallery["cards"]] == GALLERY_IDS, (lang, "gallery ids")
    assert len(tutorials["cards"]) == 10, (lang, "tutorial count")
    assert [x["href"] for x in tutorials["cards"]] == TUTORIAL_HREFS, (lang, "tutorial links")
    for data in [gallery,tutorials]:
        for field in ("title","description"):
            assert data[field].strip(), (lang, field)
        for card in data["cards"]:
            for field in ("title", "alt", "effect" if data is gallery else "description", "action" if data is gallery else "format"):
                assert card[field].strip(), (lang, field)
    for source, html, key in [
        (f"{slug}/tutorials/index.md", f"{slug}/tutorials/index.html", "tutorials"),
        (f"{slug}/gallery/index.md", f"{slug}/gallery/index.html", "gallery"),
    ]:
        raw=(SOURCE/source).read_text()
        assert f"translation_key: {key}" in raw, source
        assert f"permalink: /{html.removesuffix('index.html') if html.endswith('index.html') else html}" in raw, source
        rendered=(RENDERED/html).read_text()
        assert f'<html lang="{lang}">' in rendered, html
        assert "{{" not in rendered and "{%" not in rendered, (html, "unrendered liquid")
        parsed=Markup();parsed.feed(rendered)
        assert parsed.h1==1, (html, "h1 count", parsed.h1)
        if key=="tutorials":
            assert parsed.tutorial_cards==10, (html, "tutorial cards", parsed.tutorial_cards)
            for short in ("animated-captions", "animate-stickers", "caption-text-effects", "import-custom-fonts"):
                target=RENDERED / slug / "tutorials" / short / "index.html"
                href=f"/{slug}/tutorials/{short}/" if target.is_file() else f"/tutorials/{short}/"
                assert f'href="{href}"' in rendered, (html, short, "link must use translated guide when available")
        if key=="gallery":
            assert parsed.gallery_video==13, (html, "gallery videos",parsed.gallery_video)
            assert parsed.gallery_figcaption==13, (html, "gallery captions",parsed.gallery_figcaption)
            assert parsed.video_with_labels==13, (html, "translated video labels",parsed.video_with_labels)
        if key=="privacy":
            assert parsed.h2 >= 5, (html, "privacy policy sections")
            assert "Google Firebase Authentication" in rendered, (html,"authentication details")
            assert "cpeter@codyworks.org" in rendered, (html,"privacy contact")
            assert len(rendered)>2000, (html,"policy must not be a summary")
        if key=="free-expression":
            assert 'id="appeal"' in rendered, (html,"appeal anchor")
            assert "cpeter@codyworks.org" in rendered, (html,"appeals contact")
            assert "constitution.congress.gov" in rendered, (html,"primary legal source")
        checked+=1
print(f"Localized gallery and tutorial-index checks passed: {len(LOCALES)} languages, {checked} translated secondary pages.")

# Layout is the tenth guide in each directory. Check all gallery and
# directory links, including fragments, against their rendered destinations.
for lang, slug in LOCALES.items():
    layout = (RENDERED / slug / "layout/index.html").read_text()
    data = json.loads((SOURCE / "_data/layout_guide" / f"{lang}.json").read_text())
    body_text = unescape(re.sub(r"<[^>]+>", "", layout))
    for field in ("lead", "feature1", "feature2", "feature3", "feature4",
                  "step1", "step2", "step3", "pricing", "publisher"):
        assert data[field] in body_text, (lang, field)

    graph = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', layout, re.S)[1])["@graph"]
    videos = [item for item in graph if item["@type"] == "VideoObject"]
    assert len(videos) == 5, (lang, "video schema")
    for video in videos:
        url, anchor = video["@id"].split("#")
        assert url == f"https://bytewaveai.com/{slug}/layout/" and f'id="{anchor}"' in layout
        assert video["name"] and video["description"], (lang, anchor)
        for key in ("thumbnailUrl", "contentUrl"):
            assert (RENDERED / video[key].removeprefix("https://bytewaveai.com/")).is_file()
    for hub, css_class, count in [("gallery", "tutorial-link", 13), ("tutorials", "tutorial-card", 10)]:
        hub_html = (RENDERED / slug / hub / "index.html").read_text()
        links = re.findall(r'<a class="' + css_class + r'" href="([^"]+)"', hub_html)
        assert len(links) == count, (lang, hub, links)
        for link in links:
            path, _, fragment = link.partition("#")
            assert path.startswith(f"/{slug}/"), (lang, hub, path)
            target = RENDERED / path.strip("/") / "index.html"
            assert target.is_file() and (not fragment or f'id="{fragment}"' in target.read_text()), link
print("Validated 16 translated Layout guides, 80 video schema objects and all gallery and directory destinations.")

for lang, slug in {"en": "", **LOCALES}.items():
    prefix = f"/{slug}" if slug else ""
    directory = RENDERED / slug
    press_url = f"{prefix}/press.html"
    page = (directory / "press.html").read_text()
    copy = json.loads((SOURCE / "_data/press" / f"{lang}.json").read_text())
    assert f'<html lang="{lang}">' in page
    body = page.split('<main id="main">')[1].split('</main>')[0]
    blurbs = [unescape(t) for t in re.findall(r"<p data-copy>(.*?)</p>", body)]
    assert blurbs == [copy[field] for field in ("shortText", "mediumText", "longText", "bioText")], lang
    assert body.count('class="fact-row"') == 9 and body.count('class="angle"') == 3
    for field in ("permission", "privacyText", "hardwareText", "freeText", "updated"):
        assert copy[field].strip() in unescape(body), (lang, field)
    assert f'href="{prefix}/privacy.html"' in body
    assert re.findall(r'class="asset-dl" href="([^"]+)"', body) == ["/logo.png", "/assets/og-image.jpg"]
    for name in ("index.html", "about.html"):
        assert f'href="{press_url}"' in (directory / name).read_text(), (lang, name)
print("Verified 17 press kits, 68 copy blocks, source facts, asset links and localized navigation.")
