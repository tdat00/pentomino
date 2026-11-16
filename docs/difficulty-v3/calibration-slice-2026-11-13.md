# Calibration slice: the GV2 cases again with v3 (MP12a, 2026-11-13)

Record of MP12a (gate GL-P3, slice part). The 18 GV2 board-and-level cells were measured again with v3-generated
puzzles, in rounds, against the owner's criteria C1 to C5 (RES-25). Every number below comes from the published reports
under `docs/difficulty-v3/landscape-v3/r<k>/`, the probe corpus of each round (`r<k>/probe/`) and the run logs of this
task (scratch under `tests/artifacts/MP12a/`, which the record summarises).

## 1. Header

| Item | Value |
|---|---|
| Date and machine | 2026-11-13 (+07:00); AMD EPYC 7763 64-Core Processor, 16 logical cores, 64 GiB; Windows, Node v26.13.0 |
| Code revision | round 0: `f33aa71` (MP11 plus the pack documents), no code change (`meta.sourceCommit` without a suffix); round 1: the same plus the `SCORE_V3` change of section 3.1 (`meta.sourceCommit` carries `+uncommitted-changes`); round 2: round 1 plus the `DEDUCE.census` change of section 3.4 (owner decision P-OD7) |
| `SCORE_V3` at the start | `base { max: 12, scale: 3 }`, `rule [0, 0, 2, 2]`, `weights { G: 5, info: 0.5 }`, `penalty { few: 0, many: 0 }` |
| `DEDUCE` | rounds 0 and 1: `{ lookaheadWidth: 4, nodes: 30000, solutions: 8, work: 760000000, census: 10000000, memoryBytes: 33554432 }`; round 2: the same with `census: 80000000` (section 3.4) |
| `K60`, `POLICY_ID`, `SHARES` | `[6, 7.5, 8.5, 10, 11.5, 13, 16, 24, 32, 43, 58, 78]`, `'mixed-v2'`, `[0.62, 0.54, 0.46, 0.38, 0.3, 0.22, 0.14, 0.1, 0.06, 0.04, 0.04]` (unchanged) |
| `STALL_LIMIT` in force | 12 (`core/engine/clues.js`); MP09d2's decision (`docs/difficulty-v3/d21-v3-2026-11-12.md` section 5.5): the rule is not inert (it fired on 10 `any`-mode calls at N = 12), so 12 stays and MP12b2 skips its re-examination. The slice has no Hell case. |
| Run-control checks | launcher self-test `launch self-test: 23 of 23 cases as expected` (22 given cases plus R11 of the TP29 addendum; with the `interrupted` branch removed R11 fails with exit 3 and the line reads 22 of 23); the fake-tree check of the lock helper (a two-process tree stopped at the 5 s limit, both processes gone: killed process ids 3580 and 20944, `TimedOut` true, exit code 124, the test lock released); `criteria.mjs --self-test`: `criteria self-test: 5 of 5 synthetic rounds as expected` |
| Lock helper | `Invoke-Dv3Timed` of check-list section 7, saved verbatim as `tests/artifacts/MP12a/dv3-lock.ps1` (checked identical to the check-list block); the Sudoku repository ran its own locked measurements during the whole task |

### 1.1 Defects found in the given launcher (reported, not hidden)

1. **`publish` could never succeed.** The identity check of `launch.mjs publish` compared the report's `meta.versions`
   (`{ algo, policy, rng, model, app }`, as `tools/calibrate.mjs` writes it with `readSource()`) with
   `currentVersions()` of `tools/record-fixtures.mjs`, which has no `app` key, so every publish was refused
   ("the versions of the report differ from those of the tree"; nothing was copied, the staged files stayed). The
   first publish (6x10-easy, round 0) hit it. The fix is one line in `main()`: the tree's versions are
   `{ ...currentVersions(), app: APP_VERSION }`, the same value `calibrate.mjs` writes, and no check was weakened (the
   digest, the versions and the other publish checks are unchanged; the self-test covers `publish` with an injected
   identity, so it could not see the defect). 6x10-easy was published by the same command after the fix; every later
   publish ran through the driver.
2. **TP29** (orchestrator's addendum, applied as ordered): `launch.mjs` has a separate `interrupted` flag set by the
   SIGINT handler; `code === 2 && interrupted` is exit 2 before either scheduled-pause case; case R11 is the one new
   memory-only self-test case (23 of 23). No budget, seed, checkpoint or lock-policy change.

3. **`criteria.mjs` (written for this task) rounded a median to a whole number.** The first version printed every
   median with `toFixed(0)`, so the 12x12-easy median of round 0 (9.5) read 10. Found while writing this record, fixed
   in the script (an integer prints as it is, any other value with one decimal) and the criteria of both rounds were
   regenerated: round 1 is byte-identical, round 0 differs only in the 12x12-easy median (9.5, in the C1 line and in the
   cell table). No verdict changes: C1 compares the unrounded values.

Also noted: the launcher's own header comment says what exit 2 now covers; `criteria.mjs` is new and is not in
`SOURCE_FILES`, so neither script changes a source digest.

## 2. Round 0 (the tuple at the start: no change)

### 2.1 Plan (written before the round)

- Shards: the 18 cases in the order of the printed list (6x10, 10x10, 12x12 easy to master, then 18x20 hard, expert,
  master), one case per shard, each by `launch.mjs run --profile landscape --workers 4 --seeds 20 --fresh-process
  --cases "^<case>$"` with `--max-old-space-size=2048`, staged under `tests/artifacts/MP12a/landscape/r0/`, every
  invocation through `Invoke-Dv3Timed` (590 s limit), resumed by the identical command after exit 3, published once by
  `launch.mjs publish ... --seeds 20`. Expected: 16-170 s per case (GV2 took 16-83 s with v2; v3 rates more), about 20
  minutes of command time, plus the waits for the Sudoku lock.
- Probe corpus: 90 requests (18 cases x reps 0-4) captured in four board groups (25, 25, 25 and 15 requests; projected
  from the shards' response times of reps 0-4 at 10, 90, 88 and 12 s plus 1.5 s of start-up per request), then rated
  with `prod` (`--orders 5 --tie-orders 3`, no `--deduce`) in four board groups; each command at most 570 s. Expected
  10-20 minutes of capture and 10-15 of rating from the task; the projection from the first shards: under 6 minutes.
- Then: `final.jsonl`, the fit input (seconds, unlocked), `criteria.mjs`, and, by the criteria, the census labels and
  the penalty comparison of P-OD3.

### 2.2 Shards (invocation table)

| Case | Start | End | Seconds | Launcher exit | Rows after | Lock wait (s) |
|---|---|---|---|---|---|---|
| 6x10-easy | 12:30:17 | 12:30:33 | 16.6 | 0 | 20 | 0 |
| 6x10-normal | 12:34:04 | 12:34:28 | 23.8 | 0 | 20 | 45.1 |
| 6x10-hard | 12:35:44 | 12:36:18 | 33.9 | 0 | 20 | 60.1 |
| 6x10-expert | 12:37:33 | 12:38:03 | 30.5 | 0 | 20 | 60.1 |
| 6x10-master | 12:39:24 | 12:40:02 | 38.5 | 0 | 20 | 65 |
| 10x10-easy | 12:41:23 | 12:41:41 | 17.9 | 0 | 20 | 65.1 |
| 10x10-normal | 12:44:16 | 12:44:47 | 31.2 | 0 | 20 | 140.2 |
| 10x10-hard | 12:45:03 | 12:45:30 | 27.8 | 0 | 20 | 0 |
| 10x10-expert | 12:45:46 | 12:46:48 | 62.4 | 0 | 20 | 0 |
| 10x10-master | 12:47:03 | 12:49:49 | 165.8 | 3 | 13 | 0 |
| 10x10-master (resumed, identical command) | 12:50:04 | 12:51:33 | 88.4 | 0 | 20 | 0 |
| 12x12-easy | 12:51:48 | 12:52:08 | 20 | 0 | 20 | 0 |
| 12x12-normal | 12:52:23 | 12:52:57 | 34.4 | 0 | 20 | 0 |
| 12x12-hard | 12:53:13 | 12:53:56 | 43.4 | 0 | 20 | 0 |
| 12x12-expert | 12:54:11 | 12:55:18 | 66.5 | 0 | 20 | 0 |
| 12x12-master | 12:57:53 | 13:00:34 | 160.5 | 3 | 16 | 140.1 |
| 12x12-master (resumed, identical command) | 13:03:09 | 13:03:52 | 43.7 | 0 | 20 | 140.1 |
| 18x20-hard | 13:06:28 | 13:07:03 | 35.2 | 0 | 20 | 140.1 |
| 18x20-expert | 13:07:18 | 13:08:29 | 70.9 | 0 | 20 | 0 |
| 18x20-master | 13:10:05 | 13:12:00 | 115 | 0 | 20 | 80.1 |

20 invocations (two resumes after the scheduled pause, exit 3, with the pause falling between rows), command time
1,126.4 s, lock wait 936.0 s. No invocation reached a limit. Publish lines: every case printed
`publish: wrote docs/difficulty-v3/landscape-v3/r0/<case>-2026-11-13.json and ....md; deleted the staged checkpoint`;
6x10-easy was refused first (defect 1, nothing copied) and published after the fix.

Source identity of the 18 reports (equal in all): `sourceDigest`
`b4aa119a23812db2fe264960a6edf35afc5eeef948eb6fc20dc6bdd46db5a439`, `versions`
`{ algo: gen-v3, policy: mixed-v2, rng: xoshiro128ss-v1, model: difficulty-v3, app: 1.0.0 }`, `sourceCommit`
`f33aa7158aec19cbd06b7a788c69b25b0050fafe`.

Per shard (rows, request outcomes, time per run and the peak process memory):

| Case | Rows | Completed ten | Partial reasons | T10 median (ms) | T10 p95 (ms) | Peak process (MiB) |
|---|---|---|---|---|---|---|
| 6x10-easy | 20 | 17 | layouts-not-found: 3 | 298 | 394 | 219 |
| 6x10-normal | 20 | 19 | layouts-not-found: 1 | 627 | 1192 | 238 |
| 6x10-hard | 20 | 20 | none | 839 | 2978 | 195 |
| 6x10-expert | 20 | 20 | none | 749 | 1184 | 173 |
| 6x10-master | 20 | 20 | none | 1145 | 1557 | 172 |
| 10x10-easy | 20 | 20 | none | 327 | 446 | 216 |
| 10x10-normal | 20 | 20 | none | 761 | 1610 | 230 |
| 10x10-hard | 20 | 20 | none | 484 | 735 | 218 |
| 10x10-expert | 20 | 20 | none | 768 | 2375 | 204 |
| 10x10-master | 20 | 20 | none | 10035 | 16970 | 189 |
| 12x12-easy | 20 | 20 | none | 412 | 495 | 239 |
| 12x12-normal | 20 | 20 | none | 1095 | 1702 | 230 |
| 12x12-hard | 20 | 20 | none | 536 | 1231 | 226 |
| 12x12-expert | 20 | 20 | none | 795 | 2371 | 232 |
| 12x12-master | 20 | 20 | none | 5745 | 17843 | 205 |
| 18x20-hard | 20 | 20 | none | 669 | 993 | 293 |
| 18x20-expert | 20 | 20 | none | 1582 | 2956 | 334 |
| 18x20-master | 20 | 20 | none | 2801 | 4864 | 323 |

No request was interrupted or incomplete; the only partial outcomes are the three 6x10-easy and the one 6x10-normal
requests that ended `layouts-not-found` after an exhaustive arrangement count (the same as the GV2 baseline).

### 2.3 Probe corpus (captured once, rated on the captured packs)

Manifest `docs/difficulty-v3/landscape-v3/r0/probe/manifest.json`: 90 requests (`A-<case>-r0` to `-r4`), every
generation exit 0 (no partial request), 896 accepted puzzles (two requests with 8: `A-6x10-easy-r0` and
`A-6x10-normal-r4`), **identity 90 of 90 matched** the `details.resultDigest` of the same seed in the round's reports
(no mismatch, nothing substituted), `finalDeduce` equal to the pinned `DEDUCE`.

| Label | Packs | Budget tuple | Purpose |
|---|---|---|---|
| `prod` | all 90 | `DEDUCE` as pinned (no `--deduce`), `--orders 5 --tie-orders 3` | the lines of `final.jsonl`, order noise, C5 |
| `census-20m`, `census-40m`, `census-80m` | the 25 packs of the five cells above 5 % in the landscape reports (C4), `--orders 0 --tie-orders 1` | `DEDUCE` with `census` 20,000,000, 40,000,000, 80,000,000 | the census budget (P-OD1) |

`cap-1g` and `cap-10g` were not needed (no `capped` line). The `--orders 0 --tie-orders 1` choice for the census labels
is MP06b A1.2's default for labels that state no orders.

| Command | Start | End | Seconds | Exit | Lock wait (s) |
|---|---|---|---|---|---|
| capture A:6x10 (25 requests) | 13:12:47 | 13:13:16 | 29.1 | 0 | 0 |
| capture A:10x10 (25) | 13:15:06 | 13:16:06 | 59.8 | 0 | 95.2 |
| capture A:12x12 (25) | 13:19:21 | 13:20:16 | 55.3 | 0 | 180.1 |
| capture A:18x20 (15) | 13:22:21 | 13:22:52 | 30.3 | 0 | 110.1 |
| rate prod A:6x10 | 13:24:29 | 13:24:44 | 15.2 | 0 | 0 |
| rate prod A:10x10 | 13:24:59 | 13:25:38 | 39.3 | 0 | 0 |
| rate prod A:12x12 | 13:25:53 | 13:26:16 | 23.3 | 0 | 0 |
| rate prod A:18x20 | 13:26:31 | 13:27:03 | 31.9 | 0 | 0 |
| rate census-20m (25 packs) | 13:28:16 | 13:28:48 | 32.2 | 0 | 0 |
| rate census-40m | 13:29:10 | 13:29:44 | 33.7 | 0 | 0 |
| rate census-80m | 13:30:07 | 13:30:41 | 34.7 | 0 | 0 |

Classification of the `prod` lines (before any value is read): 896 lines, **complete 896, capped 0, none 0, error 0,
count cutoffs 0** (per cell in the table of 2.4). `final.jsonl` has 896 lines, `(request, puzzleId)` unique, each
request exactly its accepted count.

### 2.4 Criteria (`criteria.mjs`)

```text
node docs/difficulty-v3/landscape-v3/criteria.mjs --round docs/difficulty-v3/landscape-v3/r0 --baseline docs/difficulty-v3/baseline-v2 --final docs/difficulty-v3/landscape-v3/r0/probe/final.jsonl --fit tests/artifacts/MP12a/r0/fit-current.json
```

| Criterion | Status | Numbers |
|---|---|---|
| C1 levels ordered | pass | 6x10: easy 10 < normal 15 < hard 19 < expert 31 < master 44; 10x10: 9 < 13 < 19 < 31 < 45; 12x12: 9.5 < 13 < 19 < 32 < 45; 18x20: hard 19 < expert 32 < master 45 |
| C2 Hard and Expert completion | pass | all eight Hard and Expert cells 100.0 % against GV2 100.0 % (bound 90.0 %) |
| C3 proved real choice (Hard and above) | pass | `provedZero` 0 in all twelve Hard-or-above cells; the slow test "v3 generation orders the levels ..." is recorded apart: it passed on this tuple in MP11 and again on the changed tuple of round 1 (section 3.3) |
| C4 census estimates at most 5 % | **fail** | 6x10-master 64 of 200 (32.0 %); 10x10-master 26 (13.0 %); 12x12-master 22 (11.0 %); 18x20-expert 51 (25.5 %); 18x20-master 133 (66.5 %); every other cell at most 1.5 % (6x10-expert 1, 10x10-expert 3, 12x12-hard 1, 12x12-expert 1, 18x20-hard 1) |
| C5 no capped prod line | pass | 896 prod lines: complete 896, capped 0, none 0, error 0 |

Per cell (GV2 comparison; yield = accepted puzzles / 200; the puzzle rescore hit rate is the fit input's measure,
never C2):

| Case | request completion | GV2 | bound | C2 | yield | GV2 yield | puzzle rescore hit | v3 median | census share | provedZero | prod complete / capped / none / error | samples unrateable |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6x10-easy | 85.0% | 85.0% | 75.0% | n/a | 97.0% | 97.0% | 100.0% | 10 | 0.0% | 0 | 48 / 0 / 0 / 0 | 0 of 200 |
| 6x10-normal | 95.0% | 95.0% | 85.0% | n/a | 99.0% | 99.0% | 100.0% | 15 | 0.0% | 0 | 48 / 0 / 0 / 0 | 0 of 218 |
| 6x10-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 19 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 252 |
| 6x10-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 31 | 0.5% | 0 | 50 / 0 / 0 / 0 | 0 of 266 |
| 6x10-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 44 | 32.0% | 0 | 50 / 0 / 0 / 0 | 0 of 240 |
| 10x10-easy | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 9 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 220 |
| 10x10-normal | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 13 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 262 |
| 10x10-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 19 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 240 |
| 10x10-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 31 | 1.5% | 0 | 50 / 0 / 0 / 0 | 10 of 262 |
| 10x10-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 45 | 13.0% | 0 | 50 / 0 / 0 / 0 | 9 of 290 |
| 12x12-easy | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 9.5 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 252 |
| 12x12-normal | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 13 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 280 |
| 12x12-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 19 | 0.5% | 0 | 50 / 0 / 0 / 0 | 5 of 256 |
| 12x12-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 32 | 0.5% | 0 | 50 / 0 / 0 / 0 | 32 of 296 |
| 12x12-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 45 | 11.0% | 0 | 50 / 0 / 0 / 0 | 64 of 306 |
| 18x20-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 19 | 0.5% | 0 | 50 / 0 / 0 / 0 | 0 of 334 |
| 18x20-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 32 | 25.5% | 0 | 50 / 0 / 0 / 0 | 2 of 354 |
| 18x20-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 45 | 66.5% | 0 | 50 / 0 / 0 / 0 | 17 of 348 |

The diagnostic samples (random clue subsets at several clue counts, many far harder than the level) were unrateable in
a few cells (12x12-master 64 of 306 is the largest share); they are reported, never gated (TP21). Every cell has
accepted v3 puzzles (no `v3: null` cell, no cell without a puzzle): the v3 request completion rate equals the GV2 value
in every cell, and so does the yield.

The distributions per cell of G, `info`, Cmax, tier, solutions and the v3 score are in the "v3 measures per cell" table
of each published `<case>-2026-11-13.md`. In short: easy and normal puzzles have G 0 to 1, Hard G 1 to 2 (every Hard
puzzle has at least one decisive guess), Expert G 3 (G 2 in five of the 200 puzzles of 18x20-expert), Master G 4 to 6
(mostly 5); the v3 medians per board were 9-45 and rise strictly with the level on every board.

### 2.5 Order noise (RES-13), from the `prod` lines

Per cell, the number of puzzles for which the value differs between the tie orders 0-2 and the largest spread; the v3
score under each tie order uses G and `info` of that order and the tier and count status of the canonical order (the
lines carry those only once), the production knobs of the round; `B` is the v2 DLX diagnostic over the five seeded
orders.

| Cell | Lines | G differs | Max G spread | v3 score differs | Max score spread | info differs | Max info spread (bits) | B differs | Max B spread |
|---|---|---|---|---|---|---|---|---|---|
| 6x10-easy | 48 | 0 | 0 | 0 | 0 | 0 | 0.00 | 27 | 7 |
| 6x10-normal | 48 | 0 | 0 | 0 | 0 | 0 | 0.00 | 48 | 11 |
| 6x10-hard | 50 | 2 | 1 | 2 | 6 | 3 | 1.58 | 50 | 169 |
| 6x10-expert | 50 | 6 | 1 | 8 | 6 | 10 | 2.81 | 50 | 1698 |
| 6x10-master | 50 | 12 | 2 | 17 | 13 | 18 | 4.67 | 50 | 3076 |
| 10x10-easy | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 19 | 6 |
| 10x10-normal | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 50 | 13 |
| 10x10-hard | 50 | 4 | 1 | 4 | 6 | 4 | 2.58 | 50 | 26 |
| 10x10-expert | 50 | 7 | 1 | 7 | 7 | 8 | 4.05 | 50 | 786 |
| 10x10-master | 50 | 7 | 1 | 9 | 6 | 11 | 2.46 | 50 | 4711 |
| 12x12-easy | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 12 | 6 |
| 12x12-normal | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 48 | 9 |
| 12x12-hard | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 50 | 37 |
| 12x12-expert | 50 | 4 | 1 | 4 | 6 | 4 | 1.58 | 50 | 502 |
| 12x12-master | 50 | 7 | 2 | 10 | 11 | 10 | 3.17 | 50 | 4943 |
| 18x20-hard | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 50 | 15 |
| 18x20-expert | 50 | 3 | 1 | 4 | 6 | 11 | 3.03 | 50 | 163 |
| 18x20-master | 50 | 11 | 2 | 15 | 13 | 25 | 5.61 | 50 | 986 |

The tie order changes `G` by at most 1 up to Expert and 2 at Master; because one `G` is worth 5 points, the v3 score
of a puzzle differs by up to 7 between tie orders at Hard and Expert and up to 13 at Master. The generator and the
rating always use the canonical order, so the score of a puzzle is stable; the spread is the noise of the model
itself (RES-13: no aggregation is adopted).

### 2.6 The census budget (P-OD1; criterion C4)

C4 failed in five cells (2.4). The captured packs of those cells were rated with the census budget raised, on the same
puzzles (50 per cell):

| Cell | `prod` (10,000,000) | `census-20m` | `census-40m` | `census-80m` |
|---|---|---|---|---|
| 6x10-master | 15/50 (30%) | 9/50 (18%) | 2/50 (4%) | 0/50 (0%) |
| 10x10-master | 2/50 (4%) | 1/50 (2%) | 1/50 (2%) | 1/50 (2%) |
| 12x12-master | 9/50 (18%) | 8/50 (16%) | 3/50 (6%) | 2/50 (4%) |
| 18x20-expert | 17/50 (34%) | 10/50 (20%) | 3/50 (6%) | 0/50 (0%) |
| 18x20-master | 29/50 (58%) | 11/50 (22%) | 7/50 (14%) | **6/50 (12%)** |

Numerator: `complete` lines with `deduction.census.complete === false`; denominator: `complete` lines of the cell (all
250 lines were `complete` under every label). Cost, deduction time per puzzle over the 250 puzzles of these cells
(median, p95, maximum, ms): `prod` 43.7, 212.6, 988.3; `census-20m` 52.8, 233.0, 980.2; `census-40m` 53.1, 248.9,
986.3; `census-80m` 53.5, 285.5, 994.7.

**Outcome: 80,000,000 is not enough** (18x20-master stays at 12 % of 50 even at 80,000,000, and the packs of
10x10-master were at 4 % under `prod` while the landscape report has 13 % of 200 puzzles), so by the rule of D19 and
C5 the census budget **stays at 10,000,000** and the cells go to the owner (sections 4 and 7). Nothing was changed in
`DEDUCE`.

### 2.7 The penalty (P-OD3), the grid and the ordering branch

The fit input (`tests/artifacts/MP12a/fit/`: MP06c's grid of 365,400 sets, hit definition (the requested level, and
`Gproved >= 1` at Hard and above), constraint (no board with unordered medians) and lexicographic objective, with the
distance to the **current** knobs) was applied to the `complete` lines of the identity-matched requests: 90 requests,
896 lines in 18 cells, none excluded. Grid time 8.2 s. The sets are written `[base.max, base.scale, rule[2],
rule[3], weights.G, weights.info, penalty.few, penalty.many]`.

| Set | Knobs | Boards unordered | Predicted mean puzzle rescore hit rate | Lowest cell | Distance to the current knobs |
|---|---|---|---|---|---|
| current (0, 0) | `[12, 3, 2, 2, 5, 0.5, 0, 0]` | 0 | **100.0000 %** | 100.0 % | 0 |
| best of the grid | the current set (no set is better: 0 of 365,400; 299,890 meet the constraint) | 0 | 100.0000 % | 100.0 % | 0 |
| best with `penalty.few >= 1` | `[12, 3, 2, 3, 5, 0.5, 1, 2]` | 0 | **99.2037 %** | 93.75 % (6x10-normal, 45 of 48) | 0.3125 |

On the re-scored medians the penalty set orders all four boards (6x10: 10 < 14 < 20 < 31 < 44; 10x10: 9 < 13 < 19 <
31 < 45; 12x12: 10 < 13 < 19 < 31 < 44; 18x20: 19 < 32 < 45), so it **meets C1**, and its predicted mean hit rate is
0.80 percentage points below the current knobs' (at most 1 point). The corpus was selected under the current knobs, so
the comparison favours them (they hit 100 % by construction); the penalty set misses four cells by one or two puzzles
(6x10-easy 47/48, 6x10-normal 45/48, 6x10-hard 49/50, 12x12-normal 48/50). By the rule of P-OD3 the set is **the
candidate of round 1** (the intent of SA1-Q-P1: the few/many penalty stays). The ordering branch of C1 did not apply
(C1 passed), so the grid served only this comparison.

### 2.8 Result of round 0

C1, C2, C3 and C5 pass; **C4 fails** and cannot be repaired by the census budget; the penalty candidate is chosen.
Machine time of round 0: shards 1,126.4 s of command time (936.0 s of lock wait), probe commands 384.8 s (385.4 s of
lock wait), fit 8 s unlocked; total about 25 minutes of command time and 22 minutes of lock wait.

## 3. The changes between the rounds (B03)

### 3.1 Round 0 to 1: knobs, before and after

| Knob | Round 0 | Round 1 | Range and rule |
|---|---|---|---|
| `SCORE_V3.rule[3]` (the points of deduction tier 3) | 2 | 3 | `rule[2] <= rule[3]`; `base.max + max(rule)` = 15, at most 16 |
| `SCORE_V3.penalty.few` | 0 | 1 | `0 <= few <= many` |
| `SCORE_V3.penalty.many` | 0 | 2 | the same |

Unchanged: `base { max: 12, scale: 3 }`, `rule[0..2]`, `weights { G: 5, info: 0.5 }`, `DEDUCE` (census 10,000,000, work
760,000,000, nodes 30,000), `K60`, `SHARES`, `POLICY_ID`; `core/engine/levels.js` is not touched.

Reason: P-OD3 (section 4.3). The set is the best set of the 365,400-set grid among those with `penalty.few >= 1`
(section 2.7); it is one tuple of the grid and is adopted as it is, never mixed with the current knobs. Data before the
change (round 0 corpus, re-scored): all four boards ordered, predicted mean puzzle rescore hit rate 99.2037 % against
100 % for the current knobs, lowest cell 93.75 %. Data after it (round 1, measured): section 5 (the same request
completion rate and yield in every cell, all criteria the same).

### 3.2 Round 0 to 1: pins re-pinned (the table of TP26)

| File | Pin | Before | After |
|---|---|---|---|
| `core/engine/policy.js` | `SCORE_V3` | `rule [0, 0, 2, 2]`, `penalty { 0, 0 }` | `rule [0, 0, 2, 3]`, `penalty { few: 1, many: 2 }` (the comment points to this record) |
| `tests/policy.test.js` | the `SCORE_V3` pin | the same values | the same values as the policy |
| `tests/difficulty-v3.test.js` | worked examples of the knobs (U = 6, base 10.376, tier, G) | tier 3: G 1 gives 18, G 2 gives 23 | tier 3: G 1 gives 19, G 2 gives 24; the rule is `[0, 0, 2, 3][tier]` |
| `tests/difficulty-v3.test.js` | new test "worked examples of the production penalty" | none | six rows: tier 2 G 1 and tier 3 G 2 with unique, few and many solutions: 18, 17, 16 and 24, 23, 22 |
| `tests/difficulty-v3.test.js` | the characterisation of the recipes' levels (formula with the knobs) | hard 24, expert 30, master 37 | hard 25, expert 31, master 38 |
| `tests/clues.test.js` | slow: 15 x 20 Nightmare (K = 24, 4 clues, in band 53-76) | score 67 | score 66 (D36 command A below) |
| `tests/clues.test.js` | slow: the unrateable calibration (22 x 22 hell-3) | input and pin | unchanged (D36 command B below) |
| `tests/fixtures/ui-flow-recipes.json` | `expect.scores` of three recipes (after GA-P2, section 8) | `default-10x6-normal` [16, 16, 12, 16, 16]; `heart-n10-master` [45, 42, 44, 45, 42, 43, 49, 45, 44, 44]; `square-22x22-nightmare` [59, 63, 68, 67, 62, 62, 59, 66, 63, 68] | [15, 16, 13, 13, 16]; [49, 49, 43, 44, 41, 49, 48, 44, 43, 49]; [67, 62, 67, 66, 61, 61, 63, 65, 62, 67] |
| `tests/fixtures/generation-case.json`, `generated-sample-pack.json` | the generation fixtures (GF-P2, section 8) | `fixture-set-0` of the old tuple | `tools/record-fixtures.mjs --replace --reason "P3: v3 calibration (slice)"` |
| `docs/design-detail.md` | the `SCORE_V3` declaration, the knob table and paragraph, the "bound" sentence, the worked-example table, the tests sentence | the old knobs | the new knobs and the reason in one sentence |

No other pin moved. `tests/levels.test.js` pins `SHARES`, which did not change.

### 3.3 Round 0 to 1: checks between the rounds (fixture-independent files and the slow tests only)

| Command | Result | Seconds | Lock wait (s) |
|---|---|---|---|
| D36 command A (a 15 x 20 board, Nightmare, seed `t18-big-a`, attempt 0, new tuple) | K 24, score 66, 4 clues, in band; by the formula 65.589 rounds to 66 | 13.7 | 0 |
| D36 command B (`avail.mjs --board 22x22 --level hell-3 --seed t18-big-a --attempts 1`, new tuple) | 0 rated, 0 refused, 20 capped: the unrateable-calibration input still ends capped, so its pin stays | 44.8 | 0 |
| targeted files (the policy, difficulty, difficulty-v3, clues, tasks and worker-pool tests, slow ones skipped) | 164 of 164 pass | 5.3 | not logged |
| slow v3 test ("v3 generation orders the levels ...", 10 x 6 and 12 x 12, strictly increasing medians) | 1 of 1 passes (the test 100.2 s) | 100.4 | not logged |
| the two slow clue tests of D36 (15 x 20 Nightmare, unrateable calibration) | 2 of 2 pass | 56.6 | not logged |

The generation fixtures, the UI-flow recipes and the quick set were not run before round 1 (they fail by design until
GF-P2 and GA-P2, which follow the final round, section 8).

### 3.4 Round 1 to 2: `DEDUCE.census` 10,000,000 to 80,000,000 (owner decision P-OD7)

The owner's decision (`docs/difficulty-v3/clarifications.md` Part H, P-OD7, 2026-11-13): raise `DEDUCE.census` to
80,000,000 and accept 18x20-master's remaining census estimates (about 12-14 %). It is a `DEDUCE` change, verified by
the next round, here round 2, the third and last round of the task. The score tuple of round 1 is unchanged. The
orders that came with it: if C4 fails only in 18x20-master that is the accepted exception, and any other cell failing
C4, any other failing criterion or any "finding for the owner" stops the task with the numbers.

| Knob | Round 1 | Round 2 |
|---|---|---|
| `DEDUCE.census` | 10,000,000 | 80,000,000 |

Unchanged: `lookaheadWidth` 4, `nodes` 30,000, `solutions` 8, `work` 760,000,000, `memoryBytes` 33,554,432,
`SCORE_V3` (as in round 1), `K60`, `SHARES`, `POLICY_ID`, `STALL_LIMIT`.

| File | Pin | Before | After |
|---|---|---|---|
| `core/engine/policy.js` | `DEDUCE.census` | 10000000 | 80000000 (the comment points to this record) |
| `tests/policy.test.js` | the `DEDUCE` pin | `census: 10000000` | `census: 80000000` |
| `tests/clues.test.js` | slow: 15 x 20 Nightmare (K 24, in band 53-76) | score 66, 4 clues | score 70, 3 clues (K stays 24) |
| `tests/clues.test.js` | slow: the unrateable calibration (22 x 22 hell-3) | input and pin | unchanged |
| `tests/difficulty-v3.test.js` | recipe characterisation (hard 25, expert 31, master 38) and the worked examples | the round-1 values | unchanged: the test measures with the pinned `DEDUCE` and passes with the new census |
| `docs/design-detail.md` | the `DEDUCE` declaration, the limits table (`census` row) and the paragraph on the measured limits | 10,000,000 | 80,000,000, with the decision in one sentence |

The 15 x 20 Nightmare attempt changed with the census budget (score 66 to 70, 4 clues to 3): command A printed K 24,
`censusComplete` true (229 census nodes, 60,871,393 census work), deduction tier 3, `G` 9 and `Gproved` 9, solutions
`many`, score 70 and 3 clues;
`breakdownV3` on the printed metrics gives 70.044 (rule 3, penalty 2), which rounds to 70; 70 lies in the Nightmare
band, so the attempt stays `ok` and in band and its seed, board, level and attempt are unchanged. Command B (the
unrateable input, new `DEDUCE`): the one call has 0 rated, 0 refused and 20 capped profiles and ends `not-in-band`,
so the premise of its pin holds. Between-round checks (all under the lock, logged in `tests/artifacts/MP12a/r2/`):

| Command | Result | Seconds | Lock wait (s) |
|---|---|---|---|
| D36 command A (15 x 20 Nightmare, seed `t18-big-a`, attempt 0) | K 24, score 70, 3 clues, in band | 13.9 | 0 |
| D36 command B (22 x 22 hell-3, attempt 0, under the D36 observer) | 0 rated, 0 refused, 20 capped | 42.6 | 0 |
| targeted files (policy, difficulty, difficulty-v3, clues, tasks, worker-pool; slow ones skipped) | 164 of 164 pass | 6.8 | 0 |
| slow v3 test | 1 of 1 passes | 108.5 | 0 |
| the two slow clue tests of D36 | 2 of 2 pass | 56.8 | 0 |

## 4. The owner's three questions (B02)

### 4.1 The census budget (P-OD1)

**Decided by the owner (P-OD7): `DEDUCE.census` is raised to 80,000,000**, and 18x20-master's remaining census
estimates are accepted. At the end of round 1 the rule of D19 said "keep 10,000,000 and report the cells to the
owner", on this evidence: C4 failed in the same five cells in both rounds (sections 2.4 and 5.3); the
captured packs of those cells, rated with 20,000,000, 40,000,000 and 80,000,000 on the same puzzles (50 per cell):

| Cell | Round 0: 10M / 20M / 40M / 80M | Round 1: 10M / 20M / 40M / 80M |
|---|---|---|
| 6x10-master | 30 % / 18 % / 4 % / 0 % | 32 % / 16 % / 4 % / 0 % |
| 10x10-master | 4 % / 2 % / 2 % / 2 % | 6 % / 4 % / 4 % / 2 % |
| 12x12-master | 18 % / 16 % / 6 % / 4 % | 24 % / 20 % / 8 % / 4 % |
| 18x20-expert | 34 % / 20 % / 6 % / 0 % | 32 % / 18 % / 8 % / 0 % |
| 18x20-master | 58 % / 22 % / 14 % / **12 %** | 66 % / 30 % / 14 % / **14 %** |

At 80,000,000 four of the five cells are at most 5 % on this corpus, and 18x20-master is not (12 % and 14 %), so
80,000,000 was not enough for the rule of D19, which keeps 10,000,000 and reports the cells (section 7); the owner chose
80,000,000 and accepted 18x20-master (P-OD7, section 3.4).
Cost of 80,000,000 against 10,000,000 (deduction time per puzzle over the 250 puzzles of the five cells, round 1:
median 55.1 against 45.1 ms, p95 337.3 against 238.6 ms, maximum 1,315.5 against 1,323.6 ms; round 0: median 53.5
against 43.7 ms, p95 285.5 against 212.6 ms, maximum 994.7 against 988.3 ms). The shares of the probe corpus (50
puzzles per cell) differ from the landscape's shares (200 puzzles per cell, 2.4 and 5.3) by sampling: 10x10-master is
4-6 % in the probe and 13-17 % in the landscape. Round 2 measured the owner's choice in production (section 6): its
result for C4 is in sections 6.3 and 7.

### 4.2 The work cap (P-OD2)

**The work cap stays at 760,000,000.** C5 passed in all three rounds: no `capped` line among the 896 `prod` lines of
each round, no count cutoff, no error, so `cap-1g` and `cap-10g` were not needed and the cap rule of D19 was not
triggered. For the
owner's information, the largest main-search values of the complete lines (`search.work - census.work` and
`search.nodes - census.nodes`) against the caps:

| Round | Largest work | Of the cap 760,000,000 | Largest nodes | Of the cap 30,000 | Cell |
|---|---|---|---|---|---|
| 0 | 279,769,613 | 36.8 % | 10,911 | 36.4 % | 10x10-master |
| 1 | 445,589,741 | 58.6 % | 21,246 | 70.8 % | 10x10-master |
| 2 (census 80,000,000) | 445,589,741 | 58.6 % | 21,246 | 70.8 % | 10x10-master (the same request and the same work as in round 1) |

The largest census work is 80,367,118 in round 2 against its budget of 80,000,000 (round 1: 10,764,529 against
10,000,000).

D19's rule (twice the largest value, rounded up to 10,000,000) would give 900,000,000 from the round-1 maximum; the
rule applies only to the packs of a failed C5 and none failed, so nothing was changed. Reported for the owner and for
MP12b1: the headroom of 10x10-master is the number to watch.

### 4.3 The penalty (P-OD3)

**The penalty is restored: `penalty (1, 2)` with `rule[3]` = 3.** The comparison, on both corpora, with the same hit
definition (the requested level, and `Gproved >= 1` at Hard and above), from the complete lines of the
identity-matched requests (896 per round):

| Tuple | Corpus of round 0 (made under (0, 0)) | Corpus of round 1 (made under (1, 2)) |
|---|---|---|
| current at round 0: `[12, 3, 2, 2, 5, 0.5, 0, 0]` | 100.0000 %, lowest cell 100.0 %; all boards ordered | 95.6343 %, lowest cell 76.0 % (12x12-normal 38 of 50); all boards ordered |
| adopted: `[12, 3, 2, 3, 5, 0.5, 1, 2]` | 99.2037 %, lowest cell 93.75 % (6x10-normal 45 of 48); all boards ordered | 100.0000 %, lowest cell 100.0 %; all boards ordered |

Each tuple hits 100 % on the corpus it generated, and less on the other: the corpus of a round favours the tuple that
made it (the record said so before round 1). Measured, the two tuples are the same: the request completion rate and the
yield of all 18 cells are identical in round 0 and round 1 (6x10-easy 85 % and 97 %, 6x10-normal 95 % and 99 %, every
other cell 100 % and 100 %), the medians per board stay ordered, and C1 to C5 give the same verdicts (the medians move
by at most 1 point: 6x10 normal 15 to 14, 6x10 master 44 to 43, 10x10 normal 13 to 14, 10x10 hard 19 to 20, 12x12 easy
9.5 to 10, 12x12 normal 13 to 14, 12x12 hard 19 to 20, 12x12 expert 32 to 31, 18x20 expert 32 to 31).
The data do not decide between the tuples; the adoption rests on the rule of the task (the set meets C1 and is within
1 point) and on the intent of SA1-Q-P1 (the few/many penalty stays). The owner may weigh that the penalty set costs
0.80 points of predicted fit on the old corpus and nothing measured.

## 5. Round 1 (the tuple of section 3)

### 5.1 Plan and shards

Plan: as round 0 (section 2.1): the same launcher command per case, the same order, `r1/` folders, the same
probe-corpus and rating commands; the tree is the tree of the changed policy (`+uncommitted-changes` in
`meta.sourceCommit`). 20 invocations in 1,077.6 s, no lock wait (0 s in every command), no
invocation reached a limit. Two cases paused on the scheduled timer (exit 3, between rows) and were resumed by the
identical command.

| Case | Start | End | Seconds | Launcher exit | Rows after | Lock wait (s) |
|---|---|---|---|---|---|---|
| 6x10-easy | 13:40:50 | 13:41:06 | 16.3 | 0 | 20 | 0 |
| 6x10-normal | 13:41:21 | 13:41:44 | 22.5 | 0 | 20 | 0 |
| 6x10-hard | 13:41:59 | 13:42:30 | 31 | 0 | 20 | 0 |
| 6x10-expert | 13:42:46 | 13:43:17 | 30.7 | 0 | 20 | 0 |
| 6x10-master | 13:43:32 | 13:44:07 | 34.6 | 0 | 20 | 0 |
| 10x10-easy | 13:44:22 | 13:44:40 | 17.6 | 0 | 20 | 0 |
| 10x10-normal | 13:44:55 | 13:45:23 | 28.2 | 0 | 20 | 0 |
| 10x10-hard | 13:45:39 | 13:46:08 | 29.3 | 0 | 20 | 0 |
| 10x10-expert | 13:46:23 | 13:47:26 | 62.8 | 0 | 20 | 0 |
| 10x10-master | 13:47:41 | 13:50:22 | 160.8 | 3 | 14 | 0 |
| 10x10-master (resumed, identical command) | 13:50:37 | 13:51:46 | 69.1 | 0 | 20 | 0 |
| 12x12-easy | 13:52:01 | 13:52:20 | 18.8 | 0 | 20 | 0 |
| 12x12-normal | 13:52:35 | 13:53:06 | 30.2 | 0 | 20 | 0 |
| 12x12-hard | 13:53:21 | 13:54:07 | 46.4 | 0 | 20 | 0 |
| 12x12-expert | 13:54:22 | 13:55:28 | 65.1 | 0 | 20 | 0 |
| 12x12-master | 13:55:43 | 13:58:17 | 153.8 | 3 | 16 | 0 |
| 12x12-master (resumed, identical command) | 13:58:32 | 13:59:15 | 43.9 | 0 | 20 | 0 |
| 18x20-hard | 13:59:31 | 14:00:09 | 38.6 | 0 | 20 | 0 |
| 18x20-expert | 14:00:25 | 14:01:31 | 66.9 | 0 | 20 | 0 |
| 18x20-master | 14:01:47 | 14:03:38 | 111 | 0 | 20 | 0 |

Every case printed `publish: wrote docs/difficulty-v3/landscape-v3/r1/<case>-2026-11-13.json and ....md; deleted the
staged checkpoint` at its first publish.

Source identity of the 18 reports (equal in all): `sourceDigest`
`97e1a5a1a7ad6741bcc84a97fb82e4ddc2082f56894a961415d1b90ad60f52ec` (the digest of the tree with the changed policy, also
the tree's digest when this record was written), `versions` as in round 0, `sourceCommit`
`f33aa7158aec19cbd06b7a788c69b25b0050fafe+uncommitted-changes`.

| Case | Rows | Completed ten | Partial reasons | T10 median (ms) | T10 p95 (ms) | Peak process (MiB) |
|---|---|---|---|---|---|---|
| 6x10-easy | 20 | 17 | layouts-not-found: 3 | 294 | 367 | 191 |
| 6x10-normal | 20 | 19 | layouts-not-found: 1 | 581 | 1176 | 237 |
| 6x10-hard | 20 | 20 | none | 757 | 2815 | 208 |
| 6x10-expert | 20 | 20 | none | 804 | 1029 | 183 |
| 6x10-master | 20 | 20 | none | 1022 | 1374 | 176 |
| 10x10-easy | 20 | 20 | none | 300 | 441 | 213 |
| 10x10-normal | 20 | 20 | none | 647 | 1211 | 250 |
| 10x10-hard | 20 | 20 | none | 582 | 973 | 212 |
| 10x10-expert | 20 | 20 | none | 787 | 2568 | 205 |
| 10x10-master | 20 | 20 | none | 8284 | 15625 | 184 |
| 12x12-easy | 20 | 20 | none | 340 | 435 | 238 |
| 12x12-normal | 20 | 20 | none | 857 | 1283 | 242 |
| 12x12-hard | 20 | 20 | none | 599 | 1547 | 243 |
| 12x12-expert | 20 | 20 | none | 885 | 1988 | 234 |
| 12x12-master | 20 | 20 | none | 5664 | 17500 | 208 |
| 18x20-hard | 20 | 20 | none | 902 | 1514 | 287 |
| 18x20-expert | 20 | 20 | none | 1397 | 2834 | 301 |
| 18x20-master | 20 | 20 | none | 2741 | 4560 | 302 |

No request was interrupted or incomplete; the partial outcomes are the same four `layouts-not-found` requests of round
0 and of the GV2 baseline.

### 5.2 Probe corpus

Manifest `docs/difficulty-v3/landscape-v3/r1/probe/manifest.json`: 90 requests, every generation exit 0, 896 accepted
puzzles, **identity 90 of 90 matched**, `finalDeduce` equal to the pinned `DEDUCE`; the labels are those of round 0
(`prod` on all 90 packs, `census-20m`, `census-40m` and `census-80m` on the 25 packs of the five cells above 5 %).
Classification of the `prod` lines: 896 lines, **complete 896, capped 0, none 0, error 0, count cutoffs 0**;
`final.jsonl` has 896 lines.

| Command | Start | End | Seconds | Exit | Lock wait (s) |
|---|---|---|---|---|---|
| capture A:6x10 | 14:03:53 | 14:04:20 | 27.1 | 0 | 0 |
| capture A:10x10 | 14:04:35 | 14:05:23 | 48.4 | 0 | 0 |
| capture A:12x12 | 14:05:38 | 14:06:34 | 55.1 | 0 | 0 |
| capture A:18x20 | 14:06:49 | 14:07:19 | 30.9 | 0 | 0 |
| rate prod A:6x10 | 14:07:34 | 14:07:50 | 15.7 | 0 | 0 |
| rate prod A:10x10 | 14:08:05 | 14:08:48 | 42.8 | 0 | 0 |
| rate prod A:12x12 | 14:09:03 | 14:09:28 | 24.7 | 0 | 0 |
| rate prod A:18x20 | 14:09:43 | 14:10:21 | 38.4 | 0 | 0 |
| rate census-20m | 14:11:55 | 14:12:30 | 34.3 | 0 | 0 |
| rate census-40m | 14:12:45 | 14:13:22 | 37.7 | 0 | 0 |
| rate census-80m | 14:13:37 | 14:14:15 | 37.4 | 0 | 0 |

### 5.3 Criteria (`criteria.mjs`)

```text
node docs/difficulty-v3/landscape-v3/criteria.mjs --round docs/difficulty-v3/landscape-v3/r1 --baseline docs/difficulty-v3/baseline-v2 --final docs/difficulty-v3/landscape-v3/r1/probe/final.jsonl --fit tests/artifacts/MP12a/r1/fit-current.json
```

| Criterion | Status | Numbers |
|---|---|---|
| C1 levels ordered | pass | 6x10: easy 10 < normal 14 < hard 19 < expert 31 < master 43; 10x10: 9 < 14 < 20 < 31 < 45; 12x12: 10 < 14 < 20 < 31 < 45; 18x20: hard 19 < expert 31 < master 45 |
| C2 Hard and Expert completion | pass | all eight Hard and Expert cells 100.0 % against GV2 100.0 % (bound 90.0 %) |
| C3 proved real choice (Hard and above) | pass | `provedZero` 0 in all twelve Hard-or-above cells; the slow test passed on this tuple (section 3.3) |
| C4 census estimates at most 5 % | **fail** | 6x10-master 66 of 200 (33.0 %); 10x10-master 34 (17.0 %); 12x12-master 25 (12.5 %); 18x20-expert 51 (25.5 %); 18x20-master 134 (67.0 %); every other cell at most 1.5 % (6x10-expert 2, 10x10-hard 1, 10x10-expert 3, 12x12-hard 2, 12x12-expert 2, 18x20-hard 1) |
| C5 no capped prod line | pass | 896 prod lines: complete 896, capped 0, none 0, error 0 |

| Case | request completion | GV2 | bound | C2 | yield | GV2 yield | puzzle rescore hit | v3 median | census share | provedZero | prod complete / capped / none / error | samples unrateable |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6x10-easy | 85.0% | 85.0% | 75.0% | n/a | 97.0% | 97.0% | 100.0% | 10 | 0.0% | 0 | 48 / 0 / 0 / 0 | 0 of 200 |
| 6x10-normal | 95.0% | 95.0% | 85.0% | n/a | 99.0% | 99.0% | 100.0% | 14 | 0.0% | 0 | 48 / 0 / 0 / 0 | 0 of 218 |
| 6x10-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 19 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 252 |
| 6x10-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 31 | 1.0% | 0 | 50 / 0 / 0 / 0 | 0 of 266 |
| 6x10-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 43 | 33.0% | 0 | 50 / 0 / 0 / 0 | 0 of 240 |
| 10x10-easy | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 9 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 220 |
| 10x10-normal | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 14 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 262 |
| 10x10-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 20 | 0.5% | 0 | 50 / 0 / 0 / 0 | 0 of 240 |
| 10x10-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 31 | 1.5% | 0 | 50 / 0 / 0 / 0 | 10 of 262 |
| 10x10-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 45 | 17.0% | 0 | 50 / 0 / 0 / 0 | 9 of 290 |
| 12x12-easy | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 10 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 252 |
| 12x12-normal | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 14 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 280 |
| 12x12-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 20 | 1.0% | 0 | 50 / 0 / 0 / 0 | 5 of 256 |
| 12x12-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 31 | 1.0% | 0 | 50 / 0 / 0 / 0 | 32 of 296 |
| 12x12-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 45 | 12.5% | 0 | 50 / 0 / 0 / 0 | 64 of 306 |
| 18x20-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 19 | 0.5% | 0 | 50 / 0 / 0 / 0 | 0 of 334 |
| 18x20-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 31 | 25.5% | 0 | 50 / 0 / 0 / 0 | 2 of 354 |
| 18x20-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 45 | 67.0% | 0 | 50 / 0 / 0 / 0 | 17 of 348 |

The diagnostic-sample counts equal those of round 0 in every cell (section 2.4); they are reported, never gated. No cell
without a puzzle.

### 5.4 Order noise (RES-13)

| Cell | Lines | G differs | Max G spread | v3 score differs | Max score spread | info differs | Max info spread (bits) | B differs | Max B spread |
|---|---|---|---|---|---|---|---|---|---|
| 6x10-easy | 48 | 0 | 0 | 0 | 0 | 0 | 0.00 | 27 | 4 |
| 6x10-normal | 48 | 0 | 0 | 0 | 0 | 0 | 0.00 | 48 | 16 |
| 6x10-hard | 50 | 0 | 0 | 0 | 0 | 2 | 1.00 | 50 | 118 |
| 6x10-expert | 50 | 7 | 2 | 9 | 11 | 11 | 2.81 | 50 | 1698 |
| 6x10-master | 50 | 12 | 2 | 18 | 13 | 20 | 4.67 | 50 | 3076 |
| 10x10-easy | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 19 | 6 |
| 10x10-normal | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 50 | 13 |
| 10x10-hard | 50 | 3 | 1 | 3 | 6 | 3 | 2.58 | 50 | 42 |
| 10x10-expert | 50 | 6 | 1 | 7 | 7 | 8 | 4.05 | 50 | 786 |
| 10x10-master | 50 | 6 | 1 | 10 | 6 | 12 | 3.39 | 49 | 4954 |
| 12x12-easy | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 12 | 6 |
| 12x12-normal | 50 | 0 | 0 | 1 | 1 | 1 | 0.42 | 49 | 7 |
| 12x12-hard | 50 | 2 | 1 | 2 | 6 | 2 | 2.91 | 50 | 57 |
| 12x12-expert | 50 | 4 | 1 | 4 | 6 | 4 | 1.58 | 50 | 502 |
| 12x12-master | 50 | 7 | 2 | 10 | 11 | 12 | 3.17 | 50 | 4943 |
| 18x20-hard | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 50 | 18 |
| 18x20-expert | 50 | 2 | 1 | 2 | 6 | 10 | 2.32 | 50 | 163 |
| 18x20-master | 50 | 9 | 2 | 13 | 14 | 27 | 7.27 | 50 | 4450 |

Same reading as round 0: the tie order moves `G` by at most 2 and the v3 score by up to 6 at Hard, up to 7 at Expert
(6x10-expert 11) and 6 to 14 at Master.

### 5.5 Census labels (C4; P-OD1)

The captured packs of the five cells, 50 puzzles each, `--orders 0 --tie-orders 1`; numerators as in 2.6.

| Cell | `prod` (10,000,000) | `census-20m` | `census-40m` | `census-80m` |
|---|---|---|---|---|
| 6x10-master | 16/50 (32%) | 8/50 (16%) | 2/50 (4%) | 0/50 (0%) |
| 10x10-master | 3/50 (6%) | 2/50 (4%) | 2/50 (4%) | 1/50 (2%) |
| 12x12-master | 12/50 (24%) | 10/50 (20%) | 4/50 (8%) | 2/50 (4%) |
| 18x20-expert | 16/50 (32%) | 9/50 (18%) | 4/50 (8%) | 0/50 (0%) |
| 18x20-master | 33/50 (66%) | 15/50 (30%) | 7/50 (14%) | 7/50 (14%) |

Cost (deduction ms per puzzle over the 250 puzzles: median, p95, maximum): `prod` 45.1, 238.6, 1,323.6; `census-20m`
54.2, 257.5, 1,332.5; `census-40m` 55.4, 270.4, 1,322.7; `census-80m` 55.1, 337.3, 1,315.5.

### 5.6 The fit on the corpus of round 1

The grid (365,400 sets, 8.2 s, unlocked) on the 896 lines of this round, the distance taken to the current (adopted)
tuple: the current tuple has hit rate 100 % and every board ordered, 326,417 sets meet the constraint, **0 sets are
better**, so the best set of the grid is the adopted tuple. This is shown for the record; no criterion asks for a
further change (a re-score does not predict anything about C4).

### 5.7 Result of round 1

C1, C2, C3 and C5 pass; **C4 fails in the same five cells as in round 0**, now at 33.0 %, 17.0 %, 12.5 %, 25.5 % and
67.0 %. "Choosing a change" for C4 ends with "keep 10,000,000 and report the cells to the owner" when 80,000,000 is not
enough (section 4.1), so at that point there was no change to measure and the penalty question was settled (section
4.3); a round 2 on the same tuple would have repeated round 1, so none was started, and C4 was reported to the owner
(the first report of this task). The owner's decision P-OD7 (section 3.4) then changed `DEDUCE.census`, which round 2
verifies (section 6). Machine time of round 1: shards 1,077.6 s, probe commands 392.5 s, the two D36 commands 58.5 s,
the three between-round checks 162.3 s; total 1,690.9 s (28.2 minutes) of command time, 0 s of lock wait in the shard
and probe commands (the waits of the three between-round checks were not logged), fit 8 s unlocked.

## 6. Round 2 (the tuple of section 3.4, owner decision P-OD7)

### 6.1 Plan and shards

Plan: as round 1 (sections 2.1 and 5.1): the same launcher command per case, the same order, `r2/` folders, the same
probe-corpus and rating commands (`prod` is now the production tuple with `census` 80,000,000, so no census label is
needed to measure it); one bounded command per lock, at least 15 s between locks. Projected from round 1 (1,077.6 s),
and again after the first small case (17.3 s against 16.3 s) and after nine cases (292.6 s against 273.0 s): about
1,150 s for the shards. Actual: 20 invocations in 1,153.5 s, 0 s of lock wait (the Sudoku lock was free whenever this
task asked), no invocation reached a limit; two cases paused on the scheduled timer (exit 3, between rows) and were
resumed by the identical command.

| Case | Start | End | Seconds | Launcher exit | Rows after | Lock wait (s) |
|---|---|---|---|---|---|---|
| 6x10-easy | 16:39:39 | 16:39:56 | 17.3 | 0 | 20 | 0 |
| 6x10-normal | 16:40:12 | 16:40:35 | 23.1 | 0 | 20 | 0 |
| 6x10-hard | 16:40:50 | 16:41:22 | 32.6 | 0 | 20 | 0 |
| 6x10-expert | 16:41:38 | 16:42:12 | 33.9 | 0 | 20 | 0 |
| 6x10-master | 16:42:27 | 16:43:07 | 40.4 | 0 | 20 | 0 |
| 10x10-easy | 16:43:22 | 16:43:40 | 17.3 | 0 | 20 | 0 |
| 10x10-normal | 16:43:56 | 16:44:25 | 29.1 | 0 | 20 | 0 |
| 10x10-hard | 16:44:40 | 16:45:12 | 32.1 | 0 | 20 | 0 |
| 10x10-expert | 16:45:27 | 16:46:34 | 66.8 | 0 | 20 | 0 |
| 10x10-master | 16:46:49 | 16:49:27 | 157.8 | 3 | 13 | 0 |
| 10x10-master (resumed, identical command) | 16:49:42 | 16:51:13 | 90.8 | 0 | 20 | 0 |
| 12x12-easy | 16:51:28 | 16:51:48 | 19.8 | 0 | 20 | 0 |
| 12x12-normal | 16:52:03 | 16:52:36 | 32.4 | 0 | 20 | 0 |
| 12x12-hard | 16:52:51 | 16:53:39 | 48.2 | 0 | 20 | 0 |
| 12x12-expert | 16:53:54 | 16:55:01 | 67.1 | 0 | 20 | 0 |
| 12x12-master | 16:55:17 | 16:57:47 | 150.7 | 3 | 15 | 0 |
| 12x12-master (resumed, identical command) | 16:58:02 | 16:59:01 | 58.8 | 0 | 20 | 0 |
| 18x20-hard | 16:59:16 | 16:59:59 | 42.8 | 0 | 20 | 0 |
| 18x20-expert | 17:00:14 | 17:01:25 | 70.9 | 0 | 20 | 0 |
| 18x20-master | 17:01:40 | 17:03:42 | 121.6 | 0 | 20 | 0 |

Every case printed `publish: wrote docs/difficulty-v3/landscape-v3/r2/<case>-2026-11-13.json and ....md; deleted the
staged checkpoint` at its first publish.

Source identity of the 18 reports (equal in all): `sourceDigest`
`34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918` (also the tree's digest when this section was
written), `versions` as in round 0, `sourceCommit` `f33aa7158aec19cbd06b7a788c69b25b0050fafe+uncommitted-changes`.

| Case | Rows | Completed ten | Partial reasons | T10 median (ms) | T10 p95 (ms) | Peak process (MiB) |
|---|---|---|---|---|---|---|
| 6x10-easy | 20 | 17 | layouts-not-found: 3 | 305 | 409 | 199 |
| 6x10-normal | 20 | 19 | layouts-not-found: 1 | 600 | 1174 | 238 |
| 6x10-hard | 20 | 20 | none | 767 | 2641 | 207 |
| 6x10-expert | 20 | 20 | none | 859 | 1284 | 177 |
| 6x10-master | 20 | 20 | none | 1158 | 1690 | 183 |
| 10x10-easy | 20 | 20 | none | 305 | 449 | 217 |
| 10x10-normal | 20 | 20 | none | 605 | 1263 | 245 |
| 10x10-hard | 20 | 20 | none | 589 | 927 | 212 |
| 10x10-expert | 20 | 20 | none | 924 | 2721 | 204 |
| 10x10-master | 20 | 20 | none | 8995 | 16443 | 185 |
| 12x12-easy | 20 | 20 | none | 355 | 455 | 233 |
| 12x12-normal | 20 | 20 | none | 852 | 1421 | 233 |
| 12x12-hard | 20 | 20 | none | 619 | 1538 | 232 |
| 12x12-expert | 20 | 20 | none | 908 | 2462 | 210 |
| 12x12-master | 20 | 20 | none | 5959 | 18406 | 200 |
| 18x20-hard | 20 | 20 | none | 911 | 1677 | 299 |
| 18x20-expert | 20 | 20 | none | 1539 | 3303 | 285 |
| 18x20-master | 20 | 20 | none | 3391 | 5258 | 317 |

No request was interrupted or incomplete; the partial outcomes are the same four `layouts-not-found` requests as in
rounds 0 and 1 and in the GV2 baseline. The time per request rose most in the Expert and Master cells (T10 median:
6x10-master 1,022 to 1,158 ms, 10x10-expert 787 to 924 ms, 10x10-master 8,284 to 8,995 ms, 12x12-master 5,664 to
5,959 ms, 18x20-expert 1,397 to 1,539 ms, 18x20-master 2,741 to 3,391 ms, all against round 1); the Easy to Hard cells
stay within 7 %.

### 6.2 Probe corpus

Manifest `docs/difficulty-v3/landscape-v3/r2/probe/manifest.json`: 90 requests, every generation exit 0, 896 accepted
puzzles, **identity 90 of 90 matched**, `finalDeduce` equal to the pinned `DEDUCE` (`census` 80,000,000). Classification
of the `prod` lines: 896 lines, **complete 896, capped 0, none 0, error 0, count cutoffs 0**; `final.jsonl` has 896
lines.

| Command | Start | End | Seconds | Exit | Lock wait (s) |
|---|---|---|---|---|---|
| capture A:6x10 | 17:04:08 | 17:04:37 | 29.1 | 0 | 0 |
| capture A:10x10 | 17:04:52 | 17:05:43 | 51.1 | 0 | 0 |
| capture A:12x12 | 17:05:58 | 17:06:55 | 57.3 | 0 | 0 |
| capture A:18x20 | 17:07:10 | 17:07:42 | 32.2 | 0 | 0 |
| rate prod A:6x10 | 17:07:57 | 17:08:16 | 18.3 | 0 | 0 |
| rate prod A:10x10 | 17:08:31 | 17:09:18 | 47.0 | 0 | 0 |
| rate prod A:12x12 | 17:09:33 | 17:10:00 | 27.9 | 0 | 0 |
| rate prod A:18x20 | 17:10:16 | 17:10:57 | 41.1 | 0 | 0 |

### 6.3 Criteria (`criteria.mjs`)

```text
node docs/difficulty-v3/landscape-v3/criteria.mjs --round docs/difficulty-v3/landscape-v3/r2 --baseline docs/difficulty-v3/baseline-v2 --final docs/difficulty-v3/landscape-v3/r2/probe/final.jsonl --fit tests/artifacts/MP12a/r2/fit-current.json
```

| Criterion | Status | Numbers |
|---|---|---|
| C1 levels ordered | pass | 6x10: easy 10 < normal 14 < hard 19 < expert 31 < master 43; 10x10: 9 < 14 < 20 < 31 < 45; 12x12: 10 < 14 < 20 < 31 < 45; 18x20: hard 19 < expert 31 < master 44 |
| C2 Hard and Expert completion | pass | all eight Hard and Expert cells 100.0 % against GV2 100.0 % (bound 90.0 %) |
| C3 proved real choice (Hard and above) | pass | `provedZero` 0 in all twelve Hard-or-above cells; the slow test passed on this tuple (section 3.4) |
| C4 census estimates at most 5 % | **fail** | **10x10-master 14 of 200 (7.0 %)** and 18x20-master 22 (11.0 %, the owner's accepted exception); every other cell at most 2.5 % (6x10-master 4 = 2.0 %, 12x12-master 5 = 2.5 %, 18x20-expert 2 = 1.0 %, all others 0) |
| C5 no capped prod line | pass | 896 prod lines: complete 896, capped 0, none 0, error 0 |

| Case | request completion | GV2 | bound | C2 | yield | GV2 yield | puzzle rescore hit | v3 median | census share | provedZero | prod complete / capped / none / error | samples unrateable |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6x10-easy | 85.0% | 85.0% | 75.0% | n/a | 97.0% | 97.0% | 100.0% | 10 | 0.0% | 0 | 48 / 0 / 0 / 0 | 0 of 200 |
| 6x10-normal | 95.0% | 95.0% | 85.0% | n/a | 99.0% | 99.0% | 100.0% | 14 | 0.0% | 0 | 48 / 0 / 0 / 0 | 0 of 218 |
| 6x10-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 19 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 252 |
| 6x10-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 31 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 266 |
| 6x10-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 43 | 2.0% | 0 | 50 / 0 / 0 / 0 | 0 of 240 |
| 10x10-easy | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 9 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 220 |
| 10x10-normal | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 14 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 262 |
| 10x10-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 20 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 240 |
| 10x10-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 31 | 0.0% | 0 | 50 / 0 / 0 / 0 | 10 of 262 |
| 10x10-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 45 | **7.0%** | 0 | 50 / 0 / 0 / 0 | 9 of 290 |
| 12x12-easy | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 10 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 252 |
| 12x12-normal | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 14 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 280 |
| 12x12-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 20 | 0.0% | 0 | 50 / 0 / 0 / 0 | 5 of 256 |
| 12x12-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 31 | 0.0% | 0 | 50 / 0 / 0 / 0 | 32 of 296 |
| 12x12-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 45 | 2.5% | 0 | 50 / 0 / 0 / 0 | 64 of 306 |
| 18x20-hard | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 19 | 0.0% | 0 | 50 / 0 / 0 / 0 | 0 of 334 |
| 18x20-expert | 100.0% | 100.0% | 90.0% | pass | 100.0% | 100.0% | 100.0% | 31 | 1.0% | 0 | 50 / 0 / 0 / 0 | 2 of 354 |
| 18x20-master | 100.0% | 100.0% | 90.0% | n/a | 100.0% | 100.0% | 100.0% | 44 | 11.0% | 0 | 50 / 0 / 0 / 0 | 17 of 348 |

Request completion and yield equal GV2 and rounds 0 and 1 in every cell; the diagnostic-sample counts equal those of
the earlier rounds (reported, never gated); no cell without a puzzle.

### 6.4 Order noise (RES-13)

| Cell | Lines | G differs | Max G spread | v3 score differs | Max score spread | info differs | Max info spread (bits) | B differs | Max B spread |
|---|---|---|---|---|---|---|---|---|---|
| 6x10-easy | 48 | 0 | 0 | 0 | 0 | 0 | 0.00 | 27 | 4 |
| 6x10-normal | 48 | 0 | 0 | 0 | 0 | 0 | 0.00 | 48 | 16 |
| 6x10-hard | 50 | 0 | 0 | 0 | 0 | 2 | 1.00 | 50 | 118 |
| 6x10-expert | 50 | 7 | 2 | 9 | 11 | 11 | 2.81 | 50 | 1698 |
| 6x10-master | 50 | 11 | 2 | 18 | 13 | 20 | 4.67 | 50 | 4374 |
| 10x10-easy | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 19 | 6 |
| 10x10-normal | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 50 | 13 |
| 10x10-hard | 50 | 3 | 1 | 3 | 6 | 3 | 2.58 | 50 | 42 |
| 10x10-expert | 50 | 6 | 1 | 6 | 7 | 7 | 3.75 | 50 | 786 |
| 10x10-master | 50 | 6 | 1 | 10 | 6 | 11 | 3.39 | 49 | 4954 |
| 12x12-easy | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 12 | 6 |
| 12x12-normal | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 49 | 7 |
| 12x12-hard | 50 | 3 | 2 | 3 | 12 | 3 | 3.39 | 50 | 57 |
| 12x12-expert | 50 | 4 | 1 | 4 | 6 | 4 | 1.58 | 50 | 502 |
| 12x12-master | 50 | 7 | 2 | 10 | 11 | 10 | 3.17 | 50 | 4943 |
| 18x20-hard | 50 | 0 | 0 | 0 | 0 | 0 | 0.00 | 50 | 18 |
| 18x20-expert | 50 | 1 | 1 | 1 | 7 | 2 | 2.58 | 50 | 163 |
| 18x20-master | 50 | 9 | 2 | 13 | 13 | 19 | 5.61 | 50 | 986 |

Same reading as before: the tie order moves `G` by at most 2 and the v3 score by up to 12 at Hard (12x12-hard), 7 at
Expert (11 at 6x10-expert) and 6 to 13 at Master.

### 6.5 Census shares (C4): the landscape and the probe corpus

| Cell | Round 1 (10,000,000), landscape of 200 | Round 2 (80,000,000), landscape of 200 | Round 2 `prod`, probe corpus of 50 |
|---|---|---|---|
| 6x10-master | 66 (33.0 %) | 4 (2.0 %) | 1 (2 %) |
| 10x10-master | 34 (17.0 %) | **14 (7.0 %)** | 2 (4 %) |
| 12x12-master | 25 (12.5 %) | 5 (2.5 %) | 2 (4 %) |
| 18x20-expert | 51 (25.5 %) | 2 (1.0 %) | 0 (0 %) |
| 18x20-master | 134 (67.0 %) | 22 (11.0 %) | 8 (16 %) |

The other thirteen cells are at most 1.5 % in round 1 and 0.0 % in round 2. The bound of 5 % is 10 puzzles of 200:
10x10-master has 14. Cost of the larger budget in the probe corpus (deduction ms per puzzle over the 250 puzzles of the
five cells, round 2 against round 1): median 49.2 against 45.1, p95 361.9 against 238.6, maximum 1,319.4 against
1,323.6.

### 6.6 The fit on the corpus of round 2

The grid (365,400 sets, 8.3 s, unlocked): the current tuple (the round-1 score knobs) has hit rate 100 % and every
board ordered, 326,417 sets meet the constraint, **0 sets are better**; nothing to change in the score knobs.

### 6.7 Result of round 2, and the stop

C1, C2, C3 and C5 pass. **C4 fails in two cells: 10x10-master (7.0 %, 14 of 200) and 18x20-master (11.0 %, 22 of
200).** 18x20-master is the exception the owner accepted (P-OD7, "about 12-14 %"; 11.0 % is below that range).
10x10-master is not covered by the owner's decision, and the orders were that any other cell failing C4 stops the task
with the numbers, so **the task stopped here**: GF-P2 and GA-P2 were not run for the round-2 tuple, and the final
`npm test` was not claimed as a gate (section 8 has the state of the tree and the one state check). No fourth round
was started (three rounds are the ceiling) and no value was chosen. Machine time of round 2: shards 1,153.5 s, the
two D36 commands 56.5 s, the three between-round checks 172.1 s, captures 169.7 s, `prod` ratings 134.3 s, the state
check of section 8 123.4 s; total 1,809.5 s (30.2 minutes) of command time, 0 s of lock wait in every command; the fit
(8.3 s) ran unlocked.

## 7. Final criteria and findings for the owner

### 7.1 Final criteria table (round 2, the last round, with rounds 0 and 1 beside it)

| Criterion | Round 0 | Round 1 | Round 2 (last) | Numbers of round 2 |
|---|---|---|---|---|
| C1 levels ordered | pass | pass | pass | medians strictly increase on 6x10 (10, 14, 19, 31, 43), 10x10 (9, 14, 20, 31, 45), 12x12 (10, 14, 20, 31, 45) and 18x20 (19, 31, 44) |
| C2 Hard and Expert completion | pass | pass | pass | eight cells at 100.0 % against GV2 100.0 % |
| C3 proved real choice | pass | pass | pass | `provedZero` 0 in twelve cells; the slow test passes |
| C4 census at most 5 % | **fail** (5 cells) | **fail** (5 cells) | **fail** (2 cells) | 10x10-master 7.0 % (14 of 200); 18x20-master 11.0 % (22 of 200, the owner's accepted exception); the other sixteen cells at most 2.5 % |
| C5 no capped prod line | pass | pass | pass | 896 of 896 complete |

GL-P3, slice part: the 18 cells were measured in three rounds; C1, C2, C3 and C5 hold; **C4 holds in sixteen cells,
fails in 18x20-master (accepted by the owner) and fails in 10x10-master (7.0 %), which the owner's decision does not
cover**. No cell failed to make puzzles: every GV2 cell has accepted v3 puzzles and the same request completion rate and
yield as GV2, so no D36 finding for a GV2 cell.

### 7.2 Findings for the owner

1. **C4 in 10x10-master after the owner's choice of 80,000,000** (sections 6.3 and 6.5): 14 of 200 accepted puzzles are
   census estimates (7.0 %; the bound of 5 % is 10 puzzles). It was 34 of 200 (17.0 %) at 10,000,000. The probe corpus
   of the same round has 2 of 50 (4 %) in this cell, and the probe labels of round 1 gave 2 % at 80,000,000 for it. The
   cell is not part of the exception the owner accepted (18x20-master), the task has no round left (three are the
   ceiling) and no further value is allowed by its rules, so the task stopped and no value was chosen. For the owner:
   accept 10x10-master's remaining estimates as well (the same kind of acceptance as 18x20-master), or decide on
   another way to treat the cell. 18x20-master is 11.0 % (22 of 200), within the accepted exception. Decided by the
   owner on 2026-11-13 at 17:44: P-OD8 (a), 10x10-master's census estimates are accepted like 18x20-master's; `census`
   stays 80,000,000 and the task closes (sections 8.6-8.9).
2. **Order noise** (section 6.4): a puzzle's v3 score depends on the tie order of the deduction by up to 12 at Hard
   (12x12-hard; 6 at 10x10-hard, none at 6x10 and 18x20), up to 7 at Expert (11 at 6x10-expert) and 6 to 13 at Master (one decisive guess is worth 5
   points). The generator and rating use the canonical order, so a stored score is stable; no aggregation was adopted
   (RES-13).
3. **P-OD3** (section 4.3): the penalty was restored on the task's rule; the measured data do not separate the two
   tuples.
4. **Work-cap headroom** (section 4.2): the largest main-search work of rounds 1 and 2 is 58.6 % of the cap and its
   largest node count 70.8 % of the node cap, both in 10x10-master.
5. **`STALL_LIMIT`** in force: 12 (section 1); the slice has no Hell case.

## 8. Gates (GF-P2, GA-P2 and the test plan)

Sections 8.1 to 8.3 record what ran after round 1, on the round-1 tuple. The tuple changed after that (`DEDUCE.census`,
section 3.4) and the task stopped at round 2 (section 6.7), so they are superseded for the final tuple: section 8.4 gives
the state of the tree after round 2 and section 8.5 what remains.

### 8.1 GF-P2 after round 1 (the generation fixtures)

`node tools/record-fixtures.mjs --replace --reason "P3: v3 calibration (slice)"` wrote `fixture-set-0` again: the two
fixtures `tests/fixtures/generation-case.json` and `tests/fixtures/generated-sample-pack.json` changed (43 lines added,
50 removed); `node tools/record-fixtures.mjs --check` prints `record-fixtures: OK` (also at the end of that step). Then, under
the lock, the fixture-dependent files (`generate`, `cli`, `puzzlecode-cli`, `generation-client`, `calibration`,
`benchmark-matrix`, `player-load`, `rate-probe`, `generator-state`, `generator-controller` and `pack` tests, slow ones
skipped): 315 of 315 pass (19.9 s), and the quick set: 1,340 of 1,340 pass (22.6 s).

### 8.2 GA-P2 after round 1 (the UI-flow recipes)

The first full run after GF-P2 (kept as `tests/artifacts/MP12a/ga-p2-first.txt`, 115.2 s): 1,360 tests, 3 failures, all
in `tests/generator-controller.test.js`: the recipes `default-10x6-normal`, `heart-n10-master` and
`square-22x22-nightmare`, each failing only at its `scores` assertion; the assertions before it (the batches completed,
the keys and the levels) passed, so only completed recipes were migrated: `expect.scores` of those three in
`tests/fixtures/ui-flow-recipes.json` (the values are in section 3.2). Then the UI-flow file passes 29 of 29 (14 s) and
the full `npm test` passes 1,360 of 1,360 (113 s). No recipe other than the three moved, and no recipe key, level or
count changed.

### 8.3 The test plan on the round-1 tree

| Command | Result | Seconds | Lock wait (s) |
|---|---|---|---|
| `launch.mjs --self-test` | `launch self-test: 23 of 23 cases as expected` | under 1 | none |
| `criteria.mjs --self-test` | `criteria self-test: 5 of 5 synthetic rounds as expected` | under 1 | none |
| targeted tests (policy, difficulty, difficulty-v3, clues, tasks, worker-pool; slow ones skipped) | 164 of 164 pass | 5.4 | 0 |
| slow v3 test | 1 of 1 passes | 101 | 0 |
| quick set (`--test-skip-pattern=slow tests/**/*.test.js`) | 1,340 of 1,340 pass | 23.3 | 0 |
| the final `npm test` (`--test tests/**/*.test.js`) | 1,360 of 1,360 pass | 112.3 | 0 |
| `node tools/record-fixtures.mjs --check` | `record-fixtures: OK` | under 1 | none |
| `npm run check` | `check-conventions: OK`, `check-site: OK` (run last, after this record was complete) | not timed | none |

Total machine time of rounds 0 and 1 and their gates: round 0 about 25 minutes of command time and 22 minutes of lock
wait; round 1 and the change step 28.2 minutes and no logged wait; GF-P2 and GA-P2 about 5 minutes; the final commands 4
minutes. The waits of round 0 (1,321.4 s) were for the Sudoku repository's locked measurements; every later logged
command waited 0 s.

### 8.4 The tree after round 2 (the stop)

The tree has the round-2 change (`DEDUCE.census` 80,000,000 in `policy.js`, its pin in `tests/policy.test.js`, the
15 x 20 Nightmare pin in `tests/clues.test.js`, `docs/design-detail.md`) and nothing else. GF-P2 and GA-P2 were **not**
run for it (the stop of section 6.7). One state check was run so that the orchestrator knows what is left:

| Command | Result | Seconds | Lock wait (s) |
|---|---|---|---|
| `node tools/record-fixtures.mjs --check` | `record-fixtures: OK`: the generation fixtures recorded after round 1 are still reproduced under the census of 80,000,000 | under 1 | none |
| `npm test` (`--test tests/**/*.test.js`, before any GF-P2 or GA-P2) | 1,360 tests, 1,358 pass, **2 fail** (below) | 123.4 | 0 |
| the D36 commands and the between-round checks of section 3.4 | all as stated there | 56.5 + 172.1 | 0 |

The two failures are UI-flow recipes of `tests/generator-controller.test.js`, each only at its `scores` assertion (the
batches completed, as in 8.2), so GA-P2 would migrate them: `heart-n10-master` actual [44, 43, 48, 44, 41, 48, 46, 49,
43, 49] against the recorded [49, 49, 43, 44, 41, 49, 48, 44, 43, 49]; `square-22x22-nightmare` actual [71, 60, 67, 66,
60, 61, 63, 63, 60, 65] against [67, 62, 67, 66, 61, 61, 63, 65, 62, 67]. `default-10x6-normal` and the other recipes
pass. These are the values printed by the failing run; nothing was written to the recipe file.

### 8.5 What remains once the owner has decided

If the owner accepts 10x10-master's remaining census estimates as well: GF-P2 with the reason "P3: v3 calibration (slice,
census 80M)" (the check above suggests it changes no fixture), GA-P2 (migrate only `expect.scores` of the two recipes
above, as in 8.2), the strict fixture files and the quick set, the final `npm test` and `npm run check` under the lock,
and the handoff of section 9 with round 2 as the slice evidence. If the owner decides otherwise, the pins of sections 3.2
and 3.4 move with the new value.

Done after P-OD8 (a): sections 8.6 to 8.9.

### 8.6 The owner's decision P-OD8 and the plan author's answer to PR-P1

**P-OD8** (`clarifications-resolved.md` Part H; asked 2026-11-13 17:25, answered 17:44). The question: C4 after P-OD7
fails in 10x10-master (14 of 200 census estimates, 7.0 %; the bound of 5 % is 10 puzzles; 17.0 % at 10,000,000), a cell
outside the owner's 18x20-master exception, and the three-round ceiling is used up. The evidence: the other sixteen
cells are at most 2.5 % (18x20-master 11.0 %, within its exception), the probe corpus of the round has 10x10-master at
4 % (2 of 50), C1, C2, C3 and C5 pass (sections 6.3, 6.5, 6.7 and 7.2). The options: (a) accept 10x10-master's remaining
estimates as well and close MP12a at 80,000,000; (b) a fourth round with a larger `census` (for example 160,000,000),
outside the task's ceiling, at further deduction cost; (c) the plan author answers. **The answer (owner, 2026-11-13
17:44): (a).** The 7.0 % are accepted, the same kind of acceptance as 18x20-master's; `census` stays 80,000,000 and
MP12a closes. No value changed.

**The plan author's answer to PR-P1** (`docs/difficulty-v3/clarifications-resolved.md` Part I, PR-P1, 2026-11-13,
recorded with the owner's decision P-OD9), the rows that concern the slice:

| Row | Position |
|---|---|
| K2 to K5, the tuple | `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)` (`base.max / base.scale / rule / weights.G / weights.info / penalty`) is the tuple to lock, unless MP12b1 breaks C1 or C3; values on range edges are acceptable (the ranges bounded the search, they were not predictions) |
| K6 | accepted: a puzzle without a decisive guess scores at most 15, below Hard |
| K10, G6, the census and the 5 % rule | accepted, with the owner's two exceptions (18x20-master, P-OD7; 10x10-master, P-OD8). On the full landscape a cell above 5 % census estimates is a listed finding, shipped with the estimate note and the `censored` flag; only a cell above 25 % goes to the owner, with the cost of a larger census; no census change in MP12b |
| R7, order noise | confirmed: one canonical order and no median. It is a property of the label, not an instability (a given puzzle always gets the same rating, and the Generator aims at the band centre); a median of three orders would triple the rating cost. A known limitation of design §7.8, with the numbers of section 6.4 |
| P-OD9 | D36 is decided, option (i) (a level is offered only where v3 can make it). Stops and reviews as in the Sudoku repository: a part stops for the owner only for a correctness failure or when it would have to change a recorded decision; a performance or availability finding is a named item with its numbers, in MP12b2's record or in MP17; the analysts cross-review only MP12b2's lock, MP12b3 and MP15a1 |

Named items of the close:

1. **EPERM in the cleanup hook of `tests/site-tools.test.js`** (for MP17). The first GA-P2 run of round 2
   (17:45:18-17:47:22, `tests/artifacts/MP12a/ga-p2-r2-first.txt`) ended that file with `EPERM, Permission denied` from
   `rmSync` in its cleanup hook (`tests/site-tools.test.js:20`), which could not remove the folder
   `tests/artifacts/site-tools-1XNSQz`; the file's 36 tests had passed. The file passes alone (17:48:16-17:48:22, 36 of
   36, exit 0) and the final `npm test` of the close (section 8.8) did not repeat it. It predates this task's change:
   the test touches no rating.
2. **The comment above `SCORE_V3` in `core/engine/policy.js`** still reads "Defined but not yet the rating: `rate`
   stays `difficulty-v2` until the v3 activation": a source file is not edited by this close (the source digest must
   stay as in the round-2 reports), so MP12b3 corrects it; `docs/design-detail.md` §4.2 is corrected here.
3. Nothing new from the GA-P2 verification (section 8.8): no failure, no EPERM, no run at its limit.

### 8.7 GF-P2 for the round-2 tuple

The orchestrator ran GF-P2 for the round-2 tuple at 17:44 (both fixtures carry the file time 17:44:42). The reason text
of that command is not recorded; the fixtures do not store it. The close ran no `--replace`. Step 2 of the close, the
check only (label `MP12a close fixture check`, 20:54:58-20:54:59, 0.6 s, lock wait 0 s): `record-fixtures: OK`. The
diff of the two fixtures between `f33aa71` and HEAD (`git diff --numstat f33aa71 HEAD`): `generation-case.json` 11
insertions and 11 deletions, `generated-sample-pack.json` 32 and 39; 43 added and 50 removed in all, the totals of
section 8.1. Whether the rewrite of 17:44 changed the content written after round 1 is not recorded (that output was
overwritten before any commit); the state check of section 8.4 (`--check` OK under 80,000,000 before the rewrite) says
that the census change reproduced the same puzzles.

### 8.8 GA-P2 for the round-2 tuple

- **First run** (label `MP12a r2 GA-P2 first run`, 17:45:18-17:47:22, 123.8 s, lock wait 0 s,
  `tests/artifacts/MP12a/ga-p2-r2-first.txt`): 1,361 tests, 1,358 pass, 3 fail. Two are the `scores` of the recipes
  `heart-n10-master` and `square-22x22-nightmare` of `tests/generator-controller.test.js` (each only at its `scores`
  assertion, as in 8.2 and 8.4); the third is `tests/site-tools.test.js`, whose 36 tests passed and whose cleanup hook
  failed with EPERM (section 8.6).
- **The migration** (17:48, orchestrator): `expect.scores` of those two recipes in `tests/fixtures/ui-flow-recipes.json`,
  to the values of section 8.4: `heart-n10-master` [44, 43, 48, 44, 41, 48, 46, 49, 43, 49], `square-22x22-nightmare`
  [71, 60, 67, 66, 60, 61, 63, 63, 60, 65]. No key, level, count or other recipe changed.
- **`tests/site-tools.test.js` alone** (17:48:16-17:48:22): 36 of 36, exit 0 (`tests/artifacts/MP12a/r2/site-tools.log`).
- **The close checked the file** before its runs: it holds the two lists above, and its diff between `f33aa71` and HEAD
  changes only the three `scores` lines of `default-10x6-normal` (round 1's values, `[15, 16, 13, 13, 16]`),
  `heart-n10-master` and `square-22x22-nightmare`.
- **The runs of the close**, under the lock:

| Command (label) | Result | Start-end | Seconds | Lock wait (s) |
|---|---|---|---|---|
| UI-flow file (`MP12a close UI-flow recipes`: `--test tests/generator-controller.test.js`) | 29 of 29 pass | 20:55:27-20:55:37 | 9.4 | 0 |
| final `npm test` (`MP12a close GA-P2 final`: `--test tests/**/*.test.js`, TAP in `tests/artifacts/MP12a/ga-p2-r2-final.txt`, not tracked) | 1,360 tests, 125 suites, 1,360 pass, 0 fail | 20:55:52-20:57:54 | 122.6 | 0 |

The final `npm test` passed at its first run, so no second run (`MP12a close GA-P2 final 2`) was needed.

### 8.9 The test plan on the round-2 tree

| Command | Result | Seconds | Lock wait (s) |
|---|---|---|---|
| `git status --short`; `git diff --stat f33aa71 HEAD -- core tools tests/fixtures tests/policy.test.js tests/difficulty-v3.test.js tests/clues.test.js` | nothing changed outside `tests/artifacts/` and the pack's own paths (`tasks/difficulty-v3/`, `clarifications*.md`, the analysts' folders); the diff touches exactly `core/engine/policy.js`, the two generation fixtures, `ui-flow-recipes.json`, `tests/policy.test.js`, `tests/difficulty-v3.test.js` and `tests/clues.test.js` | not timed | none |
| the identity (`computeSourceDigest`, `currentVersions()`) | `sourceDigest` `34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918`; versions `gen-v3`, `mixed-v2`, `xoshiro128ss-v1`, `difficulty-v3` | not timed | none |
| `node tools/record-fixtures.mjs --check` (`MP12a close fixture check`) | `record-fixtures: OK` | 0.6 | 0 |
| UI-flow file (`MP12a close UI-flow recipes`) | 29 of 29 pass | 9.4 | 0 |
| the final `npm test` (`MP12a close GA-P2 final`) | 1,360 of 1,360 pass | 122.6 | 0 |
| quick set (`MP12a close quick set`: `--test --test-skip-pattern=slow tests/**/*.test.js`, TAP reporter to `tests/artifacts/MP12a/close-quick.txt` for the counts) | 1,340 of 1,340 pass (124 suites) | 23.0 | 0 |
| `launch.mjs --self-test` | `launch self-test: 23 of 23 cases as expected` | under 1 | none |
| `criteria.mjs --self-test` | `criteria self-test: 5 of 5 synthetic rounds as expected` | under 1 | none |
| format check of the record, `docs/design-detail.md`, `launch.mjs` and `criteria.mjs` (CRLF, BOM) | all four `CRLF only`, `no BOM` | under 1 | none |
| `npm run check` (run last, after the record and the design were complete) | `check-conventions: OK`, `check-site: OK` | not timed | none |

Command time of the four locked commands: 155.6 s; no lock wait in any of them (the helper pauses 15 s after each
release). The close measured nothing and edited no `SOURCE_FILES` file, test or fixture: the source digest is the one of
the 18 round-2 reports.

## 9. Handoff

- **Knobs and caps in the tree.** `SCORE_V3`: `base { max: 12, scale: 3 }`, `rule [0, 0, 2, 3]`, `weights { G: 5,
  info: 0.5 }`, `penalty { few: 1, many: 2 }`. `DEDUCE`: `{ lookaheadWidth: 4, nodes: 30000, solutions: 8,
  work: 760000000, census: 80000000, memoryBytes: 33554432 }` (the census is the owner's P-OD7 value, measured by round
  2). `K60`, `POLICY_ID`, `SHARES` and `STALL_LIMIT` (12) unchanged.
- **The record** is this file; the last round is `docs/difficulty-v3/landscape-v3/r2/` (18 reports, `probe/` with the
  manifest, the 90 packs and `final.jsonl`), the slice evidence of GL-P3 for the tuple above. Source identity of its
  reports: digest `34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918`, versions `{ algo: gen-v3, policy:
  mixed-v2, rng: xoshiro128ss-v1, model: difficulty-v3, app: 1.0.0 }`, `sourceCommit` `f33aa71...+uncommitted-changes`
  (the tree with both changes, committed in `a25960c`; the digest, not the commit, is what `publish` checks). `r1/`
  (digest `97e1a5a1...`, the census at 10,000,000) and `r0/` (the old score tuple) are kept as evidence.
- **The launcher** is `docs/difficulty-v3/landscape-v3/launch.mjs` (`run`, `publish`, `--self-test`; the identity fix of
  section 1.1 and TP29 are in); the criteria script is `docs/difficulty-v3/landscape-v3/criteria.mjs`. MP12b1 runs the
  full landscape with the same launcher and lock helper.
- **GF-P2 and GA-P2** ran for the round-2 tuple (sections 8.7 and 8.8): the fixture check is OK, the UI-flow file passes
  29 of 29 and the final `npm test` 1,360 of 1,360; the quick set (1,340 of 1,340), both self-tests and `npm run check`
  pass on the same tree (section 8.9). Nothing was measured again and no source file changed since round 2, so the
  slice evidence stays valid for the tuple above.
- **For the owner:** nothing open from this task. C4 holds in sixteen cells and fails in 18x20-master (11.0 %) and in
  10x10-master (7.0 %, 14 of 200), both accepted (P-OD7, P-OD8); the work cap stays at 760,000,000; the penalty is
  (1, 2) with `rule[3]` = 3 (section 4).
- **For MP12b1:** reuse the 18 round-2 reports only under an equal source digest (`34cea386...`) and equal values of the
  four version keys `algo`, `policy`, `rng` and `model` (the reports also carry `app`, which `currentVersions()` lacks,
  section 1.1). The cells with the largest cost are the Master cells and 18x20-expert; the 10x10-master request is the
  slowest (a median of 9.0 s per request of ten puzzles in round 2) and its work reaches 58.6 % of the work cap. No GV2
  cell lacks a puzzle.
- **For MP12b2:** the tuple to lock is `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)` unless MP12b1 breaks C1 or
  C3 (section 8.6); the two accepted census exceptions are 18x20-master (11.0 %) and 10x10-master (7.0 %); R7 (one
  canonical order, no median) is a known limitation of design §7.8, with the numbers of section 6.4; `STALL_LIMIT` stays
  12 and its re-examination is skipped; the GV2 cells made puzzles with the same request completion rate and yield as
  v2, so no D36 finding arises from the slice (the Hell report and the search evidence are MP12b2's own work); the named
  items of section 8.6 (the EPERM for MP17, the stale `SCORE_V3` comment for MP12b3).

