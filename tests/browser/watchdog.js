// @ts-check
// T23 scaled-watchdog wiring probe. The real generator app is mounted with a generation client and a
// worker pool whose clock runs 20x faster (`now = origin + 20 * elapsed`, timers divide delays by 20) while
// the production TIME constants stay unchanged. The set is made by real engine tasks; every
// `puzzleCandidate` task of the batch lands in a module worker that stays busy for 10 real seconds
// (watchdog-worker.js). The engine-verified calibration puzzle is the retained prefix. Expected: the
// 115 s virtual stop (5.75 real seconds) terminates the busy workers and the client hands the prefix
// back as a time-limit result by 6 real seconds (120 s virtual) with the UI idle again. This proves the
// browser wiring only; it is not a measured 120 s performance pass and has no part in BQ statistics.
// It writes the verdict into the page and sets data-result on <html>. It is a developer fixture, not deployed.

import { createGenerationClient } from '../../core/browser/generation-client.js';
import { createPool, systemClock } from '../../core/browser/worker-pool.js';
import { boardToRows, rectangle } from '../../core/engine/board.js';
import { TIME } from '../../core/engine/policy.js';
import { createGeneratorApp } from '../../generator/app.js';
import { scaledClock } from '../../tools/bench/runner.js';

const SCALE = 20;
const BUSY_REAL_MS = 10000;
const EXPECT_STOP_REAL_MS = TIME.dispatchStopMs / SCALE;
const EXPECT_RESPONSE_REAL_MS = TIME.responseMs / SCALE;
const violations = /** @type {string[]} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));

const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: String(/** @type {Error} */ (error)?.stack ?? error) });
  }
}

/**
 * @param {unknown} cond
 * @param {string} msg
 */
function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

const sleep = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {() => unknown} test
 * @param {string} what
 * @param {number} [timeoutMs]
 */
async function waitFor(test, what, timeoutMs = 60000) {
  const start = performance.now();
  while (!test()) {
    if (performance.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await sleep(20);
  }
}

const sandbox = /** @type {HTMLElement} */ (document.getElementById('sandbox'));
const h = (/** @type {string} */ tag, /** @type {Record<string, string>} */ attrs = {}, /** @type {(Node | string)[]} */ ...children) => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
};

const clock = scaledClock(systemClock, SCALE);
const realStart = systemClock.now();
const virtualNow = () => Math.round(clock.now() - realStart);

/** @type {{ index: number, tasks: string[], busyRealAt: number | null, terminatedRealAt: number | null, terminatedVirtualMs: number | null }[]} */
const workers = [];

/** Real module worker plus bookkeeping of the busy task and of `terminate()`. @returns {import('../../core/browser/worker-pool.js').WorkerLike} */
function trackedWorker() {
  const real = new Worker(new URL('./watchdog-worker.js', import.meta.url), { type: 'module' });
  const info = { index: workers.length, tasks: /** @type {string[]} */ ([]), busyRealAt: /** @type {number | null} */ (null), terminatedRealAt: /** @type {number | null} */ (null), terminatedVirtualMs: /** @type {number | null} */ (null) };
  workers.push(info);
  return {
    postMessage(message) {
      const task = /** @type {any} */ (message);
      if (task?.type === 'task') {
        info.tasks.push(String(task.kind));
        if (task.kind === 'puzzleCandidate' && info.busyRealAt === null) {
          info.busyRealAt = Math.round(systemClock.now());
        }
      }
      real.postMessage(message);
    },
    terminate() {
      if (info.terminatedRealAt === null) {
        info.terminatedRealAt = Math.round(systemClock.now());
        info.terminatedVirtualMs = Math.round(clock.now() - realStart);
      }
      real.terminate();
    },
    addEventListener: (type, listener) => real.addEventListener(type, listener),
  };
}

const pool = createPool({ size: 4, workerFactory: trackedWorker, clock });
const client = createGenerationClient(pool, { clock });

/** @type {Record<string, any>} */
const memoryStore = { generator: null };
const storage = {
  getGeneratorState: () => memoryStore.generator,
  setGeneratorState: (/** @type {unknown} */ snapshot) => {
    memoryStore.generator = JSON.parse(JSON.stringify(snapshot));
    return { ok: true };
  },
};

const root = h('div', { class: 'harness-app' },
  h('main', { class: 'layout' },
    h('section', { class: 'panel panel-board' }, h('div', { 'data-slot': 'board' })),
    h('section', { class: 'panel panel-level' }, h('div', { 'data-slot': 'level' })),
    h('section', { class: 'panel panel-set' }, h('div', { 'data-slot': 'set' })),
    h('section', { class: 'panel panel-puzzles' }, h('div', { 'data-slot': 'puzzles' }))),
  h('div', { class: 'main-actions' }, h('button', { type: 'button', 'data-slot': 'main-action' }, 'New Piece Set')));
sandbox.append(root);

const app = createGeneratorApp(document, {
  storage: /** @type {any} */ (storage),
  client,
  random: () => 'WATCHDOG-SEED',
  controller: { cancelPending: () => pool.cancelAll() },
});
const state = () => app.store.getState();
const q = (/** @type {string} */ selector) => /** @type {HTMLElement} */ (root.querySelector(selector));

let calibrationId = '';

/** @type {Record<string, any>} */
const probe = {
  scale: SCALE,
  time: { ...TIME },
  busyWorkerMs: BUSY_REAL_MS,
  expectedStopRealMs: EXPECT_STOP_REAL_MS,
  expectedResponseRealMs: EXPECT_RESPONSE_REAL_MS,
};

await check('production TIME constants are unchanged and the host clock is scaled 20x', async () => {
  assert(TIME.dispatchStopMs === 115000 && TIME.responseMs === 120000, `TIME ${JSON.stringify(TIME)}`);
  const a = clock.now();
  await sleep(200);
  const factor = (clock.now() - a) / 200;
  probe.measuredScaleFactor = Math.round(factor * 100) / 100;
  assert(factor > SCALE * 0.8 && factor < SCALE * 1.5, `clock factor ${factor}`);
});

await check('the real piece set and its engine-verified calibration puzzle are ready', async () => {
  assert(app.editor.resize(10, 6), 'the board was resized to 10 x 6');
  assert(JSON.stringify(boardToRows(state().board)) === JSON.stringify(boardToRows(rectangle(10, 6))), 'default board rows');
  const radio = /** @type {HTMLInputElement} */ (q('[data-field="level"] input[value="hard"]'));
  radio.click();
  q('[data-action="generate-set"]').click();
  await waitFor(() => state().set !== null && state().job === null, 'the piece set', 60000);
  assert(state().notice === null, `no notice after the set: ${state().notice?.text}`);
  probe.pieces = state().set?.pieces.length;
  assert(state().calibration !== null, 'the engine-verified calibration puzzle is held for the first batch');
  calibrationId = /** @type {any} */ (state().calibration).id;
  probe.calibrationPuzzleId = calibrationId;
});

await check('New Puzzle against busy workers: 115 s virtual stop terminates them and the prefix returns by 120 s virtual', async () => {
  app.store.update({ quantity: 10 });
  const t0 = systemClock.now();
  const virtual0 = clock.now();
  q('[data-action="new-puzzles"]').click();
  await waitFor(() => state().job !== null, 'the batch to start', 10000);
  probe.batchStartedVirtualMs = Math.round(clock.now() - virtual0);
  await waitFor(() => state().job === null, 'the batch to end', 15000);
  const realEnd = systemClock.now() - t0;
  probe.batchResponseRealMs = Math.round(realEnd);
  probe.batchResponseVirtualMs = Math.round((realEnd) * SCALE);
  const busy = workers.filter((w) => w.busyRealAt !== null);
  probe.workers = workers.map((w) => ({
    index: w.index,
    tasks: w.tasks.join(','),
    busyAfterBatchStartRealMs: w.busyRealAt === null ? null : Math.round(w.busyRealAt - t0),
    terminatedAfterBatchStartRealMs: w.terminatedRealAt === null ? null : Math.round(w.terminatedRealAt - t0),
    terminatedAfterBatchStartVirtualMs: w.terminatedRealAt === null ? null : Math.round((w.terminatedRealAt - t0) * SCALE),
  }));
  assert(busy.length >= 1, 'at least one worker received a busy puzzleCandidate task');
  for (const w of busy) {
    assert(w.terminatedRealAt !== null, `busy worker ${w.index} was terminated by the watchdog`);
    const real = /** @type {number} */ (w.terminatedRealAt) - t0;
    assert(real >= EXPECT_STOP_REAL_MS - 150, `worker ${w.index} terminated at ${Math.round(real)} real ms, before the 115 s virtual stop (${EXPECT_STOP_REAL_MS} ms)`);
    assert(real <= EXPECT_RESPONSE_REAL_MS, `worker ${w.index} terminated at ${Math.round(real)} real ms, after the 120 s virtual limit`);
    assert(real < BUSY_REAL_MS, `worker ${w.index} was stopped by the watchdog, not by finishing its busy loop`);
  }
  probe.firstTerminationVirtualMs = Math.min(...busy.map((w) => Math.round(((/** @type {number} */ (w.terminatedRealAt)) - t0) * SCALE)));
  assert(realEnd <= EXPECT_RESPONSE_REAL_MS, `the client answered after ${Math.round(realEnd)} real ms (limit ${EXPECT_RESPONSE_REAL_MS} ms = 120 s virtual)`);
});

await check('the retained prefix and the time-limit notice are shown and the UI is idle', async () => {
  const s = state();
  assert(s.puzzles.length >= 1, 'the accepted prefix is kept');
  assert(s.puzzles[0].id === calibrationId, 'the retained prefix is the engine-verified calibration puzzle');
  assert(s.puzzles.length < 10, 'busy workers delivered no new puzzle');
  assert(s.notice !== null && s.notice.code === 'N-PARTIAL', `partial / time-limit notice, got ${s.notice?.code}`);
  probe.noticeCode = s.notice?.code;
  probe.noticeText = s.notice?.text;
  probe.acceptedPrefix = s.puzzles.length;
  assert(s.job === null, 'no job is running');
  assert(!/** @type {HTMLButtonElement} */ (q('[data-action="new-puzzles"]')).disabled, 'New Puzzle is enabled again');
  assert(root.querySelectorAll('.puzzle-card').length === s.puzzles.length, 'one card per kept puzzle');
});

await check('no content-security-policy violations', async () => {
  assert(violations.length === 0, violations.join('; '));
});

pool.close();
app.destroy();
root.remove();

probe.virtualEndMs = virtualNow();
const failed = results.filter((r) => !r.ok);
const list = /** @type {HTMLElement} */ (document.getElementById('results'));
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.ok ? '' : ` — ${r.error}`}`;
  li.className = r.ok ? 'pass' : 'fail';
  list.append(li);
}
/** @type {HTMLElement} */ (document.getElementById('report')).textContent = JSON.stringify({ probe, results }, null, 2);
const summary = /** @type {HTMLElement} */ (document.getElementById('summary'));
summary.textContent = failed.length === 0 ? `PASS ${results.length}/${results.length}` : `FAIL ${failed.length} of ${results.length}`;
/** @type {any} */ (window).__watchdog = { probe, results };
document.documentElement.dataset.result = failed.length === 0 ? 'pass' : 'fail';
document.title = `${summary.textContent} - T23 scaled watchdog probe`;
