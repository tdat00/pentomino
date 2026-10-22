# BQ-0 release acceptance: latest evidence index

**Date:** 2026-10-22 | **Task:** T23 | **Status: BLOCKED. BQ-0 is NOT passed.** `QUALIFICATION.bq0` stays `not-run` in `core\engine\qualification.js` (left untouched on purpose: its test pins every gate to `not-run`, and a source edit would invalidate the measured source digest). Nothing here authorizes a release, higher limits or the Pages deployment.

This file is the stable index. Raw, dated reports sit next to it as `docs\calibration\bq-2026-10-22-0-*`; defects and blockers are in `release-defects.md`.

## 1. Headline

- **Coverage is reduced, not full.** The full BQ-0 matrix (`tools\bench\matrices\bq-0.json`) has 43 cells and 940 generation rows (20 seeds per cell, 60 for Hell-1 at 22x22 and 18x20) plus 43 cancel probes. Here: Edge 430 generation rows (10 seeds per cell, the first ten of the official seeds), Firefox 3 seeds per cell, Node screening 3 seeds per cell plus 20 seeds for the irregular 466 low levels. The 60-seed Hell-1 requirement, the 20-seed minimum and every phone/Mac/iPhone platform are **not met**.
- **Failed criteria seen in the measured subset (genuine, reproducible):** (a) C2 ten-puzzle completion on the irregular 466 board: dirr466-hard 1/10; dirr466-expert 5/10; dirr466-master 6/10 (Edge); Node with 20 seeds: hard 2/20, expert 9/20, master 14/20, and on the 6x10 board Very Easy 16/20 (80%); (b) C4 main-thread tasks over 50 ms in 31 of 43 cells on Edge (all boards of 360 or more cells; worst 221 ms), attributed by profiling to main-thread engine work in the generation client (`release-defects.md`, D2).
- **No failure seen in the measured subset:** T10 median/p95 and every response within the limits (largest Edge response 72.2 s), Cancel settle at most 7 ms, accounted bytes at most 165 MiB (budget 1,196 MiB), whole-browser private memory at most 794 MiB by OS sampling (upper bound; limit 1,536 MiB), no model-too-large error, and the runner re-validated every accepted puzzle (valid layout, clues, band, distinct layout and clue keys).
- The scaled-watchdog wiring probe and the cross-app acceptance harness pass on Edge (section 5). Screen reader, axe, Safari, Android, iPhone and the Pages deployment are blocked (section 7).

## 2. Identity

| Item | Value |
| --- | --- |
| Source revision | HEAD `6e9126377f110fb4ae1d061b228ecfde82da963c` plus uncommitted T23 files only (matrix, fixture, tests, docs; no runtime source changed). Node reports show `+uncommitted-changes` for that reason. |
| Source digest (runtime files hashed by Node and by the page) | `e651b4730699e0cd8ae2c53c017df757e9d6f7e1ebbb2f2a159fc05599e0962a`; identical in every report: true |
| Versions | {"algo":"gen-v2","policy":"mixed-v2","rng":"xoshiro128ss-v1","model":"difficulty-v2","app":"1.0.0"} |
| Full matrix | `tools\bench\matrices\bq-0.json`, 43 cells. Reduced matrices run: Edge A `71df3a2075e1922a`, Edge B `53a0bf5a2ef3d644`, 3-seed `fad23334f8f0a7ef` |
| Seeds | `bq0/<case id>/<n>` for n = 0..19 (0..59 for Hell-1 at 22x22 and 18x20); every reduced run uses the first n of the same list, so browsers share mask and seeds |
| Pool | 4 workers, cold pool per run (start-up included in T1/T10), thumbnails off, `uniqueness: any`, quantity 10 |

### Machine (not a reference laptop)

| Item | Value |
| --- | --- |
| CPU | AMD EPYC 7763 64-Core Processor, 8 cores / 16 logical (virtualized server class; the reference platform is a mid-range 4-core/8-thread laptop) |
| RAM / OS | 64 GB; Windows 11 Enterprise 10.0.26300; no battery |
| Edge | Edg/155.0.4283.62 (Chromium 155), headless `--headless=new`, flags `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows`, page `visibilityState` visible, cross-origin isolated by a scratch static server with COOP/COEP (same files; `tools\serve.mjs` has no header option) |
| Firefox | Firefox/158.0 headless via WebDriver BiDi; served by `tools\serve.mjs` (no COOP/COEP; no Long Tasks API, so the heartbeat proxy) |
| Node | v24.21.0, `--max-old-space-size=2048`, one fresh process per row |
| Not available | Chrome (not installed), Safari/macOS, Android phone, iPhone, a screen reader, an approved axe extension |

Headless caveats: a headless browser is not a user-visible foreground window; timers are not throttled, but compositor and GPU load differ from a headed laptop. This machine is much faster than the reference laptop, so the passing timing figures are optimistic for it; the failing figures would not improve.

## 3. Coverage: cells run versus not run

| Platform | Browser | Cells | Seeds per cell | Generation rows | Status |
| --- | --- | --- | --- | --- | --- |
| Desktop (22x22, 32x15, Heart 432, irregular 466, 6x10, 12x12) | Microsoft Edge 155.0.4283.62 | 39 of 39 | 10 of 20 (22x22 Hell-1: 10 of 60) | 390 | REDUCED |
| 18x20 (360 cells) cells | Edge on a desktop (not a phone) | 4 of 4 | 10 of 20 (Hell-1: 10 of 60) | 40 | desktop run only; real phones BLOCKED |
| All 43 cells | Firefox 158.0 | 43 of 43 | 3 of 20 | 129 | SCREENING (3 seeds) |
| All 43 cells | Node node v24.21.0 | 43 of 43 | 3 of 20 | 129 | Node screening only (never qualifies) |
| Irregular 466 Hard/Expert/Master; 6x10 Very Easy/Easy | Node | 5 cells | 20 of 20 | 100 | Node screening, full seed count |
| Desktop | Chrome | 0 | 0 | 0 | NOT RUN (not installed) |
| Desktop | Safari on a comparable Mac | 0 | 0 | 0 | BLOCKED (no Mac) |
| Phone | Android Chrome | 0 | 0 | 0 | BLOCKED (no device) |
| Phone | iPhone Safari | 0 | 0 | 0 | BLOCKED (no device) |

No cell reached the required seed count (>= 20, and >= 60 for Hell-1 at the largest area). A 10-seed cell cannot prove the 99% first-puzzle rule (one failure is already below 99%) or a p95; "no failure seen" below means a reduced sample was clean, never that a cell qualified. The report builder keeps every such cell at `incomplete-evidence`.

## 4. Per-criterion results

| Criterion | Edge (10 seeds) | Firefox (3 seeds) | Node (3 seeds) | Overall |
| --- | --- | --- | --- | --- |
| C1 T10 median <= 60 s, p95 <= 115 s, every response <= 120 s | no failure seen (max response 72.2 s) | no failure seen | no failure seen | not shown (reduced) |
| C2 >= 90% ten distinct valid puzzles; >= 99% at least one | FAIL (3 cells) | FAIL (3 cells) | FAIL (3 cells) | **FAIL** (irregular 466) |
| C3 browser peak <= 1.5 GiB; accounted within budget; no model-too-large | accounted max 165 MiB; OS tree max 794 MiB; memory API max 143 MiB; no model-too-large | OS tree max 625 MiB | process max 566 MiB | not shown (no per-tab peak recorded by hand) |
| C4 no non-rendering main-thread task > 50 ms; Cancel < 200 ms | FAIL (31 cells) (max 221 ms, Long Tasks API); cancel max 7 ms | FAIL (9 cells) (heartbeat proxy) | n/a | **FAIL** (main thread) |

### 4.1 Edge, per cell (10 seeds; the four 18x20 cells ran on desktop Edge)

Main task / long tasks = longest task in ms / count of tasks over 50 ms. MiB = accounted worker+main bytes / whole-Edge OS-tree private bytes (upper bound) during the cell. Cancel = longest settle of that cell's probe.

| Case | 10 of 10 | >= 1 | T10 median | T10 p95 | T10 max | Max response | Main task / long tasks | Cancel | MiB | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| d22x22-hard | 10/10 | 10/10 | 676 ms | 938 ms | 938 ms | 957 ms | 119 ms / 11 | 5 ms | 43 / 576 | FAIL: C4 main thread |
| d22x22-expert | 10/10 | 10/10 | 585 ms | 716 ms | 716 ms | 735 ms | 91 ms / 12 | 5 ms | 43 / 576 | FAIL: C4 main thread |
| d22x22-master | 10/10 | 10/10 | 619 ms | 910 ms | 910 ms | 921 ms | 101 ms / 10 | 4 ms | 61 / 507 | FAIL: C4 main thread |
| d22x22-nightmare | 10/10 | 10/10 | 2180 ms | 6074 ms | 6074 ms | 6084 ms | 112 ms / 13 | 5 ms | 98 / 649 | FAIL: C4 main thread |
| d22x22-hell-1 | 10/10 | 10/10 | 7693 ms | 10.5 s | 10.5 s | 10.6 s | 128 ms / 10 | 4 ms | 122 / 654 | FAIL: C4 main thread |
| d22x22-hell-2 | 10/10 | 10/10 | 3910 ms | 4308 ms | 4308 ms | 4320 ms | 136 ms / 10 | 4 ms | 154 / 651 | FAIL: C4 main thread |
| d22x22-hell-3 | 10/10 | 10/10 | 9709 ms | 13.4 s | 13.4 s | 13.4 s | 162 ms / 11 | 4 ms | 165 / 642 | FAIL: C4 main thread |
| d32x15-hard | 10/10 | 10/10 | 699 ms | 1046 ms | 1046 ms | 1059 ms | 79 ms / 10 | 4 ms | 38 / 443 | FAIL: C4 main thread |
| d32x15-expert | 10/10 | 10/10 | 536 ms | 806 ms | 806 ms | 820 ms | 86 ms / 10 | 4 ms | 43 / 475 | FAIL: C4 main thread |
| d32x15-master | 10/10 | 10/10 | 566 ms | 684 ms | 684 ms | 695 ms | 104 ms / 10 | 4 ms | 60 / 475 | FAIL: C4 main thread |
| d32x15-nightmare | 10/10 | 10/10 | 2857 ms | 26.7 s | 26.7 s | 26.8 s | 113 ms / 10 | 5 ms | 94 / 632 | FAIL: C4 main thread |
| d32x15-hell-1 | 10/10 | 10/10 | 8341 ms | 8612 ms | 8612 ms | 8623 ms | 121 ms / 10 | 4 ms | 119 / 626 | FAIL: C4 main thread |
| d32x15-hell-2 | 10/10 | 10/10 | 3935 ms | 4864 ms | 4864 ms | 4876 ms | 134 ms / 10 | 7 ms | 152 / 703 | FAIL: C4 main thread |
| d32x15-hell-3 | 10/10 | 10/10 | 11.0 s | 23.9 s | 23.9 s | 23.9 s | 143 ms / 10 | 4 ms | 164 / 710 | FAIL: C4 main thread |
| dheart432-hard | 10/10 | 10/10 | 701 ms | 1243 ms | 1243 ms | 1256 ms | 95 ms / 10 | 6 ms | 35 / 535 | FAIL: C4 main thread |
| dheart432-expert | 10/10 | 10/10 | 643 ms | 961 ms | 961 ms | 974 ms | 75 ms / 10 | 7 ms | 37 / 454 | FAIL: C4 main thread |
| dheart432-master | 10/10 | 10/10 | 697 ms | 953 ms | 953 ms | 962 ms | 84 ms / 10 | 4 ms | 47 / 525 | FAIL: C4 main thread |
| dheart432-nightmare | 10/10 | 10/10 | 3917 ms | 9486 ms | 9486 ms | 9497 ms | 94 ms / 10 | 4 ms | 72 / 649 | FAIL: C4 main thread |
| dheart432-hell-1 | 10/10 | 10/10 | 5425 ms | 6253 ms | 6253 ms | 6264 ms | 105 ms / 10 | 4 ms | 88 / 611 | FAIL: C4 main thread |
| dheart432-hell-2 | 10/10 | 10/10 | 2966 ms | 3358 ms | 3358 ms | 3367 ms | 117 ms / 10 | 4 ms | 116 / 603 | FAIL: C4 main thread |
| dirr466-hard | 1/10 | 10/10 | 960 ms | 960 ms | 960 ms | 1463 ms | 74 ms / 2 | 4 ms | 31 / 492 | FAIL: C2 ten-rate, C4 main thread |
| dirr466-expert | 5/10 | 10/10 | 1593 ms | 1655 ms | 1655 ms | 1665 ms | 78 ms / 7 | 4 ms | 43 / 536 | FAIL: C2 ten-rate, C4 main thread |
| dirr466-master | 6/10 | 10/10 | 1569 ms | 2564 ms | 2564 ms | 2574 ms | 89 ms / 11 | 4 ms | 61 / 569 | FAIL: C2 ten-rate, C4 main thread |
| dirr466-nightmare | 10/10 | 10/10 | 10.1 s | 72.2 s | 72.2 s | 72.2 s | 221 ms / 20 | 4 ms | 84 / 640 | FAIL: C4 main thread |
| dirr466-hell-1 | 10/10 | 10/10 | 13.9 s | 31.8 s | 31.8 s | 31.8 s | 116 ms / 10 | 5 ms | 108 / 685 | FAIL: C4 main thread |
| dirr466-hell-2 | 10/10 | 10/10 | 4012 ms | 5943 ms | 5943 ms | 5954 ms | 126 ms / 10 | 4 ms | 137 / 669 | FAIL: C4 main thread |
| dirr466-hell-3 | 10/10 | 10/10 | 13.6 s | 26.3 s | 26.3 s | 26.3 s | 132 ms / 10 | 4 ms | 146 / 794 | FAIL: C4 main thread |
| d6x10-very-easy | 9/10 | 10/10 | 355 ms | 443 ms | 443 ms | 445 ms | 0 ms / 0 | 1 ms | 2 / 411 | no failure seen; evidence incomplete |
| d6x10-easy | 10/10 | 10/10 | 261 ms | 402 ms | 402 ms | 405 ms | 0 ms / 0 | 1 ms | 2 / 405 | no failure seen; evidence incomplete |
| d6x10-normal | 10/10 | 10/10 | 259 ms | 424 ms | 424 ms | 427 ms | 0 ms / 0 | 1 ms | 2 / 381 | no failure seen; evidence incomplete |
| d6x10-hard | 10/10 | 10/10 | 274 ms | 1015 ms | 1015 ms | 1018 ms | 0 ms / 0 | 1 ms | 2 / 394 | no failure seen; evidence incomplete |
| d6x10-expert | 10/10 | 10/10 | 617 ms | 918 ms | 918 ms | 922 ms | 0 ms / 0 | 1 ms | 3 / 389 | no failure seen; evidence incomplete |
| d6x10-master | 10/10 | 10/10 | 376 ms | 793 ms | 793 ms | 796 ms | 0 ms / 0 | 1 ms | 3 / 397 | no failure seen; evidence incomplete |
| d12x12-easy | 10/10 | 10/10 | 280 ms | 315 ms | 315 ms | 323 ms | 0 ms / 0 | 2 ms | 7 / 388 | no failure seen; evidence incomplete |
| d12x12-normal | 10/10 | 10/10 | 278 ms | 373 ms | 373 ms | 379 ms | 0 ms / 0 | 2 ms | 7 / 387 | no failure seen; evidence incomplete |
| d12x12-hard | 10/10 | 10/10 | 393 ms | 1866 ms | 1866 ms | 1870 ms | 0 ms / 0 | 3 ms | 12 / 440 | no failure seen; evidence incomplete |
| d12x12-expert | 10/10 | 10/10 | 429 ms | 620 ms | 620 ms | 624 ms | 0 ms / 0 | 3 ms | 14 / 469 | no failure seen; evidence incomplete |
| d12x12-master | 10/10 | 10/10 | 812 ms | 2239 ms | 2239 ms | 2244 ms | 0 ms / 0 | 2 ms | 14 / 527 | no failure seen; evidence incomplete |
| d12x12-nightmare | 10/10 | 10/10 | 961 ms | 1166 ms | 1166 ms | 1170 ms | 0 ms / 0 | 1 ms | 13 / 448 | no failure seen; evidence incomplete |
| p18x20-hard | 10/10 | 10/10 | 499 ms | 686 ms | 686 ms | 694 ms | 57 ms / 10 | 4 ms | 23 / 428 | FAIL: C4 main thread |
| p18x20-nightmare | 10/10 | 10/10 | 4416 ms | 8445 ms | 8445 ms | 8453 ms | 75 ms / 10 | 3 ms | 53 / 548 | FAIL: C4 main thread |
| p18x20-hell-1 | 10/10 | 10/10 | 3455 ms | 4146 ms | 4146 ms | 4155 ms | 86 ms / 10 | 3 ms | 66 / 645 | FAIL: C4 main thread |
| p18x20-hell-2 | 10/10 | 10/10 | 2000 ms | 10.2 s | 10.2 s | 10.2 s | 92 ms / 10 | 3 ms | 89 / 580 | FAIL: C4 main thread |

### 4.2 Firefox, per cell (3 seeds, screening)

Main task here is the 10 ms heartbeat proxy (Firefox has no Long Tasks API). MiB: accounted / whole-Firefox process tree.

| Case | 10 of 10 | >= 1 | T10 median | T10 p95 | T10 max | Max response | Main task (proxy) / events | Cancel | MiB | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| d22x22-hard | 3/3 | 3/3 | 975 ms | 1018 ms | 1018 ms | 1041 ms | 81 ms / 2 | 6 ms | 34 / 585 | FAIL: C4 main thread |
| d22x22-expert | 3/3 | 3/3 | 709 ms | 728 ms | 728 ms | 743 ms | 49 ms / 0 | 4 ms | 43 / 585 | no failure seen; evidence incomplete |
| d22x22-master | 3/3 | 3/3 | 723 ms | 761 ms | 761 ms | 774 ms | 74 ms / 1 | 4 ms | 62 / 625 | FAIL: C4 main thread |
| d22x22-nightmare | 3/3 | 3/3 | 2854 ms | 5249 ms | 5249 ms | 5261 ms | 51 ms / 1 | 5 ms | 93 / 577 | FAIL: C4 main thread |
| d22x22-hell-1 | 3/3 | 3/3 | 6411 ms | 9001 ms | 9001 ms | 9021 ms | 70 ms / 1 | 4 ms | 118 / 577 | FAIL: C4 main thread |
| d22x22-hell-2 | 3/3 | 3/3 | 4047 ms | 4224 ms | 4224 ms | 4238 ms | 44 ms / 0 | 4 ms | 154 / 541 | no failure seen; evidence incomplete |
| d22x22-hell-3 | 3/3 | 3/3 | 8308 ms | 8519 ms | 8519 ms | 8534 ms | 36 ms / 0 | 5 ms | 157 / 500 | no failure seen; evidence incomplete |
| d32x15-hard | 3/3 | 3/3 | 669 ms | 738 ms | 738 ms | 754 ms | 65 ms / 2 | 3 ms | 33 / 533 | FAIL: C4 main thread |
| d32x15-expert | 3/3 | 3/3 | 592 ms | 673 ms | 673 ms | 687 ms | 45 ms / 0 | 4 ms | 35 / 533 | no failure seen; evidence incomplete |
| d32x15-master | 3/3 | 3/3 | 634 ms | 697 ms | 697 ms | 709 ms | 31 ms / 0 | 4 ms | 56 / 526 | no failure seen; evidence incomplete |
| d32x15-nightmare | 3/3 | 3/3 | 2816 ms | 4999 ms | 4999 ms | 5023 ms | 79 ms / 2 | 3 ms | 89 / 502 | FAIL: C4 main thread |
| d32x15-hell-1 | 3/3 | 3/3 | 7118 ms | 7779 ms | 7779 ms | 7792 ms | 30 ms / 0 | 5 ms | 110 / 515 | no failure seen; evidence incomplete |
| d32x15-hell-2 | 3/3 | 3/3 | 3737 ms | 3886 ms | 3886 ms | 3903 ms | 29 ms / 0 | 5 ms | 145 / 553 | no failure seen; evidence incomplete |
| d32x15-hell-3 | 3/3 | 3/3 | 13.7 s | 21.4 s | 21.4 s | 21.4 s | 57 ms / 2 | 5 ms | 157 / 561 | FAIL: C4 main thread |
| dheart432-hard | 3/3 | 3/3 | 698 ms | 998 ms | 998 ms | 1010 ms | 31 ms / 0 | 3 ms | 25 / 551 | no failure seen; evidence incomplete |
| dheart432-expert | 3/3 | 3/3 | 779 ms | 1085 ms | 1085 ms | 1096 ms | 35 ms / 0 | 3 ms | 35 / 551 | no failure seen; evidence incomplete |
| dheart432-master | 3/3 | 3/3 | 742 ms | 999 ms | 999 ms | 1007 ms | 42 ms / 0 | 4 ms | 47 / 527 | no failure seen; evidence incomplete |
| dheart432-nightmare | 3/3 | 3/3 | 811 ms | 1144 ms | 1144 ms | 1156 ms | 26 ms / 0 | 4 ms | 63 / 499 | no failure seen; evidence incomplete |
| dheart432-hell-1 | 3/3 | 3/3 | 5120 ms | 5490 ms | 5490 ms | 5503 ms | 23 ms / 0 | 3 ms | 84 / 497 | no failure seen; evidence incomplete |
| dheart432-hell-2 | 3/3 | 3/3 | 2543 ms | 2877 ms | 2877 ms | 2889 ms | 43 ms / 0 | 3 ms | 109 / 549 | no failure seen; evidence incomplete |
| dirr466-hard | 0/3 | 3/3 | n/a | n/a | n/a | 1126 ms | 10 ms / 0 | 3 ms | 26 / 507 | FAIL: C2 ten-rate |
| dirr466-expert | 2/3 | 3/3 | 1604 ms | 1690 ms | 1690 ms | 1699 ms | 19 ms / 0 | 3 ms | 36 / 507 | FAIL: C2 ten-rate |
| dirr466-master | 2/3 | 3/3 | 1244 ms | 1377 ms | 1377 ms | 1387 ms | 35 ms / 0 | 4 ms | 53 / 489 | FAIL: C2 ten-rate |
| dirr466-nightmare | 3/3 | 3/3 | 9138 ms | 25.8 s | 25.8 s | 25.9 s | 107 ms / 2 | 3 ms | 81 / 489 | FAIL: C4 main thread |
| dirr466-hell-1 | 3/3 | 3/3 | 13.7 s | 29.3 s | 29.3 s | 29.3 s | 48 ms / 0 | 4 ms | 106 / 508 | no failure seen; evidence incomplete |
| dirr466-hell-2 | 3/3 | 3/3 | 3717 ms | 4194 ms | 4194 ms | 4207 ms | 21 ms / 0 | 4 ms | 132 / 539 | no failure seen; evidence incomplete |
| dirr466-hell-3 | 3/3 | 3/3 | 10.7 s | 11.7 s | 11.7 s | 11.7 s | 29 ms / 0 | 5 ms | 148 / 560 | no failure seen; evidence incomplete |
| d6x10-very-easy | 3/3 | 3/3 | 414 ms | 438 ms | 438 ms | 440 ms | 12 ms / 0 | 2 ms | 2 / 540 | no failure seen; evidence incomplete |
| d6x10-easy | 3/3 | 3/3 | 433 ms | 434 ms | 434 ms | 438 ms | 13 ms / 0 | 1 ms | 1 / 540 | no failure seen; evidence incomplete |
| d6x10-normal | 3/3 | 3/3 | 405 ms | 438 ms | 438 ms | 441 ms | 14 ms / 0 | 1 ms | 2 / 522 | no failure seen; evidence incomplete |
| d6x10-hard | 3/3 | 3/3 | 742 ms | 947 ms | 947 ms | 951 ms | 14 ms / 0 | 3 ms | 2 / 582 | no failure seen; evidence incomplete |
| d6x10-expert | 3/3 | 3/3 | 623 ms | 913 ms | 913 ms | 917 ms | 10 ms / 0 | 2 ms | 3 / 582 | no failure seen; evidence incomplete |
| d6x10-master | 3/3 | 3/3 | 459 ms | 483 ms | 483 ms | 488 ms | 14 ms / 0 | 2 ms | 3 / 533 | no failure seen; evidence incomplete |
| d12x12-easy | 3/3 | 3/3 | 408 ms | 424 ms | 424 ms | 432 ms | 25 ms / 0 | 1 ms | 8 / 521 | no failure seen; evidence incomplete |
| d12x12-normal | 3/3 | 3/3 | 404 ms | 501 ms | 501 ms | 510 ms | 30 ms / 0 | 2 ms | 7 / 509 | no failure seen; evidence incomplete |
| d12x12-hard | 3/3 | 3/3 | 503 ms | 530 ms | 530 ms | 539 ms | 21 ms / 0 | 2 ms | 11 / 591 | no failure seen; evidence incomplete |
| d12x12-expert | 3/3 | 3/3 | 534 ms | 588 ms | 588 ms | 594 ms | 25 ms / 0 | 2 ms | 14 / 591 | no failure seen; evidence incomplete |
| d12x12-master | 3/3 | 3/3 | 1497 ms | 1990 ms | 1990 ms | 1996 ms | 14 ms / 0 | 2 ms | 14 / 530 | no failure seen; evidence incomplete |
| d12x12-nightmare | 3/3 | 3/3 | 904 ms | 924 ms | 924 ms | 933 ms | 34 ms / 0 | 3 ms | 12 / 530 | no failure seen; evidence incomplete |
| p18x20-hard | 3/3 | 3/3 | 552 ms | 726 ms | 726 ms | 739 ms | 49 ms / 0 | 3 ms | 23 / 547 | no failure seen; evidence incomplete |
| p18x20-nightmare | 3/3 | 3/3 | 3462 ms | 7847 ms | 7847 ms | 7864 ms | 61 ms / 1 | 4 ms | 53 / 547 | FAIL: C4 main thread |
| p18x20-hell-1 | 3/3 | 3/3 | 3502 ms | 3593 ms | 3593 ms | 3606 ms | 21 ms / 0 | 3 ms | 64 / 543 | no failure seen; evidence incomplete |
| p18x20-hell-2 | 3/3 | 3/3 | 5011 ms | 5763 ms | 5763 ms | 5773 ms | 40 ms / 0 | 4 ms | 84 / 561 | no failure seen; evidence incomplete |

### 4.3 Node screening (3 seeds, fresh process per row; not browser evidence)

| Case | 10 of 10 | >= 1 | T10 median | T10 p95 | T10 max | Max response | Cancel | Process MiB | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| d22x22-hard | 3/3 | 3/3 | 718 ms | 890 ms | 890 ms | 923 ms | 17 ms | 310 | screening: no failure seen |
| d22x22-expert | 3/3 | 3/3 | 676 ms | 744 ms | 744 ms | 780 ms | 15 ms | 309 | screening: no failure seen |
| d22x22-master | 3/3 | 3/3 | 744 ms | 822 ms | 822 ms | 854 ms | 16 ms | 298 | screening: no failure seen |
| d22x22-nightmare | 3/3 | 3/3 | 2815 ms | 5321 ms | 5321 ms | 5352 ms | 16 ms | 367 | screening: no failure seen |
| d22x22-hell-1 | 3/3 | 3/3 | 7421 ms | 11.6 s | 11.6 s | 11.6 s | 19 ms | 389 | screening: no failure seen |
| d22x22-hell-2 | 3/3 | 3/3 | 4508 ms | 4515 ms | 4515 ms | 4545 ms | 18 ms | 417 | screening: no failure seen |
| d22x22-hell-3 | 3/3 | 3/3 | 9795 ms | 9950 ms | 9950 ms | 9980 ms | 19 ms | 403 | screening: no failure seen |
| d32x15-hard | 3/3 | 3/3 | 745 ms | 773 ms | 773 ms | 808 ms | 15 ms | 265 | screening: no failure seen |
| d32x15-expert | 3/3 | 3/3 | 643 ms | 647 ms | 647 ms | 683 ms | 15 ms | 276 | screening: no failure seen |
| d32x15-master | 3/3 | 3/3 | 688 ms | 700 ms | 700 ms | 731 ms | 17 ms | 274 | screening: no failure seen |
| d32x15-nightmare | 3/3 | 3/3 | 2930 ms | 5244 ms | 5244 ms | 5273 ms | 16 ms | 328 | screening: no failure seen |
| d32x15-hell-1 | 3/3 | 3/3 | 7477 ms | 8825 ms | 8825 ms | 8857 ms | 17 ms | 357 | screening: no failure seen |
| d32x15-hell-2 | 3/3 | 3/3 | 4131 ms | 4311 ms | 4311 ms | 4342 ms | 20 ms | 462 | screening: no failure seen |
| d32x15-hell-3 | 3/3 | 3/3 | 15.5 s | 24.1 s | 24.1 s | 24.2 s | 18 ms | 566 | screening: no failure seen |
| dheart432-hard | 3/3 | 3/3 | 701 ms | 1232 ms | 1232 ms | 1263 ms | 17 ms | 310 | screening: no failure seen |
| dheart432-expert | 3/3 | 3/3 | 767 ms | 971 ms | 971 ms | 1002 ms | 15 ms | 352 | screening: no failure seen |
| dheart432-master | 3/3 | 3/3 | 804 ms | 874 ms | 874 ms | 896 ms | 14 ms | 293 | screening: no failure seen |
| dheart432-nightmare | 3/3 | 3/3 | 817 ms | 1280 ms | 1280 ms | 1308 ms | 15 ms | 300 | screening: no failure seen |
| dheart432-hell-1 | 3/3 | 3/3 | 5727 ms | 6166 ms | 6166 ms | 6194 ms | 15 ms | 318 | screening: no failure seen |
| dheart432-hell-2 | 3/3 | 3/3 | 2804 ms | 3175 ms | 3175 ms | 3204 ms | 18 ms | 354 | screening: no failure seen |
| dirr466-hard | 0/3 | 3/3 | n/a | n/a | n/a | 1074 ms | 16 ms | 290 | FAIL: C2 ten-rate |
| dirr466-expert | 2/3 | 3/3 | 1817 ms | 1843 ms | 1843 ms | 1864 ms | 16 ms | 458 | FAIL: C2 ten-rate |
| dirr466-master | 2/3 | 3/3 | 1301 ms | 1503 ms | 1503 ms | 1523 ms | 15 ms | 439 | FAIL: C2 ten-rate |
| dirr466-nightmare | 3/3 | 3/3 | 9184 ms | 28.7 s | 28.7 s | 28.8 s | 15 ms | 387 | screening: no failure seen |
| dirr466-hell-1 | 3/3 | 3/3 | 16.1 s | 33.1 s | 33.1 s | 33.2 s | 16 ms | 412 | screening: no failure seen |
| dirr466-hell-2 | 3/3 | 3/3 | 4186 ms | 4750 ms | 4750 ms | 4779 ms | 17 ms | 416 | screening: no failure seen |
| dirr466-hell-3 | 3/3 | 3/3 | 12.8 s | 13.5 s | 13.5 s | 13.5 s | 17 ms | 504 | screening: no failure seen |
| d6x10-very-easy | 3/3 | 3/3 | 302 ms | 422 ms | 422 ms | 429 ms | 6 ms | 180 | screening: no failure seen |
| d6x10-easy | 3/3 | 3/3 | 277 ms | 302 ms | 302 ms | 316 ms | 6 ms | 185 | screening: no failure seen |
| d6x10-normal | 3/3 | 3/3 | 288 ms | 361 ms | 361 ms | 374 ms | 5 ms | 184 | screening: no failure seen |
| d6x10-hard | 3/3 | 3/3 | 638 ms | 934 ms | 934 ms | 948 ms | 6 ms | 172 | screening: no failure seen |
| d6x10-expert | 3/3 | 3/3 | 478 ms | 892 ms | 892 ms | 905 ms | 4 ms | 175 | screening: no failure seen |
| d6x10-master | 3/3 | 3/3 | 351 ms | 384 ms | 384 ms | 399 ms | 6 ms | 168 | screening: no failure seen |
| d12x12-easy | 3/3 | 3/3 | 358 ms | 371 ms | 371 ms | 392 ms | 9 ms | 224 | screening: no failure seen |
| d12x12-normal | 3/3 | 3/3 | 336 ms | 349 ms | 349 ms | 368 ms | 9 ms | 226 | screening: no failure seen |
| d12x12-hard | 3/3 | 3/3 | 454 ms | 507 ms | 507 ms | 525 ms | 9 ms | 222 | screening: no failure seen |
| d12x12-expert | 3/3 | 3/3 | 528 ms | 578 ms | 578 ms | 595 ms | 8 ms | 217 | screening: no failure seen |
| d12x12-master | 3/3 | 3/3 | 1356 ms | 2102 ms | 2102 ms | 2118 ms | 8 ms | 222 | screening: no failure seen |
| d12x12-nightmare | 3/3 | 3/3 | 940 ms | 955 ms | 955 ms | 973 ms | 9 ms | 220 | screening: no failure seen |
| p18x20-hard | 3/3 | 3/3 | 536 ms | 600 ms | 600 ms | 628 ms | 13 ms | 288 | screening: no failure seen |
| p18x20-nightmare | 3/3 | 3/3 | 3842 ms | 8224 ms | 8224 ms | 8250 ms | 16 ms | 264 | screening: no failure seen |
| p18x20-hell-1 | 3/3 | 3/3 | 3943 ms | 4033 ms | 4033 ms | 4060 ms | 15 ms | 294 | screening: no failure seen |
| p18x20-hell-2 | 3/3 | 3/3 | 5238 ms | 6504 ms | 6504 ms | 6533 ms | 15 ms | 317 | screening: no failure seen |

### 4.4 Node, 20 seeds where the 3-seed screen found a shortfall: irregular 466 Hard/Expert/Master and 6x10 Very Easy/Easy

| Case | 10 of 10 | >= 1 | T10 median (conditional) | Shortfall reasons (accepted count, reason) |
| --- | --- | --- | --- | --- |
| dirr466-hard | 2/20 (10%) | 20/20 | 1416 ms | 13 x 4 layouts-not-found, 5 x 8 layouts-not-found |
| dirr466-expert | 9/20 (45%) | 20/20 | 1701 ms | 5 x 4 layouts-not-found, 2 x 7 layouts-not-found, 3 x 8 layouts-not-found, 1 x 2 layouts-not-found |
| dirr466-master | 14/20 (70%) | 20/20 | 1782 ms | 1 x 1 layouts-not-found, 1 x 8 layouts-not-found, 3 x 4 layouts-not-found, 1 x 3 layouts-not-found |
| d6x10-very-easy | 16/20 (80%) | 20/20 | 352 ms | 1 x 7 layouts-not-found, 2 x 8 layouts-not-found, 1 x 9 layouts-not-found |
| d6x10-easy | 18/20 (90%) | 20/20 | 331 ms | 2 x 8 layouts-not-found |

### 4.5 Certificates, saturation and errors (Edge, all runs)

- Accepted puzzles: 4204; score-saturated: 1416 (rating saturation flag set; reported, not hidden).
- Lazy certificates (settle separately, never block T10): unique 1009, multiple 1656, not proved 1445, **notChecked 94** (accepted puzzles whose certificate had not settled within the 30 s wait). With uniqueness `any` no certificate result changes pass/fail.
- Errors recorded on generation rows: 0 (no worker, pool, model-too-large or validation error).

## 5. Cross-app acceptance and scaled-watchdog probe (Edge, real pages)

Harnesses: `tests\browser\acceptance.html` (real generator and player pages in same-origin frames) and `tests\browser\watchdog.html`. Raw output: `bq-2026-10-22-0-acceptance-edge.json`, `bq-2026-10-22-0-watchdog-edge.json`.

| Check | Result |
| --- | --- |
| Default 10x6 / Normal -> set -> 5 puzzles -> Play; Heart N10 / Master -> 10 -> Play; 22x22 / Hell-3 -> 10 -> Play (recorded scores reproduced through the real UI and real workers) | pass |
| Root redirect, prefix-served load, version label, file import in a fresh profile, Recent/library, pasted link, `#pack=` and `#lib=` addresses, invalid import keeps the open game and announces an alert | pass |
| Desktop and below-900 px layouts (structural: columns, stacking, top-bar order, tray position, selection toolbar, sticky action bar, puzzle-level selector, Copy pack link, Straighten in the top bar) | pass (structure only; no pixel comparison with the inlined diagrams) |
| Touch targets >= 44 px with `pointer: coarse` emulated | pass (the 44 px rule is coarse-pointer only; with a fine pointer the harness reports the check as blocked) |
| Text contrast >= 4.5:1 (computed styles; large text 3:1), accessible names, no positive tabindex, live regions, `role=application` board with instructions | pass (automated approximation, not axe) |
| No CSP violation, script error, unhandled rejection or external request in any frame | pass; one console error per page load: `GET /favicon.ico` 404 (defect D5) |
| Scaled watchdog (20x clock, production TIME constants, 4 busy module workers, engine-verified calibration puzzle retained) | pass: busy workers terminated at 115,278 virtual ms; client answered at 115,680 virtual ms (5784 real ms) with N-PARTIAL and 1 puzzle; UI idle again |
| Real keyboard-only completion at 0/45/90/315, drag/tap, win dialog, reduced motion, Labels/Patterns | covered at component level by the T20 harness (`tests\browser\player-controls.html`, re-run green); not re-driven through the real page |
| Alternate valid win, cancel retaining accepted puzzles, storage failure, partial/failure messages | covered by the T18/T20 harnesses (re-run green); outside the statistics |

## 6. Measurement methods

- **T1/T10, validity:** `tools\bench\runner.js` timed interval from the Generate click to the validated set and to the tenth accepted puzzle after the immediate New Puzzles; every accepted puzzle is re-validated (valid complete layout, clues from the layout, in-band rating, strictly distinct layout and clue keys). Failed runs are never zero-duration successes. T10 percentiles are conditional on complete runs and sit next to completion rates.
- **Main thread (C4):** Chromium Long Tasks API (`maxMainTaskMs`, `longTasksOver50`) inside the timed interval only. Firefox: the T21 10 ms MessageChannel heartbeat **proxy**, labelled in every row. Cancel: separate per-cell probe (`cancelLatencyMs`, Cancel handler to settled workers and idle UI). `visibilityState` was visible in every report.
- **Memory (C3):** accounted bytes are the pool/worker accounting. `performance.measureUserAgentSpecificMemory` needs cross-origin isolation and yields a sample only after its own GC cycle, so rows shorter than that have no value (`n/a`, never estimated). The "OS tree" column is a cross-check: sum of `PrivateMemorySize64` over all browser processes (browser, GPU, utility, renderers with workers) sampled every 3 s and mapped to rows by time; it includes unrelated browser overhead, so it is an upper bound of tab + workers. It is not a hand-recorded task-manager peak.
- **Long-task attribution:** `bq-2026-10-22-0-edge-longtask-profile.json` (CDP sampling profile on the non-isolated server, 9 runs of 22x22) names the main-thread functions of each busy stretch over 40 ms.
- **Seeds, order, lifecycle:** deterministic seed list above, rows sequential, cold pool, no code change during measurement.

## 7. Blockers

See `release-defects.md`, section "Blockers", for exact owner steps: other platforms (Chrome, Safari/Mac, Android, iPhone), reference-class hardware, full-duration runs (20 and 60 seeds per cell), screen reader, axe, the GitHub Pages deployment and its verification, and sign-off.

## 8. Raw reports

| File | Content |
| --- | --- |
| `bq-2026-10-22-0-edge-a.json / .md` | Edge, 22x22 and 32x15, 10 seeds, 154 rows |
| `bq-2026-10-22-0-edge-b.json / .md` | Edge, Heart 432, irregular 466, 6x10, 12x12, 18x20, 10 seeds, 319 rows |
| `bq-2026-10-22-0-edge-a.matrix.json, -b.matrix.json` | Reduced matrices actually run (10 seeds) |
| `bq-2026-10-22-0-firefox158-reduced3.json / .md` | Firefox, all cells, 3 seeds |
| `bq-2026-10-22-0-reduced3.matrix.json` | 3-seed matrix (Firefox and Node) |
| `bq-2026-10-22-0-node.json / .md` | Node screening, 3 seeds, 172 rows (fresh process per row) |
| `bq-2026-10-22-0-node-irr466-lower.json / .md` | Node, irregular 466 Hard/Expert/Master, 20 seeds, 63 rows |
| `bq-2026-10-22-0-node-6x10-low.json / .md` | Node, 6x10 Very Easy/Easy, 20 seeds, 42 rows |
| `bq-2026-10-22-0-edge-longtask-profile.json` | Sampling profile of the main-thread long tasks |
| `bq-2026-10-22-0-acceptance-edge.json` | Cross-app acceptance harness output (fine pointer, then coarse pointer) |
| `bq-2026-10-22-0-watchdog-edge.json` | Scaled-watchdog probe output |
| `release-defects.md` | Defects, Node crash investigation, blockers |

