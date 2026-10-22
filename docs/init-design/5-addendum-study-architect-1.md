# Phase 5 — Addendum study (architect-1)

This is an independent, evidence-based study of the user's requirement addendum (`docs/local/prompt.txt`, lines 43–52). It finalizes the values marked [P5] in `4-design-detail.md`:
- the piece count and size policy (§6.4);
- the score, bands and level windows (§7);
- the maximum board size, budgets and memory (§6.4(d), §8.3, §8.5).

Evidence comes from a prototype of the unified pipeline, kept outside the repository. Times are wall-clock times in Node unless stated otherwise. "Set + 1" is the Generate Piece Set action, which includes calibration puzzle #1. "Set + 10" is that action followed by New Puzzles with q = 10.

## 0. Recommendations (summary)

| # | Topic | Recommendation |
|---|---|---|
| 1 | One score (`difficulty-v2`) | D = round(2·U + 8·log10(1 + B̂)), with B̂ = min(B, 5,000). Drop R and H: both grow with board area, which caused the over-rating (§3.1). B saturates at the cap, so D is exact and no "≥ D" is needed. |
| 2 | Bands that scale | Geometric ladder: e_L = round(10 · 1.45^(L − 1.5)). The bands are hard [17, 25), master [37, 53), hell-1 [77, 112), hell-2 [112, 162) and hell-3 [162, 235). Hell-n is level 6 + n, so the ladder is open-ended (§3.3). |
| 3 | Piece count | K_mid = min(K60[L] · (A/60)^0.28, Kcap[L]), with range ±max(0.75, 6 %), clamped to [⌈0.75·√A⌉, min(⌊A/4.5⌋, Kfeas(A))] (§4). It reproduces the user's examples 60/easy 7–8, 60/master (12–13 of the suggested 11–13) and 360/hard 16–18. The fourth example, 360/hell-1, becomes 34–39 instead of 40–42 (§3.4). |
| 4 | Level windows | The lowest level is very-easy up to 87 cells, easy up to 215, normal up to 348, then hard. The highest is master (59–80 cells), nightmare (81–145), hell-1 (146–265), hell-2 (266–449), then hell-3 (450–484 within the cap) (§4.2). |
| 5 | Pre-placed pieces | Initial share g_L = max(0.04, 0.62 − 0.08·L), then adapted by the clue search. Measured G: 3–8 at very-easy … expert, 2–6 at master and nightmare, 1–6 at hell levels. |
| 6 | Maximum board | `maxActive = 484` cells (e.g. 22×22, 40×12, 32×15) and `maxSide = 40` (§6.3). Worst set + 10 is 28.1 s in Node, ≈ 70 s in a browser after the 2.5× safety factor (hard limit 120 s). The median at 484 cells is 8.3 s (≈ 21 s in a browser; target 60 s). Peak RSS is ≤ 1.41 GB. Boards of 576–676 cells pass the time limit but exceed the memory margin. |
| 7 | New finding: one arrangement | Carved sets with a mean piece size ≥ 7.5 cells had exactly one arrangement in 26 of 28 samples, and two in the other 2. That covers very-easy … normal on small boards and every level up to hell-1 on boards of ≥ ~256 cells. For those, "New Puzzles" cannot change the arrangement; only the pre-placed pieces can differ. **This needs a user decision (Q1, §5).** |
| 8 | Budgets and batch rules | Keep 60 s / 120 s per action. Other changes: LNS on 6–13-piece neighbourhoods; certificates 10,000 rows (≤ 200 cells) or 2,000 rows above that, computed lazily; random restarts only up to 150 cells; dPref = clamp(⌈K/4⌉, 3, 10); clue-variant fallback; `maxNodes` 1.6 M (§7). |

## 1. Method

### 1.1 Prototype

The prototype re-implements the pipeline of `4-design-detail.md`:
- carving with residual subset-sum pruning (§6.5);
- typed-array DLX with canonical and seeded modes, branch/row caps and pre-selected clues (§6.6);
- LNS (§6.7), layout/clue keys and distance (§6.8);
- the deterministic batch fold with speculative attempts (§6.9);
- count-guided + beam clue selection with ≤ 64 ratings (§6.10);
- certificates (§6.11);
- a pool with terminate-and-respawn cancellation (§8.1, §8.4).

Deviations: mulberry32 instead of xoshiro128**, and the score weights are configurable. Neither affects timing.

### 1.2 Machine and safety factor

| Item | Value |
|---|---|
| CPU | AMD EPYC 7763 VM, 8 cores / 16 threads, 2.45 GHz base |
| Software | Windows, Node 24.21.0 (V8, the same engine as Chrome) |
| Pool | 4 `worker_threads`, each limited to `maxOldGenerationSizeMb` 256; main thread `--max-old-space-size=2048` |
| Memory measure | Peak process RSS (main thread + 4 workers), sampled every 100 ms. Clean values come from one process per run (tags F, X, W). |
| Safety factor | **2.5×** for a mid-range 4-core laptop browser: CPU and thermal throttling ≈ 1.5×, browser engine / GC / scheduling ≈ 1.6×. Phones are ≈ 4–5× (informative only). |

Pass criteria in Node, which encode the browser limits after the safety factor:

| Criterion | Browser limit | Node equivalent |
|---|---|---|
| Hard limit | 120 s | p95 ≤ 48 s |
| Target | 60 s | p50 ≤ 24 s |
| Memory | 2 GB | peak RSS ≤ 1.5 GB (25 % margin) |

### 1.3 Experiments

| Id | Content | Size |
|---|---|---|
| A | Score landscape. 12 boards of 60–484 cells (including 3 hearts); mean piece size 4.6–24; clue shares 5–75 %; random clue subsets; certificates with 20,000 rows. Run on 8 workers. | 247 sets (5 carve failures), 3,458 ratings |
| B | Full pipeline (set + 10) on every offered level of 6×10, 10×10, 12×12 and 14×14 (3 seeds), and on 4–5 levels of 16×16 … 22×22 (2 seeds). Two groups ran concurrently on 8 physical cores, so these timings are slightly pessimistic. | 46 cells, 116 runs |
| F / X / W | Final policy, one process per run: <br>• F: hell levels on 360–576 cells (3 seeds); <br>• X: extended boards of 484–784 cells; <br>• W: elongated 40×12 and 32×15 boards. | 30 + 16 + 6 runs |
| T | Tiling counts per set: exhaustive DLX, cap 400 raw solutions, 2 M rows. | 52 sets |
| L | LNS neighbourhood sweep from the carved witness. | 6 sets × 12 settings × 12 steps |

## 2. Feasibility math

### 2.1 Distinct pieces that exist

| Cells n | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|
| Free polyominoes (OEIS A000105) | 2 | 5 | 12 | 35 | 108 | 369 | 1,285 | 4,655 |
| With holes (OEIS A001419) | 0 | 0 | 0 | 0 | 1 | 6 | 37 | 195 |
| Hole-free (usable) | 2 | 5 | 12 | 35 | 107 | 363 | 1,248 | 4,460 |

Consequences:
- Only **7** distinct pieces have 3–4 cells. Distinctness alone therefore limits small pieces to 7; from K ≥ 18 on, the 40 % small-piece cap no longer binds.
- **Minimum area for K distinct pieces** (smallest sizes first, with the small-piece cap):

  | K | 6 | 8 | 10 | 12 | 13 | 16 | 18 | 20 | 24 | 30 | 36 | 42 | 48 | 54 | 60 | 66 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | minArea | 26 | 35 | 44 | 54 | 58 | 72 | 81 | 92 | 116 | 152 | 188 | 224 | 260 | 296 | 338 | 380 |

  Without the cap, minArea = 5K − 9 for 7 ≤ K ≤ 19.
- **Largest feasible K** for an area A:

  | A | 60 | 75 | 100 | 144 | 196 | 256 | 300 | 324 | 360 | 400 | 484 |
  |---|---|---|---|---|---|---|---|---|---|---|---|
  | Kfeas(A) | 13 | 16 | 21 | 28 | 37 | 47 | 54 | 58 | 63 | 68 | 80 |

### 2.2 The concrete "not too many small pieces" rule

The original requirement also asks for "not too few large pieces".

| Rule | Value | Effect |
|---|---|---|
| Minimum size | 3 cells | Requirement. |
| Small pieces (3–4 cells) | ≤ ⌊0.4·K⌋, and ≤ 7 by distinctness | The 60-cell master set (K = 13) may use at most 5 small pieces. |
| Mean size | s̄ = A/K ≥ 4.5, i.e. K ≤ ⌊A/4.5⌋ | Allows the user's 13 pieces on 60 cells; forbids sets made mostly of trominoes and tetrominoes. |
| Spread | \|size − s̄\| ≤ max(2.5, 0.35·s̄); size ≤ max(10, ⌈1.6·s̄⌉) | No tiny pieces among large ones. |
| Large-piece preference | ≥ ⌈0.2·K⌉ pieces of ≥ 6 cells when s̄ ≥ 5.5 | Unchanged from 4-design-detail §6.4. |
| Not too few large pieces | K ≥ Kmin(A) = ⌈0.75·√A⌉, i.e. s̄ ≤ 1.33·√A | 360 cells needs K ≥ 15, which is why "hard is the lowest" level there. |

So **Kmax(A) = min(⌊A/4.5⌋, Kfeas(A))**.

Carving is cheap: a median ≤ 0.1 s per attempt. It costs 1–15 s and needs several attempts only when K ≥ ~85 % of Kfeas (Stage A). In the offered windows that happens only for hell-2 and hell-3 near their lowest areas. Example: 484-cell hell-3 needed up to 22 set attempts and 5.7 s (A.7).

## 3. One score for all board sizes

### 3.1 Why the provisional formula over-rates large boards

For the same task, R (free cells) and H (mean log2 placements) grow with area:
- R is proportional to area;
- at the same clue share, H rises from about 6–7 bits on 60 cells to 9–11 bits on 360–484 cells (Stage A), because large boards have more placements per piece.

The table below rates the same Stage-A configurations with the old and the new formula.

| Configuration (Stage A medians) | U | Old D (old bands) | New D (new bands) |
|---|---|---|---|
| 60 cells, K 7–8, G 3–5 — user: easy | 3–4 | 23 (easy) | 8 (easy) |
| 60 cells, K 12–13, G 1–3 — user: master | 10–12 | 73 (expert) | 42 (master) |
| 360 cells, K 15–18, G 5–8 — user: hard | 8–13 | 67 (expert) | 20 (hard) |
| 360 cells, K 40–45, G 2–5 — user: hell-1 | 36–43 | 182 (hell-5) | 106 (hell-1) |
| 400 cells, K 17–20, G 5–9 | 9–14 | 83 (master) | 27 (expert) |

### 3.2 Formula `difficulty-v2`

```text
D  = round(2·U + 8·log10(1 + B̂))
B̂  = min(B, 5,000)                     // B = branchTrials of the canonical traversal (§6.6)
If the traversal stops at 5,000 branch trials or 50,000 row trials before its first solution: B̂ = 5,000.
```

- **Area-neutral inputs.** U and B are counts that do not scale with area. B carries the "small pieces have many placements" ambiguity that H tried to capture.
- **Exact by definition.** B̂ saturates, so D is exact and the B term is at most 29.6. This removes the "censored ⇒ ≥ D" acceptance rule of §7.3. A saturated rating is deterministic and comparable.
- **Hell levels on large boards.** Beyond about 25 pieces to place, B is almost always saturated, so D ≈ 2U + 30. Difficulty is then the number of pieces to place, which is what the addendum asks for.
- **Rating cost** (one capped traversal, single thread, Stage A):
  - uncensored ratings: median ≤ 32 ms on every board;
  - saturated ratings, median / p90: 0.06 / 0.06 s (60 cells), 0.2 / 0.5 s (196), 0.5 / 1.3 s (360), 0.8 / 2.7 s (484). See A.1.

### 3.3 Bands that scale

e_0 = 0, e_L = round(10 · 1.45^(L − 1.5)) for L ≥ 1, and levelOf(D) = max{L : e_L ≤ D}.

| L | Level | Band | Initial clue share g_L | Pieces to place in the saturated regime |
|---|---|---|---|---|
| 0 | very-easy | [0, 8) | 62 % | — |
| 1 | easy | [8, 12) | 54 % | — |
| 2 | normal | [12, 17) | 46 % | — |
| 3 | hard | [17, 25) | 38 % | — |
| 4 | expert | [25, 37) | 30 % | — |
| 5 | master | [37, 53) | 22 % | — |
| 6 | nightmare | [53, 77) | 14 % | 12–23 |
| 7 | hell-1 | [77, 112) | 6 % | 24–40 |
| 8 | hell-2 | [112, 162) | 4 % | 41–65 |
| 9 | hell-3 | [162, 235) | 4 % | 66–102 |
| 6 + n | hell-n | [e_(6+n), e_(7+n)) | 4 % | about × 1.45 per step |

**Why the ratio is 1.45.** The user's examples bound the ratio to 1.38–1.50:
- 60-cell master must be reachable, but 60-cell nightmare must not (the highest D at 60 cells is ≈ 53);
- 360-cell hard must sit about two levels below 60-cell master;
- 360-cell hell-1 must hold K ≈ 35–42.

Hell-3 and above are simply further steps of the same ladder; no special definition is needed.

### 3.4 User examples against measurements (Stage B / F)

| User example (unverified) | Recommended K | Measured | Verdict |
|---|---|---|---|
| 60 cells, easy 7–8 | 7–8 | K 7–8, G 3–4, D 8–11 | Holds. Only 2–6 distinct puzzles per set (single arrangement, §5). |
| 60 cells, master 11–13, highest level | 12–13 | K 12–13, G 2–3, D 37–45, 10/10 puzzles. Nightmare is unreachable (D ≤ 53). | Holds; K = 11 is expert. |
| 360 cells, hard 16–18, lowest level | 16–18 | K 17, G 6–7, D 20–24, 10/10 puzzles. Normal is not offered (Kmin = 15 > 14.0). | Holds. |
| 360 cells, hell-1 40–42 | 34–39 | K 37–39: D 96–106, set + 10 in 6–9 s. K 42: D 110, at the band's top edge; under the original batch rules only 1 of 10 puzzles in 120 s. | **Adjust** to 34–39. K 40–42 stays in hell-1 only with ≥ 2 pre-placed pieces, and sits at the top edge unless 10–25 % are pre-placed. |

## 4. Piece count K(level, area) and level windows

### 4.1 Formula

```text
K_mid(L, A) = min(K60[L] · (A / 60)^0.28, Kcap[L])
w           = max(0.75, 0.06 · K_mid)
K range     = [max(Kmin(A), round(K_mid − w)),  min(Kmax(A), round(K_mid + w))]
Kmin(A)     = ⌈0.75 · √A⌉;   Kmax(A) = min(⌊A / 4.5⌋, Kfeas(A))
offered(L, A)  ⇔  Kmin(A) − 0.5 ≤ K_mid ≤ Kmax(A)
               and 2·(Kmax(A) − 1) + 30 ≥ e_L + 8        // the band must be reachable with margin
G0          = clamp(round(g_L · K), 1, K − 2)            // then adapted by the clue search (§6.10)
```

| L | VE | E | N | H | X | M | NM | H1 | H2 | H3 | H4 | H5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| K60[L] | 6 | 7.5 | 8.5 | 10 | 11.5 | 13 | 16 | 22 | 32 | 43 | 58 | 78 |
| Kcap[L] | — | — | — | — | — | — | — | 37 | 60 | 90 | 140 | 210 |

How the parameters were set:
- **Exponent 0.28.** Fitted to the Stage-A-derived windows: easy 0.28, hard 0.28, master 0.31, nightmare 0.26 (A.3). Smaller pieces on smaller boards produce more search (B), so a level needs fewer pieces there.
- **Kcap.** In the saturated regime D ≈ 2U + 30, so the K that a hell band needs no longer depends on area. Without the cap, hell-1 drifted to the top edge (D = 110) at ≥ 484 cells and timed out at 576 cells (A.7).
- **K60[hell-1] = 22.** It centres hell-1 at D ≈ 95–105. The value 24 was tried first, to reproduce the user's 40–42, and was rejected for the reason above.

### 4.2 Windows: offered levels and K ranges

| Cells | Kmin–Kmax | Offered levels (K range) |
|---|---|---|
| 36 (6×6) | 5–8 | VE 5–6 · E 6–7 · N 7–8 |
| 60 (6×10) | 6–13 | VE 6–7 · E 7–8 · N 8–9 · H 9–11 · X 11–12 · M 12–13 |
| 100 (10×10) | 8–21 | E 8–9 · N 9–11 · H 11–12 · X 12–14 · M 14–16 · NM 17–20 |
| 144 (12×12) | 9–28 | E 9–10 · N 10–12 · H 12–14 · X 14–16 · M 16–18 · NM 19–22 |
| 196 (14×14) | 11–37 | N 11–13 · H 13–15 · X 15–17 · M 17–19 · NM 21–24 · H1 29–32 |
| 256 (16×16) | 12–47 | N 12–14 · H 14–16 · X 16–18 · M 18–21 · NM 23–25 · H1 31–35 |
| 324 (18×18) | 14–58 | N 14 · H 15–17 · X 17–20 · M 20–22 · NM 24–27 · H1 33–37 · H2 48–54 |
| 360 (18×20) | 15–63 | H 16–18 · X 18–20 · M 20–23 · NM 25–28 · H1 34–39 · H2 50–56 |
| 400 (20×20) | 15–68 | H 16–18 · X 18–21 · M 21–23 · NM 26–29 · H1 35–39 · H2 51–58 |
| 484 (22×22) | 17–80 | H 17–19 · X 19–22 · M 22–25 · NM 27–30 · H1 35–39 · H2 54–61 · H3 73–80 |

The lowest and highest offered levels as a function of area:

| Bound | Rule |
|---|---|
| Lowest level | very-easy for A ≤ 87; easy for 88–215; normal for 216–348; hard for 349–784 |
| Highest level | master for 59–80; nightmare for 81–145; hell-1 for 146–265; hell-2 for 266–449; hell-3 for 450–743 (and within the 484 cap); hell-4 would need A ≥ 744 |

At 784 cells, hell-4 failed to produce a set in 400 attempts (86 s); the area cap of §6.3 excludes it anyway. Levels outside a board's window stay visible but disabled, as in 4-design-detail §7.5.

### 4.3 Piece-size ranges per level

Sizes follow from s̄ = A/K and the spread rule (§2.2). Typical values:

| Board | Level | Sizes (cells) |
|---|---|---|
| 60 cells | easy | 5–10 |
| 60 cells | master | 3–7 |
| 360 cells | hard | 14–28 |
| 360 cells | hell-1 | 6–12 |
| 484 cells | hell-3 | 4–9 |

The full matrix is in §8.

## 5. New Puzzles on large-piece sets (new finding)

### 5.1 Evidence

1. **Tiling counts (T).** Mean piece size ≥ 7.5 cells (very-easy … normal on small boards; every level up to hell-1 on boards of ≥ ~256 cells):
   - 26 of 28 carved sets had exactly **one** arrangement up to board symmetry;
   - the other 2 had two arrangements.

   Mean size ≤ 7.1:
   - all 24 sets had ≥ 2 arrangements;
   - 22 of them had ≥ 10.

   Big irregular pieces interlock like a jigsaw (A.4).
2. **LNS (L).** Re-tiling neighbourhoods of 4–16 pieces from the witness succeeded in **0 %** of steps when s̄ ≥ 8.6. With s̄ = 6.5–6.8 it succeeded in 0–58 % of steps (median ≈ 12 %). A step costs 1–60 ms at ≤ 5,000 rows and ≤ 13 pieces (A.5).
3. **Pilot run with the 4-design-detail batch rules** (360 cells, hell-1, K = 42):
   - **1 of 10** puzzles in 120 s;
   - 168 s of LNS CPU time produced no new arrangement.

### 5.2 Policy used in Stage B / F (proposed for §6.9)

- **Arrangement variants.** When s̄ < 7.5, run LNS: neighbourhood k = 6–13 pieces (+2 per 4 stuck steps), 5,000 rows, 8 steps, from the witness.
- **Clue variants.** Same arrangement, different pre-placed pieces. Allowed immediately when s̄ ≥ 7.5, otherwise after 3 failed attempts in the slot.
  - Each clue set must differ from every earlier clue set on that arrangement in ≥ ⌈G/2⌉ pieces.
  - The score band still applies.
  - **Fix found in runs F and X:** a new arrangement that is "too close" must also be accepted as a variant after 3 attempts. Two runs stopped early because of this: 20×20 hell-2 at 2 of 10, and 24×24 hell-3 at 8 of 10.
- **Outcome.**
  - 77 % of the 1,164 batch puzzles were clue variants.
  - All arrangement variants came from levels with s̄ < 7.5.
  - Low-level sets returned only 2–9 distinct puzzles, i.e. partial results: the clue-variant space is small. This covers very-easy … normal everywhere, and hard on some boards.
- **Side effect: uniqueness comes free.** Single-arrangement sets give unique puzzles. No accepted puzzle on boards of ≥ 324 cells had "multiple" solutions. Certificates there are cheap (≤ 30 ms) when U is small, and "not proved" within budget when U > ~25 (A.2).

### 5.3 Decision needed

The original requirement says New Puzzles "only changes how the pieces are arranged on the board". For single-arrangement sets that is impossible, and a player who solved puzzle #1 already knows the solution of a clue variant. Options:

| Option | Description |
|---|---|
| (a) | Accept clue variants as "different puzzles", labelled "Same arrangement — different starting pieces", and offer "Generate a new piece set" for genuinely new arrangements. **Recommended.** |
| (b) | Raise K on low levels so that s̄ < 7.5 (e.g. 60 cells: easy with 9–10 pieces and more clues). This contradicts the user's "easy = few pieces" and is impossible on large boards: 360 cells would need K ≥ 48. |
| (c) | Count only new arrangements, and return partial results with an explanation. |

## 6. Benchmarks

### 6.1 By area: all offered levels pooled, final policy

| Area (board) | Runs | Levels | Set + 1 s: p50 / p95 / max | Set + 10 s: p50 / p95 / max | 10/10 complete | Peak RSS (fresh process) |
|---|---|---|---|---|---|---|
| 60 (6×10) | 18 | 6 | 0.1 / 0.4 / 0.4 | 0.5 / 2.6 / 2.6 | 10/18 † | ≤ 0.2 GB ‡ |
| 100 (10×10) | 18 | 6 | 0.4 / 0.8 / 0.8 | 0.7 / 15.1 / 15.1 | 11/18 † | ≤ 0.3 GB ‡ |
| 144 (12×12) | 18 | 6 | 0.7 / 2.4 / 2.4 | 1.1 / 29.8 / 29.8 | 10/18 † | ≤ 0.4 GB ‡ |
| 196 (14×14) | 18 | 6 | 1.7 / 2.5 / 2.5 | 2.5 / 8.6 / 8.6 | 14/18 † | ≤ 0.5 GB ‡ |
| 256 (16×16) | 8 | 4 | 1.9 / 4.3 / 4.3 | 4.7 / 17.9 / 17.9 | 6/8 † | ≤ 0.7 GB ‡ |
| 324 (18×18) | 8 | 4 | 2.3 / 7.1 / 7.1 | 7.7 / 12.0 / 12.0 | 6/8 † | ≤ 0.9 GB ‡ |
| 360 (18×20) | 12 | 5 | 1.5 / 8.7 / 8.7 | 7.4 / 10.2 / 10.2 | 12/12 | 1.02 GB |
| 400 (20×20) | 10 | 4 | 1.4 / 2.9 / 2.9 | 6.0 / 13.7 / 13.7 | 9/10 | 1.20 GB |
| **484 (22×22)** | 15 | 5 | 1.9 / 6.1 / 6.1 | 8.3 / 28.1 / 28.1 | 13/15 | **1.41 GB** |
| 480 (40×12, 32×15) | 6 | 2 | 4.2 / 4.7 / 4.7 | 13.5 / 22.4 / 22.4 | 6/6 | 1.41 GB |
| 576 (24×24) | 13 | 3 | 4.1 / 8.8 / 8.8 | 21.4 / 38.4 / 38.4 | 12/13 | **1.81 GB** |
| 676 (26×26) | 5 | 5 | 2.6 / 12.7 / 12.7 | 11.0 / 44.2 / 44.2 | 4/5 † | 1.66 GB |
| 784 (28×28) | 5 | 5 | 4.5 / — / 9.4 | 17.0 / — / 44.7 | 4/5 | **2.32 GB**; hell-4 set failed |

- † Incomplete runs are partial results at low levels (§5), or the fold-rule issue of §5.2 (two hell runs). None hit the time limit.
- ‡ Stage-B processes ran many cells in sequence, so their RSS is a cumulative upper bound.
- With n < 20 per area, p95 equals the maximum.

**Worst (board, level) cells**, set + 10, median / max:

| Board | Level | Set + 10 (s) |
|---|---|---|
| 484 | hell-1 | 24.6 / 28.1 |
| 576 | hell-1 | 29.3 / 38.4 |
| 676 | hell-1 | 44.2 |
| 784 | hell-2 | 44.7 |
| 144 | nightmare | 11.8 / 29.8 (LNS-heavy, s̄ = 7.2) |

Every other cell up to 484 cells stays ≤ 18 s.

### 6.2 Where the time goes on large boards

At hell levels on ≥ 484 cells, each candidate costs:
- usually one saturated rating, at 0.6–4.1 s;
- one certificate at 0.5–2.3 s, even with only 2,000 rows (row trials run at ≈ 1–4 k/s on these 1.3–4 M-node models), and it is almost always "not proved".

Making certificates lazy (§7.2) removes ≈ 35 % of the batch CPU time there.

### 6.3 Maximum board size

| Area | Node set + 10, max | Browser estimate (×2.5) | Peak RSS | Verdict |
|---|---|---|---|---|
| 400 | 13.7 s | 34 s | 1.20 GB | OK |
| **484** | 28.1 s | 70 s (p50 21 s) | 1.41 GB | **OK on all criteria → `maxActive = 484`** |
| 576 | 38.4 s | 96 s (p50 54 s) | 1.81 GB | Time OK, memory over margin (hell-3) |
| 676 | 44.2 s | 110 s | 1.66 GB | Time near the hard limit, memory over margin |
| 784 | 44.7 s | 112 s | 2.32 GB | Fails on memory; hell-4 infeasible |

- **Max dimension.** Elongated boards of the same area (40×12, 32×15) behave like 22×22. `maxSide = 40` is safe; it is a rendering/UX bound, not a compute bound.
- **Rotated display.** At 45° the bounding box is (W + H)/√2 cells wide, so 22×22 needs ≈ 31 cell widths.
- **Raising the cap later.** Memory, not time, binds. A leaner engine could make 576 cells feasible: flat `Int32Array` rows instead of JS row arrays plus a `Map`, and one model per worker. Re-measure in the browser harness (§8.7) before raising `maxActive`.

## 7. Workers, budgets, timeouts, cancellation

### 7.1 Strategy (keeps 4-design-detail §8.1–§8.2)

- **Pool size.** min(4, `hardwareConcurrency`).
- **Set attempts.** Attempts j = 0, 1, … run 4-wide and the lowest successful j wins (deterministic). Measured: median 2 attempts, maximum 22 (484/hell-3).
- **Batch.** The fold consumes candidates in (slot, attempt) order while workers speculate 4 candidates ahead. Results do not depend on pool size.
- **Model cache.** One model per worker. A model is built once per set (0.1–0.3 s at 484 cells).
- **Cancellation.** `terminate()` plus a lazy respawn. Measured while 4 workers were carving 24×24 hell-3 sets:
  - `cancelAll` settled every pending task in 2.7 ms;
  - a respawned worker finished its next task 18 ms later.

### 7.2 Budgets (replace the [P5] values of §8.3)

| Key | Provisional value | Recommended value | Evidence |
|---|---|---|---|
| `rateBranch` / `rateRows` | 50,000 / 200,000 | **5,000 / 50,000**, saturating (§3.2) | A saturated rating costs ≤ 4.2 s at 484 cells (A.1) |
| `countRows` (certificate) | 200,000 | **10,000 if A ≤ 200, else 2,000**. Computed lazily after the batch, never blocking acceptance in 'any' mode. 'require' mode is practical for A ≤ 200, or below hell levels. | Above 200 cells: hell-level certificates were "not proved" in 639 of 670 cases; other levels were "unique" in 245 of 252 (single arrangement) (A.2) |
| `lnsRows` / steps / neighbourhood | 30,000 / 8·(a + 1) / 30–90 % of K | **5,000 / 8 / 6–13 pieces** (+2 per 4 stuck steps) | A.5; the pilot's 168 s of LNS found nothing |
| Random restarts | every 3rd attempt, 2,000,000 rows | **only for A ≤ 150**, 100,000 rows | Failed at 360 cells after 100,000 rows (≈ 10 s) |
| `dPref` | max(3, ⌈K/3⌉) | **clamp(⌈K/4⌉, 3, 10)**; −1 per 4 rejections | 38 rejections at K = 75 with the old rule |
| Clue-variant fallback | — | **s̄ ≥ 7.5, or after 3 failed attempts** (pending Q1) | §5 |
| `slotAttempts` / `clueSubsets` / `carveSteps` | 12 / 64 / 6,000 | unchanged | Sufficient in all offered windows |
| `timeStandardMs` / `timeExtendedMs` | 60,000 / 120,000 per action | unchanged | Measured maximum is 28.1 s for set + 10 in Node |
| `maxNodes` | 3,000,000 | **1,600,000** | Measured 1.30–1.48 M nodes at the top levels of 480–484 cells |
| `LIMITS.maxActive` / `maxSide` | 360 / 40 | **484 / 40** | §6.3 |

### 7.3 Behaviour on exhaustion

These rules stay as in 4-design-detail §6.5, §6.9 and §8.4:
- **Set phase.** At the soft limit, show "Couldn't create a <level> piece set within 1 min", with the choices *Try longer (2 min)*, *lower level* or *smaller board*. At the hard limit, stop.
- **Batch phase.** Keep the accepted puzzles and report `partial` with a reason: `time-limit`, `layouts-not-found`, `difficulty-not-found` or `uniqueness-not-proved`.
- **New reason** `variants-exhausted`. The UI says: "This piece set allows only N different <level> puzzles — generate a new piece set for more."
- **Cancel** terminates the workers. Accepted results are kept.

## 8. Final recommended table (area bands × levels)

Each cell gives K range · initial pre-placed G · piece sizes. When a level is offered for only part of a band, the sub-range of areas is shown in brackets.

| Level | 36–80 | 81–130 | 131–200 | 201–300 | 301–420 | 421–484 |
|---|---|---|---|---|---|---|
| very-easy | 5–7 · 3–4 · 4–15 | 7 · 4 · 8–16 [≤ 87] | — | — | — | — |
| easy | 6–9 · 3–5 · 3–15 | 7–10 · 4–5 · 6–19 | 9–11 · 5–6 · 9–24 | 11 · 6 · 12–26 [≤ 215] | — | — |
| normal | 7–10 · 3–5 · 3–13 | 8–11 · 4–5 · 6–17 | 10–13 · 5–6 · 8–24 | 11–14 · 5–6 · 11–31 | 14–15 · 6–7 · 15–33 [≤ 348] | — |
| hard | 8–12 · 3–5 · 3–10 [≥ 41] | 10–13 · 4–5 · 5–15 | 12–15 · 5–6 · 7–20 | 13–17 · 5–6 · 9–27 | 15–18 · 6–7 · 12–35 | 16–19 · 6–7 · 16–38 |
| expert | 10–13 · 3–4 · 3–9 [≥ 50] | 12–15 · 4–5 · 4–13 | 13–17 · 4–5 · 6–18 | 15–19 · 5–6 · 8–23 | 17–21 · 5–6 · 11–30 | 19–22 · 6–7 · 14–34 |
| master | 12–15 · 3 · 3–8 [≥ 59] | 13–17 · 3–4 · 3–11 | 15–19 · 3–4 · 6–15 | 17–22 · 4–5 · 7–21 | 19–24 · 4–5 · 9–27 | 21–25 · 5 · 12–29 |
| nightmare | — | 16–21 · 2–3 · 3–9 | 19–24 · 3 · 4–12 | 21–27 · 3–4 · 6–17 | 24–29 · 3–4 · 8–21 | 26–30 · 4 · 10–24 |
| hell-1 | — | — | 27–33 · 2 · 3–9 [≥ 146] | 29–37 · 2 · 4–12 | 32–39 · 2 · 6–16 | 35–39 · 2 · 8–18 |
| hell-2 | — | — | — | 46–53 · 2 · 3–8 [≥ 266] | 47–58 · 2 · 4–10 | 52–61 · 2 · 5–12 |
| hell-3 | — | — | — | — | — | 71–80 · 3 · 4–9 [≥ 450] |

- G is the initial value. The clue search moves it to hit the band; measured final G was 1–8 overall and 1–6 at hell levels.
- Very-easy … normal sets (and hard sets on some boards) typically yield only 2–9 distinct puzzles (§5).

**Expected time, set + 10.** Node median / maximum, with the worst Generate Piece Set time in brackets. Browser estimate = ×2.5.

| Level group | 36–80 | 81–130 | 131–200 | 201–300 | 301–420 | 421–484 |
|---|---|---|---|---|---|---|
| very-easy … expert | 0.3 / 2.6 (≤ 0.2) | 0.4 / 15.1 (≤ 0.8) | 0.5 / 2.8 (≤ 2.5) | 0.4 / 0.7 (≤ 0.2) | 1.0 / 1.8 (≤ 1.1) | 1.1 / 1.2 (≤ 0.4) |
| master, nightmare | 0.8 / 0.9 (≤ 0.4) | 2.5 / 4.0 (≤ 0.5) | 3.6 / 29.8 (≤ 2.4) | 4.7 / 11.2 (≤ 4.3) | 3.6 / 10.2 (≤ 8.7) | 1.3 / 1.4 (≤ 0.6) |
| hell-1 | — | — | 6.7 / 8.3 (≤ 1.7) | 8.2 / 17.9 (≤ 2.1) | 9.5 / 12.0 (≤ 3.4) | 22.4 / 28.1 (≤ 6.1) |
| hell-2, hell-3 | — | — | — | — | 8.6 / 13.7 (≤ 2.3) | 8.3 / 15.9 (≤ 5.7) |

## 9. Changes proposed for `4-design-detail.md` (next phase)

1. **§7.1–§7.3.** Use `difficulty-v2` (§3.2). Keep R and H as diagnostics only. Replace censoring with saturation, so the "≥ D" display and the censored acceptance rule disappear.
2. **§7.4 / §7.5.** Use the band formula and the share formula (§3.3), the window rule (§4.1), and the table of §4.2. Remove the "experimental above 120 cells" label once the browser bench confirms.
3. **§6.4.**
   - Replace the anchor table with the K formula, Kmin and Kmax.
   - Add the s̄ ≥ 4.5 rule.
   - Set `LIMITS.maxActive = 484` and `maxSide = 40`.
4. **§6.7 / §6.9.**
   - LNS parameters.
   - Restarts only up to 150 cells.
   - dPref = clamp(⌈K/4⌉, 3, 10).
   - Clue-variant fallback, including the "too close ⇒ variant" fix (pending Q1).
   - The `variants-exhausted` reason.
5. **§6.11 / §8.3.**
   - Lazy certificates with the area-dependent row budget.
   - 'require' mode recommended only for A ≤ 200 or below hell levels; elsewhere expect `uniqueness-not-proved`.
   - `maxNodes` 1.6 M.
6. **§8.7.** Repeat the benchmark in the browser harness to replace the 2.5× assumption. Measure per-worker memory with `performance.measureUserAgentSpecificMemory()`. Browsers have no per-worker heap cap, unlike these runs.

## 10. Open questions for the user

| # | Question | Recommendation |
|---|---|---|
| Q1 | Many piece sets have only one arrangement: very-easy … normal on small boards, and every level up to hell-1 on boards of ≥ ~256 cells. For those, may "New Puzzles" return clue variants — same final picture, different pre-placed pieces — clearly labelled? | Yes, labelled, plus a "Generate a new piece set" shortcut (§5.3 (a)). |
| Q2 | Accept hell-1 on 360 cells = 34–39 pieces instead of 40–42? | Yes. 40–42 pushes the score to the top edge of hell-1 and slows generation (§3.4). |

## Appendix A. Raw numbers

### A.1 Rating cost by area

Stage A: one capped canonical traversal (5,000 branch / 50,000 rows). Stage A ran 8 workers concurrently, so these times are slightly high.

| Cells | Uncensored ms: p50 / p90 | Saturated ms: p50 / p90 / max | Saturated share |
|---|---|---|---|
| 60 | 0.3 / 6 | 61 / 61 / 71 | 3 / 280 |
| 75 | 0.3 / 6 | 56 / 62 / 81 | 12 / 280 |
| 100 | 0.6 / 14 | 130 / 201 / 240 | 18 / 336 |
| 144 | 1.5 / 8 | 126 / 294 / 585 | 54 / 308 |
| 196 | 3 / 12 | 196 / 476 / 679 | 78 / 308 |
| 256 | 6 / 39 | 301 / 777 / 1,217 | 79 / 294 |
| 300 | 8 / 31 | 385 / 942 / 1,790 | 81 / 280 |
| 324 | 11 / 39 | 441 / 1,023 / 2,273 | 86 / 280 |
| 360 | 15 / 43 | 508 / 1,258 / 3,355 | 78 / 266 |
| 400 | 22 / 66 | 713 / 1,976 / 3,249 | 77 / 252 |
| 484 | 32 / 92 | 826 / 2,687 / 4,158 | 84 / 252 |

### A.2 Certificate outcomes

**Stage A** (20,000 rows; one random clue subset per set and G). Each cell is unique / multiple / not proved.

| Cells | U ≤ 5 | U 6–10 | U 11–15 | U 16–25 | U ≥ 26 | ms: p50 / p90 / max |
|---|---|---|---|---|---|---|
| 60 | 74/6/0 | 27/24/1 | 0/8/0 | — | — | 0.3 / 9 / 237 |
| 100 | 77/1/0 | 46/8/0 | 4/16/4 | 0/11/1 | — | 0.7 / 66 / 777 |
| 144 | 46/0/0 | 49/3/0 | 26/3/1 | 1/3/22 | — | 1.6 / 409 / 1,316 |
| 196 | 24/0/0 | 45/1/0 | 35/1/0 | 7/5/22 | 0/0/14 | 3.7 / 863 / 2,389 |
| 256 | 14/0/0 | 38/0/0 | 25/6/0 | 22/4/9 | 0/2/27 | 7.8 / 1,561 / 3,491 |
| 360 | 6/0/0 | 21/1/0 | 24/1/0 | 37/0/2 | 4/1/36 | 21 / 2,914 / 7,305 |
| 484 | 2/0/0 | 12/0/0 | 18/0/0 | 35/1/0 | 16/3/39 | 51 / 5,252 / 18,054 |

**Stage B / F / X**, accepted puzzles (unique / multiple / not proved):

| Cells | Outcome |
|---|---|
| 60 | 73/61/0 |
| 100 | 79/52/15 |
| 144 | 88/20/30 |
| 196 | 110/7/54 |
| 256 | 51/3/24 |
| 324 | 36/0/40 |
| 360 | 60/0/60 |
| 400 | 40/0/52 |
| 484 | 32/0/110 |
| 576 | 16/0/112 |

The same data by level class (B, F, X and W runs):

| Level class | A > 200 | A ≤ 200 |
|---|---|---|
| hell levels | 31/0/639 | 0/0/30 |
| other levels | 245/3/4 | 350/140/69 |

### A.3 K windows derived from Stage A

Median D was interpolated over (K, G/K) and evaluated at share g_L. Each cell is the range of K whose D falls in the level's band. These ranges are what the formula of §4.1 was fitted to.

| Cells | VE | E | N | H | X | M | NM | H1 | H2 |
|---|---|---|---|---|---|---|---|---|---|
| 60 | 4–8 | 8 | 8–10 | 9–11 | 10–13 | 12–13 | — | — | — |
| 100 | 4–10 | 9–11 | 11–12 | 11–13 | 13–14 | 14–17 | 18–20 | — | — |
| 144 | 6–10 | 9–11 | 11–12 | 12–14 | 13–17 | 16–19 | 18–26 | 26 | — |
| 196 | 8–10 | 9–12 | 12–13 | 13–15 | 15–18 | 16–20 | 19–27 | 26–36 | — |
| 256 | — | 11–13 | 12–15 | 14–16 | 15–19 | 19–22 | 21–27 | 26–44 | 44–47 |
| 324 | — | — | 14–15 | 14–17 | 16–21 | 19–24 | 24–29 | 27–43 | 44–54 |
| 360 | — | — | 15 | 15–18 | 15–21 | 20–26 | 24–30 | 28–43 | 44–60 |
| 484 | — | — | — | — | 20–22 | 20–28 | 24–33 | 30–43 | 44–69 |

"—" means outside the sampled K range.

### A.4 Distinct arrangements per carved set

Counted up to board symmetry, 4 sets per row. "+" means the search was capped (400 raw solutions or 2 M rows), so more may exist.

| Board | K | s̄ | Arrangements |
|---|---|---|---|
| 6×10 | 6 | 10.0 | 1, 1, 1, 1 |
| 6×10 | 7 | 8.6 | 1, 1, 1, 1 |
| 6×10 | 8 | 7.5 | 1, 2, 1, 1 |
| 6×10 | 9 | 6.7 | 4, 15, 133+, 2 |
| 6×10 | 10 | 6.0 | 400+, 203+, 147+, 244+ |
| 6×10 | 12 / 13 | 5.0 / 4.6 | 400+ (all 8 sets) |
| 10×10 | 9 | 11.1 | 1, 1, 2, 1 |
| 10×10 | 11 | 9.1 | 1, 1, 1, 1 |
| 10×10 | 14 | 7.1 | 30+, 74+, 26+, 12+ |
| 10×10 | 17 | 5.9 | 393+, 122+, 14+, 285+ |
| 12×12 | 10 | 14.4 | 1, 1, 1, 1 |
| 12×12 | 13 | 11.1 | 1, 1, 1, 1 |

### A.5 LNS steps from the carved witness

12 steps per cell; each cell is successes / 12 and the mean time per step.

**Limit 5,000 rows:**

| Set | k = 4 | k = 6 | k = 8 | k = 10 | k = 13 | k = 16 |
|---|---|---|---|---|---|---|
| 20×18, K 42 (s̄ 8.6) | 0, 2 ms | 0, 2 ms | 0, 3 ms | 0, 7 ms | 0, 40 ms | 0, 88 ms |
| 20×18, K 53 (s̄ 6.8) | 1, 1 ms | 1, 1 ms | 2, 2 ms | 3, 7 ms | 5, 59 ms | 0, 84 ms |
| 22×22, K 75 (s̄ 6.5) | 0, 0 ms | 1, 1 ms | 1, 1 ms | 0, 4 ms | 4, 48 ms | 1, 103 ms |
| 20×18, K 17 (s̄ 21) | 0 | 0 | 0 | 0 | 0 | 0, 97 ms |
| 12×12, K 16 (s̄ 9.0) | 0 | 0 | 0 | 0 | 0, 163 ms | 0, 343 ms |

**Limit 30,000 rows:**

| Set | k = 13 | k = 16 |
|---|---|---|
| 20×18, K 53 (s̄ 6.8) | 4, 77 ms | 5, 299 ms |
| 22×22, K 75 (s̄ 6.5) | 3, 121 ms | 7, 505 ms |
| 12×12, K 16 (s̄ 9.0) | 0, 141 ms | 0, 2,123 ms |

### A.6 Stage B per (board, level)

3 seeds per cell up to 196 cells, 2 seeds above. The policy matched the final one except two things: K60[hell-1] was 24 (rerun in A.7), and certificates used 10,000 rows everywhere.

| Board | Level | K | G | D | Set s: med / max | Set + 10 s: med / max | Puzzles (min) | New arrangements / clue variants |
|---|---|---|---|---|---|---|---|---|
| 6×10 | VE | 6–7 | 4 | 4–6 | 0.0 / 0.1 | 0.1 / 0.2 | 2 | 0 / 6 |
| 6×10 | E | 7–8 | 3–4 | 8–11 | 0.0 / 0.0 | 0.1 / 0.1 | 2 | 0 / 8 |
| 6×10 | N | 8–9 | 3–5 | 12–16 | 0.0 / 0.1 | 0.3 / 2.6 | 7 | 9 / 12 |
| 6×10 | H | 10–11 | 3–5 | 17–24 | 0.1 / 0.2 | 1.2 / 2.4 | 10 | 27 / 0 |
| 6×10 | X | 11–12 | 3–4 | 25–36 | 0.1 / 0.1 | 0.9 / 1.1 | 10 | 27 / 0 |
| 6×10 | M | 12–13 | 2–3 | 37–45 | 0.1 / 0.4 | 0.8 / 0.9 | 10 | 27 / 0 |
| 10×10 | E | 8–9 | 4–5 | 8–10 | 0.1 / 0.1 | 0.2 / 0.3 | 2 | 0 / 9 |
| 10×10 | N | 10–11 | 4–6 | 12–16 | 0.2 / 0.6 | 0.3 / 0.8 | 4 | 0 / 12 |
| 10×10 | H | 11–12 | 4–5 | 17–24 | 0.5 / 0.8 | 0.7 / 1.0 | 9 | 0 / 26 |
| 10×10 | X | 13–14 | 3–5 | 25–36 | 0.4 / 0.5 | 0.6 / 15.1 | 10 | 3 / 24 |
| 10×10 | M | 15–16 | 3–5 | 38–52 | 0.3 / 0.5 | 3.7 / 4.0 | 10 | 27 / 0 |
| 10×10 | NM | 18–19 | 2–3 | 54–64 | 0.4 / 0.4 | 2.1 / 2.5 | 10 | 27 / 0 |
| 12×12 | E | 9–10 | 5–6 | 8–10 | 0.1 / 0.1 | 0.2 / 0.3 | 2 | 0 / 4 |
| 12×12 | N | 11–12 | 5–6 | 12–16 | 0.1 / 0.6 | 0.3 / 0.9 | 4 | 0 / 14 |
| 12×12 | H | 13–14 | 4–6 | 18–24 | 1.1 / 1.3 | 1.4 / 1.6 | 7 | 0 / 21 |
| 12×12 | X | 15–16 | 4–5 | 26–36 | 1.0 / 1.2 | 1.1 / 1.4 | 10 | 0 / 27 |
| 12×12 | M | 17–18 | 3–4 | 38–51 | 0.7 / 2.4 | 1.7 / 3.6 | 10 | 0 / 27 |
| 12×12 | NM | 20–21 | 2–4 | 62–68 | 1.1 / 1.5 | 11.8 / 29.8 | 10 | 19 / 8 |
| 14×14 | N | 12–13 | 5–6 | 12–16 | 0.1 / 0.2 | 0.4 / 0.4 | 7 | 0 / 19 |
| 14×14 | H | 14–15 | 5–6 | 18–24 | 0.2 / 0.2 | 0.5 / 0.5 | 9 | 0 / 26 |
| 14×14 | X | 16–17 | 4–6 | 26–36 | 2.3 / 2.5 | 2.6 / 2.8 | 10 | 0 / 27 |
| 14×14 | M | 18–19 | 3–5 | 37–50 | 1.9 / 2.2 | 2.5 / 2.8 | 10 | 0 / 27 |
| 14×14 | NM | 22–23 | 2–4 | 53–70 | 2.0 / 2.3 | 8.1 / 8.6 | 10 | 0 / 27 |
| 14×14 | H1 | 31–33 | 1–3 | 85–94 | 1.5 / 1.7 | 6.7 / 8.3 | 10 | 25 / 2 |
| 16×16 | N | 13 | 6 | 14 | 0.1 / 0.2 | 0.4 / 0.7 | 9 | 0 / 16 |
| 16×16 | M | 19 | 4–5 | 37–45 | 1.5 / 4.3 | 1.9 / 4.7 | 10 | 0 / 18 |
| 16×16 | NM | 24 | 2–4 | 58–74 | 2.6 / 2.8 | 6.4 / 11.2 | 10 | 0 / 18 |
| 16×16 | H1 | 34–36 | 1–4 | 92–100 | 1.9 / 2.1 | 8.2 / 17.9 | 10 | 4 / 14 |
| 18×18 | N | 14 | 6–7 | 14–16 | 0.2 / 0.2 | 0.7 / 0.7 | 8 | 0 / 14 |
| 18×18 | M | 21 | 4–5 | 38–47 | 3.1 / 7.1 | 3.6 / 7.7 | 10 | 0 / 18 |
| 18×18 | H1 | 38–40 | 1–4 | 98–106 | 3.4 / 3.4 | 12.0 / 12.0 | 10 | 0 / 18 |
| 18×18 | H2 | 50–52 | 2–4 | 122–130 | 1.7 / 2.3 | 8.6 / 10.9 | 10 | 18 / 0 |
| 18×20 | H | 17 | 6–7 | 20–24 | 0.6 / 1.1 | 1.3 / 1.8 | 10 | 0 / 18 |
| 18×20 | M | 21 | 4–5 | 38–45 | 1.9 / 8.7 | 2.4 / 9.3 | 10 | 0 / 18 |
| 18×20 | NM | 26 | 3–5 | 55–72 | 6.1 / 6.6 | 7.4 / 10.2 | 10 | 0 / 18 |
| 20×20 | H | 17 | 6–7 | 20–24 | 0.2 / 0.6 | 1.0 / 1.3 | 10 | 0 / 18 |
| 20×20 | M | 22 | 4–6 | 38–45 | 0.9 / 1.6 | 1.5 / 2.2 | 10 | 0 / 18 |
| 22×22 | H | 18 | 6–8 | 20–24 | 0.4 / 0.4 | 1.1 / 1.2 | 6 | 0 / 10 |
| 22×22 | M | 23 | 4–6 | 38–46 | 0.4 / 0.6 | 1.3 / 1.4 | 10 | 0 / 18 |

### A.7 Final-policy runs: hell levels and extended boards

One process per run; clean peak RSS.

| Board | Level | Runs | K | Set + 10 s: med / max | Puzzles (min) | Peak RSS | Model nodes (max) |
|---|---|---|---|---|---|---|---|
| 18×20 | hell-1 | 3 | 37–39 | 8.6 / 8.8 | 10 | 0.56 GB | 0.78 M |
| 18×20 | hell-2 | 3 | 52–56 | 9.1 / 9.3 | 10 | 1.02 GB | 0.77 M |
| 20×20 | hell-1 | 3 | 37–39 | 10.7 / 11.9 | 10 | 0.92 GB | 0.94 M |
| 20×20 | hell-2 | 3 | 53–56 | 7.5 / 13.7 | 2 (fold rule, §5.2) | 1.20 GB | 0.98 M |
| 22×22 | hell-1 | 5 | 35–39 | 24.6 / 28.1 | 10 | 1.03 GB | 1.34 M |
| 22×22 | hell-2 | 3 | 59–61 | 7.6 / 8.3 | 10 | 1.13 GB | 1.48 M |
| 22×22 | hell-3 | 3 | 75–77 | 8.3 / 15.0 | 10 | 1.41 GB | 1.45 M |
| 40×12 | hell-1 | 2 | 38 | 22.4 / 22.4 | 10 | 0.87 GB | — |
| 40×12, 32×15 | hell-3 | 4 | 73–75 | 12.7 / 15.9 | 10 | 1.41 GB | — |
| 24×24 | hell-1 | 5 | 35–39 | 29.3 / 38.4 | 10 | 1.08 GB | 1.89 M |
| 24×24 | hell-2 | 4 | 60–64 | 13.5 / 15.2 | 10 | 1.37 GB | 2.15 M |
| 24×24 | hell-3 | 4 | 80–84 | 19.6 / 23.6 | 8 | 1.81 GB | 2.17 M |
| 26×26 | hard / master | 2 | 21 / 26 | 4.7 / 3.1 | 6 / 10 | 1.05 GB | 2.19 M |
| 26×26 | hell-1 / hell-2 / hell-3 | 3 | 37 / 60 / 84 | 44.2 / 25.6 / 11.0 | 10 | 1.66 GB | 3.01 M |
| 28×28 | master / hell-1 | 2 | 27 / 37 | 2.5 / 17.0 | 10 | 1.31 GB | 3.27 M |
| 28×28 | hell-2 / hell-3 | 2 | 60 / 89 | 44.7 / 16.8 | 10 | 2.32 GB | 4.05 M |
| 28×28 | hell-4 | 1 | 112–123 | set failed (400 attempts, 86 s) | — | 0.65 GB | — |

**Superseded pilot runs**, which used the 4-design-detail batch rules and K60[hell-1] = 24:

| Board | Level | K | Result |
|---|---|---|---|
| 18×20 | hell-1 | 42 | 1 of 10 puzzles in 120 s |
| 18×20 | hell-2 | 53 | 10 puzzles in 98 s |
| 22×22 | hell-3 | 75 | 10 puzzles in 69 s; peak 2.02 GB with 400 MB worker heaps (cumulative process RSS) |
| 24×24 | hell-1 | 45 | 7 of 10 puzzles; D stuck at 110 (time limit) |
