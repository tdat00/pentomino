// @ts-check
// Production-engine calibration landscape (design §7.5, §7.8; T21): the inlined
// §7.5 reference table, the deterministic landscape boards and matrix, the
// diagnostic clue-count sampler plan, the exact policy check of an observed
// set, and the aggregation that decides the four calibration criteria. Pure.
//
// The reference numbers are HISTORICAL prototype measurements or forecasts. They
// are used for comparison only; nothing here relaxes the generator or edits a
// reference to make a run pass, and nothing here changes a qualification gate.
import { boardFromRows } from '../../core/engine/board.js';
import { canonicalJson, sha256Hex } from '../../core/engine/hash.js';
import { level, offeredLevels } from '../../core/engine/levels.js';
import { defaultAvail, pieceCountRange, sizeWindow } from '../../core/engine/policy.js';
import { groupBy, median, percentile, summarize } from './report.js';

export const LANDSCAPE_SEEDS = 20;
export const SAMPLE_SHARES = Object.freeze([0.05, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85]);
export const SAMPLES_PER_COUNT = 2;
/** Design tolerance for agreement of K with the reference rows (pieces). */
export const K_TOLERANCE = 1;
export const T10_BOUND_FACTOR = 2;
const MAX_SIDE = 32;

/**
 * @typedef {object} ReferenceRow
 * @property {string} level
 * @property {number} aMin
 * @property {number} aMax
 * @property {[number, number]} k
 * @property {[number, number]} sizes
 * @property {[number, number]} g0
 * @property {{ cols: number, rows: number }[] | null} boards Explicit measured boards; null for n/m rows.
 * @property {number} nodeS Historical Node maximum (measured) or forecast (n/m), seconds.
 * @property {'measured' | 'forecast'} nodeKind
 * @property {number} planS Browser plan seconds (derived 5 + 4 x Node; never measured).
 * @property {'derived' | 'estimate' | 'lazy-estimate'} planKind
 * @property {boolean} comparable False when the reference case does not match the current count policy.
 * @property {string} note
 */

/**
 * @param {string} levelId
 * @param {number} aMin
 * @param {number} aMax
 * @param {[number, number]} k
 * @param {[number, number]} sizes
 * @param {[number, number]} g0
 * @param {string | null} boards "6x10" or "22x22,32x15"; null = n/m.
 * @param {number} nodeS
 * @param {number} planS
 * @param {Partial<ReferenceRow> & { planKind?: ReferenceRow['planKind'] }} [extra]
 * @returns {ReferenceRow}
 */
function row(levelId, aMin, aMax, k, sizes, g0, boards, nodeS, planS, extra = {}) {
  return Object.freeze({
    level: levelId,
    aMin,
    aMax,
    k,
    sizes,
    g0,
    boards: boards === null ? null : boards.split(',').map((b) => {
      const [cols, rows] = b.split('x').map(Number);
      return { cols, rows };
    }),
    nodeS,
    nodeKind: boards === null ? 'forecast' : 'measured',
    planS,
    planKind: boards === null ? 'estimate' : 'derived',
    comparable: true,
    note: '',
    ...extra,
  });
}

const FLAT = 'flat-carved LNS-heavy outlier (dagger in the design table); macro carving replaces this regime';
const LAZY = { planKind: /** @type {const} */ ('lazy-estimate') };

/** The §7.5 table, row for row. W x H is columns x rows. */
export const REFERENCE_ROWS = Object.freeze([
  row('very-easy', 30, 80, [5, 7], [3, 18], [3, 4], '6x10', 0.2, 6),
  row('very-easy', 81, 87, [7, 7], [6, 19], [4, 4], null, 0.3, 6),
  row('easy', 32, 80, [6, 9], [3, 18], [3, 5], '6x10', 0.1, 5),
  row('easy', 81, 130, [7, 10], [5, 22], [4, 5], '10x10', 0.3, 6),
  row('easy', 131, 200, [9, 11], [7, 28], [5, 6], '12x12', 0.3, 6),
  row('easy', 201, 215, [11, 11], [10, 30], [6, 6], null, 0.7, 8),
  row('normal', 36, 80, [7, 10], [3, 15], [3, 5], '6x10', 2.6, 15),
  row('normal', 81, 130, [8, 11], [4, 20], [4, 5], '10x10', 0.8, 8),
  row('normal', 131, 200, [10, 13], [6, 28], [5, 6], '12x12', 0.9, 9),
  row('normal', 201, 300, [11, 14], [9, 35], [5, 6], '16x16', 0.7, 8),
  row('normal', 301, 348, [14, 15], [12, 38], [6, 7], '18x18', 0.7, 8),
  row('hard', 41, 80, [8, 12], [3, 12], [3, 5], '6x10', 2.4, 15),
  row('hard', 81, 130, [10, 13], [4, 17], [4, 5], '10x10', 1.0, 9),
  row('hard', 131, 200, [12, 15], [6, 24], [5, 6], '12x12', 1.6, 11),
  row('hard', 201, 300, [13, 17], [8, 31], [5, 6], null, 0.7, 8),
  row('hard', 301, 420, [15, 18], [10, 40], [6, 7], '18x20', 1.8, 12),
  row('hard', 421, 484, [16, 19], [13, 43], [6, 7], '22x22', 1.2, 10),
  row('hard', 485, 576, [17, 20], [15, 48], [6, 8], null, 4.7, 24),
  row('hard', 577, 676, [19, 21], [17, 51], [7, 8], '26x26', 4.7, 24),
  row('expert', 50, 80, [10, 13], [3, 11], [3, 4], '6x10', 1.1, 9),
  row('expert', 81, 130, [12, 15], [3, 15], [4, 5], '10x10', 15.1, 65, { note: FLAT }),
  row('expert', 131, 200, [13, 17], [5, 20], [4, 5], '14x14', 2.8, 16),
  row('expert', 201, 300, [15, 19], [7, 27], [5, 6], null, 0.7, 8),
  row('expert', 301, 420, [17, 21], [9, 34], [5, 6], null, 1.8, 12),
  row('expert', 421, 484, [19, 22], [12, 39], [6, 7], null, 1.2, 10),
  row('expert', 485, 576, [19, 23], [13, 44], [6, 7], null, 4.7, 24),
  row('expert', 577, 676, [20, 24], [15, 49], [6, 7], '26x26', 1.2, 10, {
    comparable: false,
    note: 'reference measured with K = 28, outside the current count policy (K 20-24); needs a reviewed new baseline',
  }),
  row('master', 59, 80, [12, 15], [3, 10], [3, 3], '6x10', 0.9, 9),
  row('master', 81, 130, [13, 17], [3, 13], [3, 4], '10x10', 4.0, 21),
  row('master', 131, 200, [15, 19], [4, 18], [3, 4], '12x12', 3.6, 19),
  row('master', 201, 300, [17, 22], [6, 24], [4, 5], '16x16', 4.7, 24),
  row('master', 301, 420, [19, 24], [8, 30], [4, 5], '18x20', 9.3, 42),
  row('master', 421, 484, [21, 25], [10, 33], [5, 5], '22x22', 1.4, 11),
  row('master', 485, 576, [22, 26], [11, 38], [5, 6], null, 3.1, 17),
  row('master', 577, 676, [23, 27], [13, 43], [5, 6], '26x26', 3.1, 17),
  row('nightmare', 81, 130, [16, 21], [3, 11], [2, 3], '10x10', 2.5, 15),
  row('nightmare', 131, 200, [19, 24], [3, 15], [3, 3], '12x12', 29.8, 124, { note: FLAT }),
  row('nightmare', 201, 300, [21, 27], [5, 20], [3, 4], '16x16', 11.2, 50),
  row('nightmare', 301, 420, [24, 29], [6, 25], [3, 4], '18x20', 10.2, 46),
  row('nightmare', 421, 484, [26, 30], [8, 27], [4, 4], null, 10, 45),
  row('nightmare', 485, 576, [27, 32], [9, 31], [4, 4], null, 10, 45),
  row('nightmare', 577, 676, [28, 33], [10, 35], [4, 5], null, 10, 45),
  row('hell-1', 164, 200, [30, 36], [3, 10], [3, 4], '14x14', 8.3, 38),
  row('hell-1', 201, 300, [32, 40], [3, 13], [3, 4], '16x16', 17.9, 77),
  row('hell-1', 301, 420, [35, 42], [4, 17], [4, 4], '18x18', 12.0, 53, { note: 'K = 41 replay: 7.6 s' }),
  row('hell-1', 421, 484, [39, 42], [6, 19], [4, 4], '22x22', 28.1, 87, { ...LAZY, note: 'K = 41 replay: 18.9 s' }),
  row('hell-1', 485, 576, [39, 42], [6, 23], [4, 4], '24x24', 38.4, 109, LAZY),
  row('hell-1', 577, 676, [39, 42], [8, 26], [4, 4], '26x26', 48.6, 153, { ...LAZY, note: 'historical maximum from one seed' }),
  row('hell-2', 266, 300, [46, 53], [3, 10], [3, 3], null, 11, 49),
  row('hell-2', 301, 420, [47, 58], [3, 13], [3, 3], '20x20', 13.7, 60),
  row('hell-2', 421, 484, [52, 61], [4, 14], [3, 4], '22x22', 8.3, 38),
  row('hell-2', 485, 576, [54, 62], [4, 16], [3, 4], '24x24', 15.2, 66),
  row('hell-2', 577, 676, [57, 62], [5, 18], [3, 4], '26x26', 25.6, 107),
  row('hell-3', 450, 484, [71, 80], [3, 11], [3, 3], '22x22,32x15', 15.9, 69, {
    note: 'the original also measured 40x12, excluded by the 32-cell side limit and not part of this matrix',
  }),
  row('hell-3', 485, 576, [73, 86], [3, 12], [3, 3], '24x24', 23.6, 99),
  row('hell-3', 577, 676, [76, 90], [4, 13], [3, 4], '26x26', 11.5, 51),
]);

/**
 * @param {number} cols
 * @param {number} rows
 * @param {number} [blocked] Rightmost cells of the final row to block.
 * @returns {string[]}
 */
export function rectRows(cols, rows, blocked = 0) {
  return Array.from({ length: rows }, (_, y) => (y === rows - 1 && blocked > 0
    ? '#'.repeat(cols - blocked) + '.'.repeat(blocked)
    : '#'.repeat(cols)));
}

/**
 * Deterministic board of exactly `area` active cells: the closest-to-square
 * factor pair with sides <= 32 (columns <= rows), else a near-square rectangle
 * whose final row loses its rightmost cells (the remainder stays connected).
 * @param {number} area
 * @returns {{ cols: number, rows: number, blocked: number }}
 */
export function deterministicBoard(area) {
  for (let a = Math.floor(Math.sqrt(area)); a >= 1; a -= 1) {
    if (area % a === 0 && area / a <= MAX_SIDE) {
      return { cols: a, rows: area / a, blocked: 0 };
    }
  }
  const cols = Math.ceil(Math.sqrt(area));
  const rows = Math.ceil(area / cols);
  return { cols, rows, blocked: cols * rows - area };
}

/** @param {{ cols: number, rows: number, blocked: number }} b */
export const boardId = (b) => `${b.cols}x${b.rows}${b.blocked > 0 ? `b${b.blocked}` : ''}`;

/**
 * @typedef {object} LandscapeBoard
 * @property {string} id
 * @property {string[]} boardRows
 * @property {number} area
 * @property {'measured' | 'deterministic'} source
 */

/**
 * Every board of the reference table, deduplicated by exact rows: the explicit
 * measured boards, else the deterministic board at the row's upper area.
 * @returns {LandscapeBoard[]}
 */
export function landscapeBoards() {
  /** @type {Map<string, LandscapeBoard>} */
  const unique = new Map();
  for (const r of REFERENCE_ROWS) {
    const shapes = r.boards === null ? [deterministicBoard(r.aMax)] : r.boards.map((b) => ({ ...b, blocked: 0 }));
    for (const shape of shapes) {
      const boardRows = rectRows(shape.cols, shape.rows, shape.blocked);
      const key = boardRows.join('/');
      const known = unique.get(key);
      if (known === undefined) {
        const area = boardRows.join('').replace(/\./g, '').length;
        unique.set(key, { id: boardId(shape), boardRows, area, source: r.boards === null ? 'deterministic' : 'measured' });
      } else if (r.boards !== null) {
        known.source = 'measured';
      }
    }
  }
  return [...unique.values()].sort((a, b) => a.area - b.area || (a.id < b.id ? -1 : 1));
}

/**
 * The landscape matrix: every offered level at every board.
 * @param {{ seeds?: number, maxActive?: number }} [options]
 */
export function buildLandscapeMatrix(options = {}) {
  const repetitions = options.seeds ?? LANDSCAPE_SEEDS;
  const maxActive = options.maxActive ?? 676;
  const cases = [];
  for (const board of landscapeBoards()) {
    for (const lv of offeredLevels(board.area)) {
      cases.push({
        id: `${board.id}-${lv.id}`,
        boardRows: board.boardRows,
        rotation: 0,
        levelId: lv.id,
        maxActive,
        quantity: /** @type {const} */ (10),
        uniqueness: /** @type {const} */ ('any'),
        seedPrefix: 'landscape',
        repetitions,
      });
    }
  }
  return { version: /** @type {const} */ (1), profile: /** @type {const} */ ('landscape'), cases };
}

/**
 * @param {string} levelId
 * @param {number} area
 * @returns {ReferenceRow | undefined}
 */
export function referenceFor(levelId, area) {
  return REFERENCE_ROWS.find((r) => r.level === levelId && area >= r.aMin && area <= r.aMax);
}

/**
 * Initial clue count of a level for K pieces (design §6.10).
 * @param {string} levelId
 * @param {number} k
 * @returns {number}
 */
export function initialG(levelId, k) {
  return Math.min(k - 2, Math.max(1, Math.round(level(levelId).share * k)));
}

/**
 * Distinct clue counts sampled after a timed run: the share grid, 1, K - 2 and the level's initial G.
 * @param {number} k
 * @param {number} g0 Initial G.
 * @returns {number[]} Ascending, each in 1..K-2.
 */
export function sampleCounts(k, g0) {
  const clamp = (/** @type {number} */ g) => Math.min(k - 2, Math.max(1, g));
  const counts = new Set([...SAMPLE_SHARES.map((s) => clamp(Math.round(s * k))), 1, clamp(k - 2), clamp(g0)]);
  return [...counts].filter((g) => g >= 1).sort((a, b) => a - b);
}

/**
 * Exact policy check of an observed piece set (K range, size window, small-piece
 * cap, shape availability, area sum).
 * @param {string} levelId
 * @param {number} area
 * @param {readonly number[]} sizes Piece sizes in cells.
 * @returns {string[]} Violation codes; empty when the set obeys the policy.
 */
export function checkSetPolicy(levelId, area, sizes) {
  /** @type {string[]} */
  const violations = [];
  const k = sizes.length;
  const range = pieceCountRange(levelId, area);
  if (range === null || !range.includes(k)) {
    violations.push('k-out-of-range');
  }
  if (sizes.reduce((s, v) => s + v, 0) !== area) {
    violations.push('area-sum');
  }
  if (k > 0) {
    const [lo, hi] = sizeWindow(area, k);
    if (sizes.some((s) => s < lo || s > hi)) {
      violations.push('size-window');
    }
    if (sizes.filter((s) => s <= 4).length > Math.floor((2 * k) / 5)) {
      violations.push('small-piece-cap');
    }
    const counts = new Map();
    for (const s of sizes) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    if ([...counts].some(([size, count]) => count > defaultAvail(size))) {
      violations.push('shape-availability');
    }
  }
  return violations;
}

/**
 * Union of the current policy's K over a reference row's area band and its
 * agreement with the table within the calibration tolerance.
 * @param {ReferenceRow} r
 * @returns {{ policyK: [number, number] | null, agrees: boolean }}
 */
export function referencePolicyAgreement(r) {
  let lo = Infinity;
  let hi = -Infinity;
  const stop = Math.min(r.aMax, 676);
  for (let area = r.aMin; area <= stop; area += 1) {
    for (const k of pieceCountRange(r.level, area) ?? []) {
      lo = Math.min(lo, k);
      hi = Math.max(hi, k);
    }
  }
  if (lo === Infinity) {
    return { policyK: null, agrees: false };
  }
  return { policyK: [lo, hi], agrees: Math.abs(lo - r.k[0]) <= K_TOLERANCE && Math.abs(hi - r.k[1]) <= K_TOLERANCE };
}

/** @param {readonly number[]} values @returns {Record<string, number>} */
function histogram(values) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const v of [...values].sort((a, b) => a - b)) {
    out[String(v)] = (out[String(v)] ?? 0) + 1;
  }
  return out;
}

/**
 * Score distribution of profile samples grouped by a key.
 * @param {Record<string, any>[]} samples
 * @param {(s: Record<string, any>) => number} keyOf
 */
function scoreGroups(samples, keyOf) {
  return [...groupBy(samples, (s) => String(keyOf(s))).entries()]
    .map(([key, list]) => {
      const scores = list.map((s) => s.score);
      return {
        key: Number(key),
        n: list.length,
        min: Math.min(...scores),
        median: median(scores),
        p95: percentile(scores, 0.95),
        max: Math.max(...scores),
        inBandShare: list.filter((s) => s.inBand).length / list.length,
        saturatedShare: list.filter((s) => s.saturated).length / list.length,
      };
    })
    .sort((a, b) => a.key - b.key);
}

/**
 * Aggregates landscape runs into per-cell statistics, the four calibration
 * criteria and the blocker list. Cells with fewer rows than requested stay
 * incomplete; nothing is skipped silently.
 * @param {import('./report.js').RunRecord[]} runs
 * @param {ReturnType<typeof buildLandscapeMatrix>} matrix
 */
export function aggregateLandscape(runs, matrix) {
  const ordinaryByCase = groupBy(runs.filter((r) => r.probeKind === 'generation'), (r) => r.caseId);
  /** @type {Record<string, any>[]} */
  const allSamples = [];
  const cells = matrix.cases.map((c) => {
    const area = c.boardRows.join('').replace(/\./g, '').length;
    const all = ordinaryByCase.get(c.id) ?? [];
    const rows = all.filter((r) => !r.interrupted);
    const complete = rows.filter((r) => r.acceptedCount >= 10);
    const rate = rows.length === 0 ? null : complete.length / rows.length;
    const ref = referenceFor(c.levelId, area);
    const details = rows.map((r) => r.details).filter((d) => d !== null);
    const ks = details.map((d) => d.K).filter((v) => typeof v === 'number');
    const violations = details.flatMap((d) => d.policy?.violations ?? []);
    const samples = rows.flatMap((r) => r.samples);
    allSamples.push(...samples.map((s) => ({ ...s, levelId: c.levelId })));
    const t10 = complete.map((r) => r.tenthReadyMs).filter((v) => typeof v === 'number');
    const censored = rows.length - t10.length;
    const maxT10 = rows.length === 0 ? null : Math.max(...rows.map((r) => r.tenthReadyMs ?? r.responseMs));
    const kTolerance = ref === undefined || ks.length === 0 ? null
      : ks.every((k) => k >= ref.k[0] - K_TOLERANCE && k <= ref.k[1] + K_TOLERANCE);
    const policyRange = pieceCountRange(c.levelId, area);
    const expected = c.repetitions;
    const need = Math.max(expected, LANDSCAPE_SEEDS, rows.length);
    const best = (complete.length + (need - rows.length)) / need;
    /** @type {'pass' | 'fail' | 'incomplete'} */
    let accept1 = 'incomplete';
    if (best < 0.9) {
      accept1 = 'fail';
    } else if (rate !== null && rows.length >= need && rate >= 0.9) {
      accept1 = 'pass';
    }
    const proofs = { unique: 0, multiple: 0, notProved: 0, notChecked: 0 };
    for (const r of rows) {
      for (const key of /** @type {const} */ (['unique', 'multiple', 'notProved', 'notChecked'])) {
        proofs[key] += r.certificates[key];
      }
    }
    const goodSamples = samples.filter((s) => typeof s.score === 'number');
    return {
      caseId: c.id,
      boardId: c.id.slice(0, c.id.length - c.levelId.length - 1),
      area,
      levelId: c.levelId,
      runs: { requested: expected, recorded: rows.length, interrupted: all.length - rows.length, completeTen: complete.length },
      requestInBandRate: rate,
      criterion1: { status: accept1, rate, threshold: 0.9, minimumSeeds: LANDSCAPE_SEEDS },
      t10Conditional: { ...summarize(t10), basis: 'runs that completed ten puzzles', censoredRuns: censored },
      maxT10Ms: maxT10,
      K: {
        observed: histogram(ks),
        policyRange,
        policyViolations: violationCounts(violations),
        referenceRange: ref === undefined ? null : ref.k,
        withinReferenceTolerance: kTolerance,
      },
      pieceSizes: {
        min: details.length === 0 ? null : Math.min(...details.map((d) => d.sizes[0])),
        max: details.length === 0 ? null : Math.max(...details.map((d) => d.sizes[d.sizes.length - 1])),
      },
      G: {
        initial: histogram(details.map((d) => d.initialG).filter((v) => typeof v === 'number')),
        accepted: histogram(details.flatMap((d) => (d.puzzles ?? []).map((p) => p.G))),
      },
      saturation: {
        acceptedShare: ratio(rows.reduce((s, r) => s + r.ratingSaturatedCount, 0), rows.reduce((s, r) => s + r.acceptedCount, 0)),
        sampledShare: ratio(goodSamples.filter((s) => s.saturated).length, goodSamples.length),
      },
      sampledInBandRate: ratio(goodSamples.filter((s) => s.inBand).length, goodSamples.length),
      profileLatency: {
        kind: 'RPC round trip of a canonical rating task (includes message transfer), not worker CPU time',
        ...summarize(goodSamples.map((s) => s.ratingMs)),
      },
      proofs,
      reference: ref === undefined ? null : { ...ref, boards: ref.boards },
    };
  });

  const rowResults = REFERENCE_ROWS.map((r) => referenceResult(r, cells));
  const sampled = allSamples.filter((s) => typeof s.score === 'number');
  const blockers = [];
  for (const cell of cells) {
    if (cell.criterion1.status === 'fail') {
      blockers.push(`${cell.caseId}: ${cell.runs.completeTen} of ${cell.runs.recorded} recorded requests completed ten in-band puzzles (${Math.round((cell.requestInBandRate ?? 0) * 100)}%); 90% of at least ${LANDSCAPE_SEEDS} cannot be reached`);
    }
    if (Object.keys(cell.K.policyViolations).length > 0) {
      blockers.push(`${cell.caseId}: policy violations ${JSON.stringify(cell.K.policyViolations)}`);
    }
    if (cell.K.withinReferenceTolerance === false) {
      blockers.push(`${cell.caseId}: observed K outside the reference row range +/- ${K_TOLERANCE}`);
    }
  }
  for (const rr of rowResults) {
    if (rr.status === 'fail') {
      blockers.push(`reference ${rr.label}: maximum Node T10 ${rr.maxT10Ms} ms exceeds ${T10_BOUND_FACTOR} x ${rr.nodeS} s`);
    }
    if (rr.status === 'baseline-review-required') {
      blockers.push(`reference ${rr.label}: not comparable; a reviewed new baseline is required`);
    }
    if (rr.policyAgreement.policyK !== null && !rr.policyAgreement.agrees) {
      blockers.push(`reference ${rr.label}: policy K ${rr.policyAgreement.policyK.join('-')} differs from the table by more than ${K_TOLERANCE}`);
    }
  }
  const selected = new Set(cells.map((c) => c.caseId));
  const full = buildLandscapeMatrix({ seeds: LANDSCAPE_SEEDS });
  const notSelected = full.cases.map((c) => c.id).filter((id) => !selected.has(id));
  const unfinished = cells
    .filter((c) => c.runs.recorded < Math.max(c.runs.requested, LANDSCAPE_SEEDS))
    .map((c) => c.caseId);
  const incomplete = [...unfinished, ...notSelected];
  return {
    coverage: {
      cellsTotal: Math.max(full.cases.length, cells.length),
      cellsSelected: cells.length,
      cellsComplete: cells.length - unfinished.length,
      incompleteCells: incomplete,
      notSelectedCells: notSelected,
      boards: new Set(cells.map((c) => c.boardId)).size,
      runsRecorded: runs.filter((r) => r.probeKind === 'generation').length,
    },
    cells,
    referenceRows: rowResults,
    scoreByU: scoreGroups(sampled, (s) => s.U),
    scoreByArea: scoreGroups(sampled, (s) => s.A),
    profileSamples: sampled.length,
    blockers,
    outcome: blockers.length > 0 ? 'blocked' : incomplete.length > 0 ? 'incomplete' : 'calibration-criteria-met',
    note: 'Calibration evidence only: it changes no limit, level band or qualification gate. An unmet measured-row criterion is a blocker pending optimisation or an explicitly approved baseline correction.',
  };
}

/** @param {number} a @param {number} b */
const ratio = (a, b) => (b === 0 ? null : a / b);

/** @param {string[]} codes @returns {Record<string, number>} */
function violationCounts(codes) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const code of codes) {
    out[code] = (out[code] ?? 0) + 1;
  }
  return out;
}

/**
 * Criterion 3 for one reference row: maximum Node T10 of the row's reference cells against 2 x the measured maximum.
 * @param {ReferenceRow} r
 * @param {{ caseId: string, boardId: string | null, area: number, levelId: string, maxT10Ms: number | null,
 *   runs: { recorded: number, requested: number } }[]} cells
 */
function referenceResult(r, cells) {
  const label = `${r.level} ${r.aMin}-${r.aMax}`;
  const wanted = r.boards === null ? null : new Set(r.boards.map((b) => `${b.cols}x${b.rows}`));
  const matching = cells.filter((c) => c.levelId === r.level && c.area >= r.aMin && c.area <= r.aMax
    && (wanted === null || (c.boardId !== null && wanted.has(c.boardId))));
  const measured = matching.filter((c) => c.maxT10Ms !== null);
  const maxT10Ms = measured.length === 0 ? null : Math.max(...measured.map((c) => /** @type {number} */ (c.maxT10Ms)));
  const boundMs = T10_BOUND_FACTOR * r.nodeS * 1000;
  const done = matching.length > 0 && matching.every((c) => c.runs.recorded >= c.runs.requested);
  /** @type {'forecast-only' | 'baseline-review-required' | 'not-run' | 'partial' | 'pass' | 'fail'} */
  let status;
  if (r.boards === null) {
    status = 'forecast-only';
  } else if (maxT10Ms === null) {
    status = 'not-run';
  } else if (!r.comparable) {
    status = 'baseline-review-required';
  } else if (maxT10Ms > boundMs) {
    status = 'fail';
  } else {
    status = done ? 'pass' : 'partial';
  }
  return {
    label,
    level: r.level,
    areas: [r.aMin, r.aMax],
    boards: r.boards,
    nodeS: r.nodeS,
    nodeKind: r.nodeKind,
    boundMs: r.boards === null ? null : boundMs,
    maxT10Ms,
    cells: matching.map((c) => c.caseId),
    status,
    note: r.boards === null ? 'n/m forecast: not a timing acceptance bound' : r.note,
    policyAgreement: referencePolicyAgreement(r),
    planning: { browserPlanSeconds: r.planS, kind: r.planKind },
  };
}

/** @param {unknown} matrix @returns {string} Digest identifying a matrix for checkpoint compatibility. */
export const matrixDigest = (matrix) => sha256Hex(canonicalJson(matrix));

/**
 * Cells and boards must be valid inputs of the production generator; used by tests.
 * @returns {string[]} Problems; empty when every landscape board is valid and within the side limit.
 */
export function checkLandscapeBoards() {
  /** @type {string[]} */
  const problems = [];
  for (const b of landscapeBoards()) {
    const board = boardFromRows(b.boardRows);
    if (board.width > MAX_SIDE || board.height > MAX_SIDE) {
      problems.push(`${b.id} exceeds the side limit`);
    }
  }
  return problems;
}

/**
 * @param {ReturnType<typeof aggregateLandscape>} agg
 * @param {{ date: string, sourceCommit: string, sourceDigest: string, seeds: number, workers: number }} meta
 * @returns {string} Markdown (LF line ends).
 */
export function renderLandscapeMarkdown(agg, meta) {
  const L = [];
  L.push(`# Production-engine calibration landscape (${meta.date})`, '');
  L.push(`Outcome: **${agg.outcome}**. ${agg.note}`, '');
  L.push(`- Source commit: ${meta.sourceCommit}`, `- Source digest: ${meta.sourceDigest}`,
    `- Seeds per cell: ${meta.seeds} (the acceptance sample is ${LANDSCAPE_SEEDS}); Node workers: ${meta.workers}`,
    `- Coverage: ${agg.coverage.cellsComplete} of ${agg.coverage.cellsSelected} selected cells complete (${agg.coverage.cellsTotal} cells in the full landscape; `
    + `${agg.coverage.notSelectedCells.length} NOT RUN) on ${agg.coverage.boards} boards; `
    + `${agg.coverage.runsRecorded} timed runs; ${agg.profileSamples} diagnostic profile samples`, '');
  L.push('## Denominators and conditional statistics', '',
    '- Request in-band rate = runs with ten strictly distinct, validated, in-band puzzles / all non-interrupted runs of the cell.',
    '- T10 percentiles are conditional on those complete runs; `max T10` uses the response time of runs that never reached ten.',
    '- Sampled-profile in-band rate = diagnostic samples in the level band / all samples (every sample, accepted or not).',
    '- Profile latency is an RPC round trip of the canonical rating task, not worker CPU time.',
    '- Reference numbers are historical prototype measurements or forecasts (n/m); forecasts are not timing bounds.', '');
  L.push('## Cells', '',
    '| Cell | Area | Runs | Request in-band | T10 med* | T10 p95* | Max T10 | K obs | Policy K | Sampled in-band | Saturated | Criterion 1 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const pct = (/** @type {number | null} */ v) => (v === null ? 'n/a' : `${(v * 100).toFixed(0)}%`);
  const sec = (/** @type {number | null} */ v) => (v === null ? 'n/a' : `${(v / 1000).toFixed(1)} s`);
  for (const c of agg.cells) {
    const kObs = Object.keys(c.K.observed).join(',') || 'n/a';
    const pol = c.K.policyRange === null ? 'n/a' : c.K.policyRange.length === 0 ? 'none' : `${c.K.policyRange[0]}-${c.K.policyRange[c.K.policyRange.length - 1]}`;
    L.push(`| ${c.caseId} | ${c.area} | ${c.runs.recorded}/${c.runs.requested} | ${pct(c.requestInBandRate)} | `
      + `${sec(c.t10Conditional.median)} | ${sec(c.t10Conditional.p95)} | ${sec(c.maxT10Ms)} | ${kObs} | ${pol} | `
      + `${pct(c.sampledInBandRate)} | ${pct(c.saturation.sampledShare)} | ${c.criterion1.status} |`);
  }
  L.push('', '## Reference rows (criteria 2 and 3)', '',
    '| Row | Boards | Node ref max | 2x bound | Max T10 now | Status | Policy K vs table | Note |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of agg.referenceRows) {
    const pk = r.policyAgreement.policyK === null ? 'n/a' : `${r.policyAgreement.policyK.join('-')} (${r.policyAgreement.agrees ? 'agrees' : 'DIFFERS'})`;
    L.push(`| ${r.label} | ${r.boards === null ? 'n/m' : r.boards.map((b) => `${b.cols}x${b.rows}`).join(', ')} | `
      + `${r.nodeS} s (${r.nodeKind}) | ${sec(r.boundMs)} | ${sec(r.maxT10Ms)} | ${r.status} | ${pk} | ${r.note} |`);
  }
  L.push('', '## Score distributions of diagnostic profiles', '',
    '| Group | Key | n | min | median | p95 | max | in band | saturated |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [name, groups] of /** @type {const} */ ([['U', agg.scoreByU], ['area', agg.scoreByArea]])) {
    for (const g of groups) {
      L.push(`| ${name} | ${g.key} | ${g.n} | ${g.min} | ${g.median} | ${g.p95} | ${g.max} | ${pct(g.inBandShare)} | ${pct(g.saturatedShare)} |`);
    }
  }
  L.push('', '## Blockers', '');
  if (agg.blockers.length === 0) {
    L.push('None recorded in the completed cells.');
  }
  for (const b of agg.blockers) {
    L.push(`- ${b}`);
  }
  if (agg.coverage.incompleteCells.length > 0) {
    L.push('', '## Incomplete cells (not run, not selected, or below the requested seeds)', '', agg.coverage.incompleteCells.join(', '));
  }
  return `${L.join('\n')}\n`;
}
