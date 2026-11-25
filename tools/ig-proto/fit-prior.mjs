// @ts-check
// P4's table prior (D-IG6): per cell, the median clue share of the accepted puzzles of MP12b1's reps 10-19, which are
// held out from the measured reps 0-9. Unlocked: it reads MP12b1's reports and rates nothing. When the file exists the
// script recomputes it and exits 1 if it differs; `--replace` rewrites it on the pack author's instruction only.
//   node tools\ig-proto\fit-prior.mjs [--replace] [--label <L>] [--source-label <SL>]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { median } from '../bench/report.js';
import { IG_DIR, MP12B1_DIGEST, mp12b1Report, parseArgs } from './lib/paths.mjs';
import { lf, writeJson } from './lib/records.mjs';
import { loadCatalogue } from './lib/sets.mjs';

export const PRIOR_FILE = join(IG_DIR, 'data', 'prior-v1.json');
const REPS = Object.freeze({ from: 10, to: 19 });

/** @param {number} x @returns {number} */
const round6 = (x) => Math.round(x * 1e6) / 1e6;

/** @returns {{ version: 1, rule: string, source: { sourceDigest: string, reports: string[] }, cells: Record<string, any> }} */
export function computePrior() {
  const cases = loadCatalogue().cases;
  /** @type {Record<string, { caseId: string, share: number, n: number }>} */
  const cells = {};
  /** @type {string[]} */
  const reports = [];
  for (const caseId of Object.keys(cases).sort()) {
    const found = mp12b1Report(caseId);
    if (found === null) {
      continue;
    }
    if (found.report.meta.sourceDigest !== MP12B1_DIGEST) {
      throw new Error(`${found.path} has another source digest`);
    }
    /** @type {number[]} */
    const shares = [];
    for (const run of found.report.runs) {
      if (run.probeKind !== 'generation' || run.rep < REPS.from || run.rep > REPS.to) {
        continue;
      }
      for (const puzzle of run.details?.puzzles ?? []) {
        shares.push(puzzle.clues / run.details.K);
      }
    }
    if (shares.length === 0) {
      continue;
    }
    const key = `${cases[caseId].levelId}@${cases[caseId].area}`;
    if (cells[key] !== undefined) {
      throw new Error(`two cases map to the prior cell ${key}: ${cells[key].caseId} and ${caseId}`);
    }
    cells[key] = { caseId, share: round6(/** @type {number} */ (median(shares))), n: shares.length };
    reports.push(found.path);
  }
  return {
    version: 1,
    rule: 'median clue share of the accepted puzzles of MP12b1 reps 10-19 (held out from the measured reps 0-9)',
    source: { sourceDigest: MP12B1_DIGEST, reports },
    cells: Object.fromEntries(Object.entries(cells).sort(([a], [b]) => (a < b ? -1 : 1))),
  };
}

/** @param {string[]} argv @returns {number} */
function main(argv) {
  const { on } = parseArgs(argv, { values: ['label', 'source-label'], switches: ['replace'] });
  const prior = computePrior();
  const text = lf(JSON.stringify(prior, null, 2));
  if (existsSync(PRIOR_FILE) && !on.has('replace')) {
    const same = lf(readFileSync(PRIOR_FILE, 'utf8')).trimEnd() === text.trimEnd();
    if (!same) {
      process.stderr.write('fit-prior: data/prior-v1.json differs from the recomputed table (use --replace on the pack author\'s instruction)\n');
      return 1;
    }
    process.stdout.write(`fit-prior: data/prior-v1.json reproduced (${Object.keys(prior.cells).length} cells)\n`);
    return 0;
  }
  writeJson(PRIOR_FILE, prior);
  process.stdout.write(`fit-prior: wrote data/prior-v1.json (${Object.keys(prior.cells).length} cells from ${prior.source.reports.length} reports)\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`fit-prior: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
