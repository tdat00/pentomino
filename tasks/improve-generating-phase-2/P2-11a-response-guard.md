# P2-11a: The response guard and the assembly hooks of the client

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1 (`generation-deadline.js`), §4.5 Host guard (R3); D-P2-08; P2-T09; review-1 R9 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-11a` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | C; P2-10 (`newScope`, request scopes, the client object) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2 h; machine: locked focused runs |

## Goal

A response guard bounds one operation from its origin: at 119 s it cancels the client and settles the pending phase. A
set phase settles with a typed failure; a batch phase settles with the client's consumed, validated prefix, without
waiting for a held pack assembly. This task builds the guard, its set-then-batch lifetime helper, and the client hooks
the guard needs. P2-11b wires them into the Generator, the CLI and the bench.

## Authority and fixed points

- **R3 (plan §4.5), verbatim:** "`generation-deadline.js` covers the whole operation, including pack assembly. At the
  work stop it cancels outstanding tasks. At the hard bound, an unsettled set operation returns
  `{ status: 'failed', reason: 'response-bound', failures: {} }`, leaving the previously displayed set unchanged. An
  unsettled batch returns `partial` / `response-bound` with its consumed, validated fold prefix, `made` records and seen
  histories (no pack when that prefix is empty), without awaiting a held assembly. Late set or batch completions are
  fenced by request id and revision; only one terminal result is delivered. A shown puzzle remains in history. The
  guard is cleared on every terminal path."
- **R9 (review-1), the lifetime rule:**
  - A composite `gen-v4` set and batch keep **one** timer until the whole operation ends. A set phase that settles
    first only removes that phase's pending callback; the timer keeps running for the batch.
  - Standalone and legacy requests clear their own guard when they settle, before a following request creates its
    guard.
- **Frozen semantics being ported** (`tools/ig-proto/variants/live.json`):
  - `lv-14`: the host race;
  - `lv-15` and `lv-17`: the assembly gate, a test seam;
  - `lv-16`, `lv-18` and `lv-19`: the prefix snapshot.
- **The bound:** `DEADLINE.responseBoundMs - DEADLINE.hostMarginMs` = 119,000 ms after the origin (P2-01's `gen-v4.js`).
- **The `link-9` lines.** The batch's `catch`/`finally` (lines 1170-1175 at the base) stay byte for byte: the copies'
  link edit `link-9` anchors on them.

## Scope

- **Create:**
  - `core/browser/generation-deadline.js`;
  - `tests/generation-deadline.test.js`.
- **Change:**
  - `core/browser/generation-client.js`: the options typedef (line 450), `finishSet`'s assembly (line 735), a snapshot
    after `detail` (line 879), the batch assembly (line 1186), the client object, the typedefs, and the `pack.js`
    import (line 14);
  - `tools/bench/report.js`: `SOURCE_FILES`, line 46 only;
  - `docs/design-detail.md` §8.4.
- **Change tests:** `tests/generation-client.test.js`, new cases at the end of the file.
- **Do not change:** anything else, `generator/jobs.js`, `tools/generate.mjs` and `tools/bench/runner.js` included
  (P2-11b). Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('core/browser/generation-deadline.js', 'tests/generation-deadline.test.js', 'core/browser/generation-client.js',
    'tools/bench/report.js', 'docs/design-detail.md', 'tests/generation-client.test.js',
    'tasks/improve-generating-phase-2/P2-11a-response-guard.md')
  ```

## Steps

1. **Create `core/browser/generation-deadline.js`** (`// @ts-check`, no DOM, no Node import). It imports `DEADLINE`
   from `../engine/gen-v4.js` and exports two functions.

   `createResponseGuard({ clock, client, origin, boundMs = DEADLINE.responseBoundMs - DEADLINE.hostMarginMs })`
   returns `{ set(promise), batch(promise), clear(), fired() }`:
   - **The timer.** One `clock.setTimeout(fire, Math.max(0, origin + boundMs - clock.now()))`, made when the guard is
     created.
   - **`set(promise)` and `batch(promise)`** each return a new promise, and register it as the pending phase.
     - A second call while a phase is pending throws `Error('a response-guard phase is already pending')`.
     - When `promise` settles first, its value or rejection passes through unchanged and the pending phase is
       removed. The timer keeps running.
     - When the guard has already fired, the call runs `client.cancel()` (a throw is caught) and resolves at once with
       the bound result of its phase (below).
   - **`fire()`** marks the guard fired and calls `client.cancel()` (a throw is caught). Then, when a phase is pending,
     it settles that phase with its bound result:
     - set: `{ status: 'failed', reason: 'response-bound', failures: {} }`;
     - batch: `client.prefixSnapshot()`; a `null` snapshot rejects with
       `Error('the response bound found no batch prefix')`.

     A phase's own promise that settles after this is ignored.
   - **`clear()`** clears the timer; it is idempotent. A pending phase then waits for its own promise.
   - **`fired()`** returns whether the bound fired.

   `async guardSetThenBatch({ clock, client, scope }, runSet, runBatch)` returns `{ set, batch }`:
   - `runSet()` returns the set request's promise.
   - `runBatch(set)` receives every settled set result, the guard's typed failure included. It returns the batch
     request's promise, or `null` when no batch follows.
   - **With a `scope`** (an automatic `gen-v4`-route request): one guard with `origin: scope.origin` covers both phases.
     `set = await guard.set(runSet())`; then `const next = runBatch(set)`; `batch = next === null ? null : await guard.batch(next)`.
     The guard is cleared in a `finally` around the whole operation.
   - **Without a scope** (a legacy route):
     - the set gets a guard with `origin: clock.now()`, taken when `guardSetThenBatch` starts, and cleared in a
       `finally` as soon as the set settles;
     - then `const origin = clock.now(); const next = runBatch(set);` and, when `next` is not `null`, a new guard with
       that `origin`, created after the set guard was cleared, covers the batch and is cleared in a `finally` as soon as
       the batch settles.
   - A rejection of `runSet()` or of the batch passes through after the guards are cleared.
2. **`generation-client.js`.**
   - **The options typedef** (line 450) gains
     `assemblyGate?: (phase: 'set' | 'batch') => Promise<void>`, documented "tests only: awaited directly before a pack
     assembly".
   - **`finishSet`.** Directly before `const pack = await assemblePack({` (line 735), add
     `await options.assemblyGate?.('set');`
   - **The batch's pack parts.** Directly after the line `const detail = () => ...` (line 879), define
     `const packParts = () => ({ board: set.board, rotation: request.rotation, pieces: set.pieces, witness: set.witness, puzzles: accepted.slice(), generation: generationMeta({ ... }) });`
     with the same `generationMeta` argument as lines 1192-1202, the same fields and values.
   - **The snapshot (`lv-16`, `lv-19`).** Directly after `packParts`, add `job.snapshot = () => { ... };`, which
     returns
     `{ status: 'partial', reason: 'response-bound', accepted: accepted.slice(), made: structuredClone(made), seenLayouts: [...state.seenLayouts], seenClues: [...state.seenClues], counters: { ...counters } }`.
     - When `accepted.length > 0`, it adds `pack`: `const checked = validatePack(createPack(packParts()));`.
       `!checked.ok` throws `new GenerationError('internal', 'The generated pack failed validation', { ...detail(), issues: checked.issues })`;
       otherwise `pack = checked.value`.
     - `counters` is P2-06's batch request total.
     - Add `validatePack` to the import from `../engine/pack.js` (line 14), in alphabetical order.
   - **The batch assembly.** Lines 1185-1204 become
     `if (accepted.length > 0) { await options.assemblyGate?.('batch'); result.pack = await assemblePack(packParts(), detail()); }`.
     The lines 1170-1175 above them do not change.
   - **The `Job` typedef** (line 182) gains `@property {(() => BatchJobResult) | undefined} [snapshot]`.
   - **The client object** gains `prefixSnapshot: () => latest?.snapshot?.() ?? null,` and `clock: () => clock,`.
     The `GenerationClient` typedef gains both.
   - **Reasons.** `BatchJobResult.reason` adds `'response-bound'`; `SetJobResult.reason` adds `'response-bound'`
     (`'reserve-cut'` is P2-10's).
3. **`tools/bench/report.js`.** In line 46, insert `'core/browser/generation-deadline.js', ` directly after
   `'core/browser/generation-client.js', `. Change nothing else in that file.
4. **Tests.** Write the cases below and run the focused gate.

## Tests

`tests/generation-deadline.test.js` uses a manual fake clock: `now()`; `setTimeout(fn, ms)` returning an id;
`clearTimeout(id)`; `advance(ms)`, which runs the due timers in time order; and `pending()`, the number of armed
timers. Its fake client is `{ cancels: 0, cancel() { this.cancels += 1; }, prefixSnapshot: () => snapshot }`. A
`deferred()` helper gives `{ promise, resolve, reject }`.

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/generation-deadline.test.js` | `a set that settles first is returned unchanged` | origin 0; the set promise resolves at 1,000 | that value; `cancels` 0; `fired()` false |
| same | `an unsettled set at the bound is a typed failure` | the set promise never settles | at 119,000: `{ status: 'failed', reason: 'response-bound', failures: {} }`; `cancels` 1 |
| same | `an unsettled batch at the bound returns the snapshot` | the batch promise never settles; `snapshot` a stub object | the stub; `cancels` 1 |
| same | `a null snapshot is an error` | the same with `snapshot` `null` | rejects with `the response bound found no batch prefix` |
| same | `a late completion after the bound is ignored` | the set promise resolves at 119,500 | only the typed failure was delivered |
| same | `clear is idempotent and stops the timer` | `clear()` twice before the bound; advance to 200,000 | no settlement by the guard; `cancels` 0; `pending()` 0 |
| same | `a phase after the bound resolves at once` | advance to 119,000 with no phase; then `batch(never)` | the snapshot at once; `cancels` 2 |
| same | `composite: the set's completion keeps the timer for the batch` | `guardSetThenBatch({ clock, client, scope: { origin: 0, setCutAt: 46000 } }, runSet, runBatch)`; the set resolves `complete` at 30,000; `runBatch` returns a promise that never settles | at 119,000: `{ set: <the complete set>, batch: <the snapshot> }`; `cancels` 1 |
| same | `legacy: a long set, then a batch beyond the old set's deadline` | no scope; the set resolves `complete` at 100,000; `runBatch` returns a promise that resolves at 200,000 with `{ status: 'complete' }` | `{ set, batch: { status: 'complete' } }`; `cancels` 0; `pending()` 1 between 100,000 and 200,000 (the batch's guard only) |
| same | `legacy: a held set is cut at its own bound` | no scope; the set never settles | at 119,000: `runBatch` called once with the typed failure; it returns `null`; the result `{ set: <the typed failure>, batch: null }` |
| `tests/generation-client.test.js`, end | `a held set assembly does not delay the bound` | `harness({ handler: (t) => ({ value: setSuccess(t.payload.attempt) }) })`; `clientOf(h, { assemblyGate: (p) => (p === 'set' ? new Promise(() => {}) : Promise.resolve()) })`; `createResponseGuard({ clock: h.clock, client, origin: 0 })`; `g.set(client.generateSet(setInput()))` | at 119,000 the typed failure; no set result is delivered |
| same | `a held batch assembly returns the validated prefix` | `harness({ handler: (t) => scripted(t) })`; `batchInput({ quantity: 3 })`; the gate holds `'batch'`; `g.batch(client.generateBatch(...))` | at 119,000: `partial`, `response-bound`; three puzzles in fold order; `made` for each; the seen histories; a `pack` for which `validatePack(pack).ok` is true |
| same | `an empty prefix has no pack` | every candidate held (`handler` returns `undefined`); at 1,000, `client.prefixSnapshot()` | `partial`, `response-bound`, `accepted` empty, no `pack` key |
| same | `repeated cancel is harmless` | the held-batch case, with `client.cancel()` before and after the bound | no throw; one terminal result |

## Documentation

`docs/design-detail.md` §8.4 gets one paragraph after P2-10's: the response guard (R3's text in substance), the
set-then-batch lifetime (one timer for an automatic `gen-v4` request; a guard per request on a legacy route), the typed
set failure, the batch prefix without a held assembly, and that only one terminal result is delivered.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked focused gate: `-NodeArgs @('--test', 'tests/generation-deadline.test.js', 'tests/generation-client.test.js', 'tests/benchmark-report.test.js')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| the link-9 check: `git --no-pager diff --unified=0 gen-v4 -- core/browser/generation-client.js` contains none of the lines `throw toFault(e, detail());`, `controller.abort();` or `finish(job);` as a removed (`-`) line | slot root | no such line | 30 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when:
  - the snapshot cannot be built from the batch's own state (for example, `made` or `counters` is not in scope at
    line 879);
  - an existing client test depends on `finish(job)` running after the assembly;
  - the fake clock of `tests/generation-client.test.js` cannot reach 119,000 while a batch is held.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-11a-B01 | No response passes its bound: a held set is a typed failure, a held batch is its validated prefix | deadline and client cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-11a-T01 | R9's lifetime: one composite timer that survives the set; legacy guards per request, cleared when settled | the `guardSetThenBatch` cases | test output |
| P2-11a-T02 | Held set and held batch assemblies, an empty prefix, late messages and repeated cancel | the client cases | test output |
| P2-11a-T03 | The new module is in `SOURCE_FILES`; the `link-9` lines are unchanged | report test; the link-9 check | test and command output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] `docs/design-detail.md` §8.4 updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the helper lines and the pass counts;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | |
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator (merge gate) | |
| Commit (slot), commit on `gen-v4` | |
| Issues and named items | |
