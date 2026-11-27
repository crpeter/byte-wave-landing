#!/usr/bin/env python3
"""Check the app-language homepage/tutorial rollout and remaining English blog fallbacks."""
import json
import re
from html import unescape
from pathlib import Path
from urllib.parse import urlparse
from validate_site import PageParser, ROOT, SOURCE_ROOT, BASE, EXPANDED_LOCALES

locales = sorted(EXPANDED_LOCALES)
slugs = [
    'animated-captions', 'caption-text-effects', 'import-custom-fonts',
    'animate-stickers', 'motion-blur', 'frame-rate-conversion',
    'temporal-noise-reduction', 'check-c2pa-content-credentials',
    'remove-location-metadata', 'translate-video-captions',
    'audio-reactive-video-effects',
]
paths = ['index.html', 'tutorials/index.html', 'layout/index.html'] + [f'tutorials/{s}/index.html' for s in slugs]
guide_content = {
    'animated-captions': ('creation_tutorials', 'animatedCaptions', 4, ['readabilityText']),
    'animate-stickers': ('creation_tutorials', 'animateStickers', 5, ['readabilityText']),
    'caption-text-effects': ('short_tutorials', 'captionEffects', 3, ['tip']),
    'import-custom-fonts': ('short_tutorials', 'customFonts', 4, ['unsupported', 'license']),
    'motion-blur': ('comparison_tutorials', 'motionBlur', 5, ['strength1', 'strength2', 'privacyText']),
    'frame-rate-conversion': ('comparison_tutorials', 'frameRate', 3, ['warp']),
    'temporal-noise-reduction': ('comparison_tutorials', 'temporalNoise', 3, ['lookFor']),
    'check-c2pa-content-credentials': ('technical_tutorials', 'c2pa', 3, ['limitsP1', 'limitsP2', 'verifiedAIMeaning', 'unverifiedMeaning']),
    'remove-location-metadata': ('technical_tutorials', 'metadata', 5, ['lockedP', 'photosP', 'credentialsP', 'visibleP']),
}

def shape(value):
    if isinstance(value, dict): return {k: shape(v) for k, v in value.items()}
    if isinstance(value, list): return [shape(v) for v in value]
    return type(value).__name__

def strings(value):
    if isinstance(value, dict):
        for v in value.values(): yield from strings(v)
    elif isinstance(value, list):
        for v in value: yield from strings(v)
    elif isinstance(value, str): yield value

for lang in locales:
    for family in ['i18n', 'tutorial_hub', 'layout_guide', 'creation_tutorials', 'short_tutorials', 'comparison_tutorials', 'technical_tutorials']:
        file = SOURCE_ROOT / '_data' / family / f'{lang}.json'
        data = json.loads(file.read_text())
        assert all(x.strip() for x in strings(data)), f'{file}: empty translation'
        if family in {'layout_guide', 'creation_tutorials', 'short_tutorials', 'comparison_tutorials'}:
            reference = json.loads((file.parent / 'en.json').read_text())
            assert shape(data) == shape(reference), f'{file}: incomplete translation structure'
        if family == 'technical_tutorials':
            for guide in ['c2pa', 'metadata']:
                reference = json.loads((file.parent / f'{guide}-western.json').read_text())['en']
                assert shape(data[guide]) == shape(reference), f'{file}: incomplete {guide}'
        if family == 'tutorial_hub':
            assert len(data['cards']) == 12, file
        if family == 'i18n':
            assert data['name'] != 'English', file
            assert data['home']['hero']['opening'] != 'Make something', file
            assert 'LLM' in data['disclosure']['text'], f'{file}: retain explicit language-model disclosure'
    for path in paths:
        rendered = ROOT / lang / path
        raw = rendered.read_text()
        page = PageParser(); page.feed(raw)
        expected = BASE + f'/{lang}/' + path.removesuffix('index.html')
        assert page.lang == lang, rendered
        assert page.canonicals == [expected], rendered
        assert EXPANDED_LOCALES.issubset(dict(page.alternates)), rendered
        assert page.title.strip() and page.metas.get('description'), rendered
        assert page.h1 == 1 and page.main_count == 1, rendered
        if lang == 'ar': assert 'dir="rtl"' in raw.split('<head>')[0], rendered
        for href in page.links:
            local = urlparse(href).path
            if local in {f'/{lang}/blog/', f'/{lang}/blog/best-video-editor-privacy-no-upload.html', f'/{lang}/blog/can-photos-videos-reveal-your-address.html'}:
                target = local.lstrip('/') + ('index.html' if local.endswith('/') else '')
                assert (ROOT / target).is_file(), (rendered, href)
                continue
            if local.startswith(f'/{lang}/'):
                suffix = local.removeprefix(f'/{lang}/')
                assert not suffix or suffix.startswith(('tutorials/', 'layout/', 'gallery/')) or suffix in {'about.html', 'press.html', 'privacy.html', 'free-expression.html'}, (rendered, href)
        if path == 'tutorials/index.html':
            for slug in slugs:
                assert f'/{lang}/tutorials/{slug}/' in page.links, (rendered, slug)
            assert f'/{lang}/layout/' in page.links, rendered
        if path == 'index.html':
            assert f'/{lang}/blog/best-video-editor-privacy-no-upload.html' in page.links, rendered
            assert f'/{lang}/gallery/' in page.links and '/blog/provenance.html#signed-exports' in page.links, rendered
            assert '/assets/landing/golden-sunrise/sunrise-1920.webp' in page.media, rendered
        if path.startswith('tutorials/') and path != 'tutorials/index.html':
            assert len(re.findall(r'class="[^"]*\bai-disclosure\b', raw)) == 1, rendered
            assert len(page.jsonld) >= 1, rendered
            slug = path.split('/')[1]
            if slug in guide_content:
                family, key, step_count, cautions = guide_content[slug]
                copy = json.loads((SOURCE_ROOT / '_data' / family / f'{lang}.json').read_text())[key]
                article = re.search(r'<article\b[^>]*>(.*?)</article>', raw, re.S)
                plain = unescape(re.sub(r'<[^>]+>', ' ', article.group(1)))
                for field in [f'step{i}' for i in range(1, step_count + 1)] + cautions:
                    assert copy[field] in plain, (rendered, f'missing instruction or caution: {field}')

print(f'Validated {len(locales)} additional languages, {len(locales) * len(paths)} pages, tutorial links, RTL and fallback destinations.')
