// @ts-check
// Browser parity of `tools/generate.mjs --code` (RP07). The lines are the codes the command prints for the repository
// packs (the frozen raw output that tests/puzzlecode-cli.test.js asserts line by line, plus one DEFLATE line and the
// 24x24 oracle). They are decoded here, as captured and never regenerated, by the real module worker of the puzzle-code
// client and compared with the puzzle they were made from: rows, ordered identities and RGB, clue cells, angle, stored
// answer, claims, heading and the progress fingerprint. The browser's own encoder then runs on the same shared snapshot:
// its line need not be byte-equal (a compressor may differ), but it must decode to the same puzzle. The page itself
// never builds the cold catalogue. Writes a pass/fail list into the page, data-summary and data-result on <html>.
// Developer fixture, not deployed.

import { boardFromRows } from '../../core/engine/board.js';
import { progressFingerprint } from '../../core/engine/keys.js';
import { parsePack } from '../../core/engine/pack.js';
import { catalogueStats } from '../../core/engine/puzzlecode-v1.js';
import { createPuzzleCodeClient } from '../../core/browser/puzzle-code-client.js';
import { puzzleSnapshot } from '../../core/browser/puzzle-snapshot.js';
import { puzzleDisplayName } from '../../core/browser/puzzle-title.js';

document.documentElement.dataset.result = 'running';

const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
const uncaught = /** @type {string[]} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
window.addEventListener('error', (e) => uncaught.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => uncaught.push(String(e.reason)));

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
 * @param {unknown} value
 * @returns {string} JSON with sorted object keys, so equal values compare equal whatever their key order.
 */
function canonical(value) {
  return JSON.stringify(value, (_key, v) => (v !== null && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    : v));
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {string} msg
 */
function equal(a, b, msg) {
  assert(canonical(a) === canonical(b), `${msg}: expected ${canonical(b)}, got ${canonical(a)}`);
}

/** @param {string} url */
const fetchText = async (url) => (await fetch(new URL(url, import.meta.url))).text();

/** @param {string} path @returns {Promise<import('../../core/engine/types.js').Pack>} */
async function packOf(path) {
  const parsed = parsePack(await fetchText(`../../${path}`));
  if (!parsed.ok) {
    throw new Error(`${path} does not parse`);
  }
  return parsed.value;
}

/** @param {number} n */
const untitled = (n) => `Puzzle #${n}`;
/** @param {{ id: string, label: string, color: string, cells: number[][] }[]} pieces */
const identities = (pieces) => pieces.map((p) => ({ id: p.id, label: p.label, color: p.color.toLowerCase(), cells: p.cells }));
/** @param {{ piece: string }[] | null | undefined} poses */
const byPiece = (poses) => [...(poses ?? [])].sort((a, b) => (a.piece < b.piece ? -1 : a.piece > b.piece ? 1 : 0));

/**
 * What a decoded pack must hold for the puzzle the code was made from.
 * @param {import('../../core/engine/types.js').Pack} pack
 * @param {import('../../core/engine/puzzlecode.js').PuzzleCodeSnapshot} data
 * @param {string | null} heading The heading the printout shows; null when the title is not the shared heading.
 * @param {boolean} withSolution
 */
function assertPuzzle(pack, data, heading, withSolution) {
  assert(pack.puzzles.length === 1, `${pack.puzzles.length} puzzles in a one-puzzle code`);
  const puzzle = pack.puzzles[0];
  equal(pack.board.rows, data.rows, 'rows (width, height, blocked margins)');
  equal(pack.presentation?.rotation ?? 0, data.rotation, 'display angle');
  equal(identities(pack.pieces), identities(data.pieces), 'ordered identities, RGB and cells');
  equal(puzzle.clues.map((c) => c.piece), data.clues.map((c) => c.piece), 'clue pieces');
  const board = boardFromRows(data.rows);
  equal(
    progressFingerprint(board, pack.pieces, puzzle.clues),
    progressFingerprint(board, data.pieces, data.clues),
    'progress fingerprint',
  );
  equal(byPiece(withSolution ? puzzle.solution : null), byPiece(withSolution ? data.solution : null), 'stored answer');
  assert(withSolution || (puzzle.solution ?? null) === null, 'a core alone carries no answer');
  equal(puzzle.rating ?? null, data.rating, 'rating claim');
  equal(puzzle.certificate ?? null, data.certificate, 'certificate claim');
  equal(puzzle.title ?? null, data.title, 'title');
  if (heading !== null) {
    equal(puzzleDisplayName(puzzle.title, 0, untitled), heading, 'heading');
  }
}

const fixture = JSON.parse(await fetchText('../fixtures/puzzlecode-v1.json'));
const packs = new Map([
  ['player/samples/sample-pack.json', await packOf('player/samples/sample-pack.json')],
  ['tests/fixtures/hand-authored-pack.json', await packOf('tests/fixtures/hand-authored-pack.json')],
]);
/** @param {string} source @param {number} index @param {Record<string, unknown>} [over] */
function snapshotOf(source, index, over = {}) {
  const pack = /** @type {import('../../core/engine/types.js').Pack} */ (packs.get(source));
  return puzzleSnapshot({
    rows: pack.board.rows,
    pieces: pack.pieces,
    puzzle: { ...pack.puzzles[index], ...over },
    index,
    rotation: pack.presentation?.rotation ?? 0,
    untitled,
  });
}

const client = createPuzzleCodeClient();
let bytesEqual = 0;
let encoded = 0;

for (const golden of fixture.goldens) {
  const code = /** @type {string} */ (golden.code);
  const core = code.slice(0, code.indexOf('.'));
  const snapshot = snapshotOf(golden.source, golden.puzzle);

  await check(`${golden.name}: the captured line decodes to its own puzzle, with its answer and no tail damage`, async () => {
    assert(snapshot.data.title === golden.title, `printed title ${snapshot.data.title}`);
    const decoded = await client.decode(code);
    assert(decoded.ok, JSON.stringify(decoded));
    assert(decoded.value.hasTail && decoded.value.tailError === null, 'a full code with no tail error');
    assertPuzzle(decoded.value.pack, snapshot.data, snapshot.heading, true);
  });

  await check(`${golden.name}: its core alone opens the same puzzle without an answer`, async () => {
    const decoded = await client.decode(core);
    assert(decoded.ok, JSON.stringify(decoded));
    assert(!decoded.value.hasTail, 'no tail');
    assertPuzzle(decoded.value.pack, snapshot.data, snapshot.heading, false);
  });

  await check(`${golden.name}: the browser's encoder gives a line that decodes to the same puzzle`, async () => {
    const made = await client.encode(snapshot.data);
    assert(made.ok, JSON.stringify(made));
    encoded += 1;
    bytesEqual += made.value.F === code ? 1 : 0;
    const decoded = await client.decode(made.value.F);
    assert(decoded.ok && decoded.value.tailError === null && decoded.value.hasTail, JSON.stringify(decoded));
    assertPuzzle(decoded.value.pack, snapshot.data, snapshot.heading, true);
  });
}

await check('a DEFLATE line (version 2, other bytes than the raw line) decodes to the same puzzle', async () => {
  const [deflated] = fixture.version2DecodeOnly;
  const raw = fixture.goldens.find((/** @type {{ source: string, puzzle: number }} */ g) => g.source === deflated.source && g.puzzle === deflated.puzzle);
  const snapshot = snapshotOf(deflated.source, deflated.puzzle, { title: deflated.title });
  assert(deflated.code.startsWith('2') && deflated.code !== raw.code, 'a version-2 line with its own bytes');
  const decoded = await client.decode(deflated.code);
  assert(decoded.ok, JSON.stringify(decoded));
  assert(decoded.value.hasTail && decoded.value.tailError === null, 'a full DEFLATE code');
  assertPuzzle(decoded.value.pack, { ...snapshot.data, title: deflated.title }, null, true);
  const sibling = await client.decode(raw.code);
  assert(sibling.ok, JSON.stringify(sibling));
  const board = boardFromRows(decoded.value.pack.board.rows);
  equal(
    progressFingerprint(board, decoded.value.pack.pieces, decoded.value.pack.puzzles[0].clues),
    progressFingerprint(board, sibling.value.pack.pieces, sibling.value.pack.puzzles[0].clues),
    'the same puzzle as the raw line',
  );
});

await check('the 24x24 oracle line decodes to its independent facts and fingerprint', async () => {
  const large = fixture.large;
  const decoded = await client.decode(large.code);
  assert(decoded.ok, JSON.stringify(decoded));
  assert(decoded.value.hasTail && decoded.value.tailError === null, 'full code');
  const { pack } = decoded.value;
  const puzzle = pack.puzzles[0];
  equal([pack.board.rows[0].length, pack.board.rows.length, pack.presentation?.rotation ?? 0], [large.width, large.height, large.rotation], 'frame');
  equal(pack.pieces.map((p) => p.cells.length), large.pieceSizes, 'piece sizes in source order');
  equal(puzzle.clues.length, large.clueCount, 'clues');
  equal(puzzle.rating, large.rating, 'rating claim with its metrics');
  equal(progressFingerprint(boardFromRows(pack.board.rows), pack.pieces, puzzle.clues), large.progressFingerprint, 'fingerprint');
  assert(large.code.indexOf('.') === large.coreLength && large.code.length === large.fullLength, 'C211/F243');
});

await check('the page never built the cold catalogue, and nothing violated the policy or threw', () => {
  client.dispose();
  assert(catalogueStats.sizesBuilt === 0, 'catalogue built on the main thread');
  assert(violations.length === 0, violations.join('; '));
  assert(uncaught.length === 0, uncaught.join('; '));
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
  summary.textContent = `${results.length - failed.length}/${results.length} passed; browser encoder byte-equal on ${bytesEqual}/${encoded} lines`;
}
document.documentElement.dataset.summary = JSON.stringify({
  total: results.length,
  encoded,
  bytesEqual,
  failed: failed.map((r) => `${r.name}: ${r.error}`.slice(0, 700)),
});
document.documentElement.dataset.result = failed.length === 0 && results.length > 0 ? 'pass' : 'fail';
