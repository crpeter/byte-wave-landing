# English homepage product previews

Place just the three English iPhone product-page preview videos in this folder. Copy the files here; keep the original renders in place. No ZIP or complete render folder is needed.

| Preview | Filename |
| --- | --- |
| Edit locally on-device — latest brightness-corrected render | `edit-locally.mp4` |
| Music wakes the light | `music-wakes-the-light.mp4` |
| Code your own effects | `code-your-own-effects.mp4` |

If a source is a MOV, keep the `.mov` extension instead of renaming it to `.mp4`. Preserve the original audio. Poster images can be extracted from the videos during integration.

The latest recorded brightness correction for Edit locally was rendered November 22, 2026 into:

```text
/Users/petercody/Documents/Projects/bytewave-appstore/preview-refresh/output/brightness-proof/videos/iphone/
```

The expected English file is `en-US/2.mp4`; confirm the title and language by playing it before copying it. That exact English path has not been verified on this Mac.

## Approved section copy

**Make something real.**

Edit on your device. Make your music move the picture. Build your own effects.

## Scope

Start with the English homepage only. Replace its existing feature list and two screenshots with these three playable product-page previews. Use matching posters, three columns on desktop and a stacked mobile layout, muted initial playback, and accessible sound/playback controls. This branch currently prepares the asset folder; the homepage implementation follows once the three videos are available.

## Send the assets

From the repository root, after copying the videos:

```bash
git add assets/landing/product-previews/en/
git commit -m "Add English product-page previews"
git push -u origin feat/english-product-previews
```
