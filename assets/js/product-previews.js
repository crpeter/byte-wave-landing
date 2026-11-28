/* Keep the sound toggle available on touch devices as well as desktop. */
(() => {
  document.querySelectorAll('.product-preview-sound').forEach(button => {
    const video = document.getElementById(button.getAttribute('aria-controls'));
    if (!video) return;
    const update = () => {
      const silent = video.muted || video.volume === 0;
      button.textContent = silent ? button.dataset.soundOn : button.dataset.soundOff;
    };
    button.addEventListener('click', () => {
      if (video.muted || video.volume === 0) {
        video.muted = false;
        if (video.volume === 0) video.volume = 1;
      } else {
        video.muted = true;
      }
      update();
    });
    video.addEventListener('volumechange', update);
    update();
    button.hidden = false;
  });
})();
