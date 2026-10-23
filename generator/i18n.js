// @ts-check
// Generator interface language (English and Vietnamese). Language packs are flat objects (dotted key ->
// text) from locale.en.js and locale.vi.js. Texts use `{name}` placeholders; plural forms are keys with the
// suffix `_one` / `_other` chosen from `args.count` (a missing form falls back to `_other`, then to the plain
// key). A key missing from the current pack falls back to English, then to the key itself.
//
// DOM: `data-i18n="key"` sets the text, `data-i18n-attr="title:key,aria-label:key2"` sets attributes and
// `data-i18n-args='{"n":3}'` gives both their arguments. DOM access happens only inside `applyTo` and
// `setLocale`, so the module also loads in Node.
import en from './locale.en.js';
import vi from './locale.vi.js';

export const AVAILABLE = Object.freeze(['en', 'vi']);
export const DEFAULT_LOCALE = 'en';

/** @type {Readonly<Record<string, Readonly<Record<string, string>>>>} */
const PACKS = Object.freeze({ en, vi });
const INTL_TAGS = Object.freeze({ en: 'en-US', vi: 'vi-VN' });
const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

let current = DEFAULT_LOCALE;
/** @type {Array<(next: string, previous: string) => void>} */
let listeners = [];
/** @type {Record<string, Intl.PluralRules>} */
const pluralRules = {};

/**
 * Turns 'vi', 'VI', 'vi-VN' or 'vi_VN' into a supported code.
 * @param {unknown} code
 * @returns {string | null}
 */
export function normalize(code) {
  if (typeof code !== 'string') {
    return null;
  }
  const base = code.trim().toLowerCase().split(/[-_]/)[0];
  return AVAILABLE.includes(base) ? base : null;
}

/**
 * Picks the start language: the `lang` URL parameter, then the stored preference, then the browser
 * languages, then English. Pure: the caller reads the URL, the storage and `navigator`.
 * @param {{ urlLang?: unknown, stored?: unknown, navigator?: { language?: string, languages?: readonly string[] } | string | readonly string[] }} [sources]
 * @returns {string}
 */
export function detect(sources = {}) {
  const fromUrl = normalize(sources.urlLang);
  if (fromUrl !== null) {
    return fromUrl;
  }
  const fromStore = normalize(sources.stored);
  if (fromStore !== null) {
    return fromStore;
  }
  const source = sources.navigator;
  /** @type {readonly unknown[]} */
  let list = [];
  if (typeof source === 'string') {
    list = [source];
  } else if (Array.isArray(source)) {
    list = source;
  } else if (source !== null && typeof source === 'object') {
    list = [...(source.languages ?? []), ...(typeof source.language === 'string' ? [source.language] : [])];
  }
  for (const tag of list) {
    const found = normalize(tag);
    if (found !== null) {
      return found;
    }
  }
  return DEFAULT_LOCALE;
}

/** @returns {string} The current language code. */
export function getLocale() {
  return current;
}

/**
 * @param {string} locale
 * @returns {readonly string[]} Sorted keys of a language pack.
 */
export function keys(locale = current) {
  return Object.keys(PACKS[normalize(locale) ?? DEFAULT_LOCALE]).sort();
}

/**
 * @param {string} locale
 * @returns {Readonly<Record<string, string>>}
 */
export function packOf(locale) {
  return PACKS[normalize(locale) ?? DEFAULT_LOCALE];
}

/**
 * @param {string} code
 * @param {number} count
 * @returns {string}
 */
function pluralCategory(code, count) {
  try {
    pluralRules[code] ??= new Intl.PluralRules(INTL_TAGS[/** @type {'en' | 'vi'} */ (code)]);
    return pluralRules[code].select(count);
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

/**
 * @param {string} code
 * @param {string} key
 * @param {Record<string, unknown> | undefined} args
 * @returns {string | undefined}
 */
function templateFor(code, key, args) {
  const pack = PACKS[code];
  if (typeof args?.count === 'number' && Number.isFinite(args.count)) {
    const exact = `${key}_${pluralCategory(code, args.count)}`;
    if (Object.hasOwn(pack, exact)) {
      return pack[exact];
    }
    if (Object.hasOwn(pack, `${key}_other`)) {
      return pack[`${key}_other`];
    }
  }
  return Object.hasOwn(pack, key) ? pack[key] : undefined;
}

/**
 * @param {string} key
 * @returns {boolean} Whether the current language or English has the text.
 */
export function has(key) {
  return [current, DEFAULT_LOCALE].some((code) => ['', '_other', '_one'].some((suffix) => Object.hasOwn(PACKS[code], key + suffix)));
}

/**
 * The unfilled template of a text in the current language (English as fallback), or undefined.
 * @param {string} key
 * @param {Record<string, unknown>} [args] Only `count` is read, to choose the plural form.
 * @returns {string | undefined}
 */
export function raw(key, args) {
  return templateFor(current, key, args) ?? (current === DEFAULT_LOCALE ? undefined : templateFor(DEFAULT_LOCALE, key, args));
}

/**
 * @param {string} template
 * @param {Record<string, unknown> | undefined} args
 * @returns {string}
 */
export function interpolate(template, args) {
  if (args === undefined || !template.includes('{')) {
    return template;
  }
  return template.replace(PLACEHOLDER, (whole, name) => {
    const value = args[name];
    return value === undefined || value === null ? whole : String(value);
  });
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} [args]
 * @returns {string} The text, or the key itself when no language has it.
 */
export function t(key, args) {
  const template = raw(key, args);
  return template === undefined ? key : interpolate(template, args);
}

/**
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string}
 */
export function formatNumber(value, options) {
  try {
    return new Intl.NumberFormat(INTL_TAGS[/** @type {'en' | 'vi'} */ (current)], options).format(value);
  } catch {
    return String(value);
  }
}

/**
 * @param {string | null} text
 * @returns {Record<string, unknown> | undefined}
 */
function parseArgs(text) {
  if (typeof text !== 'string' || text === '') {
    return undefined;
  }
  try {
    const value = JSON.parse(text);
    return value !== null && typeof value === 'object' ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * @param {Element} node
 * @returns {number}
 */
function applyElement(node) {
  const key = node.getAttribute('data-i18n');
  const attrs = node.getAttribute('data-i18n-attr');
  if (!key && !attrs) {
    return 0;
  }
  const args = parseArgs(node.getAttribute('data-i18n-args'));
  if (key) {
    node.textContent = t(key, args);
  }
  for (const pair of (attrs ?? '').split(',')) {
    const cut = pair.lastIndexOf(':');
    const name = pair.slice(0, cut).trim();
    const attrKey = pair.slice(cut + 1).trim();
    if (cut > 0 && name !== '' && attrKey !== '') {
      node.setAttribute(name, t(attrKey, args));
    }
  }
  return 1;
}

/**
 * Translates every `data-i18n` / `data-i18n-attr` element at or below `root`.
 * @param {ParentNode & Partial<Element>} root
 * @returns {number} Number of elements updated.
 */
export function applyTo(root) {
  let count = typeof root.getAttribute === 'function' ? applyElement(/** @type {Element} */ (root)) : 0;
  for (const node of root.querySelectorAll('[data-i18n],[data-i18n-attr]')) {
    count += applyElement(node);
  }
  return count;
}

/**
 * Switches the language: updates `<html lang>`, translates the document and tells the listeners, which only
 * happens when the language really changed. An unsupported code is ignored.
 * @param {unknown} code
 * @param {Document | null} [doc] Document to translate; defaults to the global one when there is one.
 * @returns {string} The language now in effect.
 */
export function setLocale(code, doc = typeof document === 'undefined' ? null : document) {
  const next = normalize(code);
  if (next === null) {
    return current;
  }
  const previous = current;
  current = next;
  if (doc !== null) {
    doc.documentElement.setAttribute('lang', next);
    applyTo(doc);
  }
  if (next !== previous) {
    for (const listener of [...listeners]) {
      try {
        listener(next, previous);
      } catch (error) {
        console.error(error);
      }
    }
  }
  return current;
}

/**
 * @param {(next: string, previous: string) => void} listener
 * @returns {() => void} Removes the listener.
 */
export function onChange(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((other) => other !== listener);
  };
}
