// @ts-check
// SA-Astra: T11's read gate at a3e256f. Existing records, pure validators and in-memory tree planning only.
// No engine, generation, rating, replay, tree build, git or measured command.
// node docs\improve-generating-stages-2-4\evidence\sa-astra\t11-review-checks.mjs --label frozen
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const sha = (/** @type {Buffer | string} */ v) => createHash('sha256').update(v).digest('hex');
const load = (/** @type {string} */ p) => import(pathToFileURL(abs(p)).href);
const F = await load('tools/ig-proto/fit-read.mjs');
const V = await load('tools/ig-proto/verdicts.mjs');
const TREE = await load('tools/ig-proto/lib/tree.mjs');
const { checkAccepted } = await load('tools/ig-proto/lib/proof.mjs');
const { publicationOf } = await load('tools/ig-proto/arm.mjs');
const { FROZEN_COMMIT, FROZEN_DIGEST } = await load('tools/ig-proto/lib/paths.mjs');
const POLICY = 'tests/artifacts/ig-proto/frozen-source/core/engine/policy.js';
const { DEDUCE } = await load(POLICY);
const TASK = 'V4-S3P';
const ARM = 'fr-frozen-none-uncapped';
const ARMS = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', ARM];
const E = `docs/improve-generating/evidence/frozen/${TASK}`;
const R = `tests/artifacts/ig-proto/frozen/${TASK}`;
const D = 'docs/improve-generating-stages-2-4';
const O = `${D}/evidence/sa-opus`;
/** @type {Map<string, { path: string, sha256Lf: string, sha256Raw: string }>} */
const inputs = new Map();
const read = (/** @type {string} */ p) => {
  const b = readFileSync(abs(p));
  inputs.set(p, { path: p, sha256Lf: sha(b.toString('utf8').replace(/\r\n/g, '\n')), sha256Raw: sha(b) });
  return b.toString('utf8');
};
const json = (/** @type {string} */ p) => JSON.parse(read(p));
/** @param {boolean} value @param {string} why */
function check(value, why) {
  if (!value) {
    throw new Error(why);
  }
}
/** @param {string} p */
const lines = (p) => {
  const parsed = V.parseLines(read(p), p);
  check(parsed.problems.length === 0, `Unreadable ${p}: ${parsed.problems.join('; ')}`);
  return parsed.lines;
};
const lfHash = (/** @type {string} */ p) => {
  read(p);
  return /** @type {any} */ (inputs.get(p)).sha256Lf;
};
const optionalRead = (/** @type {string} */ p) => existsSync(abs(p)) ? read(p) : null;
const g = (/** @type {number} */ n) => Number((n / 1e9).toFixed(3));
/** @param {any[]} list @param {string} key @param {string} label */
function verifyIndex(list, key, label) {
  check(Array.isArray(list) && list.length > 0, `${label}: empty index`);
  const seen = new Set();
  for (const i of list) {
    check(typeof i.path === 'string' && !seen.has(i.path), `${label}: duplicate/malformed path`);
    seen.add(i.path);
    check(lfHash(i.path) === i[key], `${label}: input changed ${i.path}`);
  }
  return seen;
}

const record = json(`${E}/fit-read-prefixes-${ARM}.json`);
const index = verifyIndex(record.inputs, 'sha256', 'prefixes');
check(index.size === 173, 'Expected 173 prefix inputs');
const transportIndex = json(`${O}/t11-transport-inputs.json`);
const projectionIndex = json(`${O}/t11-projection-inputs.json`);
verifyIndex(transportIndex, 'sha256Lf', 'transport');
verifyIndex(projectionIndex, 'sha256Lf', 'projection');
check(transportIndex.length === 145 && projectionIndex.length === 6, 'Unexpected author index sizes');
const transport = json(`${O}/t11-transport.json`);
const projection = json(`${O}/t11-projection.json`);
const prefixTable = json(`${O}/t11-prefixes-table.json`);
check(transport.inputs.sha256Lf === lfHash(`${O}/t11-transport-inputs.json`)
  && projection.inputs.sha256Lf === lfHash(`${O}/t11-projection-inputs.json`), 'Index descriptor hash');
const plan = json(`tools/ig-proto/plans/${TASK}.json`);
const grid = F.fitScope(plan, ARM);
const requiredPrefix = new Set([`tools/ig-proto/plans/${TASK}.json`]);
const requiredTransport = new Set([`tools/ig-proto/plans/${TASK}.json`, POLICY, 'tools/ig-proto/verdicts.mjs',
  'tools/ig-proto/data/prior-s3-v1.json', 'tools/ig-proto/data/boards-v1.json']);
const requiredProjection = new Set([`tools/ig-proto/plans/${TASK}.json`, 'tools/ig-proto/verdicts.mjs']);
check(grid.length === 20 && new Set(grid.map((d) => d.rowKey)).size === 20, 'Declared grid is not 20 unique keys');
const cells = [...new Set(grid.map((d) => d.caseId))];
check(isDeepStrictEqual(cells, ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1']), 'Wrong cells');
const prior = json('tools/ig-proto/data/prior-s3-v1.json');
const catalogue = json('tools/ig-proto/data/boards-v1.json');
check(prior.id === 'prior-s3-v1' && DEDUCE.work === 760000000, 'Prior/policy identity');
check(record.bound === 4 && isDeepStrictEqual(record.budgets, { 'hell-1': 40000000000 }), 'Reader budget/bound');
check(isDeepStrictEqual(record.summary, {
  declared: 20, present: 20, missing: [], unexpected: [], identityRows: 0, incompleteRows: 0, unreadableRows: 0,
  ambiguousRows: 0, affectedCalls: 0, potentiallyAffectedCalls: 0, ambiguousCalls: 0, boundFirings: 0,
}), 'Reader summary is not clear');
const sources = TREE.collectSources();
/** @type {Record<string, any>} */
const epochs = {};
for (const arm of ARMS) {
  /** @type {string[]} */
  const errors = [];
  const tree = TREE.planTree(arm, { sources, errors });
  check(errors.length === 0 && !tree.chain.some((s) => s.startsWith('p7-')), `${arm}: invalid/reference-kernel composition`);
  const paramsHash = sha(JSON.stringify(tree.params));
  const receiptPath = `${E}/parity-${arm}.receipt.json`;
  const receipt = json(receiptPath);
  const binding = json(`${E}/parity-${arm}.accepted.json`);
  const identity = { id: arm, treeId: tree.treeId, paramsHash };
  const result = checkAccepted(binding, { readFile: optionalRead, current: [identity] });
  check(result.status === 'pass' && binding.acceptedBy === 'V4-S3'
    && isDeepStrictEqual(binding.expected.arms, [identity]) && isDeepStrictEqual(receipt.arms, [identity]), `${arm}: stale/invalid binding`);
  check(receipt.kind === 'parity' && receipt.verdict === 'pass' && receipt.blocks.parity === 'pass'
    && receipt.blocks.replay === 'pass' && receipt.source.frozenCommit === FROZEN_COMMIT
    && receipt.source.sourceDigest === FROZEN_DIGEST, `${arm}: wrong receipt/source`);
  const captured = json(`${E}/inputs/parity-${arm}/${arm}.ig-tree.json`);
  check(captured.treeId === tree.treeId && isDeepStrictEqual(captured.params, tree.params), `${arm}: captured parameters differ`);
  if (arm.endsWith('-uncapped')) {
    check(tree.params.callBudget === null && tree.params.setAttemptsBound === null && tree.params.liveDeadline === null, `${arm}: not uncapped`);
  } else {
    check(tree.params.callBudget.any['hell-1'] === 40000000000 && tree.params.callBudget.require['hell-1'] === 40000000000
      && tree.params.setAttemptsBound === 4 && tree.params.liveDeadline.reserve === 0.6
      && tree.params.liveDeadline.setStageCapMs === 46000 && tree.params.liveDeadline.generationStopMs === 115000
      && tree.params.liveDeadline.responseBoundMs === 120000, `${arm}: fixed limits differ`);
  }
  check(tree.params.priorTable === 'prior-s3-v1' && isDeepStrictEqual(tree.params.perSetLevels, ['hell-1']), `${arm}: prior configuration`);
  for (const id of tree.chain) {
    read(`tools/ig-proto/variants/${id}.json`);
  }
  epochs[arm] = { ...identity, harnessHash: receipt.harnessHash, copyDigest: captured.copyDigest, check: result };
}
const runNames = readdirSync(abs(`${E}/${ARM}`)).filter((n) => n.endsWith('.runs.json')).sort();
check(isDeepStrictEqual(runNames, grid.filter((d) => d.rep === 0).map((d) => `${d.shard}.runs.json`).sort()), 'Extra/missing runs file');
const publications = runNames.map((name) => ({ name, doc: json(`${E}/${ARM}/${name}`) }));
const allRows = publications.flatMap((p) => p.doc.rows);
check(allRows.length === 20 && record.rows.length === 20 && allRows.every((/** @type {any} */ r) => grid.some((d) => d.rowKey === r.rowKey)), 'Extra/missing published key');
check(record.rows.every((/** @type {any} */ r) => grid.some((d) => d.rowKey === r.rowKey)), 'Extra prefix key');
/** @type {any[]} */
const auditedRows = [];
let workerFiles = 0;
const clamp = (/** @type {number} */ value, /** @type {number} */ K) => Math.min(K - 2, Math.max(1, value));
for (const cellId of cells) {
  const declared = grid.filter((d) => d.caseId === cellId);
  const shardId = declared[0].shard;
  const pub = publications.find((p) => p.name === `${shardId}.runs.json`)?.doc;
  check(pub !== undefined && pub.rows.length === 5, `${cellId}: publication size`);
  const tree = pub.meta.trees[ARM];
  check(pub.meta.source.frozenCommit === FROZEN_COMMIT && pub.meta.source.sourceDigest === FROZEN_DIGEST
    && tree.treeId === epochs[ARM].treeId && sha(JSON.stringify(tree.params)) === epochs[ARM].paramsHash
    && pub.meta.harness.harnessHash === epochs[ARM].harnessHash, `${cellId}: wrong epoch/source/producer`);
  const raw = `${R}/${ARM}/${shardId}`;
  for (const p of [`${E}/${ARM}/${shardId}.runs.json`, `${E}/${ARM}/${shardId}.runs.md`, `${raw}/shard.json`, `${raw}/state.json`]) {
    requiredPrefix.add(p);
  }
  requiredTransport.add(`${E}/${ARM}/${shardId}.runs.json`);
  requiredProjection.add(`${E}/${ARM}/${shardId}.runs.json`);
  const shard = json(`${raw}/shard.json`);
  const state = json(`${raw}/state.json`);
  check(state.done === true && state.recorded === 5 && state.expected === 5 && state.treeId === shard.treeId
    && state.harnessHash === shard.harnessHash, `${cellId}: state`);
  check(shard.variant === ARM && shard.rows.length === 5 && new Set(shard.rows.map((/** @type {any} */ r) => r.key)).size === 5, `${cellId}: shard rows`);
  const mdPath = `${E}/${ARM}/${shardId}.runs.md`;
  check(index.has(mdPath) && publicationOf(abs(`${E}/${ARM}`), shardId) === 'complete', `${cellId}: metadata not bound/complete`);
  const md = read(mdPath);
  const named = /The journal lines are in `([^`]+)`/.exec(md);
  check(named !== null && existsSync(abs(`${E}/${ARM}/${named[1]}`)), `${cellId}: published journal absent`);
  const names = readdirSync(abs(`${raw}/logs`)).sort();
  check(names.filter((n) => n.endsWith('.jsonl')).every((n) => declared.some((d) => n.startsWith(`${d.rowKey}.`))),
    `${cellId}: unexpected raw journal`);
  check(isDeepStrictEqual(names.filter((n) => n.endsWith('.row.jsonl')).map((n) => n.slice(0, -'.row.jsonl'.length)),
    declared.map((d) => d.rowKey).sort()), `${cellId}: raw row keys`);
  const board = catalogue.cases[cellId];
  check(board.levelId === 'hell-1' && board.uniqueness === 'any', `${cellId}: unexpected request mode`);
  const share = prior.cells[`hell-1@${board.area}`].share;
  check(share === ({ 196: 0.4, 400: 0.368421, 576: 0.219512, 676: 0.2 })[board.area], `${cellId}: frozen share`);
  const tablePrior = (/** @type {number} */ K) => clamp(Math.round(share * K), K);
  for (const d of declared) {
    const held = allRows.filter((/** @type {any} */ r) => r.rowKey === d.rowKey);
    check(held.length === 1 && F.declaredRowProblem(d, held[0]) === null, `${d.rowKey}: declared identity`);
    const row = held[0];
    check(V.ingestRow(row, { quantity: 10 }).status === 'valid', `${d.rowKey}: invalid/censored/erroneous row`);
    const rr = record.rows.filter((/** @type {any} */ r) => r.rowKey === d.rowKey);
    check(rr.length === 1, `${d.rowKey}: repeated/missing prefix row`);
    const headers = lines(`${raw}/logs/${d.rowKey}.row.jsonl`);
    const identity = F.rawIdentityProblems({ task: TASK, arm: ARM, declared: d, shard, rowLines: headers, meta: pub.meta });
    check(identity.length === 0, `${d.rowKey}: raw identity ${identity.join('; ')}`);
    const workers = names.filter((n) => n.startsWith(`${d.rowKey}.`) && n.endsWith('.jsonl')
      && !n.endsWith('.row.jsonl') && n !== `${d.rowKey}.link.jsonl`);
    requiredPrefix.add(`${raw}/logs/${d.rowKey}.row.jsonl`);
    for (const name of [...workers, `${d.rowKey}.link.jsonl`]) {
      requiredPrefix.add(`${raw}/logs/${name}`);
      requiredTransport.add(`${raw}/logs/${name}`);
    }
    workerFiles += workers.length;
    const journal = workers.flatMap((n) => lines(`${raw}/logs/${n}`));
    const links = lines(`${raw}/logs/${d.rowKey}.link.jsonl`);
    const ledger = V.rowLedger(journal, links);
    const prefixes = F.callPrefixes(journal, { 'hell-1': 40000000000 });
    const bound = F.boundFirings(prefixes.calls, 4);
    check(ledger.complete && ledger.problems.length === 0 && prefixes.problems.length === 0, `${d.rowKey}: incomplete/ambiguous ledger`);
    for (const c of prefixes.calls) {
      // Independent threshold check: all recorded primitive units are nonnegative, so a total below 40 G
      // proves every earlier primitive-boundary prefix is below 40 G, including terminated calls.
      const units = journal.filter((l) => l.call === c.call && (l.t === 'p' || l.t === 'count'))
        .map((l) => l.t === 'p' ? l.tuple[4] + l.tuple[5] : l.units);
      check(units.every((n) => Number.isFinite(n) && n >= 0), `${c.call}: invalid units`);
      const spent = units.reduce((a, b) => a + b, 0);
      check(spent === c.spent && spent < 40000000000 && c.status === 'clear', `${c.call}: budget flag`);
    }
    const maxSpent = Math.max(...prefixes.calls.map((c) => c.spent));
    const expectedPrefix = {
      rowKey: d.rowKey, cell: d.caseId, rep: d.rep, shard: d.shard, publication: 'complete', shardDone: true,
      rowStatus: 'valid', identity: [], complete: true, unreadable: false, problems: [], calls: { clear: prefixes.calls.length },
      maxSpent, affected: [], potentiallyAffected: [], ambiguous: [], bound,
    };
    check(isDeepStrictEqual(rr[0], expectedPrefix) && !bound.fires, `${d.rowKey}: prefix record differs/attempt bound fires`);
    check(ledger.calls === prefixes.calls.length && ledger.terminated === prefixes.calls.filter((c) => !c.ended).length
      && ledger.open === ledger.terminated, `${d.rowKey}: termination attribution`);
    const starts = journal.filter((l) => l.t === 'start');
    const sets = starts.filter((s) => s.stage === 'set');
    const batches = starts.filter((s) => s.stage === 'batch');
    check(sets.length === 4 && starts.length === sets.length + batches.length, `${d.rowKey}: unexpected stages/counts`);
    for (const s of starts) {
      check(s.row === d.rowKey && s.level === board.levelId && s.A === board.area && s.variant === ARM
        && s.W === DEDUCE.work && Number.isInteger(s.K) && s.K >= 3, `${s.call}: start identity/W/K`);
    }
    for (const s of sets) {
      check(s.priorCount === tablePrior(s.K), `${s.call}: table-prior transport`);
    }
    const attempt = row.run.details.setAttempt;
    const wins = sets.filter((s) => s.attempt === attempt);
    const winLinks = links.filter((l) => l.ev === 'set-complete' && l.attempt === attempt && l.outcome === 'ok');
    check(attempt === 0 && wins.length === 1 && winLinks.length === 1, `${d.rowKey}: ambiguous winning set`);
    const win = wins[0];
    const ends = journal.filter((l) => l.t === 'end' && l.call === win.call);
    check(ends.length === 1 && ends[0].result === 'ok', `${d.rowKey}: winning set end`);
    const end = ends[0];
    const wc = end.locate.wc;
    check(end.accepted.rating.level === 'hell-1' && end.accepted.rating.score === end.score
      && end.score >= 78 && end.score <= 106 && Number.isInteger(wc) && wc >= 1
      && row.run.details.K === win.K && ['hit', 'window'].includes(end.locate.result), `${d.rowKey}: calibration attribution`);
    const batchStarts = links.filter((l) => l.ev === 'start');
    check(batchStarts.length === 1, `${d.rowKey}: ambiguous batch linkage`);
    const batch = batchStarts[0].batch;
    for (const s of batches) {
      const dispatches = links.filter((l) => l.ev === 'dispatch' && l.batch === batch && `${l.slot}/${l.attempt}` === s.attempt);
      check(s.K === win.K && dispatches.length === 1 && s.priorCount === clamp(wc, s.K), `${s.call}: unattributed/wrong batch prior`);
    }
    const setCalls = prefixes.calls.filter((c) => c.stage === 'set');
    check(isDeepStrictEqual(setCalls.map((c) => c.attempt).sort((a, b) => a - b), [0, 1, 2, 3])
      && setCalls.filter((c) => c.ended).every((c) => ['hit', 'window'].includes(c.endResult)), `${d.rowKey}: unexpected set results`);
    const run = row.run;
    check(Number.isFinite(run.igSetMs) && Array.isArray(run.igAcceptedMs) && run.igAcceptedMs.length === run.acceptedCount
      && run.igAcceptedMs.every((t, i, a) => Number.isFinite(t) && t >= 0 && t <= run.responseMs && (i === 0 || t >= a[i - 1])),
    `${d.rowKey}: incomplete/nonmonotonic acceptance timeline`);
    const setCut = run.igSetMs > 46000;
    const served = setCut ? 0 : run.igAcceptedMs.filter((t) => t <= 115000).length;
    const completed = served >= 10;
    const lost = run.acceptedCount >= 10 && !completed;
    const projected = V.deadlineProjection([V.ingestRow(row, { quantity: 10 })], { reserve: 0.6, deadlineMs: 115000, quantity: 10 });
    check(projected.skipped === 0 && projected.rows[0].status === 'projected'
      && isDeepStrictEqual([setCut, served, completed, lost], [projected.rows[0].setCut, projected.rows[0].served,
        projected.rows[0].completed, projected.rows[0].lost]), `${d.rowKey}: projection mismatch`);
    const authorTransport = transport.rows.filter((r) => r.rowKey === d.rowKey);
    check(authorTransport.length === 1 && authorTransport[0].status === 'valid' && authorTransport[0].K === win.K
      && authorTransport[0].tablePrior === tablePrior(win.K) && authorTransport[0].perSetPrior === clamp(wc, win.K)
      && authorTransport[0].batchStarts === batches.length && authorTransport[0].unattributed === 0, `${d.rowKey}: author transport mismatch`);
    const authorProjection = projection.cells.find((c) => c.cell === cellId).perRow.filter((r) => r.rowKey === d.rowKey);
    check(authorProjection.length === 1 && authorProjection[0].status === 'projected'
      && isDeepStrictEqual([setCut, served, completed, lost], [authorProjection[0].setCut, authorProjection[0].served,
        authorProjection[0].completed, authorProjection[0].lost]), `${d.rowKey}: author projection mismatch`);
    auditedRows.push({
      rowKey: d.rowKey, cell: cellId, rep: d.rep, calls: prefixes.calls.length, ended: ledger.ended, terminated: ledger.terminated,
      maxSpent, maxEndedBatch: Math.max(...prefixes.calls.filter((c) => c.stage === 'batch' && c.ended).map((c) => c.spent)),
      maxTerminated: Math.max(...prefixes.calls.filter((c) => !c.ended).map((c) => c.spent)),
      maxSet: Math.max(...setCalls.map((c) => c.spent)), boundFires: bound.fires,
      setEnds: setCalls.filter((c) => c.ended).map((c) => c.endResult), setTerminated: setCalls.filter((c) => !c.ended).length,
      setStarts: sets.length, batchStarts: batches.length, batchEnded: prefixes.calls.filter((c) => c.stage === 'batch' && c.ended).length,
      K: win.K, calibrationScore: end.score, wc, tablePrior: tablePrior(win.K), perSetPrior: clamp(wc, win.K),
      distinctBatch: tablePrior(win.K) === clamp(wc, win.K) ? 0 : batches.length,
      setMs: run.igSetMs, accepted: run.acceptedCount, tenthReadyMs: run.tenthReadyMs, responseMs: run.responseMs,
      setCut, served, completed, lost, workInterval: { lo: ledger.lo, hi: ledger.hi },
    });
  }
}
check(workerFiles === 116 && transport.mismatches.length === 0, 'Worker/transport count');
check(isDeepStrictEqual([...index].sort(), [...requiredPrefix].sort()), 'Prefix index omits or adds an input');
check(isDeepStrictEqual(transportIndex.map((r) => r.path).sort(), [...requiredTransport].sort()), 'Transport index is not its complete input set');
check(isDeepStrictEqual(projectionIndex.map((r) => r.path).sort(), [...requiredProjection].sort()), 'Projection index is not its complete input set');
const setResults = auditedRows.flatMap((r) => r.setEnds);
const transportTotals = {
  setStarts: auditedRows.reduce((n, r) => n + r.setStarts, 0), batchStarts: auditedRows.reduce((n, r) => n + r.batchStarts, 0),
  distinctRows: auditedRows.filter((r) => r.tablePrior !== r.perSetPrior).length,
  distinctBatchStarts: auditedRows.reduce((n, r) => n + r.distinctBatch, 0),
  minDelta: Math.min(...auditedRows.map((r) => r.perSetPrior - r.tablePrior)),
  maxDelta: Math.max(...auditedRows.map((r) => r.perSetPrior - r.tablePrior)),
  minScore: Math.min(...auditedRows.map((r) => r.calibrationScore)), maxScore: Math.max(...auditedRows.map((r) => r.calibrationScore)),
  setHit: setResults.filter((r) => r === 'hit').length, setWindow: setResults.filter((r) => r === 'window').length,
  setTerminated: auditedRows.reduce((n, r) => n + r.setTerminated, 0),
};
check(isDeepStrictEqual(transportTotals, { setStarts: 80, batchStarts: 352, distinctRows: 10, distinctBatchStarts: 173,
  minDelta: -3, maxDelta: 3, minScore: 79, maxScore: 103, setHit: 36, setWindow: 8, setTerminated: 36 }),
  'Transport/calibration/set-result totals differ from the note');
const summaries = cells.map((cell) => {
  const rows = auditedRows.filter((r) => r.cell === cell);
  const sum = (field) => rows.reduce((n, r) => n + r[field], 0);
  const result = {
    cell, rows: rows.length, calls: sum('calls'), ended: sum('ended'), terminated: sum('terminated'),
    maxCallG: g(Math.max(...rows.map((r) => r.maxSpent))), boundFirings: rows.filter((r) => r.boundFires).length,
    maxEndedBatchG: g(Math.max(...rows.map((r) => r.maxEndedBatch))), maxTerminatedG: g(Math.max(...rows.map((r) => r.maxTerminated))),
    maxSetG: g(Math.max(...rows.map((r) => r.maxSet))), setStarts: sum('setStarts'), batchStarts: sum('batchStarts'),
    distinctBatchStarts: sum('distinctBatch'), setCuts: rows.filter((r) => r.setCut).length,
    lost: rows.filter((r) => r.lost).length, completed: rows.filter((r) => r.completed).length,
    served: rows.map((r) => r.served), maxSetS: Math.max(...rows.map((r) => r.setMs)) / 1000,
  };
  const authored = prefixTable.cells.find((r) => r.cell === cell);
  for (const field of ['calls', 'ended', 'terminated', 'boundFirings', 'maxEndedBatchG', 'maxTerminatedG', 'maxSetG']) {
    check(result[field] === authored[field], `${cell}: author prefix ${field}`);
  }
  check(result.maxCallG === authored.maxSpentG
    && result.distinctBatchStarts === transport.cells.find((c) => c.cell === cell).batchDistinct, `${cell}: author aggregate`);
  return result;
});
const invocations = lines(`${R}/invocations.jsonl`);
check(invocations.length === 8 && invocations.every((r) => r.done && !r.killed && r.exit === 0 && r.quietS === 15 && r.horizonS === 885),
  'Invocation integrity');
const countedS = invocations.reduce((s, r) => s + r.countedSeconds, 0);
const account = { countedS, afterLoggedS: invocations[0].budget.roundCountedS + countedS,
  afterMinutes: (invocations[0].budget.roundCountedS + countedS + 87.4) / 60 };
check(Math.abs(countedS - 2298.808) < 1e-8, 'Counted account');
const runLog = read(`${R}/run-1.log`);
check(runLog.includes('firewall: OK') && runLog.includes('Plan V4-S3P finished:'), 'Run completion');
for (const path of [POLICY, 'tools/ig-proto/fit-read.mjs', 'tools/ig-proto/verdicts.mjs', 'tools/ig-proto/lib/proof.mjs',
  'tools/ig-proto/lib/tree.mjs', 'tools/ig-proto/variants/v4-ps.json', `${D}/s01-reading.md`, `${D}/plan.md`,
  'tasks/improve-generating-stages-2-4/T11-sa-reading-of-the-fit-runs.md', `${O}/t11-transport.mjs`, `${O}/t11-projection.mjs`]) {
  read(path);
}
const readingPath = `${D}/t11-reading.md`;
const reading = read(readingPath);
const oldSignoff = '- SA-Astra (reviewer):\r\n';
const signoff = '- SA-Astra (reviewer): jointly signed acceptance of the final epoch, outcome (A), 2026-11-24.\r\n';
check(reading.split(oldSignoff).length + reading.split(signoff).length === 3, 'Expected exactly one blank or accepted SA-Astra sign-off line');
const unsignedReading = reading.includes(oldSignoff) ? reading : reading.replace(signoff, oldSignoff);
const out = {
  base: 'a3e256f', outcome: 'A', epoch: epochs, cells: summaries, rows: auditedRows, workerFiles, transportTotals,
  indices: { prefixes: index.size, transport: transportIndex.length, projection: projectionIndex.length }, account,
  scope: 'No P5 budget/attempt or evidence/transport flag; deadline projection still loses one completion. Not a measured zero-loss comparison or live-deadline proof.',
  signoff: { path: readingPath, beforeSha256Raw: sha(unsignedReading), expectedAfterSha256Raw: sha(unsignedReading.replace(oldSignoff, signoff)), text: signoff.trimEnd() },
  inputs: [...inputs.values()],
};
writeFileSync(relative(process.cwd(), join(HERE, 't11-review-checks.json')), JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(JSON.stringify({ outcome: out.outcome, epoch: epochs, cells: summaries, indices: out.indices, workerFiles, account,
  reviewedInputs: inputs.size, scope: out.scope }, null, 2));
