// @ts-check
// Play controller: turns taps, drags, keys and toolbar actions into previews and reducer actions on the open game.
// No DOM and no clocks of its own (timers, time source and live region are injected), so it also runs under Node.
// Legality is decided only by `canPlace` and `reduce`; the helpers below just build the candidate poses.

import { activeCells } from '../core/engine/board.js';
import { canPlace, poseT, reduce } from '../core/engine/game.js';
import { poseCells } from '../core/engine/geometry.js';
import { packBoard } from '../core/engine/pack.js';
import { arrowToGrid, screenFlip, screenRotate } from '../core/engine/view.js';
import { alignedOrientedCells, labelCell, pieceName } from '../core/browser/svg-board.js';
import { effectiveRotation } from './state.js';
import { PLAY_TEXT, solvedSummary } from './strings.js';

/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').XY} XY */
/** @typedef {import('../core/engine/types.js').Board} Board */
/** @typedef {import('../core/engine/game.js').GameState} GameState */
/** @typedef {'cw' | 'ccw' | 'flipH' | 'flipV'} TransformOp */
/** @typedef {'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'} ArrowKey */

/** One-cell grid kicks tried, in order, after the natural pose of a rotated or mirrored placed piece. */
export const KICKS = Object.freeze(/** @type {XY[]} */ ([[0, -1], [-1, 0], [1, 0], [0, 1]]));
export const SAVE_DELAY_MS = 250;
export const TICK_MS = 1000;
const ARROW_KEYS = Object.freeze(/** @type {ArrowKey[]} */ (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']));

/**
 * Cell of source cell `index` inside the oriented, normalized piece.
 * @param {Piece} piece
 * @param {number} t
 * @param {number} index
 * @returns {XY}
 */
export function orientedHandle(piece, t, index) {
  return alignedOrientedCells(piece.cells, t)[index];
}

/**
 * Source index of the occupied cell nearest the piece centroid (ties by y, then x).
 * @param {Piece} piece
 * @param {number} t
 * @returns {number}
 */
export function defaultHandle(piece, t) {
  const cells = alignedOrientedCells(piece.cells, t);
  const [x, y] = labelCell(cells);
  return cells.findIndex((c) => c[0] === x && c[1] === y);
}

/**
 * Pose of `piece` at orientation `t` with its handle cell on `cell`.
 * @param {Piece} piece
 * @param {number} t
 * @param {number} index Source index of the handle.
 * @param {XY} cell
 * @returns {Pose}
 */
export function poseWithHandle(piece, t, index, cell) {
  const [gx, gy] = orientedHandle(piece, t, index);
  return { piece: piece.id, x: cell[0] - gx, y: cell[1] - gy, turn: t & 3, mirrored: t >= 4 };
}

/**
 * @param {Piece} piece
 * @param {Pose} pose
 * @param {number} index
 * @returns {XY}
 */
export function handleCell(piece, pose, index) {
  const [gx, gy] = orientedHandle(piece, poseT(pose), index);
  return [pose.x + gx, pose.y + gy];
}

/**
 * New orientation index after a screen-space operation at display angle `theta`.
 * @param {number} t
 * @param {TransformOp} op
 * @param {number} theta
 * @returns {number}
 */
export function transformedT(t, op, theta) {
  switch (op) {
    case 'cw':
      return screenRotate(t, 'cw');
    case 'ccw':
      return screenRotate(t, 'ccw');
    case 'flipH':
      return screenFlip(t, theta, 'horizontal');
    default:
      return screenFlip(t, theta, 'vertical');
  }
}

/**
 * New pose of a placed piece after turning it about its handle: the natural pose
 * first, then the one-cell kicks. `null` when nothing fits.
 * @param {GameState} game
 * @param {Pose} pose Current placement.
 * @param {number} index Handle source index.
 * @param {number} newT
 * @returns {Pose | null}
 */
export function rotatePlaced(game, pose, index, newT) {
  const piece = game.pack.pieces.find((p) => p.id === pose.piece);
  if (piece === undefined) {
    return null;
  }
  const base = poseWithHandle(piece, newT, index, handleCell(piece, pose, index));
  for (const [dx, dy] of [[0, 0], ...KICKS]) {
    const candidate = { ...base, x: base.x + dx, y: base.y + dy };
    if (canPlace(game, candidate, piece.id).ok) {
      return candidate;
    }
  }
  return null;
}

/**
 * @param {number} theta
 * @param {ArrowKey} key
 * @param {boolean} [shift]
 * @returns {XY}
 */
export function keyStep(theta, key, shift = false) {
  const [dx, dy] = arrowToGrid(theta, key);
  const n = shift ? 3 : 1;
  return [dx * n, dy * n];
}

/**
 * @param {Pose | null | undefined} a
 * @param {Pose | null | undefined} b
 * @returns {boolean}
 */
function samePose(a, b) {
  if (!a || !b) {
    return !a && !b;
  }
  return a.piece === b.piece && a.x === b.x && a.y === b.y && a.turn === b.turn && a.mirrored === b.mirrored;
}

/** @type {WeakMap<object, { board: Board, pieces: Map<string, Piece> }>} */
const tables = new WeakMap();

/**
 * @param {GameState} game
 * @returns {{ board: Board, pieces: Map<string, Piece> }}
 */
function tableOf(game) {
  let table = tables.get(game.pack);
  if (table === undefined) {
    table = { board: packBoard(game.pack), pieces: new Map(game.pack.pieces.map((p) => [p.id, p])) };
    tables.set(game.pack, table);
  }
  return table;
}

/**
 * @typedef {object} DragState
 * @property {string} pieceId
 * @property {'tray' | 'board'} from
 * @property {number} t Orientation being dragged; committed only by a valid drop.
 * @property {number} index Handle source index.
 * @property {XY | null} local Pointer in board-local units, null when away from the board.
 * @property {boolean} overTray
 * @property {Pose | null} pose Ghost pose under the pointer.
 */

/**
 * @typedef {object} PlayUi
 * @property {{ piece: string, index: number } | null} handle
 * @property {DragState | null} drag
 * @property {boolean} keyboard A keyboard pick-up is in progress (arrow hints, focus follow-up).
 */

/**
 * @typedef {object} PlayOptions
 * @property {import('./state.js').PlayerStore} store
 * @property {import('./state.js').PlayerController} controller
 * @property {() => number} [now] Millisecond clock.
 * @property {(fn: () => void, ms: number) => unknown} [setTimeout]
 * @property {(handle: unknown) => void} [clearTimeout]
 * @property {(fn: () => void, ms: number) => unknown} [setInterval]
 * @property {(handle: unknown) => void} [clearInterval]
 * @property {(message: string) => void} [announce]
 * @property {() => void} [onNoRoom] Shake the board (the caller honours reduced motion).
 * @property {(result: { elapsedMs: number, moves: number }) => void} [onSolved]
 * @property {(pieceId: string, where: 'board' | 'tray') => void} [focus] Keyboard follow-up focus.
 * @property {number} [saveDelayMs]
 * @property {number} [tickMs]
 */

/**
 * @param {PlayOptions} options
 */
export function createPlayController(options) {
  const { store, controller } = options;
  const now = options.now ?? (() => Date.now());
  const later = options.setTimeout ?? ((fn, ms) => globalThis.setTimeout(fn, ms));
  const unlater = options.clearTimeout ?? ((handle) => globalThis.clearTimeout(/** @type {any} */ (handle)));
  const every = options.setInterval ?? ((fn, ms) => globalThis.setInterval(fn, ms));
  const unevery = options.clearInterval ?? ((handle) => globalThis.clearInterval(/** @type {any} */ (handle)));
  const saveDelay = options.saveDelayMs ?? SAVE_DELAY_MS;
  const tickMs = options.tickMs ?? TICK_MS;
  /** @param {string} message */
  const announce = (message) => options.announce?.(message);

  /** @type {PlayUi} */
  let ui = { handle: null, drag: null, keyboard: false };
  let version = 0;
  let visible = true;
  let destroyed = false;
  /** @type {unknown} */
  let saveTimer = null;
  /** @type {unknown} */
  let ticker = null;
  let lastTick = 0;
  /** @type {Set<() => void>} */
  const listeners = new Set();

  /** @returns {GameState | null} */
  function openGame() {
    const s = store.getState();
    return destroyed || s.screen !== 'game' || s.game === null ? null : s.game;
  }

  /**
   * @param {GameState} game
   * @param {string} id
   * @returns {Piece | undefined}
   */
  const pieceOf = (game, id) => tableOf(game).pieces.get(id);

  /**
   * @param {GameState} game
   * @param {string} id
   * @returns {boolean}
   */
  const isMovable = (game, id) => game.tray.has(id) || game.placed.has(id);

  /**
   * @param {GameState} game
   * @param {string} id
   * @returns {number}
   */
  function currentT(game, id) {
    const placed = game.placed.get(id);
    return placed === undefined ? game.tray.get(id) ?? 0 : poseT(placed);
  }

  /** @returns {number} */
  const theta = () => effectiveRotation(store.getState());

  /**
   * @param {GameState} game
   * @param {string} id
   * @param {Piece} piece
   * @returns {number}
   */
  function handleIndex(game, id, piece) {
    return ui.handle !== null && ui.handle.piece === id && ui.handle.index < piece.cells.length
      ? ui.handle.index
      : defaultHandle(piece, currentT(game, id));
  }

  /**
   * One state transition: a ui patch, a game patch, or both. The store renders
   * game patches; ui-only changes notify the listeners themselves.
   * @param {Partial<PlayUi> | null} uiPatch
   * @param {Partial<GameState> | null} [gamePatch]
   */
  function change(uiPatch, gamePatch = null) {
    if (uiPatch !== null) {
      ui = { ...ui, ...uiPatch };
      version += 1;
    }
    if (gamePatch !== null) {
      store.update((s) => (s.game === null ? null : { game: { ...s.game, ...gamePatch } }));
    } else if (uiPatch !== null) {
      for (const listener of [...listeners]) {
        listener();
      }
    }
  }

  function scheduleSave() {
    if (saveTimer !== null) {
      unlater(saveTimer);
    }
    saveTimer = later(() => {
      saveTimer = null;
      controller.saveNow();
    }, saveDelay);
  }

  function flush() {
    if (saveTimer !== null) {
      unlater(saveTimer);
      saveTimer = null;
    }
    controller.saveNow();
  }

  /** @returns {boolean} */
  function shouldRun() {
    const s = store.getState();
    const g = s.game;
    return !destroyed && visible && s.screen === 'game' && g !== null && !g.solved && g.moves > 0;
  }

  function tick() {
    const t = now();
    const dt = Math.max(0, t - lastTick);
    lastTick = t;
    if (dt > 0) {
      store.update((s) => (s.game === null ? null : { game: { ...s.game, elapsedMs: s.game.elapsedMs + dt } }));
    }
  }

  function syncTimer() {
    const run = shouldRun();
    if (run && ticker === null) {
      lastTick = now();
      ticker = every(tick, tickMs);
    } else if (!run && ticker !== null) {
      unevery(ticker);
      ticker = null;
    }
  }

  /**
   * @param {GameState} next
   * @param {Pose | null} [preview] Ghost to keep after the commit.
   * @returns {boolean} False for a no-op.
   */
  function commit(next, preview = null) {
    const before = openGame();
    if (before === null || next === before) {
      return false;
    }
    const t = now();
    // Time up to this commit belongs to the game that is being replaced.
    const carried = ticker !== null ? Math.max(0, t - lastTick) : 0;
    lastTick = t;
    const stamped = { ...next, preview, elapsedMs: next.elapsedMs + carried };
    store.update({ game: stamped });
    syncTimer();
    if (stamped.solved && !before.solved) {
      flush();
      // A revealed answer is a complete cover, but not an earned win.
      if (!stamped.revealed) {
        announce(PLAY_TEXT.solved(solvedSummary(stamped.elapsedMs, stamped.moves)));
        options.onSolved?.({ elapsedMs: stamped.elapsedMs, moves: stamped.moves });
      }
    } else {
      scheduleSave();
    }
    return true;
  }

  /**
   * @param {GameState} game
   * @param {Pose} pose
   * @returns {string}
   */
  function nameOnBoard(game, pose) {
    const piece = /** @type {Piece} */ (pieceOf(game, pose.piece));
    return pieceName(piece, 'on board', poseCells(piece, pose));
  }

  /**
   * @param {GameState} game
   * @param {Pose} pose
   * @returns {string}
   */
  function ghostText(game, pose) {
    const piece = /** @type {Piece} */ (pieceOf(game, pose.piece));
    const [x, y] = handleCell(piece, pose, handleIndex(game, pose.piece, piece));
    const verdict = canPlace(game, pose, pose.piece);
    return PLAY_TEXT.ghostAt(y + 1, x + 1, verdict.ok ? null : verdict.reason);
  }

  /**
   * @param {string | null} id
   * @returns {boolean}
   */
  function select(id) {
    const game = openGame();
    if (game === null || ui.drag !== null) {
      return false;
    }
    if (id === null) {
      if (game.selected === null && game.preview === null) {
        return false;
      }
      change({ handle: null, keyboard: false }, { selected: null, preview: null });
      return true;
    }
    const piece = pieceOf(game, id);
    if (piece === undefined || !isMovable(game, id)) {
      return false;
    }
    if (game.selected !== id) {
      change({ handle: { piece: id, index: defaultHandle(piece, currentT(game, id)) }, keyboard: false }, { selected: id, preview: null });
      announce(PLAY_TEXT.selected(piece.label));
    }
    return true;
  }

  /**
   * Keyboard pick-up: a placed piece starts at its pose, a tray piece with its
   * handle on the first active cell. Nothing is committed.
   * @param {string} id
   * @param {boolean} [quiet]
   * @returns {boolean}
   */
  function pickUp(id, quiet = false) {
    const game = openGame();
    const piece = game === null ? undefined : pieceOf(game, id);
    if (game === null || piece === undefined || !isMovable(game, id) || ui.drag !== null) {
      return false;
    }
    const index = game.selected === id ? handleIndex(game, id, piece) : defaultHandle(piece, currentT(game, id));
    const placed = game.placed.get(id);
    const first = activeCells(tableOf(game).board)[0] ?? /** @type {XY} */ ([0, 0]);
    const pose = placed ?? poseWithHandle(piece, currentT(game, id), index, first);
    change({ handle: { piece: id, index }, keyboard: true }, { selected: id, preview: pose });
    if (!quiet) {
      announce(PLAY_TEXT.pickedUp(piece.label));
    }
    return true;
  }

  /** @returns {boolean} False when there is nothing to drop or the ghost is not legal. */
  function commitPreview() {
    const game = openGame();
    const pose = game?.preview ?? null;
    if (game === null || pose === null || ui.drag !== null) {
      return false;
    }
    const verdict = canPlace(game, pose, pose.piece);
    if (!verdict.ok) {
      announce(PLAY_TEXT.cannotPlace(verdict.reason));
      return false;
    }
    const fromBoard = game.placed.has(pose.piece);
    const next = reduce(game, { type: fromBoard ? 'move' : 'place', pose });
    change({ keyboard: false });
    if (commit(next)) {
      const after = openGame();
      if (after !== null && !after.solved) {
        announce(fromBoard ? PLAY_TEXT.moved(nameOnBoard(after, pose)) : PLAY_TEXT.placed(nameOnBoard(after, pose)));
      }
      options.focus?.(pose.piece, 'board');
    } else {
      change(null, { preview: null });
    }
    return true;
  }

  const api = {
    /** Redraw hook for ui-only changes (a store update re-renders by itself). */
    subscribe(/** @type {() => void} */ listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Increases with every ui change; lets a renderer skip unchanged frames. */
    version: () => version,
    /**
     * What the views draw on top of the game: handle cursor, the piece hidden
     * during a drag and the grid-axis hints of a keyboard move.
     */
    view() {
      const s = store.getState();
      const g = s.game;
      const drag = ui.drag;
      /** @type {XY | null} */
      let cursor = null;
      /** @type {{ cell: XY, vectors: { key: ArrowKey, dx: number, dy: number }[] } | null} */
      let hints = null;
      if (g !== null && g.selected !== null) {
        const piece = pieceOf(g, g.selected);
        const pose = g.preview ?? g.placed.get(g.selected);
        if (piece !== undefined && pose !== undefined && pose !== null) {
          cursor = handleCell(piece, pose, handleIndex(g, g.selected, piece));
        }
      }
      const angle = effectiveRotation(s);
      if (cursor !== null && ui.keyboard && g?.preview != null && angle % 360 !== 0) {
        hints = { cell: cursor, vectors: ARROW_KEYS.map((key) => ({ key, dx: arrowToGrid(angle, key)[0], dy: arrowToGrid(angle, key)[1] })) };
      }
      return {
        cursor,
        hints,
        dragging: drag !== null,
        drag,
        hiddenPieceId: drag?.from === 'board' ? drag.pieceId : null,
        hiddenTrayId: drag?.from === 'tray' ? drag.pieceId : null,
        keyboard: ui.keyboard,
      };
    },
    select,
    /**
     * A second tap on the selected tray piece turns it clockwise.
     * @param {string} id
     * @param {'tray' | 'board'} from
     * @returns {boolean}
     */
    tapPiece(id, from) {
      const game = openGame();
      if (game === null || ui.drag !== null || !isMovable(game, id)) {
        return false;
      }
      if (from === 'tray' && game.selected === id && game.tray.has(id)) {
        return api.transform('cw');
      }
      return select(id);
    },
    /**
     * Tap on a board cell: previews the selected piece with its handle there; a
     * tap on the previewed handle cell again drops it.
     * @param {XY} cell
     * @returns {boolean}
     */
    tapCell(cell) {
      const game = openGame();
      if (game === null || ui.drag !== null) {
        return false;
      }
      const id = game.selected;
      const piece = id === null ? undefined : pieceOf(game, id);
      if (id === null || piece === undefined) {
        announce(PLAY_TEXT.selectFirst);
        return false;
      }
      const index = handleIndex(game, id, piece);
      const base = game.preview !== null && game.preview.piece === id ? game.preview : null;
      if (base !== null) {
        const [hx, hy] = handleCell(piece, base, index);
        if (hx === cell[0] && hy === cell[1]) {
          return commitPreview();
        }
      }
      const pose = poseWithHandle(piece, base !== null ? poseT(base) : currentT(game, id), index, cell);
      change({ handle: { piece: id, index }, keyboard: false }, { preview: pose });
      const verdict = canPlace(game, pose, id);
      announce(verdict.ok ? PLAY_TEXT.previewValid : PLAY_TEXT.cannotPlace(verdict.reason));
      return true;
    },
    /**
     * Enter or Space on a piece: pick it up, or drop it when it is already previewed.
     * @param {string} id
     * @returns {boolean}
     */
    activate(id) {
      const game = openGame();
      if (game === null || !isMovable(game, id)) {
        return false;
      }
      if (game.selected === id && game.preview !== null && game.preview.piece === id) {
        return commitPreview();
      }
      return pickUp(id);
    },
    /** @returns {boolean} */
    activateSelected() {
      const game = openGame();
      return game !== null && game.selected !== null && api.activate(game.selected);
    },
    pickUp,
    commitPreview,
    /**
     * Arrow keys: moves the previewed piece, picking the selected one up first.
     * @param {ArrowKey} key
     * @param {boolean} [shift]
     * @returns {boolean}
     */
    moveKey(key, shift = false) {
      const game = openGame();
      if (game === null || ui.drag !== null || game.selected === null) {
        return false;
      }
      const id = game.selected;
      if (game.preview === null || game.preview.piece !== id) {
        pickUp(id, true);
      }
      const picked = openGame();
      const piece = picked === null ? undefined : pieceOf(picked, id);
      if (picked === null || picked.preview === null || piece === undefined) {
        return false;
      }
      const { board } = tableOf(picked);
      const index = handleIndex(picked, id, piece);
      const [dx, dy] = keyStep(theta(), key, shift);
      const [cx, cy] = handleCell(piece, picked.preview, index);
      const target = /** @type {XY} */ ([Math.max(0, Math.min(board.width - 1, cx + dx)), Math.max(0, Math.min(board.height - 1, cy + dy))]);
      const pose = poseWithHandle(piece, poseT(picked.preview), index, target);
      change({ keyboard: true }, { preview: pose });
      const after = openGame();
      if (after !== null) {
        announce(ghostText(after, pose));
      }
      return true;
    },
    /**
     * Screen-space rotate or mirror of the dragged, previewed or selected piece.
     * @param {TransformOp} op
     * @returns {boolean}
     */
    transform(op) {
      const game = openGame();
      if (game === null) {
        return false;
      }
      const angle = theta();
      const drag = ui.drag;
      if (drag !== null) {
        const piece = /** @type {Piece} */ (pieceOf(game, drag.pieceId));
        const t = transformedT(drag.t, op, angle);
        const pose = drag.local !== null && !drag.overTray
          ? poseWithHandle(piece, t, drag.index, [Math.floor(drag.local[0]), Math.floor(drag.local[1])])
          : null;
        change({ drag: { ...drag, t, pose } }, { preview: pose });
        return true;
      }
      const id = game.selected;
      const piece = id === null ? undefined : pieceOf(game, id);
      if (id === null || piece === undefined) {
        announce(PLAY_TEXT.noSelection);
        return false;
      }
      const index = handleIndex(game, id, piece);
      const placed = game.placed.get(id);
      const preview = game.preview !== null && game.preview.piece === id ? game.preview : null;
      const newT = transformedT(preview !== null ? poseT(preview) : currentT(game, id), op, angle);
      if (preview !== null) {
        const ghost = poseWithHandle(piece, newT, index, handleCell(piece, preview, index));
        if (placed !== undefined) {
          change({ handle: { piece: id, index } }, { preview: ghost });
          announce(ghostText(game, ghost));
          return true;
        }
        commit(reduce(game, { type: 'orient', piece: id, t: newT }), ghost);
        announce(ghostText(openGame() ?? game, ghost));
        return true;
      }
      if (placed !== undefined) {
        const pose = rotatePlaced(game, placed, index, newT);
        if (pose === null) {
          announce(PLAY_TEXT.noRoom);
          options.onNoRoom?.();
          return true;
        }
        commit(reduce(game, { type: 'orient', piece: id, t: newT, pose }));
        announce(PLAY_TEXT.turned(piece.label));
        return true;
      }
      commit(reduce(game, { type: 'orient', piece: id, t: newT }));
      announce(PLAY_TEXT.turned(piece.label));
      return true;
    },
    /**
     * Cancels a drag, then a preview, then the selection. @returns {boolean}
     */
    cancel() {
      const game = openGame();
      if (game === null) {
        return false;
      }
      if (ui.drag !== null) {
        api.cancelDrag();
        return true;
      }
      if (game.preview !== null) {
        change({ keyboard: false }, { preview: null });
        announce(PLAY_TEXT.cancelled);
        return true;
      }
      return select(null);
    },
    /** @returns {boolean} */
    returnToTray() {
      const game = openGame();
      if (game === null || ui.drag !== null) {
        return false;
      }
      const id = game.selected;
      const piece = id === null ? undefined : pieceOf(game, id);
      if (id === null || piece === undefined) {
        announce(PLAY_TEXT.noSelection);
        return false;
      }
      if (game.placed.has(id)) {
        change({ keyboard: false });
        if (commit(reduce(game, { type: 'remove', piece: id }))) {
          announce(PLAY_TEXT.returned(piece.label));
          options.focus?.(id, 'tray');
        }
        return true;
      }
      if (game.preview !== null) {
        change({ keyboard: false }, { preview: null });
        announce(PLAY_TEXT.cancelled);
        return true;
      }
      announce(PLAY_TEXT.alreadyInTray);
      return true;
    },
    /** @returns {boolean} */
    undo() {
      const game = openGame();
      if (game === null || ui.drag !== null) {
        return false;
      }
      const next = reduce(game, { type: 'undo' });
      if (!commit(next)) {
        announce(PLAY_TEXT.nothingToUndo);
        return false;
      }
      announce(PLAY_TEXT.undone);
      return true;
    },
    /** @returns {boolean} */
    redo() {
      const game = openGame();
      if (game === null || ui.drag !== null) {
        return false;
      }
      const next = reduce(game, { type: 'redo' });
      if (!commit(next)) {
        announce(PLAY_TEXT.nothingToRedo);
        return false;
      }
      announce(PLAY_TEXT.redone);
      return true;
    },
    /** @returns {boolean} */
    reset() {
      const game = openGame();
      if (game === null || ui.drag !== null) {
        return false;
      }
      const changed = commit(reduce(game, { type: 'reset' }));
      if (changed) {
        announce(PLAY_TEXT.resetDone);
      }
      return changed;
    },
    /**
     * Applies one reducer action from outside the gestures (hint placement,
     * counters, reveal): one undoable commit, saved like every move.
     * @param {import('../core/engine/game.js').Action} action
     * @returns {boolean} False for a refused or no-op action.
     */
    apply(action) {
      const game = openGame();
      if (game === null || ui.drag !== null) {
        return false;
      }
      return commit(reduce(game, action), action.type === 'hint' ? game.preview : null);
    },
    /**
     * @param {{ pieceId: string, sourceCell: number | null }} grab
     * @returns {boolean}
     */
    beginDrag({ pieceId, sourceCell }) {
      const game = openGame();
      const piece = game === null ? undefined : pieceOf(game, pieceId);
      if (game === null || piece === undefined || !isMovable(game, pieceId) || ui.drag !== null) {
        return false;
      }
      const t = currentT(game, pieceId);
      const index = Number.isInteger(sourceCell) && /** @type {number} */ (sourceCell) >= 0 && /** @type {number} */ (sourceCell) < piece.cells.length
        ? /** @type {number} */ (sourceCell)
        : defaultHandle(piece, t);
      change({
        handle: { piece: pieceId, index },
        keyboard: false,
        drag: { pieceId, from: game.placed.has(pieceId) ? 'board' : 'tray', t, index, local: null, overTray: false, pose: null },
      }, { selected: pieceId, preview: null });
      return true;
    },
    /**
     * Pointer moved: `local` is the board-local point under the (lifted) pointer or null away from the board.
     * @param {XY | null} local
     * @param {boolean} [overTray]
     */
    dragTo(local, overTray = false) {
      const game = openGame();
      const drag = ui.drag;
      if (game === null || drag === null) {
        return;
      }
      const piece = /** @type {Piece} */ (pieceOf(game, drag.pieceId));
      const pose = local !== null && !overTray && Number.isFinite(local[0]) && Number.isFinite(local[1])
        ? poseWithHandle(piece, drag.t, drag.index, [Math.floor(local[0]), Math.floor(local[1])])
        : null;
      if (samePose(pose, drag.pose) && overTray === drag.overTray) {
        ui = { ...ui, drag: { ...drag, local } };
        return;
      }
      change({ drag: { ...drag, local, overTray, pose } }, { preview: pose });
    },
    /**
     * Pointer released. A valid ghost is placed or moved as one step, the tray
     * takes a board piece back, anything else reverts.
     * @returns {'placed' | 'moved' | 'returned' | 'reverted' | 'none'}
     */
    endDrag() {
      const game = openGame();
      const drag = ui.drag;
      if (game === null || drag === null) {
        return 'none';
      }
      const piece = /** @type {Piece} */ (pieceOf(game, drag.pieceId));
      change({ drag: null });
      if (drag.overTray) {
        if (drag.from === 'board' && commit(reduce(game, { type: 'remove', piece: drag.pieceId }))) {
          announce(PLAY_TEXT.returned(piece.label));
          return 'returned';
        }
      } else if (drag.pose !== null) {
        const verdict = canPlace(game, drag.pose, drag.pieceId);
        if (verdict.ok) {
          if (commit(reduce(game, { type: drag.from === 'board' ? 'move' : 'place', pose: drag.pose }))) {
            const after = openGame();
            if (after !== null && !after.solved) {
              announce(drag.from === 'board' ? PLAY_TEXT.moved(nameOnBoard(after, drag.pose)) : PLAY_TEXT.placed(nameOnBoard(after, drag.pose)));
            }
            return drag.from === 'board' ? 'moved' : 'placed';
          }
        } else {
          announce(PLAY_TEXT.cannotPlace(verdict.reason));
        }
      }
      change(null, { preview: null });
      return 'reverted';
    },
    /**
     * Pointercancel, Escape, resize or an orientation change: nothing is committed.
     */
    cancelDrag() {
      if (ui.drag === null) {
        return;
      }
      change({ drag: null }, { preview: null });
      announce(PLAY_TEXT.moveCancelled);
    },
    clearInteraction() {
      change({ handle: null, drag: null, keyboard: false });
    },
    /** @param {boolean} value The tab is visible; the clock pauses while it is hidden. */
    setVisible(value) {
      if (value === visible) {
        return;
      }
      if (!value && ticker !== null) {
        tick();
      }
      visible = value;
      syncTimer();
      if (!value) {
        flush();
      }
    },
    flush,
    /**
     * Called by the app for every store change: opens the clock for a started
     * game and drops transient state when another puzzle takes over.
     * @param {import('./state.js').PlayerState} state
     * @param {import('./state.js').PlayerState | null} previous
     */
    onState(state, previous) {
      const g = state.game;
      const p = previous?.game ?? null;
      if (g === null || p === null || g.pack !== p.pack || g.index !== p.index) {
        if (saveTimer !== null) {
          unlater(saveTimer);
          saveTimer = null;
        }
        if (ui.drag !== null || ui.handle !== null || ui.keyboard) {
          ui = { handle: null, drag: null, keyboard: false };
          version += 1;
        }
      }
      syncTimer();
    },
    /** @returns {boolean} */
    clockRunning: () => ticker !== null,
    destroy() {
      destroyed = true;
      if (saveTimer !== null) {
        unlater(saveTimer);
      }
      if (ticker !== null) {
        unevery(ticker);
      }
      saveTimer = null;
      ticker = null;
      listeners.clear();
    },
  };
  return api;
}
