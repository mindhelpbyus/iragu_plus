// Externalized (was an inline <script>) so the CSP can drop script-src 'unsafe-inline'.
// Ensures light "Ink on Parchment" theme before paint (globals.css is the source of truth;
// this just guards against any stray dark-mode class flashing in).
(function () {
  var de = document.documentElement;
  de.classList.remove('dark');
  try {
    localStorage.removeItem('theme');
    localStorage.removeItem('vite-ui-theme');
  } catch (e) { /* storage may be blocked */ }
  var observer = new MutationObserver(function () {
    if (de.classList.contains('dark')) de.classList.remove('dark');
    if (document.body && document.body.classList.contains('dark')) document.body.classList.remove('dark');
  });
  observer.observe(de, { attributes: true, attributeFilter: ['class'] });
})();
