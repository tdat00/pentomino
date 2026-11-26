// @ts-check
// The trace reader (P2-13r, contracts.md C9): one function reads a measured row's journal folder and returns its work
// ledger. The frozen ledger rules of `verdicts.mjs` apply unchanged; a lost file, a lost row line or empty evidence is
// a problem, so missing evidence is incomplete, never zero work.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseLines, rowLedger } from '../verdicts.mjs';

/**
 * @typedef {object} WorkerFile
 * @property {string} name
 * @property {number} pid
 * @property {number} threadId
 * @property {Record<string, any>[]} lines
 */

/**
 * @typedef {object} RowFolder
 * @property {Record<string, any> | null} rowLine The single parsed line of `<row>.row.jsonl`, `null` when absent.
 * @property {Record<string, any>[] | null} linkLines The lines of `<row>.link.jsonl`, `null` when the file is absent.
 * @property {WorkerFile[]} workerFiles The `<row>.<pid>.<threadId>.jsonl` files in file-name order.
 * @property {string[]} problems
 */

/**
 * @typedef {object} Outcome The raw result of one ended call (C9, C11), as its `start` and `end` lines wrote it.
 * @property {any} stage
 * @property {any} attempt
 * @property {any} result
 * @property {any} igNoWindow
 * @property {any} budgetStop
 */

/**
 * @typedef {{ close: number, rescue: number, rerate: number }} RerateStarts
 */

/**
 * @typedef {import('../verdicts.mjs').RowLedger & { outcomes: Outcome[], rerateStarts: RerateStarts }} RowWork
 */

/** @param {string} text @returns {string} The text as a literal inside a regular expression. */
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @param {string} a @param {string} b @returns {number} Code-point order of two file names. */
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Reads the files of one row's journal folder (C1 to C3). A missing folder is a folder without files.
 * @param {string} dir The row's `IG_LOG_DIR`.
 * @param {string} row The row key (`IG_ROW`).
 * @returns {RowFolder}
 */
export function readRowFolder(dir, row) {
  if (typeof dir !== 'string' || typeof row !== 'string' || row === '') {
    throw new TypeError('trace-reader: readRowFolder needs the folder and the row key');
  }
  const workerName = new RegExp(`^${escapeRegExp(row)}\\.(\\d+)\\.(\\d+)\\.jsonl$`);
  /** @type {string[]} */
  const problems = [];
  /** @type {Record<string, any> | null} */
  let rowLine = null;
  /** @type {Record<string, any>[] | null} */
  let linkLines = null;
  /** @type {WorkerFile[]} */
  const workerFiles = [];
  const entries = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : [];
  entries.sort((a, b) => byName(a.name, b.name));
  for (const entry of entries) {
    const { name } = entry;
    const worker = workerName.exec(name);
    if (worker === null && name !== `${row}.row.jsonl` && name !== `${row}.link.jsonl`) {
      problems.push(`foreign file ${name}`);
    }
    if (!entry.isFile()) {
      continue;
    }
    const parsed = parseLines(readFileSync(join(dir, name), 'utf8'), name);
    problems.push(...parsed.problems);
    if (worker !== null) {
      workerFiles.push({ name, pid: Number(worker[1]), threadId: Number(worker[2]), lines: parsed.lines });
    } else if (name === `${row}.row.jsonl`) {
      rowLine = parsed.lines[0] ?? null;
      if (parsed.lines.length > 1) {
        problems.push('row line mismatch');
      }
    } else if (name === `${row}.link.jsonl`) {
      linkLines = parsed.lines;
    }
  }
  return { rowLine, linkLines, workerFiles, problems };
}

/**
 * The work ledger of one measured row (C9): `rowLedger` of `verdicts.mjs` over the worker journals in file-name order,
 * plus the checks that a lost file, a lost row line or empty evidence must fail.
 * @param {string} dir The row's `IG_LOG_DIR`.
 * @param {{ row: string, seed: string, acceptedCount: number }} expect
 * @returns {RowWork}
 */
export function rowWork(dir, expect) {
  if (typeof expect !== 'object' || expect === null || typeof expect.row !== 'string'
    || typeof expect.seed !== 'string' || !Number.isFinite(expect.acceptedCount)) {
    throw new TypeError('trace-reader: rowWork needs { row, seed, acceptedCount }');
  }
  const folder = readRowFolder(dir, expect.row);
  const lines = folder.workerFiles.flatMap((file) => file.lines);
  const ledger = rowLedger(lines, folder.linkLines);
  /** @type {string[]} */
  const problems = [...ledger.problems];
  const add = (/** @type {string} */ problem) => {
    if (!problems.includes(problem)) {
      problems.push(problem);
    }
  };
  for (const problem of folder.problems) {
    add(problem);
  }
  if (folder.rowLine === null) {
    add('no row line');
  } else if (folder.rowLine.row !== expect.row || folder.rowLine.seed !== expect.seed) {
    add('row line mismatch');
  }
  if (expect.acceptedCount > 0 && !lines.some((line) => line.t === 'start')) {
    add('empty evidence');
  }
  for (const link of folder.linkLines ?? []) {
    if (link.ev !== 'worker-end') {
      continue;
    }
    const file = folder.workerFiles.find((f) => f.pid === link.pid && f.threadId === link.threadId);
    const header = file?.lines[0];
    if (file === undefined || header === undefined || header.t !== 'worker'
      || header.pid !== link.pid || header.threadId !== link.threadId) {
      add(`missing worker journal ${link.pid}/${link.threadId}`);
    }
  }

  /** @type {Map<string, Record<string, any>>} */
  const ends = new Map();
  for (const line of lines) {
    if (line.t === 'end' && typeof line.call === 'string' && !ends.has(line.call)) {
      ends.set(line.call, line);
    }
  }
  /** @type {Outcome[]} */
  const outcomes = [];
  /** @type {Set<string>} */
  const seen = new Set();
  for (const line of lines) {
    if (line.t !== 'start' || typeof line.call !== 'string' || seen.has(line.call)) {
      continue;
    }
    seen.add(line.call);
    const end = ends.get(line.call);
    if (end !== undefined) {
      outcomes.push({
        stage: line.stage, attempt: line.attempt, result: end.result, igNoWindow: end.igNoWindow, budgetStop: end.budgetStop,
      });
    }
  }
  /** @type {RerateStarts} */
  const rerateStarts = { close: 0, rescue: 0, rerate: 0 };
  for (const line of lines) {
    if (line.t === 'rerate' && (line.phase === 'close' || line.phase === 'rescue' || line.phase === 'rerate')) {
      rerateStarts[line.phase] += 1;
    }
  }
  return { ...ledger, complete: problems.length === 0, problems, outcomes, rerateStarts };
}

/**
 * The `ledger` input of `workRule` and `classVerdict` of `verdicts.mjs`: the ten fields of C9, without `outcomes` and
 * `rerateStarts`. It is for building that input only; a row is stored and published as the whole `rowWork` result.
 * @param {RowWork} result
 * @returns {import('../verdicts.mjs').RowLedger}
 */
export function workLedger(result) {
  const { complete, problems, calls, ended, terminated, open, lo, hi, ratingWork, countWork } = result;
  return { complete, problems, calls, ended, terminated, open, lo, hi, ratingWork, countWork };
}
