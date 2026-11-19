#!/usr/bin/env python3
"""Test sitemap validation and the real Liquid template in a small Jekyll site."""
from datetime import date
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

from validate_site import SOURCE_ROOT, validate_sitemap

FIXTURE = SOURCE_ROOT / "_sitemap-fixture"
BASE = "https://example.test"
TODAY = date(2026, 11, 19)


class SitemapValidationTests(unittest.TestCase):
    def check(self, entries, urls=None):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sitemap.xml"
            path.write_text(
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                + entries + '</urlset>')
            return validate_sitemap(path, urls or {BASE + '/'}, TODAY)

    def test_duplicate_urls_are_not_hidden_by_set_comparison(self):
        entry = f'<url><loc>{BASE}/</loc><lastmod>2026-11-18</lastmod></url>'
        _, errors = self.check(entry + entry)
        self.assertTrue(any('duplicate sitemap URL' in e for e in errors))

    def test_unknown_dates_are_omitted_instead_of_invented(self):
        dates, errors = self.check(f'<url><loc>{BASE}/</loc></url>')
        self.assertEqual(errors, [])
        self.assertIsNone(dates[BASE + '/'])

    def test_bad_dates_are_rejected(self):
        for value in ['', 'yesterday', '2026-02-30', '2026-1-1', '2026-11-20']:
            with self.subTest(value=value):
                _, errors = self.check(
                    f'<url><loc>{BASE}/</loc><lastmod>{value}</lastmod></url>')
                self.assertTrue(any('lastmod' in e for e in errors))

    def test_duplicate_dates_are_rejected(self):
        _, errors = self.check(f'<url><loc>{BASE}/</loc>'
                              '<lastmod>2026-11-18</lastmod>'
                              '<lastmod>2026-11-19</lastmod></url>')
        self.assertTrue(any('at most one' in e for e in errors))

    def test_missing_and_noncanonical_urls_are_rejected(self):
        _, errors = self.check(f'<url><loc>{BASE}/redirect.html</loc></url>')
        self.assertTrue(any('not canonical indexable page' in e for e in errors))
        self.assertTrue(any('canonical indexable page missing' in e for e in errors))

    def test_empty_and_duplicate_locations_are_rejected(self):
        for locations in ['<loc/>', f'<loc>{BASE}/</loc><loc>{BASE}/second</loc>']:
            with self.subTest(locations=locations):
                _, errors = self.check('<url>' + locations + '</url>')
                self.assertTrue(any('one nonempty URL' in e for e in errors))

    def test_wrong_namespace_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'sitemap.xml'
            path.write_text('<urlset/>')
            _, errors = validate_sitemap(path, set(), TODAY)
            self.assertTrue(any('namespaced urlset' in e for e in errors))


def write_page(name, frontmatter, body='<h1>Fixture</h1>'):
    path = FIXTURE / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('---\n' + frontmatter + '\n---\n' + body + '\n')


def prepare_fixture():
    if FIXTURE.exists():
        shutil.rmtree(FIXTURE)
    (FIXTURE / '_includes').mkdir(parents=True)
    (FIXTURE / '_data/layout_guide').mkdir(parents=True)
    shutil.copy2(SOURCE_ROOT / 'sitemap.xml', FIXTURE / 'sitemap.xml')
    shutil.copy2(SOURCE_ROOT / '_includes/sitemap-lastmod.html',
                 FIXTURE / '_includes/sitemap-lastmod.html')
    (FIXTURE / '_config.yml').write_text(f'url: {BASE}\nbaseurl: ""\n')
    (FIXTURE / '_data/layout_guide/de.json').write_text('{"modified":"2026-11-16"}')
    write_page('index.html', 'lang: en\nlast_modified_at: "2026-11-15"')
    write_page('article.html', 'lang: en\nupdated_on: "2026-11-18"\n'
               'published_on: "2026-10-01"\nlast_modified_at: "2026-10-02"')
    write_page('fr/guide.md', 'lang: fr\npermalink: /fr/guide/\n'
               'published_on: "2026-10-03"', '# Markdown guide')
    write_page('de/layout.md', 'lang: de\npermalink: /de/layout/\n'
               'translation_key: layout-guide\nlast_modified_at: "2026-01-01"')
    write_page('unknown.html', 'lang: en')
    write_page('escaped.html', 'lang: fr\npermalink: /fr/a&b.html\n'
               'last_modified_at: "2026-11-17T10:00:00Z"')
    write_page('remove-me.html', 'lang: en\npublished_on: "2026-10-04"')
    write_page('noindex.html', 'lang: en\nrobots: "NOINDEX, follow"')
    write_page('excluded.html', 'lang: en\nsitemap: false')
    write_page('redirect.html', 'lang: en\nredirect_to: /article.html')
    write_page('notes.html', 'title: Internal notes')
    write_page('feed.xml', 'lang: en', '<feed/>')
    (FIXTURE / 'static.html').write_text('<h1>No authored Jekyll metadata</h1>')
    print('Prepared real Jekyll sitemap fixtures.')


def verify_fixture(updated=False):
    expected = {
        BASE + '/': '2026-11-15',
        BASE + '/article.html': '2026-11-19' if updated else '2026-11-18',
        BASE + '/fr/guide/': '2026-10-03',
        BASE + '/de/layout/': '2026-11-18' if updated else '2026-11-16',
        BASE + '/unknown.html': None,
        BASE + '/fr/a&b.html': '2026-11-17',
    }
    if updated:
        expected[BASE + '/ja/new.html'] = '2026-11-19'
    else:
        expected[BASE + '/remove-me.html'] = '2026-10-04'
    path = FIXTURE / '_site/sitemap.xml'
    dates, errors = validate_sitemap(path, set(expected), TODAY)
    assert not errors, errors
    assert dates == expected, (dates, expected)
    raw = path.read_text()
    assert raw.startswith('<?xml'), 'XML declaration must be first'
    assert '/fr/a&amp;b.html' in raw, 'Sitemap URLs must be XML escaped'
    assert '<changefreq>' not in raw and '<priority>' not in raw
    assert list(dates) == sorted(dates), 'Sitemap order must be deterministic'
    print('Sitemap template passed: ' + ('automatic additions, removals and date changes.'
          if updated else 'canonical paths, dates, exclusions, escaping and stable undated entries.'))


def update_fixture():
    # Change only page/data inputs, never the sitemap template.
    write_page('article.html', 'lang: en\nupdated_on: "2026-11-19"\n'
               'published_on: "2026-10-01"')
    write_page('ja/new.html', 'lang: ja\nupdated_on: "2026-11-19"')
    (FIXTURE / 'remove-me.html').unlink()
    (FIXTURE / '_data/layout_guide/de.json').write_text('{"modified":"2026-11-18"}')
    print('Updated fixture content without editing the sitemap.')


if __name__ == '__main__':
    if sys.argv[1:] == ['--prepare-fixture']:
        prepare_fixture()
    elif sys.argv[1:] == ['--verify-fixture']:
        verify_fixture()
        update_fixture()
    elif sys.argv[1:] == ['--verify-updated-fixture']:
        verify_fixture(updated=True)
    else:
        unittest.main()
