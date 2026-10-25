// @ts-check
// Browser regression harness for printing a puzzle on paper: the Print dialog with a stubbed printer, the pages it
// builds, and their real geometry measured in millimetres (a board cell and a piece cell must be the same size; the
// back of every sheet must be the front mirrored left-to-right). Writes a pass/fail list into the page, data-summary
// and data-result on <html>. Developer fixture, not deployed.

import { createPrintDialog, puzzleDetails } from '../../core/browser/print-dialog.js';
import { buildPrintPages } from '../../core/browser/print-sheet.js';
import { boardFromRows } from '../../core/engine/board.js';
import { packBoard } from '../../core/engine/pack.js';
import { planPrint } from '../../core/browser/print-layout.js';
import { setLocale, t } from '../../player/i18n.js';

const MM_PER_PX = 25.4 / 96;
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
  document.getElementById('stage')?.replaceChildren();
  document.querySelectorAll('dialog.pm-print-dialog, .pm-print-root').forEach((node) => node.remove());
  document.documentElement.classList.remove('pm-printing');
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
 * @param {number} a
 * @param {number} b
 * @param {number} tolerance
 * @param {string} msg
 */
function near(a, b, tolerance, msg) {
  assert(Math.abs(a - b) <= tolerance, `${msg}: expected ${b} ± ${tolerance}, got ${a}`);
}

/**
 * Where an element is on its page, in millimetres.
 * @param {Element} node
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
function box(node) {
  const svg = /** @type {SVGSVGElement} */ (node.closest('svg'));
  const origin = svg.getBoundingClientRect();
  const r = node.getBoundingClientRect();
  return { x: (r.x - origin.x) * MM_PER_PX, y: (r.y - origin.y) * MM_PER_PX, w: r.width * MM_PER_PX, h: r.height * MM_PER_PX };
}

const sample = JSON.parse(await (await fetch('../../player/samples/sample-pack.json')).text());
const board = packBoard(sample);
/** @param {number} [rotation] */
const sampleJob = (rotation = 0) => ({ board, pieces: sample.pieces, clues: sample.puzzles[0].clues, rotation });
const heart = boardFromRows(['#####.....', '#####.....', '#####.....', '#####.....', '#####.....', '##########', '##########', '##########', '##########', '##########']);
const OPTIONS = { pieces: true, board: true, size: /** @type {const} */ ('medium'), duplex: false };

/**
 * @param {ReturnType<typeof planPrint>} plan
 * @returns {HTMLElement[]} The pages, attached to the page so that they can be measured.
 */
function stagePages(plan) {
  const pages = buildPrintPages(plan, { title: 'Puzzle #1', details: [] }, t);
  document.getElementById('stage')?.append(...pages);
  return pages;
}

await check('pages are 210 x 297 mm and a piece cell is exactly the cell of the board', async () => {
  for (const size of /** @type {const} */ (['small', 'medium', 'large', 'fit_page'])) {
    const plan = planPrint(sampleJob(), { ...OPTIONS, size });
    const pages = stagePages(plan);
    equal(pages.length, plan.pages.length, `${size}: one page per sheet`);
    for (const page of pages) {
      const svg = /** @type {SVGSVGElement} */ (page.querySelector('svg'));
      near(svg.getBoundingClientRect().width * MM_PER_PX, 210, 0.2, `${size}: page width`);
      near(svg.getBoundingClientRect().height * MM_PER_PX, 297, 0.2, `${size}: page height`);
    }
    const boardPage = pages[pages.length - 1];
    const tile = plan.sheets.at(-1);
    assert(tile?.kind === 'board', 'the last sheet is the board');
    const shape = box(/** @type {Element} */ (boardPage.querySelector('.pm-print-board')));
    // The bounding box is the cells themselves; the cut line is drawn on their edge.
    near(shape.w, tile.tile.cols * plan.cellMm, 0.3, `${size}: board width`);
    near(shape.h, tile.tile.rows * plan.cellMm, 0.3, `${size}: board height`);
    plan.pages.forEach(({ sheet }, at) => {
      if (sheet.kind !== 'pieces') {
        return;
      }
      for (const p of sheet.placements) {
        const node = /** @type {Element} */ (pages[at].querySelector(`.pm-print-piece[data-piece-id="${p.item.piece.id}"]`));
        const b = box(node);
        near(b.w, p.item.w * plan.cellMm, plan.cellMm * 0.1, `${size}: width of ${p.item.piece.id}`);
        near(b.h, p.item.h * plan.cellMm, plan.cellMm * 0.1, `${size}: height of ${p.item.piece.id}`);
      }
    });
    document.getElementById('stage')?.replaceChildren();
  }
});

await check('the back of every sheet is its front mirrored; the back of the preview is blank', async () => {
  const plan = planPrint(sampleJob(), { ...OPTIONS, size: 'large', duplex: true });
  const pages = stagePages(plan);
  equal(pages.length, 2 * plan.sheets.length, 'a back after every front');
  assert(pages[1].querySelector('.pm-print-piece, .pm-print-board') === null, 'the back of the preview is blank');
  for (let i = 2; i < pages.length; i += 2) {
    const fronts = [...pages[i].querySelectorAll('.pm-print-piece, .pm-print-board')];
    const backs = [...pages[i + 1].querySelectorAll('.pm-print-piece, .pm-print-board')];
    assert(fronts.length > 0, 'a sheet has content');
    equal(backs.length, fronts.length, `sheet ${i / 2}: same number of things on both sides`);
    for (const front of fronts) {
      const id = front.getAttribute('data-piece-id');
      const back = id === null ? backs[0] : backs.find((node) => node.getAttribute('data-piece-id') === id);
      assert(back !== undefined, `sheet ${i / 2}: the back has ${id ?? 'the board'}`);
      const a = box(front);
      const b = box(/** @type {Element} */ (back));
      near(a.x + a.w / 2 + b.x + b.w / 2, 210, 0.3, `sheet ${i / 2} ${id ?? 'board'}: centres are mirrored about the middle of the sheet`);
      near(a.y, b.y, 0.3, `sheet ${i / 2} ${id ?? 'board'}: same height on the sheet`);
      near(a.w, b.w, 0.3, 'same width');
    }
  }
  // The letters stay upright on the back (they are not mirrored).
  const label = pages[3].querySelector('text.pm-label');
  assert(label !== null && !/scale\(-/.test(label.getAttribute('transform') ?? ''), 'a letter is not flipped');
});

await check('a heart board prints without its blocked squares, and a big board is split into parts', async () => {
  const job = { board: heart, pieces: sample.pieces, clues: [], rotation: 45 };
  const plan = planPrint(job, { ...OPTIONS, size: 'large' });
  const pages = stagePages(plan);
  assert(plan.boardParts >= 2, '10 cells of 20 mm do not fit a sheet either way: the board is split');
  const squaresOf = (/** @type {Element} */ node) => (node.querySelectorAll('path')[1].getAttribute('d')?.split('M').length ?? 1) - 1;
  // The first page is the preview; the others hold the parts of the board (and the pieces).
  const parts = pages.slice(1).flatMap((page) => [...page.querySelectorAll('.pm-print-board')]);
  equal(parts.length, plan.boardParts, 'one sheet per part');
  equal(parts.reduce((sum, node) => sum + squaresOf(node), 0), 75, 'every playable square of the heart is printed once, the blocked ones not at all');
  const boardTiles = plan.sheets.flatMap((s) => (s.kind === 'board' ? [s.tile] : []));
  const marks = pages.flatMap((page) => [...page.querySelectorAll('.pm-print-join')]);
  equal(marks.length, boardTiles.reduce((sum, tile) => sum + tile.joins.length, 0), 'a join mark for every joint of every part');
  assert(marks.length > 0 && marks.every((g) => g.querySelector('polygon') !== null && g.textContent === g.getAttribute('data-to')), 'each mark is a triangle with the neighbour number');
  assert(pages.some((page) => /match each ▶ mark/.test(page.textContent ?? '')), 'the board sheets say how to join the parts');

  setLocale('en', document);
  const dialog = createPrintDialog({ host: document.body, t, getJob: () => ({ ...job, title: 'Heart', details: [] }) });
  dialog.open();
  /** @type {HTMLElement} */ (dialog.dialog.querySelector('tr[data-size="large"] td:last-child')).click();
  const said = dialog.dialog.querySelector('[data-role="print-summary"]')?.textContent ?? '';
  assert(said.startsWith(`The board is printed on ${plan.boardParts} sheets to cut out and join.`), `the dialog explains the split board: ${said}`);
  dialog.close();
});

await check('the preview board outlines its pieces in black, and holes are grey with a cross on paper', async () => {
  const job = sampleJob();
  const pages = stagePages(planPrint(job, OPTIONS));
  const outlines = [...pages[0].querySelectorAll('.pm-clue .pm-print-outline')];
  equal(outlines.length, job.clues.length, 'one dark outline per piece on the preview board');
  equal(pages[0].querySelectorAll('.pm-print-outline').length, sample.pieces.length, 'the pieces to place are outlined too');
  assert(outlines.every((path) => path.getAttribute('stroke') === '#000000'), 'the outlines are black');
  const width = Number(outlines[0].getAttribute('stroke-width')) * planPrint(job, OPTIONS).preview.cellMm;
  near(width, 0.6, 0.01, 'the outlines are 0.6 mm wide');
  document.getElementById('stage')?.replaceChildren();

  const active = new Uint8Array(8 * 6).fill(1);
  active[2 * 8 + 3] = 0;
  const holed = stagePages(planPrint({ board: { width: 8, height: 6, active }, pieces: sample.pieces, clues: [], rotation: 0 }, OPTIONS));
  const boards = holed.flatMap((page) => [...page.querySelectorAll('.pm-print-board')]);
  assert(boards.length === 2, `the preview and the board sheet (${boards.length})`);
  for (const node of boards) {
    const hole = node.querySelector('rect.pm-print-hole');
    assert(hole !== null && hole.getAttribute('fill') === '#c4c4c4' && hole.nextElementSibling?.tagName === 'path', 'the hole is light grey with a cross');
    assert(!hole?.classList.contains('pm-blocked'), 'the screen theme cannot recolour it on paper');
  }
});

await check('the first sheet names the puzzle, its rating and its piece set, with the level names in bold, and no puzzle seed', async () => {
  setLocale('en', document);
  const details = puzzleDetails(t, { level: 'Nightmare', score: 123.4, saturated: false }, { level: 'Expert', seed: 'ABCD-EFGH-JKLM' });
  const [page] = buildPrintPages(planPrint({ ...sampleJob(), title: 'Puzzle #2', details }, OPTIONS), { title: 'Puzzle #2', details }, t);
  document.getElementById('stage')?.append(page);
  const lines = [...page.querySelectorAll('text.pm-print-detail')];
  equal(lines.map((n) => n.textContent).join(' | '), 'Nightmare: score 123 | Set: Expert, ABCD-EFGH-JKLM', 'the two lines');
  equal(lines.map((n) => [...n.querySelectorAll('tspan[font-weight="700"]')].map((s) => s.textContent).join()).join(' | '), 'Nightmare | Expert', 'the levels are bold');
  equal(page.querySelector('text')?.textContent, 'Puzzle #2', 'the title above them');
  const board = /** @type {Element} */ (page.querySelector('.pm-print-board'));
  assert(box(board).y > box(lines[1]).y + box(lines[1]).h, 'the board starts under the heading');
  assert(!/seed/i.test(page.textContent ?? ''), 'the puzzle seed is not printed');
  equal(puzzleDetails(t, null, null).length, 0, 'without a rating or a set: nothing');
  equal(puzzleDetails(t, { level: 'Easy', score: 8, saturated: true }, { level: null, seed: 'S' }).map((line) => line.map((p) => p.text).join('')).join(' | '),
    'Easy: score 8+ | Set: S', 'without a set level, what is known');
});

await check('the dialog keeps the choices, summarises the paper and prints through the browser', async () => {
  setLocale('en', document);
  const host = document.body;
  const listeners = /** @type {Array<() => void>} */ ([]);
  let printed = 0;
  /** @type {boolean | null} */
  let printingDuringPrint = null;
  const stub = /** @type {Window & typeof globalThis} */ (/** @type {unknown} */ ({
    print: () => {
      printed += 1;
      printingDuringPrint = document.documentElement.classList.contains('pm-printing') && document.querySelectorAll('.pm-print-page').length > 0;
    },
    addEventListener: (/** @type {string} */ type, /** @type {() => void} */ fn) => {
      if (type === 'afterprint') {
        listeners.push(fn);
      }
    },
    removeEventListener: () => {},
  }));
  const dialog = createPrintDialog({ host, t, win: stub, getJob: () => ({ ...sampleJob(), title: 'Puzzle #1', details: [] }) });
  dialog.open();
  const root = dialog.dialog;
  assert(dialog.isOpen(), 'the dialog opens');
  const q = (/** @type {string} */ selector) => /** @type {HTMLInputElement & HTMLSelectElement & HTMLButtonElement} */ (root.querySelector(selector));
  assert(q('[data-field="print-pieces"]').checked && q('[data-field="print-board"]').checked, 'the piece set and the board are on');
  assert(!q('[data-field="print-duplex"]').checked, 'one side by default');
  const sizeOf = () => /** @type {HTMLInputElement | null} */ (root.querySelector('[data-field="print-size"]:checked'))?.value;
  equal(sizeOf(), 'medium', 'medium size by default');
  const options = [...root.querySelectorAll('.pm-print-options > *')].map((n) => n.querySelector('[data-field]')?.getAttribute('data-field'));
  equal(JSON.stringify(options), JSON.stringify(['print-pieces', 'print-board', 'print-duplex', 'print-size']), 'piece set, board, two sides, then the size table');
  const sheetsColumn = () => [...root.querySelectorAll('td.pm-print-sheets')].map((td) => td.textContent).join(',');
  const expectedSheets = (/** @type {Partial<typeof OPTIONS>} */ o) => ['small', 'medium', 'large', 'fit_page']
    .map((size) => planPrint(sampleJob(), { ...OPTIONS, ...o, size: /** @type {typeof OPTIONS.size} */ (size) }).paper).join(',');
  const sizeRows = [...root.querySelectorAll('table.pm-print-sizes tbody tr')].map((tr) => [.../** @type {HTMLTableRowElement} */ (tr).cells].slice(0, 2).map((td) => td.textContent?.trim()));
  equal(JSON.stringify(sizeRows), JSON.stringify([['Small', '10 mm'], ['Medium', '15 mm'], ['Large', '20 mm'], ['Fit to page', 'Largest that fits on one sheet']]), 'the size table: name and cell');
  equal([...root.querySelectorAll('table.pm-print-sizes thead th')].map((th) => th.textContent).join('|'), 'Size|Cell size|A4 sheets', 'its column heads');
  equal(sheetsColumn(), expectedSheets({}), 'the sheets each size needs');
  equal(sheetsColumn().split(',')[1], '3', 'medium: 3 sheets');
  assert(root.querySelector('.pm-print-note') === null && !/100 ?%/.test(root.textContent ?? ''), 'no note about printing at 100 %');
  equal(q('[data-role="print-summary"]').textContent, '', 'no summary while the board fits one sheet as it is');
  assert(!/sheets? of A4/.test(root.textContent ?? ''), 'the total of sheets is only in the table');

  q('[data-field="print-duplex"]').checked = true;
  q('[data-field="print-duplex"]').dispatchEvent(new Event('change'));
  equal(sheetsColumn(), expectedSheets({ duplex: true }), 'two sides: the same sheets');
  /** @type {HTMLElement} */ (root.querySelector('tr[data-size="large"] td:last-child')).click();
  equal(sizeOf(), 'large', 'a click anywhere in a row picks its size');
  assert(!/cells of|mm/.test(q('[data-role="print-summary"]').textContent ?? ''), 'the summary does not repeat the cell size');
  equal(q('[data-role="print-summary"]').textContent, 'The board is rotated 90° to save paper.', 'a turned board is said');
  q('[data-field="print-pieces"]').checked = false;
  q('[data-field="print-board"]').checked = false;
  q('[data-field="print-pieces"]').dispatchEvent(new Event('change'));
  equal(sheetsColumn(), '1,1,1,1', 'the sheets column follows the other choices: only the preview is left');

  q('[data-field="print-pieces"]').checked = true;
  q('[data-field="print-pieces"]').dispatchEvent(new Event('change'));
  q('[data-action="print-confirm"]').click();
  equal(printed, 1, 'the browser was asked to print once');
  equal(printingDuringPrint, true, 'the pages are in the page while it prints');
  assert(!dialog.isOpen(), 'the dialog closed');
  equal(document.querySelectorAll('.pm-print-page').length, 4, 'preview and pieces, both sides of the pieces');
  listeners[0]();
  equal(document.querySelectorAll('.pm-print-root').length, 0, 'the pages are removed after printing');
  assert(!document.documentElement.classList.contains('pm-printing'), 'the page is back to normal');

  dialog.open();
  equal(q('[data-field="print-duplex"]').checked, true, 'the choices are kept for the next time');
  equal(sizeOf(), 'large', 'the size too');
  q('[data-action="print-cancel"]').click();
  assert(!dialog.isOpen(), 'cancel closes');
  equal(printed, 1, 'cancel prints nothing');
});

await check('Print solution: only where the app offers it, and it adds the solution sheet', async () => {
  setLocale('en', document);
  const solution = sample.puzzles[0].solution;
  /** @type {any[] | null} */
  let jobSolution = solution;
  const job = () => ({ ...sampleJob(), title: 'Puzzle #1', details: [], solution: jobSolution });
  const plain = createPrintDialog({ host: document.body, t, getJob: job });
  equal(plain.dialog.querySelector('[data-field="print-solution"]'), null, 'not offered by default (the player)');
  const dialog = createPrintDialog({ host: document.body, t, getJob: job, solutionOption: true });
  dialog.open();
  const root = dialog.dialog;
  const input = /** @type {HTMLInputElement} */ (root.querySelector('[data-field="print-solution"]'));
  const fields = [...root.querySelectorAll('.pm-print-options > *')].map((n) => n.querySelector('[data-field]')?.getAttribute('data-field'));
  equal(fields.join(','), 'print-pieces,print-board,print-duplex,print-solution,print-size', 'after Print 2 sides, before the size table');
  assert(!input.checked && !input.disabled, 'off by default');
  equal(input.closest('label')?.textContent?.startsWith('Print solution'), true, 'its name');
  const medium = () => root.querySelector('tr[data-size="medium"] td.pm-print-sheets')?.textContent;
  const before = Number(medium());
  input.checked = true;
  input.dispatchEvent(new Event('change'));
  equal(Number(medium()), before + 1, 'one more sheet');
  dialog.close();
  jobSolution = null;
  dialog.open();
  assert(input.disabled && input.closest('label')?.title === 'No solution is stored for this puzzle.', 'no stored solution: disabled with the reason');
  equal(Number(medium()), before, 'and no extra sheet');
  dialog.close();
  jobSolution = solution;
  const plan = planPrint(job(), { ...OPTIONS, solution: true });
  const pages = stagePages(plan);
  const second = pages[1];
  assert(second !== undefined && /Solution/.test(second.textContent ?? ''), 'the solution is the sheet after the puzzle');
  equal(second?.querySelectorAll('.pm-print-solution .pm-print-piece').length, sample.pieces.length, 'with every piece');
  document.getElementById('stage')?.replaceChildren();
  const both = stagePages(planPrint(job(), { ...OPTIONS, solution: true, duplex: true }));
  assert(/Solution/.test(both[1].textContent ?? '') && both[1].querySelector('.pm-print-solution') !== null, 'two sides: the solution is the back of the puzzle, not a blank page');
});

await check('the texts follow the language', async () => {
  setLocale('vi', document);
  const dialog = createPrintDialog({ host: document.body, t, getJob: () => ({ ...sampleJob(), title: 'Đề #1', details: [] }) });
  equal(dialog.dialog.querySelector('.pm-print-title')?.textContent, 'In đề', 'Vietnamese title');
  setLocale('en', document);
  equal(dialog.dialog.querySelector('.pm-print-title')?.textContent, 'Print puzzle', 'English title after the switch');
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
document.documentElement.dataset.result = failed.length === 0 ? 'pass' : 'fail';
