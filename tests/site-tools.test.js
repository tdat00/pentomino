// @ts-check
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { checkSite, parseArgs } from '../tools/check-site.mjs';
import { classifyReference, scanSource, tokenizeJs, withVersion } from '../tools/site-scan.mjs';
import { createStaticServer } from '../tools/serve.mjs';
import { stampSite, stampSource } from '../tools/stamp-version.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = join(repoRoot, 'tests', 'fixtures', 'site-tools');
const artifactsDir = join(repoRoot, 'tests', 'artifacts');
mkdirSync(artifactsDir, { recursive: true });
const workDir = mkdtempSync(join(artifactsDir, 'site-tools-'));
after(() => rmSync(workDir, { recursive: true, force: true }));

const SHA = 'abc12345';
let counter = 0;

/**
 * @param {string} source Directory to copy.
 * @returns {string} The copy, under the scratch directory.
 */
function copyOf(source) {
  counter += 1;
  const target = join(workDir, `copy-${counter}`);
  cpSync(source, target, { recursive: true });
  return target;
}

/**
 * Copies exactly what the Pages workflow stages.
 * @returns {string}
 */
function assembleScaffold() {
  counter += 1;
  const site = join(workDir, `scaffold-${counter}`);
  mkdirSync(site, { recursive: true });
  for (const file of ['index.html', 'redirect.js']) {
    cpSync(join(repoRoot, file), join(site, file));
  }
  for (const dir of ['core', 'generator', 'player']) {
    cpSync(join(repoRoot, dir), join(site, dir), { recursive: true });
  }
  return site;
}

/**
 * @param {string} dir
 * @returns {Record<string, string>} SHA-256 of every file by relative path.
 */
function hashTree(dir) {
  /** @type {Record<string, string>} */
  const result = {};
  /** @param {string} current */
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else {
        result[relative(dir, path).split('\\').join('/')] = createHash('sha256').update(readFileSync(path)).digest('hex');
      }
    }
  };
  walk(dir);
  return result;
}

/**
 * @param {string} kind
 * @param {string[]} lines
 * @param {string} [version]
 */
function stampLines(kind, lines, version = SHA) {
  return stampSource(/** @type {'html' | 'js' | 'css'} */ (kind), `${lines.join('\n')}\n`, version);
}

describe('JavaScript scanning', () => {
  test('stamps every supported reference form and keeps queries and fragments', () => {
    const { text, count, problems } = stampLines('js', [
      "import a from './a.js';",
      "import { b } from '../b.js?x=1';",
      "import './side.js';",
      "export * from './c.js';",
      "export { d } from './d.js#frag';",
      "const e = () => import('./e.js');",
      "const f = new Worker(new URL('./f.js', import.meta.url), { type: 'module' });",
      "const g = new URL(`./g.json?rev=2#part`, import.meta.url);",
      "const h = import.meta.resolve('./h.css');",
    ]);
    assert.deepEqual(problems, []);
    assert.equal(count, 9);
    for (const expected of [
      "from './a.js?v=abc12345'",
      "from '../b.js?x=1&v=abc12345'",
      "import './side.js?v=abc12345'",
      "from './c.js?v=abc12345'",
      "from './d.js?v=abc12345#frag'",
      "import('./e.js?v=abc12345')",
      "new URL('./f.js?v=abc12345', import.meta.url)",
      'new URL(`./g.json?rev=2&v=abc12345#part`, import.meta.url)',
      "resolve('./h.css?v=abc12345')",
    ]) {
      assert.ok(text.includes(expected), expected);
    }
  });

  test('ignores comments, strings, templates, regexes, JSDoc types and non-module code', () => {
    const lines = [
      "// import './line.js';",
      "/* import('./block.js'); */",
      '/** @type {import(\'./types.js\').T} */',
      "const s = \"import './string.js'\";",
      "const t = `from './template.js' ${x}`;",
      "const r = /import '\\.\\/regex\\.js'/;",
      'const q = a / b / c;',
      'const w = a++ / 2;',
      "const url = new URL('./base', location.href);",
      "const hash = '#pack=abc';",
      "const bare = import('lodash');",
      "const home = new URL('./app/', import.meta.url);",
      "other.import('./method.js');",
    ];
    const { text, count, problems } = stampLines('js', lines);
    assert.deepEqual(problems, []);
    assert.equal(text, `${lines.join('\n')}\n`);
    assert.equal(count, 0);
  });

  test('finds references inside template substitutions and after regex-like slashes', () => {
    const { text } = stampLines('js', [
      "const a = `${import('./inner.js')}`;",
      'const b = (1) / 2; import(\'./after-division.js\');',
      "const c = /x/.test(y) && import('./after-regex.js');",
    ]);
    assert.ok(text.includes('./inner.js?v=abc12345'));
    assert.ok(text.includes('./after-division.js?v=abc12345'));
    assert.ok(text.includes('./after-regex.js?v=abc12345'));
  });

  test('is idempotent and replaces an earlier version', () => {
    const once = stampLines('js', ["import './a.js?x=1';"]).text;
    assert.equal(stampSource('js', once, SHA).text, once);
    assert.equal(stampSource('js', once, '00000000').text, "import './a.js?x=1&v=00000000';\n");
  });

  test('fails on dynamic patterns it cannot stamp instead of leaving a mixed graph', () => {
    const { problems } = stampLines('js', [
      'import(name);',
      'import(`./${name}.js`);',
      "new Worker('./w.js');",
      'new URL(name, import.meta.url);',
      "importScripts('./old.js');",
      'import.meta.resolve(name);',
    ]);
    assert.equal(problems.length, 6);
    assert.match(problems[0], /^line 1: dynamic import/);
    assert.match(problems[2], /^line 3: Worker with a string path/);
  });

  test('fails on root-absolute references', () => {
    assert.match(stampLines('js', ["import '/pentomino/core/a.js';"]).problems.join('\n'), /root-absolute/);
  });

  test('tokenizer reports unterminated constructs', () => {
    assert.match(tokenizeJs('const a = `open').problems[0].message, /template/);
    assert.match(tokenizeJs("const a = 'open\n").problems[0].message, /string/);
    assert.match(tokenizeJs('/* open').problems[0].message, /comment/);
  });
});

describe('HTML and CSS scanning', () => {
  test('stamps asset attributes only; navigation, fragments and comments are untouched', () => {
    const lines = [
      '<!-- <script src="./ghost.js"></script> -->',
      '<link rel="stylesheet" href="./a.css?t=1#top">',
      '<link rel="modulepreload" href="./b.js">',
      '<link rel="canonical" href="./app/">',
      '<script type="module" src="./c.js"></script>',
      '<a href="./app/#pack=abc">go</a>',
      '<img src="./d.png#frag" alt="">',
      '<svg><use href="#local"></use><use href="sprite.svg#icon"></use></svg>',
      '<script src="https://example.com/x.js"></script>',
      '<img src="data:image/png;base64,AAAA" alt="">',
      '<link rel="icon" href="./app/">',
    ];
    const { text, problems } = stampLines('html', lines);
    assert.deepEqual(problems, []);
    assert.equal(
      text,
      `${[
        lines[0],
        '<link rel="stylesheet" href="./a.css?t=1&v=abc12345#top">',
        '<link rel="modulepreload" href="./b.js?v=abc12345">',
        lines[3],
        '<script type="module" src="./c.js?v=abc12345"></script>',
        lines[5],
        '<img src="./d.png?v=abc12345#frag" alt="">',
        '<svg><use href="#local"></use><use href="sprite.svg?v=abc12345#icon"></use></svg>',
        lines[8],
        lines[9],
        lines[10],
      ].join('\n')}\n`,
    );
  });

  test('handles unquoted values, entity-escaped queries and inline module/style blocks', () => {
    const { text } = stampLines('html', [
      '<script type=module src=./x.js></script>',
      '<img src="./y.png?a=1&amp;b=2">',
      '<script type="module">import \'./inline.js\';</script>',
      '<script type="application/json">{"u": "import \'./data.js\'"}</script>',
      '<style>@import "./inline.css"; .a { background: url(./i.png) }</style>',
    ]);
    assert.ok(text.includes('src=./x.js?v=abc12345>'));
    assert.ok(text.includes('./y.png?a=1&amp;b=2&amp;v=abc12345'));
    assert.ok(text.includes("import './inline.js?v=abc12345'"));
    assert.ok(text.includes("import './data.js'"));
    assert.ok(text.includes('"./inline.css?v=abc12345"'));
    assert.ok(text.includes('url(./i.png?v=abc12345)'));
  });

  test('rejects srcset because its candidates cannot be stamped safely', () => {
    assert.match(stampLines('html', ['<img srcset="a.png 1x, b.png 2x">']).problems.join('\n'), /srcset/);
  });

  test('stamps CSS imports and urls but not comments, strings, data or fragment-only urls', () => {
    const lines = [
      '/* url(./ghost.png) @import "./ghost.css"; */',
      '@import "./a.css";',
      "@import url('./b.css') screen;",
      '.x { background: url( img/c.png ) , url("./d.svg#v"); mask: url(#m); }',
      '.y { background: url(data:image/png;base64,AAAA); content: "url(./ghost.png)"; }',
    ];
    const { text, problems } = stampLines('css', lines);
    assert.deepEqual(problems, []);
    assert.equal(
      text,
      `${[
        lines[0],
        '@import "./a.css?v=abc12345";',
        "@import url('./b.css?v=abc12345') screen;",
        '.x { background: url( img/c.png?v=abc12345 ) , url("./d.svg?v=abc12345#v"); mask: url(#m); }',
        lines[4],
      ].join('\n')}\n`,
    );
  });

  test('rejects dynamic CSS urls', () => {
    assert.match(stampLines('css', ['.a { background: url(var(--x)); }']).problems.join('\n'), /dynamic url/);
    assert.match(stampLines('css', ['.a { background: image-set("a.png" 1x); }']).problems.join('\n'), /image-set/);
  });

  test('reference helpers', () => {
    assert.equal(withVersion('./a.js', SHA), './a.js?v=abc12345');
    assert.equal(withVersion('./a.js?v=old&k=1#h', SHA), './a.js?k=1&v=abc12345#h');
    assert.equal(classifyReference('#x'), 'local');
    assert.equal(classifyReference('//cdn.test/a.js'), 'external');
    assert.equal(classifyReference('/a.js'), 'absolute');
    assert.equal(classifyReference('lodash', true), 'bare');
    assert.equal(classifyReference('a.js'), 'relative');
    assert.equal(scanSource('js', '\n\nimport "./a.js";').refs[0].line, 3);
  });
});

describe('stampSite', () => {
  test('stamps only the staged copy and leaves untouched files byte-identical', () => {
    const sourceHashes = hashTree(join(fixtures, 'site'));
    const site = copyOf(join(fixtures, 'site'));
    const result = stampSite(site, SHA);
    assert.deepEqual(result.problems, []);
    assert.deepEqual(hashTree(join(fixtures, 'site')), sourceHashes);

    const staged = hashTree(site);
    const changed = Object.keys(staged).filter((name) => staged[name] !== sourceHashes[name]).sort();
    assert.deepEqual(changed, [
      'app/app.js', 'app/index.html', 'index.html', 'main.js', 'style.css', 'theme.css', 'worker.js',
    ]);
    assert.equal(result.filesChanged, changed.length);
    assert.equal(result.references, 16);

    const main = readFileSync(join(site, 'main.js'), 'utf8');
    assert.ok(!/ghost[^\n]*\?v=/.test(main));
    assert.ok(main.includes("import('./lazy.js?debug=1&v=abc12345')"));
    assert.ok(main.includes("new URL('./data.json?rev=2&v=abc12345#part', import.meta.url)"));
    assert.ok(main.includes("new URL('./app/', import.meta.url)"));
    assert.ok(main.includes("const pack = '#pack=abc';"));
    const index = readFileSync(join(site, 'index.html'), 'utf8');
    assert.ok(index.includes('href="./app/#pack=abc123"'));
    assert.ok(index.includes('href="./app/?x=1#pack=keep"'));
    assert.ok(index.includes('src="./img/logo.svg?v=abc12345#mark"'));
    assert.ok(readFileSync(join(site, 'style.css'), 'utf8').includes('url(#clip)'));
    assert.ok(readFileSync(join(site, 'app', 'app.js'), 'utf8').includes("'../util.js?v=abc12345'"));
  });

  test('restamping the same version changes nothing and a new version replaces the old one', () => {
    const site = copyOf(join(fixtures, 'site'));
    stampSite(site, SHA);
    const once = hashTree(site);
    assert.equal(stampSite(site, SHA).filesChanged, 0);
    assert.deepEqual(hashTree(site), once);
    stampSite(site, '00000000');
    assert.ok(!readFileSync(join(site, 'main.js'), 'utf8').includes(SHA));
    assert.deepEqual(checkSite(site, { entries: ['index.html'], expectVersion: '00000000' }), []);
  });

  test('every module gets the same version, so no module is instantiated twice', () => {
    const site = copyOf(join(fixtures, 'site'));
    stampSite(site, SHA);
    const urls = new Set();
    for (const file of ['main.js', 'worker.js', 'app/app.js']) {
      const source = readFileSync(join(site, file), 'utf8');
      for (const ref of scanSource('js', source).refs) {
        if (/util\.js/.test(ref.value)) {
          urls.add(new URL(ref.value, new URL(file, 'http://x/')).href);
        }
      }
    }
    assert.deepEqual([...urls], ['http://x/util.js?v=abc12345']);
  });

  test('keeps a BOM and CRLF line endings', () => {
    const site = copyOf(join(fixtures, 'site'));
    const file = join(site, 'worker.js');
    writeFileSync(file, '\uFEFFimport { helper } from \'./util.js\';\r\nhelper(1);\r\n');
    stampSite(site, SHA);
    assert.equal(readFileSync(file, 'utf8'), '\uFEFFimport { helper } from \'./util.js?v=abc12345\';\r\nhelper(1);\r\n');
  });

  test('writes nothing when any file has an unresolved dynamic pattern', () => {
    const site = copyOf(join(fixtures, 'site'));
    cpSync(join(fixtures, 'bad-dynamic', 'main.js'), join(site, 'dynamic.js'));
    const before = hashTree(site);
    const result = stampSite(site, SHA);
    assert.ok(result.problems.length >= 3);
    assert.match(result.problems[0], /^dynamic\.js: line 3:/);
    assert.equal(result.filesChanged, 0);
    assert.deepEqual(hashTree(site), before);
  });

  test('refuses invalid versions, missing folders and source checkouts', () => {
    const site = copyOf(join(fixtures, 'site'));
    assert.match(stampSite(site, 'xyz').problems[0], /8 hexadecimal/);
    assert.match(stampSite(join(workDir, 'absent'), SHA).problems[0], /not found/);
    writeFileSync(join(site, 'package.json'), '{}\n');
    const before = hashTree(site);
    assert.match(stampSite(site, SHA).problems[0], /source checkout/);
    assert.deepEqual(hashTree(site), before);
  });
});

describe('checkSite graph checks', () => {
  test('accepts the fixture graph unstamped and stamped', () => {
    const options = { entries: ['index.html', 'app/index.html'] };
    assert.deepEqual(checkSite(join(fixtures, 'site'), options), []);
    const site = copyOf(join(fixtures, 'site'));
    stampSite(site, SHA);
    assert.deepEqual(checkSite(site, options), []);
    assert.deepEqual(checkSite(site, { ...options, expectVersion: SHA }), []);
  });

  test('follows workers, dynamic imports and CSS imports, and ignores commented ghosts', () => {
    const site = copyOf(join(fixtures, 'site'));
    writeFileSync(join(site, 'worker.js'), "import './missing-from-worker.js';\n");
    writeFileSync(join(site, 'base.css'), '.a { background: url(./missing.png); }\n');
    const output = checkSite(site, { entries: ['index.html'] }).join('\n');
    assert.match(output, /worker\.js: missing local reference \.\/missing-from-worker\.js/);
    assert.match(output, /base\.css: missing local reference \.\/missing\.png/);
    assert.doesNotMatch(output, /ghost/);
  });

  test('stops on missing assets, browser .mjs imports and unresolved dynamic patterns', () => {
    assert.match(checkSite(join(fixtures, 'bad-missing'), { entries: ['index.html'] }).join('\n'), /missing local reference \.\/gone\.js/);
    assert.match(checkSite(join(fixtures, 'bad-mjs'), { entries: ['index.html'] }).join('\n'), /browser reference to \.mjs file \.\/tool\.mjs/);
    const dynamic = checkSite(join(fixtures, 'bad-dynamic'), { entries: ['index.html'] });
    assert.equal(dynamic.length, 3);
  });

  test('detects a mixed-version graph and a wrong expected version', () => {
    const site = copyOf(join(fixtures, 'site'));
    stampSite(site, SHA);
    const file = join(site, 'app', 'app.js');
    writeFileSync(file, readFileSync(file, 'utf8').replace('?v=abc12345', ''));
    const mixed = checkSite(site, { entries: ['index.html', 'app/index.html'] });
    assert.equal(mixed.length, 1);
    assert.match(mixed[0], /app\/app\.js: line 2: mixed version graph: reference \.\.\/util\.js lacks \?v=abc12345/);
    assert.match(checkSite(site, { entries: ['index.html'], expectVersion: 'ffffffff' }).join('\n'), /not stamped \?v=ffffffff/);
  });

  test('reports a missing or non-HTML entry', () => {
    assert.match(checkSite(fixtures, { entries: ['nope.html'] })[0], /entry not found/);
    assert.match(checkSite(fixtures, { entries: ['site/main.js'] })[0], /entry must be an HTML file/);
    assert.match(checkSite(fixtures, { entries: ['../x.html'] })[0], /entry must be an HTML file inside the root/);
  });

  test('argument parser', () => {
    assert.deepEqual(parseArgs(['.', '--entry', 'a.html', '--entry', 'b.html', '--expect-version', SHA]), {
      root: '.',
      entries: ['a.html', 'b.html'],
      expectVersion: SHA,
    });
    assert.deepEqual(parseArgs([]), { root: '.', entries: [], expectVersion: undefined });
    assert.throws(() => parseArgs(['--entry']), /Missing value/);
    assert.throws(() => parseArgs(['--nope']), /Unknown option/);
    assert.throws(() => parseArgs(['a', 'b']), /Unexpected argument/);
  });
});

describe('assembled scaffold', () => {
  test('stamps and checks cleanly without touching sources', async () => {
    const sourceHashes = { ...hashTree(join(repoRoot, 'core')), ...hashTree(join(repoRoot, 'generator')) };
    const site = assembleScaffold();
    const result = stampSite(site, SHA);
    assert.deepEqual(result.problems, []);
    assert.ok(result.references > 0);
    assert.deepEqual(checkSite(site, { expectVersion: SHA }), []);
    assert.deepEqual({ ...hashTree(join(repoRoot, 'core')), ...hashTree(join(repoRoot, 'generator')) }, sourceHashes);
    assert.ok(readFileSync(join(site, 'generator', 'index.html'), 'utf8').includes('src="./app.js?v=abc12345"'));
    assert.ok(readFileSync(join(site, 'generator', 'index.html'), 'utf8').includes('href="../core/browser/theme.css?v=abc12345"'));

    const { buildRedirectTarget } = await import(pathToFileURL(join(site, 'redirect.js')).href);
    assert.equal(
      buildRedirectTarget('https://example.test/pentomino/redirect.js', '?a=1', '#pack=abc'),
      'https://example.test/pentomino/generator/?a=1#pack=abc',
    );
  });

  test('the unstamped checkout still passes the default check', () => {
    assert.deepEqual(checkSite(repoRoot), []);
  });
});

describe('hosting under a path prefix and at the root', () => {
  /**
   * Crawls every reference reachable from an entry page and returns the problems found.
   * @param {string} base Server origin plus prefix, ending in `/`.
   * @param {string} entryPath
   * @param {string} version
   * @returns {Promise<{ problems: string[], urls: Set<string> }>}
   */
  async function crawl(base, entryPath, version) {
    /** @type {string[]} */
    const problems = [];
    const urls = new Set();
    const queue = [new URL(entryPath, base).href];
    while (queue.length > 0) {
      const url = /** @type {string} */ (queue.shift());
      if (urls.has(url)) {
        continue;
      }
      urls.add(url);
      const response = await fetch(url);
      if (response.status !== 200) {
        problems.push(`${url}: HTTP ${response.status}`);
        continue;
      }
      const path = new URL(url).pathname;
      const kind = path.endsWith('/') || path.endsWith('.html') ? 'html' : path.endsWith('.js') ? 'js' : path.endsWith('.css') ? 'css' : null;
      if (kind === 'js' && !(response.headers.get('content-type') ?? '').startsWith('text/javascript')) {
        problems.push(`${url}: wrong module MIME type`);
      }
      if (!kind) {
        await response.arrayBuffer();
        continue;
      }
      for (const ref of scanSource(kind, await response.text()).refs) {
        const type = classifyReference(ref.value, ref.type === 'module');
        if (type === 'absolute') {
          problems.push(`${url}: root-absolute ${ref.value}`);
        } else if (type === 'relative') {
          const target = new URL(ref.value, url);
          target.hash = '';
          if (!target.href.startsWith(base)) {
            problems.push(`${url}: ${ref.value} leaves the project prefix`);
          } else {
            const directory = target.pathname.endsWith('/');
            if (ref.stamp && !directory && target.searchParams.get('v') !== version) {
              problems.push(`${url}: ${ref.value} is not stamped`);
            }
            queue.push(target.href);
          }
        }
      }
    }
    return { problems, urls };
  }

  for (const prefix of ['/pentomino/', '/']) {
    test(`stamped scaffold and fixture graphs resolve under ${prefix}`, async () => {
      const scaffold = assembleScaffold();
      const fixture = copyOf(join(fixtures, 'site'));
      stampSite(scaffold, SHA);
      stampSite(fixture, SHA);
      for (const [root, entry, minimum] of [
        [scaffold, 'generator/', 4],
        [scaffold, 'player/', 4],
        [fixture, 'index.html', 12],
      ]) {
        const server = createStaticServer({ root, prefix });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
        try {
          const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
          const base = `http://127.0.0.1:${port}${prefix}`;
          const { problems, urls } = await crawl(base, entry, SHA);
          assert.deepEqual(problems, []);
          assert.ok(urls.size >= minimum, `${entry} crawled ${urls.size} URLs`);
        } finally {
          server.closeAllConnections();
          await new Promise((resolve) => server.close(() => resolve(undefined)));
        }
      }
    });
  }
});

describe('command line', () => {
  /** @param {string[]} args */
  const run = (...args) => spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8' });

  test('stamp-version then check-site succeed on a staged copy', () => {
    const site = assembleScaffold();
    const stamped = run('tools/stamp-version.mjs', site, SHA);
    assert.equal(stamped.status, 0, stamped.stderr);
    assert.match(stamped.stdout, /stamp-version: \d+ reference\(s\)/);
    const checked = run('tools/check-site.mjs', site, '--expect-version', SHA);
    assert.equal(checked.status, 0, checked.stderr);
    assert.match(checked.stdout, /check-site: OK/);
  });

  test('a broken staged copy fails the check with a non-zero exit', () => {
    const site = assembleScaffold();
    rmSync(join(site, 'core', 'engine', 'version.js'));
    const checked = run('tools/check-site.mjs', site);
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /missing local reference \.\.\/core\/engine\/version\.js/);
  });

  test('explicit entries check a harness page without publishing it', () => {
    const ok = run('tools/check-site.mjs', join(fixtures, 'site'), '--entry', 'index.html');
    assert.equal(ok.status, 0, ok.stderr);
    const missing = run('tools/check-site.mjs', '.', '--entry', 'tools/no-such-page/index.html');
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /entry not found/);
  });

  test('usage errors exit with status 2', () => {
    assert.equal(run('tools/stamp-version.mjs').status, 2);
    assert.equal(run('tools/stamp-version.mjs', '.', 'zzzzzzzz').status, 1);
    assert.equal(run('tools/check-site.mjs', '--bogus').status, 2);
  });

  test('stamping refuses the source checkout itself', () => {
    const result = run('tools/stamp-version.mjs', '.', SHA);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /source checkout/);
    assert.ok(existsSync(join(repoRoot, 'package.json')));
  });
});

describe('workflow and README', () => {
  test('workflow stamps, then fails the build when the staged site does not verify', () => {
    const yml = readFileSync(join(repoRoot, '.github', 'workflows', 'pages.yml'), 'utf8');
    assert.ok(yml.includes('push: { branches: [main] }'));
    assert.ok(yml.includes('workflow_dispatch:'));
    assert.ok(yml.includes('permissions: { contents: read, pages: write, id-token: write }'));
    assert.ok(yml.includes('actions/upload-pages-artifact@v4'));
    const stamp = yml.indexOf('node tools/stamp-version.mjs _site "${GITHUB_SHA::8}"');
    const verify = yml.indexOf('node tools/check-site.mjs _site --expect-version "${GITHUB_SHA::8}"');
    assert.ok(stamp > 0 && verify > stamp);
    assert.ok(!/node tools\/check-site\.mjs _site[^\n]*\|\|/.test(yml));
    assert.ok(yml.indexOf('node --test "tests/**/*.test.js"') < stamp);
  });

  test('README documents the real commands and entry points', () => {
    const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');
    for (const expected of [
      'node tools\\serve.mjs --port 8080 --prefix /pentomino/',
      'http://localhost:8080/pentomino/',
      'node --test "tests/**/*.test.js"',
      '--test-skip-pattern=slow',
      'node tools\\stamp-version.mjs _site abc12345',
      'node tools\\check-site.mjs _site',
      'file://',
    ]) {
      assert.ok(readme.includes(expected), expected);
    }
  });
});
