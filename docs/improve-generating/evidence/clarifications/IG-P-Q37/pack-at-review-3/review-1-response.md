# improve-generating-v4: response to cross-review 1

| Item | Value |
|---|---|
| Review | [`review-1.md`](review-1.md) (SA-Astra): changes required, 6 blocking, 17 major, 2 minor |
| Response | SA-Opus (pack author), 2026-11-16 |
| Result | 25 accepted (3 of them, RV1-02, RV1-14 and RV1-17, with an equivalent text named below), 0 partly, 0 rejected |
| Questions | none: Q-RV1-01 and Q-RV1-02 are resolved by restoring the plan's contract (option (a) of each), within the pack author's authority |
| Files | [`check-list.md`](check-list.md) rewritten; tasks rewritten or split: T01a, T01b, T02a, T02b, T02c (new), T04a (new), T04b (new), T04c (the former T04b), T07a, T07b, T09a, T09b, T10a, T10b (new), T10c (the former T10b), T11a, T11b; tasks amended: T03, T05, T06, T08, T12, T13; removed: T01, T07, T09, T11 and the former T04a; `docs/improve-generating/plan.md` unchanged (section 9 already states that every contract of section 5.1 holds) |

## Decisions on the two conditional questions

- **Q-RV1-01 (live deadline): option (a).** D-V4-08 now labels the post-hoc table `post-hoc projection; not a live
  deadline gate`; the live one-request deadline, the fitted set-stage reserve and the 120-second backstop in the
  copy's client and host are named item N-V4-13, a prerequisite before any stage-4 validation command; its receipt
  rows are priced in T11b (`live`), and T09b's phase-0 verdict accepts only a live-deadline receipt (a `postHoc` record
  fails the prerequisite, an absent one leaves phase 0 incomplete).
- **Q-RV1-02 (prototype provenance): option (a).** T02c implements, before the stage-1 receipt, the seven-key
  analogue with one experimental algo id per arm (`gen-v4-proto:<variant id>`), `made.igPrior`, the per-algo reader
  (shape, bounds and key set by the record's own `algo`), the comparison with the table versions, and the refusal
  tests with a cancellation callback that fails if work is reached.

## Dispositions

| ID | Disposition | What changed (files, sections) | Note |
|---|---|---|---|
| RV1-01 | accepted | `check-list.md` D-V4-08, §2.3, N-V4-13, N-V4-06; T06 Authority; T09b (`deadlineProjection` labelled, `postHoc` rows, `prerequisite`, `phase0Verdict`); T11a (`live` rows, comparator named); T11b (`live` priced) | R01 applied |
| RV1-02 | accepted | new T02c (edits `pv-1` to `pv-17` of `v4.json`, four cases); `check-list.md` D-V4-04, D-V4-05, D-V4-09; T05 keeps only the value and transport (`ps-1` to `ps-7`); T02b's former provenance case moved to T02c | equivalent text: the experimental-id-to-reader mapping is "`versions.algo` starts with `gen-v4`" and the per-arm id is derived from the tree's `IG.variant`, so an arm cannot inherit another arm's identity |
| RV1-03 | accepted | T02a (`v4Target` = 53 to 111 with the seven test minima; the ordinal bound derived for every set of at most 128 pieces, `MAX_PIECES`, with an assertion beyond); `check-list.md` D-V4-03, D-V4-04, D-V4-13; T07b and T08 wording | R03 text applied |
| RV1-04 | accepted | T02a (copy-only `igRateDetailedWithLimits` appended to `difficulty.js`, edit `v4-3`; the screen keeps the detail of the same measurement; dispatch `v4-2` calls the frozen search directly when a recorder is set); T04a (`v4-select` items count missing details and recheck two recorded ratings against `rateDetailed`); T04b (`parityVerdict` detail conditions; the replay's measuring step); T04c (run) | R04 applied; the checks run only in the approved stage-1 runs |
| RV1-05 | accepted | new T04a (`lib/items.mjs`, kinds `v4-select`, `v4-generate`, `v4-replay` in `lib/lanes.mjs` and `lib/lane-worker.mjs`, reserves 120, 245 and 120 s, cut at `horizonS - 15`, identity, start and end lines, never rerun, interrupted items refused, six synthetic cases); T10a (`v4-kernel`, 90 s), T10b (child-process items with PID cleanup), T10c (custom width items); `check-list.md` D-V4-14; plans reforecast | R05 applied; the 300-second helper limit is unchanged |
| RV1-06 | accepted | new T04b (explicit hashed manifests, 23 parity and 9 replay items, the verdict rules, the PM4 block with identity, completeness, certified runs, gaps and equality, self-test from `results` and `done`, replay proofs per case, `INCOMPLETE` distinct from `STOP`, six pure cases); T11b (`P-1` parity passes and replay proofs for every later arm, `P-0` re-check of the stage-1 arm on the final trees) | R06 applied; work accounting in parity is the journal's rating work (absent and charge) tied to the charged units (charge and record) |
| RV1-07 | accepted | every task that adds a case lists `tools/ig-proto/self-test.mjs`; `check-list.md` §3.1 (counts reported, never oracles; `check-edits` with no error) | — |
| RV1-08 | accepted | T04c step 2 (`$LASTEXITCODE` checks after each `run-task.ps1`; the PM4 gate `v4-check.mjs pm4-gate` before V4-T04); the same check in T05, T06, T10a, T10b, T10c and `check-list.md` §3.2 | — |
| RV1-09 | accepted | T07b (`p5-2` before the ordered winner scan; scripted pools at widths 1, 2, 4 and 8 for a later success, a success inside the bound, mixed sides and the bound off; `lib/fake-pool.mjs` ported from `tests/generation-client.test.js`) | — |
| RV1-10 | accepted | T07a (check before every rating, repairs included, before a repair's first count and before every further count through `onAdd`; the best already finished final by the existing order, no lazy `chooseBest`; overshoot recorded; a `count` journal line per count; the prefix sweep over every category with equal results in every observer mode) | R10 applied |
| RV1-11 | accepted | T02a (`let fam` declared before `step`; phase A assigns it); T08 step 3 | — |
| RV1-12 | accepted | T09a (pairing by identity, invalid and duplicate rows, matched sets per cell, the pooled clue rule, shared resampling with the per-cell floor, the work rule on charged work with coverage, completion, the cell-gate input, `decidedBy`); T09b (shipped arm, cell gates on it, fallback, Hell 1 reported, Master identity, prerequisites, `phase0Verdict`); T07a (the `count` lines that complete the charged work) | R12 applied; the work producer is the journal (`p` tuples' main and census work plus `count` units) |
| RV1-13 | accepted | T09b (`p5Stops`: pairs by identity, false stop when the uncapped row obtained a set, lost completions apart, missing control `unknown`; four cases) | — |
| RV1-14 | accepted | new T11a (the matrix: both twins on every validated Nightmare and Hell 1 cell, controls with today's arm, the comparator, conditional Hell 1 boards, a fresh second-validation cohort 40 to 59 for the boards a prior adoption changes, dedupe by full group key, comparator settings checked; six data-only cases) | equivalent text: one comparator group per validated cell, the uncapped twin of the arm its class ships, run after the class verdicts (lost completions are judged on the shipped arm only) |
| RV1-15 | accepted | T11b (planning-projection label; rows per invocation simulated from the runner's admission; projected, guard and ceiling seconds; bounded items by their reserves; the regression example as a test; dry runs of the emitted plans) | R15 applied; stage 4 runs with a 130-s row limit once the live deadline exists |
| RV1-16 | accepted | T10a 5 min, T10b 4 min, T10c 4 min, each with a dry run; the stage-1 allowance recomputed from the final plans: 73 minutes allocated, 92 requested (`check-list.md` §1, §3.4) | — |
| RV1-17 | accepted | T10a (`counters --cases`, case list in the item identity), T10b (`profile`, `profile-child --case`, child PID recorded, killed at the cut and awaited), T10c (`run --cases --rounds`, the four worker messages, `finally` termination); full plan entries | equivalent text: the profile is its own task (T10b) and the width probe is T10c, so their state paths are `V4-T10b\profile` and `V4-T10c\run` |
| RV1-18 | accepted | T10a (`r4c-1`, `r4c-4`, `r4c-6`, `r4c-9`: a per-piece epoch on every removal and restoration, `dirtyPieces` from the epoch, `countChanged` apart; the pure `epochDirty` case; the invariant `countChanged <= dirtyPieces <= pieces` on real data) | `rowPiece[r]` is used for the row's piece (equal to the last column less `NC`) |
| RV1-19 | accepted | T10a (`v4-kernel` items build the model in both trees and compare the complete `measureDeduction` results right after the second returns; the `--v4` case does the same) | — |
| RV1-20 | accepted | `check-list.md` §3.2 and D-V4-15 (unlocked, locked verification, locked measurement; the dot-sourced helper; sharding beyond 300 s; verification reported apart); every task's command table; the `--items` group keeps synthetic cases unlocked | R20 applied |
| RV1-21 | accepted | T11b (B-1: the frozen `base` tree and the bench page served by `tools/serve.mjs --root tests\artifacts\ig-proto\frozen-source`, no observers, journal or prefetch, a bench-page factor; B-2: the Generator page as a separate item); N-V4-01 | — |
| RV1-22 | accepted | T06 (an await period ends at its consume or the batch end; late completions ignored; `link-10` at `runner.js:628` writes both timeline fields on every run; the second synthetic case: await 30 ms, idle 90 ms) | — |
| RV1-23 | accepted | `check-list.md` D-V4-13 (`v4-p5`, `fr-*`, `v4-link`); §3.1 forbids U+0000 to U+001F other than CR, LF and tab; every pack file scanned: none | — |
| RV1-24 | accepted | T01a (the snapshot is written into an absent folder, its hash manifest is evidence and is verified before every frozen tree; `$LASTEXITCODE` checks), T01b (offers, versions and the catalogue reference from the snapshot); `check-list.md` D-V4-01 (no `--source frozen`) | — |
| RV1-25 | accepted | T12 (the recorded ratings keep the canonical DLX fields, the visible score table is unchanged; `completeDiagnostic` returns a new rating; six files) | — |

## Consequences the orchestrator should know

- **Size.** 23 tasks, 60 developer hours (was 16 tasks, 38 h); every task at most 3 h.
- **Stage-1 allowance.** 92 minutes approved for T04c, T05, T06, T10a, T10b and T10c (73 allocated); the owner's
  first stop point moves to the end of T04b.
- **Expected price at T11b.** With both twins on every validated cell, the comparator and executable invocations (one
  row per invocation at 260 s, two or more at 130 s), stage 4 will price well above the plan's indication of 3.4 to
  4.2 h; T11b's section 8 states the difference and its three causes for the owner's decision.
