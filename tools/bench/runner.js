// @ts-check
// Benchmark runner (design §8.7, §7.8; T21): matrix validation, run planning and
// ONE reusable case runner for Node and the browser. All environment access goes
// through an injected host adapter; every generation step is the production
// generation client, so no algorithm lives here. Rows are never dropped: a
// failed, cancelled or crashed run is recorded with its reason.
import { createGenerationClient, GenerationError } from '../../core/browser/generation-client.js';
import { isAbortError } from '../../core/browser/worker-pool.js';
import { activeCount, boardFromRows, validateForGeneration } from '../../core/engine/board.js';
import { inBand } from '../../core/engine/difficulty.js';
import { canonicalJson, sha256Hex } from '../../core/engine/hash.js';
import { clueKey, layoutKey } from '../../core/engine/keys.js';
import { level } from '../../core/engine/levels.js';
import { validatePack } from '../../core/engine/pack.js';
import { countPlacements, preparePlacements } from '../../core/engine/placements.js';
import { pieceCountRange } from '../../core/engine/policy.js';
import { createRng, normalizeSeedText } from '../../core/engine/rng.js';
import { isValidLayout } from '../../core/engine/tiling.js';
import { checkSetPolicy, initialG, SAMPLES_PER_COUNT, sampleCounts } from './calibration-reference.js';
import { newRunRecord, QUANTITY, runKey } from './report.js';

/** @typedef {import('../../core/browser/worker-pool.js').Clock} Clock */
/** @typedef {import('../../core/browser/worker-pool.js').Pool} Pool */
/** @typedef {import('../../core/browser/generation-client.js').SetJobResult} SetJobResult */
/** @typedef {import('../../core/browser/generation-client.js').BatchJobResult} BatchJobResult */
/** @typedef {import('./report.js').RunRecord} RunRecord */
/** @typedef {import('../../core/engine/types.js').Puzzle} Puzzle */
/** @typedef {import('../../core/engine/types.js').PieceSet} PieceSet */
/** @typedef {import('../../core/engine/types.js').Pose} Pose */

/**
 * @typedef {object} BenchCase
 * @property {string} id
 * @property {string[]} boardRows
 * @property {number} rotation
 * @property {string} levelId
 * @property {number} maxActive Candidate cap being qualified; passed to generation validation only.
 * @property {10} quantity
 * @property {'any'} uniqueness
 * @property {string} seedPrefix
 * @property {number} repetitions
 * @property {string[]} [seeds] Explicit set seeds, one per repetition.
 */

/**
 * @typedef {object} BenchMatrix
 * @property {1} version
 * @property {'smoke' | 'landscape' | 'BQ-0' | 'BQ-1' | 'BQ-2' | 'BQ-3'} profile
 * @property {BenchCase[]} cases
 */

/**
 * Environment adapter injected into the runner.
 * @typedef {object} Host
 * @property {'node' | 'browser'} kind
 * @property {string} platform
 * @property {string} browserOrNode
 * @property {number} workerCount
 * @property {'cold' | 'warm'} lifecycle
 * @property {string} sourceCommit
 * @property {string} sourceDigest
 * @property {Record<string, string>} versions
 * @property {Clock} clock
 * @property {(size: number, clock: Clock) => Pool} createPool
 * @property {import('./responsiveness.js').Monitor} responsiveness
 * @property {() => { stop: () => { bytes: number | null, notes: string[] } }} [processMemory] Begins whole-process memory tracking.
 * @property {(handler: () => void) => void} clickCancel Fires `handler` through the Cancel click path on the next main-thread turn.
 * @property {() => Promise<void>} [uiIdle] Resolves when the UI is idle again.
 * @property {boolean} [renderingEnabled]
 */

export const MIN_CAP = 30;
export const MAX_CAP = 676;
export const MAX_REPETITIONS = 1000;
export const CERTIFICATE_WAIT_MS = 30000;
const PROFILES = ['smoke', 'landscape', 'BQ-0', 'BQ-1', 'BQ-2', 'BQ-3'];
const CASE_ID = /^[A-Za-z0-9._-]{1,40}$/;

export class MatrixError extends Error {
  /** @param {{ path: string, message: string }[]} issues */
  constructor(issues) {
    super(`invalid benchmark matrix: ${issues[0]?.path}: ${issues[0]?.message}`);
    this.name = 'MatrixError';
    this.issues = issues;
  }
}

/**
 * Seed text of a repetition: the explicit `seeds[rep]` verbatim, else `<prefix>/<caseId>/<rep>`.
 * @param {BenchCase} c
 * @param {number} rep
 * @returns {string}
 */
export const seedFor = (c, rep) => c.seeds?.[rep] ?? `${c.seedPrefix}/${c.id}/${rep}`;

/**
 * Seed of an extra probe row (cancel, scaled watchdog): the first explicit seed, else `<prefix>/<caseId>/<kind>`.
 * @param {BenchCase} c
 * @param {string} kind
 * @returns {string}
 */
export const probeSeedFor = (c, kind) => c.seeds?.[0] ?? `${c.seedPrefix}/${c.id}/${kind}`;

/**
 * Checks every case before anything runs: area, side, connectivity, rotation,
 * offered level, quantity, uniqueness and seeds.
 * @param {unknown} input
 * @returns {{ ok: true, matrix: BenchMatrix, issues: [] } | { ok: false, matrix: null, issues: { path: string, message: string }[] }}
 */
export function checkMatrix(input) {
  /** @type {{ path: string, message: string }[]} */
  const issues = [];
  const add = (/** @type {string} */ path, /** @type {string} */ message) => issues.push({ path, message });
  const m = /** @type {Record<string, any>} */ (input);
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    add('$', 'the matrix must be an object');
  } else {
    if (m.version !== 1) {
      add('version', 'version must be 1');
    }
    if (!PROFILES.includes(m.profile)) {
      add('profile', `profile must be one of ${PROFILES.join(', ')}`);
    }
    if (!Array.isArray(m.cases) || m.cases.length === 0) {
      add('cases', 'cases must be a non-empty array');
    } else {
      const ids = new Set();
      m.cases.forEach((c, i) => checkCase(c, `cases[${i}]`, ids, add));
    }
  }
  return issues.length === 0
    ? { ok: true, matrix: /** @type {BenchMatrix} */ (input), issues: [] }
    : { ok: false, matrix: null, issues };
}

/**
 * @param {any} c
 * @param {string} at
 * @param {Set<string>} ids
 * @param {(path: string, message: string) => void} add
 */
function checkCase(c, at, ids, add) {
  if (typeof c !== 'object' || c === null || Array.isArray(c)) {
    add(at, 'a case must be an object');
    return;
  }
  if (typeof c.id !== 'string' || !CASE_ID.test(c.id)) {
    add(`${at}.id`, 'id must be 1-40 characters of letters, digits, ".", "_" or "-"');
  } else if (ids.has(c.id)) {
    add(`${at}.id`, `duplicate case id ${c.id}`);
  } else {
    ids.add(c.id);
  }
  let area = 0;
  try {
    const board = boardFromRows(c.boardRows);
    area = activeCount(board);
    const cap = Number.isInteger(c.maxActive) ? c.maxActive : MAX_CAP;
    for (const e of validateForGeneration(board, cap).errors) {
      add(`${at}.boardRows`, e.message);
    }
  } catch (e) {
    add(`${at}.boardRows`, e instanceof Error ? e.message : 'invalid board');
  }
  if (!Number.isInteger(c.rotation) || c.rotation < 0 || c.rotation >= 360 || c.rotation % 45 !== 0) {
    add(`${at}.rotation`, 'rotation must be 0, 45, ... or 315');
  }
  if (!Number.isInteger(c.maxActive) || c.maxActive < MIN_CAP || c.maxActive > MAX_CAP) {
    add(`${at}.maxActive`, `maxActive must be an integer from ${MIN_CAP} to ${MAX_CAP}`);
  }
  if (c.quantity !== QUANTITY) {
    add(`${at}.quantity`, `quantity must be ${QUANTITY}`);
  }
  if (c.uniqueness !== 'any') {
    add(`${at}.uniqueness`, 'uniqueness must be "any"');
  }
  try {
    const counts = area > 0 ? pieceCountRange(level(c.levelId).id, area) : [];
    if (area > 0 && (counts === null || counts.length === 0)) {
      add(`${at}.levelId`, `${c.levelId} is not offered for a board of ${area} cells`);
    }
  } catch {
    add(`${at}.levelId`, 'levelId is not a level id');
  }
  if (typeof c.seedPrefix !== 'string') {
    add(`${at}.seedPrefix`, 'seedPrefix must be a string');
  }
  if (!Number.isInteger(c.repetitions) || c.repetitions < 1 || c.repetitions > MAX_REPETITIONS) {
    add(`${at}.repetitions`, `repetitions must be an integer from 1 to ${MAX_REPETITIONS}`);
    return;
  }
  if (c.seeds !== undefined && (!Array.isArray(c.seeds) || c.seeds.length !== c.repetitions)) {
    add(`${at}.seeds`, 'seeds must be an array with one entry per repetition');
    return;
  }
  if (typeof c.id === 'string' && typeof c.seedPrefix === 'string') {
    const texts = [...Array.from({ length: c.repetitions }, (_, rep) => seedFor(c, rep)),
      probeSeedFor(c, 'cancel'), probeSeedFor(c, 'watchdog')];
    for (const text of texts) {
      try {
        if (typeof text !== 'string' || normalizeSeedText(text) !== text) {
          add(`${at}.seeds`, `seed "${String(text)}" is not normalized`);
          break;
        }
      } catch (e) {
        add(`${at}.seeds`, `seed "${String(text)}": ${e instanceof Error ? e.message : 'invalid'}`);
        break;
      }
    }
  }
}

/**
 * @param {unknown} input
 * @returns {BenchMatrix}
 */
export function validateMatrix(input) {
  const checked = checkMatrix(input);
  if (!checked.ok) {
    throw new MatrixError(checked.issues);
  }
  return checked.matrix;
}

/**
 * @typedef {object} RunSpec
 * @property {string} caseId
 * @property {number} rep
 * @property {string} seed
 * @property {'generation' | 'cancel' | 'scaled-watchdog'} probeKind
 * @property {number} [watchdogScale] Time compression of a scaled-watchdog row.
 */

/**
 * Ordered rows of a matrix: per case the repetitions, then one cancel probe;
 * optionally one scaled-watchdog row for the first case at the end.
 * @param {BenchMatrix} matrix
 * @param {{ cancelProbes?: boolean, watchdogScale?: number }} [options]
 * @returns {RunSpec[]}
 */
export function planRuns(matrix, options = {}) {
  /** @type {RunSpec[]} */
  const specs = [];
  for (const c of matrix.cases) {
    for (let rep = 0; rep < c.repetitions; rep += 1) {
      specs.push({ caseId: c.id, rep, seed: seedFor(c, rep), probeKind: 'generation' });
    }
    if (options.cancelProbes !== false) {
      specs.push({ caseId: c.id, rep: 0, seed: probeSeedFor(c, 'cancel'), probeKind: 'cancel' });
    }
  }
  if ((options.watchdogScale ?? 0) > 1 && matrix.cases.length > 0) {
    const c = matrix.cases[0];
    specs.push({ caseId: c.id, rep: 0, seed: probeSeedFor(c, 'watchdog'), probeKind: 'scaled-watchdog', watchdogScale: options.watchdogScale });
  }
  return specs;
}

/**
 * Clock whose time runs `factor` times faster (deadlines elapse sooner); virtual milliseconds.
 * @param {Clock} base
 * @param {number} factor
 * @returns {Clock}
 */
export function scaledClock(base, factor) {
  const origin = base.now();
  return {
    now: () => origin + (base.now() - origin) * factor,
    setTimeout: (fn, ms) => base.setTimeout(fn, ms / factor),
    clearTimeout: (handle) => base.clearTimeout(handle),
  };
}

/**
 * Largest model the request could build: placements of the empty-clue model (an
 * upper bound of every clue subset) and of each accepted puzzle; "nodes" are the
 * model's nonzeros. Counted outside the timed section.
 * @param {PieceSet['board']} board
 * @param {PieceSet['pieces']} pieces
 * @param {Pose[][]} clueSets
 * @returns {{ rows: number, nodes: number } | null}
 */
export function modelSize(board, pieces, clueSets) {
  let rows = -1;
  let nodes = -1;
  for (const clues of [[], ...clueSets]) {
    try {
      const counted = countPlacements(preparePlacements(board, pieces, clues));
      rows = Math.max(rows, counted.rows);
      nodes = Math.max(nodes, counted.nonzeros);
    } catch {
      // an unbuildable model is reported by the generation error itself
    }
  }
  return rows < 0 ? null : { rows, nodes };
}

/**
 * @typedef {{ index: number, puzzle: Puzzle, layoutKey: string, clueKey: string }} ValidPuzzle
 */

/**
 * Validates every accepted puzzle: valid complete layout, clues taken from it,
 * in-band rating, strictly distinct layouts and clue sets.
 * @param {PieceSet} set
 * @param {Puzzle[]} puzzles
 * @param {string} levelId
 * @returns {{ valid: ValidPuzzle[], problems: string[] }}
 */
export function validateAccepted(set, puzzles, levelId) {
  const target = level(levelId);
  const seenLayouts = new Set();
  const seenClues = new Set();
  const poseOf = (/** @type {Pose} */ p) => `${p.piece}:${p.x},${p.y},${p.turn},${p.mirrored}`;
  /** @type {ValidPuzzle[]} */
  const valid = [];
  /** @type {string[]} */
  const problems = [];
  puzzles.forEach((puzzle, index) => {
    const bad = (/** @type {string} */ why) => problems.push(`puzzle ${index + 1}: ${why}`);
    const { solution } = puzzle;
    if (solution === null || solution === undefined || !isValidLayout(set.board, set.pieces, solution)) {
      bad('the solution is not a valid complete layout');
      return;
    }
    const planted = new Set(solution.map(poseOf));
    if (puzzle.clues.length < 1 || puzzle.clues.length > set.pieces.length - 2 || !puzzle.clues.every((c) => planted.has(poseOf(c)))) {
      bad('the clues are not a proper subset of the solution');
      return;
    }
    if (puzzle.rating === null || !inBand(puzzle.rating, target)) {
      bad('the rating is outside the requested level band');
      return;
    }
    const lk = layoutKey(set.board, set.pieces, solution);
    const ck = clueKey(set.board, set.pieces, puzzle.clues);
    if (seenLayouts.has(lk)) {
      bad('the layout repeats an earlier puzzle (a clue-only variant)');
      return;
    }
    if (seenClues.has(ck)) {
      bad('the clue set repeats an earlier puzzle');
      return;
    }
    seenLayouts.add(lk);
    seenClues.add(ck);
    valid.push({ index, puzzle, layoutKey: lk, clueKey: ck });
  });
  return { valid, problems };
}

/** @type {WeakMap<Host, { pool: Pool, client: ReturnType<typeof createGenerationClient> }>} */
const warmState = new WeakMap();

/**
 * Releases a host's retained warm pool.
 * @param {Host} host
 */
export function releaseHost(host) {
  warmState.get(host)?.pool.close();
  warmState.delete(host);
}

/**
 * @param {Host} host
 * @param {'cold' | 'warm'} lifecycle
 * @param {Clock} clock
 */
function acquire(host, lifecycle, clock) {
  if (lifecycle === 'warm') {
    let state = warmState.get(host);
    if (state === undefined) {
      const pool = host.createPool(host.workerCount, host.clock);
      state = { pool, client: createGenerationClient(pool, { clock: host.clock }) };
      warmState.set(host, state);
    }
    return { ...state, owned: false };
  }
  const pool = host.createPool(host.workerCount, clock);
  return { pool, client: createGenerationClient(pool, { clock }), owned: true };
}

/** @param {unknown} e @returns {string} */
function errorCode(e) {
  const code = /** @type {{ code?: unknown }} */ (e)?.code;
  if (typeof code === 'string') {
    return code;
  }
  return isAbortError(e) ? String(/** @type {any} */ (e).reason) : 'internal';
}

/** @param {unknown} e @returns {string} */
const errorMessage = (e) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

/**
 * Diagnostic profile samples of a validated witness (landscape): distinct clue
 * counts, two seeded subsets each, canonical rating on a fresh pool. This runs
 * after the timed interval closed. `ratingMs` is the RPC round trip.
 * @param {{ host: Host, caseDef: BenchCase, set: PieceSet, seed: string, rep: number, record: RunRecord }} p
 * @returns {Promise<void>}
 */
async function sampleProfiles({ host, caseDef, set, seed, rep, record }) {
  const witness = set.witness;
  if (witness === null) {
    return;
  }
  const lv = level(caseDef.levelId);
  const K = set.pieces.length;
  const A = activeCount(set.board);
  const g0 = initialG(caseDef.levelId, K);
  /** @type {{ g: number, sample: number, clues: Pose[] }[]} */
  const jobs = [];
  for (const g of sampleCounts(K, g0)) {
    for (let sample = 0; sample < SAMPLES_PER_COUNT; sample += 1) {
      const rng = createRng(seed, `landscape/${caseDef.id}/${rep}/g/${g}/${sample}`);
      const picked = rng.shuffle(witness.map((_, i) => i)).slice(0, g).sort((a, b) => a - b);
      jobs.push({ g, sample, clues: picked.map((i) => witness[i]) });
    }
  }
  const pool = host.createPool(host.workerCount, host.clock);
  /** @type {Record<string, any>[]} */
  const samples = [];
  let failures = 0;
  try {
    pool.beginRequest({ requestId: 1, revision: 'profile-sampling' });
    let next = 0;
    const lane = async () => {
      while (next < jobs.length) {
        const job = jobs[next];
        next += 1;
        const started = host.clock.now();
        try {
          const rating = /** @type {import('../../core/engine/types.js').Rating} */ (await pool.run({
            requestId: 1,
            revision: 'profile-sampling',
            kind: 'rate',
            payload: { boardRows: caseDef.boardRows, pieces: set.pieces, clues: job.clues },
          }));
          samples.push({
            A, K, G: job.g, U: K - job.g, score: rating.score, inBand: inBand(rating, lv), saturated: rating.saturated,
            branchTrials: rating.metrics.branchTrials, rowTrials: rating.metrics.rowTrials,
            ratingMs: host.clock.now() - started, certificateStatus: 'not-checked', sample: job.sample,
          });
        } catch (e) {
          failures += 1;
          if (failures <= 3) {
            record.errors.push({ phase: 'sampling', code: errorCode(e), message: errorMessage(e) });
          }
        }
      }
    };
    await Promise.all(Array.from({ length: pool.size }, lane));
  } finally {
    pool.close();
  }
  samples.sort((a, b) => a.G - b.G || a.sample - b.sample);
  record.samples = samples;
  if (record.details !== null) {
    record.details.sampleFailures = failures;
  }
}

/**
 * @typedef {object} RunOptions
 * @property {boolean} [profileSampling] Landscape diagnostic sampling.
 * @property {number} [certificateWaitMs]
 * @property {(cancel: (() => void) | null) => void} [registerCancel] Receives a user-cancel function while the run is active.
 */

/**
 * Mutable state of one run, filled by the hooks of the generation client.
 * @typedef {object} RunState
 * @property {Puzzle[]} accepted
 * @property {number[]} acceptedAt
 * @property {Map<string, string>} certificates
 * @property {number} lastCertificateAt
 * @property {number} expectedCertificates
 * @property {(() => void) | null} wake
 * @property {boolean} userCancelled
 * @property {number | null} cancelAt
 * @property {boolean} cancelScheduled
 * @property {SetJobResult | null} set
 * @property {BatchJobResult | null} batch
 * @property {unknown} fault
 * @property {'set' | 'batch'} faultPhase
 * @property {number} t0
 * @property {number} tSet
 * @property {number} tDone
 * @property {number} tIdle
 */

/** @returns {RunState} */
const newState = () => ({
  accepted: [], acceptedAt: [], certificates: new Map(), lastCertificateAt: 0, expectedCertificates: 0, wake: null,
  userCancelled: false, cancelAt: null, cancelScheduled: false, set: null, batch: null, fault: null, faultPhase: 'set',
  t0: 0, tSet: 0, tDone: 0, tIdle: 0,
});

/**
 * The timed interval: Generate Piece Set click, set, then the immediate New Puzzles (10).
 * @param {RunState} s
 * @param {RunSpec} spec
 * @param {BenchCase} caseDef
 * @param {Host} host
 * @param {Clock} clock
 * @param {ReturnType<typeof createGenerationClient>} client
 */
async function generate(s, spec, caseDef, host, clock, client) {
  s.t0 = clock.now();
  try {
    const set = await client.generateSet({
      boardRows: caseDef.boardRows,
      rotation: caseDef.rotation,
      levelId: caseDef.levelId,
      seedText: spec.seed,
      uniqueness: caseDef.uniqueness,
      maxActive: caseDef.maxActive,
    });
    s.set = set;
    s.tSet = clock.now();
    if (set.status !== 'complete' || set.set === undefined) {
      return;
    }
    s.faultPhase = 'batch';
    s.batch = await client.generateBatch({
      set: set.set,
      rotation: caseDef.rotation,
      targetLevelId: caseDef.levelId,
      quantity: QUANTITY,
      setSeed: spec.seed,
      batchIndex: 1,
      uniqueness: caseDef.uniqueness,
      seenLayouts: [],
      seenClues: [],
      calibration: set.calibration,
      setLevel: caseDef.levelId,
      setAttempt: set.attempt,
    }, {
      onAccepted: (event) => {
        s.accepted.push(event.puzzle);
        s.acceptedAt.push(clock.now());
        if (spec.probeKind === 'cancel' && event.index === 0 && !s.cancelScheduled) {
          s.cancelScheduled = true;
          host.clickCancel(() => {
            s.cancelAt = clock.now();
            client.cancel();
          });
        }
      },
      onCertificate: (event) => {
        s.certificates.set(event.puzzleId, event.certificate.status);
        s.lastCertificateAt = clock.now();
        if (s.certificates.size >= s.expectedCertificates) {
          s.wake?.();
        }
      },
    });
  } catch (e) {
    s.fault = e;
  } finally {
    s.tDone = clock.now();
  }
}

/**
 * Waits (bounded) for the lazy certificates of the accepted puzzles.
 * @param {RunState} s
 * @param {Host} host
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function waitForCertificates(s, host, timeoutMs) {
  if (s.certificates.size >= s.expectedCertificates) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = host.clock.setTimeout(() => {
      s.wake = null;
      resolve();
    }, timeoutMs);
    s.wake = () => {
      host.clock.clearTimeout(timer);
      s.wake = null;
      resolve();
    };
  });
}

/**
 * Copies the outcome of a finished run into its record (everything after the timed interval).
 * @param {RunRecord} run
 * @param {RunState} s
 * @param {RunSpec} spec
 * @param {BenchCase} caseDef
 * @param {boolean} certificatesAwaited
 */
function fillRecord(run, s, spec, caseDef, certificatesAwaited) {
  const set = s.set?.set;
  const { valid: kept, problems } = set === undefined ? { valid: [], problems: [] } : validateAccepted(set, s.accepted, caseDef.levelId);
  run.firstReadyMs = s.set?.status === 'complete' ? s.tSet - s.t0 : null;
  run.responseMs = s.tDone - s.t0;
  run.acceptedCount = kept.length;
  run.ratingSaturatedCount = kept.filter((v) => v.puzzle.rating?.saturated === true).length;
  if (kept.length >= QUANTITY) {
    run.tenthReadyMs = s.acceptedAt[kept[QUANTITY - 1].index] - s.t0;
  }
  for (const problem of problems) {
    run.errors.push({ phase: 'validation', code: 'invalid-puzzle', message: problem });
  }
  if (s.batch?.pack !== undefined) {
    const checked = validatePack(s.batch.pack);
    if (!checked.ok) {
      run.errors.push({ phase: 'validation', code: 'invalid-pack', message: checked.issues[0]?.message ?? 'the pack is invalid' });
      run.acceptedCount = 0;
      run.tenthReadyMs = null;
    }
  }
  const counts = { unique: 0, multiple: 0, notProved: 0, notChecked: 0 };
  let settled = 0;
  for (const v of kept) {
    const status = s.certificates.get(v.puzzle.id);
    if (status === undefined) {
      counts.notChecked += 1;
      continue;
    }
    settled += 1;
    if (status === 'unique') {
      counts.unique += 1;
    } else if (status === 'multiple') {
      counts.multiple += 1;
    } else {
      counts.notProved += 1;
      if (status === 'unsatisfiable') {
        run.errors.push({ phase: 'certificates', code: 'unexpected-unsatisfiable', message: `puzzle ${v.index + 1} has a witness yet no solution` });
      }
    }
  }
  run.certificates = counts;
  run.certificatesSettledMs = certificatesAwaited && kept.length > 0 && settled === kept.length ? s.lastCertificateAt - s.t0 : null;

  if (s.fault !== null) {
    const code = s.fault instanceof GenerationError ? s.fault.code : 'internal';
    run.errors.push({ phase: s.faultPhase, code, message: errorMessage(s.fault) });
    run.partialReason = `error:${code}`;
  } else if (s.set !== null && s.set.status !== 'complete') {
    run.partialReason = s.set.status === 'cancelled' ? 'cancelled' : `set:${s.set.reason ?? 'failed'}`;
  } else if (s.batch !== null) {
    run.partialReason = s.batch.status === 'complete' ? null : s.batch.status === 'cancelled' ? 'cancelled' : (s.batch.reason ?? 'partial');
  }
  if (run.partialReason === 'cancelled' && spec.probeKind !== 'cancel') {
    run.interrupted = s.userCancelled;
  }
  if (run.partialReason === null && kept.length < QUANTITY && s.batch !== null) {
    run.partialReason = 'invalid-accepted';
  }
  if (spec.probeKind === 'cancel') {
    describeCancelProbe(run, s);
  }
  if (set !== undefined) {
    const size = modelSize(set.board, set.pieces, kept.map((v) => v.puzzle.clues));
    run.maxModelRows = size === null ? null : size.rows;
    run.maxModelNodes = size === null ? null : size.nodes;
    const sizes = set.pieces.map((p) => p.cells.length).sort((a, b) => a - b);
    const area = activeCount(set.board);
    run.details = {
      area,
      K: sizes.length,
      sizes,
      setAttempt: s.set?.attempt ?? null,
      initialG: initialG(caseDef.levelId, sizes.length),
      policy: { violations: checkSetPolicy(caseDef.levelId, area, sizes) },
      puzzles: kept.map((v) => ({
        G: v.puzzle.clues.length,
        U: sizes.length - v.puzzle.clues.length,
        score: v.puzzle.rating?.score ?? null,
        level: v.puzzle.rating?.level ?? null,
        saturated: v.puzzle.rating?.saturated ?? null,
      })),
      resultDigest: sha256Hex(canonicalJson({
        layoutKeys: kept.map((v) => v.layoutKey),
        clueKeys: kept.map((v) => v.clueKey),
        scores: kept.map((v) => v.puzzle.rating?.score ?? null),
      })),
    };
  }
}

/**
 * The cancel probe measures one thing: the Cancel handler to settled workers and idle UI.
 * @param {RunRecord} run
 * @param {RunState} s
 */
function describeCancelProbe(run, s) {
  if (s.cancelAt === null) {
    run.measurementValid = false;
    run.measurementNotes.push('Cancel was never triggered: no puzzle was accepted before the request ended');
    return;
  }
  run.cancelLatencyMs = s.tIdle - s.cancelAt;
  if (s.batch?.status !== 'cancelled') {
    run.measurementValid = false;
    run.measurementNotes.push('the request finished before Cancel took effect; the latency is not meaningful');
  } else if (run.acceptedCount < 1 || s.batch.pack === undefined) {
    run.measurementValid = false;
    run.measurementNotes.push('the accepted prefix was not preserved');
  }
}

/**
 * Runs one matrix row and returns its record. Never throws: every fault becomes
 * part of the record.
 * @param {RunSpec} spec
 * @param {BenchCase} caseDef
 * @param {Host} host
 * @param {RunOptions} [options]
 * @returns {Promise<RunRecord>}
 */
export async function runCase(spec, caseDef, host, options = {}) {
  const scale = spec.watchdogScale ?? 1;
  const lifecycle = spec.probeKind === 'scaled-watchdog' ? 'cold' : host.lifecycle;
  const run = newRunRecord({
    caseId: caseDef.id,
    seed: spec.seed,
    sourceCommit: host.sourceCommit,
    sourceDigest: host.sourceDigest,
    versions: host.versions,
    platform: host.platform,
    browserOrNode: host.browserOrNode,
    workerCount: host.workerCount,
    startedAt: new Date().toISOString(),
    probeKind: spec.probeKind,
    rep: spec.rep,
    lifecycle,
    renderingEnabled: host.renderingEnabled === true,
    measurementNotes: [lifecycle === 'warm'
      ? 'warm pool: workers and the accounted peak carry over from earlier runs'
      : 'cold pool: worker start-up is included'],
  });
  if (scale > 1) {
    run.measurementNotes.push(`scaled watchdog: the clock runs ${scale}x faster; all times are virtual milliseconds`);
  }
  const clock = scale > 1 ? scaledClock(host.clock, scale) : host.clock;
  const s = newState();
  /** @type {ReturnType<typeof acquire> | null} */
  let handle = null;
  /** @type {{ stop: () => { bytes: number | null, notes: string[] } } | null} */
  let memory = null;
  let monitoring = false;
  try {
    handle = acquire(host, lifecycle, clock);
    const { client } = handle;
    options.registerCancel?.(() => {
      s.userCancelled = true;
      client.cancel();
    });
    memory = host.processMemory?.() ?? null;
    host.responsiveness.start();
    monitoring = true;
    await generate(s, spec, caseDef, host, clock, client);
    if (spec.probeKind === 'cancel' && s.cancelAt !== null) {
      await host.uiIdle?.();
      s.tIdle = clock.now();
    }
    // The timed interval is closed: observer flushing and everything below stay outside T1/T10.
    const mainTask = host.responsiveness.stop();
    monitoring = false;
    run.mainTaskMethod = mainTask.method;
    run.maxMainTaskMs = mainTask.maxMainTaskMs;
    run.longTasksOver50 = mainTask.longTasksOver50;
    run.measurementValid = run.measurementValid && mainTask.valid;
    run.measurementNotes.push(...mainTask.notes);

    const awaited = s.batch?.status === 'complete' && spec.probeKind === 'generation' && scale === 1;
    s.expectedCertificates = awaited ? s.accepted.filter((p) => p.certificate === null || p.certificate === undefined).length : 0;
    await waitForCertificates(s, host, options.certificateWaitMs ?? CERTIFICATE_WAIT_MS);
    run.peakAccountedBytes = handle.pool.memory().peakBytes;
    if (lifecycle === 'warm') {
      run.measurementNotes.push('peakAccountedBytes is the pool high-water mark since the pool was created');
    }
    fillRecord(run, s, spec, caseDef, awaited);
    if (scale > 1) {
      run.measurementNotes.push(`real elapsed time ${Math.round(run.responseMs / scale)} ms; real scheduling and termination overhead is amplified ${scale}x in virtual time, so only the watchdog firing and the accepted prefix are meaningful`);
    }
  } catch (e) {
    run.errors.push({ phase: 'host', code: 'internal', message: errorMessage(e) });
    run.measurementValid = false;
    run.partialReason ??= 'error:internal';
    run.responseMs = Math.max(run.responseMs, s.tDone > 0 ? s.tDone - s.t0 : 0);
  } finally {
    options.registerCancel?.(null);
    if (monitoring) {
      host.responsiveness.stop();
    }
    if (handle !== null && handle.owned) {
      handle.pool.close();
    } else if (handle !== null && spec.probeKind === 'cancel') {
      handle.pool.recycle();
    }
  }
  try {
    const set = s.set?.set;
    if (options.profileSampling === true && set !== undefined && spec.probeKind === 'generation' && !s.userCancelled) {
      run.measurementNotes.push('landscape: diagnostic profile sampling ran after the timed interval; whole-process memory includes it');
      await sampleProfiles({ host, caseDef, set, seed: spec.seed, rep: spec.rep, record: run });
    }
  } catch (e) {
    run.errors.push({ phase: 'sampling', code: errorCode(e), message: errorMessage(e) });
  }
  if (memory === null) {
    run.measurementNotes.push('whole-process memory was not measured on this host');
  } else {
    const peak = memory.stop();
    run.peakProcessBytes = peak.bytes;
    run.measurementNotes.push(...peak.notes);
  }
  return run;
}

/**
 * @typedef {object} MatrixOptions
 * @property {RunSpec[]} [specs] Defaults to `planRuns(matrix, plan)`.
 * @property {Set<string>} [done] Row keys to skip (resume).
 * @property {() => boolean} [shouldStop]
 * @property {(spec: RunSpec, caseDef: BenchCase) => Promise<RunRecord>} [execute] Replaces `runCase` (fresh-process mode).
 * @property {(spec: RunSpec, index: number, total: number) => void} [onStart]
 * @property {(run: RunRecord, spec: RunSpec) => void | Promise<void>} [onRun]
 * @property {RunOptions} [run]
 * @property {{ cancelProbes?: boolean, watchdogScale?: number }} [plan]
 */

/**
 * Runs the rows sequentially. Stops early (keeping everything recorded) when `shouldStop` turns true.
 * @param {BenchMatrix} matrix
 * @param {Host} host
 * @param {MatrixOptions} [options]
 * @returns {Promise<RunRecord[]>}
 */
export async function runMatrix(matrix, host, options = {}) {
  const specs = options.specs ?? planRuns(matrix, options.plan);
  const byId = new Map(matrix.cases.map((c) => [c.id, c]));
  /** @type {RunRecord[]} */
  const runs = [];
  const runOptions = { profileSampling: matrix.profile === 'landscape', ...options.run };
  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i];
    if (options.shouldStop?.() === true) {
      break;
    }
    if (options.done?.has(`${spec.probeKind}|${spec.caseId}|${spec.rep}`) === true) {
      continue;
    }
    const caseDef = /** @type {BenchCase} */ (byId.get(spec.caseId));
    options.onStart?.(spec, i, specs.length);
    const run = await (options.execute === undefined ? runCase(spec, caseDef, host, runOptions) : options.execute(spec, caseDef));
    runs.push(run);
    await options.onRun?.(run, spec);
  }
  return runs;
}

export { runKey };
