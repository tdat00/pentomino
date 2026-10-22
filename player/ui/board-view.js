// @ts-check
// Board adapter: draws the open game (immutable clues, placed pieces, preview
// ghost, selected piece and cursor handle) through the shared T16 renderer. It
// never commits moves; the controller layer of T20 attaches pointer trackers to
// `surface` and reduces actions on the game.

import { canPlace } from '../../core/engine/game.js';
import { packBoard } from '../../core/engine/pack.js';
import { mountBoard } from '../../core/browser/svg-board.js';

/** @typedef {import('../../core/engine/types.js').Board} Board */
/** @typedef {import('../../core/engine/types.js').XY} XY */
/** @typedef {import('../../core/engine/game.js').GameState} GameState */
/** @typedef {import('../state.js').PlayerState} PlayerState */

/** @type {WeakMap<object, Board>} */
const boards = new WeakMap();

/**
 * @param {import('../../core/engine/types.js').Pack} pack
 * @returns {Board}
 */
function boardOf(pack) {
  let board = boards.get(pack);
  if (board === undefined) {
    board = packBoard(pack);
    boards.set(pack, board);
  }
  return board;
}

/**
 * @typedef {object} BoardViewHooks
 * @property {(pieceId: string, event: PointerEvent | KeyboardEvent) => void} [onPiece] Tap, Enter or Space on a movable piece.
 * @property {(cell: XY, event: PointerEvent) => void} [onCell] Tap on a board cell.
 * @property {string} [describedBy] Id of the element that holds the board instructions.
 */

/**
 * @typedef {object} BoardRenderExtras
 * @property {XY | null} [cursor] Grabbed-handle / keyboard cursor cell.
 * @property {XY[]} [invalidCells]
 */

/**
 * @param {HTMLElement} host
 * @param {BoardViewHooks} [hooks]
 */
export function createBoardView(host, hooks = {}) {
  const view = mountBoard(host, {
    mode: 'play',
    label: 'Puzzle board',
    describedBy: hooks.describedBy,
    onPiece: hooks.onPiece,
    onCell: hooks.onCell,
  });
  /** @type {object | null} */
  let lastPack = null;
  let lastIndex = -1;
  let lastAngle = 0;

  return {
    /** The shared T16 view: `surface` for pointer trackers, `cellAt`, `panTo`. */
    view,
    /**
     * @param {Pick<PlayerState, 'pack' | 'game' | 'prefs'>} state
     * @param {number} angle Effective display angle, counter-clockwise degrees.
     * @param {BoardRenderExtras} [extras]
     */
    render(state, angle, extras = {}) {
      const { pack, game, prefs } = state;
      if (pack === null || game === null) {
        return;
      }
      const puzzle = pack.puzzles[game.index];
      const angleChanged = angle !== lastAngle;
      if (angleChanged) {
        view.setRotation(angle);
        lastAngle = angle;
      }
      const preview = game.preview === null ? null : (() => {
        const verdict = canPlace(game, game.preview, game.preview.piece);
        return verdict.ok ? { pose: game.preview, valid: true } : { pose: game.preview, valid: false, reason: verdict.reason };
      })();
      view.render({
        board: boardOf(pack),
        pieces: pack.pieces,
        clues: puzzle.clues,
        placements: [...game.placed.values()],
        preview,
        selectedId: game.selected,
        cursor: extras.cursor ?? null,
        invalidCells: extras.invalidCells ?? [],
        showLabels: prefs.labels,
        showPatterns: prefs.patterns && pack.pieces.length > 20,
      });
      const fresh = pack !== lastPack || game.index !== lastIndex || angleChanged;
      lastPack = pack;
      lastIndex = game.index;
      if (fresh) {
        view.fit();
      }
    },
    /** Refits to the host after a viewport change; the user's zoom is not kept. */
    refit() {
      view.fit();
    },
    /** @param {number} px */
    zoom(px) {
      view.setZoom(px);
    },
    /** @returns {number} Current cell size in CSS px. */
    cellPx: () => view.getState().cellPx,
    destroy() {
      view.destroy();
    },
  };
}
