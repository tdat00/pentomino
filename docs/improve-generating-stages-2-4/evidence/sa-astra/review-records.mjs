// @ts-check
// Cross-review: recompute from immutable records; never run either architect's writing entry points.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..', '..');
const load = (...p) => import(pathToFileURL(join(root, ...p)).href);
const V = await load('tools', 'ig-proto', 'verdicts.mjs');
const M = await load('tools', 'ig-proto', 'manifest.mjs');
const P = await load('tools', 'ig-proto', 'lib', 'paths.mjs');
const L = await load('tools', 'ig-proto', 'linkage.mjs');
const inputs = new Map();
const hash = (s) => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex');
const read = (file) => {
  const text = readFileSync(file, 'utf8');
  inputs.set(relative(root, file), { path: relative(root, file), sha256Lf: hash(text) });
  return text;
};
const json = (file) => JSON.parse(read(file));
const jsonl = (file) => {
  const parsed = V.parseLines(read(file), relative(root, file));
  assert.deepEqual(parsed.problems, []);
  return parsed.lines.map((l, i) => ({ ...l, evidence: `${relative(root, file)}:${i + 1}` }));
};
const write = (name, value) => writeFileSync(join(here, name), JSON.stringify(value, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const median = (xs) => xs.length ? V.median(xs) : null;
const counts = (xs) => Object.fromEntries([...new Set(xs)].sort().map((x) => [String(x), xs.filter((y) => y === x).length]));
const opts = { quantity: 10, capMs: 120000, responseBoundMs: 120000, resamples: 10000, resampleSeed: 20261116 };
const reps = [0, 1, 2, 3, 4];
const rawRoot = join(root, 'tests', 'artifacts', 'ig-proto', 'frozen');
const pub = join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2');
const arms = ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5'];
const rows = [];
const calls = [];

function parseCalls(lines, owner) {
  const grouped = new Map();
  for (const l of lines) {
    if (!l.call) continue;
    if (!grouped.has(l.call)) grouped.set(l.call, []);
    grouped.get(l.call).push(l);
  }
  return [...grouped].map(([id, ls]) => {
    const start = ls.find((l) => l.t === 'start');
    const end = ls.find((l) => l.t === 'end');
    assert(start);
    const completed = ls.filter((l) => l.t === 'p' || l.t === 'count').map((l) => l.t === 'p' ? l.tuple[4] + l.tuple[5] : l.units);
    const work = sum(completed);
    if (end) assert.equal(work, end.work + end.locate.countWork);
    let pending = null;
    const primitives = [];
    for (const l of ls) {
      if (l.t === 'begin') pending = l;
      if (l.t === 'p' || l.t === 'count') {
        assert(pending);
        primitives.push({ kind: pending.kind, units: l.t === 'p' ? l.tuple[4] + l.tuple[5] : l.units });
        pending = null;
      }
    }
    return { ...owner, id, start, end, work, beforeLastPrimitive: work - (completed.at(-1) ?? 0),
      primitives, open: pending,
      closeProfiles: ls.filter((l) => l.t === 'p' && l.tuple[0] === 'close').map((l) => ({ tuple: l.tuple, evidence: l.evidence })) };
  });
}

for (const arm of arms) {
  for (const name of readdirSync(join(pub, arm)).filter((n) => n.endsWith('.runs.json')).sort()) {
    const file = join(pub, arm, name);
    const text = read(file);
    const published = JSON.parse(text);
    for (const row of published.rows) {
      const ingested = V.ingestRow(row, opts);
      assert.equal(ingested.status, 'valid');
      const dir = join(rawRoot, 'V4-S2', arm, published.shard, 'logs');
      const lines = readdirSync(dir).filter((n) => n.startsWith(`${row.rowKey}.`) && n.endsWith('.jsonl')
        && !n.endsWith('.row.jsonl') && !n.endsWith('.link.jsonl')).sort().flatMap((n) => jsonl(join(dir, n)));
      const links = jsonl(join(dir, `${row.rowKey}.link.jsonl`));
      const ledger = V.rowLedger(lines, links);
      assert(ledger.complete, JSON.stringify(ledger.problems));
      assert.equal(L.timelineProblem(row.run, links), null);
      const link = L.linkSummary(links, 4);
      assert.deepEqual(link.problems, []);
      const cs = parseCalls(lines, { arm, cell: row.caseId, rep: row.rep, rowKey: row.rowKey });
      calls.push(...cs);
      rows.push({ arm, cell: row.caseId, rep: row.rep, rowKey: row.rowKey, run: row.run, ingested, ledger, link, links, calls: cs,
        deadEnds: V.deadEnds(lines),
        evidence: `${relative(root, file)}:${text.split(/\r?\n/).findIndex((l) => l.includes(`"rowKey": "${row.rowKey}"`)) + 1}` });
    }
  }
}
assert.equal(rows.length, 165);
const byArm = (arm, cell) => rows.filter((r) => r.arm === arm && (!cell || r.cell === cell));
const indexedRows = new Map(rows.map((r) => [`${r.arm}|${r.cell}|${r.rep}`, r]));
const classSets = {
  '196-215': ['14x14-nightmare', '15x15b10-nightmare'],
  '196-256': ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'],
  '196-324 measured': ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare', '15x20-nightmare'],
  '16x16 alone': ['16x16-nightmare'],
};
const classes = {};
for (const [id, cells] of Object.entries(classSets)) {
  const take = (a) => byArm(a).filter((r) => cells.includes(r.cell));
  const side = (a) => take(a).map((r) => ({ ingested: r.ingested, ledger: r.ledger }));
  const work = V.workRule(side('fr-screen'), side('fr-none'));
  const matched = [];
  const ratios = {};
  const byCell = {};
  for (const cell of cells) {
    const p = V.pairRows(byArm('fr-screen', cell).map((r) => r.ingested), byArm('fr-none', cell).map((r) => r.ingested), reps);
    assert.deepEqual(p.problems, []);
    const ms = V.matchedSets(p.pairs).matched;
    matched.push(...ms);
    ratios[cell] = V.ratiosOf(p.pairs, reps, opts);
    byCell[cell] = V.clueRule(ms);
  }
  const sharedSeedMargins = reps.map((rep) => {
    const sr = take('fr-screen').filter((r) => r.rep === rep);
    const nr = take('fr-none').filter((r) => r.rep === rep);
    return sum(nr.map((r) => r.ledger.lo)) / sum(nr.map((r) => r.run.acceptedCount))
      - sum(sr.map((r) => r.ledger.hi)) / sum(sr.map((r) => r.run.acceptedCount));
  });
  classes[id] = { cells, work, faster: V.fasterRule(ratios, reps, opts), clue: V.clueRule(matched), byCell,
    marginG: (work.noScreen.loRatio - work.screen.hiRatio) / 1e9, sharedSeedMarginsG: sharedSeedMargins.map((x) => x / 1e9) };
}
const own = json(join(here, 'stage2-computed.json'));
const opusDir = join(root, 'docs', 'improve-generating-stages-2-4', 'evidence', 'sa-opus');
const opusRows = json(join(opusDir, 's2-rows.json'));
const crossChecks = [];
for (const g of own.groups) {
  const rs = byArm(g.arm, g.cell);
  const accepted = sum(rs.map((r) => r.run.acceptedCount));
  const ten = rs.filter((r) => V.reachedTen(r.run, opts)).length;
  const t10 = median(rs.filter((r) => V.reachedTen(r.run, opts)).map((r) => r.run.tenthReadyMs)) / 1000;
  const source = opusRows.arms[g.arm][g.cell];
  assert.equal(accepted, g.accepted);
  assert.equal(accepted, source.accepted);
  assert.equal(ten, g.completed);
  assert.equal(ten, source.reachedTen);
  assert.equal(t10, source.t10MedS);
  assert.equal(sum(rs.map((r) => r.ledger.lo)), g.work.lo);
  assert.equal(sum(rs.map((r) => r.ledger.hi)), g.work.hi);
  assert.equal(median(rs.map((r) => r.run.firstReadyMs)) / 1000, source.t1MedS);
  assert.equal(Math.max(...rs.map((r) => r.run.responseMs)) / 1000, source.respMaxS);
  assert.equal(V.population(rs.map((r) => r.ingested), opts)[g.cell].clueShare.median, source.shareMed);
  assert.equal(V.population(rs.map((r) => r.ingested), opts)[g.cell].scorePosition.median, source.scorePosMed);
  assert.equal(V.population(rs.map((r) => r.ingested), opts)[g.cell].censusEstimateShare, source.censusEstimateShare);
  crossChecks.push({ arm: g.arm, cell: g.cell, accepted, ten, t10, agree: true });
}
const sameConfig = [];
for (const [a, b, cell] of [['fr-base', 'fr-none', '12x12-nightmare'], ['fr-base', 'fr-none', '26x26-nightmare'],
  ['fr-base', 'fr-none', '26x26-hell-1'], ['fr-base', 'fr-screen', '14x14-nightmare']]) {
  const ratios = reps.map((rep) => {
    const ar = byArm(a, cell).find((r) => r.rep === rep);
    const br = byArm(b, cell).find((r) => r.rep === rep);
    assert.deepEqual(ar.run.details.igPuzzleKeys, br.run.details.igPuzzleKeys);
    return V.cappedT10(br.run, opts) / V.cappedT10(ar.run, opts);
  });
  sameConfig.push({ a, b, cell, identical: 5, ratios, geoMean: V.geoMean(ratios) });
}
const openBounds = [];
for (const g of crossChecks) {
  if (!['fr-screen', 'fr-none', 'fr-base'].includes(g.arm)) continue;
  const cs = calls.filter((c) => c.arm === g.arm && c.cell === g.cell);
  const open = cs.filter((c) => !c.end && c.open).map((c) => c.open);
  const kinds = counts(open.map((p) => p.kind));
  const kind = Object.keys(kinds).sort((a, b) => kinds[b] - kinds[a])[0];
  const completeMedian = median(cs.flatMap((c) => c.primitives).filter((p) => p.kind === kind).map((p) => p.units));
  const boundMedian = median(open.map((p) => p.bound));
  openBounds.push({ arm: g.arm, cell: g.cell, open: open.length, kinds, completeMedian, boundMedian, ratio: boundMedian / completeMedian });
}
const boot = {};
for (const [name, cells] of Object.entries(classSets)) {
  for (const sharedSeed of [false, true]) {
    const rand = V.mulberry32(20261123);
    let pass = 0;
    let unknown = 0;
    for (let d = 0; d < 4000; d += 1) {
      let shi = 0;
      let nlo = 0;
      const common = sharedSeed ? Array.from({ length: 20 }, () => Math.floor(rand() * 5)) : null;
      for (const cell of cells) {
        for (let i = 0; i < 20; i += 1) {
          const rep = sharedSeed ? common[i] : Math.floor(rand() * 5);
          shi += indexedRows.get(`fr-screen|${cell}|${rep}`).ledger.hi;
          nlo += indexedRows.get(`fr-none|${cell}|${rep}`).ledger.lo;
        }
      }
      if (shi <= nlo) pass += 1;
      else unknown += 1;
    }
    boot[`${name}/${sharedSeed ? 'common-seed-vector' : 'independent-cells'}`] = { pass, unknown, draws: 4000,
      assumption: 'Synthetic draws from the same five fitting seeds; not validation and not a bound for unseen seeds.' };
  }
}

const mechanismCounterexamples = [];
for (const cell of ['12x12-nightmare', '14x14-nightmare', '26x26-hell-1']) {
  for (const row of byArm('fr-close', cell)) {
    const base = byArm('fr-base', cell).find((r) => r.rep === row.rep);
    const sameKeys = JSON.stringify(row.run.details.igPuzzleKeys) === JSON.stringify(base.run.details.igPuzzleKeys);
    const close = row.calls.flatMap((c) => c.closeProfiles);
    if (sameKeys && close.length) mechanismCounterexamples.push({ cell, rep: row.rep, sameKeys, close,
      baseT10: base.run.tenthReadyMs, closeT10: row.run.tenthReadyMs, costFraction: row.run.tenthReadyMs / base.run.tenthReadyMs - 1,
      evidence: [row.evidence, base.evidence] });
  }
}
const allUncapped = calls.filter((c) => c.arm !== 'fr-p5' && c.end);
const prefix = [];
for (const level of ['nightmare', 'hell-1']) {
  const cs = allUncapped.filter((c) => c.cell.endsWith(level) && c.end.result === 'ok');
  prefix.push({ level, calls: cs.length, maximum: Math.max(...cs.map((c) => c.work)),
    overshootExamplesAt2G: cs.filter((c) => c.work > 2e9 && c.beforeLastPrimitive < 2e9).slice(0, 3).map((c) => ({
      arm: c.arm, cell: c.cell, rep: c.rep, beforeLastPrimitive: c.beforeLastPrimitive, work: c.work, evidence: c.end.evidence,
    })),
    risks: [2, 8, 10, 16, 32, 40].map((b) => ({ budgetG: b, totalExceeds: cs.filter((c) => c.work > b * 1e9).length,
      nextPrimitiveBlocked: cs.filter((c) => c.beforeLastPrimitive >= b * 1e9).length,
      finalPrimitiveOvershootOnly: cs.filter((c) => c.work > b * 1e9 && c.beforeLastPrimitive < b * 1e9).length })) });
}
const requireCases = [];
const requireGeneration = [];
for (const arm of arms) {
  const dir = join(rawRoot, 'V4-S2P', `parity-${arm}`);
  const ls = jsonl(join(dir, 'items.jsonl'));
  const starts = new Map(ls.filter((l) => l.type === 'item-start').map((l) => [l.item, l]));
  for (const e of ls.filter((l) => l.type === 'item-end')) {
    const start = starts.get(e.item);
    if (start.kind === 'v4-select' && e.item.endsWith(':charge') && !e.item.includes('14x14-master')) {
      requireCases.push({ arm, item: e.item, ok: e.result.ok, units: e.result.units, ms: e.result.ms, evidence: e.evidence });
    }
    if (start.kind === 'v4-replay') requireGeneration.push({ arm, item: e.item, outcome: e.result.outcome, work: e.result.work,
      status: e.result.status, evidence: e.evidence });
  }
}
const blockedRow = byArm('fr-base', '14x14-hell-1').find((r) => r.rep === 3);
const batchStart = blockedRow.links.find((l) => l.ev === 'start');
const relativeLinks = blockedRow.links.map((l) => ({ ...l, batchSeconds: (l.at - batchStart.at) / 1000 }));
const headBlocking = {
  row: blockedRow.evidence,
  slot3: relativeLinks.filter((l) => l.slot === 3 && ['dispatch', 'await', 'complete', 'consume', 'discard'].includes(l.ev)),
  doneDiscards: relativeLinks.filter((l) => l.ev === 'discard' && l.done),
  batchEnd: relativeLinks.find((l) => l.ev === 'end'),
};
const prior1 = json(join(root, 'tools', 'ig-proto', 'data', 'prior-v1.json'));
const priors = [];
for (const cell of ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1']) {
  const area = byArm('fr-base', cell)[0].run.details.area;
  const base = calls.filter((c) => c.arm === 'fr-base' && c.cell === cell && c.end && Number.isFinite(c.end.locate.wc));
  const all = calls.filter((c) => ['fr-base', 'fr-screen', 'fr-none', 'fr-c4', 'fr-close'].includes(c.arm)
    && c.cell === cell && c.end && Number.isFinite(c.end.locate.wc));
  const acceptedShares = reps.map((rep) => median(byArm('fr-base', cell).find((r) => r.rep === rep).run.details.puzzles
    .map((p) => p.clues / byArm('fr-base', cell).find((r) => r.rep === rep).run.details.K)));
  const baseShares = reps.map((rep) => median(base.filter((c) => c.rep === rep).map((c) => c.end.locate.wc / c.start.K)));
  priors.push({ cell, old: prior1.cells[`hell-1@${area}`]?.share ?? null,
    actualBaseSetPriors: counts(calls.filter((c) => c.arm === 'fr-base' && c.cell === cell && c.start.stage === 'set').map((c) => c.start.priorCount)),
    opusPooledWc: median(all.map((c) => c.end.locate.wc / c.start.K)), opusCallWeights: counts(all.map((c) => `${c.arm}/${c.rep}`)),
    baseWindowPerSeed: baseShares, baseWindowSeedBalanced: median(baseShares),
    acceptedPerSeed: acceptedShares, acceptedSeedBalanced: median(acceptedShares),
    windowNonHits: counts(all.map((c) => c.end.locate.result)),
  });
}
const pm1Families = ['families-windows.jsonl', 'families-failed-sets.jsonl'].flatMap((n) => jsonl(join(root,
  'docs', 'improve-generating', 'evidence', 'provisional', 'IGP-05', n)));
const pm1 = [];
for (const cell of [...new Set(pm1Families.filter((f) => f.level === 'hell-1').map((f) => f.case))]) {
  const fs = pm1Families.filter((f) => f.level === 'hell-1' && f.case === cell);
  const bySeed = new Map();
  for (const f of fs) {
    const values = f.probes.filter((p) => p.eligible && p.inBand).map((p) => p.count / f.set.K);
    if (!values.length) continue;
    if (!bySeed.has(f.set.seed)) bySeed.set(f.set.seed, []);
    bySeed.get(f.set.seed).push(median(values));
  }
  pm1.push({ cell, area: fs[0].set.area, families: fs.length, eligible: sum(fs.map((f) => f.probes.filter((p) => p.eligible && p.inBand).length)),
    seedBalancedShare: median([...bySeed.values()].map(median)), inputs: fs.map((f) => f.evidence) });
}
const revisedPriorCandidate = [196, 215, 256, 300, 324, 360, 400, 420, 480, 484, 576, 676].map((area) => {
  const piloted = priors.find((p) => byArm('fr-base', p.cell)[0].run.details.area === area);
  const family = pm1.find((p) => p.area === area);
  const share = piloted ? piloted.baseWindowSeedBalanced : family.seedBalancedShare;
  return { key: `hell-1@${area}`, share: Math.round(share * 1e6) / 1e6,
    source: piloted ? 'fr-base ended-call wc/K, median within each pilot seed then across seeds' : 'PM1 eligible window shares, balanced by order then seed' };
});

const inv = readdirSync(rawRoot, { withFileTypes: true }).filter((e) => e.isDirectory())
  .map((e) => join(rawRoot, e.name, 'invocations.jsonl')).filter(existsSync).flatMap(jsonl);
const s2Inv = inv.filter((i) => i.task === 'V4-S2');
const accountS = sum(inv.map((i) => i.countedSeconds)) + 87.4;
const live = json(join(root, 'tools', 'ig-proto', 'plans', 'V4-LIVE.json'));
const liveGuardS = M.planGuardS(live);
const data = json(join(root, 'tools', 'ig-proto', 'data', 'frozen-round-v1.json'));
const controls = M.controlsFrom(P.mp12b1Report, data.cells.failingNightmare);
const unpiloted = controls.filter((cell) => byArm('fr-none', cell).length === 0);
const factor = M.factor();
const supplementSteps = unpiloted.map((cell) => {
  const found = P.mp12b1Report(cell);
  if (found) read(join(root, found.path));
  return { cell, price: { type: 'rows', rows: 5, rowS: M.projectedRowS({ refS: M.refS(cell), factor, rowLimitS: 260 }), rowLimitS: 260 } };
});
const supplement = M.price(supplementSteps.map((s) => s.price));
const todayPreview = [];
for (const cell of ['10x10-nightmare', '26x26-nightmare']) {
  const found = P.mp12b1Report(cell);
  read(join(root, found.path));
  for (const arm of ['fr-screen', 'fr-none']) {
    const ratios = reps.map((rep) => V.cappedT10(M.withoutSampling(found.report.runs.find((r) => r.probeKind === 'generation' && r.rep === rep)), opts)
      / V.cappedT10(byArm(arm, cell).find((r) => r.rep === rep).run, opts));
    todayPreview.push({ cell, arm, ratios, noRegressionDiagnostic: V.noRegression(ratios, reps, opts),
      note: 'Five fitting seeds and a different source/time; not the formal validation gate.' });
  }
}
const universe = json(join(root, 'tools', 'ig-proto', 'plans', 'V4-S4.universe.json'));
const expansion = M.expandMatrix(data, { controls, secondValidationBoards: [] });
const pilots = Object.fromEntries(data.cells.hell1Conditional.map((cell) => [cell, byArm('fr-base', cell).map((r) => r.run)]));
const epoch = Object.fromEntries(['data', 'freeze', 'universe'].map((k) => [k, { path: `analysis-only-${k}`, sha256: hash(k) }]));
const activated = M.activation(expansion, { pilots, approvedOptional: [], epoch });
const universeGroups = Object.values(universe.collections).flatMap((c) => [...(c.groups ?? []), ...(c.comparators ?? [])]);
const plans = M.activationPlans(expansion, activated, M.stepPrice, {
  activationSha256: hash(JSON.stringify(activated)), rowSOf: (g) => universeGroups.find((x) => x.id === g.id).price.rowS,
});
const summaryPrice = (p) => ({ projectedMinutes: p.countedS / 60, guardMinutes: p.guardS / 60, invocations: p.invocations,
  units: p.ceilingInvocations, ceilingMinutes: p.ceilingS / 60 });
const formalS4 = M.price(plans.plan.steps.filter((s) => s.locked).map((s) => s.price));
const formalS4C = M.price(plans.template.cells.map((c) => c.price));
const fixedCells = ['3x29-nightmare', '10x10-nightmare', '12x12-nightmare', '14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1'];
const duplicateSteps = plans.plan.steps.filter((s) => s.id.startsWith('rows-fr-frozen-') && !s.id.startsWith('rows-fr-frozen-none-'))
  .filter((s) => fixedCells.some((cell) => s.node[s.node.indexOf('--cases') + 1].startsWith(`${cell}:`)));
const duplicates = M.price(duplicateSteps.map((s) => s.price));
const preProofs = M.price(['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped']
  .flatMap((arm) => M.parityPass('review-only', arm, M.stepPrice, {})).filter((s) => s.locked).map((s) => s.price));

const meanResponse = (arm, cell) => {
  const rs = byArm(arm, cell);
  return rs.length ? sum(rs.map((r) => r.run.responseMs / 1000)) / rs.length : null;
};
const overhead = median(s2Inv.filter((i) => i.step.startsWith('rows-')).map((i) => {
  const group = rows.filter((r) => i.step === `rows-${r.arm}-pilot-${r.cell}`);
  assert.equal(group.length, 5);
  return (i.nodeSeconds - sum(group.map((r) => r.run.responseMs / 1000))) / group.length;
}));
const passingP1 = s2Inv.filter((i) => i.step.startsWith('parity-fr-') && i.step !== 'parity-fr-p5');
const p1NodeS = 4 * sum(passingP1.map((i) => i.nodeSeconds)) / passingP1.length;
const selectedGroups = expansion.groups.filter((g) => g.stage === 4 && ['initial', 'conditional'].includes(g.collection));
function projectedScenario(includeTestedScreenClasses) {
  const totals = { 'V4-S4': { node: p1NodeS, invocations: 4 }, 'V4-S4C': { node: 0, invocations: 0 } };
  const mapping = [];
  for (const g of selectedGroups) {
    let arm = g.arm === 'shipped-uncapped'
      ? ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'].includes(g.cell) ? 'fr-frozen-uncapped' : 'fr-frozen-none-uncapped'
      : g.arm;
    let measuredArm = null;
    if (arm !== 'log-link') {
      if (g.cell.endsWith('hell-1')) measuredArm = meanResponse('fr-ps', g.cell) === null ? 'fr-base' : 'fr-ps';
      else if (['fr-frozen', 'fr-frozen-uncapped'].includes(arm) && (
        ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'].includes(g.cell)
        || (includeTestedScreenClasses && ['15x20-nightmare', '26x26-nightmare'].includes(g.cell)))) measuredArm = 'fr-screen';
      else measuredArm = 'fr-none';
    }
    const measured = measuredArm ? meanResponse(measuredArm, g.cell) : null;
    const reference = M.refS(g.cell);
    const rowS = measured === null ? reference === null ? g.rowLimitS : factor * reference + overhead
      : Math.min(measured, g.rowLimitS === 130 ? 120 : measured) + overhead;
    const simulated = M.simulateRows({ rows: g.rows, rowS, rowLimitS: g.rowLimitS });
    totals[g.task].node += simulated.nodeS;
    totals[g.task].invocations += simulated.invocations.length;
    mapping.push({ id: g.id, assumedSource: measuredArm, rowS });
  }
  return { totals: Object.fromEntries(Object.entries(totals).map(([id, t]) => [id, { ...t,
    minutesQuiet15: (t.node + 15 * t.invocations) / 60, minutesQuiet45: (t.node + 45 * t.invocations) / 60 }])), mapping };
}
const publishedOpusScenario = projectedScenario(false);
const correctedOpusScenario = projectedScenario(true);
const opusCost = json(join(opusDir, 's4-cost.json'));
assert(Math.abs(publishedOpusScenario.totals['V4-S4'].minutesQuiet45 - opusCost.summary['V4-S4'].countedFullMin) < 1e-8);
const kernel = json(join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2K', 'kernel.json'));
const kernelRatios = kernel.cases.map((cell) => {
  const rs = kernel.rows.filter((r) => r.caseId === cell);
  assert(rs.every((r) => r.same && r.status === 'completed'));
  const add = (key) => sum(rs.map((r) => r.r4[key]));
  return { cell, items: rs.length, dirty: add('dirtyPieces') / add('pieces'), changed: add('countChanged') / add('pieces'),
    live: add('liveRows') / add('staticRows') };
});
const profiles = kernel.profile.rows.map((r) => {
  const p = json(join(root, r.record.file));
  const nodes = new Map(p.nodes.map((n) => [n.id, n.callFrame]));
  const totals = new Map();
  for (let i = 0; i < p.samples.length; i += 1) {
    const f = nodes.get(p.samples[i]);
    const key = `${f.url}#${f.functionName}`;
    if (!totals.has(key)) totals.set(key, { name: f.functionName, file: f.url, ms: 0 });
    totals.get(key).ms += p.timeDeltas[i] / 1000;
  }
  const total = sum([...totals.values()].map((t) => t.ms));
  const deduce = sum([...totals.values()].filter((t) => /deduce\.js$/.test(t.file)).map((t) => t.ms));
  const fewest = sum([...totals.values()].filter((t) => t.name === 'fewestColumn').map((t) => t.ms));
  assert(Math.abs(total - r.record.totalMs) < 0.001);
  assert(Math.abs(deduce - r.record.deduceMs) < 0.001);
  return { cell: r.caseId, total, deduce, fewest, top: [...totals.values()].sort((a, b) => b.ms - a.ms).slice(0, 10)
    .map((t) => ({ name: t.name, ms: t.ms, totalShare: t.ms / total })) };
});
const width = json(join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2W', 'width.json'));
const widthRatios = width.rows.map((r) => {
  assert.equal(r.ms.length, r.expected);
  assert(Math.abs(median(r.ms) - r.medianMs) < 0.0001);
  const sorted = r.ms.slice().sort((a, b) => a - b);
  assert.equal(sorted[Math.ceil(sorted.length * 0.9) - 1], r.p90Ms);
  return { cell: r.caseId, width: r.width, n: sorted.length, median: median(r.ms),
    versusFour: median(r.ms) / median(width.rows.find((q) => q.caseId === r.caseId && q.width === 4).ms) };
});
for (const p of [['tools', 'ig-proto', 'variants', 'files', 'v4', 'core', 'engine', 'ig-select-v4.js'],
  ['tools', 'ig-proto', 'lib', 'lane-worker.mjs'], ['tools', 'ig-proto', 'v4-check.mjs'],
  ['tools', 'ig-proto', 'manifest.mjs'], ['tools', 'ig-proto', 'verdicts.mjs']]) read(join(root, ...p));
const output = {
  base: '1afce41', evidenceCommit: '35b401e', note: 'Unlocked computations only. No original analysis/evidence rewritten.',
  totals: { rows: rows.length, accepted: sum(rows.map((r) => r.run.acceptedCount)), completed: rows.filter((r) => V.reachedTen(r.run, opts)).length,
    calls: calls.length, ended: calls.filter((c) => c.end).length, uncappedEnded: allUncapped.length,
    uncappedResults: counts(allUncapped.map((c) => c.end.result)), p5Results: counts(calls.filter((c) => c.arm === 'fr-p5' && c.end).map((c) => c.end.result)) },
  crossChecks, classes, sameConfig, openBounds, boot, mechanismCounterexamples, prefix, requireCases, requireGeneration,
  headBlocking, priors, pm1, revisedPriorCandidate, kernelRatios, profiles, widthRatios,
  controls, unpiloted, todayPreview,
  account: { loggedS: accountS - 87.4, offLogS: 87.4, countedS: accountS, minutes: accountS / 60,
    liveGuardS, liveMinimumAccountMinutes: Math.ceil((accountS + liveGuardS) / 60), grant: 749, runnerCap: 747 },
  prices: { controlPilot: summaryPrice(supplement), preactivationP1: summaryPrice(preProofs),
    S4: summaryPrice(formalS4), S4C: summaryPrice(formalS4C), optionalDuplicateSavingS4Only: summaryPrice(duplicates),
    projectedOverheadS: overhead, publishedOpusScenario, correctedOpusScenario },
};
write('review-records.json', output);
write('review-input-index.json', [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path)));
console.log(JSON.stringify({ totals: output.totals, verifiedGroups: crossChecks.length,
  classes: Object.fromEntries(Object.entries(classes).map(([k, c]) => [k, { work: c.work.verdict,
    marginG: c.marginG, faster: c.faster, clue: c.clue, seedMargins: c.sharedSeedMarginsG }])),
  mechanismCounterexamples: mechanismCounterexamples.map((x) => ({ cell: x.cell, rep: x.rep, profiles: x.close.length, extraTime: x.costFraction })),
  prefix, requireCases, account: output.account,
  prices: { controlPilot: output.prices.controlPilot, preactivationP1: output.prices.preactivationP1,
    S4: output.prices.S4, S4C: output.prices.S4C, duplicateSaving: output.prices.optionalDuplicateSavingS4Only,
    correctedScenario: correctedOpusScenario.totals }, priors }, null, 2));
