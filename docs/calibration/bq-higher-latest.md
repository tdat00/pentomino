# BQ-1 / BQ-2 / BQ-3 higher-limit qualification: latest evidence index

**Date:** 2026-10-23 | **Task:** T24 | **Status: BLOCKED. BQ-1, BQ-2 and BQ-3 are NOT passed and none was completed.** `QUALIFICATION.bq1`, `bq2` and `bq3` stay `not-run` in `core\engine\qualification.js`; production limits stay desktop 484 / phone 360 and 676 stays an experimental, explicit opt-in. Nothing here authorizes a higher limit or removing the experimental label.

Everything below is **screening, not qualification**: reduced seed counts (3 per cell instead of at least 20, and instead of at least 60 for Hell-1 at the largest area), one non-reference machine, headless browsers, no Safari, no Android, no iPhone, and BQ-0 itself is not passed (`bq-0-latest.md`, `release-defects.md` D1-D3). Measurements and forecasts are kept apart: tables are measurements of this machine; sentences marked *forecast* are not measurements.

## 1. Headline

- **Matrices, fixtures and tests are done** (`tools\bench\matrices\bq-1.json`, `bq-2.json`, `bq-3.json`; `tests\fixtures\bq-irregular-558.json`, `bq-irregular-658.json`; `tests\bq-higher-matrix.test.js`, `tests\bq-limits.test.js`). Full seed counts are encoded (at least 20 seeds per cell, 60 for Hell-1 at the largest area: 24x24/32x18 at 576, 26x26 at 676, 22x22 at 484); the full matrices are 18, 18 and 14 cells.
- **A genuine, reproducible failure of criterion 2 (at least 90% of runs return ten puzzles) appears on every irregular board at Hard and Master** (irregular 558: Hard 1/3, Master 2/3; irregular 658: Hard 2/3, Master 2/3; irregular 466 in BQ-3: Hard 2/3), identical in Node, Edge and Firefox and always `layouts-not-found` after 4 accepted puzzles (1 once). This is the existing D1 root cause (too few distinct layouts in the carved piece set) on two more boards. It is independent of hardware: BQ-1, BQ-2 and BQ-3 cannot pass until D1 is fixed, and a D1 fix changes the engine and invalidates all timings.
- **No other failure seen in the reduced sample:** T10 median, p95 and every response within the limits on this fast machine (largest: irregular 558 Nightmare, Edge median 41.0 s, max 89.1 s, response 89.1 s); Cancel at most 12 ms; accounted bytes at most 332 MiB (budget 1,196 MiB); no `model-too-large`; no worker error except one unreproduced crash (D9); the main-thread criterion saw one 52 ms Long Task in 54 + 54 + 42 Edge rows (first cell of BQ-1) and a 37 ms maximum in the Firefox heartbeat proxy, so the D2 fix holds at these sizes. A 3-seed cell cannot prove 90%, 99% or a p95; the report builder keeps every such cell at "evidence incomplete" and never says "qualified".
- **Forecast, not measurement:** the irregular 558 Nightmare tail (2.4 s to 91.8 s at three seeds) and Hell-1 (13-26 s median on this machine) have little margin against the 60 s median and 115 s p95 limits if the reference laptop is two to three times slower; only the reference platforms can tell.
- **Memory:** the whole-browser private-memory samples are upper bounds, not per-tab peaks. Edge tree maximum 1,043 MiB (BQ-2) and Firefox tree maximum 1,421 MiB (26x26 Hell-3) against the 1,536 MiB limit; the Firefox figure leaves little margin and needs a per-tab measurement (risk R3).

## 2. Identity and method

| Item | Value |
| --- | --- |
| Source revision | HEAD `59487235a112be6d0f349521392197171cec5faf` plus uncommitted T24 files only (matrices, fixtures, tests, docs; no `core`, `generator`, `player` or harness code changed). Node reports show `+uncommitted-changes` because the new matrices sit under `tools`. |
| Source digest | `ad96b258e7eb6432f166321a3e37c7c18774ea5a8af69a084193d41902e2bf96`, identical in every Node, Edge and Firefox report (differs from BQ-0's digest because the D2 fix changed runtime files) |
| Versions | algo `gen-v2`, policy `mixed-v2`, rng `xoshiro128ss-v1`, model `difficulty-v2`, app `1.0.0` |
| Full matrices | `tools\bench\matrices\bq-1.json` (18 cells), `bq-2.json` (18), `bq-3.json` (14). Candidate caps 576, 676 and 484 are passed to the runner only; production fallback caps are untouched. |
| Reduced matrices actually run | `bq-2026-10-23-N-reduced3.matrix.json` (3 seeds per cell, the first three of the official list `bq<N>/<case id>/<n>`, so every platform shares masks and seeds); Firefox subsets `bq-2026-10-23-1-firefox-subset.matrix.json` (5 cells) and `-2-firefox-subset.matrix.json` (3 cells); worker-crash repro `bq-2026-10-23-1-repro-worker-crash.matrix.json` (d24x24-master, 20 seeds). |
| Machine | Same as BQ-0: AMD EPYC 7763, 8 cores / 16 threads, 64 GB, Windows 11, virtualized server class, not a reference laptop. |
| Browsers | Microsoft Edge 155.0.4283.62 (Chromium), headless `--headless=new` with `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows`, driven through CDP; served by a scratch static server with COOP/COEP (so `measureUserAgentSpecificMemory` works; `tools\serve.mjs` has no header option) from the repo root at `/pentomino/`. Firefox 158.0 headless, driven through WebDriver BiDi, same server without COOP/COEP (no memory API, no Long Tasks API: 10 ms MessageChannel heartbeat proxy, labelled in each row). Node v24.21.0 with `--max-old-space-size=2048 --workers 4 --fresh-process`. |
| Page and runner | `tools\bench\index.html?matrix=<path>&auto=matrix&commit=<sha>`; pool of 4 module workers, cold pool per run, thumbnails off, quantity 10, `uniqueness: any`, one cancel probe per cell excluded from the rates, rows sequential, every accepted puzzle re-validated by the runner. |
| Concurrency (screening caveat) | A Node screen ran at the same time as each Edge matrix (and Node BQ-3 overlapped the start of the Edge repro run). Both used 4 workers on 16 threads; timings may be slightly pessimistic. Firefox runs were alone. |
| Memory columns | "MiB acc." is the pool/worker accounting maximum of the cell; "OS tree" is the sum of `PrivateMemorySize64` over the browser process tree sampled every 3 s and mapped to the cell's time window (`bq-2026-10-23-N-<browser>-*.memory.json`); it includes unrelated browser overhead and is not a hand-recorded task-manager peak. The in-page memory API (Edge only) produced values for 40 rows with a maximum of 191 MiB. |
| Time stamps | Reports carry UTC times (`2026-10-22T17:36Z` onward is 2026-10-23 00:36 +07:00 on the machine). |

## 3. Coverage: run versus not run

| Gate | Platform | Browser | Cells | Seeds per cell | Generation rows | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BQ-1 (576) | Desktop | Edge 155 | 18 of 18 | 3 of 20 (Hell-1 at 576: 3 of 60) | 54 | REDUCED screening |
| BQ-1 | Desktop | Firefox 158 | 5 of 18 | 3 | 15 | SCREENING subset |
| BQ-1 | - | Node | 18 of 18 | 3 | 54 | Node pre-screen only |
| BQ-1 | Desktop | Chrome | 0 | 0 | 0 | NOT RUN (not installed) |
| BQ-1 | Desktop | Safari on a comparable Mac | 0 | 0 | 0 | BLOCKED (no Mac) |
| BQ-2 (676 label) | Desktop | Edge 155 | 18 of 18 | 3 of 20 (Hell-1 at 676: 3 of 60) | 54 | REDUCED screening |
| BQ-2 | Desktop | Firefox 158 | 3 of 18 | 3 | 9 | SCREENING subset |
| BQ-2 | - | Node | 18 of 18 | 3 | 54 | Node pre-screen only |
| BQ-2 | Desktop | Chrome / Safari | 0 | 0 | 0 | NOT RUN / BLOCKED |
| BQ-3 (phone 484) | Android Chrome | - | 0 | 0 | 0 | **BLOCKED (no device)** |
| BQ-3 | iPhone Safari | - | 0 | 0 | 0 | **BLOCKED (no device)** |
| BQ-3 | **Desktop** Edge 155 (not a phone) | Edge | 14 of 14 | 3 of 20 (Hell-1 at 484: 3 of 60) | 42 | desktop run for harness and engine screening only, never BQ-3 evidence |
| BQ-3 | - | Node | 14 of 14 | 3 | 42 | non-phone Node screen |
| (diagnostic) | Desktop | Edge 155 | d24x24-master | 20 | 20 | worker-crash repro, section 6 |

No cell reached the required seed count, no run used reference hardware, and BQ-0 (a prerequisite) is not passed.

## 4. Per-criterion results

| Criterion | BQ-1 | BQ-2 | BQ-3 (desktop Edge / Node only) | Overall |
| --- | --- | --- | --- | --- |
| C1 T10 median <= 60 s, p95 <= 115 s, every response <= 120 s | no failure seen (Edge max response 89.1 s; Node 91.9 s; Firefox subset 13.3 s) | no failure seen (Edge 39.0 s; Firefox subset 18.5 s) | no failure seen (Edge 27.6 s) | not shown (3 seeds; this machine is faster than the reference laptop) |
| C2 at least 90% ten puzzles; at least 99% one puzzle | **FAIL**: irregular 558 Hard 1/3, Master 2/3 (Edge, Node, Firefox subset); one Edge worker crash on 24x24 Master (D9). At least one: 3/3 everywhere | **FAIL**: irregular 658 Hard 2/3, Master 2/3 (Edge and Node) | **FAIL**: irregular 466 Hard 2/3 (Edge and Node) | **FAIL** (D1 on irregular boards; one unreproduced crash) |
| C3 browser peak <= 1.5 GiB; accounted within 300 MiB + 4 x 224 MiB; no model-too-large | accounted max 245 MiB; Edge OS tree max 803 MiB; Firefox subset tree max 1,115 MiB; memory API max 126 MiB; no model-too-large | accounted max 332 MiB; Edge OS tree max 1,043 MiB; Firefox subset tree max 1,421 MiB (near the limit, R3); memory API max 191 MiB; no model-too-large | accounted max 166 MiB; Edge OS tree max 772 MiB; no model-too-large | not shown (no hand-recorded per-tab peak) |
| C4 no non-rendering main-thread task > 50 ms; Cancel < 200 ms | one 52 ms Long Task (first cell, 24x24 Hard), otherwise none over 50 ms in 54 rows; Firefox proxy max 37 ms; Cancel at most 12 ms (Edge) | none over 50 ms; Firefox proxy max 22 ms; Cancel at most 9 ms | none over 50 ms; Cancel at most 7 ms | one 52 ms task would fail the strict reading: not shown for 20 seeds |
| Sample size (at least 20 seeds, 60 for Hell-1 at the largest area) | not met | not met | not met | **not met** |
| Platforms (Safari, Android Chrome, iPhone Safari) | Chrome/Safari missing | Chrome/Safari missing | **all phones missing** | **not met** |

Outcome per gate: **BQ-1 blocked** (hardware/evidence missing, and D1 would fail it anyway), **BQ-2 blocked** (same), **BQ-3 blocked** (no phone; D1 would fail it anyway). None is recorded as `pass`; none is recorded as an honest `fail` either, because no qualification run was completed. Statuses in `qualification.js` are unchanged.

### 4.1 Edge 155, BQ-1 (3 seeds; screening, not qualification)

Main task / long tasks: longest task in ms (Long Tasks API; 0 = none over 50 ms) / count over 50 ms. Cancel = longest settle of the cell's probe.

| Case | 10 of 10 | >= 1 | T10 median | T10 p95 | T10 max | Max response | Main task / long tasks | Cancel | MiB acc. / OS tree | notChecked | Errors | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| d24x24-hard | 3/3 | 3/3 | 802 ms | 1249 ms | 1249 ms | 1293 ms | 52 ms / 1 | 7 ms | 39 / 511 | 0 | none | FAIL: main-thread-task (one 52 ms task, first cell of the run) |
| d24x24-master | 2/3 | 3/3 | 813 ms | 961 ms | 961 ms | 1000 ms | 0 ms / 0 | 4 ms | 69 / 777 | 2 | worker-crashed (seed 0) | FAIL: complete-ten-rate |
| d24x24-nightmare | 3/3 | 3/3 | 2119 ms | 7322 ms | 7322 ms | 7358 ms | 0 ms / 0 | 4 ms | 134 / 798 | 0 | none | no failure seen; sample too small |
| d24x24-hell-1 | 3/3 | 3/3 | 14.9 s | 16.0 s | 16.0 s | 16.0 s | 0 ms / 0 | 12 ms | 166 / 725 | 0 | none | no failure seen; sample too small |
| d24x24-hell-2 | 3/3 | 3/3 | 6216 ms | 7545 ms | 7545 ms | 7580 ms | 0 ms / 0 | 4 ms | 196 / 748 | 0 | none | no failure seen; sample too small |
| d24x24-hell-3 | 3/3 | 3/3 | 3758 ms | 4407 ms | 4407 ms | 4438 ms | 0 ms / 0 | 6 ms | 245 / 791 | 0 | none | no failure seen; sample too small |
| d32x18-hard | 3/3 | 3/3 | 676 ms | 739 ms | 739 ms | 771 ms | 0 ms / 0 | 5 ms | 35 / 432 | 0 | none | no failure seen; sample too small |
| d32x18-master | 3/3 | 3/3 | 613 ms | 669 ms | 669 ms | 702 ms | 0 ms / 0 | 11 ms | 70 / 432 | 0 | none | no failure seen; sample too small |
| d32x18-nightmare | 3/3 | 3/3 | 1260 ms | 2726 ms | 2726 ms | 2759 ms | 0 ms / 0 | 5 ms | 126 / 643 | 0 | none | no failure seen; sample too small |
| d32x18-hell-1 | 3/3 | 3/3 | 16.2 s | 17.0 s | 17.0 s | 17.1 s | 0 ms / 0 | 5 ms | 160 / 753 | 0 | none | no failure seen; sample too small |
| d32x18-hell-2 | 3/3 | 3/3 | 7523 ms | 8302 ms | 8302 ms | 8337 ms | 0 ms / 0 | 7 ms | 211 / 787 | 0 | none | no failure seen; sample too small |
| d32x18-hell-3 | 3/3 | 3/3 | 3159 ms | 3454 ms | 3454 ms | 3491 ms | 0 ms / 0 | 4 ms | 230 / 740 | 0 | none | no failure seen; sample too small |
| dirr558-hard | 1/3 | 3/3 | 1888 ms | 1888 ms | 1888 ms | 1918 ms | 0 ms / 0 | 8 ms | 40 / 541 | 8 | none | FAIL: complete-ten-rate (D1) |
| dirr558-master | 2/3 | 3/3 | 1758 ms | 1805 ms | 1805 ms | 1837 ms | 0 ms / 0 | 5 ms | 81 / 634 | 4 | none | FAIL: complete-ten-rate (D1) |
| dirr558-nightmare | 3/3 | 3/3 | 41.0 s | 89.1 s | 89.1 s | 89.1 s | 0 ms / 0 | 6 ms | 130 / 803 | 0 | none | no failure seen; sample too small (heavy tail, R2) |
| dirr558-hell-1 | 3/3 | 3/3 | 25.3 s | 47.9 s | 47.9 s | 47.9 s | 0 ms / 0 | 7 ms | 151 / 725 | 0 | none | no failure seen; sample too small |
| dirr558-hell-2 | 3/3 | 3/3 | 5980 ms | 11.8 s | 11.8 s | 11.9 s | 0 ms / 0 | 5 ms | 180 / 733 | 0 | none | no failure seen; sample too small |
| dirr558-hell-3 | 3/3 | 3/3 | 3809 ms | 3948 ms | 3948 ms | 3984 ms | 0 ms / 0 | 8 ms | 197 / 765 | 0 | none | no failure seen; sample too small |

### 4.2 Edge 155, BQ-2 (3 seeds; screening, not qualification)

| Case | 10 of 10 | >= 1 | T10 median | T10 p95 | T10 max | Max response | Main task / long tasks | Cancel | MiB acc. / OS tree | notChecked | Errors | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| d26x26-hard | 3/3 | 3/3 | 1181 ms | 1360 ms | 1360 ms | 1403 ms | 0 ms / 0 | 8 ms | 58 / 746 | 0 | none | no failure seen; sample too small |
| d26x26-master | 3/3 | 3/3 | 1124 ms | 2218 ms | 2218 ms | 2257 ms | 0 ms / 0 | 7 ms | 115 / 779 | 0 | none | no failure seen; sample too small |
| d26x26-nightmare | 3/3 | 3/3 | 7599 ms | 11.1 s | 11.1 s | 11.1 s | 0 ms / 0 | 6 ms | 185 / 872 | 0 | none | no failure seen; sample too small |
| d26x26-hell-1 | 3/3 | 3/3 | 22.2 s | 24.2 s | 24.2 s | 24.2 s | 0 ms / 0 | 6 ms | 217 / 823 | 0 | none | no failure seen; sample too small |
| d26x26-hell-2 | 3/3 | 3/3 | 11.2 s | 12.5 s | 12.5 s | 12.5 s | 0 ms / 0 | 7 ms | 293 / 996 | 0 | none | no failure seen; sample too small |
| d26x26-hell-3 | 3/3 | 3/3 | 5272 ms | 6545 ms | 6545 ms | 6581 ms | 0 ms / 0 | 9 ms | 332 / 1039 | 0 | none | no failure seen; sample too small |
| d32x21-hard | 3/3 | 3/3 | 881 ms | 1114 ms | 1114 ms | 1155 ms | 0 ms / 0 | 6 ms | 69 / 570 | 0 | none | no failure seen; sample too small |
| d32x21-master | 3/3 | 3/3 | 851 ms | 1068 ms | 1068 ms | 1105 ms | 0 ms / 0 | 6 ms | 95 / 599 | 0 | none | no failure seen; sample too small |
| d32x21-nightmare | 3/3 | 3/3 | 2914 ms | 3227 ms | 3227 ms | 3258 ms | 0 ms / 0 | 7 ms | 167 / 730 | 0 | none | no failure seen; sample too small |
| d32x21-hell-1 | 3/3 | 3/3 | 16.2 s | 18.1 s | 18.1 s | 18.2 s | 0 ms / 0 | 7 ms | 206 / 833 | 0 | none | no failure seen; sample too small |
| d32x21-hell-2 | 3/3 | 3/3 | 10.8 s | 12.4 s | 12.4 s | 12.5 s | 0 ms / 0 | 7 ms | 281 / 1043 | 0 | none | no failure seen; sample too small |
| d32x21-hell-3 | 3/3 | 3/3 | 4803 ms | 4985 ms | 4985 ms | 5020 ms | 0 ms / 0 | 4 ms | 321 / 846 | 0 | none | no failure seen; sample too small |
| dirr658-hard | 2/3 | 3/3 | 2510 ms | 3118 ms | 3118 ms | 3150 ms | 0 ms / 0 | 9 ms | 66 / 696 | 4 | none | FAIL: complete-ten-rate (D1) |
| dirr658-master | 2/3 | 3/3 | 2304 ms | 2585 ms | 2585 ms | 2620 ms | 0 ms / 0 | 6 ms | 107 / 675 | 4 | none | FAIL: complete-ten-rate (D1) |
| dirr658-nightmare | 3/3 | 3/3 | 5301 ms | 7043 ms | 7043 ms | 7076 ms | 0 ms / 0 | 7 ms | 153 / 698 | 0 | none | no failure seen; sample too small |
| dirr658-hell-1 | 3/3 | 3/3 | 24.0 s | 39.0 s | 39.0 s | 39.0 s | 0 ms / 0 | 7 ms | 190 / 787 | 0 | none | no failure seen; sample too small |
| dirr658-hell-2 | 3/3 | 3/3 | 12.1 s | 14.5 s | 14.5 s | 14.5 s | 0 ms / 0 | 7 ms | 266 / 862 | 0 | none | no failure seen; sample too small |
| dirr658-hell-3 | 3/3 | 3/3 | 4976 ms | 5649 ms | 5649 ms | 5682 ms | 0 ms / 0 | 6 ms | 292 / 851 | 0 | none | no failure seen; sample too small |

### 4.3 Edge 155 on a desktop, BQ-3 matrix (3 seeds; not a phone, never BQ-3 evidence)

| Case | 10 of 10 | >= 1 | T10 median | T10 p95 | T10 max | Max response | Main task / long tasks | Cancel | MiB acc. / OS tree | notChecked | Errors | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pheart363-hard | 3/3 | 3/3 | 739 ms | 1371 ms | 1371 ms | 1408 ms | 0 ms / 0 | 6 ms | 23 / 533 | 0 | none | no failure seen; sample too small |
| pheart363-nightmare | 3/3 | 3/3 | 2988 ms | 7699 ms | 7699 ms | 7733 ms | 0 ms / 0 | 4 ms | 48 / 702 | 0 | none | no failure seen; sample too small |
| pheart363-hell-1 | 3/3 | 3/3 | 3723 ms | 4412 ms | 4412 ms | 4442 ms | 0 ms / 0 | 3 ms | 64 / 606 | 0 | none | no failure seen; sample too small |
| pheart363-hell-2 | 3/3 | 3/3 | 2175 ms | 2326 ms | 2326 ms | 2358 ms | 0 ms / 0 | 3 ms | 81 / 640 | 0 | none | no failure seen; sample too small |
| p22x22-hard | 3/3 | 3/3 | 565 ms | 588 ms | 588 ms | 621 ms | 0 ms / 0 | 3 ms | 37 / 413 | 0 | none | no failure seen; sample too small |
| p22x22-nightmare | 3/3 | 3/3 | 4007 ms | 4332 ms | 4332 ms | 4362 ms | 0 ms / 0 | 3 ms | 93 / 584 | 0 | none | no failure seen; sample too small |
| p22x22-hell-1 | 3/3 | 3/3 | 8468 ms | 8536 ms | 8536 ms | 8567 ms | 0 ms / 0 | 3 ms | 126 / 684 | 0 | none | no failure seen; sample too small |
| p22x22-hell-2 | 3/3 | 3/3 | 4159 ms | 4583 ms | 4583 ms | 4614 ms | 0 ms / 0 | 6 ms | 154 / 629 | 0 | none | no failure seen; sample too small |
| p22x22-hell-3 | 3/3 | 3/3 | 10.9 s | 15.0 s | 15.0 s | 15.0 s | 0 ms / 0 | 4 ms | 166 / 772 | 0 | none | no failure seen; sample too small |
| pirr466-hard | 2/3 | 3/3 | 1426 ms | 1520 ms | 1520 ms | 1579 ms | 0 ms / 0 | 5 ms | 27 / 578 | 1 | none | FAIL: complete-ten-rate (D1) |
| pirr466-nightmare | 3/3 | 3/3 | 18.9 s | 23.1 s | 23.1 s | 23.2 s | 0 ms / 0 | 5 ms | 84 / 631 | 0 | none | no failure seen; sample too small |
| pirr466-hell-1 | 3/3 | 3/3 | 15.5 s | 27.6 s | 27.6 s | 27.6 s | 0 ms / 0 | 4 ms | 106 / 635 | 0 | none | no failure seen; sample too small |
| pirr466-hell-2 | 3/3 | 3/3 | 4756 ms | 5710 ms | 5710 ms | 5742 ms | 0 ms / 0 | 4 ms | 125 / 617 | 0 | none | no failure seen; sample too small |
| pirr466-hell-3 | 3/3 | 3/3 | 17.1 s | 19.6 s | 19.6 s | 19.6 s | 0 ms / 0 | 7 ms | 145 / 631 | 0 | none | no failure seen; sample too small |

Heart 363 ran no Hell-3 cell (never offered at 363 cells); no unsupported level was requested in any matrix.

### 4.4 Node and Firefox cross-checks

- **Node (3 seeds, fresh process per row; `node --max-old-space-size=2048 tools\calibrate.mjs --matrix <reduced matrix> --workers 4 --fresh-process`):** 72 + 72 + 56 rows, 0 errors, 0 invalid measurements. It reproduces Edge exactly where the browser had no fault: the same accepted counts (BQ-2 546 vs 546 puzzles; BQ-3 425 vs 425) and the same shortfall cells (irregular 558 Hard 1/3 and Master 2/3, irregular 658 Hard and Master 2/3, irregular 466 Hard 2/3). BQ-1 differs only in the Edge worker crash (532 vs 540 puzzles). Node T10 values are close to Edge (for example irregular 558 Nightmare: 41.6 s median, 91.8 s max; 24x24 Hell-1 15.5 s; 26x26 Hell-1 24.0 s; Hell-3 22x22 12.6 s), Node Cancel 14-46 ms, Node process peak at most 644 MiB. Node never qualifies.
- **Firefox 158 (3 seeds, subsets):** BQ-1 `d24x24-hard`, `-hell-1`, `-hell-3`, `dirr558-hard`, `dirr558-hell-2`; BQ-2 `d26x26-hell-1`, `-hell-3`, `dirr658-hard`; 32 rows, 0 errors. Same shortfalls (irregular 558 Hard 1/3, irregular 658 Hard 2/3); T10 medians 0.7-18.0 s; heartbeat proxy longest stall 37 ms (no stall over 50 ms); Cancel at most 10 ms; whole-Firefox private memory samples 889-1,421 MiB (upper bound, includes the browser itself; maximum at 26x26 Hell-3).

## 5. Fixtures, matrices and tests (mechanically verified)

| Item | Check |
| --- | --- |
| `tests\fixtures\bq-irregular-558.json` | 24x24 minus x0..2/y0..2, x22..23/y21..23, (7,6), (17,16), (5,19): 18 blocked, 558 active, one component, three interior holes |
| `tests\fixtures\bq-irregular-658.json` | 26x26 minus x0..2/y0..2, x24..25/y23..25, (7,6), (19,18), (5,21): 18 blocked, 658 active, one component, three interior holes |
| `tools\bench\matrices\bq-1.json` | 24x24, 32x18 and irregular 558 at Hard, Master, Nightmare, Hell-1, Hell-2, Hell-3; cap 576; 60 seeds for 24x24 and 32x18 Hell-1 |
| `tools\bench\matrices\bq-2.json` | 26x26, 32x21 and irregular 658 at the same six levels; cap 676; 60 seeds for 26x26 Hell-1 |
| `tools\bench\matrices\bq-3.json` | Heart N22 at 45 degrees (363 cells) at Hard, Nightmare, Hell-1, Hell-2 (no Hell-3); 22x22 and irregular 466 (T23's fixture) at those plus Hell-3; cap 484; 60 seeds for 22x22 Hell-1 |
| Common | quantity 10, `uniqueness: any`, seed prefix `bq1`/`bq2`/`bq3` with seeds derived from the case id (identical on every platform), at least 20 repetitions per cell, every level checked against `offeredLevels(area)`, area above the previous limit and within the candidate cap, side at most 32 |
| `tests\bq-higher-matrix.test.js` | 9 tests: fixtures, matrix validity through `checkMatrix`, boards, levels, caps, seeds, planned probes |
| `tests\bq-limits.test.js` | 11 tests: gates not passed, limits 484 / 360 / 676, default desktop / experimental desktop / phone with known low memory / phone with unknown memory and stored `largeBoards`, candidate-cap boards rejected by the fallback caps, N-EXPERIMENTAL only above 484, each status (`not-run`, `blocked`, `fail`, `pass`) mapped to limits through `deriveLimits`, BQ-1 desktop only, BQ-3 phone only, BQ-2 moves no limit, a passing gate must reference an existing report, Heart 363 never gets Hell-3, generation code never reads qualification or limits |

## 6. Findings (details in `release-defects.md`, "T24 findings")

- **D8 (High):** D1's root cause also fails irregular 558 and 658 (and irregular 466 in BQ-3) at Hard and Master. Needs the owner's D1 decision; blocks all three gates.
- **D9 (Medium, unreproduced):** one `worker-crashed` ("The worker stopped: unknown error") on Edge, BQ-1 `d24x24-master` seed 0, 469 ms into the run, 2 puzzles retained; 0 further errors in the other 199 rows of the three Edge matrices (and 0 in BQ-0's 473 rows); 20 consecutive reruns of the same cell in a fresh page returned ten puzzles every time (`bq-2026-10-23-1-edge155-repro-worker-crash.json`).
- **R2 (Risk):** irregular 558 Nightmare T10 tail (Edge 2.6 s, 41.0 s, 89.1 s; Node 2.4 s, 41.6 s, 91.8 s) is close to the 115 s p95 limit on this fast machine (forecast: the reference laptop may exceed it).
- **R3 (Risk):** Firefox whole-process private memory reached 1,421 MiB at 26x26 Hell-3 (an upper bound that includes the browser), near the 1,536 MiB limit; needs a per-tab measurement.

## 7. Safe-fallback verification (no code change)

`node --test tests\bq-limits.test.js tests\bq-higher-matrix.test.js tests\policy.test.js tests\levels.test.js` pass; the default and stored-preference device modes keep desktop 484 / experimental desktop 676 / phone 360; `QUALIFICATION.bq1`-`bq3` are `not-run` with no report, and the raised limits exist only as `deriveLimits` outputs for hypothetical passing statuses (576 desktop only, 484 phone only, nothing for BQ-2). Changing a gate cannot alter generation: no engine file other than `policy.js` reads qualification or limits (checked by test), and only `policy.js`, `generator\state.js` and `generator\ui\level-panel.js` import it. No replay was re-recorded.

## 8. Blockers and owner steps

Exact owner steps are in `release-defects.md` ("T24 findings", blockers B9-B12). In short: decide and implement the D1/D3 option (then re-run BQ-0 in full); run the three full matrices (at least 20 seeds, 60 for Hell-1 at the largest area) unattended on the reference laptop with Chrome/Edge, Firefox and Safari on a comparable Mac (BQ-1, BQ-2) and on an Android Chrome phone and an iPhone Safari (BQ-3), with the same seeds, measurement lock and a recorded per-tab memory peak; then update `core\engine\qualification.js` only for gates with a passing report, update the pinned `policy.test.js` assertion in the same commit, and add the gate-status lines to `tasks\init-design\check-list.md`.

## 9. Raw reports

| File | Content |
| --- | --- |
| `bq-2026-10-23-1-edge155-reduced3.json / .md / .memory.json` | Edge, BQ-1, 3 seeds, 72 rows (memory = OS-tree samples) |
| `bq-2026-10-23-1-node-reduced3.json / .md` | Node, BQ-1, 3 seeds, 72 rows |
| `bq-2026-10-23-1-firefox158-subset3.json / .md / .memory.json` | Firefox, BQ-1 subset, 20 rows |
| `bq-2026-10-23-1-edge155-repro-worker-crash.json / .md / .memory.json` | Edge, 24x24 Master, 20 seeds, 21 rows (no crash) |
| `bq-2026-10-23-2-edge155-reduced3.json / .md / .memory.json` | Edge, BQ-2, 3 seeds, 72 rows |
| `bq-2026-10-23-2-node-reduced3.json / .md` | Node, BQ-2, 3 seeds, 72 rows |
| `bq-2026-10-23-2-firefox158-subset3.json / .md / .memory.json` | Firefox, BQ-2 subset, 12 rows |
| `bq-2026-10-23-3-edge155-reduced3.json / .md / .memory.json` | Desktop Edge on the BQ-3 matrix, 56 rows (not a phone) |
| `bq-2026-10-23-3-node-reduced3.json / .md` | Node on the BQ-3 matrix, 56 rows (non-phone) |
| `bq-2026-10-23-N-reduced3.matrix.json`, `-1-firefox-subset.matrix.json`, `-2-firefox-subset.matrix.json`, `-1-repro-worker-crash.matrix.json` | Reduced matrices actually run |
