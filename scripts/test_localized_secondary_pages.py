#!/usr/bin/env python3
"""Verify that localized secondary pages have complete, rendered content.

This prevents a Jekyll page with an empty or missing locale-data object from
passing generic canonical/link checks while showing blank gallery/tutorial cards.
"""
import json
import re
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
        for field in ("title","description","note" if data is gallery else "language_note"):
            assert data[field].strip(), (lang, field)
        for card in data["cards"]:
            for field in ("title", "alt", "effect" if data is gallery else "description", "action" if data is gallery else "format"):
                assert card[field].strip(), (lang, field)
    for source, html, key in [
        (f"{slug}/about.md", f"{slug}/about.html", "about"),
        (f"{slug}/privacy.md", f"{slug}/privacy.html", "privacy"),
        (f"{slug}/free-expression.md", f"{slug}/free-expression.html", "free-expression"),
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
print(f"Localized content checks passed: {len(LOCALES)} languages, {checked} translated secondary pages.")
