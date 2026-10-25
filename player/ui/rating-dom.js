// @ts-check
// Shows a puzzle rating with its difficulty level in bold.

import { el } from '../../core/browser/dom.js';
import { ratingParts } from '../strings.js';

/**
 * Replaces the content of `target` with the rating line, the level in bold, followed by `tail`.
 * @param {HTMLElement} target
 * @param {Parameters<typeof ratingParts>[0]} rating
 * @param {string} [tail] Text appended after the rating, joined with " · ".
 * @returns {boolean} Whether `target` has any content.
 */
export function setRating(target, rating, tail = '') {
  const parts = ratingParts(rating);
  /** @type {(Node | string)[]} */
  const nodes = [];
  if (parts !== null) {
    nodes.push(parts.before, el('strong', { className: 'rating-level', text: parts.level }), parts.after);
  }
  if (tail !== '') {
    nodes.push(parts === null ? tail : ` · ${tail}`);
  }
  target.replaceChildren(...nodes);
  return nodes.length > 0;
}
