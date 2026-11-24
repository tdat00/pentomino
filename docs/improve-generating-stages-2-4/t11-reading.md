# T11: the SAs' reading of `V4-S3P` and `V4-S2B` (the read gate of D-S24-24)

Status: **joint note, drafted by SA-Opus; SA-Astra's review pending** (the text of T11 step 6,
`tasks/improve-generating-stages-2-4/T11-sa-reading-of-the-fit-runs.md`). Date 2026-11-24. Base `a3e256f` (S03
committed). Every reading below is an unlocked read of records; it used no machine minute. A ruling here is a joint SA
decision under the owner's delegation (2026-11-23 15:29, Discord message 1574341211701907457). [V] marks a figure
recomputed from the records; [A] marks an assumption or a judgement.

## Summary

1. S03 ran `V4-S3P` to the end: the four frozen arms' P-1 proofs pass, with their replay blocks, and are accepted; the 20
   uncapped Hell 1 requests are published. The run counted 2,298.808 s (38.3 minutes). The round's account is now 237.9
   of the 749 counted minutes granted [V].
2. **The evidence is complete.** Each of the 20 declared rows is present once, correctly identified, valid, published
   complete, in a finished shard and has a complete ledger. No input is unreadable, no row is missing or unexpected, and
   the rows ran on the candidate epoch's uncapped tree [V].
3. **The budget would not intervene.** None of the 432 calls (337 ended, 95 terminated) reaches the 40-G Hell 1 budget at
   a primitive boundary: 0 affected, 0 potentially affected, 0 ambiguous. The largest recorded call prefix is 22.396 G, so
   the budget is 1.79 times the largest observed call [V].
4. **The bound would not intervene.** No row fires the four same-side no-window bound. In every row the first set attempt
   ended with a hit or a window, so no observed path has a no-window set end at all [V].
5. **The transport is exact.** All 80 set-stage starts carry the table prior of `prior-s3-v1` and all 432 starts carry
   `W` = `DEDUCE.work` (no screen on Hell 1). All 352 batch starts carry the per-set prior of their row's matching Hell 1
   calibration, with no unattributed start. In 10 of the 20 rows (173 batch starts) the per-set prior differs from the
   table prior, so the transport is seen, not a coincidence of equal values. Stored-recipe transport is not observed in
   this row dataset [V].
6. **The post-hoc projection** (not a live-deadline proof) cuts no set stage: the latest set stage ended at 35.3 s,
   against the 46-s cut. It loses one completion, 14x14 Hell 1 rep 1, which reached ten at 128.0 s and serves 8 by
   115 s. That completion is lost to the stop itself, as on the same seed in stage 2 [V].
7. **The controls:** S01's three decisions stand. W3's repair is in effect: this prefixes record indexes the four
   `.runs.md` files it reads [V].
8. **Outcome (A): nothing is flagged.** The proposed deterministic limits would not intervene at the observed primitive
   boundaries. This is not a measured zero-loss bounded/uncapped comparison and not a live-deadline proof; `V4-LIVE` and
   every declared `V4-S4C` comparison remain mandatory. The candidate epoch is accepted unchanged: T12b records T08a's
   trees. **No question goes to the owner.**

## 1. The run (S03) and the candidate epoch

**The run** (the orchestrator's facts; the invocations checked in `tests/artifacts/ig-proto/frozen/V4-S3P/invocations.jsonl`
[V]):
- It ran from 2026-11-24 07:42:21 to 08:21:07 +07:00 and exited 0, under the owner's approval Q-S03 (a) (Discord message
  1574585730338922549). Its log is `tests/artifacts/ig-proto/frozen/V4-S3P/run-1.log`.
- Eight locked invocations, each with `quietS` 15 and `horizonS` 885, none killed, each exiting 0 and done:
  - the four parity steps: 321.088, 321.504, 321.142 and 320.558 s;
  - the four row steps: 14x14 522.096, 20x20 182.864, 24x24 150.346 and 26x26 159.210 s.
- The run counted 2,298.808 s, the sum of the eight. The account adds it to S02's 11,887.323 s: 14,186.131 s logged plus
  87.4 s off-log, which is 237.9 of the 749 counted minutes. The 20 rows used 1,014.516 s (16.9 minutes) of the 67.69
  projected and 84.61 guard minutes the owner approved for them (D-S24-27).
- The firewall check was `OK`, and G1 and G2 printed nothing.

**The candidate epoch [V]** (`t11-epoch.mjs`, 12 files read, 0 problems):

| Arm | P-1 receipt | Parity block | Replay block | Tree | Parameter hash | Binding |
|---|---|---|---|---|---|---|
| `fr-frozen` | `pass` | `pass` | `pass` | `b3e530b1bca5` | `8d88421dd28d` | binds this receipt; `acceptedBy` V4-S3 |
| `fr-frozen-none` | `pass` | `pass` | `pass` | `fa903f397ef6` | `2fb012457857` | binds this receipt; `acceptedBy` V4-S3 |
| `fr-frozen-uncapped` | `pass` | `pass` | `pass` | `96ef38e2fd6d` | `a65b581dff5d` | binds this receipt; `acceptedBy` V4-S3 |
| `fr-frozen-none-uncapped` | `pass` | `pass` | `pass` | `e31d829dee8d` | `bedc1ecdfde3` | binds this receipt; `acceptedBy` V4-S3 |

- The four trees are T08a's: the tree ids of its NOTE and of T08b's `freeze.mjs check`.
- Each binding's `receipt.sha256` is the receipt file's hash, and its expected arm is the receipt's arm.
- The four published runs files of the 20 rows are of the frozen source. They name the tree `e31d829dee8d` with the
  parameter hash `bedc1ecdfde3`, which are the uncapped binding's. Their producer `fd37ef4646a7` is the bindings'
  `harnessHash`.

## 2. The commands and their outputs

- **Step 1** (unlocked; the record is written once):

  ```
  node tools\ig-proto\fit-read.mjs prefixes --task V4-S3P --arm fr-frozen-none-uncapped --budget hell-1=40000000000 --bound 4 --label frozen --source-label "frozen 3fc65f4"
  fit-read: wrote docs/improve-generating/evidence/frozen/V4-S3P/fit-read-prefixes-fr-frozen-none-uncapped.json (20 rows, 0 missing, 0 identity problems, 0 incomplete, 0 affected, 0 potentially affected, 0 ambiguous, 0 bound firings)
  ```

- **The SA-Opus scratch scripts**, in `docs/improve-generating-stages-2-4/evidence/sa-opus/`, each unlocked and run from
  the repository root as `node docs\improve-generating-stages-2-4\evidence\sa-opus\<script>`. Each writes its outputs
  beside itself; none rates, searches or generates:
  - `t11-prefixes-table.mjs` (steps 1 and 5) reads the prefixes record and, through the reader's own `callPrefixes`, the
    same 116 worker journals. It writes `t11-prefixes-table.json` and `.md`. Its output: `20 rows; largest call
    22.396 G (budget 40 G, x1.786); recomputed maxima equal the record's: true`.
  - `t11-transport.mjs` (step 2) writes `t11-transport.json`, `.md` and its input index `t11-transport-inputs.json` (145
    files, sha256Lf `de2b3ae568c57f256fea71bf92921c3ad660ffffabc5303f26475f1042a5ea9f`). Its output: `20 rows, 4 cells,
    0 mismatches`.
  - `t11-projection.mjs` (step 3) writes `t11-projection.json`, `.md` and its input index `t11-projection-inputs.json` (6
    files, sha256Lf `26445856a9352960d9a23325961bca1b1a0750ea45695c1a76683d16a8563c80`).
  - `t11-epoch.mjs` (section 1) writes `t11-epoch.json`. Its output: `0 problems; 12 files read`.
- **The two indices** list `{ path, sha256Lf }` for every file the script read, `sha256Lf` being the SHA-256 of the text
  with CRLF replaced by LF. T12a binds them with the two scripts (`FIT_INDICES`, `FIT_INPUTS`). Besides the records,
  they bind three other inputs:
  - the harness module `tools/ig-proto/verdicts.mjs`, which the scripts import (`ingestRow`, `parseLines`,
    `deadlineProjection`); it is unchanged since `57ef5cf`;
  - the protected data files `plans/V4-S3P.json`, `data/prior-s3-v1.json` and `data/boards-v1.json`;
  - the frozen snapshot's `core/engine/policy.js`, the source of `DEDUCE.work`.

## 3. The call prefixes against the proposed bounded configuration [V]

**How it is read:**
- The reader adds each call's main, census and uniqueness units in primitive order.
- A call is `affected` when a recorded `begin` comes after its spent total reached 40 G (the frozen Hell 1 budget, the
  same in `any` and `require`).
- A terminated call is `potentially affected` when its completed primitives alone reach 40 G.
- A primitive still running at a termination is not assumed cut: P5 checks between primitives.
- "Max call spent" is the largest sum of completed primitives recorded for one call. It is not an upper bound on the work
  that a terminated call consumed in its open primitive.

| Cell | rows | valid | complete | calls | affected | potentially affected | ambiguous | max call spent (G) | bound firings |
|---|---|---|---|---|---|---|---|---|---|
| 14x14-hell-1 | 5 | 5 | 5 | 101 | 0 | 0 | 0 | 22.396 | 0 |
| 20x20-hell-1 | 5 | 5 | 5 | 114 | 0 | 0 | 0 | 13.849 | 0 |
| 24x24-hell-1 | 5 | 5 | 5 | 109 | 0 | 0 | 0 | 5.796 | 0 |
| 26x26-hell-1 | 5 | 5 | 5 | 108 | 0 | 0 | 0 | 8.531 | 0 |

**The losing and terminated calls:**

| Cell | Calls ended / terminated | Largest ended batch call (G) | Largest terminated call (G) | Largest set call (G) |
|---|---:|---:|---:|---:|
| 14x14-hell-1 | 78 / 23 | 22.396 | 20.774 | 10.979 |
| 20x20-hell-1 | 90 / 24 | 13.849 | 5.119 | 1.936 |
| 24x24-hell-1 | 86 / 23 | 4.989 | 2.130 | 5.796 |
| 26x26-hell-1 | 83 / 25 | 8.531 | 3.790 | 6.181 |

- **The largest calls.** The largest call is 14x14 Hell 1 rep 0's batch call `2/0`, which ended at 22.396 G. The largest
  terminated call is rep 3's batch call `3/1`, at 20.774 G of completed primitives when its request ended.
- **The terminated calls.** Each of the 95 was terminated with one primitive open: 36 set attempts cancelled once attempt
  0 had won, and 59 batch candidates discarded before they finished. Every row ledger closes as a work interval.
- **The result.** Every recorded prefix stays below 40 G, so no between-primitive P5 stop is indicated on an observed
  path. This is a prefix result, not a claim that every terminated call's total consumed work is known to be below 40 G.

## 4. Completeness of the evidence (SA-Astra's reviews R03 and R2-03) [V]

All 20 declared rows of `fitScope` (`plans/V4-S3P.json`, the four row steps, reps 0-4) are in the record:
- each is present once, with a complete publication, in a finished shard;
- `rowStatus` is `valid` on every row, so none is invalid, censored or erroneous;
- `identity` is empty on every row: the declared row, the shard declaration, the row identity line and the publication's
  tree, copy and producer agree;
- `complete` is true on every row: the ledger closes with its linkage;
- `unreadable` is false and `problems` is empty on every row, and `summary.missing` and `summary.unexpected` are empty.

The record's input index has 173 files: the plan, the four runs files, the four `.runs.md` files, the four shard states,
the four shard declarations, the 20 row identity files, the 116 worker journals and the 20 link files. It includes the
`.runs.md` files that `publicationOf` reads (T02d, ruling R-P24-05). The transport script's own parse of the same journals
finds no line problem.

## 5. The four-attempt bound [V]

- Each row has four set calls (attempts 0 to 3).
- In all 20 rows, attempt 0 ended `ok`, and it is the row's winning attempt (`run.details.setAttempt` 0).
- Of the 80 set calls, 44 ended (36 `hit`, 8 `window`) and 36 were terminated after attempt 0 won.
- No set call ended `below-to-one` or `above-to-max`, so the bound's condition (attempts 0 to 3 all ended without a
  window on one side) cannot hold on any row. `boundFirings` is 0 on every row.

As in stage 2 (N-V4-16), this zero is vacuous: these rows do not exercise the bound or its glue. The plan routes that risk
to the real-worker test (plan §4.4) and to `p5Stops` against the uncapped twins at stage 4 (plan §7, the risk "P5's glue or
bound misbehaves when it first fires").

## 6. The transport of the prior [V]

**The rules checked** (`t11-transport.mjs`):
- **A set start** must carry the table prior of `prior-s3-v1`, `priorCount = clamp(round(share x K), 1, K - 2)`. The
  share is that of `hell-1@<area>`: 0.4 (196), 0.368421 (400), 0.219512 (576) or 0.2 (676). `K` is the start's own.
- **Every start** must carry `W` = 760,000,000, which is `DEDUCE.work`.
- **A batch start** is checked against SA-Astra's review R16:
  - The winning set call is the one of the valid row's `run.details.setAttempt`. It has its `set-complete` linkage
    (outcome `ok`) and a unique set-stage start and end.
  - Its successful rating gives the calibration's level and score, and its `end.locate.wc` gives `wc`.
  - When the calibration shows the target level (Hell 1; the four cells are `any` requests, so no certificate is
    needed), every batch start must carry `priorCount = clamp(wc, 1, K - 2)`. Otherwise it must carry the table prior.
  - A batch start counts as attributed when it has the winning set's `K` and a `dispatch` linkage of the row's batch
    with its slot and attempt.

| Cell | Rows (valid) | Set starts (ended) | Set mismatches | Matching calibrations | Batch starts (ended) | Batch mismatches | Batch starts where the per-set prior differs from the table | Unattributed |
|---|---|---|---:|---:|---|---:|---:|---:|
| 14x14-hell-1 | 5 (5) | 20 (13) | 0 | 5 | 81 (65) | 0 | 31 | 0 |
| 20x20-hell-1 | 5 (5) | 20 (10) | 0 | 5 | 94 (80) | 0 | 58 | 0 |
| 24x24-hell-1 | 5 (5) | 20 (12) | 0 | 5 | 89 (74) | 0 | 62 | 0 |
| 26x26-hell-1 | 5 (5) | 20 (9) | 0 | 5 | 88 (74) | 0 | 22 | 0 |

- **The `W` check:** all 432 starts carry `W` = 760,000,000.
- **The calibrations:** all 20 winning calibrations are rated `hell-1`, with scores from 79 to 103.
- **Where the two priors differ:** the per-set prior differs from the table prior by -3 to +3 in 10 rows. In those rows
  every batch start carries the per-set value. The per-set prior on Hell 1 is therefore transported on real requests.
- **Stored-recipe transport is not observed in this row dataset.** The request rows persist no candidate `made` records
  and no packs: `arm.mjs` writes row reports and journals, and publication removes the accepted payload. So `priorVerdict`
  does not apply to them, and no pack check is claimed.
- **The code path's controlled checks** are separate from this request-row evidence:
  - T08c's `fz: the per-set prior on Hell 1 only (payloads)`: on `fr-frozen`, Hell 1 batch payloads carry the
    calibration's `wc` and Nightmare ones carry none;
  - `fz: per-set prior levels (rule)`;
  - the v4 pack's `items: per-set prior verdict` (the `made` records of saved packs);
  - the v4 pack's `v4: provenance versions per arm`.

## 7. The reserve and deadline projection [V]

**Post-hoc projection (D-V4-08), not a live-deadline proof.** Per cell, `t11-projection.mjs` runs
`deadlineProjection(rows.map((r) => ingestRow(r, { quantity: 10 })), { reserve: 0.6, deadlineMs: 115000, quantity: 10 })`
over the published rows:
- a set stage that ends after 46,000 ms is cut;
- a row serves the puzzles accepted by 115,000 ms.

The projection estimates accepted prefixes from the recorded timelines. It proves neither the cancellation of dispatched
work, nor the response assembly, nor the 120-s bound.

| Cell | Rows (valid) | Reached ten uncapped | Projected reserve cuts (`setCut`) | Projected lost completions (`lost`) | Completed in the projection | Latest set stage end (s) |
|---|---|---:|---:|---:|---:|---:|
| 14x14-hell-1 | 5 (5) | 4 | 0 | 1 | 3 | 35.3 |
| 20x20-hell-1 | 5 (5) | 5 | 0 | 0 | 5 | 4.9 |
| 24x24-hell-1 | 5 (5) | 5 | 0 | 0 | 5 | 17.2 |
| 26x26-hell-1 | 5 (5) | 5 | 0 | 0 | 5 | 18.0 |

`served` per row:

| Cell | Rep 0 | Rep 1 | Rep 2 | Rep 3 | Rep 4 |
|---|---:|---:|---:|---:|---:|
| 14x14-hell-1 | 10 | 8 | 10 | 2 | 10 |
| 20x20-hell-1 | 10 | 10 | 10 | 10 | 10 |
| 24x24-hell-1 | 10 | 10 | 10 | 10 | 10 |
| 26x26-hell-1 | 10 | 10 | 10 | 10 | 10 |

- **The lost completion: 14x14 Hell 1 rep 1.** It reached ten at 128.0 s, after 8 puzzles by 115 s: it is lost to the
  stop itself.
- **14x14 Hell 1 rep 3** returned 2 puzzles at 150.3 s (`time-limit`). It never reached ten, so it is not a lost
  completion.
- **The same as stage 2** on these two seeds (report §1.7 and §1.9). There, `fr-base`'s rep 1 reached ten at 142.807 s
  and rep 3 returned two puzzles at 150.629 s; the set stage ended by 35.562 s at most; and the same single completion
  was lost to the stop.
- **The other three cells** completed every request by 44.2 s.

D-S24-04 counts lost completions against the uncapped search; stage 4's `V4-S4C` measures them.

## 8. The controls (S01's `s01-reading.md`, restated)

| S01 warning | Decision (joint, under the owner's delegation) | State |
|---|---|---|
| W1: 32x15 Nightmare, five-seed lower bound 0.813 (below 0.9) | (a) no change; the risk is carried to stage 4 | S06's STOP 2 names it to the owner |
| W2 (from stage 2): 26x26 Nightmare, lower bound 0.881 | (a) no change, for W1's reasons | carried with W1 |
| W3: the prefixes input index omitted eight `.runs.md` files | (a) no configuration change, and the provenance repaired | repaired: T02d done (this record indexes the four `.runs.md` files); T12a binds SA-Astra's `s01-review-checks.json` field `publicationInputs` |

S01 named no pending point, so nothing new is read from `V4-S2B`. The freeze values of plan §4.1 stand for the controls.

## 9. Warnings and rulings

**No warning.** The gate's evidence rule finds no missing, unexpected, invalid, censored, erroneous, incomplete,
unreadable or ambiguous row or input. It finds no identity problem, no affected, potentially affected or ambiguous call,
no bound firing and no transport mismatch (sections 3 to 6). No ruling is needed.

**Observations (not warnings; no decision needed) [A]:**
- **The projected lost completion on 14x14 Hell 1** (section 7) belongs to the deadline, not to a budget or an attempt
  bound. It is the cost the owner accepted with one 115-s stop (D-S24-04), on the same seed as in stage 2, and stage 4
  counts it against the uncapped twin. Hell 1 is reported, not gated (IG-P-Q30).
- **The budget and the bound are not exercised** by these rows (sections 3 and 5). The read gate needs only that they
  would not intervene on an observed path. Their first real stops are read where the plan reads them: P5's real-worker
  test (plan §4.4) and `V4-S4C`'s `p5Stops` against the uncapped twins.
- **`require` is not in these rows.** The four cells are `any` requests. The 40-G Hell 1 `require` budget is the owner's
  recorded policy (D-S24-23, D-S24-25). S03's four P-1 receipts, whose items run `require`, pass with their replay blocks,
  as D-S24-25 requires before stage 4. `require` on the largest boards stays N-V4-15.

## 10. The gate (plan §8.2, D-S24-24, verbatim) and the outcome

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

**Outcome: (A), nothing flagged.** Every declared row is present, unique, correctly identified and valid, with a complete
ledger and readable inputs. That is checked row by row (section 4), not inferred from a total of 20.
- No observed call reaches the 40-G budget at a primitive boundary.
- No row can meet the four-attempt bound's condition.
- The table prior, `W` and the per-set prior are transported exactly on every attributed start.

**The proposed deterministic limits would not intervene at the observed primitive boundaries.** This is not a measured
zero-loss bounded/uncapped comparison and not a live-deadline proof. `V4-LIVE` and every declared `V4-S4C` comparison
remain mandatory.

The candidate epoch is accepted unchanged: the Hell 1 budget of 40 G in both modes, the bound of four same-side no-window
attempts, the reserve and deadline of `deadline-s3-v1`, `prior-s3-v1` and the per-set prior on Hell 1. T12b records T08a's
trees: `fr-frozen` `b3e530b1bca5`, `fr-frozen-none` `fa903f397ef6`, `fr-frozen-uncapped` `96ef38e2fd6d` and
`fr-frozen-none-uncapped` `e31d829dee8d`.

## 11. Consequences

- **T12a starts once this note is jointly signed** (section 13); T12b follows it. The fit index binds this note and the
  following inputs (T12a's `FIT_INDICES` and `FIT_INPUTS`):
  - the prefixes record and its `inputs`;
  - `t11-transport.mjs`, `t11-projection.mjs` and their two input indices.
- **No owner question and no new measured scope.** The account stays at 237.9 of the 749 counted minutes until S04,
  whose `V4-LIVE` is asked at its turn.
- **The next progress report** (the orchestrator translates):

  > "The new Hell 1 settings were checked on 20 real requests before the freeze: none of the new work or attempt limits
  > would have cut any recorded step of these requests, and the new starting guesses were applied exactly as designed.
  > With the 115-second stop, one 14x14 Hell 1 request would have returned 8 puzzles instead of 10, as in stage 2. The
  > SAs keep the settings, and the freeze is recorded next. The round's account is 237.9 of the 749 minutes you granted.
  > No answer is needed now."

## 12. Evidence

- **The run:**
  - `tests/artifacts/ig-proto/frozen/V4-S3P/run-1.log` and `invocations.jsonl`;
  - the receipts and bindings `docs/improve-generating/evidence/frozen/V4-S3P/parity-<arm>.receipt.json` and
    `.accepted.json` (the four arms);
  - the published rows `docs/improve-generating/evidence/frozen/V4-S3P/fr-frozen-none-uncapped/pilot-<cell>.runs.json`
    and `.runs.md`;
  - the raw journals `tests/artifacts/ig-proto/frozen/V4-S3P/fr-frozen-none-uncapped/pilot-<cell>/logs/`.
- **The reading:** `docs/improve-generating/evidence/frozen/V4-S3P/fit-read-prefixes-fr-frozen-none-uncapped.json` and
  `.md`.
- **The scratch scripts and their outputs** (`docs/improve-generating-stages-2-4/evidence/sa-opus/`):
  - `t11-prefixes-table.mjs`, `.json`, `.md`;
  - `t11-transport.mjs`, `.json`, `.md`, `t11-transport-inputs.json`;
  - `t11-projection.mjs`, `.json`, `.md`, `t11-projection-inputs.json`;
  - `t11-epoch.mjs`, `.json`.
- **The controls:** `docs/improve-generating-stages-2-4/s01-reading.md`.
- **Rules:**
  - plan §4.1, §4.3, §4.7 and §8.2 (T11's gate);
  - report §1.7, §1.9 and §2.7;
  - D-S24-04, D-S24-14, D-S24-23 to D-S24-27;
  - SA-Astra's reviews R03, R2-03, R15 and R16;
  - rulings R-P24-03 to R-P24-05 (the fitting reader and W3's repair).

## 13. Sign-off

- SA-Opus (drafter): jointly signed acceptance of the final epoch, outcome (A), 2026-11-24.
- SA-Astra (reviewer): jointly signed acceptance of the final epoch, outcome (A), 2026-11-24.
