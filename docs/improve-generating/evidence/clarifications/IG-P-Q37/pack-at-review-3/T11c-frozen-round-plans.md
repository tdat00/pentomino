# T11c: Frozen-round plans: the compiler, the item manifests, the prerequisites gate and the parity receipts

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 (stages 2 to 5; "Parity passes"; "The timed comparator"; "Each task has a ceiling"), §5.2 (which arm is judged; the comparator); decisions IG-P-D7 (OD-P10), D-V4-08, D-V4-14, D-V4-18; review RV1-01 (R01), RV1-06 (R06), RV1-14 (R14), RV1-17, RV2-11 (R2-11), RV2-12 (R2-12) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11b |
| Depends on | T11b; T04c and T04d (`v4-check.mjs`, `lib/proof.mjs`); T09c (`verdicts.mjs`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (data and pure functions; synthetic cases, unlocked) |

## Goal

The frozen round must be executable as a sequence of concrete plans: every step with its complete Node arguments, state
path, lock status, dependencies, expected output and exit condition, every consumed artifact produced by an earlier
step or declared as an external prerequisite, and every plan priced as it will run. A plan whose variants or receipts
do not exist yet is explicitly not runnable: its first step refuses, instead of carrying placeholder arguments. This
task writes that compiler, the item manifests of the parity passes, the prerequisites gate and the per-arm parity
receipts.

## Authority and fixed points

- R2-11 (accepted), the order of the round: (1) stage 2: the request rows, the parity passes of every stage-2 arm with
  their receipts (P-1), the `v4` re-check on the final trees (P-0) and the probes; (2) after the freeze (N-V4-03) and
  the live deadline's implementation (N-V4-13): `V4-LIVE` and its receipt; (3) only with that passing receipt:
  stage 4's validation (both twins on every validated cell, today's controls, Master identity) and the stage-4 arms'
  parity receipts; (4) a final class-selection receipt over the completely published validation (T09c); (5)
  `resolve-comparators` (T11d) turns the comparator template into the concrete plan `V4-S4C`; (6) the verdict-input
  manifest (T11d) and the global verdict (T09c). The second validation (`V4-S4X`) waits for a stage-5 adoption.
- The future dependencies are named items (check-list §6), each with the artifact it must provide: N-V4-03 the
  variants `fr-frozen`, `fr-frozen-none`, `fr-frozen-uncapped`, `fr-frozen-none-uncapped` and
  `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` (the class table, `{ classes: [{ id, cells, screen,
  noScreen }] }`); N-V4-13 the live deadline in `fr-frozen` and `fr-frozen-none` and the tool
  `tools/ig-proto/live-deadline.mjs receipt --task V4-LIVE` writing
  `docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json` (kind `live-deadline`, T04d's
  `LIVE_DEADLINE_FIELDS`); N-V4-04 the adoption record `docs/improve-generating/evidence/frozen/V4-S5/adoption.json`.
- A parity pass of an arm (R06): T04c's item manifest format with the three observer modes on `12x12-nightmare`,
  `26x26-hell-1` and `14x14-master` (9 `v4-select` items) and one `v4-generate` on `12x12-nightmare` (quantity 2) with
  its 2 `v4-replay` items; its verdicts are T04c's `parityVerdict` and `replayVerdict`; P-0 re-runs
  `plans/V4-T04.parity.json` for `v4`, whose `absent`-mode digests must equal T04e's.
- Prices are T11b's `stepPrice` of each emitted step (R2-12): one step, one simulation; the plan's `allocationMinutes`
  is the ceiling in minutes of the required steps' `projectS + 45 x invocations`, `optionalMinutes` the same for the
  optional steps (`run-task.ps1` adds them with `-IncludeOptional`).

## Scope

- Change: `tools/ig-proto/manifest.mjs` (steps 1 to 3), `tools/ig-proto/v4-check.mjs` (`receipt`, step 4),
  `tools/ig-proto/self-test.mjs` (cases appended to `--items`), `tools/ig-proto/README.md` (T11a's section).
- Create (by the `compile` command of step 2, kept): `tools/ig-proto/plans/V4-S2.json`, `V4-LIVE.json`, `V4-S4.json`,
  `V4-S4X.json`, `V4-S4C.template.json`, and the item manifests `tools/ig-proto/plans/items/V4-S2P.parity-<arm>.json`
  and `V4-S4P.parity-<arm>.json`.
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T11c --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib tools/ig-proto/data`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T11c --label frozen`.
1. **`export function compilePlans(expansion, priceOf, { durations })`** (pure; `expansion` from T11a's
   `expandMatrix`, `priceOf` T11b's `stepPrice`, `durations` the measured item seconds by `kind/variant`). It returns `{
   plans, template, itemManifests }`. A plan is `{ task, generatedBy: 'manifest.mjs compile', runnable, blockedBy,
   prerequisites, allocationMinutes, optionalMinutes, steps }`; a step is `{ id, locked, node, state, repeatUntilDone,
   projectS, minHorizonS, invocations, optional, price, dependsOn, consumes, produces, expect, exitOn }` (`state`,
   `projectS`, `minHorizonS`, `invocations` and `price` for locked steps; `price` is the simulation's input and result;
   `exitOn` is `'a nonzero exit stops the plan (run-task.ps1)'`; `expect` the line the step prints on success). Paths
   in `consumes` and `produces` are relative to the repository root with `/`. The plans:
   - **`V4-S2`** (`runnable: true`, `blockedBy: []`): `firewall-snapshot`; `trees` (`tools\ig-proto\lib\tree.mjs build
     v4 log-link fr-base fr-screen fr-none fr-close fr-c4 fr-ps fr-p5`); per stage-2 group a locked step `rows-<arm>-<shard>`
     with `node` `tools\ig-proto\arm.mjs run --task V4-S2 --arm <arm> --shard <shard> --variant <variant> --workers 4
     --cases <cell>:<from>-<to> --row-limit-s <rowLimitS>`, `state` `V4-S2\<arm>\<shard>\state.json`, `minHorizonS`
     `rowLimitS + 12`, `price` of `{ type: 'rows', rows, rowS: projectedRowS(...), rowLimitS }`; per arm an unlocked
     `publish-<arm>` (`tools\ig-proto\arm.mjs publish --task V4-S2 --arm <arm>`, `dependsOn` its row steps, `produces`
     `docs/improve-generating/evidence/frozen/V4-S2/<arm>/`); per stage-2 arm `a` and for `v4`: a locked
     `parity-<a>` (`tools\ig-proto\v4-check.mjs run --task V4-S2P --step parity-<a> --manifest
     tools\ig-proto\plans\items\V4-S2P.parity-<a>.json`, `state` `V4-S2P\parity-<a>\state.json`, `minHorizonS` the
     largest reserve of its kinds plus 25, `price` of `{ type: 'items', groups }` from the manifest's groups; for `v4`
     the manifest is `plans/V4-T04.parity.json`) and an unlocked `receipt-<a>` (step 4's command, with `--baseline-task
     V4-T04 --baseline-step parity` for `v4`), `produces` `docs/improve-generating/evidence/frozen/V4-S2P/parity-<a>.receipt.json`;
     the probes: locked `kernel-counters` (`tools\ig-proto\kernel-probe.mjs counters --task V4-S2K --cases
     10x10-nightmare,12x12-nightmare,14x14-nightmare,26x26-nightmare,26x26-hell-1`, state `V4-S2K\counters\state.json`),
     locked `kernel-profile` (`... profile ...`, state `V4-S2K\profile\state.json`, `type: 'process'`), unlocked
     `kernel-report`, locked `width` (`tools\ig-proto\width-probe.mjs run --task V4-S2W --cases
     26x26-nightmare,14x14-nightmare --rounds 3`, state `V4-S2W\run\state.json`, `type: 'process'`), unlocked
     `width-report`; `firewall-check`.
   - **`V4-LIVE`** (`runnable: false`, `blockedBy: ['N-V4-03', 'N-V4-13']`, `prerequisites`: `{ type: 'variant', id:
     'fr-frozen' }`, `{ type: 'file', path: 'docs/improve-generating/evidence/frozen/V4-S3/freeze.json' }`, `{ type:
     'file', path: 'tools/ig-proto/live-deadline.mjs' }`): the first step `prerequisites` (unlocked,
     `tools\ig-proto\manifest.mjs check-prerequisites --plan V4-LIVE`); `trees`; the `live` groups (rows, task
     `V4-LIVE`, row limit 260); `publish-fr-frozen`; `live-receipt` (unlocked, `tools\ig-proto\live-deadline.mjs receipt
     --task V4-LIVE`, `produces` `docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json`); `firewall-check`.
   - **`V4-S4`** (`runnable: false`, `blockedBy: ['N-V4-03', 'N-V4-13', 'V4-LIVE']`, `prerequisites`: the variants
     `fr-frozen`, `fr-frozen-none`, `fr-frozen-uncapped`, `fr-frozen-none-uncapped`, the freeze file, the stage-1 receipt
     (`{ type: 'file', path: 'docs/improve-generating/evidence/frozen/V4-T04/stage1.json' }`, written by T04e), and `{ type:
     'receipt', path: 'docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json', kind: 'live-deadline', arms:
     ['fr-frozen', 'fr-frozen-none'], coverage: <the live groups' row keys>, fields: 'LIVE_DEADLINE_FIELDS' }`): first
     `prerequisites`; `trees`; the stage-4 groups of T11a (S4-1 to S4-4 required, S4-5 and S4-6 `optional: true`) as
     row steps; `publish-<arm>`; the P-1 parity steps and receipts of the four stage-4 arms (task `V4-S4P`); then
     `verdict-input` (unlocked, `tools\ig-proto\manifest.mjs verdict-input --stage validation --out
     tools\ig-proto\plans\verdicts\V4-S4.verdict-manifest.json`, `dependsOn` every publish and receipt step),
     `verdicts` (unlocked, `tools\ig-proto\verdicts.mjs --manifest tools\ig-proto\plans\verdicts\V4-S4.verdict-manifest.json`,
     `produces` `docs/improve-generating/evidence/frozen/V4-S4/class-selection.json`), `resolve-comparators` (unlocked,
     `tools\ig-proto\manifest.mjs resolve-comparators --selection docs\improve-generating\evidence\frozen\V4-S4\class-selection.json
     --out tools\ig-proto\plans\V4-S4C.json`, `consumes` the selection and the template); `firewall-check`.
   - **`V4-S4X`** (`runnable: false`, `blockedBy: ['N-V4-04']`, `prerequisites` the stage-4 variants and `{ type: 'file',
     path: 'docs/improve-generating/evidence/frozen/V4-S5/adoption.json' }`): `prerequisites`, `trees`, the S4-7 groups
     (task `V4-S4X`), `publish-<arm>`, `firewall-check`.
   - **The template `V4-S4C.template.json`**: `{ task: 'V4-S4C', generatedBy, template: true, runnable: false, cells: [{
     cell, from, to, rows, rowLimitS: 260, shard, candidates: ['fr-frozen-uncapped', 'fr-frozen-none-uncapped'], price
     }] }` (one entry per `shipped-uncapped` group of T11a; no `node`); `price` at the cell's projection.
   - **`itemManifests`**: for every P-1 arm, T04c's manifest of the Authority section with the arm's variant, at
     `tools/ig-proto/plans/items/<V4-S2P or V4-S4P>.parity-<arm>.json`.
2. **`manifest.mjs compile --label frozen --source-label <SL>`**: `expandMatrix` (T11a, `controls` from `controlsFrom`,
   `secondValidationBoards` the default), the durations (the mean `ms / 1000` per `kind/variant` over the `item-end`
   lines of the frozen steps `V4-T04/parity`, `V4-T04/replay`, `V4-T10a/counters`, `V4-T10b/profile` and`
   `V4-T10c/run`; a `width` item takes three times T10c's one-round mean; a kind or variant without a measure takes its
   reserve and the plan says so), `compilePlans`, then writes the plans, the template and the item manifests.
   It refuses (exit 1, nothing written) when an existing target file lacks `"generatedBy": "manifest.mjs compile"` or
   when a step is not admissible (T11b), naming them.
3. **`manifest.mjs check-prerequisites --plan <id> --label frozen --source-label <SL>`** and its pure core
   `checkPrerequisites(list, { variants, exists, readJson, bindingOf })`: a `variant` entry passes when the id is in
   `listVariants()`; a `file` entry when the file exists; a `receipt` entry when `proofCheck(readJson(path), expected)`
   passes, with `expected = { kind, source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST }, arms: <for
   each id, its current tree id and params hash, bindingOf(id)>, coverage: { expected: coverage }, fields: <the frozen
   LIVE_DEADLINE_FIELDS for 'LIVE_DEADLINE_FIELDS'> }`. It prints `prerequisites: pass` (exit 0) or `prerequisites:
   blocked (<reason>; ...)` (exit 1). A blocked plan's run stops at its first step (`run-task.ps1`: a nonzero unlocked
   step stops the plan).
4. **`v4-check.mjs receipt --task <T> --step <S> --manifest <M> --arm <A> [--baseline-task <BT> --baseline-step <BS>]
   --label frozen --source-label <SL>`**: `stepEvidence` (T04d) of the step, `parityVerdict` and `replayVerdict` (T04c)
   over its rows, and with a baseline every `absent`-mode item's `eventsDigest` equal to the baseline step's item of the
   same id; it writes `docs/improve-generating/evidence/frozen/<T>/<S>.receipt.json` = `proofEnvelope({ kind: 'parity',
   verdict: <fail on a failed block, incomplete on an incomplete one, else pass>, source: { frozenCommit, sourceDigest:
   <the stored identity's> }, harnessHash: <the stored identity's>, arms: [{ id: A, treeId: <stored>, paramsHash }],
   coverage: { expected: <the manifest's item ids>, observed, missing, censored }, evidence: [<the item log>, <M>],
   fields: { parity, replay, baseline } })`; exit 0 when written.
5. **Self-test** cases appended to `--items` (Tests table); **README.md**: T11a's section gains the plans, their order,
   the prerequisites gate, the template and the receipts.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, pure, on `compilePlans` of the default expansion with synthetic
durations (`{ 'v4-select/*': 30, 'v4-generate/*': 120, 'v4-replay/*': 30 }`).

| Case name | Input | Expected |
|---|---|---|
| `compile: no unresolved argument` | every `node` of every plan | none contains `<`, `>` or `resolved after`; the template has no `node` |
| `compile: producers before consumers` | the plans in the order `V4-S2`, `V4-LIVE`, `V4-S4`, `V4-S4C`, `V4-S4X` | every path a step consumes is produced by an earlier step of its plan, by an earlier plan, or is a `file` or `receipt` prerequisite of its plan |
| `compile: the live receipt precedes validation` | `V4-S4` | its first step is `prerequisites`; its prerequisites include the `live-deadline` receipt that `V4-LIVE`'s `live-receipt` step produces |
| `compile: comparators from the final selection` | `V4-S4` and the template | `resolve-comparators` consumes the `class-selection.json` that `verdicts` produces after every `publish-*` and `receipt-*` step; the template has `runnable: false`, one entry per validated, control and conditional cell |
| `compile: disjoint state paths` | every locked step of every plan | no two share `state`; `V4-S2\fr-base\pilot-14x14-nightmare\state.json`, `V4-S4\fr-frozen\val-14x14-nightmare\state.json` and `V4-S4X\fr-frozen\second-26x26-hell-1\state.json` exist |
| `compile: each step priced as it runs` | every locked step | `projectS` and `invocations` equal `stepPrice(step.price)`; `allocationMinutes` the ceiling of the required steps' `projectS + 45 x invocations` over 60, `optionalMinutes` the same for the optional ones |
| `compile: blocked plans refuse` | `checkPrerequisites` of `V4-S4`'s list with (a) `fr-frozen` missing; (b) every variant present and a live receipt whose `fr-frozen` tree id differs from `bindingOf`; (c) everything present and bound | (a) `blocked (variant fr-frozen missing; ...)`; (b) `blocked (stale arm fr-frozen)`; (c) `pass` |
| `receipt: a parity receipt` | the synthetic rows of T04c's parity cases written as a step folder (identity, log), with and without a baseline whose one `absent` digest differs | without: `kind` `parity`, `verdict` `pass`; with: `verdict` `fail`, the reason naming the item |

## Documentation

`tools/ig-proto/README.md` (step 5).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11c` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\manifest.mjs compile --label frozen --source-label "frozen 3fc65f4"` | root | the five plan files, the template and the item manifests written; exit 0 | 2 min |
| `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-LIVE --label frozen --source-label "frozen 3fc65f4"` | root | `prerequisites: blocked (variant fr-frozen missing; ...)`, exit 1 (expected: the stage-4 arms are later work) | 1 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T11c --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing the order of the round, a prerequisite or a named item's artifact.
- `QUESTION:` when a stage-2 step is not admissible (T11b) or a measured duration is missing for a kind the plans use.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11c-B01 | The frozen round is a sequence of concrete plans in the order of R2-11; nothing that depends on a later result can run before it exists | cases 1 to 4 and 7; the `check-prerequisites` command | self-test output; command output |
| T11c-B02 | Every arm used later has a parity pass and a typed receipt; the comparator is chosen only from the final selection | cases 4 and 8 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11c-T01 | Disjoint state paths and prices of the emitted steps | cases 5 and 6 | self-test output |
| T11c-T02 | The compiler writes only its own files | the `compile` command's refusal rule; the diff | diff |
| T11c-T03 | Nothing else changed; formats | guards; `npm run check` | command output |

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
