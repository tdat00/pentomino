# MP10a — Auxiliary request method on the generation client and the Player's pool

| Header | Value |
|---|---|
| ID | MP10a (first part of the report's MP10; MP10b1 and MP10b2 build the display rating on it) |
| Depends on | MP09e (accepted and committed); MP09d2 (the worker `rate` task returns a v3 rating or fails with `rating-incomplete`, MP09c) |
| Estimated size | Medium: about 450–650 changed lines (the new module about 150, the client and the Player about 60, tests about 300–400, documents about 40); about 45–60 minutes |
| Owner role | Browser integration |
| Milestone | M6 — display rating |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-29 (auxiliary requests: contract and mechanism, JR-P4 (a)), RES-23 (why the display rating needs it); clarification JR-P4 (a) (plan author); check-list §4.2 D26 |
| Gates owned | none |
| Implementation status | Not started |

## Goal & business context

Puzzles saved or shared before v3 carry an older rating. The owner decided that both apps show them with a rating on
today's scale, computed in the background (RES-23, MP10b1 and MP10b2), and later the Generator replays how a puzzle
was made (MP15b). Both jobs run on the worker that the app already has, as **auxiliary requests**: they must never
stop or replace what the user started — a generation in the Generator, a verification in the Player, hints or
certificates — they never delay a generation or a verification (they wait while one is active), and a new generation
or verification makes them give way (RES-29, plan author's answer JR-P4 (a): an auxiliary method on the existing
client and pool, no second worker pool, which phones could not afford). Lazy certificates and auxiliary tasks share
the pool's idle queue in submission order (`core/browser/worker-pool.js:483-498, 562-564`): an auxiliary task never
cancels or supersedes a certificate, but one idle task may wait for another (cross-review SP05); no stronger latency
promise is made.

This task builds that mechanism and nothing visible: no app shows anything new yet.

## Scope

### In scope

- New `core/browser/auxiliary.js`: the auxiliary queue (contract below).
- `core/browser/generation-client.js`: `submitAuxiliary(kind, payload, { signal })` on the client, wired into
  `begin` and `finish`.
- `player/state.js`: `submitAuxiliary(kind, payload, { signal })` on the Player controller, on its verification pool;
  the `PoolLike` typedef gains `runIdle`.
- Tests: `tests/auxiliary.test.js` (new), new cases in `tests/generation-client.test.js` and
  `tests/player-load.test.js`.
- Documents: `docs/design-detail.md` §8.1; `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` only if their "Code layout"
  lists the `core/browser` modules one by one.

### Out of scope

- Any display of a derived rating, any locale text (MP10b1, MP10b2); the `replayPuzzle` kind (MP15b).
- `core/browser/worker-pool.js`: no change is needed (the pool already accepts idle tasks under an ended request);
  if you find that one is needed, stop and report it with the failing case.
- The hint pool of the Player (`player/hints.js`, a separate pool) and the puzzle-code pools.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- `core/browser/auxiliary.js` is a browser module: `// @ts-check`, JSDoc types, no DOM, no storage, no timers of its
  own; it imports only from `core/browser/worker-pool.js` (`PoolAbortError`, `PoolError`, `isAbortError`).
- Run only the commands of the test plan; no browser page, no gate. Never stage, commit, stash, reset, push or switch
  branches; never edit `tasks/difficulty-v3/`, the reports or `docs/difficulty-v3/`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

### The pool (anchors at HEAD `041ff83`; MP09d2 and MP09e do not change `core/browser/worker-pool.js`)

- `runIdle(task)` (`core/browser/worker-pool.js:573`, `enqueue(task, true)` at 513-568): `task = { requestId, revision,
  kind, payload, signal? }`. It rejects `PoolAbortError('stale')` unless `requestId` and `revision` equal the pool's
  current request, `PoolAbortError('cancelled')` for an already aborted signal, `PoolAbortError('deadline')` under a
  timed-out request; an idle task **is accepted after `endRequest`** (`request.ended && !idle` rejects only normal
  tasks, 537-540). Idle tasks run after normal ones and are preempted (`'preempted'`) when a normal task needs their
  worker (491-499). A task's own `signal` aborts only that task (`'cancelled'`, 555-563).
- `beginRequest({ requestId, revision, onTimeout })` (575-595): `requestId` must increase with every call; it ends the
  previous request and aborts **every** entry, idle ones included, with `'superseded'`. `endRequest(requestId)`
  (597-607) stops the deadline timer (an ended request never times out) and aborts only the non-idle tasks of that
  request. `cancelAll()` (609-615) aborts every entry with `'cancelled'`; `recycle()` (617-626) aborts busy entries with
  `'recycled'`; `close()` rejects with `'closed'`. A request that passes `TIME.dispatchStopMs` (115 s) times out:
  every entry of it is aborted with `'deadline'` (`expire`, 340-353).
- Errors: `PoolAbortError(reason)` (`name` `AbortError`, `code` `aborted`, `reason`), `PoolError(code, message)`
  (transport faults, for example `worker-unavailable`), `WorkerTaskError(code, message, issues)` (the worker ran the
  task and failed, for example `rating-incomplete` from MP09c or `unsatisfiable`); `isAbortError(e)` (125).

### The owners of the pool

- **Generation client** (`core/browser/generation-client.js`, `createGenerationClient`, 425): `lastRequestId` (428)
  is its monotonic allocator; `begin(revision)` (433-450) takes `lastRequestId + 1`, calls `pool.beginRequest`, sets
  `latest`; `finish(job)` (456-459) sets `job.running = false` and calls `pool.endRequest`; `job.timedOut` is set by
  the request's `onTimeout` (441-444) or a `'deadline'` abort (499-501). Every main request goes through `begin`:
  `generateSet`, `generateBatch`, `solveWitness` (1172-1187). Lazy certificates run with `pool.runIdle` under the
  finished job's token (`queueCertificates`, 1147-1169) and are never queued after a timeout (1133). `cancel()`
  (1190-1197) calls `pool.cancelAll()` while a job runs; `recycle()` (1203-1206) cancels, then `pool.recycle()`. The
  returned object (1199-1207) is `{ generateSet, generateBatch, solveWitness, cancel, recycle }`. The Generator app
  also calls `pool.cancelAll()` directly through the controller option `cancelPending` (`generator/app.js:121-129`).
- **Player controller** (`player/state.js`, `createPlayerController`, 236): `requestSeq` (246) is its allocator;
  `getPool()` (254-257) creates the verification pool lazily (one worker); `startVerification(index)` (557-645) skips
  the search for a puzzle with an included answer (583-587: no request at all), otherwise takes `requestSeq += 1`,
  calls `beginRequest({ requestId: id, revision: stamp, onTimeout: () => giveUp(null) })` (611), `run` of
  `verifyPack`, and `endRequest(id)` in `finally` (638-644). `destroy()` (828-833) closes the pool. The typedef
  `PoolLike` (208-213) lists `beginRequest`, `run` (`kind: 'verifyPack'`), `endRequest`, `close`. Test pools in
  `tests/player-load.test.js` (79-115) have no `runIdle`.

### Contract (RES-29; check-list D26)

An auxiliary request is one idle-priority task submitted with `submitAuxiliary(kind, payload, { signal })`:

1. It never calls `beginRequest` or `cancelAll` while a main request (generation or verification) is active, and
   starting, aborting or finishing it never cancels a main task, a hint or a certificate.
2. It **waits** while a main request is active, and starts when that request ends.
3. It runs under the newest usable request token: the token of the last main request when that request ended without
   timing out (an ended token accepts idle tasks); otherwise — a fresh pool, or a last request that timed out — it
   **bootstraps** an idle-only token: the owner's allocator gives the next request id, then `beginRequest({ requestId,
   revision: \`aux-${requestId}\` })` and at once `endRequest(requestId)`. A bootstrap happens only when no main
   request is active and no auxiliary task is running (then nothing of the owner is in flight: a fresh pool has run
   nothing, and a timed-out request had all its entries aborted and queues no certificate).
4. **A new main request aborts it**, waiting or running: the owner tells the queue before its `beginRequest`; the
   submission rejects with `PoolAbortError('cancelled')`.
5. Its own `signal` aborts it, waiting or running: it rejects with `PoolAbortError('cancelled')`; nothing else is
   touched.
6. Any other abort of a running auxiliary task (`'cancelled'` by `cancelAll`, `'recycled'`, `'preempted'`, `'stale'`,
   `'superseded'` without rule 4) is **not** reported: the task goes back to the waiting list and runs again by rules
   2-3 (after `'stale'` or `'superseded'` the token is dropped, so the next start bootstraps). It settles only by rule
   4, rule 5, `'closed'`, the task's value or a non-abort error.
7. A non-abort error is passed through unchanged: `WorkerTaskError` (for example `rating-incomplete`, `unsatisfiable`)
   or `PoolError` (for example `worker-unavailable`). A pool that cannot be created, or that has no `runIdle`, rejects
   the submission with `PoolError('worker-unavailable', …)`.
8. Kinds: the owner's allow-list. Here both owners allow `'rate'` (payload `{ boardRows, pieces, clues }`,
   `core/engine/protocol.js:666`); MP15b adds `'replayPuzzle'` to the Generator's list. Another kind rejects with a
   `TypeError` (a programming error).

### `core/browser/auxiliary.js` (new)

```js
/**
 * @typedef {object} AuxiliaryPool
 * @property {(r: { requestId: number, revision: string }) => void} beginRequest
 * @property {(requestId: number) => void} endRequest
 * @property {(task: { requestId: number, revision: string, kind: string, payload: object, signal?: AbortSignal }) => Promise<unknown>} [runIdle]
 */

/**
 * @typedef {object} AuxiliaryQueue
 * @property {(kind: string, payload: object, options?: { signal?: AbortSignal }) => Promise<unknown>} submit
 * @property {(token: { requestId: number, revision: string }) => void} mainBegin Call before the owner's
 *   `pool.beginRequest` of a main request: rejects every waiting submission and marks every running one (rule 4).
 * @property {(token: { requestId: number, revision: string }, timedOut: boolean) => void} mainEnd Call after the
 *   owner's `pool.endRequest` (also when the request timed out); ignored unless `token.requestId` is the last
 *   `mainBegin`'s. Keeps the token when it did not time out, then starts the waiting submissions.
 * @property {() => void} dispose Rejects every waiting and running submission with `PoolAbortError('closed')`; later
 *   submissions reject the same way.
 */

/**
 * @param {{ getPool: () => AuxiliaryPool, allocate: () => number, kinds: readonly string[] }} options `getPool` may
 *   create the pool lazily (a throw means no worker); `allocate` returns the next id of the owner's monotonic
 *   allocator and is called only for a bootstrap.
 * @returns {AuxiliaryQueue}
 */
export function createAuxiliaryQueue(options) { … }
```

State: `active` (a main request is active), `mainToken` (the last `mainBegin`'s token), `token` (the usable token or
`null`), `waiting` (an array, submission order), `running` (a set), `disposed`. Each submission is an entry `{ kind,
payload, signal, resolve, reject, controller: new AbortController(), byMain: false }`.

```text
submit(kind, payload, { signal }):
  kind not in kinds -> reject TypeError; disposed -> reject PoolAbortError('closed')
  signal?.aborted -> reject PoolAbortError('cancelled')
  entry; on signal 'abort' (once): waiting -> remove it, reject cancelled; running -> entry.controller.abort()
  waiting.push(entry); start(); return the promise

start():
  if disposed or active or waiting is empty: return
  pool = getPool()  (a throw: reject every waiting entry with that error, or PoolError('worker-unavailable', …) when it
                     is not a PoolError; return)
  typeof pool.runIdle !== 'function' -> reject every waiting entry with PoolError('worker-unavailable',
                     'This pool runs no auxiliary tasks'); return
  if token === null:
    if running.size > 0: return            (rule 3; they come back through rule 6)
    id = allocate(); revision = `aux-${id}`; pool.beginRequest({ requestId: id, revision }); pool.endRequest(id)
    token = { requestId: id, revision }
  for each entry of waiting (in order): move it to running and run it:
    pool.runIdle({ requestId: token.requestId, revision: token.revision, kind, payload, signal: entry.controller.signal })
      value -> running.delete(entry); entry.resolve(value)
      error -> running.delete(entry)
        not an abort -> entry.reject(error)                                                    (rule 7)
        entry.signal?.aborted or entry.byMain -> entry.reject(new PoolAbortError('cancelled'))  (rules 4, 5)
        error.reason === 'closed' -> entry.reject(error)
        otherwise -> if error.reason is 'stale' or 'superseded': token = null
                     entry.controller = new AbortController(); waiting.push(entry); queueMicrotask(start)  (rule 6)

mainBegin(t): active = true; mainToken = t; token = null
  reject every waiting entry with PoolAbortError('cancelled') and clear waiting; mark every running entry byMain = true
mainEnd(t, timedOut): if mainToken?.requestId !== t.requestId: return
  active = false; token = timedOut ? null : { requestId: t.requestId, revision: t.revision }; start()
dispose(): disposed = true; reject waiting with PoolAbortError('closed'); abort running controllers and mark them so
  that they reject 'closed'
```

A running entry re-queued by rule 6 keeps its caller's `signal` listener; its new controller is the one the next
`runIdle` receives (abort it when the caller's signal fires while it runs).

### Wiring

- **Generation client.** `const aux = createAuxiliaryQueue({ getPool: () => pool, allocate: () => { lastRequestId +=
  1; return lastRequestId; }, kinds: ['rate'] });`. In `begin`: call `aux.mainBegin({ requestId, revision: tag })`
  immediately before `pool.beginRequest(...)` (the allocator and `begin` share `lastRequestId`, so ids stay
  increasing). In `finish(job)`: after `pool.endRequest(job.requestId)`, `aux.mainEnd({ requestId: job.requestId,
  revision: job.revision }, job.timedOut)`. Add `submitAuxiliary: (kind, payload, options) => aux.submit(kind, payload,
  options ?? {})` to the returned object and to the `GenerationClient` typedef. `cancel()` and `recycle()` stay as
  they are (rule 6 keeps the auxiliary task).
- **Player controller.** `const aux = createAuxiliaryQueue({ getPool, allocate: () => { requestSeq += 1; return
  requestSeq; }, kinds: ['rate'] });`. In `startVerification`, after `active = getPool()` succeeded and before
  `active.beginRequest(...)`: `aux.mainBegin({ requestId: id, revision: stamp })`; keep a local `let timedOut =
  false` set in `onTimeout`; in the existing `finally`, after `active.endRequest(id)`: `aux.mainEnd({ requestId: id,
  revision: stamp }, timedOut)`. When `getPool()` or `beginRequest` throws, nothing is begun: do not call `mainBegin`
  (move the call between the two statements accordingly, or call `mainEnd(…, true)` in that `catch`). Add
  `submitAuxiliary: (kind, payload, o) => aux.submit(kind, payload, o ?? {})` to the returned controller; in
  `destroy()`, call `aux.dispose()` before `pool?.close()`. Extend `PoolLike` with
  `@property {(task: { requestId: number, revision: string, kind: 'rate', payload: object, signal?: AbortSignal }) =>
  Promise<unknown>} [runIdle]`.

## Files to create/modify

| File | Change |
|---|---|
| `core/browser/auxiliary.js` (new) | `createAuxiliaryQueue` |
| `core/browser/generation-client.js` | the queue, `begin` / `finish` calls, `submitAuxiliary`, typedef |
| `player/state.js` | the queue, `startVerification` calls, `submitAuxiliary`, `destroy`, `PoolLike` |
| `tools/bench/report.js` | one `SOURCE_FILES` entry, `'core/browser/auxiliary.js'`, after `'core/browser/generation-client.js'` (lines 37-48; cross-review TP18: the benchmarked generation client imports it, so the source digest must cover it) |
| `tests/auxiliary.test.js` (new) | the queue's cases |
| `tests/generation-client.test.js`, `tests/player-load.test.js` | integration cases (new tests only) |
| `docs/design-detail.md` | §8.1 |
| `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | only if "Code layout" lists the browser modules |

Exclusive ownership while active: the files above. Documentation slot: `docs/design-detail.md` §8.1 (and the
developer guides as stated). Must not edit: `core/browser/worker-pool.js`, the apps' UI and locale files, engine files.

### `docs/design-detail.md` §8.1 (line 1734)

Add a paragraph **Auxiliary requests** after "Request tracking (main thread)": the eight rules of the contract in
prose (an auxiliary request is an idle task that shares the pool of the main work; it waits for the active main
request, reuses the last ended token or bootstraps an idle-only token with the next request id; a new main request or
its own signal aborts it and it reports `cancelled`; any other abort puts it back in the queue; it never cancels main
work, hints or certificates); the users (the derived display rating in both apps, §7.7; the Generation Steps replay,
later); the module `core/browser/auxiliary.js`; and in the "Request tracking" bullets, that a new user action cancels
lazy certificates **and auxiliary requests**.

## Implementation steps

1. Write `core/browser/auxiliary.js` and `tests/auxiliary.test.js`; run the test file.
2. Wire the generation client; add its cases; run `tests\generation-client.test.js`.
3. Wire the Player controller; add its cases; run `tests\player-load.test.js`.
4. Documents; `npm run test:quick`; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP10a-B01 | Background work of the display rating and the replay can never stop or replace a generation, a verification, a hint or a certificate, and never delays a generation or a verification (it waits while one is active); it shares the idle queue with certificates in submission order (RES-29: it never cancels or supersedes them) | overlap tests (both owners) |
| MP10a-B02 | A new generation or verification makes background work give way at once; a background job that the user closes stops at once | abort tests |
| MP10a-B03 | The first background job of a freshly opened app works without any earlier generation or verification (a stored answer skips verification) | cold-start tests |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP10a-T01 | `createAuxiliaryQueue` follows rules 1-8 exactly: waits while a main request is active; reuses an ended, non-timed-out token; bootstraps with one allocator id (`beginRequest` then `endRequest`) only when nothing is active or running; re-queues on other aborts; reports `cancelled` only for its own signal and a new main request; passes errors through | `tests/auxiliary.test.js` |
| MP10a-T02 | `client.submitAuxiliary` and `controller.submitAuxiliary` exist with the stated signature; `begin`, `finish` and `startVerification` notify the queue; request ids stay strictly increasing across main and bootstrap requests | integration tests |
| MP10a-T03 | A generation batch and a Player verification give exactly the same results with and without a concurrent auxiliary request (accepted puzzles, certificates, verification status) | integration tests |
| MP10a-T04 | `worker-pool.js` is unchanged; existing tests are unchanged; `SOURCE_FILES` lists `core/browser/auxiliary.js` (no UI or display file); `tests/benchmark-report.test.js`, `npm run test:quick` and `npm run check` pass | diff; command output |
| MP10a-T05 | Design §8.1 describes the mechanism | review |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests\auxiliary.test.js tests\generation-client.test.js tests\player-load.test.js tests\worker-pool.test.js tests\benchmark-report.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required test cases

`tests/auxiliary.test.js` uses the real `createPool` with scripted workers and a fake clock (copy the small
`FakeWorker`, `createFakeClock` and `harness` helpers of `tests/generation-client.test.js:26-133` into the new file;
a held task is answered by the test). `allocate` is a counter that the test inspects.

The queue states the tests use are only the reachable ones (cross-review SP05): an auxiliary submission **waits**
while a main request is active and **runs** only while none is active (rules 2-3), so "running beside an active main
request" never occurs; every start runs all waiting entries at once.

1. Cold start: `submit('rate', p)` → one `beginRequest({ requestId: 1, revision: 'aux-1' })`, one `endRequest(1)`, one
   posted `rate` task under that token; the scripted value resolves the promise; the allocator advanced once.
2. Token reuse: `mainBegin(t)`, the pool's `beginRequest(t)`, `endRequest`, `mainEnd(t, false)`; then `submit` → no
   new `beginRequest`, the task carries `t`; the allocator did not advance.
3. Waiting: `submit` while a main request is active → nothing posted; `mainEnd` → posted and resolved.
4. New main request, two cases. (a) Running: two submissions run under an ended token (held, no main request
   active); `mainBegin(t2)` then the pool's `beginRequest(t2)` → both reject with `PoolAbortError` whose `reason` is
   `'cancelled'` (rule 4, even though the pool aborted them as stale or superseded); a main task of `t2` then runs
   normally. (b) Waiting: a submission waits while main request `t1` is active (its task held); `mainBegin(t2)` →
   it rejects `cancelled` at once and was never posted.
5. Own signal, two cases. (a) Waiting beside main work: a submission waits while a main request is active with a held
   main task; aborting its signal rejects `cancelled`, posts nothing, and the held main task then resolves with its
   value unchanged. (b) Running beside a certificate: no main request is active; a lazy certificate of the ended token
   (`pool.runIdle` with kind `certify`, held) and a running auxiliary task (held); aborting the auxiliary signal
   rejects `cancelled`; the certificate then resolves with its value.
6. Timed out: `mainEnd(t, true)` → the next `submit` bootstraps a new token (allocator + 1).
7. Re-queue with no main request active: a running auxiliary task under an ended token (held); the owner calls
   `pool.cancelAll()` (as `client.cancel()` or the Generator's `cancelPending` do) → the promise does not settle; the
   task is posted again under the same token (rule 6) and resolves once with the second answer. The same with
   `pool.recycle()`.
8. Errors: a `rate` task answered `{ error: 'rating-incomplete' }` rejects with a `WorkerTaskError` of that code; a
   `getPool` that throws `PoolError('worker-unavailable', …)` rejects with it; a pool without `runIdle` rejects with
   `PoolError` code `worker-unavailable`; an unknown kind rejects with `TypeError`.
9. `dispose()` rejects the waiting and the running submissions with reason `'closed'`; a later `submit` too.

`tests/generation-client.test.js` (new `describe('auxiliary requests', …)`, the existing `harness` and `clientOf`):

10. A fresh client: `client.submitAuxiliary('rate', payload)` resolves with the scripted value (bootstrap).
11. During `generateBatch` (certify tasks held): an auxiliary request submitted while the batch runs waits; the batch's
    accepted puzzles equal those of the same batch without it; after the batch it resolves; the held certificates are
    still delivered (`onCertificate`) afterwards (possibly after the auxiliary task: the idle queue is FIFO).
12. A second `generateBatch` started while an auxiliary request waits rejects it with `cancelled` and completes like a
    batch without it.
13. A batch that times out (advance the fake clock past `TIME.dispatchStopMs`): a later auxiliary request bootstraps a
    new token and resolves; the next `generateBatch` still gets a strictly larger request id.
14. `client.cancel()` during a batch (the auxiliary request waits) does not reject it; it is posted after the batch
    ends and resolves.

`tests/player-load.test.js` (a scripted pool object with `beginRequest`, `endRequest`, `run`, `runIdle` and `close`
that records calls; `setup` from line 117):

15. A pack whose puzzle has an included answer (no verification request): `controller.submitAuxiliary('rate', …)`
    bootstraps (`beginRequest` then `endRequest` with the next `requestSeq`) and resolves.
16. A verification in flight (its `run` held): an auxiliary request waits; the verification result is applied as
    before; then the auxiliary task runs under the verification's ended token.
17. Moving to another puzzle starts a new verification and rejects a waiting auxiliary request with `cancelled`;
    `verificationByPuzzle` is the same as without it.
18. `destroy()` rejects a waiting auxiliary request with `closed`.

## Definition of done & handoff

- Every criterion has its evidence; the reply lists the new exports and the test counts.
- Handoff to MP10b1 and MP10b2: `controller.submitAuxiliary('rate', { boardRows, pieces, clues }, { signal })` (Player)
  and `client.submitAuxiliary(…)` (Generator) resolve with a `RatingV3` or reject with `PoolAbortError('cancelled')`,
  `PoolAbortError('closed')`, `WorkerTaskError` (`rating-incomplete`, `unsatisfiable`, …) or `PoolError`
  (`worker-unavailable`, …). To MP15b: add `'replayPuzzle'` to the Generator's `kinds`.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP10a: Auxiliary request method on the generation client and the Player's pool`) |
| Start | 2026-11-13 08:05 (+07:00) |
| End | 2026-11-13 08:19 developer; 08:30 orchestrator review and commit |
| Duration | 14 min developer; about 10 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 66 model calls; 9,224,239 input tokens (9,023,585 cache reads); 96,696 output tokens |
| AI credits | about 237 (developer) |
| Verification | Developer: targeted `node --test --test-skip-pattern=slow` on the five files 144/144 (23 s); `npm run test:quick` 1284/1284 (27 s); `npm run check` OK; `record-fixtures --check` OK; two mutation checks in `auxiliary.js` caught and restored. Orchestrator re-run: `tests\auxiliary.test.js`, `generation-client`, `player-load`, `worker-pool`, `bench-report` 116/116; `test:quick` 1284/1284; `check` OK; `record-fixtures --check` OK |
| Acceptance | MP10a-B01..B03 and T01..T05 met. Diff reviewed: `createAuxiliaryQueue` (new `core/browser/auxiliary.js`) waits while a main request is active, reuses the ended request's token (dropped after a time-out, a `stale`, `superseded`, `deadline` or `ended` abort), re-queues a pool abort, rejects with `cancelled` on a new main request or its own signal and with `closed` on `dispose`, bootstraps a token on a cold pool and never throws into `finish`; the generation client's `begin` / `finish` and the Player's `startVerification` notify it; `submitAuxiliary` on both owners; `core/browser/worker-pool.js` unchanged and no existing test edited; `SOURCE_FILES` covers the new module; design §8.1 "Auxiliary requests" with the eight rules |
| Issues & resolutions | (1) §8.1 was at line 1912 (not 1734); located by name. (2) Documentation beyond §8.1, by AGENTS.md (the design describes the current code): `auxiliary.js` in the `core/browser` file tree and the §4.3 module table, `submitAuxiliary` in the `generation-client.js` row, "and auxiliary" in the `runIdle` sentence; accepted. (3) Rule 6 also drops the token on `deadline` and `ended` (otherwise a re-run under a timed-out token could loop); unreachable today; accepted. (4) The developer guides list layers, not modules: unchanged. (5) `tsc` is not installed and not in the test plan |
| Handoff | MP10b1: `controller.submitAuxiliary('rate', { boardRows, pieces, clues }, { signal })` in the Player and `client.submitAuxiliary(...)` in the Generator resolve a `RatingV3` or reject with `PoolAbortError` (`cancelled`, `closed`), `WorkerTaskError` (`rating-incomplete`, `unsatisfiable`) or `PoolError` (`worker-unavailable`); a new generation or verification cancels a pending rating, so a caller that still wants it resubmits; a pool without `runIdle` (the Player's default test `enginePool`) rejects with `worker-unavailable`. MP15b: add `'replayPuzzle'` to the `kinds` array in `createGenerationClient` |
