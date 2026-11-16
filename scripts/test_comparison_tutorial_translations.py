#!/usr/bin/env python3
"""Validate full translated motion-blur, FRC and temporal noise-reduction tutorials."""
from __future__ import annotations

from html import unescape
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
site = root / "_site"
slugs = {
    "en":"", "es":"es", "fr":"fr", "de":"de", "it":"it", "nl":"nl",
    "pt-PT":"pt", "pt-BR":"pt-br", "sv":"sv", "no":"no", "fi":"fi",
    "pl":"pl", "tr":"tr", "uk":"uk", "ja":"ja", "ko":"ko", "zh-Hant":"zh-hant"
}
guides = {
    "motion-blur": {
        "data": "motionBlur", "count": 5,
        "src": "/assets/videos/comparison.mp4",
        "poster": "/assets/videos/motion-blur-comparison-poster.jpg",
        "id": "demo-video-10", "width": "1216", "height": "1080",
        "related": ["frame-rate-conversion"], "required": ["strength1", "strength2", "privacyText"]
    },
    "frame-rate-conversion": {
        "data": "frameRate", "count": 3,
        "src": "/assets/videos/hummingbird-comparison.mp4",
        "poster": "/assets/videos/hummingbird-comparison-poster.jpg",
        "id": "comparison-video", "width": "672", "height": "720",
        "related": ["motion-blur"], "required": ["warp"]
    },
    "temporal-noise-reduction": {
        "data": "temporalNoise", "count": 3,
        "src": "/assets/videos/temporal-noise-comparison.mp4",
        "poster": "/assets/videos/temporal-noise-comparison-poster.jpg",
        "id": "comparison-video", "width": "2560", "height": "720",
        "related": ["motion-blur", "frame-rate-conversion"], "required": ["lookFor"]
    }
}
for lang,slug in slugs.items():
    data=json.loads((root/"_data"/"comparison_tutorials"/f"{lang}.json").read_text())
    assert set(data)=={"common","motionBlur","frameRate","temporalNoise"},lang
    for guide,expected in guides.items():
        file=site/slug/"tutorials"/guide/"index.html"
        assert file.is_file(),f"Missing translated video tutorial: {file}"
        html=file.read_text()
        url="https://bytewaveai.com/"+(slug+"/" if slug else "")+"tutorials/"+guide+"/"
        assert f'<html lang="{lang}">' in html,(file,"language")
        assert f'<link rel="canonical" href="{url}">' in html,(file,"self canonical")
        for alt,alt_slug in slugs.items():
            peer="https://bytewaveai.com/"+(alt_slug+"/" if alt_slug else "")+"tutorials/"+guide+"/"
            assert f'<link rel="alternate" hreflang="{alt}" href="{peer}">' in html,(file,"alternate",alt)
        assert html.count('class="disclosure ai-disclosure"')==1,(file,"AI disclosure")
        for element in (
            '<script src="/assets/js/video-player.js?v=318a65ba2cde" defer>',
            'data-bw-player',
            'controls playsinline preload="none"',
            'class="bw-play"',
            'class="bw-video-status"',
            'role="status"',
            'id="comparison-description"',
            f'src="{expected["src"]}"',
            f'poster="{expected["poster"]}"',
            f'id="{expected["id"]}"',
            f'width="{expected["width"]}" height="{expected["height"]}"',
            f'aria-controls="{expected["id"]}"',
        ):
            assert element in html,(file,"video markup",element)
        assert (root / expected["src"].lstrip("/")).exists(),(file,"source asset missing")
        assert (root / expected["poster"].lstrip("/")).exists(),(file,"poster asset missing")
        article=re.search(r'<article\b[^>]*>([\s\S]*?)</article>',html)
        assert article,(file,"article")
        body=unescape(re.sub(r'<[^>]+>', ' ',article.group(1)))
        found=re.search(r'<ol class="steps">([\s\S]*?)</ol>',article.group(1))
        assert found and found.group(1).count("<li>")==expected["count"],(file,"steps")
        if lang!="en":
            g=data[expected["data"]]
            assert all(isinstance(x,str) and x.strip() for x in g.values()),(file,"empty translated field")
            assert re.search(r'<h1>(.*?)</h1>',html,re.S) and f'<h1>{g["title"]}</h1>' in unescape(html),(file,"title")
            assert g["description"] in unescape(html),(file,"description")
            assert f'<meta property="article:modified_time" content="2026-11-16">' in html,(file,"translated date")
            for i in range(1,expected["count"]+1):
                assert g[f"step{i}"] in body,(file,"step",i)
            for key in ("intro","comparisonTitle","caption",*expected["required"]):
                assert g[key] in body,(file,key)
            for related in expected["related"]:
                href=f"/{slug}/tutorials/{related}/"
                assert f'href="{href}"' in html,(file,"related locale link",href)
            directory=(site/slug/"tutorials"/"index.html").read_text()
            assert f'href="/{slug}/tutorials/{guide}/"' in directory,(file,"directory locale link")
            assert 'id6752225642' in html and 'pt=126768479' in html,(file,"App Store link")
            if guide=="motion-blur":
                assert "1" in body and "100" in body,(file,"effect intensity 1..100")
                assert "Export" in body,(file,"export controls")
            if guide=="frame-rate-conversion":
                assert "FRC" in body and ("8×" in body or "8x" in body),(file,"FRC parameters")
                assert "Reverse" in body and "Speed" in body,(file,"playback controls")
            if guide=="temporal-noise-reduction":
                assert "Advanced → Temporal Noise Reduction" in body,(file,"effect control")
        else:
            assert '<meta property="article:modified_time" content="2026-10-18">' in html,(file,"source date")
        if guide=="motion-blur":
            assert "Advanced" in body and "Motion Blur" in body,(file,"effect controls")
        else:
            assert "FRC" in body if guide=="frame-rate-conversion" else "Temporal Noise Reduction" in body,(file,"technical feature")
print(f"Validated {len(slugs)*len(guides)} original and translated video tutorials, all poster/source assets and playback controls.")
