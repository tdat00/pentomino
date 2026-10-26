// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { sha256Hex } from '../core/engine/hash.js';
import {
  batchSeedFor,
  createRng,
  createRngFromState,
  normalizeSeedText,
  randomSeedText,
  randomPuzzleSeed,
} from '../core/engine/rng.js';

/** @param {{ nextU32(): number }} rng @param {number} n */
const draw = (rng, n) => Array.from({ length: n }, () => rng.nextU32());

/** @param {string} seed @param {string} [labelPath] */
function expectedState(seed, labelPath = '') {
  const digest = sha256Hex(`pentomino-seed-v1:${seed}${labelPath ? `\u0000${labelPath}` : ''}`);
  return [0, 1, 2, 3].map((i) => parseInt(digest.slice(i * 8, i * 8 + 8), 16));
}

describe('normalizeSeedText', () => {
  test('trims, applies NFC and stays case-sensitive', () => {
    assert.equal(normalizeSeedText('  demo \n'), 'demo');
    assert.equal(normalizeSeedText('e\u0301'), '\u00e9');
    assert.equal(normalizeSeedText('\u00e9'), '\u00e9');
    assert.notEqual(normalizeSeedText('Demo'), normalizeSeedText('demo'));
  });

  test('counts code points, not UTF-16 units', () => {
    assert.equal(normalizeSeedText('😀'.repeat(64)).length, 128);
    assert.throws(() => normalizeSeedText('😀'.repeat(65)), RangeError);
    assert.equal(normalizeSeedText('a'.repeat(64)), 'a'.repeat(64));
    assert.throws(() => normalizeSeedText('a'.repeat(65)), RangeError);
  });

  test('rejects empty, blank and non-string input', () => {
    assert.throws(() => normalizeSeedText(''), RangeError);
    assert.throws(() => normalizeSeedText(' \t\n'), RangeError);
    assert.throws(() => normalizeSeedText(/** @type {any} */ (5)), TypeError);
  });
});

describe('xoshiro128**', () => {
  test('golden output for state (1,2,3,4)', () => {
    assert.deepEqual(draw(createRngFromState([1, 2, 3, 4]), 4), [11520, 0, 5927040, 70819200]);
  });

  test('all-zero state is replaced by the fixed substitute', () => {
    const zero = createRngFromState([0, 0, 0, 0]);
    const substitute = createRngFromState([0x9e3779b9, 0x243f6a88, 0xb7e15162, 0x6a09e667]);
    assert.deepEqual(draw(zero, 8), draw(substitute, 8));
    assert.notEqual(createRngFromState([0, 0, 0, 0]).nextU32(), 0);
  });

  test('state words are coerced to uint32', () => {
    assert.deepEqual(
      draw(createRngFromState([-1, 2 ** 32 + 2, 3, 4]), 4),
      draw(createRngFromState([0xffffffff, 2, 3, 4]), 4),
    );
  });
});

describe('createRng', () => {
  test('seed "demo" matches the golden state and outputs', () => {
    assert.deepEqual(expectedState('demo'), [0xac19d7fd, 0x1f47dc98, 0x444f9bb4, 0xbbb91ffa]);
    const golden = [3504561854, 188375601, 1212981724];
    assert.deepEqual(draw(createRng('demo'), 3), golden);
    assert.deepEqual(draw(createRng('demo', ''), 3), golden);
    assert.deepEqual(draw(createRng('  demo  '), 3), golden);
  });

  test('equivalent Unicode seeds match; case differs', () => {
    assert.deepEqual(draw(createRng('caf\u00e9'), 4), draw(createRng('cafe\u0301'), 4));
    assert.notDeepEqual(draw(createRng('Demo'), 4), draw(createRng('demo'), 4));
  });

  test('label is hashed with a NUL separator', () => {
    assert.deepEqual(draw(createRng('demo', 'slot/1'), 4), draw(createRngFromState(expectedState('demo', 'slot/1')), 4));
    assert.notDeepEqual(draw(createRng('demo', 'a'), 4), draw(createRng('demo', 'b'), 4));
  });

  test('derive appends "/label" to the path and uses the original seed', () => {
    assert.deepEqual(draw(createRng('demo', 'a').derive('b'), 4), draw(createRng('demo', 'a/b'), 4));
    assert.deepEqual(draw(createRng('demo').derive('x').derive('y'), 4), draw(createRng('demo', '/x/y'), 4));
    assert.notDeepEqual(draw(createRng('demo').derive('x'), 4), draw(createRng('demo'), 4));
  });

  test('derived streams are independent of parent consumption', () => {
    const before = draw(createRng('demo').derive('slot/1'), 6);
    const consumed = createRng('demo');
    draw(consumed, 100);
    assert.deepEqual(draw(consumed.derive('slot/1'), 6), before);

    const parent = createRng('demo');
    const child = parent.derive('slot/1');
    const expectedParent = draw(createRng('demo'), 5);
    draw(child, 50);
    assert.deepEqual(draw(parent, 5), expectedParent);
    assert.deepEqual(draw(parent.derive('slot/1'), 6), before);
  });

  test('state-constructed streams cannot derive', () => {
    assert.throws(() => createRngFromState([1, 2, 3, 4]).derive('x'));
  });

  test('rejects bad arguments', () => {
    assert.throws(() => createRng(''), RangeError);
    assert.throws(() => createRng('demo', /** @type {any} */ (1)), TypeError);
    assert.throws(() => createRng('demo').derive(/** @type {any} */ (null)), TypeError);
  });
});

describe('batchSeedFor', () => {
  test('appends # and the index', () => {
    assert.equal(batchSeedFor('demo', 1), 'demo#1');
    assert.equal(batchSeedFor('demo', 2), 'demo#2');
    assert.notDeepEqual(draw(createRng(batchSeedFor('demo', 1)), 3), draw(createRng(batchSeedFor('demo', 2)), 3));
  });

  test('rejects invalid indices and non-normalized or invalid set seeds', () => {
    for (const bad of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, /** @type {any} */ ('1')]) {
      assert.throws(() => batchSeedFor('demo', bad), RangeError, String(bad));
    }
    assert.equal(batchSeedFor('demo', Number.MAX_SAFE_INTEGER), `demo#${Number.MAX_SAFE_INTEGER}`);
    assert.throws(() => batchSeedFor(' demo', 1), RangeError);
    assert.throws(() => batchSeedFor('e\u0301', 1), RangeError);
    assert.throws(() => batchSeedFor('', 1), RangeError);
    assert.throws(() => batchSeedFor('a'.repeat(65), 1), RangeError);
  });

  test('a 64-code-point set seed plus "#1" is hashed in full', () => {
    const setSeed = '😀'.repeat(64);
    assert.equal(normalizeSeedText(setSeed), setSeed);
    const internal = batchSeedFor(setSeed, 1);
    assert.equal([...internal].length, 66);
    assert.throws(() => normalizeSeedText(internal), RangeError);
    assert.deepEqual(draw(createRng(internal), 4), draw(createRngFromState(expectedState(internal)), 4));
    assert.deepEqual(draw(createRng(internal).derive('x'), 4), draw(createRngFromState(expectedState(internal, '/x')), 4));
  });
});

describe('sampling', () => {
  test('int bounds and rejected arguments', () => {
    const rng = createRng('bounds');
    for (let i = 0; i < 50; i++) assert.equal(rng.int(1), 0);
    for (let i = 0; i < 200; i++) {
      const v = rng.int(7);
      assert.ok(Number.isInteger(v) && v >= 0 && v < 7);
    }
    assert.equal(createRng('bounds').int(2 ** 32), createRng('bounds').nextU32());
    for (const bad of [0, -1, 1.5, NaN, Infinity, 2 ** 32 + 1, /** @type {any} */ ('3')]) {
      assert.throws(() => rng.int(bad), RangeError, String(bad));
    }
  });

  test('int rejects draws in the biased tail and redraws', () => {
    const n = 2 ** 31 + 1;
    const limit = Math.floor(2 ** 32 / n) * n;
    assert.equal(limit, n);
    let found = 0;
    for (let i = 0; i < 1000 && found < 3; i++) {
      const probe = createRng(`reject-${i}`);
      if (probe.nextU32() < limit) continue;
      let expected = probe.nextU32();
      while (expected >= limit) expected = probe.nextU32();
      assert.equal(createRng(`reject-${i}`).int(n), expected % n);
      found++;
    }
    assert.equal(found, 3);
  });

  test('int is roughly uniform', () => {
    const rng = createRng('uniform');
    const counts = [0, 0, 0];
    for (let i = 0; i < 3000; i++) counts[rng.int(3)]++;
    for (const c of counts) assert.ok(c > 850 && c < 1150, String(counts));
  });

  test('float is in [0, 1) and equals nextU32 / 2^32', () => {
    const a = createRng('float');
    const b = createRng('float');
    for (let i = 0; i < 100; i++) {
      const f = a.float();
      assert.ok(f >= 0 && f < 1);
      assert.equal(f, b.nextU32() / 2 ** 32);
    }
  });

  test('shuffle is an in-place permutation returning the same array', () => {
    const identity = Array.from({ length: 20 }, (_, i) => i);
    const items = [...identity];
    const out = createRng('shuffle').shuffle(items);
    assert.equal(out, items);
    assert.deepEqual([...items].sort((x, y) => x - y), identity);
    assert.notDeepEqual(items, identity);
    assert.deepEqual(createRng('shuffle').shuffle([...identity]), items);
    assert.deepEqual(createRng('x').shuffle([]), []);
    assert.deepEqual(createRng('x').shuffle(['only']), ['only']);
  });

  test('pick returns an element and rejects empty arrays', () => {
    const rng = createRng('pick');
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) assert.ok(items.includes(rng.pick(items)));
    assert.equal(rng.pick(['solo']), 'solo');
    assert.throws(() => rng.pick([]), RangeError);
  });
});

describe('puzzle seeds are whole numbers', () => {
  test('a random puzzle seed is plain decimal text within 32 bits', () => {
    for (let i = 0; i < 200; i += 1) {
      const text = randomPuzzleSeed();
      assert.match(text, /^(0|[1-9]\d*)$/);
      assert.ok(Number(text) <= 0xFFFFFFFF);
    }
  });
});

describe('randomSeedText', () => {
  test('has the XXXX-XXXX-XXXX shape over the friendly alphabet and is a valid seed', () => {
    const group = '[0-9ABCDEFGHJKMNPQRSTVWXYZ]{4}';
    const shape = new RegExp(`^${group}-${group}-${group}$`);
    const seen = new Set();
    for (let i = 0; i < 50; i++) {
      const text = randomSeedText();
      assert.match(text, shape);
      assert.equal(normalizeSeedText(text), text);
      seen.add(text);
    }
    assert.equal(seen.size, 50);
  });

  test('does not use Math.random', (t) => {
    t.mock.method(Math, 'random', () => {
      throw new Error('Math.random must not be used');
    });
    assert.match(randomSeedText(), /^[0-9A-Z-]{14}$/);
  });
});
