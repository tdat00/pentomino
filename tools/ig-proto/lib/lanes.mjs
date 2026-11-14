// @ts-check
// Worker-thread lanes with admission and a supervisor (check-list §7 "Bounded invocations").
// `horizonS` is the invocation's horizon H, measured from the process start. With e the elapsed time:
//   - a `rate` job starts only when e + 30 s <= H; a job running longer than 30 s is a defect (cut and recorded);
//   - a `call` job starts only when e + 120 s <= H - 15 s; it is cut at H - 15 s, recorded `censored` with every
//     profile it had streamed, and its lane starts no further job in this invocation.
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { elapsedS } from './paths.mjs';
import { ensureTree } from './tree.mjs';

const WORKER_FILE = fileURLToPath(new URL('./lane-worker.mjs', import.meta.url));

export const DEFAULT_LIMITS = Object.freeze({ rateStartS: 30, rateCutS: 30, callMinRemainS: 120, callCutMarginS: 15 });

/**
 * @typedef {object} Lane
 * @property {number} index
 * @property {Worker} worker
 * @property {boolean} dead
 * @property {any} entry The running job: index, job, kind, startedS, profiles, windows, set.
 * @property {((msg: any) => void) | null} onMessage
 * @property {((code: number) => void) | null} onExit
 */

/**
 * @param {{ variant: string, size?: number, horizonS: number, limits?: Partial<typeof DEFAULT_LIMITS>,
 *   testKinds?: boolean }} o `limits` and `testKinds` are for the self-test.
 */
export async function createLanes({ variant, size = 4, horizonS, limits = {}, testKinds = false }) {
  const lim = { ...DEFAULT_LIMITS, ...limits };
  let horizon = horizonS;
  const tree = await ensureTree(variant);
  /** @type {Lane[]} */
  const lanes = [];
  const ready = [];
  for (let index = 0; index < size; index += 1) {
    const worker = new Worker(WORKER_FILE, { workerData: { treeRoot: tree.root, testKinds } });
    /** @type {Lane} */
    const lane = { index, worker, dead: false, entry: null, onMessage: null, onExit: null };
    ready.push(new Promise((resolve, reject) => {
      worker.on('message', (/** @type {any} */ msg) => {
        if (msg.type === 'ready') {
          resolve(msg.treeId);
        } else {
          lane.onMessage?.(msg);
        }
      });
      worker.on('error', reject);
      worker.on('exit', (code) => {
        reject(new Error(`lane ${index} exited with code ${code}`));
        lane.dead = true;
        lane.onExit?.(code);
      });
    }));
    lanes.push(lane);
  }
  const treeIds = await Promise.all(ready);
  for (const id of treeIds) {
    if (id !== tree.treeId) {
      throw new Error(`a lane loaded tree ${id}, expected ${tree.treeId}`);
    }
  }

  /**
   * Runs the jobs on the lanes in job order. A job that is not admitted, and every later one, stays `undefined`.
   * @param {({ kind: string } & Record<string, any>)[]} jobs
   * @returns {Promise<{ results: any[], done: boolean, defect: any }>}
   */
  function runAll(jobs) {
    const results = /** @type {any[]} */ (new Array(jobs.length).fill(undefined));
    let next = 0;
    let stop = false;
    let running = 0;
    /** @type {any} */
    let defect = null;
    return new Promise((resolve) => {
      /** @type {ReturnType<typeof setInterval> | undefined} */
      let timer;
      const isCall = (/** @type {string} */ kind) => kind === 'call' || kind === 'test-hold';
      const finish = () => {
        clearInterval(timer);
        for (const lane of lanes) {
          lane.onMessage = null;
          lane.onExit = null;
        }
        resolve({ results, done: results.every((r) => r !== undefined), defect });
      };
      const settle = (/** @type {Lane} */ lane, /** @type {any} */ value) => {
        results[lane.entry.index] = value;
        lane.entry = null;
        running -= 1;
      };
      const pump = () => {
        for (const lane of lanes) {
          if (lane.dead || lane.entry !== null) {
            continue;
          }
          if (stop || next >= jobs.length) {
            break;
          }
          const job = jobs[next];
          const e = elapsedS();
          const admitted = job.kind === 'rate' ? e + lim.rateStartS <= horizon
            : isCall(job.kind) ? e + lim.callMinRemainS <= horizon - lim.callCutMarginS : true;
          if (!admitted) {
            stop = true;
            break;
          }
          lane.entry = { index: next, job, kind: job.kind, startedS: e, profiles: [], windows: [], set: null };
          running += 1;
          const { kind, ...payload } = job;
          lane.worker.postMessage({ type: 'job', id: next, kind, payload });
          next += 1;
        }
        if (running === 0 && (stop || next >= jobs.length || lanes.every((l) => l.dead))) {
          finish();
        }
      };
      for (const lane of lanes) {
        lane.onMessage = (msg) => {
          const entry = lane.entry;
          if (entry === null || msg.id !== entry.index) {
            return;
          }
          if (msg.type === 'profile') {
            (msg.part === 'window' ? entry.windows : entry.profiles).push(msg.record);
          } else if (msg.type === 'set') {
            entry.set = msg.info;
          } else if (msg.type === 'result') {
            settle(lane, isCall(entry.kind) ? { ...msg.result, profiles: entry.profiles, windows: entry.windows } : msg.result);
            pump();
          } else if (msg.type === 'error') {
            settle(lane, { outcome: 'error', message: msg.message, profiles: entry.profiles, windows: entry.windows });
            pump();
          }
        };
        lane.onExit = (code) => {
          if (lane.entry !== null) {
            settle(lane, { outcome: 'error', message: `lane exited with code ${code}`, profiles: lane.entry.profiles, windows: lane.entry.windows });
          }
          pump();
        };
      }
      timer = setInterval(() => {
        const e = elapsedS();
        for (const lane of lanes) {
          const entry = lane.entry;
          if (entry === null) {
            continue;
          }
          if (entry.kind === 'rate' && e - entry.startedS > lim.rateCutS) {
            defect = { reason: `a rating job ran longer than ${lim.rateCutS} s`, job: entry.job };
            stop = true;
            lane.dead = true;
            lane.worker.terminate();
            settle(lane, { outcome: 'defect', ...defect });
          } else if (isCall(entry.kind) && e >= horizon - lim.callCutMarginS) {
            lane.dead = true;
            lane.worker.terminate();
            settle(lane, { outcome: 'censored', cutAtS: Math.round(e * 1000) / 1000, set: entry.set, profiles: entry.profiles, windows: entry.windows });
          }
        }
        pump();
      }, 100);
      pump();
    });
  }

  return {
    variant,
    size,
    treeId: tree.treeId,
    lanes,
    runAll,
    /** @param {number} seconds A new horizon, measured from the process start (the self-test shortens it). */
    setHorizon(seconds) {
      horizon = seconds;
    },
    async close() {
      await Promise.all(lanes.map((l) => l.worker.terminate()));
    },
  };
}
