# Cross-review of Astra's plan version 2 analysis (Pentomino), phase 2

Reviewer: Opus (claude-opus-5.5), 2026-11-15.

**Compared.**

- Astra: `docs/improve-generating/gpt-6-astra/3-plan-v2-analysis.md`.
- Mine: `docs/improve-generating/claude-opus-5.5/3-plan-v2-analysis.md`.

**How disputes were settled.** Every disputed fact was checked against the source (`core/engine/generate.js`,
`core/browser/generation-client.js`, unchanged at `13d61fd` and `5ee9269`) or the committed records, read
only. Small scripts outside the repository did the reading. No runs, and no git command beyond reading
commits.

## 1. Where we differ, and the proposed joint position

| # | Topic | Opus (phase 1) | Astra (phase 1) | Settled against | Verdict on my side | Joint position |
|---|---|---|---|---|---|---|
| 1 | C2: does the mechanism exist? | spares are new; C2 = spares plus P5's per-call budget; tail model x1.0 to 1.35 on T10 | the current scheduler already starts later slots and retries under ordered consumption; no gain claim | `generate.js:554` `dispatchOrder` with `BUDGETS.slotAttempts` (`:524`, `:560`); `generation-client.js:1057` dispatches up to `pool.size - inflight`, consumed through `foldNext` / `foldAccept` (`:1060`, `:1078`); the journals start 42 to 80 batch calls per cell for nine slots per request | **I was wrong** that spares are new. My tail finding stands: the longest call fills 59 to 81 % of the batch, and no call failed | drop C2's gain claim. Keep only the dispatch, consume and discard linkage in the journal, and treat P5's per-call work budget as the one lever on the tail, measured inside P5's arm, never "first nine to finish" |
| 2 | C3: is there data? | no committed v3 record carries `B` or `rowTrials` | the Landscape `samples` do: 18,956 completed samples with score, U and both features | `landscape-v3-full/14x14-nightmare-2026-11-13.json`, `runs[].samples[]` keys include `branchTrials`, `rowTrials`, `score`, `U` | **I was wrong**; I checked only the accepted puzzles' `metrics` | adopt Astra's correlations: strong overall (rho 0.89 to 0.99), weaker near the band (Nightmare 0.34 to 0.60; on 144 cells or fewer, U alone 0.82), capped profiles unidentifiable (`difficulty.js` throws before the DLX). A narrow soft-ranking prototype on 196 to 484-cell Nightmare, after the per-set prior, against U/K/area and P4 baselines, validated on held-out sets and seeds; no default on small Nightmare or Hell. Astra's `F = 1/[1 - g*alpha + g*d]` (x0.91 to 1.27) replaces my "at most x2 to 3" |
| 3 | The search side's floor | I took Fable's "three to four ratings per accepted puzzle" | Hell no-screen calls use 6.17 (26x26) and 9.41 (20x20) profiles per successful call; 51 to 55 % of batch-profile time comes before the first locate hit, mostly capped probes | Astra's derivation from `IGP-03h/w760` journals; consistent with my Q5 locate walk on 20x20 | agree | the "x2 to 3 search floor" is withdrawn for Hell; the remaining search cost there is larger |
| 4 | The per-set prior (P4 (1)) | a prior from PM1's windows on 20x20 only, x1.2 to 1.6 | promote a bounded Hell 1 arm of the per-set calibration prior before C2 and C4, gamma 0.65 to 1.0 | item 3 | agree; my item covered 20x20 only | a frozen-round Hell 1 arm with the per-set prior on 26x26 and 20x20, ranked ahead of the kernel spikes |
| 5 | C1 | x1.03 to 1.20, likely 1.05 to 1.15; R5 extends | x1.04 to 1.13 with upkeep 3 to 8 %; R5 (6.6 to 6.8 %) a second target | PM2 shares | agree | x1.04 to 1.15; R4 first, R5 after; exact charges as sums (no cap check inside R1 to R5, R8, R9), prefix sums for R6 and R7 (my Q1) |
| 6 | C5 | x1.1 to 1.15 (`select` + `undo` 25 to 28 %) | x1.05 to 1.21 (state, with `kill`, 31.2 to 35.3 %); may give nothing where V8 already inlines | PM2 categories | agree with Astra's wider base | x1.05 to 1.2; never multiply C1, C5 and P11: one composite against one reference |
| 7 | Hell 2/3 closure | the targeted Hell 3 population: none in 201 ratings; I did not contest v2's "a change of the rating's cap or scale" | the closure is a scope decision: other PM1 families hold canonical Hell 3 scores (179, 165) and central Hell 2 (146, 129) | `IGP-05/families-windows.jsonl`: `15x15b10-hell-1` set 1, 179 at 2 clues, 146 at 6; `families-scan.jsonl`: `12x12-nightmare` set 1, 129 at 1 clue; all `censored`, AR1 not refused | agree | correct v2's P10 and 1-goal wording: Hell 3 is out of reach in its policy area (`AREAS` from 450 cells) on these observations, not shown unreachable. The witnesses are census estimates at 1 to 3 clues on 144 to 215-cell boards, outside that area. Keep the release scope closed unless the owner opens it; a data-only inventory first |
| 8 | "17 to 53 s per Hell 2 rating" | I used the same phrase in IG-P-Q18 | amortised discovery cost; the eight in-band ratings took 1.0 to 3.1 s each | `families-windows.jsonl` durations | agree; the phrase is mine too | state it as discovery cost per in-band observation |
| 9 | "Ten passing Nightmare controls" | not flagged | "completion-passing": 18x18 has 20 of 20 but p95 134.5 s | MP12b1 aggregate | agree | name the controls by criterion |
| 10 | Frozen sample size | 20 seeds on the headline cells | ten is a pilot; the Hell offer protocol is 20 requests | - | agree | 20 on headline cells, held-out from any prior or screen fitting |
| 11 | Browser rule | calibrate it (today's 26x26 Nightmare passes, yet the rule gives 79 s) | `5 + 4 x median` is a sensitivity; D39 planning uses the Node maximum | `calibration-2026-11-15.md` planning rule | partially | no rule replaces the browser runs; ask which rule version 3 uses and whether to calibrate it from existing browser records (merged IG-P-Q24) |
| 12 | Forecast basis | R31's after-all (includes the eight-worker transfer) | four-worker J = 1.0 to 1.35, and gamma for Hell; R31's favourable end carries an unadmitted eight-worker factor | R25, R23 | agree | version 3's forecast at four workers. 14x14 Nightmare 6.6 to 8.9 s after phases 1+2, 4.3 to 7.2 s best mix; Hell 1 26x26 central 22.8 s (16.5 to 34.2), best mix 16.7 s; P11 shown apart |
| 13 | OD-P5 | yes in principle; criterion after a browser calibration | approve progressive presentation separately; do not replace the T10, response and completion criteria before browser data and an explicit new SLA | `generation-client.js` already reports accepted puzzles as they come | agree with Astra's sharper wording | approve progressive presentation as UI; criteria unchanged until a new SLA is written and measured |
| 14 | OD-P8 | approve, part 3 included | approve in stages after the frozen receipt; a data-only inventory first | - | agree | staged approval, part 3 included |
| 15 | OD-P3 for Hell 1 | silent | keep the pack option for Hell 1 if the browser gates fail and no new SLA | - | agree | v2's "P10 is not needed for Hell 1" is premature; keep it as the fallback |
| 16 | Source identity | the measured source equals `13d61fd` | the branch moved to `5ee9269`, with `levels.js` withdrawing Hell 1 to 3 and `policy.js` naming `mixed-v3` | `git diff 13d61fd 5ee9269` touches nine task and doc files; `core/` equals `cd5d17f` | Astra's point needs correcting (section 2) | every committed `rating-v3` commit to date carries the measured runtime; MP12b3's committed change will need a new identity receipt (agree with Astra's caution) |

Points where we already agree (no change):

- C4: count first, park the memo.
- IG-P-Q17 and OD-P6: accept conditionally, with two-sided reporting and a blind comparison.
- OD-P7: no screen by default.
- IG-P-Q02: a shared request deadline with a reserved batch share, deterministic work caps and measured
  completion loss.
- Hell 1 in the browser: not reached without progressive delivery or factors at the top of their ranges.
- The audit's errata, and my findings F1 to F12. Astra's audit table finds the same F1 and F8 and adds items 8
  and 9 above.

## 2. Errors in Astra's analysis

- **`gpt-6-astra/3-plan-v2-analysis.md:8-13`: the source note.** It attributes "`levels.js` now withdraws
  Hell 1-3 and `policy.js` names `mixed-v3`" to branch reference `5ee9269`. The committed `5ee9269` ("owner
  decisions P-OD12 and P-OD13; MP12b3 updated") changes nine files under `tasks/` and `docs/` against
  `13d61fd`, and nothing under `core/`, `generator/` or `tools/`, which equal `cd5d17f`. The differences seen
  must be uncommitted MP12b3 work in the main worktree: work in progress, not a source identity.
- **`:150`: a table header.** "OK calls beyond nine per request" holds cell totals: 12x12's 8 is 35 OK calls
  less 3 x 9; 26x26 Nightmare's 7 is 61 less 6 x 9. Per request these are about 1 to 4. The conclusion is
  unaffected.

Neither changes a recommendation.

## 3. Merged questions for Fable (Pentomino)

| No. | Question | Origin | Status |
|---|---|---|---|
| IG-P-Q19 | Rule (c5), phase 0 and non-regression thresholds: which statistic is the 0.5-clue tolerance (per-set paired median, pooled, other); what counts as "faster" (wall, CPU, which statistic); how unmatched sets, incomplete batches and completion differences enter; and the number behind phase 0's "no regression on the passing cells". Pre-register them before the frozen fit | Astra Q19, Opus Q21 | agreed |
| IG-P-Q20 | C2: the scheduler already speculates (`dispatchOrder`, ordered fold). Is C2 meant to change only prefetch or admission, or to define a different candidate universe or selection rule (which needs a serial reference and identity)? Remove its gain claim either way | Astra Q20, Opus Q23 | agreed |
| IG-P-Q21 | Is the Hell 2/3 closure a scope decision? How should version 3 describe the canonical 179 and 165 Hell 3 and the central 146 and 129 Hell 2 observations in other PM1 families (census estimates, outside the policy areas)? Should the remaining PM1 work inventory those routes from data? | Astra Q21 | agreed (Opus endorses) |
| IG-P-Q22 | Do 14x14 (196 cells) and 24x24 (576 cells) belong to `gen-v4`'s Hell 1 route and the frozen PM3? R28 found eligible windows on 4 of 4 and 3 of 4 of their failing sets | Opus Q19 | Opus only |
| IG-P-Q23 | The frozen PM3: 20 seeds on the headline cells, held-out from fitting; difficulty-v3's frozen landscape as the before arm where compatible; and the machine envelope (about 5 to 9 h, Projection) | Opus Q20; Astra's phases table | agreed in substance (Astra: ten is a pilot) |
| IG-P-Q24 | Which browser rule version 3 uses (the median sensitivity `5 + 4 x T10` or D39's Node maximum), and whether it is calibrated before OD-P5 and OD-P7, from existing browser records of offered cells or a small probe. Today's 26x26 Nightmare passes, yet the median rule gives 79 s | Opus Q22 | Opus only |
