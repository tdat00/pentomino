// @ts-check
// SA-Astra, S01 step 8: recompute from existing records only. No engine, git, tree build or timed run.
// node docs\improve-generating-stages-2-4\evidence\sa-astra\s01-review-checks.mjs --label frozen
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const rel = (/** @type {string} */ p) => relative(ROOT, p).replaceAll('\\', '/');
const load = (/** @type {string} */ p) => import(pathToFileURL(abs(p)).href);
const V = await load('tools/ig-proto/verdicts.mjs');
const F = await load('tools/ig-proto/fit-read.mjs');
const { publicationOf } = await load('tools/ig-proto/arm.mjs');
const { mp12b1Report } = await load('tools/ig-proto/lib/paths.mjs');
const { sha256File } = await load('tools/ig-proto/lib/records.mjs');
const E = 'docs/improve-generating/evidence/frozen';
const RAW = 'tests/artifacts/ig-proto/frozen';
const PLAN = 'tools/ig-proto/plans/V4-S2B.json';
/** @type {Map<string, any>} */
const inputs = new Map();
const read = (/** @type {string} */ p) => {
  const b = readFileSync(abs(p));
  inputs.set(p, { path: p, sha256: sha256File(abs(p)), sha256Raw: createHash('sha256').update(b).digest('hex') });
  return b.toString('utf8');
};
const json = (/** @type {string} */ p) => JSON.parse(read(p));
/** @param {boolean} ok @param {string} message */
function check(ok, message) {
  if (!ok) {
    throw new Error(message);
  }
}
/** @param {number} a @param {number} b @param {string} message */
const near = (a, b, message) => check(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-10, `${message}: ${a} != ${b}`);
const r3 = (/** @type {number} */ n) => Math.round(n * 1000) / 1000;
const r1 = (/** @type {number} */ n) => Math.round(n * 10) / 10;
/** @param {string} p */
function lines(p) {
  const parsed = V.parseLines(read(p), p);
  check(parsed.problems.length === 0, `Malformed lines: ${p}: ${parsed.problems.join('; ')}`);
  return parsed.lines;
}
/** @param {any} r */
const withoutSampling = (r) => ({ ...r, errors: r.errors.filter((/** @type {any} */ e) => e?.phase !== 'sampling') });
/** @param {any} r */
const t10 = (r) => r.acceptedCount < 10 ? 120000 : Math.min(r.tenthReadyMs, 120000);
/** Independent implementation of the recorded bootstrap recipe. @param {number[]} ratios */
function statistics(ratios) {
  const logs = ratios.map(Math.log);
  const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
  const sd = Math.sqrt(logs.reduce((a, b) => a + (b - mean) ** 2, 0) / (logs.length - 1));
  let state = 20261116;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
  const boot = [];
  for (let b = 0; b < 10000; b += 1) {
    let sum = 0;
    for (let i = 0; i < ratios.length; i += 1) {
      sum += logs[Math.floor(random() * ratios.length)];
    }
    boot.push(Math.exp(sum / ratios.length));
  }
  boot.sort((a, b) => a - b);
  return { geo: Math.exp(mean), lower: boot[999], logSd: sd, neededGeoAt20: 0.9 * Math.exp(1.2816 * sd / Math.sqrt(20)) };
}
/** @param {any} record @param {string} label */
function verifyIndex(record, label) {
  check(Array.isArray(record.inputs), `${label}: no input index`);
  const seen = new Set();
  for (const i of record.inputs) {
    check(!seen.has(i.path), `${label}: duplicate indexed input ${i.path}`);
    seen.add(i.path);
    read(i.path);
    check(inputs.get(i.path).sha256 === i.sha256, `${label}: changed input ${i.path}`);
  }
  return seen;
}
const preview = json(`${E}/V4-S2B/fit-read-preview-fr-none.json`);
const prefixes = json(`${E}/V4-S2B/fit-read-prefixes-fr-none.json`);
const pIndex = verifyIndex(preview, 'preview');
const fIndex = verifyIndex(prefixes, 'prefixes');
const plan = json(PLAN);
const grid = F.fitScope(plan, 'fr-none');
check(grid.length === 40 && new Set(grid.map((d) => d.rowKey)).size === 40, 'Declared grid is not 40 unique rows');
const cellIds = [...new Set(grid.map((d) => d.caseId))];
check(cellIds.length === 8, 'Not eight cells');
const declaredKeys = new Set(grid.map((d) => d.rowKey));
const runsDir = `${E}/V4-S2B/fr-none`;
const runFiles = readdirSync(abs(runsDir)).filter((n) => n.endsWith('.runs.json')).sort();
check(runFiles.length === 8, 'Not eight publications');
const published = runFiles.map((name) => ({ name, doc: json(`${runsDir}/${name}`) }));
const allRows = published.flatMap((p) => p.doc.rows);
check(allRows.length === 40 && allRows.every((/** @type {any} */ r) => declaredKeys.has(r.rowKey)), 'Unexpected/missing published rows');
check(prefixes.rows.length === 40 && prefixes.rows.every((/** @type {any} */ r) => declaredKeys.has(r.rowKey)), 'Unexpected/missing prefix rows');
check(preview.cells.length === 8 && preview.cells.every((/** @type {any} */ c) => cellIds.includes(c.cell)), 'Unexpected/missing preview cells');
check(preview.missing.length === 0 && preview.unexpected.length === 0 && preview.problems.length === 0, 'Preview problem summary');
const expectedSummary = {
  declared: 40, present: 40, missing: [], unexpected: [], identityRows: 0, incompleteRows: 0, unreadableRows: 0,
  ambiguousRows: 0, affectedCalls: 0, potentiallyAffectedCalls: 0, ambiguousCalls: 0, boundFirings: 0,
};
check(isDeepStrictEqual(prefixes.summary, expectedSummary), 'Prefix summary differs');
/** @type {any[]} */
const cells = [];
/** @type {string[]} */
const unindexedPublicationMd = [];
for (const cell of cellIds) {
  const declared = grid.filter((d) => d.caseId === cell);
  const shardName = declared[0].shard;
  const pub = published.find((p) => p.name === `${shardName}.runs.json`)?.doc;
  check(pub !== undefined && pub.rows.length === 5, `${cell}: missing publication`);
  const raw = `${RAW}/V4-S2B/fr-none/${shardName}`;
  const shard = json(`${raw}/shard.json`);
  const state = json(`${raw}/state.json`);
  check(state.done === true && state.recorded === 5 && state.expected === 5, `${cell}: incomplete state`);
  check(state.treeId === shard.treeId && state.harnessHash === shard.harnessHash, `${cell}: state producer`);
  check(shard.variant === 'fr-none' && shard.rows.length === 5 && new Set(shard.rows.map((/** @type {any} */ r) => r.key)).size === 5,
    `${cell}: shard identity`);
  check(publicationOf(abs(runsDir), shardName) === 'complete', `${cell}: partial publication`);
  const mdPath = `${runsDir}/${shardName}.runs.md`;
  const md = read(mdPath);
  if (!fIndex.has(mdPath)) {
    unindexedPublicationMd.push(mdPath);
  }
  const pointer = /The journal lines are in `([^`]+)`/.exec(md);
  check(pointer !== null && existsSync(abs(`${runsDir}/${pointer[1]}`)), `${cell}: no published journal`);
  read(`${runsDir}/${pointer[1]}`);
  const found = mp12b1Report(cell);
  check(found !== null, `${cell}: no MP12b1 report`);
  const todayDoc = json(/** @type {any} */ (found).path);
  const logNames = readdirSync(abs(`${raw}/logs`)).sort();
  const headers = logNames.filter((n) => n.endsWith('.row.jsonl')).map((n) => n.slice(0, -'.row.jsonl'.length));
  check(isDeepStrictEqual(headers, declared.map((d) => d.rowKey).sort()), `${cell}: raw keys differ`);
  /** @type {any[]} */
  const rows = [];
  for (const d of declared) {
    const held = allRows.filter((/** @type {any} */ r) => r.rowKey === d.rowKey);
    check(held.length === 1 && F.declaredRowProblem(d, held[0]) === null, `${d.rowKey}: bad row identity`);
    const row = held[0];
    check(V.ingestRow(row, { quantity: 10 }).status === 'valid', `${d.rowKey}: invalid after run`);
    const rr = prefixes.rows.filter((/** @type {any} */ r) => r.rowKey === d.rowKey);
    check(rr.length === 1, `${d.rowKey}: repeated/missing prefix row`);
    const header = lines(`${raw}/logs/${d.rowKey}.row.jsonl`);
    const identity = F.rawIdentityProblems({ task: 'V4-S2B', arm: 'fr-none', declared: d, shard, rowLines: header, meta: pub.meta });
    check(identity.length === 0 && isDeepStrictEqual(identity, rr[0].identity), `${d.rowKey}: raw identity`);
    const journalNames = logNames.filter((n) => n.startsWith(`${d.rowKey}.`) && n.endsWith('.jsonl')
      && !n.endsWith('.row.jsonl') && n !== `${d.rowKey}.link.jsonl`);
    const journal = journalNames.flatMap((name) => lines(`${raw}/logs/${name}`));
    const links = lines(`${raw}/logs/${d.rowKey}.link.jsonl`);
    const ledger = V.rowLedger(journal, links);
    const calls = F.callPrefixes(journal, { nightmare: 10000000000 });
    const bound = F.boundFirings(calls.calls, 4);
    check(ledger.complete && ledger.problems.length === 0 && calls.problems.length === 0, `${d.rowKey}: ledger/call problem`);
    check(ledger.terminated === calls.calls.filter((c) => !c.ended).length
      && ledger.open === calls.calls.filter((c) => c.open).length, `${d.rowKey}: termination/open-primitive accounting`);
    check(calls.calls.every((c) => c.status === 'clear') && !bound.fires, `${d.rowKey}: limit warning`);
    const maxSpent = Math.max(...calls.calls.map((c) => c.spent));
    check(rr[0].publication === 'complete' && rr[0].shardDone === true && rr[0].rowStatus === 'valid' && rr[0].complete === true
      && rr[0].unreadable === false && rr[0].problems.length === 0 && rr[0].maxSpent === maxSpent
      && isDeepStrictEqual(rr[0].calls, { clear: calls.calls.length }), `${d.rowKey}: prefix row differs from raw evidence`);
    const todays = todayDoc.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation' && r.rep === d.rep);
    check(todays.length === 1 && todays[0].caseId === d.caseId && todays[0].seed === d.seed, `${d.rowKey}: MP12b1 identity`);
    const today = withoutSampling(todays[0]);
    check(V.runStatus(today, { quantity: 10 }).status === 'valid', `${d.rowKey}: invalid today run`);
    const after = row.run;
    rows.push({
      rowKey: d.rowKey, rep: d.rep, seed: d.seed, valid: true, todayTen: today.acceptedCount >= 10,
      afterTen: after.acceptedCount >= 10, todayAccepted: today.acceptedCount, afterAccepted: after.acceptedCount,
      todayRawT10: today.tenthReadyMs, todayT10: t10(today), afterT10: t10(after), ratio: t10(today) / t10(after),
      setMs: after.igSetMs, responseMs: after.responseMs, calls: calls.calls.length,
      endedCalls: calls.calls.filter((c) => c.ended).length, openPrimitiveCalls: calls.calls.filter((c) => c.open).length,
      setCalls: calls.calls.filter((c) => c.stage === 'set').length, maxSpent, bound,
      terminatedCalls: ledger.terminated, workInterval: { lower: ledger.lo, upper: ledger.hi },
    });
  }
  const ratios = rows.map((r) => r.ratio);
  const stats = statistics(ratios);
  const norm = V.noRegression(ratios, declared.map((d) => d.rep), { resamples: 10000, resampleSeed: 20261116 });
  near(stats.lower, norm.lower, `${cell}: independent bootstrap`);
  const stored = preview.cells.filter((/** @type {any} */ c) => c.cell === cell);
  check(stored.length === 1 && stored[0].declared === 5 && stored[0].problems.length === 0, `${cell}: preview declaration`);
  check(isDeepStrictEqual(stored[0].pairs.map((/** @type {any} */ p) => p.rep), [0, 1, 2, 3, 4])
    && stored[0].pairs.every((/** @type {any} */ p) => p.problem === null), `${cell}: preview pairs`);
  rows.forEach((r, i) => near(r.ratio, stored[0].ratios[i], `${cell} rep ${i}: ratio`));
  near(stats.geo, stored[0].geo, `${cell}: geo`);
  near(stats.lower, stored[0].lower, `${cell}: lower`);
  check(stored[0].pass === (stats.lower >= 0.9), `${cell}: pass flag`);
  check(stored[0].todayTen === rows.filter((r) => r.todayTen).length && stored[0].afterTen === rows.filter((r) => r.afterTen).length,
    `${cell}: completion counts`);
  const extra = todayDoc.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation' && r.rep >= 5 && r.rep <= 9)
    .sort((/** @type {any} */ a, /** @type {any} */ b) => a.rep - b.rep).map((/** @type {any} */ r) => r1(t10(withoutSampling(r)) / 1000));
  cells.push({
    cell, ...stats, ratios, todayTen: stored[0].todayTen, afterTen: stored[0].afterTen,
    calls: rows.reduce((n, r) => n + r.calls, 0), endedCalls: rows.reduce((n, r) => n + r.endedCalls, 0),
    terminatedCalls: rows.reduce((n, r) => n + r.terminatedCalls, 0),
    openPrimitiveCalls: rows.reduce((n, r) => n + r.openPrimitiveCalls, 0),
    largestCallG: Math.max(...rows.map((r) => r.maxSpent)) / 1e9, boundFirings: rows.filter((r) => r.bound.fires).length,
    maxSetS: Math.max(...rows.map((r) => r.setMs)) / 1000, maxResponseS: Math.max(...rows.map((r) => r.responseMs)) / 1000,
    todayT10sReps5to9: extra, rows,
  });
}
for (const c of cells) {
  for (const r of c.rows) {
    check(r.setCalls === (c.cell === '3x29-nightmare' && r.rep === 3 ? 3 : 4), `${r.rowKey}: unexpected set-call count`);
  }
}

const s2 = json(`${E}/V4-S2/fr-none/pilot-26x26-nightmare.runs.json`);
const t26File = mp12b1Report('26x26-nightmare');
check(t26File !== null, 'No 26x26 baseline');
const t26 = json(/** @type {any} */ (t26File).path);
const ratios26 = [0, 1, 2, 3, 4].map((rep) => {
  const a = s2.rows.filter((/** @type {any} */ r) => r.rep === rep);
  const b = t26.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation' && r.rep === rep);
  check(a.length === 1 && b.length === 1 && a[0].seed === b[0].seed && V.ingestRow(a[0], { quantity: 10 }).status === 'valid'
    && V.runStatus(withoutSampling(b[0]), { quantity: 10 }).status === 'valid', `26x26 rep ${rep}: invalid pairing`);
  return t10(withoutSampling(b[0])) / t10(a[0].run);
});
const stage2 = { cell: '26x26-nightmare', ratios: ratios26, ...statistics(ratios26) };
const invocations = read(`${RAW}/V4-S2B/invocations.jsonl`).trim().split(/\r?\n/).map((l) => JSON.parse(l));
check(invocations.length === 8 && invocations.every((r) => r.exit === 0 && r.done && !r.killed && r.quietS === 15 && r.horizonS === 885),
  'Invocation integrity');
const countedS = invocations.reduce((s, r) => s + r.countedSeconds, 0);
const account = { countedS, countedMinutes: countedS / 60, beforeLoggedS: invocations[0].budget.roundCountedS,
  offLogS: 87.4, afterLoggedS: invocations[0].budget.roundCountedS + countedS,
  afterMinutes: (invocations[0].budget.roundCountedS + countedS + 87.4) / 60 };
const runLog = read(`${RAW}/V4-S2B/run-1.log`);
check(runLog.includes('firewall: OK, 289 production files unchanged') && runLog.includes('Plan V4-S2B finished:'), 'Run did not finish cleanly');
const opus = json('docs/improve-generating-stages-2-4/evidence/sa-opus/s01-numbers.json');
for (const c of cells) {
  const other = opus.cells.find((/** @type {any} */ x) => x.cell === c.cell);
  check(other !== undefined, `${c.cell}: missing from Opus`);
  for (const field of ['geo', 'lower', 'logSd', 'neededGeoAt20']) {
    near(r3(c[field]), other[field], `${c.cell}: Opus ${field}`);
  }
  check(isDeepStrictEqual(c.ratios.map(r3), other.ratios) && isDeepStrictEqual(c.todayT10sReps5to9, other.todayT10sReps5to9),
    `${c.cell}: Opus ratios/additional baseline`);
  check(c.todayTen === other.todayTen && c.afterTen === other.afterTen && c.calls === other.calls && c.boundFirings === other.boundFirings
    && Math.round(c.largestCallG * 100) / 100 === other.largestCallG && r1(c.maxSetS) === other.maxSetS && r1(c.maxResponseS) === other.maxResponseS,
    `${c.cell}: Opus counts/work/times`);
}
for (const field of ['geo', 'lower', 'logSd', 'neededGeoAt20']) {
  near(r3(stage2[field]), opus.stage2[field], `26x26: Opus ${field}`);
}
for (const p of ['docs/improve-generating-stages-2-4/s01-reading.md', 'tasks/improve-generating-stages-2-4/S01-run-v4-s2b.md',
  'tasks/improve-generating-stages-2-4/S06-run-v4-s4.md', 'docs/improve-generating-stages-2-4/plan.md',
  'tools/ig-proto/fit-read.mjs', 'tools/ig-proto/verdicts.mjs', 'tools/ig-proto/arm.mjs', 'tools/ig-proto/manifest.mjs']) {
  read(p);
}
const out = {
  task: 'S01-review', base: 'dd38457', declared: grid.length, cells, stage2, account,
  recordInputs: { preview: pIndex.size, prefixes: fIndex.size }, unindexedPublicationMd,
  publicationInputs: unindexedPublicationMd.map((p) => inputs.get(p)),
  numericWarnings: cells.filter((c) => c.lower < 0.9 || c.afterTen < 5).map((c) => c.cell),
  scope: 'Existing records and pure arithmetic only; no rating/search/generation, tree build, git, locked or timed run.',
  inputs: [...inputs.values()],
};
writeFileSync(relative(process.cwd(), join(HERE, 's01-review-checks.json')), JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(JSON.stringify({
  declared: out.declared, inputs: out.inputs.length, recordInputs: out.recordInputs, account,
  cells: cells.map((c) => ({
    cell: c.cell, todayTen: c.todayTen, afterTen: c.afterTen, geo: r3(c.geo), lower: r3(c.lower), logSd: r3(c.logSd),
    neededGeoAt20: r3(c.neededGeoAt20), calls: c.calls, endedCalls: c.endedCalls, terminatedCalls: c.terminatedCalls,
    openPrimitiveCalls: c.openPrimitiveCalls,
    largestCallG: Math.round(c.largestCallG * 100) / 100, boundFirings: c.boundFirings, maxSetS: r1(c.maxSetS), maxResponseS: r1(c.maxResponseS),
  })),
  stage2, numericWarnings: out.numericWarnings, unindexedPublicationMd,
}, null, 2));
