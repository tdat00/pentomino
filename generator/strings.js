// @ts-check
// User-facing generator text (design §10.7): notices, messages and the small vocabulary shared by the
// panels. The texts live in the language packs (locale.en.js, locale.vi.js); the functions here pick the
// current language at call time, so a text built after a language switch follows it.
import { level } from '../core/engine/levels.js';
import { getLocale, has, packOf, raw, t } from './i18n.js';

/** @typedef {Record<string, string | number>} NoticeParams */

/**
 * Fills `{name}` placeholders; a missing parameter is a programming error.
 * @param {string} label What is being formatted, for error messages.
 * @param {string} template
 * @param {NoticeParams} params
 * @returns {string}
 */
function fill(label, template, params) {
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    if (!Object.hasOwn(params, name)) {
      throw new RangeError(`${label} is missing {${name}}`);
    }
    return String(params[name]);
  });
}

/**
 * @param {string} code A notice id such as 'N-COUNT'.
 * @param {NoticeParams} [params]
 * @param {string} [variant] Required for codes with variants (N-LEVELS: 'above' | 'below').
 * @returns {string}
 */
export function formatNotice(code, params = {}, variant) {
  const base = `notice.${code}`;
  const template = raw(variant === undefined ? base : `${base}.${variant}`);
  if (template === undefined) {
    if (Object.keys(packOf('en')).some((key) => key.startsWith(`${base}.`))) {
      throw new RangeError(`notice ${code} needs a variant`);
    }
    throw new RangeError(`unknown notice: ${code}`);
  }
  return fill(`notice ${code}`, template, params);
}

/**
 * @param {string} code A message id such as 'M-LINK-COPIED'.
 * @param {NoticeParams} [params]
 * @returns {string}
 */
export function formatMessage(code, params = {}) {
  const template = raw(`message.${code}`);
  if (template === undefined) {
    throw new RangeError(`unknown message: ${code}`);
  }
  return fill(`message ${code}`, template, params);
}

/**
 * @param {string} id A level id such as 'hard' or 'hell-2'.
 * @returns {string} The level name in the current language; the engine's name for an id without one.
 */
export function levelLabel(id) {
  if (has(`level.name.${id}`)) {
    return t(`level.name.${id}`);
  }
  try {
    return level(id).label;
  } catch {
    return id;
  }
}

/** @type {Map<string, string> | null} */
let englishLevelIds = null;

/**
 * Puzzle titles are stored as "Hard #3" with the English level name; the screen shows them in the current language.
 * @param {string | undefined} title
 * @param {number} index Zero-based position, used when the puzzle has no title.
 * @returns {string}
 */
export function puzzleTitle(title, index) {
  if (title === undefined || title === '') {
    return t('card.title', { n: index + 1 });
  }
  const match = /^(.*) #(\d+)$/.exec(title);
  if (match === null || getLocale() === 'en') {
    return title;
  }
  if (englishLevelIds === null) {
    const names = packOf('en');
    englishLevelIds = new Map(Object.keys(names)
      .filter((key) => key.startsWith('level.name.'))
      .map((key) => [names[key], key.slice('level.name.'.length)]));
  }
  const id = englishLevelIds.get(match[1]);
  return id === undefined ? title : `${levelLabel(id)} #${match[2]}`;
}

/**
 * Why a link cannot be shared as it is. The words of an English warning come from the shared browser code; in
 * another language the known cases are described from the link itself.
 * @param {{ href: string | null, portable: boolean, warning?: string }} link
 * @returns {string | undefined}
 */
export function linkWarning(link) {
  if (link.warning === undefined) {
    return undefined;
  }
  if (link.portable) {
    return formatNotice('N-LONGLINK');
  }
  if (getLocale() === 'en') {
    return link.warning;
  }
  return link.href === null ? t('link.tooLarge') : t('link.localOnly');
}
