// @ts-check
// Theme choice of the generator: light, dark or high contrast. Without a choice the page follows the operating
// system (light, or dark while the system prefers dark). The choice is kept in `localStorage`; theme-init.js
// applies it before the first paint and theme.css defines the colours.

/** Where the chosen theme is remembered (shared by the pages of this site). */
export const THEME_KEY = 'pentomino:v1:theme';
export const THEMES = Object.freeze(['light', 'dark', 'high-contrast']);

/**
 * @param {unknown} value
 * @returns {string | null} A supported theme, else null.
 */
export function normalizeTheme(value) {
  return typeof value === 'string' && THEMES.includes(value) ? value : null;
}

/**
 * @param {unknown} chosen The theme in effect on the page (a data-theme value), or none.
 * @param {boolean} prefersDark Whether the operating system prefers dark.
 * @returns {string} The theme the user sees.
 */
export function effectiveTheme(chosen, prefersDark) {
  return normalizeTheme(chosen) ?? (prefersDark ? 'dark' : 'light');
}

/**
 * @param {Document} doc
 * @param {string | null} theme A supported theme, or null to follow the operating system.
 */
export function applyTheme(doc, theme) {
  if (theme === null) {
    doc.documentElement.removeAttribute('data-theme');
  } else {
    doc.documentElement.setAttribute('data-theme', theme);
  }
}
