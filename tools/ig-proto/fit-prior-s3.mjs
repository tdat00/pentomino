// @ts-check
// P4's table prior of the freeze (stages 2 to 4 pack T06a, plan 4.1, D-S24-10, D-S24-21): `prior-v1`'s Nightmare
// entries and a complete Hell 1 table from V4-S2's fr-base pilots (four boards) and IGP-05's windows (eight boards).
// Unlocked: it reads committed records and rates nothing. Check mode by default; `--write` writes the file once.
//   node tools\ig-proto\fit-prior-s3.mjs [--write] --label frozen --source-label <SL>
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { IG_DIR, parseArgs, ROOT } from './lib/paths.mjs';
import { lf, sha256File, writeJson } from './lib/records.mjs';
import { loadCatalogue } from './lib/sets.mjs';
import { median } from './verdicts.mjs';

export const PRIOR_S3_FILE = join(IG_DIR, 'data', 'prior-s3-v1.json');
export const PILOT_CELLS = Object.freeze(['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1']);

const PRIOR_V1 = 'tools/ig-proto/data/prior-v1.json';
const PILOT_DIR = 'docs/improve-generating/evidence/frozen/V4-S2/fr-base';
const FAMILY_DIR = 'docs/improve-generating/evidence/provisional/IGP-05';
const FAMILY_FILES = Object.freeze(['families-windows.jsonl', 'families-failed-sets.jsonl']);
const REPS = Object.freeze([0, 1, 2, 3, 4]);

/** @param {number} x @returns {number} */
const round6 = (x) => Math.round(x * 1e6) / 1e6;

/** @param {string} relPath Repository-relative path with `/`. @returns {string} Absolute path. */
const absPath = (relPath) => join(ROOT, ...relPath.split('/'));

/** @param {string} relPath @returns {{ path: string, sha256: string }} */
const ref = (relPath) => ({ path: relPath, sha256: sha256File(absPath(relPath)) });

/** @param {string} relPath @returns {any[]} The JSON lines of a committed file. */
const jsonLines = (relPath) => readFileSync(absPath(relPath), 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));

/**
 * The piloted rule: per rep (reps 0 to 4 of the `start` line's `row`, `<cell>~<rep>`) the median of `end.locate.wc /
 * start.K` over the calls whose `end` has a finite `locate.wc`; the share is the median of the five per-rep medians.
 * @param {any[]} lines The lines of one calls file.
 * @returns {{ share: number, n: number }}
 */
export function pilotShare(lines) {
  /** @type {Map<string, any>} */
  const starts = new Map();
  for (const line of lines) {
    if (line.t === 'start') {
      starts.set(line.call, line);
    }
  }
  /** @type {Map<number, number[]>} */
  const perRep = new Map();
  let n = 0;
  for (const line of lines) {
    if (line.t !== 'end' || !Number.isFinite(line.locate?.wc)) {
      continue;
    }
    const start = starts.get(line.call);
    if (start === undefined) {
      throw new Error(`fit-prior-s3: call ${line.call} has no start line`);
    }
    const rep = Number(String(start.row).split('~')[1]);
    if (!REPS.includes(rep)) {
      continue;
    }
    perRep.set(rep, [...(perRep.get(rep) ?? []), line.locate.wc / start.K]);
    n += 1;
  }
  const medians = REPS.map((rep) => {
    const values = perRep.get(rep);
    if (values === undefined) {
      throw new Error(`fit-prior-s3: rep ${rep} has no call`);
    }
    return median(values);
  });
  return { share: round6(median(medians)), n };
}

/**
 * The window rule: per family the median of `count / set.K` over its probes with `eligible && inBand` (a family
 * without such a probe is skipped); per seed (`set.seed`) the median of its families' medians; the share is the median
 * over the seeds of those values.
 * @param {any[]} families The families of one case.
 * @returns {{ share: number, n: number, seeds: number }}
 */
export function familyShare(families) {
  /** @type {Map<string, number[]>} */
  const bySeed = new Map();
  let n = 0;
  for (const family of families) {
    const values = family.probes.filter((/** @type {any} */ p) => p.eligible && p.inBand).map((/** @type {any} */ p) => p.count / family.set.K);
    n += values.length;
    if (values.length > 0) {
      bySeed.set(family.set.seed, [...(bySeed.get(family.set.seed) ?? []), median(values)]);
    }
  }
  if (n === 0) {
    throw new Error('fit-prior-s3: no eligible probe');
  }
  return { share: round6(median([...bySeed.values()].map((v) => median(v)))), n, seeds: bySeed.size };
}

/** @returns {{ version: 1, id: 'prior-s3-v1', rule: string, source: { priorV1: { path: string, sha256: string }, pilots: { path: string, sha256: string }[], families: { path: string, sha256: string }[] }, cells: Record<string, any> }} */
export function computePriorS3() {
  const cases = loadCatalogue().cases;
  const prior = JSON.parse(readFileSync(absPath(PRIOR_V1), 'utf8'));
  /** @type {Record<string, any>} */
  const cells = {};
  for (const [key, cell] of Object.entries(prior.cells)) {
    if (key.startsWith('nightmare@')) {
      cells[key] = cell;
    }
  }
  /** @type {Set<number>} */
  const pilotAreas = new Set();
  const pilotFiles = PILOT_CELLS.map((cell) => `${PILOT_DIR}/pilot-${cell}.calls.jsonl`);
  PILOT_CELLS.forEach((cell, i) => {
    const area = cases[cell].area;
    pilotAreas.add(area);
    const { share, n } = pilotShare(jsonLines(pilotFiles[i]));
    cells[`hell-1@${area}`] = { caseId: cell, share, n, source: 'V4-S2 fr-base window share' };
  });
  const familyFiles = FAMILY_FILES.map((name) => `${FAMILY_DIR}/${name}`);
  const families = familyFiles.flatMap((file) => jsonLines(file)).filter((f) => f.level === 'hell-1');
  for (const caseId of [...new Set(families.map((f) => f.case))].sort()) {
    const ofCase = families.filter((f) => f.case === caseId);
    const area = ofCase[0].set.area;
    if (pilotAreas.has(area)) {
      continue;
    }
    const { share, n } = familyShare(ofCase);
    cells[`hell-1@${area}`] = { caseId, share, n, source: 'IGP-05 window share' };
  }
  return {
    version: 1,
    id: 'prior-s3-v1',
    rule: 'Nightmare: prior-v1; Hell 1: the seed-balanced window share of V4-S2\'s fr-base pilots on 196, 400, 576 and 676 cells, else of IGP-05\'s eligible in-band windows (plan 4.1, D-S24-21)',
    source: { priorV1: ref(PRIOR_V1), pilots: pilotFiles.map(ref), families: familyFiles.map(ref) },
    cells: Object.fromEntries(Object.entries(cells).sort(([a], [b]) => (a < b ? -1 : 1))),
  };
}

/** @param {string[]} argv @returns {number} */
function main(argv) {
  const { on } = parseArgs(argv, { values: ['label', 'source-label'], switches: ['write'] });
  if (on.has('write')) {
    if (existsSync(PRIOR_S3_FILE)) {
      process.stderr.write('fit-prior-s3: data/prior-s3-v1.json exists: a frozen table is never rewritten\n');
      return 1;
    }
    const table = computePriorS3();
    writeJson(PRIOR_S3_FILE, table);
    const keys = Object.keys(table.cells);
    const nightmare = keys.filter((k) => k.startsWith('nightmare@')).length;
    process.stdout.write(`fit-prior-s3: wrote data/prior-s3-v1.json (${keys.length} cells: ${nightmare} Nightmare, ${keys.length - nightmare} Hell 1)\n`);
    return 0;
  }
  if (!existsSync(PRIOR_S3_FILE)) {
    process.stderr.write('fit-prior-s3: data/prior-s3-v1.json is absent\n');
    return 1;
  }
  const table = computePriorS3();
  if (lf(readFileSync(PRIOR_S3_FILE, 'utf8')).trimEnd() !== lf(JSON.stringify(table, null, 2)).trimEnd()) {
    process.stderr.write('fit-prior-s3: data/prior-s3-v1.json differs from the recomputed table\n');
    return 1;
  }
  process.stdout.write(`fit-prior-s3: data/prior-s3-v1.json reproduced (${Object.keys(table.cells).length} cells)\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`fit-prior-s3: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
