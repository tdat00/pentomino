// @ts-check
// Browser regression harness for T19 (player loading, library and shell). It
// mounts the real shell with injected storage, address and pool, writes a
// pass/fail list into the page and sets data-result on <html>. Developer
// fixture, not deployed.

import { reduce } from '../../core/engine/game.js';
import { colorFor, labelFor } from '../../core/engine/palette.js';
import { validatePack } from '../../core/engine/pack.js';
import { encodeShareCode } from '../../core/engine/sharecode.js';
import { PoolAbortError, PoolError } from '../../core/browser/worker-pool.js';
import { SAVE_FAILED_MESSAGE, createStorage } from '../../core/browser/storage.js';
import { mountPlayer } from '../../player/app.js';

const PIECE_SET_MESSAGE = 'This file has pieces but no puzzle — open it in the generator.';
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
  for (const stage of document.querySelectorAll('.stage-root')) {
    stage.remove();
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
  assert(a === b || (typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b)), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/**
 * @param {() => unknown} cond
 * @param {string} label
 * @param {number} [ms]
 */
async function waitFor(cond, label, ms = 8000) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (cond()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for ${label}`);
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

const sampleText = await (await fetch('../../player/samples/sample-pack.json')).text();
const sample = JSON.parse(sampleText);
const sampleCode = await encodeShareCode(validatedValue(sample));
const handText = await (await fetch('../../tests/fixtures/hand-authored-pack.json')).text();

/**
 * @param {unknown} pack
 * @returns {any}
 */
function validatedValue(pack) {
  const checked = validatePack(pack);
  if (!checked.ok) {
    throw new Error(`fixture invalid: ${checked.issues[0].message}`);
  }
  return checked.value;
}

const answerFree = { ...sample, puzzles: sample.puzzles.map((/** @type {any} */ p) => ({ ...p, solution: null })) };
delete answerFree.witness;
const reclaimed = {
  ...sample,
  puzzles: sample.puzzles.map((/** @type {any} */ p) => ({ ...p, title: `${p.title} (v2)`, rating: { ...p.rating, score: p.rating.score + 1 } })),
};
const unsatisfiable = {
  format: 'pentomino-pack',
  version: 1,
  kind: 'puzzle-pack',
  rules: 'free-polyomino-v1',
  board: { rows: ['###', '###'] },
  pieces: [
    { id: 'A', label: 'A', color: '#e6194b', cells: [[0, 0], [0, 1], [1, 1]] },
    { id: 'B', label: 'B', color: '#3cb44b', cells: [[0, 0], [1, 0], [2, 0]] },
  ],
  puzzles: [{ id: 'u1', title: 'Impossible', clues: [] }],
};
const maliciousTitle = '<img src=x onerror="window.__xss=1">';
const malicious = { ...sample, meta: { title: maliciousTitle }, puzzles: sample.puzzles.map((/** @type {any} */ p) => ({ ...p, title: maliciousTitle })) };

/** 21 monominoes on 3x7: more than 20 pieces, so Patterns exists. */
function bigSet() {
  const pieces = Array.from({ length: 21 }, (_, i) => ({ id: `P${String(i + 1).padStart(2, '0')}`, label: labelFor(i), color: colorFor(i), cells: [[0, 0]] }));
  const solution = pieces.map((p, i) => ({ piece: p.id, x: i % 7, y: Math.floor(i / 7), turn: 0, mirrored: false }));
  return {
    format: 'pentomino-pack',
    version: 1,
    kind: 'puzzle-pack',
    rules: 'free-polyomino-v1',
    board: { rows: ['#######', '#######', '#######'] },
    pieces,
    puzzles: [{ id: 'big1', title: 'Big', clues: [solution[0]], solution }],
  };
}

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

/**
 * @param {object} o
 * @returns {Blob}
 */
const jsonBlob = (o) => new Blob([typeof o === 'string' ? o : JSON.stringify(o)], { type: 'application/json' });

/**
 * @param {{ hash?: string, adapter?: ReturnType<typeof memoryAdapter> | null, createPool?: () => any, coarse?: boolean,
 *   width?: number, height?: number, preferences?: { setItem: (key: string, value: string) => void } }} [o]
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
  root.style.background = '#f3f1ea';
  document.body.append(root);
  const adapter = o.adapter === undefined ? memoryAdapter() : o.adapter;
  const storage = createStorage(adapter, () => Date.now());
  const location = { hash: o.hash ?? '', pathname: '/player/', search: '' };
  const urls = /** @type {string[]} */ ([]);
  const downloads = /** @type {string[]} */ ([]);
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
    createPool: o.createPool,
    download: (_pack, name) => {
      downloads.push(name);
    },
    coarsePointer: o.coarse === true,
    listenHashChange: false,
    preferenceStorage: o.preferences ?? null,
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
  /** @param {Blob} blob @param {string} [name] */
  const chooseFile = async (blob, name = 'pack.pentomino.json') => {
    const input = /** @type {HTMLInputElement} */ (q('[data-role="file-input"]'));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], name));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  /** @param {string} text */
  const paste = (text) => {
    /** @type {HTMLTextAreaElement} */ (q('#import-paste')).value = text;
    q('[data-action="paste"]').click();
  };
  return { root, player, adapter, storage, location, urls, downloads, q, qa, visible, chooseFile, paste };
}

/** @param {Awaited<ReturnType<typeof mount>>} m */
const title = (m) => m.q('.puzzle-title').textContent ?? '';

await check('link: #pack= opens puzzle 2 with claims, badges and no local data', async () => {
  const m = await mount({ hash: `#pack=${sampleCode}&i=1` });
  equal(m.root.dataset.screen, 'game', 'screen');
  assert(m.visible('.game'), 'game visible');
  assert(title(m) === 'Normal #2', `title ${title(m)}`);
  assert((m.q('.puzzle-info').textContent ?? '').startsWith('Normal: score '), `info ${m.q('.puzzle-info').textContent}`);
  equal(m.q('.puzzle-info strong').textContent, 'Normal', 'level in bold');
  equal(m.qa('.tray-piece').length, 9 - sample.puzzles[1].clues.length, 'tray count');
  equal(m.qa('.board-host .pm-clue').length, sample.puzzles[1].clues.length, 'clue pieces');
  assert(m.q('.pm-board .pm-svg').getBoundingClientRect().width > 100, 'board drawn');
  equal(m.q('[data-badge="verification"]').textContent, 'Solvable ✓', 'verification');
  equal(m.q('[data-badge="certificate"]').textContent, 'Uniqueness not checked', 'certificate');
  assert(!m.visible('[data-badge="local"]'), 'portable link is not local');
  equal(m.urls.length, 0, 'address untouched on load');
  m.player.controller.nextPuzzle();
  equal(m.location.hash, `#pack=${sampleCode}&i=2`, 'i updated, code kept');
  equal(m.qa('[data-action="next"], [data-action="previous"]').length, 0, 'the main panel has no Previous or Next buttons');
  m.player.destroy();
});

await check('no hash and an empty library: Import screen offers the sample and opens nothing', async () => {
  const m = await mount();
  equal(m.root.dataset.screen, 'import', 'screen');
  assert(m.visible('[data-action="sample"]'), 'sample offered');
  assert(!m.visible('.game'), 'no game');
  equal(m.qa('.library li').length, 0, 'library empty');
  assert(m.visible('.library-empty'), 'empty hint');
  m.player.destroy();
});

await check('sample: real fetch of player/samples/sample-pack.json, three claimed puzzles in the puzzle list', async () => {
  const m = await mount();
  m.q('[data-action="sample"]').click();
  await waitFor(() => m.root.dataset.screen === 'game', 'sample game');
  // The list shows the newest puzzle first; the tests below read the cards in pack order.
  const cards = [...m.qa('.puzzle-card')].reverse();
  equal(cards.length, 3, 'cards');
  const text = (/** @type {HTMLElement} */ card, /** @type {string} */ part) => card.querySelector(part)?.textContent ?? '';
  equal(text(cards[0], '.card-heading'), 'Puzzle #1', 'heading');
  assert(/^Easy: score \d+$/.test(text(cards[0], '.card-rating')), text(cards[0], '.card-rating'));
  equal(text(cards[0], '.card-status'), 'New', 'status');
  assert(/^Normal/.test(text(cards[1], '.card-rating')) && /^Hard/.test(text(cards[2], '.card-rating')), 'levels');
  assert(cards.every((card) => card.querySelector('.pm-board .pm-svg') !== null), 'every card shows a preview');
  equal(m.qa('.card-select[aria-current="true"]').length, 1, 'one open puzzle');
  equal(m.qa('.library li').length, 1, 'sample joins recent');
  m.player.destroy();
});

await check('file input, drop and paste (link, code, JSON) all open the same way', async () => {
  const m = await mount();
  await m.chooseFile(jsonBlob(sampleText));
  await waitFor(() => m.root.dataset.screen === 'game', 'file game');
  equal(m.qa('.tray-piece').length, 9 - sample.puzzles[0].clues.length, 'file tray');
  assert(/^#lib=[0-9a-f]{16}&i=0$/.test(m.location.hash), `hash ${m.location.hash}`);
  assert(m.visible('[data-badge="local"]'), 'a local link is labeled');

  m.player.controller.showImport();
  assert(m.visible('.import'), 'import screen over the game');
  const transfer = new DataTransfer();
  transfer.items.add(new File([JSON.stringify(sample)], 'drop.json'));
  const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer });
  m.root.dispatchEvent(drop);
  equal(drop.defaultPrevented, true, 'drop handled');
  await waitFor(() => m.root.dataset.screen === 'game', 'drop game');

  m.player.controller.showImport();
  m.paste(`see https://example.invalid/player/#pack=${sampleCode}&i=2 thanks`);
  await waitFor(() => m.root.dataset.screen === 'game' && title(m).startsWith('Hard #3'), 'pasted link');
  m.player.controller.showImport();
  m.paste(`code ${sampleCode} here`);
  await waitFor(() => m.root.dataset.screen === 'game' && title(m).startsWith('Easy #1'), 'pasted code');
  m.player.controller.showImport();
  m.paste(handText);
  await waitFor(() => m.root.dataset.screen === 'game' && title(m).startsWith('Example'), 'pasted json');
  equal(m.qa('.library li').length, 2, 'two packs in Recent');
  m.player.destroy();
});

await check('every failure shows its exact message and the open game is unchanged', async () => {
  const m = await mount({ hash: `#pack=${sampleCode}&i=1` });
  const before = title(m);
  const gameBefore = m.player.store.getState().game;
  /** @type {[string, () => unknown, RegExp | string][]} */
  const cases = [
    ['piece set', () => m.paste(JSON.stringify({ ...sample, kind: 'piece-set', puzzles: [] })), PIECE_SET_MESSAGE],
    ['version', () => m.paste(JSON.stringify({ ...sample, version: 9 })), 'Unsupported puzzle version or rules.'],
    ['rules', () => m.paste(JSON.stringify({ ...sample, rules: 'nope' })), 'Unsupported puzzle version or rules.'],
    ['invalid', () => m.paste(JSON.stringify({ ...sample, board: { rows: ['#'] } })), /^This file is not a valid Pentomino pack: .+/],
    ['not a pack', () => m.paste('just some words'), /^This file is not a valid Pentomino pack: /],
    ['index', () => m.paste(`#pack=${sampleCode}&i=7`), 'This pack has no puzzle with that number.'],
    ['missing local', () => m.paste('#lib=0123456789abcdef&i=0'), "This puzzle is not in this browser's library. Import a file or use a portable link."],
    ['oversized file', () => m.chooseFile(new Blob([new Uint8Array(513 * 1024)])), /^This file is not a valid Pentomino pack: A pack file is at most 524288 bytes/],
  ];
  for (const [name, run, expected] of cases) {
    m.player.controller.showImport();
    await run();
    await waitFor(() => (m.q('.import-error').textContent ?? '') !== '' && !m.q('.import-error').hidden, `${name} message`);
    const text = m.q('.import-error').textContent ?? '';
    assert(typeof expected === 'string' ? text === expected : expected.test(text), `${name}: ${text}`);
    equal(m.player.store.getState().game, gameBefore, `${name}: same game`);
    m.q('.import-error').textContent = '';
    m.player.controller.closeImport();
    equal(title(m), before, `${name}: same title`);
    m.player.store.update({ error: null });
  }
  m.player.destroy();
});

await check('library: Recent lists packs; Open, Export and two-step Delete affect only their pack', async () => {
  const adapter = memoryAdapter({ 'other-app:key': 'precious' });
  const m = await mount({ adapter });
  m.paste(sampleText);
  await waitFor(() => m.root.dataset.screen === 'game', 'first');
  m.player.controller.showImport();
  m.paste(handText);
  await waitFor(() => title(m).startsWith('Example'), 'second');
  m.player.controller.showImport();
  equal(m.qa('.library li').length, 2, 'entries');
  const first = m.qa('.library li')[1];
  assert((first.textContent ?? '').includes('0 of 3 solved'), `meta ${first.textContent}`);
  /** @type {HTMLElement} */ (first.querySelector('[data-action="export"]')).click();
  equal(m.downloads.length, 1, 'export called');
  /** @type {HTMLElement} */ (first.querySelector('[data-action="open"]')).click();
  await waitFor(() => title(m).startsWith('Easy #1'), 'open from library');
  m.player.controller.showImport();
  const target = m.qa('.library li')[0];
  const id = target.dataset.packId ?? '';
  const del = /** @type {HTMLElement} */ (target.querySelector('[data-action="delete"]'));
  del.click();
  equal(m.qa('.library li').length, 2, 'first click only asks');
  equal(m.q(`[data-action="delete"][data-pack-id="${id}"]`).textContent, 'Confirm delete', 'confirmation');
  m.q(`[data-action="delete"][data-pack-id="${id}"]`).click();
  equal(m.qa('.library li').length, 1, 'removed');
  equal(adapter.map.get('other-app:key'), 'precious', 'foreign storage intact');
  assert(!adapter.map.has(`pentomino:v1:lib:${id}`), 'record removed');
  assert([...adapter.map.keys()].some((k) => k.startsWith('pentomino:v1:lib:')), 'the other pack remains');
  m.q('[data-action="back"]').click();
  assert(m.visible('.game'), 'back to the still-open game');
  m.player.destroy();
});

await check('same pack id with different content: newest claims win and Recent keeps one entry', async () => {
  const adapter = memoryAdapter();
  const m = await mount({ adapter });
  m.paste(sampleText);
  await waitFor(() => m.root.dataset.screen === 'game', 'first');
  m.player.controller.showImport();
  m.paste(JSON.stringify(reclaimed));
  await waitFor(() => title(m).startsWith('Easy (v2) #1'), 'second');
  m.player.controller.showImport();
  equal(m.qa('.library li').length, 1, 'one entry');
  const stored = [...adapter.map.entries()].filter(([k]) => k.startsWith('pentomino:v1:lib:') && !k.endsWith('index'));
  equal(stored.length, 1, 'one record');
  assert(stored[0][1].includes('Easy (v2)'), 'record holds the new content');
  m.player.destroy();
});

await check('malicious title is text everywhere: no element, no script, no CSP violation', async () => {
  delete (/** @type {any} */ (window)).__xss;
  const m = await mount();
  m.paste(JSON.stringify(malicious));
  await waitFor(() => m.root.dataset.screen === 'game', 'game');
  assert(title(m).includes(maliciousTitle), 'literal title');
  assert(m.qa('.card-heading').every((n) => (n.textContent ?? '').includes('<img')), 'the puzzle list shows text');
  m.player.controller.showImport();
  assert((m.q('.library-title').textContent ?? '') === maliciousTitle, 'library title');
  equal(m.root.querySelectorAll('img:not(.app-logo)').length, 0, 'no img element');
  await new Promise((resolve) => setTimeout(resolve, 100));
  equal(/** @type {any} */ (window).__xss, undefined, 'no script ran');
  m.player.destroy();
});

await check('verification with the real module worker: solvable and impossible are proven, never guessed', async () => {
  const m = await mount();
  m.paste(JSON.stringify(answerFree));
  await waitFor(() => m.root.dataset.screen === 'game', 'game');
  await waitFor(() => m.q('[data-badge="verification"]').textContent === 'Solvable ✓', 'search result');
  m.player.controller.showImport();
  m.paste(JSON.stringify(unsatisfiable));
  await waitFor(() => title(m).startsWith('Impossible'), 'impossible pack');
  await waitFor(() => m.q('[data-badge="verification"]').textContent === 'No solution exists', 'proven impossible');
  assert(m.qa('.tray-piece').length === 2, 'play stays possible');
  m.player.destroy();
});

await check('workers unavailable: "Solvability not verified", play continues', async () => {
  const m = await mount({ createPool: () => { throw new PoolError('worker-unavailable', 'Module workers are not supported here'); } });
  m.paste(JSON.stringify(answerFree));
  await waitFor(() => m.root.dataset.screen === 'game', 'game');
  equal(m.q('[data-badge="verification"]').textContent, 'Solvability not verified', 'label');
  const piece = m.qa('.tray-piece')[0];
  piece.click();
  equal(piece.getAttribute('aria-pressed'), 'true', 'a piece can still be picked');
  m.player.destroy();
});

await check('stale proof data of a replaced pack is discarded; a superseded check clears', async () => {
  /** @type {{ resolve: (v: unknown) => void, reject: (e: unknown) => void }[]} */
  const pending = [];
  const pool = {
    beginRequest() {},
    endRequest() {},
    close() {},
    run: () => new Promise((resolve, reject) => {
      pending.push({ resolve, reject });
    }),
  };
  const m = await mount({ createPool: () => pool });
  m.paste(JSON.stringify(answerFree));
  await waitFor(() => pending.length === 1, 'first check');
  equal(m.q('[data-badge="verification"]').textContent, 'Checking solvability…', 'pending');
  const staleFp = m.player.store.getState().fingerprints[0];
  m.player.controller.showImport();
  m.paste(JSON.stringify({ ...answerFree, puzzles: [answerFree.puzzles[2]] }));
  await waitFor(() => pending.length === 2, 'second check');
  pending[0].resolve({ results: [{ index: 0, fingerprint: staleFp, status: 'unsatisfiable' }] });
  await frame();
  await new Promise((resolve) => setTimeout(resolve, 50));
  equal(m.q('[data-badge="verification"]').textContent, 'Checking solvability…', 'stale reply ignored');
  pending[1].reject(new PoolAbortError('superseded'));
  await waitFor(() => m.q('[data-badge="verification"]').hidden, 'superseded check cleared');
  m.player.destroy();
});

await check('unavailable storage: the puzzle opens, play goes on and one honest warning is shown', async () => {
  const hostile = {
    length: 0,
    key: () => null,
    getItem: () => { throw new Error('denied'); },
    setItem: () => { throw new Error('denied'); },
    removeItem: () => { throw new Error('denied'); },
  };
  const m = await mount({ adapter: /** @type {any} */ (hostile), hash: `#pack=${sampleCode}&i=0` });
  equal(m.root.dataset.screen, 'game', 'game open');
  equal(m.q('[data-badge="storage"]').textContent, SAVE_FAILED_MESSAGE, 'warning');
  m.player.controller.nextPuzzle();
  assert(title(m).startsWith('Normal #2'), 'navigation works');
  m.player.destroy();
  const none = await mount({ adapter: null });
  none.paste(sampleText);
  await waitFor(() => none.root.dataset.screen === 'game', 'no storage game');
  none.player.destroy();
});

await check('progress is restored silently after reload; puzzle switching saves progress first', async () => {
  const adapter = memoryAdapter();
  const m = await mount({ adapter });
  m.paste(sampleText);
  await waitFor(() => m.root.dataset.screen === 'game', 'game');
  const s = m.player.store.getState();
  const clued = new Set(sample.puzzles[0].clues.map((/** @type {any} */ c) => c.piece));
  const pose = sample.puzzles[0].solution.find((/** @type {any} */ p) => !clued.has(p.piece));
  m.player.store.update({ game: reduce(/** @type {any} */ (s.game), { type: 'place', pose }) });
  equal(m.qa('.tray-piece').length, 9 - sample.puzzles[0].clues.length - 1, 'piece left the tray');
  m.player.controller.nextPuzzle();
  assert(title(m).startsWith('Normal #2'), 'moved on');
  equal(m.q('.puzzle-card[data-puzzle-index="0"] .card-status').textContent, 'In progress', 'the list shows the progress that was saved');
  m.player.destroy();

  const again = await mount({ adapter });
  again.paste(sampleText);
  await waitFor(() => again.root.dataset.screen === 'game', 'reloaded game');
  assert(again.root.querySelector('.status-resume') === null && !(again.q('[data-host="status"]').textContent ?? '').includes('Saved progress'), 'no Continue / Restart message');
  equal(again.qa('.tray-piece').length, 9 - sample.puzzles[0].clues.length - 1, 'progress restored');
  again.player.controller.replay();
  equal(again.qa('.tray-piece').length, 9 - sample.puzzles[0].clues.length, 'Replay starts over');
  again.player.destroy();
});

await check('there are no View switches: labels, patterns (K > 20) and the timer always show, whatever older versions stored', async () => {
  const adapter = memoryAdapter({ 'pentomino:v1:prefs': JSON.stringify({ labels: false, patterns: false, timer: false, straighten: false }) });
  const m = await mount({ adapter });
  m.paste(sampleText);
  await waitFor(() => m.root.dataset.screen === 'game', 'game');
  equal(m.qa('[data-pref], .view-options').length, 0, 'the right panel has no View switches');
  m.player.destroy();

  const big = validatedValue(bigSet());
  const b = await mount({ adapter });
  b.paste(JSON.stringify(big));
  await waitFor(() => b.root.dataset.screen === 'game', 'big game');
  const labelsOn = () => b.root.querySelector('.board-host .pm-labels')?.getAttribute('display');
  assert(b.root.querySelectorAll('.pm-pattern').length > 0, 'patterns drawn');
  assert(labelsOn() !== 'none' && !b.q('.game-timer').hidden, 'labels and timer are shown');
  b.player.controller.setPref('straighten', true);
  equal(JSON.parse(adapter.map.get('pentomino:v1:prefs') ?? '{}'), { straighten: true }, 'only Straighten is stored');
  b.player.destroy();
});

await check('presentation angles 0/45/90/315 load, draw and keep fitting after a viewport change', async () => {
  for (const angle of [0, 45, 90, 315]) {
    const rotated = { ...sample, presentation: { rotation: angle } };
    const m = await mount({ hash: `#pack=${await encodeShareCode(validatedValue(rotated))}&i=2` });
    const group = m.q('.pm-board-group').getAttribute('transform') ?? '';
    assert(group.startsWith(`rotate(${-angle} `) || (angle === 0 && group.startsWith('rotate(0 ')), `angle ${angle}: ${group}`);
    const host = m.q('.board-host').getBoundingClientRect();
    const svg = m.q('.pm-board .pm-svg').getBoundingClientRect();
    assert(svg.width > 50 && svg.height > 50, `angle ${angle}: board has size`);
    const wide = Number(m.q('.pm-board .pm-svg').getAttribute('width'));
    m.root.style.width = '420px';
    m.root.style.height = '520px';
    await waitFor(() => Number(m.q('.pm-board .pm-svg').getAttribute('width')) < wide, `angle ${angle}: refit after narrowing`);
    const narrow = m.q('.pm-board .pm-svg').getBoundingClientRect();
    const hostNarrow = m.q('.board-host').getBoundingClientRect();
    const cell = Number(m.q('.pm-board .pm-svg').getAttribute('width'));
    assert(narrow.width <= hostNarrow.width + 1 || m.q('.pm-board').dataset.scrollable === 'true',
      `angle ${angle}: fits the narrowed host or scrolls (${narrow.width} vs ${hostNarrow.width}, was ${host.width}, cell ${cell})`);
    assert(m.qa('.tray-piece').length > 0, `angle ${angle}: tray drawn`);
    m.player.destroy();
  }
});

await check('Straighten: toggle only for touch with small cells; display-only', async () => {
  const rotated = { ...sample, presentation: { rotation: 45 } };
  const hash = `#pack=${await encodeShareCode(validatedValue(rotated))}&i=0`;
  // 520 px leaves the board column about 170 px, so the cells are small.
  const mouse = await mount({ hash, width: 520, height: 420 });
  assert(!mouse.visible('[data-action="straighten"]'), 'not offered to a mouse');
  mouse.player.destroy();
  const touch = await mount({ hash, width: 520, height: 420, coarse: true });
  assert(touch.visible('[data-action="straighten"]'), 'offered to touch with small cells');
  touch.q('[data-action="straighten"]').click();
  await frame();
  const group = touch.q('.pm-board-group').getAttribute('transform') ?? '';
  assert(group.startsWith('rotate(0 ') || group.startsWith('rotate(-0 '), `straightened ${group}`);
  equal(touch.q('[data-action="straighten"]').getAttribute('aria-pressed'), 'true', 'pressed');
  equal(touch.player.store.getState().pack?.presentation?.rotation, 45, 'pack data unchanged');
  touch.player.destroy();
  const wide = await mount({ hash, coarse: true });
  assert(!wide.visible('[data-action="straighten"]'), 'cells of 24 px or more need no Straighten');
  wide.player.destroy();
});

await check('layout and accessibility contract of the shell', async () => {
  const m = await mount({ hash: `#pack=${sampleCode}&i=0` });
  equal(m.q('.app-header h1').textContent, 'Pentomino Player', 'title');
  equal(m.qa('.app-header [data-lang]').length, 2, 'language switch');
  equal(m.qa('.app-header [data-theme-value]').length, 3, 'theme switch');
  const rect = (/** @type {string} */ sel) => m.q(sel).getBoundingClientRect();
  const history = rect('.app-history');
  const main = rect('.app-main');
  const side = rect('.app-side');
  if (window.innerWidth >= 1360) {
    assert(history.right <= main.left + 1 && main.right <= side.left + 1, 'puzzles | game | pieces');
  } else if (window.innerWidth >= 768) {
    assert(main.right <= side.left + 1 && history.top >= main.bottom - 1, 'game | pieces, puzzles under the game');
  } else {
    assert(main.bottom <= side.top + 1 && side.bottom <= history.top + 1, 'game, pieces, puzzles from top to bottom');
    equal(getComputedStyle(m.q('.tray-host')).overflowX, 'auto', 'tray scrolls horizontally');
  }
  assert(m.q('.app-side').contains(m.q('.tray-host')) && m.q('.app-main').contains(m.q('.board-host')) && m.q('.app-history').contains(m.q('.puzzle-cards')),
    'each panel holds its content');
  const tops = ['.step-head', '.game-bar', '.board-wrap'].map((sel) => rect(sel).top);
  assert(tops.every((top, i) => i === 0 || top > tops[i - 1]), `game panel from top to bottom: ${tops.join(', ')}`);
  assert(m.q('.app-side').contains(m.q('.toolbar-host')) && rect('.toolbar-host').top < rect('.tray-host').top, 'the selection toolbar is in the pieces panel, above the pieces');
  const bar = ['.game-timer', '.game-moves', '[data-action="undo"]', '[data-action="redo"]', '[data-action="hint"]', '[data-action="replay"]'].map((sel) => m.q(`.game-bar ${sel}`));
  for (let i = 1; i < bar.length; i += 1) {
    assert(bar[i - 1].compareDocumentPosition(bar[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `timer, moves, Undo, Redo, Hint, Replay in order at ${i}`);
  }
  for (const button of m.qa('.game .pm-btn').filter((b) => b.getClientRects().length > 0)) {
    assert(button.getBoundingClientRect().height >= 35.5, `target height of ${button.dataset.action}`);
  }
  const svg = m.q('.pm-board .pm-svg');
  equal(svg.getAttribute('role'), 'application', 'board role');
  const help = svg.getAttribute('aria-describedby') ?? '';
  assert(help !== '' && document.getElementById(help) !== null, 'instructions linked');
  const liveRegion = m.q('.live-region');
  equal(liveRegion.getAttribute('aria-live'), 'polite', 'live region');
  await waitFor(() => (liveRegion.textContent ?? '').includes('opened'), 'announcement');
  assert(m.qa('.tray-piece').every((b) => (b.getAttribute('aria-label') ?? '').includes('in tray')), 'tray names');
  assert(m.qa('.tray-piece').every((b) => b.querySelector('svg')?.getAttribute('aria-hidden') === 'true'), 'tray art hidden from AT');
  m.player.destroy();
});

await check('puzzle list: a card opens its puzzle and marks it; the open card does not reload; Import hides the game, a card returns', async () => {
  const m = await mount({ hash: `#pack=${sampleCode}&i=0` });
  equal(m.qa('.puzzle-card').length, 3, 'one card per puzzle');
  equal(m.qa('.puzzle-card').map((card) => card.dataset.puzzleIndex), ['2', '1', '0'], 'the newest puzzle is on top');
  equal(m.qa('[data-action="import"]').length, 0, 'the puzzles panel has no Import button');
  assert(m.visible('.app-history .panel-header [data-action="remove-all-puzzles"]'), 'Remove all is in the header of the panel');
  assert(m.qa('.puzzle-card .card-remove').length === 3, 'every card has a remove button');
  assert(m.q('.puzzle-card .card-title').firstElementChild?.classList.contains('card-status') === true, 'the status is left of the name');
  equal(m.q('.card-select[aria-current="true"]').dataset.index, '0', 'the first puzzle is marked');
  m.q('.puzzle-card[data-puzzle-index="2"] .card-select').click();
  equal(title(m), 'Hard #3', 'the card opens its puzzle');
  equal(m.q('.card-select[aria-current="true"]').dataset.index, '2', 'the mark moved');
  equal(m.qa('.card-select[aria-current="true"]').length, 1, 'only one card is marked');
  equal(m.location.hash, `#pack=${sampleCode}&i=2`, 'i updated, code kept');
  const open = m.player.store.getState().game;
  m.q('.puzzle-card[data-puzzle-index="2"] .card-select').click();
  equal(m.player.store.getState().game, open, 'the open puzzle is not reloaded');
  m.player.controller.showImport();
  equal(m.root.dataset.screen, 'import', 'Import replaces the game panel');
  assert(m.visible('.puzzle-card'), 'the puzzle list stays');
  assert(!m.visible('.tray-piece'), 'the pieces are not offered while the game is hidden');
  assert(m.visible('.tray-empty'), 'the pieces panel explains');
  m.q('.puzzle-card[data-puzzle-index="2"] .card-select').click();
  equal(m.root.dataset.screen, 'game', 'the open card returns to the game');
  equal(m.player.store.getState().game, open, 'with the same game');
  m.q('.puzzle-card[data-puzzle-index="0"] .card-select').click();
  equal(title(m), 'Easy #1', 'another card');
  m.player.destroy();
});

await check('remove: a card removes its puzzle from the pack and the library; Remove all empties the panel and returns to Import', async () => {
  const m = await mount({ hash: `#pack=${sampleCode}&i=1` });
  equal(title(m), 'Normal #2', 'the second puzzle is open');
  const packId = /** @type {string} */ (m.player.store.getState().packId);
  m.q('.puzzle-card[data-puzzle-index="0"] .card-remove').click();
  equal(m.qa('.puzzle-card').length, 2, 'one card less');
  equal(title(m), 'Normal #1', 'the open puzzle stays open, renumbered');
  equal(m.qa('.puzzle-card').map((card) => card.querySelector('.card-heading')?.textContent), ['Puzzle #2', 'Puzzle #1'], 'renumbered, newest on top');
  equal(m.player.store.getState().pack?.puzzles.length, 2, 'the open pack has two puzzles');
  assert(m.player.store.getState().packId !== packId, 'the library holds the reduced pack');
  equal(m.qa('.library li').length, 1, 'no copy of the old pack is left');
  m.q('.puzzle-card[data-puzzle-index="0"] .card-remove').click();
  equal(m.root.dataset.screen, 'game', 'the open puzzle was removed: its neighbour opens');
  equal(m.qa('.puzzle-card').length, 1, 'one card');
  m.q('.puzzle-card .card-remove').click();
  equal(m.root.dataset.screen, 'import', 'the last puzzle leaves the pack');
  equal(m.qa('.puzzle-card').length, 0, 'no cards');
  equal(m.qa('.library li').length, 0, 'the pack is out of Recent');
  assert(m.q('[data-action="remove-all-puzzles"]').hasAttribute('disabled'), 'Remove all is disabled without a pack');
  m.q('[data-action="sample"]').click();
  await waitFor(() => m.root.dataset.screen === 'game', 'sample game');
  m.q('[data-action="remove-all-puzzles"]').click();
  equal([m.root.dataset.screen, m.qa('.puzzle-card').length, m.location.hash], ['import', 0, ''], 'Remove all');
  m.player.destroy();
});

await check('header: EN | VI changes every text and is remembered; the theme buttons set the theme', async () => {
  const kept = /** @type {Map<string, string>} */ (new Map());
  const m = await mount({ hash: `#pack=${sampleCode}&i=1`, preferences: { setItem: (key, value) => void kept.set(key, value) } });
  try {
    equal(m.q('.app-header h1').textContent, 'Pentomino Player', 'English title');
    equal(m.q('[data-lang="en"]').getAttribute('aria-pressed'), 'true', 'English is pressed');
    const left = m.q('.pieces-left').textContent;
    m.q('[data-lang="vi"]').click();
    equal(document.documentElement.lang, 'vi', 'the document language');
    equal(m.q('.app-header h1').textContent, 'Trình chơi Pentomino', 'Vietnamese title');
    equal(m.q('[data-lang="vi"]').getAttribute('aria-pressed'), 'true', 'Vietnamese is pressed');
    equal(m.q('[data-action="undo"]').textContent, 'Hoàn tác', 'a fixed text');
    assert((m.q('.puzzle-info').textContent ?? '').startsWith('Trung bình: điểm '), `rating ${m.q('.puzzle-info').textContent}`);
    equal(m.q('[data-badge="verification"]').textContent, 'Giải được ✓', 'a badge');
    equal(m.q('.pieces-left').textContent, `Còn ${(left ?? '').split(' ')[0]} mảnh`, 'a counter with a number');
    equal(m.q('.puzzle-card[data-puzzle-index="0"] .card-status').textContent, 'Mới', 'a card');
    equal(m.q('.tool-btn[data-action="rotate-cw"]').getAttribute('aria-label'), 'Xoay theo chiều kim đồng hồ', 'an attribute');
    equal(m.q('[data-host="tray"]').getAttribute('aria-label'), 'Các mảnh chưa đặt', 'the tray label');
    m.q('[data-action="help"]').click();
    assert(m.qa('.pm-shortcuts tbody th').some((n) => n.textContent === 'Phím mũi tên'), 'the shortcut list is translated');
    m.q('.pm-help [data-action="help-close"]').click();
    m.player.controller.showImport();
    equal(m.q('[data-action="sample"]').textContent, 'Thử đề mẫu', 'the import screen');
    equal(kept.get('pentomino:v1:lang'), 'vi', 'the choice is remembered');
    m.q('[data-lang="en"]').click();
    equal(m.q('[data-action="sample"]').textContent, 'Try the sample', 'and back');
    equal(document.documentElement.lang, 'en', 'the document language is English again');

    m.q('[data-theme-value="dark"]').click();
    equal(document.documentElement.getAttribute('data-theme'), 'dark', 'dark theme');
    equal(m.q('[data-theme-value="dark"]').getAttribute('aria-pressed'), 'true', 'dark is pressed');
    equal(kept.get('pentomino:v1:theme'), 'dark', 'the theme is remembered');
    m.q('[data-theme-value="high-contrast"]').click();
    equal(document.documentElement.getAttribute('data-theme'), 'high-contrast', 'high contrast');
  } finally {
    document.documentElement.removeAttribute('data-theme');
    m.q('[data-lang="en"]').click();
    m.player.destroy();
  }
});

await check('no CSP violations and no remote requests', async () => {
  equal(violations.length, 0, `violations: ${violations.join('; ')}`);
  const remote = performance.getEntriesByType('resource').filter((e) => !e.name.startsWith(location.origin));
  equal(remote.length, 0, `remote requests: ${remote.map((e) => e.name).join(', ')}`);
});

const failed = results.filter((r) => !r.ok);
const list = document.getElementById('results');
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.ok ? '' : ` — ${r.error}`}`;
  list?.append(li);
}
const summary = document.getElementById('summary');
if (summary) {
  summary.textContent = `${results.length - failed.length}/${results.length} passed`;
}
document.documentElement.dataset.result = failed.length === 0 ? 'pass' : 'fail';
document.documentElement.dataset.summary = JSON.stringify({ total: results.length, failed: failed.map((r) => `${r.name}: ${r.error}`.slice(0, 600)) });
