# T11a: Frozen-round matrix: the enumerated requests of stages 2 to 5

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 (stages 2 to 5; "Seeds and today's arm (IG-P-Q25)"; "Stopping (IG-P-Q32)"; "PM1 and the frozen prior (IG-P-Q27)"), §5.2 (every screen class runs both arms; which arm is judged), §9; decisions IG-P-D5 (OD-P8), IG-P-D7 (OD-P10), D-V4-16, D-V4-20; review RV1-07, RV1-14 (R14), RV2-06, RV2-10, RV2-11 (shards), RV3-04 (collections) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T10c |
| Depends on | T10c (serial order; it names the arms of T06a to T08) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (data and pure functions; synthetic cases, unlocked) |

## Goal

The owner approves the frozen round as an enumerated manifest (OD-P10). This task writes the request matrix of stages
2 to 5 as data and the rules that expand it into groups of request rows, with the conservative stage-4 matrix of
review R14: every validated Nightmare cell measured with both the screen and the no-screen twin, today's arm where a
gate needs it, the uncapped comparator of the arm that ships, the conditional Hell 1 boards and a fresh cohort for a
second validation, each group with its own row limit, state path and collection. T11b prices the groups, T11c
compiles the plans that can be fixed now, T11e activates one collection at a time and T11g writes the manifest for the
owner.

## Authority and fixed points

- Plan §5.1 and §5.2: validation seeds disjoint from every fitting seed (the provisional reps 0 to 5, MP12b1's reps 10
  to 19); every screen class runs both arms on all its cells; today's arm only where a gate needs it (the
  completion-passing controls, Master identity); Master identity on five seeds; the uncapped search is the comparator
  for lost completions; a second validation after a stage-5 prior adoption uses seeds that fitted nothing.
- R14 (accepted), with these rules fixed here (pack author): the class table is unknown before stage 3, so every
  validated Nightmare and Hell 1 cell gets both twins (`fr-frozen`, `fr-frozen-none`); the comparator of a cell is the
  uncapped twin of the arm its class ships (`fr-frozen-uncapped` or `fr-frozen-none-uncapped`), one group per cell,
  run after the class verdicts; a comparator differs from its twin only in `callBudget`, `setAttemptsBound` and
  `liveDeadline`; identical groups (same arm, cell and rep range) are listed once.
- Pack-author choices, fixed here: pilot reps 0 to 4; validation reps 20 to 39; Master identity reps 20 to 24; the
  second-validation cohort reps 40 to 59; the live-deadline receipt reps 0 to 4; the resample seed 20261116 and
  10,000 resamples; four workers per request row.
- Row limits per group (RV2-10, accepted): 130 s only for a stage-4 group of an arm whose settings have
  `liveDeadline: true` (`fr-frozen`, `fr-frozen-none`), which runs only after an accepted live-deadline binding (T11c and
  T11e order it); 260 s for every other group in every stage: today's `log-link`, the uncapped comparators (no live
  deadline; separate set and batch timers), the stage-2 arms and the `live` receipt rows themselves (a violation must
  be observed, not cut by the wrapper). A wrapper-censored control is unknown evidence (T09d's `p5Stops`), never a proof that the
  bounded arm lost nothing.
- RV3-04 (accepted), D-V4-20: the matrix is the priced universe, not a measurement plan. Each group belongs to one
  collection: `stage2`, `live`, `initial` (S4-1 to S4-4 and the S4-C comparators of S4-1 to S4-3), `conditional`
  (S4-5, run only when T11e activates the board by `conditionalActivated`), `optional` (S4-6, run only with the
  owner's approval) or `second` (S4-7, a non-executable template until N-V4-04). A comparator group (`comparator:
  true`, arm `shipped-uncapped`) is never part of a validation plan: it belongs to its collection's comparator task
  (`V4-S4C` for `initial` and `conditional`, `V4-S4XC` for `second`) and is resolved only from that collection's
  final selection (T11f).
- State paths per group (RV2-11): the plan task by stage (`V4-S2`, `V4-LIVE`, `V4-S4` for the first validation's
  twins, controls, Master rows and paired factor, `V4-S4C` for its comparators, `V4-S4X` for the second validation,
  `V4-S4XC` for its comparators) and the shard `<cohort>-<cell>` with the cohort of the reps
  (`pilot`, `live`, `val`, `master`, `factor`, `second`); the state is `<task>\<arm>\<shard>\state.json`, so a pilot,
  a validation and a second validation of one arm and cell never share a folder.
- Completion of a control (RV2-06, D-V4-16): a run counts when T09a's `runStatus` is `valid` and `acceptedCount >= 10`,
  whatever its time.
- The arms `fr-frozen`, `fr-frozen-none` and their uncapped twins are created at the freeze by the later pack
  (N-V4-03); this task only names them and their settings.

## Scope

- Create: `tools/ig-proto/data/frozen-round-v1.json` (step 1); `tools/ig-proto/manifest.mjs` (the expansion of step 2;
  T11b adds the pricing).
- Change: `tools/ig-proto/self-test.mjs` (cases appended to `--items`), `tools/ig-proto/README.md` (a section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T11a --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T11a --label frozen`.
1. **`data/frozen-round-v1.json`**: `{ "version": 1, "resampleSeed": 20261116, "resamples": 10000, "workers": 4,
   "reps": { "pilot": [0, 4], "validation": [20, 39], "master": [20, 24], "secondValidation": [40, 59],
   "liveDeadline": [0, 4] }, "rowLimitS": { "default": 260, "liveDeadline": 130 }, "arms": {...}, "comparatorDifferences":
   ["callBudget", "setAttemptsBound", "liveDeadline"], "cells": {...}, "stage2": [...] }` with:
   - `arms`: `log-link`, `fr-base`, `fr-screen`, `fr-none`, `fr-close`, `fr-c4`, `fr-ps`, `fr-p5` (each `{ "variant":
     <its id>, "stage": 2 }`, `log-link` `"stage": 4` too), and the four stage-4 arms `{ "variant": <id>, "stage": 4,
     "settings": { "prior": "frozen", "screen": <"frozen" or "none">, "c4": "frozen", "rerate": "frozen",
     "callBudget": <"frozen" or null>, "setAttemptsBound": <"frozen" or null>, "liveDeadline": <true or false> },
     "comparatorOf": <the twin, for the two uncapped arms> }`: `fr-frozen` (screen `frozen`, budget and bound
     `frozen`, deadline true), `fr-frozen-none` (screen `none`, otherwise as `fr-frozen`), `fr-frozen-uncapped`
     (`fr-frozen` with budget and bound null and deadline false, `comparatorOf: 'fr-frozen'`),
     `fr-frozen-none-uncapped` (the same for `fr-frozen-none`).
   - `cells`: `failingNightmare` `["14x14-nightmare", "15x15b10-nightmare", "12x12-nightmare", "16x16-nightmare",
     "15x20-nightmare"]`; `hell1Validated` `["26x26-hell-1", "20x20-hell-1"]`; `hell1Conditional` `["24x24-hell-1",
     "14x14-hell-1"]`; `master`: the 16 `*-master` ids of `data/boards-v1.json` in catalogue order.
   - `stage2` (pilot reps; each item `{ id, text, groups: [{ arm, cells }] }`):

     | Item | Plan text | Groups (arm: cells) |
     |---|---|---|
     | S2-1 | the per-set prior on Hell 1 first | `fr-base`, `fr-ps`: `26x26-hell-1`, `20x20-hell-1` |
     | S2-2 | each class's `W_screen` and the no-screen arm on every class; 10x10, 16x16 and 15x20 Nightmare (R09) | `fr-screen`, `fr-none`: `10x10-nightmare`, `12x12-nightmare`, `14x14-nightmare`, `15x15b10-nightmare`, `16x16-nightmare`, `15x20-nightmare`, `26x26-nightmare`, `26x26-hell-1` |
     | S2-3 | (c4) | `fr-c4`, `fr-base`: `14x14-nightmare`, `26x26-nightmare` |
     | S2-4 | the re-rate-at-bracket-close variant (D-IG7) | `fr-close`, `fr-base`: `12x12-nightmare`, `14x14-nightmare`, `26x26-hell-1` |
     | S2-5 | Hell 1 on 24x24 and 14x14 as five-seed pilots with a no-screen, prior-guided arm | `fr-base`: `24x24-hell-1`, `14x14-hell-1` |
     | S2-6 | the P5 budget arm and the reserve of IG-P-D1 | `fr-p5`, `fr-base`: `14x14-nightmare`, `26x26-hell-1`, `20x20-hell-1` |

     The probes (the scoped C1 spike, the `fewestColumn` attribution, the P8 probe) and the parity passes are steps of
     T11c's plans; they are not request rows.
2. **`manifest.mjs`** (`// @ts-check`), the pure export `expandMatrix(data, inputs)` with `inputs = { controls,
   secondValidationBoards }` (`controls`: the completion-passing Nightmare cells; `secondValidationBoards`: the Hell 1
   boards whose prior a stage-5 adoption changes). It returns `{ groups, items, counts }`: a group is `{ id, task,
   arm, cell, from, to, rows, stage, cohort, shard, rowLimitS, optional, items: [<item ids>] }` (`rows = to - from +
   1`; `task`, `cohort`, `shard` and `rowLimitS` by the Authority rules; `optional` true for S4-5 and S4-6); a group
   key is `task|arm|shard|from|to`, and a second item that needs an existing key only adds its id to that group's
   `items`. Each group also carries `collection` and `comparator` (the Authority rules). Items, in this order:
   - stage 2: S2-1 to S2-6 with the pilot reps;
   - S4-1 headline: `fr-frozen`, `fr-frozen-none` on each `failingNightmare` cell, validation reps;
   - S4-2 Hell 1: the same twins on each `hell1Validated` cell;
   - S4-3 controls: the twins and `log-link` on each cell of `inputs.controls`;
   - S4-C comparator: one group of arm `shipped-uncapped` (task `V4-S4C`, collection `initial`) on every cell of
     S4-1, S4-2 and S4-3 (resolved after the class verdicts to `fr-frozen-uncapped` or `fr-frozen-none-uncapped`);
   - S4-4 Master identity: `fr-frozen` and `log-link` on each `master` cell, master reps;
   - S4-5 conditional Hell 1: the twins (task `V4-S4`) and `shipped-uncapped` (task `V4-S4C`) on each
     `hell1Conditional` cell, validation reps, collection `conditional`;
   - S4-6 optional paired factor: `log-link` on each `failingNightmare` cell, reps 20 to 24, collection `optional`;
   - S4-7 conditional second validation: the twins (task `V4-S4X`) and `shipped-uncapped` (task `V4-S4XC`) on each
     board of `inputs.secondValidationBoards`, the second-validation reps, collection `second` (default: every
     `hell1Validated` and `hell1Conditional` board, the conservative price);
   - `live` (the live-deadline receipt, N-V4-13): `fr-frozen` on `14x14-nightmare` and `26x26-hell-1`, the
     live-deadline reps.
   Before expanding, every arm with `comparatorOf` is checked: its `settings` equal its twin's except the keys of
   `comparatorDifferences`; a difference throws `Error('manifest: comparator <arm> differs from <twin> in <key>')`.
   `counts`: groups and rows per stage and per item, and the total.
   `export function controlsFrom(reports, failing)`: the Nightmare cells of the catalogue, other than `failing`, whose
   MP12b1 report (`mp12b1Report(caseId)` of `lib/paths.mjs`) has at least 18 runs with
   `runStatus(withoutSampling(run), { quantity: 10 }).status === 'valid'` and `reachedTen(run, { quantity: 10 })`
   (T09a's `verdicts.mjs`), in catalogue order. `export function withoutSampling(run)`: a copy of the run whose
   `errors` omit every entry of `phase` `sampling`, the run itself unchanged (ruling of 2026-11-17, T11a's QUESTION 1:
   the landscape's diagnostic profile sampling runs after the timed interval, `tools/bench/runner.js:852-858`, and
   records up to three failures of its sampled ratings, `:467-474`, so it says nothing about the request; frozen-round
   rows never run it, so `verdicts.mjs` is unchanged). On today's reports the controls are the ten completion-passing
   cells `3x29`, `10x10`, `18x18`, `18x20`, `20x20`, `20x21`, `32x15`, `22x22`, `24x24` and `26x26` Nightmare (the
   five failing cells have 11 to 17 such runs).
   `export function conditionalActivated(runs)` (RV3-04): `runs` are the published run records of one conditional
   board's S2-5 pilot (`fr-base`, reps 0 to 4); `valid` counts the runs with `runStatus(run, { quantity: 10 }).status
   === 'valid'`, `reachingTen` those of them with `reachedTen(run, { quantity: 10 })`; returns `{ activated:
   reachingTen >= 3, valid, reachingTen }` (a missing or invalid run is never a completion).
3. **Self-test** cases appended to `--items` (Tests table).
4. **README.md**: a section "## Frozen-round matrix (V4-T11a)": the reps, the arms and their settings, the expansion
   rules of step 2, the dedupe rule, the collections and the conditional activation rule.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, on the data file and on synthetic copies of it.

| Case name | Input | Expected |
|---|---|---|
| `matrix: a screen class with a headline and a control` | `expandMatrix` with `controls: ['18x18-nightmare']` | `14x14-nightmare` has the groups `fr-frozen`, `fr-frozen-none` (task `V4-S4`) and `shipped-uncapped` (task `V4-S4C`) with reps 20 to 39, all of collection `initial`; `18x18-nightmare` has those three and `log-link` |
| `matrix: every validated cell has its fallback` | the same expansion | every cell of S4-1, S4-2, S4-3 and S4-5 has an `fr-frozen-none` group of 20 rows |
| `matrix: the comparator keeps the frozen prior` | a copy whose `fr-frozen-uncapped.settings.prior` is `"other"` | `expandMatrix` throws `manifest: comparator fr-frozen-uncapped differs from fr-frozen in prior` |
| `matrix: a later prior change on 14x14 and 24x24` | `secondValidationBoards: ['14x14-hell-1', '24x24-hell-1']` | S4-7 has the twins and `shipped-uncapped` on those two boards with reps 40 to 59, and no group on `26x26-hell-1` or `20x20-hell-1` |
| `matrix: dedupe` | the default expansion | the group of arm `fr-base` on `14x14-nightmare` with reps 0 to 4 exists once with `items` `['S2-3', 'S2-4', 'S2-6']`; no two groups share a key |
| `matrix: controls from the reports` | `controlsFrom` on synthetic reports (T09a's `newRunRecord` rows): a cell with 18 valid runs reaching ten, one with 17, one with 18 of which 2 have `measurementValid: false`, a failing cell with 20; then (ruling of 2026-11-17, T11a's QUESTION 1) a cell whose 20 runs reach ten and each carry `errors: [{ phase: 'sampling', code: 'rating-incomplete', message: 'x' }]`, and a cell like it whose three runs also carry `{ phase: 'batch', code: 'worker-crashed', message: 'x' }` | only the first cell; then the sampling cell is a control and the other is not (17 valid runs), and every input run keeps its `errors` |
| `matrix: row limits by group` | the default expansion with `controls: ['18x18-nightmare']` | 130 for the S4-1 `fr-frozen` and `fr-frozen-none` groups on `14x14-nightmare`; 260 for the S4-3 `log-link` group on `18x18-nightmare`, every `shipped-uncapped` group, both `live` groups and every stage-2 group |
| `matrix: disjoint state paths` | the default expansion | the S4-2 `fr-frozen` group on `26x26-hell-1` has task `V4-S4`, shard `val-26x26-hell-1`; its S4-7 group has task `V4-S4X`, shard `second-26x26-hell-1`; the S4-7 comparator on that board has task `V4-S4XC`; no two groups share `task`, `arm` and `shard` |
| `matrix: collections` | the default expansion | every group of arm `shipped-uncapped` has `comparator: true` and task `V4-S4C` or `V4-S4XC`; no group of task `V4-S4` or `V4-S4X` has arm `shipped-uncapped`; the S4-5 groups have collection `conditional`, the S4-6 groups `optional`, the S4-7 groups `second` (their comparators task `V4-S4XC`), the `live` groups `live`, the stage-2 groups `stage2` |
| `matrix: conditional activation` | `conditionalActivated` of five synthetic runs (T09a's `newRunRecord`): (a) three valid reaching ten, two valid short; (b) two valid reaching ten, one reaching ten with `measurementValid: false`, two valid short; (c) three valid reaching ten and no other run | (a) `{ activated: true, valid: 5, reachingTen: 3 }`; (b) `{ activated: false, valid: 4, reachingTen: 2 }`; (c) `{ activated: true, valid: 3, reachingTen: 3 }` |

## Documentation

`tools/ig-proto/README.md` (step 4).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11a` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T11a --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a rep range, a row limit or an expansion rule of this task (they are fixed before
  the validation seeds run).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11a-B01 | No validated cell can lack its fallback or its comparator, no group is inferred from another configuration, and no comparator is part of a validation plan | cases 1 to 4 and 9 | self-test output |
| T11a-B02 | Validation, Master and second-validation seeds are disjoint from every fitting seed | the data file's reps | `frozen-round-v1.json` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11a-T01 | The expansion rules and the dedupe | cases 1 to 5 | self-test output |
| T11a-T02 | Row limits per group and disjoint state paths (RV2-10, RV2-11) | cases 7 and 8 | self-test output |
| T11a-T05 | Collections, comparator tasks and the conditional activation rule (RV3-04) | cases 9 and 10 | self-test output |
| T11a-T03 | Controls from MP12b1's reports, valid runs only, the landscape's sampling entries set aside | case 6 | self-test output |
| T11a-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

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
| Start, end, duration | 2026-11-17 18:58:20 +07:00 (dispatch, base `2ed2901`) to 19:27:04 +07:00 (acceptance): 28 min 44 s; the developer's own times 18:58:01-19:17 and, after the ruling, 19:23:47-19:26:04 |
| Waiting for rulings | about 6 min (QUESTION 1 at 19:17, ruling 19:23) |
| Agent id, model | `bbb3015f-6c5c-453c-990b-b4f73cb1e85a`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 108 calls; 27,695,615 input, 157,079 output, 26,970,338 cache-read |
| AI credits | 608.09 |
| Questions and rulings | Q1: `controlsFrom` returned no cell on today's MP12b1 reports, because every run carries `sampling`/`rating-incomplete` entries from the landscape's diagnostic pass after the timed interval. SA-Opus accepted the default (b): `controlsFrom` judges `runStatus(withoutSampling(run))` (new export), `verdicts.mjs` unchanged; 10 controls (`3x29`, `10x10`, `18x18`, `18x20`, `20x20`, `20x21`, `32x15`, `22x22`, `24x24`, `26x26` Nightmare); T11b's `refS` and T11c's `rowStep` and `compile` amended; read-only check script `docs/improve-generating/evidence/drift/claude-opus-5.5/t11a-controls-check.mjs`; pack amendment `526aebe`. Deviations and readings accepted |
| Fix rounds | 0 (the ruling was applied in the developer's second round) |
| Gates re-run by the orchestrator | `--items`: 137 passed, 0 failed (22.192 s; `matrix:` cases 125-137); `--frozen`: 10 passed; `check-edits --all`: 34 `ok`, no other line; firewall `check` (V4-T11a): 289 production files unchanged; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib`: empty; stage-1 `evidence-check`: unchanged (20 files); `check-binding`: pass; `npm run check`: OK; the SA's check script prints the same 10 controls. Real matrix (developer, read-only): 151 groups and 1,940 rows; stage 2 33 groups and 165 rows; stage 4 118 groups and 1,775 rows (S4-3 30 groups and 600 rows, S4-C 17 groups and 340 rows). No locked command and no machine time |
| Commit | this task's commit, `improve-generating T11a: Frozen-round matrix: the enumerated requests of stages 2 to 5 and their collections` |
| Issues and named items | The 10 controls raise stage 4 to 118 groups and 1,775 rows; T11g prices them against the plan's 3.4 to 4.2 h stage-4 projection before the owner approves (OD-P10) |
