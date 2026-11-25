// @ts-check
// The real no-window glue (P2-16c; plan §4.6, N-V4-16, review-1 R11, review-2 R2-02 and R2-03). A copy `p2-glue` of the
// gen-v4 sources scripts only the ratings of chosen set attempts inside the worker; the production selector,
// `setAttempt`, the no-window translation, the protocol, the worker pool, real worker threads and the client carry the
// four scripted ends to the public terminal reason. `p2-glue-broken` loses the side in `failureOf`, and the check must
// fail on it.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { rectRows } from '../../bench/calibration-reference.js';
import { parseLines } from '../verdicts.mjs';
import { buildCopy } from './copies.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const RUN = join(REPO, 'tests', 'artifacts', 'ig-proto', 'phase2', 'self-test', `glue-${Date.now()}`);

/** True while the cutover of P2-15 is not merged: the copies are built on the rehearsed sources. */
const rehearsal = !readFileSync(join(REPO, 'core', 'engine', 'version.js'), 'utf8').includes("ALGO_ID = 'gen-v4'");

/** @typedef {{ createGenerationClient: (pool: any, options?: any) => any, createPool: (options?: any) => any, nodeWorkerFactory: () => () => any }} Chain */
/** @type {Record<string, Chain>} */
const chains = {};

/**
 * @param {string} id
 * @returns {Promise<Chain>} The production client, pool and worker factory of the copy `id`.
 */
async function load(id) {
  await buildCopy(id, { source: 'gen-v4', root: REPO, rehearsal, destRoot: RUN });
  const dir = join(RUN, 'gen-v4', id);
  const get = (/** @type {string} */ file) => import(pathToFileURL(join(dir, file)).href);
  const [client, pool, worker] = await Promise.all([get('core/browser/generation-client.js'), get('core/browser/worker-pool.js'), get('tools/node-worker.mjs')]);
  return { createGenerationClient: client.createGenerationClient, createPool: pool.createPool, nodeWorkerFactory: worker.nodeWorkerFactory };
}

before(async () => {
  mkdirSync(RUN, { recursive: true });
  for (const id of ['p2-glue', 'p2-glue-broken']) {
    chains[id] = await load(id);
  }
});

after(() => {
  rmSync(RUN, { recursive: true, force: true });
});

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

/**
 * Waits until every worker termination that the copy's link layer logged as requested has been confirmed, so that no
 * write of the link journal outlives its folder.
 * @param {string} dir
 * @param {string} name
 */
async function settleWorkers(dir, name) {
  const file = join(dir, `${name}.link.jsonl`);
  const count = (/** @type {string} */ text, /** @type {string[]} */ evs) => text.split('\n').filter((l) => l !== '' && evs.includes(JSON.parse(l).ev)).length;
  for (let i = 0; i < 200; i += 1) {
    const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (count(text, ['worker-end-request']) === count(text, ['worker-end', 'worker-end-failed'])) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${name}: the worker terminations did not settle`);
}

/**
 * Runs one set request through the whole real chain of `copy`, with its own journal folder.
 * @param {string} copy
 * @param {string} name
 * @param {Record<number, 'below' | 'above' | 'budget'>} script
 * @returns {Promise<{ result: any, lines: Record<string, any>[] }>}
 */
async function runCase(copy, name, script) {
  const dir = join(RUN, name);
  mkdirSync(dir, { recursive: true });
  process.env.P2_GLUE_SCRIPT = JSON.stringify(script);
  process.env.IG_LOG_DIR = dir;
  process.env.IG_ROW = name;
  const { createGenerationClient, createPool, nodeWorkerFactory } = chains[copy];
  const pool = createPool({ size: 4, workerFactory: nodeWorkerFactory() });
  try {
    const client = createGenerationClient(pool, { maxSetAttempts: 8 });
    const result = await client.generateSet({
      boardRows: rectRows(10, 10), rotation: 0, levelId: 'nightmare', seedText: `p2-16c/${name}`, uniqueness: 'any', maxActive: 676,
    });
    return { result, lines: journal(dir) };
  } finally {
    pool.close();
    await settleWorkers(dir, name);
    delete process.env.P2_GLUE_SCRIPT;
    delete process.env.IG_LOG_DIR;
    delete process.env.IG_ROW;
  }
}

/**
 * @param {any} result The set result of the client.
 * @param {Record<string, any>[]} lines The C1 lines of the case.
 * @param {'below' | 'above'} side The scripted side.
 * @returns {string[]} One string per failed check; empty when the glue carried the side to the public reason.
 */
function assertGlue(result, lines, side) {
  /** @type {string[]} */
  const found = [];
  const reason = `no-window-${side}`;
  for (let k = 0; k < 4; k += 1) {
    const starts = lines.filter((l) => l.t === 'start' && l.stage === 'set' && l.attempt === k);
    if (starts.length !== 1) {
      found.push(`raw side, attempt ${k}: ${starts.length} start lines, not 1`);
      continue;
    }
    const ends = lines.filter((l) => l.t === 'end' && l.call === starts[0].call);
    if (ends.length !== 1) {
      found.push(`raw side, attempt ${k}: ${ends.length} end lines, not 1`);
    } else if (ends[0].igNoWindow !== side) {
      found.push(`raw side, attempt ${k}: igNoWindow ${ends[0].igNoWindow}, not ${side}`);
    }
  }
  for (let k = 0; k < 4; k += 1) {
    const entries = (result.trail?.attempts ?? []).filter((/** @type {any} */ a) => a.attempt === k);
    if (entries.length !== 1 || entries[0].reason !== reason) {
      found.push(`transported reason, attempt ${k}: ${entries.length === 1 ? entries[0].reason : `${entries.length} entries`}, not ${reason}`);
    }
  }
  if (result.trail?.boundFired !== true) {
    found.push('the bound did not fire');
  }
  if (result.reason !== reason) {
    found.push(`public reason ${result.reason}, not ${reason}`);
  }
  return found;
}

const FOUR_BELOW = /** @type {const} */ ({ 0: 'below', 1: 'below', 2: 'below', 3: 'below' });

describe('the real no-window glue', () => {
  it('four below ends fire the bound through the real chain', async () => {
    const { result, lines } = await runCase('p2-glue', 'below', FOUR_BELOW);
    assert.equal(result.status, 'failed');
    assert.equal(result.reason, 'no-window-below');
    assert.equal(result.trail.boundFired, true);
    assert.deepEqual(assertGlue(result, lines, 'below'), []);
  });

  it('four above ends fire the bound through the real chain', async () => {
    const { result, lines } = await runCase('p2-glue', 'above', { 0: 'above', 1: 'above', 2: 'above', 3: 'above' });
    assert.equal(result.status, 'failed');
    assert.equal(result.reason, 'no-window-above');
    assert.equal(result.trail.boundFired, true);
    assert.deepEqual(assertGlue(result, lines, 'above'), []);
  });

  it('mixed sides do not fire; the next attempt runs the real selector', async () => {
    const { result, lines } = await runCase('p2-glue', 'mixed', { 0: 'below', 1: 'below', 2: 'below', 3: 'above' });
    assert.equal(result.trail.boundFired, false);
    assert.ok(lines.some((l) => l.t === 'start' && l.stage === 'set' && l.attempt === 4));
    assert.ok(!String(result.reason ?? '').startsWith('no-window'));
  });

  it('a budget stop is not a no-window end', async () => {
    const { result } = await runCase('p2-glue', 'budget', { 0: 'budget', 1: 'budget', 2: 'budget', 3: 'budget' });
    assert.equal(result.status, 'complete');
    assert.equal(result.attempt, 0);
    assert.ok(result.counters.budgetStops >= 1);
    assert.ok(!String(result.reason ?? '').startsWith('no-window'));
    assert.equal(result.trail.boundFired, false);
  });

  it('a broken translation fails the glue check', async () => {
    const { result, lines } = await runCase('p2-glue-broken', 'broken', FOUR_BELOW);
    assert.equal(result.trail.boundFired, false);
    const found = assertGlue(result, lines, 'below');
    assert.equal(found.length, 6, found.join('\n'));
    assert.equal(found.filter((f) => f.startsWith('raw side')).length, 0);
    assert.equal(found.filter((f) => f.startsWith('transported reason') && f.endsWith('not-in-band, not no-window-below')).length, 4);
    assert.ok(found.includes('the bound did not fire'));
    assert.ok(found.some((f) => f.startsWith('public reason')));
  });
});
