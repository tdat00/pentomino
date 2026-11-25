// @ts-check
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SOURCE_FILES } from '../../bench/report.js';
import { frame, receiptOf, sourcesOf, unframe } from './browser-run.mjs';

describe('browser runner', () => {
  it('pipe messages are framed by a zero byte', () => {
    const a = { id: 1, method: 'Target.createTarget', params: { url: 'http://127.0.0.1:1/' } };
    const b = { id: 2, result: { text: 'ü' } };
    const both = unframe(Buffer.concat([frame(a), frame(b)]));
    assert.deepEqual(both.messages, [a, b]);
    assert.equal(both.rest.length, 0);

    const c = frame({ id: 3, result: { text: 'héllo wörld' } });
    const cut = c.indexOf(Buffer.from('é')) + 1; // inside the two-byte character
    const first = unframe(c.subarray(0, cut));
    assert.deepEqual(first.messages, []);
    const second = unframe(Buffer.concat([first.rest, c.subarray(cut)]));
    assert.deepEqual(second.messages, [{ id: 3, result: { text: 'héllo wörld' } }]);
    assert.equal(second.rest.length, 0);
  });

  it('the receipt has the required fields', () => {
    const receipt = receiptOf({
      page: 'p.html', check: 'c', status: 'pass', durationMs: 1234, startedAt: 'a', endedAt: 'b', edgePid: 7,
      consoleLines: ['CHECK-START c'], cleanup: null, sources: [{ path: 'x', sha256: 'y' }],
    });
    assert.deepEqual(Object.keys(receipt), [
      'format', 'version', 'page', 'check', 'status', 'durationMs', 'startedAt', 'endedAt', 'edgePid', 'consoleLines', 'cleanup', 'sources',
    ]);
    assert.equal(receipt.format, 'p2-browser');
    assert.equal(receipt.version, 1);
    assert.equal(typeof receipt.durationMs, 'number');
  });

  it('the sources bind the shipping build', () => {
    const page = 'tools/ig-proto/phase2/fixtures/browser-selftest.html';
    const bound = 'tools/ig-proto/phase2/fixtures/browser-selftest.js';
    const sources = sourcesOf(page, [bound]);
    const paths = sources.map((s) => s.path);
    for (const path of [
      page, bound, 'generator/jobs.js', 'generator/locale.en.js', 'generator/locale.vi.js', 'generator/ui/replay-model.js',
      'generator/ui/replay-cache.js', ...SOURCE_FILES,
    ]) {
      assert.ok(paths.includes(path), path);
    }
    assert.equal(new Set(paths).size, paths.length);
    for (const { sha256 } of sources) {
      assert.match(sha256, /^[0-9a-f]{64}$/);
    }
  });
});
