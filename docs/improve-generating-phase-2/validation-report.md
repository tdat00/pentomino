# Validation report: improve-generating phase 2 (`gen-v4` on production code)

| Item | Value |
|---|---|
| Feature, task | `improve-generating-phase-2`, P2-21 (`tasks/improve-generating-phase-2/P2-21-validation-report.md`) |
| Plan | `plan.md` §6 (acceptance, the phase-2 gate), §7 (validation design), §8 (risks), §10 (named items) |
| Measured source | seal `bca8cfd2db491e686fb37f5ed2bf640e4eac3c93513c005f775f971bf4979f5b`, commit `fa0bda2`, Node v26.13.0, six sealed copies |
| Authors | SA-Opus (drafter), SA-Astra (reviewer); jointly signed in section 19 |
| Companion | `validation-report.json`: the same criteria, decisions and inputs as data |

Paths are relative to `docs/improve-generating-phase-2/`, and `E` means `evidence/`. Citations name a record under
`E` and a field:
- `report-B gates.B1.detail.cells` is the entry of the `gates` array whose `id` is `B1`;
- `rows/B.jsonl run.acceptedCount` is a field of each row line.

Every input is bound by its SHA-256 in section 18. Missing data is incomplete, never a pass; a reach of zero is
"unexercised". Supplemental input: P2-18's committed execution log, solely for pre-seal verification results; its
SHA-256 is in the input table (pack-author ruling on SA-Astra's R21-03).

**Verdict line:**
`Phase 2: INCOMPLETE (P2-B01 to P2-B03, P2-B05 and P2-B06: pass; P2-T01: incomplete—one eligible row without equality evidence; P2-B04: pass; P2-B07: read on 49 of 50 rows, owner continuation recorded)`

## 1. Summary

- **The phase-2 gate is INCOMPLETE.** Its criteria P2-B01 to P2-B03, P2-B05 and P2-B06 pass on production `gen-v4`:
  the failing boards reach ten 20 of 20, the controls pass, Master is identical, and `n-mid` keeps its screen (×2.31).
- **P2-T01 is incomplete:** of 818 eligible rows, 796 are equal and 21 prefix-equal; one 14x14 Hell 1 row gives no
  equality evidence (cut at 46 s with no puzzle). No port difference was observed.
- **The additions:** the sentinels pass. `require` stops on the clock in every arm; one of its 50 rows was lost to a host
  restart, and the owner continued.
- **P5:** no false stop; three deadline-cut losses on 14x14 Hell 1, with no recorded budget stop or bound firing.
- **Replay margins, memory and the browser checks** pass. 520.920 of the 812 counted minutes were spent.
- **Decision needed:** Q-P2-V1, whether to accept that limitation and ship `gen-v4` by merging PR #14 (PR #11 is merged).
  The SAs recommend (a), conditional on that explicit acceptance.

## 2. Port equality (P2-T01)

| Component, arm | Cells | Rows | Equal | Equal on the prefix (clock-cut) | No evidence | Oracle |
|---|---:|---:|---:|---:|---:|---|
| smoke, `gen-v4` | 8 | 8 | 8 | 0 | 0 | V4-S4 `fr-frozen-none`, `fr-frozen`, `log-link` |
| shipped, `gen-v4` | 19 | 380 | 370 | 9 (14x14 Hell 1) | 1 (14x14 Hell 1 rep 33) | V4-S4 `fr-frozen-none`; `fr-frozen` on `n-mid`; `log-link` on 26x26 Nightmare |
| baseline-control, today | 10 | 200 | 196 | 4 (18x18 reps 22 and 25, 18x20 rep 34, 20x21 rep 25) | 0 | V4-S4 `log-link` |
| `n-mid` without the screen | 3 | 60 | 60 | 0 | 0 | V4-S4 `fr-frozen-none` |
| shipped-master, `gen-v4` | 16 | 80 | 80 | 0 | 0 | V4-S4 `log-link` |
| baseline-master, today | 16 | 80 | 80 | 0 | 0 | V4-S4 `log-link` |
| conditional twin, uncapped | 1 | 10 | 2 | 8 (14x14 Hell 1) | 0 | V4-S4C `fr-frozen-none-uncapped` |
| **Total** | | **818** | **796** | **21** | **1** | |

Source: `report-B equality` (`key`, `oracle`, `verdict`, `n`), over `rows/A.jsonl` and `rows/B.jsonl`.

- **No row differs,** so there is no port defect (plan §7.3).
- **Prefix-equal rows.** Each was cut by a clock and equals its oracle on its common prefix of `n` puzzles.
- **The row without evidence** is `shipped/gen-v4/14x14-hell-1/33`. It ended at the 46-s set cut with no puzzle
  (`rows/B.jsonl run.partialReason` `set:reserve-cut`, `run.acceptedCount` 0), as its frozen counterpart did: rep 33,
  the reserve cut (plan §7.3). With no set, there is nothing to compare (`why`: "missing igSetKey"). The row is
  eligible and measured, and the population (B5), the Hell 1 report (B6), memory (B7) and P5 (B8) read it.
- **P2-T01: incomplete.** Of 818 eligible observations, 796 are equal and 21 prefix-equal; one provides no equality
  evidence. No port difference was observed.
- **Measuring rep 33 again would not help.** Its frozen reference also has no set and no puzzle (the 46-s cut), and
  `equality()` of `tools/ig-proto/phase2/gates.mjs` gives "no evidence" whenever either side lacks a set key. The same
  seed's uncapped twin, `conditional-twin/uncapped/14x14-hell-1/33`, equals its V4-S4C reference on its first 5 puzzles
  (`report-B equality`, prefix-equal, `n` 5). It is a different row and does not replace the missing evidence.
- **Not compared, by design:** the 140 sentinel rows, the 49 `require` rows and the two slot twins (non-table cells)
  have no oracle (plan §7.3).
- **The proof bundles** passed before any row ran, each with `quick` false (`proofs/<bundle>/result.json status`,
  `counts`):
  - observer: 15 of 15, 14 traced calls;
  - certificate: 9 of 9; certified 26, capped 28, `screenCapped` 0;
  - prior-replay: 6 of 6; 24 replays matched;
  - legacy: 10 of 10; 4 replays matched.

  The certificate's `screenCapped` 0 means only that the sub-branch "a screened rating completes with main work
  above W" had no case. The `IncompleteRatingError`-at-W branch occurred 28 times and was checked against the canonical
  rating (`stage-a-readout.md` §2).
- **The smoke report** is `complete` with S1 and S2 `pass` (`report-smoke gates.S1`, `gates.S2`).

## 3. The business criteria

### P2-B01: the five formerly failing Nightmare boards, pass

| Board | Reached ten | Dead ends | Deadline violations | p95 time to ten | Verdict |
|---|---:|---:|---:|---:|---|
| 12x12 | 20 of 20 | 0 | 0 | 36.4 s | pass |
| 14x14 | 20 of 20 | 0 | 0 | 11.3 s | pass |
| 15x15b10 | 20 of 20 | 0 | 0 | 19.2 s | pass |
| 16x16 | 20 of 20 | 0 | 0 | 12.1 s | pass |
| 15x20 | 20 of 20 | 0 | 0 | 18.8 s | pass |

Source: `report-B gates.B1.detail.cells` (`reachedTen`, `deadEnds`, `deadlineViolations`, `p95Ms`). The frozen round
also had 20 of 20 on each board (plan §3).

### P2-B02: the ten controls, pass

The ratio is today's capped T10 over `gen-v4`'s, so above 1 `gen-v4` is faster. The gate needs at least 18 of 20
reaching ten and a lower bound of at least 0.9.

| Control | Stage | Reached ten (`gen-v4`) | Geometric mean | 90 % lower bound | Verdict |
|---|---|---:|---:|---:|---|
| 3x29 | A | 20 of 20 | 1.006 | 0.904 | pass |
| 22x22 | A | 20 of 20 | 1.113 | 1.009 | pass |
| 32x15 | A | 20 of 20 | 1.096 | 0.972 | pass |
| 10x10 | B | 20 of 20 | 1.538 | 1.335 | pass |
| 18x20 | B | 20 of 20 | 1.701 | 1.472 | pass |
| 20x20 | B | 20 of 20 | 2.148 | 1.771 | pass |
| 20x21 | B | 20 of 20 | 1.619 | 1.411 | pass |
| 24x24 | B | 20 of 20 | 1.246 | 1.129 | pass |
| 18x18 | B | 20 of 20 | completion only (the plan's tail clause) | | pass |
| 26x26 | B | 20 of 20 | 0.998 (timing reported, not gated) | 0.992 | pass: 20 of 20 puzzles identical to today's |

Sources:
- `report-A gates.A1.detail.cells` and `report-B gates.B2.detail.cells` (`reachedTen`, `noRegression.geoMean`,
  `noRegression.lower`);
- for 26x26, `identity.equal` 20.

Notes:
- No deadline violation on any control.
- **26x26 runs today's search on both arms** (D-P2-05), so its puzzles are today's and its ratio is about 1. The frozen
  phase-0 FAIL of 26x26 (lower bound 0.886, `stage4-report.md` §1.3) stays recorded (D-P2-01).
- **3x29 passes with the thinnest margin,** 0.004 above 0.9; the frozen round had 0.9473 (plan §8).

### P2-B03: Master identity, pass

- **All 16 Master cells are identical** across five reps each (20 to 24): `report-B gates.B3.detail.cells` has no
  `differences` and no `problems`.
- **10x10 Master rep 24** serves 4 puzzles on both arms (`rows/B.jsonl run.acceptedCount` 4, `run.partialReason`
  `layouts-not-found`), as today.

### P2-B04: the sentinels without a prior-table cell, pass (stage A)

| Cell | Gate | Reached ten (`gen-v4`) | Geometric mean | 90 % lower bound | Verdict |
|---|---|---:|---:|---:|---|
| 11x11 | B02 | 19 of 20 | 1.936 | 1.627 | pass |
| 18x19 | B02 | 20 of 20 | 1.295 | 0.991 | pass |
| 21x21 | B02 | 20 of 20 | 1.107 | 0.930 | pass |
| 15x15 | completion, at least 18 of 20 | 20 of 20 | | | pass |

- Source: `report-A gates.A2.detail.cells`.
- The three paired sentinels pass the declared 0.9 lower-bound gate. Their sample geometric means favour `gen-v4`; this
  does not establish a speed-up on every cell (`stage-a-readout.md` §4).

### P2-B05: (c5) for `n-mid`, pass (section 4)

### P2-B06: the population, reported (section 5)

### P2-B07: `require`, read on 49 of 50 rows (section 6)

### P2-B08: texts, old puzzles and the history, pass

- **The approved texts in English and Vietnamese:**
  - `no-window-texts` shows D-P2-16's `notice.N-NOSET.below` in English, then in Vietnamese;
  - `screen-capped-step` shows the step texts of a screen-capped rating in both languages, with no score.

  Both pass (`browser/<check>/receipt.json status`).
- **No shown puzzle leaves the history, and one action gives one terminal result:** `late-fence`,
  `fresh-after-pause`, `batch-prefix` and `set-bound` pass (section 13).
- **Old puzzles stay playable, with their steps refused by version:** this is covered by the unit tests of P2-08 and
  P2-15. The full suite passed 1,629 of 1,629 in 140.913 s at P2-18's pre-seal gate 1. The source is P2-18's committed
  execution log, a supplemental input (section 18).

## 4. (c5) for `n-mid` (P2-B05)

Source: `report-B gates.B4.detail`. The verdict is `admitted`, with no failing condition (`decidedBy` null).

| Condition | Measured | Rule | Result |
|---|---|---|---|
| Clue | 60 matched sets, median difference 0, `moved2` 0 | the clue tolerance | pass |
| Speed | geometric mean 2.3075, lower bound 2.1808; 14x14 2.632, 15x15b10 2.410, 16x16 1.937 | at least 1.15, lower bound above 1.0, no cell below 1.0 | pass |
| Work per accepted puzzle | screen [1.039, 2.265] G units against no screen [2.645, 4.285] | non-worsening on proved bounds (IG-P-Q37) | pass: the screen's upper bound is below the no-screen lower bound |
| Completion | 20 of 20 on each cell and arm | at most one request in 20 short | pass |

- **The work bounds** are `work.screen.loRatio` and `hiRatio`, and `work.noScreen.loRatio` and `hiRatio`. They come
  from 600 accepted puzzles per arm, with complete ledgers on 60 rows and 296 and 302 terminated calls.
- **`n-mid` keeps its screen** (`screen-v4-v1`). The frozen admission (×2.30, plan §3) holds on production code.

## 5. The population (P2-B06)

Reported, not gated. Each cell shows four measures, `gen-v4` first and the paired arm second:
- the median clue share;
- the median score position in the band;
- the census-estimate share of the scores;
- requests that reached ten.

Sources: `report-B gates.B5.detail.paired` (32 pairs) and `.populations` (71 populations). `B5` is `pass`: no evidence
problem. The frozen populations of the same cells are listed separately as historical in `.historical` (64 entries); on
rows equal to their oracle, they hold the same puzzles.

**`gen-v4` against today's search on the ten controls** (two-sided, contemporaneous):

| Control | Clue share | Score position | Census share | Reached ten |
|---|---|---|---|---|
| 3x29 | 0.167 / 0.158 | 0.50 / 0.54 | 0.915 / 0.920 | 20 / 20 |
| 10x10 | 0.211 / 0.167 | 0.54 / 0.63 | 0.900 / 0.970 | 20 / 20 |
| 18x18 | 0.192 / 0.167 | 0.50 / 0.50 | 0.370 / 0.486 | 20 / 18 |
| 18x20 | 0.185 / 0.160 | 0.54 / 0.50 | 0.480 / 0.505 | 20 / 19 |
| 20x20 | 0.192 / 0.179 | 0.54 / 0.50 | 0.410 / 0.530 | 20 / 20 |
| 20x21 | 0.185 / 0.172 | 0.50 / 0.54 | 0.500 / 0.633 | 20 / 19 |
| 32x15 | 0.148 / 0.143 | 0.50 / 0.50 | 0.635 / 0.630 | 20 / 20 |
| 22x22 | 0.148 / 0.143 | 0.50 / 0.50 | 0.685 / 0.715 | 20 / 20 |
| 24x24 | 0.161 / 0.143 | 0.54 / 0.54 | 0.770 / 0.845 | 20 / 20 |
| 26x26 | 0.152 / 0.152 | 0.54 / 0.54 | 0.910 / 0.910 | 20 / 20 (identical: today's search on both) |

- **Clue share.** `gen-v4`'s median is higher on 9 controls and equal on 26x26.
- **Score position.** It is equal on 5 controls, higher on 2 and lower on 3, at most 0.09 apart.
- **Census share.** It is lower on 8, higher on 32x15 and equal on 26x26.
- **Completion.** `gen-v4` reached ten on 20 of 20 everywhere. Today's search reached 18 of 20 on 18x18 and 19 of 20 on
  18x20 and 20x21.

**`n-mid` with the screen against without it:**

| Cell | Clue share | Score position | Census share | Reached ten |
|---|---|---|---|---|
| 14x14 | 0.286 / 0.261 | 0.46 / 0.50 | 0.150 / 0.250 | 20 / 20 |
| 15x15b10 | 0.273 / 0.261 | 0.50 / 0.50 | 0.125 / 0.240 | 20 / 20 |
| 16x16 | 0.217 / 0.217 | 0.50 / 0.50 | 0.210 / 0.295 | 20 / 20 |

**The sentinels, `gen-v4` against today's search:**

| Cell | Clue share | Score position | Census share | Reached ten |
|---|---|---|---|---|
| 11x11 | 0.263 / 0.200 | 0.46 / 0.58 | 0.492 / 0.872 | 19 / 17 |
| 18x19 | 0.200 / 0.160 | 0.50 / 0.54 | 0.280 / 0.397 | 20 / 19 |
| 21x21 | 0.207 / 0.167 | 0.50 / 0.50 | 0.470 / 0.645 | 20 / 20 |

**Master: identical on 16 of 16 cells,** as P2-B03 requires.

**Cells without a paired arm in this round,** labelled alone; no fresh today's arm is implied:

| Cell, `gen-v4` | Clue share | Score position | Census share | Reached ten |
|---|---|---|---|---|
| 12x12 Nightmare | 0.250 | 0.50 | 0.565 | 20 of 20 |
| 15x20 Nightmare | 0.231 | 0.50 | 0.270 | 20 of 20 |
| 15x15 Nightmare (sentinel) | 0.273 | 0.46 | 0.140 | 20 of 20 |
| 14x14 Hell 1 | 0.400 | 0.37 | 0.725 | 10 of 20 (142 puzzles) |
| 20x20 Hell 1 | 0.357 | 0.43 | 0.595 | 20 of 20 |
| 24x24 Hell 1 | 0.238 | 0.46 | 0.855 | 20 of 20 |
| 26x26 Hell 1 | 0.205 | 0.49 | 0.955 | 20 of 20 |

## 6. `require` (P2-B07, N-V4-15)

Read in `stage-a-readout.md` §5 and accepted by both SAs. Gate A3 is `incomplete` only because the host restart cut
`require/uncapped/32x15-hell-1/2`. The owner continued (Q-P2-A3 (a), Discord message 1575441672895070261).

| Arm | Requests | Reached ten | Puzzles | Requests with none | Median response | Stops |
|---|---:|---:|---:|---:|---:|---|
| `gen-v4` | 20 | 1 | 15 | 14 | 46.0 s | `set:reserve-cut` 14, `time-limit` 5 (one puzzle each) |
| today | 10 | 0 | 13 | 4 | 154.3 s | `set:time-limit` 4, `time-limit` 6 |
| uncapped | 19 | 2 | 43 | 5 | 149.1 s | `set:time-limit` 5, `time-limit` 12 |

Source: `rows/A.jsonl` (`component` `require`: `run.acceptedCount`, `run.partialReason`, `run.responseMs`) and
`report-A gates.A3.detail.cells`.

- **Cells.** 22x22 and 32x15, Nightmare and Hell 1, five reps each. Today's arm has the two Nightmare cells only.
- **Budget stops:** none in any of the 49 rows. No bound firing and no no-window end.
- **Uniqueness.** By construction `require` returns only a finished unique final (P2-T04). The bench's certificates
  were not run on these rows (`run.certificates.notChecked` 71 of 71 accepted puzzles), so the rows are not an
  independent certification of uniqueness.
- **The clock.** Every shortfall is a clock stop. `gen-v4`'s 14 empty requests ended at the 46-s set cut of automatic
  CLI and bench requests (D-P2-08). The browser Generator does not use that cut; its `require` performance is not
  measured here.
- **On the two Nightmare cells,** `gen-v4` and today's search each delivered 13 puzzles over 10 requests.
- **No frozen-value change is proposed.** The finding goes to phase 3 (section 16).

## 7. Hell 1 (reported against 18 of 20, never gated)

| Board | Requests (valid) | Reached ten | Candidate | Uncapped twins that reached ten |
|---|---|---:|---|---:|
| 14x14 Hell 1 | 20 (20) | 10 | no | 3 of its 10 twins (reps 26, 31, 38) |
| 20x20 Hell 1 | 20 (20) | 20 | yes | no twin required |
| 24x24 Hell 1 | 20 (20) | 20 | yes | no twin required |
| 26x26 Hell 1 | 20 (20) | 20 | yes | no twin required |

- Source: `report-B gates.B6.detail.cells`; the twins are from `rows/B.jsonl run.acceptedCount`.
- The frozen round had the same completion: 14x14 Hell 1 10 of 20, the others 20 of 20. That is in
  `docs/improve-generating-stages-2-4/stage4-report.md` §1.4, the readings file that `report-B gates.B8` binds by its
  SHA-256 (`detail.readings.sha256`).
- The Generator does not offer Hell 1, and the offers stay with phase 3 (D-P2-01).

## 8. P5, the conditional comparator (§7.5's categories)

**The activation** (`twins/activation.json`):
- 440 eligible rows, of which 12 needed a twin.
- **Ten were fixed:** 14x14 Hell 1 reps 21, 26, 27, 30, 31, 33, 34, 36, 37 and 38, each with fewer than ten puzzles and
  a clock cut.
- **Two went through open slots:**
  - `non-table/gen-v4/11x11-nightmare/22`: fewer than ten, and a clock cut;
  - `non-table/gen-v4/21x21-nightmare/37`: one batch-call budget stop.
- Three slots inactive, no overflow.

**Coverage** (`report-B gates.B8.detail`, status `pass`):

| Category or endpoint | Count |
|---|---:|
| Observed pairs | 12 |
| Analytic-only | 428 |
| Unresolved | 0 |
| Required twins missing | 0 |
| Lost completions: from observed pairs | 3 |
| Lost completions: analytical zeros | 428 |
| False stops: from observed pairs | 0 |
| False stops: analytical zeros | 428 |

**The three lost completions:**

| Bounded row | Bounded result | Its twin |
|---|---|---|
| `shipped/gen-v4/14x14-hell-1/26` | 7 puzzles, `time-limit` at 115.1 s | tenth puzzle ready at 127.292 s |
| `shipped/gen-v4/14x14-hell-1/31` | 5 puzzles, `time-limit` at 115.1 s | tenth puzzle ready at 156.910 s |
| `shipped/gen-v4/14x14-hell-1/38` | 9 puzzles, `time-limit` at 115.2 s | tenth puzzle ready at 116.923 s |

Source: `rows/B.jsonl` (`run.acceptedCount`, `run.partialReason`, `run.responseMs`, `run.tenthReadyMs`, `telemetry`).
- Three observed deadline-cut losses: no recorded budget stop or bound firing; twin tenth-ready times were 127.292,
  156.910 and 116.923 seconds (`run.tenthReadyMs`).
- **The frozen round had two,** reps 26 and 38, also deadline cuts (`stage4-report.md` §1.4). Rep 31's twin went
  further this time: it matches its frozen counterpart on the first 8 puzzles.
- **No false stop was observed;** the bound never fired (section 9).
- **Analytical zeros** are not observed pairs, and they do not prove that P5 did no work (plan §7.5).

## 9. N-V4-16's glue (F2)

Source: `report-B readings.glue`, 92 entries (component, arm and cell).

| Status | Entries | What they hold |
|---|---:|---|
| `unexercised` | 60 | every `gen-v4`, uncapped and no-screen cell with complete raw evidence: 0 raw first-four matches, 0 client same-side, 0 firings, 0 public no-window ends, no transport or reconcile entry |
| `not-applicable` | 31 | today's search, which has no trail |
| `unknown` | 1 | `shipped-master/gen-v4/10x10-master`: rep 24's journal is incomplete (section 15) |

- The bound and its glue were not exercised in production, as in stages 2 and 4. Zero reach is "unexercised", not
  evidence that the glue works.

## 10. Reach (F4 and F7)

Source: `report-B readings.reach`, 92 entries.

- **F4, call budget stops:**
  - 1, on `non-table/gen-v4/21x21-nightmare` rep 37: a batch call, and the request still reached ten in 34.0 s;
  - "0 (unexercised)" on every other `gen-v4` cell with complete evidence;
  - "n/a" on today's search.
- **F7, re-rating starts** (close, rescue, rerate) **and rescue and tail re-ratings:** "0 (unexercised)" on every
  `gen-v4` cell with complete evidence. 10x10 Master's re-rating starts are "unknown" because of rep 24's journal.
- **F7, screen-capped profiles: 2,430,** all on the screened cells:
  - 14x14 Nightmare: 572;
  - 15x15b10 Nightmare: 877;
  - 16x16 Nightmare: 447;
  - the 15x15 sentinel: 519;
  - the 14x14 smoke row: 15.

## 11. Replay margins (P2-T11), pass

Source: `replay-probes/receipt.json` and `report-A gates.A4`.
- **All 8 items were measured,** in one invocation of 654.144 node seconds: 4 under `any` and 4 under `require`.
- **All 28 replayed puzzles matched,** and every margin is `ok`.

The largest values against the limits:

| Measure | Largest | Limit | Share |
|---|---:|---:|---:|
| Steps | 185 (32x15 Nightmare, `require`) | 4,096 | 4.5 % |
| Bytes | 1,118,651 (32x15 Nightmare, `require`) | 4,194,304 | 26.7 % |
| Work units | 35,723,499,801 (32x15 Hell 1, `require`) | 215,040,000,000 | 16.6 % |

## 12. Memory (P2-T12), pass

| Stage | Rows | Largest process peak | Largest accounted peak | `model-too-large` |
|---|---:|---|---|---:|
| A | 317 | 505 MiB (`require/uncapped/32x15-nightmare/1`) | 220 MiB (`smoke/gen-v4/26x26-nightmare/20`) | 0 |
| B | 692 | 527 MiB (`shipped/gen-v4/26x26-nightmare/21`) | 229 MiB (`shipped/gen-v4/26x26-nightmare/34`) | 0 |

- Limits: 1,536 MiB (process) and 1,196 MiB (accounted).
- Sources: `report-A gates.A6`, `report-B gates.B7` and `rows/<S>.jsonl run.peakProcessBytes` and
  `run.peakAccountedBytes`.

## 13. Browser checks (P2-T13's browser part), pass

| Check | Status | The page's reading | Receipt duration | `cleanup` |
|---|---|---:|---:|---|
| `set-bound` | pass | 6.4 s | 7.774 s | null |
| `batch-prefix` | pass | 6.4 s | 7.822 s | null |
| `late-fence` | pass | 8.4 s | 9.775 s | null |
| `fresh-after-pause` | pass | 9.3 s | 10.893 s | null |
| `no-window-texts` | pass | 0.2 s | 1.659 s | null |
| `screen-capped-step` | pass | 0.1 s | 1.626 s | null |

- Source: `browser/<check>/receipt.json` (`status`, `consoleLines` `CHECK-END PASS`, `durationMs`, `cleanup`) and
  `report-A gates.A5`.
- Every check is far within one minute, and each binds 51 sealed source files.
- P2-T13's other parts were met at P2-18's pre-seal gates: the full suite in 140.913 s, `npm run check`, and the file
  formats (P2-18's committed execution log, a supplemental input).

## 14. The ledger account

| Stage | Authorized | Spent | Remaining | Lines | Priced (counted / guard) |
|---|---:|---:|---:|---:|---|
| A | 410 min (24,600 s) | 15,148.081 s (252.468 min) | 9,451.919 s (157.532 min) | 38 | 330.656 / 409.195 min |
| B | 402 min (24,120 s) | 16,107.131 s (268.452 min) | 8,012.869 s (133.548 min) | 28 | 321.258 / 401.572 min |
| **Total** | **812 min** | **31,255.212 s (520.920 min)** | **17,464.788 s (291.080 min)** | **66** | 651.913 / 810.767 min |

Source: `ledger/ledger.jsonl` (`stage`, `countedSeconds`), as `p2.mjs ledger --status` prints it.

- **Stage A:**
  - 4 proof bundles, 1,091.355 s;
  - 27 row calls, 13,042.979 s, including the host-restart line `A-9.13` (283.273 s, `cause: 'exit'`, `killed: true`,
    `exit: -1`);
  - the replay probes, 699.144 s;
  - the six browser checks, 314.603 s.
- **Stage B:** one call per group (26), and two re-calls after `B-1.39` and `B-4.43` ended with deferred keys (exit 7).
  No kill, no overflow group.
- **The caps held.** Nothing was borrowed between stages. The 291.080 minutes left are not carried over (D-P2-15).

## 15. Deviations

1. **The host restart (INC-P2-19-RESTART).** Windows Update restarted the host during `A-9.13`. The call was charged
   283.273 s under check-list §3.5's rule, and `require/uncapped/32x15-hell-1/2` became `interrupted` (`no-report`).
   A3 is incomplete by this row, and the owner continued (Q-P2-A3 (a)).
2. **One equality row without evidence:** `shipped/gen-v4/14x14-hell-1/33` (section 2).
3. **A trace gap on 10x10 Master rep 24,** on both arms. `rows/B.jsonl ledger.complete` is false, with "missing worker
   journal" for three worker threads (`21028/7` to `/9` on `gen-v4`, `12608/7` to `/9` on today), on the
   `layouts-not-found` path. The puzzles are identical (P2-B03). Only that cell's glue and reach readings are
   "unknown".
4. **P5 lost completions: three, against the frozen round's two.** Rep 31 was added; all three are deadline cuts
   (section 8).
5. **N-P2-15-K8.** On 15x20 Nightmare, seed `t18-big-a`, K = 24, the calibration has 5 clues and score 69 under
   `gen-v4`, and had 3 clues and score 70 under `gen-v3`; still in band. One seed, not population evidence (check-list
   §5).
6. **The sentinels' machine time** was 1.21 (`gen-v4`) and 1.23 (today) times their neighbour-proxy prices, and 2.1 to
   2.6 times on 11x11, within the cap (`stage-a-readout.md` §4). Stage B's rows on measured cells ran under price, and B
   needed two extra calls.

## 16. Named items for later

| Item | State | Routing |
|---|---|---|
| Equality evidence for 14x14 Hell 1 rep 33 | none: the 46-s set cut left no puzzle, as in the frozen round | the owner's acceptance of the limitation (Q-P2-V1); further measurement needs a separate ruling, plan/epoch and repricing |
| Automatic `require` on large boards | clock-bound in every arm; `gen-v4`'s CLI and bench requests end empty at the 46-s set cut in 14 of 20 | phase 3, which uses this round's `require` diagnostics (plan §10), or a separate proposal if the owner wants it sooner |
| F2, F7 | the bound never fired and no re-rating started: "unexercised" | stays reported per cell; zero is never a pass |
| 3x29 control margin | lower bound 0.904 against 0.9 | a later validation watches it |
| 10x10 Master trace gap | three worker journals missing on rep 24 | Investigate the trace tooling; measured Master identity still passes. |
| N-V4-14 | no screen on `n-upper` and `n-large` | a later proposal and validation |
| N-V4-04 | reps 40-59 reserved | a later refit's second validation |
| Phase 3 (N-V4-08, N-V4-09) | Hell 1 offers (14x14 Hell 1 10 of 20; 20x20, 24x24 and 26x26 candidates), real-device browser runs, D39, the blind play comparison | phase 3 |
| BQ-1, BQ-3 | device limits 484 and 360 | their qualifications |
| CLI boards of 577 to 675 cells | run `gen-v4` without a measurement of their own | stated in PR #14 |
| D-P2-16 rewording, N-P2-09-CELL | the approved texts; the `replay.table.unrateable` cell | the owner's text pass |

## 17. Owner decisions needed

### Q-P2-V1: Accept the incomplete qualification and ship `gen-v4`?

- **Addressee:** owner. Raised by SA-Opus and SA-Astra in the validation report, 2026-11-26.
- **Decision needed:** whether you accept that the phase-2 qualification is incomplete by one row, and whether PR #14
  (`gen-v4` in production) may then be merged into `main`. Nothing is merged until you say so (D-P2-02).
- **The verdict:** `Phase 2: INCOMPLETE (P2-B01 to P2-B03, P2-B05 and P2-B06: pass; P2-T01: incomplete—one eligible row without equality evidence; P2-B04: pass; P2-B07: read on 49 of 50 rows, owner continuation recorded)`

**Context.**
- **What passes on production code:**
  - the five formerly failing Nightmare boards reach ten 20 of 20;
  - the ten controls pass; 3x29 has the thinnest margin, 0.904 against 0.9;
  - Master returns today's puzzles;
  - `n-mid` keeps its screen, 2.31 times faster;
  - the boards without a prior-table cell pass.
- **What is incomplete.** The plan requires every eligible measured row to equal its frozen reference. One row, 14x14
  Hell 1 rep 33, ended at the 46-s set cut with no puzzle, as in the frozen round, so it gives no equality evidence. No
  port difference was observed on any of the 818 rows. Measuring that row further would need a separate ruling,
  plan/epoch and repricing.
- **Readings to know:**
  - `require` on large boards rarely reaches ten in any version. Its automatic CLI requests often end empty at 46 s,
    and the browser Generator does not use that cut.
  - The bound never fired.
  - Three 14x14 Hell 1 requests lost completion to the 115-s stop; the Generator does not offer Hell 1.
- **What stays:** CLI boards of 577 to 675 cells are unmeasured, and Hell 1 offers belong to phase 3.
- **PR #11 is merged** (`626918c` on `main`). On your instruction of 2026-11-26 21:17, PR #14 is rebased onto `main`,
  without merging, so it carries only phase 2's commits.

**Options.**

| Option | What it means | Consequences |
|---|---|---|
| (a) Accept the limitation; merge PR #14 | `gen-v4` ships on its route; PR #14's text states the INCOMPLETE verdict and the limits above | users get the new search on Nightmare boards except 26x26; the site's workflow runs on `main`; the verdict stays INCOMPLETE |
| (b) Accept the limitation; keep PR #14 a draft | PR #14 is published with the verdict; nothing ships, for example until phase 3 or a `require` follow-up | `gen-v4` stays unshipped; the measured result stays valid while the sealed source is unchanged |
| (c) Do not accept | PR #14 stays a draft | nothing ships; qualifying `gen-v4` needs a separate ruling, plan/epoch and repricing |

**The SAs' recommendation:** (a), conditional on your explicit acceptance of these limitations.

**Meanwhile:** P2-22 waits for the owner's decision on the incomplete qualification. Acceptance of that limitation does
not turn missing evidence into a pass.

**How to answer:** reply `Q-P2-V1: a`, `Q-P2-V1: b` or `Q-P2-V1: c`, with any comment.

## 18. Inputs

The SHA-256 of each input, as read from the main worktree at HEAD `4d7be71`. That hash is from before the rebase onto
`main` (D-P2-18); the rebased branch has the identical tree.
- **Snapshots:** the value is the `.jsonl` file's hash, equal to its `.sha256` file.
- **The seal's `commit`, `fa0bda2`,** names the sealed commit before the rebase. `E/rebase/rebase-map.json` maps it,
  and every other rewritten commit, to its rebased counterpart with the identical tree.
- **The last two rows:**
  - the supplemental input (R21-03): P2-18's committed execution log, read solely for its pre-seal verification
    results;
  - the transitive input that `report-B gates.B8.detail.readings` binds; it is hashed after LF normalization, as B8
    binds it.

| Input | SHA-256 |
|---|---|
| `E/rows-smoke/A.jsonl` | `5cfd937b5e9f3a92af1b51b13c5f2939c1219a4c1dea16c2b49bab1d018f6999` |
| `E/rows/A.jsonl` | `a08095673b4bbc36ff718d3b60976bef34e701590062e9e0cbfa6f26d2e47a98` |
| `E/rows-before-twins/B.jsonl` | `590b54ee4c0f98a2caa695092a4e3fac7c78b13ded76c91790d831bc86efdcf6` |
| `E/rows/B.jsonl` | `0fefb8b3695f515709652d14197ccd3ad4bef724eb29a348210fa85e3cdd2ceb` |
| `E/twins/activation.json` | `f67e4d7674735b97a9af57086a1b00add2d5271e01e02ec8987b3b23cb43f536` |
| `E/seal/seal.json` | `bca8cfd2db491e686fb37f5ed2bf640e4eac3c93513c005f775f971bf4979f5b` |
| `E/report-smoke/report.json` | `696c349773e714fa0509421a2141ced60b4cf106a854ae13c3af151688323b70` |
| `E/report-A/report.json` | `1d850b12a9a03ed61f40d3c84fce88edda01b84c96d52785b8ff11ba965e3cd2` |
| `E/report-B/report.json` | `6dc4758059da186ea35045d31a84cf2a9f8189659df008075880025448668855` |
| `E/proofs/observer/result.json` | `848943a22d530e7538ba9948ab6c0f3f24b375bb49725d6d84566287a79dcdea` |
| `E/proofs/certificate/result.json` | `b767cb4d519026615056798af117fe3792f403e9d13b635052af45043f06cca3` |
| `E/proofs/prior-replay/result.json` | `f5c807d11f21545b96d2a4c8bbdf43e059264ef3d876f2eba42bc010d9b87d59` |
| `E/proofs/legacy/result.json` | `058d695c535a7f240d61adcb1755e70aefa53b61d9f98c2f23473c48ee246053` |
| `E/replay-probes/receipt.json` | `c8454abec3961758c41c610770977757dcec117bc952c09dd009cd22ced133e7` |
| `E/browser/set-bound/receipt.json` | `64138fe92719f7c33dfd45df276aff3c758ccacec4e09b9bbfd4f386849a519d` |
| `E/browser/batch-prefix/receipt.json` | `49db659d12cd91d8600b6f32a4ccbb5969fe6c5151092f7927873083ba415156` |
| `E/browser/late-fence/receipt.json` | `45e03bae0125a1593264b54ac02af6eed1585bbd7d49b0dac04db5d03f6d92b5` |
| `E/browser/fresh-after-pause/receipt.json` | `180d1f58d3a61e4df2e038e35f227c93826695fd10343ebad8286780abbb9de1` |
| `E/browser/no-window-texts/receipt.json` | `4cbe0121b4d65ca9f211923c76d6f7f95be40dcc584090d05e3ca4a1c47f213b` |
| `E/browser/screen-capped-step/receipt.json` | `542373e774a70ba61ce877636be8bc4db779c58ccc3f1f6c1c3080bf2e59ee7b` |
| `E/ledger/ledger.jsonl` | `bdb5b06de934d00cbcd6fc7825f5a2de14453192ef618382026b2985ec60b3c5` |
| `stage-a-readout.md` | `34d7038fb35756df2e6cb76e166f2b96f718b6828c298a9a2e99b47ee0baf9e0` |
| `tasks/improve-generating-phase-2/P2-18-seal-proofs-smoke.md` (supplemental: its execution log) | `10fa26b10307a12a4e4f1c3f119c3bcb9df6a44de961fc191b31f8740159d6e6` |
| `docs/improve-generating-stages-2-4/stage4-report.md` (transitive, via B8; LF-normalized) | `2e7b716c7b23faf730f2512e9a74cc0af36de76f0e1a505cfad137413843930a` |

## 19. Sign-off

- SA-Opus (drafter): accept, 2026-11-26.
- SA-Astra (reviewer): accept, 2026-11-26.
