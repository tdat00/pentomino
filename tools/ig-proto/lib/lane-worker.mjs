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
