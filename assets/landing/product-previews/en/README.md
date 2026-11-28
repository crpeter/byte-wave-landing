# English homepage product previews

These assets appear on the English homepage only. The other languages retain their existing showcase until localized product-page assets are ready.

| Source upload | Website asset | Use |
| --- | --- | --- |
| `2.mp4` | `edit-locally.mp4` | English Edit locally preview, supplied for the brightness-corrected version |
| `03.mp4` | `music-wakes-the-light.mp4` | English Music wakes the light preview |
| `06-code-your-own-effects.png` | `code-your-own-effects.png` | Original effects screenshot; no effects video supplied yet |

The HLS versions in the matching subfolders retain the original H.264 video and AAC audio streams, 886 × 1920 resolution, frame rate, and Rec.709 color metadata. They were packaged with stream copy; no brightness or color adjustments were made. The 4-second fragmented-MP4 segments use `split_by_time` to fit the upload limit; segments are continuous and are not advertised as independent. The shared HLS player handles playback and seeking.

The standalone MP4 files are smaller compatibility copies: 720 × 1560, H.264 CRF 20, maximum video rate 2400 kb/s, original AAC audio, Rec.709 metadata, and fast-start headers. No tone mapping or brightness adjustment is applied. The JPG posters are frames from the original uploads at 00:00:01. The PNG is unchanged.

The page initially loads posters, with video loading on play. Playback starts muted; sound and playback use the video player’s built-in controls. The open-video fallback link appears only if playback fails, or when JavaScript is unavailable. The existing shared video player pauses other videos when one starts playing.

## Copy and layout

The approved introduction is:

**Make something real.**

Edit on your device. Audio-aware effects. Build your own filters.

Content and asset mappings live in `_data/home_previews/en.yml`, rendered by `_includes/home-product-previews.html`. Three columns are shown on desktop; the panels stack on mobile. To replace the effects still with a video later, add the video and poster, then replace its `image` field with `video` and `poster` fields in the data file.

## Adding or replacing assets

Copy only the needed English files into this folder. No complete render folder or ZIP is necessary. Preserve the source renders separately and keep MOV extensions if the sources are MOV files. Update the data mapping if a filename changes.
