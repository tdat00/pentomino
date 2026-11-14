// @ts-check
// Verification of accepted prototype ratings (IGP-01 §3): every journal `end` line of an arm with an `accepted` block
// is rated canonically on the `base` tree (four lanes, `rate` jobs admitted by the check-list §7 bound) and must
// deep-equal the logged rating. A difference is a stop (a certificate failure). Resumable: a checkpoint per arm.
//   node tools\ig-proto\verify.mjs --task <T> --arm <A>[,<A2>...] --label <L> --source-label <SL> --horizon-s <H>
//        [--step <name>]
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { createLanes } from './lib/lanes.mjs';
import { artifactDir, elapsedS, evidenceDir, parseArgs } from './lib/paths.mjs';
import { banner, buildMeta, harnessInfo, writeJson, writeText } from './lib/records.mjs';
import { ensureTree } from './lib/tree.mjs';

const BATCH = 24;

/**
 * @param {string} label
 * @param {string} task
 * @param {string} arm
 * @returns {{ call: string, caseId: string, row: string, stage: string, level: string | null, accepted: any }[]}
 *   Every ok call with an accepted block, in shard, file and line order.
 */
export function acceptedJobs(label, task, arm) {
  const armDir = artifactDir(label, task, arm);
  /** @type {any[]} */
  const out = [];
  if (!existsSync(armDir)) {
    return out;
  }
  for (const shard of readdirSync(armDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
    const logs = join(armDir, shard, 'logs');
    if (!existsSync(logs)) {
      continue;
    }
    for (const name of readdirSync(logs).filter((n) => !n.endsWith('.row.jsonl')).sort()) {
      /** @type {Map<string, any>} */
      const starts = new Map();
      for (const text of readFileSync(join(logs, name), 'utf8').split(/\r?\n/)) {
        if (text.trim() === '') {
          continue;
        }
        const line = JSON.parse(text);
        if (line.t === 'start') {
          starts.set(line.call, line);
        } else if (line.t === 'end' && line.accepted !== null && line.accepted !== undefined) {
          const start = starts.get(line.call);
          const row = String(line.call).split(':')[0];
          out.push({ call: line.call, caseId: row.split('~')[0], row, stage: start?.stage ?? 'other', level: start?.level ?? null, accepted: line.accepted });
        }
      }
    }
  }
  return out;
}

/**
 * @param {any} prototype
 * @param {any} canonical
 * @returns {string[]} Names of the differing fields (metrics fields as `metrics.<name>`).
 */
function differences(prototype, canonical) {
  /** @type {string[]} */
  const out = [];
  for (const key of new Set([...Object.keys(prototype ?? {}), ...Object.keys(canonical ?? {})])) {
    if (key === 'metrics') {
      for (const m of new Set([...Object.keys(prototype?.metrics ?? {}), ...Object.keys(canonical?.metrics ?? {})])) {
        if (!isDeepStrictEqual(prototype?.metrics?.[m], canonical?.metrics?.[m])) {
          out.push(`metrics.${m}`);
        }
      }
    } else if (!isDeepStrictEqual(prototype?.[key], canonical?.[key])) {
      out.push(key);
    }
  }
  return out;
}

/** @param {string} file @returns {any[]} */
function readLines(file) {
  return existsSync(file)
    ? readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l))
    : [];
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'arm', 'label', 'source-label', 'horizon-s', 'step'] });
  for (const name of ['task', 'arm', 'label']) {
    if (args[name] === undefined) {
      throw new Error(`--${name} is required`);
    }
  }
  const { task, label } = args;
  const arms = args.arm.split(',');
  const horizonS = Number(args['horizon-s'] ?? 285);
  const base = await ensureTree('base');
  const harness = harnessInfo();
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();
  /** @type {Record<string, { jobs: any[], results: Map<string, any>, dir: string }>} */
  const state = {};
  for (const arm of arms) {
    const dir = artifactDir(label, task, `verify-${arm}`);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'checkpoint.jsonl');
    const lines = readLines(file);
    if (lines.length === 0) {
      appendFileSync(file, `${JSON.stringify({ t: 'header', task, arm, treeId: base.treeId, harnessHash: harness.harnessHash })}\n`);
    } else if (lines[0].treeId !== base.treeId || lines[0].harnessHash !== harness.harnessHash) {
      throw new Error(`the checkpoint of ${arm} was started on another tree or harness: nothing was verified`);
    }
    const jobs = acceptedJobs(label, task, arm);
    if (jobs.length === 0) {
      throw new Error(`arm ${arm} of ${task} has no accepted rating to verify`);
    }
    state[arm] = { jobs, dir, results: new Map(lines.filter((l) => l.t === 'result').map((l) => [l.call, l])) };
  }

  const pending = arms.flatMap((arm) => state[arm].jobs.filter((j) => !state[arm].results.has(j.call)).map((j) => ({ arm, job: j })));
  let verified = 0;
  /** @type {string | null} */
  let defect = null;
  if (pending.length > 0) {
    const lanes = await createLanes({ variant: 'base', size: 4, horizonS });
    try {
      for (let at = 0; at < pending.length && defect === null; at += BATCH) {
        const batch = pending.slice(at, at + BATCH);
        const out = await lanes.runAll(batch.map(({ job }) => ({
          kind: 'rate', boardRows: job.accepted.boardRows, pieces: job.accepted.pieces, clues: job.accepted.clues,
        })));
        for (const [i, { arm, job }] of batch.entries()) {
          const record = out.results[i];
          if (record === undefined) {
            continue;
          }
          const canonical = record.rating === undefined ? null : JSON.parse(JSON.stringify(record.rating));
          const logged = JSON.parse(JSON.stringify(job.accepted.rating));
          const fields = canonical === null ? [`no canonical rating (${record.outcome})`] : differences(logged, canonical);
          const result = {
            t: 'result', call: job.call, caseId: job.caseId, row: job.row, stage: job.stage, equal: fields.length === 0, fields,
            ...(fields.length === 0 ? {} : { prototype: logged, canonical: canonical ?? record }),
          };
          appendFileSync(join(state[arm].dir, 'checkpoint.jsonl'), `${JSON.stringify(result)}\n`);
          state[arm].results.set(job.call, result);
          verified += 1;
        }
        if (out.defect !== null) {
          defect = out.defect.reason;
        }
        if (!out.done) {
          break;
        }
      }
    } finally {
      await lanes.close();
    }
  }

  let done = true;
  let mismatches = 0;
  for (const arm of arms) {
    const { jobs, results } = state[arm];
    const complete = jobs.every((j) => results.has(j.call));
    done &&= complete;
    const list = [...results.values()];
    const bad = list.filter((r) => !r.equal);
    mismatches += bad.length;
    if (complete || bad.length > 0) {
      /** @type {Record<string, { checked: number, equal: number, stages: Record<string, { checked: number, equal: number }> }>} */
      const cells = {};
      for (const r of list) {
        const cell = (cells[r.caseId] ??= { checked: 0, equal: 0, stages: {} });
        const stage = (cell.stages[r.stage] ??= { checked: 0, equal: 0 });
        cell.checked += 1;
        stage.checked += 1;
        if (r.equal) {
          cell.equal += 1;
          stage.equal += 1;
        }
      }
      const meta = await buildMeta({ task, label, kind: 'verify', trees: ['base'], sourceLabel: args['source-label'] });
      const summary = { arm, expected: jobs.length, checked: list.length, equal: list.length - bad.length, mismatches: bad.length, complete };
      writeJson(evidenceDir(label, task, `verify-${arm}.json`), {
        meta, base: { treeId: base.treeId, copyDigest: base.copyDigest }, summary, cells, mismatches: bad,
      });
      const lines = [`# ${task} verification of the accepted ratings of arm ${arm}`, '', banner(meta), '',
        bad.length === 0 && complete
          ? `IGP-01-T02 holds: all ${list.length} accepted prototype ratings equal their canonical rating on the base tree (0 mismatches).`
          : `IGP-01-T02 FAILS or is incomplete: ${list.length} of ${jobs.length} checked, ${bad.length} mismatch(es).`,
        '', '| Cell | Stage | Checked | Equal |', '|---|---|---:|---:|'];
      for (const [caseId, cell] of Object.entries(cells).sort(([a], [b]) => (a < b ? -1 : 1))) {
        for (const [stage, s] of Object.entries(cell.stages).sort(([a], [b]) => (a < b ? -1 : 1))) {
          lines.push(`| ${caseId} | ${stage} | ${s.checked} | ${s.equal} |`);
        }
        lines.push(`| ${caseId} | all | ${cell.checked} | ${cell.equal} |`);
      }
      if (bad.length > 0) {
        lines.push('', '## Mismatches', '', ...bad.map((r) => `- ${r.call} (${r.caseId}, ${r.stage}): ${r.fields.join(', ')}`));
      }
      writeText(evidenceDir(label, task, `verify-${arm}.md`), lines.join('\n'));
    }
    process.stdout.write(`verify: arm ${arm}: ${results.size} of ${jobs.length} checked, ${bad.length} mismatch(es)\n`);
  }
  const seconds = Math.round(elapsedS() * 1000) / 1000;
  const stepName = args.step ?? (arms.length === 1 ? arms[0] : arms.join('+'));
  const stateDir = artifactDir(label, task, `verify-${stepName}`);
  mkdirSync(stateDir, { recursive: true });
  writeJson(join(stateDir, 'state.json'), {
    format: 'ig-proto-state', version: 1, task, step: `verify-${stepName}`, label, done: done && mismatches === 0 && defect === null,
    arms, base: { treeId: base.treeId }, harnessHash: harness.harnessHash,
    checked: Object.fromEntries(arms.map((a) => [a, state[a].results.size])), expected: Object.fromEntries(arms.map((a) => [a, state[a].jobs.length])),
    mismatches, defect,
    lastInvocation: { start: startedAt, end: new Date().toISOString(), seconds, horizonS, progress: { ratings: verified } },
  });
  if (mismatches > 0 || defect !== null) {
    process.stderr.write(`verify: STOP: ${mismatches} mismatch(es)${defect === null ? '' : `; defect: ${defect}`}\n`);
    return 1;
  }
  process.stdout.write(`verify: ${verified} rating(s) verified in this invocation (${seconds} s)${done ? '; done' : ''}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`verify: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
  setTimeout(() => process.exit(process.exitCode ?? 0), 10000).unref();
}
