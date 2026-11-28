# Site checks

`Validate static site` builds the full Jekyll site once on each pull request and
push to `main`. Every check uses that same `_site` directory on the same runner.
New commits cancel unfinished runs for the same PR or branch. The separate
localized browser workflows have been folded into this workflow.

Every run checks all rendered links, metadata, sitemap entries, translation and
tutorial content, and the video player's recovery behavior. It also checks the
English, French and Japanese homepages and guides at desktop and mobile widths,
plus the existing language-menu, App Store link and background-image checks.

Expensive checks are selected by `scripts/ci_scope.py`:

- Shared layouts, includes, CSS and core locale data run the full homepage and
  secondary-page browser suites. Secondary-page translation data runs the full
  secondary suite. Changes to browser tests run their respective full suites.
- Ordinary article and copy edits use the smaller browser smoke suite; all-page
  rendered validation still runs.
- Validator changes run the validator mutation tests. Sitemap implementation
  changes run the two tiny sitemap fixture builds.
- CI/configuration/plugin changes, or an unavailable changed-file diff, run all
  checks. **Run workflow** in GitHub Actions also runs everything.

Browser screenshots and reports are retained for seven days. Chromium's download
is cached by OS, architecture and Playwright version; system dependencies are
still installed on each runner. Update the cache key when changing Playwright.

There is no automatic build of `main` for before screenshots. For a deliberate
local comparison, the homepage browser script still accepts `BEFORE_URL`.

Localized layouts filter the page list by language once and reuse that list for
navigation, footer and related-page links. The shared includes also support
standalone pages that do not pass a list. Translation alternates still search
across all languages. These are standard Liquid templates, with no custom plugin
or generated route data to maintain.

`profile: true` prints Jekyll's template timing table in each full build log.
Use that table to find remaining expensive templates before adding more build
machinery. Validation on `main` is retained so direct pushes are checked too.
