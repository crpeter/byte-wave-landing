# Sunset hexagons (landscape)

Creator-supplied 4K, 60 fps ByteWave export received October 18, 2026 through Google Drive. Source identity, size, hash, and encoding details are recorded in `source-checks.json`. The original MOV remains in the creator's Drive; it is not included in the website repository.

Both playback renditions preserve the full 54.716667-second video (3,283 frames) at 60 fps and copy the original AAC audio without re-encoding. These are compressed web renditions, not original-quality remuxes.

- `web.m3u8`: 1080p H.264, CRF 18 with a 4 Mbps cap, four-second fragmented MP4 HLS segments.
- `compatible.mp4`: 720p H.264, CRF 22 with a 1.2 Mbps cap, fast-start metadata.

The source is 8-bit SDR with BT.709 primaries/matrix and an sRGB transfer tag. Lanczos scaling and zscale convert sRGB transfer to standard BT.709 for browser playback. No HDR tone mapping is applied.

The existing landscape JPEG is reused as the poster. Both gallery and Layout pages share these files and the existing on-demand player. The player falls back to the compatibility MP4 if HLS fails. No video data loads until playback is requested. Videos retain their complete aspect ratio without cropping.

Reproduction: use FFmpeg `zscale` to the desired dimensions with `filter=lanczos:transfer=bt709:primaries=bt709:matrix=bt709:range=limited`, `format=yuv420p`, `libx264 -preset slow`, `-g 120 -keyint_min 120 -sc_threshold 0`, the CRF/bitrate above (buffer twice the bitrate), and `-c:a copy`. Tag BT.709 primaries/transfer/matrix and limited range. Package the 1080p stream with `-c copy -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_type fmp4 -hls_flags independent_segments`. No frame-rate conversion or trimming.
