# The Quadruple Dive

Creator-supplied ByteWave export added October 17, 2026. Portrait 1080 × 1920 H.264, approximately 60 fps, silent AAC track. The uploaded MOV remains the original.

The HLS playlist and MPEG-TS segments copy the video and audio without re-encoding. All 1,124 decoded frame hashes match the original; see `source-checks.json`. Playlist durations use segment timestamp boundaries and the original duration because the source bitstream advertises 30 fps despite its approximately 60 fps timestamps.

Streaming preserves media quality, not the original MOV container or its ByteWave provenance metadata. These segments are not original-file signature samples. The poster is a frame at 10 seconds.

The gallery uses native HLS where available and the existing self-hosted Hls.js library elsewhere. Playback starts on request, with a 12-second timeout and retry control.
