// @ts-check
// The fitting reader of the stages 2 to 4 pack (T02b: the pure core, T02c: the two commands). A read-only tool with two
// readings: whether the controls that stage 2 did not pilot keep today's speed on the no-screen arm (the no-regression
// preview against MP12b1's reps 0-4), and whether the proposed P5 budgets and attempt bound could have stopped an
// observed call or request (the call prefixes of a row). Missing, invalid or ambiguous evidence is always reported with
// its reason and never becomes a completion, zero work or a clear reading.
//   node tools\ig-proto\fit-read.mjs preview --task <T> --arm <A> --label frozen --source-label <SL>
//   node tools\ig-proto\fit-read.mjs prefixes --task <T> --arm <A> --budget <level>=<units>[,<level>=<units>...] [--bound <n>] --label frozen --source-label <SL>
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { publicationOf } from './arm.mjs';
import { abs, artifactDir, evidenceDir, IG_DIR, mp12b1Report, parseArgs, rel } from './lib/paths.mjs';
import { banner, buildMeta, sha256File, writeJson, writeText } from './lib/records.mjs';
import { withoutSampling } from './manifest.mjs';
import { cappedT10, geoMean, ingestRow, noRegression, parseLines, reachedTen, rowLedger, runStatus } from './verdicts.mjs';

/** @typedef {{ rowKey: string, caseId: string, rep: number, seed: string, shard: string }} Declared */

/** @param {unknown} v @returns {v is Record<string, any>} */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** @param {unknown} v @returns {boolean} A finite number from 0. */
const isUnits = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** @param {string[]} node @param {string} flag @returns {string | undefined} The word after the flag. */
const valueOf = (node, flag) => {
  const at = node.indexOf(flag);
  return at < 0 ? undefined : node[at + 1];
};

/**
 * @param {any} plan A compiled plan (`{ task, steps }`).
 * @param {string} arm
 * @returns {Declared[]} The duplicate-free declared grid of the arm's `arm.mjs run` steps, in step order. Throws when
 *   the arm has no rows, a key is declared twice, a rep is outside 0-4 or a `--cases` entry is malformed.
 */
export function fitScope(plan, arm) {
  /** @type {Declared[]} */
  const grid = [];
  const seen = new Set();
  for (const step of plan.steps) {
    const node = step.node;
    if (!Array.isArray(node) || typeof node[0] !== 'string' || !node[0].endsWith('arm.mjs') || node[1] !== 'run' || valueOf(node, '--arm') !== arm) {
      continue;
    }
    const shard = String(valueOf(node, '--shard'));
    const cases = valueOf(node, '--cases');
    if (cases === undefined) {
      throw new Error(`fit-read: the step ${step.id} of ${arm} has no --cases`);
    }
    for (const entry of cases.split(',')) {
      const parsed = /^([^:]+):(\d+)-(\d+)$/.exec(entry);
      if (parsed === null || Number(parsed[2]) > Number(parsed[3])) {
        throw new Error(`fit-read: bad --cases entry ${entry}`);
      }
      const [caseId, from, to] = [parsed[1], Number(parsed[2]), Number(parsed[3])];
      for (let rep = from; rep <= to; rep += 1) {
        if (rep > 4) {
          throw new Error(`fit-read: rep ${rep} of ${caseId} is not a fitting rep (0-4)`);
        }
        const rowKey = `${caseId}~${rep}`;
        if (seen.has(rowKey)) {
          throw new Error(`fit-read: ${rowKey} is declared twice`);
        }
        seen.add(rowKey);
        grid.push({ rowKey, caseId, rep, seed: `landscape/${caseId}/${rep}`, shard });
      }
    }
  }
  if (grid.length === 0) {
    throw new Error(`fit-read: the plan ${plan.task} has no rows of ${arm}`);
  }
  return grid;
}

/**
 * @param {Declared} declared
 * @param {any} row A published row.
 * @returns {string | null} Null when the row (and its run, when it has one) is the declared one, else the first
 *   differing identity field. `ingestRow` compares a run with its own row only, so this runs first.
 */
export function declaredRowProblem(declared, row) {
  if (!isObject(row)) {
    return `wrong declared identity (row ${JSON.stringify(row)}, declared ${JSON.stringify(declared.rowKey)})`;
  }
  /** @type {[string, unknown, unknown][]} */
  const checks = [
    ['rowKey', row.rowKey, declared.rowKey],
    ['caseId', row.caseId, declared.caseId],
    ['rep', row.rep, declared.rep],
    ['seed', row.seed, declared.seed],
  ];
  if (isObject(row.run)) {
    checks.push(['run.caseId', row.run.caseId, declared.caseId], ['run.seed', row.run.seed, declared.seed]);
  }
  for (const [field, seen, want] of checks) {
    if (seen !== want) {
      return `wrong declared identity (${field} ${JSON.stringify(seen)}, declared ${JSON.stringify(want)})`;
    }
  }
  return null;
}

/**
 * The no-regression preview of one cell: a fitting warning, not a five-seed verdict.
 * @param {string} cell
 * @param {Declared[]} declared The cell's entries of `fitScope`.
 * @param {any[]} published Every published row of the arm naming the cell (duplicates included).
 * @param {any[]} todayRuns MP12b1's run records of the cell.
 * @param {{ quantity?: number, capMs?: number }} [options]
 * @returns {{ cell: string, declared: number, pairs: { rep: number, ratio: number | null, problem: string | null }[],
 *   todayTen: number, afterTen: number, ratios: (number | null)[], geo: number | null, lower: number | null,
 *   pass: boolean | null, problems: string[] }}
 */
export function previewCell(cell, declared, published, todayRuns, { quantity = 10, capMs = 120000 } = {}) {
  let todayTen = 0;
  let afterTen = 0;
  const pairs = declared.map((entry) => {
    /** @type {(problem: string) => { rep: number, ratio: number | null, problem: string | null }} */
    const bad = (problem) => ({ rep: entry.rep, ratio: null, problem });
    const rows = published.filter((r) => isObject(r) && r.rowKey === entry.rowKey);
    if (rows.length !== 1) {
      return bad(rows.length === 0 ? 'no published row' : `${rows.length} published rows`);
    }
    const row = rows[0];
    const wrong = declaredRowProblem(entry, row);
    if (wrong !== null) {
      return bad(wrong);
    }
    const after = ingestRow(row, { quantity });
    if (after.status !== 'valid') {
      return bad(`after ${after.status}: ${after.problems.join('; ')}`);
    }
    const runs = todayRuns.filter((r) => isObject(r) && r.probeKind === 'generation' && r.rep === entry.rep);
    if (runs.length !== 1) {
      return bad(runs.length === 0 ? 'no MP12b1 run' : `${runs.length} MP12b1 runs`);
    }
    const today = withoutSampling(runs[0]);
    if (today.seed !== entry.seed) {
      return bad(`MP12b1 seed ${today.seed}`);
    }
    const judged = runStatus(today, { quantity });
    if (judged.status !== 'valid') {
      return bad(`today ${judged.status}: ${judged.problems.join('; ')}`);
    }
    const ratio = cappedT10(today, { quantity, capMs }) / cappedT10(after.run, { quantity, capMs });
    if (!(Number.isFinite(ratio) && ratio > 0)) {
      return bad(`ratio ${ratio}`);
    }
    todayTen += reachedTen(today, { quantity }) ? 1 : 0;
    afterTen += reachedTen(after.run, { quantity }) ? 1 : 0;
    return { rep: entry.rep, ratio, problem: null };
  });
  const ratios = pairs.map((p) => p.ratio);
  const good = /** @type {number[]} */ (ratios.filter((r) => r !== null));
  const whole = declared.length === 5 && good.length === 5;
  const bound = whole ? noRegression(good, declared.map((d) => d.rep), { resamples: 10000, resampleSeed: 20261116 }) : null;
  return {
    cell,
    declared: declared.length,
    pairs,
    todayTen,
    afterTen,
    ratios,
    geo: good.length > 0 ? geoMean(good) : null,
    lower: bound === null ? null : bound.lower,
    pass: bound === null ? null : bound.pass,
    problems: pairs.filter((p) => p.problem !== null).map((p) => `rep ${p.rep}: ${p.problem}`),
  };
}

/**
 * The prefixes of the calls of one row against the proposed budgets, accumulated in primitive order: the check is
 * between primitives, never inside one.
 * @param {Record<string, any>[]} lines The journal lines of one row (every worker file in file-name order, never the link file).
 * @param {Record<string, number>} budgets A level id to units.
 * @returns {{ calls: { call: string, level: any, stage: any, attempt: any, budget: number | null, spent: number,
 *   ended: boolean, open: boolean, firstAffected: number | null, endResult: any, status: string, problems: string[] }[],
 *   unowned: string[], problems: string[] }}
 */
export function callPrefixes(lines, budgets) {
  /** @type {Map<string, { start: Record<string, any>, lines: Record<string, any>[], problems: string[] }>} */
  const owned = new Map();
  /** @type {string[]} */
  const problems = [];
  const add = (/** @type {string[]} */ list, /** @type {string} */ problem) => {
    if (!list.includes(problem)) {
      list.push(problem);
    }
  };
  lines.forEach((line, index) => {
    if (line.t !== 'start') {
      return;
    }
    if (typeof line.call !== 'string' || line.call === '') {
      add(problems, `invalid start line ${index}`);
    } else if (owned.has(line.call)) {
      add(/** @type {any} */ (owned.get(line.call)).problems, 'duplicate start');
    } else {
      owned.set(line.call, { start: line, lines: [], problems: [] });
    }
  });
  /** @type {string[]} */
  const unowned = [];
  for (const line of lines) {
    if (!['p', 'count', 'begin', 'end', 'phase', 'caps'].includes(line.t)) {
      continue;
    }
    const owner = typeof line.call === 'string' ? owned.get(line.call) : undefined;
    if (owner === undefined) {
      add(unowned, String(line.call));
      add(problems, `unowned ${line.t} line ${line.call}`);
    } else {
      owner.lines.push(line);
    }
  }
  const calls = [...owned].map(([call, { start, lines: own, problems: callProblems }]) => {
    const level = start.level;
    const budget = Object.hasOwn(budgets, level) && typeof budgets[level] === 'number' ? budgets[level] : null;
    let spent = 0;
    let open = false;
    let begins = 0;
    /** @type {number | null} */
    let firstAffected = null;
    /** @type {Record<string, any> | null} */
    let end = null;
    for (const line of own) {
      if (line.t === 'begin') {
        if (open) {
          add(callProblems, 'begin while a primitive is open');
        }
        if (budget !== null && firstAffected === null && spent >= budget) {
          firstAffected = begins;
        }
        begins += 1;
        open = true;
      } else if (line.t === 'p' || line.t === 'count') {
        if (!open) {
          add(callProblems, `${line.t} without an open primitive`);
        }
        open = false;
        const units = line.t === 'p'
          ? (Array.isArray(line.tuple) && isUnits(line.tuple[4]) && isUnits(line.tuple[5]) ? line.tuple[4] + line.tuple[5] : null)
          : (isUnits(line.units) ? line.units : null);
        if (units === null) {
          add(callProblems, 'invalid units');
        } else {
          spent += units;
        }
      } else if (line.t === 'end') {
        if (end !== null) {
          add(callProblems, 'duplicate end');
        } else {
          end = line;
        }
      }
    }
    const ended = end !== null;
    if (end !== null && spent !== end.work + end.locate?.countWork) {
      add(callProblems, 'end mismatch');
    }
    const status = callProblems.length > 0 ? 'ambiguous'
      : budget === null ? 'no-budget'
        : firstAffected !== null ? 'affected'
          : !ended && spent >= budget ? 'potentially-affected' : 'clear';
    return {
      call, level, stage: start.stage, attempt: start.attempt ?? null, budget, spent, ended, open, firstAffected,
      endResult: end?.locate?.result ?? null, status, problems: callProblems,
    };
  });
  return { calls, unowned, problems };
}

/**
 * @param {{ stage: any, attempt: any, status: string, ended: boolean, endResult: any }[]} calls The calls of one row
 *   (`callPrefixes(...).calls`); only the `set`-stage calls count.
 * @param {number} bound The attempt bound (a positive integer).
 * @returns {{ fires: boolean, side: 'below' | 'above' | null, attempts: number }} Whether the bound fires: the calls of
 *   attempts 0 to `bound - 1` all exist once, none is ambiguous, all ended and all `below-to-one` or all `above-to-max`.
 */
export function boundFirings(calls, bound) {
  if (!Number.isInteger(bound) || bound < 1) {
    throw new RangeError(`fit-read: bound must be a positive integer, got ${String(bound)}`);
  }
  const sets = calls.filter((c) => c.stage === 'set');
  const firstAttempts = [];
  for (let attempt = 0; attempt < bound; attempt += 1) {
    const found = sets.filter((c) => c.attempt === attempt);
    if (found.length !== 1 || found[0].status === 'ambiguous' || !found[0].ended) {
      return { fires: false, side: null, attempts: sets.length };
    }
    firstAttempts.push(found[0]);
  }
  for (const [result, side] of /** @type {const} */ ([['below-to-one', 'below'], ['above-to-max', 'above']])) {
    if (firstAttempts.every((c) => c.endResult === result)) {
      return { fires: true, side, attempts: sets.length };
    }
  }
  return { fires: false, side: null, attempts: sets.length };
}

/** @param {unknown} v @returns {boolean} A string with a character other than white space. */
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * The identity problems of one row's raw files against its publication (T02c step 5). Pure: it never throws on a
 * malformed identity input, and two absent identities never compare equal.
 * @param {{ task: string, arm: string, declared: Declared, shard: any, rowLines: any, meta: any }} o `shard` is the parsed
 *   `shard.json` (null when absent), `rowLines` the parsed lines of `<rowKey>.row.jsonl` (null when absent) and `meta` the
 *   publication's `meta` (null when there is none).
 * @returns {string[]}
 */
export function rawIdentityProblems({ task, arm, declared, shard, rowLines, meta }) {
  if (shard === null || shard === undefined) {
    return ['no shard declaration'];
  }
  if (!isObject(shard) || shard.format !== 'ig-proto-shard' || shard.version !== 1 || !Array.isArray(shard.rows) || !shard.rows.every(isObject)) {
    return ['the shard declaration is malformed'];
  }
  /** @type {string[]} */
  const problems = [];
  if (shard.task !== task || shard.arm !== arm || shard.shard !== declared.shard) {
    problems.push(`the shard declaration is of ${shard.task}/${shard.arm}/${shard.shard}`);
  }
  for (const field of ['variant', 'treeId', 'copyDigest', 'harnessHash']) {
    if (!nonEmpty(shard[field])) {
      problems.push(`the shard's ${field} is missing or malformed`);
    }
  }
  const entries = shard.rows.filter((/** @type {Record<string, any>} */ e) => e.key === declared.rowKey);
  if (entries.length === 0) {
    problems.push(`the shard does not declare ${declared.rowKey}`);
  } else if (entries.length > 1) {
    problems.push(`the shard declares ${declared.rowKey} more than once`);
  } else {
    const [entry] = entries;
    if (entry.caseId !== declared.caseId || entry.rep !== declared.rep || entry.seed !== declared.seed) {
      problems.push(`the shard declares ${declared.rowKey} as ${entry.caseId}/${entry.rep}/${entry.seed}`);
    }
  }
  if (rowLines === null || rowLines === undefined) {
    problems.push('no row identity');
  } else if (!Array.isArray(rowLines) || !rowLines.every(isObject)) {
    problems.push('the row identity is malformed');
  } else {
    const headers = rowLines.filter((l) => l.t === 'row');
    if (headers.length === 0) {
      problems.push('no row identity');
    } else if (headers.length > 1) {
      problems.push('the row identity appears more than once');
    } else if (headers[0].row !== declared.rowKey || headers[0].caseId !== declared.caseId || headers[0].seed !== declared.seed) {
      problems.push(`the row identity names ${headers[0].row}/${headers[0].caseId}/${headers[0].seed}`);
    }
  }
  if (meta === null || meta === undefined) {
    problems.push('no publication metadata');
    return problems;
  }
  if (!isObject(meta)) {
    problems.push('the publication metadata is malformed');
    return problems;
  }
  const tree = isObject(meta.trees) && nonEmpty(shard.variant) ? meta.trees[shard.variant] : undefined;
  const harness = meta.harness;
  /** @type {[string, unknown, unknown][]} */
  const checks = [
    ['tree', isObject(tree) ? tree.treeId : undefined, shard.treeId],
    ['copy', isObject(tree) ? tree.copyDigest : undefined, shard.copyDigest],
    ['producer', isObject(harness) ? harness.harnessHash : undefined, shard.harnessHash],
  ];
  for (const [label, published, stored] of checks) {
    if (!nonEmpty(published)) {
      problems.push(`the publication's ${label} identity is missing or malformed`);
    } else if (nonEmpty(stored) && published !== stored) {
      problems.push(`the publication's ${label} ${published} is not the shard's ${stored}`);
    }
  }
  return problems;
}

const HISTORICAL = Object.freeze(['IGP-02', 'V4-T04', 'V4-T04v4', 'V4-T04f', 'V4-T04i', 'V4-S2', 'V4-S2P', 'V4-S2K', 'V4-S2W']);
const USAGE = [
  'usage: node tools\\ig-proto\\fit-read.mjs preview --task <T> --arm <A> --label frozen --source-label <SL>',
  '       node tools\\ig-proto\\fit-read.mjs prefixes --task <T> --arm <A> --budget <level>=<units>[,<level>=<units>...] [--bound <n>] --label frozen --source-label <SL>',
].join('\n');

/** A refusal of a command: its text follows `fit-read: `. */
class Refusal extends Error {}

/**
 * @param {string} value
 * @returns {Record<string, number>} The budgets of `--budget`: every entry `<level>=<units>`, units an integer above 0.
 */
function parseBudgets(value) {
  /** @type {Record<string, number>} */
  const budgets = Object.create(null);
  for (const entry of value.split(',')) {
    const parsed = /^([^=,]+)=(\d+)$/.exec(entry);
    const units = parsed === null ? 0 : Number(parsed[2]);
    if (parsed === null || !Number.isSafeInteger(units) || units <= 0 || Object.hasOwn(budgets, parsed[1])) {
      throw new Refusal(`bad --budget ${value}`);
    }
    budgets[parsed[1]] = units;
  }
  return budgets;
}

/**
 * The refusals both commands share (step 2); nothing is written before they pass.
 * @param {string[]} argv
 * @param {'preview' | 'prefixes'} command
 * @param {Record<string, any>} io
 */
function prepare(argv, command, io) {
  /** @type {Record<string, string>} */
  let args;
  try {
    ({ args } = parseArgs(argv, { values: ['task', 'arm', 'label', 'source-label', ...(command === 'prefixes' ? ['budget', 'bound'] : [])] }));
  } catch (error) {
    throw new Refusal(/** @type {Error} */ (error).message);
  }
  if (args.label !== 'frozen') {
    throw new Refusal('--label frozen only');
  }
  const { task, arm } = args;
  if (!task || !arm) {
    throw new Refusal('needs --task and --arm');
  }
  if (HISTORICAL.includes(task)) {
    throw new Refusal(`${task} is a historical namespace: its records are read by the SAs' scripts, never written`);
  }
  /** @type {Record<string, number> | null} */
  let budgets = null;
  /** @type {number | null} */
  let bound = null;
  if (command === 'prefixes') {
    if (args.budget === undefined) {
      throw new Refusal('needs --budget');
    }
    budgets = parseBudgets(args.budget);
    if (args.bound !== undefined) {
      bound = /^\d+$/.test(args.bound) ? Number(args.bound) : NaN;
      if (!(bound >= 1 && bound <= 32)) {
        throw new Refusal(`bad --bound ${args.bound}`);
      }
    }
  }
  const planFile = join(io.plansDir ?? join(IG_DIR, 'plans'), `${task}.json`);
  if (!existsSync(planFile)) {
    throw new Refusal(`no plan ${rel(planFile)}`);
  }
  let grid;
  try {
    grid = fitScope(JSON.parse(readFileSync(planFile, 'utf8')), arm);
  } catch (error) {
    throw new Refusal(/** @type {Error} */ (error).message.replace(/^fit-read: /, ''));
  }
  const outDir = io.outDir ?? evidenceDir('frozen', task);
  const json = join(outDir, `fit-read-${command}-${arm}.json`);
  const md = join(outDir, `fit-read-${command}-${arm}.md`);
  for (const file of [json, md]) {
    if (existsSync(file)) {
      throw new Refusal(`a record is written once (${rel(file)})`);
    }
  }
  /** @type {{ path: string, sha256: string }[]} */
  const inputs = [];
  /** @param {string} file @returns {void} Indexes a file that is read, once. */
  const addInput = (file) => {
    const path = rel(file);
    if (!inputs.some((i) => i.path === path)) {
      inputs.push({ path, sha256: sha256File(file) });
    }
  };
  addInput(planFile);
  return {
    task, arm, grid, budgets, bound, sourceLabel: args['source-label'], json, md, inputs, addInput,
    runsDir: io.runsDir ?? evidenceDir('frozen', task, arm),
    rawDir: io.rawDir ?? artifactDir('frozen', task, arm),
  };
}

/**
 * @param {string} runsDir
 * @param {(file: string) => void} addInput
 * @returns {{ rows: { row: any, name: string }[], metas: Map<string, any>, problems: string[] }} The rows of every
 *   `*.runs.json` of the folder in name order, and each file's `meta` (null when it has none or is unreadable).
 */
function readPublished(runsDir, addInput) {
  /** @type {{ row: any, name: string }[]} */
  const rows = [];
  /** @type {Map<string, any>} */
  const metas = new Map();
  /** @type {string[]} */
  const problems = [];
  const names = existsSync(runsDir) ? readdirSync(runsDir).filter((n) => n.endsWith('.runs.json')).sort() : [];
  for (const name of names) {
    const file = join(runsDir, name);
    addInput(file);
    /** @type {any} */
    let doc;
    try {
      doc = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      problems.push(`unreadable ${rel(file)}`);
      metas.set(name, null);
      continue;
    }
    metas.set(name, isObject(doc) ? doc.meta ?? null : null);
    if (!isObject(doc) || !Array.isArray(doc.rows)) {
      problems.push(`${rel(file)} has no rows`);
      continue;
    }
    for (const row of doc.rows) {
      if (isObject(row)) {
        rows.push({ row, name });
      } else {
        problems.push(`a published row of ${rel(file)} is not an object`);
      }
    }
  }
  return { rows, metas, problems };
}

/** @param {number | null} v @returns {string} */
const fixed = (v) => (v === null ? '-' : v.toFixed(3));

/** @param {string} text @returns {string} The text safe in a Markdown table cell. */
const cellText = (text) => text.replace(/\|/g, '\\|');

/**
 * `preview --task <T> --arm <A> --label frozen --source-label <SL>`: the no-regression preview of the declared cells.
 * @param {string[]} argv
 * @param {{ outDir?: string, plansDir?: string, runsDir?: string, rawDir?: string, mp12b1?: (cell: string) => { path: string, report: any } | null }} [io]
 * @returns {Promise<number>}
 */
export async function previewCommand(argv, io = {}) {
  try {
    const ctx = prepare(argv, 'preview', io);
    const { task, arm, grid, inputs, addInput } = ctx;
    const published = readPublished(ctx.runsDir, addInput);
    const declaredKeys = new Set(grid.map((d) => d.rowKey));
    const unexpected = [...new Set(published.rows.map(({ row }) => String(row.rowKey)).filter((key) => !declaredKeys.has(key)))];
    const present = new Set(published.rows.map(({ row }) => row.rowKey));
    const missing = grid.filter((d) => !present.has(d.rowKey)).map((d) => d.rowKey);
    const lookup = io.mp12b1 ?? mp12b1Report;
    const cells = [...new Set(grid.map((d) => d.caseId))].map((cell) => {
      const declared = grid.filter((d) => d.caseId === cell);
      const keys = new Set(declared.map((d) => d.rowKey));
      const own = published.rows.map(({ row }) => row).filter((row) => keys.has(row.rowKey));
      /** @type {{ path: string, report: any } | null} */
      let found = null;
      let reportProblem = 'no MP12b1 report';
      try {
        found = lookup(cell);
      } catch {
        reportProblem = 'unreadable MP12b1 report';
      }
      if (found !== null) {
        addInput(abs(found.path));
        if (!Array.isArray(found.report?.runs)) {
          found = null;
          reportProblem = 'MP12b1 report has no runs';
        }
      }
      const result = previewCell(cell, declared, own, found === null ? [] : found.report.runs);
      if (found !== null) {
        return result;
      }
      for (const pair of result.pairs) {
        pair.problem = pair.problem === null || pair.problem === 'no MP12b1 run' ? reportProblem : `${pair.problem}; ${reportProblem}`;
      }
      result.problems = result.pairs.map((p) => `rep ${p.rep}: ${p.problem}`);
      return result;
    });
    const meta = await buildMeta({ task, label: 'frozen', kind: 'fit-read-preview', sourceLabel: ctx.sourceLabel });
    const note = 'Five fitting seeds and a different time: a fitting warning, never the stage-4 no-regression verdict.';
    const record = { meta, arm, note, declared: grid.length, missing, unexpected, cells, problems: published.problems, inputs };
    const rows = cells.map((c) => `| ${cellText(c.cell)} | ${c.todayTen} | ${c.afterTen} | ${c.ratios.map(fixed).join(', ')} | ${fixed(c.geo)} | ${fixed(c.lower)} | ${c.pass === null ? '-' : c.pass ? 'yes' : 'no'} | ${cellText(c.problems.join('; '))} |`);
    const list = (/** @type {string[]} */ keys) => (keys.length === 0 ? ['None.'] : keys.map((k) => `- ${k}`));
    const text = [
      `# Fitting reader: preview of ${arm} (${task})`,
      '',
      banner(meta),
      '',
      note,
      '',
      '| Cell | today ten (of 5) | after ten (of 5) | ratios rep 0-4 | geo | lower | lower >= 0.9 | problems |',
      '|---|---|---|---|---|---|---|---|',
      ...rows,
      '',
      '## Missing rows',
      '',
      ...list(missing),
      '',
      '## Unexpected rows',
      '',
      ...list(unexpected),
      '',
      '## Unreadable runs files',
      '',
      ...list(published.problems),
    ].join('\n');
    writeJson(ctx.json, record);
    writeText(ctx.md, text);
    const problemCount = cells.reduce((n, c) => n + c.problems.length, 0) + published.problems.length;
    process.stdout.write(`fit-read: wrote ${rel(ctx.json)} (${cells.length} cells, ${problemCount} problems, ${unexpected.length} unexpected)\n`);
    return 0;
  } catch (error) {
    if (error instanceof Refusal) {
      process.stderr.write(`fit-read: ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

/**
 * `prefixes --task <T> --arm <A> --budget <level>=<units>[,...] [--bound <n>] --label frozen --source-label <SL>`: the call
 * prefixes of every declared row against the proposed budgets and bound.
 * @param {string[]} argv
 * @param {{ outDir?: string, plansDir?: string, runsDir?: string, rawDir?: string }} [io]
 * @returns {Promise<number>}
 */
export async function prefixesCommand(argv, io = {}) {
  try {
    const ctx = prepare(argv, 'prefixes', io);
    const { task, arm, grid, bound, inputs, addInput } = ctx;
    const budgets = /** @type {Record<string, number>} */ (ctx.budgets);
    const published = readPublished(ctx.runsDir, addInput);
    /** @type {string[]} */
    const rawKeys = [];
    const rows = grid.map((declared) => {
      const { rowKey, shard } = declared;
      const shardDir = join(ctx.rawDir, shard);
      const logs = join(shardDir, 'logs');
      const held = published.rows.filter(({ row }) => row.rowKey === rowKey);
      const status = held.length === 0 ? 'missing' : held.length > 1 ? 'duplicate' : null;
      const wrong = held.length === 1 ? declaredRowProblem(declared, held[0].row) : null;
      const rowStatus = status ?? (wrong !== null ? 'invalid' : ingestRow(held[0].row, { quantity: 10 }).status);
      /** @type {string[]} */
      const identity = wrong === null ? [] : [wrong];
      /** @param {string} file @returns {{ text: string } | null} */
      const readIfPresent = (file) => {
        if (!existsSync(file)) {
          return null;
        }
        addInput(file);
        return { text: readFileSync(file, 'utf8') };
      };
      let done = false;
      const state = readIfPresent(join(shardDir, 'state.json'));
      if (state !== null) {
        try {
          done = JSON.parse(state.text)?.done === true;
        } catch {
          done = false;
        }
      }
      /** @type {any} */
      let shardDoc = null;
      const shardFile = join(shardDir, 'shard.json');
      const shardRead = readIfPresent(shardFile);
      if (shardRead !== null) {
        try {
          shardDoc = JSON.parse(shardRead.text);
        } catch {
          identity.push(`unreadable ${rel(shardFile)}`);
        }
      }
      /** @type {Record<string, any>[] | null} */
      let rowLines = null;
      const identityFile = join(logs, `${rowKey}.row.jsonl`);
      const identityRead = readIfPresent(identityFile);
      if (identityRead !== null) {
        const parsed = parseLines(identityRead.text, rel(identityFile));
        if (parsed.problems.length === 0) {
          rowLines = parsed.lines;
        } else {
          identity.push(`unreadable ${rel(identityFile)}`);
        }
      }
      const holder = held.length > 0 ? held[0].name : `${shard}.runs.json`;
      const meta = published.metas.get(holder) ?? null;
      identity.push(...rawIdentityProblems({ task, arm, declared, shard: shardDoc, rowLines, meta }));
      const names = existsSync(logs) ? readdirSync(logs).sort() : [];
      for (const name of names) {
        if (name.endsWith('.row.jsonl')) {
          rawKeys.push(name.slice(0, -'.row.jsonl'.length));
        }
      }
      const journals = names.filter((n) => n.startsWith(`${rowKey}.`) && n.endsWith('.jsonl') && !n.endsWith('.row.jsonl') && n !== `${rowKey}.link.jsonl`);
      /** @type {string[]} */
      const parseProblems = [];
      /** @type {Record<string, any>[]} */
      const lines = [];
      for (const name of journals) {
        const file = join(logs, name);
        const parsed = parseLines(/** @type {{ text: string }} */ (readIfPresent(file)).text, rel(file));
        lines.push(...parsed.lines);
        parseProblems.push(...parsed.problems);
      }
      /** @type {Record<string, any>[] | null} */
      let links = null;
      const linkFile = join(logs, `${rowKey}.link.jsonl`);
      const linkRead = readIfPresent(linkFile);
      if (linkRead !== null) {
        const parsed = parseLines(linkRead.text, rel(linkFile));
        links = parsed.lines;
        parseProblems.push(...parsed.problems);
      }
      // The publication's markdown is read by publicationOf (it names the published journal): index it first (T02d).
      const runsMd = join(ctx.runsDir, `${shard}.runs.md`);
      if (existsSync(runsMd)) {
        addInput(runsMd);
      }
      const publication = publicationOf(ctx.runsDir, shard);
      const ledger = rowLedger(lines, links);
      const prefixes = callPrefixes(lines, budgets);
      /** @type {string[]} */
      const problems = [];
      for (const problem of [...parseProblems, ...ledger.problems, ...prefixes.problems]) {
        if (!problems.includes(problem)) {
          problems.push(problem);
        }
      }
      /** @type {Record<string, number>} */
      const calls = {};
      for (const call of prefixes.calls) {
        calls[call.status] = (calls[call.status] ?? 0) + 1;
      }
      const ids = (/** @type {string} */ wanted) => prefixes.calls.filter((c) => c.status === wanted).map((c) => c.call);
      return {
        rowKey, cell: declared.caseId, rep: declared.rep, shard,
        publication,
        shardDone: done,
        rowStatus,
        identity,
        complete: ledger.complete,
        unreadable: parseProblems.length > 0,
        problems,
        calls,
        maxSpent: prefixes.calls.length === 0 ? null : Math.max(...prefixes.calls.map((c) => c.spent)),
        affected: ids('affected'),
        potentiallyAffected: ids('potentially-affected'),
        ambiguous: ids('ambiguous'),
        bound: bound === null ? null : boundFirings(prefixes.calls, bound),
        hasJournal: journals.length > 0,
        hasRow: held.length > 0,
      };
    });
    const declaredKeys = new Set(grid.map((d) => d.rowKey));
    const unexpected = [...new Set([...published.rows.map(({ row }) => String(row.rowKey)), ...rawKeys].filter((key) => !declaredKeys.has(key)))];
    const summary = {
      declared: grid.length,
      present: rows.filter((r) => r.hasRow && r.hasJournal).length,
      missing: rows.filter((r) => r.rowStatus === 'missing').map((r) => r.rowKey),
      unexpected,
      identityRows: rows.filter((r) => r.identity.length > 0).length,
      incompleteRows: rows.filter((r) => !r.complete).length,
      unreadableRows: rows.filter((r) => r.unreadable).length,
      ambiguousRows: rows.filter((r) => r.ambiguous.length > 0).length,
      affectedCalls: rows.reduce((n, r) => n + r.affected.length, 0),
      potentiallyAffectedCalls: rows.reduce((n, r) => n + r.potentiallyAffected.length, 0),
      ambiguousCalls: rows.reduce((n, r) => n + r.ambiguous.length, 0),
      boundFirings: rows.filter((r) => r.bound?.fires === true).length,
    };
    const out = rows.map(({ hasJournal, hasRow, ...row }) => row);
    const meta = await buildMeta({ task, label: 'frozen', kind: 'fit-read-prefixes', sourceLabel: ctx.sourceLabel });
    const record = { meta, arm, budgets, bound, rows: out, summary, inputs };
    const budgetText = Object.entries(budgets).map(([level, units]) => `${level} ${units}`).join(', ');
    const cellLines = [...new Set(out.map((r) => r.cell))].map((cell) => {
      const own = out.filter((r) => r.cell === cell);
      const sum = (/** @type {(r: typeof out[number]) => number} */ pick) => own.reduce((n, r) => n + pick(r), 0);
      return `- ${cell}: ${own.length} rows, ${sum((r) => r.affected.length)} affected, ${sum((r) => r.potentiallyAffected.length)} potentially affected, ${sum((r) => r.ambiguous.length)} ambiguous calls, ${own.filter((r) => !r.complete).length} incomplete, ${own.filter((r) => r.bound?.fires === true).length} bound firings`;
    });
    const flagged = out.filter((r) => r.identity.length > 0 || r.problems.length > 0);
    const flaggedLines = flagged.flatMap((r) => [
      `### ${r.rowKey} (${r.rowStatus}, publication ${r.publication}, shard done ${r.shardDone})`,
      '',
      ...r.identity.map((p) => `- identity: ${p}`),
      ...r.problems.map((p) => `- problem: ${p}`),
      '',
    ]);
    const text = [
      `# Fitting reader: call prefixes of ${arm} (${task})`,
      '',
      banner(meta),
      '',
      `Budgets: ${budgetText}. Bound: ${bound === null ? 'none' : bound}.`,
      '',
      ...cellLines,
      '',
      '## Rows with an identity problem or a problem',
      '',
      ...(flagged.length === 0 ? ['None.', ''] : flaggedLines),
      `Missing rows: ${summary.missing.length === 0 ? 'none' : summary.missing.join(', ')}. Unexpected rows: ${unexpected.length === 0 ? 'none' : unexpected.join(', ')}.`,
    ].join('\n');
    writeJson(ctx.json, record);
    writeText(ctx.md, text);
    process.stdout.write(`fit-read: wrote ${rel(ctx.json)} (${rows.length} rows, ${summary.missing.length} missing, ${summary.identityRows} identity problems, ${summary.incompleteRows} incomplete, ${summary.affectedCalls} affected, ${summary.potentiallyAffectedCalls} potentially affected, ${summary.ambiguousCalls} ambiguous, ${summary.boundFirings} bound firings)\n`);
    return 0;
  } catch (error) {
    if (error instanceof Refusal) {
      process.stderr.write(`fit-read: ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>} The exit code.
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'preview') {
    return previewCommand(rest);
  }
  if (command === 'prefixes') {
    return prefixesCommand(rest);
  }
  process.stderr.write(`${USAGE}\n`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
