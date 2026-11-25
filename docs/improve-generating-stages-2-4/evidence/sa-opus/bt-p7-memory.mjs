// @ts-check
// SA-Opus, break-tasks (review R04, R05): the memory-boundary fixtures of P7's equality tier. Each fixture is a fully
// active W x H board tiled by K equal a x b rectangle pieces (ids r0, r1, ...), no clue. The near-limit pair has reference
// deduction slots (deduce.js slotTable) just below and just above the canonical 32 MiB, and its model arena plus those
// slots fit the main workspace (160 MiB), so the reference precheck, not the arena, decides. The candidates are searched
// with the slot-table and arena formulas, then confirmed with the frozen engine's own numbers: buildModel's rows,
// nonzeros and columns, the arena's bytes after the build (a fresh main workspace), and the bytes measureDeduction
// reports in its model-too-large error under memoryBytes 0 (the precheck throws before any deduction work: no rating,
// search or generation runs). Writes bt-p7-memory.json beside this script; read-only otherwise; unlocked.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-p7-memory.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { HERE, ROOT } from './s2-lib.mjs';

const SRC = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen-source', 'core', 'engine');
const load = (/** @type {string} */ n) => import(pathToFileURL(join(SRC, `${n}.js`)).href);
const [board, tiling, deduce, workspace, policy] = await Promise.all(['board', 'tiling', 'deduce', 'workspace', 'policy'].map(load));
const LIMIT = policy.DEDUCE.memoryBytes;
const BAND = 512 * 1024;
const MAIN = workspace.MAIN_WORKSPACE_BYTES;

/** deduce.js slotTable (lines 181-223): int32 4 bytes, uint8 1 byte. */
function slotBytes(R, C, NZ, NP, NC, Tsz) {
  const i32 = [C + 1, NZ, C, R + C, R, NP + 2, NP + 2, NP + 2, NP + 2, NP + 2, R, NP + 2, NP + 2, NP + 2, NC, NC, NC, NC, NC, NC,
    R, NP, NC, NC, NP, NC, NC, NC, NP, NC, NC, NC];
  const u8 = [R, C, R, NC + 1, NP, 2 * (Math.floor(Tsz / 2) + 1) * (2 * Tsz + 1), NC, NC, NP * (NC + 1)];
  return 4 * i32.reduce((s, x) => s + x, 0) + u8.reduce((s, x) => s + x, 0);
}

/** workspace.js modelSlots (lines 115-131): the arena of a fresh workspace. */
function arenaBytes(C, R, NZ, cells, NP) {
  const nodes = NZ + C + 1;
  return 4 * 6 * nodes + 4 * 6 * (C + 1) + 4 * R + 4 * NZ + 4 * (R + 1) + 2 * R + R + 2 * R + 2 * R + 4 * cells + 4 * NP;
}

/** @param {number} W @param {number} H @param {number} a @param {number} b */
function dims(W, H, a, b) {
  const K = (W * H) / (a * b);
  const place = (/** @type {number} */ p, /** @type {number} */ q) => Math.max(0, W - p + 1) * Math.max(0, H - q + 1);
  const R = K * (a === b ? place(a, a) : place(a, b) + place(b, a));
  const NZ = R * (a * b + 1);
  const NC = W * H;
  const C = NC + K;
  return { K, R, NZ, C, ref: slotBytes(R, C, NZ, K, NC, NC), arena: arenaBytes(C, R, NZ, NC, K), list: 4 * (3 * NZ + 2 * C) };
}

/** @type {any[]} */
const found = [];
for (let W = 16; W <= 128; W += 1) {
  for (let H = W; H <= 128; H += 1) {
    for (let a = 1; a <= W; a += 1) {
      for (let b = 1; b <= H; b += 1) {
        if (W % a !== 0 || H % b !== 0) {
          continue;
        }
        const d = dims(W, H, a, b);
        if (d.R > 600000 || d.NZ > 5000000 || d.arena + d.ref > MAIN) {
          continue;
        }
        if (d.ref > LIMIT - BAND && d.ref <= LIMIT + BAND) {
          found.push({ W, H, a, b, ...d });
        }
      }
    }
  }
}
found.sort((x, y) => x.NZ - y.NZ || x.R - y.R || x.ref - y.ref);
const pick = (/** @type {(f: any) => boolean} */ ok) => found.find(ok);
/** The canonical outcome by the memory rule: the precheck, then the lists only within the limit. */
const outcomeAt = (/** @type {any} */ f) => (f.ref > LIMIT ? 'model-too-large' : f.ref + f.list <= LIMIT ? 'lists' : 'reference');
for (const o of ['lists', 'reference', 'model-too-large']) {
  const c = found.filter((f) => outcomeAt(f) === o);
  process.stdout.write(`candidates ${o}: ${c.length}, with K >= 2: ${c.filter((f) => f.K >= 2).length}\n`);
}
const fixtures = [
  { id: 'mem-small', W: 10, H: 6, a: 1, b: 5 },
  { id: 'mem-mid', W: 20, H: 12, a: 1, b: 5 },
  { id: 'mem-near-lists', ...pick((f) => outcomeAt(f) === 'lists') },
  { id: 'mem-near-reference', ...pick((f) => f.K >= 2 && outcomeAt(f) === 'reference') },
  { id: 'mem-above', ...pick((f) => f.K >= 2 && outcomeAt(f) === 'model-too-large') },
];

/** The engine's own numbers for one fixture (build, arena bytes, reference slot bytes by the precheck). */
function engineFacts(/** @type {{ W: number, H: number, a: number, b: number }} */ f) {
  const K = (f.W * f.H) / (f.a * f.b);
  const rows = Array.from({ length: f.H }, () => '#'.repeat(f.W));
  const pieces = Array.from({ length: K }, (_, i) => ({
    id: `r${i}`, label: `R${i}`, color: '#888888',
    cells: Array.from({ length: f.a * f.b }, (_, k) => [k % f.a, Math.floor(k / f.a)]),
  }));
  const ws = workspace.createWorkspace(MAIN);
  const model = tiling.buildModel(board.boardFromRows(rows), pieces, [], ws);
  const arena = ws.bytes();
  /** @type {any} */
  let error = null;
  try {
    deduce.measureDeduction(model, { ...policy.DEDUCE, memoryBytes: 0 });
  } catch (e) {
    error = { name: /** @type {any} */ (e).name, code: /** @type {any} */ (e).code ?? null, details: /** @type {any} */ (e).details ?? null };
  }
  const NZ = model.rowStart[model.rowCount];
  return { K, rows: model.rowCount, nonzeros: NZ, columns: model.columns, arenaBytes: arena, refBytes: error?.details?.bytes ?? null,
    listBytes: 4 * (3 * NZ + 2 * model.columns), error };
}

const out = { limit: LIMIT, band: BAND, mainWorkspace: MAIN, searched: found.length, fixtures: /** @type {any[]} */ ([]) };
for (const f of fixtures) {
  const e = engineFacts(f);
  const d = dims(f.W, f.H, f.a, f.b);
  out.fixtures.push({
    id: f.id, W: f.W, H: f.H, a: f.a, b: f.b, ...e,
    formulaMatches: e.refBytes === d.ref && e.arenaBytes === d.arena && e.rows === d.R && e.nonzeros === d.NZ,
    refMinusLimit: (e.refBytes ?? NaN) - LIMIT,
    arenaPlusRefWithinMain: e.arenaBytes + (e.refBytes ?? Infinity) <= MAIN,
    canonical: (e.refBytes ?? Infinity) > LIMIT ? 'model-too-large' : (e.refBytes ?? 0) + e.listBytes <= LIMIT ? 'lists' : 'reference',
  });
}
writeFileSync(join(HERE, 'bt-p7-memory.json'), `${JSON.stringify(out, null, 2)}\n`.replace(/\n/g, '\r\n'));
for (const f of out.fixtures) {
  process.stdout.write(`${f.id}: ${f.W}x${f.H} board, ${f.K} pieces ${f.a}x${f.b}; rows ${f.rows}, nonzeros ${f.nonzeros}, columns ${f.columns}; `
    + `arena ${f.arenaBytes}, reference slots ${f.refBytes} (limit ${f.refMinusLimit >= 0 ? '+' : ''}${f.refMinusLimit}), lists ${f.listBytes}; `
    + `at 32 MiB: ${f.canonical}; formulas ${f.formulaMatches ? 'match' : 'DIFFER'}\n`);
}
