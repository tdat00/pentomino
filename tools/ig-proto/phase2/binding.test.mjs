// @ts-check
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { matrixDigest } from '../../bench/calibration-reference.js';
import { SOURCE_FILES } from '../../bench/report.js';
import {
  BROWSER_CHECKS, BROWSER_GENERATOR_SOURCES, BROWSER_PAGE, REPLAY_ITEMS, browserGate, resourceGate, rowMatrix, sha256Hex, verifyProof, verifyRow,
} from './binding.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RUN = join(REPO, 'tests', 'artifacts', 'ig-proto', 'phase2', 'self-test', `binding-${Date.now()}`);
const SEAL_SHA = 'a'.repeat(64);
const VARIANT = 'p2-gen4';
const FILE_KEY = 'k1';

after(() => {
  rmSync(RUN, { recursive: true, force: true });
});

const seal = () => ({
  commit: 'c',
  sourceDigest: 'sd',
  copies: [{ id: VARIANT, treeId: 't', copyDigest: 'r', runtimeDigest: 'r' }, { id: 'p2-gen4-diag', treeId: 'td', copyDigest: 'rd', runtimeDigest: 'rd' }],
  tools: [],
  inputs: [],
});

/**
 * Writes one bound row under its own folder and returns the row line and the verifier context.
 * `edit` changes the parts before they are serialized and hashed; files can then be changed on disk by the case.
 * @param {string} name
 * @param {(parts: Record<string, any>) => void} [edit]
 */
function fixture(name, edit = () => {}) {
  const dir = join(RUN, name);
  const seed = 'landscape/22x22-nightmare/20';
  const run = {
    caseId: '22x22-nightmare', seed, rep: 20, probeKind: 'generation', sourceCommit: `${VARIANT} c`, sourceDigest: 'r', acceptedCount: 10,
    telemetry: { setCounters: null, batchCounters: null, trail: { attempts: [], sameSide: false, boundFired: false, noWindow: { below: 0, above: 0 } } },
  };
  const expected = {
    key: 'k1', fileKey: FILE_KEY, stage: 'A', component: 'smoke', arm: 'x', variant: VARIANT, cell: run.caseId, rep: 20, seed,
    uniqueness: 'any', levelId: 'nightmare', boardRows: 22, maxActive: 400,
  };
  const parts = {
    seal: seal(), expected, run, rowRun: null, matrixExpected: null, report: /** @type {Record<string, any>} */ ({}), receipt: /** @type {Record<string, any>} */ ({}),
    journal: { 'w.1.jsonl': '{"t":"worker"}\n' }, row: /** @type {Record<string, any>} */ ({}),
  };
  edit(parts);
  const files = join(dir, 'raw', FILE_KEY);
  mkdirSync(join(files, 'journal'), { recursive: true });
  for (const [file, text] of Object.entries(parts.journal)) {
    writeFileSync(join(files, 'journal', file), text);
  }
  const report = { meta: { matrixDigest: matrixDigest(rowMatrix(parts.matrixExpected ?? parts.expected)) }, runs: [parts.run], ...parts.report };
  const reportBytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(files, 'report.json'), reportBytes);
  const receipt = {
    key: 'k1', fileKey: FILE_KEY, stage: 'A', variant: VARIANT, sealSha256: SEAL_SHA, copy: { treeId: 't', copyDigest: 'r' },
    report: { path: `raw/${FILE_KEY}/report.json`, sha256: sha256Hex(reportBytes) },
    journal: Object.entries(parts.journal).sort().map(([n, t]) => ({ name: n, bytes: Buffer.byteLength(t), sha256: sha256Hex(t) })),
    ...parts.receipt,
  };
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  writeFileSync(join(files, 'receipt.json'), receiptBytes);
  const row = {
    ...parts.expected, sealSha256: SEAL_SHA, run: parts.rowRun ?? parts.run, telemetry: parts.run.telemetry, receipt: sha256Hex(receiptBytes), ...parts.row,
  };
  const ctx = {
    sealSha256: SEAL_SHA,
    seal: parts.seal,
    expected: parts.expected,
    read: (/** @type {string} */ p) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p)) : null),
    list: (/** @type {string} */ p) => (existsSync(join(dir, p)) ? readdirSync(join(dir, p)).sort() : []),
  };
  return { row, ctx, files };
}

describe('row binding', () => {
  it('a bound row verifies', () => {
    const { row, ctx } = fixture('ok');
    assert.deepEqual(verifyRow(row, ctx), { ok: true, problems: [] });
  });

  it('a foreign seal is refused first', () => {
    const { row, ctx } = fixture('foreign');
    assert.deepEqual(verifyRow({ ...row, sealSha256: 'b'.repeat(64) }, ctx).problems, [`foreign seal ${'b'.repeat(64)}`]);
    assert.deepEqual(verifyRow({ ...row, sealSha256: undefined }, ctx).problems, ['foreign seal none']);
  });

  it('a row without an expected identity is refused', () => {
    const { row, ctx } = fixture('noexp');
    assert.deepEqual(verifyRow(row, { ...ctx, expected: null }).problems, ['no expected row k1']);
    assert.deepEqual(verifyRow({ ...row, cell: 'x' }, ctx).problems, ['row cell']);
  });

  it('a mismatched raw report hash or seed is refused', () => {
    const a = fixture('rep-hash');
    writeFileSync(join(a.files, 'report.json'), `${readFileSync(join(a.files, 'report.json'), 'utf8')} `);
    assert.deepEqual(verifyRow(a.row, a.ctx).problems, ['report hash']);
    const b = fixture('rep-seed', (p) => {
      p.run = { ...p.run, seed: 'landscape/22x22-nightmare/21' };
    });
    assert.deepEqual(verifyRow(b.row, b.ctx).problems, ['run seed']);
  });

  it('the receipt binds the key, variant, seal and copy', () => {
    const a = fixture('rc-hash');
    writeFileSync(join(a.files, 'receipt.json'), `${readFileSync(join(a.files, 'receipt.json'), 'utf8')} `);
    assert.deepEqual(verifyRow(a.row, a.ctx).problems, ['receipt hash']);
    const b = fixture('rc-copy', (p) => {
      p.receipt.copy = { treeId: 'other', copyDigest: 'r' };
    });
    assert.deepEqual(verifyRow(b.row, b.ctx).problems, ['receipt copy']);
    const c = fixture('rc-seal', (p) => {
      p.receipt.sealSha256 = 'c'.repeat(64);
    });
    assert.deepEqual(verifyRow(c.row, c.ctx).problems, ['receipt sealSha256']);
  });

  it('the run binds its copy\'s runtime digest and source label', () => {
    const a = fixture('run-digest', (p) => {
      p.run = { ...p.run, sourceDigest: 'x' };
    });
    assert.deepEqual(verifyRow(a.row, a.ctx).problems, ['run sourceDigest']);
    const b = fixture('run-label', (p) => {
      p.run = { ...p.run, sourceCommit: `${VARIANT} d` };
    });
    assert.deepEqual(verifyRow(b.row, b.ctx).problems, ['run source label']);
  });

  it('the matrix digest fixes uniqueness and quantity', () => {
    const { row, ctx } = fixture('matrix', (p) => {
      p.matrixExpected = { ...p.expected };
      p.expected = { ...p.expected, uniqueness: 'require' };
    });
    assert.deepEqual(verifyRow({ ...row, uniqueness: 'require' }, ctx).problems, ['matrix digest']);
    assert.equal(rowMatrix(ctx.expected).cases[0].quantity, 10);
    assert.equal(rowMatrix(ctx.expected).cases[0].seedPrefix, 'landscape');
  });

  it('a published run that differs from the raw run is refused', () => {
    const { row, ctx } = fixture('differs', (p) => {
      p.rowRun = { ...p.run, acceptedCount: 3 };
    });
    assert.deepEqual(verifyRow(row, ctx).problems, ['run differs']);
  });

  it('a changed or added journal file is refused', () => {
    const a = fixture('jr-changed');
    writeFileSync(join(a.files, 'journal', 'w.1.jsonl'), '{"t":"worker","x":1}\n');
    assert.deepEqual(verifyRow(a.row, a.ctx).problems, ['journal w.1.jsonl']);
    const b = fixture('jr-added');
    writeFileSync(join(b.files, 'journal', 'extra.jsonl'), '\n');
    assert.deepEqual(verifyRow(b.row, b.ctx).problems, ['journal inventory']);
  });

  it('a missing receipt or report stops the check', () => {
    const a = fixture('missing-rc');
    rmSync(join(a.files, 'receipt.json'));
    assert.deepEqual(verifyRow(a.row, a.ctx).problems, ['receipt missing']);
    const b = fixture('missing-rp', (p) => {
      p.receipt.report = null;
    });
    assert.deepEqual(verifyRow(b.row, b.ctx).problems, ['report missing']);
  });
});

describe('proof binding', () => {
  it('a proof result binds the seal and is not quick', () => {
    const good = { format: 'p2-proof', quick: false, sources: { sourceDigest: 'sd', copies: [{ id: VARIANT, treeId: 't' }] } };
    assert.deepEqual(verifyProof(good, seal()), { ok: true, problems: [] });
    assert.deepEqual(verifyProof({ ...good, quick: true }, seal()).problems, ['quick']);
    assert.deepEqual(verifyProof({ ...good, sources: { ...good.sources, sourceDigest: 'x' } }, seal()).problems, ['sourceDigest']);
    assert.deepEqual(verifyProof({ ...good, sources: { ...good.sources, copies: [{ id: VARIANT, treeId: 'other' }] } }, seal()).problems, ['copy p2-gen4 treeId']);
    assert.deepEqual(verifyProof({ ...good, sources: { ...good.sources, copies: [{ id: 'nope', treeId: 't' }] } }, seal()).problems, ['copy nope not sealed']);
    assert.deepEqual(verifyProof(null, seal()).problems, ['missing']);
  });
});

describe('resource gate (A4)', () => {
  const item = (/** @type {{ n: number, cell: string, uniqueness: string, copy: string }} */ f) => ({
    n: f.n, cell: f.cell, uniqueness: f.uniqueness, copy: { id: f.copy, treeId: f.copy === VARIANT ? 't' : 'td' }, status: 'measured', reason: null,
    puzzles: [{ id: 'a', kind: 'calibration', status: 'matched' }, { id: 'b', kind: 'candidate', status: 'matched' }], maxima: {}, margin: 'ok',
  });
  /** @param {(items: Record<string, any>[]) => void} [edit] */
  const receipt = (edit = () => {}) => {
    const items = REPLAY_ITEMS.map(item);
    edit(items);
    return { format: 'p2-replay-probes', version: 1, items };
  };

  it('the resource gate', () => {
    assert.equal(resourceGate(receipt(), seal()).status, 'pass');

    const notMeasured = resourceGate(receipt((i) => { i[6].status = 'not-measured'; }), seal());
    assert.equal(notMeasured.status, 'incomplete');
    assert.equal(notMeasured.items.length, 8);
    assert.deepEqual(notMeasured.items.filter((i) => i.problems.length > 0).map((i) => [i.n, i.problems]), [[7, ['not-measured']]]);

    const failed = resourceGate(receipt((i) => { i[1].status = 'failed'; i[6].status = 'not-measured'; }), seal());
    assert.equal(failed.status, 'fail');
    assert.equal(failed.items.length, 8);
    assert.equal(failed.items[6].status, 'not-measured');

    const unmatched = resourceGate(receipt((i) => { i[2].puzzles[1].status = 'diverged'; }), seal());
    assert.equal(unmatched.status, 'fail');
    const exceeded = resourceGate(receipt((i) => { i[2].margin = 'exceeded'; }), seal());
    assert.equal(exceeded.status, 'fail');

    const empty = resourceGate(receipt((i) => { i[3].puzzles = [{ id: 'a', kind: 'calibration', status: 'matched' }]; }), seal());
    assert.equal(empty.status, 'incomplete');
    assert.deepEqual(empty.items[3].problems, ['empty sample']);

    const binding = resourceGate(receipt((i) => { i[4].copy.treeId = 'other'; }), seal());
    assert.equal(binding.status, 'incomplete');
    assert.deepEqual(binding.items[4].problems, ['binding']);

    const noStatus = resourceGate(receipt((i) => { delete i[2].status; }), seal());
    assert.equal(noStatus.status, 'incomplete');
    assert.deepEqual(noStatus.items[2].problems, ['status unknown']);

    const noMargin = resourceGate(receipt((i) => { delete i[5].margin; }), seal());
    assert.equal(noMargin.status, 'incomplete');
    assert.deepEqual(noMargin.items[5].problems, ['margin unknown']);

    const noReplay = resourceGate(receipt((i) => { delete i[0].puzzles[1].status; }), seal());
    assert.equal(noReplay.status, 'incomplete');
    assert.deepEqual(noReplay.items[0].problems, ['replay unknown']);

    const absent = resourceGate(receipt((i) => { i.pop(); }), seal());
    assert.equal(absent.status, 'incomplete');
    assert.equal(absent.items[7].status, 'missing');
    assert.equal(resourceGate(null, seal()).status, 'incomplete');
    assert.equal(resourceGate(null, seal()).items.length, 8);
  });
});

describe('browser gate (A5)', () => {
  const hashOf = (/** @type {string} */ p) => `h:${p}`;
  const paths = [BROWSER_PAGE, 'tests/browser/deadline.js', ...SOURCE_FILES, ...BROWSER_GENERATOR_SOURCES];
  const sealed = () => ({ ...seal(), inputs: paths.map((p) => ({ path: p, sha256: hashOf(p) })), tools: [{ path: 'tools/ig-proto/phase2/binding.mjs', sha256: 'tool' }] });
  const receipt = (/** @type {string} */ check, /** @type {Record<string, any>} */ over = {}) => ({
    format: 'p2-browser', version: 1, page: BROWSER_PAGE, check, status: 'pass', durationMs: 6200,
    consoleLines: [`CHECK-START ${check}`, `CHECK-END PASS 6.2 s ${check}`], sources: paths.map((p) => ({ path: p, sha256: hashOf(p) })), ...over,
  });
  /** @param {string} [check] @param {Record<string, any> | null} [over] */
  const receipts = (check, over) => {
    const all = Object.fromEntries(BROWSER_CHECKS.map((c) => [c, receipt(c)]));
    if (check !== undefined) {
      all[check] = over === null ? null : receipt(check, over ?? {});
    }
    return all;
  };

  it('the browser gate reads six individual receipts', () => {
    const pass = browserGate(receipts(), sealed());
    assert.equal(pass.status, 'pass');
    assert.equal(pass.checks.length, 6);
    assert.equal(pass.checks[0].seconds, 6.2);

    const missing = browserGate(receipts('late-fence', null), sealed());
    assert.equal(missing.status, 'incomplete');
    assert.deepEqual(missing.checks[2], { check: 'late-fence', status: 'missing', seconds: null, problems: ['missing'] });

    const timeout = browserGate(receipts('set-bound', { status: 'timeout' }), sealed());
    assert.equal(timeout.status, 'fail');
    assert.ok(timeout.checks[0].problems.includes('status timeout'));

    const slow = browserGate(receipts('batch-prefix', { consoleLines: ['CHECK-END PASS 61 s batch-prefix'] }), sealed());
    assert.equal(slow.status, 'fail');
    assert.deepEqual(slow.checks[1].problems, ['reading PASS 61']);

    const readingFail = browserGate(receipts('batch-prefix', { consoleLines: ['CHECK-END FAIL 2 s batch-prefix'] }), sealed());
    assert.equal(readingFail.status, 'fail');

    const noEnd = browserGate(receipts('fresh-after-pause', { consoleLines: ['CHECK-START fresh-after-pause', 'CHECK-END PASS 3 s other-check'] }), sealed());
    assert.equal(noEnd.status, 'incomplete');
    assert.deepEqual(noEnd.checks[3].problems, ['duration']);

    const bad = browserGate(receipts('no-window-texts', { consoleLines: ['CHECK-END PASS -1 s no-window-texts'] }), sealed());
    assert.deepEqual(bad.checks[4].problems, ['duration invalid']);
    assert.equal(bad.status, 'incomplete');

    const changed = receipt('screen-capped-step');
    changed.sources[0].sha256 = 'wrong';
    const hashed = browserGate({ ...receipts(), 'screen-capped-step': changed }, sealed());
    assert.equal(hashed.status, 'incomplete');
    assert.deepEqual(hashed.checks[5].problems, [`source ${BROWSER_PAGE}`]);

    const extra = receipt('set-bound');
    extra.sources.push({ path: 'tests/browser/other.js', sha256: 'x' });
    assert.deepEqual(browserGate({ ...receipts(), 'set-bound': extra }, sealed()).checks[0].problems, ['source tests/browser/other.js']);

    const noStatus = browserGate(receipts('set-bound', { status: undefined }), sealed());
    assert.equal(noStatus.status, 'incomplete');
    assert.deepEqual(noStatus.checks[0].problems, ['status unknown']);

    const noJobs = receipt('late-fence');
    noJobs.sources = noJobs.sources.filter((s) => s.path !== 'generator/jobs.js');
    const omitted = browserGate({ ...receipts(), 'late-fence': noJobs }, sealed());
    assert.equal(omitted.status, 'incomplete');
    assert.deepEqual(omitted.checks[2].problems, ['source missing generator/jobs.js']);

    const wrongCheck = browserGate(receipts('set-bound', { check: 'late-fence' }), sealed());
    assert.deepEqual(wrongCheck.checks[0].problems, ['identity']);
  });
});
