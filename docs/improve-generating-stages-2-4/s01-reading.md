# S01: the SAs' reading of `V4-S2B` (the control pilot)

Status: **Joint text** (SA-Opus drafter, SA-Astra reviewer), the text of S01 step 8
(`tasks/improve-generating-stages-2-4/S01-run-v4-s2b.md`); SA-Astra's review (`sa-astra/s01-reading-review.md`) applied on
2026-11-24, pending her final accept. Date 2026-11-24. Base `dd38457`; the run's records were read
uncommitted in the tree. Every decision below is a joint SA decision under the owner's delegation (2026-11-23 15:29,
Discord message 1574341211701907457), recorded as such. [V] marks a figure recomputed from the records; [A] an assumption
or a judgement.

## Summary

1. `V4-S2B` ran complete: 40 rows of `fr-none` on the eight unpiloted Nightmare controls, 833.444 counted seconds (13.89
   minutes, against 22.59 projected and 28.24 guard). The round's account is now 186.2 counted minutes of the 749 granted
   [V].
2. The evidence is complete and clean: every declared row is present, unique, correctly identified, valid and fully
   linked; no recorded completed-primitive prefix reached 10 G; the frozen four-attempt bound fires on no row; no row comes
   near the live deadline [V].
3. Seven of the eight cells are faster than today's search on these seeds: geometric mean 1.177 to 2.052, every lower
   bound 0.979 or more [V].
4. **One performance warning: 32x15 Nightmare**. Its geometric mean is 0.991 (parity with today) and its five-seed lower
   bound 0.813, below the 0.9 that stage 4 requires at 20 seeds [V]. Stage 2's 26x26 Nightmare (lower bound 0.881) is
   carried with it. The separate metadata-index omission is closed by W3 without another run.
5. Decision for both: **(a) no change**. No frozen value of plan §4.1 acts on these cells' shipped arm, and every remedy is
   a new measured scope or a recorded-decision change, best judged on stage 4's 20 paired seeds. The freeze values of plan
   §4.1 stand for the controls.
6. The risk goes to stage 4. The owner is told now, as information, and again in S06's question. **No question goes to the
   owner.**

## 1. The run [V]

- **Before the run** (S01 steps 1-3):
  - no runner was active, and `git status --short -- core generator` was empty;
  - `check-prerequisites` printed `pass`;
  - the approval line was `{"plan":"V4-S2B","spentS":10252.712,"roundCountedSBeforeApproval":10252.712,
    "requestedAdditionalGuardS":1694.6240407041143,"requestedCumulativeRoundMinutes":200}`, a cap on the account of 201,
    within the 749 granted;
  - the dry run gave eight `go`, at horizons 885 s five times, then 762, 640 and 481 s, and a forecast of 1,356 s (ruling
    R-P24-02).
- **The run** (steps 4-6): started detached on 2026-11-24 at 00:14 (runner PID 444) and finished at about 00:28 with exit
  0. Its log is `tests/artifacts/ig-proto/frozen/V4-S2B/run-1.log`.
  - Eight locked invocations, one per row step. Every one had `quietS` 15 and `horizonS` 885, was not killed, exited 0 and
    ended done.
  - Counted seconds per step: 41.465, 159.327, 85.982, 115.025, 118.923, 106.028, 83.364 and 123.330, so 833.444 in all.
  - `publish-fr-none` published eight shards of five rows each, and `firewall-check` printed `firewall: OK` (289 files).
- **The account after the run:** 11,086.156 s logged plus 87.4 s off-log = 11,173.6 s, which is 186.2 counted minutes of
  the 749.
- **The readings** (step 7):
  - `fit-read preview` wrote `docs/improve-generating/evidence/frozen/V4-S2B/fit-read-preview-fr-none.json` and `.md` (8
    cells, 0 problems, 0 unexpected).
  - `fit-read prefixes --budget nightmare=10000000000` wrote `fit-read-prefixes-fr-none.json` and `.md` (40 rows, 0
    missing, 0 identity problems, 0 incomplete, 0 affected, 0 potentially affected, 0 ambiguous; no bound requested).

## 2. The preview per control cell (a fitting warning, not the stage-4 verdict) [V]

**How the ratio is computed.** Per seed, the ratio is today's capped T10 over `fr-none`'s capped T10. Today's T10 comes
from MP12b1's run of the same seed (`landscape/<cell>/<rep>`), with its sampling removed. A ratio below 1 means the new
search was slower on that seed.

**How the lower bound is computed.** It is the 10th percentile of 10,000 seed resamples (seed 20261116), as stage 4
computes it at 20 seeds.

The MP12b1 reports are `docs/difficulty-v3/landscape-v3-full/<cell>-2026-11-13.json` for 3x29 and `<cell>-2026-11-14.json`
for the other seven cells.

| Cell (area; class) | today ten / after ten (of 5) | Ratios rep 0-4 | Geo | Lower | Lower >= 0.9 |
|---|---|---|---:|---:|---|
| 3x29 (87; `n-small`) | 5 / 5 | 0.702, 1.479, 1.333, 1.658, 0.986 | 1.177 | 0.979 | yes |
| 18x18 (324; `n-upper`) | 5 / 5 | 2.286, 1.155, 0.789, 2.153, 3.970 | 1.779 | 1.272 | yes |
| 18x20 (360; `n-large`) | 5 / 5 | 0.985, 0.934, 1.606, 0.801, 4.252 | 1.382 | 0.979 | yes |
| 20x20 (400; `n-large`) | 4 / 5 | 2.406, 3.114, 1.126, 1.121, 0.701 | 1.460 | 1.082 | yes |
| 20x21 (420; `n-large`) | 5 / 5 | 2.067, 1.028, 1.665, 4.659, 2.210 | 2.052 | 1.538 | yes |
| **32x15 (480; `n-large`)** | 5 / 5 | 0.584, 1.373, 0.740, 1.528, 1.054 | **0.991** | **0.813** | **no** |
| 22x22 (484; `n-large`) | 5 / 5 | 1.844, 1.642, 1.660, 0.999, 1.932 | 1.575 | 1.381 | yes |
| 24x24 (576; `n-large`) | 5 / 5 | 1.200, 1.106, 2.346, 1.219, 2.244 | 1.535 | 1.307 | yes |

**The new search reaches ten on all 40 rows.** Today's search missed ten once: on 20x20, rep 1 accepted 3 puzzles by its
time limit and is capped at 120 s, while `fr-none` took 38.5 s. On 20x21, rep 3, today reached ten only after 124.7 s, so
it also enters at the 120-s cap; `fr-none` took 25.8 s.

## 3. The calls and the other frozen limits per cell [V]

- **Calls:** `affected` and `potentially affected` are against 10 G (the frozen `any` budget for Nightmare). "Largest
  logged prefix" is the largest sum of completed rating/count primitives recorded for one call, in units of 10^9; it is
  not an upper bound on consumed work in an unfinished primitive. Of 863 calls, 680 ended and 183 were closed by confirmed
  worker termination with one open primitive. Their row ledgers are complete as work intervals. Every recorded prefix
  stays below 10 G, so no between-primitive P5 stop is indicated; these cancellations are not ambiguous or censored
  request inputs.
- **Four-attempt bound:** I read it from the raw journals with `fit-read.mjs`'s pure `callPrefixes` and `boundFirings`. S01's
  prefixes record ran without `--bound`.
  - Every row has four set calls, except 3x29 rep 3, which has three.
- **The two time columns:**
  - the longest set stage (`igSetMs`) is compared with the live deadline's 46-s set-stage cut;
  - the longest response is compared with the 115-s generation stop.

| Cell | Calls | Affected / potentially affected | Largest logged prefix | Bound-4 firings | Longest set stage (s) | Longest response (s) |
|---|---:|---|---:|---:|---:|---:|
| 3x29 | 104 | 0 / 0 | 2.93 G | 0 | 0.9 | 9.8 |
| 18x18 | 123 | 0 / 0 | 6.65 G | 0 | 19.7 | 35.0 |
| 18x20 | 105 | 0 / 0 | 3.56 G | 0 | 4.5 | 15.0 |
| 20x20 | 111 | 0 / 0 | 6.21 G | 0 | 19.5 | 38.7 |
| 20x21 | 112 | 0 / 0 | 4.40 G | 0 | 3.4 | 25.9 |
| 32x15 | 104 | 0 / 0 | 5.94 G | 0 | 8.0 | 27.8 |
| 22x22 | 100 | 0 / 0 | 2.45 G | 0 | 4.6 | 18.1 |
| 24x24 | 104 | 0 / 0 | 3.46 G | 0 | 4.7 | 32.5 |

None of the frozen limits would have changed any of these 40 rows:
- P5's 10 G: no recorded primitive-boundary check reaches it; the largest completed-primitive sum for a call is 6.65 G.
  This is a prefix result, not a claim that every terminated call's total consumed work is known to be below 10 G.
- The four-attempt bound: no firing.
- The live deadline: the longest set stage is 19.7 s, below the 46-s cut; the longest response is 38.7 s, below the
  115-s stop.

The other frozen changes do not touch Nightmare:
- the per-set prior runs on Hell 1 only (`perSetLevels: ['hell-1']`);
- `prior-s3-v1` keeps `prior-v1`'s 15 Nightmare entries (D-S24-10);
- the mechanisms are those of `fr-none`: rescue with `rerateMax` 4, (c4) off, bracket close off (`variants/v4.json`,
  `fr-base.json`, `fr-none.json`).

`fr-frozen-none`, the arm that ships for `n-large` when that class is not admitted, would therefore have run these rows as
`fr-none` did [A]. That the frozen-family edits are inert there is T08c's check on real calls.

## 4. Completeness of the evidence (SA-Astra's reviews R03 and R2-03) [V]

All 40 declared rows of `fitScope` are in both records:
- each is present once and has a complete publication;
- each shard is done;
- `rowStatus` is `valid` on every row;
- `identity` is empty on every row: the declared row, the shard declaration, the row identity line and the publication's
  tree, copy and producer agree;
- `complete` is true on every row (the ledger closes with its linkage);
- no file is unreadable, and no problem, ambiguous call, missing row or unexpected row appears in either record.

The preview's 40 pairs all hold a ratio. The stored input indices have 17 files for the preview and 334 for the prefixes;
every indexed hash verifies. The prefixes reader also reads the eight publication `.runs.md` files through
`publicationOf`, but omitted those files from its index. All eight and their referenced published journals are present.
SA-Astra's `evidence/sa-astra/s01-review-checks.json`, field `publicationInputs`, binds the omitted metadata. W3 below
records this provenance correction; no measured input is missing and neither existing fitting record is rewritten.

My parse of the raw journals finds no line problem.

## 5. Warnings and the SAs' joint decisions

### W1: 32x15 Nightmare, lower bound 0.813 (below 0.9)

**Facts [V]:**
- Today's capped T10 against `fr-none`'s, in seconds:

  | Rep | Today | `fr-none` |
  |---:|---:|---:|
  | 0 | 11.0 | 18.8 |
  | 1 | 37.9 | 27.6 |
  | 2 | 10.8 | 14.6 |
  | 3 | 17.2 | 11.3 |
  | 4 | 13.8 | 13.1 |

- Today's reps 5-9 on the same report took 12.1, 23.0, 24.1, 10.9 and 9.8 s, so both searches run in the same range.
- Both arms reach ten on every seed.
- The geometric mean is 0.991, and the log standard deviation of the five ratios is 0.407.
- The low bound comes from two seeds, reps 0 and 2. It is measured against today's runs of another session (MP12b1,
  2026-11-14).
- At stage 4 the comparator is today's arm `log-link`, on the same validation seeds in the same plan (the v4 pack's ruling
  of 2026-11-17 on T11e).
- 32x15 has the smallest geometric mean of the eight. The other elongated board, 3x29, has the next smallest (1.177; lower
  bound 0.979).

**Descriptive arithmetic, not a forecast [V]:** at this dispersion, a 20-seed lower bound of 0.9 needs a geometric mean
of about 1.011 (normal approximation of the resampled 10th percentile, `0.9 x exp(1.2816 x 0.407 / sqrt(20))`). The five
seeds give 0.991. This control is the one most at risk of failing the no-regression bound at stage 4. One control failure
stops phase 2 (plan v4 §5.2; this feature's plan §7).

**What could act on it [A]:**
- **The shipped arm.** 32x15 is in `n-large`, whose expected verdict is inconclusive (report §2.2: its work bounds are
  undecidable at pilot size), so its shipped arm is `fr-frozen-none`. On these rows that arm equals `fr-none` (section 3).
- **No frozen value of plan §4.1 changes that arm's time on this board with evidence.**
  - Changing Nightmare's prior entry for area 480 would be a fit without a measured alternative, and it would move a value
    the plan keeps (D-S24-10).
  - The budget, the bound and the deadline do not bind here.
  - The screen value only matters if `n-large` is admitted. Its admission is decided at stage 4 by rule (c5), and any arm
    that ships must pass the same 0.9 bound (IG-P-Q32).
- **Every remedy is the owner's.** Each one changes what ships on this board or changes a recorded decision: a screen pilot
  on the 360-576 controls, sending the board to today's search, a different search, or a change of the controls' gate. So
  each needs a new measured scope, a recorded-decision change, or both.
- **More fitting seeds would not unlock a frozen change.** They would only narrow the estimate, and stage 4's 20 seeds,
  paired in one plan with today's arm, are the measurement that the decision needs anyway.

**Decision (joint, under the owner's delegation): (a) no change.**
- The freeze values of plan §4.1 stand for 32x15.
- The risk is carried to stage 4.
- The owner is told now, as information without a question, and S06's STOP 2 names the risk (section 6).
- If 32x15 fails the 0.9 bound at stage 4, its remedy is a new proposal decided then, with the owner for any scope or
  recorded-decision change.

### W2 (carried from stage 2): 26x26 Nightmare, lower bound 0.881

**Facts [V]** (`V4-S2`'s `fr-none`, the same recipe):
- ratios 0.546, 1.707, 1.418, 1.325, 1.015;
- geometric mean 1.122, log standard deviation 0.444;
- by the same arithmetic, a 20-seed lower bound of 0.9 needs about 1.022, below the observed 1.122;
- on the screen arm, `fr-screen` had a geometric mean of 1.64 (report §1.12), but `n-large` is not expected to ship the
  screen.

**Decision (joint, under the owner's delegation): (a) no change, for W1's reasons.** It is reported to the owner with W1.

### W3: the prefixes input index omitted eight publication-metadata files

**Facts [V]:** `publicationOf` reads the eight `.runs.md` files, but the prefixes reader did not register them. They and
their referenced journals are present; the review's supplementary `publicationInputs` index now binds the eight metadata
files. All numeric, identity and ledger checks still pass.

**Decision (joint, under the owner's delegation): (a) no configuration change.** Accept S01's reading with the
supplementary index; preserve both original written-once fitting records. Correct the reader's input registration before
the next prefixes record is produced, and carry the supplementary index into the freeze. This is an in-scope provenance
repair, not another pilot or an owner question.

The repair is in the pack (ruling R-P24-05, section 6): the task T02d registers each shard's `.runs.md` in the prefixes
record's `inputs` before T11's prefixes record of `V4-S3P` is written, and T12a's fit index binds the supplementary index.

### Not warnings (observations)

- 20x20: today reached ten on 4 of 5 seeds, `fr-none` on 5 of 5.
- 3x29 and 18x20: lower bounds of 0.979, the smallest margins after 32x15. Their geometric means are 1.177 and 1.382, above
  the 0.994 and 1.094 that the same arithmetic needs.
- 18x18: 5 of 5, longest response 35.0 s. Plan §6 B2's note on its old baseline stands.

None of these needs a decision.

## 6. Consequences

- **T06 and the freeze proceed with plan §4.1's values** for the controls; no frozen value changes.
- **S06, STOP 2** (agreed by SA-Astra; added by the pack author, ruling R-P24-05). This sentence is in the text relayed to
  the owner, before its options: "Two of the ten Nightmare control boards have small margins in the fitting runs: 32x15
  (about the same speed as today's search on five seeds) and 26x26 (about 12 % faster, with one slow seed); if either falls
  below the required 0.9 no-regression bound at stage 4, phase 2 stops for a decision, while every other verdict of the run
  stands."
- **W3's repair** (ruling R-P24-05). S01's two fitting records stay as written, and the pack is amended twice:
  - The new task T02d, after S01, makes `prefixesCommand` register each shard's existing `<runsDir>/<shard>.runs.md` with
    `addInput` before it calls `publicationOf`. T02c's clean prefixes fixture then requires that file's hash in `inputs`.
    No engine run and no regeneration of S01's records is involved. T11, the next prefixes record, depends on it.
  - T12a's `FIT_INDICES` gains `{ path: 'docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.json',
    field: 'publicationInputs', key: 'sha256' }`, and its `FIT_INPUTS` gains
    `docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.mjs`. Only `publicationInputs` is selected
    from the review JSON, not its broader review-snapshot `inputs`.
- **The next progress report** (the orchestrator translates):

  > "The control pilot ran in 13.9 counted minutes; the round's account is 186.2 of the 749 you granted. On seven of the
  > eight boards the new search is faster than today's (1.2 to 2.1 times). On 32x15 it is about the same speed, so that
  > board has the smallest margin against the 0.9 no-regression bound that stage 4 checks on 20 seeds (26x26 has the next
  > smallest, from stage 2). Nothing in the frozen settings changes that board's speed, so the SAs keep the settings and
  > stage 4 will decide; no answer is needed now. We will remind you of this when we ask for stage 4's time."

## 7. Evidence

- **The run:**
  - `tests/artifacts/ig-proto/frozen/V4-S2B/run-1.log` and `invocations.jsonl` (eight rows; their counted seconds are
    quoted in section 1);
  - `docs/improve-generating/evidence/frozen/V4-S2B/fr-none/pilot-<cell>.runs.json`, `.runs.md` and `.calls.jsonl` (the
    eight cells).
- **The readings:** `docs/improve-generating/evidence/frozen/V4-S2B/fit-read-preview-fr-none.json` and `.md`, and
  `fit-read-prefixes-fr-none.json` and `.md`.
- **SA-Astra's review:** `docs/improve-generating-stages-2-4/sa-astra/s01-reading-review.md`;
  `docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.mjs` and `.json` (its field `publicationInputs`
  binds the eight `.runs.md` files the prefixes record omitted), and `s01-review-validation.txt`.
- **The numbers of this note:** `docs/improve-generating-stages-2-4/evidence/sa-opus/s01-numbers.mjs`, its output
  `s01-numbers.json` and `s01-numbers.md`. It reads the two records, the eight runs files, MP12b1's eight reports, the raw
  journals of `V4-S2B` (the bound) and `V4-S2`'s 26x26 Nightmare `fr-none` rows. It is unlocked and runs no rating, search
  or generation:
  `node docs\improve-generating-stages-2-4\evidence\sa-opus\s01-numbers.mjs --label frozen --source-label "frozen 3fc65f4"`.
- **Rules and decisions:**
  - plan §4.1 (the frozen values), §7 (the controls' risk) and §8.2 S-1;
  - report §1.12 (26x26) and §2.2 (the classes);
  - plan v4 §5.2 (the controls' gate, IG-P-Q26, IG-P-Q29, IG-P-Q32);
  - D-S24-10, D-S24-11, D-S24-26;
  - S01 step 8; rulings R-P24-02, R-P24-04 and R-P24-05.
