// @ts-check
// PM1 tranche 1, reduced first slice (IGP-05), test side only. Canonical ratings of nested clue families on the
// `instr` tree, four lanes (one family per lane), probe by probe, every probe checkpointed:
//   windows     boundary search and a short scan next to the cap, for the cells without curves (Hell 1 on 215-484
//               cells, Hell 2, Hell 3)
//   scan        every count from K - 8 down to 1 (three consecutive capped counts stop it), three Nightmare cells
//   failed-sets today's set-stage call on four sets of a Hell 1 cell, its failure classified, then two families of
//               the part-1 algorithm for each set whose call made no puzzle
//   report      the records: pm1.json, pm1.md, families-<part>.jsonl, discoveries.jsonl
//   node tools\ig-proto\pm1.mjs windows|scan --cases <ids> --sets <n> --orders <n> --label <L> [--run-id <id>]
//        [--task <T>] [--source-label <SL>] [--horizon-s <H>] [--max-probes <n>]
//   node tools\ig-proto\pm1.mjs failed-sets --cases <ids> --sets <n> --orders <n> --label <L> [same options]
//   node tools\ig-proto\pm1.mjs report --label <L> [--run-id <id>] [--task <T>] [--source-label <SL>]
// `--max-probes` is a test option: the first invocation of a part stops after that many probes, so that a plan step
// that repeats the same arguments resumes the family from its checkpoint and finishes it.
// `--task IGP-05-dev` is for developer debugging: its files stay under tests/artifacts/ig-proto/<label>/IGP-05-dev/.
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { startCountFor } from './lib/calls.mjs';
import { loadEngine } from './lib/engine.mjs';
import { createLanes } from './lib/lanes.mjs';
import { artifactDir, elapsedS, evidenceDir, parseArgs, rel } from './lib/paths.mjs';
import { banner, buildMeta, harnessInfo, writeJson, writeJsonl, writeText } from './lib/records.mjs';
import { caseBoard, firstCarvedSet, setInfo } from './lib/sets.mjs';
import { ensureTree } from './lib/tree.mjs';

class Stop extends Error {}

const TASK = 'IGP-05';
const DEV_TASK = 'IGP-05-dev';
const VARIANT = 'instr';
const SEED_PREFIX = 'ig-pm1';
const MAX_ATTEMPTS = 8;
const LANES = 4;
export const PARTS = Object.freeze(['windows', 'scan', 'failed-sets']);
export const W_LIST = Object.freeze([95000000, 190000000, 380000000]);
export const OFFSET_BUCKETS = Object.freeze(['<0', '0', '1', '2', '3', '4', '>4']);
const MP12B1_START_CAPPED = Object.freeze({ '14x14-nightmare': 0.89, '12x12-nightmare': 0.53, '26x26-nightmare': 0.10 });
const MAX_PUBLISHED_BYTES = 4900000;

// ---------------------------------------------------------------------------------------------------------------
// The algorithms: pure functions of the ratings made so far (the family's checkpoint is its list of probes)

/** @typedef {'capped' | 'complete' | 'error'} Kind */
/** @typedef {{ next: number } | { result: string, lastComplete?: number, cappedAt?: number }} Step */

/** @param {Record<string, any>} record @returns {Kind} */
export const kindOf = (record) => (record.outcome === 'capped' ? 'capped'
  : record.score !== null && record.score !== undefined ? 'complete' : 'error');

/**
 * Part 1: a boundary search from the cheap side (more clues) and a short scan next to the cap. A count is rated once.
 * @param {number} K
 * @param {(count: number) => Kind | undefined} get The kind of an already rated count.
 * @returns {Step}
 */
export function planWindows(K, get) {
  const first = Math.min(Math.max(K - 8, 1), K - 2);
  const kind = get(first);
  if (kind === undefined) {
    return { next: first };
  }
  if (kind === 'error') {
    return { result: 'error' };
  }
  let start = first;
  if (kind === 'capped') {
    start = -1;
    for (const alt of [K - 4, K - 2]) {
      if (alt < 1 || alt === first) {
        continue;
      }
      const k = get(alt);
      if (k === undefined) {
        return { next: alt };
      }
      if (k === 'error') {
        return { result: 'error' };
      }
      if (k === 'complete') {
        start = alt;
        break;
      }
    }
    if (start < 0) {
      return { result: 'capped-at-cheap-side' };
    }
  }
  let lastComplete = start;
  let cappedAt = -1;
  let U = K - start;
  for (;;) {
    U *= 2;
    const c = Math.max(1, K - U);
    if (c === lastComplete) {
      return { result: 'no-cap', lastComplete };
    }
    const k = get(c);
    if (k === undefined) {
      return { next: c };
    }
    if (k === 'error') {
      return { result: 'error' };
    }
    if (k === 'capped') {
      cappedAt = c;
      break;
    }
    lastComplete = c;
    if (c === 1) {
      return { result: 'no-cap', lastComplete };
    }
  }
  while (lastComplete - cappedAt > 1) {
    const mid = Math.floor((cappedAt + lastComplete) / 2);
    const k = get(mid);
    if (k === undefined) {
      return { next: mid };
    }
    if (k === 'error') {
      return { result: 'error' };
    }
    if (k === 'capped') {
      cappedAt = mid;
    } else {
      lastComplete = mid;
    }
  }
  for (let c = lastComplete + 1; c <= Math.min(K - 2, lastComplete + 5); c += 1) {
    const k = get(c);
    if (k === undefined) {
      return { next: c };
    }
    if (k === 'error') {
      return { result: 'error' };
    }
  }
  return { result: 'boundary', lastComplete, cappedAt };
}

/**
 * Part 2: every count from K - 8 down to 1, stopping after three consecutive capped counts.
 * @param {number} K
 * @param {(count: number) => Kind | undefined} get
 * @returns {Step}
 */
export function planScan(K, get) {
  let run = 0;
  for (let c = Math.max(1, K - 8); c >= 1; c -= 1) {
    const k = get(c);
    if (k === undefined) {
      return { next: c };
    }
    if (k === 'error') {
      return { result: 'error' };
    }
    run = k === 'capped' ? run + 1 : 0;
    if (run === 3) {
      return { result: 'three-capped' };
    }
  }
  return { result: 'all-counts' };
}

/**
 * Part 3's classes, from a call's profiles (slim records). Order: censored, no set or no profile (`other`), a rated
 * in-band profile (`in-band-refused` when every in-band score was refused by AR1, else `limit` at 64 profiles and
 * `other` below), then without any in-band score `dead-end` (no rated candidate: every profile capped or refused) or
 * `never-in-band` (rated candidates, none in band).
 * @param {{ outcome: string, censored: boolean, profiles: any[] }} call
 * @param {number} limit The profile budget of a call.
 * @returns {string}
 */
export function classifyCall(call, limit) {
  if (call.censored) {
    return 'censored';
  }
  if (call.outcome !== 'ok' || call.profiles.length === 0) {
    return 'other';
  }
  const inBand = call.profiles.filter((/** @type {any} */ p) => p.inBand);
  if (inBand.length > 0) {
    if (inBand.every((/** @type {any} */ p) => !p.eligible)) {
      return 'in-band-refused';
    }
    return call.profiles.length >= limit ? 'limit' : 'other';
  }
  const candidates = call.profiles.filter((/** @type {any} */ p) => p.score !== null && p.ar1 !== true);
  return candidates.length === 0 ? 'dead-end' : 'never-in-band';
}

// ---------------------------------------------------------------------------------------------------------------
// Records

/** @param {unknown} x @returns {any} */
const plain = (x) => JSON.parse(JSON.stringify(x));

/** @param {unknown} text @returns {string} A message without absolute paths (records refuse them). */
const clean = (text) => String(text ?? '').replace(/[A-Za-z]:[\\/][^\s"']*/g, '<path>');

/** @param {number} offset The clue count less the set's start count. @returns {string} */
export const bucketOf = (offset) => (offset < 0 ? '<0' : offset > 4 ? '>4' : String(offset));

/**
 * @param {Record<string, any>} rec A rating record of lib/calls.mjs.
 * @param {number} startCount
 * @returns {Record<string, any>} The record without its rating and details, plus the offset and the in-band flags.
 */
export function slimProbe(rec, startCount) {
  const complete = rec.score !== null && rec.score !== undefined;
  const inBand = complete && rec.side === 'in';
  return {
    count: rec.count,
    startCount,
    offset: rec.count - startCount,
    outcome: rec.outcome,
    side: rec.side,
    score: rec.score,
    level: rec.level,
    inBand,
    eligible: inBand && rec.ar1 !== true,
    ar1: rec.ar1,
    censored: rec.censored,
    solutions: rec.solutions,
    mainWork: rec.mainWork,
    censusWork: rec.censusWork,
    workFirst: rec.workFirst,
    nodesFirst: rec.nodesFirst,
    countTail: complete && rec.workFirst >= 0 ? rec.mainWork - rec.workFirst : null,
    nodes: rec.nodes,
    censusNodes: rec.censusNodes,
    stop: rec.stop,
    r7Cut: rec.r7Cut,
    r7CutCensus: rec.r7CutCensus,
    ms: rec.ms,
    flags: rec.flags,
    ...(rec.details?.message === undefined ? {} : { message: clean(rec.details.message) }),
  };
}

/** @param {string} file @returns {any} */
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** @param {string} file @returns {any[]} */
const readLines = (file) => (existsSync(file)
  ? readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l))
  : []);

/** @param {string} file @param {unknown} value */
const appendLine = (file, value) => appendFileSync(file, `${JSON.stringify(value)}\n`);

/** @param {Record<string, any>} args @param {string[]} names */
function need(args, names) {
  for (const name of names) {
    if (args[name] === undefined) {
      throw new Stop(`--${name} is required`);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Parts: header, files, families

/**
 * @param {Record<string, string>} args
 * @param {string} part
 * @param {boolean} measuring A measuring part checks and writes its header; the report only reads.
 */
async function openPart(args, part, measuring) {
  need(args, ['label']);
  const task = args.task ?? TASK;
  if (task !== TASK && task !== DEV_TASK) {
    throw new Stop(`--task must be ${TASK} or ${DEV_TASK}`);
  }
  const runId = args['run-id'] ?? 'main';
  if (task === TASK && runId !== 'main' && runId !== 'dry') {
    throw new Stop(`unknown run id ${runId} for task ${task} (main or dry)`);
  }
  const dir = artifactDir(args.label, task, runId, part);
  const tree = await ensureTree(VARIANT, { sourceLabel: args['source-label'] });
  const harness = harnessInfo();
  const cases = (args.cases ?? '').split(',').filter((c) => c !== '');
  const sets = Number(args.sets);
  const orders = Number(args.orders);
  if (measuring) {
    need(args, ['cases', 'sets', 'orders']);
    if (cases.length === 0 || new Set(cases).size !== cases.length) {
      throw new Stop(`--cases must name each cell once: ${args.cases}`);
    }
    for (const c of cases) {
      caseBoard(c);
    }
    if (!Number.isInteger(sets) || sets < 1 || !Number.isInteger(orders) || orders < 1) {
      throw new Stop('--sets and --orders must be positive integers');
    }
  }
  return {
    task, runId, part, label: args.label, dir, tree, harness, cases, sets, orders, sourceLabel: args['source-label'],
    files: {
      state: join(dir, 'state.json'), progress: join(dir, 'progress.json'), families: join(dir, 'families.jsonl'),
      discoveries: join(dir, 'discoveries.jsonl'), calls: join(dir, 'calls.json'),
    },
  };
}

/** @typedef {Awaited<ReturnType<typeof openPart>>} Part */

/**
 * The part's `state.json` header holds its cells, sets and orders; every later invocation checks them, the tree and
 * the harness. A difference is an error before anything is measured.
 * @param {Part} p
 * @returns {any} The saved state, or null at the first invocation.
 */
function claimPart(p) {
  const expected = { part: p.part, cases: p.cases, sets: p.sets, orders: p.orders, treeId: p.tree.treeId, harnessHash: p.harness.harnessHash };
  if (!existsSync(p.files.state)) {
    return null;
  }
  const saved = readJson(p.files.state);
  for (const [key, value] of Object.entries(expected)) {
    if (!isDeepStrictEqual(saved[key], value)) {
      throw new Stop(`state.json of ${p.part} (${p.runId}) differs in ${key} (flags, tree or harness changed since the part started): nothing was measured`);
    }
  }
  return saved;
}

/**
 * @param {Part} p
 * @param {Record<string, any>} fields
 */
function writeState(p, fields) {
  writeJson(p.files.state, {
    format: 'ig-proto-state', version: 1, task: p.task, step: p.part, run: p.runId, label: p.label, part: p.part,
    cases: p.cases, sets: p.sets, orders: p.orders, treeId: p.tree.treeId, harnessHash: p.harness.harnessHash, ...fields,
  });
}

/**
 * @typedef {object} Spec One family of a part, in the fixed order.
 * @property {number} n
 * @property {string} caseId
 * @property {number} i Set index.
 * @property {number} o Order index.
 * @property {string} seedText Set seed.
 * @property {string | null} failure The failure class of the set's call (part 3).
 */

/**
 * @param {Part} p
 * @returns {Spec[]} Parts 1 and 2: cases, then sets, then orders.
 */
function plainSpecs(p) {
  /** @type {Spec[]} */
  const out = [];
  for (const caseId of p.cases) {
    for (let i = 0; i < p.sets; i += 1) {
      for (let o = 0; o < p.orders; o += 1) {
        out.push({ n: out.length, caseId, i, o, seedText: `${SEED_PREFIX}/${caseId}/${i}`, failure: null });
      }
    }
  }
  return out;
}

/**
 * @param {Part} p
 * @param {any} calls The calls.json of part 3.
 * @returns {Spec[]} Part 3: for each set in case and set order whose call made no puzzle, its orders.
 */
function failedSpecs(p, calls) {
  /** @type {Spec[]} */
  const out = [];
  for (const caseId of p.cases) {
    for (let i = 0; i < p.sets; i += 1) {
      const call = calls.sets.find((/** @type {any} */ s) => s.case === caseId && s.i === i);
      if (call === undefined || call.outcome === 'no-set' || call.callResult?.ok === true) {
        continue;
      }
      for (let o = 0; o < p.orders; o += 1) {
        out.push({ n: out.length, caseId, i, o, seedText: call.seed, failure: call.failure });
      }
    }
  }
  return out;
}

/** @param {Part} p @returns {{ sets: any[] }} */
const readCalls = (p) => (existsSync(p.files.calls) ? readJson(p.files.calls) : { sets: [] });

/** @param {string} seedText @param {string} caseId @param {number} i @returns {string} */
const callKey = (seedText, caseId, i) => `${caseId}/${i}/${seedText}`;

/**
 * The cache of the carved sets of an invocation.
 * @param {any} engine
 */
function setCache(engine) {
  /** @type {Map<string, any>} */
  const sets = new Map();
  return {
    /** @param {string} caseId @param {string} seedText */
    get(caseId, seedText) {
      const hit = sets.get(seedText);
      if (hit !== undefined) {
        return hit;
      }
      const entry = caseBoard(caseId);
      const carved = firstCarvedSet(engine, { boardRows: entry.boardRows, levelId: entry.levelId, seedText, maxAttempts: MAX_ATTEMPTS });
      const level = engine.levels.level(entry.levelId);
      const common = {
        caseId, levelId: entry.levelId, band: { min: level.min, max: Number.isFinite(level.max) ? level.max : null },
        boardRows: entry.boardRows, area: entry.area, orders: new Map(),
      };
      const value = carved.ok
        ? {
          ...common, ok: true, info: setInfo(carved), startCount: startCountFor(engine, entry.levelId, carved.K),
          pieces: plain(carved.set.pieces), witness: plain(carved.set.witness),
        }
        : { ...common, ok: false, reason: carved.reason, info: null, startCount: null, pieces: null, witness: null };
      sets.set(seedText, value);
      return value;
    },
    /** The positions of the witness shuffled by the order stream; `clues(c)` is its first `c`, sorted. */
    order(/** @type {any} */ set, /** @type {string} */ seedText, /** @type {number} */ o) {
      if (!set.orders.has(o)) {
        const { createRng, normalizeSeedText } = engine.rng;
        const rng = createRng(normalizeSeedText(seedText), `${SEED_PREFIX}/order/${o}`);
        set.orders.set(o, rng.shuffle(set.witness.map((/** @type {unknown} */ _, /** @type {number} */ k) => k)));
      }
      return set.orders.get(o);
    },
  };
}

/**
 * @param {Spec} spec
 * @param {any} set A cache entry.
 * @returns {Record<string, any>} A new family.
 */
function newFamily(spec, set) {
  return {
    n: spec.n,
    case: spec.caseId,
    level: set.levelId,
    band: set.band,
    set: {
      index: spec.i, seed: spec.seedText, attempt: set.info?.attempt ?? null, K: set.info?.K ?? null, area: set.area,
      offeredInSource: set.info?.offeredInSource ?? null, startCount: set.startCount, failure: spec.failure,
    },
    order: spec.o,
    probes: [],
    result: set.ok ? null : 'no-set',
    boundary: null,
    cappedAt: null,
    maxScore: null,
    inBand: 0,
    eligible: 0,
  };
}

/** @param {Record<string, any>} fam @returns {(count: number) => Kind | undefined} */
function getter(fam) {
  const byCount = new Map(fam.probes.map((/** @type {any} */ pr) => [pr.count, kindOf(pr)]));
  return (count) => byCount.get(count);
}

/**
 * @param {Record<string, any>} fam
 * @param {Step & { result: string }} step
 */
function finalize(fam, step) {
  fam.result = step.result;
  fam.boundary = step.result === 'boundary' ? { lastComplete: step.lastComplete, cappedAt: step.cappedAt } : null;
  fam.cappedAt = step.cappedAt ?? null;
  const scores = fam.probes.filter((/** @type {any} */ pr) => pr.score !== null).map((/** @type {any} */ pr) => pr.score);
  fam.maxScore = scores.length === 0 ? null : Math.max(...scores);
  fam.inBand = fam.probes.filter((/** @type {any} */ pr) => pr.inBand).length;
  fam.eligible = fam.probes.filter((/** @type {any} */ pr) => pr.eligible).length;
}

// ---------------------------------------------------------------------------------------------------------------
// The driver: up to four families in flight, one per lane, probe by probe

/**
 * @typedef {object} Pool
 * @property {any[]} lanes One lane object (`createLanes` of size 1) per worker.
 * @property {boolean} stop
 * @property {string[]} problems
 */

/** @param {number} size @param {number} horizonS @returns {Promise<Pool>} */
async function openPool(size, horizonS) {
  const lanes = await Promise.all(Array.from({ length: size }, () => createLanes({ variant: VARIANT, size: 1, horizonS })));
  return { lanes, stop: false, problems: [] };
}

/** @param {Pool} pool */
const closePool = (pool) => Promise.all(pool.lanes.map((l) => l.close()));

/**
 * Runs the part's families. In-flight families of an earlier invocation resume first; the others follow in the fixed
 * order. Completed families are appended to `families.jsonl` in the fixed order only; unfinished ones and completed
 * ones that wait for an earlier family are kept in `progress.json`, rewritten after every probe.
 * @param {Part} p
 * @param {any} engine
 * @param {Pool} pool
 * @param {Spec[]} specs
 * @param {number} maxProbes Probes this invocation may start (a test option).
 * @returns {Promise<{ probes: number, families: number }>}
 */
async function driveFamilies(p, engine, pool, specs, maxProbes) {
  const planFor = p.part === 'scan' ? planScan : planWindows;
  const cache = setCache(engine);
  const header = { part: p.part, task: p.task, run: p.runId, treeId: p.tree.treeId, harnessHash: p.harness.harnessHash };
  let flushed = readLines(p.files.families).length;
  /** @type {Map<number, any>} */
  const inflight = new Map();
  /** @type {Map<number, any>} */
  const completed = new Map();
  if (existsSync(p.files.progress)) {
    const saved = readJson(p.files.progress);
    if (saved.header.treeId !== header.treeId || saved.header.harnessHash !== header.harnessHash) {
      throw new Stop(`the checkpoint of ${p.part} was started on another tree or harness: nothing was rated`);
    }
    for (const fam of saved.inflight) {
      inflight.set(fam.n, fam);
    }
    for (const fam of saved.completed) {
      if (fam.n >= flushed) {
        completed.set(fam.n, fam);
      }
    }
  }
  const checkpoint = () => writeText(p.files.progress, JSON.stringify({
    header, flushed, inflight: [...inflight.values()], completed: [...completed.values()],
  }));
  const pending = [
    ...[...inflight.keys()].sort((a, b) => a - b),
    ...specs.filter((s) => s.n >= flushed && !inflight.has(s.n) && !completed.has(s.n)).map((s) => s.n),
  ];
  let probes = 0;
  let started = 0;
  let families = 0;
  const complete = (/** @type {Record<string, any>} */ fam) => {
    inflight.delete(fam.n);
    completed.set(fam.n, fam);
    families += 1;
    while (completed.has(flushed)) {
      appendLine(p.files.families, completed.get(flushed));
      completed.delete(flushed);
      flushed += 1;
    }
  };
  /**
   * @param {any} lane
   * @param {Spec} spec
   * @param {Record<string, any>} fam
   * @param {any} set
   * @param {number} count
   * @returns {Promise<any>} The rating record, or null when the lane did not admit the job.
   */
  const rateOne = async (lane, spec, fam, set, count) => {
    const idx = cache.order(set, spec.seedText, spec.o).slice(0, count)
      .sort((/** @type {number} */ a, /** @type {number} */ b) => a - b);
    const out = await lane.runAll([{
      kind: 'rate', boardRows: set.boardRows, pieces: set.pieces, clues: idx.map((/** @type {number} */ k) => set.witness[k]),
      W: null, levelId: set.levelId, idx,
    }]);
    if (out.defect !== null) {
      throw new Stop(`defect: ${out.defect.reason}`);
    }
    const result = out.results[0];
    if (result === undefined) {
      return null;
    }
    if (result.outcome === 'defect' || (result.message !== undefined && result.profiles !== undefined)) {
      throw new Stop(`the lane failed on ${fam.set.seed} order ${fam.order} count ${count}: ${clean(result.message ?? result.reason)}`);
    }
    return result;
  };
  const byN = new Map(specs.map((s) => [s.n, s]));
  const worker = async (/** @type {any} */ lane) => {
    while (!pool.stop) {
      const n = pending.shift();
      if (n === undefined) {
        return;
      }
      const spec = /** @type {Spec} */ (byN.get(n));
      const entry = cache.get(spec.caseId, spec.seedText);
      const fam = inflight.get(n) ?? newFamily(spec, entry);
      inflight.set(n, fam);
      for (;;) {
        const step = fam.result === null ? planFor(fam.set.K, getter(fam)) : { result: fam.result };
        if ('result' in step) {
          finalize(fam, step);
          complete(fam);
          checkpoint();
          break;
        }
        if (pool.stop || started >= maxProbes) {
          pool.stop = true;
          return;
        }
        started += 1;
        const rec = await rateOne(lane, spec, fam, entry, step.next);
        if (rec === null) {
          pool.stop = true;
          return;
        }
        const probe = slimProbe(rec, entry.startCount);
        fam.probes.push(probe);
        probes += 1;
        if (probe.inBand) {
          appendLine(p.files.discoveries, {
            part: p.part, case: fam.case, family: `${spec.seedText}#o${spec.o}`, count: probe.count, offset: probe.offset,
            boardRows: entry.boardRows, pieces: entry.pieces, clues: rec.idx.map((/** @type {number} */ k) => entry.witness[k]),
            rating: rec.rating, eligible: probe.eligible,
          });
        }
        checkpoint();
      }
    }
  };
  checkpoint();
  await Promise.all(pool.lanes.map((lane) => worker(lane).catch((e) => {
    pool.stop = true;
    pool.problems.push(e instanceof Error ? e.message : String(e));
  })));
  checkpoint();
  return { probes, families };
}

/**
 * @param {Part} p
 * @param {Spec[]} specs
 * @returns {{ planned: number, recorded: number, inFlight: number }}
 */
function familyCounts(p, specs) {
  const recorded = readLines(p.files.families).length;
  const inFlight = existsSync(p.files.progress) ? readJson(p.files.progress).inflight.length : 0;
  return { planned: specs.length, recorded, inFlight };
}

// ---------------------------------------------------------------------------------------------------------------
// Commands

/**
 * @param {Part} p
 * @param {string} startedAt
 * @param {number} horizonS
 * @param {Record<string, number>} progress
 * @param {Record<string, any>} fields
 * @returns {number} The invocation's seconds.
 */
function finishState(p, startedAt, horizonS, progress, fields) {
  const seconds = Math.round(elapsedS() * 1000) / 1000;
  writeState(p, { ...fields, lastInvocation: { start: startedAt, end: new Date().toISOString(), seconds, horizonS, progress } });
  return seconds;
}

/** @param {string[]} argv @param {'windows' | 'scan'} part @returns {Promise<number>} */
async function familiesCommand(argv, part) {
  const { args } = parseArgs(argv, {
    values: ['task', 'run-id', 'cases', 'sets', 'orders', 'label', 'source-label', 'horizon-s', 'max-probes'],
  });
  const p = await openPart(args, part, true);
  const prev = claimPart(p);
  const horizonS = Number(args['horizon-s'] ?? 285);
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();
  const maxProbes = args['max-probes'] !== undefined && prev?.lastInvocation == null ? Number(args['max-probes']) : Infinity;
  const specs = plainSpecs(p);
  if (prev === null) {
    mkdirSync(p.dir, { recursive: true });
    writeState(p, { done: false, lastInvocation: null, families: { planned: specs.length, recorded: 0, inFlight: 0 } });
  }
  const engine = await loadEngine(p.tree.root);
  const before = readLines(p.files.families).length;
  let ran = { probes: 0, families: 0 };
  /** @type {string[]} */
  let problems = [];
  if (before < specs.length) {
    const pool = await openPool(Math.min(LANES, specs.length - before), horizonS);
    try {
      ran = await driveFamilies(p, engine, pool, specs, maxProbes);
    } finally {
      await closePool(pool);
    }
    problems = pool.problems;
  }
  const counts = familyCounts(p, specs);
  const done = problems.length === 0 && counts.recorded === specs.length;
  const seconds = finishState(p, startedAt, horizonS, { probes: ran.probes }, { done, families: counts, failures: problems });
  process.stdout.write(`pm1: ${part}${p.runId === 'main' ? '' : ` (${p.runId})`}: ${ran.probes} probe(s), ${ran.families} family(ies) completed in this invocation, ${counts.recorded} of ${counts.planned} recorded, ${counts.inFlight} in flight (${seconds} s)${done ? '; done' : ''}\n`);
  if (problems.length > 0) {
    process.stderr.write(`pm1: STOP: ${problems.join('; ')}\n`);
    return 1;
  }
  return 0;
}

/**
 * Part 3's calls: today's set-stage call of every set, canonical profiles streamed, one call per lane.
 * @param {Part} p
 * @param {any} engine
 * @param {Pool} pool
 * @param {ReturnType<typeof setCache>} cache
 * @returns {Promise<number>} The calls recorded in this invocation.
 */
async function driveCalls(p, engine, pool, cache) {
  const limit = engine.policy.BUDGETS.clueSubsets;
  const calls = readCalls(p);
  const have = new Set(calls.sets.map((/** @type {any} */ s) => callKey(s.seed, s.case, s.i)));
  /** @type {{ caseId: string, i: number, seedText: string }[]} */
  const pending = [];
  for (const caseId of p.cases) {
    for (let i = 0; i < p.sets; i += 1) {
      const seedText = `${SEED_PREFIX}/${caseId}/fs/${i}`;
      if (!have.has(callKey(seedText, caseId, i))) {
        pending.push({ caseId, i, seedText });
      }
    }
  }
  let ran = 0;
  const worker = async (/** @type {any} */ lane) => {
    while (!pool.stop) {
      const job = pending.shift();
      if (job === undefined) {
        return;
      }
      const entry = caseBoard(job.caseId);
      const out = await lane.runAll([{
        kind: 'call', boardRows: entry.boardRows, levelId: entry.levelId, seedText: job.seedText, maxAttempts: MAX_ATTEMPTS,
      }]);
      const result = out.results[0];
      if (result === undefined) {
        pool.stop = true;
        return;
      }
      if (result.outcome === 'defect' || result.outcome === 'error') {
        throw new Stop(`the call of ${job.seedText} failed: ${clean(result.message ?? result.reason)}`);
      }
      const set = cache.get(job.caseId, job.seedText);
      if (set.ok && result.set !== undefined && result.set !== null && !isDeepStrictEqual(set.info, result.set)) {
        throw new Stop(`the host carve of ${job.seedText} differs from the lane's set`);
      }
      const profiles = (result.profiles ?? []).map((/** @type {any} */ r) => slimProbe(r, set.startCount ?? 0));
      const record = {
        i: job.i, case: job.caseId, seed: job.seedText, outcome: result.outcome, levelId: entry.levelId,
        band: set.band, set: set.info, startCount: set.startCount, callResult: result.result ?? null,
        censored: result.outcome === 'censored', cutAtS: result.cutAtS ?? null,
        reason: result.reason === undefined ? null : clean(result.reason), failures: result.failures ?? null,
        profiles, failure: /** @type {string | null} */ (null),
      };
      record.failure = record.callResult?.ok === true ? null : classifyCall(record, limit);
      const saved = readCalls(p);
      writeText(p.files.calls, JSON.stringify({
        format: 'ig-proto-pm1-calls', version: 1, task: p.task, run: p.runId, treeId: p.tree.treeId, harnessHash: p.harness.harnessHash,
        limits: { work: engine.policy.DEDUCE.work, profiles: limit },
        sets: [...saved.sets, record].sort((a, b) => (p.cases.indexOf(a.case) - p.cases.indexOf(b.case)) || (a.i - b.i)),
      }));
      ran += 1;
      if (lane.lanes[0].dead) {
        return;
      }
    }
  };
  await Promise.all(pool.lanes.map((lane) => worker(lane).catch((e) => {
    pool.stop = true;
    pool.problems.push(e instanceof Error ? e.message : String(e));
  })));
  return ran;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function failedSetsCommand(argv) {
  const { args } = parseArgs(argv, {
    values: ['task', 'run-id', 'cases', 'sets', 'orders', 'label', 'source-label', 'horizon-s', 'max-probes'],
  });
  const p = await openPart(args, 'failed-sets', true);
  const prev = claimPart(p);
  const horizonS = Number(args['horizon-s'] ?? 285);
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();
  const maxProbes = args['max-probes'] !== undefined && prev?.lastInvocation == null ? Number(args['max-probes']) : Infinity;
  const plannedCalls = p.cases.length * p.sets;
  if (prev === null) {
    mkdirSync(p.dir, { recursive: true });
    writeState(p, { done: false, lastInvocation: null, calls: { planned: plannedCalls, recorded: 0 }, families: null });
  }
  const engine = await loadEngine(p.tree.root);
  const cache = setCache(engine);
  let callsRan = 0;
  let ran = { probes: 0, families: 0 };
  /** @type {string[]} */
  let problems = [];
  const callsHave = readCalls(p).sets.length;
  const size = Math.min(LANES, Math.max(1, plannedCalls - callsHave));
  const poolCalls = callsHave < plannedCalls ? await openPool(size, horizonS) : null;
  if (poolCalls !== null) {
    try {
      callsRan = await driveCalls(p, engine, poolCalls, cache);
    } finally {
      await closePool(poolCalls);
    }
    problems = poolCalls.problems;
  }
  const calls = readCalls(p);
  /** @type {Spec[] | null} */
  let specs = null;
  if (problems.length === 0 && calls.sets.length === plannedCalls) {
    specs = failedSpecs(p, calls);
    const have = readLines(p.files.families).length;
    if (have < specs.length) {
      const pool = await openPool(Math.min(LANES, specs.length - have), horizonS);
      try {
        ran = await driveFamilies(p, engine, pool, specs, maxProbes);
      } finally {
        await closePool(pool);
      }
      problems = pool.problems;
    }
  }
  const counts = specs === null ? null : familyCounts(p, specs);
  const done = problems.length === 0 && calls.sets.length === plannedCalls && counts !== null && counts.recorded === counts.planned;
  const seconds = finishState(p, startedAt, horizonS, { calls: callsRan, probes: ran.probes }, {
    done, calls: { planned: plannedCalls, recorded: calls.sets.length }, families: counts, failures: problems,
  });
  process.stdout.write(`pm1: failed-sets${p.runId === 'main' ? '' : ` (${p.runId})`}: ${callsRan} call(s) and ${ran.probes} probe(s) in this invocation, calls ${calls.sets.length} of ${plannedCalls}, families ${counts === null ? 'not planned yet' : `${counts.recorded} of ${counts.planned}`} (${seconds} s)${done ? '; done' : ''}\n`);
  if (problems.length > 0) {
    process.stderr.write(`pm1: STOP: ${problems.join('; ')}\n`);
    return 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Analysis

/** @param {number | null | undefined} x @param {number} [d] @returns {number | null} */
const round = (x, d = 6) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

/** @param {number} n @param {number} of @returns {number | null} */
const share = (n, of) => (of === 0 ? null : n / of);

/** @param {number[]} values @returns {number | null} */
function med(values) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** @param {any[]} probes @returns {Record<string, { ratings: number, inBand: number, eligible: number }>} */
export function byOffset(probes) {
  const out = Object.fromEntries(OFFSET_BUCKETS.map((b) => [b, { ratings: 0, inBand: 0, eligible: 0 }]));
  for (const pr of probes) {
    const bucket = out[bucketOf(pr.offset)];
    bucket.ratings += 1;
    bucket.inBand += pr.inBand ? 1 : 0;
    bucket.eligible += pr.eligible ? 1 : 0;
  }
  return out;
}

/** @param {any[]} probes The share of in-band and of eligible ratings whose main work exceeds each W (in M). */
export function mainWorkAbove(probes) {
  const inBand = probes.filter((pr) => pr.inBand);
  const eligible = probes.filter((pr) => pr.eligible);
  const cell = (/** @type {any[]} */ list, /** @type {number} */ W) => {
    const n = list.filter((pr) => pr.mainWork > W).length;
    return { n, of: list.length, share: round(share(n, list.length)) };
  };
  return Object.fromEntries(W_LIST.map((W) => [String(W / 1e6), { inBand: cell(inBand, W), eligible: cell(eligible, W) }]));
}

/**
 * @param {any[]} fams The recorded families of one cell.
 * @param {number} planned
 * @param {any} sample A family record of the cell (level and band).
 */
function windowsCell(fams, planned, sample) {
  const probes = fams.flatMap((f) => f.probes);
  const scores = probes.filter((pr) => pr.score !== null).map((pr) => pr.score);
  const maxScore = scores.length === 0 ? null : Math.max(...scores);
  const inBand = probes.filter((pr) => pr.inBand);
  const eligible = probes.filter((pr) => pr.eligible);
  const results = fams.reduce((/** @type {Record<string, number>} */ acc, f) => ({ ...acc, [f.result]: (acc[f.result] ?? 0) + 1 }), {});
  const totalMs = probes.reduce((s, pr) => s + pr.ms, 0);
  const inFamilies = fams.filter((f) => f.inBand > 0).length;
  const eligibleFamilies = fams.filter((f) => f.eligible > 0).length;
  const n = inBand.length;
  const e = eligible.length;
  const verdict = fams.length === 0
    ? 'not reached (budget)'
    : (n > 0 ? `in-band ratings observed: ${n} (${e} eligible) in ${inFamilies} of ${fams.length} families`
      : `none observed in ${fams.length} families`)
      + (fams.length < planned ? `; ${planned - fams.length} of ${planned} families not reached (budget)` : '');
  return {
    level: sample?.level ?? null,
    band: sample?.band ?? null,
    planned,
    families: fams.length,
    sets: [...new Map(fams.map((f) => [f.set.seed, f.set])).values()].map((s) => ({
      seed: s.seed, attempt: s.attempt, K: s.K, area: s.area, startCount: s.startCount, offeredInSource: s.offeredInSource,
    })),
    results,
    inBand: { ratings: n, families: inFamilies },
    eligible: { ratings: e, families: eligibleFamilies },
    maxScore,
    gapToBand: maxScore === null || sample?.band === undefined ? null : round(sample.band.min - maxScore, 3),
    boundaries: fams.filter((f) => f.boundary !== null).map((f) => ({
      set: f.set.index, order: f.order, K: f.set.K, startCount: f.set.startCount, lastComplete: f.boundary.lastComplete,
      cappedAt: f.boundary.cappedAt, offsetLastComplete: f.boundary.lastComplete - f.set.startCount,
    })),
    cheapSideCapped: fams.filter((f) => f.result === 'capped-at-cheap-side').length,
    ratings: probes.length,
    capped: probes.filter((pr) => pr.outcome === 'capped').length,
    msPerRating: round(probes.length === 0 ? null : totalMs / probes.length, 3),
    msPerInBand: round(n === 0 ? null : totalMs / n, 3),
    byOffset: byOffset(probes),
    inBandRatings: inBand.map((pr) => ({ count: pr.count, offset: pr.offset, score: pr.score, eligible: pr.eligible, mainWork: pr.mainWork })),
    mainWorkAbove: mainWorkAbove(probes),
    verdict,
  };
}

/** @param {any[]} fams @param {number} planned @param {any} sample */
function scanCell(fams, planned, sample) {
  const probes = fams.flatMap((f) => f.probes);
  /** @type {Map<number, any[]>} */
  const byCount = new Map();
  for (const pr of probes) {
    byCount.set(pr.count, [...(byCount.get(pr.count) ?? []), pr]);
  }
  /** @type {Record<string, any>} */
  const counts = {};
  for (const c of [...byCount.keys()].sort((a, b) => b - a)) {
    const list = /** @type {any[]} */ (byCount.get(c));
    const complete = list.filter((pr) => pr.score !== null);
    const scores = complete.map((pr) => pr.score);
    counts[String(c)] = {
      n: list.length,
      offset: [...new Set(list.map((pr) => pr.offset))].sort((a, b) => a - b),
      scoreMedian: round(med(scores), 3),
      scoreMin: scores.length === 0 ? null : round(Math.min(...scores), 3),
      scoreMax: scores.length === 0 ? null : round(Math.max(...scores), 3),
      cappedShare: round(share(list.filter((pr) => pr.outcome === 'capped').length, list.length)),
      inBandShare: round(share(list.filter((pr) => pr.inBand).length, list.length)),
      eligibleShare: round(share(list.filter((pr) => pr.eligible).length, list.length)),
      workFirst: round(med(complete.filter((pr) => pr.workFirst >= 0).map((pr) => pr.workFirst)), 0),
      countTail: round(med(complete.filter((pr) => pr.countTail !== null).map((pr) => pr.countTail)), 0),
    };
  }
  const starts = fams.map((f) => {
    const sc = f.set.startCount;
    const rated = f.probes.find((pr) => pr.count === sc);
    const status = rated !== undefined ? (rated.outcome === 'capped' ? 'capped' : 'complete')
      : sc > f.set.K - 8 ? 'above-range' : 'stopped-above';
    return { set: f.set.index, order: f.order, startCount: sc, status };
  });
  const rated = starts.filter((s) => s.status === 'capped' || s.status === 'complete').length;
  const capped = starts.filter((s) => s.status === 'capped').length;
  const stoppedAbove = starts.filter((s) => s.status === 'stopped-above').length;
  return {
    level: sample?.level ?? null,
    band: sample?.band ?? null,
    planned,
    families: fams.length,
    sets: [...new Map(fams.map((f) => [f.set.seed, f.set])).values()].map((s) => ({
      seed: s.seed, attempt: s.attempt, K: s.K, area: s.area, startCount: s.startCount, offeredInSource: s.offeredInSource,
    })),
    results: fams.reduce((/** @type {Record<string, number>} */ acc, f) => ({ ...acc, [f.result]: (acc[f.result] ?? 0) + 1 }), {}),
    counts,
    startCount: [...new Set(fams.map((f) => f.set.startCount))].sort((a, b) => a - b),
    startCountCappedShare: {
      families: starts.length,
      rated,
      capped,
      share: round(share(capped, rated)),
      stoppedAbove,
      aboveRange: starts.filter((s) => s.status === 'above-range').length,
      upperBoundIfStoppedAreCapped: round(share(capped + stoppedAbove, rated + stoppedAbove)),
      mp12b1: /** @type {Record<string, number>} */ (MP12B1_START_CAPPED)[fams[0]?.case] ?? null,
      byFamily: starts,
    },
    windowCounts: Object.entries(counts).filter(([, x]) => x.inBandShare > 0)
      .map(([c, x]) => ({ count: Number(c), offset: x.offset, inBandShare: x.inBandShare, eligibleShare: x.eligibleShare })),
    ratings: probes.length,
    inBand: { ratings: probes.filter((pr) => pr.inBand).length },
    eligible: { ratings: probes.filter((pr) => pr.eligible).length },
    byOffset: byOffset(probes),
    mainWorkAbove: mainWorkAbove(probes),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Report

/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const fix = (x, d = 3) => (x === null || x === undefined ? '-' : Number(x).toFixed(d));
/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const pct = (x, d = 0) => (x === null || x === undefined ? '-' : `${(100 * x).toFixed(d)} %`);

/**
 * @param {string[]} head
 * @param {string[][]} rows
 * @returns {string[]}
 */
function table(head, rows) {
  return [`| ${head.join(' | ')} |`, `|${head.map((_, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];
}

/** @param {Record<string, any>} x A byOffset block. @returns {string} */
const offsetText = (x) => OFFSET_BUCKETS.map((b) => `${b}: ${x[b].inBand}/${x[b].eligible}`).join(', ');

/** @param {Record<string, any>} x A mainWorkAbove block. @param {'inBand' | 'eligible'} kind @returns {string} */
const aboveText = (x, kind) => Object.entries(x).map(([w, v]) => `${w} M: ${v[kind].n}/${v[kind].of}`).join(', ');

/**
 * @param {Part} p The part (for its files and header), opened without measuring.
 * @returns {{ state: any, fams: any[], inflight: any[], problems: string[], notes: string[] }}
 *   `problems` stop the report; `notes` (a report-only change of the harness since the part started) are recorded.
 */
function loadPart(p) {
  const state = existsSync(p.files.state) ? readJson(p.files.state) : null;
  const fams = readLines(p.files.families);
  const inflight = existsSync(p.files.progress) ? readJson(p.files.progress).inflight : [];
  /** @type {string[]} */
  const problems = [];
  /** @type {string[]} */
  const notes = [];
  if (state !== null) {
    if (state.treeId !== p.tree.treeId) {
      problems.push(`${p.part}: the part ran on another tree`);
    }
    if (state.harnessHash !== p.harness.harnessHash) {
      notes.push(`${p.part}: harness hash at the part's start ${state.harnessHash}, at the report ${p.harness.harnessHash} (a report-only change)`);
    }
  }
  fams.forEach((f, k) => {
    if (f.n !== k) {
      problems.push(`${p.part}: family line ${k} holds family ${f.n} (the fixed order is broken)`);
    }
    if (f.result === 'boundary') {
      const low = f.probes.find((/** @type {any} */ pr) => pr.count === f.boundary.cappedAt);
      const high = f.probes.find((/** @type {any} */ pr) => pr.count === f.boundary.lastComplete);
      if (f.boundary.lastComplete - f.boundary.cappedAt !== 1 || low?.outcome !== 'capped' || high === undefined || high.score === null) {
        problems.push(`${p.part}: family ${f.n} is a boundary family without a capped count right below a complete one`);
      }
    }
  });
  const found = new Set(readLines(p.files.discoveries).map((d) => `${d.family}@${d.count}`));
  for (const f of fams) {
    for (const pr of f.probes.filter((/** @type {any} */ x) => x.inBand)) {
      if (!found.has(`${f.set.seed}#o${f.order}@${pr.count}`)) {
        problems.push(`${p.part}: the in-band rating of family ${f.n} at count ${pr.count} is not in discoveries.jsonl`);
      }
    }
  }
  return { state, fams, inflight, problems, notes };
}

/** @param {any} engine @param {string} caseId */
const levelOf = (engine, caseId) => {
  const entry = caseBoard(caseId);
  const level = engine.levels.level(entry.levelId);
  return { level: entry.levelId, band: { min: level.min, max: Number.isFinite(level.max) ? level.max : null } };
};

/** @param {string[]} argv @returns {Promise<number>} */
async function reportCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'run-id', 'label', 'source-label'] });
  /** @type {Record<string, Part>} */
  const parts = {};
  for (const part of PARTS) {
    parts[part] = await openPart(args, part, false);
  }
  const run = parts.windows;
  const engine = await loadEngine(run.tree.root);
  /** @type {string[]} */
  const problems = [];
  /** @type {Record<string, any>} */
  const loaded = {};
  for (const part of PARTS) {
    loaded[part] = loadPart(parts[part]);
    problems.push(...loaded[part].problems);
  }
  if (problems.length > 0) {
    throw new Stop(`the report's checks failed: ${problems.slice(0, 20).join('; ')}${problems.length > 20 ? ` (+${problems.length - 20} more)` : ''}`);
  }
  /** @type {any[]} */
  const notReached = [];
  const NR = 'not reached (budget)';

  /** @param {string} part @param {string[]} cases @param {number} sets @param {number} orders */
  const unrecordedFamilies = (part, cases, sets, orders) => {
    const { fams, inflight } = loaded[part];
    const recorded = new Set(fams.map((/** @type {any} */ f) => f.n));
    const started = new Map(inflight.map((/** @type {any} */ f) => [f.n, f.probes.length]));
    let n = 0;
    for (const caseId of cases) {
      for (let i = 0; i < sets; i += 1) {
        for (let o = 0; o < orders; o += 1) {
          if (!recorded.has(n)) {
            notReached.push({
              part, case: caseId, set: i, order: o, status: started.has(n) ? `${NR}: started, ${started.get(n)} probes rated, unfinished` : NR,
            });
          }
          n += 1;
        }
      }
    }
  };

  /** @type {Record<string, any>} */
  const part1 = {};
  /** @type {Record<string, any>} */
  const part2 = {};
  /** @type {Record<string, any>} */
  const part3 = {};
  /** @type {Record<string, any>} */
  const status = {};
  for (const part of PARTS) {
    const s = loaded[part].state;
    status[part] = s === null ? { ran: false, done: false } : {
      ran: true, done: s.done === true, cases: s.cases, sets: s.sets, orders: s.orders, families: s.families ?? null, calls: s.calls ?? null,
    };
  }
  for (const part of /** @type {const} */ (['windows', 'scan'])) {
    const s = loaded[part].state;
    if (s === null) {
      notReached.push({ part, status: `${NR}: the part did not start` });
      continue;
    }
    unrecordedFamilies(part, s.cases, s.sets, s.orders);
    for (const caseId of s.cases) {
      const fams = loaded[part].fams.filter((/** @type {any} */ f) => f.case === caseId);
      const sample = fams[0] ?? { ...levelOf(engine, caseId) };
      (part === 'windows' ? part1 : part2)[caseId] = (part === 'windows' ? windowsCell : scanCell)(fams, s.sets * s.orders, sample);
    }
  }
  const s3 = loaded['failed-sets'].state;
  const calls3 = readCalls(parts['failed-sets']);
  if (s3 === null) {
    notReached.push({ part: 'failed-sets', status: `${NR}: the part did not start` });
  } else {
    const limit = calls3.limits?.profiles ?? engine.policy.BUDGETS.clueSubsets;
    for (const caseId of s3.cases) {
      /** @type {any[]} */
      const sets = [];
      for (let i = 0; i < s3.sets; i += 1) {
        const call = calls3.sets.find((/** @type {any} */ c) => c.case === caseId && c.i === i);
        if (call === undefined) {
          notReached.push({ part: 'failed-sets', case: caseId, set: i, what: 'call', status: NR });
          sets.push({ seed: `${SEED_PREFIX}/${caseId}/fs/${i}`, callResult: null, failure: null, status: NR, families: 0, inBandOffsets: [] });
          continue;
        }
        const fams = loaded['failed-sets'].fams.filter((/** @type {any} */ f) => f.case === caseId && f.set.index === i);
        const startCountProfiles = call.profiles.filter((/** @type {any} */ x) => x.count === call.startCount);
        const expectFamilies = call.outcome === 'no-set' || call.callResult?.ok === true ? 0 : s3.orders;
        if (fams.length < expectFamilies) {
          notReached.push({ part: 'failed-sets', case: caseId, set: i, what: 'families', status: `${NR}: ${expectFamilies - fams.length} of ${expectFamilies}` });
        }
        sets.push({
          seed: call.seed, K: call.set?.K ?? null, startCount: call.startCount, offeredInSource: call.set?.offeredInSource ?? null,
          outcome: call.outcome, callResult: call.callResult, censored: call.censored, cutAtS: call.cutAtS, profiles: call.profiles.length,
          startCountProfiles: {
            n: startCountProfiles.length, capped: startCountProfiles.filter((/** @type {any} */ x) => x.outcome === 'capped').length,
            refused: startCountProfiles.filter((/** @type {any} */ x) => x.ar1 === true).length,
          },
          inBandProfiles: call.profiles.filter((/** @type {any} */ x) => x.inBand).length,
          eligibleProfiles: call.profiles.filter((/** @type {any} */ x) => x.eligible).length,
          failure: call.failure,
          families: fams.length,
          familyResults: fams.map((/** @type {any} */ f) => f.result),
          inBandOffsets: fams.flatMap((/** @type {any} */ f) => f.probes.filter((/** @type {any} */ x) => x.inBand)
            .map((/** @type {any} */ x) => ({ order: f.order, count: x.count, offset: x.offset, score: x.score, eligible: x.eligible }))),
          maxScore: fams.reduce((/** @type {number | null} */ m, /** @type {any} */ f) => (f.maxScore === null ? m : m === null ? f.maxScore : Math.max(m, f.maxScore)), null),
        });
      }
      const classes = sets.reduce((/** @type {Record<string, number>} */ acc, x) => (x.failure === undefined || x.failure === null ? acc : { ...acc, [x.failure]: (acc[x.failure] ?? 0) + 1 }), {});
      const probes = loaded['failed-sets'].fams.filter((/** @type {any} */ f) => f.case === caseId).flatMap((/** @type {any} */ f) => f.probes);
      part3[caseId] = {
        sets, classes, made: sets.filter((x) => x.callResult?.ok === true).length,
        familyProbes: probes.length, inBand: probes.filter((/** @type {any} */ x) => x.inBand).length,
        eligible: probes.filter((/** @type {any} */ x) => x.eligible).length,
        byOffset: byOffset(probes), mainWorkAbove: mainWorkAbove(probes), level: levelOf(engine, caseId),
      };
    }
    if (calls3.sets.length === s3.cases.length * s3.sets && loaded['failed-sets'].inflight.length > 0) {
      notReached.push({ part: 'failed-sets', what: 'families', status: `${NR}: ${loaded['failed-sets'].inflight.length} started, unfinished` });
    }
  }

  // Pooled by level (part 1) and the first screen-limit inputs.
  /** @type {Record<string, any>} */
  const pooled = {};
  for (const level of ['hell-1', 'hell-2', 'hell-3']) {
    const cells = Object.entries(part1).filter(([, c]) => c.level === level);
    const fams = loaded.windows.fams.filter((/** @type {any} */ f) => f.level === level);
    const probes = fams.flatMap((/** @type {any} */ f) => f.probes);
    pooled[level] = {
      cells: cells.length, families: fams.length, ratings: probes.length,
      inBand: probes.filter((/** @type {any} */ x) => x.inBand).length, eligible: probes.filter((/** @type {any} */ x) => x.eligible).length,
      byOffset: byOffset(probes), mainWorkAbove: mainWorkAbove(probes),
    };
  }

  // Discoveries.
  const discoveryRows = [];
  for (const part of PARTS) {
    const seen = new Set();
    for (const d of readLines(parts[part].files.discoveries)) {
      const key = `${d.family}@${d.count}`;
      if (!seen.has(key)) {
        seen.add(key);
        discoveryRows.push(d);
      }
    }
  }
  const discoveriesPart = (/** @type {string} */ part) => discoveryRows.filter((d) => d.part === part).length;

  const meta = await buildMeta({ task: run.task, label: run.label, kind: 'pm1', trees: [VARIANT], sourceLabel: run.sourceLabel });
  const pm4Path = join(evidenceDir('provisional', 'IGP-02'), 'pm4.json');
  const pm4 = existsSync(pm4Path) ? readJson(pm4Path) : null;
  const record = {
    meta,
    run: run.runId,
    status,
    part1,
    pooled,
    part2,
    part3,
    discoveries: { total: discoveryRows.length, windows: discoveriesPart('windows'), scan: discoveriesPart('scan'), failedSets: discoveriesPart('failed-sets') },
    harnessNotes: PARTS.flatMap((part) => loaded[part].notes),
    notReached,
    limitations: [
      'Part 1 is a reduced diagnostic: per cell two sets and two nested orders, one boundary search from the cheap side and a short scan next to the cap. Non-monotone windows (a window below a capped count, or between two complete counts that are far apart) can be missed, so a cell without an in-band rating is "none observed", never "no window".',
      'A family whose cheap-side counts K - 8, K - 4 and K - 2 were all capped ("capped-at-cheap-side") shows nothing about the counts below them; the cap there is recorded as a limitation of the diagnostic.',
      'A family that ended "no-cap" rated every count its doubling reached as complete down to count 1 or to the clamp; its scan next to the cap is not run.',
      'Part 2 stops a family after three consecutive capped counts, so counts below the stop (the start count of 14x14 and 12x12 Nightmare among them) are not rated; the start-count capped share is given for the families that rated it, and the families whose scan stopped above it are counted apart, never inferred capped.',
      'Part 3 uses four sets per cell and two orders per failed set; a call cut at the invocation deadline is recorded as censored with its profiles.',
      'Every number is provisional (pre-freeze): the rating-v3 runtime of this worktree on the instr tree (diagnostic offers, D-IG13), not the frozen post-MP17 source.',
      'Times (ms per rating) come from four concurrent lanes on a 16-logical-core machine, shared with difficulty-v3 only by the lock protocol.',
    ],
    laterRound: {
      scope: 'The rest of tranche 1 (D-IG10): per cell 10 sets x 3 layouts (the witness and two walked layouts) x 2 orders in part 1, with full count scans; the same scope on the three Nightmare cells of part 2; 20 sets per cell in part 3. Tranche 2 (walked layouts on further cells, the held-out window audit) comes after it if tranche 1 leaves P4 or P1 undecided.',
      workerHours: 9,
      wallHours: 2.5,
      needs: "the owner's approval",
    },
  };

  const text = renderMarkdown(record, meta, pm4);
  const publish = run.task === TASK && run.runId === 'main';
  const outDir = publish ? evidenceDir(run.label, run.task) : join(run.dir, '..', 'report');
  mkdirSync(outDir, { recursive: true });
  writeJson(join(outDir, 'pm1.json'), record);
  writeText(join(outDir, 'pm1.md'), text);
  /** @type {string[]} */
  const written = ['pm1.json', 'pm1.md'];
  for (const part of PARTS) {
    const fams = loaded[part].fams;
    if (fams.length > 0) {
      writeJsonl(join(outDir, `families-${part}.jsonl`), fams);
      written.push(`families-${part}.jsonl`);
    }
  }
  if (discoveryRows.length > 0) {
    /** @type {any[]} */
    let rows = discoveryRows;
    const bytes = (/** @type {any[]} */ list) => Buffer.byteLength(list.map((r) => JSON.stringify(r)).join('\n'));
    // Above the published-size limit the inputs of the least important rows stay in the artifacts: first the
    // non-eligible ratings of part 2, then every non-eligible rating, then every row of part 2.
    const drop = [
      (/** @type {any} */ r) => r.part === 'scan' && !r.eligible,
      (/** @type {any} */ r) => !r.eligible,
      (/** @type {any} */ r) => r.part === 'scan',
    ];
    for (const stripped of drop) {
      if (bytes(rows) <= MAX_PUBLISHED_BYTES) {
        break;
      }
      rows = rows.map((r) => (stripped(r)
        ? { part: r.part, case: r.case, family: r.family, count: r.count, offset: r.offset, eligible: r.eligible, inputsOnlyInArtifacts: true } : r));
    }
    writeJsonl(join(outDir, 'discoveries.jsonl'), rows);
    written.push('discoveries.jsonl');
  }
  const sizes = written.map((n) => `${n} ${statSync(join(outDir, n)).size}`).join(', ');
  process.stdout.write(`pm1: report written to ${rel(outDir)}: ${sizes}\n`);
  return 0;
}

/**
 * @param {Record<string, any>} record
 * @param {any} meta
 * @param {any} pm4 IGP-02's pm4.json, or null.
 * @returns {string}
 */
function renderMarkdown(record, meta, pm4) {
  /** @type {string[]} */
  const lines = ['# IGP-05 PM1 tranche 1, reduced first slice', '', banner(meta), ''];
  lines.push('Observations of a reduced diagnostic (two sets x two nested orders per cell): "none observed" is never "no window".', '');
  lines.push('| Part | Status |', '|---|---|');
  for (const part of PARTS) {
    const s = record.status[part];
    const text = !s.ran ? 'not reached (budget): the part did not start'
      : s.done ? 'complete' : 'incomplete: the families listed under "Not reached (budget)" were not run';
    lines.push(`| ${part} | ${text} |`);
  }
  lines.push('');
  lines.push('## Part 1: windows of the cells without curves (Hell 1 on 215-484 cells, Hell 2, Hell 3)', '');
  const part1 = Object.entries(/** @type {Record<string, any>} */ (record.part1));
  if (part1.length === 0) {
    lines.push('not reached (budget)', '');
  } else {
    lines.push('Score-in-band ratings and AR1-eligible in-band ratings (Gproved >= 1) are counted apart.', '');
    lines.push(...table(['Cell', 'band', 'K (sets)', 'start counts', 'families', 'results', 'boundary counts (last complete / capped)', 'max score (gap to band)', 'in-band: ratings / families', 'eligible: ratings / families', 'ms per rating / per in-band', 'verdict'],
      part1.map(([c, x]) => [
        c, `[${x.band?.min ?? '-'}, ${x.band?.max ?? 'inf'})`, x.sets.map((/** @type {any} */ s) => s.K ?? '-').join(', ') || '-',
        x.sets.map((/** @type {any} */ s) => s.startCount ?? '-').join(', ') || '-', `${x.families} of ${x.planned}`,
        Object.entries(x.results).map(([k, v]) => `${k} ${v}`).join(', ') || '-',
        x.boundaries.map((/** @type {any} */ b) => `${b.lastComplete}/${b.cappedAt}`).join(', ') || '-',
        x.maxScore === null ? '-' : `${fix(x.maxScore, 1)} (${fix(x.gapToBand, 1)})`,
        `${x.inBand.ratings} / ${x.inBand.families}`, `${x.eligible.ratings} / ${x.eligible.families}`,
        `${fix(x.msPerRating, 0)} / ${fix(x.msPerInBand, 0)}`, x.verdict,
      ])), '');
    lines.push('The gap is the band\'s lower edge less the highest score of a complete rating (positive: no score reached the band). A boundary pair is the lowest complete count and the capped count right below it.', '');
    lines.push('### Pooled by level (first screen-limit inputs)', '');
    lines.push(...table(['Level', 'cells', 'families', 'ratings', 'in-band', 'eligible', 'in-band by offset (in band / eligible)', 'in-band main work above 95 / 190 / 380 M', 'eligible main work above 95 / 190 / 380 M'],
      Object.entries(/** @type {Record<string, any>} */ (record.pooled)).map(([lv, x]) => [
        lv, String(x.cells), String(x.families), String(x.ratings), String(x.inBand), String(x.eligible), offsetText(x.byOffset),
        aboveText(x.mainWorkAbove, 'inBand'), aboveText(x.mainWorkAbove, 'eligible'),
      ])), '');
    const withBand = part1.filter(([, x]) => x.inBand.ratings > 0);
    if (withBand.length > 0) {
      lines.push('### Cells with in-band ratings: by offset from today\'s start count and main work above W', '');
      lines.push(...table(['Cell', 'ratings by offset: in band / eligible per bucket', 'in-band main work above 95 / 190 / 380 M (of n)', 'eligible main work above 95 / 190 / 380 M (of n)', 'in-band ratings: count (offset, score, eligible)'],
        withBand.map(([c, x]) => [
          c, offsetText(x.byOffset), aboveText(x.mainWorkAbove, 'inBand'), aboveText(x.mainWorkAbove, 'eligible'),
          x.inBandRatings.map((/** @type {any} */ r) => `${r.count} (${r.offset >= 0 ? '+' : ''}${r.offset}, ${fix(r.score, 1)}, ${r.eligible ? 'yes' : 'no'})`).join('; '),
        ])), '');
    } else {
      lines.push('No cell of part 1 has an in-band rating among the families run, so there is no offset or main-work table for part 1.', '');
    }
  }
  lines.push('## Part 2: fine counts with nested orders (three Nightmare cells)', '');
  const part2 = Object.entries(/** @type {Record<string, any>} */ (record.part2));
  if (part2.length === 0) {
    lines.push('not reached (budget)', '');
  }
  for (const [c, x] of part2) {
    lines.push(`### ${c}`, '');
    const sc = x.startCountCappedShare;
    lines.push(`Level ${x.level}, band [${x.band?.min ?? '-'}, ${x.band?.max ?? 'inf'}); families ${x.families} of ${x.planned} (results: ${Object.entries(x.results).map(([k, v]) => `${k} ${v}`).join(', ') || '-'}); sets K ${x.sets.map((/** @type {any} */ s) => s.K).join(', ')}, start counts ${x.startCount.join(', ')}.`, '');
    lines.push(`**Start-count capped share (R29):** ${sc.capped} of ${sc.rated} families that rated their start count (${pct(sc.share)}), MP12b1 ${sc.mp12b1 === null ? '-' : pct(sc.mp12b1)}. ${sc.stoppedAbove} families stopped after three consecutive capped counts above their start count (not rated, not inferred; if all were capped the share would be ${pct(sc.upperBoundIfStoppedAreCapped)}); ${sc.aboveRange} had a start count above K - 8 (outside the scanned counts).`, '');
    lines.push(`In-band ratings ${x.inBand.ratings} (${x.eligible.ratings} eligible) of ${x.ratings}. Window counts (in-band share above zero): ${x.windowCounts.length === 0 ? 'none observed' : x.windowCounts.map((/** @type {any} */ w) => `${w.count} (offset ${w.offset.join('/')}, in band ${pct(w.inBandShare)}, eligible ${pct(w.eligibleShare)})`).join('; ')}.`, '');
    lines.push(...table(['count', 'offset', 'n', 'score median [min-max]', 'capped', 'in band', 'eligible', 'work to first solution (median)', 'count tail (median)'],
      Object.entries(x.counts).map(([k, v]) => [
        k, v.offset.join('/'), String(v.n), v.scoreMedian === null ? '-' : `${fix(v.scoreMedian, 1)} [${fix(v.scoreMin, 1)}-${fix(v.scoreMax, 1)}]`,
        pct(v.cappedShare), pct(v.inBandShare), pct(v.eligibleShare),
        v.workFirst === null ? '-' : `${(v.workFirst / 1e6).toFixed(1)} M`, v.countTail === null ? '-' : `${(v.countTail / 1e6).toFixed(1)} M`,
      ])), '');
    const pm4Cell = pm4?.cells?.[c]?.costByOffset;
    lines.push('Ratings by offset from today\'s start count, beside PM4\'s profiles of the same cell (IGP-02: today\'s call profiles and window subsets):', '');
    lines.push(...table(['Offset', 'PM1 ratings', 'PM1 in band', 'PM1 eligible', 'PM1 eligible share', 'PM4 profiles', 'PM4 useful', 'PM4 useful share'],
      OFFSET_BUCKETS.map((b) => {
        const o = x.byOffset[b];
        const q = pm4Cell?.[b];
        return [
          b, String(o.ratings), String(o.inBand), String(o.eligible), pct(share(o.eligible, o.ratings)),
          q === undefined ? '-' : String(q.n), q === undefined ? '-' : String(q.useful), q === undefined ? '-' : pct(share(q.useful, q.n)),
        ];
      })), '');
    if (x.inBand.ratings > 0) {
      lines.push(`In-band main work above 95 / 190 / 380 M: ${aboveText(x.mainWorkAbove, 'inBand')}; eligible: ${aboveText(x.mainWorkAbove, 'eligible')}.`, '');
    }
  }
  lines.push('## Part 3: failed-set populations of Hell 1', '');
  const part3 = Object.entries(/** @type {Record<string, any>} */ (record.part3));
  if (part3.length === 0) {
    lines.push('not reached (budget)', '');
  }
  for (const [c, x] of part3) {
    lines.push(`### ${c}`, '');
    lines.push(`Calls that made a puzzle: ${x.made} of ${x.sets.length}. Failure classes: ${Object.entries(x.classes).map(([k, v]) => `${k} ${v}`).join(', ') || 'none (no failed call recorded)'}. Families of the failed sets: ${x.familyProbes} ratings, in band ${x.inBand} (${x.eligible} eligible).`, '');
    lines.push(...table(['Set', 'K', 'start', 'call', 'profiles', 'start-count profiles (n / capped / refused)', 'in-band profiles (eligible)', 'failure class', 'families', 'family results', 'in-band offsets of its families (order: count, offset, eligible)'],
      x.sets.map((/** @type {any} */ s, /** @type {number} */ k) => [
        String(k), String(s.K ?? '-'), String(s.startCount ?? '-'),
        s.status !== undefined ? s.status : s.censored ? `censored at ${fix(s.cutAtS, 0)} s` : s.callResult?.ok ? `puzzle (${s.callResult.clueCount} clues)` : s.callResult === null ? s.outcome : `no puzzle (${s.callResult.reason})`,
        String(s.profiles ?? '-'), s.startCountProfiles === undefined ? '-' : `${s.startCountProfiles.n} / ${s.startCountProfiles.capped} / ${s.startCountProfiles.refused}`,
        s.inBandProfiles === undefined ? '-' : `${s.inBandProfiles} (${s.eligibleProfiles})`, s.failure ?? '-', String(s.families),
        (s.familyResults ?? []).join(', ') || '-',
        (s.inBandOffsets ?? []).map((/** @type {any} */ r) => `o${r.order}: ${r.count} (${r.offset >= 0 ? '+' : ''}${r.offset}, ${r.eligible ? 'yes' : 'no'})`).join('; ') || (s.families > 0 ? 'none observed' : '-'),
      ])), '');
    if (x.inBand > 0) {
      lines.push(`Family ratings by offset (in band / eligible): ${offsetText(x.byOffset)}. Main work above 95 / 190 / 380 M: in band ${aboveText(x.mainWorkAbove, 'inBand')}; eligible ${aboveText(x.mainWorkAbove, 'eligible')}.`, '');
    }
  }
  lines.push('## Discoveries', '');
  lines.push(`In-band ratings saved with their full inputs (\`discoveries.jsonl\`): ${record.discoveries.total} (part 1: ${record.discoveries.windows}, part 2: ${record.discoveries.scan}, part 3: ${record.discoveries.failedSets}).`, '');
  lines.push('## Not reached (budget)', '');
  if (record.notReached.length === 0) {
    lines.push('Nothing: every family and call of the three parts ran.', '');
  } else {
    lines.push(...table(['Part', 'Cell', 'Set', 'Order', 'What', 'Status'], record.notReached.map((/** @type {any} */ r) => [
      r.part, r.case ?? '-', String(r.set ?? '-'), String(r.order ?? '-'), r.what ?? 'family', r.status,
    ])), '');
  }
  lines.push('## Limitations', '');
  for (const t of record.limitations) {
    lines.push(`- ${t}`);
  }
  lines.push('', '## The later round (D-IG10)', '');
  lines.push(`${record.laterRound.scope} About ${record.laterRound.workerHours} worker-hours, ${record.laterRound.wallHours} hours on four lanes; it needs ${record.laterRound.needs}.`);
  if (record.harnessNotes.length > 0) {
    lines.push('', '## Harness notes', '');
    for (const t of record.harnessNotes) {
      lines.push(`- ${t}`);
    }
  }
  return lines.join('\n');
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'windows' || command === 'scan') {
    return familiesCommand(rest, command);
  }
  if (command === 'failed-sets') {
    return failedSetsCommand(rest);
  }
  if (command === 'report') {
    return reportCommand(rest);
  }
  throw new Stop('usage: pm1.mjs windows|scan|failed-sets|report ...');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`pm1: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
  setTimeout(() => process.exit(process.exitCode ?? 0), 10000).unref();
}
