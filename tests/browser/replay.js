// @ts-check
// Browser regression harness for Generation steps (MP18b, gate GB-P5): the section of step 3 under "Pieces to
// place". Part A drives the real Generator with its real engine workers (a Hard set on the 10 x 6 board, two
// puzzles); Part B mounts the section alone with scripted replays. A setup makes the shared run and finds its
// candidate card before the first check of every phase. `?phase=keys` runs only check K, whose keys the runner
// presses (trusted keys, never synthetic events); `?phase=narrow` runs only check N, in the runner's 390 px touch
// viewport; the main phase runs the other checks. The setup and every check log their start and end for the runner's
// watchdog. It writes a pass/fail list into the page and sets data-result and data-summary on <html>. It is a
// developer fixture, not deployed.

import { PoolAbortError, PoolError } from '../../core/browser/worker-pool.js';
import { packBoard, parsePack } from '../../core/engine/pack.js';
import { pieceLabelText } from '../../core/browser/piece-look.js';
import { createGeneratorApp } from '../../generator/app.js';
import { formatNumber, packOf, setLocale, t } from '../../generator/i18n.js';
import { mountGenerationSteps } from '../../generator/ui/generation-steps.js';
import { thumbnailCellPx } from '../../generator/ui/puzzle-panel.js';

const phase = new URLSearchParams(location.search).get('phase') ?? 'main';
const CHECK_LIMIT_MS = 60000;
const SETUP_LIMIT_MS = 240000;
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
 * Runs the setup of a phase between a SETUP-START and a SETUP-END console line (the runner's watchdog bounds it at
 * 240 s too) and fails it when it takes longer; a failed setup is the page's only result (no check of the phase runs).
 * @param {string} name
 * @param {() => Promise<void>} fn
 * @returns {Promise<boolean>} Whether the setup passed.
 */
async function setup(name, fn) {
  console.log(`SETUP-START ${name}`);
  const started = performance.now();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const seconds = () => Math.round((performance.now() - started) / 100) / 10;
  /** @type {string | null} */
  let failure = null;
  try {
    await Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`the setup ran past ${SETUP_LIMIT_MS / 1000} s`)), SETUP_LIMIT_MS);
      }),
    ]);
  } catch (error) {
    failure = String(/** @type {Error} */ (error)?.stack ?? error);
    results.push({ name, ok: false, seconds: seconds(), error: failure });
  } finally {
    clearTimeout(timer);
  }
  console.log(`SETUP-END ${failure === null ? 'PASS' : 'FAIL'} ${seconds()} s ${name}${failure === null ? '' : ` :: ${failure.split('\n')[0].slice(0, 220)}`}`);
  return failure === null;
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
/** The run that the setup makes and that checks 1 to 5, 7, 8, K and N share. */
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

const numberText = (/** @type {number} */ n) => formatNumber(n, { maximumFractionDigits: 6 });

/** @param {Ctx} ctx */
const sectionOf = (ctx) => q(ctx, 'section.generation-steps');
/** @param {Ctx} ctx @param {string} id */
const selectCard = (ctx, id) => q(ctx, `li.puzzle-card[data-puzzle-id="${id}"] button.card-select`).click();
/** @param {HTMLElement} section */
const statusLines = (section) => [...section.querySelectorAll('[data-role="steps-status"] p')].map((p) => p.textContent);
/** @param {HTMLElement} section @returns {HTMLElement[]} */
const stepRows = (section) => /** @type {HTMLElement[]} */ ([...section.querySelectorAll('tr.steps-row')]);
/** @param {HTMLElement} row */
const toggleOf = (row) => /** @type {HTMLButtonElement} */ (row.querySelector('button[data-action="steps-toggle"]'));
/** @param {HTMLElement} row */
const labelOf = (row) => toggleOf(row).querySelector('.steps-toggle-label')?.textContent;
/** @param {HTMLElement} row */
const detailRowOf = (row) => document.getElementById(toggleOf(row).getAttribute('aria-controls') ?? '');
/** @param {Element} cell @returns {string[]} The lines of a cell, or its text when it has none ("—"). */
const linesOf = (cell) => (cell.querySelector('.steps-line') === null ? [cell.textContent ?? '']
  : [...cell.querySelectorAll('.steps-line')].map((line) => line.textContent ?? ''));
/** @param {HTMLElement} section @param {'compact' | 'all'} view */
const chooseView = (section, view) => /** @type {HTMLElement} */ (section.querySelector(`[data-field="steps-view-${view}"]`)).click();
/** @param {HTMLElement} section */
async function waitSteps(section) {
  await waitFor(() => section.dataset.phase === 'ready' || section.dataset.phase === 'failed', 'the replay', 50000);
  equal(section.dataset.phase, 'ready', `the replay answered (${statusLines(section).join(' ')})`);
}
/** @template T */
function deferred() {
  /** @type {(value: T) => void} */ let resolve = () => {};
  /** @type {(reason?: unknown) => void} */ let reject = () => {};
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
const RULE_KEYS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'].map((r) => `replay.rule.${r}`);

// Every phase starts with the setup, before its first check.
const SETUP_NAME = '0 setup: the shared run (a Hard set on the 10 x 6 board, two puzzles) and its candidate card';
/** @type {Ctx} */
let SHARED = /** @type {any} */ (null);
let CANDIDATE = '';
const ready = await setup(SETUP_NAME, async () => {
  SHARED = await sharedRun();
  CANDIDATE = await candidateOf(SHARED);
});

// Part B: the section alone, with scripted replays ---------------------------------------------------------------------

const A = { set: sampleSet, puzzle: samplePack.puzzles[0], setOrigin: null, made: null };
const B = { ...A, puzzle: samplePack.puzzles[1] };
const CONTEXT = { rotation: 0, busy: false };

const scriptedStep = (/** @type {number} */ stage, /** @type {string} */ kind, /** @type {Record<string, unknown>} */ args = {}) => ({
  stage, kind, board: { placed: [], lifted: [], clues: [] }, rating: null, breakdown: null, detail: null, band: null,
  note: `replay.step.${kind}`, args,
});
/** @param {'matched' | 'incomplete' | 'mismatch' | 'unavailable'} status @param {string | null} reason */
const scriptedResult = (status, reason) => ({
  status,
  reason,
  stages: { set: 'replayed', candidate: status === 'incomplete' ? 'stopped' : status === 'mismatch' ? 'mismatch'
    : status === 'unavailable' ? 'unavailable' : 'replayed', final: status === 'matched' ? 'compared' : 'not-compared' },
  compared: [],
  work: 0,
  steps: [scriptedStep(1, 'count', { k: 9, min: 9, max: 9 }), scriptedStep(2, 'carve', { mode: 'flat', parts: 0 }),
    scriptedStep(3, 'piece', { n: 1 }), scriptedStep(7, 'final', { status, detailStep: null })],
});

/**
 * The section alone in a div of the sandbox, with a scripted run.
 * @param {(source: any, signal: AbortSignal) => Promise<any>} run
 */
function mountAlone(run) {
  const host = h('div');
  sandbox.append(host);
  const steps = mountGenerationSteps(host, { t, run, cellPxOf: (board) => thumbnailCellPx(board, 240) });
  return {
    steps,
    section: steps.element,
    dispose() {
      steps.dispose();
      host.remove();
    },
  };
}

/**
 * Records the text of the status element at each mutation callback.
 * @param {HTMLElement} section
 */
function watchStatus(section) {
  /** @type {string[]} */
  const texts = [];
  const status = /** @type {HTMLElement} */ (section.querySelector('[data-role="steps-status"]'));
  const observer = new MutationObserver(() => texts.push(status.textContent ?? ''));
  observer.observe(status, { childList: true, subtree: true, characterData: true });
  return { texts, stop: () => observer.disconnect() };
}

if (!ready) {
  // The setup's failure is the page's one result: no check of the phase runs.
} else if (phase === 'keys') {
  await check('K keyboard: Tab and Shift+Tab go from one step button to the next; Enter opens and closes; an open step has no tab stop', async () => {
    const ctx = SHARED;
    selectCard(ctx, CANDIDATE);
    const section = sectionOf(ctx);
    await waitSteps(section);
    chooseView(section, 'compact');
    const buttons = stepRows(section).map(toggleOf);
    assert(buttons.length >= 5, `at least five step buttons in Key steps, there are ${buttons.length}`);
    const nameOf = (/** @type {Element | null} */ node) => node === null ? 'nothing' : `${node.tagName.toLowerCase()}.${node.className || node.getAttribute('data-action') || ''}`;
    const focusIs = (/** @type {number} */ n, /** @type {string} */ what) => assert(document.activeElement === buttons[n], `${what}: the focus is on ${nameOf(document.activeElement)}, not on step button ${n}`);
    buttons[0].focus();
    focusIs(0, 'the first step button took the focus');
    for (let n = 1; n <= 3; n += 1) {
      await press('Tab');
      focusIs(n, `Tab ${n}`);
    }
    await press('Shift+Tab');
    focusIs(2, 'Shift+Tab');
    await press('Enter');
    equal(buttons[2].getAttribute('aria-expanded'), 'true', 'Enter opens the step');
    focusIs(2, 'Enter keeps the focus on the button');
    await press('Tab');
    focusIs(3, 'Tab passes the open step (its board has no tab stop)');
    await press('Shift+Tab');
    focusIs(2, 'Shift+Tab back to the open step');
    await press('Enter');
    equal(buttons[2].getAttribute('aria-expanded'), 'false', 'Enter closes the step');
    focusIs(2, 'the second Enter keeps the focus on the button');
  });
} else if (phase === 'narrow') {
  await check('N narrow: at 390 px with a coarse pointer the section is there, its rows stack with their column names, the table roles stay, nothing scrolls sideways', async () => {
    assert(matchMedia('(pointer: coarse)').matches, 'the phase runs with a coarse pointer');
    assert(innerWidth <= 420, `a phone width (${innerWidth})`);
    const ctx = SHARED;
    selectCard(ctx, CANDIDATE);
    const section = sectionOf(ctx);
    await waitSteps(section);
    section.scrollIntoView({ block: 'start' });
    const box = section.getBoundingClientRect();
    assert(box.width > 0 && box.height > 0, `the section has a box (${box.width} x ${box.height})`);
    assert(section.previousElementSibling?.matches('ul.detail-pieces'), 'the section follows the pieces to place');
    const first = stepRows(section)[0];
    assert(first, 'there is a step row');
    equal([...first.children].map((cell) => getComputedStyle(cell).display), [...first.children].map(() => 'block'), 'every cell of a row is a block');
    equal([...first.querySelectorAll('td')].map((cell) => cell.getAttribute('data-label')),
      [t('replay.col.what'), t('replay.col.pieces'), t('replay.col.techniques'), t('replay.col.score')], 'the column names of the cells');
    const table = /** @type {HTMLElement} */ (section.querySelector('table.steps-table'));
    const roleOf = (/** @type {Element} */ node) => node.getAttribute('role');
    equal(roleOf(table), 'table', 'the table role');
    const wrong = [
      ...[...table.querySelectorAll('thead, tbody.steps-group')].filter((node) => roleOf(node) !== 'rowgroup').map((node) => `${node.tagName} is not a rowgroup`),
      ...[...table.querySelectorAll('tr')].filter((node) => roleOf(node) !== 'row').map((node) => `tr.${node.className} is not a row`),
      ...[...table.querySelectorAll('thead th')].filter((node) => roleOf(node) !== 'columnheader').map(() => 'a column header has no role'),
      ...[...table.querySelectorAll('tr.steps-row > th, tr.steps-stage > th')].filter((node) => roleOf(node) !== 'rowheader').map(() => 'a row header has no role'),
      ...[...table.querySelectorAll('td')].filter((node) => roleOf(node) !== 'cell').map(() => 'a cell has no role'),
    ];
    equal(wrong, [], 'the table roles');
    assert(section.scrollWidth <= section.clientWidth + 1, `the section does not scroll sideways (${section.scrollWidth} > ${section.clientWidth})`);
    assert(document.documentElement.scrollWidth <= innerWidth + 1, `the page does not scroll sideways (${document.documentElement.scrollWidth} > ${innerWidth})`);
    chooseView(section, 'all');
    const rated = stepRows(section).find((row) => row.dataset.kind === 'rated');
    assert(rated, 'a rated step is shown in Every step');
    toggleOf(rated).click();
    const detail = detailRowOf(rated);
    assert(detail !== null, 'the rated step opens');
    const board = /** @type {HTMLElement} */ (detail.querySelector('.steps-board'));
    const scores = /** @type {HTMLElement} */ (detail.querySelector('table.pm-replay-table'));
    assert(board.getBoundingClientRect().bottom <= scores.getBoundingClientRect().top + 0.5,
      `the small board is above the score table (${board.getBoundingClientRect().bottom} > ${scores.getBoundingClientRect().top})`);
    assert(section.scrollWidth <= section.clientWidth + 1, `the open step does not scroll the section sideways (${section.scrollWidth} > ${section.clientWidth})`);
    assert(document.documentElement.scrollWidth <= innerWidth + 1, `the open step does not scroll the page sideways (${document.documentElement.scrollWidth} > ${innerWidth})`);
    const targets = [toggleOf(rated), ...section.querySelectorAll('.steps-view label')];
    const small = targets.map((node) => node.getBoundingClientRect()).filter((r) => r.width < 34.5 || r.height < 34.5)
      .map((r) => `${Math.round(r.width)}x${Math.round(r.height)}`);
    equal([targets.length, small], [3, []], 'the open button and the two radio labels are 36 px targets');
    rated.scrollIntoView({ block: 'center' });
    await shot('steps-narrow');
  });
} else {
  await check('1 section: under Pieces to place, the replay matches, every stage has a heading, cards have two buttons', async () => {
    selectCard(SHARED, CANDIDATE);
    const section = sectionOf(SHARED);
    await waitSteps(section);
    assert(section.previousElementSibling?.matches('ul.detail-pieces'), 'the section follows the list of pieces to place');
    assert(section.parentElement?.matches('section.puzzle-detail'), 'the section is in the puzzle detail');
    const heading = /** @type {HTMLElement} */ (section.querySelector('h4.steps-title'));
    equal(heading.textContent, t('replay.title'), 'the heading');
    equal(section.querySelector('table.steps-table')?.getAttribute('aria-labelledby'), heading.id, 'the table is named by the heading');
    equal(statusLines(section), [t('replay.status.matched')], 'the status line');
    equal(section.dataset.result, 'matched', 'the result');
    const stages = [...new Set([...section.querySelectorAll('tbody.steps-group')].map((body) => Number(/** @type {HTMLElement} */ (body).dataset.stage)))].sort();
    equal(stages, [1, 2, 3, 4, 5, 6, 7], 'every stage has a heading');
    assert(stepRows(section).length > 0, 'there is at least one step row');
    equal(document.querySelector('button[data-action="replay"], [data-role^="replay-"]'), null, 'no retired card button and no part of the retired dialog');
    const cards = qa(SHARED, 'li.puzzle-card');
    assert(cards.length >= 2, `${cards.length} cards`);
    for (const card of cards) {
      equal([...card.children].map((c) => [c.tagName, c.classList.contains('card-select'), c.classList.contains('card-remove')]),
        [['BUTTON', true, false], ['BUTTON', false, true]], 'a card has its select button and its remove button only');
    }
    assert(section.scrollWidth <= section.clientWidth + 1, `the section does not scroll sideways (${section.scrollWidth} > ${section.clientWidth})`);
  });

  await check('2 rows: Key steps by default, numbered steps, stage headings, the final row\'s pieces, rules and score', async () => {
    const ctx = SHARED;
    const section = sectionOf(ctx);
    equal(/** @type {HTMLInputElement} */ (section.querySelector('[data-field="steps-view-compact"]')).checked, true, 'Key steps is the default view');
    const rows = stepRows(section);
    const indices = rows.map((row) => Number(row.dataset.index));
    assert(indices.every((n, at) => at === 0 || n > indices[at - 1]), `the step indices increase (${indices})`);
    for (const row of rows) {
      equal(labelOf(row), t('replay.row', { n: Number(row.dataset.index) + 1 }), `the label of step ${row.dataset.index}`);
    }
    for (const body of /** @type {HTMLElement[]} */ ([...section.querySelectorAll('tbody.steps-group')])) {
      const s = Number(body.dataset.stage);
      assert(body.firstElementChild?.matches('tr.steps-stage'), `group ${s} starts with its stage row`);
      equal(body.querySelector('.steps-stage-name')?.textContent, t('replay.stage.heading', { n: s, name: t(`replay.stage.${s}`) }), `the heading of group ${s}`);
    }
    const last = rows[rows.length - 1];
    equal(last.dataset.kind, 'final', 'the last row is the final step');
    const puzzle = /** @type {any} */ (state(ctx).puzzles.find((p) => p.id === CANDIDATE));
    const clueIds = new Set(puzzle.clues.map((/** @type {any} */ pose) => pose.piece));
    equal([...last.querySelectorAll('span.steps-piece')].map((chip) => [/** @type {HTMLElement} */ (chip).dataset.pieceId, chip.textContent]),
      state(ctx).set.pieces.filter((piece) => clueIds.has(piece.id)).map((piece) => [piece.id, pieceLabelText(piece.label)]), 'the final row\'s pieces are the clues');
    const metrics = puzzle.rating.metrics;
    const uses = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'].filter((rule) => metrics.rules[rule] > 0)
      .map((rule) => t('replay.uses', { rule: t(`replay.rule.${rule}`), n: numberText(metrics.rules[rule]) }));
    const techniques = [uses.length === 0 ? t('replay.table.rules.none') : uses.join(', '),
      ...(metrics.G > 0 ? [t('replay.guesses', { count: metrics.G, proved: numberText(metrics.Gproved) })] : [])];
    equal(linesOf(/** @type {Element} */ (last.querySelector('td.steps-techniques'))), techniques, 'the final row\'s techniques');
    equal(linesOf(/** @type {Element} */ (last.querySelector('td.steps-score'))), [numberText(puzzle.rating.score), t('replay.score.inBand')], 'the final row\'s score');
    assert(q(ctx, `li.puzzle-card[data-puzzle-id="${CANDIDATE}"] .card-rating`).textContent?.includes(String(Math.round(puzzle.rating.score))), 'the card shows the same score');
    const rated = rows.filter((row) => row.dataset.kind === 'rated');
    assert(rated.length > 0, 'Key steps has a rated step');
    for (const row of rated) {
      const lines = linesOf(/** @type {Element} */ (row.querySelector('td.steps-score')));
      assert(lines.length >= 2 && Number.isInteger(Number(lines[0].replace(/,/g, ''))) && lines[0] !== '', `a rated step's score is a whole number (${lines})`);
      assert([t('replay.score.inBand'), t('replay.score.outOfBand')].includes(lines[1]), `then in or outside the band (${lines})`);
    }
    assert(!/\bR[1-9]\b/.test(section.textContent ?? ''), 'no rule code is shown, only names');
  });

  await check('3 expand: a layout step and a rated step open in turn; the focus stays; the main board is unchanged', async () => {
    const ctx = SHARED;
    const section = sectionOf(ctx);
    const mainBoard = q(ctx, '.detail-board svg').outerHTML;
    chooseView(section, 'all');
    const layout = stepRows(section).find((row) => row.dataset.kind === 'retile' && row.querySelector('span.steps-piece') !== null);
    assert(layout, 'Every step has a layout step with pieces');
    const chips = layout.querySelectorAll('span.steps-piece').length;
    toggleOf(layout).focus();
    toggleOf(layout).click();
    equal(toggleOf(layout).getAttribute('aria-expanded'), 'true', 'the layout step opens');
    const detail = detailRowOf(layout);
    assert(detail !== null && layout.nextElementSibling === detail, 'its detail row follows it');
    equal(detail.querySelectorAll('.steps-board [data-highlighted="true"]').length, chips, 'the lifted pieces are highlighted');
    equal(detail.querySelector('p.pm-replay-noscore')?.textContent, t('replay.table.noScore'), 'a layout step has no score');
    assert(document.activeElement === toggleOf(layout), 'the focus stays on the button');
    const rated = stepRows(section).find((row) => row.dataset.kind === 'rated');
    assert(rated, 'Every step has a rated step');
    toggleOf(rated).focus();
    toggleOf(rated).click();
    equal(toggleOf(layout).getAttribute('aria-expanded'), 'false', 'the first step closed');
    equal(toggleOf(layout).hasAttribute('aria-controls'), false, 'and has no aria-controls');
    equal(section.querySelectorAll('tr.steps-detail').length, 1, 'one detail row');
    const scoreRow = detailRowOf(rated);
    assert(scoreRow !== null && rated.nextElementSibling === scoreRow, 'the rated step\'s detail row follows it');
    const table = /** @type {HTMLTableElement} */ (scoreRow.querySelector('table.pm-replay-table'));
    assert(table, 'a rated step has a score table');
    equal(table.querySelector('caption')?.textContent, t('replay.table.caption'), 'the caption');
    const body = [...table.querySelectorAll('tbody tr')];
    assert(body.length > 0 && body.every((row) => row.firstElementChild?.tagName === 'TH' && row.firstElementChild.getAttribute('scope') === 'row'), 'every row starts with a row header');
    assert(document.activeElement === toggleOf(rated), 'the focus is on the rated step\'s button');
    equal(q(ctx, '.detail-board svg').outerHTML, mainBoard, 'the main board is unchanged');
    rated.scrollIntoView({ block: 'center' });
    await shot('steps-wide');
  });

  await check('4 view: Every step shows more rows; an open step stays only when shown; the status line does not change', async () => {
    const section = sectionOf(SHARED);
    chooseView(section, 'compact');
    const lines = statusLines(section);
    const key = new Set(stepRows(section).map((row) => row.dataset.index));
    const finalRow = () => /** @type {HTMLElement} */ (stepRows(section).find((row) => row.dataset.kind === 'final'));
    assert(finalRow(), 'Key steps has the final row');
    if (toggleOf(finalRow()).getAttribute('aria-expanded') !== 'true') {
      toggleOf(finalRow()).click();
    }
    chooseView(section, 'all');
    assert(stepRows(section).length > key.size, `Every step has more rows than Key steps (${stepRows(section).length} against ${key.size})`);
    equal(toggleOf(finalRow()).getAttribute('aria-expanded'), 'true', 'the open final step stays open');
    const other = stepRows(section).find((row) => !key.has(row.dataset.index));
    assert(other, 'Every step has a row that Key steps does not');
    toggleOf(other).click();
    equal(toggleOf(other).getAttribute('aria-expanded'), 'true', 'the extra step opens');
    chooseView(section, 'compact');
    equal(section.querySelectorAll('button[aria-expanded="true"]').length, 0, 'no step stays open when it is not shown');
    equal(section.querySelectorAll('tr.steps-detail').length, 0, 'and no detail row');
    equal(statusLines(section), lines, 'the status line is unchanged');
  });

  await check('5 shown again: the view is kept for another puzzle; a puzzle shown before comes back at once, without a run', async () => {
    const ctx = SHARED;
    const section = sectionOf(ctx);
    chooseView(section, 'all');
    const other = state(ctx).puzzles.find((p) => p.id !== CANDIDATE);
    assert(other, 'the run has another puzzle');
    selectCard(ctx, other.id);
    await waitSteps(section);
    equal(/** @type {HTMLInputElement} */ (section.querySelector('[data-field="steps-view-all"]')).checked, true, 'Every step is still chosen for the other puzzle');
    const watch = watchStatus(section);
    selectCard(ctx, CANDIDATE);
    await new Promise(requestAnimationFrame);
    watch.stop();
    equal(section.dataset.phase, 'ready', 'the puzzle shown before is ready at once');
    assert(stepRows(section).length > 0, 'its rows are there');
    equal(statusLines(section), [t('replay.status.matched')], 'its status line');
    assert(!watch.texts.includes(t('replay.loading')) && !watch.texts.includes(t('replay.waiting')), `no loading or waiting text was shown (${JSON.stringify(watch.texts)})`);
  });

  await check('7 language: Vietnamese texts with a step open; the same step stays open and keeps the focus', async () => {
    const section = sectionOf(SHARED);
    const rated = stepRows(section).find((row) => row.dataset.kind === 'rated');
    assert(rated, 'a rated step is shown');
    const index = rated.dataset.index;
    if (toggleOf(rated).getAttribute('aria-expanded') !== 'true') {
      toggleOf(rated).click();
    }
    toggleOf(rated).focus();
    const vi = packOf('vi');
    const en = packOf('en');
    try {
      setLocale('vi');
      equal(section.querySelector('h4.steps-title')?.textContent, vi['replay.title'], 'the heading');
      equal(section.querySelector('h4.steps-title')?.textContent, 'Các bước tạo đề', 'the Vietnamese heading');
      equal([...section.querySelectorAll('thead th')].map((th) => th.textContent),
        ['replay.col.step', 'replay.col.what', 'replay.col.pieces', 'replay.col.techniques', 'replay.col.score'].map((key) => vi[key]), 'the column headers');
      equal(statusLines(section), [vi['replay.status.matched']], 'the status line');
      equal(section.querySelector('tbody.steps-group[data-stage="1"] .steps-stage-name')?.textContent, 'Giai đoạn 1: Số mảnh', 'the heading of stage 1');
      const names = RULE_KEYS.map((key) => vi[key]);
      assert([...section.querySelectorAll('td.steps-techniques')].some((cell) => names.some((name) => (cell.textContent ?? '').includes(name))), 'a rule name is in Vietnamese');
      const same = /** @type {HTMLElement} */ (section.querySelector(`tr.steps-row[data-index="${index}"]`));
      equal(toggleOf(same).getAttribute('aria-expanded'), 'true', 'the same step is still open');
      assert(document.activeElement === toggleOf(same), 'and keeps the focus');
    } finally {
      setLocale('en');
    }
    equal(section.querySelector('h4.steps-title')?.textContent, en['replay.title'], 'the heading in English again');
    equal(statusLines(section), [en['replay.status.matched']], 'the status line in English again');
  });

  await check('8 calibration: stage 4 needed no steps; highlights only in stages 5 and 6', async () => {
    const ctx = SHARED;
    const calibration = kindsOf(ctx).find((p) => p.kind === 'calibration');
    assert(calibration, `the run has no calibration card; kinds: ${JSON.stringify(kindsOf(ctx))}`);
    selectCard(ctx, calibration.id);
    const section = sectionOf(ctx);
    await waitSteps(section);
    equal(statusLines(section), [t('replay.status.matched')], 'the status line');
    /** @param {string} when */
    const noStage4Steps = (when) => {
      const group = /** @type {HTMLElement} */ (section.querySelector('tbody.steps-group[data-stage="4"]'));
      assert(group, `stage 4 has a group ${when}`);
      const stageRow = /** @type {HTMLElement} */ (group.querySelector('tr.steps-stage'));
      equal([stageRow.dataset.mark, stageRow.querySelector('.steps-stage-mark')?.textContent, group.querySelectorAll('tr.steps-row').length],
        ['none', t('replay.stage.none'), 0], `stage 4 ${when}`);
    };
    noStage4Steps('in Key steps');
    chooseView(section, 'all');
    noStage4Steps('in Every step');
    const seen = [];
    let highlighted = 0;
    for (const index of stepRows(section).map((row) => /** @type {string} */ (row.dataset.index))) {
      const row = /** @type {HTMLElement} */ (section.querySelector(`tr.steps-row[data-index="${index}"]`));
      toggleOf(row).click();
      const stage = /** @type {HTMLElement} */ (row.closest('tbody.steps-group')).dataset.stage;
      seen.push(stage);
      if (detailRowOf(row)?.querySelector('.steps-board [data-highlighted="true"]') != null) {
        highlighted += 1;
        assert(stage === '5' || stage === '6', `a highlight outside stages 5 and 6: step ${Number(index) + 1} in stage ${stage}`);
      }
    }
    assert(seen.length > 3 && highlighted > 0, `the calibration replay has steps with highlights (${seen.length} steps, ${highlighted} with highlights)`);
  });

  // The page slots are looked up in the whole document, so two apps cannot be mounted at once: the shared run ends here.
  await releaseShared();

  await check('6 unavailable: an imported puzzle keeps the section, with one row for the stored puzzle', async () => {
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
      const section = sectionOf(ctx);
      await waitSteps(section);
      equal(section.dataset.result, 'unavailable', 'the result');
      equal(statusLines(section), [t('replay.status.unavailable'), t('replay.reason.no-set-origin')], 'the status line');
      const puzzle = /** @type {any} */ (state(ctx).puzzles[0]);
      /** @param {string} when */
      const onlyTheStoredRow = (when) => {
        for (let stage = 1; stage <= 6; stage += 1) {
          const stageRow = /** @type {HTMLElement} */ (section.querySelector(`tbody.steps-group[data-stage="${stage}"] tr.steps-stage`));
          assert(stageRow, `stage ${stage} has a group ${when}`);
          equal([stageRow.dataset.mark, stageRow.querySelector('.steps-stage-mark')?.textContent,
            section.querySelectorAll(`tbody.steps-group[data-stage="${stage}"] tr.steps-row`).length], ['notAvailable', t('replay.notAvailable'), 0], `stage ${stage} ${when}`);
        }
        const rows = stepRows(section);
        equal(rows.length, 1, `one step row ${when}`);
        equal(rows[0].dataset.kind, 'final', `the only row is the final step ${when}`);
        equal(rows[0].querySelector('td.steps-what')?.textContent, t('replay.step.final.stored'), `its sentence ${when}`);
        equal(linesOf(/** @type {Element} */ (rows[0].querySelector('td.steps-score'))), [numberText(puzzle.rating.score)], `its score ${when}`);
        equal(rows[0].querySelector('td.steps-techniques')?.textContent, t('replay.table.unavailable'), `its techniques ${when}`);
      };
      onlyTheStoredRow('in Key steps');
      chooseView(section, 'all');
      onlyTheStoredRow('in Every step');
    } finally {
      ctx.destroy();
    }
  });

  await check('9 another puzzle: its own signal is aborted; a puzzle shown before is not run again', async () => {
    /** @type {Array<{ source: any, signal: AbortSignal }>} */
    const calls = [];
    /** @type {Array<ReturnType<typeof deferred>>} */
    const pending = [];
    const alone = mountAlone((source, signal) => {
      const d = deferred();
      calls.push({ source, signal });
      pending.push(d);
      return d.promise;
    });
    try {
      const { steps, section } = alone;
      steps.show(A, CONTEXT);
      equal(calls.length, 1, 'the first puzzle is run');
      steps.show(B, CONTEXT);
      equal(calls.length, 2, 'the second puzzle is run');
      assert(calls[0].signal.aborted, 'the first run\'s own signal is aborted');
      assert(!calls[1].signal.aborted && calls[1].source === B, 'the second run is for the second puzzle and live');
      pending[1].resolve(scriptedResult('matched', null));
      await waitFor(() => section.dataset.phase === 'ready', 'the second puzzle\'s steps', 5000);
      equal(stepRows(section).length, 4, 'four step rows');
      steps.show(A, CONTEXT);
      equal(calls.length, 3, 'an aborted run is not kept: the first puzzle is run again');
      pending[2].resolve(scriptedResult('matched', null));
      await waitFor(() => section.dataset.phase === 'ready' && calls.length === 3, 'the first puzzle\'s steps', 5000);
      steps.show(B, CONTEXT);
      equal([calls.length, section.dataset.phase], [3, 'ready'], 'the second puzzle comes back at once, without a run');
    } finally {
      alone.dispose();
    }
  });

  await check('10 a new generation: the replay is submitted again; the waiting text', async () => {
    let calls = 0;
    const alone = mountAlone(async () => {
      calls += 1;
      if (calls === 1) {
        throw new PoolAbortError('cancelled');
      }
      return scriptedResult('matched', null);
    });
    try {
      const watch = watchStatus(alone.section);
      alone.steps.show(A, CONTEXT);
      await waitFor(() => alone.section.dataset.phase === 'ready', 'the replay to be submitted again', 5000);
      await new Promise(requestAnimationFrame);
      watch.stop();
      equal(calls, 2, 'the replay was submitted twice');
      assert(!watch.texts.includes(t('replay.failed')) && !watch.texts.includes(t('replay.failed.worker')), `no failure text was shown (${JSON.stringify(watch.texts)})`);
    } finally {
      alone.dispose();
    }
    let started = 0;
    const waiting = mountAlone(() => {
      started += 1;
      return new Promise(() => {});
    });
    try {
      waiting.steps.show(A, { rotation: 0, busy: true });
      equal(statusLines(waiting.section), [t('replay.waiting')], 'the waiting text while a generation runs');
      waiting.steps.show(A, { rotation: 0, busy: false });
      equal(statusLines(waiting.section), [t('replay.loading')], 'the loading text once it ended');
      equal(started, 1, 'no second run');
    } finally {
      waiting.dispose();
    }
  });

  await check('11 failure: the worker message and Try again', async () => {
    let calls = 0;
    const alone = mountAlone(async () => {
      calls += 1;
      if (calls === 1) {
        throw new PoolError('worker-unavailable', 'no worker');
      }
      return scriptedResult('matched', null);
    });
    try {
      const { steps, section } = alone;
      const retry = /** @type {HTMLButtonElement} */ (section.querySelector('button[data-action="steps-retry"]'));
      steps.show(A, CONTEXT);
      await waitFor(() => section.dataset.phase === 'failed', 'the failure', 5000);
      equal(statusLines(section), [t('replay.failed.worker')], 'the worker message');
      assert(!retry.hidden && retry.textContent === t('replay.retry'), 'Try again is shown');
      retry.click();
      await waitFor(() => section.dataset.phase === 'ready', 'the replay after Try again', 5000);
      equal(calls, 2, 'Try again ran the replay again');
      assert(retry.hidden, 'Try again is hidden again');
    } finally {
      alone.dispose();
    }
  });

  await check('12 incomplete, mismatch and unavailable: the status names the limit, the field or the reason; the last row is the stored puzzle', async () => {
    /**
     * @param {ReturnType<typeof scriptedResult>} result
     * @param {(section: HTMLElement) => void} verify
     */
    const inASection = async (result, verify) => {
      const alone = mountAlone(async () => result);
      try {
        alone.steps.show(A, CONTEXT);
        await waitSteps(alone.section);
        equal(alone.section.dataset.result, result.status, 'the result');
        verify(alone.section);
        const last = stepRows(alone.section).at(-1);
        equal(last?.querySelector('td.steps-what')?.textContent, t('replay.step.final.stored'), `the final step of a ${result.status} result is the stored puzzle`);
      } finally {
        alone.dispose();
      }
    };
    /**
     * @param {HTMLElement} section
     * @param {number[]} stages
     * @param {string} mark
     * @param {string} [text]
     */
    const marks = (section, stages, mark, text) => {
      for (const stage of stages) {
        const stageRow = /** @type {HTMLElement} */ (section.querySelector(`tbody.steps-group[data-stage="${stage}"] tr.steps-stage`));
        assert(stageRow, `stage ${stage} has a group`);
        equal(stageRow.dataset.mark, mark, `the mark of stage ${stage}`);
        if (text !== undefined) {
          equal(stageRow.querySelector('.steps-stage-mark')?.textContent, text, `the mark text of stage ${stage}`);
        }
      }
    };
    await inASection(scriptedResult('incomplete', 'work'), (section) => {
      equal(statusLines(section), [t('replay.status.incomplete', { reason: t('replay.limit.work') })], 'the incomplete status line');
      marks(section, [4, 5, 6], 'stopped');
    });
    await inASection(scriptedResult('mismatch', 'rating'), (section) => {
      equal(statusLines(section), [t('replay.status.mismatch', { field: t('replay.field.rating') })], 'the mismatch status line');
      marks(section, [4, 5, 6], 'notAvailable');
    });
    await inASection(scriptedResult('unavailable', 'no-record'), (section) => {
      equal(statusLines(section), [t('replay.status.unavailable'), t('replay.reason.no-record')], 'the unavailable status line');
      /** @param {string} when */
      const one = (when) => {
        const rows = stepRows(section);
        equal(rows.length, 1, `one row ${when}`);
        equal([rows[0].dataset.index, rows[0].dataset.kind, labelOf(rows[0])], ['0', 'final', t('replay.row', { n: 1 })], `the row ${when}`);
        marks(section, [1, 2, 3, 4, 5, 6], 'notAvailable', t('replay.notAvailable'));
      };
      one('in Key steps');
      chooseView(section, 'all');
      one('in Every step');
    });
  });

  await check('13 no CSP violations and no uncaught errors', () => {
    equal(violations, [], 'CSP violations');
    equal(uncaught, [], 'uncaught errors');
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
document.title = `${summary.textContent} - Generation steps harness`;
document.documentElement.dataset.result = failed.length === 0 ? 'pass' : 'fail';
