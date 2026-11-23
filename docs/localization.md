# Homepage and tutorial languages

The homepage, tutorial directory and twelve tutorial destinations cover all 39
ByteWave app languages. The website has 40 locale variants because it retains
both European and Brazilian Portuguese. Existing Norwegian pages use `no` and
cover the app's Norwegian Bokmål (`nb`); there is no duplicate `/nb/` tree.

The 23 additional locales are listed in `_data/expanded_languages.json`.
Each has a homepage, tutorial index, Layout guide, and eleven pages under
`tutorials/`. Content uses the existing shared layouts and video assets.
The added `_data/i18n/*.json` files contain homepage copy and shared interface
strings; existing locales retain their YAML files.

Blog articles, the gallery and policy/company pages have not been translated
into these additional languages. Their links fall back to the existing English
destinations. Language menus and hreflang alternates list only real translations
of the current page. The sitemap discovers the new pages automatically.

The new translations are machine-assisted. Quechua in particular needs
native-speaker review before publication; structural and link checks do not
establish linguistic accuracy.

Arabic pages set `dir="rtl"`. Code and comparison-video labels keep a left-to-right
order so labels match the unchanged video halves. Thai and Khmer headings have
additional line height and normal letter spacing.

After a Jekyll build, run:

```sh
python3 scripts/validate_site.py
python3 scripts/test_expanded_languages.py
```

The expansion check also runs through `test_site_validation.py`. It verifies the
322 added pages, metadata, tutorial destinations, disclosure presence, translation
data structure, Arabic direction and links to untranslated sections.
