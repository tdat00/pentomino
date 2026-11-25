// @ts-check
// The frozen board catalogue data/boards-v1.json (D-IG13): every case of the worktree's landscape matrix, so that
// the harness can name boards by case id even after the production source stops offering a cell.
//   node tools\ig-proto\boards.mjs write --source-label <label>    (refuses an existing file unless --replace)
//   node tools\ig-proto\boards.mjs check [--strict]                (informational on the frozen source)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildLandscapeMatrix } from '../bench/calibration-reference.js';
import { IG_DIR, argValue, parseArgs, rel } from './lib/paths.mjs';
import { worktreeDigest, writeJson } from './lib/records.mjs';

export const CATALOGUE = join(IG_DIR, 'data', 'boards-v1.json');

/** @returns {Record<string, any>} The landscape cases of the current source in the catalogue's shape. */
export function currentCases() {
  /** @type {Record<string, any>} */
  const cases = {};
  for (const c of buildLandscapeMatrix({ seeds: 1 }).cases) {
    const { repetitions, ...fields } = /** @type {any} */ (c);
    void repetitions;
    cases[c.id] = { ...fields, area: c.boardRows.join('').replace(/\./g, '').length };
  }
  return cases;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const [command, ...rest] = argv;
  const { args, on } = parseArgs(rest, { values: ['label', 'source-label'], switches: ['replace', 'strict'] });
  if (command === 'write') {
    if (existsSync(CATALOGUE) && !on.has('replace')) {
      process.stderr.write(`boards: ${rel(CATALOGUE)} exists; --replace only on the pack author's instruction\n`);
      return 1;
    }
    const cases = currentCases();
    writeJson(CATALOGUE, {
      version: 1,
      source: { label: args['source-label'] ?? argValue('source-label') ?? 'unlabelled', sourceDigest: await worktreeDigest() },
      cases,
    });
    process.stdout.write(`boards: wrote ${rel(CATALOGUE)}: ${Object.keys(cases).length} cases\n`);
    return 0;
  }
  if (command === 'check') {
    const saved = JSON.parse(readFileSync(CATALOGUE, 'utf8'));
    const now = currentCases();
    const differences = [];
    for (const id of new Set([...Object.keys(saved.cases), ...Object.keys(now)])) {
      if (!(id in now)) {
        differences.push(`${id}: in the catalogue, not offered by the current source`);
      } else if (!(id in saved.cases)) {
        differences.push(`${id}: offered by the current source, not in the catalogue`);
      } else if (JSON.stringify(saved.cases[id]) !== JSON.stringify(now[id])) {
        differences.push(`${id}: differs`);
      }
    }
    for (const d of differences) {
      process.stdout.write(`boards: ${d}\n`);
    }
    process.stdout.write(`boards: ${differences.length} difference(s) between the catalogue and the current source\n`);
    return differences.length > 0 && on.has('strict') ? 1 : 0;
  }
  process.stderr.write('usage: boards.mjs write|check\n');
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`boards: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
