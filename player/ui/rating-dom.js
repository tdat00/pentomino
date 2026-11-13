// @ts-check

import { el } from '../../core/browser/dom.js';
import { displayRatingKey, ratingDisplay } from '../../core/browser/display-rating.js';
import { t } from '../i18n.js';
import { levelLabel, ratingParts } from '../strings.js';

/**
 * What the Player shows for puzzle `at` of the open pack: the rating to draw and its notes (design §7.7), or null when
 * the puzzle has no rating. A rating on an older scale is shown as derived once the background request has answered.
 * @param {Pick<import('../state.js').PlayerState, 'pack' | 'fingerprints' | 'displayRatings'>} state
 * @param {number} at
 * @returns {ReturnType<typeof ratingDisplay>}
 */
export function displayRatingOf(state, at) {
  const fingerprint = state.fingerprints[at];
  const entry = fingerprint === undefined ? undefined : state.displayRatings[displayRatingKey(fingerprint)];
  return ratingDisplay(state.pack?.puzzles[at]?.rating, entry, { t, levelLabel });
}

/**
 * Replaces the content of `target` with the rating line, the level in bold, followed by the notes of the rating and
 * `tail`.
 * @param {HTMLElement} target
 * @param {Parameters<typeof ratingParts>[0]} rating
 * @param {string} [tail] Text appended after the rating and its notes, joined with " · ".
 * @param {string[]} [notes] Each is joined with " · " and has the class `rating-note`.
 * @returns {boolean} Whether `target` has any content.
 */
export function setRating(target, rating, tail = '', notes = []) {
  const parts = ratingParts(rating);
  /** @type {(Node | string)[]} */
  const nodes = [];
  if (parts !== null) {
    nodes.push(parts.before, el('strong', { className: 'rating-level', text: parts.level }), parts.after);
  }
  for (const note of notes) {
    if (nodes.length > 0) {
      nodes.push(' · ');
    }
    nodes.push(el('span', { className: 'rating-note', text: note }));
  }
  if (tail !== '') {
    nodes.push(nodes.length === 0 ? tail : ` · ${tail}`);
  }
  target.replaceChildren(...nodes);
  return nodes.length > 0;
}
