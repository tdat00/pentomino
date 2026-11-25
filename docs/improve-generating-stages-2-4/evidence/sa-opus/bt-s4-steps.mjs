// SA-Opus, break-tasks of improve-generating-stages-2-4: the unlocked steps, proofs and expectations of the plan V4-S4 as
// `activate` would write it (S06), from manifest.mjs's pure `activation` and `activationPlans`. Read-only: prints only.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-s4-steps.mjs --label frozen
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';
const ROOT = process.cwd();
const M = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'manifest.mjs')).href);
const P = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'lib', 'paths.mjs')).href);
const data = M.matrixData();
const expansion = M.expandMatrix(data, { controls: M.controlsFrom(P.mp12b1Report, data.cells.failingNightmare) });
const dir = P.evidenceDir('frozen', 'V4-S2', 'fr-base');
const pilots = Object.fromEntries(data.cells.hell1Conditional.map((c) => [c, []]));
for (const n of readdirSync(dir).filter((x) => x.endsWith('.runs.json')).sort()) { const doc = JSON.parse(readFileSync(join(dir, n), 'utf8')); for (const row of doc.rows) { if (Object.hasOwn(pilots, row.caseId) && row.rep >= 0 && row.rep <= 4) pilots[row.caseId].push(row.run); } }
const ph = { path: 'x', sha256: '0'.repeat(64) };
const factor = M.factor();
const rowSOf = (g) => M.projectedRowS({ refS: M.refS(g.cell), factor, rowLimitS: g.rowLimitS });
const rec = M.activation(expansion, { pilots, approvedOptional: [], epoch: { data: ph, freeze: ph, universe: ph } });
const { plan } = M.activationPlans(expansion, rec, M.stepPrice, { activationSha256: '0'.repeat(64), durations: M.durationsFromLogs(), rowSOf });
for (const s of plan.steps.filter((s) => !s.locked || s.id.startsWith('parity'))) console.log(s.id, '|', JSON.stringify(s.node).slice(0, 260), '|', s.expect);
console.log('prereqs', JSON.stringify(plan.prerequisites).slice(0, 900));
const rows = plan.steps.filter((s) => s.locked && s.id.startsWith('rows'));
console.log('row steps', rows.length, 'rowLimits', JSON.stringify([...new Set(rows.map((s) => s.price.rowLimitS))]), 'arms', JSON.stringify([...new Set(rows.map((s) => s.node[4]))]));
