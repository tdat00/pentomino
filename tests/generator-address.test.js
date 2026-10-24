// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { boardFromKey, boardKey, preset, rectangle } from '../core/engine/board.js';
import { packBoard, parsePack } from '../core/engine/pack.js';
import { addressParams, applyAddress, withAddress } from '../generator/address.js';
import {
  acceptSet, boardsEqual, defaultGeneratorState, setCell, setTimelineLength, showSetBySeed, withBoard,
} from '../generator/state.js';

const parsed = parsePack(readFileSync(new URL('./fixtures/generated-sample-pack.json', import.meta.url), 'utf8'));
assert.ok(parsed.ok);
const samplePack = parsed.value;
/** @type {import('../core/engine/types.js').PieceSet} */
const sampleSet = { board: packBoard(samplePack), pieces: samplePack.pieces, witness: samplePack.witness ?? null, carving: 'flat', macroRegion: null };

/** @param {Record<string, string>} params */
const search = (params) => `?${new URLSearchParams(params).toString()}`;

test('boardFromKey reads back what boardKey wrote and refuses anything else', () => {
  for (const board of [rectangle(10, 6), preset('heart', { n: 10 }).board, setCell(rectangle(7, 5), 3, 2, 0), rectangle(32, 32)]) {
    assert.ok(boardsEqual(boardFromKey(boardKey(board)), board));
  }
  for (const bad of ['', 'x', '10x6', '3x3:', '3x3:_4x', '3x3:__', '0x5:AAAA', '3x3:_5']) {
    assert.throws(() => boardFromKey(bad), RangeError, bad);
  }
});

test('the default state names its settings and nothing else', () => {
  const state = defaultGeneratorState();
  assert.deepEqual(addressParams(state), { preset: 'rectangle', angle: '0', cells: boardKey(state.board), level: 'normal' });
});

test('the board is the key alone, for preset boards and painted boards alike', () => {
  const heart = preset('heart', { n: 10 });
  const state = withBoard({ ...defaultGeneratorState(), presetId: 'heart' }, heart.board, heart.rotation);
  assert.deepEqual(addressParams(state), { preset: 'heart', angle: '45', cells: boardKey(heart.board), level: state.levelId });
  const painted = withBoard(state, setCell(state.board, 9, 0, 1));
  assert.equal(addressParams(painted).cells, boardKey(painted.board));
  assert.notEqual(addressParams(painted).cells, addressParams(state).cells);
  const back = applyAddress(defaultGeneratorState(), search(addressParams(painted))).state;
  assert.ok(boardsEqual(back.board, painted.board), 'the disabled and enabled squares come back');
});

test('the settings survive the address: board, angle, level, seed and unique', () => {
  const heart = preset('heart', { n: 10 });
  let state = withBoard({ ...defaultGeneratorState(), presetId: 'heart', levelId: 'hard', uniqueness: 'require', seedText: 'my seed', keepSeed: true }, heart.board, 90);
  state = withBoard(state, setCell(state.board, 2, 2, 0), 90);
  const params = addressParams(state);
  const href = withAddress('https://example.test/pentomino/generator/?step=2#x', params);
  assert.match(href, /^https:\/\/example\.test\/pentomino\/generator\/\?step=2&/);
  assert.ok(href.endsWith('#x'), 'the hash stays');
  const back = applyAddress(defaultGeneratorState(), new URL(href).search).state;
  assert.ok(boardsEqual(back.board, state.board));
  assert.deepEqual([back.presetId, back.rotation, back.levelId, back.uniqueness, back.seedText, back.keepSeed], ['heart', 90, 'hard', 'require', 'my seed', true]);
  // Writing again replaces the old settings instead of adding to them.
  const again = withAddress(href, addressParams(defaultGeneratorState()));
  assert.equal(new URL(again).searchParams.getAll('level').length, 1);
  assert.equal(new URL(again).searchParams.get('step'), '2');
  assert.equal(new URL(again).searchParams.has('seed'), false);
});

test('invalid or missing parts leave the state as it was', () => {
  const base = defaultGeneratorState({ levelId: 'easy' });
  const small = boardKey(rectangle(5, 4));
  assert.deepEqual([applyAddress(base, search({ cells: small })).state.board.width, applyAddress(base, search({ cells: small })).state.board.height], [5, 4]);
  for (const bad of [
    { cells: boardKey(rectangle(2, 9)) }, { cells: boardKey(rectangle(40, 9)) }, { cells: '3x3:__' }, { cells: 'x' },
    { angle: '30' }, { angle: '360' }, { level: 'impossible' }, { preset: 'star' }, { seed: 'x'.repeat(80) },
  ]) {
    const state = applyAddress(base, search(bad)).state;
    assert.ok(boardsEqual(state.board, base.board), JSON.stringify(bad));
    assert.deepEqual([state.rotation, state.levelId, state.presetId], [0, 'easy', 'rectangle'], JSON.stringify(bad));
    assert.equal(state.seedText, '');
  }
  assert.deepEqual(applyAddress(base, '').state.board.width, 10, 'no parameters, no change');
  assert.equal(applyAddress({ ...base, uniqueness: 'require' }, '').state.uniqueness, 'require', 'no settings in the address keep what was saved');
  assert.equal(applyAddress({ ...base, uniqueness: 'require' }, search({ level: 'hard' })).state.uniqueness, 'any', 'a link without unique means any');
});

/** A state whose board is the sample set's, with two sets made for it. */
function twoSets() {
  let state = withBoard(defaultGeneratorState(), sampleSet.board);
  state = acceptSet(state, { set: sampleSet, calibration: null, setSeed: 'first' });
  return acceptSet(state, { set: sampleSet, calibration: null, setSeed: 'second' });
}

test('a seed in the address shows the set saved here with that seed, otherwise the caller makes it', () => {
  const state = twoSets();
  assert.equal(state.setSeed, 'second');
  assert.equal(addressParams(state).seed, 'second', 'the set on show is named by its seed');
  const cells = { cells: boardKey(sampleSet.board) };
  const found = applyAddress(state, search({ ...cells, seed: 'first' }));
  assert.deepEqual([found.seed, found.state.setSeed], ['first', 'first']);
  assert.equal(setTimelineLength(found.state), 2, 'the other set stays saved');
  const missing = applyAddress(state, search({ ...cells, seed: 'third' }));
  assert.deepEqual([missing.seed, missing.state.setSeed, missing.state.seedText, missing.state.keepSeed], ['third', 'second', 'third', true]);
});

test('a board in the address brings the sets saved for it, or none', () => {
  const state = twoSets();
  const other = applyAddress(state, search({ cells: boardKey(rectangle(5, 5)) })).state;
  assert.deepEqual([other.set, other.puzzles.length], [null, 0]);
  const back = applyAddress(other, search({ cells: boardKey(sampleSet.board) })).state;
  assert.equal(back.setSeed, 'second');
  assert.equal(setTimelineLength(back), 2);
});

test('showSetBySeed finds a saved set of the board by its seed', () => {
  const state = twoSets();
  assert.equal(showSetBySeed(state, 'second'), state);
  assert.equal(showSetBySeed(state, 'first')?.setSeed, 'first');
  assert.equal(showSetBySeed(state, 'nope'), null);
});
