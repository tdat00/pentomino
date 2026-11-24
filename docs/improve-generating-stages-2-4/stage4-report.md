# T16: the stage-4 report and phase 0's decision (N-V4-06)

Status: **jointly signed report: drafted by SA-Opus, reviewed and accepted by SA-Astra, who wrote section 4 (N-V4-17);
her review (`evidence/sa-astra/t16-review.md`, T16-R1 to T16-R5) is applied; both SAs signed (section 11)**. Date
2026-11-24, corrected 2026-11-25. Base `02ade1e` (S07 committed, then S06's log note corrected). Every reading below
is an unlocked read of records and used no machine minute. A ruling here is a joint SA decision under the owner's
delegation (2026-11-23 15:29, Discord message 1574341211701907457). [V] marks a figure read or recomputed from the
records; [A] marks an assumption or a judgement.

## Summary

1. `Phase 0: FAIL (control 26x26-nightmare: fail)`, in the final record `V4-S4F` (purpose final; 1,500 rows, 0 missing) [V].
2. The other applicable gates pass: B1 (the five failing boards 20 of 20, no dead end), B2's nine controls and all 16 Master
   identities, B3, B4 and B6 (871.2 of 1,725 counted minutes); B5 is reported. No response exceeds 120 s (760
   new-deadline and 80 legacy rows) [V].
3. P5: no false stop on 19 cells; 2 lost completions on 14x14 Hell 1 (not a candidate), both cut by the 115-s stop.
   N-V4-16, N-V4-17: every mechanism matches the freeze; the bound, (c4), the close and the re-ratings never ran [V].
4. 26x26 Nightmare: point estimates near parity (1.0006), lower bound 0.8864. The uncapped twin repeats the slow-seed
   pattern and has an information-only lower bound of 0.8987, still below 0.9; neither establishes non-inferiority [V].
5. **The owner's decision:** the SAs recommend (a), today's search kept on 26x26 Nightmare (a legacy route) as the scope
   of a later phase-2 pack with its own gates. The FAIL stays recorded; phase 2 stays blocked until he decides [A].

## 1. The verdicts (step 1) [V]

**The record:**
- `docs/improve-generating/evidence/frozen/V4-S4F/verdicts.json` and `.md`, purpose `final`.
- Five arms, 99 runs files, 19 comparator cells and 380 matched request pairs.
- The initial collection declares 1,120 rows (`collection.declared`); `V4-S4C` declares another 380. All 1,500
  are published, with 0 missing.
- The selection passes with no arm changed. The seven prerequisites pass: stage 1, the live deadline, the four `V4-S4P`
  parity bindings, and P-0's binding.
- `t16-verdicts.mjs` restates it.

The phase-0 line, verbatim: `Phase 0: FAIL (control 26x26-nightmare: fail)`.

### 1.1 The classes (B3)

Rule (c5) ships the screen arm `fr-frozen` only for an admitted class. Every other class ships `fr-frozen-none`: the
frozen search without a screen, with the prior, the per-set prior on Hell 1, P5's limits and the deadline.

| Class | Cells | Verdict (deciding condition) | Screen over no screen: geometric mean / lower bound | Work per accepted puzzle, G units: screen [lo, hi] against no screen [lo, hi] | Ships |
|---|---|---|---|---|---|
| `n-small` | 3x29, 10x10, 12x12 | failed (faster) | 0.9981 / 0.9953 | [1.41, 1.91] against [1.41, 1.90] | `fr-frozen-none` |
| `n-mid` | 14x14, 15x15b10, 16x16 | **admitted** (faster and work pass) | 2.3007 / 2.168 | [1.04, 2.35] below [2.67, 4.36] | `fr-frozen` |
| `n-upper` | 15x20, 18x18 | inconclusive (work unknown) | 1.7905 / 1.6836 | [0.83, 4.72] overlaps [1.63, 5.91] | `fr-frozen-none` |
| `n-large` | 18x20, 20x20, 20x21, 32x15, 22x22, 24x24, 26x26 | inconclusive (work unknown) | 1.5867 / 1.5415 | [0.90, 24.38] overlaps [1.42, 26.69] | `fr-frozen-none` |
| `hell-1` | 14x14, 20x20, 24x24, 26x26 Hell 1 | failed (faster) | 0.9986 / 0.9959 | [5.33, 25.89] against [5.33, 26.23] | `fr-frozen-none` |

- The clue condition passes on every class (median difference 0; `moved2` 0).
- The screen arm passes its cell gates on every cell.
- `n-small` and `hell-1` have no screen in the freeze, so both arms run the same search there, and "failed" is the
  expected outcome.
- `n-upper` and `n-large` are 1.79 and 1.59 times faster with the screen. The work condition cannot be decided there,
  because the work intervals overlap (N-V4-14).

### 1.2 The five failing Nightmare boards (B1): pass

| Board | Class | Ships | Reached ten | Dead ends | Responses above 120 s | p95 (s) |
|---|---|---|---|---:|---:|---:|
| 12x12 | `n-small` | `fr-frozen-none` | 20 of 20 | 0 | 0 | 37.4 |
| 14x14 | `n-mid` | `fr-frozen` | 20 of 20 | 0 | 0 | 12.0 |
| 15x15b10 | `n-mid` | `fr-frozen` | 20 of 20 | 0 | 0 | 22.3 |
| 16x16 | `n-mid` | `fr-frozen` | 20 of 20 | 0 | 0 | 13.8 |
| 15x20 | `n-upper` | `fr-frozen-none` | 20 of 20 | 0 | 0 | 22.4 |

### 1.3 The controls and the Master boards (B2): one failure

The ratio is today's capped T10 (`log-link`) over the shipped arm's, so above 1 the new search is faster. Each control
ships `fr-frozen-none` and reached ten on 20 of 20 requests, with no response above 120 s.

| Control | Class | Geometric mean | Lower bound | p95 shipped (s) | Gate |
|---|---|---:|---:|---:|---|
| 3x29 | `n-small` | 1.0592 | 0.9473 | 6.4 | pass |
| 10x10 | `n-small` | 1.5221 | 1.3173 | 29.7 | pass |
| 18x18 | `n-upper` | 2.0012 | 1.6984 | 29.8 | pass |
| 18x20 | `n-large` | 1.6591 | 1.4374 | 34.4 | pass |
| 20x20 | `n-large` | 2.0889 | 1.7330 | 24.2 | pass |
| 20x21 | `n-large` | 1.5840 | 1.3793 | 25.3 | pass |
| 32x15 | `n-large` | 1.0540 | 0.9127 | 25.6 | pass |
| 22x22 | `n-large` | 1.1554 | 1.0388 | 19.2 | pass |
| 24x24 | `n-large` | 1.2434 | 1.1271 | 23.9 | pass |
| **26x26** | `n-large` | **1.0006** | **0.8864** | 26.2 | **fail**: "no regression: the lower bound 0.886429539656821 is below 0.9" |

**The Master boards:**
- All 16 pass the five-seed identity check (reps 20 to 24).
- 10x10 Master serves 4 puzzles on rep 24 on both arms (`layouts-not-found`, as today).
- Their timing is reported, not gated. The geometric mean of today over after runs from 0.9329 (18x18 Master; median
  2.1 s today, 2.4 s after) to 1.0683 (32x15 Master), and every median is within 0.3 s of today's
  (`t16-verdicts.md`).

### 1.4 Hell 1, the population and P5 (B5)

**Hell 1** is reported, never gated. Hell 1 ships `fr-frozen-none`.

| Board | Requests (valid) | Reached ten | Candidate | Uncapped twin reached ten |
|---|---|---:|---|---:|
| 20x20 Hell 1 | 20 (20) | 20 | yes | 20 |
| 24x24 Hell 1 | 20 (20) | 20 | yes | 20 |
| 26x26 Hell 1 | 20 (20) | 20 | yes | 20 |
| 14x14 Hell 1 | 20 (20) | 10 | no | 12 |

14x14 Hell 1 fell as the plan's risk table (§7) and T11's projection foresaw. The three candidates stay candidates;
their offers stay behind phase 3's gates.

**The population, two-sided, on the ten controls** (shipped arm minus today's; reported, not gated; `t16-verdicts.md`):
- The median clue share is higher on the shipped arm on 9 of the 10 controls (+0.0053 to +0.0439) and equal on 26x26.
  The largest clue shares are higher too: for example 0.4286 against 0.2857 on 20x20.
- The median score position (where the score sits in the band) is higher on 2 controls, equal on 5 and lower on 3, at
  most 0.083 apart.
- The census-estimated share of scores is lower on 9 controls (by up to 0.131) and higher on 32x15 (+0.005).
- Reached ten: the shipped arm 20 of 20 on all ten controls; today's arm 18 of 20 on 18x18 and 19 of 20 on 18x20 and
  20x21.
- The failing boards and Hell 1 have no today's arm in this round (S4-6 was skipped at S05), so no comparison to a
  legacy baseline is available there. Their measured screen, no-screen and declared uncapped populations are
  listed side by side per cell in `t16-verdicts.md`.

**P5 over the declared pairs** (the arm each cell ships against its uncapped twin, reps 20 to 39):

| Cells | Pairs | False stops | Lost completions | Unknown | Unexpected rows |
|---|---:|---:|---:|---:|---:|
| 18 cells: the five failing Nightmare boards, the ten controls, 20x20, 24x24 and 26x26 Hell 1 | 20 each | 0 | 0 | 0 | 0 |
| 14x14 Hell 1 | 20 | 0 | **2** (reps 26 and 38) | 0 | 0 |

Section 3 shows what cut the two lost completions. The live deadline's 115-s stop cut both. Neither P5's call budget nor
its bound was involved.

## 2. B4: the reserve and the deadline in stage 4 (step 2) [V]

**The frozen values** (`freeze.json`, `deadline-s3-v1`):
- reserve 0.6, so the set stage is capped at 46 s;
- a generation stop at 115 s and a response bound of 120 s;
- a host margin of 1 s.

`t16-deadline.mjs` applies `deadlineViolation(run, { responseBoundMs: 120000 })` (`verdicts.mjs:196`) to every published
row of `V4-S4`'s two bounded arms.

| Arm | Rows (valid) | Above 120 s | Latest response | Stopped at 115 s (`time-limit`) | `set:reserve-cut` | `set:no-window-*` | Other partial | Complete |
|---|---|---:|---|---:|---:|---:|---|---:|
| `fr-frozen` | 460 (460) | 0 | 115.2 s (14x14 Hell 1, rep 38) | 9 | 1 | 0 | 1: 10x10 Master rep 24, `layouts-not-found` (as today) | 449 |
| `fr-frozen-none` | 380 (380) | 0 | 115.2 s (the same row) | 9 | 1 | 0 | 0 | 370 |

Of these 840 rows, 760 use the frozen v4 deadline. The other 80 are `fr-frozen`'s unchanged legacy Master rows,
included as context rather than evidence of the new deadline's implementation.

**Where the deadline acted:**
- **The 115-s stop.** Its nine rows on each arm are all 14x14 Hell 1, reps 21, 26, 27, 30, 31, 34, 36, 37 and 38. They
  returned 1, 7, 4, 2, 5, 8, 1, 4 and 9 puzzles at 115.0 to 115.2 s.
- **The reserve cut.** It fired once on each arm, on 14x14 Hell 1 rep 33: the response came at 46.0 s with no puzzle.
  The uncapped twin's set stage took 52.0 s, and the twin ended with 5 puzzles at 167.1 s. That is not a lost completion.
- **V4-LIVE, the deadline on real rows.** The receipt `live-deadline` passes: 10 rows, responses 5.6 to 41.2 s, set
  stages at most 18.1 s, and coverage 25 of 25. The binding `live-deadline` for `fr-frozen` and `fr-frozen-none` was
  accepted by `V4-LIVE`.

**B4 passes.** The reserve and the deadline are frozen and proved on real rows, and no stage-4 response exceeded the
bound.

## 3. N-V4-16: P5's bound and glue on real requests (step 3) [V]

**How the set stage runs:**
- It starts attempts 0 to 3 in parallel, and the lowest successful attempt wins (`generation-client.js`).
- The bound fires when attempts 0 to 3 all end without a window on the same side (`igSetBound`, variant `v4-p5`). The
  row then ends `set:no-window-<side>`.

`t16-p5.mjs` reads every raw journal of `V4-S4`'s bounded arms and, for information, of `V4-S4C`'s uncapped twins.

| Task, arm | Requests | Set calls | In band | `below-to-one` | `above-to-max` | Budget stop | No end line | Bound condition met | `set:no-window-*` rows | Glue mismatches | Budget stops, any call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `V4-S4` `fr-frozen` | 460 | 1,836 | 954 | 0 | 0 | 0 | 882 | 0 | 0 | 0 | 0 |
| `V4-S4` `fr-frozen-none` | 380 | 1,517 | 784 | 0 | 0 | 0 | 733 | 0 | 0 | 0 | 0 |
| `V4-S4C` `fr-frozen-uncapped` | 60 | 240 | 119 | 0 | 0 | 0 | 121 | 0 | 0 | n/a | 0 |
| `V4-S4C` `fr-frozen-none-uncapped` | 320 | 1,277 | 674 | 0 | 0 | 0 | 603 | 0 | 0 | n/a | 0 |

"No end line" means the attempt was still running when the set stage resolved, and it was cancelled
(`worker-end-request` in the row's link journal).

**What this shows:**
- **The bound never fired.** No set call of the frozen arms ended without a window, so no request met the bound's
  condition, no row ended `set:no-window-*`, and the glue had nothing to carry. Stage 2 saw the same.
- **Controlled coverage, not a natural firing.** T08c's `fr-frozen-nowindow-test` uses real workers with synthetic
  ratings to exercise the bound's transport; T07b also uses scripted pools. These tests cover the implementation
  under controlled inputs. Stages 2 and 4 provide no observed natural no-window firing.
- **The 0 false stops are vacuous for the bound.** P5's 0 false stops on the 19 cells do not test it.
- **The only call without a window was a batch call**, which the bound does not cover: 3x29 Nightmare rep 21,
  `below-to-one`. The same call did the same on all three frozen arms that ran that seed.
- **No recorded budget stop.** The largest recorded completed-primitive call-work prefix is 8.39 G against the
  10 G `any` budget on Nightmare (18x18, `fr-frozen-none` and its twin) and 23.08 G against 40 G on Hell 1
  (14x14 Hell 1, all three arms). Both maxima are ended calls. For terminated calls an unfinished primitive's
  consumed work is not known exactly; these maxima are not upper bounds on all consumed work or future calls.
- **`require` (N-V4-21).** Every stage-4 case is `any` (`data/boards-v1.json`, 35 cells), so no `require` call ran.
  P5's `require` budgets (32 G Nightmare, 40 G Hell 1) are unmeasured on validation rows; this is N-V4-15's question in
  the production pack.

**P5's lost completions (14x14 Hell 1):**

| Rep | `fr-frozen-none` (bounded) | `fr-frozen-none-uncapped` | What cut the bounded row |
|---:|---|---|---|
| 26 | 7 puzzles, `time-limit` at 115.1 s (set stage 22.8 s) | ten at 129.4 s (response 129.5 s; set stage 23.0 s) | the 115-s stop; the twin's tenth puzzle came after the 120-s response bound |
| 38 | 9 puzzles, `time-limit` at 115.2 s (set stage 7.2 s; ninth puzzle at 106.6 s) | ten at 119.8 s (response 119.9 s) | the 115-s stop |

Neither row had a budget stop, and the twin runs without the live deadline, under today's two separate timers. Both
losses are the price of the one deadline (D-S24-04, IG-P-D1): the stop at 115 s keeps every response within 120 s. That
price fell on the one Hell 1 board that is not a candidate.

## 4. N-V4-17: the mechanisms' reach on the frozen arms (step 4; SA-Astra) [V]

**The source.** SA-Astra's `t16-reach.mjs` read every raw journal and published row of `V4-S4` and `V4-S4C`:
- 99 arm and cell groups and 1,500 valid rows;
- 1,140 rows on the frozen v4 path, each with a complete work ledger;
- 360 rows on the legacy path: `fr-frozen`'s Master rows and every `log-link` row;
- 30,725 calls and 12,190 input files.

Its outputs are `docs/improve-generating-stages-2-4/evidence/sa-astra/t16-reach.json` and `.md`; the `.md` has all 99
per-cell tables. The table below is its per-arm summary.

| Task, arm | Cells / rows | v4 / legacy calls | Ended / terminated / unclosed | `close` / `c4` | Rescue / tail re-ratings started | Recorded `W` (calls) | `W` / table / per-set mismatches |
|---|---|---|---|---|---|---|---|
| `V4-S4` `fr-frozen` | 35 / 460 | 7,530 / 1,788 | 7,102 / 2,216 / 0 | 0 / 0 | 0 / 0 | 190 M 4,689; 760 M 2,841; canonical (`null`) 1,788 | 0 / 0 / 0 |
| `V4-S4` `fr-frozen-none` | 19 / 380 | 7,852 / 0 | 5,999 / 1,853 / 0 | 0 / 0 | 0 / 0 | 760 M 7,852 | 0 / 0 / 0 |
| `V4-S4C` `fr-frozen-uncapped` | 3 / 60 | 1,198 / 0 | 896 / 302 / 0 | 0 / 0 | 0 / 0 | 190 M 1,198 | 0 / 0 / 0 |
| `V4-S4C` `fr-frozen-none-uncapped` | 16 / 320 | 6,640 / 0 | 5,089 / 1,551 / 0 | 0 / 0 | 0 / 0 | 760 M 6,640 | 0 / 0 / 0 |
| `V4-S4` `log-link` (today, context) | 26 / 280 | 0 / 5,717 | 4,384 / 1,333 / 0 | 0 / 0 | 0 / 0 | canonical (`null`) 5,717 | 0 / 0 / 0 |

**What each mechanism did:**
- **(c4) and the bracket close** are off in the freeze and were never reached. No call has `locate.close` or
  `locate.c4`, and no journal has a close or (c4) phase marker.
- **The screen width `W`.** All 30,725 starts carry the freeze's value:
  - 190 M on the screen arms' Nightmare boards of 196-324 and 360+ cells;
  - `DEDUCE.work` (760 M) elsewhere and on every no-screen arm;
  - on the legacy path, `null`, the canonical sentinel (7,505 calls).

  The check is against the frozen table, not against the classes' later shipped arms.
- **The table prior.** 19,190 starts were checked against `prior-s3-v1`, with 0 mismatches. It moved the start count
  away from the legacy start on 10,046 of them.
- **The per-set prior on Hell 1:**
  - 4,030 batch starts were checked against the winning set's matching calibration, with 0 mismatches;
  - 2,660 of them differ from the table;
  - no batch fell back to the table, and none is unattributed;
  - the two Hell 1 rows without a batch are 14x14 Hell 1 rep 33 on the two bounded arms, the reserve cut of section 2.
- **Rescue and tail re-rating** are configured (rescue, at most 4 re-ratings) but were never exercised. No call entered
  either phase, and the starts, the completed profiles and the end counters are all zero, with no budget-blocked
  attempt. So these rows claim no benefit for re-rating and no correctness of its path.
- **Findings: none.** There is no `W` or prior mismatch, no unattributed batch, no disabled mechanism reached and no
  invalid evidence.
- **Limits (SA-Astra).** The rows do not store their made records or packs, so this shows request-to-worker transport,
  not stored-recipe or replay proof. Reach is not a causal attribution of speed.

## 5. B6 and the round's account (step 5) [V]

`t16-account.mjs` reads every frozen-round plan's invocation log
(`tests/artifacts/ig-proto/frozen/<task>/invocations.jsonl`). The approvals and caps are the lines S01 to S07's
execution logs re-read.

| Plan | Approval (time, +07:00) | First invocation | Invocations (steps) | Counted s | Guard asked (s) | Cap on the account (min) | Account after (min) |
|---|---|---|---|---:|---:|---:|---:|
| `V4-S2B` | D-S24-26 (2026-11-23) | 11-24 00:13:55 | 8 (8) | 833.444 | 1,694.624 | 201 | 186.2 |
| `V4-P7` | D-S24-28 (2026-11-23) | 11-24 04:26:18 | 3 (3) | 801.167 | 1,162.172 | 206 | 199.6 |
| `V4-S3P` | D-S24-27 and Q-S03 (a), 07:41:32 | 07:42:23 | 8 (8) | 2,298.808 | 10,416.597 | 374 | 237.9 |
| `V4-LIVE` | Q-S04 (a), 10:09:39 | 10:10:39 | 2 (2) | 284.917 | 2,634.330 | 282 | 242.6 |
| `V4-S4` | Q-S06 (a), grant raised to 1,725, 11:16:58 | 11:18:25 | 94 (84) | 28,043.391 | 88,911.486 | 1,725 | 710.0 |
| `V4-S4C` | Q-S07 (a), measurement only, 20:04:31 | 20:05:51 | 23 (19) | 9,670.158 | 43,921.283 | 1,443 | 871.2 |

**Every run stayed inside its approval:**
- All 207 logged invocations have exit 0, `killed` false and a `go` decision, and every task stayed within its
  lock cap (`taskCapS`). This excludes the earlier externally killed `V4-S2` invocation, whose 87.4 s are
  accounted separately off-log under the ruling of 2026-11-23.
- Every plan of this pack stayed within its guard, its account stayed within its cap, and its approval came before its
  first invocation.
- No plan of this pack stopped, so none needed a ruling.

**The round's account:**
- The v4 pack's tasks (IGP-02, V4-T04, V4-T05, V4-T06, V4-T10a-c, V4-S2) logged 10,252.712 s in 69 invocations.
- V4-S2's externally killed `parity-fr-base` invocation contributes 87.4 s off-log; it was archived and reobserved
  under the ruling of 2026-11-23 (the check-list's register).
- **Final account: 52,184.597 s logged + 87.4 s off-log = 52,271.997 s = 871.2 of the 1,725 counted minutes granted.**

**B6 passes.**

S06's execution log was corrected at `02ade1e`: eight steps took more than one invocation, six taking two and the
two 14x14 Hell 1 steps taking three. The records and the corrected log agree on 94 invocations for 84 locked steps.

## 6. Findings and the joint SA decisions

| ID | Finding | Joint decision under the owner's delegation [A] |
|---|---|---|
| F1 | The control 26x26 Nightmare fails no-regression (section 7) | not the SAs': it changes phase 2's scope, so it goes to the owner with the options and the recommendation of section 7 |
| F2 | N-V4-16: no observed natural set call ended without a window, so the bound and glue were unexercised in stages 2 and 4 | no change to the frozen values. N-V4-16 stays open for the phase-2 pack: retain the real-worker test with synthetic ratings and report natural bound-condition matches, firings and `set:no-window-*` rows per cell. If none occur, report the path as still unexercised; do not turn zero firings into a real-data pass |
| F3 | 14x14 Hell 1: two lost completions and one reserve cut, all from the one deadline | by design (D-S24-04, IG-P-D1); no change. The board stays a non-candidate, as foreseen |
| F4 | No recorded call-budget stop; the largest completed-primitive call-work prefix on Nightmare is 8.39 G, about 84% of its 10 G `any` budget (18x18); unfinished-primitive work is not exact | no change (the values are frozen and no class is refitted on validation seeds). Phase 2's validation reports budget stops per cell; N-V4-15 measures `require` on the largest boards first |
| F5 | The population: the shipped arm's puzzles carry slightly more clues at the median on 9 of 10 controls | reported, not gated. It goes to phase 2's population report and phase 3's blind play comparison (N-V4-09) |
| F6 | No `require` call ran in stage 4 (N-V4-21) | no change; N-V4-15 in the production pack, as planned |
| F7 | N-V4-17 (section 4): every start's `W`, table prior and Hell 1 per-set prior matches the freeze, with 0 mismatches; (c4) and the close never ran; rescue and tail re-rating never ran either | no change. Re-rating has controlled test coverage, but its path on real requests is unobserved here; no real-row correctness or benefit is inferred from zero reach. Phase 2's validation reports re-rating reach per cell, including zero if it remains unexercised |

## 7. Phase 0's decision for the owner (N-V4-06)

**Phase 0: FAIL**, on the single item `control 26x26-nightmare`. The other applicable gates pass; B5's outcomes
are reported. Ruling R-P24-19 keeps the original FAIL; it is not recomputed on a reduced control set. Phase 2
stays blocked until the 26x26 decision is recorded and its gates are specified. Phase 1 needs its own checks,
not phase 0's gate (plan v4 section 6).

### 7.1 26x26 Nightmare, re-read with the final record and P5 [V]

`t16-cell26.mjs` uses the harness's recipe: `cappedT10` and `noRegression`, quantity 10, cap 120 s, 10,000 resamples,
seed 20261116, reps 20 to 39. It reproduces the recorded control exactly: 1.0006 / 0.8864.

**What P5 and the deadline did on this board:**
- **The pair.** 20 pairs: 0 false stops, 0 lost completions, 0 unknown.
- **The uncapped twin**, which disables the call-budget threshold, bound and live deadline, is close to the shipped
  arm on these seeds. Its capped T10 divided by the shipped arm's ranges from 0.9475 to 1.0082, with geometric mean
  0.9857. Equivalently, the bounded run is 1.45% longer at the geometric mean, at most 5.54% longer on a seed. This
  is the observed configuration difference, not isolated P5 overhead: timing can vary between runs, and the twin
  retains the metering and budget-check code.
- **The same slow seeds** appear on the twin:
  - rep 21: 39.0 s against 14.0 s today; its set stage took 25.6 s, against 2.4 s;
  - rep 28: 16.5 s against 9.1 s;
  - rep 37: 18.7 s against 11.2 s.
- **Information only, never a verdict:** today over the twin is 1.0151 with a lower bound of 0.8987, also below 0.9.
  The screen arm `fr-frozen` gives 1.4666 / 1.293 against today. `n-large` does not ship the screen, because its work
  condition is undecided (N-V4-14).

**Reading [A]:**
- **Removing the thresholds did not establish non-inferiority.** The information-only lower bound remains 0.8987.
  No call-budget stop, set bound, reserve cut or generation stop acted on these 20 bounded requests. The diagnostic
  does not support changing the frozen limits as a remedy, and it does not replace the original control gate.
- **The slow-seed pattern repeats, and rep 21 has direct work evidence.** Its first set attempt has 13 completed
  rating profiles and 5,606,363,111 work units on both the bounded arm and twin, against two profiles and
  522,672,460 units today. This is extra observed search work, not merely a clock difference. It does not exclude
  all timing variation or isolate the cost of each mechanism. Source: SA-Astra's `t16-review-checks.json`,
  `cell26.rep21SetCall` (the raw paths and hashes are indexed there).
- **These data do not establish a speed gain on 26x26 Nightmare.** The point estimates are near parity: median
  15.8 s against 15.5 s today, p95 26.2 s against 26.4 s, with several substantially slower seeds.
- **The point estimates do not prove equivalence.** The FAIL stands, as `s06-reading.md` section 3 explains.

### 7.2 The options, re-read [A]

The labels match the owner's question (section 7.3). `s06-reading.md` §4's options (1), (2), (5) and (4) are (a), (b),
(c) and (d) here. Its option (3), N-V4-14, is the last row: a later proposal, not a choice now.

| Option | What it means | Cost | Re-read with the final record and P5 | The SAs' view |
|---|---|---|---|---|
| (a) A legacy route for 26x26 Nightmare | `gen-v4` is proposed for the other boards with the recorded class selections. 26x26 Nightmare keeps today's search, inside the later phase-2 pack. No record or class is reclassified, and the FAIL stays recorded. Scope: that one board at the Nightmare level; 26x26 Hell 1 and 26x26 Master are unchanged. Remaining gates (the phase-2 pack): the route's implementation; compatibility and replay (the route returns today's puzzles for the same effective request, with its own replay case); N-V4-15 measured first; the frozen round's validation repeated on the production code, the controls included | no machine minute now; the phase-2 pack is priced before the owner approves it | still recommended: disabling the thresholds does not establish non-inferiority, and these data establish no speed gain on this board; the exception would preserve today's behaviour without changing the recorded FAIL | **recommended** |
| (b) Commission an independent confirmatory-study plan | propose a new task on fresh seed pairs, with its cohort, error control and stopping rules fixed before results are read; do not silently pool the failed 20. The complete plan and price need separate owner approval before any run | for an illustrative 40 fresh pairs, about 28 counted minutes is a linear row-time proxy from `V4-S4` (412.070 and 415.472 s per 20 rows per arm), excluding the new manifest, proofs and guard; the harness window is closed | it could establish non-inferiority, find a regression or remain inconclusive. The present near-parity estimates and wide spread do not determine its result or prove that a gain is impossible | not recommended now: extra scope and cost, with no established gain on this board in the current data |
| (c) Stop phase 2 | the round's result stays FAIL and `gen-v4` does not go to production; phase 1 continues on its own gates | none | unchanged: the other applicable gates pass, and nine controls are 1.054 to 2.089 times faster | not recommended |
| (d) Waive the 0.9 bound for 26x26 | accept the risk despite non-inferiority not being established; the original FAIL remains recorded | none | unchanged: it changes a pre-registered gate after the result | not recommended |
| Later: admit the screen on `n-large` (N-V4-14) | a new proposal for a tighter proved bound or a relaxed work rule (IG-P-Q37), then a new validation of `n-large` | a later, larger round | the later path to a possible gain on 26x26 (1.47 times today's speed, information only); compatible with (a) as a later improvement | not now (D-S24-18: only if wanted) |

### 7.3 The owner's question (English; the orchestrator translates)

> **Stage 4 is complete. Phase 0's answer: FAIL, on one item only.**
> - The five Nightmare boards that fail today (12x12, 14x14, 15x15b10, 16x16, 15x20) now reach ten on 20 of 20 requests,
>   with no dead end (p95 12 to 37 s).
> - The 16 Master boards give identical puzzles.
> - Nine of the ten Nightmare controls pass the no-regression criterion. Their measured ratios are 1.054 to 2.089, so the
>   new search is up to about twice as fast as today.
> - No response exceeds 120 s: 760 requests exercised the new deadline, and 80 legacy Master requests were also
>   below 120 s. The paired comparison finds no lost completion on 18 of 19 cells. On 14x14 Hell 1, which is not a
>   candidate (10 of 20), the 115-s stop cut two requests whose uncapped twins finished later.
> - **26x26 Nightmare fails the no-regression criterion.** The point estimate is near parity (1.0006; median 15.8 s
>   against 15.5 s today), but the agreed one-sided 90% lower bound is 0.886, below 0.9. The uncapped twin repeats
>   the slow-seed pattern and has an information-only lower bound of 0.899, also below 0.9. It does not change the
>   FAIL or establish non-inferiority, and the comparison does not isolate P5's runtime cost.
>
> Phase 2 (`gen-v4` in production) stays blocked until you decide this item. Phase 1 (P6 and progressive presentation)
> does not depend on it.
>
> **Decision: 26x26 Nightmare.**
> - **(a) Keep today's search on 26x26 Nightmare (recommended).**
>   - `gen-v4` is proposed for the other boards with the recorded class choices. 26x26 Nightmare keeps today's
>     behaviour, where these data establish no speed gain.
>   - The FAIL stays recorded. This approves only the scope of the phase-2 pack.
>   - That pack must implement the route, prove compatibility and replay, measure `require` on the largest boards first
>     (N-V4-15) and repeat the validation on the production code. It comes back to you with its plan and price before
>     anything runs or ships.
>   - Hell 1's offer rules are unchanged.
> - **(b) Commission an independent confirmatory-study plan for 26x26 Nightmare.** It would use fresh seeds, with
>   its rules fixed before results are read. For an illustrative 40 fresh pairs, about 28 counted minutes is a
>   row-time proxy only; the complete plan, proofs and guard must be priced and approved separately before a run.
>   Phase 2 stays blocked pending the study and a recorded decision. The result could establish non-inferiority,
>   find a regression or remain inconclusive. Not recommended now: extra scope and cost, with no established gain
>   on this board in the current data.
> - **(c) Stop phase 2.** `gen-v4` does not go to production; phase 1 proceeds on its own gates. Not recommended:
>   every other applicable gate passes.
> - **(d) Waive the 0.9 bound for 26x26.** Not recommended: it changes an agreed gate after seeing the result.
>   An explicit exception accepts the risk; it neither proves the failure was noise nor changes the recorded FAIL.
>
> Phase 1 is a separate small pack. Tell us if you want it started now.

N-V4-14 (the last row of section 7.2) is a later proposal, not a choice now; section 8 lists it.

## 8. What follows (plan §8.4)

1. **The owner's 26x26 decision** (section 7.3), recorded in the check-list's register. Until then, nothing is
   refitted or waived, and no record changes.
2. **Phase 1** (plan v4 §6; independent of phase 0's gate): P6 (the DLX diagnostic) and progressive presentation in fold
   order (IG-P-D2). P7 has no item, because S02's spike gave no go (N-V4-05 closed). A small pack at the owner's request,
   with its own identity and history checks.
3. **Phase 2, `gen-v4` in production (N-V4-07)**, after the 26x26 decision:
   - the class selections of section 1.1: `n-mid` with the 190 M screen, the others without;
   - P4's table and the per-set prior on Hell 1, with stored identity;
   - P5 with the frozen budgets, the bound of 4 and the one deadline;
   - the 26x26 route that the owner chooses;
   - N-V4-15 measured first;
   - the replay fixture;
   - the frozen round's validation repeated on the production code, the controls included, with the population per cell;
   - N-V4-16's per-cell bound/glue reach report and a reading of any natural firing observed; if none occurs, keep
     its real-data coverage explicitly open (F2);
   - the per-cell rescue and tail re-rating reach report, including unexercised paths (F7).
   Its plan and price go to the owner before it runs.
4. **Phase 3, the offers (N-V4-08)**, after the blind play comparison (N-V4-09):
   - the Hell 1 candidates 20x20, 24x24 and 26x26, and the Nightmare landscape;
   - the browser runs and D39 (OD-P4);
   - IG-P-Q12 for 10x10 and 12x12 Nightmare.
5. **Phase 4 (N-V4-11)**, the optional items.
6. **N-V4-14**, only if the owner wants it (D-S24-18): a tighter proved bound or a relaxed work rule for `n-upper` and
   `n-large`, whose screen was 1.79 and 1.59 times faster in this round. It needs a new proposal and a new validation.
7. **N-V4-01, N-V4-04 and N-V4-10**, when the owner asks.

## 9. Acceptance

| ID | Criterion | Evidence |
|---|---|---|
| T16-B01 | The owner receives phase 0's answer with B1 to B6's evidence and the options for what follows | sections 1 to 3, 5 and 7; the relay of section 7.3 |
| T16-T01 | Every number comes from a cited record or a kept scratch output | section 10 |
| T16-T02 | N-V4-16 and N-V4-17 re-read on the frozen arms (plan §6 T8) | section 3; section 4 (SA-Astra) |
| T16-T03 | No code, plan or run record changed | G1 and G2 print nothing |

**Plan §6 B1 to B6, T7 and T8:**
- B1: pass.
- B2: fail on 26x26 Nightmare only; Master identity passes.
- B3: pass.
- B4: pass.
- B5: reported.
- B6: pass.
- T7: the P-1 passes pass, every declared row is published, the selection is final, `V4-S4C` ran and the final verdict
  is written.
- T8: section 3, and section 4 (SA-Astra).

## 10. Evidence

Each script is unlocked, runs from the repository root, and writes its `.json` and `.md` beside itself, under
`docs/improve-generating-stages-2-4/evidence/sa-opus/` (SA-Astra's under `evidence/sa-astra/`). Each records the hash of
its input index.

| Script | Reads | sha256 of its input index |
|---|---|---|
| `t16-verdicts.mjs` | `V4-S4F/verdicts.json`, its manifest, the 32 Master runs files | `f510334393cfe77e3b3f441ce7995846eb94700fd35c9b3f0a9cd0e85e0998af` (34 files) |
| `t16-deadline.mjs` | `freeze.json`, the 54 bounded runs files of `V4-S4`, the `V4-LIVE` receipt and binding | `662f28b947ce644fe894a2eeabb28f1050c716979580a04cff7e91a4d5aad617` (57 files) |
| `t16-p5.mjs` | the raw journals of `V4-S4` `fr-frozen` (35 shards) and `fr-frozen-none` (19), `V4-S4C` `fr-frozen-uncapped` (3) and `fr-frozen-none-uncapped` (16), with the published rows | published `8fefadc9279bf804fe110e1f0dd82af1296cda43561b3c1bbc532c4a165c7ef4` (77 files); journal shard digests `580832e5...`, `bbf2d8c0...`, `c01d0d79...`, `b699bf5a...` (full in the output) |
| `t16-account.mjs` | the 14 frozen-round `invocations.jsonl` | `c6ded537d93d3b668734acca645b4f8d521dda13a738eb30616d94cdeb9e46ae` |
| `t16-cell26.mjs` | the 26x26 Nightmare rows of `log-link`, `fr-frozen-none`, `fr-frozen` and `fr-frozen-none-uncapped`, the final record and manifest | `05a20de42b3c694e3558aea526cc6edd11b2f82125b36ed75a3dc0c960a3fab8` (6 files) |
| SA-Astra's `t16-reach.mjs` | the raw journals and published rows of `V4-S4` and `V4-S4C` (99 groups, 1,500 rows), `freeze.json` and the variants (section 4) | `733d92fb038c6ce743986a17c5514a1956948adf7abc9d5985204c8769b53f52` (12,190 files; `evidence/sa-astra/t16-reach.json`) |
| SA-Astra's `t16-review-checks.mjs` (her review) | the records above, recomputed; rep 21's first set call on 26x26 Nightmare (`cell26.rep21SetCall`, section 7.1); the 40-pair row-time proxy | `5e75a71c6646347af04170fc9b243154d941ad3500c3964e9fb42a9cbbb15174` (12,309 files; `evidence/sa-astra/t16-review-checks.json`) |

Commands:

```
node docs\improve-generating-stages-2-4\evidence\sa-opus\t16-verdicts.mjs
node docs\improve-generating-stages-2-4\evidence\sa-opus\t16-deadline.mjs
node docs\improve-generating-stages-2-4\evidence\sa-opus\t16-p5.mjs
node docs\improve-generating-stages-2-4\evidence\sa-opus\t16-account.mjs
node docs\improve-generating-stages-2-4\evidence\sa-opus\t16-cell26.mjs
node docs\improve-generating-stages-2-4\evidence\sa-astra\t16-reach.mjs --label frozen
node docs\improve-generating-stages-2-4\evidence\sa-astra\t16-review-checks.mjs --label frozen
```

**The rules this report applies:**
- plan v4 §5.2, §6 and §7;
- this plan §1, §6 (B1 to B6, T7, T8), §7, §8.4 and §9;
- `s06-reading.md` (ruling R-P24-19);
- the check-list's register (D-S24-04, D-S24-18, D-S24-26 to D-S24-28) and S01 to S07's execution logs.

## 11. Sign-off

- SA-Opus (drafter): sections 1 to 3 and 5 to 10, 2026-11-24; SA-Astra's corrections T16-R1 to T16-R5 applied,
  2026-11-25.
- SA-Astra (reviewer; author of section 4): accept, 2026-11-25; T16-R1 to T16-R5 and the stated adaptations verified; F2-F7 agreed; the original FAIL and owner gate remain unchanged.
