// @ts-check
// SA-Opus, T11 step 2 (stages 2 to 4 pack): the transport of the prior on the 20 uncapped Hell 1 rows of V4-S3P
// (arm fr-frozen-none-uncapped, the fitting reps 0-4), read from the valid published rows and their raw journals.
// - Every set-stage start: level hell-1, area A of the catalogue, W = DEDUCE.work (no screen on Hell 1) and
//   priorCount = clamp(round(share x K), 1, K - 2) with prior-s3-v1's share of hell-1@A (the table prior).
// - The batch transport (SA-Astra's review R16): the winning set call is the one of the valid row's
//   run.details.setAttempt, with its matching set-complete linkage and its unique set-stage start and end; its
//   successful rating (level, score) and end.locate.wc give, for a matching Hell 1 calibration (the rating shows the
//   target level; `require` would also need a unique certificate), priorCount = clamp(wc, 1, K - 2) on every batch
//   start; otherwise the table prior. Every batch start must be attributed: its row, its level and area, the winning
//   set's K and a `dispatch` linkage of the row's batch with its slot and attempt.
// These row runs persist no candidate `made` records and no packs: stored-recipe transport is not observed here.
// Unlocked: it reads records and writes its outputs beside itself; it rates nothing.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\t11-transport.mjs
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ingestRow, parseLines } from '../../../../tools/ig-proto/verdicts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-stages-2-4/evidence/sa-opus';
const TASK = 'V4-S3P';
const ARM = 'fr-frozen-none-uncapped';
const RUNS_DIR = `docs/improve-generating/evidence/frozen/${TASK}/${ARM}`;
const RAW_DIR = `tests/artifacts/ig-proto/frozen/${TASK}/${ARM}`;
const POLICY = 'tests/artifacts/ig-proto/frozen-source/core/engine/policy.js';

/** @type {{ path: string, sha256Lf: string }[]} */
const inputs = [];
const sha256 = (/** @type {string} */ text) => createHash('sha256').update(text, 'utf8').digest('hex');
const lf = (/** @type {string} */ text) => text.replace(/\r\n/g, '\n');
/** @param {string} path Repository-relative, with `/`. @returns {string} The file's text, indexed once. */
function read(path) {
  const text = readFileSync(join(ROOT, path), 'utf8');
  if (!inputs.some((e) => e.path === path)) {
    inputs.push({ path, sha256Lf: sha256(lf(text)) });
  }
  return text;
}
const json = (/** @type {string} */ path) => JSON.parse(read(path));
const clamp = (/** @type {number} */ v, /** @type {number} */ lo, /** @type {number} */ hi) => Math.min(hi, Math.max(lo, v));
const crlf = (/** @type {string} */ text) => `${text.replace(/\r?\n/g, '\r\n').replace(/[ \t]+\r\n/g, '\r\n').replace(/(\r\n)*$/, '')}\r\n`;

// The constant DEDUCE.work of the frozen source (the trees' policy.js differs from it only by the diagnostic offers).
read(POLICY);
const { DEDUCE } = await import(pathToFileURL(join(ROOT, POLICY)).href);
const W_NONE = DEDUCE.work;
// The harness module whose ingestRow and parseLines judge the rows and read the journals (unchanged since 57ef5cf).
read('tools/ig-proto/verdicts.mjs');

const plan = json(`tools/ig-proto/plans/${TASK}.json`);
const prior = json('tools/ig-proto/data/prior-s3-v1.json');
const catalogue = json('tools/ig-proto/data/boards-v1.json');

/** The declared rows of the arm: the row steps of the plan, `--cases <case>:<from>-<to>` on `--shard <shard>`. */
const declared = plan.steps.filter((s) => Array.isArray(s.node) && s.node[1] === 'run' && s.node.includes('--arm') && s.node[s.node.indexOf('--arm') + 1] === ARM)
  .flatMap((s) => {
    const at = (/** @type {string} */ flag) => s.node[s.node.indexOf(flag) + 1];
    const [, caseId, from, to] = /** @type {RegExpExecArray} */ (/^([^:]+):(\d+)-(\d+)$/.exec(at('--cases')));
    return Array.from({ length: Number(to) - Number(from) + 1 }, (_, i) => Number(from) + i)
      .map((rep) => ({ rowKey: `${caseId}~${rep}`, caseId, rep, shard: at('--shard') }));
  });

/** @type {{ row: string, call: string | null, kind: string, got: unknown, want: unknown }[]} */
const mismatches = [];
const miss = (/** @type {string} */ row, /** @type {string | null} */ call, /** @type {string} */ kind, /** @type {unknown} */ got, /** @type {unknown} */ want) => {
  mismatches.push({ row, call, kind, got, want });
};

const runsByShard = new Map();
const rows = declared.map((d) => {
  if (!runsByShard.has(d.shard)) {
    runsByShard.set(d.shard, json(`${RUNS_DIR}/${d.shard}.runs.json`));
  }
  const held = runsByShard.get(d.shard).rows.filter((/** @type {any} */ r) => r.rowKey === d.rowKey);
  const out = {
    rowKey: d.rowKey, cell: d.caseId, rep: d.rep, status: 'missing', setAttempt: null, K: null, tableShare: null, tablePrior: null,
    calibration: null, perSetPrior: null, setStarts: 0, setEnded: 0, batchStarts: 0, batchEnded: 0, batchDistinct: 0, unattributed: 0,
  };
  if (held.length !== 1) {
    miss(d.rowKey, null, held.length === 0 ? 'missing row' : 'duplicate row', held.length, 1);
    return out;
  }
  const row = held[0];
  const judged = ingestRow(row, { quantity: 10 });
  out.status = judged.status;
  if (judged.status !== 'valid' || row.caseId !== d.caseId || row.rep !== d.rep || row.seed !== `landscape/${d.caseId}/${d.rep}`) {
    miss(d.rowKey, null, 'row not valid or not its declared request', `${judged.status} ${row.caseId} ${row.rep} ${row.seed}`, 'valid');
    return out;
  }
  const board = catalogue.cases[d.caseId];
  const area = board.area;
  const cell = prior.cells[`${board.levelId}@${area}`];
  out.tableShare = cell?.share ?? null;
  const tablePrior = (/** @type {number} */ K) => (cell === undefined || K < 3 ? null : clamp(Math.round(cell.share * K), 1, K - 2));
  const logs = `${RAW_DIR}/${d.shard}/logs`;
  const names = existsSync(join(ROOT, logs)) ? readdirSync(join(ROOT, logs)).sort() : [];
  const workers = names.filter((n) => n.startsWith(`${d.rowKey}.`) && n.endsWith('.jsonl') && !n.endsWith('.row.jsonl') && n !== `${d.rowKey}.link.jsonl`);
  /** @type {any[]} */
  const lines = [];
  for (const name of workers) {
    const parsed = parseLines(read(`${logs}/${name}`), name);
    lines.push(...parsed.lines);
    for (const p of parsed.problems) {
      miss(d.rowKey, null, 'unreadable journal', p, 'none');
    }
  }
  const linkName = `${d.rowKey}.link.jsonl`;
  const links = names.includes(linkName) ? parseLines(read(`${logs}/${linkName}`), linkName) : { lines: [], problems: ['no link file'] };
  for (const p of links.problems) {
    miss(d.rowKey, null, 'unreadable link file', p, 'none');
  }
  const starts = lines.filter((l) => l.t === 'start');
  /** @type {Map<string, any[]>} */
  const ends = new Map();
  for (const l of lines.filter((x) => x.t === 'end')) {
    ends.set(l.call, [...(ends.get(l.call) ?? []), l]);
  }
  for (const s of starts) {
    if (s.row !== d.rowKey || s.level !== board.levelId || s.A !== area || s.variant !== ARM) {
      miss(d.rowKey, s.call, 'start of another row, level, area or variant', `${s.row} ${s.level} ${s.A} ${s.variant}`, `${d.rowKey} ${board.levelId} ${area} ${ARM}`);
    }
    if (s.W !== W_NONE) {
      miss(d.rowKey, s.call, `${s.stage} W`, s.W, W_NONE);
    }
    if ((ends.get(s.call) ?? []).length > 1) {
      miss(d.rowKey, s.call, 'two end lines', ends.get(s.call)?.length, 1);
    }
  }
  const sets = starts.filter((s) => s.stage === 'set');
  const batches = starts.filter((s) => s.stage === 'batch');
  for (const s of starts.filter((x) => x.stage !== 'set' && x.stage !== 'batch')) {
    miss(d.rowKey, s.call, 'start of another stage', s.stage, 'set or batch');
  }
  out.setStarts = sets.length;
  out.setEnded = sets.filter((s) => ends.has(s.call)).length;
  out.batchStarts = batches.length;
  out.batchEnded = batches.filter((s) => ends.has(s.call)).length;
  for (const s of sets) {
    const want = tablePrior(s.K);
    if (s.priorCount !== want) {
      miss(d.rowKey, s.call, 'set priorCount (table prior)', s.priorCount, want);
    }
  }
  // The winning set call (R16).
  const attempt = row.run.details?.setAttempt;
  out.setAttempt = attempt ?? null;
  const winners = sets.filter((s) => s.attempt === attempt);
  const completes = links.lines.filter((l) => l.ev === 'set-complete' && l.attempt === attempt && l.outcome === 'ok');
  if (!Number.isInteger(attempt) || winners.length !== 1 || completes.length !== 1) {
    miss(d.rowKey, null, 'winning set call not identified', `setAttempt ${attempt}, ${winners.length} starts, ${completes.length} set-complete`, 'one each');
    out.unattributed = batches.length;
    return out;
  }
  const win = winners[0];
  const winEnd = (ends.get(win.call) ?? [])[0];
  if (winEnd === undefined || winEnd.result !== 'ok' || typeof winEnd.accepted?.rating?.level !== 'string') {
    miss(d.rowKey, win.call, 'winning set call without a successful rating', winEnd?.result ?? 'no end', 'ok with a rating');
    out.unattributed = batches.length;
    return out;
  }
  out.K = win.K;
  if (row.run.details?.K !== win.K) {
    miss(d.rowKey, win.call, 'published K', row.run.details?.K, win.K);
  }
  const wc = winEnd.locate?.wc;
  const matching = winEnd.accepted.rating.level === board.levelId && (board.uniqueness !== 'require') && Number.isInteger(wc) && wc >= 1;
  out.calibration = { call: win.call, score: winEnd.score, ratingScore: winEnd.accepted.rating.score, level: winEnd.accepted.rating.level, wc: wc ?? null, uniqueness: board.uniqueness, matching };
  out.tablePrior = tablePrior(win.K);
  out.perSetPrior = matching ? clamp(wc, 1, win.K - 2) : null;
  const expected = matching ? clamp(wc, 1, win.K - 2) : tablePrior(win.K);
  const batchStart = links.lines.find((l) => l.ev === 'start');
  const dispatched = new Set(links.lines.filter((l) => l.ev === 'dispatch' && l.batch === batchStart?.batch).map((l) => `${l.slot}/${l.attempt}`));
  for (const s of batches) {
    const attributed = s.K === win.K && typeof s.attempt === 'string' && dispatched.has(s.attempt);
    if (!attributed) {
      out.unattributed += 1;
      miss(d.rowKey, s.call, 'unattributed batch start', `K ${s.K} attempt ${s.attempt}`, `K ${win.K}, a dispatch of batch ${batchStart?.batch}`);
    }
    if (s.priorCount !== expected) {
      miss(d.rowKey, s.call, matching ? 'batch priorCount (per-set prior)' : 'batch priorCount (table prior)', s.priorCount, expected);
    }
    if (matching && clamp(wc, 1, s.K - 2) !== tablePrior(s.K)) {
      out.batchDistinct += 1;
    }
  }
  return out;
});

const cells = [...new Set(declared.map((d) => d.caseId))].map((cell) => {
  const own = rows.filter((r) => r.cell === cell);
  const sum = (/** @type {(r: typeof rows[number]) => number} */ pick) => own.reduce((n, r) => n + pick(r), 0);
  return {
    cell, rows: own.length, valid: own.filter((r) => r.status === 'valid').length,
    share: own[0]?.tableShare ?? null,
    setStarts: sum((r) => r.setStarts), setEnded: sum((r) => r.setEnded),
    setMismatches: mismatches.filter((m) => m.row.startsWith(`${cell}~`) && m.kind.startsWith('set ')).length,
    matchingCalibrations: own.filter((r) => r.calibration?.matching === true).length,
    batchStarts: sum((r) => r.batchStarts), batchEnded: sum((r) => r.batchEnded),
    batchMismatches: mismatches.filter((m) => m.row.startsWith(`${cell}~`) && m.kind.startsWith('batch ')).length,
    batchDistinct: sum((r) => r.batchDistinct),
    unattributed: sum((r) => r.unattributed),
    otherMismatches: mismatches.filter((m) => m.row.startsWith(`${cell}~`) && !m.kind.startsWith('set ') && !m.kind.startsWith('batch ')).length,
  };
});

const inputsText = crlf(JSON.stringify(inputs, null, 2));
writeFileSync(join(ROOT, HERE, 't11-transport-inputs.json'), inputsText, 'utf8');
const indexHash = sha256(lf(inputsText));
const result = {
  script: `${HERE}/t11-transport.mjs`, task: TASK, arm: ARM, deduceWork: W_NONE, priorTable: prior.id,
  inputs: { path: `${HERE}/t11-transport-inputs.json`, entries: inputs.length, sha256Lf: indexHash },
  storedRecipeTransport: 'not observed in this row dataset (the request rows persist no candidate made records and no packs)',
  cells, rows, mismatches,
};
writeFileSync(join(ROOT, HERE, 't11-transport.json'), crlf(JSON.stringify(result, null, 2)), 'utf8');
const md = [
  '# T11: the transport of the prior on V4-S3P (fr-frozen-none-uncapped, Hell 1, reps 0-4)',
  '',
  `Written by \`${HERE}/t11-transport.mjs\`; inputs \`${HERE}/t11-transport-inputs.json\` (${inputs.length} files, sha256Lf ${indexHash}).`,
  `The table prior is \`${prior.id}\`; W must be DEDUCE.work = ${W_NONE} (no screen on Hell 1).`,
  '',
  '| Cell | rows | valid | share | set starts (ended) | set mismatches | matching calibrations | batch starts (ended) | batch mismatches | batch starts where the per-set prior differs from the table | unattributed | other mismatches |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...cells.map((c) => `| ${c.cell} | ${c.rows} | ${c.valid} | ${c.share} | ${c.setStarts} (${c.setEnded}) | ${c.setMismatches} | ${c.matchingCalibrations} | ${c.batchStarts} (${c.batchEnded}) | ${c.batchMismatches} | ${c.batchDistinct} | ${c.unattributed} | ${c.otherMismatches} |`),
  '',
  '| Row | winning set attempt | K | calibration level, score | wc | table prior | per-set prior | batch starts | where they differ |',
  '|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.rowKey} | ${r.setAttempt} | ${r.K} | ${r.calibration?.level ?? '-'} ${r.calibration?.score ?? '-'} | ${r.calibration?.wc ?? '-'} | ${r.tablePrior} | ${r.perSetPrior ?? '-'} | ${r.batchStarts} | ${r.batchDistinct} |`),
  '',
  `Mismatches: ${mismatches.length === 0 ? 'none.' : ''}`,
  ...mismatches.map((m) => `- ${m.row} ${m.call ?? ''}: ${m.kind}: ${JSON.stringify(m.got)}, expected ${JSON.stringify(m.want)}`),
  '',
  'Stored-recipe transport is not observed in this row dataset: the request rows persist no candidate `made` records and no packs',
  '(`arm.mjs`, `ig-log.js`), so `priorVerdict` does not apply to them and no pack check is claimed.',
].join('\n');
writeFileSync(join(ROOT, HERE, 't11-transport.md'), crlf(md), 'utf8');
process.stdout.write(`t11-transport: ${rows.length} rows, ${cells.length} cells, ${mismatches.length} mismatches; inputs ${inputs.length} files, index sha256Lf ${indexHash}\n`);
for (const c of cells) {
  process.stdout.write(`  ${c.cell}: ${c.valid}/${c.rows} valid; set ${c.setStarts} starts, ${c.setMismatches} mismatches; batch ${c.batchStarts} starts (${c.matchingCalibrations} matching calibrations), ${c.batchMismatches} mismatches, ${c.batchDistinct} where the per-set prior differs from the table; ${c.unattributed} unattributed; ${c.otherMismatches} other\n`);
}
