# P2-11b: The guard in the Generator, the CLI and the bench, with its lifetime rules

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.5 (Generator actions, automatic requests, legacy routes, host guard); D-P2-08; P2-T09; review-1 R9 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-11b` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | C; P2-11a (`createResponseGuard`, `guardSetThenBatch`, `prefixSnapshot`, `clock`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.5 h; machine: locked focused runs |

## Goal

Every host answers within its response bound. The Generator's two actions get 120 s each, from their own start, and no
clock spans the user's pause. An automatic `gen-v4`-route request of the CLI or the bench gets 120 s from its shared
origin, with the host acting at 119 s. A legacy-route request keeps a bound per request, so a long set never cuts the
batch that follows it.

## Authority and fixed points

- **R9 (review-1), verbatim in substance:**
  - The guard variable is named **`responseGuard`**: `jobs.js` `addMore` already has a `guard` (line 403, the duplicate
    check).
  - A composite `gen-v4` set and batch keep one timer until the whole operation ends.
  - Standalone and legacy actions clear their own guard when the action settles, before a following action creates its
    guard.
  - The UI action creates one scope, never an epoch `Date.now` origin.
  - Every existing injected controller client fixture gets the new calls it needs (`newScope`, `clock`,
    `prefixSnapshot`), keeping its existing assertions.
- **P2-11a's API.** Both functions come from `core/browser/generation-deadline.js`.
  - `createResponseGuard({ clock, client, origin })`;
  - `guardSetThenBatch({ clock, client, scope }, runSet, runBatch)`: one timer with a `scope`, a guard per request
    without one;
  - on the client: `newScope(reserve)` (P2-10), `prefixSnapshot()` and `clock()`.
- **No other change of behaviour.**
  - Today's notices are unchanged. The `response-bound` batch notice is P2-09's; until then `batchShortfall` returns
    `null` for it, as for any unknown reason.
  - A `response-bound` set shows `N-NOSET` like any failed set, and leaves the displayed set unchanged.

## Scope

- **Change:**
  - `generator/jobs.js`: `generateSet` (303-354) and `addMore` (357-513);
  - `tools/generate.mjs`: `run` (lines 548-577 at the base, with P2-10's `scope`);
  - `tools/bench/runner.js`: `generate()` (535-590);
  - `docs/design-detail.md` §8.4.
- **Change tests:**
  - `tests/generator-controller.test.js`: the `fakeClient` helper (lines 70-109), and new cases at the end of the file;
  - no other test file. The CLI and bench wiring is covered by P2-11a's `guardSetThenBatch` cases and by the existing
    `tests/cli.test.js` and     `tests/benchmark-matrix.test.js` cases, which must pass unchanged.
- **Do not change:** anything else, `core/browser/` included. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('generator/jobs.js', 'tools/generate.mjs', 'tools/bench/runner.js', 'docs/design-detail.md',
    'tests/generator-controller.test.js', 'tasks/improve-generating-phase-2/P2-11b-guard-wiring.md')
  ```

## Steps

1. **`generator/jobs.js`.** Add `import { createResponseGuard } from '../core/browser/generation-deadline.js';` to the
   import block, after the `display-rating.js` import.
   - **`generateSet`.** Directly after `const revision = begin('set');`, add
     `const scope = client.newScope(false);` and
     `const responseGuard = createResponseGuard({ clock: client.clock(), client, origin: scope.origin });`.
     - The call becomes `result = await responseGuard.set(client.generateSet({ ..., revision, scope }));`
     - The `try { ... } catch (error) { ... }` around it gains `finally { responseGuard.clear(); }`.
   - **`addMore`.** Directly after `certRevision = revision;`, add the same two lines.
     - The call becomes `result = await responseGuard.batch(client.generateBatch({ ..., revision, scope }, { ...hooks unchanged... }));`
     - Its `try` gains `finally { responseGuard.clear(); }`.
     - In the `pendingIds` condition (line 490), `reason !== 'time-limit'` becomes
       `reason !== 'time-limit' && reason !== 'response-bound'`: no pending certificate is awaited after a cut.
   - Nothing in `jobs.js` reads `Date.now` for a scope or a guard.
2. **`tools/generate.mjs` `run`.** Replace the two awaited calls with one call of
   `guardSetThenBatch({ clock: client.clock(), client, scope }, runSet, runBatch)`:
   - `scope` is P2-10's `cliScope(...)` value: an object on the `gen-v4` route, else `undefined`.
   - `runSet = () => client.generateSet({ ...the same fields..., scope }, hooks)`.
   - `runBatch = (set) => (set.status !== 'complete' || set.set === undefined ? null : client.generateBatch({ ...the same fields..., scope }, hooks))`.
   - Then `const { set, batch } = await guardSetThenBatch(...)`. The existing set-failure branch (lines 556-561) runs on
     `set`, and the rest of the function runs on `batch`, unchanged.
   - A `response-bound` set exits 1 like any failed set. A `response-bound` batch takes the existing partial path:
     exit 2, with a pack when the prefix has one.
   - Add `guardSetThenBatch` to the imports, from `../core/browser/generation-deadline.js`.
3. **`tools/bench/runner.js` `generate()`.** Keep `s.t0 = clock.now();` and P2-10's `const scope = ...` line, which
   P2-12b's uncapped copy anchors on, byte for byte. Replace the two awaited calls inside the `try` with
   `await guardSetThenBatch({ clock, client, scope }, runSet, runBatch)`:
   - `runSet = () => client.generateSet({ ...the same fields..., scope })`.
   - `runBatch = (set) => { s.set = set; s.tSet = clock.now(); if (set.status !== 'complete' || set.set === undefined) { return null; } s.faultPhase = 'batch'; return client.generateBatch({ ...the same fields..., scope }, { ...the same hooks... }); }`.
   - Assign `s.batch = batch` from the result; when it is `null`, `s.batch` stays as it was.
   - The `catch` and `finally` blocks do not change. Branch on `scope === undefined` only inside
     `guardSetThenBatch`, never on the route again.
   - Add `guardSetThenBatch` to the imports, after the `generation-client.js` import.
4. **`tests/generator-controller.test.js`, the fixture (R9).** `fakeClient(script = {})` gains:
   - `clock`: `script.clock ?? inertClock`. `inertClock` is a new module-level constant,
     `{ now: () => 0, setTimeout: () => 0, clearTimeout: () => {} }`, so the existing cases never see a bound.
   - `clock() { return clock; }`, `newScope(reserve) { const origin = clock.now(); return { origin, setCutAt: reserve ? origin + 46000 : null }; }`,
     and `prefixSnapshot() { return script.snapshot ?? null; }`.
   - The fixture's typedef adds `clock?` and `snapshot?` to `script`.

   Every existing assertion stays as it is.
5. **New helper and cases.** Add `manualClock()`, with `now`, `setTimeout`, `clearTimeout` and `advance(ms)` (it runs
   the due timers in time order, then awaits `tick()`), and the cases below at the end of the file.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/generator-controller.test.js` | `a set action that never settles is cut at its own bound and keeps the displayed set` | `manualClock()`; `fakeClient({ clock, set: () => new Promise(() => {}) })`; `harness({ client, accepted: true })`; advance to 50,000; `controller.generateSet({ seed: 'seed-two' })`; advance 119,000 | `client.cancels` 1 at 169,000 and 0 before; the job ended (`state.job === null`); the set on show is still the accepted set; the notice is `N-NOSET` |
| same | `a fresh action after a long pause gets its own bound` | `manualClock()`; `fakeClient({ clock, batch: () => new Promise(() => {}), snapshot: { status: 'partial', reason: 'response-bound', accepted: [], made: {}, seenLayouts: [], seenClues: [] } })`; `harness({ client, accepted: true })`; the clock advanced to 500,000 with no action; then `controller.addMore()` | `client.cancels` 0 at 618,999; 1 at 619,000; the job ended; no puzzle added |
| same | `each action makes one scope from the client's clock` | the default `fakeClient`, wrapped so `newScope` calls are counted; one set action, then one `addMore` | `newScope` called twice, each with `false`; the `scope` of `sets[0]` and of `batches[0]` is the object it returned |
| same | the file's existing cases | the updated `fakeClient` | unchanged results |

## Documentation

`docs/design-detail.md` §8.4 gets one paragraph after P2-11a's:

- each Generator action has its own scope and response guard, from its own start;
- the CLI and the bench use `guardSetThenBatch`: one timer for an automatic `gen-v4`-route request, a guard per request
  on a legacy route;
- every guard is cleared when its operation ends.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked focused gate: `-NodeArgs @('--test', 'tests/generator-controller.test.js', 'tests/cli.test.js', 'tests/benchmark-matrix.test.js', 'tests/benchmark-report.test.js', 'tests/generation-deadline.test.js')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| the name check: `Select-String -LiteralPath (Join-Path $root 'generator\jobs.js') -Pattern 'responseGuard'` | slot root | at least 6 hits; and `-Pattern 'Date\.now\(\)'` shows only the line of `const now = options.now ?? (() => Date.now());` | 30 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

`tests/benchmark-matrix.test.js` runs `runCase`, so it covers the bench's `generate()` wiring.

## Stop points and questions

- **`QUESTION:`** when:
  - `jobs.js`'s revision fencing would show a late result after the guard's result;
  - the watchdog page's expectations (`tests/browser/watchdog.js`) conflict with the guard: report the conflicting
    check;
  - an existing controller, CLI or bench case fails with the new wiring.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-11b-B01 | The Generator's actions each answer within 120 s of their own start; a cut set keeps the set on show; a pause never shortens a later action | controller cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-11b-T01 | R9: `responseGuard`; one scope per UI action from the client's clock; guards cleared when the action settles | controller cases; the name check | test and command output |
| P2-11b-T02 | The CLI and the bench use `guardSetThenBatch` with P2-10's scope; existing behaviour unchanged | the existing CLI and bench cases; the diff | test output |
| P2-11b-T03 | The controller fixture gained `newScope`, `clock` and `prefixSnapshot` with every existing assertion kept | the existing cases | test output |

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
| Slot, base SHA | w2, abdf82a722621ea95f839fc9531b3faadaecb355 |
| Start, end, duration | dispatched 2026-11-25 23:26 +07:00 (developer 23:26:02 to 23:32:01); accepted 23:33 |
| Waiting for rulings | none |
| Agent id, model | 4e366503-2b11-427b-8613-fb91c5b8d1e9, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 27; 1,962,934 / 17,607 / 1,891,915 |
| AI credits | 54.28 |
| Questions and rulings | none; four minor deviations accepted by the orchestrator (generate.mjs destructures { set, batch: guarded } then casts batch as BatchJobResult after the set-failure branch, for @ts-check narrowing; the runBatch parameter is named settled to avoid shadowing; manualClock() and inertClock placed next to tick(); fakeClient typedef uses snapshot?: any and a looser clock?) |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | slot static guards; merge gate with the locked focused gate and the link-anchor check (results in the bookkeeping); developer: locked focused 105/105 (10.349 s), name check 7 responseGuard hits and only the options.now Date.now() line, G-PROTECTED, G-WORKTREE, G-FORMAT (5 files), G-CHECK OK, anchors 22 of 22 |
| Commit (slot), commit on `gen-v4` | this commit; its SHA on gen-v4 in the bookkeeping |
| Issues and named items | none; P2-09 owns the response-bound batch notice (batchShortfall still returns null for it); the browser watchdog page was not run (named only as a stop condition); the CLI and bench call sites have no new direct test, as the task says |
