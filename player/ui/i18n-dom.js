// @ts-check
// Helpers that build translated DOM: the text is filled in at creation and the element is marked with
// `data-i18n`, so `applyTo` in i18n.js refreshes it when the language changes.
import { el } from '../../core/browser/dom.js';
import { t } from '../i18n.js';

/**
 * @param {string} key
 * @param {import('../../core/browser/dom.js').ElementProps} [props]
 * @param {string} [tag]
 * @returns {HTMLElement}
 */
export function loc(key, props = {}, tag = 'span') {
  return el(tag, { ...props, text: t(key), dataset: { ...props.dataset, i18n: key } });
}

/**
 * Attributes whose values are translations: `{ 'aria-label': 'ui.zoom' }`.
 * @param {Record<string, string>} spec Attribute name -> key.
 * @returns {Record<string, string>}
 */
export function locAttrs(spec) {
  /** @type {Record<string, string>} */
  const attrs = { 'data-i18n-attr': Object.entries(spec).map(([name, key]) => `${name}:${key}`).join(',') };
  for (const [name, key] of Object.entries(spec)) {
    attrs[name] = t(key);
  }
  return attrs;
}
