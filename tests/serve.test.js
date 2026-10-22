// @ts-check
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { contentTypeFor, createStaticServer, parseArgs } from '../tools/serve.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDir = join(repoRoot, 'tests', 'artifacts');
mkdirSync(artifactsDir, { recursive: true });
const workDir = mkdtempSync(join(artifactsDir, 'serve-'));
const siteRoot = join(workDir, 'site');

/** @type {import('node:http').Server} */
let server;
let port = 0;

/**
 * Raw request that, unlike fetch, does not normalize the path.
 * @param {string} path
 * @param {string} [method]
 * @returns {Promise<{ status: number, headers: import('node:http').IncomingHttpHeaders, body: string }>}
 */
function request(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, (res) => {
      /** @type {Buffer[]} */
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }),
      );
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * @param {string} rel
 * @param {string} content
 */
function put(rel, content) {
  const file = join(siteRoot, ...rel.split('/'));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

before(async () => {
  put('index.html', '<p>home</p>\n');
  put('app.js', 'export {};\n');
  put('tool.mjs', 'export {};\n');
  put('style.css', 'body {}\n');
  put('data.json', '{}\n');
  put('shape.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>\n');
  put('image.png', 'png');
  put('blob.bin', 'bin');
  put('dir/index.html', '<p>dir</p>\n');
  put('dir/page.html', '<p>page</p>\n');
  put('empty/readme.txt', 'x');
  put('.git/config', 'secret');
  put('docs/local/notes.txt', 'secret');
  put('docs/public.txt', 'public');
  put('with space.txt', 'spaced');
  writeFileSync(join(workDir, 'outside.txt'), 'outside');
  server = createStaticServer({ root: siteRoot, prefix: '/pentomino/' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
});

after(async () => {
  await new Promise((resolve) => server.close(() => resolve(undefined)));
  rmSync(workDir, { recursive: true, force: true });
});

describe('static server', () => {
  test('serves every explicit MIME type with no-store caching', async () => {
    const expected = {
      'app.js': 'text/javascript; charset=utf-8',
      'tool.mjs': 'text/javascript; charset=utf-8',
      'dir/page.html': 'text/html; charset=utf-8',
      'style.css': 'text/css; charset=utf-8',
      'data.json': 'application/json; charset=utf-8',
      'shape.svg': 'image/svg+xml',
      'image.png': 'image/png',
      'blob.bin': 'application/octet-stream',
    };
    for (const [file, type] of Object.entries(expected)) {
      const res = await request(`/pentomino/${file}`);
      assert.equal(res.status, 200, file);
      assert.equal(res.headers['content-type'], type, file);
      assert.equal(res.headers['cache-control'], 'no-store', file);
    }
    assert.equal(contentTypeFor('X.JS'), 'text/javascript; charset=utf-8');
    assert.equal(contentTypeFor('noext'), 'application/octet-stream');
  });

  test('GET returns the body and HEAD returns headers only', async () => {
    const get = await request('/pentomino/app.js');
    assert.equal(get.body, 'export {};\n');
    const head = await request('/pentomino/app.js', 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body, '');
    assert.equal(head.headers['content-length'], String(get.body.length));
    assert.equal(head.headers['content-type'], get.headers['content-type']);
  });

  test('maps the prefix, serves index.html for directories and ignores query strings', async () => {
    assert.equal((await request('/pentomino/')).body, '<p>home</p>\n');
    assert.equal((await request('/pentomino/dir/')).body, '<p>dir</p>\n');
    assert.equal((await request('/pentomino/app.js?v=123')).status, 200);
    assert.equal((await request('/pentomino/with%20space.txt')).body, 'spaced');
  });

  test('redirects / and a missing prefix slash to the prefix, and directories to a slash', async () => {
    const root = await request('/');
    assert.equal(root.status, 302);
    assert.equal(root.headers.location, '/pentomino/');
    const bare = await request('/pentomino?x=1');
    assert.equal(bare.status, 302);
    assert.equal(bare.headers.location, '/pentomino/?x=1');
    const dir = await request('/pentomino/dir');
    assert.equal(dir.status, 302);
    assert.equal(dir.headers.location, '/pentomino/dir/');
  });

  test('returns 404 without directory listings, outside the prefix, and for missing files', async () => {
    assert.equal((await request('/pentomino/empty/')).status, 404);
    assert.equal((await request('/pentomino/missing.js')).status, 404);
    assert.equal((await request('/other/app.js')).status, 404);
    assert.equal((await request('/app.js')).status, 404);
  });

  test('allows GET and HEAD only', async () => {
    const res = await request('/pentomino/app.js', 'POST');
    assert.equal(res.status, 405);
    assert.equal(res.headers.allow, 'GET, HEAD');
  });

  test('rejects traversal, NUL, backslash and drive-style paths', async () => {
    for (const path of [
      '/pentomino/%2e%2e/outside.txt',
      '/pentomino/..%2foutside.txt',
      '/pentomino/dir/../../outside.txt',
      '/pentomino/%2e%2e%5coutside.txt',
      '/pentomino/dir%5cpage.html',
      '/pentomino/app.js%00.png',
      '/pentomino/C:/Windows/win.ini',
      '/pentomino/%zz',
    ]) {
      const res = await request(path);
      assert.equal(res.status, 400, path);
      assert.ok(!res.body.includes('outside'), path);
    }
  });

  test('denies .git and docs/local in any spelling but serves other docs files', async () => {
    for (const path of [
      '/pentomino/.git/config',
      '/pentomino/.GIT/config',
      '/pentomino/%2egit/config',
      '/pentomino/.git./config',
      '/pentomino/GIT~1/config',
      '/pentomino/docs/local/notes.txt',
      '/pentomino/Docs/Local/notes.txt',
      '/pentomino/docs/local',
    ]) {
      const res = await request(path);
      assert.equal(res.status, 403, path);
      assert.ok(!res.body.includes('secret'), path);
    }
    assert.equal((await request('/pentomino/docs/public.txt')).body, 'public');
  });
});

describe('server options', () => {
  test('parseArgs applies defaults and explicit overrides', () => {
    const defaults = parseArgs([]);
    assert.equal(defaults.port, 8080);
    assert.equal(defaults.host, '127.0.0.1');
    assert.equal(defaults.prefix, '/pentomino/');
    const custom = parseArgs(['--root', '_site', '--port', '8081', '--prefix', 'x', '--host', '0.0.0.0']);
    assert.deepEqual(custom, { root: '_site', port: 8081, host: '0.0.0.0', prefix: '/x/' });
    assert.throws(() => parseArgs(['--port', 'abc']), /Invalid port/);
    assert.throws(() => parseArgs(['--bogus', '1']), /Unknown option/);
  });
});
