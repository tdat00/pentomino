// @ts-check
// Import puzzle: a puzzle code (or a Player link) brings its board, piece set and puzzle into the Generator.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createGenerationClient } from '../core/browser/generation-client.js';
import { createPuzzleCodeClient } from '../core/browser/puzzle-code-client.js';
import { puzzleSnapshot } from '../core/browser/puzzle-snapshot.js';
import { createPool } from '../core/browser/worker-pool.js';
import { boardKey, boardToRows } from '../core/engine/board.js';
import { packBoard, parsePack } from '../core/engine/pack.js';
import { decodePuzzleCode, encodePuzzleCode } from '../core/engine/puzzlecode.js';
import { createJobController } from '../generator/jobs.js';
import {
  MAX_SETS, createGeneratorStore, defaultGeneratorState, generationBlock, importPuzzle, restoreState, savedSetOf, serializeState,
  setNumber,
} from '../generator/state.js';
import { nodeWorkerFactory } from '../tools/node-worker.mjs';

const root = new URL('../', import.meta.url);
const parsed = parsePack(readFileSync(new URL('player/samples/sample-pack.json', root), 'utf8'));
assert.ok(parsed.ok);
const sample = parsed.value;
const handParsed = parsePack(readFileSync(new URL('tests/fixtures/hand-authored-pack.json', root), 'utf8'));
assert.ok(handParsed.ok);
const hand = handParsed.value;

/**
 * The code of one puzzle of a pack, as Print and Copy make it.
 * @param {import('../core/engine/types.js').Pack} pack
 * @param {number} index
 * @param {number} [rotation]
 */
async function codeOf(pack, index, rotation = 0) {
  const snapshot = puzzleSnapshot({
    rows: pack.board.rows, pieces: pack.pieces, puzzle: /** @type {any} */ (pack.puzzles[index]), index, rotation, untitled: (n) => `Puzzle #${n}`,
  });
  return (await encodePuzzleCode(snapshot.data)).F;
}

/** @param {string} code */
const packOf = async (code) => (await decodePuzzleCode(code)).pack;

test('a new set: the board, its angle, the pieces and the puzzle with its answer come from the code', async () => {
  const pack = await packOf(await codeOf(sample, 1, 45));
  const { state, status } = importPuzzle(defaultGeneratorState(), pack, () => 'IMPORT-SEED');
  assert.equal(status, 'new-set');
  assert.deepEqual(boardToRows(state.board), sample.board.rows, 'the editor board is the board of the code');
  assert.equal(state.rotation, 45, 'at the angle of the code');
  const set = /** @type {NonNullable<typeof state.set>} */ (state.set);
  assert.equal(set.carving, 'imported');
  assert.deepEqual(set.pieces.map((p) => p.id), sample.pieces.map((p) => p.id), 'the pieces keep their ids and order');
  assert.equal(state.setSeed, 'IMPORT-SEED');
  assert.equal(state.calibrationFor, null, 'no level was asked for');
  assert.equal(state.puzzles.length, 1);
  assert.deepEqual(state.puzzles[0].clues, pack.puzzles[0].clues);
  assert.equal(state.puzzles[0].solution?.length, sample.pieces.length, 'the stored answer came with it');
  assert.equal(state.puzzles[0].id, 'imported-1');
  assert.deepEqual(state.checking, []);
  assert.equal(state.seenClues.length, 1, 'a new puzzle of this set will not repeat it');
  assert.ok(savedSetOf(state) !== null, 'the set can be saved');
  assert.deepEqual(setNumber(state), { n: 1, total: 1 });
  const restored = restoreState(JSON.parse(JSON.stringify(serializeState(state))));
  assert.equal(restored.set?.carving, 'imported', 'the imported set survives a reload');
  assert.equal(restored.puzzles.length, 1);
});

test('a puzzle of the set on show joins it; the same puzzle is not added twice', async () => {
  const first = importPuzzle(defaultGeneratorState(), await packOf(await codeOf(sample, 1)), () => 'A-SEED');
  const second = importPuzzle(first.state, await packOf(await codeOf(sample, 2)));
  assert.equal(second.status, 'added');
  assert.equal(second.state.set, first.state.set, 'the same set');
  assert.deepEqual(second.state.puzzles.map((p) => p.id), ['imported-1', 'imported-2']);
  assert.deepEqual(setNumber(second.state), { n: 1, total: 1 }, 'still one set');
  const again = importPuzzle(second.state, await packOf(await codeOf(sample, 1)));
  assert.equal(again.status, 'exists');
  assert.equal(again.state, second.state, 'nothing changed');
});

test('another piece set is a new set; the one on show is kept with its puzzles', async () => {
  const first = importPuzzle(defaultGeneratorState(), await packOf(await codeOf(sample, 0)), () => 'FIRST');
  const second = importPuzzle(first.state, await packOf(await codeOf(hand, 0)), () => 'SECOND');
  assert.equal(second.status, 'new-set');
  assert.deepEqual(boardToRows(second.state.board), hand.board.rows);
  assert.equal(second.state.setSeed, 'SECOND');
  const saved = Object.values(second.state.setsByBoard).flat();
  assert.deepEqual(saved.map((s) => s.setSeed), ['FIRST'], 'the first set is saved under its own board');
  assert.equal(saved[0].puzzles.length, 1);
  assert.equal(second.state.puzzles.length, 1);
});

test('a full list of the board refuses a new set for it, and nothing changes', async () => {
  const pack = await packOf(await codeOf(sample, 0));
  const shown = importPuzzle(defaultGeneratorState(), pack, () => 'S0').state;
  const saved = /** @type {NonNullable<ReturnType<typeof savedSetOf>>} */ (savedSetOf(shown));
  // The set on show has the pieces of the code in another order, so it is another set of the same board.
  const other = { ...shown, set: { .../** @type {any} */ (shown.set), pieces: [.../** @type {any} */ (shown.set).pieces].reverse() } };
  const full = { ...other, setsByBoard: { [boardKey(shown.board)]: Array.from({ length: MAX_SETS - 1 }, () => saved) } };
  const refused = importPuzzle(full, pack);
  assert.equal(refused.status, 'sets-full');
  assert.equal(refused.state, full, 'nothing changed');
  const room = { ...full, setsByBoard: { [boardKey(shown.board)]: Array.from({ length: MAX_SETS - 2 }, () => saved) } };
  assert.equal(importPuzzle(room, pack).status, 'new-set', 'one place less taken: it fits');
});

test('the imported set can make new puzzles: the stored answer is its witness', async () => {
  const pack = await packOf(await codeOf(sample, 1));
  const { state } = importPuzzle(defaultGeneratorState(), pack, () => 'W-SEED');
  const set = /** @type {NonNullable<typeof state.set>} */ (state.set);
  assert.deepEqual(set.witness, state.puzzles[0].solution, 'the answer of the puzzle is the witness of the set');
  assert.equal(generationBlock(state, { phone: false }), null, 'New puzzle is not blocked');
  const restored = restoreState(JSON.parse(JSON.stringify(serializeState(state))));
  assert.equal(generationBlock(restored, { phone: false }), null, 'nor after a reload');
  // A second puzzle without an answer joins a set that already has its witness, and keeps it.
  const bare = await packOf(await codeOf({ ...sample, puzzles: sample.puzzles.map((p) => ({ ...p, solution: null })) }, 2));
  const joined = importPuzzle(state, bare);
  assert.equal(joined.status, 'added');
  assert.equal(joined.state.set?.witness, set.witness);
});

test('a code without an answer gets its witness from the solver in a worker, then New puzzle opens', async () => {
  const withoutAnswer = { ...sample, puzzles: sample.puzzles.map((p) => ({ ...p, solution: null })) };
  const code = await codeOf(withoutAnswer, 1);
  assert.ok(!code.includes('.'), 'the code has no answer');
  const store = createGeneratorStore(defaultGeneratorState());
  const factory = nodeWorkerFactory();
  const pool = createPool({ size: 1, workerFactory: factory });
  const controller = createJobController({
    store,
    hardware: { phone: false },
    client: createGenerationClient(pool),
    createPuzzleCodeClient: () => createPuzzleCodeClient({ createPool: () => /** @type {any} */ (createPool({ size: 1, workerFactory: factory })) }),
  });
  try {
    const done = await controller.importPuzzleCode(code);
    assert.equal(/** @type {any} */ (done).value?.status, 'new-set');
    assert.equal(store.getState().set?.witness, null, 'at first there is no witness');
    assert.ok(generationBlock(store.getState(), { phone: false }) !== null, 'New puzzle waits for it');
    for (let i = 0; i < 200 && store.getState().set?.witness === null; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const witness = store.getState().set?.witness;
    assert.ok(Array.isArray(witness) && witness.length === sample.pieces.length, 'the solver found an arrangement');
    assert.equal(generationBlock(store.getState(), { phone: false }), null, 'New puzzle is open');
  } finally {
    controller.destroy();
    pool.close();
    store.destroy();
  }
});

/** A generation client that is never asked for anything. */
const idleClient = /** @type {any} */ ({ generateSet: async () => ({ status: 'cancelled' }), generateBatch: async () => ({ status: 'cancelled' }), cancel() {} });

/** @returns {ReturnType<typeof createJobController>} */
function controllerOn(/** @type {ReturnType<typeof createGeneratorStore>} */ store) {
  const factory = nodeWorkerFactory();
  return createJobController({
    store,
    hardware: { phone: false },
    client: idleClient,
    createPuzzleCodeClient: () => createPuzzleCodeClient({ createPool: () => /** @type {any} */ (createPool({ size: 1, workerFactory: factory })) }),
  });
}

test('the controller reads a code or a link with the real worker and commits the puzzle', async () => {
  const store = createGeneratorStore(defaultGeneratorState());
  const controller = controllerOn(store);
  try {
    const code = await codeOf(sample, 1, 90);
    const grouped = code.toLowerCase().replace(/(.{4})/g, '$1-');
    const done = await controller.importPuzzleCode(`https://example.org/pentomino/player/#p=${grouped}`);
    assert.deepEqual([done.ok, /** @type {any} */ (done).value?.status], [true, 'new-set']);
    const state = store.getState();
    assert.equal(state.puzzles.length, 1);
    assert.equal(state.rotation, 90);
    assert.deepEqual(boardToRows(packBoard(/** @type {any} */ ({ board: { rows: boardToRows(state.board) } }))), sample.board.rows);
    const again = await controller.importPuzzleCode(code);
    assert.equal(/** @type {any} */ (again).value?.status, 'exists');
    assert.equal(store.getState().puzzles.length, 1);
  } finally {
    controller.destroy();
    store.destroy();
  }
});

test('a Play link with several puzzles brings all of them: the first makes the set, the others join it', async () => {
  const store = createGeneratorStore(defaultGeneratorState());
  const controller = controllerOn(store);
  try {
    const codes = [await codeOf(sample, 0), await codeOf(sample, 1), await codeOf(sample, 2)];
    const link = `https://example.org/pentomino/player/#p=${codes.join(';')}&i=1`;
    const done = await controller.importPuzzleCode(link);
    assert.deepEqual([done.ok, /** @type {any} */ (done).value?.status], [true, 'new-set']);
    const state = store.getState();
    assert.equal(state.puzzles.length, 3);
    assert.equal(state.set?.carving, 'imported');
    assert.deepEqual(state.puzzles.map((p) => p.solution?.length), sample.puzzles.map((p) => p.solution?.length));
    const again = await controller.importPuzzleCode(link);
    assert.equal(/** @type {any} */ (again).value?.status, 'exists', 'the same link adds nothing');
    assert.equal(store.getState().puzzles.length, 3);

    const partial = createGeneratorStore(defaultGeneratorState());
    const second = controllerOn(partial);
    try {
      assert.equal(/** @type {any} */ (await second.importPuzzleCode(codes[0])).value?.status, 'new-set');
      const rest = await second.importPuzzleCode(codes.join(';'));
      assert.equal(/** @type {any} */ (rest).value?.status, 'added', 'a puzzle that is there is skipped, the others are added');
      assert.equal(partial.getState().puzzles.length, 3);
    } finally {
      second.destroy();
      partial.destroy();
    }
  } finally {
    controller.destroy();
    store.destroy();
  }
});

test('the controller explains a bad code and changes nothing; a busy job or a newer import wins', async () => {
  const store = createGeneratorStore(defaultGeneratorState());
  const controller = controllerOn(store);
  try {
    const before = store.getState();
    const bad = await controller.importPuzzleCode('not a code!');
    assert.equal(bad.ok, false);
    assert.ok(/** @type {any} */ (bad).issues[0].code !== undefined);
    const code = await codeOf(sample, 0);
    const typo = `${code.slice(0, 5)}${code[5] === '0' ? '1' : '0'}${code.slice(6)}`;
    const wrong = await controller.importPuzzleCode(typo);
    assert.equal(wrong.ok, false);
    assert.equal(store.getState(), before, 'a failed import changes nothing');

    store.update((s) => ({ ...s, job: { requestId: 1, revision: 'set-1', startedAt: 0, kind: 'set' } }));
    const busy = await controller.importPuzzleCode(code);
    assert.equal(/** @type {any} */ (busy).value?.status, 'busy');
    store.update((s) => ({ ...s, job: null }));

    const pending = controller.importPuzzleCode(code);
    controller.cancelImport();
    const dropped = await pending;
    assert.equal(dropped.ok, false, 'a cancelled import is dropped');
    assert.equal(store.getState().puzzles.length, 0, 'and changed nothing');
  } finally {
    controller.destroy();
    store.destroy();
  }
});
