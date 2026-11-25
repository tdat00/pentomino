# P2-10: Monotonic request scopes, the set-stage reserve and the pool clock

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1 interfaces (request scopes), §4.5 (Generator actions, automatic requests, legacy routes, set loop order); D-P2-08; P2-T09 (clock part) |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-10` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | C; P2-06 (the `generateSet` loop, `counters` and `trail`, and the client's import of `DEADLINE`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.5 h; machine: locked focused runs |

## Goal

Every request runs on one monotonic clock scope. The Generator's two actions each get a fresh scope (115-s stop, no
reserve) and no clock spans the user's pause. An automatic `gen-v4`-route request of the CLI or the bench makes its set
and its batch under one shared scope: the set stage is cut at 46 s (`reserve-cut`) and generation stops 115 s after
the request's origin, so the 120-s bound of P2-11a and P2-11b can hold.

## Authority and fixed points

- Frozen edits adapted (`tools/ig-proto/variants/live.json`): `lv-1`/`lv-2` (pool origin), `lv-3` to `lv-8` (client),
  `lv-10` to `lv-13` (bench host). The frozen live deadline acted only with a host origin (`lv-9`); production makes the
  scope explicit.
- Values: `DEADLINE` of `core/engine/gen-v4.js` (`setStageCapMs` 46,000; `generationStopMs` 115,000 =
  `TIME.dispatchStopMs`; `responseBoundMs` 120,000 = `TIME.responseMs`; `hostMarginMs` 1,000).
- Plan §4.5 set loop order: cancellation or time-out, the same-side bound (P2-06), the ordered winner scan, the
  reserve cut, a new dispatch. Legacy routes (Master and below, the 26x26 exception) keep their two timers.
- `generator/jobs.js` does not change here. P2-11b gives each Generator action one scope from `client.newScope(false)`;
  no `Date.now` reading reaches the pool.
- **Parallel placement (check-list §3.7).** P2-07 may run beside this task and edits `generateBatch` too: its line
  after `const base = { ... };` and the `puzzleCandidate` dispatch (line 903). This task changes only `begin`, the
  line `const job = begin(input.revision);` (850), the typedefs, `checkSet`, `checkBatch`, `newScope`, `generateSet`
  and the client object. Do not edit the import line from `../engine/gen-v4.js`: P2-06 wrote it with `DEADLINE`.

## Scope

- **Change:** `core/browser/worker-pool.js` (step 1), `core/browser/generation-client.js` (steps 2-4),
  `tools/generate.mjs` (step 5), `tools/bench/runner.js` (step 6), `docs/design-detail.md` §8.4.
- **Change tests**, new cases at the end of each file: `tests/worker-pool.test.js`, `tests/generation-client.test.js`,
  `tests/cli.test.js`.
- **Do not change:** `generator/jobs.js` and everything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('core/browser/worker-pool.js', 'core/browser/generation-client.js', 'tools/generate.mjs',
    'tools/bench/runner.js', 'docs/design-detail.md', 'tests/worker-pool.test.js', 'tests/generation-client.test.js',
    'tests/cli.test.js', 'tasks/improve-generating-phase-2/P2-10-request-scopes.md')
  ```

## Steps

1. `worker-pool.js` `beginRequest` (line 626) takes an optional `origin` (`lv-1`/`lv-2`): `start` is `origin` when it
   is a finite number not later than `clock.now()`, else `clock.now()`; `startedAt = start`; the timer fires after
   `Math.max(0, start + TIME.dispatchStopMs - clock.now())`. Update the `Pool` typedef (line 61).
2. `generation-client.js`:
   - typedef `RequestScope`: `{ origin: number, setCutAt: number | null }`;
   - the client gains `newScope(reserve)`: `const origin = clock.now(); return { origin, setCutAt: reserve === true ? origin + DEADLINE.setStageCapMs : null };`
     (export it on the `GenerationClient` object and typedef);
   - `SetInput` and `BatchInput` gain an optional `scope: RequestScope`; `checkSet`/`checkBatch` refuse a scope whose
     `origin` is not a finite number not later than `clock.now()` or whose `setCutAt` is neither null nor a finite
     number at least `origin` (`GenerationError('invalid-input', 'scope is invalid')`);
   - `begin(revision, scope)` passes `origin: scope?.origin` to `pool.beginRequest` (`lv-3`, `lv-4`).
3. `generateSet` (`lv-5` to `lv-7`):
   - `const job = begin(input.revision, input.scope);`
   - directly after it: `const cutAt = typeof input.scope?.setCutAt === 'number' ? input.scope.setCutAt : null;` and
     `const cutTimer = cutAt === null ? null : clock.setTimeout(() => job.wake?.(), Math.max(0, cutAt - clock.now()));`
   - in the loop, after the ordered scan's `for` block and before the dispatch `while`, insert:

     ```js
     if (cutAt !== null && clock.now() >= cutAt) {
       return { status: 'failed', reason: 'reserve-cut', failures: tally(), counters, trail };
     }
     ```

   - in the `finally` block, before `finish(job)`: `if (cutTimer !== null) { clock.clearTimeout(cutTimer); }`
4. `generateBatch`: `const job = begin(input.revision, input.scope);` (`lv-8`). No reserve in the batch.
5. `tools/generate.mjs`: export `export function cliScope(client, levelId, boardRows)` returning
   `usesGenV4(levelId, boardFromRows(boardRows)) ? client.newScope(true) : undefined`. Import `usesGenV4` from
   `../core/engine/gen-v4.js`, and `boardFromRows` from `../core/engine/board.js` if it is not imported yet. In `run`
   (lines 548-577), compute `const scope = cliScope(client, config.levelId, config.boardRows);` before
   `client.generateSet`, and pass `scope` to both `generateSet` and `generateBatch`.
6. `tools/bench/runner.js` `generate()` (lines 535-590): directly after `s.t0 = clock.now();`, add exactly this line,
   indented two spaces (P2-12b's uncapped copy anchors on it):
   `  const scope = usesGenV4(caseDef.levelId, boardFromRows(caseDef.boardRows)) ? { origin: s.t0, setCutAt: s.t0 + DEADLINE.setStageCapMs } : undefined;`
   Pass `scope` to both calls (`lv-10`, `lv-12`). Add `import { DEADLINE, usesGenV4 } from '../../core/engine/gen-v4.js';`
   directly after line 10 (`import { inBand } from '../../core/engine/difficulty.js';`); `boardFromRows` is already
   imported (line 9).
7. Tests below; the locked focused gate.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/worker-pool.test.js` | `a request origin earlier than now shortens the 115-s stop` | the file's fake clock at 10,000; `beginRequest({ ..., origin: 4,000 })` | the time-out fires at 119,000 (115 s after the origin), not at 125,000 |
| same | `a later or invalid origin is ignored` | origin 20,000 at clock 10,000; origin `NaN` | the stop counts from 10,000 |
| `tests/generation-client.test.js` | `newScope reads the client clock` | fake clock at 5,000; `newScope(true)`; `newScope(false)` | `{ origin: 5000, setCutAt: 51000 }`; `{ origin: 5000, setCutAt: null }` |
| same | `the reserve cuts the set stage at its scope's cut` | scripted pool whose set attempts never settle; scope `{ origin: 0, setCutAt: 46000 }` | `{ status: 'failed', reason: 'reserve-cut' }` at fake time 46,000; workers aborted |
| same | `the cut comes after the bound and the winner scan` | attempt 0 succeeds at 45,999 while the cut is at 46,000; a second case where four `no-window-below` arrive together with the cut | `complete`; then `no-window-below` (the bound first) |
| same | `without a scope there is no reserve and a fresh 115-s stop` | no scope; attempts never settle | `time-limit` at 115,000 from the request start; never `reserve-cut` |
| same | `set and batch share one origin` | scope origin 0; the set completes at 30,000; the batch's candidates never settle | the batch stops `time-limit` at 115,000, not at 145,000 |
| same | `an invalid scope is refused` | origin later than now; `setCutAt` before origin | `GenerationError` `invalid-input` |
| `tests/cli.test.js` | `the CLI scope follows the route` | `cliScope({ newScope: (r) => ({ origin: 0, setCutAt: r ? 46000 : null }) }, 'nightmare', rectRows(10, 10))` and the same for `'hard'` | `undefined` for both while the route is off (P2-16a asserts the live case) |

## Documentation

`docs/design-detail.md` §8.4: request scopes (one monotonic clock per request; the Generator's two actions each fresh,
115 s, no reserve; automatic `gen-v4`-route CLI and bench requests share one scope: set cut at 46 s with `reserve-cut`,
stop at 115 s from the origin; legacy routes keep their two timers); the set loop order of plan §4.5.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked focused gate: `-NodeArgs @('--test', 'tests/worker-pool.test.js', 'tests/generation-client.test.js', 'tests/cli.test.js', 'tests/benchmark-matrix.test.js')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- `QUESTION:` if `tools/generate.mjs` cannot export `cliScope` without changing its command-line behaviour.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-10-B01 | The Generator's actions keep a fresh 115-s stop each; no clock spans a pause | no-scope case | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-10-T01 | One origin for set and batch of an automatic request; the reserve cut at 46 s after the bound and the scan | client cases | test output |
| P2-10-T02 | The pool's stop counts from an earlier origin, never a later one | pool cases | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] `docs/design-detail.md` §8.4 updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

Start and end times; files changed; helper lines and pass counts; each AC row with its evidence; questions and
deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w2, c701d1ab6b187e2ffae6ed9acc0527643c4ed2a8 |
| Start, end, duration | dispatched 2026-11-25 23:02 +07:00 (developer 23:03:10 to 23:10:38); accepted 23:12 |
| Waiting for rulings | none |
| Agent id, model | be5292a3-ca01-422a-86de-e4d2e15dc31d, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 53; 5,229,801 / 32,744 / 5,106,822 |
| AI credits | 114.55 |
| Questions and rulings | none; six minor deviations accepted by the orchestrator (the reserve-cut failure returns ...telemetry(), copies of counters and trail, like the loop's other failures; reserve-cut named in the SetJobResult, RequestScope and scope doc comments; separate describe blocks, an answerAttempt helper and an rectRows import in tests/cli.test.js, extra NaN/Infinity/undefined origins; edits by anchor text after line drift; stray CR and one bare-LF line fixed, byte scan 0 bare LFs; a briefly duplicated design-detail line corrected, final diff 4 inserted lines) |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | slot static guards; merge gate with the locked focused gate and the link-anchor check (results in the bookkeeping); developer: locked focused 134/134 (33.659 s), G-PROTECTED, G-WORKTREE, G-FORMAT (8 files), G-CHECK OK, anchors 22 of 22 |
| Commit (slot), commit on `gen-v4` | this commit; its SHA on gen-v4 in the bookkeeping |
| Issues and named items | P2-16a asserts the live-route cliScope (a 46,000 cut once GEN_V4_LIVE is true); P2-11b makes the Generator call client.newScope(false) for each action; in the bench runner boardFromRows now runs before the try, as the task's line says (matrix validation refuses bad boardRows earlier) |
