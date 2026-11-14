# Improve generating (Pentomino): cross-review of Astra's analysis (SA1, claude-opus-5.5)

Phase 2, 2026-11-14. Worktree `improve-generating` at `cd5d17f`. Reviewed: `docs/improve-generating/gpt-6-astra/1-analysis.md`
and `1-speed-summary.md` (SA2), against my `docs/improve-generating/claude-opus-5.5/1-analysis.md` and `1-speed-summary.md`
("Opus §n" and "Astra §n" below). Read-only: no test, generation, benchmark, qualification or timing run, no git action.
The two new Derived tables of §1.2 come from small read-only scripts over the committed MP12b1 reports
(`docs/difficulty-v3/landscape-v3-full/*-2026-11-1[34].json`: `runs[].details.initialG`, `runs[].details.K`,
`runs[].details.puzzles[].clues`, `runs[].partialReason`, `runs[].layoutsExhausted`, `cells[].peak`). Labels as before:
*Measured*, *Derived*, *Projection*.

---

## 0. Summary

- **Direction of the disagreement.** On Pentomino Astra is not uniformly more optimistic. 14x14 Nightmare after P1-P8:
  mine 7.0 s (16 times), Astra's 10.1 s (11 times). Astra is more optimistic on the 87 to 144-cell and the 300 to
  676-cell Nightmare cells (1.7 to 2.8 times) and on Hell 1 (about 2.5 times); I am more optimistic after P1-P3 on 196 to
  256 cells. Phase 1 (P6, P7, P8) and Master agree within about 20 %.
- **Cause.** Astra divides today's whole request by uniform factors (P1 1.5, P4 1.5, a screen divisor from the pooled
  diagnostic capped share, P6 1.1, P7 1.35, P8 1.5). I rebuilt a call from the count curves (a locate, then about four
  window profiles at the in-band rating cost). The committed reports decide most of it:
  1. On 360 to 676 cells and on 3x29, 54 to 93 % of the accepted Nightmare puzzles use the start count. P1 and P4 have
     little to remove there, and the acceptance rule (a central in-band final, `core/engine/clues.js:338-342, 404-411`)
     keeps about four profiles per call. The gain there is the screen's, on the 10 to 43 % of capped profiles. Astra's 2
     to 3 s is the optimistic edge, my 5.5 to 7.7 s slightly pessimistic; reconciled 3.2 to 7.0 s (2.2 s on 3x29).
  2. On 196 to 300 cells the start count is 78 to 89 % capped, so in 37 to 63 % of calls the first four profiles are all
     capped and `selectClues` falls into its directionless phase 2 (up to 16 more samples at the same count,
     `clues.js:466-475`). That dead end is an estimated 40 to 70 % of today's batch cost there; P1 and P3 remove it.
     Astra's pooled capped share (0.30 to 0.34) understates it at the P1-P3 stage, and my call model may overstate the
     window cost. Both end at 4 to 10 s after P1-P8; reconciled 5.1 to 8.0 s (4.6 s on 18x18, 324 cells).
  3. Hell 1 on 576 and 676 cells: reconciled about 28 s after P1-P5 and 15 s after P1-P8 (mine 48 / 24, Astra 18 / 9.6).
     The in-band rate at the counts that matter (5 to 7 clues) is not sampled.
- **Availability.** Every incomplete Nightmare and Hell 1 request of MP12b1 ended on the time limit; none ended on exhausted
  layouts (Derived). Completion on the measured cells is time-bound, so at least 90 % in Node is likely on the 144 to
  300-cell Nightmare cells after all phases (Astra leaves it unknown; its sensitivity of 80 to 98 % is a lower bound).
- **Findings and risks.** Astra's correctness findings all hold. 12 are new to me in whole or in part, among them: the
  normal stop needs a no-cap certificate (R7); set and batch get separate 115 s deadlines; the history keys quotient board
  symmetries, so P10's transformations are not new layouts; `verifyPack` proves existence only; stocked batches meet a
  later history. I dispute, wholly or in part, five of its modelling and scope choices (§1, §2) and none of its correctness
  findings.
- **Questions.** 4 of Astra's 9 questions are also mine; 4 are new and I support them; 1 (PM1's scope) meets mine from the
  opposite side. A merged list has 15 questions.

---

## 1. Speed: where the two analyses differ

### 1.1 Side by side

T10 median / p95 seconds, Node, four workers (eight with P8); Projection, likely. Today is Measured (MP12b1, n = 20).

| Cell | Today | After P1-P3: Opus; Astra | After P1-P5: Opus; Astra | After P1-P8: Opus; Astra | Faster at the end |
|---|---|---|---|---|---|
| Master, 16 cells | 1.16 - 9.00 / 1.69 - 18.41 | unchanged in both | unchanged in both | x 2.6; x 2.3 - 2.4 | agree |
| 3x29 Nightmare | 5.31 / 7.64 | 5.3 / 7.6; 3.64 / 5.20 | 5.3 / 7.6; 2.53 / 3.57 | 2.5 / 5.4; 1.30 / 1.77 | Astra 1.9 x |
| 10x10 | 24.04 / 68.44 | 23 / 50; 18.30 / 51.97 | 19 / 43; 12.30 / 34.74 | 9.4 / 21; 5.69 / 15.76 | Astra 1.7 x |
| 12x12 | 62.14 / 176.07 | 43 / 95; 34.74 / 98.19 | 39 / 86; 23.26 / 65.56 | 19 / 42; 10.61 / 29.60 | Astra 1.8 x |
| 14x14 | 112.98 / 151.64 | 17 / 36; 33.18 / 44.46 | 14 / 31; 22.22 / 29.74 | 7.0 / 15; 10.14 / 13.52 | Opus 1.4 x |
| 15x15b10 | 86.23 / 141.56 | 15 / 32; 23.67 / 38.72 | 12 / 27; 15.88 / 25.92 | 6.1 / 13; 7.30 / 11.80 | Opus 1.2 x |
| 16x16 | 79.84 / 135.44 | 16 / 35; 23.94 / 40.46 | 14 / 30; 16.06 / 27.07 | 6.8 / 15; 7.37 / 12.32 | about equal |
| 15x20 | 40.09 / 111.21 | 17 / 37; 12.86 / 35.32 | 14 / 31; 8.67 / 23.64 | 7.2 / 16; 4.06 / 10.78 | Astra 1.8 x |
| 18x18 | 37.25 / 134.52 | 16 / 34; 11.73 / 41.82 | 13 / 29; 7.92 / 27.98 | 6.6 / 14; 3.72 / 12.73 | Astra 1.8 x |
| 18x20 to 26x26, 7 cells | 11.57 - 24.17 / 31.38 - 113.97 | 12 - 18 / 26 - 37; 5.92 - 9.87 / 14.91 - 43.97 | 11 - 16 / 25 - 31; 4.04 - 6.68 / 10.04 - 29.41 | 5.5 - 7.7 / 12 - 17; 1.98 - 3.17 / 4.67 - 13.37 | Astra 2.0 - 2.8 x |
| Hell 1 26x26 | 108.72 / 167.59 (9 of 20 with ten) | 55; 30.8 / 142.3 (tail) | 48; 18.0 / 81.7 | 24; 9.6 / 41.8 | Astra 2.5 x |
| Hell 1 24x24 | none (0 of 20) | 56; 31.5 / 88.6 | 49; 18.5 / 51.1 | 24; 9.8 / 26.3 | Astra 2.4 x |
| Hell 1 14x14 | none (0 of 20) | 127; 75.2 / 149.4 | 111; 43.4 / 85.8 | 55; 22.4 / 43.8 | Astra 2.5 x |
| Phase 1 only (P6, P7, P8): 14x14 N, 12x12 N, 26x26 N, 26x26 Hell 1 | as above | | | Opus 61, 32, 9.7, 59; Astra 50.89, 28.06, 8.52, 48.97 | Astra 1.1 - 1.2 x |

Astra's Hell figures are its conditional construction model (median, then a tail surrogate), not a T10 distribution.

### 1.2 New evidence (Derived from the MP12b1 reports)

Accepted puzzles (the calibration and the batch, all requests) against the request's start count `initialG`; the capped
share at the start share is the diagnostic sample of Opus §2.2; `p^4` is the chance that the first four profiles of a call
are all capped (independence assumed).

| Cell | K | Start count | Accepted at / above / below the start | Capped at the start share | `p^4` | Ten of 20; how the others ended |
|---|---|---|---|---|---|---|
| 3x29 Nightmare | 19 | 3 (2) | 93 / 6 / 2 % | 3 % | 0 % | 20 |
| 10x10 | 18 | 2 - 3 | 49 / 51 / 1 % | 3 % | 0 % | 19; 1 time limit |
| 12x12 | 19 | 3 | 33 / 66 / 1 % | 53 % | 8 % | 17; 3 time limit |
| 14x14 | 21 | 3 | 28 / 72 / 0 % | 89 % | 63 % | 11; 8 time limit, 1 set time limit |
| 15x15b10 | 23 | 3 | 16 / 84 / 0 % | 84 % | 50 % | 11; 8 time limit, 1 set time limit |
| 16x16 | 23 | 3 - 4 | 31 / 69 / 0 % | 83 % | 47 % | 15; 5 time limit |
| 15x20 | 25 | 3 - 4 | 33 / 66 / 1 % | 78 % | 37 % | 15; 5 time limit |
| 18x18 | 24 | 3 - 4 | 43 / 57 / 1 % | 58 % | 11 % | 20 |
| 18x20 | 28 | 4 | 66 / 32 / 3 % | 35 % | 1.5 % | 20 |
| 20x20 | 26 | 4 | 45 / 49 / 6 % | 43 % | 3.4 % | 19; 1 time limit |
| 20x21 | 28 | 4 | 55 / 44 / 2 % | 25 % | 0.4 % | 20 |
| 32x15 | 29 | 4 | 73 / 22 / 6 % | 10 % | 0 % | 20 |
| 22x22 | 29 | 4 | 64 / 32 / 5 % | 15 % | 0.1 % | 20 |
| 24x24 | 31 | 4 | 54 / 46 / 1 % | 20 % | 0.2 % | 20 |
| 26x26 | 30 - 31 | 4 - 5 | 75 / 22 / 4 % | 10 % | 0 % | 20 |
| Hell 1 14x14 | 35 | 3 - 4 | 0 / 100 / 0 % (6 to 12 clues) | 90 % | 66 % | 0; 15 set time limit, 5 time limit |
| Hell 1 24x24 | 39 | 4 | 0 / 100 / 0 % (5 to 7) | 100 % | 100 % | 0; 13 set time limit, 7 time limit |
| Hell 1 26x26 | 40 | 4 | 25 / 75 / 0 % (4 to 7) | 88 % | 60 % | 9; 11 time limit |

No incomplete request has `layoutsExhausted`. Reading: the start count is right for most accepted puzzles on 360 to 676
cells and on 3x29, and one or two clues too low on 100 to 324 cells and at Hell 1; that is where P1 and P4 can help.

### 1.3 PD1. Uniform P1 and P4 factors against the start-count evidence

**Astra's assumption** (Astra §4.1). P1 divides the profile count by 1.5 and P4 by a further 1.5 on every Nightmare cell
(2.25 together; Master 1).

**Mine** (Opus §5.1). Per cell, from the count curves; little gain where the start is already right.

**Check.** §1.2: on the seven 360 to 676-cell boards and on 3x29, 54 to 93 % of the accepted puzzles use the start count,
so P1 has no bracket to find and P4's prior equals today's start for most calls. What remains is the window. `afterProfile`
returns only a final in the central half of the band (`clues.js:338-342, 404-411`); with 30 to 60 % of the rateable
profiles in band at the start share (Opus §2.2) and about half of the band central, a call needs about 3 to 5 profiles
whatever the count search does. Today's batch worker-seconds per accepted puzzle there, 3.7 to 8.8 s (Opus §2.1), are 5 to
9 profile equivalents: that floor plus capped profiles, failed calls and the last wave's speculation.

**Verdict.** On those cells P1 + P4 are worth about 1.0 to 1.15, not 2.25; the gain is P2's on the capped profiles. My
side is right on the mechanism, but my call model charged a full locate (six profiles) on boards that need none, which
made it too pessimistic there. Reconciled P1-P5 factor = today's mean profile cost / new mean profile cost, times 1.0 to
1.15 for P1 and P4, with today = `(1 - p) t_r + 2.65 p` and new = `1.15 (1 - p) t_r + 0.45 p` (p = capped share at the
start share, t_r = rateable time at the peak, Opus §2.2; a screened cap at 0.45 s; 15 % escalation overhead on useful
profiles): **26x26 1.2, 32x15 1.2, 22x22 1.45, 24x24 1.55, 20x21 1.9, 18x20 2.4, 20x20 2.6, 3x29 1.1** (Astra 2.1 to 3.7;
mine 1.0 to 1.6).

### 1.4 PD2. The screen divisor, the capped share and the dead end

**Astra's assumption** (Astra §1.3, §4.1). The screen divisor s = C0 / C2 uses q, the capped share pooled over all
diagnostic shares, as the production mixture. Astra itself labels this an assumption for PM3 to test.

**Check.** Production profiles are drawn at the start count and its neighbours, not across shares 0.05 to 0.85. On 196 to
300 cells the capped share at the start share is 78 to 89 % against q = 0.30 to 0.34; on 360 to 676 cells it is 10 to
43 % against 0.13 to 0.22. When the first four profiles of a call are all capped, phase 1 of `selectClues` ends without
a direction and phase 2 rates up to `4 x SAMPLES_PER_COUNT` = 16 more samples at the same count until one is rated
(`clues.js:63, 466-475`). Expected dead-end cost per call (Projection, independence assumed):
`p^4 x (4 + min(16, p / (1 - p))) x 2.65 s`:

| Cell | Dead end per call | Today's batch worker-seconds per accepted puzzle (Opus §2.1) | Share it explains |
|---|---|---|---|
| 14x14 | 20 s | 31.1 | about 65 % |
| 15x15b10 | 12 s | 19.1 | about 64 % |
| 16x16 | 11 s | 26.6 | about 42 % |
| 15x20 | 7.4 s | 10.8 | about 69 % |
| 18x18 | 1.6 s | 12.8 | about 13 % |
| 12x12 | 1.1 s | 21.4 | about 5 % |

The calibration call of the set stage meets the same dead end (T1 43 s on 14x14 and 15x15b10).

**Verdict.** On 196 to 300 cells the dead end is the largest single cost, and P3 (a capped profile is TOO_FEW) with P1
removes it, so P1-P3 there are worth more than Astra's 3.1 to 3.6 on T10 (my 6.6 on 14x14). On 18x18 and 12x12 it is minor
and the gain must come from count placement and the screen, where both models are uncertain. Reconciled P1-P5 factor on
196 to 324 cells: the geometric mean of the two analyses' factors (mine bottom-up, Astra's top-down), **14x14 6.4,
15x15b10 6.25, 16x16 5.3, 15x20 3.6, 18x18 3.7**.

### 1.5 PD3. 10x10 and 12x12: dear in-band ratings

Both analyses find that P2 gives nothing there (Astra's s = 0.88 and 1.20): accepted work medians 260 and 485 M units, 64
and 81 % of accepted ratings above 175 M of total work (Astra's rho), p90 at the cap plus census (Opus §2.3). The
difference is P1 and P4 (Astra 2.25; mine about 1.3, with T1 unchanged). §1.2: half (10x10) and two thirds (12x12) of the
accepted puzzles are one clue above the start; the rateable in-band share rises from 45 to 64 % (10x10) and from 26 to 74 %
(12x12) between shares 0.14 and 0.25 (Opus §2.2). Placing the count right raises the central-final rate per profile by
about 1.4 (10x10) and 2 to 3 (12x12) on the affected calls. Reconciled P1-P5 factor: **10x10 1.3, 12x12 1.75** (Astra
1.95 and 2.67; mine 1.26 and 1.59). 12x12 stays the weakest Nightmare cell in both analyses: its browser p95 fails.

### 1.6 PD4. The set stage (T1)

Astra divides T10, T1 included, by the same factor; I set T1' = min(T1, call + 0.5 s) and P8 = 1.15 on the set stage. The
set stage is carving plus a calibration `selectClues` call, four set attempts at a time, with unbounded attempts
(`core/browser/generation-client.js:572-575`); 15 of 20 Hell 1 requests on 14x14 and 13 of 20 on 24x24 ended in
`set:time-limit` (§1.2). P1 and P3 shorten the calibration call as they shorten batch calls, so T1 shrinks in proportion
on the dead-end cells, where both models agree. My min() kept T1 at 13.6 s on 12x12, which is too pessimistic because four
attempts race. Eight racing set attempts (P8) shorten the first success by more than 1.15 and less than 1.5. Reconciled:
T1 scales with the call; P6 to P8 together about 2.0 on T10 alone (Astra 2.23, mine about 1.85) and 2.2 on top of P1-P5.

### 1.7 PD5. Hell 1

**Astra** (Astra §4.4): `1 + 28c` (P1-P3), `1 + 16c` (P1-P5), `1 + 8.081c` (P1-P8) seconds, with c the accepted-work proxy
(1.06 s at 676 cells), four dear calibration profiles, eight dear profiles per candidate without the prior and four with
it, every candidate successful, three batch waves. **Mine** (Opus §5.1): locate 8 and window 6 profiles at 1.1 s, 70 % of
calls successful, a fluid 9 / 4 batch.

**Check.** Today's 26x26 Hell 1 batch costs (108.72 - 44.8) x 4 / 9 = 28 worker-seconds per accepted puzzle (Derived), about
27 c. Its start count (4) is 88 % capped, so the dead end costs about 18 s per call (§1.4: 0.60 x (4 + 7.3) x 2.65 s); the
rest, a few profiles per puzzle, is window work at 5 to 7 clues, where the in-band rate is not sampled (the grid has only
shares 0.10 and 0.25: 1 of 5 and 13 of 40 rateable samples in band). Astra's four profiles per candidate with the prior
assume a window as dense as Nightmare's best peak; my ten per call with 30 % of calls failing assume a sparse one.

**Verdict.** Neither is supported directly. Reconciled (geometric mean, leaning to the dead-end decomposition): **576 and
676 cells about 28 s after P1-P5 and 15 s after P1-P8** (likely 10 to 24 s, envelope 7 to 50 s); **14x14 70 and 35 s**
(Opus 111 / 55, Astra 43 / 22), not offerable in either. PM1 on the two large boards at 4 to 10 clues settles it.

### 1.8 PD6. p95, phase 1 and P8's memory

- *p95.* Astra scales today's conditional p95 by the median factor; I used 2.2 times the projected median, capped at
  today's p95. Today's tails (p95 / median 1.4 to 5.7) come largely from dead ends and capped profiles, which P1 to P3
  remove, so scaling the old tail is pessimistic where the dead end dominated and optimistic elsewhere. Reconciled: p95 =
  today's p95 / (factor x 2.2), at least 1.5 times the projected median.
- *Phase 1* (P6, P7, P8, same puzzles): Astra x 2.23, mine about x 1.85 (P8 at 1.15 on the set stage). Reconciled x 2.0 on
  Nightmare and Hell 1 T10, x 2.5 on Master, where P6 saves more.
- *P8 memory.* Astra is right that workspaces grow lazily and 224 MiB per worker is a ceiling (`core/engine/workspace.js:177-197`);
  I was right that eight ceilings plus the main budget (2,092 MiB) exceed the 1.5 GiB criterion. Measured peaks with four
  workers over every MP12b1 cell (`cells[].peak`): accounted at most 404 MiB (26x26 Hell 3 prescreen), process at most
  655 MiB (24x24 Hell 3 prescreen). Eight workers would likely stay near 1.0 to 1.3 GiB in practice. The open point is
  whether the criterion applies to the accounted ceilings or to measured peaks.

### 1.9 PD7. Availability

**Astra** (Astra §4.5): new completion rates unknown; a sensitivity `1 - (1 - Q)^k` with k = 1.5, 2, 4. **Mine**
(Opus §5.5): about 95 % or more on the 144 to 300-cell Nightmare cells after P1-P5.

**Check.** §1.2: every incomplete Nightmare request ended on the time limit, none on exhausted layouts, and every cell made
puzzles in most requests. Completion is time-bound on these cells. With the reconciled p95 after all phases at 10 to 14 s
(46 s on 12x12) in Node (§5), far below the 115 s stop, at least 90 % is likely on Nightmare 144 to 300. Hell 1: 676 is
time-bound (11 time limits), so about 85 % or more in Node after all phases is likely; 576 (13 set time limits) likewise
if PM3 confirms the window density; 196 no.

**Verdict.** Mine on the mechanism; Astra is right that correlated sets and novelty can keep some requests failing, so
"at least 90 %" is a Projection for PM3, not a pass. Browser (5 s + 4 x Node, a planning rule only): after all phases the
87 to 676-cell Nightmare cells meet 60 / 115 s except 12x12 (median about 69 s, p95 about 190 s), with 10x10 near the p95
limit; Hell 1's median and tail do not.

---

## 2. Astra's findings and risks against mine

| # | Astra's finding (Astra section) | Status | Evidence, comment |
|---|---|---|---|
| 1 | P2's second row is false: `keepPath`, `branch`, `runProbes`, `settleCensus` settle G, info and Gproved after the first solution (P2) | confirmed, also mine | IG-P-OPUS-Q2; `core/engine/deduce.js:1518, 1593, 1738, 1786` (Astra), `1635, 1747` (mine) |
| 2 | A normal stop needs a positive no-cap check: R7 returns NONE after the cap and the ladder goes on to R8 and R9 (P2) | confirmed in substance, new to me | `deduce.js:1098-1130`, `ladder` `1448`; the code says the next ladder pass stops the measurement, so the risk is a run that ends without another pass. Simplest certificate: main-phase work at the end at most W_screen, since every check is `work > workLimit`. I had judged the plan's claim correct without this condition |
| 3 | `rate` has no limits argument; a production screen needs an explicit API (P2) | confirmed, also mine | `core/engine/difficulty.js:214, 325` |
| 4 | The cheap side is AR1-spent: keep its score for direction only (P1) | confirmed, also mine | IG-P-OPUS-Q4; `clues.js:221, 273-274` |
| 5 | The parallel multi-count bisection is not serial-equivalent (P1) | confirmed, also mine | IG-P-OPUS-Q5 |
| 6 | Pseudo-code endpoints: clamp, a first profile ABOVE or capped, overshoot (P1) | confirmed, also mine | Opus P1 gaps |
| 7 | The 22 to 34 % capped shares are diagnostic samples; the 164-cell 2.2 s is an average over rated and capped profiles (verdict) | confirmed, also mine | Opus §2.3; Astra's model then uses the pooled share anyway (§1.4) |
| 8 | A 6 G-unit budget is not a clock guarantee; at the probe's p5 / p95 rates (157 / 446 M units/s) 6 G is 13 to 38 s (P5) | confirmed; the dispersion figure is new | `docs/difficulty-v3/generator-state-2026-11-14.md` (probe work rate) |
| 9 | Set and batch each get their own 115 s deadline (`begin`, `generation-client.js:447`, called at 575 and 812); P5 does not fix the 120 s response (P5) | confirmed, new to me | 70 of 1,726 MP12b1 responses over 120 s (both analyses); a shared request budget is an owner decision |
| 10 | P3 shares P1's benefit; record what of F1 / F2 is superseded (P3) | confirmed, also mine | IG-P-OPUS-Q10 |
| 11 | P4's prior keyed by set, target, uniqueness, algorithm and prior-table version; strict payload readers (P4) | confirmed, also mine with more anchors | IG-P-OPUS-Q6; `protocol.js:585, 638, 661-671`, `tasks.js:160-187` (Astra) |
| 12 | P6: accepted and exported puzzles need full metrics; the accepted model may need a rebuild, because a workspace holds one live model (P6) | confirmed; the rebuild is new | |
| 13 | P7: the clue-specific model renumbers free columns and drops clued pieces, so "build once, cover clues" changes C, loop lengths and charges (P7) | confirmed, also mine with an anchor | `core/engine/placements.js:181-190` |
| 14 | P7: a refutation memo cannot reproduce a cap boundary with a lump charge (P7) | confirmed, new detail | |
| 15 | P8: workspaces grow lazily; eight ceilings plus main = 2,092 MiB (P8) | confirmed; lazy growth is new | §1.8 |
| 16 | P8: `hardwareConcurrency` can exceed four on phones (P8) | confirmed; complements my 4-core point | IG-P-OPUS-Q7 |
| 17 | P9: the auxiliary queue is not a set-plus-batch orchestrator; a stocked batch was made against an older history (P9) | confirmed, new to me | novelty uses the request-start history |
| 18 | P10: `layoutKey` and `clueKey` are invariant under board symmetries and use shape ranks: transformations and relabelling give no new layouts for history (P10) | confirmed, new to me | `core/engine/keys.js:2-3, 62-98` |
| 19 | P10: `verifyPack` proves existence (a stored valid solution or a bounded search), not difficulty, AR1 or the uniqueness mode (P10) | confirmed, new to me | `core/engine/tasks.js:77-110` |
| 20 | "A near-cap rating cannot fit ten on any device" does not follow: ten cap-scale ratings are about 27 s serial (§4.4) | confirmed, new to me | what matters is ratings per accepted puzzle (§1.4) |
| 21 | P11 shares P7's bottleneck; keep the JavaScript reference (P11) | confirmed, also mine | |
| 22 | PM1 at the plan's scope is about 30,600 ratings, 20 worker-hours (§5) | plausible, new | supports cutting it (IG-P-OPUS-Q1) |
| 23 | The slow ordering test gains only from P7 (§4.6) | confirmed, also mine | Opus §4.2 |
| 24 | The final source is post-MP17; D39 applied to MP12b1 would hide every Hell level (§1.1) | confirmed, also mine | |
| 25 | Uniform P1 1.5 and P4 1.5 (§4.1) | **disputed** | §1.3 |
| 26 | Screen divisor from the pooled capped share (§4.1) | **disputed** | §1.4 |
| 27 | Hell 1 construction counts (§4.4) | **disputed** | §1.7 |
| 28 | New completion unknown, nothing credited (§4.5) | **disputed in part** | §1.9 |
| 29 | PM1 must add the blocked, elongated and mid-area cells (§5, IG-P-ASTRA-Q7) | **disputed in part** | the MP12b1 curves already cover every Nightmare cell coarsely, 15x15b10 and 32x15 included (Opus §2.2); fine nested families are needed where no curve exists (Hell 1 on 215 to 484, Hell 2, Hell 3) and on two or three Nightmare cells. Astra's held-out window audit against non-monotone families is a good addition |

Counted: 12 repeat or complement mine (1, 3 to 7, 10, 11, 13, 21, 23, 24); 12 are new to me in whole or in part (2, 8, 9,
12, 14 to 20, 22); 5 are disputed (25 to 29).

My risks that Astra does not raise, still standing: a W_screen of 95 M screen-caps many in-band Nightmare ratings before
their first solution (Astra's rho makes the same point for escalation cost); `min(8, hardwareConcurrency - 1)` gives a
4-core device three workers instead of four (IG-P-OPUS-Q7); phase gates should be read at a fixed four workers
(IG-P-OPUS-Q9); P3 changes the recorded D21 counting rule (IG-P-OPUS-Q10); small K makes the count curves steep (Opus P1
gap 4).

---

## 3. Questions

| Astra | Mine | Status |
|---|---|---|
| IG-P-ASTRA-Q1: drop P2's second row; re-rate cap-affected screens; a cap-effect certificate | IG-P-OPUS-Q2, Q3 | overlap; merge, with the certificate of §2 item 2 |
| IG-P-ASTRA-Q2: AR1-refused ratings guide the bracket but stay spent | IG-P-OPUS-Q4 | same; merge (Astra's "spent for acceptance and the stall count" refines my "count as BELOW") |
| IG-P-ASTRA-Q3: the parallel P1, a fixed probe tree or its own identity | IG-P-OPUS-Q5 | same; merge |
| IG-P-ASTRA-Q4: one shared 120 s set-plus-batch budget, or D37's separate budgets | none | new; support (§2 item 9) |
| IG-P-ASTRA-Q5: the prior in provenance or reconstructed; fallback | IG-P-OPUS-Q6 | same; merge |
| IG-P-ASTRA-Q6: split P7's model reuse and memo into later optional items | none (Opus P7 gap) | new as a question; support |
| IG-P-ASTRA-Q7: PM1 to include more failure cells, with a held-out audit | IG-P-OPUS-Q1 (cut PM1) | opposite directions; merged proposal in §2 item 29 |
| IG-P-ASTRA-Q8: P10 needs independent layouts and checks beyond `verifyPack` | none | new; support (§2 items 18, 19) |
| IG-P-ASTRA-Q9: Hell 2 and 3 packs decided on total search cost | none | new; support (§2 item 20) |
| none | IG-P-OPUS-Q7 to Q11 | not in Astra's list |

Merged: 9 + 11 - 5 overlaps = 15 questions.

---

## 4. What the measurement phase must settle here

- **PM3**, per call: profiles by outcome (capped, below, in band, central, above, AR1-spent) and by count relative to the
  start; entries into phase 2 (the dead end); window profiles per accepted puzzle; set-stage calls and set attempts. This
  decides PD1, PD2 and PD4, and Hell 1's window density for PD5.
- **PM1** on Hell 1 at 576 and 676 cells, counts 4 to 10: the in-band and central rates at 5 to 7 clues (PD5); fine counts
  on two or three Nightmare cells, with Astra's held-out audit.
- **PM4**: equality under the certificate "main work at the end at most W_screen" (§2 item 2).
- **Pool**: 4 against 8 workers, measured memory peaks against the accounted ceilings, and T1 with eight racing set
  attempts (PD4, §1.8).
- **Completion**: PM3's twenty requests per cell with stop reasons (PD7).

---

## 5. Reconciled before/after speed table

Reading rules.

- *Today:* Measured, MP12b1 (`docs/difficulty-v3/landscape-v3-full/<cell>-2026-11-1[34].json`, aggregate
  `aggregate-2026-11-14.md`), T10 median / conditional p95, Node, four workers, n = 20 (Hell prescreens n = 3).
- *After first phases* = plan phase 1 (P6, P7, P8: same puzzles): today / 2.0 (Master / 2.5).
- *After all phases* = plus phase 2 (P1 to P5): today / (F x 2.2), F the reconciled P1-P5 factor of §1.3 to §1.5 (Rule A:
  start count right, profile-cost ratio; Rule B: 196 to 324 cells, geometric mean of the two analyses; Rule C: 100 and 144
  cells, count placement). p95 = today's p95 / (F x 2.2), at least 1.5 x the median. P9 to P11 not included.
- *Range* (of the median after all phases) = today / (2F x 4.1) to today / (max(1, F / 2) x 1.47): high benefit (P6 1.2,
  P7 1.8, P8 1.9) to low benefit (P6 1.03, P7 1.1, P8 1.3). If PM3 refutes P1 to P5, the first-phases value stands.
- *Confidence:* M = the mechanism is checked in the reports or the code and the two analyses differ by at most about 1.5
  times (3x29: both far inside every budget); L = the analyses differ by up to 3 times and PM3 decides; VL = conditional
  on a window no measurement has shown.
- *Source of the after numbers:* the factor F with its rule, and the two phase-1 values (Opus; Astra) for comparison.

| Cell | Today T10 median / p95 (source); ten of 20 | After first phases | After all phases | Range after all | Confidence | Source of the after numbers |
|---|---|---|---|---|---|---|
| Master 60 - 100 (3 cells) | 1.16 - 9.00 / 1.69 - 16.44 (MP12b1); 20 | 0.46 - 3.6 / 0.68 - 6.6 | same | x 1.6 - 5.4 | M | P1-P5 neutral at Master (both); Opus x 2.6, Astra x 2.3 - 2.4 |
| Master 144 - 324 (6 cells) | 2.57 - 5.96 / 6.83 - 18.41; 20 | 1.0 - 2.4 / 2.7 - 7.4 | same | x 1.6 - 5.4 | M | as above |
| Master 360 - 676 (7 cells) | 3.39 - 8.36 / 5.26 - 16.64; 20 | 1.4 - 3.3 / 2.1 - 6.7 | same | x 1.6 - 5.4 | M | as above |
| Nightmare 3x29 (87) | 5.31 / 7.64; 20 | 2.7 / 3.8 | 2.2 / 3.3 | 0.6 - 3.6 | M | F 1.1 (rule A); Opus 2.5 / 5.4; Astra 1.30 / 1.77 |
| Nightmare 10x10 (100) | 24.04 / 68.44; 19 | 12 / 34 | 8.4 / 24 | 2.3 - 16 | L | F 1.3 (rule C); Opus 9.4 / 21; Astra 5.69 / 15.76 |
| Nightmare 12x12 (144) | 62.14 / 176.07; 17 | 31 / 88 | 16 / 46 | 4.3 - 42 | L | F 1.75 (rule C); Opus 19 / 42; Astra 10.61 / 29.60; browser fails |
| Nightmare 14x14 (196) | 112.98 / 151.64; 11 | 56 / 76 | 8.0 / 12 | 2.2 - 24 | M | F 6.4 (rule B); Opus 7.0 / 15; Astra 10.14 / 13.52 |
| Nightmare 15x15b10 (215) | 86.23 / 141.56; 11 | 43 / 71 | 6.3 / 10.3 | 1.7 - 19 | M | F 6.25 (rule B); Opus 6.1 / 13; Astra 7.30 / 11.80 |
| Nightmare 16x16 (256) | 79.84 / 135.44; 15 | 40 / 68 | 6.8 / 11.6 | 1.8 - 20 | M | F 5.3 (rule B); Opus 6.8 / 15; Astra 7.37 / 12.32 |
| Nightmare 15x20 (300) | 40.09 / 111.21; 15 | 20 / 56 | 5.1 / 14 | 1.4 - 15 | L | F 3.6 (rule B); Opus 7.2 / 16; Astra 4.06 / 10.78 |
| Nightmare 18x18 (324) | 37.25 / 134.52; 20 | 19 / 67 | 4.6 / 16.5 | 1.2 - 14 | L | F 3.7 (rule B); Opus 6.6 / 14; Astra 3.72 / 12.73 |
| Nightmare 18x20 (360) | 16.80 / 63.12; 20 | 8.4 / 32 | 3.2 / 12 | 0.9 - 9.5 | L | F 2.4 (rule A); Opus 5.5 / 12; Astra 2.19 / 7.48 |
| Nightmare 20x20 (400) | 20.14 / 113.97; 19 | 10 / 57 | 3.5 / 20 | 0.9 - 11 | L | F 2.6 (rule A); Opus 7.1 / 16; Astra 2.58 / 13.37 |
| Nightmare 20x21 (420) | 24.17 / 47.92; 20 | 12 / 24 | 5.8 / 11.5 | 1.6 - 16 | L | F 1.9 (rule A); Opus 6.3 / 14; Astra 3.17 / 6.02 |
| Nightmare 32x15 (480) | 11.57 / 37.87; 20 | 5.8 / 19 | 4.4 / 14 | 1.2 - 7.9 | L | F 1.2 (rule A); Opus 5.6 / 12; Astra 1.98 / 5.91 |
| Nightmare 22x22 (484) | 17.28 / 33.93; 20 | 8.6 / 17 | 5.4 / 10.6 | 1.5 - 12 | L | F 1.45 (rule A); Opus 6.0 / 13; Astra 2.51 / 4.67 |
| Nightmare 24x24 (576) | 18.65 / 57.29; 20 | 9.3 / 29 | 5.5 / 17 | 1.5 - 13 | L | F 1.55 (rule A); Opus 6.6 / 15; Astra 2.51 / 7.18 |
| Nightmare 26x26 (676) | 18.61 / 31.38; 20 | 9.3 / 16 | 7.0 / 12 | 1.9 - 13 | L | F 1.2 (rule A); Opus 7.7 / 17; Astra 2.98 / 4.85 |
| Hell 1 14x14 (196) | none: 0 of 20 (5 puzzles), response max 229.1 | none: set stage still fails | 35, tail about 90, if a window exists | 22 - 110 | VL; not offerable | §1.7; Opus 55; Astra 22.4 / 43.8 |
| Hell 1 24x24 (576) | none: 0 of 20 (13 puzzles), response max 211.4 | none likely: the set stage starts 100 % capped | 15, tail about 40 | 7 - 50 | VL | §1.7; Opus 24; Astra 9.8 / 26.3; Node timing candidate, completion for PM3 |
| Hell 1 26x26 (676) | 108.72 / 167.59; 9 | 54 / 84; completion up, below 18 of 20 | 15, tail about 40 | 7 - 50 | L | §1.7; Opus 24; Astra 9.6 / 41.8; browser fails |
| Hell 1 215 - 484 (9 cells), Hell 2 (9), Hell 3 (4) | no set in 3 requests each, response about 115 | unchanged | unknown; P5 ends a no-window request early | | VL | PM1 first (both analyses) |
