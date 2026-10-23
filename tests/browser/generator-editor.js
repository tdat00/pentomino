// @ts-check
// Browser regression harness for T17 (generator board editor, levels and settings). It drives
// the real panels with synthetic pointer, keyboard and form events, writes a pass/fail list into
// the page and sets data-result on <html>. It is a developer fixture, not deployed.

import { activeCount, boardToRows, preset, rectangle } from '../../core/engine/board.js';
import { packBoard, parsePack } from '../../core/engine/pack.js';
import { createGeneratorApp } from '../../generator/app.js';
import { mountBoardEditor } from '../../generator/ui/board-editor.js';
import { mountLevelPanel } from '../../generator/ui/level-panel.js';
import {
  acceptSet, createGeneratorStore, describeBoard, loadGeneratorState, setCell, withBoard,
} from '../../generator/state.js';

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

const sandbox = /** @type {HTMLElement} */ (document.getElementById('sandbox'));
const sleep = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fixture = await (await fetch('../fixtures/generated-sample-pack.json')).text();
const parsed = parsePack(fixture);
assert(parsed.ok, 'fixture pack parses');
const samplePack = /** @type {import('../../core/engine/types.js').Pack} */ (parsed.ok ? parsed.value : null);
/** @type {import('../../core/engine/types.js').PieceSet} */
const sampleSet = { board: packBoard(samplePack), pieces: samplePack.pieces, witness: samplePack.witness ?? null, carving: 'flat', macroRegion: null };
const samplePuzzles = /** @type {any[]} */ (samplePack.puzzles);

/**
 * @param {Partial<import('../../generator/state.js').GeneratorState>} [state]
 * @param {{ phone?: boolean, handlers?: Record<string, any>, seeds?: string[] }} [o]
 */
function mount(state = {}, o = {}) {
  const wrap = document.createElement('div');
  wrap.style.width = '520px';
  const boardHost = document.createElement('div');
  const levelHost = document.createElement('div');
  wrap.append(boardHost, levelHost);
  sandbox.append(wrap);
  const store = createGeneratorStore(state);
  const hardware = { phone: o.phone === true };
  const handlers = o.handlers ?? {};
  const seeds = o.seeds ?? ['AAAA-BBBB-CCCC', 'DDDD-EEEE-FFFF', 'GGGG-HHHH-JJJJ'];
  let seedIndex = 0;
  /** @type {string[]} */
  const warnings = [];
  const ctx = {
    wrap, store, warnings,
    /** @type {ReturnType<typeof mountBoardEditor>} */ editor: /** @type {any} */ (null),
    /** @type {ReturnType<typeof mountLevelPanel>} */ level: /** @type {any} */ (null),
    destroy() {
      ctx.editor.destroy();
      ctx.level.destroy();
      store.destroy();
      wrap.remove();
    },
  };
  ctx.editor = mountBoardEditor(boardHost, { store, hardware, notify: (m) => warnings.push(m) });
  ctx.level = mountLevelPanel(levelHost, { store, hardware, getHandlers: () => handlers, random: () => seeds[seedIndex++ % seeds.length] });
  return ctx;
}

/**
 * @template T
 * @param {Partial<import('../../generator/state.js').GeneratorState>} state
 * @param {{ phone?: boolean, handlers?: Record<string, any>, seeds?: string[] }} o
 * @param {(ctx: ReturnType<typeof mount>) => T | Promise<T>} fn
 */
async function withEditor(state, o, fn) {
  const ctx = mount(state, o);
  try {
    return await fn(ctx);
  } finally {
    ctx.destroy();
  }
}

/**
 * @param {ReturnType<typeof mount>} ctx
 * @param {string} selector
 * @returns {HTMLElement}
 */
function q(ctx, selector) {
  const found = /** @type {HTMLElement | null} */ (ctx.wrap.querySelector(selector));
  assert(found, `missing ${selector}`);
  return /** @type {HTMLElement} */ (found);
}

/**
 * @param {ReturnType<typeof mount>} ctx
 * @param {number} x
 * @param {number} y
 * @returns {[number, number]}
 */
function center(ctx, x, y) {
  const group = /** @type {SVGGraphicsElement} */ (ctx.editor.view.svg.querySelector('.pm-board-group'));
  const point = new DOMPoint(x + 0.5, y + 0.5).matrixTransform(/** @type {DOMMatrix} */ (group.getScreenCTM()));
  return [point.x, point.y];
}

/**
 * @param {string} type
 * @param {EventTarget} target
 * @param {[number, number]} at
 */
function pointer(type, target, at) {
  target.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, clientX: at[0], clientY: at[1], pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
  }));
}

/**
 * One painting gesture across logical cells.
 * @param {ReturnType<typeof mount>} ctx
 * @param {Array<[number, number]>} cells
 */
function drag(ctx, cells) {
  const surface = ctx.editor.view.surface;
  pointer('pointerdown', surface, center(ctx, cells[0][0], cells[0][1]));
  for (const cell of cells.slice(1)) {
    pointer('pointermove', surface, center(ctx, cell[0], cell[1]));
  }
  const last = cells[cells.length - 1];
  pointer('pointerup', surface, center(ctx, last[0], last[1]));
}

/**
 * @param {ReturnType<typeof mount>} ctx
 * @param {string} selector
 * @param {string} value
 * @param {string} [event]
 */
function setField(ctx, selector, value, event = 'change') {
  const input = /** @type {HTMLInputElement | HTMLSelectElement} */ (q(ctx, selector));
  input.value = value;
  input.dispatchEvent(new Event(event, { bubbles: true }));
}

/**
 * @param {ReturnType<typeof mount>} ctx
 * @param {string} selector
 */
function toggle(ctx, selector) {
  const input = /** @type {HTMLInputElement} */ (q(ctx, selector));
  input.checked = !input.checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const area = (/** @type {ReturnType<typeof mount>} */ ctx) => activeCount(ctx.store.getState().board);
const status = (/** @type {ReturnType<typeof mount>} */ ctx) => q(ctx, '[data-role="board-status"]').textContent;

for (const angle of [0, 45, 90, 315]) {
  await check(`painting, undo and reactivation work at ${angle} degrees`, () => withEditor({ rotation: angle }, {}, (ctx) => {
    equal(area(ctx), 60, 'default area');
    drag(ctx, [[2, 2], [3, 2], [4, 2], [4, 3]]);
    equal(area(ctx), 56, 'four cells blocked by one gesture');
    equal(ctx.editor.history.size(), 1, 'one gesture is one undo step');
    // A drag that starts on a blocked cell unblocks everything it crosses, including active cells' state.
    drag(ctx, [[3, 2], [3, 3], [4, 3]]);
    equal(area(ctx), 58, 'unblock paints the new state of the first cell');
    equal(ctx.store.getState().board.active[2 * 10 + 3], 1, 'blocked cell reactivated');
    equal(ctx.editor.history.size(), 2, 'two gestures, two steps');
    ctx.editor.undo();
    equal(area(ctx), 56, 'undo restores the previous gesture');
    ctx.editor.undo();
    equal(area(ctx), 60, 'undo restores the board');
    assert(!ctx.editor.history.canUndo(), 'nothing left to undo');
    equal(ctx.store.getState().rotation, angle, 'painting never changes the stored angle');
  }));
}

await check('every blocked cell looks the same in the editor, inside the board or at its edge', () => withEditor({}, {}, (ctx) => {
  drag(ctx, [[4, 3]]);
  drag(ctx, [[0, 0]]);
  const svg = ctx.editor.view.svg;
  equal([svg.querySelectorAll('.pm-guide').length, svg.querySelectorAll('.pm-cross').length, svg.querySelectorAll('.pm-hole').length], [2, 2, 0], 'two dashed cells with a cross, no dark hole');
}));

await check('a blocked exterior guide of the Heart can be reactivated at 45 degrees', () => withEditor({}, {}, (ctx) => {
  setField(ctx, '[data-field="preset"]', 'heart');
  const state = ctx.store.getState();
  equal(activeCount(state.board), 75, 'Heart 75 cells');
  equal(state.rotation, 45, 'Heart is shown at 45 degrees');
  drag(ctx, [[7, 2]]);
  equal(area(ctx), 76, 'an exterior blocked cell was reactivated');
  ctx.editor.undo();
  equal(area(ctx), 75, 'undone');
}));

await check('presets give the specified counts and rotations', () => withEditor({}, {}, (ctx) => {
  const expected = [['heart', 75, 45], ['diamond', 64, 45], ['cross', 45, 0], ['ring', 60, 0], ['rectangle', 64, 0]];
  for (const [id, cells, rotation] of expected) {
    setField(ctx, '[data-field="preset"]', String(id));
    const state = ctx.store.getState();
    equal([id, activeCount(state.board), state.rotation], [id, cells, rotation], `preset ${id}`);
  }
  for (const sel of ['[data-field="preset-size"]', '[data-field="round-lobes"]']) {
    assert(ctx.wrap.querySelector(sel) === null, `${sel} is gone`);
  }
  const ring = preset('ring', { n: 8 }).board;
  setField(ctx, '[data-field="preset"]', 'ring');
  equal(boardToRows(ctx.store.getState().board), boardToRows(ring), 'Ring shape');
}));

await check('a preset or resize replaces the board without asking, even after edits', () => withEditor({}, {}, (ctx) => {
  setField(ctx, '[data-field="preset"]', 'diamond');
  drag(ctx, [[0, 0]]);
  const before = ctx.store.getState().board;
  setField(ctx, '[data-field="preset"]', 'cross');
  assert(ctx.store.getState().board !== before, 'preset applied');
  equal(/** @type {HTMLSelectElement} */ (q(ctx, '[data-field="preset"]')).value, 'cross', 'select follows');
  ctx.editor.undo();
  equal(/** @type {HTMLInputElement} */ (q(ctx, '[data-field="columns"]')).value, '8', 'preset undone');
  const sized = ctx.store.getState().board;
  setField(ctx, '[data-field="columns"]', '12');
  assert(ctx.store.getState().board !== sized, 'resize applied');
  equal(ctx.store.getState().board.width, 12, 'columns changed');
}));

await check('resize keeps cells in bounds and activates new cells', () => withEditor({}, {}, (ctx) => {
  setField(ctx, '[data-field="columns"]', '12');
  equal([ctx.store.getState().board.width, area(ctx)], [12, 72], 'wider board, new cells active');
  drag(ctx, [[1, 1]]);
  setField(ctx, '[data-field="rows"]', '4');
  const board = ctx.store.getState().board;
  equal([board.width, board.height, board.active[1 * 12 + 1]], [12, 4, 0], 'blocked cell kept');
  setField(ctx, '[data-field="rows"]', '2');
  equal(ctx.store.getState().board.height, 4, 'rows below 3 are refused');
  assert(ctx.warnings.length === 1, 'the refusal is explained');
  ctx.editor.undo();
  equal(ctx.store.getState().board.height, 6, 'resize can be undone');
}));

await check('Ctrl+Z on the board undoes the last edit', () => withEditor({}, {}, (ctx) => {
  drag(ctx, [[2, 2]]);
  equal(area(ctx), 59, 'one cell blocked');
  ctx.editor.view.surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
  equal(area(ctx), 60, 'undone from the keyboard');
}));

await check('the board view zooms with the wheel and the buttons, and a drag moves the view only in move mode', () => withEditor({}, {}, (ctx) => {
  const { view } = ctx.editor;
  const surface = view.surface;
  const box = surface.getBoundingClientRect();
  const at = /** @type {[number, number]} */ ([box.left + box.width / 2, box.top + box.height / 2]);
  const fitted = view.getState().cellPx;
  const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -200, clientX: at[0], clientY: at[1] });
  surface.dispatchEvent(wheel);
  assert(wheel.defaultPrevented && view.getState().cellPx > fitted, 'the wheel zooms in and keeps the page still');
  surface.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 800, clientX: at[0], clientY: at[1] }));
  assert(view.getState().cellPx < fitted, 'scrolling the other way zooms out');
  q(ctx, '[data-action="zoom-in"]').click();
  const zoomedIn = view.getState().cellPx;
  q(ctx, '[data-action="zoom-out"]').click();
  assert(view.getState().cellPx < zoomedIn, 'the zoom buttons work');
  q(ctx, '[data-action="zoom-fit"]').click();
  assert(Math.abs(view.getState().cellPx - fitted) <= 1, 'fit restores the fitted size');

  view.setZoom(80);
  const toggleButton = q(ctx, '[data-action="pan-toggle"]');
  equal(toggleButton.getAttribute('aria-pressed'), 'false', 'move mode starts off');
  drag(ctx, [[0, 0], [1, 0]]);
  equal(area(ctx), 58, 'without move mode a drag paints');
  toggleButton.click();
  equal(toggleButton.getAttribute('aria-pressed'), 'true', 'move mode is on');
  const left = surface.scrollLeft;
  pointer('pointerdown', surface, at);
  pointer('pointermove', surface, [at[0] - 60, at[1]]);
  pointer('pointerup', surface, [at[0] - 60, at[1]]);
  equal(area(ctx), 58, 'in move mode a drag paints nothing');
  assert(surface.scrollLeft > left, 'and moves the view');
  toggleButton.click();
  drag(ctx, [[5, 3]]);
  equal(area(ctx), 57, 'painting works again once move mode is off');
}));

await check('the editor has no Trim, Undo, Reset or Edit unrotated controls and no view label', () => withEditor({}, {}, (ctx) => {
  for (const sel of ['[data-action="trim"]', '[data-action="undo"]', '[data-action="reset"]', '[data-field="edit-unrotated"]', '[data-role="view-angle"]', '.control-label']) {
    assert(ctx.wrap.querySelector(sel) === null, `${sel} is gone`);
  }
  assert(ctx.wrap.querySelector('[data-action="view-left"]') !== null && ctx.wrap.querySelector('[data-action="view-right"]') !== null, 'the rotate buttons stay');
}));

await check('view rotation never changes the active count, pieces or existing puzzles', () => withEditor({}, {}, (ctx) => {
  ctx.store.update((s) => ({ ...acceptSet(s, { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'demo' }), puzzles: samplePuzzles }));
  const before = ctx.store.getState();
  for (let i = 0; i < 9; i += 1) {
    q(ctx, '[data-action="view-left"]').click();
  }
  equal(ctx.store.getState().rotation, 45, '9 x left 45 = 45 degrees');
  for (let i = 0; i < 2; i += 1) {
    q(ctx, '[data-action="view-right"]').click();
  }
  const after = ctx.store.getState();
  equal(after.rotation, 315, 'right 45 subtracts, modulo 360');
  assert(after.set === before.set && after.puzzles === before.puzzles && after.board === before.board, 'identity kept');
  equal([after.stale, area(ctx)], [false, 60], 'nothing invalidated');
}));

await check('the first board edit after a set makes it stale without asking, and the set keeps its board', () => withEditor({}, {}, (ctx) => {
  ctx.store.update((s) => ({ ...acceptSet(s, { set: sampleSet, calibration: null, setSeed: 'demo' }), puzzles: samplePuzzles }));
  drag(ctx, [[0, 0], [1, 0]]);
  const state = ctx.store.getState();
  equal([area(ctx), state.stale], [58, true], 'the edit goes ahead and the set is stale');
  equal([activeCount(state.set?.board ?? rectangle(1, 1)), state.puzzles.length], [60, 3], 'old cards keep their board');
  assert(q(ctx, '[data-role="board-notices"]').textContent?.includes('Board changed — generate a new piece set.'), 'N-STALE is shown');
  drag(ctx, [[5, 5]]);
  ctx.editor.undo();
  ctx.editor.undo();
  equal(ctx.store.getState().stale, false, 'restoring the set board clears stale');
}));

await check('painting and settings are disabled while a job runs, rotation stays usable', () => withEditor({}, {}, (ctx) => {
  ctx.store.update({ job: { requestId: 1, revision: 'r', stage: 'carving', startedAt: 0 } });
  drag(ctx, [[2, 2]]);
  equal(area(ctx), 60, 'no painting');
  for (const sel of ['[data-field="columns"]', '[data-field="preset"]', '[data-field="keep-seed"]', '[data-action="generate-set"]', '[data-field="level"]']) {
    assert(/** @type {HTMLButtonElement} */ (q(ctx, sel)).disabled, `${sel} disabled during a job`);
  }
  q(ctx, '[data-action="view-left"]').click();
  equal(ctx.store.getState().rotation, 45, 'view rotation still works');
  ctx.store.update({ job: null });
  drag(ctx, [[2, 2]]);
  equal(area(ctx), 59, 'painting works again');
}));

await check('keyboard: arrows follow the view rotation and Space toggles the cursor cell', () => withEditor({}, {}, (ctx) => {
  const surface = ctx.editor.view.surface;
  surface.focus();
  const press = (/** @type {string} */ key) => surface.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  press('ArrowRight');
  press('ArrowDown');
  press(' ');
  equal(ctx.store.getState().board.active[1 * 10 + 1], 0, 'Space blocked (1,1)');
  press(' ');
  equal(ctx.store.getState().board.active[1 * 10 + 1], 1, 'Space unblocked it again');
  equal(ctx.editor.history.size(), 2, 'each keyboard toggle is an undo step');
  ctx.store.update({ rotation: 90 });
  press('ArrowRight');
  equal(/** @type {SVGRectElement} */ (ctx.editor.view.svg.querySelector('.pm-cursor')).getAttribute('y'), '2.04', 'at 90 degrees ArrowRight moves down the grid');
  for (let i = 0; i < 12; i += 1) {
    press('ArrowLeft');
  }
  assert(ctx.editor.view.svg.querySelector('.pm-cursor'), 'the cursor stays inside the board');
}));

await check('levels: a 60-cell board lists Very easy to Master in a dropdown and explains the rest', () => withEditor({}, {}, (ctx) => {
  const select = /** @type {HTMLSelectElement} */ (q(ctx, '[data-field="level"]'));
  equal([...select.options].map((o) => o.value), ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master'], 'offered at 60');
  assert(q(ctx, '[data-role="level-notices"]').textContent?.includes('Levels above Master need a larger board.'), 'N-LEVELS shown');
  equal(select.value, 'normal', 'default level selected');
  setField(ctx, '[data-field="level"]', 'expert');
  equal(ctx.store.getState().levelId, 'expert', 'level choice stored');
  equal(select.value, 'expert', 'the dropdown follows');
}));

await check('levels: 360 squares offer Hard to Hell 2 with the policy-derived count line', () => withEditor({}, {}, (ctx) => {
  setField(ctx, '[data-field="columns"]', '20');
  setField(ctx, '[data-field="rows"]', '18');
  equal(area(ctx), 360, '20 x 18');
  const offered = [.../** @type {HTMLSelectElement} */ (q(ctx, '[data-field="level"]')).options].map((o) => o.value);
  equal(offered, ['hard', 'expert', 'master', 'nightmare', 'hell-1', 'hell-2'], 'offered at 360');
  equal(ctx.store.getState().levelId, 'hard', 'the unavailable Normal moved to the nearest offered level');
  equal(q(ctx, '[data-role="count"]').textContent, 'Uses 16–18 pieces of 12–34 squares · about 38% pre-placed', 'count line');
  assert(q(ctx, '[data-role="board-notices"]').textContent?.includes('This board uses 16–18 pieces at Hard, about 38 % pre-placed.'), 'N-COUNT');
  assert(!q(ctx, '[data-role="board-notices"]').textContent?.includes('Large board'), '360 is not above the warning size');
  assert(q(ctx, '[data-role="level-notices"]').textContent?.includes('Levels below Hard need a smaller board.'), 'smaller-board reason');
}));

await check('device caps are explained: desktop 484, large boards 676 (experimental), phone 360', () => withEditor({}, {}, (ctx) => {
  setField(ctx, '[data-field="columns"]', '23');
  setField(ctx, '[data-field="rows"]', '22');
  assert(q(ctx, '[data-role="cannot-generate"]').textContent?.includes('This board has 506 playable squares; the limit on this device is 484.'), 'N-CAP');
  assert(/** @type {HTMLButtonElement} */ (q(ctx, '[data-action="generate-set"]')).disabled, 'Generate disabled above the cap');
  toggle(ctx, '[data-field="large-boards"]');
  equal(ctx.store.getState().largeBoards, true, 'opt-in stored in state');
  equal(status(ctx), '506 / 506 playable squares · connected', 'a 506-square board is valid once the cap becomes 676');
  const text = q(ctx, '[data-role="board-notices"]').textContent ?? '';
  assert(text.includes('Large board: generation can take up to 2 minutes.') && text.includes('Experimental: boards above 484 squares'), 'N-LARGE and N-EXPERIMENTAL');
}));

await check('a phone cannot use the desktop Large boards opt-in', () => withEditor({ largeBoards: true }, { phone: true }, (ctx) => {
  assert(/** @type {HTMLInputElement} */ (q(ctx, '[data-field="large-boards"]')).disabled, 'switch disabled');
  assert(!/** @type {HTMLInputElement} */ (q(ctx, '[data-field="large-boards"]')).checked, 'shown off');
  setField(ctx, '[data-field="columns"]', '19');
  setField(ctx, '[data-field="rows"]', '19');
  assert(q(ctx, '[data-role="cannot-generate"]').textContent?.includes('This board has 361 playable squares; the limit on this device is 360.'), 'phone cap 360');
}));

await check('an invalid board is not validated while editing; the piece-set step explains why it cannot generate', () => withEditor({}, {}, (ctx) => {
  const cannot = () => q(ctx, '[data-role="cannot-generate"]');
  assert(cannot().hidden, 'a valid board shows no explanation');
  setField(ctx, '[data-field="columns"]', '5');
  setField(ctx, '[data-field="rows"]', '5');
  equal(status(ctx), 'Playable squares: 25', 'the editor only counts squares');
  assert(!cannot().hidden && cannot().textContent?.startsWith('Cannot generate a piece set for the selected board.'), 'the explanation appears');
  assert(cannot().textContent?.includes('A board needs at least 30 playable squares to generate puzzles.'), 'N-SMALL is the reason');
  assert(/** @type {HTMLButtonElement} */ (q(ctx, '[data-action="generate-set"]')).disabled, 'cannot generate');
  setField(ctx, '[data-field="columns"]', '11');
  setField(ctx, '[data-field="rows"]', '3');
  drag(ctx, [[5, 0], [5, 1], [5, 2]]);
  assert(cannot().textContent?.includes('separate regions'), 'disconnected reported');
  assert(ctx.editor.view.svg.querySelectorAll('.pm-invalid').length === 0, 'no cell is flagged while editing');
}));

await check('Keep seed: typing turns it on, the dice draws now, Generate draws or reuses', () => {
  /** @type {any[]} */
  const requests = [];
  return withEditor({}, { handlers: { onGenerateSet: (/** @type {any} */ r) => requests.push(r) } }, (ctx) => {
    const seed = /** @type {HTMLInputElement} */ (q(ctx, '[data-field="seed"]'));
    const keep = /** @type {HTMLInputElement} */ (q(ctx, '[data-field="keep-seed"]'));
    equal(keep.checked, false, 'Keep seed is off by default');
    q(ctx, '[data-action="generate-set"]').click();
    equal([requests.length, seed.value, requests[0].seed], [1, 'AAAA-BBBB-CCCC', 'AAAA-BBBB-CCCC'], 'off: a fresh random seed replaces the field first');
    equal(keep.checked, false, 'still off');
    q(ctx, '[data-action="generate-set"]').click();
    equal(requests[1].seed, 'DDDD-EEEE-FFFF', 'off: every request draws a new seed');
    seed.value = '  my seed ';
    seed.dispatchEvent(new Event('input', { bubbles: true }));
    equal(keep.checked, true, 'typing turns Keep seed on');
    q(ctx, '[data-action="generate-set"]').click();
    q(ctx, '[data-action="generate-set"]').click();
    equal([requests[2].seed, requests[3].seed, seed.value], ['my seed', 'my seed', 'my seed'], 'on: the text is reused unchanged (trimmed)');
    q(ctx, '[data-action="roll-seed"]').click();
    equal([seed.value, keep.checked], ['GGGG-HHHH-JJJJ', true], 'the dice draws immediately and keeps the switch');
    seed.value = '';
    seed.dispatchEvent(new Event('input', { bubbles: true }));
    toggle(ctx, '[data-field="keep-seed"]');
    assert(q(ctx, '[data-role="seed-error"]').textContent, 'an empty kept seed is explained');
    q(ctx, '[data-action="generate-set"]').click();
    equal(requests.length, 4, 'no request with an invalid seed');
  });
});

await check('Generate stays disabled until the job code registers its handler', () => withEditor({}, {}, (ctx) => {
  const button = /** @type {HTMLButtonElement} */ (q(ctx, '[data-action="generate-set"]'));
  assert(button.disabled && button.title, 'disabled with a reason');
}));

await check('Require one solution warns only on large Hell boards; Omit solutions is stored', () => withEditor({}, {}, (ctx) => {
  setField(ctx, '[data-field="columns"]', '20');
  setField(ctx, '[data-field="rows"]', '18');
  setField(ctx, '[data-field="level"]', 'hell-1');
  equal(ctx.store.getState().levelId, 'hell-1', 'Hell 1 is offered at 360');
  assert(!q(ctx, '[data-role="level-notices"]').textContent?.includes('experimental'), 'no warning while Require is off');
  toggle(ctx, '[data-field="require-unique"]');
  assert(q(ctx, '[data-role="level-notices"]').textContent?.includes("On large Hell puzzles, 'Require one solution' is experimental and usually fails."), 'N-UNIQUE-EXP');
  toggle(ctx, '[data-field="omit-solutions"]');
  equal([ctx.store.getState().uniqueness, ctx.store.getState().omitSolutions], ['require', true], 'settings stored');
  equal(ctx.store.getState().board.width, 20, 'settings never change the board');
}));

await check('the editor survives a broken storage and persists what it can', async () => {
  const slots = document.createElement('div');
  for (const role of ['board', 'level', 'set', 'puzzles']) {
    const node = document.createElement('div');
    node.dataset.slot = role;
    slots.append(node);
  }
  const action = document.createElement('button');
  action.dataset.slot = 'main-action';
  slots.append(action);
  sandbox.append(slots);
  /** @type {unknown[]} */
  const written = [];
  let denied = true;
  const io = {
    getGeneratorState: () => { throw new Error('denied'); },
    getPrefs: () => { throw new Error('denied'); },
    setGeneratorState: (/** @type {unknown} */ snapshot) => {
      if (denied) {
        throw new Error('quota');
      }
      written.push(JSON.parse(JSON.stringify(snapshot)));
      return { ok: true };
    },
    setPrefs: () => ({ ok: true }),
  };
  const app = createGeneratorApp(document, { storage: io });
  try {
    const board = app.editor.view.surface;
    const state = app.store.getState();
    const at = (/** @type {number} */ x, /** @type {number} */ y) => {
      const group = /** @type {SVGGraphicsElement} */ (app.editor.view.svg.querySelector('.pm-board-group'));
      const p = new DOMPoint(x + 0.5, y + 0.5).matrixTransform(/** @type {DOMMatrix} */ (group.getScreenCTM()));
      return /** @type {[number, number]} */ ([p.x, p.y]);
    };
    pointer('pointerdown', board, at(1, 1));
    pointer('pointerup', board, at(1, 1));
    equal(activeCount(app.store.getState().board), 59, 'editing works while storage throws');
    equal(activeCount(state.board), 60, 'the previous state object is untouched');
    await sleep(450);
    denied = false;
    pointer('pointerdown', board, at(2, 2));
    pointer('pointerup', board, at(2, 2));
    equal(written.length, 0, 'writes wait for the 300 ms debounce');
    await sleep(450);
    equal(written.length, 1, 'one debounced write');
    const restored = loadGeneratorState({ ...io, getGeneratorState: () => written[0], getPrefs: () => ({}) });
    equal(activeCount(restored.board), 58, 'the saved board restores through the validators');
    assert(app.regions.set && app.regions.puzzles, 'regions are exposed for the job code');
    assert(/** @type {HTMLButtonElement} */ (action).textContent === 'Generate Piece Set' && !action.disabled, 'main action mirrors the state; the app wires the job handlers');
    app.setHandlers({ onGenerateSet: () => {} });
    assert(!action.disabled, 'registering a handler keeps the action enabled');
  } finally {
    app.destroy();
    slots.remove();
  }
});

await check('describeBoard and the editor agree on the status line', () => withEditor({}, {}, (ctx) => {
  const state = withBoard(ctx.store.getState(), setCell(ctx.store.getState().board, 0, 0, 0));
  ctx.store.update(() => state);
  equal(status(ctx), describeBoard(state, { phone: false }).statusText, 'same text');
  equal(status(ctx), '59 / 60 playable squares · connected', 'format');
}));

await check('destroy removes the panels and listeners; no CSP violations were reported', () => {
  const ctx = mount();
  const wrap = ctx.wrap;
  ctx.destroy();
  assert(!wrap.isConnected, 'DOM removed');
  equal(violations, [], 'CSP violations');
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
document.title = `${summary.textContent} - T17 generator editor harness`;
