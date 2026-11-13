// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { reduce } from '../core/engine/game.js';
import { levelForScore } from '../core/engine/levels.js';
import { packBoard, parsePack, validatePack } from '../core/engine/pack.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { executeTask } from '../core/engine/tasks.js';
import { validatePayload } from '../core/engine/protocol.js';
import { MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES, createWorkspace } from '../core/engine/workspace.js';
import { createPuzzleCodeClient } from '../core/browser/puzzle-code-client.js';
import { puzzleCodesOf } from '../core/browser/handoff.js';
import { displayRatingKey, ratingDisplay } from '../core/browser/display-rating.js';
import { puzzleSnapshot } from '../core/browser/puzzle-snapshot.js';
import { PoolAbortError, PoolError, WorkerTaskError, createPool } from '../core/browser/worker-pool.js';
import { SAVE_FAILED_MESSAGE, createStorage } from '../core/browser/storage.js';
import { verifySample } from '../tools/record-fixtures.mjs';
import { nodeWorkerFactory } from '../tools/node-worker.mjs';
import {
  createPlayerController, createPlayerStore, effectiveRotation, hashWithIndex, knownSolvable,
} from '../player/state.js';
import { setLocale, t } from '../player/i18n.js';
import {
  INDEX_MESSAGE, SAMPLE_FAILED_MESSAGE,
  certificateLabel, formatElapsed, invalidPackMessage, levelLabel, messageForIssues, ratingParts, restorationNotice, verificationLabel,
} from '../player/strings.js';
import { displayRatingOf, setRating } from '../player/ui/rating-dom.js';

/** The rating line as one text. @param {any} rating */
const ratingLabel = (rating) => {
  const parts = ratingParts(rating);
  return parts === null ? '' : `${parts.before}${parts.level}${parts.after}`;
};

const sampleText = readFileSync(new URL('../player/samples/sample-pack.json', import.meta.url), 'utf8');
const parsedSample = parsePack(sampleText);
assert.ok(parsedSample.ok);
const sample = parsedSample.value;

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

/** One real Node worker makes the codes of the portable addresses. */
const realClient = createPuzzleCodeClient({ createPool: () => /** @type {any} */ (createPool({ size: 1, workerFactory: nodeWorkerFactory() })) });
after(() => realClient.dispose());

const answerFree = { ...sample, witness: undefined, puzzles: sample.puzzles.map((p) => ({ ...p, solution: null })) };
delete answerFree.witness;

/**
 * The same pack with no rating claim: nothing is re-rated, so a test of the auxiliary queue itself sees only its own
 * requests (every puzzle of the sample carries a `difficulty-v2` claim, which the Player re-rates in the background).
 * @param {import('../core/engine/types.js').Pack} pack
 */
const unrated = (pack) => ({ ...pack, puzzles: pack.puzzles.map((p) => ({ ...p, rating: null })) });
const sampleUnrated = unrated(sample);
const answerFreeUnrated = unrated(/** @type {any} */ (answerFree));

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

/** Pool that records every call and leaves `run` (verification) and `runIdle` (auxiliary) to the test. */
function auxPool() {
  /** @type {unknown[][]} */
  const calls = [];
  /** @type {(() => void)[]} */
  const timeouts = [];
  /** @type {{ task: any, resolve: (v: unknown) => void, reject: (e: unknown) => void }[]} */
  const verify = [];
  /** @type {{ task: any, resolve: (v: unknown) => void, reject: (e: unknown) => void }[]} */
  const idle = [];
  return {
    calls,
    verify,
    idle,
    timeouts,
    beginRequest(/** @type {{ requestId: number, revision: string, onTimeout?: () => void }} */ r) {
      calls.push(['begin', r.requestId, r.revision]);
      if (r.onTimeout !== undefined) {
        timeouts.push(r.onTimeout);
      }
    },
    endRequest(/** @type {number} */ id) {
      calls.push(['end', id]);
    },
    close() {
      calls.push(['close']);
    },
    run: (/** @type {any} */ task) => new Promise((resolve, reject) => {
      verify.push({ task, resolve, reject });
    }),
    runIdle: (/** @type {any} */ task) => new Promise((resolve, reject) => {
      calls.push(['idle', task.requestId, task.revision]);
      idle.push({ task, resolve, reject });
    }),
  };
}

/** @param {Promise<unknown>} promise */
function track(promise) {
  /** @type {{ state: string, value?: any, error?: any }} */
  const out = { state: 'pending' };
  promise.then((value) => Object.assign(out, { state: 'resolved', value }), (error) => Object.assign(out, { state: 'rejected', error }));
  return out;
}

const rateInput = { boardRows: sample.board.rows, pieces: sample.pieces, clues: sample.puzzles[0].clues };

/**
 * @param {{ hash?: string, adapter?: ReturnType<typeof memoryAdapter> | null, pool?: any, fetchText?: (url: string) => Promise<string>,
 *   createPool?: () => any, codes?: boolean }} [o] `codes`: the controller makes puzzle codes with a real worker.
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
  const store = createPlayerStore();
  const fetched = /** @type {string[]} */ ([]);
  let served = sampleText;
  const controller = createPlayerController({
    store,
    storage,
    location,
    history,
    baseUrl: 'http://localhost/player/',
    fetchText: o.fetchText ?? (async (url) => {
      fetched.push(url);
      return served;
    }),
    createPool: o.createPool ?? (() => o.pool ?? enginePool()),
    ...(o.codes === true ? { puzzleCodeClient: realClient } : {}),
  });
  return {
    adapter, storage, location, urls, store, controller, fetched, state: () => store.getState(),
    /** @param {string} text */
    serve(text) {
      served = text;
    },
  };
}

/**
 * Opens `pack` the way the sample is opened (from a file), at puzzle `i`.
 * @param {ReturnType<typeof setup>} h
 * @param {import('../core/engine/types.js').Pack} pack
 * @param {number} [i]
 */
async function openPack(h, pack, i = 0) {
  h.serve(JSON.stringify(pack));
  const result = await h.controller.openSample();
  if (result.ok && i > 0) {
    h.controller.goToPuzzle(i);
  }
  return result;
}

/** The `#p=` list of the puzzles of `pack`, as Play makes it. @param {import('../core/engine/types.js').Pack} pack @param {number} [i] */
async function listHash(pack, i = 0) {
  const codes = await puzzleCodesOf(pack, { encodePuzzle: (data) => realClient.encode(data) });
  assert.ok(codes);
  return `#p=${codes.join(';')}${i === 0 ? '' : `&i=${i}`}`;
}

/** @param {ReturnType<typeof setup>} h */
const settle = async (h) => {
  for (let i = 0; i < 6; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return h.state();
};

/** Waits for the asynchronous switch to a portable address. @param {() => boolean} ready */
async function waitFor(ready) {
  for (let i = 0; i < 200 && !ready(); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(ready(), 'the condition never came true');
}

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
  assert.equal(messageForIssues([{ code: 'piece-set', path: '$', message: 'x' }]), 'This link has pieces but no puzzle — open it in the Generator.');
  assert.equal(messageForIssues([{ code: 'unsupported-version', path: 'version', message: 'x' }]), 'Unsupported puzzle version or rules.');
  assert.equal(messageForIssues([{ code: 'bad-rules', path: 'rules', message: 'x' }]), 'Unsupported puzzle version or rules.');
  assert.equal(messageForIssues([{ code: 'index-out-of-range', path: '$', message: 'x' }]), 'This pack has no puzzle with that number.');
  assert.equal(messageForIssues([{ code: 'invalid-index', path: '$', message: 'x' }]), 'This pack has no puzzle with that number.');
  assert.equal(messageForIssues([{ code: 'missing-field', path: 'board', message: 'Missing required field "board"' }]),
    'This link does not hold a valid Pentomino puzzle: Missing required field "board"');
  assert.equal(invalidPackMessage('boom'), 'This link does not hold a valid Pentomino puzzle: boom');
  const twins = 'Pieces b and a have the same shape (mirror images count as the same shape), so this puzzle cannot be opened.';
  assert.equal(messageForIssues([{ code: 'duplicate-shape', path: 'pieces[1]', message: 'x', params: { piece: 'b', first: 'a' } }]), twins);
  assert.equal(messageForIssues([{ code: 'duplicate-shape', path: 'pieces[1]', message: 'x' }]),
    'Pieces ? and ? have the same shape (mirror images count as the same shape), so this puzzle cannot be opened.', 'missing values never throw');
  setLocale('vi', null);
  try {
    assert.equal(messageForIssues([{ code: 'duplicate-shape', path: 'pieces[1]', message: 'x', params: { piece: 'b', first: 'a' } }]),
      'Mảnh b và mảnh a có cùng hình dạng (hình lật đối xứng cũng tính là cùng hình dạng), nên không thể mở đề này.');
  } finally {
    setLocale('en', null);
  }
});

test('verification, certificate and rating wording keeps claims apart from proofs', () => {
  assert.equal(verificationLabel({ status: 'pending' }), 'Checking solvability…');
  assert.equal(verificationLabel({ status: 'not-verified' }), 'Solvability not verified');
  assert.equal(verificationLabel({ status: 'unsatisfiable' }), 'No solution exists');
  assert.notEqual(verificationLabel({ status: 'not-verified' }), verificationLabel({ status: 'unsatisfiable' }));
  assert.equal(verificationLabel(undefined), '');
  assert.equal(certificateLabel(null), '', 'no certificate and no known solution: no claim');
  assert.equal(certificateLabel(null, true), 'At least 1 solution', 'no certificate but a known solution, as in the generator');
  assert.equal(certificateLabel({ status: 'unique' }), 'Unique solution ✓');
  assert.equal(certificateLabel({ status: 'multiple' }, true), 'Multiple solutions', 'a certificate is shown as it is');
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

test('sample pack: valid wire format, real in-band ratings, independent answers, the gen-v2 source of the code goldens', () => {
  assert.equal(sample.generation.algo, 'gen-v2');
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
  assert.deepEqual(seen, ['start>start:2', 'start>start:3']);
  off();
  store.update({ index: 9 });
  assert.equal(seen.length, 2);
  assert.equal(store.getState().index, 9);
  store.destroy();
  store.update({ index: 1 });
  assert.equal(store.getState().index, 9);
});

test('no hash: the start screen stays up and nothing is fetched, opened or stored', async () => {
  const h = setup();
  await h.controller.start();
  const s = h.state();
  assert.equal(s.screen, 'start');
  assert.equal(s.game, null);
  assert.equal(s.error, null);
  assert.equal(s.loading, false);
  assert.deepEqual(h.fetched, []);
  assert.deepEqual([...(h.adapter?.map.keys() ?? [])], []);
});

test('link: #p= opens the indexed puzzle of a list, keeps the codes and updates only i', async () => {
  const hash = await listHash(sample, 1);
  const base = hash.replace(/&i=1$/, '');
  const h = setup({ hash, codes: true });
  await h.controller.start();
  assert.equal(h.state().screen, 'game');
  assert.equal(h.state().index, 1);
  assert.equal(h.state().game?.index, 1);
  assert.equal(h.state().source, 'hash');
  assert.deepEqual(h.urls, [], 'an unchanged address is not rewritten');
  h.controller.goToPuzzle(2);
  assert.equal(h.location.hash, `${base}&i=2`);
  h.controller.previousPuzzle();
  assert.equal(h.location.hash, `${base}&i=1`);
  h.controller.goToPuzzle(0);
  assert.equal(h.location.hash, `${base}&i=0`);
  await settle(h);
  assert.equal(h.state().source, 'hash');
  assert.deepEqual([...(h.adapter?.map.keys() ?? [])].filter((k) => !k.includes(':progress:') && !k.endsWith(':progress-index')), [],
    'the address keeps the pack, nothing else is stored');
});

test('invalid, index and old-style links leave the open game untouched', async () => {
  const h = setup({ codes: true });
  await openPack(h, sample);
  await waitFor(() => h.state().source === 'hash');
  const before = h.state();
  assert.ok(before.game);
  const opened = h.location.hash;
  assert.match(opened, /^#p=/);
  const list = opened.replace(/&i=\d+$/, '');

  /** @type {[string, string, string | null][]} */
  const cases = [
    ['index', `${list}&i=9`, invalidPackMessage('The puzzle number in the link does not name one of its puzzles; fix or remove it.')],
    ['bad index', `${list}&i=-1`, null],
    ['#pack=', '#pack=1z.AAAA&i=0', ''],
    ['#lib=', '#lib=0123456789abcdef&i=0', ''],
  ];
  for (const [name, hash, expected] of cases) {
    await h.controller.openHash(hash);
    const now = h.state();
    if (expected === '') {
      assert.equal(now.error, null, `${name}: an address with no puzzle data is simply ignored`);
    } else if (expected === null) {
      assert.ok(now.error, name);
    } else {
      assert.equal(now.error?.message, expected, name);
    }
    assert.equal(now.game, before.game, `${name}: same game object`);
    assert.equal(now.pack, before.pack, `${name}: same pack object`);
    assert.equal(now.screen, 'game', name);
    assert.equal(now.loading, false, name);
  }
  assert.equal(h.location.hash, opened, 'the address was not rewritten by failures');
  assert.equal(invalidPackMessage('boom'), 'This link does not hold a valid Pentomino puzzle: boom');
  assert.equal(validatePack({ ...sample, board: { rows: ['#'] } }).ok, false);
});

test('the open game stays while a new one is loading, and only the newest request commits', async () => {
  /** @type {(v: string) => void} */
  let release = () => {};
  const slow = new Promise((resolve) => {
    release = resolve;
  });
  let gate = false;
  let text = sampleText;
  const h = setup({ fetchText: () => (gate ? /** @type {Promise<string>} */ (slow) : Promise.resolve(text)) });
  await h.controller.openSample();
  const open = h.state().game;
  gate = true;
  const first = h.controller.openSample();
  assert.equal(h.state().loading, true);
  assert.equal(h.state().game, open, 'old game stays visible while loading');
  gate = false;
  text = JSON.stringify(answerFree);
  const second = await h.controller.openSample();
  assert.equal(second.ok, true);
  const winner = h.state().pack;
  release(sampleText);
  const late = await first;
  assert.equal(late.stale, true);
  assert.equal(h.state().pack, winner, 'a late reply of an older request is discarded');
  assert.equal(h.state().loading, false);
});

test('puzzle switching keeps each game’s own progress and Replay removes the saved record', async () => {
  const h = setup();
  await openPack(h, sample);
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
  await openPack(first, sample);
  const pose = movablePose(sample, 0);
  first.store.update((s) => ({ game: reduce(/** @type {any} */ (s.game), { type: 'place', pose }) }));
  first.controller.saveNow();

  const reload = setup({ adapter });
  await openPack(reload, sample);
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
  await openPack(damaged, sample);
  assert.equal(damaged.state().game?.placed.size, 1);
  assert.match(damaged.state().notice?.text ?? '', /2 saved moves no longer fit this puzzle and were discarded/);
  assert.equal(damaged.state().notice?.kind, 'warning');
});

test('presentation angle is display only: loads at 0/45/90/315, never changes fingerprints', async () => {
  const base = setup();
  await openPack(base, sample);
  const baseline = base.state().fingerprints;
  for (const rotation of [0, 45, 90, 315]) {
    const h = setup();
    const rotated = { ...sample, presentation: { rotation } };
    const result = await openPack(h, rotated);
    assert.equal(result.ok, true, `rotation ${rotation}`);
    assert.equal(h.state().pack?.presentation?.rotation, rotation);
    assert.deepEqual(h.state().fingerprints, baseline, `fingerprints at ${rotation}`);
    assert.equal(effectiveRotation(h.state()), rotation);
    assert.equal(h.state().pack?.presentation?.rotation, rotation, 'the pack itself is untouched');
    assert.deepEqual(h.state().fingerprints, baseline);
  }
  const board = packBoard(sample);
  assert.equal(progressFingerprint(board, sample.pieces, sample.puzzles[0].clues), baseline[0]);
});

test('start drops the retired preferences key and leaves the rest', async () => {
  const adapter = memoryAdapter({ 'pentomino:v1:prefs': JSON.stringify({ straighten: true }), 'other-app:state': 'keep me' });
  const h = setup({ adapter });
  await h.controller.start();
  assert.equal(adapter.map.has('pentomino:v1:prefs'), false);
  assert.equal(adapter.map.get('other-app:state'), 'keep me');
});

test('hashWithIndex only sets i', () => {
  assert.equal(hashWithIndex('#p=ABCD;EFGH&i=0', 4), '#p=ABCD;EFGH&i=4');
  assert.equal(hashWithIndex('#p=ABCD;EFGH', 2), '#p=ABCD;EFGH&i=2');
  assert.equal(hashWithIndex('#i=1&p=ABCD;EFGH', 3), '#i=3&p=ABCD;EFGH');
});

test('the sample gets a #p= list of its puzzles as its address, which opens the same pack; the number follows', async () => {
  const adapter = memoryAdapter({ 'other-app:state': 'keep me', 'pentomino:v0:old': 'foreign version' });
  const h = setup({ adapter, codes: true });
  await h.controller.openSample();
  assert.equal(h.state().source, 'sample');
  await waitFor(() => h.state().source === 'hash');
  assert.equal(h.location.hash, await listHash(sample));
  assert.deepEqual(h.urls, [await listHash(sample)], 'the address is written once');
  assert.equal(adapter.map.get('other-app:state'), 'keep me');
  assert.equal(adapter.map.get('pentomino:v0:old'), 'foreign version');
  assert.deepEqual([...adapter.map.keys()].filter((k) => k.startsWith('pentomino:v1:')), [], 'nothing is stored for the pack');
  h.controller.goToPuzzle(2);
  assert.equal(h.location.hash, `${await listHash(sample)}&i=2`);

  const reload = setup({ hash: h.location.hash, codes: true });
  await reload.controller.start();
  assert.equal(reload.state().index, 2);
  assert.deepEqual(reload.state().fingerprints, h.state().fingerprints, 'the same three puzzles');
});

test('a link opened while the sample gets its address keeps its own address', async () => {
  const h = setup({ codes: true });
  const other = { ...sample, puzzles: sample.puzzles.slice(0, 2) };
  const link = await listHash(other, 1);
  await h.controller.openSample();
  h.location.hash = link;
  await h.controller.openHash(link);
  await settle(h);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(h.state().pack?.puzzles.length, 2);
  assert.equal(h.location.hash, link, 'the late sample link did not replace it');
});

test('removePuzzle and removeAllPuzzles change the open pack and its address', async () => {
  const h = setup({ codes: true });
  await openPack(h, sample, 1);
  await waitFor(() => h.state().source === 'hash');
  assert.equal(h.controller.removePuzzle(5).ok, false, 'out of range');
  assert.equal(h.controller.removePuzzle(0).ok, true);
  assert.equal(h.state().pack?.puzzles.length, 2);
  assert.equal(h.state().index, 0, 'the open puzzle keeps its place in the shorter pack');
  assert.equal(h.state().pack?.puzzles[0].title, sample.puzzles[1].title);
  const shorter = { ...sample, puzzles: sample.puzzles.slice(1) };
  await waitFor(() => h.location.hash === '' || h.location.hash.split(';').length === 2);
  assert.equal(h.controller.removePuzzle(0).ok, true, 'the open puzzle can be removed: its neighbour opens');
  assert.equal(h.state().pack?.puzzles.length, 1);
  assert.equal(h.state().screen, 'game');
  assert.equal(h.controller.removePuzzle(0).ok, true, 'the last puzzle leaves the pack');
  assert.deepEqual([h.state().pack, h.state().game, h.state().screen, h.location.hash], [null, null, 'start', '']);
  await settle(h);
  assert.equal(h.location.hash, '', 'a late link of a closed pack is not applied');
  assert.ok(shorter.puzzles.length === 2);

  await h.controller.openSample();
  h.controller.removeAllPuzzles();
  assert.deepEqual([h.state().pack, h.state().screen, h.location.hash], [null, 'start', '']);
  h.controller.removeAllPuzzles();
  assert.equal(h.state().screen, 'start', 'without a pack it does nothing');
});

test('unavailable storage never blocks play and is reported once', async () => {
  const none = setup({ adapter: null, codes: true });
  await none.controller.openSample();
  assert.equal(none.state().screen, 'game');
  assert.equal(none.state().storageWarning, null, 'nothing is saved until there is progress');
  await waitFor(() => none.state().source === 'hash');
  assert.match(none.location.hash, /^#p=/, 'the address needs no storage');
  const pose = movablePose(sample, 0);
  none.store.update((s) => ({ game: reduce(/** @type {any} */ (s.game), { type: 'place', pose }) }));
  assert.equal(none.controller.goToPuzzle(1).ok, true);
  assert.equal(none.state().storageWarning, SAVE_FAILED_MESSAGE);
  assert.equal(none.state().game?.index, 1);

  const throwing = {
    length: 0,
    key: () => null,
    getItem: () => { throw new Error('denied'); },
    setItem: () => { throw new Error('denied'); },
    removeItem: () => { throw new Error('denied'); },
  };
  const hostile = setup({ adapter: /** @type {any} */ (throwing) });
  await openPack(hostile, sample);
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

test('a pack with two pieces of one shape is refused with the message naming both pieces, and opens nothing', async () => {
  const twins = {
    ...unsatisfiable,
    board: { rows: ['##', '##'] },
    pieces: [
      { id: 'A', label: 'A', color: '#e6194b', cells: [[0, 0], [1, 0]] },
      { id: 'B', label: 'B', color: '#3cb44b', cells: [[0, 0], [0, 1]] },
    ],
    puzzles: [{ id: 't1', title: 'Twins', clues: [] }],
  };
  const h = setup();
  const result = await openPack(h, /** @type {any} */ (twins));
  assert.equal(result.ok, false);
  assert.deepEqual(/** @type {any} */ (result).issues.map((/** @type {any} */ i) => [i.code, i.path, i.params]), [['duplicate-shape', 'pieces[1]', { piece: 'B', first: 'A' }]]);
  assert.equal(h.state().error?.code, 'duplicate-shape');
  assert.equal(h.state().error?.message, 'Pieces B and A have the same shape (mirror images count as the same shape), so this puzzle cannot be opened.');
  assert.equal(h.state().game, null);
  assert.equal(h.state().pack, null);
  assert.equal(h.state().screen, 'start');
  assert.deepEqual([...(h.adapter?.map.keys() ?? [])], [], 'nothing is stored');
});

test('verification: a validated answer proves solvability only; claims stay claims', async () => {
  const pool = enginePool();
  const h = setup({ pool });
  await openPack(h, sample);
  assert.deepEqual(h.state().verificationByPuzzle[0], { status: 'solvable', basis: 'solution' });
  assert.equal(pool.calls.length, 0, 'no search for a validated answer');
  const puzzle = h.state().pack?.puzzles[0];
  assert.equal(puzzle?.certificate ?? null, null);
  assert.equal(certificateLabel(puzzle?.certificate, knownSolvable(puzzle, h.state().verificationByPuzzle[0])), 'At least 1 solution',
    'an included answer is a known solution');
  assert.equal(ratingLabel(h.state().pack?.puzzles[2].rating).startsWith('Hard'), true);
});

test('verification: answer-free puzzles are searched in a worker; only an exhausted empty search says impossible', async () => {
  const pool = manualPool();
  const h = setup({ pool });
  await openPack(h, answerFree);
  const puzzle = h.state().pack?.puzzles[0];
  const uniqueness = () => certificateLabel(puzzle?.certificate, knownSolvable(puzzle, h.state().verificationByPuzzle[0]));
  assert.equal(uniqueness(), '', 'no claim while the check runs');
  pool.pending[0].resolve(await enginePool().run(pool.pending[0].task));
  await settle(h);
  assert.deepEqual(h.state().verificationByPuzzle[0], { status: 'solvable', basis: 'search' });
  assert.equal(uniqueness(), 'At least 1 solution', 'a solution found by the check is a known solution');
  assert.equal(pool.pending.length, 1);
  assert.equal(pool.pending[0].task.kind, 'verifyPack');
  assert.equal(pool.pending[0].task.payload.pack.puzzles.length, 1, 'only the open puzzle is checked');

  const impossible = setup({ pool: enginePool() });
  await openPack(impossible, /** @type {any} */ (unsatisfiable));
  assert.equal(impossible.state().screen, 'game', 'play stays allowed');
  await settle(impossible);
  assert.deepEqual(impossible.state().verificationByPuzzle[0], { status: 'unsatisfiable', basis: 'search' });
  assert.equal(verificationLabel(impossible.state().verificationByPuzzle[0]), 'No solution exists');
  assert.equal(certificateLabel(null, knownSolvable(impossible.state().pack?.puzzles[0], impossible.state().verificationByPuzzle[0])), '',
    'and no uniqueness claim');
});

test('verification: inconclusive, crashed and unavailable workers read "not verified", never "no solution"', async () => {
  const pool = manualPool();
  const h = setup({ pool });
  await openPack(h, answerFree);
  const fp = /** @type {string} */ (h.state().fingerprints[0]);
  pool.pending[0].resolve({ results: [{ index: 0, fingerprint: fp, status: 'not-verified' }] });
  await settle(h);
  assert.equal(verificationLabel(h.state().verificationByPuzzle[0]), 'Solvability not verified');

  const crash = manualPool();
  const c = setup({ pool: crash });
  await openPack(c, answerFree);
  crash.pending[0].reject(new PoolError('worker-crashed', 'boom'));
  await settle(c);
  assert.equal(c.state().verificationByPuzzle[0].status, 'not-verified');
  assert.equal(c.state().screen, 'game');

  const missing = setup({ createPool: () => { throw new PoolError('worker-unavailable', 'no workers'); } });
  await openPack(missing, answerFree);
  assert.equal(missing.state().verificationByPuzzle[0].status, 'not-verified');
  assert.equal(missing.state().verificationByPuzzle[0].basis, 'unavailable');
  assert.equal(missing.state().game !== null, true, 'manual play stays available');
  assert.equal(missing.controller.goToPuzzle(1).ok, true);
  assert.equal(missing.state().verificationByPuzzle[1].status, 'not-verified');

  const unavailable = setup({ pool: { beginRequest() {}, endRequest() {}, close() {}, run: () => Promise.reject(new PoolError('worker-unavailable', 'x')) } });
  await openPack(unavailable, answerFree);
  await settle(unavailable);
  assert.equal(unavailable.state().verificationByPuzzle[0].status, 'not-verified');
});

test('verification: replies for a replaced pack or a mismatched fingerprint are discarded; superseded checks clear', async () => {
  const pool = manualPool();
  const h = setup({ pool });
  await openPack(h, answerFree);
  const staleReply = pool.pending[0];
  const staleFp = /** @type {string} */ (h.state().fingerprints[0]);
  const revision = h.state().revision;

  await openPack(h, { ...answerFree, puzzles: [answerFree.puzzles[1], answerFree.puzzles[0]] });
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
  await openPack(r, answerFree);
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
  await openPack(h, answerFree);
  const placed = h.state().game?.placed;
  h.controller.select('E');
  assert.equal(h.state().game?.selected, 'E');
  assert.equal(h.state().game?.placed, placed);
  h.controller.select(null);
  assert.equal(h.state().game?.selected, null);
  h.controller.destroy();
  pool.pending[0].resolve({ results: [] });
  await settle(h);
  const result = await openPack(h, sample);
  assert.equal(result.ok, false);
});

test('auxiliary request: the first one of a fresh player bootstraps its own token, and request ids keep increasing', async () => {
  const pool = auxPool();
  const h = setup({ pool });
  await openPack(h, sampleUnrated);
  assert.deepEqual(pool.calls, [], 'a stored answer makes no verification request');
  const out = track(h.controller.submitAuxiliary('rate', rateInput));
  await settle(h);
  assert.deepEqual(pool.calls, [['begin', 1, 'aux-1'], ['end', 1], ['idle', 1, 'aux-1']]);
  assert.equal(pool.idle[0].task.kind, 'rate');
  assert.deepEqual(pool.idle[0].task.payload, rateInput);
  pool.idle[0].resolve({ rating: 'scripted' });
  await settle(h);
  assert.deepEqual([out.state, out.value], ['resolved', { rating: 'scripted' }]);
  await openPack(h, answerFreeUnrated);
  assert.deepEqual(pool.calls.slice(3), [['begin', 2, `${h.state().revision}:0`]]);
  await assert.rejects(h.controller.submitAuxiliary('verifyPack', {}), TypeError);
});

test('auxiliary request: a verification in flight is not touched; the request waits and runs under its token', async () => {
  const pool = auxPool();
  const h = setup({ pool });
  await openPack(h, answerFreeUnrated);
  const stamp = `${h.state().revision}:0`;
  const out = track(h.controller.submitAuxiliary('rate', rateInput));
  await settle(h);
  assert.deepEqual(pool.calls, [['begin', 1, stamp]], 'it waits while the verification runs');
  assert.equal(h.state().verificationByPuzzle[0].status, 'pending');
  pool.verify[0].resolve(await enginePool().run(pool.verify[0].task));
  await settle(h);
  assert.deepEqual(h.state().verificationByPuzzle[0], { status: 'solvable', basis: 'search' });
  assert.deepEqual(pool.calls, [['begin', 1, stamp], ['end', 1], ['idle', 1, stamp]]);
  assert.equal(out.state, 'pending');
  pool.idle[0].resolve({ rating: 'scripted' });
  await settle(h);
  assert.deepEqual([out.state, out.value], ['resolved', { rating: 'scripted' }]);
});

test('auxiliary request: another puzzle starts a verification and rejects a waiting request as cancelled', async () => {
  /** @param {boolean} withAux */
  const run = async (withAux) => {
    const pool = auxPool();
    const h = setup({ pool });
    await openPack(h, answerFreeUnrated);
    const aux = withAux ? track(h.controller.submitAuxiliary('rate', rateInput)) : null;
    await settle(h);
    h.controller.goToPuzzle(1);
    pool.verify[0].reject(new PoolAbortError('superseded'));
    await settle(h);
    return { h, pool, aux };
  };
  const plain = await run(false);
  const withAux = await run(true);
  assert.equal(withAux.aux?.state, 'rejected');
  assert.ok(withAux.aux?.error instanceof PoolAbortError);
  assert.equal(withAux.aux?.error.reason, 'cancelled');
  assert.deepEqual(withAux.h.state().verificationByPuzzle, plain.h.state().verificationByPuzzle);
  assert.equal(withAux.h.state().verificationByPuzzle[1].status, 'pending');
  assert.deepEqual(withAux.pool.calls, plain.pool.calls, 'the pool saw the same calls, and no auxiliary task');
  withAux.pool.verify[1].resolve(await enginePool().run(withAux.pool.verify[1].task));
  await settle(withAux.h);
  const later = track(withAux.h.controller.submitAuxiliary('rate', rateInput));
  await settle(withAux.h);
  assert.deepEqual(withAux.pool.calls.at(-1), ['idle', 2, `${withAux.h.state().revision}:1`], 'a later request runs under the last token');
  withAux.pool.idle[0].resolve({ rating: 'scripted' });
  await settle(withAux.h);
  assert.equal(later.state, 'resolved');
});

test('auxiliary request: after a verification that timed out it bootstraps a new token', async () => {
  const pool = auxPool();
  const h = setup({ pool });
  await openPack(h, answerFreeUnrated);
  pool.timeouts[0]();
  pool.verify[0].reject(new PoolAbortError('deadline'));
  await settle(h);
  assert.equal(h.state().verificationByPuzzle[0].status, 'not-verified');
  const out = track(h.controller.submitAuxiliary('rate', rateInput));
  await settle(h);
  assert.deepEqual(pool.calls.slice(2), [['begin', 2, 'aux-2'], ['end', 2], ['idle', 2, 'aux-2']]);
  pool.idle[0].resolve({ rating: 'scripted' });
  await settle(h);
  assert.equal(out.state, 'resolved');
});

test('auxiliary request: a pool that cannot begin a request or has no runIdle rejects it as worker-unavailable', async () => {
  const unavailable = new PoolError('worker-unavailable', 'no workers');
  const broken = setup({
    pool: { beginRequest() { throw unavailable; }, endRequest() {}, close() {}, run: () => Promise.reject(unavailable), runIdle: () => Promise.resolve({}) },
  });
  await openPack(broken, answerFree);
  assert.equal(broken.state().verificationByPuzzle[0].basis, 'unavailable');
  await assert.rejects(broken.controller.submitAuxiliary('rate', rateInput), (e) => e instanceof PoolError && e.code === 'worker-unavailable');
  const plain = setup({ pool: enginePool() });
  await openPack(plain, sample);
  await assert.rejects(plain.controller.submitAuxiliary('rate', rateInput), (e) => e instanceof PoolError && e.code === 'worker-unavailable');
});

test('auxiliary request: destroy rejects waiting and running requests as closed, and refuses new ones', async () => {
  const pool = auxPool();
  const h = setup({ pool });
  await openPack(h, answerFreeUnrated);
  const waiting = track(h.controller.submitAuxiliary('rate', rateInput));
  await settle(h);
  assert.equal(waiting.state, 'pending');
  h.controller.destroy();
  await settle(h);
  assert.deepEqual([waiting.state, waiting.error?.reason], ['rejected', 'closed']);
  assert.deepEqual(pool.calls.at(-1), ['close']);
  const later = track(h.controller.submitAuxiliary('rate', rateInput));
  await settle(h);
  assert.deepEqual([later.state, later.error?.reason], ['rejected', 'closed']);

  const idlePool = auxPool();
  const r = setup({ pool: idlePool });
  await openPack(r, sampleUnrated);
  const running = track(r.controller.submitAuxiliary('rate', rateInput));
  await settle(r);
  assert.equal(idlePool.idle.length, 1);
  r.controller.destroy();
  await settle(r);
  assert.deepEqual([running.state, running.error?.reason], ['rejected', 'closed']);
});

const V3_METRICS = {
  U: 7, R: 35, H: 3.5, B: 12, branchTrials: 12, rowTrials: 40, dlxStop: 'solution', searchStop: 'exhausted',
  F: 4, E: 0, rules: { R1: 3, R2: 1, R3: 0, R4: 2, R5: 0, R6: 0, R7: 0, R8: 58, R9: 0 }, deductionTier: 3, tier: 4,
  G: 2, info: 3.321928094887362, Cmax: 5, Dmax: 2, Gt: 2, nodes: 8, work: 123456, S: 1, solutionLimit: 8,
  solutions: 'unique', censusComplete: true, censusUndecided: 0, censusNodes: 0, censusWork: 0, Gproved: 2,
};

/** A scripted `difficulty-v3` rating as the worker's `rate` returns it; its level and score are the test's, not the engine's. */
const v3Rating = (/** @type {object} */ extra = {}) => ({ model: 'difficulty-v3', score: 14, level: 'normal', saturated: false, metrics: V3_METRICS, ...extra });

/** A v3 rating whose census did not finish. @param {number} undecided */
const v3Estimate = (undecided) => ({
  ...v3Rating({ censored: true }),
  metrics: {
    ...V3_METRICS, S: 8, searchStop: 'solution-limit', solutions: 'many', censusComplete: false, censusUndecided: undecided,
    nodes: 18, censusNodes: 10, censusWork: 5000, Gproved: 1,
  },
});

/**
 * The pack with the ratings of some puzzles replaced (`null` removes it, `undefined` keeps it).
 * @param {import('../core/engine/types.js').Pack} pack
 * @param {unknown[]} ratings
 * @returns {any}
 */
const withRatings = (pack, ratings) => ({ ...pack, puzzles: pack.puzzles.map((p, i) => ({ ...p, rating: ratings[i] === undefined ? p.rating : ratings[i] })) });

test('display rating: a v2 or v1 claim shows the derived v3 rating with the original in a note; the stored claim never changes', async () => {
  for (const model of ['difficulty-v2', 'difficulty-v1']) {
    const pool = auxPool();
    const h = setup({ pool });
    await openPack(h, withRatings(sample, sample.puzzles.map((p) => ({ ...p.rating, model }))));
    await settle(h);
    const pack = /** @type {any} */ (h.state().pack);
    const stored = structuredClone(pack.puzzles[0].rating);
    assert.equal(stored.model, model);
    assert.equal(pool.idle.length, 1, 'one request at a time');
    const { task } = pool.idle[0];
    assert.equal(task.kind, 'rate');
    assert.deepEqual(task.payload, { boardRows: pack.board.rows, pieces: pack.pieces, clues: pack.puzzles[0].clues }, 'the open puzzle first');
    assert.equal(validatePayload('rate', task.payload).ok, true, 'the worker accepts the payload');
    const key = displayRatingKey(h.state().fingerprints[0]);
    assert.deepEqual(h.state().displayRatings[key], { status: 'pending' });
    assert.deepEqual(displayRatingOf(h.state(), 0), { rating: stored, notes: [] }, 'a request not yet settled shows the claim alone');

    const reply = v3Rating();
    pool.idle[0].resolve(reply);
    await settle(h);
    assert.deepEqual(h.state().displayRatings[key], { status: 'rated', rating: reply });
    const shown = ratingDisplay(pack.puzzles[0].rating, h.state().displayRatings[key], { t, levelLabel });
    assert.equal(shown?.rating, reply);
    assert.deepEqual(shown?.notes, [`Re-rated with the current scale (original: Easy 8, ${model})`]);
    assert.deepEqual(displayRatingOf(h.state(), 0), shown);
    assert.equal(h.state().pack, pack, 'the pack is the one that was opened');
    assert.deepEqual(h.state().pack?.puzzles[0].rating, stored, 'the stored claim is untouched');
    assert.deepEqual([...(h.adapter?.map.keys() ?? [])], [], 'the derived rating is never saved');
    assert.equal(pool.idle.length, 2, 'the next puzzle is asked for');
    assert.deepEqual(pool.idle[1].task.payload.clues, pack.puzzles[1].clues);
  }
});

test('display rating: the rating line writes its notes after the rating and before the tail', () => {
  const doc = {
    createElement: (/** @type {string} */ tag) => ({
      tag,
      className: '',
      textContent: '',
      dataset: {},
      children: /** @type {any[]} */ ([]),
      append(/** @type {any[]} */ ...nodes) {
        this.children.push(...nodes);
      },
      setAttribute() {},
      addEventListener() {},
    }),
    createTextNode: (/** @type {string} */ text) => ({ text }),
  };
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { value: doc, configurable: true, writable: true });
  try {
    const target = /** @type {any} */ ({
      nodes: [],
      replaceChildren(/** @type {any[]} */ ...nodes) {
        this.nodes = nodes;
      },
    });
    const line = () => target.nodes.map((/** @type {any} */ node) => (typeof node === 'string' ? node : node.textContent)).join('');
    const rating = { model: 'difficulty-v3', score: 14, level: 'normal', saturated: false };
    assert.equal(setRating(target, rating, '3 pieces to place', ['Note one', 'Note two']), true);
    assert.equal(line(), 'Normal: score 14 · Note one · Note two · 3 pieces to place');
    assert.deepEqual(target.nodes.filter((/** @type {any} */ node) => typeof node !== 'string').map((/** @type {any} */ node) => [node.className, node.textContent]),
      [['rating-level', 'Normal'], ['rating-note', 'Note one'], ['rating-note', 'Note two']]);
    setRating(target, rating, '3 pieces to place');
    assert.equal(line(), 'Normal: score 14 · 3 pieces to place', 'as before without notes');
    setRating(target, rating);
    assert.equal(line(), 'Normal: score 14');
    assert.equal(setRating(target, undefined, 'tail'), true);
    assert.equal(line(), 'tail');
    assert.equal(setRating(target, undefined), false);
  } finally {
    if (saved === undefined) {
      Reflect.deleteProperty(globalThis, 'document');
    } else {
      Object.defineProperty(globalThis, 'document', saved);
    }
  }
});

test('display rating: a puzzle without a claim, or with a v3 claim, is never re-rated', async () => {
  const none = auxPool();
  const h = setup({ pool: none });
  await openPack(h, sampleUnrated);
  await settle(h);
  assert.deepEqual([none.idle.length, none.calls, h.state().displayRatings], [0, [], {}], 'no rate task is ever posted');
  assert.equal(displayRatingOf(h.state(), 0), null, 'no claim, no rating line');

  const pool = auxPool();
  const mixed = setup({ pool });
  await openPack(mixed, withRatings(sample, [undefined, null, v3Rating()]));
  await settle(mixed);
  assert.equal(pool.idle.length, 1, 'only the puzzle with an older claim');
  assert.deepEqual(pool.idle[0].task.payload.clues, mixed.state().pack?.puzzles[0].clues);
  pool.idle[0].resolve(v3Rating());
  await settle(mixed);
  assert.equal(pool.idle.length, 1, 'and nothing after it');
  assert.equal(Object.keys(mixed.state().displayRatings).length, 1);
});

test('display rating: a reply that arrives after the pack was replaced is dropped, and the request was aborted', async () => {
  const pool = auxPool();
  const h = setup({ pool });
  await openPack(h, sample);
  await settle(h);
  const oldKey = displayRatingKey(h.state().fingerprints[0]);
  const first = pool.idle[0];
  assert.equal(first.task.signal.aborted, false);
  await openPack(h, { ...sample, puzzles: [sample.puzzles[2], sample.puzzles[1]] });
  await settle(h);
  assert.equal(first.task.signal.aborted, true, 'aborted through its own signal');
  assert.equal(h.state().displayRatings[oldKey], undefined, 'its entry went with it');
  assert.equal(pool.idle.length, 2);
  assert.deepEqual(pool.idle[1].task.payload.clues, h.state().pack?.puzzles[0].clues, 'the open puzzle of the new pack is next');
  first.resolve(v3Rating());
  await settle(h);
  const newKey = displayRatingKey(h.state().fingerprints[0]);
  assert.deepEqual(Object.keys(h.state().displayRatings), [newKey], 'a late reply for the old key is dropped');
  assert.equal(h.state().displayRatings[newKey].status, 'pending');
  pool.idle[1].resolve(v3Rating({ score: 30 }));
  await settle(h);
  assert.equal(h.state().displayRatings[newKey].status, 'rated');
});

test('display rating: removing every puzzle stops the request but keeps the answers; destroy stops it too', async () => {
  const pool = auxPool();
  const h = setup({ pool });
  await openPack(h, sample);
  await settle(h);
  const key0 = displayRatingKey(h.state().fingerprints[0]);
  pool.idle[0].resolve(v3Rating());
  await settle(h);
  assert.equal(pool.idle.length, 2);
  h.controller.removeAllPuzzles();
  assert.equal(pool.idle[1].task.signal.aborted, true);
  assert.deepEqual(Object.keys(h.state().displayRatings), [key0], 'the answer stays, the pending entry goes');
  await openPack(h, sample);
  await settle(h);
  assert.equal(pool.idle.length, 3, 'the answered puzzle is not asked again');
  assert.deepEqual(pool.idle[2].task.payload.clues, h.state().pack?.puzzles[1].clues);
  assert.equal(displayRatingOf(h.state(), 0)?.notes.length, 1, 'and shows its derived rating at once');

  h.controller.destroy();
  assert.equal(pool.idle[2].task.signal.aborted, true);
  const shown = h.state().displayRatings;
  pool.idle[2].resolve(v3Rating());
  await settle(h);
  assert.equal(h.state().displayRatings, shown, 'nothing changes after destroy');
});

test('display rating: with no worker the puzzles keep their claims with "Could not be re-rated", and nothing fails', async () => {
  const missing = setup({ createPool: () => { throw new PoolError('worker-unavailable', 'no workers'); } });
  const noIdle = setup({ pool: enginePool() });
  for (const h of [missing, noIdle]) {
    await openPack(h, sample);
    await settle(h);
    assert.deepEqual(Object.values(h.state().displayRatings), [{ status: 'unavailable' }, { status: 'unavailable' }, { status: 'unavailable' }]);
    assert.equal(h.state().error, null);
    assert.equal(h.state().screen, 'game');
    for (const at of [0, 1, 2]) {
      assert.deepEqual(displayRatingOf(h.state(), at), { rating: h.state().pack?.puzzles[at].rating, notes: ['Could not be re-rated'] });
    }
    assert.equal(h.controller.goToPuzzle(1).ok, true);
    assert.equal(h.state().error, null);
  }
});

test('display rating: an unrateable puzzle keeps its claim with "Could not be re-rated"; the next one is still asked for', async () => {
  const pool = auxPool();
  const h = setup({ pool });
  await openPack(h, sample);
  await settle(h);
  pool.idle[0].reject(new WorkerTaskError('rating-incomplete', 'the first path was capped'));
  await settle(h);
  pool.idle[1].reject(new WorkerTaskError('unsatisfiable', 'no solution'));
  await settle(h);
  const keys = [0, 1, 2].map((at) => displayRatingKey(h.state().fingerprints[at]));
  assert.deepEqual(h.state().displayRatings[keys[0]], { status: 'failed', code: 'rating-incomplete' });
  assert.deepEqual(h.state().displayRatings[keys[1]], { status: 'failed', code: 'unsatisfiable' });
  for (const at of [0, 1]) {
    assert.deepEqual(displayRatingOf(h.state(), at), { rating: h.state().pack?.puzzles[at].rating, notes: ['Could not be re-rated'] });
  }
  assert.equal(h.state().error, null);
  assert.equal(pool.idle.length, 3);
  pool.idle[2].resolve(v3Rating());
  await settle(h);
  assert.equal(h.state().displayRatings[keys[2]].status, 'rated');
  h.controller.goToPuzzle(0);
  h.controller.goToPuzzle(1);
  await settle(h);
  assert.equal(pool.idle.length, 3, 'a failed puzzle is not asked for again');
});

test('display rating: re-rating never delays or cancels a verification; after a new one it is asked for again', async () => {
  const pool = auxPool();
  const h = setup({ pool });
  await openPack(h, answerFree);
  await settle(h);
  const stamp = `${h.state().revision}:0`;
  assert.deepEqual(pool.calls, [['begin', 1, stamp]], 'the verification began first, and the display request waits');
  assert.equal(pool.idle.length, 0);
  assert.equal(h.state().verificationByPuzzle[0].status, 'pending');
  pool.verify[0].resolve(await enginePool().run(pool.verify[0].task));
  await settle(h);
  assert.deepEqual(h.state().verificationByPuzzle[0], { status: 'solvable', basis: 'search' }, 'the result is applied unchanged');
  assert.deepEqual(pool.calls, [['begin', 1, stamp], ['end', 1], ['idle', 1, stamp]], 'then the display request runs');
  const key0 = displayRatingKey(h.state().fingerprints[0]);
  assert.equal(h.state().displayRatings[key0].status, 'pending');

  h.controller.goToPuzzle(1);
  assert.equal(h.state().verificationByPuzzle[1].status, 'pending');
  // The pool aborts idle work when a main request begins.
  pool.idle[0].reject(new PoolAbortError('preempted'));
  await settle(h);
  assert.equal(pool.idle.length, 1, 'the display request waits for the new verification');
  assert.equal(h.state().verificationByPuzzle[1].status, 'pending', 'the verification was not cancelled');
  assert.equal(h.state().displayRatings[key0].status, 'pending');
  pool.verify[1].resolve(await enginePool().run(pool.verify[1].task));
  await settle(h);
  assert.deepEqual(h.state().verificationByPuzzle[1], { status: 'solvable', basis: 'search' });
  assert.equal(pool.idle.length, 2, 'submitted again after the main request');
  assert.deepEqual(pool.idle[1].task.payload.clues, h.state().pack?.puzzles[0].clues, 'the same puzzle again');
  pool.idle[1].resolve(v3Rating());
  await settle(h);
  assert.equal(h.state().displayRatings[key0].status, 'rated');
  assert.equal(pool.idle.length, 3, 'then the next puzzle');
});

test('display rating: a v3 estimate is marked, with n when its metrics are known and without it for a code\'s summary claim', async () => {
  const summary = { model: 'difficulty-v3', score: 33, level: 'expert', saturated: false, censored: true };
  const pool = auxPool();
  const h = setup({ pool });
  await openPack(h, withRatings(sample, [v3Estimate(2), summary, v3Rating()]));
  await settle(h);
  assert.equal(pool.idle.length, 0, 'a v3 claim is not rated again');
  const pack = /** @type {any} */ (h.state().pack);
  const shown = [0, 1, 2].map((at) => displayRatingOf(h.state(), at));
  assert.deepEqual(shown.map((one) => one?.notes), [['Decisive estimate: 2 alternatives undecided within the work limit'], ['Decisive estimate'], []]);
  assert.deepEqual(shown.map((one) => one?.rating), pack.puzzles.map((/** @type {any} */ p) => p.rating), 'the claim itself is shown');
  assert.equal(shown[0]?.rating.saturated, false, 'an estimate never adds "+"');
  setLocale('vi', null);
  try {
    assert.deepEqual([0, 1].map((at) => displayRatingOf(h.state(), at)?.notes), [
      ['Ước lượng quyết định: 2 phương án chưa phân định trong giới hạn tính toán'], ['Ước lượng quyết định'],
    ]);
  } finally {
    setLocale('en', null);
  }
});

test('display rating: the code of a re-rated puzzle is the code of its stored claim', async () => {
  const pool = auxPool();
  const h = setup({ pool });
  await openPack(h, sample);
  await settle(h);
  const pack = /** @type {any} */ (h.state().pack);
  const snapshot = () => puzzleSnapshot({ rows: pack.board.rows, pieces: pack.pieces, puzzle: pack.puzzles[0], index: 0, rotation: 0 });
  const before = snapshot();
  pool.idle[0].resolve(v3Rating());
  await settle(h);
  assert.equal(h.state().displayRatings[displayRatingKey(h.state().fingerprints[0])].status, 'rated');
  const after = snapshot();
  assert.equal(after.key, before.key, 'the same code, whatever is shown');
  assert.equal(after.data.rating?.model, 'difficulty-v2');
  assert.deepEqual(after.data.rating, h.state().pack?.puzzles[0].rating);
});

test('display rating: a Player created on the sample or on a link asks for the open puzzle first, with no user action', async () => {
  const sampled = auxPool();
  const s = setup({ pool: sampled });
  await s.controller.openSample();
  await settle(s);
  assert.deepEqual(sampled.idle.map((one) => one.task.kind), ['rate']);
  assert.deepEqual(sampled.idle[0].task.payload.clues, s.state().pack?.puzzles[0].clues);

  const pool = auxPool();
  const h = setup({ hash: await listHash(sample, 1), codes: true, pool });
  await h.controller.start();
  await waitFor(() => pool.idle.length > 0);
  const pack = /** @type {any} */ (h.state().pack);
  assert.equal(h.state().index, 1);
  assert.equal(pack.puzzles[1].rating?.model, 'difficulty-v2');
  assert.deepEqual(pool.idle[0].task.payload.clues, pack.puzzles[1].clues, 'the puzzle on show first');
  pool.idle[0].resolve(v3Rating());
  await settle(h);
  assert.deepEqual(pool.idle[1].task.payload.clues, pack.puzzles[0].clues, 'then the others in the order of the pack');
  pool.idle[1].resolve(v3Rating());
  await settle(h);
  assert.deepEqual(pool.idle[2].task.payload.clues, pack.puzzles[2].clues);
});
