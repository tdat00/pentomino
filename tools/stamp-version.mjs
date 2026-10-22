// @ts-check
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { classifyReference, fileKind, scanSource, splitReference, withVersion } from './site-scan.mjs';

const SOURCE_TREE_MARKERS = ['package.json', '.git', 'tasks', 'docs', 'tests', 'tools', '.github'];

/**
 * Rewrites every relative asset/module reference in one source text so that it
 * carries `?v=<version>`. Directory (navigation) targets are left alone.
 * @param {'html' | 'js' | 'css'} kind
 * @param {string} source
 * @param {string} version
 * @param {{ isDirectory?: (path: string) => boolean }} [options]
 * @returns {{ text: string, count: number, problems: string[] }}
 */
export function stampSource(kind, source, version, { isDirectory = () => false } = {}) {
  const scan = scanSource(kind, source);
  const problems = scan.problems.map((problem) => `line ${problem.line}: ${problem.message}`);
  /** @type {Array<{ start: number, end: number, text: string }>} */
  const edits = [];
  for (const ref of scan.refs) {
    if (!ref.stamp) {
      continue;
    }
    const type = classifyReference(ref.value, ref.type === 'module');
    if (type === 'absolute') {
      problems.push(`line ${ref.line}: root-absolute reference ${ref.value}`);
    } else if (type === 'relative') {
      const { path } = splitReference(ref.value);
      if (path !== '' && !path.endsWith('/') && !isDirectory(path)) {
        const text = withVersion(ref.value, version);
        if (text !== ref.value) {
          edits.push({ start: ref.start, end: ref.end, text });
        }
      }
    }
  }
  let text = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  }
  return { text, count: edits.length, problems };
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listFiles(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

/**
 * @param {string} problem
 * @returns {{ filesScanned: number, filesChanged: number, references: number, problems: string[] }}
 */
const failed = (problem) => ({ filesScanned: 0, filesChanged: 0, references: 0, problems: [problem] });

/**
 * Stamps a staged site copy in place. Nothing is written when any file has a
 * problem, so a failed run never leaves a half-stamped graph.
 * @param {string} siteDir
 * @param {string} version Eight-character commit prefix.
 * @returns {{ filesScanned: number, filesChanged: number, references: number, problems: string[] }}
 */
export function stampSite(siteDir, version) {
  const root = resolve(siteDir);
  if (!/^[0-9a-f]{8}$/i.test(version)) {
    return failed(`version must be 8 hexadecimal characters: ${version}`);
  }
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return failed(`site directory not found: ${siteDir}`);
  }
  const marker = SOURCE_TREE_MARKERS.find((name) => existsSync(join(root, name)));
  if (marker) {
    return failed(`refusing to stamp ${siteDir}: ${marker} marks a source checkout, not a staged copy`);
  }

  /** @type {string[]} */
  const problems = [];
  /** @type {Array<{ file: string, text: string }>} */
  const writes = [];
  let filesScanned = 0;
  let references = 0;
  for (const file of listFiles(root)) {
    const kind = fileKind(file);
    if (!kind) {
      continue;
    }
    const label = relative(root, file).split(sep).join('/');
    let source;
    try {
      source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(file));
    } catch {
      problems.push(`${label}: not valid UTF-8`);
      continue;
    }
    filesScanned += 1;
    const result = stampSource(kind, source, version, {
      isDirectory(path) {
        try {
          return statSync(resolve(dirname(file), decodeURIComponent(path))).isDirectory();
        } catch {
          return false;
        }
      },
    });
    problems.push(...result.problems.map((problem) => `${label}: ${problem}`));
    if (result.count > 0) {
      references += result.count;
      writes.push({ file, text: result.text });
    }
  }
  if (problems.length === 0) {
    for (const { file, text } of writes) {
      writeFileSync(file, text, 'utf8');
    }
  }
  return { filesScanned, filesChanged: problems.length === 0 ? writes.length : 0, references, problems };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [siteDir, version, ...extra] = process.argv.slice(2);
  if (!siteDir || !version || extra.length > 0) {
    console.error('Usage: node tools/stamp-version.mjs <siteDir> <sha8>');
    process.exitCode = 2;
  } else {
    const result = stampSite(siteDir, version);
    if (result.problems.length > 0) {
      console.error(result.problems.join('\n'));
      console.error(`stamp-version: ${result.problems.length} problem(s); no files were changed`);
      process.exitCode = 1;
    } else {
      console.log(
        `stamp-version: ${result.references} reference(s) in ${result.filesChanged} of ${result.filesScanned} file(s) stamped ?v=${version}`,
      );
    }
  }
}
