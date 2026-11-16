#!/usr/bin/env python3
"""Verify full localized caption-effects and custom-font tutorials after Jekyll rendering."""
from __future__ import annotations
from html import unescape
from pathlib import Path
import json
import re

root=Path(__file__).resolve().parents[1]
site=root/"_site"
slugs={"en":"","es":"es","fr":"fr","de":"de","it":"it","nl":"nl",
       "pt-PT":"pt","pt-BR":"pt-br","sv":"sv","no":"no","fi":"fi",
       "pl":"pl","tr":"tr","uk":"uk","ja":"ja","ko":"ko","zh-Hant":"zh-hant"}
guides={"caption-text-effects":("captionEffects",3),
        "import-custom-fonts":("customFonts",4)}
for lang,slug in slugs.items():
    data=json.loads((root/"_data"/"short_tutorials"/f"{lang}.json").read_text())
    assert set(data)=={"common","captionEffects","customFonts"},lang
    for title_key,(data_key,step_count) in guides.items():
        file=site/slug/"tutorials"/title_key/"index.html"
        assert file.is_file(),f"Missing translated page {file}"
        html=file.read_text()
        canonical="https://bytewaveai.com/"+(slug+"/" if slug else "")+"tutorials/"+title_key+"/"
        assert f'<html lang="{lang}">' in html,(lang,title_key,"lang")
        assert f'<link rel="canonical" href="{canonical}">' in html,(lang,title_key,"canonical")
        for alt,alt_slug in slugs.items():
            target="https://bytewaveai.com/"+(alt_slug+"/" if alt_slug else "")+"tutorials/"+title_key+"/"
            assert f'<link rel="alternate" hreflang="{alt}" href="{target}">' in html,(lang,title_key,alt)
        h1=re.search(r"<h1>(.*?)</h1>",html,re.DOTALL)
        assert h1 and unescape(h1.group(1))==data[data_key]["title"],(lang,title_key,"headline")
        assert html.count('class="disclosure ai-disclosure"')==1,(lang,title_key,"AI disclosure")
        article=re.search(r'<article\b[^>]*>([\s\S]*?)</article>',html)
        assert article,(lang,title_key,"article")
        page_text=unescape(re.sub(r"<[^>]+>"," ",article.group(1)))
        assert "ByteWave" in page_text and len(page_text)>380,(lang,title_key,"content")
        if lang!="en":
            for key in ("lead","stepsHeading","step1","step2","step3"):
                assert data[data_key][key] in page_text,(lang,title_key,key)
            if step_count==4:
                assert data[data_key]["step4"] in page_text,(lang,title_key,"step4")
                assert data[data_key]["unsupported"] in page_text,(lang,title_key,"file types")
                assert data[data_key]["license"] in page_text,(lang,title_key,"license")
                for ftype in (".ttf",".otf",".woff",".woff2"):
                    assert ftype in page_text,(lang,title_key,ftype)
            else:
                for name in ("Orbital Letters","Supernova","Ember Ash"):
                    assert name in page_text,(lang,title_key,name)
            assert f'<meta property="article:modified_time" content="2026-11-16">' in html,(lang,title_key,"date")
        else:
            assert '<meta property="article:modified_time" content="2026-10-07">' in html,(lang,title_key,"English date")
        if lang!="en":
            list_match=re.search(r"<ol>([\s\S]*?)</ol>",html)
            assert list_match and list_match.group(1).count("<li>")==step_count,(lang,title_key,"step count")
            opposite="import-custom-fonts" if title_key=="caption-text-effects" else "caption-text-effects"
            related="/"+(slug+"/" if slug else "")+"tutorials/"+opposite+"/"
            assert f'href="{related}"' in html,(lang,title_key,"crosslink")
            caption="/"+(slug+"/" if slug else "")+"tutorials/animated-captions/"
            assert f'href="{caption}"' in html,(lang,title_key,"caption guide link")
            assert "id6752225642" in html and "pt=126768479" in html,(lang,title_key,"App Store")
print("All 34 caption-effects and custom-font tutorial versions have complete steps, language links, disclosures, source file advice and licensing guidance.")
