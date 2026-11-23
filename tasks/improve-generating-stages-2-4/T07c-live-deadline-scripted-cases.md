# T07c: The live request deadline's scripted-pool cases

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.5 (Tests: "a reserve-cut set; a partial prefix at the stop; cancellation of outstanding work and late messages ... Without a clock cut, widths 1,2,4,8 return the same ordered puzzles. With a clock cut, returned lengths may differ; every result is a prefix of the same deterministic fold and common slots contain the same puzzles. Scripted-clock cases separately pin each expected prefix"; "assembly at the hard bound"), §6 T4, §8.2 T07; N-V4-13; this pack's check-list §3.1 (the case selection block) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T07b |
| Depends on | T07b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min of benchmark (one locked verification of about a minute) |

## Goal

The live deadline must never change which puzzle fills a slot: the clock may only shorten the answer. This task writes
the scripted-pool cases that pin it on the test variant `live-test`, as a factory `liveCases(variant)` that T08c runs
again on both bounded frozen twins: the reserve cut, one clock from the request start, the widths without a cut, the
pinned prefix at every width with a cut, the listed levels, and the host's bound around a set or batch assembly held
beyond it.

## Authority and fixed points

- Plan §4.5's Tests (quoted above) and §6 T4 ("the live deadline's scripted cases pass on both bounded twins").
- The scripted pool is `tools/ig-proto/lib/fake-pool.mjs` (`harness`, `settle`, `track`, the fake clock that starts at
  1000 ms); the candidates are the generation fixture's (`tests/fixtures/generation-case.json`, a 6x10 `hard` request),
  chosen as `fixture()` of `tests/generation-client.test.js` (frozen source `3fc65f4`, lines 142-169) chooses them:
  ten real candidates whose keys differ and whose layouts differ pairwise by at least 3, so that attempt 0 of slot `s`
  always gives the `s`-th puzzle of the fold.
- The expected values follow from the code of T07a and T07b and from today's client (the production test "the deadline
  returns the prefix as a time-limit partial": slots 1-3 answered, the rest held, a stop at 115 s gives three puzzles).
- **The pinned prefixes** (SA-Astra's review R10, a source-derived trace of the 30-s answer script with the actual
  `dispatchOrder`, `core/engine/generate.js:638-666`): width 1 gives 3 puzzles (`partial`, `time-limit`, ended at
  origin + 115 s), width 2 gives 6 (`partial`, `time-limit`, 115 s), width 4 gives 10 (`complete`, 90 s), width 8 gives
  10 (`complete`, 60 s). The case asserts the lengths and statuses; the end times are printed in its `NOTE` line.
- **The host bound around a held assembly** (SA-Astra's review R2-02, verbatim): "Test a batch assembly deliberately
  held beyond 120 seconds: the response must already be available by the bound, with its valid prefix, while releasing
  the old promise later changes nothing. Drive the fake clock through 120 seconds; do not freeze it at 119 while
  waiting. Test a directly held set promise at the controller seam separately. For the real set-assembly case, resolve
  a successful attempt before 46 seconds, wait for an explicit assembly-entered signal, hold that assembly and advance
  through the host bound. Keep the ordinary all-attempts-held case as a 46-second `reserve-cut` case. Replace the magic
  microtask count with a controlled assembly gate." The gate is T07b's client option `igAssemblyGate`; the held set
  and batch promises at the controller seam and the 46-s reserve cut with every attempt held are T07b's
  `hostBoundCase`. The case drives T07b's exported `igBoundStart` of the tree's `tools/bench/runner.js` with the tree's
  own client; the snapshot must equal the batch's own prefix, provenance, seen histories and pack once the held
  assembly is released.
- `liveCases` is a function declaration (hoisted), so that the `v4Cases` array literal can spread its result.

## Scope

- Change: `tools/ig-proto/self-test.mjs`: the helper `batchFixture(variant)`; the factory `liveCases(variant)` (six
  cases); `...liveCases('live-test'),` appended to `v4Cases`.
- Change: `tools/ig-proto/README.md`: the subsection of T07a gains the scripted cases.
- Guards: G1, G2, G3 (the two files).

## Steps

1. **`batchFixture`.** After T07b's `hostBoundCase` (after `setFixture`, `self-test.mjs:8882` at the base), add:

   ```js
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
   ```

2. **`liveCases`.** After `batchFixture`, add the factory below (it uses `LIVE_RECIPE` of T07a):

   ```js
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
   ```

3. Append `...liveCases('live-test'),` as the last element of the `v4Cases` array literal (after T07b's two cases).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--v4`) | `live live-test: the set stage is cut by the reserve` | scripted set requests at width 4 with `igOrigin` = the start: (a) every attempt held; (b) attempt 1 succeeds at 10 s while attempt 0 runs; (c) attempt 0 succeeds at 45 s; (d) no origin | (a) pending at 45.999 s, `{ status: 'failed', reason: 'reserve-cut', failures: {} }` at 46 s, attempts 0-3 dispatched, every held worker terminated; (b) the same `reserve-cut`; (c) `complete` with attempt 0; (d) pending at 46 s, `failed`, `time-limit` at 115 s |
| same | `live live-test: one clock from the request start and the prefix at the stop` | slots 1-3 answered, later slots held; the batch starts 40 s after the origin; then the same without the origin | with the origin: pending at origin + 114.999 s, then `partial`, `time-limit` with the three fold puzzles at origin + 115 s, every held task cancelled, late answers change nothing; without: pending at origin + 115 s, the same three puzzles at the batch's own 115 s |
| same | `live live-test: the same puzzles at widths 1, 2, 4 and 8 without a cut` | every task answered at once; widths 1, 2, 4, 8 | `complete` with the ten fold puzzles in the same order at every width |
| same | `live live-test: a cut leaves a prefix of the same fold at every width` | every task answered 30 s after it is sent; widths 1, 2, 4, 8; the stop at 115 s | each result is a prefix of the fold; lengths exactly `{ 1: 3, 2: 6, 4: 10, 8: 10 }`; statuses `partial/time-limit` at widths 1 and 2, `complete` at 4 and 8; a `NOTE` line gives the lengths and the end times |
| same | `live live-test: the deadline applies to the listed levels only` | `igLiveOf` of the tree with `clock.now()` 5000 | `{ origin: 1000, setCutAt: 47000 }` for `hard`; null for `easy` and for no origin |
| same | `live live-test: the host bound around a held assembly` | T07b's `igBoundStart` of the tree's runner with the tree's client and an assembly gate: (a) `generateBatch` with the origin, slots 1-3 answered, the rest held, the batch's own pack assembly held; the clock moved to the stop at 115 s, then to 119 s, 120 s and 125 s; then the gate released and the held tasks answered; (b) `generateSet` with the origin, attempt 0 answered with a success at 10 s, the set's pack assembly held; the clock moved to 118.999 s, 119 s and 120 s; then the gate released | (a) the gate entered `['batch']` at the stop, both promises pending; the response resolved at origin + 119 s exactly, `partial`, `response-bound`, the three fold puzzles, `made` with exactly their ids, a valid pack (`validatePack` of the tree); the batch's own promise still pending at 125 s; every held task cancelled; after the release the batch's own result is `partial`, `time-limit`, and its `made`, seen histories and pack equal the response's; the response unchanged; (b) the gate entered `['set']`; pending at 118.999 s; `{ status: 'failed', reason: 'response-bound', failures: {} }` at origin + 119 s exactly; the set still pending at 120 s; after the release the set is `complete` with attempt 0 and the response unchanged |

## Documentation

README: the subsection `### The live request deadline (T07a to T07c)` gains the cases (the factory `liveCases`, the
trees it runs on, what each pins: the prefixes 3, 6, 10, 10 at widths 1, 2, 4, 8 with a cut; the host bound around a
set or batch assembly held by the gate beyond it).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T07c --label frozen` | repository root, first | `firewall: snapshot of S24-T07c` | 1 min |
| check-list §3.1's selection block with `$Id = 'S24-T07c'`, `$GroupArgs = @('--v4')`, `$Locked = $true`, `$Required = @('live: the pool starts a request at its origin', 'live: igLiveOf rule', 'live: inert without its parameter', "live live-test: the host's hard response bound", 'live: the host bound is inert without its parameter', 'live live-test: the set stage is cut by the reserve', 'live live-test: one clock from the request start and the prefix at the stop', 'live live-test: the same puzzles at widths 1, 2, 4 and 8 without a cut', 'live live-test: a cut leaves a prefix of the same fold at every width', 'live live-test: the deadline applies to the listed levels only', 'live live-test: the host bound around a held assembly')` | PowerShell 7 at the repository root | eleven `PASS` lines; one `NOTE live live-test` line; `self-test: 11 passed, 0 failed`; `IG S24-T07c cases exit=0`; `cases: 11 passed, as required` | 5 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T07c-items --horizon-s 285` | repository root (unlocked) | every case `PASS` (the file still loads; the item cases are unchanged) | 5 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T07c --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the two files | 1 min |

## Stop points and questions

- Stop and report the observed values when a pinned value differs (the 46-s cut, the three-puzzle prefix, the lengths
  3, 6, 10, 10 and their statuses at widths 1, 2, 4, 8, the order at every width, the bound's response at exactly 119
  s while the gate holds the assembly): these follow from the code of T07a and T07b and today's client; a difference is
  a `QUESTION:` with the observed outcome, never a changed expectation. In particular, the gate must have entered the
  named assembly before the clock reaches the bound; a case that does not reach it is reported, never worked around
  with microtask counts or a frozen clock.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07c-B01 | The deadline only shortens an answer, never changes which puzzle fills a slot, at every pool width; a bound during a held assembly answers at once with the batch's own prefix and pack, or ends the set phase | the six cases | the PASS lines and the NOTE |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07c-T01 | The reserve cut, the shared origin, the prefix at the stop, the cancellation, the late messages, the widths with their pinned prefixes, the listed levels and the host bound around a held set or batch assembly behave as the Tests table says on `live-test` | the locked verification | the PASS lines |
| T07c-T02 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (the indices, the NOTE line, the helper's
seconds); each AC row with its evidence; the questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |
