# SA-Astra: S02 spike-report review

Date: 2026-11-24. Reviewed the uncommitted `V4-P7` records and `s02-spike-report.md`.

**The no-go decisions and closure of N-V4-05 are agreed. Two corrections are needed in the
performance explanation; neither needs another run or an owner question.**

## What reproduces

**Verified from the records, not the draft's arithmetic:**

- All three candidates: 149/149 quick and 713/713 full items equal, complete memory coverage,
  16 correct memory entries, no budget break. The five fixture byte counts, sequence and capacity
  representations reproduce. All six reports bind their twelve required inputs, unchanged,
  to the exact candidate/reference identities used in the timing declarations.
- Reconstructed the ordered corpora from the catalogue, PM4 records and memory manifest,
  without building a tree or constructing/rating a puzzle. The raw declaration/state/log checks
  reproduce every equality and timing verdict, including producer and start/end protocol checks.
- All three timing runs: 90/90 completed equal pairs, 33 capped on both trees and 57 rated on both;
  no missing, erroneous, censored, invalid or differing item.

| Candidate | Reference s | Candidate s | Ratio | Geometric mean | Rated-only ratio |
|---|---:|---:|---:|---:|---:|
| `p7-c1` | 107.765 | 147.760 | 0.7293 | 0.7286 | 0.7556 |
| `p7-c1r5` | 107.629 | 144.487 | 0.7449 | 0.7445 | 0.7789 |
| `p7-c1r5c5` | 107.562 | 133.277 | 0.8071 | 0.8126 | 0.8594 |

Every reported case and round aggregate reproduces and is below one. The capped-pair
distribution is 3/12/18 on 12x12 Nightmare, 14x14 Nightmare and 26x26 Hell 1. The invocation
sum is 801.167 s, guard 1,162.171875 s and cumulative minimum cap 206; the round account is
199.578717 minutes, correctly rounded to 199.6.

The only failed go condition is the predeclared `ratio >= 1.04`. N-V4-05's phase-1 adoption
item can therefore close as proposed. Keep the reference kernel and take no P7 speed credit.

## Finding 1: the profile percentages use total profile time, not deduction self time

The reported 16.6-19.0% for R4 and 21.5-24.5% for `select + undo + kill` reproduce only with
the **whole profile** as denominator. The draft calls both percentages shares of deduction time.

Recomputed directly from the two `.cpuprofile` files whose byte hashes are in
`V4-S2K/kernel.json`. `kernel-probe.mjs:377-407` defines `deduceMs` as the summed self time of
nodes whose URL ends in `core/engine/deduce.js`.

| Profile | Total sampled ms | `deduce.js` self ms | R4 self ms | R4 / total | R4 / `deduce.js` | (`select + undo + kill`) / `deduce.js` |
|---|---:|---:|---:|---:|---:|---:|
| 14x14 Nightmare | 10,629.445 | 10,099.633 | 1,761.088 | 16.6% | 17.4% | 25.8% |
| 26x26 Nightmare | 3,646.224 | 2,324.655 | 691.245 | 19.0% | 29.7% | 33.8% |

Thus 1.23 is a conditional counterfactual for the **total sampled profile**, not a
deduction-time ceiling. On the `deduce.js` denominator the corresponding factors are
1.211 and 1.423. Neither diagnostic percentage is a proved bound on normal-JIT candidate
timing or on future optimizations.

## Finding 2: the operation ratio is a proxy, not actual updates per skipped R4 row

The numbers 6.7, 8.9, 7.0, 15.3 and 8.2 reproduce as
`6 * (kills + undoEntries) / (staticRows - liveRows)`. Their current interpretation is too strong:

- `r4c.json`, edit `r4c-7`, increments `undoEntries` for **every** popped trail entry.
  The frozen `deduce.js:482-498` then distinguishes row restoration (`x >= 0`) from a
  negative column-uncover marker. C1 relinks lists only for row restorations
  (`p7-c1.json`, edit `c1-4`), not for every undo entry.
- Edits `r4c-3`/`r4c-4` count the **first piece-column pass** of R4. They do not count
  the later cleanup pass or cell-column scans (`deduce.js:711-763`). C1 also replaces
  those scans. The denominator therefore is not all dead-row visits avoided by C1.
- Six nonzeros is an explicit approximation using a pentomino placement as an example,
  not a measured sum of nonzeros for the rows killed/restored on these executions.

These are useful qualitative indicators of mutation traffic, but do not establish the
stated actual-operation ratio or prove that every possible per-kill optimization must lose.
The timing already establishes that these three implementations lose; no additional
measurement is needed to make the fixed no-go decision.

## Exact changes to `s02-spike-report.md`

### A. Replace Summary item 3

> **Possible explanation** [V counters and profiles, A interpretation]: maintaining the
> lists adds work on row kills and restorations. A rough reference-counter proxy ranges
> from 6.7 to 15.3, but is not a measured count of list updates per avoided R4 visit
> (section 4). R4 accounts for 16.6-19.0% of the two total sampled profiles, or 17.4% and
> 29.7% of their `deduce.js` self time. The proxy ordering is consistent with the observed
> slowdowns; candidate per-operation timings were not measured.

### B. Replace section 4 in full

> ## 4. A possible explanation for the live-row lists' slowdown
>
> **What C1 changes [V code]:** each killed row is unlinked from every column list to
> which it belongs, and each restored row is relinked (`p7-c1.json`, edits `c1-3` and
> `c1-4`). R4 then traverses live-row lists instead of its static column ranges.
>
> **A reference-counter proxy [V arithmetic, A interpretation].** `V4-S2K/kernel.json`
> supplies counters on the same 30 kernel inputs. The following table deliberately
> defines a proxy, not an actual cost ratio:
>
> - `undoEntries` includes column-uncover markers as well as row restorations; only the
>   latter relink lists.
> - `staticRows - liveRows` counts dead rows in R4's first piece-column pass, not its
>   cleanup pass or cell-column scans.
> - Six nonzeros per row is an approximation, not a measured per-mutation distribution.
>
> | Case | First-pass static / live rows (M) | First-pass dead rows (M) | Kills / all undo entries (M) | Proxy `6 x (kills + undoEntries)` (M) | Proxy / first-pass dead rows |
> |---|---|---:|---|---:|---:|
> | 10x10 Nightmare | 49.04 / 12.91 | 36.13 | 19.38 / 21.00 | 242.3 | 6.7 |
> | 12x12 Nightmare | 54.62 / 17.90 | 36.72 | 26.57 / 27.85 | 326.5 | 8.9 |
> | 14x14 Nightmare | 84.37 / 28.08 | 56.29 | 32.48 / 33.53 | 396.1 | 7.0 |
> | 26x26 Nightmare | 11.73 / 6.84 | 4.88 | 6.18 / 6.27 | 74.7 | 15.3 |
> | 26x26 Hell 1 | 66.03 / 39.01 | 27.02 | 18.47 / 18.57 | 222.2 | 8.2 |
>
> The highest proxy value is on 26x26 Nightmare, also the slowest case for all three
> composites. The lowest is on 10x10, also the best case. This ordering is consistent
> with list-maintenance overhead being costly [A]; the proxy does not quantify that
> overhead or isolate its causal contribution.
>
> **The reference CPU profiles [V].** These are two reduced-inlining diagnostics,
> not profiles of the timed candidates:
>
> | Case | R4 / total profile | R4 / `deduce.js` self time | `select + undo + kill` / total profile | `select + undo + kill` / `deduce.js` self time |
> |---|---:|---:|---:|---:|
> | 14x14 Nightmare | 16.6% | 17.4% | 24.5% | 25.8% |
> | 26x26 Nightmare | 19.0% | 29.7% | 21.5% | 33.8% |
>
> If all R4 self time disappeared and every other sampled cost stayed fixed, those
> profiles imply factors of about 1.20 and 1.23 on total sampled time; on the
> `deduce.js` component alone, about 1.21 and 1.42. These are conditional arithmetic,
> not a normal-JIT speed ceiling or a prediction for another kernel.
>
> **What the timing establishes [V]:** the observed aggregate ratio rises by about
> 2% from C1 to C1+R5, then by about 8% with C5, but remains below one for every
> case and round aggregate. These are point comparisons, not independently isolated
> per-operation gains. List maintenance is a plausible explanation [A]; the measured
> no-go for these three composites does not depend on proving that explanation.
>
> No new measurement was made for this reading.

### C. Replace the two sentences after section 3's timing table

> The reference sums differ by 0.19% across the three runs. All case and round aggregates,
> and the rated-pair-only diagnostic, remain below one. This supports the consistency
> of the observed no-go result; it is not a confidence interval or a proof that the small
> incremental differences between composites are free of noise.

### D. Replace section 5's `For any later kernel proposal` bullet

> **For any later kernel proposal [A]:** these three list-maintaining implementations
> did not repay their overhead on this corpus. The result does not rule out a different
> representation or a cheaper update strategy. Any later proposal is new work with its
> own approval and must pass complete equality, memory and paired-timing gates.
> `p7-probe.mjs` remains available for that purpose.

No change to the numeric timing tables, the go threshold, N-V4-05's closure, the reference
kernel decision or any machine allowance is requested.

## Evidence

```powershell
node docs\improve-generating-stages-2-4\evidence\sa-astra\s02-review-checks.mjs --label frozen
npm run check
```

`evidence\sa-astra\s02-review-checks.mjs|json` records the independent corpus reconstruction,
raw verdict/binding validation, timing summaries, fixture coverage, counter sums, raw-profile
aggregation, price/account arithmetic and input hashes. `s02-review-validation.txt` records
the command results and format/input-stability checks.

All verification reads existing records. No generation, rating, search, replay, tree build,
locked/timed run, git command or edit of the harness, tests, task pack or existing evidence
was performed.
