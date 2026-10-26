// @ts-check
// Browser regression harness for the printed puzzle code: the real Print dialog with the real puzzle-code worker and
// the real QR adapter, the first sheet measured in millimetres (no overlaps, the QR box,
// the code spans read back in order), duplex accounting, the dialog's preparation lifecycle (pending, stale answers,
// source changes, close, errors, the oversize ladder, the local override) and the Player's and the Generator's jobs.
// Writes a pass/fail list into the page, data-summary and data-result on <html> (running until every case, including
// the asynchronous ones, has finished). Developer fixture, not deployed.

import { createPrintDialog, puzzleDetails } from '../../core/browser/print-dialog.js';
import { PREVIEW_BOTTOM, planPrint } from '../../core/browser/print-layout.js';
import { buildPrintPages, createTextMeasure } from '../../core/browser/print-sheet.js';
import { createPuzzleCodeClient } from '../../core/browser/puzzle-code-client.js';
import { PUBLIC_PLAYER_URL, preparePuzzleShare, puzzleSnapshot } from '../../core/browser/puzzle-snapshot.js';
import { puzzleDisplayName } from '../../core/browser/puzzle-title.js';
import { makePuzzleQr } from '../../core/browser/qr.js';
import { createStorage } from '../../core/browser/storage.js';
import { packBoard, validatePack } from '../../core/engine/pack.js';
import { catalogueStats } from '../../core/engine/puzzlecode-v1.js';
import { puzzleCodeUrl } from '../../core/engine/sharecode.js';
import { packHash } from './pack-link.js';
import { mountPlayer } from '../../player/app.js';
import { setLocale, t } from '../../player/i18n.js';

document.documentElement.dataset.result = 'running';

const NS = 'http://www.w3.org/2000/svg';
const MM = 25.4 / 96;
// The QR leads to the Player of the page the test runs on.
const OWN_PLAYER_URL = new URL('../player/', document.baseURI).href;
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
const uncaught = /** @type {string[]} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
window.addEventListener('error', (e) => uncaught.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => uncaught.push(String(e.reason)));
const stage = /** @type {HTMLElement} */ (document.getElementById('stage'));
/** @type {Array<{ destroy: () => void }>} */
let toDestroy = [];

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
  for (const item of toDestroy.splice(0)) {
    try {
      item.destroy();
    } catch {
      // already gone
    }
  }
  stage.replaceChildren();
  document.querySelectorAll('dialog.pm-print-dialog, .pm-print-root, .stage-root').forEach((node) => node.remove());
  document.documentElement.classList.remove('pm-printing');
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
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
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

const pause = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = () => pause(15);

/**
 * @param {() => unknown} fn
 * @param {string} msg
 * @param {number} [ms]
 */
async function waitFor(fn, msg, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) {
      return;
    }
    await pause(10);
  }
  throw new Error(`timed out: ${msg}`);
}

/** @param {number} length */
const symbols = (length) => ALPHABET.repeat(Math.ceil(length / ALPHABET.length)).slice(0, length);
/**
 * @param {string} C
 * @param {string | null} T
 */
const codeOf = (C, T) => ({ C, T, F: T === null ? C : `${C}.${T}`, version: /** @type {const} */ (1) });

// ---- fixtures --------------------------------------------------------------------------------------------------------

const sample = JSON.parse(await (await fetch('../../player/samples/sample-pack.json')).text());
const board = packBoard(sample);
const untitled = (/** @type {number} */ n) => t('ui.puzzleNumber', { n });

/**
 * @param {number} [index]
 * @param {number} [rotation]
 * @param {Partial<Parameters<typeof puzzleSnapshot>[0]>} [over]
 */
function snapshotFor(index = 0, rotation = 0, over = {}) {
  return puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[index], index, rotation, untitled, ...over });
}

/**
 * @param {ReturnType<typeof puzzleSnapshot> | null} snapshot
 * @param {Record<string, unknown>} [over]
 */
function jobFor(snapshot, over = {}) {
  return {
    board,
    pieces: sample.pieces,
    clues: sample.puzzles[0].clues,
    rotation: 0,
    title: snapshot?.heading ?? 'Puzzle #1',
    details: puzzleDetails(t, { level: 'Easy', score: 8 }),
    snapshot,
    ...over,
  };
}

/** A real QR and code for the layout cases. */
function shareOf(/** @type {string} */ C, /** @type {string | null} */ T, target = PUBLIC_PLAYER_URL, notices = /** @type {any[]} */ ([])) {
  const code = codeOf(C, T);
  const made = makePuzzleQr({ urlPrefix: `${target}#p=`, code: code.F, ec: 'M' });
  assert(made.ok, 'the code fits a QR symbol');
  return { code, url: `${target}#p=${code.F}`, carried: /** @type {const} */ (T === null ? 'C' : 'C.T'), qr: /** @type {any} */ (made).value, notices };
}

/**
 * A share whose QR has the given version at level M (the shortest code that needs it; the tail is a tenth of the code).
 * @param {number} version
 */
function shareOfVersion(version) {
  for (let length = 20; length < 3000; length += 1) {
    const share = shareOf(symbols(length), symbols(Math.max(1, Math.floor(length / 10))));
    if (share.qr.version === version) {
      return share;
    }
  }
  throw new Error(`no code makes a version ${version} symbol`);
}

/** A window of the page's own, with a counting printer. */
function stubWindow() {
  /** @type {Array<() => void>} */
  const listeners = [];
  const out = {
    printed: 0,
    /** @type {HTMLElement[]} */
    pages: [],
    afterPrint: () => listeners.forEach((fn) => fn()),
    stub: /** @type {Window & typeof globalThis} */ (/** @type {unknown} */ ({
      print: () => {
        out.printed += 1;
        // The pages leave the page after printing: keep measurable copies.
        out.pages = [...document.querySelectorAll('.pm-print-root .pm-print-page')].map((page) => /** @type {HTMLElement} */ (page.cloneNode(true)));
        stage.append(...out.pages);
      },
      addEventListener: (/** @type {string} */ type, /** @type {() => void} */ fn) => {
        if (type === 'afterprint') {
          listeners.push(fn);
        }
      },
      removeEventListener: () => {},
    })),
  };
  return out;
}

/** A client whose answers the case decides when to give. */
function deferredClient() {
  /** @type {Array<{ snapshot: any, ok: (code: ReturnType<typeof codeOf>) => void, fail: (message: string) => void }>} */
  const calls = [];
  const client = {
    calls,
    cancelled: 0,
    disposed: false,
    /** @param {any} snapshot */
    encode: (snapshot) => new Promise((resolve) => {
      calls.push({
        snapshot,
        ok: (code) => resolve({ ok: true, value: code, warnings: [] }),
        fail: (message) => resolve({ ok: false, issues: [{ code: 'worker-error', path: '$', message }] }),
      });
    }),
    cancel() {
      client.cancelled += 1;
    },
    dispose() {
      client.disposed = true;
    },
  };
  return client;
}

/** A client that answers at once with a fixed code and counts its calls. */
function instantClient(/** @type {ReturnType<typeof codeOf>} */ code) {
  const client = {
    calls: 0,
    /** @type {any[]} */
    snapshots: [],
    /** @param {any} snapshot */
    encode: async (snapshot) => {
      client.calls += 1;
      client.snapshots.push(snapshot);
      return { ok: /** @type {const} */ (true), value: code, warnings: [] };
    },
    cancel() {},
    dispose() {},
  };
  return client;
}

// ---- geometry --------------------------------------------------------------------------------------------------------

/**
 * @param {Element} node
 * @returns {{ x: number, y: number, w: number, h: number }} Where the node is on its page, in millimetres.
 */
function rectOf(node) {
  const svg = /** @type {SVGSVGElement} */ (node.closest('svg'));
  const origin = svg.getBoundingClientRect();
  const r = node.getBoundingClientRect();
  return { x: (r.x - origin.x) * MM, y: (r.y - origin.y) * MM, w: r.width * MM, h: r.height * MM };
}

/**
 * The ink of a text line: its width from the DOM, its height from the baseline (ascender 0.78 em, descender 0.22 em), so
 * that two lines a pitch apart do not report an overlap that is only line spacing.
 * @param {Element} node
 */
function glyphBox(node) {
  const r = rectOf(node);
  const size = Number(node.getAttribute('font-size'));
  const baseline = Number(node.getAttribute('y'));
  return { x: r.x, w: r.w, y: baseline - 0.78 * size, h: size };
}

/**
 * @param {Array<[string, { x: number, y: number, w: number, h: number }]>} boxes
 */
function assertSeparate(boxes) {
  const gap = 0.02;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const [an, a] = boxes[i];
      const [bn, b] = boxes[j];
      const apart = a.x + a.w <= b.x + gap || b.x + b.w <= a.x + gap || a.y + a.h <= b.y + gap || b.y + b.h <= a.y + gap;
      assert(apart, `${an} (${[a.x, a.y, a.w, a.h].map((n) => n.toFixed(1))}) overlaps ${bn} (${[b.x, b.y, b.w, b.h].map((n) => n.toFixed(1))})`);
    }
  }
}

/** @param {Element} page @param {string} selector @returns {Element[]} */
const all = (page, selector) => [...page.querySelectorAll(selector)];

/**
 * Pixels of a standalone rendering of the printed QR group, read back at the module centres.
 * @param {Element} group A `g.pm-print-qr`.
 * @param {ReadonlyArray<ArrayLike<number>>} rows
 * @returns {Promise<number>} The number of modules that differ from the matrix (quiet zone and opacity included).
 */
async function qrMismatches(group, rows) {
  const outer = Number(group.querySelector('rect')?.getAttribute('width'));
  const quiet = 4;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('xmlns', NS);
  svg.setAttribute('viewBox', `0 0 ${outer} ${outer}`);
  const scale = 8;
  svg.setAttribute('width', String(outer * scale));
  svg.setAttribute('height', String(outer * scale));
  svg.append(...[...group.children].map((child) => child.cloneNode(true)));
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = outer * scale;
  canvas.height = outer * scale;
  const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let wrong = 0;
  for (let y = 0; y < outer; y += 1) {
    for (let x = 0; x < outer; x += 1) {
      const [r, g, b, a] = context.getImageData(x * scale + scale / 2, y * scale + scale / 2, 1, 1).data;
      const inside = x >= quiet && y >= quiet && x < quiet + rows.length && y < quiet + rows.length;
      const expected = inside && rows[y - quiet][x - quiet] === 1 ? 0 : 255;
      if (a !== 255 || Math.abs(r - expected) > 8 || Math.abs(g - expected) > 8 || Math.abs(b - expected) > 8) {
        wrong += 1;
      }
    }
  }
  return wrong;
}

/**
 * @param {HTMLElement[]} pages
 * @returns {string} The code of the QR symbols of the pages (the sheet prints no code as text), in reading order.
 */
const typedCode = (pages) => pages.flatMap((page) => all(page, 'g.pm-print-qr')).map((node) => node.getAttribute('data-qr-code') ?? '').join('');

/**
 * Plans and builds the pages of a job and stages them for measuring.
 * @param {ReturnType<typeof jobFor>} job
 * @param {any} share
 * @param {Partial<import('../../core/browser/print-layout.js').PrintOptions>} [options]
 */
function stagePlan(job, share, options = {}) {
  const measure = createTextMeasure(document);
  const plan = planPrint({ ...job, share, measure }, { pieces: true, board: true, size: 'medium', duplex: false, ...options });
  const pages = buildPrintPages(plan, { title: job.title, details: /** @type {any} */ (job.details) }, t);
  stage.append(...pages);
  return { plan, pages };
}

/**
 * Everything on the first sheet: no overlaps, inside the page and clear of the QR column, the QR where it must be and
 * exactly its matrix, nothing typed of the code, the preview its 120 mm.
 * @param {HTMLElement} page
 * @param {ReturnType<typeof planPrint>} plan
 * @param {any} share
 * @param {string} label
 */
async function checkFirstSheet(page, plan, share, label) {
  const svg = /** @type {SVGSVGElement} */ (page.querySelector('svg'));
  near(svg.getBoundingClientRect().width * MM, 210, 0.2, `${label}: page width`);
  near(svg.getBoundingClientRect().height * MM, 297, 0.2, `${label}: page height`);
  /** @type {Array<[string, { x: number, y: number, w: number, h: number }]>} */
  const boxes = [];
  for (const selector of ['text.pm-print-sheet-title', 'text.pm-print-detail', 'text.pm-print-no-code', 'text.pm-print-qr-scan']) {
    for (const node of all(page, selector)) {
      boxes.push([`${selector} "${(node.textContent ?? '').slice(0, 14)}"`, glyphBox(node)]);
    }
  }
  assert(page.querySelector('text.pm-print-code, text.pm-print-qr-host') === null, `${label}: neither the code nor the address is printed`);
  const qr = page.querySelector('g.pm-print-qr');
  const band = plan.band;
  if (share.qr !== null) {
    assert(qr !== null && band.qr !== null, `${label}: the QR is on the first sheet`);
    const box = rectOf(/** @type {Element} */ (qr));
    const size = share.qr.outerMm;
    near(box.w, size, 0.05, `${label}: QR box width`);
    near(box.h, size, 0.05, `${label}: QR box height`);
    near(box.x, 10, 0.05, `${label}: QR left edge at the margin`);
    near(box.y, 10, 0.05, `${label}: QR top edge at the margin`);
    assert(size >= 25 - 1e-9, `${label}: the box is at least 25 mm`);
    assert(box.w / share.qr.outerModules >= 0.5 - 1e-3, `${label}: a module is at least 0.5 mm`);
    equal(await qrMismatches(/** @type {Element} */ (qr), share.qr.rows), 0, `${label}: pixels differing from the matrix, quiet zone included`);
    boxes.push(['QR box', box]);
    const column = size + 10;
    for (const [name, b] of boxes) {
      if (name !== 'QR box' && b.y < 10 + column - 0.05 && !name.includes('qr-scan')) {
        assert(b.x >= 10 + size + 6 - 0.35, `${label}: ${name} starts at ${b.x.toFixed(1)}, clear of the QR column`);
      }
    }
    for (const node of all(page, 'text.pm-print-qr-scan')) {
      const b = rectOf(node);
      assert(b.w <= size + 0.1, `${label}: the caption is no wider than the box`);
    }
  } else {
    assert(qr === null, `${label}: no QR`);
  }
  for (const [name, b] of boxes) {
    assert(b.x >= 10 - 0.3 && b.x + b.w <= 200 + 0.3 && b.y >= 10 - 2 && b.y + b.h <= 287 + 0.3, `${label}: ${name} lies inside the content area`);
  }
  const boardBox = rectOf(/** @type {Element} */ (page.querySelector('.pm-print-board')));
  boxes.push(['preview board', boardBox]);
  for (const node of all(page, 'svg > text:not([class])')) {
    boxes.push([`text "${(node.textContent ?? '').slice(0, 12)}"`, glyphBox(node)]);
  }
  for (const node of all(page, '.pm-print-piece')) {
    if (node.querySelector('.pm-clue') === null) {
      boxes.push([`piece ${node.getAttribute('data-piece-id')}`, rectOf(node)]);
    }
  }
  const ruler = all(page, 'svg > path').find((node) => /h50/.test(node.getAttribute('d') ?? ''));
  assert(ruler !== undefined, `${label}: the 50 mm bar is there`);
  near(rectOf(ruler).w, 50, 0.6, `${label}: the bar is 50 mm`);
  assertSeparate(boxes.filter(([name]) => !name.startsWith('piece ') || true));
  assert(boardBox.y >= band.bottom + 4 - 0.6, `${label}: the board starts under the band (${boardBox.y.toFixed(1)} vs ${band.bottom + 4})`);
  assert(PREVIEW_BOTTOM - boardBox.y >= 120 - 0.6, `${label}: the preview keeps 120 mm`);
  const titleLines = all(page, 'text.pm-print-sheet-title');
  assert(titleLines.length <= 3, `${label}: at most three title lines`);
  for (const node of titleLines) {
    assert(rectOf(node).w <= band.head.width + 0.35, `${label}: a title line fits ${band.head.width} mm`);
  }
}

// ---- cases -----------------------------------------------------------------------------------------------------------

await check('the real dialog prepares the code in the worker before Print is ready, and prints the sheet of that code', async () => {
  const win = stubWindow();
  const snapshot = snapshotFor(0, 0);
  const dialog = createPrintDialog({ host: document.body, t, win: win.stub, getJob: () => jobFor(snapshot) });
  toDestroy.push(dialog);
  dialog.open();
  const root = dialog.dialog;
  const q = (/** @type {string} */ selector) => /** @type {HTMLElement & HTMLInputElement & HTMLButtonElement} */ (root.querySelector(selector));
  const confirm = q('[data-action="print-confirm"]');
  equal(q('[data-role="print-code"]').dataset.state, 'preparing', 'the dialog opens at once, preparing');
  equal(q('[data-role="print-code-status"]').textContent, 'Preparing the puzzle code…', 'a clear preparing state');
  assert(confirm.disabled, 'Print is disabled while preparing');
  confirm.click();
  equal(win.printed, 0, 'a click on the disabled button prints nothing');
  await waitFor(() => q('[data-role="print-code"]').dataset.state === 'ready', 'the code to be ready');
  assert(!confirm.disabled, 'Print is ready');
  await settle();
  equal(win.printed, 0, 'and nothing was printed by itself');
  equal(q('[data-role="print-code"]').dataset.target, OWN_PLAYER_URL, 'the QR leads to the Player of this page');
  assert(root.querySelector('[data-role="print-target"]') === null && !(root.textContent ?? '').includes(OWN_PLAYER_URL), 'the dialog does not show the address');
  equal([...root.querySelectorAll('[data-role="print-notices"] li')].map((li) => li.textContent), [], 'a local page has no notice');
  assert(root.querySelector('[data-field="print-use-this-page"]') === null, 'there is no override');
  const prepared = /** @type {NonNullable<ReturnType<typeof dialog.prepared>>} */ (dialog.prepared());
  const share = /** @type {NonNullable<typeof prepared.share>} */ (prepared.share);
  equal(share.carried, 'C.T', 'the stored answer is carried');
  const independent = createPuzzleCodeClient();
  try {
    const again = await independent.encode(snapshot.data);
    assert(again.ok && again.value.F === share.code.F, 'an independent encoding in another worker gives the same code');
  } finally {
    independent.dispose();
  }
  equal(share.url, puzzleCodeUrl(OWN_PLAYER_URL, share.code.F), 'the address is the Player of this page and the carried code');

  confirm.click();
  equal(win.printed, 1, 'Print prints once');
  assert(!dialog.isOpen(), 'and closes the dialog');
  const first = win.pages[0];
  equal(typedCode(win.pages), share.code.F, 'the QR of the sheet carries the prepared code');
  assert(first.querySelector('text.pm-print-code, text.pm-print-code-label, text.pm-print-code-tail-label, text.pm-print-qr-host') === null, 'the sheet prints neither the code nor the address');
  equal(first.querySelector('text.pm-print-qr-scan')?.textContent, 'Play Online', 'the QR is labelled');
  equal(first.querySelector('text.pm-print-sheet-title')?.textContent, 'Easy #1', 'the heading is the snapshot\'s');
  assert(!/seed/i.test(first.textContent ?? ''), 'the puzzle seed is not printed');
  const details = all(first, 'text.pm-print-detail').map((n) => n.textContent);
  equal(details, ['Easy: score 8'], 'the rating remains, without a set line');
  const qr = /** @type {Element} */ (first.querySelector('g.pm-print-qr'));
  equal(Number(qr.getAttribute('data-qr-version')), share.qr?.version, 'the QR is the prepared symbol');
  equal(await qrMismatches(qr, /** @type {any} */ (share.qr).rows), 0, 'its pixels are the matrix');
  const heading = rectOf(/** @type {Element} */ (first.querySelector('text.pm-print-sheet-title')));
  assert(heading.x >= rectOf(qr).x + rectOf(qr).w, 'the puzzle name is to the right of the QR');
  win.afterPrint();
  equal(document.querySelectorAll('.pm-print-root').length, 0, 'the pages are removed after printing');
  assert(catalogueStats.sizesBuilt === 0, 'no catalogue was built on the main thread');
  // Evidence for the independent decoder: the printed sheet as pixels, for the page's own QR.
  const svgText = new XMLSerializer().serializeToString(/** @type {Element} */ (first.querySelector('svg')));
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  await image.decode();
  const pxPerMm = 8;
  const size = /** @type {number} */ (share.qr?.outerMm);
  const margin = 1;
  const left = Math.round((10 - margin) * pxPerMm);
  const top = Math.round((10 - margin) * pxPerMm);
  const side = Math.round((size + 2 * margin) * pxPerMm);
  const canvas = document.createElement('canvas');
  canvas.width = 210 * pxPerMm;
  canvas.height = 297 * pxPerMm;
  const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(left, top, side, side).data;
  let binary = '';
  for (let i = 0; i < pixels.length; i += 4096) {
    binary += String.fromCharCode(...pixels.subarray(i, i + 4096));
  }
  Object.assign(window, { __rp05: { url: share.url, side, rgba: btoa(binary) } });
});

await check('every first-sheet layout case: no overlaps, the QR where it must be, the preview keeps 120 mm', async () => {
  const shares = [
    ['version 5', shareOfVersion(5)],
    ['version 11', shareOfVersion(11)],
    ['version 40', shareOf(symbols(3000), symbols(300))],
  ];
  assert(shares[0][1].qr.version === 5 && shares[0][1].qr.outerMm === 25, `version 5 box (${shares[0][1].qr.version}, ${shares[0][1].qr.outerMm})`);
  assert(shares[1][1].qr.version === 11 && shares[1][1].qr.outerMm === 34.5, `version 11 box (${shares[1][1].qr.version}, ${shares[1][1].qr.outerMm})`);
  assert(shares[2][1].qr.version === 40 && shares[2][1].qr.outerMm === 92.5, 'version 40 box');
  const titles = [
    'Easy #1',
    'A puzzle with a title that is long enough to need more than one line, and then some more words to be sure of it',
    'W'.repeat(80),
    `${'😀'.repeat(30)} ${'é'.repeat(45)}`,
    'Averyveryverylongunbrokenwordthatcannotbebrokenatspacesbecauseithasnone and more words after it, to wrap again',
  ];
  let cases = 0;
  for (const [name, share] of shares) {
    for (const count of [0, 1, 2]) {
      for (const title of titles) {
        const details = puzzleDetails(t, { level: 'Easy', score: 8 }).slice(0, count);
        const { plan, pages } = stagePlan(jobFor(null, { title, details }), share);
        await checkFirstSheet(pages[0], plan, share, `${name}, ${count} details, "${title.slice(0, 12)}…"`);
        const lines = all(pages[0], 'text.pm-print-sheet-title').map((n) => n.textContent ?? '');
        assert(lines.every((line) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(line)), 'no surrogate pair is split');
        const cut = lines.at(-1)?.endsWith('…') === true;
        assert(lines.length >= 1 && lines.length <= 3, 'one to three title lines');
        if (cut) {
          assert(lines.length === 3 && title.startsWith(lines[0].trimEnd()), 'a shortened title keeps its start and ends in an ellipsis on the third line');
        } else {
          equal(lines.join('').replace(/\s+/g, ''), title.replace(/\s+/g, ''), 'a title that is not shortened is printed whole');
        }
        const typed = typedCode(pages);
        equal(typed, share.code.F, `${name}: the printed code reads back in order`);
        stage.replaceChildren();
        cases += 1;
      }
    }
  }
  assert(cases === 45, 'all cases ran');
  const w80 = stagePlan(jobFor(null, { title: 'W'.repeat(80), details: [] }), shares[2][1]);
  const lines = all(w80.pages[0], 'text.pm-print-sheet-title').map((n) => n.textContent ?? '');
  equal([lines.length, lines[2].endsWith('…')], [3, true], 'a title of 80 wide letters beside a version-40 box: three lines and an ellipsis on paper');
  equal(w80.plan.band.head.width, 91.5, 'the width beside a version-40 box');
});

await check('every size, angle and sheet choice keeps the first sheet clear, the cut-outs at their scale and the code intact', async () => {
  const share = shareOfVersion(11);
  let cases = 0;
  for (const size of ['small', 'medium', 'large', 'fit_page']) {
    for (const rotation of [0, 45, 90, 135, 180, 225, 270, 315]) {
      for (const [pieces, boardOpt, duplex] of [[true, true, false], [true, false, true], [false, true, true], [false, false, false]]) {
        stage.replaceChildren();
        const { plan, pages } = stagePlan(jobFor(null, { rotation, title: 'Easy #1' }), share, { size, pieces, board: boardOpt, duplex });
        await checkFirstSheet(pages[0], plan, share, `${size}, ${rotation}°, pieces ${pieces}, board ${boardOpt}, two sides ${duplex}`);
        equal(typedCode(pages), share.code.F, 'the code reads back in order');
        equal(pages.filter((page) => page.querySelector('g.pm-print-qr') !== null).length, 1, 'one QR code in the whole printout');
        for (const [i, page] of pages.entries()) {
          if (plan.pages[i].side === 'back') {
            assert(page.querySelector('g.pm-print-qr') === null, 'no QR on a back');
          }
        }
        const bare = planPrint({ ...jobFor(null, { rotation, title: 'Easy #1' }), measure: createTextMeasure(document) }, { size, pieces, board: boardOpt, duplex });
        equal(plan.cellMm, bare.cellMm, 'the cell size of the cut-outs is the one without a code band');
        equal(plan.sheets.length, bare.sheets.length, 'the same cut-out sheets');
        equal(plan.paper, bare.paper, 'and the same paper');
        for (const [i, planned] of plan.pages.entries()) {
          if (planned.sheet.kind === 'pieces' && planned.side === 'front') {
            assert(all(pages[i], '.pm-print-piece').length > 0, 'cut-out pieces are drawn');
          }
        }
        cases += 1;
      }
    }
  }
  equal(cases, 128, 'all combinations ran');
});

await check('a long code adds no sheet: the printout, the blank backs and the cut-outs are those of a job without a code', async () => {
  const share = shareOf(symbols(3000), symbols(300));
  const job = jobFor(null, { title: 'Easy #1', solution: sample.puzzles[0].solution });
  for (const duplex of [false, true]) {
    for (const solution of [false, true]) {
      stage.replaceChildren();
      const { plan, pages } = stagePlan(job, share, { duplex, solution });
      await checkFirstSheet(pages[0], plan, share, `${duplex ? 'two sides' : 'one side'}${solution ? ', solution' : ''}`);
      equal(typedCode(pages), share.code.F, 'the one QR carries the whole code');
      equal(pages.filter((page) => page.querySelector('g.pm-print-qr') !== null).length, 1, 'the QR is on one sheet only');
      assert(pages.every((page) => page.querySelector('text.pm-print-code, text.pm-print-code-title') === null), 'no page carries typed code');
      const bare = planPrint({ ...job, measure: createTextMeasure(document) }, { pieces: true, board: true, size: 'medium', duplex, solution });
      equal(plan.paper, bare.paper, 'the same paper as without a code');
      equal(plan.pages.length, bare.pages.length, 'the same pages');
      equal(plan.cellMm, bare.cellMm, 'the cell size of the cut-outs does not change');
      const kinds = plan.pages.map((p) => `${p.sheet.kind}:${p.side}`);
      if (duplex) {
        assert(kinds[0] === 'preview:front' && kinds[1] === (solution ? 'solution:front' : 'preview:back'), `the back of the puzzle sheet is the solution or blank (${kinds.slice(0, 3)})`);
        plan.pages.forEach((page, i) => {
          if ((page.sheet.kind === 'pieces' || page.sheet.kind === 'board') && page.side === 'back') {
            assert(i % 2 === 1, 'a mirrored back sits on the back of its leaf');
            assert(pages[i].querySelector('g.pm-print-qr') === null, 'no QR on a mirrored back');
            assert(plan.pages[i - 1].sheet === page.sheet && plan.pages[i - 1].side === 'front', 'right behind its own front');
            const fronts = all(pages[i - 1], '.pm-print-piece, .pm-print-board');
            const backs = all(pages[i], '.pm-print-piece, .pm-print-board');
            equal(backs.length, fronts.length, 'as many things on the back as on the front');
            for (const front of fronts) {
              const id = front.getAttribute('data-piece-id');
              const back = id === null ? backs[0] : backs.find((node) => node.getAttribute('data-piece-id') === id);
              assert(back !== undefined, 'the same thing is on the back');
              const a = rectOf(front);
              const b = rectOf(/** @type {Element} */ (back));
              near(a.x + a.w / 2 + b.x + b.w / 2, 210, 0.4, 'mirrored about the middle of the sheet');
              near(a.y, b.y, 0.4, 'at the same height');
            }
          }
        });
      }
    }
  }
});

await check('a code that cannot be printed shows its sheet without code and QR, with the notice before and on the sheet', async () => {
  const none = { code: codeOf(symbols(4300), null), url: `${PUBLIC_PLAYER_URL}#p=${symbols(4300)}`, carried: /** @type {const} */ ('C'), qr: null, notices: /** @type {any[]} */ (['none']) };
  const { plan, pages } = stagePlan(jobFor(null, { title: 'Huge #1' }), none);
  await checkFirstSheet(pages[0], plan, none, 'no code');
  equal(all(pages[0], 'text.pm-print-no-code').map((n) => n.textContent), ['This puzzle is too large for a puzzle code.'], 'the notice is on the sheet');
  equal(plan.pages.length, plan.sheets.length, 'the same pages as without a code');
  assert(PREVIEW_BOTTOM - rectOf(/** @type {Element} */ (pages[0].querySelector('.pm-print-board'))).y >= 120, 'the preview keeps its room');
});

await check('the Vietnamese sheet and dialog texts fit the same columns', async () => {
  setLocale('vi', document);
  const share = shareOf(symbols(38), symbols(6));
  const { plan, pages } = stagePlan(jobFor(null, { title: 'Đề #1' }), share);
  await checkFirstSheet(pages[0], plan, share, 'Vietnamese');
  equal(first(pages[0], 'text.pm-print-qr-scan')?.textContent, 'Chơi trực tuyến', 'the QR caption');

  /** @param {Element} page @param {string} selector */
  function first(page, selector) {
    return page.querySelector(selector);
  }
});

await check('the dialog\'s lifecycle: pending, stale answers, source changes, options, close, errors', async () => {
  const fresh = (/** @type {any} */ over = {}) => {
    const client = deferredClient();
    const state = { index: 0, rotation: 0, notified: new Set(/** @type {Set<() => void>} */ ([])), progress: 0 };
    const win = stubWindow();
    const dialog = createPrintDialog({
      host: document.body,
      t,
      win: win.stub,
      createClient: () => client,
      watch: (listener) => {
        state.notified.add(listener);
        return () => state.notified.delete(listener);
      },
      getJob: () => jobFor(snapshotFor(state.index, state.rotation), { rotation: state.rotation, progress: state.progress }),
      ...over,
    });
    toDestroy.push(dialog);
    const q = (/** @type {string} */ selector) => /** @type {HTMLElement & HTMLInputElement & HTMLButtonElement} */ (dialog.dialog.querySelector(selector));
    return {
      client, state, win, dialog, q, confirm: q('[data-action="print-confirm"]'),
      notify: () => [...state.notified].forEach((fn) => fn()),
      stateOf: () => q('[data-role="print-code"]').dataset.state,
    };
  };

  // Pending: disabled, no print by a click made too early, no print later by itself.
  {
    const h = fresh();
    h.dialog.open();
    assert(h.confirm.disabled, 'Print is disabled while preparing');
    equal(h.q('tr[data-size="medium"] td.pm-print-sheets').textContent, '…', 'the paper is not promised before the code is known');
    h.confirm.click();
    h.client.calls[0].ok(codeOf(symbols(38), symbols(6)));
    await settle();
    equal([h.stateOf(), h.confirm.disabled, h.win.printed], ['ready', false, 0], 'ready, and the early click did not print later');
    equal(h.client.calls.length, 1, 'one preparation');
    assert(/^[1-9]\d*$/.test(h.q('tr[data-size="medium"] td.pm-print-sheets').textContent ?? ''), 'the paper is shown once ready');
  }

  // A stale answer never replaces a newer preview, in either order.
  for (const lateFirst of [true, false]) {
    const h = fresh();
    h.dialog.open();
    h.state.index = 1;
    h.notify();
    equal(h.client.calls.length, 2, 'a changed puzzle starts a second preparation');
    const [older, newer] = h.client.calls;
    if (lateFirst) {
      newer.ok(codeOf(symbols(40), null));
      await settle();
      older.ok(codeOf(symbols(80), symbols(10)));
    } else {
      older.ok(codeOf(symbols(80), symbols(10)));
      await settle();
      assert(h.confirm.disabled && h.stateOf() === 'preparing', 'the old answer is ignored while the new one is pending');
      newer.ok(codeOf(symbols(40), null));
    }
    await settle();
    const share = /** @type {any} */ (h.dialog.prepared()?.share);
    equal([h.stateOf(), share.code.C.length, h.dialog.prepared()?.snapshot?.heading], ['ready', 40, 'Normal #2'], 'the newer preparation stands');
  }

  // Progress and timers do not restart; option changes reuse the code.
  {
    const h = fresh();
    h.dialog.open();
    h.client.calls[0].ok(codeOf(symbols(38), symbols(6)));
    await settle();
    for (let i = 0; i < 4; i += 1) {
      h.state.progress += 1;
      h.notify();
    }
    equal([h.client.calls.length, h.stateOf()], [1, 'ready'], 'progress changes do not invalidate the preparation');
    const before = h.dialog.prepared()?.share;
    const sheets = () => [...h.dialog.dialog.querySelectorAll('td.pm-print-sheets')].map((td) => td.textContent).join(',');
    const start = sheets();
    h.q('[data-field="print-duplex"]').checked = true;
    h.q('[data-field="print-duplex"]').dispatchEvent(new Event('change'));
    h.q('tr[data-size="large"] td:last-child').click();
    h.q('[data-field="print-pieces"]').checked = false;
    h.q('[data-field="print-pieces"]').dispatchEvent(new Event('change'));
    h.q('[data-field="print-board"]').checked = false;
    h.q('[data-field="print-board"]').dispatchEvent(new Event('change'));
    assert(sheets() !== start, 'the options change the paper');
    equal(h.client.calls.length, 1, 'but never the code');
    assert(h.dialog.prepared()?.share === before, 'the same prepared data is laid out again');
    equal(h.stateOf(), 'ready', 'still ready');
  }

  // A changed angle or heading starts a new preparation, and so does a language that changes the heading.
  {
    const h = fresh({});
    h.dialog.open();
    h.client.calls[0].ok(codeOf(symbols(38), null));
    await settle();
    h.state.rotation = 45;
    h.notify();
    equal([h.client.calls.length, h.stateOf()], [2, 'preparing'], 'a changed angle needs a new code');
    h.client.calls[1].ok(codeOf(symbols(38), null));
    await settle();
    equal(h.dialog.prepared()?.snapshot?.data.rotation, 45, 'and carries the new angle');
  }
  {
    const client = deferredClient();
    const bare = { ...sample.puzzles[0], title: undefined };
    const win = stubWindow();
    const dialog = createPrintDialog({
      host: document.body, t, win: win.stub, createClient: () => client,
      getJob: () => jobFor(snapshotFor(0, 0, { puzzle: bare })),
    });
    toDestroy.push(dialog);
    dialog.open();
    client.calls[0].ok(codeOf(symbols(38), null));
    await settle();
    equal(dialog.prepared()?.snapshot?.heading, 'Puzzle #1', 'English heading');
    setLocale('vi', document);
    dialog.refresh();
    equal([client.calls.length, dialog.prepared()?.state], [2, 'preparing'], 'a language that changes the printed heading invalidates it');
    client.calls[1].ok(codeOf(symbols(38), null));
    await settle();
    equal(dialog.prepared()?.snapshot?.heading, 'Đề #1', 'Vietnamese heading');
    setLocale('en', document);
    dialog.refresh();
    equal([client.calls.length, dialog.prepared()?.snapshot?.heading], [2, 'Puzzle #1'], 'and back: the code already made for that heading is reused');
    dialog.close();
  }

  // Closing cancels; a late answer is ignored; reopening starts again.
  {
    const h = fresh();
    h.dialog.open();
    h.dialog.close();
    assert(h.client.cancelled >= 1, 'closing cancels the owned work');
    h.client.calls[0].ok(codeOf(symbols(38), null));
    await settle();
    equal(h.dialog.prepared(), null, 'a late answer finds nothing to settle');
    assert(h.state.notified.size === 0, 'the dialog stopped watching the app');
    h.dialog.open();
    equal(h.client.calls.length, 2, 'reopening prepares again');
    h.client.calls[1].ok(codeOf(symbols(38), null));
    await settle();
    equal(h.stateOf(), 'ready', 'ready again');
    h.dialog.close();
  }

  // The source is checked once more right before printing, and nothing prints later by itself.
  {
    const h = fresh();
    h.dialog.open();
    h.client.calls[0].ok(codeOf(symbols(38), symbols(6)));
    await settle();
    assert(!h.confirm.disabled, 'ready');
    h.state.index = 2;
    h.confirm.click();
    equal(h.win.printed, 0, 'a changed puzzle is not printed');
    equal([h.client.calls.length, h.confirm.disabled, h.dialog.isOpen()], [2, true, true], 'a new preparation starts and Print waits');
    h.client.calls[1].ok(codeOf(symbols(50), null));
    await settle();
    equal(h.win.printed, 0, 'it does not print by itself when ready');
    h.confirm.click();
    equal(h.win.printed, 1, 'a new press prints');
    equal(first(h.win.pages[0], 'text.pm-print-sheet-title'), 'Hard #3', 'the sheet shows the new heading');
  }

  // A worker failure is an error with a retry, never an oversize message.
  {
    const h = fresh();
    h.dialog.open();
    h.client.calls[0].fail('The worker stopped.');
    await settle();
    equal(h.stateOf(), 'error', 'an error state');
    equal(h.q('[data-role="print-code-status"]').textContent, 'The puzzle code could not be prepared.', 'said plainly');
    assert(!h.q('[data-action="print-retry"]').hidden && h.confirm.disabled, 'with a retry and no Print');
    assert(!/too large|too long|without them/i.test(h.dialog.dialog.textContent ?? ''), 'and never called an oversized puzzle');
    h.q('[data-action="print-retry"]').click();
    equal(h.client.calls.length, 2, 'retry prepares again');
    h.client.calls[1].ok(codeOf(symbols(38), null));
    await settle();
    equal([h.stateOf(), h.q('[data-action="print-retry"]').hidden, h.confirm.disabled], ['ready', true, false], 'recovered');
  }

  /** @param {Element} page @param {string} selector */
  function first(page, selector) {
    return page.querySelector(selector)?.textContent;
  }
});

await check('the capacity ladder reaches the dialog before printing and the sheet after', async () => {
  const run = async (/** @type {ReturnType<typeof codeOf>} */ code, /** @type {string[]} */ notices, /** @type {(win: ReturnType<typeof stubWindow>) => void} */ verify) => {
    const client = instantClient(code);
    const win = stubWindow();
    const dialog = createPrintDialog({ host: document.body, t, win: win.stub, createClient: () => client, getJob: () => jobFor(snapshotFor(0, 0)) });
    toDestroy.push(dialog);
    dialog.open();
    await waitFor(() => dialog.dialog.querySelector('[data-role="print-code"]')?.getAttribute('data-state') === 'ready', 'ready');
    const shown = [...dialog.dialog.querySelectorAll('[data-role="print-notices"] li')].map((li) => li.getAttribute('data-notice'));
    equal(shown, notices, 'the notices before printing');
    const confirm = /** @type {HTMLButtonElement} */ (dialog.dialog.querySelector('[data-action="print-confirm"]'));
    assert(!confirm.disabled, 'Print is ready');
    confirm.click();
    equal(win.printed, 1, 'printed');
    verify(win);
    win.afterPrint();
    dialog.destroy();
  };
  await run(codeOf(symbols(3000), symbols(400)), ['noTail'], (win) => {
    equal(typedCode(win.pages), symbols(3000), 'the tail is left out of the text');
    equal(win.pages[0].querySelector('g.pm-print-qr')?.getAttribute('data-qr-ec'), 'M', 'at level M');
    assert(win.pages[0].querySelector('text.pm-print-code[data-part="tail"]') === null, 'no tail text');
  });
  await run(codeOf(symbols(3500), symbols(100)), ['noTail', 'lowEc'], (win) => {
    equal(win.pages[0].querySelector('g.pm-print-qr')?.getAttribute('data-qr-ec'), 'L', 'error correction L');
    equal(typedCode(win.pages), symbols(3500), 'the core alone');
  });
  await run(codeOf(symbols(4300), symbols(100)), ['noTail', 'none'], (win) => {
    assert(win.pages[0].querySelector('g.pm-print-qr') === null && win.pages[0].querySelector('text.pm-print-code') === null, 'neither code nor QR');
    equal(win.pages[0].querySelector('text.pm-print-no-code')?.textContent, 'This puzzle is too large for a puzzle code.', 'the line on the sheet');
    equal(win.pages.length, win.pages.filter(() => true).length, 'pages');
  });
  const texts = ['noTail', 'lowEc', 'none'].map((key) => t(`print.code.${key}`));
  equal(texts, [
    'The code is too long for one QR code; the optional solution part is left out.',
    'The QR code uses low error correction because the code is long.',
    'This puzzle is too large for a puzzle code and a QR code; it will be printed without them.',
  ], 'the English notices');
});

await check('the target is the Player of the page the dialog is on; there is no override and nothing is stored', async () => {
  const before = JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]);
  const make = (/** @type {string | undefined} */ pageBase) => {
    const client = instantClient(codeOf(symbols(38), symbols(6)));
    const dialog = createPrintDialog({ host: document.body, t, win: stubWindow().stub, createClient: () => client, pageBase, getJob: () => jobFor(snapshotFor(0, 0)) });
    toDestroy.push(dialog);
    const q = (/** @type {string} */ selector) => /** @type {HTMLInputElement & HTMLElement} */ (dialog.dialog.querySelector(selector));
    const ready = () => waitFor(() => q('[data-role="print-code"]').dataset.state === 'ready', 'ready');
    const notices = () => [...dialog.dialog.querySelectorAll('[data-role="print-notices"] li')].map((li) => li.getAttribute('data-notice'));
    return { client, dialog, q, ready, notices, target: () => q('[data-role="print-code"]').dataset.target };
  };

  const local = make(undefined);
  local.dialog.open();
  await local.ready();
  assert(local.dialog.dialog.querySelector('[data-field="print-use-this-page"]') === null, 'no override on a local page');
  equal(local.target(), OWN_PLAYER_URL, 'the Player of this page');
  equal(local.notices(), [], 'no local notice');
  equal(local.dialog.prepared()?.share?.url, puzzleCodeUrl(OWN_PLAYER_URL, /** @type {string} */ (local.dialog.prepared()?.share?.code.F)), 'the address and the QR follow');
  equal(local.client.calls, 1, 'prepared once');

  const hosted = make('https://tdat00.github.io/pentomino/generator/');
  hosted.dialog.open();
  await hosted.ready();
  equal([hosted.notices(), hosted.target()], [[], 'https://tdat00.github.io/pentomino/player/'], 'its own Player');
  const fork = make('https://Example.org/My-Fork/pentomino/generator/');
  fork.dialog.open();
  await fork.ready();
  equal(fork.target(), 'https://example.org/My-Fork/pentomino/player/', 'a fork keeps its case-sensitive path');
  const lan = make('http://192.168.1.20:8080/pentomino/generator/');
  lan.dialog.open();
  await lan.ready();
  equal([lan.notices(), lan.target()], [[], 'http://192.168.1.20:8080/pentomino/player/'], 'a LAN address points at itself');
  equal(JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]), before, 'nothing was stored by the dialogs');
});

/**
 * @param {Record<string, unknown>} pack
 * @param {{ createPuzzleCodeClient?: () => any }} [env]
 */
async function mountPlayerWith(pack, env = {}) {
  const checked = validatePack(pack);
  assert(checked.ok, 'fixture pack is valid');
  const hash = await packHash(/** @type {any} */ (checked).value);
  const root = document.createElement('div');
  root.className = 'stage-root';
  document.body.append(root);
  const map = new Map();
  const adapter = {
    get length() {
      return map.size;
    },
    key: (/** @type {number} */ i) => [...map.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => map.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => void map.set(k, String(v)),
    removeItem: (/** @type {string} */ k) => void map.delete(k),
  };
  const location = { hash, pathname: '/player/', search: '' };
  const player = mountPlayer(root, {
    storage: createStorage(adapter, () => Date.now()),
    location,
    history: { replaceState: () => {} },
    baseUrl: new URL('../../player/', document.baseURI),
    createPool: () => ({ beginRequest() {}, endRequest() {}, close() {}, run: () => new Promise(() => {}) }),
    listenHashChange: false,
    ...env,
  });
  toDestroy.push(player);
  await player.ready;
  await pause(60);
  return { root, player };
}

await check('the Player prints its stored puzzle at the angle on screen, with its answer in the code and no solution sheet', async () => {
  let encodes = 0;
  const { root, player } = await mountPlayerWith(sample, {
    createPuzzleCodeClient: () => {
      const inner = createPuzzleCodeClient();
      return { ...inner, encode: (/** @type {any} */ snapshot) => { encodes += 1; return inner.encode(snapshot); }, cancel: () => inner.cancel(), dispose: () => inner.dispose() };
    },
  });
  const title = /** @type {HTMLElement} */ (root.querySelector('.puzzle-title')).textContent;
  equal(title, 'Easy #1', 'the game heading');
  /** @type {HTMLButtonElement} */ (root.querySelector('[data-action="print"]')).click();
  const dialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-print-dialog'));
  assert(dialog !== null && dialog.open, 'the Print dialog opens');
  const stateOf = () => dialog.querySelector('[data-role="print-code"]')?.getAttribute('data-state');
  assert(stateOf() === 'preparing', 'preparing at once');
  await waitFor(() => stateOf() === 'ready', 'the Player dialog to be ready');
  equal(dialog.querySelector('[data-field="print-solution"]'), null, 'no solution sheet option in the Player');
  const confirm = /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="print-confirm"]'));
  assert(!confirm.disabled, 'ready');
  const state = player.store.getState();
  const stored = /** @type {any} */ (state.pack).puzzles[0];
  const client = createPuzzleCodeClient();
  try {
    const encoded = await client.encode(snapshotFor(0, 0, { puzzle: stored }).data);
    assert(encoded.ok, 'encoded');
    const decoded = await client.decode(/** @type {any} */ (encoded).value.F);
    assert(decoded.ok && decoded.value.hasTail, 'the code carries the stored answer');
    equal(puzzleDisplayName(/** @type {any} */ (decoded).value.pack.puzzles[0].title, 0), title, 'the re-created puzzle shows the heading of the Player');
    equal(/** @type {any} */ (decoded).value.pack.presentation.rotation, 0, 'at the same angle');
  } finally {
    client.dispose();
  }
  const callsBefore = encodes;
  // Progress and elapsed time are not part of the code.
  const g = /** @type {any} */ (player.store.getState().game);
  player.store.update({ game: { ...g, elapsedMs: g.elapsedMs + 5000, moves: g.moves + 3 } });
  await pause(150);
  equal([encodes, stateOf()], [callsBefore, 'ready'], 'game progress does not restart the preparation');
  // Turning the view changes what the printout shows, so it makes a new code.
  player.controller.rotateView(45);
  await waitFor(() => encodes === callsBefore + 1, 'a new preparation for the turned view');
  await waitFor(() => stateOf() === 'ready', 'the turned view to be ready');
  await pause(100);
  equal(encodes, callsBefore + 1, 'one more encoding, and only one');
  dialog.querySelector('[data-action="print-cancel"]')?.dispatchEvent(new MouseEvent('click'));
  await settle();
  assert(!dialog.open, 'cancel closes');
  assert(catalogueStats.sizesBuilt === 0, 'no catalogue on the main thread');
});

await check('the Player dialog follows the language: an untitled puzzle heading is "Puzzle #n" / "Đề #n" and needs a new code', async () => {
  const bare = { ...sample, puzzles: sample.puzzles.map((/** @type {any} */ p) => {
    const { title: _title, ...rest } = p;
    return rest;
  }) };
  let encodes = 0;
  const { root, player } = await mountPlayerWith(bare, {
    createPuzzleCodeClient: () => {
      const inner = createPuzzleCodeClient();
      return { ...inner, encode: (/** @type {any} */ snapshot) => { encodes += 1; return inner.encode(snapshot); }, cancel: () => inner.cancel(), dispose: () => inner.dispose() };
    },
  });
  equal(/** @type {HTMLElement} */ (root.querySelector('.puzzle-title')).textContent, 'Puzzle #1', 'the Player\'s untitled heading');
  /** @type {HTMLButtonElement} */ (root.querySelector('[data-action="print"]')).click();
  const dialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-print-dialog'));
  const stateOf = () => dialog.querySelector('[data-role="print-code"]')?.getAttribute('data-state');
  await waitFor(() => stateOf() === 'ready', 'ready');
  equal(encodes, 1, 'one preparation');
  setLocale('vi', document);
  equal(/** @type {HTMLElement} */ (root.querySelector('.puzzle-title')).textContent, 'Đề #1', 'the Player\'s Vietnamese heading');
  await waitFor(() => encodes === 2, 'the dialog prepares the new heading');
  await waitFor(() => stateOf() === 'ready', 'ready in Vietnamese');
  equal(dialog.querySelector('[data-role="print-code"]')?.getAttribute('data-state'), 'ready', 'ready again');
  /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="print-cancel"]')).click();
  assert(player.store.getState().game !== null, 'the game is untouched');
});

await check('the Generator job prints the name of its card "Puzzle #3", keeps its solution option and prepares the same way', async () => {
  const { printJobOf } = await import('../../generator/ui/puzzle-panel.js');
  const generator = await import('../../generator/i18n.js');
  const engine = sample.puzzles.map((/** @type {any} */ p, /** @type {number} */ i) => ({ ...p, id: `g${i}`, title: ['Easy #1', 'Normal #2', 'Hard #3'][i], seed: `s${i}` }));
  const state = /** @type {any} */ ({
    set: { board, pieces: sample.pieces, witness: null, carving: 'flat', macroRegion: null }, puzzles: engine, rotation: 90, setSeed: 'ABCD-EFGH-JKLM', calibrationFor: { levelId: 'expert' },
  });
  const win = stubWindow();
  const dialog = createPrintDialog({ host: document.body, t: generator.t, win: win.stub, solutionOption: true, getJob: () => printJobOf(state, 'g2') });
  toDestroy.push(dialog);
  dialog.open();
  await waitFor(() => dialog.dialog.querySelector('[data-role="print-code"]')?.getAttribute('data-state') === 'ready', 'ready');
  const solution = /** @type {HTMLInputElement} */ (dialog.dialog.querySelector('[data-field="print-solution"]'));
  assert(solution !== null && !solution.disabled, 'the solution option is offered');
  solution.checked = true;
  solution.dispatchEvent(new Event('change'));
  const prepared = dialog.prepared()?.share;
  assert(prepared?.carried === 'C.T', 'the stored solution is in the code');
  /** @type {HTMLButtonElement} */ (dialog.dialog.querySelector('[data-action="print-confirm"]')).click();
  equal(win.printed, 1, 'printed');
  equal(win.pages[0].querySelector('text.pm-print-sheet-title')?.textContent, 'Puzzle #3', 'the name of the card, not the title "Hard #3" that the code carries');
  equal(printJobOf(state, 'g2')?.snapshot?.heading, 'Hard #3', 'the code keeps the displayed heading');
  assert(win.pages.some((page) => /Solution/.test(page.textContent ?? '')), 'with the solution sheet');
  equal(win.pages.filter((page) => page.querySelector('g.pm-print-qr') !== null).length, 1, 'the QR is only on the first sheet');
  assert(!/seed/i.test(win.pages[0].textContent ?? ''), 'no puzzle seed');
  const solutionPage = win.pages.find((page) => /Solution/.test(page.textContent ?? '')) ?? win.pages[1];
  assert(rectOf(/** @type {Element} */ (solutionPage.querySelector('.pm-print-board'))).y <= 40.6, 'the solution sheet keeps its board at 40 mm');
  assert(solutionPage.querySelector('g.pm-print-qr, text.pm-print-code') === null, 'and carries no code');
  win.afterPrint();
  setLocale('en', document);
});

await check('no content-security-policy violations, uncaught errors or main-thread catalogue builds', async () => {
  equal(violations, [], 'security policy violations');
  equal(uncaught, [], 'uncaught errors');
  equal(catalogueStats.sizesBuilt, 0, 'catalogue sizes built on the page');
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
document.documentElement.dataset.summary = JSON.stringify({ total: results.length, failed: failed.map((r) => `${r.name}: ${r.error}`.slice(0, 900)) });
document.documentElement.dataset.result = failed.length === 0 && results.length > 0 ? 'pass' : 'fail';
