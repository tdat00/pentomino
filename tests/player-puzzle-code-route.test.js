// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { reduce } from '../core/engine/game.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { packBoard, parsePack } from '../core/engine/pack.js';
import { executeTask } from '../core/engine/tasks.js';
import { MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES, createWorkspace } from '../core/engine/workspace.js';
import { createPuzzleCodeClient } from '../core/browser/puzzle-code-client.js';
import { puzzleSnapshot } from '../core/browser/puzzle-snapshot.js';
import { PoolError, createPool } from '../core/browser/worker-pool.js';
import { createStorage } from '../core/browser/storage.js';
import { createPlayerController, createPlayerStore } from '../player/state.js';
import { nodeWorkerFactory } from '../tools/node-worker.mjs';

const root = new URL('../', import.meta.url);
const fixture = JSON.parse(readFileSync(new URL('tests/fixtures/puzzlecode-v1.json', root), 'utf8'));
const CODE = fixture.goldens[0].code;
const CORE = CODE.slice(0, CODE.indexOf('.'));
const parsed = parsePack(readFileSync(new URL('player/samples/sample-pack.json', root), 'utf8'));
assert.ok(parsed.ok);
const sample = parsed.value;
const sampleFingerprint = progressFingerprint(packBoard(sample), sample.pieces, sample.puzzles[0].clues);
/** @param {string} text @param {number} at */
const change = (text, at) => text.slice(0, at) + (text[at] === '0' ? '1' : '0') + text.slice(at + 1);
const GROUPED = CODE.toLowerCase().replace(/(.{4})/g, '$1-');

/** One real Node worker serves the whole file. */
const nodeFactory = nodeWorkerFactory();
const realClient = createPuzzleCodeClient({ createPool: () => /** @type {any} */ (createPool({ size: 1, workerFactory: nodeFactory })) });
after(() => realClient.dispose());

function memoryAdapter() {
  const map = new Map();
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

/** Verification pool: answers verifyPack with the real engine and records what it was asked. */
function enginePool() {
  return {
    calls: /** @type {any[]} */ ([]),
    began: /** @type {number[]} */ ([]),
    closed: 0,
    beginRequest(/** @type {{ requestId: number }} */ r) {
      this.began.push(r.requestId);
    },
    endRequest() {},
    close() {
      this.closed += 1;
    },
    async run(/** @type {{ kind: any, payload: any }} */ task) {
      this.calls.push(task);
      return structuredClone(executeTask(task.kind, task.payload, {
        main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES),
      }));
    },
  };
}

/**
 * @param {{ hash?: string, adapter?: ReturnType<typeof memoryAdapter>, client?: any, factory?: () => any, callback?: boolean }} [o]
 *   `callback: false` leaves `onPuzzleCodeFailure` unset.
 */
function setup(o = {}) {
  const adapter = o.adapter ?? memoryAdapter();
  const storage = createStorage(adapter, () => Date.parse('2026-01-01T00:00:00Z'));
  const location = { hash: o.hash ?? '', pathname: '/player/', search: '' };
  /** @type {string[]} */
  const urls = [];
  const history = {
    replaceState(/** @type {unknown} */ _s, /** @type {string} */ _t, /** @type {string} */ url) {
      urls.push(url);
      location.hash = url.startsWith('#') ? url : '';
    },
  };
  const verification = enginePool();
  const store = createPlayerStore({ prefs: storage.getPrefs() });
  /** @type {any[]} */
  const failures = [];
  const controller = createPlayerController({
    store,
    storage,
    location,
    history,
    baseUrl: 'http://localhost/player/',
    fetchText: async () => JSON.stringify(sample),
    createPool: () => verification,
    ...(o.factory === undefined ? { puzzleCodeClient: o.client ?? realClient } : { createPuzzleCodeClient: o.factory }),
    ...(o.callback === false ? {} : { onPuzzleCodeFailure: (/** @type {any} */ f) => failures.push(f) }),
  });
  return { adapter, storage, location, urls, store, controller, verification, failures, state: () => store.getState() };
}

/** Opens the three puzzles of `sample` as one pack, the way a `#p=` list opens them. @param {ReturnType<typeof setup>} h */
async function openSample(h) {
  const result = await h.controller.loadPuzzleCode((await sampleCodes()).join(';'));
  assert.ok(result.ok);
}

/** @param {ReturnType<typeof setup>} h */
function playOneMove(h) {
  const clued = new Set(sample.puzzles[0].clues.map((c) => c.piece));
  const pose = /** @type {import('../core/engine/types.js').Pose[]} */ (sample.puzzles[0].solution).find((p) => !clued.has(p.piece));
  assert.ok(pose);
  h.store.update((s) => ({ game: reduce(/** @type {any} */ (s.game), { type: 'place', pose }) }));
}

/** @param {() => boolean} ready */
async function waitFor(ready) {
  for (let i = 0; i < 400 && !ready(); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(ready(), 'the condition never came true');
}

test('#p= with a full code opens one puzzle with its stored answer and keeps the address exactly', async () => {
  const h = setup({ hash: `#p=${GROUPED}` });
  const before = h.location.hash;
  const result = await h.controller.start();
  assert.equal(/** @type {any} */ (result).ok, true);
  const s = h.state();
  assert.equal(s.screen, 'game');
  assert.equal(s.index, 0);
  assert.equal(s.pack?.puzzles.length, 1);
  assert.equal(s.source, 'hash');
  assert.deepEqual(s.fingerprints, [sampleFingerprint], 'progress identity is the fingerprint of the same board, pieces and clues');
  assert.ok(s.pack?.puzzles[0].solution, 'the stored answer came with the code');
  assert.deepEqual(h.urls, [], 'normal loading never rewrites the address');
  assert.equal(h.location.hash, before, 'not lower-cased, grouped, normalized or given &i=0');
  assert.deepEqual(s.verificationByPuzzle[0], { status: 'solvable', basis: 'solution' }, 'the stored-answer fast path');
  assert.equal(h.verification.began.length, 0, 'no verification request was needed');
  assert.deepEqual(h.failures, []);
  assert.equal(s.error, null);
});

test('#p= with a core opens the same puzzle without an answer and verifies it through the existing verification pool only', async () => {
  const h = setup({ hash: `#p=${CORE}` });
  assert.equal(/** @type {any} */ (await h.controller.start()).ok, true);
  const s = h.state();
  assert.equal(s.pack?.puzzles[0].solution ?? null, null);
  assert.deepEqual(s.fingerprints, [sampleFingerprint]);
  assert.deepEqual(h.urls, []);
  await waitFor(() => h.state().verificationByPuzzle[0]?.status === 'solvable');
  assert.equal(h.state().verificationByPuzzle[0].basis, 'search');
  assert.deepEqual(h.verification.calls.map((c) => c.kind), ['verifyPack'], 'code operations never use the verification pool');
  assert.equal(h.verification.began.length, 1);
});

test('#p=C&i=0 keeps its whole address, reload reopens the same pack, and puzzle navigation does not rewrite it', async () => {
  const hash = `#p=${CODE}&i=0`;
  const h = setup({ hash });
  assert.equal(/** @type {any} */ (await h.controller.start()).ok, true);
  assert.equal(h.location.hash, hash);
  assert.deepEqual(h.urls, []);
  assert.equal(h.controller.goToPuzzle(0).ok, true);
  assert.equal(h.controller.nextPuzzle().ok, false);
  assert.deepEqual(h.urls, [], 'no &i appended on any path');
  const reload = setup({ hash, adapter: h.adapter });
  await reload.controller.start();
  assert.deepEqual(reload.state().pack, h.state().pack, 'the same one-puzzle pack, without any seed or generation');
  assert.deepEqual(reload.urls, []);
});

/** The codes of the three puzzles of the sample, as Print and Play make them. */
async function sampleCodes() {
  /** @type {string[]} */
  const codes = [];
  for (const [index, puzzle] of sample.puzzles.entries()) {
    const snapshot = puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle, index, rotation: sample.presentation?.rotation ?? 0 });
    const encoded = await realClient.encode(snapshot.data);
    assert.ok(encoded.ok);
    codes.push(encoded.value.F);
  }
  return codes;
}

test('#p= with several codes opens them as one pack at the puzzle named by i, and the address follows the open puzzle', async () => {
  const codes = await sampleCodes();
  const hash = `#p=${codes.join(';')}&i=1`;
  const h = setup({ hash });
  assert.equal(/** @type {any} */ (await h.controller.start()).ok, true);
  const s = h.state();
  assert.equal(s.screen, 'game');
  assert.equal(s.pack?.puzzles.length, 3);
  assert.equal(s.index, 1);
  assert.equal(s.source, 'hash');
  assert.deepEqual(s.fingerprints, sample.puzzles.map((p) => progressFingerprint(packBoard(sample), sample.pieces, p.clues)), 'every puzzle is the one that was sent');
  assert.ok(s.pack?.puzzles.every((p) => p.solution), 'the stored answers came with the codes');
  assert.deepEqual(h.urls, [], 'opening never rewrites the address');
  assert.equal(h.controller.goToPuzzle(2).ok, true);
  assert.deepEqual(h.urls, [`#p=${codes.join(';')}&i=2`], 'the number of the open puzzle follows, the codes stay');
  assert.equal(h.controller.nextPuzzle().ok, false);
  assert.equal(h.controller.goToPuzzle(0).ok, true);
  assert.equal(h.location.hash, `#p=${codes.join(';')}&i=0`);
  const reload = setup({ hash: `#p=${codes.join(';')}&i=2`, adapter: h.adapter });
  await reload.controller.start();
  assert.equal(reload.state().index, 2, 'a reload reopens the same puzzle of the same pack');
  assert.equal(reload.state().pack?.puzzles.length, 3);
});

test('a list without i opens its first puzzle and the address is left exactly as it came', async () => {
  const codes = await sampleCodes();
  const hash = `#p=${codes.join(';')}`;
  const h = setup({ hash });
  assert.equal(/** @type {any} */ (await h.controller.start()).ok, true);
  assert.equal(h.state().index, 0);
  assert.deepEqual(h.urls, [], 'no &i=0 is added');
  assert.equal(h.location.hash, hash);
  assert.equal(h.controller.goToPuzzle(1).ok, true);
  assert.equal(h.location.hash, `${hash}&i=1`);
});

test('one code of an address with several is never rewritten, as before', async () => {
  const [first] = await sampleCodes();
  const h = setup({ hash: `#p=${first};` });
  assert.equal(/** @type {any} */ (await h.controller.start()).ok, true);
  assert.equal(h.state().pack?.puzzles.length, 1);
  assert.equal(h.controller.nextPuzzle().ok, false);
  assert.deepEqual(h.urls, []);
});

test('an address whose second code is wrong changes nothing and names the puzzle', async () => {
  const [first, second] = await sampleCodes();
  const h = setup();
  await openSample(h);
  const before = h.state();
  const broken = change(second, 5);
  const result = await h.controller.openHash(`#p=${first};${broken}`);
  assert.equal(/** @type {any} */ (result).ok, false);
  assert.equal(h.state().pack, before.pack, 'the open game stays');
  assert.equal(h.failures.length, 1);
  assert.deepEqual(h.failures[0].failure.issues.map((/** @type {any} */ i) => [i.code, i.path]), [['core-check', '$.p[1]']]);
  assert.equal(h.failures[0].failure.recovery, undefined);
  const outOfRange = await h.controller.openHash(`#p=${first};${second}&i=2`);
  assert.equal(/** @type {any} */ (outOfRange).ok, false);
  assert.equal(h.failures.at(-1).failure.issues[0].code, 'index');
});

test('loadPuzzleCode opens a typed list, and commitAddress makes the normalized codes and the puzzle number the address', async () => {
  const codes = await sampleCodes();
  const h = setup();
  const typed = `${codes[0].toLowerCase()}; ${codes[1].replace(/(.{4})/g, '$1-')}`;
  const result = await h.controller.loadPuzzleCode(typed, { commitAddress: true });
  assert.equal(/** @type {any} */ (result).ok, true);
  assert.equal(h.state().pack?.puzzles.length, 2);
  assert.equal(h.state().index, 0);
  assert.equal(h.location.hash, `#p=${codes[0]};${codes[1].replace(/-/g, '')}`);
  const link = await h.controller.loadPuzzleCode(`https://example.test/player/#p=${codes.join(';')}&i=2`, { commitAddress: true });
  assert.equal(/** @type {any} */ (link).ok, true);
  assert.equal(h.state().index, 2);
  assert.equal(h.location.hash, `#p=${codes.join(';')}&i=2`);
});

test('a code with saved progress for its fingerprint restores it through the existing commit path', async () => {
  const adapter = memoryAdapter();
  const first = setup({ adapter });
  await openSample(first);
  playOneMove(first);
  first.controller.saveNow();
  assert.equal(first.state().game?.placed.size, 1);
  for (const hash of [`#p=${CODE}`, `#p=${CORE}`]) {
    const reload = setup({ hash, adapter });
    await reload.controller.start();
    assert.equal(reload.state().game?.placed.size, 1, hash);
    assert.equal(reload.state().notice, null, hash);
    assert.equal(reload.state().statuses[0], 'in-progress');
  }
});

test('a bad link while a game is open changes nothing and is handed to the failure callback with the code entry\'s names', async () => {
  const h = setup();
  await openSample(h);
  playOneMove(h);
  const before = h.state();
  const urlsBefore = h.urls.length;
  const hashBefore = h.location.hash;
  /** @type {[string, string][]} */
  const cases = [
    [`#p=${change(CODE, 5)}`, 'core-check'],
    [`#p=${CODE}&i=1`, 'index'],
    [`#p=${CODE}&i=-1`, 'invalid'],
    [`#p=${CODE}&i=x`, 'invalid'],
    [`#p=${CODE}&p=${CODE}`, 'invalid'],
    [`#p=${CODE}&pack=1j.abc`, 'invalid'],
    [`#p=${CODE}&lib=0123456789abcdef`, 'invalid'],
    ['#p=', 'invalid'],
    ['#p=1D0J+492G', 'bad-char'],
    [`#p=${CODE.slice(0, 12)}`, 'core-check'],
  ];
  for (const [hash, code] of cases) {
    const result = await h.controller.openHash(hash);
    assert.equal(result.ok, false, hash);
    assert.equal(/** @type {any} */ (result).issues[0].code, code, hash);
    const s = h.state();
    assert.equal(s.pack, before.pack, hash);
    assert.equal(s.game, before.game, `${hash}: moves, timer and placements are the very same game`);
    assert.equal(s.index, before.index);
    assert.equal(s.error, null, `${hash}: the callback replaces the generic error`);
    assert.equal(s.loading, false);
    assert.equal(h.failures.at(-1).text, hash);
    assert.equal(h.failures.at(-1).failure.issues[0].code, code, hash);
  }
  assert.equal(h.failures.length, cases.length);
  assert.equal(h.urls.length, urlsBefore, 'the address was not touched');
  assert.equal(h.location.hash, hashBefore);
  assert.equal(h.storage.loadProgress(/** @type {string} */ (before.fingerprints[0])), null, 'a failed load saves and removes nothing');
  assert.equal(h.failures[0].failure.candidate.correctedCode, CODE);
  assert.equal(h.failures[0].failure.candidate.normalizedCode, change(CODE, 5));
});

test('without a failure callback a bad #p= link is the store error; #pack= and #lib= are not routes any more', async () => {
  const h = setup({ callback: false });
  const bad = await h.controller.openHash(`#p=${change(CODE, 5)}`);
  assert.equal(bad.ok, false);
  assert.equal(h.state().error?.code, 'core-check');
  assert.ok(h.state().error?.message);
  assert.equal(h.state().pack, null);
  await h.controller.openHash(`#p=${CODE}&i=1`);
  assert.equal(h.state().error?.code, 'index');
  const old = setup();
  for (const hash of ['#pack=1z.AAAA', '#lib=0123456789abcdef&i=0']) {
    const result = await old.controller.openHash(hash);
    assert.equal(result.ok, false, hash);
    assert.equal(old.state().pack, null, hash);
    assert.equal(old.state().screen, 'start', hash);
  }
  assert.deepEqual(old.failures, [], 'they never reach the puzzle-code callback');
});

test('a damaged tail offers the validated core as recovery data but opens nothing', async () => {
  const bad = change(CODE, CODE.length - 1);
  const h = setup({ hash: `#p=${bad}` });
  await h.controller.start();
  assert.equal(h.failures.length, 1);
  const { failure, text } = h.failures[0];
  assert.equal(text, `#p=${bad}`);
  assert.equal(failure.issues[0].code, 'tail-check');
  assert.equal(failure.recovery.kind, 'core-only');
  assert.equal(failure.recovery.pack.puzzles.length, 1);
  assert.equal(failure.recovery.pack.puzzles[0].solution ?? null, null);
  assert.equal(failure.candidate.correctedCode, CODE);
  assert.equal(h.state().pack, null, 'nothing opened automatically');
  assert.equal(h.state().screen, 'start');
  assert.deepEqual(h.urls, []);
  assert.equal(h.verification.began.length, 0);
});

test('without module workers a #p= link fails as worker-unavailable while the sample still opens', async () => {
  const none = createPuzzleCodeClient({
    createPool: () => /** @type {any} */ (createPool({ size: 1, workerFactory: () => { throw new PoolError('worker-unavailable', 'no workers'); } })),
  });
  const h = setup({ client: none });
  await h.controller.openHash(`#p=${CODE}`);
  assert.equal(h.failures[0].failure.issues[0].code, 'worker-unavailable');
  assert.equal(h.state().pack, null);
  assert.equal((await h.controller.openSample()).ok, true);
  assert.equal(h.state().pack?.puzzles.length, sample.puzzles.length, 'the sample file does not need a worker');
  assert.deepEqual(h.urls, [], 'and without codes it gets no address');
  none.dispose();
});

test('loadPuzzleCode opens typed text atomically; commitAddress makes the normalized code the address, without &i', async () => {
  const kept = setup();
  const quiet = await kept.controller.loadPuzzleCode(` ${GROUPED}\n`);
  assert.equal(quiet.ok, true);
  assert.deepEqual(kept.urls, [], 'the address is only touched when asked');
  assert.equal(kept.state().pack?.puzzles.length, 1);

  const h = setup();
  const result = await h.controller.loadPuzzleCode(` ${GROUPED}\n`, { commitAddress: true });
  assert.equal(result.ok, true);
  assert.ok(result.ok && result.value.index === 0 && result.value.pack.puzzles.length === 1);
  assert.deepEqual(h.urls, [`#p=${CODE}`]);
  assert.equal(h.location.hash, `#p=${CODE}`);
  assert.equal(h.state().source, 'hash');
  assert.deepEqual(h.state().fingerprints, [sampleFingerprint]);
  assert.equal(h.controller.goToPuzzle(0).ok, true);
  assert.deepEqual(h.urls, [`#p=${CODE}`], 'and it is not rewritten afterwards');

  const link = setup();
  const pasted = await link.controller.loadPuzzleCode(`https://tdat00.github.io/pentomino/player/#p=${CORE}&utm=x`, { commitAddress: true });
  assert.equal(pasted.ok, true);
  assert.deepEqual(link.urls, [`#p=${CORE}`]);
});

test('loadPuzzleCode restores saved progress and, on failure, leaves game, progress, address and error alone', async () => {
  const adapter = memoryAdapter();
  const first = setup({ adapter });
  await openSample(first);
  playOneMove(first);
  first.controller.saveNow();

  const h = setup({ adapter });
  const typed = change(CODE, 5);
  await openSample(h);
  playOneMove(h);
  h.controller.saveNow();
  const open = h.state();
  const urls = h.urls.length;
  const failed = await h.controller.loadPuzzleCode(typed, { commitAddress: true });
  assert.equal(failed.ok, false);
  assert.ok(!failed.ok && failed.issues[0].code === 'core-check');
  assert.equal(!failed.ok && failed.candidate?.correctedCode, CODE, 'the candidate is returned, never applied');
  assert.equal(h.state().game, open.game);
  assert.equal(h.state().pack, open.pack);
  assert.equal(h.state().error, null);
  assert.equal(h.state().loading, false);
  assert.equal(h.urls.length, urls);
  const index = await h.controller.loadPuzzleCode(`#p=${CODE}&i=1`, { commitAddress: true });
  assert.ok(!index.ok && index.issues[0].code === 'index');
  assert.equal(h.urls.length, urls);

  const ok = await h.controller.loadPuzzleCode(CODE, { commitAddress: true });
  assert.equal(ok.ok, true);
  assert.equal(h.state().game?.placed.size, 1, 'the saved moves of the same fingerprint came back');
  assert.equal(h.state().pack?.puzzles.length, 1);
  assert.equal(h.urls.at(-1), `#p=${CODE}`);
});

/** A client whose decodes the test settles by hand. */
function manualClient() {
  /** @type {((v: unknown) => void)[]} */
  const resolvers = [];
  const counts = { cancel: 0, dispose: 0 };
  return {
    resolvers,
    counts,
    client: {
      decode: () => new Promise((resolve) => {
        resolvers.push(resolve);
      }),
      encode: async () => assert.fail('not used'),
      repair: async () => assert.fail('not used'),
      cancel: () => void (counts.cancel += 1),
      dispose: () => void (counts.dispose += 1),
    },
  };
}
const decodedOk = () => ({ ok: true, value: { pack: { ...sample, puzzles: [sample.puzzles[0]] }, hasTail: true, tailError: null, code: CODE }, warnings: [] });

test('cancelPuzzleCodeLoad moves the revision on first, so a late success cannot commit', async () => {
  const m = manualClient();
  const h = setup({ client: m.client });
  const entry = h.controller.loadPuzzleCode(CODE, { commitAddress: true });
  await waitFor(() => m.resolvers.length === 1);
  assert.equal(h.state().loading, true);
  h.controller.cancelPuzzleCodeLoad();
  assert.equal(m.counts.cancel, 1);
  assert.equal(h.state().loading, false);
  m.resolvers[0](decodedOk());
  const result = await entry;
  assert.ok(!result.ok && result.issues[0].code === 'cancelled');
  assert.equal(h.state().pack, null);
  assert.deepEqual(h.urls, []);

  const started = h.controller.openHash(`#p=${CODE}`);
  await waitFor(() => m.resolvers.length === 2);
  h.controller.cancelPuzzleCodeLoad();
  m.resolvers[1](decodedOk());
  assert.deepEqual(await started, { ok: false, stale: true });
  assert.equal(h.state().pack, null);
  assert.deepEqual(h.failures, []);
});

test('a newer load supersedes a pending code load; cancel does not touch a finished or unrelated state', async () => {
  const m = manualClient();
  const h = setup({ client: m.client });
  const first = h.controller.loadPuzzleCode(CODE);
  await waitFor(() => m.resolvers.length === 1);
  const second = h.controller.loadPuzzleCode(CORE, { commitAddress: true });
  await waitFor(() => m.resolvers.length === 2);
  m.resolvers[1](decodedOk());
  m.resolvers[0](decodedOk());
  assert.ok((await second).ok);
  const stale = await first;
  assert.ok(!stale.ok && stale.issues[0].code === 'cancelled');
  assert.deepEqual(h.urls, [`#p=${CORE}`]);
  const open = h.state();
  h.controller.cancelPuzzleCodeLoad();
  assert.equal(h.state().pack, open.pack, 'nothing was in flight');
  assert.equal(h.state().screen, 'game');
});

test('the controller disposes only a client it made; an injected one is cancelled, never disposed', () => {
  const injected = manualClient();
  const a = setup({ client: injected.client });
  void a.controller.openHash(`#p=${CODE}`);
  a.controller.destroy();
  assert.deepEqual(injected.counts, { cancel: 1, dispose: 0 });

  const made = manualClient();
  const b = setup({ factory: () => made.client });
  void b.controller.openHash(`#p=${CODE}`);
  b.controller.destroy();
  assert.deepEqual(made.counts, { cancel: 1, dispose: 1 });

  const idle = setup({ factory: () => assert.fail('no client before the first code operation') });
  idle.controller.destroy();
});

test('code operations use the controller\'s own client: the verification pool is neither used, cancelled nor closed by them', async () => {
  const h = setup();
  await h.controller.loadPuzzleCode(CODE, { commitAddress: true });
  await h.controller.loadPuzzleCode(change(CODE, 5));
  h.controller.cancelPuzzleCodeLoad();
  assert.equal(h.verification.began.length, 0);
  assert.equal(h.verification.calls.length, 0);
  assert.equal(h.verification.closed, 0);
});
