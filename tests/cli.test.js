// @ts-check
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parsePack } from '../core/engine/pack.js';
import { checkRecipe, compareExpected, DEFAULT_MAX_ACTIVE, parseArgs, run } from '../tools/generate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const recipePath = resolve(root, 'tests', 'fixtures', 'generation-case.json');
const recipe = JSON.parse(readFileSync(recipePath, 'utf8'));
const artifacts = resolve(root, 'tests', 'artifacts', 'cli');

/** @param {string[]} argv */
function parsed(argv) {
  const result = parseArgs(argv);
  assert.equal(result.ok, true, JSON.stringify(result));
  return /** @type {any} */ (result).config;
}

/** @param {string[]} argv */
function rejected(argv) {
  const result = parseArgs(argv);
  assert.equal(result.ok, false, `accepted ${argv.join(' ')}`);
  return /** @type {string} */ (/** @type {any} */ (result).error);
}

/** Runs the CLI in-process with captured streams and the real Node worker adapter. @param {string[]} argv */
async function runCli(argv) {
  let stdout = '';
  let stderr = '';
  const code = await run(argv, { stdout: (t) => { stdout += t; }, stderr: (t) => { stderr += t; } });
  return { code, stdout, stderr };
}

/** @param {string} text */
function packOf(text) {
  const result = parsePack(text);
  assert.ok(result.ok, JSON.stringify(result));
  return /** @type {import('../core/engine/types.js').Pack} */ (/** @type {any} */ (result).value);
}

/** Semantic content of a pack: no host-only timestamp. @param {import('../core/engine/types.js').Pack} pack */
function semantic(pack) {
  const copy = JSON.parse(JSON.stringify(pack));
  delete copy.generation.createdAt;
  return copy;
}

describe('argument handling', () => {
  test('boards come from --board, --cols/--rows or a preset', () => {
    const base = ['--level', 'hard', '--seed', 'demo'];
    assert.deepEqual(parsed(['--board', '10x6', ...base]).boardRows, Array(6).fill('#'.repeat(10)));
    assert.deepEqual(parsed(['--cols', '10', '--rows', '6', ...base]).boardRows, parsed(['--board', '10x6', ...base]).boardRows);
    const heart = parsed(['--preset', 'heart', '--n', '10', ...base]);
    assert.equal(heart.rotation, 45);
    assert.equal(parsed(['--preset', 'heart', '--n', '10', '--rotation', '90', ...base]).rotation, 90);
    assert.match(rejected(['--board', '10x6', '--cols', '10', ...base]), /exactly one board/);
    assert.match(rejected(base), /exactly one board/);
    assert.match(rejected(['--board', '10', ...base]), /columns x rows/);
    assert.match(rejected(['--board', '10x6', '--n', '4', ...base]), /--n belongs/);
    assert.match(rejected(['--board', '10x6', '--rotation', '30', ...base]), /rotation/);
    assert.match(rejected(['--board', '10x6', '--level', 'bogus', '--seed', 'd']), /level|bogus/i);
    assert.match(rejected(['--board', '10x6', '--seed', 'demo']), /--level is required/);
  });

  test('numeric options are range-checked and defaults are explicit', () => {
    const base = ['--board', '10x6', '--level', 'hard', '--seed', 'demo'];
    const config = parsed(base);
    assert.equal(config.maxActive, DEFAULT_MAX_ACTIVE);
    assert.equal(DEFAULT_MAX_ACTIVE, 676);
    assert.equal(config.batchIndex, 1);
    assert.equal(config.quantity, 5);
    assert.equal(config.uniqueness, 'any');
    assert.ok(config.workers >= 1 && config.workers <= 4);
    assert.equal(parsed([...base, '--max-active', '60']).maxActive, 60);
    assert.equal(parsed([...base, '--max-active=30']).maxActive, 30);
    for (const [flag, value] of [['--max-active', '29'], ['--max-active', '677'], ['--max-active', '6.5'], ['--workers', '0'], ['--workers', '5'],
      ['--count', '0'], ['--count', '11'], ['--batch-index', '0'], ['--batch-index', '-1'], ['--uniqueness', 'sometimes'], ['--count', 'x']]) {
      assert.match(rejected([...base, flag, value]), new RegExp(flag.slice(2)));
    }
    assert.match(rejected([...base, '--count']), /needs a value/);
    assert.match(rejected([...base, '--count', '3', '--count', '4']), /twice/);
    assert.match(rejected([...base, '--frobnicate', '1']), /unknown argument/);
    assert.match(rejected(['--board', '10x6', '--level', 'hard', '--seed', '   ']), /seed/);
    assert.match(rejected(['--board', '10x6', '--level', 'hard', '--seed', 'x'.repeat(65)]), /seed/);
    assert.equal(parsed(['--board', '10x6', '--level', 'hard', '--seed', '  demo ']).seedText, 'demo');
    assert.equal(parsed(['--board', '10x6', '--level', 'hard', '--count', '10', '--uniqueness', 'require']).seedGenerated, true);
  });

  test('a recipe fixes the semantic inputs and only host options may accompany it', () => {
    const config = parsed(['--recipe', recipePath, '--workers', '4', '--max-active', '100', '--output', 'x.json']);
    assert.equal(config.workers, 4);
    assert.equal(config.maxActive, 100);
    assert.equal(config.seedText, 'fixture-set-0');
    assert.equal(config.batchIndex, 1);
    assert.equal(config.quantity, 10);
    assert.deepEqual(config.expected, recipe.expected);
    assert.match(rejected(['--recipe', recipePath, '--count', '3']), /fixes its own inputs/);
    assert.match(rejected(['--recipe', recipePath, '--board', '10x6']), /fixes its own inputs/);
    assert.match(rejected(['--recipe', resolve(root, 'tests', 'fixtures', 'missing.json')]), /ENOENT/);
    /** @param {Record<string, unknown>} over */
    const check = (over) => assert.throws(() => checkRecipe({ ...recipe, ...over }), RangeError);
    check({ batchSeed: 'fixture-set-0#2' });
    check({ batchIndex: 2 });
    check({ batchIndex: 0, batchSeed: 'fixture-set-0#0' });
    check({ versions: { ...recipe.versions, algo: 'gen-v3' } });
    check({ versions: { ...recipe.versions, extra: 'x' } });
    check({ version: 2 });
    check({ quantity: 11 });
    check({ seedText: ' fixture-set-0' });
    check({ unexpected: true });
    check({ levelId: 'bogus' });
    check({ rotation: 30 });
    assert.doesNotThrow(() => checkRecipe({ ...recipe, batchIndex: 2, batchSeed: 'fixture-set-0#2' }));
  });

  test('expected summaries are compared as evidence, over the puzzles actually produced', () => {
    const actual = {
      pieceKeys: recipe.expected.pieceKeys,
      layoutKeys: recipe.expected.layoutKeys.slice(0, 3),
      clueKeys: recipe.expected.clueKeys.slice(0, 3),
      scores: recipe.expected.scores.slice(0, 3),
    };
    assert.deepEqual(compareExpected(recipe.expected, actual), []);
    assert.deepEqual(compareExpected(recipe.expected, { ...actual, scores: [1, 2, 3] }), ['scores differ from the recipe']);
    assert.deepEqual(compareExpected(recipe.expected, { ...actual, pieceKeys: [] }), ['pieceKeys differ from the recipe']);
  });
});

describe('runs', () => {
  test('the recipe replays to a valid pack with one and four workers and equal semantics', async () => {
    const one = await runCli(['--recipe', recipePath, '--workers', '1']);
    const four = await runCli(['--recipe', recipePath, '--workers', '4']);
    assert.equal(one.code, 0, one.stderr);
    assert.equal(four.code, 0, four.stderr);
    const first = packOf(one.stdout);
    assert.equal(first.kind, 'puzzle-pack');
    assert.equal(first.puzzles.length, recipe.quantity);
    assert.deepEqual(semantic(first), semantic(packOf(four.stdout)));
    assert.equal(/** @type {any} */ (first.generation).batchSeed, recipe.batchSeed);
    assert.ok(/\r\n$/.test(one.stdout) && !one.stdout.includes('\n\n'));
    assert.ok(one.stderr.includes('puzzle 10 of 10 accepted') && !one.stderr.includes('"format"'));
  });

  test('invalid input exits 1 with a message on stderr and nothing on stdout', async () => {
    const cases = [
      [['--board', '10x6', '--level', 'hard', '--seed', 'demo', '--max-active', '50'], /board-too-many-cells|at most 50/],
      [['--board', '33x2', '--level', 'hard', '--seed', 'demo'], /exceeds the maximum of 32/],
      [['--board', '4x4', '--level', 'hard', '--seed', 'demo'], /at least 30/],
      [['--board', '10x6', '--level', 'hell-3', '--seed', 'demo'], /not offered/],
      [['--board', '10x6', '--level', 'hard', '--seed', 'demo', '--batch-index', '0'], /batch-index/],
      [['--recipe', recipePath, '--count', '2'], /fixes its own inputs/],
    ];
    for (const [argv, pattern] of /** @type {[string[], RegExp][]} */ (cases)) {
      const result = await runCli(argv);
      assert.equal(result.code, 1, argv.join(' '));
      assert.equal(result.stdout, '');
      assert.match(result.stderr, pattern);
    }
  });

  test('a piece set with fewer arrangements than requested is a complete result: found N/N arrangements, exit 0', async () => {
    const result = await runCli(['--board', '7x5', '--level', 'easy', '--count', '10', '--seed', 'demo', '--workers', '2']);
    assert.equal(result.code, 0, result.stderr);
    const pack = packOf(result.stdout);
    assert.equal(pack.puzzles.length, 2);
    assert.match(result.stderr, /generate: found 2\/2 arrangements, the most this piece set allows \(complete\)/);
    assert.ok(!result.stderr.includes('layouts-not-found'));
  });

  test('a shortfall that is not proven to be the maximum still exits 2', async () => {
    // The set has more arrangements than the seven found, so no maximum may be claimed.
    const result = await runCli(['--board', '10x6', '--level', 'very-easy', '--count', '10', '--seed', 'bq0/d6x10-very-easy/5', '--workers', '2']);
    assert.equal(result.code, 2, result.stderr);
    const pack = packOf(result.stdout);
    assert.equal(pack.puzzles.length, 7);
    assert.match(result.stderr, /found 7 of 10 Very easy puzzles \(layouts-not-found: this piece set has more arrangements/);
  });

  test('semantic inputs give the same puzzles for another batch index and rotation', async () => {
    const base = ['--board', '10x6', '--level', 'hard', '--count', '3', '--seed', 'fixture-set-0', '--workers', '2'];
    const straight = await runCli(base);
    const turned = await runCli([...base, '--rotation', '90']);
    const second = await runCli([...base, '--batch-index', '2']);
    assert.equal(straight.code, 0, straight.stderr);
    assert.equal(turned.code, 0);
    assert.equal(second.code, 0);
    const a = packOf(straight.stdout);
    const b = packOf(turned.stdout);
    assert.equal(b.presentation?.rotation, 90);
    assert.deepEqual(semantic({ ...b, presentation: a.presentation }), semantic(a));
    assert.deepEqual(packOf(second.stdout).pieces, a.pieces);
    assert.equal(/** @type {any} */ (packOf(second.stdout).generation).batchSeed, 'fixture-set-0#2');
    assert.notDeepEqual(packOf(second.stdout).puzzles.map((p) => p.id), a.puzzles.map((p) => p.id));
  });
});

describe('the command line tool', () => {
  const tool = resolve(root, 'tools', 'generate.mjs');

  test('keeps stdout for the pack and writes --output as UTF-8 with CRLF', () => {
    rmSync(artifacts, { recursive: true, force: true });
    mkdirSync(artifacts, { recursive: true });
    try {
      const file = resolve(artifacts, 'pack.json');
      const toFile = spawnSync(process.execPath, [tool, '--recipe', recipePath, '--workers', '2', '--output', file], { encoding: 'utf8' });
      assert.equal(toFile.status, 0, toFile.stderr);
      assert.equal(toFile.stdout, '');
      assert.ok(existsSync(file));
      const bytes = readFileSync(file);
      assert.notDeepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
      const text = bytes.toString('utf8');
      assert.ok(text.endsWith('\r\n') && !/[^\r]\n/.test(text));
      const viaStdout = spawnSync(process.execPath, [tool, '--recipe', recipePath, '--workers', '1'], { encoding: 'utf8' });
      assert.equal(viaStdout.status, 0, viaStdout.stderr);
      assert.deepEqual(semantic(packOf(viaStdout.stdout)), semantic(packOf(text)));
      const bad = spawnSync(process.execPath, [tool, '--board', '10x6'], { encoding: 'utf8' });
      assert.equal(bad.status, 1);
      assert.equal(bad.stdout, '');
      assert.match(bad.stderr, /usage/);
      const help = spawnSync(process.execPath, [tool, '--help'], { encoding: 'utf8' });
      assert.equal(help.status, 0);
      assert.match(help.stdout, /usage/);
    } finally {
      rmSync(artifacts, { recursive: true, force: true });
    }
  });
});
