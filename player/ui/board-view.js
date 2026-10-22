// @ts-check
// Board adapter: draws the open game (immutable clues, placed pieces, preview
// ghost, selected piece and cursor handle) through the shared T16 renderer. It
// never commits moves; the controller layer of T20 attaches pointer trackers to
// `surface` and reduces actions on the game.

import { canPlace } from '../../core/engine/game.js';
import { packBoard } from '../../core/engine/pack.js';
import { mountBoard, svgEl } from '../../core/browser/svg-board.js';

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
 * @property {string | null} [hiddenPieceId] Placed piece drawn elsewhere (the drag layer) while it is dragged.
 * @property {{ cell: XY, vectors: { key: string, dx: number, dy: number }[] } | null} [hints]
 *   Grid-axis arrows next to the handle cell during a keyboard move on a rotated board.
 */

const HINT_COLOR = '#0b5fff';
const HINT_GLYPHS = Object.freeze({ ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' });

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
  const hintsLayer = svgEl('g', { class: 'pm-hints', 'pointer-events': 'none' });
  view.svg.querySelector('.pm-board-group')?.append(hintsLayer);
  /** @type {object | null} */
  let lastPack = null;
  let lastIndex = -1;
  let lastAngle = 0;

  /**
   * Arrows along the grid axes, one per arrow key, upright glyph at the tip.
   * @param {BoardRenderExtras['hints']} hints
   * @param {number} angle
   */
  function renderHints(hints, angle) {
    if (hints === null || hints === undefined) {
      hintsLayer.replaceChildren();
      return;
    }
    const cx = hints.cell[0] + 0.5;
    const cy = hints.cell[1] + 0.5;
    const nodes = hints.vectors.map(({ key, dx, dy }) => {
      const tip = [cx + dx * 1.45, cy + dy * 1.45];
      const tail = [cx + dx * 0.7, cy + dy * 0.7];
      const side = [-dy * 0.16, dx * 0.16];
      const back = [tip[0] - dx * 0.28, tip[1] - dy * 0.28];
      const glyph = [cx + dx * 1.95, cy + dy * 1.95];
      return svgEl('g', { class: 'pm-hint', 'data-key': key },
        svgEl('path', { d: `M${tail[0]} ${tail[1]}L${tip[0]} ${tip[1]}`, stroke: HINT_COLOR, 'stroke-width': 0.09, fill: 'none', 'stroke-linecap': 'round' }),
        svgEl('path', { d: `M${tip[0]} ${tip[1]}L${back[0] + side[0]} ${back[1] + side[1]}L${back[0] - side[0]} ${back[1] - side[1]}Z`, fill: HINT_COLOR }),
        svgEl('text', {
          x: glyph[0], y: glyph[1], transform: `rotate(${angle} ${glyph[0]} ${glyph[1]})`, 'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': 0.5, 'font-family': 'system-ui, sans-serif', 'font-weight': 700, fill: HINT_COLOR, stroke: '#ffffff', 'stroke-width': 0.12, 'paint-order': 'stroke',
        }, HINT_GLYPHS[/** @type {keyof typeof HINT_GLYPHS} */ (key)] ?? ''));
    });
    hintsLayer.replaceChildren(...nodes);
  }

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
        placements: [...game.placed.values()].filter((pose) => pose.piece !== extras.hiddenPieceId),
        preview,
        selectedId: game.selected,
        cursor: extras.cursor ?? null,
        invalidCells: extras.invalidCells ?? [],
        showLabels: prefs.labels,
        showPatterns: prefs.patterns && pack.pieces.length > 20,
      });
      renderHints(extras.hints ?? null, angle);
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
