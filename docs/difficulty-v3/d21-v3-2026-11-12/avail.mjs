// D36 availability probe (MP09d2): set attempts 0 to n - 1 of one board and level under v3, observed by spent.mjs
// (the rated, refused and unrateable profiles of each calibration). Reports no times. A board `WxH` is columns x rows;
// `--blocked <n>` blanks the last n cells of the last row, as rectRows in tools/bench/calibration-reference.js
// (deterministicBoard(164) is 13 x 13 with 5 blocked: 164 cells). Environment: D21_OUT (jsonl file), D21_ROOT (tree to
// measure, default the working directory).
//   node --import ./<this folder>/spent.mjs ./<this folder>/avail.mjs --board 13x13 --blocked 5 --level hell-1 --seed t18-big-a --attempts 3
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.D21_ROOT ?? '.');
const imp = (/** @type {string} */ p) => import(pathToFileURL(join(root, p)).href);
const { boardFromRows } = await imp('core/engine/board.js');
const { setAttempt } = await imp('core/engine/generate.js');
const { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } = await imp('core/engine/workspace.js');

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
}
const [, w, h] = /^(\d+)x(\d+)$/.exec(args.get('board') ?? '') ?? [];
const cols = Number(w);
const rows = Number(h);
const blocked = Number(args.get('blocked') ?? 0);
const levelId = args.get('level');
const seedText = args.get('seed');
const attempts = Number(args.get('attempts') ?? 3);
const label = `avail-${args.get('board')}${blocked > 0 ? `b${blocked}` : ''}-${levelId}`;
const boardRows = Array.from({ length: rows }, (_, y) => (y === rows - 1 && blocked > 0
  ? '#'.repeat(cols - blocked) + '.'.repeat(blocked)
  : '#'.repeat(cols)));
const board = boardFromRows(boardRows);
const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
const event = (/** @type {object} */ e) => globalThis.__d21Event({ label, ...e });
event({ ev: 'start', levelId, seedText, attempts, cols, rows, blocked, area: cols * rows - blocked });
for (let j = 0; j < attempts; j += 1) {
  globalThis.__d21Tag = `${label}/set/${j}`;
  try {
    const r = setAttempt({ board, rotation: 0, levelId, seedText, uniqueness: 'any', execution }, j);
    event({
      ev: 'set-attempt', j, ok: r.ok, reason: r.ok ? null : r.reason, K: r.ok ? r.set.pieces.length : null,
      calibrationScore: r.ok ? (r.calibration.rating?.score ?? null) : null,
    });
  } catch (e) {
    event({ ev: 'set-attempt', j, ok: false, reason: `error: ${/** @type {Error} */ (e).message}` });
  }
}
event({ ev: 'end' });
