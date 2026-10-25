// @ts-check
// The one heading rule of a puzzle, shared by the Generator, the Player and the printed code: what a puzzle is called
// on screen and on paper, and which title goes into its puzzle code so that the re-created puzzle shows the same
// heading. Pure: no DOM, locale or storage; the localized "Puzzle #n" comes in as a callback, so it also loads in Node.

/** A title of at most this many code points takes an automatic " #n"; with that suffix it still fits the 80 of a pack. */
export const MAX_NUMBERED_TITLE_CODE_POINTS = 75;

const ENDS_IN_NUMBER = /#\d+$/;

/** @param {number} n @returns {string} */
const englishUntitled = (n) => `Puzzle #${n}`;

/**
 * @param {string} text
 * @param {number} limit
 * @returns {boolean} Whether the text has more than `limit` code points (counted without copying the text).
 */
function longerThan(text, limit) {
  let count = 0;
  for (const _ of text) {
    count += 1;
    if (count > limit) {
      return true;
    }
  }
  return false;
}

/**
 * The heading of a puzzle: its title, numbered when the title alone would not tell the puzzles of a pack apart.
 *
 * - no title (absent or empty): `untitled(index + 1)`, "Puzzle #n" / "Đề #n";
 * - a title that ends in "#" and digits ("Hard #3"): the title;
 * - a title of more than 75 code points: the title, never numbered, whatever its position;
 * - any other title: the title and " #" and the one-based position ("Normal" at position 2 is "Normal #2").
 * @param {string | null | undefined} title
 * @param {number} index Zero-based position in the pack.
 * @param {(n: number) => string} [untitled] The localized label of an untitled puzzle; English "Puzzle #n" by default.
 * @returns {string}
 */
export function puzzleDisplayName(title, index, untitled = englishUntitled) {
  if (typeof title !== 'string' || title === '') {
    return untitled(index + 1);
  }
  if (ENDS_IN_NUMBER.test(title) || longerThan(title, MAX_NUMBERED_TITLE_CODE_POINTS)) {
    return title;
  }
  return `${title} #${index + 1}`;
}

/**
 * The title that goes into the puzzle code of the puzzle at `index`, chosen so that the re-created puzzle, which sits
 * at position 1 of its own pack, shows `puzzleDisplayName(encoded, 0)` equal to `puzzleDisplayName(title, index)`.
 * The first puzzle keeps its stored title (absent and empty stay absent); at any other position the code carries the
 * displayed heading itself, literally, including the localized label of an untitled puzzle.
 * @param {string | null | undefined} title
 * @param {number} index Zero-based position in the pack.
 * @param {(n: number) => string} [untitled]
 * @returns {string | null} Null for no title.
 */
export function puzzleCodeTitle(title, index, untitled = englishUntitled) {
  if (index === 0) {
    return typeof title === 'string' && title !== '' ? title : null;
  }
  return puzzleDisplayName(title, index, untitled);
}
