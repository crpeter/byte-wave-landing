#!/usr/bin/env python3
"""Check rendered, translated creation tutorials against their locale data."""
from __future__ import annotations

from html import unescape
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
site = root / "_site"
locale_slugs = {
    "en": "", "es": "es", "fr": "fr", "de": "de", "it": "it",
    "nl": "nl", "pt-PT": "pt", "pt-BR": "pt-br", "sv": "sv",
    "no": "no", "fi": "fi", "pl": "pl", "tr": "tr", "uk": "uk",
    "ja": "ja", "ko": "ko", "zh-Hant": "zh-hant",
}
guides = {
    "animated-captions": ("animatedCaptions", 4, "animate-stickers"),
    "animate-stickers": ("animateStickers", 5, "animated-captions"),
}
for lang, slug in locale_slugs.items():
    data = json.loads((root / "_data" / "creation_tutorials" / f"{lang}.json").read_text())
    assert set(data) == {"common", "animatedCaptions", "animateStickers"}, lang
    for guide_slug, (key, expected_steps, counterpart) in guides.items():
        file = site / slug / "tutorials" / guide_slug / "index.html"
        assert file.exists(), f"Missing translated article: {file}"
        html = file.read_text()
        url = "https://bytewaveai.com/" + (slug + "/" if slug else "") + "tutorials/" + guide_slug + "/"
        assert f'<html lang="{lang}">' in html, f"Wrong language: {file}"
        assert f'<link rel="canonical" href="{url}">' in html, f"Wrong self-canonical: {file}"
        assert f'<link rel="alternate" hreflang="{lang}" href="{url}">' in html, f"Missing own hreflang: {file}"
        for alt_lang, alt_slug in locale_slugs.items():
            alt_url = "https://bytewaveai.com/" + (alt_slug + "/" if alt_slug else "") + "tutorials/" + guide_slug + "/"
            assert f'<link rel="alternate" hreflang="{alt_lang}" href="{alt_url}">' in html, f"Missing {alt_lang} alternate: {file}"
        assert f'<h1>{data[key]["title"]}</h1>' in unescape(html), f"Wrong title: {file}"
        assert html.count('class="disclosure ai-disclosure"') == 1, f"AI disclosure missing: {file}"
        article = re.search(r'<article class="creation-guide">([\s\S]*?)</article>', html)
        assert article, f"Tutorial article container missing: {file}"
        steps = re.search(r'<ol>([\s\S]*?)</ol>', article.group(1))
        assert steps, f"Step list missing: {file}"
        assert steps.group(1).count("<li>") == expected_steps, f"Wrong step count: {file}"
        article_text = unescape(re.sub(r'<[^>]*>', '', article.group(1)))
        if lang != "en":
            for field in ("lead", "stepsHeading", "readabilityHeading", "readabilityText"):
                assert data[key][field] in article_text, f"Unrendered {field}: {file}"
            for number in range(1, expected_steps + 1):
                assert data[key][f"step{number}"] in article_text, f"Missing step{number}: {file}"
            other_href = "/" + (slug + "/" if slug else "") + "tutorials/" + counterpart + "/"
            assert f'href="{other_href}"' in html, f"Wrong related-guide locale: {file}"
            assert 'href="/tutorials/caption-text-effects/" hreflang="en"' in html if key == "animatedCaptions" else f'href="/{slug}/layout/"' in html, f"Incorrect related guide target: {file}"
            assert f'<meta property="article:modified_time" content="2026-11-16">' in html, f"Wrong translated update date: {file}"
        else:
            assert f'<meta property="article:modified_time" content="2026-09-28">' in html, f"Original English date changed: {file}"
print("Validated 34 rendered original and translated creation guides, steps, related links, disclosures and reciprocal hreflang.")
