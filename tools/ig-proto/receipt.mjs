// @ts-check
// The source receipt of the frozen round (task pack v4, V4-T01b): what the frozen source is and that every
// source-dependent value of a frozen run comes from it. It records the verified snapshot, the digest and the versions
// of the source, the anchored edits of every variant, the catalogue cells the source no longer offers, and the audit
// of the static imports the harness takes from outside tools/ig-proto/. No git, no rating, no timing.
//   node tools\ig-proto\receipt.mjs --label frozen --source-label "frozen 3fc65f4"
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { evidenceDir, FROZEN_COMMIT, FROZEN_DIGEST, parseArgs, rel, SNAPSHOT_MANIFEST, sourceRoot } from './lib/paths.mjs';
import { banner, buildMeta, sourceDigest, sourceVersions, writeJson, writeText } from './lib/records.mjs';
import { loadCatalogue } from './lib/sets.mjs';
import { collectSources, listVariants, planTree } from './lib/tree.mjs';
import { verifySnapshot } from './snapshot.mjs';

const TASK = 'V4-T01b';

/** The audit of the README section "Source-dependent imports (V4-T01b)": one row per row of its table. */
export const AUDIT = Object.freeze([
  {
    module: 'lib/records.mjs',
    import: 'computeSourceDigest, currentVersions, APP_VERSION',
    class: 'source-dependent',
    frozenHandling: 'read from sourceRoot() (T01a)',
  },
  {
    module: 'lib/sets.mjs',
    import: 'pieceCountRange',
    class: 'source-dependent',
    frozenHandling: "removed; the engine's own levels.js (step 1)",
  },
  {
    module: 'boards.mjs',
    import: 'buildLandscapeMatrix',
    class: 'source-dependent',
    frozenHandling: "provisional tool; the frozen catalogue check is receipt.mjs's, from sourceRoot()",
  },
  {
    module: 'budgets.mjs, compare-r2.mjs, compare.mjs, fit-prior.mjs, identity.mjs, pm2.mjs, pm4.mjs, summary.mjs',
    import: 'median, percentile, summarize',
    class: 'harness statistics',
    frozenHandling: 'none needed: pure arithmetic, not part of a measured source',
  },
  {
    module: 'self-test.mjs',
    import: 'SOURCE_FILES, checkText',
    class: 'harness checks',
    frozenHandling: 'none needed: a guard of the harness and the convention checker',
  },
  {
    module: 'lib/records.mjs',
    import: 'checkText',
    class: 'harness check',
    frozenHandling: 'none needed',
  },
]);

/**
 * The cases of the frozen source's landscape matrix in the catalogue's shape: what `boards.mjs check` computes, with
 * the matrix builder of the snapshot instead of the working tree's.
 * @returns {Promise<Record<string, any>>}
 */
async function frozenCases() {
  const { buildLandscapeMatrix } = await import(pathToFileURL(join(sourceRoot(), 'tools', 'bench', 'calibration-reference.js')).href);
  /** @type {Record<string, any>} */
  const cases = {};
  for (const c of buildLandscapeMatrix({ seeds: 1 }).cases) {
    const { repetitions, ...fields } = c;
    void repetitions;
    cases[c.id] = { ...fields, area: c.boardRows.join('').replace(/\./g, '').length };
  }
  return cases;
}

/** @returns {Promise<{ notOffered: string[], added: string[], differs: string[] }>} Catalogue against the frozen source. */
async function catalogueDifferences() {
  const saved = loadCatalogue().cases;
  const now = await frozenCases();
  /** @type {{ notOffered: string[], added: string[], differs: string[] }} */
  const out = { notOffered: [], added: [], differs: [] };
  for (const id of new Set([...Object.keys(saved), ...Object.keys(now)])) {
    if (!(id in now)) {
      out.notOffered.push(id);
    } else if (!(id in saved)) {
      out.added.push(id);
    } else if (JSON.stringify(saved[id]) !== JSON.stringify(now[id])) {
      out.differs.push(id);
    }
  }
  return out;
}

/** @param {string[]} ids @returns {string} A count per level of the case ids (`<board>-<level>`), for the Markdown. */
function perLevel(ids) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const id of ids) {
    const level = id.replace(/^[^-]*-/, '');
    counts[level] = (counts[level] ?? 0) + 1;
  }
  return Object.entries(counts).map(([level, n]) => `${level}: ${n}`).join(', ');
}

/**
 * @param {any} record
 * @returns {string} The Markdown of the receipt: the banner and one table per block.
 */
function markdown(record) {
  const yes = (/** @type {boolean} */ b) => (b ? 'yes' : 'no');
  const { snapshot, catalogue } = record;
  const ids = (/** @type {string[]} */ list) => (list.length === 0 ? 'none' : list.join(', '));
  return [
    '# Frozen source receipt (V4-T01b)', '', banner(record.meta), '',
    '## Snapshot', '', '| Item | Value |', '|---|---|',
    `| Verified against its manifest | ${yes(snapshot.ok)} |`,
    `| Files in the folder | ${snapshot.files} |`,
    `| Files in the manifest | ${snapshot.manifest.files} |`,
    `| Manifest digest | ${snapshot.manifest.digest} |`,
    `| Differences | ${snapshot.differences.length === 0 ? 'none' : snapshot.differences.slice(0, 10).join('; ')} |`, '',
    '## Source', '', '| Item | Value |', '|---|---|',
    `| Frozen commit | ${record.frozenCommit} |`,
    `| Source digest (computed) | ${record.sourceDigest} |`,
    `| Expected digest (FROZEN_DIGEST) | ${record.expectedDigest} |`,
    `| Equal | ${yes(record.digestEqual)} |`, '',
    '## Versions', '', '| Key | Value |', '|---|---|',
    ...Object.entries(record.versions).map(([key, value]) => `| ${key} | ${value} |`), '',
    '## Anchored edits of the variants (check-edits)', '', '| Variant | Edits applied | Errors |', '|---|---:|---|',
    ...record.checkEdits.map((/** @type {any} */ c) => `| ${c.variant} | ${c.edits} | ${c.errors.length === 0 ? 'none' : c.errors.join('; ')} |`), '',
    '## Catalogue against the frozen source', '', '| Difference | Count | Cases |', '|---|---:|---|',
    `| In the catalogue, not offered by the frozen source | ${catalogue.notOffered.length} | ${ids(catalogue.notOffered)} |`,
    `| Offered by the frozen source, not in the catalogue | ${catalogue.added.length} | ${ids(catalogue.added)} |`,
    `| Differs | ${catalogue.differs.length} | ${ids(catalogue.differs)} |`, '',
    `Not offered, per level: ${catalogue.notOffered.length === 0 ? 'none' : perLevel(catalogue.notOffered)}.`, '',
    '## Source-dependent imports (audit)', '', '| Module | Import | Class | Frozen-label handling |', '|---|---|---|---|',
    ...record.audit.map((/** @type {any} */ a) => `| ${a.module} | ${a.import} | ${a.class} | ${a.frozenHandling} |`),
  ].join('\n');
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args } = parseArgs(argv, { values: ['label', 'source-label'] });
  if (args.label !== 'frozen') {
    process.stderr.write('receipt: the source receipt is a record of the frozen round: use --label frozen\n');
    return 1;
  }
  const snapshotResult = verifySnapshot();
  if (!snapshotResult.ok) {
    process.stderr.write(`receipt: the snapshot is not verified: ${snapshotResult.differences.slice(0, 10).join('; ')}\n`);
    return 1;
  }
  const manifest = JSON.parse(readFileSync(SNAPSHOT_MANIFEST, 'utf8'));
  const digest = await sourceDigest();
  const sources = collectSources();
  const checkEdits = listVariants().map((variant) => {
    /** @type {string[]} */
    const errors = [];
    const plan = planTree(variant, { errors, sources });
    return { variant, edits: plan.edits.length, errors };
  });
  const meta = await buildMeta({ task: TASK, label: 'frozen', kind: 'receipt', sourceLabel: args['source-label'] });
  meta.rerun = `node tools\\ig-proto\\receipt.mjs --label frozen --source-label "${meta.source.label}"`;
  const record = {
    meta,
    snapshot: { ...snapshotResult, manifest: { files: manifest.files, digest: manifest.digest } },
    frozenCommit: FROZEN_COMMIT,
    sourceDigest: digest,
    expectedDigest: FROZEN_DIGEST,
    digestEqual: digest === FROZEN_DIGEST,
    versions: await sourceVersions(),
    checkEdits,
    catalogue: await catalogueDifferences(),
    audit: AUDIT,
  };
  writeJson(evidenceDir('frozen', TASK, 'receipt.json'), record);
  writeText(evidenceDir('frozen', TASK, 'receipt.md'), markdown(record));
  process.stdout.write(`receipt: wrote ${rel(evidenceDir('frozen', TASK, 'receipt.json'))} and receipt.md: snapshot verified (${snapshotResult.files} files), `
    + `digest equal ${record.digestEqual}, ${checkEdits.filter((c) => c.errors.length === 0).length} of ${checkEdits.length} variants without error, `
    + `${record.catalogue.notOffered.length} not offered, ${record.catalogue.added.length} added, ${record.catalogue.differs.length} differ\n`);
  const failures = [
    ...(record.digestEqual ? [] : [`the source digest ${digest} is not FROZEN_DIGEST ${FROZEN_DIGEST}`]),
    ...checkEdits.flatMap((c) => c.errors),
  ];
  for (const f of failures) {
    process.stderr.write(`receipt: ${f}\n`);
  }
  return failures.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`receipt: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
