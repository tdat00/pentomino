// @ts-check
// Display name of a puzzle in the player's top bar.

import { LABELS } from './strings.js';

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
