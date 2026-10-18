/* One player for MP4 and original-quality HLS; no media fetch until play. */
(() => {
  const videos = [...document.querySelectorAll('video[data-bw-player]')];
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
    const shell = video.closest('.bw-player');
    const button = shell.querySelector('.bw-play');
    const status = shell.querySelector('[role="status"]');
    const source = video.querySelector('source');
    const original = video.dataset.stream || source.src;
    const fallbackSource = video.dataset.compatible;
    const isHls = /\.m3u8(?:\?|$)/.test(original);
    let player, timer;
    let attempt = 0, requested = false, initialized = false, compatible = false, lastTime = 0;
    let switching = false;

    const clearTimer = () => { clearTimeout(timer); timer = null; };
    const destroy = () => { if (player) { player.destroy(); player = null; } };
    const showButton = (label = 'Play video') => {
      button.hidden = false; button.disabled = false;
      button.setAttribute('aria-label', label);
      button.title = label;
    };
    const fail = () => {
      requested = false; initialized = false; switching = false; attempt++;
      clearTimer(); destroy(); video.pause(); video.controls = false;
      showButton('Retry video');
      status.textContent = 'Could not load the video. Try again or open the video link below.';
    };
    const watch = () => {
      clearTimer();
      if (requested) timer = setTimeout(recover, 12000);
    };
    const play = () => {
      const current = attempt;
      video.controls = true; button.hidden = true; button.disabled = false;
      video.play().catch(error => {
        if (current !== attempt || !requested || error.name === 'AbortError') return;
        if (error.name === 'NotAllowedError') {
          requested = false; clearTimer(); showButton('Tap to play video');
          status.textContent = 'Tap play to start the video.';
        } else { recover(); }
      });
    };
    const setSource = url => {
      switching = true;
      video.src = url; video.load();
      initialized = true;
      watch(); play();
    };
    const recover = () => {
      if (!requested) return;
      if (!fallbackSource || compatible) { fail(); return; }
      compatible = true; attempt++; lastTime = 0; destroy();
      status.textContent = 'Trying the compatible video…';
      setSource(fallbackSource);
    };
    const start = async () => {
      if (requested) return;
      const current = initialized ? attempt : ++attempt;
      requested = true; lastTime = video.currentTime;
      video.controls = true; button.hidden = true; button.disabled = false;
      status.textContent = 'Loading video…';
      watch();
      try {
        if (initialized) {
          if (video.ended) video.currentTime = 0;
          play(); return;
        }
        destroy();
        if (compatible || !isHls || video.canPlayType('application/vnd.apple.mpegurl')) {
          setSource(compatible ? fallbackSource : original); return;
        }
        await loadLibrary();
        if (current !== attempt || !requested) return;
        if (!window.Hls.isSupported()) { recover(); return; }
        switching = true;
        player = new window.Hls();
        player.on(window.Hls.Events.MANIFEST_PARSED, () => {
          if (current !== attempt || !requested) return;
          initialized = true; play();
        });
        player.on(window.Hls.Events.ERROR, (_event, data) => {
          if (current === attempt && data.fatal) recover();
        });
        player.loadSource(original); player.attachMedia(video);
      } catch (_) { if (current === attempt) recover(); }
    };

    video.controls = false; showButton();
    button.addEventListener('click', start);
    video.addEventListener('error', recover);
    video.addEventListener('waiting', () => { if (!timer) watch(); });
    video.addEventListener('stalled', () => { if (!timer) watch(); });
    video.addEventListener('timeupdate', () => {
      if (requested && video.currentTime !== lastTime) {
        lastTime = video.currentTime; switching = false; status.textContent = ''; watch();
      }
    });
    video.addEventListener('playing', () => {
      switching = false; requested = true; button.hidden = true;
      status.textContent = ''; watch();
      videos.forEach(other => { if (other !== video) other.pause(); });
    });
    video.addEventListener('play', () => { requested = true; button.hidden = true; watch(); });
    video.addEventListener('pause', () => {
      if (switching || video.seeking) return;
      requested = false; clearTimer(); showButton(); status.textContent = '';
    });
    video.addEventListener('ended', () => {
      switching = false; requested = false; clearTimer(); showButton('Replay video');
    });
  });
})();
