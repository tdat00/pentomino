// @ts-check
// Request-level arms (IGP-00 §7): one-row calibrate runs of a tree, with admission by the invocation's horizon, an
// append-only journal and no rerun of a started row.
//   node tools\ig-proto\arm.mjs run --task <T> --arm <A> --shard <S> --variant <V> --workers <1-8>
//        --cases <case>:<a>-<b>[,...] --row-limit-s <R> --label <L> --source-label <SL> --horizon-s <H>
//        [--max-rows <n>] [--dry-run]
//   node tools\ig-proto\arm.mjs publish --task <T> --arm <A> --label <L> --source-label <SL>
//   node tools\ig-proto\arm.mjs status --task <T> --arm <A> --shard <S> --label <L> [--check-rows]
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { artifactDir, elapsedS, evidenceDir, parseArgs, rel } from './lib/paths.mjs';
import { banner, buildMeta, harnessInfo, writeJson, writeJsonl, writeText } from './lib/records.mjs';
import { caseBoard } from './lib/sets.mjs';
import { ensureTree } from './lib/tree.mjs';

const MAX_PUBLISHED_BYTES = 5 * 1024 * 1024;

class Stop extends Error {}

/**
 * @param {string} text `<case>:<a>-<b>[,<case>:<a>-<b>...]`
 * @returns {{ caseId: string, rep: number }[]}
 */
export function parseCases(text) {
  /** @type {{ caseId: string, rep: number }[]} */
  const rows = [];
  for (const part of text.split(',')) {
    const match = /^([A-Za-z0-9._-]+):(\d+)(?:-(\d+))?$/.exec(part);
    if (match === null) {
      throw new Stop(`bad --cases entry: ${part}`);
    }
    const from = Number(match[2]);
    const to = match[3] === undefined ? from : Number(match[3]);
    if (to < from) {
      throw new Stop(`bad --cases range: ${part}`);
    }
    for (let rep = from; rep <= to; rep += 1) {
      rows.push({ caseId: match[1], rep });
    }
  }
  return rows;
}

/** @param {string} caseId @param {number} rep @returns {string} */
export const rowKey = (caseId, rep) => `${caseId}~${rep}`;

/**
 * The one-row case of a row, built from the catalogue entry (the original rep stays in the seed).
 * @param {string} caseId
 * @param {number} rep
 */
export function oneRowCase(caseId, rep) {
  const entry = caseBoard(caseId);
  if (entry.id !== caseId || entry.seedPrefix !== 'landscape') {
    throw new Stop(`catalogue entry ${caseId} is not a landscape case`);
  }
  const seed = `landscape/${caseId}/${rep}`;
  return {
    seed,
    case: {
      id: caseId, boardRows: entry.boardRows, rotation: entry.rotation, levelId: entry.levelId, maxActive: entry.maxActive,
      quantity: 10, uniqueness: 'any', seedPrefix: 'landscape', repetitions: 1, seeds: [seed],
    },
  };
}

/** @param {string} file @returns {any[]} */
function readLines(file) {
  return existsSync(file)
    ? readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l))
    : [];
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function runCommand(argv) {
  const { args, on } = parseArgs(argv, {
    values: ['task', 'arm', 'shard', 'variant', 'workers', 'cases', 'row-limit-s', 'label', 'source-label', 'horizon-s', 'max-rows'],
    switches: ['dry-run'],
  });
  for (const name of ['task', 'arm', 'shard', 'variant', 'workers', 'cases', 'row-limit-s', 'label', 'source-label']) {
    if (args[name] === undefined) {
      throw new Stop(`--${name} is required`);
    }
  }
  const horizonS = Number(args['horizon-s'] ?? 285);
  const limitS = Number(args['row-limit-s']);
  const workers = Number(args.workers);
  const dir = artifactDir(args.label, args.task, args.arm, args.shard);
  const tree = await ensureTree(args.variant, { sourceLabel: args['source-label'] });
  const harness = harnessInfo();
  const flags = {
    task: args.task, arm: args.arm, shard: args.shard, variant: args.variant, workers, cases: args.cases, rowLimitS: limitS,
    label: args.label, sourceLabel: args['source-label'],
  };
  const shardFile = join(dir, 'shard.json');
  /** @type {any} */
  let shard;
  if (existsSync(shardFile)) {
    shard = JSON.parse(readFileSync(shardFile, 'utf8'));
    if (!isDeepStrictEqual(shard.flags, flags) || shard.treeId !== tree.treeId || shard.harnessHash !== harness.harnessHash) {
      throw new Stop("the shard's flags, tree or harness changed: nothing was measured");
    }
  } else {
    const rows = parseCases(args.cases).map(({ caseId, rep }) => ({ key: rowKey(caseId, rep), caseId, rep, ...oneRowCase(caseId, rep) }));
    /** @type {Record<string, any>} */
    const cases = {};
    for (const row of rows) {
      cases[row.caseId] = caseBoard(row.caseId);
    }
    shard = {
      format: 'ig-proto-shard', version: 1, ...flags, flags, cases, rows,
      treeId: tree.treeId, copyDigest: tree.copyDigest, harnessHash: harness.harnessHash, createdAt: new Date().toISOString(),
    };
    writeJson(shardFile, shard);
  }
  const journalFile = join(dir, 'rows.jsonl');
  const journal = readLines(journalFile);
  for (const row of shard.rows) {
    const started = journal.some((l) => l.t === 'started' && l.key === row.key);
    const recorded = journal.find((l) => l.t === 'recorded' && l.key === row.key);
    if (started && recorded === undefined) {
      throw new Stop(`row ${row.key} was started and not recorded: fix round needed`);
    }
    if (recorded?.check?.ok === false) {
      throw new Stop(`row ${row.key} failed its check (${recorded.check.problems.join('; ')}): fix round needed`);
    }
  }
  const recordedKeys = new Set(journal.filter((l) => l.t === 'recorded').map((l) => l.key));
  const runner = await import(pathToFileURL(join(tree.root, 'tools', 'bench', 'runner.js')).href);

  /**
   * @param {any} row
   * @returns {string} Path of the matrix, written and checked.
   */
  const writeMatrix = (row) => {
    const rowDir = join(dir, 'rows', row.key);
    const file = join(rowDir, 'matrix.json');
    const matrix = { version: 1, profile: 'smoke', cases: [row.case] };
    writeJson(file, matrix);
    const readBack = JSON.parse(readFileSync(file, 'utf8'));
    const checked = runner.checkMatrix(readBack);
    if (!isDeepStrictEqual(readBack, matrix) || !checked.ok) {
      throw new Stop(`the matrix of row ${row.key} is not valid: ${checked.ok ? 'it differs from the object checked' : checked.issues[0]?.message}`);
    }
    return file;
  };

  if (on.has('dry-run')) {
    for (const row of shard.rows) {
      writeMatrix(row);
    }
    process.stdout.write(`arm: dry run: ${shard.rows.length} one-row matrices written and checked in ${rel(dir)}\n`);
    return 0;
  }

  const logChain = tree.chain.includes('log');
  const logDir = join(dir, 'logs');
  mkdirSync(logDir, { recursive: true });
  const calibrate = await import(pathToFileURL(join(tree.root, 'tools', 'calibrate.mjs')).href);
  const maxRows = args['max-rows'] === undefined ? Infinity : Number(args['max-rows']);
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();
  let ran = 0;
  /** @type {Record<string, number>} */
  const codes = { ...(existsSync(join(dir, 'state.json')) ? JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')).calibrateCodes : {}) };
  for (const row of shard.rows) {
    if (recordedKeys.has(row.key)) {
      continue;
    }
    if (ran >= maxRows || elapsedS() + limitS + 10 > horizonS) {
      break;
    }
    const matrixFile = writeMatrix(row);
    const rowDir = join(dir, 'rows', row.key);
    appendFileSync(journalFile, `${JSON.stringify({ t: 'started', key: row.key, caseId: row.caseId, rep: row.rep, seed: row.seed, at: new Date().toISOString(), pid: process.pid })}\n`);
    process.env.IG_LOG_DIR = logDir;
    process.env.IG_ROW = row.key;
    process.env.IG_SEED = row.seed;
    process.env.IG_SOURCE_LABEL = args['source-label'];
    const code = await calibrate.run(
      ['--matrix', matrixFile, '--workers', String(workers), '--fresh-process', '--no-cancel-probe', '--child-limit-s', String(limitS), '--output', join(rowDir, 'report')],
      { stderr: (/** @type {string} */ text) => appendFileSync(join(rowDir, 'calibrate.log'), text) },
    );
    /** @type {string[]} */
    const problems = [];
    const report = JSON.parse(readFileSync(join(rowDir, 'report.json'), 'utf8'));
    const run = report.runs?.[0];
    if (report.runs?.length !== 1) {
      problems.push(`the report holds ${report.runs?.length} runs, expected 1`);
    } else {
      if (run.seed !== row.seed) {
        problems.push(`the run's seed is ${run.seed}, expected ${row.seed}`);
      }
      if (run.caseId !== row.caseId) {
        problems.push(`the run's case is ${run.caseId}, expected ${row.caseId}`);
      }
    }
    if (logChain) {
      const rowLine = readLines(join(logDir, `${row.key}.row.jsonl`)).find((l) => l.t === 'row');
      if (rowLine === undefined) {
        problems.push('the journal has no row line');
      } else if (rowLine.seed !== row.seed) {
        problems.push(`the row line names seed ${rowLine.seed}`);
      }
    }
    const censoredAtR = run?.errors?.some((/** @type {{ code: string }} */ e) => e.code === 'child-timeout') === true;
    if (censoredAtR && limitS >= 260) {
      problems.push(`the row was censored at R = ${limitS} s: a defect`);
    }
    appendFileSync(journalFile, `${JSON.stringify({
      t: 'recorded', key: row.key, rep: row.rep, seed: row.seed, localRep: run?.rep ?? null, responseMs: run?.responseMs ?? null,
      acceptedCount: run?.acceptedCount ?? null, partialReason: run?.partialReason ?? null, calibrateCode: code, censoredAtR,
      at: new Date().toISOString(), check: { ok: problems.length === 0, problems },
    })}\n`);
    codes[row.key] = code;
    ran += 1;
    if (problems.length > 0) {
      throw new Stop(`row ${row.key}: ${problems.join('; ')}`);
    }
  }
  const recorded = readLines(journalFile).filter((l) => l.t === 'recorded').length;
  const seconds = Math.round(elapsedS() * 1000) / 1000;
  writeJson(join(dir, 'state.json'), {
    format: 'ig-proto-state', version: 1, task: args.task, arm: args.arm, shard: args.shard, label: args.label,
    done: recorded === shard.rows.length, recorded, expected: shard.rows.length, treeId: tree.treeId, harnessHash: harness.harnessHash,
    calibrateCodes: codes,
    lastInvocation: { start: startedAt, end: new Date().toISOString(), seconds, horizonS, progress: { rows: ran } },
  });
  process.stdout.write(`arm: ${ran} row(s) recorded in this invocation, ${recorded} of ${shard.rows.length} in all (${seconds} s)\n`);
  return 0;
}

/**
 * @param {number | null} ms
 * @returns {string}
 */
const sec = (ms) => (ms === null || ms === undefined ? '-' : (ms / 1000).toFixed(2));

/** @param {string[]} argv @returns {Promise<number>} */
async function publishCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'arm', 'label', 'source-label'] });
  const armDir = artifactDir(args.label, args.task, args.arm);
  if (!existsSync(armDir)) {
    throw new Stop(`no arm ${args.arm} of ${args.task}`);
  }
  const shards = readdirSync(armDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  if (shards.length === 0) {
    throw new Stop(`arm ${args.arm} of ${args.task} has no shard`);
  }
  for (const name of shards) {
    const dir = join(armDir, name);
    const state = existsSync(join(dir, 'state.json')) ? JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')) : null;
    if (state?.done !== true) {
      throw new Stop(`shard ${name} of arm ${args.arm} is not done: nothing published`);
    }
    const shard = JSON.parse(readFileSync(join(dir, 'shard.json'), 'utf8'));
    const meta = await buildMeta({ task: args.task, label: args.label, kind: 'runs', trees: [shard.variant], sourceLabel: args['source-label'] });
    const rows = shard.rows.map((/** @type {any} */ row) => {
      const run = JSON.parse(readFileSync(join(dir, 'rows', row.key, 'report.json'), 'utf8')).runs[0];
      return { rowKey: row.key, caseId: row.caseId, rep: row.rep, seed: row.seed, localRep: run.rep, run };
    });
    writeJson(evidenceDir(args.label, args.task, args.arm, `${name}.runs.json`), { meta, shard: name, rows });

    const calls = collectCalls(dir, shard.rows.map((/** @type {{ key: string }} */ r) => r.key));
    const big = calls.length > 0 && calls.reduce((s, l) => s + l.length + 1, 0) > MAX_PUBLISHED_BYTES;
    const lines = [`# ${args.task} arm ${args.arm}, shard ${name}: runs`, '', banner(meta), ''];
    for (const caseId of [...new Set(rows.map((/** @type {any} */ r) => r.caseId))]) {
      lines.push(`## ${caseId}`, '', '| Row key | Seed | T1 s | T10 s | Response s | Accepted | Partial reason | Censored at R |', '|---|---|---:|---:|---:|---:|---|---|');
      for (const r of rows.filter((/** @type {any} */ x) => x.caseId === caseId)) {
        const censored = r.run.errors.some((/** @type {{ code: string }} */ e) => e.code === 'child-timeout');
        lines.push(`| ${r.rowKey} | ${r.seed} | ${sec(r.run.firstReadyMs)} | ${sec(r.run.tenthReadyMs)} | ${sec(r.run.responseMs)} | ${r.run.acceptedCount} | ${r.run.partialReason ?? '-'} | ${censored ? 'yes' : 'no'} |`);
      }
      lines.push('');
    }
    lines.push(calls.length === 0
      ? 'This tree writes no journal.'
      : `The journal lines are in \`${name}.calls${big ? '-summary' : ''}.jsonl\`.`);
    if (big) {
      lines.push('', 'The full journal is above 5 MB: only its `row`, `start` and `end` lines are published; the raw files stay under tests/artifacts/ig-proto/.');
    }
    writeText(evidenceDir(args.label, args.task, args.arm, `${name}.runs.md`), lines.join('\n'));
    if (calls.length > 0) {
      const kept = big ? calls.filter((l) => /"t":"(row|start|end)"/.test(l)) : calls;
      writeJsonl(evidenceDir(args.label, args.task, args.arm, `${name}.calls${big ? '-summary' : ''}.jsonl`), kept.map((l) => JSON.parse(l)));
    }
    process.stdout.write(`arm: published ${args.arm}/${name}: ${rows.length} rows, ${calls.length} journal lines\n`);
  }
  return 0;
}

/**
 * Journal lines of a shard's logs, sorted by row, file and line, without the `accepted` blocks.
 * @param {string} dir
 * @param {string[]} keys
 * @returns {string[]} JSON texts.
 */
function collectCalls(dir, keys) {
  const logs = join(dir, 'logs');
  if (!existsSync(logs)) {
    return [];
  }
  const names = readdirSync(logs).sort();
  /** @type {string[]} */
  const out = [];
  for (const key of keys) {
    for (const name of names.filter((n) => n.startsWith(`${key}.`))) {
      for (const line of readFileSync(join(logs, name), 'utf8').split(/\r?\n/)) {
        if (line.trim() !== '') {
          const parsed = JSON.parse(line);
          delete parsed.accepted;
          out.push(JSON.stringify(parsed));
        }
      }
    }
  }
  return out;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function statusCommand(argv) {
  const { args, on } = parseArgs(argv, { values: ['task', 'arm', 'shard', 'label', 'source-label'], switches: ['check-rows'] });
  const dir = artifactDir(args.label, args.task, args.arm, args.shard);
  const shard = JSON.parse(readFileSync(join(dir, 'shard.json'), 'utf8'));
  const journal = readLines(join(dir, 'rows.jsonl'));
  const state = existsSync(join(dir, 'state.json')) ? JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')) : null;
  const rows = shard.rows.map((/** @type {any} */ row) => ({
    key: row.key,
    started: journal.filter((l) => l.t === 'started' && l.key === row.key).length,
    recorded: journal.filter((l) => l.t === 'recorded' && l.key === row.key).length,
  }));
  process.stdout.write(`${JSON.stringify({ shard: args.shard, done: state?.done ?? false, rows })}\n`);
  if (!on.has('check-rows')) {
    return 0;
  }
  /** @type {string[]} */
  const problems = [];
  if (new Set(shard.rows.map((/** @type {{ key: string }} */ r) => r.key)).size !== shard.rows.length) {
    problems.push('the row keys are not distinct');
  }
  if (state?.done !== true) {
    problems.push('the shard is not done');
  }
  const logChain = shard.variant === 'log' || (await ensureTree(shard.variant)).chain.includes('log');
  for (const row of shard.rows) {
    const started = journal.filter((l) => l.t === 'started' && l.key === row.key);
    const recorded = journal.filter((l) => l.t === 'recorded' && l.key === row.key);
    if (started.length !== 1 || recorded.length !== 1) {
      problems.push(`${row.key}: ${started.length} started and ${recorded.length} recorded lines`);
      continue;
    }
    const line = recorded[0];
    if (line.seed !== `landscape/${row.caseId}/${row.rep}` || line.rep !== row.rep) {
      problems.push(`${row.key}: the recorded line has seed ${line.seed} and rep ${line.rep}`);
    }
    if (line.localRep !== 0) {
      problems.push(`${row.key}: the recorded local rep is ${line.localRep}, expected 0`);
    }
    const run = JSON.parse(readFileSync(join(dir, 'rows', row.key, 'report.json'), 'utf8')).runs?.[0];
    if (run?.seed !== `landscape/${row.caseId}/${row.rep}` || run?.rep !== 0) {
      problems.push(`${row.key}: the run has seed ${run?.seed} and local rep ${run?.rep}`);
    }
    if (logChain) {
      const rowLine = readLines(join(dir, 'logs', `${row.key}.row.jsonl`)).find((l) => l.t === 'row');
      if (rowLine?.seed !== `landscape/${row.caseId}/${row.rep}`) {
        problems.push(`${row.key}: the row line names seed ${rowLine?.seed}`);
      }
    }
  }
  if (problems.length > 0) {
    for (const p of problems) {
      process.stderr.write(`arm: check-rows: ${p}\n`);
    }
    return 1;
  }
  process.stdout.write(`arm: check-rows: OK, ${shard.rows.length} rows keep their key, rep and seed apart from calibrate's local rep\n`);
  return 0;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const [command, ...rest] = argv;
  try {
    if (command === 'run') {
      return await runCommand(rest);
    }
    if (command === 'publish') {
      return await publishCommand(rest);
    }
    if (command === 'status') {
      return await statusCommand(rest);
    }
    throw new Stop('usage: arm.mjs run|publish|status ...');
  } catch (e) {
    process.stderr.write(`arm: ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
  setTimeout(() => process.exit(process.exitCode ?? 0), 10000).unref();
}
