/* Keep HDR streams at source quality; recover when a browser silently stalls. */
(() => {
  const videos = [...document.querySelectorAll('.layout-video')];
  const timeout = 12000;
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
    let timer;
    let attempt = 0;
    let requested = false;
    let started = false;
    let lastTime = 0;
    video.controls = false;
    button.hidden = false;

    const clearTimer = () => { clearTimeout(timer); timer = null; };
    const destroyPlayer = () => {
      if (player) { player.destroy(); player = null; }
    };
    const failure = () => {
      requested = false;
      attempt++;
      clearTimer();
      destroyPlayer();
      video.pause();
      video.controls = false;
      button.hidden = false;
      button.disabled = false;
      label.textContent = 'Try again';
      status.textContent = 'Could not load the video. Try again or use the MP4 link below.';
    };
    const watch = () => {
      clearTimer();
      if (requested) timer = setTimeout(fallback, timeout);
    };
    const play = () => {
      const current = attempt;
      video.controls = true;
      button.hidden = true;
      button.disabled = false;
      // play() may remain pending forever on mobile; only playback progress clears the watchdog.
      video.play().catch(error => {
        if (current !== attempt || !requested || error.name === 'AbortError') return;
        if (error.name === 'NotAllowedError') {
          clearTimer();
          requested = false;
          button.hidden = false;
          label.textContent = 'Tap to play';
          status.textContent = 'Tap play to start the video.';
          return;
        }
        fallback();
      });
    };
    const fallback = () => {
      if (!requested) return;
      if (compatible) { failure(); return; }
      compatible = true;
      attempt++;
      started = false;
      lastTime = 0;
      destroyPlayer();
      status.textContent = 'Trying the compatible video…';
      video.src = video.dataset.compatible;
      video.load();
      watch();
      play();
    };
    button.addEventListener('click', async () => {
      const current = ++attempt;
      requested = true;
      started = false;
      lastTime = 0;
      destroyPlayer();
      button.disabled = true;
      label.textContent = 'Loading video';
      status.textContent = 'Loading video…';
      watch();
      try {
        if (compatible || video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = compatible ? video.dataset.compatible : video.dataset.stream;
          video.load();
          play();
          return;
        }
        if (!video.canPlayType('video/mp4; codecs="hvc1"')) { fallback(); return; }
        await loadLibrary();
        if (current !== attempt || !requested) return;
        if (!window.Hls.isSupported()) { fallback(); return; }
        player = new window.Hls();
        player.on(window.Hls.Events.MANIFEST_PARSED, () => { if (current === attempt) play(); });
        player.on(window.Hls.Events.ERROR, (_event, data) => { if (current === attempt && data.fatal) fallback(); });
        player.loadSource(video.dataset.stream);
        player.attachMedia(video);
      } catch (_) { if (current === attempt) fallback(); }
    });
    video.addEventListener('error', fallback);
    video.addEventListener('waiting', () => { if (!timer) watch(); });
    video.addEventListener('stalled', () => { if (!timer) watch(); });
    video.addEventListener('timeupdate', () => {
      if (requested && video.currentTime !== lastTime) {
        started = true;
        lastTime = video.currentTime;
        status.textContent = '';
        watch();
      }
    });
    video.addEventListener('pause', () => {
      if (started && !video.seeking) { requested = false; clearTimer(); }
    });
    video.addEventListener('ended', () => { requested = false; clearTimer(); });
    video.addEventListener('play', () => {
      requested = true;
      watch();
      videos.forEach(other => { if (other !== video) other.pause(); });
    });
  });
})();
