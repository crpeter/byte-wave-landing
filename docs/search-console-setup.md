# Search setup and the next data review

## Bing Webmaster Tools

Account setup is pending. Opening Bing during this change reached its sign-in page; no property was imported or sitemap submitted.

1. Open https://www.bing.com/webmasters/ and sign in.
2. Choose the option to import a site from Google Search Console.
3. Use the Google account that owns the verified ByteWave property, review the requested permissions, and select ByteWave.
4. Open ByteWave's Sitemaps report. Check for `https://bytewaveai.com/sitemap.xml`.
5. If the sitemap was not imported, submit that URL once. Check its processing status later.

The site's robots.txt already points to that sitemap. Importing the verified Google property normally avoids a separate verification-tag change in the repository. Submission does not guarantee indexing or rankings.

Official instructions: https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b

## Google Search Console export

A fresh export is needed before choosing the next query-specific changes.

1. Open Search Console and select ByteWave.
2. Open Performance, then Search results.
3. Select Web search and Last 28 days. Remove any query or page filters.
4. Enable clicks, impressions, average CTR, and average position.
5. Use Export and download the Excel file or CSV ZIP. Share that export for analysis.

The export should include both Queries and Pages. We will look for relevant queries already earning impressions, pages with weak click-through, and opportunities to connect readers to a matching tutorial or download. Small samples are leads to investigate, not proof of a trend. A follow-up filtered export may be needed to match a specific query to its ranking page.

Official export help: https://support.google.com/webmasters/answer/12919797?hl=en

## After this PR is deployed

This change updates existing URLs; it adds no pages. The sitemap's modification dates reflect the content edits. An already-submitted Google sitemap does not need resubmitting for every edit. Google can recrawl the changed pages normally; URL Inspection is available if a priority page needs a one-time recrawl request.

Official recrawl help: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl

## Deferred

The browser-local metadata inspector is outside this change. No new web application functionality is included.
