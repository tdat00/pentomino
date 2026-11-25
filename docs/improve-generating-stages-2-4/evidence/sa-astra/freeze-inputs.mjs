// @ts-check
// Read-only fit inputs and price projections. This writes analysis artifacts, never a freeze or an activation.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const out = dirname(fileURLToPath(import.meta.url));
const root = resolve(out, '..', '..', '..', '..');
const load = (...parts) => import(pathToFileURL(join(root, ...parts)).href);
const v = await load('tools', 'ig-proto', 'verdicts.mjs');
const m = await load('tools', 'ig-proto', 'manifest.mjs');
const inputs = [];
const hash = (s) => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex');
const read = (file) => {
  const text = readFileSync(file, 'utf8');
  inputs.push({ path: relative(root, file), sha256Lf: hash(text) });
  return text;
};
const json = (file) => JSON.parse(read(file));
const jsonl = (file) => read(file).trimEnd().split(/\r?\n/).map((text, i) => ({ ...JSON.parse(text), evidence: `${relative(root, file)}:${i + 1}` }));
const write = (name, value) => writeFileSync(join(out, name), JSON.stringify(value, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
const summary = json(join(out, 'stage2-computed.json'));
const rows = json(join(out, 'rows-computed.json'));
const calls = json(join(out, 'calls-computed.json'));
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const median = (xs) => xs.length ? v.median(xs) : null;
const stats = (xs) => xs.length ? { n: xs.length, median: median(xs), min: Math.min(...xs), max: Math.max(...xs) } : null;
const opts = { quantity: 10, capMs: 120000, resamples: 10000, resampleSeed: 20261116 };
const reps = [0, 1, 2, 3, 4];

const priorFile = join(root, 'tools', 'ig-proto', 'data', 'prior-v1.json');
const prior = json(priorFile);
const pub = join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2');
const rawRows = [];
for (const a of ['fr-base', 'fr-screen', 'fr-none']) {
  for (const n of readdirSync(join(pub, a)).filter((n) => n.endsWith('.runs.json')).sort()) {
    const r = json(join(pub, a, n));
    rawRows.push(...r.rows.map((row) => ({ arm: a, ...row })));
  }
}
const proposalClasses = [
  { id: 'n-small', level: 'nightmare', minArea: 1, maxArea: 144, W: null,
    cells: ['3x29-nightmare', '10x10-nightmare', '12x12-nightmare'] },
  { id: 'n-mid-low', level: 'nightmare', minArea: 196, maxArea: 215, W: 190000000,
    cells: ['14x14-nightmare', '15x15b10-nightmare'] },
  { id: 'n-mid-high', level: 'nightmare', minArea: 216, maxArea: 324, W: null,
    cells: ['16x16-nightmare', '15x20-nightmare', '18x18-nightmare'] },
  { id: 'n-large', level: 'nightmare', minArea: 360, maxArea: null, W: null,
    cells: ['18x20-nightmare', '20x20-nightmare', '20x21-nightmare', '32x15-nightmare', '22x22-nightmare', '24x24-nightmare', '26x26-nightmare'] },
  { id: 'hell-1', level: 'hell-1', minArea: 1, maxArea: null, W: null,
    cells: ['26x26-hell-1', '20x20-hell-1', '24x24-hell-1', '14x14-hell-1'] },
];
const allCells = proposalClasses.flatMap((c) => c.cells);
assert.equal(new Set(allCells).size, 19);
assert.deepEqual(allCells.slice().sort(), summary.activationSummary.comparatorCells.slice().sort());
const split = [];
for (const cls of proposalClasses.filter((c) => c.id.startsWith('n-mid-'))) {
  const measuredCells = cls.cells.filter((cell) => summary.compared.some((c) => c.kind === 'screen' && c.cell === cell));
  const comparison = summary.compared.filter((c) => c.kind === 'screen' && measuredCells.includes(c.cell));
  const side = (arm) => rawRows.filter((r) => r.arm === arm && measuredCells.includes(r.caseId)).map((r) => ({
    ingested: v.ingestRow(r, opts), ledger: rows.find((q) => q.arm === arm && q.rowKey === r.rowKey).ledger,
  }));
  const work = v.workRule(side('fr-screen'), side('fr-none'));
  split.push({ id: cls.id, measuredCells, unmeasuredCells: cls.cells.filter((c) => !measuredCells.includes(c)),
    work, faster: v.fasterRule(Object.fromEntries(comparison.map((c) => [c.cell, c.ratios])), reps, opts),
    clue: v.clueRule(comparison.flatMap((c) => c.matched)),
    widths: { screen: work.screen.hiRatio - work.screen.loRatio, noScreen: work.noScreen.hiRatio - work.noScreen.loRatio } });
}
const perSet = summary.compared.filter((c) => c.kind === 'per-set');
const perSetPooled = v.fasterRule(Object.fromEntries(perSet.map((c) => [c.cell, c.ratios])), reps, opts);
const perSetStages = ['20x20-hell-1', '26x26-hell-1'].map((cell) => {
  const get = (arm) => {
    const cs = calls.filter((c) => c.arm === arm && c.caseId === cell && c.stage === 'batch');
    return { calls: cs.length, locateProfiles: sum(cs.map((c) => c.locateProfiles)),
      locateMs: sum(cs.map((c) => c.locateMs)), profileMs: sum(cs.map((c) => c.ratingMs)),
      meanLocateProfiles: sum(cs.map((c) => c.locateProfiles)) / cs.length };
  };
  return { cell, base: get('fr-base'), perSet: get('fr-ps') };
});

const pm1dir = join(root, 'docs', 'improve-generating', 'evidence', 'provisional', 'IGP-05');
const families = ['families-windows.jsonl', 'families-failed-sets.jsonl'].flatMap((f) => jsonl(join(pm1dir, f)));
const hellFit = [];
const seedExclusions = new Set();
for (const area of [196, 215, 256, 300, 324, 360, 400, 420, 480, 484, 576, 676]) {
  const pilot = rawRows.filter((r) => r.arm === 'fr-base' && r.caseId.endsWith('hell-1') && r.run.details?.area === area);
  const fs = families.filter((f) => f.level === 'hell-1' && f.set.area === area);
  const bySeed = new Map();
  for (const f of fs) {
    seedExclusions.add(f.set.seed);
    const eligible = f.probes.filter((p) => p.eligible === true && p.inBand === true).map((p) => p.count / f.set.K);
    if (eligible.length) {
      if (!bySeed.has(f.set.seed)) bySeed.set(f.set.seed, []);
      bySeed.get(f.set.seed).push(median(eligible));
    }
  }
  const pm1Shares = [...bySeed].map(([seed, shares]) => ({ seed, medianFamilyShare: median(shares) }));
  const pilotShares = pilot.map((r) => {
    seedExclusions.add(r.seed);
    return { seed: r.seed, medianShare: median(r.run.details.puzzles.map((p) => p.clues / r.run.details.K)),
      K: r.run.details.K, accepted: r.run.acceptedCount };
  });
  const rawShare = pilotShares.length ? median(pilotShares.map((r) => r.medianShare))
    : pm1Shares.length ? median(pm1Shares.map((r) => r.medianFamilyShare)) : prior.cells[`hell-1@${area}`]?.share;
  assert(Number.isFinite(rawShare), `No prior evidence at Hell area ${area}`);
  const share = Math.round(rawShare * 1e6) / 1e6;
  hellFit.push({ key: `hell-1@${area}`, oldShare: prior.cells[`hell-1@${area}`]?.share ?? null, proposedShare: share,
    source: pilotShares.length ? 'median of per-request accepted clue shares in fr-base V4-S2, equal seed weight'
      : 'median across PM1 seeds of the median across orders of the eligible in-band clue shares',
    pilotShares, pm1Shares, familyEvidence: fs.map((f) => f.evidence),
    caveat: 'Fitted start, not a measured improvement. No counterfactual timing is credited; check the composite on fitting seeds before freezing.' });
}
const nightmarePrior = Object.fromEntries(Object.entries(prior.cells).filter(([k]) => k.startsWith('nightmare@')));
const budgetProposal = {
  id: 'budget-s3-v1-candidate',
  any: [
    { level: 'nightmare', minArea: 1, maxArea: null, units: 8000000000 },
    { level: 'hell-1', minArea: 1, maxArea: 215, units: 32000000000 },
    { level: 'hell-1', minArea: 216, maxArea: null, units: 16000000000 },
  ],
  require: [{ level: 'nightmare', units: 32000000000 }, { level: 'hell-1', units: 32000000000 }],
  requireAuthority: 'Owner decision still required (N-V4-21); then accepted parity/replay before stage 4.',
  noWindowBound: 4, budgetStopsCountAsNoWindow: false,
};
const prefixChecks = [];
for (const cell of [...new Set(calls.map((c) => c.caseId))]) {
  const level = cell.endsWith('hell-1') ? 'hell-1' : 'nightmare';
  const area = calls.find((c) => c.caseId === cell).area;
  const useArm = level === 'nightmare' ? 'fr-none' : 'fr-base';
  const succeeded = calls.filter((c) => c.caseId === cell && c.arm === useArm && c.result === 'ok');
  const budget = budgetProposal.any.find((b) => b.level === level && area >= b.minArea && (b.maxArea === null || area <= b.maxArea)).units;
  prefixChecks.push({ cell, useArm, successfulCalls: succeeded.length, budget, maxFullWork: Math.max(...succeeded.map((c) => c.lo)),
    successfulCallsWithNextPrimitiveBlocked: succeeded.filter((c) => c.beforeFinalPrimitive >= budget).length,
    warning: 'Only these completed traces are known, not new-prior calls, interrupted calls or validation seeds.' });
}

const requireEvidence = {};
for (const arm of ['fr-base', 'fr-p5']) {
  const step = `parity-${arm}`;
  const dir = join(root, 'tests', 'artifacts', 'ig-proto', 'frozen', 'V4-S2P', step);
  const items = jsonl(join(dir, 'items.jsonl'));
  const outcomes = items.filter((l) => l.type === 'item-end').map((l) => ({ item: l.item, result: l.result, evidence: l.evidence }));
  const genFolder = readdirSync(join(dir, 'logs')).find((n) => n.endsWith('_ig-v4_replay_12x12-nightmare_gen'));
  assert(genFolder);
  const logs = join(dir, 'logs', genFolder);
  const lines = readdirSync(logs).filter((n) => n.endsWith('.jsonl')).flatMap((n) => jsonl(join(logs, n)));
  const starts = lines.filter((l) => l.t === 'start');
  const ends = lines.filter((l) => l.t === 'end');
  requireEvidence[arm] = {
    setCalls: starts.filter((l) => l.stage === 'set').length,
    endedCalls: ends.length,
    setEnds: ends.filter((l) => starts.some((s) => s.call === l.call && s.stage === 'set')).map((l) => ({
      result: l.result, spent: l.locate?.spent, budgetStop: l.locate?.budgetStop ?? null, noWindow: l.locate?.result,
      evidence: l.evidence,
    })),
    outcomes: outcomes.filter((l) => /:gen$|:puzzle-[01]$/.test(l.item)),
  };
}
const universe = json(join(root, 'tools', 'ig-proto', 'plans', 'V4-S4.universe.json'));
const matrix = json(join(root, 'tools', 'ig-proto', 'data', 'frozen-round-v1.json'));
const controls = [...new Set(universe.collections.initial.groups.filter((g) => g.items.includes('S4-3')).map((g) => g.cell))];
const expansion = m.expandMatrix(matrix, { controls });
const pilots = Object.fromEntries(matrix.cells.hell1Conditional.map((cell) => [cell, rawRows.filter((r) => r.arm === 'fr-base' && r.caseId === cell).map((r) => r.run)]));
const epoch = { data: { path: 'analysis-data', sha256: hash(JSON.stringify(matrix)) },
  freeze: { path: 'analysis-not-a-freeze', sha256: hash('proposal only') },
  universe: { path: 'analysis-universe', sha256: hash(JSON.stringify(universe)) } };
const activation = m.activation(expansion, { pilots, approvedOptional: [], epoch });
const universeGroups = Object.values(universe.collections).flatMap((c) => [...(c.groups ?? []), ...(c.comparators ?? [])]);
const priceOfGroup = (group) => {
  const found = universeGroups.find((g) => g.id === group.id);
  assert(found?.price, `Unpriced ${group.id}`);
  return found.price.rowS;
};
const plans = m.activationPlans(expansion, activation, m.stepPrice, {
  activationSha256: hash(JSON.stringify(activation)), rowSOf: priceOfGroup,
});
const preview = (p) => {
  const quoted = m.price(p.steps.filter((s) => s.locked).map((s) => s.price));
  return { rowsOrItems: quoted.ceilingInvocations, lockedSteps: quoted.steps.length, countedMinutes: quoted.countedS / 60,
    guardMinutes: quoted.guardS / 60, ceilingMinutes: quoted.ceilingS / 60, projectedCompleted: quoted.completed,
    projectedCensored: quoted.censored, invocations: quoted.invocations };
};
const s4Price = preview(plans.plan);
const s4cPrice = m.price(plans.template.cells.map((c) => c.price));
const duplicateSteps = plans.plan.steps.filter((s) => s.id.startsWith('rows-fr-frozen-') && !s.id.startsWith('rows-fr-frozen-none-')
  && s.node.includes('--cases') && !s.node[s.node.indexOf('--cases') + 1].includes('master')
  && !['14x14-nightmare', '15x15b10-nightmare'].some((c) => s.node[s.node.indexOf('--cases') + 1].startsWith(`${c}:`)));
const duplicatePrice = m.price(duplicateSteps.map((s) => s.price));
const s2Plan = json(join(root, 'tools', 'ig-proto', 'plans', 'V4-S2.json'));
const fitCells = ['14x14-nightmare', '14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1'];
const rowPrice = fitCells.map((cell) => s2Plan.steps.find((s) => s.id === `rows-fr-base-pilot-${cell}`).price);
const paritySteps = ['fr-fit-s3', 'fr-fit-s3-uncapped'].flatMap((arm) => m.parityPass('V4-S2F-P', arm, m.stepPrice, {}))
  .filter((s) => s.locked).map((s) => s.price);
const fitPrice = m.price([...rowPrice, ...rowPrice, ...paritySteps]);
const oneReplayProof = m.price(paritySteps.slice(0, 1));
const kernel = json(join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2K', 'kernel.json'));
const spikeInput = { type: 'items', groups: [{ kind: 'v4-kernel', variant: 'candidate-composite', lanes: 1, reserveS: 90,
  durationsS: Array.from({ length: 3 }, () => kernel.rows.map((r) => 1.25 * r.itemMs / 1000)).flat() }] };
const spikeOne = m.stepPrice(spikeInput);
const spikeThree = m.price([spikeInput, spikeInput, spikeInput]);
const prices = {
  note: 'Pure price projections only, using T11g arithmetic and immutable universe prices. No plan, activation or allowance is created.',
  T11g: { s4: s4Price, s4c: { rows: 380, countedMinutes: s4cPrice.countedS / 60, guardMinutes: s4cPrice.guardS / 60,
    ceilingMinutes: s4cPrice.ceilingS / 60, invocations: s4cPrice.invocations } },
  optionalFixedNoScreen: { rowsOmitted: duplicatePrice.ceilingInvocations, projectedSavingMinutes: duplicatePrice.countedS / 60,
    guardSavingMinutes: duplicatePrice.guardS / 60, cells: duplicateSteps.map((s) => s.node[s.node.indexOf('--cases') + 1]),
    condition: 'N-V4-18 reviewed end-to-end implementation and authorized activation; do not edit the priced universe now.' },
  fittingPilot: { cells: fitCells, seeds: 'landscape/<cell>/0..4, fitting only', arms: ['fr-fit-s3', 'fr-fit-s3-uncapped'],
    requestRows: 50, parityItems: 24, countedMinutes: fitPrice.countedS / 60, guardMinutes: fitPrice.guardS / 60,
    ceilingMinutes: fitPrice.ceilingS / 60, invocations: fitPrice.invocations,
    accountMinimumMinutesNow: Math.ceil(summary.account.minutes + fitPrice.guardS / 60),
    purpose: 'Check new prior/per-set/budget composite and lost completions before committing the freeze; no live deadline yet.' },
  standaloneReplayProof: { items: 12, countedMinutes: oneReplayProof.countedS / 60, guardMinutes: oneReplayProof.guardS / 60 },
  spike: { candidatesAtMost: 3, pairItemsPerCandidate: 90, cases: kernel.cases, repeats: 3, reserveS: 90,
    perCandidateProjectedMinutes: spikeOne.countedS / 60, perCandidateGuardMinutes: spikeOne.guardS / 60,
    totalProjectedMinutes: spikeThree.countedS / 60, totalGuardMinutes: spikeThree.guardS / 60,
    requestedAdditionalMinutes: Math.ceil(spikeThree.guardS / 60), ceilingMinutes: spikeThree.ceilingS / 60,
    assumption: 'Each new reference/candidate pair costs no more than 1.25 times the corresponding measured r4c/instr item. A projection, not a speed result or allocation.' },
};
const result = {
  status: 'Analysis proposal, not frozen or approved',
  classes: proposalClasses.map((c) => ({ ...c, screen: 'fr-frozen', noScreen: 'fr-frozen-none' })),
  runtimeUnlistedAreas: 'Nightmare 145..195 and 325..359 use canonical 760 M; every absent/invalid class fails closed.',
  split, perSetPooled, perSetStages, nightmarePrior, hellFit, excludedPM1AndHellPilotSeeds: [...seedExclusions].sort(),
  budgetProposal, prefixChecks, requireEvidence,
  deadlineProposal: { reserveMeaning: 'fraction reserved for batch', reserve: 0.6, setCapMs: 46000,
    generationStopMs: 115000, responseBoundMs: 120000, evidence: 'stage2-computed.json projections, no set cut at 0.6 on 165 rows; one ten-puzzle completion lost by the absolute stop on 14x14 Hell 1',
    notYetProved: 'Live enforcement, cancellations, prefix assembly, and the post-fit composite.' },
  prices, inputs,
};
write('freeze-inputs.json', result);
console.log(JSON.stringify({ split: split.map((s) => ({ id: s.id, work: s.work.verdict,
  screen: [s.work.screen.loRatio / 1e9, s.work.screen.hiRatio / 1e9], none: [s.work.noScreen.loRatio / 1e9, s.work.noScreen.hiRatio / 1e9],
  speed: s.faster.geoMean, lower: s.faster.lower })), perSetPooled, hellFit: hellFit.map((h) => [h.key, h.oldShare, h.proposedShare]),
  requireCounts: Object.fromEntries(Object.entries(requireEvidence).map(([a, r]) => [a, { setCalls: r.setCalls, setEnds: r.setEnds.length,
    minSpent: Math.min(...r.setEnds.map((x) => x.spent)), maxSpent: Math.max(...r.setEnds.map((x) => x.spent)) }])), prices }, null, 2));
