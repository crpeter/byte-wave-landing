# English homepage product previews

These assets appear on the English homepage only. The other languages retain their existing showcase until localized product-page assets are ready.

| Source upload | Website asset | Use |
| --- | --- | --- |
| `2.mp4` | `edit-locally.mp4` | English Edit locally preview, supplied for the brightness-corrected version |
| `source-assets/music-wakes-the-light/BBF59C2D-705B-43B1-A19D-05F31195F936-stamped.MOV` | `music-wakes-the-light-full.mp4` | Full 2:59 English Music wakes the light preview, including the supplied ending credit |
| `06-code-your-own-effects.png` | `code-your-own-effects.png` | Original effects screenshot; no effects video supplied yet |

## Edit locally

The HLS version retains the original H.264 video and AAC audio, 886 × 1920 resolution, frame rate and Rec.709 metadata. It was packaged with stream copy. Its 4-second fragmented-MP4 segments use `split_by_time` and are not advertised as independent.

The standalone MP4 is 720 × 1560, H.264 CRF 20, maximum video rate 2400 kb/s, original AAC audio, Rec.709 metadata and fast-start headers. No tone mapping or brightness adjustment was applied. Its poster is the original frame at 00:00:01. The effects PNG is unchanged.

## Music wakes the light

The full uploaded source is 1080 × 1920, 10-bit HEVC HLG, with Display P3 primaries and BT.2020 non-constant-luminance matrix metadata. The primary HLS stream is **720 × 1280 H.264 SDR Rec.709**, 30 fps, CRF 20 with a 2400 kb/s ceiling. The compatibility-only MP4 is 360 × 640, 30 fps, CRF 23 with a 330 kb/s ceiling to fit the upload connector’s 16 MiB request limit. The MP4 has fast-start headers. Both copy the original AAC audio without changing its level. Duration is approximately 179.32 seconds. No crop or trim is applied; the supplied ending credit remains part of the video. The source is retained in Git LFS and excluded from the published site.

HDR conversion uses the source color metadata, linearizes HLG, converts primaries, applies Mobius tone mapping, then encodes limited-range Rec.709. It does not merely relabel HDR pixels as SDR. The filter is:

```text
zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=mobius:param=0.3:desat=0,zscale=w=720:h=1280:t=bt709:m=bt709:r=limited,format=yuv420p,fps=30
```

The HLS stream packages the 2400 kb/s encode into 4-second fragmented-MP4 segments, with a keyframe at each segment boundary. Its playlist advertises independent segments. The poster comes from that encode at 00:00:05. The fallback MP4 is separately encoded from the original source with the same color conversion, resizing to 360 × 640 during the first zscale step. It is not re-encoded from the HLS copy. The primary stream retains its higher resolution and bitrate. New `music-wakes-the-light-full` filenames prevent mixing cached segments from the previous short preview with this version.

The final five seconds credit **“Helios” by Scott Buckley, released under CC BY 4.0**, including the track and license URLs. See [track](https://www.scottbuckley.com.au/library/helios/), [license](https://creativecommons.org/licenses/by/4.0/) and `source-assets/music-wakes-the-light/credit.yml`. This web conversion copies the supplied audio unchanged; it does not assume the edits used in the earlier preview.

The page initially loads posters, with video loading on play. Playback starts muted; sound and playback use the video player’s built-in controls. The open-video fallback link appears only if playback fails, or when JavaScript is unavailable. The existing shared video player pauses other videos when one starts playing.

## Copy and layout

The approved introduction is:

**Make something real.**

Edit on your device. Audio-aware effects. Build your own filters.

Content and asset mappings live in `_data/home_previews/en.yml`, rendered by `_includes/home-product-previews.html`. Three columns are shown on desktop; the panels stack on mobile. To replace the effects still with a video later, add the video and poster, then replace its `image` field with `video` and `poster` fields in the data file.

## Adding or replacing assets

Copy only the needed English files into this folder. No complete render folder or ZIP is necessary. Preserve the source renders separately and keep MOV extensions if the sources are MOV files. Update the data mapping if a filename changes.
