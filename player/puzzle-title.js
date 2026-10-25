// @ts-check

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
 * A generated title already ends in its number ("Normal #3"), so it is shown
 * as it is; any other title gets the one-based puzzle number appended, and an
 * untitled puzzle is "Puzzle <n>".
 * @param {string | undefined} title
 * @param {number} index Zero-based position in the pack.
 * @returns {string}
 */
export function puzzleDisplayName(title, index) {
  if (title === undefined || title === '') {
    return LABELS.puzzleNumber(index + 1);
  }
  return /#\d+$/.test(title) ? title : `${title} #${index + 1}`;
}
