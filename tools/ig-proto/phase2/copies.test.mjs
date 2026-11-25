// @ts-check
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { collectSources, planTree } from '../lib/tree.mjs';
import { buildCopy, checkCopies, COPIES, inputDigest, loadManifests, readSources, rehearse } from './copies.mjs';
import { compare, resultOf } from './proofs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PROOFS = join(HERE, 'proofs.mjs');
const TODAY = 'Q:\\git\\pentomino-p2-today';
const RUN = join(REPO, 'tests', 'artifacts', 'ig-proto', 'phase2', 'self-test', `copies-${Date.now()}`);

after(() => {
  rmSync(RUN, { recursive: true, force: true });
});

const slotText = readFileSync(join(REPO, 'core', 'engine', 'version.js'), 'utf8');
/** True while the cutover of P2-15 is not merged: the copies are planned on the rehearsed sources. */
const rehearsal = !slotText.includes("ALGO_ID = 'gen-v4'");
const manifests = loadManifests();

/** @returns {Map<string, string | Buffer>} The slot's sources, rehearsed while the cutover is not merged. */
function slotSources() {
  const sources = readSources(REPO);
  return rehearsal ? rehearse(sources) : sources;
}

/** @param {string} id @param {Map<string, string | Buffer>} sources */
const plan = (id, sources) => planTree(id, { manifests, filesRoot: join(HERE, 'files'), sources });

/** @param {ReturnType<typeof planTree>} p @param {string} file @returns {string} */
const text = (p, file) => String(p.files.get(file));

describe('measurement copies', () => {
  it("the source reader matches the harness's", () => {
    const mine = readSources(REPO);
    const theirs = collectSources();
    assert.deepEqual([...mine.keys()], [...theirs.keys()]);
    for (const [path, content] of theirs) {
      assert.ok(Buffer.isBuffer(content) ? Buffer.isBuffer(mine.get(path)) && content.equals(/** @type {Buffer} */ (mine.get(path))) : mine.get(path) === content, path);
    }
  });

  it('every gen-v4 copy plans with its edits', () => {
    const result = checkCopies({ source: 'gen-v4', root: REPO, rehearsal });
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.equal(result.variants, 5);
    assert.ok(result.edits > 5);
  });

  it('the today copy plans on the phase-1 head', () => {
    const result = checkCopies({ source: 'today', root: TODAY, rehearsal: false });
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.equal(result.variants, 1);
  });

  it('the counterfactuals carry their own identities', () => {
    const sources = slotSources();
    const none = plan('p2-none', sources);
    assert.ok(text(none, 'core/engine/version.js').includes("export const ALGO_ID = 'gen-v4-proto:p2-none';"));
    assert.ok(text(none, 'core/engine/gen-v4.js').includes('screen-p2-none-v1'));
    assert.ok(text(none, 'core/engine/gen-v4.js').includes('Object.freeze([1, 0])'));
    const uncapped = plan('p2-uncapped', sources);
    assert.ok(text(uncapped, 'core/engine/version.js').includes("export const ALGO_ID = 'gen-v4-proto:p2-uncapped';"));
    assert.ok(text(uncapped, 'core/browser/generation-client.js').includes('const bound = null;'));
    assert.ok(text(uncapped, 'tools/bench/runner.js').includes('  const scope = undefined;'));
    assert.ok(text(uncapped, 'core/engine/gen-v4.js').includes('export const CALL_BUDGET = Object.freeze({ any: Object.freeze({}), require: Object.freeze({}) });'));
  });

  it('the diagnostic layer is identified', () => {
    const sources = slotSources();
    for (const id of ['p2-gen4-diag', 'p2-uncapped-diag']) {
      const p = plan(id, sources);
      assert.equal(p.params.diagnosticOffers, true, id);
      assert.ok(text(p, 'core/engine/policy.js').includes('IG.diagnosticOffers !== true &&'), id);
    }
    assert.equal('diagnosticOffers' in plan('p2-gen4', sources).params, false);
  });

  it('the copies are distinct identities', () => {
    const sources = slotSources();
    const plans = COPIES['gen-v4'].map((id) => plan(id, sources));
    plans.push(plan('p2-today', readSources(TODAY)));
    assert.equal(plans.length, 6);
    assert.equal(new Set(plans.map((p) => p.treeId)).size, 6);
    for (const p of plans) {
      assert.equal(p.params.variant, p.id);
    }
  });

  it('the rehearsal refuses after the cutover', () => {
    const merged = new Map([
      ['core/engine/version.js', "export const ALGO_ID = 'gen-v4';\n"],
      ['core/engine/gen-v4.js', 'export const GEN_V4_LIVE = true;\n'],
    ]);
    assert.throws(() => rehearse(merged), {
      message: "--rehearse-cutover: core/engine/version.js has no export const ALGO_ID = 'gen-v3';; the cutover is already merged",
    });
  });

  it('a build writes its receipt', async () => {
    const record = await buildCopy('p2-gen4', { source: 'gen-v4', root: REPO, rehearsal, destRoot: RUN });
    const dir = join(RUN, 'gen-v4', 'p2-gen4');
    const receipt = JSON.parse(readFileSync(join(dir, 'p2-copy.json'), 'utf8'));
    const tree = JSON.parse(readFileSync(join(dir, 'ig-tree.json'), 'utf8'));
    assert.deepEqual(Object.keys(receipt), ['format', 'version', 'id', 'source', 'root', 'rehearsal', 'inputDigest', 'treeId', 'copyDigest', 'chain', 'params']);
    assert.deepEqual(receipt, JSON.parse(JSON.stringify(record)));
    assert.equal(receipt.format, 'p2-copy');
    assert.equal(receipt.version, 1);
    assert.equal(receipt.id, 'p2-gen4');
    assert.equal(receipt.source, 'gen-v4');
    assert.equal(receipt.rehearsal, rehearsal);
    assert.equal(receipt.treeId, tree.treeId);
    assert.equal(receipt.copyDigest, tree.copyDigest);
    assert.deepEqual(receipt.chain, tree.chain);
    assert.deepEqual(receipt.params, tree.params);
    assert.equal(receipt.inputDigest, inputDigest(slotSources()));
    assert.equal(readFileSync(join(dir, 'p2-copy.json'), 'utf8').includes('\r\n'), true);
  });
});

describe('the common proof runner', () => {
  it('compare reports the first difference', () => {
    assert.equal(compare({ skips: { subsets: [1, 2, 3], repairs: 4 } }, { skips: { subsets: [1, 9, 3], repairs: 4 } }), 'skips.subsets.1');
  });

  it('compare returns null for equal values', () => {
    assert.equal(compare({ a: [1, { b: 'c' }], d: null }, { a: [1, { b: 'c' }], d: null }), null);
  });

  it('an unknown bundle exits 2', () => {
    const r = spawnSync(process.execPath, [PROOFS, 'nope', '--out', join(RUN, 'proofs')], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.ok(`${r.stdout}${r.stderr}`.includes('proofs: no bundle nope'));
  });

  it('the proof record binds its sources and quick', () => {
    const result = resultOf({
      bundle: 'observer', quick: true, outcome: { status: 'pass', cases: [], counts: {} }, sourceDigest: 'd', copies: [{ id: 'p2-gen4', treeId: 't' }],
    });
    assert.deepEqual(Object.keys(result), ['format', 'version', 'bundle', 'status', 'quick', 'cases', 'counts', 'sources']);
    assert.equal(result.format, 'p2-proof');
    assert.equal(result.version, 1);
    assert.equal(result.quick, true);
    assert.deepEqual(result.sources, { sourceDigest: 'd', copies: [{ id: 'p2-gen4', treeId: 't' }] });
  });
});
