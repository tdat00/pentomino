# IGP-04 comparison: the first-phase factor (P6 and eight workers)

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-04.json -Label frozen -SourceLabel <label> -LockHelper <path>.

Provisional (pre-freeze) numbers. Times are *Measured*; every factor is *Derived*: the median of the per-seed ratios first arm / second arm on matched seeds only (above 1 is faster in the second arm), with n beside, and no factor estimate below n = 3; completion ("ten of n") is always beside a time. The first-phase factor is a *Projection*: P7 is assumed, not prototyped.

**Labels.** Only A:B isolates P6 (today's search, four workers, the fast cells). B:C is the width alone, A:C is P6 and the width together on today's search, and E:F is P6 and the width together on the prototype: neither is P6 alone. Every eight-worker figure is an **unadmitted upper bound**: it raises `MAX_POOL_SIZE` to 8 without IG-P-Q05's width rule (above four only with `deviceMemory` of at least 8) and without its admission rule (a task is admitted only when its workspace ceiling times the width plus the main budget fits both memory checks); it is not the accepted P8 policy.

Identity: every required identity holds (prefix identity between the arms of each pair on every seed; arm E equals IGP-01's after arm; arm A agrees with MP12b1).

## Arm E against IGP-01/after

The prototype's default path reproduces IGP-01's after arm: the puzzles are equal on every seed.

| Seed | Accepted (IGP-01 / this arm) | `resultDigest` equal | Set key equal | Puzzle keys equal | Result |
|---|---|---|---|---|---|
| landscape/14x14-nightmare/0 | 10 / 10 | true | true | true | equal |
| landscape/14x14-nightmare/1 | 10 / 10 | true | true | true | equal |

## A:B: P6 alone, on today's search at four workers: the isolated P6 factor

First arm A (log, 4 workers), second arm B (log-p6, 4 workers). Ratios are first / second.

| Cell | Matched seeds | Ten of n (first / second) | T10 factor (median [min-max] n) | T1 factor (the set stage) | T10 - T1 factor (the batch) | Response factor | T10 median, s (first → second) | Identity |
|---|---:|---|---|---|---|---|---|---|
| 26x26 Nightmare | 4 | 4 / 4 of 4 | 1.32 [1.25-1.39] n 4 | 1.30 [1.02-1.33] n 4 | 1.34 [1.28-1.41] n 4 | 1.32 [1.24-1.39] n 4 | 25.77 → 19.47 | prefix identity 4 of 4 |
| 14x14 Master | 4 | 4 / 4 of 4 | 1.18 [1.13-1.22] n 4 | 1.14 [0.94-1.29] n 4 | 1.18 [1.05-1.29] n 4 | 1.16 [1.13-1.18] n 4 | 2.37 → 2.01 | prefix identity 4 of 4 |
| 26x26 Master | 4 | 4 / 4 of 4 | 1.12 [1.07-1.16] n 4 | 0.97 [0.91-1.03] n 4 | 1.15 [1.08-1.20] n 4 | 1.11 [1.07-1.16] n 4 | 10.86 → 9.52 | prefix identity 4 of 4 |

By level (the per-seed ratios of its cells pooled): Nightmare: T10 1.32 [1.25-1.39] n 4; T1 1.30 [1.02-1.33] n 4; batch 1.34 [1.28-1.41] n 4; Master: T10 1.15 [1.07-1.22] n 8; T1 1.00 [0.91-1.29] n 8; batch 1.16 [1.05-1.29] n 8.

## B:C: eight workers alone, on today's search: an unadmitted upper bound, not P8 as IG-P-Q05 admits it

First arm B (log-p6, 4 workers), second arm C (log-p6-w8, 8 workers). Ratios are first / second.

| Cell | Matched seeds | Ten of n (first / second) | T10 factor (median [min-max] n) | T1 factor (the set stage) | T10 - T1 factor (the batch) | Response factor | T10 median, s (first → second) | Identity |
|---|---:|---|---|---|---|---|---|---|
| 26x26 Nightmare | 4 | 4 / 4 of 4 | 1.13 [1.10-1.22] n 4 | 0.94 [0.88-0.97] n 4 | 1.26 [1.15-1.36] n 4 | 1.13 [1.10-1.22] n 4 | 19.47 → 17.17 | prefix identity 4 of 4 |
| 14x14 Master | 4 | 4 / 4 of 4 | 0.77 [0.71-0.94] n 4 | 0.66 [0.64-0.93] n 4 | 0.81 [0.72-0.94] n 4 | 0.81 [0.73-0.93] n 4 | 2.01 → 2.69 | prefix identity 4 of 4 |
| 26x26 Master | 4 | 4 / 4 of 4 | 0.97 [0.93-1.12] n 4 | 0.80 [0.63-0.97] n 4 | 1.03 [0.95-1.18] n 4 | 0.97 [0.94-1.12] n 4 | 9.52 → 9.59 | prefix identity 4 of 4 |

By level (the per-seed ratios of its cells pooled): Nightmare: T10 1.13 [1.10-1.22] n 4; T1 0.94 [0.88-0.97] n 4; batch 1.26 [1.15-1.36] n 4; Master: T10 0.93 [0.71-1.12] n 8; T1 0.72 [0.63-0.97] n 8; batch 0.95 [0.72-1.18] n 8.

## A:C: P6 x eight workers combined, on today's search: an unadmitted upper bound, not P6 alone

First arm A (log, 4 workers), second arm C (log-p6-w8, 8 workers). Ratios are first / second.

| Cell | Matched seeds | Ten of n (first / second) | T10 factor (median [min-max] n) | T1 factor (the set stage) | T10 - T1 factor (the batch) | Response factor | T10 median, s (first → second) | Identity |
|---|---:|---|---|---|---|---|---|---|
| 12x12 Nightmare | 2 | 2 / 2 of 2 | 0.99 [0.95-1.04] n 2 | 0.84 [0.68-1.00] n 2 | 1.00 [0.95-1.05] n 2 | 0.99 [0.95-1.04] n 2 | 48.68 → 49.99 | prefix identity 2 of 2 |
| 26x26 Nightmare | 4 | 4 / 4 of 4 | 1.53 [1.44-1.56] n 4 | 1.22 [0.89-1.29] n 4 | 1.67 [1.54-1.87] n 4 | 1.52 [1.44-1.55] n 4 | 25.77 → 17.17 | prefix identity 4 of 4 |
| 14x14 Master | 4 | 4 / 4 of 4 | 0.93 [0.84-1.06] n 4 | 0.76 [0.60-1.17] n 4 | 0.97 [0.84-1.07] n 4 | 0.94 [0.86-1.05] n 4 | 2.37 → 2.69 | prefix identity 4 of 4 |
| 26x26 Master | 4 | 4 / 4 of 4 | 1.10 [1.06-1.20] n 4 | 0.75 [0.62-1.01] n 4 | 1.19 [1.12-1.28] n 4 | 1.09 [1.05-1.20] n 4 | 10.86 → 9.59 | prefix identity 4 of 4 |

By level (the per-seed ratios of its cells pooled): Nightmare: T10 1.49 [0.95-1.56] n 6; T1 1.10 [0.68-1.29] n 6; batch 1.58 [0.95-1.87] n 6; Master: T10 1.06 [0.84-1.20] n 8; T1 0.75 [0.60-1.17] n 8; batch 1.09 [0.84-1.28] n 8.

## E:F: P6 x eight workers combined, on the prototype (P1 to P5): an unadmitted upper bound, not P6 alone

First arm E (p1p5-main, 4 workers), second arm F (p1p5-main-p6-w8, 8 workers). Ratios are first / second.

| Cell | Matched seeds | Ten of n (first / second) | T10 factor (median [min-max] n) | T1 factor (the set stage) | T10 - T1 factor (the batch) | Response factor | T10 median, s (first → second) | Identity |
|---|---:|---|---|---|---|---|---|---|
| 14x14 Nightmare | 2 | 2 / 2 of 2 | 1.01 [0.97-1.06] n 2 | 0.74 [0.73-0.74] n 2 | 1.14 [1.03-1.25] n 2 | 1.02 [0.97-1.06] n 2 | 7.24 → 7.25 | prefix identity 2 of 2 |

By level (the per-seed ratios of its cells pooled): Nightmare: T10 1.01 [0.97-1.06] n 2; T1 0.74 [0.73-0.74] n 2; batch 1.14 [1.03-1.25] n 2.

## P6's work saving, from the call journals of A and B

Twin calls are finished calls with the same stage, attempt, start line and probe sequence (the arms made the same puzzles, so most calls have a twin; a call without a twin is a timing effect at the end of a request and is left out). Rating ms is the sum of the probes' times; "with the recomputed diagnostic" adds the one `solveFirst` of each ok call that P6 puts back (`p6Ms`). The ratios are rating ms without P6 / with P6, a finer measure than the request ratio.

| Cell | Twin calls (unmatched first / second) | Rating ms without P6 | Rating ms with P6 (+ recomputed) | Rating ratio, probes only | Rating ratio, net of the recomputed diagnostic | Share of rating ms saved (net) | Whole-call ms ratio |
|---|---:|---:|---:|---:|---:|---:|---:|
| 26x26 Nightmare | 62 (3 / 3) | 240050 | 170156 (+ 15112) | 1.411 | 1.296 | 22.8 % | 1.295 |
| 14x14 Master | 56 (4 / 6) | 42243 | 34285 (+ 1455) | 1.232 | 1.182 | 15.4 % | 1.180 |
| 26x26 Master | 60 (3 / 3) | 124974 | 105857 (+ 6734) | 1.181 | 1.110 | 9.9 % | 1.109 |

## The first-phase factor (R25): a Projection

The report's "after first phase" column divides today's times by 1.9 (Opus's illustrative assumption: P6, P7 and P8 together). Here the measured T10 factor of the combined pair (P6 x eight workers, an **unadmitted upper bound**) is multiplied by the P7 assumption 1.3 (range 1.1 to 1.8); P7 is not prototyped (IGP-06 gives a sensitivity). "P7 needed" is the P7 factor at which the measured factor reaches ÷1.9.

| Search | Cell or level | Measured T10 factor (median [min-max] n) | Projection with P7 1.3 (1.1-1.8) | P7 needed for ÷1.9 | Against ÷1.9 |
|---|---|---|---|---:|---|
| today (A:C) | 12x12 Nightmare | 0.99 [0.95-1.04] n 2 | 1.29 (1.09-1.79) | 1.91 | below ÷1.9 |
| today (A:C) | 26x26 Nightmare | 1.53 [1.44-1.56] n 4 | 1.99 (1.69-2.76) | 1.24 | at or above ÷1.9 |
| today (A:C) | 14x14 Master | 0.93 [0.84-1.06] n 4 | 1.20 (1.02-1.67) | 2.05 | below ÷1.9 |
| today (A:C) | 26x26 Master | 1.10 [1.06-1.20] n 4 | 1.42 (1.20-1.97) | 1.73 | below ÷1.9 |
| today (A:C) | Nightmare (pooled) | 1.49 [0.95-1.56] n 6 | 1.93 (1.64-2.68) | 1.28 | at or above ÷1.9 |
| today (A:C) | Master (pooled) | 1.06 [0.84-1.20] n 8 | 1.37 (1.16-1.90) | 1.80 | below ÷1.9 |
| prototype (E:F) | 14x14 Nightmare | 1.01 [0.97-1.06] n 2 | 1.32 (1.12-1.83) | 1.87 | below ÷1.9 |
| prototype (E:F) | Nightmare (pooled) | 1.01 [0.97-1.06] n 2 | 1.32 (1.12-1.83) | 1.87 | below ÷1.9 |

Every figure of the eight-worker arms is an unadmitted upper bound.

## Memory at four and eight workers (R26)

Both bench criteria, per arm, on every row: the accounted peak against workers x `WORKER_LIMIT_BYTES` + `MAIN_BUDGET_BYTES` (the constants of the arm's own tree), and the whole-process peak against 1.5 GiB. The accounted limit is also the worst case that eight 224 MiB workspace ceilings and the main budget can reach.

| Arm | Variant | Workers | Rows | Accounted max / limit, MiB | Accounted | Process max / limit, MiB | Process | Both | Worst case (limit) above the process limit |
|---|---|---:|---:|---|---|---|---|---|---|
| A | log | 4 | 14 | 230 / 1196 | pass | 543 / 1536 | pass | pass | no |
| B | log-p6 | 4 | 12 | 229 / 1196 | pass | 558 / 1536 | pass | pass | no |
| C | log-p6-w8 | 8 | 14 | 450 / 2092 | pass | 914 / 1536 | pass | pass | yes |
| E | p1p5-main | 4 | 2 | 17 / 1196 | pass | 210 / 1536 | pass | pass | no |
| F | p1p5-main-p6-w8 | 8 | 2 | 34 / 2092 | pass | 340 / 1536 | pass | pass | yes |

Largest peaks by arm and cell, MiB (accounted / process): A: 12x12-nightmare 17 / 169, 26x26-nightmare 230 / 522, 26x26-master 218 / 543, 14x14-master 16 / 215; B: 26x26-nightmare 229 / 514, 26x26-master 215 / 558, 14x14-master 17 / 215; C: 12x12-nightmare 37 / 274, 26x26-nightmare 450 / 877, 26x26-master 426 / 914, 14x14-master 33 / 356; E: 14x14-nightmare 17 / 210; F: 14x14-nightmare 34 / 340.

## Agreement with MP12b1 (arm A)

- A 12x12-nightmare: seed 0: puzzle identity (resultDigest equal at equal accepted counts, 10); seed 1: puzzle identity (resultDigest equal at equal accepted counts, 10).
- A 26x26-nightmare: seed 0: puzzle identity (resultDigest equal at equal accepted counts, 10); seed 1: puzzle identity (resultDigest equal at equal accepted counts, 10); seed 2: puzzle identity (resultDigest equal at equal accepted counts, 10); seed 3: puzzle identity (resultDigest equal at equal accepted counts, 10).
- A 26x26-master: seed 0: puzzle identity (resultDigest equal at equal accepted counts, 10); seed 1: puzzle identity (resultDigest equal at equal accepted counts, 10); seed 2: puzzle identity (resultDigest equal at equal accepted counts, 10); seed 3: puzzle identity (resultDigest equal at equal accepted counts, 10).
- A 14x14-master: seed 0: puzzle identity (resultDigest equal at equal accepted counts, 10); seed 1: puzzle identity (resultDigest equal at equal accepted counts, 10); seed 2: puzzle identity (resultDigest equal at equal accepted counts, 10); seed 3: puzzle identity (resultDigest equal at equal accepted counts, 10).

## Values of the §5 rows

| Row | Kind | Formula | Value |
|---|---|---|---|
| R22 | Measured; ratios Derived | median of the paired per-seed T10 ratios A / B (both reached ten) on matched seeds, per cell and per level; the work saving from the twin calls of the journals | `{"pair":"A:B","label":"P6 alone, on today's search at four workers: the isolated P6 factor","cells":{"26x26-nightmare":{"n":4,"completion":{"before":4,"after":4,"of":4},"t10":{"n":4,"median":1.3221713632508845,"min":1.2541063535567858,"max":1.3891695401896875},"response":{"n":4,"median":1.3194862779179348,"min":1.2447843576374156,"max":1.386515631109387}},"14x14-master":{"n":4,"completion":{"before":4,"after":4,"of":4},"t10":{"n":4,"median":1.1807823539186735,"min":1.1293934374778067,"max":1.217682075240451},"response":{"n":4,"median":1.1625149071835323,"min":1.1293449417256365,"max":1.1826977065285278}},"26x26-master":{"n":4,"completion":{"before":4,"after":4,"of":4},"t10":{"n":4,"median":1.1173796907051643,"min":1.072152715446118,"max":1.1633737394575012},"response":{"n":4,"median":1.1094754040096442,"min":1.0706924361468604,"max":1.1612728661287444}}},"levels":{"Nightmare":{"t10":{"n":4,"median":1.3221713632508845,"min":1.2541063535567858,"max":1.3891695401896875},"response":{"n":4,"median":1.3194862779179348,"min":1.2447843576374156,"max":1.386515631109387}},"Master":{"t10":{"n":8,"median":1.1481291716602144,"min":1.072152715446118,"max":1.217682075240451},"response":{"n":8,"median":1.1451409115151563,"min":1.0706924361468604,"max":1.1826977065285278}}},"workSaving":{"26x26-nightmare":{"matchedCalls":62,"unmatchedBefore":3,"unmatchedAfter":3,"ratingMs":{"before":240050,"after":170156,"recompute":15112},"ratingRatio":{"gross":1.4107646290683271,"net":1.29568929024446},"savingShare":0.2282100288014819,"callMs":{"before":240604,"after":185795},"callRatio":1.2949964300793269},"14x14-master":{"matchedCalls":56,"unmatchedBefore":4,"unmatchedAfter":6,"ratingMs":{"before":42243,"after":34285,"recompute":1455},"ratingRatio":{"gross":1.2321362491393035,"net":1.1819743487185903},"savingShare":0.1539579508775918,"callMs":{"before":42593,"after":36100},"callRatio":1.179854934944546},"26x26-master":{"matchedCalls":60,"unmatchedBefore":3,"unmatchedAfter":3,"ratingMs":{"before":124974,"after":105857,"recompute":6734},"ratingRatio":{"gross":1.1805977760936317,"net":1.109983450875154},"savingShare":0.0990856672578665,"callMs":{"before":125741,"after":113373},"callRatio":1.1090899019592626}}}` |
| R23 | Measured; ratios Derived | paired per-seed ratios B / C (the width alone) and A / C (P6 x the width): T10, T1 (the set stage) and T10 - T1 (the batch) | `{"label":"eight workers: unadmitted upper bound","widthAlone":{"pair":"B:C","label":"eight workers alone, on today's search: an unadmitted upper bound, not P8 as IG-P-Q05 admits it","cells":{"26x26-nightmare":{"n":4,"completion":{"before":4,"after":4,"of":4},"t10":{"n":4,"median":1.1335244076846673,"min":1.1014431368057669,"max":1.2243030251199838},"t1":{"n":4,"median":0.9390653798656334,"min":0.8773230629461152,"max":0.9695447516767148},"batch":{"n":4,"median":1.2567029109767818,"min":1.1526480257164067,"max":1.3573825336875547}},"14x14-master":{"n":4,"completion":{"before":4,"after":4,"of":4},"t10":{"n":4,"median":0.7742712073862711,"min":0.7076510957955561,"max":0.9359075095783933},"t1":{"n":4,"median":0.6609762582704151,"min":0.6350980072065999,"max":0.9295757135700248},"batch":{"n":4,"median":0.8097924996303326,"min":0.7217441215659823,"max":0.9395313808878138}},"26x26-master":{"n":4,"completion":{"before":4,"after":4,"of":4},"t10":{"n":4,"median":0.9670279622694179,"min":0.9324915456628944,"max":1.1234221452366149},"t1":{"n":4,"median":0.8045872165096449,"min":0.6287805913753166,"max":0.9736764366307291},"batch":{"n":4,"median":1.0275104982256331,"min":0.9532170249216667,"max":1.180171570186231}}},"levels":{"Nightmare":{"t10":{"n":4,"median":1.1335244076846673,"min":1.1014431368057669,"max":1.2243030251199838},"t1":{"n":4,"median":0.9390653798656334,"min":0.8773230629461152,"max":0.9695447516767148},"batch":{"n":4,"median":1.2567029109767818,"min":1.1526480257164067,"max":1.3573825336875547}},"Master":{"t10":{"n":8,"median":0.9341995276206438,"min":0.7076510957955561,"max":1.1234221452366149},"t1":{"n":8,"median":0.7242768036203489,"min":0.6287805913753166,"max":0.9736764366307291},"batch":{"n":8,"median":0.9463742029047403,"min":0.7217441215659823,"max":1.180171570186231}}}},"p6AndWidth":{"pair":"A:C","label":"P6 x eight workers combined, on today's search: an unadmitted upper bound, not P6 alone","cells":{"12x12-nightmare":{"n":2,"completion":{"before":2,"after":2,"of":2},"t10":{"n":2,"median":0.994299194471018,"min":0.952256489633681,"max":1.0363418993083549},"t1":{"n":2,"median":0.8414298468975165,"min":0.6785842086343491,"max":1.004275485160684},"batch":{"n":2,"median":1.0006543413827926,"min":0.9488684642474521,"max":1.0524402185181332}},"26x26-nightmare":{"n":4,"completion":{"before":4,"after":4,"of":4},"t10":{"n":4,"median":1.5327487291916597,"min":1.4428218136902027,"max":1.5556616250163762},"t1":{"n":4,"median":1.2185690653694636,"min":0.8944903828410913,"max":1.2899698567657356},"batch":{"n":4,"median":1.6668208629479424,"min":1.5368537534730964,"max":1.868655672786175}},"14x14-master":{"n":4,"completion":{"before":4,"after":4,"of":4},"t10":{"n":4,"median":0.9267181946056854,"min":0.8390278159430876,"max":1.057007799404035},"t1":{"n":4,"median":0.7592586191817907,"min":0.5987983573281986,"max":1.174670029293225},"batch":{"n":4,"median":0.9726699240249856,"min":0.8365589693078395,"max":1.0659651631209262}},"26x26-master":{"n":4,"completion":{"before":4,"after":4,"of":4},"t10":{"n":4,"median":1.095351260493787,"min":1.0564053153138373,"max":1.2044801036077397},"t1":{"n":4,"median":0.7467641527655401,"min":0.6164090740032375,"max":1.0074383942007972},"batch":{"n":4,"median":1.1892655967733106,"min":1.115539120547541,"max":1.2791533867624718}}},"levels":{"Nightmare":{"t10":{"n":6,"median":1.4864565347958785,"min":0.952256489633681,"max":1.5556616250163762},"t1":{"n":6,"median":1.1038346916760164,"min":0.6785842086343491,"max":1.2899698567657356},"batch":{"n":6,"median":1.5828937344305851,"min":0.9488684642474521,"max":1.868655672786175}},"Master":{"t10":{"n":8,"median":1.056706557358936,"min":0.8390278159430876,"max":1.2044801036077397},"t1":{"n":8,"median":0.7467641527655401,"min":0.5987983573281986,"max":1.174670029293225},"batch":{"n":8,"median":1.0907521418342334,"min":0.8365589693078395,"max":1.2791533867624718}}}}}` |
| R25 | Projection (P7 assumed) | the T10 factor of A:C and of E:F x the P7 assumption 1.3 (1.1 to 1.8), against ÷1.9 | `{"measured":{"today":{"pair":"A:C","label":"P6 x eight workers combined, on today's search: an unadmitted upper bound, not P6 alone","cells":{"12x12-nightmare":{"n":2,"t10":{"n":2,"median":0.994299194471018,"min":0.952256489633681,"max":1.0363418993083549},"projection":{"likely":1.2925889528123233,"low":1.0937291139181198,"high":1.7897385500478324,"p7NeededFor19":1.9108936329882358,"aboveAssumptionLikely":false}},"26x26-nightmare":{"n":4,"t10":{"n":4,"median":1.5327487291916597,"min":1.4428218136902027,"max":1.5556616250163762},"projection":{"likely":1.9925733479491576,"low":1.686023602110826,"high":2.7589477125449875,"p7NeededFor19":1.2396030502677506,"aboveAssumptionLikely":true}},"14x14-master":{"n":4,"t10":{"n":4,"median":0.9267181946056854,"min":0.8390278159430876,"max":1.057007799404035},"projection":{"likely":1.204733652987391,"low":1.019390014066254,"high":1.6680927502902336,"p7NeededFor19":2.0502457069038575,"aboveAssumptionLikely":false}},"26x26-master":{"n":4,"t10":{"n":4,"median":1.095351260493787,"min":1.0564053153138373,"max":1.2044801036077397},"projection":{"likely":1.4239566386419231,"low":1.2048863865431658,"high":1.9716322688888166,"p7NeededFor19":1.7346033811505137,"aboveAssumptionLikely":false}}},"levels":{"Nightmare":{"n":6,"t10":{"n":6,"median":1.4864565347958785,"min":0.952256489633681,"max":1.5556616250163762},"projection":{"likely":1.932393495234642,"low":1.6351021882754664,"high":2.675621762632581,"p7NeededFor19":1.278207573194133,"aboveAssumptionLikely":true}},"Master":{"n":8,"t10":{"n":8,"median":1.056706557358936,"min":0.8390278159430876,"max":1.2044801036077397},"projection":{"likely":1.3737185245666168,"low":1.1623772130948298,"high":1.9020718032460848,"p7NeededFor19":1.7980393769380374,"aboveAssumptionLikely":false}}}},"prototype":{"pair":"E:F","label":"P6 x eight workers combined, on the prototype (P1 to P5): an unadmitted upper bound, not P6 alone","cells":{"14x14-nightmare":{"n":2,"t10":{"n":2,"median":1.0139127279846445,"min":0.9652089374488306,"max":1.0626165185204584},"projection":{"likely":1.318086546380038,"low":1.115304000783109,"high":1.8250429103723602,"p7NeededFor19":1.8739285419334188,"aboveAssumptionLikely":false}}},"levels":{"Nightmare":{"n":2,"t10":{"n":2,"median":1.0139127279846445,"min":0.9652089374488306,"max":1.0626165185204584},"projection":{"likely":1.318086546380038,"low":1.115304000783109,"high":1.8250429103723602,"p7NeededFor19":1.8739285419334188,"aboveAssumptionLikely":false}}}}},"p7Assumption":{"likely":1.3,"low":1.1,"high":1.8},"projection":"measured T10 factor of the combined pair x the P7 assumption (P7 is not prototyped: IGP-06 gives a sensitivity)","against":1.9,"kind":"Projection; every eight-worker figure is an unadmitted upper bound"}` |
| R26 | Measured | the largest peakAccountedBytes of the rows against workers x WORKER_LIMIT_BYTES + MAIN_BUDGET_BYTES, and the largest peakProcessBytes against 1.5 GiB | `{"A":{"workers":4,"accountedLimit":1254096896,"maxAccounted":240995213,"processLimit":1610612736,"maxProcess":568852480,"pass":true},"B":{"workers":4,"accountedLimit":1254096896,"maxAccounted":240613042,"processLimit":1610612736,"maxProcess":584749056,"pass":true},"C":{"workers":8,"accountedLimit":2193620992,"maxAccounted":471742914,"processLimit":1610612736,"maxProcess":958222336,"pass":true},"E":{"workers":4,"accountedLimit":1254096896,"maxAccounted":17596016,"processLimit":1610612736,"maxProcess":220602368,"pass":true},"F":{"workers":8,"accountedLimit":2193620992,"maxAccounted":35360652,"processLimit":1610612736,"maxProcess":356229120,"pass":true}}` |

## Journal

Journal lines (appends): A 2124, B 1827, C 3604, E 239, F 390. Measured cost of one append (self-test): 0.303 ms. Journal sources: 12x12-nightmare: published journal; fast: published journal; 14x14-nightmare: published journal. The P6 arms (B, C, F) also journal the accepted ratings of their ok calls (`logAccepted`), which arm A does not.
