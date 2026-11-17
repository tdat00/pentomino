// @ts-check
// Pool probe (task pack v4, V4-T10c; plan P8; reviews RV1-05, RV1-16, RV1-17 (R17), RV2-01, RV2-04). P8 (a wider pool)
// is parked because one rating took 9 to 28 % longer at eight workers than at four (R23). This probe measures that
// contention directly, on the frozen source (the `base` tree, unchanged) and the same ratings at every width: for a
// case and a width `w` it starts `w` worker threads together (lib/width-worker.mjs), waits until every one has said
// `ready`, sends `go` to all, and collects each worker's ratings' times. It measures time and judges nothing: every
// gate stays at four workers (plan P8). The probe runs as custom items of lib/items.mjs (`runCustomItems`, kind
// `width`, reserve 120 s); an item is `(caseId, width)` for the widths 1, 2, 4 and 8, and a width that did not finish
// is `censored` (or `error`), never a pass.
//   node tools\ig-proto\width-probe.mjs run --task <T> --label frozen --source-label "frozen 3fc65f4"
//     [--cases <ids>] [--rounds <1 to 3>] [--horizon-s <H>]
//   node tools\ig-proto\width-probe.mjs report --task <T> --label frozen --source-label "frozen 3fc65f4"
import { existsSync, readFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

import { HISTORICAL_TASKS, kernelCorpus, parseCases, SUBSETS_PER_CASE } from './kernel-probe.mjs';
import { loadEngine } from './lib/engine.mjs';
import { identityHash, manifestHash, readItemLog, runCustomItems } from './lib/items.mjs';
import { artifactDir, elapsedS, evidenceDir, FROZEN_COMMIT, FROZEN_DIGEST, parseArgs, rel } from './lib/paths.mjs';
import { banner, buildMeta, readTreeInfo, writeJson, writeText } from './lib/records.mjs';
import { ensureTree } from './lib/tree.mjs';

/**
 * @typedef {import('./lib/items.mjs').Item} Item
 * @typedef {{ status: 'completed' | 'censored' | 'error', result: Record<string, unknown> }} Dispatched
 * @typedef {{ item: string, caseId: string, width: number, rounds: number, status: string, expected: number | null,
 *   observed: number | null, medianMs: number | null, p90Ms: number | null, slowdown: number | null, itemMs: number | null,
 *   complete: boolean, ms: number[] | null }} WidthRow One expected item joined with its `item-end` line; `status` is the
 *   line's, or `missing` without one; `complete` when the item completed with every expected rating timed.
 */

const STEP = 'run';
/** The widths of a case, in order: the pool sizes of plan P8's probe. */
export const WIDTHS = Object.freeze([1, 2, 4, 8]);
const DEFAULT_CASE = '26x26-nightmare';
const MAX_ROUNDS = 3;
/** The reserve of a width item (D-V4-14): admitted while `e + 120 <= H - 15`; `--rounds` above 3 needs a new reserve. */
const WIDTH_RESERVE_S = 120;
const DEFAULT_HORIZON_S = 285;
const WORKER_FILE = fileURLToPath(new URL('./lib/width-worker.mjs', import.meta.url));
export const CONTEXT = 'Context: R23 measured one rating 9 to 28 % longer at eight workers than at four. The probe decides whether P8 is worth more work (plan P8); every gate stays at four workers.';

/** @param {string} reason @returns {1} */
function refuse(reason) {
  process.stderr.write(`width-probe: ${reason}\n`);
  return 1;
}

/**
 * @param {string[]} caseIds
 * @param {number} rounds Ratings of each corpus item per worker, 1 to 3.
 * @returns {Item[]} The items, case by case and in the widths' order: `run:base:<caseId>:<width>:<rounds>`, kind `width`,
 *   variant `base`, payload `{ caseId, width, rounds }`. Nothing that depends on an invocation: the cut is the
 *   execution envelope (R2-03).
 */
export function widthItems(caseIds, rounds) {
  return caseIds.flatMap((caseId) => WIDTHS.map((width) => ({
    id: `run:base:${caseId}:${width}:${rounds}`,
    kind: 'width',
    variant: 'base',
    payload: { caseId, width, rounds },
  })));
}

/**
 * @param {number[]} ms The times of the ratings of a width, in ms.
 * @returns {{ medianMs: number, p90Ms: number }} The median (the mean of the two middle values for an even count, to four
 *   decimals) and the value at index `Math.ceil(0.9 * n) - 1` of the ascending list; an empty list or a time that is
 *   not finite throws.
 */
export function widthStats(ms) {
  if (!Array.isArray(ms) || ms.length === 0 || !ms.every((x) => Number.isFinite(x))) {
    throw new RangeError('widthStats needs a non-empty list of finite times');
  }
  const sorted = [...ms].sort((a, b) => a - b);
  const n = sorted.length;
  const middle = n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { medianMs: Math.round(middle * 10000) / 10000, p90Ms: sorted[Math.ceil(0.9 * n) - 1] };
}

/**
 * Measures one width: `width` workers of `workerFile` started together with `workerData` `{ treeRoot, items, rounds }`
 * (`items` the corpus of one case; a scripted worker adds its own keys). The parent waits for every `{ type: 'ready' }`,
 * sends `{ type: 'go' }` to all, and collects every `{ type: 'result', ms }`. An `{ type: 'error', message }` message,
 * an error or an exit of a worker before its result, or a result whose `ms` is not a list of numbers ends the item
 * `error`; the cut (`cutAtS`, seconds since the process start) ends it `censored`: a partial width is never a pass. In
 * every case a `finally` terminates and awaits every worker, so none outlives the call.
 * @param {{ workerFile: string, workerData: { items: any[], rounds: number } & Record<string, unknown>, width: number,
 *   cutAtS: number }} o
 * @returns {Promise<Dispatched>} A completed result is `{ caseId, width, rounds, expected, observed, medianMs, p90Ms,
 *   ms }`: `expected = rounds x items x width`, `observed` the ratings timed, `ms` their times worker by worker, and
 *   the median and the 90th percentile of `ms`. An error result is `{ outcome: 'error', message, caseId, width }`, a
 *   censored one `{ outcome: 'censored', cutAtS, caseId, width, ready, results }` (workers ready, results received).
 */
export async function widthDispatch({ workerFile, workerData, width, cutAtS }) {
  const { items, rounds } = workerData;
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(rounds) || rounds < 1 || !Array.isArray(items) || items.length === 0
    || !Number.isFinite(cutAtS)) {
    throw new RangeError('widthDispatch needs a width and rounds of at least 1, a corpus and a cut');
  }
  const caseId = items[0]?.caseId ?? null;
  const expected = rounds * items.length * width;
  /** @type {Worker[]} */
  const workers = [];
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  try {
    return await new Promise((resolve) => {
      let ready = 0;
      let received = 0;
      /** @type {(number[] | undefined)[]} */
      const results = new Array(width).fill(undefined);
      /** @param {string} message */
      const fail = (message) => resolve({ status: 'error', result: { outcome: 'error', message, caseId, width } });
      timer = setTimeout(() => resolve({
        status: 'censored',
        result: { outcome: 'censored', cutAtS: Math.round(elapsedS() * 1000) / 1000, caseId, width, ready, results: received },
      }), Math.max(0, (cutAtS - elapsedS()) * 1000));
      for (let i = 0; i < width; i += 1) {
        const worker = new Worker(workerFile, { workerData });
        workers.push(worker);
        let said = false;
        let ended = false;
        worker.on('message', (/** @type {any} */ message) => {
          if (message?.type === 'ready' && !said) {
            said = true;
            ready += 1;
            if (ready === width) {
              for (const each of workers) {
                each.postMessage({ type: 'go' });
              }
            }
          } else if (message?.type === 'result') {
            ended = true;
            if (!Array.isArray(message.ms) || !message.ms.every((/** @type {unknown} */ x) => Number.isFinite(x))) {
              fail(`worker ${i} sent a result whose ms is not a list of numbers`);
              return;
            }
            results[i] = message.ms;
            received += 1;
            if (received === width) {
              const all = /** @type {number[][]} */ (results).flat();
              if (all.length === 0) {
                fail('no worker timed a rating');
                return;
              }
              resolve({ status: 'completed', result: { caseId, width, rounds, expected, observed: all.length, ...widthStats(all), ms: all } });
            }
          } else if (message?.type === 'error') {
            ended = true;
            fail(`worker ${i}: ${String(message.message)}`);
          }
        });
        worker.on('error', (error) => {
          ended = true;
          fail(`worker ${i}: ${error.message}`);
        });
        worker.on('exit', (code) => {
          if (!ended) {
            fail(`worker ${i} exited with code ${code} before its result`);
          }
        });
      }
    });
  } finally {
    clearTimeout(timer);
    await Promise.allSettled(workers.map((worker) => worker.terminate()));
  }
}

/** @param {any[]} lines @returns {Map<string, any>} The first `item-end` line of each item. */
function endsOf(lines) {
  /** @type {Map<string, any>} */
  const ends = new Map();
  for (const line of lines) {
    if (line?.type === 'item-end' && !ends.has(line.item)) {
      ends.set(line.item, line);
    }
  }
  return ends;
}

const ITEM_ID = /^run:base:([^:]+):(1|2|4|8):([1-3])$/;

/**
 * @param {any[]} lines The parsed lines of an item log.
 * @returns {{ caseIds: string[], rounds: number[] }} The cases (in order of first appearance) and the rounds the width
 *   items of the lines name: what `report` falls back on, because it takes neither a case list nor a number of rounds.
 */
export function loggedWidth(lines) {
  /** @type {string[]} */
  const caseIds = [];
  /** @type {number[]} */
  const rounds = [];
  for (const line of lines) {
    const match = typeof line?.item === 'string' ? ITEM_ID.exec(line.item) : null;
    if (match !== null) {
      if (!caseIds.includes(match[1])) {
        caseIds.push(match[1]);
      }
      if (!rounds.includes(Number(match[3]))) {
        rounds.push(Number(match[3]));
      }
    }
  }
  return { caseIds, rounds };
}

/**
 * @param {Item[]} items The expected items, in order.
 * @param {any[]} lines The parsed lines of the item log.
 * @returns {WidthRow[]} One row per item; `slowdown` is `medianMs(w) / medianMs(1)` of the item's case, to four decimals,
 *   for a complete item when the case's width 1 is complete too (the slowdown of width 1 is 1).
 */
export function widthRows(items, lines) {
  const ends = endsOf(lines);
  const rows = items.map((item) => {
    const { caseId, width, rounds } = /** @type {{ caseId: string, width: number, rounds: number }} */ (item.payload);
    const end = ends.get(item.id);
    const r = end?.result;
    const timed = end?.status === 'completed' && r !== null && typeof r === 'object' && r.caseId === caseId && r.width === width
      && r.rounds === rounds && Number.isInteger(r.expected) && Array.isArray(r.ms) && r.ms.length === r.observed
      && r.observed === r.expected && r.expected > 0 && Number.isFinite(r.medianMs) && Number.isFinite(r.p90Ms);
    return {
      item: item.id,
      caseId,
      width,
      rounds,
      status: end?.status ?? 'missing',
      expected: timed ? r.expected : null,
      observed: timed ? r.observed : null,
      medianMs: timed ? r.medianMs : null,
      p90Ms: timed ? r.p90Ms : null,
      slowdown: /** @type {number | null} */ (null),
      itemMs: typeof end?.ms === 'number' ? end.ms : null,
      complete: timed,
      ms: timed ? r.ms : null,
    };
  });
  for (const row of rows) {
    const one = rows.find((other) => other.caseId === row.caseId && other.width === 1);
    if (row.medianMs !== null && one !== undefined && one.medianMs !== null && one.medianMs > 0) {
      row.slowdown = Math.round((row.medianMs / one.medianMs) * 10000) / 10000;
    }
  }
  return rows;
}

/**
 * @param {WidthRow[]} rows
 * @returns {{ verdict: 'complete' | 'incomplete', items: string[], line: string }} `complete` when every expected item
 *   completed with every expected rating timed; else `incomplete` with the items that did not (missing, censored, an
 *   error or a result that is not the item's): `width: incomplete (<items>)`. The probe judges no slowdown.
 */
export function widthVerdict(rows) {
  if (rows.length === 0) {
    throw new RangeError('widthVerdict needs at least one item');
  }
  const bad = rows.filter((row) => !row.complete).map((row) => row.item);
  return bad.length === 0
    ? { verdict: 'complete', items: [], line: 'width: complete' }
    : { verdict: 'incomplete', items: bad, line: `width: incomplete (${bad.join(', ')})` };
}

/** @returns {{ cpus: number, model: string, totalMemoryBytes: number }} The machine, as `os` reports it. */
export function machineInfo() {
  return { cpus: cpus().length, model: (cpus()[0]?.model ?? 'unknown').trim(), totalMemoryBytes: totalmem() };
}

/** @param {unknown} value @returns {string} A table cell. */
const cell = (value) => (value === null || value === undefined ? '-' : String(value).replaceAll('|', '\\|'));

/**
 * @param {string} task
 * @param {{ meta: any, machine: ReturnType<typeof machineInfo>, rounds: number, rows: WidthRow[],
 *   verdict: ReturnType<typeof widthVerdict> }} record
 * @returns {string} The Markdown record `width.md`.
 */
export function renderWidth(task, { meta, machine, rounds, rows, verdict }) {
  return [
    `# Pool probe: one rating's time at 1, 2, 4 and 8 concurrent workers (${task})`, '',
    banner(meta), '',
    verdict.line, '',
    CONTEXT, '',
    '## Machine', '',
    `${machine.cpus} logical CPUs (\`os.cpus().length\`), first CPU \`${machine.model}\`, ${machine.totalMemoryBytes} bytes of memory (\`os.totalmem()\`).`, '',
    '## Widths', '',
    `Each item starts \`width\` worker threads together in the \`base\` tree (the frozen source unchanged); every worker loads the engine, `
    + 'says `ready`, waits for the parent\'s `go` (sent once every worker is ready) and then rates each of the six window subsets of the '
    + `case's first carved set (T10a's corpus) ${rounds} time${rounds === 1 ? '' : 's'}, timing each rating. \`expected\` is rounds x ${SUBSETS_PER_CASE} x width ratings and `
    + '`observed` the ratings timed; `medianMs` and `p90Ms` are over all of them (the 90th percentile is the value at index '
    + '`ceil(0.9 n) - 1` of the ascending list); `slowdown` is `medianMs` of the width over `medianMs` of width 1. The numbers are '
    + 'measurements: the probe judges nothing, and a partial width is `censored`, never a pass.', '',
    '| case | width | rounds | status | expected | observed | medianMs | p90Ms | slowdown | itemMs |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((row) => `| ${cell(row.caseId)} | ${row.width} | ${row.rounds} | ${cell(row.status)}${row.status === 'completed' && !row.complete ? ' (not the item\'s result)' : ''} | ${cell(row.expected)} | ${cell(row.observed)} | ${cell(row.medianMs)} | ${cell(row.p90Ms)} | ${cell(row.slowdown)} | ${cell(row.itemMs)} |`),
    '',
  ].join('\n');
}

/**
 * Finds the run for `report`: its state, its log, and the cases and rounds whose items reproduce the state's manifest
 * hash (the default case with the rounds the log names, or the cases the log names; with no line, rounds 1 to 3), and
 * checks that the state is of the frozen source, that every log line carries the state's `identityHash` and that the
 * `base` tree is not stale.
 * @param {{ task: string, label: string }} o
 * @returns {{ caseIds: string[], rounds: number, items: Item[], lines: any[] } | { problems: string[] }}
 */
function locateRun({ task, label }) {
  const dir = artifactDir(label, task, STEP);
  const statePath = join(dir, 'state.json');
  if (!existsSync(statePath)) {
    return { problems: [`no state ${rel(statePath)}: run first`] };
  }
  const identity = JSON.parse(readFileSync(statePath, 'utf8')).identity ?? null;
  if (identity === null) {
    return { problems: [`the state ${rel(statePath)} has no identity`] };
  }
  const lines = readItemLog(join(dir, 'items.jsonl'));
  const named = loggedWidth(lines);
  const lists = [[DEFAULT_CASE], ...(named.caseIds.length > 0 && named.caseIds.join() !== DEFAULT_CASE ? [named.caseIds] : [])];
  const roundsList = named.rounds.length > 0 ? named.rounds : [1, 2, 3];
  /** @type {string[]} */
  const problems = [];
  /** @type {{ caseIds: string[], rounds: number, items: Item[], lines: any[] } | null} */
  let found = null;
  for (const caseIds of lists) {
    for (const rounds of roundsList) {
      const items = widthItems(caseIds, rounds);
      if (found === null && identity.manifestHash === manifestHash(items)) {
        found = { caseIds, rounds, items, lines };
      }
    }
  }
  if (found === null) {
    problems.push(`the manifest hash of the state differs from the items of the cases ${lists.map((ids) => ids.join(',')).join(' and of the cases ')} with the rounds ${roundsList.join(', ')}`);
  }
  if (identity.frozenCommit !== FROZEN_COMMIT || identity.sourceDigest !== FROZEN_DIGEST) {
    problems.push('the state is not of the frozen source');
  }
  const hash = identityHash(identity);
  for (const [index, line] of lines.entries()) {
    if (line.identityHash !== hash) {
      problems.push(`log line ${index + 1} carries another identityHash than the state's`);
    }
  }
  for (const [variant, treeId] of Object.entries(identity.treeIds ?? {})) {
    const current = readTreeInfo(variant).treeId;
    if (current !== treeId) {
      problems.push(`stale tree ${variant} (${treeId} vs ${current})`);
    }
  }
  return problems.length > 0 || found === null ? { problems } : found;
}

/**
 * The record of a `run` step, from its state and item log (nothing is written).
 * @param {{ task: string, label: string, sourceLabel?: string }} o `label` is `frozen`; the self-test passes `selftest`.
 * @returns {Promise<{ problems: string[] } | { record: any, markdown: string, verdict: ReturnType<typeof widthVerdict> }>}
 */
export async function buildWidthReport({ task, label, sourceLabel }) {
  const run = locateRun({ task, label });
  if ('problems' in run) {
    return { problems: run.problems };
  }
  const rows = widthRows(run.items, run.lines);
  const verdict = widthVerdict(rows);
  const machine = machineInfo();
  const meta = await buildMeta({ task, label, kind: 'width', trees: ['base'], sourceLabel });
  const record = {
    meta,
    task,
    verdict: verdict.verdict,
    line: verdict.line,
    items: verdict.items,
    cases: run.caseIds,
    rounds: run.rounds,
    widths: [...WIDTHS],
    context: CONTEXT,
    machine,
    rows,
  };
  return { record, markdown: renderWidth(task, { meta, machine, rounds: run.rounds, rows, verdict }), verdict };
}

/**
 * @param {string[]} argv `--task <T> --label frozen --source-label <SL> [--cases <ids>] [--rounds <n>] [--horizon-s <H>]`
 * @returns {Promise<number>} The runner's exit code (0, or 3 for a refused resume); 1 for a refused command.
 */
async function runCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'label', 'source-label', 'cases', 'rounds', 'horizon-s'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  const { task } = args;
  if (task === undefined) {
    return refuse('run needs --task');
  }
  if (HISTORICAL_TASKS.includes(task)) {
    return refuse(`${task} is a historical observation namespace; use another --task`);
  }
  const rounds = Number(args.rounds ?? MAX_ROUNDS);
  if (Number.isFinite(rounds) && rounds > MAX_ROUNDS) {
    return refuse('--rounds above 3 needs a new reserve');
  }
  if (!Number.isInteger(rounds) || rounds < 1) {
    return refuse('--rounds must be an integer from 1 to 3');
  }
  const horizonS = Number(args['horizon-s'] ?? DEFAULT_HORIZON_S);
  if (!Number.isFinite(horizonS) || horizonS <= 0) {
    return refuse('--horizon-s must be a positive number');
  }
  const caseIds = parseCases(args.cases ?? DEFAULT_CASE);
  const base = await ensureTree('base');
  /** @type {Map<string, ReturnType<typeof kernelCorpus>>} */
  const corpora = new Map();
  /** @type {Awaited<ReturnType<typeof loadEngine>> | null} */
  let engine = null;
  const out = await runCustomItems({ task, step: STEP, label: 'frozen', horizonS, items: widthItems(caseIds, rounds), reserveS: WIDTH_RESERVE_S },
    async (item, { cutAtS }) => {
      const { caseId, width } = /** @type {{ caseId: string, width: number }} */ (item.payload);
      if (!corpora.has(caseId)) {
        engine ??= await loadEngine(base.root);
        corpora.set(caseId, kernelCorpus(engine, [caseId]));
      }
      return widthDispatch({ workerFile: WORKER_FILE, workerData: { treeRoot: base.root, items: corpora.get(caseId) ?? [], rounds }, width, cutAtS });
    });
  if (out.exitCode === 0) {
    process.stdout.write(`width-probe: ${out.done ? 'every item has ended' : 'items are left for another invocation'}\n`);
  }
  return out.exitCode;
}

/**
 * @param {string[]} argv `--task <T> --label frozen --source-label <SL>`
 * @returns {Promise<number>} 0 once the record is written, whatever its verdict; 1 for a refused command or a run whose
 *   state, log or tree is not the experiment's.
 */
async function reportCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'label', 'source-label'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  const { task } = args;
  if (task === undefined) {
    return refuse('report needs --task');
  }
  if (HISTORICAL_TASKS.includes(task)) {
    return refuse(`${task} is a historical observation namespace; use another --task`);
  }
  const built = await buildWidthReport({ task, label: 'frozen', sourceLabel: args['source-label'] });
  if ('problems' in built) {
    return refuse(built.problems.join('; '));
  }
  writeJson(evidenceDir('frozen', task, 'width.json'), built.record);
  writeText(evidenceDir('frozen', task, 'width.md'), built.markdown);
  process.stdout.write(`${built.verdict.line}\nwidth-probe: wrote ${rel(evidenceDir('frozen', task, 'width.json'))}\n`);
  return 0;
}

/**
 * @param {string[]} argv `run ...` or `report ...`
 * @returns {Promise<number>}
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  const commands = /** @type {Record<string, (argv: string[]) => Promise<number>>} */ ({ run: runCommand, report: reportCommand });
  if (command === undefined || !Object.hasOwn(commands, command)) {
    return refuse(`unknown command ${command ?? ''} (run, report)`);
  }
  try {
    return await commands[command](rest);
  } catch (e) {
    return refuse(e instanceof Error ? e.message : String(e));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
  // A worker that outlived its dispatch would keep the process (and the lock helper's slot) until the helper's kill.
  setTimeout(() => process.exit(process.exitCode ?? 0), 10000).unref();
}
