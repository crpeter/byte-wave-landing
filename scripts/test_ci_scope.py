#!/usr/bin/env python3
"""Guard against accidentally skipping broad checks after shared changes."""
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from ci_scope import main, select_checks


class ScopeTests(unittest.TestCase):
    def test_content_keeps_smoke_without_expensive_suites(self):
        for path in ['blog/new-story.html', 'de/blog/new-story.html',
                     '_data/blog_index/fr.json', 'index.html', 'README.md']:
            with self.subTest(path=path):
                self.assertEqual(select_checks([path]), {
                    'sitemap': False, 'validator': False,
                    'home': 'smoke', 'secondary': False,
                })

    def test_shared_changes_run_all_browser_suites(self):
        for path in ['_layouts/localized-home.html', '_includes/localized-nav.html',
                     'assets/css/landing.css', '_data/i18n/ar.yml',
                     '_data/expanded_languages.json', 'assets/js/video-player.js']:
            with self.subTest(path=path):
                checks = select_checks([path])
                self.assertEqual(checks['home'], 'full')
                self.assertTrue(checks['secondary'])

    def test_regressions_run_when_implementation_changes(self):
        checks = select_checks(['scripts/validate_site.py'])
        self.assertTrue(checks['validator'])
        self.assertTrue(checks['sitemap'])
        self.assertTrue(select_checks(['sitemap.xml'])['sitemap'])
        self.assertTrue(select_checks(['_includes/sitemap-lastmod.html'])['sitemap'])

    def test_secondary_translation_and_test_changes(self):
        for path in ['_data/press/ar.json', '_data/privacy.yml',
                     'scripts/test_secondary_browser.cjs',
                     'scripts/test_expanded_secondary_browser.cjs']:
            self.assertTrue(select_checks([path])['secondary'])

    def test_infrastructure_and_manual_runs_enable_everything(self):
        expected = dict(sitemap=True, validator=True, home='full', secondary=True)
        for path in ['_config.yml', 'Gemfile.lock', '_plugins/new.rb',
                     '.github/workflows/validate-site.yml', 'scripts/ci_scope.py',
                     'scripts/test_ci_scope.py']:
            self.assertEqual(select_checks([path]), expected)
        self.assertEqual(select_checks([], full=True), expected)

    def test_mixed_changes_preserve_strictest_scope(self):
        checks = select_checks(['README.md', '_includes/localized-footer.html',
                               'scripts/validate_site.py'])
        self.assertEqual(checks, dict(sitemap=True, validator=True, home='full', secondary=True))

    def run_event(self, name, event, git_result=None, git_error=None):
        with tempfile.TemporaryDirectory() as directory:
            event_path = Path(directory) / 'event.json'
            output_path = Path(directory) / 'output'
            event_path.write_text(json.dumps(event))
            env = {'GITHUB_EVENT_NAME': name, 'GITHUB_EVENT_PATH': str(event_path),
                   'GITHUB_OUTPUT': str(output_path)}
            with patch.dict(os.environ, env), patch('ci_scope.subprocess.run') as run:
                if git_error:
                    run.side_effect = git_error
                else:
                    run.return_value = subprocess.CompletedProcess([], 0, stdout=git_result or b'')
                main()
            return dict(line.split('=', 1) for line in output_path.read_text().splitlines()), run

    def test_pr_diff_uses_base_sha_and_nul_delimited_paths(self):
        base = 'a' * 40
        output, run = self.run_event('pull_request', {'pull_request': {'base': {'sha': base}}},
                                    b'blog/article with spaces.html\0_includes/localized-nav.html\0')
        self.assertEqual(run.call_args.args[0], ['git', 'diff', '--name-only', '-z', base, 'HEAD'])
        self.assertEqual(output['home'], 'full')
        self.assertEqual(output['secondary'], 'true')

    def test_manual_and_unknown_base_run_all_without_fetch(self):
        for name, event in [('workflow_dispatch', {}), ('push', {'before': '0' * 40})]:
            output, run = self.run_event(name, event)
            self.assertEqual(output, dict(sitemap='true', validator='true', home='full', secondary='true'))
            run.assert_not_called()

    def test_fetch_failure_runs_all_checks(self):
        output, _ = self.run_event('push', {'before': 'b' * 40},
                                  git_error=subprocess.CalledProcessError(1, 'git'))
        self.assertEqual(output, dict(sitemap='true', validator='true', home='full', secondary='true'))


if __name__ == '__main__':
    unittest.main()
