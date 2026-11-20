# Calibration record of difficulty-v3: search evidence, the Hell report and the lock of the tuple (MP12b2, 2026-11-15)

Record of MP12b2 (gate GS-P3), which also collects the calibration of MP12a (slice) and MP12b1 (full landscape) by
reference with their numbers. English, written once. Every number comes from a published report or a capture named in
the text; the run logs are `docs/difficulty-v3/search-2026-11-15/runs.md` and, as scratch, `tests/artifacts/MP12b2/`
(not tracked). No file of `core/`, `tools/`, `tests/` or the fixtures was changed by this task, and no change round was
ordered (section 11). A `†` marks a time of MP12b1 that is not slot-protected (section 13, item 1); the times of this
task's own captures carry no mark.

## 1. Header

| Item | Value |
|---|---|
| Date and machine | 2026-11-15 (+07:00), from 10:30; AMD EPYC 7763 64-Core Processor, 16 logical cores, 64 GiB; Windows, Node v26.13.0 |
| Code revision | `cd5d17f` on `rating-v3` (HEAD), working tree clean at the start and at the end apart from the files of this task. The landscape reports of MP12b1 name three `sourceCommit` values (`a1b9354`: 9 reports; `f33aa71` with uncommitted changes: the 18 slice reports; `917052a`: 78 reports) and carry one source digest |
| Source identity (all populations) | `sourceDigest` `34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918`; versions `algo` `gen-v3`, `policy` `mixed-v2`, `rng` `xoshiro128ss-v1`, `model` `difficulty-v3` (the reports add `app` 1.0.0). It is the digest of MP12b1's aggregate (`source`), of the 18 GV2 reports behind section 4 (`Assert-CriteriaSource` on `docs/difficulty-v3/landscape-v3/r2`, passed) and of every block of this task: `runs.md` has an identity row before and after each of R + A, H, HL, N and the availability probe (and one at the start and one for the locked tree, section 12), every one equal to it, `core/` and `tools/` clean |
| `SCORE_V3` | `{ model: 'difficulty-v3', base: { max: 12, scale: 3 }, rule: [0, 0, 2, 3], weights: { G: 5, info: 0.5 }, penalty: { few: 1, many: 2 } }` |
| `DEDUCE` | `{ lookaheadWidth: 4, nodes: 30000, solutions: 8, work: 760000000, census: 80000000, memoryBytes: 33554432 }` |
| `K60`, `SHARES`, `POLICY_ID`, `STALL_LIMIT` | `[6, 7.5, 8.5, 10, 11.5, 13, 16, 24, 32, 43, 58, 78]`, `[0.62, 0.54, 0.46, 0.38, 0.3, 0.22, 0.14, 0.1, 0.06, 0.04, 0.04]`, `'mixed-v2'` (MP12b3 bumps it to `mixed-v3`, check-list D39), 12 (`core/engine/clues.js`) |
| Commands | the observer and its drivers as written in the task: `node --import ./docs/difficulty-v3/search-2026-11-15/observe.mjs ./docs/difficulty-v3/d21-2026-11-12/flow.mjs ...` (R, A, H) and `.../search-2026-11-15/flow-case.mjs --case <id> --rep <n> ...` (HL, N), one process per capture through `Invoke-Dv3Timed` (at most 570 s); `.../d21-v3-2026-11-12/avail.mjs` under `spent.mjs` (the availability probe); `summary.mjs` and `failfast.mjs`; then under the helper `node tools/record-fixtures.mjs --check`, the final `npm test` and the quick set (section 12) |
| Machine time of this task | the table below this one: command time of every invocation, with the lock waits apart |
| Machine time of MP12a and MP12b1 | MP12a (`calibration-slice-2026-11-13.md`): about 1.6 hours of command time (rounds 0, 1 and 2: 1,519 s, 1,690.9 s and 1,809.5 s; the gates and the close about 15 minutes) and 1,321.4 s of logged lock wait. MP12b1 (`landscape-v3-full/shards-2026-11-14.md`): 229 launcher invocations, 38,022 s (10.56 h) under the lock, 4,132 s of lock wait (longest 330.8 s) |
| MP09d2's observations | cannot be reused as final-tuple evidence: `git --no-pager diff --stat eea5fed -- core/engine` prints `core/engine/policy.js \| 13 ++++++++-----` (MP12a changed `SCORE_V3` and `DEDUCE.census` after `eea5fed`). The availability probe ran again under the final tuple (section 9); MP09d2's results (`d21-v3-2026-11-12.md` sections 2, 4 and 6) stay as history, side by side, never pooled |
| MP12b1 measurement-slot exception (MS05b3, 2026-11-14 03:09 to 06:12) | the Sudoku repository ran generation commands without the shared lock: 112 windows, 351.3 s of single-thread work, in 22 cases of MP12b1; the times of those cases carry `†`. Section 13, item 1, has the table, the assessment and the conclusion: MP12b1's evidence stands |
| Lock helper | `Invoke-Dv3Timed` of check-list section 7, saved as `tests/artifacts/MP12b2/dv3-lock.ps1` (byte-identical to MP12b1's copy and to the check-list block); every capture and every command of section 12 went through it, one per acquisition of the lock, with its 15 s gap; the Sudoku repository ran MS07e (its first full qualification) under its own lock during the whole task |
| Pause | by owner order (improve-generating priority) from 12:18:51 to 12:59:49 on 2026-11-15, between the first and the second capture of N; the driver was waiting for a slot with no lock held and was stopped by its process id, no capture was interrupted, and the identity rows before and after N are equal (`runs.md` has the `PAUSED` and `RESUMED` rows) |

Invocations of this task (from `runs.md`; a lock wait is measured apart from the command's time):

| Block | Invocations | Command time (s) | Stopped at their limit | Lock wait (s, total) | Longest wait (s) |
|---|---|---|---|---|---|
| require | 8 | 291.4 | 0 | 0.0 | 0.0 |
| any | 12 | 38.8 | 0 | 210.3 | 115.1 |
| hell | 5 | 1501.6 | 5 | 255.4 | 245.4 |
| hell-landscape | 3 | 1706.3 | 2 | 915.8 | 350.4 |
| nightmare | 5 | 858.2 | 0 | 1166.6 | 345.5 |
| avail | 6 | 1007.5 | 0 | 605.7 | 115.2 |
| lock steps | 3 | 148.0 | 0 | 0.0 | 0.0 |
| **Total** | 42 | 5551.8 (1.54 h) | 7 | 3153.8 | 350.4 |


## 2. Coverage

The coverage table of the aggregate in force is MP12b1's (`docs/difficulty-v3/landscape-v3-full/aggregate-2026-11-14.md`,
section "Protocol coverage (owner decision P-OD9)", `aggregate-2026-11-14.json`, field `coverage`); no change round ran,
so it stays the aggregate of this record. Totals of that table:

- 105 cases on 16 boards: 80 cases that are not Hell (62 run by MP12b1 with 20 requests, 18 GV2 cases reused from
  MP12a's round 2 by equal source identity) and 25 Hell cases; 1,726 timed runs and 23,693 diagnostic profile samples.
- The Hell run plan of owner decision P-OD9: the 25 Hell prescreens (3 requests each) ran first; the three cases whose
  prescreen made a puzzle (`14x14-hell-1`: 1 puzzle, `24x24-hell-1`: 2, `26x26-hell-1`: 25) ran 20 requests each; the
  other 22 Hell cases stay at their 3 requests, status `reduced (P-OD9)`, labelled "no puzzle observed in 3 requests",
  not offered by check-list D39 and needing no further evidence. 83 of 105 cases are `measured`.
- MP12b1's outcome line reads "blocked": it is the tools' verdict on the criteria of the earlier calibration, which
  count a reduced case's 3 requests against 20 (MP12b1's own note); section 3 and section 9 are this task's reading.

The Hell companion HL (cross-review TP23, with the PR-P2 amendment): one capture for each Hell case outside H whose
prescreen made a puzzle, from `hell-landscape/manifest.json` (rep by the rule of the task: the lowest rep of the
selected report that accepted 10 puzzles, else the lowest that accepted any):

| Case | Rep | Rule | Landscape run: accepted / `K` / reason | Limit (s) | Capture | Outcome | Accepted in the capture |
|---|---|---|---|---|---|---|---|
| 14x14-hell-1 | 2 | some-puzzle | 1 / 35 / time-limit | 570 | `docs/difficulty-v3/search-2026-11-15/hell-landscape/hl-14x14-hell-1.jsonl` | stopped at the 570 s limit (reduced) | 2* (stopped at the limit) |
| 24x24-hell-1 | 2 | some-puzzle | 2 / 40 / time-limit | 570 | `docs/difficulty-v3/search-2026-11-15/hell-landscape/hl-24x24-hell-1.jsonl` | stopped at the 570 s limit (reduced) | 2* (stopped at the limit) |
| 26x26-hell-1 | 1 | complete | 10 / 39 / none | 570 | `docs/difficulty-v3/search-2026-11-15/hell-landscape/hl-26x26-hell-1.jsonl` | exit 0 | 10 (complete) |

`*` marks a capture stopped at its limit: the accepted puzzles are those known at the stop (the calibration's puzzle
counts, `AcceptedOf`).


## 3. Per board and level (the aggregate in force)

One row for each of the 105 cases, from `aggregate-2026-11-14.json` (`aggregate.cells`, `coverage`) and the selected
report of each case (`coverage[].report`). "Request completion rate" is MP12a's `requestCompletionRate`, MP11's
`requestInBandRate` (requests that completed ten in-band puzzles over the recorded requests, in brackets); "Yield" is the
accepted puzzles over ten per recorded request; "T10" is the time of the runs that completed ten (`unavailable` when
none did) and "Max T10" the largest response time of any run; "Peak process" is the largest `peakProcessBytes` of the
case's generation runs; "Tier" is `deductionTier:count`; "Solutions" counts `unique / few / many / unknown` among the
accepted puzzles; "Census estimates" are the accepted puzzles whose census did not finish (`censored`); "`provedZero`"
counts accepted Hard-or-above puzzles with `Gproved` 0 (must be 0, RES-35); "Unrateable samples" are the diagnostic
profile samples that could not be rated (`rating-incomplete`; reported, never gated, TP21, with their own denominator,
never accepted puzzles); "Not ten puzzles" gives, for the requests that accepted fewer than ten, the `partialReason`.
`unavailable` is a value the aggregate does not have (a reduced Hell case has no completed request and no v3 data).

`†` marks a time that is not slot-protected: Sudoku work without the lock overlapped this case (section 13, item 1).
The numbers are those measured; none was adjusted.

| Case | Area | Request completion rate (requests) | Yield | T10 median / p95 (s) | Max T10 (s) | Peak process (MiB) | v3 score median / p95 | G median (range) | info median (bits) | Cmax median (max) | Tier | Solutions u / few / many / ? | Census estimates | `provedZero` | Unrateable samples | Not ten puzzles (reasons) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6x10-very-easy | 60 | 65.0 % (20) | 93.5 % | 0.3 / 0.4 | 0.7 | 201 | 6 / 6 | 0 (0-0) | 0 | 0 (0) | 1:187 | 183 / 0 / 4 / 0 | 0 of 187 (0.0 %) | 0 | 0 | layouts-not-found x7 |
| 6x10-easy | 60 | 85.0 % (20) | 97.0 % | 0.3 / 0.4 | 0.7 | 199 | 10 / 11 | 0 (0-0) | 0 | 0 (0) | 1:43 2:84 3:67 | 96 / 98 / 0 / 0 | 0 of 194 (0.0 %) | 0 | 0 | layouts-not-found x3 |
| 6x10-normal | 60 | 95.0 % (20) | 99.0 % | 0.6 / 1.2 | 1.2 | 238 | 14 / 16 | 1 (0-1) | 1.3 | 9 (18) | 1:75 2:79 3:44 | 31 / 136 / 31 / 0 | 0 of 198 (0.0 %) | 0 | 0 | layouts-not-found x1 |
| 6x10-hard | 60 | 100.0 % (20) | 100.0 % | 0.8 / 2.6 | 2.9 | 207 | 19 / 23 | 1 (1-2) | 2 | 5 (20) | 2:22 3:178 | 126 / 54 / 20 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 6x10-expert | 60 | 100.0 % (20) | 100.0 % | 0.9 / 1.3 | 1.7 | 177 | 31 / 33 | 3 (3-4) | 5.1 | 7 (32) | 3:200 | 48 / 78 / 74 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 6x10-master | 60 | 100.0 % (20) | 100.0 % | 1.2 / 1.7 | 1.8 | 183 | 43 / 49 | 5 (5-6) | 9.4 | 12 (35) | 3:200 | 5 / 34 / 161 / 0 | 4 of 200 (2.0 %) | 0 | 0 | 0 |
| 3x29-very-easy | 87 | 90.0 % (20) | 98.0 % | 0.4 / 0.5 | 0.7 | 218 | 6 / 6 | 0 (0-0) | 0 | 0 (0) | 1:196 | 196 / 0 / 0 / 0 | 0 of 196 (0.0 %) | 0 | 0 | layouts-not-found x2 |
| 3x29-easy | 87 | 100.0 % (20) | 100.0 % | 0.3 / 0.4 | 0.4 | 218 | 10 / 11 | 0 (0-0) | 0 | 0 (0) | 1:86 2:46 3:68 | 110 / 79 / 11 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 3x29-normal | 87 | 100.0 % (20) | 100.0 % | 0.7 / 1.3 | 1.5 | 242 | 15 / 16 | 1 (0-1) | 0.8 | 8 (18) | 1:49 2:45 3:106 | 1 / 99 / 100 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 3x29-hard | 87 | 100.0 % (20) | 100.0 % | 0.5 / 0.8 | 1.0 | 216 | 22 / 23 | 2 (1-2) | 2 | 8 (30) | 1:5 2:18 3:177 | 18 / 68 / 114 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 3x29-expert | 87 | 100.0 % (20) | 100.0 % | 0.7 / 1.5 | 1.6 | 216 | 30 / 33 | 3 (3-4) | 4.6 | 8 (25) | 2:4 3:196 | 16 / 89 / 95 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 3x29-master | 87 | 100.0 % (20) | 100.0 % | 2.0 / 4.2 | 14.8 | 179 | 44 / 49 | 5 (5-6) | 9.8 | 11 (27) | 3:200 | 7 / 52 / 141 / 0 | 5 of 200 (2.5 %) | 0 | 9 | 0 |
| 3x29-nightmare | 87 | 100.0 % (20) | 100.0 % | 5.3 / 7.6 | 9.8 | 187 | 66 / 71 | 9 (8-10) | 18.6 | 16 (43) | 3:200 | 0 / 1 / 199 / 0 | 192 of 200 (96.0 %) | 0 | 8 | 0 |
| 10x10-easy | 100 | 100.0 % (20) | 100.0 % | 0.3 / 0.4 | 0.5 | 217 | 9 / 11 | 0 (0-0) | 0 | 0 (0) | 1:119 2:48 3:33 | 152 / 43 / 5 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 10x10-normal | 100 | 100.0 % (20) | 100.0 % | 0.6 / 1.3 | 3.6 | 245 | 14 / 15 | 1 (0-1) | 0.8 | 7 (26) | 1:79 2:41 3:80 | 27 / 134 / 39 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 10x10-hard | 100 | 100.0 % (20) | 100.0 % | 0.6 / 0.9 | 1.5 | 212 | 20 / 23 | 1.5 (1-2) | 2.3 | 9 (30) | 1:9 2:32 3:159 | 41 / 80 / 79 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 10x10-expert | 100 | 100.0 % (20) | 100.0 % | 0.9 / 2.7 | 3.0 | 204 | 31 / 33 | 3 (3-4) | 5.3 | 10 (42) | 1:1 2:7 3:192 | 33 / 69 / 98 / 0 | 0 of 200 (0.0 %) | 0 | 10 | 0 |
| 10x10-master | 100 | 100.0 % (20) | 100.0 % | 9.0 / 16.4 | 18.3 | 185 | 45 / 49 | 5 (4-6) | 10.9 | 13 (53) | 3:200 | 40 / 70 / 90 / 0 | 14 of 200 (7.0 %) | 0 | 9 | 0 |
| 10x10-nightmare | 100 | 95.0 % (20) | 99.5 % | 24.0 / 68.4 | 120.6 | 169 | 66 / 71 | 8 (7-10) | 21.8 | 20 (53) | 3:199 | 0 / 26 / 167 / 6 | 193 of 199 (97.0 %) | 0 | 11 | time-limit x1 |
| 12x12-easy | 144 | 100.0 % (20) | 100.0 % | 0.4 / 0.5 | 0.5 | 233 | 10 / 11 | 0 (0-0) | 0 | 0 (0) | 1:144 2:24 3:32 | 154 / 46 / 0 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 12x12-normal | 144 | 100.0 % (20) | 100.0 % | 0.9 / 1.4 | 1.6 | 233 | 14 / 16 | 1 (0-1) | 0.8 | 9 (20) | 1:85 2:25 3:90 | 18 / 136 / 46 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 12x12-hard | 144 | 100.0 % (20) | 100.0 % | 0.6 / 1.5 | 2.4 | 232 | 20 / 23 | 1 (1-2) | 2.2 | 9 (33) | 1:11 2:47 3:142 | 70 / 84 / 46 / 0 | 0 of 200 (0.0 %) | 0 | 5 | 0 |
| 12x12-expert | 144 | 100.0 % (20) | 100.0 % | 0.9 / 2.5 | 2.8 | 210 | 31 / 33 | 3 (2-3) | 5.9 | 13 (37) | 2:11 3:189 | 31 / 112 / 57 / 0 | 0 of 200 (0.0 %) | 0 | 32 | 0 |
| 12x12-master | 144 | 100.0 % (20) | 100.0 % | 6.0 / 18.4 | 19.0 | 200 | 45 / 49 | 5 (4-6) | 10.8 | 16 (46) | 3:200 | 26 / 99 / 75 / 0 | 5 of 200 (2.5 %) | 0 | 64 | 0 |
| 12x12-nightmare | 144 | 85.0 % (20) | 92.5 % | 62.1 / 176.1 | 191.1 | 175 | 68 / 71 | 9 (7-10) | 22.2 | 21 (68) | 3:185 | 2 / 56 / 112 / 15 | 142 of 185 (76.8 %) | 0 | 81 | time-limit x3 |
| 14x14-easy | 196 | 100.0 % (20) | 100.0 % | 0.4 / 0.5 | 0.6 | 236 | 10 / 11 | 0 (0-0) | 0 | 0 (0) | 1:183 2:14 3:3 | 185 / 11 / 4 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 14x14-normal | 196 | 100.0 % (20) | 100.0 % | 0.8 / 3.9 | 4.6 | 241 | 14 / 15 | 0 (0-1) | 0 | 0 (20) | 1:89 2:27 3:84 | 53 / 125 / 22 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 14x14-hard | 196 | 100.0 % (20) | 100.0 % | 0.7 / 1.2 | 1.3 | 259 | 19 / 23 | 1 (1-2) | 2 | 12 (44) | 1:11 2:73 3:116 | 30 / 113 / 57 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 14x14-expert | 196 | 100.0 % (20) | 100.0 % | 0.9 / 1.6 | 1.8 | 243 | 31 / 33 | 3 (2-3) | 6.3 | 15 (40) | 2:21 3:179 | 21 / 102 / 77 / 0 | 0 of 200 (0.0 %) | 0 | 12 | 0 |
| 14x14-master | 196 | 100.0 % (20) | 100.0 % | 2.6 / 16.3 | 17.9 | 229 | 45 / 49 | 5 (4-6) | 11.6 | 19 (45) | 2:2 3:198 | 7 / 67 / 126 / 0 | 4 of 200 (2.0 %) | 0 | 45 | 0 |
| 14x14-nightmare | 196 | 55.0 % (20) | 63.0 % | 113.0 / 151.6 | 212.6 | 187 | 66.5 / 71 | 8 (7-9) | 21.5 | 26.5 (63) | 3:126 | 3 / 25 / 96 / 2 | 48 of 126 (38.1 %) | 0 | 116 | time-limit x8, set:time-limit x1 |
| 14x14-hell-1 | 196 | 0.0 % (20) | 2.5 % | unavailable (no run completed ten) | 229.1† | 207 | 97 / 109 | 13 (12-15) | 36.9 | 18 (24) | 3:5 | 0 / 3 / 1 / 1 | 5 of 5 (100.0 %) | 0 | 41 | set:time-limit x15, time-limit x5 |
| 15x15b10-easy | 215 | 100.0 % (20) | 100.0 % | 0.4 / 0.5 | 0.6 | 252 | 10 / 11 | 0 (0-0) | 0 | 0 (0) | 1:173 2:21 3:6 | 174 / 24 / 2 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 15x15b10-normal | 215 | 100.0 % (20) | 100.0 % | 1.4 / 2.6 | 3.4 | 282 | 14 / 15 | 0 (0-1) | 0 | 0 (22) | 1:87 2:35 3:78 | 63 / 127 / 10 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 15x15b10-hard | 215 | 100.0 % (20) | 100.0 % | 1.2 / 2.1 | 2.9 | 272 | 19 / 23 | 1 (1-2) | 2.3 | 10 (34) | 1:17 2:69 3:114 | 49 / 123 / 28 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 15x15b10-expert | 215 | 100.0 % (20) | 100.0 % | 1.6 / 2.8 | 3.3 | 270 | 32 / 34 | 3 (2-4) | 6.6 | 14 (38) | 2:16 3:184 | 61 / 95 / 44 / 0 | 0 of 200 (0.0 %) | 0 | 6 | 0 |
| 15x15b10-master | 215 | 100.0 % (20) | 100.0 % | 5.1 / 18.0 | 28.4 | 241 | 45 / 49 | 5 (4-6) | 11.8 | 20 (60) | 2:3 3:197 | 22 / 88 / 90 / 0 | 6 of 200 (3.0 %) | 0 | 35 | 0 |
| 15x15b10-nightmare | 215 | 55.0 % (20) | 70.5 % | 86.2 / 141.6 | 200.6 | 202 | 66 / 71 | 8 (7-10) | 21.7 | 28 (63) | 3:141 | 4 / 30 / 107 / 0 | 48 of 141 (34.0 %) | 0 | 111 | time-limit x8, set:time-limit x1 |
| 15x15b10-hell-1 (reduced) | 215 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 193 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 16x16-normal | 256 | 100.0 % (20) | 100.0 % | 1.4 / 3.9 | 4.9 | 285 | 15 / 16 | 1 (0-1) | 0.8 | 7 (20) | 1:110 2:28 3:62 | 39 / 145 / 16 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 16x16-hard | 256 | 100.0 % (20) | 100.0 % | 0.8 / 1.3 | 2.0 | 263 | 19 / 23 | 1 (1-2) | 2 | 14 (32) | 1:15 2:77 3:108 | 11 / 160 / 29 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 16x16-expert | 256 | 100.0 % (20) | 100.0 % | 1.2 / 2.1 | 3.4 | 269 | 31 / 33 | 3 (2-3) | 6.3 | 18 (48) | 1:1 2:23 3:176 | 7 / 78 / 115 / 0 | 1 of 200 (0.5 %) | 0 | 4 | 0 |
| 16x16-master | 256 | 100.0 % (20) | 100.0 % | 4.6 / 7.7 | 9.8 | 274 | 45 / 49 | 5 (4-6) | 12.1 | 27 (52) | 2:2 3:198 | 4 / 45 / 151 / 0 | 7 of 200 (3.5 %) | 0 | 34 | 0 |
| 16x16-nightmare | 256 | 75.0 % (20) | 90.5 % | 79.8 / 135.4 | 150.5 | 216 | 66 / 71 | 8 (7-10) | 22 | 29 (69) | 3:181 | 3 / 18 / 160 / 0 | 71 of 181 (39.2 %) | 0 | 114 | time-limit x5 |
| 16x16-hell-1 (reduced) | 256 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 204 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 15x20-normal | 300 | 100.0 % (20) | 100.0 % | 1.1 / 2.1 | 2.7 | 303 | 14 / 16 | 0 (0-1) | 0 | 0 (18) | 1:75 2:89 3:36 | 117 / 83 / 0 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 15x20-hard | 300 | 100.0 % (20) | 100.0 % | 0.7 / 1.2 | 1.4 | 263 | 19 / 23 | 1 (1-2) | 1.6 | 12 (38) | 1:6 2:72 3:122 | 7 / 174 / 19 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 15x20-expert | 300 | 100.0 % (20) | 100.0 % | 1.3 / 2.3 | 6.4 | 300 | 31 / 33 | 3 (2-3) | 6.4 | 18 (48) | 1:2 2:26 3:172 | 9 / 70 / 121 / 0 | 3 of 200 (1.5 %) | 0 | 1 | 0 |
| 15x20-master | 300 | 100.0 % (20) | 100.0 % | 4.0 / 9.1 | 13.6 | 272 | 44 / 49 | 5 (5-6) | 11.7 | 25 (62) | 2:4 3:196 | 3 / 33 / 164 / 0 | 17 of 200 (8.5 %) | 0 | 29 | 0 |
| 15x20-nightmare | 300 | 75.0 % (20) | 90.5 % | 40.1 / 111.2 | 155.7 | 229 | 66 / 71 | 8 (7-9) | 23.2 | 35 (83) | 3:181 | 1 / 18 / 162 / 0 | 89 of 181 (49.2 %) | 0 | 109 | time-limit x5 |
| 15x20-hell-1 (reduced) | 300 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 239 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 15x20-hell-2 (reduced) | 300 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 282 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 18x18-normal | 324 | 100.0 % (20) | 100.0 % | 1.0 / 2.8 | 3.7 | 311 | 14 / 16 | 0 (0-1) | 0 | 0 (18) | 1:97 2:85 3:18 | 93 / 101 / 6 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 18x18-hard | 324 | 100.0 % (20) | 100.0 % | 0.8 / 2.0 | 2.6 | 289 | 19 / 23 | 1 (1-2) | 2 | 15 (32) | 1:17 2:114 3:69 | 3 / 149 / 48 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 18x18-expert | 324 | 100.0 % (20) | 100.0 % | 1.5 / 3.9 | 6.3 | 314 | 31 / 33 | 3 (2-3) | 6.4 | 18 (52) | 1:1 2:25 3:174 | 8 / 71 / 121 / 0 | 2 of 200 (1.0 %) | 0 | 2 | 0 |
| 18x18-master | 324 | 100.0 % (20) | 100.0 % | 3.5 / 6.8 | 7.0 | 312 | 45 / 49 | 5 (4-6) | 12.1 | 28 (63) | 2:3 3:197 | 1 / 19 / 180 / 0 | 17 of 200 (8.5 %) | 0 | 18 | 0 |
| 18x18-nightmare | 324 | 100.0 % (20) | 100.0 % | 37.3 / 134.5 | 138.2 | 278 | 66 / 71 | 8 (7-9) | 23.3 | 34 (72) | 3:200 | 1 / 12 / 187 / 0 | 98 of 200 (49.0 %) | 0 | 100 | 0 |
| 18x18-hell-1 (reduced) | 324 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 261 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 18x18-hell-2 (reduced) | 324 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 319 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 18x20-hard | 360 | 100.0 % (20) | 100.0 % | 0.9 / 1.7 | 2.0 | 299 | 19 / 23 | 1 (1-2) | 1.9 | 14 (26) | 1:12 2:96 3:92 | 8 / 167 / 25 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 18x20-expert | 360 | 100.0 % (20) | 100.0 % | 1.5 / 3.3 | 4.4 | 285 | 31 / 33 | 3 (2-3) | 6.6 | 22 (46) | 1:1 2:32 3:167 | 3 / 49 / 148 / 0 | 2 of 200 (1.0 %) | 0 | 2 | 0 |
| 18x20-master | 360 | 100.0 % (20) | 100.0 % | 3.4 / 5.3 | 9.6 | 317 | 44 / 49 | 5 (4-6) | 12.3 | 26 (64) | 2:3 3:197 | 0 / 21 / 179 / 0 | 22 of 200 (11.0 %) | 0 | 17 | 0 |
| 18x20-nightmare | 360 | 100.0 % (20) | 100.0 % | 16.8 / 63.1 | 63.8 | 270 | 65 / 71 | 8 (7-10) | 23.9 | 38 (75) | 3:200 | 0 / 5 / 195 / 0 | 99 of 200 (49.5 %) | 0 | 77 | 0 |
| 18x20-hell-1 (reduced) | 360 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 339 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 18x20-hell-2 (reduced) | 360 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 321 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 20x20-hard | 400 | 100.0 % (20) | 100.0 % | 0.9 / 2.0 | 3.5 | 323 | 19 / 23 | 1 (1-2) | 1.8 | 14 (32) | 1:9 2:95 3:96 | 0 / 150 / 50 / 0 | 3 of 200 (1.5 %) | 0 | 0 | 0 |
| 20x20-expert | 400 | 100.0 % (20) | 100.0 % | 2.1 / 6.3 | 6.4 | 343 | 31 / 33 | 3 (2-3) | 6.5 | 20 (51) | 1:1 2:36 3:163 | 0 / 46 / 154 / 0 | 10 of 200 (5.0 %) | 0 | 6 | 0 |
| 20x20-master | 400 | 100.0 % (20) | 100.0 % | 4.5 / 7.2 | 10.5 | 334 | 44.5 / 49 | 5 (4-6) | 12.5 | 30.5 (62) | 2:4 3:196 | 0 / 20 / 180 / 0 | 19 of 200 (9.5 %) | 0 | 15 | 0 |
| 20x20-nightmare | 400 | 95.0 % (20) | 96.5 % | 20.1 / 114.0 | 136.7 | 319 | 66 / 71 | 8 (7-9) | 24.2 | 39 (76) | 3:193 | 0 / 2 / 191 / 0 | 110 of 193 (57.0 %) | 0 | 78 | time-limit x1 |
| 20x20-hell-1 (reduced) | 400 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 307 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 20x20-hell-2 (reduced) | 400 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 356 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 20x21-hard | 420 | 100.0 % (20) | 100.0 % | 1.0 / 1.7 | 1.9 | 325 | 19 / 23 | 1 (1-2) | 1.9 | 14 (34) | 1:16 2:120 3:64 | 1 / 148 / 51 / 0 | 2 of 200 (1.0 %) | 0 | 0 | 0 |
| 20x21-expert | 420 | 100.0 % (20) | 100.0 % | 2.4 / 5.7 | 8.4 | 318 | 31 / 33 | 3 (2-3) | 6.2 | 20 (46) | 1:1 2:28 3:171 | 1 / 44 / 155 / 0 | 9 of 200 (4.5 %) | 0 | 4 | 0 |
| 20x21-master | 420 | 100.0 % (20) | 100.0 % | 4.0 / 6.8 | 7.0 | 323 | 44 / 49 | 5 (4-6) | 12 | 24 (60) | 2:2 3:198 | 3 / 15 / 182 / 0 | 23 of 200 (11.5 %) | 0 | 14 | 0 |
| 20x21-nightmare | 420 | 100.0 % (20) | 100.0 % | 24.2 / 47.9 | 124.7 | 338 | 66 / 71 | 8 (7-10) | 23.5 | 36 (76) | 3:200 | 0 / 4 / 196 / 0 | 108 of 200 (54.0 %) | 0 | 68 | 0 |
| 20x21-hell-1 (reduced) | 420 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 366 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 20x21-hell-2 (reduced) | 420 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 405 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 32x15-hard | 480 | 100.0 % (20) | 100.0 % | 1.3 / 2.5 | 4.6 | 343 | 19 / 23 | 1 (1-2) | 1.8 | 13 (34) | 1:13 2:93 3:94 | 2 / 172 / 26 / 0 | 7 of 200 (3.5 %) | 0 | 0 | 0 |
| 32x15-expert | 480 | 100.0 % (20) | 100.0 % | 2.6 / 5.7 | 6.4 | 327 | 31 / 33 | 3 (2-4) | 6.1 | 20 (45) | 1:2 2:29 3:169 | 0 / 41 / 159 / 0 | 5 of 200 (2.5 %) | 0 | 0 | 0 |
| 32x15-master | 480 | 100.0 % (20) | 100.0 % | 4.6 / 12.4 | 20.5 | 375 | 44 / 48 | 5 (4-6) | 12.5 | 29.5 (68) | 2:2 3:198 | 0 / 6 / 194 / 0 | 39 of 200 (19.5 %) | 0 | 8 | 0 |
| 32x15-nightmare | 480 | 100.0 % (20) | 100.0 % | 11.6 / 37.9 | 41.2 | 348 | 65 / 71 | 8 (7-9) | 23.7 | 41 (83) | 3:200 | 0 / 0 / 200 / 0 | 127 of 200 (63.5 %) | 0 | 49 | 0 |
| 32x15-hell-1 (reduced) | 480 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 384 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 32x15-hell-2 (reduced) | 480 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 443 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 32x15-hell-3 (reduced) | 480 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 551 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 22x22-hard | 484 | 100.0 % (20) | 100.0 % | 1.2 / 3.4 | 3.7 | 382 | 19 / 23 | 1 (1-2) | 1.8 | 13 (32) | 1:21 2:103 3:76 | 1 / 158 / 41 / 0 | 0 of 200 (0.0 %) | 0 | 0 | 0 |
| 22x22-expert | 484 | 100.0 % (20) | 100.0 % | 2.6 / 5.8 | 7.3 | 367 | 31 / 33 | 3 (2-3) | 6 | 19 (52) | 1:1 2:27 3:172 | 0 / 22 / 178 / 0 | 12 of 200 (6.0 %) | 0 | 3 | 0 |
| 22x22-master | 484 | 100.0 % (20) | 100.0 % | 6.0† / 13.2† | 16.2† | 368 | 44 / 49 | 5 (4-6) | 12.4 | 30 (72) | 2:1 3:199 | 0 / 10 / 190 / 0 | 28 of 200 (14.0 %) | 0 | 14 | 0 |
| 22x22-nightmare | 484 | 100.0 % (20) | 100.0 % | 17.3 / 33.9 | 35.9 | 349 | 66 / 71 | 8 (7-9) | 24.7 | 43.5 (82) | 3:200 | 0 / 0 / 200 / 0 | 127 of 200 (63.5 %) | 0 | 63 | 0 |
| 22x22-hell-1 (reduced) | 484 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0† | 374 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 22x22-hell-2 (reduced) | 484 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0 | 435 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 22x22-hell-3 (reduced) | 484 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0 | 508 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 24x24-hard | 576 | 100.0 % (20) | 100.0 % | 1.7 / 6.1 | 15.8 | 399 | 19 / 23 | 1 (1-2) | 1.7 | 12 (29) | 1:14 2:109 3:77 | 2 / 147 / 51 / 0 | 3 of 200 (1.5 %) | 0 | 1 | 0 |
| 24x24-expert | 576 | 100.0 % (20) | 100.0 % | 3.4 / 8.9 | 14.8 | 406 | 31 / 33 | 3 (2-4) | 6.1 | 22 (50) | 1:4 2:34 3:162 | 0 / 12 / 188 / 0 | 19 of 200 (9.5 %) | 0 | 3 | 0 |
| 24x24-master | 576 | 100.0 % (20) | 100.0 % | 5.9 / 9.2 | 11.1 | 457 | 44 / 48 | 5 (4-6) | 12.6 | 29 (59) | 2:6 3:194 | 0 / 6 / 194 / 0 | 57 of 200 (28.5 %) | 0 | 11 | 0 |
| 24x24-nightmare | 576 | 100.0 % (20) | 100.0 % | 18.7† / 57.3† | 64.0† | 431 | 67 / 71 | 8 (7-9) | 26 | 45.5 (89) | 3:200 | 0 / 0 / 200 / 0 | 169 of 200 (84.5 %) | 0 | 85 | 0 |
| 24x24-hell-1 | 576 | 0.0 % (20) | 6.5 % | unavailable (no run completed ten) | 211.4 | 484 | 97 / 102 | 12 (12-13) | 44.3 | 78 (94) | 3:13 | 0 / 0 / 13 / 0 | 13 of 13 (100.0 %) | 0 | 42 | set:time-limit x13, time-limit x7 |
| 24x24-hell-2 (reduced) | 576 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0 | 542 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 24x24-hell-3 (reduced) | 576 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0 | 655 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 26x26-hard | 676 | 100.0 % (20) | 100.0 % | 1.4† / 4.4† | 4.9† | 496 | 19 / 23 | 1 (1-2) | 1.7 | 12 (29) | 1:15 2:124 3:61 | 0 / 154 / 46 / 0 | 3 of 200 (1.5 %) | 0 | 2 | 0 |
| 26x26-expert | 676 | 100.0 % (20) | 100.0 % | 3.6 / 6.5 | 23.6 | 475 | 31 / 32 | 3 (2-3) | 6.1 | 22 (52) | 2:39 3:161 | 0 / 11 / 189 / 0 | 22 of 200 (11.0 %) | 0 | 2 | 0 |
| 26x26-master | 676 | 100.0 % (20) | 100.0 % | 8.4† / 16.6† | 23.3† | 517 | 44.5 / 48 | 5 (4-6) | 12.9 | 31 (70) | 2:5 3:195 | 0 / 1 / 199 / 0 | 79 of 200 (39.5 %) | 0 | 13 | 0 |
| 26x26-nightmare | 676 | 100.0 % (20) | 100.0 % | 18.6† / 31.4† | 35.8† | 557 | 65.5 / 71 | 8 (7-9) | 25.5 | 46 (86) | 2:1 3:199 | 0 / 0 / 200 / 0 | 194 of 200 (97.0 %) | 0 | 69 | 0 |
| 26x26-hell-1 | 676 | 45.0 % (20) | 67.0 % | 108.7 / 167.6 | 206.7 | 575 | 97 / 103 | 12 (10-14) | 44.3 | 62 (130) | 3:134 | 0 / 2 / 132 / 0 | 134 of 134 (100.0 %) | 0 | 115 | time-limit x11 |
| 26x26-hell-2 (reduced) | 676 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0 | 606 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |
| 26x26-hell-3 (reduced) | 676 | 0.0 % (3) | unavailable | unavailable (no run completed ten) | 115.0 | 608 | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | 0 | set:time-limit x3 |

Reading, from the table and the aggregate's lists:

- **C3 holds everywhere**: `provedZero` is 0 in all 83 cells with v3 data (the 22 reduced Hell cases have none).
- **Request completion**: every non-Hell case completes at least 90 % of its requests except seven cells: 6x10 very easy
  (65 %: 7 of the 20 requests ended `layouts-not-found`, the board has too few layouts for ten distinct puzzles), 6x10 easy
  (85 %, the GV2 rate of the same cell, 3 requests `layouts-not-found`) and five Nightmare cells (12x12 85 %, 14x14 55 %,
  15x15b10 55 %, 16x16 75 %, 15x20 75 %: named item 3 of section 13). Hard and Expert complete 100 % on every board that
  offers them (section 4). The three Hell cases that made puzzles complete 0 % (14x14, 24x24) and 45 % (26x26).
- **Time**: outside Hell and Nightmare the largest T10 is 28.4 s (15x15b10 Master, 26x26 Expert 23.6 s); 70 of the 1,726
  requests ran longer than `TIME.responseMs` (120 s): 43 Nightmare requests and 27 Hell 1 requests (the 5 of `14x14-hell-1`
  carry †; section 13, item 4).


## 4. The criteria of RES-25 on the GV2 boards

No change round ran, so the C1-C5 table of the GV2 reports measured on the locked tree is MP12a's final round (round 2,
`docs/difficulty-v3/landscape-v3/r2/`, `calibration-slice-2026-11-13.md` section 6.3), by reference with its numbers. Its
source identity is this record's (section 1): `Assert-CriteriaSource` on that folder passed against the landscape's
identity (one report of each of the 18 GV2 cases, each with the same `sourceDigest` and the four version keys), and the
synthetic handoff check refused an old passing table (GV2 95 %, old tuple 90 %, new tuple 80 %) and accepted the new one.
MP12a's rounds 0 and 1 stay as history, labelled with their own identity.

| Criterion | Status | Numbers (MP12a round 2, the tuple of section 1) |
|---|---|---|
| C1 levels ordered | pass | 6x10: easy 10 < normal 14 < hard 19 < expert 31 < master 43; 10x10: 9 < 14 < 20 < 31 < 45; 12x12: 10 < 14 < 20 < 31 < 45; 18x20: hard 19 < expert 31 < master 44 |
| C2 Hard and Expert completion | pass | all eight Hard and Expert cells 100.0 % against GV2 100.0 % (bound 90.0 %) |
| C3 proved real choice (Hard and above) | pass | `provedZero` 0 in all twelve Hard-or-above cells; the same holds in all 83 cells of the full landscape (section 3) |
| C4 census estimates at most 5 % | fail in two cells, both accepted by the owner | 10x10-master 14 of 200 (7.0 %, P-OD8) and 18x20-master 22 (11.0 %, P-OD7); every other GV2 cell at most 2.5 % |
| C5 no capped `prod` line | pass | 896 `prod` lines: complete 896, capped 0, none 0, error 0 |

On the other boards, the level ordering and the Hard and Expert completion rates are reported facts (never compared with
an invented baseline); the medians are those of the accepted v3 puzzles of each cell (sections 3 and 5):

| Board | Area | v3 score median by level (levels with accepted puzzles, in level order) | Strictly increasing | Hard completion | Expert completion | GV2 board |
|---|---|---|---|---|---|---|
| 6x10 | 60 | very-easy 6, easy 10, normal 14, hard 19, expert 31, master 43 | yes | 100.0 % | 100.0 % | yes |
| 3x29 | 87 | very-easy 6, easy 10, normal 15, hard 22, expert 30, master 44, nightmare 66 | yes | 100.0 % | 100.0 % | no |
| 10x10 | 100 | easy 9, normal 14, hard 20, expert 31, master 45, nightmare 66 | yes | 100.0 % | 100.0 % | yes |
| 12x12 | 144 | easy 10, normal 14, hard 20, expert 31, master 45, nightmare 68 | yes | 100.0 % | 100.0 % | yes |
| 14x14 | 196 | easy 10, normal 14, hard 19, expert 31, master 45, nightmare 66.5, hell-1 97 | yes | 100.0 % | 100.0 % | no |
| 15x15b10 | 215 | easy 10, normal 14, hard 19, expert 32, master 45, nightmare 66 | yes | 100.0 % | 100.0 % | no |
| 16x16 | 256 | normal 15, hard 19, expert 31, master 45, nightmare 66 | yes | 100.0 % | 100.0 % | no |
| 15x20 | 300 | normal 14, hard 19, expert 31, master 44, nightmare 66 | yes | 100.0 % | 100.0 % | no |
| 18x18 | 324 | normal 14, hard 19, expert 31, master 45, nightmare 66 | yes | 100.0 % | 100.0 % | no |
| 18x20 | 360 | hard 19, expert 31, master 44, nightmare 65 | yes | 100.0 % | 100.0 % | yes |
| 20x20 | 400 | hard 19, expert 31, master 44.5, nightmare 66 | yes | 100.0 % | 100.0 % | no |
| 20x21 | 420 | hard 19, expert 31, master 44, nightmare 66 | yes | 100.0 % | 100.0 % | no |
| 32x15 | 480 | hard 19, expert 31, master 44, nightmare 65 | yes | 100.0 % | 100.0 % | no |
| 22x22 | 484 | hard 19, expert 31, master 44, nightmare 66 | yes | 100.0 % | 100.0 % | no |
| 24x24 | 576 | hard 19, expert 31, master 44, nightmare 67, hell-1 97 | yes | 100.0 % | 100.0 % | no |
| 26x26 | 676 | hard 19, expert 31, master 44.5, nightmare 65.5, hell-1 97 | yes | 100.0 % | 100.0 % | no |

Every board is strictly ordered over the levels it offers, Hell 1 included where it made puzzles (14x14, 24x24, 26x26:
median 97). Hard and Expert complete 100 % of their requests on all 16 boards.


## 5. P-OD1 to P-OD3: census estimates, capped paths, the penalty

**P-OD1 and P-OD7 (census estimates per cell, list 3 of the aggregate in force).** The landscape ran at
`DEDUCE.census` 80,000,000. 31 of the 83 measured cells have more than 5 % census estimates among their accepted
puzzles; each is a listed finding (named item 5 of section 13), and its puzzles ship with the estimate note and the
`censored` flag (AR1 already guarantees that a generated Hard-or-above puzzle has a proved decisive guess, so an estimate
can overstate a score but cannot invent the level's defining property). Twenty cells are above 25 %: 17 that are not Hell (all
15 Nightmare cells, 24x24 Master and 26x26 Master) and the three Hell 1 cells that made puzzles (every one of their puzzles
is an estimate; they are historical findings, Hell 1 being withdrawn by D39 in MP12b3). The 17 non-Hell cells are put to the
owner (owner question 3 below) with the cost of a larger census from MP12a's record. The 18x20-master (11.0 %) and
10x10-master (7.0 %) cells are the two the owner
accepted (P-OD7, P-OD8), 80,000,000 being the owner's value. The 11 cells between 5 % and 25 % are the two above and 22x22
Expert 6.0 %, 24x24 Expert 9.5 %, 26x26 Expert 11.0 %, and Master 15x20 8.5 %, 18x18 8.5 %, 20x20 9.5 %, 20x21 11.5 %,
22x22 14.0 %, 32x15 19.5 %. No census change is made in MP12b (PR-P1).

| Board | Area | Level | Requests | Accepted puzzles | Census estimates | Share | Above 25 % |
|---|---|---|---|---|---|---|---|
| 3x29 | 87 | nightmare | 20 | 200 | 192 | 96.0 % | yes |
| 10x10 | 100 | master | 20 | 200 | 14 | 7.0 % | no |
| 10x10 | 100 | nightmare | 20 | 199 | 193 | 97.0 % | yes |
| 12x12 | 144 | nightmare | 20 | 185 | 142 | 76.8 % | yes |
| 14x14 | 196 | nightmare | 20 | 126 | 48 | 38.1 % | yes |
| 14x14 | 196 | hell-1 | 20 | 5 | 5 | 100.0 % | yes |
| 15x15b10 | 215 | nightmare | 20 | 141 | 48 | 34.0 % | yes |
| 16x16 | 256 | nightmare | 20 | 181 | 71 | 39.2 % | yes |
| 15x20 | 300 | master | 20 | 200 | 17 | 8.5 % | no |
| 15x20 | 300 | nightmare | 20 | 181 | 89 | 49.2 % | yes |
| 18x18 | 324 | master | 20 | 200 | 17 | 8.5 % | no |
| 18x18 | 324 | nightmare | 20 | 200 | 98 | 49.0 % | yes |
| 18x20 | 360 | master | 20 | 200 | 22 | 11.0 % | no |
| 18x20 | 360 | nightmare | 20 | 200 | 99 | 49.5 % | yes |
| 20x20 | 400 | master | 20 | 200 | 19 | 9.5 % | no |
| 20x20 | 400 | nightmare | 20 | 193 | 110 | 57.0 % | yes |
| 20x21 | 420 | master | 20 | 200 | 23 | 11.5 % | no |
| 20x21 | 420 | nightmare | 20 | 200 | 108 | 54.0 % | yes |
| 32x15 | 480 | master | 20 | 200 | 39 | 19.5 % | no |
| 32x15 | 480 | nightmare | 20 | 200 | 127 | 63.5 % | yes |
| 22x22 | 484 | expert | 20 | 200 | 12 | 6.0 % | no |
| 22x22 | 484 | master | 20 | 200 | 28 | 14.0 % | no |
| 22x22 | 484 | nightmare | 20 | 200 | 127 | 63.5 % | yes |
| 24x24 | 576 | expert | 20 | 200 | 19 | 9.5 % | no |
| 24x24 | 576 | master | 20 | 200 | 57 | 28.5 % | yes |
| 24x24 | 576 | nightmare | 20 | 200 | 169 | 84.5 % | yes |
| 24x24 | 576 | hell-1 | 20 | 13 | 13 | 100.0 % | yes |
| 26x26 | 676 | expert | 20 | 200 | 22 | 11.0 % | no |
| 26x26 | 676 | master | 20 | 200 | 79 | 39.5 % | yes |
| 26x26 | 676 | nightmare | 20 | 200 | 194 | 97.0 % | yes |
| 26x26 | 676 | hell-1 | 20 | 134 | 134 | 100.0 % | yes |

**What a larger census would cost (MP12a's record, `calibration-slice-2026-11-13.md` sections 4.1 and 6.5)**, on the five
slice cells that failed C4 at 10,000,000, with the captured packs rated at 10, 20, 40 and 80 million (round 1 corpus,
50 puzzles per cell): 6x10-master 32 / 16 / 4 / 0 %, 10x10-master 6 / 4 / 4 / 2 %, 12x12-master 24 / 20 / 8 / 4 %,
18x20-expert 32 / 18 / 8 / 0 %, 18x20-master 66 / 30 / 14 / 14 %. **18x20-master at 80 million, by cohort:** 11.0 % in the
landscape (22 of 200 puzzles), 14 % in the matched round-1 probe corpus (the row above, 7 of 50) and 16 % in the round-2
probe corpus (8 of 50). **Matched cost of 80,000,000 against 10,000,000** (the same 250 puzzles of the five cells rated at
both budgets, round 1; deduction time per puzzle): median 45.1 to 55.1 ms, p95 238.6 to 337.3 ms, maximum 1,323.6 to
1,315.5 ms. The round 2 figures in MP12a's record (median 49.2 ms, p95 361.9 ms, against round 1's values at 10,000,000)
compare two 250-puzzle cohorts that differ in 15 puzzles, so they are observational and not a paired measurement of the
budget's cost; they are not used here. The work cap
headroom: the largest main-search work is 58.6 % of 760,000,000 and the largest node count 70.8 % of 30,000
(10x10-master). No larger census is measured here.

**P-OD2 (capped paths of accepted puzzles).** None: the 896 canonical re-ratings (`prod` lines of the probe corpus of
MP12a's round 2, `r2/probe/final.jsonl`) are all complete (section 4, C5); no accepted puzzle of any landscape cell is
unrateable (`provedZero` 0 and the aggregate's v3 data cover 83 cells). The unrateable profiles of the search evidence
are in section 6: none in R and A (every raw attempt rated or refused), 539 of 556 raw attempts in H, 627 of 768 in HL and
334 of 441 in N. They are search profiles that were spent, not accepted puzzles.

**P-OD3 (the penalty).** MP12a's outcome, labelled with MP12a's tuple: `penalty (1, 2)` with `rule[3]` 3, restored on the
task's rule (the set meets C1 and is within 1 point of the best fit; SA1-Q-P1 says the few/many penalty stays); the data
do not separate it from (0, 0) (section 4.3 of MP12a's record: every cell has the same request completion rate and yield
in both). The plan author confirmed the tuple as the one to lock (PR-P1, rows K2 to K5). Nothing was measured again here.


## 6. Search evidence (GS-P3; MP12b2-B01)

How the search reached its puzzles, from the `observe.mjs` captures of this task (one serial process each, through the
lock helper; the captures are `docs/difficulty-v3/search-2026-11-15/require/` (R), `any/` (A), `hell/` (H),
`hell-landscape/` (HL), `nightmare/` (N) and the log `runs.md`; the rows below come from `summary.md`, written by
`summary.mjs`). Each population has its own table with its denominators in the header and the source identity of
section 1; no ratio crosses populations. `*` marks a capture stopped at its limit (the accepted puzzles are those known at
the stop). A time `-` is unavailable. The observer brackets the `finish` closure of `selectClues` in memory, so repair
ratings and repair outcomes are observed, never inferred (TP07); every attempt carries its own time.

**Self-tests.** `node --import ./docs/difficulty-v3/search-2026-11-15/observe.mjs ./docs/difficulty-v3/search-2026-11-15/summary.mjs --self-test`
passed: the four scripted cases of the task (`S4`, `S4ok`, `S6` and `repair-ri-0`, with `STALL_LIMIT` 12: 13 raw attempts
then the repair) gave the expected attempts, finishes, returned clues and `ri` (3 for `repair-ri-0`: the repaired set equals
raw rating 3, which `ri` alone would miss), every attempt has `ms >= 0`, and the summary row of its own file read: 4
selection calls, all `require`; raw attempts 18 rated, none refused or capped; repair ratings 2 rated, 1 refused, 1 capped;
finishes 2 unique, 2 repaired, 1 refused, 1 capped; successful repairs 2 of 6 repair attempts; results from a repair 2 of
4 calls with a result. `node --check` of `flow-case.mjs` passed and a call with an unknown case exited 1 without writing
a capture; `git --no-pager diff --no-index --stat docs/difficulty-v3/d21-2026-11-12/flow.mjs docs/difficulty-v3/search-2026-11-15/flow-case.mjs`
prints ` .../flow.mjs => search-2026-11-15/flow-case.mjs}   | 39 +++++++++-----------` and `1 file changed, 16 insertions(+),
23 deletions(-)`: the two edits of the task and nothing else. The synthetic check of `AcceptedOf` (RP05) passed on its
five captures.

#### Search summary (MP12b2)

Per file one row; one TOTAL row per population folder. "-" is unavailable, "*" a censored capture (stopped at its
limit: the accepted puzzles are those known at the stop). A ratio never crosses populations. Times in ms.

##### Population require

| File | Calls any/require (calls) | Raw attempts rated/refused/capped (raw attempts) | Repair ratings rated/refused/capped (repair ratings) | Finishes raw/unique/repaired/not-unique/capped/refused/rejected (finishes) | Successful repairs / repair attempts (finishes other than raw) | Results from a repair / require-mode calls with a result | Set attempts ok/failed (start events) | Accepted puzzles (end event) | Attempts per accepted puzzle (raw + repair attempts / accepted) | Capped share (capped / all attempts) | Capped work median/max | Capped ms median/max | Rated ms median/max | Call ms median/max | setMs | foldMs | totalMs | Status (end event) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| r-18x20-expert.jsonl | 0/16 | 573/56/0 | 65/161/0 | 0/7/10/0/0/161/55 | 10/233 | 4/11 | 1/0 | 10 | 85.5 | 0.0% | -/- | -/- | 34.0/499.9 | 2482.3/7554.5 | 2492 | 45778 | 48272 | complete |
| r-18x20-hard.jsonl | 0/27 | 1289/395/0 | 1/1055/0 | 0/1/1/0/0/1055/0 | 1/1057 | 1/2 | 1/8 | 2 | 1370.0 | 0.0% | -/- | -/- | 11.2/229.6 | 1521.1/3093.8 | 17476 | 27300 | 44778 | partial |
| r-18x20-master.jsonl | 0/17 | 775/14/0 | 122/189/0 | 0/2/18/0/0/189/104 | 18/313 | 8/10 | 1/5 | 10 | 110.0 | 0.0% | -/- | -/- | 70.2/3147.5 | 7737.7/17638.7 | 73531 | 62468 | 136000 | complete |
| r-6x10-easy.jsonl | 0/11 | 129/0/0 | 52/0/0 | 0/7/28/0/0/0/24 | 28/59 | 4/11 | 1/0 | 10 | 18.1 | 0.0% | -/- | -/- | 0.5/16.5 | 19.7/57.6 | 75 | 254 | 330 | complete |
| r-6x10-expert.jsonl | 0/11 | 118/34/0 | 9/23/0 | 0/9/4/0/0/23/5 | 4/41 | 1/10 | 1/1 | 10 | 18.4 | 0.0% | -/- | -/- | 3.2/143.0 | 22.2/733.7 | 763 | 1742 | 2506 | complete |
| r-6x10-hard.jsonl | 0/11 | 165/147/0 | 5/41/0 | 0/8/4/0/0/41/1 | 4/54 | 2/10 | 1/0 | 10 | 35.8 | 0.0% | -/- | -/- | 1.6/31.7 | 60.8/128.8 | 144 | 2873 | 3019 | complete |
| r-6x10-master.jsonl | 0/12 | 451/0/0 | 145/79/0 | 0/1/16/0/0/79/129 | 16/225 | 9/10 | 1/0 | 10 | 67.5 | 0.0% | -/- | -/- | 40.4/426.2 | 4387.6/7529.9 | 6432 | 47454 | 53887 | complete |
| r-6x10-normal.jsonl | 0/10 | 480/0/0 | 73/0/0 | 0/5/5/0/0/0/68 | 5/78 | 5/10 | 1/0 | 10 | 55.3 | 0.0% | -/- | -/- | 0.6/22.4 | 77.5/140.8 | 164 | 769 | 934 | complete |
| TOTAL require (8 files) | 0/115 | 3980/646/0 | 472/1548/0 | 0/40/86/0/0/1548/386 | 86/2060 | 34/74 | 8/14 | 72 | 92.3 | 0.0% | -/- | -/- | 15.1/3147.5 | 1264.8/17638.7 | - | - | - | - |

##### Population any

| File | Calls any/require (calls) | Raw attempts rated/refused/capped (raw attempts) | Repair ratings rated/refused/capped (repair ratings) | Finishes raw/unique/repaired/not-unique/capped/refused/rejected (finishes) | Successful repairs / repair attempts (finishes other than raw) | Results from a repair / require-mode calls with a result | Set attempts ok/failed (start events) | Accepted puzzles (end event) | Attempts per accepted puzzle (raw + repair attempts / accepted) | Capped share (capped / all attempts) | Capped work median/max | Capped ms median/max | Rated ms median/max | Call ms median/max | setMs | foldMs | totalMs | Status (end event) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| a-10x10-expert.jsonl | 6/0 | 30/3/0 | 0/0/0 | 6/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 6.6 | 0.0% | -/- | -/- | 14.3/263.9 | 91.5/725.6 | 750 | 656 | 1407 | complete |
| a-10x10-hard.jsonl | 5/0 | 34/19/0 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 10.6 | 0.0% | -/- | -/- | 4.5/21.9 | 23.2/95.0 | 43 | 272 | 316 | complete |
| a-10x10-master.jsonl | 6/0 | 42/0/0 | 0/0/0 | 6/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 8.4 | 0.0% | -/- | -/- | 179.7/2669.9 | 966.1/12528.4 | 1190 | 19904 | 21096 | complete |
| a-12x12-expert.jsonl | 5/0 | 22/4/0 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 5.2 | 0.0% | -/- | -/- | 7.7/66.3 | 85.3/112.9 | 134 | 344 | 478 | complete |
| a-12x12-hard.jsonl | 5/0 | 5/7/0 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 2.4 | 0.0% | -/- | -/- | 2.7/7.4 | 9.4/51.9 | 72 | 173 | 247 | complete |
| a-12x12-master.jsonl | 5/0 | 31/1/0 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 6.4 | 0.0% | -/- | -/- | 48.2/753.2 | 477.1/2510.1 | 497 | 3878 | 4376 | complete |
| a-18x20-expert.jsonl | 5/0 | 19/2/0 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 4.2 | 0.0% | -/- | -/- | 18.4/44.9 | 51.7/188.7 | 222 | 380 | 604 | complete |
| a-18x20-hard.jsonl | 5/0 | 22/39/0 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 12.2 | 0.0% | -/- | -/- | 9.3/19.7 | 160.9/166.9 | 180 | 740 | 922 | complete |
| a-18x20-master.jsonl | 5/0 | 28/0/0 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 5.6 | 0.0% | -/- | -/- | 88.4/948.5 | 443.0/2069.5 | 978 | 3033 | 4013 | complete |
| a-6x10-expert.jsonl | 5/0 | 28/3/0 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 6.2 | 0.0% | -/- | -/- | 9.1/177.3 | 102.7/238.9 | 137 | 925 | 1064 | complete |
| a-6x10-hard.jsonl | 5/0 | 14/3/0 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 3.4 | 0.0% | -/- | -/- | 1.7/7.4 | 9.0/30.4 | 47 | 76 | 124 | complete |
| a-6x10-master.jsonl | 5/0 | 17/0/0 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 3.4 | 0.0% | -/- | -/- | 68.0/307.8 | 179.5/977.8 | 254 | 1733 | 1988 | complete |
| TOTAL any (12 files) | 62/0 | 292/81/0 | 0/0/0 | 62/0/0/0/0/0/0 | 0/0 | 0/0 | 12/0 | 60 | 6.2 | 0.0% | -/- | -/- | 17.8/2669.9 | 95.5/12528.4 | - | - | - | - |

##### Population hell

| File | Calls any/require (calls) | Raw attempts rated/refused/capped (raw attempts) | Repair ratings rated/refused/capped (repair ratings) | Finishes raw/unique/repaired/not-unique/capped/refused/rejected (finishes) | Successful repairs / repair attempts (finishes other than raw) | Results from a repair / require-mode calls with a result | Set attempts ok/failed (start events) | Accepted puzzles (end event) | Attempts per accepted puzzle (raw + repair attempts / accepted) | Capped share (capped / all attempts) | Capped work median/max | Capped ms median/max | Rated ms median/max | Call ms median/max | setMs | foldMs | totalMs | Status (end event) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| h-15x20-hell-2.jsonl | 6/0 | 2/0/117 | 0/0/0 | 0/0/0/0/0/0/0 | 0/0 | 0/0 | 0/6 | 0* | - | 98.3% | 760.4M/760.6M | 2096.1/2442.8 | 2663.2/2718.5 | 41433.3/44040.7 | - | - | stopped at the limit | stopped at the limit |
| h-18x18-hell-2.jsonl | 4/0 | 14/0/110 | 0/0/0 | 0/0/0/0/0/0/0 | 0/0 | 0/0 | 0/4 | 0* | - | 88.7% | 760.5M/760.8M | 2061.6/2405.6 | 2542.8/2728.3 | 42112.9/136303.1 | - | - | stopped at the limit | stopped at the limit |
| h-22x22-hell-3.jsonl | 5/0 | 1/0/92 | 0/0/0 | 0/0/0/0/0/0/0 | 0/0 | 0/0 | 0/13 | 0* | - | 98.9% | 761.4M/761.7M | 2181.3/2502.2 | 2922.8/2922.8 | 43469.8/45896.0 | - | - | stopped at the limit | stopped at the limit |
| h-24x24-hell-3.jsonl | 6/0 | 0/0/120 | 0/0/0 | 0/0/0/0/0/0/0 | 0/0 | 0/0 | 0/6 | 0* | - | 100.0% | 762.0M/762.5M | 2304.6/2723.9 | -/- | 46100.7/48278.0 | - | - | stopped at the limit | stopped at the limit |
| h-32x15-hell-3.jsonl | 5/0 | 0/0/100 | 0/0/0 | 0/0/0/0/0/0/0 | 0/0 | 0/0 | 0/13 | 0* | - | 100.0% | 761.4M/761.8M | 2187.3/2513.9 | -/- | 43047.4/45298.8 | - | - | stopped at the limit | stopped at the limit |
| TOTAL hell (5 files) | 26/0 | 17/0/539 | 0/0/0 | 0/0/0/0/0/0/0 | 0/0 | 0/0 | 0/42 | 0* | - | 96.9% | 761.3M/762.5M | 2168.4/2723.9 | 2547.3/2922.8 | 43258.6/136303.1 | - | - | - | - |

##### Population hell-landscape

| File | Calls any/require (calls) | Raw attempts rated/refused/capped (raw attempts) | Repair ratings rated/refused/capped (repair ratings) | Finishes raw/unique/repaired/not-unique/capped/refused/rejected (finishes) | Successful repairs / repair attempts (finishes other than raw) | Results from a repair / require-mode calls with a result | Set attempts ok/failed (start events) | Accepted puzzles (end event) | Attempts per accepted puzzle (raw + repair attempts / accepted) | Capped share (capped / all attempts) | Capped work median/max | Capped ms median/max | Rated ms median/max | Call ms median/max | setMs | foldMs | totalMs | Status (end event) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hl-14x14-hell-1.jsonl | 5/0 | 47/0/173 | 0/0/0 | 2/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 2* | 110.0* | 78.6% | 760.1M/760.2M | 2205.5/2716.0 | 2558.0/3384.3 | 108254.8/145933.5 | 67447 | - | stopped at the limit | stopped at the limit |
| hl-24x24-hell-1.jsonl | 12/0 | 24/0/231 | 0/0/0 | 2/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 2* | 127.5* | 90.6% | 761.1M/762.2M | 2081.2/2791.9 | 1909.9/5158.8 | 41518.3/66395.4 | 66436 | - | stopped at the limit | stopped at the limit |
| hl-26x26-hell-1.jsonl | 17/0 | 70/0/223 | 0/0/0 | 10/0/0/0/0/0/0 | 0/0 | 0/0 | 1/7 | 10 | 29.3 | 76.1% | 761.4M/762.8M | 2006.0/2936.6 | 1632.4/4317.7 | 33716.8/74651.1 | 315330 | 248107 | 563439 | complete |
| TOTAL hell-landscape (3 files) | 34/0 | 141/0/627 | 0/0/0 | 14/0/0/0/0/0/0 | 0/0 | 0/0 | 3/7 | 14* | 54.9* | 81.6% | 761.1M/762.8M | 2115.4/2936.6 | 2090.7/5158.8 | 40810.2/145933.5 | - | - | - | - |

##### Population nightmare

| File | Calls any/require (calls) | Raw attempts rated/refused/capped (raw attempts) | Repair ratings rated/refused/capped (repair ratings) | Finishes raw/unique/repaired/not-unique/capped/refused/rejected (finishes) | Successful repairs / repair attempts (finishes other than raw) | Results from a repair / require-mode calls with a result | Set attempts ok/failed (start events) | Accepted puzzles (end event) | Attempts per accepted puzzle (raw + repair attempts / accepted) | Capped share (capped / all attempts) | Capped work median/max | Capped ms median/max | Rated ms median/max | Call ms median/max | setMs | foldMs | totalMs | Status (end event) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| n-12x12-nightmare.jsonl | 5/0 | 17/0/35 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 10.4 | 67.3% | 760.1M/760.1M | 2310.9/3239.3 | 2009.1/2932.6 | 13830.6/66357.8 | 4353 | 108557 | 112912 | complete |
| n-14x14-nightmare.jsonl | 12/0 | 35/0/229 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/1 | 5 | 52.8 | 86.7% | 760.1M/760.2M | 2093.2/2729.2 | 2429.9/2846.5 | 40798.1/105084.1 | 59713 | 495560 | 555275 | complete |
| n-15x15b10-nightmare.jsonl | 5/0 | 17/0/15 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 6.4 | 46.9% | 760.1M/760.2M | 2168.3/2349.6 | 549.7/1986.7 | 8771.2/18724.7 | 18750 | 26409 | 45160 | complete |
| n-15x20-nightmare.jsonl | 5/0 | 8/0/3 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 2.2 | 27.3% | 760.2M/760.2M | 1820.2/2099.4 | 717.0/2233.7 | 2573.0/5658.0 | 2820 | 11177 | 13999 | complete |
| n-16x16-nightmare.jsonl | 5/0 | 30/0/52 | 0/0/0 | 5/0/0/0/0/0/0 | 0/0 | 0/0 | 1/0 | 5 | 16.4 | 63.4% | 760.2M/760.3M | 2022.6/2309.1 | 941.9/1931.0 | 28933.1/32298.9 | 19674 | 109161 | 128836 | complete |
| TOTAL nightmare (5 files) | 32/0 | 107/0/334 | 0/0/0 | 25/0/0/0/0/0/0 | 0/0 | 0/0 | 5/1 | 25 | 17.6 | 75.7% | 760.1M/760.3M | 2101.8/3239.3 | 1177.9/2932.6 | 19644.8/105084.1 | - | - | - | - |

**Readings.**

- **Repaired candidates (R, `require` mode; RES-25, TP07).** 8 captures, 115 selection calls, 72 accepted puzzles. Of the
  4,626 raw attempts, 3,980 were rated and 646 refused for lack of a proved decisive guess (AR1, 14.0 %); none was capped.
  The repair of a candidate (clues added until the solution is unique) made 2,060 repair attempts (finishes other than `raw`):
  40 candidates were already unique, **86 repairs succeeded (4.2 % of the 2,060)**, 1,548 repair ratings were refused by
  AR1 (the repaired set has no proved decisive guess: 75.1 % of the repair attempts, 76.6 % of the 2,020 repair ratings;
  none was capped) and 386 left the band or had an excluded key. 34 of the 74 `require` calls that returned a result
  returned a repaired set (46 %); the rest returned a raw set that was already unique. Attempts per accepted puzzle: 92.3
  over the file totals (6x10: 18 to 67 per puzzle, 18x20: 85.5 to 1,370.0). Time per rated rating: median 15.1 ms,
  largest 3.1 s; per call: median 1.3 s, largest 17.6 s.
- **Population R on 18x20 (PR-P1, D41).** One request of 10 puzzles per level (`probe-require/18x20-<level>/0`):
  Hard accepted **2 of 10** (status `partial`, reason `difficulty-not-found`; set 17.5 s, fold 27.3 s, total 44.8 s;
  1,289 raw attempts rated, 395 refused; 1 repair rating rated and 1,055 refused; 1 successful repair of 1,057 repair
  attempts; 1 result from a repair of 2 calls with a result); Expert **10 of 10** (total 48.3 s; raw 573 rated, 56 refused;
  repair ratings 65 rated, 161 refused; 10 successful repairs of 233; 4 results from a repair of 11); Master **10 of 10**
  (total 136.0 s; raw 775 rated, 14 refused; repair ratings 122 rated, 189 refused; 18 successful repairs of 313; 8 results
  from a repair of 10). Every cell made puzzles, so the two extra captures per cell were not needed and **no owner
  question** arises (section 13, question 2); Hard with `require` on 18x20 made only 2 puzzles in its request, which is a
  named availability finding (section 13, item 7): the repair of a Hard candidate almost always destroys its only decisive
  guess. The v2-made corpus had none of these puzzles with a decisive guess; under v3 every accepted puzzle has one
  (AR1).
- **AR1 refusals (A, `any` mode).** 12 captures, 62 calls, 60 accepted puzzles of 60 requested, 292 raw attempts rated and
  81 refused (21.7 %), none capped. The refusals are a Hard phenomenon: Hard 68 of 143 raw attempts (47.6 %: 6x10 3 of 17,
  10x10 19 of 53, 12x12 7 of 12, 18x20 39 of 61), Expert 12 of 111 (10.8 %), Master 1 of 119. Attempts per accepted puzzle
  6.2 (Hard 2.4 to 12.2). Time per rated rating: median 17.8 ms, largest 2.7 s; per call: median 95.5 ms, largest 12.5 s.
- **Unrateable profiles (H, HL, N).** In every Hell and Nightmare capture the unrateable profile is the cost: H 539 of
  556 raw attempts capped (96.9 %), HL 627 of 768 (81.6 %), N 334 of 441 (75.7 %). A capped rating stops at the work cap
  (median 761.3 million, 761.1 million and 760.1 million work units against `DEDUCE.work` 760,000,000, the cap plus at most
  one rule application, D6) and costs a median of 2.17 s (H), 2.12 s (HL) and 2.10 s (N), 3.2 s at most. A rated rating
  costs a median of 2.5 s (H, 17 ratings), 2.1 s (HL) and 1.2 s (N). The census confound (named item 8) applies to the
  rated Nightmare ratings: a census that does not finish counts undecided alternatives as failing.
- **Repairs** occur only in `require` mode: A (`any` mode), H, HL and N have no repair attempt (their finishes are `raw`).

Detail of the failed calibrations and the set attempts of the Hell and Nightmare captures is in section 7 and section 10.


## 7. Hell report (D21, owner decision P-OD9; MP12b2-B02)

D21 asks for the ratings per puzzle and the generation time of every Hell cell under v3. Every Hell cell of the landscape
has a row below. A cell with a capture of its own population (H: D21's five cells; HL: the three cases whose prescreen made
a puzzle) is reported from that capture; every other Hell case (17, PR-P2 amendment) has a row from its prescreen alone,
labelled "no capture (P-OD9: no further evidence)". The captures are serial single-process replays of one request
(`flow.mjs` or `flow-case.mjs`): a set request (set attempts in order, each a calibration search that spends 20 profiles when
every one is unrateable and more or fewer otherwise, section 10) and, when a set is made, one batch folded in slot order. They are not independent landscape requests and never
pool with the landscape's numbers; a ratio never divides one population's count by another's accepted puzzles. `STALL_LIMIT`
is 12 (section 8). `†` marks a time that is not slot-protected (section 13, item 1); the times of the captures carry no mark.

**H (D21's five cells, seed `t18-big-a`, 300 s each; every capture stopped at its limit, none made a set).** Rows from
`summary.md` (section 6) and the set attempts of each capture:

| Capture | Set attempts (ok / not-in-band / carve / other) | Profiles per not-in-band attempt (median; rated / refused / capped per attempt, median) | Time per not-in-band attempt (s, median / max) | Time per carve failure (s, median) | Time to the first ok set attempt (s) | End |
|---|---|---|---|---|---|---|
| h-15x20-hell-2.jsonl | 0 / 6 / 0 / 0 | 20; 0 / 0 / 20 | 43.7 / 45.0 | - | - | stopped at the limit |
| h-18x18-hell-2.jsonl | 0 / 4 / 0 / 0 | 20; 0 / 0 / 20 | 43.1 / 136.3 | - | - | stopped at the limit |
| h-22x22-hell-3.jsonl | 0 / 5 / 8 / 0 | 20; 0 / 0 / 20 | 43.6 / 46.2 | 7.9 | - | stopped at the limit |
| h-24x24-hell-3.jsonl | 0 / 6 / 0 / 0 | 20; 0 / 0 / 20 | 46.2 / 48.4 | - | - | stopped at the limit |
| h-32x15-hell-3.jsonl | 0 / 5 / 8 / 0 | 20; 0 / 0 / 20 | 43.1 / 46.8 | 8.5 | - | stopped at the limit |

| Capture (quantity) | Raw attempts rated / refused / capped | Rated profiles | Accepted | Ratings per accepted puzzle |
|---|---|---|---|---|
| `h-22x22-hell-3` (10) | 1 / 0 / 92 | 1 (score 438, above the band 162-235) | 0* | unavailable (no puzzle) |
| `h-32x15-hell-3` (5) | 0 / 0 / 100 | none | 0* | unavailable |
| `h-24x24-hell-3` (5) | 0 / 0 / 120 | none | 0* | unavailable |
| `h-15x20-hell-2` (5) | 2 / 0 / 117 | 2 (266 and 302, above the band 112-162) | 0* | unavailable |
| `h-18x18-hell-2` (5) | 14 / 0 / 110 | 14 (211 to 295, all above the band 112-162) | 0* | unavailable |

Every rated profile of H lies above its level's band and every one has an unfinished census; every other profile was
unrateable (stopped at the work cap, median 2.17 s each). 22 of the 26 failed calibrations of H spent exactly 20 profiles,
all capped, in 43 to 46 s (a carve failure costs about 8 s); the other four spent 18, 21, 64 and 13 profiles (section 10).
`h-18x18-hell-2` set attempt 2 made 64 profiles in 136.3 s (14 rated, 50
capped): a single selection call that outlasts the 115 s stop (named item 4 of section 13). Times to failure: serial, no
capture ended by itself within 300 s; the two-worker flow ends at 115 s (`TIME.dispatchStopMs`; MP09d2 measured 115.0 s
for `square-22x22-hell-3`, `d21-v3-2026-11-12.md` section 2.1).

**HL (the Hell cases outside H whose prescreen made a puzzle; 570 s each).** Manifest in section 2. Set attempts:

| Capture | Set attempts (ok / not-in-band / carve / other) | Profiles per not-in-band attempt (median; rated / refused / capped per attempt, median) | Time per not-in-band attempt (s, median / max) | Time per carve failure (s, median) | Time to the first ok set attempt (s) | End |
|---|---|---|---|---|---|---|
| hl-14x14-hell-1.jsonl | 1 / 0 / 0 / 0 | - | - | - | 67.4 | stopped at the limit |
| hl-24x24-hell-1.jsonl | 1 / 0 / 0 / 0 | - | - | - | 66.4 | stopped at the limit |
| hl-26x26-hell-1.jsonl | 1 / 7 / 0 / 0 | 20; 0 / 0 / 20 | 40.7 / 42.0 | - | 315.3 | complete (10 accepted) |

| Capture | Accepted | Set stage (s) | Fold stage (s) | Total (s) | Ratings per accepted puzzle (raw attempts / accepted) | Capped raw attempts | Rated profiles (score min / median / max) |
|---|---|---|---|---|---|---|---|
| `hl-14x14-hell-1` (rep 2) | 2* (stopped at 570 s) | 67.4 | unavailable (stopped) | unavailable | 110.0* | 173 of 220 (78.6 %) | 47 (99 / 147 / 189; every census unfinished) |
| `hl-24x24-hell-1` (rep 2) | 2* (stopped at 570 s) | 66.4 | unavailable (stopped) | unavailable | 127.5* | 231 of 255 (90.6 %) | 24 (91 / 127 / 156; every census unfinished) |
| `hl-26x26-hell-1` (rep 1) | 10 (complete) | 315.3 | 248.1 | 563.4 | 29.3 | 223 of 293 (76.1 %) | 70 (77 / 116 / 136; every census unfinished) |

The three Hell 1 captures made a set (attempt 0 on 14x14 and 24x24; attempt 7 on 26x26, after seven calibrations in which
every profile was unrateable, 40.7 s each). The batch is slow: by the 570 s limit 14x14 and 24x24 had 2 puzzles each (the
calibration's puzzle and one more, about 500 s after the set), 26x26 made its 10 puzzles in 248 s. The accepted puzzles are
Hell 1 (scores 91 to 109 in the accepted events, on the band 77-112) and every rated profile of these captures has an
unfinished census, so every rating is an estimate. The landscape rows of the same cases (`26x26-hell-1` 45 %; `14x14-hell-1`,
`24x24-hell-1` 0 %) are in the table below, in their own columns.

**All Hell cases of the landscape, request by request (MP12b1's reports; `†` marks the 16 reduced cases named in the
dispatch addendum and `14x14-hell-1`, whose times are not slot-protected).** "Requests" is the number MP12b1 ran (3 for a reduced case, 20
otherwise); `set:time-limit` is a request that ended at the 115 s set stage without a set; `time-limit` a request that made
a set and was stopped with fewer than ten puzzles. Ratings per accepted puzzle are unavailable for every row but the three
that made puzzles (the HL captures above): a reduced case accepted no puzzle in three requests.

| Case | Area | Status | Requests | Accepted puzzles per request | Outcome per request (reason) | Response time per request (s) | Request completion rate | Capture of this task |
|---|---|---|---|---|---|---|---|---|
| 14x14-hell-1 | 196 | measured | 20 | 0 x2, 1 x2, 0, 1, 0 x6, 1, 0 x3, 1, 0 x3 | set:time-limit x2, time-limit x2, set:time-limit, time-limit, set:time-limit x6, time-limit, set:time-limit x3, time-limit, set:time-limit x3 | min 115.0†, median 115.0†, max 229.1† | 0.0 % | HL: hl-14x14-hell-1 |
| 15x15b10-hell-1 | 215 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 16x16-hell-1 | 256 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 15x20-hell-1 | 300 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 15x20-hell-2 | 300 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | H: h-15x20-hell-2 |
| 18x18-hell-1 | 324 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 18x18-hell-2 | 324 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | H: h-18x18-hell-2 |
| 18x20-hell-1 | 360 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 18x20-hell-2 | 360 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 20x20-hell-1 | 400 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 20x20-hell-2 | 400 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 20x21-hell-1 | 420 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 20x21-hell-2 | 420 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 32x15-hell-1 | 480 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 32x15-hell-2 | 480 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 32x15-hell-3 | 480 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | H: h-32x15-hell-3 |
| 22x22-hell-1 | 484 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0†, 115.0†, 115.0† | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 22x22-hell-2 | 484 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0, 115.0, 115.0 | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 22x22-hell-3 | 484 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0, 115.0, 115.0 | unavailable (reduced) | H: h-22x22-hell-3 |
| 24x24-hell-1 | 576 | measured | 20 | 0 x2, 2, 0, 5, 0 x4, 2, 0, 1, 0 x5, 1 x3 | set:time-limit x2, time-limit, set:time-limit, time-limit, set:time-limit x4, time-limit, set:time-limit, time-limit, set:time-limit x5, time-limit x3 | min 115.0, median 115.0, max 211.4 | 0.0 % | HL: hl-24x24-hell-1 |
| 24x24-hell-2 | 576 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0, 115.0, 115.0 | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 24x24-hell-3 | 576 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0, 115.0, 115.0 | unavailable (reduced) | H: h-24x24-hell-3 |
| 26x26-hell-1 | 676 | measured | 20 | 5, 10 x2, 8, 10, 9, 10 x2, 2, 10, 1, 2, 1, 10 x2, 5, 2, 10, 8, 1 | time-limit, complete x2, time-limit, complete, time-limit, complete x2, time-limit, complete, time-limit x3, complete x2, time-limit x2, complete, time-limit x2 | min 68.7, median 158.2, max 206.7 | 45.0 % | HL: hl-26x26-hell-1 |
| 26x26-hell-2 | 676 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0, 115.0, 115.0 | unavailable (reduced) | no capture (P-OD9: no further evidence) |
| 26x26-hell-3 | 676 | reduced (P-OD9) | 3 | 0 x3 | set:time-limit x3 | 115.0, 115.0, 115.0 | unavailable (reduced) | no capture (P-OD9: no further evidence) |

**Reading** (the plan author's, PR-P2, part 1, point 1): the evidence shows that this search does not reach the Hell
bands, not that the bands are unreachable under v3. In 22 of the 25 Hell cases no request made a set; the three that did
are Hell 1 on 14x14, 24x24 and 26x26, and none of them completes 90 % of its 20 requests (best 45 %, section 9).


## 8. The stall stop (MP12b2-B04)

`STALL_LIMIT` is 12 (`core/engine/clues.js`, RES-15a, owner decision P-OD4). MP09d2's D21-V3 decision
(`docs/difficulty-v3/d21-v3-2026-11-12.md` section 5.5): the rule is **not inert** on the v3 corpus (it fired on 10
`any`-mode calls at N = 12, on 4 calls at N = 16, and N = 8 misses 3 central results), so 12 stays and the label "inert
on the v3 corpus" is not used. Population S, the re-examination of an inert rule, is therefore **skipped on this source**
(TP28): `$runStallRecheck` stays false because that decision is recorded, never by a search for the word; nothing of S ran,
`stall-simulate.md` does not exist, and no raise to 16 is considered (a raise would need an ordered change round, which is
not ordered). MP09d2's closing sentence, "MP12 re-examines the rule with the landscape data", is applied as this task is
written: the re-examination is population S under an "inert" decision, and there is none. The observer of this task does
not report where the stall stop fired, so the captures say nothing new about it.


## 9. Hell availability (D36 decided (i), owner decision P-OD9; check-list D39; MP12b2-B03, T08, T11)

**No D36 question is asked: the owner decided (i), stop offering what v3 cannot make.** This section records the facts and
derives the areas that MP12b3 writes into `AREAS`; MP12b3 applies the table below and stops if its own computation
differs. The record never calls a cell impossible (cross-review TP08): every row says "no puzzle observed in N requests".
The plan author's reading (PR-P2, part 1, point 1): **the evidence shows that this search does not reach the Hell bands,
not that the bands are unreachable under v3.** The areas below describe this search, and the later improvement feature
(`docs/improve-generating/plan.md`, not authorised) re-derives them by the same rule.

**The evidence the areas rest on** (every source carries the identity of section 1; each row names its source and failure
mode):

- *Hell 1* (12 landscape cases, 196 to 676 cells): three cases made puzzles and ran 20 requests: `14x14-hell-1` (5 puzzles,
  0 % of requests complete), `24x24-hell-1` (13 puzzles, 0 %) and `26x26-hell-1` (134 puzzles, 45.0 %); nine cases (15x15b10,
  16x16, 15x20, 18x18, 18x20, 20x20, 20x21, 32x15, 22x22) made no puzzle in 3 requests, `reduced (P-OD9)`: every request
  ended at the 115 s set stage (`set:time-limit`). HL (section 7) made a set on all three puzzle cases (attempts 0, 0 and 7);
  the availability probe (below) made a calibration on the 164-cell board and none on 400 cells.
- *Hell 2* (9 landscape cases, 300 to 676 cells) and *Hell 3* (4 cases, 480 to 676 cells): every case is `reduced`, no
  puzzle in 3 requests (all `set:time-limit`); H on 15x20 and 18x18 (Hell 2) and on 22x22, 24x24 and 32x15 (Hell 3) made no
  set in 300 s (section 7), and the availability probe none on 266, 400, 450 or 484 cells.
- *Failure mode*: every profile unrateable (capped at the work cap) in every failed calibration, except where rated
  profiles existed, and those lie above the band (Hell 2: 211 to 302 on 15x20 and 18x18, band 112-162; Hell 3: 438 on 22x22,
  band 162-235; the 266-cell probe: best 282).

**The cells without a puzzle** (list 1 of MP12b1's aggregate, 22 cells; "no puzzle observed in N requests", all
`reduced (P-OD9)` with N = 3; the time a request ran before failing is MP12b1's, `†` marking the slot exception of
section 13, item 1, and is for a case without a capture the prescreen's; the captures of this task are in section 7 and
below):

| Board | Area | Level | N (requests) | Failure reasons (requests) | Evidence of this task beyond the landscape | Time a request ran before it failed (s, MP12b1) | Population and source |
|---|---|---|---|---|---|---|---|
| 15x15b10 | 215 | hell-1 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `15x15b10-hell-1` (reduced (P-OD9)), source identity of section 1 |
| 16x16 | 256 | hell-1 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `16x16-hell-1` (reduced (P-OD9)), source identity of section 1 |
| 15x20 | 300 | hell-1 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `15x20-hell-1` (reduced (P-OD9)), source identity of section 1 |
| 15x20 | 300 | hell-2 | 3 | set:time-limit x3 | H `h-15x20-hell-2`: 6 set attempts in 256.5 s (6 not-in-band, 0 carve): 119 profiles, 2 rated / 0 refused / 117 capped; stopped at its limit | 115.0†, 115.0†, 115.0† | landscape case `15x20-hell-2` (reduced (P-OD9)), source identity of section 1; H |
| 18x18 | 324 | hell-1 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `18x18-hell-1` (reduced (P-OD9)), source identity of section 1 |
| 18x18 | 324 | hell-2 | 3 | set:time-limit x3 | H `h-18x18-hell-2`: 4 set attempts in 264.5 s (4 not-in-band, 0 carve): 124 profiles, 14 rated / 0 refused / 110 capped; stopped at its limit | 115.0†, 115.0†, 115.0† | landscape case `18x18-hell-2` (reduced (P-OD9)), source identity of section 1; H |
| 18x20 | 360 | hell-1 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `18x20-hell-1` (reduced (P-OD9)), source identity of section 1 |
| 18x20 | 360 | hell-2 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `18x20-hell-2` (reduced (P-OD9)), source identity of section 1 |
| 20x20 | 400 | hell-1 | 3 | set:time-limit x3 | availability probe `avail-20x20-hell-1`: 3 set attempts (3 not-in-band, 0 carve): 60 profiles, 0 rated / 0 refused / 60 capped | 115.0†, 115.0†, 115.0† | landscape case `20x20-hell-1` (reduced (P-OD9)), source identity of section 1; availability probe |
| 20x20 | 400 | hell-2 | 3 | set:time-limit x3 | availability probe `avail-20x20-hell-2`: 3 set attempts (3 not-in-band, 0 carve): 60 profiles, 0 rated / 0 refused / 60 capped | 115.0†, 115.0†, 115.0† | landscape case `20x20-hell-2` (reduced (P-OD9)), source identity of section 1; availability probe |
| 20x21 | 420 | hell-1 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `20x21-hell-1` (reduced (P-OD9)), source identity of section 1 |
| 20x21 | 420 | hell-2 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `20x21-hell-2` (reduced (P-OD9)), source identity of section 1 |
| 32x15 | 480 | hell-1 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `32x15-hell-1` (reduced (P-OD9)), source identity of section 1 |
| 32x15 | 480 | hell-2 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `32x15-hell-2` (reduced (P-OD9)), source identity of section 1 |
| 32x15 | 480 | hell-3 | 3 | set:time-limit x3 | H `h-32x15-hell-3`: 13 set attempts in 288.0 s (5 not-in-band, 8 carve): 100 profiles, 0 rated / 0 refused / 100 capped; stopped at its limit | 115.0†, 115.0†, 115.0† | landscape case `32x15-hell-3` (reduced (P-OD9)), source identity of section 1; H |
| 22x22 | 484 | hell-1 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0†, 115.0†, 115.0† | landscape case `22x22-hell-1` (reduced (P-OD9)), source identity of section 1 |
| 22x22 | 484 | hell-2 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0, 115.0, 115.0 | landscape case `22x22-hell-2` (reduced (P-OD9)), source identity of section 1 |
| 22x22 | 484 | hell-3 | 3 | set:time-limit x3 | H `h-22x22-hell-3`: 13 set attempts in 269.2 s (5 not-in-band, 8 carve): 93 profiles, 1 rated / 0 refused / 92 capped; stopped at its limit; availability probe `avail-22x22-hell-3`: 3 set attempts (2 not-in-band, 1 carve): 40 profiles, 0 rated / 0 refused / 40 capped | 115.0, 115.0, 115.0 | landscape case `22x22-hell-3` (reduced (P-OD9)), source identity of section 1; H; availability probe |
| 24x24 | 576 | hell-2 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0, 115.0, 115.0 | landscape case `24x24-hell-2` (reduced (P-OD9)), source identity of section 1 |
| 24x24 | 576 | hell-3 | 3 | set:time-limit x3 | H `h-24x24-hell-3`: 6 set attempts in 278.9 s (6 not-in-band, 0 carve): 120 profiles, 0 rated / 0 refused / 120 capped; stopped at its limit | 115.0, 115.0, 115.0 | landscape case `24x24-hell-3` (reduced (P-OD9)), source identity of section 1; H |
| 26x26 | 676 | hell-2 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0, 115.0, 115.0 | landscape case `26x26-hell-2` (reduced (P-OD9)), source identity of section 1 |
| 26x26 | 676 | hell-3 | 3 | set:time-limit x3 | no capture (PR-P2 amendment; P-OD9: no further evidence) | 115.0, 115.0, 115.0 | landscape case `26x26-hell-3` (reduced (P-OD9)), source identity of section 1 |

**The availability probe again under the final tuple** (TP25; the six captures of MP09d2's record section 4, seed
`t18-big-a`, three set attempts each, serial, `spent.mjs` observer, 570 s limit, through the lock helper; identity rows
before and after equal to section 1; set attempts, not full requests, so they never mix with the quantity-10 requests):

##### avail-13x13b5-hell-1.jsonl

| Call | Rated | Refused (AR1) | Capped | Best score | In band | Result |
|---|---|---|---|---|---|---|
| avail-13x13b5-hell-1/set/0 | 12 | 0 | 6 | 167 | yes | ok 93 (7 clues) |
| avail-13x13b5-hell-1/set/1 | 20 | 0 | 2 | 178 | yes | ok 102 (8 clues) |
| avail-13x13b5-hell-1/set/2 | 10 | 0 | 54 | 166 | no | not-in-band |

- {"label":"avail-13x13b5-hell-1","ev":"start","levelId":"hell-1","seedText":"t18-big-a","attempts":3,"cols":13,"rows":13,"blocked":5,"area":164}
- {"label":"avail-13x13b5-hell-1","ev":"set-attempt","j":0,"ok":true,"reason":null,"K":30,"calibrationScore":93}
- {"label":"avail-13x13b5-hell-1","ev":"set-attempt","j":1,"ok":true,"reason":null,"K":31,"calibrationScore":102}
- {"label":"avail-13x13b5-hell-1","ev":"set-attempt","j":2,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-13x13b5-hell-1","ev":"end"}

Total: 3 calls, 42 rated, 0 refused, 62 capped, 2 set attempts ok, 1 failed

##### avail-19x14-hell-2.jsonl

| Call | Rated | Refused (AR1) | Capped | Best score | In band | Result |
|---|---|---|---|---|---|---|
| avail-19x14-hell-2/set/0 | 6 | 0 | 58 | 267 | no | not-in-band |
| avail-19x14-hell-2/set/2 | 20 | 0 | 44 | 282 | no | not-in-band |

- {"label":"avail-19x14-hell-2","ev":"start","levelId":"hell-2","seedText":"t18-big-a","attempts":3,"cols":19,"rows":14,"blocked":0,"area":266}
- {"label":"avail-19x14-hell-2","ev":"set-attempt","j":0,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-19x14-hell-2","ev":"set-attempt","j":1,"ok":false,"reason":"carve","K":null,"calibrationScore":null}
- {"label":"avail-19x14-hell-2","ev":"set-attempt","j":2,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-19x14-hell-2","ev":"end"}

Total: 2 calls, 26 rated, 0 refused, 102 capped, 0 set attempts ok, 3 failed

##### avail-20x20-hell-1.jsonl

| Call | Rated | Refused (AR1) | Capped | Best score | In band | Result |
|---|---|---|---|---|---|---|
| avail-20x20-hell-1/set/0 | 0 | 0 | 20 | - | no | not-in-band |
| avail-20x20-hell-1/set/1 | 0 | 0 | 20 | - | no | not-in-band |
| avail-20x20-hell-1/set/2 | 0 | 0 | 20 | - | no | not-in-band |

- {"label":"avail-20x20-hell-1","ev":"start","levelId":"hell-1","seedText":"t18-big-a","attempts":3,"cols":20,"rows":20,"blocked":0,"area":400}
- {"label":"avail-20x20-hell-1","ev":"set-attempt","j":0,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-20x20-hell-1","ev":"set-attempt","j":1,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-20x20-hell-1","ev":"set-attempt","j":2,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-20x20-hell-1","ev":"end"}

Total: 3 calls, 0 rated, 0 refused, 60 capped, 0 set attempts ok, 3 failed

##### avail-20x20-hell-2.jsonl

| Call | Rated | Refused (AR1) | Capped | Best score | In band | Result |
|---|---|---|---|---|---|---|
| avail-20x20-hell-2/set/0 | 0 | 0 | 20 | - | no | not-in-band |
| avail-20x20-hell-2/set/1 | 0 | 0 | 20 | - | no | not-in-band |
| avail-20x20-hell-2/set/2 | 0 | 0 | 20 | - | no | not-in-band |

- {"label":"avail-20x20-hell-2","ev":"start","levelId":"hell-2","seedText":"t18-big-a","attempts":3,"cols":20,"rows":20,"blocked":0,"area":400}
- {"label":"avail-20x20-hell-2","ev":"set-attempt","j":0,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-20x20-hell-2","ev":"set-attempt","j":1,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-20x20-hell-2","ev":"set-attempt","j":2,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-20x20-hell-2","ev":"end"}

Total: 3 calls, 0 rated, 0 refused, 60 capped, 0 set attempts ok, 3 failed

##### avail-22x22-hell-3.jsonl

| Call | Rated | Refused (AR1) | Capped | Best score | In band | Result |
|---|---|---|---|---|---|---|
| avail-22x22-hell-3/set/0 | 0 | 0 | 20 | - | no | not-in-band |
| avail-22x22-hell-3/set/2 | 0 | 0 | 20 | - | no | not-in-band |

- {"label":"avail-22x22-hell-3","ev":"start","levelId":"hell-3","seedText":"t18-big-a","attempts":3,"cols":22,"rows":22,"blocked":0,"area":484}
- {"label":"avail-22x22-hell-3","ev":"set-attempt","j":0,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-22x22-hell-3","ev":"set-attempt","j":1,"ok":false,"reason":"carve","K":null,"calibrationScore":null}
- {"label":"avail-22x22-hell-3","ev":"set-attempt","j":2,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-22x22-hell-3","ev":"end"}

Total: 2 calls, 0 rated, 0 refused, 40 capped, 0 set attempts ok, 3 failed

##### avail-25x18-hell-3.jsonl

| Call | Rated | Refused (AR1) | Capped | Best score | In band | Result |
|---|---|---|---|---|---|---|
| avail-25x18-hell-3/set/0 | 0 | 0 | 20 | - | no | not-in-band |
| avail-25x18-hell-3/set/1 | 0 | 0 | 20 | - | no | not-in-band |
| avail-25x18-hell-3/set/2 | 0 | 0 | 20 | - | no | not-in-band |

- {"label":"avail-25x18-hell-3","ev":"start","levelId":"hell-3","seedText":"t18-big-a","attempts":3,"cols":25,"rows":18,"blocked":0,"area":450}
- {"label":"avail-25x18-hell-3","ev":"set-attempt","j":0,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-25x18-hell-3","ev":"set-attempt","j":1,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-25x18-hell-3","ev":"set-attempt","j":2,"ok":false,"reason":"not-in-band","K":null,"calibrationScore":null}
- {"label":"avail-25x18-hell-3","ev":"end"}

Total: 3 calls, 0 rated, 0 refused, 60 capped, 0 set attempts ok, 3 failed

Total over 6 files: 16 calls, 68 rated, 0 refused, 384 capped, 2 set attempts ok, 16 failed

Side by side with MP09d2's results (`d21-v3-2026-11-12.md` section 4, history, measured on `eea5fed` before MP12a changed
`SCORE_V3` and `DEDUCE.census`; never pooled): the counts are identical in every capture (164 cells: 2 of 3 attempts
made a calibration in band, scores 93 and 102 against 93 and 103, 42 rated and 62 capped profiles in both; 266 cells: no
set, 26 rated profiles with the best at 282 against 281, above the band, 102 capped; 400, 450 and 484 cells: every profile
capped), and the capture times are 238.7, 116.3, 291.9, 123.3, 141.1 and 96.2 s against 232, 118, 288, 122, 142 and 97 s.
Hell 1 on the 164-cell board is the one Hell cell this search made under v3 outside the landscape: there is no landscape
case on 164 cells (the smallest Hell 1 case is 14x14, 196 cells, whose 20 requests completed 0 %), so no 20-request
completion rate exists for it and D39 cannot offer it (named item 2 of section 13).

**The derived areas (check-list D39).** Per Hell level, its landscape cases in ascending area: `N` is the number of
requests of the case's selected report, "meets" yes exactly when N is 20, the status `measured` and `requestInBandRate` at
least 0.90 (at least 18 of the 20 requests completed ten in-band puzzles, the acceptance of design §7.8 that the other
levels are held to). The interval is written as MP12b3 will write it in `AREAS` (`[lo, hi]`, `hi` `Infinity` when the run
of meeting cases reaches the level's largest case, `[Infinity, Infinity]` when no case meets), after the contiguity step
(a Hell level is offered only where the level below it is):

Evidence rule (D39): a case meets when its `requiredN` is 20, its status is `measured` and its cell's `requestInBandRate` is at least 0.90.

**Hell 1** (current `AREAS` entry `[164, Infinity]`)

| Case | Area | N (requests) | Status | `requestInBandRate` | Meets |
|---|---|---|---|---|---|
| 14x14-hell-1 | 196 | 20 | measured | 0.0 % | no |
| 15x15b10-hell-1 | 215 | 3 | reduced (P-OD9) | unavailable | no |
| 16x16-hell-1 | 256 | 3 | reduced (P-OD9) | unavailable | no |
| 15x20-hell-1 | 300 | 3 | reduced (P-OD9) | unavailable | no |
| 18x18-hell-1 | 324 | 3 | reduced (P-OD9) | unavailable | no |
| 18x20-hell-1 | 360 | 3 | reduced (P-OD9) | unavailable | no |
| 20x20-hell-1 | 400 | 3 | reduced (P-OD9) | unavailable | no |
| 20x21-hell-1 | 420 | 3 | reduced (P-OD9) | unavailable | no |
| 32x15-hell-1 | 480 | 3 | reduced (P-OD9) | unavailable | no |
| 22x22-hell-1 | 484 | 3 | reduced (P-OD9) | unavailable | no |
| 24x24-hell-1 | 576 | 20 | measured | 0.0 % | no |
| 26x26-hell-1 | 676 | 20 | measured | 45.0 % | no |

**Hell 2** (current `AREAS` entry `[266, Infinity]`)

| Case | Area | N (requests) | Status | `requestInBandRate` | Meets |
|---|---|---|---|---|---|
| 15x20-hell-2 | 300 | 3 | reduced (P-OD9) | unavailable | no |
| 18x18-hell-2 | 324 | 3 | reduced (P-OD9) | unavailable | no |
| 18x20-hell-2 | 360 | 3 | reduced (P-OD9) | unavailable | no |
| 20x20-hell-2 | 400 | 3 | reduced (P-OD9) | unavailable | no |
| 20x21-hell-2 | 420 | 3 | reduced (P-OD9) | unavailable | no |
| 32x15-hell-2 | 480 | 3 | reduced (P-OD9) | unavailable | no |
| 22x22-hell-2 | 484 | 3 | reduced (P-OD9) | unavailable | no |
| 24x24-hell-2 | 576 | 3 | reduced (P-OD9) | unavailable | no |
| 26x26-hell-2 | 676 | 3 | reduced (P-OD9) | unavailable | no |

**Hell 3** (current `AREAS` entry `[450, Infinity]`)

| Case | Area | N (requests) | Status | `requestInBandRate` | Meets |
|---|---|---|---|---|---|
| 32x15-hell-3 | 480 | 3 | reduced (P-OD9) | unavailable | no |
| 22x22-hell-3 | 484 | 3 | reduced (P-OD9) | unavailable | no |
| 24x24-hell-3 | 576 | 3 | reduced (P-OD9) | unavailable | no |
| 26x26-hell-3 | 676 | 3 | reduced (P-OD9) | unavailable | no |

| Level | Interval of its own cases | After the contiguity step (Hell 2 with Hell 1, Hell 3 with Hell 2) | Written by MP12b3 as |
|---|---|---|---|
| Hell 1 | `[Infinity, Infinity]` | `[Infinity, Infinity]` | `[Infinity, Infinity]` |
| Hell 2 | `[Infinity, Infinity]` | `[Infinity, Infinity]` | `[Infinity, Infinity]` |
| Hell 3 | `[Infinity, Infinity]` | `[Infinity, Infinity]` | `[Infinity, Infinity]` |

Hell 4 and beyond stay as they are (no landscape case).

**A cell that is not Hell without a puzzle: none.** Every one of the 80 non-Hell cases has accepted v3 puzzles (the lowest
request completion rate is 6x10 very easy, 65 %, with 187 accepted puzzles), and Nightmare made puzzles on every board
(section 3). Nothing for the orchestrator to ask the owner under P-OD9's (i); MP12b3 changes only the Hell levels.


## 10. The fail-fast proposal (D36, check-list D40; owner question 1; MP12b2-B03)

A set request that cannot succeed ends today after two minutes (the two-worker flow's 115 s dispatch stop) or runs on
(serial). After P-OD9 the Hell levels stop being offered where v3 cannot make them (section 9), but irregular boards can
still meet unrateable sets, and Nightmare calls still meet unrateable profiles (N). The check below is made over the
captures of R, A, H, HL and N (`failfast.mjs`, written once, with its self-test).

**1. Numbers.**

- *Time per unrateable rating* (the `ms` of the `capped` attempts, `summary.md`): H median 2.17 s, largest 2.72 s; HL
  median 2.12 s, largest 2.94 s; N median 2.10 s, largest 3.24 s. A capped rating stops at the work cap (about 760 million
  work units), so it costs the same wherever it happens. A rated rating costs a median of 2.5 s (H), 2.1 s (HL) and 1.2 s (N)
  (section 6).
- *Profiles a failed calibration spends*: 22 of the 26 not-in-band calibrations of H spent exactly 20 profiles, every one
  capped (MP09c's S5b); the other four spent 18 (`h-15x20-hell-2` set attempt 0: 1 rated, 17 capped), 21 (attempt 4: 1 rated,
  20 capped), 64 (`h-18x18-hell-2` set attempt 2: 14 rated, 50 capped, 136.3 s) and 13 (`h-22x22-hell-3` set attempt 12: 1
  rated, 12 capped). All 7 failed calibrations of HL (`hl-26x26-hell-1`) and the failed calibration of N
  (`n-14x14-nightmare`, attempt 0) spent 20 capped profiles.
- *Set attempts before the limit* (serial, 300 s): `h-22x22-hell-3` 13 (5 not-in-band at 43.6 s median, 8 carve failures at
  7.9 s), `h-32x15-hell-3` 13 (5 and 8), `h-24x24-hell-3` 6, `h-15x20-hell-2` 6, `h-18x18-hell-2` 4. *Time to failure*: serial,
  no H capture ended by itself within 300 s; two-worker, 115 s (`TIME.dispatchStopMs`; MP09d2's recipe measurement: 115.0 s,
  13 set-attempt tasks dispatched over two workers). `hl-26x26-hell-1` needed seven failed attempts and 315.3 s for its set.
- *N cells* (any mode, quantity 5, rep 0): share of capped raw attempts 67.3 % (12x12: 35 of 52), 86.7 % (14x14: 229 of 264), 46.9 %
  (15x15b10: 15 of 32), 27.3 % (15x20: 3 of 11) and 63.4 % (16x16: 52 of 82); time per capped rating a median of 1.8 to 2.3 s,
  per rated rating 0.5 to 2.4 s (`summary.md`, population `nightmare`).

**2. Mechanisms and their predicted time to failure** (counterfactual estimates from the serial captures, never
measurements of a built mechanism; serial and two-worker are kept apart: the serial figures are the stop times of
`failfast.md` for the five H captures, in which every set attempt before the firing one counts, a carve failure included
(`h-32x15-hell-3` opens with one that costs 8.8 s); the two-worker figure rests on MP09d2's 115 s and on the attempt times
above, since this task made no two-worker capture):

| Mechanism | What it does | Predicted time to failure, serial (the five Hell cells of H) | Predicted, two-worker flow | Saving |
|---|---|---|---|---|
| F1 | a set request ends after the first set attempt whose calibration had no rated profile and every profile unrateable | 42.7 to 82.8 s (median of the five 46.0 s; by capture below) instead of the 300 s limit | about 43 to 46 s (the lowest all-unrateable attempt to report; attempts run side by side on two workers) instead of 115 s | about 70 s of 115 s; counterfactual estimate |
| F2 | a selection call ends after its first four profiles when all four are unrateable | a call is cut after about 8.7 s (median of the first four ratings of the 25 firing calls of H, 8.1 s for HL, 8.3 s for N) instead of 43.0 s (40.8 s, 39.5 s); a request still runs to its limit | a request still ends at 115 s, with about five times the attempts | none for the request; 80 % per calibration |
| F1 + F2 | both, F1 reading the calibration as F2 has cut it | 8.4 to 17.4 s (median 9.1 s) | about 9 s | about 106 s of 115 s; counterfactual estimate |

The serial stop times by capture (F1 / F1 + F2, in seconds): `h-15x20-hell-2` 82.8 / 8.4 (attempt 0 had rated profiles, so F1
fires at attempt 1), `h-18x18-hell-2` 42.7 / 8.5, `h-22x22-hell-3` 43.1 / 9.1, `h-24x24-hell-3` 46.0 / 9.6 and
`h-32x15-hell-3` 51.9 / 17.4 (after the carve failure).

**3. The false-stop check.** Over the 33 captures (26 completed baselines: R 8, A 12, N 5 and one HL; the five H captures and
two HL captures are censored at their limits). Results of `failfast.md` (all populations) and `failfast-nightmare.md` (N
alone, PR-P2 amendment):

#### Fail-fast false-stop check (MP12b2)

Files evaluated: 33; completed baselines (an end event): 26; censored captures (stopped at their limit): 7.
F2 fires on a selection call whose first four raw attempts are all capped (false stop when the call returned a result).
F1 fires at the first set attempt whose raw attempts are not empty and all capped (false stop when that set attempt or a later one was ok;
a correct stop in a completed baseline; unknown in a censored tail). F1 + F2 reads each set attempt as F2 has cut it and stops the walk at an F2 false stop;
when F1 never fires, F2 cuts of batch calls are judged as for F2.

##### Mechanisms

| Mechanism | Files evaluated | Completed baselines evaluated | Triggers | Observed false stops | Correct stops | Unknown outcomes | Reading |
|---|---|---|---|---|---|---|---|
| F2 | 33 | 26 | 67 | 17 | 50 | 0 | not proposable: 17 observed false stop(s) |
| F1 | 33 | 26 | 7 | 2 | 0 | 5 | not proposable: 2 observed false stop(s) |
| F1 + F2 | 33 | 26 | 21 | 5 | 11 | 5 | not proposable: 5 observed false stop(s) |

##### Per file

| File | Population | Completed baseline | Calls | F2 triggers/false/correct | F1 triggers/false/correct/unknown | F1 + F2 triggers/false/correct/unknown | Set stage observed (s) | F1 stop at (s) | F1 + F2 stop at (s) | F2 time saved on cut calls (s) |
|---|---|---|---|---|---|---|---|---|---|---|
| r-18x20-expert.jsonl | require | yes | 16 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 2.5 | - | - | - |
| r-18x20-hard.jsonl | require | yes | 27 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 17.5 | - | - | - |
| r-18x20-master.jsonl | require | yes | 17 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 73.5 | - | - | - |
| r-6x10-easy.jsonl | require | yes | 11 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.1 | - | - | - |
| r-6x10-expert.jsonl | require | yes | 11 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.8 | - | - | - |
| r-6x10-hard.jsonl | require | yes | 11 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.1 | - | - | - |
| r-6x10-master.jsonl | require | yes | 12 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 6.4 | - | - | - |
| r-6x10-normal.jsonl | require | yes | 10 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.2 | - | - | - |
| a-10x10-expert.jsonl | any | yes | 6 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.8 | - | - | - |
| a-10x10-hard.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.0 | - | - | - |
| a-10x10-master.jsonl | any | yes | 6 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 1.2 | - | - | - |
| a-12x12-expert.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.1 | - | - | - |
| a-12x12-hard.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.1 | - | - | - |
| a-12x12-master.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.5 | - | - | - |
| a-18x20-expert.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.2 | - | - | - |
| a-18x20-hard.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.2 | - | - | - |
| a-18x20-master.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 1.0 | - | - | - |
| a-6x10-expert.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.1 | - | - | - |
| a-6x10-hard.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.0 | - | - | - |
| a-6x10-master.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.3 | - | - | - |
| h-15x20-hell-2.jsonl | hell | no | 6 | 6/0/6 | 1/0/0/1 | 1/0/0/1 | censored | 82.8 | 8.4 | 198.7 |
| h-18x18-hell-2.jsonl | hell | no | 4 | 3/0/3 | 1/0/0/1 | 1/0/0/1 | censored | 42.7 | 8.5 | 101.0 |
| h-22x22-hell-3.jsonl | hell | no | 5 | 5/0/5 | 1/0/0/1 | 1/0/0/1 | censored | 43.1 | 9.1 | 160.6 |
| h-24x24-hell-3.jsonl | hell | no | 6 | 6/0/6 | 1/0/0/1 | 1/0/0/1 | censored | 46.0 | 9.6 | 221.9 |
| h-32x15-hell-3.jsonl | hell | no | 5 | 5/0/5 | 1/0/0/1 | 1/0/0/1 | censored | 51.9 | 17.4 | 174.7 |
| hl-14x14-hell-1.jsonl | hell-landscape | no | 5 | 1/0/1 | 0/0/0/0 | 1/0/1/0 | censored | - | - | 137.3 |
| hl-24x24-hell-1.jsonl | hell-landscape | no | 12 | 10/0/10 | 0/0/0/0 | 10/0/10/0 | censored | - | - | 331.1 |
| hl-26x26-hell-1.jsonl | hell-landscape | yes | 17 | 13/6/7 | 1/1/0/0 | 1/1/0/0 | 315.3 | 42.0 | 9.1 | 369.7 |
| n-12x12-nightmare.jsonl | nightmare | yes | 5 | 1/1/0 | 0/0/0/0 | 1/1/0/0 | 4.4 | - | - | 57.5 |
| n-14x14-nightmare.jsonl | nightmare | yes | 12 | 11/4/7 | 1/1/0/0 | 1/1/0/0 | 59.7 | 41.0 | 7.9 | 437.1 |
| n-15x15b10-nightmare.jsonl | nightmare | yes | 5 | 1/1/0 | 0/0/0/0 | 1/1/0/0 | 18.8 | - | - | 9.9 |
| n-15x20-nightmare.jsonl | nightmare | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 2.8 | - | - | - |
| n-16x16-nightmare.jsonl | nightmare | yes | 5 | 5/5/0 | 0/0/0/0 | 1/1/0/0 | 19.7 | - | - | 88.1 |

##### False stops and unknown outcomes

- h-15x20-hell-2.jsonl, F1: unknown at set attempt 1 (censored tail)
- h-15x20-hell-2.jsonl, F1 + F2: unknown at set attempt 0 (censored tail)
- h-18x18-hell-2.jsonl, F1: unknown at set attempt 0 (censored tail)
- h-18x18-hell-2.jsonl, F1 + F2: unknown at set attempt 0 (censored tail)
- h-22x22-hell-3.jsonl, F1: unknown at set attempt 0 (censored tail)
- h-22x22-hell-3.jsonl, F1 + F2: unknown at set attempt 0 (censored tail)
- h-24x24-hell-3.jsonl, F1: unknown at set attempt 0 (censored tail)
- h-24x24-hell-3.jsonl, F1 + F2: unknown at set attempt 0 (censored tail)
- h-32x15-hell-3.jsonl, F1: unknown at set attempt 1 (censored tail)
- h-32x15-hell-3.jsonl, F1 + F2: unknown at set attempt 1 (censored tail)
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/2/0
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/3/0
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/6/0
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/7/0
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/9/0
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/10/0
- hl-26x26-hell-1.jsonl, F1: false stop at set attempt 0
- hl-26x26-hell-1.jsonl, F1 + F2: false stop at set attempt 0
- n-12x12-nightmare.jsonl, F2: false stop at n-12x12-nightmare/slot/2/0
- n-12x12-nightmare.jsonl, F1 + F2: false stop at n-12x12-nightmare/slot/2/0
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/set/1
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/slot/2/2
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/slot/3/0
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/slot/5/2
- n-14x14-nightmare.jsonl, F1: false stop at set attempt 0
- n-14x14-nightmare.jsonl, F1 + F2: false stop at set attempt 0
- n-15x15b10-nightmare.jsonl, F2: false stop at n-15x15b10-nightmare/set/0
- n-15x15b10-nightmare.jsonl, F1 + F2: false stop at n-15x15b10-nightmare/set/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/set/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/2/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/3/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/4/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/5/0
- n-16x16-nightmare.jsonl, F1 + F2: false stop at n-16x16-nightmare/set/0

##### Per population

| Population | Files | Completed baselines | F2 triggers/false | F1 triggers/false/unknown | F1 + F2 triggers/false/unknown |
|---|---|---|---|---|---|
| require | 8 | 8 | 0/0 | 0/0/0 | 0/0/0 |
| any | 12 | 12 | 0/0 | 0/0/0 | 0/0/0 |
| hell | 5 | 0 | 25/0 | 5/0/5 | 5/0/5 |
| hell-landscape | 3 | 1 | 24/6 | 1/1/0 | 12/1/0 |
| nightmare | 5 | 5 | 18/11 | 1/1/0 | 4/4/0 |

##### Diagnostic: leading capped raw attempts of the calls that returned a result

Not a mechanism and not a proposal: how many raw attempts of a call were capped before its first rated one, among the calls that returned a result (a stop after n capped attempts is a false stop for each call at or above n).

| Population | Calls with a result | Calls with no leading capped attempt | Leading capped >= 4 | >= 8 | >= 12 | >= 16 | >= 20 | Largest |
|---|---|---|---|---|---|---|---|---|
| require | 74 | 74 | 0 | 0 | 0 | 0 | 0 | 0 |
| any | 62 | 62 | 0 | 0 | 0 | 0 | 0 | 0 |
| hell | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - |
| hell-landscape | 14 | 0 | 6 | 3 | 0 | 0 | 0 | 9 |
| nightmare | 25 | 4 | 11 | 7 | 3 | 2 | 0 | 18 |

The times are those of serial captures: F1 stop at = the set attempts up to and including the firing one; F1 + F2 stop at = the same with the firing attempt cut after its first four ratings;
the saving of F2 on a cut call = its time minus the time of its first four ratings. They are counterfactual estimates, never measurements of a built mechanism.

N alone (the Nightmare cells, where F2 would act once no Hell level is offered):

#### Fail-fast false-stop check (MP12b2)

Files evaluated: 5; completed baselines (an end event): 5; censored captures (stopped at their limit): 0.
F2 fires on a selection call whose first four raw attempts are all capped (false stop when the call returned a result).
F1 fires at the first set attempt whose raw attempts are not empty and all capped (false stop when that set attempt or a later one was ok;
a correct stop in a completed baseline; unknown in a censored tail). F1 + F2 reads each set attempt as F2 has cut it and stops the walk at an F2 false stop;
when F1 never fires, F2 cuts of batch calls are judged as for F2.

##### Mechanisms

| Mechanism | Files evaluated | Completed baselines evaluated | Triggers | Observed false stops | Correct stops | Unknown outcomes | Reading |
|---|---|---|---|---|---|---|---|
| F2 | 5 | 5 | 18 | 11 | 7 | 0 | not proposable: 11 observed false stop(s) |
| F1 | 5 | 5 | 1 | 1 | 0 | 0 | not proposable: 1 observed false stop(s) |
| F1 + F2 | 5 | 5 | 4 | 4 | 0 | 0 | not proposable: 4 observed false stop(s) |

##### Per file

| File | Population | Completed baseline | Calls | F2 triggers/false/correct | F1 triggers/false/correct/unknown | F1 + F2 triggers/false/correct/unknown | Set stage observed (s) | F1 stop at (s) | F1 + F2 stop at (s) | F2 time saved on cut calls (s) |
|---|---|---|---|---|---|---|---|---|---|---|
| n-12x12-nightmare.jsonl | nightmare | yes | 5 | 1/1/0 | 0/0/0/0 | 1/1/0/0 | 4.4 | - | - | 57.5 |
| n-14x14-nightmare.jsonl | nightmare | yes | 12 | 11/4/7 | 1/1/0/0 | 1/1/0/0 | 59.7 | 41.0 | 7.9 | 437.1 |
| n-15x15b10-nightmare.jsonl | nightmare | yes | 5 | 1/1/0 | 0/0/0/0 | 1/1/0/0 | 18.8 | - | - | 9.9 |
| n-15x20-nightmare.jsonl | nightmare | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 2.8 | - | - | - |
| n-16x16-nightmare.jsonl | nightmare | yes | 5 | 5/5/0 | 0/0/0/0 | 1/1/0/0 | 19.7 | - | - | 88.1 |

##### False stops and unknown outcomes

- n-12x12-nightmare.jsonl, F2: false stop at n-12x12-nightmare/slot/2/0
- n-12x12-nightmare.jsonl, F1 + F2: false stop at n-12x12-nightmare/slot/2/0
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/set/1
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/slot/2/2
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/slot/3/0
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/slot/5/2
- n-14x14-nightmare.jsonl, F1: false stop at set attempt 0
- n-14x14-nightmare.jsonl, F1 + F2: false stop at set attempt 0
- n-15x15b10-nightmare.jsonl, F2: false stop at n-15x15b10-nightmare/set/0
- n-15x15b10-nightmare.jsonl, F1 + F2: false stop at n-15x15b10-nightmare/set/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/set/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/2/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/3/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/4/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/5/0
- n-16x16-nightmare.jsonl, F1 + F2: false stop at n-16x16-nightmare/set/0

##### Per population

| Population | Files | Completed baselines | F2 triggers/false | F1 triggers/false/unknown | F1 + F2 triggers/false/unknown |
|---|---|---|---|---|---|
| nightmare | 5 | 5 | 18/11 | 1/1/0 | 4/4/0 |

##### Diagnostic: leading capped raw attempts of the calls that returned a result

Not a mechanism and not a proposal: how many raw attempts of a call were capped before its first rated one, among the calls that returned a result (a stop after n capped attempts is a false stop for each call at or above n).

| Population | Calls with a result | Calls with no leading capped attempt | Leading capped >= 4 | >= 8 | >= 12 | >= 16 | >= 20 | Largest |
|---|---|---|---|---|---|---|---|---|
| nightmare | 25 | 4 | 11 | 7 | 3 | 2 | 0 | 18 |

The times are those of serial captures: F1 stop at = the set attempts up to and including the firing one; F1 + F2 stop at = the same with the firing attempt cut after its first four ratings;
the saving of F2 on a cut call = its time minus the time of its first four ratings. They are counterfactual estimates, never measurements of a built mechanism.

`failfast.mjs --self-test` passed its five synthetic files: (a) four capped raw attempts then a rated out-of-band one,
failing, then a success: F1 0 false stops, F2 0, F1 + F2 1 (SA2's case); (b) a completed request whose every attempt is all
capped: one correct stop for F1 and for F1 + F2, F2 no false stop; (c) four capped raw attempts then a rated in-band one with
`result.ok` true: F2 1 false stop, F1 none, F1 + F2 1; (d) F1 firing at attempt 0 of a file without an `end` event: unknown
1, false stops 0, completed baselines 0; (e) the carve-prefix regression of the cross-review (PLK01): a carve failure of 8,000
ms before the firing set attempt of 43,000 ms gives the stop estimates 51,000 ms (F1) and 8,004 ms (F1 + F2); with the stop
time summed over the attempts that have selection calls only, as the first version did, the estimates are 43,000 and 4 ms and
the case fails.

**Result: no mechanism is proposable.** Each has observed false stops: **F2** 17 of its 67 triggers (11 of the 18 at
Nightmare, 6 of 24 at Hell 1 in `hl-26x26-hell-1`); **F1** 2 of its 7 triggers (`n-14x14-nightmare`: set attempt 0 had all 20
profiles unrateable and the next attempt made the set in 18.7 s; `hl-26x26-hell-1`: attempt 0 unrateable and the set made at
attempt 7); **F1 + F2** 5 of its 21 triggers (4 of 4 at Nightmare), with 5 unknown outcomes (the H captures, censored). The rule of
the task, "a mechanism with an observed false stop is not proposed", applies to F1 + F2, the plan author's recommendation
(PR-P1, PR-P2). The reason is visible in the data: in a call that returns a result, the leading run of unrateable profiles
can be long. The diagnostic table of `failfast.md` counts it: at Nightmare, of 25 calls with a result, 11 began with at
least 4 unrateable profiles, 7 with at least 8, 3 with at least 12, 2 with at least 16, none with 20 (largest 18); the
same holds at Hell 1 (6 of 14 calls with a result begin with 4 or more, largest 9). A threshold at 20 would show no false stop in
this corpus, but most failed calibrations already spend 20 profiles (22 of the 26 of H, all 8 of HL and N), so it would
shorten nothing there.

**The notice F1 would show** when a set request ends (an observation, not a statement of impossibility; the owner's
wording, else this one), English: "Couldn't create a {level} piece set for this board: the difficulty ratings it tried reached
their work limits. Choose another level or change the board." Vietnamese: "Không tạo được bộ mảnh mức {level} cho bàn này: các
lần đo độ khó đã thử đều chạm giới hạn tính toán. Hãy chọn mức khác hoặc đổi bàn." F2 alone adds no notice: a batch call it
cuts is one failed candidate, and the batch keeps its notices.

**Owner question 1 (D40).** "Only **none** satisfies the existing zero-observed-false-stop rule. F1 has 2 false stops / 7
triggers, with 5 unknown; F2 17/67; F1+F2 5/21, with 5 unknown. At Nightmare, F2 loses 11/18 triggered calls and F1+F2 4/4.
Choose none, or explicitly override that rule and select a mechanism? Fixture/recipe protections remain unchanged. SA2
recommends none." The plan author had recommended F1 + F2 before this evidence. With the answer "none" nothing is built,
design §7.5 and MP17's release notes state the limitation, and MP12b3 part B is empty. The alternatives need a decision that
changes a recorded rule: building F1 + F2 anyway accepts the false stops (a request that would have succeeded after a long
run of unrateable profiles ends with the notice, and a fixture puzzle or a UI-flow recipe that changes is a false stop that
stops MP12b3, D40); a different mechanism needs a new analysis and an addendum to MP12b3 before its dispatch.


## 11. The final values and every change since MP08

**The values in the tree and locked** are those of section 1: `SCORE_V3` `base { max: 12, scale: 3 }`, `rule [0, 0, 2, 3]`,
`weights { G: 5, info: 0.5 }`, `penalty { few: 1, many: 2 }` (the tuple `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)` of
the plan author's answer to PR-P1); `DEDUCE` with `census` 80,000,000; `K60`, `SHARES` and `STALL_LIMIT` unchanged.

**Changes since MP08** (all by MP12a, `calibration-slice-2026-11-13.md` sections 3.1 and 3.4; MP12b1 and this task changed
nothing):

| Knob | At MP08 (and MP12a round 0) | Final | Reason |
|---|---|---|---|
| `SCORE_V3.rule[3]` (points of deduction tier 3) | 2 | 3 | P-OD3: the few/many penalty restored with the set of the grid that meets C1 (`rule[2] <= rule[3]`) |
| `SCORE_V3.penalty` | `{ few: 0, many: 0 }` (the initial fit, P-OD3 (a)) | `{ few: 1, many: 2 }` | P-OD3 and SA1-Q-P1: the penalty stays; the data do not separate the two tuples |
| `DEDUCE.census` | 10,000,000 | 80,000,000 | owner decision P-OD7; the remaining estimates of 18x20-master (P-OD7) and 10x10-master (P-OD8) accepted |

**Evidence for the tuple (section 4):** C1, C2, C3 and C5 pass on the GV2 boards and C3 on all 83 measured cells of the
landscape; C4 fails only where the owner accepted it. Every board is strictly ordered over the levels it offers and Hard
and Expert complete 100 % on all 16 boards.

**No change round.** The plan author's rule (PR-P1; check-list D29) orders one only when C1 or C3 fails in a cell that
stays offered, or when C2 fails by more than its 10 points. None did: C1 holds on every board (section 4), C3 holds in all
83 cells (`provedZero` 0), C2 holds in every Hard and Expert cell (100 % against GV2 100 %). A cell above 5 % census
estimates is a listed finding (section 5), a cell above 25 % an owner question, and no census change is made in MP12b;
every Hell finding is a named item (D39 withdraws the Hell levels in MP12b3, P-OD9); nothing else called for a change. So
the complete population was not run again, no knob, cap, `STALL_LIMIT`, re-pin or fixture changed, and GF-P2 was not run.


## 12. The lock (RES-01, RES-25; MP12b2-B05)

**Evidence on the locked tree**, every command under the lock helper (one per acquisition, 15 s gap; `runs.md` has the rows):

| Command | Result | Start-end | Seconds | Lock wait (s) |
|---|---|---|---|---|
| `node tools/record-fixtures.mjs --check` (label `MP12b2 fixture check`) | `record-fixtures: OK` | 13:56:59-13:56:59 | 0.7 | 0 |
| the final `npm test` (GA-P2: `node --test "tests/**/*.test.js"`, TAP reporter to `tests/artifacts/MP12b2/ga-p2-final.txt`, not tracked; label `MP12b2 GA-P2 final npm test`) | 1,360 tests, 125 suites, 1,360 pass, 0 fail, 0 cancelled, 0 skipped; no `EPERM` in the cleanup hook of `tests/site-tools.test.js` (named item 10) | 13:57:14-13:59:18 | 124.2 | 0 |
| the quick set (`--test --test-skip-pattern=slow "tests/**/*.test.js"`, TAP to `tests/artifacts/MP12b2/quick-final.txt`; label `MP12b2 quick set`) | 1,340 tests, 124 suites, 1,340 pass, 0 fail | 13:59:33-13:59:57 | 23.1 | 0 |
| the identity of the locked tree (`computeSourceDigest`, `currentVersions()`; `runs.md` row "identity of the locked tree") | `sourceDigest` `34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918`; versions `gen-v3`, `mixed-v2`, `xoshiro128ss-v1`, `difficulty-v3`; `HEAD` `cd5d17f`, `core` and `tools` clean: equal to the identity of the landscape (MP12b1's aggregate), of the 18 GV2 reports behind section 4 and of every capture of this task | 14:00:12 | - | - |
| `git --no-pager diff --stat -- core tools tests` | empty: this task changed no file of `core/`, `tools/` or `tests/` (no change round, GF-P2 not run); the working tree differs from `HEAD` only by `docs/design-detail.md` (section 7.8) and the new files under `docs/difficulty-v3/` | not timed | - | - |

The identity before the lock commands (`runs.md`, 13:56:58) and the identity after them are the same, so the final
`npm test` ran on the tree whose identity the evidence carries. `npm run check` (conventions and site files), run last after
this record and design §7.8 were complete: `check-conventions: OK`, `check-site: OK`. Machine time of the lock
commands: 148.0 s of command time, no lock wait.

**Statement.** The `difficulty-v3` rating (`SCORE_V3`, `DEDUCE`), the clue search (`gen-v3`, `STALL_LIMIT`), `K60` and `SHARES`
are locked at the commit of MP12b2 (`difficulty-v3 MP12b2`); MP12b3 completes the lock with the availability decided by the
owner (the Hell `AREAS`, P-OD9; the policy id and, when the owner agreed, the fail-fast and the population-R outcome), and
from its commit on no rating or generated puzzle changes. Any later change of a weight, a cap, a band, an availability
interval, a rule of the deduction ladder, the census, a counter, the clue search, `SHARES` or `K60` needs a new model,
algorithm or policy id and a new qualification. The locked values are those of section 1 and are printed by
`core/engine/policy.js` (`SCORE_V3`, `DEDUCE`, `K60`, `POLICY_ID`), `core/engine/levels.js` (`SHARES`) and
`core/engine/clues.js` (`STALL_LIMIT`).


## 13. Findings and questions for the owner

### 13.1 Named items (owner decision P-OD9: findings with their numbers, no stop)

**Item 1. MP12b1 measurement-slot exception (MS05b3, 2026-11-14 03:09 to 06:12).** From 03:09 to 06:12 the Sudoku
repository's task MS05b3 ran generation commands without the shared lock of check-list section 7: 134 commands of at most
10 s each and 25 first attempts stopped at 10 s, 474.5 s of single-thread work in all. 112 of those windows overlapped
MP12b1 invocations that held the lock: 351.3 s in 22 cases (sources: the Sudoku repository's
`docs/difficulty-v3/evidence/MS05b3/runs.jsonl`, MP12b1's `tests/artifacts/MP12b1/invocations.jsonl` and its reports, SA1's
`docs/difficulty-v3/claude-opus-5.5/10-review-of-recovery-steps.md` section 7; the clocks are shared and a window is accurate
to about a second):

| MP12b1 case (report) | Sudoku windows | Overlap (s) | Case's invocation time (s) | MP12b1 outcome | Capture in this task |
|---|---:|---:|---:|---|---|
| `22x22-master` | 3 | 11.4 | 197.8† | 20 of 20 rows complete, max T10 16.2† s | none (not Hell) |
| `24x24-nightmare` | 5 | 18.6 | 601.8† | 20 of 20, max T10 64.0† s | none (not Hell) |
| `26x26-hard` | 1 | 4.0 | 82.0† | 20 of 20, max T10 4.9† s | none (not Hell) |
| `26x26-master` | 2 | 19.0 | 256.0† | 20 of 20, max T10 23.3† s | none (not Hell) |
| `26x26-nightmare` | 1 | 1.0 | 496.7† | 20 of 20, max T10 35.8† s | none (not Hell) |
| `14x14-hell-1` (prescreen) | 4 | 28.0 | 422.3† | 1 accepted puzzle: its 20 requests follow by MP12b1's rule | HL |
| `15x15b10-hell-1` (prescreen) | 1 | 2.0 | 348.0† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `16x16-hell-1` (prescreen) | 4 | 21.5 | 346.6† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `15x20-hell-1` (prescreen) | 9 | 33.9 | 346.7† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `15x20-hell-2` (prescreen) | 30 | 27.3 | 346.8† | no puzzle in 3 requests | H |
| `18x18-hell-1` (prescreen) | 1 | 1.5 | 346.8† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `18x18-hell-2` (prescreen) | 6 | 20.1 | 346.8† | no puzzle in 3 requests | H |
| `18x20-hell-1` (prescreen) | 17 | 45.4 | 346.7† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `18x20-hell-2` (prescreen) | 1 | 6.0 | 346.6† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `20x20-hell-1` (prescreen) | 1 | 7.0 | 346.8† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `20x20-hell-2` (prescreen) | 3 | 26.5 | 346.8† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `20x21-hell-1` (prescreen) | 3 | 12.0 | 347.2† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `20x21-hell-2` (prescreen) | 8 | 18.8 | 346.5† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `32x15-hell-1` (prescreen) | 1 | 10.0 | 346.5† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `32x15-hell-2` (prescreen) | 4 | 18.3 | 346.5† | no puzzle in 3 requests | none (PR-P2 amendment) |
| `32x15-hell-3` (prescreen) | 1 | 3.0 | 346.6† | no puzzle in 3 requests | H |
| `22x22-hell-1` (prescreen) | 6 | 15.9 | 346.6† | no puzzle in 3 requests | none (PR-P2 amendment) |
| **22 cases** | **112** | **351.3** | | | |

`†` marks an MP12b1 time (the case's invocation time and the maximum T10); the overlap column is the Sudoku repository's
work in seconds, not a benchmark time.

*Assessment.* A landscape request has a wall-clock limit (`TIME`: dispatch stop 115 s, response 120 s), and the T10 and
response times are wall times; the rest is work-bounded and fixed by the seed (the generation client folds candidates in a
fixed slot order; the census, the caps, the proved real choice and a puzzle's score count work, not time). So the overlap
can change an outcome only for a request that reaches its limit, and it can only remove work. The machine has 8 cores and
16 logical processors: a landscape row uses a main thread and 4 workers and the Sudoku command one thread, so nothing was
oversubscribed; the effect goes through the shared cache, memory and clock speed, a few per cent at most, during the
overlapped seconds only. The five cells that are not Hell completed 20 of 20 rows, the slowest in 64.0† s, far below the
stop; their puzzles, ratings and C1 to C5 inputs are those of an idle machine (C2's only overlapped cell, `26x26-hard`,
finished every row in 4.9† s or less). The 16 Hell prescreens without a puzzle ran every request to the 115 s stop; the
overlap could only push them towards "no puzzle", that is towards not offering a level (D39), never towards a false
offer (worst case `18x20-hell-1`, 45.4 of 346.7† s, under 1 % of the case's work); `14x14-hell-1` made its puzzle anyway.

*Safeguard (addendum (3)).* H re-observed `15x20-hell-2`, `18x18-hell-2` and `32x15-hell-3` with D21's seed: each accepted
0 puzzles (`0*`, stopped at 300 s), so MP12b1's reduced rows stand and no prescreen was run again (`runs.md` has the three
rows). *Residual:* the other 13 overlapped prescreens (`15x15b10-hell-1`, `16x16-hell-1`, `15x20-hell-1`, `18x18-hell-1`,
`18x20-hell-1`, `20x20-hell-1`, `20x21-hell-1`, `32x15-hell-1`, `22x22-hell-1`, `18x20-hell-2`, `20x20-hell-2`,
`20x21-hell-2`, `32x15-hell-2`) have no capture since the PR-P2 amendment: their reduced rows rest on MP12b1's prescreens
alone; the overlap could only have pushed them towards "no puzzle"; a reduced case is not offered by D39 and needs no further
evidence (P-OD9); and none of the three Hell cases that made puzzles completed 90 % of its 20 requests (best 45 %), so no
D39 interval would plausibly change.

*Conclusion.* MP12b1's evidence stands: no C1 to C5 status, no list of the aggregate and no row of the D39 table changes
because of the overlap. It is no stop and no owner question. Every MP12b1 time of these 22 cases that this record quotes
carries `†` (sections 3 and 7).

**Item 2. Hell availability (D36 (i), D39).** No Hell case meets the completion criterion (at least 90 % of the 20
requests complete ten in-band puzzles): the three cases that made puzzles complete 0 %, 0 % and 45 % (`14x14-hell-1`,
`24x24-hell-1`, `26x26-hell-1`), and 22 cases made none in 3 requests. Hell 1 availability is not contiguous (puzzles on
14x14, 24x24 and 26x26; none from 15x15b10 to 22x22). The evidence shows that this search does not reach the Hell bands,
not that they are unreachable under v3 (section 9). The derived areas are `[Infinity, Infinity]` for Hell 1, 2 and 3.

**Item 3. Cells below 90 % request completion (PR-P2 finding 1).** Seven cells outside Hell: 6x10 very easy 65 % (7 of 20
requests `layouts-not-found`), 6x10 easy 85 % (the GV2 rate; 3 requests `layouts-not-found`), and Nightmare 12x12 85 %,
14x14 55 %, 15x15b10 55 %, 16x16 75 %, 15x20 75 %. The Nightmare cells stay offered: D39 withdraws only Hell levels and these
cells made puzzles. The serial N captures made 5 of 5 puzzles in every one of them (total 112.9 s, 555.3 s, 45.2 s,
128.8 s and 14.0 s), section 6.

**Item 4. Time (PR-P2 findings 2 and 3).** 70 of MP12b1's 1,726 requests ran longer than `TIME.responseMs` (120 s): 43
Nightmare requests (14x14 12, 15x15b10 10, 16x16 7, 15x20 5, 12x12 4, 18x18 2, and 10x10, 20x20 and 20x21 1 each) and 27 Hell
1 requests (14x14 5†, 24x24 7, 26x26 15; the `†` marks the five of `14x14-hell-1`, whose times are not slot-protected), verified on the published reports. By the plan author's answer (PR-P2) each action
stayed within its own budget (the set stage at most 114.1 s, the batch after it at most 115.2 s) and the set request and its
batch together took more than 120 s. **One selection call can outlast the 115 s stop** (the plan author calls it a
present defect): this task observed it, `h-18x18-hell-2` set attempt 2, 64 profiles (14 rated, 50 capped) in 136.3 s, and
`n-14x14-nightmare` has calls of up to 105.1 s; the whole result of such a call is discarded when the request is
stopped.

**Item 5. Census estimates above 5 % (P-OD1, PR-P1).** 31 cells, 20 of them above 25 % (17 non-Hell cells, which go to the
owner, and the three historical Hell 1 cells; section 5). Their puzzles ship with the estimate note and the `censored` flag.
No census change is made.

**Item 6. Known limitation R7 (one search order, no median).** The deduction uses one canonical order; a puzzle's v3 score
depends on the tie order by up to 12 points at Hard (12x12-hard), 7 at Expert (11 at 6x10-expert) and 6 to 13 at Master (one
decisive guess is 5 points); `G` differs by at most 2 (`calibration-slice-2026-11-13.md` section 6.4; the plan author's
answer to PR-P1: confirmed, a property of the label, a median would triple the rating cost). A given puzzle always gets
the same rating. Design §7.8 states it.

**Item 7. Population R on 18x20: Hard with `--uniqueness require` made 2 of 10 puzzles** in its request (`partial`,
`difficulty-not-found`); Expert and Master made 10 of 10 (section 6). No owner question (every cell made puzzles); the cell
is a named availability finding, for the owner's information with the numbers of section 6.

**Item 8. The census confound (PR-P2 finding 4).** The fast Nightmare cells of the large boards carry more census estimates
(49.5 % to 97.0 % on 360 to 676 cells; 84.5 % on 24x24 and 97.0 % on 26x26) than the slow boards of 196 to 324 cells (34.0 %
to 49.2 %). An unfinished census counts undecided alternatives as failing (an upper estimate), so their speed may be the
estimate reaching the band early. Not measured here; N covers the slow cells only, and it shows that most rated Nightmare
profiles there are estimates (census unfinished in 83 of 107 rated raw attempts: 15 of 17 on 12x12, 31 of 35 on 14x14, 7 of 17
on 15x15b10, 7 of 8 on 15x20, 23 of 30 on 16x16). This item adds no question.

**Item 9. The fail-fast (section 10).** The false-stop check found false stops for F1 (2), F2 (17) and F1 + F2 (5); F2's
effect at Nightmare is measured (N has 18 triggers, 11 of them false stops), so it is not "unmeasured". Owner question 1.

**Item 10. Items carried from MP12a's close for MP17 and MP12b3.** The `EPERM` in the cleanup hook of
`tests/site-tools.test.js` (a first GA-P2 run of MP12a; the file passes alone) is a risk for the final `npm test` of
section 12 (see there); the comment above `SCORE_V3` in `core/engine/policy.js` still says "Defined but not yet the rating"
and is corrected by MP12b3 (a source file is not edited here).

**Item 11. A faster generator** is later work outside difficulty-v3 (`docs/improve-generating/plan.md`, saved by the plan
author, not authorised). MP17 carries items 3, 4, 8 and the fail-fast outcome to its final record.

### 13.2 Questions for the owner (not waited for; the lock is written without the answers)

1. **The fail-fast (D40).** "Only **none** satisfies the existing zero-observed-false-stop rule. F1 has 2 false stops / 7
   triggers, with 5 unknown; F2 17/67; F1+F2 5/21, with 5 unknown. At Nightmare, F2 loses 11/18 triggered calls and F1+F2
   4/4. Choose none, or explicitly override that rule and select a mechanism? Fixture/recipe protections remain unchanged.
   SA2 recommends none." (Evidence: section 10. The plan author had recommended F1 + F2. The answer "none" builds nothing and
   MP12b3 records the limitation; building a mechanism anyway needs the owner's explicit override, a different mechanism an
   addendum to MP12b3.)
2. **Population R (D41): no question.** Every 18x20 cell made puzzles (Hard 2 of 10, Expert 10, Master 10 with `require`).
3. **Census estimates above 25 % (PR-P1).** "Accept the estimated ratings of the **17 non-Hell cells** at the unchanged 80 M
   census budget, with estimate notices? The three Hell 1 cells are historical findings and will be withdrawn under D39.
   (Matched cost figures as in section 5; no budget above 80 M was measured or is proposed.)" The 17 cells: Nightmare on 3x29
   (96.0 %), 10x10 (97.0 %), 12x12 (76.8 %), 14x14 (38.1 %), 15x15b10 (34.0 %), 16x16 (39.2 %), 15x20 (49.2 %), 18x18 (49.0 %),
   18x20 (49.5 %), 20x20 (57.0 %), 20x21 (54.0 %), 32x15 (63.5 %), 22x22 (63.5 %), 24x24 (84.5 %) and 26x26 (97.0 %); Master on
   24x24 (28.5 %) and 26x26 (39.5 %). The three Hell 1 cells (14x14: 5 of 5, 24x24: 13 of 13, 26x26: 134 of 134) are
   historical. Their puzzles ship with the estimate note and the `censored` flag; AR1 guarantees a proved decisive guess.
   Matched cost of a larger census (the same 250 slice puzzles rated at both budgets, round 1): deduction median 45.1 to
   55.1 ms and p95 238.6 to 337.3 ms from 10 to 80 million. 18x20-master at 80 million: 11 % in the landscape, 14 % in the
   matched round-1 probe and 16 % in the round-2 probe. (The round 2 figures of MP12a's record compare cohorts that differ
   in 15 puzzles and are observational, not a paired cost measurement.) No larger census is measured and none is made (the
   plan author, PR-P1).
4. **A cell that is not Hell without a puzzle: none** (section 9).
