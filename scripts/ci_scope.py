#!/usr/bin/env python3
"""Select expensive checks; rendered content validation always runs."""
import json
import os
import re
import subprocess
from pathlib import Path


def select_checks(paths, full=False):
    paths = set(paths)
    infrastructure = full or any(
        p.startswith('.github/workflows/') or p in {
            'scripts/ci_scope.py', 'scripts/test_ci_scope.py', '_config.yml',
            'Gemfile', 'Gemfile.lock',
        } or p.startswith('_plugins/') for p in paths
    )
    shared = infrastructure or any(
        p.startswith(('_layouts/', '_includes/', 'assets/css/', '_data/i18n/'))
        or p == '_data/expanded_languages.json' for p in paths
    )
    return {
        'sitemap': infrastructure or bool(paths & {
            'sitemap.xml', '_includes/sitemap-lastmod.html',
            'scripts/test_sitemap.py', 'scripts/validate_site.py',
        }),
        'validator': infrastructure or bool(paths & {
            'scripts/validate_site.py', 'scripts/test_site_validation.py',
            'scripts/test_sitemap.py',
        }),
        'home': 'full' if shared or any(
            p.startswith(('assets/landing/golden-sunrise/', '_data/home_previews/'))
            or p in {'scripts/test_localized_layout.cjs', 'assets/js/video-player.js'}
            for p in paths
        ) else 'smoke',
        'secondary': shared or any(
            p.startswith(('_data/about.', '_data/privacy.', '_data/expression.',
                          '_data/press/', '_data/gallery_hub/', '_data/tutorial_hub/'))
            or p in {'scripts/test_secondary_browser.cjs',
                     'scripts/test_expanded_secondary_browser.cjs',
                     'assets/js/video-player.js'} for p in paths
        ),
    }


def main():
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    event_name = os.environ['GITHUB_EVENT_NAME']
    base = (event.get('pull_request', {}).get('base', {}).get('sha')
            if event_name == 'pull_request' else event.get('before'))
    full = event_name == 'workflow_dispatch'
    paths = []
    if not full:
        if not base or not re.fullmatch(r'[0-9a-f]{40}', base) or base == '0' * 40:
            full = True
        else:
            try:
                subprocess.run(['git', 'fetch', '--no-tags', '--depth=1', 'origin', base], check=True)
                result = subprocess.run(['git', 'diff', '--name-only', '-z', base, 'HEAD'],
                                        check=True, capture_output=True)
                paths = result.stdout.decode().rstrip('\0').split('\0') if result.stdout else []
            except (subprocess.CalledProcessError, UnicodeError):
                print('Cannot determine changed paths; running every check.')
                full = True
    checks = select_checks(paths, full=full)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        for name, value in checks.items():
            output.write(f'{name}={str(value).lower()}\n')
    print(json.dumps({'changed_files': len(paths), 'checks': checks}, indent=2))


if __name__ == '__main__':
    main()
