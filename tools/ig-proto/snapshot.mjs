// @ts-check
// Hash manifest of the frozen source snapshot (task pack v4, V4-T01a, D-V4-01). The folder
// tests/artifacts/ig-proto/frozen-source/ is extracted once by the developer's `git archive` command (T01a step 4);
// `record` writes its manifest once, `verify` compares the folder with it. This file runs no git. Text files are
// hashed with LF line ends (hash rule `lf-text`), so the manifest does not depend on the extraction's line endings.
//   node tools/ig-proto/snapshot.mjs record | verify
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { FROZEN_COMMIT, FROZEN_SOURCE_DIR, rel, SNAPSHOT_MANIFEST } from './lib/paths.mjs';
import { lf, sha256, writeJson } from './lib/records.mjs';

const USAGE = 'usage: node tools/ig-proto/snapshot.mjs record | verify';
/** Every text file is hashed with LF line ends (the rule of `sha256File`), a file with a NUL byte as it is. */
const HASH_RULE = 'lf-text';
const HASH_RULE_REFUSAL = `the manifest's hash rule is not ${HASH_RULE}`;

/** @typedef {{ path: string, sha256: string, bytes: number, text: boolean }} SnapshotEntry */
/** @typedef {{ ok: boolean, files: number, differences: string[] }} SnapshotResult */

/**
 * @param {string} [dir] The folder to hash (default: the frozen source).
 * @returns {SnapshotEntry[]} Every file below the folder, sorted by the `/`-separated path relative to the folder.
 *   `sha256` and `bytes` are those of the hashed content: UTF-8 text with LF line ends, or the raw bytes of a file
 *   with a NUL byte (`text` false).
 */
export function snapshotEntries(dir = FROZEN_SOURCE_DIR) {
  /** @type {SnapshotEntry[]} */
  const out = [];
  const visit = (/** @type {string} */ folder, /** @type {string} */ prefix) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = `${prefix}${entry.name}`;
      if (entry.isDirectory()) {
        visit(join(folder, entry.name), `${path}/`);
      } else if (entry.isFile()) {
        const raw = readFileSync(join(folder, entry.name));
        const text = !raw.includes(0);
        // The rule of sha256File (lib/records.mjs:30): the manifest does not depend on the line endings of the extraction.
        const hashed = text ? Buffer.from(lf(raw.toString('utf8')), 'utf8') : raw;
        out.push({ path, sha256: sha256(hashed), bytes: hashed.length, text });
      } else {
        throw new Error(`${path} is neither a file nor a folder`);
      }
    }
  };
  visit(dir, '');
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * @param {SnapshotEntry[]} entries Sorted by path.
 * @returns {string} SHA-256 of the concatenated "path\tsha256\n" lines.
 */
export const entriesDigest = (entries) => sha256(entries.map((e) => `${e.path}\t${e.sha256}\n`).join(''));

/**
 * The comparison `verify` and `verifySnapshot` use.
 * @param {SnapshotEntry[]} entries The folder's entries now.
 * @param {{ entries: SnapshotEntry[] }} manifest The recorded manifest.
 * @returns {SnapshotResult} One difference per path, in path order: `missing`, `extra` or `changed`.
 */
export function compareSnapshot(entries, manifest) {
  const recorded = new Map(manifest.entries.map((e) => /** @type {[string, SnapshotEntry]} */ ([e.path, e])));
  const found = new Map(entries.map((e) => /** @type {[string, SnapshotEntry]} */ ([e.path, e])));
  /** @type {string[]} */
  const differences = [];
  for (const path of [...new Set([...recorded.keys(), ...found.keys()])].sort()) {
    const was = recorded.get(path);
    const now = found.get(path);
    if (now === undefined) {
      differences.push(`missing: ${path}`);
    } else if (was === undefined) {
      differences.push(`extra: ${path}`);
    } else if (was.sha256 !== now.sha256 || was.bytes !== now.bytes || was.text !== now.text) {
      differences.push(`changed: ${path}`);
    }
  }
  return { ok: differences.length === 0, files: entries.length, differences };
}

/** @returns {SnapshotResult} The frozen source folder compared with its recorded manifest. */
export function verifySnapshot() {
  if (!existsSync(SNAPSHOT_MANIFEST)) {
    return { ok: false, files: 0, differences: [`manifest missing: ${rel(SNAPSHOT_MANIFEST)}`] };
  }
  if (!existsSync(FROZEN_SOURCE_DIR)) {
    return { ok: false, files: 0, differences: [`folder missing: ${rel(FROZEN_SOURCE_DIR)}`] };
  }
  const manifest = JSON.parse(readFileSync(SNAPSHOT_MANIFEST, 'utf8'));
  if (manifest.format !== 'ig-proto-snapshot' || manifest.version !== 1 || manifest.frozenCommit !== FROZEN_COMMIT
    || !Array.isArray(manifest.entries)) {
    return { ok: false, files: 0, differences: [`manifest not valid: ${rel(SNAPSHOT_MANIFEST)}`] };
  }
  if (manifest.hashRule !== HASH_RULE) {
    return { ok: false, files: 0, differences: [HASH_RULE_REFUSAL] };
  }
  return compareSnapshot(snapshotEntries(), manifest);
}

/** @param {string[]} argv @returns {number} The exit code. */
function main(argv) {
  const [command, ...rest] = argv;
  if (command === undefined || (command === '--help' && rest.length === 0)) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if ((command !== 'record' && command !== 'verify') || rest.length > 0) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  if (command === 'record') {
    if (existsSync(SNAPSHOT_MANIFEST)) {
      process.stderr.write('snapshot: the manifest exists\n');
      return 1;
    }
    if (!existsSync(FROZEN_SOURCE_DIR)) {
      process.stderr.write(`snapshot: the folder is missing: ${rel(FROZEN_SOURCE_DIR)}\n`);
      return 1;
    }
    const entries = snapshotEntries();
    if (entries.length === 0) {
      process.stderr.write(`snapshot: the folder has no file: ${rel(FROZEN_SOURCE_DIR)}\n`);
      return 1;
    }
    const digest = entriesDigest(entries);
    writeJson(SNAPSHOT_MANIFEST, {
      format: 'ig-proto-snapshot', version: 1, frozenCommit: FROZEN_COMMIT, hashRule: HASH_RULE, files: entries.length, digest, entries,
    });
    process.stdout.write(`snapshot: recorded ${entries.length} files (digest ${digest.slice(0, 12)}) in ${rel(SNAPSHOT_MANIFEST)}\n`);
    return 0;
  }
  const result = verifySnapshot();
  if (result.ok) {
    process.stdout.write(`snapshot: verified (${result.files} files)\n`);
    return 0;
  }
  if (result.differences[0] === HASH_RULE_REFUSAL) {
    process.stderr.write(`snapshot: ${HASH_RULE_REFUSAL}\n`);
    return 1;
  }
  process.stderr.write(`snapshot: ${result.differences.length} difference(s) from the manifest; the first ten:\n`);
  for (const difference of result.differences.slice(0, 10)) {
    process.stderr.write(`  ${difference}\n`);
  }
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`snapshot: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
