# MP15b — Replay worker task, protocol and client

| Header | Value |
|---|---|
| ID | MP15b (second part of the report's MP15) |
| Depends on | MP15a2 (accepted and committed: `replayPuzzle`, `ReplayResult`; with MP15a1's `runReplay` and `REPLAY`); MP10a's auxiliary queue (`submitAuxiliary`, `kinds`) |
| Estimated size | Medium: about 350–500 changed lines (protocol about 50, tasks about 15, client about 40, tests about 250, documents about 25); about 40 minutes |
| Owner role | Browser integration |
| Milestone | M9 — Generation Steps |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-29 (worker task kind, auxiliary requests: contract and mechanism, tests), RES-20 (the replay kind is the only protocol change of the plan); clarification JR-P4 (a) (plan author); check-list §4.2 D26 |
| Gates owned | none |
| Implementation status | Not started |

## Goal & business context

The Generation Steps dialog (MP16a, MP16b) must never freeze the page or disturb a running generation. The replay
therefore runs in the Generator's existing worker, as an **auxiliary request** (RES-29, plan author's answer JR-P4
(a)): it waits while a generation is active, never cancels or replaces it, is cancelled by its own signal when the
dialog closes, and gives way when a new generation starts. This task adds the worker task kind `replayPuzzle`, its
bounded payload reader, and a client method that submits it on the auxiliary path.

## Scope

### In scope

- `core/engine/protocol.js`: `replayPuzzle` in `TaskKind`, `TASK_KINDS`, `PAYLOAD_FIELDS` and `PAYLOADS`; a bounded
  reader of the replay payload.
- `core/engine/tasks.js`: the `replayPuzzle` case of `executeTask`.
- `core/browser/generation-client.js`: `'replayPuzzle'` in the auxiliary queue's `kinds`; a client method
  `replayPuzzle(input, { signal })`.
- Tests: `tests/protocol.test.js`, `tests/tasks.test.js`, `tests/generation-client.test.js`.
- Documents: `docs/design-detail.md` §8.1.

### Out of scope

- The Player (its auxiliary kinds stay `['rate']`); the dialog and the card button (MP16a, MP16b).
- `core/browser/worker-pool.js` and `core/browser/auxiliary.js`: no change (the auxiliary queue of MP10a already
  takes a list of kinds). If a change seems needed, stop and report it with the failing case.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Run only the commands of the test plan; no browser page, no gate. Never stage, commit, stash, reset, push or switch
  branches; never edit `tasks/difficulty-v3/`, the reports or `docs/difficulty-v3/`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

Anchors are at HEAD `60575a4`; MP09c and MP10a edited `tasks.js` and `generation-client.js`: find moved lines by the
quoted text.

### Protocol (`core/engine/protocol.js`)

- `TaskKind` typedef (line 17) and `TASK_KINDS` (lines 34-37): add `'replayPuzzle'` (at the end of both).
- `PAYLOAD_FIELDS` (line 660): `replayPuzzle: { required: ['set', 'puzzle', 'generation'] }`.
- `PAYLOADS` (line 571): a `replayPuzzle(ctx, o)` entry:

  ```text
  set        = readSet(ctx, o.set, 'payload.set')                      // the wire set of puzzleCandidate (line 397)
  puzzle     = readObject(ctx, o.puzzle, 'payload.puzzle', ['id', 'clues'], ['solution', 'rating'])
               id: readString(…, MAX_ID_LENGTH); clues: readPoses(…, MAX_BOARD_CELLS);
               solution: absent or null -> null, else readPoses(…, MAX_BOARD_CELLS);
               rating: readRatingClaim(…) (null when absent)
  generation = readObject(ctx, o.generation, 'payload.generation', [], ['setOrigin', 'made'])
               setOrigin: absent -> omitted; else a plain object copied with readJson(…, MAX_JSON_DEPTH, { nodes: MAX_JSON_NODES })
               made: absent -> omitted; else a plain object with at most one own key, copied the same way
  returns { set, puzzle: { id, clues, solution, rating }, generation: { setOrigin?, made? } } or undefined
  ```

  The protocol checks structure and size only; the engine (`readProvenance` inside `replayPuzzle`) decides whether
  the records are valid, so an invalid record is a replay result (`unavailable`), not a protocol error. Results pass
  through `parseWorkerMessage` unchanged (lines 845-850), so the `ReplayResult` needs no reader.

### Worker task (`core/engine/tasks.js`)

In `executeTask` (line 152), after the `rate` case:

```js
case 'replayPuzzle':
  return replayPuzzle({ set: hydrateSet(p.set), puzzle: p.puzzle, generation: p.generation },
    { ws: execution.main, scratch: execution.scratch });
```

(`hydrateSet` is the helper the `puzzleCandidate` case uses.) Errors map as today in `errorReply`: a `RangeError`
from `replayPuzzle` becomes `invalid-request` (the `RangeError` / `TypeError` branch); engine errors keep their
codes. Cancellation of a running replay is the pool's (it terminates or recycles the worker); `isCancelled` is not
used in the worker.

### Client (`core/browser/generation-client.js`)

- MP10a created the auxiliary queue with `kinds: ['rate']`; make it `['rate', 'replayPuzzle']`.
- New method on the client (and in the `GenerationClient` typedef near line 150):

  ```js
  /**
   * Generation Steps (RES-29): replays one puzzle on the auxiliary path. It waits while a generation is active, never
   * cancels one, and is cancelled by `signal` or by a new generation.
   * @param {{ set: PieceSet, puzzle: Puzzle, setOrigin: SetOrigin | null, made: Made | null }} input
   * @param {{ signal?: AbortSignal }} [options]
   * @returns {Promise<import('../engine/replay.js').ReplayResult>}
   */
  replayPuzzle(input, options = {})
  ```

  Payload: `{ set: wireSet(input.set), puzzle: { id, clues, solution: puzzle.solution ?? null, rating: puzzle.rating
  ?? null }, generation: { ...(setOrigin === null ? {} : { setOrigin }), ...(made === null ? {} : { made: {
  [puzzle.id]: made } }) } }`, then `submitAuxiliary('replayPuzzle', payload, { signal })`. It rejects exactly as
  `submitAuxiliary` does: `PoolAbortError('cancelled')` (own signal, or a new generation began), `'closed'`,
  `WorkerTaskError` (for example `invalid-request`), `PoolError` (`worker-unavailable`).

### The auxiliary contract (RES-29; MP10a's rules, unchanged)

Never calls `beginRequest` or `cancelAll` while a generation request is active; waits while one is active; reuses an
ended, non-timed-out token or bootstraps one when the pool is otherwise idle; its own signal cancels only it; a new
generation aborts waiting and running auxiliary requests (`cancelled`); starting or closing it never cancels a
generation, a hint or a certificate.

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/protocol.js` | the kind, its fields and its payload reader |
| `core/engine/tasks.js` | the `replayPuzzle` case; the import of `replayPuzzle` |
| `core/browser/generation-client.js` | the auxiliary kind; `replayPuzzle` |
| `tests/protocol.test.js` | cases 1–3 |
| `tests/tasks.test.js` | cases 4–6 |
| `tests/generation-client.test.js` | cases 7–11 |
| `docs/design-detail.md` | §8.1 |

Exclusive ownership while this task runs: the files above.

### Documentation slot

§8.1 "Worker pool and protocol" (line 1764 at HEAD): the `replayPuzzle` task kind (payload, result, errors) and that
it runs only on the auxiliary path (link §6.12).

## Implementation steps

1. Protocol kind, fields and reader; the task case.
2. The client kind and method.
3. Tests; the document; the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP15b-B01 | A puzzle can be replayed in the Generator's worker without freezing the page | cases 4, 10 |
| MP15b-B02 | A replay never stops, delays or replaces a generation; a new generation makes it give way; closing the dialog cancels only the replay | cases 7–9 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP15b-T01 | `replayPuzzle` is a task kind with a bounded payload reader (structure and size only); malformed payloads are protocol errors | cases 1–3 |
| MP15b-T02 | `executeTask('replayPuzzle', …)` returns the engine's `ReplayResult`, structured-clone safe; a `RangeError` maps to `invalid-request` | cases 4–6 |
| MP15b-T03 | The client submits it on the auxiliary path only, with the payload above, and follows the auxiliary contract in both overlap orders | cases 7–11 |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests/protocol.test.js tests/tasks.test.js tests/generation-client.test.js tests/auxiliary.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
```

### Required test cases

`tests/protocol.test.js`:

1. A payload built from the first puzzle of `tests/fixtures/replay-case.json` (`set` in wire form, `puzzle`,
   `generation` with `setOrigin` and a one-entry `made`) validates; the normalized copy is deep-equal in content and
   not the same objects.
2. Missing `generation`, an unknown field in `puzzle`, a `made` with two keys, a `setOrigin` that is not a plain object,
   and a `generation` nested deeper than 8 levels are each `invalid-value` or `invalid-type` issues at the right
   path.
3. `parseTaskMessage` accepts `{ type: 'task', id, kind: 'replayPuzzle', payload }` and still rejects an unknown kind.

`tests/tasks.test.js`:

4. `executeTask('replayPuzzle', payload, execution)` for the fixture's first puzzle returns `status: 'matched'`;
   `structuredClone` of the result deep-equals it.
5. The same through the message path (`createTaskHandler` with a `post` that collects replies): one `result` reply
   whose value deep-equals case 4's result.
6. A payload whose `set` has no pieces is refused before engine code (`invalid-payload`); an engine `RangeError` (for
   example a puzzle whose clues name an unknown piece id, if the engine reaches it) is an `invalid-request` reply.

`tests/generation-client.test.js` (the scripted `harness()` and the real-engine `realHarness()` of the file):

7. A replay submitted while a batch is running (the batch's tasks held) is not dispatched; after the batch ends it
   runs as an idle task under the batch's ended token (`runIdle`, no new `beginRequest`) and resolves with the
   worker's value.
8. A batch started while a replay is waiting or running: the replay rejects with `PoolAbortError('cancelled')`, the
   batch's tasks are dispatched normally and the batch result is the same as without the replay.
9. Aborting the replay's own signal rejects it with `cancelled` and leaves a running batch untouched (no
   `cancelAll`, no `beginRequest`).
10. Real engine (`realHarness(1)`): `client.replayPuzzle({ set, puzzle, setOrigin, made })` for a fixture puzzle
    resolves with `status: 'matched'`.
11. On a fresh client (no request yet) the replay bootstraps a token (`beginRequest` then `endRequest`) and resolves;
    the next generation's request id is strictly larger.

## Definition of done & handoff

- Every criterion has its evidence; the reply lists the protocol change and the test counts.
- Handoff to MP16b: `client.replayPuzzle({ set, puzzle, setOrigin, made }, { signal })` resolves with a
  `ReplayResult` or rejects with `PoolAbortError('cancelled' | 'closed')`, `WorkerTaskError` or `PoolError`.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
