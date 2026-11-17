# T11g: Frozen-round manifest for the owner: the price, the approval requests and the dry runs

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 ("Budget"; stage 1's "a measured browser-to-Node factor; the manifest's price"; "The timed comparator"), §5.2, §8 (risks), §9 ("Replay prefetch"); decisions IG-P-D5 (OD-P8), IG-P-D7 (OD-P10), IG-P-Q23, D-V4-02, D-V4-08, D-V4-13, D-V4-16, D-V4-17, D-V4-18, D-V4-20; drift DR-O06, DR-O11, DR-O16; review RV1-15 (R15), RV1-21, RV2-12, RV2-13, RV3-04, RV3-05 (R3-05), RV4-05, RV4-07 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11f |
| Depends on | T11f |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (reads records; dry runs only) |

## Goal

The owner approves the frozen round only as a separately priced, staged manifest made after source preparation
(OD-P10). This task writes that manifest: per plan its projection, guard, ceiling from enforced bounds and predicted
censored observations; the stage-4 universe with every unactivated option priced apart; what each approval covers,
with the time already spent and the cumulative cap requested; and what is not priced yet, with the item that will
price it. It dry-runs the plans and stops so that the orchestrator can put the price to the owner.

## Authority and fixed points

- Plan §5.1 "Budget": "Priced after stage 1 from an enumerated manifest (commands, populations, repetitions, limits,
  validation, grace, concurrency). An indication, not an allocation"; "Each task has a ceiling".
- RV2-13 and D-V4-02 (accepted): each approval request states `roundCountedSBeforeApproval`,
  `requestedAdditionalGuardS` and `requestedCumulativeRoundMinutes` (T11b's `approvalFields`), re-read from the frozen
  invocation logs when it is made; the owner approves a cumulative cap; prior invocation records are never deleted; a
  lower approved cap gives an honest `stop`.
- R3-05 (accepted): ceilings come from enforced bounds (T11b); "Stage-5 aggregate hours are not one runnable process
  item. Price them from an enumerated bounded schedule of the actual measurement units; if that schedule is deferred
  to N-V4-04, mark its execution/ceiling unpriced and route its approval to that later manifest." This pack defers it:
  stage 5 is listed with an indication only, unpriced, approved with N-V4-04's manifest.
- R3-04, R4-07 and D-V4-20: the stage-4 universe (T11c) is priced per collection, the conditional boards and the
  optional item apart; the concrete `V4-S4` exists only after T11e's data-only activation and its timed allowance is
  approved then, with `approval --plan V4-S4`; `V4-S4C` after T11f's resolution; `V4-S4X` and `V4-S4XC` with N-V4-04.
- IG-P-Q37 (plan author, point 5) and D-V4-17: the work-interval rule adds no timed run (T11b); the manifest says so.
- RV1-21 (round 1): the optional browser calibration B-1 uses the frozen `base` tree for Node and the bench page served
  from `tests/artifacts/ig-proto/frozen-source/`, both without observers, journal or Generation steps prefetch, on the
  same requests, seeds, quantities and four workers, labelled a bench-page factor; the Generator-page calibration B-2 is
  a separate option (N-V4-01). Their browser parts have no runner with enforced bounds in this pack: projected only,
  ceilings unpriced until N-V4-01 enumerates that runner.
- Nothing runs: this task reads records, writes the manifest and dry-runs the plans.

## Scope

- Change: `tools/ig-proto/manifest.mjs` (steps 1 and 2), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T11a's section).
- Create: evidence `docs/improve-generating/evidence/frozen/V4-T11/manifest.json` and `manifest.md`.
- Do not change: everything else, the plans of T11c included. Guards: `node tools\ig-proto\firewall.mjs check --task
  V4-T11g --label frozen`, expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib tools/ig-proto/data tools/ig-proto/plans`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T11g --label frozen`.
1. **`price --label frozen --source-label <SL>`** and its pure core `manifestOf({ plans, universe, s4x, stage5, browser,
   spentS, inventory })`: reads `tools/ig-proto/plans/V4-S2.json`, `V4-LIVE.json`, `V4-S4.universe.json` and
   `V4-S4X.template.json` (T11c) with T11b's `stepPrice` of each step, T03's
   `docs/improve-generating/evidence/frozen/V4-T03/inventory.json` as `inventory = { families: totals.families,
   alternate: alternate.length, populations: populations.length }` (`null` when the file is absent), and:
   - stage 5 (`stage5`), each item with an indication and `priced: false`, `pricedBy: 'N-V4-04'`, no ceiling and no
     approval request: S5-1 the PM1 Hell 1 cells with the failing-set work (the twelve Hell 1 cells, per cell 10 sets x
     3 layouts x 2 orders at `60 x` the mean probes per family of that cell in IGP-05's `families-*.jsonl` `x` its mean
     probe `ms` `/ 1000 / 4`); S5-2 the nine Hell 2 cells of IGP-05 for the central share only, the same rule; S5-3
     C4's counting, `1.25 x` the sum of `canonical.ms / 1000` of `evidence/frozen/IGP-02/profiles-*.jsonl`; S5-4 C3's
     capped-input features, data only, 0; S5-5 further browser runs, no indication;
   - the browser calibration (`browser`): B-1's Node part as `base` rows on `10x10-nightmare`, `12x12-nightmare`,
     `26x26-nightmare`, `14x14-master`, reps 0 to 4, row limit 260, priced by `stepPrice` (projection and ceiling);
     B-1's browser part: projected `4.5 x` the Node part's node seconds, served by `node tools\serve.mjs --root
     tests\artifacts\ig-proto\frozen-source --port 8091 --prefix /pentomino/` at
     `http://127.0.0.1:8091/pentomino/tools/bench/index.html`, labelled "bench-page factor", ceiling unpriced (N-V4-01);
     B-2: the Generator page with its Generation steps prefetch on `10x10-nightmare`, `12x12-nightmare` and
     `14x14-master` (26x26 exceeds the Generator's 484-cell limit, DR-O16), projected like B-1's browser part, ceiling
     unpriced (N-V4-01).
   It writes `docs/improve-generating/evidence/frozen/V4-T11/manifest.json` (meta block; every input with its path
   and SHA-256; every plan, step and item with its numbers and commands; the approval requests) and `manifest.md`, in
   order: (1) the price per plan, collection and item: projected counted minutes, guard minutes, ceiling minutes and
   predicted completed and censored observations; `V4-S2` and `V4-LIVE`; the universe of stage 4 per collection
   (`initial` with its comparators; each conditional board apart; the optional S4-6 apart; `second` with its
   comparators), with "An indication, not an allocation (plan §5.1)" and "planning projection: 1.25 x factor x MP12b1
   median; not a bound"; then the line "Data-only PM1 inventory, stage 1 (IG-P-Q24 (b); it opens no route):
   docs/improve-generating/evidence/frozen/V4-T03/inventory.md, <families> families, <alternate> alternate rows in
   <populations> populations." (`PM1 inventory: missing` when `inventory` is null or absent; the file is an input of
   `manifest.json`); then stage 5 and the browser parts as "unpriced", each with the item that prices it; (2)
   what the owner approves now and later, in order: `V4-S2` now; `V4-LIVE` when N-V4-03 and N-V4-13 have unblocked
   it; `V4-S4` in two steps (R4-07): the owner decides the optional S4-6 and authorizes the data-only `activate`
   (T11e; the conditional boards follow their pilots), which writes the plan and its price, then `approval --plan
   V4-S4` asks for its timed allowance, covering exactly the activated declared rows;
   `V4-S4C` at the resolution (T11f); `V4-S4X` and `V4-S4XC`, stage 5 and the browser calibration with N-V4-04 and
   N-V4-01; each entry with RV2-13's three fields (`roundCountedSBeforeApproval` = the frozen round's counted seconds
   now plus the guards of the earlier entries, marked "assumes each earlier approval is spent to its guard; re-read
   when asked"); (3) the plans, their steps, commands and prerequisites, and the named items that unblock them
   (N-V4-03, N-V4-13, N-V4-04, N-V4-01); (4) seeds, limits, concurrency ("one locked invocation at a time on this
   machine, under the lock helper, of at most 900 s; timed requests sequential at four workers; a quiet period of 15 s
   under the owner's idle declaration, else 45 s; Sudoku's difficulty-v3 keeps priority": the owner's lock rules of
   2026-11-17 21:33, check-list §3.2), the stopping rule of plan §5.1 verbatim,
   the verdict recipe (plan §5.2, `verdicts.mjs`, resample seed 20261116, 10,000 resamples), completion apart from the
   deadline (D-V4-16), the work rule of IG-P-Q37 (judged on the intervals, reported with the completed-unit ratio; no
   timed run added) and P5's false stops counted against the uncapped comparator over the declared pairs (P-OD12,
   DR-O11, T09d); (5) the browser calibration and its labels; (6) the risks of plan §8 that bear on the price, quoted
   with their section numbers; (7) T11b's pricing rules (its export `PRICING`), its ceilings from enforced bounds and the overhead
   assumptions (a horizon of 885 s for every invocation under the owner's 900-s cap, although the runner's `decide`
   lowers it near the approved cap, which the price does not model; 45 quiet seconds counted per invocation even where
   the owner's idle quiet of 15 s applies, so that the quiet-period component can be lower; runtime and total cost remain projections (fail-closed; with 15 s throughout, the
   first approvals' 34.4 h would be 32.4 h); the ceiling `units x 945`, which grew with the cap while the binding limit
   of a run stays its plan's guard, checked before every invocation; `factor()` 1 when the identity file is absent; a
   cell without an MP12b1 report, `20x20-hell-1` today, priced at its row limit; the P-1 passes priced at their reserves
   for want of a measured `fr-*` item, T11c's `durationSource` `reserve`: the seven of `V4-S2` 124.6 counted minutes,
   about 31 at the `v4` measures of 34.6, 23.6 and 16.3 s per select, generate and replay item (one invocation a pass),
   so that `V4-S2` would be about 466 minutes instead of 560, and the four of `V4-S4`, priced at its activation, about
   71 minutes at their reserves: rulings of 2026-11-17, T11c's QUESTION 2 and the owner's lock rules); (8) the
   difference from the plan's indication (stage 4 about 3.4 to
   4.2 h): the universe's counted minutes and their causes, each with its minutes: both twins on every validated cell,
   the comparator, the ten controls (T11a's ruling of 2026-11-17), the quiet periods (before the owner's lock rules of
   2026-11-17 21:33 a group of 260-s rows admitted one row per invocation under the 300-s cap, so that each row paid a
   45-s quiet period: T11b's scratch price of the whole matrix was 3,604 counted minutes in 1,224 invocations, 918 of
   them quiet, stage 4 with `V4-LIVE` 3,091.6; under the 900-s cap rows share invocations: 2,874.7 counted minutes in 293
   invocations, 220 of them quiet, stage 4 with `V4-LIVE` 2,452.4 and the universe alone 2,417.3), the conditional saving of N-V4-18 after the freeze, and the planning
   projection from today's
   search times (`1.25 x factor x refS`: a twin whose projection exceeds its 130-s limit is priced at the limit and
   predicted censored, a projection from today's search, not the frozen arms' expected time).
2. **`approval --plan <id> [--after <ids>] [--optional] --label frozen --source-label <SL>`** and its pure core
   `approvalFor({ spentS, earlierGuardS, guardS })`: prints one JSON line `{ plan, spentS, assumedEarlierGuardS,
   roundCountedSBeforeApproval, requestedAdditionalGuardS, requestedCumulativeRoundMinutes }`, `spentS` re-read now
   from `readInvocations('frozen')` (`lib/budget.mjs`), the guards from the plans' prices (`--optional` adds the
   optional steps' guard). A plan file that does not exist (`V4-S4` before its activation, `V4-S4C` before its
   resolution) exits 1 with `approval: <id> is priced at its <activation | resolution>; ask then`.
3. **Self-test** cases appended to `--items` (Tests table); **README.md**: T11a's section gains `price` and
   `approval`.
4. **Dry runs**, in one PowerShell session at the root, after `price`:

   ```powershell
   $sl = 'frozen 3fc65f4'
   $order = @(@{ P = 'V4-S2'; A = '' }, @{ P = 'V4-LIVE'; A = 'V4-S2' })
   foreach ($o in $order) {
     $a = @('tools\ig-proto\manifest.mjs', 'approval', '--plan', $o.P, '--label', 'frozen', '--source-label', $sl)
     if ($o.A) { $a += @('--after', $o.A) }
     $req = node @a | ConvertFrom-Json
     if ($LASTEXITCODE -ne 0) { throw ('STOP: approval ' + $o.P) }
     pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan ('tools\ig-proto\plans\' + $o.P + '.json') -Label frozen -SourceLabel $sl -ApprovedRoundMinutes $req.requestedCumulativeRoundMinutes -DryRun
     if ($LASTEXITCODE -ne 0) { throw ('STOP: dry run ' + $o.P) }
   }
   node tools\ig-proto\manifest.mjs approval --plan V4-S4 --label frozen --source-label $sl
   if ($LASTEXITCODE -ne 1) { throw 'STOP: V4-S4 must not be approvable before its activation' }
   $low = [math]::Floor((node tools\ig-proto\manifest.mjs approval --plan V4-S2 --label frozen --source-label $sl | ConvertFrom-Json).spentS / 60)
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S2.json -Label frozen -SourceLabel $sl -ApprovedRoundMinutes $low -DryRun
   ```

## Tests

All in `tools/ig-proto/self-test.mjs --items`, pure, on synthetic plans and records.

| Case name | Input | Expected |
|---|---|---|
| `approval: re-read and cumulative` | `approvalFor({ spentS: 600, earlierGuardS: [], guardS: 1200 })`; then `earlierGuardS: [300]` | 30 minutes; then `roundCountedSBeforeApproval` 900 and 35 minutes |
| `price: stage 5 is not priced here` | `manifestOf` with the stage-5 inputs of step 1 | every stage-5 item has `priced: false`, `pricedBy: 'N-V4-04'`, no `ceilingS` and no approval request; `manifest.md`'s section 1 lists them under "unpriced" |
| `price: the universe keeps its options apart` | `manifestOf` over a universe with one conditional board and the optional S4-6 | the `initial` total excludes both; each has its own projected, guard and ceiling minutes; the approval list names `V4-S4` as "after its data-only activation: the optional scope first, then the timed allowance" |
| `price: ceilings beside projections` | `manifestOf` over a plan with one rows step and one process step | each step's `ceilingS` is T11b's and at least its `countedS`; the plan's ceiling minutes are their sum over 60, rounded up |

## Documentation

`tools/ig-proto/README.md` (step 3); the manifest is the record for the owner.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11g` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\manifest.mjs price --label frozen --source-label "frozen 3fc65f4"` | root | `manifest.json` and `manifest.md` written; exit 0 | 2 min |
| step 4, the loop | root, one PowerShell session | two dry runs; every locked step of `V4-S2` `go`; `V4-LIVE`'s dry run lists its steps (its first, `prerequisites`, is unlocked and is not run by a dry run); each forecast line equals the manifest's projected counted seconds of that plan | 4 min |
| step 4, `approval --plan V4-S4` | root | exit 1, `approval: V4-S4 is priced at its activation; ask then` | 1 min |
| step 4, the last dry run (`-ApprovedRoundMinutes` = the counted minutes already spent, rounded down) | root | its first locked step `stop` with the budget reason (an honest stop under a lower cap) | 1 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T11g --label frozen` | root | `files unchanged` | 1 min |
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
| T11g-B01 | The owner gets one priced, staged manifest: per plan the projection, guard, ceiling and predicted censored observations, what each approval covers and when, the time already spent and the cumulative cap requested, and why it differs from the plan's indication | `manifest.md` sections 1, 2 and 8 | `evidence/frozen/V4-T11/manifest.md` |
| T11g-B02 | Nothing unbounded is presented as bounded: stage 5 and the browser parts are unpriced, each with the item that prices it; unactivated options are priced apart | cases 2 and 3; section 1 | self-test output; `manifest.md` |
| T11g-B03 | The browser calibration is a separate option with matching source and observers, labelled a bench-page factor | section 5 | `manifest.md` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11g-T01 | The dry runs admit every locked step with the requested cumulative caps and stop honestly under a lower cap; `V4-S4` cannot be approved before its activation | the dry runs | runner output |
| T11g-T02 | Approval fields are re-read and cumulative; ceilings are T11b's | cases 1 and 4 | self-test output |
| T11g-T03 | Nothing else changed; formats | guards; `npm run check` | command output |

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
