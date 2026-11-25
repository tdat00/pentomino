// @ts-check
// Self-test of the harness (IGP-00 §10). Run under the lock wrapper by run-task.ps1; it carves and rates only small
// cases (about 60 s). Each case prints `PASS <name>` or `FAIL <name>: <reason>`; the state file records the results
// and the script exits 1 on any failure.
//   node tools\ig-proto\self-test.mjs --label <L> --source-label <SL> --horizon-s <H> [--only 1,3] [--list] [--proto] [--p6] [--task <T>]
// `--proto` (IGP-01) adds the prototype's cases after IGP-00's nine; its state goes to <T>/self-test/state.json
// (default IGP-01 with --proto, else IGP-00). `--p6` (IGP-04) runs all of them and adds the P6 cases (default task IGP-04).
// `--frozen` (V4-T01a, V4-T01b, V4-T03) runs only the frozen-source group (default task V4-T01a): carve-only checks and records, unlocked.
// `--items` (V4-T04a onwards) runs only the measurement-items group (default task V4-T04a): synthetic worker kinds, unlocked.
// V4-T14 added six cases to it (`p6: ...`: the pairs and their identity, the statistics, the memory checks, the ledger and the
// preflight, the refused inputs and the chart of the phase-1 bench of P6), on synthetic rows; no bench runs.
// `--v4` (V4-T02a onwards) runs only the gen-v4 prototype group (default task V4-T02a); it runs through the lock helper.
// Its fifteen cases: V4-T02a's three (tree, dispatch and bounds; locate, rescue and re-rating order; skips and window),
// V4-T02b's five (observers parity, throwing observers, skip replay round trip, legacy dispatch, the rate seam),
// V4-T02c's four (provenance versions per arm, the reader by the record's own algo, old and new records load and save,
// version and table refusal before any work) and V4-T02d's three (every primitive is announced, no real rating
// exceeds its bound, the journal changes no result); V4-T07a added three (the call budget) and V4-T07b eight (the side
// of a no-window result, the bounded set attempts rule, four scripted set requests at the pool widths 1, 2, 4 and 8,
// the width-8 trees, the replay of a budget-stopped call).
// Under `--label frozen` the four stage-1 task ids (`V4-T04`, `V4-T04v4`, `V4-T04f`, `V4-T04i`) are historical records that
// the stage-1 receipt hashes (V4-T04f, D-V4-18): once their state exists a run with such a `--task` exits 3, writing nothing.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { Worker } from 'node:worker_threads';

import { buildReport, newRunRecord, reportJson, SOURCE_FILES } from '../bench/report.js';
import { checkText } from '../check-conventions.mjs';
import { decide, readInvocations, totals } from './lib/budget.mjs';
import { rateAttempt, recordedCall, screenRating, startCountFor, windowSubsets } from './lib/calls.mjs';
import { loadEngine } from './lib/engine.mjs';
import { createFakeClock, harness, settle, track } from './lib/fake-pool.mjs';
import { identityHash, itemIdentity, logEnd, logSpawn, logStart, manifestHash, readItemLog, resumePlan, runCustomItems, runItems, runProcessItems } from './lib/items.mjs';
import { admits, createLanes, DEFAULT_LIMITS } from './lib/lanes.mjs';
import { itemLedger, pairPrimitives } from './lib/ledger.mjs';
import { preparePackPath, writePackFile } from './lib/packs.mjs';
import { abs, artifactDir, elapsedS, evidenceDir, FROZEN_COMMIT, FROZEN_DIGEST, IG_DIR, mp12b1Report, parseArgs, rel, ROOT, SOURCE_KIND, sourceRoot } from './lib/paths.mjs';
import { ACCEPTED_FORMAT, acceptedBinding, checkAccepted, LIVE_DEADLINE_FIELDS, proofCheck, proofEnvelope, readRepoFile, STAGE1_COVERAGE_EXTRA } from './lib/proof.mjs';
import { harnessInfo, readTreeInfo, sha256, sha256File, sha256Text, sourceDigest, sourceVersions, toCrlf, worktreeDigest, writeJson, writeJsonl, writeText } from './lib/records.mjs';
import { caseBoard, carveSet, firstCarvedSet } from './lib/sets.mjs';
import { buildTree, collectSources, ensureTree, listVariants, planTree } from './lib/tree.mjs';
import { parseCases as armCases, publishCommand, publishPlan } from './arm.mjs';
import * as p6 from './phase1/p6-bench.mjs';
import { pairResult } from './identity.mjs';
import {
  caseSums, counterVerdict, epochDirty, kernelCorpus, kernelItems, kernelRows, loggedCases, loggedProfileCases, parseCases, PROFILE_NOTE, profileItems, profileRows,
  profileOutDir, profileTimes, profileVerdict, R4_FIELDS, rebuildProfiles, renderKernel, SUBSETS_PER_CASE,
} from './kernel-probe.mjs';
import { buildWidthReport, CONTEXT, loggedWidth, machineInfo, widthDispatch, widthItems, widthRows, widthStats, widthVerdict } from './width-probe.mjs';
import { linkSummary, timelineProblem } from './linkage.mjs';
import { buildInventory, readFamilies } from './pm1-inventory.mjs';
import { computePriorS3, familyShare, pilotShare } from './fit-prior-s3.mjs';
import { compareSnapshot, snapshotEntries, verifySnapshot } from './snapshot.mjs';
import { baselineVerdict, buildStepReceipt, captureStepInputs, expandManifest, IDENTITY_SEEDS, identityVerdict, judgeStage1, liveExpectation, main as checkMain, parityVerdict, pm4GateEvidence, pm4Verdict, priorVerdict, replayVerdict, stage1Expectation, stage1Inputs, stage1Verdict, stepEvidence, stepExpectation } from './v4-check.mjs';

const SELFTEST_DIR = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'selftest');
const GIT_CALL = /(?:execFileSync|execSync|spawnSync|spawn|execFile|exec|fork)\(\s*['"`]git(?:\.exe)?\b|(?:^|[;|({&]|\$\(|@\()\s*&?\s*git(?:\.exe)?\s+(?:-C\s+(?:"[^"]*"|'[^']*'|\S+)\s+)?(?:rev-parse|status|log|diff|show|add|commit|push|ls-files)\b/m;
/** The one file the guard exempts (the README's exception to "No git"): its two read-only calls must still match. */
const GIT_EXCEPTION = 'tools/ig-proto/phase1/p6-bench.ps1';
/** The guard's sample texts, `[text, expected]` pairs, kept in a file the scan does not select (N-V4-20). */
const GIT_GUARD_CASES = join(IG_DIR, 'data', 'git-guard-cases.json');

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
      let exempted = 0;
      for (const path of scanned) {
        const found = GIT_CALL.test(readFileSync(path, 'utf8'));
        if (rel(path) === GIT_EXCEPTION) {
          assert(found, `${GIT_EXCEPTION} no longer matches the guard: the exception would hide nothing`);
          exempted += 1;
          continue;
        }
        assert(!found, `${rel(path)} contains a call that starts git`);
      }
      assert(exempted === 1, `the guard's exception ${GIT_EXCEPTION} was scanned ${exempted} times`);
      const samples = JSON.parse(readFileSync(GIT_GUARD_CASES, 'utf8'));
      assert(Array.isArray(samples) && samples.length === 11
        && samples.every((s) => Array.isArray(s) && s.length === 2 && typeof s[0] === 'string' && typeof s[1] === 'boolean'),
      `${rel(GIT_GUARD_CASES)} must hold eleven [text, expected] pairs`);
      for (const [text, hit] of /** @type {[string, boolean][]} */ (samples)) {
        assert(GIT_CALL.test(text) === hit, `the guard on ${JSON.stringify(text)}: expected ${hit}`);
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
      assert(approved.decision === 'go' && approved.horizonS === 545 && approved.roundCapS === 600,
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

/**
 * The `process items:` cases (V4-T10b): a fresh task `proc-<n>` of the label `selftest`, children that are `node -e` programs
 * (no rating), output folders under the task's `out/`.
 * @param {number | string} n
 * @param {string} [step]
 * @returns {{ task: string, root: string, dir: string, log: string, state: string }}
 */
function procFolder(n, step = 'items') {
  const task = `proc-${n}`;
  const root = fresh(artifactDir('selftest', task));
  const dir = artifactDir('selftest', task, step);
  return { task, root, dir, log: join(dir, 'items.jsonl'), state: join(dir, 'state.json') };
}

/** @param {number | string} n @param {string} id @param {string[]} argv @returns {any} A process item of the task `proc-<n>`. */
const procItem = (n, id, argv) => ({
  id, kind: 'process', variant: 'base', payload: { outDir: rel(join(artifactDir('selftest', `proc-${n}`), 'out', id)), argv },
});

/** @param {number | string} n @param {any[]} items @param {Record<string, any>} [extra] @returns {ReturnType<typeof runProcessItems>} */
const procRun = (n, items, extra = {}) => runProcessItems({
  task: `proc-${n}`, step: 'items', label: 'selftest', horizonS: 285, items, reserveS: 1, identity: itemId(items), ...extra,
});

/** The program of a child that appends its id (argument 2) to a marker file (argument 1): proves that a child ran. */
const MARK = "require('fs').appendFileSync(process.argv[1], process.argv[2] + '\\n')";

/** @param {string} task @param {string} caseId @returns {string} A profile item's output folder under the label `selftest`. */
const profileOutDirOf = (task, caseId) => profileOutDir(task, caseId, 'selftest');

/** The scripted worker file of the `width:` cases (V4-T10c): the width protocol without an engine, so without a rating. */
const WIDTH_TEST_WORKER = join(IG_DIR, 'lib', 'width-worker-test.mjs');

/** @param {number} ms @returns {Promise<void>} */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @param {number | string} n @returns {{ task: string, root: string, log: string, state: string }} The emptied folders of the case `width-<n>`. */
function widthFolder(n) {
  const task = `width-${n}`;
  const root = fresh(artifactDir('selftest', task));
  const dir = artifactDir('selftest', task, 'run');
  return { task, root, log: join(dir, 'items.jsonl'), state: join(dir, 'state.json') };
}

/** @param {string} id @param {number} width @param {number} [rounds] @returns {any} A width item of a scripted case. */
const widthItem = (id, width, rounds = 2) => ({ id, kind: 'width', variant: 'base', payload: { caseId: 'c', width, rounds } });

/**
 * Runs width items through `runCustomItems` and `widthDispatch` on the scripted worker, in the scratch task `width-<n>`; each
 * item gets its own shared counters (the layout is in lib/width-worker-test.mjs), which the case reads after the call.
 * @param {number | string} n
 * @param {any[]} items
 * @param {(item: any) => string | string[]} scriptOf The script of an item's workers.
 * @param {Record<string, any>} [extra] Options of `runCustomItems` that replace the defaults.
 * @returns {Promise<{ out: Awaited<ReturnType<typeof runCustomItems>>, shared: Map<string, Int32Array>, log: string }>}
 */
async function widthRun(n, items, scriptOf, extra = {}) {
  /** @type {Map<string, Int32Array>} */
  const shared = new Map();
  const out = await runCustomItems({ task: `width-${n}`, step: 'run', label: 'selftest', horizonS: 285, items, reserveS: 1, identity: itemId(items), ...extra },
    (item, { cutAtS }) => {
      const counters = new Int32Array(new SharedArrayBuffer(4 * 64));
      shared.set(item.id, counters);
      const { caseId, width, rounds } = item.payload;
      return widthDispatch({
        workerFile: WIDTH_TEST_WORKER, width, cutAtS,
        workerData: { treeRoot: 'unused', items: [{ caseId }, { caseId }, { caseId }], rounds, script: scriptOf(item), shared: counters },
      });
    });
  return { out, shared, log: join(artifactDir('selftest', `width-${n}`, 'run'), 'items.jsonl') };
}

/**
 * @param {Int32Array} shared The counters of a scripted dispatch that has returned.
 * @returns {Promise<number[]>} The heartbeats of its workers (the entries 2 to 17). A worker that was not terminated keeps
 *   beating, so they must not move after the call.
 */
async function stoppedBeats(shared) {
  const first = [...shared.slice(2, 18)];
  await sleep(200);
  same([...shared.slice(2, 18)], first, 'a worker is still alive after the call: its heartbeat moved');
  return first;
}

/** @param {() => Promise<unknown>} fn @returns {Promise<string>} The message `fn` rejects with; empty when it does not. */
async function rejectedBy(fn) {
  try {
    await fn();
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  return '';
}

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

/**
 * @param {string[]} args
 * @param {Parameters<typeof checkMain>[1]} [io] The seam of `main` (T09c).
 * @returns {Promise<{ code: number, out: string, err: string }>} `v4-check`'s `main` with its output captured.
 */
async function runCheck(args, io = {}) {
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
    return { code: await checkMain(args, io), ...text };
  } finally {
    [stdout.write, stderr.write] = writes;
  }
}

/** What `linkSummary` reports for a journal without closure lines (V4-T06b). */
const NO_CLOSURE_LINES = Object.freeze({
  setCompletes: 0, completionDispatches: 0, completionCompletes: 0, workerEndRequests: 0, workerEnds: 0, workerEndFailures: 0,
  completionKeyMismatches: 0,
});

/**
 * The row level of the admission statistics (V4-T09a) and the synthetic rows of its cases, loaded on first use so that
 * the other groups do not need the frozen source: `v` is `verdicts.mjs`, `rec(over)` a run record of the frozen
 * `newRunRecord` (case `c`, seed `s`), `keysOf(seed, n)` the default puzzle keys and `row(rep, seed, spec)` a published
 * row of case `c`; by default every row with positive `accepted` has complete per-puzzle evidence (`clues` or `n`
 * times `clue`, `K`, `keys`), and `over` replaces any field of the run record.
 * @returns {Promise<{ v: any, rec: (over?: Record<string, any>) => any, keysOf: (seed: string, n: number) => string[],
 *   row: (rep: number, seed: string, spec: { accepted: number, tenth?: number | null, response?: number, setKey?: string | null,
 *   clue?: number, clues?: number[], K?: number, keys?: any, over?: Record<string, any> }) => any }>}
 */
async function verdictKit() {
  if (memo.verdictKit === undefined) {
    const v = await import('./verdicts.mjs');
    const { newRunRecord } = await import(pathToFileURL(join(sourceRoot('frozen'), 'tools', 'bench', 'report.js')).href);
    const rec = (/** @type {Record<string, any>} */ over = {}) => newRunRecord({ caseId: 'c', seed: 's', ...over });
    const keysOf = (/** @type {string} */ seed, /** @type {number} */ n) => Array.from({ length: n }, (_, i) => sha256(`${seed}/${i}`));
    const row = (/** @type {number} */ rep, /** @type {string} */ seed, /** @type {any} */ spec) => {
      const { accepted, tenth = null, response = 60000, setKey = null, clue = 6, clues, K = 12, keys, over = {} } = spec;
      return {
        rowKey: `c~${rep}`, caseId: 'c', rep, seed, localRep: 0,
        run: rec({
          seed, rep, acceptedCount: accepted, tenthReadyMs: tenth, responseMs: response,
          details: {
            igSetKey: setKey, igPuzzleKeys: keys ?? keysOf(seed, accepted), K,
            puzzles: (clues ?? Array(accepted).fill(clue)).map((/** @type {number} */ n) => ({ clues: n })),
          },
          ...over,
        }),
      };
    };
    memo.verdictKit = { v, rec, keysOf, row };
  }
  return memo.verdictKit;
}

/** @param {any} v The `verdicts.mjs` module. @param {any[]} rows Published rows. @returns {any[]} The rows ingested (quantity 10). */
const ingested = (v, rows) => rows.map((r) => v.ingestRow(r, { quantity: 10 }));

/** @param {number} x @param {number} y @returns {boolean} Whether two numbers differ by at most 1e-12 (a geometric mean is `exp` of a mean of logs). */
const near = (x, y) => Math.abs(x - y) <= 1e-12;

/**
 * The frozen-round matrix of the `matrix:` cases (V4-T11a), loaded on first use because `manifest.mjs` imports `verdicts.mjs`
 * (and so the frozen source): `m` is `manifest.mjs`; `data()` a fresh parsed copy of `data/frozen-round-v1.json`, which a case
 * may edit; `expand(inputs, edit)` the expansion of such a copy (default inputs: no control); `pick(groups, where)` the groups
 * whose fields equal `where`; `one(groups, where)` the only such group.
 * @returns {Promise<{ m: any, data: () => any, expand: (inputs?: any, edit?: (data: any) => void) => any,
 *   pick: (groups: any[], where: Record<string, unknown>) => any[], one: (groups: any[], where: Record<string, unknown>) => any }>}
 */
async function matrixKit() {
  if (memo.matrixKit === undefined) {
    const m = await import('./manifest.mjs');
    const data = () => JSON.parse(readFileSync(join(IG_DIR, 'data', 'frozen-round-v1.json'), 'utf8'));
    const pick = (/** @type {any[]} */ groups, /** @type {Record<string, unknown>} */ where) => groups.filter((g) => Object.entries(where).every(([k, v]) => isDeepStrictEqual(g[k], v)));
    memo.matrixKit = {
      m,
      data,
      pick,
      expand: (/** @type {any} */ inputs = { controls: [] }, /** @type {(data: any) => void} */ edit = () => {}) => {
        const d = data();
        edit(d);
        return m.expandMatrix(d, inputs);
      },
      one: (/** @type {any[]} */ groups, /** @type {Record<string, unknown>} */ where) => {
        const found = pick(groups, where);
        assert(found.length === 1, `${found.length} groups for ${JSON.stringify(where)}`);
        return found[0];
      },
    };
  }
  return memo.matrixKit;
}

/**
 * @param {string} caseId @param {number} rep @param {number} [accepted] Puzzles accepted: ten reach ten at 30 s, fewer end at 115 s.
 * @param {Record<string, any>} [over] Fields of the run record that replace these.
 * @returns {Promise<any>} A valid run record of `caseId` (T09a's `newRunRecord`).
 */
async function matrixRun(caseId, rep, accepted = 10, over = {}) {
  const { rec } = await verdictKit();
  return rec({
    caseId, seed: `landscape/${caseId}/${rep}`, rep, acceptedCount: accepted, tenthReadyMs: accepted >= 10 ? 30000 : null,
    responseMs: accepted >= 10 ? 31000 : 115000, ...over,
  });
}

/**
 * The compilation of the `compile:` cases (V4-T11c), made once: the real matrix with today's controls, the synthetic seconds of the
 * Tests table (`v4-select/*` and `v4-replay/*` 30 s, `v4-generate/*` 120 s: no other kind has a measure, so the probes take their
 * reserves) and `compilePlans`' own projected rows. `m` is `manifest.mjs`; no case changes what it returns.
 * @returns {Promise<{ m: any, expansion: any, durations: Record<string, number>, compiled: any, s2: any, live: any,
 *   steps: any[], locked: any[] }>}
 */
async function compileKit() {
  if (memo.compileKit === undefined) {
    const { m, data } = await matrixKit();
    const d = data();
    const expansion = m.expandMatrix(d, { controls: m.controlsFrom(mp12b1Report, d.cells.failingNightmare) });
    const durations = { 'v4-select/*': 30, 'v4-generate/*': 120, 'v4-replay/*': 30 };
    const compiled = m.compilePlans(expansion, m.stepPrice, { durations });
    const s2 = compiled.plans['V4-S2.json'];
    const live = compiled.plans['V4-LIVE.json'];
    const steps = [...s2.steps, ...live.steps];
    memo.compileKit = { m, expansion, durations, compiled, s2, live, steps, locked: steps.filter((/** @type {any} */ s) => s.locked) };
  }
  return memo.compileKit;
}

/** @param {any} step @param {string} flag @returns {string | undefined} The word after the flag in the step's argv; undefined without the flag. */
const argAfter = (step, flag) => {
  const at = step.node.indexOf(flag);
  return at < 0 ? undefined : step.node[at + 1];
};

/**
 * The literal lines of the work-ledger cases (V4-T09c): `S` a call's start, `C` its capability line, `B` a begin line (a
 * rating with the bound 1,000 unless said otherwise), `P` a completed rating (main and census units), `N` a completed
 * uniqueness count, `E` an end line and `W` a worker line of the link file (process 1).
 */
const ledgerLines = () => ({
  S: (/** @type {string} */ call, /** @type {string} */ stage, /** @type {any} */ attempt, /** @type {number} */ at) => ({ t: 'start', call, stage, attempt, at }),
  C: (/** @type {string} */ call) => ({ t: 'caps', call, count: true }),
  B: (/** @type {string} */ call, kind = 'rate', bound = 1000) => ({ t: 'begin', call, kind, bound }),
  P: (/** @type {string} */ call, /** @type {number} */ i, /** @type {number} */ main, /** @type {number} */ census) => ({ t: 'p', call, i, tuple: ['locate', 6, 'in', 60, main, census] }),
  N: (/** @type {string} */ call, /** @type {number} */ units) => ({ t: 'count', call, units }),
  E: (/** @type {string} */ call, /** @type {number} */ work, /** @type {number} */ profiles, /** @type {number} */ countWork, result = 'ok') => ({ t: 'end', call, result, work, profiles, locate: { countWork } }),
  W: (/** @type {string} */ ev, /** @type {number} */ threadId, /** @type {number} */ at) => ({ t: 'link', ev, pid: 1, threadId, at }),
});

/**
 * @param {any} v The `verdicts.mjs` module. @param {(rep: number, seed: string, spec: any) => any} row The `verdictKit` row builder.
 * @param {number} lo @param {number} hi @param {number} accepted @param {number} [terminated]
 * @returns {{ ingested: any, ledger: any }[]} One valid row with `accepted` puzzles whose complete ledger is `[lo, hi]`.
 */
const workArm = (v, row, lo, hi, accepted, terminated = 0) => [{
  ingested: v.ingestRow(row(0, 's0', { accepted, tenth: accepted >= 10 ? 30000 : null }), { quantity: 10 }),
  ledger: { complete: true, problems: [], lo, hi, terminated },
}];

/**
 * A `classVerdict` input over `spec.cells` and the reps 0 to 19 (V4-T09c): by default each row has ten puzzles, the set key
 * `k<rep>` on both arms, 12 clues of `K` 30 and a complete ledger of 100 units; the screen arm's T10 is 30 s and the
 * no-screen arm's 45 s; every cell gate passes. `spec.rows(arm, cell, rep)` returns `undefined` (the default), `null` (no
 * row) or `{ row, ledger, seed }`: overrides of the row's spec, of its ledger (`ledger: null`: no journal) and of its seed
 * (default `s<rep>`); `spec.gates` maps a cell to its gate.
 * @param {{ v: any, row: (rep: number, seed: string, spec: any) => any }} kit
 * @param {{ cells: string[], rows?: (arm: 'screen' | 'noScreen', cell: string, rep: number) => any, gates?: Record<string, string> }} spec
 * @returns {any}
 */
function synthClass({ v, row }, spec) {
  const reps = Array.from({ length: 20 }, (_, i) => i);
  const cells = spec.cells.map((cell) => {
    const side = (/** @type {'screen' | 'noScreen'} */ arm) => {
      /** @type {any[]} */
      const rows = [];
      /** @type {Record<string, any>} */
      const ledgers = {};
      for (const rep of reps) {
        const over = spec.rows?.(arm, cell, rep);
        if (over === null) {
          continue;
        }
        const published = row(rep, over?.seed ?? `s${rep}`, { accepted: 10, tenth: arm === 'screen' ? 30000 : 45000, setKey: `k${rep}`, clue: 12, K: 30, ...over?.row });
        rows.push(v.ingestRow(published, { quantity: 10 }));
        if (over?.ledger !== null) {
          ledgers[published.rowKey] = { complete: true, problems: [], lo: 100, hi: 100, terminated: 0, ...over?.ledger };
        }
      }
      return { rows, ledgers };
    };
    const screen = side('screen');
    const noScreen = side('noScreen');
    return {
      cell, screenRows: screen.rows, noScreenRows: noScreen.rows, screenLedgers: screen.ledgers, noScreenLedgers: noScreen.ledgers,
      screenCellGate: spec.gates?.[cell] ?? 'pass',
    };
  });
  return { cells, reps, resamples: 1000, resampleSeed: 7, quantity: 10, capMs: 120000 };
}

/** The 20 declared reps of the global-verdict cases (V4-T09d). */
const REPS20 = Array.from({ length: 20 }, (_, i) => i);

/** The options of `cellGate` (V4-T09d): a control also needs `todayRows`, a failing cell `journals`. */
const gateOptions = { reps: REPS20, quantity: 10, capMs: 120000, responseBoundMs: 120000, resamples: 1000, resampleSeed: 7 };

/** The fields the linkage adds to a run (T06a): a set at 20 s and ten acceptances. */
const linkedFields = () => ({ igSetMs: 20000, igAcceptedMs: Array.from({ length: 10 }, (_, i) => 30000 + i) });

/**
 * One arm's ingested rows of a cell (V4-T09d): reps 0 to 19, each with ten puzzles and a T10 of 40 s. `rows(rep)` returns
 * `undefined` (the default), `null` (no row) or `{ row, seed }`: overrides of the row's spec and of its seed (`s<rep>`).
 * @param {{ v: any, row: (rep: number, seed: string, spec: any) => any }} kit
 * @param {(rep: number) => any} [rows]
 * @returns {any[]}
 */
function armRows({ v, row }, rows) {
  return REPS20.flatMap((rep) => {
    const over = rows?.(rep);
    return over === null ? [] : [v.ingestRow(row(rep, over?.seed ?? `s${rep}`, { accepted: 10, tenth: 40000, ...over?.row }), { quantity: 10 })];
  });
}

/** @param {any[]} rows @param {any[]} [lines] @returns {Record<string, any>} The journal of every row: no dead end by default. */
const journalsOf = (rows, lines = [{ t: 'phase', call: 'x', phase: 'p1' }, { t: 'phase', call: 'x', phase: 'p3' }]) => Object.fromEntries(rows.map((r) => [r.rowKey, lines]));

/** @param {{ v: any, row: any }} kit @param {(rep: number) => any} [rows] @returns {any[]} Five Master requests (reps 0 to 4) of one side. */
const masterSide = ({ v, row }, rows) => [0, 1, 2, 3, 4].flatMap((rep) => {
  const over = rows?.(rep);
  return over === null ? [] : [v.ingestRow(row(rep, `s${rep}`, { accepted: 10, tenth: 30000, ...over }), { quantity: 10 })];
});

/**
 * One arm's rows of the P5 cell `c` (V4-T09d): reps 0 to 19 at the seed `landscape/c/<rep>`, ten puzzles, linked.
 * `rows(rep)` returns `undefined`, `null` (no row), or `{ row, seed }` as `armRows` does.
 * @param {{ v: any, row: any }} kit
 * @param {(rep: number) => any} [rows]
 * @returns {any[]}
 */
const p5Side = ({ v, row }, rows) => REPS20.flatMap((rep) => {
  const over = rows?.(rep);
  const seed = over?.seed ?? `landscape/c/${rep}`;
  return over === null ? [] : [v.ingestRow(row(rep, seed, { accepted: 10, tenth: 40000, ...over?.row, over: { ...linkedFields(), ...over?.row?.over } }), { quantity: 10 })];
});

/**
 * The final-purpose input of `phase0Verdict` in which every item passes (V4-T09d), built from the results of the
 * functions it judges: five failing cells and a control on their shipped arms, one Master cell, one declared P5 cell of
 * 20 pairs, a class that failed (its cells ran on the no-screen arm) and both required prerequisites. `over` replaces
 * any key.
 * @param {{ v: any, row: any }} kit
 * @param {Record<string, any>} [over]
 * @returns {any}
 */
function greenPhase0(kit, over = {}) {
  const { v } = kit;
  const pass = () => {
    const rows = armRows(kit);
    return v.cellGate('failing', rows, { ...gateOptions, journals: journalsOf(rows) });
  };
  return {
    purpose: 'final',
    classes: [{ id: 'a', verdict: 'failed' }],
    cells: ['14x14', '15x15b10', '12x12', '16x16', '15x20'].map((cell) => ({ cell, ...pass() })),
    controls: [{ cell: '18x18', ...v.cellGate('control', armRows(kit), { ...gateOptions, todayRows: armRows(kit), journals: {} }) }],
    masters: [{ cell: 'm', ...v.masterIdentity(masterSide(kit), masterSide(kit), [0, 1, 2, 3, 4]) }],
    p5: [v.p5Stops(p5Side(kit), p5Side(kit), { quantity: 10, cell: 'c', reps: REPS20 })],
    prerequisites: { stage1: { status: 'pass', reasons: [] }, liveDeadline: { status: 'pass', reasons: [] } },
    ...over,
  };
}

/**
 * An in-memory repository for the cases of the verdict tool (V4-T09e): a path-to-text map and the readers
 * `prerequisites` and `verdictRecords` take (no machine file is read or written).
 * @returns {{ files: Map<string, string>, readFile: (path: string) => string | null, readJson: (path: string) => any, io: any }}
 */
function memoryRepo() {
  /** @type {Map<string, string>} */
  const files = new Map();
  const readText = (/** @type {string} */ path) => files.get(path) ?? null;
  return {
    files,
    readFile: readText,
    readJson: (path) => (files.has(path) ? JSON.parse(/** @type {string} */ (files.get(path))) : null),
    io: {
      readText,
      list: (/** @type {string} */ folder) => [...files.keys()].filter((p) => p.startsWith(`${folder}/`)).sort(),
      harnessHash: 'h-test',
      currentOf: (/** @type {string} */ id) => {
        throw new Error(`no current tree of ${id}`);
      },
    },
  };
}

/**
 * A receipt of the kind in the in-memory repository, accepted into `b/<name>.accepted.json` by `acceptedBinding` as T04f does
 * (producer `harnessHash`, the arm `fr-frozen` at the tree `t1` and the parameters `p1`, one evidence file).
 * @param {ReturnType<typeof memoryRepo>} repo
 * @param {string} name
 * @param {{ kind?: string, fields?: Record<string, unknown>, harnessHash?: string }} [o] By default a live-deadline receipt.
 * @returns {string} The path of the binding.
 */
function boundReceipt(repo, name, { kind = 'live-deadline', fields = { ...LIVE_DEADLINE_FIELDS }, harnessHash = 'h' } = {}) {
  const arms = [{ id: 'fr-frozen', treeId: 't1', paramsHash: 'p1' }];
  repo.files.set('in/a.txt', 'a');
  const receiptPath = `r/${name}.receipt.json`;
  repo.files.set(receiptPath, JSON.stringify(proofEnvelope({
    kind,
    verdict: 'pass',
    source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST },
    harnessHash,
    arms,
    coverage: { expected: ['a'], observed: ['a'], missing: [], censored: [] },
    evidence: [{ path: 'in/a.txt', sha256: sha256Text('a') }],
    fields,
  })));
  const binding = acceptedBinding({ receiptPath, harnessHash, arms, params: {}, coverage: ['a'], fields, by: 'selftest' }, repo.readFile);
  const path = `b/${name}.accepted.json`;
  repo.files.set(path, JSON.stringify(binding));
  return path;
}

/**
 * A synthetic collection in memory for `verdictRecords` (V4-T09e): the cell `c` of the class `k` (screen arm `sa`, no-screen
 * arm `na`) and any further arm of `ids`, reps 0 to 19 at the seeds `landscape/c/<rep>`; each row has ten puzzles, 12 clues of
 * `K` 30, the set key `k<rep>`, a linked timeline and a T10 of 30 s on `sa` and 45 s on every other arm. Each arm has a runs
 * file under its evidence folder and, per row, a worker journal, a link file and a `.row.jsonl` line (which no ledger
 * reads). `rows(arm, rep)` is `undefined`, `null` (no row) or the row's spec; `journal(arm, rep)` is `undefined` (an empty,
 * complete ledger: no call), `null` (no journal files) or `{ worker, link }` (the lines of its two files); `files` are
 * further files of the repository; `manifest` replaces any key of the manifest.
 * @param {{ row: any }} kit
 * @param {{ ids?: string[], rows?: (arm: string, rep: number) => any, journal?: (arm: string, rep: number) => any,
 *   files?: Record<string, string>, manifest?: Record<string, any> }} [spec]
 */
function toolWorld({ row }, { ids = ['sa', 'na'], rows, journal, files = {}, manifest: over = {} } = {}) {
  const repo = memoryRepo();
  const text = (/** @type {any[]} */ lines) => `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`;
  for (const [path, content] of Object.entries(files)) {
    repo.files.set(path, content);
  }
  const arms = ids.map((id) => {
    const published = REPS20.flatMap((rep) => {
      const spec = rows?.(id, rep);
      return spec === null ? [] : [row(rep, `landscape/c/${rep}`, {
        accepted: 10, tenth: id === 'sa' ? 30000 : 45000, setKey: `k${rep}`, clue: 12, K: 30, ...spec, over: { ...linkedFields(), ...spec?.over },
      })];
    });
    const path = `docs/improve-generating/evidence/frozen/TW/${id}/s1.runs.json`;
    const doc = JSON.stringify({ meta: { trees: { [id]: { treeId: `tree-${id}`, params: { id } } } }, shard: 's1', rows: published }, null, 2);
    repo.files.set(path, doc);
    for (const { rowKey, rep } of published) {
      const lines = journal?.(id, rep);
      if (lines !== null) {
        const base = `tests/artifacts/ig-proto/frozen/TW/${id}/s1/logs/${rowKey}`;
        repo.files.set(`${base}.1.1.jsonl`, text(lines?.worker ?? [{ t: 'row', row: rowKey }]));
        repo.files.set(`${base}.link.jsonl`, text(lines?.link ?? [{ t: 'link', ev: 'batch-start' }]));
        repo.files.set(`${base}.row.jsonl`, text([{ t: 'row', row: rowKey }]));
      }
    }
    return { id, task: 'TW', arm: id, variant: id, treeId: `tree-${id}`, files: [{ path, sha256: sha256Text(doc) }] };
  });
  const manifest = {
    task: 'TW', label: 'frozen', purpose: 'selection', quantity: 10, capMs: 120000, responseBoundMs: 120000, resampleSeed: 7, resamples: 1000,
    validationReps: REPS20, masterReps: [], collection: { activation: null, closure: null }, arms,
    classes: [{ id: 'k', cells: ['c'], screen: 'sa', noScreen: 'na' }], failingCells: [], controls: [], masters: [], hell1: [], p5: [],
    deadlineProjection: { arms: ['sa'], reserves: [0.3, 0.5], deadlineMs: 115000 }, prerequisites: {}, ...over,
  };
  const manifestText = JSON.stringify(manifest, null, 2);
  repo.files.set('verdicts/manifest.json', manifestText);
  return { repo, manifest, manifestText, ref: { path: 'verdicts/manifest.json', sha256: sha256Text(manifestText) } };
}

/** The scratch task of the receipt cases (V4-T11d): its raw folder and its evidence folder are removed after each case. */
const RECEIPT_TASK = 'V4-T11d-selftest';

/** @param {() => Promise<void>} body @returns {Promise<void>} Runs `body` on an empty scratch task and removes both of its folders afterwards. */
async function onReceiptTask(body) {
  const drop = () => {
    rmSync(artifactDir('frozen', RECEIPT_TASK), { recursive: true, force: true });
    rmSync(evidenceDir('frozen', RECEIPT_TASK), { recursive: true, force: true });
  };
  drop();
  try {
    await body();
  } finally {
    drop();
  }
}

/**
 * A completed absent-mode row of the receipt cases: its `result` has `digest` and `eventsDigest: null`.
 * @param {string} variant @param {string} caseId @param {string} seedText @param {string} mode @param {string | undefined} digest
 * @param {string} [item] The storage item id (the comparison never reads it).
 * @returns {any}
 */
const rowOf = (variant, caseId, seedText, mode, digest, item = `x:${variant}:${caseId}:${seedText}:${mode}`) => ({
  item, variant, caseId, seedText, mode, route: 'new', status: 'completed', result: { digest, eventsDigest: null },
});

const RECEIPT_CASE = '12x12-nightmare';
const RECEIPT_SEED = `ig-v4/parity/${RECEIPT_CASE}`;
/** The manifest rows of the receipt cases: `v4` in the three modes and `base` in two, on one case (a passing parity block). */
const PARITY_ROWS = [
  { kind: 'v4-select', variant: 'v4', caseId: RECEIPT_CASE, seedText: RECEIPT_SEED, modes: ['absent', 'charge', 'record'] },
  { kind: 'v4-select', variant: 'base', caseId: RECEIPT_CASE, seedText: RECEIPT_SEED, modes: ['absent', 'record'] },
];
/** Rows that add one generation item and two replays of `v4` (a P-1 pass has them, a P-0 pass has none). */
const REPLAY_ROWS = [
  { kind: 'v4-generate', variant: 'v4', caseId: RECEIPT_CASE, seedText: `ig-v4/replay/${RECEIPT_CASE}`, quantity: 2 },
  { kind: 'v4-replay', variant: 'v4', caseId: RECEIPT_CASE, seedText: `ig-v4/replay/${RECEIPT_CASE}`, puzzles: 2 },
];

/**
 * The results of the synthetic steps: passing parity rows (`over(item)` replaces fields of a selection result), a
 * generation that obtained two puzzles and the replays of kinds `replays`, each matched with a measuring step.
 * @param {{ over?: (item: any) => Record<string, any>, replays?: string[] }} [o]
 * @returns {(item: any) => any}
 */
const goodResults = ({ over = () => ({}), replays = ['calibration', 'candidate'] } = {}) => (item) => {
  if (item.kind === 'v4-select') {
    return item.variant === 'base'
      ? checkRow(item.payload.mode, { ledger: null, ...over(item) }, { variant: 'base', route: 'base' }).result
      : checkRow(item.payload.mode, over(item)).result;
  }
  if (item.kind === 'v4-generate') {
    return { outcome: 'ok', puzzles: 2, packSha256: 'h' };
  }
  return { outcome: 'ok', kind: replays[item.payload.puzzleIndex], status: 'matched', detailStep: 3, packSha256: 'h' };
};

/**
 * A synthetic step folder of the scratch task (V4-T11d): the manifest in the raw folder, a `state.json` whose identity
 * carries the manifest's hash, the frozen commit and digest, the tree ids and the harness hash, and an `items.jsonl` with
 * an `item-start` and an `item-end` (completed, with the result) per item.
 * @param {string} step
 * @param {any[]} rows The manifest rows.
 * @param {(item: any) => any} resultOf The result of an item; `undefined` leaves the item without an end line.
 * @param {{ treeIds?: Record<string, string>, harnessHash?: string, statusOf?: (item: any) => 'completed' | 'censored' | 'error' }} [identity]
 *   Replace the stored tree ids (default: `base` and `v4` as built now) and the stored harness hash (default: today's); `statusOf`
 *   gives the status of an item's end line (default `completed`).
 * @returns {Promise<{ dir: string, path: string, manifest: string, items: any[], identity: any }>} `manifest` is the repository-relative path.
 */
async function receiptStep(step, rows, resultOf, { treeIds, harnessHash, statusOf = () => 'completed' } = {}) {
  const dir = fresh(artifactDir('frozen', RECEIPT_TASK, step));
  const path = join(dir, 'manifest.json');
  writeJson(path, { format: 'ig-proto-items', version: 1, task: RECEIPT_TASK, step, rows });
  const items = expandManifest(JSON.parse(readFileSync(path, 'utf8')), dir, (variant) => variant !== 'base');
  const identity = {
    frozenCommit: FROZEN_COMMIT,
    sourceDigest: FROZEN_DIGEST,
    treeIds: treeIds ?? { base: (await ensureTree('base')).treeId, v4: (await ensureTree('v4')).treeId },
    harnessHash: harnessHash ?? harnessInfo().harnessHash,
    manifestHash: manifestHash(items),
  };
  writeJson(join(dir, 'state.json'), { format: 'ig-proto-state', version: 1, task: RECEIPT_TASK, step, label: 'frozen', identity, done: true });
  const hash = identityHash(identity);
  for (const item of items) {
    logStart(join(dir, 'items.jsonl'), hash, item);
    const result = resultOf(item);
    if (result !== undefined) {
      logEnd(join(dir, 'items.jsonl'), hash, item.id, statusOf(item), result, 5);
    }
  }
  return { dir, path, manifest: rel(path), items, identity };
}

/**
 * A synthetic stage-1 baseline (V4-T11d): a parity step of the scratch task whose stored identity names other tree ids
 * and another harness than today's, and an accepted binding over a receipt that lists its `state.json` and `items.jsonl`,
 * holding the parameters of `base` and `v4` as built now (`params` replaces them).
 * @param {{ name?: string, rows?: any[], resultOf?: (item: any) => any, params?: Record<string, unknown> }} [o] `name` is the baseline's step.
 */
async function baselineWorld({ name = 'baseline', rows = PARITY_ROWS, resultOf = goodResults(), params } = {}) {
  const step = await receiptStep(name, rows, resultOf, { treeIds: { base: 'old-base', v4: 'old-v4' }, harnessHash: 'old-harness' });
  const files = ['items.jsonl', 'state.json'].map((file) => join(step.dir, file));
  const receiptFile = join(step.dir, 'stage1.receipt.json');
  writeJson(receiptFile, proofEnvelope({
    kind: 'stage1',
    verdict: 'pass',
    source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST },
    harnessHash: 'old-harness',
    arms: [],
    coverage: { expected: ['a'], observed: ['a'], missing: [], censored: [] },
    evidence: files.map((file) => ({ path: rel(file), sha256: sha256File(file) })),
    fields: { line: 'Stage 1: holds.' },
  }));
  const bound = params ?? { base: (await ensureTree('base')).params, v4: (await ensureTree('v4')).params };
  const bindingFile = join(step.dir, 'accepted-binding.json');
  writeJson(bindingFile, acceptedBinding({
    receiptPath: rel(receiptFile), harnessHash: 'old-harness', arms: [], params: bound, coverage: ['a'], fields: { line: 'Stage 1: holds.' }, by: 'selftest',
  }));
  return { step, files, receiptFile, bindingFile, binding: rel(bindingFile), baselineStep: { task: RECEIPT_TASK, step: name, manifest: step.manifest } };
}

/** @param {string[]} paths @returns {string[]} The raw SHA-256 of each file. */
const rawHashes = (paths) => paths.map((path) => sha256File(path, { raw: true }));

/**
 * @param {() => Promise<number>} run
 * @returns {Promise<{ code: number, out: string, err: string }>} The exit code a command returns, with what it wrote to stdout and stderr.
 */
async function captureOutput(run) {
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
    return { code: await run(), ...text };
  } finally {
    [stdout.write, stderr.write] = writes;
  }
}

/**
 * The fixture of the fit-reader command cases (T02c): the plan `V4-XX` (arm `a`: shard `pilot-x`, `x:0-4`; arm `b`: `pilot-y`), the
 * published runs of the five fitting rows of `x` (T02b's preview case), the raw shard folder with its declaration, row identities,
 * journals and linkage, and MP12b1's report of `x`.
 * @param {string} dir The fixture folder, emptied first.
 * @returns {Promise<any>}
 */
async function fitFixture(dir) {
  fresh(dir);
  const L = ledgerLines();
  const reps = [0, 1, 2, 3, 4];
  const after = [10000, 10000, 30000, 80000, 50000];
  const before = [10000, 20000, 30000, 40000, 50000];
  const plansDir = join(dir, 'plans');
  const runsDir = join(dir, 'runs');
  const rawDir = join(dir, 'raw');
  const logs = join(rawDir, 'pilot-x', 'logs');
  mkdirSync(logs, { recursive: true });
  const step = (/** @type {string} */ arm, /** @type {string} */ shard, /** @type {string} */ cases) => ({
    node: ['tools\\ig-proto\\arm.mjs', 'run', '--task', 'V4-XX', '--arm', arm, '--shard', shard, '--cases', cases],
  });
  writeJson(join(plansDir, 'V4-XX.json'), { task: 'V4-XX', steps: [step('a', 'pilot-x', 'x:0-4'), step('b', 'pilot-y', 'y:0-4')] });
  const published = await Promise.all(reps.map(async (r) => ({
    rowKey: `x~${r}`, caseId: 'x', rep: r, seed: `landscape/x/${r}`, localRep: 0,
    run: await matrixRun('x', r, 10, { tenthReadyMs: after[r], responseMs: after[r] }),
  })));
  const today = await Promise.all(reps.map((r) => matrixRun('x', r, 10, { tenthReadyMs: before[r], responseMs: before[r] })));
  writeJson(join(runsDir, 'pilot-x.runs.json'), { meta: { trees: { v: { treeId: 'T', copyDigest: 'C' } }, harness: { harnessHash: 'H' } }, shard: 'pilot-x', rows: published });
  writeText(join(runsDir, 'pilot-x.runs.md'), '# pilot-x');
  writeJson(join(rawDir, 'pilot-x', 'state.json'), { done: true });
  writeJson(join(rawDir, 'pilot-x', 'shard.json'), {
    format: 'ig-proto-shard', version: 1, task: 'V4-XX', arm: 'a', shard: 'pilot-x', variant: 'v',
    rows: reps.map((r) => ({ key: `x~${r}`, caseId: 'x', rep: r, seed: `landscape/x/${r}` })), treeId: 'T', copyDigest: 'C', harnessHash: 'H',
  });
  for (const r of reps) {
    const c = `x~${r}:1:2:1`;
    writeJsonl(join(logs, `x~${r}.row.jsonl`), [{ t: 'row', row: `x~${r}`, seed: `landscape/x/${r}`, caseId: 'x', localRep: 0, pid: 1 }]);
    writeJsonl(join(logs, `x~${r}.1.2.jsonl`), [
      { ...L.S(c, 'set', 0, 10), level: 'nightmare' }, L.C(c), L.B(c), L.P(c, 0, 100, 0), L.B(c), L.P(c, 1, 50, 10), L.E(c, 160, 2, 0),
    ]);
    writeJsonl(join(logs, `x~${r}.link.jsonl`), [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }]);
  }
  writeJson(join(dir, 'mp12b1-x.json'), { runs: today });
  const outDir = join(dir, 'out');
  return {
    dir, outDir, plansDir, runsDir, rawDir, logs, published, today, io: { outDir, plansDir, runsDir, rawDir },
    files: { runs: join(runsDir, 'pilot-x.runs.json'), shard: join(rawDir, 'pilot-x', 'shard.json'), mp12b1: join(dir, 'mp12b1-x.json') },
  };
}

/** @param {string} file @param {(doc: any) => void} edit @returns {void} Rewrites a JSON file after the edit. */
function editJsonFile(file, edit) {
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  edit(doc);
  writeJson(file, doc);
}

/** @param {string} dir @returns {Record<string, string>} The raw SHA-256 of every file below the folder, by relative path. */
function folderHashes(dir) {
  /** @type {Record<string, string>} */
  const hashes = {};
  for (const name of /** @type {string[]} */ (readdirSync(dir, { recursive: true }))) {
    if (statSync(join(dir, name)).isFile()) {
      hashes[name] = sha256File(join(dir, name), { raw: true });
    }
  }
  return hashes;
}

/** @param {(dir: string) => Promise<void>} body @returns {Promise<void>} Runs `body` on an empty scratch folder of the collection cases (V4-T11e) and removes it afterwards. */
async function onCollections(body) {
  const dir = fresh(artifactDir('selftest', 'collections'));
  try {
    await body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The activation of the collection cases (V4-T11e), on the default expansion (today's controls; the synthetic seconds of `compileKit`):
 * `d` a parsed copy of the matrix data, `record(pilots, approvedOptional)` the pure activation record under made-up epoch hashes and
 * `build(record)` the plan and template it yields, with a row of 100 s for every group.
 * @returns {Promise<{ m: any, expansion: any, d: any, controls: string[], record: (pilots?: Record<string, any[]>, approvedOptional?: string[]) => any,
 *   build: (record: any) => { plan: any, template: any } }>}
 */
async function collectionKit() {
  if (memo.collectionKit === undefined) {
    const { m, expansion, durations } = await compileKit();
    const { data } = await matrixKit();
    const d = data();
    const epoch = Object.fromEntries(['data', 'freeze', 'universe'].map((name, i) => [name, { path: `scratch/${name}.json`, sha256: String(i + 1).repeat(64) }]));
    memo.collectionKit = {
      m, expansion, d, controls: m.controlsFrom(mp12b1Report, d.cells.failingNightmare),
      record: (/** @type {Record<string, any[]>} */ pilots = {}, /** @type {string[]} */ approvedOptional = []) => m.activation(expansion, { pilots, approvedOptional, epoch }),
      build: (/** @type {any} */ record) => m.activationPlans(expansion, record, m.stepPrice, { activationSha256: 'c'.repeat(64), durations, rowSOf: () => 100 }),
    };
  }
  return memo.collectionKit;
}

/** @param {string} cell @param {number} tens Valid requests that reach ten (reps 0 on). @param {number} shorts Valid requests that stop short (the reps after). @returns {Promise<any[]>} The pilot runs. */
async function pilotRuns(cell, tens, shorts) {
  const runs = [];
  for (let rep = 0; rep < tens + shorts; rep += 1) {
    runs.push(await matrixRun(cell, rep, rep < tens ? 10 : 6));
  }
  return runs;
}

/**
 * The world of the `activate:` cases that run the command (V4-T11e, V4-T11f) in the scratch folder `dir`: `rowsOf(cell, tens, shorts)` the
 * published pilot rows of a board (`pilotRuns` as rows), `after(cell)` valid rows at the reps after the pilot's, `world(name, files, freeze)` the
 * scratch paths of one activation (the pilots of stage 2, one `pilot-<cell>.runs.json` per entry of `files`, the real universe and data, and a
 * freeze file: by default one class that names exactly the comparator cells of the activation those pilots make, `freeze` replaces its content),
 * `go(paths, ...extra)` the command's output, `written(paths)` the files it wrote and `parse(file)` a JSON file.
 * @param {string} dir
 */
async function activateWorld(dir) {
  const { m, d, record } = await collectionKit();
  const rowOf = (/** @type {string} */ c, /** @type {number} */ rep, /** @type {any} */ run) => ({ rowKey: `${c}~${rep}`, caseId: c, rep, seed: run.seed, localRep: 0, run });
  const rowsOf = async (/** @type {string} */ c, /** @type {number} */ tens, /** @type {number} */ shorts) => (await pilotRuns(c, tens, shorts)).map((run, rep) => rowOf(c, rep, run));
  // Valid requests that reach ten, at the reps after the pilot's 0 to 4: they are no pilot rows.
  const after = async (/** @type {string} */ c) => Promise.all([5, 6, 7].map(async (rep) => rowOf(c, rep, await matrixRun(c, rep, 10))));
  /** @param {string[]} cells @returns {{ classes: any[] }} One class that names the cells. */
  const freezeOf = (cells) => ({ classes: [{ id: 'all', cells, screen: 'fr-frozen', noScreen: 'fr-frozen-none' }] });
  /** @param {Record<string, any[]>} files @returns {string[]} The comparator cells of the activation the pilots of `files` make (the rows after rep 4 and of other cases are not read). */
  const comparatorCellsOf = (files) => record(Object.fromEntries(d.cells.hell1Conditional.map((/** @type {string} */ c) => [c,
    (files[c] ?? []).filter((/** @type {any} */ r) => r.rep >= 0 && r.rep <= 4).map((/** @type {any} */ r) => r.run)]))).comparatorCells.map((/** @type {any} */ c) => c.cell);
  const world = async (/** @type {string} */ name, /** @type {Record<string, any[]>} */ files = {}, /** @type {any} */ freezeContent = freezeOf(comparatorCellsOf(files))) => {
    const root = join(dir, name);
    const freeze = join(root, 'freeze.json');
    writeJson(freeze, freezeContent);
    const pilots = join(root, 'pilots');
    for (const [c, rows] of Object.entries(files)) {
      writeJson(join(pilots, `pilot-${c}.runs.json`), { meta: {}, shard: `pilot-${c}`, rows });
    }
    return {
      activation: join(root, 'activation.json'), plan: join(root, 'V4-S4.json'), template: join(root, 'V4-S4C.template.json'),
      universe: join(IG_DIR, 'plans', 'V4-S4.universe.json'), freeze, data: join(IG_DIR, 'data', 'frozen-round-v1.json'), pilots,
    };
  };
  const go = (/** @type {any} */ paths, /** @type {string[]} */ ...extra) => captureOutput(() => m.activateCommand(['--collection', 'initial', ...extra, '--label', 'frozen', '--source-label', 'x'], paths));
  const written = (/** @type {any} */ paths) => [paths.activation, paths.plan, paths.template].filter((file) => existsSync(file));
  const parse = (/** @type {string} */ file) => JSON.parse(readFileSync(file, 'utf8'));
  return { rowsOf, after, freezeOf, comparatorCellsOf, world, go, written, parse };
}

/** @param {any} plan @returns {any[]} The request-row steps of a plan. */
const rowStepsOf = (plan) => plan.steps.filter((/** @type {any} */ s) => s.id.startsWith('rows-'));

/** @param {any[]} steps @returns {string[]} `<arm>/<cell>~<rep>` of every row the row steps run (their `--arm` and `--cases`). */
const rowsOfSteps = (steps) => steps.flatMap((s) => armCases(String(argAfter(s, '--cases'))).map(({ caseId, rep }) => `${argAfter(s, '--arm')}/${caseId}~${rep}`));

/** @param {any[]} steps @returns {number} The seconds the runner's forecast and `planOf` add for the required locked steps: `projectS + 45 x invocations`. */
const requiredSeconds = (steps) => steps.filter((s) => s.locked && !s.optional).reduce((sum, s) => sum + s.projectS + 45 * s.invocations, 0);

/** @param {unknown} text @returns {boolean} Whether the text is an ISO 8601 time as `toISOString` writes it. */
const isoTime = (text) => typeof text === 'string' && !Number.isNaN(Date.parse(text)) && new Date(text).toISOString() === text;

/** @param {(dir: string) => Promise<void>} body @returns {Promise<void>} Runs `body` on an empty scratch folder of the comparator cases (V4-T11f) and removes it afterwards. */
async function onResolve(body) {
  const dir = fresh(artifactDir('selftest', 'resolve'));
  try {
    await body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The evidence folder of the frozen round, in the paths the readers of the comparator cases look for. */
const FROZEN_EVIDENCE = 'docs/improve-generating/evidence/frozen';

/**
 * The records of the comparator cases (V4-T11f), made fresh in `dir`: `A` the activation of the default collection (no activated board, no
 * approval) written as `activation.json`, a freeze file with two classes (`n` is admitted and ships `fr-frozen` on every comparator cell but
 * `26x26-hell-1`, `h` fails and ships `fr-frozen-none` there), the comparator template of A built over the `sha256File` of its file, and the
 * published runs of the arms in memory (`mem`, which `read` and `list` serve before the repository, so that nothing is written under the
 * evidence folder): `receipt(over)` is T09e's `classSelection` over A's declared rows, `expectation(closure)` T11f's `selectionExpectation` of
 * the same records, `closeRows(missing)` the closure T11e's `close` writes beside A for exactly those rows.
 * @param {string} dir
 */
async function resolveWorld(dir) {
  const { m, expansion, durations } = await compileKit();
  const { v } = await verdictKit();
  const ref = (/** @type {string} */ file) => ({ path: rel(file), sha256: sha256File(file) });
  const comparatorCells = expansion.groups.filter((/** @type {any} */ g) => g.comparator && g.collection === 'initial').map((/** @type {any} */ g) => g.cell);
  const freeze = {
    classes: [
      { id: 'n', cells: comparatorCells.filter((/** @type {string} */ c) => c !== '26x26-hell-1'), screen: 'fr-frozen', noScreen: 'fr-frozen-none' },
      { id: 'h', cells: ['26x26-hell-1'], screen: 'fr-frozen', noScreen: 'fr-frozen-none' },
    ],
  };
  const freezeFile = join(dir, 'freeze.json');
  writeJson(freezeFile, freeze);
  const freezeRef = ref(freezeFile);
  const activation = m.activation(expansion, {
    pilots: {}, approvedOptional: [],
    epoch: { data: ref(join(IG_DIR, 'data', 'frozen-round-v1.json')), freeze: freezeRef, universe: ref(join(IG_DIR, 'plans', 'V4-S4.universe.json')) },
  });
  const activationFile = join(dir, 'activation.json');
  writeJson(activationFile, activation);
  const activationRef = ref(activationFile);
  const { template } = m.activationPlans(expansion, activation, m.stepPrice, { activationSha256: activationRef.sha256, durations, rowSOf: () => 100, activationPath: activationRef.path });
  const templateFile = join(dir, 'V4-S4C.template.json');
  writeJson(templateFile, template);
  /** One tree per arm, as `meta.trees.<variant>` of a runs file carries it (the variant of an arm is its id). */
  const trees = Object.fromEntries(['fr-frozen', 'fr-frozen-none', 'log-link', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'].map((id) => [id, { treeId: `tree-${id}`, copyDigest: `copy-${id}`, edits: [], params: { id } }]));
  /** @type {Map<string, string>} */
  const mem = new Map();
  const read = (/** @type {string} */ path) => (mem.has(path) ? /** @type {string} */ (mem.get(path)) : readRepoFile(path));
  const list = (/** @type {string} */ folder) => [...mem.keys()].filter((k) => k.startsWith(`${folder}/`) && !k.slice(folder.length + 1).includes('/')).map((k) => k.slice(folder.length + 1)).sort();
  /** Publishes the runs file `<name>` of an arm in memory; `over` replaces its fields. */
  const publish = (/** @type {string} */ task, /** @type {string} */ arm, /** @type {string} */ name, /** @type {Record<string, any>} */ over = {}) => {
    const path = `${FROZEN_EVIDENCE}/${task}/${arm}/${name}.runs.json`;
    mem.set(path, JSON.stringify({ meta: { trees: { [arm]: trees[arm] } }, shard: name, rows: [], ...over }));
    return path;
  };
  for (const arm of ['fr-frozen', 'fr-frozen-none', 'log-link']) {
    publish('V4-S4', arm, 'val-14x14-nightmare');
  }
  publish('V4-S4', 'fr-frozen', 'val-26x26-hell-1');
  const armOf = (/** @type {string} */ id) => ({ id, treeId: trees[id].treeId, paramsHash: sha256(JSON.stringify(trees[id].params)) });
  /** @param {{ record: any, ref: any } | null} [closure] */
  const expectation = (closure = null) => m.selectionExpectation({
    activation, activationSha256: activationRef.sha256, closure: closure?.record ?? null, closureSha256: closure?.ref.sha256 ?? null, freeze,
    runsMeta: { 'fr-frozen': trees['fr-frozen'], 'fr-frozen-none': trees['fr-frozen-none'] }, harnessHash: 'h-test',
  });
  /**
   * @param {{ closure?: { record: any, ref: any } | null, omit?: string[], classes?: any[], arms?: any[], harnessHash?: string }} [over] `omit`: declared rows that are
   *   not published; the rows of a closure are not published either.
   */
  const receipt = ({ closure = null, omit = [], classes = freeze.classes, arms, harnessHash = 'h-test' } = {}) => {
    const closed = closure?.record.missing ?? [];
    return v.classSelection({ classes }, classes.map((c) => ({ id: c.id, verdict: c.id === 'h' ? 'failed' : 'admitted', decidedBy: c.id === 'h' ? 'clue' : null })), {
      files: [activationRef, freezeRef, ...(closure === null ? [] : [closure.ref])],
      published: activation.declaredRows.filter((/** @type {string} */ row) => !omit.includes(row) && !closed.includes(row)), declared: activation.declaredRows,
      activation: activationRef, closure: closure === null ? null : { ...closure.ref, missing: closure.record.missing }, freeze: freezeRef,
      arms: arms ?? ['fr-frozen', 'fr-frozen-none'].map(armOf), harnessHash,
    });
  };
  /** Runs T11e's `close` over published runs of every declared row but `missing`; its closure stands beside the activation record. */
  const closeRows = async (/** @type {string[]} */ missing) => {
    const runs = fresh(join(dir, 'runs'));
    /** @type {Record<string, string[]>} */
    const keys = {};
    for (const row of activation.declaredRows.filter((/** @type {string} */ r) => !missing.includes(r))) {
      const at = row.indexOf('/');
      (keys[row.slice(0, at)] ??= []).push(row.slice(at + 1));
    }
    for (const [arm, rows] of Object.entries(keys)) {
      writeJson(join(runs, arm, 'all.runs.json'), { meta: {}, shard: 'all', rows: rows.map((rowKey) => ({ rowKey })) });
    }
    const closureFile = join(dir, 'closure.json');
    rmSync(closureFile, { force: true });
    const out = await captureOutput(() => m.closeCommand(['--collection', 'initial', '--reason', 'the owner stops at the ceiling', '--label', 'frozen', '--source-label', 'x'], { activation: activationFile, closure: closureFile, runs }));
    assert(out.code === 0 && out.out === `closure: ${missing.length} missing rows\n`, `the closure: exit ${out.code}, ${JSON.stringify(out.out)} ${JSON.stringify(out.err)}`);
    return /** @type {{ record: any, ref: any }} */ (m.closureOf(activationRef.path, activationRef.sha256));
  };
  return {
    m, v, expansion, activation, activationFile, activationRef, freeze, freezeFile, freezeRef, template, templateFile, trees, mem, read, list, publish, expectation, receipt, closeRows,
    selectionFile: join(dir, 'class-selection.json'),
  };
}

/**
 * A synthetic P7 run with a valid log (stages 2 to 4 pack, T03b): the declaration as `declareRun` shapes it, a state whose identity
 * matches, a start and an end line per item and the corpus the verdict functions are given. An equality run (`V4-P7E-p7-x-quick`)
 * has the kernel item `n0` and the seven memory items; a timing run (`V4-P7`) has the 90 items `t0` to `t89`.
 * @param {{ time?: boolean, identity?: Record<string, unknown>, omit?: string[] }} [o]
 *   `identity` overrides the state's identity (every line is hashed from the result); `omit` removes items from the declaration,
 *   the state and the log, but not from the corpus.
 * @returns {Promise<{ declaration: any, lines: any[], state: any, expected: any, manifest: any, corpus: any }>}
 */
async function p7Run({ time = false, identity = {}, omit = [] } = {}) {
  const { memoryManifest, runtimeItems } = await import('./p7-probe.mjs');
  const manifest = memoryManifest();
  const limit = 33554432;
  const workspace = 167772160;
  const representationOf = (/** @type {string} */ expect) => (expect === 'model-too-large' ? null : expect);
  const listBytesOf = (/** @type {any} */ f, /** @type {string} */ expect) => (expect === 'lists' ? f.listBytes : expect === 'reference' ? 0 : null);
  const stepOf = (/** @type {string} */ setting, /** @type {any} */ f, /** @type {string} */ expect, /** @type {number} */ memoryBytes, /** @type {number} */ capacityBytes) => ({
    setting,
    same: true,
    representation: representationOf(expect),
    listBytes: listBytesOf(f, expect),
    wsBytes: f.arenaBytes + f.refBytes,
    capacityBytes,
    memoryBytes,
    referenceError: null,
    candidateError: null,
  });
  const fixtureOf = (/** @type {string} */ id) => manifest.fixtures.find((f) => f.id === id);
  const done = { outcome: 'ok', same: true, differing: [] };
  /** @type {{ id: string, kind: string, variant: string, payload: any, result: any }[]} */
  const all = [];
  if (time) {
    for (let i = 0; i < 90; i += 1) {
      all.push({ id: `t${i}`, kind: 'p7-time', variant: 'p7-x', payload: { otherTree: 't', inputTree: 'ti' }, result: { outcome: 'ok', refMs: 104, candMs: 100, same: true } });
    }
  } else {
    all.push({
      id: 'n0',
      kind: 'p7-equal',
      variant: 'p7-x',
      payload: { source: 'kernel', otherTree: 't', inputTree: 'ti' },
      result: {
        ...done,
        refBytes: 1000,
        steps: [{ setting: 'canonical', same: true, representation: 'lists', listBytes: 10, wsBytes: 5000, capacityBytes: workspace, memoryBytes: limit, referenceError: null, candidateError: null }],
      },
    });
    for (const f of manifest.fixtures) {
      all.push({
        id: `m:${f.id}`,
        kind: 'p7-equal',
        variant: 'p7-x',
        payload: { source: 'memory', fixture: f.id, otherTree: 't' },
        result: { ...done, refBytes: f.refBytes, steps: [stepOf('fixture', f, f.canonical, limit, workspace)] },
      });
    }
    all.push({
      id: 'm:sequence',
      kind: 'p7-equal',
      variant: 'p7-x',
      payload: { source: 'memory-sequence', otherTree: 't' },
      result: { ...done, refBytes: null, steps: manifest.sequence.map((s, i) => stepOf(`seq-${i}`, fixtureOf(s.fixture), s.expect, s.memoryBytes, workspace)) },
    });
    all.push({
      id: 'm:capacity',
      kind: 'p7-equal',
      variant: 'p7-x',
      payload: { source: 'memory-capacity', otherTree: 't' },
      result: { ...done, refBytes: null, steps: manifest.capacity.map((c, i) => stepOf(`cap-${i}`, fixtureOf(c.fixture), c.expect, c.memoryBytes, c.capacityBytes)) },
    });
  }
  const strip = (/** @type {typeof all} */ list) => list.map(({ id, kind, variant, payload }) => ({ id, kind, variant, payload }));
  const kept = all.filter((i) => !omit.includes(i.id));
  const items = strip(kept);
  const input = { path: time ? 'b.json' : 'a.json', sha256: time ? 'B' : 'A' };
  const constructor = { variant: 'instr', treeId: 'TI', copyDigest: 'CI', root: 'ri', rule: 'kernel-window-v1' };
  const declaration = {
    format: 'ig-p7-experiment',
    version: 1,
    task: time ? 'V4-P7' : 'V4-P7E-p7-x-quick',
    step: time ? 'time-p7-x' : 'equal',
    command: time ? 'time' : 'equal',
    candidate: { variant: 'p7-x', treeId: 'T1', copyDigest: 'C1', root: 'r' },
    reference: { variant: 'base', treeId: 'T0', copyDigest: 'C0', root: 'r0' },
    tier: time ? null : 'quick',
    rounds: time ? 3 : null,
    inputConstructor: structuredClone(constructor),
    corpus: { version: 'p7-corpus-v1', inputs: [{ ...input }] },
    producer: { frozenCommit: 'f', sourceDigest: 's', harnessHash: 'h' },
    items,
  };
  const stateIdentity = {
    frozenCommit: 'f', sourceDigest: 's', treeIds: { 'p7-x': 'T1' }, harnessHash: 'h', manifestHash: manifestHash(runtimeItems(structuredClone(items))), ...identity,
  };
  const hash = identityHash(/** @type {any} */ (stateIdentity));
  const at = '2026-01-01T00:00:00.000Z';
  /** @type {any[]} */
  const lines = [];
  for (const item of kept) {
    lines.push({ type: 'item-start', identityHash: hash, item: item.id, kind: item.kind, variant: item.variant, at });
    lines.push({ type: 'item-end', identityHash: hash, item: item.id, status: 'completed', result: structuredClone(item.result), ms: 1, at });
  }
  return {
    declaration,
    lines,
    state: { identity: stateIdentity },
    expected: time ? { task: 'V4-P7', candidate: 'p7-x' } : { task: 'V4-P7E-p7-x-quick', candidate: 'p7-x', tier: 'quick' },
    manifest,
    corpus: {
      items: strip(all),
      counts: time ? { kernel: 0, pm4: 0, memory: 0, time: 90 } : { kernel: 1, pm4: 0, memory: 7, time: 0 },
      inputs: [{ ...input }],
      inputConstructor: structuredClone(constructor),
    },
  };
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
      w.write({ kind: 'deadline-projection' });
      const unwritten = join(w.dir, 'new-binding.json');
      const kind = await runCheck(['accept', '--task', 'V4-T04', '--receipt', rel(w.receiptFile), '--binding', rel(unwritten), ...common]);
      assert(kind.code === 1 && kind.err === 'v4-check: accept knows the kinds stage1, parity, p0-identity, live-deadline\n' && !existsSync(unwritten), `another kind: exit ${kind.code}, ${JSON.stringify(kind.err)}`);
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
  {
    name: 'items: per-set prior verdict',
    run() {
      const candidate = (/** @type {number | null} */ igPrior, algo = 'gen-v4-proto:v4-ps') => ({ schema: 1, kind: 'candidate', igPrior, versions: { algo } });
      const gen = (/** @type {Record<string, any>} */ over = {}) => replayRow('gen', 'completed', {
        outcome: 'ok', batchStatus: 'complete', reason: null, puzzles: 3, made: ['calibration', 'candidate', 'candidate'],
        calibrationWindow: { wc: 6 }, madeRecords: [{ schema: 1, kind: 'calibration' }, candidate(6), candidate(6)], packSha256: 'h', ...over,
      }, { step: 'prior-gen' });
      const replays = () => [[0, 'calibration'], [1, 'candidate'], [2, 'candidate']].map(([i, kind]) => {
        const row = replayed(/** @type {number} */ (i), /** @type {string} */ (kind), 'matched');
        return { ...row, item: row.item.replace('replay:', 'prior-replay:') };
      });
      const start = (/** @type {number} */ priorCount, K = 30) => ({ t: 'start', stage: 'batch', K, priorCount });
      const starts = () => [start(6), start(6)];
      const pass = priorVerdict([gen(), ...replays()], starts());
      assert(pass.verdict === 'pass' && pass.reasons.length === 0 && pass.rows.length === 4, `the prior reached every candidate: ${pass.verdict} ${JSON.stringify(pass.reasons)}`);
      const other = priorVerdict([gen({ madeRecords: [{ schema: 1, kind: 'calibration' }, candidate(6), candidate(5)] }), ...replays()], starts());
      assert(other.verdict === 'fail' && hasReason(other.reasons, 'candidate 1: igPrior 5 differs from the calibration\'s window count 6'), `a candidate with another prior: ${other.verdict} ${JSON.stringify(other.reasons)}`);
      const started = priorVerdict([gen(), ...replays()], [start(6), start(4)]);
      assert(started.verdict === 'fail' && hasReason(started.reasons, 'start line 1: priorCount 4, expected 6'), `a call that started elsewhere: ${started.verdict} ${JSON.stringify(started.reasons)}`);
      const noPack = priorVerdict([gen({ outcome: 'no-pack', batchStatus: 'partial', calibrationWindow: undefined, madeRecords: undefined, packSha256: undefined }),
        ...replays().map((row) => ({ ...row, result: { outcome: 'no-record', reason: 'no pack' } }))], []);
      assert(noPack.verdict === 'incomplete' && hasReason(noPack.reasons, 'outcome no-pack'), `no pack: ${noPack.verdict} ${JSON.stringify(noPack.reasons)}`);
      const clamped = priorVerdict([gen({ calibrationWindow: { wc: 40 }, madeRecords: [{ schema: 1, kind: 'calibration' }, candidate(40), candidate(40)] }), ...replays()], [start(28), start(28)]);
      assert(clamped.verdict === 'pass', `a window count above K - 2 starts at K - 2: ${clamped.verdict} ${JSON.stringify(clamped.reasons)}`);
      const unclamped = priorVerdict([gen({ calibrationWindow: { wc: 40 }, madeRecords: [{ schema: 1, kind: 'calibration' }, candidate(40), candidate(40)] }), ...replays()], [start(40), start(28)]);
      assert(unclamped.verdict === 'fail' && hasReason(unclamped.reasons, 'start line 0: priorCount 40, expected 28'), `a start above K - 2: ${unclamped.verdict} ${JSON.stringify(unclamped.reasons)}`);
      const algo = priorVerdict([gen({ madeRecords: [{ schema: 1, kind: 'calibration' }, candidate(6), candidate(6, 'gen-v4-proto:v4')] }), ...replays()], starts());
      assert(algo.verdict === 'fail' && hasReason(algo.reasons, 'candidate 1: algo gen-v4-proto:v4, not gen-v4-proto:v4-ps'), `another arm's algo: ${algo.verdict} ${JSON.stringify(algo.reasons)}`);
      const noWindow = priorVerdict([gen({ calibrationWindow: null }), ...replays()], starts());
      assert(noWindow.verdict === 'fail' && hasReason(noWindow.reasons, 'window count is absent'), `no window count: ${noWindow.verdict} ${JSON.stringify(noWindow.reasons)}`);
      const unjournaled = priorVerdict([gen(), ...replays()], []);
      assert(unjournaled.verdict === 'incomplete' && hasReason(unjournaled.reasons, 'no batch start line'), `no batch start line: ${unjournaled.verdict} ${JSON.stringify(unjournaled.reasons)}`);
      const noCandidate = priorVerdict([gen({ made: ['calibration'], puzzles: 1, madeRecords: [{ schema: 1, kind: 'calibration' }] }), replays()[0]], starts());
      assert(noCandidate.verdict === 'incomplete' && hasReason(noCandidate.reasons, 'no candidate record'), `no candidate: ${noCandidate.verdict} ${JSON.stringify(noCandidate.reasons)}`);
      const [calibration, first, second] = replays();
      const mismatch = priorVerdict([gen(), calibration, { ...first, result: { ...first.result, status: 'mismatch', reason: 'stage' } }, second], starts());
      assert(mismatch.verdict === 'fail' && hasReason(mismatch.reasons, 'replay: ') && hasReason(mismatch.reasons, 'replay mismatch (stage)'), `a replay that mismatched: ${mismatch.verdict} ${JSON.stringify(mismatch.reasons)}`);
      const censored = priorVerdict([{ ...gen(), status: 'censored', result: { outcome: 'censored' } },
        ...replays().map((row) => ({ ...row, result: { outcome: 'no-record', reason: 'no pack' } }))], []);
      assert(censored.verdict === 'incomplete' && hasReason(censored.reasons, 'censored'), `a censored generation item: ${censored.verdict} ${JSON.stringify(censored.reasons)}`);
    },
  },
  {
    name: 'link: summary of a synthetic batch',
    run() {
      const line = (/** @type {string} */ ev, /** @type {number} */ at, /** @type {Record<string, unknown>} */ extra = {}) => ({ t: 'link', ev, batch: 1, at, ...extra });
      const done = (/** @type {number} */ attempt, /** @type {number} */ at, /** @type {number} */ inflight) => line('complete', at, { slot: 1, attempt, ok: true, inflight, outcome: 'candidate' });
      const lines = () => [
        line('start', 0, { batchSeed: 'b', quantity: 10 }),
        line('dispatch', 0, { slot: 1, attempt: 0, inflight: 1 }),
        line('dispatch', 0, { slot: 1, attempt: 1, inflight: 2 }),
        line('await', 1, { slot: 1, attempt: 0 }),
        done(1, 10, 1),
        done(0, 30, 0),
        line('consume', 31, { slot: 1, attempt: 0, result: 'accepted', accepted: 1 }),
        line('discard', 32, { slot: 1, attempt: 1, done: true }),
        line('end', 32, { status: 'complete', reason: null, accepted: 1 }),
      ];
      const s = linkSummary(lines(), 4);
      same({ ...s, batches: undefined }, {
        dispatched: 2, completed: 2, consumed: { accepted: 1, rejected: 0, fail: {} }, discarded: { done: 1, inflight: 0 }, awaits: 1,
        awaitMs: 30, idleWorkerMs: 2 * 9 + 3 * 20 + 4 * 1, problems: [], batches: undefined, ...NO_CLOSURE_LINES,
      }, `the synthetic batch: ${JSON.stringify({ ...s, batches: undefined })}`);
      assert(s.idleWorkerMs === 82 && s.batches.length === 1 && s.batches[0].batch === 1 && s.batches[0].idleWorkerMs === 82, `per batch: ${JSON.stringify(s.batches)}`);
      const results = linkSummary([line('consume', 5, { slot: 1, attempt: 0, result: 'not-in-band' }), line('consume', 6, { slot: 1, attempt: 1, result: 'rejected' }), line('consume', 7, { slot: 1, attempt: 2, result: 'not-in-band' })], 4);
      same([results.consumed.rejected, results.consumed.fail], [1, { 'not-in-band': 2 }], `the consumption results: ${JSON.stringify(results.consumed)}`);
      const two = linkSummary([...lines(), ...lines().map((l) => ({ ...l, batch: 2 }))], 4);
      assert(two.batches.length === 2 && two.dispatched === 4 && two.awaitMs === 60 && two.problems.length === 0, `two batches: ${JSON.stringify({ ...two, batches: two.batches.length })}`);
      const noEnd = linkSummary(lines().slice(0, -1), 4);
      assert(noEnd.problems.some((p) => p.includes('no end line')), `a batch without end: ${JSON.stringify(noEnd.problems)}`);
      const neither = linkSummary(lines().filter((l) => !(l.slot === 1 && l.attempt === 1 && (l.ev === 'complete' || l.ev === 'discard'))), 4);
      assert(neither.problems.some((p) => p.includes('task 1/1 was dispatched and neither completed nor discarded')), `a task with neither: ${JSON.stringify(neither.problems)}`);
      const unknown = linkSummary([...lines().slice(0, 6), line('consume', 31, { slot: 2, attempt: 0, result: 'accepted' }), line('end', 32)], 4);
      assert(unknown.problems.some((p) => p.includes('consumed task 2/0 was never dispatched')) && unknown.problems.some((p) => p.includes('consumed task 2/0 never completed')), `a consumed task never dispatched: ${JSON.stringify(unknown.problems)}`);
    },
  },
  {
    name: 'link: an awaited task discarded at the end',
    run() {
      const line = (/** @type {string} */ ev, /** @type {number} */ at, /** @type {Record<string, unknown>} */ extra = {}) => ({ t: 'link', ev, batch: 1, at, ...extra });
      const s = linkSummary([
        line('start', 0), line('dispatch', 0, { slot: 1, attempt: 0, inflight: 1 }), line('await', 1, { slot: 1, attempt: 0 }),
        line('discard', 31, { slot: 1, attempt: 0, done: false }), line('end', 31, { status: 'cancelled', reason: null, accepted: 0 }),
        line('complete', 40, { slot: 1, attempt: 0, ok: false, inflight: 0, outcome: 'error' }),
      ], 4);
      same({ ...s, batches: undefined }, {
        dispatched: 1, completed: 1, consumed: { accepted: 0, rejected: 0, fail: {} }, discarded: { done: 0, inflight: 1 }, awaits: 1,
        awaitMs: 30, idleWorkerMs: 3 * 30, problems: [], batches: undefined, ...NO_CLOSURE_LINES,
      }, `the discarded await: ${JSON.stringify({ ...s, batches: undefined })}`);
    },
  },
  {
    name: 'link: timelines by outcome',
    run() {
      const set = { igSetMs: 20000, igAcceptedMs: [30000, 35000], acceptedCount: 2, responseMs: 40000 };
      const start = [{ t: 'link', ev: 'start', batch: 1 }];
      const problem = (/** @type {string} */ name, /** @type {any} */ run, /** @type {any[]} */ linkLines, /** @type {(p: string | null) => boolean} */ ok) => {
        const p = timelineProblem(run, linkLines);
        assert(ok(p), `${name}: ${JSON.stringify(p)}`);
      };
      const reason = (/** @type {string | null} */ p) => typeof p === 'string' && p !== 'incomplete';
      problem('(a) no set', { igSetMs: null, igAcceptedMs: [], acceptedCount: 0, responseMs: 40000 }, [], (p) => p === null);
      problem('(a2) no set, a batch', { igSetMs: null, igAcceptedMs: [], acceptedCount: 0, responseMs: 40000 }, start, reason);
      problem('(b) a set, no acceptance', { igSetMs: 20000, igAcceptedMs: [], acceptedCount: 0, responseMs: 120000 }, [], (p) => p === null);
      problem('(c) an ordinary row', set, [], (p) => p === null);
      problem('(d) no igSetMs', { igAcceptedMs: set.igAcceptedMs, acceptedCount: 2, responseMs: 40000 }, [], (p) => p === 'incomplete');
      problem('(e) the set after the first acceptance', { ...set, igSetMs: 31000 }, [], reason);
      problem('(f) three accepted, two times', { ...set, acceptedCount: 3 }, [], reason);
      problem('(g) no igAcceptedMs', { igSetMs: 20000, acceptedCount: 2, responseMs: 40000 }, [], (p) => p === 'incomplete');
      problem('(h) responseMs not a number', { ...set, responseMs: null }, [], (p) => p === 'incomplete');
      problem('(i) a decreasing list', { ...set, igAcceptedMs: [35000, 30000] }, [], reason);
      problem('(j) an acceptance after the response', { ...set, responseMs: 34000 }, [], reason);
      problem('(k) no set, yet accepted', { igSetMs: null, igAcceptedMs: [30000], acceptedCount: 1, responseMs: 40000 }, [], reason);
      problem('(l) a set, a time without a count', { igSetMs: 20000, igAcceptedMs: [30000], acceptedCount: 0, responseMs: 40000 }, [], reason);
      problem('(m) a negative set time', { ...set, igSetMs: -1 }, [], reason);
    },
  },
  {
    name: 'link: a confirmed worker termination',
    async run() {
      const dir = fresh(join(SELFTEST_DIR, 'logs', 'link-worker-end'));
      const tree = await ensureTree('log-link');
      const { adaptNodeWorker } = await import(pathToFileURL(join(tree.root, 'tools', 'node-worker.mjs')).href);
      writeFileSync(join(dir, 'idle.mjs'), 'import { parentPort } from \'node:worker_threads\'; parentPort.on(\'message\', () => {});\n');
      const file = join(dir, 'w.link.jsonl');
      /** @type {any[]} */
      let lines = [];
      let id = -1;
      process.env.IG_LOG_DIR = dir;
      process.env.IG_ROW = 'w';
      try {
        const w = new Worker(pathToFileURL(join(dir, 'idle.mjs')));
        id = w.threadId;
        adaptNodeWorker(w).terminate();
        // The destination is gone before the termination completes: the closing line uses the one captured with the request.
        delete process.env.IG_LOG_DIR;
        delete process.env.IG_ROW;
        const deadline = Date.now() + 2000;
        while (Date.now() < deadline) {
          lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l !== '').map((l) => JSON.parse(l)) : [];
          if (lines.length >= 2) {
            break;
          }
          await new Promise((r) => setTimeout(r, 50));
        }
      } finally {
        delete process.env.IG_LOG_DIR;
        delete process.env.IG_ROW;
      }
      assert(Number.isInteger(id) && id > 0, `the worker's thread id ${id}`);
      same(lines.map((l) => l.ev), ['worker-end-request', 'worker-end'], `the closing lines: ${JSON.stringify(lines)}`);
      assert(lines.every((l) => l.t === 'link' && l.pid === process.pid && l.threadId === id), `pid and thread id: ${JSON.stringify(lines)}`);
      assert(Number.isFinite(lines[0].at) && lines[1].at >= lines[0].at, `the end comes at or after the request: ${JSON.stringify(lines)}`);
      assert(!lines.some((l) => l.ev === 'worker-end-failed'), `a failed termination: ${JSON.stringify(lines)}`);
      const { igLinkWorker } = await import(pathToFileURL(join(tree.root, 'core', 'browser', 'ig-link.js')).href);
      igLinkWorker('worker-end-failed', { pid: 7, threadId: 3, dir, row: 'f' }, new Error('boom'));
      igLinkWorker('worker-end', { pid: 7, threadId: 3, dir: undefined, row: 'none' });
      const failed = readFileSync(join(dir, 'f.link.jsonl'), 'utf8').split('\n').filter((l) => l !== '').map((l) => JSON.parse(l));
      same(failed.map((l) => [l.ev, l.pid, l.threadId, l.error]), [['worker-end-failed', 7, 3, 'boom']], `a rejected termination: ${JSON.stringify(failed)}`);
      assert(!existsSync(join(dir, 'none.link.jsonl')), 'a line was written without a log folder');
    },
  },
  {
    name: 'link: closure lines counted',
    run() {
      const line = (/** @type {string} */ ev, /** @type {Record<string, unknown>} */ extra = {}) => ({ t: 'link', ev, at: 1, ...extra });
      const lines = [
        line('set-complete', { attempt: 0, outcome: 'carve' }), line('set-complete', { attempt: 1, outcome: 'ok' }),
        line('completion-dispatch', { batch: 1, index: 0, key: 'c/a' }),
        line('completion-complete', { batch: 1, index: 0, key: 'c/a', valueKey: 'c/a', outcome: 'candidate' }),
        line('completion-complete', { batch: 1, index: 1, key: 'c/b', valueKey: 'c/other', outcome: 'candidate' }),
        line('worker-end-request', { pid: 1, threadId: 1 }), line('worker-end-request', { pid: 1, threadId: 2 }),
        line('worker-end-request', { pid: 1, threadId: 3 }),
        line('worker-end', { pid: 1, threadId: 1 }), line('worker-end', { pid: 1, threadId: 2 }),
        line('worker-end-failed', { pid: 1, threadId: 3, error: 'boom' }),
      ];
      const s = linkSummary(lines, 4);
      same([s.setCompletes, s.completionDispatches, s.completionCompletes, s.workerEndRequests, s.workerEnds, s.workerEndFailures, s.completionKeyMismatches],
        [2, 1, 2, 3, 2, 1, 1], `the closure counts: ${JSON.stringify({ ...s, batches: undefined })}`);
      assert(s.batches.length === 0 && s.problems.length === 0 && s.dispatched === 0, `the closure lines belong to no batch: ${JSON.stringify(s)}`);
      const none = linkSummary([line('completion-complete', { index: 0, key: 'c/a', valueKey: null, outcome: 'not-in-band' })], 4);
      assert(none.completionCompletes === 1 && none.completionKeyMismatches === 0, `a value without a key is no mismatch: ${JSON.stringify({ ...none, batches: undefined })}`);
      const batch = [line('start', { batch: 1 }), line('end', { batch: 1, status: 'complete', reason: null, accepted: 0 })];
      const mixed = linkSummary([...lines, ...batch], 4);
      assert(mixed.batches.length === 1 && mixed.problems.length === 0 && mixed.workerEnds === 2, `closure lines beside a batch: ${JSON.stringify(mixed)}`);
    },
  },
  {
    name: 'link: the completion key helper',
    async run() {
      const tree = await ensureTree('log-link');
      const { igCompletionKey } = await import(pathToFileURL(join(tree.root, 'core', 'browser', 'ig-link.js')).href);
      const e = await loadEngine(tree.root);
      const entry = caseBoard('10x10-hard');
      const carved = firstCarvedSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText: 'ig-selftest/link/key' });
      if (!carved.ok) {
        throw new Error(`no carved set for the key: ${carved.reason}`);
      }
      const key = igCompletionKey(carved.set, carved.set.witness);
      assert(typeof key === 'string' && key === `c/${e.keys.layoutKey(carved.board, carved.set.pieces, carved.set.witness)}` && key.length > 2,
        `the key of a real layout: ${key}`);
      assert(igCompletionKey({}, []) === null && igCompletionKey(null, null) === null, 'the helper threw or returned a key for an invalid input');
    },
  },
  {
    name: 'verdicts: basic rows',
    async run() {
      const { v, row } = await verdictKit();
      const o = { quantity: 10, capMs: 120000 };
      const fast = row(0, 's0', { accepted: 10, tenth: 5000 }).run;
      const nine = row(1, 's1', { accepted: 9, tenth: null }).run;
      const slow = row(2, 's2', { accepted: 10, tenth: 130000, response: 131000 }).run;
      same([fast, nine, slow].map((run) => v.cappedT10(run, o)), [5000, 120000, 120000], 'cappedT10: 5,000, the cap for nine, the cap above it');
      same([fast, nine, slow].map((run) => v.reachedTen(run, o)), [true, false, true], 'reachedTen of the three rows');
      let thrown = '';
      try {
        v.cappedT10(row(3, 's3', { accepted: 10, tenth: null, response: 70000 }).run, o);
      } catch (e) {
        thrown = e instanceof Error ? e.message : String(e);
      }
      assert(thrown.includes('not a valid row'), `a request with ten puzzles and no T10 gave a number: ${thrown}`);
    },
  },
  {
    name: 'verdicts: completion and the deadline apart',
    async run() {
      const { v, row } = await verdictKit();
      const o = { quantity: 10, capMs: 120000, responseBoundMs: 120000 };
      const a = row(0, 's0', { accepted: 10, tenth: 125000, response: 125000 });
      const b = row(1, 's1', { accepted: 9, tenth: null, response: 120500 });
      same([v.reachedTen(a.run, o), v.cappedT10(a.run, o), v.deadlineViolation(a.run, o)], [true, 120000, true], 'row (a): ten puzzles at 125 s');
      same([v.reachedTen(b.run, o), v.cappedT10(b.run, o), v.deadlineViolation(b.run, o)], [false, 120000, true], 'row (b): nine puzzles, response 120.5 s');
      const filler = Array.from({ length: 17 }, (_, i) => row(2 + i, `s${2 + i}`, { accepted: 10, tenth: 30000 }));
      const ingest = (/** @type {any[]} */ list) => list.map((r) => v.ingestRow(r, o));
      const twenty = [...filler, a, row(19, 's19', { accepted: 10, tenth: 50000 }), b];
      same(v.completion(ingest(twenty), o), {
        requests: 20, statuses: { valid: 20, invalid: 0, incorrect: 0, censored: 0, error: 0 }, reachedTen: 19, deadlineViolations: 2, p95Ms: 125000,
      }, 'completion of 20 valid rows');
      // A censored row is counted by status and enters no statistic; 19 valid rows have no tail observation.
      const cut = row(0, 's0', { accepted: 10, tenth: 125000, response: 125000, over: { measurementValid: false } });
      same(v.completion(ingest([...filler, cut, ...twenty.slice(-2)]), o), {
        requests: 20, statuses: { valid: 19, invalid: 0, incorrect: 0, censored: 1, error: 0 }, reachedTen: 18, deadlineViolations: 1, p95Ms: null,
      }, 'completion with one censored row');
      // The second-largest is a request that did not reach ten: no tail value.
      const two = [...filler.slice(1), a, b, row(19, 's19', { accepted: 3, tenth: null }), row(20, 's20', { accepted: 10, tenth: 50000 })];
      assert(v.completion(ingest(two), o).p95Ms === null, 'the second-largest was a request without ten puzzles but the tail has a value');
    },
  },
  {
    name: 'verdicts: run status',
    async run() {
      const { v, row } = await verdictKit();
      const o = { quantity: 10 };
      const status = (/** @type {number} */ r, /** @type {any} */ spec) => v.ingestRow(row(r, `s${r}`, { accepted: 10, tenth: 40000, ...spec }), o);
      const host = { phase: 'host', code: 'child-timeout', message: 'x' };
      const invalidPuzzle = { phase: 'validation', code: 'invalid-puzzle', message: 'x' };
      const g = row(6, 's9', { accepted: 10, tenth: 40000 });
      g.run.seed = 's8';
      const got = [
        status(0, { over: { measurementValid: false } }),
        status(1, { over: { interrupted: true } }),
        status(2, { over: { errors: [{ phase: 'batch', code: 'worker-crashed', message: 'x' }] } }),
        status(3, { over: { measurementValid: false, errors: [host] } }),
        status(4, { over: { errors: [invalidPuzzle] } }),
        status(5, { over: { responseMs: 'x' } }),
        v.ingestRow(g, o),
        v.ingestRow(row(7, 's7', { accepted: 3, tenth: null, over: { partialReason: 'time-limit' } }), o),
        v.ingestRow(row(8, 's8', { accepted: 0, tenth: null, over: { partialReason: 'set:not-in-band', details: null } }), o),
      ];
      same(got.map((r) => r.status), ['censored', 'censored', 'error', 'censored', 'incorrect', 'invalid', 'invalid', 'valid', 'valid'], `the statuses: ${JSON.stringify(got.map((r) => r.status))}`);
      assert(got.every((r) => (r.status === 'valid') === (r.problems.length === 0)), 'a row has no problem text or a valid row has one');
      assert(got[6].problems.some((/** @type {string} */ p) => p.includes('run.seed')), `the mismatched seed is not named: ${JSON.stringify(got[6].problems)}`);
      // The first status that matches wins; each reading of the Authority section, once.
      same([
        status(0, { over: { measurementValid: false, errors: [invalidPuzzle] } }).status,
        status(1, { over: { partialReason: 'invalid-accepted' } }).status,
        status(2, { over: { errors: [{ phase: 'certificates', code: 'unexpected-unsatisfiable', message: 'x' }] } }).status,
        status(3, { over: { errors: [host] } }).status,
        status(4, { over: { errors: [{ phase: 'sampling', code: 'x', message: 'x' }] } }).status,
        status(5, { tenth: null }).status,
        status(6, { tenth: 70000 }).status,
        status(7, { over: { probeKind: 'cancel' } }).status,
        status(8, { over: { acceptedCount: 1.5 } }).status,
        v.ingestRow({ ...row(9, 's9', { accepted: 10, tenth: 40000 }), caseId: 'd' }, o).status,
        v.ingestRow(null, o).status,
      ], ['incorrect', 'incorrect', 'incorrect', 'censored', 'error', 'invalid', 'invalid', 'invalid', 'invalid', 'invalid', 'invalid'], 'the first matching status wins');
    },
  },
  {
    name: 'verdicts: per-puzzle evidence',
    async run() {
      const { v, row, keysOf } = await verdictKit();
      const evidence = (/** @type {any} */ spec) => v.puzzleEvidence(row(0, 's', { accepted: 10, tenth: 40000, ...spec }).run);
      const keys = keysOf('s', 10);
      const dup = keys.slice();
      dup[3] = dup[1];
      const bad = keys.slice();
      bad[0] = 'ABC';
      const six = Array.from({ length: 10 }, () => ({ clues: 6 }));
      const ok = { keys: null, clues: null };
      same(evidence({}), ok, '(a) the defaults');
      same(evidence({ keys: [] }), { keys: 'puzzle keys: 0 of 10', clues: null }, '(b) no keys');
      same(evidence({ over: { details: { igSetKey: null, K: 12, puzzles: six } } }), { keys: 'missing puzzle keys', clues: null }, '(c) no key array');
      same(evidence({ keys: dup }), { keys: 'duplicate puzzle key 3', clues: null }, '(d) a duplicate key');
      same(evidence({ keys: bad }), { keys: 'malformed puzzle key 0', clues: null }, '(e) a malformed key');
      same(evidence({ clues: [] }), { keys: null, clues: 'clues: 0 of 10' }, '(f) no clue counts');
      same(evidence({ clues: Array(9).fill(6) }), { keys: null, clues: 'clues: 9 of 10' }, '(g) nine clue counts');
      same(evidence({ clues: [6, 6, 6, 6, 13, 6, 6, 6, 6, 6] }), { keys: null, clues: 'clue out of range at 4' }, '(h) a clue count above K');
      same(evidence({ K: 0 }), { keys: null, clues: 'missing K' }, '(i) K 0');
      same(v.puzzleEvidence(row(0, 's', { accepted: 0, tenth: null, over: { details: null } }).run), ok, '(j) an empty request is complete evidence');
      // Beyond the table: the detail of a request without puzzles is never read; a key that is not a string, a missing
      // puzzle list and a count that is not a count fail closed.
      same(v.puzzleEvidence(row(0, 's', { accepted: 0, tenth: null, over: { details: { igPuzzleKeys: 'x', puzzles: 5 } } }).run), ok, 'details of an empty request are not read');
      same(evidence({ keys: [7, ...keys.slice(1)] }).keys, 'malformed puzzle key 0', 'a key that is not a string');
      same(evidence({ over: { details: { igPuzzleKeys: keys, K: 12 } } }), { keys: null, clues: 'missing clue counts' }, 'no puzzle list');
      same(evidence({ over: { acceptedCount: 1.5 } }), { keys: 'acceptedCount is not an integer from 0', clues: 'acceptedCount is not an integer from 0' }, 'a fractional count');
    },
  },
  {
    name: 'verdicts: basic statistics',
    async run() {
      const { v } = await verdictKit();
      same([v.median([3, 1, 2]), v.median([1, 2, 3, 4]), v.median([5])], [2, 2.5, 5], 'median: 2, 2.5 and 5');
      const draw = (/** @type {number} */ seed) => {
        const next = v.mulberry32(seed);
        return Array.from({ length: 5 }, () => next());
      };
      const first = draw(7);
      same(draw(7), first, 'two generators of one seed give different sequences');
      assert(first.every((/** @type {number} */ x) => x >= 0 && x < 1) && new Set(first).size === 5, `the first five values: ${JSON.stringify(first)}`);
      assert(first[0] === 0.011704753153026104 && draw(8)[0] !== first[0], `the sequence of seed 7 changed, or does not depend on the seed: ${first[0]}`);
      assert(near(v.geoMean([2, 8]), 4) && near(v.geoMean([1.5]), 1.5), 'geoMean of 2 and 8 is 4');
      // Fail closed: no data and a ratio that is not a measurement are never a statistic.
      assert(thrownBy(() => v.median([])).includes('median') && thrownBy(() => v.median([1, Number.NaN])).includes('median'), 'median of nothing or of a NaN did not throw');
      assert([[], [2, 0], [2, null], [2, Number.POSITIVE_INFINITY]].every((x) => thrownBy(() => v.geoMean(x)).includes('geoMean')), 'geoMean of an empty list, a zero, a null or an infinity did not throw');
    },
  },
  {
    name: 'verdicts: pairing problems',
    async run() {
      const { v, row } = await verdictKit();
      const spec = { accepted: 10, tenth: 40000 };
      const wrong = { phase: 'validation', code: 'invalid-puzzle', message: 'x' };
      const a = ingested(v, [row(0, 's0', spec), row(0, 's0', spec), row(1, 's1', spec), row(2, 's2', { ...spec, over: { errors: [wrong] } })]);
      const b = ingested(v, [row(0, 's0', spec), row(2, 's2', spec)]);
      const got = v.pairRows(a, b, [0, 1, 2]);
      same(got.pairs, [], `pairs: ${JSON.stringify(got.pairs)}`);
      assert(got.problems.length === 3, `the problems: ${JSON.stringify(got.problems)}`);
      assert(got.problems[0].startsWith('duplicate rows') && got.problems[0].includes('side a rep 0'), `the duplicate: ${got.problems[0]}`);
      assert(got.problems[1].startsWith('missing row') && got.problems[1].includes('side b rep 1'), `the missing row: ${got.problems[1]}`);
      assert(got.problems[2].startsWith('status incorrect') && got.problems[2].includes('side a rep 2'), `the status: ${got.problems[2]}`);
      same(got.incorrect, [{ side: 'a', rep: 2 }], `incorrect: ${JSON.stringify(got.incorrect)}`);
      // Beyond the table: a clean cell pairs every rep in the order of the declared list; the same request is the same case,
      // rep and seed; a censored row is a problem but not a correctness failure; a correctness failure hides behind nothing.
      const reps = [2, 0, 1];
      const clean = v.pairRows(ingested(v, [0, 1, 2].map((r) => row(r, `s${r}`, spec))), ingested(v, [0, 1, 2].map((r) => row(r, `s${r}`, spec))), reps);
      assert(clean.problems.length === 0 && clean.incorrect.length === 0, `a clean cell: ${JSON.stringify(clean.problems)}`);
      same(clean.pairs.map((/** @type {any} */ p) => [p.rep, p.seed, p.a.rep, p.b.seed]), [[2, 's2', 2, 's2'], [0, 's0', 0, 's0'], [1, 's1', 1, 's1']], 'the pairs are in the order of the declared reps');
      const seeds = v.pairRows(ingested(v, [row(0, 's0', spec)]), ingested(v, [row(0, 'x0', spec)]), [0]);
      assert(seeds.pairs.length === 0 && seeds.problems.length === 1 && seeds.problems[0].startsWith('seed differs at rep 0'), `a seed that differs: ${JSON.stringify(seeds)}`);
      const other = row(0, 's0', spec);
      other.caseId = 'd';
      other.run.caseId = 'd';
      const cases = v.pairRows(ingested(v, [row(0, 's0', spec)]), ingested(v, [other]), [0]);
      assert(cases.pairs.length === 0 && cases.problems.length === 1 && cases.problems[0].startsWith('case differs at rep 0'), `a case that differs: ${JSON.stringify(cases)}`);
      const outside = v.pairRows(ingested(v, [row(0, 's0', spec)]), ingested(v, [row(0, 's0', spec), row(7, 's7', spec)]), [0]);
      assert(outside.pairs.length === 1 && outside.problems.length === 1 && outside.problems[0] === 'row outside the declared replicates: side b rep 7', `an undeclared row: ${JSON.stringify(outside.problems)}`);
      const censored = row(1, 's1', { ...spec, over: { interrupted: true } });
      const cut = v.pairRows(ingested(v, [row(0, 's0', spec), censored]), ingested(v, [row(0, 's0', spec), row(1, 's1', spec)]), [0, 1]);
      assert(cut.pairs.length === 1 && cut.problems.length === 1 && cut.problems[0].startsWith('status censored') && cut.incorrect.length === 0, `a censored row: ${JSON.stringify(cut)}`);
      const hidden = v.pairRows(ingested(v, [row(0, 's0', spec), row(0, 's0', { ...spec, over: { errors: [wrong] } })]), ingested(v, [row(0, 's0', spec)]), [0]);
      assert(hidden.pairs.length === 0 && hidden.problems.length === 1 && hidden.incorrect.length === 1, `an incorrect row beside a duplicate: ${JSON.stringify(hidden)}`);
      assert(thrownBy(() => v.pairRows([row(0, 's0', spec)], [], [0])).includes('ingested rows') && thrownBy(() => v.pairRows([], [], [0, 0])).includes('reps') && thrownBy(() => v.pairRows([], [], [])).includes('reps'),
        'a row that was not ingested, a repeated rep or no rep did not throw');
    },
  },
  {
    name: 'verdicts: matched sets',
    async run() {
      const { v, row } = await verdictKit();
      const spec = { accepted: 10, tenth: 40000 };
      const a = ingested(v, [
        row(0, 's0', { accepted: 2, tenth: null, setKey: 'k', clues: [10, 12] }),
        row(1, 's1', { ...spec, setKey: 'k' }),
        row(2, 's2', { ...spec, setKey: 'k' }),
        row(3, 's3', spec),
        row(4, 's4', { accepted: 3, tenth: null, setKey: 'k', clues: [9, 12, 10] }),
        row(5, 's5', { accepted: 1, tenth: null, setKey: 'k', clues: [6] }),
      ]);
      const b = ingested(v, [
        row(0, 's0', { accepted: 1, tenth: null, setKey: 'k', clues: [11] }),
        row(1, 's1', { ...spec, setKey: 'm' }),
        row(2, 's2', { accepted: 0, tenth: null, setKey: 'k' }),
        row(3, 's3', spec),
        row(4, 's4', { accepted: 1, tenth: null, setKey: 'k', clues: [7] }),
        row(5, 's5', { accepted: 1, tenth: null, setKey: 'k', clues: [9] }),
      ]);
      const paired = v.pairRows(a, b, [0, 1, 2, 3, 4, 5]);
      assert(paired.problems.length === 0 && paired.pairs.length === 6, `the pairing: ${JSON.stringify(paired.problems)}`);
      // (a) at rep 0 matches with the median of an even list (11 for 10 and 12); (b) rep 1 has two set keys; (c) rep 2 has
      // no puzzle on one arm; rep 3 has no set key at all (not a matched set, and not an evidence problem either); the
      // medians of an odd list and a negative difference follow.
      same(v.matchedSets(paired.pairs), {
        matched: [
          { rep: 0, seed: 's0', screen: 11, noScreen: 11, d: 0 },
          { rep: 4, seed: 's4', screen: 10, noScreen: 7, d: 3 },
          { rep: 5, seed: 's5', screen: 6, noScreen: 9, d: -3 },
        ],
        evidence: [],
      }, 'the matched sets');
      same(v.matchedSets([]), { matched: [], evidence: [] }, 'no pair, no matched set');
    },
  },
  {
    name: 'verdicts: incomplete clue populations are not zero differences',
    async run() {
      const { v, row } = await verdictKit();
      const base = { accepted: 10, tenth: 40000, setKey: 'k' };
      const nine = Array(9).fill(6);
      const a = ingested(v, [
        row(0, 's0', { ...base, clues: [] }),
        row(1, 's1', base),
        row(2, 's2', base),
        row(3, 's3', { ...base, clues: [] }),
        row(4, 's4', { ...base, K: 0 }),
      ]);
      const b = ingested(v, [
        row(0, 's0', base),
        row(1, 's1', { ...base, clues: nine }),
        row(2, 's2', base),
        row(3, 's3', { ...base, clues: nine }),
        row(4, 's4', base),
      ]);
      const paired = v.pairRows(a, b, [0, 1, 2, 3, 4]);
      assert(paired.problems.length === 0 && paired.pairs.length === 5, `the pairing: ${JSON.stringify(paired.problems)}`);
      const out = v.matchedSets(paired.pairs);
      same(out.matched, [{ rep: 2, seed: 's2', screen: 6, noScreen: 6, d: 0 }], 'only the complete pair (c) is matched, with d 0');
      same(out.evidence, [
        { rep: 0, side: 'a', problem: 'clues: 0 of 10' },
        { rep: 1, side: 'b', problem: 'clues: 9 of 10' },
        { rep: 3, side: 'a', problem: 'clues: 0 of 10' },
        { rep: 3, side: 'b', problem: 'clues: 9 of 10' },
        { rep: 4, side: 'a', problem: 'missing K' },
      ], `the evidence problems: ${JSON.stringify(out.evidence)}`);
      // Nothing incomplete is counted as a zero difference: the clue rule sees one set, not five.
      assert(v.clueRule(out.matched).n === 1, 'an incomplete pair reached the clue rule');
    },
  },
  {
    name: 'verdicts: the clue rule is pooled',
    async run() {
      const { v, row } = await verdictKit();
      // A cell of matched sets built from real rows: the screen arm's clue count is 6 plus the difference.
      const cell = (/** @type {number[]} */ diffs) => {
        const reps = diffs.map((_, i) => i);
        const screen = ingested(v, diffs.map((d, i) => row(i, `s${i}`, { accepted: 10, tenth: 30000, setKey: `k${i}`, clue: 6 + d })));
        const noScreen = ingested(v, diffs.map((_, i) => row(i, `s${i}`, { accepted: 10, tenth: 30000, setKey: `k${i}`, clue: 6 })));
        const paired = v.pairRows(screen, noScreen, reps);
        const sets = v.matchedSets(paired.pairs);
        assert(paired.problems.length === 0 && sets.evidence.length === 0 && sets.matched.length === diffs.length, `the cell's sets: ${JSON.stringify(sets)}`);
        return sets.matched;
      };
      const a = cell(Array(15).fill(1));
      const b = cell(Array(15).fill(0));
      same(v.clueRule(a), { n: 15, medianDiff: 1, moved2: 0, pass: false }, `cell a alone: ${JSON.stringify(v.clueRule(a))}`);
      same(v.clueRule([...a, ...b]), { n: 30, medianDiff: 0.5, moved2: 0, pass: true }, 'pooled: a median of 0.5 passes although cell a alone has 1');
      const moved = cell([...Array(8).fill(2), ...Array(7).fill(1)]);
      same(v.clueRule([...moved, ...b]), { n: 30, medianDiff: 0.5, moved2: 8, pass: false }, 'eight sets in 30 move by two clues');
      // The limits: one in five passes (6 of 30), one more fails (7); a drop of two clues moves a set as well; no set, no pass.
      const limit = (/** @type {number[]} */ diffs) => v.clueRule([...cell(diffs), ...b]);
      same([limit([...Array(6).fill(2), ...Array(9).fill(0)]).pass, limit([...Array(7).fill(2), ...Array(8).fill(0)]).pass], [true, false], 'one in five passes, one more fails');
      same(limit([...Array(7).fill(-2), ...Array(8).fill(0)]).moved2, 7, 'a difference of -2 moves a set');
      same(v.clueRule(cell(Array(15).fill(0).map((_, i) => (i < 8 ? 1 : 0)))).medianDiff, 1, 'eight of 15 above 0 put the median at 1');
      same(v.clueRule([]), { n: 0, medianDiff: null, moved2: 0, pass: false }, 'no matched set is no pass');
    },
  },
  {
    name: 'verdicts: faster rule and its floor',
    async run() {
      const { v } = await verdictKit();
      const o = { resamples: 1000, resampleSeed: 7 };
      const reps = [0, 1, 2, 3];
      const flat = v.fasterRule({ a: [2, 2, 2, 2], b: [2, 2, 2, 2] }, reps, o);
      assert(near(flat.geoMean, 2) && near(flat.lower, 2) && flat.pass === true, `two cells at 2: ${JSON.stringify(flat)}`);
      const low = v.fasterRule({ a: [2, 2, 2, 2], b: [0.5, 0.5, 0.5, 0.5] }, reps, o);
      assert(near(low.geoMean, 1) && near(low.cellGeoMeans.b, 0.5) && near(low.cellGeoMeans.a, 2) && low.pass === false, `cell b at 0.5: ${JSON.stringify(low)}`);
      // Each condition alone: the geometric mean threshold, the lower bound above 1.0 and the floor of every cell.
      const slow = v.fasterRule({ a: [1.1, 1.1, 1.1, 1.1] }, reps, o);
      assert(slow.lower > 1 && slow.pass === false, `a geometric mean of 1.1: ${JSON.stringify(slow)}`);
      const fast = v.fasterRule({ a: [1.2, 1.2, 1.2, 1.2] }, reps, o);
      assert(fast.pass === true, `a geometric mean of 1.2: ${JSON.stringify(fast)}`);
      const wide = v.fasterRule({ a: [0.5, 4] }, [0, 1], o);
      assert(wide.geoMean > 1.4 && near(wide.lower, 0.5) && wide.pass === false, `a mean of 1.41 with a lower bound at the low tail: ${JSON.stringify(wide)}`);
      const edge = v.fasterRule({ a: [1, 4] }, [0, 1], o);
      assert(near(edge.geoMean, 2) && edge.lower === 1 && edge.pass === false, `a lower bound of exactly 1.0 is not above 1.0: ${JSON.stringify(edge)}`);
      const floor = v.fasterRule({ a: [4, 4, 4, 4], b: [0.9, 0.9, 0.9, 0.9] }, reps, o);
      assert(floor.geoMean > 1.8 && floor.lower > 1 && floor.cellGeoMeans.b < 1 && floor.pass === false, `a cell at 0.9: ${JSON.stringify(floor)}`);
      // The same drawn reps apply to every cell: opposite ratios cancel in every resample, so the lower bound is 1.
      const shared = v.fasterRule({ a: [4, 2, 1, 0.5], b: [0.25, 0.5, 1, 2] }, reps, o);
      assert(near(shared.geoMean, 1) && near(shared.lower, 1), `shared draws: ${JSON.stringify(shared)}`);
      // The seed decides the resamples, and nothing else does.
      const ratios = Array.from({ length: 20 }, (_, i) => 1 + (i % 7) / 5);
      const twenty = Array.from({ length: 20 }, (_, i) => i);
      const one = v.fasterRule({ a: ratios }, twenty, o);
      same(v.fasterRule({ a: ratios }, twenty, o), one, 'the same input and seed gave another result');
      assert(v.fasterRule({ a: ratios }, twenty, { ...o, resampleSeed: 8 }).lower !== one.lower, 'the seed did not change the resamples');
      // Fail closed: a rep without a pair, a ratio of 0, a series of another length and missing options are never a statistic.
      assert([[{ a: [2, null, 2, 2] }, reps, o], [{ a: [2, 0, 2, 2] }, reps, o], [{ a: [2, 2, 2] }, reps, o], [{}, reps, o], [{ a: [2, 2, 2, 2] }, [0, 1, 2], o],
        [{ a: [2, 2, 2, 2] }, reps, { resamples: 0, resampleSeed: 7 }], [{ a: [2, 2, 2, 2] }, reps, { resamples: 1000 }]].every(([r, p, x]) => thrownBy(() => v.fasterRule(r, p, x)) !== ''), 'an incomplete input did not throw');
    },
  },
  {
    name: 'verdicts: failed requests at the common endpoint',
    async run() {
      const { v, row } = await verdictKit();
      const reps = Array.from({ length: 20 }, (_, i) => i);
      const o = { quantity: 10, capMs: 120000 };
      const pairsOf = (/** @type {(r: number) => any} */ screen, /** @type {(r: number) => any} */ noScreen) => {
        const paired = v.pairRows(ingested(v, reps.map((r) => row(r, `s${r}`, screen(r)))), ingested(v, reps.map((r) => row(r, `s${r}`, noScreen(r)))), reps);
        assert(paired.problems.length === 0 && paired.pairs.length === 20, `the pairing: ${JSON.stringify(paired.problems)}`);
        return paired.pairs;
      };
      const failed = pairsOf(() => ({ accepted: 9, tenth: null }), () => ({ accepted: 10, tenth: 60000 }));
      const ratios = v.ratiosOf(failed, reps, o);
      same(ratios, Array(20).fill(0.5), `the ratios of a failed screen arm: ${JSON.stringify(ratios)}`);
      const rule = v.fasterRule({ c: ratios }, reps, { resamples: 1000, resampleSeed: 7 });
      assert(rule.pass === false && near(rule.geoMean, 0.5), `a failed arm passed the faster rule: ${JSON.stringify(rule)}`);
      // One endpoint for both arms: two failed arms tie, a late T10 enters at the cap, a quicker screen arm is above 1 and
      // passes, and a rep without a pair is a null, never a ratio.
      const tie = v.ratiosOf(pairsOf(() => ({ accepted: 9, tenth: null }), () => ({ accepted: 3, tenth: null })), reps, o);
      const late = v.ratiosOf(pairsOf(() => ({ accepted: 10, tenth: 130000, response: 131000 }), () => ({ accepted: 10, tenth: 125000, response: 126000 })), reps, o);
      const quick = v.ratiosOf(pairsOf(() => ({ accepted: 10, tenth: 30000 }), () => ({ accepted: 10, tenth: 45000 })), reps, o);
      same([tie, late, quick], [Array(20).fill(1), Array(20).fill(1), Array(20).fill(1.5)], 'two failed arms tie at the cap, a T10 past the cap is capped, 45 s over 30 s is 1.5');
      assert(v.fasterRule({ c: quick }, reps, { resamples: 1000, resampleSeed: 7 }).pass === true, 'a screen arm 1.5 times quicker did not pass');
      const holed = v.ratiosOf(failed.filter((/** @type {any} */ p) => p.rep !== 3), reps, o);
      assert(holed[3] === null && holed.filter((x) => x === 0.5).length === 19, `a rep without a pair: ${JSON.stringify(holed)}`);
      assert(thrownBy(() => v.fasterRule({ c: holed }, reps, { resamples: 1000, resampleSeed: 7 })).includes('index 3') && thrownBy(() => v.ratiosOf(failed, reps, { quantity: 10 })).includes('capMs'),
        'a null ratio or a missing capMs did not throw');
    },
  },
  {
    name: 'verdicts: no regression',
    async run() {
      const { v } = await verdictKit();
      const reps = Array.from({ length: 20 }, (_, i) => i);
      const o = { resamples: 1000, resampleSeed: 7 };
      const same1 = v.noRegression(Array(20).fill(1), reps, o);
      assert(same1.pass === true && near(same1.lower, 1) && near(same1.geoMean, 1), `20 ratios of 1.0: ${JSON.stringify(same1)}`);
      const worse = v.noRegression(Array(20).fill(0.8), reps, o);
      assert(worse.pass === false && near(worse.lower, 0.8), `20 ratios of 0.8: ${JSON.stringify(worse)}`);
      assert(v.noRegression(Array(20).fill(0.95), reps, o).pass === true, '20 ratios of 0.95 failed');
      // The lower bound decides, not the mean: a mean of 1.41 with a resampled 10th percentile of 0.5 fails.
      const wide = v.noRegression([0.5, 4], [0, 1], o);
      assert(wide.geoMean > 1.4 && near(wide.lower, 0.5) && wide.pass === false, `a wide pair: ${JSON.stringify(wide)}`);
      assert(thrownBy(() => v.noRegression([1, null], [0, 1], o)).includes('index 1') && thrownBy(() => v.noRegression([1, 1], [0, 1, 2], o)).includes('3 ratios')
        && thrownBy(() => v.noRegression([1, 1], [0, 1], { resamples: 1000 })).includes('resampleSeed'), 'a null ratio, a short series or a missing seed did not throw');
    },
  },
  {
    name: 'ledger: an open call is incomplete',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P } = ledgerLines();
      const c = 'r:1:2:1';
      const got = v.rowLedger([S(c, 'batch', '1/0', 10), C(c), B(c), P(c, 0, 100, 0)], []);
      assert(got.complete === false && got.problems.includes('open call r:1:2:1'), `an open call: ${JSON.stringify(got)}`);
      // The interval sums the closed calls only: the work of an open call is neither counted nor read as zero.
      same([got.calls, got.ended, got.terminated, got.open, got.lo, got.hi], [1, 0, 0, 0, 0, 0], `the counts of an open call: ${JSON.stringify(got)}`);
    },
  },
  {
    name: 'ledger: a missing count capability',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, E } = ledgerLines();
      const c = 'r:1:2:1';
      const call = [S(c, 'set', 0, 10), B(c), P(c, 0, 100, 0), B(c), P(c, 1, 50, 10), E(c, 160, 2, 0)];
      const got = v.rowLedger(call, [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }]);
      same(got.problems, ['missing caps r:1:2:1'], `no caps line: ${JSON.stringify(got)}`);
      assert(got.complete === false, 'a call without its capability line was complete');
      // Exactly one capability line: two of them are as wrong as none.
      assert(v.rowLedger([call[0], C(c), C(c), ...call.slice(1)], [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }]).problems.includes('missing caps r:1:2:1'), 'two caps lines');
      // A call cut before its caps line, with no other line, has no work and no missing-caps problem; a caps line that
      // says no count is no capability.
      same(v.rowLedger([S(c, 'set', 0, 10)], []).problems, ['open call r:1:2:1'], 'a call with only its start line has a problem besides being open');
      const no = v.rowLedger([call[0], { t: 'caps', call: c, count: false }, ...call.slice(1)], [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }]);
      assert(no.problems.includes('missing caps r:1:2:1'), `a caps line with count false: ${JSON.stringify(no.problems)}`);
    },
  },
  {
    name: 'ledger: an omitted losing attempt',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, E } = ledgerLines();
      const c = 'r:1:2:1';
      const call = [S(c, 'set', 0, 10), C(c), B(c), P(c, 0, 100, 0), B(c), P(c, 1, 50, 10), E(c, 160, 2, 0)];
      const got = v.rowLedger(call, [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }, { t: 'link', ev: 'set-complete', attempt: 1, outcome: 'not-in-band' }]);
      assert(got.complete === false && got.problems.includes('unmatched set attempt 1'), `attempt 1 has no call: ${JSON.stringify(got)}`);
      // Pre-selection outcomes ran no selection call; a call that was never returned (speculative) is counted, not matched.
      const pre = v.rowLedger(call, [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }, { t: 'link', ev: 'set-complete', attempt: 1, outcome: 'carve' }, { t: 'link', ev: 'set-complete', attempt: 2, outcome: 'internal' }]);
      assert(pre.complete === true, `carve and internal need no call: ${JSON.stringify(pre.problems)}`);
      const speculative = v.rowLedger(call, []);
      assert(speculative.complete === true && speculative.lo === 160, `a speculative call counts in the sums: ${JSON.stringify(speculative)}`);
    },
  },
  {
    name: 'ledger: an ended call with an explicit zero count',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, E } = ledgerLines();
      const c = 'r:1:2:1';
      const got = v.rowLedger([S(c, 'set', 0, 10), C(c), B(c), P(c, 0, 100, 0), B(c), P(c, 1, 50, 10), E(c, 160, 2, 0)], [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }]);
      same(got, { complete: true, problems: [], calls: 1, ended: 1, terminated: 0, open: 0, lo: 160, hi: 160, ratingWork: 160, countWork: 0 }, `the ledger: ${JSON.stringify(got)}`);
    },
  },
  {
    name: 'ledger: an open primitive at a confirmed termination',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, N, W } = ledgerLines();
      const c = 'r:1:3:1';
      const call = [S(c, 'batch', '1/1', 10), C(c), B(c, 'rate', 1000), P(c, 0, 70, 0), B(c, 'count', 500), N(c, 30), B(c, 'rate', 840)];
      const got = v.rowLedger(call, [W('worker-end', 3, 20)]);
      same(got, { complete: true, problems: [], calls: 1, ended: 0, terminated: 1, open: 1, lo: 100, hi: 940, ratingWork: 70, countWork: 30 }, `the interval: ${JSON.stringify(got)}`);
    },
  },
  {
    name: 'ledger: a kill between primitives',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, N, W } = ledgerLines();
      const c = 'r:1:3:1';
      const got = v.rowLedger([S(c, 'batch', '1/1', 10), C(c), B(c, 'rate', 1000), P(c, 0, 70, 0), B(c, 'count', 500), N(c, 30)], [W('worker-end', 3, 20)]);
      assert(got.complete === true && got.terminated === 1 && got.open === 0 && got.lo === 100 && got.hi === 100, `a kill between primitives adds no bound: ${JSON.stringify(got)}`);
    },
  },
  {
    name: 'ledger: an overlapping begin',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, N, W } = ledgerLines();
      const c = 'r:1:3:1';
      const got = v.rowLedger([S(c, 'batch', '1/1', 10), C(c), B(c, 'rate', 1000), P(c, 0, 70, 0), B(c, 'count', 500), N(c, 30), B(c, 'rate', 840), B(c, 'screen', 300)], [W('worker-end', 3, 20)]);
      assert(got.complete === false && got.problems.includes('overlapping begin r:1:3:1 3'), `two open primitives: ${JSON.stringify(got.problems)}`);
    },
  },
  {
    name: 'ledger: an overlap is never erased',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, W } = ledgerLines();
      const c = 'r:1:4:1';
      const got = v.rowLedger([S(c, 'batch', '2/0', 10), C(c), B(c, 'rate', 100), B(c, 'rate', 10), P(c, 0, 5, 0)], [W('worker-end', 4, 20)]);
      assert(got.complete === false && got.problems.includes('overlapping begin r:1:4:1 1'), `the completion of 5 units repaired an overlap: ${JSON.stringify(got)}`);
    },
  },
  {
    name: 'ledger: unquantified ratings',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, E } = ledgerLines();
      const c = 'r:1:5:1';
      for (const outcome of ['error', 'unsat']) {
        const got = v.rowLedger([S(c, 'batch', '2/1', 10), C(c), B(c, 'rate', 100), { t: 'p', call: c, i: 0, tuple: ['locate', 6, outcome, null, 0, 0] }, E(c, 0, 1, 0, 'error')], []);
        same(got.problems, [`unquantified ${outcome} r:1:5:1 0`], `the zero placeholders of a ${outcome} rating are not measured work: ${JSON.stringify(got)}`);
        assert(got.complete === false, `a ${outcome} rating gave a complete ledger`);
      }
    },
  },
  {
    name: 'ledger: an ended error with an open primitive',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, E } = ledgerLines();
      const c = 'r:1:6:1';
      const got = v.rowLedger([S(c, 'batch', '2/2', 10), C(c), B(c, 'rate', 100), E(c, 0, 0, 0, 'error')], []);
      same(got.problems, ['unfinished primitive r:1:6:1'], `an ended call with an open primitive: ${JSON.stringify(got)}`);
      assert(got.hi === got.lo, 'an ended call has hi equal to lo: only a confirmed termination carries a bound');
    },
  },
  {
    name: 'ledger: a work-cap rating is quantified',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, E } = ledgerLines();
      const c = 'r:1:7:1';
      const got = v.rowLedger([S(c, 'batch', '3/0', 10), C(c), B(c, 'rate', 1000), { t: 'p', call: c, i: 0, tuple: ['locate', 6, 'capped', null, 760, 0] }, E(c, 760, 1, 0)],
        [{ t: 'link', ev: 'complete', slot: 3, attempt: 0, ok: true, outcome: 'not-in-band' }]);
      assert(got.complete === true && got.lo === 760 && got.hi === 760, `a work-cap rating reports its measured units: ${JSON.stringify(got)}`);
    },
  },
  {
    name: 'ledger: an exceeded bound and an invalid bound',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, N, W } = ledgerLines();
      const c = 'r:1:3:1';
      const link = [W('worker-end', 3, 20)];
      const exceeded = v.rowLedger([S(c, 'batch', '1/1', 10), C(c), B(c, 'rate', 50), P(c, 0, 70, 0), B(c, 'count', 500), N(c, 30)], link);
      assert(exceeded.complete === false && exceeded.problems.includes('bound exceeded r:1:3:1 0'), `70 units against a bound of 50: ${JSON.stringify(exceeded.problems)}`);
      const invalid = v.rowLedger([S(c, 'batch', '1/1', 10), C(c), B(c, 'rate', 1000), P(c, 0, 70, 0), B(c, 'count', -1), N(c, 30)], link);
      assert(invalid.complete === false && invalid.problems.includes('invalid bound r:1:3:1'), `a bound of -1: ${JSON.stringify(invalid.problems)}`);
      // An open primitive whose bound is not a number leaves hi unbounded, never tight.
      const open = v.rowLedger([S(c, 'batch', '1/1', 10), C(c), B(c, 'rate', Number.NaN)], link);
      assert(open.complete === false && open.problems.includes('invalid bound r:1:3:1') && open.hi === Infinity, `an open primitive with no bound: ${JSON.stringify(open)}`);
    },
  },
  {
    name: 'ledger: a termination request is not an end',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, N, W } = ledgerLines();
      const c = 'r:1:3:1';
      const call = [S(c, 'batch', '1/1', 10), C(c), B(c, 'rate', 1000), P(c, 0, 70, 0), B(c, 'count', 500), N(c, 30), B(c, 'rate', 840)];
      const verdict = (/** @type {any[]} */ link) => v.rowLedger(call, link);
      for (const [link, why] of /** @type {[any[], string][]} */ ([
        [[W('worker-end-request', 3, 12)], 'a termination request'],
        [[W('worker-end', 3, 5)], 'a termination before the call started'],
        [[W('worker-end', -1, 20)], 'the thread id -1 of a worker that died before its termination was requested'],
        [[W('worker-end-failed', 3, 20)], 'a failed termination'],
        [[{ ...W('worker-end', 3, 20), pid: 2 }], 'another process'],
        [[W('worker-end', 4, 20)], 'another thread'],
      ])) {
        const got = verdict(link);
        assert(got.complete === false && got.problems.includes('open call r:1:3:1') && got.terminated === 0, `${why} closed the call: ${JSON.stringify(got)}`);
      }
      const closed = verdict([W('worker-end-request', 3, 12), W('worker-end', 3, 20)]);
      assert(closed.complete === true && closed.terminated === 1 && closed.hi === 940, `a confirmed termination: ${JSON.stringify(closed)}`);
    },
  },
  {
    name: 'ledger: reconciliation and values',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, N, E } = ledgerLines();
      const c = 'r:1:2:1';
      const link = [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }];
      const body = [S(c, 'set', 0, 10), C(c), B(c), P(c, 0, 100, 0), B(c), P(c, 1, 50, 10)];
      const work = v.rowLedger([...body, E(c, 150, 2, 0)], link);
      assert(work.complete === false && work.problems.includes('reconcile r:1:2:1: work 160 != 150'), `end.work: ${JSON.stringify(work.problems)}`);
      assert(v.rowLedger([...body, E(c, 160, 3, 0)], link).problems.includes('reconcile r:1:2:1: profiles 2 != 3'), 'end.profiles');
      assert(v.rowLedger([...body, E(c, 160, 2, 7)], link).problems.includes('reconcile r:1:2:1: countWork 0 != 7'), 'end.locate.countWork');
      const noCount = v.rowLedger([...body, { t: 'end', call: c, result: 'ok', work: 160, profiles: 2 }], link);
      assert(noCount.problems.includes('reconcile r:1:2:1: countWork 0 != undefined'), `a v4 end line without locate.countWork: ${JSON.stringify(noCount.problems)}`);
      const bad = v.rowLedger([...body, B(c, 'count', 500), N(c, -1), E(c, 160, 2, 0)], link);
      assert(bad.complete === false && bad.problems.includes('invalid work r:1:2:1'), `a negative count: ${JSON.stringify(bad.problems)}`);
      const nan = v.rowLedger([S(c, 'set', 0, 10), C(c), B(c), { t: 'p', call: c, i: 0, tuple: ['locate', 6, 'in', 60, '9', 0] }, E(c, 0, 1, 0)], link);
      assert(nan.complete === false && nan.problems.includes('invalid work r:1:2:1'), `a main work that is not a number: ${JSON.stringify(nan.problems)}`);
    },
  },
  {
    name: 'ledger: completion tasks match by key',
    async run() {
      const { v } = await verdictKit();
      const { S, C, E } = ledgerLines();
      const calls = [S('r:1:8:1', 'completion', 'c/k1', 10), C('r:1:8:1'), E('r:1:8:1', 0, 0, 0), S('r:1:8:2', 'completion', 'c/k3', 11), C('r:1:8:2'), E('r:1:8:2', 0, 0, 0)];
      const done = (/** @type {number} */ index, /** @type {any} */ key, /** @type {any} */ valueKey = key) => ({ t: 'link', ev: 'completion-complete', index, key, valueKey, outcome: 'not-in-band' });
      const link = [done(0, 'c/k1'), done(1, 'c/k2'), { t: 'link', ev: 'complete', slot: 2, attempt: 0, ok: true, outcome: 'layout' }];
      const got = v.rowLedger(calls, link);
      same(got.problems, ['unmatched completion task c/k2'], `two tasks and two ended calls, one identity apart: ${JSON.stringify(got)}`);
      assert(got.complete === false && got.ended === 2, `the speculative call stays counted: ${JSON.stringify(got)}`);
      // A returned value that names another layout, a task with no key and a call that already answered a task.
      assert(v.rowLedger(calls, [done(0, 'c/k1', 'c/zz'), done(1, 'c/k3')]).problems.join() === 'completion key mismatch 0', 'a valueKey that differs from the key');
      assert(v.rowLedger(calls, [done(0, null, null)]).problems.includes('unmatched completion task null'), 'a task without a key matched a call');
      assert(v.rowLedger(calls, [done(0, 'c/k1'), done(1, 'c/k1')]).problems.join() === 'unmatched completion task c/k1', 'one call answered two tasks');
      // A task with no key matches no call, even a call that has no attempt; two ended calls of one identity answer no task.
      const keyless = [S('r:1:8:3', 'completion', null, 12), C('r:1:8:3'), E('r:1:8:3', 0, 0, 0)];
      assert(v.rowLedger(keyless, [done(0, null, null)]).problems.join() === 'unmatched completion task null', 'a keyless task matched a call without an attempt');
      const twins = [S('r:1:8:4', 'batch', '1/0', 10), C('r:1:8:4'), E('r:1:8:4', 0, 0, 0), S('r:1:8:5', 'batch', '1/0', 11), C('r:1:8:5'), E('r:1:8:5', 0, 0, 0)];
      assert(v.rowLedger(twins, [{ t: 'link', ev: 'complete', slot: 1, attempt: 0, ok: true, outcome: 'not-in-band' }]).problems.join() === 'unmatched batch candidate 1/0', 'two calls of one identity answered the task');
      // Tasks that ran no selection call need none: a layout outcome, a failed candidate.
      const none = v.rowLedger([], [{ t: 'link', ev: 'completion-complete', index: 0, key: 'c/k9', valueKey: null, outcome: 'layout' }, { t: 'link', ev: 'complete', slot: 5, attempt: 1, ok: false, outcome: 'error' }]);
      assert(none.complete === true, `tasks without a selection call: ${JSON.stringify(none.problems)}`);
    },
  },
  {
    name: 'ledger: an unowned line and no linkage',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, E } = ledgerLines();
      assert(v.rowLedger([P('r:1:9:9', 0, 5, 0)], []).problems.includes('unowned p line r:1:9:9'), 'a p line without a start line');
      assert(v.rowLedger([{ t: 'caps', call: null, count: true }], []).problems.includes('unowned caps line null'), 'a line of a null call');
      const c = 'r:1:2:1';
      const got = v.rowLedger([S(c, 'set', 0, 10), C(c), B(c), P(c, 0, 100, 0), E(c, 100, 1, 0)], null);
      same(got.problems, ['no linkage'], `a complete call without its link file: ${JSON.stringify(got)}`);
      assert(got.complete === false, 'a row without linkage was complete');
    },
  },
  {
    name: 'ledger: lines, duplicates and the stage',
    async run() {
      const { v } = await verdictKit();
      const { S, C, B, P, E } = ledgerLines();
      const parsed = v.parseLines('{"t":"start"}\n{bad\n[1]\n\n{"t":"end"}\n', 'a.jsonl');
      same(parsed, { lines: [{ t: 'start' }, { t: 'end' }], problems: ['unparseable line 2 of a.jsonl', 'unparseable line 3 of a.jsonl', 'unparseable line 4 of a.jsonl'] }, `parseLines: ${JSON.stringify(parsed)}`);
      same([v.parseLines('', 'e'), v.parseLines('{"t":"p"}', 'e').lines.length], [{ lines: [], problems: [] }, 1], 'an empty text and a last line without a newline');
      const c = 'r:1:2:1';
      const call = [S(c, 'set', 0, 10), C(c), B(c), P(c, 0, 100, 0), E(c, 100, 1, 0)];
      const link = [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }];
      assert(v.rowLedger([...call, S(c, 'set', 0, 10)], link).problems.includes(`duplicate start ${c}`), 'a second start line');
      assert(v.rowLedger([...call, E(c, 100, 1, 0)], link).problems.includes(`duplicate end ${c}`), 'a second end line');
      assert(v.rowLedger([{ ...call[0], stage: 'other' }, ...call.slice(1)], []).problems.includes(`unattributed call ${c}`), 'a call of stage other');
      assert(thrownBy(() => v.rowLedger([null], [])).includes('rowLedger') && thrownBy(() => v.parseLines(5, 'f')).includes('parseLines'), 'a line that is not an object, or a text that is not a string, did not throw');
    },
  },
  {
    name: 'work: the counterexample of IG-P-Q37 does not pass',
    async run() {
      const { v, row } = await verdictKit();
      const got = v.workRule(workArm(v, row, 900, 1100, 10, 1), workArm(v, row, 1000, 1010, 10));
      assert(got.verdict === 'unknown', `the counterexample: ${JSON.stringify(got)}`);
      same([got.screen.hiRatio, got.noScreen.loRatio, got.screen.loRatio, got.noScreen.hiRatio], [110, 100, 90, 101], 'the four ratios');
      same([got.screen.completedRatio, got.noScreen.completedRatio, got.screen.terminatedCalls, got.noScreen.terminatedCalls], [90, 100, 1, 0], 'the completed-unit ratios and the terminated calls are reported');
    },
  },
  {
    name: 'work: pass and worse',
    async run() {
      const { v, row } = await verdictKit();
      assert(v.workRule(workArm(v, row, 800, 800, 10), workArm(v, row, 1000, 1000, 10)).verdict === 'pass', 'a screen arm with 80 units per puzzle against 100 did not pass');
      assert(v.workRule(workArm(v, row, 1200, 1200, 10), workArm(v, row, 1000, 1010, 10)).verdict === 'worse', 'a screen arm with 120 units per puzzle against at most 101 was not worse');
      // The boundary of each rule, per accepted puzzle, and the arms' rows summed.
      assert(v.workRule(workArm(v, row, 1000, 1000, 10), workArm(v, row, 2000, 2000, 20)).verdict === 'pass', 'hi 100 per puzzle against lo 100 per puzzle did not pass');
      assert(v.workRule(workArm(v, row, 1000, 1100, 10), workArm(v, row, 900, 1000, 10)).verdict === 'unknown', 'overlapping intervals were decided');
      const two = [...workArm(v, row, 400, 400, 10), ...workArm(v, row, 400, 400, 10)];
      const sums = v.workRule(two, workArm(v, row, 2000, 2000, 20));
      same([sums.screen.lo, sums.screen.hi, sums.screen.accepted, sums.screen.rows, sums.verdict], [800, 800, 20, 2, 'pass'], `two rows: ${JSON.stringify(sums.screen)}`);
    },
  },
  {
    name: 'work: nothing missing is read as no work',
    async run() {
      const { v, row } = await verdictKit();
      const ok = workArm(v, row, 1000, 1000, 10);
      const incomplete = [{ ...ok[0], ledger: { complete: false, problems: ['open call x'], lo: 0, hi: 0 } }];
      assert(v.workRule(incomplete, ok).verdict === 'unknown' && v.workRule(ok, incomplete).verdict === 'unknown', 'an incomplete ledger of either arm passed');
      const none = workArm(v, row, 0, 0, 0);
      const empty = v.workRule(none, ok);
      assert(empty.verdict === 'unknown' && empty.screen.loRatio === null && empty.screen.hiRatio === null, `an arm with no accepted puzzle: ${JSON.stringify(empty.screen)}`);
      const censored = [{ ingested: v.ingestRow(row(0, 's0', { accepted: 10, tenth: 30000, over: { interrupted: true } }), { quantity: 10 }), ledger: ok[0].ledger }];
      assert(v.workRule(censored, ok).verdict === 'unknown', 'a row that is not valid passed');
      assert(v.workRule([...ok, ...censored], ok).verdict === 'unknown', 'an arm with a valid row beside a censored one was decided');
      const open = [{ ...ok[0], ledger: { ...ok[0].ledger, lo: 800, hi: Infinity } }];
      assert(v.workRule(open, ok).verdict === 'unknown' && v.workRule(open, ok).screen.hiRatio === Infinity, 'an unbounded interval was decided');
      assert(thrownBy(() => v.workRule([{ ingested: ok[0].ingested }], ok)).includes('ledger') && thrownBy(() => v.workRule(null, ok)).includes('workRule'), 'a row without a ledger, or a missing arm, did not throw');
    },
  },
  {
    name: 'class: the defaults admit',
    async run() {
      const kit = await verdictKit();
      const got = kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'] }));
      assert(got.verdict === 'admitted' && got.decidedBy === null, `the defaults: ${JSON.stringify(got)}`);
      assert(near(got.faster.geoMean, 1.5) && got.faster.pass === true, `the faster rule: ${JSON.stringify(got.faster)}`);
      same(got.clue, { n: 40, medianDiff: 0, moved2: 0, pass: true }, 'the clue rule');
      same(got.completion, { a: { screen: 20, noScreen: 20 }, b: { screen: 20, noScreen: 20 } }, 'the completion counts');
      assert(got.work.verdict === 'pass' && got.work.screen.loRatio === 10 && got.work.noScreen.accepted === 400, `the work: ${JSON.stringify(got.work)}`);
      same([got.evidence, got.problems], [[], []], 'no evidence problem, no problem');
    },
  },
  {
    name: 'class: 14 versus 15 matched sets',
    async run() {
      const kit = await verdictKit();
      const zero = { row: { accepted: 0, tenth: null }, ledger: { lo: 0, hi: 0 } };
      const few = (/** @type {number} */ n) => kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], rows: (arm, cell, rep) => (arm === 'screen' && cell === 'b' && rep < n ? zero : undefined) }));
      const fourteen = few(6);
      assert(fourteen.verdict === 'inconclusive' && fourteen.decidedBy === 'matched-sets', `14 matched sets: ${JSON.stringify(fourteen.decidedBy)}`);
      const fifteen = few(5);
      assert(fifteen.verdict === 'failed' && fifteen.decidedBy === 'completion', `15 matched sets: ${JSON.stringify([fifteen.verdict, fifteen.decidedBy])}`);
      same(fifteen.completion.b, { screen: 15, noScreen: 20 }, '15 against 20 reach ten');
      // Every condition before the completion passes: the verdict is the completion rule's alone.
      assert(fifteen.clue.pass === true && fifteen.faster.pass === true && fifteen.work.verdict === 'pass', `the earlier conditions: ${JSON.stringify([fifteen.clue, fifteen.faster.pass, fifteen.work.verdict])}`);
      // 19 against 20 reach ten (not fewer than the no-screen arm's less 1) still pass the completion rule.
      const nineteen = kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], rows: (arm, cell, rep) => (arm === 'screen' && cell === 'b' && rep === 0 ? { row: { accepted: 9, tenth: null }, ledger: { lo: 90, hi: 90 } } : undefined) }));
      assert(nineteen.verdict === 'admitted' && nineteen.completion.b.screen === 19, `19 against 20: ${JSON.stringify([nineteen.verdict, nineteen.decidedBy])}`);
      // The matched sets of a cell need distinct seeds: 20 matched sets over 15 seeds pass, over 14 do not.
      const shared = (/** @type {number} */ n) => kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], rows: (arm, cell, rep) => (cell === 'b' && rep < n ? { seed: 's0' } : undefined) }));
      assert(shared(6).verdict === 'admitted' && shared(6).clue.n === 40, `20 matched sets over 15 seeds: ${JSON.stringify(shared(6).decidedBy)}`);
      const seeds14 = shared(7);
      assert(seeds14.verdict === 'inconclusive' && seeds14.decidedBy === 'matched-sets' && seeds14.clue.n === 40, `20 matched sets over 14 seeds: ${JSON.stringify([seeds14.verdict, seeds14.decidedBy])}`);
    },
  },
  {
    name: 'class: correctness before missing rows',
    async run() {
      const kit = await verdictKit();
      const wrong = { phase: 'validation', code: 'invalid-pack', message: 'x' };
      const gap = (/** @type {string} */ arm, /** @type {string} */ cell, /** @type {number} */ rep) => (arm === 'noScreen' && cell === 'a' && rep === 3 ? null : undefined);
      const missing = kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], rows: gap }));
      assert(missing.verdict === 'inconclusive' && missing.decidedBy === 'incomplete-validation' && missing.problems.includes('a: missing row: side b rep 3'), `a missing row: ${JSON.stringify(missing)}`);
      assert(missing.faster === null, 'a rep without a pair gave a faster verdict');
      const wrongRow = kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], rows: (arm, cell, rep) => (arm === 'screen' && cell === 'a' && rep === 2 ? { row: { over: { errors: [wrong] } } } : gap(arm, cell, rep)) }));
      assert(wrongRow.verdict === 'failed' && wrongRow.decidedBy === 'correctness', `a correctness failure beside a missing row: ${JSON.stringify([wrongRow.verdict, wrongRow.decidedBy])}`);
      // A censored row is missing evidence, not a correctness failure; it reaches no statistic, the completion count included.
      const cut = kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], rows: (arm, cell, rep) => (arm === 'screen' && cell === 'a' && rep === 2 ? { row: { over: { interrupted: true } } } : undefined) }));
      assert(cut.verdict === 'inconclusive' && cut.decidedBy === 'incomplete-validation' && cut.completion.a.screen === 19, `a censored row: ${JSON.stringify([cut.verdict, cut.decidedBy, cut.completion.a])}`);
    },
  },
  {
    name: 'class: an evidence problem',
    async run() {
      const kit = await verdictKit();
      const got = kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], rows: (arm, cell, rep) => (arm === 'screen' && cell === 'a' && rep === 0 ? { row: { clues: [] } } : undefined) }));
      assert(got.verdict === 'inconclusive' && got.decidedBy === 'evidence', `an evidence problem: ${JSON.stringify([got.verdict, got.decidedBy])}`);
      same(got.evidence, [{ cell: 'a', rep: 0, side: 'a', problem: 'clues: 0 of 10' }], 'the evidence entry');
    },
  },
  {
    name: 'class: the clue rule',
    async run() {
      const kit = await verdictKit();
      const input = synthClass(kit, { cells: ['a', 'b'], rows: (arm, cell, rep) => (arm === 'screen' && cell === 'a' && rep < 9 ? { row: { clue: 14 } } : undefined) });
      // RV4-06: the evidence of those nine rows is complete (`K` 30), so the failure is the clue rule's, never missing evidence.
      assert(input.cells[0].screenRows.slice(0, 9).every((/** @type {any} */ r) => kit.v.puzzleEvidence(r.run).clues === null), 'a clue evidence problem in the nine rows');
      const got = kit.v.classVerdict(input);
      assert(got.verdict === 'failed' && got.decidedBy === 'clue', `the clue rule: ${JSON.stringify([got.verdict, got.decidedBy])}`);
      same(got.clue, { n: 40, medianDiff: 0, moved2: 9, pass: false }, 'moved2 is 9 of 40');
    },
  },
  {
    name: 'class: the faster rule',
    async run() {
      const kit = await verdictKit();
      const got = kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], rows: (arm) => (arm === 'screen' ? { row: { tenth: 45000 } } : undefined) }));
      assert(got.verdict === 'failed' && got.decidedBy === 'faster' && near(got.faster.geoMean, 1), `equal times: ${JSON.stringify([got.verdict, got.decidedBy, got.faster])}`);
      // The floor of every cell: a cell at 0.45 fails the class although the other one is at 1.5.
      const floor = kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], rows: (arm, cell) => (arm === 'screen' && cell === 'b' ? { row: { tenth: 100000, response: 110000 } } : undefined) }));
      assert(floor.verdict === 'failed' && floor.decidedBy === 'faster' && near(floor.faster.cellGeoMeans.b, 0.45) && near(floor.faster.cellGeoMeans.a, 1.5), `a slow cell: ${JSON.stringify(floor.faster)}`);
    },
  },
  {
    name: 'class: the work rule',
    async run() {
      const kit = await verdictKit();
      const ledgers = (/** @type {any} */ ledger) => synthClass(kit, { cells: ['a', 'b'], rows: (arm) => (arm === 'screen' ? { ledger } : undefined) });
      const worse = kit.v.classVerdict(ledgers({ lo: 110, hi: 110 }));
      assert(worse.verdict === 'failed' && worse.decidedBy === 'work' && worse.work.verdict === 'worse', `110 against 100 units per row: ${JSON.stringify([worse.verdict, worse.decidedBy])}`);
      const unknown = kit.v.classVerdict(ledgers({ lo: 90, hi: 120 }));
      assert(unknown.verdict === 'inconclusive' && unknown.decidedBy === 'work-unknown', `an interval across the other arm's: ${JSON.stringify([unknown.verdict, unknown.decidedBy])}`);
      same([unknown.work.screen.loRatio, unknown.work.screen.hiRatio, unknown.work.noScreen.loRatio], [9, 12, 10], 'the intervals are reported');
      // A row without a ledger has no journal: the class is inconclusive, never admitted.
      const bare = kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], rows: (arm, cell, rep) => (arm === 'screen' && cell === 'a' && rep === 4 ? { ledger: null } : undefined) }));
      assert(bare.verdict === 'inconclusive' && bare.decidedBy === 'work-unknown' && bare.problems.includes('a: screen c~4: no journal'), `no journal: ${JSON.stringify([bare.verdict, bare.decidedBy, bare.problems])}`);
      const incomplete = kit.v.classVerdict(ledgers({ complete: false, problems: ['open call x'] }));
      assert(incomplete.decidedBy === 'work-unknown' && incomplete.problems.includes('a: screen c~0: open call x'), `an incomplete ledger: ${JSON.stringify(incomplete.problems.slice(0, 2))}`);
    },
  },
  {
    name: 'class: a faster screen arm failing a cell gate',
    async run() {
      const kit = await verdictKit();
      const gate = (/** @type {Record<string, string>} */ gates) => kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], gates }));
      const failed = gate({ b: 'fail' });
      assert(failed.verdict === 'failed' && failed.decidedBy === 'cell-gate', `a failing gate: ${JSON.stringify([failed.verdict, failed.decidedBy])}`);
      const incomplete = gate({ b: 'incomplete' });
      assert(incomplete.verdict === 'inconclusive' && incomplete.decidedBy === 'cell-gate', `an incomplete gate: ${JSON.stringify([incomplete.verdict, incomplete.decidedBy])}`);
      assert(gate({ a: 'incomplete', b: 'fail' }).verdict === 'failed', 'a failing cell was hidden by an incomplete one');
    },
  },
  {
    name: 'class: the order of the conditions',
    async run() {
      const kit = await verdictKit();
      const zero = { row: { accepted: 0, tenth: null }, ledger: { lo: 0, hi: 0 } };
      const decided = (/** @type {any} */ spec) => {
        const got = kit.v.classVerdict(synthClass(kit, { cells: ['a', 'b'], ...spec }));
        return `${got.verdict}/${got.decidedBy}`;
      };
      const clue14 = (/** @type {string} */ arm, /** @type {string} */ cell, /** @type {number} */ rep) => (arm === 'screen' && cell === 'a' && rep < 9 ? { row: { clue: 14 } } : undefined);
      const slow = { row: { tenth: 45000 } };
      const merge = (/** @type {any} */ x, /** @type {any} */ y) => (x === undefined ? y : y === undefined ? x : { row: { ...x.row, ...y.row }, ledger: { ...x.ledger, ...y.ledger } });
      same([
        decided({ rows: (/** @type {any} */ arm, /** @type {any} */ cell, /** @type {any} */ rep) => merge(clue14(arm, cell, rep), arm === 'screen' ? slow : undefined) }),
        decided({ rows: (/** @type {any} */ arm) => (arm === 'screen' ? { ...slow, ledger: { lo: 110, hi: 110 } } : undefined) }),
        decided({ rows: (/** @type {any} */ arm, /** @type {any} */ cell, /** @type {any} */ rep) => (arm === 'screen' ? (cell === 'b' && rep < 5 ? { ...zero, ledger: { lo: 130, hi: 130 } } : { ledger: { lo: 130, hi: 130 } }) : undefined) }),
        decided({ rows: (/** @type {any} */ arm, /** @type {any} */ cell, /** @type {any} */ rep) => (arm === 'screen' && cell === 'b' && rep < 5 ? zero : undefined), gates: { b: 'fail' } }),
        decided({ rows: (/** @type {any} */ arm, /** @type {any} */ cell, /** @type {any} */ rep) => merge(clue14(arm, cell, rep), arm === 'screen' && cell === 'b' && rep < 6 ? zero : undefined) }),
        decided({ rows: (/** @type {any} */ arm, /** @type {any} */ cell, /** @type {any} */ rep) => (arm === 'screen' && cell === 'a' && rep === 0 ? { row: { clues: [] } } : arm === 'screen' && cell === 'b' && rep < 6 ? zero : undefined) }),
        decided({ rows: (/** @type {any} */ arm, /** @type {any} */ cell, /** @type {any} */ rep) => (arm === 'screen' && cell === 'a' && rep === 0 ? { row: { clues: [] } } : arm === 'noScreen' && cell === 'a' && rep === 3 ? null : undefined) }),
      ], ['failed/clue', 'failed/faster', 'failed/work', 'failed/completion', 'inconclusive/matched-sets', 'inconclusive/evidence', 'inconclusive/incomplete-validation'], 'two failing conditions give the earlier one');
      // The options are checked before any condition: a missing one is never an unused one (here the faster rule is never reached).
      const base = synthClass(kit, { cells: ['a'] });
      const wrong = synthClass(kit, { cells: ['a'], rows: (arm, cell, rep) => (arm === 'screen' && rep === 0 ? { row: { over: { errors: [{ phase: 'validation', code: 'invalid-pack', message: 'x' }] } } } : undefined) });
      assert(kit.v.classVerdict(wrong).decidedBy === 'correctness' && ['resampleSeed', 'resamples'].every((k) => thrownBy(() => kit.v.classVerdict({ ...wrong, [k]: undefined })).includes(k)), 'a missing resampling option did not throw before the verdict');
      assert(['capMs', 'quantity', 'resampleSeed', 'resamples', 'reps'].every((k) => thrownBy(() => kit.v.classVerdict({ ...base, [k]: undefined })).includes(k)), 'a missing option did not throw');
      assert(thrownBy(() => kit.v.classVerdict({ ...base, cells: [] })).includes('cell') && thrownBy(() => kit.v.classVerdict({ ...base, cells: [{ ...base.cells[0], screenCellGate: 'ok' }] })).includes('screenCellGate'), 'no cell, or a gate that is none of the three, did not throw');
    },
  },
  {
    name: 'class: a missing quantity throws',
    async run() {
      const { v, row } = await verdictKit();
      const r = row(0, 's0', { accepted: 10, tenth: 30000 });
      /** @param {() => unknown} fn @returns {unknown} */
      const thrown = (fn) => {
        try {
          fn();
        } catch (e) {
          return e;
        }
        return null;
      };
      for (const e of [thrown(() => v.reachedTen(r.run, {})), thrown(() => v.cappedT10(r.run, { capMs: 120000 }))]) {
        assert(e instanceof RangeError && e.message.includes('quantity'), `a missing quantity: ${String(e)}`);
      }
      assert(v.reachedTen(r.run, { quantity: 10 }) === true, 'a row with ten puzzles did not reach ten');
    },
  },
  {
    name: 'verdicts: fallback arm',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      // A class whose faster rule fails is `failed`: its cells are judged on the no-screen arm.
      const failedClass = v.classVerdict(synthClass(kit, { cells: ['a'], rows: (arm) => (arm === 'screen' ? { row: { tenth: 45000 } } : undefined) }));
      assert(failedClass.verdict === 'failed', `the class: ${failedClass.verdict}`);
      const cls = { screen: 'screen arm', noScreen: 'no-screen arm' };
      assert(v.shippedArm(failedClass, cls) === 'no-screen arm', 'a failed class did not ship its no-screen arm');
      assert(v.shippedArm({ verdict: 'inconclusive' }, cls) === 'no-screen arm' && v.shippedArm({ verdict: 'admitted' }, cls) === 'screen arm', 'the other class verdicts');
      assert(thrownBy(() => v.shippedArm({ verdict: 'pass' }, cls)).includes('class verdict') && thrownBy(() => v.shippedArm(failedClass, { screen: 'a' })).includes('no-screen'), 'a bad verdict or a one-armed class did not throw');
      const short = (/** @type {number[]} */ ...which) => (/** @type {number} */ rep) => (which.includes(rep) ? { row: { accepted: 9, tenth: null } } : undefined);
      const gate = (/** @type {any[]} */ rows, /** @type {any} */ journals = journalsOf(rows)) => v.cellGate('failing', rows, { ...gateOptions, journals });
      const a = gate(armRows(kit, short(3)));
      same([a.verdict, a.reasons, a.reachedTen, a.deadEnds], ['pass', [], 19, 0], `(a) 19 of 20 reach ten: ${JSON.stringify(a)}`);
      const b = gate(armRows(kit, short(3, 4, 5)));
      same([b.verdict, b.reachedTen], ['fail', 17], `(b) 17 of 20 reach ten: ${JSON.stringify(b)}`);
      assert(b.reasons[0].includes('3 valid requests did not reach ten') && b.reasons[0].includes('3, 4, 5'), `(b) the reason: ${b.reasons[0]}`);
      const c = gate(armRows(kit, (rep) => (rep >= 17 ? null : undefined)));
      same([c.verdict, c.reasons], ['incomplete', ['missing row: rep 17', 'missing row: rep 18', 'missing row: rep 19']], `(c) three declared rows missing: ${JSON.stringify(c)}`);
      const wrong = { phase: 'validation', code: 'invalid-pack', message: 'x' };
      const d = gate(armRows(kit, (rep) => (rep === 6 ? { row: { over: { errors: [wrong] } } } : undefined)));
      assert(d.verdict === 'fail' && d.reasons[0].startsWith('incorrect row: rep 6'), `(d) an incorrect row: ${JSON.stringify(d)}`);
      // The order of the conditions: a dead end fails before anything is missing; the third failure settles the cell.
      const rows = armRows(kit);
      const deadJournals = { ...journalsOf(rows), 'c~4': [{ t: 'phase', call: 'y', phase: 'p2' }, { t: 'phase', call: 'y', phase: 'p2' }] };
      const dead = gate(rows, deadJournals);
      assert(dead.verdict === 'fail' && dead.deadEnds === 1 && dead.reasons[0].includes('dead-end entry') && dead.reasons[0].includes('c~4'), `a dead end: ${JSON.stringify(dead)}`);
      const gap = armRows(kit, (rep) => (rep === 19 ? null : undefined));
      assert(gate(gap, deadJournals).verdict === 'fail', 'a missing row hid a dead end');
      assert(gate(armRows(kit, (rep) => (rep === 19 ? null : short(3, 4, 5)(rep)))).verdict === 'fail', 'the third failure did not settle the cell beside a missing row');
      const two = gate(armRows(kit, (rep) => (rep === 19 ? null : short(3, 4)(rep))));
      same([two.verdict, two.reasons], ['incomplete', ['missing row: rep 19']], `two failures and a missing row: ${JSON.stringify(two)}`);
      // A journal that is absent makes a valid row incomplete, never clean; a dead end in a row that is not valid is not read.
      const noJournal = gate(rows, { ...journalsOf(rows), 'c~5': null });
      same([noJournal.verdict, noJournal.reasons], ['incomplete', ['no journal: row c~5']], `a row without its journal: ${JSON.stringify(noJournal)}`);
      assert(gate(rows, Object.fromEntries(Object.entries(journalsOf(rows)).filter(([k]) => k !== 'c~5'))).reasons[0] === 'no journal: row c~5', 'an absent key is not an absent journal');
      const cut = armRows(kit, (rep) => (rep === 2 ? { row: { over: { measurementValid: false } } } : undefined));
      const cutGate = gate(cut, { ...journalsOf(cut), 'c~2': [{ t: 'phase', call: 'y', phase: 'p2' }] });
      assert(cutGate.verdict === 'incomplete' && cutGate.deadEnds === 0 && cutGate.reasons[0].startsWith('status censored: rep 2'), `a censored row: ${JSON.stringify(cutGate)}`);
      const twice = gate([...rows, rows[7]], journalsOf(rows));
      same([twice.verdict, twice.reasons], ['incomplete', ['duplicate rows: rep 7 has 2']], `a duplicate row: ${JSON.stringify(twice)}`);
      const extra = [...rows, v.ingestRow(kit.row(20, 's20', { accepted: 10, tenth: 40000 }), { quantity: 10 })];
      same(gate(extra, journalsOf(extra)).reasons, ['row outside the declared replicates: rep 20'], 'a row outside the declared replicates');
      // The deadline violations and the tail are reported beside the gate.
      const tail = armRows(kit, (rep) => (rep === 1 ? { row: { tenth: 50000 } } : rep === 2 ? { row: { tenth: 60000 } } : rep === 7 ? { row: { response: 125000 } } : undefined));
      const reported = gate(tail);
      same([reported.verdict, reported.deadlineViolations, reported.p95Ms, reported.noRegression], ['pass', 1, 50000, null], `the report: ${JSON.stringify(reported)}`);
      // A missing option is never an unused one.
      assert(thrownBy(() => v.cellGate('failing', rows, { ...gateOptions })).includes('journals') && thrownBy(() => v.cellGate('failing', rows, { ...gateOptions, journals: {}, quantity: undefined })).includes('quantity'), 'a missing journals or quantity did not throw');
      assert(thrownBy(() => v.cellGate('cell', rows, gateOptions)).includes('kind') && thrownBy(() => v.cellGate('control', rows, gateOptions)).includes('todayRows'), 'a bad kind or a control without today\'s rows did not throw');
      assert(thrownBy(() => v.cellGate('failing', rows.map((r) => r.run), { ...gateOptions, journals: {} })).includes('ingested'), 'raw rows did not throw');
    },
  },
  {
    name: 'verdicts: one failing global Nightmare cell',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      const green = greenPhase0(kit);
      const pass = v.phase0Verdict(green);
      assert(pass.verdict === 'pass' && pass.deciding.length === 11 && pass.deciding.every((d) => d.endsWith(': pass')), `the green input: ${JSON.stringify(pass)}`);
      // Five failing cells pass and one fails on its shipped arm: phase 0 fails and names that cell.
      const rows = armRows(kit, (rep) => (rep >= 17 ? { row: { accepted: 9, tenth: null } } : undefined));
      const bad = v.cellGate('failing', rows, { ...gateOptions, journals: journalsOf(rows) });
      assert(bad.verdict === 'fail', `the failing cell: ${JSON.stringify(bad)}`);
      const one = v.phase0Verdict({ ...green, cells: [...green.cells, { cell: '9x9-nightmare', ...bad }] });
      same(one, { verdict: 'fail', deciding: ['failing cell 9x9-nightmare: fail'] }, `one failing cell: ${JSON.stringify(one)}`);
      // An incomplete cell does not fail phase 0, and a failing one wins over it.
      const open = { cell: '9x9-nightmare', verdict: 'incomplete', reasons: ['missing row: rep 3'] };
      same(v.phase0Verdict({ ...green, cells: [...green.cells, open] }), { verdict: 'incomplete', deciding: ['failing cell 9x9-nightmare: incomplete'] }, 'an incomplete cell');
      assert(v.phase0Verdict({ ...green, cells: [open, { cell: 'z', ...bad }] }).verdict === 'fail', 'an incomplete cell hid a failing one');
      // A failed or inconclusive class fails nothing by itself; a class without a verdict is incomplete.
      same(v.phase0Verdict({ ...green, classes: [{ id: 'a', verdict: 'inconclusive' }, { id: 'b', verdict: 'admitted' }] }).verdict, 'pass', 'classes with a verdict');
      same(v.phase0Verdict({ ...green, classes: [{ id: 'a', verdict: null }] }), { verdict: 'incomplete', deciding: ['class a (no verdict): incomplete'] }, 'a class without a verdict');
      // A control, a Master cell and a prerequisite fail phase 0 as well.
      const failing = { verdict: 'fail', reasons: ['x'] };
      same(v.phase0Verdict({ ...green, controls: [{ cell: '18x18', ...failing }] }).deciding, ['control 18x18: fail'], 'a failing control');
      same(v.phase0Verdict({ ...green, masters: [{ cell: 'm', ...failing }] }).deciding, ['master m: fail'], 'a failing Master cell');
      same(v.phase0Verdict({ ...green, prerequisites: { ...green.prerequisites, stage1: { status: 'fail', reasons: ['x'] } } }).deciding, ['prerequisite stage1: fail'], 'a failing prerequisite');
      assert(thrownBy(() => v.phase0Verdict({ ...green, cells: [{ cell: 'z', verdict: 'ok' }] })).includes('status') && thrownBy(() => v.phase0Verdict({ ...green, cells: undefined })).includes('cells'), 'a verdict that is none of the three, or a missing list, did not throw');
    },
  },
  {
    name: 'verdicts: Master identity on complete keys',
    async run() {
      const kit = await verdictKit();
      const { v, keysOf } = kit;
      const reps = [0, 1, 2, 3, 4];
      const identity = (/** @type {any} */ today, /** @type {any} */ after) => v.masterIdentity(masterSide(kit, today), masterSide(kit, after), reps);
      same(identity(undefined, undefined), { verdict: 'pass', differences: [], problems: [] }, '(a) equal default keys');
      const b = identity(undefined, (/** @type {number} */ rep) => (rep === 3 ? { keys: [sha256('other'), ...keysOf('s3', 10).slice(1)] } : undefined));
      same([b.verdict, b.differences], ['fail', [{ rep: 3, seed: 's3', field: 'igPuzzleKeys[0]' }]], `(b) a key differs: ${JSON.stringify(b)}`);
      const c = identity(undefined, (/** @type {number} */ rep) => (rep === 4 ? null : undefined));
      same([c.verdict, c.differences, c.problems], ['incomplete', [], ['missing row: side a rep 4']], `(c) a missing after row: ${JSON.stringify(c)}`);
      // Equal empty key lists of ten accepted puzzles are never equality.
      const d = identity(() => ({ keys: [] }), () => ({ keys: [] }));
      assert(d.verdict === 'incomplete' && d.differences.length === 0 && d.problems.length === 10 && d.problems[0] === 'puzzle keys today rep 0: puzzle keys: 0 of 10', `(d) empty keys: ${JSON.stringify(d.problems.slice(0, 2))}`);
      const e = identity(undefined, (/** @type {number} */ rep) => (rep === 2 ? { keys: keysOf('s2', 9) } : undefined));
      same([e.verdict, e.problems], ['incomplete', ['puzzle keys after rep 2: puzzle keys: 9 of 10']], `(e) nine keys of ten: ${JSON.stringify(e)}`);
      // Zero accepted puzzles are an empty list whatever `details` hold; they are read nowhere.
      const none = (/** @type {number} */ rep) => (rep === 1 ? { accepted: 0, tenth: null, over: { details: null } } : undefined);
      same(identity(none, none), { verdict: 'pass', differences: [], problems: [] }, '(f) zero accepted puzzles on both sides');
      // `details` of a request with no accepted puzzle are never read: stale keys that differ between the sides change nothing.
      const stale = (/** @type {string} */ key) => (/** @type {number} */ rep) => (rep === 1 ? { accepted: 0, tenth: null, over: { details: { igPuzzleKeys: [key] } } } : undefined);
      same(identity(stale('today'), stale('after')), { verdict: 'pass', differences: [], problems: [] }, '(f) stale keys of zero accepted puzzles');
      // More: another count, a difference beside a missing row, an incorrect row, another seed.
      const nine = identity(none, (/** @type {number} */ rep) => (rep === 1 ? { accepted: 9, keys: keysOf('s1', 9) } : undefined));
      same(nine.differences, [{ rep: 1, seed: 's1', field: 'acceptedCount' }], 'another accepted count');
      const zero = identity(none, undefined);
      same([zero.verdict, zero.differences], ['fail', [{ rep: 1, seed: 's1', field: 'acceptedCount' }]], 'zero against ten accepted');
      const both = identity(undefined, (/** @type {number} */ rep) => (rep === 4 ? null : rep === 3 ? { keys: [...keysOf('s3', 9), sha256('last')] } : undefined));
      same([both.verdict, both.differences.length, both.problems], ['fail', 1, ['missing row: side a rep 4']], `a difference beside a missing row: ${JSON.stringify(both)}`);
      const wrong = identity(undefined, (/** @type {number} */ rep) => (rep === 0 ? { over: { errors: [{ phase: 'validation', code: 'invalid-pack', message: 'x' }] } } : undefined));
      assert(wrong.verdict === 'fail' && wrong.problems[0].startsWith('status incorrect: side a rep 0'), `an incorrect row: ${JSON.stringify(wrong)}`);
      const after = masterSide(kit);
      after[2] = v.ingestRow(kit.row(2, 'other', { accepted: 10, tenth: 30000 }), { quantity: 10 });
      const seeds = v.masterIdentity(masterSide(kit), after, reps);
      assert(seeds.verdict === 'incomplete' && seeds.problems.includes('seed differs at rep 2: side a "other", side b "s2"'), `another seed: ${JSON.stringify(seeds)}`);
      // Phase 0 reads the cell: a difference fails it, a missing row leaves it incomplete.
      const green = greenPhase0(kit);
      same(v.phase0Verdict({ ...green, masters: [{ cell: 'm', ...b }] }), { verdict: 'fail', deciding: ['master m: fail'] }, 'phase 0 with (b)');
      same(v.phase0Verdict({ ...green, masters: [{ cell: 'm', ...c }] }), { verdict: 'incomplete', deciding: ['master m: incomplete'] }, 'phase 0 with (c)');
      same(v.phase0Verdict({ ...green, masters: [{ cell: 'm', ...d }] }).verdict, 'incomplete', 'phase 0 with (d)');
    },
  },
  {
    name: 'verdicts: Hell 1 is reported, not a veto',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      const hell = (/** @type {number} */ reaching) => armRows(kit, (rep) => (rep >= reaching ? { row: { accepted: 6, tenth: null } } : undefined));
      const twelve = v.hell1Report(hell(12), { reps: REPS20, quantity: 10 });
      same(twelve, { requests: 20, valid: 20, reachedTen: 12, candidate: false }, `12 of 20: ${JSON.stringify(twelve)}`);
      assert(v.hell1Report(hell(18), { reps: REPS20, quantity: 10 }).candidate === true && v.hell1Report(hell(17), { reps: REPS20, quantity: 10 }).candidate === false, '18 of 20 is a candidate, 17 is not');
      // A request that is missing or not valid cannot reach ten.
      const gap = v.hell1Report(armRows(kit, (rep) => (rep >= 17 ? null : rep === 0 ? { row: { over: { measurementValid: false } } } : undefined)), { reps: REPS20, quantity: 10 });
      same(gap, { requests: 17, valid: 16, reachedTen: 16, candidate: false }, `a missing and a censored request: ${JSON.stringify(gap)}`);
      assert(thrownBy(() => v.hell1Report(hell(12), { reps: REPS20 })).includes('quantity'), 'a missing quantity did not throw');
      // Never a veto: the report is not an input of phase 0, and every other item passes.
      const green = greenPhase0(kit);
      same(v.phase0Verdict({ ...green, hell1: twelve }).verdict, 'pass', 'phase 0 with Hell 1 at 12 of 20');
    },
  },
  {
    name: 'verdicts: the projection is never a deadline gate',
    async run() {
      const kit = await verdictKit();
      const { v, row } = kit;
      const times = [60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000, 110000];
      const ingest = (/** @type {any} */ spec) => v.ingestRow(row(0, 's0', spec), { quantity: 10 });
      const r = ingest({ accepted: 10, tenth: 110000, response: 115000, over: { igSetMs: 50000, igAcceptedMs: times } });
      const half = v.deadlineProjection([r], { reserve: 0.5, quantity: 10 });
      same(half.rows, [{ rep: 0, seed: 's0', postHoc: true, status: 'projected', setCut: false, served: 10, completed: true, lost: false }], `reserve 0.5: ${JSON.stringify(half.rows)}`);
      same([half.kind, half.label, 'verdict' in half], ['deadline-projection', 'post-hoc projection; not a live deadline gate', false], 'the kind and the label, and no verdict');
      const six = v.deadlineProjection([r], { reserve: 0.6, quantity: 10 });
      same(six.rows, [{ rep: 0, seed: 's0', postHoc: true, status: 'projected', setCut: true, served: 0, completed: false, lost: true }], `reserve 0.6: ${JSON.stringify(six.rows)}`);
      // The deadline cuts the accepted prefix; a request without a set is not cut; linkage that is absent has no numbers.
      const late = ingest({ accepted: 10, tenth: 116000, response: 120000, over: { igSetMs: 50000, igAcceptedMs: [...times.slice(0, 9), 116000] } });
      same(v.deadlineProjection([late], { reserve: 0.5, quantity: 10 }).rows[0], { rep: 0, seed: 's0', postHoc: true, status: 'projected', setCut: false, served: 9, completed: false, lost: true }, 'the tenth puzzle after 115 s');
      const noSet = ingest({ accepted: 0, over: { igSetMs: null, igAcceptedMs: [] } });
      same(v.deadlineProjection([noSet], { reserve: 0.5, quantity: 10 }).rows[0], { rep: 0, seed: 's0', postHoc: true, status: 'projected', setCut: false, served: 0, completed: false, lost: false }, 'a request without a set');
      const unlinked = v.deadlineProjection([ingest({ accepted: 10, tenth: 30000 }), ingest({ accepted: 10, tenth: 30000, over: { measurementValid: false } })], { reserve: 0.5, quantity: 10 });
      same([unlinked.rows, unlinked.skipped], [[{ rep: 0, seed: 's0', postHoc: true, status: 'not-linked', setCut: null, served: null, completed: null, lost: null }], 1], `a row without linkage: ${JSON.stringify(unlinked)}`);
      assert(v.deadlineProjection([ingest({ accepted: 0, over: { igSetMs: 'x', igAcceptedMs: [] } })], { reserve: 0.5, quantity: 10 }).rows[0].status === 'invalid-timeline', 'a timeline that is not numbers');
      assert(thrownBy(() => v.deadlineProjection([r], { reserve: 1.5, quantity: 10 })).includes('reserve'), 'a reserve above 1 did not throw');
      // Phase 0 never reads the projection; the live-deadline prerequisite alone decides, and it is required.
      const green = greenPhase0(kit);
      const live = { stage1: { status: 'pass', reasons: [] }, liveDeadline: { status: 'incomplete', reasons: ['missing binding x'] } };
      same(v.phase0Verdict({ ...green, prerequisites: live, deadlineProjection: half }), { verdict: 'incomplete', deciding: ['prerequisite liveDeadline: incomplete'] }, 'phase 0 with the live-deadline prerequisite incomplete');
      same(v.phase0Verdict({ ...green, prerequisites: { stage1: live.stage1 } }), { verdict: 'incomplete', deciding: ['prerequisite liveDeadline (missing): incomplete'] }, 'a live-deadline prerequisite that is absent');
    },
  },
  {
    name: 'verdicts: P5 stops over the declared pairs',
    async run() {
      const { v, row } = await verdictKit();
      const linked = { igSetMs: 30000, igAcceptedMs: [35000] };
      const mk = (/** @type {number} */ rep, /** @type {any} */ spec) => v.ingestRow(row(rep, `landscape/c/${rep}`, { tenth: null, ...spec }), { quantity: 10 });
      const stop = { partialReason: 'set:no-window-below', igSetMs: null, igAcceptedMs: [] };
      const bounded = [0, 1, 2, 3, 4, 6].map((rep) => mk(rep, { accepted: 0, over: stop }));
      bounded.push(mk(5, { accepted: 0, over: { ...stop, responseMs: 'x' } }));
      const uncapped = [
        mk(0, { accepted: 10, tenth: 40000, over: linked }),
        mk(1, { accepted: 1, over: linked }),
        mk(2, { accepted: 0, over: { igSetMs: null, igAcceptedMs: [], partialReason: 'set:time-limit' } }),
        mk(4, { accepted: 10, tenth: 40000, over: { ...linked, measurementValid: false, errors: [{ phase: 'host', code: 'child-timeout', message: 'x' }] } }),
        mk(5, { accepted: 10, tenth: 40000, over: linked }),
        mk(6, { accepted: 10, tenth: 40000 }),
      ];
      const reps = [0, 1, 2, 3, 4, 5, 6, 7];
      const got = v.p5Stops(bounded, uncapped, { quantity: 10, cell: 'c', reps });
      same([got.declared, got.pairs, got.falseStops, got.lostCompletions, got.unknown], [8, 3, 2, 1, 5], `the counts: ${JSON.stringify(got)}`);
      same([got.falseStopReps, got.lostReps, got.unknownReps.map((u) => u.rep), got.unexpected], [[0, 1], [0], [3, 4, 5, 6, 7], []], 'the reps');
      const reason = (/** @type {number} */ rep) => /** @type {string} */ (got.unknownReps.find((u) => u.rep === rep)?.reason);
      assert(reason(7) === 'missing' && reason(3) === 'missing uncapped row' && reason(4).startsWith('uncapped row is censored') && reason(5).startsWith('bounded row is invalid')
        && reason(6) === 'uncapped row is not linked (no igSetMs)', `the reasons: ${JSON.stringify(got.unknownReps)}`);
      // A false stop needs a finite igSetMs on the uncapped row (rep 2: none), whatever its count (rep 1: one puzzle).
      assert(!got.falseStopReps.includes(2) && got.falseStopReps.includes(1), 'rep 2 or rep 1 was read wrongly');
      // Rows outside the declared pairs are listed and not counted; a duplicate or another seed is unknown.
      const other = row(0, 'landscape/other/0', { accepted: 10, tenth: 40000, over: linked });
      other.caseId = 'other';
      other.run.caseId = 'other';
      const outside = v.p5Stops([...bounded, mk(99, { accepted: 0, over: stop })], [...uncapped, v.ingestRow(other, { quantity: 10 })], { quantity: 10, cell: 'c', reps });
      same([outside.falseStops, outside.lostCompletions, outside.unknown, outside.unexpected.map((u) => [u.side, u.caseId, u.rep])], [2, 1, 5, [['bounded', 'c', 99], ['uncapped', 'other', 0]]], `unexpected rows: ${JSON.stringify(outside.unexpected)}`);
      const twice = v.p5Stops(bounded, [...uncapped, uncapped[0]], { quantity: 10, cell: 'c', reps });
      assert(twice.unknownReps.find((u) => u.rep === 0)?.reason === 'duplicate uncapped rows (2)' && twice.falseStops === 1, `a duplicate row: ${JSON.stringify(twice.unknownReps)}`);
      const seeded = v.p5Stops(bounded, [v.ingestRow(row(0, 'landscape/c/1', { accepted: 10, tenth: 40000, over: linked }), { quantity: 10 }), ...uncapped.slice(1)], { quantity: 10, cell: 'c', reps });
      assert(seeded.unknownReps.find((u) => u.rep === 0)?.reason.includes('expected landscape/c/0') === true, `another seed: ${JSON.stringify(seeded.unknownReps)}`);
      // A lost completion needs both: the bounded arm reaching ten too is not one.
      const both = v.p5Stops([mk(0, { accepted: 10, tenth: 40000, over: linked })], [uncapped[0]], { quantity: 10, cell: 'c', reps: [0] });
      same([both.pairs, both.falseStops, both.lostCompletions], [1, 0, 0], 'both arms reach ten');
      assert(thrownBy(() => v.p5Stops(bounded, uncapped, { quantity: 10, cell: '', reps })).includes('cell') && thrownBy(() => v.p5Stops(bounded, uncapped, { quantity: 10, cell: 'c', reps: [] })).includes('reps'), 'a missing cell or reps did not throw');
    },
  },
  {
    name: 'verdicts: a selection is not a final admission',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      const selection = greenPhase0(kit, { purpose: 'selection', p5: [] });
      same(v.phase0Verdict(selection), { verdict: 'incomplete', deciding: ['uncapped comparator collection pending'] }, 'a green selection');
      // The same input as a final purpose with no declared P5 pair is not a pass either (lost completions are counted, not assumed).
      same(v.phase0Verdict({ ...selection, purpose: 'final' }), { verdict: 'incomplete', deciding: ['p5 (no declared pair): incomplete'] }, 'a final input with no declared pair');
      const rows = armRows(kit, (rep) => (rep >= 17 ? { row: { accepted: 9, tenth: null } } : undefined));
      const bad = v.cellGate('failing', rows, { ...gateOptions, journals: journalsOf(rows) });
      same(v.phase0Verdict({ ...selection, cells: [...selection.cells, { cell: 'z', ...bad }] }), { verdict: 'fail', deciding: ['failing cell z: fail'] }, 'a selection with a failing cell');
      // Another item that is open comes after the reason.
      const open = v.phase0Verdict({ ...selection, prerequisites: { stage1: { status: 'pass', reasons: [] } } });
      same(open.deciding, ['uncapped comparator collection pending', 'prerequisite liveDeadline (missing): incomplete'], 'the reason first');
      assert(thrownBy(() => v.phase0Verdict({ ...selection, purpose: 'draft' })).includes('purpose'), 'another purpose did not throw');
    },
  },
  {
    name: 'verdicts: final admission needs the whole comparison',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      const green = greenPhase0(kit);
      const stops = (/** @type {(rep: number) => any} */ uncapped, /** @type {(rep: number) => any} */ bounded) => v.p5Stops(p5Side(kit, bounded), p5Side(kit, uncapped), { quantity: 10, cell: 'c', reps: REPS20 });
      // (a) one of the 20 declared pairs is unknown.
      const unknown = stops((rep) => (rep === 7 ? null : undefined), () => undefined);
      same([unknown.declared, unknown.unknown], [20, 1], 'one pair is unknown');
      same(v.phase0Verdict({ ...green, p5: [unknown] }), { verdict: 'incomplete', deciding: ['p5 c: incomplete'] }, '(a) one unknown pair');
      // (b) all 20 are known with one lost completion: counted, not a threshold.
      const lost = stops(() => undefined, (rep) => (rep === 3 ? { row: { accepted: 9, tenth: null } } : undefined));
      same([lost.pairs, lost.lostCompletions, lost.unknown], [20, 1, 0], 'one lost completion');
      same(v.phase0Verdict({ ...green, p5: [lost] }).verdict, 'pass', '(b) one lost completion');
      // A pair that is missing on both sides is unknown, never an empty success.
      const empty = v.p5Stops([], [], { quantity: 10, cell: 'c', reps: REPS20 });
      same([empty.declared, empty.pairs, empty.unknown], [20, 0, 20], 'no row at all');
      same(v.phase0Verdict({ ...green, p5: [empty] }).verdict, 'incomplete', 'no row at all is not a pass');
      assert(thrownBy(() => v.phase0Verdict({ ...green, p5: [{ cell: 'c' }] })).includes('p5Stops'), 'a P5 entry that is not a result did not throw');
    },
  },
  {
    name: 'verdicts: dead ends',
    async run() {
      const { v } = await verdictKit();
      const lines = [{ t: 'phase', call: 'x', phase: 'p1' }, { t: 'phase', call: 'x', phase: 'p2' }, { t: 'phase', call: 'x', phase: 'p2' }, { t: 'phase', call: 'y', phase: 'p2' }];
      assert(v.deadEnds(lines) === 2, `dead ends: ${v.deadEnds(lines)}`);
      assert(v.deadEnds([...lines, { t: 'end', call: 'z', phase: 'p2' }, { t: 'phase', call: 'w', phase: 'p3' }]) === 2, 'another line type or phase counted');
      assert(v.deadEnds([...lines, { t: 'phase', phase: 'p2' }]) === 3 && v.deadEnds([]) === 0, 'a p2 line without a call id, or no line');
      assert(thrownBy(() => v.deadEnds('x')).includes('journal') && thrownBy(() => v.deadEnds([1])).includes('journal'), 'lines that are not objects did not throw');
    },
  },
  {
    name: 'verdicts: the control gate',
    async run() {
      const { v, row } = await verdictKit();
      const rowsOf = (/** @type {number} */ tenth, /** @type {(rep: number) => any} */ spec = () => undefined) => REPS20.flatMap((rep) => {
        const over = spec(rep);
        const { seed = `s${rep}`, ...rest } = over ?? {};
        return over === null ? [] : [v.ingestRow(row(rep, seed, { accepted: 10, tenth, ...rest }), { quantity: 10 })];
      });
      const control = (/** @type {any[]} */ today, /** @type {any[]} */ shipped = rowsOf(40000)) => v.cellGate('control', shipped, { ...gateOptions, todayRows: today, journals: {} });
      const a = control(rowsOf(40000));
      assert(a.verdict === 'pass' && a.noRegression !== null && near(a.noRegression.lower, 1) && a.reachedTen === 20 && a.deadEnds === null, `(a) the same time: ${JSON.stringify(a)}`);
      const b = control(rowsOf(30000));
      assert(b.verdict === 'fail' && b.noRegression !== null && near(b.noRegression.lower, 0.75) && b.reasons[0].startsWith('no regression'), `(b) today is faster: ${JSON.stringify(b)}`);
      // (c) today's arm lacks rep 7: incomplete before any statistic, no exception.
      const c = control(rowsOf(40000, (rep) => (rep === 7 ? null : undefined)));
      same([c.verdict, c.reasons, c.noRegression], ['incomplete', ['missing row: side b rep 7'], null], `(c) a missing today's row: ${JSON.stringify(c)}`);
      assert(control(rowsOf(40000), rowsOf(40000, (rep) => (rep === 2 ? null : undefined))).reasons[0] === 'missing row: side a rep 2', 'the shipped arm lacking a row');
      // Duplicates, a row that is not valid and a seed that differs are pairing problems of either side.
      const today = rowsOf(40000);
      assert(control([...today, today[3]]).reasons[0] === 'duplicate rows: side b rep 3 has 2', 'a duplicate today\'s row');
      assert(control(rowsOf(40000, (rep) => (rep === 3 ? { over: { measurementValid: false } } : undefined))).reasons[0].startsWith('status censored: side b rep 3'), 'a censored today\'s row');
      const wrong = { phase: 'validation', code: 'invalid-pack', message: 'x' };
      const todayWrong = control(rowsOf(40000, (rep) => (rep === 5 ? { over: { errors: [wrong] } } : undefined)));
      assert(todayWrong.verdict === 'incomplete' && todayWrong.reasons[0].startsWith('status incorrect: side b rep 5'), `an incorrect today's row is the comparator's problem: ${JSON.stringify(todayWrong)}`);
      assert(control(today, rowsOf(40000, (rep) => (rep === 4 ? { seed: 'other' } : undefined))).reasons[0].startsWith('seed differs at rep 4'), 'a seed that differs');
      // The shipped arm's own failures decide first, whatever today's arm holds.
      const incorrect = control(today, rowsOf(40000, (rep) => (rep === 6 ? { over: { errors: [wrong] } } : undefined)));
      assert(incorrect.verdict === 'fail' && incorrect.reasons[0].startsWith('incorrect row: rep 6') && incorrect.noRegression === null, `an incorrect shipped row: ${JSON.stringify(incorrect)}`);
      const shortRows = (/** @type {number[]} */ ...which) => rowsOf(40000, (rep) => (which.includes(rep) ? { accepted: 9, tenth: null } : undefined));
      const three = control(shortRows(3, 4, 5), shortRows(3, 4, 5));
      assert(three.verdict === 'fail' && three.reasons[0].includes('3 valid requests did not reach ten') && three.noRegression !== null && three.reachedTen === 17, `3 requests that do not reach ten: ${JSON.stringify(three)}`);
      const two = control(shortRows(3, 4), shortRows(3, 4));
      assert(two.verdict === 'pass' && two.reachedTen === 18, `2 requests that do not reach ten, as today: ${JSON.stringify(two)}`);
      // A shipped arm 5 % faster or 15 % slower than today is judged by the lower bound of 0.9.
      assert(control(rowsOf(38000)).verdict === 'pass' && control(rowsOf(34000)).verdict === 'fail', 'a ratio of 0.95 passes, 0.85 fails');
      assert(thrownBy(() => v.cellGate('control', rowsOf(40000), { ...gateOptions, todayRows: today, resamples: undefined })).includes('resamples') && thrownBy(() => v.cellGate('control', rowsOf(40000), { ...gateOptions, todayRows: today, capMs: undefined })).includes('capMs'), 'a missing resampling option or cap did not throw');
    },
  },
  {
    name: 'verdicts: population per cell',
    async run() {
      const { v, row } = await verdictKit();
      const level = (/** @type {number[]} */ clues, /** @type {number[]} */ scores, /** @type {string} */ id = 'nightmare') => ({ K: 20, puzzles: clues.map((c, i) => ({ clues: c, score: scores[i], level: id })) });
      const mk = (/** @type {number} */ rep, /** @type {any} */ spec, /** @type {string} */ cell = 'c') => {
        const r = row(rep, `s${rep}`, spec);
        r.caseId = cell;
        r.run.caseId = cell;
        return v.ingestRow(r, { quantity: 10 });
      };
      const rows = [
        mk(0, { accepted: 3, over: { ratingCensoredCount: 1, details: level([6, 8, 10], [59, 65, 71]) } }),
        mk(1, { accepted: 1, over: { ratingCensoredCount: 0, details: level([8], [53]) } }),
        mk(2, { accepted: 0, over: { details: null } }),
        mk(3, { accepted: 2, over: { details: { K: 20, puzzles: [{ clues: 7, score: 60, level: 'nightmare' }, { clues: 7 }] } } }),
        mk(4, { accepted: 3, over: { measurementValid: false, details: level([6, 8, 10], [59, 65, 71]) } }),
        mk(5, { accepted: 1, over: { details: level([5], [80], 'hell-1') } }, 'd'),
      ];
      const got = v.population(rows, { quantity: 10 });
      same(Object.keys(got), ['c', 'd'], 'one entry per cell');
      const c = got.c;
      same([c.completion, c.rows, c.puzzles, c.clueShare.min, c.clueShare.max, c.scorePosition.min, c.scorePosition.max], [{ requests: 5, valid: 4, reachedTen: 0 }, 3, 4, 0.3, 0.5, 0, 0.75], `cell c: ${JSON.stringify(c)}`);
      assert(near(c.clueShare.median, 0.4) && near(c.scorePosition.median, 0.375) && near(c.censusEstimateShare, 0.25), `the medians and the census share: ${JSON.stringify(c)}`);
      same(c.evidenceProblems, [{ rowKey: 'c~3', rep: 3, problem: 'score position: puzzle 1: score or level missing' }], 'the row without a score is listed apart and read nowhere');
      assert(near(got.d.scorePosition.median, 3 / 35) && got.d.censusEstimateShare === 0 && got.d.evidenceProblems.length === 0, `cell d (Hell 1 band): ${JSON.stringify(got.d)}`);
      // No accepted puzzle: no statistic, never a zero.
      const none = v.population([mk(0, { accepted: 0, over: { details: null } })], { quantity: 10 }).c;
      same([none.clueShare, none.scorePosition, none.censusEstimateShare, none.rows], [null, null, null, 1], 'a cell without a puzzle');
      assert(thrownBy(() => v.population(rows, {})).includes('quantity'), 'a missing quantity did not throw');
    },
  },
  {
    name: 'verdicts: bound prerequisites',
    async run() {
      const { v } = await verdictKit();
      /** @type {string[]} */
      const asked = [];
      const currentOf = (/** @type {string} */ id) => {
        asked.push(id);
        return { treeId: 't1', paramsHash: 'p1' };
      };
      const check = (/** @type {ReturnType<typeof memoryRepo>} */ repo, /** @type {any} */ declared, /** @type {any} */ current = currentOf) => v.prerequisites(declared, { readJson: repo.readJson, readFile: repo.readFile, currentOf: current });
      const stage1 = { kind: 'stage1', fields: { line: 'Stage 1: holds.' } };
      // (a) the receipt file changed after its acceptance.
      const a = memoryRepo();
      const bindingA = boundReceipt(a, 'stage1', stage1);
      same(check(a, { stage1: { binding: bindingA, current: [] } }).stage1, { status: 'pass', reasons: [] }, 'the intact stage-1 binding');
      a.files.set('r/stage1.receipt.json', `${a.files.get('r/stage1.receipt.json')} `);
      same(check(a, { stage1: { binding: bindingA, current: [] } }).stage1, { status: 'incomplete', reasons: ['receipt changed r/stage1.receipt.json'] }, '(a) a receipt that changed after its acceptance');
      // (b) a live prerequisite that is not a live-deadline binding is refused, whatever its receipt holds.
      const refusal = 'verdicts: the live-deadline prerequisite must be a live-deadline binding';
      const b = memoryRepo();
      const projection = boundReceipt(b, 'projection', { kind: 'deadline-projection' });
      same(thrownBy(() => check(b, { liveDeadline: { binding: projection, current: [] } })), refusal, '(b) a deadline-projection binding');
      const postHoc = boundReceipt(b, 'posthoc', { fields: { ...LIVE_DEADLINE_FIELDS, postHoc: true } });
      same(thrownBy(() => check(b, { liveDeadline: { binding: postHoc, current: [] } })), refusal, '(b) a live-deadline binding whose fields are a post-hoc projection');
      // (c) a live binding whose tree changed since its acceptance.
      const c = memoryRepo();
      const bindingC = boundReceipt(c, 'live');
      const liveOn = (/** @type {any} */ current) => check(c, { liveDeadline: { binding: bindingC, current: ['fr-frozen'] } }, current).liveDeadline;
      same(liveOn(() => ({ treeId: 't2', paramsHash: 'p1' })), { status: 'incomplete', reasons: ['stale arm fr-frozen'] }, '(c) another tree id');
      same(liveOn(() => ({ treeId: 't1', paramsHash: 'p2' })).reasons, ['stale arm fr-frozen'], '(c) another parameter hash');
      // (d) a receipt of another producer than the binding expects.
      const d = memoryRepo();
      const bindingD = boundReceipt(d, 'live', { harnessHash: 'h2' });
      const forged = JSON.parse(/** @type {string} */ (d.files.get(bindingD)));
      forged.expected.harnessHash = 'h';
      d.files.set(bindingD, JSON.stringify(forged));
      same(check(d, { liveDeadline: { binding: bindingD, current: [] } }).liveDeadline, { status: 'incomplete', reasons: ['producer changed'] }, '(d) a wrong producer');
      // (e) a complete, correctly bound live binding: only the arms it names are asked.
      asked.length = 0;
      same(liveOn(currentOf), { status: 'pass', reasons: [] }, '(e) a complete live binding');
      same(asked, ['fr-frozen'], 'the arms asked');
      // (f) the historical binding stays valid after unrelated harness work: its producer is the stored one, and no tree is asked.
      assert(harnessInfo().harnessHash !== 'h', 'the harness hash of today is the stored producer');
      const f = memoryRepo();
      const bindingF = boundReceipt(f, 'stage1', stage1);
      same(check(f, { stage1: { binding: bindingF, current: [] } }, () => {
        throw new Error('a tree was asked for a historical binding');
      }).stage1, { status: 'pass', reasons: [] }, '(f) a historical binding');
      // An absent binding is incomplete and no tree is asked; a parity entry has its own key; an undeclared one has none.
      asked.length = 0;
      const none = check(c, { liveDeadline: { binding: 'b/none.json', current: ['fr-frozen'] }, parity: [{ binding: bindingC, current: [] }] });
      same(none.liveDeadline, { status: 'incomplete', reasons: ['missing binding b/none.json'] }, 'an absent binding');
      same([asked, Object.keys(none), none[`parity:${bindingC}`].status], [[], ['liveDeadline', `parity:${bindingC}`], 'pass'], 'no tree for an absent binding; one key per parity entry, none for the undeclared stage 1');
      c.files.set('b/bad.json', '{');
      same(check(c, { stage1: { binding: 'b/bad.json', current: [] } }).stage1, { status: 'incomplete', reasons: ['unreadable binding b/bad.json'] }, 'a binding that is not JSON');
      same(liveOn(() => {
        throw new Error('tree missing');
      }), { status: 'incomplete', reasons: ['current tree unreadable: tree missing'] }, 'a tree that cannot be read');
      assert(thrownBy(() => check(c, { stage1: { binding: '', current: [] } })).includes('binding')
        && thrownBy(() => check(c, { parity: [{ binding: bindingC, current: [] }, { binding: bindingC, current: [] }] })).includes('twice'), 'a malformed or a repeated declaration did not throw');
    },
  },
  {
    name: 'verdicts: class selection',
    async run() {
      const { v } = await verdictKit();
      const manifest = { classes: [{ id: 'k', cells: ['12x12-nightmare'], screen: 'sa', noScreen: 'na' }] };
      const admitted = [{ id: 'k', verdict: 'admitted', decidedBy: null }];
      const declared = ['sa/12x12-nightmare~0', 'sa/12x12-nightmare~1', 'na/12x12-nightmare~0', 'na/12x12-nightmare~1'];
      const closureFile = { path: 'c/closure.json', sha256: sha256Text('closure') };
      const arms = [{ id: 'sa', treeId: 't', paramsHash: 'p' }, { id: 'na', treeId: 't2', paramsHash: 'p2' }];
      const inputs = (/** @type {Record<string, any>} */ over = {}) => ({
        files: [{ path: 'in/m.json', sha256: sha256Text('m') }, closureFile], published: declared, declared, activation: null, closure: null, freeze: null, arms, harnessHash: 'h', ...over,
      });
      const a = v.classSelection(manifest, admitted, inputs());
      same([a.format, a.version, a.kind, a.verdict, a.harnessHash, a.source], ['ig-v4-proof', 1, 'class-selection', 'pass', 'h', { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST }], '(a) the envelope');
      same(a.selection, { classes: [{ id: 'k', verdict: 'admitted', decidedBy: null, shipped: 'sa' }], cells: { '12x12-nightmare': { class: 'k', shipped: 'sa' } } }, '(a) the shipped arm of the cell');
      same([a.collection, a.coverage, a.reasons, a.arms], [{ activationSha256: null, closureSha256: null, missing: [] }, { expected: declared, observed: declared, missing: [], censored: [] }, [], arms], '(a) the collection and the coverage');
      for (const verdict of ['failed', 'inconclusive']) {
        same(v.classSelection(manifest, [{ id: 'k', verdict, decidedBy: 'clue' }], inputs()).selection.cells['12x12-nightmare'], { class: 'k', shipped: 'na' }, `a ${verdict} class ships the no-screen arm`);
      }
      // (b) a declared row that is not published, and no closure: an interim report, never a selection.
      const gap = declared.slice(0, 3);
      const b = v.classSelection(manifest, admitted, inputs({ published: gap }));
      same([b.verdict, b.coverage.missing, b.reasons], ['incomplete', [declared[3]], [`missing ${declared[3]}`]], '(b) one row missing');
      // (c) a closure that lists exactly that row makes the selection final: the row leaves the expectation.
      const c = v.classSelection(manifest, admitted, inputs({ published: gap, closure: { ...closureFile, missing: [declared[3]] } }));
      same([c.verdict, c.collection, c.coverage.expected, c.coverage.missing], ['pass', { activationSha256: null, closureSha256: closureFile.sha256, missing: [declared[3]] }, gap, []], '(c) the closed row');
      // (d) a closure that lists another row, or more rows, does not match.
      const d = v.classSelection(manifest, admitted, inputs({ published: gap, closure: { ...closureFile, missing: [declared[0]] } }));
      same([d.verdict, d.reasons, d.coverage.expected], ['incomplete', ['closure does not match', `missing ${declared[3]}`], declared], '(d) a closure of another row');
      assert(v.classSelection(manifest, admitted, inputs({ published: gap, closure: { ...closureFile, missing: [declared[3], declared[0]] } })).reasons[0] === 'closure does not match', 'a closure that lists more than is missing');
      // The order of the closed rows does not matter.
      const two = v.classSelection(manifest, admitted, inputs({ published: declared.slice(0, 2), closure: { ...closureFile, missing: [declared[3], declared[2]] } }));
      same([two.verdict, two.coverage.expected], ['pass', declared.slice(0, 2)], 'two closed rows in any order');
      // The receipt binds every record it names, and every class needs its verdict.
      assert(thrownBy(() => v.classSelection(manifest, admitted, inputs({ closure: { path: 'c/other.json', sha256: closureFile.sha256, missing: [] } }))).includes('does not bind the closure'), 'a closure the evidence does not hold');
      assert(thrownBy(() => v.classSelection(manifest, [], inputs())).includes('class k has no verdict')
        && thrownBy(() => v.classSelection({ classes: [...manifest.classes, { id: 'k2', cells: ['12x12-nightmare'], screen: 'sa', noScreen: 'na' }] }, [...admitted, { id: 'k2', verdict: 'failed', decidedBy: 'clue' }], inputs())).includes('in two classes'), 'a class without a verdict, or a cell in two classes');
    },
  },
  {
    name: 'verdicts: the selection binds its inputs',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      const w = toolWorld(kit);
      const { receipt } = v.verdictRecords(w.manifest, w.repo.io, w.ref);
      assert(receipt.verdict === 'pass' && receipt.kind === 'class-selection', `the receipt: ${receipt.verdict} ${JSON.stringify(receipt.reasons)}`);
      const paths = receipt.evidence.map((/** @type {{ path: string }} */ e) => e.path);
      same([paths.filter((/** @type {string} */ p) => p.endsWith('.runs.json')).length, paths.filter((/** @type {string} */ p) => p.endsWith('.1.1.jsonl')).length,
        paths.filter((/** @type {string} */ p) => p.endsWith('.link.jsonl')).length, paths.includes(w.ref.path), paths.some((/** @type {string} */ p) => p.endsWith('.row.jsonl'))],
      [2, 40, 40, true, false], 'the receipt binds the manifest, the runs files, the journals and the link files, and no row file');
      const own = (/** @type {any} */ r, /** @type {Record<string, any>} */ over = {}) => ({
        kind: 'class-selection', source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST }, harnessHash: r.harnessHash, arms: r.arms, coverage: { expected: r.coverage.expected }, ...over,
      });
      same(proofCheck(receipt, own(receipt), w.repo.readFile), { status: 'pass', reasons: [] }, 'the receipt against its own binding');
      same(receipt.arms, [{ id: 'sa', treeId: 'tree-sa', paramsHash: sha256(JSON.stringify({ id: 'sa' })) }, { id: 'na', treeId: 'tree-na', paramsHash: sha256(JSON.stringify({ id: 'na' })) }], 'the arms carry the tree id and the parameter hash of the runs files');
      // One byte of a journal, then of the verdict manifest, invalidates the selection.
      const journal = 'tests/artifacts/ig-proto/frozen/TW/sa/s1/logs/c~3.1.1.jsonl';
      const original = /** @type {string} */ (w.repo.files.get(journal));
      w.repo.files.set(journal, `${original} `);
      same(proofCheck(receipt, own(receipt), w.repo.readFile), { status: 'incomplete', reasons: [`evidence changed ${journal}`] }, 'a journal changed by one byte');
      w.repo.files.set(journal, original);
      w.repo.files.set(w.ref.path, `${w.manifestText} `);
      same(proofCheck(receipt, own(receipt), w.repo.readFile), { status: 'incomplete', reasons: [`evidence changed ${w.ref.path}`] }, 'the verdict manifest changed');
      // The collection: an activation that declares the rows and names the freeze, and a closure of the one row that is not published.
      const declared = ['sa', 'na'].flatMap((id) => REPS20.map((rep) => `${id}/c~${rep}`));
      const freeze = JSON.stringify({ classes: [] });
      const activation = JSON.stringify({ declaredRows: declared, epoch: { freeze: { path: 'act/freeze.json', sha256: sha256Text(freeze) } } });
      const collection = (/** @type {string[] | null} */ missing) => {
        const closure = missing === null ? null : JSON.stringify({ activation: { path: 'act/activation.json', sha256: sha256Text(activation) }, missing });
        return {
          closure,
          files: { 'act/freeze.json': freeze, 'act/activation.json': activation, ...(closure === null ? {} : { 'act/closure.json': closure }) },
          refs: { activation: { path: 'act/activation.json', sha256: sha256Text(activation) }, closure: closure === null ? null : { path: 'act/closure.json', sha256: sha256Text(closure) } },
        };
      };
      const run = (/** @type {string[] | null} */ missing) => {
        const col = collection(missing);
        const world = toolWorld(kit, { rows: (id, rep) => (id === 'na' && rep === 19 ? null : undefined), files: col.files, manifest: { collection: col.refs } });
        return { col, world, ...v.verdictRecords(world.manifest, world.repo.io, world.ref) };
      };
      const open = run(null);
      same([open.receipt.verdict, open.receipt.reasons, open.receipt.coverage.missing], ['incomplete', ['missing na/c~19'], ['na/c~19']], 'an activation with a row that is not published and no closure');
      assert(open.receipt.evidence.some((/** @type {{ path: string }} */ e) => e.path === 'act/freeze.json') && open.receipt.collection.activationSha256 === sha256Text(activation), 'the activation and the freeze are bound');
      const closed = run(['na/c~19']);
      const sealed = closed.receipt;
      same([sealed.verdict, sealed.collection, sealed.coverage.missing, sealed.coverage.expected.length, sealed.coverage.observed.length],
        ['pass', { activationSha256: sha256Text(activation), closureSha256: sha256Text(/** @type {string} */ closed.col.closure), missing: ['na/c~19'] }, [], 39, 39], 'a closure of exactly the missing row');
      const expectation = own(sealed, {
        coverage: { expected: declared.filter((row) => row !== 'na/c~19') },
        fields: { collection: { activationSha256: sha256Text(activation), closureSha256: sealed.collection.closureSha256, missing: ['na/c~19'] } },
      });
      same(proofCheck(sealed, { ...expectation, harnessHash: 'h-test' }, closed.world.repo.readFile), { status: 'pass', reasons: [] }, 'the sealed selection against the expectation of the same records');
      const wrong = run(['na/c~18']);
      same([wrong.receipt.verdict, wrong.receipt.reasons[0]], ['incomplete', 'closure does not match'], 'a closure of another row');
      assert(wrong.record.selection.verdict === 'incomplete' && wrong.record.selection.missing === 1, 'the record reports the interim selection');
    },
  },
  {
    name: 'verdicts: a final verdict keeps its selection',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      // The records admit the class (every ledger is empty and complete, and the screen arm is faster): it ships the screen arm.
      const interim = toolWorld(kit);
      const { record, receipt } = v.verdictRecords(interim.manifest, interim.repo.io, interim.ref);
      same([record.classes[0].verdict, receipt.selection.cells.c], ['admitted', { class: 'k', shipped: 'sa' }], 'the selection ships the screen arm');
      const final = (/** @type {any} */ doc, /** @type {string | undefined} */ sha = undefined) => {
        const text = JSON.stringify(doc);
        const w = toolWorld(kit, { files: { 'sel/class-selection.json': text }, manifest: { purpose: 'final', selection: { path: 'sel/class-selection.json', sha256: sha ?? sha256Text(text) } } });
        return v.verdictRecords(w.manifest, w.repo.io, w.ref);
      };
      const kept = final(receipt);
      assert(kept.receipt === null && kept.record.selection.changed.length === 0 && !kept.record.phase0.line.includes('selection changed'), `an unchanged selection: ${kept.record.phase0.line}`);
      const moved = final({ ...receipt, selection: { ...receipt.selection, cells: { c: { class: 'k', shipped: 'na' } } } });
      same([moved.record.phase0.verdict, moved.record.phase0.line, moved.record.selection.changed], ['fail', 'Phase 0: FAIL (selection changed c)', ['c']], 'a shipped arm that differs from the selection');
      // The comparison is per cell and both ways; a final verdict that fails by itself keeps its reasons after the change.
      same(v.selectionChanges({ cells: { a: { class: 'k', shipped: 'sa' }, b: { class: 'k', shipped: 'na' } } }, { a: { class: 'k', shipped: 'sa' }, b: { class: 'k', shipped: 'sa' }, d: { class: 'j', shipped: 'na' } }), ['b', 'd'], 'a cell that differs and a cell only the recomputation has');
      same(v.selectionChanges({ cells: { a: { class: 'k', shipped: 'sa' } } }, { a: { class: 'j', shipped: 'sa' } }), ['a'], 'another class');
      same(v.selectionChanges({ cells: { a: { class: 'k', shipped: 'sa' }, z: { class: 'k', shipped: 'sa' } } }, { a: { class: 'k', shipped: 'sa' } }), ['z'], 'a cell only the selection has');
      const failed = { verdict: 'fail', deciding: ['failing cell x: fail'] };
      same(v.finalPhase0(failed, ['c']), { verdict: 'fail', deciding: ['selection changed c', 'failing cell x: fail'] }, 'the reasons that failed anyway follow');
      assert(v.finalPhase0(failed, []) === failed, 'nothing changed: the verdict as it was');
      same([v.phase0Line({ verdict: 'pass', deciding: [] }), v.phase0Line({ verdict: 'incomplete', deciding: ['a', 'b'] })], ['Phase 0: pass.', 'Phase 0: INCOMPLETE (a; b)'], 'the phase-0 line');
      // The records the final verdict rests on are the manifest's: a selection receipt that is not the declared file refuses the manifest.
      assert(thrownBy(() => final(receipt, sha256Text('other'))).includes('differs from the SHA-256'), 'a selection receipt that differs from the manifest\'s hash');
      const bare = toolWorld(kit, { manifest: { purpose: 'final' } });
      assert(thrownBy(() => v.verdictRecords(bare.manifest, bare.repo.io, bare.ref)).includes('selection'), 'a final purpose without its selection');
    },
  },
  {
    name: 'verdicts: decided records are written once',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      // (a) to (e): the rule over the parsed records the run would overwrite.
      same([
        v.decidedRecord('selection', { selection: { verdict: 'pass' }, verdicts: null }),
        v.decidedRecord('selection', { selection: { verdict: 'incomplete' }, verdicts: null }),
        v.decidedRecord('final', { selection: null, verdicts: { phase0: { verdict: 'fail' } } }),
        v.decidedRecord('final', { selection: null, verdicts: { phase0: { verdict: 'incomplete' } } }),
        v.decidedRecord('selection', { selection: null, verdicts: null }),
      ], ['a final selection exists', null, 'a decided phase 0 exists', null, null], '(a) to (e) the decided records');
      // A phase 0 of pass is decided too; each purpose looks only at its own record; another purpose throws.
      same([
        v.decidedRecord('final', { selection: null, verdicts: { phase0: { verdict: 'pass' } } }),
        v.decidedRecord('selection', { selection: null, verdicts: { phase0: { verdict: 'fail' } } }),
        v.decidedRecord('final', { selection: { verdict: 'pass' }, verdicts: null }),
        v.decidedRecord('final', { selection: null, verdicts: {} }),
      ], ['a decided phase 0 exists', null, null, null], 'a passing phase 0; the other purpose\'s record; a record without a phase 0');
      assert(thrownBy(() => v.decidedRecord('draft', { selection: null, verdicts: null })).includes('purpose'), 'another purpose did not throw');
      // (f) a closure of another activation refuses the manifest; the closure of the same one does not.
      const declared = ['sa', 'na'].flatMap((id) => REPS20.map((rep) => `${id}/c~${rep}`));
      const freeze = JSON.stringify({ classes: [] });
      const activation = JSON.stringify({ declaredRows: declared, epoch: { freeze: { path: 'act/freeze.json', sha256: sha256Text(freeze) } } });
      const activationSha = sha256Text(activation);
      const closing = (/** @type {Record<string, any>} */ record) => {
        const closure = JSON.stringify({ missing: ['na/c~19'], ...record });
        const w = toolWorld(kit, {
          rows: (id, rep) => (id === 'na' && rep === 19 ? null : undefined),
          files: { 'act/freeze.json': freeze, 'act/activation.json': activation, 'act/closure.json': closure },
          manifest: { collection: { activation: { path: 'act/activation.json', sha256: activationSha }, closure: { path: 'act/closure.json', sha256: sha256Text(closure) } } },
        });
        return thrownBy(() => v.verdictRecords(w.manifest, w.repo.io, w.ref));
      };
      assert(closing({ activation: { path: 'act/activation.json', sha256: activationSha } }) === '', 'a closure of this activation was refused');
      assert(closing({ activation: { path: 'act/activation.json', sha256: sha256Text('another file') } }).includes('the closure belongs to another activation'), '(f) a closure whose activation is another file\'s');
      assert(closing({}).includes('the closure belongs to another activation'), 'a closure that names no activation');
      // (g) a final manifest whose selection receipt is not final.
      const interim = toolWorld(kit);
      const { receipt } = v.verdictRecords(interim.manifest, interim.repo.io, interim.ref);
      const finalOf = (/** @type {any} */ doc) => {
        const text = JSON.stringify(doc);
        const w = toolWorld(kit, { files: { 'sel/class-selection.json': text }, manifest: { purpose: 'final', selection: { path: 'sel/class-selection.json', sha256: sha256Text(text) } } });
        return thrownBy(() => v.verdictRecords(w.manifest, w.repo.io, w.ref));
      };
      assert(finalOf({ ...receipt, verdict: 'incomplete' }).includes('the selection is not final'), '(g) a selection receipt that is incomplete');
      assert(finalOf({ ...receipt, verdict: undefined }).includes('the selection is not final') && finalOf(receipt) === '', 'a selection receipt without a verdict is not final; a final one is accepted');
    },
  },
  {
    name: 'verdicts: the work report',
    async run() {
      const kit = await verdictKit();
      const { v, row } = kit;
      const screen = workArm(v, row, 800, 1100, 10, 2);
      const noScreen = workArm(v, row, 1000, 1000, 10, 0);
      const work = v.workReport(v.workRule(screen, noScreen), { screen, noScreen });
      same([work.verdict, work.screen.loRatio, work.screen.hiRatio, work.screen.width, work.screen.completedRatio, work.screen.terminatedCalls, work.noScreen.width],
        ['unknown', 80, 110, 30, 80, 2, 0], 'the work block of the class');
      // An arm that accepted no puzzle has no ratio and no width, and an infinite bound is flagged.
      const empty = [{ ingested: v.ingestRow(row(0, 's0', { accepted: 0 }), { quantity: 10 }), ledger: { complete: true, problems: [], lo: 0, hi: 0, terminated: 0, open: 3 } }];
      const none = v.workReport(v.workRule(empty, noScreen), { screen: empty, noScreen });
      same([none.verdict, none.screen.width, none.screen.loRatio, none.screen.completedRatio, none.screen.open], ['unknown', null, null, null, 3], 'an arm with no accepted puzzle');
      const wide = workArm(v, row, 800, Infinity, 10);
      const open = v.workReport(v.workRule(wide, noScreen), { screen: wide, noScreen });
      same([open.screen.unbounded, open.noScreen.unbounded], [true, false], 'an unbounded interval');
      // The tool over journals: the screen arm's calls are killed in a primitive (bound 300), the no-screen arm's end (1,000 each).
      const { S, C, B, P, E, W } = ledgerLines();
      const journal = (/** @type {string} */ arm, /** @type {number} */ rep) => {
        const c = `c~${rep}:1:1:1`;
        return arm === 'sa'
          ? { worker: [S(c, 'set', 0, 10), C(c), B(c, 'rate', 1000), P(c, 0, 800, 0), B(c, 'rate', 300)], link: [W('worker-end', 1, 20)] }
          : { worker: [S(c, 'set', 0, 10), C(c), B(c, 'rate', 1000), P(c, 0, 1000, 0), E(c, 1000, 1, 0)], link: [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'selected' }] };
      };
      const w = toolWorld(kit, { journal });
      const { record } = v.verdictRecords(w.manifest, w.repo.io, w.ref);
      const [cls] = record.classes;
      same([cls.verdict, cls.decidedBy, cls.shipped, cls.work.verdict], ['inconclusive', 'work-unknown', 'na', 'unknown'], 'intervals that overlap leave the class inconclusive');
      same(cls.work.screen, { lo: 16000, hi: 22000, accepted: 200, loRatio: 80, hiRatio: 110, completedRatio: 80, complete: true, rows: 20, terminatedCalls: 20, width: 30, open: 20, unbounded: false }, 'the screen arm\'s interval');
      same(cls.work.noScreen, { lo: 20000, hi: 20000, accepted: 200, loRatio: 100, hiRatio: 100, completedRatio: 100, complete: true, rows: 20, terminatedCalls: 0, width: 0, open: 0, unbounded: false }, 'the no-screen arm\'s interval');
      const md = v.renderVerdicts(record, '> banner');
      assert(md.includes('| screen sa | 20 | 200 | 80 | 110 | 30 | 80 | 20 | 20 | true |') && md.includes('| no screen na | 20 | 200 | 100 | 100 | 0 | 100 | 0 | 0 | true |'), 'the work table of the report');
      assert(md.includes('## Post-hoc projection; not a live deadline gate') && md.includes(record.phase0.line) && md.split('\n').every((line) => line === line.trimEnd()), 'the report names the projection apart, holds the phase-0 line and has no trailing space');
      // A row's journal files are its own: `c~1` does not read the files of `c~10`.
      const open10 = toolWorld(kit, { journal: (arm, rep) => (arm === 'sa' && rep === 10 ? { worker: [S('c~10:1:1:1', 'set', 0, 10)], link: [{ t: 'link', ev: 'batch-start' }] } : undefined) });
      const problems = v.verdictRecords(open10.manifest, open10.repo.io, open10.ref).record.classes[0].problems;
      assert(problems.includes('c: screen c~10: open call c~10:1:1:1') && !problems.some((/** @type {string} */ p) => p.startsWith('c: screen c~1: ')), `the journals of c~10 are not c~1's: ${JSON.stringify(problems)}`);
    },
  },
  {
    name: 'verdicts: records that are not what the manifest declares',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      const saRuns = 'docs/improve-generating/evidence/frozen/TW/sa/s1.runs.json';
      const world = (/** @type {(w: ReturnType<typeof toolWorld>) => void} */ mutate) => {
        const w = toolWorld(kit);
        mutate(w);
        return v.verdictRecords(w.manifest, w.repo.io, w.ref);
      };
      // A runs file whose hash is not the manifest's: every row of it is invalid and not published.
      const changed = world((w) => w.repo.files.set(saRuns, `${w.repo.files.get(saRuns)}\n`));
      same([changed.record.arms.sa.statuses.invalid, changed.record.arms.sa.files[0].problems, changed.receipt.verdict, changed.receipt.coverage.missing.length, changed.record.classes[0].decidedBy],
        [20, ['changed evidence'], 'incomplete', 20, 'incomplete-validation'], 'a runs file that changed');
      // A runs file the manifest does not declare: its rows are invalid, are not published, and duplicate the declared ones.
      const undeclared = world((w) => {
        const doc = JSON.parse(/** @type {string} */ (w.repo.files.get(saRuns)));
        w.repo.files.set(saRuns.replace('s1.', 's2.'), JSON.stringify({ ...doc, rows: [doc.rows[0]] }));
      });
      const extra = undeclared.record.arms.sa.files.find((/** @type {{ path: string }} */ f) => f.path.endsWith('s2.runs.json'));
      same([extra.problems, undeclared.record.arms.sa.statuses.invalid, undeclared.receipt.verdict, undeclared.record.classes[0].decidedBy], [['undeclared evidence'], 1, 'pass', 'incomplete-validation'], 'a runs file that is not declared');
      // A file of another tree than the arm's, and a declared file that is missing.
      const stale = world((w) => {
        w.manifest.arms[0].treeId = 'other';
      });
      same([stale.record.arms.sa.files[0].problems, stale.record.arms.sa.statuses.invalid, stale.receipt.verdict, stale.receipt.arms[0].treeId], [['stale tree'], 20, 'incomplete', 'tree-sa'], 'a file of another tree');
      const missing = world((w) => w.repo.files.delete('docs/improve-generating/evidence/frozen/TW/na/s1.runs.json'));
      same([missing.record.arms.na.files[0].problems, missing.record.arms.na.rows, missing.receipt.verdict, missing.receipt.arms[1].treeId], [['missing evidence'], 0, 'incomplete', null], 'a declared file that is missing');
      // The manifest is refused when a record it names differs, is missing or lacks what the tool reads, or when a name is unknown.
      const named = (/** @type {Record<string, any>} */ files, /** @type {any} */ activation, /** @type {Record<string, any>} */ over = {}) => {
        const w = toolWorld(kit, { files, manifest: { collection: { activation, closure: null }, ...over } });
        return thrownBy(() => v.verdictRecords(w.manifest, w.repo.io, w.ref));
      };
      const ref = (/** @type {string} */ path, /** @type {string} */ text) => ({ path, sha256: sha256Text(text) });
      assert(named({ 'act/activation.json': 'x' }, ref('act/activation.json', 'y')).includes('differs from the SHA-256'), 'an activation record that differs');
      assert(named({}, ref('act/activation.json', 'y')).includes('is missing'), 'an activation record that is missing');
      assert(named({ 'act/activation.json': '{ "declaredRows": [] }' }, ref('act/activation.json', '{ "declaredRows": [] }')).includes('names no freeze record'), 'an activation record without its freeze');
      assert(named({}, null, { classes: [{ id: 'k', cells: ['c'], screen: 'sa', noScreen: 'zz' }] }).includes('unknown arm zz'), 'a class that names an unknown arm');
      assert(named({}, null, { label: 'provisional' }).includes('label must be frozen') && named({}, null, { validationReps: [] }).includes('reps'), 'a manifest of another label or without reps');
      assert(['V4-T04', 'V4-S2P', 'IGP-02'].every((task) => named({}, null, { task }).includes('historical observation namespace')), 'a verdict written into a historical namespace');
      // A live-deadline prerequisite that is a projection refuses the manifest.
      const live = toolWorld(kit);
      live.manifest.prerequisites = { liveDeadline: { binding: boundReceipt(live.repo, 'projection', { kind: 'deadline-projection' }), current: [] } };
      assert(thrownBy(() => v.verdictRecords(live.manifest, live.repo.io, live.ref)) === 'verdicts: the live-deadline prerequisite must be a live-deadline binding', 'a projection as the live-deadline prerequisite');
    },
  },
  {
    name: 'verdicts: each cell is judged on the arm its class ships',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      const { S, C, E } = ledgerLines();
      // The screen arm has a dead-end entry (a p2 phase) in one request: its cell gate fails, so the class fails and the cell is judged on the no-screen arm.
      const dead = toolWorld(kit, {
        ids: ['sa', 'na'],
        journal: (arm, rep) => {
          const c = `c~${rep}:1:1:1`;
          return arm === 'sa' && rep === 3
            ? { worker: [S(c, 'set', 0, 10), C(c), { t: 'phase', call: c, phase: 'p2' }, E(c, 0, 0, 0)], link: [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'selected' }] }
            : undefined;
        },
        manifest: { failingCells: ['c', 'x'], hell1: ['c', 'd'] },
      });
      const a = v.verdictRecords(dead.manifest, dead.repo.io, dead.ref).record;
      same([a.classes[0].verdict, a.classes[0].decidedBy, a.classes[0].screenCellGates, a.classes[0].shipped], ['failed', 'cell-gate', { c: 'fail' }, 'na'], 'a screen arm with a dead end fails the class');
      same([a.failingCells[0].shipped, a.failingCells[0].gate.verdict, a.failingCells[0].gate.reachedTen], ['na', 'pass', 20], 'the failing cell is judged on the arm the class ships');
      same([a.failingCells[1].class, a.failingCells[1].gate.verdict, a.failingCells[1].gate.reasons], [null, 'incomplete', ['no class ships x']], 'a failing cell that no class ships is incomplete');
      same([a.hell1.map((/** @type {any} */ h) => [h.cell, h.arm, h.report.requests, h.report.candidate])], [[['c', 'na', 20, true], ['d', null, 0, false]]], 'Hell 1 is reported on the shipped arm, and on no arm for a cell without rows');
      same(a.phase0.deciding.slice(0, 2), ['uncapped comparator collection pending', 'failing cell x: incomplete'], 'phase 0 names the cell without a shipped arm after the pending reason');
      // A control, a Master cell and P5's pairs, read through the declared arms: the screen arm is faster than today's, so the class is admitted.
      const wide = toolWorld(kit, {
        ids: ['sa', 'na', 'td', 'un'],
        manifest: {
          controls: [{ cell: 'c', today: 'td' }], masters: [{ cell: 'c', today: 'td', after: 'sa' }], masterReps: REPS20,
          p5: [{ cell: 'c', bounded: 'sa', uncapped: 'un', reps: REPS20 }],
        },
      });
      const b = v.verdictRecords(wide.manifest, wide.repo.io, wide.ref).record;
      same([b.classes[0].verdict, b.classes[0].screenCellGates, b.classes[0].shipped], ['admitted', { c: 'pass' }, 'sa'], 'a screen arm that passes the control is admitted');
      same([b.controls[0].shipped, b.controls[0].today, b.controls[0].gate.verdict, b.controls[0].gate.noRegression.pass], ['sa', 'td', 'pass', true], 'the control on the arm the class ships');
      const read = [b.masters[0].result.verdict, b.masters[0].result.differences, b.p5[0].declared, b.p5[0].pairs, b.p5[0].unknown, b.p5[0].falseStops, b.p5[0].lostCompletions];
      same(read, ['pass', [], 20, 20, 0, 0, 0], `Master identity and P5's pairs over the declared reps: ${JSON.stringify([read, b.masters[0].result.problems.slice(0, 2), b.p5[0].unknownReps.slice(0, 2)])}`);
      same(b.projection.results.map((/** @type {any} */ p) => [p.arm, p.reserve, p.rows.length]), [['sa', 0.3, 20], ['sa', 0.5, 20]], 'the projection per arm and reserve');
      assert(Object.keys(b.population).join() === 'sa,na,td,un' && b.population.sa.c.completion.reachedTen === 20, 'the population per arm and cell');
    },
  },
  {
    name: 'kernel: the epoch rule',
    async run() {
      same(epochDirty([['visit', 0], ['kill', 0], ['restore', 0], ['visit', 0]]), { dirty: 2, countChanged: 1 },
        'a removal and a restoration between two visits: the second visit is dirty and its count is unchanged');
      same(epochDirty([['visit', 0], ['visit', 0]]), { dirty: 1, countChanged: 1 }, 'nothing changed between two visits');
      same(epochDirty([['visit', 0], ['kill', 0], ['visit', 0]]), { dirty: 2, countChanged: 2 }, 'a removal between two visits');
      same(epochDirty([['visit', 0], ['kill', 0], ['kill', 0], ['restore', 0], ['restore', 0], ['visit', 0]]), { dirty: 2, countChanged: 1 },
        'two removals and two restorations: the count is back, the epoch is not');
      same(epochDirty([['visit', 0], ['visit', 1], ['kill', 1], ['visit', 0], ['visit', 1]]), { dirty: 3, countChanged: 3 },
        'a change of piece 1 leaves piece 0 clean');
      same(epochDirty([]), { dirty: 0, countChanged: 0 }, 'an empty trace');
      assert(thrownBy(() => epochDirty(/** @type {any} */ ([['jump', 0]]))).includes('unknown trace step'), 'an unknown trace step');
    },
  },
  {
    name: 'kernel: case list',
    async run() {
      same(parseCases(undefined), ['14x14-nightmare', '26x26-nightmare'], 'the default cases');
      same(parseCases('12x12-nightmare,26x26-nightmare'), ['12x12-nightmare', '26x26-nightmare'], 'two given cases');
      same(parseCases('26x26-hell-1,10x10-nightmare'), ['26x26-hell-1', '10x10-nightmare'], 'the order given is kept');
      assert(thrownBy(() => parseCases('nope')) === 'unknown case id nope', `an unknown id: ${thrownBy(() => parseCases('nope'))}`);
      assert(thrownBy(() => parseCases('constructor')) === 'unknown case id constructor', 'a name of Object.prototype is no case');
      for (const text of ['12x12-nightmare,', '', ',12x12-nightmare', '12x12-nightmare,,26x26-nightmare']) {
        assert(thrownBy(() => parseCases(text)).includes('empty entry'), `an empty entry in "${text}": ${thrownBy(() => parseCases(text))}`);
      }
      assert(thrownBy(() => parseCases('12x12-nightmare,12x12-nightmare')) === 'repeated case id 12x12-nightmare', 'a repeated id');
      parseCases(undefined).push('x');
      same(parseCases(undefined), ['14x14-nightmare', '26x26-nightmare'], 'the default list is not shared');
      // The items: six per case, one lane, the experiment only in the payload, the case list in the identity.
      const two = ['12x12-nightmare', '10x10-nightmare'];
      const items = await kernelItems(two);
      same(items.map((i) => i.id), two.flatMap((c) => [0, 1, 2, 3, 4, 5].map((i) => `counters:r4c:${c}:ig-v4/kernel/${c}:${i}`)), 'the item ids');
      assert(items.every((i) => i.kind === 'v4-kernel' && i.variant === 'r4c'), 'the kind and the variant');
      same(Object.keys(items[0].payload), ['boardRows', 'levelId', 'seedText', 'subsetIndex', 'otherRoot'], 'the payload fields');
      same(items.map((i) => i.payload.subsetIndex), [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5], 'the subset indexes');
      const otherRoot = (await ensureTree('instr')).root;
      assert(items.every((i) => i.payload.otherRoot === otherRoot), 'the other tree is not instr');
      assert(manifestHash(items) === manifestHash(await kernelItems(two)), 'the item list depends on something that is not the experiment');
      assert(manifestHash(items) !== manifestHash(await kernelItems([...two].reverse())) && manifestHash(items) !== manifestHash(await kernelItems(['12x12-nightmare'])),
        'the case list is not part of the manifest hash');
      same(Object.keys((await itemIdentity(items)).treeIds), ['r4c'], 'the identity names the variant of the items');
      // The kind has its own reserve: admitted while e + 90 <= H - 15.
      assert(admits('v4-kernel', 0, 105, DEFAULT_LIMITS) && !admits('v4-kernel', 0.5, 105, DEFAULT_LIMITS), 'the reserve of the v4-kernel kind');
    },
  },
  {
    name: 'kernel: report verdicts',
    async run() {
      const items = await kernelItems(['12x12-nightmare']);
      const ids = items.map((i) => i.id);
      const r4 = (/** @type {number} */ n) => ({ calls: 2 * n, pieces: 10 * n, staticRows: 100 * n, liveRows: 50 * n, dirtyPieces: 4 * n, countChanged: 2 * n, r4Kills: n, kills: 3 * n, undoEntries: 5 * n });
      const end = (/** @type {string} */ id, /** @type {string} */ status, /** @type {any} */ result) => ({ type: 'item-end', identityHash: 'h', item: id, status, result, ms: 5, at: 'x' });
      const ok = (/** @type {number} */ i, /** @type {Record<string, any>} */ over = {}) => end(ids[i], 'completed', { outcome: 'ok', g: 4, idx: [0, 1, 2, 3], same: true, r4: r4(i + 1), ms: 3, ...over });
      const green = ids.map((_, i) => ok(i));
      const start = (/** @type {string} */ id) => ({ type: 'item-start', identityHash: 'h', item: id, kind: 'v4-kernel', variant: 'r4c', at: 'x' });
      const swap = (/** @type {number} */ i, /** @type {any} */ line) => green.map((l, k) => (k === i ? line : l));
      same(counterVerdict(ids, green), { verdict: 'equal', items: [], line: 'counters: equal' }, 'every item has same true');
      same(counterVerdict(ids, [...ids.map(start), { type: 'item-spawn', item: ids[0], pid: 1 }, ...green]).verdict, 'equal', 'start and spawn lines do not matter');
      same(counterVerdict(ids, swap(2, ok(2, { same: false }))), { verdict: 'DIFFER', items: [ids[2]], line: `counters: DIFFER (${ids[2]})` }, 'one item differs');
      same(counterVerdict(ids, swap(4, end(ids[4], 'censored', { outcome: 'censored', cutAtS: 270 }))), { verdict: 'incomplete', items: [ids[4]], line: `counters: incomplete (${ids[4]})` }, 'one item censored');
      same(counterVerdict(ids, [...green.slice(0, 5), start(ids[5])]), { verdict: 'incomplete', items: [ids[5]], line: `counters: incomplete (${ids[5]})` }, 'a started item without an end is missing');
      same(counterVerdict(ids, []).items, ids, 'no line: every item is missing');
      same(counterVerdict(ids, swap(1, end(ids[1], 'error', { outcome: 'error', message: 'x' }))).verdict, 'DIFFER', 'an error item');
      same(counterVerdict(ids, swap(3, end(ids[3], 'completed', { outcome: 'no-subset' }))).verdict, 'DIFFER', 'a completed item that measured nothing');
      const mixed = swap(0, ok(0, { same: false })).map((l, k) => (k === 5 ? end(ids[5], 'censored', { outcome: 'censored' }) : l));
      same(counterVerdict(ids, mixed), { verdict: 'incomplete', items: [ids[5]], line: `counters: incomplete (${ids[5]})` }, 'an unfinished item is reported before a difference');
      same(counterVerdict(ids, swap(5, ok(5, { same: false })).map((l, k) => (k === 0 ? ok(0, { same: 'yes' }) : l))).items, [ids[0], ids[5]], 'the items in the order of the list');
      assert(thrownBy(() => counterVerdict([], [])).includes('at least one item'), 'an empty item list is no verdict');
      // The rows and the sums of the report.
      const rows = kernelRows(items, green);
      same(rows.map((r) => [r.status, r.same, r.g, r.subsetIndex, r.caseId]), ids.map((_, i) => ['completed', true, 4, i, '12x12-nightmare']), 'the rows');
      same(caseSums(rows), [{
        caseId: '12x12-nightmare', items: 6, measured: 6, sums: r4(21), dirtyShare: 0.4, countChangedShare: 0.2,
      }], 'the sums of one case');
      const part = kernelRows(items, [...swap(0, ok(0, { r4: null })).slice(0, 2), ok(2, { r4: { ...r4(3), calls: -1 } })]);
      same(part.map((r) => [r.status, r.r4 === null]), [['completed', true], ['completed', false], ['completed', true], ['missing', true], ['missing', true], ['missing', true]],
        'an item without counters, one with an invalid counter and the missing ones');
      same(caseSums(part)[0].measured, 1, 'only the items that have counters are summed');
      // A run of another case list is found again from its log (`report` without --cases), in order of first appearance.
      const other = await kernelItems(['26x26-hell-1', '10x10-nightmare']);
      same(loggedCases([{ type: 'item-end', item: 'unrelated' }, ...other.map((i) => start(i.id)), ...other.map((i) => end(i.id, 'completed', { outcome: 'ok' }))]),
        ['26x26-hell-1', '10x10-nightmare'], 'the cases of a log');
      same(loggedCases([start('counters:r4c:10x10-nightmare:ig-v4/kernel/12x12-nightmare:0'), { type: 'item-end' }, {}, null]), [], 'an id of another case, no id, an empty line and no line');
      same(loggedCases([]), [], 'an empty log');
    },
  },
  {
    name: 'process items: completion and error',
    async run() {
      const f = procFolder(1);
      const items = [
        procItem(1, 'p1', ['-e', 'process.stdout.write(JSON.stringify({ ok: 1 }))']),
        procItem(1, 'p2', ['-e', 'process.exit(3)']),
      ];
      const ID = itemId(items);
      const out = await procRun(1, items);
      same(out, { exitCode: 0, done: true, progress: 2, refused: null }, `the run: ${JSON.stringify(out)}`);
      const lines = readItemLog(f.log);
      same(lines.map((l) => [l.type, l.item]), [
        ['item-start', 'p1'], ['item-spawn', 'p1'], ['item-end', 'p1'], ['item-start', 'p2'], ['item-spawn', 'p2'], ['item-end', 'p2'],
      ], `the log lines: ${JSON.stringify(lines.map((l) => [l.type, l.item]))}`);
      assert(lines.every((l) => l.identityHash === identityHash(ID)), 'a log line does not carry the run\'s identityHash');
      assert(lines.filter((l) => l.type === 'item-spawn').every((l) => Number.isInteger(l.pid) && l.pid > 0), 'an item-spawn line has no numeric pid');
      same([lines[2].status, lines[2].result], ['completed', { stdout: { ok: 1 } }], `p1's end line: ${JSON.stringify(lines[2])}`);
      same([lines[5].status, lines[5].result.code, typeof lines[5].result.stderr], ['error', 3, 'string'], `p2's end line: ${JSON.stringify(lines[5])}`);
      assert(items.every((i) => existsSync(abs(i.payload.outDir)) && readdirSync(abs(i.payload.outDir)).length === 0), 'an output folder was not created empty');
      const state = JSON.parse(readFileSync(f.state, 'utf8'));
      same([state.task, state.step, state.label, state.done, state.items, state.identity, state.lastInvocation.progress],
        ['proc-1', 'items', 'selftest', true, { done: 2, total: 2 }, ID, { items: 2, verified: 0 }], `the state: ${JSON.stringify(state)}`);
      same(resumePlan(items, lines, ID, ID), { pending: [], ended: 2 }, 'resumePlan on the finished log');
      // The payload is checked before anything is written.
      const bad = [procItem(1, 'b1', ['-e', '0'])];
      bad[0].payload.outDir = '../outside';
      assert((await rejectedBy(() => procRun(1, bad, { step: 'bad' }))).includes('outDir must be a relative path'), 'an outDir outside the repository was accepted');
      bad[0].payload = { outDir: 'tests/artifacts/ig-proto/selftest/proc-1/out/b1', argv: ['-e', 1] };
      assert((await rejectedBy(() => procRun(1, bad, { step: 'bad' }))).includes('argv must be an array of strings'), 'a non-string argument was accepted');
      assert(!existsSync(artifactDir('selftest', 'proc-1', 'bad')), 'a rejected payload wrote the step folder');
    },
  },
  {
    name: 'process items: log before spawn, spawn error without exit',
    async run() {
      const f = procFolder(2);
      const items = [procItem(2, 'p1', ['-e', '0'])];
      const out = await procRun(2, items, { command: join(artifactDir('selftest', 'proc-2'), 'no-such-node.exe') });
      same(out, { exitCode: 0, done: true, progress: 1, refused: null }, `the run: ${JSON.stringify(out)}`);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const lines = readItemLog(f.log);
      same(lines.map((l) => [l.type, l.item]), [['item-start', 'p1'], ['item-end', 'p1']], `no spawn line and one end line: ${JSON.stringify(lines.map((l) => [l.type, l.item]))}`);
      const { status, result } = lines[1];
      assert(status === 'error' && result.code === null && typeof result.error === 'string' && result.error.includes('ENOENT'), `the end line: ${JSON.stringify(lines[1])}`);
      assert(lines.every((l) => l.identityHash === identityHash(itemId(items))), 'a line does not carry the identityHash');
      // The start line is on disk while the child runs: the child reads the log itself.
      const log = join(artifactDir('selftest', 'proc-2', 'seen'), 'items.jsonl');
      const seen = [procItem(2, 's1', ['-e', "const t = require('fs').readFileSync(process.argv[1], 'utf8'); process.stdout.write(JSON.stringify({ start: t.includes('item-start'), end: t.includes('item-end') }))", log])];
      const again = await procRun(2, seen, { step: 'seen' });
      assert(again.exitCode === 0 && again.done, `the second run: ${JSON.stringify(again)}`);
      same(readItemLog(log)[2].result.stdout, { start: true, end: false }, 'the start line was not written before the child ran');
      // A spawn that throws at once (a NUL in an argument) still has its start line first: one start, one end, no spawn.
      const thrown = [procItem(2, 't1', ['-e', 'a\u0000b'])];
      const threw = await procRun(2, thrown, { step: 'thrown' });
      assert(threw.exitCode === 0 && threw.done, `the thrown run: ${JSON.stringify(threw)}`);
      const thrownLines = readItemLog(join(artifactDir('selftest', 'proc-2', 'thrown'), 'items.jsonl'));
      same(thrownLines.map((l) => [l.type, l.item]), [['item-start', 't1'], ['item-end', 't1']], 'a spawn that throws is logged after its start line');
      assert(thrownLines[1].status === 'error' && thrownLines[1].result.code === null && typeof thrownLines[1].result.error === 'string', `the end line: ${JSON.stringify(thrownLines[1])}`);
    },
  },
  {
    name: 'process items: trailing stdout after exit',
    async run() {
      const f = procFolder(3);
      const items = [procItem(3, 'p1', ['-e', "process.stdout.write('x'.repeat(1 << 20) + '\\n' + JSON.stringify({ ok: 2 }))"])];
      const out = await procRun(3, items);
      assert(out.exitCode === 0 && out.done, `the run: ${JSON.stringify(out)}`);
      const lines = readItemLog(f.log);
      same([lines[2].status, lines[2].result], ['completed', { stdout: { ok: 2 } }], `the end line: ${JSON.stringify(lines[2]).slice(0, 200)}`);
      const silent = [procItem(3, 'q1', ['-e', "process.stdout.write('not json\\n')"]), procItem(3, 'q2', ['-e', '0'])];
      const rest = await procRun(3, silent, { step: 'silent' });
      assert(rest.exitCode === 0 && rest.done, `the second run: ${JSON.stringify(rest)}`);
      same(readItemLog(join(artifactDir('selftest', 'proc-3', 'silent'), 'items.jsonl')).filter((l) => l.type === 'item-end').map((l) => l.result.stdout), [null, null],
        'a last line that is not JSON, and no output, give null');
    },
  },
  {
    name: 'process items: cut and cleanup',
    async run() {
      const f = procFolder(4);
      const items = [procItem(4, 'p1', ['-e', 'setTimeout(() => {}, 600000)'])];
      const t0 = performance.now();
      const out = await procRun(4, items, { reserveS: 0, horizonS: elapsedS() + 17 });
      assert(performance.now() - t0 < 10000, `the call took ${Math.round(performance.now() - t0)} ms, not under 10 s`);
      assert(out.exitCode === 0 && out.progress === 1, `the run: ${JSON.stringify(out)}`);
      const lines = readItemLog(f.log);
      same(lines.map((l) => [l.type, l.item]), [['item-start', 'p1'], ['item-spawn', 'p1'], ['item-end', 'p1']], 'one start, one spawn, one end');
      assert(lines[2].status === 'censored' && lines[2].result.outcome === 'censored', `the end line: ${JSON.stringify(lines[2])}`);
      assert(thrownBy(() => process.kill(lines[1].pid, 0)) !== '', 'the child is still running after the call');
      // An item that does not fit before the cut is not started, and its folder stays empty.
      const late = [procItem(4, 'l1', ['-e', '0'])];
      const idle = await procRun(4, late, { step: 'late', reserveS: 100, horizonS: elapsedS() + 40 });
      assert(idle.exitCode === 0 && !idle.done && idle.progress === 0, `the late run: ${JSON.stringify(idle)}`);
      same(readItemLog(join(artifactDir('selftest', 'proc-4', 'late'), 'items.jsonl')), [], 'an item was started with less than its reserve left');
    },
  },
  {
    name: 'process items: a started item is never rerun',
    async run() {
      const f = procFolder(5);
      const marker = join(f.root, 'ran.txt');
      const items = [procItem(5, 'p1', ['-e', MARK, marker, 'p1']), procItem(5, 'p2', ['-e', MARK, marker, 'p2'])];
      mkdirSync(f.dir, { recursive: true });
      logStart(f.log, identityHash(itemId(items)), items[0]);
      const before = readFileSync(f.log);
      const out = await procRun(5, items);
      same(out, { exitCode: 3, done: false, progress: 0, refused: 'interrupted item p1 needs a ruling' }, `the run: ${JSON.stringify(out)}`);
      assert(readFileSync(f.log).equals(before) && !existsSync(f.state), 'a refused run wrote the log or a state');
      assert(!existsSync(marker) && !existsSync(abs(items[1].payload.outDir)), 'a child was started or a folder was created');
    },
  },
  {
    name: 'process items: an unstarted item with output is refused',
    async run() {
      const f = procFolder(6);
      const marker = join(f.root, 'ran.txt');
      const items = [procItem(6, 'p1', ['-e', MARK, marker, 'p1']), procItem(6, 'p2', ['-e', MARK, marker, 'p2'])];
      const hash = identityHash(itemId(items));
      mkdirSync(f.dir, { recursive: true });
      logStart(f.log, hash, items[0]);
      logSpawn(f.log, hash, 'p1', 4242);
      logEnd(f.log, hash, 'p1', 'completed', { stdout: null }, 5);
      mkdirSync(abs(items[0].payload.outDir), { recursive: true });
      writeFileSync(join(abs(items[0].payload.outDir), 'kept.txt'), 'kept');
      mkdirSync(abs(items[1].payload.outDir), { recursive: true });
      writeFileSync(join(abs(items[1].payload.outDir), 'old.txt'), 'old');
      const before = readFileSync(f.log);
      const out = await procRun(6, items);
      same(out, { exitCode: 3, done: false, progress: 0, refused: `unexpected output in ${items[1].payload.outDir} for unstarted item p2` }, `the run: ${JSON.stringify(out)}`);
      assert(readFileSync(join(abs(items[1].payload.outDir), 'old.txt'), 'utf8') === 'old', 'old.txt was changed or removed');
      assert(readFileSync(f.log).equals(before) && !existsSync(f.state) && !existsSync(marker), 'a refused run wrote the log or a state, or started a child');
      // The folder of a completed item may hold output; an unstarted item's empty folder is fine, a file in its place is not.
      rmSync(join(abs(items[1].payload.outDir), 'old.txt'));
      const ok = await procRun(6, items);
      same(ok, { exitCode: 0, done: true, progress: 1, refused: null }, `the run with an empty folder: ${JSON.stringify(ok)}`);
      assert(readFileSync(marker, 'utf8') === 'p2\n' && readFileSync(join(abs(items[0].payload.outDir), 'kept.txt'), 'utf8') === 'kept', 'only p2 should have run, and p1\'s folder must stay');
      const g = procFolder('6b');
      const one = [procItem('6b', 'p1', ['-e', MARK, join(g.root, 'ran.txt'), 'p1'])];
      mkdirSync(join(g.root, 'out'), { recursive: true });
      writeFileSync(abs(one[0].payload.outDir), 'a file');
      const file = await procRun('6b', one);
      same(file.refused, `unexpected output in ${one[0].payload.outDir} for unstarted item p1`, 'a file in place of the output folder');
      assert(!existsSync(join(g.root, 'ran.txt')), 'a child was started');
    },
  },
  {
    name: 'process items: resume and verification',
    async run() {
      const f = procFolder(7);
      const marker = join(f.root, 'ran.txt');
      const items = [procItem(7, 'p1', ['-e', MARK, marker, 'p1']), procItem(7, 'p2', ['-e', MARK, marker, 'p2'])];
      const hash = identityHash(itemId(items));
      mkdirSync(f.dir, { recursive: true });
      logStart(f.log, hash, items[0]);
      logSpawn(f.log, hash, 'p1', 4242);
      logEnd(f.log, hash, 'p1', 'completed', { stdout: null }, 5);
      const first = await procRun(7, items);
      same(first, { exitCode: 0, done: true, progress: 1, refused: null }, `the first run: ${JSON.stringify(first)}`);
      const lines = readItemLog(f.log);
      same(lines.map((l) => [l.type, l.item]), [
        ['item-start', 'p1'], ['item-spawn', 'p1'], ['item-end', 'p1'], ['item-start', 'p2'], ['item-spawn', 'p2'], ['item-end', 'p2'],
      ], 'only p2 has new start, spawn and end lines');
      assert(readFileSync(marker, 'utf8') === 'p2\n', 'p1 ran again');
      const state = JSON.parse(readFileSync(f.state, 'utf8'));
      same([state.done, state.items, state.lastInvocation.progress], [true, { done: 2, total: 2 }, { items: 1, verified: 0 }], `the state: ${JSON.stringify(state)}`);
      const bytes = readFileSync(f.log);
      const second = await procRun(7, items);
      same(second, { exitCode: 0, done: true, progress: 1, refused: null }, `the second run: ${JSON.stringify(second)}`);
      assert(readFileSync(f.log).equals(bytes) && readFileSync(marker, 'utf8') === 'p2\n', 'the second run changed the log or started a child');
      same(JSON.parse(readFileSync(f.state, 'utf8')).lastInvocation.progress, { items: 0, verified: 1 }, 'the second state records a verification');
    },
  },
  {
    name: 'profile: identity without the horizon',
    async run() {
      const make = () => profileItems(['14x14-nightmare'], { task: 'V4-T10b', sourceLabel: 'frozen 3fc65f4' });
      const first = manifestHash(make());
      const t0 = elapsedS();
      await new Promise((resolve) => setTimeout(resolve, 30));
      assert(elapsedS() > t0, 'elapsedS did not advance');
      assert(manifestHash(make()) === first, 'the manifest hash depends on the time');
      const [item] = make();
      assert(item.id === 'profile:instr:14x14-nightmare:ig-v4/kernel/14x14-nightmare' && item.kind === 'process' && item.variant === 'instr', `the item: ${item.id}`);
      same(Object.keys(item.payload), ['outDir', 'argv'], 'the payload fields');
      const outDir = 'tests/artifacts/ig-proto/frozen/V4-T10b/profile/out/14x14-nightmare';
      same(item.payload, {
        outDir,
        argv: ['--cpu-prof', '--cpu-prof-dir', outDir, '--no-turbo-inlining', 'tools/ig-proto/kernel-probe.mjs', 'profile-child', '--case', '14x14-nightmare',
          '--task', 'V4-T10b', '--label', 'frozen', '--source-label', 'frozen 3fc65f4'],
      }, 'the payload');
      assert(!item.payload.argv.some((a) => a.includes('horizon')), 'an argument names the horizon');
      assert(manifestHash(profileItems(['14x14-nightmare', '26x26-nightmare'], { task: 'V4-T10b', sourceLabel: 'frozen 3fc65f4' })) !== first, 'the case list is not part of the manifest hash');
      same(Object.keys((await itemIdentity(make())).treeIds), ['instr'], 'the identity names the instr tree');
    },
  },
  {
    name: 'profile: the derived records are rebuilt',
    async run() {
      const task = 'prof-1';
      fresh(artifactDir('selftest', task));
      const cases = ['10x10-nightmare', '12x12-nightmare', '14x14-nightmare'];
      const items = profileItems(cases, { task, sourceLabel: 'frozen 3fc65f4' });
      const hash = identityHash(itemId(items));
      const dir = artifactDir('selftest', task, 'profile');
      mkdirSync(dir, { recursive: true });
      const profile = { nodes: [{ id: 1, callFrame: { functionName: 'fewestColumn', url: 'file:///x/core/engine/deduce.js' } }], samples: [1, 1], timeDeltas: [1000, 3000] };
      const put = (/** @type {string} */ caseId, /** @type {string} */ name, /** @type {unknown} */ value) => {
        const folder = abs(profileOutDirOf(task, caseId));
        mkdirSync(folder, { recursive: true });
        writeFileSync(join(folder, name), typeof value === 'string' ? value : JSON.stringify(value));
      };
      for (const item of items) {
        logStart(join(dir, 'items.jsonl'), hash, item);
        logEnd(join(dir, 'items.jsonl'), hash, item.id, 'completed', { stdout: { ratings: 6 } }, 5);
      }
      put(cases[0], 'CPU.a.cpuprofile', profile);
      put(cases[1], 'CPU.b.cpuprofile', profile);
      put(cases[2], 'CPU.c.cpuprofile', profile);
      put(cases[2], 'CPU.d.cpuprofile', profile);
      put(cases[2], 'notes.txt', 'ignored: not a profile file');
      const first = rebuildProfiles(task, 'selftest');
      const bytes = readFileSync(join(dir, 'profile.jsonl'));
      const second = rebuildProfiles(task, 'selftest');
      assert(readFileSync(join(dir, 'profile.jsonl')).equals(bytes), 'a second call wrote other bytes');
      same(second, first, 'a second call returned other records');
      const text = bytes.toString('utf8');
      assert(text.endsWith('\n') && !text.includes('\r') && text.split('\n').length === 4, `profile.jsonl has ${text.split('\n').length - 1} lines`);
      same(text.split('\n').filter((l) => l !== '').map((l) => JSON.parse(l)), first, 'the file does not hold the returned records');
      const file = (/** @type {string} */ caseId, /** @type {string} */ name) => `${profileOutDirOf(task, caseId)}/${name}`;
      const expected = (/** @type {number} */ i, /** @type {string} */ name) => ({
        item: items[i].id, caseId: cases[i], file: file(cases[i], name), sha256: sha256(readFileSync(abs(file(cases[i], name)))),
        totalMs: 4, deduceMs: 4, fewestColumnMs: 4, share: 1,
      });
      same(first[0], expected(0, 'CPU.a.cpuprofile'), `the record of ${cases[0]}: ${JSON.stringify(first[0])}`);
      same(first[1], expected(1, 'CPU.b.cpuprofile'), `the record of ${cases[1]}: ${JSON.stringify(first[1])}`);
      same(first[2], { item: items[2].id, caseId: cases[2], error: 'profile files: 2' }, 'two profile files in one folder');
      // Only completed items give a record; a missing folder and a file that is no profile are evidence errors.
      const other = 'prof-2';
      fresh(artifactDir('selftest', other));
      const odd = profileItems(['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '26x26-nightmare'], { task: other, sourceLabel: 'x' });
      const oddDir = artifactDir('selftest', other, 'profile');
      mkdirSync(oddDir, { recursive: true });
      const oddHash = identityHash(itemId(odd));
      logStart(join(oddDir, 'items.jsonl'), oddHash, odd[0]);
      logEnd(join(oddDir, 'items.jsonl'), oddHash, odd[0].id, 'censored', { outcome: 'censored' }, 5);
      logStart(join(oddDir, 'items.jsonl'), oddHash, odd[1]);
      logEnd(join(oddDir, 'items.jsonl'), oddHash, odd[1].id, 'completed', { stdout: null }, 5);
      logStart(join(oddDir, 'items.jsonl'), oddHash, odd[2]);
      logEnd(join(oddDir, 'items.jsonl'), oddHash, odd[2].id, 'completed', { stdout: null }, 5);
      logStart(join(oddDir, 'items.jsonl'), oddHash, odd[3]);
      mkdirSync(abs(profileOutDirOf(other, '10x10-nightmare')), { recursive: true });
      writeFileSync(join(abs(profileOutDirOf(other, '10x10-nightmare')), 'CPU.x.cpuprofile'), JSON.stringify(profile));
      mkdirSync(abs(profileOutDirOf(other, '14x14-nightmare')), { recursive: true });
      writeFileSync(join(abs(profileOutDirOf(other, '14x14-nightmare')), 'CPU.y.cpuprofile'), '{ not json');
      const records = rebuildProfiles(other, 'selftest');
      same(records.map((r) => [r.caseId, 'error' in r ? r.error.replace(/:.*/, '') : 'record']), [['12x12-nightmare', 'profile files'], ['14x14-nightmare', 'profile unreadable']],
        `a censored item and a started one give no record: ${JSON.stringify(records)}`);
      same(records[0], { item: odd[1].id, caseId: '12x12-nightmare', error: 'profile files: 0' }, 'a completed item without a folder');
      assert(thrownBy(() => rebuildProfiles('prof-none', 'selftest')).includes('no profile step'), 'a task without a profile step');
      // A node's self time is the sum of the deltas of the samples that name it.
      same(profileTimes({
        nodes: [
          { id: 1, callFrame: { functionName: 'fewestColumn', url: 'file:///t/core/engine/deduce.js' } },
          { id: 2, callFrame: { functionName: 'ruleR4', url: 'file:///t/core/engine/deduce.js' } },
          { id: 3, callFrame: { functionName: 'main', url: 'file:///t/other.js' } },
          { id: 4, callFrame: { functionName: 'fewestColumn', url: 'file:///t/elsewhere.js' } },
          { id: 5, callFrame: { functionName: 'idle', url: '' } },
        ],
        samples: [1, 2, 3, 1, 2, 2, 4, 9], timeDeltas: [1000, 2000, 4000, 500, 250, 250, 100, 7000],
      }), { totalMs: 8.1, deduceMs: 4, fewestColumnMs: 1.6 }, 'the self times: a sample of an unknown node is not counted, a node without samples has none');
      assert(thrownBy(() => profileTimes({ nodes: [], samples: [1], timeDeltas: [] })).includes('not a cpuprofile'), 'samples and deltas of different lengths');
    },
  },
  {
    name: 'profile: report verdict and blocks',
    async run() {
      const cases = ['14x14-nightmare', '26x26-nightmare'];
      const items = profileItems(cases, { task: 'T', sourceLabel: 'L' });
      const start = (/** @type {string} */ id) => ({ type: 'item-start', identityHash: 'h', item: id, kind: 'process', variant: 'instr', at: 'x' });
      const end = (/** @type {string} */ id, /** @type {string} */ status, /** @type {any} */ result) => ({ type: 'item-end', identityHash: 'h', item: id, status, result, ms: 7, at: 'x' });
      const record = (/** @type {number} */ i) => ({
        item: items[i].id, caseId: cases[i], file: `p/${cases[i]}.cpuprofile`, sha256: 'ab'.repeat(32), totalMs: 10, deduceMs: 8, fewestColumnMs: 2, share: 0.25,
      });
      const lines = [...items.flatMap((i, k) => [start(i.id), end(i.id, 'completed', { stdout: { caseId: cases[k], ratings: 6, ms: 5.5 } })])];
      same(loggedProfileCases([{ type: 'item-end', item: 'unrelated' }, ...lines, {}, null]), cases, 'the cases of a profile log');
      same(loggedProfileCases([start('profile:instr:10x10-nightmare:ig-v4/kernel/12x12-nightmare'), start('counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:0')]), [], 'ids of another case or step');
      const rows = profileRows(cases, lines, [record(0), record(1)]);
      same(rows.map((r) => [r.caseId, r.status, r.ratings, r.ms, r.itemMs, r.record === null]), cases.map((c) => [c, 'completed', 6, 5.5, 7, false]), 'the rows');
      same(profileVerdict(rows), { verdict: 'complete', cases: [], line: 'profile: complete' }, 'every item completed with a record');
      const missing = profileRows(cases, lines.slice(0, 2), [record(0)]);
      same(profileVerdict(missing), { verdict: 'incomplete', cases: [cases[1]], line: `profile: incomplete (${cases[1]})` }, 'a missing item');
      const censored = profileRows(cases, [...lines.slice(0, 2), start(items[1].id), end(items[1].id, 'censored', { outcome: 'censored' })], [record(0)]);
      same(profileVerdict(censored).cases, [cases[1]], 'a censored item');
      const failed = profileRows(cases, [...lines.slice(0, 2), start(items[1].id), end(items[1].id, 'error', { code: 1, stderr: 'x' })], [record(0)]);
      same(profileVerdict(failed).cases, [cases[1]], 'an error item');
      const evidence = profileRows(cases, lines, [{ item: items[0].id, caseId: cases[0], error: 'profile files: 2' }, record(1)]);
      same(profileVerdict(evidence), { verdict: 'incomplete', cases: [cases[0]], line: `profile: incomplete (${cases[0]})` }, 'an evidence error');
      same(profileVerdict(profileRows(cases, lines, [])).cases, cases, 'completed items without any record');
      assert(thrownBy(() => profileVerdict([])).includes('at least one item'), 'an empty list is no verdict');
      // The blocks of kernel.md: only the blocks given are written.
      const meta = { label: 'frozen', rerun: 'run it', source: { label: 'L', sourceDigest: 'abcdef0123456789', equalsMp12b1Source: false } };
      const view = { verdict: profileVerdict(rows), rows };
      const only = renderKernel('T', { meta, counters: null, profile: view });
      assert(only.includes('\nprofile: complete\n') && only.includes(`\n${PROFILE_NOTE}\n`) && !only.includes('counters:') && !only.includes('## Items'), 'the profile-only record');
      assert(only.includes(`| ${cases[0]} | completed | 6 | 5.5 | 7 | p/${cases[0]}.cpuprofile | ${'ab'.repeat(8)} | 10 | 8 | 2 | 0.25 |`), 'the profile table row');
      const counters = { verdict: { line: 'counters: equal' }, rows: [], perCase: [], withoutCounters: [] };
      const both = renderKernel('T', { meta, counters, profile: view });
      assert(both.indexOf('counters: equal') < both.indexOf('profile: complete') && both.indexOf('profile: complete') < both.indexOf('## Items'), 'both blocks: the verdict lines first');
      assert(!renderKernel('T', { meta, counters, profile: null }).includes('profile'), 'the counters-only record names no profile');
    },
  },
  {
    name: 'width: barrier and result',
    async run() {
      widthFolder(1);
      const items = [widthItem('w4', 4)];
      const { out, shared, log } = await widthRun(1, items, () => 'result');
      same(out, { exitCode: 0, done: true, progress: 1, refused: null }, `the run: ${JSON.stringify(out)}`);
      const lines = readItemLog(log);
      same(lines.map((l) => [l.type, l.item]), [['item-start', 'w4'], ['item-end', 'w4']], 'one start line before the dispatch, one end line, no spawn line');
      assert(lines.every((l) => l.identityHash === identityHash(itemId(items))), 'a log line does not carry the run\'s identityHash');
      const { status, result } = lines[1];
      assert(status === 'completed', `the end line: ${JSON.stringify(lines[1]).slice(0, 300)}`);
      // The scripted worker n posts the times 100 (n + 1) + k for k from 0 to 5 (three items, two rounds): four blocks of six.
      const times = [0, 1, 2, 3].flatMap((n) => [0, 1, 2, 3, 4, 5].map((k) => 100 * (n + 1) + k));
      same([...result.ms].sort((/** @type {number} */ a, /** @type {number} */ b) => a - b), times, 'the times of the four workers');
      same({ ...result, ms: null }, { caseId: 'c', width: 4, rounds: 2, expected: 24, observed: 24, medianMs: 252.5, p90Ms: 403, ms: null },
        `the completed result: ${JSON.stringify({ ...result, ms: null })}`);
      const s = /** @type {Int32Array} */ (shared.get('w4'));
      same([s[0], s[1]], [4, 4], 'four workers started and said ready');
      same([0, 1, 2, 3].map((n) => s[18 + n]), [4, 4, 4, 4], 'a worker got its go before every worker had said ready');
      same([0, 1, 2, 3].map((n) => s[34 + n]), [1, 1, 1, 1], 'a worker did not get exactly one go');
      assert((await stoppedBeats(s)).slice(0, 4).every((beat) => beat > 0), 'a worker never beat: the check of the termination is vacuous');
    },
  },
  {
    name: 'width: error and early exit',
    async run() {
      widthFolder(2);
      const items = [widthItem('e1', 2), widthItem('e2', 2), widthItem('e3', 2)];
      /** @type {Record<string, string | string[]>} */
      const scripts = { e1: ['error', 'result'], e2: ['exit', 'result'], e3: 'malformed' };
      const { out, shared, log } = await widthRun(2, items, (item) => scripts[item.id]);
      same(out, { exitCode: 0, done: true, progress: 3, refused: null }, `the run: ${JSON.stringify(out)}`);
      const ends = readItemLog(log).filter((l) => l.type === 'item-end');
      same(ends.map((l) => [l.item, l.status]), [['e1', 'error'], ['e2', 'error'], ['e3', 'error']], `the end lines: ${JSON.stringify(ends).slice(0, 400)}`);
      assert(ends.every((l) => l.result.outcome === 'error' && l.result.width === 2 && l.result.caseId === 'c'), 'an error result');
      assert(ends[0].result.message.includes('scripted error'), `a worker's error message: ${ends[0].result.message}`);
      assert(ends[1].result.message.includes('exited with code 3 before its result'), `an exit before the result: ${ends[1].result.message}`);
      assert(ends[2].result.message.includes('not a list of numbers'), `a malformed result: ${ends[2].result.message}`);
      for (const item of items) {
        await stoppedBeats(/** @type {Int32Array} */ (shared.get(item.id)));
      }
      assert([0, 1].every((n) => /** @type {Int32Array} */ (shared.get('e1'))[2 + n] > 0), 'a worker never beat: the check of the termination is vacuous');
    },
  },
  {
    name: 'width: cut',
    async run() {
      widthFolder(3);
      const items = [widthItem('c1', 2), widthItem('c2', 2)];
      const t0 = performance.now();
      const { out, shared, log } = await widthRun(3, items, () => 'nothing', { reserveS: 0, horizonS: elapsedS() + 17 });
      assert(performance.now() - t0 < 10000, `the call took ${Math.round(performance.now() - t0)} ms, not under 10 s`);
      same(out, { exitCode: 0, done: false, progress: 1, refused: null }, `the run stops after a censored item: ${JSON.stringify(out)}`);
      const lines = readItemLog(log);
      same(lines.map((l) => [l.type, l.item]), [['item-start', 'c1'], ['item-end', 'c1']], 'the second item was not started');
      const { status, result } = lines[1];
      assert(status === 'censored' && result.outcome === 'censored' && result.width === 2 && result.ready === 2 && result.results === 0 && typeof result.cutAtS === 'number',
        `the end line: ${JSON.stringify(lines[1])}`);
      assert((await stoppedBeats(/** @type {Int32Array} */ (shared.get('c1')))).slice(0, 2).every((beat) => beat > 0), 'a worker never beat: the check of the termination is vacuous');
    },
  },
  {
    name: 'width: items, statistics and the corpus',
    async run() {
      const two = ['26x26-nightmare', '14x14-nightmare'];
      const items = widthItems(two, 3);
      same(items.map((i) => i.id), two.flatMap((c) => [1, 2, 4, 8].map((w) => `run:base:${c}:${w}:3`)), 'the item ids');
      assert(items.every((i) => i.kind === 'width' && i.variant === 'base'), 'the kind and the variant');
      same(items.map((i) => i.payload), two.flatMap((caseId) => [1, 2, 4, 8].map((width) => ({ caseId, width, rounds: 3 }))), 'the payloads hold the experiment only');
      const first = manifestHash(items);
      await sleep(30);
      assert(manifestHash(widthItems(two, 3)) === first, 'the manifest hash depends on the time');
      assert(first !== manifestHash(widthItems(two, 1)) && first !== manifestHash(widthItems([...two].reverse(), 3)), 'the rounds and the case order are not part of the manifest hash');
      same(Object.keys((await itemIdentity(items)).treeIds), ['base'], 'the identity names the base tree');
      same(loggedWidth([{ item: 'run:base:26x26-nightmare:1:3' }, { item: 'run:base:14x14-nightmare:8:3' }, { item: 'run:base:26x26-nightmare:2:3' },
        { item: 'run:base:x:3:3' }, { item: 'counters:r4c:14x14-nightmare:ig-v4/kernel/14x14-nightmare:0' }, {}, null]), { caseIds: two, rounds: [3] },
      'the cases and the rounds a log names');
      // The statistics: the median (the mean of the two middle values for an even count) and the value at index ceil(0.9 n) - 1.
      same(widthStats([5, 1, 3]), { medianMs: 3, p90Ms: 5 }, 'three values');
      same(widthStats([4, 1, 3, 2]), { medianMs: 2.5, p90Ms: 4 }, 'four values');
      same(widthStats(Array.from({ length: 10 }, (_, i) => 10 - i)), { medianMs: 5.5, p90Ms: 9 }, 'ten values: index 8 of the ascending list');
      same(widthStats([7]), { medianMs: 7, p90Ms: 7 }, 'one value');
      assert(thrownBy(() => widthStats([])).includes('non-empty') && thrownBy(() => widthStats([1, Number.NaN])).includes('finite'), 'an empty list and a time that is not finite');
      // The corpus: T10a's six subsets of the first carved set as plain data, in order.
      const { e } = await engine('base');
      const corpus = kernelCorpus(e, ['12x12-nightmare']);
      assert(corpus.length === SUBSETS_PER_CASE, `${corpus.length} corpus items`);
      assert(corpus.every((c) => isDeepStrictEqual(Object.keys(c), ['caseId', 'boardRows', 'pieces', 'clues', 'idx']) && c.caseId === '12x12-nightmare'), 'the fields of a corpus item');
      same(structuredClone(corpus), corpus, 'the corpus does not survive a structured clone: it cannot be posted to a worker');
      const entry = caseBoard('12x12-nightmare');
      const seedText = 'ig-v4/kernel/12x12-nightmare';
      const carved = /** @type {any} */ (firstCarvedSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText }));
      assert(carved.ok, `the carve failed: ${carved.reason}`);
      const subsets = windowSubsets(e, { set: carved.set, seedText, offsets: [1, 2, 3], perCount: 2, startCount: startCountFor(e, entry.levelId, carved.K) });
      same(corpus.map((c) => c.idx), subsets.map((s) => s.idx), 'the subsets are not T10a\'s, in T10a\'s order');
      same(corpus.map((c) => c.clues), subsets.map((s) => s.clues), 'the clues of the subsets');
      assert(corpus.every((c) => isDeepStrictEqual(c.pieces, carved.set.pieces) && isDeepStrictEqual(c.boardRows, entry.boardRows) && c.idx.length === c.clues.length), 'the pieces, the board or a clue list');
      same(kernelCorpus(e, ['10x10-nightmare', '12x12-nightmare']).map((c) => c.caseId), [...Array(6).fill('10x10-nightmare'), ...Array(6).fill('12x12-nightmare')], 'the cases in the order given');
      assert(thrownBy(() => kernelCorpus(e, ['nope'])) === 'unknown case id nope', 'an unknown case');
    },
  },
  {
    name: 'custom items: the runner rules',
    async run() {
      /** @param {string} id @param {Record<string, unknown>} [payload] @returns {any} */
      const ci = (id, payload = {}) => ({ id, kind: 'custom', variant: 'base', payload });
      /** @param {string} text @returns {any[]} */
      const parsed = (text) => text.split('\n').filter((l) => l !== '').map((l) => JSON.parse(l));
      const run = (/** @type {string} */ task, /** @type {any[]} */ items, /** @type {any} */ dispatch, /** @type {Record<string, any>} */ extra = {}) => runCustomItems({
        task, step: 'run', label: 'selftest', horizonS: 285, items, reserveS: 1, identity: itemId(items), ...extra,
      }, dispatch);
      // The start line is on disk before the dispatch is called; the runner writes one end line whatever the dispatch does.
      const f = widthFolder('c1');
      const items = [ci('a1'), ci('a2'), ci('a3'), ci('a4')];
      /** @type {[string, number, any[]][]} */
      const calls = [];
      /** @type {(item: any, context: { cutAtS: number }) => Promise<any>} */
      const dispatch = (item, context) => {
        calls.push([item.id, context.cutAtS, existsSync(f.log) ? parsed(readFileSync(f.log, 'utf8')) : []]);
        if (item.id === 'a2') {
          throw new Error('thrown at once');
        }
        if (item.id === 'a3') {
          return Promise.reject(new Error('rejected later'));
        }
        return Promise.resolve(item.id === 'a4' ? { status: 'bogus', result: null } : { status: 'completed', result: { ok: 1 } });
      };
      same(await run(f.task, items, dispatch), { exitCode: 0, done: true, progress: 4, refused: null }, 'the first run');
      same(calls.map(([id, cutAtS]) => [id, cutAtS]), items.map((i) => [i.id, 270]), 'every dispatch got cutAtS = horizonS - 15');
      for (const [id, , seen] of calls) {
        same(seen.filter((l) => l.item === id).map((l) => l.type), ['item-start'], `the log when ${id} was dispatched`);
      }
      const lines = readItemLog(f.log);
      same(lines.map((l) => [l.type, l.item]), items.flatMap((i) => [['item-start', i.id], ['item-end', i.id]]), 'one start line and one end line per item, no spawn line');
      same(lines.filter((l) => l.type === 'item-end').map((l) => [l.status, l.result.message ?? l.result]),
        [['completed', { ok: 1 }], ['error', 'thrown at once'], ['error', 'rejected later'], ['error', 'the dispatch settled with no status completed, censored or error']], 'the end lines');
      assert(lines.every((l) => l.identityHash === identityHash(itemId(items))), 'a line does not carry the identityHash');
      // A finished step resumes as a verification: no dispatch, the log untouched.
      const bytes = readFileSync(f.log);
      same(await run(f.task, items, dispatch), { exitCode: 0, done: true, progress: 1, refused: null }, 'the second run');
      assert(calls.length === 4 && readFileSync(f.log).equals(bytes), 'the second run dispatched an item or changed the log');
      // An item that does not fit before the cut is not started.
      const g = widthFolder('c2');
      same(await run(g.task, [ci('b1')], dispatch, { reserveS: 100, horizonS: elapsedS() + 40 }), { exitCode: 0, done: false, progress: 0, refused: null }, 'the late run');
      same(readItemLog(g.log), [], 'an item was started with less than its reserve left');
      assert(calls.length === 4, 'a late item was dispatched');
      // A started item without an end is never run again.
      const h = widthFolder('c3');
      const lone = [ci('d1')];
      mkdirSync(artifactDir('selftest', h.task, 'run'), { recursive: true });
      logStart(h.log, identityHash(itemId(lone)), lone[0]);
      const before = readFileSync(h.log);
      same(await run(h.task, lone, dispatch), { exitCode: 3, done: false, progress: 0, refused: 'interrupted item d1 needs a ruling' }, 'an interrupted item');
      assert(readFileSync(h.log).equals(before) && !existsSync(h.state) && calls.length === 4, 'a refused run wrote the log or a state, or dispatched an item');
      // The output-folder rule applies to an item that names an outDir, not to one that does not.
      const k = widthFolder('c4');
      const outDir = rel(join(artifactDir('selftest', k.task), 'out', 'o1'));
      const named = [ci('o1', { outDir }), ci('o2')];
      mkdirSync(abs(outDir), { recursive: true });
      writeFileSync(join(abs(outDir), 'old.txt'), 'old');
      same(await run(k.task, named, dispatch), { exitCode: 3, done: false, progress: 0, refused: `unexpected output in ${outDir} for unstarted item o1` }, 'an unstarted item with output');
      assert(readFileSync(join(abs(outDir), 'old.txt'), 'utf8') === 'old' && !existsSync(k.log) && !existsSync(k.state) && calls.length === 4, 'a refused run wrote something or dispatched an item');
      rmSync(join(abs(outDir), 'old.txt'));
      same(await run(k.task, named, dispatch), { exitCode: 0, done: true, progress: 2, refused: null }, 'the run with an empty folder');
      assert(calls.length === 6, `${calls.length} dispatches`);
      assert((await rejectedBy(() => run('width-c5', [ci('x1', { outDir: '../x' })], dispatch))).includes('custom item x1: outDir must be a relative path'), 'an outDir outside the repository was accepted');
      assert((await rejectedBy(() => run('width-c5', [ci('x1', { outDir: 'a/b' }), ci('x2', { outDir: 'a/b' })], dispatch))).includes('distinct outDir'), 'one outDir for two items was accepted');
      assert(!existsSync(artifactDir('selftest', 'width-c5')), 'a rejected payload wrote the step folder');
    },
  },
  {
    name: 'width: report verdicts and blocks',
    async run() {
      // A run of the real items (the real identity, so that nothing is stale) with synthetic end lines, in the scratch label.
      /** @param {string} name @param {string[]} caseIds @param {number} rounds @param {(items: any[], hash: string, log: string) => void} write */
      const scene = async (name, caseIds, rounds, write) => {
        fresh(artifactDir('selftest', name));
        const items = widthItems(caseIds, rounds);
        const identity = await itemIdentity(items);
        const dir = artifactDir('selftest', name, 'run');
        mkdirSync(dir, { recursive: true });
        writeJson(join(dir, 'state.json'), { identity });
        write(items, identityHash(identity), join(dir, 'items.jsonl'));
        return items;
      };
      const result = (/** @type {any} */ item, /** @type {number} */ median, /** @type {Record<string, unknown>} */ over = {}) => {
        const { caseId, width, rounds } = item.payload;
        const n = SUBSETS_PER_CASE * rounds * width;
        return { caseId, width, rounds, expected: n, observed: n, medianMs: median, p90Ms: median + 1, ms: Array(n).fill(median), ...over };
      };
      /** @param {string} hash @param {string} log @param {any} item @param {string} status @param {unknown} outcome */
      const ended = (hash, log, item, status, outcome) => {
        logStart(log, hash, item);
        logEnd(log, hash, item.id, status, outcome, 7);
      };
      const label = { task: '', label: 'selftest', sourceLabel: 'frozen 3fc65f4' };
      const caseId = '12x12-nightmare';
      const id = (/** @type {number} */ w) => `run:base:${caseId}:${w}:1`;
      // Complete: the slowdown of each width over width 1, `expected` 6, 12, 24 and 48, and the record's blocks.
      await scene('width-repa', [caseId], 1, (items, hash, log) => items.forEach((item, i) => ended(hash, log, item, 'completed', result(item, [100, 110, 120, 150][i]))));
      const a = await buildWidthReport({ ...label, task: 'width-repa' });
      assert(!('problems' in a), `the report: ${JSON.stringify('problems' in a ? a.problems : null)}`);
      if ('problems' in a) {
        return;
      }
      same(a.record.rows.map((/** @type {any} */ r) => [r.width, r.expected, r.observed, r.medianMs, r.p90Ms, r.slowdown, r.complete]),
        [[1, 6, 6, 100, 101, 1, true], [2, 12, 12, 110, 111, 1.1, true], [4, 24, 24, 120, 121, 1.2, true], [8, 48, 48, 150, 151, 1.5, true]], 'the rows');
      same([a.record.verdict, a.record.line, a.record.items, a.record.cases, a.record.rounds, a.record.machine], ['complete', 'width: complete', [], [caseId], 1, machineInfo()], 'the verdict and the machine');
      assert(a.record.rows.every((/** @type {any} */ r) => r.ms.length === r.observed), 'the raw times are not in the record');
      const context = 'Context: R23 measured one rating 9 to 28 % longer at eight workers than at four. The probe decides whether P8 is worth more work (plan P8); every gate stays at four workers.';
      assert(CONTEXT === context, 'the context line is not the task\'s');
      assert(a.markdown.includes('\nwidth: complete\n') && a.markdown.includes(`\n${context}\n`) && a.markdown.includes(`${machineInfo().cpus} logical CPUs`), 'the context, the verdict or the machine is missing');
      assert(a.markdown.includes(`| ${caseId} | 8 | 1 | completed | 48 | 48 | 150 | 151 | 1.5 |`) && a.markdown.includes(`| ${caseId} | 1 | 1 | completed | 6 | 6 | 100 | 101 | 1 |`), 'the table rows');
      // Incomplete: a censored width and a width without lines; the others keep their slowdown.
      await scene('width-repb', [caseId], 1, (items, hash, log) => {
        ended(hash, log, items[0], 'completed', result(items[0], 100));
        ended(hash, log, items[1], 'completed', result(items[1], 110));
        ended(hash, log, items[2], 'censored', { outcome: 'censored', cutAtS: 270 });
      });
      const b = await buildWidthReport({ ...label, task: 'width-repb' });
      assert(!('problems' in b), 'the incomplete report');
      if (!('problems' in b)) {
        same([b.record.line, b.record.items], [`width: incomplete (${id(4)}, ${id(8)})`, [id(4), id(8)]], 'a censored width and a missing one');
        same(b.record.rows.map((/** @type {any} */ r) => [r.status, r.slowdown]), [['completed', 1], ['completed', 1.1], ['censored', null], ['missing', null]], 'the statuses and the slowdowns');
      }
      // A width that timed fewer ratings than expected, or whose result is another item's, is not complete (and has no slowdown).
      await scene('width-repc', [caseId], 1, (items, hash, log) => {
        ended(hash, log, items[0], 'completed', result(items[0], 100, { observed: 5, ms: Array(5).fill(100) }));
        ended(hash, log, items[1], 'completed', result(items[1], 110, { width: 4 }));
        ended(hash, log, items[2], 'completed', result(items[2], 120));
        ended(hash, log, items[3], 'error', { outcome: 'error', message: 'x' });
      });
      const c = await buildWidthReport({ ...label, task: 'width-repc' });
      assert(!('problems' in c), 'the third report');
      if (!('problems' in c)) {
        same(c.record.items, [id(1), id(2), id(8)], 'a short width, another item\'s result and an error item');
        same(c.record.rows.map((/** @type {any} */ r) => r.slowdown), [null, null, null, null], 'no slowdown without a complete width 1');
      }
      // No line at all: the default case and the rounds of the state (here 3) are found from the manifest hash.
      await scene('width-repd', ['26x26-nightmare'], 3, () => {});
      const d = await buildWidthReport({ ...label, task: 'width-repd' });
      assert(!('problems' in d), 'the report of a run with no line');
      if (!('problems' in d)) {
        same([d.record.cases, d.record.rounds, d.record.verdict, d.record.items.length], [['26x26-nightmare'], 3, 'incomplete', 4], 'the cases and the rounds of a run with no line');
      }
      // Refusals: no state, a line of another identity, a state of other items.
      const none = await buildWidthReport({ ...label, task: 'width-none' });
      assert('problems' in none && none.problems[0].includes('no state'), 'a task without a run');
      await scene('width-repe', [caseId], 1, (items, hash, log) => {
        ended(hash, log, items[0], 'completed', result(items[0], 100));
        ended('other', log, items[1], 'completed', result(items[1], 110));
      });
      const e1 = await buildWidthReport({ ...label, task: 'width-repe' });
      assert('problems' in e1 && e1.problems.some((p) => p.includes('another identityHash')), 'a line with another identityHash');
      await scene('width-repf', [caseId], 1, (_items, hash, log) => logStart(log, hash, widthItems(['10x10-nightmare'], 1)[0]));
      const f1 = await buildWidthReport({ ...label, task: 'width-repf' });
      assert('problems' in f1 && f1.problems.some((p) => p.includes('manifest hash')), 'a state whose items are not the log\'s');
      assert(thrownBy(() => widthVerdict([])).includes('at least one item'), 'an empty list is no verdict');
      same(widthRows(widthItems([caseId], 1), []).map((r) => [r.status, r.complete]), [['missing', false], ['missing', false], ['missing', false], ['missing', false]], 'rows without lines');
    },
  },
  {
    name: 'matrix: a screen class with a headline and a control',
    async run() {
      const { expand, pick } = await matrixKit();
      const { groups } = expand({ controls: ['18x18-nightmare'] });
      /** @param {string} cell @returns {string[]} The task, arm, reps and items of the cell's groups of the initial collection. */
      const initial = (cell) => pick(groups, { cell, collection: 'initial' }).map((g) => `${g.task}|${g.arm}|${g.from}-${g.to}|${g.items.join('+')}`).sort();
      same(initial('14x14-nightmare'), ['V4-S4|fr-frozen|20-39|S4-1', 'V4-S4|fr-frozen-none|20-39|S4-1', 'V4-S4C|shipped-uncapped|20-39|S4-C'].sort(),
        'the initial groups of the headline cell 14x14-nightmare');
      same(initial('18x18-nightmare'), [
        'V4-S4|fr-frozen|20-39|S4-3', 'V4-S4|fr-frozen-none|20-39|S4-3', 'V4-S4|log-link|20-39|S4-3', 'V4-S4C|shipped-uncapped|20-39|S4-C',
      ].sort(), 'the initial groups of the control 18x18-nightmare');
      // A failing headline cell gets no today's arm: its only log-link group is the optional paired factor (S4-6).
      same(pick(groups, { cell: '14x14-nightmare', arm: 'log-link' }).map((g) => [g.collection, g.items, g.from, g.to]), [['optional', ['S4-6'], 20, 24]],
        'the log-link groups of a failing cell');
      same(pick(expand({ controls: [] }).groups, { cell: '18x18-nightmare' }), [], 'a cell that is no control has no group');
    },
  },
  {
    name: 'matrix: every validated cell has its fallback',
    async run() {
      const { data, expand, pick, one } = await matrixKit();
      const d = data();
      const control = '18x18-nightmare';
      const { groups } = expand({ controls: [control] });
      const cells = [...d.cells.failingNightmare, ...d.cells.hell1Validated, control, ...d.cells.hell1Conditional];
      same(cells.length, 10, 'the cells of S4-1, S4-2, S4-3 and S4-5');
      for (const cell of cells) {
        for (const arm of ['fr-frozen', 'fr-frozen-none']) {
          const g = one(groups, { cell, arm, task: 'V4-S4', cohort: 'val' });
          same([g.from, g.to, g.rows], [20, 39, 20], `${arm} on ${cell}`);
        }
        const c = one(groups, { cell, arm: 'shipped-uncapped', cohort: 'val' });
        same([c.task, c.rows, c.comparator], ['V4-S4C', 20, true], `the comparator on ${cell}`);
      }
      /** @param {string} arm @returns {string[]} */
      const covered = (arm) => pick(groups, { arm, task: 'V4-S4', cohort: 'val' }).map((g) => `${g.cell}:${g.from}-${g.to}`).sort();
      same(covered('fr-frozen'), covered('fr-frozen-none'), 'the twins cover the same cells and reps');
      same(covered('fr-frozen').length, cells.length, 'one group of each twin per validated cell');
    },
  },
  {
    name: 'matrix: the comparator keeps the frozen prior',
    async run() {
      const { m, data, expand } = await matrixKit();
      const inputs = { controls: [] };
      expand(inputs);
      // The data's uncapped arms differ from their twins only in the three keys of `comparatorDifferences`, and are uncapped.
      const d = data();
      same(d.comparatorDifferences, ['callBudget', 'setAttemptsBound', 'liveDeadline'], 'the declared differences');
      for (const arm of ['fr-frozen-uncapped', 'fr-frozen-none-uncapped']) {
        const { callBudget, setAttemptsBound, liveDeadline } = d.arms[arm].settings;
        same([callBudget, setAttemptsBound, liveDeadline], [null, null, false], `${arm} is uncapped`);
      }
      same([d.arms['fr-frozen-uncapped'].comparatorOf, d.arms['fr-frozen-none-uncapped'].comparatorOf], ['fr-frozen', 'fr-frozen-none'], 'the twins');
      /** @param {(data: any) => void} edit @returns {string} The message the expansion throws after `edit`. */
      const after = (edit) => thrownBy(() => expand(inputs, edit));
      same(after((x) => { x.arms['fr-frozen-uncapped'].settings.prior = 'other'; }), 'manifest: comparator fr-frozen-uncapped differs from fr-frozen in prior', 'another prior');
      same(after((x) => { x.arms['fr-frozen-none-uncapped'].settings.screen = 'frozen'; }), 'manifest: comparator fr-frozen-none-uncapped differs from fr-frozen-none in screen',
        'the screen of the no-screen comparator');
      same(after((x) => { x.arms['fr-frozen-uncapped'].settings.extra = 1; }), 'manifest: comparator fr-frozen-uncapped differs from fr-frozen in extra', 'a setting only the comparator has');
      // The three declared keys may differ, and only they: without the list the first of them is a difference.
      same(after((x) => { x.arms['fr-frozen-uncapped'].settings.callBudget = 'frozen'; }), '', 'a declared difference is allowed');
      same(after((x) => { x.comparatorDifferences = []; }), 'manifest: comparator fr-frozen-uncapped differs from fr-frozen in callBudget', 'no declared difference');
      same(after((x) => { x.comparatorDifferences = ['callBudget', 'setAttemptsBound']; }), 'manifest: comparator fr-frozen-uncapped differs from fr-frozen in liveDeadline', 'liveDeadline is undeclared');
      same(after((x) => { x.arms['fr-frozen-uncapped'].comparatorOf = 'nope'; }), 'manifest: comparator fr-frozen-uncapped names the unknown twin nope', 'an unknown twin');
      same(after((x) => { delete x.arms['fr-frozen-none-uncapped']; }), 'manifest: fr-frozen-none has no uncapped comparator arm', 'a twin without a comparator');
      assert(typeof m.expandMatrix === 'function', 'expandMatrix is exported');
    },
  },
  {
    name: 'matrix: a later prior change on 14x14 and 24x24',
    async run() {
      const { expand, pick } = await matrixKit();
      const boards = ['14x14-hell-1', '24x24-hell-1'];
      const { groups, items } = expand({ controls: [], secondValidationBoards: boards });
      /** @param {any[]} list @returns {string[]} */
      const shape = (list) => list.map((g) => `${g.task}|${g.arm}|${g.shard}|${g.from}-${g.to}|${g.items.join('+')}`).sort();
      const expected = boards.flatMap((b) => [
        `V4-S4X|fr-frozen|second-${b}|40-59|S4-7`, `V4-S4X|fr-frozen-none|second-${b}|40-59|S4-7`, `V4-S4XC|shipped-uncapped|second-${b}|40-59|S4-7`,
      ]).sort();
      same(shape(pick(groups, { collection: 'second' })), expected, 'the second validation of 14x14 and 24x24');
      same(pick(groups, { collection: 'second' }).filter((g) => g.cell === '26x26-hell-1' || g.cell === '20x20-hell-1'), [], 'no second validation on 26x26 or 20x20');
      assert(groups.filter((g) => g.items.includes('S4-7')).length === 6 && groups.every((g) => !g.items.includes('S4-7') || g.collection === 'second'), 'S4-7 lists only its own groups');
      // The default is every Hell 1 board of the matrix, the conservative price; no board is a valid input too.
      const every = expand({ controls: [] }).groups;
      same(pick(every, { collection: 'second' }).map((g) => g.cell).filter((c, i, all) => all.indexOf(c) === i), ['26x26-hell-1', '20x20-hell-1', '24x24-hell-1', '14x14-hell-1'], 'the default boards');
      same(pick(every, { collection: 'second' }).length, 12, 'three groups on each of four boards');
      const none = expand({ controls: [], secondValidationBoards: [] });
      same([pick(none.groups, { collection: 'second' }).length, none.items.find((/** @type {any} */ i) => i.id === 'S4-7').groups], [0, []], 'an adoption that changes no board');
      assert(items.some((/** @type {any} */ i) => i.id === 'S4-7' && i.collection === 'second' && i.optional === false), 'the item S4-7');
    },
  },
  {
    name: 'matrix: dedupe',
    async run() {
      const { m, data, expand, pick } = await matrixKit();
      const { groups, counts } = expand({ controls: ['18x18-nightmare'] });
      const keys = groups.map((g) => m.groupKey(g));
      same(new Set(keys).size, keys.length, 'two groups share a key');
      same(keys[0], 'V4-S2|fr-base|pilot-26x26-hell-1|0|4', 'the key of the first group is task|arm|shard|from|to');
      /** @param {string} arm @param {string} cell @returns {string[]} */
      const itemsOf = (arm, cell) => {
        const found = pick(groups, { arm, cell, task: 'V4-S2' });
        assert(found.length === 1 && found[0].from === 0 && found[0].to === 4, `${found.length} groups of ${arm} on ${cell}`);
        return found[0].items;
      };
      same(itemsOf('fr-base', '14x14-nightmare'), ['S2-3', 'S2-4', 'S2-6'], 'fr-base on 14x14-nightmare is listed by three items and exists once');
      same(itemsOf('fr-base', '26x26-hell-1'), ['S2-1', 'S2-4', 'S2-6'], 'fr-base on 26x26-hell-1');
      same(itemsOf('fr-base', '20x20-hell-1'), ['S2-1', 'S2-6'], 'fr-base on 20x20-hell-1');
      same(itemsOf('fr-base', '26x26-nightmare'), ['S2-3'], 'fr-base on 26x26-nightmare is listed once');
      same(itemsOf('fr-p5', '14x14-nightmare'), ['S2-6'], 'fr-p5 on 14x14-nightmare');
      // The same item listing a group twice adds its id once and no group.
      const again = expand({ controls: ['18x18-nightmare'] }, (d) => d.stage2[0].groups.push({ arm: 'fr-base', cells: ['26x26-hell-1'] }));
      same(again.groups.map((g) => g.id), groups.map((g) => g.id), 'a group listed twice by one item');
      same(pick(again.groups, { arm: 'fr-base', cell: '26x26-hell-1', task: 'V4-S2' })[0].items, ['S2-1', 'S2-4', 'S2-6'], 'its id is added once');
      same(again.counts, counts, 'the counts do not change');
      assert(data().stage2.length === 6, 'six stage-2 items');
    },
  },
  {
    name: 'matrix: controls from the reports',
    async run() {
      const { m, data } = await matrixKit();
      const failing = data().cells.failingNightmare;
      /** @param {string} caseId @param {number} reaching @param {number} [short] Valid requests that do not reach ten. @param {(i: number) => Record<string, any>} [over] */
      const report = async (caseId, reaching, short = 0, over = () => ({})) => ({
        runs: [
          ...(await Promise.all(Array.from({ length: reaching }, (_, i) => matrixRun(caseId, i, 10, over(i))))),
          ...(await Promise.all(Array.from({ length: short }, (_, i) => matrixRun(caseId, reaching + i, 6)))),
        ],
      });
      const reports = {
        '10x10-nightmare': { path: 'x/10x10.json', report: await report('10x10-nightmare', 18, 2) },
        '3x29-nightmare': { path: 'x/3x29.json', report: await report('3x29-nightmare', 17, 3) },
        '18x18-nightmare': { path: 'x/18x18.json', report: await report('18x18-nightmare', 18, 0, (i) => (i < 2 ? { measurementValid: false } : {})) },
        '14x14-nightmare': { path: 'x/14x14.json', report: await report('14x14-nightmare', 20) },
      };
      same(m.controlsFrom((/** @type {string} */ id) => (/** @type {Record<string, any>} */ (reports))[id] ?? null, failing), ['10x10-nightmare'],
        'only the cell with 18 valid runs reaching ten (17 reach, two of 18 are not valid measurements, a failing cell is excluded)');
      same(m.controlsFrom(reports, failing), ['10x10-nightmare'], 'a map of the reports gives the same cells');
      // The report may be given without its path, a cell without a report is no control, and the time of the runs does not matter (D-V4-16).
      const slow = await report('20x20-nightmare', 18, 0, () => ({ tenthReadyMs: 130000, responseMs: 131000 }));
      const bare = { ...reports, '20x20-nightmare': slow, '24x24-nightmare': null };
      same(m.controlsFrom(bare, failing), ['10x10-nightmare', '20x20-nightmare'], 'a request that reaches ten after 120 s is a completion; the order is the catalogue\'s');
      // A good report on every cell: Nightmare cells only, the failing ones left out, in catalogue order.
      const good = await report('x', 20);
      same(m.controlsFrom(() => ({ report: good }), failing), [
        '3x29-nightmare', '10x10-nightmare', '18x18-nightmare', '18x20-nightmare', '20x20-nightmare', '20x21-nightmare', '32x15-nightmare', '22x22-nightmare',
        '24x24-nightmare', '26x26-nightmare',
      ], 'the Nightmare cells of the catalogue other than the failing ones');
      same(m.controlsFrom(() => ({ report: good }), []).length, 15, 'every Nightmare cell without a failing list');
      assert(thrownBy(() => m.controlsFrom(reports, 'x')).includes('failing must be a list'), 'a failing list is required');
      // The landscape's diagnostic `sampling` entries say nothing about the request (ruling of 2026-11-17, QUESTION 1): a cell whose 20 runs
      // reach ten and each carry one is a control; one whose three runs also carry a `batch` error has 17 valid runs and is not.
      const { v } = await verdictKit();
      const sampling = { phase: 'sampling', code: 'rating-incomplete', message: 'x' };
      const batch = { phase: 'batch', code: 'worker-crashed', message: 'x' };
      const sampled = await report('22x22-nightmare', 20, 0, () => ({ errors: [sampling] }));
      const crashed = await report('24x24-nightmare', 20, 0, (i) => ({ errors: i < 3 ? [sampling, batch] : [sampling] }));
      const before = JSON.stringify([sampled, crashed]);
      same([v.runStatus(sampled.runs[0], { quantity: 10 }).status, v.runStatus(crashed.runs[0], { quantity: 10 }).status], ['error', 'error'],
        'read as they are, both kinds of run are errors (the input reaches the path)');
      same([v.runStatus(m.withoutSampling(sampled.runs[0]), { quantity: 10 }).status, v.runStatus(m.withoutSampling(crashed.runs[0]), { quantity: 10 }).status,
        v.runStatus(m.withoutSampling(crashed.runs[3]), { quantity: 10 }).status], ['valid', 'error', 'valid'], 'the sampling entries are set aside, a batch error stays');
      same(m.controlsFrom({ '22x22-nightmare': sampled, '24x24-nightmare': crashed }, failing), ['22x22-nightmare'], 'the sampling cell is a control, the cell with three batch errors (17 valid runs) is not');
      same(m.controlsFrom({ ...reports, '22x22-nightmare': sampled, '24x24-nightmare': crashed }, failing), ['10x10-nightmare', '22x22-nightmare'], 'beside the cells above, in catalogue order');
      same(JSON.stringify([sampled, crashed]), before, 'every input run keeps its errors');
      // `withoutSampling`: a copy without the entries of phase `sampling`, the run unchanged; a value that is no record with a list of errors as it is.
      const run = { acceptedCount: 1, errors: [sampling, 'x', null, batch, { phase: 'set', code: 'c', message: 'm' }] };
      const copy = m.withoutSampling(run);
      same(copy, { acceptedCount: 1, errors: ['x', null, batch, { phase: 'set', code: 'c', message: 'm' }] }, 'a copy without the sampling entry');
      assert(copy !== run && run.errors.length === 5 && run.errors[0] === sampling && copy.errors !== run.errors, 'the run and its errors list are unchanged');
      const noErrors = { acceptedCount: 1 };
      assert([null, undefined, 'x', 3, noErrors, { errors: 'x' }].every((value) => m.withoutSampling(value) === value), 'a value that is no record with a list of errors is returned as it is');
    },
  },
  {
    name: 'matrix: row limits by group',
    async run() {
      const { expand, pick, one } = await matrixKit();
      const { groups } = expand({ controls: ['18x18-nightmare'] });
      same(one(groups, { cell: '14x14-nightmare', arm: 'fr-frozen', cohort: 'val' }).rowLimitS, 130, 'S4-1 fr-frozen on 14x14-nightmare');
      same(one(groups, { cell: '14x14-nightmare', arm: 'fr-frozen-none', cohort: 'val' }).rowLimitS, 130, 'S4-1 fr-frozen-none on 14x14-nightmare');
      same(one(groups, { cell: '18x18-nightmare', arm: 'log-link', cohort: 'val' }).rowLimitS, 260, 'S4-3 log-link on 18x18-nightmare');
      const uncapped = pick(groups, { arm: 'shipped-uncapped' });
      // 14 comparator groups: S4-C on 5 failing cells, 2 Hell 1 boards and the control; S4-5 on 2 boards; S4-7 on 4 boards.
      assert(uncapped.length === 8 + 2 + 4 && uncapped.every((g) => g.rowLimitS === 260), `the comparators: ${uncapped.map((g) => g.rowLimitS)}`);
      const live = pick(groups, { collection: 'live' });
      same(live.map((g) => [g.arm, g.cell, g.rowLimitS]), [['fr-frozen', '14x14-nightmare', 260], ['fr-frozen', '26x26-hell-1', 260]], 'the live receipt runs under 260 s although its arm has the live deadline');
      const stage2 = pick(groups, { stage: 2 });
      assert(stage2.length === 33 && stage2.every((g) => g.rowLimitS === 260), 'every stage-2 group has 260 s');
      // 130 s belongs to exactly the stage-4 groups of the two twins: 10 of S4-1, 4 of S4-2, 2 of S4-3, 16 Master groups of fr-frozen,
      // 4 of S4-5 and 8 of S4-7; today's arm, the comparators and the receipt keep 260 s.
      const short = pick(groups, { rowLimitS: 130 });
      same(short.length, 10 + 4 + 2 + 16 + 4 + 8, 'the groups at 130 s');
      assert(short.every((g) => g.stage === 4 && g.collection !== 'live' && (g.arm === 'fr-frozen' || g.arm === 'fr-frozen-none')), 'only stage-4 twins have 130 s');
      assert(groups.every((g) => g.rowLimitS === 130 || g.rowLimitS === 260), 'every group has 130 or 260 s');
      same(pick(groups, { arm: 'log-link' }).filter((g) => g.rowLimitS !== 260), [], 'today\'s arm has 260 s everywhere');
      same(pick(groups, { cohort: 'master', arm: 'fr-frozen' }).every((g) => g.rowLimitS === 130), true, 'the Master groups of fr-frozen');
    },
  },
  {
    name: 'matrix: disjoint state paths',
    async run() {
      const { expand, pick, one } = await matrixKit();
      const { groups } = expand({ controls: ['18x18-nightmare'] });
      const first = one(groups, { cell: '26x26-hell-1', arm: 'fr-frozen', items: ['S4-2'] });
      same([first.task, first.shard], ['V4-S4', 'val-26x26-hell-1'], 'the S4-2 group');
      const second = one(groups, { cell: '26x26-hell-1', arm: 'fr-frozen', items: ['S4-7'] });
      same([second.task, second.shard], ['V4-S4X', 'second-26x26-hell-1'], 'the S4-7 group');
      const comparator = one(groups, { cell: '26x26-hell-1', arm: 'shipped-uncapped', items: ['S4-7'] });
      same([comparator.task, comparator.shard], ['V4-S4XC', 'second-26x26-hell-1'], 'the S4-7 comparator');
      const live = one(groups, { cell: '26x26-hell-1', arm: 'fr-frozen', collection: 'live' });
      same([live.task, live.shard], ['V4-LIVE', 'live-26x26-hell-1'], 'the live group');
      // The pilot, validation, Master, paired-factor, live and second cohorts of one arm and cell never share a folder.
      const triples = groups.map((g) => `${g.task}|${g.arm}|${g.shard}`);
      same(new Set(triples).size, triples.length, 'two groups share task, arm and shard');
      const paths = groups.map((g) => `${g.task}\\${g.arm}\\${g.shard}\\state.json`.toLowerCase());
      same(new Set(paths).size, paths.length, 'two groups share a state file (the file system ignores case)');
      same(pick(groups, { arm: 'log-link' }).map((g) => g.shard).filter((s) => s.startsWith('master-')).length, 16, 'one Master shard of today\'s arm per Master cell');
      assert(groups.every((g) => g.id === `${g.task}/${g.arm}/${g.shard}` && g.shard === `${g.cohort}-${g.cell}`), 'the id and the shard follow the rules');
    },
  },
  {
    name: 'matrix: collections',
    async run() {
      const { expand, pick } = await matrixKit();
      const { groups } = expand({ controls: ['18x18-nightmare'] });
      const comparators = pick(groups, { arm: 'shipped-uncapped' });
      assert(comparators.length > 0 && comparators.every((g) => g.comparator === true && (g.task === 'V4-S4C' || g.task === 'V4-S4XC')), 'every shipped-uncapped group is a comparator of a comparator task');
      assert(groups.every((g) => (g.arm === 'shipped-uncapped') === g.comparator), 'only shipped-uncapped groups are comparators');
      same(groups.filter((g) => (g.task === 'V4-S4' || g.task === 'V4-S4X') && g.arm === 'shipped-uncapped'), [], 'no comparator in a validation task');
      /** @param {string} item @returns {any[]} */
      const of = (item) => groups.filter((g) => g.items.includes(item));
      for (const [item, collection, optional] of [['S4-1', 'initial', false], ['S4-2', 'initial', false], ['S4-3', 'initial', false], ['S4-C', 'initial', false], ['S4-4', 'initial', false],
        ['S4-5', 'conditional', true], ['S4-6', 'optional', true], ['S4-7', 'second', false], ['live', 'live', false]]) {
        const list = of(String(item));
        assert(list.length > 0 && list.every((g) => g.collection === collection && g.optional === optional), `the groups of ${item}: collection ${collection}, optional ${optional}`);
      }
      assert(pick(groups, { stage: 2 }).every((g) => g.collection === 'stage2' && g.optional === false && g.task === 'V4-S2' && g.cohort === 'pilot'), 'the stage-2 groups');
      same(of('S4-5').map((g) => `${g.task}|${g.arm}`).sort(), ['V4-S4C|shipped-uncapped', 'V4-S4C|shipped-uncapped', 'V4-S4|fr-frozen', 'V4-S4|fr-frozen', 'V4-S4|fr-frozen-none', 'V4-S4|fr-frozen-none'].sort(),
        'S4-5: the twins under V4-S4 and the comparator under V4-S4C, on two boards');
      same(of('S4-6').map((g) => `${g.task}|${g.arm}|${g.shard}|${g.from}-${g.to}`).sort(), [
        '14x14-nightmare', '15x15b10-nightmare', '12x12-nightmare', '16x16-nightmare', '15x20-nightmare',
      ].map((c) => `V4-S4|log-link|factor-${c}|20-24`).sort(), 'S4-6: today\'s arm on the five failing cells, reps 20 to 24');
      same(of('S4-4').map((g) => g.arm).filter((a, i, all) => all.indexOf(a) === i), ['fr-frozen', 'log-link'], 'S4-4: the frozen arm and today\'s arm');
      same(of('S4-4').length, 32, 'S4-4: two groups on each of the 16 Master cells');
      same(new Set(groups.map((g) => g.collection)), new Set(['stage2', 'live', 'initial', 'conditional', 'optional', 'second']), 'the collections');
      same(of('S4-7').map((g) => g.task).filter((t, i, all) => all.indexOf(t) === i).sort(), ['V4-S4X', 'V4-S4XC'], 'the second validation has its own namespaces');
    },
  },
  {
    name: 'matrix: conditional activation',
    async run() {
      const { m } = await matrixKit();
      const cell = '24x24-hell-1';
      const ten = (/** @type {number} */ i, /** @type {Record<string, any>} */ over = {}) => matrixRun(cell, i, 10, over);
      const short = (/** @type {number} */ i) => matrixRun(cell, i, 6);
      same(m.conditionalActivated([await ten(0), await ten(1), await ten(2), await short(3), await short(4)]), { activated: true, valid: 5, reachingTen: 3 },
        'three valid requests reach ten, two are valid and short');
      same(m.conditionalActivated([await ten(0), await ten(1), await ten(2, { measurementValid: false }), await short(3), await short(4)]), { activated: false, valid: 4, reachingTen: 2 },
        'a request that is not a valid measurement is never a completion');
      same(m.conditionalActivated([await ten(0), await ten(1), await ten(2)]), { activated: true, valid: 3, reachingTen: 3 }, 'three valid requests and no other run');
      // The time of the completion does not matter, a missing or invalid run counts nowhere, and nothing is a vacuous activation.
      const late = { tenthReadyMs: 125000, responseMs: 126000 };
      same(m.conditionalActivated([await ten(0, late), await ten(1, late), await ten(2, late)]), { activated: true, valid: 3, reachingTen: 3 }, 'completion apart from the deadline');
      same(m.conditionalActivated([await ten(0), await ten(1), await ten(2, { tenthReadyMs: null }), null, {}]), { activated: false, valid: 2, reachingTen: 2 },
        'a request with ten puzzles and no T10, a null and an empty record are invalid');
      for (const none of [[], null, undefined]) {
        same(m.conditionalActivated(none), { activated: false, valid: 0, reachingTen: 0 }, 'no pilot run');
      }
      assert(thrownBy(() => m.conditionalActivated(/** @type {any} */ ('x'))).includes('must be a list'), 'a pilot that is not a list throws');
    },
  },
  {
    name: 'matrix: counts',
    async run() {
      const { expand } = await matrixKit();
      const { groups, items, counts } = expand({ controls: ['18x18-nightmare'] });
      // Worked by hand from the data and the rules: 38 stage-2 listings of which five repeat a group, 5 rows each (pilot reps 0 to 4).
      same(counts.total, { groups: 115, rows: 1220 }, 'the whole expansion');
      same(counts.stages, { 2: { groups: 33, rows: 165 }, 4: { groups: 82, rows: 1055 } }, 'per stage');
      same(counts.items, {
        'S2-1': { groups: 4, rows: 20 }, 'S2-2': { groups: 16, rows: 80 }, 'S2-3': { groups: 4, rows: 20 }, 'S2-4': { groups: 6, rows: 30 },
        'S2-5': { groups: 2, rows: 10 }, 'S2-6': { groups: 6, rows: 30 }, 'S4-1': { groups: 10, rows: 200 }, 'S4-2': { groups: 4, rows: 80 },
        'S4-3': { groups: 3, rows: 60 }, 'S4-C': { groups: 8, rows: 160 }, 'S4-4': { groups: 32, rows: 160 }, 'S4-5': { groups: 6, rows: 120 },
        'S4-6': { groups: 5, rows: 25 }, 'S4-7': { groups: 12, rows: 240 }, live: { groups: 2, rows: 10 },
      }, 'per item');
      same(items.map((/** @type {any} */ i) => i.id), ['S2-1', 'S2-2', 'S2-3', 'S2-4', 'S2-5', 'S2-6', 'S4-1', 'S4-2', 'S4-3', 'S4-C', 'S4-4', 'S4-5', 'S4-6', 'S4-7', 'live'], 'the items in order');
      same([groups.reduce((n, g) => n + g.rows, 0), groups.every((g) => g.rows === g.to - g.from + 1)], [1220, true], 'rows are to - from + 1');
      same(items.map((/** @type {any} */ i) => [i.id, i.rows]), Object.entries(counts.items).map(([id, c]) => [id, /** @type {any} */ (c).rows]), 'the items carry their rows');
      same(expand({ controls: [] }).counts.total, { groups: 111, rows: 1140 }, 'without a control: S4-3 (3 groups) and its comparator in S4-C (1 group) are gone, 80 rows');
    },
  },
  {
    name: 'matrix: the data file',
    async run() {
      const { data, expand, pick } = await matrixKit();
      const d = data();
      same([d.version, d.resampleSeed, d.resamples, d.workers], [1, 20261116, 10000, 4], 'the recipe and the workers');
      same(d.reps, { pilot: [0, 4], validation: [20, 39], master: [20, 24], secondValidation: [40, 59], liveDeadline: [0, 4] }, 'the reps');
      same(d.rowLimitS, { default: 260, liveDeadline: 130 }, 'the row limits');
      // The fitting seeds are the provisional reps 0 to 5 and MP12b1's reps 10 to 19: validation, Master and the second validation start above them,
      // and the second cohort is fresh.
      const fitted = 19;
      for (const name of ['validation', 'master', 'secondValidation']) {
        assert(d.reps[name][0] > fitted, `${name} reps ${d.reps[name]} overlap a fitting seed`);
      }
      assert(d.reps.secondValidation[0] > d.reps.validation[1], 'the second validation cohort overlaps the first validation');
      const { groups } = expand({ controls: ['18x18-nightmare'] });
      for (const g of groups) {
        if (['val', 'master', 'factor', 'second'].includes(g.cohort)) {
          assert(g.from > fitted, `${g.id} reps ${g.from} to ${g.to} overlap a fitting seed`);
        }
      }
      same(pick(groups, { cohort: 'second' }).every((g) => g.from >= 40 && g.to <= 59), true, 'second-validation groups are in 40 to 59');
      same(pick(groups, { cohort: 'factor' }).every((g) => g.from >= d.reps.validation[0] && g.to <= d.reps.validation[1]), true, 'the paired factor uses validation seeds');
      // The cells exist in the catalogue; the Master cells are its 16 Master cases in catalogue order.
      const cases = JSON.parse(readFileSync(join(IG_DIR, 'data', 'boards-v1.json'), 'utf8')).cases;
      const cells = [
        ...d.cells.failingNightmare, ...d.cells.hell1Validated, ...d.cells.hell1Conditional, ...d.cells.master,
        ...d.stage2.flatMap((/** @type {any} */ i) => i.groups.flatMap((/** @type {any} */ g) => g.cells)),
      ];
      same(cells.filter((c) => cases[c] === undefined), [], 'a cell of the matrix is not in the catalogue');
      same(d.cells.master, Object.keys(cases).filter((id) => cases[id].levelId === 'master'), 'the Master cells');
      same(d.cells.master.length, 16, 'sixteen Master cells');
      same(d.cells.failingNightmare, ['14x14-nightmare', '15x15b10-nightmare', '12x12-nightmare', '16x16-nightmare', '15x20-nightmare'], 'the failing headline cells');
      same([d.cells.hell1Validated, d.cells.hell1Conditional], [['26x26-hell-1', '20x20-hell-1'], ['24x24-hell-1', '14x14-hell-1']], 'the Hell 1 boards');
      // Every arm is its own variant; the eight arms that exist today have a manifest (the four stage-4 arms are made at the freeze, N-V4-03).
      for (const [id, arm] of Object.entries(d.arms)) {
        same(/** @type {any} */ (arm).variant, id, `the variant of ${id}`);
      }
      const existing = listVariants();
      same(['log-link', 'fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5'].filter((id) => !existing.includes(id)), [], 'a stage-2 arm has no variant');
      same(Object.entries(d.arms).filter(([, a]) => /** @type {any} */ (a).stage === 2).map(([id]) => id), ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5'], 'the stage-2 arms');
      same(d.stage2.map((/** @type {any} */ i) => i.id), ['S2-1', 'S2-2', 'S2-3', 'S2-4', 'S2-5', 'S2-6'], 'the stage-2 items');
      same(d.stage2.flatMap((/** @type {any} */ i) => i.groups.map((/** @type {any} */ g) => g.arm)).filter((/** @type {string} */ a) => d.arms[a]?.stage !== 2), [], 'a stage-2 item names an arm that is not a stage-2 arm');
    },
  },
  {
    name: 'matrix: the inputs and the data are checked',
    async run() {
      const { m, data, expand } = await matrixKit();
      /** @param {any} inputs @param {(data: any) => void} [edit] @returns {string} */
      const failure = (inputs, edit) => thrownBy(() => expand(inputs, edit));
      assert(failure(null).includes('inputs.controls must be a list of distinct cells'), 'inputs are required');
      assert(failure({}).includes('inputs.controls must be a list'), 'controls are required');
      same(failure({ controls: ['14x14-nightmare'] }), 'manifest: control 14x14-nightmare is a failing cell', 'a failing cell is no control');
      assert(failure({ controls: ['18x18-nightmare', '18x18-nightmare'] }).includes('distinct'), 'a control listed twice');
      assert(failure({ controls: [], secondValidationBoards: '24x24-hell-1' }).includes('inputs.secondValidationBoards must be a list'), 'the boards are a list');
      same(failure({ controls: [] }, (d) => { d.reps.validation = [39, 20]; }), 'manifest: reps validation must be [from, to] with 0 <= from <= to', 'a reversed range');
      same(failure({ controls: [] }, (d) => { delete d.reps.master; }), 'manifest: reps master must be [from, to] with 0 <= from <= to', 'a missing range');
      same(failure({ controls: [] }, (d) => { d.rowLimitS.default = 0; }), 'manifest: rowLimitS default must be a positive integer', 'a zero row limit');
      same(failure({ controls: [] }, (d) => { d.stage2[0].groups[0].arm = 'fr-nope'; }), 'manifest: item S2-1 names the unknown arm fr-nope', 'an unknown arm');
      same(failure({ controls: [] }, (d) => { delete d.arms['log-link']; }), 'manifest: item S4-4 names the unknown arm log-link', 'a missing today\'s arm');
      assert(failure({ controls: [] }, (d) => { d.cells.master = ['a', 'a']; }).includes('cells.master'), 'a repeated Master cell');
      assert(data().arms['fr-frozen'] !== undefined && m.groupKey({ task: 't', arm: 'a', shard: 's', from: 1, to: 2 }) === 't|a|s|1|2', 'the group key');
    },
  },
  {
    name: 'price: rows, one per invocation at 260 s',
    async run() {
      const { m } = await matrixKit();
      const priced = m.stepPrice({ type: 'rows', rows: 20, rowS: 55, rowLimitS: 260, horizonS: 285 });
      assert(priced.admissible === true, 'the step is admissible');
      same(priced.schedule, Array.from({ length: 20 }, () => ({ rows: 1, nodeS: 57 })), 'twenty invocations of one row each, 2 + 55 s');
      same([priced.projectS, priced.invocations, priced.quietS, priced.countedS, priced.guardS, priced.completed, priced.censored, priced.ceilingInvocations, priced.ceilingS],
        [1140, 20, 900, 2040, 2550, 20, 0, 20, 18900], 'projectS, invocations, quietS, countedS, guardS, completed, censored, ceilingInvocations, ceilingS');
      assert(priced.ceilingS >= priced.countedS, 'the ceiling is at least the projection');
      same(m.price([{ type: 'rows', rows: 20, rowS: 55, rowLimitS: 260, horizonS: 285 }]).countedS, 2040, 'price of one step is that step');
      // A row past its limit is cut by the runner and counted censored; it takes the limit plus the 10-s margin (an assumption), not its own time.
      const cut = m.simulateRows({ rows: 2, rowS: 300, rowLimitS: 260, horizonS: 285 });
      assert(cut.admissible === true, 'a cut row is admissible');
      same([cut.invocations, cut.nodeS, cut.quietS, cut.countedS, cut.completed, cut.censored], [[{ rows: 1, nodeS: 272 }, { rows: 1, nodeS: 272 }], 544, 90, 634, 0, 2],
        'two rows of 300 s at a limit of 260 s: two invocations of 2 + 270 s, both censored');
      // The limit itself completes, just past it is censored and takes its own time (up to limit + 10).
      same(['260', '265'].map((s) => { const r = m.simulateRows({ rows: 1, rowS: Number(s), rowLimitS: 260 }); return r.admissible ? [r.nodeS, r.completed, r.censored] : null; }),
        [[262, 1, 0], [267, 0, 1]], 'a row of exactly the limit completes; one of 265 s is censored after 265 s');
    },
  },
  {
    name: 'price: the 900-s cap (owner, 2026-11-17)',
    async run() {
      const { m } = await matrixKit();
      const priced = m.stepPrice({ type: 'rows', rows: 20, rowS: 55, rowLimitS: 260 });
      assert(priced.admissible === true, 'the step is admissible');
      same(priced.schedule, [{ rows: 12, nodeS: 662 }, { rows: 8, nodeS: 442 }], 'at the default horizon 885 the twenty rows share two invocations: twelve rows, then eight');
      same([priced.projectS, priced.invocations, priced.quietS, priced.countedS, priced.ceilingS], [1104, 2, 90, 1194, 18900],
        'projectS, invocations, quietS (45 s priced per invocation), countedS and the ceiling 20 x 945');
      const sim = m.simulateProcess({ durationsS: [120, 200], reserveS: 120 });
      assert(sim.admissible === true, 'the simulation is admissible');
      same([sim.invocations, sim.nodeS, sim.completed, sim.censored], [[{ items: 2, nodeS: 322 }], 322, 2, 0], 'the 200-s item is no longer cut at 270 s: one invocation of 322 s');
      // The runner's budget guard caps the horizon at the same 885 s.
      const wide = decide({ task: 'x', label: 'frozen', allocationS: 3600, minHorizonS: 60, approvals: { roundMinutes: 60 }, invocations: [] });
      same([wide.decision, wide.horizonS], ['go', 885], 'a large allowance gives the horizon 885');
    },
  },
  {
    name: 'price: rows at 130 s',
    async run() {
      const { m } = await matrixKit();
      /** @param {number} rows @param {number} rowS @param {number} [rowLimitS] */
      const rowsAt = (rows, rowS, rowLimitS = 130) => m.simulateRows({ rows, rowS, rowLimitS, horizonS: 285 });
      const a = rowsAt(4, 40);
      assert(a.admissible === true, 'a is admissible');
      same([a.invocations, a.nodeS, a.quietS], [[{ rows: 4, nodeS: 162 }], 162, 45], '(a) four rows of 40 s start at 2, 42, 82 and 122: one invocation, 162 s');
      const a5 = rowsAt(5, 40);
      assert(a5.admissible === true, 'five rows are admissible');
      same(a5.invocations, [{ rows: 4, nodeS: 162 }, { rows: 1, nodeS: 42 }], 'a fifth row of 40 s would start at 162 > 285 - 140: the second invocation');
      const b = rowsAt(2, 130);
      assert(b.admissible === true, 'b is admissible');
      same([b.invocations, b.nodeS, b.completed, b.censored], [[{ rows: 2, nodeS: 262 }], 262, 2, 0], '(b) two rows of 130 s: one invocation, 262 s, both complete');
      const c = rowsAt(3, 130);
      assert(c.admissible === true, 'c is admissible');
      same([c.invocations, c.nodeS, c.quietS], [[{ rows: 2, nodeS: 262 }, { rows: 1, nodeS: 132 }], 394, 90], '(c) three rows of 130 s: two invocations');
      same(rowsAt(1, 100, 280), { admissible: false, reason: 'a row of 280 s does not fit a horizon of 285 s' }, 'a row that fits no invocation is inadmissible with its reason');
      same(m.stepPrice({ type: 'rows', rows: 1, rowS: 100, rowLimitS: 280, horizonS: 285 }), { admissible: false, reason: 'a row of 280 s does not fit a horizon of 285 s' }, 'the step is not priced');
    },
  },
  {
    name: 'price: two sequential 120-s process items fit one invocation',
    async run() {
      const { m } = await matrixKit();
      const sim = m.simulateProcess({ durationsS: [120, 120], reserveS: 120 });
      assert(sim.admissible === true, 'the simulation is admissible');
      same([sim.invocations, sim.nodeS, sim.completed, sim.censored], [[{ items: 2, nodeS: 242 }], 242, 2, 0], 'starts at 2 and 122: one invocation of 242 s, two completed');
      const priced = m.stepPrice({ type: 'process', durationsS: [120, 120], reserveS: 120 });
      assert(priced.admissible === true, 'the step is admissible');
      same([priced.projectS, priced.invocations, priced.quietS, priced.countedS, priced.guardS, priced.ceilingInvocations, priced.ceilingS, priced.completed, priced.censored],
        [242, 1, 45, 287, 358.75, 2, 1890, 2, 0], 'the step price; the ceiling is 2 x 945');
      // A third item would start at 242: 242 + 120 > 270, so it takes a second invocation.
      const three = m.simulateProcess({ durationsS: [120, 120, 120], reserveS: 120, horizonS: 285 });
      assert(three.admissible === true, 'three items are admissible');
      same(three.invocations, [{ items: 2, nodeS: 242 }, { items: 1, nodeS: 122 }], 'the third item is not admitted at 242 s');
    },
  },
  {
    name: 'price: a 200-s process item with a 120-s reserve',
    async run() {
      const { m } = await matrixKit();
      const priced = m.stepPrice({ type: 'process', durationsS: [200], reserveS: 120, cases: ['ignored'] });
      assert(priced.admissible === true, 'the step is admissible');
      same([priced.projectS, priced.countedS, priced.ceilingS, priced.invocations, priced.completed, priced.censored], [202, 247, 945, 1, 1, 0],
        'the item takes its 200 s (not its reserve): projectS 202, countedS 247, ceilingS 945');
      assert(priced.ceilingS >= priced.projectS && priced.ceilingS !== 167, 'the ceiling is at least the projection; never the reserve-based 167');
    },
  },
  {
    name: 'price: an item past the cut is censored',
    async run() {
      const { m } = await matrixKit();
      const sim = m.simulateProcess({ durationsS: [120, 200], reserveS: 120, horizonS: 285 });
      assert(sim.admissible === true, 'the simulation is admissible');
      same([sim.invocations, sim.nodeS, sim.completed, sim.censored, sim.countedS], [[{ items: 2, nodeS: 270 }], 270, 1, 1, 315],
        'the second item, admitted at 122, is stopped at the cut 270: censored, never run again');
      // The censored item ends the invocation and is not placed again; the item after it takes the next invocation.
      const after = m.simulateProcess({ durationsS: [120, 200, 50], reserveS: 120, horizonS: 285 });
      assert(after.admissible === true, 'the third item is admissible');
      same([after.invocations, after.completed, after.censored], [[{ items: 2, nodeS: 270 }, { items: 1, nodeS: 52 }], 2, 1], 'a censored item is counted once');
      // An item that ends exactly at the cut completes; one second more is stopped at the cut.
      const ends = (/** @type {number} */ s) => { const r = m.simulateProcess({ durationsS: [s], reserveS: 120, horizonS: 285 }); return r.admissible ? [r.nodeS, r.completed, r.censored] : null; };
      same([ends(268), ends(269)], [[270, 1, 0], [270, 0, 1]], 'the cut is at 270 s for a horizon of 285 s');
    },
  },
  {
    name: 'price: two lanes differ from one',
    async run() {
      const { m } = await matrixKit();
      /** @param {number} lanes @param {number[]} durationsS */
      const group = (lanes, durationsS) => ({ kind: 'v4-select', variant: 'v4', lanes, reserveS: 120, durationsS });
      const two = m.simulateItems({ groups: [group(2, [60, 60, 60, 60])] });
      assert(two.admissible === true, 'two lanes are admissible');
      same([two.invocations, two.nodeS, two.quietS, two.completed], [[{ items: 4, nodeS: 125 }], 125, 45, 4], 'two lanes: one invocation, 5 to 65 and 65 to 125');
      const one = m.simulateItems({ groups: [group(1, [60, 60, 60, 60])], horizonS: 285 });
      assert(one.admissible === true, 'one lane is admissible');
      same([one.invocations, one.nodeS, one.quietS, one.countedS], [[{ items: 3, nodeS: 185 }, { items: 1, nodeS: 65 }], 250, 90, 340],
        'one lane: the fourth item starts at 185 and 185 + 120 > 270: two invocations of 185 and 65 s');
      // The earliest free lane takes the next item (round-robin would put the third item behind the 100-s one and end at 135).
      const uneven = m.simulateItems({ groups: [group(2, [100, 30, 30, 30])] });
      assert(uneven.admissible === true, 'unequal items are admissible');
      same(uneven.invocations, [{ items: 4, nodeS: 105 }], 'the three 30-s items run in turn on the second lane; the drain is the 100-s item at 105');
      for (const lanes of [1, 2]) {
        const priced = m.stepPrice({ type: 'items', groups: [group(lanes, [60, 60, 60, 60])], horizonS: 285 });
        assert(priced.admissible === true, 'the step is admissible');
        same([priced.invocations, priced.ceilingInvocations, priced.ceilingS], [lanes === 2 ? 1 : 2, 4, 3780], `the step at ${lanes} lanes: the ceiling counts items, not lanes`);
      }
    },
  },
  {
    name: 'price: two separately emitted steps',
    async run() {
      const { m } = await matrixKit();
      const step = { type: 'process', durationsS: [60], reserveS: 120 };
      const separate = m.price([step, { ...step }]);
      same([separate.admissible, separate.invocations, separate.quietS, separate.projectS, separate.countedS, separate.guardS, separate.ceilingS, separate.ceilingInvocations, separate.completed, separate.censored],
        [true, 2, 90, 124, 214, 267.5, 1890, 2, 2, 0], 'two steps: two invocations, 2 + 60 s each, two quiet periods');
      same([separate.steps.length, separate.inadmissible], [2, []], 'each step is listed and none is inadmissible');
      // The same two items in one step share an invocation and a quiet period; the price differs.
      const shared = m.stepPrice({ type: 'process', durationsS: [60, 60], reserveS: 120 });
      assert(shared.admissible === true, 'the shared step is admissible');
      same([shared.invocations, shared.quietS, shared.projectS], [1, 45, 122], 'one step of two items: one invocation, one quiet period, one start-up');
      // An inadmissible step is listed apart and the plan is not priceable; the totals cover the priced steps only.
      const bad = { type: 'items', horizonS: 250, groups: [{ kind: 'v4-generate', variant: 'v4', lanes: 1, reserveS: 245, durationsS: [100] }] };
      const mixed = m.price([step, bad]);
      same([mixed.admissible, mixed.invocations, mixed.inadmissible], [false, 1, [{ index: 1, reason: 'v4-generate needs 245 s; the horizon 250 s admits none' }]],
        'a plan with an inadmissible step is not priceable and names it');
    },
  },
  {
    name: 'price: an inadmissible group',
    async run() {
      const { m } = await matrixKit();
      const generate = { kind: 'v4-generate', variant: 'v4', lanes: 1, reserveS: 245, durationsS: [100] };
      same(m.simulateItems({ groups: [generate], horizonS: 250 }), { admissible: false, reason: 'v4-generate needs 245 s; the horizon 250 s admits none' },
        'the group does not start: 2 + 245 > 250 - 15; no item is forced');
      same(m.stepPrice({ type: 'items', groups: [generate], horizonS: 250 }), { admissible: false, reason: 'v4-generate needs 245 s; the horizon 250 s admits none' },
        'the step price has no invocation, no projection and no ceiling');
      // The group start passes (2 + 231 <= 235) but its first item does not (5 + 231 > 235): still no invocation.
      same(m.simulateItems({ groups: [{ ...generate, reserveS: 231 }], horizonS: 250 }), { admissible: false, reason: 'v4-generate needs 231 s; the horizon 250 s admits none' },
        'the item is not admitted after the group start overhead');
      // A group that fits an invocation is priced there, but one that never fits makes the step inadmissible, never a forced item.
      const select = { kind: 'v4-select', variant: 'v4', lanes: 2, reserveS: 120, durationsS: [60] };
      same(m.simulateItems({ groups: [select, generate], horizonS: 250 }), { admissible: false, reason: 'v4-generate needs 245 s; the horizon 250 s admits none' },
        'the second group never fits');
      assert(m.simulateItems({ groups: [generate], horizonS: 285 }).admissible === true, 'the same group at the full horizon is admissible');
    },
  },
  {
    name: 'price: groups run in order and drain',
    async run() {
      const { m } = await matrixKit();
      const select = { kind: 'v4-select', variant: 'v4', lanes: 2, reserveS: 120, durationsS: [60, 60] };
      const generate = { kind: 'v4-generate', variant: 'v4', lanes: 1, reserveS: 245, durationsS: [100] };
      const replay = { kind: 'v4-replay', variant: 'v4', lanes: 2, reserveS: 120, durationsS: [30] };
      // After the first group drains at 65, the v4-generate group needs 65 + 245 > 270: it starts the next invocation.
      const a = m.simulateItems({ groups: [select, generate], horizonS: 285 });
      assert(a.admissible === true, 'a is admissible');
      same([a.invocations, a.nodeS, a.quietS, a.completed], [[{ items: 2, nodeS: 65 }, { items: 1, nodeS: 105 }], 170, 90, 3], 'a group that is not admitted after the drain ends the invocation');
      // A finished group passes on in the same invocation when the next group fits: it pays its own 3-s start.
      const b = m.simulateItems({ groups: [select, replay] });
      assert(b.admissible === true, 'b is admissible');
      same([b.invocations, b.completed], [[{ items: 3, nodeS: 98 }], 3], 'the replay group starts at 65, is ready at 68 and ends at 98');
    },
  },
  {
    name: 'price: approval fields',
    async run() {
      const { m } = await matrixKit();
      same(m.approvalFields({ roundCountedSBeforeApproval: 600, requestedAdditionalGuardS: 1200 }),
        { roundCountedSBeforeApproval: 600, requestedAdditionalGuardS: 1200, requestedCumulativeRoundMinutes: 30 },
        'the cap covers the time already spent and the additional guard: 30 minutes, not the 20 of the guard alone');
      same(m.approvalFields({ roundCountedSBeforeApproval: 600, requestedAdditionalGuardS: 1230 }).requestedCumulativeRoundMinutes, 31, 'a part of a minute is rounded up');
      same(m.approvalFields({ roundCountedSBeforeApproval: 0, requestedAdditionalGuardS: 0 }).requestedCumulativeRoundMinutes, 0, 'nothing spent, nothing asked');
    },
  },
  {
    name: 'price: projection label and fallback',
    async run() {
      const { m } = await matrixKit();
      const projected = m.projectedRowS({ refS: 40, factor: 1.1, rowLimitS: 260 });
      assert(Math.abs(projected - 55) <= 1e-9, `1.25 x 1.1 x 40 is ${projected}, not 55`);
      same(m.projectedRowS({ refS: null, factor: 1, rowLimitS: 130 }), 130, 'without a reference time the projection is the row limit');
      assert(Math.abs(m.projectedRowS({ refS: 300, factor: 1, rowLimitS: 260 }) - 375) <= 1e-9, 'the projection is not clamped to the limit: the simulation cuts the row');
      // The factor is the stage-1 identity's summary.medianRatioBase, 1 when the record is absent.
      const file = evidenceDir('frozen', 'V4-T04', 'identity.json');
      const recorded = JSON.parse(readFileSync(file, 'utf8')).summary.medianRatioBase;
      assert(typeof recorded === 'number' && recorded > 0, 'the record has a medianRatioBase');
      same(m.factor(), recorded, 'the factor is the record\'s medianRatioBase');
      const dir = fresh(join(SELFTEST_DIR, 'price-factor'));
      same(m.factor(join(dir, 'absent.json')), 1, 'an absent record gives 1');
      writeFileSync(join(dir, 'present.json'), JSON.stringify({ summary: { medianRatioBase: 1.5 } }));
      same(m.factor(join(dir, 'present.json')), 1.5, 'a present record gives its value');
      writeFileSync(join(dir, 'broken.json'), JSON.stringify({ summary: {} }));
      assert(thrownBy(() => m.factor(join(dir, 'broken.json'))).includes('no positive summary.medianRatioBase'), 'a present record without the value is not read as 1');
    },
  },
  {
    name: 'price: refS reads the timed runs',
    async run() {
      const { m } = await matrixKit();
      const { v } = await verdictKit();
      // The real MP12b1 report of 18x18 Nightmare: its 20 runs carry `sampling` entries only (the landscape's diagnostic pass after the timed interval).
      const found = mp12b1Report('18x18-nightmare');
      assert(found !== null && found.report.runs.length === 20, 'the report of 18x18-nightmare has 20 runs');
      const runs = /** @type {any[]} */ (found?.report.runs);
      assert(runs.every((r) => r.probeKind === 'generation' && r.errors.length > 0 && r.errors.every((/** @type {any} */ e) => e.phase === 'sampling')), 'every run is a generation probe with sampling entries only');
      assert(runs.every((r) => v.runStatus(r, { quantity: 10 }).status === 'error' && v.runStatus(m.withoutSampling(r), { quantity: 10 }).status === 'valid'),
        'read as they are the runs are errors; without the sampling entries they are valid (the input reaches the path)');
      const times = runs.map((r) => r.responseMs / 1000).sort((x, y) => x - y);
      const expected = (times[9] + times[10]) / 2;
      const got = m.refS('18x18-nightmare');
      assert(got !== null && Math.abs(got - expected) <= 1e-9 && got > 0, `refS is ${got}, the median of the 20 responseMs / 1000 is ${expected}`);
      // Without a report and without a valid run: null. Only valid runs count (a valid request that stops short does), whatever their number of puzzles.
      same(m.refS('no-such-case-nightmare'), null, 'no report');
      same(m.refS('x', () => null), null, 'a lookup without a report');
      same(m.refS('x', () => ({ path: 'p', report: { runs: [] } })), null, 'a report without a run');
      const sampling = { phase: 'sampling', code: 'rating-incomplete', message: 'm' };
      const batch = { phase: 'batch', code: 'worker-crashed', message: 'm' };
      const run = (/** @type {number} */ rep, /** @type {number} */ accepted, /** @type {Record<string, any>} */ over) => matrixRun('x', rep, accepted, over);
      const none = [await run(0, 10, { responseMs: 1000000, errors: [batch] }), await run(1, 10, { responseMs: 50000, measurementValid: false })];
      same(none.map((r) => v.runStatus(r, { quantity: 10 }).status), ['error', 'censored'], 'the two runs are judged, not valid');
      same(m.refS('x', () => ({ report: { runs: none } })), null, 'a batch error and a measurement that is not valid: no valid run');
      const mixed = {
        runs: [await run(0, 10, { responseMs: 10000, tenthReadyMs: 9000, errors: [sampling] }), await run(1, 6, { responseMs: 115000 }),
          await run(2, 10, { responseMs: 30000, tenthReadyMs: 29000 }), await run(3, 10, { responseMs: 999000, errors: [batch] })],
      };
      same(mixed.runs.map((r) => v.runStatus(m.withoutSampling(r), { quantity: 10 }).status), ['valid', 'valid', 'valid', 'error'], 'three valid runs (one short of ten, one with a sampling entry) and a batch error');
      same(m.refS('x', () => mixed), 30, 'the median of 10, 30 and 115 s (the short valid request counts, the batch error does not)');
      same(m.refS('x', () => ({ report: mixed })), 30, 'the lookup may return the report itself or { path, report }');
    },
  },
  {
    name: 'price: the inputs are checked',
    async run() {
      const { m } = await matrixKit();
      const proc = { type: 'process', durationsS: [60], reserveS: 120 };
      /** @param {() => unknown} fn @param {string} text @param {string} what */
      const refuses = (fn, text, what) => assert(thrownBy(fn).includes(text), `${what}: ${thrownBy(fn) || 'did not throw'}`);
      refuses(() => m.stepPrice({ type: 'rows', rows: 0, rowS: 55, rowLimitS: 260 }), 'rows must be a positive integer', 'a step of no rows is never priced');
      refuses(() => m.stepPrice({ type: 'rows', rows: 1.5, rowS: 55, rowLimitS: 260 }), 'rows must be a positive integer', 'a fraction of a row');
      refuses(() => m.stepPrice({ type: 'rows', rows: 1, rowS: Number.NaN, rowLimitS: 260 }), 'rowS must be a positive number', 'a row time that is not a number');
      refuses(() => m.stepPrice({ type: 'blocks' }), 'unknown step type "blocks"', 'an unknown type');
      refuses(() => m.stepPrice(/** @type {any} */ (null)), 'unknown step type', 'no step');
      refuses(() => m.stepPrice({ ...proc, horizonS: 900 }), 'horizonS must be at most 885', 'a horizon the runner never uses');
      refuses(() => m.stepPrice({ ...proc, durationsS: [] }), 'needs at least one duration', 'a step of no items');
      refuses(() => m.stepPrice({ ...proc, durationsS: [60, 0] }), 'durationsS[1] must be a positive number', 'an item of no time');
      refuses(() => m.stepPrice({ ...proc, reserveS: 0 }), 'reserveS must be a positive number', 'a reserve of 0 admits everything');
      refuses(() => m.simulateItems({ groups: [] }), 'groups must be a non-empty list', 'no group');
      refuses(() => m.simulateItems({ groups: [{ kind: 'v4-select', variant: 'v4', lanes: 0, reserveS: 120, durationsS: [1] }] }), 'lanes must be a positive integer', 'no lane');
      refuses(() => m.price(/** @type {any} */ ('x')), 'price needs a list of steps', 'steps that are no list');
      refuses(() => m.projectedRowS(/** @type {any} */ ({ refS: undefined, factor: 1, rowLimitS: 260 })), 'refS must be a positive number', 'a missing reference time is not null');
      refuses(() => m.projectedRowS({ refS: 40, factor: 0, rowLimitS: 260 }), 'factor must be a positive number', 'a factor of 0');
      refuses(() => m.approvalFields({ roundCountedSBeforeApproval: -1, requestedAdditionalGuardS: 10 }), 'roundCountedSBeforeApproval must be a number from 0', 'a negative time already spent');
      refuses(() => m.approvalFields(/** @type {any} */ ({ roundCountedSBeforeApproval: 600 })), 'requestedAdditionalGuardS must be a number from 0', 'a missing guard');
      same(m.price([]).admissible, true, 'an empty list is priced at zero');
    },
  },
  {
    name: 'compile: no unresolved argument',
    async run() {
      const { compiled, steps, live } = await compileKit();
      const missing = new Set();
      for (const step of steps) {
        assert(Array.isArray(step.node) && step.node.every((/** @type {unknown} */ w) => typeof w === 'string' && w !== ''), `${step.id}: node is an array of non-empty strings`);
        for (const word of step.node) {
          assert(!/[<>]/.test(word) && !word.includes('resolved after') && !word.includes('shipped-uncapped'), `${step.id}: the word ${word} is not resolved`);
        }
        const [script, ...rest] = step.node;
        if (!existsSync(abs(script.replaceAll('\\', '/')))) {
          missing.add(script);
        }
        rest.forEach((/** @type {string} */ word, /** @type {number} */ i) => {
          if (word.startsWith('--') && word !== '--require-pass') {
            assert(rest[i + 1] !== undefined && !rest[i + 1].startsWith('--'), `${step.id}: ${word} has no value`);
          }
        });
        const manifest = argAfter(step, '--manifest');
        assert(manifest === undefined || Object.hasOwn(compiled.itemManifests, manifest.split('\\').at(-1) ?? ''), `${step.id}: ${manifest} is not one of the compiled item manifests`);
      }
      same([...missing], [], 'every script exists');
      assert(live.prerequisites.some((/** @type {any} */ p) => p.type === 'file' && p.path === 'tools/ig-proto/live-deadline.mjs'), 'the tool is a file prerequisite of V4-LIVE');
      same(steps.find((/** @type {any} */ s) => s.id === 'accept-p0').node[0], 'tools\\ig-proto\\v4-check.mjs', 'accept-p0 runs v4-check');
      for (const [name, template] of Object.entries(compiled.templates)) {
        assert(!JSON.stringify(template).includes('"node"'), `the template ${name} has a node`);
      }
    },
  },
  {
    name: 'compile: producers before consumers',
    async run() {
      const { s2, live } = await compileKit();
      /** @type {Set<string>} */
      const produced = new Set();
      let consumed = 0;
      for (const plan of [s2, live]) {
        const declared = new Set(plan.prerequisites.filter((/** @type {any} */ p) => p.type === 'file' || p.type === 'accepted').map((/** @type {any} */ p) => p.path));
        /** @type {Set<string>} */
        const here = new Set();
        /** @type {string[]} */
        const ids = [];
        for (const step of plan.steps) {
          for (const path of step.consumes) {
            assert(here.has(path) || produced.has(path) || declared.has(path), `${plan.task}/${step.id} consumes ${path}, which no earlier step or plan produces and no prerequisite declares`);
            consumed += 1;
          }
          for (const dep of step.dependsOn) {
            assert(ids.includes(dep), `${plan.task}/${step.id} depends on ${dep}, which is not an earlier step`);
          }
          step.produces.forEach((/** @type {string} */ p) => here.add(p));
          ids.push(step.id);
        }
        here.forEach((p) => produced.add(p));
        if (plan === s2) {
          assert(produced.has('docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json'), 'V4-S2 produces the P-0 binding that V4-LIVE requires');
        }
      }
      assert(consumed > 100, `${consumed} consumed paths checked`);
      same(s2.steps.find((/** @type {any} */ s) => s.id === 'trees').node.slice(2), ['base', 'instr', 'r4c', 'v4', 'v4-w760', 'v4-w095', 'v4-w380', 'log-link', 'fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5'],
        'V4-S2 builds the variants the task names, the probes\' instr and r4c included');
      same(live.steps.find((/** @type {any} */ s) => s.id === 'trees').node.slice(2), ['fr-frozen'], 'V4-LIVE builds fr-frozen');
      same([s2.steps[1].id, live.steps[1].id], ['firewall-snapshot', 'firewall-snapshot'], 'each plan takes its firewall snapshot right after its gate, since its last step checks it');
      assert(live.steps.some((/** @type {any} */ s) => s.consumes.includes('docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json')), 'V4-LIVE consumes the binding of the earlier plan');
    },
  },
  {
    name: 'compile: P-0 is isolated and required',
    async run() {
      const { compiled, s2, live } = await compileKit();
      const stage1 = JSON.parse(readFileSync(join(IG_DIR, 'plans', 'V4-T04.parity.json'), 'utf8'));
      const p0 = compiled.itemManifests['V4-S2P.p0-v4.json'];
      same([p0.format, p0.version, p0.task, p0.step], [stage1.format, stage1.version, 'V4-S2P', 'p0-v4'], 'the P-0 manifest is under its own task and step');
      same(p0.rows.length, 8, 'eight rows');
      same(p0.rows, stage1.rows, 'its rows are the stage-1 corpus, unchanged');
      const isV4 = (/** @type {string} */ v) => v !== 'base';
      /** @param {any} manifest @returns {string[]} The (variant, case, seed, mode) of each item, without the storage step of its id. */
      const keys = (manifest) => expandManifest(manifest, artifactDir('frozen', manifest.task, manifest.step), isV4).map((i) => i.id.slice(manifest.step.length + 1));
      const before = keys(stage1);
      same([before.length, new Set(before).size], [23, 23], 'the stage-1 corpus has 23 distinct items');
      same(keys(p0), before, 'the same 23 items, under another step id');
      assert(expandManifest(p0, artifactDir('frozen', 'V4-S2P', 'p0-v4'), isV4).every((i) => String(i.payload.logDir).includes('V4-S2P') && !String(i.payload.logDir).includes('V4-T04')),
        'a P-0 item logs under V4-S2P and never under V4-T04');
      const at = s2.steps.findIndex((/** @type {any} */ s) => s.id === 'p0-v4');
      const [run, receipt, accept] = s2.steps.slice(at, at + 3);
      same([argAfter(run, '--task'), argAfter(run, '--step'), run.state, run.locked], ['V4-S2P', 'p0-v4', 'V4-S2P\\p0-v4\\state.json', true], 'the P-0 step runs under V4-S2P and its own state');
      same([receipt.id, argAfter(receipt, '--kind'), receipt.node.includes('--require-pass'), argAfter(receipt, '--baseline')],
        ['receipt-p0', 'p0-identity', true, 'docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json'], 'the receipt follows the run: p0-identity, a required pass, the stage-1 binding as baseline');
      same([accept.id, argAfter(accept, '--receipt'), argAfter(accept, '--binding')], ['accept-p0', receipt.produces[0], 'docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json'], 'the acceptance follows the receipt');
      assert(live.prerequisites.some((/** @type {any} */ p) => isDeepStrictEqual(p, { type: 'accepted', path: 'docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json', current: ['v4'] })),
        'V4-LIVE requires the accepted P-0 binding on today\'s v4 tree');
      // Every P-1 pass is a required proof as well: its receipt exits nonzero on a failed or incomplete pass and its acceptance follows it.
      for (const arm of ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5']) {
        const i = s2.steps.findIndex((/** @type {any} */ s) => s.id === `parity-${arm}`);
        const [pass, rec, acc] = s2.steps.slice(i, i + 3);
        same([argAfter(pass, '--task'), argAfter(pass, '--step'), argAfter(pass, '--manifest')], ['V4-S2P', `parity-${arm}`, `tools\\ig-proto\\plans\\items\\V4-S2P.parity-${arm}.json`], `${arm}: the pass runs its own manifest`);
        same([rec.id, argAfter(rec, '--kind'), argAfter(rec, '--arm'), rec.node.includes('--require-pass'), acc.id, argAfter(acc, '--by'), argAfter(acc, '--binding')],
          [`receipt-${arm}`, 'parity', arm, true, `accept-${arm}`, 'V4-S2', `docs/improve-generating/evidence/frozen/V4-S2P/parity-${arm}.accepted.json`], `${arm}: a required receipt, then its acceptance`);
        const manifest = compiled.itemManifests[`V4-S2P.parity-${arm}.json`];
        same([manifest.format, manifest.task, manifest.step, manifest.rows.length, [...new Set(manifest.rows.map((/** @type {any} */ r) => r.variant))]], ['ig-proto-items', 'V4-S2P', `parity-${arm}`, 5, [arm]], `${arm}: its manifest`);
      }
      for (const arm of ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped']) {
        const manifest = compiled.itemManifests[`V4-S4P.parity-${arm}.json`];
        same([manifest.format, manifest.task, manifest.step, expandManifest(manifest, artifactDir('frozen', manifest.task, manifest.step), isV4).length], ['ig-proto-items', 'V4-S4P', `parity-${arm}`, 12], `${arm}: a stage-4 manifest of 12 items`);
      }
      same(Object.keys(compiled.itemManifests).length, 12, 'the P-0 manifest, seven stage-2 and four stage-4 P-1 manifests');
      // The proofs come first: the 24 steps after `trees` are the three P-0 steps and the 21 P-1 steps, all before the first request row,
      // so that a failed or incomplete proof stops the plan before any row runs (ruling of 2026-11-17).
      const afterTrees = s2.steps.findIndex((/** @type {any} */ s) => s.id === 'trees') + 1;
      same(s2.steps.slice(afterTrees, afterTrees + 24).map((/** @type {any} */ s) => s.id),
        ['p0-v4', 'receipt-p0', 'accept-p0', ...['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5'].flatMap((arm) => [`parity-${arm}`, `receipt-${arm}`, `accept-${arm}`])],
        'the P-0 steps, then the P-1 pass of each arm in order');
      same(s2.steps.findIndex((/** @type {any} */ s) => s.id.startsWith('rows-')), afterTrees + 24, 'the first request row follows the 24 proof steps');
      same(s2.steps.slice(0, afterTrees).map((/** @type {any} */ s) => s.id), ['prerequisites', 'firewall-snapshot', 'trees'], 'after the gate, the snapshot and the trees');
      same(s2.steps.slice(-6).map((/** @type {any} */ s) => s.id), ['kernel-counters', 'kernel-profile', 'kernel-report', 'width', 'width-report', 'firewall-check'], 'the probes and the firewall check come last');
      // The live receipt is a mandatory proof (D-V4-19): it exits nonzero unless it passes.
      const liveReceipt = live.steps.find((/** @type {any} */ s) => s.id === 'live-receipt');
      same([liveReceipt.node, liveReceipt.expect], [['tools\\ig-proto\\live-deadline.mjs', 'receipt', '--task', 'V4-LIVE', '--require-pass'],
        'receipt: live-deadline pass -> docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json'], 'V4-LIVE\'s live-receipt requires a pass');
    },
  },
  {
    name: 'compile: no executable stage-4 plan',
    async run() {
      const { compiled, expansion, steps } = await compileKit();
      same(Object.values(compiled.plans).map((/** @type {any} */ p) => p.task), ['V4-S2', 'V4-LIVE'], 'only V4-S2 and V4-LIVE are plans');
      same(Object.keys(compiled.templates), ['V4-S4.universe.json', 'V4-S4X.template.json'], 'the universe and the second validation are templates');
      const tasks = new Set(steps.flatMap((/** @type {any} */ s) => (s.node.includes('--task') ? [argAfter(s, '--task')] : [])));
      same([...tasks].sort(), ['V4-LIVE', 'V4-S2', 'V4-S2K', 'V4-S2P', 'V4-S2W'], 'no step runs under a stage-4 task');
      const { 'V4-S4.universe.json': universe, 'V4-S4X.template.json': second } = compiled.templates;
      for (const template of [universe, second]) {
        assert(template.runnable === false && template.template === true && !JSON.stringify(template).includes('"node"'), `${template.task} is a template without a node`);
      }
      same(second.blockedBy, ['N-V4-04'], 'the second validation waits for the adoption');
      /** @param {string} collection @param {boolean} comparator @returns {string[]} */
      const ids = (collection, comparator) => expansion.groups.filter((/** @type {any} */ g) => g.collection === collection && g.comparator === comparator).map((/** @type {any} */ g) => g.id);
      const initial = ids('initial', true);
      assert(initial.length > 0, 'the initial collection has comparators');
      same(universe.collections.initial.comparators.map((/** @type {any} */ g) => g.id), initial, 'the universe\'s initial comparators are every comparator group of that collection');
      same(universe.collections.initial.groups.map((/** @type {any} */ g) => g.id), ids('initial', false), 'and its groups the others');
      const s47 = expansion.groups.filter((/** @type {any} */ g) => g.items.includes('S4-7')).map((/** @type {any} */ g) => g.id).sort();
      assert(s47.length > 0, 'S4-7 has groups');
      same([...universe.collections.second.groups, ...universe.collections.second.comparators].map((/** @type {any} */ g) => g.id).sort(), s47, 'the second collection holds every S4-7 group');
      same([...second.groups, ...second.comparators].map((/** @type {any} */ g) => g.id).sort(), s47, 'and so does the template');
      assert(second.comparators.every((/** @type {any} */ g) => g.task === 'V4-S4XC'), 'the comparators of the second validation are V4-S4XC');
      for (const group of [...Object.values(universe.collections).flatMap((/** @type {any} */ c) => [...c.groups, ...c.comparators])]) {
        same([group.price.type, group.price.rows], ['rows', group.rows], `${group.id} is priced on its rows`);
      }
    },
  },
  {
    name: 'compile: disjoint state paths',
    async run() {
      const { locked } = await compileKit();
      const states = locked.map((/** @type {any} */ s) => s.state);
      same(new Set(states).size, states.length, 'two locked steps share a state path');
      assert(states.includes('V4-S2\\fr-base\\pilot-14x14-nightmare\\state.json'), 'the pilot of fr-base on 14x14-nightmare has its state');
      assert(states.includes('V4-S2P\\p0-v4\\state.json'), 'the isolated P-0 has its state');
      for (const id of ['IGP-02', 'V4-T04', 'V4-T04v4', 'V4-T04f', 'V4-T04i']) {
        assert(states.every((/** @type {string} */ s) => !s.startsWith(`${id}\\`)), `a state under ${id}, a historical record`);
      }
      assert(locked.every((/** @type {any} */ s) => s.state.startsWith(`${argAfter(s, '--task')}\\`)), 'a state is under the task of its argv');
      assert(locked.every((/** @type {any} */ s) => s.produces.includes(`tests/artifacts/ig-proto/frozen/${s.state.replaceAll('\\', '/')}`)), 'a step produces the state file it runs under');
      same(states.filter((/** @type {string} */ s) => s.startsWith('V4-S2P\\')).length, 8, 'the seven P-1 passes and the P-0 each have a folder under V4-S2P');
    },
  },
  {
    name: 'compile: each step priced as it runs',
    async run() {
      const { m, s2, live, locked, expansion } = await compileKit();
      for (const step of locked) {
        const priced = m.stepPrice(step.price);
        assert(priced.admissible === true, `${step.id} is not admissible`);
        same([step.projectS, step.invocations], [priced.projectS, priced.invocations], `${step.id}: the step carries the price of its own input`);
      }
      /** @param {any[]} steps @param {boolean} optional @returns {number} */
      const minutes = (steps, optional) => Math.ceil(steps.filter((s) => s.locked && s.optional === optional).reduce((sum, s) => sum + s.projectS + 45 * s.invocations, 0) / 60);
      for (const plan of [s2, live]) {
        same([plan.allocationMinutes, plan.optionalMinutes], [minutes(plan.steps, false), minutes(plan.steps, true)], `${plan.task}: allocation and optional minutes`);
        assert(plan.allocationMinutes > 0, `${plan.task} has an allocation`);
      }
      // An optional step is priced apart: the stage-4 optional item S4-6 beside a required stage-4 row step.
      const optionalGroup = expansion.groups.find((/** @type {any} */ g) => g.collection === 'optional');
      const requiredGroup = expansion.groups.find((/** @type {any} */ g) => g.collection === 'initial' && !g.comparator);
      const required = m.rowStep(requiredGroup, m.stepPrice, 100);
      const optional = m.rowStep(optionalGroup, m.stepPrice, 100);
      same([required.optional, optional.optional], [false, true], 'the optional flag is the group\'s');
      const mixed = m.planOf({ task: 'T', generatedBy: 'x', runnable: true, blockedBy: [], prerequisites: [], steps: [required, optional] });
      same([mixed.allocationMinutes, mixed.optionalMinutes], [minutes([required], false), minutes([optional], true)], 'required and optional steps are summed apart');
      assert(mixed.allocationMinutes > 0 && mixed.optionalMinutes > 0, 'both sums are above zero');
    },
  },
  {
    name: 'compile: bounded steps resume',
    async run() {
      const { m, s2, locked } = await compileKit();
      for (const step of locked) {
        assert(step.repeatUntilDone === true, `${step.id} does not repeat until done`);
        assert(typeof step.state === 'string' && step.state.endsWith('\\state.json'), `${step.id} has no state path`);
        const expected = step.price.type === 'rows' ? step.price.rowLimitS + 12 : step.id.startsWith('parity-') ? 270 : 150;
        same(step.minHorizonS, expected, `${step.id}: minHorizonS`);
      }
      same(locked.filter((/** @type {any} */ s) => s.price.type !== 'rows' && !s.id.startsWith('parity-')).map((/** @type {any} */ s) => s.id),
        ['p0-v4', 'kernel-counters', 'kernel-profile', 'width'], 'the steps that are neither rows nor a P-1 pass');
      const p0 = s2.steps.find((/** @type {any} */ s) => s.id === 'p0-v4');
      const slow = m.stepPrice({ ...p0.price, groups: p0.price.groups.map((/** @type {any} */ g) => ({ ...g, durationsS: g.durationsS.map(() => 120) })) });
      assert(slow.admissible === true && slow.invocations >= 2, `23 items of 120 s need ${slow.invocations} invocations`);
      const row = s2.steps.find((/** @type {any} */ s) => s.id.startsWith('rows-'));
      same([row.invocations, row.price.rows], [2, 5],
        'the five 260-s-limit rows need two invocations at horizon 885: four rows, then one');
    },
  },
  {
    name: 'compile: populations as priced',
    async run() {
      const { m, s2, live, expansion, durations, compiled } = await compileKit();
      const step = (/** @type {string} */ id) => s2.steps.find((/** @type {any} */ s) => s.id === id);
      const counters = step('kernel-counters');
      same(argAfter(counters, '--cases'), '10x10-nightmare,12x12-nightmare,14x14-nightmare,26x26-nightmare,26x26-hell-1', 'the counters run five cases');
      const kernel = await kernelItems(String(argAfter(counters, '--cases')).split(','));
      same(counters.price.groups.map((/** @type {any} */ g) => [g.kind, g.variant, g.lanes, g.reserveS, g.durationsS.length]), [[kernel[0].kind, kernel[0].variant, 1, 90, 30]], 'one group of 30 items on one lane');
      same(kernel.length, 30, 'the counters build 30 items: six subsets of each case');
      const profile = step('kernel-profile');
      same(argAfter(profile, '--cases'), '14x14-nightmare,26x26-nightmare', 'the profile runs T10b\'s two cases, written out');
      const profiled = profileItems(String(argAfter(profile, '--cases')).split(','), { task: 'V4-S2K', sourceLabel: 'x' });
      same([profile.price.type, profile.price.durationsS.length, profile.price.reserveS, profiled.length, profiled[0].kind, profiled[0].variant], ['process', 2, 120, 2, 'process', 'instr'], 'two process items of 120 s reserve');
      const width = step('width');
      same([argAfter(width, '--cases'), argAfter(width, '--rounds')], ['26x26-nightmare,14x14-nightmare', '3'], 'the width run: two cases, three rounds');
      const widths = widthItems(String(argAfter(width, '--cases')).split(','), Number(argAfter(width, '--rounds')));
      same([width.price.type, width.price.durationsS.length, widths.length, widths[0].kind, widths[0].variant], ['process', 8, 8, 'width', 'base'], 'eight width items');
      for (const probe of [counters, profile, width]) {
        same(probe.price.cases, argAfter(probe, '--cases'), `${probe.id}: the price input records the cases of its node`);
      }
      // The P-1 passes and the P-0 are priced on the items their manifests expand to, grouped as `runItems` groups them.
      const isV4 = (/** @type {string} */ v) => v !== 'base';
      /** @param {any} manifest @returns {string[][]} Consecutive items of one kind and variant, as [kind, variant, count]. */
      const grouped = (manifest) => {
        /** @type {any[]} */
        const groups = [];
        for (const item of expandManifest(manifest, artifactDir('frozen', manifest.task, manifest.step), isV4)) {
          const last = groups.at(-1);
          if (last !== undefined && last[0] === item.kind && last[1] === item.variant) {
            last[2] += 1;
          } else {
            groups.push([item.kind, item.variant, 1]);
          }
        }
        return groups;
      };
      const priced = (/** @type {any} */ s) => s.price.groups.map((/** @type {any} */ g) => [g.kind, g.variant, g.durationsS.length]);
      const p1 = step('parity-fr-screen');
      same(priced(p1), grouped(m.parityManifest('V4-S2P', 'fr-screen')), 'a P-1 pass is priced on its manifest\'s items');
      same(priced(p1), [['v4-select', 'fr-screen', 9], ['v4-generate', 'fr-screen', 1], ['v4-replay', 'fr-screen', 2]], '9 selections, 1 generation and 2 replays');
      same(p1.price.groups.map((/** @type {any} */ g) => [g.lanes, g.reserveS]), [[2, 120], [1, 245], [2, 120]], 'on 2, 1 and 2 lanes with the reserves 120, 245 and 120');
      same(priced(step('p0-v4')), grouped(compiled.itemManifests['V4-S2P.p0-v4.json']), 'the P-0 is priced on the 23 items of its manifest');
      same(priced(step('p0-v4')).reduce((/** @type {number} */ sum, /** @type {any[]} */ g) => sum + g[2], 0), 23, 'which are 23');
      assert(durations['v4-select/*'] === 30, 'the synthetic seconds are those of the Tests table');
      // With measures, the probes and the P-0 take them: a width item three rounds of T10c's one-round mean, a P-0 group its variant's mean.
      const measured = m.compilePlans(expansion, m.stepPrice, {
        durations: { 'v4-kernel/r4c': 2, 'process/instr': 7, 'width/base': 4, 'v4-select/v4': 40, 'v4-select/base': 10, 'v4-select/v4-w760': 20, 'v4-select/v4-w095': 9, 'v4-select/v4-w380': 27 },
      }).plans['V4-S2.json'];
      const at = (/** @type {string} */ id) => measured.steps.find((/** @type {any} */ s) => s.id === id).price;
      same([at('kernel-counters').groups[0].durationsS, at('kernel-profile').durationsS, at('width').durationsS],
        [Array(30).fill(2), [7, 7], Array(8).fill(12)], 'the counters, the profile and the width run take their measured seconds, the width item three times');
      same(at('p0-v4').groups.map((/** @type {any} */ g) => [g.variant, [...new Set(g.durationsS)], g.durationSource]),
        [['v4', [40], 'item logs'], ['base', [10], 'item logs'], ['v4-w760', [20], 'item logs'], ['v4-w095', [9], 'item logs'], ['v4-w380', [27], 'item logs']], 'each P-0 group takes its variant\'s seconds');
      same(at('parity-fr-base').groups.map((/** @type {any} */ g) => g.durationSource), ['reserve', 'reserve', 'reserve'], 'a P-1 pass of a variant without a measure takes its reserves');
      // Every row step runs the rows of its group: its --cases expands to exactly those reps of that cell.
      const groups = [...expansion.groups.filter((/** @type {any} */ g) => g.collection === 'stage2'), ...expansion.groups.filter((/** @type {any} */ g) => g.collection === 'live')];
      const rowSteps = [...s2.steps, ...live.steps].filter((/** @type {any} */ s) => s.price?.type === 'rows');
      same(rowSteps.length, groups.length, 'one row step per group');
      groups.forEach((/** @type {any} */ g, /** @type {number} */ i) => {
        const s = rowSteps[i];
        same([s.id, argAfter(s, '--task'), argAfter(s, '--arm'), argAfter(s, '--variant'), s.price.rows, s.price.rowLimitS],
          [`rows-${g.arm}-${g.shard}`, g.task, g.arm, g.arm, g.rows, g.rowLimitS], `the row step of ${g.id}`);
        same(armCases(String(argAfter(s, '--cases'))).map((/** @type {any} */ r) => [r.caseId, r.rep]), Array.from({ length: g.rows }, (_, k) => [g.cell, g.from + k]), `${s.id} runs the reps of its group`);
      });
      const empty = { ...groups[0], rows: 0 };
      assert(thrownBy(() => m.rowStep(empty, m.stepPrice, 100)).startsWith('manifest: a row step needs at least one row'), 'a group of no rows is no step');
      same(argAfter(m.rowStep({ ...groups[0], arm: 'shipped-uncapped', variant: 'fr-frozen-uncapped' }, m.stepPrice, 100), '--variant'), 'fr-frozen-uncapped', 'a resolved comparator brings its own variant');
      assert(thrownBy(() => m.rowStep({ ...groups[0], arm: 'shipped-uncapped' }, m.stepPrice, 100)).startsWith('manifest: no variant for the arm shipped-uncapped'), 'an arm without a variant is no step');
    },
  },
  {
    name: 'compile: blocked plans refuse',
    async run() {
      const { m, live } = await compileKit();
      const dir = fresh(artifactDir('selftest', 'compile-gate'));
      const arm = { id: 'v4', treeId: 'tree-v4', paramsHash: 'params-v4' };
      const source = { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST };
      /**
       * A passing receipt of the kind, written to the scratch folder, and the binding `acceptedBinding` builds over it.
       * @param {string} kind @param {Record<string, unknown>} fields @returns {{ file: string, path: string, binding: any }}
       */
      const bound = (kind, fields) => {
        const file = join(dir, `${kind}.receipt.json`);
        writeJson(file, proofEnvelope({ kind, verdict: 'pass', source, harnessHash: 'h', arms: [arm], coverage: { expected: ['a'], observed: ['a'], missing: [], censored: [] }, evidence: [], fields }));
        return { file, path: rel(file), binding: acceptedBinding({ receiptPath: rel(file), harnessHash: 'h', arms: [arm], params: { v4: {} }, coverage: ['a'], fields, by: 'selftest' }) };
      };
      const p0 = bound('p0-identity', { blocks: { parity: 'pass', baseline: 'pass' } });
      const p0Entry = live.prerequisites.find((/** @type {any} */ p) => p.type === 'accepted');
      const bindings = /** @type {Record<string, any>} */ ({ [p0Entry.path]: p0.binding });
      const io = (/** @type {Record<string, unknown>} */ over = {}) => ({
        variants: ['v4', 'fr-frozen'], exists: () => true, readJson: (/** @type {string} */ path) => bindings[path],
        currentOf: async (/** @type {string} */ id) => ({ id, treeId: arm.treeId, paramsHash: arm.paramsHash }), ...over,
      });
      const lines = async (/** @type {any[]} */ list, /** @type {Record<string, unknown>} */ over) => (await m.checkPrerequisites(list, io(over))).line;
      // (a) a variant that does not exist: the line starts with its reason; the other entries are judged too
      same(await lines(live.prerequisites, { variants: ['v4'] }), 'prerequisites: blocked (variant fr-frozen missing)', '(a) fr-frozen missing');
      same(await lines(live.prerequisites, { variants: ['v4'], exists: (/** @type {string} */ p) => p !== p0Entry.path && !p.endsWith('freeze.json') }),
        `prerequisites: blocked (variant fr-frozen missing; missing file docs/improve-generating/evidence/frozen/V4-S3/freeze.json; missing binding ${p0Entry.path})`, '(a) and the other reasons, in order');
      // (c) everything present and bound
      same(await lines(live.prerequisites), 'prerequisites: pass', '(c) everything present and bound');
      // today's tree must be the bound one
      same(await lines(live.prerequisites, { currentOf: async (/** @type {string} */ id) => ({ id, treeId: 'moved', paramsHash: arm.paramsHash }) }), 'prerequisites: blocked (stale arm v4)', 'the tree moved since the binding');
      // (b) the receipt changed after acceptance
      writeJson(p0.file, { changed: true });
      same(await lines(live.prerequisites), `prerequisites: blocked (receipt changed ${p0.path})`, '(b) the receipt changed after acceptance');
      // (d) a binding of another kind
      const projection = bound('deadline-projection', { postHoc: true });
      bindings['x/live.accepted.json'] = projection.binding;
      same(await lines([{ type: 'accepted', path: 'x/live.accepted.json', current: [], kind: 'live-deadline' }]), 'prerequisites: blocked (x/live.accepted.json is not a live-deadline binding)', '(d) the kind of the binding');
      const liveBound = bound('live-deadline', { ...LIVE_DEADLINE_FIELDS });
      bindings['x/live.accepted.json'] = liveBound.binding;
      same(await lines([{ type: 'accepted', path: 'x/live.accepted.json', current: [], kind: 'live-deadline', fields: 'LIVE_DEADLINE_FIELDS' }]), 'prerequisites: pass', 'the live-deadline fields are those of T04d');
      bindings['x/live.accepted.json'] = bound('live-deadline', { live: true }).binding;
      same(await lines([{ type: 'accepted', path: 'x/live.accepted.json', current: [], kind: 'live-deadline', fields: 'LIVE_DEADLINE_FIELDS' }]), 'prerequisites: blocked (x/live.accepted.json lacks the live-deadline fields)', 'a live-deadline binding without the fields');
      same(await lines([{ type: 'nope' }]), 'prerequisites: blocked (unknown prerequisite nope)', 'an unknown type is not a pass');
      same(await lines([]), 'prerequisites: pass', 'no prerequisite is a pass');
    },
  },
  {
    name: 'compile: the measured seconds and the reserve',
    async run() {
      const { m } = await matrixKit();
      /** @param {string} item @param {string} kind @param {string} variant */
      const start = (item, kind, variant) => ({ type: 'item-start', identityHash: 'h', item, kind, variant, at: 'x' });
      /** @param {string} item @param {number} ms @param {string} [status] */
      const end = (item, ms, status = 'completed') => ({ type: 'item-end', identityHash: 'h', item, status, result: {}, ms, at: 'x' });
      const log = [start('a', 'v4-select', 'v4'), end('a', 2000), start('b', 'v4-select', 'v4'), end('b', 4000), start('c', 'v4-replay', 'v4'), end('c', 500, 'censored'),
        end('orphan', 9000), start('d', 'v4-select', 'v4'), end('d', 0), start('e', 'width', 'base'), end('e', Number.NaN)];
      same(m.measuredDurations([log]), { 'v4-replay/v4': 0.5, 'v4-select/v4': 3 }, 'the mean of ms / 1000 per kind and variant: a line without a start, a zero and a NaN are no measure, a censored end is');
      same(m.measuredDurations([log, [start('a', 'v4-select', 'v4'), end('a', 6000)]])['v4-select/v4'], 4, 'two logs are pooled, each with its own starts');
      const seen = /** @type {string[]} */ ([]);
      same(m.durationsFromLogs((/** @type {string} */ path) => { seen.push(rel(path)); return []; }), {}, 'no log, no measure');
      same(seen, ['V4-T04/parity', 'V4-T04/replay', 'V4-T10a/counters', 'V4-T10b/profile', 'V4-T10c/run'].map((s) => `tests/artifacts/ig-proto/frozen/${s}/items.jsonl`), 'the five logs of the earlier tasks');
      const real = m.durationsFromLogs();
      for (const key of ['v4-select/v4', 'v4-generate/v4', 'v4-replay/v4', 'v4-kernel/r4c', 'process/instr', 'width/base']) {
        assert(typeof real[key] === 'number' && real[key] > 0, `${key} has a measure in the item logs`);
      }
      const manifest = m.parityManifest('V4-S2P', 'fr-base');
      /** @param {Record<string, number>} durations @returns {unknown[][]} */
      const groupsAt = (durations) => m.itemGroups(manifest, durations).map((/** @type {any} */ g) => [g.kind, g.variant, g.lanes, g.reserveS, g.durationsS.length, [...new Set(g.durationsS)], g.durationSource]);
      const reserve = [['v4-select', 'fr-base', 2, 120, 9, [120], 'reserve'], ['v4-generate', 'fr-base', 1, 245, 1, [245], 'reserve'], ['v4-replay', 'fr-base', 2, 120, 2, [120], 'reserve']];
      same(groupsAt({}), reserve, 'a variant without a measure takes its reserve and says so');
      same(groupsAt({ 'v4-select/v4': 30, 'v4-generate/v4': 20, 'v4-replay/v4': 10 }), reserve, 'another variant\'s measure is not this variant\'s');
      same(groupsAt({ 'v4-select/fr-base': 30, 'v4-generate/fr-base': 20, 'v4-replay/fr-base': 10 }),
        [['v4-select', 'fr-base', 2, 120, 9, [30], 'item logs'], ['v4-generate', 'fr-base', 1, 245, 1, [20], 'item logs'], ['v4-replay', 'fr-base', 2, 120, 2, [10], 'item logs']], 'a measured variant takes it');
      same(groupsAt({ 'v4-select/*': 30 })[0], ['v4-select', 'fr-base', 2, 120, 9, [30], 'item logs'], 'a kind-wide value serves every variant of the kind');
      assert(thrownBy(() => m.itemGroups(manifest, { 'v4-select/fr-base': 0 })).includes('must be a positive number'), 'a measure of 0 is refused');
      assert(thrownBy(() => m.itemGroups({ rows: [{ kind: 'v4-kernel', variant: 'r4c' }] }, {})).includes('names no items'), 'a row that names no items is refused');
      // The compiler says which items it priced at their reserve: with the synthetic seconds only the probes; with today's logs the P-1 passes of the seven arms.
      const { expansion, compiled } = await compileKit();
      same(m.reservePriced(compiled.plans), ['kernel-profile', 'v4-kernel/r4c', 'width'], 'the probes have no synthetic seconds');
      same(m.reservePriced(m.compilePlans(expansion, m.stepPrice, { durations: real }).plans),
        ['fr-base', 'fr-c4', 'fr-close', 'fr-none', 'fr-p5', 'fr-ps', 'fr-screen'].flatMap((arm) => ['v4-generate', 'v4-replay', 'v4-select'].map((kind) => `${kind}/${arm}`)).sort(),
        'with the measures of the earlier tasks, only the seven arms of stage 2, which no earlier task ran, take reserves');
    },
  },
  {
    name: 'compile: only its own files are written',
    async run() {
      const { m, expansion, compiled } = await compileKit();
      const files = m.compiledFiles(compiled);
      same([files.length, files.filter((/** @type {any} */ f) => f.path.startsWith('tools/ig-proto/plans/items/')).length], [16, 12], 'two plans, two templates and twelve item manifests');
      same(files.slice(0, 4).map((/** @type {any} */ f) => f.path), ['V4-S2.json', 'V4-LIVE.json', 'V4-S4.universe.json', 'V4-S4X.template.json'].map((n) => `tools/ig-proto/plans/${n}`), 'in this order');
      const dir = fresh(artifactDir('selftest', 'compile-files'));
      const resolve = (/** @type {string} */ path) => join(dir, ...path.split('/'));
      const first = m.writeCompiled(files, { resolve });
      same([first.written.length, first.refused], [16, []], 'a first write puts the 16 files');
      const own = resolve('tools/ig-proto/plans/V4-S2.json');
      assert(JSON.parse(readFileSync(own, 'utf8')).generatedBy === 'manifest.mjs compile', 'a written plan carries its marker');
      same(m.writeCompiled(files, { resolve }).written.length, 16, 'a second write replaces the files it owns');
      // A plan without the marker and an item manifest of another task are not the compiler's: nothing is written at all.
      writeFileSync(resolve('tools/ig-proto/plans/V4-LIVE.json'), '{"task":"V4-LIVE"}\n');
      writeFileSync(resolve('tools/ig-proto/plans/items/V4-S4P.parity-fr-frozen.json'), '{"format":"ig-proto-items","version":1,"task":"V4-T04","step":"parity","rows":[]}\n');
      const before = readFileSync(own, 'utf8');
      writeFileSync(own, `${before.trimEnd()} \n`);
      const damaged = readFileSync(own, 'utf8');
      const refused = m.writeCompiled(files, { resolve });
      same([refused.written, refused.refused], [[], ['tools/ig-proto/plans/V4-LIVE.json exists and is not a file of this compiler', 'tools/ig-proto/plans/items/V4-S4P.parity-fr-frozen.json exists and is not a file of this compiler']],
        'both foreign files are named and nothing is written');
      same(readFileSync(own, 'utf8'), damaged, 'a file of its own was left as it was');
      writeFileSync(resolve('tools/ig-proto/plans/V4-LIVE.json'), 'not json');
      assert(m.writeCompiled(files, { resolve }).refused[0].includes('V4-LIVE.json'), 'a file that is not JSON is no file of the compiler');
      // A step that is not admissible refuses the whole compilation and names each such step.
      const refusing = (/** @type {any} */ input, /** @type {string} */ id) => (input.type === 'items' && id === 'kernel-counters' ? { admissible: false, reason: 'no room' } : m.stepPrice(input));
      const message = thrownBy(() => m.compilePlans(expansion, refusing, { durations: {} }));
      assert(message.startsWith('manifest: 1 step(s) not admissible: V4-S2/kernel-counters: no room'), message);
    },
  },
  {
    name: 'receipt: absent digests decide, not event digests',
    run() {
      const variants = ['v4', 'v4-w760', 'v4-w095', 'v4-w380'];
      const key = (/** @type {string} */ variant) => `${variant}|${RECEIPT_CASE}|${RECEIPT_SEED}|absent`;
      const side = (/** @type {string} */ prefix, /** @type {(variant: string) => string} */ digest) => variants
        .map((variant) => rowOf(variant, RECEIPT_CASE, RECEIPT_SEED, 'absent', digest(variant), `${prefix}:${variant}:${RECEIPT_CASE}:${RECEIPT_SEED}:absent`));
      const params = variants.map((variant) => ({ variant, now: 'p', baseline: 'p' }));
      const changed = baselineVerdict(side('p0-v4', (variant) => (variant === 'v4' ? 'd2' : 'd1')), side('parity', () => 'd1'), params);
      same([changed.verdict, changed.reasons], ['fail', [`result changed ${key('v4')}`]], `one result digest differs: ${JSON.stringify(changed)}`);
      same(changed.rows.map((r) => r.equal), [false, true, true, true], 'only the first of the four keys differs');
      same(changed.rows[0], { key: key('v4'), now: 'd2', baseline: 'd1', equal: false }, 'the row of the changed key');
      // The events digests are not read: equal result digests pass whatever the events digests say.
      const withEvents = (/** @type {any[]} */ rows, /** @type {string} */ digest) => rows.map((r) => ({ ...r, result: { ...r.result, eventsDigest: digest } }));
      const events = baselineVerdict(withEvents(side('p0-v4', () => 'd1'), 'e-now'), withEvents(side('parity', () => 'd1'), 'e-before'), params);
      same([events.verdict, events.reasons], ['pass', []], 'equal result digests with other events digests');
      // Only the absent mode is compared: a charge or record row of the new step needs no baseline row.
      const modes = [...side('p0-v4', () => 'd1'), rowOf('v4', RECEIPT_CASE, RECEIPT_SEED, 'charge', 'x'), rowOf('v4', RECEIPT_CASE, RECEIPT_SEED, 'record', 'y')];
      const only = baselineVerdict(modes, side('parity', () => 'd1'), params);
      same([only.verdict, only.rows.length], ['pass', 4], 'the modes charge and record are not compared');
    },
  },
  {
    name: 'receipt: storage ids do not matter',
    run() {
      const variants = ['v4', 'v4-w760', 'v4-w095', 'v4-w380'];
      const side = (/** @type {string} */ prefix) => variants
        .map((variant) => rowOf(variant, RECEIPT_CASE, RECEIPT_SEED, 'absent', `d-${variant}`, `${prefix}:${variant}:${RECEIPT_CASE}:${RECEIPT_SEED}:absent`));
      const params = variants.map((variant) => ({ variant, now: 'p', baseline: 'p' }));
      const [now, before] = [side('p0-v4'), side('parity')];
      assert(now.every((r, i) => r.item.startsWith('p0-v4:') && before[i].item.startsWith('parity:')), 'the two sides have other storage ids');
      const verdict = baselineVerdict(now, before, params);
      same([verdict.verdict, verdict.reasons, verdict.rows.map((r) => r.equal)], ['pass', [], [true, true, true, true]], `the same results under other ids: ${JSON.stringify(verdict)}`);
      same(baselineVerdict(now, [...before].reverse(), params).verdict, 'pass', 'the order of the baseline rows does not matter');
    },
  },
  {
    name: 'receipt: a missing baseline fails closed',
    run() {
      const key = `v4|${RECEIPT_CASE}|${RECEIPT_SEED}|absent`;
      const row = (/** @type {string | undefined} */ digest, /** @type {Record<string, any>} */ over = {}) => ({ ...rowOf('v4', RECEIPT_CASE, RECEIPT_SEED, 'absent', digest), ...over });
      const params = [{ variant: 'v4', now: 'p', baseline: 'p' }];
      const lacking = baselineVerdict([row('d')], [], params);
      same([lacking.verdict, lacking.reasons, lacking.rows], ['fail', [`no baseline for ${key}`], [{ key, now: 'd', baseline: null, equal: false }]], `(a) no baseline row: ${JSON.stringify(lacking)}`);
      const noDigest = baselineVerdict([row(undefined)], [row('d')], params);
      same([noDigest.verdict, noDigest.reasons], ['incomplete', [`no result digest for ${key} (now)`]], '(b) a new row without a result digest');
      const noBase = baselineVerdict([row('d')], [row(undefined)], params);
      same([noBase.verdict, noBase.reasons], ['incomplete', [`no result digest for ${key} (baseline)`]], '(b) a baseline row without a result digest');
      const censored = baselineVerdict([row('d', { status: 'censored' })], [row('d')], params);
      same([censored.verdict, censored.reasons], ['incomplete', [`no result digest for ${key} (now)`]], '(b) a row that did not complete is not read');
      const noParams = baselineVerdict([row('d')], [row('d')], [{ variant: 'v4', now: 'p', baseline: null }]);
      same([noParams.verdict, noParams.reasons], ['fail', ['no baseline parameters for v4']], '(c) the binding lacks the variant\'s parameters');
      const moved = baselineVerdict([row('d')], [row('d')], [{ variant: 'v4', now: 'p2', baseline: 'p' }]);
      same([moved.verdict, moved.reasons], ['fail', ['parameters changed v4']], 'other parameters now');
      const noCopy = baselineVerdict([row('d')], [row('d')], [{ variant: 'v4', now: null, baseline: 'p' }]);
      same([noCopy.verdict, noCopy.reasons], ['fail', ['parameters changed v4']], 'a variant without a tree copy now');
      const both = baselineVerdict([row(undefined)], [row('d')], [{ variant: 'v4', now: 'p', baseline: null }]);
      same([both.verdict, both.reasons], ['fail', ['no baseline parameters for v4', `no result digest for ${key} (now)`]], 'fail wins over incomplete, and its reasons come first');
      const empty = baselineVerdict([rowOf('v4', RECEIPT_CASE, RECEIPT_SEED, 'charge', 'd')], [row('d')], params);
      same([empty.verdict, empty.reasons, empty.rows], ['incomplete', ['no absent rows to compare'], []], 'no absent row is no vacuous pass');
    },
  },
  {
    name: 'receipt: a required pass stops the plan',
    async run() {
      await onReceiptTask(async () => {
        const failing = await receiptStep('p', PARITY_ROWS, goodResults({ over: (item) => (item.payload.mode === 'charge' ? { digest: 'x' } : {}) }));
        const common = ['receipt', '--kind', 'parity', '--task', RECEIPT_TASK, '--step', 'p', '--manifest', failing.path, '--arm', 'v4', '--label', 'frozen', '--source-label', 'x'];
        const receiptFile = evidenceDir('frozen', RECEIPT_TASK, 'p.receipt.json');
        const line = `receipt: parity fail -> ${rel(receiptFile)}\n`;
        const stopped = await runCheck([...common, '--require-pass']);
        assert(stopped.code === 2 && stopped.out === line, `a failed parity block with --require-pass: exit ${stopped.code}, ${JSON.stringify(stopped.out)}`);
        assert(existsSync(receiptFile), 'the receipt was not written before the exit');
        const written = JSON.parse(readFileSync(receiptFile, 'utf8'));
        same([written.kind, written.verdict, written.blocks.parity], ['parity', 'fail', 'fail'], 'the written receipt');
        assert(written.reasons.some((/** @type {string} */ r) => r.startsWith('parity: ') && r.includes('result digests differ between modes')), `its reasons: ${JSON.stringify(written.reasons)}`);
        assert(stopped.err.startsWith('v4-check: the parity receipt is fail ('), `the message: ${JSON.stringify(stopped.err)}`);
        const plain = await runCheck(common);
        assert(plain.code === 0 && plain.out === line, `the same without --require-pass: exit ${plain.code}, ${JSON.stringify(plain.out)}`);
        same(JSON.parse(readFileSync(receiptFile, 'utf8')).verdict, 'fail', 'the receipt of the plain run');
        // An incomplete proof stops the plan as well: one item has no end line.
        const open = await receiptStep('q', PARITY_ROWS, (item) => (item.id.endsWith(':v4:12x12-nightmare:ig-v4/parity/12x12-nightmare:record') ? undefined : goodResults()(item)));
        const incomplete = await runCheck(['receipt', '--kind', 'parity', '--task', RECEIPT_TASK, '--step', 'q', '--manifest', open.path, '--arm', 'v4', '--label', 'frozen', '--source-label', 'x', '--require-pass']);
        const partial = JSON.parse(readFileSync(evidenceDir('frozen', RECEIPT_TASK, 'q.receipt.json'), 'utf8'));
        assert(incomplete.code === 2 && partial.verdict === 'incomplete', `an incomplete proof: exit ${incomplete.code}, ${partial.verdict}`);
        same(partial.coverage.missing, [open.items.find((i) => i.id.endsWith(':v4:12x12-nightmare:ig-v4/parity/12x12-nightmare:record'))?.id], 'the item without an end line is missing');
        // A message that names the worktree's absolute path is written without it (a record refuses the path): the receipt still exists.
        const crashed = await receiptStep('e', PARITY_ROWS, (item) => (item.payload.mode === 'charge' && item.variant === 'v4' ? { outcome: 'error', message: `boom in ${ROOT}tests` } : goodResults()(item)),
          { statusOf: (item) => (item.payload.mode === 'charge' && item.variant === 'v4' ? 'error' : 'completed') });
        const errored = await runCheck(['receipt', '--kind', 'parity', '--task', RECEIPT_TASK, '--step', 'e', '--manifest', crashed.path, '--arm', 'v4', '--label', 'frozen', '--source-label', 'x', '--require-pass']);
        const errorText = readFileSync(evidenceDir('frozen', RECEIPT_TASK, 'e.receipt.json'), 'utf8');
        assert(errored.code === 2 && errorText.includes('error (boom in .') && !errorText.toLowerCase().includes(ROOT.replace(/[\\/]+$/, '').toLowerCase().replaceAll('\\', '/')), `an error message with the worktree path: exit ${errored.code}`);
        // A refused command writes nothing: no receipt and no captured input.
        const refusals = /** @type {[string[], string][]} */ ([
          [common.filter((_, i) => i < 9 || i > 10), 'v4-check: receipt needs --arm\n'],
          [common.map((a, i) => (i === 2 ? 'live-deadline' : a)), 'v4-check: receipt knows the kinds parity, p0-identity\n'],
          [common.map((a, i) => (i === 2 ? 'p0-identity' : a)), 'v4-check: a p0-identity receipt needs --baseline\n'],
          [common.map((a) => (a === 'frozen' ? 'selftest' : a)), 'v4-check: --label frozen only\n'],
          [common.filter((a) => a !== '--source-label' && a !== 'x'), 'v4-check: receipt needs --source-label\n'],
        ]);
        for (const [argv, message] of refusals) {
          const refused = await runCheck(argv.map((a) => (a === 'p' ? 'refused' : a)));
          assert(refused.code === 1 && refused.err === message && refused.out === '', `a refused command: exit ${refused.code}, ${JSON.stringify(refused.err)}`);
        }
        assert(!existsSync(evidenceDir('frozen', RECEIPT_TASK, 'refused.receipt.json')) && !existsSync(evidenceDir('frozen', RECEIPT_TASK, 'inputs', 'refused')), 'a refused command wrote a receipt or a captured input');
      });
    },
  },
  {
    name: 'receipt: each kind has its blocks',
    async run() {
      await onReceiptTask(async () => {
        // kind parity: the parity block passes, the generation case has no matched candidate replay
        const par = await receiptStep('par', [...PARITY_ROWS, ...REPLAY_ROWS], goodResults({ replays: ['calibration', 'calibration'] }));
        const run = await runCheck(['receipt', '--kind', 'parity', '--task', RECEIPT_TASK, '--step', 'par', '--manifest', par.path, '--arm', 'v4', '--label', 'frozen', '--source-label', 'x']);
        const file = evidenceDir('frozen', RECEIPT_TASK, 'par.receipt.json');
        assert(run.code === 0 && run.out === `receipt: parity incomplete -> ${rel(file)}\n`, `kind parity: exit ${run.code}, ${JSON.stringify(run.out)}`);
        const parity = JSON.parse(readFileSync(file, 'utf8'));
        same([parity.verdict, parity.blocks], ['incomplete', { parity: 'pass', replay: 'incomplete' }], 'the blocks of a parity receipt');
        same(Object.keys(parity.details), ['parity', 'replay'], 'the details of a parity receipt');
        assert(parity.reasons.length === 1 && parity.reasons[0] === 'replay: no matched candidate replay for 12x12-nightmare (v4)', `its reasons: ${JSON.stringify(parity.reasons)}`);
        // kind p0-identity: the parity block and the baseline block, no replay block and no replay item needed
        const world = await baselineWorld();
        const p0 = await receiptStep('p0', PARITY_ROWS, goodResults());
        const { receipt, path } = buildStepReceipt({ kind: 'p0-identity', task: RECEIPT_TASK, step: 'p0', manifest: p0.manifest, arm: 'v4', baseline: world.binding, baselineStep: world.baselineStep });
        same([receipt.kind, receipt.verdict, receipt.blocks, path], ['p0-identity', 'pass', { parity: 'pass', baseline: 'pass' }, rel(evidenceDir('frozen', RECEIPT_TASK, 'p0.receipt.json'))], 'a P-0 receipt');
        same([Object.keys(receipt.blocks), Object.keys(receipt.details), receipt.reasons], [['parity', 'baseline'], ['parity', 'baseline'], []], 'the blocks and the details of a P-0 receipt');
        same(receipt.details.baseline.rows.map((r) => [r.key, r.equal]), [[`v4|${RECEIPT_CASE}|${RECEIPT_SEED}|absent`, true], [`base|${RECEIPT_CASE}|${RECEIPT_SEED}|absent`, true]], 'the absent rows of the baseline block');
        same([receipt.identities.now.harnessHash, receipt.identities.baseline.harnessHash, receipt.harnessHash], [harnessInfo().harnessHash, 'old-harness', harnessInfo().harnessHash], 'the identities: the step\'s and the baseline\'s, each as stored');
        same(receipt.arms.map((a) => a.id), ['base', 'v4'], 'every observed variant is an arm');
        const tree = await ensureTree('v4');
        same(receipt.arms[1], { id: 'v4', treeId: tree.treeId, paramsHash: sha256(JSON.stringify(tree.params)) }, 'the arm v4: the stored tree id and the hash of the captured parameters');
        same([receipt.coverage.expected.length, receipt.coverage.observed.length, receipt.coverage.missing, receipt.coverage.censored], [5, 5, [], []], 'the coverage: the five items of the manifest');
        assert([world.binding, rel(join(world.step.dir, 'items.jsonl')), p0.manifest, rel(join(p0.dir, 'items.jsonl')), rel(join(p0.dir, 'state.json'))].every((p) => receipt.evidence.some((/** @type {any} */ e) => e.path === p)),
          `the evidence index: ${JSON.stringify(receipt.evidence.map((/** @type {any} */ e) => e.path))}`);
        for (const entry of receipt.evidence) {
          assert(entry.sha256 === sha256File(abs(entry.path)), `the hash of ${entry.path}`);
        }
        // a receipt of the kind parity on the rows of a P-0 pass has no replay evidence: that block is incomplete, never a pass
        const noReplay = buildStepReceipt({ kind: 'parity', task: RECEIPT_TASK, step: 'p0', manifest: p0.manifest, arm: 'v4' }).receipt;
        same([noReplay.verdict, noReplay.blocks], ['incomplete', { parity: 'pass', replay: 'incomplete' }], 'kind parity without a generation item');
      });
    },
  },
  {
    name: 'receipt: the stage-1 files keep their hashes',
    async run() {
      await onReceiptTask(async () => {
        const world = await baselineWorld();
        const guarded = [...world.files, world.receiptFile, world.bindingFile];
        const before = rawHashes(guarded);
        const p0 = await receiptStep('p0', PARITY_ROWS, goodResults());
        const { receipt } = buildStepReceipt({ kind: 'p0-identity', task: RECEIPT_TASK, step: 'p0', manifest: p0.manifest, arm: 'v4', baseline: world.binding, baselineStep: world.baselineStep });
        assert(receipt.verdict === 'pass', `the receipt: ${receipt.verdict} ${JSON.stringify(receipt.reasons)}`);
        same(rawHashes(guarded), before, 'the baseline step\'s items and state, its receipt and its binding are byte-identical afterwards');
        assert(!existsSync(evidenceDir('frozen', RECEIPT_TASK, 'inputs', 'baseline')) && !existsSync(evidenceDir('frozen', RECEIPT_TASK, 'baseline.receipt.json')), 'the receipt wrote into the baseline\'s namespace');
        same(readFileSync(world.files[0], 'utf8').split('\n').filter((l) => l !== '').length, 10, 'the baseline log has its ten lines (five items, a start and an end each)');
      });
    },
  },
  {
    name: 'accept: a parity binding from the stored identity',
    async run() {
      await onReceiptTask(async () => {
        const par = await receiptStep('par', [...PARITY_ROWS, ...REPLAY_ROWS], goodResults());
        const asArgs = (/** @type {string[]} */ ...more) => ['--task', RECEIPT_TASK, ...more, '--label', 'frozen', '--source-label', 'x'];
        const receiptFile = evidenceDir('frozen', RECEIPT_TASK, 'par.receipt.json');
        const made = await runCheck(['receipt', '--kind', 'parity', ...asArgs('--step', 'par', '--manifest', par.path, '--arm', 'v4', '--require-pass')]);
        assert(made.code === 0 && made.out === `receipt: parity pass -> ${rel(receiptFile)}\n`, `a passing parity receipt with --require-pass: exit ${made.code}, ${JSON.stringify(made.out)} ${made.err}`);
        const bindingFile = join(par.dir, 'par.accepted.json');
        const accepted = await runCheck(['accept', ...asArgs('--step', 'par', '--manifest', par.path, '--receipt', rel(receiptFile), '--binding', rel(bindingFile), '--by', 'selftest')]);
        assert(accepted.code === 0 && accepted.out.startsWith(`accepted: ${rel(receiptFile)} sha256 `) && accepted.out.endsWith(` -> ${rel(bindingFile)}\n`), `accept: exit ${accepted.code}, ${JSON.stringify(accepted.out)} ${accepted.err}`);
        const binding = JSON.parse(readFileSync(bindingFile, 'utf8'));
        same(binding.expected.coverage.expected, par.items.map((i) => i.id), 'the declared coverage is the manifest\'s ids');
        same(binding.expected.fields, { blocks: { parity: 'pass', replay: 'pass' } }, 'the fields are the two passing blocks');
        same([binding.expected.harnessHash, binding.expected.kind], [par.identity.harnessHash, 'parity'], 'the producer is the stored one');
        const v4 = await ensureTree('v4');
        same(binding.expected.arms.find((/** @type {any} */ a) => a.id === 'v4'), { id: 'v4', treeId: par.identity.treeIds.v4, paramsHash: sha256(JSON.stringify(v4.params)) }, 'the arm from the stored tree id and the captured copy');
        same(binding.params.v4, v4.params, 'the captured parameters');
        same(checkAccepted(binding, { current: [] }), { status: 'pass', reasons: [] }, 'the binding passes without a current tree');
        same(checkAccepted(binding, { current: [{ id: 'v4', treeId: v4.treeId, paramsHash: sha256(JSON.stringify(v4.params)) }] }), { status: 'pass', reasons: [] }, 'the binding passes against today\'s v4');
        same(checkAccepted(binding, { current: [{ id: 'v4', treeId: 'moved', paramsHash: sha256(JSON.stringify(v4.params)) }] }), { status: 'incomplete', reasons: ['stale arm v4'] }, 'a moved tree is stale');
        const again = await runCheck(['accept', ...asArgs('--step', 'par', '--manifest', par.path, '--receipt', rel(receiptFile), '--binding', rel(bindingFile), '--by', 'selftest')]);
        assert(again.code === 1 && again.err.includes('exists (an accepted binding is never rewritten)'), `a second acceptance: exit ${again.code}, ${JSON.stringify(again.err)}`);
        // The expectation does not come from the receipt: a receipt whose coverage lacks one manifest id, or one that names another producer, is refused.
        const original = JSON.parse(readFileSync(receiptFile, 'utf8'));
        const last = par.items.at(-1)?.id ?? '';
        const forged = (/** @type {string} */ name, /** @type {any} */ receipt) => {
          writeJson(join(par.dir, `${name}.receipt.json`), receipt);
          return runCheck(['accept', ...asArgs('--step', 'par', '--manifest', par.path, '--receipt', rel(join(par.dir, `${name}.receipt.json`)), '--binding', rel(join(par.dir, `${name}.accepted.json`)), '--by', 'selftest')]);
        };
        const gap = await forged('gap', { ...original, coverage: { ...original.coverage, expected: original.coverage.expected.slice(0, -1), observed: original.coverage.observed.slice(0, -1) } });
        assert(gap.code === 1 && gap.err === `v4-check: accept: incomplete (coverage gap ${last})\n` && !existsSync(join(par.dir, 'gap.accepted.json')), `a receipt without one manifest id: exit ${gap.code}, ${JSON.stringify(gap.err)}`);
        const producer = await forged('producer', { ...original, harnessHash: 'someone-else' });
        assert(producer.code === 1 && producer.err === 'v4-check: accept: incomplete (producer changed)\n', `another producer: exit ${producer.code}, ${JSON.stringify(producer.err)}`);
        const blocks = await forged('blocks', { ...original, blocks: { parity: 'pass', baseline: 'pass' } });
        assert(blocks.code === 1 && blocks.err.startsWith('v4-check: accept: incomplete (blocks is '), `the blocks of another kind: exit ${blocks.code}, ${JSON.stringify(blocks.err)}`);
        const failed = await forged('failed', { ...original, verdict: 'fail', reasons: ['parity: boom'] });
        assert(failed.code === 1 && failed.err === 'v4-check: accept: fail (parity: boom)\n', `a failing receipt: exit ${failed.code}, ${JSON.stringify(failed.err)}`);
        const noStep = await runCheck(['accept', ...asArgs('--receipt', rel(receiptFile), '--binding', rel(join(par.dir, 'x.accepted.json')), '--by', 'selftest')]);
        assert(noStep.code === 1 && noStep.err === 'v4-check: accept needs --step and --manifest for a parity receipt\n', `a parity receipt without --step and --manifest: exit ${noStep.code}, ${JSON.stringify(noStep.err)}`);
        // The expectation reads the step as a historical observation, through the manifest's own isV4 rule.
        /** @type {any[]} */
        const calls = [];
        const expectation = stepExpectation(RECEIPT_TASK, 'par', par.manifest, 'parity', (task, step, manifestPath, isV4, options) => {
          calls.push([task, step, rel(manifestPath), isV4('base'), isV4('v4-w760'), options]);
          return stepEvidence(task, step, manifestPath, isV4, options);
        });
        same(calls, [[RECEIPT_TASK, 'par', par.manifest, false, true, { historical: true }]], 'the step is read historically, with every variant but base in the v4 chain');
        same([expectation.harnessHash, expectation.coverage, expectation.fields], [par.identity.harnessHash, par.items.map((i) => i.id), { blocks: { parity: 'pass', replay: 'pass' } }], 'the expectation of a parity receipt');
        same(stepExpectation(RECEIPT_TASK, 'par', par.manifest, 'p0-identity').fields, { blocks: { parity: 'pass', baseline: 'pass' } }, 'the blocks of a P-0 receipt');
        // The expectation reads the captured copies: a copy of another tree is refused.
        const copy = join(evidenceDir('frozen', RECEIPT_TASK, 'inputs', 'par'), 'v4.ig-tree.json');
        writeJson(copy, { ...v4, treeId: 'other', root: undefined, built: undefined });
        assert(thrownBy(() => stepExpectation(RECEIPT_TASK, 'par', par.manifest, 'parity')) === `accept: captured tree v4 differs from the observation (${par.identity.treeIds.v4} vs other)`, 'a captured copy of another tree');
        rmSync(copy);
        assert(thrownBy(() => stepExpectation(RECEIPT_TASK, 'par', par.manifest, 'parity')) === 'accept: no captured tree metadata for v4', 'no captured copy');
        const none = await receiptStep('none', PARITY_ROWS, goodResults(), { harnessHash: 'x' });
        assert(thrownBy(() => stepExpectation(RECEIPT_TASK, 'none', none.manifest, 'parity', (task, step, manifestPath, isV4, options) => ({ ...stepEvidence(task, step, manifestPath, isV4, options), problems: ['no state p'] }))) === 'accept: no state p', 'a problem of the step');
      });
    },
  },
  {
    name: 'accept: a P-0 binding names the baseline block',
    async run() {
      await onReceiptTask(async () => {
        const world = await baselineWorld();
        const p0 = await receiptStep('p0', PARITY_ROWS, goodResults());
        const { receipt, path } = buildStepReceipt({ kind: 'p0-identity', task: RECEIPT_TASK, step: 'p0', manifest: p0.manifest, arm: 'v4', baseline: world.binding, baselineStep: world.baselineStep });
        writeJson(abs(path), receipt);
        const bindingFile = join(p0.dir, 'p0.accepted.json');
        const args = ['accept', '--task', RECEIPT_TASK, '--step', 'p0', '--manifest', p0.manifest, '--receipt', path, '--binding', rel(bindingFile), '--by', 'selftest', '--label', 'frozen', '--source-label', 'x'];
        const accepted = await runCheck(args);
        assert(accepted.code === 0, `accept: exit ${accepted.code}, ${JSON.stringify(accepted.err)}`);
        const binding = JSON.parse(readFileSync(bindingFile, 'utf8'));
        same([binding.expected.kind, binding.expected.fields, binding.expected.arms.map((/** @type {any} */ a) => a.id)], ['p0-identity', { blocks: { parity: 'pass', baseline: 'pass' } }, ['base', 'v4']], 'the P-0 binding');
        same(checkAccepted(binding, { current: [{ id: 'v4', treeId: p0.identity.treeIds.v4, paramsHash: sha256(JSON.stringify((await ensureTree('v4')).params)) }] }), { status: 'pass', reasons: [] }, 'the binding of the final trees passes for v4');
        // A receipt of the other kind does not pass a binding of this one: the kind is part of the expectation.
        writeJson(join(p0.dir, 'as-parity.receipt.json'), { ...receipt, kind: 'parity' });
        const wrong = await runCheck(['accept', '--task', RECEIPT_TASK, '--step', 'p0', '--manifest', p0.manifest, '--receipt', rel(join(p0.dir, 'as-parity.receipt.json')), '--binding', rel(join(p0.dir, 'wrong.accepted.json')), '--by', 'selftest', '--label', 'frozen', '--source-label', 'x']);
        assert(wrong.code === 1 && wrong.err.startsWith('v4-check: accept: incomplete (blocks is '), `a P-0 receipt named parity: exit ${wrong.code}, ${JSON.stringify(wrong.err)}`);
      });
    },
  },
  {
    name: 'receipt: the baseline binding and the results decide the baseline block',
    async run() {
      await onReceiptTask(async () => {
        const base = await ensureTree('base');
        const v4 = await ensureTree('v4');
        const make = async (/** @type {string} */ step, /** @type {Awaited<ReturnType<typeof baselineWorld>>} */ world, /** @type {Record<string, any>} */ over = {}, /** @type {(item: any) => any} */ resultOf = goodResults()) => {
          const created = await receiptStep(step, PARITY_ROWS, resultOf);
          return buildStepReceipt({ kind: 'p0-identity', task: RECEIPT_TASK, step, manifest: created.manifest, arm: 'v4', baseline: world.binding, baselineStep: world.baselineStep, ...over }).receipt;
        };
        // (1) another result everywhere (the parity block still holds), (2) other parameters in the binding, (3) a variant the binding lacks
        const moved = await make('moved', await baselineWorld({ name: 'b1' }), {}, goodResults({ over: () => ({ digest: 'd2' }) }));
        same([moved.verdict, moved.blocks], ['fail', { parity: 'pass', baseline: 'fail' }], '(1) the results changed');
        same(moved.reasons, [`baseline: result changed v4|${RECEIPT_CASE}|${RECEIPT_SEED}|absent`, `baseline: result changed base|${RECEIPT_CASE}|${RECEIPT_SEED}|absent`], '(1) both absent rows are named');
        const params = await make('params', await baselineWorld({ name: 'b2', params: { base: base.params, v4: { ...v4.params, U0: 99 } } }));
        same([params.verdict, params.blocks.baseline, params.reasons], ['fail', 'fail', ['baseline: parameters changed v4']], '(2) other parameters of v4 in the binding');
        const lacking = await make('lacking', await baselineWorld({ name: 'b3', params: { v4: v4.params } }));
        same([lacking.verdict, lacking.reasons], ['fail', ['baseline: no baseline parameters for base']], '(3) a variant the binding lacks');
        // (4) a baseline row that does not exist, (5) a binding whose evidence changed, (6) a binding that does not exist, (7) another arm than the observed ones
        const fewer = await make('fewer', await baselineWorld({ name: 'b4', rows: [PARITY_ROWS[0]] }));
        same([fewer.verdict, fewer.reasons], ['fail', [`baseline: no baseline for base|${RECEIPT_CASE}|${RECEIPT_SEED}|absent`]], '(4) no baseline row');
        const tampered = await baselineWorld({ name: 'b5' });
        appendFileSync(tampered.files[0], ' ');
        const stale = await make('stale', tampered);
        same([stale.verdict, stale.blocks.baseline, stale.details.baseline.rows], ['incomplete', 'incomplete', []], '(5) a baseline whose evidence changed');
        assert(stale.reasons.some((/** @type {string} */ r) => r.startsWith('baseline: baseline binding: evidence changed ')), `(5) its reason: ${JSON.stringify(stale.reasons)}`);
        const gone = await make('gone', await baselineWorld({ name: 'b6' }), { baseline: 'tests/artifacts/ig-proto/selftest/no-such-binding.json' });
        same([gone.verdict, gone.reasons], ['incomplete', ['baseline: baseline binding: missing binding tests/artifacts/ig-proto/selftest/no-such-binding.json', 'missing input tests/artifacts/ig-proto/selftest/no-such-binding.json']], '(6) no binding');
        const ghost = await make('ghost', await baselineWorld({ name: 'b7' }), { arm: 'ghost' });
        same([ghost.verdict, ghost.blocks, ghost.reasons], ['incomplete', { parity: 'pass', baseline: 'pass' }, ['arm ghost is not among the observed variants (base, v4)']], '(7) an arm that was not observed');
      });
    },
  },
  {
    name: 'receipt: the inputs are captured only when they are what the observation stored',
    async run() {
      await onReceiptTask(async () => {
        const v4 = await ensureTree('v4');
        const dir = (/** @type {string} */ step) => evidenceDir('frozen', RECEIPT_TASK, 'inputs', step);
        const identity = { treeIds: { v4: v4.treeId }, harnessHash: harnessInfo().harnessHash };
        const whole = captureStepInputs(RECEIPT_TASK, 's1', identity);
        same([Object.keys(whole.copies), whole.reasons, whole.copies.v4.treeId], [['v4'], [], v4.treeId], 'the stored tree id and harness: both copied');
        same(JSON.parse(readFileSync(join(dir('s1'), 'v4.ig-tree.json'), 'utf8')).params, v4.params, 'the copy holds the tree\'s parameters');
        same(JSON.parse(readFileSync(join(dir('s1'), 'harness.json'), 'utf8')), harnessInfo(), 'the copy of the harness metadata');
        assert(!existsSync(join(evidenceDir('frozen', RECEIPT_TASK, 'inputs'), 'v4.ig-tree.json')), 'a copy was written beside stage 1\'s flat folder');
        const stale = captureStepInputs(RECEIPT_TASK, 's2', { treeIds: { v4: 'old' }, harnessHash: 'other-harness' });
        same([stale.copies, stale.reasons], [{}, [`stale tree v4 (old vs ${v4.treeId})`, 'producer changed since the observation']], 'a stale tree and another producer: reasons, no copy');
        assert(!existsSync(join(dir('s2'), 'v4.ig-tree.json')) && !existsSync(join(dir('s2'), 'harness.json')), 'a copy was written although it is not what the observation stored');
        same(captureStepInputs(RECEIPT_TASK, 's3', { treeIds: { 'no-such-variant': 'x' }, harnessHash: 7 }).reasons, ['stale tree no-such-variant (x vs missing)', 'no producer in the stored identity'], 'a tree that is not built and no producer');
        same(captureStepInputs(RECEIPT_TASK, 's4', null), { copies: {}, reasons: [] }, 'no identity: nothing to capture');
        // through the command: a step observed by another harness is incomplete, its arm has no parameter hash
        const other = await receiptStep('other', PARITY_ROWS, goodResults(), { harnessHash: 'other-harness', treeIds: { base: 'old', v4: 'old' } });
        const receipt = buildStepReceipt({ kind: 'parity', task: RECEIPT_TASK, step: 'other', manifest: other.manifest, arm: 'v4' }).receipt;
        same([receipt.verdict, receipt.arms, receipt.harnessHash], ['incomplete', [{ id: 'base', treeId: 'old', paramsHash: null }, { id: 'v4', treeId: 'old', paramsHash: null }], 'other-harness'], 'a step of another producer and other trees');
        assert(receipt.reasons.filter((/** @type {string} */ r) => r.startsWith('stale tree v4')).length === 1 && receipt.reasons.includes('producer changed since the observation'), `its reasons: ${JSON.stringify(receipt.reasons)}`);
        assert(receipt.evidence.every((/** @type {any} */ e) => !e.path.includes('/inputs/')), `no captured copy is listed: ${JSON.stringify(receipt.evidence.map((/** @type {any} */ e) => e.path))}`);
      });
    },
  },
  {
    name: 'receipt: P-0 over a copy of the stage-1 results',
    async run() {
      // The real stage-1 observation and binding are only read: a synthetic step under the scratch task carries a copy of its
      // results, and the P-0 receipt, its binding and the plain `check-binding` run on the real baseline.
      const stage1 = ['parity', 'replay'].flatMap((step) => ['state.json', 'items.jsonl'].map((name) => artifactDir('frozen', 'V4-T04', step, name)));
      const guarded = [...stage1, evidenceDir('frozen', 'V4-T04', 'stage1.json'), evidenceDir('frozen', 'V4-T04', 'accepted-binding.json')];
      const before = rawHashes(guarded);
      const bindingPath = rel(evidenceDir('frozen', 'V4-T04', 'accepted-binding.json'));
      await onReceiptTask(async () => {
        const manifestFile = join(IG_DIR, 'plans', 'V4-T04.parity.json');
        const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
        const real = stepEvidence('V4-T04', 'parity', manifestFile, (variant) => variant !== 'base', { historical: true });
        same([real.problems, real.rows.length], [[], 23], 'the stage-1 parity observation is read historically');
        const results = new Map(real.rows.map((row) => [row.item, row.result]));
        /** @type {Record<string, string>} */
        const treeIds = {};
        for (const variant of [...new Set(/** @type {string[]} */ (manifest.rows.map((/** @type {any} */ row) => row.variant)))].sort()) {
          treeIds[variant] = (await ensureTree(variant)).treeId;
        }
        const copy = await receiptStep('real', manifest.rows, (item) => results.get(item.id.replace(/^real:/, 'parity:')), { treeIds });
        const receiptFile = evidenceDir('frozen', RECEIPT_TASK, 'real.receipt.json');
        const made = await runCheck(['receipt', '--kind', 'p0-identity', '--task', RECEIPT_TASK, '--step', 'real', '--manifest', copy.path, '--arm', 'v4', '--baseline', bindingPath, '--require-pass', '--label', 'frozen', '--source-label', 'x']);
        assert(made.code === 0 && made.out === `receipt: p0-identity pass -> ${rel(receiptFile)}\n`, `the P-0 receipt on the stage-1 results: exit ${made.code}, ${JSON.stringify(made.out)} ${made.err}`);
        const receipt = JSON.parse(readFileSync(receiptFile, 'utf8'));
        same([receipt.blocks, receipt.details.baseline.rows.length, receipt.details.baseline.rows.every((/** @type {any} */ r) => r.equal), receipt.arms.map((/** @type {any} */ a) => a.id)],
          [{ parity: 'pass', baseline: 'pass' }, 8, true, ['base', 'v4', 'v4-w095', 'v4-w380', 'v4-w760']], 'eight absent results equal, five arms');
        const stageArms = JSON.parse(readFileSync(abs(bindingPath), 'utf8')).expected.arms;
        assert(stageArms.every((/** @type {any} */ a) => receipt.arms.find((/** @type {any} */ b) => b.id === a.id)?.paramsHash === a.paramsHash), 'every parameter hash equals the stage-1 binding\'s');
        assert(stageArms.some((/** @type {any} */ a) => receipt.arms.find((/** @type {any} */ b) => b.id === a.id)?.treeId !== a.treeId), 'the tree ids moved since stage 1 (the parameters did not)');
        const bound = join(copy.dir, 'real.accepted.json');
        const accepted = await runCheck(['accept', '--task', RECEIPT_TASK, '--step', 'real', '--manifest', copy.path, '--receipt', rel(receiptFile), '--binding', rel(bound), '--by', 'selftest', '--label', 'frozen', '--source-label', 'x']);
        assert(accepted.code === 0, `accept: exit ${accepted.code}, ${JSON.stringify(accepted.err)}`);
        const current = await runCheck(['check-binding', '--binding', rel(bound), '--current', 'v4,base', '--label', 'frozen', '--source-label', 'x']);
        assert(current.code === 0 && current.out === 'binding: pass\n', `the binding of the final trees for v4 and base: exit ${current.code}, ${JSON.stringify(current.out)}`);
        const plain = await runCheck(['check-binding', '--binding', bindingPath, '--label', 'frozen', '--source-label', 'x']);
        assert(plain.code === 0 && plain.out === 'binding: pass\n', `the plain stage-1 binding: exit ${plain.code}, ${JSON.stringify(plain.out)}`);
      });
      same(rawHashes(guarded), before, 'the stage-1 states, logs, receipt and binding are byte-identical afterwards');
    },
  },
  {
    name: 'receipt: a passing receipt is written once',
    async run() {
      await onReceiptTask(async () => {
        const par = await receiptStep('par', [...PARITY_ROWS, ...REPLAY_ROWS], goodResults());
        const argv = ['receipt', '--kind', 'parity', '--task', RECEIPT_TASK, '--step', 'par', '--manifest', par.path, '--arm', 'v4', '--label', 'frozen', '--source-label', 'x'];
        const file = evidenceDir('frozen', RECEIPT_TASK, 'par.receipt.json');
        const inputs = evidenceDir('frozen', RECEIPT_TASK, 'inputs', 'par');
        const first = await runCheck(argv);
        assert(first.code === 0 && first.out === `receipt: parity pass -> ${rel(file)}\n`, `a passing receipt: exit ${first.code}, ${JSON.stringify(first.out)} ${first.err}`);
        // a captured input that a second run would rewrite is marked, and every captured file is hashed
        writeFileSync(join(inputs, 'harness.json'), 'marker');
        const captured = () => readdirSync(inputs).sort().map((name) => [name, sha256File(join(inputs, name), { raw: true })]);
        const [receiptHash, capturedBefore] = [sha256File(file, { raw: true }), captured()];
        const again = await runCheck(argv);
        assert(again.code === 1 && again.out === '' && again.err === `v4-check: receipt ${rel(file)} exists (a passing receipt is never rewritten)\n`, `a second run: exit ${again.code}, ${JSON.stringify(again.err)}`);
        const required = await runCheck([...argv, '--require-pass']);
        assert(required.code === 1 && required.err === again.err, `a second run with --require-pass: exit ${required.code}, ${JSON.stringify(required.err)}`);
        same([sha256File(file, { raw: true }), captured(), readFileSync(join(inputs, 'harness.json'), 'utf8')], [receiptHash, capturedBefore, 'marker'], 'a refusal wrote nothing: the receipt and every captured input are as they were');
        // a receipt that does not parse as an object with a string verdict is refused as unreadable, whatever it holds
        for (const text of ['{', '[]', 'null', '{"verdict":1}', '{"kind":"parity"}']) {
          writeFileSync(file, text);
          const refused = await runCheck(argv);
          assert(refused.code === 1 && refused.out === '' && refused.err === `v4-check: an unreadable receipt exists: ${rel(file)}\n`, `a receipt holding ${text}: exit ${refused.code}, ${JSON.stringify(refused.err)}`);
          same([readFileSync(file, 'utf8'), captured()], [text, capturedBefore], `a refusal over ${text} wrote nothing`);
        }
        // a receipt of another verdict is replaced (case 4 shows a fail receipt replaced; here an incomplete one)
        writeJson(file, { verdict: 'incomplete' });
        const replaced = await runCheck(argv);
        assert(replaced.code === 0 && JSON.parse(readFileSync(file, 'utf8')).verdict === 'pass', `an incomplete receipt is replaced: exit ${replaced.code}, ${JSON.stringify(replaced.err)}`);
      });
    },
  },
  {
    name: 'activate: the default initial collection',
    async run() {
      const { m, expansion, d, controls, record, build } = await collectionKit();
      const cell = '24x24-hell-1';
      // Two valid requests reach ten, a third is no valid measurement and two more valid ones stop short: three valid requests are not there.
      const pilots = { [cell]: [await matrixRun(cell, 0), await matrixRun(cell, 1), await matrixRun(cell, 2, 10, { measurementValid: false }), await matrixRun(cell, 3, 6), await matrixRun(cell, 4, 6)] };
      const rec = record(pilots, []);
      same([rec.format, rec.version, rec.collection], ['ig-v4-activation', 1, 'initial'], 'the record\'s identity');
      same(rec.conditional, [
        { cell: '24x24-hell-1', activated: false, valid: 4, reachingTen: 2, pilotRuns: 5 },
        { cell: '14x14-hell-1', activated: false, valid: 0, reachingTen: 0, pilotRuns: 0 },
      ], 'two valid requests reach ten: no conditional board is activated, the board without a pilot has no runs');
      same(rec.optional, { approved: [], notApproved: ['S4-6'] }, 'without approval the optional item is not approved');
      const initial = expansion.groups.filter((/** @type {any} */ g) => g.collection === 'initial' && !g.comparator);
      same(rec.groups, initial.map((/** @type {any} */ g) => ({ key: m.groupKey(g), origin: 'initial' })), 'the groups are every non-comparator group of collection initial, in the matrix\'s order');
      assert(rec.groups.every(({ key }) => !/\|(factor|second)-|24x24-hell-1|14x14-hell-1/.test(key)), 'no group of a conditional board or of S4-6');
      // Counted from the data's cell lists, not from the groups: both twins on the headline and Hell 1 cells, the twins and today's arm on the controls, two arms on the Master cells.
      const expected = (d.cells.failingNightmare.length + d.cells.hell1Validated.length) * 2 * 20 + controls.length * 3 * 20 + d.cells.master.length * 2 * 5;
      same([rec.declaredRows.length, new Set(rec.declaredRows).size], [expected, expected], `${expected} distinct declared rows`);
      const repOf = (/** @type {string} */ row) => Number(row.slice(row.lastIndexOf('~') + 1));
      assert(rec.declaredRows.every((row) => repOf(row) >= 20 && repOf(row) <= 39), 'every declared rep is from the validation cohort: none from 40 to 59, no pilot rep');
      assert(rec.declaredRows.every((row) => !row.startsWith('shipped-uncapped/')) && rec.declaredRows.includes('fr-frozen/14x14-nightmare~20') && rec.declaredRows.includes('log-link/3x29-master~24'), 'rows are <arm>/<cell>~<rep>');
      same(rec.comparatorCells, [...d.cells.failingNightmare, ...d.cells.hell1Validated, ...controls].map((c) => ({ cell: c, from: 20, to: 39, rows: 20, shard: `val-${c}` })),
        'the comparator cells are exactly the cells of S4-1, S4-2 and S4-3 with reps 20 to 39');
      const { plan, template } = build(rec);
      assert(plan.steps.every((/** @type {any} */ s) => s.node.every((/** @type {string} */ w) => !w.includes('shipped-uncapped'))), 'no node of the plan names shipped-uncapped');
      const shards = rowStepsOf(plan).map((/** @type {any} */ s) => argAfter(s, '--shard'));
      same(shards.length, initial.length, 'one row step per group');
      assert(shards.every((s) => !s.startsWith('factor-') && !s.startsWith('second-')), 'no shard factor- or second-');
      assert(!plan.steps.some((/** @type {any} */ s) => s.node.some((/** @type {string} */ w) => /^(24x24|14x14)-hell-1:/.test(w) || /^V4-S4XC?$/.test(w))), 'no conditional board and no second-validation task in the plan');
      same(template.cells.map((/** @type {any} */ c) => ({ cell: c.cell, from: c.from, to: c.to, rows: c.rows, shard: c.shard })), rec.comparatorCells, 'the template lists exactly the comparator cells');
      assert(template.cells.every((/** @type {any} */ c) => c.rowLimitS === 260 && isDeepStrictEqual(c.candidates, ['fr-frozen-uncapped', 'fr-frozen-none-uncapped']) && c.price.type === 'rows' && c.price.rows === 20 && c.price.rowLimitS === 260 && c.price.rowS > 0),
        'each template cell: the row limit 260, the two uncapped candidates and the price of its rows');
      same([template.task, template.generatedBy, template.template, template.runnable, template.activationSha256], ['V4-S4C', 'manifest.mjs activate', true, false, 'c'.repeat(64)], 'the template\'s header');
      same([plan.task, plan.generatedBy, plan.runnable, plan.blockedBy, plan.optionalMinutes], ['V4-S4', 'manifest.mjs activate', true, [], 0], 'the plan\'s header');
    },
  },
  {
    name: 'activate: an activated conditional board',
    async run() {
      const { m, expansion, record, build } = await collectionKit();
      const cell = '24x24-hell-1';
      const base = record();
      const rec = record({ [cell]: await pilotRuns(cell, 3, 2), '14x14-hell-1': [] });
      same(rec.conditional, [
        { cell: '24x24-hell-1', activated: true, valid: 5, reachingTen: 3, pilotRuns: 5 },
        { cell: '14x14-hell-1', activated: false, valid: 0, reachingTen: 0, pilotRuns: 0 },
      ], 'three valid requests reach ten and two are valid and short: 24x24 is activated, 14x14 is not; both are listed with their counts');
      const twins = expansion.groups.filter((/** @type {any} */ g) => g.collection === 'conditional' && g.cell === cell && !g.comparator);
      same(twins.map((/** @type {any} */ g) => [g.task, g.arm, g.shard]), [['V4-S4', 'fr-frozen', `val-${cell}`], ['V4-S4', 'fr-frozen-none', `val-${cell}`]], 'the matrix has its twins');
      same(rec.groups.filter((g) => g.origin === 'conditional'), twins.map((/** @type {any} */ g) => ({ key: m.groupKey(g), origin: 'conditional' })), 'the record lists its twins with their origin');
      same(rec.declaredRows.slice(base.declaredRows.length), ['fr-frozen', 'fr-frozen-none'].flatMap((arm) => Array.from({ length: 20 }, (_, i) => `${arm}/${cell}~${20 + i}`)), 'its 40 rows follow those of the initial collection');
      same(rec.comparatorCells.slice(base.comparatorCells.length), [{ cell, from: 20, to: 39, rows: 20, shard: `val-${cell}` }], 'its comparator cell follows the initial ones');
      const { plan, template } = build(rec);
      const mine = rowStepsOf(plan).filter((/** @type {any} */ s) => String(argAfter(s, '--cases')).startsWith(`${cell}:`));
      same(mine.map((/** @type {any} */ s) => [argAfter(s, '--task'), argAfter(s, '--arm'), argAfter(s, '--shard'), argAfter(s, '--cases'), argAfter(s, '--row-limit-s'), s.state]), [
        ['V4-S4', 'fr-frozen', `val-${cell}`, `${cell}:20-39`, '130', `V4-S4\\fr-frozen\\val-${cell}\\state.json`],
        ['V4-S4', 'fr-frozen-none', `val-${cell}`, `${cell}:20-39`, '130', `V4-S4\\fr-frozen-none\\val-${cell}\\state.json`],
      ], 'its twins are in the plan under V4-S4, with the live-deadline row limit');
      same(template.cells.at(-1).cell, cell, 'its comparator cell is in the template');
      same(template.cells.length, base.comparatorCells.length + 1, 'and only that one is added');
      // The other board stays out of every part of the activation.
      const other = '14x14-hell-1';
      assert(!rec.groups.some(({ key }) => key.includes(other)) && !rec.declaredRows.some((row) => row.includes(other)) && !rec.comparatorCells.some((c) => c.cell === other)
        && !template.cells.some((/** @type {any} */ c) => c.cell === other) && !plan.steps.some((/** @type {any} */ s) => s.node.some((/** @type {string} */ w) => w.startsWith(`${other}:`))), '14x14-hell-1 is absent');
      assert(thrownBy(() => record({ '12x12-nightmare': [] })).includes('12x12-nightmare is not a conditional board'), 'a pilot of a board that is not conditional is refused');
      assert(thrownBy(() => record({ [cell]: /** @type {any} */ ('x') })).includes('must be a list of run records'), 'pilot runs that are not a list are refused');
    },
  },
  {
    name: 'activate: the selected scope is required',
    async run() {
      const { m, expansion, record, build } = await collectionKit();
      const cell = '24x24-hell-1';
      const rec = record({ [cell]: await pilotRuns(cell, 3, 2) }, ['S4-6']);
      const asked = expansion.groups.filter((/** @type {any} */ g) => !g.comparator && ((g.collection === 'conditional' && g.cell === cell) || g.collection === 'optional'));
      assert(asked.length === 7 && asked.every((/** @type {any} */ g) => g.optional === true), 'the matrix marks the two twins of 24x24 and the five factor groups optional: a default run would skip them');
      const { plan } = build(rec);
      const rows = rowStepsOf(plan);
      assert(rows.length === rec.groups.length && rows.every((/** @type {any} */ s) => s.optional === false), 'every row step of the plan is required');
      same(plan.optionalMinutes, 0, 'no optional minutes');
      // run-task.ps1 selects `-not $_.optional`: exactly these steps run by default and are priced by the allocation.
      const selected = plan.steps.filter((/** @type {any} */ s) => !s.optional);
      same(selected.length, plan.steps.length, 'a default run selects every step of the plan');
      const keys = rowsOfSteps(rows);
      same([keys.length, new Set(keys).size], [rec.declaredRows.length, rec.declaredRows.length], 'one row per declared row');
      same([...keys].sort(), [...rec.declaredRows].sort(), 'the rows the default rule selects are exactly declaredRows');
      const extra = rows.filter((/** @type {any} */ s) => /^(fr-frozen|fr-frozen-none)-val-24x24-hell-1$/.test(s.id.slice(5)) || argAfter(s, '--shard').startsWith('factor-'));
      same(extra.map((/** @type {any} */ s) => s.id).sort(), [
        'rows-fr-frozen-none-val-24x24-hell-1', 'rows-fr-frozen-val-24x24-hell-1',
        ...['14x14', '15x15b10', '12x12', '16x16', '15x20'].map((c) => `rows-log-link-factor-${c}-nightmare`),
      ].sort(), 'the steps of the 24x24 twins and of the five factor groups');
      assert(extra.every((/** @type {any} */ s) => s.locked && s.projectS > 0 && s.invocations > 0), 'they are priced locked steps');
      const without = build(record());
      assert(Math.abs(requiredSeconds(plan.steps) - requiredSeconds(without.plan.steps) - requiredSeconds(extra)) < 1e-6, 'the allocation includes exactly those steps');
      same(plan.allocationMinutes, Math.ceil(requiredSeconds(plan.steps) / 60), 'allocationMinutes is the ceiling of the required locked steps');
      assert(plan.allocationMinutes > without.plan.allocationMinutes, 'and it is larger than the default collection\'s');
      same(rec.groups.filter((g) => g.origin === 'conditional').length, 2, 'the record keeps the origin conditional');
      same(rec.groups.filter((g) => g.origin === 'optional').map((g) => g.key), expansion.groups.filter((/** @type {any} */ g) => g.collection === 'optional').map((/** @type {any} */ g) => m.groupKey(g)), 'and the origin optional');
      same(rec.groups.filter((g) => g.origin === 'initial').length, 76, 'and the origin initial');
    },
  },
  {
    name: 'activate: optional items only with approval',
    async run() {
      const { m, expansion, d, record, build } = await collectionKit();
      const factor = expansion.groups.filter((/** @type {any} */ g) => g.collection === 'optional');
      same(factor.map((/** @type {any} */ g) => [g.arm, g.shard, g.from, g.to]), d.cells.failingNightmare.map((/** @type {string} */ c) => ['log-link', `factor-${c}`, 20, 24]), 'S4-6: today\'s arm on the five failing cells, reps 20 to 24');
      const withIt = record({}, ['S4-6']);
      same(withIt.optional, { approved: ['S4-6'], notApproved: [] }, 'approved: S4-6');
      same(withIt.groups.filter((g) => g.origin === 'optional').map((g) => g.key), factor.map((/** @type {any} */ g) => m.groupKey(g)), 'its groups are in the record');
      const planWith = build(withIt).plan;
      same(rowStepsOf(planWith).filter((/** @type {any} */ s) => String(argAfter(s, '--shard')).startsWith('factor-')).map((/** @type {any} */ s) => [argAfter(s, '--arm'), argAfter(s, '--shard'), argAfter(s, '--cases'), argAfter(s, '--variant')]),
        d.cells.failingNightmare.map((/** @type {string} */ c) => ['log-link', `factor-${c}`, `${c}:20-24`, 'log-link']), 'the plan runs the log-link groups of shard factor-<cell>, reps 20 to 24');
      same(withIt.declaredRows.filter((row) => row.startsWith('log-link/') && d.cells.failingNightmare.some((/** @type {string} */ c) => row.startsWith(`log-link/${c}~`))).length, 25, 'and the record declares their 25 rows');
      const without = record({}, []);
      same(without.optional, { approved: [], notApproved: ['S4-6'] }, 'not approved without approval');
      assert(!without.groups.some((g) => g.origin === 'optional' || g.key.includes('|factor-')) && !without.declaredRows.some((row) => d.cells.failingNightmare.some((/** @type {string} */ c) => row.startsWith(`log-link/${c}~`))), 'no factor group and no factor row');
      assert(!rowStepsOf(build(without).plan).some((/** @type {any} */ s) => String(argAfter(s, '--shard')).startsWith('factor-')), 'and no factor step in the plan');
      // Only S4-6 can be approved: the conditional boards follow their pilots, the second validation is not activated here.
      for (const id of ['S4-5', 'S4-7', 'S4-1', 'nope']) {
        assert(thrownBy(() => record({}, [id])).includes('must be a list of optional items (S4-6)'), `${id} cannot be approved`);
      }
      assert(thrownBy(() => record({}, ['S4-6', 'S4-6'])).includes('approved twice'), 'an item cannot be approved twice');
    },
  },
  {
    name: 'activate: never rewritten',
    async run() {
      const { m, d, controls } = await collectionKit();
      const cell = '24x24-hell-1';
      await onCollections(async (dir) => {
        const other = '14x14-hell-1';
        const { rowsOf, after, world, go, written, parse } = await activateWorld(dir);

        // The first activation: 24x24's pilot activates it (the rows after rep 4 are not read), 14x14's has two valid requests reaching ten, a
        // pilot of a board that is not conditional is not read; S4-6 is not approved.
        const paths = await world('first', {
          [cell]: [...await rowsOf(cell, 3, 2), ...await after(cell)], [other]: await rowsOf(other, 2, 1), '26x26-hell-1': await rowsOf('26x26-hell-1', 5, 0),
        });
        const first = await go(paths);
        const groups = (d.cells.failingNightmare.length + d.cells.hell1Validated.length) * 2 + controls.length * 3 + d.cells.master.length * 2 + 2;
        const rows = (d.cells.failingNightmare.length + d.cells.hell1Validated.length) * 2 * 20 + controls.length * 3 * 20 + d.cells.master.length * 2 * 5 + 2 * 20;
        const comparators = d.cells.failingNightmare.length + d.cells.hell1Validated.length + controls.length + 1;
        const record = parse(paths.activation);
        const plan = parse(paths.plan);
        const template = parse(paths.template);
        same([first.code, first.err.split('\n').filter((l) => !l.startsWith('activate: wrote ')).join('')], [0, ''], `the first activation: exit ${first.code}, ${first.err}`);
        same(first.out.split('\n'), [
          `activation: ${groups} groups, ${rows} declared rows, ${comparators} comparator cells; conditional ${cell}: true (3 of 5 valid); conditional ${other}: false (2 of 3 valid); optional approved none`,
          `V4-S4: allocation ${plan.allocationMinutes} min, optional 0 min; ask the owner with approval --plan V4-S4 before any run`, '',
        ], 'the printout: the counts, the conditional boards, the optional items, the allocation and the approval line');
        same(first.err.split('\n').filter((l) => l !== ''), [paths.activation, paths.plan, paths.template].map((f) => `activate: wrote ${rel(f)}`), 'the files written are noted on stderr');
        // The record is the pure activation over the same expansion, with the epoch hashes of the files and a time.
        const { expansion } = await collectionKit();
        const { createdAt, ...rest } = record;
        assert(isoTime(createdAt), `createdAt ${createdAt}`);
        same(rest, m.activation(expansion, { pilots: { [cell]: (await rowsOf(cell, 3, 2)).map((r) => r.run), [other]: (await rowsOf(other, 2, 1)).map((r) => r.run) }, approvedOptional: [], epoch: rest.epoch }), 'the record is `activation` of the pilots it read');
        same(rest.epoch, {
          data: { path: 'tools/ig-proto/data/frozen-round-v1.json', sha256: sha256File(paths.data) },
          freeze: { path: rel(paths.freeze), sha256: sha256File(paths.freeze) },
          universe: { path: 'tools/ig-proto/plans/V4-S4.universe.json', sha256: sha256File(paths.universe) },
        }, 'the epoch: the SHA-256 of the data, the freeze file and the universe');
        same([plan.task, plan.generatedBy, plan.runnable, plan.steps.length], ['V4-S4', 'manifest.mjs activate', true, 3 + 12 + groups + 3 + 4], 'the plan');
        same([template.task, template.generatedBy, template.activationSha256, template.cells.length], ['V4-S4C', 'manifest.mjs activate', sha256File(paths.activation), comparators], 'the template carries the SHA-256 of the record');
        same(plan.prerequisites.find((/** @type {any} */ p) => p.type === 'file' && p.path.endsWith('activation.json')).path, rel(paths.activation), 'the plan requires the record it was written for');
        // A second activation on the same paths is refused and rewrites nothing.
        const before = rawHashes([paths.activation, paths.plan, paths.template]);
        const second = await go(paths);
        same([second.code, second.out, second.err], [1, '', 'manifest: activation exists: an activation is never rewritten\n'], `a second activation: exit ${second.code}, ${JSON.stringify(second.err)}`);
        same(rawHashes([paths.activation, paths.plan, paths.template]), before, 'the record, the plan and the template are byte-equal to after the first');
        const withOther = await go(paths, '--approve-optional', 'S4-6');
        same([withOther.code, rawHashes([paths.activation, paths.plan, paths.template])], [1, before], 'even with other options');

        // The refusals write nothing.
        const second2 = await world('second');
        const wrongCollection = await captureOutput(() => m.activateCommand(['--collection', 'second', '--label', 'frozen', '--source-label', 'x'], second2));
        same([wrongCollection.code, wrongCollection.out, wrongCollection.err, written(second2)], [1, '', 'manifest: only the initial collection is activated here; the second is N-V4-04\'s\n', []], 'the second collection is not activated here');
        const noCollection = await captureOutput(() => m.activateCommand(['--label', 'frozen', '--source-label', 'x'], second2));
        same([noCollection.code, written(second2)], [1, []], 'a collection is required');
        const wrongLabel = await captureOutput(() => m.activateCommand(['--collection', 'initial', '--label', 'selftest', '--source-label', 'x'], second2));
        same([wrongLabel.code, wrongLabel.err, written(second2)], [1, 'manifest: --label frozen only\n', []], 'the frozen label is required');
        const noFreeze = await go({ ...second2, freeze: join(dir, 'second', 'none.json') });
        assert(noFreeze.code === 1 && noFreeze.err.startsWith('manifest: no freeze file ') && written(second2).length === 0, `a missing freeze file: ${noFreeze.code} ${noFreeze.err}`);
        const noUniverse = await go({ ...second2, universe: join(dir, 'second', 'none.json') });
        assert(noUniverse.code === 1 && noUniverse.err.startsWith('manifest: no universe ') && written(second2).length === 0, `a missing universe: ${noUniverse.code} ${noUniverse.err}`);
        writeJson(second2.plan, { task: 'V4-S4', generatedBy: 'by hand' });
        const planExists = await go(second2);
        assert(planExists.code === 1 && planExists.err.includes('exists: a plan is never rewritten') && !existsSync(second2.activation) && !existsSync(second2.template), `an existing plan: ${planExists.code} ${planExists.err}`);
        rmSync(second2.plan);
        const unknownItem = await go(second2, '--approve-optional', 'S4-5');
        assert(unknownItem.code === 1 && unknownItem.err.includes('must be a list of optional items (S4-6)') && written(second2).length === 0, `an item that cannot be approved: ${unknownItem.code} ${unknownItem.err}`);
        const duplicate = await world('duplicate', { [cell]: [...await rowsOf(cell, 3, 2), ...await rowsOf(cell, 3, 2)] });
        const twice = await go(duplicate);
        assert(twice.code === 1 && twice.err.includes(`the pilot row ${cell}~0 is published twice`) && written(duplicate).length === 0, `a pilot row published twice: ${twice.code} ${twice.err}`);

        // With the owner's approval of S4-6, no pilot: nothing is activated, and the plan runs the five factor groups.
        const approved = await world('approved');
        const done = await go(approved, '--approve-optional', 'S4-6');
        const approvedPlan = parse(approved.plan);
        same([done.code, done.out.split('\n')[0].endsWith('; conditional 24x24-hell-1: false (0 of 0 valid); conditional 14x14-hell-1: false (0 of 0 valid); optional approved S4-6')], [0, true], `an activation with S4-6: exit ${done.code}, ${done.err}`);
        same(done.err.split('\n').filter((l) => l.startsWith('activate: note: ')), [cell, other].map((c) => `activate: note: no pilot run of ${c} is published under ${rel(approved.pilots)}; the board is not activated`),
          'a board without a published pilot run is noted on stderr, never silently');
        same(rowStepsOf(approvedPlan).filter((/** @type {any} */ s) => s.id.includes('-factor-')).length, 5, 'the plan has the five factor row steps, required');
        assert(rowStepsOf(approvedPlan).every((/** @type {any} */ s) => s.optional === false) && approvedPlan.optionalMinutes === 0, 'all required');
      });
    },
  },
  {
    name: 'activate: a complete producer chain',
    async run() {
      const { m, record, build } = await collectionKit();
      const rec = record();
      const { plan } = build(rec);
      const declared = new Set(plan.prerequisites.filter((/** @type {any} */ p) => p.type === 'file' || p.type === 'accepted').map((/** @type {any} */ p) => p.path));
      /** @type {Set<string>} */
      const produced = new Set();
      /** @type {string[]} */
      const ids = [];
      let consumed = 0;
      for (const step of plan.steps) {
        for (const path of step.consumes) {
          assert(produced.has(path) || declared.has(path), `${step.id} consumes ${path}, which no earlier step produces and no prerequisite declares`);
          consumed += 1;
        }
        for (const dep of step.dependsOn) {
          assert(ids.includes(dep), `${step.id} depends on ${dep}, which is not an earlier step`);
        }
        step.produces.forEach((/** @type {string} */ p) => produced.add(p));
        ids.push(step.id);
      }
      assert(consumed > 100, `${consumed} consumed paths checked`);
      same(new Set(ids).size, ids.length, 'every step id is distinct');
      // Only real variants: today's arm and the four stage-4 arms, in the argv of every step.
      const allowed = ['log-link', 'fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'];
      const named = plan.steps.flatMap((/** @type {any} */ s) => [argAfter(s, '--variant'), argAfter(s, '--arm'), ...(s.node[0].endsWith('tree.mjs') ? s.node.slice(2) : [])].filter((v) => v !== undefined));
      assert(named.length > 100 && named.every((/** @type {string} */ v) => allowed.includes(v)), `variants named: ${[...new Set(named)].join(', ')}`);
      same(plan.steps.find((/** @type {any} */ s) => s.id === 'trees').node, ['tools\\ig-proto\\lib\\tree.mjs', 'build', ...allowed], 'trees builds exactly those');
      same(new Set(named.filter((/** @type {string} */ v) => v.endsWith('-uncapped'))).size, 2, 'the uncapped arms are named only by their parity passes');
      const firstRows = ids.findIndex((id) => id.startsWith('rows-'));
      const proofs = ids.flatMap((id, i) => (/^(parity|receipt|accept)-/.test(id) ? [i] : []));
      same([proofs.length, proofs.every((i) => i < firstRows)], [12, true], 'the 12 parity, receipt and accept steps precede the first rows step');
      same(ids.slice(0, 3), ['prerequisites', 'firewall-snapshot', 'trees'], 'the gate, the snapshot and the trees come first');
      same(ids.slice(3, 15), allowed.slice(1).flatMap((a) => [`parity-${a}`, `receipt-${a}`, `accept-${a}`]), 'the proofs of the four stage-4 arms follow, in order');
      same(ids.slice(-7), ['publish-fr-frozen', 'publish-fr-frozen-none', 'publish-log-link', 'verdict-input', 'verdicts', 'resolve-comparators', 'firewall-check'], 'the publishes, the verdict steps and the firewall check come last');
      for (const id of allowed.slice(1)) {
        const receipt = plan.steps.find((/** @type {any} */ s) => s.id === `receipt-${id}`);
        const accept = plan.steps.find((/** @type {any} */ s) => s.id === `accept-${id}`);
        same([receipt.node.includes('--require-pass'), argAfter(receipt, '--task'), argAfter(receipt, '--arm'), argAfter(accept, '--by'), argAfter(accept, '--binding')],
          [true, 'V4-S4P', id, 'V4-S4', `docs/improve-generating/evidence/frozen/V4-S4P/parity-${id}.accepted.json`], `${id}: a required receipt, then its acceptance under V4-S4P`);
      }
      const states = plan.steps.filter((/** @type {any} */ s) => s.locked).map((/** @type {any} */ s) => s.state);
      same(new Set(states).size, states.length, 'no two locked steps share a state path');
      assert(plan.steps.filter((/** @type {any} */ s) => s.locked).every((/** @type {any} */ s) => s.repeatUntilDone === true && typeof s.minHorizonS === 'number'
        && s.minHorizonS === (s.price.type === 'rows' ? s.price.rowLimitS + 12 : 270) && /^V4-S4P?\\/.test(s.state) && s.produces.includes(`tests/artifacts/ig-proto/frozen/${s.state.replaceAll('\\', '/')}`)),
      'every locked step repeats until done, has its state, its minimum horizon and produces its state file');
      for (const s of plan.steps.filter((/** @type {any} */ x) => x.locked)) {
        same([s.projectS, s.invocations], [m.stepPrice(s.price).projectS, m.stepPrice(s.price).invocations], `${s.id}: the price of its own input`);
      }
      for (const step of plan.steps) {
        assert(step.node.every((/** @type {string} */ w) => typeof w === 'string' && w !== '' && !/[<>]/.test(w) && !w.includes('shipped-uncapped')), `${step.id}: an unresolved word`);
        assert(existsSync(abs(step.node[0].replaceAll('\\', '/'))), `${step.id}: the script ${step.node[0]} does not exist`);
      }
      // The three steps after the rows (T11f runs the first and the last of them): complete argv, as T11f and T09e read them.
      const step = (/** @type {string} */ id) => plan.steps.find((/** @type {any} */ s) => s.id === id);
      const manifestFile = 'tools\\ig-proto\\plans\\verdicts\\V4-S4.verdict-manifest.json';
      const activationFile = 'docs/improve-generating/evidence/frozen/V4-S4/activation.json';
      const selection = 'docs/improve-generating/evidence/frozen/V4-S4/class-selection.json';
      same(step('verdict-input').node, ['tools\\ig-proto\\manifest.mjs', 'verdict-input', '--purpose', 'selection', '--activation', activationFile, '--out', manifestFile], 'verdict-input');
      same(step('verdicts').node, ['tools\\ig-proto\\verdicts.mjs', '--manifest', manifestFile], 'verdicts');
      same([step('verdicts').produces, step('verdicts').dependsOn], [[selection], ['verdict-input']], 'verdicts produces the class-selection receipt');
      same(step('resolve-comparators').node, ['tools\\ig-proto\\manifest.mjs', 'resolve-comparators', '--selection', selection, '--activation', activationFile, '--out', 'tools\\ig-proto\\plans\\V4-S4C.json'], 'resolve-comparators');
      same(step('resolve-comparators').dependsOn, ['verdicts'], 'it follows the verdicts');
      same([...step('verdict-input').dependsOn].sort(), [...plan.steps.filter((/** @type {any} */ s) => s.id.startsWith('publish-') || s.id.startsWith('accept-')).map((/** @type {any} */ s) => s.id)].sort(), 'verdict-input follows every publish and accept step');
      same(plan.steps.filter((/** @type {any} */ s) => !s.locked).every((/** @type {any} */ s) => s.exitOn === 'a nonzero exit stops the plan (run-task.ps1)'), true, 'unlocked steps stop the plan on a nonzero exit');
      // The prerequisites: the four variants, the freeze file and the record, and the three accepted bindings; the gate reads every entry.
      same(plan.prerequisites, [
        ...allowed.slice(1).map((id) => ({ type: 'variant', id })),
        { type: 'file', path: rec.epoch.freeze.path },
        { type: 'file', path: activationFile },
        { type: 'accepted', path: 'docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json', current: [] },
        { type: 'accepted', path: 'docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json', current: ['v4'] },
        { type: 'accepted', path: 'docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json', current: ['fr-frozen', 'fr-frozen-none'], kind: 'live-deadline', fields: 'LIVE_DEADLINE_FIELDS' },
      ], 'the prerequisites');
      const blocked = await m.checkPrerequisites(plan.prerequisites, {
        variants: ['log-link'], exists: () => false, readJson: () => ({}), currentOf: async (/** @type {string} */ id) => ({ id, treeId: 't', paramsHash: 'p' }),
      });
      same([blocked.status, blocked.reasons], ['blocked', [
        'variant fr-frozen missing', 'variant fr-frozen-none missing', 'variant fr-frozen-uncapped missing', 'variant fr-frozen-none-uncapped missing',
        `missing file ${rec.epoch.freeze.path}`, `missing file ${activationFile}`,
        'missing binding docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json', 'missing binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json',
        'missing binding docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json',
      ]], 'the gate understands every prerequisite and blocks the plan until each exists');
    },
  },
  {
    name: 'activate: the inputs are checked',
    async run() {
      const { m, expansion, record, build } = await collectionKit();
      const ref = { path: 'x', sha256: 'a'.repeat(64) };
      const epoch = { data: ref, freeze: ref, universe: ref };
      assert(thrownBy(() => m.activation({ groups: [] }, { pilots: {}, approvedOptional: [], epoch })).includes('needs the expansion'), 'an expansion without items');
      assert(thrownBy(() => m.activation(expansion, { pilots: [], approvedOptional: [], epoch })).includes('pilots must map'), 'pilots as a list');
      assert(thrownBy(() => m.activation(expansion, { pilots: {}, approvedOptional: 'S4-6', epoch })).includes('approvedOptional must be a list'), 'approvals as text');
      for (const name of ['data', 'freeze', 'universe']) {
        for (const bad of [{ path: 'x', sha256: 'short' }, { path: '', sha256: 'a'.repeat(64) }, undefined]) {
          assert(thrownBy(() => m.activation(expansion, { pilots: {}, approvedOptional: [], epoch: { ...epoch, [name]: bad } })).includes(`epoch.${name} needs a path and a SHA-256`), `epoch.${name} ${JSON.stringify(bad)}`);
        }
      }
      const rec = record();
      const options = { activationSha256: 'c'.repeat(64), rowSOf: () => 100 };
      const plans = (/** @type {any} */ over, /** @type {any} */ extra = {}) => m.activationPlans(expansion, { ...rec, ...over }, m.stepPrice, { ...options, ...extra });
      assert(thrownBy(() => plans({ format: 'other' })).includes('not an activation record'), 'a record of another format');
      assert(thrownBy(() => plans({}, { activationSha256: 'abc' })).includes('needs the SHA-256'), 'a template hash that is no SHA-256');
      assert(thrownBy(() => plans({ groups: [] })).includes('without a group'), 'an activation without a group');
      assert(thrownBy(() => plans({ groups: [{ key: 'V4-S4|fr-frozen|val-nowhere|20|39', origin: 'initial' }] })).includes('has no group for'), 'a group the matrix does not have');
      assert(thrownBy(() => plans({ groups: [{ ...rec.groups[0], origin: 'conditional' }] })).includes('lists'), 'an origin that is not the group\'s collection');
      const comparator = expansion.groups.find((/** @type {any} */ g) => g.comparator && g.collection === 'initial');
      assert(thrownBy(() => plans({ groups: [{ key: m.groupKey(comparator), origin: 'initial' }] })).includes('a comparator group'), 'a comparator group is never part of the plan');
      assert(thrownBy(() => plans({ comparatorCells: [{ ...rec.comparatorCells[0], cell: '12x12-nightmare' }] })).includes('is not a comparator group'), 'a comparator cell that does not match its group');
      assert(thrownBy(() => plans({ comparatorCells: [{ cell: 'x', from: 20, to: 39, rows: 20, shard: 'val-x' }] })).includes('has no group for'), 'a comparator cell the matrix does not have');
      assert(build(rec).plan.steps.length > 0, 'the checks left the kit usable');
      // The dispatcher: both commands are reachable, and each refusal below happens before any record is read or written.
      const refused = async (/** @type {string[]} */ argv) => captureOutput(() => m.main(argv));
      const unknown = await refused(['nope']);
      same([unknown.code, unknown.err], [1, 'manifest: unknown command nope (compile, check-prerequisites, activate, close, resolve-comparators, verdict-input, price, approval, write-plan)\n'], 'an unknown command lists the nine');
      const wrongLabel = await refused(['activate', '--collection', 'initial', '--label', 'selftest']);
      same([wrongLabel.code, wrongLabel.err], [1, 'manifest: --label frozen only\n'], 'main dispatches activate');
      const wrongArgument = await refused(['activate', '--collection', 'initial', '--bogus', 'x', '--label', 'frozen']);
      same([wrongArgument.code, wrongArgument.err], [1, 'manifest: unknown argument: --bogus\n'], 'an unknown argument is refused');
      const wrongClose = await refused(['close', '--collection', 'second', '--reason', 'x', '--label', 'frozen', '--source-label', 'x']);
      same([wrongClose.code, wrongClose.err], [1, 'manifest: only the initial collection is closed here; the second is N-V4-04\'s\n'], 'main dispatches close');
    },
  },
  {
    name: 'close: exactly the missing rows',
    async run() {
      const { m } = await collectionKit();
      await onCollections(async (dir) => {
        const declared = ['fr-frozen/c~20', 'fr-frozen/c~21', 'fr-frozen-none/c~20', 'fr-frozen-none/c~21'];
        const activationFile = join(dir, 'activation.json');
        writeJson(activationFile, { format: 'ig-v4-activation', version: 1, collection: 'initial', declaredRows: declared });
        const publish = (/** @type {string} */ runs, /** @type {string} */ arm, /** @type {string[]} */ keys, shard = 'val-c') => writeJson(join(runs, arm, `${shard}.runs.json`), { meta: {}, shard, rows: keys.map((rowKey) => ({ rowKey })) });
        const argv = ['--collection', 'initial', '--reason', 'the owner stops at the ceiling', '--label', 'frozen', '--source-label', 'x'];
        const close = (/** @type {any} */ paths, /** @type {string[]} */ args = argv) => captureOutput(() => m.closeCommand(args, paths));

        // Three of the four declared rows are published; another arm's row of the same key is not the fourth.
        const runs = join(dir, 'runs');
        publish(runs, 'fr-frozen', ['c~20', 'c~21']);
        publish(runs, 'fr-frozen-none', ['c~20']);
        publish(runs, 'log-link', ['c~21', 'c~99']);
        const paths = { activation: activationFile, closure: join(dir, 'closure.json'), runs };
        const first = await close(paths);
        same([first.code, first.out, first.err], [0, 'closure: 1 missing rows\n', ''], `the closure: exit ${first.code}, ${JSON.stringify(first.err)}`);
        const closure = JSON.parse(readFileSync(paths.closure, 'utf8'));
        const { createdAt, ...rest } = closure;
        assert(isoTime(createdAt), `createdAt ${createdAt}`);
        same(rest, {
          format: 'ig-v4-closure', version: 1, collection: 'initial', activation: { path: rel(activationFile), sha256: sha256File(activationFile) }, missing: ['fr-frozen-none/c~21'],
          reason: 'the owner stops at the ceiling',
        }, 'the closure lists the fourth row and the record\'s SHA-256');
        // A closure is written once.
        const before = rawHashes([paths.closure]);
        const again = await close(paths);
        same([again.code, again.out, again.err, rawHashes([paths.closure])], [1, '', 'manifest: closure exists: a closure is never rewritten\n', before], 'a second closure is refused and rewrites nothing');

        // Every declared row is published: there is nothing to close.
        publish(runs, 'fr-frozen-none', ['c~21'], 'val-d');
        const complete = { ...paths, closure: join(dir, 'closure-complete.json') };
        const nothing = await close(complete);
        same([nothing.code, nothing.out, nothing.err, existsSync(complete.closure)], [1, '', 'manifest: nothing to close\n', false], `four of four published: exit ${nothing.code}, ${JSON.stringify(nothing.err)}`);

        // The missing rows keep the declared order whatever the folders' order; a file that is no runs file publishes nothing and is told.
        const other = join(dir, 'other-runs');
        publish(other, 'fr-frozen-none', ['c~21']);
        publish(other, 'fr-frozen', ['c~20']);
        writeText(join(other, 'fr-frozen', 'broken.runs.json'), '{ not json');
        writeJson(join(other, 'fr-frozen', 'no-rows.runs.json'), { meta: {} });
        writeText(join(other, 'fr-frozen', 'notes.txt'), 'ignored');
        const ordered = { ...paths, closure: join(dir, 'closure-ordered.json'), runs: other };
        const mixed = await close(ordered);
        same([mixed.code, mixed.out, JSON.parse(readFileSync(ordered.closure, 'utf8')).missing], [0, 'closure: 2 missing rows\n', ['fr-frozen/c~21', 'fr-frozen-none/c~20']], 'two rows are missing, in their declared order');
        same(mixed.err.split('\n').filter((l) => l !== '').sort(), [
          `close: ${rel(join(other, 'fr-frozen', 'broken.runs.json'))} is not a runs file: its rows are not published`,
          `close: ${rel(join(other, 'fr-frozen', 'no-rows.runs.json'))} is not a runs file: its rows are not published`,
        ], 'the two files that are no runs files are told');
        const none = { ...paths, closure: join(dir, 'closure-none.json'), runs: join(dir, 'no-runs') };
        const nothingPublished = await close(none);
        same([nothingPublished.code, nothingPublished.out, JSON.parse(readFileSync(none.closure, 'utf8')).missing], [0, 'closure: 4 missing rows\n', declared], 'no published row: all four are missing');

        // The refusals write nothing.
        const refused = { ...paths, closure: join(dir, 'closure-refused.json') };
        const cases = /** @type {[string, any, string[], string][]} */ ([
          ['the second collection', refused, ['--collection', 'second', '--reason', 'x', '--label', 'frozen', '--source-label', 'x'], 'only the initial collection is closed here; the second is N-V4-04\'s'],
          ['no collection', refused, ['--reason', 'x', '--label', 'frozen', '--source-label', 'x'], 'close needs --collection initial'],
          ['no reason', refused, ['--collection', 'initial', '--label', 'frozen', '--source-label', 'x'], 'close needs --reason <text>'],
          ['a blank reason', refused, ['--collection', 'initial', '--reason', '  ', '--label', 'frozen', '--source-label', 'x'], 'close needs --reason <text>'],
          ['another label', refused, ['--collection', 'initial', '--reason', 'x', '--label', 'selftest', '--source-label', 'x'], '--label frozen only'],
          ['no activation record', { ...refused, activation: join(dir, 'none.json') }, argv, 'no activation record'],
        ]);
        for (const [what, over, args, text] of cases) {
          const out = await close(over, args);
          assert(out.code === 1 && out.out === '' && out.err.includes(text) && !existsSync(refused.closure), `${what}: exit ${out.code}, ${JSON.stringify(out.err)}`);
        }
        for (const text of ['{', '[]', JSON.stringify({ format: 'other', declaredRows: declared }), JSON.stringify({ format: 'ig-v4-activation', declaredRows: 'x' }), JSON.stringify({ format: 'ig-v4-activation', declaredRows: [1] })]) {
          const bad = join(dir, 'bad-activation.json');
          writeText(bad, text);
          const out = await close({ ...refused, activation: bad });
          assert(out.code === 1 && out.err.includes('is not an activation record') && !existsSync(refused.closure), `an activation record holding ${text}: exit ${out.code}, ${JSON.stringify(out.err)}`);
        }
      });
    },
  },
  {
    name: 'resolve: comparators from a final selection',
    async run() {
      await onResolve(async (dir) => {
        const w = await resolveWorld(dir);
        const { m } = w;
        const selection = w.receipt();
        const expectation = w.expectation();
        same([selection.verdict, selection.selection.cells['14x14-nightmare'], selection.selection.cells['26x26-hell-1']], ['pass', { class: 'n', shipped: 'fr-frozen' }, { class: 'h', shipped: 'fr-frozen-none' }],
          'the selection is final: the screen arm on 14x14 Nightmare, the no-screen arm on 26x26 Hell 1');
        same(proofCheck(selection, expectation), { status: 'pass', reasons: [] }, 'the receipt passes the expectation of the same records');
        const plan = m.resolveComparators(w.template, selection, expectation);
        const activationFile = 'docs/improve-generating/evidence/frozen/V4-S4/activation.json';
        const selectionFile = 'docs/improve-generating/evidence/frozen/V4-S4/class-selection.json';
        const rows = rowStepsOf(plan);
        same(rows.length, w.template.cells.length, 'one row step per template cell');
        for (const [cell, arm] of [['14x14-nightmare', 'fr-frozen-uncapped'], ['26x26-hell-1', 'fr-frozen-none-uncapped']]) {
          const step = rows.filter((/** @type {any} */ s) => String(argAfter(s, '--cases')).startsWith(`${cell}:`));
          same(step.length, 1, `one row step of ${cell}`);
          same([argAfter(step[0], '--task'), argAfter(step[0], '--arm'), argAfter(step[0], '--variant'), argAfter(step[0], '--shard'), argAfter(step[0], '--cases'), argAfter(step[0], '--row-limit-s'), argAfter(step[0], '--workers'), step[0].state],
            ['V4-S4C', arm, arm, `val-${cell}`, `${cell}:20-39`, '260', '4', `V4-S4C\\${arm}\\val-${cell}\\state.json`], `${cell} runs ${arm}, in its own state`);
        }
        same(['fr-frozen-uncapped', 'fr-frozen-none-uncapped'].map((arm) => rows.filter((/** @type {any} */ s) => argAfter(s, '--arm') === arm).length), [16, 1], 'every other cell ships the screen arm: 16 and 1');
        assert(plan.steps.every((/** @type {any} */ s) => s.node.every((/** @type {string} */ word) => !word.includes('<') && !word.includes('shipped-uncapped'))), 'no node holds < or shipped-uncapped');
        same([plan.task, plan.generatedBy, plan.runnable, plan.blockedBy, plan.optionalMinutes], ['V4-S4C', 'manifest.mjs resolve-comparators', true, [], 0], 'the plan\'s header');
        same(plan.prerequisites, [
          { type: 'variant', id: 'fr-frozen-uncapped' }, { type: 'variant', id: 'fr-frozen-none-uncapped' },
          { type: 'file', path: selectionFile }, { type: 'selection', path: selectionFile, activation: activationFile },
        ], 'the prerequisites: the resolved variants, the receipt and its check against the activation');
        same(plan.steps.map((/** @type {any} */ s) => s.id), [
          'prerequisites', 'firewall-snapshot', 'trees', ...rows.map((/** @type {any} */ s) => s.id), 'publish-fr-frozen-uncapped', 'publish-fr-frozen-none-uncapped', 'verdict-input', 'verdicts', 'firewall-check',
        ], 'the steps, in order');
        const step = (/** @type {string} */ id) => plan.steps.find((/** @type {any} */ s) => s.id === id);
        const manifestFile = 'tools\\ig-proto\\plans\\verdicts\\V4-S4F.verdict-manifest.json';
        same(step('trees').node, ['tools\\ig-proto\\lib\\tree.mjs', 'build', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'], 'trees builds the two resolved variants');
        same(step('verdict-input').node, ['tools\\ig-proto\\manifest.mjs', 'verdict-input', '--purpose', 'final', '--activation', activationFile, '--selection', selectionFile, '--out', manifestFile], 'verdict-input');
        same(step('verdicts').node, ['tools\\ig-proto\\verdicts.mjs', '--manifest', manifestFile], 'verdicts');
        same(step('publish-fr-frozen-none-uncapped').node, ['tools\\ig-proto\\arm.mjs', 'publish', '--task', 'V4-S4C', '--arm', 'fr-frozen-none-uncapped'], 'a publish step');
        same(step('verdict-input').dependsOn, ['publish-fr-frozen-uncapped', 'publish-fr-frozen-none-uncapped'], 'the final verdict input follows the publishes');
        same(step('prerequisites').consumes, [selectionFile, activationFile], 'the gate names the receipt and the record it reads');
        // The rules of every step (T11c): locked rows repeat until done with their state and horizon, and are priced as the template priced them.
        const locked = plan.steps.filter((/** @type {any} */ s) => s.locked);
        same(locked.length, rows.length, 'the row steps are the locked steps');
        assert(locked.every((/** @type {any} */ s) => s.repeatUntilDone === true && s.minHorizonS === 272 && s.optional === false && isDeepStrictEqual(s.price, { type: 'rows', rows: 20, rowS: 100, rowLimitS: 260 })
          && s.projectS === m.stepPrice(s.price).projectS && s.invocations === m.stepPrice(s.price).invocations), 'every row step: repeatUntilDone, minHorizonS 272, required, the template\'s price');
        same(plan.allocationMinutes, Math.ceil(requiredSeconds(plan.steps) / 60), 'allocationMinutes is the ceiling of the required locked steps');
        // The row limit is the matrix's, whatever the template says: the comparators are not cut at the live deadline's 130 s.
        const cut = m.resolveComparators({ ...w.template, cells: w.template.cells.map((/** @type {any} */ c) => ({ ...c, rowLimitS: 130 })) }, selection, expectation);
        same(new Set(rowStepsOf(cut).map((/** @type {any} */ s) => argAfter(s, '--row-limit-s'))), new Set(['260']), 'a template that says 130 s still runs at 260 s');
        // Producers before consumers, and every script exists.
        const declared = new Set([selectionFile, activationFile]);
        /** @type {Set<string>} */
        const produced = new Set();
        /** @type {string[]} */
        const ids = [];
        for (const s of plan.steps) {
          for (const path of s.consumes) {
            assert(produced.has(path) || declared.has(path), `${s.id} consumes ${path}, which no earlier step produces and no prerequisite declares`);
          }
          for (const dep of s.dependsOn) {
            assert(ids.includes(dep), `${s.id} depends on ${dep}, which is not an earlier step`);
          }
          assert(existsSync(abs(s.node[0].replaceAll('\\', '/'))), `${s.id}: the script ${s.node[0]} does not exist`);
          s.produces.forEach((/** @type {string} */ p) => produced.add(p));
          ids.push(s.id);
        }
      });
    },
  },
  {
    name: 'resolve: an interim selection is refused',
    async run() {
      await onResolve(async (dir) => {
        const w = await resolveWorld(dir);
        const { m } = w;
        const last = w.activation.declaredRows.at(-1);
        const refusal = (/** @type {any} */ selection, /** @type {any} */ expectation = w.expectation()) => thrownBy(() => m.resolveComparators(w.template, selection, expectation));
        const armsWith = (/** @type {string} */ id, /** @type {Record<string, string>} */ over) => ['fr-frozen', 'fr-frozen-none'].map((arm) => ({ id: arm, treeId: w.trees[arm].treeId, paramsHash: sha256(JSON.stringify(w.trees[arm].params)), ...(arm === id ? over : {}) }));
        // (a) one declared row is not published and nothing closes it: an interim report, never a selection.
        const interim = w.receipt({ omit: [last] });
        same([interim.verdict, interim.reasons], ['incomplete', [`missing ${last}`]], '(a) the input is an interim report');
        assert(refusal(interim) === 'the selection is not final (verdict "incomplete")', `(a) ${refusal(interim)}`);
        // A receipt that claims pass but does not observe the row: the declared coverage is the resolver's, built from the activation record.
        const whole = w.receipt();
        assert(refusal({ ...whole, coverage: { ...whole.coverage, observed: whole.coverage.observed.slice(0, -1) } }) === `the selection is not final (coverage gap ${last})`, 'a receipt that claims pass without the last row');
        // (b) bound to another tree of fr-frozen than the runs files carry, to other parameters, to another producer, or to evidence that changed.
        assert(refusal(w.receipt({ arms: armsWith('fr-frozen', { treeId: 'tree-other' }) })) === 'the selection is not final (stale arm fr-frozen)', '(b) another tree id');
        assert(refusal(w.receipt({ arms: armsWith('fr-frozen-none', { paramsHash: 'f'.repeat(64) }) })) === 'the selection is not final (stale arm fr-frozen-none)', '(b) other parameters');
        assert(refusal(w.receipt({ harnessHash: 'h-other' })) === 'the selection is not final (producer changed)', '(b) another producer');
        const freezeText = readFileSync(w.freezeFile, 'utf8');
        writeJson(w.freezeFile, { ...w.freeze, note: 'changed after the selection' });
        assert(refusal(whole) === `the selection is not final (evidence changed ${w.freezeRef.path})`, '(b) the freeze file the receipt binds changed');
        writeText(w.freezeFile, freezeText);
        same(proofCheck(whole, w.expectation()), { status: 'pass', reasons: [] }, 'the freeze file restored: the receipt passes again');
        assert(refusal({ ...whole, kind: 'stage1' }).startsWith('the selection is not final (not a class-selection receipt'), 'a receipt of another kind');
        // (c) a cell the selection ships no arm for: absent from its cells, or shipped by an arm that is no twin.
        const withoutHell = w.receipt({ classes: [w.freeze.classes[0]] });
        same([withoutHell.verdict, Object.hasOwn(withoutHell.selection.cells, '26x26-hell-1')], ['pass', false], '(c) the input is final and lacks 26x26-hell-1');
        assert(refusal(withoutHell) === 'no shipped arm for 26x26-hell-1', `(c) ${refusal(withoutHell)}`);
        const other = w.receipt({ classes: [{ id: 'n', cells: w.freeze.classes[0].cells, screen: 'fr-ps', noScreen: 'fr-none' }, w.freeze.classes[1]] });
        assert(refusal(other) === `no shipped arm for ${w.freeze.classes[0].cells[0]}`, `(c) an arm that is no twin: ${refusal(other)}`);
      });
    },
  },
  {
    name: 'resolve: a closed collection resolves',
    async run() {
      await onResolve(async (dir) => {
        const w = await resolveWorld(dir);
        const { m } = w;
        const last = w.activation.declaredRows.at(-1);
        const paths = { selectionPath: rel(w.selectionFile), activationPath: w.activationRef.path };
        same(w.expectation().coverage.expected.length, w.activation.declaredRows.length, 'without a closure the expectation holds every declared row');
        const closure = await w.closeRows([last]);
        same(closure.record.missing, [last], 'the closure lists the one row that is not published');
        const selection = w.receipt({ closure });
        same([selection.verdict, selection.collection, selection.coverage.missing], ['pass', { activationSha256: w.activationRef.sha256, closureSha256: closure.ref.sha256, missing: [last] }, []], 'the selection is final by the closure');
        const expectation = w.expectation(closure);
        same([expectation.coverage?.expected.length, expectation.coverage?.expected.includes(last), expectation.fields], [w.activation.declaredRows.length - 1, false, { collection: { activationSha256: w.activationRef.sha256, closureSha256: closure.ref.sha256, missing: [last] } }],
          'the expectation lacks the closed row and lists it as missing');
        const plan = m.resolveComparators(w.template, selection, expectation, paths);
        same([plan.task, rowStepsOf(plan).length], ['V4-S4C', 17], 'the plan is written for the closed collection');
        // The same receipt against the expectation of the collection without its closure, and a closure that lists another row, do not pass.
        const open = thrownBy(() => m.resolveComparators(w.template, selection, w.expectation(), paths));
        assert(open.startsWith('the selection is not final (') && open.includes(`coverage gap ${last}`), `no closure in the expectation: ${open}`);
        // The collection the receipt names is checked too: the closure's SHA-256 of the expectation must be the receipt's.
        const moved = thrownBy(() => m.resolveComparators(w.template, selection, w.expectation({ ...closure, ref: { ...closure.ref, sha256: 'e'.repeat(64) } }), paths));
        assert(moved.startsWith('the selection is not final (collection is {') && moved.includes('"closureSha256":"' + closure.ref.sha256 + '"'), `another closure SHA-256 in the expectation: ${moved}`);
        const wrong = w.receipt({ closure: { ...closure, record: { ...closure.record, missing: [w.activation.declaredRows[0]] } }, omit: [last] });
        same([wrong.verdict, wrong.reasons[0]], ['incomplete', 'closure does not match'], 'a closure of another row leaves the receipt incomplete');
        assert(thrownBy(() => m.resolveComparators(w.template, wrong, expectation, paths)).startsWith('the selection is not final ('), 'and the resolver refuses it');
      });
    },
  },
  {
    name: 'resolve: the template belongs to its activation',
    async run() {
      await onResolve(async (dir) => {
        const w = await resolveWorld(dir);
        const { m } = w;
        const selection = w.receipt();
        const expectation = w.expectation();
        const changed = { ...w.template, activationSha256: 'f'.repeat(64) };
        same(thrownBy(() => m.resolveComparators(changed, selection, expectation)), 'the template belongs to another activation', 'a template of another activation record');
        const second = JSON.parse(readFileSync(join(IG_DIR, 'plans', 'V4-S4X.template.json'), 'utf8'));
        same([second.task, thrownBy(() => m.resolveComparators(second, selection, expectation))], ['V4-S4X', 'not a V4-S4C template'], 'the second validation\'s template is not a comparator template');
        same(thrownBy(() => m.resolveComparators({ ...w.template, cells: 'x' }, selection, expectation)), 'not a V4-S4C template', 'a template without its cells');
        // The template is judged before the selection: an interim report with a template of another activation is refused for the template.
        same(thrownBy(() => m.resolveComparators(changed, w.receipt({ omit: [w.activation.declaredRows[0]] }), expectation)), 'the template belongs to another activation', 'the order of the refusals');
        same(m.resolveComparators(w.template, selection, expectation).task, 'V4-S4C', 'the template of this activation resolves');
      });
    },
  },
  {
    name: 'verdict input: selection and final',
    async run() {
      await onResolve(async (dir) => {
        const w = await resolveWorld(dir);
        const { m, v } = w;
        const { controls } = await collectionKit();
        const selection = w.receipt();
        writeJson(w.selectionFile, selection);
        const selectionRef = { path: rel(w.selectionFile), sha256: sha256File(w.selectionFile) };
        const plan = m.resolveComparators(w.template, selection, w.expectation(), { selectionPath: selectionRef.path, activationPath: w.activationRef.path });
        for (const step of rowStepsOf(plan)) {
          w.publish('V4-S4C', argAfter(step, '--arm'), argAfter(step, '--shard'));
        }
        const published = (/** @type {any} */ arm) => m.publishedRuns(arm, { readFile: w.read, list: w.list, who: 'verdict-input' });
        const input = { activation: w.activation, activationRef: w.activationRef, closureRef: null, freeze: w.freeze, expansion: w.expansion, published };
        const first = m.verdictInput('selection', input);
        const final = m.verdictInput('final', { ...input, selectionRef, comparatorPlan: plan });
        const reps = Array.from({ length: 20 }, (_, i) => 20 + i);
        for (const [what, manifest, task] of /** @type {[string, any, string][]} */ ([['selection', first, 'V4-S4'], ['final', final, 'V4-S4F']])) {
          same([manifest.task, manifest.label, manifest.purpose, manifest.quantity, manifest.capMs, manifest.responseBoundMs, manifest.resampleSeed, manifest.resamples],
            [task, 'frozen', what, 10, 120000, 120000, 20261116, 10000], `${what}: the recipe`);
          same([manifest.validationReps, manifest.masterReps, manifest.collection], [reps, [20, 21, 22, 23, 24], { activation: w.activationRef, closure: null }], `${what}: the reps and the collection`);
          same(manifest.classes, w.freeze.classes, `${what}: the classes are the freeze file's`);
          same([manifest.failingCells, manifest.hell1], [['14x14-nightmare', '15x15b10-nightmare', '12x12-nightmare', '16x16-nightmare', '15x20-nightmare'], ['26x26-hell-1', '20x20-hell-1']], `${what}: the failing cells and the validated Hell 1 boards`);
          same(manifest.controls, controls.map((/** @type {string} */ cell) => ({ cell, today: 'log-link' })), `${what}: a control per completion-passing cell, against today's arm`);
          same([manifest.masters.length, manifest.masters[0], manifest.masters.at(-1).cell], [16, { cell: '6x10-master', today: 'log-link', after: 'fr-frozen' }, '26x26-master'], `${what}: a Master identity cell per Master cell`);
          same(manifest.deadlineProjection, { arms: ['fr-frozen', 'fr-frozen-none'], reserves: [0.3, 0.4, 0.5], deadlineMs: 115000 }, `${what}: the projection`);
          same(manifest.prerequisites, {
            stage1: { binding: 'docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json', current: [] },
            parity: [
              ...['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'].map((arm) => ({ binding: `docs/improve-generating/evidence/frozen/V4-S4P/parity-${arm}.accepted.json`, current: [arm] })),
              { binding: 'docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json', current: ['v4'] },
            ],
            liveDeadline: { binding: 'docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json', current: ['fr-frozen', 'fr-frozen-none'] },
          }, `${what}: the prerequisites go through their accepted bindings: stage 1 with no tree, the P-0 pass on v4`);
          for (const arm of manifest.arms) {
            same([arm.id === arm.arm, arm.variant, arm.treeId, arm.files.length > 0 && arm.files.every((/** @type {{ path: string, sha256: string }} */ f) => f.path.endsWith('.runs.json') && f.sha256 === sha256Text(/** @type {string} */ (w.mem.get(f.path))))],
              [true, arm.arm, `tree-${arm.arm}`, true], `${what}: arm ${arm.id}: its own tree and the hashes of its runs files`);
          }
          const refused = thrownBy(() => v.verdictRecords(manifest, { readText: () => null, list: () => [], harnessHash: 'h', currentOf: () => ({ treeId: 't', paramsHash: 'p' }) }, { path: 'x/m.json', sha256: 'a'.repeat(64) }));
          assert(refused.includes('the activation record') && refused.includes('is missing') && !refused.includes('manifest:'), `${what}: the verdict tool reads the manifest and goes on to its records: ${refused}`);
        }
        same(first.arms.map((/** @type {any} */ a) => [a.id, a.task]), [['fr-frozen', 'V4-S4'], ['fr-frozen-none', 'V4-S4'], ['log-link', 'V4-S4']], 'selection: the arms of the activation\'s groups');
        same([first.p5, Object.hasOwn(first, 'selection')], [[], false], 'selection: no P5 pair and no selection field');
        same(first.arms.find((/** @type {any} */ a) => a.id === 'fr-frozen').files.map((/** @type {any} */ f) => f.path.split('/').at(-1)), ['val-14x14-nightmare.runs.json', 'val-26x26-hell-1.runs.json'], 'every runs file of an arm is listed, in name order');
        same(final.arms.map((/** @type {any} */ a) => [a.id, a.task]), [['fr-frozen', 'V4-S4'], ['fr-frozen-none', 'V4-S4'], ['log-link', 'V4-S4'], ['fr-frozen-uncapped', 'V4-S4C'], ['fr-frozen-none-uncapped', 'V4-S4C']], 'final: the resolved comparator arms follow');
        same(final.selection, selectionRef, 'final: the selection it rests on, with the SHA-256 of the receipt');
        same(final.p5.length, w.template.cells.length, 'final: one P5 pair per comparator cell');
        same(final.p5[0], { cell: '14x14-nightmare', bounded: 'fr-frozen', uncapped: 'fr-frozen-uncapped', reps }, 'final: a pair of the screen arm');
        same(final.p5.find((/** @type {any} */ p) => p.cell === '26x26-hell-1'), { cell: '26x26-hell-1', bounded: 'fr-frozen-none', uncapped: 'fr-frozen-none-uncapped', reps }, 'final: a pair of the no-screen arm');
        same(final.p5.map((/** @type {any} */ p) => p.cell), w.template.cells.map((/** @type {any} */ c) => c.cell), 'final: the pairs follow the template');
        assert(JSON.stringify(m.verdictInput('final', { ...input, selectionRef, comparatorPlan: plan })) === JSON.stringify(final), 'the same records give the same manifest, byte for byte');
        // An activated conditional board adds its Hell 1 report and no arm; an approved S4-6 adds no control (its today's-arm groups are no control).
        const kit = await collectionKit();
        const board = '24x24-hell-1';
        const wide = kit.record({ [board]: await pilotRuns(board, 3, 2) }, ['S4-6']);
        same(wide.optional.approved, ['S4-6'], 'the wider activation approves S4-6');
        const more = m.verdictInput('selection', { ...input, activation: wide });
        same([more.hell1, more.controls, more.masters.length, more.arms.map((/** @type {any} */ a) => a.id)], [['26x26-hell-1', '20x20-hell-1', board], first.controls, 16, ['fr-frozen', 'fr-frozen-none', 'log-link']],
          'the activated board is a Hell 1 cell; the controls, the Master cells and the arms are those of the default collection');
      });
    },
  },
  {
    name: 'verdict input: not published',
    async run() {
      await onResolve(async (dir) => {
        const w = await resolveWorld(dir);
        const { m } = w;
        const selection = w.receipt();
        writeJson(w.selectionFile, selection);
        const selectionRef = { path: rel(w.selectionFile), sha256: sha256File(w.selectionFile) };
        const plan = m.resolveComparators(w.template, selection, w.expectation(), { selectionPath: selectionRef.path, activationPath: w.activationRef.path });
        for (const step of rowStepsOf(plan)) {
          w.publish('V4-S4C', argAfter(step, '--arm'), argAfter(step, '--shard'));
        }
        const published = (/** @type {any} */ arm) => m.publishedRuns(arm, { readFile: w.read, list: w.list, who: 'verdict-input' });
        const input = { activation: w.activation, activationRef: w.activationRef, closureRef: null, freeze: w.freeze, expansion: w.expansion, published };
        const final = () => m.verdictInput('final', { ...input, selectionRef, comparatorPlan: plan });
        assert(final().arms.length === 5, 'the control: every arm is published');
        // One comparator arm's runs file is absent.
        const file = `${FROZEN_EVIDENCE}/V4-S4C/fr-frozen-none-uncapped/val-26x26-hell-1.runs.json`;
        const text = /** @type {string} */ (w.mem.get(file));
        w.mem.delete(file);
        same(thrownBy(final), 'verdict-input: not published fr-frozen-none-uncapped', 'a comparator arm without its runs file');
        // A runs file that carries no tree is listed but gives no identity: the arm is not published.
        w.mem.set(file, JSON.stringify({ meta: {}, rows: [] }));
        same(thrownBy(final), 'verdict-input: not published fr-frozen-none-uncapped', 'a runs file without its tree');
        w.mem.set(file, text);
        assert(final().arms.length === 5, 'the file restored: published again');
        // An arm of the activation, with the selection purpose.
        const armFile = `${FROZEN_EVIDENCE}/V4-S4/log-link/val-14x14-nightmare.runs.json`;
        const armText = /** @type {string} */ (w.mem.get(armFile));
        w.mem.delete(armFile);
        same(thrownBy(() => m.verdictInput('selection', input)), 'verdict-input: not published log-link', 'an arm of the activation without its runs file');
        w.mem.set(armFile, armText);
        // Two trees in the runs of one arm.
        w.publish('V4-S4', 'fr-frozen', 'val-20x20-hell-1', { meta: { trees: { 'fr-frozen': { ...w.trees['fr-frozen'], treeId: 'tree-other' } } } });
        same(thrownBy(final), 'verdict-input: two trees in the runs of fr-frozen', 'two trees in the runs of an arm');
        w.mem.delete(`${FROZEN_EVIDENCE}/V4-S4/fr-frozen/val-20x20-hell-1.runs.json`);
        // The other refusals of the manifest's inputs.
        same(thrownBy(() => m.verdictInput('final', { ...input, comparatorPlan: plan })), 'verdict-input: a final purpose needs the selection receipt', 'a final purpose without its selection');
        same(thrownBy(() => m.verdictInput('final', { ...input, selectionRef })), 'verdict-input: not a V4-S4C plan', 'a final purpose without its comparator plan');
        same(thrownBy(() => m.verdictInput('final', { ...input, selectionRef, comparatorPlan: { ...plan, task: 'V4-S4XC' } })), 'verdict-input: not a V4-S4C plan', 'the plan of another task');
        same(thrownBy(() => m.verdictInput('both', input)), 'verdict-input: purpose must be selection or final, got both', 'a purpose that is neither');
        assert(thrownBy(() => m.verdictInput('selection', { ...input, activation: { ...w.activation, groups: [{ key: 'V4-S4|fr-frozen|val-nowhere|20|39', origin: 'initial' }] } })).includes('which the matrix has no group for'), 'a group the matrix does not have');
        assert(thrownBy(() => m.verdictInput('selection', { ...input, activation: { ...w.activation, format: 'other' } })).includes('needs the activation record'), 'a record that is no activation');
      });
    },
  },
  {
    name: 'closure: beside its activation',
    async run() {
      await onResolve(async (dir) => {
        const w = await resolveWorld(dir);
        const { m } = w;
        const closureFile = join(dir, 'closure.json');
        const closureOf = () => m.closureOf(w.activationRef.path, w.activationRef.sha256);
        same(closureOf(), null, '(a) no closure.json beside the record: null');
        const missing = [w.activation.declaredRows[3], w.activation.declaredRows.at(-1)];
        const closure = await w.closeRows(missing);
        same([closure.ref, closure.record.missing, closure.record.activation, closure.record.format], [{ path: rel(closureFile), sha256: sha256File(closureFile) }, missing, w.activationRef, 'ig-v4-closure'], '(b) the closure T11e\'s close wrote: its path and SHA-256, its rows, its activation');
        // The closure of another activation record, an unreadable one: refused, never read as no closure.
        const original = JSON.parse(readFileSync(closureFile, 'utf8'));
        writeJson(closureFile, { ...original, activation: { ...original.activation, sha256: 'f'.repeat(64) } });
        same(thrownBy(closureOf), `the closure belongs to another activation: ${rel(closureFile)}`, '(c) a closure whose activation.sha256 is not the record\'s');
        writeJson(closureFile, { ...original, activation: undefined });
        same(thrownBy(closureOf), `the closure belongs to another activation: ${rel(closureFile)}`, '(c) a closure that names no activation');
        for (const text of ['{', '[]', 'null', '"x"', '{"missing":"x"}', '{"missing":[1]}', '{"activation":{}}']) {
          writeText(closureFile, text);
          same(thrownBy(closureOf), `an unreadable closure exists: ${rel(closureFile)}`, `(d) a closure holding ${text}`);
        }
        // It is read beside its own activation record only, and through the reader it is given.
        const elsewhere = join(dir, 'elsewhere');
        writeJson(join(elsewhere, 'activation.json'), w.activation);
        same(m.closureOf(rel(join(elsewhere, 'activation.json')), w.activationRef.sha256), null, 'a record in another folder has no closure');
        same(m.closureOf(`${rel(dir).replaceAll('/', '\\')}\\activation.json`, w.activationRef.sha256, { readFile: (/** @type {string} */ p) => (p === rel(closureFile) ? JSON.stringify({ missing: [], activation: { sha256: w.activationRef.sha256 } }) : null) }).record.missing, [],
          'the reader given is the one used, and a path with backslashes names the same folder');
      });
    },
  },
  {
    name: 'resolve: the commands',
    async run() {
      await onResolve(async (dir) => {
        const w = await resolveWorld(dir);
        const { m } = w;
        const selection = w.receipt();
        writeJson(w.selectionFile, selection);
        const out = join(dir, 'V4-S4C.json');
        const io = { readFile: w.read, list: w.list, harnessHash: 'h-test', template: rel(w.templateFile) };
        const argv = ['--selection', w.selectionFile, '--activation', w.activationFile, '--out', out, '--label', 'frozen', '--source-label', 'x'];
        const resolve = (/** @type {string[]} */ args = argv, /** @type {any} */ over = io) => captureOutput(() => m.resolveComparatorsCommand(args, over));
        const first = await resolve();
        same([first.code, first.err], [0, ''], `the resolution: exit ${first.code}, ${JSON.stringify(first.err)}`);
        const plan = JSON.parse(readFileSync(out, 'utf8'));
        const expected = m.resolveComparators(w.template, selection, w.expectation(), { readFile: w.read, selectionPath: rel(w.selectionFile), activationPath: w.activationRef.path });
        same(plan, JSON.parse(JSON.stringify(expected)), 'the plan is resolveComparators of the same records');
        same(first.out.split('\n'), [`wrote ${rel(out)}`, `resolve-comparators: 17 cells, fr-frozen-uncapped, fr-frozen-none-uncapped; V4-S4C: allocation ${plan.allocationMinutes} min`, ''], 'the printout');
        const bytes = rawHashes([out]);
        same([(await resolve()).code, rawHashes([out])], [0, bytes], 'a second resolution replaces its own plan with the same bytes');
        // Every refusal is `resolve-comparators: <reason>`, exit 1, and nothing is written.
        const fresh2 = join(dir, 'other-plan.json');
        const refused = async (/** @type {string} */ what, /** @type {string} */ text, /** @type {string[]} */ args = ['--selection', w.selectionFile, '--activation', w.activationFile, '--out', fresh2, '--label', 'frozen'], /** @type {any} */ over = io) => {
          const result = await resolve(args, over);
          assert(result.code === 1 && result.out === '' && result.err.startsWith('resolve-comparators: ') && result.err.includes(text) && !existsSync(fresh2), `${what}: exit ${result.code}, ${JSON.stringify(result.err)}`);
        };
        await refused('another label', '--label frozen only', ['--selection', 'x', '--activation', 'y', '--out', fresh2, '--label', 'selftest']);
        await refused('no output', 'needs --out <path>', ['--selection', 'x', '--activation', 'y', '--label', 'frozen']);
        await refused('no selection receipt', 'no selection receipt', ['--selection', rel(join(dir, 'none.json')), '--activation', w.activationFile, '--out', fresh2, '--label', 'frozen']);
        await refused('no template', 'no template', undefined, { ...io, template: rel(join(dir, 'none.json')) });
        await refused('no activation record', 'no activation record', ['--selection', w.selectionFile, '--activation', rel(join(dir, 'none.json')), '--out', fresh2, '--label', 'frozen']);
        await refused('no runs of a class arm', 'no published runs of fr-frozen-none', undefined, { ...io, list: (/** @type {string} */ f) => (f.endsWith('/fr-frozen-none') ? [] : w.list(f)) });
        w.publish('V4-S4', 'fr-frozen', 'val-other', { meta: { trees: { 'fr-frozen': { ...w.trees['fr-frozen'], treeId: 'tree-other' } } } });
        await refused('two trees in the runs of a class arm', 'two trees in the runs of fr-frozen');
        w.mem.delete(`${FROZEN_EVIDENCE}/V4-S4/fr-frozen/val-other.runs.json`);
        await refused('a template of another activation', 'the template belongs to another activation', undefined, { ...io, readFile: (/** @type {string} */ p) => (p === io.template ? JSON.stringify({ ...w.template, activationSha256: 'f'.repeat(64) }) : w.read(p)) });
        writeJson(w.selectionFile, w.receipt({ omit: [w.activation.declaredRows.at(-1)] }));
        await refused('an interim selection', 'the selection is not final (');
        writeJson(w.selectionFile, selection);
        const closureFile = join(dir, 'closure.json');
        writeJson(closureFile, { format: 'ig-v4-closure', missing: [], activation: { sha256: 'f'.repeat(64) } });
        await refused('a closure of another activation', `the closure belongs to another activation: ${rel(closureFile)}`);
        writeText(closureFile, '{');
        await refused('an unreadable closure', `an unreadable closure exists: ${rel(closureFile)}`);
        rmSync(closureFile);
        // A file that is not a plan of this command is never overwritten.
        writeJson(fresh2, { task: 'V4-S4C', generatedBy: 'by hand' });
        const foreign = await resolve(['--selection', w.selectionFile, '--activation', w.activationFile, '--out', fresh2, '--label', 'frozen']);
        same([foreign.code, foreign.out, foreign.err, JSON.parse(readFileSync(fresh2, 'utf8')).generatedBy], [1, '', `resolve-comparators: ${rel(fresh2)} exists and is not a plan of this command\n`, 'by hand'], 'a foreign file is refused and kept');
        // The dispatcher reaches both commands.
        const viaMain = await captureOutput(() => m.main(['resolve-comparators', '--label', 'selftest']));
        same([viaMain.code, viaMain.err], [1, 'resolve-comparators: --label frozen only\n'], 'main dispatches resolve-comparators');
        const viaMain2 = await captureOutput(() => m.main(['verdict-input', '--label', 'selftest']));
        same([viaMain2.code, viaMain2.err], [1, 'verdict-input: --label frozen only\n'], 'main dispatches verdict-input');

        // verdict-input: the manifests of the records on disk.
        const manifestFile = join(dir, 'V4-S4.verdict-manifest.json');
        const finalFile = join(dir, 'V4-S4F.verdict-manifest.json');
        const planFile = join(dir, 'V4-S4C.plan.json');
        writeJson(planFile, plan);
        for (const step of rowStepsOf(plan)) {
          w.publish('V4-S4C', argAfter(step, '--arm'), argAfter(step, '--shard'));
        }
        const vio = { readFile: w.read, list: w.list, comparatorPlan: rel(planFile) };
        const input = (/** @type {string[]} */ ...extra) => ['--activation', w.activationFile, ...extra, '--label', 'frozen', '--source-label', 'x'];
        const inputRefused = async (/** @type {string} */ what, /** @type {string} */ text, /** @type {string[]} */ args, /** @type {any} */ over = vio) => {
          const target = args[args.indexOf('--out') + 1];
          const result = await captureOutput(() => m.verdictInputCommand(args, over));
          assert(result.code === 1 && result.out === '' && result.err.startsWith('verdict-input: ') && result.err.includes(text) && !existsSync(target), `${what}: exit ${result.code}, ${JSON.stringify(result.err)}`);
        };
        const ref = (/** @type {string} */ file) => ({ path: rel(file), sha256: sha256File(file) });
        const published = (/** @type {any} */ arm) => m.publishedRuns(arm, { readFile: w.read, list: w.list, who: 'verdict-input' });
        const common = { activation: w.activation, activationRef: w.activationRef, closureRef: null, freeze: w.freeze, expansion: w.expansion, published };
        const sel = await captureOutput(() => m.verdictInputCommand(input('--purpose', 'selection', '--out', manifestFile), vio));
        same([sel.code, sel.err], [0, ''], `the selection manifest: exit ${sel.code}, ${JSON.stringify(sel.err)}`);
        same(JSON.parse(readFileSync(manifestFile, 'utf8')), JSON.parse(JSON.stringify(m.verdictInput('selection', common))), 'the manifest is verdictInput of the same records (today\'s controls)');
        same(sel.out.split('\n'), [`wrote ${rel(manifestFile)}`, 'verdict-input: selection V4-S4, 3 arms, 4 runs files, 0 P5 pairs', ''], 'the printout');
        const fin = await captureOutput(() => m.verdictInputCommand(input('--purpose', 'final', '--selection', w.selectionFile, '--out', finalFile), vio));
        same([fin.code, fin.err], [0, ''], `the final manifest: exit ${fin.code}, ${JSON.stringify(fin.err)}`);
        same(JSON.parse(readFileSync(finalFile, 'utf8')), JSON.parse(JSON.stringify(m.verdictInput('final', { ...common, selectionRef: ref(w.selectionFile), comparatorPlan: plan }))), 'the final manifest names the receipt\'s SHA-256 and every comparator pair');
        same(fin.out.split('\n')[1], 'verdict-input: final V4-S4F, 5 arms, 21 runs files, 17 P5 pairs', 'the printout of the final manifest');
        const never = join(dir, 'never.json');
        await inputRefused('a final purpose without its selection', 'a final purpose needs --selection <receipt>', input('--purpose', 'final', '--out', never));
        await inputRefused('a selection purpose with a receipt', '--selection belongs to the purpose final', input('--purpose', 'selection', '--selection', w.selectionFile, '--out', never));
        await inputRefused('a purpose that is neither', 'needs --purpose selection or final', input('--purpose', 'both', '--out', never));
        await inputRefused('no output', 'needs --out <path>', ['--activation', w.activationFile, '--purpose', 'selection', '--label', 'frozen']);
        await inputRefused('another label', '--label frozen only', ['--purpose', 'selection', '--activation', w.activationFile, '--out', never, '--label', 'selftest']);
        await inputRefused('no selection receipt', 'no selection receipt', input('--purpose', 'final', '--selection', rel(join(dir, 'none.json')), '--out', never));
        await inputRefused('no comparator plan', 'no comparator plan', input('--purpose', 'final', '--selection', w.selectionFile, '--out', never), { ...vio, comparatorPlan: rel(join(dir, 'none.json')) });
        await inputRefused('no activation record', 'no activation record', ['--purpose', 'selection', '--activation', rel(join(dir, 'none.json')), '--out', never, '--label', 'frozen']);
        w.mem.delete(`${FROZEN_EVIDENCE}/V4-S4C/fr-frozen-none-uncapped/val-26x26-hell-1.runs.json`);
        await inputRefused('a comparator arm that is not published', 'not published fr-frozen-none-uncapped', input('--purpose', 'final', '--selection', w.selectionFile, '--out', never));
        // The closure beside the record is named in the manifest.
        const closure = await w.closeRows([w.activation.declaredRows.at(-1)]);
        const closed = await captureOutput(() => m.verdictInputCommand(input('--purpose', 'selection', '--out', manifestFile), vio));
        same([closed.code, JSON.parse(readFileSync(manifestFile, 'utf8')).collection], [0, { activation: w.activationRef, closure: closure.ref }], 'the manifest names the closure beside the activation record');
      });
    },
  },
  {
    name: 'resolve: the selection prerequisite',
    async run() {
      await onResolve(async (dir) => {
        const w = await resolveWorld(dir);
        const { m } = w;
        const selection = w.receipt();
        writeJson(w.selectionFile, selection);
        const entry = { type: 'selection', path: rel(w.selectionFile), activation: w.activationRef.path };
        const io = (/** @type {Record<string, any>} */ over = {}) => ({
          variants: ['fr-frozen-uncapped', 'fr-frozen-none-uncapped'], exists: () => true, readJson: () => ({}),
          currentOf: async (/** @type {string} */ id) => ({ id, treeId: 't', paramsHash: 'p' }), readFile: w.read, list: w.list, harnessHash: 'h-test', ...over,
        });
        const check = async (/** @type {Record<string, any>} */ over = {}, /** @type {any[]} */ list = [entry]) => (await m.checkPrerequisites(list, io(over)));
        const pass = await check();
        same([pass.status, pass.reasons, pass.line], ['pass', [], 'prerequisites: pass'], 'a final selection of the activation passes');
        // The plan T11f resolves passes its own gate.
        const plan = m.resolveComparators(w.template, selection, w.expectation(), { selectionPath: entry.path, activationPath: entry.activation });
        same((await check({}, plan.prerequisites)).status, 'pass', 'the prerequisites of the resolved plan pass');
        const blocked = async (/** @type {Record<string, any>} */ over, /** @type {string[]} */ reasons, /** @type {string} */ what) => {
          const got = await check(over);
          same([got.status, got.reasons, got.line], ['blocked', reasons, `prerequisites: blocked (${reasons.join('; ')})`], what);
        };
        await blocked({ harnessHash: 'h-other' }, ['selection: producer changed'], 'another producer');
        await blocked({ readFile: (/** @type {string} */ p) => (p === entry.path ? null : w.read(p)) }, [`selection: missing ${entry.path}`], 'no receipt');
        await blocked({ readFile: (/** @type {string} */ p) => (p === entry.path ? '{' : w.read(p)) }, [`selection: ${entry.path} is not JSON`], 'a receipt that is not JSON');
        await blocked({ list: (/** @type {string} */ f) => (f.endsWith('/fr-frozen') ? [] : w.list(f)) }, ['selection: no published runs of fr-frozen'], 'no runs of a class arm');
        await blocked({ readFile: (/** @type {string} */ p) => (p === w.activationRef.path ? null : w.read(p)) }, [`selection: no activation record ${w.activationRef.path}`], 'no activation record');
        // An interim receipt, and the closure of another activation.
        const last = w.activation.declaredRows.at(-1);
        writeJson(w.selectionFile, w.receipt({ omit: [last] }));
        await blocked({}, ['selection: verdict "incomplete"'], 'an interim report');
        writeJson(w.selectionFile, selection);
        const closureFile = join(dir, 'closure.json');
        writeJson(closureFile, { format: 'ig-v4-closure', missing: [], activation: { sha256: 'f'.repeat(64) } });
        await blocked({}, [`selection: the closure belongs to another activation: ${rel(closureFile)}`], 'a closure of another activation');
        rmSync(closureFile);
        // The other entries are judged as before, and each reason keeps its own prefix.
        const mixed = await check({ variants: [], harnessHash: 'h-other' }, [{ type: 'variant', id: 'fr-frozen-uncapped' }, entry]);
        same(mixed.reasons, ['variant fr-frozen-uncapped missing', 'selection: producer changed'], 'a variant and a selection in one list');
        // A receipt of a closed collection passes with its closure beside the record.
        const closure = await w.closeRows([last]);
        writeJson(w.selectionFile, w.receipt({ closure }));
        same((await check()).status, 'pass', 'a closed collection\'s selection passes');
        same(m.resolveComparators(w.template, w.receipt({ closure }), w.expectation(closure), { selectionPath: entry.path, activationPath: entry.activation }).steps[0].consumes, [entry.path, entry.activation], 'the gate step names the receipt and the record');
      });
    },
  },
  {
    name: 'resolve: the expectation is built apart from the receipt',
    async run() {
      await onResolve(async (dir) => {
        const w = await resolveWorld(dir);
        const { m } = w;
        const x = w.expectation();
        same([x.kind, x.source, x.harnessHash], ['class-selection', { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST }, 'h-test'], 'the kind, the frozen source and the harness it was given');
        same(x.arms, ['fr-frozen', 'fr-frozen-none'].map((id) => ({ id, treeId: `tree-${id}`, paramsHash: sha256(JSON.stringify({ id })) })), 'the class arms of the freeze file, with the tree id and the hash of the parameters of their runs');
        same([x.coverage, x.fields], [{ expected: w.activation.declaredRows }, { collection: { activationSha256: w.activationRef.sha256, closureSha256: null, missing: [] } }], 'every declared row, and the collection without a closure');
        // The arms are sorted and distinct whatever the classes say; an arm no class names is not bound.
        const reversed = { classes: [...w.freeze.classes].reverse().map((/** @type {any} */ c) => ({ ...c, screen: c.noScreen, noScreen: c.screen })) };
        const build = (/** @type {Record<string, any>} */ over = {}) => m.selectionExpectation({
          activation: w.activation, activationSha256: w.activationRef.sha256, closure: null, closureSha256: null, freeze: w.freeze,
          runsMeta: { 'fr-frozen': w.trees['fr-frozen'], 'fr-frozen-none': w.trees['fr-frozen-none'] }, harnessHash: 'h-test', ...over,
        });
        same(build({ freeze: reversed }).arms, x.arms, 'sorted, whatever the order of the classes');
        same(build({ freeze: { classes: [{ id: 'k', cells: ['c'], screen: 'fr-frozen', noScreen: 'fr-frozen' }] }, runsMeta: { 'fr-frozen': w.trees['fr-frozen'] } }).arms.map((/** @type {any} */ a) => a.id), ['fr-frozen'], 'a distinct arm once, and no other');
        // The tree of an arm is one value or the equal values of every runs file; two different values, or none, are refused.
        same(build({ runsMeta: { 'fr-frozen': [w.trees['fr-frozen'], w.trees['fr-frozen']], 'fr-frozen-none': w.trees['fr-frozen-none'] } }), x, 'the equal trees of two runs files');
        same(thrownBy(() => build({ runsMeta: { 'fr-frozen': [w.trees['fr-frozen'], { ...w.trees['fr-frozen'], treeId: 'tree-other' }], 'fr-frozen-none': w.trees['fr-frozen-none'] } })), 'resolve: two trees in the runs of fr-frozen', 'two different trees');
        for (const [what, runsMeta] of /** @type {[string, any][]} */ ([
          ['no tree', { 'fr-frozen': w.trees['fr-frozen'] }], ['an empty list', { 'fr-frozen': [], 'fr-frozen-none': w.trees['fr-frozen-none'] }],
          ['no parameters', { 'fr-frozen': { treeId: 't' }, 'fr-frozen-none': w.trees['fr-frozen-none'] }],
        ])) {
          assert(thrownBy(() => build({ runsMeta })).includes('carry no tree identity'), `${what} for a class arm`);
        }
        // `selectionInputs` reads those records itself: the record, the closure beside it, the freeze file and the runs of the class arms.
        const io = { readFile: w.read, list: w.list, harnessHash: 'h-test' };
        const inputs = m.selectionInputs(w.activationRef.path, io);
        same([inputs.expectation, inputs.closure, inputs.activationSha256, inputs.freeze], [x, null, w.activationRef.sha256, w.freeze], 'selectionInputs gives the expectation of the same records');
        // A closure moves the coverage and names the collection; the records it needs are checked.
        const closure = await w.closeRows([w.activation.declaredRows[5]]);
        const closed = w.expectation(closure);
        same([closed.coverage?.expected.length, closed.fields], [w.activation.declaredRows.length - 1, { collection: { activationSha256: w.activationRef.sha256, closureSha256: closure.ref.sha256, missing: [w.activation.declaredRows[5]] } }], 'the closure: one row less, and named');
        same(m.selectionInputs(w.activationRef.path, io).expectation, closed, 'and, with the closure beside the record, selectionInputs reads it');
        assert(thrownBy(() => build({ activationSha256: 'short' })).includes('needs the activation record'), 'an activation hash that is no SHA-256');
        assert(thrownBy(() => build({ activation: { declaredRows: 'x' } })).includes('needs the activation record'), 'declared rows that are no list');
        assert(thrownBy(() => build({ freeze: {} })).includes('needs the activation record'), 'a freeze file without classes');
        assert(thrownBy(() => build({ closure: { missing: ['a'] }, closureSha256: null })).includes('a closure needs'), 'a closure without its SHA-256');
        assert(thrownBy(() => build({ closure: { missing: 'a' }, closureSha256: 'a'.repeat(64) })).includes('a closure needs'), 'a closure without its list of rows');
        same(thrownBy(() => m.selectionInputs(w.activationRef.path, { ...io, readFile: (/** @type {string} */ p) => (p === w.freezeRef.path ? null : w.read(p)) })), `no freeze file ${w.freezeRef.path}`, 'a missing freeze file');
        same(thrownBy(() => m.selectionInputs(rel(join(dir, 'none.json')), io)), `no activation record ${rel(join(dir, 'none.json'))}`, 'a missing activation record');
        writeText(w.freezeFile, '{ "classes": [{ "id": 1 }] }');
        assert(thrownBy(() => m.selectionInputs(w.activationRef.path, io)).includes('is not a freeze file'), 'a freeze file whose classes are malformed');
      });
    },
  },
  {
    name: 'resolve: the expectation fits the receipt the verdict tool writes',
    async run() {
      const kit = await verdictKit();
      const { v } = kit;
      const m = (await matrixKit()).m;
      // A collection of the class k (arms sa and na, cell c) whose records stand beside each other as T11e and T09e write them.
      const declared = ['sa', 'na'].flatMap((id) => REPS20.map((rep) => `${id}/c~${rep}`));
      const freeze = { classes: [{ id: 'k', cells: ['c'], screen: 'sa', noScreen: 'na' }] };
      const freezeText = JSON.stringify(freeze);
      const activation = { format: 'ig-v4-activation', declaredRows: declared, epoch: { freeze: { path: 'act/freeze.json', sha256: sha256Text(freezeText) } } };
      const activationText = JSON.stringify(activation);
      const activationSha256 = sha256Text(activationText);
      const trees = { sa: { treeId: 'tree-sa', params: { id: 'sa' } }, na: { treeId: 'tree-na', params: { id: 'na' } } };
      /** @param {string[]} missing @param {boolean} closed */
      const world = (missing, closed) => {
        const closureText = JSON.stringify({ format: 'ig-v4-closure', activation: { path: 'act/activation.json', sha256: activationSha256 }, missing });
        const files = { 'act/freeze.json': freezeText, 'act/activation.json': activationText, ...(closed ? { 'act/closure.json': closureText } : {}) };
        const refs = { activation: { path: 'act/activation.json', sha256: activationSha256 }, closure: closed ? { path: 'act/closure.json', sha256: sha256Text(closureText) } : null };
        const w = toolWorld(kit, { rows: (id, rep) => (missing.includes(`${id}/c~${rep}`) ? null : undefined), files, manifest: { collection: refs } });
        const { receipt } = v.verdictRecords(w.manifest, w.repo.io, w.ref);
        const closure = closed ? m.closureOf('act/activation.json', activationSha256, { readFile: w.repo.readFile }) : null;
        const expectation = m.selectionExpectation({
          activation, activationSha256, closure: closure?.record ?? null, closureSha256: closure?.ref.sha256 ?? null, freeze, runsMeta: trees, harnessHash: 'h-test',
        });
        return { w, receipt, expectation, closure };
      };
      const whole = world([], false);
      same([whole.receipt.verdict, proofCheck(whole.receipt, whole.expectation, whole.w.repo.readFile)], ['pass', { status: 'pass', reasons: [] }], 'every declared row published: the receipt passes its expectation');
      const interim = world(['na/c~19'], false);
      same([interim.receipt.verdict, proofCheck(interim.receipt, interim.expectation, interim.w.repo.readFile).status], ['incomplete', 'incomplete'], 'a declared row not published and no closure: not final');
      const sealed = world(['na/c~19'], true);
      same([sealed.receipt.verdict, sealed.receipt.collection.missing, proofCheck(sealed.receipt, sealed.expectation, sealed.w.repo.readFile)], ['pass', ['na/c~19'], { status: 'pass', reasons: [] }],
        'a closure of exactly the missing row: the receipt passes the expectation built from the same records');
      const unclosed = m.selectionExpectation({ activation, activationSha256, closure: null, closureSha256: null, freeze, runsMeta: trees, harnessHash: 'h-test' });
      assert(proofCheck(sealed.receipt, unclosed, sealed.w.repo.readFile).reasons[0] === 'coverage gap na/c~19', 'the same receipt does not pass an expectation that ignores the closure');
      same(proofCheck(sealed.receipt, { ...sealed.expectation, harnessHash: 'h-other' }, sealed.w.repo.readFile), { status: 'incomplete', reasons: ['producer changed'] }, 'nor one for another harness');
      same(proofCheck(sealed.receipt, { ...sealed.expectation, arms: [{ id: 'sa', treeId: 'tree-sa', paramsHash: sha256(JSON.stringify({ id: 'other' })) }] }, sealed.w.repo.readFile),
        { status: 'incomplete', reasons: ['stale arm sa'] }, 'nor one for other parameters of an arm');
    },
  },
  {
    name: 'activate: the freeze names exactly the comparator cells',
    async run() {
      const { d, controls } = await collectionKit();
      const cell = '24x24-hell-1';
      const other = '14x14-hell-1';
      await onCollections(async (dir) => {
        const { rowsOf, world, go, written, parse, freezeOf, comparatorCellsOf } = await activateWorld(dir);
        // The pilot of 24x24 reaches ten on three valid requests: it is activated, and its comparator cell joins the 17 of the initial collection.
        const files = { [cell]: await rowsOf(cell, 3, 2) };
        const initial = [...d.cells.failingNightmare, ...d.cells.hell1Validated, ...controls];
        const record = [...initial, cell];
        same([initial.length, comparatorCellsOf(files)], [17, record], 'the activation has 18 comparator cells: the 17 of the initial collection, then 24x24 Hell 1');
        const message = (/** @type {string} */ parts) => `manifest: the freeze file's classes do not match the comparator cells of the collection (${parts})\n`;
        const refused = async (/** @type {string} */ name, /** @type {any} */ freeze, /** @type {string} */ expected) => {
          const paths = await world(name, files, freeze);
          const out = await go(paths);
          same([out.code, out.out, out.err, written(paths)], [1, '', expected, []], `${name}: exit ${out.code}, ${JSON.stringify(out.err)}, ${written(paths).length} files written`);
        };
        // (a) to (c): the three differences, each alone.
        await refused('a-missing', freezeOf(initial), message('not in a class 24x24-hell-1'));
        await refused('b-unmeasured', freezeOf([...initial, cell, other]), message('not measured 14x14-hell-1'));
        await refused('c-twice', { classes: [{ id: 'a', cells: record, screen: 'fr-frozen', noScreen: 'fr-frozen-none' }, { id: 'b', cells: ['14x14-nightmare'], screen: 'fr-frozen', noScreen: 'fr-frozen-none' }] },
          message('in more than one class 14x14-nightmare'));
        // The three together: each list in its own order (the record's, the record's, sorted) and the parts in this order, joined by `; `.
        const [a, b, c, e, f] = d.cells.failingNightmare;
        await refused('abc-together', {
          classes: [
            { id: 'a', cells: [...record.filter((x) => ![e, '20x20-hell-1', cell].includes(x)), 'zz-extra', other], screen: 'fr-frozen', noScreen: 'fr-frozen-none' },
            { id: 'b', cells: [c, a], screen: 'fr-frozen', noScreen: 'fr-frozen-none' },
          ],
        }, message(`not in a class ${e}, 20x20-hell-1, ${cell}; in more than one class ${a}, ${c}; not measured ${other}, zz-extra`));
        // A cell listed twice in one class is in more than one class, as T09e's manifest reads it; a class of no cell names nothing.
        await refused('d-same-class', { classes: [{ id: 'a', cells: [...record, f], screen: 'fr-frozen', noScreen: 'fr-frozen-none' }] }, message(`in more than one class ${f}`));
        await refused('e-no-classes', { classes: [] }, message(`not in a class ${record.join(', ')}`));
        // A freeze file that is no freeze file is refused as such, before anything is written.
        for (const [name, content] of /** @type {[string, string][]} */ ([['f-malformed', '{ "classes": [{ "id": 1 }] }'], ['g-no-classes', '{}'], ['h-not-json', '{']])) {
          const paths = await world(name, files);
          writeText(paths.freeze, content);
          const out = await go(paths);
          same([out.code, out.out, out.err, written(paths)], [1, '', `manifest: ${rel(paths.freeze)} is not a freeze file: its classes must be [{ id, cells, screen, noScreen }]\n`, []], `${name}: exit ${out.code}, ${JSON.stringify(out.err)}`);
        }
        // (d) the 18 once each, in two classes: the record, the plan and the template are written.
        const paths = await world('d-exact', files, { classes: [{ id: 'a', cells: initial, screen: 'fr-frozen', noScreen: 'fr-frozen-none' }, { id: 'b', cells: [cell], screen: 'fr-frozen', noScreen: 'fr-frozen-none' }] });
        const done = await go(paths);
        same([done.code, written(paths).length, parse(paths.activation).comparatorCells.map((/** @type {any} */ x) => x.cell)], [0, 3, record], `the exact freeze: exit ${done.code}, ${JSON.stringify(done.err)}`);
        same(parse(paths.activation).epoch.freeze, { path: rel(paths.freeze), sha256: sha256File(paths.freeze) }, 'the record binds the freeze file it checked');
      });
    },
  },
  {
    name: 'approval: re-read and cumulative',
    async run() {
      const { m } = await matrixKit();
      same(m.approvalFor({ spentS: 600, earlierGuardS: [], guardS: 1200 }),
        { spentS: 600, assumedEarlierGuardS: 0, roundCountedSBeforeApproval: 600, requestedAdditionalGuardS: 1200, requestedCumulativeRoundMinutes: 30 },
        'no earlier approval: 600 s spent and a guard of 1,200 s are 30 minutes');
      same(m.approvalFor({ spentS: 600, earlierGuardS: [300], guardS: 1200 }),
        { spentS: 600, assumedEarlierGuardS: 300, roundCountedSBeforeApproval: 900, requestedAdditionalGuardS: 1200, requestedCumulativeRoundMinutes: 35 },
        'an earlier guard of 300 s is assumed spent: 900 s before the approval, 35 minutes');
      same(m.approvalFor({ spentS: 600, earlierGuardS: [300, 61], guardS: 1200 }).requestedCumulativeRoundMinutes, 37, 'the earlier guards add and a part of a minute rounds up (2,161 s)');
      assert(thrownBy(() => m.approvalFor({ spentS: -1, earlierGuardS: [], guardS: 0 })).includes('spentS must be a number from 0'), 'a negative time spent');
      assert(thrownBy(() => m.approvalFor({ spentS: 0, earlierGuardS: 300, guardS: 0 })).includes('earlierGuardS must be a list'), 'earlier guards that are no list');
      assert(thrownBy(() => m.approvalFor({ spentS: 0, earlierGuardS: [-1], guardS: 0 })).includes('earlierGuardS[0]'), 'a negative earlier guard');
      assert(thrownBy(() => m.approvalFor({ spentS: 0, earlierGuardS: [], guardS: Number.NaN })).includes('requestedAdditionalGuardS'), 'a guard that is no number');

      // The command re-reads the time spent every time and takes each guard from the plans' prices (A: one required rows step of 4 rows of 100 s,
      // counted 447 s, guard 558.75 s, and one optional process step, guard 183.75 s; B: 2 rows of 50 s, counted 147 s, guard 183.75 s).
      const dir = fresh(join(SELFTEST_DIR, 'approval'));
      try {
        const plan = (/** @type {string} */ task, /** @type {any[]} */ steps) => ({ task, generatedBy: 'by hand', runnable: true, blockedBy: [], prerequisites: [], allocationMinutes: 1, optionalMinutes: 0, steps });
        const A = plan('A', [ownerRowsStep('rows-a', 4, 100), ownerProcessStep('probe', [100], true)]);
        const B = plan('B', [ownerRowsStep('rows-b', 2, 50)]);
        writeJson(join(dir, 'A.json'), A);
        writeJson(join(dir, 'B.json'), B);
        same([m.planGuardS(A), m.planGuardS(A, { optional: true }), m.planGuardS(B)], [558.75, 742.5, 183.75], 'the guards of the plans: required steps, with the optional step, and B');
        let spent = 600;
        const ask = (/** @type {string[]} */ ...words) => captureOutput(() => m.approvalCommand([...words, '--label', 'frozen', '--source-label', 'x'], { plansDir: dir, spentS: () => spent }));
        const line = (/** @type {{ code: number, out: string, err: string }} */ r) => {
          same([r.code, r.err], [0, ''], `exit ${r.code}, ${JSON.stringify(r.err)}`);
          assert(r.out.endsWith('\n') && r.out.split('\n').length === 2, 'one JSON line');
          return JSON.parse(r.out);
        };
        same(line(await ask('--plan', 'B')), { plan: 'B', ...m.approvalFor({ spentS: 600, earlierGuardS: [], guardS: 183.75 }) }, 'B alone');
        same(line(await ask('--plan', 'B')).requestedCumulativeRoundMinutes, 14, 'B alone: 783.75 s is 14 minutes');
        const after = line(await ask('--plan', 'B', '--after', 'A'));
        same([after.assumedEarlierGuardS, after.roundCountedSBeforeApproval, after.requestedAdditionalGuardS, after.requestedCumulativeRoundMinutes], [558.75, 1158.75, 183.75, 23],
          'B after A: the guard of A is assumed spent, 1,342.5 s is 23 minutes');
        same([line(await ask('--plan', 'A')).requestedCumulativeRoundMinutes, line(await ask('--plan', 'A', '--optional')).requestedCumulativeRoundMinutes], [20, 23],
          'A: 1,158.75 s is 20 minutes, with the optional step 1,342.5 s is 23');
        spent = 1800;
        same(line(await ask('--plan', 'B')).spentS, 1800, 'the time spent is read again every time');
        // A plan that has no file yet is priced later; nothing is printed.
        for (const [id, when] of /** @type {[string, string][]} */ ([['V4-S4', 'activation'], ['V4-S4C', 'resolution'], ['V4-S4X', 'activation'], ['V4-S4XC', 'resolution']])) {
          const r = await ask('--plan', id);
          same([r.code, r.out, r.err], [1, '', `approval: ${id} is priced at its ${when}; ask then\n`], `${id} before its file`);
        }
        const unknown = await ask('--plan', 'Z');
        same([unknown.code, unknown.out, unknown.err], [1, '', `approval: no plan ${rel(join(dir, 'Z.json'))}\n`], 'a plan that is none of them');
        writeJson(join(dir, 'V4-S4.json'), plan('V4-S4', [ownerRowsStep('rows-c', 2, 50)]));
        same(line(await ask('--plan', 'V4-S4')).plan, 'V4-S4', 'once its plan is written, V4-S4 is asked like any plan');
        const refused = async (/** @type {string} */ what, /** @type {string[]} */ args, /** @type {string} */ expected) => {
          const r = await captureOutput(() => m.approvalCommand(args, { plansDir: dir, spentS: () => spent }));
          same([r.code, r.out, r.err], [1, '', expected], `${what}: exit ${r.code}, ${JSON.stringify(r.err)}`);
        };
        await refused('another label', ['--plan', 'A', '--label', 'selftest'], 'approval: --label frozen only\n');
        await refused('no plan', ['--label', 'frozen'], 'approval: needs --plan <id>\n');
        await refused('an earlier plan with no file', ['--plan', 'B', '--after', 'A,Z', '--label', 'frozen'], `approval: --after Z: no plan ${rel(join(dir, 'Z.json'))}\n`);
        await refused('an unknown argument', ['--plan', 'A', '--bogus', 'x', '--label', 'frozen'], 'approval: unknown argument: --bogus\n');
        const viaMain = await captureOutput(() => m.main(['approval', '--label', 'selftest', '--plan', 'A']));
        same([viaMain.code, viaMain.err], [1, 'approval: --label frozen only\n'], 'main dispatches approval');
        // The real plans: the same numbers as the library, with the time spent read from the invocation logs.
        const real = await captureOutput(() => m.approvalCommand(['--plan', 'V4-S2', '--label', 'frozen', '--source-label', 'x']));
        const got = line(real);
        const realPlan = JSON.parse(readFileSync(join(IG_DIR, 'plans', 'V4-S2.json'), 'utf8'));
        same(got, { plan: 'V4-S2', ...m.approvalFor({ spentS: totals(readInvocations('frozen'), '').roundCountedS, earlierGuardS: [], guardS: m.planGuardS(realPlan) }) }, 'V4-S2 from the compiled plan and the invocation logs');
        assert(got.spentS > 0 && got.requestedCumulativeRoundMinutes * 60 >= got.spentS + got.requestedAdditionalGuardS, 'the cap covers what was spent and the guard');
        const second = line(await captureOutput(() => m.approvalCommand(['--plan', 'V4-LIVE', '--after', 'V4-S2', '--label', 'frozen', '--source-label', 'x'])));
        same([second.assumedEarlierGuardS, second.roundCountedSBeforeApproval], [got.requestedAdditionalGuardS, got.spentS + got.requestedAdditionalGuardS], 'V4-LIVE after V4-S2 assumes its guard spent');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'price: stage 5 is not priced here',
    async run() {
      const { m } = await matrixKit();
      // Two families of one Hell 1 cell with 3 and 5 probes of 100/200/300 and 100..500 ms: 4 probes a family, 262.5 ms a probe, 60 x 4 x 262.5 / 1000 / 4 = 15.75 s.
      const probes = (/** @type {number[]} */ ...ms) => ms.map((x) => ({ ms: x }));
      const families = [
        { case: 'a-hell-1', probes: probes(100, 200, 300) }, { case: 'a-hell-1', probes: probes(100, 200, 300, 400, 500) },
        { case: 'c-hell-2', probes: probes(1000, 1000) }, { case: 'other-nightmare', probes: probes(5000) },
      ];
      const profiles = [{ canonical: { ms: 1000 } }, { canonical: { ms: 3000 } }, { canonical: { ms: null } }, {}];
      const stage5 = m.stage5Items({ families, profiles, hell1: ['a-hell-1', 'b-hell-1'], hell2: ['c-hell-2'] });
      same(stage5.map((i) => i.id), ['S5-1', 'S5-2', 'S5-3', 'S5-4', 'S5-5'], 'the five items');
      const [one, two, c4, c3, browser] = stage5;
      same([one.indicationS, one.unindicated, one.cells?.map((c) => c.families)], [15.75, ['b-hell-1'], [2, 0]], 'S5-1: the cell with families is indicated, the one without is listed, never estimated');
      same([two.indicationS, c4.indicationS, c3.indicationS, browser.indicationS], [30, 5, 0, null], 'S5-2 (60 x 2 x 1000 / 1000 / 4), S5-3 (1.25 x 4 s of the two timed profiles), S5-4 (data only) and S5-5 (none)');
      assert(thrownBy(() => m.stage5Items({ families: [], profiles: [], hell1: 'x', hell2: [] })).includes('needs the families'), 'the inputs are checked');
      // manifestOf over a minimal input keeps every one of them unpriced, with no ceiling and no approval request, even for an input that carries them.
      const dirty = stage5.map((i) => ({ ...i, ceilingS: 1, guardS: 1, requestedCumulativeRoundMinutes: 1 }));
      const record = m.manifestOf({ plans: [], universe: { collections: {} }, stage5: /** @type {any} */ (dirty), spentS: 100, inventory: null });
      for (const item of record.stage5) {
        same([item.priced, item.pricedBy, 'ceilingS' in item, 'guardS' in item, 'requestedCumulativeRoundMinutes' in item], [false, 'N-V4-04', false, false, false], `${item.id}: unpriced, priced by N-V4-04, no ceiling and no request`);
      }
      same(record.approvals, [], 'no approval request among the approvals');
      same(record.unpriced.map((/** @type {any} */ u) => [u.id, u.status, u.pricedBy]), ['S5-1', 'S5-2', 'S5-3', 'S5-4', 'S5-5'].map((id) => [id, 'unpriced', 'N-V4-04']), 'they are listed as unpriced, each with the item that prices it');
      const md = m.manifestMarkdown(record);
      const section = md.slice(md.indexOf('## 1. '), md.indexOf('## 2. '));
      for (const id of ['S5-1', 'S5-2', 'S5-3', 'S5-4', 'S5-5']) {
        assert(section.includes(`${id} (unpriced)`), `section 1 lists ${id} as unpriced`);
      }
      assert(section.includes('### 1.4 Unpriced') && section.includes('no ceiling and no approval request'), 'section 1 says why');
      assert(section.includes('PM1 inventory: missing'), 'a missing inventory is said so');
      assert(m.manifestMarkdown(m.manifestOf({ plans: [], universe: { collections: {} }, spentS: 0, inventory: { families: 116, alternate: 113, populations: 24 } }))
        .includes('Data-only PM1 inventory, stage 1 (IG-P-Q24 (b); it opens no route): docs/improve-generating/evidence/frozen/V4-T03/inventory.md, 116 families, 113 alternate rows in 24 populations.'), 'the inventory line');
    },
  },
  {
    name: 'price: the universe keeps its options apart',
    async run() {
      const { m } = await matrixKit();
      // The initial collection: 20 rows of 200 s under a 130-s limit (predicted censored: 4 invocations of 6, 6, 6 and 2 rows, 2,808 s of node) and a comparator.
      const initial = { groups: [ownerGroup('V4-S4', 'fr-frozen', 'x-nightmare', ['S4-1'], 20, 200, 130)], comparators: [ownerGroup('V4-S4C', 'shipped-uncapped', 'x-nightmare', ['S4-C'], 4, 100, 260, true)] };
      const board = (/** @type {string} */ arm) => ownerGroup('V4-S4', arm, 'h-hell-1', ['S4-5'], 5, 100, 130);
      const conditional = { groups: [board('fr-frozen'), board('fr-frozen-none')], comparators: [ownerGroup('V4-S4C', 'shipped-uncapped', 'h-hell-1', ['S4-C'], 5, 100, 260, true)] };
      const optional = { groups: [ownerGroup('V4-S4', 'log-link', 'x-nightmare', ['S4-6'], 5, 100, 260)], comparators: [] };
      const record = m.manifestOf({ plans: [], universe: { collections: { initial, conditional, optional, second: { groups: [], comparators: [] } } }, spentS: 600, inventory: null });
      const first = record.universe.collections.initial;
      same([first.groupsTotal.projectS, first.groupsTotal.invocations, first.groupsTotal.countedS, first.groupsTotal.guardS, first.groupsTotal.ceilingS, first.groupsTotal.completed, first.groupsTotal.censored],
        [2808, 4, 2988, 3735, 18900, 0, 20], 'the headline group by hand: 2,808 s of node, four invocations, 180 s of quiet, guard 1.25 x 2,988, ceiling 20 x 945, all 20 rows predicted censored');
      const price = (/** @type {any} */ g) => m.stepPrice(g.price);
      same(first.total.countedS, price(initial.groups[0]).countedS + price(initial.comparators[0]).countedS, 'the initial total is its groups and its comparator and nothing else');
      assert(first.total.countedS < record.universe.stage4.countedS, 'the options are not in it');
      const boardBlock = record.universe.boards[0];
      same([record.universe.boards.length, boardBlock.cell, boardBlock.groups.count, boardBlock.comparators.count], [1, 'h-hell-1', 2, 1], 'the conditional board is apart');
      same([boardBlock.total.countedS, Math.ceil(boardBlock.total.ceilingS / 60)], [2 * price(conditional.groups[0]).countedS + price(conditional.comparators[0]).countedS, Math.ceil((2 * 5 + 5) * 945 / 60)],
        'the board has its own projected and ceiling minutes');
      assert(near(boardBlock.total.guardS, 1.25 * boardBlock.total.countedS) && boardBlock.total.ceilingMin === 237, 'and its guard: 1.25 x its projection; the ceiling 15 x 945 s is 237 minutes');
      same(record.options.map((/** @type {any} */ o) => [o.id, o.adds, o.countedS]), [
        ['S4-6', 'V4-S4', price(optional.groups[0]).countedS],
        ['conditional board h-hell-1', 'V4-S4 (the twins) and V4-S4C (the comparator)', boardBlock.total.countedS],
      ], 'S4-6 and the board are options with their own prices');
      assert(Math.abs(record.universe.stage4.countedS - (first.total.countedS + boardBlock.total.countedS + price(optional.groups[0]).countedS)) < 1e-9, 'the whole universe is the initial collection, the board and S4-6');
      const names = record.approvals.map((/** @type {any} */ a) => a.id);
      same(names, ['V4-S4', 'V4-S4C'], 'the approvals name the stage-4 entries (no plan was given)');
      const ask = record.approvals[0];
      same([ask.when, ask.status], ['after its data-only activation: the optional scope first, then the timed allowance', 'indication'], 'V4-S4 is asked after its data-only activation');
      same([ask.requestedAdditionalGuardS, ask.roundCountedSBeforeApproval, ask.requestedCumulativeRoundMinutes], [first.groupsTotal.guardS, 600, Math.ceil((600 + first.groupsTotal.guardS) / 60)], 'its three fields: the options are not in its guard');
      same([record.approvals[1].assumedEarlierGuardS, record.approvals[1].roundCountedSBeforeApproval, record.approvals[1].assumes], [ask.guardS, 600 + ask.guardS, 'assumes each earlier approval is spent to its guard; re-read when asked'], 'V4-S4C assumes V4-S4 spent to its guard');
      const md = m.manifestMarkdown(record);
      for (const text of ['conditional board h-hell-1: the twins (S4-5)', 'conditional board h-hell-1: the comparator', 'optional S4-6', '**initial collection, total**', 'An indication, not an allocation (plan §5.1)', 'planning projection: 1.25 x factor x MP12b1 median; not a bound',
        'after its data-only activation: the optional scope first, then the timed allowance']) {
        assert(md.includes(text), `the Markdown says "${text}"`);
      }
      assert(md.includes(`| **initial collection, total** | 2 | 24 | 5 | ${(first.total.countedS / 60).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} |`), 'the initial total row');
    },
  },
  {
    name: 'price: ceilings beside projections',
    async run() {
      const { m } = await matrixKit();
      const rows = ownerRowsStep('rows-a', 2, 50);
      const probe = ownerProcessStep('probe', [100]);
      const plan = { task: 'V4-S2', runnable: true, blockedBy: [], prerequisites: [], allocationMinutes: 1, optionalMinutes: 0, steps: [{ id: 'prerequisites', locked: false, node: ['x'], optional: false, dependsOn: [], expect: 'x' }, rows, probe] };
      const record = m.manifestOf({ plans: [plan], universe: { collections: {} }, spentS: 0, inventory: null });
      const block = record.plans[0];
      const locked = block.steps.filter((/** @type {any} */ s) => s.locked);
      same(locked.map((/** @type {any} */ s) => s.id), ['rows-a', 'probe'], 'the two locked steps, the unlocked one is only listed');
      for (const [step, input] of [[locked[0], rows.price], [locked[1], probe.price]]) {
        const priced = m.stepPrice(input);
        same([step.ceilingS, step.countedS, step.guardS, step.completed, step.censored], [priced.ceilingS, priced.countedS, priced.guardS, priced.completed, priced.censored], `${step.id}: T11b's numbers`);
        assert(step.ceilingS >= step.countedS, `${step.id}: the ceiling is at least its projection`);
      }
      same([locked[0].ceilingS, locked[1].ceilingS, locked[0].countedS, locked[1].countedS], [1890, 945, 147, 147], 'by hand: 2 x 945 and 1 x 945; 102 s of node and 45 s of quiet each');
      same([block.required.ceilingS, block.required.ceilingMin, block.required.countedMin, block.required.guardMin], [2835, 48, 294 / 60, 1.25 * 294 / 60], 'the plan: the ceilings sum to 2,835 s, 47.25 minutes rounded up to 48');
      same([block.required.completed, block.required.censored, block.optional.count], [3, 0, 0], 'three observations predicted to complete, none cut, no optional step');
      // A plan with a step that is not priceable is refused, never priced short.
      const bad = { ...plan, steps: [ownerRowsStep('rows-bad', 1, 100, 880)] };
      assert(thrownBy(() => m.manifestOf({ plans: [bad], universe: { collections: {} }, spentS: 0 })).includes('is not admissible'), 'an inadmissible step is refused');
    },
  },
  {
    name: 'price: the text quotes the plan and the manifest is written',
    async run() {
      const { m } = await matrixKit();
      const planText = readFileSync(join(ROOT, 'docs', 'improve-generating', 'plan.md'), 'utf8');
      const quotes = m.planQuotes(planText);
      assert(quotes.stopping.startsWith('**Stopping.** A cell\'s gate verdict is settled at its third request that fails to reach ten;') && quotes.stopping.endsWith('never extrapolated.'), 'the stopping rule, joined on one line');
      assert(quotes.budget.includes('about 3.4 to 4.2 h'), 'the budget paragraph');
      same(quotes.risks.map((r) => r.title), ['Small samples.', 'Browser against Node.', 'A per-call budget can lose completions.', 'A screen class can come out inconclusive.', 'A second validation is possible'], 'the five risks that bear on the price');
      assert(quotes.risks.every((r) => r.text.startsWith('**') && !r.text.startsWith('- ')), 'each begins with its bold title');
      assert(quotes.prefetch.startsWith('**Replay prefetch.**'), 'the replay-prefetch bullet of section 9');
      assert(thrownBy(() => m.planQuotes(planText.replace('**Stopping.**', '**Halting.**'))).includes('plan.md has no Stopping paragraph'), 'a quote that is not found throws');
      assert(thrownBy(() => m.planQuotes(planText.replace('about 3.4 to 4.2 h', 'about 4 h'))).includes('no longer gives stage 4'), 'a budget that changed throws');
      // `price` on the real records, into a scratch folder: the numbers are the compiled plans' own.
      const dir = fresh(join(SELFTEST_DIR, 'price'));
      try {
        const { PRICE_PATHS } = m;
        const out = await captureOutput(() => m.priceCommand(['--label', 'frozen', '--source-label', 'frozen 3fc65f4'], { ...PRICE_PATHS, out: dir }));
        same([out.code, out.err], [0, ''], `price: exit ${out.code}, ${JSON.stringify(out.err)}`);
        same(out.out.split('\n').slice(0, 2), [`wrote ${rel(join(dir, 'manifest.json'))}`, `wrote ${rel(join(dir, 'manifest.md'))}`], 'the two files it wrote');
        const record = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
        const md = readFileSync(join(dir, 'manifest.md'), 'utf8');
        for (const task of ['V4-S2', 'V4-LIVE']) {
          const plan = JSON.parse(readFileSync(join(IG_DIR, 'plans', `${task}.json`), 'utf8'));
          const forecast = plan.steps.filter((/** @type {any} */ s) => s.locked && !s.optional).reduce((sum, /** @type {any} */ s) => sum + s.projectS + 45 * s.invocations, 0);
          const block = record.plans.find((/** @type {any} */ p) => p.task === task);
          assert(Math.abs(block.required.countedS - forecast) < 1e-6, `${task}: the projected counted seconds are the runner's dry-run forecast`);
          same([block.allocationMinutes, Math.ceil(block.required.countedS / 60)], [plan.allocationMinutes, plan.allocationMinutes], `${task}: the allocation is the counted minutes rounded up`);
        }
        const spent = totals(readInvocations('frozen'), '').roundCountedS;
        same([record.round.spentS, record.approvals[0].id, record.approvals[0].roundCountedSBeforeApproval, record.approvals[1].id], [spent, 'V4-S2', spent, 'V4-LIVE'], 'the time spent is the invocation logs\' and the first request starts from it');
        same(record.approvals.map((/** @type {any} */ a) => a.id), ['V4-S2', 'V4-LIVE', 'V4-S4', 'V4-S4C', 'V4-S4X', 'V4-S4XC'], 'the approvals in order');
        same(record.unpriced.map((/** @type {any} */ u) => u.id), ['S5-1', 'S5-2', 'S5-3', 'S5-4', 'S5-5', 'browser calibration'], 'stage 5 and the browser calibration are unpriced');
        same(record.stage5[0].unindicated, ['26x26-hell-1'], 'IGP-05 has no family of the twelfth Hell 1 cell: no indication for it');
        same(record.noReference, ['20x20-hell-1'], 'the one cell without an MP12b1 median');
        assert(record.inputs.every((/** @type {any} */ i) => /^[0-9a-f]{64}$/.test(i.sha256) && !i.path.includes('\\') && !/^[A-Za-z]:/.test(i.path)), 'every input has a repository path and a SHA-256');
        const planInput = record.inputs.find((/** @type {any} */ i) => i.path === 'tools/ig-proto/plans/V4-S2.json');
        same(planInput?.sha256, sha256File(join(IG_DIR, 'plans', 'V4-S2.json')), 'the plan input is hashed as the plan file');
        const at = ['## 1. ', '## 2. ', '## 3. ', '## 4. ', '## 5. ', '## 6. ', '## 7. ', '## 8. '].map((h) => md.indexOf(h));
        assert(at.every((x, i) => x > 0 && (i === 0 || x > at[i - 1])), 'the eight sections in order');
        assert(md.includes('Data-only PM1 inventory, stage 1 (IG-P-Q24 (b); it opens no route): docs/improve-generating/evidence/frozen/V4-T03/inventory.md, '), 'the inventory line');
        assert(/bench-page factor/.test(md) && md.includes('Ceiling unpriced'), 'the browser parts are labelled and unpriced');
        assert(md.includes('(it was `units x 345` under the 300-s limit)') && md.includes('with 15 s throughout, the first approvals\''), 'section 7 states the rules');
        const refused = await captureOutput(() => m.priceCommand(['--label', 'selftest'], { ...PRICE_PATHS, out: dir }));
        same([refused.code, refused.out, refused.err], [1, '', 'price: --label frozen only\n'], 'another label is refused');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'p6: pairs and identity',
    async run() {
      const verdict = (/** @type {Record<string, any>} */ o, /** @type {Record<string, any>} */ n) => p6.identity(p6Run('c-a', 0, o), p6Run('c-a', 0, n));
      same(verdict({}, {}), { category: 'equal', path: null }, 'equal summaries and equal production digests');
      same(verdict({}, { details: p6Details(10, { digest: 'b'.repeat(64) }) }), { category: 'differ', path: 'details.resultDigest' }, 'equal summaries, different digests: differ, never equal');
      same(verdict({}, { acceptedCount: 7, details: p6Details(7) }), { category: 'metric-prefix-only', path: null }, 'ten puzzles against the first seven of the same summaries');
      const changed = p6Details(10);
      changed.puzzles[3].score = 999;
      same(verdict({}, { details: changed }), { category: 'differ', path: 'details.puzzles[3].score' }, 'a changed score in the fourth common puzzle');
      same(verdict({}, { acceptedCount: 0, details: p6Details(0) }), { category: 'no-puzzle-evidence', path: null }, 'an empty side');
      same(verdict({ acceptedCount: 0, details: p6Details(0) }, { acceptedCount: 0, details: null }), { category: 'no-puzzle-evidence', path: null }, 'two empty sides');
      same(verdict({}, { details: p6Details(10, { digest: null }) }), { category: 'incomplete', path: 'details.resultDigest' }, 'a nonempty side without its digest');
      same(verdict({}, { details: null }), { category: 'incomplete', path: 'details' }, 'a nonempty side without details');
      same(verdict({}, { details: { ...p6Details(10), sampleFailures: 5, sampleUnrateable: 2 } }), { category: 'equal', path: null }, 'the sampling fields are no part of an identity');
      same(verdict({}, { details: { ...p6Details(10), K: 9 } }), { category: 'differ', path: 'details.K' }, 'a differing set summary');
      same(verdict({}, { acceptedCount: 7, details: p6Details(7, { digest: null }) }), { category: 'metric-prefix-only', path: null }, 'at unequal counts the digests are not required');
      same([p6.resultDigest(p6Run('c-a', 0)), p6.resultDigest(p6Run('c-a', 0, { details: null }))], ['a'.repeat(64), null], 'resultDigest');
      const side = (/** @type {string[]} */ cells, /** @type {Record<string, any>} */ extra = {}) => cells.flatMap((c) => [0, 1, 2, 3, 4].map((rep) => p6Run(c, rep, extra)));
      const olds = side(['c-b', 'c-a']);
      const pairs = p6.pairRuns(olds, side(['c-a', 'c-b']));
      same([pairs.length, pairs[0].caseId, pairs[0].rep, pairs[9].caseId, pairs[9].rep], [10, 'c-a', 0, 'c-b', 4], 'ten pairs, cell then rep');
      assert(pairs.every((p) => p.old.caseId === p.new.caseId && p.old.rep === p.new.rep), 'each pair is of one cell and one rep');
      same(p6.pairRuns(side(['14x14-master', '26x26-master']), side(['26x26-master', '14x14-master'])).map((p) => p.caseId).filter((c, i) => i % 5 === 0), ['14x14-master', '26x26-master'], 'the cells keep the order of GROUPS');
      const missing = thrownBy(() => p6.pairRuns(olds, side(['c-a', 'c-b']).slice(1)));
      assert(missing === 'p6-bench: unpaired run c-a #0', `a run without its pair: ${missing}`);
      const twice = thrownBy(() => p6.pairRuns([...olds, p6Run('c-a', 0)], side(['c-a', 'c-b'])));
      assert(twice === 'p6-bench: unpaired run c-a #0', `a duplicate: ${twice}`);
      const seed = thrownBy(() => p6.pairRuns(olds, [...side(['c-b']), ...side(['c-a']).map((r) => ({ ...r, seed: `landscape/c-a/${r.rep + 1}` }))]));
      assert(seed.startsWith('p6-bench: unpaired run c-a #'), `another seed: ${seed}`);
    },
  },
  {
    name: 'p6: statistics and ratios',
    async run() {
      const five = [1000, 2000, 3000, 4000, 10000].map((ms, i) => p6Run('c-a', i, { responseMs: ms, firstReadyMs: ms / 10, tenthReadyMs: ms / 2 }));
      const s5 = p6.cellStats(five);
      same([s5.n, s5.response.median, s5.response.p95, s5.response.max, s5.t1.median, s5.t10.n, s5.t10.p95], [5, 3000, 10000, 10000, 300, 5, 5000], 'five requests: the p95 is the maximum');
      const twenty = Array.from({ length: 20 }, (_, i) => p6Run('c-a', i % 5, { responseMs: (i + 1) * 1000 }));
      same(p6.cellStats(twenty).response.p95, 19000, 'twenty values: the nearest rank 19');
      const nine = { acceptedCount: 9, tenthReadyMs: null, details: p6Details(9), partialReason: 'layouts-not-found' };
      const mixed = [p6Run('c-a', 0), p6Run('c-a', 1), p6Run('c-a', 2, { ...nine, layoutsExhausted: true, layoutTotal: 9 }), p6Run('c-a', 3, nine), p6Run('c-a', 4)];
      const sm = p6.cellStats(mixed);
      same([sm.n, sm.tenOfN, sm.tenOrProvenAllOfN, sm.t10.n, sm.accepted], [5, 3, 4, 3, { 9: 2, 10: 3 }], 'ten of n excludes the nine-puzzle requests; ten or proven-all counts the one that proved every arrangement; T10 only over the ten');
      const mk = (/** @type {Record<string, any>} */ o, /** @type {Record<string, any>} */ n) => ({ old: p6Run('c-a', 0, o), new: p6Run('c-a', 0, n) });
      const pairs = [
        mk({ responseMs: 4000, firstReadyMs: 1000, tenthReadyMs: 3000 }, { responseMs: 2000, firstReadyMs: 500, tenthReadyMs: 1500 }),
        mk({ responseMs: 9000, firstReadyMs: 1000, tenthReadyMs: 6000 }, { responseMs: 3000, firstReadyMs: 1000, tenthReadyMs: 2000 }),
        mk({ responseMs: 8000, firstReadyMs: 1000, tenthReadyMs: 4000 }, { responseMs: 8000, firstReadyMs: 2000, tenthReadyMs: 4000 }),
        mk({ responseMs: 6000 }, { acceptedCount: 4, tenthReadyMs: null, responseMs: 3000, details: p6Details(4) }),
        mk({ responseMs: 5000 }, { responseMs: 0 }),
      ];
      const r = p6.pairedRatios(pairs);
      same(r.response, { n: 4, median: 2, min: 1, max: 3, excluded: 1 }, 'response: the pair with a zero endpoint is excluded');
      same(r.t1, { n: 5, median: 1, min: 0.5, max: 2, excluded: 0 }, 'T1');
      same(r.t10, { n: 4, median: 1.5, min: 1, max: 3, excluded: 1 }, 'T10: only where both sides reached ten');
      same(r.t10MinusT1, { n: 4, median: 1.75, min: 1, max: 5, excluded: 1 }, 'T10 - T1');
      same(p6.pairedRatios(pairs.slice(0, 2)).response, { n: 2, median: null, min: 2, max: 3, excluded: 0 }, 'the median is null below three pairs');
      same(p6.pairedRatios([]).t10, { n: 0, median: null, min: null, max: null, excluded: 0 }, 'no pair, no statistic');
    },
  },
  {
    name: 'p6: the memory checks',
    async run() {
      const MiB = 1048576;
      const stats = (/** @type {number} */ accounted, /** @type {number | null} */ process_) => p6.cellStats([p6Run('c-a', 0, { peakAccountedBytes: accounted, peakProcessBytes: process_ })]);
      same([stats(1196 * MiB, 1000).checks.byteAccounting.status, stats(1196 * MiB + 1, 1000).checks.byteAccounting.status], ['pass', 'fail'], 'the accounted peak at four workers: 1,196 MiB passes, one byte more fails');
      same([stats(1000, 1.5 * 1024 * MiB).checks.peakProcessMemory.status, stats(1000, 1.5 * 1024 * MiB + 1).checks.peakProcessMemory.status], ['pass', 'fail'], 'the whole-process peak: 1.5 GiB passes, one byte more fails');
      same(stats(1000, null).checks.peakProcessMemory.status, 'not-measured', 'a run without a process peak is not measured');
      const tooLarge = p6.cellStats([p6Run('c-a', 0, { errors: [{ phase: 'sampling', code: 'model-too-large', message: 'x' }] })]);
      same([tooLarge.checks.modelTooLarge.status, tooLarge.samplingErrors], ['fail', 1], 'model-too-large fails the check and is a sampling error here');
      same(p6.compareReports(p6World().input()).cells.length, 7, 'the control: the synthetic inputs are accepted');
      const refuse = (/** @type {Record<string, any>} */ tweak, /** @type {string} */ fragment) => {
        const message = thrownBy(() => p6.compareReports(p6World(tweak).input()));
        assert(message.startsWith('p6-bench: ') && message.includes(fragment), `expected "${fragment}", got "${message}"`);
      };
      refuse({ run: (/** @type {any} */ run, /** @type {string} */ s) => { if (s === 'new' && run.caseId === '26x26-expert' && run.rep === 2) { run.peakProcessBytes = null; } } },
        'the memory check peakProcessMemory of new 26x26-expert is not-measured');
      refuse({ run: (/** @type {any} */ run, /** @type {string} */ s) => { if (s === 'old' && run.caseId === '10x10-nightmare' && run.rep === 0) { run.peakAccountedBytes = 1196 * MiB + 1; } } },
        'the memory check byteAccounting of old 10x10-nightmare is fail');
      refuse({ run: (/** @type {any} */ run, /** @type {string} */ s) => { if (s === 'new' && run.caseId === '18x18-nightmare' && run.rep === 1) { run.errors.push({ phase: 'sampling', code: 'model-too-large', message: 'x' }); } } },
        'the memory check modelTooLarge of new 18x18-nightmare is fail');
    },
  },
  {
    name: 'p6: the ledger, the reservation and the preflight',
    async run() {
      const newCommit = 'b'.repeat(40);
      const base = { newCommit, checkpoint: null, resumeInstructed: false, pending: null };
      const line = (/** @type {string} */ group, /** @type {string} */ side, /** @type {Record<string, any>} */ extra = {}) => p6Line(group, side, newCommit, extra);
      const text = (/** @type {any[]} */ rows) => `${rows.map((l) => JSON.stringify(l)).join('\n')}\n`;
      same(p6.readLedger(text([line('A', 'old'), line('A', 'new')])).length, 2, 'a ledger of two lines is read');
      same(p6.readLedger('').length, 0, 'an empty ledger');
      for (const [n, bad] of /** @type {[number, any][]} */ ([
        [2, line('A', 'new', { nodeSeconds: -1 })], [2, line('A', 'new', { countedSeconds: Number.POSITIVE_INFINITY })], [2, line('A', 'new', { group: 'C' })],
        [2, line('A', 'new', { commit: 'abc' })], [2, line('A', 'new', { killed: 'no' })], [2, line('A', 'new', { exit: 1.5 })],
        [2, { ...line('A', 'new'), extra: 1 }], [2, (({ report, ...rest }) => rest)(line('A', 'new'))],
      ])) {
        const message = thrownBy(() => p6.readLedger(text([line('A', 'old'), bad])));
        assert(message === `p6-bench: ledger line ${n} is unreadable`, `a bad line: ${message}`);
      }
      assert(thrownBy(() => p6.readLedger(`${text([line('A', 'old')])}{"half":\n`)) === 'p6-bench: ledger line 2 is unreadable', 'a truncated line');
      const spent = (/** @type {number} */ s) => [line('B', 'old', { countedSeconds: s, exit: 1 })];
      same([0, 1800, 2400].map((s) => p6.nextLimit(spent(s).slice(0, s === 0 ? 0 : 1))), [{ spent: 0, limitS: 900, allowed: true }, { spent: 1800, limitS: 855, allowed: true }, { spent: 2400, limitS: 255, allowed: false }], 'the limits under the allowance');
      const decisions = [[], spent(1800), spent(2400)].map((rows) => p6.preflight({ ...base, rows, group: 'A', side: 'old' }));
      same(decisions, [{ decision: 'run', limitS: 900, spent: 0 }, { decision: 'run', limitS: 855, spent: 1800 }, { decision: 'stop', code: 4, kind: 'allowance', reason: '2400 s counted of 2700; less than 300 s left for an invocation' }], 'run 900, run 855, stop 4');
      const one = p6.nextLimit([line('A', 'old', { countedSeconds: 2654.9, exit: 1 })]);
      same([one.limitS, one.allowed], [0, false], 'a fraction of a second is never rounded up into the allowance');
      same(p6.preflight({ ...base, rows: [], pending: { id: 'x' }, group: 'A', side: 'old' }), { decision: 'stop', code: 5, kind: 'accounting', reason: 'an invocation is not reconciled: pending.json' }, 'a reservation present');
      // A completed group: its ledger line and its terminal report.
      const world = p6World();
      const done = (/** @type {Record<string, any>} */ over = {}) => {
        const rows = world.ledger.map((l) => ({ ...l, ...(over.row?.(l) ?? {}) }));
        const entry = world.reports[0];
        const completedReport = over.report === null ? null : { path: entry.path, sha256: over.sha ?? p6sha(entry.bytes), report: JSON.parse(Buffer.from(entry.bytes).toString('utf8')), ...over.report };
        return p6.preflight({ ...base, rows, group: 'A', side: 'old', completedReport, ...(over.input ?? {}) });
      };
      same(done(), { decision: 'complete', line: 1, report: world.reports[0].path }, 'a group with its exit 0 line and its terminal report is complete');
      for (const [name, result] of /** @type {[string, any][]} */ ([
        ['a completed line of another commit', done({ row: (/** @type {any} */ l) => (l.side === 'old' ? { commit: 'f'.repeat(40) } : {}) })],
        ['a line of another commit in another group', done({ row: (/** @type {any} */ l) => (l.group === 'B' && l.side === 'new' ? { commit: 'f'.repeat(40) } : {}) })],
        ['a missing terminal report', done({ report: null })],
        ['a changed terminal report', done({ sha: '0'.repeat(64) })],
        ['an invalid terminal report', done({ report: { report: { ...JSON.parse(Buffer.from(world.reports[0].bytes).toString('utf8')), complete: false } } })],
      ])) {
        same([result.decision, result.code], ['stop', 8], `${name}: stop 8, the helper never runs`);
      }
      same(done({ row: (/** @type {any} */ l) => (l.side === 'old' ? { commit: 'f'.repeat(40) } : {}) }).reason, 'ledger source does not match this comparison', 'the reason of a source mismatch');
      same(done({ input: { rows: [...world.ledger.slice(0, 1), ...world.ledger.slice(0, 1)] } }).code, 8, 'two exit 0 lines of one group and side: stop 8');
      const incomplete = [line('A', 'old', { exit: 2, report: null, reportSha256: null })];
      same(p6.preflight({ ...base, rows: incomplete, group: 'A', side: 'old' }), { decision: 'stop', code: 9, kind: 'incomplete', reason: 'A old ended incomplete (exit 2); a resume needs the pack author\'s instruction' }, 'exit 2 without an instruction');
      same(p6.preflight({ ...base, rows: incomplete, group: 'A', side: 'old', resumeInstructed: true }).decision, 'run', 'exit 2 with an instruction runs');
      const killed = [line('A', 'old', { exit: null, killed: true, countedSeconds: 900, report: null, reportSha256: null })];
      same(p6.preflight({ ...base, rows: killed, group: 'A', side: 'old' }).decision, 'run', 'one kill allows the retry');
      same(p6.preflight({ ...base, rows: [...killed, ...killed], group: 'A', side: 'old' }), { decision: 'stop', code: 6, kind: 'timeout', reason: 'a second timeout of A old' }, 'two kills');
      // The checkpoint is read strictly.
      const header = { format: 'pentomino-bench-checkpoint', version: 1, kind: 'node', sourceDigest: FROZEN_DIGEST, versions: { algo: 'gen-v3' }, matrixDigest: 'm', workers: 4, lifecycle: 'cold', freshProcess: true };
      const row = (/** @type {string} */ caseId, /** @type {number} */ rep, /** @type {Record<string, any>} */ extra = {}) => ({ kind: 'run', run: p6Run(caseId, rep, extra) });
      const check = (/** @type {string} */ checkpoint) => p6.preflight({ ...base, rows: [], group: 'A', side: 'old', checkpoint });
      const good = `${[header, row('14x14-master', 0), row('14x14-master', 1)].map((l) => JSON.stringify(l)).join('\n')}\n`;
      same(check(good), { decision: 'run', limitS: 900, spent: 0 }, 'a good checkpoint resumes');
      same(p6.checkCheckpoint(good, { group: 'A', side: 'old', commit: p6.OLD_COMMIT }), { rows: 2 }, 'two rows');
      const stops = /** @type {[string, string, string][]} */ ([
        ['a truncated line', good.slice(0, good.length - 40), 'checkpoint old/A line 3: unreadable or truncated line'],
        ['a duplicate row', `${good}${JSON.stringify(row('14x14-master', 1))}\n`, 'checkpoint old/A line 4: 14x14-master #1 is recorded twice'],
        ['a row of another commit', `${good}${JSON.stringify(row('26x26-master', 0, { sourceCommit: 'd'.repeat(40) }))}\n`, 'checkpoint old/A line 4: the row is of the commit'],
        ['a row of another source digest', `${good}${JSON.stringify(row('26x26-master', 0, { sourceDigest: 'e'.repeat(64) }))}\n`, 'checkpoint old/A line 4: the row\'s source digest or versions differ'],
        ['a row of other versions', `${good}${JSON.stringify(row('26x26-master', 0, { versions: { algo: 'other' } }))}\n`, 'checkpoint old/A line 4: the row\'s source digest or versions differ'],
        ['a row of a cell of group B', `${good}${JSON.stringify(row('12x12-nightmare', 0))}\n`, 'not a generation row of group A'],
        ['a row with another seed', `${good}${JSON.stringify(row('26x26-master', 0, { seed: 'landscape/26x26-master/1' }))}\n`, 'has the seed'],
        ['a header of two workers', `${JSON.stringify({ ...header, workers: 2 })}\n`, 'the header is not a cold, fresh-process, four-worker node checkpoint'],
        ['a header-less file', '', 'the header is missing'],
      ]);
      for (const [name, checkpoint, fragment] of stops) {
        const out = check(checkpoint);
        assert(out.decision === 'stop' && out.code === 8 && out.kind === 'checkpoint' && out.reason.includes(fragment), `${name}: ${JSON.stringify(out)}`);
      }
      // The invoking script: its order (preflight, the helper loaded, the reservation, the helper) and its arguments.
      const ps = readFileSync(join(IG_DIR, 'phase1', 'p6-bench.ps1'), 'utf8');
      const at = (/** @type {string} */ needle) => ps.indexOf(needle);
      assert(at('preflight') > 0 && at('preflight') < at('ig-lock.ps1') && at('ig-lock.ps1') < at('CreateNew') && at('CreateNew') < at('Invoke-IgNode -Repo pentomino'), 'preflight, then the helper is loaded, then the reservation, then the helper runs');
      assert(ps.includes('-LimitSeconds $limit -IdleQuietSeconds 15') && ps.includes('second limit reached') && ps.includes('--max-old-space-size=2048') && ps.includes('--fresh-process'), 'the helper call, the timeout and the bench arguments');
      for (const cell of [...p6.GROUPS.A, ...p6.GROUPS.B]) {
        assert(ps.includes(`'${cell}'`), `the script names ${cell}`);
      }
      assert(p6.GROUPS.A.length === 5 && p6.GROUPS.B.length === 2 && p6.ORDER.map((o) => o.join(' ')).join(',') === 'A old,A new,B new,B old', 'the groups and their order');
    },
  },
  {
    name: 'p6: inputs are refused',
    async run() {
      const refuse = (/** @type {Record<string, any>} */ tweak, /** @type {string} */ fragment, /** @type {Record<string, any>} */ extra = {}) => {
        const message = thrownBy(() => p6.compareReports({ ...p6World(tweak).input(), ...extra }));
        assert(message.startsWith('p6-bench: ') && message.includes(fragment), `expected "${fragment}", got "${message}"`);
      };
      const only = (/** @type {string} */ wanted, /** @type {(r: any) => void} */ change) => (/** @type {any} */ run, /** @type {string} */ side, /** @type {string} */ group) => {
        if (`${group} ${side}` === wanted) {
          change(run);
        }
      };
      refuse({ run: only('A old', (r) => { r.measurementValid = false; r.errors.push({ phase: 'host', code: 'child-exit', message: 'x' }); r.partialReason = 'error:child-exit'; }) },
        'is not a valid, uninterrupted measurement (host/child-exit)');
      refuse({ run: only('A new', (r) => { if (r.rep === 3) { r.platform = 'other'; } }) }, 'platform differs from the report\'s');
      refuse({ run: only('B old', (r) => { r.errors.push({ phase: 'validation', code: 'invalid-puzzle', message: 'x' }); }) }, 'has an error of phase validation (invalid-puzzle)');
      refuse({ run: only('A old', (r) => { if (r.caseId === '14x14-master' && r.rep === 4) { r.tenthReadyMs = null; } }) }, 'has ten puzzles and no finite positive T10');
      refuse({ run: only('B new', (r) => { r.responseMs = 0; }) }, 'has no finite positive response');
      refuse({ meta: (/** @type {any} */ m, /** @type {string} */ side, /** @type {string} */ group) => { if (group === 'B' && side === 'old') { m.workerCount = 2; } }, run: only('B old', (r) => { r.workerCount = 2; }) },
        'is not a cold four-worker landscape run of node');
      refuse({ meta: (/** @type {any} */ m, /** @type {string} */ side, /** @type {string} */ group) => { if (group === 'A' && side === 'old') { m.sourceDigest = 'd'.repeat(64); } } }, 'the source digest is');
      refuse({ meta: (/** @type {any} */ m, /** @type {string} */ side, /** @type {string} */ group) => { if (group === 'A' && side === 'new') { m.sourceCommit = 'a'.repeat(40); } } }, 'the source commit is');
      refuse({ meta: (/** @type {any} */ m, /** @type {string} */ side, /** @type {string} */ group) => { if (group === 'B' && side === 'new') { m.sourceDigest = 'e'.repeat(64); } } }, 'the new reports have two source digests');
      refuse({ meta: (/** @type {any} */ m, /** @type {string} */ side, /** @type {string} */ group) => { if (group === 'A' && side === 'new') { m.matrixDigest = 'other'; } } }, 'old and new have different matrix digests in group A');
      refuse({ meta: (/** @type {any} */ m, /** @type {string} */ side, /** @type {string} */ group) => { if (group === 'B' && side === 'new') { m.hardware = { ...m.hardware, cpu: 'Another CPU' }; } } }, 'the four reports do not share one hardware');
      refuse({ meta: (/** @type {any} */ m) => { m.hardware = { ...m.hardware, execArgv: [] }; } }, 'meta.hardware lacks');
      refuse({ runs: (/** @type {any[]} */ runs, /** @type {string} */ side, /** @type {string} */ group) => { if (group === 'A' && side === 'new') { runs.pop(); } } }, '10x10-nightmare #4 is missing');
      refuse({ ledger: (/** @type {any} */ l, /** @type {string} */ side, /** @type {string} */ group) => { if (group === 'B' && side === 'old') { l.reportSha256 = '0'.repeat(64); } } },
        'the terminal report of B old does not have the path and the SHA-256 of its ledger line');
      refuse({ ledger: (/** @type {any} */ l) => { l.countedSeconds = 700; } }, 'above the allowance of 2700 s');
      refuse({ ledger: (/** @type {any} */ l, /** @type {string} */ side) => { if (side === 'new') { l.commit = 'f'.repeat(40); } } }, 'ledger source does not match this comparison');
      refuse({}, 'an invocation is not reconciled: pending.json', { pending: { id: 'x' } });
      refuse({}, 'the terminal report of A new is missing', { reports: p6World().reports.filter((r) => !(r.group === 'A' && r.side === 'new')) });
      refuse({ meta: (/** @type {any} */ m) => { m.notes = ['see C:\\Users\\someone\\bench']; } }, 'holds a drive-letter path');
      refuse({ text: (/** @type {string} */ t) => t.replace(/\r\n/g, '\n') }, 'is not CRLF only');
      refuse({ run: only('A new', (r) => { if (r.caseId === '26x26-master' && r.rep === 2) { r.details.puzzles[0].score += 1; } }) }, 'the pair 26x26-master seed landscape/26x26-master/2 is differ at details.puzzles[0].score');
      refuse({ run: only('B new', (r) => { if (r.caseId === '12x12-nightmare' && r.rep === 0) { delete r.details.resultDigest; } }) }, 'the pair 12x12-nightmare seed landscape/12x12-nightmare/0 is incomplete at details.resultDigest');
      // A refused publication writes nothing.
      const dir = fresh(join(SELFTEST_DIR, 'p6', 'refused'));
      try {
        const paths = p6Scratch(dir, p6World({ raw: rel(join(dir, 'raw')), run: only('A old', (r) => { r.measurementValid = false; }) }));
        const out = p6Main(['compare', '--new-commit', 'b'.repeat(40)], paths);
        assert(out.code === 1 && out.err.startsWith('p6-bench: A old: ') && out.out === '', `the refused compare: ${JSON.stringify(out)}`);
        assert(!existsSync(abs(paths.evidence)), 'a refused compare wrote the evidence folder');
        const noArg = p6Main(['compare'], paths);
        assert(noArg.code === 1 && noArg.err.includes('--new-commit'), 'the commit is required');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'p6: the chart',
    async run() {
      // Seven cells: 2 pairs with ten against seven puzzles (metric-prefix-only) and 1 pair against an empty side.
      const tweak = {
        run: (/** @type {any} */ run, /** @type {string} */ side) => {
          if (side === 'new' && run.caseId === '14x14-master' && run.rep < 2) {
            Object.assign(run, { acceptedCount: 7, tenthReadyMs: null, details: p6Details(7) });
          }
          if (side === 'new' && run.caseId === '26x26-master' && run.rep === 0) {
            Object.assign(run, { acceptedCount: 0, tenthReadyMs: null, details: p6Details(0) });
          }
        },
      };
      const result = p6.compareReports(p6World(tweak).input());
      const id = result.identity;
      same([id.pairs, id.equal, id.metricPrefixOnly, id.noPuzzleEvidence], [35, 32, 2, 1], 'k, m and z');
      const chart = p6.renderChart(result);
      same((chart.svg.match(/class="bar"/g) ?? []).length, 14, 'two bars in each of the seven rows');
      for (const cell of result.cells) {
        assert(chart.svg.includes(`>${cell.caseId}</text>`), `the row of ${cell.caseId}`);
        same((chart.svg.match(new RegExp(`data-side="old"`, 'g')) ?? []).length, 7, 'seven old bars');
      }
      same((chart.svg.match(/[0-9.]+ s, \d\/5 ten</g) ?? []).length, 14, 'a median and a ten of n text after each bar');
      assert(chart.svg.includes('12.0 s, 5/5 ten<') && chart.svg.includes('6.00 s, 5/5 ten<') && chart.svg.includes('6.00 s, 3/5 ten<'), 'the texts: the median response and the side\'s ten of n');
      same((chart.svg.match(/x2\.00 \[2\.00-2\.00\] n 5</g) ?? []).length, 7, 'the paired response ratio of each row');
      for (const sentence of ['Node screening evidence, not a browser qualification.', 'Production-digest equality established on 32 of 35 pairs; 2 pairs have metric-prefix agreement only and 1 have no common puzzle evidence.',
        'Prefix identity is not established by those summaries.', 'Puzzle generation time per request (median response, five seeds per cell): main 3fc65f4 against bbbbbbb (P6)']) {
        assert(chart.svg.includes(sentence), `the chart says "${sentence}"`);
      }
      assert(chart.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720"') && !/(href|src)=|url\(|@import/.test(chart.html), 'a 1200 x 720 SVG with no external resource');
      assert(chart.html.includes(chart.svg.trimEnd()) && chart.html.includes('margin: 0'), 'chart.html embeds the SVG, with margin 0');
      same(p6.renderChart(result), chart, 'the same input gives the same chart');
      const md = p6.renderMarkdown(result);
      same(p6.renderMarkdown(result), md, 'the same input gives the same Markdown');
      for (const text of [p6.STATEMENT, '32 of 35 pairs are `equal`', '2 are `metric-prefix-only` (puzzle-prefix identity not established)', '1 are `no-puzzle-evidence`', 'T12\'s parity tests and the unchanged fixtures remain the compatibility evidence.',
        '<summary>The production digests of the 35 pairs</summary>', '## 5. Memory checks', '## 6. Ledger of the owner\'s separate allowance', '4 invocations, 2000 counted seconds of the allowance of 2700 s', ...p6.LIMITATIONS]) {
        assert(md.includes(text), `compare.md says "${text}"`);
      }
      same((md.match(/^### /gm) ?? []).length, 7, 'a section per cell');
      same(md.split('\n').filter((l) => /^\| (Master|Expert|Nightmare) \|/.test(l)).length, 3, 'a pooled row per level');
      // compare end to end, in a scratch folder: byte copies, the ledger, the JSON, the Markdown, the chart; the same bytes again.
      const dir = fresh(join(SELFTEST_DIR, 'p6', 'compare'));
      try {
        const world = p6World({ ...tweak, raw: rel(join(dir, 'raw')) });
        const paths = p6Scratch(dir, world);
        const first = p6Main(['compare', '--new-commit', world.newCommit], paths);
        assert(first.code === 0 && first.err === '', `compare: ${JSON.stringify(first)}`);
        same(first.out.trim().split('\n').length, 8 + 2 + 3, 'eight report files, the ledger, compare.json and md, and three chart files');
        const written = (/** @type {string} */ name) => readFileSync(join(abs(paths.evidence), ...name.split('/')));
        for (const r of world.reports) {
          assert(written(`${r.side}/${basename(r.path)}`).equals(Buffer.from(r.bytes)) && written(`${r.side}/${basename(r.mdPath)}`).equals(Buffer.from(r.mdBytes)), `${r.side}/${r.group}: a byte copy of the report and its Markdown`);
        }
        const ledgerBytes = written('ledger.jsonl').toString('utf8');
        assert(ledgerBytes.split('\r\n').length === 5 && !/(?<!\r)\n/.test(ledgerBytes) && p6.readLedger(ledgerBytes).length === 4, 'the ledger copy is CRLF, four lines');
        same(JSON.parse(written('compare.json').toString('utf8')), JSON.parse(JSON.stringify(result)), 'compare.json holds the comparison');
        for (const name of ['compare.json', 'compare.md', 'chart.svg', 'chart.html', 'ledger.jsonl']) {
          const bytes = written(name).toString('utf8');
          assert(bytes.endsWith('\r\n') && !/(?<!\r)\n/.test(bytes) && !/[ \t]\r\n/.test(bytes), `${name}: CRLF, final newline, no trailing whitespace`);
        }
        const before = ['compare.md', 'chart.svg'].map((n) => written(n));
        const again = p6Main(['compare', '--new-commit', world.newCommit], paths);
        assert(again.code === 0 && again.out === first.out && ['compare.md', 'chart.svg'].every((n, i) => written(n).equals(before[i])), 'the same inputs rewrite the same bytes');
        writeFileSync(join(abs(paths.evidence), 'compare.md'), 'edited by hand\r\n');
        const edited = p6Main(['compare', '--new-commit', world.newCommit], paths);
        assert(edited.code === 1 && edited.err.includes('compare.md exists with other bytes') && edited.out === '', `an output with other bytes: ${JSON.stringify(edited)}`);
        assert(written('compare.md').toString('utf8') === 'edited by hand\r\n', 'the edited file was not overwritten');
        // preflight on the scratch raw folder: a completed group runs nothing (exit 7), a pending reservation stops (exit 5).
        const pre = p6Main(['preflight', '--group', 'A', '--side', 'old', '--new-commit', world.newCommit], paths);
        assert(pre.code === 7 && pre.out.startsWith('p6-bench: A old is complete (ledger line 1, ') && pre.out.endsWith('nothing to run\n'), `preflight on a complete group: ${JSON.stringify(pre)}`);
        writeFileSync(join(abs(paths.raw), 'pending.json'), '{}\n');
        const held = p6Main(['preflight', '--group', 'B', '--side', 'new', '--new-commit', world.newCommit], paths);
        assert(held.code === 5 && held.err === 'p6-bench: STOP (accounting): an invocation is not reconciled: pending.json\n', `preflight with a reservation: ${JSON.stringify(held)}`);
        rmSync(join(abs(paths.raw), 'pending.json'));
        rmSync(join(abs(paths.raw), 'ledger.jsonl'));
        const fresh0 = p6Main(['preflight', '--group', 'A', '--side', 'old', '--new-commit', world.newCommit], paths);
        assert(fresh0.code === 0 && fresh0.out === 'p6-bench: run A old with a limit of 900 s; 0 s counted of 2700\n', `preflight on an empty ledger: ${JSON.stringify(fresh0)}`);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'publish: the plan of a publication (N-V4-19)',
    run() {
      const shards = (/** @type {'none' | 'complete' | 'incomplete'} */ cPublication) => [
        { name: 'pilot-a', done: true, publication: /** @type {'none'} */ ('none'), recorded: 5, expected: 5 },
        { name: 'pilot-b', done: false, publication: /** @type {'none'} */ ('none'), recorded: 2, expected: 5 },
        { name: 'pilot-c', done: true, publication: cPublication, recorded: 5, expected: 5 },
      ];
      same(publishPlan(shards('complete'), { arm: 'fr', doneOnly: true }),
        { refuse: null, publish: ['pilot-a'], kept: ['pilot-c'], notDone: [{ shard: 'pilot-b', recorded: 2, expected: 5 }] }, 'the done-only plan');
      same(publishPlan(shards('complete'), { arm: 'fr', doneOnly: false }).refuse, 'shard pilot-b of arm fr is not done: nothing published', 'the default plan refuses a shard that is not done');
      for (const doneOnly of [true, false]) {
        const plan = publishPlan(shards('incomplete'), { arm: 'fr', doneOnly });
        same([plan.refuse, plan.publish, plan.kept, plan.notDone], ['incomplete publication fr/pilot-c: a ruling is required', [], [], []], `a partial publication, doneOnly ${doneOnly}`);
      }
    },
  },
  {
    name: 'publish: stopped shards, resume and immutable outputs',
    async run() {
      const dir = fresh(join(SELFTEST_DIR, 'S24-T01a-dev'));
      try {
        const armDir = join(dir, 'arm');
        const outDir = join(dir, 'out');
        mkdirSync(outDir, { recursive: true });
        const addShard = async (/** @type {string} */ name, /** @type {boolean} */ done, treeId = 't') => {
          const shardDir = join(armDir, name);
          writeJson(join(shardDir, 'shard.json'), {
            variant: 'base', treeId, copyDigest: 'c', harnessHash: 'h', rows: [{ key: 'x~0', caseId: 'x', rep: 0, seed: 'landscape/x/0' }],
          });
          writeJson(join(shardDir, 'state.json'), done ? { done: true, recorded: 1, expected: 1 } : { done: false, recorded: 0, expected: 1 });
          if (done) {
            writeJson(join(shardDir, 'rows', 'x~0', 'report.json'), { runs: [await matrixRun('x', 0)] });
          }
        };
        /** @type {string[]} */
        let said = [];
        const io = {
          armDir, outDir, producerOf: () => ({ treeId: 't', copyDigest: 'c', harnessHash: 'h' }),
          metaOf: async () => ({ format: 'ig-proto-runs', version: 1, label: 'frozen', source: { label: 'selftest', sourceDigest: '0'.repeat(64), equalsMp12b1Source: false }, rerun: 'selftest' }),
          say: (/** @type {string} */ line) => { said.push(line); },
        };
        const argv = ['--task', 'S24-T01a-dev', '--arm', 'fr', '--label', 'frozen', '--source-label', 'selftest'];
        const outFile = (/** @type {string} */ name) => join(outDir, name);
        const listing = () => readdirSync(outDir).sort();
        /** @param {string[]} extra @returns {Promise<string>} The message of the refusal. */
        const refused = async (extra) => {
          try {
            await publishCommand([...argv, ...extra], io);
          } catch (e) {
            return e instanceof Error ? e.message : String(e);
          }
          throw new Error('publish did not refuse');
        };
        await addShard('pilot-a', true);
        await addShard('pilot-b', false);
        await addShard('pilot-c', true);
        writeFileSync(outFile('pilot-c.runs.json'), 'a complete publication\r\n');
        writeFileSync(outFile('pilot-c.runs.md'), '# pilot-c\r\n\r\nThis tree writes no journal.\r\n');
        const keptJson = readFileSync(outFile('pilot-c.runs.json'));
        const keptMd = readFileSync(outFile('pilot-c.runs.md'));

        const first = await publishCommand([...argv, '--done-only'], io);
        same(first, 0, 'the done-only run returns 0');
        same(listing(), ['pilot-a.runs.json', 'pilot-a.runs.md', 'pilot-c.runs.json', 'pilot-c.runs.md'], 'the files after the done-only run');
        assert(readFileSync(outFile('pilot-c.runs.json')).equals(keptJson) && readFileSync(outFile('pilot-c.runs.md')).equals(keptMd), 'pilot-c was rewritten');
        same(said, [
          'arm: published fr/pilot-a: 1 rows, 0 journal lines',
          'arm: kept fr/pilot-c: already published',
          'arm: not published fr/pilot-b: not done (0 of 1 rows recorded; its rows count as missing)',
          'arm: done-only: published 1, kept 1, not done 1 of 3 shards of fr',
        ], `the done-only lines: ${JSON.stringify(said)}`);
        const publishedA = [readFileSync(outFile('pilot-a.runs.json')), readFileSync(outFile('pilot-a.runs.md'))];
        same(JSON.parse(publishedA[0].toString('utf8')).meta.label, 'frozen', 'the published runs JSON holds the meta block');

        said = [];
        await addShard('pilot-b', true);
        same(await publishCommand(argv, io), 0, 'the default run returns 0');
        same(listing(), ['pilot-a.runs.json', 'pilot-a.runs.md', 'pilot-b.runs.json', 'pilot-b.runs.md', 'pilot-c.runs.json', 'pilot-c.runs.md'], 'the files after the default run');
        assert(readFileSync(outFile('pilot-a.runs.json')).equals(publishedA[0]) && readFileSync(outFile('pilot-a.runs.md')).equals(publishedA[1]), 'pilot-a was rewritten');
        assert(readFileSync(outFile('pilot-c.runs.json')).equals(keptJson) && readFileSync(outFile('pilot-c.runs.md')).equals(keptMd), 'pilot-c was rewritten by the default run');
        same(said.at(-1), 'arm: published 1, kept 2, not done 0 of 3 shards of fr', `the default summary: ${JSON.stringify(said)}`);

        await addShard('pilot-d', true);
        writeFileSync(outFile('pilot-d.runs.json'), 'only the completion marker\r\n');
        const before = listing();
        same(await refused([]), 'incomplete publication fr/pilot-d: a ruling is required', 'a partial publication');
        same(await refused(['--done-only']), 'incomplete publication fr/pilot-d: a ruling is required', 'a partial publication, done-only');
        same(listing(), before, 'a partial publication created or removed a file');

        rmSync(join(armDir, 'pilot-d'), { recursive: true });
        rmSync(outFile('pilot-d.runs.json'));
        await addShard('pilot-e', true, 'other');
        const producer = await refused([]);
        assert(producer.startsWith('producer changed fr/pilot-e: observed tree other'), `the producer refusal: ${producer}`);
        same(listing(), ['pilot-a.runs.json', 'pilot-a.runs.md', 'pilot-b.runs.json', 'pilot-b.runs.md', 'pilot-c.runs.json', 'pilot-c.runs.md'], 'a changed producer created a file');
      } finally {
        rmSync(join(SELFTEST_DIR, 'S24-T01a-dev'), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'write-plan: V4-S2B',
    async run() {
      const m = await import('./manifest.mjs');
      const { plan, itemManifests } = m.writtenPlan('V4-S2B');
      const cells = ['3x29', '18x18', '18x20', '20x20', '20x21', '32x15', '22x22', '24x24'].map((c) => `${c}-nightmare`);
      same([plan.task, plan.generatedBy, plan.runnable], ['V4-S2B', 'manifest.mjs write-plan', true], 'the plan\'s header');
      same(plan.prerequisites, [{ type: 'accepted', path: 'docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-none.accepted.json', current: ['fr-none'] }], 'the prerequisite');
      same(plan.steps.map((s) => s.id), ['prerequisites', 'firewall-snapshot', 'trees', ...cells.map((c) => `rows-fr-none-pilot-${c}`), 'publish-fr-none', 'firewall-check'], 'the steps in order');
      same(plan.steps[2].node, ['tools\\ig-proto\\lib\\tree.mjs', 'build', 'fr-none'], 'the trees step');
      for (const cell of cells) {
        const step = /** @type {any} */ (plan.steps.find((s) => s.id === `rows-fr-none-pilot-${cell}`));
        same([step.locked, step.repeatUntilDone, step.minHorizonS, step.optional], [true, true, 272, false], `${cell}: the step's flags`);
        same(step.node.slice(-6), ['--workers', '4', '--cases', `${cell}:0-4`, '--row-limit-s', '260'], `${cell}: the node's tail`);
        same(step.state, `V4-S2B\\fr-none\\pilot-${cell}\\state.json`, `${cell}: the state`);
      }
      same([plan.allocationMinutes, plan.optionalMinutes, Math.round(m.planGuardS(plan) * 1000) / 1000], [23, 0, 1694.624], 'the approved price');
      same(itemManifests, {}, 'no item manifest');
      assert(thrownBy(() => m.writtenPlan('V4-XX')) === 'manifest: unknown written plan V4-XX', 'an unknown plan is refused');
      const dir = fresh(join(SELFTEST_DIR, 'write-plan', 'run'));
      try {
        const argv = ['--plan', 'V4-S2B', '--label', 'frozen', '--source-label', 'self-test'];
        const first = await captureOutput(() => m.writePlanCommand(argv, { plansDir: dir }));
        same([first.code, first.err], [0, ''], 'the first write succeeds');
        const file = join(dir, 'V4-S2B.json');
        same(JSON.parse(readFileSync(file, 'utf8')), JSON.parse(JSON.stringify(plan)), 'the written plan is the built plan');
        const bytes = readFileSync(file);
        const second = await captureOutput(() => m.writePlanCommand(argv, { plansDir: dir }));
        same(second.code, 1, 'the second write is refused');
        assert(second.err.startsWith('write-plan: plan exists: a plan is never rewritten ('), `the refusal: ${second.err}`);
        assert(bytes.equals(readFileSync(file)), 'the second write changed the file');
        const other = await captureOutput(() => m.writePlanCommand(['--plan', 'V4-XX', '--label', 'frozen', '--source-label', 'self-test'], { plansDir: dir }));
        same([other.code, other.err], [1, 'write-plan: unknown written plan V4-XX\n'], 'an unknown plan');
      } finally {
        rmSync(join(SELFTEST_DIR, 'write-plan'), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'fit-read: the declared grid',
    async run() {
      const { fitScope } = await import('./fit-read.mjs');
      const step = (/** @type {string} */ arm, /** @type {string} */ shard, /** @type {string} */ cases) => ({
        node: ['tools\\ig-proto\\arm.mjs', 'run', '--task', 'V4-XX', '--arm', arm, '--shard', shard, '--cases', cases],
      });
      const plan = { task: 'V4-XX', steps: [step('a', 'pilot-x', 'x:0-4'), step('b', 'pilot-y', 'y:0-4')] };
      same(fitScope(plan, 'a'), [0, 1, 2, 3, 4].map((r) => ({ rowKey: `x~${r}`, caseId: 'x', rep: r, seed: `landscape/x/${r}`, shard: 'pilot-x' })), 'the grid of arm a');
      same(thrownBy(() => fitScope(plan, 'z')), 'fit-read: the plan V4-XX has no rows of z', 'an absent arm');
      same(thrownBy(() => fitScope({ task: 'V4-XX', steps: [step('a', 'pilot-x', 'x:0-4'), step('a', 'pilot-x2', 'x:0-4')] }, 'a')), 'fit-read: x~0 is declared twice', 'a duplicate declaration');
      same(thrownBy(() => fitScope({ task: 'V4-XX', steps: [step('a', 'pilot-x', 'x:0-5')] }, 'a')), 'fit-read: rep 5 of x is not a fitting rep (0-4)', 'a rep above 4');
      same(thrownBy(() => fitScope({ task: 'V4-XX', steps: [step('a', 'pilot-x', 'x')] }, 'a')), 'fit-read: bad --cases entry x', 'a bad --cases entry');
    },
  },
  {
    name: 'fit-read: preview of a cell',
    async run() {
      const { previewCell, fitScope } = await import('./fit-read.mjs');
      const { noRegression } = await import('./verdicts.mjs');
      const declared = fitScope({
        task: 'V4-XX',
        steps: [{ node: ['tools\\ig-proto\\arm.mjs', 'run', '--task', 'V4-XX', '--arm', 'a', '--shard', 'pilot-x', '--cases', 'x:0-4'] }],
      }, 'a');
      const after = [10000, 10000, 30000, 80000, 50000];
      const before = [10000, 20000, 30000, 40000, 50000];
      const reps = [0, 1, 2, 3, 4];
      const build = async () => ({
        published: await Promise.all(reps.map(async (r) => ({
          rowKey: `x~${r}`, caseId: 'x', rep: r, seed: `landscape/x/${r}`, localRep: 0,
          run: await matrixRun('x', r, 10, { tenthReadyMs: after[r], responseMs: after[r] }),
        }))),
        today: await Promise.all(reps.map((r) => matrixRun('x', r, 10, { tenthReadyMs: before[r], responseMs: before[r] }))),
      });
      const base = await build();
      const clean = previewCell('x', declared, base.published, base.today);
      same(clean.ratios, [1, 2, 1, 0.5, 1], `the ratios: ${JSON.stringify(clean.ratios)}`);
      assert(clean.geo !== null && near(clean.geo, 1), `the geometric mean: ${clean.geo}`);
      same([clean.todayTen, clean.afterTen, clean.problems], [5, 5, []], 'the ten counts and the problems');
      const expected = noRegression([1, 2, 1, 0.5, 1], reps, { resamples: 10000, resampleSeed: 20261116 });
      same([clean.lower, clean.pass], [expected.lower, expected.pass], 'the lower bound and the verdict');
      /** @type {[string, number, string, (kit: any) => void][]} */
      const variants = [
        ['a duplicate row', 3, 'rep 3: 2 published rows', (kit) => kit.published.push(structuredClone(kit.published[3]))],
        ['an agreeing row and run of another seed', 2, 'rep 2: wrong declared identity (seed "landscape/x/9", declared "landscape/x/2")', (kit) => {
          kit.published[2].seed = 'landscape/x/9';
          kit.published[2].run.seed = 'landscape/x/9';
        }],
        ['a row of another rep', 0, 'rep 0: wrong declared identity (rep 5, declared 0)', (kit) => { kit.published[0].rep = 5; }],
        ['a censored run', 1, 'rep 1: after censored: measurementValid is false', (kit) => { kit.published[1].run.measurementValid = false; }],
        ['a missing row', 4, 'rep 4: no published row', (kit) => kit.published.splice(4, 1)],
        ['an MP12b1 run of another seed', 0, 'rep 0: MP12b1 seed landscape/y/0', (kit) => { kit.today[0].seed = 'landscape/y/0'; }],
        ['an incorrect run', 1, 'rep 1: after incorrect: ', (kit) => {
          kit.published[1].run.errors = [{ phase: 'validation', code: 'invalid-puzzle', message: 'x' }];
        }],
      ];
      for (const [label, rep, problem, edit] of variants) {
        const kit = await build();
        edit(kit);
        const got = previewCell('x', declared, kit.published, kit.today);
        assert(got.problems.length === 1 && got.problems[0].startsWith(problem), `${label}: ${JSON.stringify(got.problems)}`);
        same([got.ratios[rep], got.lower, got.pass], [null, null, null], `${label}: the rep's ratio, the lower bound and the verdict`);
      }
    },
  },
  {
    name: 'fit-read: call prefixes',
    async run() {
      const { callPrefixes } = await import('./fit-read.mjs');
      const L = ledgerLines();
      const S = (/** @type {string} */ call, level = 'nightmare') => ({ ...L.S(call, 'set', 0, 0), level });
      const one = (/** @type {any[]} */ lines, /** @type {number} */ budget) => callPrefixes(lines, { nightmare: budget });
      const c1 = [S('c1'), L.B('c1'), L.P('c1', 0, 6e9, 0), L.B('c1'), L.N('c1', 3e9), L.B('c1'), L.P('c1', 1, 2e9, 0), L.E('c1', 8e9, 0, 3e9)];
      const view = (/** @type {any} */ r) => /** @type {any} */ (r.calls[0]);
      let got = view(one(c1, 9e9));
      same([got.spent, got.ended, got.firstAffected, got.status], [11e9, true, 2, 'affected'], `c1 at 9e9: ${JSON.stringify(got)}`);
      got = view(one(c1, 9e9 + 1));
      same([got.firstAffected, got.status], [null, 'clear'], `c1 at 9e9+1: ${JSON.stringify(got)}`);
      const c2 = [S('c2'), L.B('c2'), L.P('c2', 0, 5e9, 0), L.B('c2')];
      got = view(one(c2, 5e9));
      same([got.ended, got.open, got.firstAffected, got.status], [false, true, 1, 'affected'], `c2 at 5e9: ${JSON.stringify(got)}`);
      got = view(one(c2, 6e9));
      same([got.firstAffected, got.spent, got.status], [null, 5e9, 'clear'], `c2 at 6e9: ${JSON.stringify(got)}`);
      got = view(one([S('c3'), L.B('c3'), L.P('c3', 0, 7e9, 0)], 6e9));
      same(got.status, 'potentially-affected', `c3: ${JSON.stringify(got)}`);
      /** @type {[string, any[], string][]} */
      const malformed = [
        ['begin while open', [S('m'), L.B('m'), L.B('m'), L.P('m', 0, 1, 0)], 'begin while a primitive is open'],
        ['end mismatch', [S('m'), L.B('m'), L.P('m', 0, 5, 0), L.E('m', 4, 0, 0)], 'end mismatch'],
        ['duplicate start', [S('c1'), ...c1], 'duplicate start'],
        ['duplicate end', [...c1, L.E('c1', 8e9, 0, 3e9)], 'duplicate end'],
        ['invalid units', [S('m'), L.B('m'), L.N('m', -1)], 'invalid units'],
        ['p without begin', [S('m'), L.P('m', 0, 1, 0)], 'p without an open primitive'],
      ];
      for (const [label, lines, problem] of malformed) {
        const r = one(lines, 9e9);
        assert(view(r).status === 'ambiguous' && view(r).problems.includes(problem), `${label}: ${JSON.stringify(r)}`);
      }
      const stray = one([...c1, L.P('zz', 0, 1, 0)], 9e9);
      same([stray.unowned, stray.problems, view(stray).status], [['zz'], ['unowned p line zz'], 'affected'], `an unowned line: ${JSON.stringify(stray)}`);
    },
  },
  {
    name: 'fit-read: the four-attempt bound',
    async run() {
      const { boundFirings } = await import('./fit-read.mjs');
      const call = (/** @type {number} */ attempt, /** @type {string} */ endResult, status = 'clear') => ({ stage: 'set', attempt, status, ended: true, endResult });
      const run = (/** @type {any[]} */ calls) => boundFirings(calls, 4);
      same(run([0, 1, 2, 3].map((a) => call(a, 'below-to-one'))), { fires: true, side: 'below', attempts: 4 }, 'four below');
      same(run([call(0, 'below-to-one'), call(1, 'below-to-one'), call(2, 'below-to-one'), call(3, 'above-to-max')]).fires, false, 'mixed sides');
      same(run([0, 1, 2, 3].map((a) => call(a, 'above-to-max'))).side, 'above', 'four above');
      same(run([0, 1, 3].map((a) => call(a, 'below-to-one'))), { fires: false, side: null, attempts: 3 }, 'attempt 2 missing');
      same(run([...[0, 1, 2, 3].map((a) => call(a, 'below-to-one')), call(4, 'hit')]), { fires: true, side: 'below', attempts: 5 }, 'a fifth attempt');
      same(run([call(0, 'below-to-one'), call(1, 'below-to-one', 'ambiguous'), call(2, 'below-to-one'), call(3, 'below-to-one')]).fires, false, 'an ambiguous call');
    },
  },
  {
    name: 'fit-read: prefixes of a declared grid',
    async run() {
      const { prefixesCommand } = await import('./fit-read.mjs');
      const L = ledgerLines();
      const root = join(SELFTEST_DIR, 'S24-T02c-dev');
      const argv = ['--task', 'V4-XX', '--arm', 'a', '--budget', 'nightmare=9000000000', '--bound', '4', '--label', 'frozen', '--source-label', 'self-test'];
      /** @param {string} name @param {(fx: any) => void} [edit] @returns {Promise<{ fx: any, record: any }>} */
      const scenario = async (name, edit) => {
        const fx = await fitFixture(join(root, 'prefixes', name));
        edit?.(fx);
        const out = await captureOutput(() => prefixesCommand(argv, fx.io));
        same([out.code, out.err], [0, ''], `${name}: ${out.err}`);
        return { fx, record: JSON.parse(readFileSync(join(fx.outDir, 'fit-read-prefixes-a.json'), 'utf8')) };
      };
      /** @param {any} record @param {string} name @returns {string[][]} Every row's identity, after checking that its ledger fields are the clean run's. */
      const identities = (record, name) => {
        for (const row of record.rows) {
          same([row.complete, row.problems], [true, []], `${name}: ${row.rowKey} ledger ${JSON.stringify(row)}`);
        }
        return record.rows.map((/** @type {any} */ row) => row.identity);
      };
      /** @param {string} file @returns {string[]} */
      const readLines = (file) => readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l !== '');
      try {
        const { fx, record } = await scenario('clean');
        same(record.rows.length, 5, 'five rows');
        for (const row of record.rows) {
          same([row.publication, row.shardDone, row.rowStatus, row.identity, row.complete, row.problems], ['complete', true, 'valid', [], true, []], `clean: ${JSON.stringify(row)}`);
          same([row.calls, row.maxSpent, row.affected, row.potentiallyAffected, row.ambiguous, row.bound.fires], [{ clear: 1 }, 160, [], [], [], false], `clean calls: ${JSON.stringify(row)}`);
        }
        same([record.summary.declared, record.summary.present, record.summary.missing, record.summary.unexpected, record.summary.identityRows], [5, 5, [], [], 0], 'the clean summary');
        const wanted = [fx.plansDir + '\\V4-XX.json', fx.files.runs, join(fx.runsDir, 'pilot-x.runs.md'), fx.files.shard];
        for (const r of [0, 1, 2, 3, 4]) {
          wanted.push(join(fx.logs, `x~${r}.row.jsonl`), join(fx.logs, `x~${r}.1.2.jsonl`), join(fx.logs, `x~${r}.link.jsonl`));
        }
        same(record.inputs[0].path, rel(wanted[0]), 'the plan is the first input');
        for (const file of wanted) {
          const found = record.inputs.filter((/** @type {any} */ i) => i.path === rel(file));
          assert(found.length === 1 && found[0].sha256 === sha256File(file), `the input ${rel(file)}: ${JSON.stringify(found)}`);
        }
        assert(existsSync(join(fx.outDir, 'fit-read-prefixes-a.md')), 'the Markdown record exists');
        const linkless = (await scenario('link-removed', (k) => rmSync(join(k.logs, 'x~3.link.jsonl')))).record.rows[3];
        same([linkless.complete, linkless.problems.includes('no linkage')], [false, true], `rep 3 without linkage: ${JSON.stringify(linkless)}`);
        const stray = (await scenario('unowned', (k) => writeJsonl(join(k.logs, 'x~2.1.2.jsonl'), [
          ...readLines(join(k.logs, 'x~2.1.2.jsonl')).map((l) => JSON.parse(l)), L.P('zz', 0, 1, 0),
        ]))).record.rows[2];
        same([stray.complete, stray.problems, stray.rowStatus], [false, ['unowned p line zz'], 'valid'], `rep 2 with an unowned line: ${JSON.stringify(stray)}`);
        const gone = (await scenario('row-removed', (k) => editJsonFile(k.files.runs, (d) => d.rows.splice(4, 1)))).record;
        same([gone.rows[4].rowStatus, gone.summary.missing], ['missing', ['x~4']], 'a missing published row');
        const extra = (await scenario('extra-row', (k) => editJsonFile(k.files.runs, (d) => d.rows.push({ ...d.rows[0], rowKey: 'x~7' })))).record;
        same(extra.summary.unexpected, ['x~7'], 'an unexpected published row');
        const seed = (await scenario('wrong-seed', (k) => editJsonFile(k.files.runs, (d) => {
          d.rows[1].seed = 'landscape/x/20';
          d.rows[1].run.seed = 'landscape/x/20';
        }))).record;
        same([seed.rows[1].rowStatus, seed.rows[1].identity], ['invalid', ['wrong declared identity (seed "landscape/x/20", declared "landscape/x/1")']], 'a self-consistent wrong seed');
        same(identities(seed, 'wrong seed').map((/** @type {any} */ i) => i.length), [0, 1, 0, 0, 0], 'the other rows are clean');
        const rep = (await scenario('wrong-rep', (k) => editJsonFile(k.files.runs, (d) => { d.rows[2].rep = 7; }))).record;
        same([rep.rows[2].rowStatus, rep.rows[2].identity], ['invalid', ['wrong declared identity (rep 7, declared 2)']], 'a row of another rep');
        identities(rep, 'wrong rep');
        const noHeader = (await scenario('no-row-identity', (k) => rmSync(join(k.logs, 'x~3.row.jsonl')))).record;
        same(noHeader.rows[3].identity, ['no row identity'], 'a missing row identity');
        identities(noHeader, 'no row identity');
        const producer = (await scenario('producer', (k) => editJsonFile(k.files.shard, (d) => { d.harnessHash = 'H2'; }))).record;
        for (const row of producer.rows) {
          same(row.identity, ["the publication's producer H is not the shard's H2"], 'a producer mismatch');
        }
        same(producer.summary.identityRows, 5, 'the producer mismatch rows');
        identities(producer, 'producer');
        const absent = (await scenario('no-shard', (k) => rmSync(k.files.shard))).record;
        for (const row of absent.rows) {
          same(row.identity, ['no shard declaration'], 'no shard declaration');
        }
        identities(absent, 'no shard');
        const stripped = (await scenario('stripped', (k) => {
          editJsonFile(k.files.shard, (d) => {
            delete d.treeId;
            delete d.copyDigest;
            delete d.harnessHash;
          });
          editJsonFile(k.files.runs, (d) => {
            delete d.meta.trees.v.treeId;
            delete d.meta.trees.v.copyDigest;
            delete d.meta.harness.harnessHash;
          });
        })).record;
        for (const row of stripped.rows) {
          same(row.identity, [
            "the shard's treeId is missing or malformed", "the shard's copyDigest is missing or malformed", "the shard's harnessHash is missing or malformed",
            "the publication's tree identity is missing or malformed", "the publication's copy identity is missing or malformed",
            "the publication's producer identity is missing or malformed",
          ], 'stripped identities');
        }
        same(stripped.summary.identityRows, 5, 'the stripped rows');
        identities(stripped, 'stripped');
        const blank = (await scenario('blank-producer', (k) => {
          editJsonFile(k.files.shard, (d) => { d.harnessHash = ''; });
          editJsonFile(k.files.runs, (d) => { d.meta.harness.harnessHash = ''; });
        })).record;
        for (const row of blank.rows) {
          same(row.identity, ["the shard's harnessHash is missing or malformed", "the publication's producer identity is missing or malformed"], 'blank producers never agree');
        }
        same(blank.summary.identityRows, 5, 'the blank rows');
        identities(blank, 'blank producer');
        const twice = (await scenario('shard-entry-twice', (k) => editJsonFile(k.files.shard, (d) => d.rows.push({ ...d.rows[0] })))).record;
        same(identities(twice, 'shard entry twice'), [['the shard declares x~0 more than once'], [], [], [], []], 'a duplicate shard entry');
        same(twice.summary.identityRows, 1, 'the duplicate shard entry rows');
        const header = (await scenario('header-twice', (k) => {
          const file = join(k.logs, 'x~0.row.jsonl');
          const lines = readLines(file).map((l) => JSON.parse(l));
          writeJsonl(file, [...lines, lines[0]]);
        })).record;
        same(identities(header, 'header twice'), [['the row identity appears more than once'], [], [], [], []], 'a duplicate row header');
        same(header.summary.identityRows, 1, 'the duplicate header rows');
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'fit-read: preview of a declared grid',
    async run() {
      const { fitScope, previewCell, previewCommand } = await import('./fit-read.mjs');
      const root = join(SELFTEST_DIR, 'S24-T02c-dev');
      try {
        const fx = await fitFixture(join(root, 'preview', 'clean'));
        const file = fx.files.mp12b1;
        const lookup = () => ({ path: rel(file), report: JSON.parse(readFileSync(file, 'utf8')) });
        const out = await captureOutput(() => previewCommand(['--task', 'V4-XX', '--arm', 'a', '--label', 'frozen', '--source-label', 'self-test'], { ...fx.io, mp12b1: lookup }));
        same([out.code, out.err], [0, ''], `the preview: ${out.err}`);
        const record = JSON.parse(readFileSync(join(fx.outDir, 'fit-read-preview-a.json'), 'utf8'));
        const plan = JSON.parse(readFileSync(join(fx.plansDir, 'V4-XX.json'), 'utf8'));
        const runs = JSON.parse(readFileSync(fx.files.runs, 'utf8')).rows;
        const expected = JSON.parse(JSON.stringify(previewCell('x', fitScope(plan, 'a'), runs, lookup().report.runs)));
        same(record.cells, [expected], 'the cell is the clean preview');
        same(record.cells[0].ratios, [1, 2, 1, 0.5, 1], 'the ratios');
        same([record.declared, record.missing, record.unexpected], [5, [], []], 'the declared, missing and unexpected rows');
        const mp = record.inputs.filter((/** @type {any} */ i) => i.path === rel(file));
        assert(mp.length === 1 && mp[0].sha256 === sha256File(file), `the MP12b1 input: ${JSON.stringify(mp)}`);
        assert(existsSync(join(fx.outDir, 'fit-read-preview-a.md')), 'the Markdown record exists');
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'fit-read: command refusals',
    async run() {
      const { prefixesCommand, previewCommand } = await import('./fit-read.mjs');
      const root = join(SELFTEST_DIR, 'S24-T02c-dev');
      const common = ['--task', 'V4-XX', '--arm', 'a', '--label', 'frozen', '--source-label', 'self-test'];
      /** @param {string[]} extra */
      const prefixes = (extra) => [...common, ...extra];
      try {
        const once = await fitFixture(join(root, 'refusals', 'a'));
        const first = await captureOutput(() => prefixesCommand(prefixes(['--budget', 'nightmare=9000000000']), once.io));
        same(first.code, 0, `the first call: ${first.err}`);
        const written = join(once.outDir, 'fit-read-prefixes-a.json');
        const bytes = readFileSync(written);
        const second = await captureOutput(() => prefixesCommand(prefixes(['--budget', 'nightmare=9000000000']), once.io));
        assert(second.code === 1 && second.err.startsWith('fit-read: a record is written once ('), `the second call: ${second.code} ${second.err}`);
        assert(bytes.equals(readFileSync(written)), 'the second call changed the record');
        /** @type {[string, (io: any) => Promise<{ code: number, out: string, err: string }>, string][]} */
        const refused = [
          ['b', (io) => captureOutput(() => prefixesCommand(prefixes(['--budget', 'nightmare=0']), io)), 'fit-read: bad --budget nightmare=0\n'],
          ['c', (io) => captureOutput(() => prefixesCommand(prefixes(['--budget', 'nightmare=1.5']), io)), 'fit-read: bad --budget nightmare=1.5\n'],
          ['d', (io) => captureOutput(() => prefixesCommand(prefixes(['--budget', 'nightmare=9', '--bound', '0']), io)), 'fit-read: bad --bound 0\n'],
          ['e', (io) => captureOutput(() => prefixesCommand(prefixes(['--budget', 'nightmare=9', '--bound', '33']), io)), 'fit-read: bad --bound 33\n'],
          ['f', (io) => captureOutput(() => prefixesCommand(['--task', 'V4-XX', '--arm', 'a', '--label', 'selftest', '--budget', 'nightmare=9'], io)), 'fit-read: --label frozen only\n'],
          ['g', (io) => captureOutput(() => prefixesCommand(['--task', 'V4-S2', '--arm', 'a', '--label', 'frozen', '--budget', 'nightmare=9'], io)),
            "fit-read: V4-S2 is a historical namespace: its records are read by the SAs' scripts, never written\n"],
          ['h', (io) => captureOutput(() => previewCommand(['--task', 'V4-S2B', '--arm', 'fr-none', '--label', 'frozen'], io)), 'fit-read: no plan '],
        ];
        for (const [name, run, text] of refused) {
          const fx = await fitFixture(join(root, 'refusals', name));
          const before = folderHashes(fx.dir);
          const got = await run(fx.io);
          assert(got.code === 1 && got.out === '' && (name === 'h' ? got.err.startsWith(text) : got.err === text), `${name}: ${got.code} ${JSON.stringify(got.err)}`);
          assert(!existsSync(fx.outDir), `${name}: an output folder exists`);
          same(folderHashes(fx.dir), before, `${name}: the fixture changed`);
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'p7: settings, work inputs and limits',
    async run() {
      const { limitsFor, settingsOf, workInputs } = await import('./p7-probe.mjs');
      same(settingsOf('quick'), ['canonical', 'tie1', 'undo', 'work-half', 'mem-ref', 'mem-fast'], 'the quick settings');
      same(settingsOf('full'), ['canonical', 'tie1', 'undo', 'work-half', 'work-minus1', 'work-ref', 'census-half', 'mem-below', 'mem-ref', 'mem-fast'], 'the full settings');
      same(thrownBy(() => settingsOf('x')), 'p7-probe: unknown tier x', 'an unknown tier');
      same(workInputs({ search: { work: 107 }, census: { work: 100 } }), { refWork: 7, refCensusWork: 100 }, 'the work inputs with a census');
      same(workInputs({ search: { work: 9 }, census: null }), { refWork: 9, refCensusWork: 0 }, 'the work inputs without a census');
      const base = { lookaheadWidth: 2, nodes: 100, solutions: 2, work: 1000, census: 50, memoryBytes: 4096 };
      const inputs = { base, refWork: 7, refCensusWork: 100, refBytes: 300, extraBytes: 40 };
      const at = (/** @type {string} */ setting, /** @type {any} */ over = {}) => /** @type {any} */ (limitsFor(setting, { ...inputs, ...over }));
      same(at('work-half').limits, { ...base, work: 3 }, 'work-half is half of the main work, not of 107');
      same(at('work-minus1').limits, { ...base, work: 6 }, 'work-minus1');
      same(at('work-ref').limits, { ...base, work: 7 }, 'work-ref');
      same(at('census-half').limits, { ...base, census: 50 }, 'census-half');
      same(at('mem-below').limits, { ...base, memoryBytes: 299 }, 'mem-below');
      same(at('mem-ref').limits, { ...base, memoryBytes: 339 }, 'mem-ref');
      same(at('mem-fast').limits, { ...base, memoryBytes: 340 }, 'mem-fast');
      assert(at('canonical').limits === base && at('fixture').limits === base, 'canonical and fixture keep the base object');
      same(at('canonical').diagnostics, {}, 'canonical has no diagnostics');
      same(at('tie1'), { limits: base, diagnostics: { tieOrder: 1 } }, 'tie1');
      same(at('undo'), { limits: base, diagnostics: { verifyUndo: true } }, 'undo');
      assert(at('mem-ref', { extraBytes: 0 }) === null && at('mem-fast', { extraBytes: 0 }) === null, 'a memory setting without extra bytes does not apply');
      assert(at('work-half', { refWork: 1 }) === null && at('census-half', { refCensusWork: 1 }) === null && at('work-minus1', { refWork: 0 }) === null, 'a work setting below its minimum does not apply');
      same(at('screen:500').limits, { ...base, work: 500 }, 'screen:500');
      same(thrownBy(() => at('screen:-1')), 'p7-probe: bad screen setting screen:-1', 'screen:-1');
      same(thrownBy(() => at('screen:1e3')), 'p7-probe: bad screen setting screen:1e3', 'screen:1e3');
      same(thrownBy(() => at('wat')), 'p7-probe: unknown setting wat', 'an unknown setting');
      same([...new Map([[95000000, ['fixed']], [7, ['mainWork-1', 'tail-mid']]]).keys()].map((W) => `screen:${W}`), ['screen:95000000', 'screen:7'],
        'the screen settings come from the map keys');
    },
  },
  {
    name: 'p7: outcomes, fixtures and declarations',
    async run() {
      assert(SOURCE_KIND === 'frozen', 'the case must run with --label frozen');
      const { equalDeclarations, fixtureInput, memoryManifest, outcomeOf, runtimeItems, timeDeclarations } = await import('./p7-probe.mjs');
      same(outcomeOf(() => ({ a: [1, 2] })), { result: { a: [1, 2] } }, 'a result');
      same(outcomeOf(() => {
        const e = /** @type {any} */ (new RangeError('m'));
        e.code = 'c';
        e.details = { b: 1 };
        throw e;
      }), { error: { name: 'RangeError', code: 'c', message: 'm', details: { b: 1 } } }, 'an error');
      same(outcomeOf(() => {
        throw 'text';
      }), { error: { name: 'string', code: null, message: 'text', details: null } }, 'a thrown string');
      const manifest = memoryManifest();
      same([manifest.fixtures.length, manifest.sequence.length, manifest.capacity.length], [5, 9, 2], 'the manifest entries');
      const f = /** @type {any} */ (manifest.fixtures.find((x) => x.id === 'mem-near-reference'));
      const input = fixtureInput(f);
      assert(input.boardRows.length === 126 && input.boardRows.every((r) => r === '#'.repeat(32)), 'the board of mem-near-reference');
      assert(input.pieces.length === 2 && input.pieces.every((x) => x.cells.length === 2016) && input.pieces[1].id === 'r1', 'the pieces of mem-near-reference');
      same(input.clues, [], 'a fixture has no clue');
      const treeBase = 'tests/artifacts/ig-proto/tree-frozen/base';
      const treeInstr = 'tests/artifacts/ig-proto/tree-frozen/instr';
      same(runtimeItems([
        { id: 'x', kind: 'p7-equal', variant: 'base', payload: { source: 'pm4', otherTree: treeBase } },
        { id: 'y', kind: 'p7-equal', variant: 'base', payload: { source: 'kernel', otherTree: treeBase, inputTree: treeInstr } },
      ]).map((i) => i.payload), [
        { source: 'pm4', otherRoot: abs(treeBase) },
        { source: 'kernel', otherRoot: abs(treeBase), inputRoot: abs(treeInstr) },
      ], 'the runtime payloads');
      const quick = await equalDeclarations('base', 'quick');
      const full = await equalDeclarations('base', 'full');
      const time = await timeDeclarations('base');
      same([quick.length, full.length, time.length], [149, 713, 90], 'the declared item counts');
      same(quick.map((i) => i.id).filter((id, k, all) => all.indexOf(id) !== k), [], 'the quick ids are distinct');
      same([quick[0].id, quick.at(-1)?.id, time[0].id, time.at(-1)?.id],
        ['equal:base:kernel:10x10-nightmare:0', 'equal:base:memory:capacity', 'time:base:10x10-nightmare:0:0', 'time:base:26x26-hell-1:5:2'], 'the first and last ids');
      assert(full.filter((i) => i.payload.source === 'pm4').flatMap((i) => i.payload.settings).filter((s) => s.startsWith('screen:')).length === 123, 'the screen settings of the first profiles');
    },
  },
  {
    name: 'p7: the experiment declaration',
    async run() {
      const { checkDeclaration, corpusCounts, corpusInputPaths } = await import('./p7-probe.mjs');
      const { declaration: d, corpus } = await p7Run();
      same(checkDeclaration(d, structuredClone(d)), { ok: true }, 'an equal declaration');
      const refuse = (/** @type {(x: any) => void} */ change, /** @type {string} */ key) => {
        const fresh = structuredClone(d);
        change(fresh);
        const got = checkDeclaration(d, fresh);
        same(got, { refuse: `the declaration of ${d.task}/${d.step} changed (${key}): a ruling is required` }, `${key}: ${JSON.stringify(got)}`);
      };
      refuse((x) => { x.tier = 'full'; }, 'tier');
      refuse((x) => { x.items[0].payload.subsetIndex = 3; }, 'items');
      refuse((x) => { x.inputConstructor.treeId = 'TJ'; }, 'inputConstructor');
      refuse((x) => { x.producer.harnessHash = 'h2'; }, 'producer');
      same(corpusCounts(corpus.items), { kernel: 1, pm4: 0, memory: 7, time: 0 }, 'the corpus counts');
      const cell = (/** @type {string} */ c) => `tests/artifacts/ig-proto/frozen/IGP-02/main/${c}/calls.json`;
      same(corpusInputPaths('equal'), [
        ...['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '26x26-hell-1', '26x26-master', '26x26-nightmare'].map(cell),
        'tools/ig-proto/data/p7-memory-fixtures.json',
        'tools/ig-proto/data/boards-v1.json',
      ], 'the equality inputs');
      same(corpusInputPaths('time'), ['tools/ig-proto/data/boards-v1.json'], 'the timing inputs');
    },
  },
  {
    name: 'p7: equality verdict',
    async run() {
      const { equalVerdict } = await import('./p7-probe.mjs');
      const endOf = (/** @type {any} */ run, /** @type {string} */ id) => run.lines.find((/** @type {any} */ l) => l.type === 'item-end' && l.item === id);
      /** @param {any} run @param {string} _label @returns {any} */
      const judge = (run, _label) => equalVerdict(run);
      /** @param {any} v @param {string} text @param {string} label */
      const hasProblem = (v, text, label) => assert(v.problems.includes(text), `${label}: ${JSON.stringify(v.problems)}`);
      const valid = judge(await p7Run(), 'valid');
      same([valid.verdict, valid.problems, valid.coverage.complete, valid.coverage.memory.length, valid.coverage.memory.every((/** @type {any} */ m) => m.ok), valid.coverage.budget, valid.items, valid.ended, valid.equal],
        ['equal', [], true, 16, true, [], 8, 8, 8], `the valid run: ${JSON.stringify(valid)}`);
      same(valid.coverage.memory.slice(0, 5).map((/** @type {any} */ m) => [m.fixture, m.representation, m.expected]), [
        ['mem-small', 'lists', 'lists'], ['mem-mid', 'lists', 'lists'], ['mem-near-lists', 'lists', 'lists'], ['mem-near-reference', 'reference', 'reference'], ['mem-above', null, 'model-too-large'],
      ], 'the fixture entries');
      same([valid.declared.candidate.variant, valid.declared.tier, valid.declared.corpusVersion, valid.declared.producer.harnessHash, valid.declared.inputConstructor.rule],
        ['p7-x', 'quick', 'p7-corpus-v1', 'h', 'kernel-window-v1'], 'the declared identities');

      const one = await p7Run();
      one.lines.pop();
      const v1 = judge(one, '(1) a missing end');
      same([v1.verdict, v1.missing], ['incomplete', ['m:capacity']], '(1)');
      hasProblem(v1, 'the item log is invalid: interrupted item m:capacity needs a ruling', '(1)');

      const two = await p7Run();
      two.lines.push(structuredClone(endOf(two, 'n0')));
      const v2 = judge(two, '(2) a second end');
      same([v2.verdict, v2.duplicates], ['incomplete', ['n0']], '(2)');
      hasProblem(v2, 'the item log is invalid: duplicate log entry for n0', '(2)');

      const v3 = judge(await p7Run({ identity: { manifestHash: 'x' } }), '(3) the manifest');
      assert(v3.verdict === 'incomplete', '(3) verdict');
      hasProblem(v3, "the run's manifest differs from its declaration", '(3)');

      const four = await p7Run();
      four.declaration = null;
      const v4 = judge(four, '(4) no declaration');
      same([v4.verdict, v4.problems, v4.items, v4.ended, v4.equal, v4.declared], ['incomplete', ['no declaration'], 0, 0, 0, null], '(4)');

      const five = await p7Run();
      const differing = [{ setting: 'canonical', reference: { result: 1 }, candidate: { result: 2 } }];
      Object.assign(endOf(five, 'n0').result, { same: false, differing });
      const v5 = judge(five, '(5) not equal');
      same([v5.verdict, v5.notEqual, v5.diagnostics, v5.problems], ['not-equal', ['n0'], [{ id: 'n0', differing }], []], '(5)');

      const six = await p7Run();
      endOf(six, 'n0').result.steps[0].representation = 'reference';
      const v6 = judge(six, '(6) no fast path on a normal model');
      same([v6.verdict, v6.coverage.complete, v6.problems], ['incomplete', false, []], '(6)');

      const seven = await p7Run();
      endOf(seven, 'm:mem-near-reference').result.steps[0].representation = 'lists';
      const v7 = judge(seven, '(7) no fallback');
      same([v7.verdict, v7.coverage.complete], ['incomplete', false], '(7)');
      assert(v7.coverage.memory.some((/** @type {any} */ m) => m.fixture === 'mem-near-reference' && m.expected === 'reference' && m.ok === false), '(7) the entry');

      const eight = await p7Run();
      endOf(eight, 'n0').result.steps[0].wsBytes = 167772160;
      const v8 = judge(eight, '(8) over the capacity');
      same([v8.verdict, v8.coverage.budget.length, v8.coverage.complete], ['incomplete', 1, false], '(8)');

      const nine = await p7Run();
      nine.lines = nine.lines.filter((/** @type {any} */ l) => !(l.type === 'item-start' && l.item === 'n0'));
      const v9 = judge(nine, '(9) a missing start');
      assert(v9.verdict === 'incomplete', '(9) verdict');
      hasProblem(v9, 'the item log is invalid: out-of-order log entry for n0', '(9)');

      const v10 = judge(await p7Run({ identity: { harnessHash: 'h2' } }), '(10) another producer');
      assert(v10.verdict === 'incomplete', '(10) verdict');
      hasProblem(v10, "the run's producer differs from its declaration (harnessHash)", '(10)');

      const v11 = judge(await p7Run({ omit: ['n0'] }), '(11) no kernel item');
      assert(v11.verdict === 'incomplete', '(11) verdict');
      hasProblem(v11, 'the declared items differ from the required corpus', '(11)');

      const twelve = await p7Run();
      twelve.declaration.corpus.inputs = [];
      const v12 = judge(twelve, '(12) no input index');
      assert(v12.verdict === 'incomplete', '(12) verdict');
      hasProblem(v12, 'the corpus input index is empty', '(12)');
      hasProblem(v12, 'the corpus input a.json is missing from the declaration', '(12)');

      const thirteen = await p7Run();
      thirteen.corpus.inputs[0].sha256 = 'B';
      const v13 = judge(thirteen, '(13) a changed input');
      assert(v13.verdict === 'incomplete', '(13) verdict');
      hasProblem(v13, 'the corpus input a.json changed', '(13)');

      const fourteen = await p7Run();
      fourteen.lines.push({ type: 'item-start', identityHash: fourteen.lines[0].identityHash, item: 'zz', kind: 'p7-equal', variant: 'p7-x', at: '2026-01-01T00:00:00.000Z' });
      const v14 = judge(fourteen, '(14) an undeclared start');
      assert(v14.verdict === 'incomplete', '(14) verdict');
      hasProblem(v14, 'the item log is invalid: unknown item zz', '(14)');

      const fifteen = await p7Run();
      fifteen.corpus.counts = { kernel: 2, pm4: 0, memory: 7, time: 0 };
      const v15 = judge(fifteen, '(15) shortened counts');
      assert(v15.verdict === 'incomplete', '(15) verdict');
      hasProblem(v15, 'the required corpus counts {"kernel":1,"pm4":0,"memory":7,"time":0} differ from {"kernel":2,"pm4":0,"memory":7,"time":0}', '(15)');
    },
  },
  {
    name: 'p7: timing verdict',
    async run() {
      const { timeVerdict } = await import('./p7-probe.mjs');
      const endOf = (/** @type {any} */ run, /** @type {string} */ id) => run.lines.find((/** @type {any} */ l) => l.type === 'item-end' && l.item === id);
      const near = (/** @type {number | null} */ a, /** @type {number} */ b) => a !== null && Math.abs(a - b) < 1e-9;
      /** @param {any} v @param {string} text @param {string} label */
      const hasProblem = (v, text, label) => assert(v.problems.includes(text), `${label}: ${JSON.stringify(v.problems)}`);
      const valid = timeVerdict(await p7Run({ time: true }));
      assert(valid.verdict === 'measured' && valid.problems.length === 0 && valid.capped.length === 0 && valid.items === 90 && valid.ended === 90, `the valid run: ${JSON.stringify(valid)}`);
      assert(near(valid.ratio, 1.04) && near(valid.geoRatio, 1.04) && near(valid.refMs, 9360) && near(valid.candMs, 9000), `the ratios: ${valid.ratio} ${valid.geoRatio}`);
      same([valid.declared.rounds, valid.declared.tier], [3, null], 'the declared rounds');

      const capped = await p7Run({ time: true });
      endOf(capped, 't2').result.capped = 'both';
      const c = timeVerdict(capped);
      assert(c.verdict === 'measured' && isDeepStrictEqual(c.capped, ['t2']) && near(c.ratio, 1.04), `a capped pair: ${JSON.stringify(c)}`);

      const notSame = await p7Run({ time: true });
      endOf(notSame, 't5').result.same = false;
      const n = timeVerdict(notSame);
      same([n.verdict, n.notSame, n.ratio, n.geoRatio, n.refMs, n.candMs], ['failed', ['t5'], null, null, null, null], `a pair that differs: ${JSON.stringify(n)}`);

      const missing = await p7Run({ time: true });
      missing.lines.pop();
      const m = timeVerdict(missing);
      same([m.verdict, m.missing, m.ratio], ['incomplete', ['t89'], null], `a missing end: ${JSON.stringify(m)}`);
      hasProblem(m, 'the item log is invalid: interrupted item t89 needs a ruling', 'a missing end');

      const censored = await p7Run({ time: true });
      Object.assign(endOf(censored, 't3'), { status: 'censored', result: { outcome: 'censored' } });
      const ce = timeVerdict(censored);
      same([ce.verdict, ce.censored, ce.problems], ['incomplete', ['t3'], []], `a censored item: ${JSON.stringify(ce)}`);

      const error = await p7Run({ time: true });
      Object.assign(endOf(error, 't4'), { status: 'error', result: { outcome: 'error', reason: 'a rating threw' } });
      const e = timeVerdict(error);
      same([e.verdict, e.errors, e.problems], ['incomplete', ['t4'], []], `an item error: ${JSON.stringify(e)}`);

      const zero = await p7Run({ time: true });
      endOf(zero, 't6').result.candMs = 0;
      const z = timeVerdict(zero);
      same([z.verdict, z.invalid, z.ratio], ['failed', ['t6'], null], `a zero time: ${JSON.stringify(z)}`);

      const none = await p7Run({ time: true });
      endOf(none, 't7').result.refMs = null;
      const nu = timeVerdict(none);
      same([nu.verdict, nu.invalid, nu.ratio], ['failed', ['t7'], null], `a null time: ${JSON.stringify(nu)}`);

      const start = await p7Run({ time: true });
      start.lines = start.lines.filter((/** @type {any} */ l) => !(l.type === 'item-start' && l.item === 't0'));
      const s = timeVerdict(start);
      assert(s.verdict === 'incomplete', 'a missing start');
      hasProblem(s, 'the item log is invalid: out-of-order log entry for t0', 'a missing start');

      const producer = timeVerdict(await p7Run({ time: true, identity: { sourceDigest: 's2' } }));
      assert(producer.verdict === 'incomplete', 'another producer');
      hasProblem(producer, "the run's producer differs from its declaration (sourceDigest)", 'another producer');

      const short = timeVerdict(await p7Run({ time: true, omit: ['t1'] }));
      assert(short.verdict === 'incomplete' && short.ratio === null, 'a shortened declaration');
      hasProblem(short, 'the declared items differ from the required corpus', 'a shortened declaration');
      hasProblem(short, 'the declaration does not hold 90 items', 'a shortened declaration');
    },
  },
  {
    name: 'p7: bindings and go',
    async run() {
      const { corpusInputPaths, equalityBinding, equalityEvidencePaths, goDecision } = await import('./p7-probe.mjs');
      const dir = 'tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal';
      const required = equalityEvidencePaths('p7-x', 'quick');
      same(required, [`${dir}/experiment.json`, `${dir}/state.json`, `${dir}/items.jsonl`, ...corpusInputPaths('equal')], 'the required paths');
      assert(required.length === 12, 'twelve required paths');
      const candidate = { variant: 'p7-x', treeId: 'T1', copyDigest: 'C1', root: 'r' };
      const reference = { variant: 'base', treeId: 'T0', copyDigest: 'C0', root: 'r0' };
      const clean = () => ({
        meta: { inputs: required.map((path) => ({ path, sha256: 'h' })) },
        equal: { verdict: 'equal', declared: { candidate: { ...candidate }, reference: { ...reference }, tier: 'quick', corpusVersion: 'p7-corpus-v1' }, coverage: { complete: true } },
      });
      /** @param {any} report @param {(path: string) => string | null} [fileHash] */
      const bind = (report, fileHash = () => 'h') => equalityBinding(report, { tier: 'quick', candidate, reference, fileHash, requiredInputs: required });
      /** @param {any} report @param {string} reason @param {string} label */
      const refused = (report, reason, label) => same(bind(report), { ok: false, reason }, label);
      /** @param {string} path @returns {(report: any) => void} */
      const without = (path) => (report) => { report.meta.inputs = report.meta.inputs.filter((/** @type {{ path: string }} */ i) => i.path !== path); };
      same(bind(clean()), { ok: true }, 'a passing report');
      refused(null, 'no quick equality report', 'no report');
      const incomplete = clean();
      incomplete.equal.verdict = 'incomplete';
      refused(incomplete, 'quick equality is incomplete', 'an incomplete verdict');
      const other = clean();
      other.equal.declared.candidate.treeId = 'T9';
      refused(other, 'the quick report was made on another candidate tree', 'another candidate tree');
      const none = clean();
      none.meta.inputs = [];
      refused(none, 'the quick report binds no input', 'no input');
      const boards = clean();
      without('tools/ig-proto/data/boards-v1.json')(boards);
      refused(boards, 'the quick report does not bind tools/ig-proto/data/boards-v1.json', 'the catalogue removed');
      const state = `${dir}/state.json`;
      same(bind(clean(), (path) => (path === state ? null : 'h')), { ok: false, reason: `the quick report's input ${state} is missing` }, 'a missing state');
      same(bind(clean(), (path) => (path === 'tools/ig-proto/data/p7-memory-fixtures.json' ? 'h2' : 'h')), { ok: false, reason: "the quick report's input tools/ig-proto/data/p7-memory-fixtures.json changed" }, 'a changed manifest');
      for (const name of ['experiment.json', 'state.json', 'items.jsonl']) {
        const report = clean();
        without(`${dir}/${name}`)(report);
        refused(report, `the quick report does not bind ${dir}/${name}`, `${name} removed`);
      }
      const corpusOnly = clean();
      corpusOnly.meta.inputs = corpusOnly.meta.inputs.filter((/** @type {{ path: string }} */ i) => corpusInputPaths('equal').includes(i.path));
      refused(corpusOnly, `the quick report does not bind ${dir}/experiment.json`, 'only the corpus inputs');
      const twice = clean();
      twice.meta.inputs.push({ path: state, sha256: 'h' });
      refused(twice, `the quick report binds ${state} more than once`, 'a duplicated state');

      const good = { ok: true };
      same(goDecision({ quick: { ok: true }, full: good, timing: { verdict: 'measured', notSame: [], ratio: 1.04 } }), { go: true, reasons: [] }, 'go at 1.04');
      same(goDecision({ quick: { ok: true }, full: good, timing: { verdict: 'measured', notSame: [], ratio: 1.0399 } }), { go: false, reasons: ['ratio 1.0399 below 1.04'] }, 'no go below 1.04');
      same(goDecision({ quick: bind(other), full: good, timing: { verdict: 'measured', notSame: [], ratio: 1.04 } }),
        { go: false, reasons: ['quick: the quick report was made on another candidate tree'] }, 'no go on another tree');
      same(goDecision({ quick: { ok: true }, full: good, timing: { verdict: 'incomplete', notSame: [], ratio: null } }), { go: false, reasons: ['timing incomplete'] }, 'no go without a measurement');
      same(goDecision({ quick: { ok: true }, full: good, timing: { verdict: 'failed', notSame: ['t1', 't2'], ratio: null } }).reasons, ['timing failed', 'differing 2'], 'differing pairs');
    },
  },
  {
    name: 'write-plan: V4-P7',
    async run() {
      const m = await import('./manifest.mjs');
      const all = ['p7-c1', 'p7-c1r5', 'p7-c1r5c5'];
      const { plan, itemManifests } = m.writtenPlan('V4-P7', { candidates: all });
      same([plan.task, plan.generatedBy, plan.runnable], ['V4-P7', 'manifest.mjs write-plan', true], 'the plan\'s header');
      same(plan.steps.map((s) => s.id), ['prerequisites', 'firewall-snapshot', 'trees', ...all.flatMap((c) => [`bind-${c}`, `time-${c}`]), 'report', 'firewall-check'], 'the steps in order');
      same(plan.steps[2].node.slice(-5), ['build', 'base', ...all], 'the trees step');
      same(plan.prerequisites, all.flatMap((c) => [
        { type: 'variant', id: c },
        { type: 'file', path: `docs/improve-generating/evidence/frozen/V4-P7E-${c}-quick/p7.json` },
        { type: 'file', path: `docs/improve-generating/evidence/frozen/V4-P7E-${c}-full/p7.json` },
      ]), 'the prerequisites');
      for (const c of all) {
        const bind = /** @type {any} */ (plan.steps.find((s) => s.id === `bind-${c}`));
        same([bind.locked, bind.node.slice(-5)], [false, ['bind', '--candidate', c, '--task', 'V4-P7']], `${c}: the bind step`);
        const time = /** @type {any} */ (plan.steps.find((s) => s.id === `time-${c}`));
        same([time.locked, time.dependsOn, time.minHorizonS, time.price.groups.length], [true, [`bind-${c}`], 150, 1], `${c}: the time step`);
        const [group] = time.price.groups;
        same([group.kind, group.variant, group.lanes, group.reserveS, group.durationsS.length], ['p7-time', c, 1, 90, 90], `${c}: the item group`);
      }
      same(itemManifests, {}, 'no item manifest');
      same([plan.allocationMinutes, plan.optionalMinutes, Math.round(m.planGuardS(plan) * 1000) / 1000], [16, 0, 1162.172], 'the approved price of three composites');
      const one = m.writtenPlan('V4-P7', { candidates: ['p7-c1'] }).plan;
      same([one.steps.length, one.allocationMinutes, Math.round(m.planGuardS(one) / 60 * 100) / 100], [7, 6, 6.46], 'one composite');
      const refusal = 'manifest: V4-P7 needs one to three of p7-c1, p7-c1r5, p7-c1r5c5, in order';
      for (const candidates of [[], ['p7-c1r5', 'p7-c1'], ['p7-x'], ['p7-c1', 'p7-c1'], undefined]) {
        same(thrownBy(() => m.writtenPlan('V4-P7', { candidates })), refusal, `refused: ${JSON.stringify(candidates)}`);
      }
      const dir = fresh(join(SELFTEST_DIR, 'write-plan-p7', 'run'));
      try {
        const other = await captureOutput(() => m.writePlanCommand(['--plan', 'V4-S2B', '--candidates', 'p7-c1', '--label', 'frozen', '--source-label', 'self-test'], { plansDir: dir }));
        same([other.code, other.err], [1, 'write-plan: --candidates belongs to V4-P7\n'], '--candidates of another plan');
        const missing = await captureOutput(() => m.writePlanCommand(['--plan', 'V4-P7', '--label', 'frozen', '--source-label', 'self-test'], { plansDir: dir }));
        same([missing.code, missing.err], [1, `write-plan: ${refusal.replace('manifest: ', '')}\n`], 'no --candidates');
      } finally {
        rmSync(join(SELFTEST_DIR, 'write-plan-p7'), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'prior-s3: the rules on synthetic records',
    run() {
      /** @param {number[]} reps @returns {any[]} */
      const pilotLines = (reps) => reps.flatMap((r) => [3, 5].map((wc, i) => ({ r, wc: r === 4 ? wc + 3 : wc, call: `c${r}${'ab'[i]}` })))
        .flatMap(({ r, wc, call }) => [{ t: 'start', call, row: `x~${r}`, K: 10 }, { t: 'end', call, locate: { wc } }]);
      const nullWc = [{ t: 'start', call: 'c0n', row: 'x~0', K: 10 }, { t: 'end', call: 'c0n', locate: { wc: null } }];
      same(pilotShare([...pilotLines([0, 1, 2, 3, 4]), ...nullWc]), { share: 0.4, n: 10 }, 'the piloted rule');
      same(thrownBy(() => pilotShare(pilotLines([0, 1, 2, 4]))), 'fit-prior-s3: rep 3 has no call', 'a missing rep');
      /** @param {string} seed @param {any[]} probes @returns {any} */
      const family = (seed, probes) => ({ set: { seed, K: 10 }, probes });
      same(familyShare([
        family('s1', [{ eligible: true, inBand: true, count: 4 }, { eligible: true, inBand: false, count: 9 }]),
        family('s1', [{ eligible: true, inBand: true, count: 6 }]),
        family('s2', [{ eligible: false, inBand: true, count: 2 }]),
      ]), { share: 0.5, n: 2, seeds: 1 }, 'the window rule');
      same(thrownBy(() => familyShare([family('s1', [{ eligible: false, inBand: true, count: 2 }])])), 'fit-prior-s3: no eligible probe', 'no eligible probe');
    },
  },
  {
    name: 'prior-s3: the table of plan 4.1',
    run() {
      const { cells } = computePriorS3();
      same(Object.keys(cells).length, 27, 'the number of cells');
      const plan = { 196: 0.4, 215: 0.404412, 256: 0.358108, 300: 0.443429, 324: 0.347222, 360: 0.331514, 400: 0.368421, 420: 0.390244, 480: 0.297161, 484: 0.2875, 576: 0.219512, 676: 0.2 };
      same(Object.keys(cells).filter((k) => k.startsWith('hell-1@')).map((k) => [Number(k.slice(7)), cells[k].share]).sort((a, b) => a[0] - b[0]),
        Object.entries(plan).map(([area, share]) => [Number(area), share]), 'the twelve Hell 1 shares of plan 4.1');
      const prior = JSON.parse(readFileSync(join(IG_DIR, 'data', 'prior-v1.json'), 'utf8'));
      const nightmare = Object.keys(cells).filter((k) => k.startsWith('nightmare@'));
      same(nightmare.length, 15, 'the Nightmare entries');
      same(Object.fromEntries(nightmare.map((k) => [k, cells[k]])), Object.fromEntries(nightmare.map((k) => [k, prior.cells[k]])), 'the Nightmare entries are prior-v1\'s');
      same([196, 400, 576, 676].map((a) => cells[`hell-1@${a}`].n), [68, 75, 70, 64], 'the pilots\' n');
    },
  },
  {
    name: 'freeze: classes, bounds and values',
    async run() {
      const { classOf, FREEZE_CLASSES, FREEZE_VALUES } = await import('./freeze.mjs');
      same([['nightmare', 87], ['nightmare', 144], ['nightmare', 145], ['nightmare', 195], ['nightmare', 196], ['nightmare', 256], ['nightmare', 257],
        ['nightmare', 324], ['nightmare', 325], ['nightmare', 359], ['nightmare', 360], ['nightmare', 676], ['hell-1', 196], ['hard', 100]]
        .map(([level, area]) => classOf(/** @type {string} */ (level), /** @type {number} */ (area))),
      ['n-small', 'n-small', null, null, 'n-mid', 'n-mid', 'n-upper', 'n-upper', null, null, 'n-large', 'n-large', 'hell-1', null], 'classOf at the bounds');
      const cells = FREEZE_CLASSES.flatMap((c) => c.cells);
      same([cells.length, new Set(cells).size], [19, 19], 'the 19 distinct cells');
      assert(FREEZE_CLASSES.every((c) => c.screen === 'fr-frozen' && c.noScreen === 'fr-frozen-none'), 'every class names its two arms');
      for (const cls of FREEZE_CLASSES) {
        for (const cell of cls.cells) {
          const { levelId, area } = caseBoard(cell);
          same(classOf(levelId, area), cls.id, `${cell} is in ${cls.id}`);
        }
      }
      same(Object.keys(FREEZE_VALUES.W), ['n-small', 'n-mid', 'n-upper', 'n-large', 'hell-1'], 'W has the five class ids');
    },
  },
  {
    name: 'live-deadline: row checks',
    async run() {
      const { LIVE_DECLARED, rowChecks } = await import('./live-deadline.mjs');
      const { S, C, B, P, E } = ledgerLines();
      const closed = (/** @type {string} */ key) => {
        const c = `${key}:1:2:1`;
        return {
          lines: [S(c, 'set', 0, 10), C(c), B(c), P(c, 0, 100, 0), B(c), P(c, 1, 50, 10), E(c, 160, 2, 0)],
          links: /** @type {any[] | null} */ ([{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }]), problems: /** @type {string[]} */ ([]),
        };
      };
      const rowOf = async (/** @type {number} */ i, /** @type {Record<string, any>} */ over = {}, /** @type {number} */ accepted = 10, /** @type {Record<string, any>} */ top = {}) => {
        const d = LIVE_DECLARED[i];
        return { rowKey: d.rowKey, caseId: d.caseId, rep: d.rep, seed: d.seed, localRep: d.rep, run: await matrixRun(d.caseId, d.rep, accepted, { igSetMs: 30000, ...over }), ...top };
      };
      const clean = async () => {
        const rows = await Promise.all(LIVE_DECLARED.map((_, i) => rowOf(i)));
        return { rows, journals: Object.fromEntries(LIVE_DECLARED.map((d) => [d.rowKey, closed(d.rowKey)])) };
      };
      const base = await clean();
      const ok = rowChecks(base.rows, base.journals);
      same([ok.observed.length, ok.failures, ok.incomplete, ok.table.length], [10, [], [], 10], `the clean rows: ${JSON.stringify(ok)}`);
      assert(ok.table.every((t) => t.ledgerComplete === true && t.status === 'valid' && t.responseMs === 31000), 'the clean table');
      /** @param {string} name @param {(x: { rows: any[], journals: any }) => Promise<void> | void} edit @returns {Promise<any>} */
      const variant = async (name, edit) => {
        const x = await clean();
        await edit(x);
        return rowChecks(x.rows, x.journals);
      };
      const hasIn = (/** @type {string[]} */ list, /** @type {string} */ text, /** @type {string} */ what) => assert(list.some((l) => l.includes(text)), `${what}: ${JSON.stringify(list)} lacks "${text}"`);
      const late = await variant('(1)', async (x) => { x.rows[3] = await rowOf(3, { responseMs: 120001 }); });
      same([late.failures.length, late.incomplete], [1, []], `(1) ${JSON.stringify(late)}`);
      hasIn(late.failures, 'outside [0, 120000]', '(1)');
      const negative = await variant('(2)', async (x) => { x.rows[4] = await rowOf(4, { responseMs: -1 }); });
      same(negative.failures.length, 1, `(2) ${JSON.stringify(negative)}`);
      hasIn(negative.failures, 'outside [0, 120000]', '(2)');
      const killed = await variant('(3)', async (x) => { x.rows[5] = await rowOf(5, { errors: [{ phase: 'host', code: 'child-timeout', message: 'x' }] }); });
      same(killed.failures.length, 1, `(3) ${JSON.stringify(killed)}`);
      hasIn(killed.failures, 'killed at the row limit', '(3)');
      hasIn(killed.incomplete, 'row 26x26-hell-1~0: censored', '(3)');
      const errored = await variant('(4)', async (x) => { x.rows[6] = await rowOf(6, { partialReason: 'error:internal', errors: [{ phase: 'batch', code: 'internal', message: 'x' }] }); });
      same([errored.failures.length, errored.incomplete], [1, []], `(4) ${JSON.stringify(errored)}`);
      hasIn(errored.failures, 'row 26x26-hell-1~1: error', '(4)');
      const invalidMeasure = await variant('(5)', async (x) => { x.rows[7] = await rowOf(7, { measurementValid: false }); });
      same([invalidMeasure.failures, invalidMeasure.observed.length, invalidMeasure.incomplete.length], [[], 9, 1], `(5) ${JSON.stringify(invalidMeasure)}`);
      hasIn(invalidMeasure.incomplete, 'row 26x26-hell-1~2: censored', '(5)');
      const interrupted = await variant('(6)', async (x) => { x.rows[8] = await rowOf(8, { interrupted: true }); });
      same([interrupted.failures, interrupted.observed.length, interrupted.incomplete.length], [[], 9, 1], `(6) ${JSON.stringify(interrupted)}`);
      hasIn(interrupted.incomplete, 'row 26x26-hell-1~3: censored', '(6)');
      const seed = 'landscape/14x14-nightmare/9';
      const other = await variant('(7)', async (x) => { x.rows[9] = await rowOf(9, { seed }, 10, { seed }); });
      same([other.failures, other.observed.length], [[], 9], `(7) ${JSON.stringify(other)}`);
      assert(other.incomplete.includes('row 26x26-hell-1~4 is not its declared request'), `(7) ${JSON.stringify(other)}`);
      const noSet = await variant('(8)', async (x) => { x.rows[1] = await rowOf(1, { igSetMs: null, partialReason: null }); });
      same([noSet.failures, noSet.observed.length], [[], 9], `(8) ${JSON.stringify(noSet)}`);
      assert(noSet.incomplete.includes('row 14x14-nightmare~1: no igSetMs for a completed set'), `(8) ${JSON.stringify(noSet)}`);
      const cut = (/** @type {number} */ ms) => async (/** @type {{ rows: any[] }} */ x) => {
        x.rows[2] = { ...x.rows[2], run: await matrixRun('14x14-nightmare', 2, 0, { partialReason: 'set:reserve-cut', igSetMs: null, responseMs: ms }) };
      };
      const slowCut = await variant('(9)', cut(110000));
      same([slowCut.failures, slowCut.incomplete], [['row 14x14-nightmare~2: the set stage ended at 110000 ms, over 48000'], []], `(9) ${JSON.stringify(slowCut)}`);
      const fastCut = await variant('(10)', cut(46000));
      same([fastCut.failures, fastCut.incomplete, fastCut.observed.length], [[], [], 10], `(10) ${JSON.stringify(fastCut)}`);
      const twice = await variant('(11)', async (x) => { x.rows.push(x.rows[0]); });
      assert(twice.incomplete.includes('row 14x14-nightmare~0 is published 2 times') && !twice.observed.includes('14x14-nightmare~0'), `(11) ${JSON.stringify(twice)}`);
      const extra = await variant('(12)', async (x) => { x.rows.push({ ...(await rowOf(0)), rowKey: '14x14-nightmare~7', rep: 7, seed: 'landscape/14x14-nightmare/7' }); });
      assert(extra.incomplete.includes('unexpected row 14x14-nightmare~7') && extra.observed.length === 10, `(12) ${JSON.stringify(extra)}`);
      const noLink = await variant('(13)', async (x) => { x.journals['14x14-nightmare~0'] = { ...closed('14x14-nightmare~0'), links: null }; });
      hasIn(noLink.incomplete, 'row 14x14-nightmare~0: journal not closed: no linkage', '(13)');
      same([noLink.failures, noLink.observed.length], [[], 9], `(13) ${JSON.stringify(noLink)}`);
      const edge = await variant('(14)', async (x) => { x.rows[1] = await rowOf(1, { igSetMs: 48001 }); });
      same([edge.failures, edge.incomplete], [['row 14x14-nightmare~1: set stage 48001 ms outside [0, 48000]'], []], `(14) ${JSON.stringify(edge)}`);
      const unreadable = await variant('(15)', async (x) => { x.journals['14x14-nightmare~3'] = { lines: [], links: null, problems: ['bad json'] }; delete x.journals['14x14-nightmare~4']; });
      hasIn(unreadable.incomplete, 'row 14x14-nightmare~3: unreadable journals: bad json', '(15)');
      hasIn(unreadable.incomplete, 'row 14x14-nightmare~4: unreadable journals', '(15)');
    },
  },
  {
    name: 'live-deadline: verification checks',
    async run() {
      const { LIVE_CASES, LIVE_TEST_DEADLINE, verifyChecks } = await import('./live-deadline.mjs');
      const parentOf = (/** @type {string} */ variant, /** @type {string} */ treeId) => ({
        variant, chain: ['base', variant], treeId, copyDigest: 'c', edits: [{ id: 'meta-1' }, { id: 'a-1' }, { id: 'meta-2' }],
        files: { 'core/engine/ig-params.js': 'x' }, params: { variant, callBudget: 1, liveDeadline: 'frozen' },
      });
      const twinOf = (/** @type {string} */ parent, /** @type {string} */ twin, /** @type {string} */ treeId) => ({
        variant: twin, chain: ['base', parent, 'w8', twin], treeId, copyDigest: 'e', edits: [{ id: 'meta-1' }, { id: 'a-1' }, { id: 'w8-1' }, { id: 'meta-2' }],
        files: { 'core/engine/ig-params.js': 'y' }, params: { variant: twin, callBudget: 1, liveDeadline: structuredClone(LIVE_TEST_DEADLINE) },
      });
      const make = () => ({
        state: { task: 'V4-LIVE-verify', label: 'frozen', done: true, results: LIVE_CASES.map((name) => ({ name, pass: true, reason: null, ms: 1 })) },
        identity: {
          format: 'ig-selftest-identity', version: 1, task: 'V4-LIVE-verify', label: 'frozen', group: 'v4', selected: [...LIVE_CASES], harnessHash: 'h',
          frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST,
          trees: {
            'fr-frozen': { treeId: 't1', paramsHash: 'p1' }, 'fr-frozen-none': { treeId: 't2', paramsHash: 'p2' },
            'fr-frozen-live-test': { treeId: 'd1' }, 'fr-frozen-none-live-test': { treeId: 'd2' },
          },
          startedAt: 'a', endedAt: 'b',
        },
        freezeVariants: { 'fr-frozen': { treeId: 't1', paramsHash: 'p1' }, 'fr-frozen-none': { treeId: 't2', paramsHash: 'p2' } },
        parents: { 'fr-frozen': parentOf('fr-frozen', 't1'), 'fr-frozen-none': parentOf('fr-frozen-none', 't2') },
        twins: { 'fr-frozen-live-test': twinOf('fr-frozen', 'fr-frozen-live-test', 'd1'), 'fr-frozen-none-live-test': twinOf('fr-frozen-none', 'fr-frozen-none-live-test', 'd2') },
        harnessHash: 'h',
      });
      /** @type {(edit: (x: any) => void) => { observed: string[], failures: string[], incomplete: string[] }} */
      const run = (edit) => {
        const x = make();
        edit(x);
        return verifyChecks(x);
      };
      const ok = run(() => {});
      same([ok.observed.length, ok.failures, ok.incomplete], [15, [], []], `the clean verification: ${JSON.stringify(ok)}`);
      const name = LIVE_CASES[3];
      const incompleteWith = (/** @type {string} */ label, /** @type {(x: any) => void} */ edit, /** @type {string[]} */ texts) => {
        const got = run(edit);
        for (const text of texts) {
          assert(got.incomplete.includes(text), `${label}: ${JSON.stringify(got.incomplete)} lacks "${text}"`);
        }
        return got;
      };
      incompleteWith('(1)', (x) => { x.identity.task = 'S24-T09a'; }, ['the verification record is S24-T09a/frozen/v4, not V4-LIVE-verify/frozen/v4']);
      incompleteWith('(2)', (x) => { x.identity.label = 'selftest'; }, ['the verification record is V4-LIVE-verify/selftest/v4, not V4-LIVE-verify/frozen/v4']);
      incompleteWith('(3)', (x) => { x.identity.trees['fr-frozen-live-test'].treeId = 'd9'; }, ['the verification tested another tree fr-frozen-live-test']);
      incompleteWith('(4)', (x) => { x.harnessHash = 'g'; }, ['the verification ran another producer']);
      same(incompleteWith('(5)', (x) => { x.identity = null; }, ['no verification identity']).incomplete, ['no verification identity'], '(5) nothing else');
      incompleteWith('(6)', (x) => { x.identity.sourceDigest = 'x'; }, ['the verification ran another source']);
      const failed = run((x) => { x.state.results[3] = { name, pass: false, reason: 'why', ms: 1 }; });
      same([failed.failures, failed.observed.length], [[`self-test case ${name} failed: why`], 14], `(7) ${JSON.stringify(failed)}`);
      same(run((x) => { x.state.done = false; }).failures, ['the live verification is not done'], '(8) not done');
      incompleteWith('(9)', (x) => { x.identity.selected.push(name); }, [`the verification selected ${name} 2 times`]);
      const missing = run((x) => { x.identity.selected.splice(3, 1); x.state.results.splice(3, 1); });
      same([missing.observed.length, missing.observed.includes(`self-test:${name}`)], [14, false], `(10) ${JSON.stringify(missing)}`);
      incompleteWith('(11)', (x) => { x.identity.format = 'x'; }, ['the verification identity is not ig-selftest-identity version 1']);
      incompleteWith('(12)', (x) => { delete x.identity.endedAt; }, ['the verification identity lacks endedAt']);
      const twin = 'fr-frozen-live-test';
      incompleteWith('(13)', (x) => { x.twins[twin].chain = ['base', 'fr-frozen-none', 'w8', twin]; }, [`the test derivative ${twin} is not fr-frozen with w8`]);
      incompleteWith('(14)', (x) => { x.twins[twin].edits.splice(2, 0, { id: 'x-1' }); }, [`the test derivative ${twin} has an edit other than w8-1`]);
      incompleteWith('(15)', (x) => { x.twins[twin].params.callBudget = 2; }, [`the test derivative ${twin} changes a parameter other than liveDeadline`]);
      incompleteWith('(16)', (x) => { x.twins[twin].params.liveDeadline.levels = ['hard']; }, [`the test derivative ${twin} has another test deadline`]);
      incompleteWith('(17)', (x) => { x.twins[twin].files['core/engine/x.js'] = 'z'; }, [`the test derivative ${twin} adds a file`]);
      incompleteWith('(18)', (x) => { delete x.parents['fr-frozen']; }, ['no captured tree metadata for fr-frozen']);
      const stateOnly = incompleteWith('(19)', (x) => { x.state.task = 'S24-T09a'; }, ['the verification state is S24-T09a/frozen, not V4-LIVE-verify/frozen']);
      assert(!stateOnly.incomplete.some((t) => t.startsWith('the verification record is')), `(19) ${JSON.stringify(stateOnly.incomplete)}`);
    },
  },
  {
    name: "live-deadline: the receipt's verdicts",
    async run() {
      const { LIVE_ARMS, LIVE_COVERAGE, LIVE_TWINS, liveLayout, liveReceipt } = await import('./live-deadline.mjs');
      const { parseLines } = await import('./verdicts.mjs');
      const base = 'tests/artifacts/ig-proto/selftest/S24-T09b-dev';
      try {
        const layout = await liveFixture(base, 'S24-T09b-dev');
        const json = (/** @type {string} */ path) => JSON.parse(readFileSync(abs(path), 'utf8'));
        const names = readdirSync(abs(layout.runsDir)).sort();
        const runs = names.map((n) => ({ path: `${layout.runsDir}/${n}`, doc: json(`${layout.runsDir}/${n}`) }));
        const shard0 = runs[0].doc.shard;
        const rawShards = Object.fromEntries(runs.map(({ doc }) => [doc.shard, json(`${layout.rawDir}/${doc.shard}/shard.json`)]));
        /** @type {Record<string, any>} */
        const journals = {};
        for (const { doc } of runs) {
          for (const row of doc.rows) {
            const logs = `${layout.rawDir}/${doc.shard}/logs`;
            const text = (/** @type {string} */ n) => readFileSync(abs(`${logs}/${n}`), 'utf8');
            const worker = parseLines(text(`${row.rowKey}.1.2.jsonl`), 'w');
            const link = parseLines(text(`${row.rowKey}.link.jsonl`), 'l');
            journals[row.rowKey] = { lines: worker.lines, links: link.lines, problems: [...worker.problems, ...link.problems] };
          }
        }
        const today = (/** @type {string} */ id) => readTreeInfo(id);
        const clean = {
          freezeVariants: json(layout.freeze).variants,
          trees: Object.fromEntries(LIVE_ARMS.map((id) => [id, { ...today(id), paramsHash: sha256(JSON.stringify(today(id).params)) }])),
          twins: Object.fromEntries(LIVE_TWINS.map((id) => [id, today(id)])),
          runs, rawShards, journals, state: json(layout.verifyState), identity: json(layout.verifyIdentity), harnessNow: harnessInfo().harnessHash, evidence: [],
        };
        const verdict = (/** @type {(x: any) => void} */ edit) => {
          const x = structuredClone(clean);
          edit(x);
          return liveReceipt(x);
        };
        const ok = liveReceipt(clean);
        same([ok.kind, ok.verdict, ok.reasons], ['live-deadline', 'pass', []], `the clean receipt: ${JSON.stringify(ok.reasons)}`);
        same([ok.live, ok.postHoc, ok.workCutoffMs, ok.responseBoundMs, ok.reserveChecked], [true, false, 115000, 120000, true], 'the five fields at the root');
        same(Object.keys(LIVE_DEADLINE_FIELDS).every((k) => ok[k] === /** @type {any} */ (LIVE_DEADLINE_FIELDS)[k]), true, 'the fields are LIVE_DEADLINE_FIELDS');
        same([ok.arms.length, ok.coverage.expected.length, ok.coverage.observed.length, ok.coverage.missing, ok.rows.length], [2, 25, 25, [], 10], 'two arms, 25 ids');
        same(ok.coverage.expected, [...LIVE_COVERAGE], 'the declared coverage');
        /** @type {[string, (x: any) => void, string, string | null][]} */
        const variants = [
          ['(1) a response of 130 s', (x) => { x.runs[0].doc.rows[3].run.responseMs = 130000; }, 'fail', null],
          ['(2) a stale tree', (x) => { x.trees['fr-frozen-none'].treeId = 't3'; }, 'incomplete', 'stale tree fr-frozen-none'],
          ['(3) another producer today', (x) => { x.harnessNow = 'x'; }, 'incomplete', 'producer changed since the observation'],
          ['(4) another source', (x) => { x.runs[0].doc.meta.source.sourceDigest = 'x'; }, 'incomplete', `runs file ${runs[0].path} is not of the frozen source`],
          ['(5) a raw shard of another copy', (x) => { x.rawShards[shard0].copyDigest = 'x'; }, 'incomplete', `runs file ${runs[0].path} differs from its raw shard`],
          ['(6) a missing raw shard', (x) => { x.rawShards['live-26x26-hell-1'] = null; }, 'incomplete', 'no raw shard identity live-26x26-hell-1'],
          ['(7) no verification identity', (x) => { x.identity = null; }, 'incomplete', 'no verification identity'],
          ['(8) no freeze record', (x) => { x.freezeVariants = null; }, 'incomplete', 'no freeze record'],
          ['(9) a twin of the wrong parent', (x) => { x.twins['fr-frozen-live-test'].chain = x.twins['fr-frozen-live-test'].chain.map((/** @type {string} */ c) => (c === 'fr-frozen' ? 'fr-frozen-none' : c)); }, 'incomplete',
            'the test derivative fr-frozen-live-test is not fr-frozen with w8'],
          ['(10) a twin with an extra edit', (x) => {
            const edits = x.twins['fr-frozen-none-live-test'].edits;
            edits.splice(edits.findIndex((/** @type {any} */ e) => e.id === 'w8-1'), 0, { id: 'x-1' });
          }, 'incomplete', 'the test derivative fr-frozen-none-live-test has an edit other than w8-1'],
        ];
        for (const [label, edit, expected, reason] of variants) {
          const r = verdict(edit);
          same(r.verdict, expected, `${label}: ${JSON.stringify(r.reasons)}`);
          if (reason !== null) {
            assert(r.reasons.includes(reason), `${label}: ${JSON.stringify(r.reasons)} lacks "${reason}"`);
          }
        }
        same(liveLayout('T', null).receipt, 'docs/improve-generating/evidence/frozen/T/live-deadline.json', 'the real layout');
      } finally {
        rmSync(abs(base), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'live-deadline: CLI receipt',
    async run() {
      const { liveEvidencePaths, receiptCommand } = await import('./live-deadline.mjs');
      const root = 'tests/artifacts/ig-proto/selftest/S24-T09b-dev';
      const argv = ['--task', 'S24-T09b-dev', '--require-pass', '--label', 'frozen', '--source-label', 'self-test'];
      /** @param {string} dir @returns {string[]} */
      const walkFiles = (dir) => readdirSync(abs(dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkFiles(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
      /** @param {string} base @returns {Record<string, string>} */
      const hashes = (base) => Object.fromEntries(walkFiles(base).sort().map((p) => [p, sha256File(abs(p))]));
      /** @param {any} layout @param {string[]} [extra] */
      const run = async (layout, extra = argv) => {
        let stdout = '';
        let stderr = '';
        const code = await receiptCommand(extra, { layout, stdout: (t) => { stdout += t; }, stderr: (t) => { stderr += t; } });
        return { code, stdout, stderr };
      };
      /** @param {string} layout */
      const stored = (layout) => JSON.parse(readFileSync(abs(layout), 'utf8'));
      try {
        const a = await liveFixture(`${root}/a`, 'S24-T09b-dev');
        const first = await run(a);
        same(first.code, 0, `(a) ${first.stderr}`);
        same(first.stdout, `receipt: live-deadline pass -> ${a.receipt}\n`, '(a) the printed line');
        const receipt = stored(a.receipt);
        same(receipt.verdict, 'pass', `(a) ${JSON.stringify(receipt.reasons)}`);
        const logs = walkFiles(`${a.rawDir}`).filter((p) => p.includes('/logs/') && !p.endsWith('.row.jsonl'));
        const expected = liveEvidencePaths(a, {
          runs: ['live-14x14-nightmare', 'live-26x26-hell-1'].map((shard) => ({ path: `${a.runsDir}/${shard}.runs.json`, shard })), journalFiles: logs,
        });
        same(receipt.evidence.map((/** @type {any} */ e) => e.path), expected, '(a) the evidence index');
        assert(walkFiles(a.rawDir).some((p) => p.endsWith('.row.jsonl')) && !receipt.evidence.some((/** @type {any} */ e) => e.path.endsWith('.row.jsonl')), '(a) no row identity file is bound');
        assert(receipt.evidence.every((/** @type {any} */ e) => e.sha256 === sha256File(abs(e.path))), '(a) each hash is the file\'s');
        same(readdirSync(abs(a.inputs)).sort(), ['fr-frozen-live-test.ig-tree.json', 'fr-frozen-none-live-test.ig-tree.json', 'fr-frozen-none.ig-tree.json', 'fr-frozen.ig-tree.json',
          'harness.json', 'verify-identity.json', 'verify-state.json'], '(a) the seven captures');
        const before = hashes(`${root}/a`);
        const second = await run(a);
        same(second.code, 1, '(b) exit');
        assert(second.stderr.includes(`receipt ${a.receipt} exists (a passing receipt is never rewritten)`), `(b) ${second.stderr}`);
        same(hashes(`${root}/a`), before, '(b) no byte changed');
        const late = await liveFixture(`${root}/c`, 'S24-T09b-dev', (l) => {
          const path = `${l.runsDir}/live-26x26-hell-1.runs.json`;
          const doc = JSON.parse(readFileSync(abs(path), 'utf8'));
          doc.rows.find((/** @type {any} */ r) => r.rowKey === '26x26-hell-1~2').run.responseMs = 130000;
          writeJson(abs(path), doc);
        });
        const failed = await run(late);
        same([failed.code, stored(late.receipt).verdict], [2, 'fail'], `(c) ${failed.stderr}`);
        assert(failed.stderr.includes('the receipt is fail'), `(c) ${failed.stderr}`);
        const noIdentity = await liveFixture(`${root}/d`, 'S24-T09b-dev', (l) => { rmSync(abs(l.verifyIdentity)); });
        const open = await run(noIdentity);
        same([open.code, stored(noIdentity.receipt).verdict], [2, 'incomplete'], `(d) ${open.stderr}`);
        assert(stored(noIdentity.receipt).reasons.includes('no verification identity'), `(d) ${JSON.stringify(stored(noIdentity.receipt).reasons)}`);
        assert(!existsSync(abs(`${noIdentity.inputs}/verify-identity.json`)), '(d) nothing captured for the missing identity');
        const broken = await liveFixture(`${root}/e`, 'S24-T09b-dev', (l) => { writeText(abs(l.receipt), '{'); });
        const beforeBroken = hashes(`${root}/e`);
        const refused = await run(broken);
        same(refused.code, 1, '(e) exit');
        assert(refused.stderr.includes(`receipt ${broken.receipt} is unreadable`), `(e) ${refused.stderr}`);
        same(hashes(`${root}/e`), beforeBroken, '(e) nothing written');
        const stale = await liveFixture(`${root}/f`, 'S24-T09b-dev', (l) => {
          rmSync(abs(l.verifyState));
          writeText(abs(`${l.inputs}/verify-state.json`), '{"stale":true}');
          writeText(abs(`${l.inputs}/fr-frozen-live-test.ig-tree.json`), '{"stale":true}');
          const identity = JSON.parse(readFileSync(abs(l.verifyIdentity), 'utf8'));
          identity.trees['fr-frozen-live-test'].treeId = 'd9';
          writeJson(abs(l.verifyIdentity), identity);
        });
        const staleRun = await run(stale);
        same([staleRun.code, stored(stale.receipt).verdict], [2, 'incomplete'], `(f) ${staleRun.stderr}`);
        assert(stored(stale.receipt).reasons.includes('no verification state'), `(f) ${JSON.stringify(stored(stale.receipt).reasons)}`);
        assert(!existsSync(abs(`${stale.inputs}/verify-state.json`)) && !existsSync(abs(`${stale.inputs}/fr-frozen-live-test.ig-tree.json`)), '(f) the stale captures are gone');
        assert(!stored(stale.receipt).evidence.some((/** @type {any} */ e) => e.path.endsWith('/verify-state.json') || e.path.endsWith('/fr-frozen-live-test.ig-tree.json')), '(f) no stale file is bound');
        same((await run(a, ['--task', 'V4-S2', '--label', 'frozen'])).stderr, 'live-deadline: V4-S2 is a historical namespace\n', 'a historical namespace');
        same((await run(a, ['--label', 'frozen'])).stderr, 'live-deadline: receipt needs --task\n', 'no task');
        same((await run(a, ['--task', 'x'])).stderr, 'live-deadline: --label frozen only\n', 'no label');
      } finally {
        rmSync(abs(root), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'live-deadline: the acceptance expectation',
    async run() {
      const { LIVE_ARMS, LIVE_COVERAGE, receiptCommand } = await import('./live-deadline.mjs');
      const root = 'tests/artifacts/ig-proto/selftest/S24-T09c-dev';
      const task = 'S24-T09c-dev';
      const argv = ['--task', task, '--require-pass', '--label', 'frozen', '--source-label', 'self-test'];
      /** @param {string} path @returns {any} */
      const json = (path) => JSON.parse(readFileSync(abs(path), 'utf8'));
      /** @param {string} name @param {(layout: any) => void} [change] @returns {Promise<any>} A passing receipt's fixture, then one change. */
      const world = async (name, change = () => {}) => {
        const layout = await liveFixture(`${root}/${name}`, task);
        const code = await receiptCommand(argv, { layout, stdout: () => {}, stderr: () => {} });
        same(code, 0, `${name}: the receipt did not pass (exit ${code})`);
        change(layout);
        return layout;
      };
      /** @param {string} path @param {(doc: any) => void} edit */
      const edited = (path, edit) => {
        const doc = json(path);
        edit(doc);
        writeJson(abs(path), doc);
      };
      try {
        const layout = await world('ok');
        const expectation = liveExpectation(task, { layout });
        const trees = Object.fromEntries(LIVE_ARMS.map((id) => [id, readTreeInfo(id)]));
        same(expectation.harnessHash, harnessInfo().harnessHash, 'the producer is today\'s');
        same(expectation.arms, LIVE_ARMS.map((id) => ({ id, treeId: trees[id].treeId, paramsHash: sha256(JSON.stringify(trees[id].params)) })), 'the two arms');
        same(expectation.params, Object.fromEntries(LIVE_ARMS.map((id) => [id, trees[id].params])), 'the params of both arms');
        same([expectation.coverage, expectation.coverage.length], [[...LIVE_COVERAGE], 25], 'the coverage');
        same(expectation.fields, { ...LIVE_DEADLINE_FIELDS }, 'the fields');
        const runsPath = (/** @type {any} */ l) => `${l.runsDir}/live-14x14-nightmare.runs.json`;
        const shardPath = (/** @type {any} */ l) => `${l.rawDir}/live-14x14-nightmare/shard.json`;
        const twin = (/** @type {any} */ l, /** @type {string} */ id) => `${l.inputs}/${id}.ig-tree.json`;
        const verifyCopy = (/** @type {any} */ l) => `${l.inputs}/verify-identity.json`;
        const a = (/** @type {any} */ l) => runsPath(l);
        /** @type {[string, (l: any) => void, (l: any) => string][]} */
        const variants = [
          ['(1)', (l) => edited(verifyCopy(l), (d) => { d.task = 'S24-T09c'; }), () => 'accept: the verification record is S24-T09c/frozen/v4, not V4-LIVE-verify/frozen/v4'],
          ['(2)', (l) => edited(verifyCopy(l), (d) => { d.label = 'selftest'; }), () => 'accept: the verification record is V4-LIVE-verify/selftest/v4, not V4-LIVE-verify/frozen/v4'],
          ['(3)', (l) => edited(twin(l, 'fr-frozen-none-live-test'), (d) => { d.treeId = 'd9'; }), () => 'accept: the verification tested another tree fr-frozen-none-live-test'],
          ['(4)', (l) => {
            edited(a(l), (d) => { d.meta.harness.harnessHash = 'g'; });
            edited(shardPath(l), (d) => { d.harnessHash = 'g'; });
          }, () => 'accept: the runs files name 2 producers'],
          ['(5)', (l) => edited(a(l), (d) => { d.meta.harness.harnessHash = 'g'; }), (l) => `accept: runs file ${a(l)} differs from its raw shard`],
          ['(6)', (l) => rmSync(abs(verifyCopy(l))), () => 'accept: no verification identity'],
          ['(7)', (l) => edited(a(l), (d) => { d.meta.source.sourceDigest = 'x'; }), (l) => `accept: runs file ${a(l)} is not of the frozen source`],
          ['(8)', (l) => edited(twin(l, 'fr-frozen-live-test'), (d) => { d.chain = d.chain.map((/** @type {string} */ c) => (c === 'fr-frozen' ? 'fr-frozen-none' : c)); }),
            () => 'accept: the test derivative fr-frozen-live-test is not fr-frozen with w8'],
          ['(9)', (l) => edited(twin(l, 'fr-frozen-none-live-test'), (d) => { d.edits.splice(d.edits.findIndex((/** @type {any} */ e) => e.id === 'w8-1'), 0, { id: 'x-1' }); }),
            () => 'accept: the test derivative fr-frozen-none-live-test has an edit other than w8-1'],
          ['(10)', (l) => edited(verifyCopy(l), (d) => { d.version = 2; }), () => 'accept: the verification identity is not ig-selftest-identity version 1'],
        ];
        for (const [label, change, message] of variants) {
          const l = await world(`v${label.replace(/\D/g, '')}`, change);
          same(thrownBy(() => liveExpectation(task, { layout: l })), message(l), label);
        }
      } finally {
        rmSync(abs(root), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'live-deadline: CLI receipt and accept',
    async run() {
      const { LIVE_ARMS, receiptCommand } = await import('./live-deadline.mjs');
      const root = 'tests/artifacts/ig-proto/selftest/S24-T09c-cli';
      const task = 'S24-T09c-cli';
      try {
        const layout = await liveFixture(root, task);
        const code = await receiptCommand(['--task', task, '--require-pass', '--label', 'frozen', '--source-label', 'self-test'], { layout, stdout: () => {}, stderr: () => {} });
        same(code, 0, 'the receipt did not pass');
        const accepting = (/** @type {string} */ receipt, /** @type {string} */ binding) => runCheck(['accept', '--task', task, '--receipt', receipt, '--binding', binding, '--by', 'S24-T09c',
          '--label', 'frozen', '--source-label', 'self-test'], { liveLayout: layout });
        const first = await accepting(layout.receipt, layout.binding);
        same([first.code, first.err], [0, ''], `the accept: ${first.err}`);
        const bytes = readFileSync(abs(layout.binding));
        const binding = JSON.parse(bytes.toString('utf8'));
        same([binding.expected.kind, binding.expected.fields], ['live-deadline', { ...LIVE_DEADLINE_FIELDS }], 'the binding\'s kind and fields');
        const current = LIVE_ARMS.map((id) => ({ id, treeId: readTreeInfo(id).treeId, paramsHash: sha256(JSON.stringify(readTreeInfo(id).params)) }));
        same(checkAccepted(binding, { current }), { status: 'pass', reasons: [] }, 'the binding passes for today\'s two arms');
        same(checkAccepted(binding, { current: current.map((c) => (c.id === 'fr-frozen-none' ? { ...c, treeId: 't9' } : c)) }), { status: 'incomplete', reasons: ['stale arm fr-frozen-none'] }, 'a moved arm is stale');
        const again = await accepting(layout.receipt, layout.binding);
        same([again.code, again.err], [1, `v4-check: binding ${layout.binding} exists (an accepted binding is never rewritten)\n`], 'the second accept');
        assert(bytes.equals(readFileSync(abs(layout.binding))), 'the binding changed');
        const lacking = `${layout.inputs}/verify-state.json`;
        const receipt = JSON.parse(readFileSync(abs(layout.receipt), 'utf8'));
        receipt.evidence = receipt.evidence.filter((/** @type {any} */ e) => e.path !== lacking);
        writeJson(abs(`${root}/omit.json`), receipt);
        const omitted = await accepting(`${root}/omit.json`, `${root}/omit.accepted.json`);
        same([omitted.code, omitted.err], [1, `v4-check: the receipt's evidence index lacks ${lacking}\n`], 'the omitted mandatory input');
        assert(!existsSync(abs(`${root}/omit.accepted.json`)), 'a binding was written for the omitted input');
      } finally {
        rmSync(abs(root), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'write-plan: V4-S3P',
    async run() {
      const m = await import('./manifest.mjs');
      const { plan, itemManifests } = m.writtenPlan('V4-S3P');
      const arms = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'];
      const cells = ['14x14', '20x20', '24x24', '26x26'].map((c) => `${c}-hell-1`);
      same([plan.task, plan.generatedBy, plan.runnable], ['V4-S3P', 'manifest.mjs write-plan', true], 'the plan\'s header');
      same(plan.prerequisites, [...arms.map((id) => ({ type: 'variant', id })),
        { type: 'accepted', path: 'docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json', current: ['v4'] }], 'the prerequisites');
      same(plan.steps.map((s) => s.id), ['prerequisites', 'firewall-snapshot', 'trees', ...arms.flatMap((a) => [`parity-${a}`, `receipt-${a}`, `accept-${a}`]),
        ...cells.map((c) => `rows-fr-frozen-none-uncapped-pilot-${c}`), 'publish-fr-frozen-none-uncapped', 'firewall-check'], 'the steps in order');
      same([plan.steps.length, plan.steps.filter((s) => s.locked).length], [21, 8], 'the steps and the locked steps');
      same(plan.steps[2].node.slice(-5), ['build', ...arms], 'the trees step');
      const step = (/** @type {string} */ id) => /** @type {any} */ (plan.steps.find((s) => s.id === id));
      same(step('accept-fr-frozen').node.slice(-2), ['--by', 'V4-S3'], 'the binding is accepted by V4-S3');
      same(step('receipt-fr-frozen').node.slice(-3), ['--arm', 'fr-frozen', '--require-pass'], 'the receipt requires a pass');
      for (const cell of cells) {
        const row = step(`rows-fr-frozen-none-uncapped-pilot-${cell}`);
        same(row.node.slice(-8), ['--variant', 'fr-frozen-none-uncapped', '--workers', '4', '--cases', `${cell}:0-4`, '--row-limit-s', '260'], `${cell}: the node's tail`);
        same(row.state, `V4-S3P\\fr-frozen-none-uncapped\\pilot-${cell}\\state.json`, `${cell}: the state`);
      }
      same([plan.allocationMinutes, plan.optionalMinutes, Math.round(m.planGuardS(plan) * 1000) / 1000], [139, 0, 10416.597], 'the approved price');
      same(Object.keys(itemManifests), arms.map((a) => `V4-S3P.parity-${a}.json`), 'the item manifests');
      for (const arm of arms) {
        same(itemManifests[`V4-S3P.parity-${arm}.json`], m.parityManifest('V4-S3P', arm), `${arm}: the item manifest`);
      }
      assert(thrownBy(() => m.writtenPlan('V4-XX')) === 'manifest: unknown written plan V4-XX', 'an unknown plan is refused');
    },
  },
  {
    name: 'freeze: the fit index',
    async run() {
      const { fitIndex } = await import('./freeze.mjs');
      const runs = JSON.stringify({ rows: [{ rep: 0 }, { rep: 4 }] });
      const entries = (/** @type {string} */ r = runs) => [
        { path: 'x\\a.json', sha256Lf: sha256Text('A\n') },
        { path: 'tools/m.mjs', sha256Lf: sha256Text('old\n') },
        { path: 'r/s.runs.json', sha256Lf: sha256Text(r) },
      ];
      const base = () => new Map([['i.json', JSON.stringify(entries())], ['x/a.json', 'A\r\n'], ['tools/m.mjs', 'new\n'], ['cap/tools/m.mjs', 'old\n'], ['r/s.runs.json', runs]]);
      const indices = [{ path: 'i.json', field: null, key: 'sha256Lf' }];
      const capture = { dir: 'cap', commit: '57ef5cf' };
      const fit = (/** @type {(files: Map<string, string>) => void} */ change) => {
        const files = base();
        change(files);
        return fitIndex({ indices, capture, read: (p) => files.get(p) ?? null });
      };
      const old = sha256Text('old\n');
      const uncaptured = [{ path: 'tools/m.mjs', hash: old, index: 'i.json' }];
      const noCapture = 'fit input tools/m.mjs changed or missing and has no matching capture (index i.json)';
      const ok = fit(() => {});
      same([ok.checked, ok.captures, ok.uncaptured, ok.problems, ok.indices],
        [2, [{ path: 'tools/m.mjs', sourceCommit: '57ef5cf', capturedPath: 'cap/tools/m.mjs', hash: old, index: 'i.json', kind: 'normalized-text' }], [], [],
          [{ path: 'i.json', key: 'sha256Lf', entries: 3 }]], 'the CRLF file and the captured source pass');
      same(fit((f) => f.set('x/a.json', 'B\n')).problems, ['fit input x/a.json changed (index i.json)'], 'a changed input');
      same(fit((f) => f.delete('x/a.json')).problems, ['missing fit input x/a.json (index i.json)'], 'a missing input');
      const noCap = fit((f) => f.delete('cap/tools/m.mjs'));
      same([noCap.problems, noCap.uncaptured], [[noCapture], uncaptured], 'a source without its capture');
      const otherCap = fit((f) => f.set('cap/tools/m.mjs', 'other\n'));
      same([otherCap.problems, otherCap.uncaptured], [[noCapture], uncaptured], 'a source with another capture');
      const withRep = JSON.stringify({ rows: [{ rep: 0 }, { rep: 20 }] });
      same(fit((f) => { f.set('i.json', JSON.stringify(entries(withRep))); f.set('r/s.runs.json', withRep); }).problems,
        ['fit input r/s.runs.json holds rep 20: validation, Master and second-validation reps are never fitting inputs'], 'a validation rep');
      same(fit((f) => f.delete('i.json')).problems, ['missing fit index i.json'], 'a missing index');
      same(fit((f) => f.set('i.json', '{')).problems, ['malformed fit index i.json'], 'an unparsable index');
      same(fit((f) => f.set('i.json', JSON.stringify([{ path: 'x\\a.json', sha256Lf: 'abc' }, ...entries().slice(1)]))).problems,
        ['malformed entry x/a.json (index i.json)'], 'a malformed hash');
    },
  },
  {
    name: 'freeze: the record and its markdown',
    async run() {
      const { FIT_SEEDS_USED, FREEZE_CLASSES, freezeMarkdown, freezeRecord } = await import('./freeze.mjs');
      const variants = {
        'fr-frozen': { treeId: 'a', paramsHash: 'b' }, 'fr-frozen-none': { treeId: 'c', paramsHash: 'd' },
        'fr-frozen-uncapped': { treeId: 'e', paramsHash: 'f' }, 'fr-frozen-none-uncapped': { treeId: 'g', paramsHash: 'h' },
      };
      const fit = {
        hash: 'sha256Lf: ...', indices: [{ path: 'i', key: 'sha256Lf', entries: 1, sha256: 'z' }], files: [{ path: 'x', sha256: 'y' }], checked: 1,
        captures: [{ path: 'tools/m.mjs', sourceCommit: '57ef5cf', capturedPath: 'cap/tools/m.mjs', hash: 'q', index: 'i' }],
      };
      const record = freezeRecord({ variants, fit, proofs: [], meta: {} });
      same([record.format, record.version], ['ig-v4-freeze', 1], 'format and version');
      same(record.classes, FREEZE_CLASSES, 'the classes');
      same([record.classes.length, record.classes.flatMap((/** @type {any} */ c) => c.cells).length], [5, 19], '5 classes, 19 cells');
      same(record.values.W['n-upper'], 190000000, 'W of n-upper');
      same(record.values.callBudget.require.nightmare, 32000000000, 'the require budget of Nightmare');
      same(record.seeds.used, FIT_SEEDS_USED, 'the seeds used');
      same(record.seeds.excluded, ['validation reps 20-39', 'Master reps 20-24', 'second validation reps 40-59'], 'the excluded reps');
      same([record.variants, record.fit], [variants, fit], 'the variants and the fit as given');
      same(JSON.parse(JSON.stringify(record)), record, 'a plain JSON record');
      const md = freezeMarkdown(record);
      for (const line of ['| n-upper | 15x20-nightmare, 18x18-nightmare | nightmare 257-324 | 190 M |', '| require | 32 G | 40 G |', '| tools/m.mjs | 57ef5cf | cap/tools/m.mjs | q |']) {
        assert(md.includes(line), `the markdown holds ${line}`);
      }
    },
  },
  {
    name: 'freeze: write refuses a changed or missing fit input',
    async run() {
      const { writeCommand } = await import('./freeze.mjs');
      const folder = 'tests/artifacts/ig-proto/selftest/S24-T12b-dev';
      const text = '{"a":1}';
      rmSync(abs(folder), { recursive: true, force: true });
      try {
        mkdirSync(abs(folder), { recursive: true });
        writeFileSync(abs(`${folder}/a.json`), text);
        writeFileSync(abs(`${folder}/idx.json`), JSON.stringify([{ path: `${folder}/a.json`, sha256Lf: sha256Text(text) }]));
        const run = async () => {
          let stdout = '';
          let stderr = '';
          const code = await writeCommand(['--task', 'V4-S3', '--label', 'frozen', '--source-label', 'self-test'], {
            outDir: `${folder}/out`, fit: { indices: [{ path: `${folder}/idx.json`, field: null, key: 'sha256Lf' }] },
            stdout: (t) => { stdout += t; }, stderr: (t) => { stderr += t; },
          });
          assert(!existsSync(abs(`${folder}/out/freeze.json`)) && !existsSync(abs(`${folder}/out/freeze.md`)), 'neither freeze file exists');
          return { code, stdout, stderr };
        };
        writeFileSync(abs(`${folder}/a.json`), '{"a":2}');
        same(await run(), { code: 1, stdout: '', stderr: `freeze: fit index: fit input ${folder}/a.json changed (index ${folder}/idx.json) (1 problems)\n` }, 'a changed input');
        rmSync(abs(`${folder}/a.json`));
        same(await run(), { code: 1, stdout: '', stderr: `freeze: fit index: missing fit input ${folder}/a.json (index ${folder}/idx.json) (1 problems)\n` }, 'a missing input');
      } finally {
        rmSync(abs(folder), { recursive: true, force: true });
      }
    },
  },
];

/**
 * A complete passing input set of a live-deadline receipt under the private folder `base` (T09b): the freeze record with
 * today's identities of the two frozen arms, two runs files of five clean rows each with their raw shard identities and closed
 * journals, and the live verification's state and identity; `edit(layout)` may change a file before the case runs.
 * @param {string} base Repository-relative folder under tests/artifacts/ig-proto/selftest/; removed first.
 * @param {string} task
 * @param {(layout: any) => void} [edit]
 * @returns {Promise<any>} The `liveLayout(task, base)`.
 */
async function liveFixture(base, task, edit = () => {}) {
  const { LIVE_ARMS, LIVE_CASES, LIVE_DECLARED, LIVE_TWINS, LIVE_VERIFY_TASK, liveLayout } = await import('./live-deadline.mjs');
  const layout = liveLayout(task, base);
  rmSync(abs(base), { recursive: true, force: true });
  /** @type {Record<string, any>} */
  const infos = {};
  for (const id of [...LIVE_ARMS, ...LIVE_TWINS]) {
    await ensureTree(id);
    infos[id] = readTreeInfo(id);
  }
  const identityOf = (/** @type {string} */ id) => ({ treeId: infos[id].treeId, copyDigest: infos[id].copyDigest, paramsHash: sha256(JSON.stringify(infos[id].params)) });
  writeJson(abs(layout.freeze), { variants: Object.fromEntries(LIVE_ARMS.map((id) => [id, { treeId: identityOf(id).treeId, paramsHash: identityOf(id).paramsHash }])) });
  const harnessHash = harnessInfo().harnessHash;
  const frozen = infos['fr-frozen'];
  const { S, C, B, P, E } = ledgerLines();
  for (const caseId of ['14x14-nightmare', '26x26-hell-1']) {
    const shard = `live-${caseId}`;
    const declared = LIVE_DECLARED.filter((d) => d.caseId === caseId);
    const rows = [];
    for (const d of declared) {
      rows.push({ rowKey: d.rowKey, caseId, rep: d.rep, seed: d.seed, localRep: 0, run: await matrixRun(caseId, d.rep, 10, { igSetMs: 30000 }) });
    }
    writeJson(abs(`${layout.runsDir}/${shard}.runs.json`), {
      meta: {
        source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST }, harness: { harnessHash },
        trees: { 'fr-frozen': { treeId: frozen.treeId, copyDigest: frozen.copyDigest, params: frozen.params } },
      },
      shard, rows,
    });
    writeJson(abs(`${layout.rawDir}/${shard}/shard.json`), { treeId: frozen.treeId, copyDigest: frozen.copyDigest, harnessHash });
    for (const d of declared) {
      const c = `${d.rowKey}:1:2:1`;
      const lines = [S(c, 'set', 0, 10), C(c), B(c), P(c, 0, 100, 0), B(c), P(c, 1, 50, 10), E(c, 160, 2, 0)];
      writeText(abs(`${layout.rawDir}/${shard}/logs/${d.rowKey}.1.2.jsonl`), lines.map((l) => JSON.stringify(l)).join('\n'));
      writeText(abs(`${layout.rawDir}/${shard}/logs/${d.rowKey}.link.jsonl`), JSON.stringify({ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }));
      writeText(abs(`${layout.rawDir}/${shard}/logs/${d.rowKey}.row.jsonl`), JSON.stringify({ t: 'row', row: d.rowKey, seed: d.seed, caseId, localRep: 0, pid: 1 }));
    }
  }
  writeJson(abs(layout.verifyState), {
    task: LIVE_VERIFY_TASK, label: 'frozen', done: true, results: LIVE_CASES.map((name) => ({ name, pass: true, reason: null, ms: 1 })),
  });
  writeJson(abs(layout.verifyIdentity), {
    format: 'ig-selftest-identity', version: 1, task: LIVE_VERIFY_TASK, label: 'frozen', group: 'v4', selected: [...LIVE_CASES], harnessHash,
    frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST, trees: Object.fromEntries([...LIVE_ARMS, ...LIVE_TWINS].map((id) => [id, identityOf(id)])),
    startedAt: '2026-11-24T00:00:00.000Z', endedAt: '2026-11-24T00:01:00.000Z',
  });
  edit(layout);
  return layout;
}

/**
 * V4-T14's synthetic bench data (a run is `newRunRecord` of tools/bench/report.js; no bench runs).
 * @param {number} count @param {{ score?: number, digest?: string | null }} [options] @returns {any}
 */
function p6Details(count, { score = 100, digest = 'a'.repeat(64) } = {}) {
  return {
    area: 36, K: 8, sizes: [3, 4, 4, 5, 5, 5, 5, 5], setAttempt: 1, initialG: 4, policy: { violations: [] },
    puzzles: Array.from({ length: count }, (_, i) => ({ clues: 4, U: 4, score: score + i, level: 'nightmare', saturated: false, censored: false, metrics: null })),
    ...(digest === null ? {} : { resultDigest: digest }), sampleFailures: 0, sampleUnrateable: 0,
  };
}

/** @param {string} caseId @param {number} rep @param {Record<string, any>} [extra] @returns {any} A valid generation row of the old side. */
function p6Run(caseId, rep, extra = {}) {
  return newRunRecord({
    caseId, seed: `landscape/${caseId}/${rep}`, sourceCommit: p6.OLD_COMMIT, sourceDigest: FROZEN_DIGEST, versions: { algo: 'gen-v3' }, platform: 'win32 test x64',
    browserOrNode: 'node v0.0.0', workerCount: 4, startedAt: '2026-11-18T00:00:00.000Z', firstReadyMs: 1000, tenthReadyMs: 5000, responseMs: 6000,
    acceptedCount: 10, peakAccountedBytes: 1000, peakProcessBytes: 2000, rep, details: p6Details(10), ...extra,
  });
}

/** @param {string} group @param {string} side @param {string} newCommit @param {Record<string, any>} [extra] @returns {any} A ledger line. */
function p6Line(group, side, newCommit, extra = {}) {
  return {
    id: 'id', task: 'V4-T14', group, side, commit: side === 'old' ? p6.OLD_COMMIT : newCommit, limitS: 900, start: '2026-11-18T01:00:00.0000000Z',
    end: '2026-11-18T01:10:00.0000000Z', wallSeconds: 600, nodeSeconds: 590, lockWaitSeconds: 10, quietS: 45, countedSeconds: 500, killed: false, exit: 0,
    report: null, reportSha256: null, ...extra,
  };
}

/** @param {Uint8Array} bytes @returns {string} */
const p6sha = (bytes) => sha256(bytes);

/**
 * The four terminal reports, their Markdown and the ledger of a complete, consistent comparison (the old side takes twice as
 * long as the new one); `tweak` changes one part of it.
 * @param {{ raw?: string, meta?: (m: any, side: string, group: string) => void, run?: (r: any, side: string, group: string) => void,
 *   runs?: (rs: any[], side: string, group: string) => void, text?: (t: string, side: string, group: string) => string,
 *   ledger?: (l: any, side: string, group: string) => void }} [tweak]
 */
function p6World(tweak = {}) {
  const raw = tweak.raw ?? p6.RAW;
  const newCommit = 'b'.repeat(40);
  /** @type {any[]} */
  const reports = [];
  /** @type {any[]} */
  const ledger = [];
  for (const [group, side] of p6.ORDER) {
    const old = side === 'old';
    const meta = {
      kind: 'node', profile: 'landscape', sourceCommit: old ? p6.OLD_COMMIT : newCommit, sourceDigest: old ? FROZEN_DIGEST : 'c'.repeat(64), versions: { algo: 'gen-v3' },
      platform: 'win32 test x64', browserOrNode: 'node v0.0.0', hardware: { cpu: 'Test CPU', logicalCores: 8, totalMemoryBytes: 17179869184, node: 'v0.0.0', execArgv: ['--max-old-space-size=2048'] },
      workerCount: 4, lifecycle: /** @type {'cold'} */ ('cold'), matrixDigest: `matrix-${group}`, startedAt: `2026-11-18T0${old ? 1 : 2}:00:00.000Z`, finishedAt: `2026-11-18T0${old ? 1 : 2}:10:00.000Z`,
      expectedRuns: p6.GROUPS[group].length * 5,
    };
    tweak.meta?.(meta, side, group);
    /** @type {any[]} */
    const runs = [];
    for (const caseId of p6.GROUPS[group]) {
      for (let rep = 0; rep < 5; rep += 1) {
        const run = p6Run(caseId, rep, { sourceCommit: meta.sourceCommit, sourceDigest: meta.sourceDigest, responseMs: old ? 12000 : 6000, firstReadyMs: old ? 2000 : 1000, tenthReadyMs: old ? 10000 : 5000 });
        tweak.run?.(run, side, group);
        runs.push(run);
      }
    }
    tweak.runs?.(runs, side, group);
    const text = tweak.text?.(reportJson(buildReport(/** @type {any} */ (meta), runs, {})), side, group) ?? reportJson(buildReport(/** @type {any} */ (meta), runs, {}));
    const bytes = Buffer.from(text, 'utf8');
    const path = `${raw}/${side}/${group}-2026-11-18.json`;
    reports.push({ group, side, path, bytes, mdPath: path.replace(/\.json$/, '.md'), mdBytes: Buffer.from(toCrlf('# synthetic bench report'), 'utf8') });
    const line = p6Line(group, side, newCommit, { report: path, reportSha256: sha256(bytes), countedSeconds: 500 });
    tweak.ledger?.(line, side, group);
    ledger.push(line);
  }
  return { newCommit, reports, ledger, raw, input: () => ({ reports, ledger, pending: null, newCommit, raw }) };
}

/**
 * Writes a synthetic world into a scratch folder: `<dir>/raw` (the ledger and the reports) and the evidence folder's path.
 * @param {string} dir @param {ReturnType<typeof p6World>} world @returns {{ raw: string, evidence: string }}
 */
function p6Scratch(dir, world) {
  const raw = rel(join(dir, 'raw'));
  mkdirSync(abs(raw), { recursive: true });
  writeFileSync(join(abs(raw), 'ledger.jsonl'), `${world.ledger.map((l) => JSON.stringify(l)).join('\n')}\n`);
  for (const r of world.reports) {
    mkdirSync(dirname(abs(r.path)), { recursive: true });
    writeFileSync(abs(r.path), r.bytes);
    writeFileSync(abs(r.mdPath), r.mdBytes);
  }
  return { raw, evidence: rel(join(dir, 'evidence')) };
}

/** @param {string[]} argv @param {{ raw: string, evidence: string }} paths @returns {{ code: number, out: string, err: string }} p6-bench's `main` with its output captured. */
function p6Main(argv, paths) {
  const text = { out: '', err: '' };
  const code = p6.main(argv, { out: (t) => { text.out += t; }, err: (t) => { text.err += t; } }, paths);
  return { code, ...text };
}

/**
 * @param {string} id @param {number} rows @param {number} rowS @param {number} [rowLimitS] @param {boolean} [optional]
 * @returns {any} A compiled locked step of request rows (V4-T11g's cases): `rows` rows of `rowS` seconds.
 */
function ownerRowsStep(id, rows, rowS, rowLimitS = 260, optional = false) {
  return {
    id, locked: true, node: ['tools\\ig-proto\\arm.mjs', 'run', '--task', 'X', '--arm', 'a', '--cases', `c:0-${rows - 1}`, '--row-limit-s', String(rowLimitS)], state: `X\\a\\${id}\\state.json`,
    repeatUntilDone: true, minHorizonS: rowLimitS + 12, optional, price: { type: 'rows', rows, rowS, rowLimitS }, dependsOn: [], consumes: [], produces: [], expect: 'x', exitOn: 'y',
  };
}

/** @param {string} id @param {number[]} durationsS @param {boolean} [optional] @returns {any} A compiled locked step of one process item per duration (reserve 120 s). */
function ownerProcessStep(id, durationsS, optional = false) {
  return {
    id, locked: true, node: ['tools\\ig-proto\\kernel-probe.mjs', 'counters', '--task', 'X'], state: `X\\${id}\\state.json`, repeatUntilDone: true, minHorizonS: 150, optional,
    price: { type: 'process', durationsS, reserveS: 120 }, dependsOn: [], consumes: [], produces: [], expect: 'x', exitOn: 'y',
  };
}

/** @returns {any} A group of the stage-4 universe (V4-T11g's cases): `rows` rows of `rowS` seconds under `rowLimitS`, as T11c's `priced` writes it. */
function ownerGroup(/** @type {string} */ task, /** @type {string} */ arm, /** @type {string} */ cell, /** @type {string[]} */ items, /** @type {number} */ rows, /** @type {number} */ rowS,
  /** @type {number} */ rowLimitS, /** @type {boolean} */ comparator = false) {
  return {
    id: `${task}/${arm}/val-${cell}`, task, arm, cell, from: 20, to: 19 + rows, rows, stage: 4, cohort: 'val', shard: `val-${cell}`, rowLimitS, optional: false, items, collection: 'initial',
    comparator, price: { type: 'rows', rows, rowS, rowLimitS },
  };
}

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

/** The generation fixture of tests/fixtures/generation-case.json (read, never written): a 6x10 'hard' request (T07a). */
const LIVE_RECIPE = () => JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'generation-case.json'), 'utf8'));

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
 *   stage?: string, uniqueness?: 'any' | 'require', journal?: boolean, extra?: Record<string, any> }} spec
 *   A function returns a rating or 'cap' (an IncompleteRatingError); `variant` and `stage` default to v4 and set;
 *   `uniqueness` (default 'any') is the context's; with `journal: false` (default true) the fresh folder is made as
 *   before but `IG_LOG_DIR` and `IG_ROW` are unset, so the call writes no journal; `extra` is merged last into the
 *   context, and its `charge: true` installs a `charge` that logs its units in `chargeLog` (T07a).
 * @returns {Promise<{ result: any, lines: any[], tuples: any[], counts: (phase: string) => number[], end: any,
 *   phases: string[], files: string[], chargeLog: number[], kinds: string[] | undefined }>} `files` are the journal
 *   files written; `kinds` is `extra.igChargeKinds`.
 */
async function v4Call(name, {
  prior, screen, canon = screen, variant = 'v4', stage = 'set', uniqueness = 'any', journal = true, extra = {},
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
  /** @type {number[]} */
  const chargeLog = [];
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
      ...extra,
      ...(extra.charge === true ? { charge: (/** @type {number} */ u) => chargeLog.push(u) } : {}),
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
    files: readdirSync(dir), chargeLog, kinds: extra.igChargeKinds,
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

/** @param {number[]} L The units of the metered operations in order. @returns {number[]} P[0] = 0, P[j] = L[0] + ... + L[j - 1]. */
function prefix(L) {
  const P = [0];
  for (const u of L) {
    P.push(P[P.length - 1] + u);
  }
  return P;
}

/** @param {number[]} P @param {number} B @returns {number} The least j with P[j] >= B: the operations a budget B lets run (L.length when none). */
function m(P, B) {
  const j = P.findIndex((x) => x >= B);
  return j === -1 ? P.length - 1 : j;
}

/**
 * A module of a tree's `core/browser/` by file URL (module identity stays inside the tree).
 * @param {{ e: any }} tree An entry of `engine()`.
 * @param {string} name The file name without `.js`.
 * @returns {Promise<any>}
 */
function browserModule(tree, name) {
  return import(pathToFileURL(join(tree.e.root, 'core', 'browser', `${name}.js`)).href);
}

/**
 * The real piece set and its calibration for `tests/fixtures/generation-case.json` in one tree, as `fixture()` of
 * `tests/generation-client.test.js` builds them (the first set attempt, the tree's own engine); built once per tree.
 * @param {string} variant
 * @returns {Promise<{ recipe: any, set: any, calibration: any }>}
 */
async function setFixture(variant) {
  memo.setFixture ??= {};
  if (memo.setFixture[variant] === undefined) {
    const { e, ws, scratch } = await engine(variant);
    const recipe = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'generation-case.json'), 'utf8'));
    const found = e.generate.firstSetAttempt({
      board: e.board.boardFromRows(recipe.boardRows), rotation: 0, levelId: recipe.levelId, seedText: recipe.seedText,
      uniqueness: recipe.uniqueness, execution: { main: ws, scratch },
    });
    assert(found.result !== null, `the ${variant} tree found no set for the generation fixture`);
    memo.setFixture[variant] = { recipe, set: found.result.set, calibration: found.result.calibration };
  }
  return memo.setFixture[variant];
}

/**
 * One row of a tree's runCase on a stub pool without a 115-s stop (T07b). `batch`: set attempt 0 answered at once,
 * every other task held, so that only the host's bound can end the batch; `set`: every task held, so that the set
 * stage's reserve cut at 46 s ends it. A held task is released only by its abort signal or the pool's cancelAll.
 * The clock is not moved: each case moves it.
 * @param {string} variant
 * @param {'batch' | 'set'} mode
 */
async function hostRow(variant, mode) {
  const tree = await engine(variant);
  const { PoolAbortError } = await browserModule(tree, 'worker-pool');
  const { set, calibration } = await setFixture(variant);
  const recipe = LIVE_RECIPE();
  const caseDef = { id: 'live-host', boardRows: recipe.boardRows, rotation: 0, levelId: 'hard', uniqueness: 'any', maxActive: 676 };
  const spec = { seed: 'fixture-set-0', rep: 0, probeKind: 'generation' };
  const clock = createFakeClock();
  /** @type {Set<(e: unknown) => void>} */
  const held = new Set();
  const pool = {
    size: 4,
    run(/** @type {any} */ task) {
      return new Promise((resolve, reject) => {
        if (mode === 'batch' && task.kind === 'setAttempt' && task.payload.attempt === 0) {
          queueMicrotask(() => resolve({ ok: true, set, calibration, attempt: 0 }));
          return;
        }
        const drop = (/** @type {unknown} */ e) => {
          held.delete(drop);
          reject(e);
        };
        held.add(drop);
        task.signal?.addEventListener('abort', () => drop(new PoolAbortError('cancelled')), { once: true });
      });
    },
    runIdle: () => new Promise(() => {}),
    cancelAll() {
      for (const drop of [...held]) {
        drop(new PoolAbortError('cancelled'));
      }
    },
    recycle() {},
    beginRequest() {},
    endRequest() {},
    memory: () => ({ workerBytes: 0, mainBytes: 0, totalBytes: 0, peakBytes: 0, mainBudgetBytes: 0 }),
    setMainBytes() {},
    close() {},
  };
  const host = {
    kind: 'node', platform: 'selftest', browserOrNode: 'node', workerCount: 4, lifecycle: 'cold', sourceCommit: 'selftest',
    sourceDigest: 'selftest', versions: {}, clock, createPool: () => pool,
    responsiveness: { start() {}, stop: () => ({ method: 'none', maxMainTaskMs: null, longTasksOver50: null, valid: true, notes: [] }) },
    clickCancel: (/** @type {() => void} */ fn) => fn(),
  };
  /** @type {any} */
  let cancel = null;
  const result = track(tree.e.runner.runCase(spec, caseDef, host, {
    certificateWaitMs: 0, registerCancel: (/** @type {any} */ fn) => { cancel = fn ?? cancel; },
  }));
  await settle();
  await settle();
  return { result, clock, held, calibration, cancel: () => cancel?.() };
}

/**
 * The host's hard response bound (T07b) on a tree whose IG.liveDeadline lists the fixture level 'hard':
 * `live-test` here, `fr-frozen-live-test` and `fr-frozen-none-live-test` in T08c.
 * @param {string} variant
 * @returns {{ name: string, run: () => Promise<void> }}
 */
function hostBoundCase(variant) {
  return {
    name: `live ${variant}: the host's hard response bound`,
    async run() {
      // (a) A held batch: at the bound the response is the client's prefix snapshot, the calibration with its pack.
      const a = await hostRow(variant, 'batch');
      assert(a.calibration?.rating?.level === 'hard', `the fixture's calibration is of level ${a.calibration?.rating?.level}, not hard`);
      a.clock.advance(118999);
      await settle();
      assert(a.result.state === 'pending', `(a) ended before the bound (${a.result.value?.partialReason})`);
      a.clock.advance(1);
      await settle();
      await settle();
      assert(a.result.state === 'resolved', `(a) the row is ${a.result.state} at the bound`);
      const v = a.result.value;
      same([v.partialReason, v.responseMs, v.acceptedCount, v.interrupted], ['response-bound', 119000, 1, false], '(a) a held batch at the bound');
      same(v.errors.filter((/** @type {any} */ e) => e.phase === 'validation'), [], '(a) the prefix and its pack are valid');
      same(a.held.size, 0, '(a) tasks still held after the bound');
      // (b) Every set attempt held: the reserve cuts the set stage at 46 s, before the bound.
      const b = await hostRow(variant, 'set');
      b.clock.advance(45999);
      await settle();
      assert(b.result.state === 'pending', `(b) ended before the reserve cut (${b.result.value?.partialReason})`);
      b.clock.advance(1);
      await settle();
      await settle();
      same([b.result.value?.partialReason, b.result.value?.responseMs, b.result.value?.acceptedCount], ['set:reserve-cut', 46000, 0], '(b) every set attempt held');
      same(b.held.size, 0, '(b) tasks still held after the cut');
      // (c) The controller seam: a set or a batch promise that never settles ends at the bound, the batch with the
      // client's snapshot, which a later settlement does not change.
      const { e } = await engine(variant);
      const clock = createFakeClock();
      const snapshot = { status: 'partial', reason: 'response-bound', accepted: [], made: {}, seenLayouts: [], seenClues: [] };
      let cancels = 0;
      const client = { cancel: () => { cancels += 1; }, igPrefix: () => snapshot };
      const one = e.runner.igBoundStart({ t0: clock.now() }, { levelId: 'hard' }, clock, client);
      const heldSet = track(one.set(new Promise(() => {})));
      clock.advance(118999);
      await settle();
      assert(heldSet.state === 'pending', '(c) a held set promise ended before the bound');
      clock.advance(1);
      await settle();
      same([heldSet.state, heldSet.value, cancels], ['resolved', { status: 'failed', reason: 'response-bound', failures: {} }, 1], '(c) a held set promise at the bound');
      clock.advance(1000);
      one.clear();
      const two = e.runner.igBoundStart({ t0: clock.now() }, { levelId: 'hard' }, clock, client);
      /** @type {(v: any) => void} */
      let release = () => {};
      const heldBatch = track(two.batch(new Promise((resolve) => { release = resolve; })));
      clock.advance(119000);
      await settle();
      assert(heldBatch.state === 'resolved' && heldBatch.value === snapshot, `(c) a held batch promise is ${heldBatch.state} at the bound`);
      clock.advance(6000);
      release({ status: 'complete' });
      await settle();
      assert(heldBatch.value === snapshot && cancels === 2, '(c) a later batch result changed the response');
      two.clear();
    },
  };
}

/**
 * Ten real candidates of the generation fixture whose keys differ and whose layouts differ pairwise by at least 3, as
 * `fixture()` of tests/generation-client.test.js chooses them, from the tree's own engine; built once per tree (T07c).
 * @param {string} variant
 * @returns {Promise<{ set: any, chosen: any[] }>}
 */
async function batchFixture(variant) {
  memo.batchFixture ??= {};
  if (memo.batchFixture[variant] === undefined) {
    const { e, ws, scratch } = await engine(variant);
    const { recipe, set } = await setFixture(variant);
    const ctx = {
      set, targetLevelId: recipe.levelId, quantity: 10, batchSeed: recipe.batchSeed, uniqueness: recipe.uniqueness,
      seenLayouts: new Set(), seenClues: new Set(), execution: { main: ws, scratch },
    };
    const board = e.board.boardFromRows(recipe.boardRows);
    /** @type {any[]} */
    const chosen = [];
    for (let slot = 1; chosen.length < 10 && slot <= 12; slot += 1) {
      for (let attempt = 0; attempt < 12 && chosen.length < 10; attempt += 1) {
        const c = e.generate.puzzleCandidate(ctx, slot, attempt);
        if (!('fail' in c) && chosen.every((p) => p.clueKey !== c.clueKey && p.layoutKey !== c.layoutKey
          && e.keys.layoutDistance(board, set.pieces, p.layout, c.layout) >= 3)) {
          chosen.push(c);
        }
      }
    }
    assert(chosen.length === 10, `${variant}: ${chosen.length} fixture candidates, expected 10`);
    memo.batchFixture[variant] = { set, chosen };
  }
  return memo.batchFixture[variant];
}

/**
 * The scripted cases of the live deadline (T07c) on one tree whose IG.liveDeadline lists the fixture level 'hard' and
 * whose pool allows eight workers: `live-test` (run by T07c), `fr-frozen-live-test` and `fr-frozen-none-live-test` (run by T08c).
 * @param {string} variant
 * @returns {{ name: string, run: () => Promise<void> }[]}
 */
function liveCases(variant) {
  const setInput = (/** @type {Record<string, unknown>} */ over = {}) => ({
    boardRows: LIVE_RECIPE().boardRows, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', maxActive: 676, ...over,
  });
  const batchInput = (/** @type {any} */ set, /** @type {Record<string, unknown>} */ over = {}) => ({
    set, rotation: 0, targetLevelId: 'hard', quantity: 10, setSeed: 'fixture-set-0', batchIndex: 1, uniqueness: 'any',
    seenLayouts: [], seenClues: [], ...over,
  });
  const scripted = async (/** @type {number} */ size, /** @type {((task: any) => any) | undefined} */ handler, /** @type {((phase: string) => Promise<void>) | undefined} */ gate = undefined) => {
    const tree = await engine(variant);
    const { createPool } = await browserModule(tree, 'worker-pool');
    const { createGenerationClient } = await browserModule(tree, 'generation-client');
    const h = harness(createPool, { size, handler });
    const client = createGenerationClient(h.pool, {
      clock: h.clock, createdAt: () => '2026-01-01T00:00:00.000Z', ...(gate === undefined ? {} : { igAssemblyGate: gate }),
    });
    return { h, client };
  };
  // Attempt 0 of slot s gets the s-th chosen candidate; every other attempt fails with `layout`.
  const answerOf = (/** @type {any[]} */ chosen, /** @type {any} */ t) => (t.payload.attempt === 0
    ? { value: chosen[t.payload.slot - 1] } : { value: { fail: 'layout' } });
  const ids = (/** @type {any} */ value) => value.accepted.map((/** @type {any} */ p) => p.id);
  const wanted = async () => {
    const { e } = await engine(variant);
    const { set, chosen } = await batchFixture(variant);
    return { set, chosen, want: chosen.map((c) => e.keys.puzzleId(set.board, set.pieces, c.clues)) };
  };
  return [
    {
      name: `live ${variant}: the set stage is cut by the reserve`,
      async run() {
        const { set, calibration } = await setFixture(variant);
        const success = (/** @type {number} */ attempt) => ({ value: { ok: true, set, calibration, attempt } });
        {
          const { h, client } = await scripted(4, undefined);
          const r = track(client.generateSet(setInput({ igOrigin: h.clock.now() })));
          await settle();
          h.clock.advance(45999);
          await settle();
          assert(r.state === 'pending', `(a) ended before the cut: ${JSON.stringify(r.value)}`);
          h.clock.advance(1);
          await settle();
          same(r.value, { status: 'failed', reason: 'reserve-cut', failures: {} }, '(a) every attempt held, at the cut');
          same(h.tasks.map((t) => t.payload.attempt), [0, 1, 2, 3], '(a) the attempts dispatched');
          assert(h.held.every((t) => t.worker.terminated), '(a) a held attempt was not terminated at the cut');
          h.pool.close();
        }
        {
          const { h, client } = await scripted(4, undefined);
          const r = track(client.generateSet(setInput({ igOrigin: h.clock.now() })));
          await settle();
          h.clock.advance(10000);
          h.answer(/** @type {any} */ (h.held.find((t) => t.payload.attempt === 1)), success(1));
          await settle();
          h.clock.advance(36000);
          await settle();
          same(r.value, { status: 'failed', reason: 'reserve-cut', failures: {} }, '(b) a higher success while attempt 0 runs');
          h.pool.close();
        }
        {
          const { h, client } = await scripted(4, undefined);
          const r = track(client.generateSet(setInput({ igOrigin: h.clock.now() })));
          await settle();
          h.clock.advance(45000);
          h.answer(/** @type {any} */ (h.held.find((t) => t.payload.attempt === 0)), success(0));
          await settle();
          same([r.value?.status, r.value?.attempt], ['complete', 0], '(c) a success of attempt 0 before the cut');
          h.pool.close();
        }
        {
          const { h, client } = await scripted(4, undefined);
          const r = track(client.generateSet(setInput()));
          await settle();
          h.clock.advance(46000);
          await settle();
          assert(r.state === 'pending', '(d) a request without an origin was cut');
          h.clock.advance(69000);
          await settle();
          same([r.value?.status, r.value?.reason], ['failed', 'time-limit'], '(d) without an origin, the stop at 115 s');
          h.pool.close();
        }
      },
    },
    {
      name: `live ${variant}: one clock from the request start and the prefix at the stop`,
      async run() {
        const { set, chosen, want } = await wanted();
        const start = async (/** @type {boolean} */ withOrigin) => {
          const { h, client } = await scripted(4, (t) => (t.payload.slot <= 3 ? answerOf(chosen, t) : undefined));
          const origin = h.clock.now();
          h.clock.advance(40000);
          const r = track(client.generateBatch(batchInput(set, withOrigin ? { igOrigin: origin } : {})));
          await settle();
          return { h, r };
        };
        const live = await start(true);
        live.h.clock.advance(74999);
        await settle();
        assert(live.r.state === 'pending', `ended before origin + 115 s: ${JSON.stringify(live.r.value?.reason)}`);
        live.h.clock.advance(1);
        await settle();
        same([live.r.value?.status, live.r.value?.reason, ids(live.r.value)], ['partial', 'time-limit', want.slice(0, 3)], 'the prefix at origin + 115 s');
        assert(live.h.held.every((t) => t.worker.terminated), 'a held task was not cancelled at the stop');
        const before = JSON.stringify(live.r.value.accepted.map((/** @type {any} */ p) => p.id));
        for (const t of live.h.held) {
          live.h.answer(t, answerOf(chosen, t));
        }
        await settle();
        same(JSON.stringify(live.r.value.accepted.map((/** @type {any} */ p) => p.id)), before, 'a late message changed the result');
        live.h.pool.close();
        const legacy = await start(false);
        legacy.h.clock.advance(75000);
        await settle();
        assert(legacy.r.state === 'pending', 'a batch without an origin stopped at the origin + 115 s');
        legacy.h.clock.advance(40000);
        await settle();
        same([legacy.r.value?.status, legacy.r.value?.reason, ids(legacy.r.value)], ['partial', 'time-limit', want.slice(0, 3)], 'without an origin, the stop at its own 115 s');
        legacy.h.pool.close();
      },
    },
    {
      name: `live ${variant}: the same puzzles at widths 1, 2, 4 and 8 without a cut`,
      async run() {
        const { set, chosen, want } = await wanted();
        for (const width of [1, 2, 4, 8]) {
          const { h, client } = await scripted(width, (t) => answerOf(chosen, t));
          const r = await client.generateBatch(batchInput(set, { igOrigin: h.clock.now() }));
          same([r.status, ids(r)], ['complete', want], `width ${width}`);
          h.pool.close();
        }
      },
    },
    {
      name: `live ${variant}: a cut leaves a prefix of the same fold at every width`,
      async run() {
        const { set, chosen, want } = await wanted();
        /** @type {Record<number, number>} */
        const lengths = {};
        /** @type {Record<number, string>} */
        const statuses = {};
        /** @type {Record<number, number>} */
        const endedAt = {};
        for (const width of [1, 2, 4, 8]) {
          /** @type {Map<any, number>} */
          const sentAt = new Map();
          /** @type {any} */
          let h = null;
          const made = await scripted(width, (t) => {
            sentAt.set(t, h === null ? 1000 : h.clock.now());
            return undefined;
          });
          h = made.h;
          const origin = h.clock.now();
          const r = track(made.client.generateBatch(batchInput(set, { igOrigin: origin })));
          await settle();
          /** @type {Set<any>} */
          const answered = new Set();
          for (let step = 0; step < 40 && r.state === 'pending'; step += 1) {
            h.clock.advance(5000);
            for (const t of h.held) {
              if (!answered.has(t) && !t.worker.terminated && /** @type {number} */ (sentAt.get(t)) + 30000 <= h.clock.now()) {
                answered.add(t);
                h.answer(t, answerOf(chosen, t));
              }
            }
            await settle();
          }
          assert(r.state === 'resolved', `width ${width}: the batch is ${r.state} after 200 s`);
          const got = ids(r.value);
          same(got, want.slice(0, got.length), `width ${width}: not a prefix of the fold`);
          lengths[width] = got.length;
          statuses[width] = r.value.status === 'complete' ? 'complete' : `${r.value.status}/${r.value.reason}`;
          endedAt[width] = h.clock.now() - origin;
          h.pool.close();
        }
        same(lengths, { 1: 3, 2: 6, 4: 10, 8: 10 }, 'the pinned prefix at each width');
        same(statuses, { 1: 'partial/time-limit', 2: 'partial/time-limit', 4: 'complete', 8: 'complete' }, 'the status at each width');
        process.stdout.write(`NOTE live ${variant}: puzzles at the stop by width ${JSON.stringify(lengths)}, ended at ${JSON.stringify(endedAt)} ms from the origin\n`);
      },
    },
    {
      name: `live ${variant}: the deadline applies to the listed levels only`,
      async run() {
        const { igLiveOf } = await browserModule(await engine(variant), 'generation-client');
        const clock = { now: () => 5000 };
        same(igLiveOf({ igOrigin: 1000 }, 'hard', clock), { origin: 1000, setCutAt: 47000 }, 'the fixture level');
        assert(igLiveOf({ igOrigin: 1000 }, 'easy', clock) === null, 'an unlisted level has a deadline');
        assert(igLiveOf({}, 'hard', clock) === null, 'a request without an origin has a deadline');
      },
    },
    {
      name: `live ${variant}: the host bound around a held assembly`,
      async run() {
        const { set, chosen, want } = await wanted();
        const tree = await engine(variant);
        const { validatePack } = await treeModule(tree, 'pack');
        // An assembly gate (T07b's igAssemblyGate): it records every assembly the client enters and holds the named one
        // until release().
        const gate = (/** @type {'set' | 'batch'} */ hold) => {
          /** @type {string[]} */
          const entered = [];
          /** @type {() => void} */
          let open = () => {};
          const held = new Promise((resolve) => {
            open = () => resolve(undefined);
          });
          return {
            entered,
            release: () => open(),
            fn: (/** @type {string} */ phase) => {
              entered.push(phase);
              return phase === hold ? held : Promise.resolve();
            },
          };
        };
        {
          // (a) The batch's own pack assembly is held beyond 120 s: the response is already there at the bound.
          const g = gate('batch');
          const { h, client } = await scripted(4, (t) => (t.payload.slot <= 3 ? answerOf(chosen, t) : undefined), g.fn);
          const s = { t0: h.clock.now() };
          const bound = tree.e.runner.igBoundStart(s, { levelId: 'hard' }, h.clock, client);
          const original = client.generateBatch(batchInput(set, { igOrigin: s.t0 }));
          const o = track(original);
          /** @type {number | null} */
          let at = null;
          const r = track(bound.batch(original).then((v) => {
            at = h.clock.now() - s.t0;
            return v;
          }));
          await settle();
          h.clock.advance(115000);
          await settle();
          same(g.entered, ['batch'], '(a) the batch did not enter its pack assembly at the stop');
          assert(r.state === 'pending' && o.state === 'pending', `(a) settled before the bound: ${r.state}, ${o.state}`);
          h.clock.advance(4000);
          await settle();
          same([r.state, at], ['resolved', 119000], '(a) the response at the bound');
          h.clock.advance(1000);
          await settle();
          h.clock.advance(5000);
          await settle();
          assert(o.state === 'pending', '(a) the held assembly ended by itself');
          const v = r.value;
          same([v.status, v.reason, ids(v)], ['partial', 'response-bound', want.slice(0, 3)], '(a) the prefix of the same fold');
          same(Object.keys(v.made).sort(), [...ids(v)].sort(), '(a) one recipe entry per accepted candidate');
          assert(v.pack !== undefined && validatePack(v.pack).ok === true, '(a) the prefix has no valid assembled pack');
          assert(h.held.every((t) => t.worker.terminated), '(a) a held task was not cancelled');
          const before = JSON.stringify(v);
          g.release();
          for (const t of h.held) {
            h.answer(t, answerOf(chosen, t));
          }
          await settle();
          same([o.state, o.value?.status, o.value?.reason], ['resolved', 'partial', 'time-limit'], "(a) the batch's own result after the release");
          same([v.made, v.seenLayouts, v.seenClues, v.pack], [o.value.made, o.value.seenLayouts, o.value.seenClues, o.value.pack], "(a) the snapshot is not the batch's own prefix");
          same(JSON.stringify(r.value), before, '(a) the release or a late answer changed the response');
          bound.clear();
          h.pool.close();
        }
        {
          // (b) A set attempt succeeds at 10 s and its pack assembly is held: the bound ends the set phase at 119 s.
          const { set: pieceSet, calibration } = await setFixture(variant);
          const g = gate('set');
          const { h, client } = await scripted(4, undefined, g.fn);
          const s = { t0: h.clock.now() };
          const bound = tree.e.runner.igBoundStart(s, { levelId: 'hard' }, h.clock, client);
          const original = client.generateSet(setInput({ igOrigin: s.t0 }));
          const o = track(original);
          /** @type {number | null} */
          let at = null;
          const r = track(bound.set(original).then((v) => {
            at = h.clock.now() - s.t0;
            return v;
          }));
          await settle();
          h.clock.advance(10000);
          h.answer(/** @type {any} */ (h.held.find((t) => t.payload.attempt === 0)), { value: { ok: true, set: pieceSet, calibration, attempt: 0 } });
          await settle();
          same(g.entered, ['set'], '(b) the set did not enter its pack assembly');
          h.clock.advance(108999);
          await settle();
          assert(r.state === 'pending', `(b) ended before the bound: ${JSON.stringify(r.value)}`);
          h.clock.advance(1);
          await settle();
          same([r.state, r.value, at], ['resolved', { status: 'failed', reason: 'response-bound', failures: {} }, 119000], '(b) a set held in its assembly at the bound');
          h.clock.advance(1000);
          await settle();
          assert(o.state === 'pending', '(b) the held set assembly ended by itself');
          g.release();
          await settle();
          same([o.state, o.value?.status, o.value?.attempt], ['resolved', 'complete', 0], '(b) the set after its release');
          same(r.value, { status: 'failed', reason: 'response-bound', failures: {} }, '(b) the release changed the response');
          bound.clear();
          h.pool.close();
        }
      },
    },
  ];
}

/**
 * One set request on a scripted pool of the tree `variant` (the tree `<variant>-w8-test` for width 8): the pool and
 * the client are that tree's `core/browser/worker-pool.js` and `generation-client.js`. A `setAttempt` task is answered
 * at once when `script[attempt].now` is true, else held; then, at most 64 times, the held task with the lowest attempt
 * whose worker is not terminated is answered, until the request has resolved (V4-T07b).
 * @param {string} variant
 * @param {number} width The pool size: 1, 2, 4 or 8.
 * @param {Record<number, { fail?: string, ok?: true, now?: boolean }>} script A `{ fail: reason }` entry is the value
 *   `{ ok: false, reason }`, `{ ok: true }` the value `{ ok: true, set, calibration, attempt }`; an attempt without an
 *   entry fails with `not-in-band`.
 * @returns {Promise<{ outcome: any, answered: number[], dispatched: number[] }>} `outcome` holds the request's `status`,
 *   `reason`, `failures` and `attempt` (the keys it has); `answered` is the order of the held answers, `dispatched`
 *   the attempts in the order the pool received them.
 */
async function scriptedSet(variant, width, script) {
  const treeId = width === 8 ? `${variant}-w8-test` : variant;
  const tree = await engine(treeId);
  const { createPool } = await browserModule(tree, 'worker-pool');
  const { createGenerationClient } = await browserModule(tree, 'generation-client');
  const { recipe, set, calibration } = await setFixture(treeId);
  const valueOf = (/** @type {number} */ attempt) => {
    const entry = script[attempt];
    if (entry === undefined) {
      return { ok: false, reason: 'not-in-band' };
    }
    return entry.ok === true ? { ok: true, set, calibration, attempt } : { ok: false, reason: entry.fail };
  };
  const h = harness(createPool, {
    size: width,
    handler: (task) => (task.kind === 'setAttempt' && script[task.payload.attempt]?.now === true
      ? { value: valueOf(task.payload.attempt) } : undefined),
  });
  const client = createGenerationClient(h.pool, { clock: h.clock, createdAt: () => '2026-01-01T00:00:00.000Z' });
  const request = track(client.generateSet({
    boardRows: recipe.boardRows, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', maxActive: 676,
  }));
  /** @type {Set<any>} */
  const done = new Set();
  /** @type {number[]} */
  const answered = [];
  for (let i = 0; i < 64; i += 1) {
    await settle();
    if (request.state !== 'pending') {
      break;
    }
    const next = h.held
      .filter((t) => t.kind === 'setAttempt' && !done.has(t) && !t.worker.terminated)
      .sort((a, b) => a.payload.attempt - b.payload.attempt)[0];
    if (next !== undefined) {
      done.add(next);
      answered.push(next.payload.attempt);
      h.answer(next, { value: valueOf(next.payload.attempt) });
    }
  }
  assert(request.state === 'resolved', `${treeId}, width ${width}: the request is ${request.state} after 64 rounds (answered ${answered.join(',')})`);
  const { status, reason, failures, attempt } = request.value;
  return {
    outcome: { status, ...(reason === undefined ? {} : { reason }), ...(failures === undefined ? {} : { failures }), ...(attempt === undefined ? {} : { attempt }) },
    answered,
    dispatched: h.tasks.filter((t) => t.kind === 'setAttempt').map((t) => t.payload.attempt),
  };
}

/**
 * Runs a script at the pool widths 1, 2, 4 and 8 and checks the outcome (T07b: pool invariance).
 * @param {string} what
 * @param {string} variant
 * @param {Record<number, { fail?: string, ok?: true, now?: boolean }>} script
 * @param {(outcome: any) => boolean} accept Whether an outcome is the expected one.
 * @param {string} expected The expected outcome, for the message.
 * @returns {Promise<Record<number, any>>} The outcome per width.
 */
async function atEveryWidth(what, variant, script, accept, expected) {
  /** @type {Record<number, any>} */
  const outcomes = {};
  /** @type {string[]} */
  const orders = [];
  for (const width of [1, 2, 4, 8]) {
    const { outcome, answered, dispatched } = await scriptedSet(variant, width, script);
    outcomes[width] = outcome;
    orders.push(`w${width} answered ${answered.join(',')} of ${dispatched.length} dispatched`);
    assert(accept(outcome), `${what}: ${variant} at width ${width} gave ${JSON.stringify(outcome)}, expected ${expected} (answered ${answered.join(',')}; dispatched ${dispatched.join(',')})`);
    same(dispatched.slice(0, width), [...Array(width).keys()], `${what}: ${variant} at width ${width} dispatched ${dispatched.join(',')} first: the pool did not run ${width} workers`);
  }
  same(outcomes[1], outcomes[2], `${what}: the outcomes at width 1 and 2 differ`);
  same(outcomes[1], outcomes[4], `${what}: the outcomes at width 1 and 4 differ`);
  same(outcomes[1], outcomes[8], `${what}: the outcomes at width 1 and 8 differ`);
  process.stdout.write(`NOTE p5 ${what} (${variant}): ${JSON.stringify(outcomes[1])} at every width; ${orders.join('; ')}\n`);
  return outcomes;
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
  {
    name: 'p5: call budget stops deterministically',
    async run() {
      const spec = { prior: null, screen: () => 'cap', canon: (/** @type {number} */ c) => synthetic(100 - 10 * c) };
      const limit = 1520000000;
      // One name for every run: the rng stream and the journal row come from it, so the runs are the same input.
      const a = await v4Call('budget', { ...spec, extra: { igBudget: limit } });
      const b = await v4Call('budget', { ...spec, extra: { igBudget: limit } });
      for (const [what, r] of /** @type {[string, any][]} */ ([['first', a], ['second', b]])) {
        same(r.counts('locate'), [7, 13], `${what} run: locate counts ${JSON.stringify(r.counts('locate'))}`);
        same(r.counts('rescue'), [], `${what} run: rescue counts ${JSON.stringify(r.counts('rescue'))}`);
        same(r.end.locate.budgetStop, { limit, spent: limit, overshoot: 0 }, `${what} run: budgetStop ${JSON.stringify(r.end.locate.budgetStop)}`);
        same(r.result, { ok: false, reason: 'not-in-band' }, `${what} run: result ${JSON.stringify(r.result)}`);
      }
      same(a.result, b.result, 'the results of the two budgeted runs differ');
      same(stable(a.lines), stable(b.lines), 'the journals of the two budgeted runs differ');
      const free = await v4Call('budget', spec);
      same(free.counts('rescue'), [13, 7], `without a budget: rescue counts ${JSON.stringify(free.counts('rescue'))}`);
      assert(free.end.locate.budgetStop === undefined, 'a call without a budget journals a budgetStop');
    },
  },
  {
    name: 'p5: budget sweep (S1, S2)',
    async run() {
      const { e } = await engine('v4');
      const CATEGORIES = ['search', 're-rating', 'first count', 'count after count', 'repair rating'];
      const categoryOf = (/** @type {string[]} */ K, /** @type {number} */ j) => {
        const kind = K[j];
        if (kind === 'count') {
          return j > 0 && K[j - 1] === 'count' ? 'count after count' : 'first count';
        }
        if (['rate:locate', 'rate:window', 'rate:p2', 'rate:beam'].includes(kind)) {
          return 'search';
        }
        if (kind === 'rate:rescue' || kind === 'rate:rerate') {
          return 're-rating';
        }
        assert(kind === 'rate:repair', `unknown charge kind ${kind} at index ${j}`);
        return 'repair rating';
      };
      const begins = (/** @type {string} */ what, /** @type {any[]} */ lines) => {
        const begin = lines.filter((l) => l.t === 'begin').length;
        const done = lines.filter((l) => l.t === 'p' || l.t === 'count').length;
        assert(begin === done, `${what}: ${begin} begin lines against ${done} rating and count lines`);
      };
      /** @type {Set<string>} */
      const covered = new Set();
      /** @type {Record<string, string[]>} */
      const logs = {};
      for (const [label, spec] of /** @type {[string, typeof BEGIN_CALL][]} */ ([['S1', BEGIN_CALL], ['S2', BEGIN_CALL_2]])) {
        const name = `sweep-${label}`;
        const U = await v4Call(name, { ...spec, extra: { charge: true, igChargeKinds: [] } });
        const L = U.chargeLog;
        const K = /** @type {string[]} */ (U.kinds);
        const n = L.length;
        logs[label] = K;
        assert(n > 0 && L.length === K.length, `${label}: ${L.length} charges against ${K.length} kinds`);
        begins(`${label} unbudgeted`, U.lines);
        const P = prefix(L);
        /** @type {Map<string, number[]>} */
        const byCategory = new Map();
        K.forEach((_, j) => {
          const c = categoryOf(K, j);
          byCategory.set(c, [...(byCategory.get(c) ?? []), j]);
        });
        const sweep = new Set([0, n - 1]);
        for (const [c, list] of byCategory) {
          covered.add(c);
          list.slice(0, 3).forEach((j) => sweep.add(j));
        }
        process.stdout.write(`NOTE p5 sweep ${label}: ${n} operations, ${sweep.size} budgets; ${[...byCategory].map(([c, list]) => `${c} ${list.length}`).join(', ')}\n`);
        for (const i of [...sweep].sort((x, y) => x - y)) {
          const B = P[i];
          const text = `${label}, budget ${B} (index ${i}, kind ${K[i]})`;
          const run = await v4Call(name, { ...spec, extra: { charge: true, igChargeKinds: [], igBudget: B } });
          const j = m(P, B);
          same(run.chargeLog, L.slice(0, j), `${text}: the charge log is not the first ${j} charges of the unbudgeted run`);
          same(run.kinds, K.slice(0, j), `${text}: the kinds are not the first ${j} of the unbudgeted run`);
          const r = run.result;
          if (r.ok === true) {
            assert(e.difficulty.inBand(r.rating, BAND) && r.certificate?.status === 'unique', `${text}: an ok result that is out of the band or not unique: ${JSON.stringify(r)}`);
          } else {
            assert(r.ok === false && ['not-in-band', 'uniqueness-not-proved'].includes(r.reason), `${text}: result ${JSON.stringify(r)}`);
          }
          const stop = run.end.locate.budgetStop;
          if (j < n) {
            same(stop, { limit: B, spent: P[j], overshoot: P[j] - B }, `${text}: budgetStop ${JSON.stringify(stop)}`);
          } else {
            assert(stop === undefined, `${text}: a budgetStop ${JSON.stringify(stop)} although every operation ran`);
          }
          assert(run.end.locate.spent === P[j], `${text}: locate.spent ${run.end.locate.spent}, expected ${P[j]}`);
          begins(text, run.lines);
        }
      }
      for (const c of CATEGORIES) {
        assert(covered.has(c), `no index of the category "${c}" in S1 or S2; the kind logs: ${JSON.stringify(logs)}`);
      }
    },
  },
  {
    name: 'p5: budget end with unfinished candidates, every observer mode',
    async run() {
      const name = 'endmodes';
      const U = await v4Call(name, { ...BEGIN_CALL_2, extra: { charge: true, igChargeKinds: [] } });
      const L = U.chargeLog;
      const f = /** @type {string[]} */ (U.kinds).indexOf('count');
      assert(f > 0, `S2's first count is at index ${f}`);
      const B = prefix(L)[f];
      /** @type {any[]} */
      const events = [];
      const A = await v4Call(name, { ...BEGIN_CALL_2, extra: { igBudget: B } });
      const Bm = await v4Call(name, { ...BEGIN_CALL_2, extra: { igBudget: B, charge: true, igChargeKinds: [] } });
      const C = await v4Call(name, {
        ...BEGIN_CALL_2, extra: { igBudget: B, charge: true, igChargeKinds: [], record: (/** @type {any} */ ev) => events.push(ev) },
      });
      same(A.result, { ok: false, reason: 'not-in-band' }, `no observer: ${JSON.stringify(A.result)}`);
      same(Bm.result, A.result, `charge only: ${JSON.stringify(Bm.result)}`);
      same(C.result, A.result, `charge and record: ${JSON.stringify(C.result)}`);
      same(Bm.chargeLog, L.slice(0, f), 'charge only: the charge log is not the units before the first count');
      same(C.chargeLog, L.slice(0, f), 'charge and record: the charge log is not the units before the first count');
      const inBandRated = events.filter((ev) => ev.kind === 'rated' && ev.rating.score >= 55 && ev.rating.score < 70);
      assert(inBandRated.length >= 2, `${inBandRated.length} in-band rated events: two or more in-band candidates were not waiting`);
      assert(!events.some((ev) => ev.kind === 'selected'), 'a selected event was recorded after the budget end');
      assert(!events.some((ev) => ev.kind === 'repair'), 'a repair event was recorded after the budget end');
    },
  },
  {
    name: 'p5: no-window side',
    async run() {
      const specBelow = { prior: null, screen: () => synthetic(30) };
      const specAbove = { prior: null, screen: () => 'cap', canon: () => synthetic(90) };
      const below = await v4Call('side-below', { ...specBelow, variant: 'v4-p5' });
      const above = await v4Call('side-above', { ...specAbove, variant: 'v4-p5' });
      const plain = await v4Call('side-above', { ...specAbove, variant: 'v4' });
      same(below.result, { ok: false, reason: 'not-in-band', igNoWindow: 'below' }, `v4-p5, every probe below: ${JSON.stringify(below.result)}`);
      same(above.result, { ok: false, reason: 'not-in-band', igNoWindow: 'above' }, `v4-p5, every probe above: ${JSON.stringify(above.result)}`);
      same(plain.result, { ok: false, reason: 'not-in-band' }, `v4, every probe above: ${JSON.stringify(plain.result)}`);
      assert(!('igNoWindow' in plain.result), 'the v4 tree writes the side');
      for (const [what, r] of /** @type {[string, any][]} */ ([['below', below], ['above', above], ['v4 above', plain]])) {
        assert(r.end !== undefined && r.end.locate.result === (what === 'below' ? 'below-to-one' : 'above-to-max') && !JSON.stringify(r.lines).includes('igNoWindow'),
          `${what}: the journal ends ${JSON.stringify(r.end?.locate)} or names the side`);
      }
    },
  },
  {
    name: 'p5: bounded set attempts rule',
    async run() {
      const { igSetBound } = await browserModule(await engine('v4-p5'), 'generation-client');
      const fail = (/** @type {string} */ reason) => ({ kind: 'fail', reason });
      const mapOf = (/** @type {Record<number, any>} */ entries) => new Map(Object.entries(entries).map(([j, r]) => [Number(j), r]));
      const below = fail('no-window-below');
      const above = fail('no-window-above');
      const rule = [
        ['(a) 0-3 no-window-below', { 0: below, 1: below, 2: below, 3: below }, 'no-window-below'],
        ['(b) 0-2 below, 3 above', { 0: below, 1: below, 2: below, 3: above }, null],
        ['(c) 0-3 no-window-above', { 0: above, 1: above, 2: above, 3: above }, 'no-window-above'],
        ['(d) 0 ok, 1-3 below', { 0: { kind: 'ok', value: {} }, 1: below, 2: below, 3: below }, null],
        ['(e) 0-2 below only', { 0: below, 1: below, 2: below }, null],
        ['(f) 0-3 below except 2 carve', { 0: below, 1: below, 2: fail('carve'), 3: below }, null],
        ['(g) 0-2 below, 3 fault', { 0: below, 1: below, 2: below, 3: { kind: 'fault', error: new Error('worker') } }, null],
        ['(h) 0-2 below, 3 skipped', { 0: below, 1: below, 2: below, 3: { kind: 'skipped' } }, null],
      ];
      for (const [what, entries, expected] of /** @type {[string, Record<number, any>, string | null][]} */ (rule)) {
        const got = igSetBound(mapOf(entries));
        assert(got === expected, `${what}: igSetBound gave ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
      }
    },
  },
  {
    name: 'p5: a later success does not beat the bound',
    async run() {
      const script = {
        0: { fail: 'no-window-below' }, 1: { fail: 'no-window-below' }, 2: { fail: 'no-window-below' }, 3: { fail: 'no-window-below' },
        4: { ok: /** @type {const} */ (true), now: true },
      };
      await atEveryWidth('a later success', 'v4-p5', script,
        (o) => o.status === 'failed' && o.reason === 'no-window-below' && o.failures?.['no-window-below'] === 4,
        "{ status: 'failed', reason: 'no-window-below' } with 4 failures of that reason");
    },
  },
  {
    name: 'p5: a success inside the bound wins',
    async run() {
      const script = {
        0: { fail: 'no-window-below' }, 1: { fail: 'no-window-below' }, 2: { ok: /** @type {const} */ (true) }, 3: { fail: 'no-window-below' },
      };
      await atEveryWidth('a success inside the bound', 'v4-p5', script, (o) => o.status === 'complete' && o.attempt === 2, "status 'complete', attempt 2");
    },
  },
  {
    name: 'p5: mixed sides do not stop',
    async run() {
      const script = {
        0: { fail: 'no-window-below' }, 1: { fail: 'no-window-below' }, 2: { fail: 'no-window-above' }, 3: { fail: 'no-window-above' },
        4: { fail: 'not-in-band' }, 5: { ok: /** @type {const} */ (true) },
      };
      await atEveryWidth('mixed sides', 'v4-p5', script, (o) => o.status === 'complete' && o.attempt === 5, "status 'complete', attempt 5");
    },
  },
  {
    name: 'p5: without the bound the later success wins',
    async run() {
      const script = {
        0: { fail: 'no-window-below' }, 1: { fail: 'no-window-below' }, 2: { fail: 'no-window-below' }, 3: { fail: 'no-window-below' },
        4: { ok: /** @type {const} */ (true), now: true },
      };
      await atEveryWidth('without the bound', 'v4-link', script, (o) => o.status === 'complete' && o.attempt === 4, "status 'complete', attempt 4");
    },
  },
  {
    name: 'p5: the width-8 trees',
    async run() {
      const sizes = [];
      for (const id of ['v4-p5', 'v4-p5-w8-test', 'v4-link-w8-test']) {
        sizes.push((await browserModule(await engine(id), 'worker-pool')).MAX_POOL_SIZE);
      }
      same(sizes, [4, 8, 8], `MAX_POOL_SIZE of v4-p5, v4-p5-w8-test and v4-link-w8-test: ${JSON.stringify(sizes)}`);
    },
  },
  {
    name: 'p5: a budget-stopped call replays its skips',
    async run() {
      const { e, ws } = await engine('v4');
      const { carved } = await k15Set();
      // The 4-clue hit is central, so its repair is finished at once, and the repaired rating is in the band but not
      // central: the call goes on with a final result in hand until the budget ends it in the middle of a later repair.
      const x = { igPrior: null, igScreen: synth(e, DOWN), igCanonical: synth(e, (c) => synthetic(c <= 4 ? 60 : 56)), uniqueness: 'require' };
      const name = 'p5-skip-g';
      /** @type {any[]} */
      const events = [];
      e.clues.selectClues(await v4Ctx(e, ws, name, { ...x, record: (/** @type {any} */ ev) => events.push(ev) }));
      const K0 = [0, 1].map((sequence) => {
        const ev = events.find((y) => y.sequence === sequence && Array.isArray(y.clueIds));
        assert(ev !== undefined, `p5 skip: no event of sequence ${sequence}: ${events.map((y) => `${y.kind}@${y.sequence}`).join(',')}`);
        return e.keys.clueKey(carved.board, carved.set.pieces, carved.set.witness.filter((/** @type {any} */ p) => ev.clueIds.includes(p.piece)));
      });
      /** @type {number[]} */
      const L = [];
      e.clues.selectClues(await v4Ctx(e, ws, name, { ...x, excludeClueKeys: new Set(K0), charge: (/** @type {number} */ u) => L.push(u) }));
      assert(L.length >= 2, `p5 skip: ${L.length} charges in the excluded run`);
      const B = L.slice(0, Math.ceil(L.length / 2)).reduce((sum, u) => sum + u, 0);
      const ctx1 = await v4Ctx(e, ws, name, { ...x, excludeClueKeys: new Set(K0), igBudget: B });
      const R1 = journaled('p5-skip-r1', () => e.clues.selectClues(ctx1));
      assert(R1.error === null, `p5 skip: the budgeted run threw ${String(R1.error)}`);
      assert(R1.result.ok === true && R1.result.skips.subsets[0] === 0, `p5 skip: the budgeted run: ${JSON.stringify(R1.result)}`);
      const end = R1.lines.find((l) => l.t === 'end');
      assert(end !== undefined && end.locate.budgetStop !== undefined, `p5 skip: no budgetStop in the end line ${JSON.stringify(end?.locate)}`);
      const R2 = e.clues.selectClues(await v4Ctx(e, ws, name, { ...x, igBudget: B, excludeClueKeys: new Set(), replaySkips: R1.result.skips }));
      same(R2, R1.result, `p5 skip: the replay differs from the budgeted run: ${JSON.stringify(R2)} against ${JSON.stringify(R1.result)}`);
      const ctx3 = await v4Ctx(e, ws, name, {
        ...x, igBudget: B, excludeClueKeys: new Set(),
        replaySkips: { subsets: [...R1.result.skips.subsets, 2191], repairs: R1.result.skips.repairs },
      });
      /** @type {any} */
      let thrown = null;
      try {
        e.clues.selectClues(ctx3);
      } catch (caught) {
        thrown = caught;
      }
      assert(thrown instanceof e.clues.SkipReplayError && thrown.reason === 'unused' && thrown.list === 'subsets' && thrown.ordinal === 2191,
        `p5 skip: the extra entry gave ${thrown === null ? 'no error' : `${thrown.name}: ${thrown.message}`}`);
    },
  },
  {
    name: 'p5: budget end in any mode returns the best waiting candidate',
    async run() {
      const name = 'endany';
      const S2A = { ...BEGIN_CALL_2, uniqueness: /** @type {const} */ ('any') };
      const U = await v4Call(name, { ...S2A, extra: { charge: true, igChargeKinds: [] } });
      assert(U.result.ok === true && U.result.rating.score === 56 && U.result.certificate === null,
        `any, unbudgeted: ${JSON.stringify(U.result)}`);
      assert(U.end.locate.budgetStop === undefined, 'any, unbudgeted: the end line has a budgetStop');
      const L = U.chargeLog;
      const n = L.length;
      assert(n > 0, 'any, unbudgeted: no charge');
      const P = prefix(L);
      /** @type {any[]} */
      const runs = [];
      let h = -1;
      let emptyAt = -1;
      for (let i = 0; i < n; i += 1) {
        /** @type {any[]} */
        const E = [];
        const R = await v4Call(name, {
          ...S2A, extra: { igBudget: P[i], charge: true, igChargeKinds: [], record: (/** @type {any} */ ev) => E.push(ev) },
        });
        const W = E.filter((ev) => ev.kind === 'rated' && ev.rating.score >= 55 && ev.rating.score < 70);
        const j = m(P, P[i]);
        const text = `any, budget ${P[i]} (index ${i}, ${W.length} waiting)`;
        same(R.chargeLog, L.slice(0, j), `${text}: the charge log is not the first ${j} charges of the unbudgeted run`);
        same(R.end.locate.budgetStop, { limit: P[i], spent: P[j], overshoot: P[j] - P[i] }, `${text}: budgetStop ${JSON.stringify(R.end.locate.budgetStop)}`);
        const selected = E.filter((ev) => ev.kind === 'selected');
        if (W.length === 0) {
          same(R.result, { ok: false, reason: 'not-in-band' }, `${text}: result ${JSON.stringify(R.result)}`);
          assert(selected.length === 0, `${text}: a selected event although no candidate waits`);
          emptyAt = emptyAt < 0 ? i : emptyAt;
        } else {
          assert(R.result.ok === true && R.result.rating.score === 56 && R.result.certificate === null, `${text}: result ${JSON.stringify(R.result)}`);
          assert(selected.length === 1 && E[E.length - 1] === selected[0], `${text}: ${selected.length} selected events, the last event is ${E[E.length - 1]?.kind}`);
          assert(W.some((ev) => ev.sequence === selected[0].sequence), `${text}: the selected sequence ${selected[0].sequence} is no waiting candidate`);
        }
        if (h < 0 && W.length >= 2) {
          h = i;
        }
        runs.push(R);
      }
      assert(emptyAt >= 0 && h >= 0, `any: coverage: first index with no waiting candidate ${emptyAt}, first with two ${h} (n ${n})`);
      const A = await v4Call(name, { ...S2A, extra: { igBudget: P[h] } });
      const Bm = await v4Call(name, { ...S2A, extra: { igBudget: P[h], charge: true, igChargeKinds: [] } });
      same(A.result, runs[h].result, `any, no observer: ${JSON.stringify(A.result)}`);
      same(Bm.result, runs[h].result, `any, charge only: ${JSON.stringify(Bm.result)}`);
      same(Bm.chargeLog, L.slice(0, m(P, P[h])), 'any, charge only: the charge log is not the units before the stop');
      process.stdout.write(`NOTE p5 any: ${n} operations, ${n} budgets; the first with no waiting candidate is index ${emptyAt}, the first with two is index ${h}\n`);
    },
  },
  {
    name: 'fr: class table',
    async run() {
      const ids = ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5'];
      /** @type {Record<string, any>} */
      const trees = {};
      for (const id of ids) {
        trees[id] = await ensureTree(id);
      }
      assert(new Set(ids.map((id) => trees[id].treeId)).size === ids.length, 'the seven arms do not have seven different tree ids');
      const { screenClass, classW } = await import(pathToFileURL(join(trees['fr-base'].root, 'core', 'engine', 'ig-select-v4.js')).href);
      for (const [level, area, want] of /** @type {[string, number, string | null][]} */ ([
        ['nightmare', 100, 'n-small'], ['nightmare', 144, 'n-small'], ['nightmare', 145, null], ['nightmare', 196, 'n-mid'],
        ['nightmare', 324, 'n-mid'], ['nightmare', 325, null], ['nightmare', 359, null], ['nightmare', 360, 'n-large'],
        ['nightmare', 676, 'n-large'], ['hell-1', 196, 'hell-1'], ['master', 196, null],
      ])) {
        assert(screenClass(level, area) === want, `screenClass(${level}, ${area}) is ${screenClass(level, area)}, expected ${want}`);
      }
      const NONE = 760000000;
      const table = trees['fr-base'].params.screenClasses;
      for (const [level, area, want] of /** @type {[string, number, number][]} */ ([
        ['nightmare', 196, 190000000], ['nightmare', 324, 190000000], ['nightmare', 144, NONE], ['nightmare', 145, NONE],
        ['nightmare', 325, NONE], ['nightmare', 360, NONE], ['hell-1', 196, NONE], ['master', 196, NONE],
      ])) {
        assert(classW(table, level, area) === want, `fr-base: classW(${level}, ${area}) is ${classW(table, level, area)}, expected ${want}`);
      }
      assert(classW(undefined, 'nightmare', 196) === undefined && classW(null, 'nightmare', 196) === undefined, 'classW without a table is not undefined');
      // The screen-everywhere and no-screen tables fail closed on the unlisted classes too.
      const all = trees['fr-screen'].params.screenClasses;
      for (const [level, area, want] of /** @type {[string, number, number][]} */ ([
        ['hell-1', 196, 380000000], ['nightmare', 100, 190000000], ['nightmare', 400, 190000000], ['nightmare', 145, NONE],
        ['nightmare', 359, NONE], ['master', 196, NONE],
      ])) {
        assert(classW(all, level, area) === want, `fr-screen: classW(${level}, ${area}) is ${classW(all, level, area)}, expected ${want}`);
      }
      const none = trees['fr-none'].params.screenClasses;
      for (const [level, area] of /** @type {[string, number][]} */ ([['hell-1', 196], ['nightmare', 100], ['nightmare', 196], ['nightmare', 400]])) {
        assert(classW(none, level, area) === NONE, `fr-none: classW(${level}, ${area}) is ${classW(none, level, area)}`);
      }
      // An entry that is missing, not a number, not positive or not below the canonical limit is no screen.
      for (const entry of [{}, { 'n-mid': 0 }, { 'n-mid': -1 }, { 'n-mid': NONE }, { 'n-mid': NONE + 1 }, { 'n-mid': '190' }, { 'n-mid': null }]) {
        assert(classW(entry, 'nightmare', 196) === NONE, `classW(${JSON.stringify(entry)}) is ${classW(entry, 'nightmare', 196)}, expected no screen`);
      }
      assert(classW({ 'n-mid': 1 }, 'nightmare', 196) === 1, 'a positive entry below the canonical limit is not kept');
      same(trees['fr-base'].params.screenClasses, { 'hell-1': null, 'n-small': null, 'n-mid': 190000000, 'n-large': null }, 'fr-base: screenClasses');
      same(all, { 'hell-1': 380000000, 'n-small': 190000000, 'n-mid': 190000000, 'n-large': 190000000 }, 'fr-screen: screenClasses');
      same(none, { 'hell-1': null, 'n-small': null, 'n-mid': null, 'n-large': null }, 'fr-none: screenClasses');
      same(ids.map((id) => trees[id].params.screenTable),
        ['tab-default', 'tab-screen', 'tab-none', 'tab-default', 'tab-default', 'tab-default', 'tab-default'], 'the screenTable of each arm');
      same(ids.map((id) => [trees[id].params.rerate, trees[id].params.c4]),
        [[undefined, undefined], [undefined, undefined], [undefined, undefined], ['close', undefined], [undefined, true],
          [undefined, undefined], [undefined, undefined]], 'the rerate and c4 parameters of each arm');
      assert(trees['fr-ps'].params.perSetPrior === true && trees['fr-ps'].params.screenTable === 'tab-default', `fr-ps params ${JSON.stringify(trees['fr-ps'].params)}`);
      assert(trees['fr-p5'].params.callBudget.default === 2000000000 && trees['fr-p5'].params.setAttemptsBound === 4, `fr-p5 params ${JSON.stringify(trees['fr-p5'].params)}`);
      assert(ids.every((id) => trees[id].chain.includes('v4-link') && trees[id].params.W.default === 190000000 && trees[id].params.link === true), 'an arm is not on the v4-link base');
      assert(trees['fr-ps'].chain.includes('v4-ps') && trees['fr-p5'].chain.includes('v4-p5'), 'fr-ps or fr-p5 lacks its parent in the chain');
      const V = (await engine('fr-base')).e.generate.provenanceVersions();
      assert(V.algo === 'gen-v4-proto:fr-base' && V.priorTable === 'prior-v1' && V.screenTable === 'tab-default', `fr-base versions ${JSON.stringify(V)}`);
      // The table reaches the call: the screen limit of the start line follows the class of the target and the area of the board.
      const { carved } = await k15Set();
      const area = (await engine('fr-base')).e.board.activeCount(carved.board);
      assert(area <= 144, `the K = 15 set's board has ${area} active cells`);
      const wOf = async (/** @type {string} */ variant, /** @type {string} */ levelId, /** @type {Record<string, any>} */ extra = {}) => {
        const { e, ws } = await engine(variant);
        const target = { id: levelId, min: 55, max: 70, share: 0.3 };
        const ctx = await v4Ctx(e, ws, 'frw', { target, igPrior: null, igScreen: synth(e, DOWN), igCanonical: synth(e, DOWN), ...extra });
        return journaled(`frw-${variant}-${levelId}`, () => e.clues.selectClues(ctx)).lines.find((l) => l.t === 'start').W;
      };
      same([
        await wOf('fr-base', 'nightmare'), await wOf('fr-screen', 'nightmare'), await wOf('fr-none', 'nightmare'),
        await wOf('fr-base', 'hell-1'), await wOf('fr-screen', 'hell-1'), await wOf('fr-base', 'nightmare', { igW: 123 }), await wOf('v4', 'nightmare'),
      ], [NONE, 190000000, NONE, NONE, 380000000, 123, 190000000], 'the screen limit of the start line (fr-base, fr-screen, fr-none, fr-base on Hell 1, fr-screen on Hell 1, the seam, v4)');
    },
  },
  {
    name: 'fr: bracket-close re-rating (synthetic)',
    async run() {
      const screen = (/** @type {number} */ c) => (c <= 4 ? 'cap' : synthetic(100 - 10 * c));
      const canon = (/** @type {number} */ c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c));
      const spec = { prior: null, screen, canon, extra: { igW: 190000000 } };
      const close = await v4Call('frclose', { ...spec, variant: 'fr-close' });
      same(close.counts('locate'), [7, 1, 4, 5], `fr-close: locate probes ${JSON.stringify(close.counts('locate'))}`);
      same(close.counts('close'), [4], `fr-close: close probes ${JSON.stringify(close.counts('close'))}`);
      assert(close.end.locate.noWindowProof === 'closed-in', `fr-close: noWindowProof ${close.end.locate.noWindowProof}`);
      assert(close.result.ok === true && close.result.clues.length === 4, `fr-close: result ${JSON.stringify(close.result.ok)}`);
      same(close.end.locate.close, { count: 4, side: 'in', kind: 'rated' }, 'fr-close: the close block');
      assert(close.end.locate.result === 'hit' && close.end.locate.hit === 4 && close.end.locate.wc === 4 && close.end.rerates === 1, `fr-close: ${JSON.stringify(close.end.locate)}`);
      assert(!close.phases.includes('window'), 'fr-close: the call went on to the window');
      same(close.result.igWindow.proof, 'closed-in', 'fr-close: the result carries the proof');
      const base = await v4Call('frclose', { ...spec, variant: 'fr-base' });
      same(base.counts('close'), [], 'fr-base: a close probe');
      assert(base.result.ok === true && base.result.clues.length === 4, `fr-base: result ${JSON.stringify(base.result.ok)}`);
      assert(base.end.locate.close === undefined && base.end.profiles > close.end.profiles, `fr-base: ${base.end.profiles} profiles against ${close.end.profiles}, close ${JSON.stringify(base.end.locate.close)}`);
      process.stdout.write(`NOTE fr close: fr-close ${close.end.profiles} profiles and ${close.end.rerates} re-rating; fr-base ${base.end.profiles} profiles and ${base.end.rerates} re-ratings, result ${base.result.clues.length} clues\n`);
      // A closed bracket whose lower end is no screen cap is not re-rated.
      const sure = await v4Call('frclose-sure', { prior: null, screen: (c) => synthetic(c <= 4 ? 80 : 30), extra: { igW: 190000000 }, variant: 'fr-close' });
      same(sure.counts('locate'), [7, 1, 4, 5], `fr-close, no cap: locate probes ${JSON.stringify(sure.counts('locate'))}`);
      assert(sure.counts('close').length === 0 && sure.end.locate.close === undefined, 'fr-close: an uncapped lower end was re-rated');
      // A canonical result that is not in band is recorded and the call goes on without a hit.
      const below = await v4Call('frclose-below', { ...spec, canon: (c) => (c <= 2 ? 'cap' : synthetic(c <= 4 ? 50 : 100 - 10 * c)), variant: 'fr-close' });
      same(below.counts('close'), [4], `fr-close, canonical below: close probes ${JSON.stringify(below.counts('close'))}`);
      same(below.end.locate.close, { count: 4, side: 'below', kind: 'rated' }, 'fr-close, canonical below: the close block');
      assert(below.end.locate.noWindowProof !== 'closed-in' && below.end.locate.hit === null && below.phases.includes('window'), `fr-close, canonical below: ${JSON.stringify(below.end.locate)}`);
    },
  },
  {
    name: 'fr: (c4) probe (synthetic)',
    async run() {
      const f = (/** @type {number} */ c) => (c <= 1 ? 'cap' : c === 2 ? synthetic(64) : c === 3 ? synthetic(61) : synthetic(100 - 10 * c));
      /** @type {any[]} */
      const events = [];
      const spec = { prior: 3, screen: f, canon: f };
      const c4 = await v4Call('frc4', { ...spec, variant: 'fr-c4', extra: { igW: 190000000, record: (/** @type {any} */ ev) => events.push(ev) } });
      same(c4.counts('locate'), [3], `fr-c4: locate probes ${JSON.stringify(c4.counts('locate'))}`);
      same(c4.counts('below'), [2], `fr-c4: below probes ${JSON.stringify(c4.counts('below'))}`);
      assert(c4.result.ok === true && c4.result.clues.length === 2, `fr-c4: result ${JSON.stringify(c4.result.ok)}`);
      same(c4.end.locate.c4, { count: 2, side: 'in', kind: 'rated' }, 'fr-c4: the c4 block');
      assert(c4.end.locate.result === 'hit' && c4.end.locate.hit === 2 && c4.end.locate.probes === 1, `fr-c4: ${JSON.stringify(c4.end.locate)}`);
      same(events.filter((ev) => ev.kind === 'rated').map((ev) => [ev.phase, ev.sequence]), [['locate', 0], ['below', 1]], 'fr-c4: the rated events (phase, ordinal)');
      same(c4.phases, ['locate', 'below'], 'fr-c4: the phases');
      const base = await v4Call('frc4', { ...spec, variant: 'fr-base', extra: { igW: 190000000 } });
      assert(base.result.ok === true && base.result.clues.length === 3, `fr-base: result ${JSON.stringify(base.result.ok)}`);
      assert(base.tuples.every((t) => t[0] !== 'below') && base.end.locate.c4 === undefined, 'fr-base: a below probe');
      // The probe takes the family subset first, then a sample: an excluded family subset costs a second ordinal.
      const { e } = await engine('fr-c4');
      const { carved } = await k15Set();
      const keyOf = (/** @type {any} */ ev) => e.keys.clueKey(carved.board, carved.set.pieces, carved.set.witness.filter((/** @type {any} */ p) => ev.clueIds.includes(p.piece)));
      const exclude = new Set([keyOf(events.find((ev) => ev.phase === 'below'))]);
      /** @type {any[]} */
      const events2 = [];
      const second = await v4Call('frc4', { ...spec, variant: 'fr-c4', extra: { igW: 190000000, excludeClueKeys: exclude, record: (/** @type {any} */ ev) => events2.push(ev) } });
      same(events2.filter((ev) => ev.kind === 'skip' || ev.kind === 'rated').map((ev) => [ev.kind, ev.phase ?? null, ev.sequence]),
        [['rated', 'locate', 0], ['skip', null, 1], ['rated', 'below', 2]], 'fr-c4, family subset excluded: the events (kind, phase, ordinal)');
      same(second.end.locate.c4, { count: 2, side: 'in', kind: 'rated' }, 'fr-c4, family subset excluded: the c4 block');
      assert(second.result.ok === true && second.result.clues.length === 2, 'fr-c4, family subset excluded: the sample was not offered');
      same(second.result.skips, { subsets: [1], repairs: [] }, 'fr-c4, family subset excluded: skips');
      // Both subsets excluded: the probe ends as a skip after two ordinals and the hit stands.
      exclude.add(keyOf(events2.find((ev) => ev.phase === 'below')));
      /** @type {any[]} */
      const events3 = [];
      const third = await v4Call('frc4', { ...spec, variant: 'fr-c4', extra: { igW: 190000000, excludeClueKeys: exclude, record: (/** @type {any} */ ev) => events3.push(ev) } });
      same(third.end.locate.c4, { count: 2, side: 'skip', kind: null }, 'fr-c4, both excluded: the c4 block');
      same(events3.filter((ev) => ev.kind === 'skip' || ev.kind === 'rated').map((ev) => [ev.kind, ev.sequence]),
        [['rated', 0], ['skip', 1], ['skip', 2]], 'fr-c4, both excluded: the events (kind, ordinal)');
      assert(third.result.ok === true && third.result.clues.length === 3 && third.end.locate.hit === 3, `fr-c4, both excluded: ${JSON.stringify(third.end.locate)}`);
      process.stdout.write(`NOTE fr c4: subset skips ${JSON.stringify(c4.result.skips.subsets)}, ${JSON.stringify(second.result.skips.subsets)} and ${JSON.stringify(third.result.skips.subsets)} (nothing excluded, the family subset excluded, both excluded); profiles ${c4.end.profiles}, ${second.end.profiles} and ${third.end.profiles}; fr-base ${base.end.profiles}\n`);
    },
  },
  {
    name: 'kernel: r4c counters and the complete deduction',
    async run() {
      const r4c = await engine('r4c');
      const instr = await engine('instr');
      const measure = (/** @type {any} */ { e, ws }, /** @type {any} */ item) => {
        e.deduce.igTake();
        const model = e.tiling.buildModel(item.board, item.pieces, item.clues, ws);
        const result = e.deduce.measureDeduction(model, e.policy.DEDUCE);
        return { result, ins: e.deduce.igTake() };
      };
      const items = await corpus();
      assert(items.length >= 2, `the corpus has ${items.length} items`);
      const checkR4 = (/** @type {any} */ r4, /** @type {string} */ name) => {
        same(Object.keys(r4), [...R4_FIELDS], `${name}: the keys of r4`);
        assert(R4_FIELDS.every((k) => Number.isInteger(r4[k]) && r4[k] >= 0), `${name}: r4 ${JSON.stringify(r4)} is not nine non-negative integers`);
        assert(r4.calls >= 1, `${name}: no R4 call (${JSON.stringify(r4)})`);
        assert(r4.countChanged <= r4.dirtyPieces && r4.dirtyPieces <= r4.pieces, `${name}: countChanged <= dirtyPieces <= pieces fails (${JSON.stringify(r4)})`);
        assert(r4.liveRows <= r4.staticRows && r4.r4Kills <= r4.kills, `${name}: liveRows <= staticRows or r4Kills <= kills fails (${JSON.stringify(r4)})`);
      };
      /** @type {any[]} */
      const records = [];
      /** @type {any[]} */
      const results = [];
      for (const [i, item] of items.entries()) {
        const mine = measure(r4c, item);
        const base = measure(instr, item);
        assert(isDeepStrictEqual(mine.result, base.result), `corpus item ${i}: the DeductionResult of r4c differs from instr's`);
        assert(base.ins !== null && !('r4' in base.ins), `corpus item ${i}: the instr record has r4`);
        assert(mine.ins !== null && mine.ins.workFirst === base.ins.workFirst, `corpus item ${i}: the instr fields of the r4c record differ`);
        if (i < 2) {
          checkR4(mine.ins.r4, `corpus item ${i}`);
        }
        assert(mine.result.search.work > 0 && mine.result.search.nodes > 0, `corpus item ${i}: the result holds no search (${JSON.stringify(mine.result.search)})`);
        records.push(mine.ins.r4);
        results.push([mine.result.path, mine.result.search.work, mine.result.search.nodes]);
      }
      process.stdout.write(`NOTE kernel r4: ${JSON.stringify(records.slice(0, 2))}; ${records.length} corpus items compared (path, work, nodes of the first two: ${JSON.stringify(results.slice(0, 2))})\n`);
      // The specified input reaches every path the counters are for: removals and restorations, R4 kills, and a membership change
      // that the live-row count does not show (dirtyPieces above countChanged).
      assert(records.slice(0, 2).every((r4) => r4.kills > 0 && r4.undoEntries > 0), `the first two items have no removal or restoration: ${JSON.stringify(records.slice(0, 2))}`);
      assert(records.slice(0, 2).some((r4) => r4.r4Kills > 0), 'no R4 kill in the first two items');
      assert(records.slice(0, 2).some((r4) => r4.dirtyPieces > r4.countChanged), 'no visit in the first two items is dirty with an unchanged count');
      // The lane worker's v4-kernel item makes the same measurement in a thread; a missing subset and a set that does not carve are outcomes.
      const entry = caseBoard('10x10-nightmare');
      const seedText = 'ig-selftest/kernel/10x10-nightmare';
      const carved = /** @type {any} */ (firstCarvedSet(r4c.e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText }));
      assert(carved.ok, `the carve of 10x10-nightmare failed: ${carved.reason}`);
      const subsets = windowSubsets(r4c.e, { set: carved.set, seedText, offsets: [1, 2, 3], perCount: 2, startCount: startCountFor(r4c.e, entry.levelId, carved.K) });
      assert(subsets.length === SUBSETS_PER_CASE, `${subsets.length} subsets of 10x10-nightmare`);
      const direct = measure(r4c, { board: carved.board, pieces: carved.set.pieces, clues: subsets[0].clues });
      const lanes = await createLanes({ variant: 'r4c', size: 1, horizonS: elapsedS() + 200 });
      try {
        const payload = { kind: 'v4-kernel', boardRows: entry.boardRows, levelId: entry.levelId, seedText, subsetIndex: 0, otherRoot: instr.tree.root };
        const out = await lanes.runAll([payload, { ...payload, subsetIndex: SUBSETS_PER_CASE }, { ...payload, boardRows: ['##', '##'] }]);
        assert(out.done, 'the lane worker did not finish its jobs');
        const { ms, ...first } = out.results[0];
        assert(typeof ms === 'number' && ms >= 0, `the item's ms ${ms}`);
        same(first, { outcome: 'ok', g: subsets[0].g, idx: subsets[0].idx, same: true, r4: direct.ins.r4 }, `the worker item: ${JSON.stringify(first)}`);
        same(out.results[1], { outcome: 'no-subset' }, 'a subset index beyond the sixth');
        same(out.results[2], { outcome: 'no-set', reason: 'no-carve' }, 'a board that does not carve');
      } finally {
        await lanes.close();
      }
    },
  },
  {
    name: 'profile: the child process and its profile file',
    async run() {
      // The real path of `profile`: the child of one case (10x10-nightmare) under `--cpu-prof --no-turbo-inlining`, one profile
      // file, the derived record. The output goes to the scratch label; the numbers are measurements, not oracles.
      assert(SOURCE_KIND === 'frozen', 'the case must run with --label frozen');
      const task = 'prof-real';
      fresh(artifactDir('selftest', task));
      const [real] = profileItems(['10x10-nightmare'], { task, sourceLabel: 'frozen 3fc65f4' });
      const outDir = profileOutDirOf(task, '10x10-nightmare');
      const item = { ...real, payload: { outDir, argv: real.payload.argv.map((/** @type {string} */ a) => (a === real.payload.outDir ? outDir : a)) } };
      assert(item.payload.argv.includes(outDir) && !item.payload.argv.includes(real.payload.outDir), 'the output folder of the argv was not moved to the scratch label');
      const out = await runProcessItems({ task, step: 'profile', label: 'selftest', horizonS: elapsedS() + 100, items: [item], reserveS: 1 });
      same(out, { exitCode: 0, done: true, progress: 1, refused: null }, `the run: ${JSON.stringify(out)}`);
      const lines = readItemLog(join(artifactDir('selftest', task, 'profile'), 'items.jsonl'));
      same(lines.map((l) => [l.type, l.item]), [['item-start', item.id], ['item-spawn', item.id], ['item-end', item.id]], 'one start, one spawn, one end');
      const end = lines[2];
      assert(end.status === 'completed' && end.result.stdout?.caseId === '10x10-nightmare' && end.result.stdout.ratings === SUBSETS_PER_CASE,
        `the end line: ${JSON.stringify(end).slice(0, 400)}`);
      const [record] = rebuildProfiles(task, 'selftest');
      assert(!('error' in record), `the record: ${JSON.stringify(record)}`);
      assert(record.item === item.id && record.file.startsWith(`${outDir}/`) && record.file.endsWith('.cpuprofile') && /^[0-9a-f]{64}$/.test(record.sha256), `the record: ${JSON.stringify(record)}`);
      assert(record.totalMs > 0 && record.deduceMs > 0 && record.totalMs >= record.deduceMs && record.fewestColumnMs <= record.deduceMs, `the times: ${JSON.stringify(record)}`);
      assert(record.share === null || (record.share >= 0 && record.share <= 1), `the share: ${record.share}`);
      process.stdout.write(`NOTE profile 10x10-nightmare: ${JSON.stringify({ ratings: end.result.stdout.ratings, ms: end.result.stdout.ms, itemMs: end.ms, ...record, file: undefined, item: undefined, sha256: undefined })}\n`);
    },
  },
  {
    name: 'width: the real worker and the dispatch',
    async run() {
      // The real path of the pool probe (locked: it rates): the width dispatch with lib/width-worker.mjs on T10a's corpus of one
      // small case, two workers, one round, in the base tree; the times are measurements, only their number and shape are checked.
      assert(SOURCE_KIND === 'frozen', 'the case must run with --label frozen');
      const base = await engine('base');
      const corpus = kernelCorpus(base.e, ['10x10-nightmare']);
      assert(corpus.length === SUBSETS_PER_CASE, `${corpus.length} corpus items`);
      const workerFile = join(IG_DIR, 'lib', 'width-worker.mjs');
      const done = await widthDispatch({ workerFile, workerData: { treeRoot: base.tree.root, items: corpus, rounds: 1 }, width: 2, cutAtS: elapsedS() + 100 });
      assert(done.status === 'completed', `the dispatch: ${JSON.stringify(done).slice(0, 400)}`);
      const result = /** @type {any} */ (done.result);
      same([result.caseId, result.width, result.rounds, result.expected, result.observed, result.ms.length], ['10x10-nightmare', 2, 1, 2 * SUBSETS_PER_CASE, 2 * SUBSETS_PER_CASE, 2 * SUBSETS_PER_CASE],
        `the result: ${JSON.stringify({ ...result, ms: result.ms.length })}`);
      assert(result.ms.every((/** @type {number} */ x) => x > 0), `a rating took no time: ${JSON.stringify(result.ms)}`);
      same({ medianMs: result.medianMs, p90Ms: result.p90Ms }, widthStats(result.ms), 'the median and the 90th percentile of the times');
      // An exception of a rating is the worker's `error` message: a clue that names no piece cannot be rated.
      const broken = corpus.map((c, i) => (i === 0 ? { ...c, clues: [{ piece: 'no-such-piece', x: 0, y: 0, turn: 0, mirrored: false }] } : c));
      const failed = await widthDispatch({ workerFile, workerData: { treeRoot: base.tree.root, items: broken, rounds: 1 }, width: 2, cutAtS: elapsedS() + 100 });
      assert(failed.status === 'error' && /** @type {any} */ (failed.result).message.startsWith('worker '), `the broken corpus: ${JSON.stringify(failed).slice(0, 400)}`);
      process.stdout.write(`NOTE width 10x10-nightmare, two workers, one round: median ${result.medianMs} ms, p90 ${result.p90Ms} ms; error path: ${/** @type {any} */ (failed.result).message}\n`);
    },
  },
  {
    name: 'p7: equality items of base against base',
    async run() {
      // The real path of the P7 equality items (locked: they deduce): the reference tree against itself on kernel inputs built by
      // `instr`, a PM4 profile with screen settings, the memory fixtures, their sequence and capacity items, and a construction error.
      assert(SOURCE_KIND === 'frozen', 'the case must run with --label frozen');
      const { equalDeclarations, runtimeItems } = await import('./p7-probe.mjs');
      const quick = await equalDeclarations('base', 'quick');
      const full = await equalDeclarations('base', 'full');
      const declared = (/** @type {any[]} */ list, /** @type {string} */ id) => {
        const item = list.find((i) => i.id === id);
        assert(item !== undefined, `no declared item ${id}`);
        return item;
      };
      const kernel = ['equal:base:kernel:10x10-nightmare:0', 'equal:base:kernel:26x26-hell-1:0']
        .map((id) => ({ ...declared(quick, id), payload: { ...declared(quick, id).payload, settings: ['canonical', 'tie1', 'work-half'] } }));
      const pm4 = full.find((i) => i.id.startsWith('equal:base:pm4:10x10-nightmare:'));
      assert(pm4 !== undefined && pm4.id.endsWith(':0'), 'no PM4 item of 10x10-nightmare at order 0');
      const memory = quick.filter((i) => i.payload.source === 'memory' || i.payload.source === 'memory-sequence' || i.payload.source === 'memory-capacity');
      assert(memory.length === 7, `${memory.length} memory items`);
      const bad = {
        id: 'equal:base:pm4:bad-clue',
        kind: 'p7-equal',
        variant: 'base',
        payload: {
          source: 'pm4',
          boardRows: pm4.payload.boardRows,
          pieces: pm4.payload.pieces,
          clues: [{ ...pm4.payload.clues[0], piece: 'no-such-piece' }],
          levelId: pm4.payload.levelId,
          settings: ['canonical', 'work-half', 'mem-ref'],
          otherTree: pm4.payload.otherTree,
        },
      };
      const items = [...kernel, pm4, ...memory, bad];
      const task = 'S24-T03a-dev';
      fresh(artifactDir('selftest', task));
      try {
        const out = await runItems({ task, step: 'equal', label: 'selftest', horizonS: elapsedS() + 285, items: runtimeItems(items) });
        same(out, { exitCode: 0, done: true, progress: items.length, refused: null }, `the run: ${JSON.stringify(out)}`);
        const ends = new Map(readItemLog(join(artifactDir('selftest', task, 'equal'), 'items.jsonl')).filter((l) => l.type === 'item-end').map((l) => [l.item, l]));
        const resultOf = (/** @type {string} */ id) => {
          const end = ends.get(id);
          assert(end !== undefined && end.status === 'completed', `${id}: ${JSON.stringify(end).slice(0, 400)}`);
          return end.result;
        };
        for (const item of items) {
          const r = resultOf(item.id);
          assert(r.outcome === 'ok' && r.same === true, `${item.id}: ${JSON.stringify(r).slice(0, 600)}`);
        }
        for (const id of ['equal:base:kernel:10x10-nightmare:0', 'equal:base:kernel:26x26-hell-1:0']) {
          const r = resultOf(id);
          same([r.compared, r.skipped, r.inapplicable], [['canonical', 'tie1', 'work-half'], [], []], `${id}: ${JSON.stringify([r.compared, r.skipped, r.inapplicable])}`);
        }
        const screens = resultOf(pm4.id).compared.filter((/** @type {string} */ s) => s.startsWith('screen:'));
        assert(screens.length >= 2, `the PM4 item compared ${screens.length} screen settings`);
        same([resultOf('equal:base:memory:mem-near-reference').refBytes, resultOf('equal:base:memory:mem-above').refBytes], [33107689, 33630537], 'the reference bytes of the near-limit fixtures');
        const fixtureStep = resultOf('equal:base:memory:mem-above').steps.find((/** @type {any} */ s) => s.setting === 'fixture');
        const tooLarge = {
          name: 'ModelError',
          code: 'model-too-large',
          message: 'deduction buffers need 33630537 bytes, the limit is 33554432',
          details: { bytes: 33630537, limit: 33554432 },
        };
        same(fixtureStep.referenceError, tooLarge, 'the reference error of mem-above');
        same(fixtureStep.candidateError, tooLarge, 'the candidate error of mem-above');
        for (const item of memory) {
          const r = resultOf(item.id);
          assert(r.steps.every((/** @type {any} */ s) => s.representation === null), `${item.id}: a step has a representation`);
        }
        same([resultOf('equal:base:memory:sequence').steps.length, resultOf('equal:base:memory:capacity').steps.length], [9, 2], 'the sequence and capacity steps');
        const broken = resultOf(bad.id);
        same([broken.compared, broken.inapplicable], [['canonical'], ['work-half', 'mem-ref']], 'the construction-error item');
        same([broken.steps[0].referenceError?.code, broken.steps[0].candidateError?.code], ['invalid-clue', 'invalid-clue'], 'the construction error on both trees');
        process.stdout.write(`NOTE p7 equality items: ${items.length} items, ms ${JSON.stringify(items.map((i) => [i.id.replace('equal:base:', ''), ends.get(i.id)?.ms]))}\n`);
      } finally {
        rmSync(artifactDir('selftest', task), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'p7: timing items of base against base',
    async run() {
      // The real path of the P7 timing items (locked: they rate): the reference tree against itself, two 10x10 Nightmare inputs of
      // rounds 0 and 1 (both orders) and a 26x26 Hell 1 input whose deduction path is capped in both trees (a timed pair, R-P24-06).
      assert(SOURCE_KIND === 'frozen', 'the case must run with --label frozen');
      const { runtimeItems, timeDeclarations } = await import('./p7-probe.mjs');
      const all = await timeDeclarations('base');
      const items = ['time:base:10x10-nightmare:0:0', 'time:base:10x10-nightmare:0:1', 'time:base:26x26-hell-1:0:0'].map((id) => {
        const item = all.find((i) => i.id === id);
        assert(item !== undefined, `no declared item ${id}`);
        return item;
      });
      const task = 'S24-T03a-dev-time';
      fresh(artifactDir('selftest', task));
      try {
        const out = await runItems({ task, step: 'time', label: 'selftest', horizonS: elapsedS() + 285, items: runtimeItems(items) });
        same(out, { exitCode: 0, done: true, progress: items.length, refused: null }, `the run: ${JSON.stringify(out)}`);
        const ends = new Map(readItemLog(join(artifactDir('selftest', task, 'time'), 'items.jsonl')).filter((l) => l.type === 'item-end').map((l) => [l.item, l]));
        const expected = ['none', 'none', 'both'];
        for (const [k, item] of items.entries()) {
          const end = ends.get(item.id);
          assert(end !== undefined && end.status === 'completed', `${item.id}: ${JSON.stringify(end).slice(0, 400)}`);
          const r = end.result;
          assert(r.outcome === 'ok' && r.same === true && r.capped === expected[k], `${item.id}: ${JSON.stringify(r).slice(0, 600)}`);
          assert(Number.isFinite(r.refMs) && r.refMs > 0 && Number.isFinite(r.candMs) && r.candMs > 0, `${item.id}: the times ${r.refMs} and ${r.candMs}`);
        }
        process.stdout.write(`NOTE p7 timing items: ${JSON.stringify(items.map((i) => [i.id.replace('time:base:', ''), ends.get(i.id)?.result.refMs, ends.get(i.id)?.result.candMs, ends.get(i.id)?.result.capped]))}\n`);
      } finally {
        rmSync(artifactDir('selftest', task), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'p7: C1 memory rule (p7-c1)',
    async run() {
      // The memory rule of the P7 C1 lists (locked: the memory items deduce): the decision function on its boundaries, then the
      // seven memory items of the quick tier on `p7-c1` against `base`, whose steps must show the representation the manifest expects.
      assert(SOURCE_KIND === 'frozen', 'the case must run with --label frozen');
      const { igListArrays } = await treeModule(await engine('p7-c1'), 'deduce');
      const fake = (/** @type {number} */ b, /** @type {number} */ cap) => ({ bytes: () => b, capacityBytes: cap });
      const lengths = (/** @type {any} */ a) => (a === null ? null : [a.next.length, a.prev.length, a.pos.length]);
      same(lengths(igListArrays(1000, Infinity, fake(5000, 5499), 35, 10)), null, 'the retained bytes and the lists exceed the capacity by one');
      same(lengths(igListArrays(1000, Infinity, fake(5000, 5500), 35, 10)), [45, 45, 35], 'the retained bytes and the lists fill the capacity');
      same(lengths(igListArrays(1000, 1499, fake(0, Infinity), 35, 10)), null, 'the slots and the lists exceed the memory limit by one');
      same(lengths(igListArrays(1000, 1500, fake(0, Infinity), 35, 10)), [45, 45, 35], 'the slots and the lists fill the memory limit');
      same(igListArrays(0, Infinity, fake(0, Infinity), 2 ** 53, 0), null, 'a failed allocation gives no lists');
      const { equalDeclarations, memoryManifest, runtimeItems } = await import('./p7-probe.mjs');
      const quick = await equalDeclarations('p7-c1', 'quick');
      const memory = quick.filter((i) => ['memory', 'memory-sequence', 'memory-capacity'].includes(i.payload.source));
      assert(memory.length === 7, `${memory.length} memory items`);
      const manifest = memoryManifest();
      const task = 'S24-T03d-dev';
      fresh(artifactDir('selftest', task));
      try {
        const out = await runItems({ task, step: 'equal', label: 'selftest', horizonS: elapsedS() + 285, items: runtimeItems(memory) });
        same(out, { exitCode: 0, done: true, progress: memory.length, refused: null }, `the run: ${JSON.stringify(out)}`);
        const ends = new Map(readItemLog(join(artifactDir('selftest', task, 'equal'), 'items.jsonl')).filter((l) => l.type === 'item-end').map((l) => [l.item, l]));
        const resultOf = (/** @type {string} */ id) => {
          const end = ends.get(id);
          assert(end !== undefined && end.status === 'completed', `${id}: ${JSON.stringify(end).slice(0, 400)}`);
          assert(end.result.outcome === 'ok' && end.result.same === true, `${id}: ${JSON.stringify(end.result).slice(0, 600)}`);
          return end.result;
        };
        const expectedFixture = {
          'mem-small': ['lists', 48960],
          'mem-mid': ['lists', 1218816],
          'mem-near-lists': ['lists', 80940],
          'mem-near-reference': ['reference', 0],
          'mem-above': [null, null],
        };
        for (const [fixture, [representation, listBytes]] of Object.entries(expectedFixture)) {
          const step = resultOf(`equal:p7-c1:memory:${fixture}`).steps.find((/** @type {any} */ s) => s.setting === 'fixture');
          assert(step !== undefined, `${fixture}: no fixture step`);
          same([step.representation, step.listBytes], [representation, listBytes], `${fixture}: ${JSON.stringify([step.representation, step.listBytes])}`);
          if (fixture === 'mem-above') {
            assert(step.referenceError?.code === 'model-too-large', `${fixture}: the reference error ${JSON.stringify(step.referenceError)}`);
            same(step.candidateError, step.referenceError, `${fixture}: the candidate error`);
          }
        }
        const sequence = resultOf('equal:p7-c1:memory:sequence').steps;
        const capacity = resultOf('equal:p7-c1:memory:capacity').steps;
        same(sequence.map((/** @type {any} */ s) => s.representation), ['lists', 'lists', 'lists', 'reference', 'lists', 'reference', 'lists', null, 'lists'], 'the sequence representations');
        same(capacity.map((/** @type {any} */ s) => s.representation), ['lists', 'reference'], 'the capacity representations');
        const refBytesOf = (/** @type {string} */ fixture) => manifest.fixtures.find((f) => f.id === fixture)?.refBytes;
        /** @type {[string, any, number | undefined][]} */
        const checked = [];
        for (const fixture of ['mem-small', 'mem-mid', 'mem-near-lists']) {
          const result = resultOf(`equal:p7-c1:memory:${fixture}`);
          checked.push([fixture, result.steps.find((/** @type {any} */ s) => s.setting === 'fixture'), result.refBytes]);
        }
        for (const [i, step] of sequence.entries()) {
          checked.push([`seq-${i}`, step, refBytesOf(manifest.sequence[i].fixture)]);
        }
        for (const [i, step] of capacity.entries()) {
          checked.push([`cap-${i}`, step, refBytesOf(manifest.capacity[i].fixture)]);
        }
        let lists = 0;
        for (const [label, step, refBytes] of checked) {
          if (step.representation !== 'lists') {
            continue;
          }
          lists += 1;
          assert(typeof refBytes === 'number' && refBytes + step.listBytes <= step.memoryBytes, `${label}: ${refBytes} + ${step.listBytes} > ${step.memoryBytes}`);
          assert(step.wsBytes + step.listBytes <= step.capacityBytes, `${label}: ${step.wsBytes} + ${step.listBytes} > ${step.capacityBytes}`);
        }
        assert(lists >= 8, `${lists} list steps checked`);
        process.stdout.write(`NOTE p7-c1 memory rule: ${lists} list steps within both budgets; sequence ${JSON.stringify(sequence.map((/** @type {any} */ s) => s.representation))}\n`);
      } finally {
        rmSync(artifactDir('selftest', task), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'fz: budget by uniqueness mode (rule)',
    async run() {
      const { igModeBudget } = await treeModule(await engine('p5-mode'), 'clues');
      const T = { id: 'budget-test', any: { nightmare: 10, 'hell-1': 40 }, require: { nightmare: 32, 'hell-1': 0 } };
      const c = (/** @type {string} */ u, /** @type {string} */ id) => ({ uniqueness: u, target: { id, min: 53, max: 77 } });
      same(igModeBudget(c('any', 'nightmare'), T).igBudget, 10, 'any, nightmare');
      same(igModeBudget(c('any', 'hell-1'), T).igBudget, 40, 'any, hell-1');
      same(igModeBudget(c('require', 'nightmare'), T).igBudget, 32, 'require, nightmare');
      same(igModeBudget(c('require', 'hell-1'), T).igBudget, Infinity, 'require, hell-1 (0 is no budget)');
      same(igModeBudget(c('any', 'st-band'), T).igBudget, Infinity, 'any, an absent level');
      const x = { ...c('any', 'nightmare'), igBudget: 5 };
      assert(igModeBudget(x, T) === x, 'a seam igBudget must win and leave the context itself');
      const y = c('any', 'nightmare');
      assert(igModeBudget(y, null) === y, 'a null table must leave the context');
      assert(igModeBudget(y, { default: 2000000000 }) === y, 'a level-keyed table must leave the context');
      assert(igModeBudget(y) === y, 'the p5-mode tree has no callBudget: the context stays');
      assert(igModeBudget(y, T).igBudget === 10 && !('igBudget' in y), 'the context must not be mutated');
    },
  },
  {
    name: 'fz: p5-mode is inert without its parameter',
    async run() {
      const spec = { prior: null, screen: () => 'cap', canon: (/** @type {number} */ k) => synthetic(100 - 10 * k) };
      const limit = 1520000000;
      const budgeted = [];
      const free = [];
      for (const variant of ['v4', 'p5-mode']) {
        budgeted.push(await v4Call('fz-inert', { ...spec, variant, extra: { igBudget: limit } }));
        free.push(await v4Call('fz-inert', { ...spec, variant }));
      }
      for (const [i, r] of budgeted.entries()) {
        const what = ['v4', 'p5-mode'][i];
        same(r.counts('locate'), [7, 13], `${what} budgeted: locate counts ${JSON.stringify(r.counts('locate'))}`);
        same(r.end.locate.budgetStop, { limit, spent: limit, overshoot: 0 }, `${what} budgeted: budgetStop ${JSON.stringify(r.end.locate.budgetStop)}`);
        same(r.result, { ok: false, reason: 'not-in-band' }, `${what} budgeted: result ${JSON.stringify(r.result)}`);
      }
      same(budgeted[1].result, budgeted[0].result, 'the budgeted results of v4 and p5-mode differ');
      for (const [i, r] of free.entries()) {
        const what = ['v4', 'p5-mode'][i];
        same(r.counts('rescue'), [13, 7], `${what} unbudgeted: rescue counts ${JSON.stringify(r.counts('rescue'))}`);
        assert(r.end.locate.budgetStop === undefined, `${what} unbudgeted: a budgetStop was journaled`);
      }
      same(free[1].result, free[0].result, 'the unbudgeted results of v4 and p5-mode differ');
    },
  },
  {
    name: 'fz: per-set prior levels (rule)',
    async run() {
      const tree = await engine('ps-levels');
      const { igPerSetLevel } = await browserModule(tree, 'generation-client');
      same(igPerSetLevel('hell-1', ['hell-1']), true, 'a listed level');
      same(igPerSetLevel('nightmare', ['hell-1']), false, 'an unlisted level');
      same(igPerSetLevel('hell-1', []), false, 'an empty list');
      same(igPerSetLevel('hell-1', null), true, 'a null list');
      same(igPerSetLevel('nightmare', 'hell-1'), false, 'a list that is not an array');
      same(igPerSetLevel('nightmare'), true, 'the ps-levels tree has no perSetLevels');
      const text = readFileSync(join(tree.e.root, 'core', 'browser', 'generation-client.js'), 'utf8');
      const guarded = 'const igPrior = igPerSetLevel(levelId) ? igPriorOf(request.calibration, levelId, uniqueness) : {};';
      same(text.split(guarded).length - 1, 1, 'the guarded igPrior line');
      same(text.split('const igPrior = igPriorOf(').length - 1, 0, 'the unguarded igPrior line');
    },
  },
  {
    name: 'live: the pool starts a request at its origin',
    async run() {
      const { createPool, PoolAbortError } = await browserModule(await engine('live'), 'worker-pool');
      const recipe = LIVE_RECIPE();
      const h = harness(createPool, { size: 1 });
      /** @type {any[]} */
      const timeouts = [];
      const onTimeout = (/** @type {any} */ info) => timeouts.push(info);
      const task = (/** @type {number} */ requestId, /** @type {string} */ revision) => ({
        requestId, revision, kind: 'setAttempt',
        payload: { boardRows: recipe.boardRows, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', attempt: 0 },
      });
      const stopsAfter = async (/** @type {string} */ what, /** @type {number} */ requestId, /** @type {number} */ ms) => {
        const t = track(h.pool.run(task(requestId, `r${requestId}`)));
        await settle();
        h.clock.advance(ms - 1);
        await settle();
        assert(t.state === 'pending', `${what}: the task ended ${ms - 1} ms after the dispatch (${t.state})`);
        h.clock.advance(1);
        await settle();
        assert(t.state === 'rejected' && t.error instanceof PoolAbortError && t.error.reason === 'deadline',
          `${what}: the task is ${t.state} (${t.error?.reason}) ${ms} ms after the dispatch`);
      };
      h.pool.beginRequest({ requestId: 1, revision: 'r1', onTimeout, igOrigin: h.clock.now() - 100000 });
      await stopsAfter('an origin 100 s back', 1, 15000);
      h.pool.beginRequest({ requestId: 2, revision: 'r2', onTimeout });
      await stopsAfter('no origin', 2, 115000);
      h.pool.beginRequest({ requestId: 3, revision: 'r3', onTimeout, igOrigin: h.clock.now() + 5000 });
      await stopsAfter('a later origin', 3, 115000);
      h.pool.beginRequest({ requestId: 4, revision: 'r4', onTimeout, igOrigin: h.clock.now() - 200000 });
      const late = track(h.pool.run(task(4, 'r4')));
      await settle();
      assert(late.state === 'rejected' && late.error instanceof PoolAbortError && late.error.reason === 'deadline',
        `an origin 200 s back: the first dispatch is ${late.state} (${late.error?.reason})`);
      same(timeouts.map((t) => t.elapsedMs), [115000, 115000, 115000, 200000], 'the elapsed times the pool reported');
      h.pool.close();
    },
  },
  {
    name: 'live: igLiveOf rule',
    async run() {
      const { igLiveOf } = await browserModule(await engine('live'), 'generation-client');
      const clock = { now: () => 5000 };
      const T = { id: 'deadline-test', levels: ['hard'], reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000 };
      same(igLiveOf({ igOrigin: 1000 }, 'hard', clock, T), { origin: 1000, setCutAt: 47000 }, 'a listed level with an origin');
      same(igLiveOf({ igOrigin: 5000 }, 'hard', clock, T), { origin: 5000, setCutAt: 51000 }, 'an origin equal to now');
      for (const [what, input, levelId, live] of /** @type {[string, any, string, any][]} */ ([
        ['an unlisted level', { igOrigin: 1000 }, 'easy', T],
        ['no origin', {}, 'hard', T],
        ['a NaN origin', { igOrigin: Number.NaN }, 'hard', T],
        ['a later origin', { igOrigin: 5001 }, 'hard', T],
        ['no set-stage cap', { igOrigin: 1000 }, 'hard', { ...T, setStageCapMs: undefined }],
        ['a null parameter', { igOrigin: 1000 }, 'hard', null],
      ])) {
        assert(igLiveOf(input, levelId, clock, live) === null, `${what}: ${JSON.stringify(igLiveOf(input, levelId, clock, live))}`);
      }
      assert(igLiveOf({ igOrigin: 1000 }, 'hard', clock) === null, 'the live tree (liveDeadline null) gave a deadline');
    },
  },
  {
    name: 'live: inert without its parameter',
    async run() {
      const tree = await engine('live');
      const { createPool } = await browserModule(tree, 'worker-pool');
      const { createGenerationClient } = await browserModule(tree, 'generation-client');
      const recipe = LIVE_RECIPE();
      const h = harness(createPool, { size: 4 });
      const client = createGenerationClient(h.pool, { clock: h.clock, createdAt: () => '2026-01-01T00:00:00.000Z' });
      const origin = h.clock.now() - 100000;
      const r = track(client.generateSet({
        igOrigin: origin, boardRows: recipe.boardRows, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', maxActive: 676,
      }));
      await settle();
      h.clock.advance(46000);
      await settle();
      assert(r.state === 'pending', `the set stage ended at 46 s without a live deadline: ${JSON.stringify(r.value)}`);
      h.clock.advance(68999);
      await settle();
      assert(r.state === 'pending', 'the set stage ended before 115 s after its own start');
      h.clock.advance(1);
      await settle();
      same([r.value?.status, r.value?.reason], ['failed', 'time-limit'], 'the set stage at 115 s after its own start');
      h.pool.close();
    },
  },
  hostBoundCase('live-test'),
  {
    name: 'live: the host bound is inert without its parameter',
    async run() {
      const plain = await hostRow('live', 'batch');
      plain.clock.advance(178999);
      await settle();
      assert(plain.result.state === 'pending', `live: the row ended without a bound (${plain.result.value?.partialReason})`);
      plain.cancel();
      await settle();
      await settle();
      same([plain.result.state, plain.result.value?.partialReason], ['resolved', 'cancelled'], 'live: the row after its cancel');
    },
  },
        ...liveCases('live-test'),
  {
    name: 'fr: the four frozen variants and their differences',
    async run() {
      const ids = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'];
      /** @type {Record<string, any>} */
      const trees = {};
      for (const id of ids) {
        trees[id] = await ensureTree(id);
      }
      same(trees['fr-frozen'].chain, ['base', 'instr', 'log', 'v4', 'link', 'v4-link', 'fr-base', 'v4-ps', 'v4-p5', 'live', 'p5-mode', 'ps-levels', 'fr-frozen'], 'the chain of fr-frozen');
      const p = trees['fr-frozen'].params;
      same([p.priorTable, p.screenTable, p.rerate, p.rerateMax, p.c4, p.setAttemptsBound, p.perSetLevels, p.perSetPrior],
        ['prior-s3-v1', 'screen-s3-v1', 'rescue', 4, false, 4, ['hell-1'], true], 'fr-frozen: the scalar parameters');
      same(p.screenClasses, { 'hell-1': null, 'n-small': null, 'n-mid': 190000000, 'n-large': 190000000 }, 'fr-frozen: the classes');
      same(p.callBudget, { id: 'budget-s3-v1', any: { nightmare: 10000000000, 'hell-1': 40000000000 }, require: { nightmare: 32000000000, 'hell-1': 40000000000 } }, 'fr-frozen: the budget');
      same(p.liveDeadline, { id: 'deadline-s3-v1', levels: ['nightmare', 'hell-1'], reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000 }, 'fr-frozen: the deadline');
      same([Object.keys(p.prior).length, p.prior['hell-1@400'].share, p.prior['nightmare@196'].caseId], [27, 0.368421, '14x14-nightmare'], 'fr-frozen: the prior table prior-s3-v1');
      const differs = (/** @type {string} */ a, /** @type {string} */ b) => {
        const A = trees[a].params;
        const B = trees[b].params;
        return [...new Set([...Object.keys(A), ...Object.keys(B)])].filter((k) => k !== 'variant' && !isDeepStrictEqual(A[k], B[k])).sort();
      };
      same(differs('fr-frozen', 'fr-frozen-uncapped'), ['callBudget', 'liveDeadline', 'setAttemptsBound'], 'fr-frozen against its comparator');
      same(differs('fr-frozen-none', 'fr-frozen-none-uncapped'), ['callBudget', 'liveDeadline', 'setAttemptsBound'], 'fr-frozen-none against its comparator');
      same(differs('fr-frozen', 'fr-frozen-none'), ['screenClasses', 'screenTable'], 'the two screen arms');
      for (const id of ['fr-frozen-uncapped', 'fr-frozen-none-uncapped']) {
        same([trees[id].params.callBudget, trees[id].params.setAttemptsBound, trees[id].params.liveDeadline], [null, null, null], `${id} is uncapped`);
      }
      /** @type {string[]} */
      const notes = [];
      for (const id of ids) {
        const { ALGO_ID } = await import(pathToFileURL(join(trees[id].root, 'core', 'engine', 'version.js')).href);
        assert(ALGO_ID === `gen-v4-proto:${id}` && ALGO_ID.length <= 36, `${id}: algo ${ALGO_ID}`);
        notes.push(`${id} ${trees[id].treeId} ${sha256(JSON.stringify(trees[id].params))}`);
      }
      process.stdout.write(`NOTE fr frozen trees (tree id, parameter hash): ${notes.join('; ')}\n`);
    },
  },
  {
    name: 'fz: the frozen budget by mode and level (real calls, synthetic ratings)',
    async run() {
      const spec = { prior: null, screen: () => synthetic(30, { work: 50000000000 }) };
      for (const [variant, uniqueness, id, limit] of /** @type {[string, 'any' | 'require', string, number | null][]} */ ([
        ['fr-frozen', 'any', 'nightmare', 10000000000],
        ['fr-frozen', 'require', 'nightmare', 32000000000],
        ['fr-frozen', 'any', 'hell-1', 40000000000],
        ['fr-frozen', 'require', 'hell-1', 40000000000],
        ['fr-frozen-none', 'require', 'nightmare', 32000000000],
        ['fr-frozen-uncapped', 'any', 'nightmare', null],
        ['fr-frozen-none-uncapped', 'require', 'hell-1', null],
      ])) {
        const r = await v4Call('fz-budget', { ...spec, variant, uniqueness, extra: { target: { ...BAND, id } } });
        const stop = r.end?.locate?.budgetStop;
        if (limit === null) {
          assert(stop === undefined, `${variant} ${uniqueness} ${id}: a budget stop ${JSON.stringify(stop)}`);
        } else {
          same(stop, { limit, spent: 50000000000, overshoot: 50000000000 - limit }, `${variant} ${uniqueness} ${id}: ${JSON.stringify(stop)}`);
        }
      }
    },
  },
  {
    name: 'fz: a require budget end returns no unfinished final on fr-frozen',
    async run() {
      const name = 'fz-endmodes';
      const spec = { ...BEGIN_CALL_2, variant: 'fr-frozen' };
      const U = await v4Call(name, { ...spec, extra: { charge: true, igChargeKinds: [] } });
      const f = /** @type {string[]} */ (U.kinds).indexOf('count');
      assert(f > 0, `the first count of the unbudgeted call is at index ${f}`);
      const B = prefix(U.chargeLog)[f];
      /** @type {any[]} */
      const events = [];
      const A = await v4Call(name, { ...spec, extra: { igBudget: B } });
      const Bm = await v4Call(name, { ...spec, extra: { igBudget: B, charge: true, igChargeKinds: [] } });
      const C = await v4Call(name, { ...spec, extra: { igBudget: B, charge: true, igChargeKinds: [], record: (/** @type {any} */ ev) => events.push(ev) } });
      same(A.result, { ok: false, reason: 'not-in-band' }, `no observer: ${JSON.stringify(A.result)}`);
      same(Bm.result, A.result, `charge only: ${JSON.stringify(Bm.result)}`);
      same(C.result, A.result, `charge and record: ${JSON.stringify(C.result)}`);
      same(Bm.chargeLog, U.chargeLog.slice(0, f), 'charge only: the charge log is not the units before the first count');
      assert(!events.some((ev) => ev.kind === 'selected' || ev.kind === 'repair'), 'a selected or repair event after the budget end');
    },
  },
  {
    name: 'fz: the per-set prior on Hell 1 only (payloads)',
    async run() {
      const tree = await engine('fr-frozen');
      const { createPool } = await browserModule(tree, 'worker-pool');
      const { createGenerationClient } = await browserModule(tree, 'generation-client');
      const { set, calibration } = await setFixture('fr-frozen');
      const payloads = async (/** @type {string} */ levelId) => {
        const h = harness(createPool, { size: 4 });
        const client = createGenerationClient(h.pool, { clock: h.clock, createdAt: () => '2026-01-01T00:00:00.000Z' });
        const cal = { ...calibration, rating: { ...calibration.rating, level: levelId }, igWindow: { wc: 5 } };
        const r = track(client.generateBatch({
          set, rotation: 0, targetLevelId: levelId, quantity: 10, setSeed: 'fixture-set-0', batchIndex: 1, uniqueness: 'any',
          seenLayouts: [], seenClues: [], calibration: cal,
        }));
        await settle();
        const out = h.tasks.filter((t) => t.kind === 'puzzleCandidate').map((t) => t.payload);
        client.cancel();
        await settle();
        await settle();
        assert(r.state === 'resolved', `${levelId}: the batch is ${r.state} after its cancel`);
        h.pool.close();
        return out;
      };
      const hell = await payloads('hell-1');
      const nightmare = await payloads('nightmare');
      assert(hell.length > 0 && hell.every((p) => p.igPrior === 5), `hell-1 payloads: ${JSON.stringify(hell.map((p) => p.igPrior))}`);
      assert(nightmare.length > 0 && nightmare.every((p) => !('igPrior' in p)), `nightmare payloads: ${JSON.stringify(nightmare.map((p) => p.igPrior))}`);
    },
  },
  {
    name: 'fz: the no-window bound through a real worker',
    async run() {
      const tree = await engine('fr-frozen-nowindow-test');
      const { createPool } = await browserModule(tree, 'worker-pool');
      const { createGenerationClient } = await browserModule(tree, 'generation-client');
      const { nodeWorkerFactory } = await import(pathToFileURL(join(tree.tree.root, 'tools', 'node-worker.mjs')).href);
      const pool = createPool({ size: 4, workerFactory: nodeWorkerFactory() });
      try {
        const client = createGenerationClient(pool, { createdAt: () => '2026-01-01T00:00:00.000Z', maxSetAttempts: 4 });
        const r = await client.generateSet({
          boardRows: Array.from({ length: 10 }, () => '#'.repeat(10)), rotation: 0, levelId: 'nightmare',
          seedText: 'ig-selftest/nowindow', uniqueness: 'any', maxActive: 676,
        });
        same([r.status, r.reason, r.failures], ['failed', 'no-window-below', { 'no-window-below': 4 }], `the request: ${JSON.stringify(r)}`);
      } finally {
        pool.close();
      }
    },
  },
  {
    name: 'fz: the live deadline on the frozen trees',
    async run() {
      const clock = { now: () => 5000 };
      for (const [variant, listed] of /** @type {[string, boolean][]} */ ([
        ['fr-frozen', true], ['fr-frozen-none', true], ['fr-frozen-uncapped', false], ['fr-frozen-none-uncapped', false],
      ])) {
        const { igLiveOf } = await browserModule(await engine(variant), 'generation-client');
        for (const levelId of ['nightmare', 'hell-1']) {
          same(igLiveOf({ igOrigin: 1000 }, levelId, clock), listed ? { origin: 1000, setCutAt: 47000 } : null, `${variant} ${levelId}`);
        }
        assert(igLiveOf({ igOrigin: 1000 }, 'hard', clock) === null, `${variant}: the legacy level hard has a deadline`);
      }
    },
  },
  {
    name: 'fz: W reaches real calls in every frozen class',
    async run() {
      const CELLS = ['10x10-nightmare', '14x14-nightmare', '15x20-nightmare', '26x26-nightmare', '26x26-hell-1'];
      for (const variant of ['fr-frozen', 'fr-frozen-none']) {
        const { e, ws } = await engine(variant);
        const D = e.policy.DEDUCE.work;
        const expected = variant === 'fr-frozen' ? [D, 190000000, 190000000, 190000000, D] : [D, D, D, D, D];
        /** @type {number[]} */
        const seen = [];
        for (const cell of CELLS) {
          const { boardRows, levelId } = caseBoard(cell);
          const seedText = `landscape/${cell}/0`;
          const carved = firstCarvedSet(e, { boardRows, levelId, seedText });
          assert(carved.ok, `${variant} ${cell}: no carved input (${carved.ok ? '' : carved.reason}): a failed fixture`);
          const dir = fresh(join(SELFTEST_DIR, 'logs', `fz-w-${variant}-${cell}`));
          process.env.IG_LOG_DIR = dir;
          process.env.IG_ROW = `selftest~fz-w-${cell}`;
          try {
            e.clues.selectClues({
              board: carved.board, pieces: carved.set.pieces, layout: carved.set.witness, target: e.levels.level(levelId),
              rng: e.rng.createRng(e.rng.normalizeSeedText(seedText), 'selftest/fz-w'), uniqueness: 'any',
              excludeClueKeys: new Set(), ws, igScreen: () => synthetic(30), igCanonical: () => synthetic(30), igPrior: null, igStage: 'set',
            });
          } finally {
            delete process.env.IG_LOG_DIR;
            delete process.env.IG_ROW;
          }
          const starts = readJournal(dir).filter((l) => l.t === 'start');
          assert(starts.length === 1, `${variant} ${cell}: ${starts.length} start lines, expected one`);
          same(starts[0].level, levelId, `${variant} ${cell}: the call's level`);
          seen.push(starts[0].W);
        }
        same(seen, expected, `${variant}: W of n-small, n-mid, n-upper, n-large and hell-1`);
      }
    },
  },
  ...liveCases('fr-frozen-live-test'),
  hostBoundCase('fr-frozen-live-test'),
  ...liveCases('fr-frozen-none-live-test'),
  hostBoundCase('fr-frozen-none-live-test'),
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
  const { args, on } = parseArgs(argv, { values: ['label', 'source-label', 'horizon-s', 'only', 'task'], switches: ['proto', 'p6', 'frozen', 'v4', 'items', 'list'] });
  const label = args.label ?? 'selftest';
  const task = args.task ?? (on.has('items') ? 'V4-T04a' : on.has('v4') ? 'V4-T02a' : on.has('frozen') ? 'V4-T01a' : on.has('p6') ? 'IGP-04' : on.has('proto') ? 'IGP-01' : 'IGP-00');
  const only = args.only === undefined ? null : args.only.split(',').map(Number);
  const selected = on.has('items') ? itemCases : on.has('v4') ? v4Cases : on.has('frozen') ? frozenCases
    : [...cases, ...(on.has('proto') || on.has('p6') ? protoCases : []), ...(on.has('p6') ? p6Cases : [])];
  if (on.has('list')) {
    for (const [i, c] of selected.entries()) {
      process.stdout.write(`${i + 1} ${c.name}\n`);
    }
    return 0;
  }
  const reserved = reservedTaskProblem(label, task, label === 'frozen' && existsSync(artifactDir(label, task, 'self-test', 'state.json')), historical);
  if (reserved !== null) {
    process.stderr.write(`${reserved}\n`);
    return 3;
  }
  horizonS = Number(args['horizon-s'] ?? 285);
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();
  /** @type {{ name: string, pass: boolean, reason: string | null, ms: number }[]} */
  const results = [];
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
  // The identity of this run (stages 2 to 4 pack T09a, R13): the producer, the source, the group, the cases run and the
  // trees they loaded, at execution time; a separate file, so that historical states keep their format.
  writeJson(join(artifactDir(label, task, 'self-test'), 'identity.json'), {
    format: 'ig-selftest-identity', version: 1, task, label,
    group: on.has('items') ? 'items' : on.has('v4') ? 'v4' : on.has('frozen') ? 'frozen' : 'default',
    selected: results.map((r) => r.name),
    harnessHash: harnessInfo().harnessHash,
    frozenCommit: label === 'frozen' ? FROZEN_COMMIT : null,
    sourceDigest: label === 'frozen' ? await sourceDigest() : null,
    trees: Object.fromEntries(Object.keys(engines).sort().map((variant) => [variant, {
      treeId: engines[variant].tree.treeId,
      copyDigest: engines[variant].tree.copyDigest,
      paramsHash: sha256(JSON.stringify(engines[variant].tree.params ?? null)),
    }])),
    startedAt, endedAt: new Date().toISOString(),
  });
  process.stdout.write(`self-test: ${results.length - failures} passed, ${failures} failed (${seconds} s)\n`);
  return failures === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
  setTimeout(() => process.exit(process.exitCode ?? 0), 10000).unref();
}
