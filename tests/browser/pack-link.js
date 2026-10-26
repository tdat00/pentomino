// @ts-check
// The `#p=` address of a pack, as the Generator's Play makes it: the code of every puzzle, separated by ";", made by the
// real puzzle-code worker, and `&i=` for a puzzle other than the first. Shared by the browser harnesses.

import { createPuzzleCodeClient } from '../../core/browser/puzzle-code-client.js';
import { puzzleCodesOf } from '../../core/browser/handoff.js';

/** @typedef {import('../../core/engine/types.js').Pack} Pack */

/** @type {ReturnType<typeof createPuzzleCodeClient> | null} */
let client = null;

/**
 * @param {Pack} pack A valid pack.
 * @param {number} [index] The puzzle to open.
 * @returns {Promise<string>}
 */
export async function packHash(pack, index = 0) {
  client ??= createPuzzleCodeClient();
  const own = client;
  const codes = await puzzleCodesOf(pack, { encodePuzzle: (data) => own.encode(data) });
  if (codes === null) {
    throw new Error('the puzzle codes of the pack could not be made');
  }
  return `#p=${codes.join(';')}${index === 0 ? '' : `&i=${index}`}`;
}
