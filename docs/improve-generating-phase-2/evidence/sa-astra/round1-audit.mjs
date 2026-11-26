// @ts-check
// Independent SA-Astra phase-2 audit: immutable files, Git reads and the isolated pure pricing block only.
// No generation, rating, replay, tree builder, test runner or measurement is invoked.
// node docs\improve-generating-phase-2\evidence\sa-astra\round1-audit.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-phase-2/evidence/sa-astra';
const BASE = '7c1bad226830667fa6626ff97c960ca3bddd7794';
const FORK = '6b94ffb45fd8b887c47805739478eeb872088bfd';
const abs = (p) => join(ROOT, ...p.split('/'));
const lf = (s) => s.replace(/\r\n/g, '\n');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const inputs = new Map();
const text = (p) => {
  const b = readFileSync(abs(p));
  inputs.set(p, { path: p, bytes: b.length, sha256Raw: sha(b), sha256Lf: sha(lf(b.toString('utf8'))) });
  return lf(b.toString('utf8'));
};
const json = (p) => JSON.parse(text(p));
const gitCommands = [];
const git = (...args) => {
  const out = execFileSync('git', ['--no-pager', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  gitCommands.push({ args, output: out.trim(), sha256Lf: sha(lf(out)) });
  return out.trim();
};
assert.equal(git('rev-parse', 'HEAD'), BASE);
assert.equal(git('branch', '--show-current'), 'gen-v4');
git('merge-base', '--is-ancestor', FORK, BASE);
assert.equal(git('diff', '--exit-code', FORK, BASE, '--', 'core', 'generator', 'player', 'tests', 'tools'), '');

const request = text('docs/improve-generating-phase-2/request.md');
assert.ok(request.includes('871.2') === false); // The account comes from the signed stage-4 report, not this request.
const plan = text('docs/improve-generating/plan.md');
assert.ok(plan.includes("Phase 2's repeat of the validation on the production code is priced in"));
const stage4 = text('docs/improve-generating-stages-2-4/stage4-report.md');
assert.ok(stage4.includes('52,271.997 s'));
const freeze = json('docs/improve-generating/evidence/frozen/V4-S3/freeze.json');
const verdicts = json('docs/improve-generating/evidence/frozen/V4-S4F/verdicts.json');
const prior = json('tools/ig-proto/data/prior-s3-v1.json');
const matrix = json('tools/ig-proto/data/frozen-round-v1.json');
const boards = json('tools/ig-proto/data/boards-v1.json').cases;
const s4 = json('tools/ig-proto/plans/V4-S4.json');
const s4c = json('tools/ig-proto/plans/V4-S4C.json');
assert.equal(verdicts.phase0.line, 'Phase 0: FAIL (control 26x26-nightmare: fail)');
assert.deepEqual(verdicts.classes.filter((c) => c.shipped === 'fr-frozen').map((c) => c.id), ['n-mid']);
assert.equal(Object.keys(prior.cells).length, 27);
const classes = verdicts.classes.map((c) => ({
  id: c.id, bounds: freeze.bounds[c.id], cells: c.cells, frozenVerdict: c.verdict,
  shippedArmBeforeOwnerException: c.shipped,
  productionScreenWork: c.shipped === 'fr-frozen' ? freeze.values.W[c.id] : null,
}));

// Importing manifest.mjs itself can ensure a frozen tree through verdicts.mjs. Evaluate only its pure pricing
// section, which contains no top-level file/process work; refS/factor are defined but never called here.
const manifestSource = text('tools/ig-proto/manifest.mjs');
const from = manifestSource.indexOf('const HORIZON_S = 885;');
const to = manifestSource.indexOf('// ---- Plans (V4-T11c) ----', from);
assert.ok(from >= 0 && to > from);
const pricingSource = manifestSource.slice(from, to).replace(/^export /gm, '');
const pricing = runInNewContext(`${pricingSource}\n({ PRICING, stepPrice, price, approvalFields });`, {}, { timeout: 1000 });
const P = JSON.parse(JSON.stringify(pricing.PRICING));
assert.deepEqual(P, {
  horizonS: 885, quietS: 45, killS: 900, cutMarginS: 15, rowMarginS: 10, startupS: 2,
  groupStartS: 3, projectionFactor: 1.25, guardFactor: 1.25, ceilingPerUnitS: 945,
});
let reproducedLockedSteps = 0;
const historicPlans = [s4, s4c].map((p) => {
  const locked = p.steps.filter((s) => s.locked);
  for (const s of locked) {
    const r = pricing.stepPrice(s.price);
    assert.ok(r.admissible);
    assert.ok(Math.abs(r.projectS - s.projectS) < 1e-6, s.id);
    assert.equal(r.invocations, s.invocations, s.id);
    reproducedLockedSteps += 1;
  }
  const cost = pricing.price(locked.map((s) => s.price));
  return { task: p.task, lockedSteps: locked.length, rowGroups: locked.filter((s) => s.price.type === 'rows').length,
    rows: locked.filter((s) => s.price.type === 'rows').reduce((n, s) => n + s.price.rows, 0), ...cost };
});

const median = (a) => {
  const s = a.slice().sort((x, y) => x - y), i = Math.floor(s.length / 2);
  assert.ok(s.length > 0);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
const rowSets = new Map();
for (const [task, arms] of [
  ['V4-S4', ['fr-frozen', 'fr-frozen-none', 'log-link']],
  ['V4-S4C', ['fr-frozen-uncapped', 'fr-frozen-none-uncapped']],
]) {
  for (const arm of arms) {
    const dir = `docs/improve-generating/evidence/frozen/${task}/${arm}`;
    for (const file of readdirSync(abs(dir)).filter((p) => p.endsWith('.runs.json')).sort()) {
      const p = `${dir}/${file}`, rows = json(p).rows;
      assert.ok(Array.isArray(rows) && rows.length > 0);
      const cell = rows[0].caseId;
      assert.ok(rows.every((r) => r.caseId === cell && Number.isFinite(r.run.responseMs) && r.run.responseMs > 0));
      assert.ok(rows.every((r) => r.run.probeKind === 'generation' && r.run.interrupted === false
        && r.seed === `landscape/${cell}/${r.rep}` && r.run.seed === r.seed));
      assert.equal(new Set(rows.map((r) => r.rep)).size, rows.length);
      const key = `${task}/${arm}/${cell}`;
      assert.ok(!rowSets.has(key), key);
      rowSets.set(key, { task, arm, cell, path: p, rows: rows.length, reps: rows.map((r) => r.rep),
        medianResponseS: median(rows.map((r) => r.run.responseMs)) / 1000 });
    }
  }
}
assert.equal(rowSets.size, 99);
assert.equal([...rowSets.values()].reduce((s, r) => s + r.rows, 0), 1500);
const shipped = new Map(classes.flatMap((c) => c.cells.map((id) => [id, c.shippedArmBeforeOwnerException])));
const allCells = classes.flatMap((c) => c.cells);
const master = matrix.cells.master;
const failing = matrix.cells.failingNightmare;
const controls = allCells.filter((c) => c.endsWith('-nightmare') && !failing.includes(c));
assert.equal(allCells.length, 19);
assert.equal(master.length, 16);
assert.equal(controls.length, 10);
const exception = '26x26-nightmare';
const group = (role, cell, arm, rows, rowLimitS, task = 'V4-S4') => {
  const r = rowSets.get(`${task}/${arm}/${cell}`);
  assert.ok(r, `${task}/${arm}/${cell}`);
  return {
    role, cell, rows, rowLimitS,
    source: r.path, sourceMedianResponseS: r.medianResponseS,
    price: { type: 'rows', rows, rowLimitS, rowS: P.projectionFactor * r.medianResponseS },
  };
};
const selected = [
  ...allCells.map((c) => group('shipped', c, c === exception ? 'log-link' : shipped.get(c), 20, c === exception ? 260 : 130)),
  ...master.map((c) => group('shipped-legacy-master', c, 'log-link', 5, 260)),
];
const baselines = [
  ...controls.map((c) => group('phase1-baseline-control', c, 'log-link', 20, 260)),
  ...master.map((c) => group('phase1-baseline-master', c, 'log-link', 5, 260)),
];
const noScreenMid = classes.find((c) => c.id === 'n-mid').cells.map((c) => group('n-mid-no-screen', c, 'fr-frozen-none', 20, 130));
const uncapped = allCells.filter((c) => c !== exception).map((c) => group('shipped-uncapped', c, `${shipped.get(c)}-uncapped`, 20, 260, 'V4-S4C'));
const coreGroups = [...selected, ...baselines, ...noScreenMid];
const recommendedGroups = [...coreGroups, ...uncapped];
assert.equal(coreGroups.reduce((s, r) => s + r.rows, 0), 800);
assert.equal(uncapped.reduce((s, r) => s + r.rows, 0), 360);
assert.equal(recommendedGroups.reduce((s, r) => s + r.rows, 0), 1160);
const quote = (groups) => {
  const p = pricing.price(groups.map((g) => g.price));
  assert.ok(p.admissible);
  return {
    groups: groups.length, rows: groups.reduce((s, g) => s + g.rows, 0),
    invocations: p.invocations, nodeS: p.projectS, quietS: p.quietS, countedS: p.countedS, guardS: p.guardS,
    ceilingS: p.ceilingS, completedProjection: p.completed, censoredProjection: p.censored,
    countedMinutes: p.countedS / 60, guardMinutes: p.guardS / 60, ceilingMinutes: p.ceilingS / 60,
  };
};
const literalFullGroups = [...rowSets.values()].map((r) => group(
  'full-frozen-scope-proxy', r.cell, r.arm, r.rows, r.task === 'V4-S4C' || r.arm === 'log-link' ? 260 : 130, r.task,
));
const coreQuote = quote(coreGroups), uncappedQuote = quote(uncapped), recommendedQuote = quote(recommendedGroups);
const fullProxyQuote = quote(literalFullGroups);

// N-V4-15 proposal, not an approved scope: two largest Generator shapes, both levels, bounded vs uncapped.
// Hell 1 is diagnostic only. There are no measured require rows to price it from, so use the row limit.
const requireCells = ['22x22-nightmare', '32x15-nightmare', '22x22-hell-1', '32x15-hell-1'];
const requireGroups = requireCells.flatMap((cell) => [130, 260].map((rowLimitS) => {
  assert.ok(boards[cell]);
  return { role: rowLimitS === 130 ? 'require-bounded' : 'require-uncapped', cell, rows: 5, rowLimitS,
    source: null, reason: 'No existing require timings: price at the row limit, not at the any-mode time.',
    price: { type: 'rows', rows: 5, rowLimitS, rowS: rowLimitS } };
}));
const requireQuote = quote(requireGroups);
const oldProofs = s4.steps.filter((s) => s.price?.type === 'items');
assert.equal(oldProofs.length, 4);
const proofs = pricing.price(oldProofs.map((s) => s.price));
const replay = pricing.stepPrice({ type: 'items', groups: ['phase2-shipped', 'phase2-uncapped'].map((variant) => ({
  kind: 'v4-replay', variant, lanes: 2, reserveS: 120, durationsS: Array(4).fill(120),
})) });
assert.ok(replay.admissible);
// Six individually bounded functional browser checks, each <=60 s, in a <=120-s helper invocation.
// Unlike the historical generic 945-s/unit ceiling, this uses their proposed enforced 120-s invocation cap.
const browser = { checks: 6, checkLimitS: 60, nodeLimitS: 120, quietSPerInvocation: 45, ceilingS: 6 * (120 + 45) };
const oldAccountS = 52271.997, oldGrantS = 1725 * 60;
const proposedGuardS = recommendedQuote.guardS + requireQuote.guardS + proofs.guardS + replay.guardS + browser.ceilingS;
const fullScopeGuardS = fullProxyQuote.guardS + requireQuote.guardS + proofs.guardS + replay.guardS + browser.ceilingS;

const reportSource = text('tools/bench/report.js');
const sourceBlock = reportSource.match(/export const SOURCE_FILES = Object\.freeze\((\[[\s\S]*?\])\);/);
assert.ok(sourceBlock);
const sourceFiles = runInNewContext(sourceBlock[1], {}, { timeout: 1000 });
const sourceDigest = sha(sourceFiles.map((p) => `${p}\t${sha(text(p))}`).join('\n'));
assert.equal(sourceFiles.length, 40);
assert.equal(sourceDigest, 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4');

const provenanceFixture = json('tests/fixtures/replay-case.json');
const samplePack = json('tests/fixtures/generated-sample-pack.json');
const visitedCandidates = [];
const visit = (x) => {
  if (Array.isArray(x)) x.forEach(visit);
  else if (x && typeof x === 'object') {
    if (x.kind === 'candidate' && x.versions && x.batchSeed) visitedCandidates.push(x);
    Object.values(x).forEach(visit);
  }
};
visit(provenanceFixture);
assert.ok(visitedCandidates.length > 0);
const candidate = visitedCandidates[0];
const futureCandidate = { ...candidate, igPrior: null,
  versions: { ...candidate.versions, algo: 'gen-v4', priorTable: 'prior-s3-v1', screenTable: 'screen-v4-v1' } };
const metadataSizeIllustration = {
  status: 'hypothetical shape arithmetic, not a generated gen-v4 record',
  oneExistingCandidateBytes: Buffer.byteLength(JSON.stringify(candidate)),
  oneProposedCandidateBytes: Buffer.byteLength(JSON.stringify(futureCandidate)),
  deltaPerCandidate: Buffer.byteLength(JSON.stringify(futureCandidate)) - Buffer.byteLength(JSON.stringify(candidate)),
  opaqueMetaLimitBytes: 4096,
  generationJsonValuesLimit: 100000,
  generationJsonDepthLimit: 32,
  packFileLimitBytes: 512 * 1024,
  distinction: 'MAX_META_BYTES applies to opaque meta, not generation. Generation uses the JSON value/depth limits; the whole pack has its own byte cap.',
  samplePackGenerationBytes: Buffer.byteLength(JSON.stringify(samplePack.generation ?? {})),
};

const supporting = [
  'AGENTS.md', 'docs/improve-generating-stages-2-4/plan.md', 'docs/improve-generating-stages-2-4/s06-reading.md',
  'docs/improve-generating/evidence/frozen/V4-S4F/verdicts.md',
  'tasks/improve-generating-stages-2-4/check-list.md', 'tasks/improve-generating-v4/check-list.md',
  'tasks/improve-generating-v4/T11g-frozen-round-manifest.md',
  'tools/ig-proto/variants/fr-frozen.json', 'tools/ig-proto/variants/fr-frozen-none.json',
  'tools/ig-proto/variants/v4.json', 'tools/ig-proto/variants/v4-ps.json', 'tools/ig-proto/variants/v4-p5.json',
  'tools/ig-proto/variants/p5-mode.json', 'tools/ig-proto/variants/ps-levels.json', 'tools/ig-proto/variants/live.json',
  'tools/ig-proto/variants/instr.json', 'tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js',
  'tools/ig-proto/lib/lane-worker.mjs', 'tools/ig-proto/live-deadline.mjs',
  'generator/jobs.js', 'generator/state.js', 'generator/locale.en.js', 'generator/locale.vi.js',
  'generator/ui/replay-cache.js', 'generator/ui/replay-model.js', 'tools/record-fixtures.mjs', 'tools/generate.mjs',
  'docs/design-detail.md', 'docs/design-brief.md', 'DEVELOPERGUIDE.md', 'DEVELOPERGUIDE.vn.md',
  'tests/generate.test.js', 'tests/generation-client.test.js', 'tests/protocol.test.js',
  'tests/replay.test.js', 'tests/replay-model.test.js', 'tests/tasks.test.js',
];
supporting.forEach(text);
text(`${HERE}/round1-audit.mjs`);
const result = {
  base: BASE, fork: FORK, branch: 'gen-v4', node: process.version, platform: process.platform,
  scope: 'Independent read-only source/evidence analysis; no engine invocation, tree build or measured request.',
  newMeasuredSeconds: 0, engineInvocations: 0, sourceDigest, sourceFiles: sourceFiles.length,
  freeze: { classes, values: freeze.values, priorId: prior.id, priorEntries: Object.keys(prior.cells).length,
    priorEntriesByLevel: { nightmare: Object.keys(prior.cells).filter((k) => k.startsWith('nightmare@')).length,
      hell1: Object.keys(prior.cells).filter((k) => k.startsWith('hell-1@')).length }, originalPhase0: verdicts.phase0 },
  publishedRows: { files: rowSets.size, rows: [...rowSets.values()].reduce((s, r) => s + r.rows, 0) },
  oldAccount: { countedS: oldAccountS, grantedS: oldGrantS, remainingS: oldGrantS - oldAccountS,
    countedMinutes: oldAccountS / 60, remainingMinutes: (oldGrantS - oldAccountS) / 60,
    authority: 'Closed frozen round. No automatic transfer to the production validation; a new explicit scope/grant is required.' },
  pricing: {
    method: 'Exact pure pricing section of manifest.mjs evaluated in memory; no module import or CLI run.',
    pricingSourceSha256Lf: sha(pricingSource), assumptions: P, reproducedLockedSteps,
    originalPlanQuotes: historicPlans.map(({ steps, schedule, inadmissible, ...p }) => p),
    productionProxy: '1.25 x each applicable frozen arm/cell median response, no P6 or kernel speed credit; not a bound or forecast guarantee.',
    seedProposal: { validation: 'landscape/<cell>/<rep>, reps 60-79', master: 'reps 60-64',
      requirePilot: 'ig-p2/require/<cell>/<rep>, reps 0-4', noFit: 'No fit or retuning from any validation/require output.' },
    core: coreQuote, uncapped: uncappedQuote, recommended: recommendedQuote, fullFrozenScopeProxy: fullProxyQuote,
    require: { ...requireQuote, cells: requireCells, uniqueness: 'require', workers: 4, quantity: 10, maxActive: 484,
      diagnosticOnly: requireCells.filter((c) => c.endsWith('-hell-1')) },
    proofs: { suites: 4, items: 48, countedS: proofs.countedS, guardS: proofs.guardS, ceilingS: proofs.ceilingS,
      status: 'Reserve-based template for proposed parity/certificate/prior/replay/legacy-route proof bundles; final item manifests still required.' },
    resourceReplays: { items: 8, ...replay, status: 'First successful candidate per require cell/arm; absence is unobserved, never a replay pass.' },
    browser, proposedGuardS, proposedRoundCapMinutes: Math.ceil(proposedGuardS / 60),
    ifTransferredCumulativeMinutes: Math.ceil((oldAccountS + proposedGuardS) / 60),
    fullScopeGuardS, fullScopeRoundCapMinutes: Math.ceil(fullScopeGuardS / 60),
    fullScopeIfTransferredCumulativeMinutes: Math.ceil((oldAccountS + fullScopeGuardS) / 60),
    exclusions: 'Routine unit-test verification, repeated failures, new fits, third-party browser/service calibration and phase-3 offers are not a new measured allocation here.',
    recommendedGroups, requireGroups, fullFrozenScopeGroups: literalFullGroups,
  },
  metadataSizeIllustration, gitCommands,
  inputIndexHash: sha(JSON.stringify([...inputs.values()])), inputs: [...inputs.values()],
};
const output = relative(process.cwd(), abs(`${HERE}/round1-audit.json`));
writeFileSync(output, `${JSON.stringify(result, null, 2).replace(/\n/g, '\r\n')}\r\n`, 'utf8');
console.log(JSON.stringify({
  base: BASE, sourceDigest, inputs: inputs.size, reproducedLockedSteps, rowsRead: result.publishedRows,
  oldAccount: result.oldAccount,
  prices: {
    core: coreQuote, uncapped: uncappedQuote, recommended: recommendedQuote, require: requireQuote,
    proofGuardMin: proofs.guardS / 60, resourceReplayGuardMin: replay.guardS / 60, browserCeilingMin: browser.ceilingS / 60,
    totalGuardMin: proposedGuardS / 60, requestNewRoundCapMin: result.pricing.proposedRoundCapMinutes,
    equivalentOldAccountCapMin: result.pricing.ifTransferredCumulativeMinutes,
    fullScopeGuardMin: fullScopeGuardS / 60, fullScopeCapMin: result.pricing.fullScopeRoundCapMinutes,
  },
  metadataSizeIllustration, engineInvocations: 0,
}, null, 2));
