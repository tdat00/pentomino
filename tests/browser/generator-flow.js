// @ts-check
// Browser regression harness for T18 (generator jobs, puzzle cards and Play). It drives the
// real generator panels with DOM events: three real-engine flows in module workers, then scripted
// clients for streaming, partial results, stale replies and Play. It writes a
// pass/fail list into the page and sets data-result on <html>. It is a developer fixture, not deployed.

import { boardToRows } from '../../core/engine/board.js';
import { parsePack, validatePack } from '../../core/engine/pack.js';
import { createGeneratorApp } from '../../generator/app.js';
import { balancedRows } from '../../generator/ui/set-panel.js';
import { formatMessage, formatNotice } from '../../generator/strings.js';
import { setCell, withBoard } from '../../generator/state.js';

/** @param {{ setsByBoard: Record<string, readonly unknown[]> }} s @returns {number} Saved sets of every board (the set on show is not saved). */
const savedCount = (s) => Object.values(s.setsByBoard).flat().length;

const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));

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
    await sleep(25);
  }
}

const sandbox = /** @type {HTMLElement} */ (document.getElementById('sandbox'));
const recipes = (await (await fetch('../fixtures/ui-flow-recipes.json')).json()).recipes;
const samplePack = /** @type {any} */ (parsePack(await (await fetch('../fixtures/generated-sample-pack.json')).text())).value;
const witness = samplePack.witness ?? samplePack.puzzles[0].solution;
/** A second set on the same 10 x 6 board with other pieces: generating twice must not give the same set. */
const handPack = /** @type {any} */ (parsePack(await (await fetch('../fixtures/hand-authored-pack.json')).text())).value;
const handWitness = handPack.witness ?? handPack.puzzles[0].solution;

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

/**
 * @param {{ denySave?: boolean }} [o]
 */
function memoryStorage(o = {}) {
  /** @type {unknown} */
  let saved = null;
  const calls = { generatorSaves: 0 };
  return {
    calls,
    getGeneratorState: () => saved,
    setGeneratorState: (/** @type {unknown} */ snapshot) => {
      calls.generatorSaves += 1;
      if (o.denySave) {
        return { ok: false };
      }
      saved = JSON.parse(JSON.stringify(snapshot));
      return { ok: true };
    },
    getPrefs: () => ({}),
    setPrefs: () => ({ ok: true }),
  };
}

let seedCounter = 0;

/**
 * The harness batch size: most flows below were written for batches of 5 (the app itself starts at 1 per press).
 * @param {{ app?: Record<string, any>, storage?: ReturnType<typeof memoryStorage>, quantity?: number }} [o]
 */
function mountApp(o = {}) {
  const root = h('div', { class: 'harness-app' },
    h('main', { class: 'layout' },
      h('section', { class: 'panel panel-board' }, h('div', { 'data-slot': 'board' })),
      h('section', { class: 'panel panel-level' }, h('div', { 'data-slot': 'level' })),
      h('section', { class: 'panel panel-set' }, h('div', { 'data-slot': 'set' })),
      h('section', { class: 'panel panel-puzzles' }, h('div', { 'data-slot': 'puzzles' }))),
    h('div', { class: 'main-actions' }, h('button', { type: 'button', 'data-slot': 'main-action' }, 'New Piece Set')));
  sandbox.append(root);
  const storage = o.storage ?? memoryStorage();
  /** @type {string | null} Batch seed fed to the next puzzle press (recorded batches are replayed with "<set seed>#1"). */
  let batchSeedOverride = null;
  /** @type {string[]} */
  const toasts = [];
  const app = createGeneratorApp(document, {
    storage: /** @type {any} */ (storage),
    random: () => `HARN-${String((seedCounter += 1)).padStart(4, '0')}-SEED`,
    randomNumber: () => batchSeedOverride ?? String(1000 + (seedCounter += 1)),
    ...o.app,
    controller: {
      notify: (/** @type {string} */ message) => toasts.push(message),
      // Scripted puzzles reuse a few real clue sets under other ids; only the real engine runs the real duplicate check.
      ...(o.app?.client === undefined ? {} : { duplicateGuard: () => ({ admit: () => true, rejected: new Set() }) }),
      ...o.app?.controller,
    },
  });
  if (o.quantity !== 1) {
    app.store.update({ quantity: o.quantity ?? 5 });
  }
  return {
    root,
    app,
    storage,
    toasts,
    /** @param {string | null} seed */
    replayBatchSeed(seed) {
      batchSeedOverride = seed;
    },
    destroy() {
      app.destroy();
      root.remove();
    },
  };
}

/**
 * @param {ReturnType<typeof mountApp>} ctx
 * @param {string} selector
 * @returns {HTMLElement}
 */
function q(ctx, selector) {
  const found = /** @type {HTMLElement | null} */ (ctx.root.querySelector(selector));
  assert(found, `missing ${selector}`);
  return /** @type {HTMLElement} */ (found);
}

/**
 * @param {ReturnType<typeof mountApp>} ctx
 * @param {string} selector
 * @returns {HTMLElement[]}
 */
const qa = (ctx, selector) => /** @type {HTMLElement[]} */ ([...ctx.root.querySelectorAll(selector)]);

/**
 * @param {ReturnType<typeof mountApp>} ctx
 * @param {string} levelId
 */
function chooseLevel(ctx, levelId) {
  const radio = /** @type {HTMLInputElement} */ (q(ctx, `[data-field="level"] input[value="${levelId}"]`));
  assert(!radio.disabled, `${levelId} is offered`);
  radio.click();
}

/**
 * @param {ReturnType<typeof mountApp>} ctx
 * @param {string} selector
 * @param {string} value
 */
function setField(ctx, selector, value) {
  const input = /** @type {HTMLInputElement} */ (q(ctx, selector));
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** @param {ReturnType<typeof mountApp>} ctx */
const state = (ctx) => ctx.app.store.getState();

/**
 * @param {ReturnType<typeof mountApp>} ctx
 * @param {(typeof recipes)[number]} recipe
 */
function setUpBoard(ctx, recipe) {
  if (recipe.name.startsWith('heart')) {
    assert(ctx.app.editor.applyPreset('heart', { n: 10 }), 'heart preset applied');
  } else {
    assert(ctx.app.editor.resize(recipe.boardRows[0].length, recipe.boardRows.length), 'board resized');
  }
  equal(boardToRows(state(ctx).board), recipe.boardRows, 'board rows');
  equal(state(ctx).rotation, recipe.rotation, 'display rotation');
}

/**
 * Runs Generate Piece Set then New Puzzle through the real controls.
 * @param {ReturnType<typeof mountApp>} ctx
 * @param {(typeof recipes)[number]} recipe
 */
async function runFlow(ctx, recipe) {
  setUpBoard(ctx, recipe);
  chooseLevel(ctx, recipe.levelId);
  setField(ctx, '[data-field="seed"]', recipe.seedText);
  /** @type {number[]} */
  const counts = [];
  ctx.app.store.subscribe((s) => {
    if (counts.at(-1) !== s.puzzles.length) {
      counts.push(s.puzzles.length);
    }
  });
  q(ctx, '[data-action="generate-set"]').click();
  await waitFor(() => state(ctx).set !== null && state(ctx).job === null, 'the piece set', 120000);
  equal(state(ctx).notice, null, 'no notice after the set');
  equal(state(ctx).set?.pieces.length, recipe.expect.pieces, 'piece count');
  // The recorded batches were made with the seed "<set seed>#1": feed it as the batch seed so the replay is exact.
  ctx.replayBatchSeed(`${recipe.seedText}#1`);
  ctx.app.store.update({ quantity: recipe.quantity });
  const set = state(ctx).set;
  q(ctx, '[data-action="new-puzzles"]').click();
  await waitFor(() => state(ctx).puzzles.length > 0 || state(ctx).job === null, 'the first puzzle', 120000);
  await waitFor(() => state(ctx).job === null, 'the batch', 120000);
  equal(state(ctx).set, set, 'the set object is unchanged');
  equal(state(ctx).notice, null, 'no notice after the batch');
  equal(state(ctx).puzzles.length, recipe.expect.puzzles, 'puzzle count');
  equal(state(ctx).puzzles.map((p) => Math.round(p.rating?.score ?? -1)), recipe.expect.scores, 'scores match the Node run');
  assert(counts.every((n, i) => i === 0 || n >= counts[i - 1] || n === 0), 'cards only ever grow while streaming');
  equal(qa(ctx, '.puzzle-card').length, recipe.expect.puzzles, 'card elements');
}

for (const recipe of recipes) {
  await check(`real engine: ${recipe.name} → set → ${recipe.quantity} puzzles → Play`, async () => {
    /** @type {Array<{ pack: any, index: number }>} */
    const opened = [];
    const ctx = mountApp({ app: { controller: { openPlayer: async (/** @type {any} */ pack, /** @type {number} */ index) => void opened.push({ pack, index }) } } });
    try {
      await runFlow(ctx, recipe);
      const puzzles = state(ctx).puzzles;
      assert(qa(ctx, '.puzzle-card a').length === 0 && qa(ctx, '.puzzle-card button').length === 2 * puzzles.length
        && qa(ctx, '.puzzle-card button').every((b) => b.dataset.action === 'remove' || b.dataset.action === 'select'), 'a card only has its select and remove buttons');
      q(ctx, '[data-action="play-puzzle"]').click();
      await waitFor(() => opened.length === 1, 'the player to open');
      const { pack, index } = opened[0];
      equal(index, puzzles.length - 1, 'Play opens the puzzle on show');
      assert(validatePack(pack).ok, 'the pack validates');
      equal(pack.puzzles.length, puzzles.length, 'the pack carries every puzzle');
      equal(pack.pieces.map((/** @type {any} */ p) => p.id), state(ctx).set?.pieces.map((p) => p.id), 'the pack carries every piece');
      equal(pack.puzzles.map((/** @type {any} */ p) => p.clues), puzzles.map((p) => p.clues), 'the pack carries every clue');
    } finally {
      ctx.destroy();
    }
  });
}

await check('real engine: certificates arrive lazily on the default flow and the pack carries them', async () => {
  /** @type {any[]} */
  const openedPacks = [];
  const ctx = mountApp({ app: { controller: { openPlayer: async (/** @type {any} */ pack) => void openedPacks.push(pack) } } });
  try {
    await runFlow(ctx, recipes[0]);
    assert(state(ctx).checking.length > 0 || state(ctx).puzzles.every((p) => p.certificate !== null), 'certificates start pending');
    await waitFor(() => state(ctx).checking.length === 0, 'certificates', 90000);
    const texts = qa(ctx, '.card-cert').map((n) => n.textContent);
    assert(texts.every((t) => ['Unique solution ✓', 'Multiple solutions', 'At least 1 solution'].includes(t ?? '')), `certificate texts: ${texts.join(' | ')}`);
    q(ctx, '[data-action="play-puzzle"]').click();
    await waitFor(() => openedPacks.length === 1, 'the player to open');
    const pack = openedPacks[0];
    equal(pack.puzzles.map((/** @type {any} */ p) => p.certificate?.status ?? null), state(ctx).puzzles.map((p) => p.certificate?.status ?? null), 'the pack carries the certificates that are known');
    assert(pack.puzzles.every((/** @type {any} */ p) => p.certificate !== null && p.certificate !== undefined), 'every certificate settled before Play');
  } finally {
    ctx.destroy();
  }
});

await check('real engine: Cancel keeps the set and any accepted puzzles, and a later batch still works', async () => {
  const ctx = mountApp();
  try {
    const recipe = recipes[2];
    setUpBoard(ctx, recipe);
    chooseLevel(ctx, recipe.levelId);
    setField(ctx, '[data-field="seed"]', recipe.seedText);
    q(ctx, '[data-action="generate-set"]').click();
    await waitFor(() => state(ctx).set !== null && state(ctx).job === null, 'the large piece set', 120000);
    const set = state(ctx).set;
    ctx.app.store.update({ quantity: 10 });
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).job !== null, 'the job to start');
    ctx.app.controller.cancel();
    await waitFor(() => state(ctx).job === null, 'the cancelled job to end', 20000);
    equal(state(ctx).set, set, 'the set is untouched');
    assert(state(ctx).batchIndex === 1, 'the cancelled request still counted');
    const notice = state(ctx).notice;
    assert(notice === null || notice.code === 'M-CANCELLED-BATCH', `cancel or finished first: ${notice?.code}`);
    const kept = state(ctx).puzzles.length;
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).job !== null || state(ctx).batchIndex === 2, 'a second batch to start');
    await waitFor(() => state(ctx).job === null, 'the second batch', 120000);
    equal(state(ctx).batchIndex, 2, 'second request index');
    equal(state(ctx).puzzles.length, kept + 10, 'a full batch is added after the puzzles kept from the cancelled one');
  } finally {
    ctx.destroy();
  }
});

await check('real engine: a 7x5 Easy set with two arrangements reports "Found 2/2 arrangements" as a complete outcome, then no arrangements left', async () => {
  const ctx = mountApp();
  try {
    assert(ctx.app.editor.resize(7, 5), 'board resized');
    chooseLevel(ctx, 'easy');
    setField(ctx, '[data-field="seed"]', 'demo');
    q(ctx, '[data-action="generate-set"]').click();
    await waitFor(() => state(ctx).set !== null && state(ctx).job === null, 'the piece set', 120000);
    ctx.app.store.update({ quantity: 10 });
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).job === null && state(ctx).batchIndex === 1, 'the batch', 120000);
    equal(state(ctx).puzzles.length, 2, 'both arrangements became puzzles');
    const notice = q(ctx, '[data-role="notice"] .notice');
    equal(notice.textContent, 'Found 2/2 arrangements, the most this piece set allows. Generate a new piece set for more Easy puzzles.', 'notice text');
    equal(notice.getAttribute('data-code'), 'N-ARRANGEMENTS', 'notice code');
    assert(notice.classList.contains('notice-info') && !notice.classList.contains('notice-warning') && !notice.classList.contains('notice-error'), `tone: ${notice.className}`);
    assert(ctx.root.querySelector('[data-action="new-set"]') !== null, 'a new piece set stays available');
    equal(qa(ctx, '.puzzle-card').length, 2, 'cards stay visible');
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).job === null && state(ctx).batchIndex === 2, 'the second batch', 120000);
    equal(state(ctx).puzzles.length, 2, 'nothing new was added');
    equal(q(ctx, '[data-role="notice"] .notice').textContent, 'This piece set has no arrangements left: all 2 have been used. Generate a new piece set for more Easy puzzles.', 'second notice');
  } finally {
    ctx.destroy();
  }
});

/**
 * @param {number} i
 * @param {number} [offset]
 */
function makePuzzle(i, offset = 0) {
  const base = samplePack.puzzles[i % samplePack.puzzles.length];
  return {
    id: `h${i}`,
    title: `Normal #${offset + 1}`,
    clues: base.clues,
    solution: base.solution,
    rating: { model: 'difficulty-v2', score: 14, level: 'normal', saturated: false, metrics: base.rating?.metrics ?? { U: 1, B: 1, branchTrials: 1, rowTrials: 1, stop: 'solution', R: 1, H: 1 } },
    certificate: null,
  };
}

/**
 * @param {{ set?: (input: any, hooks: any) => any, batch?: (input: any, hooks: any) => any }} script
 */
function scriptedClient(script) {
  /** @type {any[]} */
  const batches = [];
  let setRequests = 0;
  const client = {
    batches,
    cancels: 0,
    async generateSet(/** @type {any} */ input, /** @type {any} */ hooks) {
      if (script.set) {
        return script.set(input, hooks);
      }
      // The sets alternate, so Generate twice in a row adds a new set instead of repeating the first.
      const first = setRequests % 2 === 0;
      setRequests += 1;
      return {
        status: 'complete',
        set: { board: scriptedBoard, pieces: first ? samplePack.pieces : handPack.pieces, witness: first ? witness : handWitness, carving: 'flat', macroRegion: null },
        calibration: first ? makePuzzle(0) : null,
        attempt: 0,
      };
    },
    async generateBatch(/** @type {any} */ input, /** @type {any} */ hooks) {
      batches.push(input);
      return script.batch ? script.batch(input, hooks) : { status: 'complete', accepted: [], seenLayouts: [], seenClues: [] };
    },
    cancel() {
      client.cancels += 1;
    },
    recycle() {},
  };
  return client;
}

/** @type {any} */
let scriptedBoard = null;

/** @param {ReturnType<typeof mountApp>} ctx */
async function withSet(ctx) {
  scriptedBoard = ctx.app.store.getState().board;
  q(ctx, '[data-action="generate-set"]').click();
  await waitFor(() => state(ctx).set !== null && state(ctx).job === null, 'the scripted set');
}

await check('scripted: New Piece Set and New Puzzle show a spinner on the pressed button and the elapsed time in small text under it', async () => {
  /** @type {() => void} */
  let freeSet = () => {};
  /** @type {() => void} */
  let freeBatch = () => {};
  const setHold = new Promise((resolve) => {
    freeSet = () => resolve(undefined);
  });
  const batchHold = new Promise((resolve) => {
    freeBatch = () => resolve(undefined);
  });
  const client = scriptedClient({
    set: async () => {
      await setHold;
      return {
        status: 'complete',
        set: { board: scriptedBoard, pieces: samplePack.pieces, witness, carving: 'flat', macroRegion: null },
        calibration: makePuzzle(0),
        attempt: 0,
      };
    },
    batch: async (input, hooks) => {
      const puzzle = makePuzzle(2, 0);
      hooks.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: input.quantity });
      await batchHold;
      return { status: 'complete', accepted: [puzzle], seenLayouts: [], seenClues: [] };
    },
  });
  const ctx = mountApp({ quantity: 1, app: { client: /** @type {any} */ (client) } });
  try {
    scriptedBoard = ctx.app.store.getState().board;
    /** @param {HTMLElement} button */
    const spinnerOf = (button) => /** @type {HTMLElement} */ (button.querySelector('.spinner'));
    const generate = q(ctx, '[data-action="generate-set"]');
    const setClock = q(ctx, '.set-controls .job-elapsed');
    assert(setClock.hidden && spinnerOf(generate).hidden, 'idle: no spinner and no clock');
    generate.click();
    await waitFor(() => state(ctx).job?.kind === 'set', 'the piece set job');
    assert(!spinnerOf(generate).hidden && generate.getAttribute('aria-busy') === 'true', 'the spinner turns on the button');
    assert(!setClock.hidden && /^Elapsed: \d+:\d\d$/.test(setClock.textContent ?? ''), `the clock: ${setClock.textContent}`);
    assert(generate.nextElementSibling === setClock, 'the clock sits right under the button');
    freeSet();
    await waitFor(() => state(ctx).set !== null && state(ctx).job === null, 'the piece set');
    assert(setClock.hidden && spinnerOf(generate).hidden, 'the spinner and the clock go when the job ends');

    const press = q(ctx, '[data-action="new-puzzles"]');
    const puzzleClock = q(ctx, '.puzzle-controls .job-elapsed');
    assert(puzzleClock.hidden && spinnerOf(press).hidden, 'idle: no spinner and no clock under New Puzzle');
    press.click();
    await waitFor(() => state(ctx).job?.kind === 'batch', 'the puzzle job');
    assert(!spinnerOf(press).hidden && press.getAttribute('aria-busy') === 'true', 'the spinner turns on New Puzzle');
    assert(!puzzleClock.hidden && /^Elapsed: \d+:\d\d$/.test(puzzleClock.textContent ?? ''), `the clock: ${puzzleClock.textContent}`);
    assert(setClock.hidden, 'the piece set clock stays off during a puzzle job');
    equal(press.nextElementSibling, puzzleClock, 'the clock sits right under the button');
    freeBatch();
    await waitFor(() => state(ctx).puzzles.length === 1 && state(ctx).job === null, 'the puzzle');
    assert(puzzleClock.hidden && spinnerOf(press).hidden, 'the spinner and the clock go when the job ends');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: after 30 s the New Piece Set and New Puzzle buttons turn into Cancel and cancel their job', async () => {
  let clock = 1000;
  /** @type {() => void} */
  let freeSet = () => {};
  /** @type {() => void} */
  let freeBatch = () => {};
  const setHold = new Promise((resolve) => {
    freeSet = () => resolve(undefined);
  });
  const batchHold = new Promise((resolve) => {
    freeBatch = () => resolve(undefined);
  });
  let setCalls = 0;
  const client = scriptedClient({
    set: async () => {
      setCalls += 1;
      if (setCalls === 1) {
        await setHold;
        return { status: 'cancelled' };
      }
      return {
        status: 'complete',
        set: { board: scriptedBoard, pieces: samplePack.pieces, witness, carving: 'flat', macroRegion: null },
        calibration: makePuzzle(0),
        attempt: 0,
      };
    },
    batch: async () => {
      await batchHold;
      return { status: 'cancelled', accepted: [], seenLayouts: [], seenClues: [] };
    },
  });
  const ctx = mountApp({ quantity: 1, app: { client: /** @type {any} */ (client), now: () => clock, controller: { now: () => clock } } });
  try {
    scriptedBoard = ctx.app.store.getState().board;
    /** @param {HTMLElement} button @returns {string} The label on show. */
    const label = (button) => [...button.children].filter((child) => !(/** @type {HTMLElement} */ (child)).hidden && !child.classList.contains('spinner')).map((child) => child.textContent).join('');
    const generate = q(ctx, '[data-action="generate-set"]');
    equal(label(generate), 'New Piece Set', 'idle label');
    generate.click();
    await waitFor(() => state(ctx).job?.kind === 'set', 'the piece set job');
    clock += 29000;
    await sleep(700);
    equal([label(generate), generate.disabled], ['New Piece Set', true], 'before 30 s it is a busy button');
    clock += 2000;
    await waitFor(() => label(generate) === 'Cancel', 'the Cancel label after 30 s');
    assert(!generate.disabled, 'Cancel can be pressed');
    generate.click();
    equal(client.cancels, 1, 'it cancels the job');
    await waitFor(() => generate.disabled, 'the button waits for the job to stop');
    freeSet();
    await waitFor(() => state(ctx).job === null, 'the cancelled job to end');
    equal([state(ctx).notice?.code, label(generate)], ['M-CANCELLED-SET', 'New Piece Set'], 'the button is itself again');

    await withSet(ctx);
    const press = q(ctx, '[data-action="new-puzzles"]');
    press.click();
    await waitFor(() => state(ctx).job?.kind === 'batch', 'the puzzle job');
    equal([label(press), press.disabled], ['New Puzzle', true], 'a busy button at first');
    clock += 31000;
    await waitFor(() => label(press) === 'Cancel', 'the Cancel label on New Puzzle after 30 s');
    assert(!press.disabled, 'Cancel can be pressed');
    press.click();
    equal(client.cancels, 2, 'it cancels the puzzle job');
    freeBatch();
    await waitFor(() => state(ctx).job === null, 'the cancelled job to end');
    equal(label(press), 'New Puzzle', 'the button is itself again');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: cards stream in one by one, with Checking first', async () => {
  const release = { resolve: () => {} };
  const hold = new Promise((resolve) => {
    release.resolve = () => resolve(undefined);
  });
  const client = scriptedClient({
    batch: async (input, hooks) => {
      const accepted = [makePuzzle(1, 0), makePuzzle(2, 1)];
      for (const [index, puzzle] of accepted.entries()) {
        hooks.onAccepted({ revision: input.revision, index, puzzle, accepted: index + 1, quantity: input.quantity });
        await sleep(30);
      }
      await hold;
      return { status: 'complete', accepted, seenLayouts: [], seenClues: [] };
    },
  });
  const ctx = mountApp({ app: { client: /** @type {any} */ (client) } });
  try {
    await withSet(ctx);
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => qa(ctx, '.puzzle-card').length === 2, 'two streamed cards');
    assert(state(ctx).job !== null, 'still running');
    equal(qa(ctx, '.card-cert').map((n) => n.textContent), ['Checking…', 'Checking…'], 'first certificate state');
    equal(ctx.root.querySelector('[data-role="progress"]'), null, 'there is no loading panel');
    equal(qa(ctx, '.puzzle-card .card-rating').map((n) => /^Normal: score \d+$/.test(n.textContent ?? '')), [true, true], 'level and score');
    equal(qa(ctx, '.puzzle-card .card-seed').map((n) => /^Seed: \d+$/.test(n.textContent ?? '')), [true, true], 'the batch seed on its own line');
    equal(qa(ctx, '.puzzle-card .card-heading').map((n) => n.textContent), ['Puzzle #2', 'Puzzle #1'], 'newest on top, numbered in creation order');
    assert(q(ctx, '[data-action="new-puzzles"]').hasAttribute('disabled'), 'actions are disabled during the job');
    release.resolve();
    await waitFor(() => state(ctx).job === null, 'the job to end');
    equal(qa(ctx, '.card-cert').map((n) => n.textContent), ['Checking…', 'Checking…'], 'pending until the lazy proof arrives');
    const batch = client.batches[0];
    ctx.app.controller.cancel();
    equal(batch.batchIndex, 1, 'batch index');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: each partial reason shows its exact notice; layout and difficulty shortfalls offer a new piece set', async () => {
  const reasons = /** @type {const} */ ([
    ['time-limit', 'N-PARTIAL', false],
    ['layouts-not-found', 'N-FEWLAYOUTS', true],
    ['difficulty-not-found', 'N-SETLEVEL', true],
    ['uniqueness-not-proved', 'N-UNIQUE', false],
  ]);
  for (const [reason, code, offersSet] of reasons) {
    const client = scriptedClient({
      batch: (input, hooks) => {
        const puzzle = makePuzzle(3, 0);
        hooks.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: input.quantity });
        return { status: 'partial', reason, accepted: [puzzle], seenLayouts: [], seenClues: [] };
      },
    });
    const ctx = mountApp({ app: { client: /** @type {any} */ (client) } });
    try {
      await withSet(ctx);
      q(ctx, '[data-action="new-puzzles"]').click();
      await waitFor(() => state(ctx).notice !== null, 'the notice');
      const expected = formatNotice(code, { n: 1, q: 5, level: 'Normal' });
      equal(q(ctx, '[data-role="notice"] .notice').textContent, expected, `${code} text`);
      equal(ctx.root.querySelector('[data-action="new-set"]') !== null, offersSet, `${code} offers a new piece set`);
      equal(qa(ctx, '.puzzle-card').length, 1, 'the accepted prefix stays visible');
      if (offersSet) {
        const board = state(ctx).board;
        q(ctx, '[data-action="new-set"]').click();
        await waitFor(() => state(ctx).batchIndex === 0 && state(ctx).job === null, 'a new set');
        equal(state(ctx).board, board, 'the board is never changed by a new set');
      }
    } finally {
      ctx.destroy();
    }
  }
});

await check('scripted: a stale certificate for an older request never touches the cards', async () => {
  /** @type {any} */
  let hooks;
  const client = scriptedClient({
    batch: (input, h) => {
      hooks = { h, input };
      const puzzle = makePuzzle(4, 0);
      h.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: input.quantity });
      return { status: 'complete', accepted: [puzzle], seenLayouts: [], seenClues: [] };
    },
  });
  const ctx = mountApp({ app: { client: /** @type {any} */ (client) } });
  try {
    await withSet(ctx);
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 1 && state(ctx).job === null, 'the batch');
    hooks.h.onCertificate({ revision: 'older', puzzleId: 'h4', certificate: { status: 'unique', model: 'dlx-v1', rowLimit: 1, verified: true } });
    await sleep(20);
    equal(q(ctx, '.card-cert').textContent, 'Checking…', 'foreign revision ignored');
    hooks.h.onCertificate({ revision: hooks.input.revision, puzzleId: 'h4', certificate: { status: 'multiple', model: 'dlx-v1', rowLimit: 1, verified: true } });
    await waitFor(() => q(ctx, '.card-cert').textContent === 'Multiple solutions', 'the current certificate');
  } finally {
    ctx.destroy();
  }
});

await check('the set panel has no Show solution; the set navigator sits on top and steps between sets', async () => {
  const ctx = mountApp({ app: { client: /** @type {any} */ (scriptedClient({})) } });
  try {
    await withSet(ctx);
    equal(qa(ctx, '[data-role="pieces"] .piece-item').length, samplePack.pieces.length, 'one thumbnail per piece');
    assert(/^Normal \| 9 pieces \| Piece sizes \d–\d+ \| Seed \S+$/.test(q(ctx, '[data-role="summary"]').textContent ?? ''), q(ctx, '[data-role="summary"]').textContent ?? '');
    equal(q(ctx, '[data-role="summary"]').textContent?.endsWith(`Seed ${state(ctx).setSeed}`), true, 'the summary ends with the set seed');
    const rowsOf = () => {
      /** @type {Map<number, number>} */
      const rows = new Map();
      for (const item of qa(ctx, '[data-role="pieces"] .piece-item')) {
        const top = Math.round(item.getBoundingClientRect().top);
        rows.set(top, (rows.get(top) ?? 0) + 1);
      }
      return [...rows.values()];
    };
    const list = q(ctx, '[data-role="pieces"]');
    for (const width of [180, 300, 420, 700]) {
      list.style.width = `${width}px`;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const rows = rowsOf();
      assert(rows.reduce((a, b) => a + b, 0) === samplePack.pieces.length && Math.max(...rows) - Math.min(...rows) <= 1, `balanced rows at ${width}px: ${rows}`);
    }
    list.style.width = '';
    equal([balancedRows(10, 4), balancedRows(9, 5), balancedRows(12, 5), balancedRows(5, 9), balancedRows(0, 3)], [[4, 3, 3], [5, 4], [4, 4, 4], [5], []], 'row sizes');
    equal(['[data-field="show-solution"]', '[data-role="set-board"]', '[data-role="solution-note"]'].map((s) => ctx.root.querySelector(s)), [null, null, null], 'Show solution is gone');
    const row = q(ctx, '[data-role="set-history"]');
    assert(!row.hidden && q(ctx, '.set-nav').hidden, 'with a single set only Remove set shows, not the navigator');
    assert(!q(ctx, '[data-action="remove-set"]').hidden && q(ctx, '[data-action="remove-all-sets"]').hidden, 'Remove all sets needs two sets');
    await withSet(ctx);
    const nav = q(ctx, '[data-role="set-history"]');
    assert(!nav.hidden && nav.parentElement?.firstElementChild === nav, 'the navigator is the first thing in the set panel');
    equal(nav.nextElementSibling?.getAttribute('data-role'), 'summary', 'the summary sits right under it');
    const rowBox = nav.getBoundingClientRect();
    const navBox = q(ctx, '.set-nav').getBoundingClientRect();
    const actionsBox = q(ctx, '.set-actions').getBoundingClientRect();
    assert(Math.abs((navBox.left + navBox.right) / 2 - (rowBox.left + rowBox.right) / 2) < 2, 'the navigator is centered');
    assert(Math.abs(actionsBox.right - rowBox.right) < 2 && actionsBox.left > navBox.right, 'Remove and Remove all sit on the right');
    const removeStyle = getComputedStyle(q(ctx, '[data-action="remove-set"]'));
    assert(parseFloat(removeStyle.borderTopWidth) === 0 || removeStyle.borderTopStyle === 'none', 'the remove buttons are borderless');
    assert(parseFloat(removeStyle.fontSize) < parseFloat(getComputedStyle(q(ctx, '[data-action="older-set"]')).fontSize), 'and smaller than the arrows');
    assert(/Set 2 of 2/.test(q(ctx, '[data-role="set-position"]').textContent ?? ''), 'the newest set is the last one');
    assert(q(ctx, '[data-action="newer-set"]').hasAttribute('disabled'), 'nothing is newer than the newest set');
    assert(!q(ctx, '[data-action="older-set"]').hasAttribute('disabled'), 'an older set is reachable');
    q(ctx, '[data-action="older-set"]').click();
    equal(state(ctx).setPosition, 1, 'stepped back');
    assert(/Set 1 of 2/.test(q(ctx, '[data-role="set-position"]').textContent ?? ''), 'the older set is Set 1');
    assert(!q(ctx, '[data-action="newer-set"]').hasAttribute('disabled') && q(ctx, '[data-action="older-set"]').hasAttribute('disabled'), 'from Set 1 only ▶ (next) works');

    q(ctx, '[data-action="remove-set"]').click();
    equal([state(ctx).set !== null, savedCount(state(ctx))], [true, 0], 'Remove set leaves the other set');
    await withSet(ctx);
    const realConfirm = window.confirm;
    /** @type {string[]} */
    const asked = [];
    try {
      window.confirm = (message) => { asked.push(String(message)); return false; };
      q(ctx, '[data-action="remove-all-sets"]').click();
      equal(savedCount(state(ctx)), 1, 'cancelling the question keeps every set');
      window.confirm = (message) => { asked.push(String(message)); return true; };
      q(ctx, '[data-action="remove-all-sets"]').click();
    } finally {
      window.confirm = realConfirm;
    }
    equal(asked[0], 'Remove all 2 piece sets and their puzzles? This cannot be undone.', 'Remove all sets asks first');
    equal([state(ctx).set, savedCount(state(ctx)), state(ctx).puzzles.length], [null, 0, 0], 'every set is gone');
    assert(q(ctx, '[data-role="set-history"]').hidden && !q(ctx, '[data-role="set-empty"]').hidden, 'the empty text is back');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: generating a set that is already in the list shows that set instead of adding it', async () => {
  const ctx = mountApp({ app: { client: /** @type {any} */ (scriptedClient({})) } });
  try {
    await withSet(ctx);
    await withSet(ctx);
    assert(/Set 2 of 2/.test(q(ctx, '[data-role="set-position"]').textContent ?? ''), 'two different sets are listed');
    q(ctx, '[data-action="generate-set"]').click();
    await waitFor(() => state(ctx).notice?.code === 'N-DUPSET' && state(ctx).job === null, 'the duplicate notice');
    equal(savedCount(state(ctx)), 1, 'no third set was added');
    assert(/Set 1 of 2/.test(q(ctx, '[data-role="set-position"]').textContent ?? ''), 'the view moved to the repeated set');
    equal(q(ctx, '[data-role="notice"] .notice').textContent, formatNotice('N-DUPSET', { n: 1 }), 'the notice names it');
    assert(/^Normal \| 9 pieces/.test(q(ctx, '[data-role="summary"]').textContent ?? ''), 'its pieces are shown');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: every press adds exactly one puzzle; step 3 offers only Level and New Puzzle', async () => {
  const client = scriptedClient({
    batch: (input, hooks) => {
      const puzzle = makePuzzle(input.batchIndex + 2, input.displayOffset ?? 0);
      hooks.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: input.quantity });
      return { status: 'complete', accepted: [puzzle], seenLayouts: [], seenClues: [] };
    },
  });
  const ctx = mountApp({ quantity: 1, app: { client: /** @type {any} */ (client) } });
  try {
    for (const gone of ['[data-field="quantity"]', '[data-action="add-more"]', '[data-action="play-all"]', '[data-action="export-pack"]', '[data-action="copy-pack-link"]']) {
      equal(ctx.root.querySelector(gone), null, `${gone} is gone`);
    }
    assert(ctx.root.querySelector('[data-field="puzzle-level"]') !== null && ctx.root.querySelector('[data-action="new-puzzles"]') !== null, 'Level and New Puzzle remain');
    equal(q(ctx, '[data-action="new-puzzles"] > :not(.spinner):not([hidden])').textContent?.trim(), 'New Puzzle', 'the button is singular');
    await withSet(ctx);
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 1 && state(ctx).job === null, 'the first puzzle');
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 2 && state(ctx).job === null, 'the second puzzle');
    equal(client.batches.map((b) => b.quantity), [1, 1], 'each request asks for one puzzle');
    equal(client.batches.map((b) => b.displayOffset), [0, 1], 'the second one is appended');
    equal(qa(ctx, '.puzzle-card').map((card) => card.querySelectorAll('.card-body > p').length), [5, 5], 'each card shows number, level with score, seed, pieces to place and solutions');
    equal(qa(ctx, '.puzzle-card a').length, 0, 'no card has a link');
    equal(qa(ctx, '.puzzle-card button').map((b) => b.dataset.action), ['select', 'remove', 'select', 'remove'], 'a card only has its select and remove buttons');
    equal(qa(ctx, '.puzzle-card').map((card) => card.dataset.puzzleId), state(ctx).puzzles.map((p) => p.id).reverse(), 'the newest puzzle is on top');
    equal(qa(ctx, '.card-clues').map((n) => n.textContent),
      state(ctx).puzzles.map((p) => {
        const left = samplePack.pieces.length - p.clues.length;
        return `${left} ${left === 1 ? 'piece' : 'pieces'} to place`;
      }).reverse(), 'the pieces left to place');
    equal(qa(ctx, '.card-rating').map((n) => /^Normal: score \d+$/.test(n.textContent ?? '')), [true, true], 'the list keeps growing');
    const seeds = state(ctx).puzzles.map((p) => state(ctx).puzzleSeeds[p.id]);
    assert(seeds.every((s) => typeof s === 'string' && /^\d+$/.test(s)) && new Set(seeds).size === 2, `every press has its own random number: ${seeds}`);
    equal(client.batches.map((b) => b.batchSeed), seeds, 'the request carries the same seed the card shows');
    assert(!seeds.some((s) => /#\d+$/.test(s ?? '')), 'the seeds are not the predictable "set seed#number" sequence');
    equal(qa(ctx, '.card-body')[0].nextElementSibling?.classList.contains('card-thumb'), true, 'the preview is on the right of the information');
    equal(state(ctx).batchIndex, 2, 'every press is its own request');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: step 3 has no seed controls; every press draws its own whole-number seed', async () => {
  const client = scriptedClient({
    batch: (input, hooks) => {
      const puzzle = makePuzzle(input.batchIndex + 2, input.displayOffset ?? 0);
      hooks.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: input.quantity });
      return { status: 'complete', accepted: [puzzle], seenLayouts: [], seenClues: [] };
    },
  });
  let draws = 0;
  const ctx = mountApp({ quantity: 1, app: { client: /** @type {any} */ (client), randomNumber: () => String(5000 + (draws += 1)) } });
  try {
    await withSet(ctx);
    equal(['[data-field="puzzle-seed"]', '[data-action="roll-puzzle-seed"]', '[data-action="clear-puzzle-seed"]', '[data-action="new-random-puzzle"]']
      .map((s) => ctx.root.querySelector(s)), [null, null, null, null], 'no seed input, dice, clear or New Random Puzzle in step 3');
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 1 && state(ctx).job === null, 'the first puzzle');
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 2 && state(ctx).job === null, 'the second puzzle');
    equal(client.batches.map((b) => b.batchSeed), ['5001', '5002'], 'each press draws a fresh number');
    equal(qa(ctx, '.card-seed').map((n) => n.textContent), ['Seed: 5002', 'Seed: 5001'], 'each card shows its own seed on its own line, newest first');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: the Require unique solution switch sits in step 3 and decides the uniqueness of the next puzzle', async () => {
  const client = scriptedClient({
    batch: (input, hooks) => {
      const puzzle = makePuzzle(input.batchIndex + 2, input.displayOffset ?? 0);
      hooks.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: input.quantity });
      return { status: 'complete', accepted: [puzzle], seenLayouts: [], seenClues: [] };
    },
  });
  const ctx = mountApp({ quantity: 1, app: { client: /** @type {any} */ (client) } });
  try {
    await withSet(ctx);
    const unique = /** @type {HTMLInputElement} */ (q(ctx, '[data-field="require-unique"]'));
    assert(qa(ctx, '[data-field="require-unique"]').length === 1 && unique.closest('.puzzle-controls') !== null, 'one switch, with the step 3 controls');
    assert(!unique.checked, 'off by default');
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 1 && state(ctx).job === null, 'the first puzzle');
    unique.click();
    equal(state(ctx).uniqueness, 'require', 'stored');
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 2 && state(ctx).job === null, 'the second puzzle');
    equal(client.batches.map((b) => b.uniqueness), ['any', 'require'], 'each press uses the switch as it was');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: Remove deletes one puzzle and Remove all empties the list; new puzzles still work afterwards', async () => {
  const client = scriptedClient({
    batch: (input, hooks) => {
      const puzzle = makePuzzle(input.batchIndex + 2, input.displayOffset ?? 0);
      hooks.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: input.quantity });
      return { status: 'complete', accepted: [puzzle], seenLayouts: ['L-seen'], seenClues: ['C-seen'] };
    },
  });
  const ctx = mountApp({ quantity: 1, app: { client: /** @type {any} */ (client) } });
  try {
    await withSet(ctx);
    const removeAll = /** @type {HTMLButtonElement} */ (q(ctx, '[data-action="remove-all-puzzles"]'));
    assert(removeAll.disabled, 'Remove all is disabled without puzzles');
    for (let n = 1; n <= 3; n += 1) {
      q(ctx, '[data-action="new-puzzles"]').click();
      await waitFor(() => state(ctx).puzzles.length === n && state(ctx).job === null, `puzzle ${n}`);
    }
    assert(!removeAll.disabled, 'Remove all is enabled');
    const ids = state(ctx).puzzles.map((p) => p.id);
    const second = qa(ctx, '.puzzle-card')[1];
    /** @type {HTMLButtonElement} */ (second.querySelector('[data-action="remove"]')).click();
    equal(state(ctx).puzzles.map((p) => p.id), [ids[0], ids[2]], 'only the chosen puzzle is removed');
    equal(qa(ctx, '.card-heading').map((n) => n.textContent), ['Puzzle #2', 'Puzzle #1'], 'the rest are renumbered');
    removeAll.click();
    equal([state(ctx).puzzles.length, qa(ctx, '.puzzle-card').length, removeAll.disabled], [0, 0, true], 'Remove all empties the list');
    assert(state(ctx).seenLayouts.includes('L-seen') && state(ctx).seenClues.includes('C-seen'), 'the seen-history stays, so removed puzzles do not come back');
    equal(document.activeElement, q(ctx, '[data-action="new-puzzles"]'), 'the focus moves to New Puzzle');
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 1 && state(ctx).job === null, 'a new puzzle after Remove all');
    equal([qa(ctx, '.card-heading')[0].textContent, state(ctx).batchIndex], ['Puzzle #1', 4], 'the list starts again; the press counter goes on');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: choosing a card shows its puzzle in the main panel: the board with the placed pieces and the pieces still to place under it', async () => {
  const client = scriptedClient({
    batch: (input, hooks) => {
      const puzzle = makePuzzle(input.batchIndex + 2, input.displayOffset ?? 0);
      hooks.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: input.quantity });
      return { status: 'complete', accepted: [puzzle], seenLayouts: [], seenClues: [] };
    },
  });
  const opened = /** @type {Array<{ ids: string[], index: number }>} */ ([]);
  const ctx = mountApp({
    quantity: 1,
    app: { client: /** @type {any} */ (client), controller: { openPlayer: async (/** @type {any} */ pack, /** @type {number} */ index) => void opened.push({ ids: pack.puzzles.map((/** @type {any} */ p) => p.id), index }) } },
  });
  try {
    await withSet(ctx);
    for (let n = 1; n <= 2; n += 1) {
      q(ctx, '[data-action="new-puzzles"]').click();
      await waitFor(() => state(ctx).puzzles.length === n && state(ctx).job === null, `puzzle ${n}`);
    }
    const detail = q(ctx, '[data-role="puzzle-detail"]');
    assert(!detail.hidden, 'with nothing chosen the detail is shown');
    equal(q(ctx, '.detail-title').textContent, 'Puzzle #2', 'with nothing chosen the newest puzzle is shown');
    equal(qa(ctx, '.puzzle-card').map((card) => card.dataset.selected), ['true', 'false'], 'and its card is marked');
    const choose = (/** @type {number} */ at) => /** @type {HTMLButtonElement} */ (qa(ctx, '.puzzle-card')[at].querySelector('[data-action="select"]')).click();
    // Newest first: the card at 1 is Puzzle #1.
    choose(1);
    const first = state(ctx).puzzles[0];
    assert(!detail.hidden, 'the puzzle appears');
    equal(q(ctx, '.detail-title').textContent, 'Puzzle #1', 'its number');
    const play = q(ctx, '[data-action="play-puzzle"]');
    equal([play.textContent, play.parentElement === q(ctx, '.detail-title').parentElement], ['Play', true], 'Play sits on the same row as the title');
    play.click();
    await waitFor(() => opened.length === 1, 'the player to open');
    equal([opened[0].index, opened[0].ids[opened[0].index]], [0, first.id], 'it opens the player on the puzzle on show');
    assert(detail.querySelector('.detail-board svg') !== null, 'the board is drawn');
    equal(qa(ctx, '.detail-piece').length, samplePack.pieces.length - first.clues.length, 'the pieces left to place are listed');
    assert(qa(ctx, '.detail-piece').every((li) => !first.clues.some((pose) => pose.piece === li.dataset.pieceId)), 'a placed piece is not in the list');
    equal(qa(ctx, '.puzzle-card').map((card) => card.dataset.selected), ['false', 'true'], 'the chosen card is marked');
    equal(qa(ctx, '.card-select').map((b) => b.getAttribute('aria-pressed')), ['false', 'true'], 'and pressed');
    choose(0);
    const second = state(ctx).puzzles[1];
    equal(q(ctx, '.detail-title').textContent, 'Puzzle #2', 'another card, another puzzle');
    equal(qa(ctx, '.detail-piece').length, samplePack.pieces.length - second.clues.length, 'its pieces to place');
    /** @type {HTMLButtonElement} */ (qa(ctx, '.puzzle-card')[0].querySelector('[data-action="remove"]')).click();
    assert(!detail.hidden && q(ctx, '.detail-title').textContent === 'Puzzle #1', 'removing the shown puzzle shows the newest one left');
    /** @type {HTMLButtonElement} */ (qa(ctx, '.puzzle-card')[0].querySelector('[data-action="remove"]')).click();
    assert(detail.hidden, 'removing the last puzzle empties the main panel');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: editing the board shows the piece sets and puzzles of that board, or the empty texts', async () => {
  const client = scriptedClient({
    batch: (input, hooks) => {
      const puzzle = makePuzzle(input.batchIndex + 2, input.displayOffset ?? 0);
      hooks.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: input.quantity });
      return { status: 'complete', accepted: [puzzle], seenLayouts: [], seenClues: [] };
    },
  });
  const ctx = mountApp({ quantity: 1, app: { client: /** @type {any} */ (client) } });
  try {
    await withSet(ctx);
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 1 && state(ctx).job === null, 'a puzzle');
    const board = state(ctx).board;
    assert(qa(ctx, '.piece-item').length > 0 && qa(ctx, '.puzzle-card').length === 1, 'the set and its puzzle show');
    ctx.app.store.update((s) => withBoard(s, setCell(s.board, 0, 0, 0)));
    equal([qa(ctx, '.piece-item').length, qa(ctx, '.puzzle-card').length], [0, 0], 'a board without sets: no pieces and no puzzles');
    assert(!q(ctx, '[data-role="set-empty"]').hidden && q(ctx, '[data-role="empty"]').textContent !== '', 'the empty texts show');
    ctx.app.store.update((s) => withBoard(s, board));
    assert(qa(ctx, '.piece-item').length > 0 && qa(ctx, '.puzzle-card').length === 1, 'the board it was made for brings the set and the puzzle back');
  } finally {
    ctx.destroy();
  }
});

await check('no CSP violations were reported and the real pages parse', async () => {
  equal(violations, [], 'CSP violations');
  const parsed = validatePack(samplePack);
  assert(parsed.ok, 'sample pack still validates');
  assert(formatMessage('M-NEEDS-SET') === 'Generate a piece set first.', 'strings load');
});

const failed = results.filter((r) => !r.ok);
const list = /** @type {HTMLElement} */ (document.getElementById('results'));
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.ok ? '' : ` — ${r.error}`}`;
  li.className = r.ok ? 'pass' : 'fail';
  list.append(li);
}
const summary = /** @type {HTMLElement} */ (document.getElementById('summary'));
summary.textContent = failed.length === 0 ? `PASS ${results.length}/${results.length}` : `FAIL ${failed.length} of ${results.length}`;
document.documentElement.dataset.result = failed.length === 0 ? 'pass' : 'fail';
document.title = `${summary.textContent} - T18 generator flow harness`;
