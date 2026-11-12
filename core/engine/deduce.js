// @ts-check
// Deduction solver core (design §7.9): measures a puzzle the way a person solves it. Placements that are
// forced are made first (R1: a free cell with one possible placement, R2: a piece with one possible
// placement); the pocket rule (R3: a closed region of free cells that the remaining pieces cannot fill
// exactly is a contradiction, and one that only a single piece can fill gets that piece), the claims (R4: a
// piece that must cover a cell keeps the other pieces off it, R5: a cell that only one piece can reach claims
// that piece) and the lookahead (R6: a placement whose forced consequences break the board is removed)
// follow; the hard deductions come last (R7: the chessboard colouring of a pocket must balance, R8: a
// placement over a neck must not cut off a pocket the remaining pieces cannot fill, R9: two cells that only
// the same two pieces reach need both pieces); only when nothing helps does the search guess, on the column
// with the fewest live rows.
// The result describes the path to the first solution (forced placements, the width of every guess), the
// number of solutions up to a limit, and which cap stopped the search: three independent statuses.
//
// Pure: no DOM, clock, storage or randomness. Work is counted in deterministic units, so the node cap, the
// work cap and the memory bound are the only limits. The state lives in `deduce.*` slots of the model's
// workspace; one table (`slotTable`) drives both the memory precheck and the allocation. The model stays
// live. The rules plug into `ladder` in ladder order.

import { DEDUCE } from './policy.js';
import { assertLive, ModelError } from './tiling.js';

/** @typedef {import('./tiling.js').Model} Model */

/**
 * Exactly the six fields of `DEDUCE`.
 * @typedef {object} DeductionLimits
 * @property {number} lookaheadWidth Integer >= 0; the R6 lookahead width (0 turns R6 off).
 * @property {number} nodes Integer >= 0 or Infinity; node cap.
 * @property {number} solutions Integer >= 2; the count stops at this many solutions.
 * @property {number} work Integer >= 0 or Infinity; work cap (deterministic work units).
 * @property {number} census Integer >= 0 or Infinity; census work budget (used from MP05).
 * @property {number} memoryBytes Integer >= 0 or Infinity; bytes of all deduce.* slots.
 */

/**
 * Test and probe diagnostics; production callers pass nothing.
 * @typedef {object} DeductionDiagnostics
 * @property {boolean} [verifyUndo] Check after every undo that the state equals the state at the matching mark.
 */

/** @typedef {{ R1: number, R2: number, R3: number, R4: number, R5: number, R6: number, R7: number, R8: number, R9: number }} RuleCounts */
/** @typedef {{ c: number, kLow: number, f: number, u: number }} CensusNode One per final-path guess node (from MP05). */

/**
 * @typedef {object} FirstPath
 * @property {number} F Placements by R1, R2 and R3 on the final path.
 * @property {number} E Rows killed by R6 on the final path.
 * @property {RuleCounts} rules Final-path counts: placements for R1-R3, killed rows for R4-R9.
 * @property {0 | 1 | 2 | 3} deductionTier Highest tier of a rule with a nonzero count; 0 when none.
 * @property {number} G Guess nodes on the final path.
 * @property {number} info Sum of log2(c) over the final-path guess nodes, in path order; 0 when G = 0.
 * @property {number} Cmax Largest c; 0 when G = 0.
 * @property {number} Dmax Rows selected on the path before the deepest guess node; 0 when G = 0.
 * @property {number[]} choices c of each final-path guess node, root first.
 * @property {number[]} rows Selected rows of the first solution in selection order (clues are not rows).
 * @property {CensusNode[]} census Empty until MP05.
 */

/**
 * @typedef {object} DeductionResult
 * @property {'complete' | 'capped' | 'none'} path
 * @property {FirstPath | null} first Non-null iff path === 'complete'.
 * @property {{ Gt: number, nodes: number, work: number,
 *   stop: 'exhausted' | 'solution-limit' | 'node-cap' | 'work-cap' }} search
 * @property {{ S: number, limit: number, exhausted: boolean,
 *   solutions: 'unique' | 'few' | 'many' | 'unknown' | 'none' }} count
 * @property {null} census Until MP05 (then `{ complete, undecided, nodes, work }`).
 */

/** @typedef {'exhausted' | 'solution-limit' | 'node-cap' | 'work-cap'} StopReason */

/** @typedef {{ live: number[], colCount: number[], covered: number[], picked: number, trail: number }} StateCopy */

/**
 * The `deduce.*` slots as views, under their short names.
 * @typedef {object} Slots
 * @property {Int32Array} colStart CSR transpose: start of each column's rows.
 * @property {Int32Array} colRows CSR transpose: rows of each column, ascending.
 * @property {Int32Array} colCount Live rows of each column.
 * @property {Uint8Array} live 1 while the row is eligible.
 * @property {Uint8Array} covered 1 once the column is covered.
 * @property {Int32Array} trail Killed rows `r` and covered columns `-(c + 1)`.
 * @property {Int32Array} alt Alternatives of the guess nodes of the current path.
 * @property {Int32Array} altBase Start of each depth's alternatives in `alt`.
 * @property {Int32Array} picked Rows selected on the current path, in order.
 * @property {Int32Array} guessC c of each guess node of the current path.
 * @property {Int32Array} guessPlaced `picked` length at each guess node of the current path.
 * @property {Int32Array} cellIndex Board index of each cell column.
 * @property {Int32Array} queue Breadth-first queue of the pocket check.
 * @property {Int32Array} seen Visit stamps of the pocket check.
 * @property {Uint8Array} reach Knapsack bits of the pocket check: 1 = one remaining piece, 2 = a sum of several.
 * @property {Int32Array} compFirst Lowest cell column of each pocket of the last R3 check.
 * @property {Int32Array} compSize Size of each pocket of the last R3 check.
 * @property {Int32Array} mark R4 counters of live rows per cell column; zero between two R4 pieces.
 * @property {Int32Array} rowImb Colour imbalance of each row: dark cells minus light cells (R7).
 * @property {Int32Array} pieceK Absolute colour imbalance of each free piece's rows (R7).
 * @property {Int32Array} compOf Pocket of each uncovered cell column (R7, R8).
 * @property {Int32Array} compImb Colour imbalance of each pocket (R7).
 * @property {Int32Array} candPiece Candidate pieces of the current pocket (R7).
 * @property {Uint8Array} candOpts Option bits of each candidate: 1 = +pieceK, 2 = -pieceK; 4 and 8 mark the
 *   options to kill (R7).
 * @property {Uint8Array} parity The two grids of the exact programme of R7.
 * @property {Int32Array} disc Discovery numbers of the articulation search (R8).
 * @property {Int32Array} low Low-link numbers of the articulation search (R8).
 * @property {Int32Array} dfsStack Stack of the articulation search; queue of the trial floods (R8).
 * @property {Uint8Array} dfsNext Next neighbour direction of each cell on the stack, 0 to 4 (R8).
 * @property {Uint8Array} isArt 1 for an articulation cell of its pocket (R8).
 * @property {Uint8Array} reachMinus Knapsack bits without one piece, one row per distinct piece size (R8).
 * @property {Int32Array} minusRow Row of `reachMinus` of each piece, -1 while not computed (R8).
 * @property {Int32Array} sup1 Smaller supporting piece of a cell with exactly two, else -1 (R9).
 * @property {Int32Array} sup2 Larger supporting piece of a cell with exactly two (R9).
 * @property {Int32Array} pairCells The cells with exactly two supporting pieces, ascending (R9).
 */

const RULES = /** @type {const} */ (['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9']);
const RULE_COUNT = RULES.length;
const SLOT_PREFIX = 'deduce.';
const BYTES_PER_ELEMENT = { int32: 4, uint8: 1 };

// Outcomes of one rule step and of a ladder run.
const NONE = 0;
const APPLIED = 1;
const CONTRADICTION = 2;
const STOPPED = 3;

const CONTINUE = 0;
const STOP = 1;

// Options of an R7 candidate: the sign of a row's colour imbalance, and the same bits shifted by two for
// "kill the rows with this option".
const OPT_PLUS = 1;
const OPT_MINUS = 2;
const OPT_BOTH = 3;
const KILL_SHIFT = 2;

/**
 * Every `deduce.*` slot for a model of these sizes: name, element type, length. The memory precheck and the
 * allocation both read this table. On any path a row dies at most once and a column is covered at most once
 * (the trail holds at most R + C entries); the alternatives of nested guess nodes are pairwise disjoint
 * (`alt` holds at most R); every selected row covers a different piece column (depth and `picked` stay
 * below NP + 1). The grids of R7 hold at most floor(Tsz / 2) + 1 areas of 2 Tsz + 1 imbalances each, with Tsz
 * the area of all free pieces: a programme tracks the smaller of the two sides of a pocket and the pieces'
 * imbalances add up to at most Tsz.
 * @param {number} R Rows.
 * @param {number} C Columns.
 * @param {number} NZ Nonzeros.
 * @param {number} NP Free pieces.
 * @param {number} NC Free cells.
 * @param {number} Tsz Area of all free pieces.
 * @returns {[string, 'int32' | 'uint8', number][]}
 */
function slotTable(R, C, NZ, NP, NC, Tsz) {
  return [
    ['deduce.colStart', 'int32', C + 1],
    ['deduce.colRows', 'int32', NZ],
    ['deduce.colCount', 'int32', C],
    ['deduce.live', 'uint8', R],
    ['deduce.covered', 'uint8', C],
    ['deduce.trail', 'int32', R + C],
    ['deduce.alt', 'int32', R],
    ['deduce.altBase', 'int32', NP + 2],
    ['deduce.picked', 'int32', NP + 2],
    ['deduce.guessC', 'int32', NP + 2],
    ['deduce.guessPlaced', 'int32', NP + 2],
    ['deduce.cellIndex', 'int32', NC],
    ['deduce.queue', 'int32', NC],
    ['deduce.seen', 'int32', NC],
    ['deduce.reach', 'uint8', NC + 1],
    ['deduce.compFirst', 'int32', NC],
    ['deduce.compSize', 'int32', NC],
    ['deduce.mark', 'int32', NC],
    ['deduce.rowImb', 'int32', R],
    ['deduce.pieceK', 'int32', NP],
    ['deduce.compOf', 'int32', NC],
    ['deduce.compImb', 'int32', NC],
    ['deduce.candPiece', 'int32', NP],
    ['deduce.candOpts', 'uint8', NP],
    ['deduce.parity', 'uint8', 2 * (Math.floor(Tsz / 2) + 1) * (2 * Tsz + 1)],
    ['deduce.disc', 'int32', NC],
    ['deduce.low', 'int32', NC],
    ['deduce.dfsStack', 'int32', NC],
    ['deduce.dfsNext', 'uint8', NC],
    ['deduce.isArt', 'uint8', NC],
    ['deduce.reachMinus', 'uint8', NP * (NC + 1)],
    ['deduce.minusRow', 'int32', NP],
    ['deduce.sup1', 'int32', NC],
    ['deduce.sup2', 'int32', NC],
    ['deduce.pairCells', 'int32', NC],
  ];
}

/**
 * @param {DeductionLimits} limits
 */
function validateLimits(limits) {
  if (typeof limits !== 'object' || limits === null) {
    throw new RangeError('limits must be an object');
  }
  const fields = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (limits));
  /**
   * @param {string} name
   * @param {number} min
   * @param {boolean} infinite
   */
  const check = (name, min, infinite) => {
    const v = fields[name];
    const ok = typeof v === 'number' && (Number.isInteger(v) ? v >= min : infinite && v === Infinity);
    if (!ok) {
      const kind = infinite ? ' or Infinity' : '';
      throw new RangeError(`limits.${name} must be an integer >= ${min}${kind}, got ${String(v)}`);
    }
  };
  check('lookaheadWidth', 0, false);
  check('solutions', 2, false);
  for (const name of ['nodes', 'work', 'census', 'memoryBytes']) {
    check(name, 0, true);
  }
}

/**
 * @param {number} S
 * @param {number} limit
 * @param {boolean} exhausted
 * @returns {'unique' | 'few' | 'many' | 'unknown' | 'none'}
 */
function countStatus(S, limit, exhausted) {
  if (exhausted && S === 0) {
    return 'none';
  }
  if (exhausted && S === 1) {
    return 'unique';
  }
  if (S >= limit) {
    return 'many';
  }
  return S >= 2 ? 'few' : 'unknown';
}

/**
 * @param {Model} model A live model.
 * @param {DeductionLimits} [limits]
 * @param {DeductionDiagnostics} [diagnostics]
 * @returns {DeductionResult}
 */
export function measureDeduction(model, limits = DEDUCE, diagnostics = {}) {
  assertLive(model);
  validateLimits(limits);

  const R = model.rowCount;
  const C = model.columns;
  const NC = model.freeCells;
  const NP = model.freePieceCount;
  const rowCols = model.rowCols;
  const rowStart = model.rowStart;
  const NZ = rowStart[R];
  const { cellColumn, pieceSizes, rowPiece, width, height } = model;
  let Tsz = 0;
  for (let p = 0; p < NP; p += 1) {
    Tsz += pieceSizes[p];
  }

  const table = slotTable(R, C, NZ, NP, NC, Tsz);
  let bytes = 0;
  for (const [, kind, length] of table) {
    bytes += length * BYTES_PER_ELEMENT[kind];
  }
  if (bytes > limits.memoryBytes) {
    throw new ModelError('model-too-large', `deduction buffers need ${bytes} bytes, the limit is ${limits.memoryBytes}`,
      { bytes, limit: limits.memoryBytes });
  }
  const ws = model.cover.ws;
  /** @type {Record<string, Int32Array | Uint8Array>} */
  const views = {};
  for (const [name, kind, length] of table) {
    views[name.slice(SLOT_PREFIX.length)] = kind === 'uint8' ? ws.uint8(name, length) : ws.int32(name, length);
  }
  const {
    colStart, colRows, colCount, live, covered, trail, alt, altBase, picked, guessC, guessPlaced,
    cellIndex, queue, seen, reach, compFirst, compSize, mark: cellMark,
    rowImb, pieceK, compOf, compImb, candPiece, candOpts, parity, disc, low, dfsStack, dfsNext, isArt,
    reachMinus, minusRow, sup1, sup2, pairCells,
  } = /** @type {Slots} */ (/** @type {unknown} */ (views));
  // Reused slots hold unspecified data: everything read below is initialised first.

  let work = 0;
  let nodes = 0;
  let Gt = 0;
  let S = 0;
  let depth = 0;
  let trailLength = 0;
  let pickedLength = 0;
  /** @type {StopReason} */
  let stop = 'exhausted';
  /** @type {FirstPath | null} */
  let first = null;
  const rules = new Int32Array(RULE_COUNT);
  const savedRules = new Int32Array(RULE_COUNT * (NP + 2));

  // CSR transpose; `colCount` serves as the fill cursor and is overwritten below.
  colStart.fill(0);
  for (let k = 0; k < NZ; k += 1) {
    colStart[rowCols[k] + 1] += 1;
  }
  for (let c = 0; c < C; c += 1) {
    colStart[c + 1] += colStart[c];
  }
  colCount.set(colStart.subarray(0, C));
  for (let r = 0; r < R; r += 1) {
    for (let k = rowStart[r]; k < rowStart[r + 1]; k += 1) {
      colRows[colCount[rowCols[k]]++] = r;
    }
  }
  work += 2 * NZ;
  live.fill(1);
  covered.fill(0);
  for (let c = 0; c < C; c += 1) {
    colCount[c] = colStart[c + 1] - colStart[c];
  }
  work += R + C;
  for (let i = 0; i < width * height; i += 1) {
    if (cellColumn[i] >= 0) {
      cellIndex[cellColumn[i]] = i;
    }
  }
  work += width * height;
  seen.fill(0);
  cellMark.fill(0);
  work += 2 * NC;
  let stamp = 0;
  let compCount = 0;

  /**
   * Chessboard colour of a free cell column: +1 dark ((x + y) even), -1 light.
   * @param {number} c
   */
  function colour(c) {
    const i = cellIndex[c];
    const x = i % width;
    return ((x + (i - x) / width) & 1) === 0 ? 1 : -1;
  }

  // A placement's imbalance is +pieceK or -pieceK for every placement of a piece: turning and mirroring keep
  // the colouring of a shape and moving it by an odd step swaps the colours.
  for (let r = 0; r < R; r += 1) {
    const end = rowStart[r + 1] - 1;
    let imbalance = 0;
    for (let k = rowStart[r]; k < end; k += 1) {
      imbalance += colour(rowCols[k]);
    }
    rowImb[r] = imbalance;
  }
  work += NZ;
  for (let p = 0; p < NP; p += 1) {
    pieceK[p] = colStart[NC + p] < colStart[NC + p + 1] ? Math.abs(rowImb[colRows[colStart[NC + p]]]) : 0;
  }
  work += NP;

  /** @type {StateCopy[] | null} */
  const copies = diagnostics.verifyUndo === true ? [] : null;

  /** @returns {StateCopy} */
  const copyState = () => ({
    live: Array.from(live), colCount: Array.from(colCount), covered: Array.from(covered),
    picked: pickedLength, trail: trailLength,
  });

  /**
   * @param {number[]} x
   * @param {number[]} y
   */
  const sameArray = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);

  /**
   * @param {StateCopy} a
   * @param {StateCopy} b
   */
  const sameState = (a, b) => a.picked === b.picked && a.trail === b.trail
    && sameArray(a.live, b.live) && sameArray(a.colCount, b.colCount) && sameArray(a.covered, b.covered);

  /** @param {number} r */
  function kill(r) {
    live[r] = 0;
    const begin = rowStart[r];
    const end = rowStart[r + 1];
    for (let k = begin; k < end; k += 1) {
      colCount[rowCols[k]] -= 1;
    }
    work += end - begin;
    trail[trailLength++] = r;
  }

  /** @param {number} r */
  function select(r) {
    const begin = rowStart[r];
    const end = rowStart[r + 1];
    for (let k = begin; k < end; k += 1) {
      const c = rowCols[k];
      covered[c] = 1;
      trail[trailLength++] = -(c + 1);
    }
    work += end - begin;
    for (let k = begin; k < end; k += 1) {
      const c = rowCols[k];
      const from = colStart[c];
      const to = colStart[c + 1];
      for (let j = from; j < to; j += 1) {
        const r2 = colRows[j];
        if (live[r2] === 1) {
          kill(r2);
        }
      }
      work += to - from;
    }
    picked[pickedLength++] = r;
  }

  function mark() {
    if (copies !== null) {
      copies.push(copyState());
    }
    return { trail: trailLength, picked: pickedLength };
  }

  /** @param {{ trail: number, picked: number }} m */
  function undo(m) {
    while (trailLength > m.trail) {
      const x = trail[--trailLength];
      work += 1;
      if (x >= 0) {
        live[x] = 1;
        const begin = rowStart[x];
        const end = rowStart[x + 1];
        for (let k = begin; k < end; k += 1) {
          colCount[rowCols[k]] += 1;
        }
        work += end - begin;
      } else {
        covered[-x - 1] = 0;
      }
    }
    pickedLength = m.picked;
    if (copies !== null && !sameState(/** @type {StateCopy} */ (copies.pop()), copyState())) {
      throw new Error('deduce: undo mismatch');
    }
  }

  /**
   * The live row of a column that has exactly one.
   * @param {number} c
   */
  function liveRowOf(c) {
    const to = colStart[c + 1];
    for (let j = colStart[c]; j < to; j += 1) {
      work += 1;
      if (live[colRows[j]] === 1) {
        return colRows[j];
      }
    }
    throw new Error('deduce: column without a live row');
  }

  /**
   * First uncovered column in `from .. to - 1` with at most one live row: none, one (placed) or a contradiction.
   * @param {number} from
   * @param {number} to
   * @param {number} rule Index into the rule counters.
   * @param {boolean} counting
   */
  function forcedColumn(from, to, rule, counting) {
    for (let c = from; c < to; c += 1) {
      work += 1;
      if (covered[c] === 1) {
        continue;
      }
      if (colCount[c] === 0) {
        return CONTRADICTION;
      }
      if (colCount[c] === 1) {
        select(liveRowOf(c));
        if (counting) {
          rules[rule] += 1;
        }
        return APPLIED;
      }
    }
    return NONE;
  }

  /**
   * R1: a free cell with a single live placement.
   * @param {boolean} counting
   */
  const ruleR1 = (counting) => forcedColumn(0, NC, 0, counting);

  /**
   * R2: a piece with a single live placement.
   * @param {boolean} counting
   */
  const ruleR2 = (counting) => forcedColumn(NC, C, 1, counting);

  /**
   * Queues the uncovered cell column at board index `j`, if there is one that this check has not seen.
   * @param {number} j Board index.
   * @param {number} tail Queue length.
   * @returns {number} The new queue length.
   */
  function queueCell(j, tail) {
    const n = cellColumn[j];
    if (n >= 0 && covered[n] === 0 && seen[n] !== stamp) {
      seen[n] = stamp;
      queue[tail] = n;
      return tail + 1;
    }
    return tail;
  }

  /**
   * Knapsack over the uncovered pieces other than piece `skip` (-1 for none), 0/1: each piece used at most
   * once. For s = 0 .. `top`, `bits[base + s]` has bit 1 when one of the pieces has size s and bit 2 when
   * several of them add up to s; it is 0 when no sum of the pieces is s.
   * @param {Uint8Array} bits
   * @param {number} base
   * @param {number} top
   * @param {number} skip
   */
  function fillSums(bits, base, top, skip) {
    bits.fill(0, base, base + top + 1);
    work += top + 1;
    for (let p = 0; p < NP; p += 1) {
      if (covered[NC + p] === 1 || p === skip) {
        continue;
      }
      const w = pieceSizes[p];
      if (top >= w) {
        work += top - w + 1;
      }
      for (let s = top; s >= w; s -= 1) {
        if (bits[base + s - w] !== 0) {
          bits[base + s] |= 2;
        }
        if (s === w) {
          bits[base + s] |= 1;
        }
      }
    }
  }

  /**
   * R3 check: a pocket is a 4-connected set of uncovered free cells. Pieces are connected, so every remaining
   * piece lies in one pocket and a pocket is filled by whole pieces: its size must be the sum of some of the
   * remaining piece sizes (`reach` holds the sums, 0/1 knapsack over the piece columns). Any other size is a
   * contradiction. A failed check is never counted. The pockets of a passed check are kept for R3 place, in
   * ascending order of their lowest cell column (`compFirst`, `compSize`, `compCount`).
   * @returns {number} NONE or CONTRADICTION.
   */
  function ruleR3() {
    compCount = 0;
    let total = 0;
    for (let p = 0; p < NP; p += 1) {
      if (covered[NC + p] === 0) {
        total += pieceSizes[p];
      }
    }
    const top = Math.min(total, NC);
    fillSums(reach, 0, top, -1);
    stamp += 1;
    for (let c0 = 0; c0 < NC; c0 += 1) {
      if (covered[c0] === 1 || seen[c0] === stamp) {
        continue;
      }
      seen[c0] = stamp;
      queue[0] = c0;
      let tail = 1;
      for (let head = 0; head < tail; head += 1) {
        work += 1;
        const i = cellIndex[queue[head]];
        const x = i % width;
        const y = (i - x) / width;
        if (x > 0) {
          tail = queueCell(i - 1, tail);
        }
        if (x + 1 < width) {
          tail = queueCell(i + 1, tail);
        }
        if (y > 0) {
          tail = queueCell(i - width, tail);
        }
        if (y + 1 < height) {
          tail = queueCell(i + width, tail);
        }
      }
      if (tail > top || reach[tail] === 0) {
        return CONTRADICTION;
      }
      compFirst[compCount] = c0;
      compSize[compCount] = tail;
      compCount += 1;
    }
    return NONE;
  }

  /**
   * R3 place: after a passed check, a pocket whose size is the size of exactly one remaining piece (`reach`
   * bit 1 only: no sum of several pieces) is filled by that piece. The piece's placement covers the pocket's
   * first cell and has as many cells as the pocket, so it is the live row over that cell of that size, when
   * exactly one exists; with none the position is dead and another rule or the search proves it. Only the
   * ladder runs it, right after the check, on the pockets the check has just kept.
   * @param {boolean} counting
   * @returns {number} NONE or APPLIED (a piece placed).
   */
  function ruleR3Place(counting) {
    for (let i = 0; i < compCount; i += 1) {
      const size = compSize[i];
      if (reach[size] !== 1) {
        continue;
      }
      const c0 = compFirst[i];
      let n = 0;
      let found = -1;
      const to = colStart[c0 + 1];
      for (let k = colStart[c0]; k < to; k += 1) {
        work += 1;
        const r = colRows[k];
        if (live[r] === 1 && rowStart[r + 1] - rowStart[r] - 1 === size) {
          n += 1;
          found = r;
        }
      }
      if (n === 1) {
        select(found);
        if (counting) {
          rules[2] += 1;
        }
        return APPLIED;
      }
    }
    return NONE;
  }

  /**
   * R4, a piece claims cells: a cell that every live row of an uncovered piece covers will be covered by that
   * piece, so the live rows of the other pieces on the cell are killed. In ascending piece order, the first
   * piece with a kill ends the application. `mark` counts, per cell column, the live rows of the piece that
   * cover it; the cells common to all of them are those of the piece's first live row with a count equal to
   * the number of its live rows. The kills touch other pieces only, so the piece's own rows and the reset of
   * `mark` are unchanged by them.
   * @param {boolean} counting
   * @returns {number} NONE or APPLIED (rows killed).
   */
  function ruleR4(counting) {
    for (let p = 0; p < NP; p += 1) {
      const pc = NC + p;
      if (covered[pc] === 1) {
        continue;
      }
      let nLive = 0;
      let first = -1;
      const to = colStart[pc + 1];
      for (let k = colStart[pc]; k < to; k += 1) {
        work += 1;
        const r = colRows[k];
        if (live[r] === 0) {
          continue;
        }
        nLive += 1;
        if (first === -1) {
          first = r;
        }
        const end = rowStart[r + 1] - 1;
        for (let j = rowStart[r]; j < end; j += 1) {
          cellMark[rowCols[j]] += 1;
          work += 1;
        }
      }
      let killed = 0;
      if (nLive > 0) {
        const end = rowStart[first + 1] - 1;
        for (let j = rowStart[first]; j < end; j += 1) {
          work += 1;
          const c = rowCols[j];
          if (cellMark[c] !== nLive) {
            continue;
          }
          const cellTo = colStart[c + 1];
          for (let k = colStart[c]; k < cellTo; k += 1) {
            work += 1;
            const r2 = colRows[k];
            if (live[r2] === 1 && rowPiece[r2] !== p) {
              kill(r2);
              killed += 1;
            }
          }
        }
      }
      for (let k = colStart[pc]; k < to; k += 1) {
        const r = colRows[k];
        if (live[r] === 0) {
          continue;
        }
        const end = rowStart[r + 1] - 1;
        for (let j = rowStart[r]; j < end; j += 1) {
          cellMark[rowCols[j]] = 0;
          work += 1;
        }
      }
      if (killed > 0) {
        if (counting) {
          rules[3] += killed;
        }
        return APPLIED;
      }
    }
    return NONE;
  }

  /**
   * R5, a cell claims a piece: when every live row over an uncovered cell belongs to one piece, that piece
   * covers the cell, so its live rows that miss the cell are killed. In ascending cell order, the first cell
   * with a kill ends the application.
   * @param {boolean} counting
   * @returns {number} NONE or APPLIED (rows killed).
   */
  function ruleR5(counting) {
    for (let c = 0; c < NC; c += 1) {
      if (covered[c] === 1) {
        continue;
      }
      let P = -1;
      let one = true;
      const to = colStart[c + 1];
      for (let k = colStart[c]; k < to; k += 1) {
        work += 1;
        const r = colRows[k];
        if (live[r] === 0) {
          continue;
        }
        if (P === -1) {
          P = rowPiece[r];
        } else if (rowPiece[r] !== P) {
          one = false;
          break;
        }
      }
      if (!one || P === -1) {
        continue;
      }
      let killed = 0;
      const pieceTo = colStart[NC + P + 1];
      for (let k = colStart[NC + P]; k < pieceTo; k += 1) {
        work += 1;
        const r = colRows[k];
        if (live[r] === 0) {
          continue;
        }
        let covers = false;
        const end = rowStart[r + 1] - 1;
        for (let j = rowStart[r]; j < end && !covers; j += 1) {
          work += 1;
          covers = rowCols[j] === c;
        }
        if (!covers) {
          kill(r);
          killed += 1;
        }
      }
      if (killed > 0) {
        if (counting) {
          rules[4] += killed;
        }
        return APPLIED;
      }
    }
    return NONE;
  }

  /**
   * The cheap ladder of a lookahead trial: R1, R2 and the R3 check, never R3 place, R4-R9 or R6, never counted.
   * The work cap is checked at every pass; a closure that stops proves nothing.
   * @returns {number} NONE (fixpoint), CONTRADICTION or STOPPED (work cap).
   */
  function closure() {
    for (;;) {
      if (work > limits.work) {
        stop = 'work-cap';
        return STOPPED;
      }
      let step = ruleR1(false);
      if (step === NONE) {
        step = ruleR2(false);
      }
      if (step === NONE) {
        step = ruleR3();
      }
      if (step !== APPLIED) {
        return step;
      }
    }
  }

  /**
   * R6 lookahead: in the first uncovered column (cells, then pieces) with at most `lookaheadWidth` live rows
   * where some placement ends in a contradiction under the closure, kill those rows. A killed row stays killed
   * for the rest of the column, so later trials of the column see the reduced state.
   * @param {boolean} counting
   * @returns {number} NONE, APPLIED (rows killed) or STOPPED (work cap).
   */
  function ruleR6(counting) {
    for (let c = 0; c < C; c += 1) {
      if (covered[c] === 1 || colCount[c] > limits.lookaheadWidth) {
        continue;
      }
      let killed = 0;
      const to = colStart[c + 1];
      for (let k = colStart[c]; k < to; k += 1) {
        work += 1;
        const r = colRows[k];
        if (live[r] === 0) {
          continue;
        }
        work += 1;
        const m = mark();
        select(r);
        const out = closure();
        undo(m);
        if (out === STOPPED) {
          return STOPPED;
        }
        if (out === CONTRADICTION) {
          kill(r);
          killed += 1;
        }
      }
      if (killed > 0) {
        if (counting) {
          rules[5] += killed;
        }
        return APPLIED;
      }
    }
    return NONE;
  }

  /**
   * The uncovered cell next to cell column `c` in direction `dir` (0 left, 1 right, 2 up, 3 down), or -1.
   * @param {number} c
   * @param {number} dir
   */
  function neighbourCell(c, dir) {
    const i = cellIndex[c];
    let j = -1;
    if (dir === 0) {
      j = i % width > 0 ? i - 1 : -1;
    } else if (dir === 1) {
      j = i % width + 1 < width ? i + 1 : -1;
    } else if (dir === 2) {
      j = i >= width ? i - width : -1;
    } else {
      j = i + width < width * height ? i + width : -1;
    }
    if (j < 0) {
      return -1;
    }
    const n = cellColumn[j];
    return n >= 0 && covered[n] === 0 ? n : -1;
  }

  /**
   * Labels the pockets (the 4-connected sets of uncovered free cells) in ascending order of their lowest cell
   * column: `compOf` of every uncovered cell, `compFirst`, `compSize` and the colour imbalance `compImb`. The
   * cells of the pockets are listed one pocket after the other in `queue`, each in breadth-first order.
   * @returns {number} The number of pockets.
   */
  function labelPockets() {
    stamp += 1;
    let tail = 0;
    let pockets = 0;
    for (let c0 = 0; c0 < NC; c0 += 1) {
      if (covered[c0] === 1 || seen[c0] === stamp) {
        continue;
      }
      const begin = tail;
      let imbalance = 0;
      seen[c0] = stamp;
      queue[tail] = c0;
      tail += 1;
      for (let head = begin; head < tail; head += 1) {
        const c = queue[head];
        compOf[c] = pockets;
        imbalance += colour(c);
        for (let dir = 0; dir < 4; dir += 1) {
          const v = neighbourCell(c, dir);
          if (v >= 0 && seen[v] !== stamp) {
            seen[v] = stamp;
            queue[tail] = v;
            tail += 1;
          }
        }
      }
      work += tail - begin;
      compFirst[pockets] = c0;
      compSize[pockets] = tail - begin;
      compImb[pockets] = imbalance;
      pockets += 1;
    }
    return pockets;
  }

  /**
   * The candidates of a pocket: the uncovered pieces with a live row inside it (a live row is connected and
   * uncovered, so its first cell decides), with the colour imbalances of those rows as option bits.
   * @param {number} pocket
   * @returns {number} The number of candidates in `candPiece` and `candOpts`, ascending by piece.
   */
  function gather(pocket) {
    let n = 0;
    for (let p = 0; p < NP; p += 1) {
      if (covered[NC + p] === 1) {
        continue;
      }
      const from = colStart[NC + p];
      const to = colStart[NC + p + 1];
      let options = 0;
      for (let k = from; k < to; k += 1) {
        const r = colRows[k];
        if (live[r] === 1 && compOf[rowCols[rowStart[r]]] === pocket) {
          options |= rowImb[r] >= 0 ? OPT_PLUS : OPT_MINUS;
        }
      }
      work += to - from;
      if (options !== 0) {
        candPiece[n] = p;
        candOpts[n] = options;
        n += 1;
      }
    }
    return n;
  }

  /**
   * Whether some of the candidates other than `skip`, each used at most once with one of its options, have
   * the area `tArea` and the colour imbalance `tImb` together: an exact dynamic programme over the pieces.
   * It tracks the area placed inside when that is the smaller side and the area left outside otherwise, so
   * the area dimension is at most min(tArea, slack); `d` stands for the imbalance `d - K`.
   * @param {number} n Candidates gathered.
   * @param {number} skip Candidate index left out, or -1.
   * @param {number} tArea
   * @param {number} tImb
   */
  function reachable(n, skip, tArea, tImb) {
    let area = 0;
    let spread = 0;
    for (let j = 0; j < n; j += 1) {
      if (j !== skip) {
        area += pieceSizes[candPiece[j]];
        spread += pieceK[candPiece[j]];
      }
    }
    work += n;
    if (tArea < 0 || tArea > area || Math.abs(tImb) > spread) {
      return false;
    }
    const slack = area - tArea;
    const included = tArea <= slack;
    const limit = included ? tArea : slack;
    const W = 2 * spread + 1;
    const size = (limit + 1) * W;
    let cur = 0;
    let next = parity.length / 2;
    parity.fill(0, cur, cur + size);
    parity[cur + spread] = 1;
    work += size;
    for (let j = 0; j < n; j += 1) {
      if (j === skip) {
        continue;
      }
      const s = pieceSizes[candPiece[j]];
      const k = pieceK[candPiece[j]];
      const options = candOpts[j] & OPT_BOTH;
      parity.fill(0, next, next + size);
      work += size;
      for (let a = 0; a <= limit; a += 1) {
        for (let d = 0; d < W; d += 1) {
          if (parity[cur + a * W + d] === 0) {
            continue;
          }
          // The piece goes elsewhere (included: nothing changes; excluded: its area is left outside) or
          // inside the pocket with one of its options (included: its area is placed; excluded: nothing).
          let inside = a;
          if (included) {
            parity[next + a * W + d] = 1;
            inside = a + s;
          } else if (a + s <= limit) {
            parity[next + (a + s) * W + d] = 1;
          }
          if (inside <= limit) {
            if ((options & OPT_PLUS) !== 0) {
              parity[next + inside * W + d + k] = 1;
            }
            if ((options & OPT_MINUS) !== 0) {
              parity[next + inside * W + d - k] = 1;
            }
          }
        }
      }
      const swap = cur;
      cur = next;
      next = swap;
    }
    return parity[cur + limit * W + spread + tImb] === 1;
  }

  /**
   * R7, parity: colour the board like a chessboard. A pocket is filled by whole pieces lying inside it, so
   * its area and its colour imbalance are sums over the pieces that have a live row inside it (the
   * candidates), each used once with the imbalance of one of its live rows there. A pocket that no choice
   * of candidates can fill is a contradiction (not counted). Otherwise a live row is killed when its piece
   * with its imbalance leaves a pocket that the other candidates cannot fill; the first pocket with a kill
   * ends the application. Every check of a pocket uses the candidates gathered before its kills. A check
   * that starts after the work cap is exceeded proves nothing: the application changes nothing and the next
   * ladder pass stops the measurement.
   * @param {boolean} counting
   * @returns {number} NONE, APPLIED (rows killed) or CONTRADICTION.
   */
  function ruleR7(counting) {
    const pockets = labelPockets();
    for (let i = 0; i < pockets; i += 1) {
      const n = gather(i);
      if (work > limits.work) {
        return NONE;
      }
      if (!reachable(n, -1, compSize[i], compImb[i])) {
        return CONTRADICTION;
      }
    }
    for (let i = 0; i < pockets; i += 1) {
      const n = gather(i);
      let area = 0;
      for (let j = 0; j < n; j += 1) {
        area += pieceSizes[candPiece[j]];
      }
      work += n;
      const slack = area - compSize[i];
      let marked = false;
      for (let j = 0; j < n; j += 1) {
        const p = candPiece[j];
        const options = candOpts[j];
        if (slack === 0 && (options === OPT_PLUS || options === OPT_MINUS)) {
          continue;
        }
        for (let option = OPT_PLUS; option <= OPT_MINUS; option += 1) {
          if ((options & option) === 0) {
            continue;
          }
          if (work > limits.work) {
            return NONE;
          }
          const imbalance = option === OPT_PLUS ? pieceK[p] : -pieceK[p];
          if (!reachable(n, j, compSize[i] - pieceSizes[p], compImb[i] - imbalance)) {
            candOpts[j] |= option << KILL_SHIFT;
            marked = true;
          }
        }
      }
      if (!marked) {
        continue;
      }
      let killed = 0;
      for (let j = 0; j < n; j += 1) {
        const doomed = candOpts[j] >> KILL_SHIFT;
        if (doomed === 0) {
          continue;
        }
        const from = colStart[NC + candPiece[j]];
        const to = colStart[NC + candPiece[j] + 1];
        for (let k = from; k < to; k += 1) {
          const r = colRows[k];
          if (live[r] === 1 && compOf[rowCols[rowStart[r]]] === i
            && (doomed & (rowImb[r] >= 0 ? OPT_PLUS : OPT_MINUS)) !== 0) {
            kill(r);
            killed += 1;
          }
        }
        work += to - from;
      }
      if (killed > 0) {
        if (counting) {
          rules[6] += killed;
        }
        return APPLIED;
      }
    }
    return NONE;
  }

  /**
   * Marks in `isArt` the articulation cells of the pockets: the cells whose removal splits their pocket.
   * Iterative depth-first low-link search; `dfsStack` is the path and `dfsNext` the next direction to examine
   * on each cell of it. A cell that is not the root is one when a child's low-link is not below its own
   * number; a root is one when it has two children.
   * @param {number} pockets
   */
  function findNecks(pockets) {
    disc.fill(0);
    isArt.fill(0);
    work += 2 * NC;
    let clock = 0;
    for (let i = 0; i < pockets; i += 1) {
      const root = compFirst[i];
      let rootChildren = 0;
      clock += 1;
      disc[root] = clock;
      low[root] = clock;
      dfsNext[root] = 0;
      dfsStack[0] = root;
      let top = 1;
      work += 1;
      while (top > 0) {
        const c = dfsStack[top - 1];
        if (dfsNext[c] < 4) {
          const v = neighbourCell(c, dfsNext[c]);
          dfsNext[c] += 1;
          work += 1;
          if (v < 0) {
            continue;
          }
          if (disc[v] === 0) {
            clock += 1;
            disc[v] = clock;
            low[v] = clock;
            dfsNext[v] = 0;
            dfsStack[top] = v;
            top += 1;
            work += 1;
          } else if (top < 2 || v !== dfsStack[top - 2]) {
            low[c] = Math.min(low[c], disc[v]);
          }
          continue;
        }
        top -= 1;
        if (top > 0) {
          const parent = dfsStack[top - 1];
          low[parent] = Math.min(low[parent], low[c]);
          if (top === 1) {
            rootChildren += 1;
          } else if (low[c] >= disc[parent]) {
            isArt[parent] = 1;
          }
        }
      }
      if (rootChildren >= 2) {
        isArt[root] = 1;
      }
    }
  }

  /**
   * R8, neck: a live row over an articulation cell with more than `lookaheadWidth` live rows is impossible
   * when removing its cells leaves a pocket that the other remaining pieces cannot fill (the R3 check with the
   * row's piece taken out; the pockets other than the neck's are checked the same way, as the piece is no
   * longer there to fill them). The trial does not select the row. The sums without a piece are computed once
   * per distinct piece size (`reachMinus`, `minusRow`). The first articulation cell with a kill ends the
   * application. A cell left without live rows is found by R1 at the next pass.
   * @param {boolean} counting
   * @returns {number} NONE or APPLIED (rows killed).
   */
  function ruleR8(counting) {
    const pockets = labelPockets();
    findNecks(pockets);
    let total = 0;
    for (let p = 0; p < NP; p += 1) {
      if (covered[NC + p] === 0) {
        total += pieceSizes[p];
      }
    }
    minusRow.fill(-1);
    work += NP;
    let sumRows = 0;
    for (let a = 0; a < NC; a += 1) {
      if (covered[a] === 1 || isArt[a] === 0 || colCount[a] <= limits.lookaheadWidth) {
        continue;
      }
      const pocket = compOf[a];
      let begin = 0;
      for (let i = 0; i < pocket; i += 1) {
        begin += compSize[i];
      }
      const end = begin + compSize[pocket];
      let killed = 0;
      const to = colStart[a + 1];
      for (let k = colStart[a]; k < to; k += 1) {
        work += 1;
        const r = colRows[k];
        if (live[r] === 0) {
          continue;
        }
        work += 1;
        const p = rowPiece[r];
        const top = Math.min(total - pieceSizes[p], NC);
        let sums = minusRow[p];
        if (sums < 0) {
          work += NP;
          for (let q = 0; q < NP && sums < 0; q += 1) {
            sums = minusRow[q] >= 0 && pieceSizes[q] === pieceSizes[p] ? minusRow[q] : -1;
          }
          if (sums < 0) {
            sums = sumRows;
            sumRows += 1;
            fillSums(reachMinus, sums * (NC + 1), top, p);
          }
          minusRow[p] = sums;
        }
        const base = sums * (NC + 1);
        let bad = false;
        for (let i = 0; i < pockets && !bad; i += 1) {
          bad = i !== pocket && (compSize[i] > top || reachMinus[base + compSize[i]] === 0);
        }
        work += pockets;
        if (!bad) {
          stamp += 1;
          const rowEnd = rowStart[r + 1] - 1;
          for (let j = rowStart[r]; j < rowEnd; j += 1) {
            seen[rowCols[j]] = stamp;
          }
          work += rowEnd - rowStart[r];
          for (let q = begin; q < end && !bad; q += 1) {
            const c0 = queue[q];
            if (seen[c0] === stamp) {
              continue;
            }
            seen[c0] = stamp;
            dfsStack[0] = c0;
            let tail = 1;
            for (let head = 0; head < tail; head += 1) {
              work += 1;
              for (let dir = 0; dir < 4; dir += 1) {
                const v = neighbourCell(dfsStack[head], dir);
                if (v >= 0 && seen[v] !== stamp) {
                  seen[v] = stamp;
                  dfsStack[tail] = v;
                  tail += 1;
                }
              }
            }
            bad = tail > top || reachMinus[base + tail] === 0;
          }
        }
        if (bad) {
          kill(r);
          killed += 1;
        }
      }
      if (killed > 0) {
        if (counting) {
          rules[7] += killed;
        }
        return APPLIED;
      }
    }
    return NONE;
  }

  /**
   * R9, pair exclusion: two uncovered cells that exactly the same two pieces can cover (by their live rows)
   * and that no single live row covers must be covered by one piece each, so the live rows of those two
   * pieces that cover neither cell are killed. The cells with exactly two supporting pieces are listed in
   * ascending order; the first pair (a, b) with a kill ends the application.
   * @param {boolean} counting
   * @returns {number} NONE or APPLIED (rows killed).
   */
  function ruleR9(counting) {
    let listed = 0;
    for (let c = 0; c < NC; c += 1) {
      sup1[c] = -1;
      if (covered[c] === 1) {
        continue;
      }
      let one = -1;
      let two = -1;
      let more = false;
      const to = colStart[c + 1];
      for (let k = colStart[c]; k < to && !more; k += 1) {
        work += 1;
        const r = colRows[k];
        if (live[r] === 0) {
          continue;
        }
        const p = rowPiece[r];
        if (one === -1) {
          one = p;
        } else if (p !== one && two === -1) {
          two = p;
        } else if (p !== one && p !== two) {
          more = true;
        }
      }
      if (two !== -1 && !more) {
        sup1[c] = Math.min(one, two);
        sup2[c] = Math.max(one, two);
        pairCells[listed] = c;
        listed += 1;
      }
    }
    for (let x = 0; x < listed; x += 1) {
      const a = pairCells[x];
      for (let y = x + 1; y < listed; y += 1) {
        work += 1;
        const b = pairCells[y];
        if (sup1[b] !== sup1[a] || sup2[b] !== sup2[a] || coversBoth(a, b)) {
          continue;
        }
        let killed = 0;
        for (let side = 0; side < 2; side += 1) {
          const pc = NC + (side === 0 ? sup1[a] : sup2[a]);
          const to = colStart[pc + 1];
          for (let k = colStart[pc]; k < to; k += 1) {
            const r = colRows[k];
            if (live[r] === 0) {
              continue;
            }
            let touches = false;
            const end = rowStart[r + 1] - 1;
            for (let j = rowStart[r]; j < end && !touches; j += 1) {
              work += 1;
              touches = rowCols[j] === a || rowCols[j] === b;
            }
            if (!touches) {
              kill(r);
              killed += 1;
            }
          }
        }
        if (killed > 0) {
          if (counting) {
            rules[8] += killed;
          }
          return APPLIED;
        }
      }
    }
    return NONE;
  }

  /**
   * Whether a live row over cell column `a` also covers cell column `b`.
   * @param {number} a
   * @param {number} b
   */
  function coversBoth(a, b) {
    const to = colStart[a + 1];
    for (let k = colStart[a]; k < to; k += 1) {
      work += 1;
      const r = colRows[k];
      if (live[r] === 0) {
        continue;
      }
      const end = rowStart[r + 1] - 1;
      for (let j = rowStart[r]; j < end; j += 1) {
        work += 1;
        if (rowCols[j] === b) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Applies the rules in ladder order until none changes the state: the first rule that does ends the pass and
   * the ladder restarts at R1. Order: R1, R2, the R3 check (a contradiction ends the node), R3 place, R4, R5,
   * R6, R7 (also a contradiction), R8, R9.
   * @param {boolean} counting Whether the applications are added to the rule counters.
   * @returns {number} NONE (fixpoint), CONTRADICTION or STOPPED (work cap).
   */
  function ladder(counting) {
    for (;;) {
      if (work > limits.work) {
        stop = 'work-cap';
        return STOPPED;
      }
      let step = ruleR1(counting);
      if (step === NONE) {
        step = ruleR2(counting);
      }
      if (step === NONE) {
        step = ruleR3();
        if (step === NONE) {
          step = ruleR3Place(counting);
        }
      }
      if (step === NONE) {
        step = ruleR4(counting);
      }
      if (step === NONE) {
        step = ruleR5(counting);
      }
      if (step === NONE) {
        step = ruleR6(counting);
      }
      if (step === NONE) {
        step = ruleR7(counting);
      }
      if (step === NONE) {
        step = ruleR8(counting);
      }
      if (step === NONE) {
        step = ruleR9(counting);
      }
      if (step === APPLIED) {
        continue;
      }
      return step;
    }
  }

  /** @returns {FirstPath} */
  function snapshot() {
    const counts = /** @type {RuleCounts} */ (Object.fromEntries(RULES.map((key, i) => [key, rules[i]])));
    const choices = Array.from(guessC.subarray(0, depth));
    const tier = counts.R7 + counts.R8 + counts.R9 > 0 ? 3 : counts.R4 + counts.R5 + counts.R6 > 0 ? 2
      : counts.R1 + counts.R2 + counts.R3 > 0 ? 1 : 0;
    return {
      F: counts.R1 + counts.R2 + counts.R3,
      E: counts.R6,
      rules: counts,
      deductionTier: tier,
      G: depth,
      info: choices.reduce((sum, c) => sum + Math.log2(c), 0),
      Cmax: choices.reduce((max, c) => Math.max(max, c), 0),
      Dmax: depth === 0 ? 0 : guessPlaced[depth - 1],
      choices,
      rows: Array.from(picked.subarray(0, pickedLength)),
      census: [],
    };
  }

  /** A node at a fixpoint: a solution, or a guess on the column with the fewest live rows. */
  function branch() {
    let best = -1;
    let bestCount = Infinity;
    for (let c = 0; c < C; c += 1) {
      work += 1;
      if (covered[c] === 0 && colCount[c] < bestCount) {
        best = c;
        bestCount = colCount[c];
      }
    }
    if (best === -1) {
      S += 1;
      if (S === 1) {
        first = snapshot();
      }
      if (S >= limits.solutions) {
        stop = 'solution-limit';
        return STOP;
      }
      return CONTINUE;
    }
    Gt += 1;
    const base = altBase[depth];
    let end = base;
    const to = colStart[best + 1];
    for (let j = colStart[best]; j < to; j += 1) {
      work += 1;
      if (live[colRows[j]] === 1) {
        alt[end++] = colRows[j];
      }
    }
    guessC[depth] = bestCount;
    guessPlaced[depth] = pickedLength;
    altBase[depth + 1] = end;
    depth += 1;
    let out = CONTINUE;
    for (let i = base; i < end; i += 1) {
      if (nodes === limits.nodes) {
        stop = 'node-cap';
        out = STOP;
        break;
      }
      nodes += 1;
      if (work > limits.work) {
        stop = 'work-cap';
        out = STOP;
        break;
      }
      const m = mark();
      select(alt[i]);
      const child = search();
      undo(m);
      if (child === STOP) {
        out = STOP;
        break;
      }
    }
    depth -= 1;
    return out;
  }

  /**
   * One node, already counted. Counters, state and depth are restored on return, so at a solution the rule
   * counters hold exactly the counts of the path from the root.
   * @returns {number} STOP or CONTINUE.
   */
  function search() {
    const m = mark();
    const at = depth * RULE_COUNT;
    savedRules.set(rules, at);
    const res = ladder(true);
    let out = STOP;
    if (res === NONE) {
      out = branch();
    } else if (res === CONTRADICTION) {
      out = CONTINUE;
    }
    undo(m);
    rules.set(savedRules.subarray(at, at + RULE_COUNT));
    return out;
  }

  const afterSetup = copies === null ? null : copyState();

  function result() {
    const exhausted = stop === 'exhausted';
    const path = S >= 1 ? 'complete' : stop === 'node-cap' || stop === 'work-cap' ? 'capped' : 'none';
    return /** @type {DeductionResult} */ ({
      path,
      first: path === 'complete' ? first : null,
      search: { Gt, nodes, work, stop },
      count: { S, limit: limits.solutions, exhausted, solutions: countStatus(S, limits.solutions, exhausted) },
      census: null,
    });
  }

  if (work > limits.work) {
    stop = 'work-cap';
    return result();
  }
  if (limits.nodes === 0) {
    stop = 'node-cap';
    return result();
  }
  altBase[0] = 0;
  nodes = 1;
  search();
  if (afterSetup !== null && !sameState(afterSetup, /** @type {StateCopy} */ (copyState()))) {
    throw new Error('deduce: undo mismatch');
  }
  return result();
}
