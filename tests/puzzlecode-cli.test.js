// @ts-check
// RP07: the optional `--code` output of the headless generator. Output policy is tested with injected sinks and fixture
// packs through `emitGeneratedResult` (the real codec behind it, raw compression forced only where a frozen golden is
// compared); parsing, exits and real generations through `run`; one real child process. Every emitted line is decoded
// by the real decoder and compared with the shared snapshot (RP05) of its own puzzle, never with a neighbour's.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { puzzleSnapshot } from '../core/browser/puzzle-snapshot.js';
import { puzzleDisplayName } from '../core/browser/puzzle-title.js';
import { boardFromRows } from '../core/engine/board.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { parsePack, validatePack } from '../core/engine/pack.js';
import { createPuzzleCodec, decodePuzzleCode, encodePuzzleCode, PuzzleCodeError } from '../core/engine/puzzlecode.js';
import { emitGeneratedResult, packText, parseArgs, run, USAGE } from '../tools/generate.mjs';
import { nodeWorkerFactory } from '../tools/node-worker.mjs';

const root = new URL('../', import.meta.url);
/** @param {string} path */
const readText = (path) => readFileSync(new URL(path, root), 'utf8');
/** @param {string} path */
const absolute = (path) => fileURLToPath(new URL(path, root));
const fixture = JSON.parse(readText('tests/fixtures/puzzlecode-v1.json'));
const recipePath = absolute('tests/fixtures/generation-case.json');
const tool = absolute('tools/generate.mjs');
const artifacts = absolute('tests/artifacts/RP07/cli');

/** @typedef {import('../core/engine/types.js').Pack} Pack */

/** @param {string} path @returns {Pack} */
function packOf(path) {
  const parsed = parsePack(readText(path));
  assert.ok(parsed.ok, path);
  return /** @type {Pack} */ (/** @type {any} */ (parsed).value);
}

const SAMPLE = 'player/samples/sample-pack.json';
const HAND = 'tests/fixtures/hand-authored-pack.json';
const samplePack = packOf(SAMPLE);
const handPack = packOf(HAND);

/** The frozen raw codes of a source file's puzzles, in puzzle order. @param {string} source @returns {string[]} */
const goldenCodes = (source) => fixture.goldens
  .filter((/** @type {any} */ g) => g.source === source)
  .sort((/** @type {any} */ a, /** @type {any} */ b) => a.puzzle - b.puzzle)
  .map((/** @type {any} */ g) => g.code);

/** @param {number} n */
const english = (n) => `Puzzle #${n}`;

/** @template T @param {T} value @returns {T} */
const clone = (value) => JSON.parse(JSON.stringify(value));

/** @template T @param {T} value @returns {T} */
function deepFreeze(value) {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

/** The shared snapshots the browser prepares for each puzzle of a pack. @param {Pack} pack */
function snapshotsOf(pack) {
  return pack.puzzles.map((puzzle, index) => puzzleSnapshot({
    rows: pack.board.rows, pieces: pack.pieces, puzzle, index, rotation: pack.presentation?.rotation ?? 0, untitled: english,
  }));
}

/** Raw compression: the deterministic seam of the golden tests. @param {import('../core/engine/puzzlecode.js').PuzzleCodeSnapshot} snapshot */
const rawEncode = (snapshot) => encodePuzzleCode(snapshot, { compression: 'raw' });
const forcedDeflate = createPuzzleCodec({ allowDeflate: true });
/** @param {import('../core/engine/puzzlecode.js').PuzzleCodeSnapshot} snapshot */
const deflateEncode = (snapshot) => forcedDeflate.encodePuzzleCode(snapshot, { compression: 'deflate' });

/** @param {Record<string, any>} [over] */
function sinks(over = {}) {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const err = [];
  /** @type {Map<string, string>} */
  const files = new Map();
  return {
    out,
    err,
    files,
    io: { stdout: (/** @type {string} */ t) => { out.push(t); }, stderr: (/** @type {string} */ t) => { err.push(t); }, writeText: (/** @type {string} */ p, /** @type {string} */ t) => { files.set(p, t); }, ...over },
  };
}

/** The lines of captured stdout: every one ends with a newline, no other line break. @param {string[]} out */
function linesOf(out) {
  const text = out.join('');
  assert.ok(text.endsWith('\n'), 'a final newline');
  assert.ok(!text.includes('\r'), 'no carriage return');
  const lines = text.split('\n');
  assert.equal(lines.pop(), '');
  return lines;
}

/** @param {Pack} pack @param {{ code: boolean, output?: string }} config @param {Record<string, any>} [over] */
async function emit(pack, config, over = {}) {
  const captured = sinks(over);
  await emitGeneratedResult(pack, config, captured.io);
  return captured;
}

const CODE_FORMAT = /^[0-9A-HJKMNP-TV-Z]+(\.[0-9A-HJKMNP-TV-Z]+)?$/;

/** @param {{ id: string, label: string, color: string, cells: number[][] }[]} pieces */
const identities = (pieces) => pieces.map((p) => ({ id: p.id, label: p.label, color: p.color.toLowerCase(), cells: p.cells }));

/** @param {{ piece: string }[] | null | undefined} poses */
const byPiece = (poses) => [...(poses ?? [])].sort((a, b) => (a.piece < b.piece ? -1 : a.piece > b.piece ? 1 : 0));

/**
 * Decodes one emitted line with the real decoder and compares everything a code promises with the snapshot of the
 * puzzle it was made for.
 * @param {string} line
 * @param {ReturnType<typeof puzzleSnapshot>} snapshot
 */
async function assertLine(line, snapshot) {
  const { data } = snapshot;
  assert.match(line, CODE_FORMAT);
  const decoded = await decodePuzzleCode(line);
  assert.equal(decoded.tailError, null);
  assert.equal(decoded.hasTail, data.solution !== null, 'core-only stays core-only');
  assert.equal(decoded.pack.puzzles.length, 1);
  assert.ok(validatePack(decoded.pack).ok, 'the carried answer is valid for its own clues');
  const puzzle = decoded.pack.puzzles[0];
  const board = boardFromRows(data.rows);
  assert.deepEqual(decoded.pack.board.rows, data.rows, 'rows keep width, height and blocked margins');
  assert.equal(decoded.pack.presentation?.rotation ?? 0, data.rotation, 'display angle');
  assert.deepEqual(identities(decoded.pack.pieces), identities(data.pieces), 'ordered identities, RGB and cells');
  assert.deepEqual(puzzle.clues.map((c) => c.piece), data.clues.map((c) => c.piece));
  assert.equal(progressFingerprint(board, decoded.pack.pieces, puzzle.clues), progressFingerprint(board, data.pieces, data.clues), 'clue cells');
  assert.deepEqual(byPiece(puzzle.solution), byPiece(data.solution));
  assert.deepEqual(puzzle.rating ?? null, data.rating, 'rating claim');
  assert.deepEqual(puzzle.certificate ?? null, data.certificate, 'certificate claim');
  assert.equal(puzzle.title ?? null, data.title);
  assert.equal(puzzleDisplayName(puzzle.title, 0, english), snapshot.heading, 'the re-created puzzle shows the printed heading');
  const core = await decodePuzzleCode(line.split('.')[0]);
  assert.equal(core.hasTail, false);
  assert.equal(core.tailError, null);
  assert.equal(progressFingerprint(board, core.pack.pieces, core.pack.puzzles[0].clues), progressFingerprint(board, decoded.pack.pieces, puzzle.clues), 'core and full code agree');
}

/** @param {Pack} pack */
function semantic(pack) {
  const copy = clone(pack);
  delete copy.generation.createdAt;
  return copy;
}

describe('--code flag', () => {
  const base = ['--board', '10x6', '--level', 'hard', '--seed', 'demo'];

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

  test('is a plain boolean, off by default, and works with a recipe', () => {
    assert.equal(parsed(base).code, false);
    assert.equal(parsed([...base, '--code']).code, true);
    assert.equal(parsed(['--code', ...base, '--output', 'x.json']).code, true);
    const config = parsed(['--recipe', recipePath, '--code', '--workers', '1', '--output', 'x.json']);
    assert.equal(config.code, true);
    assert.equal(config.output, 'x.json');
    assert.equal(parsed(['--recipe', recipePath]).code, false);
    assert.match(rejected(['--recipe', recipePath, '--code', '--count', '3']), /fixes its own inputs/);
  });

  test('a repeated flag and every valued form is rejected, never guessed', () => {
    assert.match(rejected([...base, '--code', '--code']), /--code was given twice/);
    for (const form of ['--code=true', '--code=false', '--code=1', '--code=']) {
      assert.match(rejected([...base, form]), /--code takes no value/, form);
    }
    assert.match(rejected([...base, '--code', 'true']), /unknown argument: true/);
    assert.match(rejected([...base, '--code', 'false']), /unknown argument: false/);
    assert.match(rejected(['--recipe', recipePath, '--code=true']), /--code takes no value/);
  });

  test('invalid boards, levels and recipes stay rejected with the flag', () => {
    assert.match(rejected(['--code', '--level', 'hard']), /exactly one board/);
    assert.match(rejected(['--code', '--board', '10x6']), /--level is required/);
    assert.match(rejected(['--code', '--board', '10x6', '--level', 'bogus']), /level|bogus/i);
    assert.match(rejected(['--code', '--recipe', absolute('tests/fixtures/missing.json')]), /ENOENT/);
  });

  test('the help names the flag, its output and the unchanged exit codes, and starts no generation', async () => {
    assert.match(USAGE, /\[--code\]/);
    assert.match(USAGE, /--code {4}prints one puzzle code per accepted puzzle on stdout, one uppercase line each in pack order, instead of the\s+pack JSON; --output still receives the pack JSON\. Progress and errors stay on stderr\./);
    assert.match(USAGE, /Exit codes: 0 complete .* 2 valid partial or cancelled pack, 1 no usable result or invalid input\. --code does not change them\./);
    for (const argv of [['--help'], ['--help', '--code'], ['--code', '--help', '--output', 'x.json'], ['--help', '--board', '10x6', '--code']]) {
      let workers = 0;
      const captured = sinks({ workerFactory: () => { workers += 1; throw new Error('no generation for help'); } });
      assert.equal(await run(argv, captured.io), 0, argv.join(' '));
      assert.equal(captured.out.join(''), USAGE);
      assert.equal(captured.err.length + captured.files.size + workers, 0);
    }
  });
});

describe('emitGeneratedResult', () => {
  const config = { code: true };

  test('default mode keeps the pack JSON byte for byte: stdout, or --output without any stdout', async () => {
    const pack = clone(samplePack);
    const plain = await emit(pack, { code: false });
    assert.deepEqual(plain.out, [packText(pack)]);
    assert.ok(plain.out[0].endsWith('\r\n') && !/[^\r]\n/.test(plain.out[0]));
    assert.equal(plain.files.size + plain.err.length, 0);
    const saved = await emit(pack, { code: false, output: 'p.json' });
    assert.equal(saved.out.length, 0, 'no pack JSON on stdout beside the file');
    assert.deepEqual([...saved.files], [['p.json', packText(pack)]]);
    assert.deepEqual(saved.err, ['wrote p.json\n']);
  });

  test('code mode prints the frozen raw golden of every puzzle, in order, in one write, with no file', async () => {
    for (const [source, pack] of /** @type {[string, Pack][]} */ ([[SAMPLE, samplePack], [HAND, handPack]])) {
      const captured = await emit(clone(pack), config, { encode: rawEncode });
      const expected = goldenCodes(source);
      assert.equal(expected.length, pack.puzzles.length);
      assert.equal(captured.out.length, 1, 'a complete list or nothing');
      assert.equal(captured.out[0], expected.map((code) => `${code}\n`).join(''));
      assert.deepEqual(linesOf(captured.out), expected);
      assert.equal(captured.files.size + captured.err.length, 0, 'no unsolicited pack file, no stderr noise');
      assert.ok(!/[{}"\s]/.test(captured.out[0].replace(/\n/g, '')), 'no JSON, quote or label in a line');
    }
  });

  test('code mode with --output writes the original pack JSON beside the lines', async () => {
    const pack = clone(samplePack);
    const captured = await emit(pack, { code: true, output: 'out.json' }, { encode: rawEncode });
    assert.deepEqual(linesOf(captured.out), goldenCodes(SAMPLE));
    assert.deepEqual([...captured.files], [['out.json', packText(samplePack)]]);
    assert.deepEqual(captured.err, ['wrote out.json\n']);
    assert.ok(!captured.out.join('').includes('{'));
  });

  test('the ordinary encoder gives lines that decode to the snapshot of their own puzzle', async () => {
    for (const pack of [samplePack, handPack]) {
      const snapshots = snapshotsOf(pack);
      const lines = linesOf((await emit(clone(pack), config)).out);
      assert.equal(lines.length, pack.puzzles.length);
      for (const [index, line] of lines.entries()) {
        await assertLine(line, snapshots[index]);
      }
    }
    const lines = linesOf((await emit(clone(samplePack), config)).out);
    const prints = new Set();
    for (const [index, line] of lines.entries()) {
      const decoded = await decodePuzzleCode(line);
      const board = boardFromRows(decoded.pack.board.rows);
      prints.add(progressFingerprint(board, decoded.pack.pieces, decoded.pack.puzzles[0].clues));
      assert.equal(decoded.pack.puzzles[0].clues.length, samplePack.puzzles[index].clues.length, `line ${index + 1} is puzzle ${index + 1}`);
    }
    assert.equal(prints.size, 3, 'three different puzzles, none repeated');
  });

  test('stored titles keep the displayed heading: position 2 and 3 are "Normal #2" and "Hard #3"', async () => {
    const lines = linesOf((await emit(clone(samplePack), config)).out);
    const titles = [];
    for (const line of lines) {
      titles.push((await decodePuzzleCode(line)).pack.puzzles[0].title);
    }
    assert.deepEqual(titles, ['Easy', 'Normal #2', 'Hard #3']);
    assert.deepEqual(snapshotsOf(samplePack).map((s) => s.heading), ['Easy #1', 'Normal #2', 'Hard #3']);
  });

  test('a puzzle without a stored answer is core only; the others keep their tail', async () => {
    const pack = clone(samplePack);
    pack.puzzles[1].solution = null;
    const lines = linesOf((await emit(pack, config)).out);
    assert.deepEqual(lines.map((line) => line.includes('.')), [true, false, true]);
    const snapshots = snapshotsOf(pack);
    for (const [index, line] of lines.entries()) {
      await assertLine(line, snapshots[index]);
    }
    const single = clone(handPack);
    single.puzzles[0].solution = null;
    const only = linesOf((await emit(single, config)).out);
    assert.equal(only.length, 1);
    assert.ok(!only[0].includes('.'));
    await assertLine(only[0], snapshotsOf(single)[0]);
  });

  test('untitled, maximum-length and foreign-claim puzzles still encode and read back as printed', async () => {
    const pack = clone(samplePack);
    delete pack.puzzles[0].title;
    pack.puzzles[1].title = '\u{1F9E9}'.repeat(80);
    delete pack.puzzles[2].title;
    pack.puzzles[1].rating = {
      model: 'x-model', score: 3.5, level: 'mystery', saturated: false, censored: true,
      metrics: { nested: { list: [1, 2.5, { deep: null }], text: '\u00e9\u4e2d' }, flag: true },
    };
    pack.puzzles[1].certificate = { status: 'not-proved', model: 'x-cert-\u00e9', rowLimit: Number.MAX_SAFE_INTEGER };
    const snapshots = snapshotsOf(pack);
    assert.deepEqual(snapshots.map((s) => s.heading), ['Puzzle #1', '\u{1F9E9}'.repeat(80), 'Puzzle #3']);
    assert.deepEqual(snapshots[1].data.rating, pack.puzzles[1].rating, 'the shared snapshot keeps the foreign claim');
    for (const encode of [undefined, rawEncode, deflateEncode]) {
      const lines = linesOf((await emit(clone(pack), config, encode === undefined ? {} : { encode })).out);
      assert.equal(lines.length, 3);
      for (const [index, line] of lines.entries()) {
        await assertLine(line, snapshots[index]);
      }
    }
  });

  test('a DEFLATE line differs in bytes from the raw line and decodes to the same puzzle', async () => {
    const snapshots = snapshotsOf(samplePack);
    const raw = linesOf((await emit(clone(samplePack), config, { encode: rawEncode })).out);
    const packed = linesOf((await emit(clone(samplePack), config, { encode: deflateEncode })).out);
    for (const [index, line] of packed.entries()) {
      assert.ok(line.startsWith('2'), 'version 2');
      assert.notEqual(line, raw[index]);
      await assertLine(line, snapshots[index]);
    }
  });

  test('a presentation angle is carried as the effective angle', async () => {
    const pack = clone(handPack);
    pack.presentation = { rotation: 90 };
    const [line] = linesOf((await emit(pack, config)).out);
    await assertLine(line, snapshotsOf(pack)[0]);
    assert.equal((await decodePuzzleCode(line)).pack.presentation?.rotation, 90);
    const plain = linesOf((await emit(clone(handPack), config)).out)[0];
    assert.notEqual(plain, line);
  });

  test('the 24x24 oracle round-trips through the output helper to its frozen code', async () => {
    const oracle = fixture.large;
    const decoded = await decodePuzzleCode(oracle.code);
    assert.equal(decoded.tailError, null);
    const pack = decoded.pack;
    assert.equal(pack.board.rows.length, oracle.height);
    assert.equal(pack.board.rows[0].length, oracle.width);
    assert.deepEqual(pack.pieces.map((p) => p.cells.length), oracle.pieceSizes);
    const board = boardFromRows(pack.board.rows);
    assert.equal(progressFingerprint(board, pack.pieces, pack.puzzles[0].clues), oracle.progressFingerprint);
    const captured = await emit(deepFreeze(pack), config, { encode: rawEncode });
    assert.deepEqual(linesOf(captured.out), [oracle.code]);
    assert.equal(oracle.code.length, oracle.fullLength);
    assert.equal(oracle.code.indexOf('.'), oracle.coreLength);
  });

  test('the source pack is never modified, even deeply frozen', async () => {
    const frozen = deepFreeze(clone(samplePack));
    const before = JSON.stringify(frozen);
    const captured = await emit(frozen, { code: true, output: 'p.json' });
    assert.equal(linesOf(captured.out).length, 3);
    assert.equal(JSON.stringify(frozen), before);
    assert.equal(captured.files.get('p.json'), packText(samplePack));
  });

  test('an encoder or snapshot failure rejects before anything is written', async () => {
    const failure = new PuzzleCodeError('invalid', 'the encoder refuses this puzzle');
    /** @type {Record<string, (...args: any[]) => Promise<any>>} */
    const encoders = {
      'the first puzzle fails': async () => { throw failure; },
      'the last puzzle fails': async (snapshot) => {
        if (snapshot.title === 'Hard #3') {
          throw failure;
        }
        return rawEncode(snapshot);
      },
    };
    for (const [name, encode] of Object.entries(encoders)) {
      const captured = sinks({ encode });
      await assert.rejects(emitGeneratedResult(clone(samplePack), { code: true, output: 'p.json' }, captured.io), /no code for puzzle \d: the encoder refuses this puzzle/, name);
      assert.equal(captured.out.length, 0, `${name}: no partial list`);
      assert.equal(captured.files.size + captured.err.length, 0, `${name}: nothing written`);
    }
    const broken = clone(samplePack);
    broken.puzzles[1].clues[0].piece = 'NOPE';
    const captured = sinks();
    await assert.rejects(emitGeneratedResult(broken, { code: true }, captured.io), /no code for puzzle 2/);
    assert.equal(captured.out.length, 0, 'puzzle 1 was not printed on its own');
  });

  test('a malformed code from the encoder is rejected, never printed', async () => {
    const real = await rawEncode(snapshotsOf(handPack)[0].data);
    for (const F of ['', 'AB CD', 'ab.cd', 'AB.CD.EF', `${real.F}\n`, '.AB', 'AB.', 'UI', undefined]) {
      const captured = sinks({ encode: async () => ({ ...real, F }) });
      await assert.rejects(emitGeneratedResult(clone(handPack), config, captured.io), /no code for puzzle 1: the encoder returned a malformed code/, String(F));
      assert.equal(captured.out.length, 0);
    }
  });

  test('a failing file or stdout sink surfaces its error and no success diagnostic follows it', async () => {
    const boom = new Error('disk full');
    const file = sinks({ writeText: () => { throw boom; } });
    await assert.rejects(emitGeneratedResult(clone(handPack), { code: true, output: 'p.json' }, file.io), boom);
    assert.equal(file.out.length + file.err.length, 0, 'no codes and no "wrote" after a failed write');
    const plain = sinks({ writeText: () => { throw boom; } });
    await assert.rejects(emitGeneratedResult(clone(handPack), { code: false, output: 'p.json' }, plain.io), boom);
    assert.equal(plain.err.length, 0);
    const pipe = new Error('broken pipe');
    const stdout = sinks({ stdout: () => { throw pipe; } });
    await assert.rejects(emitGeneratedResult(clone(handPack), { code: true, output: 'p.json' }, stdout.io), pipe);
    assert.equal(stdout.files.get('p.json'), packText(handPack), 'the file was written first, as the order says');
  });
});

describe('run with --code', () => {
  /** @param {string[]} argv @param {Record<string, any>} [over] */
  async function runCli(argv, over = {}) {
    const captured = sinks(over);
    const code = await run(argv, captured.io);
    return { code, stdout: captured.out.join(''), stderr: captured.err.join(''), files: captured.files };
  }

  /** Lines of `stdout` and the matching pack written to `--output`, with the independent expectation per puzzle. @param {Awaited<ReturnType<typeof runCli>>} result */
  async function checked(result) {
    const lines = result.stdout.length === 0 ? [] : linesOf([result.stdout]);
    const text = result.files.get('pack.json');
    assert.ok(text !== undefined, 'the pack was saved');
    const parsedPack = parsePack(/** @type {string} */ (text));
    assert.ok(parsedPack.ok);
    const generated = /** @type {Pack} */ (/** @type {any} */ (parsedPack).value);
    const snapshots = snapshotsOf(generated);
    assert.equal(lines.length, generated.puzzles.length, 'one line per accepted puzzle');
    for (const [index, line] of lines.entries()) {
      await assertLine(line, snapshots[index]);
    }
    return { lines, generated, snapshots };
  }

  test('a recipe run prints ten codes in pack order and saves the pack through --output', async () => {
    const result = await runCli(['--recipe', recipePath, '--workers', '1', '--code', '--output', 'pack.json']);
    assert.equal(result.code, 0, result.stderr);
    const { lines, generated } = await checked(result);
    assert.equal(lines.length, 10);
    assert.ok(!result.stdout.includes('{') && !result.stdout.includes('wrote') && !result.stdout.includes('accepted'));
    assert.match(result.stderr, /puzzle 10 of 10 accepted/);
    assert.match(result.stderr, /wrote pack\.json\n/);
    assert.equal(result.files.size, 1);
    assert.equal((await decodePuzzleCode(lines[0])).pack.puzzles[0].title, generated.puzzles[0].title, 'line one is puzzle index zero');
    assert.equal((await decodePuzzleCode(lines[9])).pack.puzzles[0].title, generated.puzzles[9].title);
  });

  test('without --output the codes replace the pack JSON and no file is made; the default is unchanged', async () => {
    const argv = ['--board', '10x6', '--level', 'hard', '--count', '3', '--seed', 'fixture-set-0', '--workers', '2'];
    const coded = await runCli([...argv, '--code']);
    const plain = await runCli(argv);
    const saved = await runCli([...argv, '--output', 'pack.json']);
    assert.equal(coded.code, 0, coded.stderr);
    assert.equal(plain.code, 0, plain.stderr);
    assert.equal(coded.files.size, 0);
    assert.equal(linesOf([coded.stdout]).length, 3);
    const generated = JSON.parse(plain.stdout);
    assert.equal(generated.puzzles.length, 3);
    assert.ok(plain.stdout.endsWith('\r\n') && plain.stdout.startsWith('{'));
    assert.equal(saved.stdout, '', 'default --output: no pack JSON on stdout');
    const snapshots = snapshotsOf(/** @type {Pack} */ (generated));
    for (const [index, line] of linesOf([coded.stdout]).entries()) {
      await assertLine(line, snapshots[index]);
    }
  });

  test('one accepted puzzle gives one line, several give one line each in the pack order', async () => {
    for (const count of [1, 2]) {
      const result = await runCli(['--board', '10x6', '--level', 'hard', '--count', String(count), '--seed', 'fixture-set-0', '--workers', '1', '--code', '--output', 'pack.json']);
      assert.equal(result.code, 0, result.stderr);
      const { lines } = await checked(result);
      assert.equal(lines.length, count);
    }
  });

  test('generation inputs are untouched: the same worker messages and the same pack with and without the flag', async () => {
    /** @param {string[]} extra @param {string[]} messages */
    const recorded = async (extra, messages) => {
      const real = nodeWorkerFactory();
      const workerFactory = () => () => {
        const worker = real();
        return {
          postMessage: (/** @type {any} */ message) => {
            messages.push(JSON.stringify(message));
            worker.postMessage(message);
          },
          terminate: () => worker.terminate(),
          addEventListener: worker.addEventListener.bind(worker),
        };
      };
      return runCli(['--board', '10x6', '--level', 'hard', '--count', '2', '--seed', 'fixture-set-0', '--workers', '1', '--output', 'pack.json', ...extra], { workerFactory });
    };
    /** @type {string[]} */
    const without = [];
    /** @type {string[]} */
    const withFlag = [];
    const a = await recorded([], without);
    const b = await recorded(['--code'], withFlag);
    assert.equal(a.code, 0);
    assert.equal(b.code, 0);
    assert.ok(without.length > 0);
    assert.deepEqual(withFlag, without);
    assert.deepEqual(
      semantic(/** @type {any} */ (parsePack(/** @type {string} */ (b.files.get('pack.json')))).value),
      semantic(/** @type {any} */ (parsePack(/** @type {string} */ (a.files.get('pack.json')))).value),
    );
    assert.equal(a.stdout, '');
    assert.equal(linesOf([b.stdout]).length, 2);
  });

  test('slow: worker counts 1 and 4 print identical lines', async () => {
    const one = await runCli(['--recipe', recipePath, '--workers', '1', '--code', '--output', 'pack.json']);
    const four = await runCli(['--recipe', recipePath, '--workers', '4', '--code', '--output', 'pack.json']);
    assert.equal(one.code, 0, one.stderr);
    assert.equal(four.code, 0, four.stderr);
    assert.equal(four.stdout, one.stdout);
    await checked(four);
  });

  test('invalid arguments and failed generations keep exit 1 and print no code', async () => {
    const cases = [
      ['--code', '--board', '10x6', '--level', 'hard', '--seed', 'demo', '--max-active', '50'],
      ['--code', '--board', '4x4', '--level', 'hard', '--seed', 'demo'],
      ['--code', '--board', '10x6', '--level', 'hell-3', '--seed', 'demo'],
      ['--code', '--code', '--board', '10x6', '--level', 'hard'],
      ['--code=yes', '--board', '10x6', '--level', 'hard'],
      ['--code', '--recipe', recipePath, '--count', '2'],
    ];
    for (const argv of cases) {
      const result = await runCli(argv);
      assert.equal(result.code, 1, argv.join(' '));
      assert.equal(result.stdout, '');
      assert.equal(result.files.size, 0);
      assert.match(result.stderr, /(^|\n)generate: /);
    }
  });

  /** Workers behave as usual, except that no completion candidate finds a clue set: a valid partial result of seven. */
  function partialWorkers() {
    const real = nodeWorkerFactory();
    return () => () => {
      const worker = real();
      /** @type {((event: any) => void)[]} */
      const listeners = [];
      return {
        postMessage: (/** @type {any} */ message) => {
          if (message?.kind === 'completionCandidate') {
            queueMicrotask(() => listeners.forEach((fn) => fn({ data: { type: 'result', id: message.id, value: { fail: 'not-in-band' } } })));
          } else {
            worker.postMessage(message);
          }
        },
        terminate: () => worker.terminate(),
        addEventListener: (/** @type {string} */ type, /** @type {(event: any) => void} */ listener) => {
          if (type === 'message') {
            listeners.push(listener);
          }
          worker.addEventListener(type, listener);
        },
      };
    };
  }

  test('a valid partial result keeps exit 2, prints a code for every accepted puzzle and explains the shortfall on stderr', async () => {
    const argv = ['--board', '10x6', '--level', 'very-easy', '--count', '10', '--seed', 'bq0/d6x10-very-easy/5', '--workers', '2'];
    const coded = await runCli([...argv, '--code', '--output', 'pack.json'], { workerFactory: partialWorkers() });
    assert.equal(coded.code, 2, coded.stderr);
    assert.match(coded.stderr, /generate: found 7 of 10 Very easy puzzles \(layouts-not-found: /);
    assert.match(coded.stderr, /wrote pack\.json\n/);
    const { lines } = await checked(coded);
    assert.equal(lines.length, 7, 'one code per accepted puzzle, no placeholder for the missing three');
    const legacy = await runCli(argv, { workerFactory: partialWorkers() });
    assert.equal(legacy.code, 2, legacy.stderr);
    assert.equal(JSON.parse(legacy.stdout).puzzles.length, 7);
    assert.ok(legacy.stdout.startsWith('{') && legacy.stdout.endsWith('\r\n'));
    // Which parallel piece-set attempts report "finished", and in what order, depends on worker timing.
    const stable = (/** @type {string} */ text) => text.split('\n').filter((line) => !/^piece set: attempt \d+ finished$/.test(line));
    assert.deepEqual(stable(legacy.stderr), stable(coded.stderr.replace('wrote pack.json\n', '')), 'the same progress and explanation on stderr');
  });

  test('output failures exit 1 and are never reported as written', async () => {
    const argv = ['--board', '10x6', '--level', 'hard', '--count', '1', '--seed', 'fixture-set-0', '--workers', '1'];
    const file = await runCli([...argv, '--code', '--output', 'pack.json'], { writeText: () => { throw new Error('disk full'); } });
    assert.equal(file.code, 1);
    assert.equal(file.stdout, '');
    assert.match(file.stderr, /generate: disk full\n$/);
    assert.ok(!file.stderr.includes('wrote'));
    const plain = await runCli([...argv, '--output', 'pack.json'], { writeText: () => { throw new Error('disk full'); } });
    assert.equal(plain.code, 1);
    const stdout = await runCli([...argv, '--code'], { stdout: () => { throw new Error('closed pipe'); } });
    assert.equal(stdout.code, 1);
    assert.match(stdout.stderr, /generate: closed pipe\n$/);
  });

  test('an encoder failure exits 1 with a diagnostic on stderr and no code on stdout', async () => {
    const result = await runCli(['--board', '10x6', '--level', 'hard', '--count', '2', '--seed', 'fixture-set-0', '--workers', '1', '--code', '--output', 'pack.json'], {
      encode: async () => { throw new PuzzleCodeError('invalid', 'the encoder is down'); },
    });
    assert.equal(result.code, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.files.size, 0);
    assert.match(result.stderr, /generate: no code for puzzle 1: the encoder is down\n$/);
  });
});

describe('the command line tool with --code', () => {
  test('slow: a real process prints ASCII code lines only on stdout and writes the pack through --output', () => {
    rmSync(artifacts, { recursive: true, force: true });
    mkdirSync(artifacts, { recursive: true });
    try {
      const file = resolve(artifacts, 'pack.json');
      const done = spawnSync(process.execPath, [tool, '--recipe', recipePath, '--workers', '1', '--code', '--output', file]);
      assert.equal(done.status, 0, done.stderr.toString('utf8'));
      const stdout = done.stdout;
      assert.ok(stdout.length > 0 && stdout.every((byte) => byte === 0x0a || (byte >= 0x30 && byte <= 0x5a) || byte === 0x2e), 'only code characters, dots and LF');
      const lines = stdout.toString('ascii').split('\n');
      assert.equal(lines.pop(), '');
      assert.equal(lines.length, 10);
      assert.match(done.stderr.toString('utf8'), /puzzle 10 of 10 accepted[^]*wrote /);
      const text = readFileSync(file, 'utf8');
      assert.ok(text.endsWith('\r\n') && !/[^\r]\n/.test(text));
      const parsedPack = parsePack(text);
      assert.ok(parsedPack.ok);
      const generated = /** @type {Pack} */ (/** @type {any} */ (parsedPack).value);
      assert.equal(generated.puzzles.length, lines.length);
      const snapshots = snapshotsOf(generated);
      return Promise.all(lines.map((line, index) => assertLine(line, snapshots[index])));
    } finally {
      rmSync(artifacts, { recursive: true, force: true });
    }
  });

  test('slow: without --output no file is created, and a bad flag value exits 1 with nothing on stdout', () => {
    rmSync(artifacts, { recursive: true, force: true });
    mkdirSync(artifacts, { recursive: true });
    try {
      const done = spawnSync(process.execPath, [tool, '--board', '10x6', '--level', 'hard', '--count', '1', '--seed', 'fixture-set-0', '--workers', '1', '--code'], { cwd: artifacts });
      assert.equal(done.status, 0, done.stderr.toString('utf8'));
      assert.equal(done.stdout.toString('ascii').split('\n').length, 2);
      assert.deepEqual(readdirSync(artifacts), []);
      const bad = spawnSync(process.execPath, [tool, '--board', '10x6', '--level', 'hard', '--code=true'], { cwd: artifacts });
      assert.equal(bad.status, 1);
      assert.equal(bad.stdout.length, 0);
      assert.match(bad.stderr.toString('utf8'), /--code takes no value/);
      assert.deepEqual(readdirSync(artifacts), []);
    } finally {
      rmSync(artifacts, { recursive: true, force: true });
    }
  });
});
