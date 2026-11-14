# IGP-02 — PM4: the screen certificate and the `W_screen` economics

| Header | Value |
|---|---|
| ID | IGP-02 |
| Depends on | IGP-00 (accepted and committed); independent of IGP-01 |
| Estimated size | Medium: about 450 new lines (`pm4.mjs`); about 1 to 2 hours of developer work; machine time about 23 minutes (projection: four `calls` invocations, three or four `screens` invocations, a dry run: nine locked commands at most; check-list §7) |
| Owner role | Measurement prototype |
| Confirms or refutes | IG-P-Q01: the certificate "main work at the end ≤ `W_screen`, with every other limit unchanged" gives the canonical rating (R14); IG-P-Q09: useful ratings lost and misdirections at 95, 190 and 380 M (R15); report §4 P2: the saving on today's capped profiles (R17); the start-count capped share (R29, cross-check) |
| Design refs | plan §3 P2, §5 PM4; report §4 (P2), §5 item 1, §6 item 2; `clarifications.md` IG-P-Q01 (b) with (c) as fallback, Q04 (record work and nodes to the first solution, the count tail and the census apart), Q09 (95 M kept as control); check-list §4 D-IG3, D-IG9, D-IG12, D-IG13 |
| Label | provisional (pre-freeze); frozen re-run by check-list §6 |
| Implementation status | Not started |

## Goal & business context

P2 rates every search profile with a lower main-phase work limit `W_screen` and accepts the result only when the main
work at the end is at most `W_screen` (the plan author's certificate, IG-P-Q01); a run above it is screen-capped and only
steers the search. If the certificate held anything but the canonical rating, puzzles would carry wrong ratings, so the
feature would fall back to re-rating every candidate (option (c)). This task checks the certificate on real profiles,
including the cases the plan author named (normal stops after an overshoot, caps after the first solution, R7's early
NONE), and measures what each `W_screen` costs and loses on today's profile mix.

## Scope

### In scope

- `pm4.mjs` with `calls`, `screens` and `report`; the corpus of six cells; boundary probes for the named cases; the
  records.

### Out of scope

- The prototype search (IGP-01); its W variants (IGP-03); a lowered `N_screen` (the plan author's first version does
  not lower it; check-list D-IG9). Any limit other than `DEDUCE.work` stays canonical in every screen.

## Repository rules

The check-list §3 and §7. Locked commands through the runner only; no git.

## Inputs & context

- The certificate's argument (IGP-01 "Inputs & context"), valid only with `DEDUCE.work` lowered and every other limit
  unchanged: every main-phase check compares `work` with the same limit (`core/engine/deduce.js:840, 1102, 1128,
  1623`); work never decreases; R7 gives up only when `work > workLimit` (lines 1102 and 1128), and the next check of
  `branch` then stops with `work-cap`; the census budget is relative (line 1747). Hence a run whose main work at the end
  is at most `W` passed no check differently from the canonical run.
- IGP-00's lanes (`call` and `rate` jobs, supervisor and admission), `screenRating` and `rateRecord`
  (`lib/calls.mjs`), the `instr` tree (work and nodes at the first solution, R7 cut counter through `igTake()`), the
  catalogue `data/boards-v1.json`, the runner.
- A screened run is `measureV3` with `{ deduce: { ...DEDUCE, work: W }, dlx: SCORE.caps }`: `nodes` 30,000, `solutions`
  8, `census` 80,000,000, `lookaheadWidth` and `memoryBytes` stay canonical.

## Design

### Corpus

Cells: `10x10-nightmare`, `12x12-nightmare`, `14x14-nightmare`, `15x15b10-nightmare`, `26x26-nightmare`, `26x26-hell-1`.
Per cell four sets, seeds `ig-pm4/<case>/<i>` for i = 0 to 3, each the first attempt from 0 whose carve succeeds (up
to 8). Per set:

- **Call profiles:** today's set-stage call (`recordedCall` with the set's `calRng`, the production code path of
  `setAttempt`), every rating it makes, canonical, in order, streamed to the host. A call cut at the invocation
  deadline is recorded `censored`; its completed profiles stay in the corpus.
- **Window profiles:** subsets at the start count + 1, + 2, + 3 and + 4 (within 1 to K - 2), three each
  (`windowSubsets`, stream `ig/window/<g>/<s>` of the set's seed), canonical. They add complete ratings near the band,
  which the dead-end calls of 14x14 and 15x15b10 lack.

Every canonical record holds the tuple fields of IGP-00 §4 by name (count, outcome, score, main work, census work,
work and nodes to the first solution, nodes, census nodes, stop, R7 cuts, ms) plus side, AR1, censored, solutions, and
the count tail (main work − work to the first solution): IG-P-Q04's fields.

### Screens

Every profile is rated again at `W` = 95,000,000, 190,000,000 and 380,000,000 units (lanes, `instr` tree). Each screen
result is classified:

| Class | Condition | Accepted under the certificate | Check |
|---|---|---|---|
| `certified` | a rating with main work ≤ `W` | yes | must deep-equal the canonical rating; a difference is a **violation** (stop) |
| `scap0` | `IncompleteRatingError` (capped before the first solution) | no | the canonical record is capped or has main work > `W` |
| `scap1` | a rating with main work > `W` and stop `work-cap` (capped after the first solution) | no | record whether it equals the canonical rating |
| `over` | a rating with main work > `W` and another stop (a normal stop after an overshoot) | no | record whether it equals the canonical rating; no equality is expected or required |

### Boundary probes (the named cases)

The fixed values may miss the cases the plan author named, so every complete canonical profile whose work to the first
solution is known (`workFirst > 0`) gets three more screens, chosen from its own record:

- `W = mainWork - 1` (the run passes `W` at its very end: an `over` or a `scap1`);
- `W = workFirst - 1` (the limit is passed before the first solution: a `scap0`, or an `over` when no check fires in
  between);
- `W = workFirst + floor((mainWork - workFirst) / 2)` when the count tail is at least 2 units (a cap during the count
  tail: a `scap1`, or an `over`).

Each boundary screen is classified as above and checked the same way (a certified boundary screen is impossible by
construction and would be a defect). The record counts, for every class, the runs observed, and the runs with an R7 cut
in the main search (`r7Cut > 0`; census-phase cuts, `r7CutCensus`, follow the census's relative budget and are reported
apart, never as R7 coverage); a class or the R7 case with no observation is reported as a **named coverage gap**, never
as covered "by the argument". The certificate's verdict is: 0 violations on the certified runs, with the observed
coverage of each named case.

### Economics per cell and `W` (on today's call profiles; window profiles reported apart)

| Quantity | Definition | Kind |
|---|---|---|
| shares | certified, `scap0`, `scap1`, `over` among the call profiles | Measured |
| violations | certified results that differ from canonical (must be 0) | Measured |
| useful ratings lost | canonical complete, in band and AR1-eligible profiles that are screen-capped at `W`, over all such profiles | Measured |
| misdirection | screen-capped profiles whose canonical side is below the band (P3 reads them as "too few clues": the wrong direction), and in band (lost), over all screen-capped | Measured |
| cost ratio | Σ screen ms / Σ canonical ms over the call profiles | Derived |
| net ratio | (Σ screen ms + Σ canonical ms of the lost useful ratings, re-rated once) / Σ canonical ms | Derived |
| P2 saving on today's mix | 1 / net ratio (assumes today's probe mix; PM3 measures the real one) | Derived |
| main work ≤ `W` | share of the complete canonical profiles, and of the in-band eligible ones | Measured |
| first solution | `summarize` of work to the first solution, main work, count tail and census work over the complete canonical profiles | Measured |
| start-count capped share | among the first four call profiles at the start count, the share canonically capped | Measured (R29 cross-check) |
| censored calls | calls cut at the deadline and the profiles they contributed | Measured |

### `pm4.mjs`

```text
node tools\ig-proto\pm4.mjs calls --shard <name> --cases <id>[,<id>...] --label <L> [--run-id <id>]
node tools\ig-proto\pm4.mjs screens --shard <name> --cases <id>[,<id>...] --label <L> [--run-id <id>]
node tools\ig-proto\pm4.mjs report --label <L> [--run-id <id>]
```

- **Runs.** `--run-id` (default `main`) names an immutable run whose manifest is fixed in `pm4.mjs`: `main` = the six
  cells above × four sets × the three fixed `W` plus the boundary probes; `dry` = `10x10-nightmare` × one set. The
  first invocation of a run writes `tests/artifacts/ig-proto/<L>/IGP-02/<run-id>/run.json` (the manifest, `treeId`,
  harness hash); every invocation checks that file against the manifest, the tree and the harness, and exits 1 on a
  difference. The dry run never shares files with `main`.
- **Shards.** `--cases` selects part of the run's cells and must be a subset of its manifest. A shard is a stable name
  with an immutable cell list: its state file `<run-id>/calls-<shard>-state.json` (or `screens-<shard>-state.json`)
  records the list at its first invocation, and a later invocation of that shard with another list exits 1. A cell
  belongs to one `calls` shard only (a cell claimed by another shard exits 1). Per-cell outputs live under
  `<run-id>/<case>/`, so no shard overwrites another's files or state.
- `calls`: four lanes on `instr`; one `call` job per set (with the window), dispatched in the fixed order (cell, set)
  with the lanes' admission and supervisor; writes `<case>/calls.json` (sets with `boardRows`, `pieces`, `witness`,
  `attempt`, `K`, `area`, `offeredInSource`; profiles with `idx` and the canonical record; call outcome or `censored`)
  and its shard's state (`done` when every set of the shard's cells has a recorded call).
- `screens`: requires every `calls` shard holding its cells to be done; the job list in a fixed order (cell, set,
  profile, then the three fixed `W` ascending, then the boundary values), four lanes, `rate` jobs admitted by their
  bound, a checkpoint `<case>/screens.checkpoint.jsonl` (one line per finished job, keyed by set, profile and `W`,
  header with `treeId` and harness hash); its shard's state with `done` when every job of its cells is recorded.
- `report`: unlocked; requires every manifest cell to be covered by exactly one done `calls` shard and one done
  `screens` shard; reads the per-cell artifacts (the union of the shards, states untouched) and writes the records
  below; exits 1 when a violation exists (after writing).

## Files to create/modify

| File | Change |
|---|---|
| `tools/ig-proto/pm4.mjs` | new |
| `tools/ig-proto/plans/IGP-02.json` | new |
| `tools/ig-proto/README.md` | one section (PM4) |
| `docs/improve-generating/evidence/provisional/IGP-02/` | new: `pm4.json`, `pm4.md`, `profiles-<case>.jsonl` |

## Implementation steps

1. `pm4.mjs` on IGP-00's lanes and calls; the dry run on `10x10-nightmare` with one set (run id `dry`, shard `all`).
2. The run plan; the report; `npm run check`; the firewall check.

## Commands

The run plan `tools/ig-proto/plans/IGP-02.json` (allocation 23 minutes; the runner adds `--label` and
`--source-label`):

| Step | Locked | Node arguments | projectS | State |
|---|---|---|---:|---|
| firewall-snapshot | no | `tools/ig-proto/firewall.mjs snapshot --task IGP-02` | | |
| tree | no | `tools/ig-proto/lib/tree.mjs build instr` | | |
| dry | yes, until done | `tools/ig-proto/pm4.mjs calls --run-id dry --shard all --cases 10x10-nightmare` | 90 | `IGP-02/dry/calls-all-state.json` |
| calls-small | yes, until done | `tools/ig-proto/pm4.mjs calls --shard small --cases 10x10-nightmare,12x12-nightmare,26x26-nightmare` | 330 | `IGP-02/main/calls-small-state.json` |
| calls-14x14, calls-15x15b10, calls-hell1 | yes, until done | `tools/ig-proto/pm4.mjs calls --shard <14x14, 15x15b10, hell1> --cases <14x14-nightmare, 15x15b10-nightmare, 26x26-hell-1>` | 330 | `IGP-02/main/calls-<shard>-state.json` |
| screens | yes, until done | `tools/ig-proto/pm4.mjs screens --shard all --cases 10x10-nightmare,12x12-nightmare,14x14-nightmare,15x15b10-nightmare,26x26-nightmare,26x26-hell-1` | 330 | `IGP-02/main/screens-all-state.json` |
| report | no | `tools/ig-proto/pm4.mjs report` | | |
| firewall-check | no | `tools/ig-proto/firewall.mjs check --task IGP-02` | | |

```powershell
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-02.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1"
if ($LASTEXITCODE -ne 0) { throw "IGP-02 run plan stopped: exit $LASTEXITCODE" }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

`calls-small` holds twelve calls on four lanes (about 90 s); a Hell 1 26x26 call can make 64 profiles at up to about
2.4 s each, so its cell has an invocation of its own, and a call still running at the deadline is recorded censored.
Projection: calls about 330 s of node time, screens and boundary probes about 600 s (about 160 profiles per cell, three
fixed screens each, three boundary screens for the complete ones), dry run about 30 s; eight or nine locked commands,
budgeted as nine.

## Record formats

- `pm4.json`: `{ meta, W: [95000000, 190000000, 380000000], certificate: { argument, violations, coverage: { certified,
  over, scap1, scap0, r7Cut, gaps: [...] } }, cells: { '<case>': { level, band, sets: [{ seed, attempt, K, area,
  offeredInSource, callResult, callProfiles, windowProfiles, censored }], canonical: { n, capped, complete, inBand,
  inBandEligible }, perW: { '<W>': { counts, violations, overEqualCanonical, scap1EqualCanonical, usefulLost: { n, of,
  share }, misdirected: { below, inBand, share }, cost: { canonicalMs, screenMs, lostCanonicalMs, ratio, netRatio, saving
  }, mainLeW: { complete, inBandEligible } } }, boundary: { runs, classes, r7Cut }, firstSolution: { workFirst, mainWork,
  countTail, censusWork }, startCountCappedShare, censoredCalls } } }`.
- `profiles-<case>.jsonl`: one line per profile: `{ set, order, source: 'call' | 'window', count, idx, canonical: {
  ... }, screens: { '<W>': { class, mainWork, r7Cut, ms, equalCanonical } }, boundary: [{ W, kind, class, equalCanonical
  }] }`.
- `pm4.md`: the banner; the certificate verdict ("0 violations on N certified runs" or the failing profiles) with the
  observed coverage of each named case and its gaps; per cell a table with one row per `W` (shares, useful lost,
  misdirection, cost and net ratio, saving); the first-solution percentiles; the notes (today's mix, not the
  prototype's).

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| IGP-02-B01 | The certificate is checked on real profiles of six cells and holds with 0 violations, or the task stops with the failing profiles; for each named case (overshoot stops, caps after the first solution, R7's early NONE) the observed runs are counted, and a case not observed is a named gap | `pm4.md` |
| IGP-02-B02 | For 95, 190 and 380 M: the useful ratings lost, the misdirections and the cost on today's profile mix are given per cell, so that IG-P-Q09's fit has its inputs | `pm4.md` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| IGP-02-T01 | Screens change only `DEDUCE.work`; the canonical records carry work and nodes to the first solution, the count tail, the census apart, the stop and the R7 cuts | code review; `profiles-<case>.jsonl` |
| IGP-02-T02 | Corpus as specified: six cells, four sets each, every call profile (censored calls included) and twelve window subsets per set; boundary probes for every complete profile with a known first solution; jobs in a fixed order; results in job order | `pm4.json`; code review |
| IGP-02-T03 | Every locked invocation stayed within its horizon and is in `invocations.jsonl`; `screens` resumed from its checkpoint; every shard kept its own immutable cell list and state, and the report covers each manifest cell exactly once; the dry run kept its own run id | runner log; `pm4.json` |
| IGP-02-T04 | Records follow the check-list §3; `npm run check` and the firewall check pass | command output |

## Test plan

The dry run before the plan. The report's consistency checks: every profile has its three fixed screen results; a
`certified` class implies main work ≤ `W`; a canonical capped profile is never `certified`; a boundary screen is never
`certified`; every manifest cell comes from exactly one `calls` shard, and each shard's state still holds the cell list
of its first invocation. The shard and run checks run before any lane starts (code review).

## Definition of done & handoff

- The reply gives the certificate verdict and its coverage and gaps, the per-cell table at each `W`, the counted machine
  time and the lock waits.
- Handoff: to IGP-03 the per-`W` losses (with IGP-01's and IGP-03's runs they give R16); to IGP-07 `pm4.json`.

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
