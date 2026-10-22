// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css', '.json', '.yml', '.yaml', '.md']);
const ROOT_FILES = ['index.html', 'redirect.js', 'package.json', '.editorconfig', '.gitattributes', '.gitignore'];
const SCOPE_DIRS = ['core', 'generator', 'player', 'tools', 'tests', '.github'];
const SKIPPED_DIRS = new Set(['artifacts', 'node_modules', '.git']);

/**
 * Checks one authored text file against the repository conventions.
 * @param {string} name Label used in messages.
 * @param {Buffer} buffer
 * @returns {string[]} Problem descriptions.
 */
export function checkText(name, buffer) {
  /** @type {string[]} */
  const problems = [];
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    problems.push(`${name}: UTF-8 BOM`);
    buffer = buffer.subarray(3);
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    problems.push(`${name}: not valid UTF-8`);
    return problems;
  }
  if (!text.endsWith('\n')) {
    problems.push(`${name}: missing final newline`);
  }
  const isMarkdown = extname(name).toLowerCase() === '.md';
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  lines.forEach((rawLine, index) => {
    const where = `${name}:${index + 1}`;
    const terminated = index < lines.length - 1 || text.endsWith('\n');
    let line = rawLine;
    if (terminated) {
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      } else {
        problems.push(`${where}: LF-only line ending`);
      }
    }
    if (line.includes('\r')) {
      problems.push(`${where}: stray CR`);
    }
    const trailing = /[ \t]+$/.exec(line)?.[0];
    if (trailing !== undefined) {
      const hardBreak = isMarkdown && trailing === '  ' && line.trim() !== '';
      if (!hardBreak) {
        problems.push(`${where}: trailing whitespace`);
      }
    }
    if (/^ *\t/.test(line)) {
      problems.push(`${where}: tab indentation`);
    }
  });
  return problems;
}

/**
 * @param {string} dir
 * @param {string[]} out
 */
function collect(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) {
        collect(join(dir, entry.name), out);
      }
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      out.push(join(dir, entry.name));
    }
  }
}

/**
 * Checks the production, test and tool paths plus designated root files.
 * Historical docs, tasks and prototypes are out of scope.
 * @param {string} root
 * @returns {string[]}
 */
export function checkConventions(root) {
  /** @type {string[]} */
  const files = [];
  for (const name of ROOT_FILES) {
    files.push(join(root, name));
  }
  for (const dir of SCOPE_DIRS) {
    try {
      collect(join(root, dir), files);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  /** @type {string[]} */
  const problems = [];
  for (const file of files) {
    const label = relative(root, file).split('\\').join('/');
    try {
      problems.push(...checkText(label, readFileSync(file)));
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
        problems.push(`${label}: missing`);
      } else {
        throw error;
      }
    }
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const problems = checkConventions(root);
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    console.error(`check-conventions: ${problems.length} problem(s)`);
    process.exitCode = 1;
  } else {
    console.log('check-conventions: OK');
  }
}
