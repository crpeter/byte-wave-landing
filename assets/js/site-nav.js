/* Native details menus work without JavaScript; add Escape and outside-click dismissal. */
(() => {
  const menus = Array.from(document.querySelectorAll('details.site-menu, details.site-language'));
  if (!menus.length) return;

  menus.forEach(menu => menu.addEventListener('toggle', () => {
    if (menu.open) menus.forEach(other => { if (other !== menu) other.open = false; });
  }));

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const active = menus.find(menu => menu.open);
    if (active) {
      active.open = false;
      active.querySelector('summary')?.focus();
    }
  });

  document.addEventListener('click', event => {
    menus.forEach(menu => {
      if (menu.open && (!menu.contains(event.target) || event.target.closest('a'))) {
        menu.open = false;
      }
    });
  });
})();
