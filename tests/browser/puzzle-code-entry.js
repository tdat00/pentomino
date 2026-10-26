// @ts-check
// Browser regression harness of the Player's puzzle-code entry. It mounts the real Player with the real puzzle-code
// worker (module worker, no mock) and, where timing matters, a deferred client whose replies the test controls. It covers
// the entry points, accepted input forms, every failure message, the correction and damaged-tail offers, atomic failures,
// cancellation, saved progress, keyboard guards, EN/VI, the three themes and the 390 px layout (the real Player page in
// a narrow frame). Trusted key presses, Tab traversal and a coarse pointer are exercised separately over CDP. Writes a
// pass/fail list into the page, data-summary and data-result on <html>. Developer fixture, not deployed.

import { reduce } from '../../core/engine/game.js';
import { parsePack } from '../../core/engine/pack.js';
import { catalogueStats } from '../../core/engine/puzzlecode-v1.js';
import { encodeShareCode } from '../../core/engine/sharecode.js';
import { createPuzzleCodeClient } from '../../core/browser/puzzle-code-client.js';
import { createStorage } from '../../core/browser/storage.js';
import { PoolError, createPool } from '../../core/browser/worker-pool.js';
import { setLocale } from '../../player/i18n.js';
import { mountPlayer } from '../../player/app.js';

document.documentElement.dataset.result = 'running';

const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
const uncaught = /** @type {string[]} */ ([]);
const network = /** @type {string[]} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
window.addEventListener('error', (e) => uncaught.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => uncaught.push(String(e.reason)));

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  network.push(String(input instanceof Request ? input.url : input));
  return nativeFetch(input, init);
};

const NativeWorker = globalThis.Worker;
const workers = { spawned: 0, terminated: 0 };
class CountingWorker extends NativeWorker {
  /** @param {ConstructorParameters<typeof Worker>} args */
  constructor(...args) {
    super(...args);
    workers.spawned += 1;
  }

  terminate() {
    workers.terminated += 1;
    super.terminate();
  }
}
globalThis.Worker = /** @type {any} */ (CountingWorker);

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
  for (const stage of document.querySelectorAll('.stage-root, iframe.stage-frame')) {
    stage.remove();
  }
  document.documentElement.removeAttribute('data-theme');
  setLocale('en', document);
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
  assert(a === b || (typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b)), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/**
 * Identity, for elements (their JSON is always `{}`).
 * @param {unknown} a
 * @param {unknown} b
 * @param {string} msg
 */
function same(a, b, msg) {
  assert(a === b, `${msg}: not the same element (${a instanceof Element ? a.outerHTML.slice(0, 80) : String(a)})`);
}

const xss = () => /** @type {any} */ (window).__xss;

/**
 * @param {() => unknown} cond
 * @param {string} label
 * @param {number} [ms]
 */
async function waitFor(cond, label, ms = 10000) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (cond()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for ${label}`);
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** @template T */
function deferred() {
  /** @type {(value: T) => void} */
  let resolve = () => {};
  const promise = /** @type {Promise<T>} */ (new Promise((a) => {
    resolve = a;
  }));
  return { promise, resolve };
}

// ----------------------------------------------------------------------------------------------------- fixtures

const fixture = await (await fetch('../fixtures/puzzlecode-v1.json')).json();
const GOLDEN = fixture.goldens[0];
const CODE = /** @type {string} */ (GOLDEN.code);
const CORE = CODE.slice(0, CODE.indexOf('.'));
const TAIL = CODE.slice(CORE.length + 1);
const parsed = parsePack(await (await fetch('../../player/samples/sample-pack.json')).text());
if (!parsed.ok) {
  throw new Error('the sample pack does not parse');
}
const sample = parsed.value;
const puzzle0 = sample.puzzles[0];
const sampleLink = `#pack=${await encodeShareCode(sample)}&i=0`;
/** Raw core of version 3 with a valid check: a future version the checksum cannot catch. */
const VERSION3 = '3D0J492G47DMXNG6YCP10HCY05KZW8S4HCCWTT';
/** The codec's negative vector: a 1 in the padding of a raw core. */
const INVALID = '1D0J492G47DMXNG6YCP10HCY05KZW8S4HDRJT5';

/** @param {string} text @param {number} at */
const change = (text, at) => text.slice(0, at) + (text[at] === '0' ? '1' : '0') + text.slice(at + 1);
const ONE_TYPO = change(CODE, 5);
const TWO_TYPOS = change(ONE_TYPO, 9);
const DAMAGED_TAIL = change(CODE, CODE.length - 1);
const BAD_CORE_WITH_TAIL = change(CODE, 5).replace(/^(.{12})./, '$1Z');
const grouped = (/** @type {string} */ text) => text.toLowerCase().replace(/(.{4})/g, '$1 ').trim();

const EN = {
  empty: 'Type or paste a puzzle code.',
  check: 'The code has a typing error. Check it against the printout.',
  version: 'This puzzle code needs a newer Player version.',
  invalid: 'This code does not describe a valid puzzle.',
  tail: 'The optional solution part has a typing error.',
  index: 'A puzzle code opens one puzzle; remove "&i=…" from the link.',
  long: 'This code is too long.',
  dots: 'A puzzle code has at most one ".".',
  worker: 'This browser cannot open puzzle codes because module workers are unavailable. Use a current browser.',
  service: 'Puzzle code processing failed. Try again.',
  restored: 'Saved moves restored; Replay starts as printed.',
  candidate: (/** @type {number} */ group, /** @type {number} */ position, /** @type {string} */ expected, /** @type {string} */ typed) => `Possible correction: in group ${group}, character ${position} may be "${expected}" instead of "${typed}". Compare with the printout.`,
};

// --------------------------------------------------------------------------------------------------- the stage

/** @param {Record<string, string>} [seed] */
function memoryAdapter(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    get length() {
      return map.size;
    },
    key: (/** @type {number} */ i) => [...map.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => map.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => {
      map.set(k, String(v));
    },
    removeItem: (/** @type {string} */ k) => {
      map.delete(k);
    },
  };
}

/** Verification pool that records its tasks and never answers: play must not wait for it. */
function stubPool() {
  const pool = {
    kinds: /** @type {string[]} */ ([]),
    beginRequest() {},
    endRequest() {},
    close() {},
    run(/** @type {{ kind: string }} */ task) {
      pool.kinds.push(task.kind);
      return new Promise(() => {});
    },
  };
  return pool;
}

/**
 * A code client whose decode replies the test resolves by hand.
 */
function deferredClient() {
  const fake = {
    calls: /** @type {Array<{ text: string, resolve: (value: any) => void }>} */ ([]),
    cancels: 0,
    disposed: 0,
    client: /** @type {any} */ ({
      encode: async () => {
        throw new Error('not used');
      },
      repair: async () => {
        throw new Error('not used');
      },
      decode: (/** @type {string} */ text) => {
        const reply = deferred();
        fake.calls.push({ text, resolve: reply.resolve });
        return reply.promise;
      },
      cancel: () => {
        fake.cancels += 1;
      },
      dispose: () => {
        fake.disposed += 1;
      },
    }),
  };
  return fake;
}

/**
 * @param {{ hash?: string, adapter?: ReturnType<typeof memoryAdapter> | null, client?: () => any, width?: number, height?: number, hashChange?: boolean }} [o]
 *   `hashChange: true` lets the page follow `hashchange` events (the harness sends them; the address is the fake `location`).
 */
async function mount(o = {}) {
  const root = document.createElement('div');
  root.className = 'stage-root';
  root.style.position = 'fixed';
  root.style.left = '0';
  root.style.top = '0';
  root.style.width = o.width === undefined ? '100vw' : `${o.width}px`;
  root.style.height = o.height === undefined ? '100vh' : `${o.height}px`;
  root.style.zIndex = '5';
  root.style.overflow = 'auto';
  root.style.background = 'var(--gen-color-bg, #f3f1ea)';
  document.body.append(root);
  const adapter = o.adapter === undefined ? memoryAdapter() : o.adapter;
  const storage = createStorage(adapter, () => Date.now());
  const location = { hash: o.hash ?? '', pathname: '/player/', search: '' };
  const urls = /** @type {string[]} */ ([]);
  const pool = stubPool();
  const player = mountPlayer(root, {
    storage,
    location,
    history: {
      replaceState: (_s, _t, url) => {
        urls.push(url);
        location.hash = url.startsWith('#') ? url : '';
      },
    },
    baseUrl: new URL('../../player/', document.baseURI),
    createPool: () => /** @type {any} */ (pool),
    createPuzzleCodeClient: o.client,
    listenHashChange: o.hashChange === true,
    preferenceStorage: null,
  });
  await player.ready;
  await frame();
  /** @param {string} sel @returns {HTMLElement} */
  const q = (sel) => {
    const found = /** @type {HTMLElement | null} */ (root.querySelector(sel));
    if (!found) {
      throw new Error(`missing ${sel}`);
    }
    return found;
  };
  /** @param {string} sel @returns {HTMLElement[]} */
  const qa = (sel) => /** @type {HTMLElement[]} */ ([...root.querySelectorAll(sel)]);
  /** @param {string} sel */
  const visible = (sel) => {
    const node = root.querySelector(sel);
    return node !== null && !node.closest('[hidden]') && node.getClientRects().length > 0;
  };
  return { root, player, adapter, storage, location, urls, pool, q, qa, visible };
}

/** @typedef {Awaited<ReturnType<typeof mount>>} Stage */

/** @param {Stage} m */
const dialogOf = (m) => /** @type {HTMLDialogElement | null} */ (m.root.querySelector('dialog.pm-code'));
/** @param {Stage} m */
const fieldOf = (m) => /** @type {HTMLTextAreaElement} */ (m.q('dialog.pm-code textarea'));
/** @param {Stage} m */
const isOpen = (m) => dialogOf(m)?.open === true;

/** @param {Stage} m @param {string} text */
function typeIn(m, text) {
  const field = fieldOf(m);
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

/** What the entry shows about a failure: its message, the candidate text and the offers. @param {Stage} m */
function shown(m) {
  const box = m.root.querySelector('.pm-code-problem');
  if (box === null || /** @type {HTMLElement} */ (box).hidden) {
    return null;
  }
  const candidate = /** @type {HTMLElement} */ (box.querySelector('.pm-code-candidate'));
  return {
    error: box.querySelector('.pm-code-error')?.textContent ?? '',
    candidate: candidate.hidden ? null : candidate.textContent,
    useCorrection: m.visible('dialog.pm-code [data-action="use-correction"]'),
    openCore: m.visible('dialog.pm-code [data-action="open-core"]'),
    alert: box.getAttribute('role'),
  };
}

/** Waits until a submission is over: the dialog closed, or the busy line gone. @param {Stage} m */
const settled = (m) => waitFor(() => !isOpen(m) || !m.visible('dialog.pm-code .pm-code-busy'), 'the submission to end');

/** @param {Stage} m @param {string} text */
async function submitText(m, text) {
  typeIn(m, text);
  m.q('dialog.pm-code [data-action="code-open"]').click();
  await settled(m);
}

/** Opens the entry the way a bad `#p=` address does: through the dialog, since the page has no button for it. @param {Stage} m */
async function openFromStart(m) {
  m.player.codeDialog.open();
  await waitFor(() => isOpen(m), 'the entry to open');
}

/** Opens the entry with a game open. @param {Stage} m */
async function openFromHeader(m) {
  m.player.codeDialog.open();
  await waitFor(() => isOpen(m), 'the entry to open');
}

/** What Escape does to a native dialog: a cancelable cancel event, then close. @param {Stage} m */
function escape(m) {
  const dialog = /** @type {HTMLDialogElement} */ (dialogOf(m));
  if (typeof dialog.requestClose === 'function') {
    dialog.requestClose();
  } else if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) {
    dialog.close();
  }
}

/** @param {Stage} m */
const titleOf = (m) => m.q('.puzzle-title').textContent ?? '';

const canonical = (/** @type {{ cells: number[][] }} */ piece) => piece.cells.map((c) => c.join(',')).sort().join(';');

/**
 * The open puzzle is exactly the printed sample puzzle: board, ordered pieces (identity and shape), clues, rotation.
 * @param {Stage} m
 * @param {string} label
 */
function assertSamePuzzle(m, label) {
  const { pack, index, game, screen } = m.player.store.getState();
  assert(screen === 'game' && pack !== null && game !== null && index === 0, `${label}: a game is open`);
  assert(pack.puzzles.length === 1, `${label}: one puzzle`);
  equal(pack.board.rows, sample.board.rows, `${label}: board rows`);
  equal(pack.presentation?.rotation ?? 0, sample.presentation?.rotation ?? 0, `${label}: rotation`);
  equal(pack.pieces.map((p) => [p.id, p.label, p.color.toLowerCase(), canonical(p)]),
    sample.pieces.map((p) => [p.id, p.label, p.color.toLowerCase(), canonical(p)]), `${label}: ordered pieces`);
  equal(pack.puzzles[0].clues, puzzle0.clues, `${label}: clues`);
  equal(m.qa('.tray-piece').length, sample.pieces.length - puzzle0.clues.length, `${label}: tray`);
  equal(m.qa('.board-host .pm-clue').length, puzzle0.clues.length, `${label}: clue pieces on the board`);
  assert(titleOf(m).startsWith('Easy'), `${label}: title ${titleOf(m)}`);
}

/** Places the first free solution piece of the sample puzzle, as a move of the player. @param {Stage} m */
function placeOne(m) {
  const clued = new Set(puzzle0.clues.map((c) => c.piece));
  const pose = /** @type {NonNullable<typeof puzzle0.solution>} */ (puzzle0.solution).find((p) => !clued.has(p.piece));
  m.player.store.update((s) => ({ game: reduce(/** @type {any} */ (s.game), { type: 'place', pose: /** @type {any} */ (pose) }) }));
  m.player.controller.saveNow();
}

/** @param {Stage} m */
const snapshotOf = (m) => {
  const { pack, game, index } = m.player.store.getState();
  return { pack, index, placed: JSON.stringify([...(game?.placed.entries() ?? [])]), moves: game?.moves ?? -1 };
};

// ---------------------------------------------------------------------------------------------------- the checks

await check('nothing is built before the code is needed: no field, no worker and no catalogue on the page', async () => {
  const before = workers.spawned;
  const m = await mount();
  equal(m.root.querySelectorAll('textarea').length, 0, 'no code field until the entry is opened');
  equal(workers.spawned, before, 'no worker at mount');
  assert(catalogueStats.sizesBuilt === 0, 'the page never builds the catalogue');
  m.player.destroy();
});

await check('the entry has no button on the start screen or in the header; it opens a labelled, monospace field with focus in it', async () => {
  const m = await mount();
  assert(m.root.querySelector('[data-action="enter-code"]') === null, 'no "Enter puzzle code" button on the start screen or in the header');
  assert(m.visible('.start-actions [data-action="sample"]') && m.q('.start-actions a').getAttribute('href') === '../generator/', 'sample and Generator remain');
  await openFromStart(m);
  const dialog = /** @type {HTMLDialogElement} */ (dialogOf(m));
  const field = fieldOf(m);
  same(document.activeElement, field, 'focus goes to the field');
  const label = /** @type {HTMLLabelElement} */ (m.q('dialog.pm-code label'));
  equal([label.textContent, label.htmlFor], ['Puzzle code', field.id], 'a visible label is associated with the field');
  same(label.control, field, 'the label controls the field');
  equal([field.spellcheck, field.getAttribute('autocapitalize'), field.getAttribute('autocorrect'), field.getAttribute('autocomplete')], [false, 'off', 'off', 'off'], 'no spell-check, capitalization or correction');
  assert(/monospace|mono|consolas|menlo/i.test(getComputedStyle(field).fontFamily), `monospace ${getComputedStyle(field).fontFamily}`);
  equal(dialog.getAttribute('aria-labelledby') !== null && document.getElementById(/** @type {string} */ (dialog.getAttribute('aria-labelledby')))?.textContent, 'Enter puzzle code', 'the dialog is named');
  assert(/** @type {HTMLButtonElement} */ (m.q('dialog.pm-code [data-action="code-open"]')).disabled, 'Open puzzle waits for text');
  equal(m.q('dialog.pm-code [data-action="code-open"]').textContent, 'Open puzzle', 'Open puzzle');
  equal(m.q('dialog.pm-code [data-action="code-cancel"]').textContent, 'Cancel', 'Cancel is always there');
  equal(m.q('dialog.pm-code .pm-code-count').textContent, '0 characters', 'count');
  assert(shown(m) === null && !field.hasAttribute('aria-invalid'), 'no error before there is something to check');
  assert(field.getAttribute('aria-describedby')?.split(' ').every((id) => document.getElementById(id) !== null), 'described by existing notes');
  escape(m);
  await waitFor(() => !isOpen(m), 'Escape to close');
  equal(m.player.store.getState().screen, 'start', 'nothing opened');
  m.player.destroy();
});

await check('with a game open the entry still opens through the dialog; Cancel returns the focus to the puzzle title', async () => {
  const m = await mount({ hash: sampleLink });
  equal(m.root.dataset.screen, 'game', 'a game is open');
  assert(m.root.querySelector('[data-action="enter-code"]') === null, 'no button for it in the header');
  const before = snapshotOf(m);
  await openFromHeader(m);
  same(document.activeElement, fieldOf(m), 'focus in the field');
  m.q('dialog.pm-code [data-action="code-cancel"]').click();
  await waitFor(() => !isOpen(m), 'closed');
  await waitFor(() => document.activeElement === m.q('.puzzle-title'), 'focus back on the puzzle title');
  equal(snapshotOf(m), before, 'the game is untouched');
  m.player.destroy();
});

await check('core, full code, grouped text and lower case open the first sample puzzle exactly; the address becomes #p=<normalized>', async () => {
  const variants = /** @type {const} */ ([
    ['core', CORE, CORE, false],
    ['full code', CODE, CODE, true],
    ['grouped lower case', grouped(CODE), CODE, true],
    ['hyphenated with line breaks', `${CORE.slice(0, 19)}-\n${CORE.slice(19)}`.toLowerCase(), CORE, false],
    ['O, I and L as 0 and 1', CORE.replaceAll('0', 'O').replaceAll('1', 'L'), CORE, false],
  ]);
  for (const [name, text, normalized, hasTail] of variants) {
    const m = await mount();
    await openFromStart(m);
    typeIn(m, text);
    m.q('dialog.pm-code [data-action="code-open"]').click();
    await waitFor(() => m.q('dialog.pm-code .pm-code-busy') !== null && m.visible('dialog.pm-code .pm-code-busy') && /** @type {HTMLButtonElement} */ (m.q('dialog.pm-code [data-action="code-open"]')).disabled, `${name}: busy`);
    await waitFor(() => !isOpen(m), `${name}: the dialog closes on success`);
    assertSamePuzzle(m, name);
    equal(m.urls, [`#p=${normalized}`], `${name}: address`);
    equal(m.player.store.getState().error, null, `${name}: no error`);
    assert(!m.visible('.status-notice'), `${name}: nothing was restored, so nothing is said`);
    if (hasTail) {
      equal(m.q('[data-badge="verification"]').textContent, 'Solvable ✓', `${name}: the stored answer is known at once`);
      equal(m.pool.kinds, [], `${name}: no search was started`);
    } else {
      equal(m.pool.kinds, ['verifyPack'], `${name}: a core is verified in the background`);
      equal(m.q('[data-badge="verification"]').textContent, 'Checking solvability…', `${name}: still pending, and the puzzle is already playable`);
      assert(m.qa('.tray-piece').length > 0, `${name}: pieces can be played now`);
    }
    await waitFor(() => document.activeElement === m.q('.puzzle-title'), `${name}: focus lands on the puzzle heading`);
    m.player.destroy();
  }
});

await check('a pasted link opens without fetching it; &i=1, a repeated key and mixed p/pack, p/lib links are refused', async () => {
  const m = await mount({ hash: sampleLink });
  const before = snapshotOf(m);
  const fetched = network.length;
  await openFromHeader(m);
  /** @type {Array<[string, string]>} */
  const refused = [
    [`https://example.test/pentomino/player/#p=${CODE}&i=1`, EN.index],
    [`https://example.test/pentomino/player/#p=${CODE}&p=${CORE}`, EN.invalid],
    [`https://example.test/pentomino/player/#p=${CODE}&pack=1j.eyBub3Bl`, EN.invalid],
    [`#p=${CODE}&lib=0123456789abcdef`, EN.invalid],
    ['https://example.test/pentomino/player/#p=', EN.invalid],
  ];
  for (const [text, message] of refused) {
    await submitText(m, text);
    assert(isOpen(m), `${text}: the entry stays open`);
    equal(shown(m)?.error, message, text);
    equal(fieldOf(m).value, text, `${text}: the text is kept`);
    equal(snapshotOf(m), before, `${text}: the game is untouched`);
  }
  equal(m.urls, [], 'no address change');
  await submitText(m, `https://example.test/pentomino/player/#p=${CODE}&i=0`);
  await waitFor(() => !isOpen(m), 'a valid link opens');
  assertSamePuzzle(m, 'pasted link');
  equal(m.urls, [`#p=${CODE}`], 'the address is the bare code');
  equal(network.length, fetched, 'the pasted link was not fetched');
  equal(performance.getEntriesByType('resource').filter((e) => e.name.includes('example.test')).length, 0, 'nor requested by any other means');
  m.player.destroy();
});

await check('every failure message, with the text kept, the field marked invalid and the game and address untouched', async () => {
  const m = await mount({ hash: sampleLink });
  placeOne(m);
  const before = snapshotOf(m);
  const head = titleOf(m);
  await openFromHeader(m);
  /** @type {Array<[string, string, string, boolean]>} */
  const cases = [
    ['bad character', '1D0J 492g!47D', 'The code contains "!", which puzzle codes never use.', true],
    ['non-breaking space', `${CORE.slice(0, 8)}\u00a0${CORE.slice(8)}`, 'The code contains "U+00A0", which puzzle codes never use.', true],
    ['markup', '<img src=x onerror="window.__xss=1">', 'The code contains "<", which puzzle codes never use.', true],
    ['two dots', 'AB.CD.EF', EN.dots, true],
    ['too long', 'A'.repeat(33000), EN.long, true],
    ['bad checksum, no candidate', TWO_TYPOS, EN.check, true],
    ['bad core with a tail', BAD_CORE_WITH_TAIL, EN.check, true],
    ['unknown version', VERSION3, EN.version, true],
    ['invalid structure', INVALID, EN.invalid, true],
    ['a short code', CORE.slice(0, 4), EN.check, true],
  ];
  for (const [name, text, message, invalidField] of cases) {
    await submitText(m, text);
    assert(isOpen(m), `${name}: the entry stays open`);
    const state = shown(m);
    equal(state?.error, message, name);
    equal(state?.alert, 'alert', `${name}: announced as an alert`);
    assert(state?.candidate === null && state.openCore === false, `${name}: no offer`);
    equal(fieldOf(m).value, text, `${name}: the text is kept exactly`);
    equal(fieldOf(m).getAttribute('aria-invalid'), invalidField ? 'true' : null, `${name}: aria-invalid`);
    assert(fieldOf(m).getAttribute('aria-describedby')?.includes('-problem'), `${name}: the message describes the field`);
    equal(snapshotOf(m), before, `${name}: pack, moves and placed pieces are untouched`);
    equal(titleOf(m), head, `${name}: same puzzle`);
    assert(/** @type {HTMLButtonElement} */ (m.q('dialog.pm-code [data-action="code-open"]')).disabled === false, `${name}: Open stays available`);
  }
  equal(fieldOf(m).value, CORE.slice(0, 4), 'the last text is still there');
  assert(xss() === undefined && m.root.querySelectorAll('img:not(.app-logo)').length === 0, 'the code is text, never markup');
  await submitText(m, 'A'.repeat(33000));
  equal(fieldOf(m).value.length, 33000, 'a long input is not truncated into a different code');
  equal(m.urls, [], 'no address change');
  equal(m.player.store.getState().error, null, 'the page error stays empty');
  assert(!m.visible('.status-error'), 'and no page-level error box appears');
  const empty = fieldOf(m);
  typeIn(m, ' \n\t - ');
  assert(/** @type {HTMLButtonElement} */ (m.q('dialog.pm-code [data-action="code-open"]')).disabled && shown(m) === null, 'blank input: Open is disabled and nothing is shown');
  const spawned = workers.spawned;
  m.q('dialog.pm-code [data-action="code-open"]').click();
  equal(workers.spawned, spawned, 'blank input starts no worker request');
  equal(empty.value, ' \n\t - ', 'blank text is not rewritten');
  m.player.destroy();
});

await check('a one-symbol typo shows a candidate and changes nothing; Use this correction opens the corrected code after decoding it again', async () => {
  const m = await mount();
  await openFromStart(m);
  await submitText(m, ONE_TYPO);
  equal(shown(m)?.error, EN.check, 'the typing error');
  equal(shown(m)?.candidate, EN.candidate(2, 2, CODE[5], ONE_TYPO[5]), 'the candidate names group, position, expected and typed symbols');
  assert(shown(m)?.useCorrection === true && shown(m)?.openCore === false, 'one explicit action');
  equal(m.q('dialog.pm-code [data-action="use-correction"]').textContent, 'Use this correction', 'its label');
  equal(fieldOf(m).value, ONE_TYPO, 'the field is not changed by the candidate');
  equal(m.player.store.getState().screen, 'start', 'nothing opened by itself');
  equal(m.urls, [], 'no address change yet');
  m.q('dialog.pm-code [data-action="use-correction"]').click();
  equal(fieldOf(m).value, CODE, 'only the confirmation replaces the text with the corrected code');
  await waitFor(() => !isOpen(m), 'the corrected code opens');
  assertSamePuzzle(m, 'corrected');
  equal(m.urls, [`#p=${CODE}`], 'the corrected code is the address');
  m.player.destroy();

  const grouped2 = await mount();
  await openFromStart(grouped2);
  await submitText(grouped2, grouped(ONE_TYPO));
  assert(shown(grouped2)?.useCorrection === true, 'a grouped lower-case typo is matched through the normalized text');
  grouped2.q('dialog.pm-code [data-action="use-correction"]').click();
  await waitFor(() => !isOpen(grouped2), 'opens');
  assertSamePuzzle(grouped2, 'grouped corrected');
  grouped2.player.destroy();

  const edited = await mount();
  await openFromStart(edited);
  await submitText(edited, ONE_TYPO);
  const offer = edited.q('dialog.pm-code [data-action="use-correction"]');
  typeIn(edited, `${ONE_TYPO}0`);
  assert(!edited.visible('dialog.pm-code [data-action="use-correction"]') && shown(edited) === null, 'editing withdraws the offer and the message');
  offer.click();
  equal(fieldOf(edited).value, `${ONE_TYPO}0`, 'a click on the old offer substitutes nothing');
  equal(edited.player.store.getState().screen, 'start', 'and opens nothing');
  edited.player.destroy();
});

await check('a damaged tail is not discarded silently: the core is offered, and opening it carries only the core', async () => {
  const m = await mount();
  await openFromStart(m);
  await submitText(m, DAMAGED_TAIL);
  equal(shown(m)?.error, EN.tail, 'the tail message');
  assert(shown(m)?.openCore === true, 'Open without the solution part is offered');
  equal(m.q('dialog.pm-code [data-action="open-core"]').textContent, 'Open without the solution part', 'its label');
  equal(shown(m)?.candidate, EN.candidate(2, 2, 'E', DAMAGED_TAIL[DAMAGED_TAIL.length - 1]), 'the tail correction is offered too');
  equal(fieldOf(m).value, DAMAGED_TAIL, 'the full input stays');
  equal([m.player.store.getState().screen, m.urls], ['start', []], 'nothing opened before the choice');
  m.q('dialog.pm-code [data-action="open-core"]').click();
  await waitFor(() => !isOpen(m), 'the core opens');
  assertSamePuzzle(m, 'core only');
  equal(m.urls, [`#p=${CORE}`], 'the address carries the core, not the damaged tail');
  equal(m.pool.kinds, ['verifyPack'], 'a core has no stored answer, so it is verified in the background');
  assert((m.player.store.getState().pack?.puzzles[0].solution ?? null) === null, 'no answer was kept');
  m.player.destroy();

  const fixed = await mount();
  await openFromStart(fixed);
  await submitText(fixed, DAMAGED_TAIL);
  fixed.q('dialog.pm-code [data-action="use-correction"]').click();
  await waitFor(() => !isOpen(fixed), 'the corrected full code opens');
  equal([fixed.urls, fixed.q('[data-badge="verification"]').textContent], [[`#p=${CODE}`], 'Solvable ✓'], 'the corrected tail is used, with its answer');
  fixed.player.destroy();

  const bad = await mount();
  await openFromStart(bad);
  await submitText(bad, BAD_CORE_WITH_TAIL);
  assert(shown(bad)?.openCore === false, 'a damaged core offers no recovery');
  bad.player.destroy();
});

await check('a bad #p= address at start-up, or later, opens the entry with the attempted text and the reason; nothing else changes', async () => {
  const m = await mount({ hash: `#p=${ONE_TYPO}` });
  assert(isOpen(m), 'the entry opens by itself');
  equal(fieldOf(m).value, `#p=${ONE_TYPO}`, 'the address as received is the text');
  equal(shown(m)?.candidate, EN.candidate(2, 2, CODE[5], ONE_TYPO[5]), 'with its candidate');
  same(document.activeElement, fieldOf(m), 'focus is in the field');
  assert(!m.visible('.start-error') && m.player.store.getState().error === null, 'no generic error is shown behind it');
  equal(m.urls, [], 'the address is not rewritten');
  m.q('dialog.pm-code [data-action="use-correction"]').click();
  await waitFor(() => !isOpen(m), 'the corrected code opens');
  assertSamePuzzle(m, 'startup correction');
  equal(m.urls, [`#p=${CODE}`], 'the address is committed only now');
  m.player.destroy();

  const index = await mount({ hash: `#p=${CODE}&i=1` });
  equal([isOpen(index), shown(index)?.error], [true, EN.index], 'a puzzle number is refused with its own message');
  escape(index);
  await waitFor(() => !isOpen(index), 'closed');
  index.player.destroy();

  const tail = await mount({ hash: `#p=${DAMAGED_TAIL}` });
  assert(shown(tail)?.openCore === true, 'a damaged tail at start-up offers the core');
  tail.q('dialog.pm-code [data-action="open-core"]').click();
  await waitFor(() => !isOpen(tail), 'opens');
  equal(tail.urls, [`#p=${CORE}`], 'core address');
  tail.player.destroy();

  const open = await mount({ hash: sampleLink });
  const before = snapshotOf(open);
  await open.player.controller.openHash(`#p=${CODE}&lib=0123456789abcdef`);
  assert(isOpen(open), 'a later bad address opens the entry over the game');
  equal([shown(open)?.error, fieldOf(open).value], [EN.invalid, `#p=${CODE}&lib=0123456789abcdef`], 'with the reason and the text');
  equal(snapshotOf(open), before, 'the game is untouched');
  open.player.destroy();
});

await check('saved moves return with the code: an honest notice, live announcement, and Replay restores the printed clues', async () => {
  const adapter = memoryAdapter();
  const first = await mount({ adapter, hash: sampleLink });
  placeOne(first);
  equal(first.qa('.tray-piece').length, sample.pieces.length - puzzle0.clues.length - 1, 'a piece was placed');
  first.player.destroy();

  const m = await mount({ adapter });
  await openFromStart(m);
  await submitText(m, CORE);
  await waitFor(() => !isOpen(m), 'opens');
  equal(m.qa('.tray-piece').length, sample.pieces.length - puzzle0.clues.length - 1, 'the saved move was restored, not erased');
  assert(m.visible('.status-notice'), 'the notice is visible');
  equal(m.q('.status-notice .status-text').textContent, EN.restored, 'it says what happened');
  await waitFor(() => m.q('[data-host="live"]').textContent === EN.restored, 'the live region announces it');
  equal(m.q('.status-notice').getAttribute('role'), 'status', 'a polite status region');
  m.player.controller.replay();
  equal(m.qa('.tray-piece').length, sample.pieces.length - puzzle0.clues.length, 'Replay starts as printed');
  assert(!m.visible('.status-notice'), 'and the notice is gone');
  m.player.destroy();

  const again = await mount({ adapter: memoryAdapter(), hash: sampleLink });
  placeOne(again);
  const before = snapshotOf(again);
  await openFromHeader(again);
  await submitText(again, TWO_TYPOS);
  equal(snapshotOf(again), before, 'a failed code leaves the saved moves alone');
  assert(!again.visible('.status-notice'), 'and says nothing about restoring');
  await submitText(again, CORE);
  await waitFor(() => !isOpen(again), 'the same puzzle by its code');
  equal(again.q('.status-notice .status-text').textContent, EN.restored, 'reopening a puzzle with moves says so');
  again.player.destroy();
});

await check('saved moves return with a code read from the address too (a reload, a scan, a hash change): said once, nothing to restore says nothing', async () => {
  const adapter = memoryAdapter();
  const first = await mount({ adapter, hash: sampleLink });
  placeOne(first);
  const fingerprint = first.player.store.getState().fingerprints[0];
  const saved = first.storage.loadProgress(fingerprint);
  assert(saved !== null, 'the move was saved');
  first.player.destroy();
  const moved = sample.pieces.length - puzzle0.clues.length - 1;
  const noticeShown = (/** @type {Stage} */ m) => m.visible('.status-notice');
  const noticeText = (/** @type {Stage} */ m) => m.q('.status-notice .status-text').textContent;

  for (const hash of [`#p=${CORE}`, `#p=${CODE}`, `#p=${CODE.toLowerCase().replace(/(.{4})/g, '$1-')}`]) {
    const m = await mount({ adapter, hash });
    equal(m.player.store.getState().pack?.puzzles[0].clues, puzzle0.clues, `${hash}: the printed puzzle`);
    assert(noticeShown(m), `${hash}: the notice is visible after the address was read`);
    equal(noticeText(m), EN.restored, `${hash}: it says what happened`);
    equal(m.q('.status-notice').getAttribute('role'), 'status', `${hash}: a polite status region`);
    await waitFor(() => m.q('[data-host="live"]').textContent === EN.restored, `${hash}: the live region announces it`);
    equal(m.urls, [], `${hash}: the address was not rewritten`);
    m.player.destroy();
  }

  const replayed = await mount({ adapter, hash: `#p=${CORE}` });
  assert(noticeShown(replayed), 'a reload says so again');
  replayed.player.controller.replay();
  equal(replayed.qa('.tray-piece').length, moved + 1, 'Replay starts as printed');
  assert(!noticeShown(replayed), 'and clears the notice');
  replayed.player.destroy();
  const resaved = await mount({ adapter, hash: sampleLink });
  placeOne(resaved);
  resaved.player.destroy();

  const dismissed = await mount({ adapter, hash: `#p=${CORE}` });
  dismissed.q('.status-notice [data-action="dismiss-notice"]').click();
  assert(!noticeShown(dismissed), 'it can be dismissed');
  equal(dismissed.qa('.tray-piece').length, moved, 'without touching the moves');
  dismissed.player.destroy();

  const fresh = await mount({ hash: `#p=${CORE}` });
  assertSamePuzzle(fresh, 'fresh');
  assert(!noticeShown(fresh), 'a puzzle with nothing saved says nothing');
  fresh.player.destroy();

  const link = await mount({ adapter, hash: sampleLink });
  equal(link.qa('.tray-piece').length, moved, 'a #pack= link restores the same moves');
  assert(!noticeShown(link), 'but it is not a puzzle code, and says nothing');
  link.player.destroy();

  const bad = await mount({ adapter, hash: `#p=${ONE_TYPO}` });
  assert(isOpen(bad) && bad.player.store.getState().screen === 'start', 'a bad address opens the entry, not a game');
  assert(!noticeShown(bad), 'and says nothing about restoring');
  bad.player.destroy();

  const changing = await mount({ adapter, hash: '', hashChange: true });
  const navigate = async (/** @type {string} */ hash, /** @type {() => boolean} */ done, /** @type {string} */ what) => {
    changing.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(done, what);
  };
  await navigate(`#p=${CORE}`, () => changing.player.store.getState().screen === 'game', 'the code in the address to open');
  await waitFor(() => noticeShown(changing), 'the notice after a hash change');
  equal(noticeText(changing), EN.restored, 'a hash change to a code says so');
  await waitFor(() => changing.q('[data-host="live"]').textContent === EN.restored, 'and announces it');
  await navigate(sampleLink, () => !noticeShown(changing), 'a pack link to replace the notice');
  equal(changing.qa('.tray-piece').length, moved, 'the same moves, now from a pack link');
  await navigate(`#p=${ONE_TYPO}`, () => isOpen(changing), 'a bad code in the address to be explained');
  assert(!noticeShown(changing), 'a bad code says nothing about restoring');
  changing.player.destroy();

  const damaged = memoryAdapter();
  createStorage(damaged, () => Date.now()).saveProgress(fingerprint, {
    ...saved, placements: [...saved.placements, { piece: 'ZZ', x: 0, y: 0, turn: 0, mirrored: false }],
  });
  const warned = await mount({ adapter: damaged, hash: `#p=${CORE}` });
  const warning = warned.player.store.getState().notice;
  assert(warning?.kind === 'warning' && /no longer fit/.test(warning.text) && warning.text.endsWith(` ${EN.restored}`), `a discarded move keeps its warning and the restoration follows it: ${warning?.text}`);
  warned.player.destroy();
});

await check('Cancel and edits invalidate a request in flight: a late reply can neither open a puzzle nor replace newer input', async () => {
  const real = createPuzzleCodeClient();
  const decoded = await real.decode(CORE);
  real.dispose();
  assert(decoded.ok, 'a decoded core to reply with');
  const reply = { ok: true, value: decoded.value, warnings: [] };

  const fake = deferredClient();
  const m = await mount({ client: () => fake.client });
  await openFromStart(m);
  typeIn(m, CORE);
  m.q('dialog.pm-code [data-action="code-open"]').click();
  equal(fake.calls.length, 1, 'one request');
  assert(m.visible('dialog.pm-code .pm-code-busy') && /** @type {HTMLButtonElement} */ (m.q('dialog.pm-code [data-action="code-open"]')).disabled, 'busy: Open is disabled');
  equal(m.q('dialog.pm-code .pm-code-busy').getAttribute('role'), 'status', 'in a polite status region');
  assert(!/** @type {HTMLButtonElement} */ (m.q('dialog.pm-code [data-action="code-cancel"]')).disabled, 'Cancel stays available');
  assert(dialogOf(m)?.contains(document.activeElement) === true, 'focus stays inside the dialog');
  m.q('dialog.pm-code [data-action="code-cancel"]').click();
  await waitFor(() => !isOpen(m), 'closed');
  assert(fake.cancels >= 1, 'the controller and client were told to cancel');
  fake.calls[0].resolve(reply);
  await flush();
  await flush();
  equal([m.player.store.getState().screen, m.player.store.getState().pack, m.urls, m.player.store.getState().loading], ['start', null, [], false], 'the late reply opened nothing');

  await openFromStart(m);
  equal(fieldOf(m).value, CORE, 'the closed entry kept the text');
  m.q('dialog.pm-code [data-action="code-open"]').click();
  typeIn(m, `${CORE}0`);
  assert(fake.cancels >= 2 && !m.visible('dialog.pm-code .pm-code-busy'), 'editing cancels the request and ends the busy state');
  assert(!/** @type {HTMLButtonElement} */ (m.q('dialog.pm-code [data-action="code-open"]')).disabled, 'Open is available again');
  fake.calls[1].resolve(reply);
  await flush();
  await flush();
  equal([isOpen(m), fieldOf(m).value, m.player.store.getState().screen, shown(m)], [true, `${CORE}0`, 'start', null], 'the old reply did not replace the newer text or open anything');

  m.q('dialog.pm-code [data-action="code-open"]').click();
  fake.calls[2].resolve({ ok: false, issues: [{ code: 'worker-error', path: '$', message: 'x', params: { reason: 'deadline' } }] });
  await settled(m);
  equal([shown(m)?.error, fieldOf(m).getAttribute('aria-invalid')], [EN.service, null], 'a failed request is a service message, not a verdict on the text');
  equal(fieldOf(m).value, `${CORE}0`, 'text kept');

  typeIn(m, CORE);
  m.q('dialog.pm-code [data-action="code-open"]').click();
  await m.player.controller.openHash(sampleLink);
  fake.calls[3].resolve(reply);
  await settled(m);
  assert(isOpen(m), 'the entry stays open');
  assert(/another puzzle was being opened/.test(shown(m)?.error ?? ''), `superseded: ${shown(m)?.error}`);
  assertSamePuzzleOfPack(m);
  m.player.destroy();
  equal(fake.disposed, 1, 'the page disposed its client with the player');

  const pending = deferredClient();
  const gone = await mount({ client: () => pending.client });
  await openFromStart(gone);
  typeIn(gone, CORE);
  gone.q('dialog.pm-code [data-action="code-open"]').click();
  gone.player.destroy();
  pending.calls[0].resolve(reply);
  await flush();
  await flush();
  assert(dialogOf(gone) === null && gone.root.querySelector('dialog') === null, 'no dialog survives destroy, and a late reply touches nothing');
});

/** The sample pack opened by link (a pack with three puzzles) is open. @param {Stage} m */
function assertSamePuzzleOfPack(m) {
  const { pack, screen } = m.player.store.getState();
  assert(screen === 'game' && pack?.puzzles.length === sample.puzzles.length, 'the superseding load opened its own pack');
}

await check('missing module workers: a useful message, no main-thread decoding, other ways to open a puzzle still work', async () => {
  const before = catalogueStats.sizesBuilt;
  const m = await mount({
    client: () => createPuzzleCodeClient({
      createPool: () => /** @type {any} */ (createPool({ size: 1, workerFactory: () => { throw new PoolError('worker-unavailable', 'no workers'); } })),
    }),
  });
  await openFromStart(m);
  await submitText(m, CORE);
  equal(shown(m)?.error, EN.worker, 'the message');
  assert(!/file/i.test(shown(m)?.error ?? ''), 'it does not offer a file import that does not exist');
  equal([fieldOf(m).value, fieldOf(m).getAttribute('aria-invalid'), m.player.store.getState().screen], [CORE, null, 'start'], 'text kept, not blamed on the text, nothing opened');
  equal(catalogueStats.sizesBuilt, before, 'the page decoded nothing itself');
  escape(m);
  await waitFor(() => !isOpen(m), 'closed');
  m.q('[data-action="sample"]').click();
  await waitFor(() => m.root.dataset.screen === 'game', 'the sample still opens');
  m.player.destroy();
});

await check('letters, Delete, arrows and shortcuts typed in the code field never move, turn or undo a piece behind the dialog', async () => {
  const m = await mount({ hash: sampleLink });
  const id = /** @type {string} */ (m.q('.tray-piece').getAttribute('data-piece-id'));
  m.player.controller.select(id);
  const before = m.player.store.getState().game;
  const tray = JSON.stringify([...(before?.tray.entries() ?? [])]);
  await openFromHeader(m);
  const field = fieldOf(m);
  const keys = ['e', 'r', 'q', 'f', 'v', 'E', 'Q', 'Delete', 'Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'Enter', ' '];
  for (const key of keys) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    field.dispatchEvent(event);
    assert(!event.defaultPrevented || key === 'Escape', `${key} is left to the text field`);
  }
  for (const init of /** @type {KeyboardEventInit[]} */ ([{ key: 'z', ctrlKey: true }, { key: 'z', ctrlKey: true, shiftKey: true }, { key: 'y', ctrlKey: true }, { key: '?', shiftKey: true }])) {
    const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
    field.dispatchEvent(event);
    assert(!event.defaultPrevented, `${init.key} with modifiers is left alone`);
  }
  equal(JSON.stringify([...(m.player.store.getState().game?.tray.entries() ?? [])]), tray, 'no piece turned');
  equal(m.player.store.getState().game?.placed.size, before?.placed.size, 'no piece moved');
  equal(m.player.store.getState().game?.history.length, before?.history.length, 'no history entry');
  assert(m.root.querySelector('dialog.pm-help[open]') === null, '? did not open the shortcuts help');
  assert(isOpen(m), 'the entry is still open');
  m.player.destroy();
});

await check('the count is that of the normalized code; the entry is DOM-safe for any text', async () => {
  const m = await mount();
  await openFromStart(m);
  const count = () => m.q('dialog.pm-code .pm-code-count').textContent;
  typeIn(m, 'ab cd');
  equal(count(), '4 characters', 'grouping is not counted');
  typeIn(m, 'a');
  equal(count(), '1 character', 'the singular');
  typeIn(m, CORE);
  equal(count(), '38 characters', 'the core');
  typeIn(m, CODE);
  equal(count(), '45 characters', 'the dot counts when there is a tail');
  typeIn(m, `https://example.test/player/#p=${CORE}&i=0`);
  equal(count(), '38 characters', 'a link counts its code, not its prefix');
  typeIn(m, 'ab!c');
  equal([count(), shown(m)], ['4 characters', null], 'wrong text gets a neutral count and no error while typing');
  typeIn(m, '"><svg onload="window.__xss=1"></svg>');
  await settledAfterClick(m);
  assert(xss() === undefined && m.root.querySelectorAll('svg[onload]').length === 0, 'no script ran from the text');
  assert((shown(m)?.error ?? '').includes('contains'), 'the offending character is only reported as text');
  m.player.destroy();
});

/** @param {Stage} m */
async function settledAfterClick(m) {
  m.q('dialog.pm-code [data-action="code-open"]').click();
  await settled(m);
}

await check('Vietnamese: the entry, the count, the offers and every message follow the language, also while it is open', async () => {
  setLocale('vi', document);
  const m = await mount();
  await openFromStart(m);
  equal([m.q('dialog.pm-code label').textContent, m.q('dialog.pm-code [data-action="code-open"]').textContent, m.q('dialog.pm-code [data-action="code-cancel"]').textContent], ['Mã đề', 'Mở đề', 'Hủy'], 'labels');
  typeIn(m, CORE);
  equal(m.q('dialog.pm-code .pm-code-count').textContent, '38 ký tự', 'count');
  await submitText(m, ONE_TYPO);
  equal(shown(m)?.error, 'Mã có lỗi nhập. Hãy đối chiếu với bản in.', 'typing error');
  equal(shown(m)?.candidate, `Có thể sửa: ở nhóm 2, ký tự 2 có thể là "${CODE[5]}" thay vì "${ONE_TYPO[5]}". Hãy so với bản in.`, 'candidate');
  equal(m.q('dialog.pm-code [data-action="use-correction"]').textContent, 'Dùng cách sửa này', 'offer');
  setLocale('en', document);
  equal(shown(m)?.error, EN.check, 'switching the language rewrites the open message');
  setLocale('vi', document);
  await submitText(m, DAMAGED_TAIL);
  equal([shown(m)?.error, m.q('dialog.pm-code [data-action="open-core"]').textContent], ['Phần lời giải (không bắt buộc) có lỗi nhập.', 'Mở đề không có phần lời giải'], 'tail');
  await submitText(m, `#p=${CODE}&i=1`);
  equal(shown(m)?.error, 'Mã đề chỉ mở một đề; hãy bỏ "&i=…" khỏi liên kết.', 'index');
  await submitText(m, 'ab!c');
  equal(shown(m)?.error, 'Mã có ký tự "!", ký tự này không có trong mã đề.', 'bad character');
  await submitText(m, VERSION3);
  equal(shown(m)?.error, 'Mã đề này cần phiên bản trình chơi mới hơn.', 'version');
  m.q('dialog.pm-code [data-action="code-cancel"]').click();
  m.player.destroy();
});

/**
 * @param {string} css
 * @returns {[number, number, number, number]}
 */
function parseColor(css) {
  const nums = css.match(/-?[\d.]+%?/g) ?? [];
  if (!/^rgba?\(/.test(css) || nums.length < 3) {
    throw new Error(`unreadable colour ${css}`);
  }
  const alpha = nums[3] === undefined ? 1 : nums[3].endsWith('%') ? Number.parseFloat(nums[3]) / 100 : Number.parseFloat(nums[3]);
  return [Number.parseFloat(nums[0]), Number.parseFloat(nums[1]), Number.parseFloat(nums[2]), alpha];
}

/** @param {Element} node @returns {[number, number, number]} */
function backdropOf(node) {
  /** @type {Array<[number, number, number, number]>} */
  const layers = [];
  for (let at = /** @type {Element | null} */ (node); at !== null; at = at.parentElement) {
    const color = parseColor(getComputedStyle(at).backgroundColor);
    if (color[3] > 0) {
      layers.push(color);
    }
    if (color[3] === 1) {
      break;
    }
  }
  let [r, g, b] = [255, 255, 255];
  for (const [lr, lg, lb, la] of layers.reverse()) {
    [r, g, b] = [lr * la + r * (1 - la), lg * la + g * (1 - la), lb * la + b * (1 - la)];
  }
  return [r, g, b];
}

/** @param {number[]} rgb */
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** @param {number[]} a @param {number[]} b */
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

for (const theme of ['light', 'dark', 'high-contrast']) {
  await check(`${theme} theme: every text and button of the entry reads at 4.5:1 and an invalid field is marked beyond colour`, async () => {
    document.documentElement.setAttribute('data-theme', theme);
    const m = await mount();
    await openFromStart(m);
    await submitText(m, ONE_TYPO);
    assert(shown(m)?.candidate !== null, 'the richest state is on show');
    const dialog = /** @type {HTMLDialogElement} */ (dialogOf(m));
    /** @type {string[]} */
    const low = [];
    let measured = 0;
    for (const node of dialog.querySelectorAll('.pm-dialog-title, label, textarea, .pm-code-note, .pm-code-error, .pm-code-candidate, button')) {
      if (node.closest('[hidden]') !== null) {
        continue;
      }
      const text = parseColor(getComputedStyle(node).color);
      const back = backdropOf(node);
      const value = ratio([text[0], text[1], text[2]], back);
      measured += 1;
      if (value < 4.5) {
        low.push(`${node.tagName.toLowerCase()}.${String(node.className).split(' ')[0]} ${value.toFixed(2)}`);
      }
    }
    equal(low, [], `${theme}: low contrast`);
    assert(measured >= 8, `measured ${measured}`);
    const field = fieldOf(m);
    const style = getComputedStyle(field);
    const edge = ratio(parseColor(style.borderTopColor).slice(0, 3), backdropOf(dialog));
    assert(edge >= 3, `${theme}: invalid border ${edge.toFixed(2)}:1`);
    assert(style.boxShadow !== 'none' || Number.parseFloat(style.borderTopWidth) >= 2, `${theme}: a heavier border, not colour alone`);
    m.player.destroy();
  });
}

/**
 * The real Player page in a narrow frame. @param {string} search @param {string} hash
 */
async function narrowFrame(search, hash) {
  const f = document.createElement('iframe');
  f.className = 'stage-frame';
  Object.assign(f.style, { position: 'fixed', left: '0', top: '0', width: '390px', height: '844px', border: '0', zIndex: '6', background: '#fff' });
  f.src = `../../player/index.html${search}${hash}`;
  document.body.append(f);
  await new Promise((resolve) => f.addEventListener('load', resolve, { once: true }));
  const doc = /** @type {Document} */ (f.contentDocument);
  await waitFor(() => doc.querySelector('#app[data-screen]') !== null, 'the Player in the frame');
  return { frameEl: f, doc, win: /** @type {Window} */ (f.contentWindow) };
}

await check('390 px: the Player page and the entry fit without sideways scrolling, with 44 px buttons, in English and Vietnamese', async () => {
  for (const [lang, error] of /** @type {const} */ ([['en', EN.check], ['vi', 'Mã có lỗi nhập. Hãy đối chiếu với bản in.']])) {
    const f = await narrowFrame(`?lang=${lang}`, `#p=${ONE_TYPO}`);
    await waitFor(() => f.doc.querySelector('dialog.pm-code[open]') !== null, `${lang}: the entry opens for the bad address`);
    const dialog = /** @type {HTMLDialogElement} */ (f.doc.querySelector('dialog.pm-code'));
    const root = f.doc.documentElement;
    assert(root.scrollWidth <= root.clientWidth, `${lang}: page scrolls sideways (${root.scrollWidth} > ${root.clientWidth})`);
    const box = dialog.getBoundingClientRect();
    assert(box.left >= 0 && box.right <= f.win.innerWidth && box.top >= 0 && box.bottom <= f.win.innerHeight, `${lang}: dialog ${JSON.stringify(box)}`);
    assert(dialog.scrollWidth <= dialog.clientWidth, `${lang}: the dialog scrolls sideways`);
    equal(dialog.querySelector('.pm-code-error')?.textContent, error, `${lang}: message`);
    /** @type {string[]} */
    const small = [];
    for (const button of dialog.querySelectorAll('button')) {
      const r = button.getBoundingClientRect();
      if (r.width > 0 && (r.height < 44 || r.width < 44)) {
        small.push(`${button.dataset.action} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    equal(small, [], `${lang}: targets under 44 px`);
    const field = /** @type {HTMLElement} */ (dialog.querySelector('textarea'));
    assert(field.getBoundingClientRect().right <= box.right, `${lang}: the field fits the dialog`);
    assert(Number.parseFloat(f.win.getComputedStyle(field).fontSize) >= 16, `${lang}: 16 px text, so touch browsers do not zoom`);
    dialog.querySelector('[data-action="code-cancel"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await waitFor(() => !dialog.open, `${lang}: closed`);
    assert(root.scrollWidth <= root.clientWidth, `${lang}: the start screen scrolls sideways`);
    const header = f.doc.querySelector('.app-header');
    const overflow = [...(header?.querySelectorAll('button') ?? [])].filter((b) => b.getBoundingClientRect().right > f.win.innerWidth);
    equal(overflow.length, 0, `${lang}: header controls inside the viewport`);
    f.frameEl.remove();
  }
});

await check('the page never decoded a code itself and every worker it started has ended', async () => {
  assert(catalogueStats.sizesBuilt === 0, 'the page built the catalogue');
  await new Promise((resolve) => setTimeout(resolve, 150));
  equal(workers.spawned - workers.terminated, 0, `workers: spawned ${workers.spawned}, terminated ${workers.terminated}`);
  assert(workers.spawned > 0, 'the real worker was used');
  assert(violations.length === 0, `CSP: ${violations.join('; ')}`);
  assert(uncaught.length === 0, `uncaught: ${uncaught.join('; ')}`);
});

const failed = results.filter((r) => !r.ok);
const list = /** @type {HTMLElement} */ (document.getElementById('results'));
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.ok ? '' : ` - ${r.error}`}`;
  list.append(li);
}
const summary = document.getElementById('summary');
if (summary) {
  summary.textContent = `${results.length - failed.length}/${results.length} passed; workers spawned ${workers.spawned}, terminated ${workers.terminated}`;
}
document.documentElement.dataset.summary = JSON.stringify({
  total: results.length,
  spawned: workers.spawned,
  terminated: workers.terminated,
  failed: failed.map((r) => `${r.name}: ${r.error}`.slice(0, 900)),
});
document.documentElement.dataset.result = failed.length === 0 && results.length > 0 ? 'pass' : 'fail';
