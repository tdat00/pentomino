// @ts-check
// P5's budget inputs (IGP-03 §4, IG-P-Q10): per arm, cell and stage, how much work the calls of the journals spent
// before their result, read against budgets of 1 to 12 G work units.
//   node tools\ig-proto\budgets.mjs --arms IGP-01/after,IGP-03/w095,... --label <L> [--task <T>] [--source-label <SL>]
//        [--out-dir <scratch folder>]
// Reads the published journals of the arms (arm.mjs publish). The figures are inputs for P5's per-level budgets, not
// fitted budgets: nothing is enforced in the prototype (D-IG9) and no search changes.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { median } from '../bench/report.js';
import { loadArm } from './compare.mjs';
import { evidenceDir, parseArgs } from './lib/paths.mjs';
import { banner, buildMeta, writeJson, writeText } from './lib/records.mjs';

/** Budgets in work units (1 G = 1e9 units). */
export const BUDGETS = Object.freeze([1e9, 2e9, 4e9, 6e9, 8e9, 12e9]);
const STAGES = Object.freeze(['set', 'batch', 'completion', 'other']);

/** @param {number[]} v */
const sum = (v) => v.reduce((s, x) => s + x, 0);
/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const fix = (x, d = 1) => (x === null || x === undefined ? '-' : x.toFixed(d));
/** @param {number | null} x @returns {string} */
const pct = (x) => (x === null ? '-' : `${(100 * x).toFixed(0)} %`);
/** @param {number} units @returns {string} */
const giga = (units) => (units / 1e9).toFixed(1);

/**
 * @param {any[]} calls The assembled calls of one arm, cell and stage (compare.mjs `assembleCalls`).
 * @returns {Record<string, any>}
 */
function stageBudgets(calls) {
  /** @type {{ total: number, before: number }[]} */
  const ok = [];
  /** @type {{ total: number, before: number }[]} */
  const failed = [];
  /** @type {{ total: number, before: number }[]} */
  const unfinished = [];
  for (const c of calls) {
    const work = c.tuples.map((/** @type {any} */ t) => t.work);
    const total = sum(work);
    const item = { total, before: total - (work.at(-1) ?? 0) };
    (c.end === null ? unfinished : c.end.result === 'ok' ? ok : failed).push(item);
  }
  const share = (/** @type {{ total: number, before: number }[]} */ list, /** @type {(x: { total: number, before: number }) => boolean} */ f) => (
    list.length === 0 ? null : list.filter(f).length / list.length);
  const byBudget = (/** @type {(b: number) => any} */ f) => Object.fromEntries(BUDGETS.map((b) => [String(b), f(b)]));
  return {
    okCalls: ok.length, failedCalls: failed.length, unfinishedCalls: unfinished.length,
    okBeyond: byBudget((b) => share(ok, (x) => x.before >= b)),
    okOvershoot: byBudget((b) => share(ok, (x) => x.before < b && x.total >= b)),
    failedAbove: byBudget((b) => Math.round(sum(failed.map((x) => Math.max(0, x.total - b))))),
    failedWork: Math.round(sum(failed.map((x) => x.total))),
    unfinishedAbove: byBudget((b) => unfinished.filter((x) => x.total >= b).length),
    unfinishedWorkSeen: Math.round(sum(unfinished.map((x) => x.total))),
  };
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args } = parseArgs(argv, { values: ['arms', 'label', 'task', 'source-label', 'out-dir'] });
  for (const name of ['arms', 'label']) {
    if (args[name] === undefined) {
      throw new Error(`--${name} is required`);
    }
  }
  const { label } = args;
  const task = args.task ?? 'IGP-03';
  const out = (/** @type {string} */ name) => (args['out-dir'] === undefined ? evidenceDir(label, task, name) : join(args['out-dir'], name));
  const names = args.arms.split(',');
  const loaded = names.map((text) => {
    const at = text.indexOf('/');
    const [t, a] = at < 0 ? [task, text] : [text.slice(0, at), text.slice(at + 1)];
    return { name: text, arm: loadArm(label, t, a) };
  });
  /** @type {Record<string, any>} */
  const result = {};
  for (const { name, arm } of loaded) {
    const allCalls = [...arm.byRow.values()].flat();
    const rates = allCalls.flatMap((c) => c.tuples).filter((/** @type {any} */ t) => typeof t.ms === 'number' && t.ms > 0).map((/** @type {any} */ t) => t.work / t.ms);
    const totalMs = sum(allCalls.flatMap((c) => c.tuples).map((/** @type {any} */ t) => (typeof t.ms === 'number' ? t.ms : 0)));
    /** @type {Record<string, any>} */
    const cells = {};
    for (const caseId of [...new Set(arm.rows.map((/** @type {any} */ r) => r.caseId))]) {
      const calls = arm.rows.filter((/** @type {any} */ r) => r.caseId === caseId).flatMap((/** @type {any} */ r) => arm.byRow.get(r.rowKey) ?? []);
      cells[caseId] = {};
      for (const stage of STAGES) {
        const list = calls.filter((c) => c.stage === stage);
        if (list.length > 0) {
          cells[caseId][stage] = stageBudgets(list);
        }
      }
    }
    result[name] = {
      variant: arm.variant, requests: arm.rows.length, calls: allCalls.length, tuples: rates.length,
      workPerMs: median(rates), workPerMsAggregate: totalMs === 0 ? null : sum(allCalls.flatMap((c) => c.tuples).map((/** @type {any} */ t) => t.work)) / totalMs,
      cells,
    };
  }
  const meta = await buildMeta({ task, label, kind: 'budgets', trees: [...new Set(loaded.map((l) => l.arm.variant))], sourceLabel: args['source-label'] });
  writeJson(out('budgets.json'), { meta, budgets: [...BUDGETS], arms: result });

  const lines = [`# ${task} budgets: P5's inputs`, '', banner(meta), '',
    'These are **inputs** for P5\'s per-level budgets (IG-P-Q10), measured on the journals of the arms; they are not fitted budgets. P5\'s budgets stay recorded, not enforced (D-IG9): no search was stopped at a budget, and the 6 G figure of the first draft is withdrawn.', '',
    '- Work is the main plus census work of every rating attempt of a call in probe order, screens and re-ratings included (G = 10^9 work units). A call is **ok** when it returned a puzzle, **failed** when it ended without one, **unfinished** when its journal has no end line (it was cut when the request ended).',
    '- `ok beyond B`: the share of ok calls whose cumulative work before their last rating was already at least B. Such a call would have been stopped at B before it got its result, but it might still have returned an earlier retained candidate. `ok overshoot`: the share whose last rating crossed B (a rating already running when B passes overshoots it, so the call would have kept its result).',
    '- `failed above B`: the work of failed calls above B, summed, in G units: what a stop at B would have saved on them. Unfinished calls are apart: how many had spent at least B when they were cut (their work is a lower bound).',
    '- Cells and stages are as journaled; the arms have two to six seeds per cell, so every figure is an indication.', '',
    '## Work rate and B in seconds', '',
    `| Arm | Median work rate, units per ms (all ratings) | Aggregate rate | ${BUDGETS.map((b) => `B = ${giga(b)} G in s`).join(' | ')} |`, `|---|---:|---:|${'---:|'.repeat(BUDGETS.length)}`];
  for (const [name, a] of Object.entries(result)) {
    lines.push(`| ${name} (${a.variant}) | ${fix(a.workPerMs, 0)} | ${fix(a.workPerMsAggregate, 0)} | ${BUDGETS.map((b) => (a.workPerMs === null ? '-' : fix(b / a.workPerMs / 1000, 1))).join(' | ')} |`);
  }
  const caseIds = [...new Set(Object.values(result).flatMap((a) => Object.keys(a.cells)))];
  for (const caseId of caseIds) {
    lines.push('', `## ${caseId}`, '', 'Each B column reads: ok beyond (ok overshoot); failed above, G units; unfinished calls at B.', '',
      `| Arm | Stage | Ok / failed / unfinished | ${BUDGETS.map((b) => `B = ${giga(b)} G`).join(' | ')} |`,
      `|---|---|---|${'---|'.repeat(BUDGETS.length)}`);
    for (const [name, a] of Object.entries(result)) {
      for (const [stage, s] of Object.entries(a.cells[caseId] ?? {})) {
        const cols = BUDGETS.map((b) => `${pct(s.okBeyond[String(b)])} (${pct(s.okOvershoot[String(b)])}); ${giga(s.failedAbove[String(b)])}; ${s.unfinishedAbove[String(b)]}`);
        lines.push(`| ${name} | ${stage} | ${s.okCalls} / ${s.failedCalls} / ${s.unfinishedCalls} | ${cols.join(' | ')} |`);
      }
    }
  }
  writeText(out('budgets.md'), lines.join('\n'));
  process.stdout.write(`budgets: ${names.length} arms, ${caseIds.length} cells\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`budgets: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
