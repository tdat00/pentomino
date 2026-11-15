# Generator speed: `main`, difficulty-v3 and difficulty-v3 with plan v4 (Pentomino)

> **Estimates for the owner, 2026-11-15. No run was made for this file.** Writer: Opus (claude-opus-5.5);
> cross-check: Astra (gpt-6-astra). Every number comes from a committed record or from plan v4 (`plan.md` at
> `b7e5dff`, section 4, which carries the joint report's corrections). Plan v4's own numbers are provisional: two to
> six seeds per cell, Node, before the difficulty-v3 freeze. None is a gate result or an offer.

**How to read the table.**

- T10: seconds until a request holds ten puzzles, median / p95 over the requests that reached ten. T1: seconds to
  the first puzzle, over the requests that reached one. Node with four workers on an AMD EPYC 7763 (16 logical
  cores) in every column.
- `main` is `9d45142` (2026-10-28): the v2 rating, `gen-v2`, the old offers. difficulty-v3 is MP12b1's landscape on
  the `rating-v3` runtime (digest `34cea386…`), with MP12b3's offers as at `e5bb721`.
- For plan v4, `gen-v4` is the measured prototype arm of the new search, and "mix" adds the plan's projected kernel
  gain and, on Hell 1, the per-set prior: central (low to high).
- Speed-up: the other column's T10 median divided by plan v4's. Above 1, plan v4 is faster; below 1, it is slower.
  A range combines the ends of both sides' ranges.
- Labels: **M** a measured record; **D** derived from measured records only; **P** a projection, or anything that
  uses one.

## 1. Summary

| Cell (area in cells) | `main`: T10 median / p95, T1 | difficulty-v3: T10 median / p95, T1; requests with ten (of 20) | difficulty-v3 + plan v4: `gen-v4`; mix | Speed-up over difficulty-v3 | Speed-up over `main` |
|---|---|---|---|---|---|
| 12x12 Nightmare (144) | 0.94 / 0.96 s, T1 0.33 s; 3 of 3 (M) | 62.1 / 176.1 s, T1 13.9 s; 17 (M) | 16.5 s, 6 of 6, no screen (M); mix 10.0 s (7.8 to 13.2) (P) | x3.8, paired x2.9 (D); mix x6.2 (4.7 to 8.0) (P) | x0.06 (D); mix x0.07 to 0.12 (P) |
| 14x14 Nightmare (196) | no record; about 1 to 4 s (P) | 113.0 / 151.6 s, T1 43.1 s; 11 (M) | 8.9 s, 3 of 3, 190 M, T1 1.56 s (M); mix 5.4 s (4.3 to 7.2) (P) | x12.7 (D); mix x20.9 (15.7 to 26.3) (P) | x0.11 to 0.45; mix x0.14 to 0.93 (P) |
| 15x15b10 Nightmare (215) | no record; about 1 to 4 s (P) | 86.2 / 141.6 s, T1 43.2 s; 11 (M) | 8.5 s, 3 of 3, 190 M, T1 1.91 s (M); mix 5.1 s (4.0 to 6.8) (P) | x10.1 (D); mix x16.9 (12.7 to 21.6) (P) | x0.12 to 0.47; mix x0.15 to 1.00 (P) |
| 16x16, 15x20 Nightmare (256, 300) | no record; about 1 to 4 s (P) | 79.8 / 135.4 s and 40.1 / 111.2 s; 15 each (M) | not run; unpriced in the plan; between about 9 s (as on 14x14) and today's time (P) | x1 to 8.9 and x1 to 4.5 (P) | unknown; at best as on 14x14 |
| 10x10 Nightmare (100) | 1.0 / 3.8 s; 20 of 20 (M) | 24.0 / 68.4 s, T1 5.1 s; 19 (M) | not run; mix 14.6 s (11.5 to 19.3), kernel only (P) | mix x1.6 (1.2 to 2.1) (P) | mix x0.05 to 0.09 (P) |
| 18x18 to 24x24 Nightmare, with 18x20, 20x21 and 32x15 (324 to 576) | 2.1 to 3.8 s on 18x20, 22x22, 24x24 and 32x15; 3 of 3 each (M) | 11.6 to 37.3 s, p95 33.9 to 134.5 s; 19 or 20 (M) | not run; no regression required; kernel only: about 5.5 to 30 s (P) | x1.0 to 2.1 (P) | about x0.1 to 0.5 (P) |
| 26x26 Nightmare (676) | 6.81 / 12.14 s, T1 1.15 s; 3 of 3 (M) | 18.6 / 31.4 s, T1 5.2 s; 20 (M) | 11.9 s, 6 of 6, 190 M, T1 2.42 s (M); mix 7.3 s (5.7 to 9.6) (P) | x1.56, paired x2.01 (D); mix x2.5 (1.9 to 3.3) (P) | x0.57 (D); mix x0.71 to 1.19 (P) |
| Hell 1 26x26 (676) | 24.0 / 24.9 s, T1 5.6 s; 3 of 3 (M) | 108.7 / 167.6 s, T1 44.8 s; 9; withdrawn (M) | 34.2 s, 2 of 2, no screen, T1 6.2 s (M); mix 17.4 s (11.6 to 27.5) (P) | x3.2 (D); mix x6.2 (4.0 to 9.4) (P) | x0.70 (D); mix x0.87 to 2.1 (P) |
| Hell 1 20x20 (400) | no record; about 4 to 16 s (P) | no set in 115 s, 0 of 3; withdrawn (M) | 42.9 s, 2 of 2, no screen, T1 7.2 s (M); mix 21.8 s (14.5 to 34.5) (P) | from no puzzle to ten (M) | x0.09 to 0.37; mix x0.12 to 1.10 (P) |
| Hell 1 14x14, 24x24 (196, 576) | 24x24: 15.5 / 16.5 s, T1 4.2 s (M); 14x14: no record | 0 of 20 each (5 and 13 puzzles in 20 requests); withdrawn (M) | five-seed pilots in the frozen round only; unknown | unknown | unknown |
| Hell 2, Hell 3 (22x22 to 26x26) | 4.5 to 11.1 s and 3.8 to 9.8 s (M) | not offered (M) | closed for this feature (OD-P9) | - | - |
| 14x14 Master (196) | no record; about 0.6 to 0.9 s (P) | 2.57 / 16.3 s, T1 0.39 s; 20 (M) | the same puzzles; with P6 2.2 s; mix 1.3 s if the kernel spike passes (P) | x1.17; mix x2.0 (P) | x0.27 to 0.41; mix x0.46 to 0.69 (P) |
| 26x26 Master (676) | 0.96 / 2.41 s, T1 0.39 s; 3 of 3 (M) | 8.36 / 16.6 s, T1 1.32 s; 20 (M) | the same puzzles; with P6 7.5 s; mix 4.6 s (P) | x1.11; mix x1.8 (P) | x0.13; mix x0.21 (P) |
| 10x10, 12x12 Master (100, 144) | 0.72 / 3.43 s and 0.75 / 1.68 s; 20 of 20 (M) | 9.0 / 16.4 s and 6.0 / 18.4 s; 20 (M) | the same puzzles; 3.6 to 8.0 s and 2.4 to 5.4 s, from P6 only through the optimistic mix (P) | x1.1 to 2.5 (P) | x0.1 to 0.3 (P) |
| Easy to Expert (6x10, 10x10, 12x12, 18x20) | 0.3 to 0.7 s; 85 to 100 % in band (M) | 0.3 to 1.5 s, at most 3 times `main`; the same in-band rates (M) | the same puzzles and times (the scope test) | x1 | as difficulty-v3 |

## 2. What the comparison can and cannot say

1. **The levels are not the same across the rating change.** `main` and difficulty-v3 share the level names and the
   numeric bands ([53, 77) for Nightmare, [77, 112) for Hell 1), but not the score. The v3 score needs about 8
   decisive guesses at Nightmare and 12 at Hell 1 (plan 2.2). Under the initial fit proposal (MP06c's knobs, not the
   tuple later locked), `main`'s Master puzzles stayed Master on 30 and 32 of 50 lines on 10x10 and 12x12, where 20
   and 11 rated higher, and on only 18 of 50 on 18x20, where 29 rated lower (`docs/difficulty-v3/fit-2026-11-12.md`,
   section 5). No record rates them under the locked tuple, or rates `main`'s Nightmare or Hell puzzles at all. So
   the "over `main`" column compares the same level name on the same board, not the same difficulty.
2. **`main`'s records.** Only GV2 (`main`'s generation code, Easy to Master on four boards) and the landscape slice
   of 2026-10-22 (10x10 Nightmare) have 20 seeds. The large boards come from the BQ-0 and BQ-1 to BQ-3 Node screens:
   three seeds per cell, so their p95 is the maximum. They and the landscape slice ran Node v24.21.0, GV2 and MP12b1
   Node v26.13.0, all on the same CPU model.
3. **"No record"** is written where `main` never ran the cell. The projection beside it is bounded by `main`'s
   measured neighbours (section 3); it is not a measurement.
4. **Plan v4.** Two to six seeds per cell. The one-sided 95 % lower bounds of completion are 37 % for 3 of 3, 61 %
   for 6 of 6 and 22 % for 2 of 2, so no completion claim exists yet. 14x14 and 15x15b10 use the 190 M screen arm,
   which ships only if rule (c5) admits its class; without it 14x14 measured 17.7 s (n 2), x6.4 over difficulty-v3.
   26x26 Nightmare's 11.9 s is also the 190 M arm; the default arm for 360 cells and more is unmeasured.
5. **The browser.** No browser figure of difficulty-v3 or plan v4 is measured. `main`'s Edge runs on the same server
   stayed within about 0.8 to 1.2 times its Node runs (for example 12x12 Nightmare 0.96 against 0.94 s, Hell 1
   26x26 22.2 against 24.0 s). The reference laptop is slower, which is why plan v4 reads the browser through its
   sensitivity `5 s + 4 x median`: a browser median of 60 s needs a Node T10 of about 13.75 s. 12x12's no-screen
   16.5 s gives about 71 s under it, above the target, unless the kernel gain arrives.

## 3. Basis

**`main`** (`9d45142`; every record below is on `main`'s ancestry or runs its generation code; M unless marked).

- GV2: `docs/difficulty-v3/probe-2026-11-12.md` section 2 and `docs/difficulty-v3/baseline-v2/` (MP06b, `3fd99ff`,
  20 seeds, Node v26.13.0). Between `main` and `3fd99ff` only the deduction core was added, which v2 does not use;
  the clue search, the generator and the v2 rating are `main`'s.
- 10x10 Nightmare: `docs/calibration/landscape-slice-2026-10-22.md` at `main` (`785c073`, 20 seeds).
- 12x12, 18x20, 22x22, 32x15: `docs/calibration/bq-2026-10-22-0-node.json` at `main` (BQ-0, `6e91263`, 3 seeds).
  24x24 and 26x26: `bq-2026-10-23-1-node-reduced3.json` and `-2-node-reduced3.json` (BQ-1, BQ-2, `5948723`, 3 seeds).
  After those commits `main`'s generation changed only by the completion pass for sets that run out of layouts
  (`1544408`), the browser client's main-thread slicing (`1c23b80`, after BQ-0) and interface work.
- Bounded projections (P), each the range of `main`'s measured T10 medians around the cell: Nightmare on 196 to 300
  cells, 1 to 4 s (10x10 1.0 s, 12x12 0.94 s, 18x20 3.84 s, 22x22 2.82 s, 32x15 2.93 s); Hell 1 20x20, 4 to 16 s
  (18x20 3.94 s, 22x22 7.42 s, 32x15 7.48 s, 24x24 15.49 s); 14x14 Master, 0.6 to 0.9 s (GV2 12x12 0.75 s and 18x20
  0.59 s; 22x22 0.74 s, 24x24 0.88 s).
- The rating change alone (difficulty-v3 over `main`, T10 medians; D, or P where `main` has no record): Master x13 on
  10x10, x8 on 12x12, x8.7 on 26x26; Nightmare x24 on 10x10, x66 on 12x12, x28 to 113 on 14x14 (P), x2.7 on 26x26;
  Hell 1 26x26 x4.5 with 9 of 20 completing. Easy to Expert at most x3
  (`docs/difficulty-v3/generator-state-2026-11-14.md` 3.6).

**difficulty-v3** (M): `docs/difficulty-v3/landscape-v3-full/` and `landscape-v3/r2/` (MP12b1, 20 seeds; the reduced
Hell 1 cells 3 seeds), the per-case reports' `t1` and `t10`. Offers: `core/engine/levels.js` and
`docs/difficulty-v3/availability-2026-11-15.md` at `e5bb721`.

**Plan v4.**

- `gen-v4` (M, provisional): plan section 4 and `evidence/provisional/summary.md` (IGP-01, IGP-03, IGP-03h). T1 is
  measured: 1.56, 1.91 and 2.42 s on 14x14, 15x15b10 and 26x26 Nightmare (`evidence/provisional/IGP-01/compare.md`,
  lines 23 to 26), and 6.21 and 7.15 s on Hell 1 26x26 and 20x20 (IGP-03h, n 2).
- Mix (P): `T = [T1 + gamma * (T10 - T1)] * (1 - g + g/k)`. The kernel term is 0.6088 central (`g` 0.95, `k` 1.7),
  0.4764 optimistic and 0.8038 pessimistic; `gamma` (the per-set prior, Hell 1 only) 0.8, 0.65 and 1.0. No credit for
  P5, P8, C3 or C4.
- Master (P): P6's paired factors on today's search, x1.12 to 1.18 (R22), on difficulty-v3's medians, then the kernel
  term. 14x14 and 26x26 are plan v4's own rows; 10x10 and 12x12 apply the same arithmetic and are not in the plan.
- Cells the plan leaves unpriced (P): 16x16 and 15x20 between 14x14's measured `gen-v4` time and today's time; the
  completion-passing boards of 324 to 576 cells between no gain (the no-regression gate allows down to x0.9) and the
  kernel term alone.

## 4. Offers

| Level | `main` | difficulty-v3 (`e5bb721`) | After plan v4 |
|---|---|---|---|
| Nightmare | every board of 81 cells or more | the same areas; 12x12, 14x14, 15x15b10, 16x16 and 15x20 complete fewer than 90 % of requests (a release-note limitation) | all five failing boards must pass phase 0's global gate on the arm their class ships (16x16 and 15x20 are unmeasured), then the validation on the production code, then the browser and offer gates; 12x12 needs the kernel gain for the browser median under the sensitivity |
| Hell 1 | 164 cells or more | withdrawn | candidates 26x26 and 20x20 (24x24 and 14x14 if their pilots pass); the other candidate boards stay unvalidated diagnostics (IG-P-Q33); any offer only after phase 3's landscape and browser runs (OD-P4) |
| Hell 2, Hell 3 | 266 and 450 cells or more | withdrawn | closed (OD-P9) |
| Very easy to Master | as their areas | the same areas | unchanged |

`main`'s limits were 484 cells on a desktop and 360 on a phone; 676 cells was an experimental opt-in.

## 5. In plain words

Plan v4 makes the difficulty-v3 generator much faster where difficulty-v3 is slowest, but it does not bring back the
speed of `main` at the same level names, because difficulty-v3's levels are much dearer to make. On the Nightmare
boards of 144 to 215 cells that fail today, ten puzzles take about 9 to 17 s in Node with the new search instead of
62 to 113 s: 4 to 13 times faster, or 6 to 21 times if the hoped-for kernel gain arrives. On 14x14 and 15x15b10 the
first puzzle comes after about 1.6 to 1.9 s instead of 43 s, and every provisional request completed. That is still
about 2 to 18 times slower than `main`'s Nightmare on those boards (about 1 to 4 s, made with the cheaper v2
rating), and up to 14 times slower with the kernel gain (at best equal). On 26x26, which already passes, Nightmare
gains 1.6 times, or 2.6 times with the kernel, which brings it back to about `main`'s 7 s; the other passing boards
are unmeasured and can gain at most about 2 times from the kernel. Master keeps difficulty-v3's puzzles and gains
1.1 to 2.5 times, which still leaves it about 1.5 to 11 times slower than `main`; Easy to Expert do not change. Hell
1, which difficulty-v3 withdrew, becomes possible again on 26x26 and 20x20: 34 to 43 s in Node, or 17 to 22 s with
the per-set prior and the kernel, against 24 s for `main`'s Hell 1 on 26x26 under the v2 rating. Nothing is
offerable yet: the five failing Nightmare boards need the frozen round's global gate (16x16 and 15x20 have not run
the new search), the validation on the production code and the browser and offer gates, and 12x12 also needs the
kernel gain; Hell 1 on 26x26 and 20x20 needs phase 3's landscape and browser runs. Hell 2 and Hell 3, which `main`
offered, stay closed. Every plan v4 number rests on two to six seeds per cell, in Node, before the freeze.
