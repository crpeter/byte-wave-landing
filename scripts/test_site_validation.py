#!/usr/bin/env python3
"""Make sure the approved content gates reject realistic regressions."""
import contextlib
import io
import shutil
import tempfile
from pathlib import Path
import validate_site

root = validate_site.ROOT
with tempfile.TemporaryDirectory() as folder:
    fixture = Path(folder)
    for p in root.iterdir():
        if p.name == '.git': continue
        if p.name == 'assets': (fixture / p.name).symlink_to(p, target_is_directory=True)
        elif p.is_dir(): shutil.copytree(p, fixture / p.name)
        else: shutil.copy2(p, fixture / p.name)
    shutil.copy2(validate_site.SOURCE_ROOT / "_config.yml", fixture / "_config.yml")
    validate_site.ROOT = fixture
    def run():
        output = io.StringIO()
        with contextlib.redirect_stdout(output): result = validate_site.main(fixture / "_config.yml")
        return result, output.getvalue()
    assert run()[0] == 0
    cases = [
        ('es/blog/editor-de-video-sin-subir-archivos.html', 'generado con un modelo de lenguaje de IA (LLM)', 'editado', 'disclosure must explicitly identify'),
        ('es/index.html', 'hreflang="en" href="https://bytewaveai.com/"', 'hreflang="en" href="https://bytewaveai.com/es/"', 'missing reciprocal'),
        ('fr/blog/editeur-video-prive-sans-cloud.html', 'texte généré à l’aide d’un modèle de langage', 'texte écrit à la main', 'disclosure must explicitly identify'),
        ('fr/index.html', 'hreflang="en" href="https://bytewaveai.com/"', 'hreflang="en" href="https://bytewaveai.com/fr/"', 'missing reciprocal'),
        ('pt-br/index.html', 'Seus vídeos ficam no seu dispositivo', 'Seus vídeos ficam nseu dispositivo', 'malformed Brazilian Portuguese copy'),
        ('ja/index.html', 'hreflang="en" href="https://bytewaveai.com/"', 'hreflang="en" href="https://bytewaveai.com/ja/"', 'missing reciprocal'),
        ('pt-br/blog/editor-video-privado-sem-nuvem.html', 'modelo de linguagem', 'texto editado', 'disclosure must explicitly identify'),
        ('zh-hant/blog/private-video-editor-no-cloud.html', '語言模型', '一般文字', 'disclosure must explicitly identify'),
        ('tutorials/frame-rate-conversion/index.html', 'class="disclosure ai-disclosure"', 'class="disclosure"', 'expected one visible AI disclosure'),
        ('blog/provenance.html', '"dateModified": "2026-10-18"', '"dateModified": "2026-01-01"', 'disagrees with sitemap'),
        ('about.html', '<a href="/free-expression.html">Free expression</a>', '', 'missing shared footer links'),
        ('pt-br/about.html', 'hreflang="en" href="https://bytewaveai.com/about.html"', 'hreflang="en" href="https://bytewaveai.com/pt-br/about.html"', 'missing reciprocal'),
        ('de/privacy.html', 'hreflang="en" href="https://bytewaveai.com/privacy.html"', 'hreflang="en" href="https://bytewaveai.com/de/privacy.html"', 'missing reciprocal'),
        ('ja/free-expression.html', 'hreflang="en" href="https://bytewaveai.com/free-expression.html"', 'hreflang="en" href="https://bytewaveai.com/ja/free-expression.html"', 'missing reciprocal'),
        ('_config.yml', 'assets/videos/layout/warped-sunset/*', 'assets/videos/layout/warped-sunset', 'linked resource excluded from publication'),
        ('gallery/index.html', 'poster="/assets/videos/layout/warped-sunset-4k/poster.jpg"', 'poster="/assets/videos/layout/warped-sunset-4k/missing.jpg"', 'broken link /assets/videos/layout/warped-sunset-4k/missing.jpg'),
        ('gallery/index.html', 'data-stream="/assets/videos/layout/warped-sunset-4k/original.m3u8"', 'data-stream="/assets/videos/layout/warped-sunset-4k/missing.m3u8"', 'broken link /assets/videos/layout/warped-sunset-4k/missing.m3u8'),
    ]
    for name, before, after, message in cases:
        p = fixture / name; original = p.read_text(); assert before in original
        p.write_text(original.replace(before, after))
        result, output = run()
        assert result == 1 and message in output, (name, output)
        p.write_text(original)
    validate_site.ROOT = root
print('Site gates reject content regressions, excluded resources, missing posters, and missing video streams.')

# Verify all newly rendered creation-guide translations under the existing CI suite.
from runpy import run_path
run_path(str(validate_site.SOURCE_ROOT / 'scripts' / 'test_creation_tutorials.py'))
run_path(str(validate_site.SOURCE_ROOT / 'scripts' / 'test_short_tutorial_translations.py'))
run_path(str(validate_site.SOURCE_ROOT / 'scripts' / 'test_technical_provenance_guides.py'))
run_path(str(validate_site.SOURCE_ROOT / 'scripts' / 'test_comparison_tutorial_translations.py'))
