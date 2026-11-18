#!/usr/bin/env python3
"""Validate all localized C2PA verification and location metadata guides."""
from __future__ import annotations

from html import unescape
from pathlib import Path
import json
import re

source = Path(__file__).resolve().parents[1]
built = source / "_site"
slugs = {
    "en": "", "es": "es", "fr": "fr", "de": "de", "it": "it", "nl": "nl",
    "pt-PT": "pt", "pt-BR": "pt-br", "sv": "sv", "no": "no",
    "fi": "fi", "pl": "pl", "tr": "tr", "uk": "uk",
    "ja": "ja", "ko": "ko", "zh-Hant": "zh-hant",
}
guides = {
    "check-c2pa-content-credentials": ("c2pa", 3),
    "remove-location-metadata": ("metadata", 5),
}
western = {"en", "es", "fr", "de", "it", "nl", "pt-PT", "pt-BR"}
files = {}
for data_type in ("c2pa", "metadata"):
    for locale_type in ("western", "other"):
        file = source / "_data" / "technical_tutorials" / f"{data_type}-{locale_type}.json"
        files[data_type, locale_type] = json.loads(file.read_text())

total = 0
for lang, slug in slugs.items():
    for slug_name, (data_type, steps) in guides.items():
        page = built / slug / "tutorials" / slug_name / "index.html"
        assert page.is_file(), f"Missing page {page}"
        html = page.read_text()
        url = "https://bytewaveai.com/" + (slug + "/" if slug else "") + "tutorials/" + slug_name + "/"
        assert f'<html lang="{lang}">' in html, (page, "lang")
        assert f'<link rel="canonical" href="{url}">' in html, (page, "canonical")
        for other_lang, other_slug in slugs.items():
            other_url = "https://bytewaveai.com/" + (other_slug + "/" if other_slug else "") + "tutorials/" + slug_name + "/"
            assert f'<link rel="alternate" hreflang="{other_lang}" href="{other_url}">' in html, (page, other_lang)
        assert html.count('class="disclosure ai-disclosure"') == 1, (page, "AI disclosure")
        article = re.search(r"<article\b[^>]*>([\s\S]*?)</article>", html)
        assert article, (page, "article")
        plain = unescape(re.sub(r"<[^>]+>", " ", article.group(1)))
        list_match = re.search(r"<ol>([\s\S]*?)</ol>", article.group(1))
        assert list_match and list_match.group(1).count("<li>") == steps, (page, "step count")
        if lang != "en":
            data = files[data_type, "western" if lang in western else "other"][lang]
            assert data and all(isinstance(v, str) and v.strip() for v in data.values()), (lang, data_type, "data completeness")
            h1 = re.search(r"<h1>(.*?)</h1>", html, re.DOTALL)
            assert h1 and unescape(h1.group(1)) == data["title"], (page, "h1")
            assert f'<meta property="article:modified_time" content="2026-11-16">' in html, (page, "date")
            assert data["description"].replace("&", "&amp;")[:20] in html, (page, "SEO")
            for i in range(1, steps + 1):
                assert data[f"step{i}"] in plain, (page, f"step{i}")
            if data_type == "c2pa":
                rows = re.search(r"<tbody>([\s\S]*?)</tbody>", article.group(1))
                assert rows and rows.group(1).count("<tr>") == 5, (page, "five outcomes")
                for field in ("verifiedAIMeaning", "likelySyntheticMeaning", "likelyCameraMeaning",
                              "unverifiedMeaning", "bytewaveVerifiedMeaning", "limitsP1", "limitsP2"):
                    assert data[field] in plain, (page, field)
                assert "spec.c2pa.org/specifications/specifications/2.2/explainer/Explainer.html" in html, (page, "C2PA source")
                assert f'href="/{slug}/blog/check-ai-video-without-uploading.html"' in html, (page, "localized related link")
            else:
                for field in ("regulatorText", "formatText", "workingP1", "lockedP", "photosP",
                              "credentialsP", "visibleP"):
                    assert data[field] in plain, (page, field)
                assert "dataprotection.ie/en/news-media/latest-news/" in html, (page, "original regulator link")
                for link in ("does-emoji-protect-child-face-facebook.html",
                             "can-photos-videos-reveal-your-address.html",
                             "does-removing-metadata-remove-ai-labels.html"):
                    assert link in html, (page, link)
                for text in ("MOV", "MP4", "M4V", "Content Credentials", "Recorded at import"):
                    assert text in plain, (page, text)
            assert "id6752225642" in html and "pt=126768479" in html, (page, "App Store")
            directory = (built / slug / "tutorials" / "index.html").read_text()
            assert f'href="/{slug}/tutorials/{slug_name}/"' in directory, (page, "same-language directory card")
        else:
            assert "2026-10-01" in html, (page, "English source date")
            if data_type == "c2pa":
                assert "Verified AI-generated" in plain and "Likely synthetic" in plain, (page, "English C2PA outcomes")
            else:
                assert "Recorded at import" in plain and "403 million" in plain, (page, "English source content")
        total += 1
print(f"Validated {total} original and translated C2PA/metadata guides with all steps, five outcome categories, locale links and source cautions.")
