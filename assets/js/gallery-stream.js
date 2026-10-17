/* Shared play controls for gallery MP4s and source-quality HLS streams. */
(() => {
  const cards = [...document.querySelectorAll('.gallery-grid figure')];
  cards.forEach(card => {
    const video = card.querySelector('video');
    const button = card.querySelector('.stream-play');
    const status = card.querySelector('[role="status"]');
    const source = video.querySelector('source');
    const hls = source.type === 'application/vnd.apple.mpegurl';
    const title = card.querySelector('h2').textContent;
    let player;
    let timer;
    let attempt = 0;
    let initialized = false;
    let failed = false;
    const clearTimer = () => clearTimeout(timer);
    const label = text => { button.setAttribute('aria-label', text); button.title = text; };
    const showPlay = () => {
      button.hidden = false;
      button.disabled = false;
      button.classList.remove('is-loading');
      label(`${failed ? 'Retry' : 'Play'} ${title}`);
    };
    const fail = () => {
      if (failed) return;
      failed = true;
      initialized = false;
      attempt++;
      clearTimer();
      if (player) { player.destroy(); player = null; }
      video.pause();
      video.controls = false;
      showPlay();
      status.textContent = 'Could not load the video. Tap play to try again.';
    };
    const watch = () => { clearTimer(); timer = setTimeout(fail, 12000); };
    video.controls = false;
    showPlay();
    button.addEventListener('click', () => {
      const current = initialized ? attempt : ++attempt;
      failed = false;
      button.disabled = true;
      button.classList.add('is-loading');
      label(`Loading ${title}`);
      status.textContent = 'Loading video…';
      watch();
      const play = () => {
        if (current !== attempt) return;
        initialized = true;
        video.controls = true;
        if (video.ended) video.currentTime = 0;
        video.play().catch(() => { if (current === attempt) fail(); });
      };
      try {
        if (initialized) { play(); return; }
        if (player) { player.destroy(); player = null; }
        if (!hls || video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = source.src;
          video.load();
          play();
        } else if (window.Hls && window.Hls.isSupported()) {
          player = new window.Hls();
          player.on(window.Hls.Events.MANIFEST_PARSED, play);
          player.on(window.Hls.Events.ERROR, (_event, data) => {
            if (current === attempt && data.fatal) fail();
          });
          player.loadSource(source.src);
          player.attachMedia(video);
        } else { fail(); }
      } catch (_) { if (current === attempt) fail(); }
    });
    video.addEventListener('playing', () => {
      clearTimer();
      button.hidden = true;
      button.classList.remove('is-loading');
      status.textContent = '';
      cards.forEach(other => { if (other !== card) other.querySelector('video').pause(); });
    });
    video.addEventListener('waiting', () => { if (!failed && !video.paused) watch(); });
    video.addEventListener('stalled', () => { if (!failed && !video.paused) watch(); });
    video.addEventListener('pause', () => { clearTimer(); showPlay(); });
    video.addEventListener('ended', () => { clearTimer(); showPlay(); });
    video.addEventListener('error', fail);
  });
})();
