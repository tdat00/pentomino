// @ts-check
// Piece-set carving (design §6.4–§6.5): quota-constrained flat carving, macro partitioning,
// finalization into a PieceSet with a complete witness, and an independently written policy
// validator. Pure; every random choice comes from the injected Rng and every limit is a
// deterministic call/try count.
import { activeCount } from './board.js';
import { canonicalKey, hasHole, isConnected, orientedCells, poseCells } from './geometry.js';
import { colorFor, labelFor } from './palette.js';
import { BUDGETS, defaultAvail, planSizes, sizeWindow } from './policy.js';
import { isValidLayout } from './tiling.js';

/** @typedef {import('./types.js').XY} XY */
/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').PieceSet} PieceSet */
/** @typedef {import('./types.js').Issue} Issue */
/** @typedef {import('./rng.js').Rng} Rng */

/**
 * @typedef {object} Budgets
 * @property {number} [carveSteps] Flat recursion calls per carve.
 * @property {number} [carveTries] Growth tries per recursion call.
 * @property {number} [sizePlans] Size plans per flat carve or macro part.
 * @property {number} [macroPartitions] Macro partition attempts.
 * @property {number} [macroSteps] Recursion calls per macro-part carve.
 */

/**
 * Observation and fault-injection points for tests; never needed in production.
 * @typedef {object} MacroHooks
 * @property {(state: MacroState) => void} [partitionStart] Called with the fresh state of every partition attempt.
 * @property {(state: MacroState & { part: number }) => boolean | void} [beforePart] Returning false fails the partition.
 */

/**
 * @typedef {object} MacroState
 * @property {number} attempt
 * @property {ReadonlySet<string>} used
 * @property {number} pieceCount
 * @property {number} smallLeft
 */

/**
 * Index-based result: regions list board cell indices (`y * width + x`) ascending.
 * @typedef {{ regions: number[][] }} FlatResult
 */

const NEIGHBOR_STEPS = /** @type {const} */ ([[1, 0], [-1, 0], [0, 1], [0, -1]]);
const SMALL_MAX = 4;
const MIN_PIECE = 3;

/**
 * @param {Budgets | undefined} budgets
 * @returns {Required<Budgets>}
 */
function resolveBudgets(budgets) {
  return {
    carveSteps: budgets?.carveSteps ?? BUDGETS.carveSteps,
    carveTries: budgets?.carveTries ?? BUDGETS.carveTries,
    sizePlans: budgets?.sizePlans ?? BUDGETS.sizePlans,
    macroPartitions: budgets?.macroPartitions ?? BUDGETS.macroPartitions,
    macroSteps: budgets?.macroSteps ?? BUDGETS.macroSteps,
  };
}

/**
 * @param {number} index
 * @param {number} width
 * @returns {XY}
 */
function cellOf(index, width) {
  const x = index % width;
  return [x, (index - x) / width];
}

/**
 * Four-neighbour board indices of cell `i` written into `out`; returns how many.
 * @param {number} i
 * @param {number} width
 * @param {number} height
 * @param {Int32Array} out
 * @returns {number}
 */
function neighborsOf(i, width, height, out) {
  const x = i % width;
  const y = (i - x) / width;
  let n = 0;
  if (x > 0) out[n++] = i - 1;
  if (x < width - 1) out[n++] = i + 1;
  if (y > 0) out[n++] = i - width;
  if (y < height - 1) out[n++] = i + width;
  return n;
}

/**
 * Randomized backtracking carve of `mask` into regions of the given sizes. Residual regions may be
 * disconnected; the per-component subset-sum test is only a necessary pruning rule. A failed call
 * (including budget exhaustion) leaves `o.used` unchanged; success adds the new canonical keys.
 * @param {Board} mask
 * @param {number[]} sizes Must sum to the active area of `mask`.
 * @param {Rng} rng
 * @param {{ stepBudget: number, growthTries: number, used: Set<string> }} o
 * @returns {FlatResult | null}
 */
export function carveFlat(mask, sizes, rng, o) {
  const { width, height, active } = mask;
  const cellCount = active.length;
  const empty = new Uint8Array(cellCount);
  let emptyCount = 0;
  for (let i = 0; i < cellCount; i++) {
    if (active[i] === 1) {
      empty[i] = 1;
      emptyCount++;
    }
  }
  let maxSize = 0;
  let sizeTotal = 0;
  for (const s of sizes) {
    if (!Number.isInteger(s) || s < 1) return null;
    maxSize = Math.max(maxSize, s);
    sizeTotal += s;
  }
  if (sizeTotal !== emptyCount) return null;
  const left = new Int32Array(maxSize + 1);
  for (const s of sizes) left[s]++;
  let leftTotal = sizes.length;

  /** @type {number[][]} */
  const committed = [];
  const nbr = new Int32Array(4);
  const growMark = new Int32Array(cellCount);
  let growStamp = 0;
  const seen = new Int32Array(cellCount);
  let seenStamp = 0;
  let calls = 0;

  /**
   * @param {number} target
   * @param {number} size
   * @returns {number[] | null}
   */
  const grow = (target, size) => {
    growStamp++;
    const shape = [target];
    /** @type {number[]} */
    const frontier = [];
    growMark[target] = growStamp;
    /** @param {number} c */
    const expand = (c) => {
      const n = neighborsOf(c, width, height, nbr);
      for (let d = 0; d < n; d++) {
        const j = nbr[d];
        if (empty[j] === 1 && growMark[j] !== growStamp) {
          growMark[j] = growStamp;
          frontier.push(j);
        }
      }
    };
    expand(target);
    while (shape.length < size) {
      if (frontier.length === 0) return null;
      const at = rng.int(frontier.length);
      const c = frontier[at];
      frontier[at] = /** @type {number} */ (frontier[frontier.length - 1]);
      frontier.pop();
      shape.push(c);
      expand(c);
    }
    return shape;
  };

  /** Every empty component's area must be a subset sum of the remaining sizes. */
  const residualFeasible = () => {
    if (emptyCount === 0) return leftTotal === 0;
    seenStamp++;
    /** @type {number[]} */
    const areas = [];
    let maxArea = 0;
    for (let start = 0; start < cellCount; start++) {
      if (empty[start] !== 1 || seen[start] === seenStamp) continue;
      let area = 0;
      const stack = [start];
      seen[start] = seenStamp;
      while (stack.length > 0) {
        const c = /** @type {number} */ (stack.pop());
        area++;
        const n = neighborsOf(c, width, height, nbr);
        for (let d = 0; d < n; d++) {
          const j = nbr[d];
          if (empty[j] === 1 && seen[j] !== seenStamp) {
            seen[j] = seenStamp;
            stack.push(j);
          }
        }
      }
      areas.push(area);
      maxArea = Math.max(maxArea, area);
    }
    const reach = new Uint8Array(maxArea + 1);
    reach[0] = 1;
    const used = new Int32Array(maxArea + 1);
    for (let s = 1; s <= maxSize; s++) {
      if (left[s] === 0) continue;
      used.fill(0);
      for (let v = s; v <= maxArea; v++) {
        if (reach[v] === 0 && reach[v - s] === 1 && used[v - s] < left[s]) {
          reach[v] = 1;
          used[v] = used[v - s] + 1;
        }
      }
    }
    return areas.every((a) => reach[a] === 1);
  };

  /** @returns {boolean} */
  const step = () => {
    if (emptyCount === 0) return leftTotal === 0;
    if (calls >= o.stepBudget) return false;
    calls++;

    let target = -1;
    let fewest = 5;
    let ties = 0;
    for (let i = 0; i < cellCount; i++) {
      if (empty[i] !== 1) continue;
      const n = neighborsOf(i, width, height, nbr);
      let free = 0;
      for (let d = 0; d < n; d++) free += empty[nbr[d]];
      if (free < fewest) {
        fewest = free;
        target = i;
        ties = 1;
      } else if (free === fewest) {
        ties++;
        if (rng.int(ties) === 0) target = i;
      }
    }

    /** @type {number[]} */
    const distinct = [];
    for (let s = 1; s <= maxSize; s++) if (left[s] > 0) distinct.push(s);
    const tried = new Set();
    for (let attempt = 0; attempt < o.growthTries; attempt++) {
      const size = distinct[rng.int(distinct.length)];
      const shape = grow(target, size);
      if (shape === null) continue;
      const xy = shape.map((c) => cellOf(c, width));
      const key = canonicalKey(xy);
      if (o.used.has(key) || tried.has(key) || hasHole(xy)) continue;
      tried.add(key);

      for (const c of shape) empty[c] = 0;
      emptyCount -= size;
      left[size]--;
      leftTotal--;
      o.used.add(key);
      committed.push(shape);
      if (residualFeasible() && step()) return true;
      committed.pop();
      o.used.delete(key);
      for (const c of shape) empty[c] = 1;
      emptyCount += size;
      left[size]++;
      leftTotal++;
    }
    return false;
  };

  if (!step()) return null;
  return { regions: committed.map((region) => region.slice().sort((a, b) => a - b)) };
}

/**
 * Carves the whole board with up to `sizePlans` fresh size plans, each with its own empty key set.
 * @param {Board} board
 * @param {number} k
 * @param {Rng} rng
 * @param {Budgets} [budgets]
 * @returns {FlatResult | null}
 */
export function carveFlatSet(board, k, rng, budgets) {
  const b = resolveBudgets(budgets);
  const area = activeCount(board);
  for (let plan = 0; plan < b.sizePlans; plan++) {
    const sizes = planSizes(area, k, rng);
    if (sizes === null) return null;
    const result = carveFlat(board, sizes, rng, { stepBudget: b.carveSteps, growthTries: b.carveTries, used: new Set() });
    if (result !== null) return result;
  }
  return null;
}

/**
 * Compact connected parts of the active cells by seeded guillotine cuts. Parts are ascending cell
 * index lists ordered by their first row-major cell.
 * @param {Board} b
 * @param {number} mu Mean piece size A / K.
 * @param {[number, number]} piecesPerPart
 * @param {Rng} rng
 * @returns {number[][] | null}
 */
export function macroPartition(b, mu, piecesPerPart, rng) {
  const { width, height, active } = b;
  const [pLo, pHi] = piecesPerPart;
  const stride = width + 1;
  const prefix = new Int32Array(stride * (height + 1));
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const on = active[y * width + x] === 1 ? 1 : 0;
      prefix[(y + 1) * stride + x + 1] = on + prefix[y * stride + x + 1] + prefix[(y + 1) * stride + x] - prefix[y * stride + x];
      if (on === 1) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return null;
  /**
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1 Exclusive.
   * @param {number} y1 Exclusive.
   */
  const count = (x0, y0, x1, y1) => prefix[y1 * stride + x1] - prefix[y0 * stride + x1] - prefix[y1 * stride + x0] + prefix[y0 * stride + x0];

  /** @type {[number, number, number, number][]} */
  const leaves = [];
  /**
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   */
  const split = (x0, y0, x1, y1) => {
    const n = count(x0, y0, x1, y1);
    if (n <= pHi * mu) {
      leaves.push([x0, y0, x1, y1]);
      return;
    }
    const w = x1 - x0;
    const h = y1 - y0;
    const vertical = w > h || (w === h && rng.int(2) === 0);
    const from = (vertical ? x0 : y0) + 3;
    const to = (vertical ? x1 : y1) - 3;
    /** @type {number[]} */
    const cuts = [];
    for (let c = from; c <= to; c++) {
      const before = vertical ? count(x0, y0, c, y1) : count(x0, y0, x1, c);
      if (before >= pLo * mu && n - before >= pLo * mu) cuts.push(c);
    }
    if (cuts.length === 0) {
      leaves.push([x0, y0, x1, y1]);
      return;
    }
    const c = cuts[rng.int(cuts.length)];
    if (vertical) {
      split(x0, y0, c, y1);
      split(c, y0, x1, y1);
    } else {
      split(x0, y0, x1, c);
      split(x0, c, x1, y1);
    }
  };
  split(minX, minY, maxX + 1, maxY + 1);

  /** @type {number[][]} */
  let parts = [];
  const nbr = new Int32Array(4);
  const inLeaf = new Uint8Array(active.length);
  for (const [x0, y0, x1, y1] of leaves) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) inLeaf[y * width + x] = active[y * width + x] === 1 ? 1 : 0;
    }
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const start = y * width + x;
        if (inLeaf[start] !== 1) continue;
        /** @type {number[]} */
        const part = [];
        const stack = [start];
        inLeaf[start] = 2;
        while (stack.length > 0) {
          const c = /** @type {number} */ (stack.pop());
          part.push(c);
          const n = neighborsOf(c, width, height, nbr);
          for (let d = 0; d < n; d++) {
            if (inLeaf[nbr[d]] === 1) {
              inLeaf[nbr[d]] = 2;
              stack.push(nbr[d]);
            }
          }
        }
        part.sort((a, c) => a - c);
        parts.push(part);
      }
    }
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) inLeaf[y * width + x] = 0;
    }
  }

  const minSize = 2 * Math.ceil(mu);
  const partOf = new Int32Array(active.length).fill(-1);
  /** @type {(number[] | null)[]} */
  const live = parts.slice();
  live.forEach((part, index) => part?.forEach((c) => { partOf[c] = index; }));
  for (;;) {
    let small = -1;
    for (let i = 0; i < live.length; i++) {
      const part = live[i];
      if (part === null || part.length >= minSize) continue;
      const current = small < 0 ? null : live[small];
      if (current === null || part.length < current.length || (part.length === current.length && part[0] < current[0])) small = i;
    }
    if (small < 0) break;
    const part = /** @type {number[]} */ (live[small]);
    /** @type {Map<number, number>} */
    const border = new Map();
    for (const c of part) {
      const n = neighborsOf(c, width, height, nbr);
      for (let d = 0; d < n; d++) {
        const other = partOf[nbr[d]];
        if (other >= 0 && other !== small) border.set(other, (border.get(other) ?? 0) + 1);
      }
    }
    let target = -1;
    let longest = 0;
    for (const [other, length] of border) {
      const first = /** @type {number[]} */ (live[other])[0];
      if (length > longest || (length === longest && first < /** @type {number[]} */ (live[target])[0])) {
        target = other;
        longest = length;
      }
    }
    if (target < 0) return null;
    const merged = /** @type {number[]} */ (live[target]).concat(part).sort((a, c) => a - c);
    live[target] = merged;
    live[small] = null;
    for (const c of part) partOf[c] = target;
  }
  parts = /** @type {number[][]} */ (live.filter((p) => p !== null));
  parts.sort((a, c) => a[0] - c[0]);
  return parts;
}

/**
 * Splits K pieces over parts by largest remainders of area / μ (μ = A / K), every part at least 2.
 * @param {number[]} areas Part areas.
 * @param {number} k
 * @returns {number[] | null} Null when 2 pieces per part cannot fit in K.
 */
export function allocateCounts(areas, k) {
  const total = areas.reduce((sum, a) => sum + a, 0);
  if (areas.length === 0 || total === 0 || 2 * areas.length > k) return null;
  const counts = areas.map((a) => Math.max(2, Math.floor((a * k) / total)));
  /** @type {(i: number) => number} */
  const surplus = (i) => areas[i] * k - counts[i] * total;
  let sum = counts.reduce((s, c) => s + c, 0);
  while (sum < k) {
    let best = 0;
    for (let i = 1; i < counts.length; i++) if (surplus(i) > surplus(best)) best = i;
    counts[best]++;
    sum++;
  }
  while (sum > k) {
    let best = -1;
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] > 2 && (best < 0 || surplus(i) < surplus(best))) best = i;
    }
    if (best < 0) return null;
    counts[best]--;
    sum--;
  }
  return counts;
}

/**
 * Carves each macro part with shared global quotas so the pieces can later be rearranged across
 * part borders. A failed part discards the whole partition, including keys, pieces and quotas.
 * Partitions with a single part are skipped: they would only be a flat carve with a smaller budget.
 * @param {Board} b
 * @param {number} k
 * @param {Rng} rng
 * @param {Budgets} [budgets]
 * @param {MacroHooks} [hooks]
 * @returns {{ regions: number[][], regionOf: number[] } | null}
 */
export function carveMacro(b, k, rng, budgets, hooks) {
  const o = resolveBudgets(budgets);
  const area = activeCount(b);
  if (k < 2 || area < 1) return null;
  const mu = area / k;
  /** @type {[number, number]} */
  const perPart = k <= 12 ? [2, 3] : [3, 6];
  const window = sizeWindow(area, k);
  const smallStart = Math.floor((2 * k) / 5);

  for (let attempt = 0; attempt < o.macroPartitions; attempt++) {
    /** @type {Set<string>} */
    const used = new Set();
    /** @type {number[][]} */
    const regions = [];
    /** @type {number[]} */
    const regionOf = [];
    /** @type {Map<number, number>} */
    const sizeCount = new Map();
    let smallLeft = smallStart;
    hooks?.partitionStart?.({ attempt, used, pieceCount: 0, smallLeft });

    const parts = macroPartition(b, mu, perPart, rng);
    if (parts === null || parts.length < 2) continue;
    const quotas = allocateCounts(parts.map((p) => p.length), k);
    if (quotas === null) continue;

    let allOk = true;
    for (let r = 0; r < parts.length && allOk; r++) {
      if (hooks?.beforePart?.({ attempt, part: r, used, pieceCount: regions.length, smallLeft }) === false) {
        allOk = false;
        break;
      }
      const mask = { width: b.width, height: b.height, active: new Uint8Array(b.active.length) };
      for (const c of parts[r]) mask.active[c] = 1;
      let carved = null;
      for (let plan = 0; plan < o.sizePlans && carved === null; plan++) {
        const sizes = planSizes(parts[r].length, quotas[r], rng, {
          window,
          smallCap: smallLeft,
          avail: (s) => defaultAvail(s) - (sizeCount.get(s) ?? 0),
        });
        if (sizes === null) break;
        carved = carveFlat(mask, sizes, rng, { stepBudget: o.macroSteps, growthTries: o.carveTries, used });
      }
      if (carved === null) {
        allOk = false;
        break;
      }
      for (const region of carved.regions) {
        regions.push(region);
        regionOf.push(r);
        sizeCount.set(region.length, (sizeCount.get(region.length) ?? 0) + 1);
        if (region.length <= SMALL_MAX) smallLeft--;
      }
    }
    if (allOk) return { regions, regionOf };
  }
  return null;
}

/**
 * Numeric (y, x) lexicographic comparison of two normalized cell lists.
 * @param {XY[]} a
 * @param {XY[]} c
 * @returns {number}
 */
function compareShapes(a, c) {
  const n = Math.min(a.length, c.length);
  for (let i = 0; i < n; i++) {
    const d = a[i][1] - c[i][1] || a[i][0] - c[i][0];
    if (d !== 0) return d;
  }
  return a.length - c.length;
}

/**
 * Turns carved regions into a PieceSet: pieces sorted by size descending then canonical shape,
 * labelled and coloured by index, with a complete witness reproducing every region.
 * @param {Board} b
 * @param {number[][]} regions Cell index lists (`y * width + x`).
 * @param {number[] | null} regionOf Macro part index per region, or null for flat carving.
 * @returns {PieceSet}
 */
export function finalizeSet(b, regions, regionOf) {
  if (regionOf !== null && regionOf.length !== regions.length) {
    throw new RangeError('regionOf must have one entry per region');
  }
  const items = regions.map((region, index) => {
    if (region.length === 0) throw new RangeError('regions must not be empty');
    /** @type {XY[]} */
    const cells = region.map((c) => {
      if (!Number.isInteger(c) || c < 0 || c >= b.active.length || b.active[c] !== 1) {
        throw new RangeError(`region cell ${c} is not an active board cell`);
      }
      return cellOf(c, b.width);
    });
    /** @type {XY[] | null} */
    let canon = null;
    for (let t = 0; t < 8; t++) {
      const variant = orientedCells(cells, t);
      if (canon === null || compareShapes(variant, canon) < 0) canon = variant;
    }
    return {
      index,
      cells,
      canon: /** @type {XY[]} */ (canon),
      first: Math.min(...region),
    };
  });
  items.sort((a, c) => c.canon.length - a.canon.length || compareShapes(a.canon, c.canon) || a.first - c.first);

  /** @type {Piece[]} */
  const pieces = [];
  /** @type {Pose[]} */
  const witness = [];
  items.forEach((item, index) => {
    const id = labelFor(index);
    pieces.push({ id, label: id, color: colorFor(index), cells: item.canon });
    const target = orientedCells(item.cells, 0);
    let t = 0;
    while (t < 8 && compareShapes(orientedCells(item.canon, t), target) !== 0) t++;
    const minX = Math.min(...item.cells.map((p) => p[0]));
    const minY = Math.min(...item.cells.map((p) => p[1]));
    witness.push({
      piece: id,
      x: minX,
      y: minY,
      turn: /** @type {import('./types.js').Turn} */ (t & 3),
      mirrored: t >= 4,
    });
  });
  return {
    board: b,
    pieces,
    witness,
    carving: regionOf === null ? 'flat' : 'macro',
    macroRegion: regionOf === null ? null : items.map((item) => regionOf[item.index]),
  };
}

/**
 * Independent policy validator. Imported sets are only checked structurally (coverage, shapes,
 * witness); generated sets also face the size window, small-piece cap, shape quotas, distinctness
 * and macro-region bookkeeping.
 * @param {PieceSet} set
 * @returns {Issue[]}
 */
export function validateSet(set) {
  /** @type {Issue[]} */
  const issues = [];
  /**
   * @param {string} code
   * @param {string} path
   * @param {string} message
   */
  const add = (code, path, message) => { issues.push({ code, path, message }); };

  const { board, pieces } = set;
  if (!Array.isArray(pieces) || pieces.length === 0) {
    add('no-pieces', 'pieces', 'A piece set needs at least one piece');
    return issues;
  }
  if (!(board?.active instanceof Uint8Array) || board.active.length !== board.width * board.height) {
    add('board-invalid', 'board', 'The board mask does not match its dimensions');
    return issues;
  }
  const area = activeCount(board);
  const k = pieces.length;
  if (area < 1) {
    add('board-empty', 'board', 'The board has no active cells');
    return issues;
  }
  const generated = set.carving !== 'imported';
  const [lo, hi] = sizeWindow(area, k);

  /** @type {Map<string, number>} */
  const firstOfKey = new Map();
  /** @type {Map<string, number>} */
  const ids = new Map();
  /** @type {Map<number, number>} */
  const sizeCount = new Map();
  let small = 0;
  let shapesOk = true;
  pieces.forEach((piece, i) => {
    const path = `pieces[${i}]`;
    const cells = piece?.cells;
    if (typeof piece?.id !== 'string' || piece.id === '') {
      add('piece-id', `${path}.id`, 'Piece ids must be non-empty strings');
      shapesOk = false;
    } else if (ids.has(piece.id)) {
      add('piece-id-duplicate', `${path}.id`, `Piece id ${piece.id} is already used by pieces[${ids.get(piece.id)}]`);
      shapesOk = false;
    } else {
      ids.set(piece.id, i);
    }
    if (!Array.isArray(cells) || cells.length === 0
      || !cells.every((c) => Array.isArray(c) && Number.isInteger(c[0]) && Number.isInteger(c[1]))) {
      add('piece-cells', `${path}.cells`, 'Piece cells must be a non-empty list of integer [x, y] pairs');
      shapesOk = false;
      return;
    }
    const size = cells.length;
    if (!isConnected(cells)) add('piece-disconnected', path, `Piece ${i} is not edge-connected`);
    if (hasHole(cells)) add('piece-hole', path, `Piece ${i} encloses a hole`);
    if (generated) {
      if (size < MIN_PIECE) add('size-too-small', path, `Piece ${i} has ${size} cells; the minimum is ${MIN_PIECE}`);
      else if (size < lo || size > hi) {
        add('size-out-of-window', path, `Piece ${i} has ${size} cells; the window for ${area} cells in ${k} pieces is ${lo}–${hi}`);
      }
      const key = canonicalKey(cells);
      const earlier = firstOfKey.get(key);
      if (earlier === undefined) firstOfKey.set(key, i);
      else add('duplicate-shape', path, `Piece ${i} repeats the free shape of pieces[${earlier}]`);
      sizeCount.set(size, (sizeCount.get(size) ?? 0) + 1);
      if (size <= SMALL_MAX) small++;
    }
  });
  if (generated) {
    const cap = Math.floor((2 * k) / 5);
    if (small > cap) add('too-many-small', 'pieces', `${small} pieces have 3–4 cells; at most ${cap} are allowed`);
    for (const [size, n] of sizeCount) {
      if (n > defaultAvail(size)) add('size-quota', 'pieces', `${n} pieces of ${size} cells exceed the ${defaultAvail(size)} available shapes`);
    }
    if (set.carving === 'macro') {
      const mr = set.macroRegion;
      if (!Array.isArray(mr) || mr.length !== k || !mr.every((v) => Number.isInteger(v) && v >= 0)) {
        add('macro-region', 'macroRegion', 'macroRegion must list one non-negative part index per piece');
      }
    } else if (set.macroRegion !== null) {
      add('macro-region', 'macroRegion', 'Flat sets carry no macroRegion');
    }
  }

  const witness = set.witness;
  if (witness === null || witness === undefined) {
    if (generated) add('witness-missing', 'witness', 'A generated set needs a complete witness');
    return issues;
  }
  if (!shapesOk) return issues;
  const covered = new Uint8Array(board.active.length);
  const posed = new Set();
  let witnessOk = Array.isArray(witness) && witness.length === k;
  if (!witnessOk) add('witness-size', 'witness', `The witness has ${Array.isArray(witness) ? witness.length : 0} poses for ${k} pieces`);
  for (const [i, pose] of (Array.isArray(witness) ? witness : []).entries()) {
    const path = `witness[${i}]`;
    const piece = pieces[ids.get(pose?.piece) ?? -1];
    if (piece === undefined) {
      add('witness-piece', path, `Pose refers to unknown piece ${String(pose?.piece)}`);
      witnessOk = false;
      continue;
    }
    if (posed.has(piece.id)) {
      add('witness-piece', path, `Piece ${piece.id} is posed twice`);
      witnessOk = false;
    }
    posed.add(piece.id);
    for (const [x, y] of poseCells(piece, pose)) {
      if (x < 0 || y < 0 || x >= board.width || y >= board.height || board.active[y * board.width + x] !== 1) {
        add('cell-blocked', path, `Piece ${piece.id} covers (${x}, ${y}), which is not an active cell`);
        witnessOk = false;
        continue;
      }
      const at = y * board.width + x;
      if (covered[at] === 1) {
        add('overlap', path, `Piece ${piece.id} overlaps another piece at (${x}, ${y})`);
        witnessOk = false;
      }
      covered[at] = 1;
    }
  }
  let missing = 0;
  for (let i = 0; i < covered.length; i++) if (board.active[i] === 1 && covered[i] === 0) missing++;
  if (missing > 0) {
    add('missing-cells', 'witness', `${missing} active cells are not covered by any piece`);
    witnessOk = false;
  }
  if (witnessOk && !isValidLayout(board, pieces, witness)) {
    add('witness-invalid', 'witness', 'The witness is not a valid layout');
  }
  return issues;
}
