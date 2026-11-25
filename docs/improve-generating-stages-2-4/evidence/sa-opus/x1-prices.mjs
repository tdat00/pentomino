// @ts-check
// SA-Opus, cross-review round 1: re-prices SA-Astra's projections with T11g's own functions, and prices the alternatives
// of the cross-review (read-only, unlocked; no plan, activation or allowance is written).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\x1-prices.mjs
// (a) SA-Astra's fitting pilot V4-S2F; (b) the P7 spike; (c) V4-S4 and V4-S4C from T11e's pure `activation` on the
// published pilots; (d) N-V4-18's duplicate rows under each class proposal, formal and at the stage-2 measured times
// (`s4-cost.json`); (e) the alternatives: the control pilot, a reduced Hell 1 composite check, the pre-activation proofs.
// Writes x1-prices.json and x1-prices.md beside it.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { f, HERE, RAW, ROOT, writeCrlf } from './s2-lib.mjs';

const M = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'manifest.mjs')).href);
const IG = join(ROOT, 'tools', 'ig-proto');
const json = (/** @type {string} */ p) => JSON.parse(readFileSync(p, 'utf8'));
const hash = (/** @type {string} */ s) => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex');
const ACCOUNT_S = 10252.712 + 87.4;
/** @param {any} q */
const mins = (q) => ({ counted: q.countedS / 60, guard: q.guardS / 60, ceiling: q.ceilingS / 60, invocations: q.invocations,
  rows: q.ceilingInvocations, censored: q.censored, completed: q.completed });
const cap = (/** @type {number} */ guardS) => Math.ceil((ACCOUNT_S + guardS) / 60);
/** @param {string} task @param {string[]} arms */
const parity = (task, arms) => arms.flatMap((arm) => M.parityPass(task, arm, M.stepPrice, {})).filter((/** @type {any} */ s) => s.locked)
  .map((/** @type {any} */ s) => s.price);
const s2Plan = json(join(IG, 'plans', 'V4-S2.json'));
const rowPrice = (/** @type {string[]} */ cells) => cells.map((cell) => s2Plan.steps.find((/** @type {any} */ s) => s.id === `rows-fr-base-pilot-${cell}`).price);
// V4-S2's measured node seconds per step (its invocation rows), for the realistic estimates.
const inv = readFileSync(join(RAW, 'invocations.jsonl'), 'utf8').trim().split(/\r?\n/).map((l) => JSON.parse(l));
/** @param {string} step */
const nodeOf = (step) => inv.filter((l) => l.step === step).reduce((a, l) => a + l.nodeSeconds, 0);
/** @param {string} step */
const invOf = (step) => inv.filter((l) => l.step === step).length;
const p1 = inv.filter((l) => l.step.startsWith('parity-fr-') && l.step !== 'parity-fr-p5').map((l) => l.nodeSeconds);
const P1_NODE_S = p1.reduce((a, b) => a + b, 0) / p1.length;
/** @param {number} nodeS @param {number} n */
const real = (nodeS, n) => ({ idle: (nodeS + 15 * n) / 60, full: (nodeS + 45 * n) / 60 });
/** @type {any} */
const out = { accountS: ACCOUNT_S, p1NodeS: P1_NODE_S };
const md = ['# Cross-review round 1: prices of SA-Astra\'s projections and of the alternatives (SA-Opus scratch)', '',
  'Computed by `x1-prices.mjs` with T11g\'s `stepPrice`, `price`, `parityPass` and T11e\'s `expandMatrix`, `activation` and',
  '`activationPlans` (pure functions; nothing written outside this folder). Minutes are counted minutes; "cap" = the cumulative',
  `round minutes an approval would ask today, ceil((account ${f(ACCOUNT_S, 3)} s + guard) / 60). Realistic = V4-S2's measured`,
  `node seconds of the same steps plus 15 s (idle declaration) or 45 s quiet per invocation; one P-1 pass = ${f(P1_NODE_S, 1)} node s`,
  '(the mean of V4-S2\'s six passing passes).', '',
  '| Item | rows / items | counted | guard | cap on the account | invocations | realistic (15 s / 45 s quiet) |', '|---|---|---:|---:|---:|---:|---|'];
/** @param {string} name @param {string} units @param {any} q @param {{ idle: number, full: number } | null} r */
const line = (name, units, q, r) => {
  const m = mins(q);
  out[name] = { ...m, cap: cap(q.guardS), realistic: r };
  md.push(`| ${name} | ${units} | ${f(m.counted, 2)} | ${f(m.guard, 2)} | ${cap(q.guardS)} | ${m.invocations} | ${r ? `${f(r.idle, 1)} / ${f(r.full, 1)}` : '-'} |`);
};

// (a) SA-Astra's fitting pilot: the five fr-base pilot row steps twice, and two P-1 passes.
const FIT = ['14x14-nightmare', '14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1'];
const fitNode = FIT.reduce((a, c) => a + nodeOf(`rows-fr-base-pilot-${c}`), 0);
const fitInv = FIT.reduce((a, c) => a + invOf(`rows-fr-base-pilot-${c}`), 0);
line('V4-S2F (SA-Astra: 5 cells x 2 arms x 5 reps + 2 P-1)', '50 rows + 24 items',
  M.price([...rowPrice(FIT), ...rowPrice(FIT), ...parity('V4-S2F-P', ['fr-fit-s3', 'fr-fit-s3-uncapped'])]),
  real(2 * fitNode + 2 * P1_NODE_S, 2 * fitInv + 2));

// (b) The P7 spike as SA-Astra prices it.
const kernel = json(join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2K', 'kernel.json'));
const spikeInput = { type: 'items', groups: [{ kind: 'v4-kernel', variant: 'candidate-composite', lanes: 1, reserveS: 90,
  durationsS: Array.from({ length: 3 }, () => kernel.rows.map((/** @type {any} */ r) => 1.25 * r.itemMs / 1000)).flat() }] };
line('P7 spike, three candidates (SA-Astra\'s assumption)', `${3 * spikeInput.groups[0].durationsS.length} items`, M.price([spikeInput, spikeInput, spikeInput]), null);
line('P7 spike, one candidate', `${spikeInput.groups[0].durationsS.length} items`, M.price([spikeInput]), null);

// (c) V4-S4 and V4-S4C from T11e's pure activation on the published pilots (both conditional boards activate).
const universe = json(join(IG, 'plans', 'V4-S4.universe.json'));
const matrix = json(join(IG, 'data', 'frozen-round-v1.json'));
const controls = [...new Set(universe.collections.initial.groups.filter((/** @type {any} */ g) => g.items.includes('S4-3')).map((/** @type {any} */ g) => g.cell))];
const expansion = M.expandMatrix(matrix, { controls });
const pub = join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2', 'fr-base');
/** @type {Record<string, any[]>} */
const pilots = {};
for (const cell of matrix.cells.hell1Conditional) {
  const file = readdirSync(pub).find((n) => n === `pilot-${cell}.runs.json`);
  pilots[cell] = file ? json(join(pub, file)).rows.map((/** @type {any} */ r) => r.run) : [];
}
const epoch = { data: { path: 'analysis-data', sha256: hash(JSON.stringify(matrix)) }, freeze: { path: 'analysis-not-a-freeze', sha256: hash('proposal only') },
  universe: { path: 'analysis-universe', sha256: hash(JSON.stringify(universe)) } };
const act = M.activation(expansion, { pilots, approvedOptional: [], epoch });
const universeGroups = Object.values(universe.collections).flatMap((/** @type {any} */ c) => [...(c.groups ?? []), ...(c.comparators ?? [])]);
const plans = M.activationPlans(expansion, act, M.stepPrice, { activationSha256: hash(JSON.stringify(act)),
  rowSOf: (/** @type {any} */ g) => universeGroups.find((/** @type {any} */ u) => u.id === g.id).price.rowS });
const s4Locked = plans.plan.steps.filter((/** @type {any} */ s) => s.locked);
const s4 = M.price(s4Locked.map((/** @type {any} */ s) => s.price));
const cost4 = json(join(HERE, 's4-cost.json'));
line('V4-S4 (initial + both conditional boards, no S4-6)', `${s4.ceilingInvocations} rows/items in ${s4Locked.length} locked steps`, s4,
  { idle: cost4.summary['V4-S4'].countedIdleMin, full: cost4.summary['V4-S4'].countedFullMin });
const s4c = M.price(plans.template.cells.map((/** @type {any} */ c) => c.price));
line('V4-S4C (same collection)', `${plans.template.cells.length} cells`, s4c,
  { idle: cost4.summary['V4-S4C'].countedIdleMin, full: cost4.summary['V4-S4C'].countedFullMin });

// (d) N-V4-18: the duplicate `fr-frozen` row steps of the fixed no-screen classes, under each class proposal.
const caseOf = (/** @type {any} */ s) => s.node[s.node.indexOf('--cases') + 1].split(':')[0];
const PROPOSALS = {
  'SA-Astra (n-small, 216-324, 360+, Hell 1 fixed none: 17 cells)': (/** @type {string} */ c) => !c.includes('master') && !['14x14-nightmare', '15x15b10-nightmare'].includes(c),
  'SA-Opus cross-review (n-small and Hell 1 fixed none: 7 cells)': (/** @type {string} */ c) => ['3x29-nightmare', '10x10-nightmare', '12x12-nightmare'].includes(c) || c.endsWith('hell-1'),
};
out.duplicates = {};
for (const [name, isFixed] of Object.entries(PROPOSALS)) {
  const steps = s4Locked.filter((/** @type {any} */ s) => s.id.startsWith('rows-fr-frozen-') && !s.id.startsWith('rows-fr-frozen-none-') && s.node.includes('--cases') && isFixed(caseOf(s)));
  const cells = [...new Set(steps.map(caseOf))];
  // Realistic: the duplicate twin costs what its no-screen twin costs at the stage-2 measured times (s4-cost.json groups).
  const noneGroups = cost4.groups.filter((/** @type {any} */ g) => g.arm === 'fr-frozen-none' && cells.includes(g.cell));
  const nodeS = noneGroups.reduce((/** @type {number} */ a, /** @type {any} */ g) => a + g.nodeS, 0);
  const n = noneGroups.reduce((/** @type {number} */ a, /** @type {any} */ g) => a + g.invocations, 0);
  line(`N-V4-18 saving, ${name}`, `${cells.length} cells`, M.price(steps.map((/** @type {any} */ s) => s.price)), real(nodeS, n));
}

// (e) Alternatives of the cross-review.
const sup = cost4.supplementSummary;
md.push(`| V4-S2B control pilot (fr-none on the 8 unpiloted controls, round 1) | 40 rows | ${f(sup.formalCountedMin, 2)} | ${f(sup.formalGuardMin, 2)} | ${cap(sup.formalGuardMin * 60)} | - | ${f(sup.realisticIdleMin, 1)} / ${f(sup.realisticFullMin, 1)} |`);
out['V4-S2B'] = sup;
const HELL = ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1'];
const hellNode = HELL.reduce((a, c) => a + nodeOf(`rows-fr-base-pilot-${c}`), 0);
const hellInv = HELL.reduce((a, c) => a + invOf(`rows-fr-base-pilot-${c}`), 0);
line('Hell 1 composite check, one uncapped candidate arm (4 boards x 5 reps) + its P-1', '20 rows + 12 items',
  M.price([...rowPrice(HELL), ...parity('V4-S2X', ['fr-frozen-none-uncapped'])]), real(hellNode + P1_NODE_S, hellInv + 1));
line('Hell 1 composite check, rows only (arm with an accepted binding)', '20 rows', M.price(rowPrice(HELL)), real(hellNode, hellInv));
line('V4-S3P: the four frozen arms\' P-1 passes', '48 items',
  M.price(parity('V4-S3P', ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'])), real(4 * P1_NODE_S, 4));
md.push('', `V4-S4's preview: ${s4.ceilingInvocations} rows and items, projected completed ${s4.completed}, censored ${s4.censored};`,
  `V4-S4C: ${s4c.ceilingInvocations} rows, ${s4c.invocations} projected invocations. Realistic V4-S4 / V4-S4C are round 1's \`s4-cost.json\``,
  '(the screen twin at fr-screen\'s pilot times on 14x14, 15x15b10 and 16x16 Nightmare, at fr-none\'s elsewhere; a class proposal that',
  'ships 16x16 without the screen adds a few minutes through its twin and its comparator).');
writeCrlf(join(HERE, 'x1-prices.json'), JSON.stringify(out, null, 2));
writeCrlf(join(HERE, 'x1-prices.md'), md.join('\n'));
process.stdout.write(`${md.join('\n')}\n`);
