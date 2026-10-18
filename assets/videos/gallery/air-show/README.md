# Air show in 3D

Creator-supplied ByteWave export added October 18, 2026: planes over the beach with animated 3D text. Source: `88884DDF-86E9-47DF-9410-6A6A33044C39.MOV`, 1080 × 1920, 30 fps, 67.967 seconds, HEVC Main 10 with HLG transfer and AAC audio.

`original.m3u8`, `init.mp4`, and `segment-*.m4s` repackage the original video and audio without re-encoding. The compressed video and audio SHA-256 stream hashes match the upload exactly; see `source-checks.json`. This preserves media quality, not the MOV container or its provenance metadata. These files are not original-file signature samples.

`compatible.mp4` is a 720 × 1280 SDR H.264 fallback, encoded at CRF 23 with a 1.1 Mbps cap and fast-start metadata. HLG is converted to BT.709 using zscale and Mobius tone mapping; audio is copied unchanged. `poster.jpg` uses the same tone mapping on a frame at 24 seconds.

The gallery uses the shared player: native HLS where supported, self-hosted Hls.js elsewhere, and the compatible MP4 after an unsupported stream or playback stall. Playback starts on request.

The accompanying `assets/images/gallery/sunset-hexagons.jpg` is an unchanged copy of the supplied `E3DD2B50-16E5-4C18-967C-9B3F8BBCDBAE_1_102_o(2).jpeg`. Its SHA-256 is included in `source-checks.json`.
