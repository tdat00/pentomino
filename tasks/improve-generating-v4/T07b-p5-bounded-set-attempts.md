# T07b: P5 in the prototype: bounded set attempts, the arm `v4-p5`, pool invariance

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P5 ("Bounded set attempts"), §5.1 stage 2 ("the P5 budget arm"), §6 ("Pool invariance"), §9 (P5's bounded set attempts and P-OD12); decisions D-V4-03, D-V4-05, D-V4-08; drift DR-O11; review RV1-09, RV2-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T07a |
| Depends on | T07a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3.5 h (3 h and a fix round of 0.5 h, ruling of 2026-11-17), machine 0 min (scripted pools; verification through the lock helper) |

## Goal

A set request whose first attempts all end without a window on the same side stops with a notice that names the side,
instead of running to the clock. This task builds that bound in the pilot arm `v4-p5` (with T07a's budget) so that the
outcome is the same for 1, 2, 4 and 8 workers, whatever order the attempts finish in.

## Authority and fixed points

- Plan §3 P5: "A set attempt whose `locateCount` ends without a window fails at once with a reason that names the
  side. When the first attempts all fail on the same side, the request ends with a notice instead of running to the
  stop." §6: "the puzzles of a request are the same for 1, 2, 4 and 8 workers".
- Review RV1-09 (accepted): the bound is evaluated after the cancel and deadline checks and before the ordered winner
  scan (`core/browser/generation-client.js:664-686`), so that an attempt beyond the bound that finishes early cannot
  win at one pool width and lose at another.
- P-OD12 (`tasks/difficulty-v3/check-list.md:317`: no fail-fast in `gen-v3`) stays: the bound exists only in the
  `v4-p5` tree; only `selectCluesV4` (Nightmare and Hell 1, D-V4-03) reports a side, so a legacy target never meets
  the bound; its false stops are counted against the uncapped search under IG-P-D1 (plan §9; T09d's `p5Stops`).
- Pack-author values for the pilot arm (stage 2 fits the table, stage 3 freezes it, N-V4-03): a call budget of
  2,000,000,000 units for every Nightmare and Hell 1 call (R21: 5 % of successful prototype calls passed 2 G, none
  6 G) and a bound of 4 set attempts (the four-worker pool's first wave).
- D-V4-05: the side field is written only when `IG.setAttemptsBound` is set, so the existing `v4` arms are unchanged.
- The budget end in `any` mode (ruling of 2026-11-17, T07b's report): plan §3 P5 says "When it is used up the call ends
  with its best result or `not-in-band`", and review R10 says "Do not call the lazy `chooseBest` path if it can perform
  new work after exhaustion". In `any` mode `finish` returns the raw subset (no rating, no count, no rng draw), so
  `chooseBest` can do no work. T07a's text had dropped R10's condition, so every budget stop of an `any` call (the mode
  the frozen round measures, `arm.mjs`, and the Generator's default, `generator/state.js:139`) returned `not-in-band`
  while in-band candidates waited. Step 1b corrects it; `require` keeps T07a's end (a repair is new work).

## Scope

- Create: `tools/ig-proto/variants/v4-p5.json` (step 2); `tools/ig-proto/variants/v4-p5-w8-test.json` and
  `tools/ig-proto/variants/v4-link-w8-test.json` (step 2b); `tools/ig-proto/lib/fake-pool.mjs` (step 3).
- Change: `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js` (steps 1 and 1b);
  `tools/ig-proto/self-test.mjs` (cases); `tools/ig-proto/README.md` (a paragraph, and two passages of step 5).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T07b --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants/v4.json tools/ig-proto/variants/link.json tools/ig-proto/variants/w8.json`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T07b --label frozen`.
1. **No-window side** in `ig-select-v4.js`: `failNoWindow` returns `{ ok: false, reason: 'not-in-band',
   ...(IG.setAttemptsBound === undefined ? {} : { igNoWindow: noWindow === 'below-to-one' ? 'below' : 'above' }) }`
   (the journaled result is unchanged).
1b. **The budget end in `any` mode** (Authority, last bullet) in `ig-select-v4.js`: in the top-level `catch` of
   `searchV4`, the `BudgetStop` branch reads

   ```js
       if (e instanceof BudgetStop) {
         loc.budgetStop = { limit: budget, spent, overshoot: spent - budget };
         // R10: no new work after the stop. In 'any' mode `finish` returns the raw subset (no rating, no count, no
         // rng draw), so `chooseBest` does no work and returns the best waiting in-band candidate (plan P5).
         const best = uniqueness === 'any' ? chooseBest() : bestFinished();
         if (best !== null) {
           return conclude(best);
         }
         verifyConsumed();
         return { ok: false, reason: 'not-in-band' };
       }
   ```

   (only the comment and the `const best` line change). In the file header, the line

   ```js
   //       every rating and every uniqueness count, it returns the best already finished result or `not-in-band`.
   ```

   becomes the two lines

   ```js
   //       every rating and every uniqueness count, it returns its best result or `not-in-band`: in `require` the best
   //       already finished final, in `any` the best waiting in-band candidate (V4-T07b: finishing costs nothing there).
   ```

   The `v4`-family tree ids move again, as after T07a (the ruling of T07a's report); report the new ids.
2. **`variants/v4-p5.json`**: `"id": "v4-p5"`, `"extends": ["v4-link"]`, `"description"`: "P5 pilot arm (V4-T07b): a
   2 G-unit budget per Nightmare and Hell 1 selection call and a bound of 4 set attempts on a no-window side.",
   `"files": []`, `"params": { "callBudget": { "default": 2000000000 }, "setAttemptsBound": 4 }`, and the edits (each
   `find` occurs once in its file of the `v4-link` tree; checked by the pack author on `3fc65f4` with the `instr` and
   `log` edits applied):

   | Id | File | Find | Replace |
   |---|---|---|---|
   | `p5-1` | `core/engine/generate.js` | `  if (!cal.ok) {\n    return { ok: false, reason: cal.reason };\n  }\n` | `  if (!cal.ok) {\n    return { ok: false, reason: cal.igNoWindow === undefined ? cal.reason : 'no-window-' + cal.igNoWindow };\n  }\n` |
   | `p5-2` | `core/browser/generation-client.js` | `        // The lowest successful attempt wins: scan the resolved prefix in order.\n` | `        // ig-proto v4-p5 (V4-T07b): the bound is read before the ordered scan, so that it does not depend on the pool width.\n        const igBound = igSetBound(results);\n        if (igBound !== null) {\n          return { status: 'failed', reason: igBound, failures: tally() };\n        }\n` then the found line |
   | `p5-3` | `core/browser/generation-client.js` | append | the block below |

   ```js

   // ig-proto, variant v4-p5 (V4-T07b): bounded set attempts (plan P5). The request ends when the first
   // IG.setAttemptsBound attempts all failed without a window on the same side; a success among them wins as today.
   import { IG as IG_P5 } from '../engine/ig-params.js';

   /**
    * @param {Map<number, { kind: string, reason?: string }>} results
    * @returns {string | null} The common `no-window-<side>` reason, or null when the bound does not fire.
    */
   export function igSetBound(results) {
     const n = IG_P5.setAttemptsBound;
     if (!Number.isInteger(n) || n < 1) {
       return null;
     }
     /** @type {string | null} */
     let side = null;
     for (let j = 0; j < n; j += 1) {
       const r = results.get(j);
       if (r === undefined || r.kind !== 'fail' || typeof r.reason !== 'string' || !r.reason.startsWith('no-window-')) {
         return null;
       }
       if (side !== null && side !== r.reason) {
         return null;
       }
       side = r.reason;
     }
     return side;
   }
   ```

2b. **Test-only width-8 trees** (RV2-05: the frozen `core/browser/worker-pool.js:75` has `MAX_POOL_SIZE = 4`, and
   `createPool` rejects a larger size at `:194-196`, before any worker exists). `variants/v4-p5-w8-test.json`: `"id":
   "v4-p5-w8-test"`, `"extends": ["v4-p5", "w8"]`, `"edits": []`, `"files": []`, `"params": {}`, `"description"`:
   "Test only (V4-T07b): v4-p5 with the eight-worker pool limit of w8, for the width-8 scripted cases; never an arm
   or a plan step."; `variants/v4-link-w8-test.json`: the same with `v4-link` in place of `v4-p5`. The composition
   adds exactly one edit, `w8-1` (`export const MAX_POOL_SIZE = 4;` to `8`, once, in the copied
   `core/browser/worker-pool.js`); no production limit or default changes.
3. **`lib/fake-pool.mjs`** (`// @ts-check`): a port of `settle`, `createFakeClock`, `FakeWorker`, `harness` and `track`
   of `tests/generation-client.test.js:19-136` and `:197-203`, with `harness(createPool, o)` taking the tree's
   `createPool` as its first parameter (nothing else changes); exports `settle`, `createFakeClock`, `FakeWorker`,
   `harness`, `track`.
4. **Self-test** (`--v4`): `scriptedSet(variant, width, script)`: loads the `core/browser/worker-pool.js` and
   `core/browser/generation-client.js` of the tree `variant` for the widths 1, 2 and 4 and of the tree
   `<variant>-w8-test` for the width 8, by file URL, `h = harness(createPool, { size: width, handler })` where `handler`
   answers a `setAttempt` task at once when `script[attempt].now` is true and holds it otherwise;
   `createGenerationClient(h.pool, { clock: h.clock, createdAt: () => '2026-01-01T00:00:00.000Z' })`;
   `generateSet({ boardRows: recipe.boardRows, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness:
   'any', maxActive: 676 })` (`recipe` = `tests/fixtures/generation-case.json`); then, at most 64 times: `await
   settle()`, stop when the request has resolved, else answer the held task with the lowest attempt whose worker is
   not terminated and that has not been answered. A script entry is `{ fail: <reason> }` (the value `{ ok: false,
   reason }`) or `{ ok: true }` (the value `{ ok: true, set, calibration, attempt }` from the tree's
   `generate.firstSetAttempt` on the recipe, built once per tree as `fixture()` of the test file does); attempts
   without an entry fail with `not-in-band`. Cases in the Tests table. T07a's case `p5: budget end with unfinished
   candidates, every observer mode` gains, for (C), "and no event of kind `repair`" (a repair stopped by the budget
   records nothing; ruling of 2026-11-17, T07a's report).
5. **README.md**: a paragraph "P5 bounded set attempts (V4-T07b)": the side reason, the bound and its place before the
   ordered scan, the arm `v4-p5` and its two values with the pack author's reason, that false stops are counted in T09d
   against the uncapped arm, and that the legacy targets never report a side (P-OD12). In the fix round (ruling of
   2026-11-17): (a) in that paragraph, "Edit `p5-1` makes the set attempt (`firstSetAttempt`) report" becomes "Edit
   `p5-1` makes the set attempt (`setAttempt` of `core/engine/generate.js`, which a worker runs for one attempt;
   `firstSetAttempt`, its serial loop, sees the same reason) report", and its **Self-test** bullet names the case
   `p5: budget end in any mode returns the best waiting candidate`; (b) the bullet **The end.** of "P5 call budget
   (V4-T07a)" becomes:

   ```markdown
   - **The end.** The search catches the stop at its top level. With `uniqueness: 'require'` the result is the best
     already finished final result of the finals cache (the existing centre and tie order, no new work: `chooseBest` is
     not called, because it would repair). With `uniqueness: 'any'` the result is `chooseBest()`, which does no work in
     that mode (`finish` returns the raw subset: no rating, no count, no rng draw), so the call ends with its best
     waiting in-band candidate (plan P5: "the call ends with its best result"; review R10: "if it can perform new work";
     V4-T07b). Without a result the call ends `{ ok: false, reason: 'not-in-band' }`. A repair interrupted by the stop is
     never accepted (its candidate stays unfinished), no event records the budget end (the event kinds stay those of
     D-V4-06; an `any` result is announced by its `selected` event, as every result is), and the skip verification and
     the observers' exceptions are kept (`verifyConsumed()` runs before either result).
   ```

## Tests

All in `tools/ig-proto/self-test.mjs --v4`; each scripted case runs at the widths 1, 2, 4 and 8 (the width 8 in the
`-w8-test` tree of step 2b).

| Case name | Input | Expected |
|---|---|---|
| `p5: no-window side` | `v4Call('side-below', { prior: null, screen: () => synthetic(30), variant: 'v4-p5' })`; `v4Call('side-above', { prior: null, screen: () => 'cap', canon: () => synthetic(90), variant: 'v4-p5' })`; the second also in the `v4` tree | `v4-p5`: `result.igNoWindow` `'below'` and `'above'`; `v4`: no `igNoWindow` field |
| `p5: bounded set attempts rule` | `igSetBound` imported from the `v4-p5` tree's `core/browser/generation-client.js` on maps of `j -> result`: (a) 0-3 `fail` `no-window-below`; (b) 0-2 `no-window-below`, 3 `no-window-above`; (c) 0-3 `no-window-above`; (d) 0 `ok`, 1-3 `no-window-below`; (e) 0-2 `no-window-below` only; (f) 0-3 `no-window-below` except 2 `carve`; (g) 0-2 `no-window-below`, 3 `{ kind: 'fault', error: new Error('worker') }`; (h) 0-2 `no-window-below`, 3 `{ kind: 'skipped' }` ((g) and (h): ruling of 2026-11-17, T07b's report) | (a) `'no-window-below'`; (b) `null`; (c) `'no-window-above'`; (d) `null`; (e) `null`; (f) `null`; (g) `null`; (h) `null` |
| `p5: a later success does not beat the bound` | `scriptedSet('v4-p5', w, s)` with `s[0..3] = { fail: 'no-window-below' }` (held) and `s[4] = { ok: true, now: true }` | at every width: `{ status: 'failed', reason: 'no-window-below' }` with `failures['no-window-below'] === 4` |
| `p5: a success inside the bound wins` | `s[0], s[1], s[3] = { fail: 'no-window-below' }`, `s[2] = { ok: true }`, all held | at every width: `status: 'complete'`, `attempt: 2` |
| `p5: mixed sides do not stop` | `s[0], s[1] = { fail: 'no-window-below' }`, `s[2], s[3] = { fail: 'no-window-above' }`, `s[4] = { fail: 'not-in-band' }`, `s[5] = { ok: true }`, all held | at every width: `status: 'complete'`, `attempt: 5` |
| `p5: without the bound the later success wins` | the first scripted case in the `v4-link` tree (width 8: `v4-link-w8-test`) | at every width: `status: 'complete'`, `attempt: 4` |
| `p5: the width-8 trees` | `MAX_POOL_SIZE` imported from the `worker-pool.js` of `v4-p5`, `v4-p5-w8-test` and `v4-link-w8-test` | 4, 8, 8 |
| `p5: a budget-stopped call replays its skips` (T07a's report) | in the `v4` tree, with T02b's helpers, `x = { igPrior: null, igScreen: synth(e, DOWN), igCanonical: synth(e, (c) => synthetic(c <= 4 ? 60 : 56)), uniqueness: 'require' }` (ruling of 2026-11-17, T07b's Q1: with `DOWN` for both seams and `any`, `L` is `[1, 760000000, 1]` and the budget stops before the first in-band candidate, so the stopped call has no skips; this input stops with a finished final, R1 `ok` with `skips.subsets` `[0, 2]`): R0 = `e.clues.selectClues(await v4Ctx(e, ws, 'p5-skip-g', { ...x, record }))`, `K0` the clue keys of its events of `sequence` 0 and 1 (as T02b's case 3); U = the same name and `x` with `excludeClueKeys: new Set(K0)` and `charge: (u) => L.push(u)`; `B` = the sum of the first `Math.ceil(L.length / 2)` entries of `L`; R1 = `journaled('p5-skip-r1', () => e.clues.selectClues(<U's context without charge, with igBudget: B>))`; R2 = the same context with `excludeClueKeys: new Set()` and `replaySkips: R1.result.skips`; R3 = R2's context with `replaySkips: { subsets: [...R1.result.skips.subsets, 2191], repairs: R1.result.skips.repairs }` | `L.length >= 2`; `R1.result.skips.subsets[0] === 0` and R1's `end` line has `locate.budgetStop`; R2 deep-equals `R1.result` (the replay meets the same units and stops at the same point, so every recorded skip lies before it); R3 throws the tree's `SkipReplayError` with `reason: 'unused'`, `list: 'subsets'`, `ordinal: 2191` |
| `p5: budget end in any mode returns the best waiting candidate` (ruling of 2026-11-17, T07b's report) | `S2A = { ...BEGIN_CALL_2, uniqueness: 'any' }` (T07a's S2 in `any` mode: every in-band rating is 56, never central) and the one name `'endany'` for every call; U = `v4Call('endany', { ...S2A, extra: { charge: true, igChargeKinds: [] } })`, `L = U.chargeLog`, `n = L.length`, `P = prefix(L)`; for every `i` from 0 to `n - 1`: `E_i = []` and R_i = `v4Call('endany', { ...S2A, extra: { igBudget: P[i], charge: true, igChargeKinds: [], record: (ev) => E_i.push(ev) } })`, and `W_i` = the events of `E_i` of kind `rated` with `55 <= rating.score < 70` (the waiting candidates); `h` = the least `i` with `W_i.length >= 2`; A = `v4Call('endany', { ...S2A, extra: { igBudget: P[h] } })`; Bm = `v4Call('endany', { ...S2A, extra: { igBudget: P[h], charge: true, igChargeKinds: [] } })` | U: `result.ok === true`, `result.rating.score === 56`, `result.certificate === null`, no `budgetStop` in `end.locate`; for every `i`: `R_i.chargeLog` deep-equals `L.slice(0, m(P, P[i]))`, `R_i.end.locate.budgetStop` deep-equals `{ limit: P[i], spent: P[m(P, P[i])], overshoot: P[m(P, P[i])] - P[i] }`; when `W_i` is empty, `R_i.result` deep-equals `{ ok: false, reason: 'not-in-band' }` and `E_i` has no `selected` event; otherwise `R_i.result.ok === true`, `R_i.result.rating.score === 56`, `R_i.result.certificate === null`, and the last event of `E_i` is its only `selected` event, whose `sequence` is the `sequence` of an event of `W_i`; coverage: some `i` has `W_i` empty and `h` exists; A's and Bm's results deep-equal R_h's; Bm's charge log deep-equals `L.slice(0, m(P, P[h]))` |

## Documentation

`tools/ig-proto/README.md` (step 5).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\lib\tree.mjs build v4-p5 v4-p5-w8-test v4-link-w8-test --label frozen` and `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | built; one `ok` line per declared variant, no error | 3 min |
| `Invoke-IgNode -Repo pentomino -Task 'V4-T07b verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--v4', '--task', 'V4-T07b')` (check-list §3.2) | root | every `--v4` case passes, exit 0 | 5 min (the helper's 300 s) |
| `node tools\ig-proto\firewall.mjs check --task V4-T07b --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a production file, the legacy dispatch or the pilot values of step 2.
- `QUESTION:` when a scripted case gives different outcomes at two widths (report the per-width outcomes and the
  answered order); when a case of T02a to T07a fails after this change; when the coverage assertion of `p5: budget end
  in any mode returns the best waiting candidate` fails (report `n` and `W_i.length` for every `i`; the scenario is the
  pack author's to change).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07b-B01 | A set request ends with a notice naming the side when its first attempts all fail without a window on that side, at every pool width; the legacy path is unchanged (P-OD12) | cases 3 to 6 | self-test output |
| T07b-B02 | A call stopped by its P5 budget in `any` mode (the mode the frozen round measures and the Generator's default) ends with its best waiting in-band candidate, and with `not-in-band` only when none waits; `require` keeps the best already finished final (plan P5, R10; ruling of 2026-11-17) | the case `p5: budget end in any mode returns the best waiting candidate`; T07a's three `p5:` cases still pass | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07b-T01 | The bound reads before the ordered scan; its rule | cases 2 and 3; diff of `p5-2` | self-test output; diff |
| T07b-T02 | Pool invariance at 1, 2, 4 and 8 workers for the four scripts; the width 8 really runs (an eight-worker pool in the `-w8-test` trees only) | cases 3 to 7 | self-test output |
| T07b-T03 | The side field only in a tree with the bound | case 1 | self-test output |
| T07b-T04 | Nothing else changed; formats | guards; `npm run check` | command output |
| T07b-T05 | A call stopped by its P5 budget replays its recorded skips to the same result, and a repair the budget stopped records no event (T07a's report) | the case `p5: a budget-stopped call replays its skips`; T07a's case `p5: budget end with unfinished candidates, every observer mode` | self-test output |
| T07b-T06 | The `any` budget end does no new work: a stopped call's charge log is the unbudgeted prefix, its result is the same at every observer mode, and its `selected` event names a waiting candidate; `igSetBound` never counts a `fault` or a `skipped` attempt | the case `p5: budget end in any mode returns the best waiting candidate`; case 2 (g) and (h) | self-test output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-17 13:01:32 +07:00 (dispatch, base `e2745bd`) to 13:50:36 +07:00 (acceptance): 49 min 4 s; the developer's own times 13:01:57-13:24:02 and, after the ruling, 13:42:28-13:48:15 |
| Waiting for rulings | about 18 min (13:24:02 report to 13:42 relay of the ruling) |
| Agent id, model | `6b6fa586-8b67-42b8-ae30-d2cb4fb3c61e`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 114 calls; 23,474,492 input, 116,477 output, 22,856,796 cache-read |
| AI credits | 499.46 |
| Questions and rulings | Q1 (non-blocking, default taken): the replay case's specified input (`DOWN`, `any`) cannot leave skips behind a stop; the `require` input with `p5-skip-g` accepted. The named item "under `any` a budget-stopped call returns no puzzle" was ruled a mistake in T07a's text (plan P5: "ends with its best result"; `chooseBest` does no new work in `any` mode): fix round with step 1b, a new case, `igSetBound` inputs (g) and (h), README text (T07b-B02, T07b-T06); N-V4-16 routes the untested `p5-1` glue to stage 2; pack amendment `7c3d851` |
| Fix rounds | 1 (step 1b, the any-mode budget-end case, two rule inputs, the README) |
| Gates re-run by the orchestrator | `--v4` through the lock helper (`V4-T07b-verify`): 27 passed, 0 failed, `IG … exit=0 seconds=26.825` (outcomes equal at widths 1, 2, 4 and 8; the any-mode case 48 operations and 48 budgets); `--items`: 44 passed; `--frozen`: 10 passed; `check-edits`: 26 `ok` (`v4-p5` 60, `v4-p5-w8-test` 61, `v4-link-w8-test` 58), no error; stage-1 `evidence-check`: unchanged (20 files); `check-binding`: pass; firewall `check` (V4-T07b): 289 production files unchanged; `npm run check`: OK. The developer's mutation check: the old `bestFinished()` rule fails the new case at budget index 3. No machine time counted (round 2,724 s) |
| Commit | this task's commit, `improve-generating T07b: P5 in the prototype: bounded set attempts, the arm v4-p5, pool invariance` |
| Issues and named items | N-V4-16 (the `p5-1` glue and the worker's pass-through of `reason` first run end to end in stage 2). The `v4`-family tree ids moved (v4 `5dcbd71e…` after this task) |
