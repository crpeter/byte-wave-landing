# Seaside grid to beach

Creator-supplied ByteWave export added October 18, 2026. The original video is 2160 × 3840 HEVC Main 10 with HLG transfer.

The HLS playlist and fragmented MP4 segments copy the original compressed video without re-encoding. Video stream SHA-256 hashes match the uploaded MOV; see `source-checks.json`. The source contains two sequential audio tracks: the first starts at zero and the second at 19.933 seconds. They are aligned using their source timestamps and combined into one continuous 192 kbps AAC track, so browser playback includes both sections.

The 720 × 1280 SDR H.264 compatibility MP4 uses CRF 21 with a 2 Mbps cap and fast-start metadata. HDR is converted to BT.709 using zscale and Mobius tone mapping. The poster uses the same tone mapping on a frame at five seconds. Both web versions use the same audio.

These assets are shared by the gallery and Layout page. The shared player loads media on request and falls back to the MP4 if HDR HLS playback is unavailable or stalls. Streaming preserves the source video quality, not the MOV container or its provenance metadata.
