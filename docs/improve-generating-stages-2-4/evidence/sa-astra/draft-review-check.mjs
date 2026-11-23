// @ts-check
// Joint-draft review: read-only arithmetic on existing observations and compiled price inputs; no git or engine calls.
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
const inputs = new Map();
const read = (file) => {
  const text = readFileSync(file, 'utf8');
  inputs.set(relative(root, file), { path: relative(root, file),
    sha256Lf: createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex') });
  return text;
};
const json = (file) => JSON.parse(read(file));
const jsonl = (file) => {
  const p = V.parseLines(read(file), relative(root, file));
  assert.deepEqual(p.problems, []);
  return p.lines;
};
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const median = V.median;
const raw = join(root, 'tests', 'artifacts', 'ig-proto', 'frozen');
const pub = join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2');
const docs = join(root, 'docs', 'improve-generating-stages-2-4');
for (const name of ['report.md', 'plan.md', 'clarifications.md']) read(join(docs, name));
const j1 = json(join(docs, 'evidence', 'sa-opus', 'j1-numbers.json'));
const prices = json(join(docs, 'evidence', 'sa-opus', 'x1-prices.json'));
const rows = new Map();
function observed(arm, cell) {
  const key = `${arm}/${cell}`;
  if (rows.has(key)) return rows.get(key);
  const record = json(join(pub, arm, `pilot-${cell}.runs.json`));
  const rs = record.rows.map((r) => {
    const dir = join(raw, 'V4-S2', arm, record.shard, 'logs');
    const lines = readdirSync(dir).filter((n) => n.startsWith(`${r.rowKey}.`) && n.endsWith('.jsonl')
      && !n.endsWith('.row.jsonl') && !n.endsWith('.link.jsonl')).flatMap((n) => jsonl(join(dir, n)));
    const links = jsonl(join(dir, `${r.rowKey}.link.jsonl`));
    const ledger = V.rowLedger(lines, links);
    assert(ledger.complete);
    assert.equal(V.ingestRow(r, { quantity: 10 }).status, 'valid');
    const starts = new Map(lines.filter((l) => l.t === 'start').map((l) => [l.call, l]));
    const calls = lines.filter((l) => l.t === 'end').map((l) => ({ start: starts.get(l.call), end: l }));
    return { ...r, calls, ledger };
  });
  rows.set(key, rs);
  return rs;
}
const hell = ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1'];
const prior = {};
for (const cell of hell) {
  const rs = observed('fr-base', cell);
  const perSeed = rs.map((r) => median(r.calls.filter((c) => Number.isFinite(c.end.locate?.wc)).map((c) => c.end.locate.wc / c.start.K)));
  const share = median(perSeed);
  assert.equal(share, j1.prior[cell].seedBalanced);
  const newStarts = [...new Set(rs.flatMap((r) => r.calls.filter((c) => c.start.stage === 'set')
    .map((c) => Math.round(Math.round(share * 1e6) / 1e6 * c.start.K))))].sort((a, b) => a - b);
  prior[cell] = { perSeed, share, oldSetPriors: [...new Set(rs.flatMap((r) => r.calls.filter((c) => c.start.stage === 'set').map((c) => c.start.priorCount)))],
    newStartsOnEndedSetCalls: newStarts };
}
const mid = ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'];
const side = (arm, cells) => cells.flatMap((cell) => observed(arm, cell).map((r) => ({
  ingested: V.ingestRow(r, { quantity: 10 }), ledger: r.ledger,
})));
const broad = V.workRule(side('fr-screen', mid), side('fr-none', mid));
const narrow = V.workRule(side('fr-screen', mid.slice(0, 2)), side('fr-none', mid.slice(0, 2)));
const loSum = (arm, cell) => {
  const rs = observed(arm, cell);
  return sum(rs.map((r) => r.ledger.lo)) / sum(rs.map((r) => r.run.acceptedCount)) / 1e9;
};
const broadLo = sum(mid.map((c) => loSum('fr-screen', c)));
const noneLo = sum(mid.map((c) => loSum('fr-none', c)));
const narrowLo = sum(mid.slice(0, 2).map((c) => loSum('fr-screen', c))) + loSum('fr-none', mid[2]);
const surrogateThreshold = (noneLo - narrowLo) / (noneLo - broadLo);

const invocations = readdirSync(raw, { withFileTypes: true }).filter((e) => e.isDirectory())
  .map((e) => join(raw, e.name, 'invocations.jsonl')).filter(existsSync).flatMap(jsonl);
const loggedS = sum(invocations.map((i) => i.countedSeconds));
const accountS = loggedS + 87.4;
const s2 = invocations.filter((i) => i.task === 'V4-S2');
const s2Plan = json(join(root, 'tools', 'ig-proto', 'plans', 'V4-S2.json'));
const rowPrices = (cells) => cells.map((cell) => s2Plan.steps.find((s) => s.id === `rows-fr-base-pilot-${cell}`).price);
const hPrice = M.price(rowPrices(hell));
assert(Math.abs(hPrice.guardS / 60 - prices['Hell 1 composite check, rows only (arm with an accepted binding)'].guard) < 1e-10);
const proofPrice = M.price(['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped']
  .flatMap((arm) => M.parityPass('review-only', arm, M.stepPrice, {})).filter((s) => s.locked).map((s) => s.price));
const live = json(join(root, 'tools', 'ig-proto', 'plans', 'V4-LIVE.json'));
const liveGuardS = M.planGuardS(live);
const kernel = json(join(root, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2K', 'kernel.json'));
const itemMsSum = sum(kernel.rows.map((r) => r.itemMs));
assert(Math.abs(3 * itemMsSum / 1000 - j1.spike.perCandidateNodeS) < 1e-9);
const spikeInput = (factor) => ({ type: 'items', groups: [{
  kind: 'v4-kernel', variant: 'review-only', lanes: 1, reserveS: 90,
  durationsS: Array.from({ length: 3 }, () => kernel.rows.map((r) => factor * r.itemMs / 1000)).flat(),
}] });
const spike = M.price([spikeInput(1.25), spikeInput(1.25), spikeInput(1.25)]);
const spikeProxy = M.price([spikeInput(1), spikeInput(1), spikeInput(1)]);
const correctedSpikeReal = [(spikeProxy.projectS + 15 * spikeProxy.invocations) / 60, spikeProxy.countedS / 60];
const nodeFor = (cell) => sum(s2.filter((i) => i.step === `rows-fr-base-pilot-${cell}`).map((i) => i.nodeSeconds));
const invFor = (cell) => s2.filter((i) => i.step === `rows-fr-base-pilot-${cell}`).length;
const hNode = sum(hell.map(nodeFor));
const hInv = sum(hell.map(invFor));
const hReal = [(hNode + 15 * hInv) / 60, (hNode + 45 * hInv) / 60];
const p1Rows = s2.filter((i) => i.step.startsWith('parity-fr-') && i.step !== 'parity-fr-p5');
const p1Node = 4 * sum(p1Rows.map((i) => i.nodeSeconds)) / p1Rows.length;
const p1Real = [(p1Node + 4 * 15) / 60, (p1Node + 4 * 45) / 60];
const control = prices['V4-S2B'];
const s4 = prices['V4-S4 (initial + both conditional boards, no S4-6)'];
const s4c = prices['V4-S4C (same collection)'];
const steps = [
  ['control', control.formalGuardMin, [control.realisticIdleMin, control.realisticFullMin]],
  ['spike', spike.guardS / 60, correctedSpikeReal],
  ['S3P proofs', proofPrice.guardS / 60, p1Real],
  ['Hell check', hPrice.guardS / 60, hReal],
  ['LIVE', liveGuardS / 60, [4, 5]],
  ['S4', s4.guard, [464.2767082351509, 509.7767082351509]],
  ['S4C', s4c.guard, [s4c.realistic.idle, s4c.realistic.full]],
];
let guardAccount = accountS / 60;
let lowAccount = guardAccount;
let highAccount = guardAccount;
const chain = steps.map(([name, guard, proxy]) => {
  const row = { name, guard, capAtGuardSpend: Math.ceil(guardAccount + guard),
    capAtProxySpend: [Math.ceil(lowAccount + guard), Math.ceil(highAccount + guard)], proxy };
  guardAccount += guard;
  lowAccount += proxy[0];
  highAccount += proxy[1];
  return row;
});
const p1dir = join(raw, 'V4-S2P', 'parity-fr-base');
const genDir = readdirSync(join(p1dir, 'logs')).find((n) => n.endsWith('_ig-v4_replay_12x12-nightmare_gen'));
const genLines = readdirSync(join(p1dir, 'logs', genDir)).filter((n) => n.endsWith('.jsonl'))
  .flatMap((n) => jsonl(join(p1dir, 'logs', genDir, n)));
const genStarts = new Map(genLines.filter((l) => l.t === 'start').map((l) => [l.call, l]));
const requireCalls = genLines.filter((l) => l.t === 'end').map((l) => ({ stage: genStarts.get(l.call)?.stage, work: l.locate.spent, result: l.result }));
const result = {
  label: 'Unlocked joint-draft arithmetic; proposed runner scenarios are not measurements of unbuilt configurations',
  prior, requireCalls, work: { broad, narrow, completedOnlySurrogate: { broadLo, noneLo, narrowLo, threshold: surrogateThreshold,
    warning: 'Assumes narrow class always passes; uses completed-unit lower bounds, not identified expected total consumed work or a calibrated admission probability.' } },
  account: { loggedS, offLogS: 87.4, accountMinutes: accountS / 60, liveGuardMinutes: liveGuardS / 60,
    liveMinimumCap: Math.ceil((accountS + liveGuardS) / 60), grant: 749 },
  hellCheck: { projected: hPrice.countedS / 60, guard: hPrice.guardS / 60, rows: 20, proxy: hReal },
  preProof: { projected: proofPrice.countedS / 60, guard: proofPrice.guardS / 60, proxy: p1Real },
  spike: { pairedItemMsSum: itemMsSum, projected: spike.countedS / 60, guard: spike.guardS / 60,
    draftBareItemsAndQuiet: j1.spike.threeCandidates, proxyWithRunnerOverheads: correctedSpikeReal },
  chain, end: { guardAccount, lowAccount, highAccount },
  inputs: [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path)),
};
writeFileSync(join(here, 'draft-review-check.json'), JSON.stringify(result, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(JSON.stringify({ prior, requireCalls, threshold: surrogateThreshold, account: result.account,
  hellCheck: result.hellCheck, preProof: result.preProof, spike: result.spike, chain, end: result.end }, null, 2));
