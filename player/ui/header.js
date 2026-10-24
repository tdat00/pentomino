// @ts-check
// Page header, in the markup and classes of the generator's: the logo and title on the left, the EN | VI language
// switch and the three theme buttons on the right. The choices are kept in this browser under the keys that
// the generator uses, so a choice made on one page applies to the other.
import { el } from '../../core/browser/dom.js';
import { LANGUAGE_KEY } from '../../core/browser/i18n.js';
import { svgEl } from '../../core/browser/svg-board.js';
import { THEME_KEY, applyTheme, effectiveTheme, normalizeTheme } from '../../core/browser/theme.js';
import { getLocale, normalize, onChange, setLocale, t } from '../i18n.js';
import { loc, locAttrs } from './i18n-dom.js';

/** @returns {SVGElement} Icons of the theme buttons. */
function iconSprite() {
  return svgEl('svg', { class: 'sprite', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('symbol', { id: 'ic-sun', viewBox: '0 0 24 24' },
      svgEl('circle', { cx: 12, cy: 12, r: 4 }),
      svgEl('path', { d: 'M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8' })),
    svgEl('symbol', { id: 'ic-moon', viewBox: '0 0 24 24' },
      svgEl('path', { d: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z' })),
    svgEl('symbol', { id: 'ic-contrast', viewBox: '0 0 24 24' },
      svgEl('circle', { cx: 12, cy: 12, r: 9 }),
      svgEl('path', { d: 'M12 3a9 9 0 0 1 0 18z', fill: 'currentColor' })));
}

/**
 * @param {string} code
 * @param {string} shortKey
 * @param {string} nameKey
 * @returns {HTMLButtonElement}
 */
function languageButton(code, shortKey, nameKey) {
  return /** @type {HTMLButtonElement} */ (el('button', {
    className: 'segmented__btn',
    attrs: { type: 'button', lang: code, 'aria-pressed': 'false', ...locAttrs({ 'aria-label': nameKey, title: nameKey }) },
    dataset: { lang: code, i18n: shortKey },
    text: t(shortKey),
  }));
}

/**
 * @param {string} theme
 * @param {string} key
 * @param {string} icon
 * @returns {HTMLButtonElement}
 */
function themeButton(theme, key, icon) {
  return /** @type {HTMLButtonElement} */ (el('button', {
    className: 'segmented__btn segmented__btn--icon',
    attrs: { type: 'button', 'aria-pressed': 'false', ...locAttrs({ 'aria-label': key, title: key }) },
    dataset: { themeValue: theme },
  }, svgEl('svg', { class: 'icon', 'aria-hidden': 'true', focusable: 'false' }, svgEl('use', { href: `#${icon}` }))));
}

/**
 * @param {HTMLElement} host Receives the icon sprite and the header.
 * @param {{ win: Window | null, preferences: Pick<Storage, 'setItem'> | null }} options
 */
export function mountHeader(host, { win, preferences }) {
  const doc = host.ownerDocument;
  const languageButtons = [
    languageButton('en', 'shell.lang.en.short', 'shell.lang.en.name'),
    languageButton('vi', 'shell.lang.vi.short', 'shell.lang.vi.name'),
  ];
  const themeButtons = [
    themeButton('light', 'shell.theme.light', 'ic-sun'),
    themeButton('dark', 'shell.theme.dark', 'ic-moon'),
    themeButton('high-contrast', 'shell.theme.highContrast', 'ic-contrast'),
  ];
  const element = el('header', { className: 'app-header' },
    el('div', { className: 'app-brand' },
      el('img', { className: 'app-logo', attrs: { src: new URL('../../core/browser/favicon.svg', import.meta.url).href, alt: '', width: 32, height: 32 } }),
      loc('shell.title', {}, 'h1')),
    el('div', { className: 'header-tools' },
      el('div', { className: 'segmented', attrs: { role: 'group', ...locAttrs({ 'aria-label': 'shell.lang.label' }) } }, ...languageButtons),
      el('div', { className: 'segmented', attrs: { role: 'group', ...locAttrs({ 'aria-label': 'shell.theme.label' }) } }, ...themeButtons)));
  host.append(iconSprite(), element);

  function syncLanguageButtons() {
    for (const button of languageButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.lang === getLocale()));
    }
  }

  // Without a stored theme the system preference applies.
  function syncThemeButtons() {
    const prefersDark = win?.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
    const shown = effectiveTheme(doc.documentElement.getAttribute('data-theme'), prefersDark);
    for (const button of themeButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.themeValue === shown));
    }
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  function remember(key, value) {
    try {
      preferences?.setItem(key, value);
    } catch {
      // A blocked storage only means the choice is not remembered.
    }
  }

  /** @type {Array<[HTMLButtonElement, () => void]>} */
  const handlers = [];
  for (const button of languageButtons) {
    const handler = () => {
      const code = normalize(button.dataset.lang);
      if (code !== null) {
        remember(LANGUAGE_KEY, code);
        setLocale(code, doc);
      }
    };
    button.addEventListener('click', handler);
    handlers.push([button, handler]);
  }
  for (const button of themeButtons) {
    const handler = () => {
      const theme = normalizeTheme(button.dataset.themeValue);
      if (theme !== null) {
        applyTheme(doc, theme);
        remember(THEME_KEY, theme);
        syncThemeButtons();
      }
    };
    button.addEventListener('click', handler);
    handlers.push([button, handler]);
  }
  const stopLanguage = onChange(syncLanguageButtons);
  syncLanguageButtons();
  syncThemeButtons();

  return {
    element,
    destroy() {
      stopLanguage();
      for (const [button, handler] of handlers) {
        button.removeEventListener('click', handler);
      }
      element.remove();
    },
  };
}
