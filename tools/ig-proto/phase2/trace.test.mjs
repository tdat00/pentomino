// @ts-check
// The copies' trace layer (P2-12d): the copy `p2-gen4` journals every selection call in the frozen ledger's format.
import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { threadId } from 'node:worker_threads';

import { lf } from '../lib/records.mjs';
import { planTree } from '../lib/tree.mjs';
import { parseLines, rowLedger } from '../verdicts.mjs';
import { buildCopy, COPIES, loadManifests, readSources, rehearse } from './copies.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILES_ROOT = join(HERE, 'files');
const REPO = join(HERE, '..', '..', '..');
const TODAY = 'Q:\\git\\pentomino-p2-today';
const FROZEN_SELECT = join(REPO, 'tests', 'artifacts', 'ig-proto', 'tree-frozen', 'fr-frozen', 'core', 'engine', 'ig-select-v4.js');
const RUN = join(REPO, 'tests', 'artifacts', 'ig-proto', 'phase2', 'self-test', `trace-${Date.now()}`);
const COPY = join(RUN, 'gen-v4', 'p2-gen4');
const FIRST_ROW = 'set-ok';

/** True while the cutover of P2-15 is not merged: the copy is built on the rehearsed sources. */
const rehearsal = !readFileSync(join(REPO, 'core', 'engine', 'version.js'), 'utf8').includes("ALGO_ID = 'gen-v4'");
const manifests = loadManifests();
const frozenSelect = /** @type {any} */ (await import(pathToFileURL(FROZEN_SELECT).href));

/** @type {Record<string, any>} */
let m = {};
/** @type {any} */
let execution = null;
/** @type {any} */
let first = null;

/** @param {string} name @returns {string} */
const caseDir = (name) => join(RUN, name);

/** @param {string} dir @param {string} row */
function logTo(dir, row) {
  mkdirSync(dir, { recursive: true });
  process.env.IG_LOG_DIR = dir;
  process.env.IG_ROW = row;
}

function logOff() {
  delete process.env.IG_LOG_DIR;
  delete process.env.IG_ROW;
}

/**
 * Runs `fn` with the journal of its own folder and row, and removes both variables at its end.
 * @template T
 * @param {string} name
 * @param {(dir: string) => T} fn
 * @returns {T}
 */
function inCase(name, fn) {
  const dir = caseDir(name);
  logTo(dir, name);
  try {
    return fn(dir);
  } finally {
    logOff();
  }
}

/**
 * @param {string} dir
 * @returns {Record<string, any>[]} The lines of every worker journal of the folder, in name order; a problem fails the case.
 */
function journal(dir) {
  /** @type {Record<string, any>[]} */
  const lines = [];
  const names = readdirSync(dir).filter((n) => !n.endsWith('.link.jsonl') && !n.endsWith('.row.jsonl')).sort();
  for (const name of names) {
    const parsed = parseLines(readFileSync(join(dir, name), 'utf8'), name);
    assert.deepEqual(parsed.problems, [], name);
    lines.push(...parsed.lines);
  }
  return lines;
}

/** @param {'any' | 'require'} [uniqueness] @returns {any} */
const setRequest = (uniqueness = 'any') => ({
  board: m.rectangle(10, 6), rotation: 0, levelId: 'hard', seedText: 'p2-12d', uniqueness, execution,
});

/** @param {string} outcome @returns {any[]} The link journal of one set attempt. */
const setLink = (outcome) => [{ t: 'link', ev: 'set-complete', attempt: 0, outcome }];

before(async () => {
  mkdirSync(RUN, { recursive: true });
  await buildCopy('p2-gen4', { source: 'gen-v4', root: REPO, rehearsal, destRoot: RUN });
  logTo(caseDir(FIRST_ROW), FIRST_ROW);
  const load = (/** @type {string} */ file) => import(pathToFileURL(join(COPY, 'core', 'engine', file)).href);
  const names = ['generate', 'clues', 'board', 'workspace', 'levels', 'policy', 'difficulty', 'rng', 'carve', 'p2-trace'];
  const modules = await Promise.all(names.map((n) => load(`${n}.js`)));
  m = Object.assign({}, ...modules);
  execution = { main: m.createWorkspace(m.MAIN_WORKSPACE_BYTES), scratch: m.createWorkspace(m.SCRATCH_WORKSPACE_BYTES) };
});

after(() => {
  logOff();
  rmSync(RUN, { recursive: true, force: true });
});

describe('the copies trace layer', () => {
  it('a set attempt journals a complete call', () => {
    inCase(FIRST_ROW, (dir) => {
      first = m.setAttempt(setRequest(), 0);
      assert.equal(first.ok, true);
      const lines = journal(dir);
      const ledger = rowLedger(lines, setLink('ok'));
      assert.deepEqual(ledger.problems, []);
      assert.equal(ledger.complete, true);
      assert.equal(ledger.calls, 1);
      assert.equal(ledger.ended, 1);
      assert.equal(ledger.lo, ledger.hi);
      assert.ok(ledger.lo > 0);
      const start = lines.find((l) => l.t === 'start');
      assert.equal(start?.stage, 'set');
      assert.equal(start?.attempt, 0);
    });
  });

  it('a batch candidate names its slot and attempt', () => {
    inCase('batch', (dir) => {
      const ctx = {
        set: first.set, targetLevelId: 'hard', quantity: 3, batchSeed: 'p2-12d#1', uniqueness: 'any',
        seenLayouts: new Set(), seenClues: new Set(), execution,
      };
      const c = m.puzzleCandidate(ctx, 2, 1);
      assert.ok('layout' in c);
      const start = journal(dir).find((l) => l.t === 'start');
      assert.equal(start?.stage, 'batch');
      assert.equal(start?.attempt, '2/1');
    });
  });

  it('the traced units equal the metered charge', () => {
    inCase('charge', (dir) => {
      /** @type {number[]} */
      const charges = [];
      assert.equal(m.setAttempt(setRequest(), 0, { charge: (/** @type {number} */ u) => charges.push(u) }).ok, true);
      const ledger = rowLedger(journal(dir), setLink('ok'));
      assert.deepEqual(ledger.problems, []);
      assert.ok(charges.length > 0);
      assert.equal(charges.reduce((sum, u) => sum + u, 0), ledger.lo);
    });
  });

  it('the trace changes no result', () => {
    inCase('same', () => {
      delete process.env.IG_LOG_DIR;
      const bare = m.setAttempt(setRequest(), 0);
      process.env.IG_LOG_DIR = caseDir('same');
      const traced = m.setAttempt(setRequest(), 0);
      assert.deepEqual(traced, bare);
    });
  });

  it('the first line of a journal is the worker line', () => {
    const name = readdirSync(caseDir(FIRST_ROW)).find((n) => n === `${FIRST_ROW}.${process.pid}.${threadId}.jsonl`);
    assert.ok(name);
    const line = JSON.parse(readFileSync(join(caseDir(FIRST_ROW), name), 'utf8').split('\n')[0]);
    assert.deepEqual(Object.keys(line), ['t', 'pid', 'threadId', 'at']);
    assert.deepEqual({ ...line, at: 0 }, { t: 'worker', pid: process.pid, threadId: 0, at: 0 });
    assert.ok(Number.isFinite(line.at));
  });

  it('each destination begins with its worker header', () => {
    for (const row of ['row-a', 'row-b']) {
      inCase(row, (dir) => {
        assert.equal(m.setAttempt(setRequest(), 0).ok, true);
        const text = readFileSync(join(dir, `${row}.${process.pid}.${threadId}.jsonl`), 'utf8');
        const lines = text.split('\n').filter((l) => l !== '').map((l) => JSON.parse(l));
        assert.equal(lines[0].t, 'worker');
        assert.equal(lines.filter((l) => l.t === 'worker').length, 1);
        assert.ok(lines.length > 1);
      });
    }
  });

  it('a require call journals its counts', () => {
    inCase('require', (dir) => {
      const r = m.setAttempt(setRequest('require'), 0);
      assert.equal(r.ok, true);
      const lines = journal(dir);
      const ledger = rowLedger(lines, setLink('ok'));
      assert.deepEqual(ledger.problems, []);
      assert.equal(ledger.complete, true);
      assert.ok(lines.some((l) => l.t === 'count'));
      assert.equal(lines.find((l) => l.t === 'end')?.locate.countWork, ledger.countWork);
    });
  });
});

// The context of P2-05a's `run(name, spec)` (tests/select-v4.test.js) on the K = 15 set with synthetic ratings, with
// the copy's modules and the copy's dispatcher.
const K15_SIZES = [5, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 8, 9, 10, 10];
/** @type {{ board: any, set: any } | null} */
let k15Cache = null;

/** The K = 15 set of the frozen vectors, carved with the copy's modules. */
function k15() {
  if (k15Cache === null) {
    const board15 = m.boardFromRows(Array.from({ length: 10 }, () => '#'.repeat(10)));
    const stream = m.createRng(m.normalizeSeedText('ig-selftest/proto/k15/1'), 'set/0');
    const ks = /** @type {number[]} */ (m.pieceCountRange('master', 100));
    const k = ks[stream.int(ks.length)];
    const carved = /** @type {any} */ ((100 / k >= 6.5 ? m.carveMacro(board15, k, stream.derive('macro'), m.BUDGETS) : null)
      ?? m.carveFlatSet(board15, k, stream.derive('flat'), m.BUDGETS));
    const set = m.finalizeSet(board15, carved.regions, carved.regionOf ?? null);
    assert.deepEqual(set.pieces.map((/** @type {any} */ p) => p.cells.length).sort((/** @type {number} */ a, /** @type {number} */ b) => a - b), K15_SIZES);
    k15Cache = { board: board15, set };
  }
  return k15Cache;
}

/**
 * @param {number} score
 * @param {{ work?: number, Gproved?: number, stop?: string }} [opts]
 * @returns {any}
 */
function synthetic(score, { work = 1, Gproved = 1, stop = 'exhausted' } = {}) {
  return {
    model: 'difficulty-v3', score, level: 'st', saturated: false,
    metrics: { work, censusWork: 0, nodes: 1, censusNodes: 0, searchStop: stop, Gproved, censusComplete: true },
  };
}

const BAND = Object.freeze({ id: 'nightmare', min: 55, max: 70, share: 0.3 });
const DOWN = (/** @type {number} */ c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c));
const capAll = () => 'cap';
const REBRACKETED_CANON = (/** @type {number} */ c) => synthetic(100 - 10 * c);
const OVERWORK_SCREEN = (/** @type {number} */ c) => (c === 7 ? synthetic(30, { work: 190000001, stop: 'work-cap' }) : DOWN(c));
const AR1_SCREEN = (/** @type {number} */ c) => (c === 4 ? synthetic(60, { Gproved: 0 }) : DOWN(c));

/**
 * @param {(count: number) => any} fn
 * @param {any[]} clues
 */
function fromCount(fn, clues) {
  const r = fn(clues.length);
  if (r === 'cap') {
    throw new m.IncompleteRatingError('synthetic cap', { nodes: 1, work: m.DEDUCE.work, stop: 'work-cap' });
  }
  return r;
}

/**
 * One call of the copy's `selectClues` on the K = 15 set with synthetic ratings.
 * @param {string} name
 * @param {Record<string, any>} spec
 * @returns {{ result: any, events: any[] }}
 */
function run(name, spec) {
  const { board: board15, set } = /** @type {{ board: any, set: any }} */ (k15());
  /** @type {any[]} */
  const events = [];
  const result = m.selectClues({
    board: board15, pieces: set.pieces, layout: set.witness, target: spec.target ?? BAND,
    uniqueness: spec.uniqueness ?? 'any', rng: m.createRng(m.normalizeSeedText('ig-selftest/proto/p1'), `selftest/${name}`),
    excludeClueKeys: new Set(), ws: m.createWorkspace(m.MAIN_WORKSPACE_BYTES),
    igPrior: spec.prior ?? null, screenW: 190000000,
    rateScreen: (/** @type {any[]} */ clues) => fromCount(spec.screen, clues),
    rate: (/** @type {any} */ _b, /** @type {any} */ _p, /** @type {any[]} */ clues) => fromCount(spec.canon ?? spec.screen, clues),
    ...(spec.budget === undefined ? {} : { budget: spec.budget }),
    record: (/** @type {any} */ ev) => events.push(ev),
  });
  return { result, events };
}

/**
 * @param {string} name
 * @param {Record<string, any>} spec
 * @returns {{ end: any, result: any, events: any[] }} The call's `end` line.
 */
function endOf(name, spec) {
  return inCase(name, (dir) => {
    const { result, events } = run(name, spec);
    const ends = journal(dir).filter((l) => l.t === 'end');
    assert.equal(ends.length, 1);
    return { end: ends[0], result, events };
  });
}

describe('the call journal of the selector', () => {
  const NIGHTMARE = () => ({ ...m.level('nightmare'), id: 'nightmare' });

  it('the end line keeps the raw no-window side and the budget stop', () => {
    const below = endOf('below1', { target: NIGHTMARE(), screen: () => synthetic(30) });
    assert.equal(below.end.result, 'not-in-band');
    assert.equal(below.end.igNoWindow, 'below');
    assert.equal(below.end.budgetStop, false);
    const budget = endOf('budget-any-54', { target: NIGHTMARE(), screen: () => synthetic(54, { work: 100 }), budget: 250 });
    assert.equal(budget.end.result, 'ok');
    assert.equal(budget.end.igNoWindow, null);
    assert.equal(budget.end.budgetStop, true);
    assert.equal(budget.end.clueCount, 7);
  });

  it('re-rating starts are journaled', () => {
    const cases = /** @type {[string, Record<string, any>][]} */ ([
      ['overwork', { screen: OVERWORK_SCREEN, canon: DOWN }],
      ['ar1in', { screen: AR1_SCREEN }],
      ['confirmed', { screen: capAll, canon: () => synthetic(90) }],
      ['heuristic', { prior: 2, screen: capAll, canon: () => synthetic(90) }],
      ['rebracketed', { screen: capAll, canon: REBRACKETED_CANON }],
      ['rescuedin', { screen: capAll, canon: (/** @type {number} */ c) => synthetic(c === 13 ? 60 : 90) }],
      ['rescuedrefused', { screen: capAll, canon: (/** @type {number} */ c) => (c === 13 ? synthetic(60, { Gproved: 0 }) : synthetic(90)) }],
      ['require-rebracketed', { uniqueness: 'require', screen: capAll, canon: REBRACKETED_CANON }],
    ]);
    for (const [name, spec] of cases) {
      const dir = caseDir(`rerate-${name}`);
      logTo(dir, `rerate-${name}`);
      try {
        const { events } = run(name, { budget: Infinity, ...spec });
        const lines = journal(dir);
        for (const phase of ['close', 'rescue', 'rerate']) {
          const kinds = events.filter((ev) => ['rated', 'unrateable', 'rejected'].includes(ev.kind) && ev.phase === phase).length;
          assert.equal(lines.filter((l) => l.t === 'rerate' && l.phase === phase).length, kinds, `${name}: ${phase}`);
        }
        assert.ok(lines.some((l) => l.t === 'rerate'), name);
      } finally {
        logOff();
      }
    }
  });

  it('the dead-end line is in place', () => {
    const sources = readSources(REPO);
    const plan = planTree('p2-gen4', { manifests, filesRoot: FILES_ROOT, sources: rehearsal ? rehearse(sources) : sources });
    const text = String(plan.files.get('core/engine/select-v4.js'));
    assert.ok(text.includes("    if (rated.length === 0) {\n      p2TracePhase('p2');\n    }\n    for (let attempt = 0; rated.length === 0 && attempt < 4 * SAMPLES_PER_COUNT; attempt += 1) {\n"));
  });

  it('ratingBound equals the frozen bound', () => {
    const { board, pieces, witness } = first.set;
    for (const clues of [witness.slice(0, 2), witness.slice(0, 4)]) {
      for (const limits of [{ ...m.DEDUCE }, { ...m.DEDUCE, work: 190000000 }]) {
        assert.equal(m.ratingBound(board, pieces, clues, limits), frozenSelect.igRatingBound(board, pieces, clues, limits));
      }
    }
  });
});

describe('the layers', () => {
  it('the link layer is the frozen one', () => {
    const frozen = ['log', 'link', 'instr'].map((id) => JSON.parse(readFileSync(join(REPO, 'tools', 'ig-proto', 'variants', `${id}.json`), 'utf8')));
    /** @type {Map<string, any>} */
    const byId = new Map(frozen.flatMap((f) => f.edits).map((/** @type {any} */ e) => [e.id, e]));
    const { edits } = manifests['p2-link'];
    assert.deepEqual(edits.map((/** @type {any} */ e) => e.id), [
      'log-5', 'log-6', 'log-7', 'log-8', ...Array.from({ length: 17 }, (_, i) => `link-${i + 1}`), 'instr-7',
    ]);
    for (const edit of edits) {
      assert.deepEqual(edit, byId.get(edit.id), edit.id);
    }
    const ours = readFileSync(join(HERE, 'files', 'p2-link', 'core', 'browser', 'ig-link.js'), 'utf8');
    const theirs = readFileSync(join(REPO, 'tools', 'ig-proto', 'variants', 'files', 'link', 'core', 'browser', 'ig-link.js'), 'utf8');
    assert.equal(lf(ours), lf(theirs));
  });

  it('every measured copy is traced', () => {
    const sources = readSources(REPO);
    const gen4 = rehearsal ? rehearse(sources) : sources;
    const today = readSources(TODAY);
    for (const id of [...COPIES['gen-v4'], ...COPIES.today]) {
      const p = planTree(id, { manifests, filesRoot: FILES_ROOT, sources: id === 'p2-today' ? today : gen4 });
      assert.ok(p.chain.includes('p2-link'), id);
      assert.ok(p.chain.includes(id === 'p2-today' ? 'p2-trace-today' : 'p2-trace'), id);
      assert.equal(p.params.trace, 'p2-trace-v1', id);
    }
  });
});
