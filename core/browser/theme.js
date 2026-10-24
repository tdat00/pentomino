// @ts-check
// Theme choice of the Generator and the Player; without one the page follows the system preference. theme-init.js
// applies the stored choice before the first paint.

/** Shared with the other pages of this site; theme-init.js repeats it. */
export const THEME_KEY = 'pentomino:v1:theme';
export const THEMES = Object.freeze(['light', 'dark', 'high-contrast']);

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeTheme(value) {
  return typeof value === 'string' && THEMES.includes(value) ? value : null;
}

/**
 * @param {unknown} chosen A data-theme value.
 * @param {boolean} prefersDark
 * @returns {string}
 */
export function effectiveTheme(chosen, prefersDark) {
  return normalizeTheme(chosen) ?? (prefersDark ? 'dark' : 'light');
}

/**
 * @param {Document} doc
 * @param {string | null} theme Null follows the system preference.
 */
export function applyTheme(doc, theme) {
  if (theme === null) {
    doc.documentElement.removeAttribute('data-theme');
  } else {
    doc.documentElement.setAttribute('data-theme', theme);
  }
}
