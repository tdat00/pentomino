// @ts-check
// User-facing generator text from the language packs. Each call reads the current language, so text built after a
// language switch follows it.
import { level } from '../core/engine/levels.js';
import { has, packOf, raw, t } from './i18n.js';

/** @typedef {Record<string, string | number>} NoticeParams */

/**
 * Fills `{name}` placeholders; a missing parameter is a programming error.
 * @param {string} label For error messages.
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
 * @param {string} code A message id such as 'M-PACK-FULL'.
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
