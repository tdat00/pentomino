# T15 — Generation orchestration and headless CLI

**ID:** T15  
**Depends on:** T10, T11, T14  
**Estimated size:** 900–1,400 implementation/test lines  
**Owner role:** core / infra  
**Milestone:** MVP
**Design refs:** §6.5, §6.9, §8.2, §8.6, §15/I3; D41.

## Goal & business context

One orchestration path must power the Generator, Node tests and the performance harness. It must publish accepted puzzles deterministically and preserve useful partial results.

## Scope

**In scope:** browser-neutral client/controller, indexed scheduling, pack creation, Node worker adapter and CLI.  
**Out of scope:** app DOM, hand-off navigation, browser qualification and changing engine algorithms.

## Inputs & context

Add a host adapter in `core\browser\generation-client.js`:

```ts
createGenerationClient(pool,options?:{clock?:Clock}):{
 generateSet(input:{boardRows;rotation;levelId;seedText;uniqueness;maxActive},
   hooks?:{onProgress?;onAccepted?}):Promise<SetJobResult>;
 generateBatch(input:{set;rotation;targetLevelId;quantity;setSeed;batchIndex;uniqueness;displayOffset?:number;
   seenLayouts:string[];seenClues:string[];calibration?:Puzzle},
   hooks?:{onProgress?;onAccepted?}):Promise<BatchJobResult>;
 cancel():void; recycle():void;
};
```

This module uses the T14 pool and engine functions but no DOM/storage, allowing the Node host to reuse it. Host-side clocks affect deadlines/metadata only.

Set result: `{status:'complete'|'failed'|'cancelled',set?,calibration?,attempt?,pack?,reason?}`. Batch result: `{status:'complete'|'partial'|'cancelled',pack?,accepted: Puzzle[],seenLayouts:string[],seenClues:string[],reason?}`. Never expose an unfinished candidate as a usable pack.

The set result's pack is kind `piece-set` with `puzzles:[]`; calibration is returned separately and becomes puzzle #1 only when the matching first batch is accepted.

`fold.accepted` contains candidates. Convert each to `{id:puzzleId(board,pieces,clues),title:levelLabel+' #'+(displayOffset+slot),clues,solution:layout,rating,certificate}`; offset defaults0 and is the existing visible count for Add more. Titles never affect RNG/identity. Calibration reuse needs an in-memory engine-produced or reverified puzzle, not a stored claim.

Resource/transport faults reject a typed `GenerationError` carrying `code`, `message`, and the already accepted puzzles/history. The UI retains that streamed prefix and maps `model-too-large` to its own notice. Do not disguise such a fault as a difficulty/uniqueness/time partial reason.

Contracts repeated for integration:

- T14 `beginRequest({requestId,revision,onTimeout})`, `run`, `runIdle`, `endRequest`, `cancelAll`, `recycle`.
- Wire tasks carry `kind/id/payload`; workspace objects are injected only inside workers.
- T10 `foldStart`, `foldNext`, `foldAccept` owns batch acceptance logic. Candidate fields include full layout, both keys, clues, rating and optional certificate.
- T11 `createPack` derives kind; serialize omits runtime-only verification flags.
- T07 IDs/fingerprints use semantic exact coordinates, excluding display angle and dates.

Scheduling:

1. Validate board against the supplied enabled cap (minimum30, side≤32, connected); do not silently change parameters.
2. Start one request clock. Dispatch set attempts0,1,… up to pool width. When attempt j succeeds, cancel higher indices, finish all lower in-flight indices, and choose the **lowest successful j**.
3. Results/progress carry the owning revision. Successful replacement is atomic; failures leave prior app state available.
4. Before a batch, preserve the set/history snapshot and derive `batchSeed=batchSeedFor(setSeed,batchIndex)`. A new set starts at index0; the UI increments for every New Puzzles/Add more request, including requests later cancelled/failed. Reuse a matching unseen calibration as #1.
5. Follow T10’s deterministic fold. Candidate seen-key snapshots are frozen for the request after any calibration acceptance; new accepted keys are tracked by the fold, not timing-dependent worker payload mutation.
6. At most poolSize tasks run. Dispatch: awaited current attempt first; then attempt0 of later unfilled slots ascending; then current-slot retries; then later retries. Cache by `(slot,attempt)` and consume only fold order. Lexicographic speculation is forbidden.
7. A valid accepted candidate becomes a Puzzle whose solution is the full layout. Stream it immediately; no certificates in ordinary acceptance.
8. At request end/cancel/deadline, package only accepted data, preserve history, and return the declared reason. Watchdog interruption never receives a new rating.
9. Queue lazy certificates for accepted puzzles after the user-visible result; reject updates for changed revisions/fingerprints.

History capacity is 1,000 keys in each seen set. If the requested quantity cannot fit remaining history capacity, fail preflight with `history-full` and let the UI offer explicit history reset or a smaller quantity; do not silently evict identities.

Wire generation metadata:

```text
app pentomino-generator/1.0.0; algo gen-v2; policy mixed-v2
rng xoshiro128ss-v1; seedScheme seed-sha256-v1
setSeed,setLevel,setAttempt,carving,macroRegion?
batchSeed,batchLevel,batchIndex,uniqueness,createdAt
```

The host supplies `createdAt`. Semantic replay comparisons exclude timestamps and other host-only presentation metadata.

Node adapter: `tools\node-worker.mjs` uses `worker_threads.parentPort`, the same engine dispatcher, and per-worker workspaces. Adapt Node Worker events to the pool’s Worker interface. There is no second solver or generator in tools.

CLI:

```text
node tools\generate.mjs --board 10x6 --level hard --count 5 --seed demo --workers 4
node tools\generate.mjs --recipe tests\fixtures\generation-case.json --workers 1
```

`--board` is columns×rows; also accept `--cols/--rows`. Support preset/n, rotation, uniqueness any/require, count1–10, workers1–4, `--output`, `--batch-index` (default1), and `--max-active` (default676; integer30–676). Node has no device class; it still rejects sides>32. Derive batchSeed from setSeed/index. Print only validated pack JSON to stdout; progress/errors to stderr. Exit0=complete,2=valid partial/cancelled pack,1=no usable result/invalid input. Files use UTF-8/no BOM/CRLF.

Recipe fields include batchIndex and the derived batchSeed. Validate `batchSeed===seedText+"#"+batchIndex` and all declared versions; expected summaries are evidence, never precomputed output. Only workers/max-active/output may override a recipe; do not silently alter its semantic inputs.

## Files to create/modify

`core\browser\generation-client.js`; `tools\node-worker.mjs`, `tools\generate.mjs`; `tests\generation-client.test.js`, `tests\cli.test.js`.

## Implementation steps

1. Implement request state, deterministic task queues, fold delivery and partial packaging.
2. Add pack/provenance assembly without polluting semantic seed inputs.
3. Add the Node worker adapter and CLI argument/recipe handling.
4. Exercise real engine output through `validatePack`.

## Acceptance criteria — Business

- **BAC-1:** Results stream in order; cancelling preserves accepted puzzles and never replaces a ready set with a failure.
- **BAC-2:** One- and four-worker runs reproduce the same semantic set/batch.
- **BAC-3:** A usable partial file can still be imported, and its shortfall is clearly reported.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\generation-client.test.js" "tests\cli.test.js"` passes.
- **TAC-2:** `node tools\generate.mjs --recipe tests\fixtures\generation-case.json --workers 1` and the same command with `--workers 4` produce valid, equal semantic results.
- **TAC-3:** Rotation changes only presentation; it never changes generated shapes, clues, ratings or identities for the same semantic recipe.
- **TAC-4:** Fake-clock/stale-revision/history-cap tests cover every terminal status. No rejected candidate enters an exported pack.
- **TAC-5:** `node tools\check-conventions.mjs` passes; no runtime dependency, duplicate engine, eval, main-thread solving or build requirement.

## Test plan

Mock completion order/failures, including ten accepted attempt0 candidates in three pool4 dispatch rounds. Replay the real recipe at widths1/4; test indices1/2 with history and fresh-set replay of index1. Append three cards to five and assert titles6/7/8. Check CLI default676, smaller overrides, side32 enforcement, invalid index/seed pairs, deadlines and duplicate clues. Parse T10’s sample through T11. Timings belong to T21/T23.

## Definition of done & handoff

T18 binds this client to Generator controls; T21 uses the same client and Node adapter for measurement. Publish request/result/error structures and the recipe CLI without requiring other agents to inspect prototypes.

## Execution log

| Field | Value |
| --- | --- |
| Status | Done |
| Start | 2026-10-22 21:04:03 (+07:00) |
| End | 2026-10-22 21:17:06 (+07:00) |
| Duration | 13 min 3 s |
| Model | claude-sonnet-5.5 (sub-agent `T15-gen-client-cli`, general-purpose); ran in parallel with T17, T19 |
| Token usage | 51 model calls; 7,068,402 input (6,869,355 cache read), 102,308 output |
| AI credits | 220.76 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** `node --test tests\generation-client.test.js tests\cli.test.js tests\protocol.test.js tests\generator-state.test.js` → 67 pass / 0 fail; `check-conventions` OK. Agent run: task tests 29 pass (~3.4 s); `node tools\generate.mjs --recipe tests\fixtures\generation-case.json --workers 1` and `--workers 4` both exit 0 with semantically equal packs matching the recipe; 20×18 with 4 workers completes in ~0.7 s; 7×5 easy count 10 → valid partial pack, exit 2, shortfall on stderr; `npm run test:quick` 557 pass; `npm run check` OK.

**Acceptance:** BAC-1..3 and TAC-1..5 pass. In-order streaming; cancel/deadline keep the accepted prefix as a valid pack; newer request leaves the old one `cancelled`; widths 1 and 4 equal (incl. batch index 2 with history and in the CLI); rotation 0/45/90 give identical ids, keys and ratings; all terminal statuses covered; duplicate clue keys never reach the pack; lowest-successful-attempt selection holds under out-of-order completion; titles continue (`Hard #6..#8`) for Add more.

**Issues & resolutions:**
- Latent T14 bug fixed: history keys on `puzzleCandidate` payloads were capped at 512 characters, but keys use 2 characters per cell, so boards over 256 cells with a reused calibration key would be rejected as `invalid-payload`. Cap raised to 2,048 in `core\engine\protocol.js`; 2 assertions added to `tests\protocol.test.js`.
- Speculative-dispatch test initially assumed exactly 10 tasks; the scheduler backfills idle workers with retries by design (§6.9 priorities 3–4), so the test now asserts the first 10 dispatched are the attempt-0 tasks in rounds of at most 4.
- Design choices (no owner input needed): client `GenerationError` is separate from the engine's; the CLI always starts with empty history and reuses the calibration puzzle only for `--batch-index 1`; a CLI run that does not reproduce a recipe's `expected` exits 1 with empty stdout; at a deadline, a set whose lowest successful attempt cannot be confirmed fails with `time-limit` rather than returning a higher attempt.

**Handoff:** `createGenerationClient(pool, {clock?, createdAt?, maxSetAttempts?})` → `{generateSet, generateBatch, cancel, recycle}`. `generateSet({boardRows, rotation, levelId, seedText, uniqueness, maxActive, revision?})` → `{status:'complete'|'failed'|'cancelled', set, calibration, attempt, pack, reason?, failures?}` (piece-set pack). `generateBatch` → `BatchResult` (`batchSeed = setSeed#batchIndex`; pack only if ≥ 1 accepted). Hooks `onProgress`, `onAccepted`, `onCertificate` (idle-priority, dropped if superseded). `GenerationError` codes: `invalid-board`, `invalid-input`, `level-unavailable`, `history-full`, worker/pool codes, `internal`. Calibration reused only with a valid full solution containing its clues. `tools\node-worker.mjs` → `nodeWorkerFactory()`, `adaptNodeWorker(worker)` (also the worker entry; reusable by T21). `tools\generate.mjs` → `run(argv, io?)`, `parseArgs`, `checkRecipe`, `compareExpected`, `packText`, `DEFAULT_MAX_ACTIVE` (676); random default seed printed on stderr.
