# S02: P7's spike report (the timing run `V4-P7`)

Status: **Joint text** (SA-Opus drafter, SA-Astra reviewer), the text of S02 step 7
(`tasks/improve-generating-stages-2-4/S02-run-v4-p7-and-spike-report.md`); SA-Astra's review (`sa-astra/s02-review.md`)
applied on 2026-11-24. Date 2026-11-24. Base `6666666`; the run's records were read uncommitted in the tree. [V] marks
a figure recomputed from the records; [A] an assumption or a judgement.

## Summary

1. All three composites are result-identical to the reference kernel `base`, with complete memory coverage [V]:
   - `p7-c1` (C1, R4 on ordered live-row lists);
   - `p7-c1r5` (C1 and R5 on the lists);
   - `p7-c1r5c5` (C1, R5 and C5, select on the lists).

   They are equal on 149 of 149 quick items and 713 of 713 full items, and on all 90 timed pairs each.
2. **All three are slower than the reference** [V]. Reference over candidate over the 90 timed pairs:

   | Composite | Ratio | Geometric mean |
   |---|---:|---:|
   | `p7-c1` | 0.7293 | 0.7286 |
   | `p7-c1r5` | 0.7449 | 0.7445 |
   | `p7-c1r5c5` | 0.8071 | 0.8126 |

   Every kernel case and every round is below 1, so **none is a go** by D-P24-05 (ratio at least 1.04).
3. **Possible explanation** [V counters and profiles, A interpretation]: maintaining the lists adds work on row kills
   and restorations. A rough reference-counter proxy ranges from 6.7 to 15.3, but is not a measured count of list
   updates per avoided R4 visit (section 4). R4 accounts for 16.6-19.0% of the two total sampled profiles, or 17.4% and
   29.7% of their `deduce.js` self time. The proxy ordering is consistent with the observed slowdowns; candidate
   per-operation timings were not measured.
4. **Conclusion for N-V4-05's phase 1: no P7 item for phase 1.** The four frozen arms keep the reference kernel
   (D-S24-22), as planned whatever the result.
5. The run used 13.35 counted minutes of the owner's 20. The account is 199.6 counted minutes of the 749. No question
   goes to the owner.

## 1. The run [V]

- **Before the run** (S02 steps 1-3):
  - no runner was active, and the production files were unchanged;
  - `check-prerequisites` printed `pass`;
  - the approval line was `{"plan":"V4-P7","spentS":11086.156,"roundCountedSBeforeApproval":11086.156,
    "requestedAdditionalGuardS":1162.1718749999993,"requestedCumulativeRoundMinutes":205}`. The guard of 1,162.2 s is
    within the owner's 1,200 s (D-S24-28), and the cap on the account is 206, within the 749;
  - the dry run gave three `go`, at horizons of 885, 835 and 525 s, and a forecast of 930 s.
- **The run** (steps 4-6): started detached on 2026-11-24 at 04:26 (runner PID 19088) and finished at about 04:40 with
  exit 0. Its log is `tests/artifacts/ig-proto/frozen/V4-P7/run-1.log`.
  - One locked invocation per composite, each not killed, exit 0, done, quiet 15 s:

    | Step | Counted s | Horizon s |
    |---|---:|---:|
    | `time-p7-c1` | 273.170 | 885 |
    | `time-p7-c1r5` | 269.628 | 871 |
    | `time-p7-c1r5c5` | 258.369 | 602 |

  - That is 801.167 counted seconds (13.35 minutes) in all, and 90 of 90 items ended per composite.
  - Each `bind-<composite>` step bound the composite to its quick and full equality reports, and `firewall-check`
    passed (289 files).
- **The account after the run:** 11,887.323 s logged plus 87.4 s off-log = 11,974.7 s, which is 199.6 counted minutes
  of the 749.
- **The report:** `docs/improve-generating/evidence/frozen/V4-P7/p7.json` and `p7.md` printed:
  - `p7-c1 go no (ratio 0.7293, quick ok, full ok, timing measured)`;
  - `p7-c1r5 go no (ratio 0.7449, ...)`;
  - `p7-c1r5c5 go no (ratio 0.8071, ...)`.

## 2. Equality per composite and tier [V]

The reports are `docs/improve-generating/evidence/frozen/V4-P7E-<composite>-<tier>/p7.json`. The tiers are T03a's:
- quick is 30 kernel items, 112 PM4 profiles and 7 memory items;
- full is 30 kernel items, 676 PM4 profiles and 7 memory items.

| Composite | Tier | Items | Equal | Not equal, errors, censored, missing | Problems | Steps on lists / reference | Coverage |
|---|---|---:|---:|---|---:|---|---|
| `p7-c1` | quick | 149 | 149 | 0, 0, 0, 0 | 0 | 277 / 39 | complete |
| `p7-c1` | full | 713 | 713 | 0, 0, 0, 0 | 0 | 1,040 / 39 | complete |
| `p7-c1r5` | quick | 149 | 149 | 0, 0, 0, 0 | 0 | 277 / 39 | complete |
| `p7-c1r5` | full | 713 | 713 | 0, 0, 0, 0 | 0 | 1,040 / 39 | complete |
| `p7-c1r5c5` | quick | 149 | 149 | 0, 0, 0, 0 | 0 | 277 / 39 | complete |
| `p7-c1r5c5` | full | 713 | 713 | 0, 0, 0, 0 | 0 | 1,040 / 39 | complete |

**Where the lists ran.** On every kernel item, the `canonical` step (the limits the ratings use) ran on the lists, 30
of 30 per composite. The 39 reference steps are the 35 `mem-ref` settings (a memory limit that leaves no room for the
lists) and four memory-fixture steps.

**The memory coverage** is the same on both tiers and for all three composites: 16 of 16 entries ok, and no budget
break.

| Fixture | Reference bytes | List bytes | Representation |
|---|---:|---:|---|
| `mem-small` | 41,543 | 48,960 | lists |
| `mem-mid` | 857,735 | 1,218,816 | lists |
| `mem-near-lists` | 33,072,156 | 80,940 | lists |
| `mem-near-reference` | 33,107,689 | 0 | reference |
| `mem-above` | 33,630,537 | - | none: `model-too-large`, equal on both trees |

The nine sequence steps are `lists, lists, lists, reference, lists, reference, lists, null, lists`, and the two
capacity steps are `lists, reference`, all as the manifest expects.

## 3. The timing and the go rule [V]

`timeVerdict` (T03b) found all three composites `measured`. Each holds 90 of 90 declared items ended `ok` with
`same: true`, with no missing, error, censored, invalid or differing item and no problem. The 33 capped pairs per
composite are ratings whose deduction path was capped on both trees with equal counters (ruling R-P24-06): 3 on 12x12
Nightmare, 12 on 14x14 Nightmare and 18 on 26x26 Hell 1.

| Composite | Reference s | Candidate s | Ratio | Geo mean | Capped pairs | Go (D-P24-05) |
|---|---:|---:|---:|---:|---:|---|
| `p7-c1` | 107.765 | 147.760 | 0.7293 | 0.7286 | 33 | no: ratio below 1.04 |
| `p7-c1r5` | 107.629 | 144.487 | 0.7449 | 0.7445 | 33 | no: ratio below 1.04 |
| `p7-c1r5c5` | 107.562 | 133.277 | 0.8071 | 0.8126 | 33 | no: ratio below 1.04 |

The reference sums differ by 0.19% across the three runs. All case and round aggregates, and the rated-pair-only
diagnostic, remain below one. This supports the consistency of the observed no-go result; it is not a confidence
interval or a proof that the small incremental differences between composites are free of noise.

**Per kernel case** (18 pairs each; the per-pair minimum and maximum are in `s02-numbers.md`):

| Case | `p7-c1` | `p7-c1r5` | `p7-c1r5c5` |
|---|---:|---:|---:|
| 10x10 Nightmare | 0.811 | 0.844 | 0.981 |
| 12x12 Nightmare | 0.731 | 0.761 | 0.870 |
| 14x14 Nightmare | 0.749 | 0.768 | 0.851 |
| 26x26 Nightmare | 0.607 | 0.625 | 0.651 |
| 26x26 Hell 1 | 0.723 | 0.722 | 0.740 |

**The result does not depend on the order or on the capped pairs:**
- **Order:** rounds 0, 1 and 2 (reference first in round 0 and round 2, candidate first in round 1) give ratios within
  0.025 of each other for every composite.
- **Capped pairs:** without them, the 57 pairs rated on both trees give 0.756, 0.779 and 0.859, still far below 1.04.

## 4. A possible explanation for the live-row lists' slowdown

**What C1 changes [V code]:** each killed row is unlinked from every column list to which it belongs, and each restored
row is relinked (`p7-c1.json`, edits `c1-3` and `c1-4`). R4 then traverses live-row lists instead of its static column
ranges.

**A reference-counter proxy [V arithmetic, A interpretation].** `V4-S2K/kernel.json` supplies counters on the same 30
kernel inputs. The following table deliberately defines a proxy, not an actual cost ratio:

- `undoEntries` includes column-uncover markers as well as row restorations; only the latter relink lists.
- `staticRows - liveRows` counts dead rows in R4's first piece-column pass, not its cleanup pass or cell-column scans.
- Six nonzeros per row is an approximation, not a measured per-mutation distribution.

| Case | First-pass static / live rows (M) | First-pass dead rows (M) | Kills / all undo entries (M) | Proxy `6 x (kills + undoEntries)` (M) | Proxy / first-pass dead rows |
|---|---|---:|---|---:|---:|
| 10x10 Nightmare | 49.04 / 12.91 | 36.13 | 19.38 / 21.00 | 242.3 | 6.7 |
| 12x12 Nightmare | 54.62 / 17.90 | 36.72 | 26.57 / 27.85 | 326.5 | 8.9 |
| 14x14 Nightmare | 84.37 / 28.08 | 56.29 | 32.48 / 33.53 | 396.1 | 7.0 |
| 26x26 Nightmare | 11.73 / 6.84 | 4.88 | 6.18 / 6.27 | 74.7 | 15.3 |
| 26x26 Hell 1 | 66.03 / 39.01 | 27.02 | 18.47 / 18.57 | 222.2 | 8.2 |

The highest proxy value is on 26x26 Nightmare, also the slowest case for all three composites. The lowest is on 10x10,
also the best case. This ordering is consistent with list-maintenance overhead being costly [A]; the proxy does not
quantify that overhead or isolate its causal contribution.

**The reference CPU profiles [V].** These are two reduced-inlining diagnostics, not profiles of the timed candidates:

| Case | R4 / total profile | R4 / `deduce.js` self time | `select + undo + kill` / total profile | `select + undo + kill` / `deduce.js` self time |
|---|---:|---:|---:|---:|
| 14x14 Nightmare | 16.6% | 17.4% | 24.5% | 25.8% |
| 26x26 Nightmare | 19.0% | 29.7% | 21.5% | 33.8% |

If all R4 self time disappeared and every other sampled cost stayed fixed, those profiles imply factors of about 1.20
and 1.23 on total sampled time; on the `deduce.js` component alone, about 1.21 and 1.42. These are conditional
arithmetic, not a normal-JIT speed ceiling or a prediction for another kernel.

**What the timing establishes [V]:** the observed aggregate ratio rises by about 2% from C1 to C1+R5, then by about 8%
with C5, but remains below one for every case and round aggregate. These are point comparisons, not independently
isolated per-operation gains. List maintenance is a plausible explanation [A]; the measured no-go for these three
composites does not depend on proving that explanation.

No new measurement was made for this reading.

## 5. Conclusions

- **Go or no** (D-P24-05, fixed before the measurement): **no** for `p7-c1`, `p7-c1r5` and `p7-c1r5c5`. Each was equal
  on both tiers as the exact timed tree, with complete coverage, and was `measured` on 90 of 90 pairs with none
  differing. The only failed condition is `ratio >= 1.04`.
- **N-V4-05, phase 1: no P7 item for phase 1.** No composite is a candidate for the phase-1 production work.
- **The frozen round keeps the reference kernel** in all four frozen arms and their comparators (D-S24-22). No variant
  of the frozen family names a `p7-*` variant (D-P24-01's composition). No speed credit is taken in this round,
  whatever the result.
- **For any later kernel proposal [A]:** these three list-maintaining implementations did not repay their overhead on
  this corpus. The result does not rule out a different representation or a cheaper update strategy. Any later proposal
  is new work with its own approval and must pass complete equality, memory and paired-timing gates. `p7-probe.mjs`
  remains available for that purpose.
- **S02's acceptance** [V]:
  - S02-B01: a go or no per composite by the fixed rule, within the owner's 20 minutes (13.35 counted).
  - S02-B02: the reference kernel is kept.
  - S02-T01: 90 items ended per composite, and the verdicts come from the declared items.
  - S02-T02: the runner exited 0 with `firewall: OK`.

## 6. Named items

- **N-V4-05 (phase 1)** in check-list §6.1, "P7's production adoption of a passing composite": **closed by this
  report**. No composite passed, so there is nothing to adopt. The check-list row is updated by the pack author.
- No new named item, and no question for the owner or a ruling is needed.

## 7. Evidence

- **The run:**
  - `tests/artifacts/ig-proto/frozen/V4-P7/run-1.log`, `invocations.jsonl` (three rows) and `time-<composite>/` (each
    run's declaration, state and item log);
  - `docs/improve-generating/evidence/frozen/V4-P7/p7.json` and `p7.md`.
- **The equality reports:** `docs/improve-generating/evidence/frozen/V4-P7E-<composite>-<tier>/p7.json` and `p7.md` for
  the three composites and both tiers. Their raw runs are under `tests/artifacts/ig-proto/frozen/V4-P7E-*`.
- **The counters and profile of the reference:** `docs/improve-generating/evidence/frozen/V4-S2K/kernel.json` (`perCase`,
  `profile`) and report §1.13. The `deduce.js` self-time shares (R4 17.4% and 29.7%; `select + undo + kill` 25.8% and
  33.8%) come from SA-Astra's aggregation of the two `.cpuprofile` files that `kernel.json` hashes.
- **SA-Astra's review:** `docs/improve-generating-stages-2-4/sa-astra/s02-review.md`;
  `docs/improve-generating-stages-2-4/evidence/sa-astra/s02-review-checks.mjs` and `.json` (the corpus reconstruction,
  the verdict and binding checks, the raw-profile aggregation), and `s02-review-validation.txt`.
- **The numbers of this report:** `docs/improve-generating-stages-2-4/evidence/sa-opus/s02-numbers.mjs`, its output
  `s02-numbers.json` and `s02-numbers.md`: the six equality reports, the timing report, the three raw item logs and the
  invocation rows. It is unlocked and runs no rating, search or generation:
  `node docs\improve-generating-stages-2-4\evidence\sa-opus\s02-numbers.mjs`. The table of section 4 is its last table,
  recomputed from `kernel.json`'s `perCase` sums.
- **Rules and decisions:** plan §4.6 and §8.2 S-2; D-S24-15, D-S24-22, D-S24-28; D-P24-01, D-P24-05; rulings R-P24-06
  to R-P24-08; S02 step 7.
