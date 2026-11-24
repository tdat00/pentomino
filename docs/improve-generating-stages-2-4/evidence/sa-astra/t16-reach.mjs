// @ts-check
// SA-Astra, T16 step 4 / N-V4-17, at 44c335a: existing S4/S4C journals only.
// No engine, rating, generation, replay, tree build, git or measured command.
// node docs\improve-generating-stages-2-4\evidence\sa-astra\t16-reach.mjs --label frozen
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const sha = (/** @type {string | Buffer} */ v) => createHash('sha256').update(v).digest('hex');
const load = (/** @type {string} */ p) => import(pathToFileURL(abs(p)).href);
const POLICY = 'tests/artifacts/ig-proto/frozen-source/core/engine/policy.js';
const D = 'docs/improve-generating-stages-2-4';
const E = 'docs/improve-generating/evidence/frozen';
const R = 'tests/artifacts/ig-proto/frozen';
/** @type {Map<string, any>} */
const inputs = new Map();
const read = (/** @type {string} */ path) => {
  const b = readFileSync(abs(path));
  const text = b.toString('utf8');
  const entry = { path, sha256Lf: sha(text.replace(/\r\n/g, '\n')), sha256Raw: sha(b), bytes: b.length };
  if (inputs.has(path) && inputs.get(path).sha256Raw !== entry.sha256Raw) {
    throw new Error(`Input changed during the audit: ${path}`);
  }
  inputs.set(path, entry);
  return text;
};
const json = (/** @type {string} */ p) => JSON.parse(read(p));
/** @param {boolean} value @param {string} message */
function requireThat(value, message) {
  if (!value) {
    throw new Error(message);
  }
}
/** @type {any[]} */
const findings = [];
/** @param {string} type @param {any} where @param {unknown} got @param {unknown} want */
const issue = (type, where, got, want) => findings.push({ type, ...where, got, want });
/** @type {WeakMap<object, { path: string, line: number }>} */
const origin = new WeakMap();
/** @param {string} path @returns {any[]} */
function jsonl(path) {
  const result = [];
  for (const [i, line] of read(path).split(/\r?\n/).entries()) {
    if (line.trim() === '') {
      continue;
    }
    const obj = JSON.parse(line);
    requireThat(obj !== null && typeof obj === 'object' && !Array.isArray(obj), `Malformed object ${path}:${i + 1}`);
    origin.set(obj, { path, line: i + 1 });
    result.push(obj);
  }
  return result;
}
for (const path of [POLICY, 'tools/ig-proto/verdicts.mjs', 'tools/ig-proto/fit-read.mjs', 'tools/ig-proto/lib/ledger.mjs',
  'tests/artifacts/ig-proto/frozen-source/core/engine/levels.js',
  'tests/artifacts/ig-proto/frozen-source/tools/bench/report.js']) read(path);
const V = await load('tools/ig-proto/verdicts.mjs');
const F = await load('tools/ig-proto/fit-read.mjs');
const { DEDUCE } = await load(POLICY);
const freeze = json(`${E}/V4-S3/freeze.json`);
const prior = json('tools/ig-proto/data/prior-s3-v1.json');
const catalogue = json('tools/ig-proto/data/boards-v1.json');
const manifest = json('tools/ig-proto/plans/verdicts/V4-S4F.verdict-manifest.json');
requireThat(freeze.values.c4 === false && freeze.values.rerate === 'rescue' && freeze.values.rerateMax === 4
  && isDeepStrictEqual(freeze.values.perSetLevels, ['hell-1']) && prior.id === freeze.tables.prior
  && manifest.purpose === 'final' && manifest.quantity === 10, 'Unexpected frozen configuration/scope');
const plans = Object.fromEntries(['V4-S4', 'V4-S4C'].map((task) => [task, json(`tools/ig-proto/plans/${task}.json`)]));
/** @type {Map<string, any>} */
const groups = new Map();
for (const [task, plan] of Object.entries(plans)) {
  for (const step of /** @type {any} */ (plan).steps) {
    const node = step.node;
    if (!node?.[0]?.endsWith('arm.mjs') || node[1] !== 'run') {
      continue;
    }
    const flag = (/** @type {string} */ f) => node[node.indexOf(f) + 1];
    const arm = flag('--arm');
    const shard = flag('--shard');
    const match = /^([^:]+):(\d+)-(\d+)$/.exec(flag('--cases'));
    requireThat(match !== null, `Expected one case range: ${task}/${step.id}`);
    const cell = match[1];
    const reps = Array.from({ length: Number(match[3]) - Number(match[2]) + 1 }, (_, i) => Number(match[2]) + i);
    const key = `${task}/${arm}/${shard}`;
    requireThat(!groups.has(key), `Duplicate declared shard ${key}`);
    groups.set(key, { task, arm, variant: flag('--variant'), shard, cell, reps });
  }
}
requireThat(groups.size === 99 && [...groups.values()].reduce((n, g) => n + g.reps.length, 0) === 1500,
  'Expected 99 arm/cell groups and 1500 rows, including legacy context');

const fields = [
  'rows', 'validRows', 'activeRows', 'legacyRows', 'calls', 'activeCalls', 'legacyCalls', 'ended', 'terminated', 'unclosed',
  'setCalls', 'batchCalls', 'completionCalls', 'profiles', 'closeCalls', 'c4Calls', 'closePhaseCalls', 'c4PhaseCalls',
  'rescueEnteredCalls', 'rescueWorkingCalls', 'rescueStarts', 'rescueCompleted', 'rescueUnfinished', 'rescueSummaryCalls',
  'rescuedInCalls', 'tailEnteredCalls', 'tailStarts', 'tailCompleted', 'tailUnfinished', 'endedRerateCounter',
  'rerateBlockedBeforeBegin', 'legacyNullW', 'wChecked', 'wMismatches', 'tableChecked', 'tableChangedFromInitial',
  'tableMismatches', 'perSetChecked', 'perSetDifferentFromTable', 'perSetMismatches', 'perSetRows', 'perSetDistinctRows',
  'hellFallbackBatch', 'hellNoBatchRows', 'unattributedBatch', 'rawCallErrors', 'workerFiles', 'ledgerCompleteRows',
];
/** @returns {Record<string, number>} */
const empty = () => Object.fromEntries(fields.map((f) => [f, 0]));
/** @param {any} target @param {any} added */
const add = (target, added) => fields.forEach((f) => { target[f] += added[f]; });
/** @param {Record<string, number>} map @param {unknown} key */
const count = (map, key) => { const name = String(key); map[name] = (map[name] ?? 0) + 1; };
/** @param {string} level @param {number} area */
function frozenClass(level, area) {
  const matches = Object.entries(freeze.bounds).filter(([, b]) => {
    const [l, lo, hi] = /** @type {any[]} */ (b);
    return l === level && area >= lo && (hi === null || area <= hi);
  });
  requireThat(matches.length <= 1, `Overlapping freeze classes ${level}@${area}`);
  return matches[0]?.[0] ?? null;
}
const clamp = (/** @type {number} */ n, /** @type {number} */ K) => Math.min(K - 2, Math.max(1, n));
const screenArms = new Set(['fr-frozen', 'fr-frozen-uncapped']);
/** @type {any[]} */
const cellResults = [];
/** @type {any[]} */
const rowResults = [];
const processed = new Set();
for (const arm of manifest.arms) {
  for (const file of arm.files) {
    const shardName = file.path.split('/').at(-1).replace(/\.runs\.json$/, '');
    const key = `${arm.task}/${arm.id}/${shardName}`;
    const group = groups.get(key);
    requireThat(group !== undefined && !processed.has(key), `Unexpected/duplicate publication ${key}`);
    processed.add(key);
    const doc = json(file.path);
    requireThat(inputs.get(file.path).sha256Lf === file.sha256, `Changed publication ${file.path}`);
    const metaTree = doc.meta.trees[arm.variant];
    requireThat(metaTree.treeId === arm.treeId, `Wrong publication tree ${key}`);
    const isFamily = Object.hasOwn(freeze.variants, arm.id);
    if (isFamily) {
      requireThat(metaTree.treeId === freeze.variants[arm.id].treeId
        && sha(JSON.stringify(metaTree.params)) === freeze.variants[arm.id].paramsHash
        && metaTree.params.c4 === false && metaTree.params.rerate === 'rescue' && metaTree.params.rerateMax === 4
        && metaTree.params.priorTable === prior.id && isDeepStrictEqual(metaTree.params.prior, prior.cells)
        && isDeepStrictEqual(metaTree.params.perSetLevels, ['hell-1']), `Publication differs from freeze ${key}`);
    }
    const board = catalogue.cases[group.cell];
    const cls = frozenClass(board.levelId, board.area);
    const active = isFamily && ['nightmare', 'hell-1'].includes(board.levelId);
    const expectedW = active ? (screenArms.has(arm.id) && cls !== null && typeof freeze.values.W[cls] === 'number'
      ? freeze.values.W[cls] : DEDUCE.work) : null;
    const table = prior.cells[`${board.levelId}@${board.area}`];
    if (active) {
      requireThat(table !== undefined, `Missing prior table cell ${group.cell}`);
    }
    const expectedTable = (/** @type {number} */ K) => K < 3 || table === undefined ? null : clamp(Math.round(table.share * K), K);
    const cell = { task: arm.task, arm: arm.id, cell: group.cell, level: board.levelId, class: cls,
      mode: active ? 'v4' : 'legacy', expectedW, ...empty(), wObserved: {}, profilePhases: {}, phaseEntries: {},
      closeSides: {}, c4Sides: {}, priorDeltas: {},
      setResults: {}, partialReasons: {}, findingCount: 0 };
    const firstFinding = findings.length;
    const raw = `${R}/${arm.task}/${arm.id}/${group.shard}`;
    const shard = json(`${raw}/shard.json`);
    const state = json(`${raw}/state.json`);
    requireThat(board.uniqueness === 'any' && shard.cases[group.cell].uniqueness === 'any'
      && shard.rows.every((d) => d.case.uniqueness === 'any'), `Unexpected uniqueness mode ${key}`);
    requireThat(state.done === true && state.recorded === group.reps.length && state.expected === group.reps.length
      && state.treeId === shard.treeId && state.harnessHash === shard.harnessHash && doc.rows.length === group.reps.length,
    `Incomplete state/publication ${key}`);
    const names = readdirSync(abs(`${raw}/logs`)).sort();
    const wantedKeys = group.reps.map((rep) => `${group.cell}~${rep}`);
    requireThat(names.filter((n) => n.endsWith('.row.jsonl')).length === wantedKeys.length
      && names.filter((n) => n.endsWith('.jsonl')).every((n) => wantedKeys.some((k) => n.startsWith(`${k}.`))),
    `Unexpected/missing raw row file ${key}`);
    for (const rep of group.reps) {
      const rowKey = `${group.cell}~${rep}`;
      const held = doc.rows.filter((r) => r.rowKey === rowKey);
      requireThat(held.length === 1, `Missing/duplicate row ${key}/${rowKey}`);
      const row = held[0];
      const declared = { rowKey, caseId: group.cell, rep, seed: `landscape/${group.cell}/${rep}`, shard: group.shard };
      requireThat(F.declaredRowProblem(declared, row) === null && V.ingestRow(row, { quantity: 10 }).status === 'valid',
        `Invalid/incorrect row ${key}/${rowKey}`);
      const header = jsonl(`${raw}/logs/${rowKey}.row.jsonl`);
      const identity = F.rawIdentityProblems({ task: arm.task, arm: arm.id, declared, shard, rowLines: header, meta: doc.meta });
      requireThat(identity.length === 0, `Wrong raw identity ${key}/${rowKey}: ${identity.join('; ')}`);
      const workers = names.filter((n) => n.startsWith(`${rowKey}.`) && n.endsWith('.jsonl')
        && !n.endsWith('.row.jsonl') && n !== `${rowKey}.link.jsonl`);
      const journal = workers.flatMap((n) => jsonl(`${raw}/logs/${n}`));
      const links = jsonl(`${raw}/logs/${rowKey}.link.jsonl`);
      const where = { task: arm.task, arm: arm.id, cell: group.cell, rowKey };
      const r = { ...where, rep, mode: cell.mode, ...empty(), winning: null, partialReason: row.run.partialReason ?? null };
      r.rows = 1;
      r.validRows = 1;
      r.activeRows = active ? 1 : 0;
      r.legacyRows = active ? 0 : 1;
      r.workerFiles = workers.length;
      count(cell.partialReasons, r.partialReason);
      /** @type {Map<string, any>} */
      const calls = new Map();
      for (const line of journal) {
        if (typeof line.call !== 'string') {
          continue;
        }
        if (!calls.has(line.call)) calls.set(line.call, { id: line.call, lines: [] });
        calls.get(line.call).lines.push(line);
      }
      const terminations = links.filter((l) => l.ev === 'worker-end');
      for (const c of calls.values()) {
        const starts = c.lines.filter((l) => l.t === 'start');
        const ends = c.lines.filter((l) => l.t === 'end');
        requireThat(starts.length === 1 && ends.length <= 1, `Missing/duplicate call start/end ${key}/${c.id}`);
        c.start = starts[0];
        c.end = ends[0] ?? null;
        const pid = Number(c.id.split(':').at(-3));
        const thread = Number(c.id.split(':').at(-2));
        c.terminated = c.end === null && terminations.some((t) => t.pid === pid && t.threadId === thread && t.at >= c.start.at);
        c.where = { ...where, call: c.id, evidence: origin.get(c.start) };
      }
      if (active) {
        const ledger = V.rowLedger(journal, links);
        if (ledger.complete) r.ledgerCompleteRows = 1;
        else issue('incomplete-active-ledger', where, ledger.problems, []);
      }
      const batchCalls = [...calls.values()].filter((c) => c.start.stage === 'batch');
      let expectedPerSet = null;
      let perSetAttributable = true;
      let winnerK = null;
      if (active && board.levelId === 'hell-1') {
        if (batchCalls.length === 0) {
          r.hellNoBatchRows = 1;
        } else {
          const attempt = row.run.details?.setAttempt;
          const wins = [...calls.values()].filter((c) => c.start.stage === 'set' && c.start.attempt === attempt);
          const completed = links.filter((l) => l.ev === 'set-complete' && l.attempt === attempt && l.outcome === 'ok');
          if (!Number.isInteger(attempt) || wins.length !== 1 || completed.length !== 1 || wins[0].end === null) {
            issue('winning-set-not-attributed', where, { attempt, starts: wins.length, completeLinks: completed.length }, 'one winning start/end and successful linkage');
            perSetAttributable = false;
          } else {
            const win = wins[0];
            const end = win.end;
            winnerK = win.start.K;
            const rating = end.accepted?.rating;
            const wc = end.locate?.wc;
            if (end.result !== 'ok' || rating === undefined || row.run.details?.K !== winnerK) {
              issue('winning-calibration-unreadable', win.where, { result: end.result, rating: rating !== undefined, publishedK: row.run.details?.K, winnerK }, 'successful observed calibration and matching K');
              perSetAttributable = false;
            } else {
              if (end.score !== rating.score) issue('calibration-score-mismatch', win.where, end.score, rating.score);
              const matches = rating.level === board.levelId && board.uniqueness === 'any' && Number.isInteger(wc) && wc >= 1;
              if (matches && !(Number.isFinite(rating.score) && rating.score >= win.start.min && rating.score < win.start.max)) {
                issue('calibration-band', win.where, rating.score, `[${win.start.min}, ${win.start.max})`);
              }
              expectedPerSet = matches ? clamp(wc, winnerK) : null;
              r.winning = { attempt, call: win.id, K: winnerK, level: rating.level, score: rating.score, wc,
                tablePrior: expectedTable(winnerK), perSetPrior: expectedPerSet, matches };
              if (matches) {
                r.perSetRows = 1;
                r.perSetDistinctRows = expectedPerSet !== expectedTable(winnerK) ? 1 : 0;
              }
            }
          }
        }
      }
      const batchStarts = links.filter((l) => l.ev === 'start');
      for (const c of calls.values()) {
        const s = c.start;
        r.calls += 1;
        if (active) r.activeCalls += 1;
        else r.legacyCalls += 1;
        if (c.end !== null) r.ended += 1;
        else if (c.terminated) r.terminated += 1;
        else {
          r.unclosed += 1;
          issue('call-not-closed', c.where, 'no end or matching worker-end', 'an end or confirmed termination');
        }
        const stage = { set: 'setCalls', batch: 'batchCalls', completion: 'completionCalls' }[s.stage];
        if (stage === undefined) issue('unexpected-stage', c.where, s.stage, 'set/batch/completion');
        else r[stage] += 1;
        if (s.row !== rowKey || s.variant !== arm.variant || s.level !== board.levelId || s.A !== board.area || !Number.isInteger(s.K)) {
          issue('start-identity', c.where, { row: s.row, variant: s.variant, level: s.level, A: s.A, K: s.K },
            { row: rowKey, variant: arm.variant, level: board.levelId, A: board.area, K: 'integer' });
        }
        count(cell.wObserved, s.W);
        r.wChecked += 1;
        if (s.W !== expectedW) {
          r.wMismatches += 1;
          issue('W-mismatch', c.where, s.W, expectedW);
        }
        if (!active) {
          if (s.W === null) r.legacyNullW += 1;
          if (s.priorCount !== null) issue('legacy-prior', c.where, s.priorCount, null);
        } else if (board.levelId === 'hell-1' && s.stage === 'batch') {
          const dispatches = links.filter((l) => l.ev === 'dispatch' && batchStarts.length === 1
            && l.batch === batchStarts[0].batch && `${l.slot}/${l.attempt}` === s.attempt);
          if (!perSetAttributable || s.K !== winnerK || dispatches.length !== 1) {
            r.unattributedBatch += 1;
            issue('batch-not-attributed', c.where, { K: s.K, winnerK, dispatches: dispatches.length }, 'winning K and one batch dispatch');
          } else if (expectedPerSet !== null) {
            r.perSetChecked += 1;
            if (expectedPerSet !== expectedTable(s.K)) r.perSetDifferentFromTable += 1;
            count(cell.priorDeltas, expectedPerSet - expectedTable(s.K));
            if (s.priorCount !== expectedPerSet) {
              r.perSetMismatches += 1;
              issue('per-set-prior-mismatch', c.where, s.priorCount, expectedPerSet);
            }
          } else {
            r.hellFallbackBatch += 1;
            r.tableChecked += 1;
            if (expectedTable(s.K) !== s.startCount) r.tableChangedFromInitial += 1;
            if (s.priorCount !== expectedTable(s.K)) {
              r.tableMismatches += 1;
              issue('fallback-table-prior-mismatch', c.where, s.priorCount, expectedTable(s.K));
            }
          }
        } else {
          r.tableChecked += 1;
          if (expectedTable(s.K) !== s.startCount) r.tableChangedFromInitial += 1;
          if (s.priorCount !== expectedTable(s.K)) {
            r.tableMismatches += 1;
            issue('table-prior-mismatch', c.where, s.priorCount, expectedTable(s.K));
          }
        }

        let phase = 'p1';
        let pending = null;
        let profiles = 0;
        let rescueStarts = 0;
        let rescueCompleted = 0;
        let tailStarts = 0;
        let tailCompleted = 0;
        const phases = new Set();
        for (const line of c.lines) {
          if (line.t === 'phase') {
            phase = line.phase;
            phases.add(phase);
            count(cell.phaseEntries, phase);
          } else if (line.t === 'begin') {
            if (active && pending !== null) issue('overlapping-primitive', c.where, pending, line.kind);
            pending = { phase, kind: line.kind };
            if (phase === 'rescue' && line.kind === 'rate') rescueStarts += 1;
            if (phase === 'rerate' && line.kind === 'rate') tailStarts += 1;
          } else if (line.t === 'p') {
            if (line.i !== profiles) issue('profile-order', c.where, line.i, profiles);
            profiles += 1;
            const p = line.tuple[0];
            count(cell.profilePhases, p);
            if (p === 'rescue') rescueCompleted += 1;
            if (p === 'rerate') tailCompleted += 1;
            if (active && ['rescue', 'rerate'].includes(p) && (pending?.kind !== 'rate' || pending.phase !== p)) {
              issue('rerate-primitive-attribution', c.where, pending, { phase: p, kind: 'rate' });
            }
            if (p === 'close' || p === 'below') phases.add(p);
            pending = null;
          } else if (line.t === 'count') {
            pending = null;
          }
        }
        if (phases.has('rescue')) r.rescueEnteredCalls += 1;
        if (rescueStarts > 0) r.rescueWorkingCalls += 1;
        if (phases.has('rerate')) r.tailEnteredCalls += 1;
        if (phases.has('close')) {
          r.closePhaseCalls += 1;
          issue('disabled-close-phase', c.where, 'close', 'disabled');
        }
        if (phases.has('below')) {
          r.c4PhaseCalls += 1;
          issue('disabled-c4-phase', c.where, 'below', 'disabled');
        }
        r.rescueStarts += rescueStarts;
        r.rescueCompleted += rescueCompleted;
        r.tailStarts += tailStarts;
        r.tailCompleted += tailCompleted;
        r.profiles += profiles;
        if (pending?.phase === 'rescue' && pending.kind === 'rate') r.rescueUnfinished += 1;
        if (pending?.phase === 'rerate' && pending.kind === 'rate') r.tailUnfinished += 1;
        if (active && rescueStarts + tailStarts > freeze.values.rerateMax) issue('rerate-allowance', c.where, rescueStarts + tailStarts, freeze.values.rerateMax);
        if (c.end !== null) {
          const end = c.end;
          if (end.profiles !== profiles) issue('profile-count', c.where, end.profiles, profiles);
          if (end.result === 'error') {
            r.rawCallErrors += 1;
            issue('call-error', c.where, end.result, 'non-error terminal result');
          }
          if (end.locate?.close) {
            r.closeCalls += 1;
            count(cell.closeSides, end.locate.close.side);
            issue('disabled-close-summary', c.where, end.locate.close, null);
          }
          if (end.locate?.c4) {
            r.c4Calls += 1;
            count(cell.c4Sides, end.locate.c4.side);
            issue('disabled-c4-summary', c.where, end.locate.c4, null);
          }
          const rescueEntries = end.locate?.rescue?.length ?? 0;
          if (rescueEntries > 0) r.rescueSummaryCalls += 1;
          if (end.locate?.noWindowProof === 'rescued-in') r.rescuedInCalls += 1;
          if (active && rescueEntries !== rescueCompleted) issue('rescue-summary-count', c.where, rescueEntries, rescueCompleted);
          r.endedRerateCounter += end.rerates ?? 0;
          const completedRerates = rescueCompleted + tailCompleted;
          const difference = (end.rerates ?? 0) - completedRerates;
          if (difference === 1 && end.locate?.budgetStop && ['rescue', 'rerate'].includes(phase)) {
            r.rerateBlockedBeforeBegin += 1;
          } else if (difference !== 0) {
            issue('rerate-counter', c.where, { counter: end.rerates, completedRerates, phase, budgetStop: end.locate?.budgetStop ?? null },
              'completed profiles, or one attempt stopped by the pre-primitive budget check');
          }
          if (active && end.rerates > freeze.values.rerateMax) issue('ended-rerate-allowance', c.where, end.rerates, freeze.values.rerateMax);
          if (s.stage === 'set') count(cell.setResults, end.locate?.result ?? end.result);
        }
      }
      add(cell, r);
      rowResults.push(r);
    }
    cell.findingCount = findings.length - firstFinding;
    cellResults.push(cell);
    console.log(`t16-reach: ${key}: ${cell.rows} rows, ${cell.calls} calls, rescue ${cell.rescueCompleted}, tail ${cell.tailCompleted}, findings ${cell.findingCount}`);
  }
}
requireThat(processed.size === groups.size, 'Missing declared group');
const order = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped', 'log-link'];
cellResults.sort((a, b) => order.indexOf(a.arm) - order.indexOf(b.arm) || a.cell.localeCompare(b.cell));
const armTotals = order.map((arm) => {
  const own = cellResults.filter((c) => c.arm === arm);
  const total = { arm, task: own[0].task, groups: own.length, ...empty(), profilePhases: {}, phaseEntries: {}, wObserved: {},
    findings: own.reduce((n, c) => n + c.findingCount, 0) };
  own.forEach((c) => add(total, c));
  for (const c of own) {
    for (const field of ['profilePhases', 'phaseEntries', 'wObserved']) {
      for (const [name, n] of Object.entries(c[field])) total[field][name] = (total[field][name] ?? 0) + n;
    }
  }
  return total;
});
requireThat(armTotals.reduce((n, a) => n + a.rows, 0) === 1500, 'Row total changed');
for (const p of [
  POLICY, 'tests/artifacts/ig-proto/frozen-source/core/engine/levels.js',
  'tests/artifacts/ig-proto/frozen-source/tools/bench/report.js',
  'tools/ig-proto/verdicts.mjs', 'tools/ig-proto/fit-read.mjs', 'tools/ig-proto/lib/ledger.mjs',
  'tools/ig-proto/variants/files/log/core/engine/ig-log.js', 'tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js',
  'tools/ig-proto/variants/v4.json', 'tools/ig-proto/variants/v4-ps.json', 'tools/ig-proto/variants/ps-levels.json',
  'tasks/improve-generating-stages-2-4/T16-stage4-report-and-phase0.md',
  `${D}/evidence/sa-astra/t16-reach.mjs`,
]) read(p);
const inputList = [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path));
const all = empty();
armTotals.forEach((a) => add(all, a));
requireThat(all.activeCalls === all.tableChecked + all.perSetChecked + all.unattributedBatch, 'Prior-check accounting differs from active calls');
const observations = [];
if (all.rescueStarts + all.tailStarts + all.endedRerateCounter + all.rescueEnteredCalls + all.tailEnteredCalls === 0) {
  observations.push('Rescue and tail canonical re-rating were configured but not exercised: neither phase was entered, and starts, completed profiles and terminal rerate counters are all zero. No rescue benefit or exercised-path correctness claim follows from these rows.');
}
const result = {
  format: 'ig-t16-reach-review', version: 1, base: '44c335a',
  command: 'node docs\\improve-generating-stages-2-4\\evidence\\sa-astra\\t16-reach.mjs --label frozen',
  scope: { tasks: ['V4-S4', 'V4-S4C'], arms: order, groups: groups.size, rows: 1500, uniqueness: 'any', deduceWork: DEDUCE.work },
  definitions: {
    closeAndC4: 'Truthy locate.close/locate.c4 fields count ended calls only; close/below phase markers also checked across terminated calls.',
    rescue: 'Canonical begin(kind=rate) in phase rescue = started; p tuple[0]=rescue = completed. Tail phase rerate is counted separately.',
    counter: 'end.rerates counts attempted rerates and can exceed completed profiles by one when P5 stops before begin; this is reported, not counted as completed work.',
    legacy: 'Master on fr-frozen and every log-link request use the legacy path. W=null means canonical, not missing W; priorCount=null is expected. They do not test v4 table/per-set priors.',
    prior: 'Table = clamp(round(share*K),1,K-2). Matching Hell 1 batch calibration overrides it with clamp(wc,1,K-2), traced through the winning set and dispatch.',
    limitation: 'Row runs do not persist made records/packs; this is request-to-worker transport, not stored-recipe/replay proof. Reach is not causal speed attribution.',
  },
  totals: all, observations, arms: armTotals, cells: cellResults, rows: rowResults, findings,
  inputs: inputList, inputIndexHash: sha(JSON.stringify(inputList)),
};
const fmtW = (/** @type {any} */ c) => c.expectedW === null ? 'canonical (`null`)' : `${c.expectedW / 1e6} M`;
const display = (/** @type {unknown} */ v) => JSON.stringify(v)?.replaceAll('|', '\\|') ?? '-';
const md = [
  '# T16 / N-V4-17: mechanism reach on the frozen bounded and uncapped arms',
  '',
  `SA-Astra; base \`44c335a\`. ${groups.size} arm/cell groups and 1,500 declared rows (S4 1,120 + S4C 380), all read from existing records.`,
  'No rating, generation, search, replay, tree build, git or measured command was run.',
  '',
  `**Findings: ${findings.length}.** The full input index is in \`t16-reach.json\` (${inputList.length} files; index hash ${result.inputIndexHash}).`,
  `${all.validRows} valid rows; ${all.activeRows} prototype rows with ${all.ledgerCompleteRows} complete work ledgers, and ${all.legacyRows} legacy-context rows.`,
  `${all.activeCalls} prototype starts checked: ${all.tableChecked} against the table prior and ${all.perSetChecked} against the matching per-set prior (${all.perSetDifferentFromTable} differing from the table).`,
  ...observations.map((s) => `\n**Reach observation:** ${s}`),
  '',
  '## Definitions and limits',
  '',
  '- `close/c4` counts terminal `locate.close`/`locate.c4` markers; incomplete calls have no terminal summary. The `close`/`below` phase markers are also checked in every journal.',
  '- `rescue` is the canonical re-rating inside locate rescue; `tail` is phase E (`rerate`). Started/completed counts come from primitive `begin` and `p` records, including completed profiles of later-terminated calls.',
  '- A started re-rating without a completed profile is reported as unfinished. `end.rerates` increments before P5 checks its budget; a blocked attempt before `begin` is listed separately and is not a completed re-rating.',
  '- All prototype starts are checked against the frozen W table, not against the later shipped-class selection: screen arms use 190 M on Nightmare areas 196-324 and 360+, and 760 M elsewhere; no-screen twins use 760 M.',
  '- Legacy context is separate: Master on `fr-frozen` and all `log-link` calls have `W=null` and `priorCount=null`, the canonical/no-prior logger sentinels. Missing v4 primitive/capability logging is not a legacy ledger failure.',
  "- The table prior uses each start's own K. Hell 1 batch starts use the winning set's matching calibration `wc` when available, otherwise the table. Winning call identity, raw rating and batch dispatch are checked. No batch after a legitimate set failure is not a transport mismatch.",
  "- Stored-recipe transport is not observed: request rows do not save `made` records or packs. This audit does not replace the controlled provenance/replay gates, and reach alone does not establish a mechanism's performance benefit.",
  '',
  '## Per-arm summary',
  '',
  '| Task | Arm | Groups / rows | v4 / legacy calls | Ended / terminated / unclosed | close / c4 | Rescue starts / completed | Tail starts / completed | Unfinished rescue / tail | Budget-blocked rerate attempts | W / table / per-set mismatches | Unattributed Hell 1 batch |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...armTotals.map((a) => `| ${a.task} | ${a.arm} | ${a.groups} / ${a.rows} | ${a.activeCalls} / ${a.legacyCalls} | ${a.ended} / ${a.terminated} / ${a.unclosed} | ${a.closeCalls} / ${a.c4Calls} | ${a.rescueStarts} / ${a.rescueCompleted} | ${a.tailStarts} / ${a.tailCompleted} | ${a.rescueUnfinished} / ${a.tailUnfinished} | ${a.rerateBlockedBeforeBegin} | ${a.wMismatches} / ${a.tableMismatches} / ${a.perSetMismatches} | ${a.unattributedBatch} |`),
  '',
  '## Observed rating-profile phases',
  '',
  'These are actual `p` records, not inferred from enabled options. Histograms include profiles of later-terminated calls.',
  '',
  '| Arm | Completed profiles | Profile phase counts | Phase-entry counts | Recorded W counts |',
  '|---|---:|---|---|---|',
  ...armTotals.map((a) => `| ${a.arm} | ${a.profiles} | ${display(a.profilePhases)} | ${display(a.phaseEntries)} | ${display(a.wObserved)} |`),
  '',
  '## Per-arm / cell reach and W',
  '',
  '`v4` rows test the frozen mechanisms. `legacy` rows are context and use canonical null sentinels. All counts include set, batch and any completion calls.',
  '',
  '| Task | Arm | Cell | Path | Rows | Calls (ended / terminated) | close / c4 | Rescue starts / completed | Tail starts / completed | Expected W | W mismatches | Findings |',
  '|---|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|',
  ...cellResults.map((c) => `| ${c.task} | ${c.arm} | ${c.cell} | ${c.mode} | ${c.rows} | ${c.calls} (${c.ended} / ${c.terminated}) | ${c.closeCalls} / ${c.c4Calls} | ${c.rescueStarts} / ${c.rescueCompleted} | ${c.tailStarts} / ${c.tailCompleted} | ${fmtW(c)} | ${c.wMismatches} | ${c.findingCount} |`),
  '',
  '## Table-prior reach (prototype cells)',
  '',
  "`Different from initial` compares the checked table value with the logger's legacy `startCount`. Per-set overrides are separate, even when they happen to equal the table value.",
  '',
  '| Arm | Cell | Table starts checked | Different from initial | Table mismatches | Hell 1 per-set starts checked | Different from table | Per-set mismatches |',
  '|---|---|---:|---:|---:|---:|---:|---:|',
  ...cellResults.filter((c) => c.mode === 'v4').map((c) => `| ${c.arm} | ${c.cell} | ${c.tableChecked} | ${c.tableChangedFromInitial} | ${c.tableMismatches} | ${c.perSetChecked} | ${c.perSetDifferentFromTable} | ${c.perSetMismatches} |`),
  '',
  '## Hell 1 calibration-to-batch transport',
  '',
  '| Arm | Cell | Rows with per-set calibration | Rows differing from table | Set calls | Batch calls | Per-set starts | Differing from table | Table fallback starts | No-batch rows | Unattributed | Prior delta histogram |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
  ...cellResults.filter((c) => c.mode === 'v4' && c.level === 'hell-1').map((c) => `| ${c.arm} | ${c.cell} | ${c.perSetRows} | ${c.perSetDistinctRows} | ${c.setCalls} | ${c.batchCalls} | ${c.perSetChecked} | ${c.perSetDifferentFromTable} | ${c.hellFallbackBatch} | ${c.hellNoBatchRows} | ${c.unattributedBatch} | ${display(c.priorDeltas)} |`),
  '',
  '## Findings',
  '',
  ...(findings.length === 0 ? ['None. No W/prior mismatch, unattributed batch, disabled-mechanism reach or invalid evidence was found.']
    : findings.map((f) => `- **${f.type}**: ${f.task}/${f.arm}/${f.rowKey ?? f.cell} ${f.call ?? ''}; got ${display(f.got)}, expected ${display(f.want)}; ${f.evidence ? `${f.evidence.path}:${f.evidence.line}` : 'see the row inputs'}.`)),
  '',
  '## Reproduction and source contracts',
  '',
  '```powershell',
  'node docs\\improve-generating-stages-2-4\\evidence\\sa-astra\\t16-reach.mjs --label frozen',
  'npm run check',
  '```',
  '',
  '- `docs/improve-generating/evidence/frozen/V4-S3/freeze.json`: class boundaries, W values, table id, per-set levels and variant identities.',
  '- `tools/ig-proto/variants/files/log/core/engine/ig-log.js:61-89,91-102,181-198,228-235`: start/phase/profile/end journal schema.',
  '- `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js:199-205,473-479,898-925,1099-1107,1129-1140,1289-1296`: table prior, primitive budget check, re-rating counter, close/rescue/tail paths.',
  '- `tools/ig-proto/variants/v4-ps.json` (`ps-7`) and `tools/ig-proto/variants/ps-levels.json`: matching-calibration rule and Hell-1-only transport.',
  '- `tools/ig-proto/fit-read.mjs` and `tools/ig-proto/verdicts.mjs`: declared/raw identity checks and complete interval ledgers for prototype rows.',
  '',
].join('\n');
const write = (/** @type {string} */ name, /** @type {string} */ text) =>
  writeFileSync(relative(process.cwd(), join(HERE, name)), text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n*$/, '\n').replace(/\n/g, '\r\n'), 'utf8');
write('t16-reach.json', JSON.stringify(result, null, 2));
write('t16-reach.md', md);
console.log(`t16-reach: DONE ${groups.size} groups, 1500 rows, ${inputList.length} hashed inputs, ${findings.length} findings`);
console.log(JSON.stringify({
  arms: armTotals.map((a) => ({ arm: a.arm, rows: a.rows, calls: a.calls, activeCalls: a.activeCalls, legacyCalls: a.legacyCalls,
    close: a.closeCalls, c4: a.c4Calls, rescue: a.rescueCompleted, tail: a.tailCompleted,
    Wmismatch: a.wMismatches, priorMismatch: a.tableMismatches + a.perSetMismatches, perSetStarts: a.perSetChecked })),
  observations, inputCount: inputList.length, findings: findings.length,
}, null, 2));
