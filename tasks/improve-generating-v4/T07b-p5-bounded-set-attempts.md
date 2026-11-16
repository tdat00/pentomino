# T07b: P5 in the prototype: bounded set attempts, the arm `v4-p5`, pool invariance

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P5 ("Bounded set attempts"), §5.1 stage 2 ("the P5 budget arm"), §6 ("Pool invariance"), §9 (P5's bounded set attempts and P-OD12); decisions D-V4-03, D-V4-05, D-V4-08; drift DR-O11; review RV1-09, RV2-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T07a |
| Depends on | T07a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (scripted pools; verification through the lock helper) |

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

## Scope

- Create: `tools/ig-proto/variants/v4-p5.json` (step 2); `tools/ig-proto/variants/v4-p5-w8-test.json` and
  `tools/ig-proto/variants/v4-link-w8-test.json` (step 2b); `tools/ig-proto/lib/fake-pool.mjs` (step 3).
- Change: `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js` (step 1); `tools/ig-proto/self-test.mjs`
  (cases); `tools/ig-proto/README.md` (a paragraph).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T07b --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants/v4.json tools/ig-proto/variants/link.json tools/ig-proto/variants/w8.json`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T07b --label frozen`.
1. **No-window side** in `ig-select-v4.js`: `failNoWindow` returns `{ ok: false, reason: 'not-in-band',
   ...(IG.setAttemptsBound === undefined ? {} : { igNoWindow: noWindow === 'below-to-one' ? 'below' : 'above' }) }`
   (the journaled result is unchanged).
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
   without an entry fail with `not-in-band`. Cases in the Tests table.
5. **README.md**: a paragraph "P5 bounded set attempts (V4-T07b)": the side reason, the bound and its place before the
   ordered scan, the arm `v4-p5` and its two values with the pack author's reason, that false stops are counted in T09d
   against the uncapped arm, and that the legacy targets never report a side (P-OD12).

## Tests

All in `tools/ig-proto/self-test.mjs --v4`; each scripted case runs at the widths 1, 2, 4 and 8 (the width 8 in the
`-w8-test` tree of step 2b).

| Case name | Input | Expected |
|---|---|---|
| `p5: no-window side` | `v4Call('side-below', { prior: null, screen: () => synthetic(30), variant: 'v4-p5' })`; `v4Call('side-above', { prior: null, screen: () => 'cap', canon: () => synthetic(90), variant: 'v4-p5' })`; the second also in the `v4` tree | `v4-p5`: `result.igNoWindow` `'below'` and `'above'`; `v4`: no `igNoWindow` field |
| `p5: bounded set attempts rule` | `igSetBound` imported from the `v4-p5` tree's `core/browser/generation-client.js` on maps of `j -> result`: (a) 0-3 `fail` `no-window-below`; (b) 0-2 `no-window-below`, 3 `no-window-above`; (c) 0-3 `no-window-above`; (d) 0 `ok`, 1-3 `no-window-below`; (e) 0-2 `no-window-below` only; (f) 0-3 `no-window-below` except 2 `carve` | (a) `'no-window-below'`; (b) `null`; (c) `'no-window-above'`; (d) `null`; (e) `null`; (f) `null` |
| `p5: a later success does not beat the bound` | `scriptedSet('v4-p5', w, s)` with `s[0..3] = { fail: 'no-window-below' }` (held) and `s[4] = { ok: true, now: true }` | at every width: `{ status: 'failed', reason: 'no-window-below' }` with `failures['no-window-below'] === 4` |
| `p5: a success inside the bound wins` | `s[0], s[1], s[3] = { fail: 'no-window-below' }`, `s[2] = { ok: true }`, all held | at every width: `status: 'complete'`, `attempt: 2` |
| `p5: mixed sides do not stop` | `s[0], s[1] = { fail: 'no-window-below' }`, `s[2], s[3] = { fail: 'no-window-above' }`, `s[4] = { fail: 'not-in-band' }`, `s[5] = { ok: true }`, all held | at every width: `status: 'complete'`, `attempt: 5` |
| `p5: without the bound the later success wins` | the first scripted case in the `v4-link` tree (width 8: `v4-link-w8-test`) | at every width: `status: 'complete'`, `attempt: 4` |
| `p5: the width-8 trees` | `MAX_POOL_SIZE` imported from the `worker-pool.js` of `v4-p5`, `v4-p5-w8-test` and `v4-link-w8-test` | 4, 8, 8 |

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
  answered order); when a case of T02a to T07a fails after this change.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07b-B01 | A set request ends with a notice naming the side when its first attempts all fail without a window on that side, at every pool width; the legacy path is unchanged (P-OD12) | cases 3 to 6 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07b-T01 | The bound reads before the ordered scan; its rule | cases 2 and 3; diff of `p5-2` | self-test output; diff |
| T07b-T02 | Pool invariance at 1, 2, 4 and 8 workers for the four scripts; the width 8 really runs (an eight-worker pool in the `-w8-test` trees only) | cases 3 to 7 | self-test output |
| T07b-T03 | The side field only in a tree with the bound | case 1 | self-test output |
| T07b-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

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
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |
