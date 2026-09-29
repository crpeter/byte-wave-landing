/* Keep HDR streams at source quality; load media only when a visitor presses play. */
(() => {
  const videos = [...document.querySelectorAll('.layout-video')];
  let library;
  const loadLibrary = () => library || (library = new Promise((resolve, reject) => {
    if (window.Hls) { resolve(); return; }
    const script = document.createElement('script');
    script.src = '/assets/vendor/hls.light-1.6.19.min.js';
    script.onload = resolve;
    script.onerror = () => { script.remove(); library = null; reject(new Error('Player unavailable')); };
    document.head.append(script);
  }));

  videos.forEach(video => {
    const card = video.closest('.layout-demo');
    const button = card.querySelector('.layout-play');
    const status = card.querySelector('.layout-status');
    const label = button.querySelector('span');
    let player;
    let compatible = false;
    video.controls = false;
    button.hidden = false;

    const failure = () => {
      if (player) { player.destroy(); player = null; }
      video.controls = false;
      button.hidden = false;
      button.disabled = false;
      label.textContent = 'Try again';
      status.textContent = 'Could not load the video. Try again or use the MP4 link below.';
    };
    const play = () => {
      video.controls = true;
      button.hidden = true;
      button.disabled = false;
      status.textContent = '';
      video.play().catch(error => {
        if (error.name === 'AbortError') return;
        if (error.name === 'NotSupportedError') { fallback(); return; }
        status.textContent = 'Use the video controls to start playback.';
      });
    };
    const fallback = () => {
      if (compatible) { failure(); return; }
      compatible = true;
      if (player) { player.destroy(); player = null; }
      video.src = video.dataset.compatible;
      play();
    };
    button.addEventListener('click', async () => {
      button.disabled = true;
      label.textContent = 'Loading video';
      status.textContent = 'Loading video…';
      try {
        if (compatible) { video.src = video.dataset.compatible; play(); return; }
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = video.dataset.stream;
          play();
          return;
        }
        if (!video.canPlayType('video/mp4; codecs="hvc1"')) { fallback(); return; }
        await loadLibrary();
        if (!window.Hls.isSupported()) { fallback(); return; }
        player = new window.Hls();
        player.on(window.Hls.Events.MANIFEST_PARSED, play);
        player.on(window.Hls.Events.ERROR, (_event, data) => { if (data.fatal) fallback(); });
        player.loadSource(video.dataset.stream);
        player.attachMedia(video);
      } catch (_) { fallback(); }
    });
    video.addEventListener('error', fallback);
    video.addEventListener('play', () => {
      videos.forEach(other => { if (other !== video) other.pause(); });
    });
  });
})();
