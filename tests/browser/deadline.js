// @ts-check
// Browser checks of the gen-v4 deadline wiring and its texts (P2-16b). The real generator app is mounted with a
// generation client and a worker pool whose clock runs 20x faster (`now = origin + 20 * elapsed`, timers divide delays
// by 20) while the production TIME constants stay unchanged. Sets and puzzles come from the real engine worker
// (core/workers/engine.worker.js) behind a page-side wrapper that scripts only plain failures and timing, and the
// client's `assemblyGate` holds the set or the batch assembly. The page runs one check with `?check=<name>` and all six
// without a parameter. Each check logs its start and end for the runner's watchdog. It writes the verdict into the page
// and sets data-result and data-summary on <html>. It is a developer fixture, not deployed.

import { createGenerationClient } from '../../core/browser/generation-client.js';
import { createPool, systemClock } from '../../core/browser/worker-pool.js';
import { packBoard, parsePack } from '../../core/engine/pack.js';
import { createGeneratorApp } from '../../generator/app.js';
import { setLocale, t } from '../../generator/i18n.js';
import { levelLabel } from '../../generator/strings.js';
import { mountGenerationSteps } from '../../generator/ui/generation-steps.js';
import { thumbnailCellPx } from '../../generator/ui/puzzle-panel.js';
import { scaledClock } from '../../tools/bench/runner.js';

const SCALE = 20;
const CHECK_LIMIT_MS = 60000;
const CHECKS = ['set-bound', 'batch-prefix', 'late-fence', 'fresh-after-pause', 'no-window-texts', 'screen-capped-step'];
const NO_WINDOW_COUNTERS = { budgetStops: 0, screenCapped: 0, rescueReratings: 0, tailReratings: 0 };
// D-P2-16's texts of `notice.N-NOSET.below`, with {level} to fill.
const NOSET_BELOW = {
  en: "Couldn't create a {level} piece set for this board: on the first four piece sets tried, the search went down to one clue without finding a {level} puzzle. Try again, choose another level, or change the board.",
  vi: 'Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, việc tìm kiếm đã giảm tới một mảnh đặt sẵn mà không tìm được đề mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn.',
};

const violations = /** @type {string[]} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));

const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const measured = /** @type {Record<string, any>} */ ({});

/**
 * Runs one check between a CHECK-START and a CHECK-END console line, which the runner's watchdog reads (GB-P5); a check
 * that runs past a minute fails.
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function check(name, fn) {
  console.log(`CHECK-START ${name}`);
  const started = performance.now();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  try {
    await Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`the check ran past ${CHECK_LIMIT_MS / 1000} s`)), CHECK_LIMIT_MS);
      }),
    ]);
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: String(/** @type {Error} */ (error)?.stack ?? error) });
  } finally {
    clearTimeout(timer);
  }
  const last = results[results.length - 1];
  const seconds = Math.round((performance.now() - started) / 100) / 10;
  console.log(`CHECK-END ${last.ok ? 'PASS' : 'FAIL'} ${seconds} s ${name}${last.ok ? '' : ` :: ${String(last.error).split('\n')[0].slice(0, 220)}`}`);
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
async function waitFor(test, what, timeoutMs = 30000) {
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

/**
 * What the wrapped worker and the assembly gate do for the running check.
 * @typedef {object} Mode
 * @property {(task: any) => { value: unknown } | 'hold' | undefined} [answer] A scripted reply, `'hold'` (never answer)
 *   or `undefined` (the real worker).
 * @property {{ kind: string, untilRealMs: number }} [delay] Buffers the real worker's replies to tasks of that kind until
 *   that `performance.now()` time.
 * @property {'set' | 'batch' | null} [hold] The assembly that never finishes.
 */
/** @type {Mode} */
let mode = {};

/** A module worker of the production engine behind the page-side wrapper. @returns {import('../../core/browser/worker-pool.js').WorkerLike} */
function wrappedWorker() {
  const real = new Worker(new URL('../../core/workers/engine.worker.js', import.meta.url), { type: 'module' });
  /** @type {Array<(event: any) => void>} */
  const listeners = [];
  /** @type {Map<unknown, string>} */
  const kinds = new Map();
  /** @param {any} event */
  const deliver = (event) => {
    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch (error) {
        console.log(`worker listener failed: ${String(error)}`);
      }
    }
  };
  real.addEventListener('message', (event) => {
    const { delay } = mode;
    if (delay !== undefined && kinds.get(event.data?.id) === delay.kind) {
      const wait = delay.untilRealMs - performance.now();
      if (wait > 0) {
        setTimeout(() => deliver(event), wait);
        return;
      }
    }
    deliver(event);
  });
  return {
    postMessage(message) {
      const task = /** @type {any} */ (message);
      if (task?.type === 'task') {
        kinds.set(task.id, String(task.kind));
        const answer = mode.answer?.(task);
        if (answer === 'hold') {
          return;
        }
        if (answer !== undefined) {
          queueMicrotask(() => deliver({ data: { type: 'result', id: task.id, value: answer.value } }));
          return;
        }
      }
      real.postMessage(message);
    },
    terminate() {
      real.terminate();
    },
    addEventListener(type, listener) {
      if (type === 'message') {
        listeners.push(listener);
      } else {
        real.addEventListener(type, listener);
      }
    },
  };
}

/** The pool, client, storage, DOM and app of one check. */
function mount() {
  const pool = createPool({ size: 4, workerFactory: wrappedWorker, clock });
  const client = createGenerationClient(pool, {
    clock,
    assemblyGate: (phase) => (phase === mode.hold ? new Promise(() => {}) : Promise.resolve()),
  });
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
    h('div', { class: 'main-actions' }, h('button', { type: 'button', 'data-slot': 'main-action' }, 'New piece set')));
  sandbox.append(root);
  const app = createGeneratorApp(document, {
    storage: /** @type {any} */ (storage),
    client,
    random: () => 'DEADLINE-SEED',
    controller: { cancelPending: () => pool.cancelAll() },
  });
  return {
    pool,
    client,
    app,
    root,
    state: () => app.store.getState(),
    q: (/** @type {string} */ selector) => /** @type {HTMLElement} */ (root.querySelector(selector)),
    destroy() {
      pool.close();
      app.destroy();
      root.remove();
    },
  };
}

/** @typedef {ReturnType<typeof mount>} Mounted */

/**
 * Makes the real piece set of a 10x6 Hard board.
 * @param {Mounted} m
 * @returns {Promise<any>} The set on show.
 */
async function realSet(m) {
  assert(m.app.editor.resize(10, 6), 'the board was resized to 10 x 6');
  const radio = /** @type {HTMLInputElement | null} */ (m.q('[data-field="level"] input[value="hard"]'));
  assert(radio !== null, 'the app offers a hard level radio on 10 x 6');
  radio.click();
  m.q('[data-action="generate-set"]').click();
  await waitFor(() => m.state().set !== null && m.state().job === null, 'the piece set', 30000);
  assert(m.state().notice === null, `no notice after the set: ${m.state().notice?.text}`);
  return m.state().set;
}

/**
 * Runs a check on its own app and mode, and destroys the app at the end.
 * @param {(m: Mounted) => Promise<void>} body
 * @returns {() => Promise<void>}
 */
function onApp(body) {
  return async () => {
    mode = {};
    const m = mount();
    try {
      await body(m);
    } finally {
      mode = {};
      m.destroy();
    }
  };
}

/**
 * Clicks an action and waits for its job to end.
 * @param {Mounted} m
 * @param {string} action The `data-action` value.
 * @param {string} label
 * @returns {Promise<{ t0: number, elapsed: number }>} `elapsed` is in real milliseconds from the click.
 */
async function pressAndWait(m, action, label) {
  const t0 = performance.now();
  m.q(`[data-action="${action}"]`).click();
  assert(m.state().job !== null, `${label}: the job started at the click`);
  await waitFor(() => m.state().job === null, `${label} to end`, 10000);
  const elapsed = performance.now() - t0;
  console.log(`DEADLINE ${label} elapsed ${Math.round(elapsed)} ms (${Math.round(elapsed * SCALE)} ms virtual)`);
  return { t0, elapsed };
}

/**
 * @param {number} elapsed
 * @param {number} min
 * @param {number} max
 * @param {string} what
 */
function within(elapsed, min, max, what) {
  assert(elapsed >= min && elapsed <= max, `${what}: elapsed ${Math.round(elapsed)} ms is outside ${min} to ${max} ms`);
}

const checkBodies = /** @type {Record<string, () => Promise<void>>} */ ({
  'set-bound': onApp(async (m) => {
    const before = await realSet(m);
    mode.hold = 'set';
    const { elapsed } = await pressAndWait(m, 'generate-set', 'set-bound');
    measured['set-bound'] = { elapsedMs: Math.round(elapsed) };
    within(elapsed, 5850, 6500, 'the 119 s guard');
    assert(m.state().notice?.code === 'N-NOSET', `notice ${m.state().notice?.code}`);
    assert(m.state().set === before, 'the set on show is the same object as before');
  }),

  'batch-prefix': onApp(async (m) => {
    await realSet(m);
    mode.hold = 'batch';
    const { elapsed } = await pressAndWait(m, 'new-puzzles', 'batch-prefix');
    const state = m.state();
    measured['batch-prefix'] = { elapsedMs: Math.round(elapsed), puzzles: state.puzzles.length, seenLayouts: state.seenLayouts.length };
    within(elapsed, 5850, 6500, 'the 119 s guard');
    assert(state.puzzles.length === 1, `${state.puzzles.length} puzzles are shown`);
    assert(state.seenLayouts.length === 1, `seenLayouts has ${state.seenLayouts.length} keys`);
    assert(state.notice?.code === 'N-PARTIAL', `notice ${state.notice?.code}`);
  }),

  'late-fence': onApp(async (m) => {
    const before = await realSet(m);
    let changes = 0;
    const unsubscribe = m.app.store.subscribe((state, previous) => {
      if (state.notice !== previous.notice) {
        changes += 1;
      }
    });
    try {
      const t0 = performance.now();
      mode.delay = { kind: 'setAttempt', untilRealMs: t0 + 7000 };
      m.q('[data-action="generate-set"]').click();
      assert(m.state().job !== null, 'the job started at the click');
      await waitFor(() => m.state().job === null, 'the set job to end', 10000);
      const elapsed = performance.now() - t0;
      console.log(`DEADLINE late-fence elapsed ${Math.round(elapsed)} ms (${Math.round(elapsed * SCALE)} ms virtual)`);
      within(elapsed, 5700, 6500, 'the 115 s stop');
      assert(m.state().notice?.code === 'N-NOSET', `notice ${m.state().notice?.code}`);
      await waitFor(() => performance.now() - t0 >= 8000, 'the 8 s mark', 9000);
      measured['late-fence'] = { elapsedMs: Math.round(elapsed), noticeChanges: changes };
      assert(changes === 1, `${changes} notice changes from the click to 8 s, not exactly one`);
      assert(m.state().set === before, 'the same set is on show');
      assert(m.state().job === null, 'no job is running at 8 s');
    } finally {
      unsubscribe();
    }
  }),

  'fresh-after-pause': onApp(async (m) => {
    await realSet(m);
    m.q('[data-action="new-puzzles"]').click();
    await waitFor(() => m.state().job === null, 'the first batch to end', 10000);
    assert(m.state().puzzles.length === 1, `the first batch made ${m.state().puzzles.length} puzzles`);
    const first = m.state().puzzles[0];
    await sleep(3000);
    mode.answer = (task) => (task.kind === 'puzzleCandidate' ? 'hold' : undefined);
    const { elapsed } = await pressAndWait(m, 'new-puzzles', 'fresh-after-pause');
    measured['fresh-after-pause'] = { elapsedMs: Math.round(elapsed) };
    within(elapsed, 5700, 6500, 'a fresh bound from the second click');
    assert(m.state().notice?.code === 'N-PARTIAL', `notice ${m.state().notice?.code}`);
    assert(m.state().puzzles.length >= 1 && m.state().puzzles[0].id === first.id, 'the first puzzle is still shown');
  }),

  'no-window-texts': onApp(async (m) => {
    assert(m.app.editor.resize(10, 6), 'the board was resized to 10 x 6');
    const radio = /** @type {HTMLInputElement | null} */ (m.q('[data-field="level"] input[value="hard"]'));
    assert(radio !== null, 'the app offers a hard level radio on 10 x 6');
    radio.click();
    mode.answer = (task) => (task.kind === 'setAttempt'
      ? (task.payload?.attempt < 4 ? { value: { ok: false, reason: 'no-window-below', counters: { ...NO_WINDOW_COUNTERS } } } : 'hold')
      : undefined);
    const fill = (/** @type {'en' | 'vi'} */ language) => NOSET_BELOW[language].replaceAll('{level}', levelLabel('hard'));
    try {
      const { elapsed } = await pressAndWait(m, 'generate-set', 'no-window-texts');
      measured['no-window-texts'] = { elapsedMs: Math.round(elapsed) };
      assert(elapsed <= 10000, `the job ended after ${Math.round(elapsed)} ms`);
      assert(m.state().notice?.code === 'N-NOSET', `notice ${m.state().notice?.code}`);
      assert(m.state().notice?.text === fill('en'), `English text: ${m.state().notice?.text}`);
      setLocale('vi', document);
      assert(m.state().notice?.text === fill('vi'), `Vietnamese text: ${m.state().notice?.text}`);
    } finally {
      setLocale('en', document);
    }
  }),

  'screen-capped-step': async () => {
    mode = {};
    const samplePack = /** @type {any} */ (parsePack(await (await fetch('../fixtures/generated-sample-pack.json')).text())).value;
    const sampleSet = {
      board: packBoard(samplePack), pieces: samplePack.pieces, witness: samplePack.witness ?? null, carving: 'flat', macroRegion: null,
    };
    const scriptedStep = (/** @type {number} */ stage, /** @type {string} */ kind, /** @type {Record<string, unknown>} */ args = {}) => ({
      stage, kind, board: { placed: [], lifted: [], clues: [] }, rating: null, breakdown: null, detail: null, band: null,
      note: `replay.step.${kind}`, args,
    });
    const first = samplePack.puzzles[0];
    const steps = [
      scriptedStep(1, 'count', { k: 9, min: 9, max: 9 }),
      scriptedStep(2, 'carve', { mode: 'flat', parts: 0 }),
      scriptedStep(3, 'piece', { n: 1 }),
      { ...scriptedStep(5, 'rated', { phase: 'locate', sequence: 1 }), rating: first.rating, board: { placed: [], lifted: [], clues: first.clues } },
      scriptedStep(5, 'unrateable', { phase: 'locate', sequence: 2, reason: 'screen-capped' }),
      scriptedStep(7, 'final', { status: 'matched', detailStep: null }),
    ];
    const result = {
      status: 'matched', reason: null, stages: { set: 'replayed', candidate: 'replayed', final: 'compared' }, compared: [], work: 0, steps,
    };
    const host = h('div');
    sandbox.append(host);
    const section = mountGenerationSteps(host, { t, run: async () => result, cache: undefined, cellPxOf: (board) => thumbnailCellPx(board, 240) });
    try {
      section.show({ set: sampleSet, puzzle: first, setOrigin: null, made: null }, { rotation: 0, busy: false });
      const element = section.element;
      const reveal = /** @type {HTMLButtonElement} */ (element.querySelector('button[data-action="steps-reveal"]'));
      if (reveal.getAttribute('aria-expanded') === 'false') {
        reveal.click();
      }
      await waitFor(() => element.dataset.phase === 'ready' || element.dataset.phase === 'failed', 'the replay', 50000);
      assert(element.dataset.phase === 'ready', `the replay answered (${element.dataset.phase})`);
      /** @type {HTMLElement} */ (element.querySelector('[data-field="steps-view-all"]')).click();
      const cellOf = (/** @type {string} */ kind, /** @type {string} */ cell) => {
        const found = /** @type {HTMLElement | null} */ (element.querySelector(`tr.steps-row[data-kind="${kind}"] td.${cell}`));
        assert(found !== null, `the ${kind} row has a ${cell} cell`);
        return /** @type {HTMLElement} */ (found);
      };
      const unrateableWhat = () => cellOf('unrateable', 'steps-what').textContent ?? '';
      measured['screen-capped-step'] = {
        unrateableWhat: unrateableWhat(),
        unrateableScore: cellOf('unrateable', 'steps-score').textContent,
        ratedWhat: cellOf('rated', 'steps-what').textContent,
      };
      assert(unrateableWhat().includes('It only guides the search; it has no score.'), `unrateable row: ${unrateableWhat()}`);
      // The cell shows `replay.table.unrateable` (N-P2-09-CELL): no score, and no digit.
      const noScore = (/** @type {string} */ language) => {
        const text = (cellOf('unrateable', 'steps-score').textContent ?? '').trim();
        assert(text === t('replay.table.unrateable'), `${language} unrateable score cell reads "${text}", not t('replay.table.unrateable')`);
        assert(text !== 'replay.table.unrateable' && !/\d/.test(text), `${language} unrateable score cell shows a key or a digit: "${text}"`);
      };
      noScore('English');
      assert((cellOf('rated', 'steps-what').textContent ?? '').includes('is rated to find how many clues this level needs: score'),
        `rated row: ${cellOf('rated', 'steps-what').textContent}`);
      try {
        setLocale('vi', document);
        section.refreshTexts();
        assert(unrateableWhat().includes('Kết quả chỉ định hướng việc tìm kiếm; không có điểm.'), `Vietnamese unrateable row: ${unrateableWhat()}`);
                noScore('Vietnamese');
      } finally {
        setLocale('en', document);
      }
    } finally {
      section.dispose();
      host.remove();
    }
  },
});

const requested = new URLSearchParams(location.search).get('check');
document.documentElement.dataset.result = 'running';
const names = requested === null ? CHECKS : [requested];
for (const name of names) {
  if (Object.hasOwn(checkBodies, name)) {
    await check(name, checkBodies[name]);
  } else {
    results.push({ name, ok: false, error: `unknown check: ${name}` });
    console.log(`CHECK-END FAIL 0 s ${name} :: unknown check`);
  }
}
if (violations.length > 0) {
  results.push({ name: 'content-security-policy', ok: false, error: violations.join('; ') });
}

const failed = results.filter((r) => !r.ok);
const list = /** @type {HTMLElement} */ (document.getElementById('results'));
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.ok ? '' : ` — ${r.error}`}`;
  li.className = r.ok ? 'pass' : 'fail';
  list.append(li);
}
/** @type {HTMLElement} */ (document.getElementById('report')).textContent = JSON.stringify({ scale: SCALE, measured, results }, null, 2);
const summary = /** @type {HTMLElement} */ (document.getElementById('summary'));
summary.textContent = failed.length === 0 ? `PASS ${results.length}/${results.length}` : `FAIL ${failed.length} of ${results.length}`;
/** @type {any} */ (window).__deadline = { measured, results };
document.documentElement.dataset.summary = summary.textContent;
document.documentElement.dataset.result = failed.length === 0 ? 'pass' : 'fail';
document.title = `${summary.textContent} - gen-v4 deadline checks`;
