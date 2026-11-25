// @ts-check
// The lane worker: one worker thread of lib/lanes.mjs. It loads one tree's engine, owns one main workspace and runs
// the jobs the host posts, one at a time. Profiles of a call are posted as they complete, so that the host keeps
// them when it cuts the call.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parentPort, Worker, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { rateRecord, recordedCall, startCountFor, windowSubsets } from './calls.mjs';
import { loadEngine } from './engine.mjs';
import { itemLedger } from './ledger.mjs';
import { preparePackPath, writePackFile } from './packs.mjs';
import { fixtureInput, limitsFor, memoryManifest, outcomeOf, workInputs } from './p7-core.mjs';
import { firstCarvedSet, setInfo } from './sets.mjs';

const port = /** @type {import('node:worker_threads').MessagePort} */ (parentPort);
const engine = await loadEngine(workerData.treeRoot);
const ws = engine.workspace.createWorkspace(engine.workspace.MAIN_WORKSPACE_BYTES);

/** Blocks the thread for good (test jobs only): the supervisor has to terminate it. */
function hold() {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3600000);
}

const sha256Hex = (/** @type {string} */ text) => createHash('sha256').update(text).digest('hex');
const round3 = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;
const treeUrl = (/** @type {string[]} */ ...parts) => pathToFileURL(join(workerData.treeRoot, ...parts)).href;
const sortedDistinct = (/** @type {unknown[]} */ values) => [...new Set(values)].sort();

/**
 * Starts the journal of this thread: the tree's logger writes `<row>.<pid>.<thread>.jsonl` into `logDir`, and a nested
 * worker thread copies the environment when it is created.
 * @param {string} logDir
 * @param {string} row
 */
function openJournal(logDir, row) {
  mkdirSync(logDir, { recursive: true });
  process.env.IG_LOG_DIR = logDir;
  process.env.IG_ROW = row;
}

function closeJournal() {
  delete process.env.IG_LOG_DIR;
  delete process.env.IG_ROW;
}

/** @param {string} dir @returns {any[]} Every line of the folder's `.jsonl` files: file order (by name), then line order. */
function readLogDir(dir) {
  return readdirSync(dir).filter((name) => name.endsWith('.jsonl')).sort()
    .flatMap((name) => readFileSync(join(dir, name), 'utf8').split('\n').filter((line) => line !== '').map((line) => JSON.parse(line)));
}

/**
 * A stage-1 selection item (V4-T04b): `selectClues` of the tree on the first carved set of a case, in one observer mode,
 * with its journal ledger and, in record mode, the detail counts of the recorded ratings.
 * @param {any} p `{ boardRows, levelId, seedText, mode, logDir, row, route }`; `mode` is absent (no caller hook),
 *   charge (a charge meter) or record (a charge meter and a recorder).
 * @param {(info: any) => void} postSet
 * @returns {any}
 */
function selectItem(p, postSet) {
  const { boardRows, levelId, seedText, mode, logDir, row, route } = p;
  if (!['absent', 'charge', 'record'].includes(mode)) {
    throw new Error(`unknown mode ${mode}`);
  }
  if (!['base', 'new', 'legacy', 'legacy-recorded'].includes(route)) {
    throw new Error(`unknown route ${route}`);
  }
  const carved = firstCarvedSet(engine, { boardRows, levelId, seedText });
  if (!carved.ok) {
    return { outcome: 'no-set', reason: carved.reason };
  }
  postSet(setInfo(carved));
  /** @type {number[]} */
  const chargeUnits = [];
  /** @type {any[]} */
  const events = [];
  /** @type {Record<string, any>} */
  const ctx = {
    board: carved.board,
    pieces: carved.set.pieces,
    layout: carved.set.witness,
    target: engine.levels.level(levelId),
    rng: engine.rng.createRng(engine.rng.normalizeSeedText(seedText), 'select'),
    uniqueness: 'require',
    excludeClueKeys: new Set(),
    ws,
    igStage: 'set',
  };
  if (mode !== 'absent') {
    ctx.charge = (/** @type {number} */ u) => {
      chargeUnits.push(u);
    };
  }
  if (mode === 'record') {
    ctx.record = (/** @type {any} */ ev) => {
      events.push(ev);
    };
  }
  openJournal(logDir, row);
  /** @type {any} */
  let res;
  let ms;
  try {
    const t0 = performance.now();
    res = engine.clues.selectClues(ctx);
    ms = round3(performance.now() - t0);
  } finally {
    closeJournal();
  }
  const ledger = route === 'base' ? null : itemLedger(readLogDir(logDir), route);
  const recording = mode === 'record';
  /** @type {any} */
  let detail = null;
  if (recording) {
    const scoredEvents = events.filter((ev) => ev.kind === 'rated' || ev.kind === 'rejected');
    const rated = events.filter((ev) => ev.kind === 'rated').length;
    const rejected = events.filter((ev) => ev.kind === 'rejected').length;
    const scored = rated + rejected;
    const rechecked = scoredEvents.slice(0, Math.min(2, scored)).map((ev) => {
      const clues = ev.clueIds.map((/** @type {string} */ id) => carved.set.witness.find((/** @type {{ piece: string }} */ pose) => pose.piece === id));
      const o = engine.difficulty.rateDetailed(carved.board, carved.set.pieces, clues, ws);
      return { sequence: ev.sequence, kind: ev.kind, equal: isDeepStrictEqual(o.rating, ev.rating) && isDeepStrictEqual(o.detail, ev.detail) };
    });
    detail = { rated, rejected, scored, missing: scoredEvents.filter((ev) => (ev.detail ?? null) === null).length, rechecked };
  }
  const sequences = events.map((ev) => ev.sequence).filter((s) => typeof s === 'number');
  return {
    outcome: 'ok',
    ok: res.ok,
    reason: res.ok ? null : res.reason,
    clues: res.ok ? res.clues.length : null,
    score: res.ok ? res.rating.score : null,
    skips: res.skips ?? null,
    igWindow: res.igWindow ?? null,
    digest: sha256Hex(JSON.stringify(res)),
    route,
    ledger,
    chargeUnits: mode === 'absent' ? null : chargeUnits,
    charges: mode === 'absent' ? null : chargeUnits.length,
    units: mode === 'absent' ? null : chargeUnits.reduce((sum, u) => sum + u, 0),
    events: recording ? events.length : null,
    eventsDigest: recording ? sha256Hex(JSON.stringify(events)) : null,
    eventKinds: recording ? sortedDistinct(events.map((ev) => ev.kind)) : null,
    eventPhases: recording ? sortedDistinct(events.map((ev) => ev.phase).filter((phase) => typeof phase === 'string')) : null,
    maxSequence: recording && sequences.length > 0 ? Math.max(...sequences) : null,
    detail,
    ms,
  };
}

/**
 * Adapts a Node Worker to the pool's Worker interface: a private copy of `adaptNodeWorker` of the tree's
 * tools/node-worker.mjs, which a lane worker never imports (loaded in any worker thread it wires the engine task
 * handler to `parentPort`); the nested worker is started from that file by path.
 * @param {Worker} worker
 */
function adaptWorker(worker) {
  return {
    postMessage: (/** @type {any} */ message) => worker.postMessage(message),
    terminate: () => {
      worker.terminate().catch(() => {});
    },
    addEventListener(/** @type {string} */ type, /** @type {(event: any) => void} */ listener) {
      if (type === 'message') {
        worker.on('message', (data) => listener({ data }));
      } else if (type === 'error') {
        worker.on('error', (error) => listener({ message: error?.message ?? 'worker error' }));
        worker.on('exit', (code) => listener({ message: `worker exited with code ${code}` }));
      } else if (type === 'messageerror') {
        worker.on('messageerror', () => listener({}));
      }
    },
  };
}

/**
 * A stage-1 generation item (V4-T04b): the set and batch 1 of a case through the tree's client, as
 * tools/record-fixtures.mjs `generateReplaySeed` builds them; its pack is written only after the batch returned one.
 * @param {any} p `{ boardRows, rotation, levelId, seedText, uniqueness, maxActive, quantity, packPath, logDir, row }`
 * @returns {Promise<any>}
 */
async function generateItem(p) {
  mkdirSync(p.logDir, { recursive: true });
  preparePackPath(p.packPath);
  const { createPool } = await import(treeUrl('core', 'browser', 'worker-pool.js'));
  const { createGenerationClient } = await import(treeUrl('core', 'browser', 'generation-client.js'));
  openJournal(p.logDir, p.row);
  /** @type {any} */
  let pool = null;
  try {
    pool = createPool({ size: 1, workerFactory: () => adaptWorker(new Worker(join(workerData.treeRoot, 'tools', 'node-worker.mjs'))) });
    const client = createGenerationClient(pool, { createdAt: () => '2026-01-01T00:00:00.000Z' });
    const set = await client.generateSet({
      boardRows: p.boardRows, rotation: p.rotation, levelId: p.levelId, seedText: p.seedText, uniqueness: p.uniqueness, maxActive: p.maxActive,
    });
    if (set.status !== 'complete') {
      return { outcome: 'no-set', setStatus: set.status, reason: set.reason ?? null };
    }
    const input = {
      set: set.set,
      rotation: p.rotation,
      targetLevelId: p.levelId,
      quantity: p.quantity,
      setSeed: p.seedText,
      uniqueness: p.uniqueness,
      setLevel: p.levelId,
      setAttempt: set.attempt,
      setOrigin: set.setOrigin,
    };
    const b1 = await client.generateBatch({ ...input, batchIndex: 1, seenLayouts: [], seenClues: [], calibration: set.calibration });
    if (b1.pack === undefined) {
      return { outcome: 'no-pack', batchStatus: b1.status, reason: b1.reason ?? null };
    }
    const packSha256 = writePackFile(p.packPath, b1.pack);
    return {
      outcome: 'ok',
      batchStatus: b1.status,
      reason: b1.reason ?? null,
      puzzles: b1.accepted.length,
      made: b1.accepted.map((/** @type {{ id: string }} */ puzzle) => b1.made[puzzle.id]?.kind ?? null),
      calibrationWindow: set.calibration?.igWindow ?? null,
      madeRecords: b1.accepted.map((/** @type {{ id: string }} */ puzzle) => b1.made[puzzle.id] ?? null),
      packSha256,
    };
  } finally {
    pool?.close();
    closeJournal();
  }
}

/** @type {Promise<{ pack: any, replay: any, scratch: any }> | null} */
let replayKit = null;

/** @returns {Promise<{ pack: any, replay: any, scratch: any }>} The tree's pack and replay modules and one scratch workspace, made at the first replay. */
function replayModules() {
  replayKit ??= (async () => ({
    pack: await import(treeUrl('core', 'engine', 'pack.js')),
    replay: await import(treeUrl('core', 'engine', 'replay.js')),
    scratch: engine.workspace.createWorkspace(engine.workspace.SCRATCH_WORKSPACE_BYTES),
  }))();
  return replayKit;
}

/**
 * A stage-1 replay item (V4-T04b): `replayPuzzle` of one puzzle of a written pack.
 * @param {any} p `{ packPath, puzzleIndex }`
 * @returns {Promise<any>}
 */
async function replayItem(p) {
  if (!existsSync(p.packPath)) {
    return { outcome: 'no-record', reason: 'no pack' };
  }
  const { pack: packModule, replay, scratch } = await replayModules();
  const text = readFileSync(p.packPath, 'utf8');
  const packSha256 = sha256Hex(text);
  const read = packModule.validatePack(JSON.parse(text));
  if (!read.ok) {
    throw new Error('the pack is not valid');
  }
  const pack = read.value;
  const puzzle = pack.puzzles[p.puzzleIndex];
  if (puzzle === undefined) {
    return { outcome: 'no-record', reason: 'no puzzle', packSha256 };
  }
  const input = {
    set: {
      board: engine.board.boardFromRows(pack.board.rows),
      pieces: pack.pieces,
      witness: pack.witness ?? null,
      carving: pack.generation.carving,
      macroRegion: pack.generation.macroRegion,
    },
    puzzle,
    generation: pack.generation,
  };
  const t0 = performance.now();
  const r = replay.replayPuzzle(input, { ws, scratch }, engine.policy.REPLAY);
  const ms = round3(performance.now() - t0);
  return {
    outcome: 'ok',
    kind: pack.generation.made?.[puzzle.id]?.kind ?? null,
    status: r.status,
    reason: r.reason,
    stages: r.stages,
    work: r.work,
    steps: r.steps.length,
    bytes: replay.utf8Length(JSON.stringify(r.steps)),
    detailStep: r.steps.at(-1)?.args?.detailStep ?? null,
    packSha256,
    ms,
  };
}

/** @type {Map<string, Promise<{ other: any, wsOther: any }>>} */
const otherKits = new Map();

/**
 * @param {string} root A tree root other than this thread's.
 * @returns {Promise<{ other: any, wsOther: any }>} That tree's engine and its own main workspace, made once per root.
 */
function otherKit(root) {
  let kit = otherKits.get(root);
  if (kit === undefined) {
    kit = (async () => {
      const other = await loadEngine(root);
      return { other, wsOther: other.workspace.createWorkspace(other.workspace.MAIN_WORKSPACE_BYTES) };
    })();
    otherKits.set(root, kit);
  }
  return kit;
}

/**
 * A kernel-probe item (V4-T10a): the complete deduction of one window subset of a case's first carved set, in this
 * thread's tree (`r4c`, with the R4 counters) and in the tree at `otherRoot` (`instr`), on the same model input, and
 * whether the two `DeductionResult`s are deeply equal. A thrown error is the result (its name and message).
 * @param {any} p `{ boardRows, levelId, seedText, subsetIndex, otherRoot }`
 * @returns {Promise<any>}
 */
async function kernelItem(p) {
  const { boardRows, levelId, seedText, subsetIndex, otherRoot } = p;
  const { other, wsOther } = await otherKit(otherRoot);
  const carved = firstCarvedSet(engine, { boardRows, levelId, seedText });
  if (!carved.ok) {
    return { outcome: 'no-set', reason: carved.reason };
  }
  const subsets = windowSubsets(engine, {
    set: carved.set, seedText, offsets: [1, 2, 3], perCount: 2, startCount: startCountFor(engine, levelId, carved.K),
  });
  const subset = subsets[subsetIndex];
  if (subset === undefined) {
    return { outcome: 'no-subset' };
  }
  const t0 = performance.now();
  const measure = (/** @type {any} */ t, /** @type {any} */ w) => {
    t.deduce.igTake();
    /** @type {any} */
    let res;
    try {
      const model = t.tiling.buildModel(carved.board, carved.set.pieces, subset.clues, w);
      res = t.deduce.measureDeduction(model, t.policy.DEDUCE);
    } catch (e) {
      res = { error: e instanceof Error ? e.name : typeof e, message: e instanceof Error ? e.message : String(e) };
    }
    return { res, ins: t.deduce.igTake() };
  };
  const mine = measure(engine, ws);
  const theirs = measure(other, wsOther);
  const same = isDeepStrictEqual(mine.res, theirs.res);
  return { outcome: 'ok', g: subset.g, idx: subset.idx, same, r4: mine.ins?.r4 ?? null, ms: round3(performance.now() - t0) };
}

/** @type {Map<string, Promise<any>>} */
const inputEngines = new Map();

/**
 * @param {string} root The input-construction tree's root.
 * @returns {Promise<any>} Its engine, loaded once per root (carving and window subsets need no workspace).
 */
function inputEngine(root) {
  let made = inputEngines.get(root);
  if (made === undefined) {
    made = loadEngine(root);
    inputEngines.set(root, made);
  }
  return made;
}

/**
 * The kernel input of a P7 item, constructed by the input-construction engine, never by this thread's or the reference's
 * (rule `kernel-window-v1`, as `kernelItem`).
 * @param {any} p `{ boardRows, levelId, seedText, subsetIndex, inputRoot }`
 * @returns {Promise<{ input: { boardRows: string[], pieces: any[], clues: any[] } } | { failure: any }>}
 */
async function kernelInput(p) {
  const { boardRows, levelId, seedText, subsetIndex } = p;
  const maker = await inputEngine(p.inputRoot);
  const carved = firstCarvedSet(maker, { boardRows, levelId, seedText });
  if (!carved.ok) {
    return { failure: { outcome: 'no-set', reason: carved.reason } };
  }
  const subsets = windowSubsets(maker, {
    set: carved.set, seedText, offsets: [1, 2, 3], perCount: 2, startCount: startCountFor(maker, levelId, carved.K),
  });
  const subset = subsets[subsetIndex];
  if (subset === undefined) {
    return { failure: { outcome: 'no-subset' } };
  }
  return { input: { boardRows, pieces: carved.set.pieces, clues: subset.clues } };
}

/**
 * A P7 equality item (stages 2 to 4 pack, T03a): the complete `DeductionResult`, or the error, of the reference tree at
 * `otherRoot` and of this thread's tree on one input, under each setting of the item, and whether the two outcomes are
 * deeply equal. Sources: `kernel` (input from the input-construction tree), `pm4` (input in the payload), `memory` (one
 * fixture of the manifest), `memory-sequence` and `memory-capacity`.
 * @param {any} p `{ source, otherRoot, ... }`
 * @returns {Promise<any>}
 */
async function p7EqualItem(p) {
  const { other, wsOther } = await otherKit(p.otherRoot);
  const mainBytes = engine.workspace.MAIN_WORKSPACE_BYTES;
  const build = (/** @type {any} */ t, /** @type {any} */ w, /** @type {any} */ input) => t.tiling.buildModel(t.board.boardFromRows(input.boardRows), input.pieces, input.clues, w);
  const run = (/** @type {any} */ t, /** @type {any} */ w, /** @type {any} */ input, /** @type {any} */ limits, /** @type {Record<string, unknown>} */ diagnostics) => {
    const d = { ...diagnostics };
    const outcome = outcomeOf(() => t.deduce.measureDeduction(build(t, w, input), limits, d));
    return { outcome, representation: d.igRepresentation ?? null, listBytes: d.igListBytes ?? null, wsBytes: w.bytes(), capacityBytes: w.capacityBytes };
  };
  /** @type {string[]} */
  const compared = [];
  /** @type {string[]} */
  const skipped = [];
  /** @type {string[]} */
  const inapplicable = [];
  /** @type {any[]} */
  const differing = [];
  /** @type {any[]} */
  const steps = [];
  /**
   * Compares the two runs of one step and records it.
   * @param {string} label
   * @param {any} limits
   * @param {{ outcome: any }} reference
   * @param {ReturnType<typeof run>} candidate
   */
  const record = (label, limits, reference, candidate) => {
    const same = isDeepStrictEqual(reference.outcome, candidate.outcome);
    compared.push(label);
    if (!same && differing.length < 3) {
      differing.push({ setting: label, reference: reference.outcome, candidate: candidate.outcome });
    }
    steps.push({
      setting: label,
      same,
      representation: candidate.representation,
      listBytes: candidate.listBytes,
      wsBytes: candidate.wsBytes,
      capacityBytes: candidate.capacityBytes,
      memoryBytes: limits.memoryBytes,
      referenceError: 'error' in reference.outcome ? reference.outcome.error : null,
      candidateError: 'error' in candidate.outcome ? candidate.outcome.error : null,
    });
  };
  const finish = (/** @type {number | null} */ refBytes, /** @type {number} */ extraBytes) => ({
    outcome: 'ok',
    same: steps.every((s) => s.same),
    compared,
    skipped,
    inapplicable,
    differing,
    refBytes,
    extraBytes,
    steps,
  });

  if (p.source === 'memory-sequence' || p.source === 'memory-capacity') {
    const manifest = memoryManifest();
    const base = { ...engine.policy.DEDUCE, ...manifest.limits };
    const inputOf = (/** @type {string} */ id) => fixtureInput(/** @type {any} */ (manifest.fixtures.find((f) => f.id === id)));
    if (p.source === 'memory-sequence') {
      const wsRef = other.workspace.createWorkspace(mainBytes);
      const wsCand = engine.workspace.createWorkspace(mainBytes);
      for (const [i, step] of manifest.sequence.entries()) {
        const input = inputOf(step.fixture);
        const limits = { ...base, memoryBytes: step.memoryBytes };
        record(`seq-${i}`, limits, run(other, wsRef, input, limits, {}), run(engine, wsCand, input, limits, {}));
      }
    } else {
      for (const [i, entry] of manifest.capacity.entries()) {
        const input = inputOf(entry.fixture);
        const limits = { ...base, memoryBytes: entry.memoryBytes };
        record(`cap-${i}`, limits, run(other, other.workspace.createWorkspace(entry.capacityBytes), input, limits, {}),
          run(engine, engine.workspace.createWorkspace(entry.capacityBytes), input, limits, {}));
      }
    }
    return finish(null, 0);
  }

  /** @type {any} */
  let input;
  /** @type {any} */
  let base;
  /** @type {number | null} */
  let refBytes = null;
  /** @type {{ outcome: any } | null} */
  let refCanonical = null;
  /** @type {{ refWork: number, refCensusWork: number } | null} */
  let work = null;
  const fresh = p.source === 'memory';
  if (fresh) {
    const f = memoryManifest().fixtures.find((x) => x.id === p.fixture);
    if (f === undefined) {
      return { outcome: 'error', reason: `fixture ${p.fixture} is not in the manifest` };
    }
    input = fixtureInput(f);
    base = { ...engine.policy.DEDUCE, ...memoryManifest().limits };
    const w = other.workspace.createWorkspace(mainBytes);
    const model = build(other, w, input);
    if (w.bytes() !== f.arenaBytes) {
      return { outcome: 'error', reason: `fixture ${f.id}: arenaBytes ${w.bytes()}, the manifest says ${f.arenaBytes}` };
    }
    const probe = outcomeOf(() => other.deduce.measureDeduction(model, { ...base, memoryBytes: 0 }));
    const seen = 'error' in probe && probe.error.code === 'model-too-large' && typeof probe.error.details?.bytes === 'number' ? probe.error.details.bytes : null;
    if (seen !== f.refBytes) {
      return { outcome: 'error', reason: `fixture ${f.id}: refBytes ${seen}, the manifest says ${f.refBytes}` };
    }
    refBytes = seen;
  } else if (p.source === 'kernel' || p.source === 'pm4') {
    if (p.source === 'kernel') {
      const made = await kernelInput(p);
      if ('failure' in made) {
        return made.failure;
      }
      input = made.input;
    } else {
      input = { boardRows: p.boardRows, pieces: p.pieces, clues: p.clues };
    }
    base = engine.policy.DEDUCE;
    refCanonical = run(other, wsOther, input, base, {});
    if ('result' in refCanonical.outcome) {
      work = workInputs(refCanonical.outcome.result);
    }
    const probe = outcomeOf(() => other.deduce.measureDeduction(build(other, wsOther, input), { ...base, memoryBytes: 0 }));
    if ('error' in probe && probe.error.code === 'model-too-large' && typeof probe.error.details?.bytes === 'number') {
      refBytes = probe.error.details.bytes;
    }
  } else {
    throw new Error(`unknown p7-equal source ${p.source}`);
  }
  const listBytes = outcomeOf(() => engine.deduce.igListBytes?.(build(engine, fresh ? engine.workspace.createWorkspace(mainBytes) : ws, input)) ?? 0);
  const extraBytes = 'result' in listBytes ? listBytes.result : 0;
  for (const setting of p.settings) {
    const workSetting = ['work-half', 'work-minus1', 'work-ref', 'census-half'].includes(setting);
    const memorySetting = ['mem-below', 'mem-ref', 'mem-fast'].includes(setting);
    if ((workSetting && work === null) || (memorySetting && refBytes === null)) {
      inapplicable.push(setting);
      continue;
    }
    const lim = limitsFor(setting, { base, refWork: work?.refWork, refCensusWork: work?.refCensusWork, refBytes, extraBytes });
    if (lim === null) {
      skipped.push(setting);
      continue;
    }
    const reference = setting === 'canonical' && refCanonical !== null
      ? refCanonical
      : run(other, fresh ? other.workspace.createWorkspace(mainBytes) : wsOther, input, lim.limits, lim.diagnostics);
    const candidate = run(engine, fresh ? engine.workspace.createWorkspace(mainBytes) : ws, input, lim.limits, lim.diagnostics);
    record(setting, lim.limits, reference, candidate);
  }
  return finish(refBytes, extraBytes);
}

/**
 * A P7 timing item (stages 2 to 4 pack, T03a): the rating of one kernel input in the reference tree and in this thread's
 * tree, each timed around `rate` alone; the order alternates with the round (even: reference first, odd: candidate first).
 * The input is constructed before any timing. A rating that threw `IncompleteRatingError` (a capped deduction path) is a timed
 * rating; any other thrown error is an item error.
 * @param {any} p `{ boardRows, levelId, seedText, subsetIndex, round, otherRoot, inputRoot }`
 * @returns {Promise<any>}
 */
async function p7TimeItem(p) {
  const { other, wsOther } = await otherKit(p.otherRoot);
  const made = await kernelInput(p);
  if ('failure' in made) {
    return made.failure;
  }
  const { boardRows, pieces, clues } = made.input;
  const rateOf = (/** @type {any} */ t, /** @type {any} */ w, /** @type {any} */ board) => {
    let ms = 0;
    /** @type {any} */
    let counters = null;
    const outcome = outcomeOf(() => {
      const t0 = performance.now();
      try {
        return t.difficulty.rate(board, pieces, clues, w);
      } catch (error) {
        counters = /** @type {any} */ (error)?.counters ?? null;
        throw error;
      } finally {
        ms = performance.now() - t0;
      }
    });
    return { outcome, ms, counters };
  };
  const refBoard = other.board.boardFromRows(boardRows);
  const candBoard = engine.board.boardFromRows(boardRows);
  /** @type {ReturnType<typeof rateOf>} */
  let reference;
  /** @type {ReturnType<typeof rateOf>} */
  let candidate;
  if (p.round % 2 === 0) {
    reference = rateOf(other, wsOther, refBoard);
    candidate = rateOf(engine, ws, candBoard);
  } else {
    candidate = rateOf(engine, ws, candBoard);
    reference = rateOf(other, wsOther, refBoard);
  }
  /** @param {ReturnType<typeof rateOf>} r @returns {boolean} A result, or a capped deduction path (RES-04). */
  const timed = (r) => 'result' in r.outcome || r.outcome.error?.name === 'IncompleteRatingError';
  /** @param {ReturnType<typeof rateOf>} r @returns {boolean} */
  const cappedOf = (r) => !('result' in r.outcome);
  if (timed(reference) && timed(candidate)) {
    return {
      outcome: 'ok',
      refMs: round3(reference.ms),
      candMs: round3(candidate.ms),
      same: isDeepStrictEqual(reference.outcome, candidate.outcome) && isDeepStrictEqual(reference.counters, candidate.counters),
      capped: cappedOf(reference) && cappedOf(candidate) ? 'both' : cappedOf(reference) || cappedOf(candidate) ? 'one' : 'none',
    };
  }
  return { outcome: 'error', reason: 'a rating threw', reference: reference.outcome, candidate: candidate.outcome };
}

/**
 * @param {string} kind
 * @param {any} p
 * @param {(part: string, record: any) => void} post
 * @param {(info: any) => void} postSet
 * @returns {Promise<any>}
 */
async function handle(kind, p, post, postSet) {
  if (kind === 'rate') {
    const board = engine.board.boardFromRows(p.boardRows);
    return rateRecord(engine, { board, pieces: p.pieces, clues: p.clues, ws, W: p.W ?? null, levelId: p.levelId ?? null, idx: p.idx ?? null });
  }
  if (kind === 'call') {
    const carved = firstCarvedSet(engine, { boardRows: p.boardRows, levelId: p.levelId, seedText: p.seedText, maxAttempts: p.maxAttempts });
    if (!carved.ok) {
      return { outcome: 'no-set', reason: carved.reason, failures: 'failures' in carved ? carved.failures : [] };
    }
    const info = setInfo(carved);
    postSet(info);
    const call = recordedCall(engine, { set: carved, levelId: p.levelId, rng: carved.calRng, ws, onProfile: (r) => post('call', r) });
    if (p.window !== undefined) {
      const startCount = startCountFor(engine, p.levelId, carved.K);
      const subsets = windowSubsets(engine, {
        set: carved.set, seedText: p.seedText, offsets: p.window.offsets, perCount: p.window.perCount, startCount,
      });
      for (const subset of subsets) {
        const record = rateRecord(engine, {
          board: carved.board, pieces: carved.set.pieces, clues: subset.clues, ws, levelId: p.levelId, idx: subset.idx,
        });
        post('window', { g: subset.g, s: subset.s, ...record });
      }
    }
    return { outcome: 'ok', set: info, result: call.result };
  }
  if (kind === 'v4-select') {
    return selectItem(p, postSet);
  }
  if (kind === 'v4-generate') {
    return generateItem(p);
  }
  if (kind === 'v4-replay') {
    return replayItem(p);
  }
  if (kind === 'v4-kernel') {
    return kernelItem(p);
  }
  if (kind === 'p7-equal') {
    return p7EqualItem(p);
  }
  if (kind === 'p7-time') {
    return p7TimeItem(p);
  }
  if (workerData.testKinds === true && kind === 'test-ok') {
    return { outcome: 'ok', echo: p.echo };
  }
  if (workerData.testKinds === true && kind === 'test-throw') {
    throw new Error('test-throw');
  }
  if (workerData.testKinds === true && (kind === 'test-hold' || kind === 'test-item')) {
    for (let i = 0; i < p.profiles; i += 1) {
      post('call', { synthetic: true, i });
    }
    hold();
    return { outcome: 'ok' };
  }
  if (workerData.testKinds === true && kind === 'test-journal') {
    const carved = firstCarvedSet(engine, { boardRows: p.boardRows, levelId: p.levelId, seedText: p.seedText });
    if (!carved.ok) {
      return { outcome: 'no-set' };
    }
    const log = await import(pathToFileURL(join(workerData.treeRoot, 'core', 'engine', 'ig-log.js')).href);
    const level = engine.levels.level(p.levelId);
    const call = log.startCall({
      igStage: 'set', igAttempt: carved.attempt, board: carved.board, pieces: carved.set.pieces, layout: carved.set.witness, target: level,
    });
    log.igPhase('p1');
    const subsets = windowSubsets(engine, {
      set: carved.set, seedText: p.seedText, offsets: [0], perCount: 2, startCount: startCountFor(engine, p.levelId, carved.K),
    });
    for (const subset of subsets) {
      log.recordRating(call, 'p1', subset.g, () => engine.difficulty.rate(carved.board, carved.set.pieces, subset.clues, ws), null);
    }
    hold();
    return { outcome: 'ok' };
  }
  throw new Error(`unknown job kind ${kind}`);
}

const info = JSON.parse(readFileSync(join(workerData.treeRoot, 'ig-tree.json'), 'utf8'));
port.postMessage({ type: 'ready', treeId: info.treeId });

port.on('message', async (/** @type {any} */ msg) => {
  if (msg.type !== 'job') {
    return;
  }
  try {
    const result = await handle(
      msg.kind,
      msg.payload,
      (part, record) => port.postMessage({ type: 'profile', id: msg.id, part, record }),
      (setInfoValue) => port.postMessage({ type: 'set', id: msg.id, info: setInfoValue }),
    );
    port.postMessage({ type: 'result', id: msg.id, result });
  } catch (e) {
    port.postMessage({ type: 'error', id: msg.id, message: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  }
});
