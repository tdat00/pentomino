// @ts-check

import { puzzleDisplayName as sharedDisplayName } from '../core/browser/puzzle-title.js';
import { LABELS } from './strings.js';

const GENERATED_TITLE = /^(?:Very easy|Easy|Normal|Hard|Expert|Master|Nightmare|Hell [1-9]\d*)(?: #\d+)?$/;

/**
 * Heading of a card in the puzzles panel, as in the generator: a generated title ("Expert #2", or a bare level name
 * such as "Easy") shows as "Puzzle #2"; a title somebody wrote stays as it is.
 * @param {string | undefined} title
 * @param {number} index Zero-based position in the pack.
 * @returns {string}
 */
export function cardHeading(title, index) {
  return title === undefined || title === '' || GENERATED_TITLE.test(title) ? LABELS.cardHeading(index + 1) : puzzleDisplayName(title, index);
}

/**
 * The shared heading rule of `core/browser/puzzle-title.js` in the Player's language, so the printed sheet and the
 * puzzle re-created from its code show the same heading.
 * @param {string | undefined} title
 * @param {number} index Zero-based position in the pack.
 * @returns {string}
 */
export function puzzleDisplayName(title, index) {
  return sharedDisplayName(title, index, LABELS.puzzleNumber);
}
