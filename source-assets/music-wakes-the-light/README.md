# Music wakes the light — source upload

Drop the longer video into this folder, with a credit in its final five seconds
and no text over the rest of the video. Keep its original extension
(MP4, MOV, M4V or WebM). A ZIP is also supported if that is what you have ready.
Only this replacement video is needed.

Video files and ZIPs in this folder are configured for Git LFS, which is required
for the approximately 800 MB source. Upload through local Git or GitHub Desktop;
GitHub's browser upload cannot accept a file this large.

## Upload

From your local `byte-wave-landing` checkout:

```sh
git fetch origin
git switch --track origin/assets/music-wakes-the-light-source
git lfs install
```

If `git lfs` is not installed, install Git LFS first. On a Mac with Homebrew:
`brew install git-lfs`.

Copy the video into `source-assets/music-wakes-the-light/`, then:

```sh
git add source-assets/music-wakes-the-light/
git lfs ls-files
git commit -m "Upload longer Music wakes the light source"
git push origin assets/music-wakes-the-light-source
```

Confirm the video appears in `git lfs ls-files` before committing. GitHub Desktop
can also commit and push the file after Git LFS is installed for this checkout.

## Replacement and credit

- Replace the English Music wakes the light preview with this longer video.
- Keep the full supplied duration, with the main footage text-free.
- Hold the complete credit below on screen for the final five seconds.
  **Helios is the track title; Scott Buckley is the artist.** `credit.yml`
  records the artist, source and license links.
- Preserve the source color and brightness when preparing the web versions.
- Keep the video player's built-in sound controls, with no separate sound toggle.

```text
“Helios” by Scott Buckley
Released under CC BY 4.0
www.scottbuckley.com.au/library/helios/
creativecommons.org/licenses/by/4.0/
```

Indicate any audio changes accurately. The earlier preview's credit said
“Audio level adjusted and converted to AAC”; use that note only if it also
describes this version. Do not assume the longer video uses the earlier excerpts
or fades.

Verified sources: [track and attribution format](https://www.scottbuckley.com.au/library/helios/)
and [CC BY 4.0 attribution requirements](https://creativecommons.org/licenses/by/4.0/).
For a separate YouTube upload, Scott also requires the credit in its description.

This folder is excluded from Jekyll output. The source is for preparing a
web-sized MP4, HLS stream and poster under `assets/landing/product-previews/en/`;
the website will not serve the Git LFS source directly. Ordinary CI checkouts do
not fetch LFS media. The existing homepage preview stays in place until the new
video is processed and its ending credit is checked.
