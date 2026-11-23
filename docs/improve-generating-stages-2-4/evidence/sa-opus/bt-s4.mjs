// SA-Opus, break-tasks of improve-generating-stages-2-4: the expected figures of the activation and of the plan V4-S4
// (S05, S06), from manifest.mjs's pure `activation` and `activationPlans` with a placeholder epoch, without and with S4-6.
// Read-only: nothing is written.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-s4.mjs --label frozen
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const M = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'manifest.mjs')).href);
const P = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'lib', 'paths.mjs')).href);
const data = M.matrixData();
const expansion = M.expandMatrix(data, { controls: M.controlsFrom(P.mp12b1Report, data.cells.failingNightmare) });
// pilots as manifest's readPilots does
import { readdirSync, readFileSync } from 'node:fs';
const dir = P.evidenceDir('frozen', 'V4-S2', 'fr-base');
const pilots = Object.fromEntries(data.cells.hell1Conditional.map((c) => [c, []]));
for (const n of readdirSync(dir).filter((x) => x.endsWith('.runs.json')).sort()) {
  const doc = JSON.parse(readFileSync(join(dir, n), 'utf8'));
  for (const row of doc.rows) { if (Object.hasOwn(pilots, row.caseId) && row.rep >= 0 && row.rep <= 4) pilots[row.caseId].push(row.run); }
}
const ph = { path: 'x', sha256: '0'.repeat(64) };
const factor = M.factor();
const rowSOf = (g) => M.projectedRowS({ refS: M.refS(g.cell), factor, rowLimitS: g.rowLimitS });
const durations = M.durationsFromLogs();
for (const approved of [[], ['S4-6']]) {
  const rec = M.activation(expansion, { pilots, approvedOptional: approved, epoch: { data: ph, freeze: ph, universe: ph } });
  const { plan, template } = M.activationPlans(expansion, rec, M.stepPrice, { activationSha256: '0'.repeat(64), durations, rowSOf });
  const locked = plan.steps.filter((s) => s.locked);
  console.log(JSON.stringify({ approved, groups: rec.groups.length, declared: rec.declaredRows.length, comparator: rec.comparatorCells.length,
    conditional: rec.conditional.map((c) => `${c.cell}: ${c.activated} (${c.reachingTen} of ${c.valid} valid)`),
    steps: plan.steps.length, locked: locked.length, allocationMinutes: plan.allocationMinutes, optionalMinutes: plan.optionalMinutes,
    guardMin: M.planGuardS(plan) / 60, templateCells: template.cells.length }));
}
