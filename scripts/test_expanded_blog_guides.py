#!/usr/bin/env python3
"""Check the partial blog rollout without implying the entire archive is translated."""
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

SOURCE = Path(__file__).resolve().parents[1]
SITE = SOURCE / '_site'
LANGUAGES = json.loads((SOURCE / '_data/expanded_languages.json').read_text())
SLUGS = ('edit-videos-no-account-iphone', 'offline-video-editor-airplane-mode-test')
PRIVATE_SLUG = 'best-video-editor-privacy-no-upload'


class Article(HTMLParser):
    def __init__(self, raw):
        super().__init__()
        self.counts = Counter()
        self.links = []
        self.text = []
        self.feed(raw)

    def handle_starttag(self, tag, attrs):
        self.counts[tag] += 1
        if tag == 'a':
            self.links.append(dict(attrs))

    def handle_data(self, text):
        self.text.append(text)


def body(path):
    return path.read_text().split('---', 2)[2]


def main():
    english = {slug: Article(body(SOURCE / 'blog' / f'{slug}.html')) for slug in SLUGS}
    original_guide = (SITE / 'blog' / f'{PRIVATE_SLUG}.html').read_text()
    guide_reference = Article(re.search(r'<article\b[^>]*>(.*?)</article>', original_guide, re.S)[1])
    for lang in LANGUAGES:
        data = json.loads((SOURCE / '_data/blog_index' / f'{lang}.json').read_text())
        urls = {f'/{lang}/blog/{slug}.html' for slug in (*SLUGS, PRIVATE_SLUG)}
        assert data['starter'] is True, lang
        assert set(data['cards']) == {f'/blog/{slug}.html' for slug in (*SLUGS, PRIVATE_SLUG)}, lang
        index = (SITE / lang / 'blog/index.html').read_text()
        cards = re.findall(r'<a\b[^>]*class="post-card"[^>]*>.*?</a>', index, re.S)
        assert len(cards) == 3, (lang, 'blank or extra archive cards')
        assert {Article(card).links[0]['href'] for card in cards} == urls, lang
        assert all(f'hreflang="{lang}"' in card for card in cards), lang
        for card in cards:
            assert re.search(r'<h3>\S.*?</h3>', card, re.S), lang
            assert re.search(r'<p>\S.*?</p>', card, re.S), lang
        assert data['all_articles_label'] in index and 'href="/blog/" hreflang="en"' in index, lang
        assert f'href="/{lang}/tutorials/"' in index, lang
        assert '{{' not in index and '{%' not in index, lang
        for relative in ['index.html', 'tutorials/check-c2pa-content-credentials/index.html']:
            raw = (SITE / lang / relative).read_text()
            assert f'href="/{lang}/blog/"' in raw, (lang, relative, 'local blog navigation')
            assert data['all_articles_label'] in raw and 'href="/blog/" hreflang="en"' in raw, (lang, relative, 'English archive access')
            # The new index must not redirect links to untranslated articles.
            for link in Article(raw).links:
                href = link.get('href', '')
                if href.startswith(f'/{lang}/blog/'):
                    assert href == f'/{lang}/blog/' or href in urls, (lang, href)
        for slug in SLUGS:
            source = SOURCE / lang / 'blog' / f'{slug}.html'
            translated = Article(body(source))
            for tag in ('p', 'h2', 'h3', 'li', 'ol', 'strong', 'a'):
                assert translated.counts[tag] == english[slug].counts[tag], (lang, slug, tag, 'incomplete body')
            assert translated.text != english[slug].text, (lang, slug, 'English body')
            raw = (SITE / lang / 'blog' / f'{slug}.html').read_text()
            assert '{{' not in raw and '{%' not in raw, (lang, slug)
            assert '@privacy' not in raw and 'href="@' not in raw, (lang, slug)
            article = Article(re.search(r'<article\b[^>]*>(.*?)</article>', raw, re.S)[1])
            for link in article.links:
                href = link.get('href', '')
                if href.startswith('/blog/'):
                    assert link.get('hreflang') == 'en', (lang, href)
                    assert re.search(re.escape(f'href="{href}"') + r'[^>]*>.*?</a>\s*<small lang="en">\(English\)</small>', raw, re.S), (lang, href, 'unlabelled English fallback')
                if href.startswith(f'/{lang}/'):
                    path = urlsplit(href).path
                    assert (SITE / (path.lstrip('/') + ('index.html' if path.endswith('/') else ''))).is_file(), (lang, href)
            for other in LANGUAGES:
                assert f'hreflang="{other}" href="https://bytewaveai.com/{other}/blog/{slug}.html"' in raw, (lang, other)
            for field in ('published_on', 'updated_on', 'source_updated_on'):
                match = re.search(rf'^{field}: (.+)$', (SOURCE / 'blog' / f'{slug}.html').read_text(), re.M)
                if match:
                    assert f'{field}: {match[1]}' in source.read_text(), (lang, slug, 'changed source date')
            if lang == 'ar':
                assert 'dir="rtl"' in raw.split('<head>')[0], slug
        guide_source = (SOURCE / lang / 'blog' / f'{PRIVATE_SLUG}.html').read_text()
        guide = (SITE / lang / 'blog' / f'{PRIVATE_SLUG}.html').read_text()
        guide_article = Article(re.search(r'<article\b[^>]*>(.*?)</article>', guide, re.S)[1])
        for tag in ('h1', 'h2', 'h3', 'p', 'a'):
            assert guide_article.counts[tag] == guide_reference.counts[tag], (lang, 'incomplete private guide', tag)
        assert guide_article.text != guide_reference.text, (lang, 'English private guide')
        assert '{{' not in guide and '{%' not in guide and 'href="@' not in guide, lang
        for date in ('published_on: "2026-04-26"', 'updated_on: "2026-11-15"'):
            assert date in guide_source, (lang, 'changed private-guide source date')
        guide_links = {a.get('href') for a in guide_article.links}
        for target in ('edit-videos-no-account-iphone', 'offline-video-editor-airplane-mode-test'):
            assert f'/{lang}/blog/{target}.html' in guide_links, (lang, target)
        assert f'/{lang}/tutorials/remove-location-metadata/' in guide_links, lang
        for link in guide_article.links:
            href = link.get('href', '')
            if href.startswith('/blog/'):
                assert link.get('hreflang') == 'en', (lang, href)
                assert re.search(re.escape(f'href="{href}"') + r'[^>]*>.*?</a>\s*<small lang="en">\(English\)</small>', guide, re.S), (lang, href)
        for relative in ('index.html', 'blog/edit-videos-no-account-iphone.html'):
            incoming = (SITE / lang / relative).read_text()
            assert f'href="/{lang}/blog/{PRIVATE_SLUG}.html"' in incoming, (lang, relative, 'private guide is not discoverable')
            assert f'href="/blog/{PRIVATE_SLUG}.html"' not in incoming, (lang, relative, 'stale English private-guide link')
        for other in LANGUAGES:
            assert f'hreflang="{other}" href="https://bytewaveai.com/{other}/blog/{PRIVATE_SLUG}.html"' in guide, (lang, other)
        if lang == 'ar':
            assert 'dir="rtl"' in guide.split('<head>')[0], 'Arabic private guide'
            assert 'dir="rtl"' in index.split('<head>')[0], 'Arabic blog index'
    print(f'Validated {len(LANGUAGES)} partial blog indexes and {len(LANGUAGES)*(len(SLUGS)+1)} complete articles, links, dates and RTL.')


if __name__ == '__main__':
    main()
