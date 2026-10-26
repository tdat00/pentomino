// @ts-check
// T23 cross-app acceptance harness. It drives the REAL generator and player pages (unmodified HTML, CSS and
// modules) in same-origin frames: root redirect, the three recorded production recipes through the real
// controls and real module workers, Play hand-off, the ways the player opens a puzzle, desktop and narrow
// layouts, touch-target size, contrast, accessible names and CSP / external-request hygiene. Each check is
// pass / fail; checks that need hardware or tools that were not approved are listed as `blocked` with
// the owner steps, never as passes. It writes the list into the page and sets data-result on <html> to
// `pass` (no failure; blocked items are reported separately) or `fail`. It is a developer fixture, not deployed.


/** @typedef {{ id: string, name: string, status: 'pass' | 'fail' | 'blocked', detail?: unknown }} Result */

/** @type {Result[]} */
const results = [];
/** @type {string[]} */
const problems = [];
/** @type {Set<string>} */
const external = new Set();
/** @type {Set<string>} */
const resources = new Set();
document.addEventListener('securitypolicyviolation', (e) => problems.push(`csp ${e.violatedDirective} ${e.blockedURI}`));

/**
 * @param {string} id
 * @param {string} name
 * @param {() => unknown | Promise<unknown>} fn Returns optional evidence; throwing fails the check.
 */
async function check(id, name, fn) {
  try {
    const detail = await fn();
    results.push({ id, name, status: 'pass', detail });
  } catch (error) {
    results.push({ id, name, status: 'fail', detail: String(/** @type {Error} */ (error)?.message ?? error) });
  }
}

/**
 * @param {string} id
 * @param {string} name
 * @param {string} reason
 */
function blocked(id, name, reason) {
  results.push({ id, name, status: 'blocked', detail: reason });
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

const sleep = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {() => unknown} test
 * @param {string} what
 * @param {number} [timeoutMs]
 */
async function waitFor(test, what, timeoutMs = 60000) {
  const start = performance.now();
  for (;;) {
    let value = false;
    try {
      value = Boolean(test());
    } catch {
      value = false;
    }
    if (value) {
      return;
    }
    if (performance.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await sleep(25);
  }
}

const recipes = /** @type {any[]} */ ((await (await fetch('../fixtures/ui-flow-recipes.json')).json()).recipes);
const frameHost = /** @type {HTMLElement} */ (document.getElementById('frames'));

/**
 * @typedef {object} Frame
 * @property {HTMLIFrameElement} el
 * @property {() => Document} doc
 * @property {() => Window & typeof globalThis} win
 */

/** Records what the page under test requested. @param {Frame} frame */
function scan(frame) {
  try {
    for (const entry of frame.win().performance.getEntriesByType('resource')) {
      resources.add(entry.name);
      if (new URL(entry.name).origin !== location.origin) {
        external.add(entry.name);
      }
    }
  } catch (error) {
    problems.push(`scan: ${String(error)}`);
  }
}

/**
 * @param {string} path Relative to this page.
 * @param {{ width?: number, height?: number, hash?: string, ready?: (d: Document) => boolean }} [o]
 * @returns {Promise<Frame>}
 */
async function openFrame(path, o = {}) {
  const el = document.createElement('iframe');
  el.title = path;
  el.style.width = `${o.width ?? 1280}px`;
  el.style.height = `${o.height ?? 900}px`;
  el.style.border = '1px solid #888';
  frameHost.replaceChildren(el);
  const loaded = new Promise((resolve) => el.addEventListener('load', resolve, { once: true }));
  el.src = new URL(path, location.href).href + (o.hash ?? '');
  await loaded;
  /** @type {Frame} */
  const frame = { el, doc: () => /** @type {Document} */ (el.contentDocument), win: () => /** @type {any} */ (el.contentWindow) };
  const win = frame.win();
  for (const type of ['error', 'unhandledrejection', 'securitypolicyviolation']) {
    win.addEventListener(type, (/** @type {any} */ e) => problems.push(`${path}: ${type} ${e.message ?? e.reason ?? `${e.violatedDirective} ${e.blockedURI}`}`));
  }
  const ready = o.ready;
  if (ready !== undefined) {
    await waitFor(() => ready(frame.doc()), `${path} to be ready`, 20000);
  }
  return frame;
}

/** @param {Document} d */
const generatorReady = (d) => d.documentElement.dataset.ready === 'true';
/** @param {Document} d */
const playerReady = (d) => d.querySelector('#app[data-screen]') !== null;

/**
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {HTMLElement}
 */
function q(root, selector) {
  const found = /** @type {HTMLElement | null} */ (root.querySelector(selector));
  assert(found, `missing ${selector}`);
  return /** @type {HTMLElement} */ (found);
}

/**
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {HTMLElement[]}
 */
const qa = (root, selector) => /** @type {HTMLElement[]} */ ([...root.querySelectorAll(selector)]);

/**
 * @param {Frame} frame
 * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} input
 * @param {string} value
 */
function setValue(frame, input, value) {
  const Event = frame.win().Event;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** @param {Element} node */
const rect = (node) => node.getBoundingClientRect();

// ---------------------------------------------------------------------------------------------------------------
// R: root, prefix and version

await check('R1', 'Root page redirects to the generator under the served prefix, keeping the module graph relative', async () => {
  const frame = await openFrame('../../index.html', { ready: (d) => d.defaultView?.location.pathname.endsWith('/generator/') === true && generatorReady(d) });
  const path = frame.win().location.pathname;
  assert(path.endsWith('/generator/'), `landed on ${path}`);
  scan(frame);
  return { landedOn: path, harnessPath: location.pathname, prefixServed: location.pathname.startsWith('/pentomino/') };
});

// ---------------------------------------------------------------------------------------------------------------
// F: the three recorded production flows through the real generator page and into the real player page

/** @type {Record<string, string[]>} */
const playLinks = {};

/**
 * @param {any} recipe
 */
async function runRecipe(recipe) {
  localStorage.clear();
  const frame = await openFrame('../../generator/index.html', { ready: generatorReady });
  const d = frame.doc();
  if (recipe.name.startsWith('heart')) {
    setValue(frame, /** @type {HTMLSelectElement} */ (q(d, '[data-field="preset"]')), 'heart');
  } else if (recipe.boardRows[0].length !== 10 || recipe.boardRows.length !== 6) {
    setValue(frame, /** @type {HTMLInputElement} */ (q(d, '[data-field="columns"]')), String(recipe.boardRows[0].length));
    setValue(frame, /** @type {HTMLInputElement} */ (q(d, '[data-field="rows"]')), String(recipe.boardRows.length));
  }
  const radio = /** @type {HTMLInputElement} */ (q(d, `[data-field="level"] input[value="${recipe.levelId}"]`));
  assert(!radio.disabled, `${recipe.levelId} is offered for this board`);
  radio.click();
  setValue(frame, /** @type {HTMLInputElement} */ (q(d, '[data-field="seed"]')), recipe.seedText);
  const start = performance.now();
  q(d, '[data-action="generate-set"]').click();
  await waitFor(() => qa(d, '[data-role="pieces"] li').length > 0 && /** @type {HTMLElement} */ (q(d, '[data-action="generate-set"] .spinner')).hidden, 'the piece set', 150000);
  const setMs = Math.round(performance.now() - start);
  assert(qa(d, '[data-role="pieces"] li').length === recipe.expect.pieces, `${qa(d, '[data-role="pieces"] li').length} pieces, recorded ${recipe.expect.pieces}`);
  assert(qa(d, '[data-role="notice"] .notice').length === 0, `notice after the set: ${q(d, '[data-role="notice"]').textContent}`);
  const select = /** @type {HTMLButtonElement} */ (q(d, '[data-action="select-set"]'));
  const setBox = q(d, '[data-role="pieces"]').getBoundingClientRect();
  assert(!select.hidden && select.textContent === 'Select this piece set' && select.getBoundingClientRect().top >= setBox.bottom - 1, 'Select this set sits under the piece set');
  select.click();
  assert(!(/** @type {HTMLElement} */ (q(d, '[data-step="3"]'))).hidden, 'Select this set opens step 3');
  const summaryLines = qa(d, '[data-role="set-summary-card"] p').map((n) => n.textContent);
  assert(!(/** @type {HTMLElement} */ (q(d, '[data-step-after="2"]'))).hidden && summaryLines.length === 3, `the side panel shows the set summary on step 3: ${summaryLines}`);
  assert(summaryLines[0] === 'Set 1/1' && summaryLines[1]?.endsWith(`| ${recipe.seedText}`) && summaryLines[2]?.includes(`${recipe.expect.pieces} pieces`), `summary lines: ${summaryLines}`);
  const setSummary = /** @type {HTMLElement} */ (q(d, '[data-step-after="2"]'));
  assert(q(d, '#heading-history').textContent === 'Puzzles of set 1/1', `the header of the puzzle list names its set: ${q(d, '#heading-history').textContent}`);
  assert(setSummary.getAttribute('role') === 'button', 'the piece set summary is a button');
  setSummary.click();
  assert(!(/** @type {HTMLElement} */ (q(d, '[data-step="2"]'))).hidden && setSummary.hidden, 'clicking the piece set summary opens step 2, like its header');
  q(d, '[data-wizard-step="3"]').click();
  const stepBody3 = /** @type {HTMLElement} */ (q(d, '[data-step-body="3"]'));
  assert(!stepBody3.hidden && q(d, '[data-field="puzzle-level"]').closest('[data-step-body="3"]') !== null && q(d, '[data-action="new-puzzles"]').closest('[data-step-body="3"]') !== null,
    'Level, Require unique solution and New Puzzle live in the right panel, under step 3');
  assert(/** @type {HTMLElement} */ (q(d, '[data-slot="main-action"]')).hidden && q(d, '[data-slot="main-action"]').getBoundingClientRect().width === 0
    && q(d, '[data-slot="main-back"]').textContent === 'Step 2 - Create piece set',
    'step 3 has only the way back to step 2 in the navigator');
  assert(['[data-field="quantity"]', '[data-action="add-more"]', '[data-action="play-all"]', '[data-action="export-pack"]', '[data-action="copy-pack-link"]'].every((s) => d.querySelector(s) === null),
    'Quantity, Add more, Play all, Export pack and Copy pack link are gone');
  const batchStart = performance.now();
  q(d, '[data-action="new-puzzles"]').click();
  await waitFor(() => qa(d, '.puzzle-card').length >= 1 && /** @type {HTMLElement} */ (q(d, '[data-action="new-puzzles"] .spinner')).hidden, 'the puzzle', 150000);
  const batchMs = Math.round(performance.now() - batchStart);
  assert(qa(d, '.puzzle-card').length === 1, `${qa(d, '.puzzle-card').length} cards, one puzzle per press`);
  assert(qa(d, '[data-role="notice"] .notice').length === 0, `notice after the puzzle: ${q(d, '[data-role="notice"]').textContent}`);
  const scores = qa(d, '.card-rating').map((n) => Number(/score (\d+)/.exec(n.textContent ?? '')?.[1] ?? NaN));
  assert(Number.isFinite(scores[0]), `the card shows a score: ${scores}`);
  const cardLines = qa(d, '.puzzle-card .card-body > p').map((n) => n.textContent ?? '');
  assert(cardLines.length === 4 && cardLines[0] === 'Puzzle #1' && /^\w[\w ]*: score \d+\+?$/.test(cardLines[1])
    && /^\d+ pieces? to place$/.test(cardLines[2]) && /^(Unique solution ✓|Multiple solutions|Checking…|Uniqueness not checked|At least 1 solution|No solution exists)$/.test(cardLines[3]),
  `the card shows number, level and score, pieces to place and solutions: ${cardLines}`);
  assert(/^Seed: \d+$/.test(q(d, '.detail-seed').textContent ?? '') && q(d, '.detail-seed').parentElement === q(d, '.detail-title').parentElement, 'the seed is next to the name in the main panel');
  assert(qa(d, '.puzzle-card a').length === 0 && qa(d, '.puzzle-card button').every((b) => b.dataset.action === 'remove' || b.dataset.action === 'select'), 'the card only has its select and remove buttons');
  assert(!(/** @type {HTMLButtonElement} */ (q(d, '[data-action="remove-all-puzzles"]'))).disabled && q(d, '[data-action="remove-all-puzzles"]').closest('.app-history') !== null,
    'Remove all sits in the left panel and is enabled once there is a puzzle');
  const toPlace = Number(/^(\d+)/.exec(cardLines[2])?.[1] ?? NaN);
  // The cards have no Play button: the link is built from the pack the generator saved, as the old button did.
  const { browserStorage } = await import('../../core/browser/storage.js');
  const { preparePlayerLink } = await import('../../core/browser/handoff.js');
  const { validatePack } = await import('../../core/engine/pack.js');
  /** @type {any} */
  let savedState = null;
  await waitFor(() => {
    savedState = browserStorage().getGeneratorState();
    return Array.isArray(savedState?.puzzles) && savedState.puzzles.length > 0;
  }, 'the generator to save the puzzle', 10000);
  const validated = validatePack({ ...savedState.setPack, kind: 'puzzle-pack', puzzles: savedState.puzzles });
  assert(validated.ok, 'the saved puzzle pack is valid');
  const link = await preparePlayerLink(/** @type {any} */ (validated).value, 0, { base: new URL('../../generator/', location.href).href });
  assert(link.href !== null, 'a player link can be made');
  const hrefs = [/** @type {string} */ (link.href)];
  playLinks[recipe.name] = hrefs;
  scan(frame);
  frame.win().location.assign(hrefs[0]);
  await waitFor(() => {
    const w = frame.win();
    return w.location.pathname.endsWith('/player/') && w.document.querySelector('#app[data-screen="game"]') !== null;
  }, 'the player to open the puzzle', 30000);
  const p = frame.doc();
  const trayPieces = qa(p, '.tray-piece').length;
  assert(trayPieces === toPlace, `tray shows ${trayPieces} pieces, the card says ${toPlace} to place`);
  assert(p.querySelector('.pm-board svg') !== null, 'the board is drawn');
  assert((q(p, '.puzzle-title').textContent ?? '').trim() !== '', 'the title is shown');
  scan(frame);
  return { setMs, batchMs, scores, toPlace, trayPieces, playerTitle: q(p, '.puzzle-title').textContent, hrefChars: hrefs[0].length };
}

for (const recipe of recipes) {
  await check(`F-${recipe.name}`, `${recipe.name}: Generate Piece Set -> one puzzle -> Play (real pages, real workers; the recorded 10-puzzle batches are replayed in the flow harness)`, () => runRecipe(recipe));
}

// ---------------------------------------------------------------------------------------------------------------
// I: player links

const pastedLink = new URL(playLinks['default-10x6-normal']?.[0] ?? '', location.href).href;

/** @param {Frame} frame */
const trayCount = (frame) => qa(frame.doc(), '.tray-piece').length;

await check('I1', 'Player: a fresh profile shows the start screen; the sample opens and its address becomes a #p= list', async () => {
  localStorage.clear();
  const frame = await openFrame('../../player/', { ready: playerReady });
  assert(frame.doc().querySelector('#app')?.getAttribute('data-screen') === 'start', 'the start screen opens without a link');
  assert(frame.doc().querySelector('input[type="file"], textarea.pm-code-field') === null, 'there is nothing to import');
  q(frame.doc(), '[data-action="sample"]').click();
  await waitFor(() => frame.doc().querySelector('#app[data-screen="game"]') !== null, 'the sample game', 15000);
  assert(trayCount(frame) > 0, 'the tray has pieces');
  await waitFor(() => String(frame.win().location.hash).startsWith('#p='), 'the address with the puzzle codes', 10000);
  const copies = Object.keys(localStorage).filter((k) => !k.includes(':progress') && !k.includes(':prefs') && !k.includes(':lang') && !k.includes(':theme'));
  assert(copies.length === 0, `no pack copy is kept: ${copies}`);
  scan(frame);
  return { trayPieces: trayCount(frame), hashChars: String(frame.win().location.hash).length };
});

await check('I2', 'Player: a broken link keeps the open game and its reason is shown in the code dialog', async () => {
  assert(pastedLink.includes('#p='), 'a Play link (one code per puzzle) was captured from the generator flow');
  const frame = await openFrame('../../player/', { ready: playerReady, hash: new URL(pastedLink).hash });
  await waitFor(() => frame.doc().querySelector('#app[data-screen="game"]') !== null, 'the linked game', 15000);
  const before = { tray: trayCount(frame), title: q(frame.doc(), '.puzzle-title').textContent };
  frame.win().location.hash = '#p=1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QS';
  await waitFor(() => frame.doc().querySelector('dialog[open] .pm-code-problem') !== null, 'the link error', 10000);
  const error = q(frame.doc(), 'dialog[open] .pm-code-problem');
  assert((error.textContent ?? '') !== '', 'the reason is shown');
  assert(frame.doc().querySelector('#app[data-screen="game"]') !== null, 'the game stays open');
  assert(trayCount(frame) === before.tray && q(frame.doc(), '.puzzle-title').textContent === before.title, 'the old game is unchanged');
  scan(frame);
  return { error: error.textContent, before };
});

await check('I3', 'Player: the old #pack= and #lib= addresses open nothing', async () => {
  for (const hash of ['#pack=1z.AAAA&i=0', '#lib=0123456789abcdef&i=0']) {
    const frame = await openFrame('../../player/', { ready: playerReady, hash });
    assert(frame.doc().querySelector('#app')?.getAttribute('data-screen') === 'start', `${hash}: the start screen stays`);
    scan(frame);
  }
  return {};
});

// ---------------------------------------------------------------------------------------------------------------
// L: layouts, touch targets, contrast, names

/**
 * @param {string} color
 * @returns {[number, number, number, number]}
 */
function parseColor(color) {
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (m === null) {
    return [0, 0, 0, 1];
  }
  const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

/** @param {[number, number, number, number]} fg @param {[number, number, number, number]} bg */
function blend(fg, bg) {
  const a = fg[3];
  return /** @type {[number, number, number, number]} */ ([fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]);
}

/** @param {[number, number, number, number]} c */
function luminance(c) {
  const f = (/** @type {number} */ v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

/**
 * Text contrast of every visible, enabled text element; elements over images or gradients are listed as unresolved.
 * @param {Frame} frame
 */
function contrastReport(frame) {
  const win = frame.win();
  const d = frame.doc();
  /** @type {{ el: string, ratio: number, size: number }[]} */
  const low = [];
  let measured = 0;
  const unresolved = [];
  for (const node of qa(d, 'body *')) {
    const direct = [...node.childNodes].some((c) => c.nodeType === 3 && (c.textContent ?? '').trim() !== '');
    if (!direct || ['SCRIPT', 'STYLE', 'OPTION'].includes(node.tagName)) {
      continue;
    }
    const style = win.getComputedStyle(node);
    const box = rect(node);
    if (box.width === 0 || box.height === 0 || style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) {
      continue;
    }
    if (/** @type {HTMLButtonElement} */ (node).disabled || node.closest('[disabled], [aria-disabled="true"]') !== null) {
      continue;
    }
    let bg = /** @type {[number, number, number, number]} */ ([255, 255, 255, 1]);
    /** @type {[number, number, number, number][]} */
    const layers = [];
    let hasImage = false;
    for (let cur = /** @type {Element | null} */ (node); cur !== null; cur = cur.parentElement) {
      const s = win.getComputedStyle(cur);
      if (s.backgroundImage !== 'none') {
        hasImage = true;
        break;
      }
      const c = parseColor(s.backgroundColor);
      if (c[3] > 0) {
        layers.push(c);
        if (c[3] === 1) {
          break;
        }
      }
    }
    if (hasImage) {
      unresolved.push(`${node.tagName.toLowerCase()}.${String(node.className).split(' ')[0]}`);
      continue;
    }
    for (const layer of layers.reverse()) {
      bg = blend(layer, bg);
    }
    const fg = blend(parseColor(style.color), bg);
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    measured += 1;
    if (ratio < (large ? 3 : 4.5)) {
      low.push({ el: `${node.tagName.toLowerCase()}.${String(node.className).split(' ')[0]} "${(node.textContent ?? '').trim().slice(0, 30)}"`, ratio: Math.round(ratio * 100) / 100, size });
    }
  }
  return { measured, low, unresolved: [...new Set(unresolved)].slice(0, 10) };
}

/**
 * Interactive elements whose target is smaller than 44 x 44 CSS px (a checkbox or radio counts as its label).
 * @param {Frame} frame
 */
function smallTargets(frame) {
  const d = frame.doc();
  /** @type {string[]} */
  const small = [];
  let total = 0;
  for (const node of qa(d, 'button, a[href], select, textarea, summary, input:not([type="hidden"]), [role="button"], [tabindex="0"]')) {
    const style = frame.win().getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || node.closest('[hidden]') !== null || /** @type {HTMLButtonElement} */ (node).disabled) {
      continue;
    }
    const target = node instanceof frame.win().HTMLInputElement && ['checkbox', 'radio'].includes(node.type) ? node.closest('label') ?? node : node;
    const box = rect(target);
    if (box.width === 0 || box.height === 0 || (node.getAttribute('type') === 'file' && node.hasAttribute('hidden'))) {
      continue;
    }
    total += 1;
    if (box.width < 44 || box.height < 44) {
      small.push(`${node.tagName.toLowerCase()}${node.getAttribute('data-action') ? `[${node.getAttribute('data-action')}]` : ''} ${Math.round(box.width)}x${Math.round(box.height)} "${(node.getAttribute('aria-label') ?? node.textContent ?? '').trim().slice(0, 24)}"`);
    }
  }
  return { total, small };
}

/**
 * Names of interactive controls and structure used by assistive technology.
 * @param {Frame} frame
 */
function accessibilityReport(frame) {
  const d = frame.doc();
  /** @type {string[]} */
  const unnamed = [];
  /** @type {string[]} */
  const positive = [];
  for (const node of qa(d, 'button, a[href], select, textarea, summary, input:not([type="hidden"])')) {
    const label = (node.getAttribute('aria-label') ?? '').trim()
      || (node.getAttribute('aria-labelledby') ?? '').split(/\s+/).map((id) => d.getElementById(id)?.textContent ?? '').join('').trim()
      || (/** @type {HTMLInputElement} */ (node).labels?.[0]?.textContent ?? '').trim()
      || (node.getAttribute('title') ?? '').trim()
      || (node.tagName === 'INPUT' && ['button', 'submit'].includes(/** @type {HTMLInputElement} */ (node).type) ? /** @type {HTMLInputElement} */ (node).value : '')
      || (node.textContent ?? '').trim();
    if (label === '' && node.closest('[hidden]') === null) {
      unnamed.push(`${node.tagName.toLowerCase()}.${String(node.className).split(' ')[0]}${node.getAttribute('data-action') ? `[${node.getAttribute('data-action')}]` : ''}`);
    }
  }
  for (const node of qa(d, '[tabindex]')) {
    if (Number(node.getAttribute('tabindex')) > 0) {
      positive.push(node.tagName.toLowerCase());
    }
  }
  const live = qa(d, '[aria-live], [role="status"], [role="alert"], [role="log"]').length;
  return { unnamed, positiveTabindex: positive, liveRegions: live, title: d.title, lang: d.documentElement.lang, h1: qa(d, 'h1').length };
}

await check('L1', 'Generator desktop layout (>= 900 px): a three-step wizard shows one step at a time; step 2 shows the piece set below the level settings; Back and the main action sit at the top right of the main screen; the puzzle level selector is present and Copy pack link is gone', async () => {
  const frame = await openFrame('../../generator/index.html', { width: 1280, height: 900, ready: generatorReady });
  const d = frame.doc();
  const shown = () => qa(d, '[data-step]').filter((n) => !n.hidden).map((n) => n.dataset.step);
  assert(qa(d, '[data-wizard-step]').length === 3, 'three step buttons');
  assert(JSON.stringify(shown()) === '["1"]', `only step 1 shows at first: ${shown()}`);
  assert(!/** @type {HTMLButtonElement} */ (q(d, '[data-wizard-step="2"]')).disabled && /** @type {HTMLButtonElement} */ (q(d, '[data-wizard-step="3"]')).disabled, 'step 2 is open and step 3 waits for a piece set');
  q(d, '[data-wizard-step="2"]').click();
  assert(JSON.stringify(shown()) === '["2"]', `only step 2 shows after choosing it: ${shown()}`);
  const level = rect(q(d, '.panel-level'));
  const set = rect(q(d, '.panel-set'));
  assert(set.top >= level.bottom - 2 && Math.abs(level.left - set.left) < 3, 'the piece set sits below the level settings, in one column');
  const actions = rect(q(d, '.main-actions'));
  const panelBox = rect(q(d, '[data-step]:not([hidden])'));
  assert(actions.right <= panelBox.right && panelBox.right - actions.right < 24 && actions.top >= panelBox.top && actions.top - panelBox.top < 24, 'the buttons sit inside the main panel, at its top right');
  assert(d.querySelector('.sticky-bar') === null, 'there is no sticky toolbar');
  assert(d.querySelector('[data-field="puzzle-level"]') !== null, 'the puzzle-level selector exists');
  assert(d.querySelector('[data-action="copy-pack-link"]') === null, 'Copy pack link is gone');
  scan(frame);
  return { level: Math.round(level.left), set: Math.round(set.left) };
});

await check('L6', 'Generator wide layout (>= 1360 px): puzzles on the left, the step screen in the middle, the steps stacked on the right', async () => {
  const frame = await openFrame('../../generator/index.html', { width: 1500, height: 900, ready: generatorReady });
  const d = frame.doc();
  const [history, main, side] = ['.app-history', '.app-main', '.app-side'].map((s) => rect(q(d, s)));
  assert(history.right <= main.left + 1 && main.right <= side.left + 1, 'left to right: puzzles, main, steps');
  assert(Math.abs(history.top - main.top) < 3 && Math.abs(main.top - side.top) < 3, 'the three panels share a row');
  const steps = qa(d, '[data-wizard-step]').map((b) => rect(b));
  assert(steps.every((b, i) => i === 0 || b.top > steps[i - 1].top && Math.abs(b.left - steps[0].left) < 2), 'the steps are stacked');
  const controls = q(d, '[data-field="columns"]').closest('.app-side');
  assert(controls !== null && ['columns', 'rows', 'preset'].every((f) => q(d, `[data-field="${f}"]`).closest('[data-step-body="1"]') !== null), 'Columns, Rows and Preset live in the right panel, under step 1');
  q(d, '[data-wizard-step="2"]').click();
  assert(/** @type {HTMLElement} */ (q(d, '[data-step-body="1"]')).hidden, 'the board settings leave with step 1');
  const setControls = /** @type {HTMLElement} */ (q(d, '[data-step-body="2"]'));
  assert(!setControls.hidden && ['[data-field="seed"]', '[data-action="generate-set"]'].every((s) => q(d, s).closest('[data-step-body="2"]') !== null), 'the set seed and the Generate button live in the right panel, under step 2');
  assert(d.querySelector('[data-role="progress"]') === null, 'there are no loading panels');
  const seedRow = [q(d, '[data-field="seed"]'), q(d, '[data-action="roll-seed"]')].map((n) => rect(n));
  assert(Math.abs(seedRow[0].top - seedRow[1].top) < 6, 'the dice stays beside the seed box');
  assert(rect(q(d, '[data-action="generate-set"]')).width > 0, 'New Piece Set is visible there');
  const summary = /** @type {HTMLElement} */ (q(d, '[data-step-after="1"]'));
  assert(!summary.hidden && summary.querySelector('svg') !== null && rect(summary).width > 0, 'a thumbnail of the board shows in the right panel after step 1');
  q(d, '[data-wizard-step="1"]').click();
  assert(summary.hidden, 'the thumbnail hides again while the board is edited');
  q(d, '[data-wizard-step="2"]').click();
  assert(!summary.hidden && summary.getAttribute('role') === 'button' && summary.tabIndex === 0, 'the board preview is a button');
  summary.click();
  assert(summary.hidden && !(/** @type {HTMLElement} */ (q(d, '[data-step="1"]'))).hidden, 'clicking the board preview opens step 1, like its header');
  q(d, '[data-wizard-step="2"]').click();
  const actions = rect(q(d, '.main-actions'));
  const panelBox = rect(q(d, '[data-step]:not([hidden])'));
  assert(actions.right <= panelBox.right && panelBox.right - actions.right < 24 && actions.top >= panelBox.top && actions.top - panelBox.top < 24, 'Back and the main action sit inside the main panel, at its top right');
  scan(frame);
  return { history: Math.round(history.width), main: Math.round(main.width), side: Math.round(side.width) };
});

await check('L2', 'Generator narrow layout (< 900 px): step 2 stacks the level settings above the piece set and the buttons stay at the top of the main screen', async () => {
  const frame = await openFrame('../../generator/index.html', { width: 800, height: 900, ready: generatorReady });
  const d = frame.doc();
  q(d, '[data-wizard-step="2"]').click();
  const boxes = ['.panel-pieces', '.panel-level', '.panel-set'].map((s) => rect(q(d, s)));
  assert(boxes[2].top >= boxes[1].bottom - 2, 'the piece set sits below the level settings');
  assert(Math.abs(boxes[1].left - boxes[2].left) < 3, 'both are in the same column');
  assert(qa(d, '.step').length === 3, 'three numbered steps');
  frame.win().scrollTo(0, 0);
  await sleep(50);
  const actions = rect(q(d, '.main-actions'));
  assert(actions.top < frame.win().innerHeight && actions.height > 0, `the buttons are inside the viewport at the top of the page (top ${Math.round(actions.top)})`);
  scan(frame);
  return { steps: boxes.map((b) => Math.round(b.top)) };
});

await check('L5', 'Generator wizard: Next and Back move between steps, step 3 stays closed without a piece set, and a language switch keeps the step', async () => {
  localStorage.clear();
  const frame = await openFrame('../../generator/index.html', { ready: generatorReady });
  const d = frame.doc();
  const shown = () => qa(d, '[data-step]').filter((n) => !n.hidden).map((n) => n.dataset.step).join();
  const action = /** @type {HTMLButtonElement} */ (q(d, '[data-slot="main-action"]'));
  const back = /** @type {HTMLButtonElement} */ (q(d, '[data-slot="main-back"]'));
  assert(shown() === '1' && back.hidden && back.getBoundingClientRect().width === 0, 'step 1 first, without Back (nothing drawn in its place)');
  assert(action.textContent === 'Step 2 - Create piece set' && action.querySelector('.nav-icon') !== null, `step 1 navigator: ${action.textContent}`);
  action.click();
  assert(shown() === '2' && !back.hidden, 'Next opens step 2 and shows Back');
  assert(back.textContent === 'Step 1 - Create board' && action.textContent === 'Step 3 - Create puzzles' && back.firstElementChild?.classList.contains('nav-icon') === true && action.lastElementChild?.classList.contains('nav-icon') === true, `step 2 navigator: ${back.textContent} / ${action.textContent}`);
  assert(action.disabled && action.title !== '', 'Next is closed until there is a piece set, and says why');
  assert(/** @type {HTMLButtonElement} */ (q(d, '[data-wizard-step="3"]')).disabled, 'step 3 is closed without a piece set');
  q(d, '[data-lang="vi"]').click();
  assert(shown() === '2' && d.documentElement.lang === 'vi', 'the step is kept and the page language changed');
  assert(q(d, '[data-wizard-step="2"] .wizard-name').textContent === 'Tạo bộ mảnh', 'the step names are translated');
  assert(back.textContent === 'Bước 1 - Tạo bàn chơi' && action.textContent === 'Bước 3 - Tạo đề', `the navigator is translated: ${back.textContent} / ${action.textContent}`);
  assert(q(d, '[data-lang="vi"]').getAttribute('aria-pressed') === 'true', 'the switch shows the language');
  assert(localStorage.getItem('pentomino:v1:lang') === 'vi', 'the choice is remembered');
  back.click();
  assert(shown() === '1' && q(d, '[data-field="columns"]').previousElementSibling?.textContent === 'Số cột', 'Back returns to a translated step 1');
  assert(q(d, '[data-role="board-status"]').textContent === '60 / 60 ô chơi được · liền một khối', `board status: ${q(d, '[data-role="board-status"]').textContent}`);
  scan(frame);
  localStorage.removeItem('pentomino:v1:lang');
  return { language: d.documentElement.lang };
});

/** @param {Frame} frame */
const gameBarOrder = (frame) => qa(frame.doc(), '.step-head .step-actions > *, .game-bar .game-stats > *, .game-bar .game-actions > *').map((n) => n.dataset.action ?? n.className.split(' ')[0]);

await check('L3', 'Player desktop layout (1360 px): puzzles | game | pieces panels, game bar over the board, selection toolbar on pick-up', async () => {
  const frame = await openFrame('../../player/', { width: 1400, height: 900, ready: playerReady, hash: new URL(pastedLink).hash });
  await waitFor(() => frame.doc().querySelector('#app[data-screen="game"]') !== null, 'the game');
  const d = frame.doc();
  assert(q(d, '.app-header h1').textContent === 'Pentomino Player', 'the header names the page');
  assert(qa(d, '.app-header [data-lang]').length === 2 && qa(d, '.app-header [data-theme-value]').length === 3, 'language and theme switches');
  const [history, main, side] = ['.app-history', '.app-main', '.app-side'].map((s) => rect(q(d, s)));
  assert(history.right <= main.left + 4 && main.right <= side.left + 4, `three panels (${[history, main, side].map((r) => `${Math.round(r.left)}-${Math.round(r.right)}`).join(' | ')})`);
  assert(qa(d, '.app-history .puzzle-card').length > 0 && q(d, '.app-main').contains(q(d, '.pm-board')) && q(d, '.app-side').contains(q(d, '[data-host="tray"]')), 'each panel holds its content');
  const order = gameBarOrder(frame);
  const expected = ['share', 'print', 'game-timer', 'game-moves', 'undo', 'redo', 'hint', 'replay'];
  assert(JSON.stringify(order) === JSON.stringify(expected), `title row and game bar order ${order.join(' > ')}`);
  const [head, headTitle, shareRect, printRect] = ['.step-head', '.puzzle-title', '[data-action="share"]', '[data-action="print"]'].map((s) => rect(q(d, s)));
  assert(Math.abs(shareRect.top - headTitle.top) < 40 && shareRect.left > headTitle.left && shareRect.right <= printRect.left && printRect.right <= head.right + 1 && printRect.right > head.right - 8, 'Share and Print are on the title row, at its right');
  const board = rect(q(d, '.pm-board'));
  const tray = rect(q(d, '[data-host="tray"]'));
  assert(tray.left >= board.right - 4, `the pieces are on the right (tray ${Math.round(tray.left)}, board right ${Math.round(board.right)})`);
  q(d, '.tray-piece').click();
  await sleep(100);
  const toolbar = d.querySelector('.selection-actions');
  assert(toolbar !== null && rect(toolbar).width > 0, 'the selection toolbar appears after choosing a piece');
  scan(frame);
  return { order, trayLeft: Math.round(tray.left), boardRight: Math.round(board.right) };
});

await check('L4', 'Player narrow layout (< 768 px): header, game (board), then puzzles in that vertical order; the pieces are a bar fixed to the bottom of the window, in one row, without the turn and flip buttons', async () => {
  const frame = await openFrame('../../player/', { width: 700, height: 900, ready: playerReady, hash: new URL(pastedLink).hash });
  await waitFor(() => frame.doc().querySelector('#app[data-screen="game"]') !== null, 'the game');
  const d = frame.doc();
  q(d, '.tray-piece').click();
  await sleep(100);
  const tops = ['.app-header', '.pm-board', '.puzzle-cards'].map((s) => rect(q(d, s)).top);
  for (let i = 1; i < tops.length; i += 1) {
    assert(tops[i] >= tops[i - 1] - 1, `${i} is below ${i - 1}: ${tops.map(Math.round).join(', ')}`);
  }
  const bar = q(d, '.app-side');
  const win = /** @type {Window} */ (d.defaultView);
  assert(win.getComputedStyle(bar).position === 'fixed' && Math.abs(rect(bar).bottom - win.innerHeight) < 2, 'the pieces bar is fixed to the bottom of the window');
  assert(win.getComputedStyle(q(d, '[data-host="tray"]')).flexWrap === 'nowrap', 'the pieces are one row');
  assert(win.getComputedStyle(q(d, '.selection-actions')).display === 'none', 'no turn and flip buttons');
  scan(frame);
  return { tops: tops.map(Math.round) };
});

const coarsePointer = matchMedia('(pointer: coarse)').matches;
if (!coarsePointer) {
  blocked('A1', 'Touch targets >= 44 px in the narrow layouts (generator and player)', 'The 44 px target rule is defined for coarse pointers (common.css, player.css), and this run used a fine pointer. Rerun this page on a touch device or with the browser emulating pointer: coarse (CDP Emulation.setEmulatedMedia) to evaluate it.');
} else {
  await check('A1', 'Touch targets >= 44 px in the narrow layouts (generator and player), coarse pointer active', async () => {
    const gen = await openFrame('../../generator/index.html', { width: 800, height: 900, ready: generatorReady });
    const g = smallTargets(gen);
    scan(gen);
    const player = await openFrame('../../player/', { width: 800, height: 900, ready: playerReady, hash: new URL(pastedLink).hash });
    await waitFor(() => player.doc().querySelector('#app[data-screen="game"]') !== null, 'the game');
    q(player.doc(), '.tray-piece').click();
    await sleep(100);
    const p = smallTargets(player);
    scan(player);
    const all = [...g.small.map((s) => `generator ${s}`), ...p.small.map((s) => `player ${s}`)];
    assert(all.length === 0, `${all.length} of ${g.total + p.total} targets are below 44 px: ${all.slice(0, 12).join('; ')}`);
    return { checked: g.total + p.total };
  });
}

await check('A2', 'Text contrast >= 4.5:1 (3:1 for large text) on generator and player, from computed styles', async () => {
  const gen = await openFrame('../../generator/index.html', { width: 1280, height: 900, ready: generatorReady });
  const g = contrastReport(gen);
  scan(gen);
  const player = await openFrame('../../player/', { width: 1280, height: 900, ready: playerReady, hash: new URL(pastedLink).hash });
  await waitFor(() => player.doc().querySelector('#app[data-screen="game"]') !== null, 'the game');
  const p = contrastReport(player);
  scan(player);
  const low = [...g.low.map((l) => `generator ${l.el} ${l.ratio}`), ...p.low.map((l) => `player ${l.el} ${l.ratio}`)];
  assert(low.length === 0, `${low.length} low-contrast text elements: ${low.slice(0, 10).join('; ')}`);
  return { measured: g.measured + p.measured, unresolved: [...g.unresolved, ...p.unresolved] };
});

await check('A3', 'Accessible names, no positive tabindex, live regions, board application role with instructions, document language and title', async () => {
  const gen = await openFrame('../../generator/index.html', { ready: generatorReady });
  const g = accessibilityReport(gen);
  scan(gen);
  const player = await openFrame('../../player/', { ready: playerReady, hash: new URL(pastedLink).hash });
  await waitFor(() => player.doc().querySelector('#app[data-screen="game"]') !== null, 'the game');
  const p = accessibilityReport(player);
  const board = q(player.doc(), '[role="application"]');
  const helpIds = (board.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  const helpText = helpIds.map((id) => player.doc().getElementById(id)?.textContent ?? '').join(' ').trim();
  scan(player);
  const bad = [...g.unnamed.map((n) => `generator unnamed ${n}`), ...p.unnamed.map((n) => `player unnamed ${n}`), ...g.positiveTabindex, ...p.positiveTabindex];
  assert(bad.length === 0, bad.join('; '));
  assert(g.liveRegions > 0 && p.liveRegions > 0, `live regions: generator ${g.liveRegions}, player ${p.liveRegions}`);
  assert(helpText.length > 20, 'the application board has instructions via aria-describedby');
  assert(g.lang === 'en' && p.lang === 'en' && g.h1 === 1, 'language and one h1');
  return { generator: g, player: p, boardLabel: board.getAttribute('aria-label'), instructions: helpText.slice(0, 80), reducedMotionPreferred: matchMedia('(prefers-reduced-motion: reduce)').matches };
});

// ---------------------------------------------------------------------------------------------------------------
// H: hygiene

await check('H1', 'No CSP violations, script errors or unhandled rejections in any frame, and no external runtime request', async () => {
  assert(problems.length === 0, `${problems.length} problems: ${problems.slice(0, 6).join(' | ')}`);
  assert(external.size === 0, `external requests: ${[...external].join(', ')}`);
  return { resourcesSeen: resources.size, origin: location.origin };
});

// ---------------------------------------------------------------------------------------------------------------
// Items this machine cannot honestly verify

blocked('B1', 'Real screen-reader smoke test (NVDA on Windows, VoiceOver on macOS and iOS, TalkBack on Android)', 'No screen reader is set up or approved on this machine. Owner: install NVDA (and use a Mac/iPhone for VoiceOver), open the generator and player, tab through pieces and controls, confirm names, the role=application instructions, live announcements and that no focus trap exists; record versions and findings.');
blocked('B2', 'Approved local axe DevTools audit with zero critical findings', 'No approved axe extension is available. Owner: run axe DevTools on the generator (empty, after a set, with puzzles), the player start screen, the game screen and the win dialog; record the version, pages and results; route findings to T17-T20.');
blocked('B3', 'Safari (macOS and iOS), Firefox-on-reference-hardware, Android Chrome and iPhone Safari runs', 'These devices are not available here. Owner: run this page and the BQ-0 benchmark page on each listed platform and record hardware and browser versions.');

const failed = results.filter((r) => r.status === 'fail');
const list = /** @type {HTMLElement} */ (document.getElementById('results'));
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.status.toUpperCase()} ${r.id}: ${r.name}${r.status === 'pass' ? '' : ` - ${String(r.detail)}`}`;
  li.className = r.status;
  list.append(li);
}
const passed = results.filter((r) => r.status === 'pass').length;
const blockedCount = results.filter((r) => r.status === 'blocked').length;
frameHost.replaceChildren();
/** @type {HTMLElement} */ (document.getElementById('report')).textContent = JSON.stringify({ origin: location.origin, userAgent: navigator.userAgent, results, problems, external: [...external] }, null, 2);
const summary = /** @type {HTMLElement} */ (document.getElementById('summary'));
summary.textContent = failed.length === 0 ? `PASS ${passed} checks, ${blockedCount} blocked` : `FAIL ${failed.length} of ${results.length - blockedCount} automated checks (${blockedCount} blocked)`;
/** @type {any} */ (window).__acceptance = { results, problems, external: [...external] };
document.documentElement.dataset.result = failed.length === 0 ? 'pass' : 'fail';
document.title = `${summary.textContent} - T23 acceptance harness`;
