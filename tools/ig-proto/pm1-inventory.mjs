// @ts-check
// The data-only inventory of PM1's existing records (task pack v4, V4-T03, IG-P-Q24 (b)): the probes of the
// provisional IGP-05 families whose score the frozen source's own level ladder reads as a Hell level other than the
// level of their family, with the populations they make. It rates, generates, counts and replays nothing, runs
// without the lock and opens no route (IG-P-D6). No git.
//   node tools\ig-proto\pm1-inventory.mjs --label frozen --source-label "frozen 3fc65f4"
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { evidenceDir, parseArgs, rel, sourceRoot } from './lib/paths.mjs';
import { banner, buildMeta, sha256File, writeJson, writeText } from './lib/records.mjs';

const TASK = 'V4-T03';

/** The three record files of IGP-05 (`families-<part>.jsonl`), in reading order. */
const PARTS = Object.freeze(['failed-sets', 'scan', 'windows']);

/** The four facts the question IG-P-Q24 quotes. */
const Q24 = Object.freeze([
  { case: '15x15b10-hell-1', count: 2, score: 179, ratedLevel: 'hell-3' },
  { case: '15x15b10-hell-1', count: 3, score: 165, ratedLevel: 'hell-3' },
  { case: '15x15b10-hell-1', count: 6, score: 146, ratedLevel: 'hell-2' },
  { case: '12x12-nightmare', count: 1, score: 129, ratedLevel: 'hell-2' },
]);

const NOTE = 'Data-only inventory of the provisional PM1 records (IG-P-Q24 (b)). It rates nothing and opens no route: '
  + 'Hell 2 and Hell 3 stay closed for this feature as a scope and resource decision (IG-P-D6); no generation, pack '
  + 'claim or offer follows from these census-estimated witnesses. Hell levels are not offered on any board at the '
  + 'frozen source (`offeredAtFrozen` is false on every row).';

/**
 * @typedef {object} Levels The frozen source's `core/engine/levels.js`.
 * @property {(score: number) => { id: string }} levelForScore
 * @property {(area: number) => { id: string }[]} offeredLevels
 */

/** @param {number} work @returns {number} Millions of units, one decimal. */
const millions = (work) => Math.round(work / 100000) / 10;

/** @param {string} id @returns {number} The n of `hell-n`. */
const hellNumber = (id) => Number(id.slice('hell-'.length));

/** @param {number[]} values @returns {[number, number]} */
const range = (values) => [Math.min(...values), Math.max(...values)];

/**
 * @param {any[]} rows The rows of one population.
 * @param {string} key
 * @returns {any} The one value the rows have for the key; another count of values is an error.
 */
function single(rows, key) {
  if (new Set(rows.map((r) => r[key])).size !== 1) {
    throw new Error(`${rows[0].case} has more than one ${key}`);
  }
  return rows[0][key];
}

/**
 * @param {string} dir The folder of IGP-05's records (`docs/improve-generating/evidence/provisional/IGP-05`).
 * @returns {{ part: string, family: any }[]} Every family of `failed-sets`, `scan` and `windows`, in that order.
 */
export function readFamilies(dir) {
  return PARTS.flatMap((part) => readFileSync(join(dir, `families-${part}.jsonl`), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => ({ part, family: JSON.parse(line) })));
}

/**
 * @param {{ part: string, family: any }[]} families
 * @param {Levels} levels
 * @returns {{ totals: { families: number, probes: number, rated: number }, alternate: any[], populations: any[],
 *   q24: any[] }}
 */
export function buildInventory(families, levels) {
  let probes = 0;
  let rated = 0;
  /** @type {any[]} */
  const alternate = [];
  for (const { part, family } of families) {
    const { area, K } = family.set;
    for (const probe of family.probes) {
      probes += 1;
      if (probe.score === null) {
        continue;
      }
      rated += 1;
      const ratedLevel = levels.levelForScore(probe.score).id;
      if (!ratedLevel.startsWith('hell-') || ratedLevel === family.level) {
        continue;
      }
      alternate.push({
        part,
        case: family.case,
        familyLevel: family.level,
        area,
        K,
        count: probe.count,
        offset: probe.offset,
        score: probe.score,
        ratedLevel,
        censored: probe.censored,
        ar1: probe.ar1,
        solutions: probe.solutions,
        mainWorkM: millions(probe.mainWork),
        censusWorkM: millions(probe.censusWork),
        offeredAtFrozen: levels.offeredLevels(area).some((l) => l.id === ratedLevel),
      });
    }
  }
  /** @type {Map<string, any[]>} */
  const groups = new Map();
  for (const row of alternate) {
    const key = `${row.ratedLevel}\t${row.case}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const populations = [...groups.values()].map((rows) => {
    const work = rows.map((r) => r.mainWorkM).sort((a, b) => a - b);
    const solutions = (/** @type {string} */ kind) => rows.filter((r) => r.solutions === kind).length;
    return {
      ratedLevel: rows[0].ratedLevel,
      case: rows[0].case,
      familyLevel: single(rows, 'familyLevel'),
      area: single(rows, 'area'),
      n: rows.length,
      notRefused: rows.filter((r) => r.ar1 === false).length,
      censored: rows.filter((r) => r.censored === true).length,
      solutions: { unique: solutions('unique'), few: solutions('few'), many: solutions('many'), unknown: solutions('unknown') },
      counts: range(rows.map((r) => r.count)),
      scores: range(rows.map((r) => r.score)),
      mainWorkM: { median: work[Math.floor((work.length - 1) / 2)], max: work[work.length - 1] },
      offeredAtFrozen: single(rows, 'offeredAtFrozen'),
    };
  }).sort((a, b) => hellNumber(b.ratedLevel) - hellNumber(a.ratedLevel) || (a.case < b.case ? -1 : a.case > b.case ? 1 : 0));
  const q24 = Q24.map((fact) => ({
    ...fact,
    found: alternate.some((r) => r.case === fact.case && r.count === fact.count && r.score === fact.score
      && r.ratedLevel === fact.ratedLevel),
  }));
  return { totals: { families: families.length, probes, rated }, alternate, populations, q24 };
}

/**
 * @param {any} record
 * @returns {string} The Markdown of the inventory: the banner, the note, then one table per block.
 */
function markdown(record) {
  const yes = (/** @type {boolean} */ b) => (b ? 'yes' : 'no');
  const { totals, alternate, populations, q24, inputs } = record;
  /** @type {string[]} */
  const levelIds = [...new Set(alternate.map((/** @type {any} */ r) => r.ratedLevel))];
  levelIds.sort((a, b) => hellNumber(b) - hellNumber(a));
  return [
    '# PM1 data-only inventory (V4-T03, IG-P-Q24)', '', banner(record.meta), '', NOTE, '',
    '## Totals', '', '| Item | Value |', '|---|---:|',
    `| Families | ${totals.families} |`,
    `| Probes | ${totals.probes} |`,
    `| Rated probes (score is not null) | ${totals.rated} |`,
    `| Alternate rows (a rated Hell level other than the family's level) | ${alternate.length} |`,
    `| Alternate rows offered at the frozen source (\`offeredAtFrozen\` true) | ${alternate.filter((/** @type {any} */ r) => r.offeredAtFrozen).length} |`, '',
    '## The facts quoted in IG-P-Q24', '', '| Case | Clues | Score | Rated level | Found |', '|---|---:|---:|---|---|',
    ...q24.map((/** @type {any} */ f) => `| ${f.case} | ${f.count} | ${f.score} | ${f.ratedLevel} | ${yes(f.found)} |`), '',
    '## Populations', '',
    'One row per rated level and case, over the alternate rows. Counts are clue counts; main work in millions of units.', '',
    '| Rated level | Case | Family level | Area | n | Not refused | Censored | Solutions u/f/m/? | Counts | Scores | Main work median / max (M) |',
    '|---|---|---|---:|---:|---:|---:|---|---|---|---|',
    ...populations.map((/** @type {any} */ p) => `| ${p.ratedLevel} | ${p.case} | ${p.familyLevel} | ${p.area} | ${p.n} | ${p.notRefused} | ${p.censored} | `
      + `${p.solutions.unique}/${p.solutions.few}/${p.solutions.many}/${p.solutions.unknown} | ${p.counts[0]}-${p.counts[1]} | `
      + `${p.scores[0]}-${p.scores[1]} | ${p.mainWorkM.median.toFixed(1)} / ${p.mainWorkM.max.toFixed(1)} |`), '',
    '## Alternate rows', '',
    ...levelIds.flatMap((id) => {
      const rows = alternate.filter((/** @type {any} */ r) => r.ratedLevel === id);
      return [
        `### Rated ${id} (${rows.length} rows)`, '',
        '| Part | Case | Family level | Area | K | Clues | Offset | Score | Censored | AR1 refused | Solutions | Main work (M) | Census work (M) |',
        '|---|---|---|---:|---:|---:|---:|---:|---|---|---|---:|---:|',
        ...rows.map((/** @type {any} */ r) => `| ${r.part} | ${r.case} | ${r.familyLevel} | ${r.area} | ${r.K} | ${r.count} | ${r.offset} | ${r.score} | `
          + `${yes(r.censored)} | ${yes(r.ar1)} | ${r.solutions} | ${r.mainWorkM.toFixed(1)} | ${r.censusWorkM.toFixed(1)} |`), '',
      ];
    }),
    '## Inputs', '', '| Part | File | SHA-256 (LF line ends) |', '|---|---|---|',
    ...inputs.map((/** @type {any} */ i) => `| ${i.part} | ${i.path} | ${i.sha256} |`),
  ].join('\n');
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args } = parseArgs(argv, { values: ['label', 'source-label'] });
  if (args.label !== 'frozen') {
    process.stderr.write('pm1-inventory: --label frozen only\n');
    return 1;
  }
  const dir = evidenceDir('provisional', 'IGP-05');
  /** @type {Levels} */
  const levels = await import(pathToFileURL(join(sourceRoot(), 'core', 'engine', 'levels.js')).href);
  const inventory = buildInventory(readFamilies(dir), levels);
  const inputs = PARTS.map((part) => {
    const path = join(dir, `families-${part}.jsonl`);
    return { part, path: rel(path), sha256: sha256File(path), hashRule: 'lf-text' };
  });
  const meta = await buildMeta({ task: TASK, label: 'frozen', kind: 'pm1-inventory', sourceLabel: args['source-label'] });
  meta.rerun = `node tools\\ig-proto\\pm1-inventory.mjs --label frozen --source-label "${meta.source.label}"`;
  const record = { meta, ...inventory, inputs };
  writeJson(evidenceDir('frozen', TASK, 'inventory.json'), record);
  writeText(evidenceDir('frozen', TASK, 'inventory.md'), markdown(record));
  const { totals, alternate, q24 } = inventory;
  process.stdout.write(`pm1-inventory: wrote ${rel(evidenceDir('frozen', TASK, 'inventory.json'))} and inventory.md: `
    + `${totals.families} families, ${totals.probes} probes, ${totals.rated} rated, ${alternate.length} alternate rows, `
    + `${q24.filter((f) => f.found).length} of ${q24.length} IG-P-Q24 facts found\n`);
  const missing = q24.filter((f) => !f.found);
  for (const f of missing) {
    process.stderr.write(`pm1-inventory: an IG-P-Q24 fact is missing: ${f.case}, ${f.count} clues, score ${f.score}, ${f.ratedLevel}\n`);
  }
  return missing.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`pm1-inventory: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
