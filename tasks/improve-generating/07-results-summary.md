# IGP-07 — Estimate-vs-measured summary and re-run index

| Header | Value |
|---|---|
| ID | IGP-07 |
| Depends on | IGP-01 to IGP-06 (accepted and committed; a skipped optional step is reported as "later round") |
| Estimated size | Small: about 250 new lines (`summary.mjs`, the README's re-run index, the plan); about 1 hour of developer work; no machine time (it reads records only) |
| Owner role | Measurement prototype (reporting) |
| Confirms or refutes | the check-list §5 table (R00 to R31), including R31, a Projection of the all-phases times from the measured factors |
| Design refs | check-list §5 (rows, estimates, descriptive verdicts), §6 (re-run); report §2; the analysts' P1 to P5 scenario rows; `clarifications.md` "Direction after the joint report" (midpoints are not gates) and "Next actions" 4 (plan version 2 with measured numbers) |
| Label | provisional (pre-freeze); frozen re-run by check-list §6 |
| Implementation status | Not started |

## Goal & business context

The plan author revises the plan to version 2 with measured numbers before `gen-v4` is designed. This task turns the
round's records into one estimate-vs-measured table with a descriptive verdict per row, computed by a script so that
the frozen round produces the same table with one command, and writes the re-run index. The verdicts describe where a
measurement lies relative to the analysts' values; they validate nothing (the plan author: midpoints and scenario values
are not gates).

## Scope

### In scope

- `summary.mjs`: reads `docs/improve-generating/evidence/<label>/` (or `--root`) and writes `summary.json` and
  `summary.md` there.
- `tools/ig-proto/README.md`: the re-run index (check-list §6), with every task's command and the anchor-maintenance
  step.
- `plans/IGP-07.json` (one unlocked step).

### Out of scope

- New measurements; editing an earlier record; editing the check-list (the orchestrator copies the values into §5).

## Repository rules

The check-list §3. No lock is needed: nothing is rated or timed. No git.

## Design

### Rows and sources

| Row | Source record | Value taken |
|---|---|---|
| R00 | `IGP-00/identity.json`, `IGP-01/compare.json` (identity) | seeds compared; the level reached per seed and pair (puzzle identity by digest or keys, otherwise metric-prefix agreement, named as such) |
| R01 | `IGP-01/compare.json` | the `before` arm's T10 median and p95, completion, drift against MP12b1 |
| R02, R04, R05, R06, R08 | `IGP-01/compare.json` | the after arm's T10 median, completion, censoring, paired ratio on matched seeds, the fewer-puzzles marks |
| R03 | `IGP-01/compare.json` | completion before and after per failing Nightmare cell |
| R07 | `IGP-01/compare.json` | the paired T10 ratio on both Master cells |
| R10, R11 | `IGP-01/compare.json` | dead-end share of profile time (batch, set, both); dead-end entries after |
| R12, R13, R19 | `IGP-01/compare.json` | window profiles per ok call; waves (proxy); locate probes per call and no-window proofs |
| R14, R15, R17 | `IGP-02/pm4.json` | violations, coverage and gaps; useful ratings lost per `W`; P2's saving on today's mix |
| R16, R18, R20 | `IGP-03/compare.json` (and IGP-01's re-ratings) | work per accepted puzzle per `W`; re-ratings per call and their work share; the arity-3 probes and its idealised bound |
| R21 | `IGP-03/budgets.json` | `okBeyond` and `failedAbove` per budget |
| R22, R23, R25, R26 | `IGP-04/compare.json` | P6 factor; the eight-worker upper bound; the projected first-phase factor; memory |
| R24, R30 | `IGP-06/pm2.json` | kernel share and P7 sensitivity; phase and category shares |
| R27, R28 | `IGP-05/pm1.json` | in-band and eligible ratings per cell; failure classes |
| R29 | `IGP-01/compare.json` and `IGP-05/pm1.json` | start-count capped shares |
| R09 | none | "later round" |
| R31 | derived here | below |

### Verdicts (check-list §5)

The estimates of the check-list §5 are copied into the script as a table with their source text. For a time row:
**below both**, **between** (each analyst's value widened by a factor 1.35 for the small samples) or **above both**
analysts' values, and **inconclusive** with fewer than three paired values or no T10; the completion before and after is
printed beside, and a row whose after arm delivered fewer puzzles carries that mark. For a factor with a stated range
(P6, the eight-worker bound, the dead-end share): **inside** or **outside**. For R14: **holds** or **fails**, with the
coverage gaps. A row without an estimate is **measured (no estimate)**. A row whose step did not run is **later round**.
Every verdict cites its record and formula.

### R31: after all phases (Projection)

Per headline cell: the after arm's T10 median of IGP-01 (P1 to P5, four workers) divided by a first-phase factor and
by P7's assumption. The first-phase factor is measured on few cells (IGP-04: A:C on the fast cells and 12x12, E:F on
14x14), so its transfer to every cell is an explicit assumption: the record uses the range from the smallest to the
largest measured P6 × eight-worker factor for all cells, and the cell's own factor where one was measured. P7 is 1.3
(range 1.1 to 1.8, or IGP-06's sensitivity range when it is narrower). The result is a low, likely and high value
labelled a Projection, shown beside the analysts' after-all values (Opus; Astra); it is never a measured or confirmed
value. Eight workers stay an unadmitted upper bound.

### `summary.mjs`

`node tools\ig-proto\summary.mjs --label <L> [--root <evidence folder>]` writes `<root>/summary.json` (`{ meta, rows: {
'<R>': { quantity, estimate, measured, completion, kind, formula, record, verdict } }, laterRound: [ ... ] }`) and
`<root>/summary.md` (the banner, then the table in the column order of the check-list §5, then the later-round list with
its cost from IGP-05 and the skipped optional steps). `--root` defaults to `docs/improve-generating/evidence/<L>/`.
Exits 1 when a required record is missing (it names the task).

## Files to create/modify

| File | Change |
|---|---|
| `tools/ig-proto/summary.mjs` | new |
| `tools/ig-proto/plans/IGP-07.json` | new |
| `tools/ig-proto/README.md` | the re-run index |
| `docs/improve-generating/evidence/provisional/summary.json`, `summary.md` | new |

## Implementation steps

1. `summary.mjs` with the rows, sources and verdict rules; the README's re-run index.
2. Run it; check five rows against their records by hand (R02, R10, R14, R22, R27) and say so in the reply.
3. `npm run check`; the firewall check.

## Commands

```powershell
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-07.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1"
if ($LASTEXITCODE -ne 0) { throw "IGP-07 stopped: exit $LASTEXITCODE" }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

The plan holds the firewall snapshot, one unlocked step `tools/ig-proto/summary.mjs` (the runner adds `--label` and
`--source-label`) and the firewall check.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| IGP-07-B01 | One table gives, for every row of the check-list §5, the estimate, the measured provisional value with its completion, its kind and formula, the record and the descriptive verdict | `summary.md` |
| IGP-07-B02 | R31 is a Projection with its transfer assumption and ranges, beside the analysts' values | `summary.md` |
| IGP-07-B03 | The frozen round can produce the same table with one command, and the README says how (check-list §6) | README; the command |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| IGP-07-T01 | Values are read from the records, never typed in; verdicts follow the check-list §5 rules; five rows checked by hand | code review; the reply |
| IGP-07-T02 | Records per the check-list §3; `npm run check` and the firewall check pass | command output |

## Test plan

The run; the hand check of five rows; a run with `--root` pointing at a copy of the evidence folder under
`tests/artifacts/ig-proto/` with one record removed exits 1 and names the task (the records themselves are never
touched).

## Definition of done & handoff

- The reply gives the summary table and the later-round list.
- Handoff: the orchestrator fills the check-list §5 and the execution summary, pushes, and sends the summary to the
  plan author for plan version 2.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
