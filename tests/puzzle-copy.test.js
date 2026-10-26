// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { createPuzzleCopyAction } from '../core/browser/puzzle-copy.js';
import { preparePuzzleShare, puzzlePlayerTarget, puzzleSnapshot } from '../core/browser/puzzle-snapshot.js';
import { PoolAbortError } from '../core/browser/worker-pool.js';
import { MAX_URL_CHARS, WARN_URL_CHARS } from '../core/engine/sharecode.js';

const PUBLIC = 'https://tdat00.github.io/pentomino/player/';
const PREFIX = `${PUBLIC}#p=`;
const CORE = '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR';
const TAIL = '18V3WE';

/** @template T */
function deferred() {
  /** @type {(value: T) => void} */
  let resolve = () => {};
  /** @type {(reason?: unknown) => void} */
  let reject = () => {};
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}

/** Lets every settled promise run its callbacks; no timers are involved. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

/** @param {string} key A stand-in for a snapshot: only its key is compared. */
const snap = (key) => /** @type {any} */ ({ data: { key }, heading: key, key });

/**
 * @param {string} url
 * @param {Record<string, unknown>} [over]
 * @returns {any}
 */
const prepared = (url, over = {}) => ({
  code: { C: CORE, T: TAIL, F: `${CORE}.${TAIL}`, version: 1 }, url, carried: 'C.T', qr: { version: 5 }, notices: [], ...over,
});

/** A URL of exactly `length` characters. */
const urlOfLength = (length) => PREFIX + 'A'.repeat(length - PREFIX.length);

/**
 * @param {{ selected?: any, prepare?: (s: any, target: string) => Promise<any>,
 *   writeClipboard?: (text: string) => Promise<boolean> }} [over]
 */
function rig(over = {}) {
  let selected = over.selected === undefined ? snap('A') : over.selected;
  const log = {
    /** @type {Array<[string, string]>} */
    prepared: [],
    /** @type {string[]} */
    writes: [],
    /** @type {Array<string | [string, unknown]>} */
    notes: [],
    /** @type {string[]} */
    manual: [],
    /** @type {boolean[]} */
    busy: [],
  };
  const action = createPuzzleCopyAction({
    getSnapshot: () => selected,
    getTarget: () => PUBLIC,
    prepare: over.prepare ?? (async (s, target) => {
      log.prepared.push([s.key, target]);
      return prepared(`${PREFIX}${CORE}.${TAIL}`);
    }),
    writeClipboard: over.writeClipboard ?? (async (text) => {
      log.writes.push(text);
      return true;
    }),
    showManualCopy: (url) => void log.manual.push(url),
    notify: (key, params) => void log.notes.push(params === undefined ? key : [key, params]),
    setBusy: (busy) => void log.busy.push(busy),
  });
  return { log, action, select: (/** @type {any} */ next) => { selected = next; } };
}

describe('createPuzzleCopyAction', () => {
  test('without a selected puzzle nothing is prepared, written or announced and the control never turns busy', async () => {
    const r = rig({ selected: null });
    await r.action.copy();
    assert.deepEqual(r.log, { prepared: [], writes: [], notes: [], manual: [], busy: [] });
  });

  test('an ordinary link is prepared for the default target and copied exactly once, then announced', async () => {
    const r = rig();
    await r.action.copy();
    assert.deepEqual(r.log.prepared, [['A', PUBLIC]]);
    assert.deepEqual(r.log.writes, [`${PREFIX}${CORE}.${TAIL}`]);
    assert.deepEqual(r.log.notes, ['code.copied']);
    assert.deepEqual(r.log.busy, [true, false]);
    assert.deepEqual(r.log.manual, []);
  });

  test('a link whose tail was left out by the policy copies the core address, never a richer one', async () => {
    const core = `${PREFIX}${CORE}`;
    const r = rig({
      prepare: async () => prepared(core, { code: { C: CORE, T: null, F: CORE, version: 1 }, carried: 'C', notices: ['noTail'] }),
    });
    await r.action.copy();
    assert.deepEqual(r.log.writes, [core]);
    assert.ok(!r.log.writes[0].includes(TAIL));
  });

  test('a puzzle without a QR code still copies its address, with the advisory instead of the plain message', async () => {
    const r = rig({ prepare: async () => prepared(`${PREFIX}${CORE}`, { qr: null, carried: 'C', notices: ['none'] }) });
    await r.action.copy();
    assert.deepEqual(r.log.writes, [`${PREFIX}${CORE}`]);
    assert.deepEqual(r.log.notes, ['code.copyNoQr']);
  });

  test('no address means no clipboard call and the too-large message', async () => {
    const r = rig({ prepare: async () => prepared(null, { qr: null }) });
    await r.action.copy();
    assert.deepEqual(r.log.writes, []);
    assert.deepEqual(r.log.manual, []);
    assert.deepEqual(r.log.notes, ['code.copyTooLong']);
    assert.deepEqual(r.log.busy, [true, false]);
  });

  test('the warning starts above 4,000 characters and the refusal above 16,000', async () => {
    /** @type {Array<[number, Array<string | [string, unknown]>, number]>} */
    const cases = [
      [WARN_URL_CHARS, ['code.copied'], 1],
      [WARN_URL_CHARS + 1, ['code.copied', ['code.copyLong', { count: WARN_URL_CHARS + 1 }]], 1],
      [MAX_URL_CHARS, ['code.copied', ['code.copyLong', { count: MAX_URL_CHARS }]], 1],
      [MAX_URL_CHARS + 1, ['code.copyTooLong'], 0],
    ];
    for (const [length, notes, writes] of cases) {
      const url = urlOfLength(length);
      const r = rig({ prepare: async () => prepared(url) });
      await r.action.copy();
      assert.deepEqual(r.log.notes, notes, `${length} characters`);
      assert.deepEqual(r.log.writes, writes === 1 ? [url] : [], `${length} characters`);
    }
  });

  test('a refused clipboard shows the exact address in the manual field and never says "copied"', async () => {
    for (const writeClipboard of [async () => false, async () => { throw new Error('denied'); }]) {
      const r = rig({ writeClipboard });
      await r.action.copy();
      assert.deepEqual(r.log.manual, [`${PREFIX}${CORE}.${TAIL}`]);
      assert.deepEqual(r.log.notes, ['code.copyFailed']);
      assert.deepEqual(r.log.busy, [true, false]);
    }
  });

  test('a long address that the clipboard refuses still carries the long-link warning', async () => {
    const url = urlOfLength(WARN_URL_CHARS + 10);
    const r = rig({ prepare: async () => prepared(url), writeClipboard: async () => false });
    await r.action.copy();
    assert.deepEqual(r.log.manual, [url]);
    assert.deepEqual(r.log.notes, ['code.copyFailed', ['code.copyLong', { count: WARN_URL_CHARS + 10 }]]);
  });

  test('a puzzle selected before the preparation ends suppresses the older result', async () => {
    const pending = deferred();
    const r = rig({ prepare: () => pending.promise });
    const run = r.action.copy();
    r.select(snap('B'));
    pending.resolve(prepared(`${PREFIX}${CORE}`));
    await run;
    assert.deepEqual([r.log.writes, r.log.notes, r.log.manual, r.log.busy], [[], [], [], [true, false]]);
  });

  test('the same puzzle selected again keeps its result; no selection at all suppresses it', async () => {
    const same = deferred();
    const r = rig({ prepare: () => same.promise });
    const run = r.action.copy();
    r.select(snap('A'));
    same.resolve(prepared(`${PREFIX}${CORE}`));
    await run;
    assert.deepEqual(r.log.writes, [`${PREFIX}${CORE}`]);
    const gone = deferred();
    const g = rig({ prepare: () => gone.promise });
    const second = g.action.copy();
    g.select(null);
    gone.resolve(prepared(`${PREFIX}${CORE}`));
    await second;
    assert.deepEqual([g.log.writes, g.log.notes], [[], []]);
  });

  test('a newer click wins: the older answer is ignored and the busy state ends only with the newest', async () => {
    const answers = [deferred(), deferred()];
    let taken = 0;
    const r = rig({ prepare: () => answers[taken++].promise });
    const older = r.action.copy();
    const newer = r.action.copy();
    answers[0].resolve(prepared(`${PREFIX}OLD`));
    await older;
    assert.deepEqual(r.log.writes, []);
    assert.deepEqual(r.log.notes, []);
    assert.deepEqual(r.log.busy, [true, true], 'the older operation does not end the newer one\'s busy state');
    answers[1].resolve(prepared(`${PREFIX}NEW`));
    await newer;
    assert.deepEqual(r.log.writes, [`${PREFIX}NEW`]);
    assert.deepEqual(r.log.notes, ['code.copied']);
    assert.deepEqual(r.log.busy, [true, true, false]);
  });

  test('the answer of an older click that was superseded by the worker client is not an error', async () => {
    const answers = [deferred(), deferred()];
    let taken = 0;
    const r = rig({ prepare: () => answers[taken++].promise });
    const older = r.action.copy();
    const newer = r.action.copy();
    answers[0].reject(new PoolAbortError('superseded'));
    answers[1].resolve(prepared(`${PREFIX}NEW`));
    await Promise.all([older, newer]);
    assert.deepEqual(r.log.notes, ['code.copied']);
  });

  test('cancel before the answer drops it: nothing is written or announced and the busy state ends at once', async () => {
    const pending = deferred();
    const r = rig({ prepare: () => pending.promise });
    const run = r.action.copy();
    r.action.cancel();
    assert.deepEqual(r.log.busy, [true, false]);
    pending.resolve(prepared(`${PREFIX}${CORE}`));
    await run;
    assert.deepEqual([r.log.writes, r.log.notes, r.log.manual, r.log.busy], [[], [], [], [true, false]]);
    await r.action.copy();
    assert.deepEqual(r.log.writes, [`${PREFIX}${CORE}`], 'the action works again after a cancel');
  });

  test('dispose drops the answer and ends the action for good', async () => {
    const pending = deferred();
    const r = rig({ prepare: () => pending.promise });
    const run = r.action.copy();
    r.action.dispose();
    pending.resolve(prepared(`${PREFIX}${CORE}`));
    await run;
    assert.deepEqual([r.log.writes, r.log.notes, r.log.busy], [[], [], [true, false]]);
    await r.action.copy();
    r.action.dispose();
    assert.equal(r.log.prepared.length, 0);
    assert.deepEqual(r.log.busy, [true, false]);
  });

  test('a source change after the clipboard write started announces nothing and shows no field', async () => {
    for (const result of [true, false]) {
      const write = deferred();
      const r = rig({ writeClipboard: (text) => { r.log.writes.push(text); return write.promise; } });
      const run = r.action.copy();
      await flush();
      assert.equal(r.log.writes.length, 1, 'the write has started');
      r.select(snap('B'));
      write.resolve(result);
      await run;
      assert.deepEqual([r.log.notes, r.log.manual], [[], []], `write result ${result}`);
      assert.deepEqual(r.log.busy, [true, false]);
    }
  });

  test('a failing preparation is announced once and never rejects; an abort is not', async () => {
    const failing = rig({ prepare: async () => { throw new Error('worker'); } });
    await failing.action.copy();
    assert.deepEqual(failing.log.notes, ['print.code.error']);
    assert.deepEqual(failing.log.busy, [true, false]);
    const aborted = rig({ prepare: async () => { throw new PoolAbortError('closed'); } });
    await aborted.action.copy();
    assert.deepEqual(aborted.log.notes, []);
    const throwing = createPuzzleCopyAction({
      getSnapshot: () => snap('A'),
      getTarget: () => { throw new Error('no target'); },
      prepare: async () => prepared(null),
      writeClipboard: async () => true,
      showManualCopy: () => {},
      notify: () => { throw new Error('no toast'); },
      setBusy: () => {},
    });
    await throwing.copy();
  });
});

describe('the copied address is the one that Print carries', () => {
  const sample = JSON.parse(readFileSync(new URL('../player/samples/sample-pack.json', import.meta.url), 'utf8'));
  const snapshot = puzzleSnapshot({
    rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[1], index: 1, rotation: 45, untitled: (n) => `Puzzle #${n}`,
  });
  const client = { encode: async () => ({ ok: /** @type {const} */ (true), value: { C: CORE, T: TAIL, F: `${CORE}.${TAIL}`, version: /** @type {const} */ (1) }, warnings: [] }) };

  for (const [name, page, expected] of /** @type {const} */ ([
    ['a fork on the public web', 'https://Example.org/My-Fork/pentomino/generator/', 'https://example.org/My-Fork/pentomino/player/'],
    ['a local page', 'http://localhost:8080/pentomino/generator/', 'http://localhost:8080/pentomino/player/'],
    ['a file page', 'file:///C:/pentomino/player/index.html', 'file:///C:/pentomino/player/'],
  ])) {
    test(name, async () => {
      const target = puzzlePlayerTarget(page);
      const printed = await preparePuzzleShare(snapshot, { target, client });
      const copied = /** @type {string[]} */ ([]);
      const action = createPuzzleCopyAction({
        getSnapshot: () => snapshot,
        getTarget: () => puzzlePlayerTarget(page),
        prepare: (s, to) => preparePuzzleShare(s, { target: to, client }),
        writeClipboard: async (text) => { copied.push(text); return true; },
        showManualCopy: () => {},
        notify: () => {},
        setBusy: () => {},
      });
      await action.copy();
      assert.equal(target, expected);
      assert.deepEqual(copied, [`${expected}#p=${CORE}.${TAIL}`], 'the link points at the page the user is on');
      assert.equal(copied[0], printed.url, 'the same address as Print');
    });
  }
});

test('the action brings no encoder, destination policy, storage or library fallback of its own', () => {
  const source = readFileSync(new URL('../core/browser/puzzle-copy.js', import.meta.url), 'utf8');
  const imports = [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1]);
  assert.ok(imports.length >= 5);
  for (const specifier of imports) {
    assert.ok(!/puzzlecode|handoff|storage|\/qr\.js|\/pack\.js/.test(specifier), specifier);
  }
  assert.ok(!/#lib|saveLibraryPack|encodeShareCode|puzzleCodeUrl|isLocalHost/.test(source));
});
