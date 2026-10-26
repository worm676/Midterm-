// Apply the saved theme before first paint to avoid a flash.
(function () {
  var choice = 'system';
  try {
    choice = localStorage.getItem('ssp.theme') || 'system';
  } catch (e) {}
  var dark =
    choice === 'dark' ||
    (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
