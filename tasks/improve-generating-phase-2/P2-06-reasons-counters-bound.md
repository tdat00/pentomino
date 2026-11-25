# P2-06: No-window reasons, counters in results and the bounded set stage

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1 interfaces, §4.4 (P5 budget and bound rows), §4.5 (set loop order), §4.6 (counter ownership, the N-V4-16 record); D-P2-10; P2-T04, P2-T05 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-06` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | C; P2-01 (`SET_ATTEMPTS_BOUND` and the other `gen-v4.js` values) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.75 h; machine: locked focused run and the full suite (a full-suite point: the result shapes change) |

## Goal

A piece-set request on `gen-v4`'s route ends early, `no-window-below` or `no-window-above`, when its first four
attempts all ended without a window on the same side (P5's bound), instead of running to its time limit. The selection
counters and a short ordered record of the first four attempts reach the client's results, so the validation can read
budget stops, re-ratings and the bound's reach (N-V4-16) without `record` or `onRate`.

## Authority and fixed points

- Frozen edits being ported (dump: `tools/ig-proto/variants/v4-p5.json`): `p5-1` (`generate.js`, the reason), `p5-2`
  (`generation-client.js`, the bound before the ordered scan), `p5-3` (`igSetBound`).
- Plan §4.4: a budget stop has no side; the bound is read before the ordered winner scan, so a later success cannot
  override it. Plan §4.5 loop order: cancellation or time-out, the bound, the ordered scan, (the reserve cut, P2-10),
  a new dispatch.
- R4 (plan §4.6): the selection result carries per-call counts; `setAttempt` transports the no-window side; the client
  set-stage loop, not the selector, counts set attempts and bound firings; none of these is a provenance field.
- Inert until P2-15: `gen-v3` never returns `igNoWindow`, so the bound cannot fire before the cutover.

## Scope

- Change `core/engine/generate.js` (`setAttempt`, `puzzleCandidate`, `completionCandidate`), `core/engine/types.js`
  (`SetAttemptResult`, `PuzzleCandidate`), `core/browser/generation-client.js` (`generateSet`, `generateBatch`,
  `SetJobResult`, `BatchJobResult` typedefs), `docs/design-detail.md` §6.5 and §6.9.
- Change tests: `tests/generate.test.js`, `tests/generation-client.test.js` (new cases only).
- Do not change: anything else. Guard: G-PROTECTED, G-WORKTREE with

  ```powershell
  $Allowed = @('core/engine/generate.js', 'core/engine/types.js', 'core/browser/generation-client.js',
    'tests/generate.test.js', 'tests/generation-client.test.js', 'docs/design-detail.md',
    'tasks/improve-generating-phase-2/P2-06-reasons-counters-bound.md')
  ```

## Placement rules (parallel execution, check-list §3.7)

Later tasks run beside this one's successors and anchor on the lines below. Keep these placements exactly.

- **The import from `gen-v4.js`.** Write one line in `generation-client.js`'s import block, verbatim:
  `import { DEADLINE, PER_SET_LEVELS, perSetPrior, SET_ATTEMPTS_BOUND } from '../engine/gen-v4.js';`
  - P2-07 uses `PER_SET_LEVELS` and `perSetPrior`, and P2-10 uses `DEADLINE`, so neither edits this line. These three
    names stay unused until those tasks merge; the repository has no unused-import check.
- **`generateSet`'s attempt callbacks.**
  - In the success callback of `runTask(job, 'setAttempt', payload, controller.signal, progress).then((value) => {`,
    insert the counter, trail and no-window bookkeeping directly **before** the line `        emit(hooks.onProgress, {`
    of that callback.
  - In the rejection callback, insert it directly before its `job.wake?.();`.
  - The frozen link edit `link-11` anchors on the unchanged `emit(...)` lines (P2-12d).
- **`generateBatch`'s candidate callback.** Insert the counter line directly **after** `        inflight -= 1;` of the
  success callback, never between `Object.assign(entry, { done: true, ok: true, value });` and `inflight -= 1;` (the
  `link-4` anchor).
- **The completion pass's callback.** Insert the counter line directly **before**
  `              Object.assign(entry, { done: true, ok: true, value });` (the `link-12` anchor is that line and the
  next).
- **Tests.**
  - `tests/generate.test.js`: the new cases go directly after the test
    `lazy certification gives a proof status without changing the accepted fold` (it ends at line 689 at the base),
    before the nested `describe('completion pass'`, inside `describe('set attempts and puzzle candidates')`.
  - `tests/generation-client.test.js`: the new cases go at the end of the file.

## Steps

1. `generate.js`: add `export function failureOf(cal)` returning
   `{ ok: false, reason: cal.igNoWindow === undefined ? cal.reason : \`no-window-${cal.igNoWindow}\`, counters: cal.counters ?? ZERO_COUNTERS }`;
   in `setAttempt` (lines 151-153) the failure return becomes `return failureOf(cal);`; add
   `counters: cal.counters ?? ZERO_COUNTERS` to the success object (after `attempt`). Define at module level
   `export const ZERO_COUNTERS = Object.freeze({ budgetStops: 0, screenCapped: 0, rescueReratings: 0, tailReratings: 0 });`
   (`gen-v3` results have no `counters`; carving failures return `counters: ZERO_COUNTERS` too).
2. `puzzleCandidate` and `completionCandidate`: add `counters: sel.counters ?? ZERO_COUNTERS` to both the failure
   object (`{ fail: sel.reason, counters }`) and the success object (beside `made`, not inside it). The fold ignores the
   field. `{ fail: 'layout' }` returns before a selection get `counters: ZERO_COUNTERS`.
3. `types.js`: `SetAttemptResult`'s failure reasons add `'no-window-below' | 'no-window-above'`; both variants gain
   `counters: SelectCounters`; add `@typedef {{ budgetStops: number, screenCapped: number, rescueReratings: number, tailReratings: number }} SelectCounters`;
   `PuzzleCandidate` and `CandidateFailure` gain an optional `counters`.
4. `generation-client.js`, module level (after `usableCalibration`): add the frozen `igSetBound` as

   ```js
   /**
    * P5's bound (plan v4 P5): the common `no-window-<side>` reason when the first SET_ATTEMPTS_BOUND attempts all
    * failed without a window on the same side, else null. A budget stop or any other reason has no side.
    * @param {Map<number, { kind: string, reason?: string }>} results
    * @returns {'no-window-below' | 'no-window-above' | null}
    */
   export function setBound(results) { ... }
   ```

   with the body of frozen `p5-3` (`n = SET_ATTEMPTS_BOUND` from `../engine/gen-v4.js`).
5. `generateSet`: keep a request total `counters` (`{ ...ZERO_COUNTERS }` copy) and add each settled attempt's
   `value.counters` (ok or fail) to it. Keep a `trail` record
   `{ attempts: [], sameSide: null, boundFired: false, noWindow: { below: 0, above: 0 } }`:
   - when attempt `j < SET_ATTEMPTS_BOUND` settles, push
     `{ attempt: j, outcome: 'ok' | 'fail' | 'fault' | 'skipped', reason: <the fail reason or null>, arrival: <0-based arrival index> }`;
   - when **any** attempt settles with reason `no-window-below` or `no-window-above`, add 1 to `trail.noWindow.below` or
     `.above`, whatever its index (R6: a later attempt counts too; `contracts.md` C6).

   In the loop, directly after the `if (job.timedOut) { ... }` block and before the comment
   `// The lowest successful attempt wins: scan the resolved prefix in order.`, insert:

   ```js
   const bound = setBound(results);
   if (bound !== null) {
     trail.sameSide = bound === 'no-window-below' ? 'below' : 'above';
     trail.boundFired = true;
     return { status: 'failed', reason: bound, failures: tally(), counters, trail };
   }
   ```

   Every other return of `generateSet` (`complete` through `finishSet`, `cancelled`, `time-limit`,
   `attempts-exhausted`, a fault's reason) carries `counters` and `trail`; set `trail.sameSide` from
   `setBound(results)` at return time also when the bound did not fire (the condition met but a higher-priority
   cancellation or time-out returned first: `boundFired` stays false). `finishSet` receives them as extra arguments
   and adds them to its result.
6. `generateBatch`: keep a request total `counters` summing `counters` of every candidate and completion result the
   client receives (ok or failure, consumed or not); add `counters` to every result object it returns. Do not change the
   fold.
7. Typedefs: `SetJobResult` gains `counters` and `trail` (`{ attempts: { attempt: number, outcome: string, reason: string | null, arrival: number }[], sameSide: 'below' | 'above' | null, boundFired: boolean, noWindow: { below: number, above: number } }`)
   and its `reason` doc adds `no-window-below`, `no-window-above`; `BatchJobResult` gains `counters`.
8. Tests below; the locked focused gate, then the full suite (a full-suite point).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/generate.test.js` | `failureOf transports the no-window side` | `failureOf({ ok: false, reason: 'not-in-band', igNoWindow: 'above', counters })`; `failureOf({ ok: false, reason: 'not-in-band' })` | `{ ok: false, reason: 'no-window-above', counters }`; `{ ok: false, reason: 'not-in-band', counters: ZERO_COUNTERS }` |
| same | `results carry zero counters on today's route` | an existing 10x6 Hard `setAttempt` and `puzzleCandidate` call | `counters` deep-equals `ZERO_COUNTERS` |
| `tests/generation-client.test.js` | `the bound ends the set on four same-side no-window attempts` | the scripted fake pool of this file; attempts 0-3 fail `no-window-below` | `{ status: 'failed', reason: 'no-window-below' }`, `trail.boundFired` true, four `trail.attempts` |
| same | `mixed sides or a budget-stop reason do not fire the bound` | attempts 0-3: three `no-window-below` and one `no-window-above`; then three `no-window-below` and one `not-in-band` | the request continues (attempt 4 is dispatched) |
| same | `the bound is read before the winner scan` | attempts 0-3 fail `no-window-above` while attempt 4 succeeds first in arrival order | `failed`, `no-window-above` (a later success never overrides) |
| same | `a success among the first four wins as today` | attempt 2 succeeds, 0, 1, 3 `no-window-below` | `complete`, attempt 2; `trail.boundFired` false |
| same | `a time-out before the bound is reported` | four `no-window-below` arrive after `job.timedOut` | `time-limit`; `trail.sameSide` 'below', `trail.boundFired` false |
| same | `counters are summed per request` | attempts returning counters `{ budgetStops: 1, ... }` | the set result's `counters` is the sum |
| same | `every no-window attempt is counted, beyond the first four too` | attempts 0-3 settle `not-in-band`, attempt 4 `no-window-above`, attempt 5 succeeds | `complete`, attempt 5; `trail.noWindow` `{ below: 0, above: 1 }`; `trail.attempts` holds attempts 0-3 only |

Use the existing scripted pool and fake clock of `tests/generation-client.test.js` (its `harness`/`FakeWorker`
helpers); reply values are plain objects `{ ok: false, reason: 'no-window-below', counters }`.

## Documentation

`docs/design-detail.md`: §6.5 (piece-set generation): the bounded set stage of `gen-v4`'s route (four attempts on the
same no-window side end the request with `no-window-below`/`no-window-above`; a success among them wins; time-out and
cancellation come first), not yet live; §6.9: candidate results carry the per-call counters; the set and batch results
carry request totals and the set's `trail` (validation telemetry, never stored).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked focused gate: `--test tests/generate.test.js tests/generation-client.test.js` | §3.3 | `# fail 0` | 300 s |
| Full suite (full-suite point: the result shapes) | §3.3 | `# fail 0`, `# cancelled 0` | 600 s |
| the placement check: `Select-String -SimpleMatch` on `core\browser\generation-client.js` for `import { DEADLINE, PER_SET_LEVELS, perSetPrior, SET_ATTEMPTS_BOUND } from '../engine/gen-v4.js';` | slot root | one hit | 30 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- `QUESTION:` if an existing test pins the exact key set of a `setAttempt` or `generateSet` result (the new fields would
  break it), or if the scripted pool cannot express arrival order.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-06-B01 | On `gen-v4`'s route a hopeless set request stops early with its side; a success still wins | client cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-06-T01 | P2-T05: same side, mixed sides, budget stops, a later success, time-out priority | client cases | test output |
| P2-06-T02 | Counters per call reach per-request totals; zero on today's route | generate and client cases | test output |
| P2-06-T03 | The `trail` records the first four attempts, the condition, the firing and every no-window attempt | client cases | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added at their places and green; the focused gate and the full suite green
- [ ] `docs/design-detail.md` §6.5 and §6.9 updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

Start and end times; files changed; helper lines and pass counts; each AC row with its evidence; questions and
deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w2, fb67ba0aba87ed85c8e85b677b0ef66ededbe2e2 |
| Start, end, duration | dispatched 2026-11-25 22:37 +07:00 (developer clock 22:13:29 to 22:36:52, with QUESTION 1); accepted 23:18; about 41 min |
| Waiting for rulings | about 12 min (QUESTION 1, SA-Opus) |
| Agent id, model | 04b71d47-7176-4299-a222-6ac2dc9b1f56, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 61; 6,460,218 / 45,410 / 6,186,014 |
| AI credits | 175.81 |
| Questions and rulings | QUESTION 1 (three existing tests pin { fail: 'layout' }): SA-Opus ruled Option B: the three pre-selection { fail: 'layout' } returns stay unchanged (the log-6 anchor); the client counts a missing counters as ZERO_COUNTERS; counters? stays optional; the three tests unchanged; the link-anchor check must give 22 of 22 (added to the merge gate, 9b566a2). Other deviations accepted (imports, telemetry()/settled() helpers, time-out via onProgress, extra batch-counter case). Step 2's last sentence reads: `{ fail: 'layout' }` returns before a selection stay unchanged (the `log-6` anchor); the client counts a missing `counters` as `ZERO_COUNTERS`. |
| Fix rounds | 0 (the ruling was applied before the first report) |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 7 files); rebased onto e14e7a4 cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked full suite `IG P2-06 full exit=0 seconds=120.503 quiet=45`, 1541/1541 pass, 0 fail/cancelled/todo; link anchors 22 of 22 |
| Commit (slot), commit on `gen-v4` | slot 2e1bb5b, rebased 85f5c46; gen-v4 85f5c46526ed46d59b5b590c0a9a8838dc64f2ad |
| Issues and named items | none; the bound cannot fire on real workers before P2-15 (gen-v3 returns no igNoWindow); P2-07/P2-10 use the imported names |
