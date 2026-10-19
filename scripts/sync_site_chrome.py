#!/usr/bin/env python3
"""Keep static navigation/footer identical without requiring client-side rendering."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAV_LINKS = [('Features', '/#features'), ('Compare', '/#compare'), ('Gallery', '/gallery/'), ('Tutorials', '/tutorials/'), ('Blog', '/blog/')]
FOOTER_LINKS = [('Home', '/'), ('Gallery', '/gallery/'), ('Tutorials', '/tutorials/'), ('Blog', '/blog/'), ('About', '/about.html'), ('Press', '/press.html'), ('Privacy', '/privacy.html'), ('Free expression', '/free-expression.html'), ('Copyright / DMCA', '/dmca.html')]

def links(items):
    return '\n        '.join(f'<a href="{url}">{label}</a>' for label, url in items)

def navigation(download):
    return f'''<nav class="site-nav" aria-label="Main navigation">
    <a href="/" class="site-logo"><img src="/favicon-48x48.png" width="32" height="32" alt="">ByteWave</a>
    <div class="site-links">{links(NAV_LINKS)}</div>
    <details class="site-menu">
        <summary>Menu</summary>
        <div class="site-menu-links">{links(NAV_LINKS + [('About', '/about.html'), ('Privacy', '/privacy.html'), ('Free expression', '/free-expression.html'), ('Copyright / DMCA', '/dmca.html')])}</div>
    </details>
    <a class="site-download" href="{download}">Download Free</a>
</nav>'''

FOOTER = f'''<footer class="site-footer">
    <div class="site-footer-links">{links(FOOTER_LINKS)}</div>
    <p>© 2026 ByteWave. Video editing should be free.</p>
    <p class="compatibility">iPhone with iOS 26 or later · iPad with iPadOS 26 or later · Mac with macOS 26 or later and Apple M1 or later.</p>
</footer>'''

def main():
    for file in sorted(ROOT.rglob('*.html')):
        s = file.read_text()
        if re.search(r'http-equiv="refresh"', s, re.I):
            continue
        nav = re.search(r'<nav\b[^>]*>.*?</nav>', s, re.S)
        download = 'https://apps.apple.com/us/app/bytewave/id6752225642'
        if nav:
            match = re.search(r'href="(https://apps.apple.com/[^\"]+)"', nav[0])
            if match: download = match[1]
            s = s[:nav.start()] + s[nav.end():]
        anchor = re.search(r'<a class="site-skip"[^>]*>.*?</a>', s)
        if anchor is None: anchor = re.search(r'<body\b[^>]*>', s)
        s = s[:anchor.end()] + '\n' + navigation(download) + '\n' + s[anchor.end():].lstrip()
        if '<footer' in s:
            s = re.sub(r'<footer\b[^>]*>.*?</footer>', lambda _: FOOTER, s, flags=re.S)
        else:
            s = s.replace('</body>', FOOTER + '\n</body>')
        if '/assets/js/site-nav.js' not in s:
            s = s.replace('</body>', '<script src="/assets/js/site-nav.js" defer></script>\n</body>')
        s = '\n'.join(line.rstrip() for line in s.splitlines()) + '\n'
        if s != file.read_text(): file.write_text(s)

if __name__ == '__main__': main()
