// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { reduce } from '../core/engine/game.js';
import { levelForScore } from '../core/engine/levels.js';
import { packBoard, parsePack, validatePack } from '../core/engine/pack.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { encodeShareCode } from '../core/engine/sharecode.js';
import { executeTask } from '../core/engine/tasks.js';
import { MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES, createWorkspace } from '../core/engine/workspace.js';
import { PIECE_SET_MESSAGE } from '../core/browser/handoff.js';
import { PoolAbortError, PoolError } from '../core/browser/worker-pool.js';
import { SAVE_FAILED_MESSAGE, createStorage } from '../core/browser/storage.js';
import { verifySample } from '../tools/record-fixtures.mjs';
import {
  createPlayerController, createPlayerStore, effectiveRotation, hashWithIndex,
} from '../player/state.js';
import {
  INDEX_MESSAGE, MISSING_LOCAL_MESSAGE, SAMPLE_FAILED_MESSAGE, UNSUPPORTED_MESSAGE,
  certificateLabel, formatElapsed, invalidPackMessage, messageForIssues, ratingLabel, ratingParts, restorationNotice, verificationLabel,
} from '../player/strings.js';

const sampleText = readFileSync(new URL('../player/samples/sample-pack.json', import.meta.url), 'utf8');
const parsedSample = parsePack(sampleText);
assert.ok(parsedSample.ok);
const sample = parsedSample.value;
const handText = readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8');

/** Tiny pack whose pieces cannot tile the board: an I-tromino and an L-tromino on 3x2. */
const unsatisfiable = {
  format: 'pentomino-pack',
  version: 1,
  kind: 'puzzle-pack',
  rules: 'free-polyomino-v1',
  board: { rows: ['###', '###'] },
  pieces: [
    { id: 'A', label: 'A', color: '#e6194b', cells: [[0, 0], [0, 1], [1, 1]] },
    { id: 'B', label: 'B', color: '#3cb44b', cells: [[0, 0], [1, 0], [2, 0]] },
  ],
  puzzles: [{ id: 'u1', title: 'Impossible', clues: [] }],
};

/** @param {object} pack @returns {string} */
const json = (pack) => JSON.stringify(pack);

/** Same core content, different claims: the library id does not change. */
const reclaimed = {
  ...sample,
  puzzles: sample.puzzles.map((p) => ({ ...p, title: `${p.title} (v2)`, rating: p.rating === null || p.rating === undefined ? p.rating : { ...p.rating, score: p.rating.score + 1 } })),
};

const answerFree = { ...sample, witness: undefined, puzzles: sample.puzzles.map((p) => ({ ...p, solution: null })) };
delete answerFree.witness;

/** @param {Record<string, string>} [seed] */
function memoryAdapter(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    get length() {
      return map.size;
    },
    key: (/** @type {number} */ i) => [...map.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => map.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => {
      map.set(k, String(v));
    },
    removeItem: (/** @type {string} */ k) => {
      map.delete(k);
    },
  };
}

/** Pool that answers verifyPack with the real engine, synchronously and untouched by workers. */
function enginePool() {
  const calls = /** @type {any[]} */ ([]);
  return {
    calls,
    beginRequest() {},
    endRequest() {},
    close() {},
    /** @param {{ kind: any, payload: any }} task */
    async run(task) {
      calls.push(task);
      return structuredClone(executeTask(task.kind, task.payload, {
        main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES),
      }));
    },
  };
}

/** Pool whose replies are settled by the test. */
function manualPool() {
  /** @type {{ task: any, resolve: (v: unknown) => void, reject: (e: unknown) => void }[]} */
  const pending = [];
  return {
    pending,
    began: /** @type {number[]} */ ([]),
    beginRequest(/** @type {{ requestId: number }} */ r) {
      this.began.push(r.requestId);
    },
    endRequest() {},
    close() {},
    run: (/** @type {any} */ task) => new Promise((resolve, reject) => {
      pending.push({ task, resolve, reject });
    }),
  };
}

/**
 * @param {{ hash?: string, adapter?: ReturnType<typeof memoryAdapter> | null, pool?: any, fetchText?: (url: string) => Promise<string>,
 *   createPool?: () => any }} [o]
 */
function setup(o = {}) {
  const adapter = o.adapter === undefined ? memoryAdapter() : o.adapter;
  let tick = Date.parse('2026-01-01T00:00:00Z');
  const storage = createStorage(adapter, () => {
    tick += 1000;
    return tick;
  });
  const location = { hash: o.hash ?? '', pathname: '/player/', search: '' };
  /** @type {string[]} */
  const urls = [];
  const history = {
    replaceState(/** @type {unknown} */ _s, /** @type {string} */ _t, /** @type {string} */ url) {
      urls.push(url);
      location.hash = url.startsWith('#') ? url : '';
    },
  };
  const store = createPlayerStore({ prefs: storage.getPrefs() });
  const fetched = /** @type {string[]} */ ([]);
  const downloads = /** @type {string[]} */ ([]);
  const controller = createPlayerController({
    store,
    storage,
    location,
    history,
    baseUrl: 'http://localhost/player/',
    fetchText: o.fetchText ?? (async (url) => {
      fetched.push(url);
      return sampleText;
    }),
    createPool: o.createPool ?? (() => o.pool ?? enginePool()),
    download: (_pack, name) => {
      downloads.push(name);
    },
  });
  return { adapter, storage, location, urls, store, controller, fetched, downloads, state: () => store.getState() };
}

/** @param {ReturnType<typeof setup>} h */
const settle = async (h) => {
  for (let i = 0; i < 6; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return h.state();
};

/**
 * @param {import('../core/engine/types.js').Pack} pack
 * @param {number} i
 */
function movablePose(pack, i) {
  const clued = new Set(pack.puzzles[i].clues.map((c) => c.piece));
  const pose = /** @type {import('../core/engine/types.js').Pose[]} */ (pack.puzzles[i].solution).find((p) => !clued.has(p.piece));
  assert.ok(pose);
  return pose;
}

test('exact messages for every mapped failure', async () => {
  assert.equal(PIECE_SET_MESSAGE, 'This file has pieces but no puzzle — open it in the generator.');
  assert.equal(messageForIssues([{ code: 'piece-set', path: '$', message: 'x' }]), 'This file has pieces but no puzzle — open it in the generator.');
  assert.equal(messageForIssues([{ code: 'unsupported-version', path: 'version', message: 'x' }]), 'Unsupported puzzle version or rules.');
  assert.equal(messageForIssues([{ code: 'bad-rules', path: 'rules', message: 'x' }]), 'Unsupported puzzle version or rules.');
  assert.equal(messageForIssues([{ code: 'library-missing', path: '$', message: 'x' }]),
    "This puzzle is not in this browser's library. Import a file or use a portable link.");
  assert.equal(messageForIssues([{ code: 'index-out-of-range', path: '$', message: 'x' }]), 'This pack has no puzzle with that number.');
  assert.equal(messageForIssues([{ code: 'invalid-index', path: '$', message: 'x' }]), 'This pack has no puzzle with that number.');
  assert.equal(messageForIssues([{ code: 'missing-field', path: 'board', message: 'Missing required field "board"' }]),
    'This file is not a valid Pentomino pack: Missing required field "board"');
  assert.equal(invalidPackMessage('boom'), 'This file is not a valid Pentomino pack: boom');
});

test('verification, certificate and rating wording keeps claims apart from proofs', () => {
  assert.equal(verificationLabel({ status: 'pending' }), 'Checking solvability…');
  assert.equal(verificationLabel({ status: 'not-verified' }), 'Solvability not verified');
  assert.equal(verificationLabel({ status: 'unsatisfiable' }), 'No solution exists');
  assert.notEqual(verificationLabel({ status: 'not-verified' }), verificationLabel({ status: 'unsatisfiable' }));
  assert.equal(verificationLabel(undefined), '');
  assert.equal(certificateLabel(null), 'Uniqueness not checked');
  assert.equal(certificateLabel(null, true), 'Checking…');
  assert.equal(certificateLabel({ status: 'unique' }), 'Unique solution ✓');
  assert.equal(certificateLabel({ status: 'multiple' }), 'Multiple solutions');
  assert.equal(certificateLabel({ status: 'not-proved' }), 'At least 1 solution');
  assert.equal(certificateLabel({ status: 'unsatisfiable' }), 'No solution exists');
  const rating = /** @type {any} */ ({ model: 'difficulty-v2', score: 21, level: 'hard' });
  assert.equal(ratingLabel(rating), 'Hard: score 21');
  assert.deepEqual(ratingParts(rating), { before: '', level: 'Hard', after: ': score 21' });
  assert.equal(ratingLabel(null), '');
  assert.equal(ratingLabel(/** @type {any} */ ({ score: 3, level: '<img src=x onerror=alert(1)>' })).startsWith('<img'), true);
  assert.equal(formatElapsed(65000), '1:05');
  assert.equal(formatElapsed(3725000), '1:02:05');
  assert.equal(restorationNotice([]), '');
  assert.match(restorationNotice([{ code: 'placement-overlap', path: 'x', message: 'x' }]), /1 saved move no longer fits this puzzle and was discarded/);
});

test('sample pack: valid wire format, real in-band ratings, independent answers, identical to the generated fixture', () => {
  assert.equal(sampleText, readFileSync(new URL('./fixtures/generated-sample-pack.json', import.meta.url), 'utf8'));
  const checked = validatePack(JSON.parse(sampleText));
  assert.ok(checked.ok, JSON.stringify(!checked.ok && checked.issues));
  assert.deepEqual(checked.warnings, []);
  assert.deepEqual(sample.board.rows, Array(6).fill('#'.repeat(10)));
  assert.deepEqual(verifySample(JSON.parse(sampleText)), []);
  assert.deepEqual(sample.puzzles.map((p) => p.title), ['Easy', 'Normal', 'Hard']);
  for (const puzzle of sample.puzzles) {
    assert.ok(puzzle.rating && puzzle.solution);
    assert.equal(levelForScore(puzzle.rating.score).id, puzzle.rating.level);
    assert.equal(puzzle.certificate ?? null, null);
  }
  assert.equal(new Set(sample.puzzles.map((p) => JSON.stringify(p.solution))).size, 3);
});

test('store: observable, change-only notifications, unsubscribe and destroy', () => {
  const store = createPlayerStore();
  const seen = /** @type {string[]} */ ([]);
  const off = store.subscribe((s, prev) => seen.push(`${prev.screen}>${s.screen}:${s.index}`));
  store.update({ index: 2 });
  store.update({ index: 2 });
  store.update((s) => ({ index: s.index + 1 }));
  store.update(() => null);
  assert.deepEqual(seen, ['import>import:2', 'import>import:3']);
  off();
  store.update({ index: 9 });
  assert.equal(seen.length, 2);
  assert.equal(store.getState().index, 9);
  store.destroy();
  store.update({ index: 1 });
  assert.equal(store.getState().index, 9);
});

test('no hash and an empty library: the Import screen stays up and nothing is fetched or opened', async () => {
  const h = setup();
  await h.controller.start();
  const s = h.state();
  assert.equal(s.screen, 'import');
  assert.equal(s.game, null);
  assert.equal(s.error, null);
  assert.equal(s.loading, false);
  assert.deepEqual(s.library, []);
  assert.deepEqual(h.fetched, []);
});

test('link: #pack= opens the indexed puzzle without local data and keeps the hash, updating only i', async () => {
  const code = await encodeShareCode(sample);
  const h = setup({ hash: `#pack=${code}&i=1` });
  await h.controller.start();
  assert.equal(h.state().screen, 'game');
  assert.equal(h.state().index, 1);
  assert.equal(h.state().local, false);
  assert.equal(h.state().game?.index, 1);
  assert.equal(h.state().packId !== null, true, 'the pack joins the Recent library');
  assert.deepEqual(h.urls, [], 'an unchanged address is not rewritten');
  h.controller.goToPuzzle(2);
  assert.equal(h.location.hash, `#pack=${code}&i=2`);
  h.controller.previousPuzzle();
  assert.equal(h.location.hash, `#pack=${code}&i=1`);
  assert.equal(h.state().library.length, 1);
});

test('local #lib= links stay labeled local; a missing record explains itself', async () => {
  const first = setup();
  await first.controller.importText(sampleText);
  const id = /** @type {string} */ (first.state().packId);
  assert.equal(first.location.hash, `#lib=${id}&i=0`);
  assert.equal(first.state().local, true);

  const again = setup({ hash: `#lib=${id}&i=2`, adapter: first.adapter });
  await again.controller.start();
  assert.equal(again.state().index, 2);
  assert.equal(again.state().local, true);
  again.controller.previousPuzzle();
  assert.equal(again.location.hash, `#lib=${id}&i=1`);
  assert.equal(again.state().local, true);

  const gone = setup({ hash: '#lib=0123456789abcdef&i=0' });
  await gone.controller.start();
  assert.equal(gone.state().game, null);
  assert.equal(gone.state().error?.message, MISSING_LOCAL_MESSAGE);
});

test('invalid, unsupported, piece-set and out-of-range input explain themselves and leave the open game untouched', async () => {
  const h = setup();
  await h.controller.importText(sampleText);
  const before = h.state();
  assert.ok(before.game);
  const code = await encodeShareCode(sample);
  const badBoard = { ...sample, board: { rows: ['#'] } };
  const firstIssue = validatePack(JSON.parse(json(badBoard)));
  assert.equal(firstIssue.ok, false);
  const pieceSet = { ...sample, kind: 'piece-set', puzzles: [] };

  /** @type {[string, () => Promise<unknown>, string][]} */
  const cases = [
    ['invalid pack', () => h.controller.importText(json(badBoard)),
      invalidPackMessage(/** @type {any} */ (firstIssue).issues[0].message)],
    ['not JSON', () => h.controller.importText('{ nope'), invalidPackMessage('Not valid JSON')],
    ['no code', () => h.controller.importText('hello there'), invalidPackMessage('No puzzle link, code or file contents were found in the text.')],
    ['version', () => h.controller.importText(json({ ...sample, version: 2 })), UNSUPPORTED_MESSAGE],
    ['rules', () => h.controller.importText(json({ ...sample, rules: 'other-rules' })), UNSUPPORTED_MESSAGE],
    ['piece set', () => h.controller.importText(json(pieceSet)), PIECE_SET_MESSAGE],
    ['index', () => h.controller.openHash(`#pack=${code}&i=9`), INDEX_MESSAGE],
    ['bad index', () => h.controller.openHash(`#pack=${code}&i=-1`), INDEX_MESSAGE],
    ['missing local', () => h.controller.openHash('#lib=0123456789abcdef&i=0'), MISSING_LOCAL_MESSAGE],
  ];
  for (const [name, run, expected] of cases) {
    await run();
    const now = h.state();
    if (name === 'not JSON') {
      assert.match(now.error?.message ?? '', /^This file is not a valid Pentomino pack: Not valid JSON/, name);
    } else {
      assert.equal(now.error?.message, expected, name);
    }
    assert.equal(now.game, before.game, `${name}: same game object`);
    assert.equal(now.pack, before.pack, `${name}: same pack object`);
    assert.equal(now.screen, 'game', name);
    assert.equal(now.loading, false, name);
  }
  assert.equal(h.location.hash, `#lib=${before.packId}&i=0`, 'the address was not rewritten by failures');
});

test('files: size limit, answer-free packs and piece sets', async () => {
  const h = setup();
  await h.controller.importText(sampleText);
  const before = h.state().game;
  await h.controller.importFile({ size: 600 * 1024, text: async () => assert.fail('must not be read') });
  assert.match(h.state().error?.message ?? '', /^This file is not a valid Pentomino pack: A pack file is at most 524288 bytes/);
  assert.equal(h.state().game, before);
  await h.controller.importFile({ size: 10, text: async () => { throw new Error('denied'); } });
  assert.match(h.state().error?.message ?? '', /could not be read/);

  const text = json(answerFree);
  const ok = await h.controller.importFile({ size: text.length, text: async () => text });
  assert.equal(ok.ok, true);
  assert.notEqual(h.state().game, before);
  assert.equal(h.state().source, 'file');
  assert.match(h.location.hash, /^#lib=[0-9a-f]{16}&i=0$/);
  assert.equal(h.state().local, true);
});

test('failed replacements keep the old game while a new one is loading, and only the newest request commits', async () => {
  const h = setup();
  await h.controller.importText(sampleText);
  const open = h.state().game;
  /** @type {(v: string) => void} */
  let release = () => {};
  const slow = new Promise((resolve) => {
    release = resolve;
  });
  const first = h.controller.importFile({ size: 5, text: () => /** @type {Promise<string>} */ (slow) });
  assert.equal(h.state().loading, true);
  assert.equal(h.state().game, open, 'old game stays visible while loading');
  const second = await h.controller.importText(json(reclaimed));
  assert.equal(second.ok, true);
  const winner = h.state().pack;
  release(handText);
  const late = await first;
  assert.equal(late.stale, true);
  assert.equal(h.state().pack, winner, 'a late reply of an older request is discarded');
  assert.equal(h.state().loading, false);
});

test('puzzle switching keeps each game’s own progress and Replay removes the saved record', async () => {
  const h = setup();
  await h.controller.importText(sampleText);
  const pose = movablePose(sample, 0);
  h.store.update((s) => ({ game: reduce(/** @type {any} */ (s.game), { type: 'place', pose }) }));
  assert.equal(h.state().game?.placed.size, 1);

  h.controller.goToPuzzle(1);
  assert.equal(h.state().index, 1);
  assert.equal(h.state().game?.placed.size, 0, 'a different puzzle starts empty');
  assert.equal(h.state().statuses[0], 'in-progress');
  assert.equal(h.state().statuses[1], 'new');

  h.controller.previousPuzzle();
  assert.equal(h.state().game?.placed.size, 1, 'progress was saved before leaving');
  assert.equal('resume' in h.state(), false, 'there is no Continue / Restart choice');

  h.controller.replay();
  assert.equal(h.state().game?.placed.size, 0);
  assert.equal(h.state().statuses[0], 'new');
  assert.equal(h.storage.loadProgress(/** @type {string} */ (h.state().fingerprints[0])), null, 'Replay removed the saved record');
  h.controller.goToPuzzle(1);
  h.controller.goToPuzzle(0);
  assert.equal(h.state().game?.placed.size, 0, 'and the puzzle reopens empty');

  const bad = h.controller.goToPuzzle(3);
  assert.equal(bad.ok, false);
  assert.equal(h.state().error?.message, INDEX_MESSAGE);
  assert.equal(h.state().index, 0);
});

test('saved progress is matched by exact coordinates and reload restores it; discarded moves are reported', async () => {
  const adapter = memoryAdapter();
  const first = setup({ adapter });
  await first.controller.importText(sampleText);
  const pose = movablePose(sample, 0);
  first.store.update((s) => ({ game: reduce(/** @type {any} */ (s.game), { type: 'place', pose }) }));
  first.controller.saveNow();

  const reload = setup({ adapter });
  await reload.controller.importText(sampleText);
  assert.equal(reload.state().game?.placed.size, 1);
  assert.equal(reload.state().notice, null);

  const fp = /** @type {string} */ (reload.state().fingerprints[0]);
  reload.storage.saveProgress(fp, {
    v: 1,
    placements: [pose, { piece: 'ZZ', x: 0, y: 0, turn: 0, mirrored: false }, { ...pose, piece: 'A', x: 99, y: 99 }],
    elapsedMs: 5000,
    moves: 3,
    solved: false,
  });
  const damaged = setup({ adapter });
  await damaged.controller.importText(sampleText);
  assert.equal(damaged.state().game?.placed.size, 1);
  assert.match(damaged.state().notice?.text ?? '', /2 saved moves no longer fit this puzzle and were discarded/);
  assert.equal(damaged.state().notice?.kind, 'warning');
});

test('presentation angle is display only: loads at 0/45/90/315, never changes fingerprints, Straighten is local', async () => {
  const base = setup();
  await base.controller.importText(sampleText);
  const baseline = base.state().fingerprints;
  for (const rotation of [0, 45, 90, 315]) {
    const h = setup();
    const rotated = { ...sample, presentation: { rotation } };
    const result = await h.controller.importText(json(rotated));
    assert.equal(result.ok, true, `rotation ${rotation}`);
    assert.equal(h.state().pack?.presentation?.rotation, rotation);
    assert.deepEqual(h.state().fingerprints, baseline, `fingerprints at ${rotation}`);
    assert.equal(effectiveRotation(h.state()), rotation);
    h.controller.setPref('straighten', true);
    assert.equal(effectiveRotation(h.state()), [0, 0, 90, 270][[0, 45, 90, 315].indexOf(rotation)]);
    assert.equal(h.state().pack?.presentation?.rotation, rotation, 'the pack itself is untouched');
    assert.deepEqual(h.state().fingerprints, baseline);
  }
  const board = packBoard(sample);
  assert.equal(progressFingerprint(board, sample.pieces, sample.puzzles[0].clues), baseline[0]);
});

test('Straighten is a stored device preference; hashWithIndex only sets i', async () => {
  const adapter = memoryAdapter();
  const h = setup({ adapter });
  await h.controller.importText(sampleText);
  assert.deepEqual(h.state().prefs, { straighten: false });
  h.controller.setPref('straighten', true);
  assert.equal(h.state().prefs.straighten, true);
  const later = setup({ adapter });
  await later.controller.start();
  assert.deepEqual(later.state().prefs, { straighten: true });
  assert.deepEqual(JSON.parse(adapter.map.get('pentomino:v1:prefs') ?? ''), { straighten: true }, 'nothing else is stored');
  assert.equal(hashWithIndex('#pack=1z.abc&i=0', 4), '#pack=1z.abc&i=4');
  assert.equal(hashWithIndex('#lib=0123456789abcdef', 2), '#lib=0123456789abcdef&i=2');
  assert.equal(hashWithIndex('#i=1&pack=1z.x', 3), '#i=3&pack=1z.x');
});

test('library: recent entries, delete and export touch only their own pack', async () => {
  const adapter = memoryAdapter({ 'other-app:state': 'keep me', 'pentomino:v0:old': 'foreign version' });
  const h = setup({ adapter });
  await h.controller.importText(sampleText);
  const firstId = /** @type {string} */ (h.state().packId);
  await h.controller.importText(handText);
  const secondId = /** @type {string} */ (h.state().packId);
  assert.notEqual(firstId, secondId);
  assert.deepEqual(h.state().library.map((e) => e.packId), [secondId, firstId]);

  const pose = movablePose(sample, 0);
  await h.controller.openLibraryPack(firstId);
  h.store.update((s) => ({ game: reduce(/** @type {any} */ (s.game), { type: 'place', pose }) }));
  h.controller.saveNow();
  const fp = /** @type {string} */ (h.state().fingerprints[0]);

  const exported = h.controller.exportLibraryPack(firstId);
  assert.equal(exported.ok, true);
  assert.equal(h.downloads.length, 1);
  assert.equal(h.controller.exportLibraryPack('0123456789abcdef').ok, false);

  h.controller.removeLibraryPack(secondId);
  assert.deepEqual(h.state().library.map((e) => e.packId), [firstId]);
  assert.equal(h.storage.loadLibraryPack(secondId).ok, false);
  assert.equal(h.storage.loadLibraryPack(firstId).ok, true);
  assert.notEqual(h.storage.loadProgress(fp), null, 'progress of other packs is not removed');
  assert.equal(adapter.map.get('other-app:state'), 'keep me');
  assert.equal(adapter.map.get('pentomino:v0:old'), 'foreign version');
  assert.equal(h.state().game?.pack.puzzles.length, 3, 'the open pack keeps playing');
});

test('removePuzzle and removeAllPuzzles change the open pack and its library entry', async () => {
  const h = setup();
  await h.controller.importText(sampleText);
  const firstId = /** @type {string} */ (h.state().packId);
  await h.controller.goToPuzzle(1);
  assert.equal(h.controller.removePuzzle(5).ok, false, 'out of range');
  assert.equal(h.controller.removePuzzle(0).ok, true);
  assert.equal(h.state().pack?.puzzles.length, 2);
  assert.equal(h.state().index, 0, 'the open puzzle keeps its place in the shorter pack');
  assert.equal(h.state().pack?.puzzles[0].title, sample.puzzles[1].title);
  assert.notEqual(h.state().packId, firstId, 'the reduced pack is a new library entry');
  assert.equal(h.state().library.length, 1, 'and the old entry is gone');
  assert.equal(h.storage.loadLibraryPack(firstId).ok, false);
  assert.equal(h.controller.removePuzzle(0).ok, true, 'the open puzzle can be removed: its neighbour opens');
  assert.equal(h.state().pack?.puzzles.length, 1);
  assert.equal(h.state().screen, 'game');
  assert.equal(h.controller.removePuzzle(0).ok, true, 'the last puzzle leaves the pack');
  assert.deepEqual([h.state().pack, h.state().game, h.state().screen, h.state().library.length, h.location.hash], [null, null, 'import', 0, '']);

  await h.controller.importText(sampleText);
  h.controller.removeAllPuzzles();
  assert.deepEqual([h.state().pack, h.state().screen, h.state().library.length], [null, 'import', 0]);
  h.controller.removeAllPuzzles();
  assert.equal(h.state().screen, 'import', 'without a pack it does nothing');
});

test('same pack id with different content: the newest content wins everywhere and nothing is duplicated', async () => {
  const h = setup();
  await h.controller.importText(sampleText);
  const id = /** @type {string} */ (h.state().packId);
  await h.controller.importText(json(reclaimed));
  assert.equal(h.state().packId, id);
  assert.equal(h.state().library.length, 1);
  assert.equal(h.state().pack?.puzzles[0].title, 'Easy (v2)');
  const stored = h.storage.loadLibraryPack(id);
  assert.ok(stored.ok);
  assert.equal(stored.value.puzzles[0].title, 'Easy (v2)');
  assert.equal(stored.value.puzzles[0].rating?.score, (sample.puzzles[0].rating?.score ?? 0) + 1);
  assert.equal(ratingLabel(h.state().pack?.puzzles[0].rating), `Easy: score ${(sample.puzzles[0].rating?.score ?? 0) + 1}`);
});

test('unavailable storage never blocks play and is reported once', async () => {
  const none = setup({ adapter: null });
  await none.controller.importText(sampleText);
  assert.equal(none.state().screen, 'game');
  assert.equal(none.state().packId, null);
  assert.equal(none.state().storageWarning, SAVE_FAILED_MESSAGE);
  assert.equal(none.location.hash, '', 'no unusable #lib= address is invented');
  const pose = movablePose(sample, 0);
  none.store.update((s) => ({ game: reduce(/** @type {any} */ (s.game), { type: 'place', pose }) }));
  assert.equal(none.controller.goToPuzzle(1).ok, true);
  assert.equal(none.state().game?.index, 1);

  const throwing = {
    length: 0,
    key: () => null,
    getItem: () => { throw new Error('denied'); },
    setItem: () => { throw new Error('denied'); },
    removeItem: () => { throw new Error('denied'); },
  };
  const hostile = setup({ adapter: /** @type {any} */ (throwing) });
  await hostile.controller.importText(sampleText);
  assert.equal(hostile.state().screen, 'game');
  assert.equal(hostile.controller.goToPuzzle(2).ok, true);
});

test('sample: loaded through the ordinary path from the fixed relative URL; failures are explained', async () => {
  const h = setup();
  await h.controller.openSample();
  assert.deepEqual(h.fetched, ['http://localhost/player/samples/sample-pack.json']);
  assert.equal(h.state().screen, 'game');
  assert.equal(h.state().source, 'sample');
  assert.equal(h.state().pack?.puzzles.length, 3);
  assert.equal(ratingLabel(h.state().pack?.puzzles[0].rating).startsWith('Easy: score '), true);

  const down = setup({ fetchText: async () => { throw new Error('offline'); } });
  await down.controller.openSample();
  assert.equal(down.state().error?.message, SAMPLE_FAILED_MESSAGE);
  assert.equal(down.state().game, null);
});

test('pasted text: link, bare code, JSON and surrounding words all use the shared loader; URLs are never fetched', async () => {
  const code = await encodeShareCode(sample);
  const h = setup();
  await h.controller.importText(`Try this: https://example.invalid/player/#pack=${code}&i=2 — have fun`);
  assert.equal(h.state().index, 2);
  await h.controller.importText(`here ${code} ok`);
  assert.equal(h.state().index, 0);
  await h.controller.importText(`  ${handText}  `);
  assert.equal(h.state().pack?.puzzles.length, 1);
  await h.controller.importText('https://example.invalid/pack.json');
  assert.match(h.state().error?.message ?? '', /^This file is not a valid Pentomino pack: /);
  assert.deepEqual(h.fetched, []);
});

test('verification: a validated answer proves solvability only; claims stay claims', async () => {
  const pool = enginePool();
  const h = setup({ pool });
  await h.controller.importText(sampleText);
  assert.deepEqual(h.state().verificationByPuzzle[0], { status: 'solvable', basis: 'solution' });
  assert.equal(pool.calls.length, 0, 'no search for a validated answer');
  assert.equal(certificateLabel(h.state().pack?.puzzles[0].certificate), 'Uniqueness not checked');
  assert.equal(h.state().pack?.puzzles[0].certificate ?? null, null);
  assert.equal(ratingLabel(h.state().pack?.puzzles[2].rating).startsWith('Hard'), true);
});

test('verification: answer-free puzzles are searched in a worker; only an exhausted empty search says impossible', async () => {
  const pool = enginePool();
  const h = setup({ pool });
  await h.controller.importText(json(answerFree));
  await settle(h);
  assert.deepEqual(h.state().verificationByPuzzle[0], { status: 'solvable', basis: 'search' });
  assert.equal(pool.calls.length, 1);
  assert.equal(pool.calls[0].kind, 'verifyPack');
  assert.equal(pool.calls[0].payload.pack.puzzles.length, 1, 'only the open puzzle is checked');

  const impossible = setup({ pool: enginePool() });
  await impossible.controller.importText(json(unsatisfiable));
  assert.equal(impossible.state().screen, 'game', 'play stays allowed');
  await settle(impossible);
  assert.deepEqual(impossible.state().verificationByPuzzle[0], { status: 'unsatisfiable', basis: 'search' });
  assert.equal(verificationLabel(impossible.state().verificationByPuzzle[0]), 'No solution exists');
});

test('verification: inconclusive, crashed and unavailable workers read "not verified", never "no solution"', async () => {
  const pool = manualPool();
  const h = setup({ pool });
  await h.controller.importText(json(answerFree));
  const fp = /** @type {string} */ (h.state().fingerprints[0]);
  pool.pending[0].resolve({ results: [{ index: 0, fingerprint: fp, status: 'not-verified' }] });
  await settle(h);
  assert.equal(verificationLabel(h.state().verificationByPuzzle[0]), 'Solvability not verified');

  const crash = manualPool();
  const c = setup({ pool: crash });
  await c.controller.importText(json(answerFree));
  crash.pending[0].reject(new PoolError('worker-crashed', 'boom'));
  await settle(c);
  assert.equal(c.state().verificationByPuzzle[0].status, 'not-verified');
  assert.equal(c.state().screen, 'game');

  const missing = setup({ createPool: () => { throw new PoolError('worker-unavailable', 'no workers'); } });
  await missing.controller.importText(json(answerFree));
  assert.equal(missing.state().verificationByPuzzle[0].status, 'not-verified');
  assert.equal(missing.state().verificationByPuzzle[0].basis, 'unavailable');
  assert.equal(missing.state().game !== null, true, 'manual play stays available');
  assert.equal(missing.controller.goToPuzzle(1).ok, true);
  assert.equal(missing.state().verificationByPuzzle[1].status, 'not-verified');

  const unavailable = setup({ pool: { beginRequest() {}, endRequest() {}, close() {}, run: () => Promise.reject(new PoolError('worker-unavailable', 'x')) } });
  await unavailable.controller.importText(json(answerFree));
  await settle(unavailable);
  assert.equal(unavailable.state().verificationByPuzzle[0].status, 'not-verified');
});

test('verification: replies for a replaced pack or a mismatched fingerprint are discarded; superseded checks clear', async () => {
  const pool = manualPool();
  const h = setup({ pool });
  await h.controller.importText(json(answerFree));
  const staleReply = pool.pending[0];
  const staleFp = /** @type {string} */ (h.state().fingerprints[0]);
  const revision = h.state().revision;

  await h.controller.importText(json({ ...answerFree, puzzles: [answerFree.puzzles[1], answerFree.puzzles[0]] }));
  assert.equal(h.state().revision, revision + 1);
  assert.equal(h.state().verificationByPuzzle[0].status, 'pending');
  staleReply.resolve({ results: [{ index: 0, fingerprint: staleFp, status: 'unsatisfiable' }] });
  await settle(h);
  assert.equal(h.state().verificationByPuzzle[0].status, 'pending', 'proof data of an old revision is discarded');

  const current = pool.pending[1];
  current.resolve({ results: [{ index: 0, fingerprint: staleFp, status: 'unsatisfiable' }] });
  await settle(h);
  assert.equal(h.state().verificationByPuzzle[0].status, 'not-verified', 'a fingerprint that is not this puzzle is never believed');

  // Rapid switching: the earlier check is superseded and must not stay "pending" forever.
  const rapid = manualPool();
  const r = setup({ pool: rapid });
  await r.controller.importText(json(answerFree));
  r.controller.goToPuzzle(1);
  rapid.pending[0].reject(new PoolAbortError('superseded'));
  await settle(r);
  assert.equal(r.state().verificationByPuzzle[0], undefined);
  assert.equal(r.state().verificationByPuzzle[1].status, 'pending');
  r.controller.goToPuzzle(0);
  assert.equal(r.state().verificationByPuzzle[0].status, 'pending', 'returning re-requests the check');
  assert.deepEqual(rapid.began, [1, 2, 3]);
});

test('select only marks a piece; destroy stops everything', async () => {
  const pool = manualPool();
  const h = setup({ pool });
  await h.controller.importText(json(answerFree));
  const placed = h.state().game?.placed;
  h.controller.select('E');
  assert.equal(h.state().game?.selected, 'E');
  assert.equal(h.state().game?.placed, placed);
  h.controller.select(null);
  assert.equal(h.state().game?.selected, null);
  h.controller.destroy();
  pool.pending[0].resolve({ results: [] });
  await settle(h);
  const result = await h.controller.importText(sampleText);
  assert.equal(result.ok, false);
});
