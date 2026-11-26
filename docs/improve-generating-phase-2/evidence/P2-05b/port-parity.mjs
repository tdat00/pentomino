// @ts-check
// P2-05b: production `selectCluesV4` against the frozen `ig-select-v4.js` on nine real calls of real sets.
// Scratch script, run from the slot root through the lock helper; it writes `parity.log` next to itself.
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('../../../../', import.meta.url);
const here = new URL('./', import.meta.url);
/** @param {string} path */
const load = (path) => import(new URL(path, root).href);
/** @param {string} tree @param {string} file */
const frozenModule = (tree, file) => import(pathToFileURL(
  fileURLToPath(new URL(`tests/artifacts/ig-proto/tree-frozen/${tree}/core/engine/${file}`, root)),
).href);

const { activeCount, boardFromRows } = await load('core/engine/board.js');
const { carveFlatSet, carveMacro, finalizeSet } = await load('core/engine/carve.js');
const { callBudgetOf } = await load('core/engine/gen-v4.js');
const { level } = await load('core/engine/levels.js');
const { BUDGETS, pieceCountRange } = await load('core/engine/policy.js');
const { createRng, normalizeSeedText } = await load('core/engine/rng.js');
const { selectCluesV4 } = await load('core/engine/select-v4.js');
const { createWorkspace, MAIN_WORKSPACE_BYTES } = await load('core/engine/workspace.js');
const { rectRows } = await load('tools/bench/calibration-reference.js');
const boards = (await import(new URL('tools/ig-proto/data/boards-v1.json', root).href, { with: { type: 'json' } })).default;

const MACRO_MIN_MEAN = 6.5;

/** @type {Record<string, any>} */
const frozen = {};
for (const tree of ['fr-frozen', 'fr-frozen-none']) {
  frozen[tree] = {
    select: (await frozenModule(tree, 'ig-select-v4.js')).selectCluesV4,
    level: (await frozenModule(tree, 'levels.js')).level,
    workspace: await frozenModule(tree, 'workspace.js'),
  };
}

/** @type {{ cell: string, tree: string, rows: string[], seed: string, uniqueness: 'any' | 'require' }[]} */
const calls = [];
const cells = [
  { cell: '10x10-nightmare', tree: 'fr-frozen-none', rows: rectRows(10, 10) },
  { cell: '14x14-nightmare', tree: 'fr-frozen', rows: rectRows(14, 14) },
  { cell: '15x15b10-nightmare', tree: 'fr-frozen', rows: boards.cases['15x15b10-nightmare'].boardRows },
  { cell: '15x20-nightmare', tree: 'fr-frozen-none', rows: rectRows(15, 20) },
];
for (const c of cells) {
  for (const n of [0, 1]) {
    calls.push({ ...c, seed: `p2-05/${c.cell}/${n}`, uniqueness: 'any' });
  }
}
calls.push({ ...cells[0], seed: 'p2-05/require/0', uniqueness: 'require' });

/**
 * `setAttempt`'s lines 113-135 with attempt 0: the set and a fresh `cal` stream of the same draws.
 * @param {any} board
 * @param {string} seed
 */
function makeSet(board, seed) {
  const rng = createRng(normalizeSeedText(seed), 'set/0');
  const ks = pieceCountRange('nightmare', activeCount(board));
  const k = ks[rng.int(ks.length)];
  let carved = null;
  if (activeCount(board) / k >= MACRO_MIN_MEAN) {
    carved = carveMacro(board, k, rng.derive('macro'), BUDGETS, undefined, undefined);
  }
  if (carved === null) {
    carved = carveFlatSet(board, k, rng.derive('flat'), BUDGETS, undefined);
  }
  if (carved === null) {
    throw new Error(`no carve for ${seed}`);
  }
  const set = finalizeSet(board, carved.regions, carved.regionOf ?? null);
  return { set, cal: rng.derive('cal') };
}

/** @param {any} res @param {number[]} units */
function view(res, units) {
  const rating = res.rating ?? null;
  return {
    ok: res.ok,
    clues: res.ok ? res.clues.map((/** @type {any} */ p) => p.id) : null,
    skips: res.skips ?? null,
    igWindow: res.igWindow == null ? null : Object.fromEntries(
      ['c0', 'wc', 'hit', 'hiBelow', 'loAbove', 'probes', 'result', 'proof'].map((k) => [k, res.igWindow[k] ?? null]),
    ),
    score: rating?.score ?? null,
    metrics: rating?.metrics ?? null,
    certificate: res.certificate ?? null,
    units: units.reduce((sum, u) => sum + u, 0),
    reason: res.ok ? null : res.reason ?? null,
    igNoWindow: res.ok ? null : res.igNoWindow ?? null,
  };
}

/**
 * Compares the production view `a` with the frozen view `b`: an object of `b` is compared by its own keys only, so
 * production's completed rating (a superset, P6) is accepted.
 * @param {any} a
 * @param {any} b
 * @param {string} path
 * @returns {string | null} The first differing path.
 */
function firstDiff(a, b, path) {
  if (b !== null && typeof b === 'object' && !Array.isArray(b)) {
    if (a === null || typeof a !== 'object') {
      return path;
    }
    for (const key of Object.keys(b)) {
      const d = firstDiff(a[key], b[key], `${path}.${key}`);
      if (d !== null) {
        return d;
      }
    }
    return null;
  }
  if (Array.isArray(b)) {
    if (!Array.isArray(a) || a.length !== b.length) {
      return path;
    }
    for (let i = 0; i < b.length; i += 1) {
      const d = firstDiff(a[i], b[i], `${path}[${i}]`);
      if (d !== null) {
        return d;
      }
    }
    return null;
  }
  return Object.is(a, b) ? null : path;
}

/** @type {string[]} */
const lines = [];
let equal = 0;
for (const call of calls) {
  const board = boardFromRows(call.rows);
  const budget = callBudgetOf(call.uniqueness, 'nightmare');
  const fz = frozen[call.tree];

  const prodSet = makeSet(board, call.seed);
  /** @type {number[]} */
  const prodUnits = [];
  const prod = selectCluesV4({
    board, pieces: prodSet.set.pieces, layout: prodSet.set.witness, target: level('nightmare'), rng: prodSet.cal,
    uniqueness: call.uniqueness, excludeClueKeys: new Set(), ws: createWorkspace(MAIN_WORKSPACE_BYTES),
    charge: (/** @type {number} */ u) => prodUnits.push(u),
  });

  const frozenSet = makeSet(board, call.seed);
  /** @type {number[]} */
  const frozenUnits = [];
  const froz = fz.select({
    board, pieces: frozenSet.set.pieces, layout: frozenSet.set.witness, target: fz.level('nightmare'), rng: frozenSet.cal,
    uniqueness: call.uniqueness, excludeClueKeys: new Set(),
    ws: fz.workspace.createWorkspace(fz.workspace.MAIN_WORKSPACE_BYTES),
    charge: (/** @type {number} */ u) => frozenUnits.push(u), igBudget: budget,
  });

  const prodView = view(prod, prodUnits);
  const diff = firstDiff(prodView, view(froz, frozenUnits), '');
  if (diff === null) {
    equal += 1;
  }
  lines.push(`parity ${call.cell} ${call.seed} ${diff === null ? 'equal' : `differ ${diff}`} units ${prodView.units}`);
}
lines.push(`parity: ${equal} of ${calls.length} equal`);
writeFileSync(new URL('parity.log', here), `${lines.join('\r\n')}\r\n`, 'utf8');
process.stdout.write(`${lines.join('\n')}\n`);
process.exitCode = equal === calls.length ? 0 : 1;
