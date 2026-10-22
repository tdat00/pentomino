# T10 — Layout discovery, set attempts, and strict deterministic batches

**ID:** T10  
**Depends on:** T08, T09  
**Estimated size:** 1,000–1,500 implementation/test lines  
**Owner role:** core  
**Milestone:** MVP
**Design refs:** §6.5, §6.7–§6.9, §8.2, §8.6, §13.2.

## Goal & business context

New Puzzles must rearrange the same pieces, not fill a requested quantity with different clues on one layout. Parallelism must change speed, never which result wins.

## Scope

**In scope:** remaining discovery exports in `tiling.js`, set-attempt task, puzzle candidate task, deterministic fold and successful integration fixtures.  
**Out of scope:** worker transport, timers, UI and file encoding.

## Inputs & context

Required discovery exports:

```ts
randomTiling(board,pieces,rng,ws,
 o:{clues?:Pose[];totalRowTrials:number;restartBase:number}):Pose[]|null;
lnsStep(board,pieces,layout,cluster:number[],rng,ws,
 o:{rowTrialLimit:number;maxSolutions:number}):Pose[]|null;
lnsWalk(set:PieceSet,start:Pose[],rng,ws,steps:number):Pose[];
```

`cluster` indexes `set.pieces`; the stored `macroRegion` array is parallel to that array, not solver-column order. Every returned layout includes all pieces and preserves fixed outside-cluster footprints.

Required generation exports:

```ts
setAttempt(req:SetRequest,attempt:number):SetAttemptResult;
puzzleCandidate(ctx:BatchContext,slot:number,attempt:number):
 PuzzleCandidate|{fail:'layout'|'not-in-band'|'uniqueness-not-proved'};
certifyTask(ctx:BatchContext,clues:Pose[]):Certificate;
foldStart(ctx:BatchContext):FoldState;
foldNext(s:FoldState):{slot:number;attempt:number}|null;
foldAccept(s:FoldState,c:PuzzleCandidate|{fail:string}):FoldState;
```

Engine-only contracts (not worker DTOs):

```ts
SetRequest={board,rotation,levelId,seedText,uniqueness,execution};
EngineExecution={main:Workspace,scratch:Workspace,onProgress?:callback};
BatchContext={set,targetLevelId,quantity,batchSeed,uniqueness,
 seenLayouts:ReadonlySet<string>,seenClues:ReadonlySet<string>,calibration?:Puzzle,execution};
PuzzleCandidate={layout,layoutKey,clueKey,clues,rating,certificate};
```

Set-attempt stream contract:

```text
rng=createRng(normalizeSeedText(req.seedText),'set/'+attempt)
ks=pieceCountRange(req.levelId,A); K=ks[rng.int(ks.length)]
if A/K>=6.5: carving=carveMacro(...,rng.derive('macro'),BUDGETS)
if no macro result: carving=carveFlatSet(...,rng.derive('flat'),BUDGETS)
if no carving: fail('carve')
set=finalizeSet(...); if validateSet has issues: fail('internal')
cal=selectClues(...set.witness,rng.derive('cal'),target,uniqueness)
if !cal.ok: fail(cal.reason)
return {ok:true,set,calibration:calibrationPuzzle,attempt}
```

Choose K only from the root `set/j` stream. Macro/flat/calibration branches never share a consumed stream accidentally. Preserve the witness and mapping; display rotation never changes RNG labels.

LNS:

- Macro sets: pick a macro region uniformly and release its current pieces; every eighth step (`s%8===7`) broaden through current piece adjacency, up to nine pieces total.
- Flat/imported: `k=min(K,6+rng.int(8)+2*floor(stuck/4))`; seeded BFS from one piece over edge adjacency.
- Fix every other piece; build the subproblem in the **scratch** workspace. Search seeded, at most eight solutions, 3,000 rows for macro or5,000 for flat.
- Choose a genuinely different returned cluster placement; validate the complete result independently.
- Walk eight steps; reset stuck count after a successful step. A group always retiles its current cell union, not an obsolete rectangle.
- Only A≤150 uses global Luby restarts. Sequence `1,1,2,1,1,2,4,...`; base2,000, total100,000 row trials. Clamp each restart to remaining total budget. An exhausted zero-solution search returns null immediately, including a zero-row dead end; do not restart forever without consuming the budget.
- Each restart i uses `rng.derive('r'+i)`; candidate restart/walk/clue streams are `derive('restart')`, `derive('walk')`, `derive('clues')`.

For one-based i, let k be the smallest integer with `i<=2^k−1`: `luby(i)=2^(k−1)` when equality holds, otherwise `luby(i−2^(k−1)+1)`. This fully specifies the restart schedule.

Puzzle candidate:

```text
rng=createRng(batchSeed,'slot/'+slot+'/'+attempt)
start=set.witness
if A<=150 and attempt%3==2: try randomTiling with rng.derive('restart')
layout=lnsWalk(...rng.derive('walk'),8)
if layoutKey already in the task's seen snapshot: fail layout
selectClues(...rng.derive('clues'),target,uniqueness,excludeClueKeys)
return complete candidate or explicit failure
```

Fold state must explicitly retain slot, attempt, distance threshold, reject count, `best`, `bestDistance=-Infinity`, failure counts initialized to zero, accepted candidates and seen keys. It is independent of wall-clock time.

Export a FoldState typedef with `status:'running'|'complete'|'partial'`, `reason?`, `slot`, `attempt`, `distance`, `rejected`, `best`, `bestDistance`, `failCounts`, `accepted:PuzzleCandidate[]`, growing `seenLayouts/seenClues`, and frozen `initialSeenLayouts/initialSeenClues`. The host maps accepted candidates to wire puzzles; the fold does not read clocks or generate timestamps.

1. Quantity is1–10. A matching, unseen calibration puzzle fills slot1.
2. Consume candidates strictly in `(slot,attempt)` order; at most12 attempts per slot.
3. A candidate is valid only when both full-layout and clue keys are new.
4. Start preferred distance `clamp(ceil(K/4),3,10)`. Accept when the minimum distance to accepted layouts meets it.
5. Otherwise remember the farthest valid candidate; ties keep the earliest attempt. Reduce preference by one per four rejections, floor2.
6. At slot exhaustion accept the remembered candidate if any and add both keys. Otherwise return partial.
7. Partial reason is the most frequent failure: layout→`layouts-not-found`, not-in-band→`difficulty-not-found`, uniqueness→`uniqueness-not-proved`; ties resolve in that order.
8. Each seen-key set holds at most1,000 entries. Preflight enough remaining capacity for the requested quantity; otherwise return a `history-full` control error before dispatch, asking for explicit reset or a smaller quantity. Do not add a new partial-reason spelling or silently evict identities.

A scheduler may speculate, but every candidate uses the same **frozen request-start history**, including a calibration puzzle accepted before dispatch. The fold keeps its own growing seen sets and rejects conflicts created by earlier slots. Do not mutate candidate context when another worker finishes; this makes one- and four-worker executions agree without timing-dependent payloads.

Dispatch priority (distinct from fold consumption order): (1) awaited attempt of the current slot; (2) attempt0 of later unfilled slots, ascending; (3) further attempts of the current slot; (4) later-slot retries. Keep at most poolSize in flight and cache by `(slot,attempt)`. Never dispatch lexicographically through all current-slot retries before first attempts of later slots.

## Files to create/modify

Extend only the discovery portion of `core\engine\tiling.js`; create `core\engine\generate.js` with exported FoldState/result JSDoc types; add `tools\record-fixtures.mjs`, `tests\generate.test.js`, `tests\discovery.test.js`, `tests\fixtures\generation-case.json`, `tests\fixtures\generated-sample-pack.json`. Do not edit shared typedefs concurrently with other core tasks.

## Implementation steps

1. Add bounded restarts and local re-tiling without changing canonical rating search.
2. Implement set attempts and target calibration.
3. Implement candidate generation and the explicit fold state machine.
4. Record a successful 10×6 recipe producing ten distinct Hard puzzles. From three different layouts of that set, find and independently verify Easy/Normal/Hard clue subsets and write the sample fixture envelope below.
5. Test a simulated scheduler with shuffled completion orders and widths1–4.

## Acceptance criteria — Business

- **BAC-1:** Every accepted batch keeps exactly the same board, shapes, IDs and colors.
- **BAC-2:** Ten requested may return fewer with the correct reason; never add a clue-only variant or mislabel a puzzle.
- **BAC-3:** Same inputs, seed, versions and history produce the same accepted sequence irrespective of completion order.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\discovery.test.js" "tests\generate.test.js"` passes.
- **TAC-2:** Macro sets at 10×6/K8 and 20×18/K18 produce at least two layout keys in at least90% of a fixed 50-seed fixture suite; every emitted layout passes `isValidLayout`.
- **TAC-3:** Best-distance fallback, equal-distance tie, duplicate keys, exhausted attempts, all three partial reasons and history-cap behavior are tested.
- **TAC-4:** Pool-size/completion-order simulations produce byte-equal semantic results; candidate snapshots remain frozen and fold conflicts are handled in index order.
- **TAC-5:** `node tools\check-conventions.mjs` passes; no clocks, worker APIs or runtime dependencies in the engine.

The recipe schema is `{version:1,boardRows:string[],rotation:0,levelId:'hard',quantity:10,seedText:string,batchIndex:1,batchSeed:string,uniqueness:'any',versions:{algo:'gen-v2',policy:'mixed-v2',rng:'xoshiro128ss-v1',model:'difficulty-v2'},expected:{pieceKeys:string[],layoutKeys:string[],clueKeys:string[],scores:number[]}}`. `batchSeed` must equal `seedText+"#1"`. The sample is an ordinary Pack. The recorder may search set seeds `fixture-set-N` for N=0..49 once; batches use that set seed plus `#1`, `#2`, etc., never an unrelated random seed. Failure of all seeds is a blocker. `--create` refuses existing fixtures; `--check` replays without rewriting; `--replace` requires an approved semantic/version change.

The sample fixture writes `{format:'pentomino-pack',version:1,kind:'puzzle-pack',rules:'free-polyomino-v1',board:{rows},presentation:{rotation:0},pieces,witness,puzzles:[{id,title,clues,solution,rating}],generation:{app:'pentomino-generator/1.0.0',algo:'gen-v2',policy:'mixed-v2',rng:'xoshiro128ss-v1',seedScheme:'seed-sha256-v1',setSeed}}`. Its three puzzle titles/ratings are Easy, Normal and Hard, with distinct layouts/clue keys, canonical poses and no certificate claim. Constructing this fixed fixture needs no runtime dependency on T11; T15/T19 additionally validate its wire schema through T11 before use.

## Test plan

Use a rigid partial fixture, a reflected duplicate, and a new layout with a repeated clue key. Assert finite work counts, named stream derivation and Luby totals. In a fake scheduler where every attempt0 is accepted, q10 with pool4 must complete in three dispatch rounds. The real fixture also exercises consecutive `#1`/`#2` batches with carried history and fresh-set replay of `#1`. Never let successful-fixture tests pass when no puzzle is returned.

## Definition of done & handoff

T14 dispatches these pure tasks; T15 implements orchestration and the CLI. T19 uses the generated sample pack, revalidating it before copying. The recorded recipe and sample provide reproducible fixtures without consulting any prototype.

## Execution log

| Field | Value |
| --- | --- |
| Status | Done |
| Start | 2026-10-22 20:34:10 (+07:00) |
| End | 2026-10-22 20:47:34 (+07:00) |
| Duration | 13 min 24 s |
| Model | claude-sonnet-5.5 (sub-agent `T10-batches`, general-purpose); ran in parallel with T12, T13 |
| Token usage | 46 model calls; 5,844,680 input (5,676,268 cache read), 93,118 output |
| AI credits | 191.98 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** quick run of `tests\discovery.test.js`, `tests\generate.test.js`, `tests\tiling.test.js` → 55 pass / 0 fail in 5.7 s; full task tests at agent finish 45 pass (~14 s incl. slow); `npm run test:quick` 429 pass / 0 fail; `node tools\record-fixtures.mjs --check` → OK; `check-conventions` OK. No clocks, workers or `Math.random` in `generate.js`/`tiling.js`.

**Acceptance:** BAC-1..3 and TAC-1..5 pass. Second batch (`#2`, carried history) reuses the same set unchanged; clue-only variants are rejected as layout duplicates; 10 requested puzzles complete in the fixture; pool widths 1–4 × 3 shuffled completion orders reproduce the serial fold on `fixture-set-0` and `fixture-set-1`; 10×6 K8 discovery meets ≥ 45/50; 20×18 K18 (slow, ~5.5 s) valid; history cap enforced by preflight (no eviction); q10 with all attempt-0 accepted takes `ceil(10/width)` rounds.

**Issues & resolutions:**
- Random 4-piece clusters in a 6×10 pentomino tiling are almost always rigid; the `lnsStep` test now draws clusters from `clusterFor`.
- The best-distance fallback is reachable only with large K (preference floor 2); tests override `preferred` on the state to exercise it with the 12-piece fixture.
- `fixture-set-1` (flat, K=11) simulation ~8 s → marked slow.
- `setAttempt` failure reasons `carve`, `internal`, `not-in-band`, `uniqueness-not-proved` could not be provoked with real boards; they are covered through fold tests only (residual risk noted).
- Added optional diagnostic `onRestart` to `randomTiling` to test the Luby restart clamp.
- Shared-file edit: `core\engine\tiling.js` additive only (existing exports unchanged; new imports `BUDGETS`, `PieceSet` typedef).

**Handoff:** `tiling.js` additions → `luby`, `randomTiling` (optional `onRestart`), `lnsStep`, `lnsWalk`, `clusterFor`, `RestartInfo`. `generate.js` → `setAttempt`, `firstSetAttempt(req, max = 32)`, `puzzleCandidate`, `certifyTask`, fold API `foldStart`/`foldNext`/`foldAccept` (returns new state)/`runFold(ctx, candidateFn?)`, scheduler helpers `candidateContext(ctx, s)` and `dispatchOrder(s, have, limit)`, `GenerationError('history-full')` from `foldStart`, RangeError for quantity outside 1–10; typedefs `FoldState`, `FailReason`, `PartialReason`, `CandidateFailure`. T14 must pass `candidateContext(ctx, state)` to every candidate task (frozen request-start history incl. reused calibration puzzle). Candidates use `execution.scratch` for LNS/random tiling and `execution.main` for clue selection. Recorded recipe `fixture-set-0` / `fixture-set-0#1` (macro K9 → 10 Hard puzzles); `tools\record-fixtures.mjs` exports `replayRecipe`, `buildSample`, `verifySample` (`--create`, `--check`, `--replace --reason`).
