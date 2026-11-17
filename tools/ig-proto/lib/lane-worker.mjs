// @ts-check
// The lane worker: one worker thread of lib/lanes.mjs. It loads one tree's engine, owns one main workspace and runs
// the jobs the host posts, one at a time. Profiles of a call are posted as they complete, so that the host keeps
// them when it cuts the call.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parentPort, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';

import { rateRecord, recordedCall, startCountFor, windowSubsets } from './calls.mjs';
import { loadEngine } from './engine.mjs';
import { firstCarvedSet, setInfo } from './sets.mjs';

const port = /** @type {import('node:worker_threads').MessagePort} */ (parentPort);
const engine = await loadEngine(workerData.treeRoot);
const ws = engine.workspace.createWorkspace(engine.workspace.MAIN_WORKSPACE_BYTES);

/** Blocks the thread for good (test jobs only): the supervisor has to terminate it. */
function hold() {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3600000);
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
