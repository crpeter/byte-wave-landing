/* Source-quality HLS for the gallery's streamed clip. Media loads only on play. */
(() => {
  const card = document.querySelector('#quadruple-dive');
  if (!card) return;
  const video = card.querySelector('video');
  const button = card.querySelector('button');
  const status = card.querySelector('[role="status"]');
  const source = video.querySelector('source').src;
  let player;
  let timer;
  let attempt = 0;
  const clearTimer = () => clearTimeout(timer);
  const fail = () => {
    attempt++;
    clearTimer();
    if (player) { player.destroy(); player = null; }
    video.pause();
    video.controls = false;
    button.hidden = false;
    button.disabled = false;
    button.textContent = 'Try again';
    status.textContent = 'Could not load the video. Tap to try again.';
  };
  const watch = () => { clearTimer(); timer = setTimeout(fail, 12000); };
  video.controls = false;
  button.hidden = false;
  button.addEventListener('click', () => {
    const current = ++attempt;
    if (player) { player.destroy(); player = null; }
    button.disabled = true;
    button.textContent = 'Loading…';
    status.textContent = 'Loading video…';
    watch();
    const play = () => {
      if (current !== attempt) return;
      video.controls = true;
      button.hidden = true;
      video.play().catch(() => { if (current === attempt) fail(); });
    };
    try {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source;
        video.load();
        play();
      } else if (window.Hls && window.Hls.isSupported()) {
        player = new window.Hls();
        player.on(window.Hls.Events.MANIFEST_PARSED, play);
        player.on(window.Hls.Events.ERROR, (_event, data) => {
          if (current === attempt && data.fatal) fail();
        });
        player.loadSource(source);
        player.attachMedia(video);
      } else { fail(); }
    } catch (_) { if (current === attempt) fail(); }
  });
  video.addEventListener('playing', () => { clearTimer(); status.textContent = ''; });
  video.addEventListener('waiting', watch);
  video.addEventListener('stalled', () => { if (!video.paused) watch(); });
  video.addEventListener('pause', clearTimer);
  video.addEventListener('ended', clearTimer);
  video.addEventListener('error', fail);
})();
