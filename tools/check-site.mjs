// @ts-check
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const PAGES = ['index.html', 'generator/index.html', 'player/index.html'];
const ARTIFACT_FORBIDDEN = ['tasks', 'docs', 'tests', 'tools', '.github'];
const EXTERNAL = /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/;

/**
 * Validates a static site directory: pages, CSP, local references and the
 * browser module graph.
 * @param {string} siteDir
 * @returns {string[]} Problem descriptions.
 */
export function checkSite(siteDir) {
  const root = resolve(siteDir);
  /** @type {string[]} */
  const problems = [];
  const visited = new Set();

  /** @param {string} file */
  const label = (file) => relative(root, file).split(sep).join('/');

  /**
   * @param {string} from Referencing file.
   * @param {string} ref Reference text.
   * @param {{ external?: 'allow' | 'deny', allowDirectory?: boolean }} [options]
   * @returns {string | null} Resolved local path when the reference is checkable.
   */
  function resolveRef(from, ref, { external = 'deny', allowDirectory = true } = {}) {
    const where = label(from);
    const value = ref.trim();
    if (value === '' || value.startsWith('#') || /^data:/i.test(value)) {
      return null;
    }
    if (EXTERNAL.test(value)) {
      if (external === 'deny') {
        problems.push(`${where}: external reference ${value}`);
      }
      return null;
    }
    if (value.startsWith('/')) {
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
      return index;
    }
    if (extname(target).toLowerCase() === '.mjs') {
      problems.push(`${where}: browser reference to .mjs file ${value}`);
      return null;
    }
    return target;
  }

  /**
   * @param {string} file
   * @returns {string}
   */
  function read(file) {
    return readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  }

  /** @param {string} file */
  function walkCss(file) {
    if (visited.has(file)) {
      return;
    }
    visited.add(file);
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of css.matchAll(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)/g)) {
      const target = resolveRef(file, match[1]);
      if (target && extname(target) === '.css') {
        walkCss(target);
      }
    }
    for (const match of css.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g)) {
      resolveRef(file, match[1]);
    }
  }

  /** @param {string} file */
  function walkScript(file) {
    if (visited.has(file)) {
      return;
    }
    visited.add(file);
    const source = read(file)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    /** @type {string[]} */
    const modules = [];
    for (const match of source.matchAll(/(?:^|[\s;}])(?:import|export)\s+(?:[^'"()]*?\bfrom\s*)?['"]([^'"]+)['"]/g)) {
      modules.push(match[1]);
    }
    for (const match of source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      modules.push(match[1]);
    }
    for (const specifier of modules) {
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        problems.push(`${label(file)}: bare or external module specifier ${specifier}`);
        continue;
      }
      const target = resolveRef(file, specifier, { allowDirectory: false });
      if (target) {
        walkScript(target);
      }
    }
    for (const match of source.matchAll(/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)) {
      const target = resolveRef(file, match[1]);
      if (target && extname(target).toLowerCase() === '.js') {
        walkScript(target);
      }
    }
  }

  /** @param {string} file */
  function checkPage(file) {
    const where = label(file);
    const html = read(file).replace(/<!--[\s\S]*?-->/g, '');
    let hasCsp = false;
    for (const tag of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^>]*)?)>/g)) {
      const name = tag[1].toLowerCase();
      /** @type {Record<string, string>} */
      const attrs = {};
      for (const attr of tag[2].matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3];
      }
      if (Object.keys(attrs).some((key) => /^on\w+/.test(key))) {
        problems.push(`${where}: inline event handler on <${name}>`);
      }
      if ('style' in attrs) {
        problems.push(`${where}: inline style attribute on <${name}>`);
      }
      if (name === 'meta' && attrs['http-equiv']?.toLowerCase() === 'content-security-policy') {
        hasCsp = true;
        const policy = attrs.content ?? '';
        if (/'unsafe-(?:inline|eval)'/.test(policy) || !/script-src\s+'self'/.test(policy)) {
          problems.push(`${where}: CSP must restrict script-src to 'self' without unsafe-*`);
        }
      }
      if (name === 'script') {
        if (attrs.src === undefined) {
          problems.push(`${where}: inline <script>`);
        } else {
          const target = resolveRef(file, attrs.src);
          if (target && extname(target).toLowerCase() === '.js') {
            walkScript(target);
          }
        }
      } else if (name === 'link' && attrs.href !== undefined) {
        const target = resolveRef(file, attrs.href);
        if (target && extname(target).toLowerCase() === '.css') {
          walkCss(target);
        }
      } else if (name === 'a' && attrs.href !== undefined) {
        resolveRef(file, attrs.href, { external: 'allow' });
      } else if (['img', 'source', 'iframe', 'audio', 'video'].includes(name) && attrs.src !== undefined) {
        resolveRef(file, attrs.src);
      }
    }
    if (/<style[\s>]/i.test(html)) {
      problems.push(`${where}: inline <style>`);
    }
    if (!hasCsp) {
      problems.push(`${where}: missing Content-Security-Policy meta`);
    }
  }

  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return [`${basename(root)}: site directory not found`];
  }
  if (existsSync(join(root, 'redirect.js'))) {
    walkScript(join(root, 'redirect.js'));
  } else {
    problems.push('redirect.js: missing');
  }
  for (const page of PAGES) {
    const file = join(root, ...page.split('/'));
    if (existsSync(file)) {
      checkPage(file);
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
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = checkSite(process.argv[2] ?? '.');
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    console.error(`check-site: ${problems.length} problem(s)`);
    process.exitCode = 1;
  } else {
    console.log('check-site: OK');
  }
}
