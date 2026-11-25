// @ts-check
// Firewall of the production files (check-list §3, §8): SHA-256 of every file under core/, generator/, player/,
// tests/ (without tests/artifacts/), tools/ (without tools/ig-proto/) and the root files. `snapshot` is taken at
// the start of a task, `check` at its end; any added, removed or changed file is a stop. No git.
//   node tools\ig-proto\firewall.mjs snapshot --task IGP-00 --label provisional
//   node tools\ig-proto\firewall.mjs check --task IGP-00 --label provisional
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { artifactDir, parseArgs, rel, ROOT } from './lib/paths.mjs';
import { sha256, writeJson } from './lib/records.mjs';

const ROOT_FILES = ['index.html', 'redirect.js', 'package.json', '.gitignore', '.gitattributes', '.editorconfig'];
const DIRS = ['core', 'generator', 'player', 'tests', 'tools'];
const SKIPPED = ['tests/artifacts', 'tools/ig-proto', 'node_modules', '.git'];

/** @param {string} path Repository-relative with `/`. @returns {boolean} */
const skipped = (path) => SKIPPED.some((s) => path === s || path.startsWith(`${s}/`) || path.endsWith(`/${s}`));

/**
 * @param {string} dir
 * @param {Record<string, string>} out
 */
function collect(dir, out) {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const label = rel(path);
    if (skipped(label)) {
      continue;
    }
    if (entry.isDirectory()) {
      collect(path, out);
    } else if (entry.isFile()) {
      out[label] = sha256(readFileSync(path));
    }
  }
}

/** @returns {{ files: Record<string, string>, hash: string }} Every guarded file with its hash, and their digest. */
export function manifest() {
  /** @type {Record<string, string>} */
  const found = {};
  for (const name of ROOT_FILES) {
    const path = join(ROOT, name);
    if (existsSync(path)) {
      found[name] = sha256(readFileSync(path));
    }
  }
  for (const dir of DIRS) {
    collect(join(ROOT, dir), found);
  }
  /** @type {Record<string, string>} */
  const files = {};
  for (const key of Object.keys(found).sort()) {
    files[key] = found[key];
  }
  const hash = sha256(Object.entries(files).map(([p, h]) => `${p}\t${h}`).join('\n'));
  return { files, hash };
}

/**
 * @param {Record<string, string>} before
 * @param {Record<string, string>} now
 * @returns {{ added: string[], removed: string[], changed: string[] }}
 */
export function diffManifests(before, now) {
  return {
    added: Object.keys(now).filter((p) => !(p in before)),
    removed: Object.keys(before).filter((p) => !(p in now)),
    changed: Object.keys(now).filter((p) => p in before && before[p] !== now[p]),
  };
}

/** @param {string[]} argv @returns {number} */
function main(argv) {
  const [command, ...rest] = argv;
  const { args, on } = parseArgs(rest, { values: ['task', 'label', 'source-label'], switches: ['replace'] });
  if ((command !== 'snapshot' && command !== 'check') || args.task === undefined || args.label === undefined) {
    process.stderr.write('usage: firewall.mjs snapshot|check --task <T> --label <L>\n');
    return 1;
  }
  const file = join(artifactDir(args.label, args.task), 'firewall-before.json');
  const now = manifest();
  if (command === 'snapshot') {
    if (existsSync(file) && !on.has('replace')) {
      const before = JSON.parse(readFileSync(file, 'utf8'));
      const diff = diffManifests(before.files, now.files);
      if (diff.added.length + diff.removed.length + diff.changed.length > 0) {
        process.stderr.write(`firewall: a snapshot of ${args.task} exists and differs from the files now: ${JSON.stringify(diff)}\n`);
        return 1;
      }
      process.stdout.write(`firewall: snapshot of ${args.task} already taken (${now.hash.slice(0, 12)}), files unchanged\n`);
      return 0;
    }
    writeJson(file, {
      format: 'ig-proto-firewall', version: 1, task: args.task, label: args.label, createdAt: new Date().toISOString(),
      count: Object.keys(now.files).length, hash: now.hash, files: now.files,
    });
    process.stdout.write(`firewall: snapshot of ${args.task}: ${Object.keys(now.files).length} files, ${now.hash.slice(0, 12)}\n`);
    return 0;
  }
  if (!existsSync(file)) {
    process.stderr.write(`firewall: no snapshot of ${args.task} (${rel(file)})\n`);
    return 1;
  }
  const before = JSON.parse(readFileSync(file, 'utf8'));
  const diff = diffManifests(before.files, now.files);
  const bad = diff.added.length + diff.removed.length + diff.changed.length;
  if (bad > 0) {
    for (const [kind, list] of Object.entries(diff)) {
      for (const p of list) {
        process.stderr.write(`firewall: ${kind}: ${p}\n`);
      }
    }
    process.stderr.write(`firewall: ${bad} production file(s) differ from the snapshot of ${args.task}\n`);
    return 1;
  }
  process.stdout.write(`firewall: OK, ${Object.keys(now.files).length} production files unchanged since the snapshot of ${args.task}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`firewall: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
