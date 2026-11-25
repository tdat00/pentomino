// @ts-check
// Proof bundle 1, the observers (P2-12c; plan §7.2, review-1 R5; P2-T02): `charge`, `record` and the trace leave the
// selection's results, work and skips unchanged, and the traced units equal the metered units. Each case runs the
// selection four times on the same set: production `selectCluesV4` with no observer, with `charge`, with `record` and
// `charge`, and the copy `p2-gen4`'s dispatcher `clues.selectClues` (the traced one) with `charge`. Run by proofs.mjs:
//   node tools\ig-proto\phase2\proofs.mjs observer --out <dir> [--quick]
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { activeCount, boardFromRows } from '../../../core/engine/board.js';
import { carveFlatSet, carveMacro, finalizeSet } from '../../../core/engine/carve.js';
import { level } from '../../../core/engine/levels.js';
import { BUDGETS, pieceCountRange } from '../../../core/engine/policy.js';
import { createRng, normalizeSeedText } from '../../../core/engine/rng.js';
import { selectCluesV4 } from '../../../core/engine/select-v4.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../../../core/engine/workspace.js';
import { caseBoard } from '../lib/sets.mjs';
import { rowLedger } from '../verdicts.mjs';
import { bundleStatus, caseStatus, moduleOf } from './proof-prior-replay.mjs';
import { compare } from './proofs.mjs';
import { readRowFolder } from './trace-reader.mjs';

const SOURCE = 'gen-v4';
const COPY = 'p2-gen4';
const CELLS = Object.freeze(['14x14-nightmare', '15x15b10-nightmare', '10x10-nightmare', '15x20-nightmare']);
const REQUIRE_CELL = '10x10-nightmare';
const SEEDS = 3;
const REQUIRE_SEEDS = 2;
const MACRO_MIN_MEAN = 6.5;

/**
 * @typedef {object} ObserverRequest
 * @property {string} id The case id, also its journal folder and `IG_ROW`.
 * @property {string} cell
 * @property {string} seed
 * @property {'any' | 'require'} uniqueness
 */

/**
 * @typedef {object} JournalView What the traced call left in its own journal folder.
 * @property {boolean} complete
 * @property {string[]} problems
 * @property {number} calls
 * @property {number} lo
 * @property {number} hi
 */

/**
 * @typedef {object} ObserverRecord One measured case.
 * @property {Record<'none' | 'charge' | 'record' | 'traced', unknown>} views The comparable parts of the four results.
 * @property {Record<'charge' | 'record' | 'traced', number>} units The summed `charge` units of runs (b), (c) and (d).
 * @property {JournalView | null} journal `null`: no journal was read.
 */

/**
 * @param {boolean} quick
 * @returns {ObserverRequest[]} Three seeds of each cell with `any` and two of `10x10-nightmare` with `require`; with `quick` the first case of each kind (`any`, `require`).
 */
export function observerRequests(quick) {
  /** @type {ObserverRequest[]} */
  const any = CELLS.flatMap((cell) => Array.from({ length: SEEDS }, (_, i) => ({ id: `${cell}-${i}`, cell, seed: `p2-proof/${cell}/${i}`, uniqueness: /** @type {const} */ ('any') })));
  /** @type {ObserverRequest[]} */
  const require = Array.from({ length: REQUIRE_SEEDS }, (_, i) => ({
    id: `${REQUIRE_CELL}-require-${i}`, cell: REQUIRE_CELL, seed: `p2-proof/${REQUIRE_CELL}/${i}`, uniqueness: /** @type {const} */ ('require'),
  }));
  return quick ? [any[0], require[0]] : [...any, ...require];
}

/**
 * The set of `setAttempt` (lines 113-135 of the base's core/engine/generate.js) for the seed with `attempt = 0`, made on
 * production modules, and a fresh `cal` stream: P2-05b's parity script makes its sets the same way.
 * @param {string} cell A case of the frozen catalogue (`tools/ig-proto/data/boards-v1.json`), all Nightmare.
 * @param {string} seed
 * @returns {{ board: any, set: any, cal: any }}
 */
export function makeSet(cell, seed) {
  const board = boardFromRows(caseBoard(cell).boardRows);
  const rng = createRng(normalizeSeedText(seed), 'set/0');
  const ks = pieceCountRange('nightmare', activeCount(board));
  if (ks === null || ks.length === 0) {
    throw new Error(`nightmare is not offered for ${cell}`);
  }
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
  return { board, set: finalizeSet(board, carved.regions, carved.regionOf ?? null), cal: rng.derive('cal') };
}

/**
 * @param {any} res A selection result.
 * @returns {Record<string, unknown>} The parts that must not change: `ok`, the clue piece ids, `rating`, `skips`, `igWindow` and `counters`.
 */
export function viewOf(res) {
  return {
    ok: res.ok,
    clues: res.ok ? res.clues.map((/** @type {{ piece: unknown }} */ p) => p.piece) : null,
    rating: res.rating ?? null,
    skips: res.skips ?? null,
    igWindow: res.igWindow ?? null,
    counters: res.counters ?? null,
  };
}

/**
 * Judges one measured case (R5): the results of (b) to (d) equal the no-observer result, the metered units agree, and
 * the journal of the traced call is a complete ledger whose interval is exactly those units. Missing evidence fails.
 * @param {ObserverRecord} rec
 * @returns {{ status: 'pass' | 'fail' | 'not-measured', problems: string[] }}
 */
export function judgeObserverCase(rec) {
  /** @type {string[]} */
  const problems = [];
  for (const name of /** @type {const} */ (['charge', 'record', 'traced'])) {
    const path = compare(rec.views.none, rec.views[name]);
    if (path !== null) {
      problems.push(`the ${name} run differs from the no-observer run at ${path}`);
    }
  }
  const { charge, record, traced } = rec.units;
  if (record !== charge || traced !== charge) {
    problems.push(`metered units differ: charge ${charge}, record+charge ${record}, traced ${traced}`);
  }
  if (rec.journal === null) {
    problems.push('no journal was read');
  } else {
    if (!rec.journal.complete) {
      problems.push(`the journal is incomplete: ${rec.journal.problems.join('; ') || 'no reason given'}`);
    }
    if (rec.journal.lo !== rec.journal.hi) {
      problems.push(`the journal interval is open: lo ${rec.journal.lo}, hi ${rec.journal.hi}`);
    }
    if (rec.journal.lo !== charge) {
      problems.push(`the traced sum ${rec.journal.lo} differs from the charge units ${charge}`);
    }
  }
  return { status: caseStatus(problems, []), problems };
}

/**
 * @param {string} dir The row's journal folder.
 * @param {string} row
 * @returns {JournalView} The ledger of the row's worker journals, with the folder's own problems; no call journaled is a problem.
 */
export function journalOf(dir, row) {
  const folder = readRowFolder(dir, row);
  const ledger = rowLedger(folder.workerFiles.flatMap((file) => file.lines), []);
  const problems = [...folder.problems, ...ledger.problems];
  if (ledger.calls === 0) {
    problems.push('no call was journaled');
  }
  return { complete: ledger.complete && problems.length === 0, problems, calls: ledger.calls, lo: ledger.lo, hi: ledger.hi };
}

/** The sentinel that the throwing `record` raises. */
class Stop extends Error {}

/**
 * A `record` that throws on its third event propagates out of the call.
 * @param {ObserverRequest} request
 * @returns {{ status: 'pass' | 'fail', problems: string[], events: number }}
 */
function recordThrows(request) {
  const made = makeSet(request.cell, request.seed);
  let events = 0;
  /** @type {string[]} */
  const problems = [];
  try {
    selectCluesV4({
      board: made.board, pieces: made.set.pieces, layout: made.set.witness, target: level('nightmare'), rng: made.cal,
      uniqueness: request.uniqueness, excludeClueKeys: new Set(), ws: createWorkspace(MAIN_WORKSPACE_BYTES),
      record: () => {
        events += 1;
        if (events === 3) {
          throw new Stop('third event');
        }
      },
    });
    problems.push('the call returned although record threw');
  } catch (e) {
    if (!(e instanceof Stop)) {
      problems.push(`the call threw another error: ${e instanceof Error ? e.message : String(e)}`);
    } else if (events !== 3) {
      problems.push(`record threw on event ${events}, not the third`);
    }
  }
  return { status: problems.length === 0 ? 'pass' : 'fail', problems, events };
}

/**
 * @param {ObserverRequest} request
 * @param {{ clues: any, workspace: any, levels: any }} copy The modules of the copy.
 * @param {string} out
 * @returns {{ rec: ObserverRecord, ok: boolean, events: number }}
 */
function measure(request, copy, out) {
  /** @param {Record<string, any>} extra @param {{ level: (id: string) => any, createWorkspace: (bytes: number) => any, MAIN_WORKSPACE_BYTES: number }} mods */
  const ctxOf = (extra, mods) => {
    const made = makeSet(request.cell, request.seed);
    return {
      board: made.board, pieces: made.set.pieces, layout: made.set.witness, target: mods.level('nightmare'), rng: made.cal,
      uniqueness: request.uniqueness, excludeClueKeys: new Set(), ws: mods.createWorkspace(mods.MAIN_WORKSPACE_BYTES), ...extra,
    };
  };
  const production = { level, createWorkspace, MAIN_WORKSPACE_BYTES };
  /** @param {number[]} into */
  const charge = (into) => (/** @type {number} */ u) => into.push(u);
  /** @param {number[]} list */
  const sum = (list) => list.reduce((a, b) => a + b, 0);

  const none = selectCluesV4(ctxOf({}, production));
  /** @type {number[]} */
  const chargeUnits = [];
  const charged = selectCluesV4(ctxOf({ charge: charge(chargeUnits) }, production));
  /** @type {number[]} */
  const recordUnits = [];
  let events = 0;
  const recorded = selectCluesV4(ctxOf({ charge: charge(recordUnits), record: () => { events += 1; } }, production));

  const dir = resolve(out, 'journal', request.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  /** @type {number[]} */
  const tracedUnits = [];
  const before = { dir: process.env.IG_LOG_DIR, row: process.env.IG_ROW };
  process.env.IG_LOG_DIR = dir;
  process.env.IG_ROW = request.id;
  /** @type {any} */
  let traced;
  try {
    traced = copy.clues.selectClues(ctxOf({
      charge: charge(tracedUnits), igStage: 'set', igAttempt: 0,
    }, { level: copy.levels.level, createWorkspace: copy.workspace.createWorkspace, MAIN_WORKSPACE_BYTES: copy.workspace.MAIN_WORKSPACE_BYTES }));
  } finally {
    restoreEnv(before);
  }
  return {
    rec: {
      views: { none: viewOf(none), charge: viewOf(charged), record: viewOf(recorded), traced: viewOf(traced) },
      units: { charge: sum(chargeUnits), record: sum(recordUnits), traced: sum(tracedUnits) },
      journal: journalOf(dir, request.id),
    },
    ok: none.ok === true,
    events,
  };
}

/** @param {{ dir: string | undefined, row: string | undefined }} saved */
function restoreEnv(saved) {
  for (const [name, value] of /** @type {const} */ ([['IG_LOG_DIR', saved.dir], ['IG_ROW', saved.row]])) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

/**
 * @param {{ out: string, quick: boolean, root?: string, trees: string }} o
 * @returns {Promise<{ status: 'pass' | 'fail', cases: unknown[], counts: Record<string, unknown>, copies: string[] }>}
 */
export async function run({ out, quick, trees }) {
  const saved = { dir: process.env.IG_LOG_DIR, row: process.env.IG_ROW };
  // The copy's trace layer writes its worker header when it is loaded, so it is loaded with no journal folder set.
  delete process.env.IG_LOG_DIR;
  delete process.env.IG_ROW;
  const base = join(trees, SOURCE, COPY);
  /** @type {{ clues: any, workspace: any, levels: any }} */
  let copy;
  try {
    copy = {
      clues: await moduleOf(base, 'core/engine/clues.js'),
      workspace: await moduleOf(base, 'core/engine/workspace.js'),
      levels: await moduleOf(base, 'core/engine/levels.js'),
    };
  } finally {
    restoreEnv(saved);
  }
  const requests = observerRequests(quick);
  /** @type {any[]} */
  const cases = [];
  const counts = { cases: 0, pass: 0, fail: 0, selected: 0, units: 0, tracedCalls: 0 };
  for (const request of requests) {
    const t0 = Date.now();
    /** @type {{ status: string, problems: string[] }} */
    let verdict;
    /** @type {Record<string, unknown>} */
    let detail = {};
    try {
      const m = measure(request, copy, out);
      verdict = judgeObserverCase(m.rec);
      detail = { ok: m.ok, events: m.events, units: m.rec.units, journal: m.rec.journal === null ? null : { complete: m.rec.journal.complete, calls: m.rec.journal.calls, lo: m.rec.journal.lo, hi: m.rec.journal.hi } };
      counts.selected += m.ok ? 1 : 0;
      counts.units += m.rec.units.traced;
      counts.tracedCalls += m.rec.journal?.calls ?? 0;
    } catch (e) {
      verdict = { status: 'fail', problems: [`error: ${e instanceof Error ? e.message : String(e)}`] };
    }
    counts.cases += 1;
    counts[verdict.status === 'pass' ? 'pass' : 'fail'] += 1;
    cases.push({ case: 'observer', id: request.id, cell: request.cell, seed: request.seed, uniqueness: request.uniqueness, ...verdict, ...detail, ms: Date.now() - t0 });
  }
  const thrown = recordThrows(requests[0]);
  counts.cases += 1;
  counts[thrown.status] += 1;
  cases.push({ case: 'record-throws', id: requests[0].id, ...thrown });
  return { status: bundleStatus(cases), cases, counts, copies: [COPY] };
}
