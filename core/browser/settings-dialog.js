// @ts-check
// Settings dialog of the narrow header: the language and the theme, the two choices that the wide header shows inline.
// It only builds the buttons (`[data-lang]`, `[data-theme-value]`, as in the wide header); each page wires them. The
// page's icon sprite must have `#ic-settings`, `#ic-sun`, `#ic-moon` and `#ic-contrast`.

import { el } from './dom.js';
import { svgEl } from './svg-board.js';

let dialogCount = 0;

/**
 * @param {string} icon
 * @returns {SVGElement}
 */
function sprite(icon) {
  return svgEl('svg', { class: 'icon', 'aria-hidden': 'true', focusable: 'false' }, svgEl('use', { href: `#${icon}` }));
}

/**
 * @param {(key: string) => string} t
 * @param {string} code
 * @returns {HTMLButtonElement}
 */
function languageButton(t, code) {
  const name = `shell.lang.${code}.name`;
  const short = `shell.lang.${code}.short`;
  return /** @type {HTMLButtonElement} */ (el('button', {
    className: 'segmented__btn',
    attrs: { type: 'button', lang: code, 'aria-pressed': 'false', 'aria-label': t(name), title: t(name), 'data-i18n-attr': `aria-label:${name},title:${name}` },
    dataset: { lang: code, i18n: short },
    text: t(short),
  }));
}

/**
 * @param {(key: string) => string} t
 * @param {string} theme
 * @param {string} key
 * @param {string} icon
 * @returns {HTMLButtonElement}
 */
function themeButton(t, theme, key, icon) {
  return /** @type {HTMLButtonElement} */ (el('button', {
    className: 'segmented__btn segmented__btn--icon',
    attrs: { type: 'button', 'aria-pressed': 'false', 'aria-label': t(key), title: t(key), 'data-i18n-attr': `aria-label:${key},title:${key}` },
    dataset: { themeValue: theme },
  }, sprite(icon)));
}

/**
 * @typedef {object} SettingsDialogOptions
 * @property {HTMLElement} host A page-level element.
 * @property {(key: string) => string} t The app's text lookup.
 */

/**
 * @param {SettingsDialogOptions} options
 */
export function createSettingsDialog({ host, t }) {
  const doc = host.ownerDocument;
  dialogCount += 1;
  const titleId = `pm-settings-title-${dialogCount}`;
  const languageId = `pm-settings-language-${dialogCount}`;
  const themeId = `pm-settings-theme-${dialogCount}`;
  /** @type {Element | null} */
  let opener = null;

  const languageButtons = [languageButton(t, 'en'), languageButton(t, 'vi')];
  const themeButtons = [
    themeButton(t, 'light', 'shell.theme.light', 'ic-sun'),
    themeButton(t, 'dark', 'shell.theme.dark', 'ic-moon'),
    themeButton(t, 'high-contrast', 'shell.theme.highContrast', 'ic-contrast'),
  ];
  const closeX = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-head-x',
    attrs: { type: 'button', 'aria-label': t('shell.settings.close'), title: t('shell.settings.close'), 'data-i18n-attr': 'aria-label:shell.settings.close,title:shell.settings.close' },
  }, svgEl('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, svgEl('path', { d: 'M6 6l12 12M18 6L6 18' }))));
  const head = el('header', { className: 'pm-head' },
    el('span', { className: 'pm-head-badge', attrs: { 'aria-hidden': 'true' } }, sprite('ic-settings')),
    el('div', { className: 'pm-head-titles' },
      el('h2', { className: 'pm-head-title', attrs: { id: titleId }, dataset: { i18n: 'shell.settings' }, text: t('shell.settings') })),
    closeX);

  /**
   * @param {string} id
   * @param {string} key
   * @param {HTMLElement[]} buttons
   * @returns {HTMLElement}
   */
  const row = (id, key, buttons) => el('div', { className: 'pm-settings-row' },
    el('span', { className: 'pm-settings-label', attrs: { id }, dataset: { i18n: key }, text: t(key) }),
    el('div', { className: 'segmented', attrs: { role: 'group', 'aria-labelledby': id } }, ...buttons));

  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', {
    className: 'pm-settings-dialog pm-pop', attrs: { 'aria-labelledby': titleId },
  }, el('div', { className: 'pm-settings-box' }, head, row(languageId, 'shell.lang.label', languageButtons), row(themeId, 'shell.theme.label', themeButtons))));
  host.append(dialog);

  closeX.addEventListener('click', () => dialog.close());
  // The dialog has no padding of its own, so a click that lands on it is a click on the backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    if (opener instanceof HTMLElement && opener.isConnected) {
      opener.focus();
    }
    opener = null;
  });

  return {
    element: dialog,
    languageButtons,
    themeButtons,
    /** @param {Element | null} [from] The control to give the focus back to (the focused element by default). */
    open(from) {
      opener = from ?? doc.activeElement;
      if (!dialog.open) {
        dialog.showModal();
      }
    },
    close() {
      if (dialog.open) {
        dialog.close();
      }
    },
    isOpen: () => dialog.open,
    dispose() {
      if (dialog.open) {
        dialog.close();
      }
      dialog.remove();
    },
  };
}
