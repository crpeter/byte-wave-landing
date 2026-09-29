# Layout examples

Three creator-supplied exports added on 2026-09-29. Originals remain in the uploaded source files.

- `honeycomb`: 2160 × 2160, HEVC Main 10, HLG HDR, AAC.
- `ocean-grid`: 2160 × 3840, HEVC Main 10, HLG HDR, AAC.
- `warped-sunset`: 1080 × 1920, HEVC Main 10, HLG HDR, AAC.

`original.m3u8`, `init.mp4`, and `segment-*.m4s` repackage the original compressed video and audio without re-encoding. SHA-256 stream hashes were compared against each source and match exactly; see `source-checks.json`. This preserves media quality, not the original MOV container or its provenance metadata. Do not use these repackaged files as samples for checking the original file's signature.

`compatible.mp4` is a separate SDR H.264 version for browsers without HEVC/HLS support: 1080-square for honeycomb, 720 × 1280 for the two portrait clips. Audio is copied unchanged. HDR-to-SDR conversion uses zscale and Mobius tone mapping. Portrait compatibility video is CRF 20 capped at 3 Mbps; the square version uses CRF 18. Poster JPEGs are SDR frames from three seconds into each source.

The player prefers native HLS, then HEVC through the existing self-hosted Hls.js library, and falls back to the compatibility MP4. Media starts on a play request, not page load. Portrait and square compositions keep their full frame.
