// @ts-check
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { boardFromRows } from '../core/engine/board.js';
import { scoreV2 } from '../core/engine/difficulty.js';
import { canonicalJson, sha256Hex } from '../core/engine/hash.js';
import { clueKey, layoutKey } from '../core/engine/keys.js';
import { levelForScore } from '../core/engine/levels.js';
import { parsePack } from '../core/engine/pack.js';
import {
  checkKnobs, landscapeDigest, parseProbeArgs, probePack, run, scoreWithKnobs, STARTING_KNOBS,
} from '../tools/rate-probe.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packFile = resolve(root, 'tests', 'fixtures', 'generated-sample-pack.json');
const artifacts = resolve(root, 'tests', 'artifacts', 'rate-probe-test');
const packText = readFileSync(packFile, 'utf8');

/** @type {import('../core/engine/types.js').Pack} */
const samplePack = (() => {
  const parsed = parsePack(packText);
  assert.ok(parsed.ok);
  return /** @type {any} */ (parsed).value;
})();

const LINE_FIELDS = ['puzzleId', 'board', 'sourceModel', 'storedScore', 'identity', 'v2', 'deduction', 'orders', 'timing', 'modelSize'];
const KNOBS_JSON = JSON.stringify(STARTING_KNOBS);

/**
 * Runs the CLI in-process with captured streams; stdout lines are parsed.
 * @param {string[]} argv
 * @param {Record<string, any>} [overrides]
 */
async function probe(argv, overrides = {}) {
  let stdout = '';
  let stderr = '';
  const code = await run(argv, {
    stdout: (text) => { stdout += text; },
    stderr: (text) => { stderr += text; },
    ...overrides,
  });
  const lines = /** @type {any[]} */ (stdout.split('\n').filter((line) => line.startsWith('{')).map((line) => JSON.parse(line)));
  return { code, stdout, stderr, lines };
}

/** @param {any[]} lines */
const withoutTiming = (lines) => lines.map(({ timing, ...rest }) => rest);

/** @param {Record<string, unknown>} over */
const knobs = (over) => ({ ...STARTING_KNOBS, ...over });

/**
 * @param {string} id
 * @param {[number, number][]} cells
 */
const piece = (id, cells) => ({ id, label: id, color: '#000000', cells });

describe('pack mode', () => {
  test('one line per puzzle with the fields in the fixed order and the definitions of raw and intervals', async () => {
    const { code, stderr, lines } = await probe(['--pack', packFile, '--orders', '2']);
    assert.equal(code, 0, stderr);
    assert.equal(lines.length, samplePack.puzzles.length);
    lines.forEach((line, i) => {
      const puzzle = samplePack.puzzles[i];
      assert.deepEqual(Object.keys(line), LINE_FIELDS);
      assert.equal(line.puzzleId, puzzle.id);
      assert.deepEqual(line.board, { width: 10, height: 6, active: 60 });
      assert.equal(line.sourceModel, 'difficulty-v3');
      assert.equal(line.storedScore, puzzle.rating?.score);
      assert.deepEqual(line.identity, {
        mode: 'pack', caseId: null, rep: null, seed: null, digest: null, expected: null, match: null,
      });
      assert.deepEqual(Object.keys(line.v2), ['score', 'level', 'saturated', 'metrics']);
      assert.equal(line.v2.score, scoreV2(line.v2.metrics.U, line.v2.metrics.B));
      assert.equal(line.v2.metrics.U, samplePack.pieces.length - puzzle.clues.length);

      const d = line.deduction;
      assert.deepEqual(Object.keys(d), ['path', 'first', 'search', 'count', 'census', 'raw', 'intervals']);
      assert.equal(d.path, 'complete');
      assert.ok(Array.isArray(d.first.rows) && d.first.rows.length === line.v2.metrics.U);
      assert.deepEqual(d.raw, {
        G: d.first.choices.length,
        info: d.first.choices.reduce((/** @type {number} */ sum, /** @type {number} */ c) => sum + Math.log2(c), 0),
        Cmax: Math.max(0, ...d.first.choices),
      });
      assert.deepEqual(d.intervals, d.first.census.map(
        (/** @type {{ c: number, kLow: number, f: number }} */ n) => [Math.log2(n.c / (n.c - n.f)), Math.log2(n.c / n.kLow)]));
      assert.equal(d.intervals.length, d.first.choices.length);

      assert.deepEqual(Object.keys(line.orders), ['B', 'G', 'info', 'summary']);
      assert.equal(line.orders.B.length, 2);
      assert.ok(line.orders.B.every((/** @type {number} */ b) => Number.isInteger(b) && b >= 0 && b <= 5000));
      assert.deepEqual(Object.keys(line.timing), ['buildMs', 'dlxMs', 'deduceMs']);
      assert.ok(Object.values(line.timing).every((ms) => typeof ms === 'number' && ms >= 0));
      assert.deepEqual(Object.keys(line.modelSize), ['rows', 'nonzeros', 'bytes']);
      assert.ok(line.modelSize.rows > 0 && line.modelSize.nonzeros > line.modelSize.rows && line.modelSize.bytes > 0);
    });
    assert.ok(lines[2].deduction.raw.G >= 1, 'the Hard puzzle has a guess node (AR1)');
  });

  test('tie orders: entry 0 is the canonical result; the summary takes the lower middle value of an even count', async () => {
    const { lines } = await probe(['--pack', packFile, '--orders', '4', '--tie-orders', '4']);
    for (const line of lines) {
      const { first } = line.deduction;
      assert.equal(line.orders.G.length, 4);
      assert.equal(line.orders.info.length, 4);
      assert.equal(line.orders.G[0], first.G);
      assert.equal(line.orders.info[0], first.info);
      assert.equal(line.orders.B.length, 4);
      for (const name of /** @type {const} */ (['B', 'G', 'info'])) {
        const sorted = [...line.orders[name]].sort((/** @type {number} */ a, /** @type {number} */ b) => a - b);
        assert.deepEqual(line.orders.summary[name], { min: sorted[0], median: sorted[1], max: sorted[3] }, name);
      }
    }
    const { lines: defaults } = await probe(['--pack', packFile]);
    assert.equal(defaults[0].orders.B.length, 5);
    assert.equal(defaults[0].orders.G.length, 1);
    const { lines: none } = await probe(['--pack', packFile, '--orders', '0']);
    assert.deepEqual([none[0].orders.B, none[0].orders.summary.B], [[], null]);
  });

  test('a census budget of 0 is applied through --deduce', async () => {
    const { lines } = await probe(['--pack', packFile, '--orders', '0', '--deduce', '{"census":0}']);
    assert.ok(lines.every((line) => line.deduction.census.nodes === 0));

    const pack = /** @type {any} */ ({
      board: { rows: ['#'.repeat(10)] },
      pieces: [piece('M', [[0, 0]]), piece('D', [[0, 0], [1, 0]]), piece('I3', [[0, 0], [1, 0], [2, 0]]),
        piece('I4', [[0, 0], [1, 0], [2, 0], [3, 0]])],
      puzzles: [{ id: 'census-probe', clues: [] }],
    });
    const full = probePack(pack, { orders: 0 })[0];
    const cut = probePack(pack, { orders: 0, deduce: { census: 0 } })[0];
    assert.ok(/** @type {any} */ (full).deduction.census.nodes > 0, 'the default census probes');
    assert.equal(/** @type {any} */ (cut).deduction.census.nodes, 0);
    assert.equal(/** @type {any} */ (cut).deduction.census.complete, false);
  });

  test('--knobs adds v3 to every line, accepts a file name, and flags knobs outside the ranges once', async () => {
    const { code, lines, stderr } = await probe(['--pack', packFile, '--orders', '0', '--knobs', KNOBS_JSON]);
    assert.equal(code, 0);
    assert.doesNotMatch(stderr, /warning/);
    for (const line of lines) {
      assert.deepEqual(Object.keys(line), [
        'puzzleId', 'board', 'sourceModel', 'storedScore', 'identity', 'v2', 'deduction', 'orders', 'v3', 'timing', 'modelSize',
      ]);
      const { first, count } = line.deduction;
      const breakdown = scoreWithKnobs({
        U: line.v2.metrics.U, deductionTier: first.deductionTier, G: first.G, info: first.info, solutions: count.solutions,
      }, STARTING_KNOBS);
      assert.deepEqual(Object.keys(line.v3), ['score', 'level', 'breakdown', 'knobs']);
      assert.deepEqual(line.v3.breakdown, breakdown);
      assert.equal(line.v3.score, breakdown.score);
      assert.equal(line.v3.level, levelForScore(breakdown.score).id);
      assert.deepEqual(line.v3.knobs, STARTING_KNOBS);
    }
    const without = await probe(['--pack', packFile, '--orders', '0']);
    assert.ok(without.lines.every((line) => !('v3' in line)));

    const byName = await probe(['--pack', packFile, '--orders', '0', '--knobs', 'knobs.json'], {
      readText: (/** @type {string} */ path) => (path === 'knobs.json' ? KNOBS_JSON : readFileSync(path, 'utf8')),
    });
    assert.deepEqual(withoutTiming(byName.lines), withoutTiming(lines));

    const outside = knobs({ base: { max: 7, scale: 6 } });
    const flagged = await probe(['--pack', packFile, '--orders', '0', '--knobs', JSON.stringify(outside)]);
    assert.equal(flagged.code, 0);
    assert.ok(flagged.lines.every((line) => line.v3.knobs.outsideRanges === true));
    assert.equal(flagged.stderr.match(/warning/g)?.length, 1);
  });

  test('a path that is not complete still gets a line and an unsatisfiable puzzle gets an error line', async () => {
    const [capped] = /** @type {any[]} */ (probePack(samplePack, { orders: 1, tieOrders: 2, knobs: STARTING_KNOBS, deduce: { nodes: 0 } }));
    assert.equal(capped.deduction.path, 'capped');
    assert.deepEqual([capped.deduction.first, capped.deduction.raw, capped.deduction.intervals], [null, null, null]);
    assert.deepEqual([capped.orders.G, capped.orders.summary.G, capped.v3], [[null, null], null, null]);
    assert.ok(capped.v2.score > 0 && capped.orders.B.length === 1);

    const unsatisfiable = /** @type {any} */ ({
      board: { rows: ['###', '###'] },
      pieces: [piece('I3', [[0, 0], [1, 0], [2, 0]]), piece('L3', [[0, 0], [1, 0], [0, 1]])],
      puzzles: [{ id: 'none', clues: [] }, { id: 'also-none', clues: [] }],
    });
    const lines = /** @type {any[]} */ (probePack(unsatisfiable, { orders: 0 }));
    assert.deepEqual(Object.keys(lines[0]), ['puzzleId', 'board', 'sourceModel', 'storedScore', 'identity', 'error']);
    assert.deepEqual(lines[0].error.name, 'UnsatisfiableError');
    assert.equal(lines[0].board.active, 6);
    assert.deepEqual(lines.map((line) => line.puzzleId), ['none', 'also-none'], 'the probe goes on after an error');
  });

  test('two runs give the same lines apart from timing, and only the --output file is written', async () => {
    const first = await probe(['--pack', packFile, '--tie-orders', '2']);
    const second = await probe(['--pack', packFile, '--tie-orders', '2']);
    assert.deepEqual(withoutTiming(first.lines), withoutTiming(second.lines));

    /** @type {string[]} */
    const written = [];
    const target = resolve(artifacts, 'override', 'probe.jsonl');
    const toFile = await probe(['--pack', packFile, '--orders', '1', '--output', target], {
      writeText: (/** @type {string} */ path) => { written.push(path); },
    });
    assert.equal(toFile.code, 0);
    assert.equal(toFile.stdout, '');
    assert.deepEqual([...new Set(written)], [target]);
    assert.ok(!existsSync(dirname(target)), 'the override replaces the default writer');
    const toStdout = await probe(['--pack', packFile, '--orders', '1'], {
      writeText: (/** @type {string} */ path) => { written.push(`unexpected ${path}`); },
    });
    assert.equal(toStdout.lines.length, 3);
    assert.deepEqual([...new Set(written)], [target]);

    const nested = resolve(artifacts, 'nested', 'folder', 'sample.jsonl');
    rmSync(artifacts, { recursive: true, force: true });
    try {
      const real = await probe(['--pack', packFile, '--orders', '1', '--output', nested]);
      assert.equal(real.code, 0, real.stderr);
      assert.equal(real.stdout, '');
      const saved = readFileSync(nested, 'utf8').split('\n').filter((line) => line !== '').map((line) => JSON.parse(line));
      assert.deepEqual(withoutTiming(saved), withoutTiming(toStdout.lines));
    } finally {
      rmSync(artifacts, { recursive: true, force: true });
    }
  });
});

describe('scoreWithKnobs', () => {
  test('reproduces the worked examples of the starting knobs', () => {
    /** @type {[number, number, number, number, string][]} */
    const examples = [
      [1, 1, 1, 18, 'W1'], [2, 1, 1, 20, 'W2'], [3, 1, 1, 22, 'W3'],
      [1, 2, 2, 28, 'W4'], [2, 2, 2, 30, 'W5'], [3, 2, 2, 32, 'W6'],
    ];
    for (const [tier, G, info, score, id] of examples) {
      const result = scoreWithKnobs({ U: 6, deductionTier: tier, G, info, solutions: 'unique' }, STARTING_KNOBS);
      assert.equal(result.score, score, id);
      assert.deepEqual(Object.keys(result), ['base', 'rule', 'guess', 'penalty', 'unrounded', 'score']);
      assert.ok(Math.abs(result.base - 12 * (1 - Math.exp(-1))) < 1e-9, id);
      assert.deepEqual([result.rule, result.guess, result.penalty], [[0, 0, 2, 4][tier], 6 * G + 4 * info, 0], id);
      assert.ok(Math.abs(result.unrounded - (result.base + result.rule + result.guess)) < 1e-9, id);
    }
    const few = scoreWithKnobs({ U: 200, deductionTier: 3, G: 0, info: 0, solutions: 'few' }, STARTING_KNOBS);
    const many = scoreWithKnobs({ U: 200, deductionTier: 3, G: 0, info: 0, solutions: 'many' }, STARTING_KNOBS);
    const unknown = scoreWithKnobs({ U: 200, deductionTier: 3, G: 0, info: 0, solutions: 'unknown' }, STARTING_KNOBS);
    assert.deepEqual([few.score, many.score, unknown.score], [14, 12, 16]);
    assert.equal(scoreWithKnobs({ U: 0, deductionTier: 2, G: 0, info: 0, solutions: 'unique' }, STARTING_KNOBS).score, 0);
    assert.equal(scoreWithKnobs({ U: 1, deductionTier: 0, G: 0, info: 0, solutions: 'many' }, STARTING_KNOBS).score, 0);
  });

  test('refuses knobs that break an invariant and flags knobs outside the experimental ranges', () => {
    const m = { U: 6, deductionTier: 1, G: 1, info: 1, solutions: 'unique' };
    /** @type {unknown[]} */
    const invalid = [
      knobs({ base: { max: 13, scale: 6 } }),
      knobs({ rule: [0, 1, 2, 4] }),
      knobs({ rule: [0, 0, 5, 4] }),
      knobs({ rule: [0, 0, 2] }),
      knobs({ penalty: { few: 5, many: 4 } }),
      knobs({ penalty: { few: -1, many: 4 } }),
      knobs({ weights: { G: -1, info: 4 } }),
      knobs({ base: { max: 12, scale: 0 } }),
      knobs({ base: { max: 12 } }),
      knobs({ extra: 1 }),
      knobs({ model: 'difficulty-v2' }),
      null,
      [],
    ];
    for (const bad of invalid) {
      assert.throws(() => scoreWithKnobs(m, /** @type {any} */ (bad)), RangeError, JSON.stringify(bad));
    }
    assert.throws(() => scoreWithKnobs({ ...m, deductionTier: 4 }, STARTING_KNOBS), RangeError);
    assert.throws(() => scoreWithKnobs({ ...m, U: -1 }, STARTING_KNOBS), RangeError);
    assert.doesNotThrow(() => scoreWithKnobs(m, knobs({ base: { max: 12, scale: 6 }, rule: [0, 0, 4, 4] })));

    assert.deepEqual(checkKnobs(STARTING_KNOBS), { outsideRanges: false, outside: [] });
    assert.deepEqual(checkKnobs(knobs({ base: { max: 7, scale: 13 }, weights: { G: 9, info: 0.25 } })).outside,
      ['base.max', 'base.scale', 'weights.G', 'weights.info']);
    assert.deepEqual(checkKnobs(knobs({ penalty: { few: 2, many: 9 } })).outside, ['penalty.many']);
    assert.equal(scoreWithKnobs(m, knobs({ base: { max: 7, scale: 6 } })).score, 14);
  });
});

describe('landscape mode', () => {
  test('landscapeDigest is the digest of the valid accepted puzzles of the runner', () => {
    const board = boardFromRows(samplePack.board.rows);
    /** @param {number[]} indexes */
    const expected = (indexes) => sha256Hex(canonicalJson({
      layoutKeys: indexes.map((i) => layoutKey(board, samplePack.pieces, /** @type {any} */ (samplePack.puzzles[i].solution))),
      clueKeys: indexes.map((i) => clueKey(board, samplePack.pieces, samplePack.puzzles[i].clues)),
      scores: indexes.map((i) => samplePack.puzzles[i].rating?.score ?? null),
    }));
    assert.equal(landscapeDigest(samplePack, 'easy'), expected([0]));
    assert.equal(landscapeDigest(samplePack, 'normal'), expected([1]));
    assert.equal(landscapeDigest(samplePack, 'hard'), expected([2]));
    assert.equal(landscapeDigest(samplePack, 'master'), expected([]));
    assert.notEqual(landscapeDigest(samplePack, 'easy'), landscapeDigest(samplePack, 'normal'));
  });

  test('a regenerated request is checked against the recorded run: match, mismatch with exit 2, no recorded run', async () => {
    const caseId = '6x10-easy';
    const seed = `landscape/${caseId}/0`;
    const report = resolve(artifacts, 'report.json');
    /** @param {unknown[]} runs */
    const writeReport = (runs) => {
      mkdirSync(artifacts, { recursive: true });
      writeFileSync(report, JSON.stringify({ runs }));
    };
    const base = ['--landscape', caseId, '--reps', '0-0', '--workers', '1', '--orders', '1', '--expect', report];
    rmSync(artifacts, { recursive: true, force: true });
    try {
      const wrong = '0'.repeat(64);
      writeReport([{ caseId, seed, details: { resultDigest: wrong } }]);
      const bad = await probe(base);
      assert.equal(bad.code, 2, bad.stderr);
      assert.match(bad.stderr, /identity mismatch for 6x10-easy\/0/);
      assert.doesNotMatch(bad.stderr, /puzzle \d+ of \d+ accepted/, 'a landscape run repeats no progress lines');
      assert.ok(bad.lines.length >= 1, 'the lines are still written');
      const { identity } = bad.lines[0];
      assert.deepEqual(Object.keys(identity), ['mode', 'caseId', 'rep', 'seed', 'digest', 'expected', 'match']);
      assert.deepEqual([identity.mode, identity.caseId, identity.rep, identity.seed], ['landscape', caseId, 0, seed]);
      assert.match(identity.digest, /^[0-9a-f]{64}$/);
      assert.deepEqual([identity.expected, identity.match], [wrong, false]);
      assert.ok(bad.lines.every((line) => line.identity.digest === identity.digest && line.deduction.path === 'complete'));

      writeReport([
        { caseId, seed: `landscape/${caseId}/1`, details: { resultDigest: wrong } },
        { caseId: '6x10-normal', seed, details: { resultDigest: wrong } },
        { caseId, seed, details: { resultDigest: identity.digest } },
      ]);
      const good = await probe(base);
      assert.equal(good.code, 0, good.stderr);
      assert.ok(good.lines.every((line) => line.identity.match === true && line.identity.expected === identity.digest));
      assert.deepEqual(withoutTiming(good.lines).map((line) => line.puzzleId), withoutTiming(bad.lines).map((line) => line.puzzleId));

      writeReport([{ caseId, seed: `landscape/${caseId}/1`, details: { resultDigest: wrong } }]);
      const absent = await probe(base);
      assert.equal(absent.code, 0);
      assert.match(absent.stderr, /no digest for 6x10-easy\/0/);
      assert.deepEqual([absent.lines[0].identity.expected, absent.lines[0].identity.match], [null, null]);
    } finally {
      rmSync(artifacts, { recursive: true, force: true });
    }
  });
});

describe('generation mode', () => {
  test('generation flags go to tools/generate.mjs unchanged and the pack it prints is probed', async () => {
    const { code, lines, stderr } = await probe([
      '--board', '6x10', '--level', 'easy', '--count', '2', '--seed', 'rate-probe-test', '--workers', '1', '--orders', '1',
    ]);
    assert.ok(code === 0 || code === 2, stderr);
    assert.ok(lines.length >= 1 && lines.length <= 2);
    assert.match(stderr, /generating a .* piece set for seed rate-probe-test/);
    for (const line of lines) {
      assert.deepEqual(line.identity, {
        mode: 'generated', caseId: null, rep: null, seed: 'rate-probe-test', digest: null, expected: null, match: null,
      });
      assert.equal(line.board.active, 60);
      assert.equal(line.deduction.path, 'complete');
      assert.equal(line.v2.level, levelForScore(line.v2.score).id);
    }
  });
});

describe('arguments', () => {
  test('input errors exit 1 with a message on stderr', async () => {
    const missing = resolve(artifacts, 'missing.json');
    /** @type {[string[], RegExp][]} */
    const cases = [
      [['--pack', missing], /ENOENT|no such file/],
      [['--landscape', 'nope-easy', '--reps', '0-1'], /unknown landscape case/],
      [['--landscape', '6x10-easy', '--reps', '3-1'], /--reps/],
      [['--landscape', '6x10-easy', '--reps', '0-20'], /--reps/],
      [['--landscape', '6x10-easy'], /--reps/],
      [['--pack', packFile, '--orders', '2', '--orders', '3'], /twice/],
      [['--pack', packFile, '--knobs', '{not json'], /not valid JSON/],
      [['--pack', packFile, '--knobs', JSON.stringify(knobs({ base: { max: 13, scale: 6 } }))], /base\.max \+ max\(rule\) <= 16/],
      [['--pack', packFile, '--deduce', '{"depth":3}'], /unknown field depth/],
      [['--pack', packFile, '--deduce', '{"census":-1}'], /census/],
      [['--pack', packFile, '--tie-orders', '0'], /--tie-orders/],
      [['--pack', packFile, '--orders', '1001'], /--orders/],
      [['--pack', packFile, '--board', '6x10'], /cannot be combined/],
      [['--landscape', '6x10-easy', '--reps', '0-1', '--board', '6x10'], /only --workers/],
      [['--board', '6x10', '--level', 'easy', '--reps', '0-1'], /belong to --landscape/],
      [['--orders', '2'], /give --pack, --landscape/],
      [['--board', '6x10', '--level', 'bogus'], /level|bogus/i],
      [['--frobnicate'], /unknown argument/],
    ];
    for (const [argv, message] of cases) {
      const { code, stdout, stderr } = await probe(argv);
      assert.equal(code, 1, argv.join(' '));
      assert.equal(stdout, '', argv.join(' '));
      assert.match(stderr, message, argv.join(' '));
    }
    const invalidPack = await probe(['--pack', 'broken.json'], { readText: () => '{"format":"nope"}' });
    assert.equal(invalidPack.code, 1);
    assert.match(invalidPack.stderr, /broken\.json is not a valid pack/);
  });

  test('the three input modes are told apart and the generation flags are passed on in order', () => {
    const generated = parseProbeArgs(['--board', '6x10', '--level', 'easy', '--seed=abc', '--workers', '2', '--orders', '3']);
    assert.deepEqual(generated.ok === true && [generated.options.mode, generated.options.generationArgs, generated.options.orders], [
      'generated', ['--board', '6x10', '--level', 'easy', '--seed', 'abc', '--workers', '2'], 3,
    ]);
    const landscape = parseProbeArgs(['--landscape', '6x10-easy', '--reps', '2-4', '--tie-orders', '3', '--expect', 'r.json']);
    assert.deepEqual(landscape.ok === true && landscape.options.landscape, {
      caseId: '6x10-easy', from: 2, to: 4, workers: 4, expect: 'r.json',
    });
    assert.equal(landscape.ok === true && landscape.options.tieOrders, 3);
    const pack = parseProbeArgs(['--pack', 'p.json', '--output', 'o.jsonl']);
    assert.deepEqual(pack.ok === true && [pack.options.mode, pack.options.pack, pack.options.orders, pack.options.tieOrders,
      pack.options.output, pack.options.knobs, pack.options.deduce], ['pack', 'p.json', 5, 1, 'o.jsonl', null, {}]);
    assert.deepEqual(parseProbeArgs(['--help']), { ok: 'help' });
  });

  test('--help prints the usage and exits 0', async () => {
    const { code, stdout } = await probe(['--help']);
    assert.equal(code, 0);
    assert.match(stdout, /usage: node tools\/rate-probe\.mjs --pack/);
  });
});
