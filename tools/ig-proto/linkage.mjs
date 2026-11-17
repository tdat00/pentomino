// @ts-check
// Batch linkage report (task pack v4, V4-T06): reads the `<row>.link.jsonl` journals that the variant `link` writes
// (dispatch, await, completion, consumption and discard of every candidate task of a batch), the arms' published
// rows and the worker journals, and writes `evidence/<label>/<task>/linkage.json|md` with the verdict
// `linkage: pass | incomplete | fail`. Unlocked: it measures nothing.
//   node tools\ig-proto\linkage.mjs report --task <T> --arms <a,b> --pool <n> --label frozen --source-label <SL>
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { artifactDir, evidenceDir, parseArgs, rel } from './lib/paths.mjs';
import { banner, buildMeta, writeJson, writeText } from './lib/records.mjs';

/** The arm of T04e whose result digests `log-link` must equal on the same seeds (T06a-T01). */
const REFERENCE = Object.freeze({ task: 'V4-T04', arm: 'log' });

/** @param {unknown} x @returns {x is number} */
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
/** @param {unknown} x @returns {x is number} A finite number from 0. */
const fromZero = (x) => isNum(x) && x >= 0;
/** @param {any} line @returns {string} The task key of a line, `<slot>/<attempt>`. */
const taskKey = (line) => `${line.slot}/${line.attempt}`;
/** @param {number} x @returns {number} Rounded to microseconds. */
const round3 = (x) => Math.round(x * 1000) / 1000;

/**
 * @typedef {object} BatchSummary
 * @property {number | undefined} batch
 * @property {number} dispatched
 * @property {number} completed
 * @property {{ accepted: number, rejected: number, fail: Record<string, number> }} consumed
 * @property {{ done: number, inflight: number }} discarded
 * @property {number} awaits
 * @property {number} awaitMs
 * @property {number} idleWorkerMs
 * @property {string[]} problems
 */

/**
 * @param {number | undefined} batch
 * @param {any[]} lines The link lines of one batch, in file order.
 * @param {number} pool
 * @returns {BatchSummary}
 */
function batchSummary(batch, lines, pool) {
  /** @type {BatchSummary} */
  const out = {
    batch, dispatched: 0, completed: 0, consumed: { accepted: 0, rejected: 0, fail: {} }, discarded: { done: 0, inflight: 0 },
    awaits: 0, awaitMs: 0, idleWorkerMs: 0, problems: [],
  };
  const dispatched = new Set();
  const completed = new Set();
  const discarded = new Set();
  let ended = false;
  for (const line of lines) {
    if (!isNum(line.at)) {
      out.problems.push(`a ${line.ev} line has no valid time`);
    }
    const key = taskKey(line);
    if (line.ev === 'dispatch') {
      out.dispatched += 1;
      dispatched.add(key);
    } else if (line.ev === 'complete') {
      out.completed += 1;
      completed.add(key);
    } else if (line.ev === 'consume') {
      if (!dispatched.has(key)) {
        out.problems.push(`consumed task ${key} was never dispatched`);
      }
      if (!completed.has(key)) {
        out.problems.push(`consumed task ${key} never completed`);
      }
      if (line.result === 'accepted') {
        out.consumed.accepted += 1;
      } else if (line.result === 'rejected') {
        out.consumed.rejected += 1;
      } else {
        const reason = String(line.result);
        out.consumed.fail[reason] = (out.consumed.fail[reason] ?? 0) + 1;
      }
    } else if (line.ev === 'discard') {
      out.discarded[line.done === true ? 'done' : 'inflight'] += 1;
      discarded.add(key);
    } else if (line.ev === 'await') {
      out.awaits += 1;
    } else if (line.ev === 'end') {
      ended = true;
    }
  }
  for (const key of dispatched) {
    if (!completed.has(key) && !discarded.has(key)) {
      out.problems.push(`task ${key} was dispatched and neither completed nor discarded`);
    }
  }
  if (!ended) {
    out.problems.push('the batch has no end line');
  }

  // An await period runs from its `await` line to the first later `consume` of the same task or the batch's `end`
  // line, and `inflight` steps at every `dispatch` and `complete` line inside it (a later `complete` is ignored).
  lines.forEach((line, a) => {
    if (line.ev !== 'await' || !isNum(line.at)) {
      return;
    }
    let end = lines.length - 1;
    for (let i = a + 1; i < lines.length; i += 1) {
      if (lines[i].ev === 'end' || (lines[i].ev === 'consume' && taskKey(lines[i]) === taskKey(line))) {
        end = i;
        break;
      }
    }
    let level = 0;
    for (let i = a - 1; i >= 0; i -= 1) {
      if ((lines[i].ev === 'dispatch' || lines[i].ev === 'complete') && isNum(lines[i].inflight)) {
        level = lines[i].inflight;
        break;
      }
    }
    let from = line.at;
    for (let i = a + 1; i < end; i += 1) {
      const step = lines[i];
      if ((step.ev === 'dispatch' || step.ev === 'complete') && isNum(step.at) && isNum(step.inflight)) {
        out.idleWorkerMs += Math.max(0, pool - level) * (step.at - from);
        from = step.at;
        level = step.inflight;
      }
    }
    const until = isNum(lines[end].at) ? lines[end].at : from;
    out.idleWorkerMs += Math.max(0, pool - level) * (until - from);
    out.awaitMs += until - line.at;
  });
  out.awaitMs = round3(out.awaitMs);
  out.idleWorkerMs = round3(out.idleWorkerMs);
  return out;
}

/**
 * The linkage of a row's journal: per batch, how many candidate tasks were dispatched, completed, consumed (and with
 * what result) and discarded, the await periods of the fold and the worker time idle behind them. The fields of the
 * result are the totals over the batches of `lines` (a run has one batch); `batches` holds each batch apart.
 * @param {any[]} lines The link lines (`t: 'link'`) of one row, in file order; other lines are ignored.
 * @param {number} pool The width of the worker pool.
 * @returns {Omit<BatchSummary, 'batch'> & { batches: BatchSummary[] }}
 */
export function linkSummary(lines, pool) {
  /** @type {Map<number | undefined, any[]>} */
  const groups = new Map();
  for (const line of lines) {
    if (line?.t !== 'link') {
      continue;
    }
    const group = groups.get(line.batch) ?? [];
    group.push(line);
    groups.set(line.batch, group);
  }
  const batches = [...groups].map(([batch, group]) => batchSummary(batch, group, pool));
  /** @type {Omit<BatchSummary, 'batch'> & { batches: BatchSummary[] }} */
  const total = {
    dispatched: 0, completed: 0, consumed: { accepted: 0, rejected: 0, fail: {} }, discarded: { done: 0, inflight: 0 },
    awaits: 0, awaitMs: 0, idleWorkerMs: 0, problems: [], batches,
  };
  for (const b of batches) {
    total.dispatched += b.dispatched;
    total.completed += b.completed;
    total.consumed.accepted += b.consumed.accepted;
    total.consumed.rejected += b.consumed.rejected;
    for (const [reason, n] of Object.entries(b.consumed.fail)) {
      total.consumed.fail[reason] = (total.consumed.fail[reason] ?? 0) + n;
    }
    total.discarded.done += b.discarded.done;
    total.discarded.inflight += b.discarded.inflight;
    total.awaits += b.awaits;
    total.awaitMs += b.awaitMs;
    total.idleWorkerMs += b.idleWorkerMs;
    total.problems.push(...b.problems.map((p) => `batch ${b.batch}: ${p}`));
  }
  total.awaitMs = round3(total.awaitMs);
  total.idleWorkerMs = round3(total.idleWorkerMs);
  return total;
}

/**
 * Whether a run record's set and accept timeline is valid, judged by outcome (RV2-17, RV3-07).
 * @param {any} run A run record of the bench runner.
 * @param {any[]} [linkLines] The link lines of the row's journal.
 * @returns {string | null} `null` when valid, `'incomplete'` when a timeline field is missing or `responseMs` is not a
 *   finite number from 0 (never a fabricated zero), else the reason it is not.
 */
export function timelineProblem(run, linkLines = []) {
  if (run?.igSetMs === undefined || run.igAcceptedMs === undefined || !fromZero(run.responseMs)) {
    return 'incomplete';
  }
  const { igSetMs, igAcceptedMs, acceptedCount, responseMs } = run;
  if (!Array.isArray(igAcceptedMs)) {
    return 'igAcceptedMs is not a list';
  }
  if (!Number.isInteger(acceptedCount) || acceptedCount < 0) {
    return 'acceptedCount is not a count';
  }
  if (igSetMs === null) {
    if (igAcceptedMs.length > 0 || acceptedCount !== 0) {
      return 'no set, yet the run has accepted puzzles';
    }
    return linkLines.some((l) => l?.t === 'link' && l.ev === 'start') ? 'no set, yet a batch ran' : null;
  }
  if (!fromZero(igSetMs)) {
    return 'igSetMs is not a finite number from 0';
  }
  if (igAcceptedMs.length === 0 && acceptedCount === 0) {
    return null;
  }
  if (igAcceptedMs.length !== acceptedCount) {
    return `${igAcceptedMs.length} accept times for ${acceptedCount} accepted puzzles`;
  }
  if (!igAcceptedMs.every(fromZero)) {
    return 'an accept time is not a finite number from 0';
  }
  if (igSetMs > igAcceptedMs[0]) {
    return `the first puzzle was accepted at ${igAcceptedMs[0]} ms, before the set at ${igSetMs} ms`;
  }
  for (let i = 1; i < igAcceptedMs.length; i += 1) {
    if (igAcceptedMs[i] < igAcceptedMs[i - 1]) {
      return `accept time ${i} is before accept time ${i - 1}`;
    }
  }
  if (igAcceptedMs[igAcceptedMs.length - 1] > responseMs) {
    return `the last puzzle was accepted at ${igAcceptedMs[igAcceptedMs.length - 1]} ms, after the response at ${responseMs} ms`;
  }
  return null;
}

/**
 * @param {string} file
 * @returns {{ lines: any[], problems: string[] }} The JSON lines of a file (none when it is absent).
 */
function readJsonl(file) {
  /** @type {any[]} */
  const lines = [];
  /** @type {string[]} */
  const problems = [];
  if (!existsSync(file)) {
    return { lines, problems };
  }
  readFileSync(file, 'utf8').split(/\r?\n/).forEach((text, i) => {
    if (text.trim() === '') {
      return;
    }
    try {
      lines.push(JSON.parse(text));
    } catch {
      problems.push(`${rel(file)}: line ${i + 1} is not JSON`);
    }
  });
  return { lines, problems };
}

/**
 * @param {string} label
 * @param {string} task
 * @param {string} arm
 * @returns {{ variant: string | null, shards: { shard: string, rows: any[] }[] }} The published rows of the arm.
 */
function publishedRows(label, task, arm) {
  const dir = evidenceDir(label, task, arm);
  /** @type {{ shard: string, rows: any[] }[]} */
  const shards = [];
  let variant = null;
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.runs.json')).sort()) {
      const record = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      shards.push({ shard: record.shard ?? name.slice(0, -'.runs.json'.length), rows: record.rows });
      variant = Object.keys(record.meta.trees)[0] ?? variant;
    }
  }
  return { variant, shards };
}

/** @param {string} text @returns {string} The text as a regular expression source. */
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @param {number | null | undefined} ms @returns {string} */
const sec = (ms) => (ms === null || ms === undefined ? '-' : (ms / 1000).toFixed(2));

/** @param {string[]} argv @returns {Promise<number>} */
async function reportCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'arms', 'pool', 'label', 'source-label'] });
  for (const name of ['task', 'arms', 'pool', 'label']) {
    if (args[name] === undefined) {
      throw new Error(`--${name} is required`);
    }
  }
  const { task, label } = args;
  const pool = Number(args.pool);
  if (!Number.isInteger(pool) || pool < 1) {
    throw new Error(`--pool must be a positive integer, got ${args.pool}`);
  }
  const armNames = args.arms.split(',');
  const reference = publishedRows(label, REFERENCE.task, REFERENCE.arm);
  const referenceDigest = new Map(reference.shards.flatMap((s) => s.rows).map((r) => [r.seed, r.run?.details?.resultDigest ?? null]));

  /** @type {Record<string, { variant: string | null, rows: number }>} */
  const armInfo = {};
  /** @type {any[]} */
  const rows = [];
  /** @type {any[]} */
  const seeds = [];
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const incomplete = [];
  for (const arm of armNames) {
    const published = publishedRows(label, task, arm);
    armInfo[arm] = { variant: published.variant, rows: published.shards.reduce((n, s) => n + s.rows.length, 0) };
    if (armInfo[arm].rows === 0) {
      incomplete.push(`${arm}: no published rows`);
    }
    for (const { shard, rows: shardRows } of published.shards) {
      const logs = join(artifactDir(label, task, arm, shard), 'logs');
      const names = existsSync(logs) ? readdirSync(logs).sort() : [];
      const known = new Set(shardRows.map((/** @type {any} */ r) => `${r.rowKey}.link.jsonl`));
      for (const name of names.filter((n) => n.endsWith('.link.jsonl') && !known.has(n))) {
        failures.push(`${arm}/${shard}: the link file ${name} has no published row`);
      }
      for (const item of shardRows) {
        const run = item.run;
        const id = `${arm}/${item.rowKey}`;
        const link = readJsonl(join(logs, `${item.rowKey}.link.jsonl`));
        const linkLines = link.lines;
        const summary = linkSummary(linkLines, pool);
        /** @type {string[]} */
        const problems = [...link.problems, ...summary.problems];
        const timeline = timelineProblem(run, linkLines);
        if (timeline === 'incomplete') {
          incomplete.push(id);
        } else if (timeline !== null) {
          problems.push(`timeline: ${timeline}`);
        }
        if (run?.igSetMs !== undefined && run.igSetMs !== null && !linkLines.some((l) => l?.t === 'link' && l.ev === 'start')) {
          problems.push('the set completed and no batch start line was journaled');
        }
        const dispatched = new Set(linkLines.filter((l) => l?.t === 'link' && l.ev === 'dispatch').map(taskKey));
        const worker = new RegExp(`^${escapeRegExp(item.rowKey)}\\.\\d+\\.\\d+\\.jsonl$`);
        /** @type {string[]} */
        const unmatched = [];
        let workerStarts = 0;
        for (const name of names.filter((n) => worker.test(n))) {
          const journal = readJsonl(join(logs, name));
          problems.push(...journal.problems);
          for (const line of journal.lines.filter((l) => l?.t === 'start' && l.stage === 'batch')) {
            workerStarts += 1;
            if (typeof line.attempt !== 'string' || !dispatched.has(line.attempt)) {
              unmatched.push(`${name}: ${String(line.call)} attempt ${JSON.stringify(line.attempt)}`);
            }
          }
        }
        if (unmatched.length > 0) {
          problems.push(`${unmatched.length} batch call(s) of the worker journals name an attempt that was not dispatched`);
        }
        rows.push({
          arm, row: item.rowKey, seed: item.seed, summary, igSetMs: run?.igSetMs, igAcceptedMs: run?.igAcceptedMs,
          acceptedCount: run?.acceptedCount, responseMs: run?.responseMs, timeline, attemptsMatched: unmatched.length === 0,
          workerStarts, unmatched, problems,
        });
        for (const p of problems) {
          failures.push(`${id}: ${p}`);
        }
        if (armInfo[arm].variant === 'log-link') {
          const digest = run?.details?.resultDigest ?? null;
          const expected = referenceDigest.get(item.seed);
          const status = expected === undefined || expected === null || digest === null ? 'missing' : expected === digest ? 'equal' : 'differs';
          seeds.push({ arm, seed: item.seed, digest, reference: expected ?? null, status });
          if (status !== 'equal') {
            failures.push(`${id}: the result digest ${status === 'differs' ? 'differs from' : 'cannot be compared with'} ${REFERENCE.task}'s ${REFERENCE.arm} arm`);
          }
        }
      }
    }
  }

  const verdict = failures.length === 0 && incomplete.length === 0 ? 'linkage: pass'
    : incomplete.length > 0 ? `linkage: incomplete ${incomplete.join(', ')}`
      : `linkage: fail ${failures.join('; ')}`;
  const meta = await buildMeta({
    task, label, kind: 'linkage', trees: [...new Set(Object.values(armInfo).map((a) => a.variant).filter((v) => v !== null))],
    sourceLabel: args['source-label'],
  });
  const lines = [`# ${task} batch linkage`, '', banner(meta), '', `**${verdict}**`, '', `Pool width ${pool}. Times are in ms; \`idleWorkerMs\` sums \`(pool - inflight) x dt\` over the await periods.`, ''];
  lines.push('## Batches', '', '| Arm | Row | Dispatched | Completed | Accepted | Rejected | Failed | Discarded (done / in flight) | Awaits | Await ms | Idle worker ms | Set s | Accepted puzzles | Attempts matched | Timeline |',
    '|---|---|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---|---|');
  for (const r of rows) {
    const fail = Object.entries(r.summary.consumed.fail).map(([reason, n]) => `${reason} ${n}`).join(', ') || '-';
    lines.push(`| ${r.arm} | ${r.row} | ${r.summary.dispatched} | ${r.summary.completed} | ${r.summary.consumed.accepted} | ${r.summary.consumed.rejected} | ${fail} | ${r.summary.discarded.done} / ${r.summary.discarded.inflight} | ${r.summary.awaits} | ${r.summary.awaitMs} | ${r.summary.idleWorkerMs} | ${sec(r.igSetMs)} | ${r.acceptedCount} | ${r.attemptsMatched ? 'yes' : 'no'} | ${r.timeline ?? 'valid'} |`);
  }
  if (seeds.length > 0) {
    lines.push('', `## Result identity against ${REFERENCE.task}'s ${REFERENCE.arm} arm (T06a-T01)`, '', '| Arm | Seed | resultDigest | Reference resultDigest | |', '|---|---|---|---|---|');
    for (const s of seeds) {
      lines.push(`| ${s.arm} | ${s.seed} | ${s.digest ?? '-'} | ${s.reference ?? '-'} | ${s.status} |`);
    }
  }
  if (failures.length + incomplete.length > 0) {
    lines.push('', '## Findings', '', ...incomplete.map((f) => `- incomplete: ${f}`), ...failures.map((f) => `- ${f}`));
  }
  writeJson(evidenceDir(label, task, 'linkage.json'), { meta, pool, arms: armInfo, rows, seeds, failures, incomplete, verdict });
  writeText(evidenceDir(label, task, 'linkage.md'), lines.join('\n'));
  process.stdout.write(`${verdict}\n`);
  return failures.length === 0 && incomplete.length === 0 ? 0 : incomplete.length > 0 ? 2 : 1;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'report') {
    return reportCommand(rest);
  }
  throw new Error('usage: linkage.mjs report --task <T> --arms <a,b> --pool <n> --label frozen --source-label <SL>');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`linkage: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
