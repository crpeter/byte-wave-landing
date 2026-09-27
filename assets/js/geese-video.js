/* Load the original-quality stream only after an explicit play request. */
(() => {
  const video = document.querySelector('#geese-video');
  const button = document.querySelector('#geese-play');
  const status = document.querySelector('#geese-status');
  if (!video || !button || !status) return;
  const stream = video.dataset.stream;
  let player;
  let library;
  const loadLibrary = () => library || (library = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/assets/vendor/hls.light-1.6.19.min.js';
    script.onload = resolve;
    script.onerror = () => { script.remove(); library = null; reject(new Error('Player unavailable')); };
    document.head.append(script);
  }));
  const failure = () => {
    if (player) { player.destroy(); player = null; }
    video.controls = false;
    button.hidden = false;
    button.disabled = false;
    button.textContent = 'Try again';
    status.textContent = 'The video could not load. Please try again.';
  };
  const play = () => {
    video.controls = true;
    button.hidden = true;
    button.disabled = false;
    status.textContent = '';
    video.play().catch(() => {
      // A browser may require a second gesture after loading the player.
      status.textContent = 'Use the video controls to start playback.';
    });
  };
  video.controls = false;
  button.hidden = false;
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Loading video…';
    status.textContent = '';
    try {
      if (video.canPlayType('application/vnd.apple.mpegurl') && 'ManagedMediaSource' in window) {
        video.src = stream;
        play();
        return;
      }
      await loadLibrary();
      if (window.Hls.isSupported()) {
        player = new window.Hls({ autoStartLoad: false });
        player.on(window.Hls.Events.MANIFEST_PARSED, () => { player.startLoad(); play(); });
        player.on(window.Hls.Events.ERROR, (_event, data) => { if (data.fatal) failure(); });
        player.loadSource(stream);
        player.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = stream;
        play();
      } else { failure(); }
    } catch (_) { failure(); }
  });
  video.addEventListener('error', failure);
})();
