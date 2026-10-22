# T14 — Worker dispatch, pool lifecycle, and action watchdogs

**ID:** T14  
**Depends on:** T06, T09, T10, T11  
**Estimated size:** 1,000–1,500 implementation/test lines  
**Owner role:** core / infra  
**Milestone:** MVP
**Design refs:** §8.1–§8.5, §9.5, §13.2.

## Goal & business context

Generation must not block interaction. Cancel must work even during a synchronous search, old results must not replace a new board, and no action may silently restart its two-minute budget for every subtask.

## Scope

**In scope:** validated wire DTOs, shared task dispatch, module worker, worker pool, stale-result handling, idle certificates, memory telemetry and action-level deadlines.  
**Out of scope:** generation scheduling/folding (T15), app controls and BQ performance certification.

## Inputs & context

Wire protocol:

```ts
type TaskKind='setAttempt'|'puzzleCandidate'|'certify'|'rate'|'verifyPack'|'solveFirst';
type Request={type:'task';id:number;kind:TaskKind;payload:object};
type Reply=
 | {type:'progress';id:number;stage:string;rowTrials:number;bytes:number}
 | {type:'result';id:number;value:unknown}
 | {type:'error';id:number;code:string;message:string};
```

Define/export validators from `protocol.js`; malformed/unknown kinds never reach engine execution. IDs are safe nonnegative integers. Engine payloads are plain DTOs, never functions, workspaces, clocks, storage objects or DOM nodes.

Exact additional exports: `parseTaskMessage(input:unknown):Result<Request>` and `parseWorkerMessage(input:unknown):Result<Reply>`. Shared `tasks.js` exports synchronous `executeTask(kind:TaskKind,payload:object,execution:EngineExecution):unknown`. The Node adapter uses these same validators/dispatcher, not a second protocol.

Payload contracts:

| Kind | Fields |
|---|---|
| setAttempt | `{boardRows,rotation,levelId,seedText,uniqueness,attempt}` |
| puzzleCandidate | `{set:{boardRows,pieces,witness,carving,macroRegion},targetLevelId,quantity,batchSeed,uniqueness,seenLayouts:string[],seenClues:string[],slot,attempt}` |
| certify | `{boardRows,pieces,clues,rowLimit}` |
| rate | `{boardRows,pieces,clues}` |
| verifyPack | `{pack}` |
| solveFirst | `{boardRows,pieces,clues,rowLimit,maxSolutions?:1}` |

The worker hydrates Board and Sets, injects its main/scratch workspace into engine contexts, and uses shared `executeTask(kind,payload,execution)` in a new internal `core\engine\tasks.js`. The browser and Node adapter must call this same dispatcher.

Set seedText is UI-normalized and limited to64 code points. Candidate batchSeed is the full internal D41 seed; do not apply the UI64 limit or truncate it. T15 derives it from validated setSeed/batchIndex.

`verifyPack` first validates input. Per puzzle, a valid stored solution proves existence in O(cells); otherwise solve with **2,000,000 row trials**. Return solvable/unsatisfiable/not-verified, where unsatisfiable requires exhausted zero solutions. Do not promote imported ratings or certificates to verified merely because a solution exists.

Result values are exact engine results for setAttempt/puzzleCandidate/rate/certify/solveFirst. `verifyPack` returns `{results:[{index:number,fingerprint:string,status:'solvable'|'unsatisfiable'|'not-verified'}]}`. A malformed pack produces an `invalid-pack` error with structured issues, not an unsatisfiable result. Validate requested row limits as finite integers in0..2,000,000; normal rating/certificate callers still use their fixed policy limits.

Public pool:

```ts
createPool({size,workerFactory?,clock?}):{
 run(task:PoolTask,onProgress?):Promise<unknown>;
 runIdle(task:PoolTask):Promise<unknown>;
 cancelAll():void; recycle():void; size:number;
 beginRequest({requestId,revision,onTimeout?}):void;
 endRequest(requestId:number):void;
};
type PoolTask={requestId:number;revision:string;kind:TaskKind;payload:object};
```

`beginRequest/endRequest` are explicit task-pack extensions resolving the missing logical-action boundary in the design. They do not change existing public methods. All run calls for one action share **one clock**. A new request cancels prior work/idle checks. Match replies through a registry from task ID to request/revision; reject stale promises with a typed AbortError rather than leaving them pending.

Defaults:

- Generator pool `max(1,min(4,navigator.hardwareConcurrency||4))`; player verification pool1.
- Browser worker URL: `new URL('../workers/engine.worker.js',import.meta.url)`, `{type:'module'}`.
- Each worker owns main160 MiB and scratch32 MiB; optional cache32 MiB. No `SharedArrayBuffer`.
- No cooperative `setTimeout(0)` slicing inside workers. Tasks run synchronously under work caps.
- At115,000 ms from `beginRequest`, stop dispatching, terminate busy workers, settle pending promises, notify the action controller. It packages already accepted data by120,000 ms. 60,000 ms is a target, not a cutoff.
- Cancel terminates exact worker instances and lazily replaces them. A new piece set/import/restore recycles cached workers before the next job.
- Main thread does not perform generation/search. No wall time enters engine payload semantics or scoring.

Idle certificates do not start a new generation deadline. They are tagged with a revision/puzzle fingerprint, lowest priority, and cancelled by a new action/Play/Cancel. An ended action may receive an idle result only while its owning revision remains current. Missing/terminated results leave certificate null, not a false negative.

Memory/progress: each worker reports total allocated workspace/cache bytes, including buffer growth. Account these events immediately; throttle only UI display to ≤5 updates/second. Sum per-worker high-water allocations with known main-thread buffers (main budget300 MiB). Never infer browser RSS from Node heap limits.

## Files to create/modify

`core\engine\protocol.js`, `core\engine\tasks.js`; `core\workers\engine.worker.js`; `core\browser\worker-pool.js`; `tests\protocol.test.js`, `tests\worker-pool.test.js`, `tests\tasks.test.js`.

## Implementation steps

1. Define DTO validation and shared hydration/dispatch.
2. Add worker execution, error conversion and memory/progress reporting.
3. Implement a queued pool with injected Worker/clock adapters for tests.
4. Add action clocks, cancellation, stale-result rejection, recycling and idle priority.
5. Test worker errors/exit/late replies and promise settlement.

## Acceptance criteria — Business

- **BAC-1:** Cancel works during a tight search; completed puzzle data owned by the controller is retained.
- **BAC-2:** Editing/importing a new board cannot show an old request’s later result.
- **BAC-3:** Background certificates do not delay Play or replace a current game’s status.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\protocol.test.js" "tests\worker-pool.test.js" "tests\tasks.test.js"` passes.
- **TAC-2:** Fake-clock tests prove one deadline across multiple RPCs, termination at115 s and controller notification early enough for120 s response.
- **TAC-3:** Every rejected/cancelled/failed task promise settles; late messages cannot settle a new task.
- **TAC-4:** Recycle drops old workspaces; allocations above the declared workspace capacity never reach unguarded model filling.
- **TAC-5:** `node tools\check-conventions.mjs` passes; module workers, relative URLs, no eval or shared-memory/header requirement.

## Test plan

Use fake Workers to finish tasks out of order, emit stale IDs/revisions, crash, and never reply. Use a fake clock for correctness deadlines, not 120-second sleeps. T21/T23 verify actual browser cancellation (<200 ms) and real module-worker loading.

## Definition of done & handoff

T15 receives a stable task pool and dispatcher; T19 uses verification tasks. Publish error codes, clock adapter and idle ownership rules. Do not mark browser responsiveness qualified from fake-clock tests.
