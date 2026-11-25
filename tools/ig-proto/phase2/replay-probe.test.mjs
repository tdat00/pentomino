// @ts-check
// The replay-resource probes (P2-14b): the schedule, the checkpoints, the margin and the receipt, on a fake client factory
// and a fake clock. No engine runs.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { REPLAY } from '../../../core/engine/policy.js';
import { REPLAY_ITEMS } from './binding.mjs';
import { ITEMS, judgePuzzles, marginOf, runProbes } from './replay-probe.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RUN = join(REPO, 'tests', 'artifacts', 'ig-proto', 'phase2', 'self-test', `replay-probe-${Date.now()}`);

after(() => {
  rmSync(RUN, { recursive: true, force: true });
});

const tick = () => new Promise((resolve) => setImmediate(resolve));

/**
 * A fake factory: every client yields two accepted puzzles (a candidate and the calibration puzzle) that replay `matched`.
 * @param {{ events?: string[], clock?: { ms: number }, behave?: (item: any) => Record<string, any> }} [o]
 */
function fakes(o = {}) {
  const events = o.events ?? [];
  return {
    treeIdOf: () => 'tree-x',
    /** @param {any} item @param {number} lane */
    makeClient: async (item, lane) => {
      events.push(`start ${item.n} lane ${lane}`);
      await tick();
      const behave = o.behave?.(item) ?? {};
      const client = {
        generateSet: async () => ({ status: 'complete', set: { pieces: [] }, calibration: {}, attempt: 1, setOrigin: {}, ...behave.set }),
        generateBatch: async () => ({
          status: 'complete',
          accepted: [{ id: 'a' }, { id: 'b' }],
          made: { a: { kind: 'candidate' }, b: { kind: 'calibration' } },
          ...behave.batch,
        }),
        replayPuzzle: async () => ({ status: 'matched', steps: [1, 2, 3], work: 10, ...behave.replay }),
      };
      return { client, treeId: 'tree-x', utf8Length: (/** @type {string} */ text) => Buffer.byteLength(text), close: () => { events.push(`end ${item.n}`); } };
    },
  };
}

/** @param {string} name @returns {string} A fresh output folder. */
function outOf(name) {
  const out = join(RUN, name);
  mkdirSync(out, { recursive: true });
  return out;
}

describe('the replay-resource probes', () => {
  it('the items are fixed', () => {
    assert.deepEqual(
      ITEMS.map((i) => [i.n, i.group, i.cell, i.uniqueness, i.copy, i.seed, i.quantity]),
      [
        [1, 'any', '26x26-hell-1', 'any', 'p2-gen4-diag', 'p2-replay/26x26-hell-1/0', 4],
        [2, 'any', '20x20-hell-1', 'any', 'p2-gen4-diag', 'p2-replay/20x20-hell-1/0', 4],
        [3, 'any', '24x24-nightmare', 'any', 'p2-gen4', 'p2-replay/24x24-nightmare/0', 4],
        [4, 'any', '22x22-nightmare', 'any', 'p2-gen4', 'p2-replay/22x22-nightmare/0', 4],
        [5, 'require', '22x22-hell-1', 'require', 'p2-gen4-diag', 'p2-replay/22x22-hell-1/0', 4],
        [6, 'require', '32x15-hell-1', 'require', 'p2-gen4-diag', 'p2-replay/32x15-hell-1/0', 4],
        [7, 'require', '22x22-nightmare', 'require', 'p2-gen4', 'p2-replay/22x22-nightmare/0', 4],
        [8, 'require', '32x15-nightmare', 'require', 'p2-gen4', 'p2-replay/32x15-nightmare/0', 4],
      ],
    );
    assert.ok(ITEMS.every((i) => !i.seed.startsWith('landscape/')));
    assert.deepEqual(ITEMS.map(({ n, cell, uniqueness, copy }) => ({ n, cell, uniqueness, copy })), REPLAY_ITEMS.map((i) => ({ ...i })));
  });

  it('two lanes, two groups', async () => {
    const events = /** @type {string[]} */ ([]);
    const { items, exit } = await runProbes({ out: outOf('lanes'), ...    fakes({ events }), now: () => 0 });
    assert.equal(exit, 0);
    assert.deepEqual(items.map((i) => [i.n, i.lane]), [[1, 1], [2, 2], [3, 1], [4, 2], [5, 1], [6, 2], [7, 1], [8, 2]]);
    const at = (/** @type {string} */ e) => events.indexOf(e);
    assert.deepEqual(events.slice(0, 2).sort(), ['start 1 lane 1', 'start 2 lane 2']);
    assert.ok(at('start 3 lane 1') > at('end 1') && at('start 4 lane 2') > at('end 2'));
    const lastEnd = Math.max(...[1, 2, 3, 4].map((n) => at(`end ${n}`)));
    for (const n of [5, 6, 7, 8]) {
      assert.ok(events.findIndex((e) => e.startsWith(`start ${n} `)) > lastEnd, `item ${n} starts after group 1 ended`);
    }
    assert.deepEqual(events.slice(lastEnd + 1, lastEnd + 3).sort(), ['start 5 lane 1', 'start 6 lane 2']);
  });

  it('the margin rule', () => {
    const half = { steps: REPLAY.maxSteps / 2, bytes: REPLAY.maxBytes * 0.5, work: REPLAY.work / 2 };
    assert.deepEqual(marginOf(half), { margin: 'ok', exceeded: [] });
    assert.deepEqual(marginOf({ ...half, bytes: REPLAY.maxBytes * 0.51 }), { margin: 'exceeded', exceeded: ['maxBytes'] });
    const puzzle = { id: 'a', kind: 'candidate', status: 'matched', steps: 1, bytes: REPLAY.maxBytes * 0.51, work: 1 };
    const verdict = judgePuzzles([puzzle]);
    assert.equal(verdict.status, 'failed');
    assert.equal(verdict.margin, 'exceeded');
    assert.match(String(verdict.detail), /maxBytes/);
    assert.equal(judgePuzzles([{ ...puzzle, bytes: REPLAY.maxBytes * 0.5 }]).status, 'measured');
  });

  it('an empty sample is not measured', async () => {
    const out = outOf('empty');
    const behave = (/** @type {any} */ item) => (item.n === 1
      ? { batch: { accepted: [], made: {} } }
      : item.n === 2 ? { batch: { accepted: [{ id: 'b' }], made: { b: { kind: 'calibration' } } } } : item.n === 3 ? { set: { status: 'timeout', set: undefined } } : {});
    const { items, exit } = await runProbes({ out, ...fakes({ behave }), now: () => 0 });
    assert.deepEqual(items.slice(0, 3).map((i) => [i.status, i.reason]), [['not-measured', 'no puzzle'], ['not-measured', 'no ordinary candidate'], ['not-measured', 'no set']]);
    assert.equal(items[1].margin, null);
    assert.equal(items[1].puzzles.length, 1);
    assert.ok(items.slice(3).every((i) => i.status === 'measured' && i.margin === 'ok'));
    assert.equal(exit, 3);
    assert.ok(existsSync(join(out, 'receipt.json')));
  });

  it('a started item is never repeated', async () => {
    const out = outOf('resume');
    mkdirSync(join(out, 'items'), { recursive: true });
    writeFileSync(join(out, 'items', '3.started'), 'x\r\n');
    const kept = { n: 5, cell: '22x22-hell-1', status: 'measured', margin: 'ok', puzzles: [{ id: 'k', kind: 'candidate', status: 'matched', steps: 1, bytes: 1, work: 1 }] };
    writeFileSync(join(out, 'items', '5.json'), `${JSON.stringify(kept)}\r\n`);
    const events = /** @type {string[]} */ ([]);
    const { items, exit } = await runProbes({ out, ...fakes({ events }), now: () => 0 });
    const ran = events.filter((e) => e.startsWith('start')).map((e) => Number(e.split(' ')[1])).sort();
    assert.deepEqual(ran, [1, 2, 4, 6, 7, 8]);
    assert.equal(items[2].status, 'censored');
    assert.ok(!existsSync(join(out, 'items', '3.json')));
    assert.equal(items[4].puzzles[0].id, 'k');
    assert.equal(items[4].status, 'measured');
    assert.equal(exit, 3);
    const again = /** @type {string[]} */ ([]);
    await runProbes({ out, ...fakes({ events: again }), now: () => 0 });
    assert.deepEqual(again, []);
  });

  it('admission leaves late items not started', async () => {
    const clock = { ms: 0 };
    const out = outOf('admission');
    const behave = (/** @type {any} */ item) => {
      if (item.n === 5) {
        clock.ms = 760000;
      }
      return {};
    };
    const { items, exit, receipt } = await runProbes({ out, ...fakes({ behave }), now: () => clock.ms });
    assert.equal(items[6].status, 'not-started');
    assert.equal(items[6].reason, 'admission');
    assert.ok(!existsSync(join(out, 'items', '7.started')));
    assert.ok(items.slice(0, 5).every((i) => i.status === 'measured'));
    assert.equal(/** @type {any} */ (receipt).items[6].status, 'not-started');
    assert.equal(JSON.parse(readFileSync(join(out, 'receipt.json'), 'utf8')).items[6].n, 7);
    assert.equal(exit, 3);
    // 755 + 130 = 885: still admitted.
    const edge = { ms: 0 };
    const late = await runProbes({ out: outOf('admission-edge'), ...fakes({ behave: (/** @type {any} */ item) => { if (item.n === 5) { edge.ms = 755000; } return {}; } }), now: () => edge.ms });
    assert.ok(late.items.every((i) => i.status === 'measured'));
    assert.equal(late.exit, 0);
  });

  it('the receipt is written on failure too', async () => {
    const out = outOf('failure');
    const behave = (/** @type {any} */ item) => (item.n === 2 ? { replay: { status: 'unavailable', steps: [], work: 0 } } : {});
    const { items, exit } = await runProbes({ out, ...fakes({ behave }), now: () => 0, trees: 'trees-x' });
    assert.equal(items[1].status, 'failed');
    assert.match(String(items[1].detail), /unavailable/);
    assert.equal(exit, 1);
    const text = readFileSync(join(out, 'receipt.json'), 'utf8');
    assert.ok(!/(^|[^\r])\n/.test(text), 'CRLF only');
    const receipt = JSON.parse(text);
    assert.equal(receipt.format, 'p2-replay-probes');
    assert.equal(receipt.version, 1);
    assert.deepEqual(receipt.limits, REPLAY);
    assert.equal(receipt.items.length, 8);
    assert.deepEqual(receipt.items[1].copy, { id: 'p2-gen4-diag', treeId: 'tree-x' });
    assert.deepEqual(receipt.sources, { trees: 'trees-x' });
    assert.ok(existsSync(join(out, 'items', '2.json')));
  });
});
