// @ts-check
// Browser regression harness for T18 (generator jobs, puzzle cards, imports and exports). It drives the
// real generator panels with DOM events: three real-engine flows in module workers, then scripted
// clients for streaming, partial results, stale replies, imports and the Play fallbacks. It writes a
// pass/fail list into the page and sets data-result on <html>. It is a developer fixture, not deployed.

import { boardToRows } from '../../core/engine/board.js';
import { decodeShareCode } from '../../core/engine/sharecode.js';
import { parsePack, serializePack, validatePack } from '../../core/engine/pack.js';
import { createGeneratorApp } from '../../generator/app.js';
import { formatMessage, formatNotice } from '../../generator/strings.js';

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
 * @param {{ denySave?: boolean, denyLibrary?: boolean }} [o]
 */
function memoryStorage(o = {}) {
  /** @type {unknown} */
  let saved = null;
  const calls = { generatorSaves: 0, libraryPacks: /** @type {any[]} */ ([]) };
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
    saveLibraryPack: (/** @type {any} */ pack) => {
      if (o.denyLibrary) {
        return { ok: false, issues: [] };
      }
      calls.libraryPacks.push(pack);
      return { ok: true, packId: `0123456789abcdef` };
    },
    loadLibraryPack: () => (o.denyLibrary ? { ok: false, issues: [] } : { ok: true, value: calls.libraryPacks.at(-1), warnings: [] }),
  };
}

let seedCounter = 0;

/**
 * @param {{ app?: Record<string, any>, storage?: ReturnType<typeof memoryStorage> }} [o]
 */
function mountApp(o = {}) {
  const root = h('div', { class: 'harness-app' },
    h('main', { class: 'layout' },
      h('section', { class: 'panel panel-board' }, h('div', { 'data-slot': 'board' })),
      h('section', { class: 'panel panel-level' }, h('div', { 'data-slot': 'level' })),
      h('section', { class: 'panel panel-set' }, h('div', { 'data-slot': 'set' })),
      h('section', { class: 'panel panel-puzzles' }, h('div', { 'data-slot': 'puzzles' }))),
    h('div', { class: 'sticky-bar' }, h('p', { 'data-slot': 'sticky-status' }), h('button', { type: 'button', 'data-slot': 'sticky-action' }, 'Generate Piece Set')));
  sandbox.append(root);
  const storage = o.storage ?? memoryStorage();
  /** @type {string[]} */
  const toasts = [];
  const app = createGeneratorApp(document, {
    storage: /** @type {any} */ (storage),
    confirm: () => true,
    random: () => `HARN-${String((seedCounter += 1)).padStart(4, '0')}-SEED`,
    ...o.app,
    controller: { notify: (/** @type {string} */ message) => toasts.push(message), ...o.app?.controller },
  });
  return {
    root,
    app,
    storage,
    toasts,
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
  const radio = /** @type {HTMLInputElement} */ (q(ctx, `input[type="radio"][value="${levelId}"]`));
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
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
 * Runs Generate Piece Set then New Puzzles through the real controls.
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
  setField(ctx, '[data-field="quantity"]', String(recipe.quantity));
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

/**
 * Clicks Play on a card with the default action blocked, like a same-tab navigation that is observed.
 * @param {ReturnType<typeof mountApp>} ctx
 * @param {number} index
 * @param {MouseEventInit} [init]
 */
function clickPlay(ctx, index, init = {}) {
  const anchor = /** @type {HTMLAnchorElement} */ (qa(ctx, '.puzzle-card')[index].querySelector('a[data-action="play"]'));
  /** @type {{ prevented: boolean }} */
  const seen = { prevented: false };
  const observe = (/** @type {Event} */ event) => {
    seen.prevented = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener('click', observe, { once: true });
  anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
  return { anchor, seen };
}

for (const recipe of recipes) {
  await check(`real engine: ${recipe.name} → set → ${recipe.quantity} puzzles → Play`, async () => {
    const ctx = mountApp();
    try {
      await runFlow(ctx, recipe);
      const puzzles = state(ctx).puzzles;
      const anchors = qa(ctx, 'a[data-action="play"]');
      await waitFor(() => qa(ctx, 'a[data-action="play"]').every((a) => a.getAttribute('href') !== null), 'prepared Play links', 30000);
      const href = anchors[puzzles.length - 1].getAttribute('href') ?? '';
      assert(/\/player\/#pack=/.test(href) && href.endsWith(`&i=${puzzles.length - 1}`), `real player anchor: ${href.slice(0, 80)}`);
      const decoded = await decodeShareCode(/#pack=([^&]+)/.exec(href)?.[1] ?? '');
      assert(decoded.ok, 'the link decodes');
      if (decoded.ok) {
        equal(decoded.value.puzzles.length, puzzles.length, 'link carries every puzzle');
        equal(decoded.value.pieces.map((p) => p.id), state(ctx).set?.pieces.map((p) => p.id), 'link carries every piece');
        equal(decoded.value.puzzles.map((p) => p.clues), puzzles.map((p) => p.clues), 'link carries every clue');
      }
      const savesBefore = /** @type {any} */ (ctx.storage).calls.generatorSaves;
      const modified = clickPlay(ctx, 0, { ctrlKey: true });
      assert(!modified.seen.prevented, 'a modified click is left to the browser');
      equal(/** @type {any} */ (ctx.storage).calls.generatorSaves, savesBefore, 'a new-tab click does not touch the running page');
      const plain = clickPlay(ctx, 0);
      assert(!plain.seen.prevented, 'a normal click keeps its default navigation');
      assert(/** @type {any} */ (ctx.storage).calls.generatorSaves > savesBefore, 'the generator state is saved before navigating');
      equal(state(ctx).checking, [], 'Play ended every pending certificate check');
    } finally {
      ctx.destroy();
    }
  });
}

await check('real engine: certificates arrive lazily on the default flow and the pack carries them', async () => {
  /** @type {any[]} */
  const exportedPacks = [];
  const ctx = mountApp({ app: { controller: { download: (/** @type {any} */ pack) => exportedPacks.push(pack) } } });
  try {
    await runFlow(ctx, recipes[0]);
    assert(state(ctx).checking.length > 0 || state(ctx).puzzles.every((p) => p.certificate !== null), 'certificates start pending');
    await waitFor(() => state(ctx).checking.length === 0, 'certificates', 90000);
    const texts = qa(ctx, '.card-cert').map((n) => n.textContent);
    assert(texts.every((t) => ['Unique solution ✓', 'Several solutions', 'Uniqueness not proved'].includes(t ?? '')), `certificate texts: ${texts.join(' | ')}`);
    ctx.app.controller.exportPack();
    const pack = exportedPacks.at(-1);
    assert(pack !== undefined, 'the pack was exported');
    equal(pack.puzzles.map((/** @type {any} */ p) => p.certificate?.status ?? null), state(ctx).puzzles.map((p) => p.certificate?.status ?? null), 'the file carries the certificates that are known');
    assert(pack.puzzles.every((/** @type {any} */ p) => p.certificate !== null && p.certificate !== undefined), 'every certificate settled before export');
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
    setField(ctx, '[data-field="quantity"]', '10');
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).job !== null, 'the job to start');
    const cancel = q(ctx, '[data-action="cancel"]');
    assert(!q(ctx, '[data-role="progress"]').hidden, 'progress is visible during the job');
    cancel.click();
    await waitFor(() => state(ctx).job === null, 'the cancelled job to end', 20000);
    equal(state(ctx).set, set, 'the set is untouched');
    assert(state(ctx).batchIndex === 1, 'the cancelled request still counted');
    const notice = state(ctx).notice;
    assert(notice === null || notice.code === 'M-CANCELLED-BATCH', `cancel or finished first: ${notice?.code}`);
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).job !== null || state(ctx).batchIndex === 2, 'a second batch to start');
    await waitFor(() => state(ctx).job === null, 'the second batch', 120000);
    equal(state(ctx).batchIndex, 2, 'second request index');
    equal(state(ctx).puzzles.length, 10, 'a full batch after the cancelled one');
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
  const client = {
    batches,
    cancels: 0,
    async generateSet(/** @type {any} */ input, /** @type {any} */ hooks) {
      return script.set
        ? script.set(input, hooks)
        : {
          status: 'complete',
          set: { board: scriptedBoard, pieces: samplePack.pieces, witness, carving: 'flat', macroRegion: null },
          calibration: makePuzzle(0),
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

await check('scripted: cards stream in one by one, with Checking first, and progress shows count and Cancel', async () => {
  const release = { resolve: () => {} };
  const hold = new Promise((resolve) => {
    release.resolve = () => resolve(undefined);
  });
  const client = scriptedClient({
    batch: async (input, hooks) => {
      const accepted = [makePuzzle(1, 0), makePuzzle(2, 1)];
      for (const [index, puzzle] of accepted.entries()) {
        hooks.onProgress({ stage: 'candidate', slot: index + 1, accepted: index, quantity: input.quantity });
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
    assert(/Puzzle \d of 5/.test(q(ctx, '[data-role="stage"]').textContent ?? ''), 'stage text names the slot');
    assert(/2 of 5 accepted/.test(q(ctx, '.progress-count').textContent ?? ''), `accepted count: ${q(ctx, '.progress-count').textContent}`);
    assert(/^\d+:\d\d$/.test(q(ctx, '.progress-elapsed').textContent ?? ''), 'elapsed clock');
    equal(qa(ctx, '.puzzle-card .card-title').map((n) => n.textContent), ['Normal #1', 'Normal #2'], 'visible positions');
    assert(q(ctx, '[data-action="new-puzzles"]').hasAttribute('disabled'), 'actions are disabled during the job');
    release.resolve();
    await waitFor(() => state(ctx).job === null, 'the job to end');
    equal(qa(ctx, '.card-cert').map((n) => n.textContent), ['Checking…', 'Checking…'], 'pending until the lazy proof arrives');
    const batch = client.batches[0];
    q(ctx, '[data-field="quantity"]');
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
    await waitFor(() => q(ctx, '.card-cert').textContent === 'Several solutions', 'the current certificate');
    ctx.app.controller.prepareNavigation();
    equal(state(ctx).checking, [], 'a user action stops pending checks');
  } finally {
    ctx.destroy();
  }
});

await check('scripted: an oversized link falls back honestly; library denial leaves Download and Open player', async () => {
  const client = scriptedClient({
    batch: (input, hooks) => {
      const puzzle = makePuzzle(5, 0);
      hooks.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: input.quantity });
      return { status: 'complete', accepted: [puzzle], seenLayouts: [], seenClues: [] };
    },
  });
  /** @type {string[]} */
  const assigned = [];
  const longBase = `https://example.test/${'x'.repeat(17000)}/generator/`;
  const denied = memoryStorage({ denyLibrary: true });
  const ctx = mountApp({
    storage: memoryStorage(),
    app: { client: /** @type {any} */ (client), handoff: { base: longBase, storage: /** @type {any} */ (denied), location: { assign: (/** @type {string} */ url) => assigned.push(url) } } },
  });
  try {
    await withSet(ctx);
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 1 && state(ctx).job === null, 'the batch');
    await waitFor(() => state(ctx).links.pack !== null, 'prepared links');
    const anchor = /** @type {HTMLAnchorElement} */ (q(ctx, 'a[data-action="play"]'));
    equal(anchor.getAttribute('href'), null, 'no usable link is exposed');
    assert(anchor.getAttribute('aria-disabled') === 'true', 'the anchor says it is unavailable');
    assert(/too large for a link/.test(q(ctx, '.card-note').textContent ?? ''), 'the card explains the fallback');
    anchor.click();
    await waitFor(() => state(ctx).notice?.code === 'M-PLAYER-UNAVAILABLE', 'the honest hand-off notice');
    equal(assigned, [], 'no navigation was faked');
    assert(!q(ctx, '[data-action="export-puzzle"]').hasAttribute('disabled'), 'Export still works');
    assert(ctx.root.querySelector('[data-action="export-pack"]') !== null, 'pack export is offered');
  } finally {
    ctx.destroy();
  }
  const saving = memoryStorage();
  const ctx2 = mountApp({
    app: { client: /** @type {any} */ (client), handoff: { base: longBase, storage: /** @type {any} */ (saving) } },
  });
  try {
    await withSet(ctx2);
    q(ctx2, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx2).links.pack !== null, 'a library fallback link');
    const href = q(ctx2, 'a[data-action="play"]').getAttribute('href') ?? '';
    assert(/#lib=0123456789abcdef&i=0$/.test(href), `local-only link after a successful save: ${href.slice(-40)}`);
    assert(/only works in this browser/.test(q(ctx2, '.card-note').textContent ?? ''), 'a local-only link is labelled');
  } finally {
    ctx2.destroy();
  }
});

await check('scripted: imports keep current work on failure and restore seed, index, answers and claims on success', async () => {
  const client = scriptedClient({
    batch: (input, hooks) => {
      const accepted = [makePuzzle(6, 0), makePuzzle(7, 1)];
      accepted.forEach((puzzle, index) => hooks.onAccepted({ revision: input.revision, index, puzzle, accepted: index + 1, quantity: input.quantity }));
      return { status: 'complete', accepted, seenLayouts: [], seenClues: [] };
    },
  });
  const ctx = mountApp({ app: { client: /** @type {any} */ (client) } });
  try {
    await withSet(ctx);
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => state(ctx).puzzles.length === 2 && state(ctx).job === null, 'the batch');
    const before = state(ctx);
    const importDetails = /** @type {HTMLDetailsElement} */ (q(ctx, '[data-role="import"]'));
    importDetails.open = true;
    setField(ctx, '[data-field="import-text"]', '{"format":"pentomino-pack","version":1');
    q(ctx, '[data-action="import-text"]').click();
    await waitFor(() => state(ctx).notice?.code === 'M-IMPORT-FAILED', 'the import failure');
    equal(state(ctx).set, before.set, 'set untouched');
    equal(state(ctx).puzzles, before.puzzles, 'cards untouched');
    assert(q(ctx, '[data-role="notice"] .notice').textContent?.endsWith('Your current work was not changed.') === true, 'failure text');

    const source = { ...samplePack, generation: { ...samplePack.generation, setSeed: 'import-seed', batchIndex: 4 } };
    const withAnswers = serializePack(source);
    const file = new File([withAnswers], 'pack.pentomino.json', { type: 'application/json' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = /** @type {HTMLInputElement} */ (q(ctx, '[data-field="import-file"]'));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => state(ctx).setSeed === 'import-seed', 'the imported set');
    equal(state(ctx).batchIndex, 4, 'batch index restored');
    equal(state(ctx).calibration, null, 'no calibration is kept');
    equal(qa(ctx, '.puzzle-card').length, samplePack.puzzles.length, 'imported puzzles are shown');
    assert(qa(ctx, '.card-rating').every((n) => /\(claimed\)$/.test(n.textContent ?? '')), 'ratings stay claims');
    assert(qa(ctx, '.card-verify').every((n) => n.textContent === 'Solvable ✓'), 'stored answers verify without a search');
    assert(/Imported/.test(q(ctx, '[data-role="summary"]').textContent ?? ''), 'summary says imported');
    q(ctx, '[data-action="new-puzzles"]').click();
    await waitFor(() => client.batches.length === 2, 'the next request');
    equal(client.batches[1].batchIndex, 5, 'the next request continues after the file');
    await waitFor(() => state(ctx).job === null, 'the request to end');
    equal(ctx.app.store.getState().setHistory.length >= 1, true, 'the previous set moved into the history');
  } finally {
    ctx.destroy();
  }
});

await check('Show solution overlays only the witness; the set history steps between sets', async () => {
  const ctx = mountApp({ app: { client: /** @type {any} */ (scriptedClient({})) } });
  try {
    await withSet(ctx);
    equal(qa(ctx, '[data-role="pieces"] li').length, samplePack.pieces.length, 'one thumbnail per piece');
    assert(/9 pieces · sizes \d–\d+ · Ready for Normal ✓/.test(q(ctx, '[data-role="summary"]').textContent ?? ''), q(ctx, '[data-role="summary"]').textContent ?? '');
    assert(q(ctx, '[data-role="set-board"]').hidden, 'solution is hidden by default');
    const toggle = /** @type {HTMLInputElement} */ (q(ctx, '[data-field="show-solution"]'));
    toggle.click();
    assert(!q(ctx, '[data-role="set-board"]').hidden, 'solution shown');
    equal(q(ctx, '[data-role="set-board"]').querySelectorAll('.pm-piece').length, samplePack.pieces.length, 'every piece of the witness is drawn');
    await withSet(ctx);
    assert(!q(ctx, '[data-action="older-set"]').hasAttribute('disabled'), 'an older set is reachable');
    q(ctx, '[data-action="older-set"]').click();
    equal(state(ctx).setPosition, 1, 'stepped back');
    assert(/Set 2 of 2/.test(q(ctx, '[data-role="set-position"]').textContent ?? ''), 'position text');
  } finally {
    ctx.destroy();
  }
});

await check('no CSP violations were reported and the real pages parse', async () => {
  equal(violations, [], 'CSP violations');
  const parsed = validatePack(samplePack);
  assert(parsed.ok, 'sample pack still validates');
  assert(formatMessage('M-LINK-COPIED') === 'Link copied.', 'strings load');
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
