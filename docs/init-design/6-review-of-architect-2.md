# Phase 6 — Review of architect-2's addendum study (architect-1)

This review covers `5-addendum-study-architect-2.md` and `4-design-brief.md`. Reproductions used my Phase-5 prototype on the same machine (AMD EPYC 7763, 8 cores / 16 threads; Node 24, 4 `worker_threads`, `--max-old-space-size=2048`, fresh process per run). About 20 minutes of benchmark time were spent.

"Set + 10" means Generate Piece Set followed by New Puzzles with q = 10, as in both studies.

## 1. Verdict

A strong, honest study with several engineering contributions that the unified design should adopt:
- macro carving for large-piece sets;
- worker recycling and buffer reuse;
- pre-flight model guards;
- conservative browser conversion factors;
- strict layout distinctness.

I disagree on two decisive points.

| # | Point | Evidence | Recommendation |
|---|---|---|---|
| 1 | **Score.** Keeping the area-scaled R and H terms inflates scores on large boards. Clue counts must then rise to compensate, so their own data shows *more* pre-placed pieces at 360-cell hell-1 than at hard. | Re-scoring my Stage-A samples with their formula: an 18-piece, 360-cell set with 1–2 clues is rated hell-1. | Adopt `difficulty-v2` (§3, D1). |
| 2 | **Launch cap of 676 cells.** It was qualified only at Expert (K = 28, 17–18 clues) and Hell-4 (K = 91, μ = 7.4). The slowest regime, big-piece hell-1 (μ ≈ 18), was not measured at 676. | My 676-cell hell-1 runs took 44–49 s in Node: 139–153 s with their own browser factor even with lazy certificates (182–199 s without). At 576 cells the worst run is 109 s with lazy certificates. | Standard cap 576 cells (484 on phones); 577–676 as an opt-in large-board mode, enabled only after the browser bench (D5). |

Their memory claim is plausible: my prototype's excess RSS comes from its per-row JS model representation (D5). With a compact builder and lazy certificates, I raise my own Phase-5 cap from 484 to 576 cells. Their 41 pieces for 360-cell hell-1 also works in my pipeline, so I withdraw my Phase-5 adjustment to 34–39 (D2).

## 2. Points of agreement

- **Benchmark basis.** Real Node benchmarks on the same EPYC host with 4 workers. Area means active cells; display rotation never affects generation.
- **Feasibility.** Distinct-shape counts (OEIS A000105 / hole-free) and catalogue feasibility; a minimum of 3 cells; a cap on small pieces; size windows that scale with the mean piece size μ.
- **Levels.** One shared formula for every board; levels offered per area; an open-ended hell-n ladder.
- **Piece counts.** K grows with level and area, never too many small pieces. 60 cells: easy 8 / master 12. 360 cells: hard 18 (lowest level) / hell-1 41.
- **B is capped at 5,000** and is deterministic; a censored or saturated value is a deterministic estimate, not a timing.
- **Single-tiling sets are real.** Both studies found independently that flat-carved large-piece sets usually have exactly one arrangement.
- **Generation flow.** The calibration puzzle becomes puzzle #1. Results are deterministic and chosen by index order, never by which worker finishes first.
- **Honest outcomes.** Partial results are returned honestly; accepted results are kept; nothing is padded.
- **Browser qualification.** Browser and phone qualification and human playtests are required before limits are advertised.
- **Shared points are far inside the limits in both engines** (set + 10, Node):

  | Configuration | Architect-2 (p50 / p95) | Mine (range) |
  |---|---|---|
  | 360-cell hell-1, K = 41 | 7.0 / 7.35 s | 5.8–7.6 s |
  | 360-cell hard, K = 17–18 | 0.25 / 0.25 s (9–11 clues) | 1.3–1.8 s (6–7 clues) |

## 3. Divergences, reproductions and unified values

### Reproduction summary

| Id | Experiment (my prototype) | Result |
|---|---|---|
| R1 | 360 / 484 cells, hell-1 with K = 41 forced; 3 + 2 seeds | 10/10 puzzles. Set + 10: 5.8–7.6 s (360) and 18.8–18.9 s (484). D 104–110 (band [77, 112)); 1–4 pre-placed. |
| R2 | Their top configurations under my score: 676 / K = 91 (2 seeds), 784 / K = 104 | 676: 22.2–26.9 s, RSS 2.00–2.25 GB. 784: 19.6 s, 1.90 GB. One 676 run returned 4/10 because of the known "too close" fold-rule gap (Phase 5 §5.2). |
| R3 | Their memory techniques added to my prototype: DLX buffer reuse (main/scratch slots), worker recycling after the set phase; 7 runs | Peak RSS fell only 0–12 %: 676/hell-3 1,657 → 1,511 MB; 576/hell-3 1,819 → 1,603 MB; 676/K = 91 1,996 → 1,896 MB. Time within ±10 %. |
| R4 | Worker heap capped at 128 MB instead of 256 MB | RSS as in Phase 5 (1,615–1,819 MB at 576–676 hell-3). The excess is not collectable JS garbage. |
| R5 | Single-model memory probe, `--expose-gc` | 676/K = 91: 71 MB of DLX arrays, 137 MB of JS heap (per-row arrays and maps), RSS 395 MB after GC. 484/K = 76: 34 MB, 72 MB and 291 MB. |
| R6 | Their macro carving + macro-region LNS re-implemented; flat carving as control; 3 seeds | See D6. |
| R7 | Their formula and bands applied to my 3,458 Stage-A ratings | See D1. |
| R8 | 676-cell hell-1 (K = 37) at 128 MB and with reuse + recycling (same seed as Phase 5, 44.2 s) | 44.3 s and 48.6 s Node. Per candidate: ≈ 3.7–4.2 s of rating and ≈ 2.0 s of certificate; certificates are 33–35 % of batch CPU. |
| R9 | Lazy-certificate estimate for every hell-1 run at 484–676 cells: set time + batch time × (1 − certificate share of batch CPU) | 484: 12.2–20.4 s; 576: 13.8–26.1 s; 676: 33.4–36.9 s (Node). |

### D1 — Score formula and bands

**Their claim.**
- Keep D = round(2U + 0.10R + 4H + 8·log10(1 + B)), B ≤ 5,000 row selections.
- Bands: very-easy [0, 20), easy [20, 35), normal [35, 50), hard [50, 65), expert [65, 75), master [75, 90), nightmare [90, 110); hell-n = [110 + 15n(n − 1), 110 + 15n(n + 1)).
- Reason: R keeps large boards harder. U = 8 at 360 cells scores 50 (hard); without R it scores 34 (easy).

**My claim.** D = round(2U + 8·log10(1 + min(B, 5,000))) with geometric bands e_L = round(10 · 1.45^(L − 1.5)).

**Reproduction (R7).** Their formula and bands applied to Stage-A medians:

| Configuration | Clues → their D (level) |
|---|---|
| 360 cells, K = 18 (the user's "hard" set size) | G 1–2 → 110–121 (**hell-1**); G 4 → 93 (nightmare); G 5 → 86 (master); G 8 → 62 (hard) |
| 360 cells, K = 40 | hell-1 [110, 140) needs **G ≈ 13–17** (33–43 % pre-placed); G 2–12 → hell-2 |
| 60 cells, K = 8 / K = 12 | Nearly the same levels as mine. K = 8, G 4 → 27 (easy; mine 10, easy). K = 12, G 1 → 71–79 (expert/master; mine 39–46, master) |

Their own §6.3 table shows the consequence at 360 cells. Pre-placed pieces: hard 9–11, hell-1 16, hell-2 5, hell-3 1. So hell-1 has more starting pieces than hard, which is non-monotonic and conflicts with "easy = many pre-placed, nightmare = few".

Under `difficulty-v2` at 360 cells the shares fall with level:

| Level | Pre-placed (share) |
|---|---|
| hard | 6–7 (38 %) |
| nightmare | 3–5 |
| hell-1 | 1–4 (≤ 10 %) |
| hell-2 | 1–4 |

Their "U = 8 → easy" argument only holds with the old bands. With the rescaled bands, U = 8 and B = 0 gives 16 (normal), and the user's 16–18-piece hard set reaches hard with 6–7 clues (D 20–24).

**Unified value.** `difficulty-v2` with the geometric bands. Record R, H and a `saturated` flag (their `profileCensored`) as diagnostics for a human-calibrated v3. Both formulas nearly agree on 60-cell boards, so the change mainly affects large boards, where theirs inflates.

### D2 — Piece count K(level, area); 360-cell hell-1 = 41 vs 34–39

**Their claim.**
- k(a, L) = round(7·√(a/60) + (a/60)·(L − m(a))), with m(A) = max(0, ⌈log2(A/60)⌉) and a running maximum over a ≤ A.
- This gives a linear step of A/60 pieces per level, and 360-cell hell-1 = 41.

**My claim.** K60[L] · (A/60)^0.28 with hell caps; 360-cell hell-1 = 34–39.

**Reproduction (R1).**
- K = 41 at 360 cells: 10/10 puzzles in 5.8–7.6 s, D 104–110.
- My earlier failure (1 of 10 in 120 s) came from the superseded pilot batch rules (Phase 5 A.7), not from K = 41. **I withdraw Q2.**
- A linear step does not fit a saturating score. With D ≈ 2U + 30, their 360-cell hell-2 (47) and hell-3 (53) both score inside my hell-2 band, and their 676-cell hell-4 (K = 91) can only reach my hell-3 (R2).

**Unified value.** My formula with a hell-1 change:
- K60[hell-1] = 24, cap 42;
- initial hell-1 share 10 %, which centres D ≈ 100.

This gives 360-cell hell-1 = **37–42**, containing their 41 and the user's 40–42. The formula is monotone in A by construction, which is their running-maximum property.

### D3 — Pre-placed count policy

**Their claim.** u0 = clamp((mid − extra[L]) / (2 + 0.10·A/K), 2, K − 1), then a searched G.

**My claim.** Share g_L = max(0.04, 0.62 − 0.08·L), then searched. This is tied to D1: the R term is what pushes their clue counts up with area.

**Unified value.** My shares, with hell-1 at 10 %, hell-2 at 6 % and hell-3+ at 4 %. Show both the count and the fraction in the UI, as they suggest.

### D4 — Small-piece rule and size window

**Their claim.**
- Sizes in [max(3, ⌊0.6μ⌋), ⌈1.5μ⌉];
- at most ⌊0.3K⌋ pieces of 3–4 cells;
- integer histogram feasibility;
- "the old 10-cell maximum must go". In fact 4-design-detail §6.4 already allowed max(10, ⌈1.6·s̄⌉).

**My claim.** At most ⌊0.4K⌋ small pieces; μ ≥ 4.5; spread max(2.5, 0.35μ); size ≤ max(10, ⌈1.6μ⌉); K ≥ ⌈0.75√A⌉.

**Reproduction (feasibility).** With the 30 % cap, 13 distinct pieces need exactly 60 cells (their own §2.1 says so): sizes are forced to 3, 3, 4 and ten 5s. The user's 60-cell master example allows 13. The two caps differ only for K < 24, because only 7 small shapes exist.

**Unified value.**
- Adopt their size window and histogram check: simpler, scales with μ.
- Keep the 40 % small cap and μ ≥ 4.5.
- Keep Kmin = ⌈0.75√A⌉ ("not too few large pieces").

### D5 — Maximum board size and dimension

**Their claim.**
- Launch at ≤ 676 active cells, sides ≤ 32.
- 784 cells experimental; 484 cells as the phone preset.
- Basis: fresh-worker hell-4 runs (n = 5): 676 / K = 91 took 7.1 / 8.5 s with 1,058 MiB RSS.

**My claim.** 484 cells (sides ≤ 40), limited by memory: 1.6–1.8 GB RSS at 576–676 cells.

**Reproduction.**
- **Memory.** Buffer reuse plus recycling saved only 0–12 % (R3), and a smaller heap changed nothing (R4). The probe (R5) locates the gap:
  - a 676-cell model needs 71 MB of DLX arrays;
  - a single model built by my prototype leaves 395 MB of process RSS after GC (137 MB of it JS heap);
  - a compact builder (flat `Int32Array` rows, no per-row objects) should need roughly 100–150 MB per worker model (estimate), so 4 workers fit in ≈ 1 GB. This matches their measured 1,058 MiB.

  **Their memory figure is credible for a compact engine.** It becomes a requirement, not an assumption.
- **Time.** Their 676-cell qualification never exercised big-piece, few-clue levels. Under the unified score these are the costliest: each saturated rating traverses 2.5 M-node models with 18-cell rows. Hell-1 runs (R9), Node set + 10, median / max:

  | Board | Runs | Node, 2,000-row certificates | Node, lazy certificates | Browser, my factor (2.5×) | Browser, their factor (5 s + 4×) |
  |---|---|---|---|---|---|
  | 484 | 5 | 24.6 / 28.1 s | 18.1 / 20.4 s | 45 / 51 s | 77 / 87 s |
  | 576 | 5 | 29.3 / 38.4 s | 17.5 / 26.1 s | 44 / 65 s | 75 / **109 s** |
  | 676 | 1 seed, 3 runs | 44.2–48.6 s | 33.4–36.9 s | 84–92 s | **139–153 s** |

  So 576 cells meets the 2-minute hard limit under both factors, and the 1-minute target at the median under mine. 676 cells meets the hard limit only under my factor. Hell-1 at 484 cells with the unified K = 41 was faster still (R1: 18.8–18.9 s; lazy ≈ 13.5 s).

**Unified value.**

| Tier | Limit | Condition |
|---|---|---|
| Standard | **576 active cells** (e.g. 24×24, 32×18) | Desktop and laptop. Requires the compact builder, lazy certificates and pre-flight guards. |
| Phone preset | **484 active cells** | Phones and devices with `deviceMemory` ≤ 4 (their preset). |
| Large-board mode | **577–676** | Desktop, opt-in, labelled "may take up to 2 minutes". Enabled only after the browser bench shows p95 ≤ 120 s at 676-cell hell-1. |
| Not offered | 677+ | Their 784 experimental tier is dropped: no browser margin, and hell-4 is not reachable below 744 cells under the unified score. |

- Sides ≤ **32** (their value; I tested 40×12 without problems, but 32 is the safer UI bound).
- The browser bench may move each tier; the factors are unmeasured (D8).

### D6 — Single-tiling (rigid) large-piece sets

**Their claim.**
- Macro carving when μ ≥ 6.5: compact regions of 3–6 pieces, or 2–3 for small sets; carve inside each region, sharing used shape keys.
- LNS re-tiles one macro region; one step in eight also releases neighbours.
- Strict acceptance: new layout key and new clue key. Minimum distance may fall to 2.

**My claim.** LNS only when μ < 7.5; otherwise labelled clue variants (my Q1).

**Reproduction (R6).** Guillotine macro partition, carving per region with a shared key set, LNS on macro regions:

| Set | Carving | Arrangements found (cap 400) | Puzzles in band, single thread | Min layout distance | Proved multiple-solution puzzles |
|---|---|---|---|---|---|
| 6×10, K = 8 (easy) | macro | 168+, 400+, 352+ | 10 / 10 in ≤ 0.1 s | 2, 2, 4 | 5–8 of 10 |
| 6×10, K = 8 | flat | 1, 1, 2 | 1–2 in 17–21 s | — | 0–1 |
| 360 cells, K = 18 (hard) | macro | 396+ – 400+ | 10 / 10 in 0.7–0.9 s | 3–6 | 0 of 10 |
| 360 cells, K = 18 | flat | 1, 1, 1 | 1 | — | 0 |
| 360 cells, K = 21 (master) | macro | 400+ | 10 / 10 in 0.5–0.6 s | 3–8 | 10 of 10 |
| 360 cells, K = 39 (hell-1) | macro | not counted (search cap) | 10 / 10 in 30.5–33.8 s (≈ 8 s if spread over 4 workers) | 14–18 | 0 of 10 (none proved either way) |

A rerun with the same seeds reproduced every row.

**Their method works and is better than clue variants.** It delivers the original requirement ("only the arrangement changes") at low cost. The costs:
- some puzzles are near-duplicates (distance 2);
- multiple solutions become common at some levels;
- the block structure might be perceptible (macro boundaries are invisible, but this needs a playtest).

**Unified value.**
- Macro carving when μ ≥ 6.5; flat carving below.
- Strict distinct layouts; preferred distance clamp(⌈K/4⌉, 3, 10), relaxing to a floor of 2.
- Clue variants only if the user explicitly wants them (Q1).

### D7 — Worker strategy and resource guards

**Their claim.**
- 4 parallel carving candidates; parallel calibration subsets; 4 LNS walks per pool round; 4-wide per-puzzle rating.
- Recycle workers when the set changes; reuse DLX buffers.
- Guards: ≤ 600,000 rows and ≤ 5,000,000 nonzeros.
- Stop new work at 115 s and use 5 s to package.

**My claim.**
- The 4-design-detail fold with speculation, and lowest-index set attempts.
- Cancel by terminate.
- `maxNodes` 1.6 M, calibrated on my non-compact prototype.

**Reproduction (R3).** Recycling and reuse are cheap and harmless (time within ±10 %); the main gain needs the compact builder.

**Unified value.**
- Keep the deterministic fold and speculation.
- Add recycling, buffer reuse, the compact builder, and their guards (replacing my 1.6 M nodes).
- Add the 115 s dispatch stop plus 5 s packaging.

### D8 — Browser conversion factors

**Their claim.** Time = 5 s + 4× Node (laptop) or 8× (phone); memory = 128 MiB + 1.25 × RSS against a 1,900 MiB budget.

**My claim.** Time = 2.5× Node; memory: RSS ≤ 1.5 GB.

Neither factor was measured.

**Unified value.**
- Check the **hard limit** with their conservative factor and the **60 s target** with mine.
- Both are placeholders until the browser bench (4-design-detail §8.7) runs at 484, 576 and 676 cells on Chromium, Firefox and Safari.

### D9 — Certificates and uniqueness

**Their claim.** The benchmark is multiple-solutions-allowed; uniqueness is opt-in and needs its own budget.

**My claim.** Certificates are lazy and display-only: 10,000 rows up to 200 cells, 2,000 rows above.
- Measured above 200 cells: "not proved" in 639 of 670 hell-level checks, at 0.5–2.3 s each (≈ 35 % of batch CPU).

**Unified value.**
- Lazy certificates, never on the acceptance path.
- "Require one solution" is offered only for ≤ 200 cells or below hell levels. It stays opt-in: macro carving makes multiple solutions common at some levels (R6: 10 of 10 at 360-cell master), so that mode will reject more candidates.

## 4. Consistency check: `4-design-brief.md` vs. the Phase-5 outcome

| # | Brief text | Required edit |
|---|---|---|
| B1 | "PROVISIONAL — finalized in Phase 5: …" | Replace with the final facts: <br>• board limits (D5); <br>• the levels each size offers (§5.2): ~60 squares → very easy–master; hell-1 from ~165 squares; hell-2 from ~270; hell-3 from ~450; the lowest level rises with size (360 squares start at hard); <br>• example piece counts: 60 squares easy 7–8 / master 12–13; 360 squares hard 16–18 / hell-1 37–42. |
| B2 | Step 1 "Enter rows and columns" | Add "up to 32 squares per side and 576 playable squares (484 on phones); up to 676 in a large-board mode once it is qualified". |
| B3 | Step 3 "Require one solution" | Add "available up to ~200 squares or below Hell levels; larger puzzles usually cannot be proved unique in time". |
| B4 | Step 5 "genuinely different arrangement" | Keep (macro carving makes it achievable). Add "arrangements may differ by only a few pieces". Revisit if the user chooses clue variants (Q1). |
| B5 | Step 6 solution status | Add "the status may appear after the puzzles (checked in the background)" — lazy certificates. |
| B6 | Difficulty table ("Many starting pieces" only on the Very Easy / Easy row) | Make the trend explicit on every row: starting pieces many → few; Hell tiers about 1–4 even on big boards. Add "Hell tiers need at least ~165 squares; a 60-square board tops out at Master". |
| B7 | Purpose: "Colors and visible labels help distinguish them" | Add "with many pieces (up to ~90), labels continue beyond A–Z (AA, AB, …) and patterns supplement colors"; 4-design-detail D30 already generates colors beyond 20. Add "on large boards at low levels, pieces can be large (up to about 50 squares)". |
| B8 | Generation feedback | Add the time expectation: "usually seconds; large Hell boards up to about a minute, never more than two". |
| B9 | "Ten puzzles are a request … return fewer rather than repeat an arrangement with different clues" | Consistent with the strict default. Change only if Q1 is answered "clue variants". |
| B10 | Player | Add "pan" next to fit-to-screen and zoom for boards above ~400 squares. |

## 5. Proposed final unified parameters

### 5.1 Score and bands

```text
D = round(2·U + 8·log10(1 + min(B, 5,000)))
B = branch trials of the canonical DLX traversal until its first solution;
    5,000 branch trials or 50,000 row trials ⇒ saturated (B = 5,000).
    Store `saturated`, R and H as diagnostics.

Bands: e_0 = 0;  e_L = round(10 · 1.45^(L − 1.5))
       very-easy [0, 8) · easy [8, 12) · normal [12, 17) · hard [17, 25) · expert [25, 37)
       master [37, 53) · nightmare [53, 77) · hell-1 [77, 112) · hell-2 [112, 162)
       hell-3 [162, 235) · hell-n = level 6 + n
```

### 5.2 Counts, clues, sizes and windows

```text
K_mid      = min(K60[L] · (A/60)^0.28, Kcap[L])
             K60 (very-easy … hell-4) = 6, 7.5, 8.5, 10, 11.5, 13, 16, 24, 32, 43, 58
             Kcap: hell-1 42, hell-2 62, hell-3 92, hell-4 140
Kmin       = ⌈0.75·√A⌉;   Kmax = min(⌊A/4.5⌋, Kfeas(A) with ≤ ⌊0.4K⌋ small pieces)
offered    ⇔ Amin[L] ≤ A ≤ Amax[L]   (contiguous; frozen from the formula)
             very-easy 30–87 · easy 32–215 · normal 36–348 · hard 41+ · expert 50+ · master 59+
             nightmare 81+ · hell-1 164+ · hell-2 266+ · hell-3 450+ · hell-4 744+ (not offered ≤ 676)
             Amin/Amax = first/last A with Kmin − 0.5 ≤ K_mid ≤ Kmax and 2·(Kmax − 1) + 30 ≥ e_L + 8
K range    = [round(K_mid − w), round(K_mid + w)] clamped into [Kmin, min(Kmax, Kcap)],  w = max(0.75, 0.06·K_mid)
G0         = clamp(round(g_L · K), 1, K − 2), then searched
             g_L = 0.62 − 0.08·L for L ≤ 6;  hell-1 0.10;  hell-2 0.06;  hell-3+ 0.04
sizes      ∈ [max(3, ⌊0.6·μ⌋), ⌈1.5·μ⌉], μ = A/K
             ≤ ⌊0.4·K⌋ pieces of 3–4 cells; μ ≥ 4.5; distinct, hole-free; histogram feasibility
```

Freezing Amin/Amax removes small availability gaps that the rounding in Kmin would otherwise create (for example normal at 301–313 cells).

### 5.3 Area bands × levels

Each cell: K range · initial pre-placed G · piece sizes. A bracket gives the part of the band where the level is offered.

| Level | 36–80 | 81–130 | 131–200 | 201–300 | 301–420 | 421–576 (standard cap) | 577–676 (large-board mode) |
|---|---|---|---|---|---|---|---|
| very-easy | 5–7 · 3–4 · 3–18 | 7 · 4 · 6–19 [≤ 87] | — | — | — | — | — |
| easy | 6–9 · 3–5 · 3–18 | 7–10 · 4–5 · 5–22 | 9–11 · 5–6 · 7–28 | 11 · 6 · 10–30 [≤ 215] | — | — | — |
| normal | 7–10 · 3–5 · 3–15 | 8–11 · 4–5 · 4–20 | 10–13 · 5–6 · 6–28 | 11–14 · 5–6 · 9–35 | 14–15 · 6–7 · 12–38 [≤ 348] | — | — |
| hard | 8–12 · 3–5 · 3–12 [≥ 41] | 10–13 · 4–5 · 4–17 | 12–15 · 5–6 · 6–24 | 13–17 · 5–6 · 8–31 | 15–18 · 6–7 · 10–40 | 16–20 · 6–8 · 13–48 | 19–21 · 7–8 · 17–51 |
| expert | 10–13 · 3–4 · 3–11 [≥ 50] | 12–15 · 4–5 · 3–15 | 13–17 · 4–5 · 5–20 | 15–19 · 5–6 · 7–27 | 17–21 · 5–6 · 9–34 | 19–23 · 6–7 · 12–44 | 20–24 · 6–7 · 15–49 |
| master | 12–15 · 3 · 3–10 [≥ 59] | 13–17 · 3–4 · 3–13 | 15–19 · 3–4 · 4–18 | 17–22 · 4–5 · 6–24 | 19–24 · 4–5 · 8–30 | 21–26 · 5–6 · 10–38 | 23–27 · 5–6 · 13–43 |
| nightmare | — | 16–21 · 2–3 · 3–11 | 19–24 · 3 · 3–15 | 21–27 · 3–4 · 5–20 | 24–29 · 3–4 · 6–25 | 26–32 · 4 · 8–31 | 28–33 · 4–5 · 10–35 |
| hell-1 | — | — | 30–36 · 3–4 · 3–10 [≥ 164] | 32–40 · 3–4 · 3–13 | 35–42 · 4 · 4–17 | 39–42 · 4 · 6–23 | 39–42 · 4 · 8–26 |
| hell-2 | — | — | — | 46–53 · 3 · 3–10 [≥ 266] | 47–58 · 3 · 3–13 | 52–62 · 3–4 · 4–16 | 57–62 · 3–4 · 5–18 |
| hell-3 | — | — | — | — | — | 71–86 · 3 · 3–12 [≥ 450] | 76–90 · 3–4 · 4–13 |

Spot checks against the user's examples: 60 cells offers very-easy 6–7, easy 7–8 … master 12–13; 360 cells offers hard 16–18 (lowest) … hell-1 37–42, hell-2 50–56. Up to 420 cells, K ranges equal Phase 5 §8 except hell-1 (larger K); G differs at hell levels (new shares), and sizes follow the new window.

### 5.4 Expected time, set + 10

Node median / maximum in seconds, measured with the Phase-5 policy (certificates: 10,000 rows up to 200 cells, 2,000 above). Browser columns use my factor (2.5×) / their factor (5 s + 4×).

| Level group | 36–80 | 81–130 | 131–200 | 201–300 | 301–420 | 421–484 | 576 | 676 |
|---|---|---|---|---|---|---|---|---|
| very-easy … expert | 0.3 / 2.6 | 0.4 / 15.1 † | 0.5 / 2.8 | 0.4 / 0.7 | 1.0 / 1.8 | 1.1 / 1.2 | not run | 4.7 (hard, n = 1) |
| master, nightmare | 0.8 / 0.9 | 2.5 / 4.0 | 3.6 / 29.8 † | 4.7 / 11.2 | 3.6 / 10.2 | 1.3 / 1.4 | not run | 3.1 (master, n = 1) |
| hell-1 | — | — | 6.7 / 8.3 | 8.2 / 17.9 | 9.5 / 12.0 ‡ | 22.4 / 28.1 ‡ | 29.3 / 38.4 | 44.2–48.6 (1 seed) |
| hell-2, hell-3 (max) | — | — | — | — | 13.7 | 15.9 | 23.6 | 25.6 |
| Worst cell, browser | 7 / 15 | 38 / 65 † | 75 / 124 † | 45 / 77 | 34 / 60 | 70 / 117 | 96 / 159 | 122 / 199 |
| … with lazy certificates (R9) | | | | | | 51 / 87 | 65 / 109 | 92 / 153 |

- † Flat-carved, LNS-heavy runs (10×10 expert, 12×12 nightmare; μ ≈ 7). Macro carving (μ ≥ 6.5, D6) replaces this regime.
- ‡ With the unified K = 41 (R1): 5.8–7.6 s at 360 cells and 18.8–18.9 s at 484 cells.

### 5.5 Limits and budgets

| Item | Unified value |
|---|---|
| Board | Standard ≤ 576 active cells on desktop and laptop (requires the compact builder and lazy certificates). Phones and `deviceMemory` ≤ 4: ≤ 484. Large-board mode 577–676 on desktop: opt-in, enabled after browser qualification. Sides ≤ 32. Connected masks. Levels offered per §5.2. |
| Pool | min(4, `hardwareConcurrency`) workers. Deterministic fold with speculation. Recycle the workers when the piece set changes. |
| Model | Compact builder (flat typed rows). DLX buffer reuse with main/scratch slots. Pre-flight guards ≤ 600,000 rows and ≤ 5,000,000 nodes. |
| Carving | 4 parallel candidates; the lowest index wins. Macro carving when μ ≥ 6.5 (regions of 3–6 pieces; 2–3 when K ≤ 12). Flat carving otherwise. `carveSteps` 6,000. |
| Rating | 5,000 branch trials / 50,000 row trials, saturating. ≤ 64 ratings per layout (count-guided search, then beam). |
| Arrangements | LNS on one macro region, broadened 1 step in 8, or on a 6–13-piece cluster (flat sets). 3,000–5,000 rows; 8 steps per candidate; restarts only up to 150 cells. Strict new layout key and new clue key. Preferred distance clamp(⌈K/4⌉, 3, 10), floor 2. 12 attempts per slot. |
| Certificates | Lazy and display-only: 10,000 rows up to 200 cells, 2,000 above. "Require one solution" only up to 200 cells or below hell levels. |
| Time | Target 60 s, hard limit 120 s per action. Stop dispatching at 115 s; package within 5 s. Keep accepted results; give a shortfall reason. |

## 6. Questions for the user

| # | Question | Recommended default |
|---|---|---|
| Q1 | Large-piece sets need a trade-off. **(a)** Sets are carved in compact blocks so that "New Puzzle" really rearranges the pieces. The blocks are invisible but may be noticeable; some pairs of puzzles differ by only 2–3 pieces; more puzzles have several solutions. **(b)** Natural random sets with usually one solution, where extra puzzles reuse the same final picture with different starting pieces, labelled as such. | **(a)**, with strict distinct arrangements. If a set cannot produce more arrangements, return fewer puzzles and offer "new piece set". |
| Q2 | 360-cell hell-1 with 34–39 pieces instead of 40–42? | **Withdrawn.** Use 37–42 (contains the user's 40–42; reproduction R1). |

No other divergence needs the user. D1, D5 and D8 are technical decisions supported by the evidence above. D5's large-board mode is gated by the browser bench, not by the user.
