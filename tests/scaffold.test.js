// @ts-check
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { checkConventions, checkText } from '../tools/check-conventions.mjs';
import { checkSite } from '../tools/check-site.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDir = join(repoRoot, 'tests', 'artifacts');
mkdirSync(artifactsDir, { recursive: true });
const workDir = mkdtempSync(join(artifactsDir, 'scaffold-'));
after(() => rmSync(workDir, { recursive: true, force: true }));

/** @param {string} relPath */
const readRepo = (relPath) => readFileSync(join(repoRoot, relPath), 'utf8');

/**
 * Copies exactly what the Pages workflow copies into the artifact.
 * @param {string} name
 * @returns {string}
 */
function assembleSite(name) {
  const site = join(workDir, name);
  mkdirSync(site, { recursive: true });
  for (const file of ['index.html', 'redirect.js']) {
    cpSync(join(repoRoot, file), join(site, file));
  }
  for (const dir of ['core', 'generator', 'player']) {
    cpSync(join(repoRoot, dir), join(site, dir), { recursive: true });
  }
  return site;
}

describe('root redirect', () => {
  test('buildRedirectTarget keeps query and hash under the project prefix', async () => {
    const { buildRedirectTarget } = await import('../redirect.js');
    assert.equal(
      buildRedirectTarget('https://tdat00.github.io/pentomino/redirect.js', '?puzzle=1', '#p=abc'),
      'https://tdat00.github.io/pentomino/generator/?puzzle=1#p=abc',
    );
    assert.equal(
      buildRedirectTarget('https://tdat00.github.io/pentomino/redirect.js'),
      'https://tdat00.github.io/pentomino/generator/',
    );
  });

  test('module calls location.replace with query and hash when a location exists', async () => {
    /** @type {string[]} */
    const calls = [];
    const original = Object.getOwnPropertyDescriptor(globalThis, 'location');
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { search: '?a=1&b=2', hash: '#frag', replace: (/** @type {string} */ url) => calls.push(url) },
    });
    try {
      const url = `${pathToFileURL(join(repoRoot, 'redirect.js')).href}?run=${Date.now()}`;
      await import(url);
    } finally {
      if (original) {
        Object.defineProperty(globalThis, 'location', original);
      } else {
        delete (/** @type {any} */ (globalThis).location);
      }
    }
    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/generator\/\?a=1&b=2#frag$/);
  });

  test('root page has CSP, meta refresh, fallback link and an external module only', () => {
    const html = readRepo('index.html');
    assert.ok(
      html.includes(
        `content="default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'"`,
      ),
    );
    assert.ok(html.includes('<meta http-equiv="refresh" content="0; url=./generator/">'));
    assert.ok(html.includes('<script type="module" src="./redirect.js"></script>'));
    assert.ok(html.includes('<a href="./generator/">'));
    assert.ok(!/unsafe-/.test(html));
    assert.ok(!/<script(?![^>]*\bsrc=)/.test(html));
  });
});

describe('app shells', () => {
  const appCsp =
    "default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self'; " +
    "img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; " +
    "base-uri 'self'; form-action 'none'";

  for (const [app, other, css] of [
    ['generator', 'player', 'generator.css'],
    ['player', 'generator', 'player.css'],
  ]) {
    test(`${app} shell is independent, CSP-clean and links to ${other}`, () => {
      const html = readRepo(`${app}/index.html`);
      assert.ok(html.includes(`content="${appCsp}"`));
      assert.ok(html.includes(`href="../${other}/"`));
      assert.ok(html.includes(`href="./${css}"`));
      assert.ok(html.includes('<script type="module" src="./app.js"></script>'));
      assert.ok(!/<script(?![^>]*\bsrc=)/.test(html));
      const script = readRepo(`${app}/app.js`);
      assert.ok(script.includes("from '../core/engine/version.js'"));
      assert.ok(!script.includes(`../${other}/`));
    });
  }

  test('version identifiers', async () => {
    const version = await import('../core/engine/version.js');
    assert.equal(version.APP_VERSION, '1.0.0');
    assert.equal(version.ALGO_ID, 'gen-v2');
  });
});

describe('project configuration', () => {
  test('package scripts and module type', () => {
    const pkg = JSON.parse(readRepo('package.json'));
    assert.equal(pkg.type, 'module');
    assert.equal(pkg.private, true);
    assert.equal(pkg.dependencies, undefined);
    assert.equal(pkg.devDependencies, undefined);
    assert.deepEqual(pkg.scripts, {
      test: 'node --test "tests/**/*.test.js"',
      'test:quick': 'node --test --test-skip-pattern=slow "tests/**/*.test.js"',
      check: 'node tools/check-conventions.mjs && node tools/check-site.mjs .',
      serve: 'node tools/serve.mjs --port 8080 --prefix /pentomino/',
    });
  });

  test('gitignore keeps existing exclusions and adds new ones', () => {
    const lines = readRepo('.gitignore').split(/\r?\n/);
    for (const entry of ['docs/local', '_site/', 'tests/artifacts/']) {
      assert.ok(lines.includes(entry), entry);
    }
  });

  test('workflow copies only runtime paths and guards later-task tools', () => {
    const yml = readRepo('.github/workflows/pages.yml');
    assert.ok(yml.includes('cp index.html redirect.js _site/'));
    assert.ok(yml.includes('cp -r core generator player _site/'));
    assert.ok(yml.includes('if [ -f tools/stamp-version.mjs ]'));
    assert.ok(yml.includes('node --test "tests/**/*.test.js"'));
    assert.ok(yml.includes('actions/deploy-pages@v4'));
    assert.ok(!/\bcp\b[^\n]*\b(tasks|docs|tests|tools|\.github)\b/.test(yml));
  });
});

describe('convention checker', () => {
  test('rejects BOM, mixed line endings, trailing whitespace, tabs and missing final newline', () => {
    assert.deepEqual(checkText('ok.js', Buffer.from('const a = 1;\r\n')), []);
    assert.deepEqual(checkText('ok-lf.js', Buffer.from('const a = 1;\nconst b = 2;\n')), []);
    assert.match(checkText('bom.js', Buffer.from('\uFEFFa\r\n')).join('\n'), /BOM/);
    assert.match(checkText('lf.js', Buffer.from('a\r\nb\n')).join('\n'), /lf\.js:2: mixed line endings/);
    assert.match(checkText('crlf.js', Buffer.from('a\nb\r\n')).join('\n'), /crlf\.js:2: mixed line endings/);
    assert.match(checkText('ws.js', Buffer.from('a \r\n')).join('\n'), /trailing whitespace/);
    assert.match(checkText('tab.js', Buffer.from('\ta\r\n')).join('\n'), /tab indentation/);
    assert.match(checkText('eof.js', Buffer.from('a\r\nb')).join('\n'), /final newline/);
  });

  test('allows exactly two trailing spaces only in Markdown', () => {
    assert.deepEqual(checkText('a.md', Buffer.from('line  \r\n')), []);
    assert.equal(checkText('a.md', Buffer.from('line   \r\n')).length, 1);
    assert.equal(checkText('a.md', Buffer.from('line\t\r\n')).length, 1);
    assert.equal(checkText('a.js', Buffer.from('line  \r\n')).length, 1);
  });

  test('scans a project tree and reports violations in owned paths', () => {
    const root = join(workDir, 'conv');
    mkdirSync(join(root, 'core'), { recursive: true });
    for (const file of ['index.html', 'redirect.js', 'package.json', '.editorconfig', '.gitattributes', '.gitignore']) {
      writeFileSync(join(root, file), 'x\r\n');
    }
    writeFileSync(join(root, 'core', 'bad.js'), 'a\nb\r\n');
    assert.deepEqual(checkConventions(root), ['core/bad.js:2: mixed line endings']);
  });

  test('the repository itself conforms', () => {
    assert.deepEqual(checkConventions(repoRoot), []);
  });
});

describe('site checker', () => {
  test('repository root and assembled artifact pass', () => {
    assert.deepEqual(checkSite(repoRoot), []);
    assert.deepEqual(checkSite(assembleSite('good')), []);
  });

  test('artifact excludes tasks, docs, tests, tools and .github', () => {
    const site = assembleSite('excluded');
    for (const name of ['tasks', 'docs', 'tests', 'tools', '.github']) {
      assert.throws(() => readFileSync(join(site, name)), /ENOENT|EISDIR/);
    }
    mkdirSync(join(site, 'docs'));
    assert.match(checkSite(site).join('\n'), /docs: must not be part of a deployment artifact/);
  });

  test('fails on a missing local reference', () => {
    const site = assembleSite('missing');
    const page = join(site, 'generator', 'index.html');
    writeFileSync(page, readFileSync(page, 'utf8').replace('./generator.css', './absent.css'));
    assert.match(checkSite(site).join('\n'), /missing local reference \.\/absent\.css/);
  });

  test('fails on a missing module import and a browser .mjs reference', () => {
    const site = assembleSite('modules');
    writeFileSync(join(site, 'player', 'tool.mjs'), 'export {};\n');
    writeFileSync(
      join(site, 'player', 'app.js'),
      "import './tool.mjs';\nimport '../core/engine/nope.js';\n",
    );
    const output = checkSite(site).join('\n');
    assert.match(output, /\.mjs/);
    assert.match(output, /missing local reference \.\.\/core\/engine\/nope\.js/);
  });

  test('fails on root-absolute asset paths in HTML, CSS and JS', () => {
    const site = assembleSite('absolute');
    const page = join(site, 'player', 'index.html');
    writeFileSync(page, readFileSync(page, 'utf8').replace('./player.css', '/pentomino/player/player.css'));
    writeFileSync(join(site, 'generator', 'generator.css'), 'body { background: url(/img/a.png); }\n');
    writeFileSync(join(site, 'generator', 'app.js'), "import '/pentomino/core/engine/version.js';\n");
    const output = checkSite(site).join('\n');
    assert.match(output, /player\/index\.html: root-absolute path \/pentomino\/player\/player\.css/);
    assert.match(output, /generator\/generator\.css: root-absolute path \/img\/a\.png/);
    assert.match(output, /generator\/app\.js: root-absolute path \/pentomino\/core/);
  });

  test('fails on inline scripts and unsafe CSP', () => {
    const site = assembleSite('inline');
    const page = join(site, 'index.html');
    writeFileSync(
      page,
      readFileSync(page, 'utf8')
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
        .replace('</body>', '<script>alert(1)</script></body>'),
    );
    const output = checkSite(site).join('\n');
    assert.match(output, /inline <script>/);
    assert.match(output, /CSP must restrict/);
  });
});
