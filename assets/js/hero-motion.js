(() => {
  const video = document.querySelector('#ocean-motion');
  const button = document.querySelector('#motion-toggle');
  if (!video || !button) return;

  const desktop = matchMedia('(min-width: 901px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let visible = true;
  let userPaused = false;
  let userRequestedPlay = false;
  let autoplayBlocked = false;
  let failed = false;
  let pending = false;
  let attempt = 0;

  function label(verb) {
    button.setAttribute('aria-label', verb + ' background video');
    button.title = verb + ' background video';
    button.textContent = verb === 'Pause' ? 'Ⅱ' : '▶';
  }

  function sync() {
    const eligible = desktop.matches && !failed;
    const allowed = userRequestedPlay || (!reducedMotion.matches && !connection?.saveData && !autoplayBlocked);
    button.hidden = !eligible;

    if (!eligible || !visible || document.hidden || userPaused || !allowed) {
      ++attempt;
      pending = false;
      video.pause();
      label('Play');
      if (!eligible || (!allowed && !userPaused)) video.style.opacity = '0';
      return;
    }
    if (pending || !video.paused) return;
    const current = ++attempt;
    pending = true;
    video.muted = true;
    if (!video.hasAttribute('src')) video.src = video.dataset.src;
    video.play().then(() => {
      if (current !== attempt) return;
      pending = false;
      video.style.opacity = '1';
      label('Pause');
    }).catch(() => {
      if (current !== attempt) return;
      pending = false;
      userRequestedPlay = false;
      autoplayBlocked = true;
      video.style.opacity = '0';
      label('Play');
    });
  }

  button.addEventListener('click', () => {
    userPaused = pending || !video.paused;
    userRequestedPlay = !userPaused;
    if (userRequestedPlay) autoplayBlocked = false;
    sync();
  });
  video.addEventListener('error', () => { failed = true; sync(); });
  for (const preference of [desktop, reducedMotion, connection]) {
    preference?.addEventListener?.('change', () => { userRequestedPlay = false; sync(); });
  }
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(video.closest('.hero'));
  }
  sync();
})();
