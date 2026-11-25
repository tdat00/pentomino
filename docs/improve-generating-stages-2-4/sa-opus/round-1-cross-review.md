# SA-Opus, round 1: cross-review of SA-Astra's analysis

| Item | Value |
|---|---|
| Reviewer | SA-Opus (claude-opus-5.5), role sa; step 2 of `analyze`, round 1 |
| Date | 2026-11-23 |
| Reviewed | [`../sa-astra/round-1-analysis.md`](../sa-astra/round-1-analysis.md) and `../evidence/sa-astra/` at `1afce41` (SA-Astra's later, uncommitted files were not read) |
| Own analysis | [`round-1-analysis.md`](round-1-analysis.md) at `1afce41` |
| Re-checks | two new read-only, unlocked scripts in [`../evidence/sa-opus/`](../evidence/sa-opus/): `x1-recheck.mjs` (records) and `x1-prices.mjs` (T11g's and T11e's pure price and activation functions); independent code, no SA-Astra script was run; commands in section 6 |
| What ran | no locked or timed run, no rating, search or generation; nothing staged or committed |

**Labels.** **[V]** verified: recomputed from the records or read at the cited `path:line`. **[A]** assumed: a judgement or a
projection, with its basis. Sections: 1 agreements; 2 disagreements and the figures I now hold; 3 SA-Astra's claims re-checked,
with the errors found; 4 corrections to my own analysis; 5 the merged question list; 6 evidence.

## 1. Agreements

Every number below was recomputed by me from the records [V] unless marked; the two analyses agree on:

1. **V4-S2's facts.** 165 valid rows, 164 reaching ten (the exception `fr-base` 14x14 Hell 1 rep 3, two puzzles), 1,642
   puzzles, 165 complete ledgers, zero dead-end entries; 3,410 calls, 843 without an end line, 839 of them on an open primitive;
   165 of 165 linkage timelines without a problem (`x1-recheck.md`, head). The account: 10,252.712 s logged + 87.4 s off-log =
   172.335 counted minutes of 749; runs pass 747; V4-S2 itself 7,338.802 s in 44 invocations.
2. **`V4-LIVE`'s cap.** `approval --plan V4-LIVE` prints 215 on the logs; with the off-log seconds the cap is **217** today. The
   pack's "793 on the account" assumed V4-S2 spent its whole guard and is obsolete; the cap is re-read when it is asked.
3. **Per-cell screen readings** (ratios, clue deltas, work intervals) and their consequences: no screen up to 144 cells
   (IG-P-D4 confirmed: 10x10 0.687 and `worse`; d +1.0 on both cells); no screen on Hell 1 (380 M: 1.074, lower 0.919); every
   original class `unknown` on the work rule. The interval of 196-215 is screen [0.968309, 1.925159] against none
   [2.634979, 3.936347] G per puzzle, `pass`; 216-324 as piloted (16x16, 15x20) is [0.930118, 3.470303] against
   [1.838490, 4.805319], `unknown` (`x1-recheck.md` §1, to six decimals, equal to SA-Astra's E6).
4. **Rejected mechanisms.** (c4) costs 19.5 and 20.4 % of T10 (plan P3 adopts it only below 10 %); bracket close fired on
   14x14 Nightmare only (8 calls: 4 `in`, 4 `above`; 8 `close` profiles) and cost 14.4 % of T10 (0.874); the rescue stays
   (`rerateMax` 4); no ranker.
5. **The per-set prior on Hell 1 only.** It reached 183 of 183 batch calls, each with the `wc` of the set attempt the run
   records (`details.setAttempt`); batch locate profiles per call 5.537 to 2.591 (20x20) and 3.014 to 1.744 (26x26); pooled
   1.094, lower 1.008; no clue shift (`x1-recheck.md` §5).
6. **The deadline.** Reserve 0.6 for the batch, a 46-s set-stage cap, one 115-s generation stop, a hard 120-s response; no
   pilot set cut at 0.6; the only lost completion is 14x14 Hell 1 rep 1 (142.807 s), lost to the stop itself.
7. **P5's mechanism.** The same-side bound stays at four attempts; a budget stop carries no side and never counts. N-V4-16 is
   not exercised (no row with attempts 0-3 failing without a window on one side). N-V4-21 (a): exactly four `fr-p5` set
   attempts ended `not-in-band` by a budget stop, 20x20 Hell 1 rep 0 attempts 0 and 3, rep 2 attempt 3, rep 4 attempt 0, at
   2.298471303, 2.339719457, 2.363961420 and 2.421547354 G (`x1-recheck.md` §9). The 2-G arm cannot give a `require` replay
   proof; a pre-stage-4 replay proof runs under its own task id (N-V4-21 (c)).
8. **N-V4-17.** Every `start` line carries its arm's class `W` (3,410 of 3,410).
9. **The Hell 1 pilots.** Both conditional boards activate under D-V4-20's rule (5 of 5 and 4 of 5 reaching ten); IG-P-Q27's
   early-PM1 exception is not triggered; 14x14 Hell 1 is a high-risk board, reported, not gated (IG-P-Q30).
10. **The Hell 1 table for unpiloted areas comes from PM1's windows.** SA-Astra's nested medians (eligible in-band count/K per
    family, median per seed, median over seeds) recompute exactly: 215 0.404412, 256 0.358108, 300 0.443429, 324 0.347222,
    360 0.331514, 420 0.390244, 480 0.297161, 484 0.287500 (`x1-recheck.md` §2; 52 Hell 1 families, no duplicate across the
    two IGP-05 files). I adopt this method (section 4).
11. **The decidable screen class is 196-215** (I adopt SA-Astra's boundary; evidence in 2.1 and 4).
12. **The kernel and the width.** No `fewestColumn` buckets (4.824 of 10,099.6 ms); no common-cell cache for R4 (clean piece
    visits 14.6 % and 5.9 %; 32.48 M and 6.18 M kills in the six-item corpora, `V4-S2K/kernel.json` `perCase`); C1 as ordered
    live-row lists for R4, then R5 (4.3 % and 2.5 % of the profile), then C5; complete-result equality and the memory rule; the
    pool stays at four workers (width 8 against 4: 1.022 and 1.085).
13. **Prices** (`x1-prices.md` for the first two, identical to SA-Astra's E6 to the cent): `V4-S4` 1,185.49 projected / 1,481.86
    guard (84 locked steps, 137 projected invocations, 1,120 rows + 48 proof items, 200 censored, ceiling 18,396); `V4-S4C`
    585.62 / 732.02 (51 invocations); S4-6 58.00 / 72.50 (T11g's `manifest.md` §2); `V4-LIVE` 35.12 / 43.91 (its `approval`).
14. **The encoding.** `freeze.json` keeps `{ classes: [{ id, cells, screen, noScreen }] }` over exactly the 19 comparator cells
    and records the other frozen values beside it; the four variants differ only as `data/frozen-round-v1.json` declares;
    frozen-family-only anchored edits (the copy builder refuses to overwrite a copied file, `lib/tree.mjs:249`); nothing in the
    `v4` chain moves (the P-0 binding pins it); the budget lookup needs an edit (it keys by level only,
    `ig-select-v4.js:82-88`); `v4-check accept` knows only `stage1`, `parity` and `p0-identity` (`v4-check.mjs:1595-1596`), so
    N-V4-13 adds the `live-deadline` kind.
15. **Order and windows.** N-V4-19 and N-V4-20 before D-V4-20's window; no production change before phase 0; validation reps
    20-39, Master 20-24, second validation 40-59, none of them read for a fit; each machine allowance asked at its turn with
    the account re-read.

## 2. Disagreements, and the figures I now hold

### 2.1 Screen classes: 196-215 decidable (now agreed); 216-324 and 360+ screened and evaluated (still open)

- **[V] 196-256 is fragile at validation size.** With 20 seeds per cell, the pooled work rule passes when the mean of the screen
  rows' `hi` stays at or below the mean of the no-screen rows' `lo`. From the pilot rows (`x1-recheck.md` §1): 196-256 has a
  margin of 0.229 G per puzzle, z = 2.2 at the pilots' spread, 1.1 with the spread doubled (about 1 % and 14 % chance of
  `unknown`); 196-215 has 0.710 G, z = 5.9 and 3.0. My round-1 bootstrap (100 % for both) resampled five rows and could not see
  the tails. A failed 196-256 class would cost the headline pair 14x14 and 15x15b10 their screen (x2.5), for a possible x2.2 on
  16x16 alone. **Held: 196-215 for the decidable class** (SA-Astra's boundary).
- **[V/A] 216-324 and 360+: screened at 190 M and evaluated, not fixed without a screen.** Reasons: (1) both twins run on every
  validated cell in the priced universe whatever the class map (T11a; N-V4-18 not implemented), so "none" makes the 200
  `fr-frozen` rows of these 10 cells exact duplicates of `fr-frozen-none`'s, while "evaluated" measures the screen on them at 20
  seeds at no extra cost; (2) a failed or inconclusive class ships no screen and does not fail phase 0 by itself
  (`verdicts.mjs:908`, `:1539-1540`), so the shipped configuration is the same under both proposals; (3) at run time
  `fr-frozen` keeps T08's four classes (`n-mid` 196-324 and `n-large` at 190 M, `ig-select-v4.js:97-112`): the verdict classes
  split `n-mid` in `freeze.json` only, and no screen-class edit is needed, while SA-Astra's "none on 216-324" needs a new
  boundary in the frozen family; (4) the 20-seed numbers are what a later remedy of N-V4-14 (a tighter proved bound) would be
  weighed on. The only cost: if the owner orders N-V4-18, "none" saves 200 more rows (2.7 below). [A] the chance that 216-324
  is admitted at 20 seeds is nil (its margin is 0.530, the screen's `hi` about twice the no-screen `lo`); if it were, it would be
  by the plan's own rule.
- **Held classes** (each comparator cell once): `n-small` 3x29, 10x10, 12x12 (none); `n-mid-low` 14x14, 15x15b10 (190 M,
  expected admitted); `n-mid-high` 16x16, 15x20, 18x18 (190 M, expected inconclusive); `n-large` 18x20, 20x20, 20x21, 32x15,
  22x22, 24x24, 26x26 (190 M, expected inconclusive); `hell-1` 14x14, 20x20, 24x24, 26x26 (none).

### 2.2 P5 for `any` calls: Nightmare 10 G, Hell 1 up to 215 cells 40 G, Hell 1 from 216 cells 16 G

- **[V] What decides a stop.** P5 checks `spent >= budget` before every rating and count (`ig-select-v4.js:422-426`), so a budget
  stops an uncapped call exactly when its work before the final primitive reaches it. Successful calls of the six uncapped arms
  (`x1-recheck.md` §3): Nightmare 1,613 calls, before-final maximum 6.184 G (total 6.610); Hell 1 up to 215 cells 68 calls,
  25.560 (26.168); Hell 1 from 216 cells 577 calls, 13.633 (13.849, `fr-ps` on 20x20).
- **[V/A] At validation size the pilot maximum is not enough.** V4-S4's two bounded twins make about 3 to 8 times as many
  requests per class as the six uncapped arms' pilots; with an exponential tail fitted above the 90th percentile, the expected
  number of successful calls that a budget would stop there is 0.87 at 8 G against 0.10 at 10 G (Nightmare), 1.63 at 32 G
  against 0.38 at 40 G (Hell 1 up to 215), and 0.11 at 16 G (Hell 1 from 216). Each such stop changes a puzzle against the
  uncapped comparator and puts a completion at risk (IG-P-D1 condition 4) and buys no speed (`fr-p5`: 0.988, lower 0.863).
- **Held:** SA-Astra's per-class structure (IG-P-Q10's "per level and area class"), with Nightmare **10 G**, Hell 1 up to 215
  **40 G**, Hell 1 from 216 **16 G** (SA-Astra's value, accepted). Rule: the smallest round value with at most about 0.4
  expected stopped successes in V4-S4. [A] at 157 to 446 M units/s (plan P5) a 40-G call runs 90 to 255 s, so on 14x14 Hell 1
  the clock is the backstop either way; the cap buys determinism, not speed.

### 2.3 P5 for `require` calls: finite (now agreed); Nightmare 32 G, Hell 1 40 G

- **[V]** Every P-1 item runs `uniqueness: 'require'` (`v4-check.mjs:129` for the generation; `lib/lane-worker.mjs`
  `selectItem` sets it for the selections). The `require` calls observed (`x1-recheck.md` §4): successes at 5.817 and 6.829 G
  (`fr-base`'s generation, set and candidate) and 10.274 G (the 12x12 Nightmare parity selection); one failure, the 26x26 Hell 1
  parity selection, `not-in-band` by itself at 20.608 G after 92.6 s.
- **Held:** a finite budget (I withdraw "no budget": it would leave `require` calls on the clock alone, against IG-P-D1's "work
  caps come first", `plan.md:335`): Nightmare **32 G** (agreed), Hell 1 **40 G** (SA-Astra: 32 G), so that no `require` budget
  is below an `any` budget of its level (a `require` call does an `any` call's work and certifies uniqueness on top). Stage 4 is
  not affected by the Hell 1 value (its only Hell 1 `require` call ends by itself at 20.6 G); production is (N-V4-15).

### 2.4 Runs before the freeze: the control pilot and a composite check on the real frozen arm, not V4-S2F

| Option | Content | Guard (cap alone) | Realistic |
|---|---|---:|---:|
| SA-Astra's `V4-S2F` | 14x14 Nightmare and four Hell 1 boards, a bounded and an uncapped candidate arm, reps 0-4, + 2 P-1 passes (50 rows + 24 items) | 255.63 (428) | 52.1 to 58.1 |
| (a) `V4-S2B`, now (round 1, kept) | `fr-none` (accepted binding) on the 8 unpiloted controls, reps 0-4 (40 rows) | 28.24 (201) | 16.0 to 20.0 |
| (b) composite check inside `V4-S3P` | `fr-frozen-none-uncapped` on the four Hell 1 boards, reps 0-4 (20 rows), after the four frozen arms' P-1 passes (48 items, 89.00 guard, 20.0 to 22.0 realistic), before `freeze.json` is written | 84.61 | 20.0 to 22.0 |

[V for the prices, `x1-prices.md`; realistic = V4-S2's measured node seconds of the same steps plus 15 or 45 s quiet per
invocation.] **Held: (a) and (b).** Why not `V4-S2F` as designed [V]:

1. 14x14 Nightmare adds nothing: there the composite differs from `fr-base` only by a budget that never acted (`fr-p5` gave
   `fr-base`'s puzzles on 5 of 5 seeds).
2. A bounded twin is redundant for P5: since a stop happens only at `spent >= budget`, the uncapped arm's journals give every
   would-be stop exactly (the rule of 2.2); with none, the bounded arm makes the same puzzles.
3. Its P-1 passes prove look-alike variant ids; the frozen arms need their own passes anyway (bindings are per tree, N-V4-21
   (c)). `V4-S3P` proves the real four arms before `freeze.json` is written and before `V4-LIVE` binds `fr-frozen`; if the
   composite reading changes a variant, the passes are repeated under a new task id (about 20 realistic minutes).
4. The controls are gated (no regression at 0.9 on every one of the ten; one failure fails phase 0) and 8 of 10 were never piloted
   (26x26 Nightmare's preview on the no-screen arm is geo 1.12 with a seed at 0.55); Hell 1 is reported, not gated. The
   cheapest risk reduction goes to the controls; `V4-S2B` needs no new code and can run first.

### 2.5 P7: the plan's order, never in the frozen arms

- **Timing (now agreed):** the spike is stage-2 content (`plan.md:546`), so its tasks precede the freeze in the pack. I withdraw
  "after phase 0". Its timing probe: 15.50 / 19.37 for three candidates (cap 192 alone), 5.17 / 6.46 for one [V].
- **Still open: "kernel choice" in the freeze.** SA-Astra's `freeze.json` carries a kernel choice and the encoding takes "the
  selected P7" (its 5.2, 5.6, 8.2 row 7). Held: **no** [V]: N-V4-05 says "phase 1 ships the proved-equal items"
  (`check-list.md:627`); phase 0 is "no runtime change" and phase 1 carries "P7's proved-equal items if the spike passes"
  (`plan.md:664-665`); stage 3's list has no kernel (`plan.md:547`). [A] A faster kernel in the frozen arms only would also
  credit P7's gain to the new search in the no-regression ratio against today's search on the old kernel, while in production
  P7 speeds both. If SA-Astra keeps it, it is a change of stage 3's content for the supervisor (S3).
- [A] The cost of the plan's order: the spike's 14 to 22 developer hours (SA-Astra's estimate) come before the freeze, since
  one task per repository runs at a time. If the owner wants stage 4 sooner, letting the spike follow the freeze (nothing frozen
  depends on it) needs the supervisor's agreement (Q-A02 option (c)).

### 2.6 Q-S01: the fact is right, the premise is softer

[V] `prior-v1` holds MP12b1's medians only (`fit-prior.mjs:2`, `:43-53`); 20x20 Hell 1 has no entry, so its 20 set starts used
K - 8 (`x1-recheck.md` §7), against plan P4's "filled from PM1's windows" (`plan.md:302-306`). But IG-P-Q27 places that fill at
the freeze: "stage 3 freezes P4's table from MP12b1's medians, PM1's first slice, R28 and stage 2's own pilots"
(`plan.md:551-552`), which both SAs now do. What the gap changed is the baseline of the per-set pilot (20x20 against a K - 8
start); the composite check (2.4 (b)) measures the frozen combination. **Held:** keep Q-S01 for the supervisor in the same round
as S1 (it costs no extra round), recommendation (a).

### 2.7 N-V4-18: no

[V] The saving depends on the class map (`x1-prices.md`): with the held classes, 7 fixed no-screen cells (140 rows), 240.37
projected / 300.46 guard, **90.3 to 94.8 realistic**; with SA-Astra's, 17 cells (340 rows), 390.61 / 488.26, **164.9 to 174.9
realistic**. **Held: no** (a reviewed change of about ten places in the verdict chain right before the validation, for 1.5 to 3
hours of machine). SA-Astra's "(a) if machine time is the priority" is a fair option for the owner, with these realistic figures.

### 2.8 Smaller technical points for the joint report

- **The statistic of the piloted Hell 1 entries.** `prior-v1`'s rule is the median share of all accepted puzzles
  (`fit-prior.mjs:43-53`): 196 0.382353, 400 0.349624, 576 0.216899, 676 0.200000; SA-Astra's median of per-request medians
  gives 0.382353, 0.342105, 0.217949, 0.200000 (`x1-recheck.md` §2). Held: `prior-v1`'s rule, so one rule string covers the
  table; the difference is at most about a third of a clue.
- **Realistic prices beside the formal ones** in every owner question: V4-S2 cost 122.3 counted minutes against a projection of
  559.2; `V4-S4` is 468 to 514 realistic against 1,185.49 projected, `V4-S4C` 170 to 183 against 585.62.

## 3. SA-Astra's claims, re-checked against the code and the records

### 3.1 Confirmed [V]

| Claim (SA-Astra section) | Re-check | Result |
|---|---|---|
| Rows, ten, puzzles, ledgers, dead ends (3.2, 3.3) | round-1 `s2-rows`, `s2-ends`; `x1-recheck` head | equal |
| 843 terminated calls, 839 with an open primitive; 165 timelines (3.3, 3.5) | `x1-recheck` head | equal |
| 196-215 and 216-324 intervals; original class intervals (3.3) | `x1-recheck` §1; round-1 `s2-work` | equal to 6 decimals |
| `W` on 3,410 starts (3.4) | round-1 `s2-calls` (33 groups) | equal |
| close 4 `in` / 4 `above`, 8 profiles; (c4) sides 15/44/2 and 29/41/1, `below` profiles 64 and 75 (61 + 3, 71 + 4) (3.4) | `x1-recheck` §8; round-1 `s2-calls` | equal |
| 59 and 59 budget stops; four no-side set stops and their spends (3.4) | `x1-recheck` §9; round-1 `s2-p5` | equal |
| `fr-p5`'s generation: 16 set starts, 15 ends at 2.011 to 2.696 G, `no-set` `time-limit` 115,014 ms; base replays 5,816,758,806 and 12,646,225,540; Hell parity 20,608,465,971 (3.4) | `x1-recheck` §4 | equal (see 3.2, E1) |
| Per-set: 183 of 183, locate 5.537 to 2.591 and 3.014 to 1.744, pooled 1.093734 / 1.007512 (3.5) | `x1-recheck` §5; round-1 `s2-gains` | equal |
| `prior-v1` Hell 1 entries 196, 576, 676 only; starts 8/9, K - 8 x 20, 6, 5 (3.5) | `x1-recheck` §7 | equal (8 x 7, 9 x 13) |
| PM1 shares at eight areas (5.3) | `x1-recheck` §2 | equal |
| Idle 0.03 to 0.05 worker-s per arm and cell (3.5) | `x1-recheck` §6 | 0.025 to 0.050, median 0.032 |
| Kernel fractions, kills, R4 / R5 / `select + undo + kill` shares, `fewestColumn`, width (3.6) | `V4-S2K/kernel.json`; round-1 `s2-profile`; `V4-S2W/width.md` | equal |
| "48/59 exceed 2 G before their last primitive" on 14x14 Hell 1 (5.4) | `x1-recheck` §3 | 48 of 59 `ok` batch calls |
| Account 172.3352; V4-LIVE 215 / 217 (8.1) | round-1 `s2-account`; `approval --plan V4-LIVE` | equal |
| V4-S2F 204.50 / 255.63 (cap 428); spike 15.50 / 19.37; V4-S4, V4-S4C, S4-6; N-V4-18 340 rows 390.61 / 488.26 (8.1, 9) | `x1-prices` | equal |
| `require` in every P-1 item; copy builder; `accept` kinds (3.4, 5.5) | `v4-check.mjs:129`; `lane-worker.mjs` `selectItem`; `lib/tree.mjs:249`; `v4-check.mjs:1595-1596` | equal |

Not re-checked: SA-Astra's re-run of the seven P-0 and P-1 bindings (a harness command), the 14x14 Hell 1 clue range 0.250 to
0.471 (its census-estimate share 31 of 42 matches my 0.74), E7's 1 to 16 G tables (superseded by `x1-recheck` §3), and the line
ranges of E12 to E15.

### 3.2 Errors and imprecisions

- **E1 [V], the evidence of the 32-G `require` budget** (5.4 table: "Covers the observed 12.646 G replay and 20.608 G Hell parity
  call"). The 12.646 G is the replay of puzzle 1, two calls (set 5.817 + candidate 6.829 G); the 20.608 G Hell 1 call ended
  `not-in-band`, with no final, by itself. The largest successful `require` call is 10.274 G (12x12 Nightmare parity selection).
  32 G still covers every observed `require` call; the basis is three successes up to 10.27 G and one failure at 20.61 G.
- **E2 [V], P7 in the freeze** (2.5): contradicts N-V4-05 and plan §6 and is not flagged as a deviation.
- **E3 [V/A], 8 G and 32 G** (5.4): "exceeds every completed successful trace" holds for the pilots but not at validation size
  (2.2: about 0.9 and 1.6 expected stopped successes in V4-S4).
- **E4 [V], the 20x20/26x26 row of 5.4** quotes "7.70 G including the set on 26x26"; `fr-ps` reached 8.531 G there (8.330
  before its final primitive). Immaterial under 16 G.
- **E5 [V], formal prices only.** Q-A03 and Q-A04 quote 204.50 and 390.61 projected; at V4-S2's measured times they are 52.1 to
  58.1 and 164.9 to 174.9. The arithmetic is right; the owner should see both (2.8).
- **E6 [V], a line reference.** `LIVE_DEADLINE_FIELDS` is at `lib/proof.mjs:26` (its comment at `:25`), not `:27`.
- No other error found: SA-Astra's numbers are reproducible and its readings of the plan hold, except E2.

## 4. Corrections to my own analysis

1. **Classes** (round 1 A.4, 4.1, 5.1, Q1): the decidable class is **196-215**, not 196-256 (2.1); 16x16 joins `n-mid-high`
   (216-324, evaluated). My statement "the work condition is decidable for the Nightmare classes up to 256 cells" overstated a
   five-row bootstrap: decidable at pilot size, fragile at 20 seeds.
2. **`require`** (4.2, 5.1, Q2): a finite budget, Nightmare 32 G and Hell 1 40 G (2.3); Q2 withdrawn.
3. **`any`** (4.3, 5.1, 5.2): per level and area class, 10 / 40 / 16 G (2.2), not 10 / 40 G per level; the encoding's edit is
   the lookup by mode, level and area class, in the frozen family's own files.
4. **Prior** (4.4, 5.1): the piloted Hell 1 entries by `prior-v1`'s own rule (2.8), and the unpiloted 215 to 484 entries from
   PM1's windows (agreement 10), not my linear interpolation, which no plan text supports (plan P4: "filled from PM1's windows";
   IG-P-Q27: "PM1's first slice"). My `wc/K` statistic (0.403125 on 14x14, 0.368421 on 20x20) is withdrawn.
5. **P7** (4.9, 5.4): before the freeze in the pack (2.5); "after phase 0" withdrawn. Its content stands.
6. **Linkage** (A.10): "0.0 s in 32 of 33 groups and 0.1 s in one" was a rounding artefact; exactly 0.025 to 0.050 s per arm and
   cell.
7. **`V4-S3P`** (4.8, F06): it now runs before `freeze.json` is written and carries the composite rows (2.4 (b)).
8. **N-V4-18** (4.6): unchanged ("no"), with the realistic saving 90.3 to 94.8 and the dependence on the class map (2.7).
9. **Order of the pack** (section 8): N-V4-19 and N-V4-20; `V4-S2B` (S-1); the P7 spike (owner's allowance for its probe); the
   frozen candidate encoded (table, four variants, no `freeze.json`); the live deadline (N-V4-13); `V4-S3P` with the composite
   rows (S-2a); the SAs' reading; `freeze.json` (write once); `V4-LIVE` (S-2b); `activate` and `V4-S4` (S-3); `V4-S4C` (S-5);
   the stage-4 report and phase 0. Indicative caps if every earlier run spends its full guard: S-1 201, then 220 with the spike's
   probe, S-2a 394, S-2b 438, S-3 about 1,920 (about 1,732 at the realistic spends), S-5 about account + 732. The realistic total
   of the remaining machine work is about 710 to 780 counted minutes.

## 5. Merged question list

One list for both analyses. Addressees: the supervisor's questions go in one round of `clarifications.md`; the owner's are
asked at their stops. Technical points still split after the joint report (2.1's 216+ classes, 2.2's 8 / 10 and 32 / 40 G,
2.3's Hell 1 `require`, 2.8's statistic) join the supervisor's round as SA disagreements.

| ID | To | Status | Question (one line) | Recommendation and held figures |
|---|---|---|---|---|
| S1 | supervisor | kept (my Q1, reframed; SA-Astra's "no override needed" for the split is right) | N-V4-14: at pilot size the work condition is decidable only on 196-215; it is undecidable on every piloted board of 256 cells or more (16x16, 15x20, 26x26 Nightmare; 26x26 Hell 1); the SAs freeze 196-215 (decidable) and evaluate 216-324 and 360+ (expected inconclusive, no screen), with no remedy this round: confirm, or ask for a tighter-bound proposal before `V4-S4`? | confirm; 196-215 margin 0.710 G (z 5.9 / 3.0), 196-256 0.229 G (z 2.2 / 1.1) |
| S2 | supervisor | kept (SA-Astra's Q-S01, reframed) | P4's premise: `prior-v1` has no PM1 or R28 entry (20x20 Hell 1 ran from K - 8); may the freeze adopt the IG-P-Q27 table (stage-2 medians on four boards, PM1 on eight) after the composite check, or is a replacement pilot round needed? | (a) the IG-P-Q27 table after the check |
| S3 | supervisor | added, conditional | Only if SA-Astra keeps it: may the frozen arms carry a P7 composite ("kernel choice" in the freeze), against N-V4-05 and phase 0's "no runtime change"? | no |
| Q2 | supervisor | withdrawn | (`require` without a budget) | replaced by Q-A01 |
| Q-A01 | owner | kept | P5 for `require`: a finite budget (with the four-attempt bound and a real replay proof), no budget (would also need the supervisor: IG-P-D1), or a bound that counts budget stops? | finite: Nightmare 32 G, Hell 1 40 G (SA-Astra 32 G for both) |
| Q-A03 / Q3 | owner | merged | Runs before the freeze: (a) `V4-S2B`, controls, now; (b) the composite check in `V4-S3P` before `freeze.json`; (c) SA-Astra's `V4-S2F` instead; (d) none | (a) 28.24 guard, cap 201, 16 to 20 realistic; (b) 84.61 guard + the proofs' 89.00, 40 to 44 realistic with the proofs; not (c) (255.63 guard, cap 428, 52 to 58 realistic) |
| Q-A02 | owner | kept | The P7 spike's timing probe (at most three candidates), in the plan's order before the freeze; option: let it follow the freeze (needs the supervisor) | approve 20 minutes (15.50 projected / 19.37 guard, cap 192 alone) |
| Q-A04 / Q4 | owner | merged | N-V4-18 before the activation? | no; saving 90 to 95 realistic (240.37 / 300.46 formal) with the held classes, 165 to 175 (390.61 / 488.26) with SA-Astra's |
| Q-A05 | owner, at S-2b | kept (my S-2) | `V4-LIVE` after `freeze.json` and the live deadline | approve; 35.12 / 43.91, cap 217 today (not 793), re-read then |
| Q-A06 / Q5 | owner, at S-3 | merged | S4-6, and the authorization of `activate` | no S4-6 (58.00 / 72.50); authorize, both conditional boards by the rule |
| Q-A07 | owner, at S-3 | kept (my S-3) | `V4-S4`'s allowance | approve the full collection; 1,185.49 / 1,481.86, 468 to 514 realistic; cap about account + 1,482 |
| Q-A08 | owner, at S-5 | kept (my S-5) | `V4-S4C`'s allowance | approve; 585.62 / 732.02, 170 to 183 realistic |

**Held figures, in one place** (the orchestrator's list): screen classes 196-215 decidable (not 196-256), 216-324 and 360+
evaluated at 190 M (not "none"); P5 `any` 10 / 40 / 16 G (not 8 / 32 / 16, not 10 / 40 per level); `require` 32 G Nightmare,
40 G Hell 1 (not "none"); `V4-LIVE` cap 217 today (793 obsolete); P7's spike before the freeze, never in the frozen arms; the
control pilot `V4-S2B` yes (28.24 guard, 16 to 20 realistic), and a composite check inside `V4-S3P` instead of `V4-S2F`; Hell 1
prior 0.382353 / 0.349624 / 0.216899 / 0.200000 on the piloted boards and PM1's eight values elsewhere; N-V4-18 no; S4-6 no.

## 6. Evidence

```powershell
cd Q:\git\pentomino
node docs\improve-generating-stages-2-4\evidence\sa-opus\x1-recheck.mjs   # x1-recheck.json|md: sections 1-9 of this review's re-checks
node docs\improve-generating-stages-2-4\evidence\sa-opus\x1-prices.mjs    # x1-prices.json|md: T11g / T11e prices and realistic estimates
node docs\improve-generating-stages-2-4\evidence\sa-opus\s0-conventions.mjs
npm run check
```

Inputs: the V4-S2 published runs and raw journals (`docs/improve-generating/evidence/frozen/V4-S2/`,
`tests/artifacts/ig-proto/frozen/V4-S2/`), `tests/artifacts/ig-proto/frozen/V4-S2P/parity-fr-base|parity-fr-p5/`
(`items.jsonl`, `logs/`), `docs/improve-generating/evidence/provisional/IGP-05/families-windows.jsonl` and
`families-failed-sets.jsonl`, `docs/improve-generating/evidence/frozen/V4-S2K/kernel.json`, `tools/ig-proto/plans/V4-S2.json`,
`plans/V4-S4.universe.json`, `data/frozen-round-v1.json`, round 1's `s2-prior.json` and `s4-cost.json`. Code cited:
`tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js:82-88, 97-112, 422-426`; `tools/ig-proto/verdicts.mjs:908,
1539-1540`; `tools/ig-proto/v4-check.mjs:129, 1595-1596`; `tools/ig-proto/lib/lane-worker.mjs` (`selectItem`);
`tools/ig-proto/lib/tree.mjs:249`; `tools/ig-proto/lib/proof.mjs:26`; `tools/ig-proto/fit-prior.mjs:2, 43-53`; plan
`docs/improve-generating/plan.md:302-306, 335, 546-552, 664-665`; `tasks/improve-generating-v4/check-list.md:627, 636, 640, 643`.
