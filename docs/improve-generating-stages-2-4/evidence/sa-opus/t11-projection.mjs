// @ts-check
// SA-Opus, T11 step 3 (stages 2 to 4 pack): the post-hoc reserve and deadline projection (D-V4-08) of the 20 uncapped
// Hell 1 rows of V4-S3P (arm fr-frozen-none-uncapped, the fitting reps 0-4), per cell:
//   deadlineProjection(rows.map((r) => ingestRow(r, { quantity: 10 })), { reserve: 0.6, deadlineMs: 115000, quantity: 10 })
// over the published rows, with the projected reserve cuts (`setCut`) and lost completions (`lost`) apart and `served`
// per row. A post-hoc projection, not a live-deadline proof: it estimates accepted prefixes from the recorded timeline
// and proves neither the cancellation of dispatched work, nor the response assembly, nor the 120-s bound.
// Unlocked: it reads records and writes its outputs beside itself; it rates nothing.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\t11-projection.mjs
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deadlineProjection, ingestRow } from '../../../../tools/ig-proto/verdicts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-stages-2-4/evidence/sa-opus';
const TASK = 'V4-S3P';
const ARM = 'fr-frozen-none-uncapped';
const RUNS_DIR = `docs/improve-generating/evidence/frozen/${TASK}/${ARM}`;
const RESERVE = 0.6;
const DEADLINE_MS = 115000;
const QUANTITY = 10;

/** @type {{ path: string, sha256Lf: string }[]} */
const inputs = [];
const sha256 = (/** @type {string} */ text) => createHash('sha256').update(text, 'utf8').digest('hex');
const lf = (/** @type {string} */ text) => text.replace(/\r\n/g, '\n');
/** @param {string} path Repository-relative, with `/`. @returns {string} The file's text, indexed once. */
function read(path) {
  const text = readFileSync(join(ROOT, path), 'utf8');
  if (!inputs.some((e) => e.path === path)) {
    inputs.push({ path, sha256Lf: sha256(lf(text)) });
  }
  return text;
}
const crlf = (/** @type {string} */ text) => `${text.replace(/\r?\n/g, '\r\n').replace(/[ \t]+\r\n/g, '\r\n').replace(/(\r\n)*$/, '')}\r\n`;
const s = (/** @type {number | null | undefined} */ ms) => (typeof ms === 'number' ? (ms / 1000).toFixed(1) : '-');

// The harness module whose ingestRow and deadlineProjection compute the table (unchanged since 57ef5cf).
read('tools/ig-proto/verdicts.mjs');
const plan = JSON.parse(read(`tools/ig-proto/plans/${TASK}.json`));
const shards = plan.steps.filter((/** @type {any} */ st) => Array.isArray(st.node) && st.node[1] === 'run' && st.node.includes('--arm') && st.node[st.node.indexOf('--arm') + 1] === ARM)
  .map((/** @type {any} */ st) => ({ shard: st.node[st.node.indexOf('--shard') + 1], cases: st.node[st.node.indexOf('--cases') + 1] }));

const cells = shards.map(({ shard, cases }) => {
  const [, caseId, from, to] = /** @type {RegExpExecArray} */ (/^([^:]+):(\d+)-(\d+)$/.exec(cases));
  const reps = Array.from({ length: Number(to) - Number(from) + 1 }, (_, i) => Number(from) + i);
  const doc = JSON.parse(read(`${RUNS_DIR}/${shard}.runs.json`));
  const rows = doc.rows.filter((/** @type {any} */ r) => r.caseId === caseId && reps.includes(r.rep)).sort((/** @type {any} */ a, /** @type {any} */ b) => a.rep - b.rep);
  const ingested = rows.map((/** @type {any} */ r) => ingestRow(r, { quantity: QUANTITY }));
  const projection = deadlineProjection(ingested, { reserve: RESERVE, deadlineMs: DEADLINE_MS, quantity: QUANTITY });
  const perRow = projection.rows.map((p, i) => ({
    ...p,
    rowKey: rows[i].rowKey,
    igSetMs: rows[i].run.igSetMs ?? null,
    tenthReadyMs: rows[i].run.tenthReadyMs ?? null,
    responseMs: rows[i].run.responseMs ?? null,
    acceptedCount: rows[i].run.acceptedCount ?? null,
  }));
  return {
    cell: caseId, shard, declared: reps.length, rows: rows.length, valid: ingested.filter((g) => g.status === 'valid').length,
    skipped: projection.skipped,
    notProjected: perRow.filter((p) => p.status !== 'projected').length,
    setCut: perRow.filter((p) => p.setCut === true).length,
    lost: perRow.filter((p) => p.lost === true).length,
    reachedTen: perRow.filter((p) => typeof p.acceptedCount === 'number' && p.acceptedCount >= QUANTITY).length,
    completedProjected: perRow.filter((p) => p.completed === true).length,
    maxIgSetMs: Math.max(...perRow.map((p) => (typeof p.igSetMs === 'number' ? p.igSetMs : -1))),
    label: projection.label,
    perRow,
  };
});

const inputsText = crlf(JSON.stringify(inputs, null, 2));
writeFileSync(join(ROOT, HERE, 't11-projection-inputs.json'), inputsText, 'utf8');
const indexHash = sha256(lf(inputsText));
const result = {
  script: `${HERE}/t11-projection.mjs`, task: TASK, arm: ARM, reserve: RESERVE, deadlineMs: DEADLINE_MS, quantity: QUANTITY,
  setCutAtMs: (1 - RESERVE) * DEADLINE_MS,
  note: 'post-hoc projection (D-V4-08), not a live-deadline proof',
  inputs: { path: `${HERE}/t11-projection-inputs.json`, entries: inputs.length, sha256Lf: indexHash },
  cells,
};
writeFileSync(join(ROOT, HERE, 't11-projection.json'), crlf(JSON.stringify(result, null, 2)), 'utf8');
const md = [
  '# T11: the post-hoc reserve and deadline projection of V4-S3P (fr-frozen-none-uncapped, Hell 1, reps 0-4)',
  '',
  `Post-hoc projection (D-V4-08), not a live-deadline proof. Written by \`${HERE}/t11-projection.mjs\`; inputs`,
  `\`${HERE}/t11-projection-inputs.json\` (${inputs.length} files, sha256Lf ${indexHash}). Reserve ${RESERVE}, deadline ${DEADLINE_MS} ms: the set`,
  `stage is cut when it ends after ${(1 - RESERVE) * DEADLINE_MS} ms; a row serves the puzzles accepted by ${DEADLINE_MS} ms.`,
  '',
  '| Cell | rows | valid | projected | reached ten (uncapped) | projected reserve cuts (setCut) | projected lost completions (lost) | completed in the projection | latest set stage end (s) |',
  '|---|---|---|---|---|---|---|---|---|',
  ...cells.map((c) => `| ${c.cell} | ${c.rows} | ${c.valid} | ${c.rows - c.notProjected - c.skipped} | ${c.reachedTen} | ${c.setCut} | ${c.lost} | ${c.completedProjected} | ${s(c.maxIgSetMs)} |`),
  '',
  '| Row | set stage end (s) | tenth ready (s) | response (s) | accepted | setCut | served | completed | lost |',
  '|---|---|---|---|---|---|---|---|---|',
  ...cells.flatMap((c) => c.perRow.map((p) => `| ${p.rowKey} | ${s(p.igSetMs)} | ${s(p.tenthReadyMs)} | ${s(p.responseMs)} | ${p.acceptedCount} | ${p.setCut} | ${p.served} | ${p.completed} | ${p.lost} |`)),
].join('\n');
writeFileSync(join(ROOT, HERE, 't11-projection.md'), crlf(md), 'utf8');
process.stdout.write(`t11-projection: ${cells.length} cells; inputs ${inputs.length} files, index sha256Lf ${indexHash}\n`);
for (const c of cells) {
  process.stdout.write(`  ${c.cell}: ${c.valid}/${c.rows} valid, ${c.reachedTen} reached ten; setCut ${c.setCut}, lost ${c.lost}; served ${c.perRow.map((p) => p.served).join(' ')}; latest set end ${s(c.maxIgSetMs)} s\n`);
}
