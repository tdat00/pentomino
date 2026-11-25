# P2-16b: The browser deadline page and its six checks

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.5, §4.6 ("browser deadline checks run on the shipping build"), §4.9; §7.2 (six browser checks), §7.6 (990 s); P2-B08, P2-T09, P2-T13; review-1 R12 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-16b` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | join; P2-09 (texts and notices), P2-11b (the guard in the Generator) and P2-16e (the runner) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 3 h; machine: six locked checks (at most 120 s each) |

## Goal

Six checks in a real browser prove the deadline wiring and the new texts on the shipping build:

- a typed set failure through a held set assembly;
- a batch prefix through a held batch assembly;
- the fence against a late answer;
- a fresh bound after a pause;
- the no-window notice in both languages;
- a screen-capped step without a score.

One page holds them; P2-16e's runner runs one check per locked invocation.

## Authority and fixed points

- **R12, verbatim in substance:**
  - Construct `clock = scaledClock(systemClock, 20)` once, and pass it to `createPool` and `createGenerationClient`; the
    response guard reads it through `client.clock()` (P2-11b).
  - Reuse the watchdog page's real-app DOM fixture and `createGeneratorApp` call.
  - The app forces one puzzle per press (`generator/app.js:32`, `:98`). A worker that never answers exercises the
    115-s stop, not the 119-s guard.
  - `set-bound` holds the **set assembly** after a successful attempt; `batch-prefix` holds the **batch assembly** after
    one accepted puzzle.
  - Each check has its own 60-s watchdog (the runner's `--timeout-s 60`).
- **The model page:** `tests/browser/watchdog.js` and `watchdog.html`:
  - the imports, the clock and the pool and client set-up (lines 12-17, 83 and 117-118);
  - the `check`, `assert`, `waitFor` and `h` helpers (lines 33-81);
  - the memory storage (121-128), the DOM fixture (130-137), the app call (139-144);
  - the result list, `data-summary` and `data-result` (236-249);
  - the CSP `<meta>` of `watchdog.html`.
- **The Generation steps section, alone:** the pattern of `tests/browser/replay.js`:
  - `samplePack` and `sampleSet` from `../fixtures/generated-sample-pack.json` (lines 153-156);
  - `scriptedStep` (407-410);
  - `mountAlone` with `mountGenerationSteps(host, { t, run, cache, cellPxOf })` (428-440);
  - `stepRows` (355) and `waitSteps` (377-381);
  - the rows are `tr.steps-row[data-kind]`, with the cells `td.steps-what` and `td.steps-score`
    (`generator/ui/generation-steps.js:202-208`).
- **The worker envelope.** The pool sends `{ type: 'task', id, kind, payload }`; a worker replies
  `{ type: 'result', id, value }`, `{ type: 'error', id, code, message }` or `{ type: 'progress', id, ... }`. There is no
  handshake. A set attempt's payload has `attempt`.
- **No scripted geometry.** Successful sets and puzzles come from the real engine on a 10x6 Hard board, which takes
  milliseconds. Only failures (plain values) and timing are scripted, through a page-side wrapper around the production
  worker `core/workers/engine.worker.js`. The steps section uses the committed sample pack.
- **Real times at scale 20:** 115 s virtual is 5.75 s real; 119 s is 5.95 s; 120 s is 6 s.
- **The texts** are D-P2-16's (P2-09), English and Vietnamese, with `{level}` filled by `levelLabel('hard')` of
  `generator/strings.js` in the active locale.

## Scope

- **Create:** `tests/browser/deadline.html` and `tests/browser/deadline.js`; the six receipts and console logs under
  `docs/improve-generating-phase-2/evidence/P2-16b/<check>/`.
- **Do not change:** production code (a defect is a `QUESTION:`) and the developer guides (P2-17 lists the page).
  Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $checks = @('set-bound', 'batch-prefix', 'late-fence', 'fresh-after-pause', 'no-window-texts', 'screen-capped-step')
  $Allowed = @('tests/browser/deadline.html', 'tests/browser/deadline.js',
    'tasks/improve-generating-phase-2/P2-16b-browser-deadline-checks.md') + @($checks | ForEach-Object {
      "docs/improve-generating-phase-2/evidence/P2-16b/$_/receipt.json"; "docs/improve-generating-phase-2/evidence/P2-16b/$_/console.log" })
  ```

## Steps

1. **`deadline.html`:** `watchdog.html` with its own title and text, `<script type="module" src="./deadline.js">`,
   and the same `summary`, `results`, `report` and `sandbox` elements.
2. **`deadline.js`, the set-up.**
   - `const clock = scaledClock(systemClock, 20);`
   - `mode` is a module-level object that each check sets before its action. It has three optional parts:
     - `answer(task)`: returns `{ value }` (a scripted reply), `'hold'` (never answer) or `undefined` (the real
       worker);
     - `delay`: `{ kind, untilRealMs }`, which buffers the real worker's replies to tasks of that kind until that real
       time;
     - `hold`: `'set'`, `'batch'` or `null`, for `assemblyGate`.
   - **`wrappedWorker()`** returns a `WorkerLike`:
     - it creates `new Worker(new URL('../../core/workers/engine.worker.js', import.meta.url), { type: 'module' })`
       and keeps the `message` listeners;
     - `postMessage(task)` asks `mode.answer`: a `{ value }` is delivered to the listeners as
       `{ data: { type: 'result', id, value } }` in a microtask; `'hold'` keeps the task forever; `undefined` forwards
       the task to the real worker;
     - the real worker's replies reach the listeners unchanged, except those buffered by `mode.delay`;
     - `terminate()` terminates the real worker.
   - **`mount()`** creates the pool, client, storage, DOM and app, and returns them with `destroy()`:
     - `pool = createPool({ size: 4, workerFactory: wrappedWorker, clock })`;
     - `client = createGenerationClient(pool, { clock, assemblyGate: (p) => (p === mode.hold ? new Promise(() => {}) : Promise.resolve()) })`;
     - the storage, the DOM fixture and `createGeneratorApp(document, { storage, client, random: () => 'DEADLINE-SEED', controller: { cancelPending: () => pool.cancelAll() } })`,
       as `watchdog.js` does;
     - `destroy()` is `pool.close(); app.destroy(); root.remove();`.

     Each check mounts its own app and destroys it in a `finally`.
   - **`realSet(m)`** resizes to 10x6 (`m.app.editor.resize(10, 6)`), clicks the `hard` level radio, clicks
     `[data-action="generate-set"]`, waits at most 30 s for a set with no job, and returns it.
   - **Running the checks.** `?check=<name>` runs that check only; no parameter runs all six in order. The end of the
     page is `watchdog.js` lines 236-249, with `data-summary`.
3. **The six checks**, with names exact. `t0` is `performance.now()` at the action's click, and `elapsed` is measured
   from it.

   | Check | Action | Expected |
   |---|---|---|
   | `set-bound` | `realSet`; then `mode.hold = 'set'`; click New piece set | the job ends by 10 s; `elapsed` from 5.85 to 6.5 s (the 119-s guard); the notice is `N-NOSET`; the set on show is the same object as before |
   | `batch-prefix` | `realSet`; `mode.hold = 'batch'`; click `[data-action="new-puzzles"]` | the job ends by 10 s; `elapsed` from 5.85 to 6.5 s; one puzzle is shown; `seenLayouts` has 1 key; the notice is `N-PARTIAL` |
   | `late-fence` | `realSet`; `mode.delay = { kind: 'setAttempt', untilRealMs: t0 + 7000 }`; click New piece set; count the store's notice changes from the click on | the job ends with `elapsed` from 5.7 to 6.5 s (the 115-s stop); notice `N-NOSET`; at 8 s: exactly one notice change; the same set on show; no job |
   | `fresh-after-pause` | `realSet`; click New puzzles once (it reuses the calibration, no worker); wait 3 s (60 s virtual); `mode.answer = (task) => (task.kind === 'puzzleCandidate' ? 'hold' : undefined)`; click New puzzles again | the second job ends with `elapsed` from 5.7 to 6.5 s from its own click; notice `N-PARTIAL`; the first puzzle is still shown |
   | `no-window-texts` | resize to 10x6 and choose `hard`; `mode.answer`: a `setAttempt` with `payload.attempt` below 4 gets `{ value: { ok: false, reason: 'no-window-below', counters: { budgetStops: 0, screenCapped: 0, rescueReratings: 0, tailReratings: 0 } } }`, any later one `'hold'`; click New piece set | the job ends within 10 s; the notice text equals D-P2-16's English `notice.N-NOSET.below` with `{level}` filled; after `setLocale('vi', document)`, the Vietnamese text; then `setLocale('en', document)` |
   | `screen-capped-step` | `mountAlone(async () => result)` with `result = { status: 'matched', reason: null, stages: { set: 'replayed', candidate: 'replayed', final: 'compared' }, compared: [], work: 0, steps }`. `steps`: `scriptedStep(1, 'count', { k: 9, min: 9, max: 9 })`, `scriptedStep(2, 'carve', { mode: 'flat', parts: 0 })`, `scriptedStep(3, 'piece', { n: 1 })`, `{ ...scriptedStep(5, 'rated', { phase: 'locate', sequence: 1 }), rating: samplePack.puzzles[0].rating, board: { placed: [], lifted: [], clues: samplePack.puzzles[0].clues } }`, `scriptedStep(5, 'unrateable', { phase: 'locate', sequence: 2, reason: 'screen-capped' })`, `scriptedStep(7, 'final', { status: 'matched', detailStep: null })`. `steps.show({ set: sampleSet, puzzle: samplePack.puzzles[0], setOrigin: null, made: null }, { rotation: 0, busy: false })`; `waitSteps`; click `[data-field="steps-view-all"]` | the `unrateable` row's `td.steps-what` contains "It only guides the search; it has no score." and its `td.steps-score` text is empty; the `rated` row's `td.steps-what` contains "is rated to find how many clues this level needs: score"; after `setLocale('vi', document)` and `steps.refreshTexts()`, the `unrateable` row contains "Kết quả chỉ định hướng việc tìm kiếm; không có điểm."; then `setLocale('en', document)` |

4. **Run the six checks**, each locked, with P2-16e's runner:
   `Invoke-IgNode -Repo pentomino -Task 'P2-16b <check>' -LimitSeconds 120 -QuietSeconds 45 -NodeArgs @('tools\ig-proto\phase2\browser-run.mjs', '--page', 'tests/browser/deadline.html', '--check', '<check>', '--out', 'docs\improve-generating-phase-2\evidence\P2-16b\<check>')`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/browser/deadline.html` | the six checks of step 3 | the page under the runner, one check per run | each receipt `status: 'pass'`; each `CHECK-END` line at most 60 s |

## Documentation

None; P2-17 adds `deadline.html` to the browser pages list of both developer guides.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 4, six runs (locked) | §3.3 | six receipts with `status: 'pass'`; exit 0 each | 120 s each |
| `node --check tests/browser/deadline.js` | slot root | exit 0 | 30 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

In the merge gate, the orchestrator runs the six checks again on a tree holding both P2-15 and P2-16b (check-list §3.7).

## Stop points and questions

- **Stop** at the first check that fails or passes 60 s, and report its console lines. No production edit here.
- **`QUESTION:`** when `stepText` reads the locate score from somewhere other than the step's `rating`, or when the app
  offers no `hard` radio on 10x6.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-16b-B01 | P2-B08: users see the approved texts in both languages; a cut set leaves the shown set; a screen-capped step shows no score | the checks | `E/P2-16b/<check>/receipt.json` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-16b-T01 | P2-T09 in a real browser: the typed set failure and the batch prefix through held assemblies, the late fence, a fresh bound after a pause | the checks | the receipts |
| P2-16b-T02 | P2-T13: every browser check within 1 minute | the `CHECK-END` seconds and `durationMs` | the receipts |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Six checks pass, each within 60 s
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the six `CHECK-END` lines and the helper lines;
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
