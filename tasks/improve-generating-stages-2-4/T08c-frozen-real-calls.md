# T08c: The frozen family's real-call and live cases on the frozen trees

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.1 (per-set prior on Hell 1 only; P5 by mode), §4.4 (Tests: "A real-worker reason-transport case for the bound in addition to T07b's scripted pools (N-V4-16 has not fired in a real run); a `require` call stopped by its budget returns no unfinished final; equal results across observer modes"), §4.5 (Tests "scripted pools, both bounded twins"), §6 T3, §8.2 T08; N-V4-16, N-V4-21; this pack's D-P24-01 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T08b |
| Depends on | T08b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min of benchmark (two locked verifications of at most five minutes each) |

## Goal

T06b and T07a-T07c proved each mechanism on its own small variant. This task proves them in the composed frozen trees:
the budget by mode and level with the frozen numbers, the `require` policy at a budget end, the per-set prior on Hell 1
only, the bound's reason crossing a real worker thread, the live deadline's levels, and T07c's scripted live cases on
both bounded twins.

## Authority and fixed points

- The budget stop is journaled as `end.locate.budgetStop = { limit, spent, overshoot }` (the existing case `p5: call
  budget stops deterministically`); the check `spent >= budget` comes before every rating and every count
  (`ig-select-v4.js:422-426`). A synthetic rating of work 5e10 below the band makes the call need a second operation, so
  the stop comes at `spent` 5e10 whatever the budget at most 5e10 is.
- `require` returns only an already finished final at a budget end (`ig-select-v4.js:1303-1316`); the case below runs
  V4-T07a's scenario `BEGIN_CALL_2` (`self-test.mjs:8821`) on `fr-frozen`.
- The per-set prior's payload field is `igPrior` (`v4-ps` `ps-6`); `ps-levels` (`fz-3`) keeps it to `perSetLevels`.
- The real worker is the tree's `tools/node-worker.mjs` (`nodeWorkerFactory`), as the bench's Node host uses it; the
  test-only edit of `fr-frozen-nowindow-test` makes the set stage's calibration call rate every probe at the synthetic
  score 30, below every gen-v4 band, so that the v4 search ends `below-to-one` and `generate.js` (`p5-1`) returns the
  reason `no-window-below` from the worker. `maxSetAttempts: 4` bounds the request if the bound did not fire.
- Test-only variants (`fr-frozen-live-test`, `fr-frozen-none-live-test`, `fr-frozen-nowindow-test`) are never an arm, a
  plan step or a binding's `current` id; the live test variants list the fixture level `hard` beside `nightmare` and
  `hell-1` and include `w8` (eight workers for the width cases).
- The three manifests were checked in memory with the frozen chain (`bt-variants.mjs --draft`: 91, 91 and 92 edits).
- **`W` on real calls** (plan §6 T3; SA-Astra's review R11): T08b's pure check of the 19 comparator cells stays; this
  task adds real calls, one per verdict class, through the tree's exported `clues.selectClues` (which reaches
  `selectCluesV4`, whose `W` is `ctx.igW ?? classW(IG.screenClasses, ...)`, `ig-select-v4.js:290-294` of the trees) and
  reads `W` from the call's journal `start` line (`ig-log.js`: `W: call.W`). The five classes are `10x10-nightmare`
  (`n-small`), `14x14-nightmare` (`n-mid`), `15x20-nightmare` (`n-upper`, the runtime `n-mid`), `26x26-nightmare`
  (`n-large`) and `26x26-hell-1` (`hell-1`); a null class gives `DEDUCE.work` (`classW`).
- **Both bounded twins** (SA-Astra's review R10): T07c's factory (six cases) and T07b's `hostBoundCase` run on
  `fr-frozen-live-test` and `fr-frozen-none-live-test`; their fourteen names are part of `LIVE_CASES` (T09a).

## Scope

- Create: `tools/ig-proto/variants/fr-frozen-live-test.json`, `fr-frozen-none-live-test.json`,
  `fr-frozen-nowindow-test.json`.
- Change: `tools/ig-proto/self-test.mjs`: six cases and `...liveCases('fr-frozen-live-test'),
  hostBoundCase('fr-frozen-live-test'), ...liveCases('fr-frozen-none-live-test'), hostBoundCase('fr-frozen-none-live-test'),`
  appended to `v4Cases`.
- Change: `tools/ig-proto/README.md`: the subsection `### The four frozen variants (T08a)` gains the test variants and
  the cases.
- Guards: G1, G2, G3 (the five files).

## Steps

1. Create the three files exactly:

   `tools/ig-proto/variants/fr-frozen-live-test.json`:

   ```json
   {
     "id": "fr-frozen-live-test",
     "extends": ["fr-frozen", "w8"],
     "description": "Test only (stages 2 to 4 pack T08c): fr-frozen with the live deadline also on the fixture level 'hard' and the eight-worker pool limit of w8, for the live scripted cases; never an arm, a plan step or a binding's current id.",
     "edits": [],
     "files": [],
     "params": {
       "liveDeadline": { "id": "deadline-test", "levels": ["hard", "nightmare", "hell-1"], "reserve": 0.6, "setStageCapMs": 46000, "generationStopMs": 115000, "responseBoundMs": 120000, "hostMarginMs": 1000 }
     }
   }
   ```

   `tools/ig-proto/variants/fr-frozen-none-live-test.json`:

   ```json
   {
     "id": "fr-frozen-none-live-test",
     "extends": ["fr-frozen-none", "w8"],
     "description": "Test only (stages 2 to 4 pack T08c): fr-frozen-none with the live deadline also on the fixture level 'hard' and the eight-worker pool limit of w8, for the live scripted cases; never an arm, a plan step or a binding's current id.",
     "edits": [],
     "files": [],
     "params": {
       "liveDeadline": { "id": "deadline-test", "levels": ["hard", "nightmare", "hell-1"], "reserve": 0.6, "setStageCapMs": 46000, "generationStopMs": 115000, "responseBoundMs": 120000, "hostMarginMs": 1000 }
     }
   }
   ```

   `tools/ig-proto/variants/fr-frozen-nowindow-test.json`:

   ```json
   {
     "id": "fr-frozen-nowindow-test",
     "extends": ["fr-frozen"],
     "description": "Test only (stages 2 to 4 pack T08c, plan 4.4): fr-frozen whose set-stage calibration rates every probe below its band (synthetic ratings), so that a real worker returns no-window-below; never an arm, a plan step or a binding's current id.",
     "edits": [
       {
         "id": "nw-1",
         "file": "core/engine/generate.js",
         "find": "    record,\n    recordSource: 'calibration',\n    charge,\n  });\n",
         "replace": "    record,\n    recordSource: 'calibration',\n    charge,\n    ...igNoWindowSeams(),\n  });\n"
       },
       {
         "id": "nw-2",
         "file": "core/engine/generate.js",
         "append": "\n// ig-proto, variant fr-frozen-nowindow-test (stages 2 to 4 pack T08c): test only. With IG.testNoWindow 'below', the\n// set stage's calibration call rates every probe at the synthetic score 30, below every gen-v4 band, so that a real\n// worker returns the reason no-window-below (plan 4.4); never an arm or a plan step.\nimport { IG as IG_NW } from './ig-params.js';\n\n/** @returns {Record<string, unknown>} */\nfunction igNoWindowSeams() {\n  if (IG_NW.testNoWindow !== 'below') {\n    return {};\n  }\n  const rating = () => ({\n    model: 'difficulty-v3', score: 30, level: 'st', saturated: false,\n    metrics: { work: 1, censusWork: 0, nodes: 1, censusNodes: 0, searchStop: 'exhausted', Gproved: 1, censusComplete: true },\n  });\n  return { igScreen: rating, igCanonical: rating };\n}\n"
       }
     ],
     "files": [],
     "params": { "testNoWindow": "below" }
   }
   ```

2. Build: `node tools\ig-proto\lib\tree.mjs build fr-frozen-live-test fr-frozen-none-live-test fr-frozen-nowindow-test
   --label frozen --source-label "frozen 3fc65f4"` (three `built` lines); `check-edits --all` prints `ok
   fr-frozen-live-test: 91 edits match`, `ok fr-frozen-none-live-test: 91 edits match`, `ok fr-frozen-nowindow-test: 92
   edits match`.
3. Append these six cases to `v4Cases`, then `...liveCases('fr-frozen-live-test'), hostBoundCase('fr-frozen-live-test'),
   ...liveCases('fr-frozen-none-live-test'), hostBoundCase('fr-frozen-none-live-test'),` (helpers of the file:
   `v4Call`, `synthetic`, `BAND`, `BEGIN_CALL_2`, `prefix`, `engine`, `browserModule`, `setFixture`, `harness`,
   `settle`, `track`, `same`, `assert`, `pathToFileURL`, `join`, `caseBoard`, `firstCarvedSet`, `fresh`, `readJournal`,
   `SELFTEST_DIR`):

   ```js
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
   ```

4. Run the locked verification of Commands and gates (two parts, check-list §3.1's selection block).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--v4`) | `fz: the frozen budget by mode and level (real calls, synthetic ratings)` | real calls on the K = 15 set, every probe rated 30 with work 5e10; seven rows of variant, mode, level | `budgetStop` `{ limit, spent: 5e10, overshoot }` with `limit` 1e10 (any, Nightmare), 3.2e10 (require, Nightmare; both screen arms), 4e10 (Hell 1, both modes); none on the two uncapped twins |
| same | `fz: a require budget end returns no unfinished final on fr-frozen` | `BEGIN_CALL_2` (require) on `fr-frozen`, budget = the units before the first count; no observer, charge, charge and record | `{ ok: false, reason: 'not-in-band' }` in all three; the charge log is the units before the first count; no `selected` or `repair` event |
| same | `fz: the per-set prior on Hell 1 only (payloads)` | `fr-frozen` batches at `hell-1` and `nightmare` whose calibration shows the level and the window count 5 | every Hell 1 candidate payload has `igPrior` 5; no Nightmare payload has `igPrior` |
| same | `fz: the no-window bound through a real worker` | `fr-frozen-nowindow-test`, four real worker threads, a 10x10 Nightmare set request, `maxSetAttempts` 4 | `failed`, `no-window-below`, failures `{ 'no-window-below': 4 }` |
| same | `fz: the live deadline on the frozen trees` | `igLiveOf` of the four arms' trees | Nightmare and Hell 1 get `{ origin: 1000, setCutAt: 47000 }` on `fr-frozen` and `fr-frozen-none`, null on the uncapped twins; `hard` null everywhere |
| same | `fz: W reaches real calls in every frozen class` | on `fr-frozen` and `fr-frozen-none`, one real `selectClues` call per class on the first carved set of `landscape/<cell>/0` of `10x10-nightmare`, `14x14-nightmare`, `15x20-nightmare`, `26x26-nightmare`, `26x26-hell-1`, its real target level, `uniqueness: 'any'`, synthetic ratings of score 30, no `igW` | one journal `start` line per call, at the cell's level; its `W`: `fr-frozen` `[760000000, 190000000, 190000000, 190000000, 760000000]` (`DEDUCE.work` for the null classes), `fr-frozen-none` `DEDUCE.work` for all five; a cell that does not carve fails the case |
| same | the fourteen `live fr-frozen-live-test: ...` and `live fr-frozen-none-live-test: ...` cases | T07c's factory (six cases) and T07b's `hostBoundCase` on the two bounded twins' test variants | as T07b's and T07c's Tests tables, on each twin |

## Documentation

README, the subsection `### The four frozen variants (T08a)`: the three test variants (what each adds, never an arm)
and the cases of this task, one line each.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T08c --label frozen` | repository root, first | `firewall: snapshot of S24-T08c` | 1 min |
| `node tools\ig-proto\lib\tree.mjs build fr-frozen-live-test fr-frozen-none-live-test fr-frozen-nowindow-test --label frozen --source-label "frozen 3fc65f4"` | repository root | three `built` lines | 5 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | repository root | no error; the three lines of step 2 | 3 min |
| the locked verification: check-list §3.1's selection block twice, with `$GroupArgs = @('--v4')`, `$Locked = $true` and the `$Id` and `$Required` of the two parts below | PowerShell 7 at the repository root | part 1: fourteen `PASS` lines, one `NOTE live live-test` line, `cases: 14 passed, as required`; part 2: fourteen `PASS` lines, two `NOTE live ...` lines, `cases: 14 passed, as required`; each `IG S24-T08c-<n> cases exit=0` | 5 min each |
| `node tools\ig-proto\freeze.mjs check --label frozen --source-label "frozen 3fc65f4"` | repository root | `freeze: check pass (6 checks; ...)` (the arms did not move) | 5 min |
| `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --current v4 --label frozen --source-label "frozen 3fc65f4"` | repository root | `binding: pass` | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T08c --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the five files | 1 min |

The two parts of the locked verification (each part is one helper invocation of at most 300 s):

```powershell
# Part 1: this task's six cases, the existing endmodes case and the seven live-test cases of T07b and T07c.
$Id = 'S24-T08c-1'
$Required = @(
  'fz: the frozen budget by mode and level (real calls, synthetic ratings)',
  'fz: a require budget end returns no unfinished final on fr-frozen',
  'fz: the per-set prior on Hell 1 only (payloads)',
  'fz: the no-window bound through a real worker',
  'fz: the live deadline on the frozen trees',
  'fz: W reaches real calls in every frozen class',
  'p5: budget end with unfinished candidates, every observer mode',
  "live live-test: the host's hard response bound",
  'live live-test: the set stage is cut by the reserve',
  'live live-test: one clock from the request start and the prefix at the stop',
  'live live-test: the same puzzles at widths 1, 2, 4 and 8 without a cut',
  'live live-test: a cut leaves a prefix of the same fold at every width',
  'live live-test: the deadline applies to the listed levels only',
  'live live-test: the host bound around a held assembly'
)
# Part 2: the fourteen cases on the two bounded twins.
$Id = 'S24-T08c-2'
$Required = @(
  'live fr-frozen-live-test: the set stage is cut by the reserve',
  'live fr-frozen-live-test: one clock from the request start and the prefix at the stop',
  'live fr-frozen-live-test: the same puzzles at widths 1, 2, 4 and 8 without a cut',
  'live fr-frozen-live-test: a cut leaves a prefix of the same fold at every width',
  'live fr-frozen-live-test: the deadline applies to the listed levels only',
  'live fr-frozen-live-test: the host bound around a held assembly',
  "live fr-frozen-live-test: the host's hard response bound",
  'live fr-frozen-none-live-test: the set stage is cut by the reserve',
  'live fr-frozen-none-live-test: one clock from the request start and the prefix at the stop',
  'live fr-frozen-none-live-test: the same puzzles at widths 1, 2, 4 and 8 without a cut',
  'live fr-frozen-none-live-test: a cut leaves a prefix of the same fold at every width',
  'live fr-frozen-none-live-test: the deadline applies to the listed levels only',
  'live fr-frozen-none-live-test: the host bound around a held assembly',
  "live fr-frozen-none-live-test: the host's hard response bound"
)
```

If a part nears its 285-s horizon, the pack author splits it (a `QUESTION:` with the helper's seconds); the
selection block refuses a missing or duplicated name before any locked call.

## Stop points and questions

- Stop and report the observed outcome when the real-worker case ends `attempts-exhausted` (an attempt failed for
  another reason, for example `carve`) or a budget row stops at another `limit`: both are `QUESTION:`s with the output.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T08c-B01 | In the frozen arms, each request gets the budget of its mode and level and the `W` of its class, `require` never returns an unfinished puzzle, the per-set prior acts on Hell 1 only, the bounded-attempt reason survives a real worker, and the deadline only shortens answers on both bounded twins, with the host's bound | the cases | the PASS lines |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T08c-T01 | The three test variants build (91, 91, 92 edits) | `build`; `check-edits` | the lines |
| T08c-T02 | The 20 new cases pass (six here, fourteen on the twins), with T07b's and T07c's seven `live-test` cases and the existing endmodes case | the two parts of the locked verification | the PASS lines; `cases: 14 passed, as required` twice |
| T08c-T03 | `freeze.mjs check` still passes; the `v4` chain did not move; `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (the indices, the NOTE lines, the helper's
seconds); each AC row with its evidence; the questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-24 05:55 +07:00 (dispatch, base `daa9755`); 2026-11-24 06:02 +07:00 (accepted); the developer reported 05:55:08-05:58:50 |
| Waiting for rulings | none |
| Agent id, model | `f9ecd896-7694-4728-9fa8-88a8717e8bd3`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 24 calls; 1,656,421 input, 15,943 output, 1,561,702 cache-read tokens |
| AI credits | 55.24 (developer only) |
| Questions and rulings | none; every pinned expectation held on the first run; the real-worker case ended `no-window-below` after 4 attempts (no stop point fired); no behaviour deviation (part 2's names built by a loop, equal to the task's literal array; README wording) |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `build` of the three test twins: reused (`fr-frozen-live-test` b81a0540..., `fr-frozen-none-live-test` 8acfdbeb..., `fr-frozen-nowindow-test` 55d747ea...); `check-edits --all`: 91, 91, 92 for the twins and 90 for each of the four arms; the locked selection block in two parts (`--v4`, `S24-T08c-orch-1` and `-2`): 14 and 14 PASS, `IG ... seconds=29.032` and `49.634`, quiet 15, `cases: 14 passed, as required` each; `freeze.mjs check`: pass (6 checks, the four tree ids unchanged); P-0 binding pass; `firewall check --task S24-T08c`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 the five Scope files |
| Commit | this task's commit |
| Issues and named items | none |
