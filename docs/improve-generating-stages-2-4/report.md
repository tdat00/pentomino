# Improve generating, stages 2 to 4 of the frozen round: joint report (round 1)

| Item | Value |
|---|---|
| Status | **Draft (round 1)**, revised after SA-Astra's review (`sa-astra/round-1-draft-review.md`); not a freeze, an allowance or an activation |
| Drafter / reviewer | SA-Opus (claude-opus-5.5) / SA-Astra (gpt-6-astra), role sa |
| Base | `c159ab4` (both analyses and both cross-reviews); V4-S2's evidence `35b401e`; frozen source `3fc65f4` |
| Request | [`request.md`](request.md): the owner, 2026-11-23 12:54 +07:00, "continue doing all the work until it is finished" |
| Binding plan | [`../improve-generating/plan.md`](../improve-generating/plan.md) v4 (`c3ef770`, plan author SA-Fable); the v4 pack `tasks/improve-generating-v4/` (`0edc636`) |
| Authority | For a matter that would previously have required the supervisor, both SAs decide jointly under the owner's delegation (2026-11-23 15:29 +07:00, Discord message 1574341211701907457). Owner approvals remain mandatory, and a joint decision changing one of the owner's recorded decisions still needs his confirmation. |
| With this report | the sub-plan [`plan.md`](plan.md) and the open questions [`clarifications.md`](clarifications.md) |

**Labels.** **[V]** verified: recomputed from the records or read at the cited `path:line` by at least one SA and re-checked by
the other (both cross-reviews re-derived every number they cite from the raw records, not from the other's prose). **[A]**
assumed: a judgement, a fit or a projection, with its basis. G = 10^9 work units. A *counted minute* is node time plus at most
45 quiet seconds per locked invocation (check-list §1). Pilot statistics rest on five fitting seeds: readings, never verdicts.
Sources: `sa-opus/` and `sa-astra/` (analyses and cross-reviews), `evidence/sa-opus/` and `evidence/sa-astra/` (scripts and
outputs; commands in section 7).

## Summary

1. **V4-S2 is complete and clean [V].** 165 valid requests, 164 reached ten, 1,642 puzzles, no dead-end entry, every work
   ledger and linkage timeline complete. The round has used 172.3 of the 749 counted minutes granted; V4-S2 itself cost 122.3
   against a projection of 559.2.
2. **The screen [V/A].** 190 M on Nightmare 196 to 256 cells (14x14, 15x15b10, 16x16: x2.2 to 2.6 faster, per-cell median
   shifts 0, 0 and +0.5 clues, within the tolerance, the work condition decidable and met at pilot size). The 257-324 and 360+
   classes run screened and are evaluated, but their work condition is undecidable at pilot size (N-V4-14), so no screen is
   expected there. No screen up to 144 cells or on Hell 1.
3. **The other frozen values (agreed) [A].** The Hell 1 start table is refitted (stage-2 pilots on four boards, PM1's windows on
   eight), the Nightmare table is unchanged, the per-set prior runs on Hell 1 only. No (c4), no bracket close, no ranker; the
   rescue stays. P5: 10 G per Nightmare call and 40 G per Hell 1 call in `any` mode; four same-side attempts. Deadline: 0.6 of
   it reserved for the batch (a 46-s set stage), one 115-s stop, a hard 120-s response.
4. **`require` calls get a finite budget** of 32 G (Nightmare) and 40 G (Hell 1) per selection call: technical values agreed,
   the policy confirmed by the owner (Q-S24-3).
5. **New runs before stage 4, all inside the 749 [A]:** a control pilot on the eight never-piloted controls (about 16-20
   counted minutes), the P7 spike's timing probe (11.4-12.9, a timing-proxy scenario), the four frozen arms' proofs with the
   20-request uncapped Hell 1 check before the freeze (40-44), and `V4-LIVE` (4-5).
6. **Stage 4 needs larger allowances [A].** `V4-S4` is about 464-510 counted minutes at the timing proxy (formal guard
   1,481.9; a minimum cap of about 1,726 to 1,737 on the account) and `V4-S4C` 170-183 (guard 732.0); the round would end near
   878 to 947 counted minutes.
7. **P7's spike** runs before the freeze, as the plan orders; the frozen arms keep the reference kernel (D-S24-22).
8. **Decisions and questions.** Under the owner's delegation (2026-11-23 15:29, Discord) the SAs decided the former supervisor
   questions and their three disagreements jointly (section 6). Five owner questions remain open
   ([`clarifications.md`](clarifications.md)); none is for the supervisor.

## 1. The stage-2 report

### 1.1 What ran [V]

V4-S2 ran from 2026-11-20 18:24 (P-0) to 2026-11-23 12:05:58 +07:00 (exit 0), 44 locked invocations, none killed. Seven arms,
33 arm-cell shards, reps 0 to 4 of `landscape/<cell>/<rep>`, `uniqueness: 'any'`, four workers. P-0 passed; the P-1 parity passes
passed with accepted bindings for `fr-base`, `fr-screen`, `fr-none`, `fr-close`, `fr-c4` and `fr-ps`; `fr-p5`'s receipt is
`incomplete` (replay without a pack) and has no binding (N-V4-21; ruling of 2026-11-23, `check-list.md:617`). The probes:
`V4-S2K` (kernel counters equal on 30 of 30 items, profile complete) and `V4-S2W` (540 of 540 timed ratings).

The round's account: 10,252.712 s logged + 87.4 s off-log = **172.335 counted minutes of 749**; runs pass 747
(`evidence/sa-opus/s2-account.mjs`; `evidence/sa-astra/review-records.json` `account`).

### 1.2 Rows per arm and cell [V]

All 165 rows valid; T1 and T10 in seconds; clue share = clues / K; census-estimate share = accepted puzzles rated with an
incomplete census; work per accepted puzzle from T09c's ledger (`lo` completed, `hi` with the open primitives' proved bounds);
`W` = the `start` lines' screen limit (equal to the arm's class value on all 3,410 starts, N-V4-17). Class = T08's class as
piloted. Both SAs' recomputations agree on all 33 groups (`evidence/sa-opus/s2-table.md`;
`evidence/sa-astra/review-records.json` `crossChecks`).

| Cell (class as piloted) | Arm | Ten of 5 | T1 med | T10 med (max) | Response max | Clues med (share) | Census-est. | Work lo / hi G | W |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 12x12 Nightmare (n-small) | fr-base | 5 | 1.4 | 12.8 (28.4) | 28.6 | 4.0 (0.211) | 0.42 | 1.66 / 2.35 | 760 M |
| 12x12 Nightmare (n-small) | fr-screen | 5 | 1.4 | 6.8 (16.1) | 16.3 | 5.0 (0.263) | 0.16 | 0.89 / 1.24 | 190 M |
| 12x12 Nightmare (n-small) | fr-none | 5 | 1.4 | 12.9 (28.4) | 28.6 | 4.0 (0.211) | 0.42 | 1.66 / 2.40 | 760 M |
| 12x12 Nightmare (n-small) | fr-close | 5 | 1.4 | 12.9 (28.3) | 28.4 | 4.0 (0.211) | 0.42 | 1.66 / 2.39 | 760 M |
| 10x10 Nightmare (n-small) | fr-screen | 5 | 4.1 | 16.3 (72.8) | 73.0 | 4.0 (0.235) | 0.50 | 2.20 / 2.37 | 190 M |
| 10x10 Nightmare (n-small) | fr-none | 5 | 4.3 | 10.6 (51.4) | 51.6 | 3.0 (0.176) | 0.86 | 1.64 / 2.02 | 760 M |
| 14x14 Nightmare (n-mid) | fr-base | 5 | 1.6 | 8.9 (11.5) | 11.7 | 7.0 (0.292) | 0.10 | 0.92 / 1.71 | 190 M |
| 14x14 Nightmare (n-mid) | fr-screen | 5 | 1.6 | 8.9 (11.6) | 11.7 | 7.0 (0.292) | 0.10 | 0.95 / 1.75 | 190 M |
| 14x14 Nightmare (n-mid) | fr-none | 5 | 4.7 | 24.1 (30.8) | 30.9 | 6.0 (0.273) | 0.08 | 2.58 / 3.73 | 760 M |
| 14x14 Nightmare (n-mid) | fr-close | 5 | 1.6 | 9.0 (15.8) | 16.0 | 6.5 (0.289) | 0.06 | 1.01 / 1.81 | 190 M |
| 14x14 Nightmare (n-mid) | fr-c4 | 5 | 2.2 | 10.7 (11.7) | 11.8 | 6.0 (0.279) | 0.10 | 1.09 / 1.84 | 190 M |
| 14x14 Nightmare (n-mid) | fr-p5 | 5 | 1.7 | 8.7 (11.5) | 11.6 | 7.0 (0.292) | 0.10 | 0.92 / 1.71 | 190 M |
| 15x15b10 Nightmare (n-mid) | fr-screen | 5 | 1.8 | 8.1 (14.5) | 14.7 | 6.0 (0.267) | 0.04 | 0.99 / 2.10 | 190 M |
| 15x15b10 Nightmare (n-mid) | fr-none | 5 | 4.8 | 24.3 (31.3) | 31.4 | 6.0 (0.261) | 0.14 | 2.69 / 4.14 | 760 M |
| 16x16 Nightmare (n-mid) | fr-screen | 5 | 1.5 | 7.9 (13.2) | 13.4 | 6.0 (0.250) | 0.30 | 1.00 / 3.00 | 190 M |
| 16x16 Nightmare (n-mid) | fr-none | 5 | 2.6 | 17.8 (28.4) | 28.6 | 5.0 (0.217) | 0.40 | 2.27 / 4.83 | 760 M |
| 15x20 Nightmare (n-mid) | fr-screen | 5 | 1.7 | 10.4 (11.6) | 11.8 | 6.0 (0.231) | 0.18 | 0.86 / 3.94 | 190 M |
| 15x20 Nightmare (n-mid) | fr-none | 5 | 4.2 | 19.7 (22.0) | 22.2 | 5.0 (0.200) | 0.30 | 1.41 / 4.78 | 760 M |
| 26x26 Nightmare (n-large) | fr-base | 5 | 2.1 | 17.5 (19.3) | 19.5 | 5.0 (0.161) | 0.88 | 1.58 / 68.95 | 760 M |
| 26x26 Nightmare (n-large) | fr-screen | 5 | 2.1 | 11.7 (14.5) | 14.7 | 5.0 (0.161) | 0.86 | 1.11 / 61.65 | 190 M |
| 26x26 Nightmare (n-large) | fr-none | 5 | 2.1 | 17.9 (19.5) | 19.6 | 5.0 (0.161) | 0.88 | 1.58 / 68.88 | 760 M |
| 26x26 Nightmare (n-large) | fr-c4 | 5 | 3.4 | 20.3 (24.3) | 24.5 | 5.0 (0.159) | 0.88 | 2.01 / 72.22 | 760 M |
| 26x26 Hell 1 | fr-base | 5 | 6.1 | 31.9 (44.3) | 44.5 | 8.0 (0.200) | 1.00 | 4.21 / 64.65 | 760 M |
| 26x26 Hell 1 | fr-screen | 5 | 7.0 | 35.8 (41.2) | 41.4 | 8.0 (0.200) | 0.98 | 3.86 / 52.55 | 380 M |
| 26x26 Hell 1 | fr-none | 5 | 6.0 | 32.3 (44.3) | 44.5 | 8.0 (0.200) | 1.00 | 4.24 / 64.19 | 760 M |
| 26x26 Hell 1 | fr-close | 5 | 5.9 | 32.1 (43.9) | 44.1 | 8.0 (0.200) | 1.00 | 4.21 / 64.73 | 760 M |
| 26x26 Hell 1 | fr-ps | 5 | 5.9 | 28.0 (41.8) | 42.0 | 8.0 (0.200) | 1.00 | 3.71 / 55.17 | 760 M |
| 26x26 Hell 1 | fr-p5 | 5 | 6.0 | 35.1 (59.9) | 60.1 | 8.0 (0.193) | 1.00 | 5.02 / 70.63 | 760 M |
| 20x20 Hell 1 | fr-base | 5 | 5.9 | 38.4 (48.6) | 48.8 | 14.0 (0.350) | 0.38 | 5.22 / 10.37 | 760 M |
| 20x20 Hell 1 | fr-ps | 5 | 5.9 | 32.5 (45.8) | 46.0 | 13.0 (0.342) | 0.38 | 4.75 / 9.57 | 760 M |
| 20x20 Hell 1 | fr-p5 | 5 | 5.4 | 42.0 (48.9) | 49.1 | 12.0 (0.316) | 0.62 | 5.06 / 10.72 | 760 M |
| 24x24 Hell 1 | fr-base | 5 | 8.1 | 37.1 (42.9) | 43.1 | 9.0 (0.217) | 0.88 | 4.27 / 29.20 | 760 M |
| 14x14 Hell 1 | fr-base | 4 | 19.0 | 93.6 (142.8) | 150.6 | 13.0 (0.382) | 0.74 | 15.13 / 16.03 | 760 M |

The complete two-sided population table is incorporated as part of this report:
`evidence\sa-astra\stage2-computed.md:48-84`, covering all 33 arm/cell groups with clue-share and normalized
score-position median/minimum/maximum and census-estimate share; full precision is in
`stage2-computed.json.groups[*].population`. It is read beside the timing table, not replaced by the
selected-cell summary in §1.11.

Calls [V]: 3,410 selection calls; 843 without an end line (closed by a worker termination), 839 of them on an open primitive;
2,567 ended. Every ended call of the six uncapped arms (2,258) ended `ok`; `fr-p5` ended 240 `ok` and 69 `not-in-band` by its
budget. No call ended without a window, the rescue never fired, zero dead-end entries.

### 1.3 Determinism and noise [V, with one correction]

Equal effective configurations (`fr-base` and `fr-none` on 12x12 Nightmare, 26x26 Nightmare and 26x26 Hell 1; `fr-base` and
`fr-screen` on 14x14 Nightmare) gave identical ordered puzzle keys on 20 of 20 seed pairs, with capped-T10 ratios 0.994 to
1.110. The prototype is deterministic across arm ids and runs. **Correction (SA-Astra, E1):** equal puzzles do not show that a
mechanism did not run: `fr-close` on 14x14 Nightmare rep 0 returns `fr-base`'s puzzles after two bracket-close re-ratings, with
T10 6.82 s against 5.27 s (`evidence/sa-astra/review-records.json` `mechanismCounterexamples`); the journals (N-V4-17) tell the
two apart. [A] The machine noise of a few per cent makes 10 to 20 % effects readable at five seeds; this is a reading of
the same-configuration pairs, not a rule.

### 1.4 The screen classes and N-V4-14

Per cell, the screen arm against the no-screen arm (ratio = capped T10 of `fr-none` over `fr-screen`; d = per-set median clue
difference over the matched sets, 5 of 5 on every cell; work by T09c's `workRule`) [V]:

| Cell (area) | Ratios rep 0-4 | Geo | d | Work, screen [lo, hi] against none [lo, hi], G per puzzle | Work rule |
|---|---|---:|---:|---|---|
| 10x10 (100) | 0.45 0.71 0.71 1.04 0.65 | 0.687 | +1.0 | [2.20, 2.37] against [1.64, 2.02] | worse |
| 12x12 (144) | 1.12 1.20 3.54 1.76 1.71 | 1.702 | +1.0 | [0.89, 1.24] against [1.66, 2.40] | pass |
| 14x14 (196) | 3.13 2.10 2.66 2.77 2.46 | 2.601 | 0 | [0.95, 1.75] against [2.58, 3.73] | pass |
| 15x15b10 (215) | 2.35 2.77 3.21 2.15 2.06 | 2.474 | 0 | [0.99, 2.10] against [2.69, 4.14] | pass |
| 16x16 (256) | 2.26 2.15 2.23 2.34 2.22 | 2.239 | +0.5 | [1.00, 3.00] against [2.27, 4.83] | unknown |
| 15x20 (300) | 1.71 1.89 2.37 1.77 0.91 | 1.651 | 0 | [0.86, 3.94] against [1.41, 4.78] | unknown |
| 26x26 Nightmare (676) | 1.28 1.28 1.34 1.66 1.81 | 1.458 | 0 | [1.11, 61.65] against [1.58, 68.88] | unknown |
| 26x26 Hell 1 (676, 380 M) | 0.66 1.09 1.45 1.25 1.09 | 1.074 | +0.5 | [3.86, 52.55] against [4.24, 64.19] | unknown |

Pooled (the faster rule's recipe: geometric mean and the 10th percentile of 10,000 seed resamples) [V]:

| Pool | Faster geo / lower | Clue n / median d / moved 2+ | Work, screen against none (G per puzzle) | Work rule | Margin none lo - screen hi |
|---|---|---|---|---|---:|
| up to 144 (10x10, 12x12) | 1.081 / 0.921 | 10 / +1.0 / 0 | [1.55, 1.81] against [1.65, 2.21] | unknown | - |
| 196-324 as piloted (14x14, 15x15b10, 16x16, 15x20) | 2.208 / 2.050 | 20 / 0 / 0 | [0.949, 2.698] against [2.237, 4.371] | unknown | -0.461 |
| **196-256** (14x14, 15x15b10, 16x16) | **2.433 / 2.349** | 15 / 0 / 0 | **[0.979, 2.284] against [2.512, 4.234]** | **pass** | **+0.229** |
| 196-215 (14x14, 15x15b10) | 2.537 / 2.406 | 10 / 0 / 0 | [0.968, 1.925] against [2.635, 3.936] | pass | +0.710 |
| 257-324 piloted (15x20) | 1.651 / 1.363 | 5 / 0 / 0 | [0.860, 3.940] against [1.410, 4.781] | unknown | -2.530 |
| 360+ piloted (26x26 Nightmare) | 1.458 / 1.348 | 5 / 0 / 0 | [1.11, 61.65] against [1.58, 68.88] | unknown | - |
| Hell 1 at 380 M (26x26) | 1.074 / 0.919 | 5 / +0.5 / 0 | [3.86, 52.55] against [4.24, 64.19] | unknown | - |

**Where the width comes from [V].** In every row `hi - lo` is the sum of the proved bounds of the open primitives of the
calls closed by a worker termination (the speculative tail of the fold; about five per request). T02d's bound of one open
primitive against the median units of a completed one: about 3 times on 10x10 Nightmare, 4 to 5 on 12x12, 7 to 13 on 14x14 and
15x15b10, 27 to 29 on 16x16, 56 to 58 on 15x20, 180 to 330 on 26x26 Hell 1 and about 780 on 26x26 Nightmare (R9's
`3 (NC^2 / 2) K L` term dominates on large boards, `ig-select-v4.js:272-276`); the plan author's "up to 840 M per open rating"
(IG-P-Q37 point 4) holds only on the smallest boards. More seeds do not narrow it: the width per puzzle is about five open
bounds over ten puzzles in every request (`evidence/sa-opus/s2-work.md`).

**N-V4-14's answer [V].** At pilot size the work condition is decidable and met on the 196-256 and 196-215 pools and on 12x12
alone, `worse` on 10x10, and undecidable on every measured pool that holds 16x16 alone, 15x20 or a 26x26 board. This is a
statement about the measured pools and configurations, not about unmeasured controls (SA-Astra's correction E4). No tighter
bound or relaxation is proposed in this round (D-S24-18): such a remedy would be a new proposal, decided jointly by the SAs
under the owner's delegation (N-V4-14 routed it to the plan author), with the owner's approval of any machine time it needs.

**196-256 against 196-215 (agreed) [V].** Both candidate pools meet the measurable pilot conditions, not the validation
minimum. The 196-256 pool gives a time factor 2.433033 and has screen upper work 2.283682 G/puzzle below no-screen lower work
2.512292 G/puzzle. Its margin is 0.228610 G/puzzle, smaller than 196-215's 0.709821; rep 0's pooled margin is negative. The SAs
choose 196-256 to include the measured 16x16 benefit, accepting the risk that a failed class sends all three cells to the
no-screen fallback. Only five independent seeds per cell were observed. The synthetic resampling is descriptive, not a
calibrated probability of passing held-out validation.

### 1.5 The per-set prior on Hell 1 (S2-1) [V]

`fr-ps` against `fr-base`: 26x26 Hell 1 geo 1.081, 20x20 Hell 1 1.107; pooled **1.094, lower 1.008**; batch time factor 1.109
and 1.139 (gamma 0.90 and 0.88). The prior reached 183 of 183 batch calls, each with the `wc` of the set attempt the run records;
locate profiles per batch call fell 5.537 to 2.591 (20x20) and 3.014 to 1.744 (26x26); 10 of 10 matched sets, d 0. The gain is
modest and measured against a weak table (20x20 started at K - 8, section 1.11); its margin over a refitted table is unmeasured.
Plan §6: the per-set prior ships "if its pilot paid": both SAs adopt it on Hell 1, not on Nightmare (not piloted there).

### 1.6 (c4), bracket close and N-V4-17 [V]

- **`W`:** every `start` line carries its arm's class value (3,410 of 3,410).
- **(c4):** acted in 61 of 73 ended calls on 14x14 Nightmare (sides 15 `in`, 44 `above`, 2 `below`) and 71 of 74 on 26x26
  Nightmare (29, 41, 1); 64 and 75 completed `below` profiles (3 and 4 in calls without an end). It cost T10: 0.837 and 0.831
  (pooled 0.834, lower 0.776), that is +20 %; plan P3 adopts it only below 10 % (`plan.md:293-294`): **not adopted**.
- **Bracket close (D-IG7):** acted on 14x14 Nightmare only (8 calls: 4 `in`, 4 `above`; 8 `close` profiles); it could not act
  on 12x12 Nightmare and 26x26 Hell 1 (no screen-capped endpoint there). It cost T10 0.874 (lower 0.804): **not adopted**. The
  rescue stays (`rerateMax` 4). Stage 2 measured bracket close on one of its three cells.

### 1.7 The Hell 1 pilots and the activation [V]

24x24 Hell 1: 5 of 5, T10 27.4 to 43.0 s (median 37.1). 14x14 Hell 1: 4 of 5, T10 84.4 to 142.8 s (median 93.6); rep 1 reached
ten at 142.807 s, rep 3 returned two puzzles at 150.629 s. Rep 3 failed by head-of-line blocking in the ordered fold: slot 3's
attempt 1 was dispatched 33.991 s into the batch and was still running at the 115.018-s discard, while slots 4 to 10 held finished
candidates (`tests/artifacts/ig-proto/frozen/V4-S2/fr-base/pilot-14x14-hell-1/logs/14x14-hell-1~3.link.jsonl`). D-V4-20's rule
(at least three valid requests reaching ten) activates **both** boards; IG-P-Q27's early-PM1 exception is not triggered. Under one
115-s stop 14x14 Hell 1 would complete 3 of 5 (a post-hoc projection). Hell 1 is reported, not gated (IG-P-Q30).

Hell 1's 18-of-20 candidate result is reported and does not veto phase 0. Its declared P5 comparisons,
required evidence, parity and live-deadline prerequisites still have to be complete and valid.

### 1.8 P5: the budget arm, N-V4-16 and N-V4-21

- **The 2-G arm [V].** 14x14 Nightmare: no stop (puzzles equal to `fr-base`'s). 20x20 Hell 1: 59 stopped calls (7 set, 52 batch);
  26x26 Hell 1: 59 (1 set, 58 batch). T10 0.894 (26x26) and 1.093 (20x20), pooled 0.988, lower 0.863: **no gain**; 20x20's clue
  share fell from 0.350 to 0.316. All 15 bounded/uncapped pairs are known: zero lost completions.
- **N-V4-16 [V]: not exercised.** No row has set attempts 0 to 3 each ending without a window on one side; the glue `p5-1` never
  handled a real no-window result; zero false stops is vacuous. Every `fr-p5` row has `partialReason` null.
- **N-V4-21 (a) [V].** Four `fr-p5` set attempts ended `not-in-band` by a budget stop with no side, all on 20x20 Hell 1: rep 0
  attempts 0 and 3, rep 2 attempt 3, rep 4 attempt 0, at 2.298471303, 2.339719457, 2.363961420 and 2.421547354 G. The bound
  counts none of them, by design.
- **`require` [V].** Every P-1 item runs `require` (`v4-check.mjs:129`; `lib/lane-worker.mjs` `selectItem`). `fr-base`: the
  12x12 Nightmare selection succeeded at 10.274 G; its generation's two calls at 5.817 and 6.829 G (the replays, 5.817 and
  12.646 G, both `matched`, are cumulative across stages: 12.646 G is not the candidate call alone); the 26x26 Hell 1 selection
  ended `not-in-band` by itself at 20.608 G after 92.6 s (a failed trace). `fr-p5`'s
  generation: 16 set attempts, 15 ended by the 2-G budget at 2.011 to 2.696 G, the request ended `no-set` `time-limit` at
  115,014 ms, so no pack to replay. The 2-G arm cannot give a replay proof. There is no representative request-level
  `require` pilot and no general affordability qualification (N-V4-15 stays open for production).
- **Successful call work [V].** The budget is checked before every rating and uniqueness count (`ig-select-v4.js:422-426`), so
  a budget stops an uncapped call when its work before the final primitive reaches it (SA-Astra's correction E3 to a "total
  work" reading). Over the 2,258 `ok` calls of the uncapped arms the largest work before the final primitive is 6.184 G on
  Nightmare (total 6.610), 25.560 G on Hell 1 up to 215 cells (26.168) and 13.633 G on larger Hell 1 boards (13.849, `fr-ps`
  on 20x20); 48 of 59 `ok` batch calls on 14x14 Hell 1 pass 2 G before their last primitive.

### 1.9 The deadline and the reserve (post-hoc projection, not a live gate) [V]

The set stage ended by 35.562 s at most (14x14 Hell 1), every other cell by 21.1 s. With 0.3 to 0.6 of the deadline reserved
for the batch (a set-stage cap of 80.5 to 46 s) no pilot set is cut; at 0.7 two 14x14 Hell 1 sets are. The only lost completion
under one 115-s stop is 14x14 Hell 1 rep 1 (142.807 s), lost to the stop itself. IG-P-D1 condition 4 reads 0 for the reserve.

### 1.10 The journal linkage [V]

All 165 timelines pass. Idle worker time while the fold awaits: 0.025 to 0.050 s per arm and cell (five rows; median 0.032),
against 32 to 459 s of awaiting: the fold waits behind occupied workers, not idle ones. IG-P-Q22's bounded-prefetch variant is
not indicated.

### 1.11 The prior, the population and P4's premise [V]

The pilots ran `prior-v1`, which holds MP12b1's accepted medians only (`tools/ig-proto/fit-prior.mjs:2`, `:43-53`): Hell 1
entries at 196 (0.265179), 576 (0.141026) and 676 (0.128205), none at 400. So 14x14 Hell 1's set calls started at 8 or 9 clues,
24x24's at 6, 26x26's at 5, and 20x20's 20 set calls had no table prior and started at K - 8. Plan P4 describes the table as
built with PM1's windows for Hell 1 on 215 to 484 cells and R28's for 14x14 and 24x24 (`plan.md:302-306`); IG-P-Q27 has stage 3
freeze it "from MP12b1's medians, PM1's first slice, R28 and stage 2's own pilots" (`plan.md:551-552`). That gap is settled by
the joint decision D-S24-21 (section 6): the stage-3 fit completes the table; V4-S2 stays valid evidence of what it ran.

This table compares V4-S2 accepted-puzzle shares with MP12b1 reps 10-19 accepted-puzzle medians stored in
`prior-v1`. These are unpaired population summaries, not `gen-v3`'s initial SHARES start counts and not
paired (c5) clue deltas. The sparse Hell baselines (two and four accepted puzzles at 196 and 576 in the
prior fit) must not be presented as precise population estimates.

| Cell (K) | Today (`prior-v1`) | After, no screen | After, screen | Census-estimate share (no screen / screen) |
|---|---:|---:|---:|---:|
| 10x10 Nightmare (17) | 0.200 | 0.176 | 0.235 | 0.86 / 0.50 |
| 12x12 Nightmare (19) | 0.211 | 0.211 | 0.263 | 0.42 / 0.16 |
| 14x14 Nightmare (22) | 0.190 | 0.273 | 0.292 | 0.08 / 0.10 |
| 15x15b10 Nightmare (23) | 0.182 | 0.261 | 0.267 | 0.14 / 0.04 |
| 16x16 Nightmare (23) | 0.174 | 0.217 | 0.250 | 0.40 / 0.30 |
| 15x20 Nightmare (26) | 0.192 | 0.200 | 0.231 | 0.30 / 0.18 |
| 26x26 Nightmare (31) | 0.133 | 0.161 | 0.161 | 0.88 / 0.86 |
| 26x26 Hell 1 (40) | 0.128 | 0.200 | 0.200 | 1.00 / 0.98 |
| 24x24 Hell 1 (40) | 0.141 | 0.217 | - | 0.88 |
| 14x14 Hell 1 (32) | 0.265 | 0.382 | - | 0.74 |
| 20x20 Hell 1 (38) | none | 0.350 | - | 0.38 |

### 1.12 A no-regression preview (an indication, not the gate) [V]

MP12b1 ran today's search on the same seeds (`landscape/<cell>/<rep>`); per seed, capped T10 of today over V4-S2 (below 1 the
new search is slower; `evidence/sa-opus/s2-today.md`): 10x10 Nightmare `fr-none` geo 1.64 (lowest seed 0.93); 26x26 Nightmare
`fr-none` geo **1.12, one seed 0.55, descriptive lower bound 0.881**, `fr-screen` 1.64 (0.70); the failing cells on `fr-none`
1.90 to 4.43. The controls are judged by a lower bound of at least 0.9 at 20 seeds (plan §5.2). **Eight of the ten controls were
never piloted** (3x29, 18x18, 18x20, 20x20, 20x21, 32x15, 22x22 and 24x24 Nightmare).

### 1.13 The kernel and width probes [V]

Counters equal on 30 of 30 items. Dirty over visited pieces 0.848 to 0.941 (clean visits 14.6 % on 14x14 and 5.9 % on 26x26
Nightmare); live over static rows 0.263 to 0.591; 32.48 M and 6.18 M kills in the six-item corpora. Profile: `fewestColumn` 4.824
of 10,099.6 ms of deduction (0.05 %) on 14x14 and 0 on 26x26; self time `ruleR4` 16.6 % and 19.0 %, `ruleR5` 4.3 % and 2.5 %,
`select + undo + kill` 24.5 % and 21.5 %, `reachable` 17.9 % and 1.1 %. Width: one rating at 8 workers is 1.022 (14x14) and 1.085
(26x26 Nightmare) times its time at 4. Inputs to P7 (section 3); the pool stays at four workers (P8 parked).

### 1.14 What stage 2 did not establish [V]

1. Eight of ten controls unpiloted (1.12): their no-regression risk and the Nightmare budget's affordability there are unmeasured.
2. No live deadline (N-V4-13 unbuilt): the reserve is a post-hoc reading.
3. No real firing of the same-side bound (N-V4-16); no completed P5 `require` generation; no representative `require` pilot.
4. The Hell 1 start table the plan describes (PM1, R28) was not in the pilots; the new table and its composite with the per-set
   prior and the budgets are unmeasured.
5. Bracket close on one cell only; the per-set prior not on Nightmare; one `W` value (190 M) per Nightmare class.
6. No screen pilot on 18x18 or the 360-576 Nightmare controls; no factorial on the conditional Hell 1 boards.
7. No P7 implementation: the counters and the profile are its inputs, not the spike.

## 2. The freeze proposal (stage 3)

### 2.1 What the freeze may use [V]

The fitting seeds: V4-S2's reps 0 to 4 and those of the supplementary runs (also reps 0 to 4), the provisional reps 0 to 5,
MP12b1's reps 10 to 19 (which filled `prior-v1`) and 0 to 9 (today's baseline), PM1's first slice and R28 (IG-P-Q25, IG-P-Q27,
`plan.md:551-562`). Never: the validation reps 20 to 39, Master reps 20 to 24, the second validation's 40 to 59 (D-V4-13), or any
stage-4 record. After the validation seeds run, no boundary, value or statistic changes; a failed class falls back to no screen
and is not refitted (`plan.md:645`).

### 2.2 `W_screen` and the classes (agreed) [A, fitted on V4-S2]

| Class | Level, active area | Frozen `W` | Comparator cells | Expected verdict |
|---|---|---:|---|---|
| `n-small` | Nightmare, up to 144 | none (IG-P-D4) | 3x29, 10x10, 12x12 | fixed, no screen |
| `n-mid` | Nightmare, 196-256 | 190 M | 14x14, 15x15b10, 16x16 | admitted, if validation confirms |
| `n-upper` | Nightmare, 257-324 | 190 M, evaluated | 15x20, 18x18 | inconclusive (work unknown): no screen |
| `n-large` | Nightmare, 360 and more | 190 M, evaluated | 18x20, 20x20, 20x21, 32x15, 22x22, 24x24, 26x26 | inconclusive: no screen |
| `hell-1` | Hell 1, every area | none | 14x14, 20x20, 24x24, 26x26 | fixed, no screen |

Nineteen comparator cells, each once, exactly those of T11e's pure `activation` on the published pilots (both conditional
boards). Areas 145 to 195 and 325 to 359 stay unlisted: no screen (IG-P-Q26). The evaluated classes cost nothing extra (both
twins run on every validated cell in the priced universe) and a failed or inconclusive class ships no screen without failing
phase 0 (`verdicts.mjs:908`, `:1539-1540`). At run time `fr-frozen` keeps T08's four runtime classes with `n-mid` (196-324) and
`n-large` at 190 M, which gives every verdict class its frozen `W`; the encoding checks that consistency per cell, and phase 2
derives the production table from the verdicts with `freeze.json`'s explicit bounds.

### 2.3 The priors (agreed) [A]

`prior-s3-v1` = `prior-v1`'s 15 Nightmare entries unchanged, and 12 Hell 1 entries (`evidence/sa-opus/j1-numbers.md` §1;
`evidence/sa-astra/review-records.json` `revisedPriorCandidate`):

| Area | 196 | 215 | 256 | 300 | 324 | 360 | 400 | 420 | 480 | 484 | 576 | 676 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Share | 0.400000 | 0.404412 | 0.358108 | 0.443429 | 0.347222 | 0.331514 | 0.368421 | 0.390244 | 0.297161 | 0.287500 | 0.219512 | 0.200000 |
| Source | V4-S2 | PM1 | PM1 | PM1 | PM1 | PM1 | V4-S2 | PM1 | PM1 | PM1 | V4-S2 | V4-S2 |

V4-S2 = `fr-base`'s ended-call window share `wc / K`, the median per pilot seed, then across the five seeds (the start the
locate should hit; no weight for seeds with more calls). PM1 = the eligible in-band clue shares of IGP-05's families, median per
order, then per seed, then over seeds. These are fitted starts, not measured improvements; the route is the joint decision
D-S24-21. At the reported median K values the proposed starts are 13,14,9,8 on 14x14,20x20,24x24,26x26 Hell 1. Each actual
call still uses `clamp(round(share*K),1,K-2)`; these are representative counts, not fixed counts for every set.
The per-set prior runs on Hell 1 only; no ranker (C3's data-only test has not run).

### 2.4 P5 [A]

- **`any` calls (agreed):** 10 G per Nightmare call, 40 G per Hell 1 call (a per-level table; equal entries over the area
  classes). The 10 G/40 G `any` candidates exceed the successful pilot traces' pre-final-primitive work. This supports
  affordability on those traces, not a forecast of the number of stopped successes in validation or a guarantee
  about new priors, interrupted calls or unmeasured controls. The budget buys determinism, not speed (the 2-G arm gained
  nothing).
- **`require` calls (technical values agreed; owner policy confirmation pending, Q-S24-3):** Nightmare
  32 G and Hell 1 40 G per selection call. These are conservative candidate limits, not measured general
  affordability guarantees. The successful Nightmare selection used 10.274 G; the generated set and candidate
  calls used 5.817 and 6.829 G. The 20.608 G Hell selection failed. The Hell limit is not set below the chosen
  40 G `any` policy as a conservative design choice, not because `require` work is mathematically always
  `any` work plus an extra count: repair and acceptance can change the subsequent search path.
  A budget-stopped `require` call returns only an already finished final. The four final arms must pass their
  real parity/replay proofs, and N-V4-15 remains open before production claims on larger boards.
- **Bounded set attempts (agreed):** four attempts failing without a window on the same side; a budget stop carries no side and
  never counts; the bound is read before the ordered winner scan.

### 2.5 The reserve and the deadline (agreed; N-V4-13) [A]

One deadline per request from its start: 0.6 of it reserved for the batch, so the set stage is cut at 46 s; the generation
stops at 115 s and the response returns the fold-order prefix of accepted puzzles; outstanding work is cancelled with its
closure lines; the host returns by 120 s at the latest. The clock may shorten the prefix, never change which puzzle fills a
slot (IG-P-D1).

### 2.6 `freeze.json`

`docs/improve-generating/evidence/frozen/V4-S3/freeze.json`, written once, keeps the shape T09e and T11f read,
`{ classes: [{ id, cells, screen: 'fr-frozen', noScreen: 'fr-frozen-none' }] }` (`manifest.mjs:2246`, `:2619`), and records
beside it: each class's level and area bounds and `W`; the table ids (`screen-s3-v1`, `prior-s3-v1`, `budget-s3-v1`,
`deadline-s3-v1`) and values; the mechanism flags (`c4` false, `rerate` `rescue`, ranker none, per-set levels `hell-1`); the
fitting and excluded seed recipes; the SHA-256 of every fit input and script; the four variants' tree ids and parameter
hashes. [`plan.md`](plan.md) §4.2 has the full design.

### 2.7 The Hell 1 check before the freeze and its read gate (D-S24-24)

The four final-family P-1 passes, then **20 `fr-frozen-none-uncapped` requests** on 14x14, 20x20, 24x24 and 26x26 Hell 1,
reps 0-4, before writing `freeze.json` (in `V4-S3P`; the owner approves the scope and its minutes, Q-S24-5). No extra 14x14
Nightmare rows and no candidate-arm `V4-S2F`; the control pilot addresses the unmeasured Nightmare cells separately.

> The SAs read all 20 valid published rows and their complete worker/link journals against the proposed bounded
> configuration, including losing and terminated calls. The reader accumulates main, census and uniqueness
> units in primitive order. It identifies any recorded next primitive whose selection-call spent total before it is at least
> the proposed budget; a terminated call whose completed spent total already reaches the budget is flagged
> as potentially affected, even without a following begin line. A currently running primitive is not assumed
> cut by P5: the check is between primitives, not inside one.
>
> The reader also tests the first-four same-side no-window condition from the set-call ends and reads the new
> table/per-set-prior transport. It computes the reserve/deadline projection from these new **uncapped**
> timelines, per cell, reporting projected reserve cuts and lost completions separately.
>
> If a budget or attempt bound could affect an observed path, or missing/ambiguous evidence prevents that
> determination, the freeze pauses for an SA ruling. Before accepting affected settings, the SAs specify the
> smallest necessary matched bounded experiment, price it under a new task/manifest and obtain the owner's
> approval. An uncapped prefix identifies risk; it does not identify which best candidate a truncated call
> would return, the changed fold timing, or request-level lost completions.
>
> If no observed path is flagged, the report may say the proposed deterministic limits would not intervene
> at the observed primitive boundaries. It must not call this a measured zero-loss bounded/uncapped comparison
> or a live-deadline proof. V4-LIVE and every declared V4-S4C comparison remain mandatory.

## 3. P7's scoped spike (N-V4-05)

- **Agreed:** before the freeze, as plan §5.1 orders (`plan.md:546`); isolated harness variants, no production edit, nothing in
  the `v4` chain. C1 first, ordered live-row lists for R4 (live over static rows 0.26 to 0.59) with the reference charge
  `L_p + 2 n_p s_p + (n_p > 0 ? s_p : 0) + sum(L_c) + sum(s_piece(r) + 1)`; then R5 (2.5 to 4.3 % of the profile); then C5
  (`select`, `undo`, the kill loops: 21.5 to 24.5 %). At most three candidate composites. No `fewestColumn` buckets, no
  common-cell cache (clean visits 6 to 15 %), no R7 redesign, memo or WASM. Complete `DeductionResult` equality (work and
  nodes) on PM4's corpus and T10a's, with tie order, cap boundaries, undo paths and near-32-MiB models; the memory rule as plan
  P7 states it. [A] Go at x1.04 or more on rating time, an SA choice recorded before the measurement (plan P7 projects x1.04 to
  1.15). Developer effort 14 to 22 hours.
- **Timing probe:** three composites x 90 paired items, one lane: 15.50 projected / 19.37 guard counted minutes (owner, Q-S24-6);
  11.4 to 12.9 in a timing-proxy scenario (T11g's own item schedule at V4-S2K's measured item times instead of 1.25 times them,
  `evidence/sa-opus/j1-numbers.md` §2), not a measured time of the new configuration.
- **The kernel (D-S24-22).** The P7 spike runs before the freeze, on isolated harness variants. The four frozen arms and their
  stage-4 comparators retain the frozen reference kernel. A passing P7 composite is recorded for the later phase-1
  production work; no P7 speed credit enters this frozen round's fit, prices or verdicts. Production adoption
  has its own equality, fixture, test and memory gates, and phase 2 repeats validation on the production code.
  Reference-kernel results are not claimed to be a mathematical lower bound on every later production ratio.

## 4. The pack outline (details in [`plan.md`](plan.md) §8)

N-V4-19 and N-V4-20; the control pilot `V4-S2B` (owner); the P7 spike (owner for its probe); the frozen family's parameters
(Hell 1 table, budget by mode, per-set on Hell 1); the live deadline (N-V4-13); the four frozen variants (a candidate epoch); the
live receipt and its acceptance by the receipt's own kind; `V4-S3P`, the four frozen arms' P-1 passes and the 20-request
uncapped Hell 1 check (owner for its scope, Q-S24-5), read through the gate of section 2.7 before `freeze.json`; the SAs'
reading; `freeze.json` (write once); `V4-LIVE` (owner); the S4-6 decision and `activate` (owner); `V4-S4` (owner, a raise);
`V4-S4C` (owner); the stage-4 report and phase 0 (N-V4-06) to the owner. Optional: N-V4-18 before the activation (owner, Q-S24-7).
Then phase 2 (N-V4-07, with N-V4-15), phase 3 (N-V4-08, N-V4-09), phase 4 (N-V4-11), N-V4-01, N-V4-04 and N-V4-10, each at its
gate.

## 5. Machine time

Formal prices are T11g's rules re-applied to each plan (`manifest.mjs` `stepPrice`, `price`; `evidence/sa-opus/x1-prices.md`,
equal to `evidence/sa-astra/review-records.json` `prices`). The timing-proxy figures use V4-S2's measured times of the same
steps (for the P7 probe, T11g's own item schedule at V4-S2K's measured item times) plus 15 s or 45 s of quiet per invocation:
scenarios, not measurements of the new configurations, and never caps. V4-S2 cost a fifth of its price, since today's search
times x 1.25 and a 45-s quiet are priced.

| Plan | Content | Projected | Guard | Timing proxy | When |
|---|---|---:|---:|---:|---|
| `V4-S2B` | `fr-none` on the 8 unpiloted controls, reps 0-4 (40 rows) | 22.59 | 28.24 | 16.0-20.0 | now (Q-S24-4) |
| `V4-P7` | the P7 timing probe: three composites x 90 paired items | 15.50 | 19.37 | 11.4-12.9 | after the spike's code (Q-S24-6) |
| `V4-S3P` proofs | the four frozen arms' P-1 passes (48 items) | 71.20 | 89.00 | 20.0-22.0 | before `freeze.json` (owner, at its gate) |
| `V4-S3P` Hell 1 check | `fr-frozen-none-uncapped` on the four Hell 1 boards, reps 0-4 (20 rows) | 67.69 | 84.61 | 20.0-22.0 | same plan (Q-S24-5) |
| `V4-LIVE` | `fr-frozen` on 14x14 Nightmare and 26x26 Hell 1, reps 0-4 | 35.12 | 43.91 | 4-5 | after `freeze.json` |
| S4-6 (optional) | today's arm on the five failing cells, reps 20-24 | 58.00 | 72.50 | - | at the activation |
| `V4-S4` | 1,120 rows + 48 P-1 items, both conditional boards | 1,185.49 | 1,481.86 | 464.3-509.8 | after the activation |
| `V4-S4C` | 380 uncapped comparator rows | 585.62 | 732.02 | 169.8-182.8 | after the final selection |
| N-V4-18 (optional saving) | 140 duplicate rows of `V4-S4` (not `V4-S4C`) | -240.37 | -300.46 | -90.3 to -94.8 | before the activation (Q-S24-7) |

**The account (now 172.3 of 749) [A]** (`evidence/sa-opus/j1-numbers.md` §3; `evidence/sa-astra/draft-review-check.json`):

| Gate | Guard min | Minimum cap at the timing-proxy spend | Cap if earlier guards are spent |
|---|---:|---:|---:|
| V4-S2B | 28.243734 | 201 | 201 |
| V4-P7 | 19.369531 | 208-212 | 220 |
| V4-S3P, proofs plus 20 Hell rows together | 173.609948 | 374-379 | 394 |
| V4-LIVE | 43.905504 | 284-294 | 438 |
| V4-S4 | 1,481.858106 | 1,726-1,737 | 1,920 |
| V4-S4C | 732.021379 | 1,441-1,497 | 2,652 |

These are minimum quotes for the named scope at the assumed spend, not replacement grants. Preserve an
already-active higher grant unless the owner explicitly changes it. Every new scope still needs approval;
a raise is needed only if its current minimum exceeds the current grant. In particular S4C's minimum may
be below the S4 grant after S4 underspends. Re-read the account and actual compiled plan at every gate.

End-of-round proxy: 877.817-946.817 counted minutes; guard-chain account: 2,651.343 minutes; about 1.2 to 1.4 hours of
machine before stage 4 and 10.6 to 11.6 hours in it. Today's `V4-LIVE` arithmetic remains 217 including off-log time, the
active grant 749, and the historical 793 was a full-S2-guard scenario.

## 6. Agreed positions, the joint decisions and the corrections

**Agreed by both SAs** (the cross-reviews at `c159ab4`, this draft and SA-Astra's review of it,
`sa-astra/round-1-draft-review.md`): the stage-2 facts of section 1; the five classes and their `W` (2.2); the priors (2.3);
`any` budgets 10 / 40 G, `require` budgets 32 / 40 G, the four-attempt bound (2.4); the deadline (2.5); no (c4), no bracket
close, the rescue kept, no ranker, the per-set prior on Hell 1 only; `V4-S2B`; the four frozen arms' P-1 passes before
`V4-LIVE` and the activation (these do not replace `V4-S4P`'s); the 20-request uncapped Hell 1 check and its read gate (2.7);
N-V4-18 not implemented by default; the P7 spike before the freeze, its content and the reference kernel in the frozen arms
(section 3); `V4-LIVE`'s cap 217 today (215 on the logs); the formal prices of section 5; no external ruling for the class
boundaries, which plan §5.2 leaves to the freeze (`plan.md:630-634`); no production change before phase 0.

**Joint decisions under the owner's delegation** (the authority row of the header; recorded in [`plan.md`](plan.md) §5):

- **D-S24-21** (the former Q-S24-1): P4's Hell 1 table is completed at the stage-3 fit from IG-P-Q27's sources and the agreed
  fitting checks; V4-S2 remains valid evidence of its actual configuration.
- **D-S24-22** (the former Q-S24-2 and disagreement D-1): the four frozen arms keep the reference kernel; a passing P7
  composite is recorded for phase 1 (section 3). SA-Astra withdrew its kernel-choice position in its draft review.
- **D-S24-23** (the former D-3): `require` budgets of 32 G (Nightmare) and 40 G (Hell 1) per selection call, as technical
  values; the owner confirms the finite policy (Q-S24-3).
- **D-S24-24** (the former D-2): the 20-request uncapped Hell 1 check with the read gate of 2.7, inside `V4-S3P`; SA-Astra
  withdrew the unconditional 50-row `V4-S2F`; the owner approves the scope and its minutes only (Q-S24-5).

These change no decision the owner recorded; no disagreement between the SAs remains open.

**Corrections each SA accepted.** SA-Opus, from SA-Astra's cross-review (E1 to E6): equal puzzles do not mean a mechanism did
not run; `require` was measured by the P-1 items, though not by a representative pilot; a budget stops a call by its work
before the final primitive, not its total; the resampling is synthetic and N-V4-14's finding is limited to the measured pools;
the 10-20 % readability is an assumption; the task order builds the live composition before the variants that extend it,
extends `accept` by the receipt's kind (no `--kind` flag), counts N-V4-18's saving on `V4-S4` only, and maps the screen twins
of 15x20 and 26x26 Nightmare to `fr-screen`'s times (`V4-S4` 464.3-509.8, not 468.3-513.8). SA-Opus, from SA-Astra's draft
review: the admission-probability and stopped-success forecasts are not evidence for the fit and leave the joint texts (they
stay in SA-Opus's own evidence, as assumptions); the Hell 1 `require` value is a conservative design choice, not a rule that
`require` work always exceeds `any` work; the uncapped journals identify risk at primitive boundaries, not a measured zero-loss
comparison (the read gate of 2.7); the controls' gate includes 18 of 20; equal widths hold without a clock cut; the P7 proxy
uses T11g's item schedule (11.4-12.9, not 11.1-12.6); caps are minimum quotes, not grants; the population table is unpaired,
and the complete two-sided table is part of this report. SA-Astra, from SA-Opus's cross-review: the 20.608-G Hell 1 `require`
call is a failed trace, not a success; its 8 G and 16-32 G `any` budgets gave way to 10 / 40 G (its D2); realistic estimates
stand beside the formal prices as scenarios, never as caps (its D7); and, in its draft review, the kernel choice and the
unconditional `V4-S2F` were withdrawn.

## 7. Evidence

```powershell
cd Q:\git\pentomino
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-rows.mjs        # rows, comparisons, noise (round 1)
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-work.mjs        # rule (c5) and N-V4-14 (round 1)
node docs\improve-generating-stages-2-4\evidence\sa-opus\x1-recheck.mjs     # cross-review re-checks: pools, priors, budgets, require
node docs\improve-generating-stages-2-4\evidence\sa-opus\x1-prices.mjs      # formal and realistic prices
node docs\improve-generating-stages-2-4\evidence\sa-opus\j1-numbers.mjs     # this report: prior candidates, probe proxy, account chain
node docs\improve-generating-stages-2-4\evidence\sa-astra\analyze-records.mjs
node docs\improve-generating-stages-2-4\evidence\sa-astra\review-records.mjs
node docs\improve-generating-stages-2-4\evidence\sa-astra\draft-review-check.mjs
node tools\ig-proto\manifest.mjs approval --plan V4-LIVE --label frozen --source-label 'frozen 3fc65f4'
npm run check
```

| Topic | Evidence |
|---|---|
| Rows, calls, ledgers, linkage, population | `evidence/sa-opus/s2-rows.md`, `s2-calls.md`, `s2-table.md`, `x1-recheck.md`; `evidence/sa-astra/stage2-computed.md` (population `:48-84`), `review-records.json` (`crossChecks`) |
| Classes, widths, N-V4-14 | `evidence/sa-opus/s2-work.md`, `s2-boot.md`, `x1-recheck.md` §1; `evidence/sa-astra/review-records.json` (`classes`, `boot`, `openBounds`) |
| Per-set, (c4), close, P5 | `evidence/sa-opus/s2-gains.md`, `s2-p5.md`, `x1-recheck.md` §3-§9; `evidence/sa-astra/review-records.json` (`prefix`, `requireCases`, `requireGeneration`, `mechanismCounterexamples`) |
| Priors | `evidence/sa-opus/s2-prior.md`, `j1-numbers.md` §1; `evidence/sa-astra/review-records.json` (`priors`, `pm1`, `revisedPriorCandidate`); `docs/improve-generating/evidence/provisional/IGP-05/` |
| Kernel, width | `docs/improve-generating/evidence/frozen/V4-S2K/kernel.json`, `kernel.md`; `V4-S2W/width.md`; `evidence/sa-opus/s2-profile.md` |
| Prices, account | `evidence/sa-opus/x1-prices.md`, `s4-cost.md`, `j1-numbers.md` §3; `evidence/sa-astra/review-records.json` (`prices`, `account`), `draft-review-check.json` (`spike`, `chain`, `end`) |
| Reviews | `sa-astra/round-1-draft-review.md` (SA-Astra's review of this draft); `sa-opus/round-1-draft-response.md` (the drafter's response) |
| Records of V4-S2 | `docs/improve-generating/evidence/frozen/V4-S2/`, `V4-S2P/`, `V4-S2K/`, `V4-S2W/`; `tests/artifacts/ig-proto/frozen/V4-S2*/` |
| Code | `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js:82-129, 199-205, 257-279, 404-426, 1303-1316`; `tools/ig-proto/verdicts.mjs:405-414, 873-931 (work rule), 967-1069 (class verdict), 1332 (deadline projection), 1539-1540`; `tools/ig-proto/manifest.mjs:1680, 2240-2288 (freeze check), 2619`; `tools/ig-proto/v4-check.mjs:117-146, 1571-1601`; `tools/ig-proto/lib/records.mjs:112-125`; `tools/ig-proto/lib/tree.mjs:249`; `tools/ig-proto/lib/proof.mjs:26`; `tools/ig-proto/plans/V4-LIVE.json` |
