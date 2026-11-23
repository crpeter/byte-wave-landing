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
from urllib.parse import urlsplit

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
    "/tutorials/translate-video-captions/",
    "/tutorials/audio-reactive-video-effects/",
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
    assert len(tutorials["cards"]) == 12, (lang, "tutorial count")
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
            assert parsed.tutorial_cards==12, (html, "tutorial cards", parsed.tutorial_cards)
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
    for hub, css_class, count in [("gallery", "tutorial-link", 13), ("tutorials", "tutorial-card", 12)]:
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

# Match the cards in editorial order, including the destination's own advertised
# translation when one exists. This also covers translated article filenames.

catalog = json.loads((SOURCE / "_data/blog_sections.json").read_text())
entries = [entry for section in catalog.values() for entry in section]
assert len(entries) == 82 and len(catalog) == 5
assert catalog["platforms-creators"][0]["brand"] == "X / Twitter"
for lang, slug in {"en": "", **LOCALES}.items():
    rendered = (RENDERED / slug / "blog/index.html").read_text()
    strings = json.loads((SOURCE / "_data/blog_index" / f"{lang}.json").read_text())
    cards = re.findall(r'<a href="([^"]+)" hreflang="([^"]+)" class="post-card">(.*?)</a>', rendered, re.S)
    assert len(cards) == len(entries), (lang, "blog card count", len(cards))
    assert strings["disclosure"] in unescape(rendered), (lang, "AI disclosure")
    for entry, (href, destination_lang, body) in zip(entries, cards):
        path = entry["href"]
        english_file = RENDERED / path.lstrip("/")
        if english_file.is_dir():
            english_file = english_file / "index.html"
        alternate = re.search(r'<link rel="alternate" hreflang="' + re.escape(lang) + r'" href="([^"]+)"', english_file.read_text())
        expected = urlsplit(alternate[1]).path if alternate else path
        assert href == expected, (lang, path, expected, href)
        assert destination_lang == lang, (lang, path, "every blog card must have its own-language destination")
        label = re.search(r'<small class="article-language">([^<]+)</small>', body)
        assert label is None, (lang, path, "obsolete English article label")
        if label:
            assert unescape(label[1]) == strings["english"], (lang, path)
        for tag in ("h3", "p"):
            field = re.search(r"<" + tag + r">([^<]+)</" + tag + r">", body)
            assert field and field[1].strip(), (lang, path, tag)
        assert unescape(re.search(r'<span class="tag">([^<]+)</span>', body)[1]) == strings["tags"][entry["tag"]]
    for key, section in strings["sections"].items():
        assert f'href="#{key}"' in rendered and f'id="{key}"' in rendered and section["title"] in unescape(rendered)
    assert all(f"ct=blog_{campaign}" in rendered for campaign in ("edit_videos", "check_ai_media", "protect_your_privacy"))
print(f"Verified {len(entries)} ordered blog cards in {len(LOCALES)+1} languages.")

# Feature tutorials must remain complete in every language and belong to the
# tutorial collection, even though they share the editorial page layout.
for guide in ("translate-video-captions", "audio-reactive-video-effects"):
    english = (RENDERED / "tutorials" / guide / "index.html").read_text()
    original = english.split("<article>")[1].split("</article>")[0]
    expected_counts = tuple(original.count(f"</{tag}>") for tag in ("h2", "p", "li"))
    for lang, slug in {"en": "", **LOCALES}.items():
        prefix = "/" + slug if slug else ""
        rendered = (RENDERED / slug / "tutorials" / guide / "index.html").read_text()
        article = rendered.split("<article>")[1].split("</article>")[0]
        assert tuple(article.count(f"</{tag}>") for tag in ("h2", "p", "li")) == expected_counts, (lang, guide, "incomplete guide")
        assert article.count('class="disclosure ai-disclosure"') == 1, (lang, guide, "disclosure")
        assert "{{" not in rendered and "{%" not in rendered, (lang, guide, "unrendered template")
        other = "audio-reactive-video-effects" if guide == "translate-video-captions" else "translate-video-captions"
        assert f'href="{prefix}/tutorials/{other}/"' in article, (lang, guide, "localized related guide")
        graphs = [json.loads(raw) for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>', rendered, re.S)]
        nodes = [node for graph in graphs for node in graph.get("@graph", [graph])]
        tutorial = next(node for node in nodes if node.get("@type") == "TechArticle")
        breadcrumbs = next(node for node in nodes if node.get("@type") == "BreadcrumbList")
        url = f"https://bytewaveai.com{prefix}/tutorials/{guide}/"
        assert tutorial["url"] == url and tutorial["inLanguage"] == lang, (lang, guide)
        assert tutorial["datePublished"] == tutorial["dateModified"] == "2026-11-19", (lang, guide, "dates")
        assert tutorial["isPartOf"]["url"] == f"https://bytewaveai.com{prefix}/tutorials/", (lang, guide, "collection")
        assert breadcrumbs["itemListElement"][1]["item"] == tutorial["isPartOf"]["url"], (lang, guide, "breadcrumb")
print("Verified 34 feature tutorials, complete translations, related links and tutorial metadata.")

# The opinion pieces distinguish generated scenes from edits and identify
# whose experience is being reported. Keep their evidence and next steps intact.
editorials = {
    "when-ai-filters-change-what-happened": (
        2, 9, "2026/06/new-ai-tools-to-help-you-make-things-happen-on-facebook/", "blog_ai_filters"
    ),
    "facebook-ai-labels-filters-generated-images": (
        3, 11, "2024/04/metas-approach-to-labeling-ai-generated-content-and-manipulated-media/", "blog_facebook_ai_labels"
    ),
}
for lang, slug in {"en": "", **LOCALES}.items():
    prefix = f"/{slug}" if slug else ""
    for article_slug, (headings, paragraphs, source, campaign) in editorials.items():
        path = f"/blog/{article_slug}.html"
        rendered = (RENDERED / slug / path.lstrip("/")).read_text()
        article = rendered.split("<article>", 1)[1].split("</article>", 1)[0]
        body = article.split('<p class="lead">', 1)[1].split('<p><a class="button"', 1)[0]
        assert body.count("</p>") == paragraphs and body.count("<h2>") == headings, (lang, path)
        assert f'href="https://about.fb.com/news/{source}"' in body, (lang, path)
        assert f'href="{prefix}/tutorials/check-c2pa-content-credentials/"' in body, (lang, path)
        if article_slug == "when-ai-filters-change-what-happened":
            assert f'href="{prefix}/blog/facebook-ai-labels-filters-generated-images.html"' in body, lang
        assert f"ct={campaign}&amp;mt=8" in article, (lang, path)
        schema = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', rendered, re.S)[1])
        post = next(node for node in schema["@graph"] if node["@type"] == "BlogPosting")
        assert post["inLanguage"] == lang and post["datePublished"] == "2026-10-06"
        assert post["dateModified"] == ("2026-10-06" if lang == "en" else "2026-11-18")
        assert post["image"] == f"https://bytewaveai.com/assets/social/{article_slug}.jpg"
print("Verified 34 editorial articles, source links, local reading paths, dates and original artwork.")

# Each figure describes a different sample in the same preprint.
missing_label = "no-ai-label-does-not-mean-real"
metadata_labels = "does-removing-metadata-remove-ai-labels"
for lang, slug in {"en": "", **LOCALES}.items():
    prefix = f"/{slug}" if slug else ""
    for name, peer, figure, original_date, headings, bullets in (
        (missing_label, metadata_labels, "33", "2026-09-22", 3, 0),
        (metadata_labels, missing_label, "61", "2026-10-01", 4, 3),
    ):
        rendered = (RENDERED / slug / "blog" / f"{name}.html").read_text()
        article = rendered.split("<article>", 1)[1].split("</article>", 1)[0]
        assert article.count("<h2>") == headings and article.count("<li>") == bullets, (lang, name)
        assert re.search(rf"(?:{figure}\s*%|%{figure})", article), (lang, name)
        assert 'href="https://arxiv.org/abs/2609.38571"' in article
        assert f'href="{prefix}/blog/{peer}.html"' in article
        assert f'href="{prefix}/tutorials/check-c2pa-content-credentials/"' in article
        assert f'<time datetime="{original_date}">' in article and '<time datetime="2026-10-07">' in article
        if name == metadata_labels:
            assert 'href="https://c2pa.org/faqs/"' in article
            assert f'href="{prefix}/tutorials/remove-location-metadata/"' in article
        else:
            assert 'href="https://www.oversightboard.com/news/meta-must-do-more-against-harmful-deepfakes-containing-hate-speech/"' in article
            assert 'href="https://spec.c2pa.org/specifications/specifications/2.2/explainer/Explainer.html"' in article
        related = "check-ai-video-without-uploading" if name == missing_label else "can-photos-videos-reveal-your-address"
        assert f'href="{prefix}/blog/{related}.html"' in article, (lang, name)
print("Verified both AI-label guides in all 17 languages, including citations, study figures and related guides.")

# Check the complete article body and resolve each source link across editions.
article_counts = {
    "gta-online-anger-scores-player-privacy": (6, 16, 4),
    "meta-muse-ai-privacy-concerns": (8, 23, 5),
    "bytewave-vs-meta-creative-control": (5, 16, 0),
    "meta-italy-facebook-camera-roll-fine": (6, 18, 3),
    "meta-muse-privacy-security-incidents": (11, 26, 0),
    "meta-muse-privacy-security": (7, 23, 0),
    "the-next-tiktok-may-start-as-a-video-editor": (8, 22, 8),
    "bytewave-advanced-editing-keyframes-translation": (8, 19, 0),
    "what-are-metal-shaders-iphone-gpu": (6, 18, 0),
    "bytewave-vs-vn-video-editor-2026": (7, 18, 2),
    "free-capcut-alternative-2026": (9, 19, 4),
    "how-to-check-ai-generated-photos-videos": (8, 19, 0),
    "reduce-ai-content-tiktok-feed": (7, 18, 4),
    "reduce-ai-videos-facebook-feed": (6, 16, 4),
    "tired-of-ai-videos-social-media": (6, 17, 3),
    "apple-app-store-commissions-free-alternatives": (3, 14, 0),
    "russia-geoblocking-disinformation": (2, 10, 0),
    "starlink-ukraine-cell-service-trust": (4, 17, 0),
    "is-capcut-banned-2026": (5, 13, 0),
    "free-software-movement-2.0": (4, 21, 0),
    "meta-settlement-youth-safety-social-media-design": (6, 14, 5),
    "tiktok-congress-child-safety-platform-accountability": (6, 20, 4),
    "video-editing-app-comparison-2026": (7, 13, 0),
    "best-free-video-editor-no-watermark": (4, 10, 0),
    "slow-motion-video-iphone-free": (4, 18, 0),
    "custom-video-filters-ai-tutorial": (4, 19, 0),
    "community-filters-bytewave": (5, 15, 0),
    "tools-newsrooms-check-ai-generated-media": (4, 11, 4),
    "provenance": (5, 21, 0),
    "your-feed": (2, 14, 0),
    "anthropic-claude-public-trust": (3, 15, 0),
    "meta-technical-errors-political-accounts": (6, 16, 0),
    "meta-no-kings-instagram-suspension": (4, 19, 0),
    "meta-angie-nixon-instagram-suspension": (3, 12, 0),
    "meta-25-billion-privacy-judgment": (3, 10, 0),
    "tiktok-internal-child-safety-warnings": (3, 13, 0),
    "gates-foundation-ai-in-schools": (0, 9, 0),
    "youre-not-alone-wanting-less-ai": (2, 13, 0),
    "openai-sora-deepfakes-public-trust": (3, 15, 0),
    "offline-video-editor-airplane-mode-test": (4, 14, 4),
    "adobe-venezuela-creative-cloud-access": (3, 13, 3),
    "google-nest-cloud-features-end-support": (3, 13, 3),
    "europe-digital-sovereignty-cloud-dependence": (3, 14, 0),
    "payment-processors-itch-io-content-control": (3, 13, 0),
    "how-bytewave-feed-works-without-server-watch-history": (8, 10, 4),
    "x-free-speech-account-control": (3, 16, 0),
    "tiktok-us-deal-bytedance-china-ties": (4, 12, 3),
    "meta-muse-shared-chats-exposed": (3, 13, 0),
    "meta-muse-profiles-people-who-never-signed-up": (3, 14, 0),
    "disconnect-meta-muse": (4, 11, 0),
    "whatsapp-ai-support-hidden-instructions": (4, 14, 0),
    "facebook-camera-roll-unposted-photos": (2, 14, 0),
    "meta-ai-chats-feed-ads-personalization": (2, 13, 0),
    "keep-ai-out-of-the-classroom": (0, 8, 0),
    "the-ai-teacher-was-wrong": (0, 7, 0),
    "meta-ray-ban-glasses-unwanted-recordings": (3, 11, 0),
    "tiktok-ai-avatars-product-ads": (2, 11, 3),
    "youtube-likeness-detection-privacy": (3, 11, 3),
    "does-emoji-protect-child-face-facebook": (1, 13, 0),
    "turn-off-youtube-automatic-dubbing": (4, 12, 3),
    "disable-youtube-ai-remix": (3, 11, 4),
    "capcut-privacy-video-upload": (3, 11, 0),
    "edit-videos-no-account-iphone": (6, 12, 4),
    "check-ai-video-without-uploading": (3, 11, 3),
    "can-photos-videos-reveal-your-address": (3, 8, 6),
    "photo-access-ai-privacy-inferences": (2, 12, 0),
    "content-credentials-privacy": (3, 12, 3),
    "ai-training-creator-consent": (2, 9, 0),
    "chatgpt-fake-artist-signatures": (2, 13, 0),
    "chatgpt-image-generation-ads": (2, 11, 0),
    "google-photos-ai-memories-dont-need-fixing": (2, 13, 0),
}
for name, counts in article_counts.items():
    path = Path("blog") / f"{name}.html"
    original = (RENDERED / path).read_text().split("<article>")[1].split("</article>")[0]
    links = re.findall(r'<a [^>]*href="([^"]+)"', original)
    source_download = re.search(r'<a class="site-download" href="([^"]+)"', (RENDERED / path).read_text())[1]
    for lang, slug in LOCALES.items():
        rendered = (RENDERED / slug / path).read_text()
        if name in {
            "bytewave-vs-meta-creative-control",
            "meta-italy-facebook-camera-roll-fine",
            "meta-muse-privacy-security-incidents",
            "meta-muse-privacy-security",
            "the-next-tiktok-may-start-as-a-video-editor",
            "bytewave-advanced-editing-keyframes-translation",
            "what-are-metal-shaders-iphone-gpu",
            "bytewave-vs-vn-video-editor-2026",
            "free-capcut-alternative-2026",
            "how-to-check-ai-generated-photos-videos",
            "reduce-ai-content-tiktok-feed",
            "reduce-ai-videos-facebook-feed",
            "tired-of-ai-videos-social-media",
            "apple-app-store-commissions-free-alternatives", "russia-geoblocking-disinformation",
            "starlink-ukraine-cell-service-trust", "is-capcut-banned-2026",
            "free-software-movement-2.0", "meta-settlement-youth-safety-social-media-design",
            "tiktok-congress-child-safety-platform-accountability", "video-editing-app-comparison-2026",
        }:
            assert f'<a class="site-download" href="{source_download}"' in rendered, (lang, name, "download destination")
        article = rendered.split("<article>")[1].split("</article>")[0]
        assert tuple(article.count(f"</{tag}>") for tag in ("h2", "p", "li")) == counts, (lang, name)
        assert original.split('<time datetime="')[1].split('"')[0] in article
        assert 'class="disclosure ai-disclosure"' in article and article != original
        if name == "the-ai-teacher-was-wrong":
            assert "<em>seventeen</em>" in article and "<strong>seveen</strong>" in article, lang
        if name == "keep-ai-out-of-the-classroom":
            for figure in ("48", "17"):
                assert re.search(rf"(?:{figure}\s*[%％]|[%％]{figure})", article), (lang, figure)
        if name == "how-bytewave-feed-works-without-server-watch-history":
            assert article.count('role="listitem"') == 4 and "Firebase Authentication" in article, lang
        if name == "tiktok-us-deal-bytedance-china-ties":
            assert re.search(r"(?:19[.,]9\s*[%％]|[%％]19[.,]9)", article), lang
        if name == "meta-angie-nixon-instagram-suspension":
            assert "<strong>@LatinosConAngie</strong>" in article, lang
        if name == "youre-not-alone-wanting-less-ai":
            for value in ("57", "42", "65", "50"):
                assert re.search(rf"(?:{value}\s*[%％]|[%％]\s*{value})", article), (lang, value)
        if name == "tools-newsrooms-check-ai-generated-media":
            assert article.count('<th scope="row">') == 3 and article.count("</td>") == 3, lang
        if name == "provenance":
            assert 'id="signed-exports"' in article and 'href="#signed-exports"' in article, lang
        if name == "apple-app-store-commissions-free-alternatives":
            assert article.count('<th scope="row">') == 3 and article.count('</td>') == 3, lang
            assert '<caption>' in article and article.count('<th scope="col">') == 2, lang
            for percentage in ("5", "10", "25"):
                assert re.search(rf"(?:{percentage}\s*[%％]|[%％]\s*{percentage})", article), (lang, percentage)
        if name == "starlink-ukraine-cell-service-trust":
            for speed in ("160", "100"):
                assert speed in article, (lang, speed)
        if name == "meta-settlement-youth-safety-social-media-design":
            assert "52" in article and "Firebase Authentication" in article, lang
            assert '<time datetime="2026-10-21">' in article, lang
        if name == "video-editing-app-comparison-2026":
            for platform in ("iOS 26", "iPadOS 26", "macOS 26", "M1"):
                assert platform in article, (lang, platform)
        if name in {"reduce-ai-content-tiktok-feed", "reduce-ai-videos-facebook-feed", "tired-of-ai-videos-social-media"}:
            dates = re.findall(r'<time datetime="([^"]+)"', article)
            assert dates == re.findall(r'<time datetime="([^"]+)"', original), (lang, name, "source dates")
        if name in {"reduce-ai-content-tiktok-feed", "reduce-ai-videos-facebook-feed", "tired-of-ai-videos-social-media", "how-to-check-ai-generated-photos-videos"}:
            assert re.findall(r'href="(#[^"]+)"', article) == re.findall(r'href="(#[^"]+)"', original), (lang, name, "section navigation")
        if name == "what-are-metal-shaders-iphone-gpu":
            code = r'<pre class="code-block"><code>(.*?)</code></pre>'
            assert re.search(code, article, re.S)[1] == re.search(code, original, re.S)[1], (lang, "Metal code")
        if name == "bytewave-vs-vn-video-editor-2026":
            assert article.count('<th scope="row">') == 8 and article.count('</td>') == 16, lang
            assert '<caption>' in article and article.count('<th scope="col">') == 3, lang
            assert 'role="region"' in article and 'tabindex="0"' in article, (lang, "accessible table")
            for platform in ("iOS 26", "iOS 16"):
                assert platform in article, (lang, platform)
        if name == "bytewave-advanced-editing-keyframes-translation":
            for platform in ("iOS 26", "iPadOS 26", "macOS 26", "M1"):
                assert platform in article, (lang, platform)
        if name == "tired-of-ai-videos-social-media":
            assert article.count('</dt>') == 6 and article.count('</dd>') == 6, lang
            assert re.search(r"(?:57\s*[%％]|[%％]\s*57)", article), lang
        if name == "bytewave-vs-meta-creative-control":
            assert article.count('<th scope="col">') == 2 and article.count('</td>') == 4, lang
            assert '<caption>' in article and 'class="comparison"' in article, (lang, "full comparison table")
        if name == "the-next-tiktok-may-start-as-a-video-editor":
            assert article.count('role="listitem"') == 4 and article.count('class="thesis"') == 2, lang
            assert 'role="list" aria-label="' in article, (lang, "creation-to-network steps")
            assert 'New SMP Entrant' in article, (lang, "settlement term")
            for year in ("2016", "2017", "2018", "2026"):
                assert year in article, (lang, "source chronology", year)
        if name == "meta-italy-facebook-camera-roll-fine":
            assert '<img src="/assets/brands/meta.svg" width="128" height="72" alt="Meta"' in article, (lang, "original brand artwork")
            assert article.index('src="/assets/brands/meta.svg"') < article.index('<h1>'), (lang, "brand artwork position")
            for figure in ("2023", "122", "60"):
                assert figure in article, (lang, "ruling details", figure)
        if name in {"meta-muse-privacy-security", "meta-muse-privacy-security-incidents"}:
            assert re.findall(r'<time datetime="([^"]+)"', article) == re.findall(r'<time datetime="([^"]+)"', original), (lang, name, "original source dates")
            assert re.findall(r'href="(#[^"]+)"', article) == re.findall(r'href="(#[^"]+)"', original), (lang, name, "section navigation")
        expected = []
        for link in links:
            if link.startswith("/"):
                link_path, separator, fragment = link.partition("#")
                target = RENDERED / link_path.strip("/")
                if target.is_dir():
                    target = target / "index.html"
                alternate = re.search(r'<link rel="alternate" hreflang="' + lang + r'" href="([^"]+)"', target.read_text())
                if alternate:
                    link = urlsplit(alternate[1]).path + separator + fragment
                else:
                    assert f'href="{link}" hreflang="en"' in article, (lang, name, link)
            expected.append(link)
        assert re.findall(r'<a [^>]*href="([^"]+)"', article) == expected, (lang, name)
        if name == "bytewave-vs-vn-video-editor-2026":
            privacy_guide = (RENDERED / expected[-1].lstrip("/")).read_text()
            assert f'href="/{slug}/blog/{name}.html"' in privacy_guide, (lang, "privacy guide comparison link")
            assert f'href="/blog/{name}.html"' not in privacy_guide, (lang, "English comparison link")
            for route in ("privacy.html", "tutorials/remove-location-metadata/"):
                assert f'href="/{slug}/{route}"' in privacy_guide, (lang, "privacy guide reading link", route)
                assert f'href="/{route}"' not in privacy_guide, (lang, "English privacy guide link", route)
print(f"Verified {len(article_counts) * len(LOCALES)} translated articles, paragraph and list counts, citations and related reading.")

for lang, slug in LOCALES.items():
    home = (RENDERED / slug / "index.html").read_text()
    for route in (
        "blog/reduce-ai-videos-facebook-feed.html", "blog/reduce-ai-content-tiktok-feed.html",
        "blog/tired-of-ai-videos-social-media.html", "blog/free-capcut-alternative-2026.html",
        "blog/provenance.html#signed-exports", "blog/tools-newsrooms-check-ai-generated-media.html",
        "gallery/", "tutorials/animated-captions/", "tutorials/check-c2pa-content-credentials/",
        "tutorials/motion-blur/",
    ):
        assert f'href="/{slug}/{route}"' in home, (lang, route, "homepage reading link")
        assert f'href="/{route}"' not in home, (lang, route, "English homepage link")
print("Verified localized homepage reading links for the new feed and editing guides.")
