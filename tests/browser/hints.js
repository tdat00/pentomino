// @ts-check
// Browser regression harness for T25 (proven hints, reveal, revealed marker and
// version 2 progress). It mounts the real player with injected storage and the
// real hint worker (module worker, `solveFirst` task), drives the toolbar buttons
// and dialogs, and writes a pass/fail list into the page and data-summary on
// <html>. Developer fixture, not deployed.

import { validatePack } from '../../core/engine/pack.js';
import { createStorage } from '../../core/browser/storage.js';
import { mountPlayer } from '../../player/app.js';
import { packHash } from './pack-link.js';

/** @typedef {import('../../core/engine/types.js').Pose} Pose */

const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
const mounted = /** @type {Array<{ destroy: () => void }>} */ ([]);
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
  for (const player of mounted.splice(0)) {
    try {
      player.destroy();
    } catch {
      // already destroyed
    }
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
  assert(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
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
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for ${label}`);
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const tick = async () => {
  await frame();
  await frame();
};

const sample = JSON.parse(await (await fetch('../../player/samples/sample-pack.json')).text());
const handAuthored = JSON.parse(await (await fetch('../fixtures/hand-authored-pack.json')).text());

/**
 * @param {unknown} pack
 * @returns {any}
 */
function validated(pack) {
  const checked = validatePack(pack);
  if (!checked.ok) {
    throw new Error(`fixture invalid: ${checked.issues[0].message}`);
  }
  return checked.value;
}

/**
 * The T11 board and pieces with clue A only; J is a movable piece and no answer is stored,
 * so every hint has to be proven by the worker.
 */
function regressionPack() {
  const pack = structuredClone(handAuthored);
  const solution = pack.puzzles[0].solution;
  pack.puzzles[0].clues = [pack.puzzles[0].clues[0]];
  delete pack.puzzles[0].solution;
  return { pack: validated(pack), solution: /** @type {Pose[]} */ (solution) };
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
 * @param {{ pack: unknown, adapter?: ReturnType<typeof memoryAdapter>, reducedMotion?: boolean, createHintPool?: () => any }} o
 */
async function mount(o) {
  const root = document.createElement('div');
  root.className = 'stage-root';
  root.style.position = 'fixed';
  root.style.left = '0';
  root.style.top = '0';
  root.style.width = '100vw';
  root.style.height = '100vh';
  root.style.zIndex = '5';
  root.style.background = '#f3f1ea';
  document.body.append(root);
  const adapter = o.adapter ?? memoryAdapter();
  const storage = createStorage(adapter, () => Date.now());
  const location = { hash: await packHash(validated(o.pack)), pathname: '/player/', search: '' };
  const player = mountPlayer(root, {
    storage,
    location,
    history: {
      replaceState: (_s, _t, url) => {
        location.hash = url.startsWith('#') ? url : '';
      },
    },
    baseUrl: new URL('../../player/', document.baseURI),
    createPool: () => ({ beginRequest() {}, endRequest() {}, close() {}, run: () => new Promise(() => {}) }),
    createHintPool: o.createHintPool,
    listenHashChange: false,
    reducedMotion: o.reducedMotion ?? false,
    saveDelayMs: 20,
  });
  await player.ready;
  await tick();
  /** @param {string} sel @returns {HTMLElement} */
  const q = (sel) => {
    const found = /** @type {HTMLElement | null} */ (root.querySelector(sel));
    if (!found) {
      throw new Error(`missing ${sel}`);
    }
    return found;
  };
  const game = () => /** @type {import('../../core/engine/game.js').GameState} */ (player.store.getState().game);
  const live = () => q('[data-host="live"]').textContent ?? '';
  mounted.push(player);
  return { root, player, adapter, storage, q, game, live, play: player.play, store: player.store, hints: player.hints };
}

/** @typedef {Awaited<ReturnType<typeof mount>>} Mounted */

/**
 * @param {Mounted} m
 * @param {Pose[]} poses
 */
function place(m, poses) {
  for (const pose of poses) {
    assert(m.play.apply({ type: 'place', pose }), `placing ${pose.piece}`);
  }
}

/** @param {Pose[]} solution @param {string} id @returns {Pose} */
const at = (solution, id) => /** @type {Pose} */ (solution.find((p) => p.piece === id));
const WRONG_B = /** @type {Pose} */ ({ piece: 'B', x: 1, y: 0, turn: 1, mirrored: false });

/** @param {Mounted} m */
const saved = (m) => {
  const fp = m.store.getState().fingerprints[0];
  return m.storage.loadProgress(fp);
};

/** @param {Mounted} m @param {number} [ms] */
const hintDone = (m, ms) => waitFor(() => !['working'].includes(m.hints.getState().phase), 'the hint check to finish', ms);

await check('a hint is proven by the worker, previewed, applied as one undoable action and counted', async () => {
  const { pack, solution } = regressionPack();
  const m = await mount({ pack });
  place(m, [at(solution, 'E'), at(solution, 'H')]);
  const hint = m.q('[data-action="hint"]');
  assert(hint instanceof HTMLButtonElement && !hint.disabled, 'the Hint button is an enabled button');
  hint.focus();
  equal(document.activeElement, hint, 'the Hint button takes the keyboard focus');
  hint.click();
  await waitFor(() => m.hints.getState().phase === 'hint', 'a proven hint');
  const marks = m.hints.getState().marks;
  equal(marks?.kind, 'place', 'a compatible placement');
  assert(m.root.querySelectorAll('.pm-hint-marks .pm-hint-mark').length === marks?.cells.length, 'the cells are outlined');
  assert(m.root.querySelector('.pm-ghost, [data-valid="true"]') !== null, 'the piece is previewed');
  equal(m.game().placed.size, 2, 'showing the hint places nothing');
  equal(m.game().hintsUsed, 1, 'the hint is counted');
  await waitFor(() => m.live().startsWith('Hint: piece'), 'the hint to be announced');
  const before = m.game().history.length;
  const placeIt = m.q('[data-action="hint-place"]');
  assert(!placeIt.hidden, 'Place it is offered');
  placeIt.click();
  await tick();
  equal(m.game().placed.size, 3, 'Place it puts the piece down');
  equal(m.game().history.length, before + 1, 'one undoable action');
  m.q('[data-action="undo"]').click();
  await tick();
  equal(m.game().placed.size, 2, 'undo takes it back');
  await waitFor(() => saved(m)?.hintsUsed === 1, 'the saved counter');
  equal(saved(m)?.v, 2, 'progress is saved as version 2');
});

await check('the repairing hint outlines the first wrong piece and removal is undoable', async () => {
  const { pack, solution } = regressionPack();
  const m = await mount({ pack });
  place(m, [WRONG_B, ...['E', 'F', 'G', 'H', 'I', 'J'].map((id) => at(solution, id))]);
  m.q('[data-action="hint"]').click();
  await waitFor(() => m.hints.getState().phase === 'hint', 'a repairing hint', 20000);
  equal(m.hints.getState().marks?.kind, 'remove', 'a removal');
  equal(m.hints.getState().marks?.piece, 'B', 'the wrong first piece, not the last move');
  assert(m.q('[data-host="hint"] [data-role="hint-text"]').textContent?.includes('other piece'), 'the text says what is proven');
  const removeIt = m.q('[data-action="hint-remove"]');
  assert(!removeIt.hidden && m.q('[data-action="hint-place"]').hidden, 'Remove it is offered instead of Place it');
  removeIt.click();
  await tick();
  equal(m.game().placed.has('B'), false, 'B is removed');
  equal(m.game().placed.size, 6, 'every other piece stays');
});

await check('a stale result is dropped when the player moves meanwhile', async () => {
  const { pack, solution } = regressionPack();
  /** @type {((value: unknown) => void) | null} */
  let release = null;
  const m = await mount({
    pack,
    createHintPool: () => ({
      beginRequest() {},
      endRequest() {},
      close() {},
      cancelAll() {
        release?.(Promise.reject(Object.assign(new Error('cancelled'), { name: 'AbortError' })));
      },
      run: () => new Promise((resolve) => {
        release = resolve;
      }),
    }),
  });
  place(m, [at(solution, 'E')]);
  m.q('[data-action="hint"]').click();
  await waitFor(() => m.hints.getState().phase === 'working', 'the check to start');
  assert(!m.q('[data-action="hint-cancel"]').hidden, 'Cancel is offered while checking');
  place(m, [at(solution, 'H')]);
  await tick();
  equal(m.hints.getState().phase, 'idle', 'the running check was discarded');
  equal(m.game().hintsUsed, 0, 'nothing was counted');
  equal(m.root.querySelectorAll('.pm-hint-mark').length, 0, 'no marks');
});

await check('reveal asks first, cancelling changes nothing, confirming marks the puzzle revealed and never celebrates', async () => {
  const { pack, solution } = regressionPack();
  const m = await mount({ pack });
  place(m, [at(solution, 'E')]);
  const clues = JSON.stringify(pack.puzzles[0].clues);
  // The page has no Show solution button; the reveal flow is driven through the hint panel.
  const reveal = { click: () => m.player.hintPanel.askReveal() };
  reveal.click();
  const dialog = /** @type {HTMLDialogElement} */ (m.q('dialog.pm-reveal'));
  assert(dialog.open, 'a confirmation dialog opens');
  equal(m.game().revealed, false, 'nothing changed yet');
  m.q('dialog.pm-reveal [data-action="confirm-cancel"]').click();
  await waitFor(() => !dialog.open, 'the dialog to close');
  await waitFor(() => m.live().startsWith('Reveal cancelled'), 'the cancellation to be announced');
  equal(m.game().placed.size, 1, 'a cancelled reveal changes nothing');
  equal(m.game().revealed, false, 'still not revealed');

  reveal.click();
  m.q('dialog.pm-reveal [data-action="confirm-ok"]').click();
  await waitFor(() => m.game().revealed, 'the reveal', 20000);
  await tick();
  const g = m.game();
  equal(g.solved, true, 'the board is complete');
  equal(g.placed.size, 9, 'every movable piece is placed');
  equal(JSON.stringify(m.store.getState().pack?.puzzles[0].clues), clues, 'the clues are preserved');
  assert(!m.player.winDialog.isOpen(), 'no victory dialog');
  assert(!m.q('.game').classList.contains('is-celebrating'), 'no celebration');
  assert(m.q('[data-action="results"]').hidden, 'no Results button for a revealed puzzle');
  assert(m.q('[data-host="hint"] [data-role="hint-text"]').textContent?.includes('not solved'), 'the status line says not solved');
  assert(!m.q('[data-action="hint-replay"]').hidden, 'Replay is offered');
  await waitFor(() => saved(m)?.revealed === true, 'the revealed record');
  equal(m.store.getState().statuses[0], 'revealed', 'the puzzle list status is revealed');

  m.q('[data-action="undo"]').click();
  await tick();
  equal(m.game().placed.size, 1, 'undo restores the player\'s own pieces');
  equal(m.game().revealed, true, 'but the session stays revealed');

  m.q('[data-action="hint-replay"]').click();
  await tick();
  equal(m.game().revealed, false, 'Replay is a fresh unassisted session');
  equal(m.game().placed.size, 0, 'with an empty board');
  equal(saved(m), null, 'and no saved record');
});

await check('reveal over an unsolvable position needs an explicit reset-then-reveal', async () => {
  const { pack, solution } = regressionPack();
  const m = await mount({ pack });
  place(m, [WRONG_B, ...['E', 'F', 'G', 'H', 'I', 'J'].map((id) => at(solution, id))]);
  m.player.hintPanel.askReveal();
  m.q('dialog.pm-reveal [data-action="confirm-ok"]').click();
  const reset = /** @type {HTMLDialogElement} */ (m.q('dialog.pm-reveal-reset'));
  await waitFor(() => reset.open, 'the reset-then-reveal question', 20000);
  equal(m.game().placed.size, 7, 'nothing is overwritten silently');
  m.q('dialog.pm-reveal-reset [data-action="confirm-cancel"]').click();
  await waitFor(() => !reset.open, 'the question to close');
  equal(m.game().placed.size, 7, 'declining keeps the board');
  equal(m.game().revealed, false, 'and the puzzle unrevealed');
  await waitFor(() => m.live().startsWith('Reveal cancelled'), 'the cancellation to be announced');

  m.player.hintPanel.askReveal();
  m.q('dialog.pm-reveal [data-action="confirm-ok"]').click();
  await waitFor(() => reset.open, 'the question again', 20000);
  m.q('dialog.pm-reveal-reset [data-action="confirm-ok"]').click();
  await waitFor(() => m.game().revealed, 'the reveal after the reset', 20000);
  equal(m.game().solved, true, 'complete');
  assert(!m.player.winDialog.isOpen(), 'no victory dialog');
  m.q('[data-action="undo"]').click();
  await tick();
  equal(m.game().placed.size, 7, 'the player can get the moves back');
});

await check('motion: the hint pulse is off in reduced-motion mode and on otherwise', async () => {
  const { pack, solution } = regressionPack();
  for (const reduced of [true, false]) {
    const m = await mount({ pack, reducedMotion: reduced });
    place(m, [at(solution, 'E')]);
    m.q('[data-action="hint"]').click();
    await waitFor(() => m.hints.getState().phase === 'hint', 'a hint');
    const layer = m.q('.pm-hint-marks');
    equal(layer.dataset.pulse, String(!reduced), `pulse flag, reduced=${reduced}`);
    const name = getComputedStyle(m.q('.pm-hint-mark')).animationName;
    if (reduced) {
      equal(name, 'none', 'no animation with reduced motion');
    }
    mounted.pop()?.destroy();
    m.root.remove();
  }
});

await check('keyboard and status: toolbar buttons are named, ordered and announced', async () => {
  const { pack, solution } = regressionPack();
  const m = await mount({ pack });
  const hintButton = m.q('[data-action="hint"]');
  assert(hintButton.tagName === 'BUTTON' && hintButton.getAttribute('aria-label') !== null && (hintButton.textContent ?? '').trim() === '', 'Hint is an icon button with an accessible name');
  assert(hintButton.closest('.game-actions') !== null && hintButton.getBoundingClientRect().height >= 35.5, 'Hint sits with Undo, Redo and Replay at their size');
  assert(m.root.querySelector('[data-action="reveal"]') === null, 'there is no Show solution button');
  place(m, [at(solution, 'E')]);
  m.q('[data-action="hint"]').click();
  await waitFor(() => m.live().includes('Checking') || m.hints.getState().phase === 'hint', 'a progress or result announcement');
  await waitFor(() => m.live().startsWith('Hint:'), 'the result announcement');
  const placeIt = m.q('[data-action="hint-place"]');
  placeIt.focus();
  equal(document.activeElement, placeIt, 'Place it is reachable by keyboard');
  assert(m.q('dialog.pm-reveal').getAttribute('aria-labelledby') !== null, 'the confirmation is labelled');
});

await check('version 2 progress: a version 1 record resumes; hints and reveal survive a reload', async () => {
  const { pack, solution } = regressionPack();
  const first = await mount({ pack });
  const fp = first.store.getState().fingerprints[0];
  const key = `pentomino:v1:progress:${fp}`;
  const placements = [at(solution, 'E'), at(solution, 'H')];
  const v1 = { v: 1, placements, elapsedMs: 83000, moves: 4, solved: false, updatedAt: Date.now() };
  first.player.destroy();
  mounted.pop();
  first.root.remove();
  const adapter = memoryAdapter({ [key]: JSON.stringify(v1) });
  const m = await mount({ pack, adapter });
  equal(m.game().placed.size, 2, 'the version 1 placements are restored');
  equal(m.game().elapsedMs, 83000, 'with their time');
  equal(m.game().moves, 4, 'and moves');
  equal(m.game().revealed, false, 'not revealed');
  equal(m.game().hintsUsed, 0, 'no hints');
  m.q('[data-action="hint"]').click();
  await waitFor(() => m.hints.getState().phase === 'hint', 'a hint');
  m.player.play.flush();
  const raw = JSON.parse(adapter.map.get(key) ?? 'null');
  equal(raw?.v, 2, 'saved as version 2');
  equal(raw?.hintsUsed, 1, 'the hint is saved');
  equal(raw?.elapsedMs >= 83000, true, 'the time is kept');
  m.player.hintPanel.askReveal();
  m.q('dialog.pm-reveal [data-action="confirm-ok"]').click();
  await waitFor(() => m.game().revealed, 'the reveal', 20000);
  m.player.play.flush();
  m.player.destroy();
  mounted.pop();
  m.root.remove();
  const again = await mount({ pack, adapter });
  equal(again.game().revealed, true, 'a restored revealed game stays revealed');
  equal(again.game().hintsUsed, 1, 'with its counter');
  equal(again.store.getState().statuses[0], 'revealed', 'the status is revealed');
  assert(!again.player.winDialog.isOpen(), 'no victory dialog on restore');
  assert(/revealed/i.test(again.q('[data-host="hint"] [data-role="hint-text"]').textContent ?? ''), 'the hint box marks the puzzle as revealed');
});

await check('the shipped sample still solves normally and earns the win', async () => {
  const m = await mount({ pack: sample });
  const puzzle = m.store.getState().pack?.puzzles[0];
  const clued = new Set(puzzle?.clues.map((c) => c.piece));
  const poses = /** @type {Pose[]} */ (puzzle?.solution).filter((p) => !clued.has(p.piece));
  m.q('[data-action="hint"]').click();
  await waitFor(() => m.hints.getState().phase === 'hint', 'a hint on the empty sample');
  m.q('[data-action="hint-dismiss"]').click();
  place(m, poses);
  await waitFor(() => m.player.winDialog.isOpen(), 'the ordinary victory dialog');
  equal(m.game().revealed, false, 'an earned win');
  equal(m.q('.win-hints').textContent, '1', 'the dialog lists the hint');
});

await check('no content-security-policy violations', async () => {
  equal(violations.length, 0, `violations: ${violations.join('; ')}`);
});

const failed = results.filter((r) => !r.ok);
const list = document.getElementById('results');
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.error ? ` — ${r.error}` : ''}`;
  list?.append(li);
}
const summary = document.getElementById('summary');
if (summary) {
  summary.textContent = `${results.length - failed.length}/${results.length} passed`;
}
document.documentElement.dataset.summary = JSON.stringify({ total: results.length, failed: failed.map((r) => `${r.name}: ${r.error}`.slice(0, 700)) });
document.documentElement.dataset.result = failed.length === 0 && results.length > 0 ? 'pass' : 'fail';
