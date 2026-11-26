Seal: bca8cfd2db491e686fb37f5ed2bf640e4eac3c93513c005f775f971bf4979f5b
Report A: 1d850b12a9a03ed61f40d3c84fce88edda01b84c96d52785b8ff11ba965e3cd2
Accepted by SA-Opus: 2026-11-26 13:58 +07:00
Accepted by SA-Astra: 2026-11-26 14:00 +07:00
Stage B: PROCEED
Owner continuation: 1575441672895070261

# Stage A readout: improve-generating phase 2

The two SAs' reading of stage A (P2-19 step 5; `tasks/improve-generating-phase-2/contracts.md` C12). The five lines
above bind it to the seal and to `evidence/report-A/report.json`. Paths in backquotes are relative to
`docs/improve-generating-phase-2/`; `E` means `evidence/`.

- **Authors.** Drafted by SA-Opus (pack author) and cross-reviewed by SA-Astra. The file is final when both acceptance
  lines hold a time.
- **Verdict now: `Stage B: STOP`.** Gate A3 is `incomplete`, so stage B needs the owner's continuation (C12): question
  Q-P2-A3 in section 12. Section 13 says what changes after the answer.

## 1. Summary

| Gate | Criterion | Status | Reading |
|---|---|---|---|
| Equality | P2-T01 | 128 of 128 equal | no port defect |
| A1 | P2-B02 on the thin controls | pass | 3x29, 22x22 and 32x15 reach ten 20 of 20; lower bounds 0.904, 1.009 and 0.972 |
| A2 | P2-B04, the sentinels | pass | 11x11 19 of 20, 18x19 and 21x21 20 of 20, lower bounds 1.627, 0.991 and 0.930; 15x15 20 of 20 |
| A3 | P2-B07, `require` (N-V4-15) | incomplete | 49 of 50 rows; one row lost to the host restart; clock-bound in every arm, no budget stop |
| A4 | P2-T11, replay resources | pass | 8 of 8 items measured, every replay matched, margin ok |
| A5 | P2-T13, browser checks | pass | 6 of 6, each 0.1 to 9.3 s |
| A6 | P2-T12, memory | pass | peaks 505 MiB (process) and 220 MiB (accounted); `model-too-large` 0 |

- **`require` first** (N-P2-14b-REQ, check-list §5). On the four `require` cells (22x22 and 32x15, Nightmare and Hell
  1) no arm reliably reaches ten: `gen-v4` 1 of 20 requests, today's search 0 of 10, the uncapped copy 2 of 19.
  `gen-v4` never stopped on its work budgets; every shortfall is a clock stop. Section 5 reads it, and the SAs propose
  no frozen-value change.
- **The thin controls** pass; 3x29's lower bound is 0.004 above the 0.9 threshold.
- **The boards without a prior-table cell** pass P2-B04. The three paired sentinels pass the declared 0.9 lower-bound
  gate. Their sample geometric means favour `gen-v4`; this does not establish speedup on every cell. 15x15 is
  completion-only.
- **A3 is incomplete only** because one of its 50 rows was cut by the Windows Update restart of 05:00 and is never run
  again (section 9).
- **The account:** stage A spent 252.468 of its 410 counted minutes.

## 2. Equality and bindings

- `report: A incomplete (A1 pass, A2 pass, A3 incomplete, A4 pass, A5 pass, A6 pass)`.
- **The snapshot.** `E/rows/A.jsonl` has 317 rows (SHA-256 `a08095673b4bbc36ff718d3b60976bef34e701590062e9e0cbfa6f26d2e47a98`).
  Every row is bound to the seal (`verifyRow`): none refused, no duplicate key.
- **Equality before interpretation** (plan §7.3). The 128 rows with an oracle are all equal:
  - the 8 smoke rows;
  - the 60 shipped `gen-v4` rows, against `fr-frozen-none`;
  - the 60 today's controls, against `log-link`.

  No clock-cut prefix rule was needed: every one of these rows reached ten. The sentinel and `require` rows have no
  oracle by design.
- **The four proof bundles** passed in P2-18 (`E/proofs/`). P2-18's reading asked for one precision about the
  certificate bundle:
  - its `screenCapped 0` means only that the sub-branch "a screened rating completes with main work above W" had no
    case (0 of 54);
  - the `IncompleteRatingError`-at-W branch occurred 28 times, counted as capped, and each was checked against the
    canonical rating.

## 3. A1: the thin controls (P2-B02)

| Cell | Reached ten (`gen-v4`) | Deadline violations | p95 time to ten (`gen-v4`) | Geometric mean, today over `gen-v4` | 90 % lower bound | Verdict |
|---|---:|---:|---:|---:|---:|---|
| 3x29 Nightmare | 20 of 20 | 0 | 6.2 s | 1.006 | 0.904 | pass |
| 22x22 Nightmare | 20 of 20 | 0 | 14.8 s | 1.113 | 1.009 | pass |
| 32x15 Nightmare | 20 of 20 | 0 | 21.9 s | 1.096 | 0.972 | pass |

- All three pass P2-B02's control gate: at least 18 of 20 reach ten, and the lower bound is at least 0.9.
- **3x29 passes with a thin margin.** Its lower bound of 0.904 is 0.004 above the threshold; the frozen round had
  0.9473.
  This is the risk the plan named (§8: phase 1 may have sped up today's search more than `gen-v4`).
- 32x15 rose from 0.9127 to 0.972.
- Stage B does not measure these three cells again, so these are their final readings.

## 4. A2: the sentinels (P2-B04)

| Cell | Gate | Reached ten (`gen-v4`) | Deadline violations | p95 time to ten (`gen-v4`) | Geometric mean, today over `gen-v4` | 90 % lower bound | Verdict |
|---|---|---:|---:|---:|---:|---:|---|
| 11x11 Nightmare | B02 | 19 of 20 | 0 | 78.4 s | 1.936 | 1.627 | pass |
| 18x19 Nightmare | B02 | 20 of 20 | 0 | 27.3 s | 1.295 | 0.991 | pass |
| 21x21 Nightmare | B02 | 20 of 20 | 0 | 35.7 s | 1.107 | 0.930 | pass |
| 15x15 Nightmare | completion, at least 18 of 20 | 20 of 20 | - | - | - | - | pass |

- **P2-B04 holds.** 11x11, 18x19 and 21x21 pass the B02 gate, as declared before the run and with no inherited
  exemption; 15x15 reaches ten on 20 of 20.
- **Against today's search.** The three paired sentinels pass the declared 0.9 lower-bound gate. Their sample geometric
  means favour `gen-v4`; this does not establish speedup on every cell. 15x15 is completion-only. On these boards
  `gen-v4` starts from the fallback rule (D-P2-07).
- **11x11's tail.** 11x11 has stage A's longest tail (p95 78.4 s), with no deadline violation. One request,
  `non-table/gen-v4/11x11-nightmare/22`, stopped on its clock with seven puzzles.
- **Two P5 trigger signs** among stage A's 140 eligible rows (C11):
  - `non-table/gen-v4/11x11-nightmare/22`: fewer than ten, and a clock stop;
  - `non-table/gen-v4/21x21-nightmare/37`: one batch call stopped on its budget; the request still reached ten in
    34.0 s.

  The activation receipt of stage B decides their twins (C10); this readout does not.
- **Cost.** The sentinel rows took 1.21 (`gen-v4`) and 1.23 (today) times their neighbour-proxy prices overall, and 2.1
  to 2.6 times on 11x11. This is the "weak proxies" case the plan warned of (§7.6); the cap held.

## 5. A3: `require` (N-V4-15, P2-B07)

- **Status `incomplete`, for one reason only:** `A3 require/uncapped/32x15-hell-1/2: no row line` (section 9).
- **49 of the 50 rows are read here,** including the three of P2-18's first group, which P2-18 kept uninterpreted. A3
  has no pass threshold: P2-B07 is a reading.

| Cell | Arm | Requests | Reached ten | Puzzles | Requests with none | Median response | Stops |
|---|---|---:|---:|---:|---:|---:|---|
| 22x22 Nightmare | `gen-v4` | 5 | 0 | 3 | 2 | 115.0 s | `time-limit` 3, `set:reserve-cut` 2 |
| 22x22 Nightmare | today | 5 | 0 | 9 | 2 | 159.4 s | `time-limit` 3, `set:time-limit` 2 |
| 22x22 Nightmare | uncapped | 5 | 1 | 17 | 1 | 149.1 s | `time-limit` 3, `set:time-limit` 1 |
| 32x15 Nightmare | `gen-v4` | 5 | 1 | 10 | 4 | 46.0 s | `set:reserve-cut` 4 |
| 32x15 Nightmare | today | 5 | 0 | 4 | 2 | 149.3 s | `time-limit` 3, `set:time-limit` 2 |
| 32x15 Nightmare | uncapped | 5 | 1 | 13 | 2 | 115.0 s | `set:time-limit` 2, `time-limit` 2 |
| 22x22 Hell 1 | `gen-v4` | 5 | 0 | 1 | 4 | 46.0 s | `set:reserve-cut` 4, `time-limit` 1 |
| 22x22 Hell 1 | uncapped | 5 | 0 | 11 | 0 | 185.2 s | `time-limit` 5 |
| 32x15 Hell 1 | `gen-v4` | 5 | 0 | 1 | 4 | 46.0 s | `set:reserve-cut` 4, `time-limit` 1 |
| 32x15 Hell 1 | uncapped | 4 | 0 | 2 | 2 | 122.0 s | `set:time-limit` 2, `time-limit` 2 |

Each request asks for ten puzzles. "Stops" lists `partialReason`; a request that reached ten has none. Hell 1 is
measured through the diagnostic copy (D-P2-11). Uncapped 32x15 Hell 1 has four rows: rep 2 is the interrupted row.

P2-B07's four readings:

- **Completion.** Reached ten: `gen-v4` 1 of 20, today 0 of 10, uncapped 2 of 19.
- **Uniqueness.**
  - By construction, `require` returns only a finished unique final (plan §4.4, the P5 budget row; P2-T04,
    unit-tested).
  - The bench's own uniqueness certificates were not run in these rows: `certificates.notChecked` equals the accepted
    count, 71 of 71. So these rows are not an independent certification of uniqueness.
  - All 49 rows are `valid`: none incorrect, censored or in error.
  - The replay probes replayed 12 `require` puzzles identically (A4, items 5 to 8).
- **Budget stops.** None in any of the 49 rows, in set and batch counters and in the raw call outcomes. No bound
  firing and no no-window end. N-V4-21's concern, `require` stopping on budgets, did not occur.
- **Deadline stops.** Every request short of ten stopped on its clock:
  - `gen-v4`: 14 times `set:reserve-cut`, each with no puzzle, and 5 times `time-limit`, each with one puzzle. The
    first is the 46-s set cut of the automatic scope (plan §4.5, D-P2-08), shown as `notice.N-NOSET`; the second is
    the 115-s stop.
  - today: 4 times `set:time-limit` and 6 times `time-limit`, from its two legacy timers.
  - uncapped: 5 times `set:time-limit` and 12 times `time-limit`, from today's two timers.

  Median responses: `gen-v4` 46.0 s (at most 115.0 s), today 154.3 s (at most 218.1 s), uncapped 149.1 s (at most
  219.3 s).

What it means:

- **No budget stop or bound firing was recorded;** every observed shortfall was a clock stop.
- **`require` on these boards is clock-bound in every arm,** today's search included.
- **`gen-v4` against today**, on the two Nightmare cells measured in all three arms:
  - each delivered 13 puzzles over 10 requests; `gen-v4` reached ten once, today never;
  - `gen-v4` answers within 120 s, today's two timers take about 150 s;
  - `gen-v4` returned nothing in 6 of 10 requests, today in 4 of 10. The 46-s set cut ends an automatic request whose
    piece set is not ready yet.
- **`gen-v4` against the uncapped copy.** The uncapped copy delivered 43 puzzles over 19 requests. It has the same
  selector, without P5's budget, bound and combined deadline, and with today's two timers. No budget stop or bound
  firing was recorded in `gen-v4`'s rows, and the uncapped copy's larger output came with its longer clock (median
  149.1 s against 46.0 s); these rows do not isolate the cause.
- **Scope.** The 46-s cut applies only to automatic CLI and bench requests. In the browser Generator, "New piece set"
  and "New puzzle" each keep their own 115-s scope, with no reserve (plan §4.5). These rows do not measure the
  browser.
- **Samples are small:** five requests per cell and arm. No ratio is drawn, and none is gated.

**The SAs' position.**
- No frozen-value change is proposed: plan §8 asks for a ruling only when a change is proposed. The clock behaviour is
  D-P2-08's approved automatic scope, and no budget stop or bound firing was recorded.
- The finding goes to the validation report (P2-21, beside P2-B06's population) and to phase 3, which uses this
  round's `require` diagnostics (plan §9).
- It confirms N-P2-14b-REQ's early warning.

## 6. A4: replay resources (P2-T11)

- **The invocation.** One `replay-probe.mjs --all` invocation (`A-replay-probes.32`, 654.144 node seconds, within its
  900-s limit) measured all 8 items. Its receipt is `E/replay-probes/receipt.json`.
- **The items:**
  - items 1 to 4 under `any`: 26x26 Hell 1, 20x20 Hell 1, 24x24 Nightmare and 22x22 Nightmare;
  - items 5 to 8 under `require`: 22x22 Hell 1, 32x15 Hell 1, 22x22 Nightmare and 32x15 Nightmare.
- **Every replayed puzzle matched:** 28 puzzles.
- **Margin `ok` on every item.** The largest values against the limits:

  | Measure | Largest | Limit | Share |
  |---|---:|---:|---:|
  | Steps | 185 (32x15 Nightmare, `require`) | 4,096 | 4.5 % |
  | Bytes | 1,118,651 (32x15 Nightmare, `require`) | 4,194,304 | 26.7 % |
  | Work units | 35,723,499,801 (32x15 Hell 1, `require`) | 215,040,000,000 | 16.6 % |

- **P2-T11 holds.**

## 7. A5: browser checks (P2-T13)

- **The checks.** Six checks of `tests/browser/deadline.html` ran on the sealed shipping build: `set-bound`,
  `batch-prefix`, `late-fence`, `fresh-after-pause`, `no-window-texts` and `screen-capped-step`. Their receipts are
  `E/browser/<check>/`.
- **The page's own readings** (`CHECK-END PASS`): 6.4, 6.4, 8.4, 9.3, 0.2 and 0.1 s.
- **The receipts:** 1.6 to 10.9 s each, Edge start included, far below one minute. Every receipt has `cleanup` null:
  no Edge process or profile was left. Each binds 51 source files, which A5 checks against the seal.
- **P2-T13's other parts** were met in P2-18's pre-seal gates: the full suite in 140.9 s, `npm run check`, and the
  file formats.

## 8. A6: memory (P2-T12)

Over the 317 rows, at four workers:

- largest process peak: 505 MiB (`require/uncapped/32x15-nightmare/1`), against 1,536 MiB;
- largest accounted peak: 220 MiB (`smoke/gen-v4/26x26-nightmare/20`), against 1,196 MiB;
- `model-too-large`: 0.

## 9. Interrupted rows and the host restart

- **One interrupted row:** `require/uncapped/32x15-hell-1/2`. Invocation `A-9.13` started it at 2026-11-26 04:57:43
  +07:00.
- **The restart.** Windows Update (`MoUsoCoreWorker.exe`, System event 1074) restarted the host at 05:00:05. The
  kernel's shutdown event 13 followed at 05:00:54, and the boot at 05:00:56.
- **The recovery.** The next call of group 9, `A-9.14`, recorded the row as `interrupted` (`no-report`) at 10:53:23,
  under pack amendment `8898fcd` (check-list §3.5's host-restart rule). Its pair, `require/gen-v4/32x15-hell-1/2`, is
  present.
- **Never run again (C5).** C5 forbids rerunning this key within the current sealed campaign. Further measurement
  requires a separate ruling, plan/epoch and repricing; existing observations retain their original identity. It is
  missing evidence, never zero and never imputed. A3 is incomplete by this row alone.
- **The charge.** `A-9.13` is charged 283.273 counted s: 238.273 node seconds, from the lock stamp to the kernel's
  shutdown event, plus the 45-s quiet; `cause: 'exit'`, `killed: true`, `exit: -1`. P2-19's execution log holds the
  printed evidence (INC-P2-19-RESTART).
- **Restarts stay a risk.** The owner answered Q-P2-R1 with (b): Windows Update is not paused, and restarts are an
  accepted risk. The same rule applies in stage B.

## 10. The account

| Item | Invocations | Counted s |
|---|---:|---:|
| Proof bundles (P2-18) | 4 | 1,091.355 |
| Row groups 1 to 23 | 27 | 13,042.979 |
| Replay probes | 1 | 699.144 |
| Browser checks | 6 | 314.603 |
| **Stage A** | **38** | **15,148.081 (252.468 min)** |

- **Spend.** 252.468 of 410 counted minutes. The plan priced stage A at 330.656 counted and 409.195 guard minutes.
- **What remains** is 9,451.919 s (157.532 min). It is not usable by stage B: the stage map is sealed and nothing is
  borrowed between stages (check-list §3.5).
- **The 27 row invocations:**
  - one call per group (23);
  - three more calls because `A-15.20`, `A-15.21` and `A-16.23` ended with deferred keys (exit 7);
  - the host-restart line `A-9.13`.

  The `rowsWritten` total is 317.
- **Actual over priced machine time:**
  - `require` 0.51 to 0.60 (priced at their row limits);
  - the sentinels 1.21 to 1.23;
  - rows on cells with frozen measurements 0.78 to 0.79;
  - smoke 0.79.

## 11. For stage B and the validation report

- **Stage B** starts only after the owner's continuation and this file committed with `Stage B: PROCEED`;
  `ledger --check --stage B` enforces it (C12).
- **Its budget.** Its 402 minutes are untouched; it is priced at 321.258 counted and 401.572 guard minutes. Most stage-B
  rows are on cells with frozen measurements, which ran at 0.78 to 0.79 of their price here. The ledger admits each
  call at its limit.
- **Twins.** Section 4's two trigger signs go to the activation (C10, C11).
- **For P2-21:**
  - the `require` finding (section 5);
  - 3x29's thin margin;
  - the sentinels' cost against their proxies;
  - the certificate bundle's precision (section 2);
  - the interrupted row and A3's incompleteness, with the owner's answer.

## 12. Owner question Q-P2-A3 (relay verbatim)

**Q-P2-A3: Continue to stage B with one `require` row missing?**

- **Addressee:** owner. Raised by SA-Opus and SA-Astra in the stage-A readout, 2026-11-26.
- **Decision needed:** may stage B start although stage-A gate A3 is incomplete (49 of its 50 rows)?

**Context.**
- **Stage A is done:** 317 of 318 rows, the 8 replay probes and the 6 browser checks, in 252.5 of its 410 minutes.
- **Five of six gates pass:**
  - the thin controls (A1);
  - the boards without a prior-table cell (A2);
  - replay resources (A4);
  - the browser deadline checks (A5);
  - memory (A6).

  All 128 rows with a frozen reference equal it.
- **Why A3 is incomplete.** A3 is a reading with no pass threshold. It is incomplete only because the Windows Update
  restart at 05:00 cut one row, `require/uncapped/32x15-hell-1/2`. C5 forbids rerunning this key within the current
  sealed campaign. Further measurement requires a separate ruling, plan/epoch and repricing; existing observations
  retain their original identity.
- **What the 49 rows show.** `require` on the large boards it was measured on (22x22 and 32x15, Nightmare and Hell 1)
  rarely reaches ten puzzles in any version: `gen-v4` 1 of 20 requests, today's search 0 of 10, the uncapped copy 2 of
  19.
  - `gen-v4` never stopped on its work budgets.
  - By design it answers within 2 minutes (median 46 s). In 14 of 20 requests its piece set was not ready at the 46-s
    cut of automatic requests, so it returned no puzzle.
  - Today's search ran about 150 s and returned at least one puzzle in 6 of 10 requests.
  - On the two Nightmare boards, both delivered 13 puzzles over 10 requests.
  - The 46-s cut applies to CLI and bench requests only; the browser Generator keeps 115 s per action.

**Options.**

| Option | What it means | Consequences |
|---|---|---|
| (a) Continue | Stage B runs; A3 stays recorded as incomplete (49 of 50) | Stage B runs within its 402-minute cap; the `require` finding goes to the validation report and to phase 3, with no code change |
| (b) Stop after stage A | No stage B | The plan's phase-2 gate (P2-B01 to P2-B03, P2-B05, P2-B06) stays unmeasured, so `gen-v4` cannot be qualified; PR #14 stays a draft |
| (c) Change `require` first | The SAs propose a longer limit for automatic `require` requests before stage B | A new source epoch: a new seal, the affected rows measured again, and a new price for you to approve; stage A's rows are not reused for the new source; stage B waits for all of it |

**The SAs' recommendation:** (a).
- The missing row is one of five uncapped 32x15 Hell 1 requests. Even if it reached ten, uncapped completion would be
  at most 3/20. Its actual outcome, correctness and other readings remain unknown. No gate failed.
- (c) is not proposed: no budget stop or bound firing was recorded, and the 2-minute automatic limit is the approved
  design (D-P2-08). The browser does not use the 46-s automatic set cut; its require performance is not measured here.

**Meanwhile:** stage B and the tasks after it wait. No machine minutes are spent.

**How to answer:** reply `Q-P2-A3: a`, `Q-P2-A3: b` or `Q-P2-A3: c`, with any comment.

## 13. After the answer (the orchestrator)

1. Copy the owner's answer and its Discord message id into P2-19's execution log.
2. **On (a):**
   - insert `Owner continuation: <message id>` as line 6;
   - change line 5 to `Stage B: PROCEED`;
   - fill line 4 with SA-Astra's acceptance time, if it is still `pending`;
   - commit with P2-19 step 6.

   `node tools\ig-proto\phase2\p2.mjs ledger --check --stage B` must then print `ledger: admitted ...`.
3. **On (b) or (c):** line 5 stays `Stage B: STOP`, and the SAs write the follow-up.
