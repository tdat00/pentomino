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
