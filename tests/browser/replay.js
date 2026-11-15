// @ts-check
// Browser regression harness for Generation Steps ("How it was made", MP16b, gate GB-P4). Part A drives the real
// Generator with its real engine workers: a Hard set on the 10 x 6 board, two puzzles, the third button of the cards
// and the dialog of MP16a on a candidate card and on the calibration card. Part B mounts the dialog alone with scripted
// replays. `?phase=keys` runs only check 5, whose keys the runner presses (trusted keys, never synthetic events); the
// main phase runs every other check. It writes a pass/fail list into the page and sets data-result and data-summary on
// <html>. It is a developer fixture, not deployed.

import { PoolAbortError, PoolError } from '../../core/browser/worker-pool.js';
import { packBoard, parsePack } from '../../core/engine/pack.js';
import { createGeneratorApp } from '../../generator/app.js';
import { formatNumber, packOf, setLocale, t } from '../../generator/i18n.js';
import { createReplayDialog } from '../../generator/ui/replay-dialog.js';

const phase = new URLSearchParams(location.search).get('phase') ?? 'main';
const CHECK_LIMIT_MS = 60000;
document.documentElement.dataset.phase = phase;
document.documentElement.dataset.result = 'running';
setLocale('en');

const results = /** @type {Array<{ name: string, ok: boolean, seconds: number, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
const uncaught = /** @type {string[]} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
window.addEventListener('error', (e) => uncaught.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => uncaught.push(String(e.reason)));

/**
 * Runs one check, logging its start, and fails it when it takes longer than a minute.
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function check(name, fn) {
  console.log(`CHECK-START ${name}`);
  const started = performance.now();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const seconds = () => Math.round((performance.now() - started) / 100) / 10;
  try {
    await Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`the check ran past ${CHECK_LIMIT_MS / 1000} s`)), CHECK_LIMIT_MS);
      }),
    ]);
    results.push({ name, ok: true, seconds: seconds() });
  } catch (error) {
    results.push({ name, ok: false, seconds: seconds(), error: String(/** @type {Error} */ (error)?.stack ?? error) });
  } finally {
    clearTimeout(timer);
  }
  const last = results[results.length - 1];
  console.log(`CHECK-END ${last.ok ? 'PASS' : 'FAIL'} ${last.seconds} s ${name}${last.ok ? '' : ` :: ${String(last.error).split('\n')[0].slice(0, 220)}`}`);
}

/**
 * @param {unknown} cond
 * @param {string} msg
 * @returns {asserts cond}
 */
function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {string} msg
 */
function equal(a, b, msg) {
  assert(Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

const sleep = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @template T
 * @param {() => T} test
 * @param {string} what
 * @param {number} [timeoutMs]
 * @returns {Promise<NonNullable<T>>} The first truthy value of `test`.
 */
async function waitFor(test, what, timeoutMs = 50000) {
  const start = performance.now();
  for (;;) {
    const value = test();
    if (value) {
      return /** @type {NonNullable<T>} */ (value);
    }
    if (performance.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await sleep(25);
  }
}

/** Asks the runner to press a trusted key (a CDP key name, "Shift+" for a shifted one) and waits until it has. @param {string} key */
async function press(key) {
  document.documentElement.dataset.stage = `key-${key}`;
  await waitFor(() => document.documentElement.dataset.stage === `key-${key}-done`, `the runner to press ${key}`, 15000);
  delete document.documentElement.dataset.stage;
}

/** Asks the runner for a screenshot (saved as <name>.png in the run's evidence directory); a page without a runner just goes on. @param {string} name */
async function shot(name) {
  document.documentElement.dataset.stage = `shot-${name}`;
  await waitFor(() => document.documentElement.dataset.stage === `shot-${name}-done`, `the runner to take ${name}`, 4000).catch(() => null);
  delete document.documentElement.dataset.stage;
}

/**
 * @param {string} property
 * @param {string} value
 * @returns {string} What the browser computes for the value (a custom property is resolved).
 */
function computed(property, value) {
  const probe = document.createElement('span');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

const sandbox = /** @type {HTMLElement} */ (document.getElementById('sandbox'));
/** The code of the first puzzle of the Player sample (G1), whose claim is on the old scale and which has no record. */
const sampleCode = /** @type {string} */ ((await (await fetch('../fixtures/puzzlecode-v1.json')).json()).goldens[0].code);
const samplePack = /** @type {any} */ (parsePack(await (await fetch('../fixtures/generated-sample-pack.json')).text())).value;
const sampleSet = {
  board: packBoard(samplePack), pieces: samplePack.pieces, witness: samplePack.witness ?? null, carving: 'flat', macroRegion: null,
};

/**
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {...(Node | string)} children
 * @returns {HTMLElement}
 */
function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

function memoryStorage() {
  /** @type {unknown} */
  let saved = null;
  return {
    getGeneratorState: () => saved,
    setGeneratorState: (/** @type {unknown} */ snapshot) => {
      saved = JSON.parse(JSON.stringify(snapshot));
      return { ok: true };
    },
  };
}

let seedCounter = 0;

/**
 * The real Generator on the page's slots, with real workers.
 * @param {{ app?: Record<string, any>, quantity?: number, importButton?: boolean }} [o]
 */
function mountApp(o = {}) {
  const root = h('div', { class: 'harness-app' },
    h('main', { class: 'layout' },
      h('section', { class: 'panel panel-board' }, h('div', { 'data-slot': 'board' })),
      h('section', { class: 'panel panel-level' }, h('div', { 'data-slot': 'level' })),
      h('section', { class: 'panel panel-set' }, h('div', { 'data-slot': 'set' })),
      h('section', { class: 'panel panel-puzzles' }, h('div', { 'data-slot': 'puzzles' }))),
    h('div', { class: 'main-actions' }, h('button', { type: 'button', 'data-slot': 'main-action' }, 'New piece set')),
    ...(o.importButton === true ? [h('button', { type: 'button', 'data-action': 'import-puzzle' }, 'Import puzzle')] : []));
  sandbox.append(root);
  const app = createGeneratorApp(document, {
    storage: /** @type {any} */ (memoryStorage()),
    random: () => `HARN-${String((seedCounter += 1)).padStart(4, '0')}-SEED`,
    randomNumber: () => String(1000 + (seedCounter += 1)),
    ...o.app,
  });
  app.store.update({ quantity: o.quantity ?? 5 });
  return {
    root,
    app,
    destroy() {
      app.destroy();
      root.remove();
    },
  };
}

/** @typedef {ReturnType<typeof mountApp>} Ctx */

/**
 * @param {Ctx} ctx
 * @param {string} selector
 * @returns {HTMLElement}
 */
function q(ctx, selector) {
  const found = /** @type {HTMLElement | null} */ (ctx.root.querySelector(selector));
  assert(found, `missing ${selector}`);
  return found;
}

/**
 * @param {Ctx} ctx
 * @param {string} selector
 * @returns {HTMLElement[]}
 */
const qa = (ctx, selector) => /** @type {HTMLElement[]} */ ([...ctx.root.querySelectorAll(selector)]);

/** @param {Ctx} ctx */
const state = (ctx) => ctx.app.store.getState();

/**
 * @param {Ctx} ctx
 * @param {string} levelId
 */
function chooseLevel(ctx, levelId) {
  const radio = /** @type {HTMLInputElement} */ (q(ctx, `[data-field="level"] input[value="${levelId}"]`));
  assert(!radio.disabled, `${levelId} is offered`);
  radio.click();
}

/**
 * @param {Ctx} ctx
 * @param {string} selector
 * @param {string} value
 */
function setField(ctx, selector, value) {
  const input = /** @type {HTMLInputElement} */ (q(ctx, selector));
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// Part A: the real Generator -------------------------------------------------------------------------------------------

const SET_SEED = 'REPLAY-16B';
let batchNumber = 7000;

/**
 * @param {Ctx} ctx
 * @returns {{ id: string, kind: string | null }[]} The kind of each listed puzzle's record, oldest first.
 */
const kindsOf = (ctx) => state(ctx).puzzles.map((p) => ({ id: p.id, kind: /** @type {any} */ (state(ctx).puzzleMade)[p.id]?.kind ?? null }));

/**
 * Presses New puzzle and waits for the request to end.
 * @param {Ctx} ctx
 */
async function pressNewPuzzle(ctx) {
  const before = state(ctx).batchIndex;
  q(ctx, '[data-action="new-puzzles"]').click();
  await waitFor(() => state(ctx).batchIndex > before && state(ctx).job === null, 'the puzzles', 50000);
  // A certificate that arrives later redraws the card list, which drops the focus from a card button.
  await waitFor(() => state(ctx).checking.length === 0, 'the certificates', 40000);
}

/**
 * A Hard set on the 10 x 6 board with a fixed seed, then two puzzles.
 * @returns {Promise<Ctx>}
 */
async function makeRun() {
  const ctx = mountApp({ quantity: 2, app: { random: () => SET_SEED, randomNumber: () => String((batchNumber += 1)) } });
  chooseLevel(ctx, 'hard');
  setField(ctx, '[data-field="seed"]', SET_SEED);
  q(ctx, '[data-action="generate-set"]').click();
  await waitFor(() => state(ctx).set !== null && state(ctx).job === null, 'the piece set', 50000);
  await pressNewPuzzle(ctx);
  assert(state(ctx).puzzles.length > 0, `no puzzle (notice ${state(ctx).notice?.code})`);
  return ctx;
}

/** @type {Promise<Ctx> | null} */
let sharedPromise = null;
/** The run that checks 1 to 4, 6, 8 and 12 (or, in the keys phase, check 5) share. */
const sharedRun = () => (sharedPromise ??= makeRun());

/** Ends the shared run (the page's slots are document-wide, so a second app needs the first one gone). */
async function releaseShared() {
  const ended = sharedPromise === null ? null : await sharedPromise.catch(() => null);
  sharedPromise = null;
  ended?.destroy();
}

/**
 * The first candidate card; when there is none, one more batch (without the calibration), else a failure.
 * @param {Ctx} ctx
 * @returns {Promise<string>} Its puzzle id.
 */
async function candidateOf(ctx) {
  let found = kindsOf(ctx).find((p) => p.kind === 'candidate');
  if (found === undefined) {
    await pressNewPuzzle(ctx);
    found = kindsOf(ctx).find((p) => p.kind === 'candidate');
  }
  assert(found, `no candidate card; kinds: ${JSON.stringify(kindsOf(ctx))}`);
  return found.id;
}

/**
 * @param {Ctx} ctx
 * @param {string} id
 * @returns {HTMLButtonElement}
 */
const replayButtonOf = (ctx, id) => /** @type {HTMLButtonElement} */ (q(ctx, `li.puzzle-card[data-puzzle-id="${id}"] button.card-replay`));

/** @returns {HTMLDialogElement | undefined} The Generation Steps dialog that is open. */
const openDialog = () => /** @type {HTMLDialogElement | undefined} */ ([...document.querySelectorAll('dialog[data-role="replay-dialog"]')].find((d) => /** @type {HTMLDialogElement} */ (d).open));

/**
 * @param {HTMLElement} dialog
 * @param {string} selector
 * @returns {HTMLElement}
 */
function inside(dialog, selector) {
  const found = /** @type {HTMLElement | null} */ (dialog.querySelector(selector));
  assert(found, `the dialog has no ${selector}`);
  return found;
}

const role = (/** @type {HTMLElement} */ dialog, /** @type {string} */ name) => inside(dialog, `[data-role="${name}"]`);
const action = (/** @type {HTMLElement} */ dialog, /** @type {string} */ name) => /** @type {HTMLButtonElement} */ (inside(dialog, `[data-action="${name}"]`));
const sliderOf = (/** @type {HTMLElement} */ dialog) => /** @type {HTMLInputElement} */ (inside(dialog, '[data-field="replay-slider"]'));
const statusLines = (/** @type {HTMLElement} */ dialog) => [...role(dialog, 'replay-status').querySelectorAll('p')].map((p) => p.textContent);
/** @returns {string | undefined} The stage of the step on show. */
const currentStage = (/** @type {HTMLElement} */ dialog) => /** @type {HTMLElement | null} */ (dialog.querySelector('li.pm-replay-stage[aria-current="step"]'))?.dataset.stage;
const highlights = (/** @type {HTMLElement} */ dialog) => role(dialog, 'replay-board').querySelectorAll('[data-highlighted="true"]').length;
const numberText = (/** @type {number} */ n) => formatNumber(n, { maximumFractionDigits: 6 });

/**
 * Clicks a card's How it was made and waits for the replay to answer.
 * @param {Ctx} ctx
 * @param {string} id
 * @returns {Promise<HTMLDialogElement>}
 */
async function openReplay(ctx, id) {
  replayButtonOf(ctx, id).click();
  const dialog = await waitFor(openDialog, 'the Generation Steps dialog', 10000);
  assert(document.activeElement === action(dialog, 'replay-close'), `the focus is on Close, it is on ${document.activeElement?.tagName}`);
  await waitFor(() => dialog.dataset.state === 'ready' || dialog.dataset.state === 'failed', 'the replay to answer', 50000);
  equal(dialog.dataset.state, 'ready', `the replay answered (${statusLines(dialog).join(' ')})`);
  return dialog;
}

/** @param {HTMLDialogElement} dialog */
async function closeReplay(dialog) {
  action(dialog, 'replay-close').click();
  await waitFor(() => !dialog.open, 'the dialog to close', 5000);
}

if (phase !== 'keys') {
  await check('1 open: the button opens the dialog on a candidate; the replay matches; ARIA wiring and the desktop layout', async () => {
    const ctx = await sharedRun();
    const id = await candidateOf(ctx);
    const dialog = await openReplay(ctx, id);
    equal(dialog.dataset.result, 'matched', 'the result');
    equal(statusLines(dialog), [t('replay.status.matched')], 'the status line');
    equal(dialog.querySelectorAll('[data-role="replay-stages"] li').length, 7, 'seven stages');
    const titleId = dialog.getAttribute('aria-labelledby');
    assert(titleId !== null && document.getElementById(titleId)?.textContent === t('replay.title'), `aria-labelledby names the title (${titleId})`);
    const slider = sliderOf(dialog);
    const now = role(dialog, 'replay-now');
    const live = role(dialog, 'replay-sentence');
    equal(slider.labels?.length, 1, 'the slider has exactly one label');
    equal(slider.labels?.[0].textContent, t('replay.slider', { n: numberText(Number(slider.value) + 1), total: numberText(Number(slider.max) + 1) }), 'the slider label');
    equal(slider.getAttribute('aria-valuetext'), now.textContent, 'aria-valuetext is the visible sentence');
    assert((now.textContent ?? '') !== '', 'the visible sentence is not empty');
    equal(now.getAttribute('aria-hidden'), 'true', 'the visible sentence is hidden from the accessibility tree');
    equal([role(dialog, 'replay-status').getAttribute('role'), live.getAttribute('role')], ['status', 'status'], 'two status regions');
    const box = live.getBoundingClientRect();
    assert(live.classList.contains('sr-only') && box.width === 1 && box.height === 1, `the live region is visually hidden (${box.width} x ${box.height})`);
    equal(live.textContent, now.textContent, 'the live region holds the visible sentence');
    const visual = inside(dialog, '.pm-replay-visual').getBoundingClientRect();
    const side = inside(dialog, '.pm-replay-side').getBoundingClientRect();
    assert(visual.right <= side.left && Math.abs(visual.top - side.top) < 2, `the board column is left of the stage column: ${JSON.stringify({ vr: visual.right, sl: side.left, vt: visual.top, st: side.top })}`);
    assert(dialog.scrollWidth <= dialog.clientWidth, `no horizontal overflow (${dialog.scrollWidth} > ${dialog.clientWidth})`);
    await shot('dialog');
    await closeReplay(dialog);
  });

  await check('2 step: Next and Previous change the sentence and the slider; stage 4 of a candidate highlights lifted pieces', async () => {
    const ctx = await sharedRun();
    const dialog = await openReplay(ctx, await candidateOf(ctx));
    const slider = sliderOf(dialog);
    const now = role(dialog, 'replay-now');
    const live = role(dialog, 'replay-sentence');
    const next = action(dialog, 'replay-next');
    const prev = action(dialog, 'replay-prev');
    const sentences = [now.textContent];
    for (let n = 1; n <= 3; n += 1) {
      next.click();
      equal(Number(slider.value), n, `the slider after Next ${n}`);
      assert(now.textContent !== sentences[n - 1], `Next ${n} changes the sentence (${now.textContent})`);
      equal(live.textContent, now.textContent, `the live region after Next ${n}`);
      sentences.push(now.textContent);
    }
    for (let n = 2; n >= 0; n -= 1) {
      prev.click();
      equal([Number(slider.value), now.textContent, live.textContent], [n, sentences[n], sentences[n]], `Previous back to ${n}`);
    }
    // The key steps keep only the first step of stage 4; the lifted pieces are in the retile steps of Every step.
    inside(dialog, '[data-field="replay-view-all"]').click();
    const stages = new Set();
    let found = false;
    for (let at = Number(slider.value); at < Number(slider.max) && !found; at += 1) {
      next.click();
      stages.add(currentStage(dialog));
      found = currentStage(dialog) === '4' && highlights(dialog) > 0;
    }
    assert(found, `no step of stage 4 highlights a piece (stages seen: ${[...stages]})`);
    await closeReplay(dialog);
  });

  await check('3 play: Play advances the slider, Pause stops it, and no tick reaches the live region', async () => {
    const ctx = await sharedRun();
    const dialog = await openReplay(ctx, await candidateOf(ctx));
    const slider = sliderOf(dialog);
    const now = role(dialog, 'replay-now');
    const live = role(dialog, 'replay-sentence');
    const play = action(dialog, 'replay-play');
    equal(play.getAttribute('aria-pressed'), 'false', 'not playing at first');
    const start = Number(slider.value);
    const liveBefore = live.textContent;
    const nowBefore = now.textContent;
    let writes = 0;
    const observer = new MutationObserver((records) => {
      writes += records.length;
    });
    observer.observe(live, { childList: true, characterData: true, subtree: true });
    play.click();
    equal(play.getAttribute('aria-pressed'), 'true', 'Play pressed');
    await waitFor(() => Number(slider.value) >= start + 3, 'three steps of playback', 20000);
    const liveBeforePause = live.textContent;
    const nowBeforePause = now.textContent;
    await sleep(0);
    equal([liveBeforePause, writes], [liveBefore, 0], 'no playback tick was announced');
    assert(nowBeforePause !== nowBefore, 'the visible sentence followed the steps');
    play.click();
    equal(play.getAttribute('aria-pressed'), 'false', 'Pause releases the button');
    const stoppedAt = slider.value;
    await sleep(1300);
    equal(slider.value, stoppedAt, 'Pause stopped the playback');
    equal(live.textContent, now.textContent, 'a pause writes the live region');
    observer.disconnect();
    await closeReplay(dialog);
  });

  await check('4 slider: the last step is the stored puzzle with its score table; the table has a caption and row headers', async () => {
    const ctx = await sharedRun();
    const id = await candidateOf(ctx);
    const dialog = await openReplay(ctx, id);
    const slider = sliderOf(dialog);
    slider.value = slider.max;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    equal(currentStage(dialog), '7', 'the final step is stage 7');
    const table = /** @type {HTMLTableElement} */ (inside(dialog, '[data-role="replay-score"] table'));
    equal(table.querySelector('caption')?.textContent, t('replay.table.caption'), 'the caption');
    const rows = [...table.querySelectorAll('tr')];
    assert(rows.length > 0 && rows.every((row) => row.firstElementChild?.tagName === 'TH' && row.firstElementChild.getAttribute('scope') === 'row'), 'the first cell of every row is a row header');
    const total = /** @type {HTMLElement} */ (inside(table, 'tr[data-row="total"] .pm-replay-value')).textContent ?? '';
    const puzzle = state(ctx).puzzles.find((p) => p.id === id);
    const score = /** @type {number} */ (puzzle?.rating?.score);
    assert(Number.isFinite(score) && Math.abs(Number(total.replace(/,/g, '')) - score) < 1e-6, `the Total ${total} is the score ${score}`);
    const cardScore = Number(/score (\d+)/.exec(q(ctx, `li.puzzle-card[data-puzzle-id="${id}"] .card-rating`).textContent ?? '')?.[1]);
    equal(cardScore, Math.round(score), 'the card shows the same score');
    await shot('dialog-final');
    await closeReplay(dialog);
  });

  await check('12 calibration: the calibration card has no stage 4 step, and its highlights are repairs and the selection', async () => {
    const ctx = await sharedRun();
    const calibration = kindsOf(ctx).find((p) => p.kind === 'calibration');
    assert(calibration, `the run has no calibration card; kinds: ${JSON.stringify(kindsOf(ctx))}`);
    const dialog = await openReplay(ctx, calibration.id);
    equal(dialog.dataset.result, 'matched', 'the result');
    equal(statusLines(dialog), [t('replay.status.matched')], 'the status line');
    const stage4 = inside(dialog, 'li.pm-replay-stage[data-stage="4"]');
    equal(stage4.dataset.mark, 'none', 'stage 4 is marked none');
    equal(stage4.querySelector('.pm-replay-stage-mark')?.textContent, t('replay.stage.none'), 'its mark text');
    assert(!stage4.textContent?.includes(t('replay.notAvailable')), 'stage 4 is not marked not available');
    inside(dialog, '[data-field="replay-view-all"]').click();
    const next = action(dialog, 'replay-next');
    const slider = sliderOf(dialog);
    const seen = [];
    for (let at = 0; ; at += 1) {
      const stage = currentStage(dialog);
      seen.push(stage);
      assert(stage !== '4', `stage 4 is never current (step ${at})`);
      assert(highlights(dialog) === 0 || stage === '5' || stage === '6', `a highlight outside stages 5 and 6: step ${at} in stage ${stage}`);
      if (Number(slider.value) >= Number(slider.max)) {
        break;
      }
      next.click();
    }
    assert(seen.length > 3, `the calibration replay has steps (${seen})`);
    await closeReplay(dialog);
  });

  await check('8 language: the dialog and the card button follow setLocale', async () => {
    const ctx = await sharedRun();
    const id = await candidateOf(ctx);
    const dialog = await openReplay(ctx, id);
    const vi = packOf('vi');
    const en = packOf('en');
    const english = role(dialog, 'replay-now').textContent;
    const button = replayButtonOf(ctx, id);
    try {
      setLocale('vi');
      equal(inside(dialog, '.pm-head-title').textContent, vi['replay.title'], 'the title');
      equal(action(dialog, 'replay-close').textContent, vi['replay.close'], 'Close');
      equal([action(dialog, 'replay-prev').textContent, action(dialog, 'replay-next').textContent], [vi['replay.prev'], vi['replay.next']], 'Previous and Next');
      equal(statusLines(dialog), [vi['replay.status.matched']], 'the status line');
      equal(inside(dialog, 'li.pm-replay-stage[data-stage="1"] .pm-replay-stage-name').textContent, vi['replay.stage.1'], 'a stage name');
      assert(/^Bước \d+ \/ \d+$/.test(sliderOf(dialog).labels?.[0].textContent ?? ''), `the slider label: ${sliderOf(dialog).labels?.[0].textContent}`);
      assert(role(dialog, 'replay-now').textContent !== english && !/replay\./.test(role(dialog, 'replay-now').textContent ?? ''), 'the sentence is in Vietnamese');
      equal(button.textContent, vi['replay.button'], 'the card button text');
      equal(button.getAttribute('aria-label'), t('replay.button.aria', { title: q(ctx, `li.puzzle-card[data-puzzle-id="${id}"] .card-heading`).textContent }), 'the card button name');
      assert(button.getAttribute('aria-label')?.startsWith(vi['replay.button']), 'the name begins with the visible text');
    } finally {
      setLocale('en');
    }
    equal(inside(dialog, '.pm-head-title').textContent, en['replay.title'], 'the title in English again');
    equal(statusLines(dialog), [en['replay.status.matched']], 'the status line in English again');
    equal(role(dialog, 'replay-now').textContent, english, 'the sentence in English again');
    equal(button.textContent, en['replay.button'], 'the card button in English again');
    await closeReplay(dialog);
  });

  await check('6 card: three buttons in order, the new one outside the select button; selection and removal still work', async () => {
    const ctx = await sharedRun();
    const cards = qa(ctx, 'li.puzzle-card');
    assert(cards.length >= 2, `${cards.length} cards`);
    for (const card of cards) {
      const buttons = [...card.querySelectorAll('button')];
      equal(buttons.map((b) => ['card-select', 'card-replay', 'card-remove'].find((name) => b.classList.contains(name))), ['card-select', 'card-replay', 'card-remove'], 'the buttons in order');
      equal([...card.children].map((c) => c.tagName), ['BUTTON', 'BUTTON', 'BUTTON'], 'all three are direct children of the card');
      const [select, replay, remove] = /** @type {HTMLButtonElement[]} */ (buttons);
      assert(replay.closest('button.card-select') === null && replay.parentElement === card && card.parentElement?.matches('ol.puzzle-cards'), 'the new button is in the card, not in the select button');
      equal([replay.textContent, replay.dataset.action], [t('replay.button'), 'replay'], 'its text and action');
      const title = /** @type {HTMLElement} */ (card.querySelector('.card-heading')).textContent;
      equal(replay.getAttribute('aria-label'), t('replay.button.aria', { title }), 'its accessible name');
      assert((replay.getAttribute('aria-label') ?? '').startsWith((replay.textContent ?? '').trim()), 'the name begins with the visible text');
      const [s, r, x, c] = [select, replay, remove, card].map((node) => node.getBoundingClientRect());
      assert(r.top >= s.bottom - 0.5 && r.left >= c.left && r.right <= c.right && r.top >= x.bottom - 0.5, `the button has a row of its own: ${JSON.stringify({ s: s.bottom, r: [r.top, r.left, r.right], x: x.bottom })}`);
    }
    const [newest, older] = cards;
    await shot('cards');
    /** @type {HTMLButtonElement} */ (older.querySelector('.card-select')).click();
    equal([older.dataset.selected, newest.dataset.selected], ['true', 'false'], 'selecting a card marks it');
    const before = state(ctx).puzzles.length;
    /** @type {HTMLButtonElement} */ (newest.querySelector('.card-remove')).click();
    equal(state(ctx).puzzles.length, before - 1, 'removal removes one puzzle');
    equal(qa(ctx, 'li.puzzle-card').length, before - 1, 'and its card');
    assert(document.activeElement === qa(ctx, '.card-remove')[0], 'the focus moved to the next remove button');
  });

  // The page slots are looked up in the whole document, so two apps cannot be mounted at once: the shared run ends here.
  await releaseShared();

  await check('7 unavailable: an imported puzzle has no steps; stages 1 to 6 say so and stage 7 is the stored puzzle', async () => {
    const ctx = mountApp({ quantity: 1, importButton: true });
    try {
      q(ctx, '[data-action="import-puzzle"]').click();
      const importer = /** @type {HTMLDialogElement | undefined} */ ([...document.querySelectorAll('dialog.pm-code')].find((d) => /** @type {HTMLDialogElement} */ (d).open));
      assert(importer !== undefined, 'the Import puzzle dialog opens');
      const field = /** @type {HTMLTextAreaElement} */ (importer.querySelector('.pm-code-field'));
      field.value = sampleCode;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      /** @type {HTMLElement} */ (importer.querySelector('[data-action="code-open"]')).click();
      await waitFor(() => !importer.open && state(ctx).puzzles.length === 1, 'the import to finish', 30000);
      const dialog = await openReplay(ctx, state(ctx).puzzles[0].id);
      equal(dialog.dataset.result, 'unavailable', 'the result');
      equal(statusLines(dialog)[0], t('replay.status.unavailable'), 'the status line');
      for (let stage = 1; stage <= 6; stage += 1) {
        const item = inside(dialog, `li.pm-replay-stage[data-stage="${stage}"]`);
        equal([item.dataset.mark, item.querySelector('.pm-replay-stage-mark')?.textContent], ['notAvailable', t('replay.notAvailable')], `stage ${stage}`);
      }
      const last = inside(dialog, 'li.pm-replay-stage[data-stage="7"]');
      equal([last.dataset.mark, last.querySelector('.pm-replay-stage-mark')], ['available', null], 'stage 7 has no mark');
      equal([currentStage(dialog), sliderOf(dialog).max], ['7', '0'], 'the only step is the final one');
      equal(role(dialog, 'replay-now').textContent, t('replay.step.final.stored'), 'the final sentence is the stored puzzle');
      await closeReplay(dialog);
    } finally {
      ctx.destroy();
    }
  });

  // Part B: the dialog alone, with scripted replays ------------------------------------------------------------------------

  /**
   * @param {number} stage
   * @param {string} kind
   * @param {Record<string, unknown>} [args]
   */
  const scriptedStep = (stage, kind, args = {}) => ({
    stage, kind, board: { placed: [], lifted: [], clues: [] }, rating: null, breakdown: null, detail: null, band: null, note: `replay.step.${kind}`, args,
  });

  /**
   * Three steps (stages 1 to 3) and the final one.
   * @param {'incomplete' | 'mismatch'} status
   * @param {string} reason
   */
  const scriptedResult = (status, reason) => ({
    status,
    reason,
    stages: { set: 'replayed', candidate: status === 'incomplete' ? 'stopped' : 'mismatch', final: 'not-compared' },
    compared: [],
    work: 0,
    steps: [scriptedStep(1, 'count', { k: 9, min: 9, max: 9 }), scriptedStep(2, 'carve', { mode: 'flat' }), scriptedStep(3, 'piece', { n: 1 }), scriptedStep(7, 'final', { status })],
  });

  /**
   * @param {(source: any, signal: AbortSignal) => Promise<any>} run
   * @returns {ReturnType<typeof createReplayDialog>}
   */
  const scriptedDialog = (run) => createReplayDialog({ host: document.body, t, closeKey: 'replay.close', run });
  const scriptedSource = { set: sampleSet, puzzle: samplePack.puzzles[0], setOrigin: null, made: null };

  /**
   * Opens the dialog on a scripted result, goes to its last step and returns the dialog.
   * @param {ReturnType<typeof createReplayDialog>} dialog
   */
  async function openScripted(dialog) {
    dialog.open(scriptedSource, null);
    await waitFor(() => dialog.element.dataset.state === 'ready', 'the scripted replay', 10000);
    const slider = sliderOf(dialog.element);
    slider.value = slider.max;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    return dialog.element;
  }

  await check('9 incomplete: the status names the work limit and the final step is the stored puzzle', async () => {
    const dialog = scriptedDialog(async () => scriptedResult('incomplete', 'work'));
    try {
      const element = await openScripted(dialog);
      equal(element.dataset.result, 'incomplete', 'the result');
      equal(statusLines(element), [t('replay.status.incomplete', { reason: t('replay.limit.work') })], 'the status line');
      assert(statusLines(element)[0]?.includes(t('replay.limit.work')), 'the status names the limit');
      equal(role(element, 'replay-now').textContent, t('replay.step.final.stored'), 'the final sentence');
      assert(role(element, 'replay-now').textContent !== t('replay.step.final.generated'), 'it never says generated');
    } finally {
      dialog.dispose();
    }
  });

  await check('10 mismatch: the status names the rating and the final step is the stored puzzle', async () => {
    const dialog = scriptedDialog(async () => scriptedResult('mismatch', 'rating'));
    try {
      const element = await openScripted(dialog);
      equal(element.dataset.result, 'mismatch', 'the result');
      equal(statusLines(element), [t('replay.status.mismatch', { field: t('replay.field.rating') })], 'the status line');
      equal(role(element, 'replay-now').textContent, t('replay.step.final.stored'), 'the final sentence');
      assert(role(element, 'replay-now').textContent !== t('replay.step.final.generated'), 'it never says generated');
    } finally {
      dialog.dispose();
    }
  });

  await check('11 cancel: closing aborts only the replay\'s own signal; an interrupted or unavailable worker has its own message', async () => {
    /** @type {AbortSignal | null} */
    let seen = null;
    let calls = 0;
    const waiting = scriptedDialog((_source, signal) => {
      calls += 1;
      seen = signal;
      return new Promise(() => {});
    });
    try {
      waiting.open(scriptedSource, null);
      await waitFor(() => seen !== null, 'the replay to start', 5000);
      assert(/** @type {AbortSignal} */ (seen).aborted === false, 'the signal is live while the dialog is open');
      equal([waiting.element.dataset.state, statusLines(waiting.element)], ['loading', [t('replay.loading')]], 'loading');
      await closeReplay(waiting.element);
      await waitFor(() => /** @type {AbortSignal} */ (seen).aborted, 'the close event to abort the replay', 5000);
      equal([/** @type {AbortSignal} */ (seen).aborted, calls, waiting.element.dataset.state], [true, 1, 'closed'], 'closing aborted the signal and called nothing else');
    } finally {
      waiting.dispose();
    }
    for (const [error, key] of /** @type {const} */ ([[new PoolAbortError('cancelled'), 'replay.failed.interrupted'], [new PoolError('worker-unavailable', 'no worker'), 'replay.failed.worker']])) {
      const failing = scriptedDialog(() => Promise.reject(error));
      try {
        failing.open(scriptedSource, null);
        await waitFor(() => failing.element.dataset.state === 'failed', 'the failure', 5000);
        equal(statusLines(failing.element), [t(key)], `the message for ${error.name}`);
      } finally {
        failing.dispose();
      }
    }
  });

  await check('13 no CSP violations and no uncaught errors', () => {
    equal(violations, [], 'CSP violations');
    equal(uncaught, [], 'uncaught errors');
  });
} else {
  await check('5 keyboard: Enter opens the dialog, Tab and Shift+Tab follow the visual order, ArrowRight steps, Escape closes it and returns the focus', async () => {
    const ctx = await sharedRun();
    const id = await candidateOf(ctx);
    const button = replayButtonOf(ctx, id);
    const card = /** @type {HTMLElement} */ (button.parentElement);
    const select = /** @type {HTMLElement} */ (card.querySelector('.card-select'));
    const remove = /** @type {HTMLElement} */ (card.querySelector('.card-remove'));
    select.focus();
    assert(document.activeElement === select, 'the select button took the focus');
    await press('Tab');
    assert(document.activeElement === button, `Tab from the select button reaches How it was made, the focus is on ${document.activeElement?.className}`);
    // The focus ring is the accent colour of the page, never the red of removal (after the colour transition).
    await sleep(400);
    await shot('card-focus');
    const focused = getComputedStyle(button);
    equal([focused.color, focused.backgroundColor, button.matches(':focus-visible')], [computed('color', 'var(--gen-color-accent-hover)'), computed('background-color', 'var(--gen-color-accent-soft)'), true], 'focus colours');
    assert(getComputedStyle(button).color !== computed('color', 'var(--gen-error)'), 'and not red');
    equal(getComputedStyle(button).outlineStyle, 'solid', 'with a focus ring');
    await press('Tab');
    assert(document.activeElement === remove, `Tab goes on to the remove button, the focus is on ${document.activeElement?.className}`);
    await press('Shift+Tab');
    assert(document.activeElement === button, 'Shift+Tab comes back to How it was made');
    await press('Enter');
    const dialog = await waitFor(openDialog, 'the dialog to open on Enter', 10000);
    assert(document.activeElement === action(dialog, 'replay-close'), `the focus is on Close, it is on ${document.activeElement?.tagName}`);
    await waitFor(() => dialog.dataset.state === 'ready', 'the replay', 50000);

    await press('Tab');
    assert(document.activeElement === document.body || dialog.contains(document.activeElement), `Tab from Close stays in the dialog, the focus is on ${document.activeElement?.tagName}`);
    const closeX = action(dialog, 'replay-x');
    closeX.focus();
    equal(document.activeElement, closeX, 'the cross took the focus');
    const visible = (/** @type {HTMLElement} */ node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
    const expected = /** @type {HTMLElement[]} */ ([...dialog.querySelectorAll('button, input, [tabindex="0"]')]).filter((node) => {
      const input = /** @type {HTMLInputElement} */ (node);
      return !input.disabled && visible(node) && !(input.type === 'radio' && !input.checked);
    });
    const nameOf = (/** @type {Element | null} */ node) => /** @type {HTMLElement | null} */ (node)?.dataset.action ?? /** @type {HTMLElement | null} */ (node)?.dataset.field ?? node?.tagName;
    const prevOff = action(dialog, 'replay-prev').disabled;
    equal(expected.map(nameOf), ['replay-x', 'replay-prev', 'replay-play', 'replay-next', 'replay-slider', 'replay-view-compact', 'replay-close'].filter((name) => !(prevOff && name === 'replay-prev')), 'the controls in visual order');
    for (let at = 1; at < expected.length; at += 1) {
      await press('Tab');
      assert(document.activeElement === expected[at], `Tab ${at} reaches ${nameOf(expected[at])}, the focus is on ${nameOf(document.activeElement)}`);
    }
    await press('Shift+Tab');
    assert(document.activeElement === expected[expected.length - 2], `Shift+Tab goes back to ${nameOf(expected[expected.length - 2])}, the focus is on ${nameOf(document.activeElement)}`);
    await press('Shift+Tab');
    const slider = sliderOf(dialog);
    assert(document.activeElement === slider, `Shift+Tab again reaches the slider, the focus is on ${nameOf(document.activeElement)}`);
    const now = role(dialog, 'replay-now');
    const before = [now.textContent, slider.value];
    await press('ArrowRight');
    assert(slider.value !== before[1] && now.textContent !== before[0], `ArrowRight on the slider changes the step (${before} -> ${slider.value}, ${now.textContent})`);
    equal(role(dialog, 'replay-sentence').textContent, now.textContent, 'the live region follows a manual step');
    await press('Escape');
    await waitFor(() => !dialog.open, 'Escape to close the dialog', 5000);
    await waitFor(() => document.activeElement === button, 'the focus to return to the card button', 5000);
  });
}

if (sharedPromise !== null) {
  await releaseShared();
}

const failed = results.filter((r) => !r.ok);
const list = /** @type {HTMLElement} */ (document.getElementById('results'));
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'} (${r.seconds} s): ${r.name}${r.ok ? '' : ` — ${r.error}`}`;
  li.className = r.ok ? 'pass' : 'fail';
  list.append(li);
}
const summary = /** @type {HTMLElement} */ (document.getElementById('summary'));
summary.textContent = failed.length === 0 ? `PASS ${results.length}/${results.length}` : `FAIL ${failed.length} of ${results.length}`;
document.documentElement.dataset.summary = `${results.length - failed.length}/${results.length}`;
document.title = `${summary.textContent} - Generation Steps harness`;
document.documentElement.dataset.result = failed.length === 0 ? 'pass' : 'fail';
