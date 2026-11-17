// @ts-check
// Self-test of the harness (IGP-00 §10). Run under the lock wrapper by run-task.ps1; it carves and rates only small
// cases (about 60 s). Each case prints `PASS <name>` or `FAIL <name>: <reason>`; the state file records the results
// and the script exits 1 on any failure.
//   node tools\ig-proto\self-test.mjs --label <L> --source-label <SL> --horizon-s <H> [--only 1,3] [--proto] [--p6] [--task <T>]
// `--proto` (IGP-01) adds the prototype's cases after IGP-00's nine; its state goes to <T>/self-test/state.json
// (default IGP-01 with --proto, else IGP-00). `--p6` (IGP-04) runs all of them and adds the P6 cases (default task IGP-04).
// `--frozen` (V4-T01a, V4-T01b, V4-T03) runs only the frozen-source group (default task V4-T01a): carve-only checks and records, unlocked.
// `--items` (V4-T04a onwards) runs only the measurement-items group (default task V4-T04a): synthetic worker kinds, unlocked.
// `--v4` (V4-T02a onwards) runs only the gen-v4 prototype group (default task V4-T02a); it runs through the lock helper.
// Its fifteen cases: V4-T02a's three (tree, dispatch and bounds; locate, rescue and re-rating order; skips and window),
// V4-T02b's five (observers parity, throwing observers, skip replay round trip, legacy dispatch, the rate seam),
// V4-T02c's four (provenance versions per arm, the reader by the record's own algo, old and new records load and save,
// version and table refusal before any work) and V4-T02d's three (every primitive is announced, no real rating
// exceeds its bound, the journal changes no result).
// Under `--label frozen` the four stage-1 task ids (`V4-T04`, `V4-T04v4`, `V4-T04f`, `V4-T04i`) are historical records that
// the stage-1 receipt hashes (V4-T04f, D-V4-18): once their state exists a run with such a `--task` exits 3, writing nothing.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { Worker } from 'node:worker_threads';

import { SOURCE_FILES } from '../bench/report.js';
import { checkText } from '../check-conventions.mjs';
import { decide, readInvocations } from './lib/budget.mjs';
import { rateAttempt, recordedCall, screenRating, startCountFor, windowSubsets } from './lib/calls.mjs';
import { loadEngine } from './lib/engine.mjs';
import { identityHash, itemIdentity, logEnd, logSpawn, logStart, manifestHash, readItemLog, resumePlan, runItems } from './lib/items.mjs';
import { createLanes } from './lib/lanes.mjs';
import { itemLedger, pairPrimitives } from './lib/ledger.mjs';
import { preparePackPath, writePackFile } from './lib/packs.mjs';
import { artifactDir, elapsedS, evidenceDir, FROZEN_COMMIT, FROZEN_DIGEST, IG_DIR, parseArgs, rel, ROOT, SOURCE_KIND, sourceRoot } from './lib/paths.mjs';
import { ACCEPTED_FORMAT, acceptedBinding, checkAccepted, LIVE_DEADLINE_FIELDS, proofCheck, proofEnvelope, readRepoFile, STAGE1_COVERAGE_EXTRA } from './lib/proof.mjs';
import { harnessInfo, sha256, sha256File, sha256Text, sourceDigest, sourceVersions, worktreeDigest, writeJson, writeJsonl, writeText } from './lib/records.mjs';
import { caseBoard, carveSet, firstCarvedSet } from './lib/sets.mjs';
import { buildTree, collectSources, ensureTree, listVariants, planTree } from './lib/tree.mjs';
import { pairResult } from './identity.mjs';
import { buildInventory, readFamilies } from './pm1-inventory.mjs';
import { compareSnapshot, snapshotEntries, verifySnapshot } from './snapshot.mjs';
import { expandManifest, IDENTITY_SEEDS, identityVerdict, judgeStage1, main as checkMain, parityVerdict, pm4GateEvidence, pm4Verdict, replayVerdict, stage1Expectation, stage1Inputs, stage1Verdict, stepEvidence } from './v4-check.mjs';

const SELFTEST_DIR = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'selftest');
const GIT_CALL = new RegExp('(?:execFileSync|execSync|spawnSync|spawn|execFile|exec|fork)\\(\\s*[\'"`]git\\b|^\\s*&?\\s*git(?:\\.exe)?\\s+(?:rev-parse|status|log|diff|show|add|commit|push|ls-files)\\b', 'm');

/** @type {Record<string, any>} */
const engines = {};
/** @type {Record<string, any>} */
const memo = {};

/** @param {boolean} cond @param {string} message */
function assert(cond, message) {
  if (!cond) {
    throw new Error(message);
  }
}

/** @param {unknown} a @param {unknown} b @param {string} message */
function same(a, b, message) {
  if (!isDeepStrictEqual(a, b)) {
    throw new Error(message);
  }
}

/** @param {string} dir @returns {string} The folder, emptied. */
function fresh(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** @param {string} variant */
async function engine(variant) {
  if (engines[variant] === undefined) {
    const tree = await ensureTree(variant);
    const e = await loadEngine(tree.root);
    engines[variant] = {
      tree, e, ws: e.workspace.createWorkspace(e.workspace.MAIN_WORKSPACE_BYTES),
      scratch: e.workspace.createWorkspace(e.workspace.SCRATCH_WORKSPACE_BYTES),
    };
  }
  return engines[variant];
}

/** @param {string} dir @param {(path: string) => boolean} keep @returns {string[]} */
function files(dir, keep) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...files(path, keep));
    } else if (keep(path)) {
      out.push(path);
    }
  }
  return out;
}

/** The rating or the error of an attempt, in a form two attempts can be compared by. */
const outcomeOf = (/** @type {any} */ att) => (att.error === null
  ? { rating: att.rating }
  : { error: { name: att.error.name, message: att.error.message, counters: att.error.counters } });

/** @returns {Promise<any[]>} The corpus of cases 4, 6 and 7. */
async function corpus() {
  if (memo.corpus !== undefined) {
    return memo.corpus;
  }
  const base = await engine('base');
  /** @type {any[]} */
  const items = [];
  const add = (/** @type {string} */ caseId, /** @type {string} */ seedText, /** @type {number[]} */ offsets, /** @type {number} */ perCount) => {
    const entry = caseBoard(caseId);
    const carved = firstCarvedSet(base.e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText });
    assert(carved.ok, `the carve of ${caseId} ${seedText} failed`);
    const c = /** @type {any} */ (carved);
    const startCount = startCountFor(base.e, entry.levelId, c.K);
    for (const s of windowSubsets(base.e, { set: c.set, seedText, offsets, perCount, startCount })) {
      items.push({ caseId, levelId: entry.levelId, boardRows: entry.boardRows, board: c.board, pieces: c.set.pieces, clues: s.clues, idx: s.idx });
    }
  };
  add('10x10-hard', 'ig-selftest/instr/0', [-1, 0, 1, 2], 2);
  add('10x10-hard', 'ig-selftest/instr/1', [-1, 0, 1, 2], 2);
  add('12x12-nightmare', 'ig-selftest/instr/n', [0], 2);
  memo.corpus = items;
  return items;
}

/** @param {string} variant @returns {Promise<any[]>} One attempt per corpus item, in corpus order. */
async function attempts(variant) {
  memo.attempts ??= {};
  if (memo.attempts[variant] === undefined) {
    const { e, ws } = await engine(variant);
    memo.attempts[variant] = (await corpus()).map((item) => rateAttempt(e, {
      board: item.board, pieces: item.pieces, clues: item.clues, ws, levelId: item.levelId, idx: item.idx,
    }));
  }
  return memo.attempts[variant];
}

const cases = [
  {
    name: 'paths and fingerprint guard',
    async run() {
      assert(existsSync(join(ROOT, 'package.json')) && existsSync(join(IG_DIR, 'self-test.mjs')), 'ROOT is not the repository root');
      assert(SOURCE_FILES.every((p) => !p.startsWith('tools/ig-proto/')), 'a file under tools/ig-proto/ is in SOURCE_FILES');
      const scanned = files(IG_DIR, (p) => /\.(mjs|js|ps1)$/.test(p));
      for (const variant of ['base', 'instr', 'log']) {
        scanned.push(join((await ensureTree(variant)).root, 'tools', 'calibrate.mjs'));
      }
      for (const path of scanned) {
        assert(!GIT_CALL.test(readFileSync(path, 'utf8')), `${rel(path)} contains a call that starts git`);
      }
    },
  },
  {
    name: 'trees',
    async run() {
      const digest = await worktreeDigest();
      const base = await ensureTree('base');
      const instr = await ensureTree('instr');
      const log = await ensureTree('log');
      assert(base.copyDigest === digest, "the base copy's digest is not the worktree's");
      assert(instr.copyDigest !== base.copyDigest && log.copyDigest !== base.copyDigest && log.copyDigest !== instr.copyDigest, 'copy digests are not distinct');
      for (const id of listVariants()) {
        /** @type {string[]} */
        const errors = [];
        planTree(id, { errors });
        assert(errors.length === 0, `edits of ${id} do not match: ${errors.join('; ')}`);
      }
      const filesRoot = fresh(join(SELFTEST_DIR, 'variant-files'));
      mkdirSync(join(filesRoot, 'st-f', 'core', 'engine'), { recursive: true });
      writeFileSync(join(filesRoot, 'st-f', 'core', 'engine', 'ig-st.js'), '// @ts-check\nexport const ST = 1;\n');
      const manifests = {
        'st-a': { id: 'st-a', extends: ['base'], params: { x: 1 } },
        'st-b': { id: 'st-b', extends: ['base'], params: { x: 2 } },
        'st-f': { id: 'st-f', extends: ['base'], files: ['st-f'] },
        'st-miss': { id: 'st-miss', extends: ['base'], edits: [{ id: 'miss-1', file: 'core/engine/rng.js', find: 'text that does not occur', replace: 'x' }] },
        'st-twice': { id: 'st-twice', extends: ['base'], edits: [{ id: 'twice-1', file: 'core/engine/rng.js', find: 'export ', replace: 'export ' }] },
      };
      const idOf = (/** @type {string} */ id, /** @type {any} */ extra = {}) => planTree(id, { manifests, filesRoot, ...extra }).treeId;
      assert(idOf('st-a') !== idOf('st-b'), 'a changed param did not change the treeId');
      const before = idOf('st-f');
      writeFileSync(join(filesRoot, 'st-f', 'core', 'engine', 'ig-st.js'), '// @ts-check\nexport const ST = 2;\n');
      assert(before !== idOf('st-f'), 'a changed copy-only file did not change the treeId');
      const dest = join(SELFTEST_DIR, 'tree-a');
      const a = await buildTree('st-a', { manifests, dest, sourceLabel: 'self-test' });
      const b = await buildTree('st-b', { manifests, dest: join(SELFTEST_DIR, 'tree-b'), sourceLabel: 'self-test' });
      assert(a.copyDigest !== b.copyDigest && a.copyDigest !== base.copyDigest, 'a changed added engine file did not change the copyDigest');
      for (const [id, needle] of [['st-miss', 'anchor found 0 times'], ['st-twice', 'times in core/engine/rng.js']]) {
        const out = join(SELFTEST_DIR, `tree-${id}`);
        rmSync(out, { recursive: true, force: true });
        let message = '';
        try {
          await buildTree(id, { manifests, dest: out });
        } catch (e) {
          message = e instanceof Error ? e.message : String(e);
        }
        const name = id === 'st-miss' ? 'miss-1' : 'twice-1';
        assert(message.includes(`edit ${name} (${id})`) && message.includes(needle), `the ${id} edit did not fail by name: ${message}`);
        assert(!existsSync(out), `a tree was left behind by ${id}`);
      }
      rmSync(dest, { recursive: true, force: true });
      rmSync(join(SELFTEST_DIR, 'tree-b'), { recursive: true, force: true });
      rmSync(filesRoot, { recursive: true, force: true });
    },
  },
  {
    name: 'carve-only sets equal setAttempt',
    async run() {
      const { e, ws, scratch } = await engine('base');
      const entry = caseBoard('10x10-easy');
      let ok = 0;
      for (const n of [0, 1, 2]) {
        const seedText = `ig-selftest/sets/${n}`;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const board = e.board.boardFromRows(entry.boardRows);
          const res = e.generate.setAttempt({ board, rotation: 0, levelId: entry.levelId, seedText, uniqueness: 'any', execution: { main: ws, scratch } }, attempt);
          if (!res.ok) {
            continue;
          }
          ok += 1;
          const carved = carveSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText, attempt });
          assert(carved.ok, `carveSet failed where setAttempt succeeded (${seedText} attempt ${attempt})`);
          const c = /** @type {any} */ (carved);
          same(c.set, res.set, `the carved set differs from setAttempt's (${seedText} attempt ${attempt})`);
          const sel = e.clues.selectClues({
            board: c.board, pieces: c.set.pieces, layout: c.set.witness, target: e.levels.level(entry.levelId), rng: c.calRng,
            uniqueness: 'any', excludeClueKeys: new Set(), ws,
          });
          assert(sel.ok, 'selectClues failed on the calibration stream');
          same(sel.clues, res.calibration.clues, `the calibration clues differ (${seedText} attempt ${attempt})`);
        }
      }
      assert(ok > 0, 'no setAttempt succeeded: nothing was compared');
    },
  },
  {
    name: 'instr equals base; igTake',
    async run() {
      const base = await attempts('base');
      const instr = await attempts('instr');
      const items = await corpus();
      let complete = 0;
      items.forEach((_, i) => {
        same(outcomeOf(base[i]), outcomeOf(instr[i]), `instr and base differ on corpus item ${i}`);
        const r = instr[i].record;
        if (instr[i].error === null) {
          complete += 1;
          assert(r.workFirst !== null && r.workFirst >= 0 && r.workFirst <= r.mainWork, `workFirst ${r.workFirst} is outside 0..${r.mainWork} (item ${i})`);
          assert(r.r7Cut === 0 || r.stop === 'work-cap', `r7Cut ${r.r7Cut} of a rating whose stop is ${r.stop}: census cuts belong to r7CutCensus (item ${i})`);
          assert(Number.isInteger(r.r7CutCensus) && r.r7CutCensus >= 0, `r7CutCensus ${r.r7CutCensus} (item ${i})`);
          assert((r.r7CutCensus > 0) === r.flags.includes('c'), `the c flag does not follow r7CutCensus ${r.r7CutCensus}: ${r.flags} (item ${i})`);
        }
      });
      assert(complete > 0, 'no complete instr rating in the corpus');
      const { e, ws } = await engine('instr');
      const item = items[0];
      e.difficulty.rate(item.board, item.pieces, item.clues, ws);
      const first = e.deduce.igTake();
      assert(first !== null && e.deduce.igTake() === null, 'igTake did not return a value once and then null');
    },
  },
  {
    name: 'log equals base; journal',
    async run() {
      const base = await engine('base');
      const log = await engine('log');
      const entry = caseBoard('10x10-hard');
      const dir = fresh(join(SELFTEST_DIR, 'logs', 'case5'));
      process.env.IG_LOG_DIR = dir;
      process.env.IG_ROW = 'selftest~0';
      let calls = 0;
      try {
        for (const n of [0, 1]) {
          for (const attempt of [0, 1]) {
            const seedText = `ig-selftest/log/${n}`;
            const run = (/** @type {any} */ x) => x.e.generate.setAttempt({
              board: x.e.board.boardFromRows(entry.boardRows), rotation: 0, levelId: entry.levelId, seedText, uniqueness: 'any',
              execution: { main: x.ws, scratch: x.scratch },
            }, attempt);
            const a = run(base);
            const b = run(log);
            same(a, b, `setAttempt differs between base and log (${seedText} attempt ${attempt})`);
            const carved = carveSet(base.e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText, attempt });
            if (carved.ok) {
              calls += 1;
            }
          }
        }
      } finally {
        delete process.env.IG_LOG_DIR;
        delete process.env.IG_ROW;
      }
      const lines = readdirSync(dir).flatMap((n) => readFileSync(join(dir, n), 'utf8').split('\n').filter((l) => l !== '').map((l) => JSON.parse(l)));
      const starts = lines.filter((l) => l.t === 'start');
      const ends = lines.filter((l) => l.t === 'end');
      assert(starts.length === calls && ends.length === calls && calls > 0, `journal has ${starts.length} start and ${ends.length} end lines for ${calls} calls`);
      for (const s of starts) {
        const mine = lines.filter((l) => l.call === s.call);
        const ps = mine.filter((l) => l.t === 'p');
        const end = mine.find((l) => l.t === 'end');
        assert(ps.length > 0 && mine.some((l) => l.t === 'phase' && l.phase === 'p1') && end !== undefined, `call ${s.call} lacks p, phase or end lines`);
        assert(end.profiles === ps.length && ps.every((p) => Array.isArray(p.tuple) && p.tuple.length === 14), `call ${s.call}: profile count or tuple shape`);
        assert(s.stage === 'set' && s.v === 1 && s.variant === 'log', `call ${s.call}: start line fields`);
      }

      const cut = fresh(join(SELFTEST_DIR, 'logs', 'case5-cut'));
      process.env.IG_LOG_DIR = cut;
      process.env.IG_ROW = 'selftest~1';
      const tree = log.tree;
      const worker = new Worker(new URL('./lib/lane-worker.mjs', import.meta.url), { workerData: { treeRoot: tree.root, testKinds: true } });
      delete process.env.IG_LOG_DIR;
      delete process.env.IG_ROW;
      try {
        await new Promise((resolve, reject) => {
          worker.once('message', resolve);
          worker.once('error', reject);
        });
        worker.postMessage({ type: 'job', id: 0, kind: 'test-journal', payload: { boardRows: entry.boardRows, levelId: entry.levelId, seedText: 'ig-selftest/log/0' } });
        const deadline = Date.now() + 20000;
        /** @type {any[]} */
        let seen = [];
        while (Date.now() < deadline) {
          seen = readdirSync(cut).flatMap((n) => readFileSync(join(cut, n), 'utf8').split('\n').filter((l) => l !== '').map((l) => JSON.parse(l)));
          if (seen.filter((l) => l.t === 'p').length >= 2) {
            break;
          }
          await new Promise((r) => setTimeout(r, 20));
        }
        await worker.terminate();
        seen = readdirSync(cut).flatMap((n) => readFileSync(join(cut, n), 'utf8').split('\n').filter((l) => l !== '').map((l) => JSON.parse(l)));
        assert(seen.filter((l) => l.t === 'start').length === 1 && seen.filter((l) => l.t === 'p').length === 2 && !seen.some((l) => l.t === 'end'),
          `an interrupted call must leave start, two p lines and no end; got ${seen.map((l) => l.t).join(',')}`);
      } finally {
        await worker.terminate();
      }
      const probe = join(SELFTEST_DIR, 'logs', 'append-cost.jsonl');
      rmSync(probe, { force: true });
      const t0 = performance.now();
      for (let i = 0; i < 200; i += 1) {
        appendFileSync(probe, `${JSON.stringify({ t: 'p', call: 'x', i, tuple: ['p1', 5, 'below', 12, 100, 0, 50, 10, 20, 0, 'exhausted', 0, 1.5, ''] })}\n`);
      }
      memo.appendCostMs = Math.round(((performance.now() - t0) / 200) * 1000) / 1000;
    },
  },
  {
    name: 'screenRating at the canonical cap equals rate',
    async run() {
      const { e, ws } = await engine('instr');
      const items = await corpus();
      const instr = await attempts('instr');
      items.forEach((item, i) => {
        let rating = null;
        let error = null;
        try {
          rating = screenRating(e, item.board, item.pieces, item.clues, ws, e.policy.DEDUCE.work);
        } catch (err) {
          error = err;
        }
        same(outcomeOf({ rating, error }), outcomeOf(instr[i]), `screenRating differs from rate on corpus item ${i}`);
      });
    },
  },
  {
    name: 'lanes: order, supervisor, admission',
    async run() {
      const items = await corpus();
      const instr = await attempts('instr');
      const lanes = await createLanes({ variant: 'instr', size: 4, horizonS: 285 });
      try {
        const jobs = items.map((it) => ({ kind: 'rate', boardRows: it.boardRows, pieces: it.pieces, clues: it.clues, levelId: it.levelId, idx: it.idx }));
        const out = await lanes.runAll(jobs);
        assert(out.done && out.defect === null, 'the lanes did not finish the corpus');
        out.results.forEach((r, i) => same({ ...r, ms: 0 }, { ...instr[i].record, ms: 0 }, `lane result ${i} differs from the in-process result`));
        lanes.setHorizon(elapsedS() + 20);
        lanes.setHorizon(285);
        const refused = await lanes.runAll([jobs[0]]);
        assert(!refused.done && refused.results[0] === undefined, 'a rate job was admitted with less than 30 s to the horizon (setHorizon must only lower it)');
      } finally {
        await lanes.close();
      }
      const one = await createLanes({ variant: 'instr', size: 1, horizonS: 285, limits: { callMinRemainS: 1, callCutMarginS: 1 }, testKinds: true });
      try {
        one.setHorizon(elapsedS() + 3);
        const out = await one.runAll([{ kind: 'test-hold', profiles: 2 }, { kind: 'test-hold', profiles: 1 }]);
        const first = out.results[0];
        assert(first?.outcome === 'censored' && first.profiles.length === 2, `the held call was not cut with its profiles: ${JSON.stringify(first)}`);
        assert(out.results[1] === undefined && !out.done && one.lanes[0].dead, 'the lane of a cut call took another job');
      } finally {
        await one.close();
      }
    },
  },
  {
    name: 'arm driver without generation',
    async run() {
      const base = await engine('base');
      const label = 'selftest';
      const flags = (/** @type {string} */ shard, /** @type {string[]} */ extra = []) => [
        join(IG_DIR, 'arm.mjs'), 'run', '--task', 'IGP-00', '--arm', 'st-arm', '--shard', shard, '--variant', 'base', '--workers', '4',
        '--cases', '26x26-nightmare:0-1,14x14-master:0-1', '--row-limit-s', '90', '--label', label, '--source-label', 'self-test',
        '--horizon-s', '285', ...extra,
      ];
      const arm = (/** @type {string[]} */ argv) => spawnSync(process.execPath, argv, { encoding: 'utf8', cwd: ROOT });
      const dir = fresh(artifactDir(label, 'IGP-00', 'st-arm', 'dry'));
      const dry = arm(flags('dry', ['--dry-run']));
      assert(dry.status === 0, `dry run failed: ${dry.stderr}`);
      const shard = JSON.parse(readFileSync(join(dir, 'shard.json'), 'utf8'));
      same(shard.rows.map((/** @type {{ key: string }} */ r) => r.key), ['26x26-nightmare~0', '26x26-nightmare~1', '14x14-master~0', '14x14-master~1'], 'the row keys of shard.json');
      for (const row of shard.rows) {
        const matrix = JSON.parse(readFileSync(join(dir, 'rows', row.key, 'matrix.json'), 'utf8'));
        const c = matrix.cases[0];
        assert(matrix.cases.length === 1 && c.id === row.caseId && c.seedPrefix === 'landscape' && c.repetitions === 1, `matrix of ${row.key}: case fields`);
        same(c.seeds, [`landscape/${row.caseId}/${row.rep}`], `matrix of ${row.key}: seeds`);
        assert(base.e.runner.checkMatrix(matrix).ok, `the tree's checkMatrix refuses the matrix of ${row.key}`);
      }
      appendFileSync(join(dir, 'rows.jsonl'), `${JSON.stringify({ t: 'started', key: '26x26-nightmare~0', caseId: '26x26-nightmare', rep: 0, seed: 'landscape/26x26-nightmare/0', at: 'synthetic', pid: 0 })}\n`);
      const started = arm(flags('dry'));
      assert(started.status === 1 && started.stderr.includes('was started and not recorded'), `a started row without a record did not stop the driver: ${started.status} ${started.stderr}`);
      const f = flags('dry');
      const changed = arm([...f.slice(0, 11), '2', ...f.slice(12)]);
      assert(changed.status === 1 && changed.stderr.includes('changed'), `a changed flag did not stop the driver: ${changed.status} ${changed.stderr}`);
      fresh(artifactDir(label, 'IGP-00', 'st-arm', 'short'));
      const short = arm([...flags('short').slice(0, -1), '40']);
      assert(short.status === 0, `a short horizon run failed: ${short.stderr}`);
      const state = JSON.parse(readFileSync(join(artifactDir(label, 'IGP-00', 'st-arm', 'short'), 'state.json'), 'utf8'));
      assert(state.lastInvocation.progress.rows === 0 && state.done === false, 'a horizon of 40 s with R = 90 admitted a row');
    },
  },
  {
    name: 'writers and budget',
    async run() {
      const dir = fresh(join(SELFTEST_DIR, 'writers'));
      writeJson(join(dir, 'a.json'), { a: 1, b: [1, 2] });
      writeText(join(dir, 'a.md'), '# Title\n\nText\n');
      writeJsonl(join(dir, 'a.jsonl'), [{ a: 1 }, { a: 2 }]);
      for (const name of ['a.json', 'a.md', 'a.jsonl']) {
        const bytes = readFileSync(join(dir, name));
        const problems = checkText(name, bytes);
        assert(problems.length === 0, `${name}: ${problems.join('; ')}`);
        const text = bytes.toString('utf8');
        assert(text.includes('\r\n') && !/[^\r]\n/.test(text), `${name} is not CRLF`);
      }
      for (const bad of [`see ${ROOT}x`, 'see C:\\Users\\x', 'see c:/temp/x']) {
        let refused = false;
        try {
          writeText(join(dir, 'bad.md'), bad);
        } catch {
          refused = true;
        }
        assert(refused && !existsSync(join(dir, 'bad.md')), `an absolute path was written: ${bad}`);
      }
      const logs = fresh(join(SELFTEST_DIR, 'budget'));
      const line = (/** @type {string} */ task, /** @type {number} */ counted) => ({ task, step: 's', nodeSeconds: counted, lockWaitSeconds: 0, countedSeconds: counted });
      const taskLog = join(artifactDir('selftest'), 'budget-t1');
      const otherLog = join(artifactDir('selftest'), 'budget-other');
      try {
        writeJsonl(join(taskLog, 'invocations.jsonl'), [line('budget-t1', 420)]);
        writeJsonl(join(otherLog, 'invocations.jsonl'), [line('budget-other', 580)]);
        const go = decide({ task: 'budget-t1', label: 'selftest', allocationS: 600, minHorizonS: 110 });
        assert(go.decision === 'go' && go.horizonS === 275 && go.allowanceS === 330, `go decision: ${JSON.stringify(go)}`);
        const stop = decide({ task: 'budget-t1', label: 'selftest', allocationS: 600, minHorizonS: 280, forecastS: 0 });
        assert(stop.decision === 'stop', 'a step needing 280 s was not stopped (the forecast must never decide)');
        writeJsonl(join(otherLog, 'invocations.jsonl'), [line('budget-other', 10280)]);
        for (const min of [60, 110, 150]) {
          assert(decide({ task: 'budget-t1', label: 'selftest', allocationS: 600, minHorizonS: min }).decision === 'stop', `round at 10,700 s did not stop a step of ${min} s`);
        }
        const approved = decide({ task: 'budget-t1', label: 'selftest', allocationS: 600, minHorizonS: 110, approvals: { roundMinutes: 10 } });
        assert(approved.decision === 'go', 'a round approval did not allow the step');
        assert(readInvocations('selftest').length === 2, 'the synthetic logs were not read');
      } finally {
        rmSync(taskLog, { recursive: true, force: true });
        rmSync(otherLog, { recursive: true, force: true });
        rmSync(logs, { recursive: true, force: true });
      }
    },
  },
];

/** The `--frozen` group (V4-T01a): carve-only checks and records on the verified frozen source; no lock. */
const frozenCases = [
  {
    name: 'frozen: snapshot verified, digest and versions',
    async run() {
      assert(SOURCE_KIND === 'frozen', 'the group must run with --label frozen');
      const snapshot = verifySnapshot();
      assert(snapshot.ok, `the snapshot differs from its manifest: ${snapshot.differences.slice(0, 3).join('; ')}`);
      const digest = await sourceDigest();
      assert(digest === FROZEN_DIGEST, `the source digest ${digest} is not FROZEN_DIGEST`);
      same(await sourceVersions(), { algo: 'gen-v3', policy: 'mixed-v3', rng: 'xoshiro128ss-v1', model: 'difficulty-v3', app: '1.0.0' },
        'the frozen source reports other versions');
    },
  },
  {
    name: 'frozen: line endings do not change a snapshot hash',
    run() {
      const dir = fresh(artifactDir('selftest', 'snapshot-eol'));
      try {
        const hashed = () => Object.fromEntries(snapshotEntries(dir).map((e) => [e.path, e]));
        writeFileSync(join(dir, 'a.txt'), 'x\r\ny\r\n');
        writeFileSync(join(dir, 'b.bin'), Buffer.from([0, 13, 10]));
        const crlf = hashed();
        writeFileSync(join(dir, 'a.txt'), 'x\ny\n');
        writeFileSync(join(dir, 'b.bin'), Buffer.from([0, 10]));
        const lfOnly = hashed();
        assert(crlf['a.txt'].sha256 === lfOnly['a.txt'].sha256 && crlf['a.txt'].bytes === 4 && lfOnly['a.txt'].bytes === 4
          && crlf['a.txt'].text && lfOnly['a.txt'].text, `a text file's hash depends on its line ends: ${JSON.stringify([crlf['a.txt'], lfOnly['a.txt']])}`);
        assert(crlf['b.bin'].sha256 !== lfOnly['b.bin'].sha256 && crlf['b.bin'].bytes === 3 && lfOnly['b.bin'].bytes === 2
          && !crlf['b.bin'].text && !lfOnly['b.bin'].text, `a file with a NUL byte was not hashed raw: ${JSON.stringify([crlf['b.bin'], lfOnly['b.bin']])}`);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'frozen: a changed snapshot is refused',
    run() {
      const entry = (/** @type {string} */ path, /** @type {string} */ text) => ({ path, sha256: sha256(text), bytes: text.length, text: true });
      const entries = [entry('core/a.js', 'a'), entry('core/b.js', 'bb'), entry('package.json', '{}')];
      const manifest = { entries: structuredClone(entries) };
      same(compareSnapshot(entries, manifest), { ok: true, files: 3, differences: [] }, 'an unchanged snapshot was not accepted');
      const changed = { entries: structuredClone(entries) };
      changed.entries[1].sha256 = sha256('other');
      const result = compareSnapshot(entries, changed);
      assert(!result.ok && result.differences.length === 1 && result.differences[0] === 'changed: core/b.js',
        `a changed hash was not refused by its path: ${JSON.stringify(result)}`);
      const missing = compareSnapshot(entries.slice(0, 2), manifest);
      assert(!missing.ok && missing.differences.join() === 'missing: package.json', `a missing file: ${JSON.stringify(missing)}`);
      const extra = compareSnapshot([...entries, entry('core/c.js', 'c')], manifest);
      assert(!extra.ok && extra.differences.join() === 'extra: core/c.js', `an extra file: ${JSON.stringify(extra)}`);
    },
  },
  {
    name: 'frozen: trees and anchors',
    async run() {
      assert(SOURCE_KIND === 'frozen', 'the group must run with --label frozen');
      const base = await ensureTree('base');
      assert(base.root.split(sep).join('/').endsWith('tests/artifacts/ig-proto/tree-frozen/base'), `the base tree is in ${rel(base.root)}`);
      assert(base.copyDigest === FROZEN_DIGEST, `the base copy's digest ${base.copyDigest} is not FROZEN_DIGEST`);
      const sources = collectSources();
      for (const id of listVariants()) {
        /** @type {string[]} */
        const errors = [];
        planTree(id, { errors, sources });
        assert(errors.length === 0, `edits of ${id} do not match the frozen source: ${errors.join('; ')}`);
      }
    },
  },
  {
    name: 'frozen: round cap 0',
    run() {
      const none = decide({ task: 'x', label: 'frozen', allocationS: 600, minHorizonS: 60, invocations: [] });
      assert(none.decision === 'stop' && none.roundCapS === 0, `the frozen label without an approval: ${JSON.stringify(none)}`);
      const approved = decide({
        task: 'x', label: 'frozen', allocationS: 600, minHorizonS: 60, approvals: { roundMinutes: 10 }, invocations: [],
      });
      assert(approved.decision === 'go' && approved.horizonS === 285 && approved.roundCapS === 600,
        `the frozen label with 10 approved minutes: ${JSON.stringify(approved)}`);
    },
  },
  {
    name: 'frozen: provisional unchanged',
    run() {
      const result = decide({ task: 'x', label: 'provisional', allocationS: 600, minHorizonS: 60, invocations: [] });
      assert(result.decision === 'go' && result.roundCapS === 10800, `the provisional label: ${JSON.stringify(result)}`);
    },
  },
  {
    name: 'frozen: identity of a different source',
    run() {
      const run = (/** @type {string} */ digest) => ({
        acceptedCount: 2, details: { resultDigest: digest, area: 100, K: 5, sizes: [10, 10, 20, 30, 30], setAttempt: 0, puzzles: [] },
      });
      const other = pairResult('mp12b1', run('a'), 'base', run('b'), false);
      assert(other.level === 'different-source' && other.sameResult === false && other.problems.length === 0,
        `a different source with another result: ${JSON.stringify(other)}`);
      const equal = pairResult('mp12b1', run('a'), 'base', run('a'), false);
      assert(equal.level === 'different-source' && equal.sameResult === true && equal.problems.length === 0,
        `a different source with the same result: ${JSON.stringify(equal)}`);
      const sameSource = pairResult('mp12b1', run('a'), 'base', run('b'), true);
      assert(sameSource.level !== 'different-source' && sameSource.problems.length === 1, `the same source keeps its problem: ${JSON.stringify(sameSource)}`);
      const arms = pairResult('base', run('a'), 'log', run('b'), false);
      assert(arms.level !== 'different-source' && arms.problems.length === 1, `two arms are compared among themselves: ${JSON.stringify(arms)}`);
    },
  },
  {
    name: `frozen: offers come from the tree's source`,
    async run() {
      assert(SOURCE_KIND === 'frozen', 'the group must run with --label frozen');
      const base = (await engine('base')).e;
      const instr = (await engine('instr')).e;
      const carve = (/** @type {any} */ e, /** @type {string} */ caseId) => {
        const entry = caseBoard(caseId);
        return carveSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText: 'ig-v4/offer/0', attempt: 0 });
      };
      const nightmare = carve(base, '26x26-nightmare');
      assert(nightmare.ok && nightmare.offeredInSource === true, `base on 26x26 Nightmare: ${JSON.stringify({ ok: nightmare.ok })}`);
      same(carve(base, '26x26-hell-1'), { ok: false, reason: 'not-offered' }, 'base on 26x26 Hell 1 is not offered');
      const diagnostic = carve(instr, '26x26-hell-1');
      assert(diagnostic.ok && diagnostic.offeredInSource === false,
        `instr on 26x26 Hell 1 is a diagnostic offer: ${JSON.stringify(diagnostic.ok ? { offeredInSource: diagnostic.offeredInSource } : diagnostic)}`);
    },
  },
  {
    name: 'frozen: worker modules do not read the label',
    run() {
      for (const name of ['lane-worker.mjs', 'calls.mjs', 'sets.mjs', 'engine.mjs', 'ledger.mjs', 'packs.mjs']) {
        const text = readFileSync(join(IG_DIR, 'lib', name), 'utf8');
        for (const needle of ['SOURCE_KIND', 'sourceRoot(', '../../../core/']) {
          assert(!text.includes(needle), `lib/${name} contains ${needle}`);
        }
      }
    },
  },
  {
    name: 'frozen: PM1 inventory',
    async run() {
      assert(SOURCE_KIND === 'frozen', 'the group must run with --label frozen');
      const levels = await import(pathToFileURL(join(sourceRoot(), 'core', 'engine', 'levels.js')).href);
      const families = readFamilies(evidenceDir('provisional', 'IGP-05'));
      same(families.map((f) => f.part), [...Array(16).fill('failed-sets'), ...Array(12).fill('scan'), ...Array(88).fill('windows')],
        'the three files were not read in the order failed-sets, scan, windows');
      const inventory = buildInventory(families, levels);
      same(inventory.totals, { families: 116, probes: 1362, rated: 987 }, `the totals: ${JSON.stringify(inventory.totals)}`);
      assert(inventory.alternate.length === 113, `${inventory.alternate.length} alternate rows, not 113`);
      assert(inventory.q24.length === 4 && inventory.q24.every((f) => f.found === true), `the IG-P-Q24 facts: ${JSON.stringify(inventory.q24)}`);
      assert(inventory.alternate.every((r) => r.offeredAtFrozen === false), 'an alternate row is offered at the frozen source');
      const population = inventory.populations.find((p) => p.ratedLevel === 'hell-3' && p.case === '15x15b10-hell-1');
      assert(population !== undefined && population.n === 2 && population.area === 215, `the hell-3 population of 15x15b10-hell-1: ${JSON.stringify(population)}`);
      same(population.counts, [2, 3], `the counts of that population: ${JSON.stringify(population.counts)}`);
      same(population.scores, [165, 179], `the scores of that population: ${JSON.stringify(population.scores)}`);
      assert(inventory.populations.reduce((n, p) => n + p.n, 0) === 113
        && inventory.populations.every((p) => p.solutions.unique + p.solutions.few + p.solutions.many + p.solutions.unknown === p.n),
      'the populations do not account for every alternate row and every solutions class');
      // The real levels offer no Hell level, so the flag above cannot tell a read value from a constant: offer them.
      const offering = { ...levels, offeredLevels: () => [levels.level('hell-1'), levels.level('hell-2'), levels.level('hell-3')] };
      assert(buildInventory(families, offering).alternate.every((r) => r.offeredAtFrozen === true), 'offeredAtFrozen does not come from the levels given');
    },
  },
];

const ITEM_PAIR = Object.freeze([
  { id: 't1', kind: 'test-ok', variant: 'base', payload: { echo: 1 } },
  { id: 't2', kind: 'test-ok', variant: 'base', payload: { echo: 2 } },
]);

/**
 * @param {any[]} items
 * @param {Record<string, unknown>} [over] Fields that replace the synthetic ones.
 * @returns {any} The synthetic identity of the `--items` cases.
 */
const itemId = (items, over = {}) => ({
  frozenCommit: 'c', sourceDigest: 'd', treeIds: { base: 't' }, harnessHash: 'h', manifestHash: manifestHash(items), ...over,
});

/**
 * @param {number} n The case number: its task is `items-<n>`, its folder is emptied.
 * @param {string} [step]
 * @returns {{ dir: string, log: string, state: string }}
 */
function itemFolder(n, step = 'items') {
  fresh(artifactDir('selftest', `items-${n}`));
  const dir = artifactDir('selftest', `items-${n}`, step);
  return { dir, log: join(dir, 'items.jsonl'), state: join(dir, 'state.json') };
}

/** @param {number} n @param {any[]} items @param {Record<string, any>} [extra] @returns {ReturnType<typeof runItems>} */
const itemRun = (n, items, extra = {}) => runItems({
  task: `items-${n}`, step: 'items', label: 'selftest', horizonS: 285, items, testKinds: true, identity: itemId(items), ...extra,
});

const CHECK_MODES = Object.freeze(['absent', 'charge', 'record']);

/**
 * A joined row of the `checks:` cases (V4-T04c): an `ok` selection item of one group and mode, with a complete ledger
 * (rating work 7, count work 5), `digest` 'd', and for `charge` and `record` the charge sequence [3, 4, 5].
 * @param {string} mode
 * @param {Record<string, any>} [over] Fields of the result that replace the synthetic ones.
 * @param {{ variant?: string, caseId?: string, route?: string, status?: string }} [row] The row's own fields.
 * @returns {any}
 */
function checkRow(mode, over = {}, { variant = 'v4', caseId = '12x12-nightmare', route = 'new', status = 'completed' } = {}) {
  const charged = mode !== 'absent';
  const recorded = mode === 'record';
  const seedText = `ig-v4/parity/${caseId}`;
  return {
    item: `parity:${variant}:${caseId}:${seedText}:${mode}`,
    variant,
    caseId,
    seedText,
    mode,
    route,
    status,
    result: {
      outcome: 'ok',
      digest: 'd',
      route,
      ledger: { complete: true, ratingWork: 7, countWork: 5, totalWork: 12 },
      chargeUnits: charged ? [3, 4, 5] : null,
      charges: charged ? 3 : null,
      units: charged ? 12 : null,
      events: recorded ? 9 : null,
      eventsDigest: recorded ? 'e' : null,
      maxSequence: recorded ? 40 : null,
      detail: recorded ? { rated: 1, rejected: 2, scored: 3, missing: 0, rechecked: [{ equal: true }, { equal: true }] } : null,
      ...over,
    },
  };
}

/** @param {any[]} rows @param {string} text @returns {boolean} A verdict reason of `rows` names the text. */
const hasReason = (rows, text) => rows.some((r) => r.includes(text));

/**
 * @param {string} part `gen` or `puzzle-<i>`
 * @param {string} status The end line's status.
 * @param {any} result
 * @param {{ step?: string }} [o] The step in the item id.
 * @returns {any} A joined row of the replay cases, in the case `14x14-master` of the variant `v4`.
 */
function replayRow(part, status, result, { step = 'replay' } = {}) {
  const seedText = 'ig-v4/replay/14x14-master';
  return { item: `${step}:v4:14x14-master:${seedText}:${part}`, variant: 'v4', caseId: '14x14-master', seedText, mode: null, route: null, status, result };
}

const generated = () => replayRow('gen', 'completed', { outcome: 'ok', batchStatus: 'complete', reason: null, puzzles: 2, made: ['calibration', 'candidate'], packSha256: 'h' });

/** @param {number} i @param {string} kind @param {string} status @param {Record<string, any>} [over] */
const replayed = (i, kind, status, over = {}) => replayRow(`puzzle-${i}`, 'completed', {
  outcome: 'ok', kind, status, reason: null, work: 5, steps: 4, bytes: 100, detailStep: 3, packSha256: 'h', ...over,
});

/**
 * @param {(record: any) => void} [edit] Changes the record after it is built.
 * @returns {any} A PM4 record as the certificate re-proof publishes it under `-Label frozen`: the frozen commit and
 *   digest, the `main` run, the `instr` tree `t-instr`, no violation, 40 certified runs, all equal to their canonical
 *   rating and no coverage gap.
 */
function pm4Record(edit = () => {}) {
  const record = {
    meta: { source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST }, trees: { instr: { treeId: 't-instr' } } },
    run: 'main',
    certificate: { violations: [], certifiedRuns: 40, coverage: { gaps: [], equalCanonical: { certified: { equal: 40, of: 40 } } } },
  };
  edit(record);
  return record;
}

/**
 * @param {(record: any) => void} [edit] Changes the record after it is built.
 * @returns {any} An identity record of the four expected seeds, each with an MP12b1 run, the pairs `mp12b1~base` and
 *   `mp12b1~log` of the `different-source` form with an equal result, a `base~log` puzzle identity and no failure.
 */
function identityRecord(edit = () => {}) {
  const record = {
    seeds: IDENTITY_SEEDS.map((seed) => ({
      case: seed.split('/')[1],
      seed,
      rep: Number(seed.split('/')[2]),
      mp12b1: { accepted: 1 },
      base: { accepted: 1 },
      log: { accepted: 1 },
      pairs: {
        'mp12b1~base': { level: 'different-source', sameResult: true, problems: [] },
        'mp12b1~log': { level: 'different-source', sameResult: true, problems: [] },
        'base~log': { level: 'puzzle-identity', problems: [] },
      },
    })),
    summary: { failures: 0, withoutMp12b1: 0 },
  };
  edit(record);
  return record;
}

/**
 * The world of the `accept:` cases (V4-T04f): a stage-1 receipt `R` over one temporary input file, in the scratch folder
 * `artifactDir('selftest', 'accept')` (emptied), and the options `O` of `acceptedBinding` that declare what it must hold.
 * @returns {{ dir: string, input: string, receiptFile: string, options: Parameters<typeof acceptedBinding>[0],
 *   write: (over?: { kind?: string, observed?: string[] }) => void }}
 */
function acceptWorld() {
  const dir = fresh(artifactDir('selftest', 'accept'));
  const input = join(dir, 'input.json');
  const receiptFile = join(dir, 'receipt.json');
  const arms = [{ id: 'v4', treeId: 't1', paramsHash: 'p1' }];
  writeJson(input, { input: 1 });
  const write = (/** @type {{ kind?: string, observed?: string[] }} */ { kind = 'stage1', observed = ['a', 'b'] } = {}) => writeJson(receiptFile, proofEnvelope({
    kind,
    verdict: 'pass',
    source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST },
    harnessHash: 'h',
    arms,
    coverage: { expected: observed, observed, missing: [], censored: [] },
    evidence: [{ path: rel(input), sha256: sha256File(input) }],
    fields: { line: 'Stage 1: holds.' },
  }));
  write();
  return {
    dir, input, receiptFile, write,
    options: { receiptPath: rel(receiptFile), harnessHash: 'h', arms, params: { v4: { W: 1 } }, coverage: ['a', 'b'], fields: { line: 'Stage 1: holds.' }, by: 'selftest' },
  };
}

/** @param {() => unknown} fn @returns {string} The message `fn` throws; empty when it does not throw. */
function thrownBy(fn) {
  try {
    fn();
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  return '';
}

/** @param {string[]} args @returns {Promise<{ code: number, out: string, err: string }>} `v4-check`'s `main` with its output captured. */
async function runCheck(args) {
  const { stdout, stderr } = process;
  const writes = [stdout.write, stderr.write];
  const text = { out: '', err: '' };
  stdout.write = /** @type {any} */ ((/** @type {unknown} */ chunk) => {
    text.out += String(chunk);
    return true;
  });
  stderr.write = /** @type {any} */ ((/** @type {unknown} */ chunk) => {
    text.err += String(chunk);
    return true;
  });
  try {
    return { code: await checkMain(args), ...text };
  } finally {
    [stdout.write, stderr.write] = writes;
  }
}

/** The `--items` group (V4-T04a onwards): lib/items.mjs on synthetic worker kinds; no rating, generation or replay; no lock. */
const itemCases = [
  {
    name: 'items: completion and verification resume',
    async run() {
      const { log, state } = itemFolder(1);
      const ID = itemId(ITEM_PAIR);
      const first = await itemRun(1, [...ITEM_PAIR]);
      same(first, { exitCode: 0, done: true, progress: 2, refused: null }, `the first run: ${JSON.stringify(first)}`);
      const lines = readItemLog(log);
      same(lines.map((l) => [l.type, l.item]), [['item-start', 't1'], ['item-end', 't1'], ['item-start', 't2'], ['item-end', 't2']],
        `the log lines: ${JSON.stringify(lines.map((l) => [l.type, l.item]))}`);
      assert(lines.every((l) => l.identityHash === identityHash(ID)), 'a log line does not carry the run\'s identityHash');
      same([lines[1], lines[3]].map((l) => [l.status, l.result.echo]), [['completed', 1], ['completed', 2]], 'the end lines: status and echo');
      assert(lines.every((l) => typeof l.at === 'string' && !Number.isNaN(Date.parse(l.at))) && lines[1].ms >= 0, 'the lines have no ISO time or no ms');
      same(resumePlan(ITEM_PAIR.slice(), lines, ID, ID), { pending: [], ended: 2 }, 'resumePlan on the finished log');
      const afterFirst = JSON.parse(readFileSync(state, 'utf8'));
      same([afterFirst.format, afterFirst.version, afterFirst.task, afterFirst.step, afterFirst.label, afterFirst.done, afterFirst.items],
        ['ig-proto-state', 1, 'items-1', 'items', 'selftest', true, { done: 2, total: 2 }], `the state: ${JSON.stringify(afterFirst)}`);
      same(afterFirst.identity, ID, 'the state does not hold the identity');
      same([afterFirst.lastInvocation.horizonS, afterFirst.lastInvocation.progress], [285, { items: 2, verified: 0 }], 'the first invocation\'s progress');
      assert(afterFirst.lastInvocation.start < afterFirst.lastInvocation.end && typeof afterFirst.lastInvocation.seconds === 'number', 'the invocation times');
      const bytes = readFileSync(log);
      const second = await itemRun(1, [...ITEM_PAIR]);
      same(second, { exitCode: 0, done: true, progress: 1, refused: null }, `the second run: ${JSON.stringify(second)}`);
      assert(readFileSync(log).equals(bytes), 'the second run changed the log (an item was dispatched again)');
      const afterSecond = JSON.parse(readFileSync(state, 'utf8'));
      same([afterSecond.done, afterSecond.items, afterSecond.lastInvocation.progress], [true, { done: 2, total: 2 }, { items: 0, verified: 1 }],
        `the second state: ${JSON.stringify(afterSecond)}`);
    },
  },
  {
    name: 'items: worker error',
    async run() {
      const { log } = itemFolder(2);
      const items = [{ id: 't1', kind: 'test-throw', variant: 'base', payload: {} }];
      const out = await itemRun(2, items);
      assert(out.exitCode === 0 && out.done === true, `the run: ${JSON.stringify(out)}`);
      const lines = readItemLog(log);
      same(lines.map((l) => [l.type, l.item]), [['item-start', 't1'], ['item-end', 't1']], 'the log lines');
      const end = lines[1];
      assert(end.status === 'error' && end.identityHash === identityHash(itemId(items)) && end.result.outcome === 'error'
        && String(end.result.message).includes('test-throw'), `the end line: ${JSON.stringify(end)}`);
    },
  },
  {
    name: 'items: parent cut',
    async run() {
      const { log } = itemFolder(3);
      const items = [
        { id: 'h1', kind: 'test-hold', variant: 'base', payload: { profiles: 0 } },
        { id: 't2', kind: 'test-ok', variant: 'base', payload: { echo: 2 } },
      ];
      const t0 = performance.now();
      const out = await itemRun(3, items, { horizonS: elapsedS() + 6, limits: { callMinRemainS: 0, callCutMarginS: 1 } });
      assert(performance.now() - t0 < 10000, `the call took ${Math.round(performance.now() - t0)} ms, not under 10 s`);
      assert(out.exitCode === 0 && out.done === false && out.progress === 1, `the run: ${JSON.stringify(out)}`);
      const lines = readItemLog(log);
      same(lines.map((l) => [l.type, l.item]), [['item-start', 'h1'], ['item-end', 'h1']], 'h1 started and ended, t2 has no line');
      assert(lines[1].status === 'censored' && lines[1].result.outcome === 'censored' && lines[1].identityHash === identityHash(itemId(items)),
        `the end line: ${JSON.stringify(lines[1])}`);
      // `test-hold` is a call kind, so the run above proves the cut of the lanes' call rule. `test-item` holds the same
      // way but is an item kind only (the reserve table names it), so its admission and its cut come from the item rule alone.
      const held = [{ id: 'h1', kind: 'test-item', variant: 'base', payload: { profiles: 0 } }];
      const asItem = { itemReserveS: { 'test-item': 1 }, callCutMarginS: 1 };
      const t1 = performance.now();
      const cut = await itemRun(3, held, { step: 'item-kind', horizonS: elapsedS() + 6, limits: asItem });
      assert(performance.now() - t1 < 10000, `the item-kind call took ${Math.round(performance.now() - t1)} ms, not under 10 s`);
      assert(cut.exitCode === 0 && cut.done === true && cut.progress === 1, `the item-kind run: ${JSON.stringify(cut)}`);
      const cutLines = readItemLog(join(artifactDir('selftest', 'items-3', 'item-kind'), 'items.jsonl'));
      same(cutLines.map((l) => [l.type, l.item, l.status]), [['item-start', 'h1', undefined], ['item-end', 'h1', 'censored']],
        'an item kind was not admitted by its reserve and cut at H - margin');
      const late = await itemRun(3, held, { step: 'item-reserve', horizonS: elapsedS() + 3, limits: { itemReserveS: { 'test-item': 100 }, callCutMarginS: 1 } });
      assert(late.exitCode === 0 && late.done === false && late.progress === 0, `the reserve run: ${JSON.stringify(late)}`);
      same(readItemLog(join(artifactDir('selftest', 'items-3', 'item-reserve'), 'items.jsonl')), [], 'an item was started with less than its reserve left');
    },
  },
  {
    name: 'items: identity mismatch',
    async run() {
      const { log, state } = itemFolder(4);
      const first = await itemRun(4, [...ITEM_PAIR]);
      assert(first.exitCode === 0 && first.done, `the first run: ${JSON.stringify(first)}`);
      const [logBytes, stateBytes] = [readFileSync(log), readFileSync(state)];
      const second = await itemRun(4, [...ITEM_PAIR], { identity: itemId(ITEM_PAIR, { harnessHash: 'h2' }) });
      same(second, { exitCode: 3, done: false, progress: 0, refused: 'identity mismatch (harnessHash)' }, `the second run: ${JSON.stringify(second)}`);
      assert(readFileSync(log).equals(logBytes) && readFileSync(state).equals(stateBytes), 'a refused run wrote the log or the state');
    },
  },
  {
    name: 'items: interrupted start refused',
    async run() {
      const { dir, log, state } = itemFolder(5);
      mkdirSync(dir, { recursive: true });
      logStart(log, identityHash(itemId(ITEM_PAIR)), ITEM_PAIR[0]);
      const before = readFileSync(log);
      const out = await itemRun(5, [...ITEM_PAIR]);
      same(out, { exitCode: 3, done: false, progress: 0, refused: 'interrupted item t1 needs a ruling' }, `the run: ${JSON.stringify(out)}`);
      assert(readFileSync(log).equals(before) && !existsSync(state), 'a refused run wrote the log or a state');
    },
  },
  {
    name: 'items: resume rules (pure)',
    run() {
      const items = [...ITEM_PAIR];
      const ID = itemId(items);
      const hash = identityHash(ID);
      const start = (/** @type {string} */ item) => ({ type: 'item-start', identityHash: hash, item, kind: 'test-ok', variant: 'base', at: 'x' });
      const spawn = (/** @type {string} */ item) => ({ type: 'item-spawn', identityHash: hash, item, pid: 1, at: 'x' });
      const end = (/** @type {string} */ item) => ({ type: 'item-end', identityHash: hash, item, status: 'completed', result: {}, ms: 1, at: 'x' });
      const refuse = (/** @type {any[]} */ list, /** @type {any[]} */ lines, /** @type {any} */ state = null) => resumePlan(list, lines, ID, state);
      same(refuse([items[0], { ...items[1], id: 't1' }], []), { refuse: 'duplicate item id t1' }, 'rule 1');
      const { identityHash: dropped, ...unbound } = end('t1');
      assert(dropped === hash, 'the helper line has no identityHash to drop');
      same(refuse(items, [start('t1'), unbound]), { refuse: 'identity mismatch (log line 2)' }, 'rule 3, an end line without identityHash');
      same(refuse(items, [{ ...start('t1'), identityHash: 'other' }]), { refuse: 'identity mismatch (log line 1)' }, 'rule 3, another identityHash');
      same(refuse(items, [start('zz')]), { refuse: 'unknown item zz' }, 'rule 4, an unknown item');
      same(refuse(items, [{ ...start('t1'), type: 'item-restart' }]), { refuse: 'unknown log line 1' }, 'rule 4, an unknown line type');
      same(refuse(items, [start('t1'), end('t1'), end('t1')]), { refuse: 'duplicate log entry for t1' }, 'rule 5');
      same(refuse(items, [end('t1')]), { refuse: 'out-of-order log entry for t1' }, 'rule 6, an end without a start');
      same(refuse(items, [start('t1'), end('t1'), spawn('t1')]), { refuse: 'out-of-order log entry for t1' }, 'rule 6, a spawn after the end');
      same(refuse(items, [start('t2'), start('t1'), spawn('t1')]), { refuse: 'interrupted item t1 needs a ruling' }, 'rule 7, a spawn without an end');
      same(refuse(items, [{ ...start('zz'), identityHash: 'other' }]), { refuse: 'identity mismatch (log line 1)' }, 'rule 3 comes before rule 4');
      same(refuse(items, [], { ...ID, treeIds: { base: 'other' }, manifestHash: 'other' }), { refuse: 'identity mismatch (treeIds)' }, 'rule 2, the first differing field');
      same(refuse(items, [], {}), { refuse: 'identity mismatch (frozenCommit)' }, 'rule 2, a state without an identity');
      const { dir, log } = itemFolder(6);
      mkdirSync(dir, { recursive: true });
      logStart(log, hash, items[0]);
      logSpawn(log, hash, 't1', 4242);
      logEnd(log, hash, 't1', 'completed', { outcome: 'ok' }, 7);
      const lines = readItemLog(log);
      same(lines.map((l) => Object.keys(l)), [
        ['type', 'identityHash', 'item', 'kind', 'variant', 'at'], ['type', 'identityHash', 'item', 'pid', 'at'],
        ['type', 'identityHash', 'item', 'status', 'result', 'ms', 'at'],
      ], 'the key order of the line helpers');
      same(refuse(items, lines, ID), { pending: [items[1]], ended: 1 }, 'start, spawn and end of t1, nothing of t2');
      appendFileSync(log, 'not json\n');
      let message = '';
      try {
        readItemLog(log);
      } catch (e) {
        message = e instanceof Error ? e.message : String(e);
      }
      assert(message === 'items: malformed log line 4', `a malformed line: ${message}`);
    },
  },
  {
    name: 'items: the run identity',
    async run() {
      assert(SOURCE_KIND === 'frozen', 'the case must run with --label frozen');
      const items = [
        { id: 'a', kind: 'test-ok', variant: 'log', payload: {} },
        { id: 'b', kind: 'test-ok', variant: 'base', payload: {} },
      ];
      const I1 = await itemIdentity(items);
      const I2 = await itemIdentity(items);
      const I3 = await itemIdentity([items[1], items[0]]);
      same(Object.keys(I1), ['frozenCommit', 'sourceDigest', 'treeIds', 'harnessHash', 'manifestHash'], 'the identity keys');
      assert(I1.frozenCommit === FROZEN_COMMIT, `frozenCommit ${I1.frozenCommit}`);
      assert(I1.sourceDigest === FROZEN_DIGEST, `sourceDigest ${I1.sourceDigest}`);
      same(Object.keys(I1.treeIds), ['base', 'log'], 'the tree ids are not keyed by the sorted variants');
      same(I1.treeIds, { base: (await ensureTree('base')).treeId, log: (await ensureTree('log')).treeId }, 'the tree ids are not the trees\'');
      assert(I1.harnessHash === harnessInfo().harnessHash, 'harnessHash is not the harness\'s');
      assert(I1.manifestHash === manifestHash(items), 'manifestHash is not the item list\'s');
      assert(identityHash(I2) === identityHash(I1), 'two identities of one list differ');
      same(Object.keys(I3.treeIds), ['base', 'log'], 'the tree ids of the reordered list are not in sorted order');
      same({ ...I3, manifestHash: I1.manifestHash }, I1, 'the reordered list changed a field other than manifestHash');
      assert(I3.manifestHash !== I1.manifestHash, 'the manifest hash ignores the item order');
    },
  },
  {
    name: 'items: pack files (filesystem only)',
    run() {
      const root = fresh(artifactDir('selftest', 'items-packs'));
      const folder = join(root, 'raw', 'packs');
      const path = join(folder, 'p.pack.json');
      const pack = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'replay-case.json'), 'utf8')).packs[0];
      assert(!existsSync(join(root, 'raw')), 'the fresh folder already has a raw folder');
      preparePackPath(path);
      assert(statSync(folder).isDirectory() && !existsSync(path), 'the nested packs folder was not created, or the pack file was');
      const hash = writePackFile(path, pack);
      assert(hash === sha256(JSON.stringify(pack)), 'the returned hash is not the SHA-256 of the pack text');
      assert(sha256(readFileSync(path)) === hash, 'the file on disk is not the hashed text');
      same(JSON.parse(readFileSync(path, 'utf8')), pack, 'the file does not hold the pack');
      const message = (/** @type {() => void} */ fn) => {
        try {
          fn();
        } catch (e) {
          return e instanceof Error ? e.message : String(e);
        }
        return '';
      };
      assert(message(() => preparePackPath(path)) === `unexpected existing pack ${path}`, 'a second preparePackPath did not refuse the existing pack');
      assert(message(() => writePackFile(path, { other: true })) !== '' && sha256(readFileSync(path)) === hash, 'a second write replaced the pack');
    },
  },
  {
    name: 'items: item ledger',
    run() {
      const start = { t: 'start', call: 'c', v: 1 };
      const caps = (/** @type {string | null} */ call) => ({ t: 'caps', call, count: true });
      const begin = (/** @type {string} */ kind, /** @type {unknown} */ bound) => ({ t: 'begin', call: 'c', kind, bound });
      const p = (/** @type {number} */ work, outcome = 'below', call = 'c') => ({
        t: 'p', call, i: 0, tuple: ['p1', 1, outcome, 50, work, 0, null, null, 1, 0, null, null, 1, ''],
      });
      const count = (/** @type {number} */ units, call = 'c') => ({ t: 'count', call, units });
      const end = (/** @type {number} */ work, /** @type {number | undefined} */ countWork, over = {}) => ({
        t: 'end', call: 'c', result: 'ok', work, ...(countWork === undefined ? {} : { locate: { countWork } }), ...over,
      });
      const a = () => [start, caps('c'), begin('rate', 10), p(3), begin('screen', 10), p(4), begin('count', 10), count(5), begin('count', 10), count(0), end(7, 5)];
      /** @param {string} name @param {any[]} lines @param {string} route @param {boolean} complete @param {string[] | null} problems @param {any[]} [work] */
      const check = (name, lines, route, complete, problems, work = []) => {
        const ledger = itemLedger(lines, /** @type {any} */ (route));
        assert(ledger.complete === complete && ledger.complete === (ledger.problems.length === 0), `${name}: complete ${ledger.complete}, ${JSON.stringify(ledger.problems)}`);
        if (problems !== null) {
          same(ledger.problems, problems, `${name}: problems ${JSON.stringify(ledger.problems)}`);
        }
        if (work.length > 0) {
          same([ledger.ratingWork, ledger.countWork, ledger.totalWork], work, `${name}: works ${JSON.stringify([ledger.ratingWork, ledger.countWork, ledger.totalWork])}`);
        }
        return ledger;
      };
      /** @param {any[]} list @param {number} at @param {any} line */
      const inserted = (list, at, line) => [...list.slice(0, at), line, ...list.slice(at)];
      /** @param {any[]} list @param {number} at @param {any} line */
      const replaced = (list, at, line) => [...list.slice(0, at), line, ...list.slice(at + 1)];
      const full = check('a', a(), 'new', true, [], [7, 5, 12]);
      assert(full.calls === 1, `a: ${full.calls} calls`);
      check('b', a().slice(0, -1), 'new', false, ['no end line c']);
      const noCaps = check('c', a().filter((l) => l.t !== 'caps'), 'new', false, ['absent count capability']);
      assert(noCaps.countWork === null && noCaps.totalWork === null, 'c: the count work of a journal without the capability is not unknown');
      const negative = check('d', replaced(a(), 7, count(-1)), 'new', false, ['invalid work c']);
      assert(negative.countWork === null && negative.totalWork === null, 'd: an invalid count was summed');
      check('e', replaced(a(), 10, end(8, 5)), 'new', false, ['sum of p work 7 differs from end.work 8'], [7, 5, 12]);
      check('f', [start, caps('c'), begin('rate', 10), p(3), begin('screen', 10), p(4), end(7, 0)], 'new', true, [], [7, 0, 7]);
      check('g', [caps(null), start, p(2), count(6, null), end(2, undefined)], 'legacy', true, [], [2, 6, 8]);
      check('h', [caps(null), count(6, null)], 'legacy-recorded', false, ['ratings not journaled on the recorded route'], [null, 6, null]);
      check('i', replaced(a(), 2, begin('rate', 2)), 'new', false, ['bound exceeded c 0']);
      check('j', a().filter((l, i) => i !== 2), 'new', false, ['unpaired p line c']);
      check('k', inserted(a(), 10, begin('rate', 10)), 'new', false, ['unfinished primitive c']);
      check('l', replaced(a(), 2, begin('rate', null)), 'new', false, ['invalid bound c']);
      check('m', inserted(a(), 3, begin('rate', 10)), 'new', false, ['overlapping begin c 1']);
      const errored = check('n', replaced(a(), 3, p(0, 'error')), 'new', false, null);
      assert(errored.problems.includes('unquantified error c 0'), `n: ${JSON.stringify(errored.problems)}`);
      check('o', inserted(replaced(a(), 10, end(7, 5, { result: 'error' })), 10, begin('count', 10)), 'new', false, ['unfinished primitive c']);
      const unsat = check('p', [caps(null), start, p(2, 'unsat'), count(6, null), end(2, undefined)], 'legacy', false, null);
      assert(unsat.problems.length === 1 && unsat.problems[0].startsWith('unquantified unsat'), `p: ${JSON.stringify(unsat.problems)}`);
      // Unknown work is never zero, and the ledger names what else is wrong with a journal.
      const empty = check('empty', [], 'new', false, null);
      assert(empty.ratingWork === null && empty.countWork === null && empty.totalWork === null && empty.calls === 0, 'empty: a journal without a call has known work');
      check('two starts', [start, ...a()], 'new', false, null);
      check('no count total', replaced(a(), 10, { t: 'end', call: 'c', result: 'ok', work: 7 }), 'new', false, ['absent count total']);
      check('total differs', replaced(a(), 10, end(7, 4)), 'new', false, ['sum of counts 5 differs from end.locate.countWork 4']);
      check('foreign line', inserted(a(), 3, p(1, 'below', 'x')), 'new', false, ['foreign p line x']);
      check('duplicate end', [...a(), end(7, 5)], 'new', false, ['duplicate end c']);
      const pending = pairPrimitives(inserted(a(), 10, begin('rate', 10)), 'c');
      same([pending.problems, pending.lo, pending.open], [[], 12, { kind: 'rate', bound: 10, index: 4 }], 'pairPrimitives: the open primitive and lo of (k)');
      same(pairPrimitives(a(), 'c'), { problems: [], lo: 12, open: null }, 'pairPrimitives: the paired lines of (a)');
      const overlapped = pairPrimitives([begin('rate', 10), begin('screen', 5), p(5)], 'c');
      same([overlapped.problems, overlapped.lo, overlapped.open], [['overlapping begin c 1'], 5, null], 'pairPrimitives: the overlap stays after the completion');
      same(pairPrimitives([begin('rate', 10), count(1)], 'c').problems, ['unpaired count line c'], 'pairPrimitives: a count line does not close a rating');
      same(pairPrimitives([begin('fast', 10)], 'c').problems, ['invalid begin c 0'], 'pairPrimitives: an invalid kind');
      let message = '';
      try {
        itemLedger([], /** @type {any} */ ('base'));
      } catch (e) {
        message = e instanceof Error ? e.message : String(e);
      }
      assert(message === 'unknown route base', `the route base has no ledger: ${message}`);
    },
  },
  {
    name: 'checks: manifest expansion',
    run() {
      const [parity, replay] = ['parity', 'replay'].map((step) => JSON.parse(readFileSync(join(IG_DIR, 'plans', `V4-T04.${step}.json`), 'utf8')));
      same([parity.format, parity.version, parity.task, parity.step, replay.task, replay.step], ['ig-proto-items', 1, 'V4-T04', 'parity', 'V4-T04', 'replay'], 'the manifest headers');
      const isV4 = (/** @type {string} */ v) => v !== 'base';
      const rawDir = (/** @type {any} */ m) => artifactDir('frozen', m.task, m.step);
      const safe = (/** @type {string} */ id) => id.replace(/[^A-Za-z0-9._-]/g, '_');
      const selects = /** @type {[string, string, string[]][]} */ ([
        ['v4', '14x14-master', ['legacy', 'legacy', 'legacy-recorded']],
        ['v4', '12x12-nightmare', ['new', 'new', 'new']],
        ['v4', '26x26-nightmare', ['new', 'new', 'new']],
        ['v4', '26x26-hell-1', ['new', 'new', 'new']],
        ['base', '14x14-master', ['base', 'base']],
        ['v4-w760', '12x12-nightmare', ['new', 'new', 'new']],
        ['v4-w095', '12x12-nightmare', ['new', 'new', 'new']],
        ['v4-w380', '12x12-nightmare', ['new', 'new', 'new']],
      ]);
      const wanted = selects.flatMap(([variant, caseId, routes]) => routes.map((route, i) => {
        const mode = variant === 'base' ? ['absent', 'record'][i] : CHECK_MODES[i];
        return [`parity:${variant}:${caseId}:ig-v4/parity/${caseId}:${mode}`, variant, route];
      }));
      const p = expandManifest(parity, rawDir(parity), isV4);
      assert(p.length === 23, `${p.length} parity items, not 23`);
      same(p.map((i) => [i.id, i.variant, i.payload.route]), wanted, 'the parity items, their variants and routes, in manifest order');
      const first = p[0];
      same(Object.keys(first.payload), ['boardRows', 'levelId', 'seedText', 'mode', 'logDir', 'row', 'route'], 'the payload keys of a selection item');
      assert(p.every((i) => i.kind === 'v4-select' && i.payload.row === safe(i.id) && i.payload.logDir === join(rawDir(parity), 'logs', safe(i.id))),
        'a selection item has another kind, row or log folder');
      same([first.payload.boardRows, first.payload.levelId, first.payload.seedText, first.payload.mode],
        [caseBoard('14x14-master').boardRows, 'master', 'ig-v4/parity/14x14-master', 'absent'], 'the payload values of the first item');
      const r = expandManifest(replay, rawDir(replay), isV4);
      assert(r.length === 9, `${r.length} replay items, not 9`);
      const cases = ['14x14-master', '12x12-nightmare', '14x14-nightmare'];
      same(r.map((i) => [i.id, i.kind]), cases.flatMap((caseId) => [
        [`replay:v4:${caseId}:ig-v4/replay/${caseId}:gen`, 'v4-generate'],
        [`replay:v4:${caseId}:ig-v4/replay/${caseId}:puzzle-0`, 'v4-replay'],
        [`replay:v4:${caseId}:ig-v4/replay/${caseId}:puzzle-1`, 'v4-replay'],
      ]), 'the replay items and their kinds, in manifest order');
      for (const [index, caseId] of cases.entries()) {
        const [gen, ...puzzles] = r.slice(index * 3, index * 3 + 3);
        const packPath = join(rawDir(replay), 'packs', `${safe(gen.id)}.pack.json`);
        same([gen.payload.packPath, gen.payload.logDir, gen.payload.row, gen.payload.quantity, gen.payload.uniqueness, gen.payload.maxActive],
          [packPath, join(rawDir(replay), 'logs', safe(gen.id)), safe(gen.id), 2, 'require', caseBoard(caseId).maxActive], `the payload of the generation item of ${caseId}`);
        same(puzzles.map((i) => i.payload), [{ packPath, puzzleIndex: 0 }, { packPath, puzzleIndex: 1 }], `the replay payloads of ${caseId} do not name their generation item's pack`);
      }
      const other = expandManifest({
        task: 'V4-T05', step: 'prior-replay', rows: [{ kind: 'v4-replay', variant: 'v4', caseId: '14x14-master', seedText: 's', puzzles: 1, packStep: 'prior-gen' }],
      }, 'unused', isV4);
      same(other[0].payload.packPath, join(artifactDir('frozen', 'V4-T05', 'prior-gen'), 'packs', 'prior-gen_v4_14x14-master_s_gen.pack.json'), 'a replay row of another step names that step\'s pack');
      const row = { kind: 'v4-select', variant: 'v4', caseId: '12x12-nightmare', seedText: 's', modes: ['absent'] };
      const message = (/** @type {any[]} */ rows) => {
        try {
          expandManifest({ ...parity, rows }, rawDir(parity), isV4);
        } catch (e) {
          return e instanceof Error ? e.message : String(e);
        }
        return '';
      };
      assert(message([{ ...row, modes: ['absent', 'twice'] }]) === 'v4-check: unknown mode twice', `a mode twice: ${message([{ ...row, modes: ['absent', 'twice'] }])}`);
      assert(message([row, row]) === 'v4-check: duplicate item id parity:v4:12x12-nightmare:s:absent', `a repeated row: ${message([row, row])}`);
      assert(message([{ ...row, kind: 'v4-kernel' }]) === 'v4-check: unknown row kind v4-kernel', `another kind: ${message([{ ...row, kind: 'v4-kernel' }])}`);
    },
  },
  {
    name: 'checks: manifest addressing',
    async run() {
      const dir = fresh(artifactDir('selftest', 'checks-addressing'));
      const path = join(dir, 'm.json');
      writeJson(path, {
        format: 'ig-proto-items', version: 1, task: 'V4-T04c-selftest', step: 'a',
        rows: [{ kind: 'v4-select', variant: 'v4', caseId: '12x12-nightmare', seedText: 'ig-v4/selftest', modes: ['absent'] }],
      });
      const raw = artifactDir('frozen', 'V4-T04c-selftest');
      assert(!existsSync(raw), 'the frozen folder of the case exists before the case');
      const run = async (/** @type {string[]} */ args) => {
        const write = process.stderr.write;
        let text = '';
        process.stderr.write = /** @type {any} */ ((/** @type {unknown} */ chunk) => {
          text += String(chunk);
          return true;
        });
        try {
          return { code: await checkMain(args), text };
        } finally {
          process.stderr.write = write;
        }
      };
      const wrong = await run(['run', '--task', 'V4-T04c-selftest', '--step', 'b', '--manifest', path, '--label', 'frozen', '--source-label', 'x']);
      assert(wrong.code === 1, `a manifest of another step: exit ${wrong.code}`);
      assert(wrong.text === `v4-check: manifest ${path} is V4-T04c-selftest/a, not V4-T04c-selftest/b\n`, `the message: ${JSON.stringify(wrong.text)}`);
      const task = await run(['run', '--task', 'V4-T04', '--step', 'a', '--manifest', path, '--label', 'frozen', '--source-label', 'x']);
      assert(task.code === 1 && task.text.includes('V4-T04c-selftest/a, not V4-T04/a'), `a manifest of another task: exit ${task.code}, ${JSON.stringify(task.text)}`);
      const label = await run(['run', '--task', 'V4-T04c-selftest', '--step', 'a', '--manifest', path, '--label', 'selftest', '--source-label', 'x']);
      assert(label.code === 1 && label.text === 'v4-check: --label frozen only\n', `another label: exit ${label.code}, ${JSON.stringify(label.text)}`);
      assert(!existsSync(raw), 'a refused command wrote the frozen folder of its task');
    },
  },
  {
    name: 'checks: parity on the new route',
    run() {
      const trio = (/** @type {Record<string, any>} */ record) => CHECK_MODES.map((m) => checkRow(m, m === 'record' ? record : {}));
      const pass = parityVerdict(trio({}));
      assert(pass.verdict === 'pass' && pass.reasons.length === 0 && pass.rows.length === 3, `the three equal modes: ${JSON.stringify(pass.reasons)}`);
      assert(parityVerdict(trio({ maxSequence: 2191 })).verdict === 'pass', 'the sequence 2,191 is below the bound');
      const edge = parityVerdict(trio({ maxSequence: 2192 }));
      assert(edge.verdict === 'fail' && hasReason(edge.reasons, 'maxSequence 2192 is not below 2192'), `the sequence 2,192: ${edge.verdict} ${JSON.stringify(edge.reasons)}`);
      const none = parityVerdict(trio({ maxSequence: null }));
      assert(none.verdict === 'fail' && hasReason(none.reasons, 'maxSequence null'), `no sequence on the record row: ${none.verdict} ${JSON.stringify(none.reasons)}`);
      const other = parityVerdict(CHECK_MODES.map((m) => checkRow(m, m === 'absent' ? { digest: 'x' } : {})));
      assert(other.verdict === 'fail' && hasReason(other.reasons, 'result digests differ'), `unequal digests: ${other.verdict} ${JSON.stringify(other.reasons)}`);
      const units = parityVerdict(CHECK_MODES.map((m) => checkRow(m, m === 'charge' ? { units: 11 } : {})));
      assert(units.verdict === 'fail' && hasReason(units.reasons, 'charged units 11 differ from total work 12'), `units not equal to the work: ${JSON.stringify(units.reasons)}`);
      const sequence = parityVerdict(trio({ chargeUnits: [3, 4, 4] }));
      assert(sequence.verdict === 'fail' && hasReason(sequence.reasons, 'charge sequences'), `unequal charge sequences: ${JSON.stringify(sequence.reasons)}`);
    },
  },
  {
    name: 'checks: equal rating work, unequal count work',
    run() {
      const rows = CHECK_MODES.map((m) => checkRow(m, m === 'absent' ? { ledger: { complete: true, ratingWork: 7, countWork: 6, totalWork: 13 } } : {}));
      const v = parityVerdict(rows);
      assert(v.verdict === 'fail' && hasReason(v.reasons, 'total work differs between modes (absent 13, charge 12, record 12)'), `${v.verdict} ${JSON.stringify(v.reasons)}`);
    },
  },
  {
    name: 'checks: equal charged modes, unequal absent total',
    run() {
      const rows = CHECK_MODES.map((m) => checkRow(m, m === 'absent' ? { ledger: { complete: true, ratingWork: 6, countWork: 5, totalWork: 11 } } : {}));
      const v = parityVerdict(rows);
      assert(v.verdict === 'fail' && hasReason(v.reasons, 'total work differs between modes (absent 11, charge 12, record 12)'), `${v.verdict} ${JSON.stringify(v.reasons)}`);
    },
  },
  {
    name: 'checks: incomplete ledger',
    run() {
      const trio = (/** @type {Record<string, any>} */ absent, /** @type {any[]} */ rest = []) => [checkRow('absent', absent), checkRow('charge'), checkRow('record'), ...rest];
      const open = parityVerdict(trio({ ledger: { complete: false, ratingWork: 7, countWork: 5, totalWork: 12 } }));
      assert(open.verdict === 'incomplete' && hasReason(open.reasons, 'no complete work evidence'), `${open.verdict} ${JSON.stringify(open.reasons)}`);
      const unequal = parityVerdict(trio({ ledger: { complete: false, ratingWork: 7, countWork: 5, totalWork: 99 } }));
      assert(unequal.verdict === 'incomplete', 'the sums of an incomplete ledger were compared');
      const failing = parityVerdict(trio({ ledger: { complete: false, ratingWork: 7, countWork: 5, totalWork: 12 }, digest: 'x' }));
      assert(failing.verdict === 'fail' && failing.reasons.length === 2, `a failure and a gap: ${failing.verdict} ${JSON.stringify(failing.reasons)}`);
      const censored = parityVerdict([checkRow('absent', {}, { status: 'censored' }), checkRow('charge'), checkRow('record')]);
      assert(censored.verdict === 'incomplete' && hasReason(censored.reasons, 'censored'), `a censored row: ${censored.verdict}`);
      const missing = parityVerdict([{ ...checkRow('absent'), status: 'missing', result: null }, checkRow('charge'), checkRow('record')]);
      assert(missing.verdict === 'incomplete' && hasReason(missing.reasons, 'no item-end line'), `a missing row: ${missing.verdict}`);
      const absent = parityVerdict([checkRow('absent'), checkRow('record')]);
      assert(absent.verdict === 'incomplete' && hasReason(absent.reasons, 'the charge item is absent'), `a required mode that is not in the rows: ${absent.verdict}`);
      const errored = parityVerdict([checkRow('absent', { outcome: 'error', message: 'x' }, { status: 'error' }), checkRow('charge'), checkRow('record')]);
      assert(errored.verdict === 'fail' && hasReason(errored.reasons, ': error (x)'), `an error row: ${errored.verdict}`);
      const noSet = parityVerdict(trio({ outcome: 'no-set' }));
      assert(noSet.verdict === 'fail' && hasReason(noSet.reasons, 'outcome no-set'), `an outcome other than ok: ${noSet.verdict}`);
      assert(parityVerdict([]).verdict === 'incomplete', 'no rows');
    },
  },
  {
    name: 'checks: detail counts',
    run() {
      const same2 = [{ equal: true }, { equal: true }];
      const record = (/** @type {Record<string, any>} */ over) => parityVerdict(CHECK_MODES.map((m) => checkRow(m, m === 'record' ? over : {})));
      const pass = record({ detail: { rated: 1, rejected: 3, scored: 4, missing: 0, rechecked: same2 } });
      assert(pass.verdict === 'pass', `four scored events: ${JSON.stringify(pass.reasons)}`);
      const none = record({ detail: { rated: 0, rejected: 0, scored: 0, missing: 0, rechecked: [] } });
      assert(none.verdict === 'incomplete' && hasReason(none.reasons, 'no completed scored event'), `no scored event: ${none.verdict} ${JSON.stringify(none.reasons)}`);
      const missing = record({ detail: { rated: 1, rejected: 2, scored: 3, missing: 1, rechecked: same2 } });
      assert(missing.verdict === 'fail' && hasReason(missing.reasons, '1 scored events without detail'), `a missing detail: ${missing.verdict}`);
      assert(record({ detail: { rated: 1, rejected: 0, scored: 1, missing: 0, rechecked: [{ equal: true }] } }).verdict === 'pass', 'one scored event, one recheck');
      assert(record({ detail: { rated: 1, rejected: 2, scored: 4, missing: 0, rechecked: same2 } }).verdict === 'fail', 'scored is not rated + rejected');
      assert(record({ detail: { rated: 1, rejected: 2, scored: 3, missing: 0, rechecked: [{ equal: true }] } }).verdict === 'fail', 'one recheck of three scored events');
      assert(record({ detail: { rated: 1, rejected: 2, scored: 3, missing: 0, rechecked: [{ equal: true }, { equal: false }] } }).verdict === 'fail', 'an unequal recheck');
      assert(record({ detail: null }).verdict === 'fail' && record({ events: 0 }).verdict === 'fail', 'a record row without detail, or without an event');
    },
  },
  {
    name: 'checks: legacy route and base',
    run() {
      const legacy = { caseId: '14x14-master', route: 'legacy' };
      const v4 = () => [
        checkRow('absent', {}, legacy),
        checkRow('charge', {}, legacy),
        checkRow('record', { ledger: { complete: false, ratingWork: null, countWork: 5, totalWork: null } }, { ...legacy, route: 'legacy-recorded' }),
      ];
      const baseRow = (/** @type {string} */ mode, /** @type {Record<string, any>} */ over = {}) => checkRow(mode, { ledger: null, ...over }, { variant: 'base', caseId: '14x14-master', route: 'base' });
      const base = (/** @type {Record<string, any>} */ record = {}, /** @type {Record<string, any>} */ absent = {}) => [baseRow('absent', absent), baseRow('record', record)];
      const pass = parityVerdict([...v4(), ...base()]);
      assert(pass.verdict === 'pass' && pass.rows.length === 5, `v4 and base: ${pass.verdict} ${JSON.stringify(pass.reasons)}`);
      const total = parityVerdict([...v4(), ...base({ units: 13 })]);
      assert(total.verdict === 'fail' && hasReason(total.reasons, 'base recorded total 13 differs from v4\'s 12'), `base recorded units 13: ${total.verdict} ${JSON.stringify(total.reasons)}`);
      const events = parityVerdict([...v4(), ...base({ eventsDigest: 'f' })]);
      assert(events.verdict === 'fail' && hasReason(events.reasons, 'events digest'), `another events digest: ${events.verdict}`);
      const digest = parityVerdict([...v4(), ...base({}, { digest: 'x' })]);
      assert(digest.verdict === 'fail' && hasReason(digest.reasons, 'absent result digest'), `another absent digest: ${digest.verdict}`);
      assert(parityVerdict(v4()).verdict === 'pass', 'the v4 group alone, without a base group');
      const alone = parityVerdict(base());
      assert(alone.verdict === 'incomplete' && hasReason(alone.reasons, 'no v4 rows of 14x14-master'), `base without v4: ${alone.verdict}`);
      const records = v4();
      records[2].result.maxSequence = 2128;
      const high = parityVerdict(records);
      assert(high.verdict === 'fail' && hasReason(high.reasons, 'maxSequence 2128 is not below 2128'), `the legacy bound: ${high.verdict} ${JSON.stringify(high.reasons)}`);
      assert(parityVerdict(v4().map((r) => (r.mode === 'record' ? { ...r, result: { ...r.result, maxSequence: 2127 } } : r))).verdict === 'pass', 'the sequence 2,127 is below the legacy bound');
      const units = parityVerdict(v4().map((r) => (r.mode === 'record' ? { ...r, result: { ...r.result, units: 13 } } : r)));
      assert(units.verdict === 'fail' && hasReason(units.reasons, 'recorded charged units 13'), `recorded units against the charged mode: ${units.verdict}`);
      const charge = parityVerdict(v4().map((r) => (r.mode === 'charge' ? { ...r, result: { ...r.result, units: 13 } } : r)));
      assert(charge.verdict === 'fail' && hasReason(charge.reasons, 'charged units 13 differ from total work 12'), `charged units against the ledger: ${charge.verdict}`);
      const worked = parityVerdict(v4().map((r) => (r.mode === 'charge' ? { ...r, result: { ...r.result, ledger: { complete: true, ratingWork: 8, countWork: 5, totalWork: 13 } } } : r)));
      assert(worked.verdict === 'fail' && hasReason(worked.reasons, 'total work differs between modes (absent 12, charge 13)'), `the two ledgers' total work: ${worked.verdict}`);
      const open = parityVerdict(v4().map((r) => (r.mode === 'absent' ? { ...r, result: { ...r.result, ledger: { complete: false, ratingWork: 7, countWork: 5, totalWork: 12 } } } : r)));
      assert(open.verdict === 'incomplete' && hasReason(open.reasons, 'no complete work evidence'), `an incomplete absent ledger: ${open.verdict}`);
    },
  },
  {
    name: 'checks: replay proofs',
    run() {
      const none = replayVerdict([]);
      assert(none.verdict === 'incomplete', `no rows: ${none.verdict}`);
      const early = replayVerdict([generated(), replayed(0, 'calibration', 'incomplete', { reason: 'work', work: 9, bytes: 50 }), replayed(1, 'candidate', 'incomplete', { reason: 'work' })]);
      const findings = early.reasons.filter((r) => r.startsWith('finding '));
      assert(early.verdict === 'incomplete' && findings.length === 2 && findings[0].includes('reason work, work 9, bytes 50')
        && hasReason(early.reasons, 'no matched candidate replay for 14x14-master'), `two incomplete replays: ${early.verdict} ${JSON.stringify(early.reasons)}`);
      const proven = replayVerdict([generated(), replayed(0, 'calibration', 'matched'), replayed(1, 'candidate', 'matched')]);
      assert(proven.verdict === 'pass' && proven.reasons.length === 0 && proven.rows.length === 3, `both replays matched: ${proven.verdict} ${JSON.stringify(proven.reasons)}`);
      const mismatch = replayVerdict([generated(), replayed(0, 'calibration', 'matched'), replayed(1, 'candidate', 'mismatch', { reason: 'stage' })]);
      assert(mismatch.verdict === 'fail' && hasReason(mismatch.reasons, 'replay mismatch (stage)'), `a mismatch: ${mismatch.verdict} ${JSON.stringify(mismatch.reasons)}`);
      const noPack = replayVerdict([replayRow('gen', 'completed', { outcome: 'no-pack', batchStatus: 'failed', reason: null }), replayRow('puzzle-0', 'completed', { outcome: 'no-record', reason: 'no pack' })]);
      assert(noPack.verdict === 'incomplete' && hasReason(noPack.reasons, 'no record obtained for 14x14-master') && noPack.reasons.length === 1, `no pack: ${noPack.verdict} ${JSON.stringify(noPack.reasons)}`);
      const noSet = replayVerdict([replayRow('gen', 'completed', { outcome: 'no-set', setStatus: 'failed', reason: null })]);
      assert(noSet.verdict === 'incomplete' && hasReason(noSet.reasons, 'no record obtained'), `no set: ${noSet.verdict}`);
      assert(replayVerdict([replayRow('gen', 'censored', { outcome: 'censored' })]).verdict === 'incomplete', 'a censored generation item');
      assert(replayVerdict([replayRow('gen', 'error', { outcome: 'error', message: 'boom' })]).verdict === 'fail', 'a generation item that ended in error');
      const noStep = replayVerdict([generated(), replayed(0, 'calibration', 'matched'), replayed(1, 'candidate', 'matched', { detailStep: null })]);
      assert(noStep.verdict === 'fail' && hasReason(noStep.reasons, 'matched without a measuring step'), `a matched replay without detailStep: ${noStep.verdict}`);
      const calibrationOnly = replayVerdict([generated(), replayed(0, 'calibration', 'matched')]);
      assert(calibrationOnly.verdict === 'incomplete' && hasReason(calibrationOnly.reasons, 'no matched candidate replay'), `a calibration replay is not a candidate proof: ${calibrationOnly.verdict}`);
      const sha = replayVerdict([generated(), replayed(0, 'calibration', 'matched'), replayed(1, 'candidate', 'matched', { packSha256: 'g' })]);
      assert(sha.verdict === 'fail' && hasReason(sha.reasons, 'SHA-256 differs'), `another pack: ${sha.verdict}`);
      const unavailable = replayVerdict([generated(), replayed(0, 'candidate', 'matched'), replayed(1, 'calibration', 'unavailable')]);
      assert(unavailable.verdict === 'fail', `an unavailable replay: ${unavailable.verdict}`);
      const finding = replayVerdict([generated(), replayed(0, 'calibration', 'incomplete', { reason: 'bytes' }), replayed(1, 'candidate', 'matched')]);
      assert(finding.verdict === 'pass' && finding.reasons.length === 1 && finding.reasons[0].startsWith('finding '), `a finding beside a proof: ${finding.verdict} ${JSON.stringify(finding.reasons)}`);
      const censored = replayVerdict([generated(), replayed(0, 'calibration', 'matched'), { ...replayed(1, 'candidate', 'matched'), status: 'censored', result: { outcome: 'censored' } }]);
      assert(censored.verdict === 'incomplete', `a censored replay item: ${censored.verdict} ${JSON.stringify(censored.reasons)}`);
      const second = replayVerdict([generated(), replayed(0, 'calibration', 'matched'), replayed(1, 'candidate', 'matched'), replayRow('gen', 'completed', { outcome: 'ok', puzzles: 2 }, { step: 'again' })]);
      assert(second.verdict === 'fail' && hasReason(second.reasons, 'a second generation item'), `two generation items of one case: ${second.verdict}`);
      const across = replayVerdict([
        replayRow('gen', 'completed', { outcome: 'ok', puzzles: 2, packSha256: 'h' }, { step: 'prior-gen' }),
        replayRow('puzzle-0', 'completed', { outcome: 'ok', kind: 'candidate', status: 'matched', detailStep: 3, packSha256: 'h' }, { step: 'prior-replay' }),
      ]);
      assert(across.verdict === 'pass', `a replay row of another step than its generation row: ${across.verdict} ${JSON.stringify(across.reasons)}`);
    },
  },
  {
    name: 'proof: receipts are typed and bound',
    run() {
      const dir = fresh(artifactDir('selftest', 'proof-1'));
      const file = join(dir, 'evidence.json');
      writeJson(file, { rows: 1 });
      const S = { frozenCommit: 'c', sourceDigest: 'd' };
      const arms = [{ id: 'fr-frozen', treeId: 't1', paramsHash: 'p1' }];
      const E = proofEnvelope({
        kind: 'live-deadline',
        verdict: 'pass',
        source: S,
        harnessHash: 'h',
        arms,
        coverage: { expected: ['14x14-nightmare~0'], observed: ['14x14-nightmare~0'], missing: [], censored: [] },
        evidence: [{ path: rel(file), sha256: sha256File(file) }],
        fields: LIVE_DEADLINE_FIELDS,
      });
      /** @type {any} */
      const X = { kind: 'live-deadline', source: S, harnessHash: 'h', arms, coverage: { expected: ['14x14-nightmare~0'] }, fields: LIVE_DEADLINE_FIELDS };
      const is = (/** @type {any} */ receipt, /** @type {string} */ status, /** @type {string | null} */ text, /** @type {string} */ label, /** @type {any} */ expected = X) => {
        const result = proofCheck(receipt, expected);
        assert(result.status === status && (text === null || hasReason(result.reasons, text)), `${label}: ${result.status} ${JSON.stringify(result.reasons)}`);
      };
      same(Object.keys(E).slice(0, 9), ['format', 'version', 'kind', 'verdict', 'source', 'harnessHash', 'arms', 'coverage', 'evidence'], 'the envelope fields');
      same([E.format, E.version, E.live, E.postHoc, E.workCutoffMs, E.responseBoundMs, E.reserveChecked], ['ig-v4-proof', 1, true, false, 115000, 120000, true],
        'the live-deadline fields are not spread into the root');
      is({ verdict: 'pass' }, 'incomplete', 'not a live-deadline receipt', '(a) a bare verdict');
      const noPostHoc = { ...E, kind: 'deadline-projection' };
      delete noPostHoc.postHoc;
      is(noPostHoc, 'incomplete', 'not a live-deadline receipt', '(b) a projection');
      is({ ...E, arms: [{ ...arms[0], treeId: 't2' }] }, 'incomplete', 'stale arm fr-frozen', '(c) another tree');
      is({ ...E, reserveChecked: false }, 'incomplete', 'reserveChecked is false', '(d) a field of the kind');
      is(E, 'pass', null, '(f) the complete receipt');
      is({ ...E, verdict: 'fail' }, 'fail', null, '(g) a failing verdict');
      is({ ...E, harnessHash: 'h2' }, 'incomplete', 'producer changed', '(h) another producer');
      const unbound = { ...X };
      delete unbound.harnessHash;
      is(E, 'incomplete', 'no producer binding', '(i) no producer binding', unbound);
      const failing = proofCheck({ ...E, verdict: 'fail', source: { frozenCommit: 'c', sourceDigest: 'x' }, reasons: ['why'] }, X);
      same([failing.status, failing.reasons], ['fail', ['why']], 'a failing receipt reports its own reasons before any binding');
      is({ ...E, verdict: 'incomplete' }, 'incomplete', 'verdict', 'a receipt that is not a pass');
      is({ ...E, source: { frozenCommit: 'c', sourceDigest: 'x' }, harnessHash: 'h2' }, 'incomplete', 'stale source', 'the source before the producer');
      is({ ...E, version: 2 }, 'incomplete', 'not a live-deadline receipt', 'another version');
      is({ ...E, format: 'other' }, 'incomplete', 'not a live-deadline receipt', 'another format');
      const noArms = { ...E };
      delete noArms.arms;
      is(noArms, 'incomplete', 'not a live-deadline receipt', 'a missing envelope field');
      is(E, 'incomplete', 'stale arm fr-frozen', 'another paramsHash', { ...X, arms: [{ ...arms[0], paramsHash: 'p2' }] });
      is(E, 'incomplete', 'stale arm other', 'an arm the receipt lacks', { ...X, arms: [...arms, { id: 'other', treeId: 't', paramsHash: 'p' }] });
      is(E, 'incomplete', 'coverage gap 15x15~1', 'an expected id that was not observed', { ...X, coverage: { expected: ['14x14-nightmare~0', '15x15~1'] } });
      is({ ...E, coverage: { ...E.coverage, censored: ['14x14-nightmare~0'] } }, 'incomplete', 'coverage gap 14x14-nightmare~0', 'a censored id');
      is({ ...E, coverage: { ...E.coverage, missing: ['m'] } }, 'incomplete', 'coverage gap m', 'a missing id');
      is({ ...E, evidence: [{ path: rel(join(dir, 'absent.json')), sha256: 'x' }] }, 'incomplete', 'evidence changed', 'an evidence file that is absent');
      assert(proofCheck(E, X, () => null).status === 'incomplete', 'a readFile that finds nothing');
      let message = '';
      try {
        proofEnvelope({ kind: 'k', verdict: 'pass', source: S, harnessHash: 'h', arms: [], coverage: E.coverage, evidence: [], fields: { verdict: 'fail' } });
      } catch (e) {
        message = e instanceof Error ? e.message : String(e);
      }
      assert(message.includes('envelope field (verdict)'), `a field named like an envelope field: ${message}`);
      writeJson(file, { rows: 2 });
      is(E, 'incomplete', `evidence changed ${rel(file)}`, '(e) the file changed after hashing');
    },
  },
  {
    name: 'proof: stored identities',
    async run() {
      assert(SOURCE_KIND === 'frozen', 'the case must run with --label frozen');
      const task = 'V4-T04d-selftest';
      const root = fresh(artifactDir('selftest', 'proof-2'));
      const manifestPath = join(root, 'm.json');
      const manifest = {
        format: 'ig-proto-items', version: 1, task, step: 'parity',
        rows: [{ kind: 'v4-select', variant: 'v4', caseId: '12x12-nightmare', seedText: 'ig-v4/selftest', modes: ['absent', 'charge'] }],
      };
      writeJson(manifestPath, manifest);
      const raw = artifactDir('frozen', task);
      rmSync(raw, { recursive: true, force: true });
      try {
        const dir = join(raw, 'parity');
        mkdirSync(dir, { recursive: true });
        const isV4 = () => true;
        const items = expandManifest(manifest, dir, isV4);
        const treeId = (await ensureTree('v4')).treeId;
        /** @type {any} */
        const identity = { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST, treeIds: { v4: treeId }, harnessHash: 'h', manifestHash: manifestHash(items) };
        const state = join(dir, 'state.json');
        const log = join(dir, 'items.jsonl');
        const result = { outcome: 'ok', digest: 'd' };
        const lay = (/** @type {any} */ stored, /** @type {string} */ hash = identityHash(stored), lines = 2) => {
          rmSync(log, { force: true });
          writeJson(state, { format: 'ig-proto-state', version: 1, task, step: 'parity', label: 'frozen', identity: stored, done: false });
          logStart(log, hash, items[0]);
          logEnd(log, hash, items[0].id, 'completed', result, 5);
          if (lines === 3) {
            logStart(log, 'another', items[1]);
          }
        };
        const read = () => stepEvidence(task, 'parity', manifestPath, isV4);
        lay(identity);
        const good = read();
        same(good.problems, [], `the matching folder: ${JSON.stringify(good.problems)}`);
        same(good.identity, identity, 'the identity is not the stored one');
        same(good.rows.map((r) => [r.item, r.variant, r.caseId, r.seedText, r.mode, r.route, r.status, r.result]), [
          [items[0].id, 'v4', '12x12-nightmare', 'ig-v4/selftest', 'absent', 'new', 'completed', result],
          [items[1].id, 'v4', '12x12-nightmare', 'ig-v4/selftest', 'charge', 'new', 'missing', null],
        ], 'the joined rows of the manifest, in order');
        lay({ ...identity, manifestHash: 'x' });
        const manifestProblem = read().problems[0];
        assert(manifestProblem.includes('manifest hash') && manifestProblem.includes(rel(manifestPath)), `a manifest hash that differs: ${manifestProblem}`);
        lay(identity, identityHash(identity), 3);
        const foreign = read().problems;
        assert(foreign.length === 1 && foreign[0].includes('log line 3') && foreign[0].includes('identityHash'), `a log line of another identity: ${JSON.stringify(foreign)}`);
        lay({ ...identity, treeIds: { v4: 'old' } });
        const stale = read();
        same(stale.problems, [`stale tree v4 (old vs ${treeId})`], 'a stored tree id that is not the current tree\'s');
        same(stale.identity.treeIds, { v4: 'old' }, 'the stored tree id was relabelled');
        lay({ ...identity, frozenCommit: 'x', sourceDigest: 'y' });
        const source = read().problems;
        assert(source.length === 2 && source[0].includes('frozen commit') && source[1].includes('source digest'), `another frozen source: ${JSON.stringify(source)}`);
        rmSync(state);
        rmSync(log);
        const noState = read();
        assert(noState.identity === null && noState.problems[0].startsWith('no state ') && noState.rows.every((r) => r.status === 'missing'), `no state: ${JSON.stringify(noState.problems)}`);
      } finally {
        rmSync(raw, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'proof: PM4 block',
    run() {
      const done = { done: true };
      const is = (/** @type {any} */ v, /** @type {string} */ verdict, /** @type {string | null} */ text, /** @type {string} */ label) => {
        assert(v.verdict === verdict && (text === null || hasReason(v.reasons, text)), `${label}: ${v.verdict} ${JSON.stringify(v.reasons)}`);
      };
      const judged = (/** @type {(record: any) => void} */ edit, /** @type {any} */ state = done, instr = 't-instr') => pm4Verdict(pm4Record(edit), state, instr);
      is(pm4Verdict(null, done, 't-instr'), 'incomplete', 'not run', '(a) no record');
      is(judged(() => {}), 'pass', null, '(b) the complete record');
      is(judged((r) => { r.certificate.coverage.gaps = ['no scap0 run observed']; }), 'fail', 'no scap0 run observed', '(c) a coverage gap');
      is(judged(() => {}, { done: false }), 'incomplete', 'not done', '(d) the screens step is not done');
      is(pm4Verdict(pm4Record(), null, 't-instr'), 'incomplete', null, 'no screens state');
      is(judged((r) => { r.certificate.violations = [{ cell: 'x' }]; }), 'fail', '1 certificate violations', 'a violation');
      is(judged((r) => { r.certificate.certifiedRuns = 0; }), 'fail', '0 certified runs', 'no certified run');
      is(judged((r) => { r.certificate.coverage.equalCanonical.certified.equal = 39; }), 'fail', '39 of 40', 'a certified run that differs from its canonical rating');
      is(judged((r) => { r.meta.source.frozenCommit = 'x'; }), 'fail', 'frozen commit x', 'another frozen commit');
      is(judged((r) => { r.meta.source.sourceDigest = 'y'; }), 'fail', 'source digest y', 'another source digest');
      is(judged((r) => { r.run = 'dry'; }), 'fail', 'run dry is not main', 'another run');
      is(judged(() => {}, done, 't-other'), 'fail', 'instr tree t-instr is not the expected t-other', 'another instr tree');
      is(judged((r) => { delete r.certificate; }), 'incomplete', 'certificate.violations', 'a record without its certificate');
      const several = judged((r) => { r.certificate.violations = [1, 2]; r.certificate.certifiedRuns = 0; });
      assert(several.verdict === 'fail' && several.reasons.length === 2, `two failed conditions: ${JSON.stringify(several.reasons)}`);
    },
  },
  {
    name: 'proof: the early PM4 gate needs no stage-1 capture',
    run() {
      const pm4Path = 'docs/improve-generating/evidence/frozen/IGP-02/pm4.json';
      const screensPath = 'tests/artifacts/ig-proto/frozen/IGP-02/main/screens-all-state.json';
      const gate = (/** @type {string} */ instr, /** @type {any} */ state = { done: true }) => {
        /** @type {Record<string, string>} */
        const texts = { [pm4Path]: JSON.stringify(pm4Record()), [screensPath]: JSON.stringify(state) };
        /** @type {string[]} */
        const paths = [];
        const readFile = (/** @type {string} */ path) => {
          paths.push(path);
          if (!Object.hasOwn(texts, path)) {
            throw new Error(`unexpected read of ${path}`);
          }
          return texts[path];
        };
        return { verdict: pm4GateEvidence(instr, readFile), paths };
      };
      const ok = gate('t-instr');
      assert(ok.verdict.verdict === 'pass', `the early gate: ${JSON.stringify(ok.verdict.reasons)}`);
      same(ok.paths, [pm4Path, screensPath], 'the paths the gate read');
      const other = gate('t-other');
      assert(other.verdict.verdict === 'fail' && hasReason(other.verdict.reasons, 'instr tree'), `an expected instr tree the record does not name: ${JSON.stringify(other.verdict.reasons)}`);
      same(other.paths, [pm4Path, screensPath], 'the paths of the failing gate');
      assert(gate('t-instr', { done: false }).verdict.verdict === 'incomplete', 'a screens state that is not done');
      const none = pm4GateEvidence('t-instr', () => null);
      assert(none.verdict === 'incomplete' && hasReason(none.reasons, 'not run'), `no record: ${JSON.stringify(none.reasons)}`);
      const broken = pm4GateEvidence('t-instr', () => '{');
      assert(broken.verdict === 'incomplete' && hasReason(broken.reasons, 'unreadable'), `an unreadable record: ${JSON.stringify(broken.reasons)}`);
    },
  },
  {
    name: 'proof: the stage-1 inputs are an explicit index',
    run() {
      const inputs = stage1Inputs('V4-T04', ['v4', 'base', 'instr']);
      same(inputs, [
        'tools/ig-proto/plans/V4-T04.parity.json',
        'tools/ig-proto/plans/V4-T04.replay.json',
        'tests/artifacts/ig-proto/frozen/V4-T04/parity/state.json',
        'tests/artifacts/ig-proto/frozen/V4-T04/parity/items.jsonl',
        'tests/artifacts/ig-proto/frozen/V4-T04/replay/state.json',
        'tests/artifacts/ig-proto/frozen/V4-T04/replay/items.jsonl',
        'docs/improve-generating/evidence/frozen/V4-T04/identity.json',
        'docs/improve-generating/evidence/frozen/IGP-02/pm4.json',
        'tests/artifacts/ig-proto/frozen/IGP-02/main/screens-all-state.json',
        'tests/artifacts/ig-proto/frozen/V4-T04/self-test/state.json',
        'tests/artifacts/ig-proto/frozen/V4-T04v4/self-test/state.json',
        'tests/artifacts/ig-proto/frozen/V4-T04f/self-test/state.json',
        'tests/artifacts/ig-proto/frozen/V4-T04i/self-test/state.json',
        'docs/improve-generating/evidence/frozen/V4-T04/inputs/harness.json',
        'docs/improve-generating/evidence/frozen/V4-T04/inputs/base.ig-tree.json',
        'docs/improve-generating/evidence/frozen/V4-T04/inputs/instr.ig-tree.json',
        'docs/improve-generating/evidence/frozen/V4-T04/inputs/v4.ig-tree.json',
      ], 'the stage-1 inputs');
      assert(inputs.length === 17, `${inputs.length} inputs, not 17`);
      const mutable = ['tests/artifacts/ig-proto/tree-frozen/', 'tools/ig-proto/variants/', 'tools/ig-proto/lib/'];
      assert(!inputs.some((path) => mutable.some((prefix) => path.startsWith(prefix))), 'an input under a tree folder, the variants or the harness library');
      same(stage1Inputs('V4-T04', ['v4', 'v4']).slice(-2), ['docs/improve-generating/evidence/frozen/V4-T04/inputs/harness.json', 'docs/improve-generating/evidence/frozen/V4-T04/inputs/v4.ig-tree.json'], 'a repeated variant');
    },
  },
  {
    name: 'proof: stage-1 line',
    run() {
      /** @param {Record<string, [string, string[]]>} [over] */
      const blocks = (over = {}) => Object.fromEntries(Object.entries({
        source: ['pass', []], identity: ['pass', []], pm4: ['pass', []], 'self-test': ['pass', []], parity: ['pass', []], replay: ['pass', []], ...over,
      }).map(([name, [verdict, reasons]]) => [name, { verdict, reasons, rows: [] }]));
      assert(stage1Verdict(blocks()) === 'Stage 1: holds.', 'every block passes');
      assert(stage1Verdict(blocks({ identity: ['incomplete', ['not run']] })) === 'Stage 1: INCOMPLETE (identity: not run)', 'one incomplete block');
      assert(stage1Verdict(blocks({ identity: ['incomplete', ['not run']], parity: ['incomplete', ['no state', 'a', 'b', 'c']] }))
        === 'Stage 1: INCOMPLETE (identity: not run; parity: no state, a, b, +1 more)', 'two incomplete blocks');
      assert(stage1Verdict(blocks({ pm4: ['fail', ['2 certificate violations']], replay: ['incomplete', ['no state']] })) === 'Stage 1: STOP (pm4: 2 certificate violations)',
        'a failed block beside an incomplete one');
      assert(stage1Verdict({}).startsWith('Stage 1: INCOMPLETE'), 'no block holds nothing');
    },
  },
  {
    name: 'proof: identity block',
    run() {
      const seeds = [...IDENTITY_SEEDS];
      const is = (/** @type {any} */ v, /** @type {string} */ verdict, /** @type {string | null} */ text, /** @type {string} */ label) => {
        assert(v.verdict === verdict && (text === null || hasReason(v.reasons, text)), `${label}: ${v.verdict} ${JSON.stringify(v.reasons)}`);
      };
      is(identityVerdict(null, seeds), 'incomplete', 'not run', '(a) no record');
      is(identityVerdict(identityRecord(), seeds), 'pass', null, '(b) the complete record');
      is(identityVerdict(identityRecord((r) => {
        delete r.seeds[1].mp12b1;
        delete r.seeds[1].pairs['mp12b1~base'];
        delete r.seeds[1].pairs['mp12b1~log'];
        r.summary.withoutMp12b1 = 1;
      }), seeds), 'incomplete', 'withoutMp12b1 1', '(c) a seed without an MP12b1 run');
      is(identityVerdict(identityRecord((r) => { r.seeds[2].pairs['mp12b1~base'].sameResult = false; }), seeds), 'fail', seeds[2], '(d) another result than MP12b1\'s');
      is(identityVerdict(identityRecord((r) => { r.seeds[3].pairs['base~log'].level = 'metric-prefix'; }), seeds), 'fail', seeds[3], 'a base~log pair below puzzle identity');
      is(identityVerdict(identityRecord((r) => { r.summary.failures = 2; }), seeds), 'fail', '2 failures', 'a failure of the record');
      is(identityVerdict(identityRecord((r) => { r.seeds.pop(); }), seeds), 'incomplete', 'differ', 'a seed less');
      is(identityVerdict(identityRecord((r) => { r.seeds.reverse(); }), seeds), 'pass', null, 'the seeds in another order');
      is(identityVerdict(identityRecord((r) => { delete r.seeds[0].mp12b1; }), seeds), 'incomplete', 'withoutMp12b1 1', 'a seed without an MP12b1 run that the summary does not count');
    },
  },
  {
    name: 'proof: the stage-1 receipt is assembled from stored identities',
    run() {
      const dir = fresh(artifactDir('selftest', 'proof-8'));
      const file = join(dir, 'input.json');
      writeJson(file, { input: 1 });
      const task = 'V4-T04';
      const parityRows = CHECK_MODES.map((mode) => checkRow(mode));
      const replayRows = [generated(), replayed(0, 'calibration', 'matched'), replayed(1, 'candidate', 'matched')];
      const itemIds = [...parityRows, ...replayRows].map((row) => row.item);
      const identity = { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST, treeIds: { v4: 't-v4' }, harnessHash: 'h', manifestHash: 'm' };
      const world = () => ({
        task,
        parity: { identity, rows: parityRows, problems: /** @type {string[]} */ ([]) },
        replay: { identity, rows: replayRows, problems: /** @type {string[]} */ ([]) },
        itemIds,
        identityRecord: identityRecord(),
        pm4: pm4Record(),
        screens: { done: true },
        selfTests: Object.fromEntries(['V4-T04', 'V4-T04v4', 'V4-T04f', 'V4-T04i'].map((id) => [id, { done: true, results: [{ name: 'x', pass: true }] }])),
        source: { snapshotOk: true, digestEqual: true, variants: { v4: /** @type {string[]} */ ([]) } },
        captured: {
          trees: { v4: { treeId: 't-v4', paramsHash: 'p-v4' }, instr: { treeId: 't-instr', paramsHash: 'p-instr' } },
          reasons: { pm4: /** @type {string[]} */ ([]), inputs: /** @type {string[]} */ ([]) },
        },
        evidence: [{ path: rel(file), sha256: sha256File(file) }],
        missingInputs: /** @type {string[]} */ ([]),
        meta: {},
      });
      /** @type {any} */
      const expectation = {
        kind: 'stage1',
        source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST },
        harnessHash: 'h',
        arms: [{ id: 'v4', treeId: 't-v4', paramsHash: 'p-v4' }],
        coverage: { expected: [...itemIds, ...STAGE1_COVERAGE_EXTRA] },
      };
      const whole = judgeStage1(world());
      same([whole.line, whole.receipt.verdict], ['Stage 1: holds.', 'pass'], `the complete world: ${whole.line}`);
      same(Object.keys(whole.blocks), ['source', 'identity', 'pm4', 'self-test', 'parity', 'replay', 'inputs'], 'the blocks');
      same([whole.receipt.coverage.missing, whole.receipt.coverage.censored], [[], []], 'the coverage of the complete world');
      same(whole.receipt.arms, [{ id: 'v4', treeId: 't-v4', paramsHash: 'p-v4' }], 'the arms come from the stored identity and the captured copy');
      same(proofCheck(whole.receipt, expectation).status, 'pass', 'the receipt does not pass proofCheck against an expectation built apart');
      const ended = (/** @type {number} */ i, /** @type {string} */ status) => parityRows.map((row, at) => (at === i ? { ...row, status, result: { outcome: status } } : row));
      const censored = judgeStage1({ ...world(), parity: { identity, rows: ended(0, 'censored'), problems: [] } });
      same([censored.receipt.verdict, censored.receipt.coverage.censored, censored.receipt.coverage.missing.includes(parityRows[0].item)], ['incomplete', [parityRows[0].item], true], 'a censored item');
      assert(proofCheck(censored.receipt, expectation).status === 'incomplete', 'a censored item passed proofCheck');
      const stopped = judgeStage1({ ...world(), pm4: pm4Record((r) => { r.certificate.violations = [1]; }) });
      assert(stopped.receipt.verdict === 'fail' && stopped.line.startsWith('Stage 1: STOP (pm4: 1 certificate violations'), `a violation: ${stopped.line}`);
      same(proofCheck(stopped.receipt, expectation), { status: 'fail', reasons: [stopped.line] }, 'a failing stage-1 receipt reports its line');
      const stale = judgeStage1({ ...world(), parity: { identity, rows: parityRows, problems: ['stale tree v4 (t-v4 vs t-new)'] } });
      assert(stale.receipt.verdict === 'incomplete' && hasReason(stale.blocks.parity.reasons, 'stale tree v4'), `a stale tree: ${stale.line}`);
      const noCopy = judgeStage1({ ...world(), captured: { ...world().captured, trees: { instr: world().captured.trees.instr, v4: null } } });
      same(noCopy.receipt.arms, [{ id: 'v4', treeId: 't-v4', paramsHash: null }], 'an arm without its captured copy has no parameter hash');
      assert(proofCheck(noCopy.receipt, expectation).status === 'incomplete', 'an arm without a parameter hash passed proofCheck');
      const missing = judgeStage1({ ...world(), missingInputs: ['tools/ig-proto/plans/x.json'] });
      assert(missing.receipt.verdict === 'incomplete' && hasReason(missing.blocks.inputs.reasons, 'missing input tools/ig-proto/plans/x.json'), `a missing input: ${missing.line}`);
      const producer = judgeStage1({ ...world(), captured: { ...world().captured, reasons: { pm4: [], inputs: ['producer changed since the observation'] } } });
      assert(producer.receipt.verdict === 'incomplete' && hasReason(producer.blocks.inputs.reasons, 'producer changed'), `another producer: ${producer.line}`);
      const noMp12b1 = judgeStage1({ ...world(), identityRecord: identityRecord((r) => { delete r.seeds[0].mp12b1; r.summary.withoutMp12b1 = 1; }) });
      assert(noMp12b1.receipt.verdict === 'incomplete' && hasReason(noMp12b1.blocks.identity.reasons, 'withoutMp12b1 1'), `a seed without an MP12b1 run: ${noMp12b1.line}`);
    },
  },
  {
    name: 'accept: a passing receipt is bound',
    run() {
      const w = acceptWorld();
      const binding = acceptedBinding(w.options);
      same([binding.format, binding.version, binding.receipt.path, binding.acceptedBy], [ACCEPTED_FORMAT, 1, rel(w.receiptFile), 'selftest'], 'the binding\'s header');
      assert(binding.receipt.sha256 === sha256Text(readFileSync(w.receiptFile, 'utf8')), 'the binding does not hold the hash of the receipt\'s text');
      same(binding.expected.coverage.expected, ['a', 'b'], 'the binding\'s declared coverage');
      same([binding.expected.harnessHash, binding.expected.arms, binding.expected.source], [w.options.harnessHash, w.options.arms, { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST }], 'the binding\'s producer, arms and source');
      assert(binding.params.v4.W === 1 && !Number.isNaN(Date.parse(binding.acceptedAt)), 'the captured parameters or the acceptance time');
      same(checkAccepted(binding, { current: [] }), { status: 'pass', reasons: [] }, 'the binding does not pass its own check');
      same(checkAccepted(binding, { current: [{ id: 'v4', treeId: 't1', paramsHash: 'p1' }] }), { status: 'pass', reasons: [] }, 'a current arm equal to the bound one');
    },
  },
  {
    name: 'accept: the receipt\'s own coverage does not define the requirement',
    run() {
      const w = acceptWorld();
      w.write({ observed: ['a'] });
      assert(thrownBy(() => acceptedBinding(w.options)) === 'accept: incomplete (coverage gap b)', `a receipt that declares less: ${thrownBy(() => acceptedBinding(w.options))}`);
      assert(thrownBy(() => acceptedBinding({ ...w.options, receiptPath: rel(join(w.dir, 'absent.json')) })).startsWith('accept: missing receipt '), 'a receipt that does not exist');
    },
  },
  {
    name: 'accept: another producer is refused',
    run() {
      const w = acceptWorld();
      const message = thrownBy(() => acceptedBinding({ ...w.options, harnessHash: 'h2' }));
      assert(message === 'accept: incomplete (producer changed)', `another producer: ${message}`);
    },
  },
  {
    name: 'accept: a historical binding survives later work',
    run() {
      const w = acceptWorld();
      const binding = acceptedBinding(w.options);
      const today = harnessInfo().harnessHash;
      assert(today !== binding.expected.harnessHash, 'today\'s harness hash equals the bound producer');
      const forbidden = ['tests/artifacts/ig-proto/tree-frozen/', 'tools/ig-proto/variants/', 'tools/ig-proto/lib/'];
      /** @type {string[]} */
      const read = [];
      const readFile = (/** @type {string} */ path) => {
        if (forbidden.some((prefix) => path.startsWith(prefix))) {
          throw new Error(`the check read ${path}`);
        }
        read.push(path);
        return readRepoFile(path);
      };
      same(checkAccepted(binding, { current: [], readFile }), { status: 'pass', reasons: [] }, 'the binding does not pass after the harness changed');
      same(read, [rel(w.receiptFile), rel(w.input)], 'the paths the check read: the receipt, then its evidence');
    },
  },
  {
    name: 'accept: changes and stale arms',
    run() {
      const w = acceptWorld();
      const binding = acceptedBinding(w.options);
      const is = (/** @type {any} */ b, /** @type {string} */ reason, /** @type {string} */ label, /** @type {any[]} */ current = []) => {
        same(checkAccepted(b, { current }), { status: 'incomplete', reasons: [reason] }, label);
      };
      appendFileSync(w.input, 'x');
      is(binding, `evidence changed ${rel(w.input)}`, '(a) the input file changed by one byte');
      writeJson(w.input, { input: 1 });
      same(checkAccepted(binding, { current: [] }).status, 'pass', 'the input restored');
      appendFileSync(w.receiptFile, ' ');
      is(binding, `receipt changed ${rel(w.receiptFile)}`, '(b) the receipt changed by one byte');
      w.write();
      is(binding, 'stale arm v4', '(c) another tree', [{ id: 'v4', treeId: 't9', paramsHash: 'p1' }]);
      is(binding, 'stale arm v4', 'another parameter hash', [{ id: 'v4', treeId: 't1', paramsHash: 'p9' }]);
      is(binding, 'unbound arm x', '(d) an arm the binding does not name', [{ id: 'x', treeId: 't1', paramsHash: 'p1' }]);
      is({ ...binding, format: 'other' }, 'not an accepted binding', '(e) another format');
      is({ ...binding, version: 2 }, 'not an accepted binding', 'another version');
      is(null, 'not an accepted binding', 'no binding');
      rmSync(w.receiptFile);
      is(binding, `missing receipt ${rel(w.receiptFile)}`, 'a receipt that is gone');
    },
  },
  {
    name: 'accept: the expectation comes from the captured inputs',
    async run() {
      /** @type {any[]} */
      const calls = [];
      const identity = (/** @type {string} */ harnessHash, /** @type {string} */ treeId) => ({ harnessHash, treeIds: { v4: treeId } });
      const evidenceOf = (/** @type {string} */ task, /** @type {string} */ step, /** @type {string} */ manifestPath, /** @type {unknown} */ _isV4, /** @type {any} */ options) => {
        calls.push([task, step, rel(manifestPath), options]);
        return { identity: identity('h', 'x'), rows: [], problems: /** @type {string[]} */ ([]) };
      };
      const copy = (/** @type {any} */ value) => () => value;
      assert(thrownBy(() => stage1Expectation('V4-T04', evidenceOf, copy({ treeId: 'y', params: {} }))) === 'accept: captured tree v4 differs from the observation (x vs y)', 'a captured tree that differs from the observation');
      calls.length = 0;
      const expectation = stage1Expectation('V4-T04', evidenceOf, copy({ treeId: 'x', params: { W: 2 } }));
      same(calls, [
        ['V4-T04', 'parity', 'tools/ig-proto/plans/V4-T04.parity.json', { historical: true }],
        ['V4-T04', 'replay', 'tools/ig-proto/plans/V4-T04.replay.json', { historical: true }],
      ], 'the steps are read as historical observations, from the declared manifests');
      same([expectation.harnessHash, expectation.arms, expectation.params, expectation.fields],
        ['h', [{ id: 'v4', treeId: 'x', paramsHash: sha256('{"W":2}') }], { v4: { W: 2 } }, { line: 'Stage 1: holds.' }], 'the expectation');
      const ids = ['parity', 'replay'].flatMap((step) => expandManifest(JSON.parse(readFileSync(join(IG_DIR, 'plans', `V4-T04.${step}.json`), 'utf8')), artifactDir('frozen', 'V4-T04', step), (v) => v !== 'base').map((i) => i.id));
      assert(ids.length === 32 && STAGE1_COVERAGE_EXTRA.length === 9, `${ids.length} item ids and ${STAGE1_COVERAGE_EXTRA.length} extra ids, not 32 and 9`);
      same(expectation.coverage, [...ids, ...STAGE1_COVERAGE_EXTRA], 'the coverage: the ids of the two manifests, then the extra ids');
      assert(thrownBy(() => stage1Expectation('V4-T04', evidenceOf, copy(null))) === 'accept: no captured tree metadata for v4', 'no captured tree metadata');
      const withStep = (/** @type {(step: string) => any} */ of) => (/** @type {string} */ _task, /** @type {string} */ step) => ({ rows: [], problems: [], ...of(step) });
      assert(thrownBy(() => stage1Expectation('V4-T04', withStep((step) => (step === 'replay' ? { identity: identity('other', 'x') } : { identity: identity('h', 'x') })), copy({ treeId: 'x', params: {} }))) === 'accept: two producers', 'two producers');
      assert(thrownBy(() => stage1Expectation('V4-T04', withStep((step) => ({ identity: identity('h', step === 'replay' ? 'z' : 'x') })), copy({ treeId: 'x', params: {} }))) === 'accept: two trees for v4', 'two trees for one variant');
      assert(thrownBy(() => stage1Expectation('V4-T04', withStep((step) => ({ identity: identity('h', 'x'), problems: step === 'parity' ? ['no state p'] : [] })), copy({ treeId: 'x', params: {} }))) === 'accept: parity: no state p', 'a problem of a step');
      // `historical` leaves out the comparison with today's trees: a stored id that is not the current tree's is no problem
      const task = 'V4-accept-selftest';
      const root = fresh(artifactDir('selftest', 'accept'));
      const manifestPath = join(root, 'm.json');
      const manifest = { format: 'ig-proto-items', version: 1, task, step: 'parity', rows: [{ kind: 'v4-select', variant: 'v4', caseId: '12x12-nightmare', seedText: 'ig-v4/selftest', modes: ['absent'] }] };
      writeJson(manifestPath, manifest);
      const raw = artifactDir('frozen', task);
      rmSync(raw, { recursive: true, force: true });
      try {
        const dir = join(raw, 'parity');
        mkdirSync(dir, { recursive: true });
        const items = expandManifest(manifest, dir, () => true);
        const stored = { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST, treeIds: { v4: 'old' }, harnessHash: 'h', manifestHash: manifestHash(items) };
        writeJson(join(dir, 'state.json'), { format: 'ig-proto-state', version: 1, task, step: 'parity', label: 'frozen', identity: stored, done: false });
        const hash = identityHash(stored);
        logStart(join(dir, 'items.jsonl'), hash, items[0]);
        logEnd(join(dir, 'items.jsonl'), hash, items[0].id, 'completed', { outcome: 'ok' }, 5);
        const current = stepEvidence(task, 'parity', manifestPath, () => true);
        assert(current.problems.length === 1 && current.problems[0].startsWith('stale tree v4 (old vs '), `the current trees are compared: ${JSON.stringify(current.problems)}`);
        const historical = stepEvidence(task, 'parity', manifestPath, () => true, { historical: true });
        same([historical.problems, historical.identity.treeIds, historical.rows.map((r) => r.status)], [[], { v4: 'old' }, ['completed']], 'a historical observation is read without the current trees');
      } finally {
        rmSync(raw, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'accept: a binding is never rewritten',
    async run() {
      const w = acceptWorld();
      const existing = join(w.dir, 'binding.json');
      writeJson(existing, { keep: true });
      const before = readFileSync(existing);
      const common = ['--by', 'x', '--label', 'frozen', '--source-label', 'x'];
      const refused = await runCheck(['accept', '--task', 'V4-T04', '--receipt', rel(w.receiptFile), '--binding', rel(existing), ...common]);
      assert(refused.code === 1 && refused.err === `v4-check: binding ${rel(existing)} exists (an accepted binding is never rewritten)\n`, `an existing binding: exit ${refused.code}, ${JSON.stringify(refused.err)}`);
      assert(before.equals(readFileSync(existing)), 'the existing binding changed');
      w.write({ kind: 'live-deadline' });
      const unwritten = join(w.dir, 'new-binding.json');
      const kind = await runCheck(['accept', '--task', 'V4-T04', '--receipt', rel(w.receiptFile), '--binding', rel(unwritten), ...common]);
      assert(kind.code === 1 && kind.err === 'v4-check: accept knows the kinds stage1\n' && !existsSync(unwritten), `another kind: exit ${kind.code}, ${JSON.stringify(kind.err)}`);
      const label = await runCheck(['accept', '--task', 'V4-T04', '--receipt', rel(w.receiptFile), '--binding', rel(unwritten), '--by', 'x', '--label', 'selftest', '--source-label', 'x']);
      assert(label.code === 1 && label.err === 'v4-check: --label frozen only\n' && !existsSync(unwritten), `another label: exit ${label.code}, ${JSON.stringify(label.err)}`);
    },
  },
  {
    name: 'accept: the historical namespaces are reserved',
    run() {
      assert(reservedTaskProblem('frozen', 'V4-T04f', true) === 'self-test: V4-T04f is a historical stage-1 record; use another --task', `the state of V4-T04f exists: ${reservedTaskProblem('frozen', 'V4-T04f', true)}`);
      same([reservedTaskProblem('frozen', 'V4-T04f', false), reservedTaskProblem('frozen', 'V4-T04f-verify', true), reservedTaskProblem('provisional', 'V4-T04', true)], [null, null, null],
        'a task without a state, another task and another label');
      same([...HISTORICAL_SELFTEST], stage1Inputs('V4-T04', []).filter((path) => path.endsWith('self-test/state.json')).map((path) => path.split('/').at(-3)), 'the reserved ids are the self-test ids of the stage-1 evidence');
    },
  },
  {
    name: 'accept: evidence-check',
    async run() {
      const w = acceptWorld();
      const check = () => runCheck(['evidence-check', '--receipt', rel(w.receiptFile), '--label', 'frozen', '--source-label', 'x']);
      const same1 = await check();
      assert(same1.code === 0 && same1.out === 'evidence: unchanged (1 files)\n', `an unchanged input: exit ${same1.code}, ${JSON.stringify(same1.out)}`);
      appendFileSync(w.input, 'x');
      const changed = await check();
      assert(changed.code === 2 && changed.out === `evidence: changed ${rel(w.input)}\n`, `a changed input: exit ${changed.code}, ${JSON.stringify(changed.out)}`);
      rmSync(w.input);
      const gone = await check();
      assert(gone.code === 2 && gone.out === `evidence: changed ${rel(w.input)}\n`, `an absent input: exit ${gone.code}, ${JSON.stringify(gone.out)}`);
      const label = await runCheck(['evidence-check', '--receipt', rel(w.receiptFile), '--label', 'selftest', '--source-label', 'x']);
      assert(label.code === 1 && label.err === 'v4-check: --label frozen only\n', `another label: exit ${label.code}`);
    },
  },
  {
    name: 'accept: check-binding',
    async run() {
      const w = acceptWorld();
      const file = join(w.dir, 'binding.json');
      writeJson(file, acceptedBinding(w.options));
      const check = () => runCheck(['check-binding', '--binding', rel(file), '--label', 'frozen', '--source-label', 'x']);
      const good = await check();
      assert(good.code === 0 && good.out === 'binding: pass\n', `a bound receipt: exit ${good.code}, ${JSON.stringify(good.out)}`);
      appendFileSync(w.input, 'x');
      const changed = await check();
      assert(changed.code === 2 && changed.out === `binding: incomplete (evidence changed ${rel(w.input)})\n`, `a changed input: exit ${changed.code}, ${JSON.stringify(changed.out)}`);
      rmSync(file);
      const gone = await check();
      assert(gone.code === 2 && gone.out === `binding: incomplete (missing binding ${rel(file)})\n`, `no binding: exit ${gone.code}, ${JSON.stringify(gone.out)}`);
    },
  },
  {
    name: 'accept: main refuses a reserved id before any write',
    async run() {
      const task = 'V4-reserved-selftest';
      const dir = artifactDir('frozen', task);
      rmSync(dir, { recursive: true, force: true });
      const state = join(artifactDir('frozen', task, 'self-test'), 'state.json');
      try {
        writeJson(state, { format: 'ig-proto-state', marker: 'before' });
        const before = readFileSync(state);
        const argv = ['--label', 'frozen', '--frozen', '--task', task, '--only', '999', '--horizon-s', String(horizonS)];
        const refused = await main(argv, { historical: [task] });
        assert(refused === 3 && readFileSync(state).equals(before), `a reserved id: exit ${refused}, state ${readFileSync(state).equals(before) ? 'kept' : 'rewritten'}`);
        const control = await main(argv, { historical: [] });
        assert(control === 0 && !readFileSync(state).equals(before), `the control: exit ${control}; it must write the state`);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
];

/** @type {number} */
let horizonS = 285;

/** @param {string} dir @returns {any[]} Every journal line of the folder, files in name order. */
function readJournal(dir) {
  return readdirSync(dir).sort().flatMap((n) => readFileSync(join(dir, n), 'utf8').split('\n').filter((l) => l !== '').map((l) => JSON.parse(l)));
}

/** @param {any[]} lines @returns {any[]} The journal without the fields that differ between two runs (at, ms, call). */
function stable(lines) {
  return lines.map((l) => {
    const { at, ms, call, ...rest } = l;
    if (Array.isArray(rest.tuple)) {
      rest.tuple = rest.tuple.map((/** @type {any} */ v, /** @type {number} */ i) => (i === 12 ? 0 : v));
    }
    return rest;
  });
}

/**
 * A synthetic rating (IGP-01 test plan): main work 1 unit, `Gproved` 1 and a complete census unless said otherwise.
 * @param {number} score
 * @param {{ work?: number, Gproved?: number, stop?: string }} [o]
 */
const synthetic = (score, { work = 1, Gproved = 1, stop = 'exhausted' } = {}) => ({
  model: 'difficulty-v3', score, level: 'st', saturated: false,
  metrics: { work, censusWork: 0, nodes: 1, censusNodes: 0, searchStop: stop, Gproved, censusComplete: true },
});

/** The synthetic band of the P1 cases: it sits above Hard's edge, so the AR1 refusal applies. */
const BAND = Object.freeze({ id: 'st-band', min: 55, max: 70, share: 0.3 });

/** @returns {Promise<{ seedText: string, carved: any }>} The first of ig-selftest/proto/k15/0..49 of 10x10-master with 15 pieces. */
async function k15Set() {
  if (memo.k15 === undefined) {
    const { e } = await engine('p1p5-main');
    const entry = caseBoard('10x10-master');
    for (let n = 0; n < 50 && memo.k15 === undefined; n += 1) {
      const seedText = `ig-selftest/proto/k15/${n}`;
      const carved = firstCarvedSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText });
      if (carved.ok && carved.K === 15) {
        memo.k15 = { seedText, carved };
      }
    }
    assert(memo.k15 !== undefined, 'no seed ig-selftest/proto/k15/0 to 49 of 10x10-master carves a set of 15 pieces');
    memo.protoNotes = { ...memo.protoNotes, k15Seed: memo.k15.seedText };
  }
  return memo.k15;
}

/**
 * One call of the prototype on the K = 15 set with synthetic screen and canonical ratings and its journal.
 * @param {string} name
 * @param {{ prior: number | null, screen: (c: number) => any, canon?: (c: number) => any, variant?: string, stage?: string }} spec
 *   A function returns a rating or 'cap' (an IncompleteRatingError); `variant` and `stage` default to p1p5-main and set.
 */
async function protoCall(name, { prior, screen, canon = screen, variant = 'p1p5-main', stage = 'set' }) {
  const { e, ws } = await engine(variant);
  const { carved } = await k15Set();
  const make = (/** @type {(c: number) => any} */ fn) => (/** @type {any[]} */ clues) => {
    const r = fn(clues.length);
    if (r === 'cap') {
      throw new e.difficulty.IncompleteRatingError('synthetic cap', { nodes: 1, work: e.policy.DEDUCE.work, stop: 'work-cap' });
    }
    return r;
  };
  const dir = fresh(join(SELFTEST_DIR, 'logs', `proto-${name}`));
  process.env.IG_LOG_DIR = dir;
  process.env.IG_ROW = `selftest~${name}`;
  let result;
  try {
    result = e.clues.selectClues({
      board: carved.board, pieces: carved.set.pieces, layout: carved.set.witness, target: BAND,
      rng: e.rng.createRng(e.rng.normalizeSeedText('ig-selftest/proto/p1'), `selftest/${name}`), uniqueness: 'any',
      excludeClueKeys: new Set(), ws, igScreen: make(screen), igCanonical: make(canon), igPrior: prior, igStage: stage,
    });
  } finally {
    delete process.env.IG_LOG_DIR;
    delete process.env.IG_ROW;
  }
  const lines = readJournal(dir);
  const tuples = lines.filter((l) => l.t === 'p').map((l) => l.tuple);
  const counts = (/** @type {string} */ phase) => tuples.filter((t) => t[0] === phase).map((t) => t[1]);
  return { result, lines, tuples, counts, end: lines.find((l) => l.t === 'end'), phases: lines.filter((l) => l.t === 'phase').map((l) => l.phase) };
}

const protoCases = [
  {
    name: 'proto: tree, paramFiles, prior and recordedCall guard',
    async run() {
      const main = await ensureTree('p1p5-main');
      const plain = await ensureTree('p1p5');
      const log = await ensureTree('log');
      assert(main.chain.join('>') === 'base>instr>log>p1p5>p1p5-main', `chain ${main.chain.join('>')}`);
      assert(main.copyDigest !== plain.copyDigest || main.treeId !== plain.treeId, 'p1p5 and p1p5-main are not told apart');
      assert(main.copyDigest !== log.copyDigest, 'the prototype copy has the log copy digest');
      const prior = JSON.parse(readFileSync(join(IG_DIR, 'data', 'prior-v1.json'), 'utf8'));
      same(main.params.prior, prior.cells, 'params.prior is not the cells of data/prior-v1.json');
      assert(main.params.W.default === 190000000 && main.params.W['hell-1'] === 380000000 && plain.params.W['hell-1'] === undefined, 'the W parameters of the two manifests');
      assert(readFileSync(join(main.root, 'tools', 'bench', 'report.js'), 'utf8').includes('core/engine/ig-select-proto.js'), "the copy's SOURCE_FILES does not list ig-select-proto.js");
      assert(prior.rule.includes('reps 10-19') && Object.keys(prior.cells).length > 0, 'the prior does not record its rule');
      const root = fresh(join(SELFTEST_DIR, 'param-files'));
      writeFileSync(join(root, 'p.json'), '{"cells":{"a@1":{"share":0.5}}}\n');
      const manifests = { 'st-pf': { id: 'st-pf', extends: ['base'], paramFiles: { prior: 'p.json' } } };
      const a = planTree('st-pf', { manifests, paramRoot: root });
      same(a.params.prior, { 'a@1': { share: 0.5 } }, 'paramFiles did not put the cells under params.prior');
      writeFileSync(join(root, 'p.json'), '{"cells":{"a@1":{"share":0.6}}}\n');
      assert(planTree('st-pf', { manifests, paramRoot: root }).treeId !== a.treeId, 'a changed parameter file did not change the treeId');
      rmSync(root, { recursive: true, force: true });
      for (const variant of ['log', 'p1p5-main']) {
        const { e, ws } = await engine(variant);
        let message = '';
        try {
          recordedCall(e, { set: {}, levelId: 'hard', rng: null, ws });
        } catch (err) {
          message = err instanceof Error ? err.message : String(err);
        }
        assert(message.includes('refuses a tree whose chain includes log'), `recordedCall did not refuse the ${variant} tree: ${message}`);
      }
    },
  },
  {
    name: 'proto: P1 locate, rescue and re-rating order (synthetic)',
    async run() {
      const { nearestFirst } = await import(pathToFileURL(join((await ensureTree('p1p5-main')).root, 'core', 'engine', 'ig-select-proto.js')).href);
      same(
        nearestFirst([{ count: 6, n: 1 }, { count: 8, n: 2 }, { count: 7, n: 3 }, { count: 8, n: 0 }, { count: 6, n: 0 }], 7).map((/** @type {any} */ p) => `${p.count}.${p.n}`),
        ['7.3', '8.0', '8.2', '6.0', '6.1'], 'the re-rating order (distance to wc, higher count, probe order)',
      );
      const down = (/** @type {number} */ c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c));
      const expect = (/** @type {any} */ got, /** @type {any} */ want, /** @type {string} */ what) => same(got, want, `${what}: got ${JSON.stringify(got)}`);

      let r = await protoCall('noprior', { prior: null, screen: down });
      expect(r.counts('locate'), [7, 1, 4], 'no prior: locate probes');
      assert(r.end.locate.hit === 4 && r.end.locate.result === 'hit' && r.end.result === 'ok', `no prior: hit ${JSON.stringify(r.end.locate)}`);
      assert(r.result.ok && r.result.clues.length === 4, 'no prior: the result is not the 4-clue hit');

      r = await protoCall('prior6', { prior: 6, screen: down });
      expect(r.counts('locate'), [6, 5, 3, 4], 'prior 6: locate probes');
      assert(r.end.locate.hit === 4 && r.end.locate.prior === 6, 'prior 6: hit at 4');

      r = await protoCall('overwork', { prior: null, screen: (c) => (c === 7 ? synthetic(30, { work: 190000001, stop: 'work-cap' }) : down(c)) });
      assert(r.tuples[0][2] === 'scap1', `a rating above W is not scap1: ${r.tuples[0][2]}`);
      expect(r.counts('locate').slice(0, 2), [7, 13], 'main work above W counts as above (the march goes up)');

      r = await protoCall('ar1in', { prior: null, screen: (c) => (c === 4 ? synthetic(60, { Gproved: 0 }) : down(c)) });
      expect(r.counts('locate'), [7, 1, 4], 'AR1-refused in band: locate probes');
      assert(r.tuples.find((t) => t[1] === 4)[2] === 'ar1' && r.end.locate.result === 'hit' && r.end.locate.hit === 4, 'AR1-refused in band is a window hit');
      assert(r.result.ok === false && r.end.accepted === null && r.end.result !== 'ok', 'an AR1-refused probe was accepted');

      r = await protoCall('below1', { prior: null, screen: () => synthetic(30) });
      expect(r.counts('locate'), [7, 1], 'all below: locate probes');
      assert(r.end.result === 'no-window' && r.end.locate.result === 'below-to-one' && r.end.locate.noWindowProof === 'canonical', `all below: ${JSON.stringify(r.end.locate)}`);
      assert(r.result.ok === false && r.result.reason === 'not-in-band' && !r.phases.includes('window'), 'all below: the call did not end at once');

      const capAll = () => 'cap';
      r = await protoCall('confirmed', { prior: null, screen: capAll, canon: () => synthetic(90) });
      expect(r.counts('locate'), [7, 13], 'confirmed: locate probes');
      expect(r.counts('rescue'), [13, 7], 'confirmed: rescue order');
      assert(r.end.result === 'no-window' && r.end.locate.noWindowProof === 'confirmed' && r.end.rerates === 2, `confirmed: ${JSON.stringify(r.end.locate)}`);
      expect(r.end.locate.rescue.map((/** @type {any} */ x) => `${x.count}:${x.side}`), ['13:above', '7:above'], 'confirmed: rescue sides');

      r = await protoCall('heuristic', { prior: 2, screen: capAll, canon: () => synthetic(90) });
      expect(r.counts('locate'), [2, 3, 5, 9, 13], 'heuristic: locate probes');
      expect(r.counts('rescue'), [13, 9, 5, 3], 'heuristic: rescue order (rerateMax 4, count 2 stays)');
      assert(r.end.result === 'no-window' && r.end.locate.noWindowProof === 'heuristic' && r.end.rerates === 4 && r.counts('rerate').length === 0, `heuristic: ${JSON.stringify(r.end.locate)}`);

      r = await protoCall('rebracketed', { prior: null, screen: capAll, canon: (c) => synthetic(100 - 10 * c) });
      expect(r.counts('locate'), [7, 13, 1, 4, 5, 6], 'rebracketed: locate probes');
      expect(r.counts('rescue'), [13, 7], 'rebracketed: rescue order');
      const loc = r.end.locate;
      assert(loc.result === 'window' && loc.hiBelow === 7 && loc.loAbove === 6 && loc.wc === 7 && loc.noWindowProof === 'rebracketed', `rebracketed: ${JSON.stringify(loc)}`);
      assert(r.phases.includes('window'), 'rebracketed: the call did not go on to phase B');
      assert(r.counts('rescue').length + r.counts('rerate').length <= 4 && r.counts('rerate').length <= 2 && r.end.rerates <= 4, 'rebracketed: phase E exceeded the shared allowance');
      assert(r.counts('rerate').length === 2, `rebracketed: phase E re-rated ${r.counts('rerate').length}, expected the two the allowance leaves`);

      r = await protoCall('rescuedin', { prior: null, screen: capAll, canon: (c) => synthetic(c === 13 ? 60 : 90) });
      expect(r.counts('rescue'), [13, 7], 'rescued in: the rescue re-rates 13 first, then 7, and the call finishes on the 13-clue candidate');
      assert(r.end.locate.noWindowProof === 'rescued-in' && r.end.result === 'ok' && r.end.clueCount === 13 && r.end.rerates === 2, `rescued in: ${JSON.stringify(r.end.locate)} ${r.end.result}`);

      r = await protoCall('rescuedrefused', { prior: null, screen: capAll, canon: (c) => (c === 13 ? synthetic(60, { Gproved: 0 }) : synthetic(90)) });
      expect(r.counts('rescue'), [13, 7], 'rescued in, refused: rescue order');
      assert(r.tuples.find((t) => t[0] === 'rescue')[2] === 'ar1', 'rescued in, refused: the re-rating is not an AR1 refusal');
      assert(r.end.locate.noWindowProof === 'rescued-in' && r.end.locate.hit === 13 && r.end.locate.noWindowProof !== 'confirmed', 'rescued in, refused: not a window hit at 13');
      assert(r.phases.includes('window') && r.phases.includes('p2'), 'rescued in, refused: no phase B or no dead end (a refusal is no candidate)');
      assert(r.result.ok === false && r.end.accepted === null, 'rescued in, refused: a refused rating was accepted');
      assert(r.counts('rescue').length + r.counts('rerate').length === r.end.rerates && r.end.rerates <= 4, 'rescued in, refused: the allowance is not shared');
    },
  },
  {
    name: 'proto: P2 canonical at the cap, repeatable',
    async run() {
      const { e, ws } = await engine('p1p5-main');
      const entry = caseBoard('10x10-hard');
      const seedText = 'ig-selftest/proto/p2';
      const carved = firstCarvedSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText });
      assert(carved.ok, 'the carve of the P2 set failed');
      const c = /** @type {any} */ (carved);
      /** @type {any[]} */
      const journals = [];
      /** @type {any[]} */
      const results = [];
      for (const run of [1, 2]) {
        const dir = fresh(join(SELFTEST_DIR, 'logs', `proto-p2-${run}`));
        process.env.IG_LOG_DIR = dir;
        process.env.IG_ROW = 'selftest~p2';
        try {
          results.push(e.clues.selectClues({
            board: c.board, pieces: c.set.pieces, layout: c.set.witness, target: e.levels.level(entry.levelId),
            rng: e.rng.createRng(e.rng.normalizeSeedText(seedText), 'selftest/p2'), uniqueness: 'any', excludeClueKeys: new Set(), ws,
            igW: e.policy.DEDUCE.work, igStage: 'set',
          }));
        } finally {
          delete process.env.IG_LOG_DIR;
          delete process.env.IG_ROW;
        }
        journals.push(stable(readJournal(dir)));
      }
      assert(results[0].ok, `the P2 call found no puzzle: ${results[0].reason}`);
      same(results[0].rating, e.difficulty.rate(c.board, c.set.pieces, results[0].clues, ws), 'the result rating is not rate() of its clues');
      same(results[0], results[1], 'two runs of one seed gave different results');
      same(journals[0], journals[1], 'two runs of one seed gave different journals (at, ms and the call id aside)');
      assert(journals[0].every((l) => l.t !== 'start' || l.W === e.policy.DEDUCE.work), 'the start line does not record W');
    },
  },
  {
    name: 'proto: P3 screen on a real 12x12 Nightmare set, and the prior',
    async run() {
      const { e, ws } = await engine('p1p5-main');
      const entry = caseBoard('12x12-nightmare');
      const seedText = 'ig-selftest/proto/n';
      const carved = firstCarvedSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText });
      assert(carved.ok, 'the carve of the 12x12 Nightmare set failed');
      const c = /** @type {any} */ (carved);
      const cell = JSON.parse(readFileSync(join(IG_DIR, 'data', 'prior-v1.json'), 'utf8')).cells['nightmare@144'];
      const wantPrior = Math.min(c.K - 2, Math.max(1, Math.round(cell.share * c.K)));
      let ok = 0;
      for (let n = 0; n < 3 && (n === 0 || elapsedS() + 150 < horizonS); n += 1) {
        const dir = fresh(join(SELFTEST_DIR, 'logs', `proto-n${n}`));
        process.env.IG_LOG_DIR = dir;
        process.env.IG_ROW = 'selftest~n';
        let res;
        try {
          res = e.clues.selectClues({
            board: c.board, pieces: c.set.pieces, layout: c.set.witness, target: e.levels.level(entry.levelId),
            rng: e.rng.createRng(e.rng.normalizeSeedText(seedText), `selftest/n/${n}`), uniqueness: 'any', excludeClueKeys: new Set(), ws, igStage: 'set',
          });
        } finally {
          delete process.env.IG_LOG_DIR;
          delete process.env.IG_ROW;
        }
        const lines = readJournal(dir);
        const start = lines.find((l) => l.t === 'start');
        assert(start.W === 190000000 && start.priorCount === wantPrior, `start line: W ${start.W}, priorCount ${start.priorCount}, expected ${wantPrior}`);
        if (res.ok) {
          ok += 1;
          same(res.rating, e.difficulty.rate(c.board, c.set.pieces, res.clues, ws), 'an ok result rating is not its canonical rating');
        }
        if (ok > 0) {
          break;
        }
      }
      memo.protoNotes = { ...memo.protoNotes, nightmareOkResults: ok };
    },
  },
  {
    name: 'proto: IGP-03 variants (W values, a3 flag) and the no-screen journal',
    async run() {
      const { e } = await engine('p1p5-main');
      const work = e.policy.DEDUCE.work;
      const [w095, w380, w760, a3] = [await ensureTree('p1p5-w095'), await ensureTree('p1p5-w380'), await ensureTree('p1p5-w760'), await ensureTree('p1p5-main-a3')];
      assert(w095.params.W.default === 95000000 && w380.params.W.default === 380000000, 'the W parameters of the 95 M and 380 M manifests');
      assert(w760.params.W.default === work && w760.params.W['hell-1'] === undefined, `p1p5-w760 W is not the canonical limit ${work}`);
      assert(a3.params.a3 === true && a3.params.W['hell-1'] === 380000000 && a3.chain.join('>') === 'base>instr>log>p1p5>p1p5-main>p1p5-main-a3', `p1p5-main-a3: ${JSON.stringify(a3.params.W)} ${a3.chain.join('>')}`);
      assert([w095, w380, w760].every((t) => t.params.a3 === false && t.params.rerate === 'end'), 'a W variant changes a3 or rerate');
      const down = (/** @type {number} */ c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c));
      const r = await protoCall('w760', { variant: 'p1p5-w760', prior: null, screen: down });
      const start = r.lines.find((/** @type {any} */ l) => l.t === 'start');
      assert(start.W === work && start.variant === 'p1p5-w760', `w760 start line: ${JSON.stringify(start)}`);
      assert(r.tuples.find((/** @type {any} */ t) => t[1] === 1)[2] === 'capped', 'w760: a capped probe is not journaled capped');
      assert(r.tuples.every((/** @type {any} */ t) => !['scap0', 'scap1', 'over'].includes(t[2])) && r.end.rerates === 0 && r.end.result === 'ok', 'w760: a screen outcome, a re-rating or no result');
    },
  },
  {
    name: 'proto: arity-3 set stage (synthetic) and the window re-rating guard',
    async run() {
      const expect = (/** @type {any} */ got, /** @type {any} */ want, /** @type {string} */ what) => same(got, want, `${what}: got ${JSON.stringify(got)}`);
      const a3 = { variant: 'p1p5-main-a3', prior: null };
      const down = (/** @type {number} */ c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c));
      const sides = (/** @type {any} */ round) => round.probes.map((/** @type {any} */ p) => `${p.count}:${p.side}`);

      let r = await protoCall('a3-hit', { ...a3, screen: down });
      expect(r.counts('locate'), [7, 1], 'a3: the gallop stays sequential');
      expect(r.counts('locate-a3'), [4, 2, 5], 'a3: the first round (g = 6 between 1 and 7: middle, lower, upper)');
      const loc = r.end.locate;
      assert(r.end.result === 'ok' && r.end.clueCount === 4 && loc.hit === 4 && loc.result === 'hit' && loc.probes === 5, `a3: ${JSON.stringify(loc)}`);
      expect(sides(loc.rounds[0]), ['4:in', '2:above', '5:below'], 'a3: the two other probes are journaled as rated');
      assert(loc.rounds.length === 1 && loc.rounds[0].consumed === 1, 'a3: the hit at the middle probe consumes one probe of the round');
      const ms = loc.rounds[0].probes.map((/** @type {any} */ p) => p.ms);
      assert(Math.abs(loc.rounds[0].serialMs - ms.reduce((/** @type {number} */ s, /** @type {number} */ x) => s + x, 0)) < 0.01 && loc.rounds[0].criticalMs === Math.max(...ms), 'a3: serial and critical ms of the round');

      r = await protoCall('a3-two', { ...a3, screen: (c) => (c <= 2 ? 'cap' : synthetic(120 - 10 * c)) });
      expect(r.counts('locate-a3'), [4, 2, 5, 6], 'a3: no hit in round 1 (all above): the bracket moves to (5, 7) and round 2 probes 6');
      assert(r.end.result === 'ok' && r.end.clueCount === 6 && r.end.locate.rounds.length === 2 && r.end.locate.rounds[0].consumed === 3, `a3 two rounds: ${JSON.stringify(r.end.locate.rounds)}`);

      const curve = /** @type {Record<number, any>} */ ({ 7: synthetic(30), 1: 'cap', 4: synthetic(40), 2: 'cap', 5: synthetic(90), 3: synthetic(60) });
      r = await protoCall('a3-cross', { ...a3, screen: (c) => curve[c] });
      expect(r.counts('locate-a3'), [4, 2, 5, 2, 3], 'a3: crossing results keep the middle probe side (below 4): round 2 probes 2 (a repeat takes a sample) and 3');
      expect(sides(r.end.locate.rounds[0]), ['4:below', '2:above', '5:above'], 'a3 crossing: the sides of round 1');
      assert(r.end.result === 'ok' && r.end.clueCount === 3, `a3 crossing: ${r.end.result} ${r.end.clueCount}`);

      r = await protoCall('a3-batch', { ...a3, stage: 'batch', screen: down });
      expect(r.counts('locate'), [7, 1, 4], 'a3 on, stage batch: the path is IGP-01\'s');
      assert(r.counts('locate-a3').length === 0 && r.end.locate.rounds === undefined && r.end.clueCount === 4, 'a3 on, stage batch: an arity-3 round ran');

      const dest = join(SELFTEST_DIR, 'tree-rerate');
      const manifests = { 'st-rerate': { id: 'st-rerate', extends: ['p1p5'], description: 'self-test: rerate other than end', edits: [], files: [], params: { rerate: 'window' } } };
      const tree = await buildTree('st-rerate', { manifests, dest, sourceLabel: 'self-test' });
      const e = await loadEngine(tree.root);
      const ws = e.workspace.createWorkspace(e.workspace.MAIN_WORKSPACE_BYTES);
      const entry = caseBoard('10x10-master');
      const carved = /** @type {any} */ (firstCarvedSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText: (await k15Set()).seedText }));
      assert(carved.ok, 'the carve of the guard set failed');
      let message = '';
      try {
        e.clues.selectClues({
          board: carved.board, pieces: carved.set.pieces, layout: carved.set.witness, target: BAND,
          rng: e.rng.createRng(e.rng.normalizeSeedText('ig-selftest/proto/p1'), 'selftest/guard'), uniqueness: 'any',
          excludeClueKeys: new Set(), ws, igStage: 'set',
        });
      } catch (err) {
        message = err instanceof Error ? err.message : String(err);
      }
      assert(message.includes('window re-rating variant is deferred'), `rerate other than end did not throw: ${message}`);
    },
  },
];

/**
 * One `selectClues` call of a variant on the first carved set of a seed, with every rating the search saw.
 * @param {string} variant
 * @param {string} caseId
 * @param {string} seedText
 * @param {'any' | 'require'} uniqueness
 * @param {Record<string, unknown>} [extra] More context fields (a rating seam).
 */
async function p6Call(variant, caseId, seedText, uniqueness, extra = {}) {
  const x = await engine(variant);
  const entry = caseBoard(caseId);
  const carved = /** @type {any} */ (firstCarvedSet(x.e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText }));
  assert(carved.ok, `the carve of ${seedText} failed`);
  /** @type {any[]} */
  const seen = [];
  /** @type {any} */
  let result = null;
  /** @type {any} */
  let error = null;
  try {
    result = x.e.clues.selectClues({
      board: carved.board, pieces: carved.set.pieces, layout: carved.set.witness, target: x.e.levels.level(entry.levelId), rng: carved.calRng,
      uniqueness, excludeClueKeys: new Set(), ws: x.ws, onRate: (/** @type {any} */ _clues, /** @type {any} */ rating) => seen.push(rating), ...extra,
    });
  } catch (e) {
    error = e;
  }
  return { result, error, seen, skipAfter: x.e.difficulty.igDlx?.skip };
}

const P6_CALLS = /** @type {[string, string, 'any' | 'require'][]} */ ([
  ['10x10-easy', 'ig-selftest/sets/0', 'any'], ['10x10-easy', 'ig-selftest/sets/1', 'require'],
  ['10x10-hard', 'ig-selftest/instr/0', 'any'], ['10x10-hard', 'ig-selftest/instr/1', 'require'],
]);

const p6Cases = [
  {
    name: 'p6: trees, the switch and the width edit',
    async run() {
      const [log, p6, p6w8, main, mainP6] = [await ensureTree('log'), await ensureTree('log-p6'), await ensureTree('log-p6-w8'), await ensureTree('p1p5-main'), await ensureTree('p1p5-main-p6-w8')];
      assert(p6.chain.join('>') === 'base>instr>log>p6>log-p6' && p6.params.p6 === true && p6.params.logAccepted === true, `log-p6: ${p6.chain.join('>')} ${JSON.stringify(p6.params)}`);
      assert(log.params.p6 === false && main.params.p6 === false, 'a tree without p6 in the chain has p6 on');
      assert(p6w8.chain.join('>') === 'base>instr>log>p6>w8>log-p6-w8', `log-p6-w8: ${p6w8.chain.join('>')}`);
      assert(mainP6.chain.join('>') === 'base>instr>log>p1p5>p1p5-main>p6>w8>p1p5-main-p6-w8' && mainP6.params.p6 === true && mainP6.params.W['hell-1'] === 380000000 && mainP6.params.a3 === false, `p1p5-main-p6-w8: ${mainP6.chain.join('>')}`);
      const pool = (/** @type {any} */ tree) => readFileSync(join(tree.root, 'core', 'browser', 'worker-pool.js'), 'utf8');
      assert(pool(p6w8).includes('export const MAX_POOL_SIZE = 8;') && pool(mainP6).includes('export const MAX_POOL_SIZE = 8;'), 'a w8 tree keeps MAX_POOL_SIZE 4');
      assert(pool(p6).includes('export const MAX_POOL_SIZE = 4;') && pool(main).includes('export const MAX_POOL_SIZE = 4;'), 'a tree without w8 changes MAX_POOL_SIZE');
      const difficulty = async (/** @type {string} */ v) => (await engine(v)).e.difficulty;
      assert((await difficulty('base')).igDlx === undefined && (await difficulty('log')).igDlx === undefined && (await difficulty('p1p5-main')).igDlx === undefined, 'a tree without p6 has igDlx');
      same((await difficulty('log-p6')).igDlx, { skip: false }, 'igDlx of log-p6 at rest');
    },
  },
  {
    name: 'p6: a log-p6 call equals the log call; the diagnostic is skipped inside and restored',
    async run() {
      let skipped = 0;
      let calls = 0;
      let ok = 0;
      for (const [caseId, seedText, uniqueness] of P6_CALLS) {
        /** @type {boolean[]} */
        const during = [];
        const e6 = (await engine('log-p6')).e;
        const a = await p6Call('log', caseId, seedText, uniqueness);
        const b = await p6Call('log-p6', caseId, seedText, uniqueness, { rate: (/** @type {any} */ ...args) => {
          during.push(e6.difficulty.igDlx.skip);
          return e6.difficulty.rate(...args);
        } });
        assert(a.error === null && b.error === null, `a call threw: ${a.error ?? b.error}`);
        same(b.result, a.result, `the log-p6 call differs from the log call (${caseId} ${seedText}, ${uniqueness})`);
        assert(a.seen.length > 0 && a.seen.length === b.seen.length, `the calls saw ${a.seen.length} and ${b.seen.length} ratings`);
        assert(a.seen.every((r) => r.metrics.U === 0 || r.metrics.rowTrials > 0), 'a canonical rating without a diagnostic');
        assert(b.seen.every((r) => r.metrics.U === 0 || (r.metrics.rowTrials === 0 && r.metrics.branchTrials === 0)), 'a rating of the log-p6 search carries the diagnostic');
        assert(during.length > 0 && during.every((s) => s === true), 'the diagnostic was not skipped inside the search');
        assert(b.skipAfter === false, 'igDlx.skip was not restored after the call');
        skipped += b.seen.length;
        calls += 1;
        ok += b.result.ok ? 1 : 0;
      }
      assert(ok > 0, 'no call of the corpus returned a result: nothing was compared');
      memo.p6Notes = { ...memo.p6Notes, logCalls: calls, ratingsWithoutDiagnostic: skipped, okResults: ok };

      const e6 = (await engine('log-p6')).e;
      let message = '';
      const thrown = await p6Call('log-p6', '10x10-easy', 'ig-selftest/sets/0', 'any', { rate: () => {
        throw new Error('st-p6-throw');
      } });
      message = thrown.error instanceof Error ? thrown.error.message : '';
      assert(message === 'st-p6-throw' && thrown.skipAfter === false && e6.difficulty.igDlx.skip === false, `a search that throws left the switch on or hid the error: ${message}`);

      const items = await corpus();
      const item = items[0];
      const base = (await engine('base')).e.difficulty.rate(item.board, item.pieces, item.clues, (await engine('base')).ws);
      same(e6.difficulty.rate(item.board, item.pieces, item.clues, (await engine('log-p6')).ws), base, 'a rate task after a log-p6 call differs from the canonical rating');
    },
  },
  {
    name: 'p6: the journal of a log-p6 call and the prototype with P6',
    async run() {
      let journal = null;
      for (const [n, [caseId, seedText]] of P6_CALLS.filter(([, , u]) => u === 'any').entries()) {
        const dir = fresh(join(SELFTEST_DIR, 'logs', `p6-${n}`));
        process.env.IG_LOG_DIR = dir;
        process.env.IG_ROW = `selftest~p6-${n}`;
        /** @type {any} */
        let a;
        /** @type {any} */
        let b;
        try {
          a = await p6Call('log', caseId, seedText, 'any');
          b = await p6Call('log-p6', caseId, seedText, 'any');
        } finally {
          delete process.env.IG_LOG_DIR;
          delete process.env.IG_ROW;
        }
        if (a.result?.ok === true) {
          journal = { a, b, lines: readJournal(dir) };
          break;
        }
      }
      assert(journal !== null, 'no call of the corpus returned a result: the journal was not checked');
      const { a, b, lines } = journal;
      const ends = lines.filter((l) => l.t === 'end');
      assert(ends.length === 2 && ends.every((l) => l.result === 'ok'), `journal ends: ${ends.map((l) => l.result).join(',')}`);
      const [endLog, endP6] = ends;
      assert(endLog.p6Ms === undefined && typeof endP6.p6Ms === 'number' && endP6.p6Ms >= 0, `p6Ms on the end lines: ${endLog.p6Ms} and ${endP6.p6Ms}`);
      same(endP6.accepted.rating, JSON.parse(JSON.stringify(b.result.rating)), 'the accepted block of the log-p6 call is not the completed rating');
      same(b.result.rating, a.result.rating, 'the completed rating differs from the log call\'s');
      const probes = (/** @type {any} */ end) => stable(lines.filter((l) => l.t === 'p' && l.call === end.call));
      assert(probes(endLog).length > 0, 'the log call has no probe lines');
      same(probes(endP6), probes(endLog), 'the probe lines of the two calls differ (only the times may)');

      // The prototype with P6 returns the result of the prototype, with the diagnostic back.
      let proto = 0;
      for (const [caseId, seedText, uniqueness] of P6_CALLS) {
        const p = await p6Call('p1p5-main', caseId, seedText, uniqueness);
        const q = await p6Call('p1p5-main-p6-w8', caseId, seedText, uniqueness);
        assert(p.error === null && q.error === null, `a prototype call threw: ${p.error ?? q.error}`);
        same(q.result, p.result, `the prototype with P6 differs from the prototype (${caseId} ${seedText}, ${uniqueness})`);
        assert(q.seen.length === p.seen.length && q.skipAfter === false, `prototype ratings ${p.seen.length} and ${q.seen.length}; switch ${q.skipAfter}`);
        assert(q.seen.every((r) => r.metrics.U === 0 || r.metrics.rowTrials === 0), 'a rating of the prototype with P6 carries the diagnostic');
        proto += q.result.ok ? 1 : 0;
      }
      memo.p6Notes = { ...memo.p6Notes, prototypeOkResults: proto, prototypeCalls: P6_CALLS.length };
    },
  },
];

/**
 * One call of the gen-v4 prototype on the K = 15 set with synthetic screen and canonical ratings and its journal: a
 * copy of `protoCall` whose default variant is `v4` (the tree's `selectClues` sends BAND, min 55, to `selectCluesV4`).
 * @param {string} name
 * @param {{ prior: number | null, screen: (c: number) => any, canon?: (c: number) => any, variant?: string,
 *   stage?: string, uniqueness?: 'any' | 'require', journal?: boolean }} spec
 *   A function returns a rating or 'cap' (an IncompleteRatingError); `variant` and `stage` default to v4 and set;
 *   `uniqueness` (default 'any') is the context's; with `journal: false` (default true) the fresh folder is made as
 *   before but `IG_LOG_DIR` and `IG_ROW` are unset, so the call writes no journal.
 * @returns {Promise<{ result: any, lines: any[], tuples: any[], counts: (phase: string) => number[], end: any,
 *   phases: string[], files: string[] }>} `files` are the journal files written.
 */
async function v4Call(name, {
  prior, screen, canon = screen, variant = 'v4', stage = 'set', uniqueness = 'any', journal = true,
}) {
  const { e, ws } = await engine(variant);
  const { carved } = await k15Set();
  const make = (/** @type {(c: number) => any} */ fn) => (/** @type {any[]} */ clues) => {
    const r = fn(clues.length);
    if (r === 'cap') {
      throw new e.difficulty.IncompleteRatingError('synthetic cap', { nodes: 1, work: e.policy.DEDUCE.work, stop: 'work-cap' });
    }
    return r;
  };
  const dir = fresh(join(SELFTEST_DIR, 'logs', `v4-${name}`));
  if (journal) {
    process.env.IG_LOG_DIR = dir;
    process.env.IG_ROW = `selftest~v4-${name}`;
  } else {
    delete process.env.IG_LOG_DIR;
    delete process.env.IG_ROW;
  }
  let result;
  try {
    result = e.clues.selectClues({
      board: carved.board, pieces: carved.set.pieces, layout: carved.set.witness, target: BAND,
      rng: e.rng.createRng(e.rng.normalizeSeedText('ig-selftest/proto/p1'), `selftest/${name}`), uniqueness,
      excludeClueKeys: new Set(), ws, igScreen: make(screen), igCanonical: make(canon), igPrior: prior, igStage: stage,
    });
  } finally {
    delete process.env.IG_LOG_DIR;
    delete process.env.IG_ROW;
  }
  const lines = readJournal(dir);
  const tuples = lines.filter((l) => l.t === 'p').map((l) => l.tuple);
  const counts = (/** @type {string} */ phase) => tuples.filter((t) => t[0] === phase).map((t) => t[1]);
  return {
    result, lines, tuples, counts, end: lines.find((l) => l.t === 'end'), phases: lines.filter((l) => l.t === 'phase').map((l) => l.phase),
    files: readdirSync(dir),
  };
}

/**
 * The `SelectContext` of one call of the gen-v4 prototype on the K = 15 set (the context `v4Call` builds), with a
 * fresh rng of the seed `ig-selftest/v4/<name>`; `extra` adds or replaces fields.
 * @param {any} e
 * @param {any} ws
 * @param {string} name
 * @param {Record<string, any>} [extra]
 * @returns {Promise<any>}
 */
async function v4Ctx(e, ws, name, extra = {}) {
  const { carved } = await k15Set();
  return {
    board: carved.board, pieces: carved.set.pieces, layout: carved.set.witness, target: BAND,
    rng: e.rng.createRng(e.rng.normalizeSeedText(`ig-selftest/v4/${name}`), `selftest/${name}`), uniqueness: 'any',
    excludeClueKeys: new Set(), ws, igStage: 'set', ...extra,
  };
}

/**
 * A module of a tree's `core/engine/` by file URL (module identity stays inside the tree).
 * @param {{ e: any }} tree An entry of `engine()`.
 * @param {string} name The file name without `.js`.
 * @returns {Promise<any>}
 */
function treeModule(tree, name) {
  return import(pathToFileURL(join(tree.e.root, 'core', 'engine', `${name}.js`)).href);
}

/** @returns {any} The replay fixture of `tests/fixtures/replay-case.json` (read, never written), parsed once. */
function replayFixture() {
  memo.replayFixture ??= JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'replay-case.json'), 'utf8'));
  return memo.replayFixture;
}

/**
 * The input of `runReplay` for one puzzle of a fixture pack, as `fixtureInputs()` of `tests/replay.test.js` builds it
 * (`setOfPack` included), with the pack reader and the board reader of the tree.
 * @param {{ e: any, tree: any }} tree An entry of `engine()`.
 * @param {number} packIndex
 * @param {number} puzzleIndex
 * @returns {Promise<{ set: any, puzzle: any, generation: any }>}
 */
async function fixtureInput(tree, packIndex, puzzleIndex) {
  const { validatePack } = await treeModule(tree, 'pack');
  const read = validatePack(replayFixture().packs[packIndex]);
  assert(read.ok === true, `the fixture pack ${packIndex} is not valid for the ${tree.tree.variant} tree`);
  const pack = read.value;
  const set = {
    board: tree.e.board.boardFromRows(pack.board.rows),
    pieces: pack.pieces,
    witness: pack.witness ?? null,
    carving: pack.generation.carving,
    macroRegion: pack.generation.macroRegion,
  };
  return { set, puzzle: pack.puzzles[puzzleIndex], generation: pack.generation };
}

/**
 * A `made` entry in the shape of a gen-v4 record: for a candidate, a new object with the keys of the reader's
 * `MADE_CANDIDATE_KEYS_V4`, `igPrior: null` after `skips` and `versions` replaced; other kinds are returned unchanged.
 * @param {any} made
 * @param {Record<string, string>} versions
 * @returns {any}
 */
function asV4(made, versions) {
  if (made.kind !== 'candidate') {
    return made;
  }
  return {
    schema: made.schema, kind: made.kind, batchSeed: made.batchSeed, targetLevel: made.targetLevel,
    uniqueness: made.uniqueness, slot: made.slot, attempt: made.attempt, start: made.start,
    skips: structuredClone(made.skips), igPrior: null, versions: { ...versions },
  };
}

/**
 * A deep copy of a `generation` object whose `setOrigin` and candidate entries carry `versions`.
 * @param {any} generation
 * @param {Record<string, string>} versions
 * @returns {any}
 */
function v4Generation(generation, versions) {
  const copy = structuredClone(generation);
  copy.setOrigin.versions = { ...versions };
  for (const id of Object.keys(copy.made)) {
    copy.made[id] = asV4(copy.made[id], versions);
  }
  return copy;
}

/** An `isCancelled` that fails the test when the replay reaches its first metered unit. */
const cancelTrap = () => {
  throw new Error('isCancelled was reached');
};

/**
 * A synthetic rating seam (`igScreen`, `igCanonical`) from a count function that returns a rating or 'cap' (thrown as
 * the tree's IncompleteRatingError).
 * @param {any} e
 * @param {(c: number) => any} fn
 * @returns {(clues: any[]) => any}
 */
function synth(e, fn) {
  return (clues) => {
    const r = fn(clues.length);
    if (r === 'cap') {
      throw new e.difficulty.IncompleteRatingError('synthetic cap', { nodes: 1, work: e.policy.DEDUCE.work, stop: 'work-cap' });
    }
    return r;
  };
}

/** Every screened probe is capped and the canonical rating falls with the count: the bracket closes after the rescue. */
const REBRACKETED = { screen: () => 'cap', canon: (/** @type {number} */ c) => synthetic(100 - 10 * c) };
/** Counts of up to two clues are capped, the others fall by 10 per clue: the locate hits at 4 clues. */
const DOWN = (/** @type {number} */ c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c));

/**
 * V4-T02d's first call: screen-capped probes, re-ratings and a real repair with counts (the canonical rating of every
 * count above 3 is central, so the rescue finishes the call on a repaired set).
 * @type {{ prior: null, screen: () => string, canon: (c: number) => any, uniqueness: 'require' }}
 */
const BEGIN_CALL = {
  prior: null, screen: () => 'cap', canon: (c) => synthetic(c <= 3 ? 100 - 10 * c : 60), uniqueness: 'require',
};
/**
 * V4-T02d's second call (T07a's `S2`): the 4-clue rating 56 is in the band 55 to 70 but not central, so the call goes
 * on to the window and the beam.
 * @type {{ prior: null, screen: (c: number) => any, canon: (c: number) => any, uniqueness: 'require' }}
 */
const BEGIN_CALL_2 = {
  prior: null,
  screen: (c) => synthetic(c === 4 ? 56 : 100 - 10 * c),
  canon: (c) => synthetic(c === 4 ? 56 : 100 - 10 * c),
  uniqueness: 'require',
};

/**
 * Runs one call with a fresh journal folder, as `v4Call` does; a thrown error is returned, not thrown.
 * @param {string} name
 * @param {() => any} fn
 * @returns {{ result: any, error: unknown, lines: any[] }}
 */
function journaled(name, fn) {
  const dir = fresh(join(SELFTEST_DIR, 'logs', `v4-${name}`));
  process.env.IG_LOG_DIR = dir;
  process.env.IG_ROW = `selftest~v4-${name}`;
  let result;
  let error = null;
  try {
    result = fn();
  } catch (caught) {
    error = caught;
  } finally {
    delete process.env.IG_LOG_DIR;
    delete process.env.IG_ROW;
  }
  return { result, error, lines: readJournal(dir) };
}

const v4Cases = [
  {
    name: 'v4: tree, dispatch and bounds',
    async run() {
      const ids = ['v4', 'v4-w760', 'v4-w095', 'v4-w380'];
      const wanted = { v4: 190000000, 'v4-w760': 760000000, 'v4-w095': 95000000, 'v4-w380': 380000000 };
      /** @type {Record<string, any>} */
      const trees = {};
      for (const id of ids) {
        trees[id] = await ensureTree(id);
        assert(trees[id].params.W.default === /** @type {Record<string, number>} */ (wanted)[id], `${id}: W.default ${trees[id].params.W.default}`);
      }
      assert(trees.v4.chain.join('>') === 'base>instr>log>v4', `chain ${trees.v4.chain.join('>')}`);
      const { root } = trees.v4;
      const { e } = await engine('v4');
      const v4 = await import(pathToFileURL(join(root, 'core', 'engine', 'ig-select-v4.js')).href);
      assert(v4.SKIP_BOUNDS_V4.subsets === e.clues.SKIP_BOUNDS.subsets + 64, `subset bound ${v4.SKIP_BOUNDS_V4.subsets} against ${e.clues.SKIP_BOUNDS.subsets}`);
      assert(v4.SKIP_BOUNDS_V4.repairs === e.clues.SKIP_BOUNDS.repairs, `repair bound ${v4.SKIP_BOUNDS_V4.repairs} against ${e.clues.SKIP_BOUNDS.repairs}`);
      for (const [min, want] of [[52, false], [53, true], [55, true], [77, true], [111, true], [112, false], [162, false]]) {
        assert(v4.v4Target({ min }) === want, `v4Target({ min: ${min} }) is ${!want}`);
      }
      assert(typeof e.difficulty.igRateDetailedWithLimits === 'function', 'the copy of difficulty.js has no igRateDetailedWithLimits');
      const clues = readFileSync(join(root, 'core', 'engine', 'clues.js'), 'utf8');
      for (const needle of [
        "import { igCapsLine, igCountLine, selectCluesV4, v4Target } from './ig-select-v4.js';",
        '  if (v4Target(ctx.target)) {\n    return selectCluesV4(ctx);\n  }\n  igCapsLine(null);\n',
        'return ctx.record !== undefined ? selectCluesV3(ctx) : igDispatch(ctx, selectCluesV3);',
        'onCount: (u) => { igCountLine(null, u); charge?.(u); },',
      ]) {
        assert(clues.includes(needle), `the copy of clues.js lacks ${JSON.stringify(needle)}`);
      }
      assert(readFileSync(join(root, 'tools', 'bench', 'report.js'), 'utf8').includes('core/engine/ig-select-v4.js'), "the copy's SOURCE_FILES does not list ig-select-v4.js");
      // The targets outside Nightmare and Hell 1 keep the frozen search through the journal: no screen, one caps line of the legacy route.
      const { ws } = await engine('v4');
      const { carved } = await k15Set();
      for (const [min, max, score] of [[52, 70, 60], [112, 150, 130]]) {
        const dir = fresh(join(SELFTEST_DIR, 'logs', `v4-legacy-${min}`));
        process.env.IG_LOG_DIR = dir;
        process.env.IG_ROW = `selftest~v4-legacy-${min}`;
        let result;
        try {
          result = e.clues.selectClues({
            board: carved.board, pieces: carved.set.pieces, layout: carved.set.witness, target: { id: `st-${min}`, min, max, share: 0.3 },
            rng: e.rng.createRng(e.rng.normalizeSeedText('ig-selftest/v4/legacy'), `selftest/legacy-${min}`), uniqueness: 'any',
            excludeClueKeys: new Set(), ws, rate: () => synthetic(score), igStage: 'set',
          });
        } finally {
          delete process.env.IG_LOG_DIR;
          delete process.env.IG_ROW;
        }
        const lines = readJournal(dir);
        assert(result.ok === true && result.igWindow === undefined, `the legacy call at min ${min}: ${JSON.stringify(result.ok)}`);
        same(lines.filter((l) => l.t === 'caps'), [{ t: 'caps', call: null, count: true }], `the legacy call at min ${min} has another caps line`);
        assert(lines.find((l) => l.t === 'start').W === null && lines.some((l) => l.t === 'p'), `the legacy call at min ${min} is not the journaled frozen search`);
      }
    },
  },
  {
    name: 'v4: P1 locate, rescue and re-rating order (synthetic)',
    async run() {
      const { nearestFirst } = await import(pathToFileURL(join((await ensureTree('v4')).root, 'core', 'engine', 'ig-select-v4.js')).href);
      same(
        nearestFirst([{ count: 6, n: 1 }, { count: 8, n: 2 }, { count: 7, n: 3 }, { count: 8, n: 0 }, { count: 6, n: 0 }], 7).map((/** @type {any} */ p) => `${p.count}.${p.n}`),
        ['7.3', '8.0', '8.2', '6.0', '6.1'], 'the re-rating order (distance to wc, higher count, probe order)',
      );
      const down = (/** @type {number} */ c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c));
      const expect = (/** @type {any} */ got, /** @type {any} */ want, /** @type {string} */ what) => same(got, want, `${what}: got ${JSON.stringify(got)}`);

      let r = await v4Call('noprior', { prior: null, screen: down });
      expect(r.counts('locate'), [7, 1, 4], 'no prior: locate probes');
      assert(r.end.locate.hit === 4 && r.end.locate.result === 'hit' && r.end.result === 'ok', `no prior: hit ${JSON.stringify(r.end.locate)}`);
      assert(r.result.ok && r.result.clues.length === 4, 'no prior: the result is not the 4-clue hit');

      r = await v4Call('prior6', { prior: 6, screen: down });
      expect(r.counts('locate'), [6, 5, 3, 4], 'prior 6: locate probes');
      assert(r.end.locate.hit === 4 && r.end.locate.prior === 6, 'prior 6: hit at 4');

      r = await v4Call('overwork', { prior: null, screen: (c) => (c === 7 ? synthetic(30, { work: 190000001, stop: 'work-cap' }) : down(c)) });
      assert(r.tuples[0][2] === 'scap1', `a rating above W is not scap1: ${r.tuples[0][2]}`);
      expect(r.counts('locate').slice(0, 2), [7, 13], 'main work above W counts as above (the march goes up)');

      r = await v4Call('ar1in', { prior: null, screen: (c) => (c === 4 ? synthetic(60, { Gproved: 0 }) : down(c)) });
      expect(r.counts('locate'), [7, 1, 4], 'AR1-refused in band: locate probes');
      assert(r.tuples.find((t) => t[1] === 4)[2] === 'ar1' && r.end.locate.result === 'hit' && r.end.locate.hit === 4, 'AR1-refused in band is a window hit');
      assert(r.result.ok === false && r.end.accepted === null && r.end.result !== 'ok', 'an AR1-refused probe was accepted');

      r = await v4Call('below1', { prior: null, screen: () => synthetic(30) });
      expect(r.counts('locate'), [7, 1], 'all below: locate probes');
      assert(r.end.result === 'no-window' && r.end.locate.result === 'below-to-one' && r.end.locate.noWindowProof === 'canonical', `all below: ${JSON.stringify(r.end.locate)}`);
      assert(r.result.ok === false && r.result.reason === 'not-in-band' && !r.phases.includes('window'), 'all below: the call did not end at once');

      const capAll = () => 'cap';
      r = await v4Call('confirmed', { prior: null, screen: capAll, canon: () => synthetic(90) });
      expect(r.counts('locate'), [7, 13], 'confirmed: locate probes');
      expect(r.counts('rescue'), [13, 7], 'confirmed: rescue order');
      assert(r.end.result === 'no-window' && r.end.locate.noWindowProof === 'confirmed' && r.end.rerates === 2, `confirmed: ${JSON.stringify(r.end.locate)}`);
      expect(r.end.locate.rescue.map((/** @type {any} */ x) => `${x.count}:${x.side}`), ['13:above', '7:above'], 'confirmed: rescue sides');

      r = await v4Call('heuristic', { prior: 2, screen: capAll, canon: () => synthetic(90) });
      expect(r.counts('locate'), [2, 3, 5, 9, 13], 'heuristic: locate probes');
      expect(r.counts('rescue'), [13, 9, 5, 3], 'heuristic: rescue order (rerateMax 4, count 2 stays)');
      assert(r.end.result === 'no-window' && r.end.locate.noWindowProof === 'heuristic' && r.end.rerates === 4 && r.counts('rerate').length === 0, `heuristic: ${JSON.stringify(r.end.locate)}`);

      r = await v4Call('rebracketed', { prior: null, screen: capAll, canon: (c) => synthetic(100 - 10 * c) });
      expect(r.counts('locate'), [7, 13, 1, 4, 5, 6], 'rebracketed: locate probes');
      expect(r.counts('rescue'), [13, 7], 'rebracketed: rescue order');
      const loc = r.end.locate;
      assert(loc.result === 'window' && loc.hiBelow === 7 && loc.loAbove === 6 && loc.wc === 7 && loc.noWindowProof === 'rebracketed', `rebracketed: ${JSON.stringify(loc)}`);
      assert(r.phases.includes('window'), 'rebracketed: the call did not go on to phase B');
      assert(r.counts('rescue').length + r.counts('rerate').length <= 4 && r.counts('rerate').length <= 2 && r.end.rerates <= 4, 'rebracketed: phase E exceeded the shared allowance');
      assert(r.counts('rerate').length === 2, `rebracketed: phase E re-rated ${r.counts('rerate').length}, expected the two the allowance leaves`);

      r = await v4Call('rescuedin', { prior: null, screen: capAll, canon: (c) => synthetic(c === 13 ? 60 : 90) });
      expect(r.counts('rescue'), [13, 7], 'rescued in: the rescue re-rates 13 first, then 7, and the call finishes on the 13-clue candidate');
      assert(r.end.locate.noWindowProof === 'rescued-in' && r.end.result === 'ok' && r.end.clueCount === 13 && r.end.rerates === 2, `rescued in: ${JSON.stringify(r.end.locate)} ${r.end.result}`);

      r = await v4Call('rescuedrefused', { prior: null, screen: capAll, canon: (c) => (c === 13 ? synthetic(60, { Gproved: 0 }) : synthetic(90)) });
      expect(r.counts('rescue'), [13, 7], 'rescued in, refused: rescue order');
      assert(r.tuples.find((t) => t[0] === 'rescue')[2] === 'ar1', 'rescued in, refused: the re-rating is not an AR1 refusal');
      assert(r.end.locate.noWindowProof === 'rescued-in' && r.end.locate.hit === 13 && r.end.locate.noWindowProof !== 'confirmed', 'rescued in, refused: not a window hit at 13');
      assert(r.phases.includes('window') && r.phases.includes('p2'), 'rescued in, refused: no phase B or no dead end (a refusal is no candidate)');
      assert(r.result.ok === false && r.end.accepted === null, 'rescued in, refused: a refused rating was accepted');
      assert(r.counts('rescue').length + r.counts('rerate').length === r.end.rerates && r.end.rerates <= 4, 'rescued in, refused: the allowance is not shared');
    },
  },
  {
    name: 'v4: the result carries skips and the window',
    async run() {
      const down = (/** @type {number} */ c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c));
      const r = await v4Call('window6', { prior: 6, screen: down });
      assert(r.result.ok === true, `window6: the call found no puzzle: ${JSON.stringify(r.counts('locate'))}`);
      same(r.result.skips, { subsets: [], repairs: [] }, 'window6: skips');
      same(r.result.igWindow, { c0: 6, wc: 4, hit: 4, hiBelow: null, loAbove: null, probes: 4, result: 'hit', proof: null },
        `window6: igWindow, locate probes ${JSON.stringify(r.counts('locate'))}`);
      same(r.end.locate.tables, { prior: 'prior-v1', screen: 'w190' }, 'window6: the tables of the end line');
      assert(r.end.locate.countWork === 0, `window6: countWork ${r.end.locate.countWork}`);
      const start = r.lines.find((l) => l.t === 'start');
      same(r.lines.filter((l) => l.t === 'caps'), [{ t: 'caps', call: start.call, count: true }], 'window6: the caps lines');
      assert(r.lines.every((l) => l.t !== 'count'), 'window6: a count line with uniqueness any');
    },
  },
  {
    name: 'v4: observers parity (synthetic, require)',
    async run() {
      const { e, ws } = await engine('v4');
      const units = (/** @type {any[][]} */ log) => log.filter(([kind]) => kind === 'charge').map(([, u]) => u);
      const kinds = ['rated', 'unrateable', 'rejected', 'skip', 'repair', 'selected'];
      const phases = ['locate', 'window', 'seed', 'beam', 'rescue', 'rerate'];
      // The input of T02b's table (REBRACKETED) ends the call without a puzzle: no repair, no count, no `selected` event.
      // The second input (DOWN, a result with repairs and real counts) is an addition that exercises those paths.
      for (const [name, screen, canon, mustBeOk] of /** @type {[string, (c: number) => any, (c: number) => any, boolean][]} */ ([
        ['parity', REBRACKETED.screen, REBRACKETED.canon, false],
        ['parity-ok', DOWN, DOWN, true],
      ])) {
        const extra = { uniqueness: 'require', igPrior: null, igScreen: synth(e, screen), igCanonical: synth(e, canon) };
        const A = e.clues.selectClues(await v4Ctx(e, ws, name, extra));
        /** @type {any[][]} */
        const logB = [];
        const B = e.clues.selectClues(await v4Ctx(e, ws, name, { ...extra, charge: (/** @type {number} */ u) => logB.push(['charge', u]) }));
        /** @type {any[][]} */
        const logC = [];
        const C = e.clues.selectClues(await v4Ctx(e, ws, name, {
          ...extra, charge: (/** @type {number} */ u) => logC.push(['charge', u]), record: (/** @type {any} */ ev) => logC.push(['event', ev]),
        }));
        same(B, A, `${name}: a charge observer changed the result: ${JSON.stringify(B)} against ${JSON.stringify(A)}`);
        same(C, A, `${name}: the charge and record observers changed the result: ${JSON.stringify(C)} against ${JSON.stringify(A)}`);
        assert(A.ok !== true || (A.skips !== undefined && A.igWindow !== undefined), `${name}: an ok result lacks skips or igWindow`);
        assert(!mustBeOk || A.ok === true, `${name}: the call found no puzzle: ${JSON.stringify(A)}`);
        assert(units(logB).length > 0, `${name}: no rating attempt was charged`);
        same(units(logC), units(logB), `${name}: the charged units differ with a recorder`);
        /** @type {any[]} */
        const events = [];
        logC.forEach(([kind, ev], i) => {
          if (kind !== 'event') {
            return;
          }
          events.push(ev);
          assert(kinds.includes(ev.kind), `${name}: event kind ${ev.kind}`);
          if (['rated', 'unrateable', 'rejected'].includes(ev.kind)) {
            assert(i > 0 && logC[i - 1][0] === 'charge', `${name}: the ${ev.kind} event of sequence ${ev.sequence} does not come right after a charge`);
          }
          assert(ev.phase === undefined || phases.includes(ev.phase), `${name}: event phase ${ev.phase}`);
          assert(ev.sequence === undefined || (Number.isInteger(ev.sequence) && ev.sequence >= 0 && ev.sequence <= 2191), `${name}: event sequence ${ev.sequence}`);
        });
        assert(events.length > 0, `${name}: the recorder saw no event`);
        assert(events.filter((ev) => ev.kind === 'selected').length === (A.ok ? 1 : 0) && (!A.ok || events[events.length - 1].kind === 'selected'),
          `${name}: selected events with ok ${A.ok}: ${events.map((ev) => ev.kind).join(',')}`);
        assert(!mustBeOk || events.some((ev) => ev.kind === 'repair'), `${name}: the call recorded no repair event`);
      }
    },
  },
  {
    name: 'v4: throwing observers propagate',
    async run() {
      const { e, ws } = await engine('v4');
      const extra = { igPrior: null, igScreen: synth(e, REBRACKETED.screen), igCanonical: synth(e, REBRACKETED.canon) };
      const boomC = new Error('charge-stop');
      let charges = 0;
      const ctxC = await v4Ctx(e, ws, 'throw', {
        ...extra, charge: () => {
          charges += 1;
          if (charges === 3) {
            throw boomC;
          }
        },
      });
      const rc = journaled('throw-charge', () => e.clues.selectClues(ctxC));
      assert(rc.error === boomC, `charge: the call threw ${rc.error === null ? 'nothing' : String(rc.error)} after ${charges} charges`);
      assert(charges === 3, `charge: ${charges} charges, expected 3 (the throw ends the call at once)`);
      same(rc.lines.filter((l) => l.t === 'end').map((l) => l.result), ['error'], 'charge: the end line of the journal');
      const boomR = new Error('record-stop');
      let events = 0;
      const ctxR = await v4Ctx(e, ws, 'throw', {
        ...extra, record: () => {
          events += 1;
          if (events === 2) {
            throw boomR;
          }
        },
      });
      const rr = journaled('throw-record', () => e.clues.selectClues(ctxR));
      assert(rr.error === boomR, `record: the call threw ${rr.error === null ? 'nothing' : String(rr.error)} after ${events} events`);
      assert(events === 2, `record: ${events} events, expected 2 (the throw ends the call at once)`);
      same(rr.lines.filter((l) => l.t === 'end').map((l) => l.result), ['error'], 'record: the end line of the journal');
    },
  },
  {
    name: 'v4: skip replay round trip',
    async run() {
      const { e, ws } = await engine('v4');
      const { carved } = await k15Set();
      const extra = { igPrior: null, igScreen: synth(e, DOWN), igCanonical: synth(e, DOWN) };
      /** @type {any[]} */
      const events = [];
      e.clues.selectClues(await v4Ctx(e, ws, 'skip', { ...extra, record: (/** @type {any} */ ev) => events.push(ev) }));
      const K0 = [0, 1].map((sequence) => {
        const ev = events.find((x) => x.sequence === sequence && Array.isArray(x.clueIds));
        assert(ev !== undefined, `skip: no event of sequence ${sequence}: ${events.map((x) => `${x.kind}@${x.sequence}`).join(',')}`);
        return e.keys.clueKey(carved.board, carved.set.pieces, carved.set.witness.filter((/** @type {any} */ p) => ev.clueIds.includes(p.piece)));
      });
      const R1 = e.clues.selectClues(await v4Ctx(e, ws, 'skip', { ...extra, excludeClueKeys: new Set(K0) }));
      assert(R1.ok === true && R1.skips.subsets[0] === 0, `skip: the excluded run: ${JSON.stringify(R1)}`);
      const R2 = e.clues.selectClues(await v4Ctx(e, ws, 'skip', { ...extra, excludeClueKeys: new Set(), replaySkips: R1.skips }));
      same(R2, R1, `skip: the replay differs from the excluded run: ${JSON.stringify(R2)}`);
      const ctx3 = await v4Ctx(e, ws, 'skip', { ...extra, replaySkips: { subsets: [...R1.skips.subsets, 2191], repairs: [] } });
      /** @type {any} */
      let thrown = null;
      try {
        e.clues.selectClues(ctx3);
      } catch (caught) {
        thrown = caught;
      }
      assert(thrown instanceof e.clues.SkipReplayError && thrown.reason === 'unused' && thrown.list === 'subsets' && thrown.ordinal === 2191,
        `skip: the extra entry gave ${thrown === null ? 'no error' : `${thrown.name}: ${thrown.message}`}`);
    },
  },
  {
    name: 'v4: legacy dispatch equals the frozen search',
    async run() {
      const treeV4 = await engine('v4');
      const treeBase = await engine('base');
      const rate = (/** @type {any} */ b, /** @type {any} */ p, /** @type {any[]} */ c) => synthetic(c.length <= 2 ? 60 : Math.max(5, 75 - 5 * c.length));
      const ctxOf = (/** @type {{ e: any, ws: any }} */ tree, /** @type {Record<string, any>} */ extra = {}) => v4Ctx(
        tree.e, tree.ws, 'legacy', { target: tree.e.levels.level('master'), rate, ...extra });
      const ctxJournaled = await ctxOf(treeV4);
      const journal = journaled('legacy', () => treeV4.e.clues.selectClues(ctxJournaled));
      assert(journal.error === null, `legacy: the v4 tree threw ${String(journal.error)}`);
      const frozen = treeBase.e.clues.selectClues(await ctxOf(treeBase));
      assert(frozen.ok === true, `legacy: the frozen search found no puzzle: ${JSON.stringify(frozen)}`);
      same(journal.result, frozen, `legacy: the v4 tree's result differs from the frozen search: ${JSON.stringify(journal.result)} against ${JSON.stringify(frozen)}`);
      const start = journal.lines.find((l) => l.t === 'start');
      assert(start !== undefined && start.W === null && start.priorCount === null, `legacy: the start line ${JSON.stringify(start)}`);
      const phases = journal.lines.filter((l) => l.t === 'phase').map((l) => l.phase);
      assert(phases.includes('p1') && !phases.includes('locate'), `legacy: phases ${phases.join(',')}`);
      /** @type {any[]} */
      const listV4 = [];
      /** @type {any[]} */
      const listBase = [];
      const recordedV4 = treeV4.e.clues.selectClues(await ctxOf(treeV4, { record: (/** @type {any} */ ev) => listV4.push(ev) }));
      const recordedBase = treeBase.e.clues.selectClues(await ctxOf(treeBase, { record: (/** @type {any} */ ev) => listBase.push(ev) }));
      same(recordedV4, recordedBase, `legacy: the recorded results differ: ${JSON.stringify(recordedV4)} against ${JSON.stringify(recordedBase)}`);
      assert(listBase.length > 0, 'legacy: the frozen search recorded no event');
      same(listV4, listBase, 'legacy: the recorded event lists differ');
    },
  },
  {
    name: 'v4: the rate seam keeps priority on the screened route',
    async run() {
      const { e, ws } = await engine('v4');
      const boom = new Error('seam');
      const ctxThrow = await v4Ctx(e, ws, 'seam', {
        igPrior: null, rate: () => {
          throw boom;
        },
      });
      const thrown = journaled('seam-throw', () => e.clues.selectClues(ctxThrow));
      assert(thrown.error === boom, `seam: the call threw ${thrown.error === null ? 'nothing' : String(thrown.error)}`);
      let calls = 0;
      const ctxCount = await v4Ctx(e, ws, 'seam', {
        igPrior: null, rate: (/** @type {any} */ b, /** @type {any} */ p, /** @type {any[]} */ c) => {
          calls += 1;
          return synthetic(100 - 10 * c.length);
        },
      });
      const counted = journaled('seam-count', () => e.clues.selectClues(ctxCount));
      assert(counted.error === null, `seam: the counting call threw ${String(counted.error)}`);
      const ratings = counted.lines.filter((l) => l.t === 'p').length;
      assert(calls >= 1 && calls === ratings, `seam: ${calls} seam calls against ${ratings} rating lines of the journal`);
    },
  },
  {
    name: 'v4: provenance versions per arm',
    async run() {
      const keys = ['algo', 'policy', 'rng', 'seedScheme', 'ratingModel', 'priorTable', 'screenTable'];
      const L = (await engine('log')).e.generate.provenanceVersions();
      same(Object.keys(L), keys.slice(0, 5), `the log tree's versions have the keys ${Object.keys(L).join(',')}`);
      assert(L.algo === 'gen-v3', `the log tree's algo is ${L.algo}`);
      const arms = /** @type {[string, string][]} */ ([['v4', 'w190'], ['v4-w760', 'none'], ['v4-w095', 'w095'], ['v4-w380', 'w380']]);
      /** @type {Set<string>} */
      const algos = new Set();
      for (const [id, screenTable] of arms) {
        const V = (await engine(id)).e.generate.provenanceVersions();
        same(Object.keys(V), keys, `${id}: the versions have the keys ${Object.keys(V).join(',')}`);
        assert(V.algo === `gen-v4-proto:${id}`, `${id}: algo ${V.algo}`);
        assert(V.priorTable === 'prior-v1', `${id}: priorTable ${V.priorTable}`);
        assert(V.screenTable === screenTable, `${id}: screenTable ${V.screenTable}, expected ${screenTable}`);
        for (const key of ['policy', 'rng', 'seedScheme', 'ratingModel']) {
          assert(V[key] === L[key], `${id}: ${key} ${V[key]} differs from the log tree's ${L[key]}`);
        }
        algos.add(V.algo);
      }
      assert(algos.size === arms.length, `the algo ids are not pairwise different: ${[...algos].join(', ')}`);
    },
  },
  {
    name: "v4: provenance reader by the record's own algo",
    async run() {
      const treeV4 = await engine('v4');
      const P = (await treeModule(treeV4, 'pack')).provenanceProblem;
      const PLog = (await treeModule(await engine('log'), 'pack')).provenanceProblem;
      const V = treeV4.e.generate.provenanceVersions();
      const L = (await engine('log')).e.generate.provenanceVersions();
      const fixturePack = replayFixture().packs[0];
      const m3 = structuredClone(fixturePack.generation.made[fixturePack.puzzles.map((/** @type {any} */ p) => p.id)
        .find((/** @type {string} */ id) => fixturePack.generation.made[id].kind === 'candidate')]);
      const m4 = asV4(m3, V);
      const expect = (/** @type {string} */ what, /** @type {string | null} */ got, /** @type {string | null} */ want) => {
        assert(got === want, `${what}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
      };
      const IG_PRIOR = 'igPrior must be null or an integer from 1 to 128';
      expect('(a) m3', P('made', m3), null);
      expect('(b) m4', P('made', m4), null);
      expect('(c) igPrior 5', P('made', { ...m4, igPrior: 5 }), null);
      for (const bad of [0, 129, '5']) {
        expect(`(c) igPrior ${JSON.stringify(bad)}`, P('made', { ...m4, igPrior: bad }), IG_PRIOR);
      }
      const { igPrior: _dropped, ...withoutPrior } = m4;
      expect('(d) m4 without igPrior', P('made', withoutPrior), 'missing field "igPrior"');
      const { screenTable: _screen, ...withoutScreen } = V;
      expect('(e) m4 without screenTable', P('made', { ...m4, versions: withoutScreen }), 'versions: missing field "screenTable"');
      expect('(f) m3 with igPrior', P('made', asV4(m3, m3.versions)), 'unknown field "igPrior"');
      expect('(g) m3 with priorTable', P('made', { ...m3, versions: { ...m3.versions, priorTable: 'prior-v1' } }), 'versions: unknown field "priorTable"');
      expect('(h) m3 with 2191', P('made', { ...m3, skips: { subsets: [2191], repairs: [] } }), 'skips.subsets[0] must be an integer from 0 to 2127');
      expect('(h) m4 with 2191', P('made', { ...m4, skips: { subsets: [2191], repairs: [] } }), null);
      expect('(h) m4 with 2192', P('made', { ...m4, skips: { subsets: [2192], repairs: [] } }), 'skips.subsets[0] must be an integer from 0 to 2191');
      expect('(h) m4 with repair 64', P('made', { ...m4, skips: { subsets: [], repairs: [64] } }), 'skips.repairs[0] must be an integer from 0 to 63');
      const o = fixturePack.generation.setOrigin;
      expect('(i) setOrigin of the fixture', P('setOrigin', o), null);
      expect('(i) setOrigin with V', P('setOrigin', { ...o, versions: V }), null);
      expect('(i) setOrigin with five keys and the arm algo', P('setOrigin', { ...o, versions: { ...L, algo: V.algo } }), 'versions: missing field "priorTable"');
      expect('(j) the log tree on m4', PLog('made', m4), 'unknown field "igPrior"');
      expect('(k) m3 with gen-v40', P('made', { ...m3, versions: { ...m3.versions, algo: 'gen-v40' } }), null);
      expect('(k) m3 with V and gen-v40', P('made', { ...m3, versions: { ...V, algo: 'gen-v40' } }), 'versions: unknown field "priorTable"');
      expect('(l) m4 with gen-v4', P('made', { ...m4, versions: { ...V, algo: 'gen-v4' } }), null);
      expect('(l) m3 with gen-v4', P('made', { ...m3, versions: { ...m3.versions, algo: 'gen-v4' } }), 'missing field "igPrior"');
      expect('(m) m4 with the empty experimental suffix', P('made', { ...m4, versions: { ...V, algo: 'gen-v4-proto:' } }), 'unknown field "igPrior"');
    },
  },
  {
    name: 'v4: old and new records load and save',
    async run() {
      const treeV4 = await engine('v4');
      const treeLog = await engine('log');
      const { validatePack, serializePack, parsePack } = await treeModule(treeV4, 'pack');
      const logPack = await treeModule(treeLog, 'pack');
      const V = treeV4.e.generate.provenanceVersions();
      const fixture = replayFixture();
      const ignored = (/** @type {any} */ read) => read.warnings.filter((/** @type {any} */ w) => w.code === 'provenance-ignored');
      const kept = (/** @type {string} */ what, /** @type {any} */ read, /** @type {any} */ generation) => {
        assert(read.ok === true, `${what}: the pack is not read: ${JSON.stringify(read.issues)}`);
        assert(ignored(read).length === 0, `${what}: provenance-ignored warnings ${JSON.stringify(ignored(read))}`);
        same(read.value.generation.setOrigin, generation.setOrigin, `${what}: the setOrigin changed`);
        same(read.value.generation.made, generation.made, `${what}: the made map changed`);
      };
      const roundTrip = (/** @type {string} */ what, /** @type {any} */ read, /** @type {any} */ generation) => {
        kept(`${what} after a save and a load`, parsePack(serializePack(read.value)), generation);
      };
      for (const [index, pack] of fixture.packs.entries()) {
        const read = validatePack(structuredClone(pack));
        kept(`(a) fixture pack ${index}`, read, pack.generation);
        roundTrip(`(a) fixture pack ${index}`, read, pack.generation);
      }
      const pack0 = structuredClone(fixture.packs[0]);
      const generation4 = v4Generation(pack0.generation, V);
      const read4 = validatePack({ ...structuredClone(pack0), generation: structuredClone(generation4) });
      kept('(b) pack 0 as gen-v4', read4, generation4);
      roundTrip('(b) pack 0 as gen-v4', read4, generation4);
      const candidates = pack0.puzzles.map((/** @type {any} */ p) => p.id).filter((/** @type {string} */ id) => pack0.generation.made[id]?.kind === 'candidate');
      assert(candidates.length === 3, `the fixture's pack 0 has ${candidates.length} candidate entries, expected 3`);
      const mixed = structuredClone(pack0);
      mixed.generation.made[candidates[0]] = asV4(mixed.generation.made[candidates[0]], mixed.generation.made[candidates[0]].versions);
      const readMixed = validatePack(mixed);
      assert(readMixed.ok === true, `(c) the pack is not read: ${JSON.stringify(readMixed.issues)}`);
      const droppedMixed = ignored(readMixed);
      assert(droppedMixed.length === 1 && droppedMixed[0].path.startsWith('generation.made'), `(c) warnings ${JSON.stringify(droppedMixed)}`);
      assert(!Object.hasOwn(readMixed.value.generation.made, candidates[0]), '(c) the malformed entry is still in made');
      assert(candidates.slice(1).every((id) => Object.hasOwn(readMixed.value.generation.made, id)), '(c) a valid entry was dropped');
      const readLog = logPack.validatePack({ ...structuredClone(pack0), generation: structuredClone(generation4) });
      assert(readLog.ok === true, `(d) the pack is not read: ${JSON.stringify(readLog.issues)}`);
      const droppedLog = ignored(readLog);
      assert(droppedLog.filter((w) => w.path === 'generation.setOrigin').length === 1, `(d) setOrigin warnings ${JSON.stringify(droppedLog)}`);
      assert(droppedLog.filter((w) => w.path.startsWith('generation.made')).length === candidates.length && droppedLog.length === candidates.length + 1,
        `(d) warnings ${JSON.stringify(droppedLog)}`);
      assert(!Object.hasOwn(readLog.value.generation, 'setOrigin'), '(d) the log tree kept a gen-v4 setOrigin');
    },
  },
  {
    name: 'v4: version and table refusal before any work',
    async run() {
      const treeV4 = await engine('v4');
      const treeW095 = await engine('v4-w095');
      const V = treeV4.e.generate.provenanceVersions();
      const R = async (/** @type {any} */ tree, /** @type {any} */ generation) => {
        const { runReplay } = await treeModule(tree, 'replay');
        return runReplay({ ...(await fixtureInput(tree, 1, 0)), generation }, { ws: tree.ws, scratch: tree.scratch }, tree.e.policy.REPLAY, cancelTrap);
      };
      const refused = async (/** @type {string} */ what, /** @type {any} */ tree, /** @type {any} */ generation, /** @type {string} */ reason, /** @type {any} */ stages) => {
        const run = await R(tree, generation);
        assert(run.status === 'unavailable' && run.reason === reason && run.work === 0, `${what}: ${run.status}, ${run.reason}, work ${run.work}`);
        for (const [stage, state] of Object.entries(stages)) {
          assert(run.stages[stage] === state, `${what}: stage ${stage} is ${run.stages[stage]}, expected ${state}`);
        }
      };
      const passes = async (/** @type {string} */ what, /** @type {any} */ tree, /** @type {any} */ generation) => {
        /** @type {any} */
        let thrown = null;
        try {
          await R(tree, generation);
        } catch (caught) {
          thrown = caught;
        }
        assert(thrown instanceof Error && thrown.message === 'isCancelled was reached', `${what}: the preflight refused the record: ${thrown === null ? 'no error' : String(thrown)}`);
      };
      const g3 = structuredClone(replayFixture().packs[1].generation);
      const g4 = v4Generation(g3, V);
      const puzzleId = (await fixtureInput(treeV4, 1, 0)).puzzle.id;
      await passes('(i) a record of the running arm', treeV4, g4);
      await refused('(ii) another prior table', treeV4, v4Generation(g3, { ...V, priorTable: 'prior-v0' }), 'set-versions',
        { set: 'unavailable', candidate: 'unavailable', final: 'not-compared' });
      const otherScreen = structuredClone(g4);
      delete otherScreen.setOrigin;
      otherScreen.made[puzzleId].versions.screenTable = 'w095';
      await refused('(iii) another screen table', treeV4, otherScreen, 'no-set-origin', { candidate: 'unavailable' });
      const withoutOrigin = structuredClone(g4);
      delete withoutOrigin.setOrigin;
      await passes('(iv) the control of (iii)', treeV4, withoutOrigin);
      await refused('(v) a gen-v3 record', treeV4, g3, 'set-versions', {});
      await refused('(vi) a record of another arm', treeW095, g4, 'set-versions', {});
    },
  },
  {
    name: 'bound: every primitive is announced',
    async run() {
      const { e } = await engine('v4');
      const { carved } = await k15Set();
      const rowLimit = e.clues.countRowLimit(carved.board);
      for (const [name, spec] of /** @type {[string, typeof BEGIN_CALL][]} */ ([['begin', BEGIN_CALL], ['begin2', BEGIN_CALL_2]])) {
        const r = await v4Call(name, spec);
        const { lines } = r;
        const start = lines.find((l) => l.t === 'start');
        const last = lines.findLastIndex((l) => l.t === 'p' || l.t === 'count');
        let countLines = 0;
        let countUnits = 0;
        lines.forEach((l, i) => {
          const before = i > 0 ? lines[i - 1] : null;
          const after = i + 1 < lines.length ? lines[i + 1] : null;
          if (l.t === 'begin') {
            assert(l.call === start.call && ['screen', 'rate', 'count'].includes(l.kind), `${name}: begin line ${JSON.stringify(l)}`);
            assert(typeof l.bound === 'number' && Number.isFinite(l.bound) && l.bound >= 0, `${name}: the bound of ${JSON.stringify(l)} is not a finite number from 0`);
            assert(i < last, `${name}: a begin line follows the last completion line (${JSON.stringify(l)})`);
            assert(after !== null && after.t === (l.kind === 'count' ? 'count' : 'p'), `${name}: the ${l.kind} begin line is followed by ${JSON.stringify(after)}`);
          }
          if (l.t === 'p') {
            assert(before !== null && before.t === 'begin' && (before.kind === 'screen' || before.kind === 'rate'),
              `${name}: the ${l.tuple[0]} rating line (index ${l.i}) is preceded by ${JSON.stringify(before)}`);
            const screened = ['locate', 'window', 'p2', 'beam'].includes(l.tuple[0]);
            assert(before.kind === (screened ? 'screen' : 'rate'), `${name}: a ${l.tuple[0]} rating is announced as ${before.kind}`);
          }
          if (l.t === 'count') {
            assert(before !== null && before.t === 'begin' && before.kind === 'count' && before.bound === rowLimit,
              `${name}: the count line ${JSON.stringify(l)} is preceded by ${JSON.stringify(before)}, the row limit is ${rowLimit}`);
            countLines += 1;
            countUnits += l.units;
          }
        });
        assert(r.end !== undefined && countUnits === r.end.locate.countWork, `${name}: the count lines sum to ${countUnits}, the end line says ${r.end?.locate?.countWork}`);
        assert(lines.some((l) => l.t === 'begin' && l.kind !== 'count'), `${name}: no rating was announced`);
        if (name === 'begin') {
          assert(countLines >= 1 && r.result.ok === true, `${name}: ${countLines} count lines, ok ${r.result.ok}: the real repair did not run`);
        } else {
          assert(r.phases.includes('window') && r.phases.includes('beam') && r.counts('beam').length > 0,
            `${name}: phases ${r.phases.join(',')}, beam probes ${r.counts('beam').length}: phase D's loop did not run`);
        }
      }
    },
  },
  {
    name: 'bound: no real rating exceeds its bound',
    async run() {
      const tree = await engine('v4');
      const { e, ws } = tree;
      const { igRatingBound } = await treeModule(tree, 'ig-select-v4');
      const { carved } = await k15Set();
      const { board } = carved;
      const { pieces, witness } = carved.set;
      let over = { value: -Infinity, text: '' };
      let slack = { value: Infinity, text: '' };
      let checked = 0;
      for (const size of [3, 6, 9]) {
        const clues = witness.slice(0, size);
        for (const w of [0, 1, 1000, 1000000, 100000000]) {
          for (const c of [0, 1000]) {
            let charge;
            /** @type {any} */
            let metrics = null;
            try {
              metrics = e.difficulty.measureV3(board, pieces, clues, ws, {
                deduce: { ...e.policy.DEDUCE, work: w, census: c }, dlx: e.policy.SCORE.caps,
              }).metrics;
              charge = metrics.work;
            } catch (error) {
              if (!(error instanceof e.difficulty.IncompleteRatingError)) {
                throw error;
              }
              charge = error.counters.work;
            }
            const bound = igRatingBound(board, pieces, clues, { work: w, census: c });
            const text = `${size} clues, work limit ${w}, census limit ${c}`;
            assert(charge <= bound, `${text}: the rating charged ${charge}, above its bound ${bound}`);
            if (size === 3 && w === 100000000 && c === 1000) {
              assert(metrics !== null && metrics.censusComplete === false && metrics.censusWork >= 1000,
                `${text}: the census overshoot was not exercised (${metrics === null ? 'capped' : `censusComplete ${metrics.censusComplete}, censusWork ${metrics.censusWork}`})`);
            }
            if (charge - w - c > over.value) {
              over = { value: charge - w - c, text };
            }
            if (bound - w - c < slack.value) {
              slack = { value: bound - w - c, text };
            }
            checked += 1;
          }
        }
      }
      assert(checked === 30, `${checked} ratings checked, expected 30`);
      process.stdout.write(`NOTE bound: ${checked} real ratings; largest charge - w - c ${over.value} (${over.text}); smallest bound - w - c ${slack.value} (${slack.text})\n`);
    },
  },
  {
    name: 'bound: the journal changes no result',
    async run() {
      const journaledCall = await v4Call('begin', BEGIN_CALL);
      const silent = await v4Call('begin', { ...BEGIN_CALL, journal: false });
      assert(journaledCall.result.ok === true && journaledCall.files.length > 0, `the journaled call: ok ${journaledCall.result.ok}, ${journaledCall.files.length} journal files`);
      same(silent.result, journaledCall.result, `the journal changed the result: ${JSON.stringify(silent.result)} against ${JSON.stringify(journaledCall.result)}`);
      same(silent.files, [], `the call without a journal wrote ${JSON.stringify(silent.files)}`);
    },
  },
];

/** @param {string} text @returns {string} The text without the worktree's absolute root (records refuse it). */
function scrub(text) {
  const root = ROOT.replace(/[\\/]+$/, '');
  return text.split(root).join('.').split(root.replaceAll('\\', '/')).join('.').split(root.replaceAll('\\', '\\\\')).join('.');
}

/** The self-test task ids of stage 1 (V4-T04e): their `self-test/state.json` is evidence of the stage-1 receipt (D-V4-18). */
export const HISTORICAL_SELFTEST = Object.freeze(['V4-T04', 'V4-T04v4', 'V4-T04f', 'V4-T04i']);

/**
 * @param {string} label
 * @param {string} task
 * @param {boolean} stateExists Whether `self-test/state.json` of the task exists under the label.
 * @param {readonly string[]} [historical] The reserved task ids (a case passes a scratch id to prove `main`'s wiring).
 * @returns {string | null} Why the run must not start (a historical record of stage 1 would be overwritten); else null.
 */
export function reservedTaskProblem(label, task, stateExists, historical = HISTORICAL_SELFTEST) {
  return label === 'frozen' && historical.includes(task) && stateExists
    ? `self-test: ${task} is a historical stage-1 record; use another --task` : null;
}

/**
 * @param {string[]} argv
 * @param {{ historical?: readonly string[] }} [options] `historical` replaces the reserved ids (a case proves the guard on a scratch id).
 * @returns {Promise<number>}
 */
async function main(argv, { historical = HISTORICAL_SELFTEST } = {}) {
  const { args, on } = parseArgs(argv, { values: ['label', 'source-label', 'horizon-s', 'only', 'task'], switches: ['proto', 'p6', 'frozen', 'v4', 'items'] });
  const label = args.label ?? 'selftest';
  const task = args.task ?? (on.has('items') ? 'V4-T04a' : on.has('v4') ? 'V4-T02a' : on.has('frozen') ? 'V4-T01a' : on.has('p6') ? 'IGP-04' : on.has('proto') ? 'IGP-01' : 'IGP-00');
  const only = args.only === undefined ? null : args.only.split(',').map(Number);
  const reserved = reservedTaskProblem(label, task, label === 'frozen' && existsSync(artifactDir(label, task, 'self-test', 'state.json')), historical);
  if (reserved !== null) {
    process.stderr.write(`${reserved}\n`);
    return 3;
  }
  horizonS = Number(args['horizon-s'] ?? 285);
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();
  /** @type {{ name: string, pass: boolean, reason: string | null, ms: number }[]} */
  const results = [];
  const selected = on.has('items') ? itemCases : on.has('v4') ? v4Cases : on.has('frozen') ? frozenCases
    : [...cases, ...(on.has('proto') || on.has('p6') ? protoCases : []), ...(on.has('p6') ? p6Cases : [])];
  for (const [i, c] of selected.entries()) {
    if (only !== null && !only.includes(i + 1)) {
      continue;
    }
    const t0 = performance.now();
    try {
      await c.run();
      results.push({ name: c.name, pass: true, reason: null, ms: Math.round(performance.now() - t0) });
      process.stdout.write(`PASS ${i + 1} ${c.name} (${Math.round(performance.now() - t0)} ms)\n`);
    } catch (e) {
      const reason = scrub(e instanceof Error ? e.message : String(e));
      results.push({ name: c.name, pass: false, reason, ms: Math.round(performance.now() - t0) });
      process.stdout.write(`FAIL ${i + 1} ${c.name}: ${reason}\n`);
    }
  }
  const failures = results.filter((r) => !r.pass).length;
  const seconds = Math.round(elapsedS() * 1000) / 1000;
  writeJson(join(artifactDir(label, task, 'self-test'), 'state.json'), {
    format: 'ig-proto-state', version: 1, task, step: 'self-test', label, done: failures === 0, results,
    appendCostMs: memo.appendCostMs ?? null, protoNotes: memo.protoNotes ?? null, p6Notes: memo.p6Notes ?? null,
    lastInvocation: {
      start: startedAt, end: new Date().toISOString(), seconds, horizonS, progress: { cases: results.length - failures },
    },
  });
  process.stdout.write(`self-test: ${results.length - failures} passed, ${failures} failed (${seconds} s)\n`);
  return failures === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
  setTimeout(() => process.exit(process.exitCode ?? 0), 10000).unref();
}
