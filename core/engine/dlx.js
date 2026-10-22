// @ts-check
// Algorithm X with Dancing Links over typed arrays and an explicit search
// stack. Rows are one flat Int32Array of column indices plus offsets; no
// per-row objects exist. Every exit (exhaustion, a limit, the solution limit or
// a throwing callback) restores all links, so one instance can be solved again
// and again with identical results. No clocks; canonical mode consumes no RNG.
//
// Column choice is MRV: fewest rows, ties to the first header (canonical) or
// uniform among the minima (seeded, drawing from the RNG only on real ties).
// A zero-row column is a dead end. Rows are tried in insertion order or, when
// seeded, in a per-node Fisher-Yates shuffle. A forced row (one candidate) is a
// row trial but not a branch trial. This traversal is the `dlx-v1` model.

import { BUDGETS } from './policy.js';
import { dlxViews } from './workspace.js';

/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('./workspace.js').Workspace} Workspace */

/**
 * @typedef {object} SolveOptions
 * @property {number} [maxSolutions] Default 1; 0 stops immediately.
 * @property {number} [rowTrialLimit] Default Infinity.
 * @property {number} [branchTrialLimit] Default Infinity.
 * @property {Rng | null} [rng] Seeded tie and row order; null/omitted is canonical.
 * @property {(rows: Int32Array) => void} [onSolution] Receives a stable copy of the row ids.
 * @property {(rowTrials: number) => void} [onProgress]
 * @property {number} [progressEvery] Row trials between progress calls.
 */

/**
 * `exhausted` is true only when the whole search space was explored; stopping
 * at a solution or a limit never proves uniqueness or impossibility.
 * @typedef {object} SolveResult
 * @property {Int32Array[]} solutions Row ids of each solution in selection order.
 * @property {number} found
 * @property {number} rowTrials
 * @property {number} branchTrials
 * @property {boolean} exhausted
 * @property {'exhausted' | 'solution-limit' | 'row-limit' | 'branch-limit'} stop
 */

/**
 * @param {string} name
 * @param {unknown} value
 * @param {boolean} allowInfinity
 */
function checkCount(name, value, allowInfinity) {
  const ok = typeof value === 'number' && value >= 0 && (Number.isInteger(value) || (allowInfinity && value === Infinity));
  if (!ok) {
    throw new RangeError(`${name} must be a nonnegative integer${allowInfinity ? ' or Infinity' : ''}, got ${String(value)}`);
  }
}

export class ExactCover {
  /**
   * Builds the links in the workspace. Columns are 0..numColumns-1; rows are
   * `rowCols[rowStart[r] .. rowStart[r + 1])`. Rows must not repeat a column;
   * a row with no columns can never be selected.
   * @param {Workspace} ws
   * @param {number} numColumns
   * @param {Int32Array} rowCols
   * @param {Int32Array} rowStart
   * @param {number} rowCount
   */
  constructor(ws, numColumns, rowCols, rowStart, rowCount) {
    if (!Number.isInteger(numColumns) || numColumns < 0 || !Number.isInteger(rowCount) || rowCount < 0
      || rowStart.length < rowCount + 1) {
      throw new RangeError('invalid exact-cover dimensions');
    }
    const first = rowStart[0];
    const nonzeros = rowStart[rowCount] - first;
    for (let r = 0; r < rowCount; r += 1) {
      if (rowStart[r + 1] < rowStart[r]) {
        throw new RangeError('rowStart must be nondecreasing');
      }
    }
    if (first < 0 || rowStart[rowCount] > rowCols.length) {
      throw new RangeError('rowStart points outside rowCols');
    }
    this.ws = ws;
    this.columns = numColumns;
    this.rowCount = rowCount;
    const v = dlxViews(ws, numColumns, nonzeros);
    this.v = v;
    const { L, R, U, D, C, ROW, S } = v;

    // S doubles as a per-column "last row seen" stamp to reject repeated columns.
    S.fill(-1, 0, numColumns + 1);
    for (let r = 0; r < rowCount; r += 1) {
      for (let e = rowStart[r]; e < rowStart[r + 1]; e += 1) {
        const col = rowCols[e];
        if (!(col >= 0 && col < numColumns)) {
          throw new RangeError(`row ${r} names column ${col} outside 0..${numColumns - 1}`);
        }
        if (S[col + 1] === r) {
          throw new RangeError(`row ${r} repeats column ${col}`);
        }
        S[col + 1] = r;
      }
    }
    S.fill(0, 0, numColumns + 1);

    for (let c = 0; c <= numColumns; c += 1) {
      L[c] = c === 0 ? numColumns : c - 1;
      R[c] = c === numColumns ? 0 : c + 1;
      U[c] = c;
      D[c] = c;
      C[c] = c;
      ROW[c] = -1;
    }
    for (let r = 0; r < rowCount; r += 1) {
      const start = rowStart[r];
      const end = rowStart[r + 1];
      if (start === end) {
        continue;
      }
      const head = numColumns + 1 + (start - first);
      const tail = numColumns + 1 + (end - 1 - first);
      for (let e = start; e < end; e += 1) {
        const x = numColumns + 1 + (e - first);
        const c = rowCols[e] + 1;
        C[x] = c;
        ROW[x] = r;
        U[x] = U[c];
        D[U[c]] = x;
        D[x] = c;
        U[c] = x;
        S[c] += 1;
        L[x] = x === head ? tail : x - 1;
        R[x] = x === tail ? head : x + 1;
      }
    }
  }

  /**
   * Searches for exact covers. Defaults: one solution, no work limits,
   * canonical order.
   * @param {SolveOptions} [o]
   * @returns {SolveResult}
   */
  solve(o = {}) {
    const maxSolutions = o.maxSolutions ?? 1;
    const rowLimit = o.rowTrialLimit ?? Infinity;
    const branchLimit = o.branchTrialLimit ?? Infinity;
    const progressEvery = o.progressEvery ?? BUDGETS.progressEvery;
    checkCount('maxSolutions', maxSolutions, true);
    checkCount('rowTrialLimit', rowLimit, true);
    checkCount('branchTrialLimit', branchLimit, true);
    checkCount('progressEvery', progressEvery, false);
    if (progressEvery < 1) {
      throw new RangeError('progressEvery must be at least 1');
    }
    const rng = o.rng ?? null;
    const { onSolution, onProgress } = o;
    const { L, R, U, D, C, ROW, S, stCol, stRow, stPos, stBase, stChoices } = this.v;
    const shuffle = rng === null ? null : this.ws.int32('dlx.shuffle', this.rowCount);

    /** @param {number} c */
    const cover = (c) => {
      R[L[c]] = R[c];
      L[R[c]] = L[c];
      for (let i = D[c]; i !== c; i = D[i]) {
        for (let j = R[i]; j !== i; j = R[j]) {
          U[D[j]] = U[j];
          D[U[j]] = D[j];
          S[C[j]] -= 1;
        }
      }
    };
    /** @param {number} c */
    const uncover = (c) => {
      for (let i = U[c]; i !== c; i = U[i]) {
        for (let j = L[i]; j !== i; j = L[j]) {
          S[C[j]] += 1;
          U[D[j]] = j;
          D[U[j]] = j;
        }
      }
      R[L[c]] = c;
      L[R[c]] = c;
    };
    /** @param {number} x */
    const select = (x) => {
      for (let j = R[x]; j !== x; j = R[j]) {
        cover(C[j]);
      }
    };
    /** @param {number} x */
    const deselect = (x) => {
      for (let j = L[x]; j !== x; j = L[j]) {
        uncover(C[j]);
      }
    };

    // Stack levels 0..d-1 each have their column covered; every level below the
    // top has its current row selected, and the top does iff `selected`.
    let d = 0;
    let selected = false;
    let found = 0;
    let rowTrials = 0;
    let branchTrials = 0;
    /** @type {SolveResult['stop'] | null} */
    let stop = null;
    /** @type {Int32Array[]} */
    const solutions = [];

    try {
      if (maxSolutions === 0) {
        stop = 'solution-limit';
      }
      // 0 = enter a node, 1 = take the next candidate row, 2 = leave a failed child.
      let phase = 0;
      while (stop === null) {
        if (phase === 0) {
          if (R[0] === 0) {
            const rows = new Int32Array(d);
            for (let k = 0; k < d; k += 1) {
              rows[k] = ROW[stRow[k]];
            }
            found += 1;
            solutions.push(rows);
            if (onSolution !== undefined) {
              onSolution(rows.slice());
            }
            if (found >= maxSolutions) {
              stop = 'solution-limit';
            } else {
              phase = 2;
            }
            continue;
          }
          let c = R[0];
          let best = S[c];
          for (let j = R[c]; best > 0 && j !== 0; j = R[j]) {
            if (S[j] < best) {
              best = S[j];
              c = j;
            }
          }
          if (best === 0) {
            phase = 2;
            continue;
          }
          if (rng !== null) {
            let ties = 0;
            for (let j = R[0]; j !== 0; j = R[j]) {
              ties += S[j] === best ? 1 : 0;
            }
            if (ties > 1) {
              let pick = rng.int(ties);
              for (let j = R[0]; j !== 0; j = R[j]) {
                if (S[j] === best && pick-- === 0) {
                  c = j;
                  break;
                }
              }
            }
          }
          cover(c);
          stCol[d] = c;
          stChoices[d] = best;
          const base = d === 0 ? 0 : stBase[d - 1] + stChoices[d - 1];
          stBase[d] = base;
          if (shuffle === null || rng === null) {
            stRow[d] = c;
          } else {
            let p = base;
            for (let i = D[c]; i !== c; i = D[i]) {
              shuffle[p++] = i;
            }
            for (let i = best - 1; i > 0; i -= 1) {
              const j = rng.int(i + 1);
              const tmp = shuffle[base + i];
              shuffle[base + i] = shuffle[base + j];
              shuffle[base + j] = tmp;
            }
            stPos[d] = base;
          }
          d += 1;
          selected = false;
          phase = 1;
        } else if (phase === 1) {
          const k = d - 1;
          const c = stCol[k];
          let x;
          if (shuffle === null) {
            x = D[stRow[k]];
            x = x === c ? 0 : x;
          } else {
            x = stPos[k] < stBase[k] + stChoices[k] ? shuffle[stPos[k]] : 0;
          }
          if (x === 0) {
            uncover(c);
            d -= 1;
            selected = d > 0;
            if (d === 0) {
              stop = 'exhausted';
            } else {
              phase = 2;
            }
            continue;
          }
          const choices = stChoices[k];
          if (rowTrials >= rowLimit) {
            stop = 'row-limit';
            continue;
          }
          if (choices >= 2 && branchTrials >= branchLimit) {
            stop = 'branch-limit';
            continue;
          }
          rowTrials += 1;
          if (choices >= 2) {
            branchTrials += 1;
          }
          stRow[k] = x;
          if (shuffle !== null) {
            stPos[k] += 1;
          }
          select(x);
          selected = true;
          if (onProgress !== undefined && rowTrials % progressEvery === 0) {
            onProgress(rowTrials);
          }
          phase = 0;
        } else {
          if (d === 0) {
            stop = 'exhausted';
            continue;
          }
          deselect(stRow[d - 1]);
          selected = false;
          phase = 1;
        }
      }
    } finally {
      for (let k = d - 1; k >= 0; k -= 1) {
        if (k < d - 1 || selected) {
          deselect(stRow[k]);
        }
        uncover(stCol[k]);
      }
    }
    return { solutions, found, rowTrials, branchTrials, exhausted: stop === 'exhausted', stop };
  }
}
