// @ts-check
// Recorded calls, screened and canonical ratings, window subsets (IGP-00 §5). Every function takes the engine of a
// tree (lib/engine.mjs), so the same code measures `base`, `instr`, `log` and the prototype trees.

const round3 = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;

/**
 * A rating under a lowered work limit `W`, built exactly as `rate()` builds it (difficulty.js).
 * @param {import('./engine.mjs').Engine} engine
 * @param {any} board
 * @param {any[]} pieces
 * @param {any[]} clues
 * @param {any} ws
 * @param {number} W Main-search work limit.
 * @returns {any}
 */
export function screenRating(engine, board, pieces, clues, ws, W) {
  const { measureV3, scoreV3, MODEL } = engine.difficulty;
  const { DEDUCE, SCORE } = engine.policy;
  const { metrics } = measureV3(board, pieces, clues, ws, { deduce: { ...DEDUCE, work: W }, dlx: SCORE.caps });
  const value = scoreV3(metrics);
  return {
    model: MODEL,
    score: value,
    level: engine.levels.levelForScore(value).id,
    saturated: false,
    ...(metrics.censusComplete ? {} : { censored: true }),
    metrics,
  };
}

/**
 * Outcome classes: capped, unsat, error; for a rating ar1, below, above, central or in; under a screen also scap0,
 * scap1 and over (see ig-log.js).
 * @param {import('./engine.mjs').Engine} engine
 * @param {{ count: number, rating: any, error: any, ms: number, ins: any, W: number | null, levelId: string | null,
 *   idx: number[] | null }} o
 * @returns {Record<string, any>}
 */
function toRecord(engine, { count, rating, error, ms, ins, W, levelId, idx }) {
  const { IncompleteRatingError, UnsatisfiableError } = engine.difficulty;
  const target = levelId === null ? null : engine.levels.level(levelId);
  const screen = W !== null && W < engine.policy.DEDUCE.work;
  /** @type {string} */
  let outcome;
  /** @type {string | null} */
  let side = null;
  let score = null;
  let ar1 = false;
  let mainWork = 0;
  let censusWork = 0;
  let nodes = 0;
  let censusNodes = 0;
  /** @type {string | null} */
  let stop = null;
  let flags = '';
  /** @type {Record<string, any>} */
  const extra = {};
  if (error === null) {
    const m = rating.metrics;
    score = rating.score;
    censusWork = m.censusWork;
    mainWork = m.work - m.censusWork;
    nodes = m.nodes;
    censusNodes = m.censusNodes;
    stop = m.searchStop;
    if (rating.censored === true) {
      flags += 'e';
    }
    if (target !== null) {
      side = score < target.min ? 'below' : score >= target.max ? 'above' : 'in';
      ar1 = target.min >= engine.levels.bandEdge(3) && m.Gproved === 0;
    }
    if (ar1) {
      flags += 'r';
    }
    if (side === null) {
      outcome = 'rated';
    } else if (ar1) {
      outcome = 'ar1';
    } else if (side === 'in') {
      const finite = Number.isFinite(target.max);
      const central = !finite || Math.abs(score - (target.min + target.max) / 2) <= (target.max - target.min) / 4;
      outcome = central ? 'central' : 'in';
    } else {
      outcome = side;
    }
    if (screen && mainWork > /** @type {number} */ (W)) {
      outcome = stop === 'work-cap' ? 'scap1' : 'over';
    }
    extra.rating = rating;
  } else if (error instanceof IncompleteRatingError) {
    outcome = screen ? 'scap0' : 'capped';
    mainWork = error.counters.work;
    nodes = error.counters.nodes;
    stop = error.counters.stop;
    extra.details = { nodes, work: mainWork, stop };
  } else if (error instanceof UnsatisfiableError) {
    outcome = 'unsat';
    extra.details = { message: error.message };
  } else {
    outcome = 'error';
    extra.details = { name: error?.name ?? 'Error', message: String(error?.message ?? error) };
  }
  return {
    idx,
    count,
    W,
    outcome,
    side,
    score,
    level: rating?.level ?? null,
    ar1,
    censored: rating?.censored === true,
    solutions: rating?.metrics?.solutions ?? null,
    mainWork,
    censusWork,
    workFirst: ins?.workFirst ?? null,
    nodesFirst: ins?.nodesFirst ?? null,
    nodes,
    censusNodes,
    stop,
    r7Cut: ins?.r7Cut ?? null,
    ms,
    flags,
    ...extra,
  };
}

/**
 * One rating attempt with its record; the rating or the error is returned as it was produced.
 * @param {import('./engine.mjs').Engine} engine
 * @param {{ board: any, pieces: any[], clues: any[], ws: any, W?: number | null, levelId?: string | null,
 *   idx?: number[] | null }} o
 * @returns {{ record: Record<string, any>, rating: any, error: any }}
 */
export function rateAttempt(engine, { board, pieces, clues, ws, W = null, levelId = null, idx = null }) {
  const take = engine.deduce.igTake;
  take?.();
  const t0 = performance.now();
  let rating = null;
  let error = null;
  try {
    rating = W === null ? engine.difficulty.rate(board, pieces, clues, ws) : screenRating(engine, board, pieces, clues, ws, W);
  } catch (e) {
    error = e;
  }
  const ms = round3(performance.now() - t0);
  const ins = take?.() ?? null;
  return { record: toRecord(engine, { count: clues.length, rating, error, ms, ins, W, levelId, idx }), rating, error };
}

/**
 * One canonical (no `W`) or screened rating and its record: the tuple fields of the logger by name, plus `level`,
 * `side` (against the band of `levelId`), `ar1` (refused by AR1), `censored`, `solutions`, `rating` or `details`.
 * The instrumentation fields are null on a tree without `igTake` (`base`).
 * @param {import('./engine.mjs').Engine} engine
 * @param {{ board: any, pieces: any[], clues: any[], ws: any, W?: number | null, levelId?: string | null,
 *   idx?: number[] | null }} o
 * @returns {Record<string, any>}
 */
export function rateRecord(engine, o) {
  return rateAttempt(engine, o).record;
}

/**
 * Today's `selectClues` of the tree on the witness (`uniqueness 'any'`, no exclusion) with a `rate` seam that records
 * every rating. On a `log` tree the logger's own tuple loses the instrumentation fields, because this seam consumes
 * `igTake()` first: use the `instr` tree for recorded calls.
 * @param {import('./engine.mjs').Engine} engine
 * @param {{ set: any, levelId: string, rng: any, ws: any, onProfile?: (record: Record<string, any>) => void }} o
 *   `set` is a PieceSet or a carve result holding one.
 * @returns {{ result: { ok: boolean, reason: string | null, clueCount: number | null, score: number | null },
 *   profiles: Record<string, any>[] }}
 */
export function recordedCall(engine, { set, levelId, rng, ws, onProfile }) {
  const pieceSet = set.set ?? set;
  const { board, pieces, witness } = pieceSet;
  /** @type {Record<string, any>[]} */
  const profiles = [];
  const seam = (/** @type {any} */ b, /** @type {any[]} */ p, /** @type {any[]} */ c, /** @type {any} */ w) => {
    const idx = c.map((clue) => witness.findIndex((/** @type {{ piece: string }} */ pose) => pose.piece === clue.piece));
    const { record, rating, error } = rateAttempt(engine, { board: b, pieces: p, clues: c, ws: w, levelId, idx });
    profiles.push(record);
    onProfile?.(record);
    if (error !== null) {
      throw error;
    }
    return rating;
  };
  const res = engine.clues.selectClues({
    board,
    pieces,
    layout: witness,
    target: engine.levels.level(levelId),
    rng,
    uniqueness: 'any',
    excludeClueKeys: new Set(),
    ws,
    rate: seam,
  });
  return {
    result: {
      ok: res.ok,
      reason: res.ok ? null : res.reason,
      clueCount: res.ok ? res.clues.length : null,
      score: res.ok ? res.rating.score : null,
    },
    profiles,
  };
}

/**
 * @param {import('./engine.mjs').Engine} engine
 * @param {string} levelId
 * @param {number} K
 * @returns {number} The clue count a search starts from.
 */
export const startCountFor = (engine, levelId, K) => engine.levels.initialClueCount(engine.levels.level(levelId).share, K);

/**
 * Subsets near the start count: for each `g = startCount + offset` within 1 to K - 2 and `s < perCount`, the first
 * `g` witness positions of a shuffle from the stream `ig/window/<g>/<s>` of the set's seed, sorted.
 * @param {import('./engine.mjs').Engine} engine
 * @param {{ set: any, seedText: string, offsets: number[], perCount: number, startCount: number }} o
 * @returns {{ g: number, s: number, offset: number, idx: number[], clues: any[] }[]}
 */
export function windowSubsets(engine, { set, seedText, offsets, perCount, startCount }) {
  const K = set.pieces.length;
  const { createRng, normalizeSeedText } = engine.rng;
  const out = [];
  for (const offset of offsets) {
    const g = startCount + offset;
    if (g < 1 || g > K - 2) {
      continue;
    }
    for (let s = 0; s < perCount; s += 1) {
      const rng = createRng(normalizeSeedText(seedText), `ig/window/${g}/${s}`);
      const idx = rng.shuffle(set.witness.map((/** @type {unknown} */ _, /** @type {number} */ i) => i)).slice(0, g)
        .sort((/** @type {number} */ a, /** @type {number} */ b) => a - b);
      out.push({ g, s, offset, idx, clues: idx.map((/** @type {number} */ i) => set.witness[i]) });
    }
  }
  return out;
}
