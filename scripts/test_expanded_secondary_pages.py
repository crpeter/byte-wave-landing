#!/usr/bin/env python3
"""Verify complete company, policy, press and gallery translations in new locales."""
import json
import re
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from validate_site import BASE, EXPANDED_LOCALES, PageParser, ROOT, SOURCE_ROOT

FAMILIES = {
    'about': ('about.html', '_data/about.yml'),
    'privacy': ('privacy.html', '_data/privacy.yml'),
    'expression': ('free-expression.html', '_data/expression.yml'),
    'press': ('press.html', '_data/press/{lang}.json'),
    'gallery_hub': ('gallery/index.html', '_data/gallery_hub/{lang}.json'),
}

def copy_for(family, lang):
    path = FAMILIES[family][1]
    value = json.loads((SOURCE_ROOT / path.format(lang=lang)).read_text())
    return value if '{lang}' in path else value[lang]

def leaves(value, path=()):
    if isinstance(value, dict):
        for key, child in value.items(): yield from leaves(child, path + (key,))
    elif isinstance(value, list):
        for index, child in enumerate(value): yield from leaves(child, path + (index,))
    else:
        yield path, value

class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(); self.text = []; self.hidden = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.hidden += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.hidden -= 1
    def handle_data(self, text):
        if not self.hidden: self.text.append(text)

def normalized(value):
    return ' '.join(value.split())

for lang in sorted(EXPANDED_LOCALES):
    for family, (route, _) in FAMILIES.items():
        data = dict(leaves(copy_for(family, lang)))
        reference = dict(leaves(copy_for(family, 'en')))
        assert data.keys() == reference.keys(), (lang, family, 'incomplete data')
        assert all(isinstance(v, str) and v.strip() for v in data.values()), (lang, family, 'empty copy')
        assert not any('\ufffd' in v or '⁇' in v for v in data.values()), (lang, family, 'invalid translation character')
        artifact = re.compile(r'Q(?:FileDialog|WebPage)|KCharselect|@\s*(?:info|action)|&\s*#\s*160|\[9[0-9]{3}\]')
        assert not any(artifact.search(v) for v in data.values()), (lang, family, 'translation artifact')
        html = (ROOT / lang / route).read_text()
        page = PageParser(); page.feed(html)
        url = BASE + f'/{lang}/' + route.removesuffix('index.html')
        assert page.lang == lang and page.canonicals == [url], (lang, route, 'canonical or lang')
        assert EXPANDED_LOCALES.issubset(dict(page.alternates)), (lang, route, 'missing alternates')
        assert len(dict(page.alternates)) >= 40, (lang, route, 'existing languages omitted')
        assert page.main_count == 1 and page.h1 == 1, (lang, route, 'landmarks')
        assert page.title.strip() and page.metas.get('description'), (lang, route, 'metadata')
        if lang == 'ar': assert 'dir="rtl"' in html.split('<head>')[0], route
        for local_route in ('gallery/', 'about.html', 'press.html', 'privacy.html', 'free-expression.html', 'tutorials/'):
            assert f'/{lang}/{local_route}' in page.footer_links, (lang, route, local_route)
        assert '/blog/' in page.footer_links, (lang, route, 'blog fallback')
        main = re.search(r'<main\b[^>]*>(.*?)</main>', html, re.S).group(1)
        visible = VisibleText(); visible.feed(main)
        text = normalized(' '.join(visible.text))
        # All prose fields must actually render. Metadata, labels, alt text, and
        # copy-button status strings are checked in their own contexts below.
        skip = {'title', 'description', 'seo_title', 'aria_label', 'alt', 'id',
                'copy', 'copied', 'clipboard', 'manual'}
        for path, value in data.items():
            if path[-1] in skip: continue
            assert normalized(value) in text, (lang, family, path, 'missing rendered prose')
        for script in page.jsonld: json.loads(script)
        if family == 'about':
            assert '/blog/how-bytewave-feed-works-without-server-watch-history.html' in page.links, lang
            assert f'/{lang}/blog/how-bytewave-feed-works-without-server-watch-history.html' not in page.links, lang
        if family in ('privacy', 'expression', 'press'):
            assert 'cpeter@codyworks.org' in main, (lang, family, 'contact')
        if family == 'expression':
            assert 'id="appeal"' in main, lang
            assert 'subject=ByteWave%20moderation%20appeal' in main, lang
            assert 'https://constitution.congress.gov/browse/essay/amdt1-7-2-4/ALDE_00013541/' in page.links, lang
        if family == 'press':
            assert len(re.findall(r'class="copy"', main)) == 4, lang
            for field in ('copy', 'copied', 'clipboard', 'manual'):
                assert copy_for(family, lang)[field] in unescape(html), (lang, field)
            assert '/logo.png' in page.links and '/assets/og-image.jpg' in page.links, lang
        if family == 'gallery_hub':
            assert len(re.findall(r'<video\b', main)) == 13, lang
            assert len(re.findall(r'<figcaption\b', main)) == 13, lang
            assert main.count('data-bw-labels=') == 13, lang
            assert [c['id'] for c in copy_for(family, lang)['cards']] == [c['id'] for c in copy_for(family, 'en')['cards']], lang
            for card in copy_for(family, lang)['cards']:
                assert normalized(card['title']) in text, (lang, card['id'], 'visible title')
                assert normalized(card['alt']) in normalized(unescape(main)), (lang, card['id'], 'accessible description')

print(f'Validated {len(EXPANDED_LOCALES) * len(FAMILIES)} secondary pages: full copy, metadata, navigation, RTL, contacts, press controls and gallery content.')
