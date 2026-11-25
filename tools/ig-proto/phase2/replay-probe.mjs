// @ts-check
// The replay-resource probes (P2-14b; plan §4.7, review-1 R1, R2, R10; contracts.md C15): the eight items that P2-19
// charges once to stage A, as two successive groups of four on two lanes. Every item is checkpointed in
// <out>/items/<n>.started (before it runs) and <n>.json (after); a started item is never repeated. The script writes
// its own receipt, <out>/receipt.json; the console output is not evidence.
//   node tools\ig-proto\phase2\replay-probe.mjs --all --out <dir> [--trees <dir>]
//   node tools\ig-proto\phase2\replay-probe.mjs --item <n> --out <dir> [--trees <dir>]
// Exit: 0 every item measured with its margin ok; 1 an item failed; 3 an item not measured, censored or not started;
// 2 the script could not run.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { rectRows } from '../../bench/calibration-reference.js';
import { REPLAY } from '../../../core/engine/policy.js';
import { parseArgs } from '../lib/paths.mjs';

/**
 * @typedef {object} Item One fixed probe item.
 * @property {number} n 1 to 8.
 * @property {'any' | 'require'} group The group the item belongs to; group 2 starts when group 1 has ended.
 * @property {string} cell `<cols>x<rows>-<level>`.
 * @property {'any' | 'require'} uniqueness
 * @property {string} copy
 * @property {string} seed
 * @property {number} quantity
 */

/**
 * @typedef {object} Puzzle One replayed puzzle (C15).
 * @property {string} id
 * @property {string} kind `made.kind`.
 * @property {string} status The replay's status.
 * @property {number} steps `result.steps.length`.
 * @property {number} bytes UTF-8 length of `JSON.stringify(result.steps)`.
 * @property {number} work `result.work`.
 */

/**
 * @typedef {object} ItemRecord One item of the receipt (C15).
 * @property {number} n
 * @property {'any' | 'require'} group
 * @property {number} lane
 * @property {string} cell
 * @property {'any' | 'require'} uniqueness
 * @property {{ id: string, treeId: string | null }} copy
 * @property {string} seed
 * @property {'measured' | 'not-measured' | 'failed' | 'censored' | 'not-started'} status
 * @property {string | null} reason
 * @property {string | null} detail What the failure or shortfall was, as observed.
 * @property {string | null} batchStatus
 * @property {Puzzle[]} puzzles
 * @property {{ steps: number, bytes: number, work: number } | null} maxima
 * @property {'ok' | 'exceeded' | null} margin
 * @property {string[]} exceeded The limits named by an exceeded margin.
 * @property {number | null} seconds
 */

/**
 * @typedef {object} Handle A copy's client, opened for one item.
 * @property {any} client
 * @property {string | null} treeId
 * @property {(text: string) => number} utf8Length `utf8Length` of the copy's core/engine/replay.js.
 * @property {() => void} close
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const DEFAULT_TREES = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'phase2', 'trees');
const USAGE = 'usage: node tools\\ig-proto\\phase2\\replay-probe.mjs --all --out <dir> [--trees <dir>] | --item <n> --out <dir> [--trees <dir>]';

/** The original horizon, the price proxy of one item and the admission reserve (R1), in seconds. */
export const HORIZON_S = 885;
export const ITEM_PRICE_S = 120;
export const RESERVE_S = 10;
export const QUANTITY = 4;

/** @type {readonly Item[]} */
export const ITEMS = Object.freeze([
  ['any', '26x26-hell-1', 'any', 'p2-gen4-diag'],
  ['any', '20x20-hell-1', 'any', 'p2-gen4-diag'],
  ['any', '24x24-nightmare', 'any', 'p2-gen4'],
  ['any', '22x22-nightmare', 'any', 'p2-gen4'],
  ['require', '22x22-hell-1', 'require', 'p2-gen4-diag'],
  ['require', '32x15-hell-1', 'require', 'p2-gen4-diag'],
  ['require', '22x22-nightmare', 'require', 'p2-gen4'],
  ['require', '32x15-nightmare', 'require', 'p2-gen4'],
].map(([group, cell, uniqueness, copy], i) => Object.freeze({
  n: i + 1,
  group: /** @type {'any' | 'require'} */ (group),
  cell,
  uniqueness: /** @type {'any' | 'require'} */ (uniqueness),
  copy,
  seed: `p2-replay/${cell}/0`,
  quantity: QUANTITY,
})));

/**
 * @param {{ steps: number, bytes: number, work: number }} maxima
 * @param {{ maxSteps: number, maxBytes: number, work: number }} [limits]
 * @returns {{ margin: 'ok' | 'exceeded', exceeded: string[] }} The margin of P2-T11: each maximum is at most half of its limit; `exceeded` names the limits that are not.
 */
export function marginOf(maxima, limits = REPLAY) {
  const exceeded = [
    ['maxSteps', maxima.steps, limits.maxSteps],
    ['maxBytes', maxima.bytes, limits.maxBytes],
    ['work', maxima.work, limits.work],
  ].filter(([, value, limit]) => !(Number(value) * 2 <= Number(limit))).map(([name]) => String(name));
  return { margin: exceeded.length === 0 ? 'ok' : 'exceeded', exceeded };
}

/**
 * Judges the replayed puzzles of an item whose batch accepted at least one.
 * @param {Puzzle[]} puzzles
 * @param {{ maxSteps: number, maxBytes: number, work: number }} [limits]
 * @returns {Pick<ItemRecord, 'status' | 'reason' | 'detail' | 'maxima' | 'margin' | 'exceeded'>}
 */
export function judgePuzzles(puzzles, limits = REPLAY) {
  const maxima = {
    steps: Math.max(...puzzles.map((p) => p.steps)),
    bytes: Math.max(...puzzles.map((p) => p.bytes)),
    work: Math.max(...puzzles.map((p) => p.work)),
  };
  const { margin, exceeded } = marginOf(maxima, limits);
  const unmatched = puzzles.filter((p) => p.status !== 'matched');
  if (unmatched.length > 0 || exceeded.length > 0) {
    const detail = [
      ...unmatched.map((p) => `replay ${p.id}: ${p.status}`),
      ...(exceeded.length > 0 ? [`margin exceeded: ${exceeded.join(', ')}`] : []),
    ].join('; ');
    return { status: 'failed', reason: unmatched.length > 0 ? 'replay not matched' : 'margin exceeded', detail, maxima, margin, exceeded };
  }
  if (puzzles.some((p) => p.kind === 'candidate')) {
    return { status: 'measured', reason: null, detail: null, maxima, margin, exceeded };
  }
  return { status: 'not-measured', reason: 'no ordinary candidate', detail: `${puzzles.length} accepted, none a candidate`, maxima, margin: null, exceeded };
}

/**
 * @param {string} cell
 * @returns {{ cols: number, rows: number, levelId: string }}
 */
export function parseCell(cell) {
  const match = /^(\d+)x(\d+)-(hell-1|nightmare)$/.exec(cell);
  if (match === null) {
    throw new Error(`bad cell ${cell}`);
  }
  return { cols: Number(match[1]), rows: Number(match[2]), levelId: match[3] };
}

/**
 * Runs one item on a client of its copy: the set, a batch of four with the set's calibration, and the replay of every
 * accepted puzzle (R10).
 * @param {Item} item
 * @param {Handle} handle
 * @returns {Promise<Pick<ItemRecord, 'status' | 'reason' | 'detail' | 'batchStatus' | 'puzzles' | 'maxima' | 'margin' | 'exceeded'>>}
 */
async function measure(item, handle) {
  const { client, utf8Length } = handle;
  const { cols, rows, levelId } = parseCell(item.cell);
  const none = { puzzles: [], maxima: null, margin: null, exceeded: [] };
  const made = await client.generateSet({
    boardRows: rectRows(cols, rows), rotation: 0, levelId, seedText: item.seed, uniqueness: item.uniqueness, maxActive: 676,
  });
  if (made.status !== 'complete' || made.set === undefined) {
    return {
      status: 'not-measured', reason: 'no set', detail: `the set request ended ${made.status}${made.reason === undefined ? '' : ` (${made.reason})`}`, batchStatus: null, ...none,
    };
  }
  const batch = await client.generateBatch({
    set: made.set,
    rotation: 0,
    targetLevelId: levelId,
    quantity: item.quantity,
    setSeed: item.seed,
    batchIndex: 1,
    uniqueness: item.uniqueness,
    seenLayouts: [],
    seenClues: [],
    calibration: made.calibration,
    setLevel: levelId,
    setAttempt: made.attempt,
    setOrigin: made.setOrigin,
  });
  const accepted = Array.isArray(batch.accepted) ? batch.accepted : [];
  const batchStatus = typeof batch.status === 'string' ? batch.status : null;
  if (accepted.length === 0) {
    return {
      status: 'not-measured', reason: 'no puzzle', detail: `the batch ended ${batchStatus}${batch.reason === undefined ? '' : ` (${batch.reason})`} with no accepted puzzle`, batchStatus, ...none,
    };
  }
  /** @type {Puzzle[]} */
  const puzzles = await Promise.all(accepted.map(async (/** @type {any} */ puzzle) => {
    const record = batch.made?.[puzzle.id];
    const result = await client.replayPuzzle({ set: made.set, puzzle, setOrigin: made.setOrigin, made: record ?? null });
    const steps = Array.isArray(result.steps) ? result.steps : [];
    return { id: puzzle.id, kind: record?.kind ?? 'unknown', status: result.status, steps: steps.length, bytes: utf8Length(JSON.stringify(steps)), work: result.work };
  }));
  return { batchStatus, puzzles, ...judgePuzzles(puzzles) };
}

/** @param {string} path @param {unknown} value */
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`.replace(/\n/g, '\r\n'));

/**
 * @param {ItemRecord[]} records
 * @returns {number} 0 when every item is measured with margin ok; 1 when any failed; 3 otherwise.
 */
export function exitOf(records) {
  if (records.some((r) => r.status === 'failed')) {
    return 1;
  }
  return records.every((r) => r.status === 'measured' && r.margin === 'ok') ? 0 : 3;
}

/**
 * @typedef {object} ProbeOptions
 * @property {string} out
 * @property {readonly Item[]} [items] Default the eight fixed items.
 * @property {(item: Item, lane: number) => Promise<Handle>} makeClient Opens the client of the item's copy.
 * @property {() => number} [now] Milliseconds of a monotonic clock (default `performance.now`).
 * @property {(copy: string) => string | null} [treeIdOf] The tree id of a copy that no client was opened for (default `null`).
 * @property {string | null} [trees] The trees folder recorded in the receipt.
 * @property {boolean} [receipt] Write `<out>/receipt.json` (default true; false for `--item`).
 * @property {{ maxSteps: number, maxBytes: number, work: number }} [limits]
 */

/**
 * Runs the schedule of R1: the groups in order, in each group two lanes (lane 1 the first and third items, lane 2 the
 * second and fourth), each lane in order. An item starts only while elapsed + 120 + 10 <= 885 s.
 * @param {ProbeOptions} o
 * @returns {Promise<{ items: ItemRecord[], exit: number, receipt: Record<string, unknown> | null }>}
 */
export async function runProbes(o) {
  const { out, makeClient } = o;
  const items = o.items ?? ITEMS;
  const now = o.now ?? (() => performance.now());
  const treeIdOf = o.treeIdOf ?? (() => null);
  const limits = o.limits ?? REPLAY;
  const dir = join(out, 'items');
  mkdirSync(dir, { recursive: true });
  const receiptPath = join(out, 'receipt.json');
  if (o.receipt !== false) {
    // A stale receipt must never stand for this run.
    rmSync(receiptPath, { force: true });
  }
  const t0 = now();

  /** @param {Item} item @param {number} lane @param {ItemRecord['status']} status @param {string} reason @returns {ItemRecord} */
  const unmeasured = (item, lane, status, reason) => ({
    n: item.n,
    group: item.group,
    lane,
    cell: item.cell,
    uniqueness: item.uniqueness,
    copy: { id: item.copy, treeId: treeIdOf(item.copy) },
    seed: item.seed,
    status,
    reason,
    detail: null,
    batchStatus: null,
    puzzles: [],
    maxima: null,
    margin: null,
    exceeded: [],
    seconds: null,
  });

  /** @param {Item} item @returns {ItemRecord | null} The recorded result of the item, or null when there is none. */
  const kept = (item) => {
    const path = join(dir, `${item.n}.json`);
    if (!existsSync(path)) {
      return null;
    }
    try {
      const record = JSON.parse(readFileSync(path, 'utf8'));
      return record?.n === item.n && record.cell === item.cell && typeof record.status === 'string' ? record : null;
    } catch {
      return null;
    }
  };

  /** @param {Item} item @param {number} lane @returns {Promise<ItemRecord>} */
  const step = async (item, lane) => {
    const recorded = kept(item);
    if (recorded !== null) {
      return recorded;
    }
    if (existsSync(join(dir, `${item.n}.started`))) {
      return unmeasured(item, lane, 'censored', 'started, no result');
    }
    if ((now() - t0) / 1000 + ITEM_PRICE_S + RESERVE_S > HORIZON_S) {
      return unmeasured(item, lane, 'not-started', 'admission');
    }
    try {
      writeFileSync(join(dir, `${item.n}.started`), `${new Date().toISOString()}\r\n`, { flag: 'wx' });
    } catch (e) {
      if (/** @type {NodeJS.ErrnoException} */ (e).code === 'EEXIST') {
        return unmeasured(item, lane, 'censored', 'started, no result');
      }
      throw e;
    }
    const started = now();
    /** @type {ItemRecord} */
    let record;
    /** @type {Handle | null} */
    let handle = null;
    try {
      handle = await makeClient(item, lane);
      const result = await measure(item, handle);
      record = { ...unmeasured(item, lane, 'failed', ''), ...result, copy: { id: item.copy, treeId: handle.treeId } };
    } catch (e) {
      record = { ...unmeasured(item, lane, 'failed', 'error'), detail: e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, ' ').slice(0, 300) : String(e) };
    } finally {
      handle?.close();
    }
    record.seconds = Math.round((now() - started)) / 1000;
    writeJson(join(dir, `${item.n}.json`), record);
    return record;
  };

  /** @type {Map<number, ItemRecord>} */
  const byN = new Map();
  const groups = [...new Set(items.map((i) => i.group))];
  for (const group of groups) {
    const members = items.filter((i) => i.group === group);
    const lanes = [1, 2].map((lane) => ({ lane, list: members.filter((_, i) => i % 2 === lane - 1) }));
    await Promise.all(lanes.map(async ({ lane, list }) => {
      for (const item of list) {
        byN.set(item.n, await step(item, lane));
      }
    }));
  }
  const records = items.map((i) => /** @type {ItemRecord} */ (byN.get(i.n)));
  const exit = exitOf(records);
  /** @type {Record<string, unknown> | null} */
  let receipt = null;
  if (o.receipt !== false) {
    receipt = { format: 'p2-replay-probes', version: 1, limits, items: records, sources: { trees: o.trees ?? null } };
    writeJson(receiptPath, receipt);
  }
  return { items: records, exit, receipt };
}

/**
 * @param {string} trees
 * @param {string} copy
 * @returns {string} The `treeId` of the copy's ig-tree.json.
 */
function treeIdOf(trees, copy) {
  return JSON.parse(readFileSync(join(trees, 'gen-v4', copy, 'ig-tree.json'), 'utf8')).treeId;
}

/** @param {string[]} argv @returns {Promise<number>} The exit code. */
async function main(argv) {
  /** @type {ReturnType<typeof parseArgs>} */
  let parsed;
  try {
    parsed = parseArgs(argv, { values: ['out', 'trees', 'item'], switches: ['all'] });
  } catch {
    console.error(USAGE);
    return 2;
  }
  const { args, on, rest } = parsed;
  const one = args.item === undefined ? null : ITEMS.find((i) => String(i.n) === args.item);
  if (rest.length > 0 || args.out === undefined || on.has('all') === (args.item !== undefined) || one === undefined) {
    console.error(USAGE);
    return 2;
  }
  const out = resolve(args.out);
  const trees = resolve(args.trees ?? DEFAULT_TREES);
  const chosen = one === null ? ITEMS : [one];
  try {
    for (const copy of new Set(chosen.map((i) => i.copy))) {
      treeIdOf(trees, copy);
    }
  } catch (e) {
    console.error(`replay-probe: the copies are not built under ${trees}: ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }
  const { openCopy, moduleOf } = await import('./proof-prior-replay.mjs');
  const result = await runProbes({
    out,
    items: chosen,
    trees,
    receipt: one === null,
    treeIdOf: (copy) => treeIdOf(trees, copy),
    makeClient: async (item) => {
      const copy = await openCopy(trees, 'gen-v4', item.copy);
      try {
        const { utf8Length } = await moduleOf(copy.base, 'core/engine/replay.js');
        return { client: copy.client, treeId: treeIdOf(trees, item.copy), utf8Length, close: copy.close };
      } catch (e) {
        copy.close();
        throw e;
      }
    },
  });
  for (const r of result.items) {
    console.log(`replay-probe: item ${r.n} ${r.cell} ${r.uniqueness} ${r.copy.id}: ${r.status}${r.reason === null ? '' : ` (${r.reason})`}${r.margin === null ? '' : `, margin ${r.margin}`}`);
  }
  console.log(`replay-probe: exit ${result.exit}`);
  return result.exit;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }, (error) => {
    console.error(`replay-probe: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  });
}
