// @ts-check
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readRowFolder, rowWork, workLedger } from './trace-reader.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RUN = join(REPO, 'tests', 'artifacts', 'ig-proto', 'phase2', 'self-test', `reader-${Date.now()}`);
const EXPECT = { row: 'r1', seed: 's1', acceptedCount: 1 };

after(() => {
  rmSync(RUN, { recursive: true, force: true });
});

const text = (/** @type {(object | string)[]} */ lines) => lines.map((l) => `${typeof l === 'string' ? l : JSON.stringify(l)}\n`).join('');

/** The complete call `r1:9:1:<n>`. @param {number} n @param {Record<string, any>} [over] */
function call(n, over = {}) {
  const id = `r1:9:1:${n}`;
  return {
    start: { t: 'start', call: id, stage: 'set', attempt: 0, level: 'x', A: 1, at: 1, ...over.start },
    caps: { t: 'caps', call: id, count: true },
    begin: { t: 'begin', call: id, kind: 'rate', bound: 1000 },
    p: { t: 'p', call: id, i: 0, tuple: ['call', 5, 'rated', 60, 90, 10] },
    end: { t: 'end', call: id, result: 'ok', work: 100, profiles: 1, locate: { countWork: 0 }, igNoWindow: null, budgetStop: false, clueCount: null, at: 2, ...over.end },
  };
}

const worker = (pid = 9, threadId = 1) => ({ t: 'worker', pid, threadId, at: 0 });
const ROW = { t: 'row', row: 'r1', seed: 's1', caseId: 'c', localRep: 20, pid: 9 };
const SET_COMPLETE = { t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' };
const WORKER_END = { t: 'link', ev: 'worker-end', pid: 9, threadId: 1, at: 50 };

/**
 * Writes one case's folder; a file given as `null` is not written.
 * @param {string} name
 * @param {Record<string, (object | string)[] | null>} files File name to lines.
 * @returns {string} The folder.
 */
function folder(name, files) {
  const dir = join(RUN, name);
  mkdirSync(dir, { recursive: true });
  for (const [file, lines] of Object.entries(files)) {
    if (lines !== null) {
      writeFileSync(join(dir, file), text(lines));
    }
  }
  return dir;
}

/** The files of the complete row. @param {Record<string, any>} [over] @returns {Record<string, any[]>} */
function complete(over = {}) {
  const c = call(1, over);
  return {
    'r1.9.1.jsonl': [worker(), c.start, c.caps, c.begin, c.p, c.end],
    'r1.link.jsonl': [SET_COMPLETE, WORKER_END],
    'r1.row.jsonl': [ROW],
  };
}

describe('the trace reader on a row folder', () => {
  it('a complete row', () => {
    const result = rowWork(folder('complete', complete()), EXPECT);
    assert.deepEqual(result.problems, []);
    assert.equal(result.complete, true);
    assert.equal(result.lo, 100);
    assert.equal(result.hi, 100);
    assert.deepEqual(result.outcomes, [{ stage: 'set', attempt: 0, result: 'ok', igNoWindow: null, budgetStop: false }]);
  });

  it("a terminated worker's open primitive adds its bound", () => {
    const second = call(2, { start: { stage: 'batch', attempt: '1/0', at: 2 } });
    const files = complete();
    files['r1.9.1.jsonl'].push(second.start, second.caps, { ...second.begin, bound: 5000 });
    const result = rowWork(folder('terminated', files), EXPECT);
    assert.deepEqual(result.problems, []);
    assert.equal(result.complete, true);
    assert.equal(result.terminated, 1);
    assert.equal(result.open, 1);
    assert.equal(result.lo, 100);
    assert.equal(result.hi, 5100);
  });

  it('a whole worker journal is missing', () => {
    const files = complete();
    files['r1.link.jsonl'].push({ t: 'link', ev: 'worker-end', pid: 9, threadId: 2, at: 60 });
    const result = rowWork(folder('missing-worker', files), EXPECT);
    assert.equal(result.complete, false);
    assert.ok(result.problems.includes('missing worker journal 9/2'));
  });

  it('a worker journal that does not begin with its own header is missing', () => {
    const files = complete();
    files['r1.9.1.jsonl'][0] = worker(9, 2);
    const result = rowWork(folder('wrong-header', files), EXPECT);
    assert.ok(result.problems.includes('missing worker journal 9/1'));
  });

  it('empty evidence despite accepted puzzles', () => {
    const files = { 'r1.9.1.jsonl': [worker()], 'r1.link.jsonl': [SET_COMPLETE, WORKER_END], 'r1.row.jsonl': [ROW] };
    const result = rowWork(folder('empty', files), { ...EXPECT, acceptedCount: 3 });
    assert.equal(result.complete, false);
    assert.ok(result.problems.includes('empty evidence'));
    assert.ok(!rowWork(folder('empty-none', files), { ...EXPECT, acceptedCount: 0 }).problems.includes('empty evidence'));
  });

  it('an unmatched completed task', () => {
    const files = complete();
    files['r1.link.jsonl'].push({ t: 'link', ev: 'complete', slot: 1, attempt: 0, ok: true, outcome: 'candidate' });
    const result = rowWork(folder('unmatched', files), EXPECT);
    assert.equal(result.complete, false);
    assert.ok(result.problems.includes('unmatched batch candidate 1/0'));
  });

  it("a call ended without its primitive's end line", () => {
    const c = call(1, { end: { work: 0, profiles: 0 } });
    const files = { ...complete(), 'r1.9.1.jsonl': [worker(), c.start, c.caps, c.begin, c.end] };
    const result = rowWork(folder('unfinished', files), EXPECT);
    assert.equal(result.complete, false);
    assert.ok(result.problems.includes('unfinished primitive r1:9:1:1'));
  });

  it('a cut line is a lost measurement', () => {
    const c = call(1);
    const files = { ...complete(), 'r1.9.1.jsonl': [worker(), c.start, c.caps, c.begin, c.p, '{"t":"en'] };
    const result = rowWork(folder('cut', files), EXPECT);
    assert.equal(result.complete, false);
    assert.ok(result.problems.some((p) => p.startsWith('unparseable line')));
  });

  it("no row line, or another row's", () => {
    const missing = rowWork(folder('no-row', { ...complete(), 'r1.row.jsonl': null }), EXPECT);
    assert.equal(missing.complete, false);
    assert.ok(missing.problems.includes('no row line'));
    const other = rowWork(folder('other-seed', { ...complete(), 'r1.row.jsonl': [{ ...ROW, seed: 's2' }] }), EXPECT);
    assert.equal(other.complete, false);
    assert.ok(other.problems.includes('row line mismatch'));
    const another = rowWork(folder('other-row', { ...complete(), 'r1.row.jsonl': [{ ...ROW, row: 'r2' }] }), EXPECT);
    assert.ok(another.problems.includes('row line mismatch'));
  });

  it('a second row line is a mismatch', () => {
    const result = rowWork(folder('two-row-lines', { ...complete(), 'r1.row.jsonl': [ROW, ROW] }), EXPECT);
    assert.equal(result.complete, false);
    assert.ok(result.problems.includes('row line mismatch'));
  });

  it('a foreign file', () => {
    const result = rowWork(folder('foreign', { ...complete(), 'r2.9.1.jsonl': [worker()] }), EXPECT);
    assert.equal(result.complete, false);
    assert.ok(result.problems.includes('foreign file r2.9.1.jsonl'));
  });

  it('re-rating starts are counted', () => {
    const files = complete();
    files['r1.9.1.jsonl'].push(
      { t: 'rerate', call: 'r1:9:1:1', phase: 'rescue', at: 3 },
      { t: 'rerate', call: 'r1:9:1:1', phase: 'rescue', at: 4 },
      { t: 'rerate', call: 'r1:9:1:1', phase: 'rerate', at: 5 },
    );
    const result = rowWork(folder('rerate', files), EXPECT);
    assert.deepEqual(result.problems, []);
    assert.equal(result.complete, true);
    assert.deepEqual(result.rerateStarts, { close: 0, rescue: 2, rerate: 1 });
  });

  it('the raw no-window side is kept', () => {
    const files = {
      ...complete({ end: { result: 'not-in-band', igNoWindow: 'below' } }),
      'r1.link.jsonl': [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'no-window-below' }, WORKER_END],
    };
    const result = rowWork(folder('no-window', files), EXPECT);
    assert.equal(result.outcomes[0].result, 'not-in-band');
    assert.equal(result.outcomes[0].igNoWindow, 'below');
  });

  it('the ledger input of the verdicts', () => {
    const ledger = workLedger(rowWork(folder('ledger', complete()), EXPECT));
    assert.deepEqual(Object.keys(ledger).sort(),
      ['calls', 'complete', 'countWork', 'ended', 'hi', 'lo', 'open', 'problems', 'ratingWork', 'terminated']);
  });

  it('worker files are read in file-name order, and a missing folder has no files', () => {
    const dir = folder('order', { ...complete(), 'r1.10.1.jsonl': [worker(10, 1)] });
    assert.deepEqual(readRowFolder(dir, 'r1').workerFiles.map((f) => f.name), ['r1.10.1.jsonl', 'r1.9.1.jsonl']);
    const none = rowWork(join(RUN, 'absent'), EXPECT);
    assert.equal(none.complete, false);
    assert.ok(none.problems.includes('no row line'));
    assert.ok(none.problems.includes('no linkage'));
    assert.ok(none.problems.includes('empty evidence'));
  });
});
