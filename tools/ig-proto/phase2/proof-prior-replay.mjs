// @ts-check
// Proof bundle 3, prior and replay (P2-12e; plan §7.2, review-1 R8, R10, R11; D-P2-07): on the diagnostic copy
// `p2-gen4-diag`, the calibration's window count travels from the client through the worker into the selector's start
// and into the stored record, and every accepted puzzle replays `matched`. Run by proofs.mjs:
//   node tools\ig-proto\phase2\proofs.mjs prior-replay --out <dir> [--quick]
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The copy of this bundle (D-P2-11: it offers Hell 1 on any area). */
const COPY = 'p2-gen4-diag';
const SOURCE = 'gen-v4';
const WORKERS = 4;
const QUANTITY = 4;
const SEEDS = 2;

export const VERSION_KEYS = Object.freeze(['algo', 'policy', 'rng', 'seedScheme', 'ratingModel', 'priorTable', 'screenTable']);
export const PRIOR_TABLE = 'prior-s3-v1';
export const SCREEN_TABLE = 'screen-v4-v1';

/** @type {readonly { cell: string, size: number, level: 'hell-1' | 'nightmare' }[]} */
const CELLS = Object.freeze([
  { cell: '14x14-hell-1', size: 14, level: 'hell-1' },
  { cell: '20x20-hell-1', size: 20, level: 'hell-1' },
  { cell: '14x14-nightmare', size: 14, level: 'nightmare' },
]);

/**
 * @typedef {object} RecordView One accepted puzzle of a seed.
 * @property {string} id
 * @property {string} kind `made.kind`.
 * @property {number | null} dispatched The `igPrior` of the dispatched payload of this candidate, or null (none dispatched, or none carried).
 * @property {number | null} stored `made.igPrior` (null when absent or null).
 * @property {Record<string, unknown> | null} versions `made.versions` of a candidate.
 * @property {string | null} replay The status `replayPuzzle` returned, or null when it was not replayed.
 */

/**
 * @typedef {object} SeedView What one seed measured.
 * @property {'hell-1' | 'nightmare'} level
 * @property {number} K Pieces of the set.
 * @property {number | null} expected The per-set prior the calibration yields on Hell 1; null on Nightmare or without one.
 * @property {{ slot: number, attempt: number, igPrior: number | null }[]} dispatches Every dispatched `puzzleCandidate` payload.
 * @property {RecordView[]} records
 * @property {Record<string, unknown> | null} setVersions `setOrigin.versions`.
 * @property {{ igPrior: number, K: number, count: number | null } | null} start The first locate event of the first Hell 1 candidate.
 */

/**
 * @param {{ status: string }[]} cases
 * @returns {'pass' | 'fail'} Pass only when there is a case and every case passes: a case that was not measured fails the bundle.
 */
export function bundleStatus(cases) {
  return cases.length > 0 && cases.every((c) => c.status === 'pass') ? 'pass' : 'fail';
}

/**
 * @param {string[]} problems
 * @param {string[]} gaps
 * @returns {'pass' | 'fail' | 'not-measured'}
 */
export function caseStatus(problems, gaps) {
  return problems.length > 0 ? 'fail' : gaps.length > 0 ? 'not-measured' : 'pass';
}

/**
 * @param {number} igPrior
 * @param {number} K
 * @returns {number} The clue count of the selector's first locate step (select-v4.js: the per-set override, clamped to 1 to K - 2).
 */
export const startCountOf = (igPrior, K) => Math.min(K - 2, Math.max(1, igPrior));

/**
 * @param {unknown} versions
 * @returns {string | null} The problem with a record's versions, or null.
 */
function versionsProblem(versions) {
  if (typeof versions !== 'object' || versions === null) {
    return 'no versions';
  }
  const keys = Object.keys(versions).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...VERSION_KEYS].sort())) {
    return `versions keys ${keys.join(',')}`;
  }
  const v = /** @type {Record<string, unknown>} */ (versions);
  if (v.priorTable !== PRIOR_TABLE || v.screenTable !== SCREEN_TABLE) {
    return `versions tables ${String(v.priorTable)}, ${String(v.screenTable)}`;
  }
  return null;
}

/**
 * Judges one seed of the prior-replay bundle.
 * @param {SeedView} view
 * @returns {{ status: 'pass' | 'fail' | 'not-measured', problems: string[], gaps: string[] }}
 */
export function judgeSeed(view) {
  /** @type {string[]} */
  const problems = [];
  /** @type {string[]} */
  const gaps = [];
  const hell = view.level === 'hell-1';
  const candidates = view.records.filter((r) => r.kind === 'candidate');
  if (view.records.length === 0) {
    gaps.push('no accepted puzzle');
  } else if (candidates.length === 0) {
    gaps.push('no ordinary candidate');
  }
  if (hell && view.expected === null) {
    gaps.push('the calibration gives no per-set prior');
  }
  if (candidates.length > 0 && view.dispatches.length === 0) {
    problems.push('no puzzleCandidate payload was dispatched');
  }
  for (const d of view.dispatches) {
    const want = hell ? view.expected : null;
    if (hell ? d.igPrior !== want : d.igPrior !== null) {
      problems.push(`dispatched ${d.slot}/${d.attempt}: igPrior ${d.igPrior}, expected ${want}`);
    }
  }
  for (const r of view.records) {
    if (r.kind === 'candidate') {
      const want = hell ? view.expected : null;
      if (r.stored !== r.dispatched || (want !== null || !hell) && r.stored !== want) {
        problems.push(`record ${r.id}: dispatched igPrior ${r.dispatched}, stored ${r.stored}, expected ${want}`);
      }
      const bad = versionsProblem(r.versions);
      if (bad !== null) {
        problems.push(`record ${r.id}: ${bad}`);
      }
    }
    if (r.replay !== 'matched') {
      problems.push(`record ${r.id}: replay ${r.replay === null ? 'not run' : r.replay}`);
    }
  }
  const bad = versionsProblem(view.setVersions);
  if (bad !== null) {
    problems.push(`set origin: ${bad}`);
  }
  if (hell && candidates.length > 0) {
    const s = view.start;
    if (s === null || s.count === null) {
      problems.push('start: no locate event');
    } else if (s.count !== startCountOf(s.igPrior, s.K)) {
      problems.push(`start: ${s.count} clues at the first locate step, expected ${startCountOf(s.igPrior, s.K)} for igPrior ${s.igPrior} and K ${s.K}`);
    }
  }
  return { status: caseStatus(problems, gaps), problems, gaps };
}

/** The sentinel record() throws once the first locate event is seen. */
class Seen extends Error {}

/**
 * @param {string} base The root of a copy.
 * @param {string} file A path under it, with `/`.
 * @returns {Promise<any>}
 */
export const moduleOf = (base, file) => import(pathToFileURL(join(base, ...file.split('/'))).href);

/**
 * Opens a copy's own client on its own pool and node worker factory. `run` of the pool is wrapped before the client
 * exists, so every dispatched payload is seen (R8).
 * @param {string} trees The copies' folder.
 * @param {string} source `gen-v4` or `today`.
 * @param {string} id The copy id.
 * @returns {Promise<{ base: string, client: any, dispatched: { kind: string, payload: any }[], close: () => void }>}
 */
export async function openCopy(trees, source, id) {
  const base = join(trees, source, id);
  const [{ createPool }, { createGenerationClient }, { nodeWorkerFactory }] = await Promise.all([
    moduleOf(base, 'core/browser/worker-pool.js'),
    moduleOf(base, 'core/browser/generation-client.js'),
    moduleOf(base, 'tools/node-worker.mjs'),
  ]);
  const pool = createPool({ size: WORKERS, workerFactory: nodeWorkerFactory() });
  /** @type {{ kind: string, payload: any }[]} */
  const dispatched = [];
  const wrapped = {
    ...pool,
    /** @param {any} task @param {any} [onProgress] */
    run: (task, onProgress) => {
      dispatched.push({ kind: task.kind, payload: task.payload });
      return pool.run(task, onProgress);
    },
  };
  return { base, client: createGenerationClient(wrapped), dispatched, close: () => pool.close() };
}

/**
 * @param {number} size
 * @returns {string[]} The rows of a full square board.
 */
export const squareRows = (size) => Array.from({ length: size }, () => '#'.repeat(size));

/**
 * The selector's first locate step of one candidate, run again on the copy's own modules with the candidate's own
 * context, slot, attempt and `igPrior` (R8). It stops at the first `rated` or `unrateable` locate event.
 * @param {string} base The copy's root.
 * @param {any} payload The dispatched `puzzleCandidate` payload.
 * @param {any} set The set of the batch.
 * @returns {Promise<number | null>} The clue count of that event, or null when there was none.
 */
async function firstLocateCount(base, payload, set) {
  const [generate, workspace] = await Promise.all([moduleOf(base, 'core/engine/generate.js'), moduleOf(base, 'core/engine/workspace.js')]);
  const ctx = {
    set,
    targetLevelId: payload.targetLevelId,
    quantity: payload.quantity,
    batchSeed: payload.batchSeed,
    uniqueness: payload.uniqueness,
    seenLayouts: new Set(payload.seenLayouts),
    seenClues: new Set(payload.seenClues),
    ...(payload.igPrior === undefined ? {} : { igPrior: payload.igPrior }),
    execution: { main: workspace.createWorkspace(workspace.MAIN_WORKSPACE_BYTES), scratch: workspace.createWorkspace(workspace.SCRATCH_WORKSPACE_BYTES) },
  };
  /** @type {number | null} */
  let count = null;
  const record = (/** @type {any} */ ev) => {
    if (ev.stage === 'clues' && (ev.kind === 'rated' || ev.kind === 'unrateable') && ev.phase === 'locate') {
      count = ev.clueIds.length;
      throw new Seen('first locate event');
    }
  };
  try {
    generate.puzzleCandidate(ctx, payload.slot, payload.attempt, { record });
  } catch (e) {
    if (!(e instanceof Seen)) {
      throw e;
    }
  }
  return count;
}

/**
 * @param {Record<string, any> | undefined} made
 * @returns {number | null}
 */
const storedOf = (made) => (typeof made?.igPrior === 'number' ? made.igPrior : null);

/**
 * Generates one seed on the diagnostic copy and measures it.
 * @param {Awaited<ReturnType<typeof openCopy>>} copy
 * @param {{ cell: string, size: number, level: 'hell-1' | 'nightmare' }} cell
 * @param {string} seed
 * @returns {Promise<{ gap: string } | { view: SeedView, accepted: number }>}
 */
async function measureSeed(copy, cell, seed) {
  const { client, base, dispatched } = copy;
  const gen = await moduleOf(base, 'core/engine/gen-v4.js');
  dispatched.length = 0;
  const made = await client.generateSet({
    boardRows: squareRows(cell.size), rotation: 0, levelId: cell.level, seedText: seed, uniqueness: 'any', maxActive: 676,
  });
  if (made.status !== 'complete' || made.set === undefined) {
    return { gap: `the set request ended ${made.status}${made.reason === undefined ? '' : ` (${made.reason})`}` };
  }
  const { set } = made;
  const expected = cell.level === 'hell-1' ? gen.perSetPrior(made.calibration, cell.level, 'any').igPrior ?? null : null;
  dispatched.length = 0;
  const batch = await client.generateBatch({
    set,
    rotation: 0,
    targetLevelId: cell.level,
    quantity: QUANTITY,
    setSeed: seed,
    batchIndex: 1,
    uniqueness: 'any',
    seenLayouts: [],
    seenClues: [],
    calibration: made.calibration,
    setLevel: cell.level,
    setAttempt: made.attempt,
    setOrigin: made.setOrigin,
  });
  const sent = dispatched.filter((d) => d.kind === 'puzzleCandidate').map((d) => d.payload);
  const records = await Promise.all(batch.accepted.map(async (/** @type {any} */ puzzle) => {
    const m = batch.made[puzzle.id];
    const payload = m?.kind === 'candidate' ? sent.find((p) => p.slot === m.slot && p.attempt === m.attempt) : undefined;
    const replay = await client.replayPuzzle({ set, puzzle, setOrigin: made.setOrigin, made: m ?? null });
    return {
      id: puzzle.id,
      kind: m?.kind ?? 'unknown',
      dispatched: typeof payload?.igPrior === 'number' ? payload.igPrior : null,
      stored: storedOf(m),
      versions: m?.kind === 'candidate' ? m.versions ?? null : null,
      replay: replay.status,
    };
  }));
  /** @type {SeedView['start']} */
  let start = null;
  const first = batch.accepted.map((/** @type {any} */ p) => batch.made[p.id]).find((/** @type {any} */ m) => m?.kind === 'candidate');
  const firstPayload = first === undefined ? undefined : sent.find((p) => p.slot === first.slot && p.attempt === first.attempt);
  if (cell.level === 'hell-1' && firstPayload !== undefined && typeof firstPayload.igPrior === 'number') {
    start = { igPrior: firstPayload.igPrior, K: set.pieces.length, count: await firstLocateCount(base, firstPayload, set) };
  }
  return {
    accepted: batch.accepted.length,
    view: {
      level: cell.level,
      K: set.pieces.length,
      expected,
      dispatches: sent.map((p) => ({ slot: p.slot, attempt: p.attempt, igPrior: typeof p.igPrior === 'number' ? p.igPrior : null })),
      records,
      setVersions: made.setOrigin?.versions ?? null,
      start,
    },
  };
}

/**
 * @param {boolean} quick
 * @returns {{ cell: string, size: number, level: 'hell-1' | 'nightmare', seed: string }[]} The requests: two seeds of each cell; with `quick` the first seed of the first cell of each level.
 */
export function requestsOf(quick) {
  const firsts = new Set(CELLS.filter((c, i) => CELLS.findIndex((o) => o.level === c.level) === i).map((c) => c.cell));
  return CELLS.filter((c) => !quick || firsts.has(c.cell)).flatMap((c) => Array.from({ length: quick ? 1 : SEEDS }, (_, i) => ({ ...c, seed: `p2-proof/${c.cell}/${i}` })));
}

/**
 * @param {{ out: string, quick: boolean, root: string, trees: string }} o
 * @returns {Promise<{ status: 'pass' | 'fail', cases: unknown[], counts: Record<string, unknown>, copies: string[] }>}
 */
export async function run({ quick, trees }) {
  const copy = await openCopy(trees, SOURCE, COPY);
  /** @type {any[]} */
  const cases = [];
  const counts = { seeds: 0, pass: 0, fail: 0, notMeasured: 0, accepted: 0, candidates: 0, replayed: 0, matched: 0, dispatched: 0 };
  try {
    for (const request of requestsOf(quick)) {
      const t0 = Date.now();
      /** @type {{ status: string, problems: string[], gaps: string[] }} */
      let verdict;
      /** @type {Record<string, unknown>} */
      let detail = {};
      try {
        const m = await measureSeed(copy, request, request.seed);
        if ('gap' in m) {
          verdict = { status: 'not-measured', problems: [], gaps: [m.gap] };
        } else {
          verdict = judgeSeed(m.view);
          detail = { K: m.view.K, expected: m.view.expected, dispatches: m.view.dispatches, records: m.view.records, start: m.view.start };
          counts.accepted += m.accepted;
          counts.candidates += m.view.records.filter((r) => r.kind === 'candidate').length;
          counts.replayed += m.view.records.filter((r) => r.replay !== null).length;
          counts.matched += m.view.records.filter((r) => r.replay === 'matched').length;
          counts.dispatched += m.view.dispatches.length;
        }
      } catch (e) {
        verdict = { status: 'fail', problems: [`error: ${e instanceof Error ? e.message : String(e)}`], gaps: [] };
      }
      counts.seeds += 1;
      if (verdict.status === 'pass') {
        counts.pass += 1;
      } else if (verdict.status === 'fail') {
        counts.fail += 1;
      } else {
        counts.notMeasured += 1;
      }
      cases.push({ case: 'prior-replay', cell: request.cell, seed: request.seed, ...verdict, ...detail, ms: Date.now() - t0 });
    }
  } finally {
    copy.close();
  }
  return { status: bundleStatus(cases), cases, counts, copies: [COPY] };
}
