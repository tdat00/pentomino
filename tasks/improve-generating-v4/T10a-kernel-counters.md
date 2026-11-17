# T10a: Kernel probe: R4 visit and mutation counters, with the complete deduction compared

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P7 (C1: "The spike first records R4 invocations, static and live visits, dirty fractions and mutation counts"; "no rating changes: equality of the `DeductionResult`, `work` and `nodes`"), §5.1 stage 2 ("the scoped C1 spike with visit counters"); review RV1-05, RV1-16, RV1-17 (R17), RV1-18, RV1-19 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T09e |
| Depends on | T09e (serial order; the stage-1 allowance covers this task's locked step) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 5 min allocated (guard 375 s) |

## Goal

The C1 spike (N-V4-05) must start from measured R4 behaviour. This task adds R4 visit and mutation counters to a
test-side tree, with a per-piece mutation epoch so that a changed set of live rows is seen even when their number is
unchanged, proves on every probed input that the counters change nothing in the complete deduction result, and runs
the probe once so that stage 2 can price its full run. The `fewestColumn` profile is T10b's.

## Authority and fixed points

- Plan §3 P7: the counters are test-side instrumentation; `deduce.js` does not change in production; "no rating
  changes" is proved by comparing the complete `DeductionResult` of `measureDeduction` (`core/engine/deduce.js:280`)
  between the `instr` and `r4c` trees on the same model input (RV1-19); a public-rating comparison does not replace it.
- RV1-18: a piece is dirty at an R4 visit when its live rows changed since its previous visit in the same measurement
  (its first visit is dirty); the change is tracked by a per-piece epoch incremented on every live-row removal
  (`kill(r)`) and restoration (the `x >= 0` branch of `undo`); the piece of row `r` is `rowPiece[r]`
  (`deduce.js:295`). A change of the live-row count is a separate statistic (`countChanged`).
- R05 and R17: the probe runs as items of `lib/items.mjs` (T04a) in supervised lane workers; the case list is part of
  the item manifest and so of the state identity.
- The counters extend the `instr` tree's `igTake()` record (`instr-1` to `instr-6`), so its existing callers keep
  working.

## Scope

- Create: `tools/ig-proto/variants/r4c.json`; `tools/ig-proto/kernel-probe.mjs`; `tools/ig-proto/plans/V4-T10a.json`.
- Change: `tools/ig-proto/lib/lanes.mjs` (the reserve of `v4-kernel`), `tools/ig-proto/lib/lane-worker.mjs` (the kind
  `v4-kernel`), `tools/ig-proto/lib/items.mjs` (`ITEM_LANES['v4-kernel'] = 1`), `tools/ig-proto/self-test.mjs` (one
  `--v4` case, three `--items` cases), `tools/ig-proto/README.md` (a section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T10a --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants/files`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T10a --label frozen`.
1. **`variants/r4c.json`**: `"id": "r4c"`, `"extends": ["instr"]`, `"description"`: "R4 visit and mutation counters
   (V4-T10a, plan P7 C1): test-side; the deduction result is unchanged.", `"files": []`, `"params": {}`, edits on
   `core/engine/deduce.js` (each `find` occurs once after the `instr` edits; checked by the pack author on
   `3fc65f4`):

   | Id | Find | Replace |
   |---|---|---|
   | `r4c-1` | `  let igR7CutCensus = 0;\n` | the same, then `  let igR4Calls = 0;\n  let igR4Pieces = 0;\n  let igR4Static = 0;\n  let igR4Live = 0;\n  let igR4Dirty = 0;\n  let igR4CountChanged = 0;\n  let igR4Kills = 0;\n  let igKills = 0;\n  let igUndo = 0;\n  const igEpoch = new Int32Array(NP);\n  const igR4Seen = new Int32Array(NP).fill(-1);\n  const igR4LastLive = new Int32Array(NP).fill(-1);\n` |
   | `r4c-2` | `  function ruleR4(counting) {\n` | the same, then `    igR4Calls += 1;\n` |
   | `r4c-3` | `      let nLive = 0;\n` | `      igR4Pieces += 1;\n      igR4Static += colStart[pc + 1] - colStart[pc];\n      let nLive = 0;\n` |
   | `r4c-4` | `      let killed = 0;\n      if (nLive > 0) {\n` | `      igR4Live += nLive;\n      if (igR4Seen[p] !== igEpoch[p]) {\n        igR4Dirty += 1;\n        igR4Seen[p] = igEpoch[p];\n      }\n      if (igR4LastLive[p] !== nLive) {\n        igR4CountChanged += 1;\n        igR4LastLive[p] = nLive;\n      }\n      let killed = 0;\n      if (nLive > 0) {\n` |
   | `r4c-5` | `      if (killed > 0) {\n        if (counting) {\n          rules[3] += killed;\n` | `      igR4Kills += killed;\n      if (killed > 0) {\n        if (counting) {\n          rules[3] += killed;\n` |
   | `r4c-6` | `  function kill(r) {\n    live[r] = 0;\n` | `  function kill(r) {\n    igKills += 1;\n    igEpoch[rowPiece[r]] += 1;\n    live[r] = 0;\n` |
   | `r4c-7` | `      const x = trail[--trailLength];\n      work += 1;\n` | the same, then `      igUndo += 1;\n` |
   | `r4c-8` | `r7CutCensus: igR7CutCensus };\n` | `r7CutCensus: igR7CutCensus, r4: { calls: igR4Calls, pieces: igR4Pieces, staticRows: igR4Static, liveRows: igR4Live, dirtyPieces: igR4Dirty, countChanged: igR4CountChanged, r4Kills: igR4Kills, kills: igKills, undoEntries: igUndo } };\n` |
   | `r4c-9` | `      if (x >= 0) {\n        live[x] = 1;\n` | `      if (x >= 0) {\n        igEpoch[rowPiece[x]] += 1;\n        live[x] = 1;\n` |

   `NP` and `rowPiece` are declared at `deduce.js:291-295`, before `let first = null;` (`:335`) where `instr-1` puts its
   counters.
2. **`v4-kernel`** lane kind. `lib/lanes.mjs`: `itemReserveS` gains `'v4-kernel': 90`. `lib/items.mjs`: `ITEM_LANES`
   gains `'v4-kernel': 1`. `lib/lane-worker.mjs`, payload `{ boardRows, levelId, seedText, subsetIndex, otherRoot }`:
   `other = await loadEngine(otherRoot)` (cached per root) with its own main workspace `wsOther`; `carved =
   firstCarvedSet(engine, { boardRows, levelId, seedText })` (not `ok`: `{ outcome: 'no-set', reason }`); `subsets =
   windowSubsets(engine, { set: carved.set, seedText, offsets: [1, 2, 3], perCount: 2, startCount:
   startCountFor(engine, levelId, carved.K) })`; no subset at `subsetIndex`: `{ outcome: 'no-subset' }`; else for
   `[engine, ws]` and `[other, wsOther]`: `t.deduce.igTake()`; `model = t.tiling.buildModel(carved.board,
   carved.set.pieces, subset.clues, w)`; `res = t.deduce.measureDeduction(model, t.policy.DEDUCE)` (an error becomes
   `{ error: e.name, message: e.message }`); `ins = t.deduce.igTake()`. The two results are compared right after the
   second one returns: `same = isDeepStrictEqual(resR4c, resInstr)`. Return `{ outcome: 'ok', g: subset.g, idx:
   subset.idx, same, r4: insR4c?.r4 ?? null, ms }`.
3. **`kernel-probe.mjs`** (`// @ts-check`): `node tools\ig-proto\kernel-probe.mjs counters --task <T> --label frozen
   --source-label <SL> [--cases <ids>] [--horizon-s <H>]` and `node tools\ig-proto\kernel-probe.mjs report --task <T>
   --label frozen --source-label <SL>`; `--cases` is a comma-separated list of catalogue ids, default
   `14x14-nightmare,26x26-nightmare`; an unknown id exits 1 with `kernel-probe: unknown case id <id>`. Exports:
   - `export function parseCases(text)`: the list (the default for `undefined`); throws on an unknown id or an empty
     entry.
   - `export function epochDirty(trace)`: the rule of RV1-18 on a synthetic trace of `['visit', p]`, `['kill', p]`
     and `['restore', p]` steps; returns `{ dirty, countChanged }` (the count of a piece starts at 0, `kill` lowers
     it by one, `restore` raises it by one).
   - `counters`: the items `counters:r4c:<caseId>:ig-v4/kernel/<caseId>:<i>` for each case and `i` from 0 to 5, kind
     `v4-kernel`, variant `r4c`, payload as step 2 with `seedText` `ig-v4/kernel/<caseId>` and `otherRoot` =
     `(await ensureTree('instr')).root`; run with `runItems` (label `frozen`, step `counters`). The item log is written
     only by `runItems` through T04a's line helpers (every line with the run's `identityHash`, RV2-01); no payload
     field depends on the invocation (`--horizon-s` is the execution envelope), so a resume keeps the identity.
   - `report` (unlocked): `evidence/frozen/<task>/kernel.json` and `kernel.md` (meta block; the item table; per case
     the sums of the counters, `dirtyPieces / pieces` and `countChanged / pieces`; and `counters: equal` when every
     completed item has `same: true` and no item is missing, censored or an error, `counters: incomplete (<items>)`
     when items are missing or censored, else `counters: DIFFER (<items>)`). T10b adds the profile block. Its cases
     (ruling of 2026-11-17, T10a's report: T11c's `V4-S2K` runs `report` without `--cases` after a five-case
     `counters`): `report` takes `[--cases <ids>]`; the cases are `--cases`, else the default list, else the cases the
     item log names (`loggedCases`), the first whose items reproduce the state's `identity.manifestHash`; none
     refuses (exit 1), so a run cut before a case started can never read as complete.
4. **Plan** `plans/V4-T10a.json`: `"allocationMinutes": 5`, `"optionalMinutes": 0`; steps `firewall-snapshot`
   (unlocked), `trees` (`tools\ig-proto\lib\tree.mjs build instr r4c`, unlocked), `counters` (locked,
   `repeatUntilDone` true, `projectS` 150, `minHorizonS` 150, `invocations` 2, node `tools\ig-proto\kernel-probe.mjs
   counters --task V4-T10a`, state `V4-T10a\counters\state.json`), `report` (unlocked, `tools\ig-proto\kernel-probe.mjs
   report --task V4-T10a`), `firewall-check` (unlocked). Forecast 150 + 2 x 45 = 240 s within 300 s.
5. **Self-test**: the `--v4` case and the three `--items` cases of the Tests table.
6. **README.md**: a section "## Kernel probe (V4-T10a)": the counters, the epoch rule and `countChanged`, the
   complete-result comparison, the commands and the item kind.
7. Run, after the unlocked checks pass, in one PowerShell session at the root:

   ```powershell
   $lock = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T10a.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <approved>
   if ($LASTEXITCODE -ne 0) { throw ('STOP: V4-T10a run-task exited ' + $LASTEXITCODE) }
   ```

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --v4` | `kernel: r4c counters and the complete deduction` | the first two subsets of `corpus()` (the self-test's 10x10 Hard corpus): for each, `buildModel` and `measureDeduction(model, DEDUCE)` in the `r4c` and the `instr` tree, each after `igTake()` | the two `DeductionResult`s deep-equal; the `r4c` record's `r4` has nine non-negative integers with `calls >= 1` and `countChanged <= dirtyPieces <= pieces`; the `instr` record has no `r4` |
| `tools/ig-proto/self-test.mjs --items` | `kernel: the epoch rule` | `epochDirty` of `[['visit', 0], ['kill', 0], ['restore', 0], ['visit', 0]]`; of `[['visit', 0], ['visit', 0]]`; of `[['visit', 0], ['kill', 0], ['visit', 0]]` | `{ dirty: 2, countChanged: 1 }` (the second visit is dirty with an unchanged count); `{ dirty: 1, countChanged: 1 }`; `{ dirty: 2, countChanged: 2 }` |
| same | `kernel: case list` | `parseCases(undefined)`, `parseCases('12x12-nightmare,26x26-nightmare')`, `parseCases('nope')`, `parseCases('12x12-nightmare,')` | the default two ids; the two ids; throws `unknown case id nope`; throws (empty entry) |
| same | `kernel: report verdicts` | the report's verdict function on item lines: all `same: true`; one `same: false`; one item `censored` | `counters: equal`; `counters: DIFFER (...)`; `counters: incomplete (...)` |
| run of step 7 | `counters: equal` | the twelve items | `counters: equal` |

## Documentation

`tools/ig-proto/README.md` (step 6).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | one `ok` line per declared variant, no error; report the printed counts | 2 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T10a` | root | every `--items` case passes | 3 min |
| `Invoke-IgNode -Repo pentomino -Task 'V4-T10a verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--v4', '--task', 'V4-T10a')` (check-list §3.2) | root | every `--v4` case passes, exit 0 | 5 min (the helper's 300 s) |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T10a.json -Label frozen -SourceLabel 'frozen 3fc65f4' -ApprovedRoundMinutes <approved> -DryRun` | root | the locked step `go`; forecast 240 s, allocation 300 s, guard 375 s | 1 min |
| step 7 | root | `counters: equal`; `Plan V4-T10a finished: task counted <= 375 s` | each invocation at most 285 s |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: step 7 if the dry run says `stop`.
- Stop and report after: `counters: DIFFER` or `counters: incomplete` (a diagnosis gate: the instrumentation changed
  a deduction, or the probe did not finish).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T10a-B01 | The C1 spike can start from measured R4 visits, mutation-based dirty fractions and mutation counts | `kernel.md` | `evidence/frozen/V4-T10a/kernel.md` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T10a-T01 | The counters change no deduction result (complete `DeductionResult`) | `counters: equal`; the `--v4` case | `kernel.json`; helper output |
| T10a-T02 | The epoch rule sees a membership change with an unchanged count | `kernel: the epoch rule` | self-test output |
| T10a-T03 | Items, case list and identity as R05 and R17 | review; `kernel: case list` | diff; self-test output |
| T10a-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

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
