# T11d: Frozen-round manifest for the owner: the comparators, the verdict input, the price and the approval requests

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 ("Budget"; stage 1's "a measured browser-to-Node factor; the manifest's price"; "The timed comparator"), §5.2, §8 (risks), §9 ("Replay prefetch"); decisions IG-P-D5 (OD-P8), IG-P-D7 (OD-P10), IG-P-Q23, D-V4-02, D-V4-08, D-V4-13, D-V4-16, D-V4-18; drift DR-O06, DR-O11, DR-O16; review RV1-15 (R15), RV1-21, RV2-11 (R2-11 steps 5 and 6), RV2-13 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11c |
| Depends on | T11c |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (reads records; dry runs only) |

## Goal

The owner approves the frozen round only as a separately priced, staged manifest made after source preparation
(OD-P10). This task writes the two commands that close the pipeline after the validation (the comparator plan from
the final class selection, and the verdict manifest from the real records), then the manifest itself, with each plan's
projection, guard and ceiling and, for each approval, the time already spent and the cumulative cap requested; it dry-
runs the plans and stops so that the orchestrator can put the price to the owner.

## Authority and fixed points

- Plan §5.1 "Budget": "Priced after stage 1 from an enumerated manifest (commands, populations, repetitions, limits,
  validation, grace, concurrency). An indication, not an allocation"; "Each task has a ceiling".
- R2-11 steps 5 and 6 (accepted): `resolve-comparators` reads only a final, bound class-selection receipt (T09c) and
  emits the concrete comparator plan with the actual arm and variant per cell and per-cell state paths; one resolved
  configuration per arm folder; the verdict-input manifest names the real published files with their SHA-256 and the
  receipts with their expected bindings.
- RV2-13 and D-V4-02 (accepted): each approval request states `roundCountedSBeforeApproval`,
  `requestedAdditionalGuardS` and `requestedCumulativeRoundMinutes` (T11b's `approvalFields`), re-read from the frozen
  invocation logs when it is made; the owner approves a cumulative cap; prior invocation records are never deleted; a
  lower approved cap gives an honest `stop`.
- RV1-21 (round 1): the optional browser calibration B-1 uses the frozen `base` tree for Node and the bench page served
  from `tests/artifacts/ig-proto/frozen-source/`, both without observers, journal or Generation steps prefetch, on the
  same requests, seeds, quantities and four workers, labelled a bench-page factor; the Generator-page calibration B-2 is
  a separate option (N-V4-01).
- Nothing runs: this task reads records, writes the manifest and dry-runs the plans.

## Scope

- Change: `tools/ig-proto/manifest.mjs` (steps 1 to 4), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T11a's section).
- Create: evidence `docs/improve-generating/evidence/frozen/V4-T11/manifest.json` and `manifest.md`.
- Do not change: everything else, the plans of T11c included. Guards: `node tools\ig-proto\firewall.mjs check --task
  V4-T11d --label frozen`, expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib tools/ig-proto/data tools/ig-proto/plans`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T11d --label frozen`.
1. **`resolve-comparators --selection <receipt> --out <plan> --label frozen --source-label <SL>`** and its pure core
   `resolveComparators(template, selection, { bindingOf, expectedRows })`:
   - `proofCheck(selection, { kind: 'class-selection', source: { frozenCommit: FROZEN_COMMIT, sourceDigest:
     FROZEN_DIGEST }, arms: <each class arm of the freeze file with bindingOf(id)>, coverage: { expected: expectedRows },
     fields: {} })` must pass, else exit 1 with `resolve-comparators: the selection is not final (<reasons>)` and nothing
     written (an interim report is never a selection).
   - For each template cell: `shipped = selection.selection.cells[cell]?.shipped`; `fr-frozen` resolves to
     `fr-frozen-uncapped`, `fr-frozen-none` to `fr-frozen-none-uncapped`; anything else exits 1 with
     `resolve-comparators: no shipped arm for <cell>`.
   - It writes the plan `V4-S4C` (`generatedBy: 'manifest.mjs resolve-comparators'`, `runnable: true`, prerequisites:
     the resolved variants and `{ type: 'receipt', path: <selection>, kind: 'class-selection', arms, coverage }`):
     `prerequisites`; `trees`; per cell a locked step `rows-<arm>-<shard>` (`tools\ig-proto\arm.mjs run --task V4-S4C
     --arm <resolved> --shard <template shard> --variant <resolved> --workers 4 --cases <cell>:<from>-<to> --row-limit-s
     260`, state `V4-S4C\<resolved>\<shard>\state.json`, priced by `stepPrice`); `publish-<resolved>` per resolved arm;
     `verdict-input` (`--stage final --out tools\ig-proto\plans\verdicts\V4-S4F.verdict-manifest.json`); `verdicts`
     (on that manifest); `firewall-check`. It refuses to overwrite a file without its own `generatedBy`.
2. **`verdict-input --stage <validation | final> --out <path> --label frozen --source-label <SL>`** and its pure core
   `verdictInput(stage, { freeze, expansion, published, bindingOf })`: T09a's schema with `task` `V4-S4` (validation)
   or `V4-S4F` (final); `quantity` 10; `capMs` and `responseBoundMs` 120,000; `resampleSeed` 20261116; `resamples`
   10,000; `validationReps` 20 to 39; `masterReps` 20 to 24; `arms`: every arm of the stage-4 groups (and, for `final`,
   the resolved comparator arms) with `task`, `arm`, `variant`, `treeId` and `files: [{ path, sha256 }]` of its
   published runs files; `classes` from `freeze.json`; `failingCells` (T11a's `failingNightmare`); `controls` (each with
   `today: 'log-link'`); `masters` (`{ cell, today: 'log-link', after: 'fr-frozen' }` per Master cell); `hell1` (the
   validated and the conditional boards that ran); `p5` (`final`: per comparator cell `{ cell, bounded: <the shipped
   twin>, uncapped: <its comparator> }`; `validation`: `[]`); `deadlineProjection` `{ arms: ['fr-frozen',
   'fr-frozen-none'], reserves: [0.3, 0.4, 0.5], deadlineMs: 115000 }`; `prerequisites`: `stage1`
   (`docs/improve-generating/evidence/frozen/V4-T04/stage1.json`, kind `stage1`, the frozen source, `arms: []` because
   the stage-1 trees are not today's and `V4-S2`'s P-0 pass re-proves `v4` on the final trees, `coverage.expected` the
   receipt's own declared ids), `parity` (the `V4-S4P` receipts of the `fr-*` arms in `arms`, kind `parity`; today's
   `log-link` has T04e's identity receipt and T06's digest check instead) and `liveDeadline`
   (`.../V4-LIVE/live-deadline.json`, kind `live-deadline`, `fields` T04d's `LIVE_DEADLINE_FIELDS`), the `parity` and
   `liveDeadline` bindings bound to the current trees by `bindingOf`.
   A declared arm without its published file throws `verdict-input: not published <arm>`; nothing is written then.
3. **`price --label frozen --source-label <SL>`**: reads T11c's plans and template, T11b's prices of their steps, and
   prices the items outside the plans: stage 5 per item (S5-1 the PM1 Hell 1 cells with the failing-set work, the
   twelve Hell 1 cells, per cell 10 sets x 3 layouts x 2 orders at `60 x` the mean probes per family of that cell in
   IGP-05's `families-*.jsonl` `x` its mean probe `ms` `/ 1000 / 4`, as one `process` step of that many seconds; S5-2
   the nine Hell 2 cells of IGP-05 for the central share only, the same rule; S5-3 C4's counting, `1.25 x` the sum of
   `canonical.ms / 1000` of `evidence/frozen/IGP-02/profiles-*.jsonl`; S5-4 C3's capped-input features, data only, 0;
   S5-5 further browser runs, priced when asked) and the browser calibration (B-1: Node part `base` rows on
   `10x10-nightmare`, `12x12-nightmare`, `26x26-nightmare`, `14x14-master`, reps 0 to 4, row limit 260, priced by
   `stepPrice`; browser part `4.5 x` the Node part's node seconds, served by `node tools\serve.mjs --root
   tests\artifacts\ig-proto\frozen-source --port 8091 --prefix /pentomino/` at
   `http://127.0.0.1:8091/pentomino/tools/bench/index.html`, labelled "bench-page factor"; B-2: the Generator page with
   its Generation steps prefetch on `10x10-nightmare`, `12x12-nightmare` and `14x14-master`, 26x26 exceeding the
   Generator's 484-cell limit, DR-O16, priced like B-1's browser part). It writes `manifest.json` (meta block; every
   input with its path and SHA-256; every plan, step and item with its numbers and commands; the approval requests)
   and `manifest.md`, in order: (1) the price per plan and item: projected counted minutes, guard minutes and ceiling
   minutes, required, optional and conditional apart, with "An indication, not an allocation (plan §5.1)" and
   "planning projection: 1.25 x factor x MP12b1 median; not a bound"; (2) what the owner approves, in the order
   `V4-S2`, `V4-LIVE`, `V4-S4` (its optional steps apart), `V4-S4C`, `V4-S4X`, stage 5 per item, B-1, B-2, each with
   RV2-13's three fields (`roundCountedSBeforeApproval` = the frozen round's counted seconds now plus the guards of the
   earlier entries, marked "assumes each earlier approval is spent to its guard; re-read when asked"); (3) the plans,
   their steps, commands and prerequisites, and the named items that unblock them (N-V4-03, N-V4-13, N-V4-04); (4)
   seeds, limits, concurrency ("one locked invocation at a time on this machine, under the lock helper; Sudoku's
   difficulty-v3 keeps priority"), the stopping rule of plan §5.1 verbatim, the verdict recipe (plan §5.2,
   `verdicts.mjs`, resample seed 20261116, 10,000 resamples), completion apart from the deadline (D-V4-16) and P5's
   false stops counted against the uncapped comparator (P-OD12, DR-O11, T09c); (5) the browser calibration and its
   labels; (6) the risks of plan §8 that bear on the price, quoted with their section numbers; (7) T11b's pricing rules
   and overhead assumptions; (8) the difference from the plan's indication (stage 4 about 3.4 to 4.2 h): stage 4's
   counted minutes and their causes (both twins on every validated cell, the comparator, the 260-s limit of today's and
   the comparator groups, one or two rows per invocation).
4. **`approval --plan <id> [--after <ids>] [--optional] --label frozen --source-label <SL>`** and its pure core
   `approvalFor({ spentS, earlierGuardS, guardS })`: prints one JSON line `{ plan, spentS, assumedEarlierGuardS,
   roundCountedSBeforeApproval, requestedAdditionalGuardS, requestedCumulativeRoundMinutes }`, `spentS` re-read now
   from `readInvocations('frozen')` (`lib/budget.mjs`), the guards from the plans' prices (`--optional` adds the
   optional steps' guard).
5. **Self-test** cases appended to `--items` (Tests table); **README.md**: T11a's section gains the commands of steps 1
   to 4.
6. **Dry runs**, in one PowerShell session at the root, after `price`:

   ```powershell
   $sl = 'frozen 3fc65f4'
   $order = @(@{ P = 'V4-S2'; A = ''; O = $false }, @{ P = 'V4-LIVE'; A = 'V4-S2'; O = $false }, @{ P = 'V4-S4'; A = 'V4-S2,V4-LIVE'; O = $false }, @{ P = 'V4-S4'; A = 'V4-S2,V4-LIVE'; O = $true }, @{ P = 'V4-S4X'; A = 'V4-S2,V4-LIVE,V4-S4'; O = $false })
   foreach ($o in $order) {
     $a = @('tools\ig-proto\manifest.mjs', 'approval', '--plan', $o.P, '--label', 'frozen', '--source-label', $sl)
     if ($o.A) { $a += @('--after', $o.A) }
     if ($o.O) { $a += '--optional' }
     $req = node @a | ConvertFrom-Json
     if ($LASTEXITCODE -ne 0) { throw ('STOP: approval ' + $o.P) }
     $dry = @('-NoProfile', '-File', 'tools\ig-proto\run-task.ps1', '-Plan', ('tools\ig-proto\plans\' + $o.P + '.json'), '-Label', 'frozen', '-SourceLabel', $sl, '-ApprovedRoundMinutes', $req.requestedCumulativeRoundMinutes, '-DryRun')
     if ($o.O) { $dry += '-IncludeOptional' }
     pwsh @dry
     if ($LASTEXITCODE -ne 0) { throw ('STOP: dry run ' + $o.P) }
   }
   $low = [math]::Floor((node tools\ig-proto\manifest.mjs approval --plan V4-S2 --label frozen --source-label $sl | ConvertFrom-Json).spentS / 60)
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S2.json -Label frozen -SourceLabel $sl -ApprovedRoundMinutes $low -DryRun
   ```

## Tests

All in `tools/ig-proto/self-test.mjs --items`, pure, with temporary files under `tests/artifacts/ig-proto/selftest/`.

| Case name | Input | Expected |
|---|---|---|
| `resolve: comparators from a final selection` | a template with `14x14-nightmare` and `26x26-hell-1`; a bound `class-selection` receipt (T04d's `proofEnvelope`, complete coverage) shipping `fr-frozen` on the first and `fr-frozen-none` on the second | the plan's row steps use `--arm fr-frozen-uncapped --variant fr-frozen-uncapped --shard val-14x14-nightmare` and `--arm fr-frozen-none-uncapped ... --shard val-26x26-hell-1`; states `V4-S4C\fr-frozen-uncapped\val-14x14-nightmare\state.json` and `V4-S4C\fr-frozen-none-uncapped\val-26x26-hell-1\state.json`; no `node` contains `<` |
| `resolve: an interim selection is refused` | (a) the receipt with one expected row missing from `coverage.observed`; (b) a receipt bound to another `fr-frozen` tree id; (c) a selection without `26x26-hell-1` | (a) and (b) refused with `the selection is not final (...)`; (c) `no shipped arm for 26x26-hell-1`; nothing written |
| `verdict input: real paths and hashes` | `verdictInput('final', ...)` over two temporary published files and the resolution of the first case | `arms[].files[].sha256` equal to the files' SHA-256; `p5` `[{ cell: '14x14-nightmare', bounded: 'fr-frozen', uncapped: 'fr-frozen-uncapped' }, { cell: '26x26-hell-1', bounded: 'fr-frozen-none', uncapped: 'fr-frozen-none-uncapped' }]`; `prerequisites.liveDeadline.expected.kind` `live-deadline` and its `fields` deep-equal to `LIVE_DEADLINE_FIELDS`; with one file missing: throws `verdict-input: not published <arm>` |
| `approval: re-read and cumulative` | `approvalFor({ spentS: 600, earlierGuardS: [], guardS: 1200 })`; then `earlierGuardS: [300]` | 30 minutes; then `roundCountedSBeforeApproval` 900 and 35 minutes |

## Documentation

`tools/ig-proto/README.md` (step 5); the manifest is the record for the owner.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11d` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\manifest.mjs price --label frozen --source-label "frozen 3fc65f4"` | root | `manifest.json` and `manifest.md` written; exit 0 | 2 min |
| step 6, the loop | root, one PowerShell session | five dry runs; every locked step `go`; each plan's forecast line equals the manifest's projected counted seconds of that plan (with its optional steps for the `-IncludeOptional` run) | 4 min |
| step 6, the last dry run (`-ApprovedRoundMinutes` = the counted minutes already spent, rounded down) | root | its first locked step `stop` with the budget reason (an honest stop under a lower cap) | 1 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T11d --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- **Stop and report at the end of this task** with `manifest.md`'s sections 1, 2 and 8: the orchestrator puts them to
  the owner (OD-P10). Nothing of stages 2 to 5, the parity passes, the probes, the live-deadline receipt or the
  browser calibration runs before the owner's approval of that plan; each approval is asked with `approval --plan`
  re-run at that time.
- `QUESTION:` when a record the pricing reads is missing (other than the documented fallbacks), or a dry run says
  `stop` with the requested cap.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11d-B01 | The owner gets one priced, staged manifest: per plan the projection, guard and ceiling, what each approval covers, the time already spent and the cumulative cap requested, and why it differs from the plan's indication | `manifest.md` sections 1, 2 and 8 | `evidence/frozen/V4-T11/manifest.md` |
| T11d-B02 | The comparator is resolved only from a final, bound selection, and the verdict reads only real, hashed records | the `resolve` and `verdict input` cases | self-test output |
| T11d-B03 | The browser calibration is a separately priced option with matching source and observers, labelled a bench-page factor | section 5 | `manifest.md` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11d-T01 | The dry runs admit every locked step with the requested cumulative caps and stop honestly under a lower cap | the dry runs | runner output |
| T11d-T02 | Approval fields are re-read and cumulative | the `approval` case | self-test output |
| T11d-T03 | Nothing else changed; formats | guards; `npm run check` | command output |

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
