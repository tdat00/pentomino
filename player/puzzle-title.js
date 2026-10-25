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
 * The heading of a puzzle in the Player's language: the shared rule of `core/browser/puzzle-title.js` (an untitled
 * puzzle is "Puzzle #n"; a title that ends in a number or has more than 75 code points is shown as it is; any other
 * title gets " #n"). The printed sheet and the puzzle re-created from its code show the same heading.
 * @param {string | undefined} title
 * @param {number} index Zero-based position in the pack.
 * @returns {string}
 */
export function puzzleDisplayName(title, index) {
  return sharedDisplayName(title, index, LABELS.puzzleNumber);
}
