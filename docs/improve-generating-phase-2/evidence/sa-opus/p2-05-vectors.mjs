// @ts-check
// SA-Opus scratch (review-1 R7): the literal vectors of P2-05, run on the frozen selector of the fr-frozen tree
// (tests/artifacts/ig-proto/tree-frozen/fr-frozen, read only). Synthetic ratings only (no real rating); the require
// cases run real uniqueness counts. It prints one JSON line per case with the observables P2-05 asserts.
// Usage (locked): Invoke-IgNode -Repo pentomino -Task 'SA-Opus P2-05 vectors' -NodeArgs @('docs\improve-generating-phase-2\evidence\sa-opus\p2-05-vectors.mjs')
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';

const TREE = resolve('tests/artifacts/ig-proto/tree-frozen/fr-frozen/core/engine');
const load = (/** @type {string} */ name) => import(pathToFileURL(join(TREE, name)).href);
const { selectCluesV4 } = await load('ig-select-v4.js');
const { activeCount, boardFromRows } = await load('board.js');
const { carveFlatSet, carveMacro, finalizeSet, validateSet } = await load('carve.js');
const { BUDGETS, DEDUCE, pieceCountRange } = await load('policy.js');
const { createRng, normalizeSeedText } = await load('rng.js');
const { createWorkspace, MAIN_WORKSPACE_BYTES } = await load('workspace.js');
const { IncompleteRatingError } = await load('difficulty.js');
const { level } = await load('levels.js');
const { clueKey } = await load('keys.js');

// The K = 15 set (self-test k15Set): 10x10, master, seed ig-selftest/proto/k15/1, attempt 0.
const board = boardFromRows(Array.from({ length: 10 }, () => '#'.repeat(10)));
const stream = createRng(normalizeSeedText('ig-selftest/proto/k15/1'), 'set/0');
const ks = pieceCountRange('master', activeCount(board));
const k = ks[stream.int(ks.length)];
const carved = (activeCount(board) / k >= 6.5 ? carveMacro(board, k, stream.derive('macro'), BUDGETS) : null)
  ?? carveFlatSet(board, k, stream.derive('flat'), BUDGETS);
const set = finalizeSet(board, carved.regions, carved.regionOf ?? null);
if (validateSet(set).length > 0 || set.pieces.length !== 15) {
  throw new Error('not the K = 15 set');
}
const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const BAND = Object.freeze({ id: 'st-band', min: 55, max: 70, share: 0.3 });
const NIGHTMARE = level('nightmare');
const synthetic = (/** @type {number} */ score, { work = 1, Gproved = 1, stop = 'exhausted' } = {}) => ({
  model: 'difficulty-v3', score, level: 'st', saturated: false,
  metrics: { work, censusWork: 0, nodes: 1, censusNodes: 0, searchStop: stop, Gproved, censusComplete: true },
});
const DOWN = (/** @type {number} */ c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c));
const capAll = () => 'cap';
const seamOf = (/** @type {(c: number) => any} */ fn, /** @type {any[]} */ calls, /** @type {string} */ kind) => (/** @type {any[]} */ clues) => {
  calls.push([kind, clues.length]);
  const r = fn(clues.length);
  if (r === 'cap') {
    throw new IncompleteRatingError('synthetic cap', { nodes: 1, work: DEDUCE.work, stop: 'work-cap' });
  }
  return r;
};

/** @param {string} name @param {Record<string, any>} spec */
function run(name, spec) {
  const { prior = null, screen, canon = screen, target = BAND, uniqueness = 'any', budget, W = 190000000, exclude, replay, throwCharge, throwRecord } = spec;
  /** @type {any[]} */
  const calls = [];
  /** @type {number[]} */
  const charges = [];
  /** @type {any[]} */
  const events = [];
  let error = null;
  let result = null;
  try {
    result = selectCluesV4({
      board, pieces: set.pieces, layout: set.witness, target, uniqueness,
      rng: createRng(normalizeSeedText('ig-selftest/proto/p1'), `selftest/${name}`),
      excludeClueKeys: exclude ?? new Set(), ws, igPrior: prior, igW: W,
      igScreen: seamOf(screen, calls, 'screen'), igCanonical: seamOf(canon, calls, 'canon'),
      ...(budget === undefined ? {} : { igBudget: budget }),
      ...(replay === undefined ? {} : { replaySkips: replay }),
      charge: (/** @type {number} */ u) => {
        charges.push(u);
        if (throwCharge !== undefined && charges.length === throwCharge) {
          throw new Error('charge-stop');
        }
      },
      record: (/** @type {any} */ ev) => {
        events.push(ev);
        if (throwRecord !== undefined && events.length === throwRecord) {
          throw new Error('record-stop');
        }
      },
    });
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  const rated = events.filter((ev) => ['rated', 'unrateable', 'rejected'].includes(ev.kind));
  const byPhase = {};
  for (const ev of rated) {
    (byPhase[ev.phase] ??= []).push(ev.clueIds.length);
  }
  const out = {
    name, error,
    ok: result?.ok ?? null, reason: result?.reason ?? null, igNoWindow: result?.igNoWindow ?? null,
    clueCount: result?.clues?.length ?? null, score: result?.rating?.score ?? null,
    igWindow: result?.igWindow ?? null, skips: result?.skips ?? null,
    probes: byPhase,
    kinds: rated.map((ev) => `${ev.phase}:${ev.clueIds.length}:${ev.kind}${ev.reason === undefined ? '' : `:${ev.reason}`}`),
    otherEvents: events.filter((ev) => !['rated', 'unrateable', 'rejected'].includes(ev.kind)).map((ev) => ev.kind),
    seamCalls: calls.map(([kind, c]) => `${kind}:${c}`),
    charges, chargeSum: charges.reduce((s, u) => s + u, 0),
  };
  console.log(JSON.stringify(out));
  return { result, calls };
}

console.log(JSON.stringify({ k15: { sizes: set.pieces.map((p) => p.cells.length).sort((a, b) => a - b), carving: set.carving }, nightmare: { min: NIGHTMARE.min, max: NIGHTMARE.max } }));
run('noprior', { screen: DOWN });
run('prior6', { prior: 6, screen: DOWN });
run('overwork', { screen: (c) => (c === 7 ? synthetic(30, { work: 190000001, stop: 'work-cap' }) : DOWN(c)), canon: DOWN });
run('ar1in', { screen: (c) => (c === 4 ? synthetic(60, { Gproved: 0 }) : DOWN(c)) });
run('below1', { screen: () => synthetic(30) });
run('above13', { screen: () => synthetic(90) });
run('confirmed', { screen: capAll, canon: () => synthetic(90) });
run('heuristic', { prior: 2, screen: capAll, canon: () => synthetic(90) });
run('rebracketed', { screen: capAll, canon: (c) => synthetic(100 - 10 * c) });
run('rescuedin', { screen: capAll, canon: (c) => synthetic(c === 13 ? 60 : 90) });
run('rescuedrefused', { screen: capAll, canon: (c) => (c === 13 ? synthetic(60, { Gproved: 0 }) : synthetic(90)) });
run('require-rebracketed', { uniqueness: 'require', screen: capAll, canon: (c) => synthetic(100 - 10 * c) });
run('require-down', { uniqueness: 'require', screen: DOWN });
run('throw-charge', { screen: capAll, canon: (c) => synthetic(100 - 10 * c), throwCharge: 3 });
run('throw-record', { screen: capAll, canon: (c) => synthetic(100 - 10 * c), throwRecord: 2 });
run('budget-any-54', { target: NIGHTMARE, screen: () => synthetic(54, { work: 100 }), budget: 250 });
run('budget-require-54', { target: NIGHTMARE, uniqueness: 'require', screen: () => synthetic(54, { work: 100 }), budget: 250 });
run('budget-require-65', { target: NIGHTMARE, uniqueness: 'require', screen: () => synthetic(65, { work: 100 }), budget: 150 });
run('budget-require-overshoot', { uniqueness: 'require', screen: DOWN, budget: 760010100 });
run('budget-require-overshoot', { uniqueness: 'require', screen: DOWN, budget: 760000003 });
run('budget-require-overshoot', { uniqueness: 'require', screen: DOWN, budget: 760000002 });
const first = run('skip-base', { screen: DOWN });
// The first probe's clue set: re-run with a capturing seam and exclude its key.
/** @type {any[] | null} */
let captured = null;
try {
  selectCluesV4({
    board, pieces: set.pieces, layout: set.witness, target: BAND, uniqueness: 'any',
    rng: createRng(normalizeSeedText('ig-selftest/proto/p1'), 'selftest/skip'), excludeClueKeys: new Set(), ws, igPrior: null, igW: 190000000,
    igScreen: (clues) => {
      captured ??= clues.slice();
      const r = DOWN(clues.length);
      if (r === 'cap') {
        throw new IncompleteRatingError('synthetic cap', { nodes: 1, work: DEDUCE.work, stop: 'work-cap' });
      }
      return r;
    },
    igCanonical: (clues) => {
      const r = DOWN(clues.length);
      if (r === 'cap') {
        throw new IncompleteRatingError('synthetic cap', { nodes: 1, work: DEDUCE.work, stop: 'work-cap' });
      }
      return r;
    },
  });
} catch {
  // the capture run only records the first clue set
}
const key = clueKey(board, set.pieces, captured);
const skipped = run('skip', { screen: DOWN, exclude: new Set([key]) });
run('skip-replay', { screen: DOWN, replay: skipped.result?.skips });
run('skip-replay-unused', { screen: DOWN, replay: { subsets: [...(skipped.result?.skips?.subsets ?? []), 2000], repairs: [] } });
console.log(JSON.stringify({ firstProbeClues: captured?.length ?? null, baseOk: first.result?.ok ?? null }));
