# Website localization

The homepage, tutorial directory and twelve tutorial destinations cover all 39
ByteWave app languages. The website has 40 locale variants because it retains
both European and Brazilian Portuguese. Existing Norwegian pages use `no` and
cover the app's Norwegian Bokmål (`nb`); there is no duplicate `/nb/` tree.

The 23 additional locales are listed in `_data/expanded_languages.json`.
Each has a homepage, tutorial index, Layout guide, and eleven pages under
`tutorials/`. Content uses the existing shared layouts and video assets.
The added `_data/i18n/*.json` files contain homepage copy and shared interface
strings; existing locales retain their YAML files.

Gallery, About, Press, Privacy Policy, and Free Expression / Appeals also cover
all 40 locale variants. The 23 additional locales include the full source text,
metadata, gallery descriptions, press copy controls, and policy/appeal details.
Each additional language has a partial blog index with five complete guides:
editing without an account, the airplane-mode editing test, private editing without
cloud uploads, free video editors without watermarks, and free slow-motion editing
on iPhone. The indexes retain an explicit link to the full English archive.
Links to available translations stay
in the selected language; links to untranslated articles use labelled English
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
322 homepage/tutorial pages, metadata, tutorial destinations, disclosure presence, translation
data structure, Arabic direction and links to untranslated blog sections.

Run `python3 scripts/test_expanded_secondary_pages.py` after building to check
the additional 115 company, policy, press, and gallery pages. It checks complete
translation data and rendered text, reciprocal language alternates, same-language
navigation, English blog fallbacks, Arabic RTL, and the original contact links.

The secondary-page translations are machine-assisted drafts. Native-speaker
review, especially for Quechua and policy wording, remains necessary; structural
checks do not certify linguistic or legal equivalence. Source policy and press
fact dates are retained; page modification dates record the translation update.

Run `python3 scripts/test_expanded_blog_guides.py` after building to check the
23 partial blog indexes and 115 translated articles. It checks source-complete
article structure, preserved source dates and product links, same-language
navigation and related reading, labelled English fallbacks, reciprocal language
alternates, and Arabic RTL. Slow-motion checks also retain all five steps, frame-rate
examples, and links to the localized FRC tutorial and watermark-free guide.
The localized secondary-page suite also runs it.
Editorial source and update dates are retained rather than changed to the
translation date; commercial-interest and AI-assistance disclosures remain visible.
