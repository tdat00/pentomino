# T07b: The live request deadline's hard response bound in the host

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.5 ("the host returns that prefix by 120 s at the latest"; "assembly at the hard bound"), §6 T4, §8.2 T07; N-V4-13; plan v4 IG-P-D1; D-S24-12, D-S24-14; this pack's D-P24-01, D-P24-04 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T07a |
| Depends on | T07a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min of benchmark (one locked verification of about a minute) |

## Goal

The pool stops the batch at 115 s from the request start (T07a), but the response also needs the set, the batch and
their packs assembled and handed back. The host (the bench runner of the copy, which times every row) gets a hard bound
that starts at the request origin, before the set call: at the origin plus 119 s (120 s less a 1-s host margin) it
cancels the client and ends the request at once. In the set phase the response is the set reason `response-bound`,
even while the set still assembles its pack. In the batch phase the response is the client's **prefix snapshot**: the
accepted prefix with its own provenance, seen histories and a pack assembled and validated at once from the client's
state (`igPrefix()`), labelled `partial`, `response-bound`. After the bound the host never awaits the batch, its pool
tasks or its pack assembly. The client also gets a test seam, an assembly gate, so that the scripted cases (T07c) can
hold a set or batch assembly beyond the bound. This task also adds the test-only variant `live-test` and the reusable
case `hostBoundCase(variant)` that T08c runs again on both bounded frozen twins.

## Authority and fixed points

- Plan §4.5: "the host returns that prefix by 120 s at the latest"; D-P24-04: the bound gives the set result `{ status:
  'failed', reason: 'response-bound', failures: {} }` (`partialReason` `set:response-bound`) and, in the batch phase,
  the client's prefix snapshot `{ status: 'partial', reason: 'response-bound', accepted, made, seenLayouts, seenClues,
  pack }` (`pack` only for a non-empty prefix; `partialReason` `response-bound`).
- **The contract** (SA-Astra's review R09, verbatim): "The hard-bound controller starts at the same request origin before
  the set call, covers both the set and batch phases including assembly, and is cleared on every terminal path. A
  non-empty returned prefix retains its corresponding provenance and seen-key histories and has a valid assembled pack.
  The response timestamp closes after that result is available, not when a synthetic no-pack object wins a race. A
  bound during the set phase also terminates the request; it cannot wait indefinitely for set assembly." The previous
  design (a race after `generateSet` returned, resolving `{ ... made: {}, seenLayouts: [], seenClues: [] }`) is
  withdrawn.
- **The bounded completion** (SA-Astra's review R2-02, verbatim): "On the host cutoff, complete the response from
  controlled prefix state without awaiting the original batch/assembly promise. The prefix must retain its real
  provenance, histories and valid pack. Supply the exact snapshot/assembly interface and anchored edits that do this;
  cancellation followed by an unbounded await is not an implementation of the hard bound. A suitable design is a client
  prefix snapshot that can be assembled without waiting for the pending asynchronous batch completion, or an already
  assembled snapshot maintained before acceptance. Do not restore the former empty-provenance/no-pack fallback." The
  design of review 1 (cancel, then `await` the batch's own result) is withdrawn: in the frozen client `finish(job)` sets
  `job.running = false` before the batch's pack assembly and `cancel()` acts only on a running job
  (`core/browser/generation-client.js:498-502,1175-1208,1282-1289`), so cancelling during that assembly settles
  nothing.
- **The snapshot** (`lv-16`): inside `generateBatch`, `job.igPrefix()` builds `{ status: 'partial', reason:
  'response-bound', accepted, made, seenLayouts, seenClues }` from the batch's own `accepted`, `made` and fold `state`
  at the moment it is called and, for a non-empty prefix, the pack from **the same parts as the batch's own final
  assembly** (`generation-client.js:1185-1204`), validated with the synchronous `validatePack` (`core/engine/pack.js:1595`,
  "the same result" as `validatePackSliced`, line 1621) instead of the sliced, timer-paused one; an invalid pack throws
  `GenerationError('internal', ...)`, as `assemblePack` does (lines 407-418). The client exposes it as `igPrefix()`
  (`lv-18`; null outside a batch). The accepted list is the fold's prefix in slot order (the client accepts strictly in
  fold order), so the snapshot only shortens the answer.
- **The assembly gate** (`lv-15`, `lv-17`): a test seam, the client option `igAssemblyGate` (a function of the phase
  `'set'` or `'batch'` returning a promise), awaited just before the set's and the batch's `assemblePack`; the bench and
  the product create the client with `{ clock }` only (`tools/bench/runner.js:374,380`), so they run today's path.
- The runner validates `s.batch.pack` when present (`tools/bench/runner.js:638-645`), counts the accepted puzzles from
  its own `onAccepted` events (`runner.js:566-568,626-629`) and labels the record from `s.set` and `s.batch`
  (`runner.js:669-677`); after the client's `cancel()` the batch loop accepts nothing more (it checks `job.cancelled`
  at the top of every turn, `generation-client.js:1097-1101`, and of the completion pass, lines 1037-1041).
- The bound reads `IG.liveDeadline` (`responseBoundMs` 120000, `hostMarginMs` 1000) and applies only to a level the
  parameter lists; otherwise the set and batch promises are returned unchanged (today's path).
- The origin of the request is the row's `s.t0` (`runner.js:536`, the start of the timed interval); the host passes it
  as `igOrigin` to both `generateSet` and `generateBatch` (T07a's client and pool read it).
- The anchors of `lv-10` to `lv-13` were checked to occur once in `tools/bench/runner.js` of the built trees `v4-link`,
  `fr-base`, `fr-p5`, `fr-ps`, `v4-ps-link` and `v4-p5`, and those of `lv-15` to `lv-18` once in the frozen
  `core/browser/generation-client.js`; the composed manifests were checked in memory
  (`docs/improve-generating-stages-2-4/evidence/sa-opus/bt-variants.mjs --draft`: `live` 76 edits, `live-test` 77, the
  four frozen arms 90 each; every touched module parses). The bound's logic was evaluated on controlled promises and
  the fake clock, and the snapshot's pack parts were compared with the final assembly's in the composed client
  (`docs/improve-generating-stages-2-4/evidence/sa-opus/bt-bound.mjs`: every check passed).
- Test-only variants end in `-test` and are never an arm, a plan step or a binding's `current` id (check-list §3.1).

## Scope

- Change: `tools/ig-proto/variants/live.json` (ten edits appended to `edits`: `lv-10` to `lv-14` in
  `tools/bench/runner.js`, `lv-15` to `lv-19` in `core/browser/generation-client.js`).
- Create: `tools/ig-proto/variants/live-test.json`.
- Change: `tools/ig-proto/self-test.mjs`: the import of `./lib/fake-pool.mjs` gains `createFakeClock`; the helpers
  `hostRow(variant, mode)` and `hostBoundCase(variant)` after `setFixture`; two cases appended to `v4Cases`.
- Change: `tools/ig-proto/README.md`: the subsection of T07a gains the host bound, the prefix snapshot, the assembly
  gate and `live-test`.
- Guards: G1, G2 (`live.json` is new at the base, so G2 does not list it), G3 (the four files).

## Steps

1. Append the ten objects of this block's `edits` array to the `edits` array of `tools/ig-proto/variants/live.json`,
   after `lv-9`, unchanged (`addTo` names the file; it is not a key of the manifest):

   ```json
   {
     "addTo": "live",
     "edits": [
       {
         "id": "lv-10",
         "file": "tools/bench/runner.js",
         "find": "  s.t0 = clock.now();\n  try {\n    const set = await client.generateSet({\n      boardRows: caseDef.boardRows,\n",
         "replace": "  s.t0 = clock.now();\n  const igBound = igBoundStart(s, caseDef, clock, client);\n  try {\n    const set = await igBound.set(client.generateSet({\n      igOrigin: s.t0,\n      boardRows: caseDef.boardRows,\n"
       },
       {
         "id": "lv-11",
         "file": "tools/bench/runner.js",
         "find": "      maxActive: caseDef.maxActive,\n    });\n    s.set = set;\n",
         "replace": "      maxActive: caseDef.maxActive,\n    }));\n    s.set = set;\n"
       },
       {
         "id": "lv-12",
         "file": "tools/bench/runner.js",
         "find": "    s.batch = await client.generateBatch({\n      set: set.set,\n",
         "replace": "    s.batch = await igBound.batch(client.generateBatch({\n      igOrigin: s.t0,\n      set: set.set,\n"
       },
       {
         "id": "lv-13",
         "file": "tools/bench/runner.js",
         "find": "      },\n    });\n  } catch (e) {\n    s.fault = e;\n  } finally {\n    s.tDone = clock.now();\n  }\n",
         "replace": "      },\n    }));\n  } catch (e) {\n    s.fault = e;\n  } finally {\n    igBound.clear();\n    s.tDone = clock.now();\n  }\n"
       },
       {
         "id": "lv-14",
         "file": "tools/bench/runner.js",
         "append": "\n// ig-proto, variant live (stages 2 to 4 pack T07b, plan 4.5, N-V4-13): the host's hard response bound. With\n// IG.liveDeadline listing the case's level, one timer starts at the request origin, before the set call, and fires\n// at t0 + responseBoundMs - hostMarginMs: it cancels the client and ends the request at once. In the set phase the\n// response is the set reason `response-bound`; a set that settles later, even one still assembling its pack,\n// changes nothing. In the batch phase the response is the client's prefix snapshot (`client.igPrefix()`, T07b): the\n// accepted prefix with its provenance, seen histories and a pack assembled and validated at once, `partial`,\n// `response-bound`. After the bound the host never awaits the batch, its tasks or its own pack assembly. A result\n// that settles first is returned unchanged; the timer is cleared on every terminal path.\nimport { IG as IG_HOST } from '../../core/engine/ig-params.js';\n\n/**\n * @param {any} s The RunState of the row (its t0 is the request origin).\n * @param {any} caseDef\n * @param {any} clock\n * @param {any} client\n * @returns {{ set: (p: Promise<any>) => Promise<any>, batch: (p: Promise<any>) => Promise<any>, clear: () => void }}\n */\nexport function igBoundStart(s, caseDef, clock, client) {\n  const live = IG_HOST.liveDeadline;\n  if (live === undefined || live === null || !Array.isArray(live.levels) || !live.levels.includes(caseDef.levelId)) {\n    return { set: (p) => p, batch: (p) => p, clear() {} };\n  }\n  let fired = false;\n  /** @type {(() => void) | null} */\n  let onFire = null;\n  const cancel = () => {\n    try {\n      client.cancel();\n    } catch {\n      // the bound must not fail the row\n    }\n  };\n  const timer = clock.setTimeout(() => {\n    fired = true;\n    cancel();\n    onFire?.();\n  }, Math.max(0, s.t0 + live.responseBoundMs - live.hostMarginMs - clock.now()));\n  /**\n   * The phase's promise, or the response at the bound, whichever comes first; never both.\n   * @param {Promise<any>} promise\n   * @param {() => any} atBound\n   * @returns {Promise<any>}\n   */\n  const race = (promise, atBound) => new Promise((resolve, reject) => {\n    let done = false;\n    const cut = () => {\n      if (done) {\n        return;\n      }\n      done = true;\n      onFire = null;\n      try {\n        resolve(atBound());\n      } catch (error) {\n        reject(error);\n      }\n    };\n    if (fired) {\n      cancel();\n      cut();\n    } else {\n      onFire = cut;\n    }\n    promise.then((value) => {\n      if (!done) {\n        done = true;\n        onFire = null;\n        resolve(value);\n      }\n    }, (error) => {\n      if (!done) {\n        done = true;\n        onFire = null;\n        reject(error);\n      }\n    });\n  });\n  return {\n    set: (promise) => race(promise, () => ({ status: 'failed', reason: 'response-bound', failures: {} })),\n    batch: (promise) => race(promise, () => {\n      const prefix = typeof client.igPrefix === 'function' ? client.igPrefix() : null;\n      if (prefix === null || prefix === undefined) {\n        throw new Error('the hard bound found no batch prefix to return');\n      }\n      return prefix;\n    }),\n    clear() {\n      clock.clearTimeout(timer);\n      onFire = null;\n    },\n  };\n}\n"
       },
       {
         "id": "lv-15",
         "file": "core/browser/generation-client.js",
         "find": "    const pack = await assemblePack({\n      board,\n      rotation: request.rotation,\n",
         "replace": "    // ig-proto, variant live (T07b): the test seam of an assembly gate (the option igAssemblyGate); a product or\n    // bench client has none and runs today's path.\n    if (options.igAssemblyGate !== undefined) {\n      await options.igAssemblyGate('set');\n    }\n    const pack = await assemblePack({\n      board,\n      rotation: request.rotation,\n"
       },
       {
         "id": "lv-16",
         "file": "core/browser/generation-client.js",
         "find": "    const detail = () => ({ accepted: accepted.slice(), seenLayouts: [...state.seenLayouts], seenClues: [...state.seenClues] });\n",
         "replace": "    const detail = () => ({ accepted: accepted.slice(), seenLayouts: [...state.seenLayouts], seenClues: [...state.seenClues] });\n    // ig-proto, variant live (stages 2 to 4 pack T07b, plan 4.5): the accepted prefix of this batch as a response,\n    // assembled and validated at once, without waiting for the batch, its pool tasks or its own pack assembly; the\n    // host's hard bound returns it through igPrefix(). The prefix only shortens the answer: fold order is kept.\n    /** @type {any} */ (job).igPrefix = () => {\n      /** @type {any} */\n      const out = {\n        status: 'partial', reason: 'response-bound', accepted: accepted.slice(), made: structuredClone(made),\n        seenLayouts: [...state.seenLayouts], seenClues: [...state.seenClues],\n      };\n      if (accepted.length > 0) {\n        let checked;\n        try {\n          checked = igValidatePack(createPack({\n            board: set.board,\n            rotation: request.rotation,\n            pieces: set.pieces,\n            witness: set.witness,\n            puzzles: accepted.slice(),\n            generation: generationMeta({\n              setSeed: request.setSeed,\n              setLevel: input.setLevel,\n              setAttempt: input.setAttempt,\n              set,\n              uniqueness,\n              createdAt: createdAt(),\n              batch: { batchSeed, batchLevel: levelId, batchIndex: input.batchIndex },\n              setOrigin: request.setOrigin,\n              made,\n            }),\n          }));\n        } catch (e) {\n          throw new GenerationError('internal', e instanceof Error ? e.message.slice(0, 500) : 'The pack could not be built', detail());\n        }\n        if (!checked.ok) {\n          throw new GenerationError('internal', 'The generated pack failed validation', { ...detail(), issues: checked.issues });\n        }\n        out.pack = checked.value;\n      }\n      return out;\n    };\n"
       },
       {
         "id": "lv-17",
         "file": "core/browser/generation-client.js",
         "find": "    if (accepted.length > 0) {\n      result.pack = await assemblePack({\n",
         "replace": "    if (accepted.length > 0) {\n      // ig-proto, variant live (T07b): the test seam of an assembly gate; a product or bench client has none.\n      if (options.igAssemblyGate !== undefined) {\n        await options.igAssemblyGate('batch');\n      }\n      result.pack = await assemblePack({\n"
       },
       {
         "id": "lv-18",
         "file": "core/browser/generation-client.js",
         "find": "    replayPuzzle,\n    cancel,\n    recycle() {\n",
         "replace": "    replayPuzzle,\n    cancel,\n    // ig-proto, variant live (T07b): the latest batch's prefix snapshot, or null outside a batch (the hard bound).\n    igPrefix: () => /** @type {any} */ (latest)?.igPrefix?.() ?? null,\n    recycle() {\n"
       },
       {
         "id": "lv-19",
         "file": "core/browser/generation-client.js",
         "append": "\n// ig-proto, variant live (stages 2 to 4 pack T07b): the synchronous pack validator of the prefix snapshot (the same\n// result as validatePackSliced, without the host pauses).\nimport { validatePack as igValidatePack } from '../engine/pack.js';\n"
       }
     ]
   }
   ```

2. Create `tools/ig-proto/variants/live-test.json` exactly:

   ```json
   {
     "id": "live-test",
     "extends": ["live", "w8"],
     "description": "Test only (stages 2 to 4 pack T07b, T07c): the live deadline on the fixture level 'hard' (tests/fixtures/generation-case.json) with the eight-worker pool limit of w8, for the scripted cases; never an arm, a plan step or a binding's current id.",
     "edits": [],
     "files": [],
     "params": {
       "liveDeadline": { "id": "deadline-test", "levels": ["hard"], "reserve": 0.6, "setStageCapMs": 46000, "generationStopMs": 115000, "responseBoundMs": 120000, "hostMarginMs": 1000 }
     }
   }
   ```

3. Build and check: `node tools\ig-proto\lib\tree.mjs build live live-test --label frozen --source-label "frozen
   3fc65f4"` prints two `built` lines; `check-edits --all` prints `ok live: 76 edits match` and `ok live-test: 77 edits
   match` (the 76 of `live` and `w8-1`).
4. In `tools/ig-proto/self-test.mjs`, change the import line `import { harness, settle, track } from
   './lib/fake-pool.mjs';` to `import { createFakeClock, harness, settle, track } from './lib/fake-pool.mjs';`, and add
   after `setFixture` (`self-test.mjs:8882`):

   ```js
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
   ```

5. Append to `v4Cases`: `hostBoundCase('live-test'),` and the case `live: the host bound is inert without its
   parameter`:

   ```js
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
   ```

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--v4`) | `live live-test: the host's hard response bound` | (a) `runCase` of the `live-test` tree on the stub pool and a fake clock, set attempt 0 answered at once, every other task held; (b) the same with every task held; (c) the tree's `igBoundStart` with a stub client (`cancel`, `igPrefix` returning a fixed snapshot) and the fake clock: a set promise and then a batch promise that never settle, the batch's released at t0 + 125000 ms | the fixture's calibration is of level `hard`; (a) pending at t0 + 118999 ms; at t0 + 119000 ms `partialReason` `response-bound`, `responseMs` 119000, `acceptedCount` 1 (the matching calibration), `interrupted` false, no validation error (the snapshot's pack is valid), no task held; (b) pending at t0 + 45999 ms; `set:reserve-cut`, 46000, 0, no task held; (c) the set pending at t0 + 118999 ms and `{ status: 'failed', reason: 'response-bound', failures: {} }` at t0 + 119000 ms with one cancel; the batch resolved with the stub's snapshot (the same object) at t0 + 119000 ms, unchanged after the release, two cancels in all |
| same | `live: the host bound is inert without its parameter` | the same row (a) on the `live` tree (`liveDeadline` null) | still pending at t0 + 178999 ms; `cancelled` after the row's cancel |

The scripted cases (the reserve cut, the stop at 115 s, the widths, the late messages and the host bound around a held
set or batch assembly) are T07c's, on `live-test`; T08c runs `hostBoundCase` and T07c's factory on both bounded twins.

## Documentation

README, the subsection `### The live request deadline (T07a to T07c)`: the host's bound (`igBoundStart` in the copy's
`tools/bench/runner.js`, started at the request origin before the set call; at t0 + `responseBoundMs` - `hostMarginMs`
the client is cancelled and the request ends at once: in the set phase with the reason `set:response-bound`, in the
batch phase with the client's prefix snapshot `igPrefix()`, `partial`, `response-bound`, whose prefix, provenance, seen
histories and pack (validated at once by the synchronous `validatePack`) are the batch's own; the host never awaits the
batch after the bound; cleared on every terminal path), the test seam `igAssemblyGate` (a client option, never set by
the bench or the product), the edits `lv-10` to `lv-19`, and the test-only `live-test` (the deadline on the fixture
level `hard`, with `w8`).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T07b --label frozen` | repository root, first | `firewall: snapshot of S24-T07b` | 1 min |
| `node tools\ig-proto\lib\tree.mjs build live live-test --label frozen --source-label "frozen 3fc65f4"` | repository root | two `built` lines | 3 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | repository root | no error; `ok live: 76 edits match`; `ok live-test: 77 edits match` | 3 min |
| check-list §3.1's selection block with `$Id = 'S24-T07b'`, `$GroupArgs = @('--v4')`, `$Locked = $true`, `$Required = @('live: the pool starts a request at its origin', 'live: igLiveOf rule', 'live: inert without its parameter', "live live-test: the host's hard response bound", 'live: the host bound is inert without its parameter')` | PowerShell 7 at the repository root | five `PASS` lines; `self-test: 5 passed, 0 failed`; `IG S24-T07b cases exit=0`; `cases: 5 passed, as required` | 5 min |
| `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --current v4 --label frozen --source-label "frozen 3fc65f4"` | repository root | `binding: pass` | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T07b --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the four files | 1 min |

## Stop points and questions

- Stop and report when a bounded row does not end at exactly t0 + 119000 ms of the fake clock (case (a)) or t0 + 46000
  ms (case (b)), ends with another `partialReason`, carries a validation error, or leaves a task held.
- Stop and report when the fixture's calibration is not of level `hard` (the pinned prefix of (a) is 1; a changed
  fixture is a `QUESTION:`, never a looser assertion).
- Never make the host await the batch's promise, its tasks or its pack assembly after the bound, and never return an
  invented prefix (empty provenance, no pack) instead of `igPrefix()`: a case that seems to need it is a `QUESTION:`.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07b-B01 | A live request answers by 120 s even when the set or the batch does not return: in the set phase at once, in the batch phase with the client's own prefix and a valid pack, assembled at once and marked `response-bound`; a level without the parameter keeps today's behaviour | the two cases | the PASS lines |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07b-T01 | `live` (19 own edits, 76 in its chain) and `live-test` (77) build; every edit matches once | `build`; `check-edits` | the lines |
| T07b-T02 | The bound starts at the origin, ends a held set or batch at t0 + 119 s without awaiting it (the batch with the client's snapshot), lets the reserve cut a held set stage at 46 s, and is cleared; without the parameter no bound fires | the two cases | the PASS lines |
| T07b-T03 | T07a's cases still pass; the `v4` chain did not move; `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-24 05:25 +07:00 (dispatch, base `98b6a1d`); 2026-11-24 05:30 +07:00 (accepted); the developer reported 05:25:46-05:27:59 |
| Waiting for rulings | none |
| Agent id, model | `c04a4ece-e183-4f5a-b3ed-3185dbc3b380`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 24 calls; 1,565,220 input, 16,797 output, 1,507,199 cache-read tokens |
| AI credits | 46.37 (developer only) |
| Questions and rulings | none; every pinned scripted value held (pending at 118,999 ms then `response-bound` at 119,000; `set:reserve-cut` at 46,000; the cancels); no deviation |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `build live live-test`: both reused (`b4d9cb6e...`, `3b78783f...`); `check-edits --all`: `ok live: 76`, `ok live-test: 77 edits match`, exit 0; the locked selection block (`--v4`, `S24-T07b-orch`): the five `live` cases PASS, `IG ... exit=0 seconds=6.863 quiet=15`, `cases: 5 passed, as required`; P-0 binding pass; `firewall check --task S24-T07b`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 the four Scope paths |
| Commit | this task's commit |
| Issues and named items | the assembly gate (`lv-15`, `lv-17`) is exercised by T07c; `lv-16`'s invalid-pack throw is not exercised here |
