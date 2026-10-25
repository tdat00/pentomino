// @ts-check
import { createI18n } from '../core/browser/i18n.js';
import en from './locale.en.js';
import vi from './locale.vi.js';

const i18n = createI18n({ en, vi });

export const {
  AVAILABLE, DEFAULT_LOCALE, normalize, detect, choose, getLocale, keys, packOf, has, raw, interpolate, t, formatNumber, applyTo, setLocale,
  onChange,
} = i18n;
