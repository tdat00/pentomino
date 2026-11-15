// MP12b2 search summary (cross-review SP16, TP07, RP05): reads the captures of the GS-P3 populations (JSONL lines of
// kind call, attempts and event, written by observe.mjs with the D21 drivers) and prints Markdown, ASCII only.
//   node ./<folder>/summary.mjs <files...>
//   node --import ./<folder>/observe.mjs ./<folder>/summary.mjs --self-test   (D21_OUT: a new file under tests/artifacts)
// One row per file, one TOTAL row per population folder (the parent folder of the files: require, any, hell,
// hell-landscape, nightmare, stall). A ratio is never formed across files of different populations. "-" means
// unavailable (never 0). A "*" marks a censored number: the capture was stopped at its limit, so the accepted
// puzzles are those known at the stop. The median of an even count is the mean of the two middle values.
import { readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const POPULATIONS = ['require', 'any', 'hell', 'hell-landscape', 'nightmare', 'stall'];
const OUTCOMES = ['rated', 'refused', 'capped'];
const FINISHES = ['raw', 'unique', 'repaired', 'not-unique', 'capped', 'refused', 'rejected'];

/**
 * @param {string} file
 * @returns {{ calls: any[], events: any[], tail: number }} The calls that have their attempts line, the events in
 *   order, and 1 when the last call line has no attempts line (a capture stopped between the two lines).
 */
export function load(file) {
  const calls = [];
  const events = [];
  /** @type {any} */
  let pending = null;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim() === '') {
      continue;
    }
    const r = JSON.parse(line);
    if (r.kind === 'call') {
      if (pending !== null) {
        throw new Error(`${file}: a call line without its attempts line (tag ${pending.tag})`);
      }
      pending = { ...r, attempts: null };
      calls.push(pending);
    } else if (r.kind === 'attempts') {
      if (pending === null || pending.tag !== r.tag) {
        throw new Error(`${file}: an attempts line without the call line before it (tag ${r.tag})`);
      }
      pending.attempts = r;
      pending = null;
    } else if (r.kind === 'event') {
      events.push(r);
    }
  }
  if (pending !== null) {
    calls.pop();
  }
  return { calls, events, tail: pending === null ? 0 : 1 };
}

/** @param {number[]} v @returns {number | null} */
const median = (v) => {
  if (v.length === 0) {
    return null;
  }
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
};
/** @param {number[]} v @returns {number | null} */
const largest = (v) => (v.length === 0 ? null : Math.max(...v));
/** @param {number | null} v @param {number} d */
const fix = (v, d) => (v === null ? '-' : v.toFixed(d));
/** @param {number | null} v */
const million = (v) => (v === null ? '-' : v < 1e6 ? String(v) : `${(v / 1e6).toFixed(1)}M`);
/** @param {(v: number | null) => string} f @param {number[]} v */
const pair = (f, v) => `${f(median(v))}/${f(largest(v))}`;
/** @param {number[]} v */
const sum = (v) => v.reduce((a, b) => a + b, 0);
/** @param {Record<string, number>} counts @param {string[]} keys */
const slash = (counts, keys) => keys.map((k) => counts[k]).join('/');
/** @param {string[]} keys */
const zero = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));

/**
 * @param {string} file
 * @param {{ calls: any[], events: any[], tail: number }} [loaded]
 */
export function analyse(file, loaded = load(file)) {
  const { calls, events } = loaded;
  const s = {
    file, pop: basename(dirname(file)), tail: loaded.tail, n: calls.length,
    modes: { any: 0, require: 0 }, raw: zero(OUTCOMES), repair: zero(OUTCOMES), fin: zero(FINISHES),
    repairAttempts: 0, repairsOk: 0, requireOk: 0, fromRepair: 0, attempts: 0, capped: 0,
    /** @type {number[]} */ cappedWork: [], /** @type {number[]} */ cappedMs: [], /** @type {number[]} */ ratedMs: [],
    /** @type {number[]} */ callMs: [], started: false, status: '-', setOk: 0, setFailed: 0,
    /** @type {number | null} */ accepted: null, censored: false,
    /** @type {number | null} */ setMs: null, /** @type {number | null} */ foldMs: null,
    /** @type {number | null} */ totalMs: null,
  };
  for (const c of calls) {
    s.modes[/** @type {'any' | 'require'} */ (c.mode)] += 1;
    s.callMs.push(c.ms);
    for (const a of c.attempts.list) {
      const bucket = a.ph === 'raw' ? s.raw : s.repair;
      if (!(a.o in bucket)) {
        throw new Error(`${file}: unknown attempt outcome "${a.o}" (tag ${c.tag})`);
      }
      bucket[a.o] += 1;
      s.attempts += 1;
      if (a.o === 'capped') {
        s.capped += 1;
        s.cappedMs.push(a.ms);
        if (typeof a.w === 'number') {
          s.cappedWork.push(a.w);
        }
      } else if (a.o === 'rated') {
        s.ratedMs.push(a.ms);
      }
    }
    for (const f of c.attempts.finishes) {
      if (!(f.o in s.fin)) {
        throw new Error(`${file}: unknown finish outcome "${f.o}" (tag ${c.tag})`);
      }
      s.fin[f.o] += 1;
      if (f.o !== 'raw') {
        s.repairAttempts += 1;
      }
      if (f.o === 'repaired') {
        s.repairsOk += 1;
      }
    }
    if (c.mode === 'require' && c.result.ok) {
      s.requireOk += 1;
      if (c.attempts.finishes.some((/** @type {any} */ f) => f.sel && f.o === 'repaired')) {
        s.fromRepair += 1;
      }
    }
  }
  const ev = (/** @type {string} */ name) => events.filter((e) => e.ev === name);
  s.started = ev('start').length > 0;
  if (s.started) {
    const sets = ev('set-attempt');
    s.setOk = sets.filter((e) => e.ok).length;
    s.setFailed = sets.length - s.setOk;
    const end = ev('end')[0];
    const set = ev('set')[0];
    if (end !== undefined) {
      s.status = end.status;
      s.accepted = end.status === 'set-failed' ? 0 : end.accepted;
      s.setMs = end.setMs ?? null;
      s.foldMs = end.status === 'set-failed' ? null : end.foldMs ?? null;
      s.totalMs = end.status === 'set-failed' ? end.setMs ?? null : end.totalMs ?? null;
    } else {
      s.status = 'stopped at the limit';
      s.censored = true;
      const acc = ev('accepted');
      const fold = ev('fold-start');
      s.accepted = acc.length > 0 ? acc[acc.length - 1].slot : fold.length > 0 ? fold[0].fromCalibration : 0;
      s.setMs = set === undefined ? null : set.setMs;
    }
  }
  return s;
}

/** @typedef {ReturnType<typeof analyse>} Stats */

/** @param {string} name @param {Stats[]} list One file, or the files of one population (TOTAL). */
function row(name, list) {
  const one = list.length === 1 ? list[0] : null;
  const add = (/** @type {(s: Stats) => number} */ f) => sum(list.map(f));
  const total = (/** @type {Record<string, number>[]} */ parts, /** @type {string[]} */ keys) =>
    Object.fromEntries(keys.map((k) => [k, sum(parts.map((p) => p[k]))]));
  const raw = total(list.map((s) => s.raw), OUTCOMES);
  const repair = total(list.map((s) => s.repair), OUTCOMES);
  const fin = total(list.map((s) => s.fin), FINISHES);
  const withStart = list.filter((s) => s.started);
  const censored = withStart.some((s) => s.censored);
  const accepted = withStart.length === 0 ? null : sum(withStart.map((s) => /** @type {number} */ (s.accepted)));
  const attempts = sum(withStart.map((s) => s.attempts));
  const star = censored ? '*' : '';
  const all = (/** @type {(s: Stats) => number[]} */ f) => list.flatMap(f);
  const ms = (/** @type {number | null} */ v) => (v === null ? '-' : String(v));
  let times = ['-', '-', '-'];
  if (one !== null && one.started) {
    times = [ms(one.setMs), ms(one.foldMs), one.status === 'stopped at the limit' ? 'stopped at the limit' : ms(one.totalMs)];
  }
  return [
    name,
    `${add((s) => s.modes.any)}/${add((s) => s.modes.require)}`,
    slash(raw, OUTCOMES),
    slash(repair, OUTCOMES),
    slash(fin, FINISHES),
    `${add((s) => s.repairsOk)}/${add((s) => s.repairAttempts)}`,
    `${add((s) => s.fromRepair)}/${add((s) => s.requireOk)}`,
    withStart.length === 0 ? '-' : `${add((s) => (s.started ? s.setOk : 0))}/${add((s) => (s.started ? s.setFailed : 0))}`,
    accepted === null ? '-' : `${accepted}${star}`,
    accepted === null || accepted === 0 ? '-' : `${(attempts / accepted).toFixed(1)}${star}`,
    add((s) => s.attempts) === 0 ? '-' : `${((100 * add((s) => s.capped)) / add((s) => s.attempts)).toFixed(1)}%`,
    pair(million, all((s) => s.cappedWork)),
    pair((v) => fix(v, 1), all((s) => s.cappedMs)),
    pair((v) => fix(v, 1), all((s) => s.ratedMs)),
    pair((v) => fix(v, 1), all((s) => s.callMs)),
    ...times,
    one === null ? '-' : one.status,
  ];
}

const HEADER = [
  'File', 'Calls any/require (calls)', 'Raw attempts rated/refused/capped (raw attempts)',
  'Repair ratings rated/refused/capped (repair ratings)',
  'Finishes raw/unique/repaired/not-unique/capped/refused/rejected (finishes)',
  'Successful repairs / repair attempts (finishes other than raw)',
  'Results from a repair / require-mode calls with a result', 'Set attempts ok/failed (start events)',
  'Accepted puzzles (end event)', 'Attempts per accepted puzzle (raw + repair attempts / accepted)',
  'Capped share (capped / all attempts)', 'Capped work median/max', 'Capped ms median/max', 'Rated ms median/max',
  'Call ms median/max', 'setMs', 'foldMs', 'totalMs', 'Status (end event)',
];

/** @param {string[]} files @returns {string} */
export function summarise(files) {
  /** @type {Map<string, Stats[]>} */
  const groups = new Map();
  for (const f of files) {
    const s = analyse(f);
    groups.set(s.pop, [...(groups.get(s.pop) ?? []), s]);
  }
  const order = [...POPULATIONS.filter((p) => groups.has(p)), ...[...groups.keys()].filter((p) => !POPULATIONS.includes(p))];
  const out = ['# Search summary (MP12b2)', ''];
  out.push('Per file one row; one TOTAL row per population folder. "-" is unavailable, "*" a censored capture (stopped at its',
    'limit: the accepted puzzles are those known at the stop). A ratio never crosses populations. Times in ms.', '');
  for (const p of order) {
    const list = /** @type {Stats[]} */ (groups.get(p));
    out.push(`## Population ${p}`, '', `| ${HEADER.join(' | ')} |`, `|${HEADER.map(() => '---').join('|')}|`);
    for (const s of list) {
      out.push(`| ${row(basename(s.file), [s]).join(' | ')} |`);
    }
    out.push(`| ${row(`TOTAL ${p} (${list.length} file${list.length === 1 ? '' : 's'})`, list).join(' | ')} |`, '');
    const tails = list.filter((s) => s.tail > 0).map((s) => basename(s.file));
    if (tails.length > 0) {
      out.push(`Last call line without its attempts line, left out: ${tails.join(', ')}`, '');
    }
  }
  return `${out.join('\n')}\n`;
}

/** The four calls of the self-test and the row of its own file (the analysts' reference run at 041ff83). */
async function selfTest() {
  const root = resolve(process.env.D21_ROOT ?? '.');
  const file = process.env.D21_OUT;
  if (file === undefined) {
    throw new Error('--self-test needs D21_OUT (a new file under tests/artifacts/MP12b2/)');
  }
  const imp = (/** @type {string} */ p) => import(pathToFileURL(join(root, p)).href);
  const { boardFromRows } = await imp('core/engine/board.js');
  const { selectClues } = await imp('core/engine/clues.js');
  const { IncompleteRatingError } = await imp('core/engine/difficulty.js');
  const { levelForScore } = await imp('core/engine/levels.js');
  const { createRng } = await imp('core/engine/rng.js');
  const { createWorkspace, MAIN_WORKSPACE_BYTES } = await imp('core/engine/workspace.js');
  const { RECIPE_BOARD_ROWS, recipeWitness } = await imp('tests/fixtures/clue-recipes.js');
  const { CLASSIC_PENTOMINOES } = await imp('tests/fixtures/polyominoes.js');
  const stall = Number(/const STALL_LIMIT = (\d+);/.exec(readFileSync(join(root, 'core/engine/clues.js'), 'utf8'))?.[1]);
  if (stall !== 12 && stall !== 16) {
    throw new Error(`the self-test knows STALL_LIMIT 12 and 16, the tree has ${stall}`);
  }
  const board = boardFromRows([...RECIPE_BOARD_ROWS]);
  const pieces = [...CLASSIC_PENTOMINOES];
  const layout = recipeWitness();
  const target = { min: 17, max: 25, share: 0.38 };
  const scripted = (/** @type {Record<number, any>} */ table) => (/** @type {any} */ _b, /** @type {any[]} */ p, /** @type {any[]} */ clues) => {
    const e = table[clues.length];
    if (e === 'capped') {
      throw new IncompleteRatingError('the deduction path was capped', { nodes: 5, work: 7, stop: 'work-cap' });
    }
    if (e === undefined) {
      throw new Error(`no scripted rating for ${clues.length} clues`);
    }
    return { model: 'difficulty-v3', score: e[0], level: levelForScore(e[0]).id, saturated: false,
      metrics: { U: p.length - clues.length, Gproved: e[1] } };
  };
  const allOne = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => [k, [18, 1]]));
  const raw12 = 'raw:5:rated raw:5:rated raw:5:rated raw:5:rated raw:4:rated raw:5:rated raw:5:rated raw:4:rated raw:4:rated'
    + ' raw:5:rated raw:6:rated raw:5:rated raw:6:rated';
  const raw16 = `${raw12} raw:6:rated raw:5:rated raw:4:rated raw:6:rated`;
  const cases = [
    { name: 'S4', rng: 'repair-2', table: { 5: [21, 1], 6: [21, 0], 7: [21, 0], 8: [21, 0], 9: [21, 0] },
      attempts: 'raw:5:rated repair:6:refused raw:5:rated', finishes: '5@1:refused 5@2:unique>5*', clues: 'YUVWZ', ri: 2 },
    { name: 'S4ok', rng: 'repair-2', table: { 5: [21, 1], 6: [21, 1], 7: [21, 1], 8: [21, 1], 9: [21, 1] },
      attempts: 'raw:5:rated repair:6:rated', finishes: '5@1:repaired>6*', clues: 'IYTWZX', ri: null },
    { name: 'S6', rng: 'repair-2', table: { 5: [21, 1], 6: 'capped', 7: 'capped', 8: 'capped', 9: 'capped' },
      attempts: 'raw:5:rated repair:6:capped raw:5:rated', finishes: '5@1:capped 5@2:unique>5*', clues: 'YUVWZ', ri: 2, w: 7 },
    { name: 'repair-ri-0', rng: 'repair-ri-0', table: allOne,
      attempts: `${stall === 12 ? raw12 : raw16} repair:5:rated`, finishes: '4@5:repaired>5*', clues: 'IUTWX', ri: 3 },
  ];
  const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
  /** @type {string[]} */
  const returned = [];
  for (const c of cases) {
    globalThis.__d21Tag = c.name;
    const result = selectClues({ board, pieces, layout, target, rng: createRng(c.rng), uniqueness: 'require',
      excludeClueKeys: new Set(), ws, rate: scripted(c.table) });
    if (!result.ok) {
      throw new Error(`${c.name}: result.ok is false (${result.reason})`);
    }
    returned.push(result.clues.map((/** @type {any} */ p) => p.piece).join(''));
  }
  const { calls } = load(file);
  /** @type {string[]} */
  const diffs = [];
  const expect = (/** @type {string} */ what, /** @type {unknown} */ got, /** @type {unknown} */ want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      diffs.push(`${what}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
  };
  expect('calls in the file', calls.map((c) => c.tag), cases.map((c) => c.name));
  for (const [i, c] of cases.entries()) {
    const call = calls[i];
    if (call === undefined) {
      continue;
    }
    const { list, finishes } = call.attempts;
    expect(`${c.name} attempts`, list.map((/** @type {any} */ a) => `${a.ph}:${a.c}:${a.o}`).join(' '), c.attempts);
    expect(`${c.name} finishes`, finishes.map((/** @type {any} */ f) => `${f.c0}@${f.ri}:${f.o}${f.c1 === null ? '' : `>${f.c1}`}${f.sel ? '*' : ''}`).join(' '), c.finishes);
    expect(`${c.name} returned clues`, returned[i], c.clues);
    expect(`${c.name} ri`, call.result.ri, c.ri);
    expect(`${c.name} every attempt has ms >= 0`, list.every((/** @type {any} */ a) => typeof a.ms === 'number' && a.ms >= 0), true);
    if (c.w !== undefined) {
      expect(`${c.name} work of the capped attempt`, list.find((/** @type {any} */ a) => a.o === 'capped')?.w, c.w);
    }
  }
  const stats = analyse(file);
  const rawRated = stall === 12 ? 18 : 22;
  expect('row: calls', stats.modes, { any: 0, require: 4 });
  expect('row: raw attempts', stats.raw, { rated: rawRated, refused: 0, capped: 0 });
  expect('row: repair ratings', stats.repair, { rated: 2, refused: 1, capped: 1 });
  expect('row: finishes', stats.fin, { raw: 0, unique: 2, repaired: 2, 'not-unique': 0, capped: 1, refused: 1, rejected: 0 });
  expect('row: successful repairs', [stats.repairsOk, stats.repairAttempts], [2, 6]);
  expect('row: results from a repair', [stats.fromRepair, stats.requireOk], [2, 4]);
  expect('row: no start event', [stats.started, stats.accepted], [false, null]);
  console.log(summarise([file]));
  if (diffs.length > 0) {
    console.error(`self-test FAILED (${diffs.length}):\n${diffs.join('\n')}`);
    process.exit(1);
  }
  console.log(`self-test passed: 4 cases and the row of the file (STALL_LIMIT ${stall})`);
}

const argv = process.argv.slice(2);
if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  if (argv.includes('--self-test')) {
    await selfTest();
  } else if (argv.length === 0) {
    console.error('usage: node summary.mjs <files...> | --self-test');
    process.exit(1);
  } else {
    process.stdout.write(summarise(argv));
  }
}
