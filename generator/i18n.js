// @ts-check
// Generator interface language: the shared engine in core/browser/i18n.js over the generator's own text packs.
import { createI18n } from '../core/browser/i18n.js';
import en from './locale.en.js';
import vi from './locale.vi.js';

const i18n = createI18n({ en, vi });

export const {
  AVAILABLE, DEFAULT_LOCALE, normalize, detect, getLocale, keys, packOf, has, raw, interpolate, t, formatNumber, applyTo, setLocale,
  onChange,
} = i18n;

/** The start language: `?lang=`, then the saved choice, then the browser languages, then English. */
export const { choose } = i18n;
