# English homepage product previews

These assets appear on the English homepage only. The other languages retain their existing showcase until localized product-page assets are ready.

| Source upload | Website asset | Use |
| --- | --- | --- |
| `2.mp4` | `edit-locally.mp4` | English Edit locally preview, supplied for the brightness-corrected version |
| `source-assets/music-wakes-the-light/BBF59C2D-705B-43B1-A19D-05F31195F936-stamped.MOV` | `music-wakes-the-light-hable.mp4` | Full 2:59 English Music wakes the light preview, including the supplied ending credit |
| `06-code-your-own-effects.png` | `code-your-own-effects.png` | Original effects screenshot; no effects video supplied yet |

## Edit locally

The HLS version retains the original H.264 video and AAC audio, 886 × 1920 resolution, frame rate and Rec.709 metadata. It was packaged with stream copy. Its 4-second fragmented-MP4 segments use `split_by_time` and are not advertised as independent.

The standalone MP4 is 720 × 1560, H.264 CRF 20, maximum video rate 2400 kb/s, original AAC audio, Rec.709 metadata and fast-start headers. No tone mapping or brightness adjustment was applied. Its poster is the original frame at 00:00:01. The effects PNG is unchanged.

## Music wakes the light

The full uploaded source is 1080 × 1920, 10-bit HEVC HLG, with Display P3 primaries and BT.2020 non-constant-luminance matrix metadata. The primary HLS stream is **720 × 1280 H.264 SDR Rec.709**, 30 fps, CRF 20 with a 2400 kb/s ceiling. The compatibility-only MP4 is 360 × 640, 30 fps, CRF 23 with a 330 kb/s ceiling to fit the upload connector’s 16 MiB request limit. The MP4 has fast-start headers. Both copy the original AAC audio without changing its level. Duration is approximately 179.32 seconds. No crop or trim is applied; the supplied ending credit remains part of the video. The source is retained in Git LFS and excluded from the published site.

Color conversion reuses the accepted November 22 App Store recipe from `ByteWave-Brighter-SDR-Fix.zip`, `brightness-fix/scripts/bw_refresh_media.py` (`bytewave-hlg-hable-npl100-peak10-no-polish-v1`). It explicitly decodes the source primaries, transfer, matrix and range, applies Hable with fixed peak=10, and dithers to limited-range Rec.709. No additional contrast or saturation pass is applied. This replaces the incorrect Mobius website conversion. The exact conversion, before resizing, is:

```text
zscale=pin=smpte432:tin=arib-std-b67:min=bt2020nc:rin=limited:t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:peak=10:desat=0,zscale=t=bt709:m=bt709:r=limited:dither=error_diffusion,format=yuv420p
```

The HLS stream packages the 2400 kb/s encode into 4-second fragmented-MP4 segments, with a keyframe at each segment boundary. Its playlist advertises independent segments. The poster comes from that encode at 00:00:05. The converted frames are split into 720 × 1280 and 360 × 640 encodes, both at 30 fps. The fallback is not re-encoded from the HLS copy. The primary stream retains its higher resolution and bitrate. New `music-wakes-the-light-hable` filenames prevent reusing cached media from the previous color conversion.

The final five seconds credit **“Helios” by Scott Buckley, released under CC BY 4.0**, including the track and license URLs. See [track](https://www.scottbuckley.com.au/library/helios/), [license](https://creativecommons.org/licenses/by/4.0/) and `source-assets/music-wakes-the-light/credit.yml`. This web conversion copies the supplied audio unchanged; it does not assume the edits used in the earlier preview.

The page initially loads posters, with video loading on play. Playback starts muted; sound and playback use the video player’s built-in controls. The open-video fallback link appears only if playback fails, or when JavaScript is unavailable. The existing shared video player pauses other videos when one starts playing.

## Copy and layout

The approved introduction is:

**Make something real.**

Edit on your device. Audio-aware effects. Build your own filters.

Content and asset mappings live in `_data/home_previews/en.yml`, rendered by `_includes/home-product-previews.html`. On desktop, the three previews have equal image height and widths proportional to their actual source ratios. The 9:16 music video is wider than the App Store screenshots; nothing is cropped, stretched or letterboxed. On mobile, panels stack and each retains its source ratio. To replace the effects still with a video later, add the video and poster, then replace its `image` field with `video` and `poster` fields in the data file.

## Adding or replacing assets

Copy only the needed English files into this folder. No complete render folder or ZIP is necessary. Preserve the source renders separately and keep MOV extensions if the sources are MOV files. Update the data mapping if a filename changes.
