// @ts-check
// Self-test of the harness (IGP-00 §10). Run under the lock wrapper by run-task.ps1; it carves and rates only small
// cases (about 60 s). Each case prints `PASS <name>` or `FAIL <name>: <reason>`; the state file records the results
// and the script exits 1 on any failure.
//   node tools\ig-proto\self-test.mjs --label <L> --source-label <SL> --horizon-s <H> [--only 1,3] [--proto] [--task <T>]
// `--proto` (IGP-01) adds the prototype's cases after IGP-00's nine; its state goes to <T>/self-test/state.json
// (default IGP-01 with --proto, else IGP-00).
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { Worker } from 'node:worker_threads';

import { SOURCE_FILES } from '../bench/report.js';
import { checkText } from '../check-conventions.mjs';
import { decide, readInvocations } from './lib/budget.mjs';
import { rateAttempt, recordedCall, screenRating, startCountFor, windowSubsets } from './lib/calls.mjs';
import { loadEngine } from './lib/engine.mjs';
import { createLanes } from './lib/lanes.mjs';
import { artifactDir, elapsedS, IG_DIR, parseArgs, rel, ROOT } from './lib/paths.mjs';
import { worktreeDigest, writeJson, writeJsonl, writeText } from './lib/records.mjs';
import { caseBoard, carveSet, firstCarvedSet } from './lib/sets.mjs';
import { buildTree, ensureTree, listVariants, planTree } from './lib/tree.mjs';

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

/** @param {string} text @returns {string} The text without the worktree's absolute root (records refuse it). */
function scrub(text) {
  const root = ROOT.replace(/[\\/]+$/, '');
  return text.split(root).join('.').split(root.replaceAll('\\', '/')).join('.').split(root.replaceAll('\\', '\\\\')).join('.');
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args, on } = parseArgs(argv, { values: ['label', 'source-label', 'horizon-s', 'only', 'task'], switches: ['proto'] });
  const label = args.label ?? 'selftest';
  const task = args.task ?? (on.has('proto') ? 'IGP-01' : 'IGP-00');
  const only = args.only === undefined ? null : args.only.split(',').map(Number);
  horizonS = Number(args['horizon-s'] ?? 285);
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();
  /** @type {{ name: string, pass: boolean, reason: string | null, ms: number }[]} */
  const results = [];
  for (const [i, c] of [...cases, ...(on.has('proto') ? protoCases : [])].entries()) {
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
    appendCostMs: memo.appendCostMs ?? null, protoNotes: memo.protoNotes ?? null,
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
