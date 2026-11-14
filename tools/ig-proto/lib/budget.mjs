// @ts-check
// Invocation totals and budget decisions (check-list §7, D-IG11, D-IG12). The runner (run-task.ps1) calls
// `node tools\ig-proto\lib\budget.mjs decide ...` before every locked invocation. The forecast (`projectS`) never
// decides: it only moves the totals of a dry run.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { artifactDir, parseArgs, ROUND_LIMIT_S } from './paths.mjs';

const MAX_HORIZON_S = 285;
const QUIET_S = 45;
const SLACK_S = 10;

/**
 * @typedef {object} Invocation
 * @property {string} task
 * @property {string} step
 * @property {number} nodeSeconds
 * @property {number} lockWaitSeconds
 * @property {number} countedSeconds
 */

/**
 * @param {string} label
 * @returns {Invocation[]} Every line of every invocations.jsonl of the label, task folders in name order.
 */
export function readInvocations(label) {
  const root = artifactDir(label);
  /** @type {Invocation[]} */
  const out = [];
  if (!existsSync(root)) {
    return out;
  }
  const folders = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const name of folders) {
    const file = join(root, name, 'invocations.jsonl');
    if (!existsSync(file)) {
      continue;
    }
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (line.trim() !== '') {
        out.push(JSON.parse(line));
      }
    }
  }
  return out;
}

/**
 * @param {Invocation[]} list
 * @param {string} task
 * @returns {{ count: number, nodeSeconds: number, lockWaitSeconds: number, countedSeconds: number, roundCountedS: number }}
 */
export function totals(list, task) {
  const mine = list.filter((i) => i.task === task);
  const sum = (/** @type {Invocation[]} */ rows, /** @type {keyof Invocation} */ key) => rows
    .reduce((s, i) => s + Number(i[key]), 0);
  return {
    count: mine.length,
    nodeSeconds: round3(sum(mine, 'nodeSeconds')),
    lockWaitSeconds: round3(sum(mine, 'lockWaitSeconds')),
    countedSeconds: round3(sum(mine, 'countedSeconds')),
    roundCountedS: round3(sum(list, 'countedSeconds')),
  };
}

/** @param {number} x @returns {number} */
const round3 = (x) => Math.round(x * 1000) / 1000;

/**
 * The allowance left and the horizon of the next locked invocation. `A = min(1.25 x the task's allocation - its
 * counted total, 10,800 s - the round's counted total)`, each cap raised by an approval; `H = min(285, A - 45 -
 * 10)`. The decision is `stop` when `H` is below the step's smallest unit of work.
 * @param {{ task: string, label?: string, allocationS: number, minHorizonS: number,
 *   approvals?: { taskMinutes?: number, roundMinutes?: number }, forecastS?: number, invocations?: Invocation[] }} o
 * @returns {{ decision: 'go' | 'stop', horizonS: number, allowanceS: number, taskCountedS: number,
 *   roundCountedS: number, taskCapS: number, roundCapS: number, minHorizonS: number, approvals: object,
 *   reason?: string }}
 */
export function decide({ task, label = 'provisional', allocationS, minHorizonS, approvals = {}, forecastS = 0, invocations }) {
  const t = totals(invocations ?? readInvocations(label), task);
  const taskCapS = 1.25 * allocationS + 60 * (approvals.taskMinutes ?? 0);
  const roundCapS = ROUND_LIMIT_S + 60 * (approvals.roundMinutes ?? 0);
  const taskCountedS = t.countedSeconds + forecastS;
  const roundCountedS = t.roundCountedS + forecastS;
  const allowanceS = Math.min(taskCapS - taskCountedS, roundCapS - roundCountedS);
  const horizonS = Math.floor(Math.min(MAX_HORIZON_S, allowanceS - QUIET_S - SLACK_S));
  const base = {
    horizonS, allowanceS, taskCountedS, roundCountedS, taskCapS, roundCapS, minHorizonS,
    approvals: { taskMinutes: approvals.taskMinutes ?? 0, roundMinutes: approvals.roundMinutes ?? 0 },
  };
  if (horizonS < minHorizonS) {
    return {
      decision: 'stop',
      ...base,
      reason: `allowance left ${Math.round(allowanceS)} s gives a horizon of ${horizonS} s, below the step's smallest unit of work (${minHorizonS} s); `
        + `task counted ${Math.round(taskCountedS)} s of a cap of ${Math.round(taskCapS)} s (1.25 x its allocation), round counted `
        + `${Math.round(roundCountedS)} s of ${Math.round(roundCapS)} s; the orchestrator may approve with -ApprovedTaskMinutes or -ApprovedRoundMinutes`,
    };
  }
  return { decision: 'go', ...base };
}

/** @param {string[]} argv @returns {void} */
function main(argv) {
  const [command, ...rest] = argv;
  if (command !== 'decide') {
    throw new Error('usage: budget.mjs decide --task <T> --label <L> --allocation-min <n> --min-horizon-s <s> [--approved-task-min <n>] [--approved-round-min <n>] [--forecast-s <s>]');
  }
  const { args } = parseArgs(rest, {
    values: ['task', 'label', 'allocation-min', 'min-horizon-s', 'approved-task-min', 'approved-round-min', 'forecast-s', 'source-label'],
  });
  const result = decide({
    task: args.task,
    label: args.label,
    allocationS: Number(args['allocation-min']) * 60,
    minHorizonS: Number(args['min-horizon-s']),
    approvals: { taskMinutes: Number(args['approved-task-min'] ?? 0), roundMinutes: Number(args['approved-round-min'] ?? 0) },
    forecastS: Number(args['forecast-s'] ?? 0),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`budget: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
