/* Native details menus work without JS; add Escape and outside-click dismissal. */
(() => {
  const menu = document.querySelector('.site-menu');
  if (!menu) return;
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', event => {
    if (menu.open && (!menu.contains(event.target) || event.target.closest('a'))) menu.open = false;
  });
})();
