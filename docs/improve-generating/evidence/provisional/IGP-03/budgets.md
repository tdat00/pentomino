# IGP-03 budgets: P5's inputs

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03.json -Label frozen -SourceLabel <label> -LockHelper <path>.

These are **inputs** for P5's per-level budgets (IG-P-Q10), measured on the journals of the arms; they are not fitted budgets. P5's budgets stay recorded, not enforced (D-IG9): no search was stopped at a budget, and the 6 G figure of the first draft is withdrawn.

- Work is the main plus census work of every rating attempt of a call in probe order, screens and re-ratings included (G = 10^9 work units). A call is **ok** when it returned a puzzle, **failed** when it ended without one, **unfinished** when its journal has no end line (it was cut when the request ended).
- `ok beyond B`: the share of ok calls whose cumulative work before their last rating was already at least B. Such a call would have been stopped at B before it got its result, but it might still have returned an earlier retained candidate. `ok overshoot`: the share whose last rating crossed B (a rating already running when B passes overshoots it, so the call would have kept its result).
- `failed above B`: the work of failed calls above B, summed, in G units: what a stop at B would have saved on them. Unfinished calls are apart: how many had spent at least B when they were cut (their work is a lower bound).
- Cells and stages are as journaled; the arms have two to six seeds per cell, so every figure is an indication.

## Work rate and B in seconds

| Arm | Median work rate, units per ms (all ratings) | Aggregate rate | B = 1.0 G in s | B = 2.0 G in s | B = 4.0 G in s | B = 6.0 G in s | B = 8.0 G in s | B = 12.0 G in s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| IGP-01/after (p1p5-main) | 275540 | 291846 | 3.6 | 7.3 | 14.5 | 21.8 | 29.0 | 43.6 |
| IGP-03/w095 (p1p5-w095) | 273431 | 280443 | 3.7 | 7.3 | 14.6 | 21.9 | 29.3 | 43.9 |
| IGP-03/w380 (p1p5-w380) | 294143 | 302312 | 3.4 | 6.8 | 13.6 | 20.4 | 27.2 | 40.8 |
| IGP-03/w760 (p1p5-w760) | 290051 | 324367 | 3.4 | 6.9 | 13.8 | 20.7 | 27.6 | 41.4 |
| IGP-03/a3 (p1p5-main-a3) | 311952 | 319584 | 3.2 | 6.4 | 12.8 | 19.2 | 25.6 | 38.5 |

## 12x12-nightmare

Each B column reads: ok beyond (ok overshoot); failed above, G units; unfinished calls at B.

| Arm | Stage | Ok / failed / unfinished | B = 1.0 G | B = 2.0 G | B = 4.0 G | B = 6.0 G | B = 8.0 G | B = 12.0 G |
|---|---|---|---|---|---|---|---|---|
| IGP-01/after | set | 4 / 0 / 8 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-01/after | batch | 35 / 0 / 7 | 3 % (0 %); 0.0; 1 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w095 | set | 4 / 0 / 4 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w095 | batch | 22 / 0 / 5 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w380 | set | 2 / 0 / 6 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w380 | batch | 22 / 0 / 5 | 23 % (5 %); 0.0; 2 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w760 | set | 2 / 0 / 6 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w760 | batch | 23 / 0 / 5 | 22 % (9 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |

## 14x14-nightmare

Each B column reads: ok beyond (ok overshoot); failed above, G units; unfinished calls at B.

| Arm | Stage | Ok / failed / unfinished | B = 1.0 G | B = 2.0 G | B = 4.0 G | B = 6.0 G | B = 8.0 G | B = 12.0 G |
|---|---|---|---|---|---|---|---|---|
| IGP-01/after | set | 5 / 0 / 7 | 20 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-01/after | batch | 43 / 0 / 9 | 7 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w095 | set | 2 / 0 / 6 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w095 | batch | 23 / 0 / 6 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w380 | set | 3 / 0 / 5 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w380 | batch | 23 / 0 / 6 | 13 % (13 %); 0.0; 1 | 9 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w760 | set | 3 / 0 / 5 | 67 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w760 | batch | 23 / 0 / 6 | 52 % (13 %); 0.0; 0 | 9 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/a3 | set | 2 / 0 / 6 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/a3 | batch | 23 / 0 / 6 | 9 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |

## 15x15b10-nightmare

Each B column reads: ok beyond (ok overshoot); failed above, G units; unfinished calls at B.

| Arm | Stage | Ok / failed / unfinished | B = 1.0 G | B = 2.0 G | B = 4.0 G | B = 6.0 G | B = 8.0 G | B = 12.0 G |
|---|---|---|---|---|---|---|---|---|
| IGP-01/after | set | 5 / 0 / 7 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-01/after | batch | 46 / 0 / 9 | 2 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |

## 26x26-hell-1

Each B column reads: ok beyond (ok overshoot); failed above, G units; unfinished calls at B.

| Arm | Stage | Ok / failed / unfinished | B = 1.0 G | B = 2.0 G | B = 4.0 G | B = 6.0 G | B = 8.0 G | B = 12.0 G |
|---|---|---|---|---|---|---|---|---|
| IGP-01/after | set | 6 / 0 / 6 | 67 % (33 %); 0.0; 5 | 17 % (0 %); 0.0; 1 | 17 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-01/after | batch | 41 / 0 / 9 | 63 % (17 %); 0.0; 3 | 34 % (12 %); 0.0; 1 | 7 % (5 %); 0.0; 0 | 5 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/a3 | set | 4 / 0 / 4 | 75 % (25 %); 0.0; 3 | 25 % (0 %); 0.0; 1 | 25 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/a3 | batch | 30 / 0 / 6 | 67 % (13 %); 0.0; 2 | 33 % (17 %); 0.0; 2 | 10 % (3 %); 0.0; 0 | 7 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |

## 26x26-nightmare

Each B column reads: ok beyond (ok overshoot); failed above, G units; unfinished calls at B.

| Arm | Stage | Ok / failed / unfinished | B = 1.0 G | B = 2.0 G | B = 4.0 G | B = 6.0 G | B = 8.0 G | B = 12.0 G |
|---|---|---|---|---|---|---|---|---|
| IGP-01/after | set | 16 / 0 / 8 | 13 % (6 %); 0.0; 0 | 6 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-01/after | batch | 61 / 0 / 19 | 21 % (2 %); 0.0; 2 | 2 % (2 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |

## 14x14-master

Each B column reads: ok beyond (ok overshoot); failed above, G units; unfinished calls at B.

| Arm | Stage | Ok / failed / unfinished | B = 1.0 G | B = 2.0 G | B = 4.0 G | B = 6.0 G | B = 8.0 G | B = 12.0 G |
|---|---|---|---|---|---|---|---|---|
| IGP-01/after | set | 9 / 0 / 11 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-01/after | batch | 65 / 0 / 13 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |

## 26x26-master

Each B column reads: ok beyond (ok overshoot); failed above, G units; unfinished calls at B.

| Arm | Stage | Ok / failed / unfinished | B = 1.0 G | B = 2.0 G | B = 4.0 G | B = 6.0 G | B = 8.0 G | B = 12.0 G |
|---|---|---|---|---|---|---|---|---|
| IGP-01/after | set | 11 / 0 / 9 | 9 % (0 %); 0.0; 0 | 9 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-01/after | batch | 66 / 0 / 13 | 17 % (3 %); 0.0; 4 | 5 % (2 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w380 | set | 11 / 0 / 9 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
| IGP-03/w380 | batch | 73 / 0 / 14 | 11 % (3 %); 0.0; 4 | 4 % (0 %); 0.0; 2 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 | 0 % (0 %); 0.0; 0 |
