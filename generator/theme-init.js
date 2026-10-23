// Sets the stored theme before the stylesheets paint, so the page never flashes the wrong one.
// It mirrors generator/ui/theme.js (same key and values); any failure leaves the default theme.
(function () {
  try {
    var theme = localStorage.getItem('pentomino:v1:theme');
    if (theme === 'light' || theme === 'dark' || theme === 'high-contrast') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (error) {
    // The default theme applies.
  }
})();
