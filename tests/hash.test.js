// @ts-check
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { describe, test } from 'node:test';

import { canonicalJson, sha256Hex } from '../core/engine/hash.js';

const nodeSha = (/** @type {string | Uint8Array} */ data) => createHash('sha256').update(data).digest('hex');

describe('sha256Hex', () => {
  test('golden vectors', () => {
    assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('matches node:crypto around padding boundaries and over multiple blocks', () => {
    for (const length of [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 128, 1000, 100000]) {
      const bytes = new Uint8Array(randomBytes(length));
      assert.equal(sha256Hex(bytes), nodeSha(bytes), `length ${length}`);
    }
  });

  test('hashes strings as UTF-8, including astral characters', () => {
    for (const text of ['é', 'e\u0301', 'π≈3.14', '😀 pentomino 🧩', 'a'.repeat(200) + '€']) {
      assert.equal(sha256Hex(text), nodeSha(Buffer.from(text, 'utf8')), text);
      assert.equal(sha256Hex(text), sha256Hex(new TextEncoder().encode(text)));
    }
    assert.notEqual(sha256Hex('é'), sha256Hex('e\u0301'));
  });

  test('output is 64 lower-case hex characters and rejects other input types', () => {
    assert.match(sha256Hex('x'), /^[0-9a-f]{64}$/);
    assert.throws(() => sha256Hex(/** @type {any} */ (42)), TypeError);
  });
});

describe('canonicalJson', () => {
  test('sorts keys recursively without whitespace and preserves array order', () => {
    assert.equal(
      canonicalJson({ b: [3, 1, 2], a: { z: null, y: true, x: 'q"' }, c: -0.5 }),
      '{"a":{"x":"q\\"","y":true,"z":null},"b":[3,1,2],"c":-0.5}',
    );
  });

  test('key order does not change hashes but array order does', () => {
    const one = { id: 1, cells: [[0, 0], [1, 0]], meta: { a: 1, b: 2 } };
    const two = { meta: { b: 2, a: 1 }, cells: [[0, 0], [1, 0]], id: 1 };
    assert.equal(sha256Hex(canonicalJson(one)), sha256Hex(canonicalJson(two)));
    assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));
    assert.notEqual(canonicalJson({ cells: [[1, 0], [0, 0]] }), canonicalJson({ cells: [[0, 0], [1, 0]] }));
  });

  test('orders keys by code point, not UTF-16 code unit', () => {
    assert.equal(canonicalJson({ '\u{1F600}': 1, '\uFFFF': 2 }), '{"\uFFFF":2,"\u{1F600}":1}');
  });

  test('accepts null-prototype objects and shared (non-cyclic) references', () => {
    const bare = Object.create(null);
    bare.k = 1;
    const shared = [1];
    assert.equal(canonicalJson({ bare, a: shared, b: shared }), '{"a":[1],"b":[1],"bare":{"k":1}}');
  });

  test('rejects unsupported values', () => {
    const cyclic = /** @type {any} */ ({});
    cyclic.self = cyclic;
    const cyclicArray = /** @type {any[]} */ ([]);
    cyclicArray.push(cyclicArray);
    const bad = [
      undefined,
      () => 1,
      Symbol('s'),
      10n,
      NaN,
      Infinity,
      -Infinity,
      { a: undefined },
      [undefined],
      new Date(0),
      new Map(),
      new Uint8Array(1),
      [, 1],
      cyclic,
      cyclicArray,
      { get x() { return 1; } },
      { [Symbol('k')]: 1 },
      { toJSON() { return 1; } },
    ];
    for (const value of bad) assert.throws(() => canonicalJson(value), TypeError, String(value));
  });

  test('never executes toJSON hooks', () => {
    let called = false;
    class Hooked {
      toJSON() {
        called = true;
        return 1;
      }
    }
    assert.throws(() => canonicalJson(new Hooked()), TypeError);
    assert.equal(called, false);
  });
});
