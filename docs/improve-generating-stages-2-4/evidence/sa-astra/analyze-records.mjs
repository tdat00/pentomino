// @ts-check
// Unlocked arithmetic on immutable observations; no engine calls, tree builds or harness commands.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const out = dirname(fileURLToPath(import.meta.url));
const root = resolve(out, '..', '..', '..', '..');
const load = (...parts) => import(pathToFileURL(join(root, ...parts)).href);
const v = await load('tools', 'ig-proto', 'verdicts.mjs');
const linkage = await load('tools', 'ig-proto', 'linkage.mjs');
const proof = await load('tools', 'ig-proto', 'lib', 'proof.mjs');
const pricing = await load('tools', 'ig-proto', 'manifest.mjs');
const inputs = new Map();
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const med = (xs) => xs.length ? v.median(xs) : null;
const stats = (xs) => xs.length ? { n: xs.length, min: Math.min(...xs), median: med(xs), max: Math.max(...xs) } : null;
const counts = (xs) => Object.fromEntries([...new Set(xs)].sort().map((x) => [String(x), xs.filter((y) => x === y).length]));
const hash = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const rel = (path) => relative(root, path);
const read = (path) => {
  const text = readFileSync(path, 'utf8');
  inputs.set(rel(path), { path: rel(path), sha256Lf: hash(text), bytes: Buffer.byteLength(text) });
  return text;
};
const json = (path) => JSON.parse(read(path));
const jsonl = (path) => {
  const text = read(path);
  const parsed = v.parseLines(text, rel(path));
  assert.deepEqual(parsed.problems, [], `Malformed journal ${path}`);
  return parsed.lines.map((line, i) => ({ ...line, evidence: `${rel(path)}:${i + 1}` }));
};
const write = (name, text) => writeFileSync(join(out, name), text.trimEnd().replace(/\r?\n/g, '\r\n') + '\r\n', 'utf8');
const writeJson = (name, value) => write(name, JSON.stringify(value, null, 2));
const fmt = (x, digits = 3) => x === null || x === undefined ? '-' : x.toFixed(digits);
const giga = (x) => fmt(x / 1e9);
const secs = (s) => s ? `${fmt(s.median / 1000, 2)} [${fmt(s.min / 1000, 2)}, ${fmt(s.max / 1000, 2)}]` : '-';
const table = (heads, rows) => [
  `| ${heads.join(' | ')} |`, `| ${heads.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`),
];
const reps = [0, 1, 2, 3, 4];
const options = { quantity: 10, capMs: 120000, responseBoundMs: 120000, resamples: 10000, resampleSeed: 20261116 };
const arms = ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5'];
const published = join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2');
const raw = join(root, 'tests', 'artifacts', 'ig-proto', 'frozen', 'V4-S2');
const rows = [];
const calls = [];
const groups = [];
const issues = [];

function classOf(level, area) {
  if (level === 'hell-1') return 'hell-1';
  if (level !== 'nightmare') return null;
  return area <= 144 ? 'n-small' : area >= 196 && area <= 324 ? 'n-mid' : area >= 360 ? 'n-large' : null;
}

function expectedW(arm, level, area) {
  const cls = classOf(level, area);
  if (arm === 'fr-screen' && cls) return cls === 'hell-1' ? 380e6 : 190e6;
  return arm !== 'fr-none' && cls === 'n-mid' ? 190e6 : 760e6;
}

function sideOf(end) {
  return end?.locate?.result === 'below-to-one' ? 'below' : end?.locate?.result === 'above-to-max' ? 'above' : null;
}

function readRow(arm, shard, row, file, line) {
  assert.equal(row.seed, `landscape/${row.caseId}/${row.rep}`);
  assert.equal(row.run.workerCount, 4);
  const logdir = join(raw, arm, shard, 'logs');
  const workerFiles = readdirSync(logdir).filter((n) => n.startsWith(`${row.rowKey}.`) && n.endsWith('.jsonl')
    && !n.endsWith('.row.jsonl') && !n.endsWith('.link.jsonl')).sort();
  const lines = workerFiles.flatMap((n) => jsonl(join(logdir, n)));
  const linkLines = jsonl(join(logdir, `${row.rowKey}.link.jsonl`));
  const ledger = v.rowLedger(lines, linkLines);
  const ingested = v.ingestRow(row, options);
  const link = linkage.linkSummary(linkLines, 4);
  const timeline = linkage.timelineProblem(row.run, linkLines);
  const perCall = new Map();
  for (const l of lines) {
    if (!l.call) continue;
    if (!perCall.has(l.call)) perCall.set(l.call, []);
    perCall.get(l.call).push(l);
  }
  const rowCalls = [];
  for (const [id, ls] of perCall) {
    const start = ls.find((l) => l.t === 'start');
    const end = ls.find((l) => l.t === 'end');
    if (!start) {
      issues.push({ arm, row: row.rowKey, issue: 'call has no start', id });
      continue;
    }
    let pending = null;
    let lower = 0;
    const increments = [];
    for (const l of ls) {
      if (l.t === 'begin') pending = l;
      if (l.t === 'p' || l.t === 'count') {
        const units = l.t === 'p' ? l.tuple[4] + l.tuple[5] : l.units;
        lower += units;
        increments.push({ units, kind: l.t === 'p' ? l.tuple[0] : 'count' });
        pending = null;
      }
    }
    const termination = end ? null : linkLines.find((l) => l.ev === 'worker-end' && l.pid === Number(id.split(':').at(-3))
      && l.threadId === Number(id.split(':').at(-2)) && l.at >= start.at);
    const profiles = ls.filter((l) => l.t === 'p').map((l) => l.tuple);
    const c = {
      arm, rowKey: row.rowKey, caseId: row.caseId, rep: row.rep, id, stage: start.stage, attempt: start.attempt,
      W: start.W, expectedW: expectedW(arm, start.level, start.A), area: start.A, K: start.K, priorCount: start.priorCount,
      startCount: start.startCount, startAt: start.at, endAt: end?.at ?? null, result: end?.result ?? 'terminated',
      end: end ? { ...end, accepted: undefined } : null, lo: lower, hi: lower + (!end && pending ? pending.bound : 0),
      open: !end && pending ? { kind: pending.kind, bound: pending.bound, evidence: pending.evidence } : null,
      terminated: !!termination, profiles: profiles.length, ratingMs: sum(profiles.map((t) => t[12])),
      locateMs: sum(profiles.filter((t) => t[0] === 'locate').map((t) => t[12])),
      locateProfiles: profiles.filter((t) => t[0] === 'locate').length,
      closeProfiles: profiles.filter((t) => t[0] === 'close').length,
      belowProfiles: profiles.filter((t) => t[0] === 'below').length,
      beforeFinalPrimitive: lower - (increments.at(-1)?.units ?? 0),
      increments, evidence: { start: start.evidence, end: end?.evidence ?? null, termination: termination?.evidence ?? null },
    };
    if (start.W !== c.expectedW) issues.push({ arm, row: row.rowKey, issue: 'W differs from arm class', call: id });
    rowCalls.push(c);
    calls.push(c);
  }
  if (ledger.complete) {
    assert.equal(sum(rowCalls.map((c) => c.lo)), ledger.lo, `Independent lower ${arm}/${row.rowKey}`);
    assert.equal(sum(rowCalls.map((c) => c.hi)), ledger.hi, `Independent upper ${arm}/${row.rowKey}`);
  }
  if (!ledger.complete || ingested.status !== 'valid' || timeline || link.problems.length) {
    issues.push({ arm, rowKey: row.rowKey, status: ingested.status, ledger: ledger.problems, timeline, link: link.problems });
  }
  const population = v.population([ingested], options)[row.caseId];
  const accepted = row.run.details?.puzzles ?? [];
  assert.equal(accepted.length, row.run.acceptedCount);
  assert.equal(v.puzzleEvidence(row.run).keys, null);
  for (const p of accepted) {
    const bounds = p.level === 'nightmare' ? [53, 77] : [77, 112];
    assert(p.score >= bounds[0] && p.score < bounds[1]);
    assert(p.metrics.Gproved >= 1);
  }
  const record = {
    arm, shard, caseId: row.caseId, rowKey: row.rowKey, rep: row.rep, seed: row.seed, ingested,
    ledger, link, timeline, population, calls: rowCalls, lines, linkLines, evidence: `${rel(file)}:${line}`,
    deadEnds: v.deadEnds(lines),
  };
  rows.push(record);
}

for (const arm of arms) {
  const dir = join(published, arm);
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.runs.json')).sort()) {
    const path = join(dir, name);
    const text = read(path);
    const record = JSON.parse(text);
    const state = json(join(raw, arm, record.shard, 'state.json'));
    assert.equal(state.done, true);
    assert.equal(record.rows.length, 5);
    assert.deepEqual(record.rows.map((r) => r.rep), reps);
    const lines = text.split(/\r?\n/);
    for (const row of record.rows) {
      const line = lines.findIndex((l) => l.includes(`"rowKey": "${row.rowKey}"`)) + 1;
      readRow(arm, record.shard, row, path, line);
    }
    const selected = rows.filter((r) => r.arm === arm && r.shard === record.shard);
    const runs = selected.map((r) => r.ingested.run);
    const gcalls = selected.flatMap((r) => r.calls);
    const ended = gcalls.filter((c) => c.end);
    const lo = sum(selected.map((r) => r.ledger.lo));
    const hi = sum(selected.map((r) => r.ledger.hi));
    const accepted = sum(runs.map((r) => r.acceptedCount));
    const pops = v.population(selected.map((r) => r.ingested), options);
    const g = {
      arm, cell: selected[0].caseId, rows: selected.length, statuses: counts(selected.map((r) => r.ingested.status)),
      completed: runs.filter((r) => v.reachedTen(r, options)).length, accepted,
      responseMs: stats(runs.map((r) => r.responseMs)), t1Ms: stats(runs.map((r) => r.firstReadyMs).filter(Number.isFinite)),
      t10Ms: stats(runs.map((r) => r.tenthReadyMs).filter(Number.isFinite)), cappedT10Ms: stats(runs.map((r) => v.cappedT10(r, options))),
      setMs: stats(runs.map((r) => r.igSetMs).filter(Number.isFinite)),
      batchMs: stats(runs.filter((r) => Number.isFinite(r.tenthReadyMs) && Number.isFinite(r.igSetMs)).map((r) => r.tenthReadyMs - r.igSetMs)),
      setFraction: stats(runs.filter((r) => r.tenthReadyMs > 0).map((r) => r.igSetMs / r.tenthReadyMs)),
      deadlineViolations: runs.filter((r) => v.deadlineViolation(r, options)).length,
      reasons: counts(runs.map((r) => r.partialReason ?? 'complete')),
      work: { lo, hi, loPerAccepted: accepted ? lo / accepted : null, hiPerAccepted: accepted ? hi / accepted : null,
        widthPerAccepted: accepted ? (hi - lo) / accepted : null, complete: selected.every((r) => r.ledger.complete),
        terminated: sum(selected.map((r) => r.ledger.terminated)), open: sum(selected.map((r) => r.ledger.open)) },
      population: pops[selected[0].caseId], clueCount: stats(runs.flatMap((r) => (r.details?.puzzles ?? []).map((p) => p.clues))),
      deadEnds: sum(selected.map((r) => r.deadEnds)), calls: gcalls.length, ended: ended.length,
      close: counts(ended.filter((c) => c.end.locate?.close).map((c) => c.end.locate.close.side)),
      c4: counts(ended.filter((c) => c.end.locate?.c4).map((c) => c.end.locate.c4.side)),
      closeProfiles: sum(gcalls.map((c) => c.closeProfiles)), belowProfiles: sum(gcalls.map((c) => c.belowProfiles)),
      w: counts(gcalls.map((c) => c.W)), wMismatches: gcalls.filter((c) => c.W !== c.expectedW).length,
      link: { dispatched: sum(selected.map((r) => r.link.dispatched)), completed: sum(selected.map((r) => r.link.completed)),
        accepted: sum(selected.map((r) => r.link.consumed.accepted)), discardedDone: sum(selected.map((r) => r.link.discarded.done)),
        discardedInflight: sum(selected.map((r) => r.link.discarded.inflight)),
        awaitMs: sum(selected.map((r) => r.link.awaitMs)), idleWorkerMs: sum(selected.map((r) => r.link.idleWorkerMs)) },
      locate: { profiles: sum(gcalls.map((c) => c.locateProfiles)), ratingMs: sum(gcalls.map((c) => c.ratingMs)),
        locateMs: sum(gcalls.map((c) => c.locateMs)), endedProbes: stats(ended.map((c) => c.end.locate?.probes).filter(Number.isFinite)) },
      evidence: selected.map((r) => r.evidence),
    };
    groups.push(g);
  }
}
assert.equal(rows.length, 165);
assert.equal(groups.length, 33);
const armRows = (arm, cell) => rows.filter((r) => r.arm === arm && (!cell || r.caseId === cell));
const compared = [];
const comparisonSpecs = [
  ['screen', 'fr-screen', 'fr-none'], ['close', 'fr-close', 'fr-base'], ['c4', 'fr-c4', 'fr-base'],
  ['per-set', 'fr-ps', 'fr-base'], ['P5', 'fr-p5', 'fr-base'],
];
for (const [kind, changed, reference] of comparisonSpecs) {
  const cells = [...new Set(armRows(changed).map((r) => r.caseId))];
  for (const cell of cells) {
    const a = armRows(changed, cell);
    const b = armRows(reference, cell);
    const paired = v.pairRows(a.map((r) => r.ingested), b.map((r) => r.ingested), reps);
    assert.deepEqual(paired.problems, []);
    const matched = v.matchedSets(paired.pairs);
    const ratios = v.ratiosOf(paired.pairs, reps, options);
    compared.push({
      kind, changed, reference, cell, matched: matched.matched,
      clue: v.clueRule(matched.matched),
      time: v.fasterRule({ [cell]: ratios }, reps, options), ratios,
      identicalPuzzleKeys: paired.pairs.filter((p) => JSON.stringify(p.a.run.details?.igPuzzleKeys) === JSON.stringify(p.b.run.details?.igPuzzleKeys)).length,
      work: v.workRule(a.map((r) => ({ ingested: r.ingested, ledger: r.ledger })), b.map((r) => ({ ingested: r.ingested, ledger: r.ledger }))),
    });
  }
}
const classes = [];
for (const cls of ['n-small', 'n-mid', 'n-large', 'hell-1']) {
  const selectedCells = groups.filter((g) => g.arm === 'fr-screen').filter((g) => {
    const c = calls.find((c) => c.arm === 'fr-screen' && c.caseId === g.cell);
    return classOf(c.caseId.endsWith('hell-1') ? 'hell-1' : 'nightmare', c.area) === cls;
  }).map((g) => g.cell);
  const a = armRows('fr-screen').filter((r) => selectedCells.includes(r.caseId));
  const b = armRows('fr-none').filter((r) => selectedCells.includes(r.caseId));
  const work = v.workRule(a.map((r) => ({ ingested: r.ingested, ledger: r.ledger })), b.map((r) => ({ ingested: r.ingested, ledger: r.ledger })));
  const diagnostic = compared.filter((c) => c.kind === 'screen' && selectedCells.includes(c.cell));
  const matched = diagnostic.flatMap((c) => c.matched);
  classes.push({
    class: cls, cells: selectedCells,
    faster: v.fasterRule(Object.fromEntries(diagnostic.map((c) => [c.cell, c.ratios])), reps, options),
    clue: v.clueRule(matched), work,
    widths: { screen: work.screen.hiRatio - work.screen.loRatio, noScreen: work.noScreen.hiRatio - work.noScreen.loRatio },
    open: { screen: sum(a.map((r) => r.ledger.open)), noScreen: sum(b.map((r) => r.ledger.open)) },
    note: 'Pilot diagnostic only; five independent seeds per cell cannot meet the validation minimum of 15 matched seeds.',
  });
}
const p5 = [];
for (const cell of [...new Set(armRows('fr-p5').map((r) => r.caseId))]) {
  const selected = armRows('fr-p5', cell);
  const stopped = selected.flatMap((r) => r.calls).filter((c) => c.end?.locate?.budgetStop);
  const setStopped = stopped.filter((c) => c.stage === 'set');
  const eligible = [];
  for (const r of selected) {
    const first = [0, 1, 2, 3].map((attempt) => r.calls.find((c) => c.stage === 'set' && c.attempt === attempt));
    const sides = first.map((c) => sideOf(c?.end));
    if (sides.every((s) => s && s === sides[0])) {
      eligible.push({ rowKey: r.rowKey, side: sides[0], reason: r.ingested.run.partialReason,
        gluePass: r.ingested.run.partialReason === `set:no-window-${sides[0]}`, evidence: first.map((c) => c.evidence.end) });
    }
  }
  p5.push({
    cell, comparisons: v.p5Stops(selected.map((r) => r.ingested), armRows('fr-base', cell).map((r) => r.ingested), { ...options, cell, reps }),
    glueEligibleRows: eligible, noWindowCalls: selected.flatMap((r) => r.calls).filter((c) => sideOf(c.end)).length,
    budgetStops: stopped.length, byStage: counts(stopped.map((c) => c.stage)), setBudgetStops: setStopped.length,
    setBudgetNoSideFailures: setStopped.filter((c) => c.end.result === 'not-in-band' && sideOf(c.end) === null).map((c) => ({
      rowKey: c.rowKey, attempt: c.attempt, work: c.end.locate.spent, evidence: c.evidence.end,
    })),
    stopWork: stats(stopped.map((c) => c.end.locate.spent)),
  });
}
const priors = [];
for (const r of armRows('fr-ps')) {
  const selected = r.calls.find((c) => c.stage === 'set' && c.attempt === r.ingested.run.details?.setAttempt);
  const batches = r.calls.filter((c) => c.stage === 'batch');
  priors.push({ rowKey: r.rowKey, cell: r.caseId, setAttempt: selected?.attempt, wc: selected?.end?.locate?.wc,
    batchCalls: batches.length, batchPriors: counts(batches.map((c) => c.priorCount)),
    mismatches: batches.filter((c) => c.priorCount !== selected?.end?.locate?.wc).map((c) => c.id),
    evidence: { set: selected?.evidence.end, firstBatch: batches[0]?.evidence.start } });
}
const budgetInputs = [];
const budgets = [1e9, 2e9, 4e9, 6e9, 8e9, 12e9, 16e9];
for (const g of groups.filter((g) => ['fr-base', 'fr-none', 'fr-screen', 'fr-ps'].includes(g.arm))) {
  for (const stage of ['set', 'batch']) {
    const cs = calls.filter((c) => c.arm === g.arm && c.caseId === g.cell && c.stage === stage);
    const ok = cs.filter((c) => c.result === 'ok');
    const failed = cs.filter((c) => c.end && c.result !== 'ok');
    budgetInputs.push({ arm: g.arm, cell: g.cell, stage, calls: cs.length, successful: ok.length, failed: failed.length,
      terminated: cs.filter((c) => !c.end).length, okWork: stats(ok.map((c) => c.lo)),
      thresholds: budgets.map((b) => ({ budget: b, successfulBeyond: ok.filter((c) => c.beforeFinalPrimitive >= b).length,
        successfulOvershoot: ok.filter((c) => c.beforeFinalPrimitive < b && c.lo >= b).length,
        failedWorkAbove: sum(failed.map((c) => Math.max(0, c.lo - b))),
        note: 'Prefix-risk arithmetic, not a budget run: a stopped any call may return a retained earlier candidate.' })) });
  }
}
const projections = [];
for (const g of groups) {
  for (const reserve of [0.3, 0.4, 0.5, 0.6, 0.7]) {
    const result = v.deadlineProjection(armRows(g.arm, g.cell).map((r) => r.ingested), { reserve, deadlineMs: 115000, quantity: 10 });
    projections.push({ arm: g.arm, cell: g.cell, reserve, setCapMs: 115000 * (1 - reserve),
      setCuts: result.rows.filter((r) => r.setCut).length, completed: result.rows.filter((r) => r.completed).length,
      lost: result.rows.filter((r) => r.lost).length, statuses: counts(result.rows.map((r) => r.status)), label: result.label });
  }
}
const proofDir = join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2P');
const receipts = [];
for (const name of readdirSync(proofDir).filter((n) => n.endsWith('.receipt.json')).sort()) {
  const file = join(proofDir, name);
  const receipt = json(file);
  const bindingFile = file.replace('.receipt.json', '.accepted.json');
  let binding = null;
  if (existsSync(bindingFile)) {
    const b = json(bindingFile);
    const current = b.expected.arms.map((a) => {
      const tree = json(join(root, 'tests', 'artifacts', 'ig-proto', 'tree-frozen', a.id, 'ig-tree.json'));
      return { id: a.id, treeId: tree.treeId, paramsHash: hash(JSON.stringify(tree.params)) };
    });
    binding = proof.checkAccepted(b, { readFile: (p) => existsSync(join(root, p)) ? read(join(root, p)) : null, current });
  }
  receipts.push({ file: rel(file), verdict: receipt.verdict, kind: receipt.kind, blocks: receipt.blocks, coverage: receipt.coverage, binding });
}
const kernelFile = join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2K', 'kernel.json');
const kernel = json(kernelFile);
const kernelSums = [];
for (const cell of kernel.cases) {
  const rs = kernel.rows.filter((r) => r.caseId === cell);
  const fields = Object.keys(rs[0].r4);
  const totals = Object.fromEntries(fields.map((f) => [f, sum(rs.map((r) => r.r4[f]))]));
  kernelSums.push({ cell, items: rs.length, equal: rs.filter((r) => r.same === true && r.status === 'completed').length, ...totals,
    dirtyFraction: totals.dirtyPieces / totals.pieces, countChangedFraction: totals.countChanged / totals.pieces,
    liveFraction: totals.liveRows / totals.staticRows });
}
const profiles = [];
for (const row of kernel.profile.rows) {
  const path = join(root, row.record.file);
  const profile = json(path);
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const nodeTimes = new Map();
  for (let i = 0; i < profile.samples.length; i += 1) {
    const id = profile.samples[i];
    nodeTimes.set(id, (nodeTimes.get(id) ?? 0) + profile.timeDeltas[i] / 1000);
  }
  const byFunction = new Map();
  for (const [id, ms] of nodeTimes) {
    const frame = nodes.get(id).callFrame;
    const key = `${frame.url}#${frame.functionName}`;
    if (!byFunction.has(key)) byFunction.set(key, { name: frame.functionName, file: frame.url, ms: 0 });
    byFunction.get(key).ms += ms;
  }
  const totalMs = sum([...nodeTimes.values()]);
  const deduceMs = sum([...byFunction.values()].filter((f) => /core[\\/]engine[\\/]deduce\.js$/.test(f.file)).map((f) => f.ms));
  const fewestMs = sum([...byFunction.values()].filter((f) => f.name === 'fewestColumn').map((f) => f.ms));
  assert(Math.abs(totalMs - row.record.totalMs) < 0.001);
  assert(Math.abs(deduceMs - row.record.deduceMs) < 0.001);
  profiles.push({ cell: row.caseId, path: rel(path), totalMs, deduceMs, fewestMs, fewestShare: fewestMs / deduceMs,
    hottest: [...byFunction.values()].sort((a, b) => b.ms - a.ms).slice(0, 18).map((f) => ({ ...f, totalShare: f.ms / totalMs,
      deduceShare: /core[\\/]engine[\\/]deduce\.js$/.test(f.file) ? f.ms / deduceMs : null })) });
}
const width = json(join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2W', 'width.json'));
const widths = width.rows.map((r) => {
  const sorted = r.ms.slice().sort((a, b) => a - b);
  const medianMs = med(sorted);
  const p90Ms = sorted[Math.ceil(sorted.length * 0.9) - 1];
  assert(Math.abs(medianMs - r.medianMs) < 0.0001);
  assert.equal(p90Ms, r.p90Ms);
  assert.equal(sorted.length, r.expected);
  const four = width.rows.find((q) => q.caseId === r.caseId && q.width === 4);
  return { cell: r.caseId, width: r.width, observed: sorted.length, medianMs, p90Ms, vsFour: medianMs / four.medianMs };
});
const invocationRoot = join(root, 'tests', 'artifacts', 'ig-proto', 'frozen');
const invocations = readdirSync(invocationRoot, { withFileTypes: true }).filter((e) => e.isDirectory())
  .map((e) => join(invocationRoot, e.name, 'invocations.jsonl')).filter(existsSync).flatMap(jsonl);
const s2Invocations = invocations.filter((i) => i.task === 'V4-S2');
const loggedS = sum(invocations.map((i) => i.countedSeconds));
const offLogS = 55.4 + 32;
const livePlan = json(join(root, 'tools', 'ig-proto', 'plans', 'V4-LIVE.json'));
const liveGuardS = pricing.planGuardS(livePlan);
const account = {
  s2Invocations: s2Invocations.length, s2CountedS: sum(s2Invocations.map((i) => i.countedSeconds)),
  s2Killed: s2Invocations.filter((i) => i.killed).length, s2ExitCodes: counts(s2Invocations.map((i) => i.exit)),
  loggedS, offLogS, totalS: loggedS + offLogS, minutes: (loggedS + offLogS) / 60, grantedMinutes: 749, runnerMinutes: 747,
  remainingMinutes: 749 - (loggedS + offLogS) / 60, liveGuardS,
  currentLiveAccountCeilingMinutes: Math.ceil((loggedS + offLogS + liveGuardS) / 60),
  note: 'The current arithmetic is not an approval: V4-LIVE still needs the owner; the historical sequential quote was 793 on the account.',
};
const universe = json(join(root, 'tools', 'ig-proto', 'plans', 'V4-S4.universe.json'));
const priceRecord = json(join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-T11', 'manifest.json'));
const matrix = json(join(root, 'tools', 'ig-proto', 'data', 'frozen-round-v1.json'));
const controls = universe.collections.initial.groups.filter((g) => g.items?.includes('S4-3')).map((g) => g.cell);
const expansion = pricing.expandMatrix(matrix, { controls: [...new Set(controls)] });
const pilots = Object.fromEntries(matrix.cells.hell1Conditional.map((cell) => [cell, armRows('fr-base', cell).map((r) => r.ingested.run)]));
const activation = pricing.activation(expansion, { pilots, approvedOptional: [], epoch: {
  data: { path: 'tools\\ig-proto\\data\\frozen-round-v1.json', sha256: hash(read(join(root, 'tools', 'ig-proto', 'data', 'frozen-round-v1.json'))) },
  freeze: { path: 'not-written-analysis-only', sha256: hash('not-a-freeze: analysis preview only') },
  universe: { path: 'tools\\ig-proto\\plans\\V4-S4.universe.json', sha256: hash(read(join(root, 'tools', 'ig-proto', 'plans', 'V4-S4.universe.json'))) },
} });
const activationSummary = { conditional: activation.conditional, groups: activation.groups.length, declaredRows: activation.declaredRows.length,
  comparatorCells: activation.comparatorCells.map((c) => c.cell), optional: activation.optional, note: 'Pure preview, not authorization or an activation record.' };
const data = {
  evidenceCommit: '35b401e', analysisBase: '5807bd1', seedRecipe: 'landscape/<caseId>/<rep>, reps 0..4, uniqueness any, four workers',
  validationReserved: 'landscape/<caseId>/<rep>, reps 20..39; Master 20..24; second validation 40..59',
  verified: { rows: rows.length, groups: groups.length, accepted: sum(rows.map((r) => r.ingested.run.acceptedCount)),
    completed: rows.filter((r) => v.reachedTen(r.ingested.run, options)).length, calls: calls.length,
    completeLedgers: rows.filter((r) => r.ledger.complete).length, issues }, groups, compared, classes, p5, priors, budgetInputs,
  projections, receipts, kernelSums, profiles, widths, account, activationSummary,
  priceRecordKeys: Object.keys(priceRecord),
};
writeJson('stage2-computed.json', data);
writeJson('rows-computed.json', rows.map((r) => ({
  arm: r.arm, cell: r.caseId, rowKey: r.rowKey, rep: r.rep, seed: r.seed, evidence: r.evidence, status: r.ingested.status,
  accepted: r.ingested.run.acceptedCount, responseMs: r.ingested.run.responseMs, t1Ms: r.ingested.run.firstReadyMs,
  t10Ms: r.ingested.run.tenthReadyMs, setMs: r.ingested.run.igSetMs, partialReason: r.ingested.run.partialReason,
  ledger: r.ledger, timeline: r.timeline, link: r.link, deadEnds: r.deadEnds,
})));
writeJson('calls-computed.json', calls.map((c) => ({
  arm: c.arm, rowKey: c.rowKey, caseId: c.caseId, stage: c.stage, area: c.area, K: c.K, priorCount: c.priorCount,
  result: c.result, lo: c.lo, hi: c.hi, locateProfiles: c.locateProfiles, locateMs: c.locateMs, ratingMs: c.ratingMs,
  beforeFinalPrimitive: c.beforeFinalPrimitive,
  ...(c.end?.locate?.close ? { close: c.end.locate.close } : {}),
  ...(c.end?.locate?.c4 ? { c4: c.end.locate.c4 } : {}),
  ...(c.end?.locate?.budgetStop ? { budgetStop: c.end.locate.budgetStop } : {}),
  evidence: c.evidence,
})));
writeJson('input-index.json', [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path)));

const md = [
  '# SA-Astra: V4-S2 computations (round 1)',
  '',
  '**Verified:** unlocked arithmetic only. Inputs are immutable V4-S2 records at `35b401e`; analysis base `5807bd1`.',
  'Command from `Q:\\git\\pentomino`: `node docs\\improve-generating-stages-2-4\\evidence\\sa-astra\\analyze-records.mjs`.',
  'All request seeds are `landscape/<caseId>/<rep>`, reps 0 through 4, uniqueness `any`, four workers.',
  'Times are median [minimum, maximum] seconds, never a five-request p95. Work is consumed selection work, G = 10^9 units.',
  'The ledger uses every raw worker journal and its linkage; independent prefix sums are asserted equal to `rowLedger`.',
  'The bootstrap is the plan recipe (10,000 resamples, seed 20261116), descriptive only on five pilot seeds.',
  '',
  '## 1. Completeness, time and consumed work',
  '',
  ...table(['Arm', 'Cell', 'Rows / valid / ten', 'Accepted', 'T1 s', 'T10 s', 'Response s', 'Work G/accepted [lo, hi]', 'Terminated / open', '>120 s'], groups.map((g) => [
    g.arm, g.cell, `${g.rows}/${g.statuses.valid ?? 0}/${g.completed}`, g.accepted, secs(g.t1Ms), secs(g.t10Ms), secs(g.responseMs),
    `[${giga(g.work.loPerAccepted)}, ${giga(g.work.hiPerAccepted)}]`, `${g.work.terminated}/${g.work.open}`, g.deadlineViolations,
  ])),
  '',
  '## 2. Two-sided population beside the timings',
  '',
  ...table(['Arm', 'Cell', 'Clues median [min,max]', 'Clue share median [min,max]', 'Score position median [min,max]', 'Census-estimate share'], groups.map((g) => {
    const show = (s) => s ? `${fmt(s.median)} [${fmt(s.min)}, ${fmt(s.max)}]` : '-';
    return [g.arm, g.cell, show(g.clueCount), show(g.population.clueShare), show(g.population.scorePosition), fmt(g.population.censusEstimateShare)];
  })),
  '',
  '## 3. Paired pilot diagnostics (reference/changed time)',
  '',
  ...table(['Kind', 'Cell', 'Time ratio', '90% lower', 'Same-set n', 'Clue delta median', 'Moves >=2', 'Same puzzle lists', 'Work condition'], compared.map((c) => [
    c.kind, c.cell, fmt(c.time.geoMean), fmt(c.time.lower), c.clue.n, fmt(c.clue.medianDiff), c.clue.moved2, c.identicalPuzzleKeys, c.work.verdict,
  ])),
  '',
  '## 4. N-V4-14: real class intervals',
  '',
  'No class is admitted by these pilots: each has only five independent seeds per cell.',
  '',
  ...table(['Class / measured cells', 'Screen G/accepted', 'No-screen G/accepted', 'Widths G/accepted', 'Open primitives screen/none', 'Work condition', 'Time ratio / lower', 'Clue median / moves / n'], classes.map((c) => [
    `${c.class}: ${c.cells.join(', ')}`, `[${giga(c.work.screen.loRatio)}, ${giga(c.work.screen.hiRatio)}]`,
    `[${giga(c.work.noScreen.loRatio)}, ${giga(c.work.noScreen.hiRatio)}]`, `${giga(c.widths.screen)} / ${giga(c.widths.noScreen)}`,
    `${c.open.screen}/${c.open.noScreen}`, c.work.verdict, `${fmt(c.faster.geoMean)} / ${fmt(c.faster.lower)}`,
    `${fmt(c.clue.medianDiff)} / ${c.clue.moved2} / ${c.clue.n}`,
  ])),
  '',
  '## 5. N-V4-17: mechanism reach and W',
  '',
  'The side maps count ended calls carrying `locate.close` or `locate.c4`; profile counts include all completed profiles, even in later-terminated calls.',
  '',
  ...table(['Arm', 'Cell', 'Calls / ended', 'W: calls', 'W mismatch', 'close sides', 'c4 sides', 'close / below profiles'], groups.map((g) => [
    g.arm, g.cell, `${g.calls}/${g.ended}`, JSON.stringify(g.w), g.wMismatches, JSON.stringify(g.close), JSON.stringify(g.c4),
    `${g.closeProfiles}/${g.belowProfiles}`,
  ])),
  '',
  '## 6. N-V4-16 and N-V4-21: P5 and per-set prior',
  '',
  ...table(['Cell', 'P5 known / lost / false stops', 'Same-side first-four eligible / glue defects', 'Budget stops: set / batch', 'Budget-stopped set failures without side'], p5.map((p) => [
    p.cell, `${p.comparisons.pairs}/${p.comparisons.lostCompletions}/${p.comparisons.falseStops}`,
    `${p.glueEligibleRows.length}/${p.glueEligibleRows.filter((r) => !r.gluePass).length}`,
    `${p.byStage.set ?? 0}/${p.byStage.batch ?? 0}`, p.setBudgetNoSideFailures.length,
  ])),
  '',
  ...table(['Per-set row', 'Calibration wc', 'Batch calls', 'Observed batch priors', 'Mismatches'], priors.map((p) => [
    p.rowKey, p.wc, p.batchCalls, JSON.stringify(p.batchPriors), p.mismatches.length,
  ])),
  '',
  '## 7. Linkage and locate',
  '',
  ...table(['Arm', 'Cell', 'Dispatch / complete / accepted', 'Discard done / inflight', 'Await s', 'Idle worker s in awaits', 'Locate profiles', 'Locate / all profile ms'], groups.map((g) => [
    g.arm, g.cell, `${g.link.dispatched}/${g.link.completed}/${g.link.accepted}`, `${g.link.discardedDone}/${g.link.discardedInflight}`,
    fmt(g.link.awaitMs / 1000, 2), fmt(g.link.idleWorkerMs / 1000, 2), g.locate.profiles,
    `${fmt(g.locate.locateMs, 1)} / ${fmt(g.locate.ratingMs, 1)}`,
  ])),
  '',
  '## 8. Kernel and width',
  '',
  ...table(['Cell', 'Equal/items', 'R4 calls', 'Piece visits', 'Static / live rows', 'Dirty / visits', 'Count-changed / visits', 'Kill / undo'], kernelSums.map((k) => [
    k.cell, `${k.equal}/${k.items}`, k.calls, k.pieces, `${k.staticRows}/${k.liveRows}`, fmt(k.dirtyFraction, 6), fmt(k.countChangedFraction, 6), `${k.kills}/${k.undoEntries}`,
  ])),
  '',
  ...profiles.flatMap((p) => [`### ${p.cell}: reduced-inlining profile, diagnostic only`, '',
    `Total ${fmt(p.totalMs)} ms; deduction ${fmt(p.deduceMs)} ms; fewestColumn ${fmt(p.fewestMs)} ms (${fmt(p.fewestShare * 100, 4)}% of deduction).`, '',
    ...table(['Function', 'Self ms', '% total', '% deduction when in deduce.js'], p.hottest.map((f) => [
      f.name || '(anonymous)', fmt(f.ms), fmt(f.totalShare * 100, 3), f.deduceShare === null ? '-' : fmt(f.deduceShare * 100, 3),
    ])), '']),
  ...table(['Cell', 'Width', 'Ratings', 'Median ms', 'p90 ms', 'Median / width-4 median'], widths.map((w) => [
    w.cell, w.width, w.observed, fmt(w.medianMs, 4), fmt(w.p90Ms, 3), fmt(w.vsFour, 6),
  ])),
  '',
  '## 9. Round account and activation preview',
  '',
  '```json', JSON.stringify({ account, activationSummary }, null, 2), '```',
  '',
  '## 10. Verification and reproducibility',
  '',
  `Rows ${rows.length}; accepted ${data.verified.accepted}; complete ledgers ${data.verified.completeLedgers}; calls ${calls.length}; issues ${issues.length}.`,
  '`rows-computed.json` is the row index with source line anchors; `calls-computed.json` gives the starts, ends and termination anchors.',
  '`stage2-computed.json` retains full-precision values, budget prefix-risk tables, reserve projections and receipt checks.',
  '`input-index.json` records every explicitly parsed evidence file and its LF-normalized SHA-256. Imported harness code is pinned by the analysis base commit. No historical report, receipt, state or journal was rewritten.',
];
write('stage2-computed.md', md.join('\n'));
console.log(JSON.stringify({ ...data.verified, account, classes: classes.map((c) => ({ class: c.class, work: c.work.verdict,
  faster: c.faster.geoMean, lower: c.faster.lower, clue: c.clue })), activation: activationSummary }, null, 2));
