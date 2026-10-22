// @ts-check
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { classifyReference, fileKind, readVersion, scanSource } from './site-scan.mjs';

const PAGES = ['index.html', 'generator/index.html', 'player/index.html'];
const ARTIFACT_FORBIDDEN = ['tasks', 'docs', 'tests', 'tools', '.github'];

/**
 * Validates a static site directory: pages, CSP, local references and the
 * browser module graph.
 * @param {string} siteDir
 * @param {{ entries?: string[], expectVersion?: string }} [options] `entries` are HTML files relative to
 *   the root that replace the default pages and skip the publication policy checks (for local harnesses).
 *   `expectVersion` requires every stampable reference to carry `?v=<expectVersion>`.
 * @returns {string[]} Problem descriptions.
 */
export function checkSite(siteDir, { entries, expectVersion } = {}) {
  const root = resolve(siteDir);
  /** @type {string[]} */
  const problems = [];
  const visited = new Set();
  /** @type {Array<{ where: string, value: string, version: string | null }>} */
  const stamped = [];

  /** @param {string} file */
  const label = (file) => relative(root, file).split(sep).join('/');

  /**
   * @param {string} from Referencing file.
   * @param {string} ref Reference text.
   * @param {{ external?: 'allow' | 'deny', allowDirectory?: boolean }} [options]
   * @returns {{ path: string, directory: boolean } | null} Resolved local path when the reference is checkable.
   */
  function resolveRef(from, ref, { external = 'deny', allowDirectory = true } = {}) {
    const where = label(from);
    const value = ref.trim();
    const kind = classifyReference(value);
    if (kind === 'local' || /^data:/i.test(value)) {
      return null;
    }
    if (kind === 'external') {
      if (external === 'deny') {
        problems.push(`${where}: external reference ${value}`);
      }
      return null;
    }
    if (kind === 'absolute') {
      problems.push(`${where}: root-absolute path ${value}`);
      return null;
    }
    let path;
    try {
      path = decodeURIComponent(value.replace(/[?#].*$/, ''));
    } catch {
      problems.push(`${where}: malformed reference ${value}`);
      return null;
    }
    const target = resolve(dirname(from), path);
    if (target !== root && !target.startsWith(root + sep)) {
      problems.push(`${where}: reference escapes the site ${value}`);
      return null;
    }
    if (!existsSync(target)) {
      problems.push(`${where}: missing local reference ${value}`);
      return null;
    }
    if (statSync(target).isDirectory()) {
      const index = join(target, 'index.html');
      if (!allowDirectory || !existsSync(index)) {
        problems.push(`${where}: reference ${value} is a directory without index.html`);
        return null;
      }
      return { path: index, directory: true };
    }
    if (extname(target).toLowerCase() === '.mjs') {
      problems.push(`${where}: browser reference to .mjs file ${value}`);
      return null;
    }
    return { path: target, directory: false };
  }

  /**
   * @param {string} file
   * @returns {string}
   */
  function read(file) {
    return readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  }

  /**
   * Resolves every reference found in a file and follows script/CSS dependencies.
   * @param {string} file
   * @param {import('./site-scan.mjs').ScanResult} scan
   */
  function processRefs(file, scan) {
    const where = label(file);
    for (const problem of scan.problems) {
      problems.push(`${where}: line ${problem.line}: ${problem.message}`);
    }
    for (const ref of scan.refs) {
      const isModule = ref.type === 'module';
      const kind = classifyReference(ref.value, isModule);
      if (isModule && (kind === 'bare' || kind === 'external')) {
        problems.push(`${where}: bare or external module specifier ${ref.value}`);
        continue;
      }
      const target = resolveRef(file, ref.value, {
        external: ref.type === 'nav' ? 'allow' : 'deny',
        allowDirectory: !isModule,
      });
      if (!target) {
        continue;
      }
      if (ref.stamp && !target.directory && kind === 'relative') {
        stamped.push({ where: `${where}: line ${ref.line}`, value: ref.value, version: readVersion(ref.value) });
      }
      const extension = extname(target.path).toLowerCase();
      if (['script', 'module', 'url'].includes(ref.type) && extension === '.js') {
        walk(target.path, 'js');
      } else if (['link', 'css-import'].includes(ref.type) && extension === '.css') {
        walk(target.path, 'css');
      }
    }
  }

  /**
   * @param {string} file
   * @param {'js' | 'css'} kind
   */
  function walk(file, kind) {
    if (!visited.has(file)) {
      visited.add(file);
      processRefs(file, scanSource(kind, read(file)));
    }
  }

  /**
   * @param {string} file
   * @param {boolean} policy Whether to enforce the publication rules (CSP, no inline code).
   */
  function checkPage(file, policy) {
    const where = label(file);
    const scan = scanSource('html', read(file));
    processRefs(file, scan);
    if (!policy) {
      return;
    }
    let hasCsp = false;
    for (const tag of scan.tags) {
      const attrs = Object.fromEntries([...tag.attrs].map(([name, attr]) => [name, attr.value ?? '']));
      if (Object.keys(attrs).some((key) => /^on\w+/.test(key))) {
        problems.push(`${where}: inline event handler on <${tag.name}>`);
      }
      if ('style' in attrs) {
        problems.push(`${where}: inline style attribute on <${tag.name}>`);
      }
      if (tag.name === 'meta' && attrs['http-equiv']?.toLowerCase() === 'content-security-policy') {
        hasCsp = true;
        const policyText = attrs.content ?? '';
        if (/'unsafe-(?:inline|eval)'/.test(policyText) || !/script-src\s+'self'/.test(policyText)) {
          problems.push(`${where}: CSP must restrict script-src to 'self' without unsafe-*`);
        }
      }
      if (tag.name === 'script' && !('src' in attrs)) {
        problems.push(`${where}: inline <script>`);
      }
      if (tag.name === 'style') {
        problems.push(`${where}: inline <style>`);
      }
    }
    if (!hasCsp) {
      problems.push(`${where}: missing Content-Security-Policy meta`);
    }
  }

  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return [`${basename(root)}: site directory not found`];
  }
  if (entries && entries.length > 0) {
    for (const entry of entries) {
      const file = resolve(root, entry);
      if (!file.startsWith(root + sep) || fileKind(file) !== 'html') {
        problems.push(`${entry}: entry must be an HTML file inside the root`);
      } else if (!existsSync(file) || !statSync(file).isFile()) {
        problems.push(`${entry}: entry not found`);
      } else {
        checkPage(file, false);
      }
    }
  } else {
    if (existsSync(join(root, 'redirect.js'))) {
      walk(join(root, 'redirect.js'), 'js');
    } else {
      problems.push('redirect.js: missing');
    }
    for (const page of PAGES) {
      const file = join(root, ...page.split('/'));
      if (existsSync(file)) {
        checkPage(file, true);
      } else {
        problems.push(`${page}: missing`);
      }
    }
    if (!existsSync(join(root, 'package.json'))) {
      for (const name of ARTIFACT_FORBIDDEN) {
        if (existsSync(join(root, name))) {
          problems.push(`${name}: must not be part of a deployment artifact`);
        }
      }
    }
  }

  if (expectVersion !== undefined) {
    for (const item of stamped.filter((entry) => entry.version !== expectVersion)) {
      problems.push(`${item.where}: reference ${item.value} is not stamped ?v=${expectVersion}`);
    }
  } else {
    /** @type {Map<string, number>} */
    const counts = new Map();
    for (const item of stamped) {
      if (item.version !== null) {
        counts.set(item.version, (counts.get(item.version) ?? 0) + 1);
      }
    }
    if (counts.size > 0) {
      const [dominant] = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
      for (const item of stamped.filter((entry) => entry.version !== dominant)) {
        problems.push(`${item.where}: mixed version graph: reference ${item.value} lacks ?v=${dominant}`);
      }
    }
  }
  return problems;
}

/**
 * @param {string[]} argv
 * @returns {{ root: string, entries: string[], expectVersion?: string }}
 */
export function parseArgs(argv) {
  /** @type {string[]} */
  const positional = [];
  /** @type {string[]} */
  const entries = [];
  /** @type {string | undefined} */
  let expectVersion;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--entry' || arg === '--expect-version') {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error(`Missing value for ${arg}`);
      }
      if (arg === '--entry') {
        entries.push(value);
      } else {
        expectVersion = value;
      }
      i += 1;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length > 1) {
    throw new Error(`Unexpected argument: ${positional[1]}`);
  }
  return { root: positional[0] ?? '.', entries, expectVersion };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { root, entries, expectVersion } = parseArgs(process.argv.slice(2));
    const problems = checkSite(root, { entries, expectVersion });
    if (problems.length > 0) {
      console.error(problems.join('\n'));
      console.error(`check-site: ${problems.length} problem(s)`);
      process.exitCode = 1;
    } else {
      console.log('check-site: OK');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('Usage: node tools/check-site.mjs [root] [--entry <relativeHtml>]... [--expect-version <sha8>]');
    process.exitCode = 2;
  }
}
