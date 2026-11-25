// @ts-check
// The phase-2 driver (P2-13a): the frozen plan of the 1,013 enumerated rows, the seal of every measured source, tool
// and fixed input, and the ledger with its admission, reservation and stage-B readout checks (contracts C7, C12, C13).
// The locked wrapper is run-group.ps1. No engine runs here, and no real seal or row run happens in lane T.
import { execFileSync, spawnSync } from 'node:child_process';
import {
  closeSync, existsSync, fsyncSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, writeSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { rectRows } from '../../bench/calibration-reference.js';
import { computeSourceDigest } from '../../bench/report.js';
import { rowMatrix, sha256Hex } from './binding.mjs';
import { smokeGate as stubSmokeGate } from './gates.mjs';
import { rowWork } from './trace-reader.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const STAGE_MAP = Object.freeze({ A: 410, B: 402 });
export const QUIET_S = 45;
export const HORIZON_S = 885;
export const TODAY_HEAD = '6b94ffb';
export const AUDIT = 'docs/improve-generating-phase-2/evidence/sa-astra/round1-cross-audit.json';
export const BOARDS = 'tools/ig-proto/data/boards-v1.json';
export const READOUT = 'docs/improve-generating-phase-2/stage-a-readout.md';
export const SEALED_INPUTS = Object.freeze([
  AUDIT,
  'tasks/improve-generating-phase-2/contracts.md',
  'docs/improve-generating/evidence/frozen/V4-S4/',
  'docs/improve-generating/evidence/frozen/V4-S4C/',
  'generator/',
  'tests/fixtures/replay-case.json',
  'tests/fixtures/replay-case-v4.json',
]);
/** The copies of the sealed trees (P2-12b's `COPIES`), under `RAW/trees/<source>/<id>/`. */
export const COPIES = Object.freeze({
  'gen-v4': Object.freeze(['p2-gen4', 'p2-gen4-diag', 'p2-none', 'p2-uncapped', 'p2-uncapped-diag']),
  today: Object.freeze(['p2-today']),
});
const SNAPSHOT_MANIFEST = 'docs/improve-generating/evidence/frozen/V4-T01a/snapshot-manifest.json';
const VARIANTS = Object.freeze({
  'gen-v4': ['p2-gen4', 'p2-gen4-diag', 'gen-v4'],
  today: ['p2-today', null, 'today'],
  'no-screen': ['p2-none', null, 'gen-v4'],
  uncapped: ['p2-uncapped', 'p2-uncapped-diag', 'gen-v4'],
});
const ROW_FIELDS = Object.freeze(['key', 'component', 'stage', 'arm', 'cell', 'rep', 'seed', 'rowLimitS', 'uniqueness', 'quantity', 'maxActive', 'diagnosticOffer']);
const LEDGER_FIELDS = Object.freeze(['id', 'stage', 'group', 'item', 'start', 'end', 'nodeSeconds', 'quietS', 'countedSeconds', 'limitS', 'killed', 'exit', 'rowsWritten', 'cause']);

/** A failure with the process exit code and the line to print. */
export class Exit extends Error {
  /** @param {number} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** @param {string} text @returns {string} CRLF line ends and one final newline. */
export function toCrlf(text) {
  const lf = text.replace(/\r\n/g, '\n');
  return (lf.endsWith('\n') ? lf : `${lf}\n`).replace(/\n/g, '\r\n');
}

/** @param {unknown} value @returns {string} Two-space JSON, CRLF. */
const jsonText = (value) => toCrlf(JSON.stringify(value, null, 2));
const lfText = (/** @type {string} */ text) => text.replace(/\r\n/g, '\n');
const byPath = (/** @type {{ path: string }} */ a, /** @type {{ path: string }} */ b) => (a.path < b.path ? -1 : 1);

/**
 * @param {string | undefined} state The self-test state folder.
 * @returns {{ E: string, RAW: string, readout: string, state: string | null }}
 */
export function pathsOf(state) {
  if (state) {
    const dir = resolve(state);
    return { E: join(dir, 'E'), RAW: join(dir, 'RAW'), readout: join(dir, 'stage-a-readout.md'), state: dir };
  }
  return {
    E: join(ROOT, 'docs', 'improve-generating-phase-2', 'evidence'),
    RAW: join(ROOT, 'tests', 'artifacts', 'ig-proto', 'phase2'),
    readout: join(ROOT, ...READOUT.split('/')),
    state: null,
  };
}

/** @param {string} path @returns {string} The SHA-256 of a file's text after `lf`, or of its bytes when it holds a 0 byte. */
export function hashFile(path) {
  const bytes = readFileSync(path);
  return bytes.includes(0) ? sha256Hex(bytes) : sha256Hex(lfText(bytes.toString('utf8')));
}

/** @param {string} dir @param {string} base @returns {string[]} Repository-style paths of every file under dir, in path order. */
function listFiles(dir, base) {
  /** @type {string[]} */
  const out = [];
  const walk = (/** @type {string} */ d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(relative(base, full).split(sep).join('/'));
    }
  };
  walk(dir);
  return out.sort((a, b) => (a < b ? -1 : 1));
}

/**
 * Writes a file that never changes: identical bytes are acknowledged, other bytes are refused.
 * @param {string} path @param {string} text @param {string} what
 * @returns {boolean} Whether the file was written now.
 */
function writeOnce(path, text, what) {
  if (existsSync(path)) {
    if (readFileSync(path, 'utf8') !== text) throw new Exit(3, `${what}: refused, ${path} exists with other bytes`);
    return false;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, { flag: 'wx' });
  return true;
}

/** @param {string} file @returns {any[]} The JSON lines of a file (none when it is missing). */
function readJsonl(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
}

/** @param {string} cell @param {any} catalogue @returns {string[]} The catalogue's board rows, else a full rectangle. */
function boardOf(cell, catalogue) {
  const entry = catalogue.cases?.[cell];
  if (entry?.boardRows) return entry.boardRows;
  const m = /^(\d+)x(\d+)-/.exec(cell);
  if (!m) throw new Exit(2, `QUESTION: cell ${cell} has neither a catalogue entry nor a <w>x<h> name`);
  return rectRows(Number(m[1]), Number(m[2]));
}

/**
 * Builds the plan of the enumerated rows from the approved audit (R1): its schedule, unchanged.
 * @param {string} [root]
 * @returns {{ plan: any }}
 */
export function buildPlan(root = ROOT) {
  const auditFile = join(root, ...AUDIT.split('/'));
  const audit = JSON.parse(readFileSync(auditFile, 'utf8'));
  const catalogue = JSON.parse(readFileSync(join(root, ...BOARDS.split('/')), 'utf8'));
  const stages = /** @type {const} */ (['A', 'B']);
  const expected = { A: { groups: 23, rows: 318 }, B: { groups: 26, rows: 695 } };
  if (!Array.isArray(audit.rows) || audit.rows.length !== 1013) {
    throw new Exit(2, `QUESTION: the audit has ${audit.rows?.length} rows, not 1013`);
  }
  /** @type {Map<string, { stage: string, group: number }>} */
  const groupOf = new Map();
  /** @type {any[]} */
  const groups = [];
  for (const stage of stages) {
    const schedule = audit.stages?.[stage]?.schedule;
    if (!Array.isArray(schedule) || schedule.length !== expected[stage].groups) {
      throw new Exit(2, `QUESTION: stage ${stage} has ${schedule?.length} groups, not ${expected[stage].groups}`);
    }
    schedule.forEach((g, i) => {
      groups.push({ stage, group: i + 1, keys: [...g.keys], nodeS: g.nodeS, quietS: g.quietS });
      for (const key of g.keys) {
        if (groupOf.has(key)) throw new Exit(2, `QUESTION: the key ${key} is scheduled twice`);
        groupOf.set(key, { stage, group: i + 1 });
      }
    });
  }
  const rows = audit.rows.map((/** @type {any} */ r) => {
    const place = groupOf.get(r.key);
    if (!place || place.stage !== r.stage) throw new Exit(2, `QUESTION: the row ${r.key} is not in its stage's schedule`);
    const open = r.cell.startsWith('unresolved-trigger-');
    /** @type {Record<string, any>} */
    const row = { key: r.key, fileKey: r.key.replaceAll('/', '~'), component: r.component, stage: r.stage, group: place.group };
    for (const f of ROW_FIELDS) {
      if (!(f in row) && f in r) row[f] = r[f];
    }
    row.open = open;
    const hell = r.cell.endsWith('-hell-1');
    const rule = VARIANTS[/** @type {keyof typeof VARIANTS} */ (r.arm)];
    if (!rule) throw new Exit(2, `QUESTION: the row ${r.key} has the unknown arm ${r.arm}`);
    row.source = rule[2];
    if (!open) {
      const dash = r.cell.indexOf('-');
      row.levelId = r.cell.slice(dash + 1);
      const variant = hell ? rule[1] : rule[0];
      if (!variant) throw new Exit(2, `QUESTION: the row ${r.key} has no variant on Hell 1`);
      row.variant = variant;
      row.boardRows = boardOf(r.cell, catalogue);
    }
    row.maxActive = r.maxActive ?? 676;
    row.uniqueness = r.uniqueness ?? 'any';
    row.quantity = 10;
    return row;
  });
  for (const stage of stages) {
    const n = rows.filter((/** @type {any} */ r) => r.stage === stage).length;
    if (n !== expected[stage].rows) throw new Exit(2, `QUESTION: stage ${stage} has ${n} rows, not ${expected[stage].rows}`);
  }
  return {
    plan: { format: 'p2-plan', version: 1, audit: { path: AUDIT, sha256: hashFile(auditFile) }, rows, groups },
  };
}

/** @param {any} plan @returns {string} The plan's human summary: per stage, each group's rows by component. */
function planMarkdown(plan) {
  const lines = ['# Phase-2 plan', '', `${plan.rows.length} enumerated rows; \`plan.json\` is the record.`];
  for (const stage of ['A', 'B']) {
    lines.push('', `## Stage ${stage}`, '', '| Group | Rows | By component |', '|---:|---:|---|');
    for (const g of plan.groups.filter((/** @type {any} */ x) => x.stage === stage)) {
      /** @type {Map<string, number>} */
      const counts = new Map();
      for (const key of g.keys) {
        const row = plan.rows.find((/** @type {any} */ r) => r.key === key);
        counts.set(row.component, (counts.get(row.component) ?? 0) + 1);
      }
      lines.push(`| ${g.group} | ${g.keys.length} | ${[...counts].map(([c, n]) => `${c} ${n}`).join(', ')} |`);
    }
  }
  return toCrlf(lines.join('\n'));
}

/**
 * `plan --out <dir>`: writes `plan.json` and `plan.md`; an existing `plan.json` with other bytes is refused.
 * @param {string} out
 * @returns {string} The printed line.
 */
export function planCommand(out) {
  const { plan } = buildPlan();
  const text = jsonText(plan);
  const dir = resolve(out);
  writeOnce(join(dir, 'plan.json'), text, 'plan');
  const md = join(dir, 'plan.md');
  if (!existsSync(md)) writeFileSync(md, planMarkdown(plan));
  return `plan: ${sha256Hex(Buffer.from(text, 'utf8'))} (${plan.rows.length} rows)`;
}

/** @param {string} cwd @param {string[]} args @returns {string} */
export function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

/** The production root's digest, or a copy's or the today worktree's digest with its own `report.js`. */
async function digestOf(/** @type {string} */ dir) {
  const report = dir === ROOT
    ? { computeSourceDigest }
    : await import(pathToFileURL(join(dir, 'tools', 'bench', 'report.js')).href);
  return /** @type {string} */ (await report.computeSourceDigest((/** @type {string} */ p) => readFileSync(join(dir, ...p.split('/')), 'utf8')));
}

/** @param {string} root @param {readonly string[]} inputs @returns {string[]} The files of the sealed inputs, in path order. */
function inputFiles(root, inputs) {
  /** @type {Set<string>} */
  const files = new Set();
  for (const input of inputs) {
    const full = join(root, ...input.split('/').filter(Boolean));
    if (!existsSync(full)) throw new Exit(3, `seal: refused a sealed input is missing: ${input}`);
    if (statSync(full).isDirectory()) {
      for (const f of listFiles(full, root)) files.add(f);
    } else {
      files.add(input.replace(/\/$/, ''));
    }
  }
  return [...files].sort((a, b) => (a < b ? -1 : 1));
}

/** @param {string} root @param {readonly string[]} inputs @returns {{ tools: { path: string, sha256: string }[], inputs: { path: string, sha256: string }[] }} */
function sealedFiles(root, inputs) {
  const toolPaths = listFiles(join(root, 'tools', 'ig-proto', 'phase2'), root);
  const tools = toolPaths.map((path) => ({ path, sha256: hashFile(join(root, ...path.split('/'))) }));
  const rest = inputFiles(root, inputs).filter((p) => !toolPaths.includes(p));
  return { tools, inputs: rest.map((path) => ({ path, sha256: hashFile(join(root, ...path.split('/'))) })) };
}

/** @param {string} raw @param {string} source @param {string} id */
function copyDir(raw, source, id) {
  return join(raw, 'trees', source, id);
}

/**
 * Reads one copy's two records and recomputes its digest.
 * @param {string} raw @param {string} source @param {string} id
 * @returns {Promise<{ copy: Record<string, any>, digest: string }>}
 */
async function readCopy(raw, source, id) {
  const dir = copyDir(raw, source, id);
  const tree = join(dir, 'ig-tree.json');
  const info = join(dir, 'p2-copy.json');
  if (!existsSync(tree) || !existsSync(info)) throw new Exit(3, `seal: refused a copy is missing: ${source}/${id}`);
  const igTree = JSON.parse(readFileSync(tree, 'utf8'));
  const p2 = JSON.parse(readFileSync(info, 'utf8'));
  const digest = await digestOf(dir);
  if (digest !== igTree.copyDigest || p2.copyDigest !== igTree.copyDigest || p2.treeId !== igTree.treeId) {
    throw new Exit(3, `seal: drift copy ${source}/${id}`);
  }
  const copy = {};
  for (const f of ['id', 'source', 'root', 'rehearsal', 'inputDigest', 'treeId', 'copyDigest', 'chain', 'params']) {
    /** @type {any} */ (copy)[f] = p2[f];
  }
  return { copy: { ...copy, verified: true }, digest };
}

/**
 * The refusals and the record of `seal --commit`.
 * @param {{ commit: string, todayRoot: string, planFile: string, paths: ReturnType<typeof pathsOf>, root?: string, gitRun?: typeof git, inputs?: readonly string[] }} o
 * @returns {Promise<any>} The seal.
 */
export async function buildSeal(o) {
  const root = o.root ?? ROOT;
  const run = o.gitRun ?? git;
  const refuse = (/** @type {string} */ why) => new Exit(3, `seal: refused ${why}`);
  if (run(root, ['rev-parse', 'HEAD']) !== o.commit) throw refuse(`HEAD is not ${o.commit}`);
  if (run(root, ['status', '--porcelain', '--untracked-files=no']) !== '') throw refuse('the tracked worktree is not clean');
  if (!run(o.todayRoot, ['rev-parse', 'HEAD']).startsWith(TODAY_HEAD)) throw refuse(`the today worktree is not at ${TODAY_HEAD}`);
  if (run(o.todayRoot, ['status', '--porcelain']) !== '') throw refuse('the today worktree is not clean');
  /** @type {any[]} */
  const copies = [];
  for (const [source, ids] of Object.entries(COPIES)) {
    for (const id of ids) copies.push((await readCopy(o.paths.RAW, source, id)).copy);
  }
  if (!existsSync(o.planFile)) throw refuse(`the plan is missing: ${o.planFile}`);
  const files = sealedFiles(root, o.inputs ?? SEALED_INPUTS);
  const inside = relative(root, resolve(o.planFile));
  return {
    format: 'p2-seal',
    version: 1,
    commit: o.commit,
    stageMap: { ...STAGE_MAP },
    node: process.version,
    plan: { path: inside.startsWith('..') || isAbsolute(inside) ? resolve(o.planFile) : inside.split(sep).join('/'), sha256: sha256Hex(readFileSync(o.planFile)) },
    sourceDigest: await digestOf(root),
    today: { root: resolve(o.todayRoot), head: run(o.todayRoot, ['rev-parse', 'HEAD']), digest: await digestOf(resolve(o.todayRoot)) },
    copies,
    tools: files.tools,
    inputs: files.inputs,
  };
}

/**
 * `seal --check`: recomputes what this task's seal holds. The creation-only refusals are not repeated; files outside the
 * sealed inventory may change.
 * @param {{ seal: any, paths: ReturnType<typeof pathsOf>, root?: string, gitRun?: typeof git, inputs?: readonly string[] }} o
 * @returns {Promise<string | null>} `null` when nothing drifted, else `drift <field> <path or id>`.
 */
export async function checkSeal(o) {
  const root = o.root ?? ROOT;
  const run = o.gitRun ?? git;
  const { seal } = o;
  if (seal?.format !== 'p2-seal' || seal.version !== 1) return 'drift format seal';
  if (JSON.stringify(seal.stageMap) !== JSON.stringify(STAGE_MAP)) return 'drift stageMap seal';
  if (seal.node !== process.version) return `drift node ${process.version}`;
  const planFile = isAbsolute(seal.plan.path) ? seal.plan.path : join(root, ...seal.plan.path.split('/'));
  if (!existsSync(planFile) || sha256Hex(readFileSync(planFile)) !== seal.plan.sha256) return `drift plan ${seal.plan.path}`;
  /** @type {string | null} */
  let drift = null;
  try {
    const files = sealedFiles(root, o.inputs ?? SEALED_INPUTS);
    for (const [field, now] of [['tools', files.tools], ['inputs', files.inputs]]) {
      const was = new Map(seal[/** @type {string} */ (field)].map((/** @type {any} */ e) => [e.path, e.sha256]));
      const have = new Map(/** @type {any[]} */ (now).map((e) => [e.path, e.sha256]));
      for (const path of [...new Set([...was.keys(), ...have.keys()])].sort()) {
        if (was.get(path) !== have.get(path)) return `drift ${field} ${path}`;
      }
    }
  } catch (error) {
    if (error instanceof Exit) return `drift inputs ${error.message.split(': ').pop()}`;
    throw error;
  }
  if (await digestOf(root) !== seal.sourceDigest) return 'drift sourceDigest repository';
  const head = run(seal.today.root, ['rev-parse', 'HEAD']);
  if (!head.startsWith(TODAY_HEAD) || head !== seal.today.head || run(seal.today.root, ['status', '--porcelain']) !== ''
    || await digestOf(seal.today.root) !== seal.today.digest) {
    return `drift today ${seal.today.root}`;
  }
  for (const sealed of seal.copies) {
    try {
      const now = await readCopy(o.paths.RAW, sealed.source, sealed.id);
      if (now.copy.treeId !== sealed.treeId || now.copy.copyDigest !== sealed.copyDigest || now.copy.inputDigest !== sealed.inputDigest) {
        drift = `drift copy ${sealed.source}/${sealed.id}`;
      }
    } catch (error) {
      if (!(error instanceof Exit)) throw error;
      drift = `drift copy ${sealed.source}/${sealed.id}`;
    }
    if (drift) return drift;
  }
  return null;
}

const ACCEPTED = /^(\d{4})-(\d{2})-(\d{2}) ([01]\d|2[0-3]):[0-5]\d \+07:00$/;

/**
 * C12, pure: whether the committed stage-A readout admits stage B.
 * @param {{ text: string | null, committed: boolean, sealSha256: string | null, reportSha256: string | null, reportGates: any[] | null }} o
 * @returns {{ ok: boolean, why: string }}
 */
export function checkReadout({ text, committed, sealSha256, reportSha256, reportGates }) {
  const no = (/** @type {string} */ why) => ({ ok: false, why });
  if (text === null) return no('the readout is missing');
  if (!committed) return no('the readout is not committed');
  const lines = text.split(/\r?\n/);
  const seal = /^Seal: (\S+)$/.exec(lines[0] ?? '');
  if (!seal) return no('line 1 is not `Seal: <sha256>`');
  const report = /^Report A: (\S+)$/.exec(lines[1] ?? '');
  if (!report) return no('line 2 is not `Report A: <sha256>`');
  for (const [i, who] of [[2, 'SA-Opus'], [3, 'SA-Astra']]) {
    const m = new RegExp(`^Accepted by ${who}: (.+)$`).exec(lines[/** @type {number} */ (i)] ?? '');
    if (!m) return no(`the acceptance by ${who} is missing`);
    const time = ACCEPTED.exec(m[1]);
    const month = Number(time?.[2]);
    const day = Number(time?.[3]);
    if (!time || month < 1 || month > 12 || day < 1 || day > 31) return no(`the acceptance time of ${who} is not yyyy-mm-dd hh:mm +07:00`);
  }
  if (lines[4] !== 'Stage B: PROCEED') return no('line 5 is not `Stage B: PROCEED`');
  if (sealSha256 === null || seal[1] !== sealSha256) return no('the Seal line is stale');
  if (reportSha256 === null || report[1] !== reportSha256) return no('the Report A line is stale');
  if (!Array.isArray(reportGates)) return no('the report has no gates');
  const failed = reportGates.some((g) => g?.status === 'fail' || g?.status === 'incomplete');
  if (failed && !lines.slice(5).some((l) => /^Owner continuation: \d+$/.test(l))) {
    return no('a gate failed or is incomplete and no `Owner continuation:` line follows');
  }
  return { ok: true, why: 'the readout admits stage B' };
}

/** @param {ReturnType<typeof pathsOf>} P @returns {{ ok: boolean, why: string }} */
function readoutOf(P) {
  const sealFile = join(P.E, 'seal', 'seal.json');
  const reportFile = join(P.E, 'report-A', 'report.json');
  const text = existsSync(P.readout) ? readFileSync(P.readout, 'utf8') : null;
  let committed = false;
  if (text !== null) {
    if (P.state) {
      committed = existsSync(join(P.state, 'stage-a-readout.committed'));
    } else {
      try {
        git(ROOT, ['ls-files', '--error-unmatch', READOUT]);
        git(ROOT, ['diff', '--quiet', 'HEAD', '--', READOUT]);
        committed = true;
      } catch {
        committed = false;
      }
    }
  }
  /** @type {any[] | null} */
  let gates = null;
  if (existsSync(reportFile)) {
    const g = JSON.parse(readFileSync(reportFile, 'utf8')).gates;
    gates = Array.isArray(g) ? g : g && typeof g === 'object' ? Object.values(g) : null;
  }
  return checkReadout({
    text,
    committed,
    sealSha256: existsSync(sealFile) ? sha256Hex(readFileSync(sealFile)) : null,
    reportSha256: existsSync(reportFile) ? sha256Hex(readFileSync(reportFile)) : null,
    reportGates: gates,
  });
}

const ledgerFile = (/** @type {ReturnType<typeof pathsOf>} */ P) => join(P.E, 'ledger', 'ledger.jsonl');
const pendingFile = (/** @type {ReturnType<typeof pathsOf>} */ P) => join(P.RAW, 'pending.json');

/** @param {ReturnType<typeof pathsOf>} P @param {string} stage @returns {number} Counted seconds spent in the stage. */
export function spentS(P, stage) {
  return readJsonl(ledgerFile(P)).filter((l) => l.stage === stage).reduce((s, l) => s + l.countedSeconds, 0);
}

/**
 * `ledger --check`: admission of one invocation (C7, check-list §3.5).
 * @param {ReturnType<typeof pathsOf>} P @param {string} stage @param {number} limit
 * @returns {{ ok: boolean, why: string }}
 */
export function admit(P, stage, limit) {
  if (existsSync(pendingFile(P))) return { ok: false, why: 'a reservation exists (RAW/pending.json)' };
  const spent = spentS(P, stage);
  const cap = STAGE_MAP[/** @type {'A' | 'B'} */ (stage)] * 60;
  if (spent + limit + QUIET_S > cap) return { ok: false, why: `stage ${stage}: ${spent} + ${limit} + ${QUIET_S} exceeds ${cap} counted seconds` };
  if (stage === 'B') {
    const readout = readoutOf(P);
    if (!readout.ok) return { ok: false, why: `stage B: ${readout.why}` };
  }
  return { ok: true, why: `stage ${stage}: ${spent} + ${limit} + ${QUIET_S} <= ${cap} counted seconds` };
}

/**
 * Terminal keys whose unique durable start names the invocation (review-2 R2-06), within the same seal.
 * @param {ReturnType<typeof pathsOf>} P @param {string} stage @param {string} id @param {string | null} sealSha256
 * @returns {number}
 */
export function countRowsWritten(P, stage, id, sealSha256) {
  const lines = readJsonl(join(P.RAW, 'rows', `${stage}.status.jsonl`));
  /** @type {Map<string, any[]>} */
  const starts = new Map();
  /** @type {Map<string, any[]>} */
  const terminals = new Map();
  for (const l of lines) {
    const map = l.t === 'start' ? starts : l.t === 'done' || l.t === 'interrupted' ? terminals : null;
    if (map) map.set(l.key, [...(map.get(l.key) ?? []), l]);
  }
  let n = 0;
  for (const [key, list] of starts) {
    const start = list[0];
    if (list.length !== 1 || start.invocation !== id) continue;
    const seal = start.sealSha256 ?? null;
    if (sealSha256 !== null && seal !== sealSha256) continue;
    if ((terminals.get(key) ?? []).some((t) => (t.sealSha256 ?? null) === seal)) n += 1;
  }
  return n;
}

/**
 * Validates a C7 line and returns it in the contract's field order, with `rowsWritten` counted here.
 * @param {any} line @param {ReturnType<typeof pathsOf>} P
 * @returns {Record<string, any>}
 */
export function validateLedgerLine(line, P) {
  const bad = (/** @type {string} */ why) => new Exit(5, `ledger: refused ${why}`);
  if (!line || typeof line !== 'object' || Array.isArray(line)) throw bad('the line is not an object');
  for (const f of Object.keys(line)) if (!LEDGER_FIELDS.includes(f)) throw bad(`unknown field ${f}`);
  const need = (/** @type {string} */ f, /** @type {(v: any) => boolean} */ ok) => {
    if (!(f in line) || !ok(line[f])) throw bad(`missing or invalid field ${f}`);
  };
  const num = (/** @type {any} */ v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  need('id', (v) => typeof v === 'string' && v !== '');
  need('stage', (v) => v === 'A' || v === 'B');
  if (('group' in line) === ('item' in line)) throw bad('exactly one of group and item is needed');
  if ('group' in line) need('group', (v) => (Number.isInteger(v) && v >= 1) || (typeof v === 'string' && /^o\d+$/.test(v)));
  else need('item', (v) => typeof v === 'string' && v !== '');
  need('start', (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v)));
  need('end', (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v)));
  need('nodeSeconds', num);
  need('quietS', num);
  need('countedSeconds', num);
  need('limitS', num);
  need('killed', (v) => typeof v === 'boolean');
  need('exit', Number.isInteger);
  need('rowsWritten', (v) => Number.isInteger(v) && v >= 0);
  need('cause', (v) => v === 'ok' || v === 'exit' || v === 'timeout');
  if (Math.abs(line.countedSeconds - (line.nodeSeconds + line.quietS)) > 1e-6) throw bad('countedSeconds is not nodeSeconds + quietS');
  if (readJsonl(ledgerFile(P)).some((l) => l.id === line.id)) throw bad(`the id ${line.id} is already in the ledger`);
  /** @type {Record<string, any>} */
  const out = {};
  for (const f of LEDGER_FIELDS) if (f in line) out[f] = line[f];
  out.rowsWritten = countRowsWritten(P, line.stage, line.id, null);
  return out;
}

/** @param {string} file @param {string} text Appends one durable line. */
function appendDurable(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  const fd = openSync(file, 'a');
  try {
    writeSync(fd, text);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/**
 * `reserve`: creates `RAW/pending.json` with CreateNew semantics.
 * @param {ReturnType<typeof pathsOf>} P @param {Record<string, any>} a
 * @returns {string} The reservation id.
 */
export function reserve(P, a) {
  const stage = a.stage;
  if (stage !== 'A' && stage !== 'B') throw new Exit(2, 'reserve: --stage A|B is needed');
  const limit = Number(a.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 900) throw new Exit(2, 'reserve: --limit is 1 to 900 seconds');
  const kinds = ['group', 'item', 'overflow-group'].filter((k) => a[k] !== undefined);
  if (kinds.length !== 1) throw new Exit(2, 'reserve: exactly one of --group, --item and --overflow-group is needed');
  const k = readJsonl(ledgerFile(P)).length + 1;
  /** @type {Record<string, any>} */
  const entry = {};
  let id;
  if (kinds[0] === 'item') {
    if (!/^[A-Za-z0-9._-]+$/.test(String(a.item))) throw new Exit(2, 'reserve: --item is letters, digits, dot, underscore and hyphen');
    id = `${stage}-${a.item}.${k}`;
    entry.item = a.item;
  } else {
    const n = Number(a[kinds[0]]);
    if (!Number.isInteger(n) || n < 1) throw new Exit(2, `reserve: --${kinds[0]} is a positive integer`);
    if (kinds[0] === 'overflow-group') {
      if (stage !== 'B') throw new Exit(2, 'reserve: an overflow group is stage B');
      id = `${stage}-o${n}.${k}`;
      entry.group = `o${n}`;
    } else {
      id = `${stage}-${n}.${k}`;
      entry.group = n;
    }
  }
  mkdirSync(P.RAW, { recursive: true });
  let fd;
  try {
    fd = openSync(pendingFile(P), 'wx');
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EEXIST') throw new Exit(4, 'reserve: refused, RAW/pending.json exists');
    throw error;
  }
  try {
    writeSync(fd, jsonText({ id, stage, ...entry, limitS: limit, at: new Date().toISOString() }));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  return id;
}

/** @param {string} file @returns {any | null} The parsed JSON file, or null when it is missing. */
function readJsonFile(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

/** @param {string} a @param {string} b @returns {number} Code-point order. */
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * @typedef {object} RowSpec What one row run needs.
 * @property {string} key @property {string} fileKey @property {string} component @property {string} arm
 * @property {string} variant @property {string} cell @property {number} rep @property {string} seed
 * @property {string} uniqueness @property {number} maxActive @property {any} boardRows @property {string} levelId
 * @property {number} rowLimitS @property {string} source
 */

/**
 * One position of a group: a row to run, an inactive slot, or an open slot that has no activation receipt yet.
 * @typedef {{ key: string, spec: RowSpec | null, kind: 'row' | 'inactive' | 'blocked' }} Slot
 */

/** @param {any} row A plan row. @returns {RowSpec} */
function specOf(row) {
  return {
    key: row.key, fileKey: row.fileKey, component: row.component, arm: row.arm, variant: row.variant, cell: row.cell, rep: row.rep,
    seed: row.seed, uniqueness: row.uniqueness, maxActive: row.maxActive, boardRows: row.boardRows, levelId: row.levelId,
    rowLimitS: row.rowLimitS, source: row.source,
  };
}

/** @param {any} triggered The plan row of a triggered row. @returns {RowSpec} Its conditional twin (C10). */
function twinOf(triggered) {
  const key = `conditional-twin/uncapped/${triggered.cell}/${triggered.rep}`;
  return {
    key,
    fileKey: key.replaceAll('/', '~'),
    component: 'conditional-twin',
    arm: 'uncapped',
    variant: triggered.cell.endsWith('-hell-1') ? 'p2-uncapped-diag' : 'p2-uncapped',
    cell: triggered.cell,
    rep: triggered.rep,
    seed: triggered.seed,
    uniqueness: triggered.uniqueness,
    maxActive: triggered.maxActive,
    boardRows: triggered.boardRows,
    levelId: triggered.levelId,
    rowLimitS: 260,
    source: 'gen-v4',
  };
}

/**
 * The positions of a group, with its open slots resolved through the activation receipt (C10).
 * @param {any} plan @param {any | null} activation @param {{ stage: string, group?: number, overflowGroup?: number }} opts
 * @returns {Slot[]}
 */
function slotsOf(plan, activation, opts) {
  /** @type {Map<string, any>} */
  const rows = new Map(plan.rows.map((/** @type {any} */ r) => [r.key, r]));
  const twinSlot = (/** @type {string} */ triggeredKey) => {
    const triggered = rows.get(triggeredKey);
    if (!triggered || triggered.open) throw new Exit(8, `activation receipt names an unknown row ${triggeredKey}`);
    const spec = twinOf(triggered);
    return /** @type {Slot} */ ({ key: spec.key, spec, kind: 'row' });
  };
  if (opts.overflowGroup !== undefined) {
    if (!activation) throw new Exit(8, 'activation receipt required');
    const keys = activation.overflow?.groups?.[opts.overflowGroup - 1];
    if (!Array.isArray(keys)) throw new Exit(8, `activation receipt has no overflow group ${opts.overflowGroup}`);
    return keys.map(twinSlot);
  }
  const group = plan.groups.find((/** @type {any} */ g) => g.stage === opts.stage && g.group === opts.group);
  if (!group) throw new Exit(2, `run-group: stage ${opts.stage} has no group ${opts.group}`);
  return group.keys.map((/** @type {string} */ key) => {
    const row = rows.get(key);
    if (!row) throw new Exit(2, `run-group: the plan has no row ${key}`);
    if (!row.open) return /** @type {Slot} */ ({ key, spec: specOf(row), kind: 'row' });
    if (!activation) return /** @type {Slot} */ ({ key, spec: null, kind: 'blocked' });
    const target = activation.slots?.[key];
    if (target === undefined) throw new Exit(8, `activation receipt has no slot ${key}`);
    return target === null ? /** @type {Slot} */ ({ key, spec: null, kind: 'inactive' }) : twinSlot(target);
  });
}

/** @param {ReturnType<typeof pathsOf>} P @returns {{ plan: any, seal: any | null, activation: any | null }} */
function loadRun(P) {
  const planFile = join(P.E, 'plan', 'plan.json');
  const sealFile = join(P.E, 'seal', 'seal.json');
  if (!existsSync(planFile)) throw new Exit(3, `run-group: the plan is missing: ${planFile}`);
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  const seal = readJsonFile(sealFile);
  const activation = readJsonFile(join(P.E, 'twins', 'activation.json'));
  if (activation) {
    if (activation.planSha256 !== sha256Hex(readFileSync(planFile))) throw new Exit(8, 'activation receipt does not match the plan');
    if (!seal || activation.sealSha256 !== sha256Hex(readFileSync(sealFile))) throw new Exit(8, 'activation receipt does not match the seal');
  }
  return { plan, seal, activation };
}

/** @param {string} file @returns {any | null} The report's one generation run, or null. */
function generationRun(file) {
  if (!existsSync(file)) return null;
  let runs;
  try {
    runs = JSON.parse(readFileSync(file, 'utf8')).runs;
  } catch {
    return null;
  }
  const generation = Array.isArray(runs) ? runs.filter((r) => r?.probeKind === 'generation') : [];
  return generation.length === 1 && Number.isFinite(generation[0].acceptedCount) ? generation[0] : null;
}

/**
 * Runs the rows of one group, or of one overflow group, one at a time (C4, C5, C10; R1, R3). Never throws for a refusal:
 * the exit code and the lines to print are returned.
 * @param {{ stage: string, group?: number, overflowGroup?: number, invocation: string, paths: ReturnType<typeof pathsOf>, clockOffsetS?: number }} opts
 * @param {{ smokeGate?: (rows: any[], plan: any) => any, spawn?: typeof spawnSync, now?: () => number }} [deps]
 * @returns {Promise<{ code: number, lines: string[] }>} Exit code 0, 6 (smoke gate), 7 (deferred keys) or 8 (activation).
 */
export async function runGroup(opts, deps = {}) {
  /** @type {string[]} */
  const lines = [];
  try {
    return { code: await groupBody(opts, deps, lines), lines };
  } catch (error) {
    if (!(error instanceof Exit)) throw error;
    lines.push(error.message);
    return { code: error.code, lines };
  }
}

/** @param {Parameters<typeof runGroup>[0]} opts @param {NonNullable<Parameters<typeof runGroup>[1]>} deps @param {string[]} out @returns {Promise<number>} */
async function groupBody(opts, deps, out) {
  const { stage, invocation, paths: P } = opts;
  const smokeGate = deps.smokeGate ?? stubSmokeGate;
  const spawn = deps.spawn ?? spawnSync;
  // performance.now() counts from the start of the process, which is the horizon's origin.
  const now = deps.now ?? (() => performance.now());
  const elapsedS = () => now() / 1000 + (opts.clockOffsetS ?? 0);
  const { plan, seal, activation } = loadRun(P);
  if (!seal) throw new Exit(3, `run-group: the seal is missing: ${join(P.E, 'seal', 'seal.json')}`);
  const label = opts.overflowGroup !== undefined ? `o${opts.overflowGroup}` : opts.group;
  const slots = slotsOf(plan, activation, opts);
  const statusFile = join(P.RAW, 'rows', `${stage}.status.jsonl`);
  const rowsFile = join(P.RAW, 'rows', `${stage}.jsonl`);

  /** @type {Map<string, { started: boolean, terminal: string | null }>} */
  const states = new Map();
  const record = (/** @type {any} */ line) => {
    appendDurable(statusFile, toCrlf(JSON.stringify(line)));
    const s = states.get(line.key) ?? { started: false, terminal: null };
    if (line.t === 'start') s.started = true;
    else s.terminal = line.t;
    states.set(line.key, s);
  };
  for (const line of readJsonl(statusFile)) {
    const s = states.get(line.key) ?? { started: false, terminal: null };
    if (line.t === 'start') s.started = true;
    else if (line.t === 'done' || line.t === 'interrupted') s.terminal = line.t;
    states.set(line.key, s);
  }
  const terminal = (/** @type {string} */ key) => states.get(key)?.terminal ?? null;
  const rawOf = (/** @type {RowSpec} */ spec) => join(P.RAW, 'raw', spec.fileKey);

  const lineOf = (/** @type {RowSpec} */ spec, /** @type {any} */ run, /** @type {string} */ receipt) => ({
    key: spec.key,
    fileKey: spec.fileKey,
    stage,
    group: label,
    component: spec.component,
    arm: spec.arm,
    variant: spec.variant,
    cell: spec.cell,
    rep: spec.rep,
    seed: spec.seed,
    uniqueness: spec.uniqueness,
    run,
    telemetry: run.telemetry ?? null,
    receipt,
    // The complete C9 result: workLedger() is only for the statistical functions' input (review-2 R2-01).
    ledger: rowWork(join(rawOf(spec), 'journal'), { row: spec.fileKey, seed: spec.seed, acceptedCount: run.acceptedCount }),
  });

  // Resume (C5): a started row without a terminal line is never launched again.
  for (const slot of slots) {
    const s = states.get(slot.key);
    if (slot.spec === null || !s?.started || s.terminal) continue;
    const raw = rawOf(slot.spec);
    const run = generationRun(join(raw, 'report.json'));
    const receiptFile = join(raw, 'receipt.json');
    if (run && existsSync(receiptFile)) {
      if (!readJsonl(rowsFile).some((l) => l.key === slot.key)) {
        appendDurable(rowsFile, toCrlf(JSON.stringify(lineOf(slot.spec, run, sha256Hex(readFileSync(receiptFile))))));
      }
      record({ t: 'done', key: slot.key, at: new Date().toISOString() });
    } else {
      record({ t: 'interrupted', key: slot.key, cause: 'no-report', at: new Date().toISOString() });
    }
  }

  /** @param {RowSpec} spec */
  const launch = (spec) => {
    const copy = seal.copies?.find((/** @type {any} */ c) => c.id === spec.variant && c.source === spec.source);
    if (!copy) throw new Exit(3, `run-group: the seal has no copy ${spec.source}/${spec.variant}`);
    const raw = rawOf(spec);
    const tree = join(P.RAW, 'trees', spec.source, spec.variant);
    const startedAt = new Date().toISOString();
    record({ t: 'start', key: spec.key, group: label, invocation, at: startedAt });
    mkdirSync(join(raw, 'journal'), { recursive: true });
    writeFileSync(join(raw, 'matrix.json'), jsonText(rowMatrix(spec)));
    const fd = openSync(join(raw, 'calibrate.log'), 'a');
    /** @type {{ status: number | null }} */
    let child;
    try {
      child = spawn(process.execPath, [
        '--max-old-space-size=2048', join(tree, 'tools', 'calibrate.mjs'), '--matrix', join(raw, 'matrix.json'), '--workers', '4',
        '--fresh-process', '--no-cancel-probe', '--child-limit-s', String(spec.rowLimitS), '--output', join(raw, 'report'),
      ], {
        cwd: tree,
        env: { ...process.env, IG_LOG_DIR: join(raw, 'journal'), IG_ROW: spec.fileKey, IG_SEED: spec.seed, IG_SOURCE_LABEL: `${spec.variant} ${seal.commit}` },
        stdio: ['ignore', fd, fd],
      });
    } finally {
      closeSync(fd);
    }
    const endedAt = new Date().toISOString();
    const reportFile = join(raw, 'report.json');
    const journalDir = join(raw, 'journal');
    const journal = existsSync(journalDir)
      ? readdirSync(journalDir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort(byText).map((name) => {
        const bytes = readFileSync(join(journalDir, name));
        return { name, bytes: bytes.length, sha256: sha256Hex(bytes) };
      })
      : [];
    const receipt = {
      key: spec.key,
      fileKey: spec.fileKey,
      stage,
      group: label,
      invocation,
      variant: spec.variant,
      copy: { treeId: copy.treeId, copyDigest: copy.copyDigest },
      report: existsSync(reportFile) ? { path: `raw/${spec.fileKey}/report.json`, sha256: sha256Hex(readFileSync(reportFile)) } : null,
      journal,
      childExit: child.status,
      startedAt,
      endedAt,
    };
    const receiptFile = join(raw, 'receipt.json');
    writeFileSync(receiptFile, jsonText(receipt));
    const run = generationRun(reportFile);
    if (run) {
      appendDurable(rowsFile, toCrlf(JSON.stringify(lineOf(spec, run, sha256Hex(readFileSync(receiptFile))))));
      record({ t: 'done', key: spec.key, at: new Date().toISOString() });
      out.push(`row ${spec.key} done`);
    } else {
      const lost = receipt.report === null && child.status !== 0 && child.status !== 2;
      record({ t: 'interrupted', key: spec.key, cause: lost ? `child-exit ${child.status}` : 'no-report', at: new Date().toISOString() });
      out.push(`row ${spec.key} interrupted`);
    }
  };

  // R1: A's group 1 runs its smoke rows first; the gate decides in process before its first other row.
  const smokeGroup = opts.overflowGroup === undefined && stage === 'A' && opts.group === 1;
  const smokeKeys = smokeGroup ? slots.filter((s) => s.spec?.component === 'smoke').map((s) => s.key) : [];
  let gateDone = !smokeGroup;
  /** @returns {Promise<boolean>} Whether the gate stops the group. */
  const gateStops = async () => {
    const gateFile = join(P.RAW, 'rows', 'smoke-gate.json');
    if (!existsSync(gateFile)) {
      const result = await smokeGate(readJsonl(rowsFile).filter((l) => smokeKeys.includes(l.key)), plan);
      const verdict = { ok: result?.ok === true, problems: Array.isArray(result?.problems) ? result.problems : [], at: new Date().toISOString() };
      mkdirSync(dirname(gateFile), { recursive: true });
      writeFileSync(gateFile, jsonText(verdict), { flag: 'wx' });
    }
    const verdict = JSON.parse(readFileSync(gateFile, 'utf8'));
    if (verdict.ok === true) return false;
    out.push(`smoke gate failed: ${(verdict.problems ?? []).join('; ')}`);
    return true;
  };

  /** @type {string[]} */
  const deferred = [];
  let deferring = false;
  for (const slot of slots) {
    const pending = slot.kind !== 'inactive' && !terminal(slot.key);
    if (deferring) {
      if (pending) deferred.push(slot.key);
      continue;
    }
    if (!gateDone && slot.spec?.component !== 'smoke') {
      gateDone = true;
      if (await gateStops()) return 6;
    }
    if (slot.kind === 'inactive' || terminal(slot.key)) continue;
    if (slot.kind === 'blocked' || slot.spec === null) throw new Exit(8, 'activation receipt required');
    if (elapsedS() + slot.spec.rowLimitS + 10 > HORIZON_S) {
      deferring = true;
      deferred.push(slot.key);
      continue;
    }
    launch(slot.spec);
  }
  for (const key of deferred) out.push(`deferred ${key}`);
  return deferred.length > 0 ? 7 : 0;
}

/**
 * `status --stage <S>`: per group, the counts of done, interrupted, inactive and pending keys.
 * @param {ReturnType<typeof pathsOf>} P @param {string} stage @returns {string}
 */
export function statusCommand(P, stage) {
  const { plan, activation } = loadRun(P);
  /** @type {Map<string, string | null>} */
  const terminals = new Map();
  for (const line of readJsonl(join(P.RAW, 'rows', `${stage}.status.jsonl`))) {
    if (line.t === 'start') terminals.set(line.key, null);
    else if (line.t === 'done' || line.t === 'interrupted') terminals.set(line.key, line.t);
  }
  /** @type {{ label: string, opts: { stage: string, group?: number, overflowGroup?: number } }[]} */
  const groups = plan.groups.filter((/** @type {any} */ g) => g.stage === stage)
    .map((/** @type {any} */ g) => ({ label: String(g.group), opts: { stage, group: g.group } }));
  if (stage === 'B') {
    for (let n = 1; n <= (activation?.overflow?.groups?.length ?? 0); n += 1) groups.push({ label: `o${n}`, opts: { stage, overflowGroup: n } });
  }
  return groups.map(({ label, opts }) => {
    const counts = { done: 0, interrupted: 0, inactive: 0, pending: 0 };
    for (const slot of slotsOf(plan, activation, opts)) {
      if (slot.kind === 'inactive') counts.inactive += 1;
      else {
        const t = terminals.get(slot.key);
        if (t === 'done' || t === 'interrupted') counts[t] += 1;
        else counts.pending += 1;
      }
    }
    return `group ${label}: done ${counts.done} interrupted ${counts.interrupted} inactive ${counts.inactive} pending ${counts.pending}`;
  }).join('\n');
}

/**
 * `publish --stage <S> --out <dir> [--rows <dir>]` (C8): the three write-once files of a snapshot.
 * @param {ReturnType<typeof pathsOf>} P @param {Record<string, any>} a @returns {string} The printed line.
 */
export function publishCommand(P, a) {
  const stage = a.stage;
  if ((stage !== 'A' && stage !== 'B') || typeof a.out !== 'string') throw new Exit(2, USAGE);
  const rowsFile = join(typeof a.rows === 'string' ? resolve(a.rows) : join(P.RAW, 'rows'), `${stage}.jsonl`);
  if (!existsSync(rowsFile)) throw new Exit(2, `publish: no rows file ${rowsFile}`);
  const rows = readFileSync(rowsFile, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const line of rows) {
    const r = JSON.parse(line);
    const key = JSON.stringify([r.component, r.arm, r.cell]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const jsonl = rows.map((l) => `${l}\r\n`).join('');
  const sha = sha256Hex(Buffer.from(jsonl, 'utf8'));
  const md = toCrlf([
    `# Phase-2 rows: stage ${stage}`,
    '',
    `${rows.length} rows; \`${stage}.jsonl\` is the record (SHA-256 \`${sha}\`).`,
    '',
    '| Component | Arm | Cell | Rows |',
    '|---|---|---|---:|',
    ...[...counts].sort(([x], [y]) => byText(x, y)).map(([key, n]) => `| ${JSON.parse(key).join(' | ')} | ${n} |`),
  ].join('\n'));
  const dir = resolve(a.out);
  const files = [[`${stage}.jsonl`, jsonl], [`${stage}.md`, md], [`${stage}.sha256`, `${sha}\r\n`]];
  for (const [name, text] of files) {
    const file = join(dir, name);
    if (existsSync(file) && readFileSync(file, 'utf8') !== text) throw new Exit(3, `publish: refused, ${file} exists with other bytes`);
  }
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of files) {
    const file = join(dir, name);
    if (!existsSync(file)) writeFileSync(file, text, { flag: 'wx' });
  }
  return `publish: ${stage} ${rows.length} rows ${sha}`;
}

/**
 * Parses `--key value` flags; a flag with no value is `true`.
 * @param {string[]} argv @returns {Record<string, any>}
 */
function parseFlags(argv) {
  /** @type {Record<string, any>} */
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) throw new Exit(2, `unexpected argument ${argv[i]}`);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[argv[i].slice(2)] = true;
    else {
      out[argv[i].slice(2)] = next;
      i += 1;
    }
  }
  return out;
}

const USAGE = [
  'usage: node tools/ig-proto/phase2/p2.mjs <command> [--state <dir>]',
  '  plan --out <dir>',
  '  seal --commit <sha> --today-root <dir> --plan <plan.json> --out <dir>',
  '  seal --check [--seal <path>]',
  '  ledger --status | --check --stage <A|B> --limit <s> | --append --json <text>',
  '  reserve --stage <A|B> (--group <n> | --item <name> | --overflow-group <n>) --limit <s>',
  '  release --id <id>',
  '  run-group --stage <A|B> (--group <n> | --overflow-group <n>) --invocation <id> [--state <dir> [--clock-offset-s <s>]]',
  '  status --stage <A|B>',
  '  publish --stage <A|B> --out <dir> [--rows <dir>]',
].join('\n');

/**
 * Runs one command.
 * @param {string[]} argv @returns {Promise<string>} The text to print.
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  const a = parseFlags(rest);
  const P = pathsOf(typeof a.state === 'string' ? a.state : undefined);
  switch (command) {
    case 'plan': {
      if (typeof a.out !== 'string') throw new Exit(2, USAGE);
      return planCommand(a.out);
    }
    case 'seal': {
      if (a.check) {
        const file = typeof a.seal === 'string' ? resolve(a.seal) : join(P.E, 'seal', 'seal.json');
        if (!existsSync(file)) throw new Exit(3, `seal: drift file ${file}`);
        const drift = await checkSeal({ seal: JSON.parse(readFileSync(file, 'utf8')), paths: P });
        if (drift) throw new Exit(3, `seal: ${drift}`);
        return 'seal: OK';
      }
      for (const f of ['commit', 'today-root', 'plan', 'out']) if (typeof a[f] !== 'string') throw new Exit(2, USAGE);
      const seal = await buildSeal({ commit: a.commit, todayRoot: resolve(a['today-root']), planFile: resolve(a.plan), paths: P });
      const text = jsonText(seal);
      writeOnce(join(resolve(a.out), 'seal.json'), text, 'seal');
      return `seal: ${sha256Hex(Buffer.from(text, 'utf8'))}`;
    }
    case 'ledger': {
      if (a.status) {
        return ['A', 'B'].map((s) => {
          const cap = STAGE_MAP[/** @type {'A' | 'B'} */ (s)] * 60;
          const spent = spentS(P, s);
          const m = (/** @type {number} */ x) => (x / 60).toFixed(3);
          return `${s} spent ${spent.toFixed(3)} s (${m(spent)} min) authorization ${cap.toFixed(3)} s (${m(cap)} min) remaining ${(cap - spent).toFixed(3)} s (${m(cap - spent)} min)`;
        }).join('\n');
      }
      if (a.check) {
        const limit = Number(a.limit);
        if ((a.stage !== 'A' && a.stage !== 'B') || !Number.isFinite(limit) || limit <= 0) throw new Exit(2, USAGE);
        const r = admit(P, a.stage, limit);
        if (!r.ok) throw new Exit(4, `ledger: refused ${r.why}`);
        return `ledger: admitted ${r.why}`;
      }
      if (a.append) {
        if (typeof a.json !== 'string') throw new Exit(2, USAGE);
        let line;
        try {
          line = JSON.parse(a.json);
        } catch {
          throw new Exit(5, 'ledger: refused the line is not JSON');
        }
        const out = validateLedgerLine(line, P);
        appendDurable(ledgerFile(P), toCrlf(JSON.stringify(out)));
        return `ledger: appended ${out.id}`;
      }
      throw new Exit(2, USAGE);
    }
    case 'reserve':
      return reserve(P, a);
    case 'release': {
      if (typeof a.id !== 'string') throw new Exit(2, USAGE);
      const file = pendingFile(P);
      if (!existsSync(file)) throw new Exit(5, 'release: refused, there is no reservation');
      const pending = JSON.parse(readFileSync(file, 'utf8'));
      if (pending.id !== a.id || !readJsonl(ledgerFile(P)).some((l) => l.id === a.id)) {
        throw new Exit(5, `release: refused, ${a.id} is not the reservation or has no ledger line`);
      }
      rmSync(file);
      return `release: ${a.id}`;
    }
    case 'run-group': {
      if ((a.stage !== 'A' && a.stage !== 'B') || typeof a.invocation !== 'string' || a.invocation === '') throw new Exit(2, USAGE);
      if ((a.group === undefined) === (a['overflow-group'] === undefined)) throw new Exit(2, USAGE);
      const n = Number(a.group ?? a['overflow-group']);
      if (!Number.isInteger(n) || n < 1) throw new Exit(2, USAGE);
      if (a['clock-offset-s'] !== undefined && !P.state) throw new Exit(2, 'run-group: --clock-offset-s needs --state');
      const offset = a['clock-offset-s'] === undefined ? 0 : Number(a['clock-offset-s']);
      if (!Number.isFinite(offset)) throw new Exit(2, USAGE);
      const result = await runGroup({
        stage: a.stage,
        ...(a.group === undefined ? { overflowGroup: n } : { group: n }),
        invocation: a.invocation,
        paths: P,
        clockOffsetS: offset,
      });
      const text = result.lines.join('\n');
      if (result.code !== 0) throw new Exit(result.code, text);
      return text === '' ? `run-group: ${a.stage} ${a.group ?? `o${n}`} complete` : text;
    }
    case 'status':
      if (a.stage !== 'A' && a.stage !== 'B') throw new Exit(2, USAGE);
      return statusCommand(P, a.stage);
    case 'publish':
      return publishCommand(P, a);
    default:
      throw new Exit(2, USAGE);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const out = await main(process.argv.slice(2));
    console.log(out);
  } catch (error) {
    if (error instanceof Exit) {
      console.log(error.message);
      process.exitCode = error.code;
    } else {
      console.error(error);
      process.exitCode = 1;
    }
  }
}
