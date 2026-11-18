# Phase-1 bench of P6: puzzle generation time of the old and the new version

> Node screening evidence at four workers, cold, one fresh process per request; not a browser qualification (D39).

## 1. Sources and machine

| Item | Value |
| --- | --- |
| Old version | main `3fc65f4` (`3fc65f4681a53d3984d9218c15efbf696cc3a1a5`), source digest `e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b` |
| New version | this branch `27c6189` (`27c6189e40bfe2000a454f755797c5745d7c2e84`; its only production change is P6, T12), source digest `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4` |
| Node | node v26.13.0, flags `--max-old-space-size=2048`, four workers, cold, one fresh process per request |
| Machine | AMD EPYC 7763 64-Core Processor                , 16 logical cores, 64.0 GiB, win32 10.0.26300 x64 |
| Profile | `landscape`, seeds `landscape/<case>/0` to `4` on both versions |
| Reports | A old 2026-11-18T06:42:37.582Z to 2026-11-18T06:50:39.555Z; A new 2026-11-18T06:52:40.022Z to 2026-11-18T06:59:58.440Z; B new 2026-11-18T07:06:37.796Z to 2026-11-18T07:15:49.292Z; B old 2026-11-18T07:17:12.598Z to 2026-11-18T07:27:00.769Z |

T1 is the click to the validated set and its calibration puzzle, T10 the click to the tenth accepted puzzle (only the requests that reached ten), the response the click to the final answer. A paired ratio is old over new for the same seed: above 1 the new version is faster.

## 2. Results per cell

### 14x14-master (Master, group A)

| Measure | old | new |
| --- | ---: | ---: |
| requests (n) | 5 | 5 |
| ten of n | 5/5 | 5/5 |
| ten or proven-all of n | 5/5 | 5/5 |
| T1 median | 0.45 s | 0.45 s |
| T1 p95 | 4.42 s | 3.65 s |
| T10 median (conditional) | 3.07 s (n 5) | 2.41 s (n 5) |
| T10 p95 (conditional) | 11.2 s (n 5) | 9.97 s (n 5) |
| response median | 3.21 s | 2.55 s |
| response p95 | 11.3 s | 10.1 s |
| response max | 11.3 s | 10.1 s |
| accepted puzzles (count: requests) | 10: 5 | 10: 5 |
| peak process memory | 213.1 MiB | 224.1 MiB |
| peak accounted memory | 16.1 MiB | 16.6 MiB |
| sampling errors (post-timing) | 12 | 12 |

Paired ratios old/new (median [min-max] n; excluded pairs):

- T1: x1.14 [0.95-1.21] n 5; 0 excluded
- T10: x1.16 [1.12-1.28] n 5; 0 excluded
- T10 - T1: x1.16 [1.07-1.34] n 5; 0 excluded
- response: x1.15 [1.12-1.28] n 5; 0 excluded

Identity: 5 of 5 pairs `equal`, 0 `metric-prefix-only`, 0 `no-puzzle-evidence`, 0 `differ`.

### 26x26-master (Master, group A)

| Measure | old | new |
| --- | ---: | ---: |
| requests (n) | 5 | 5 |
| ten of n | 5/5 | 5/5 |
| ten or proven-all of n | 5/5 | 5/5 |
| T1 median | 1.52 s | 1.45 s |
| T1 p95 | 5.68 s | 4.43 s |
| T10 median (conditional) | 12.2 s (n 5) | 10.2 s (n 5) |
| T10 p95 (conditional) | 12.5 s (n 5) | 10.8 s (n 5) |
| response median | 12.4 s | 10.4 s |
| response p95 | 12.7 s | 10.9 s |
| response max | 12.7 s | 10.9 s |
| accepted puzzles (count: requests) | 10: 5 | 10: 5 |
| peak process memory | 561.9 MiB | 544.1 MiB |
| peak accounted memory | 217.9 MiB | 215.3 MiB |
| sampling errors (post-timing) | 4 | 4 |

Paired ratios old/new (median [min-max] n; excluded pairs):

- T1: x1.05 [0.97-1.28] n 5; 0 excluded
- T10: x1.20 [1.13-1.23] n 5; 0 excluded
- T10 - T1: x1.18 [1.13-1.23] n 5; 0 excluded
- response: x1.21 [1.14-1.22] n 5; 0 excluded

Identity: 5 of 5 pairs `equal`, 0 `metric-prefix-only`, 0 `no-puzzle-evidence`, 0 `differ`.

### 26x26-expert (Expert, group A)

| Measure | old | new |
| --- | ---: | ---: |
| requests (n) | 5 | 5 |
| ten of n | 5/5 | 5/5 |
| ten or proven-all of n | 5/5 | 5/5 |
| T1 median | 0.63 s | 0.67 s |
| T1 p95 | 1.19 s | 1.06 s |
| T10 median (conditional) | 3.74 s (n 5) | 3.38 s (n 5) |
| T10 p95 (conditional) | 6.82 s (n 5) | 5.48 s (n 5) |
| response median | 3.89 s | 3.49 s |
| response p95 | 6.94 s | 5.60 s |
| response max | 6.94 s | 5.60 s |
| accepted puzzles (count: requests) | 10: 5 | 10: 5 |
| peak process memory | 456.4 MiB | 474.3 MiB |
| peak accounted memory | 182.9 MiB | 175.3 MiB |
| sampling errors (post-timing) | 1 | 1 |

Paired ratios old/new (median [min-max] n; excluded pairs):

- T1: x1.01 [0.78-1.12] n 5; 0 excluded
- T10: x1.14 [0.99-1.24] n 5; 0 excluded
- T10 - T1: x1.18 [1.09-1.28] n 5; 0 excluded
- response: x1.14 [1.00-1.24] n 5; 0 excluded

Identity: 5 of 5 pairs `equal`, 0 `metric-prefix-only`, 0 `no-puzzle-evidence`, 0 `differ`.

### 26x26-nightmare (Nightmare, group A)

| Measure | old | new |
| --- | ---: | ---: |
| requests (n) | 5 | 5 |
| ten of n | 5/5 | 5/5 |
| ten or proven-all of n | 5/5 | 5/5 |
| T1 median | 5.92 s | 4.44 s |
| T1 p95 | 10.5 s | 7.79 s |
| T10 median (conditional) | 24.6 s (n 5) | 18.6 s (n 5) |
| T10 p95 (conditional) | 28.8 s (n 5) | 20.3 s (n 5) |
| response median | 24.7 s | 18.7 s |
| response p95 | 28.9 s | 20.4 s |
| response max | 28.9 s | 20.4 s |
| accepted puzzles (count: requests) | 10: 5 | 10: 5 |
| peak process memory | 556.0 MiB | 527.8 MiB |
| peak accounted memory | 229.8 MiB | 230.8 MiB |
| sampling errors (post-timing) | 13 | 13 |

Paired ratios old/new (median [min-max] n; excluded pairs):

- T1: x1.34 [0.97-1.39] n 5; 0 excluded
- T10: x1.32 [1.21-1.42] n 5; 0 excluded
- T10 - T1: x1.30 [1.23-1.45] n 5; 0 excluded
- response: x1.32 [1.21-1.42] n 5; 0 excluded

Identity: 5 of 5 pairs `equal`, 0 `metric-prefix-only`, 0 `no-puzzle-evidence`, 0 `differ`.

### 10x10-nightmare (Nightmare, group A)

| Measure | old | new |
| --- | ---: | ---: |
| requests (n) | 5 | 5 |
| ten of n | 4/5 | 4/5 |
| ten or proven-all of n | 4/5 | 4/5 |
| T1 median | 5.51 s | 5.54 s |
| T1 p95 | 7.11 s | 6.85 s |
| T10 median (conditional) | 15.7 s (n 4) | 15.9 s (n 4) |
| T10 p95 (conditional) | 25.8 s (n 4) | 24.8 s (n 4) |
| response median | 17.9 s | 18.2 s |
| response p95 | 120.6 s | 120.7 s |
| response max | 120.6 s | 120.7 s |
| accepted puzzles (count: requests) | 9: 1, 10: 4 | 9: 1, 10: 4 |
| peak process memory | 177.4 MiB | 171.3 MiB |
| peak accounted memory | 11.3 MiB | 11.4 MiB |
| sampling errors (post-timing) | 4 | 4 |

Paired ratios old/new (median [min-max] n; excluded pairs):

- T1: x1.00 [0.98-1.04] n 5; 0 excluded
- T10: x1.02 [0.99-1.05] n 4; 1 excluded
- T10 - T1: x1.02 [0.98-1.05] n 4; 1 excluded
- response: x1.00 [0.99-1.05] n 5; 0 excluded

Identity: 5 of 5 pairs `equal`, 0 `metric-prefix-only`, 0 `no-puzzle-evidence`, 0 `differ`.

### 12x12-nightmare (Nightmare, group B)

| Measure | old | new |
| --- | ---: | ---: |
| requests (n) | 5 | 5 |
| ten of n | 5/5 | 5/5 |
| ten or proven-all of n | 5/5 | 5/5 |
| T1 median | 8.60 s | 7.98 s |
| T1 p95 | 21.1 s | 21.4 s |
| T10 median (conditional) | 51.7 s (n 5) | 51.0 s (n 5) |
| T10 p95 (conditional) | 70.7 s (n 5) | 70.0 s (n 5) |
| response median | 51.9 s | 51.1 s |
| response p95 | 70.8 s | 70.1 s |
| response max | 70.8 s | 70.1 s |
| accepted puzzles (count: requests) | 10: 5 | 10: 5 |
| peak process memory | 183.2 MiB | 184.1 MiB |
| peak accounted memory | 16.8 MiB | 16.8 MiB |
| sampling errors (post-timing) | 12 | 12 |

Paired ratios old/new (median [min-max] n; excluded pairs):

- T1: x1.04 [0.93-1.08] n 5; 0 excluded
- T10: x1.02 [1.01-1.07] n 5; 0 excluded
- T10 - T1: x1.04 [1.01-1.07] n 5; 0 excluded
- response: x1.02 [1.01-1.07] n 5; 0 excluded

Identity: 5 of 5 pairs `equal`, 0 `metric-prefix-only`, 0 `no-puzzle-evidence`, 0 `differ`.

### 18x18-nightmare (Nightmare, group B)

| Measure | old | new |
| --- | ---: | ---: |
| requests (n) | 5 | 5 |
| ten of n | 5/5 | 5/5 |
| ten or proven-all of n | 5/5 | 5/5 |
| T1 median | 10.7 s | 9.65 s |
| T1 p95 | 20.2 s | 18.1 s |
| T10 median (conditional) | 59.9 s (n 5) | 52.1 s (n 5) |
| T10 p95 (conditional) | 99.9 s (n 5) | 89.3 s (n 5) |
| response median | 60.0 s | 52.3 s |
| response p95 | 100.0 s | 89.4 s |
| response max | 100.0 s | 89.4 s |
| accepted puzzles (count: requests) | 10: 5 | 10: 5 |
| peak process memory | 294.1 MiB | 299.3 MiB |
| peak accounted memory | 64.4 MiB | 63.3 MiB |
| sampling errors (post-timing) | 15 | 15 |

Paired ratios old/new (median [min-max] n; excluded pairs):

- T1: x1.11 [1.05-1.18] n 5; 0 excluded
- T10: x1.13 [1.07-1.15] n 5; 0 excluded
- T10 - T1: x1.15 [1.07-1.19] n 5; 0 excluded
- response: x1.13 [1.07-1.15] n 5; 0 excluded

Identity: 5 of 5 pairs `equal`, 0 `metric-prefix-only`, 0 `no-puzzle-evidence`, 0 `differ`.

## 3. Pooled paired ratios per level

| Level | Cells | T1 | T10 | T10 - T1 | Response |
| --- | --- | ---: | ---: | ---: | ---: |
| Master | 14x14-master, 26x26-master | x1.09 [0.95-1.28] n 10 | x1.18 [1.12-1.28] n 10 | x1.18 [1.07-1.34] n 10 | x1.17 [1.12-1.28] n 10 |
| Expert | 26x26-expert | x1.01 [0.78-1.12] n 5 | x1.14 [0.99-1.24] n 5 | x1.18 [1.09-1.28] n 5 | x1.14 [1.00-1.24] n 5 |
| Nightmare | 26x26-nightmare, 10x10-nightmare, 12x12-nightmare, 18x18-nightmare | x1.06 [0.93-1.39] n 20 | x1.07 [0.99-1.42] n 19 | x1.07 [0.98-1.45] n 19 | x1.07 [0.99-1.42] n 20 |

Median [min-max] n of old over new, the pairs of the level pooled.

## 4. Identity of the puzzles

35 of 35 pairs are `equal` (equal production result digests and summaries at equal accepted counts), 0 are `metric-prefix-only` (puzzle-prefix identity not established), 0 are `no-puzzle-evidence`, 0 `differ`. A `metric-prefix-only` pair has matching summaries of its common puzzles at unequal accepted counts; it does not establish that the puzzles are prefix-identical.

T12's parity tests and the unchanged fixtures remain the compatibility evidence.

<details>
<summary>The production digests of the 35 pairs</summary>

| Cell | Seed | Accepted old/new | Identity | Old digest | New digest |
| --- | --- | --- | --- | --- | --- |
| 14x14-master | `landscape/14x14-master/0` | 10/10 | equal | `821178507c2fcabf1ac9c38421011b1479437db2abfa8d542768ee25b345818b` | `821178507c2fcabf1ac9c38421011b1479437db2abfa8d542768ee25b345818b` |
| 14x14-master | `landscape/14x14-master/1` | 10/10 | equal | `567cb2bba4cf34a5d840493a44027284f0117ebb7c75f12f06b2e3481f31a77a` | `567cb2bba4cf34a5d840493a44027284f0117ebb7c75f12f06b2e3481f31a77a` |
| 14x14-master | `landscape/14x14-master/2` | 10/10 | equal | `8f3c0a5c548c0650c88b94bf8677e8dd2a4af348e5988e9838e842c0c88f6b3e` | `8f3c0a5c548c0650c88b94bf8677e8dd2a4af348e5988e9838e842c0c88f6b3e` |
| 14x14-master | `landscape/14x14-master/3` | 10/10 | equal | `0a3010695db332f307796f403aa45ff98c2802028fb785fd8cc64d46811da4c4` | `0a3010695db332f307796f403aa45ff98c2802028fb785fd8cc64d46811da4c4` |
| 14x14-master | `landscape/14x14-master/4` | 10/10 | equal | `ab614181295d6e9e2bba2b8cb9e2dae06fe068568ce55088fcf899e9666bdfe4` | `ab614181295d6e9e2bba2b8cb9e2dae06fe068568ce55088fcf899e9666bdfe4` |
| 26x26-master | `landscape/26x26-master/0` | 10/10 | equal | `319009ee5fc772eb2ccb74d8019517e506d87f27445e527cc928ceaa499fdd8d` | `319009ee5fc772eb2ccb74d8019517e506d87f27445e527cc928ceaa499fdd8d` |
| 26x26-master | `landscape/26x26-master/1` | 10/10 | equal | `8ac1d02364751658a3122f80d07b59639cedfe832aa7d8f05d8b31d2e14b3eaa` | `8ac1d02364751658a3122f80d07b59639cedfe832aa7d8f05d8b31d2e14b3eaa` |
| 26x26-master | `landscape/26x26-master/2` | 10/10 | equal | `6668b934172a858d0a03f5467416b95d2ddd3d18b2769768b93a03285fee934f` | `6668b934172a858d0a03f5467416b95d2ddd3d18b2769768b93a03285fee934f` |
| 26x26-master | `landscape/26x26-master/3` | 10/10 | equal | `8b2c273884629e1e30010b9aeb9ed5bcb718f3a721b3dbae379e96671652be10` | `8b2c273884629e1e30010b9aeb9ed5bcb718f3a721b3dbae379e96671652be10` |
| 26x26-master | `landscape/26x26-master/4` | 10/10 | equal | `938e721d73d5bb778196df72c1a62553544e9ec93124cb5c50a33d670285b8d4` | `938e721d73d5bb778196df72c1a62553544e9ec93124cb5c50a33d670285b8d4` |
| 26x26-expert | `landscape/26x26-expert/0` | 10/10 | equal | `fa44d727abb636ab14ce0b1792a7b8ec6e13e2c7036dc0b801a16f1ec52e0268` | `fa44d727abb636ab14ce0b1792a7b8ec6e13e2c7036dc0b801a16f1ec52e0268` |
| 26x26-expert | `landscape/26x26-expert/1` | 10/10 | equal | `49d9de08c1d0a6eb36dfd5c63e928fe93ca6bd58b0ae1683a289d0f0168972a0` | `49d9de08c1d0a6eb36dfd5c63e928fe93ca6bd58b0ae1683a289d0f0168972a0` |
| 26x26-expert | `landscape/26x26-expert/2` | 10/10 | equal | `ec55728bca73c289e02dfb6d618b23029f61715bfe0f23db500bf1a4adb8a0e2` | `ec55728bca73c289e02dfb6d618b23029f61715bfe0f23db500bf1a4adb8a0e2` |
| 26x26-expert | `landscape/26x26-expert/3` | 10/10 | equal | `d7fb5510814736967a477584b185b9012412112f34f62a068db12dda5ec86d36` | `d7fb5510814736967a477584b185b9012412112f34f62a068db12dda5ec86d36` |
| 26x26-expert | `landscape/26x26-expert/4` | 10/10 | equal | `f466197cb310d6ac678f12b183e309d483e58e5c126572d1844f5aa939729866` | `f466197cb310d6ac678f12b183e309d483e58e5c126572d1844f5aa939729866` |
| 26x26-nightmare | `landscape/26x26-nightmare/0` | 10/10 | equal | `2c9671fcd9a9561cce05fce2d7ccc500d659e47da1a9ddea497deff9408f3588` | `2c9671fcd9a9561cce05fce2d7ccc500d659e47da1a9ddea497deff9408f3588` |
| 26x26-nightmare | `landscape/26x26-nightmare/1` | 10/10 | equal | `7d594bd68183adfc7fb55a55153cb86dd2347130a7b843cb66d1af7e2ed29a83` | `7d594bd68183adfc7fb55a55153cb86dd2347130a7b843cb66d1af7e2ed29a83` |
| 26x26-nightmare | `landscape/26x26-nightmare/2` | 10/10 | equal | `c92c220ad9a22ec8eaabc347dd0aa0b9d237b7024928cd7abaffa8f420bb5beb` | `c92c220ad9a22ec8eaabc347dd0aa0b9d237b7024928cd7abaffa8f420bb5beb` |
| 26x26-nightmare | `landscape/26x26-nightmare/3` | 10/10 | equal | `f6cbd37084d17859138065feaa9399e5f2ce61324032eb733e8cdbb74dfa4ad5` | `f6cbd37084d17859138065feaa9399e5f2ce61324032eb733e8cdbb74dfa4ad5` |
| 26x26-nightmare | `landscape/26x26-nightmare/4` | 10/10 | equal | `82b38527e1766f3be9b8d195be65078e07d872e93f6f20d0b5ca2ecc92903fe4` | `82b38527e1766f3be9b8d195be65078e07d872e93f6f20d0b5ca2ecc92903fe4` |
| 10x10-nightmare | `landscape/10x10-nightmare/0` | 10/10 | equal | `3b2e3f1350b10e2e0820788e652fec1ebf1a922789a604176ba7595f8794891b` | `3b2e3f1350b10e2e0820788e652fec1ebf1a922789a604176ba7595f8794891b` |
| 10x10-nightmare | `landscape/10x10-nightmare/1` | 10/10 | equal | `27499926b81f49629dbb0a60450026c2f408f75f82d9db23d0b1c3665e9181dd` | `27499926b81f49629dbb0a60450026c2f408f75f82d9db23d0b1c3665e9181dd` |
| 10x10-nightmare | `landscape/10x10-nightmare/2` | 9/9 | equal | `b69a7133a0fd7c2987219995f51a46339b9e4dc36a189bbdbae861c267b5241c` | `b69a7133a0fd7c2987219995f51a46339b9e4dc36a189bbdbae861c267b5241c` |
| 10x10-nightmare | `landscape/10x10-nightmare/3` | 10/10 | equal | `8c72386d3c32259e4a5f7d4dc7adbf12e0bf5bdd7cba51e6758285861c069b3e` | `8c72386d3c32259e4a5f7d4dc7adbf12e0bf5bdd7cba51e6758285861c069b3e` |
| 10x10-nightmare | `landscape/10x10-nightmare/4` | 10/10 | equal | `49014036d1deeb777ce7b0a10225d471cb26558534d032bbf71408b2a1c51efd` | `49014036d1deeb777ce7b0a10225d471cb26558534d032bbf71408b2a1c51efd` |
| 12x12-nightmare | `landscape/12x12-nightmare/0` | 10/10 | equal | `645a17b30d0dcfd3b1d9b6cee7a8c4a1e07ab825a9710ab2a488b2520d7c805c` | `645a17b30d0dcfd3b1d9b6cee7a8c4a1e07ab825a9710ab2a488b2520d7c805c` |
| 12x12-nightmare | `landscape/12x12-nightmare/1` | 10/10 | equal | `154c621a89d80e16b9ccd4660b9fb5f307d62491f23762e38c0f6a717378c369` | `154c621a89d80e16b9ccd4660b9fb5f307d62491f23762e38c0f6a717378c369` |
| 12x12-nightmare | `landscape/12x12-nightmare/2` | 10/10 | equal | `611ea6010175e0c41ea2913500c36c94aa8e6eee9f81b740049f2d2039bea694` | `611ea6010175e0c41ea2913500c36c94aa8e6eee9f81b740049f2d2039bea694` |
| 12x12-nightmare | `landscape/12x12-nightmare/3` | 10/10 | equal | `41985f35b7045cfb67f9d641eade3e32358c3202d28afff9fc2191dd3d2c16c6` | `41985f35b7045cfb67f9d641eade3e32358c3202d28afff9fc2191dd3d2c16c6` |
| 12x12-nightmare | `landscape/12x12-nightmare/4` | 10/10 | equal | `0690ff24370ca45fdd4b6a7a277384de2eea0affa7f7890cb16513f407d1cfb0` | `0690ff24370ca45fdd4b6a7a277384de2eea0affa7f7890cb16513f407d1cfb0` |
| 18x18-nightmare | `landscape/18x18-nightmare/0` | 10/10 | equal | `bdfd6158318bae63a3374d67a0add3095f407db56d25e54ac4f90e43cdf60b6e` | `bdfd6158318bae63a3374d67a0add3095f407db56d25e54ac4f90e43cdf60b6e` |
| 18x18-nightmare | `landscape/18x18-nightmare/1` | 10/10 | equal | `dfaa8a84f05e7be74aa6739d38e0a6d543ae99007cf618b0b9526693fe4f4423` | `dfaa8a84f05e7be74aa6739d38e0a6d543ae99007cf618b0b9526693fe4f4423` |
| 18x18-nightmare | `landscape/18x18-nightmare/2` | 10/10 | equal | `3a4438decc55280ba422c993919e6caf5dadc8b2ddf32fa11ec53c218a162954` | `3a4438decc55280ba422c993919e6caf5dadc8b2ddf32fa11ec53c218a162954` |
| 18x18-nightmare | `landscape/18x18-nightmare/3` | 10/10 | equal | `392c7e0ea1b5e9a739915e02e09cdf484ff8e68720321bd878c451704b35e2c6` | `392c7e0ea1b5e9a739915e02e09cdf484ff8e68720321bd878c451704b35e2c6` |
| 18x18-nightmare | `landscape/18x18-nightmare/4` | 10/10 | equal | `a6bad1467c0eb86a7c90e6c2c92ec77cc48468b20faea8347d0a6b849d5a57ae` | `a6bad1467c0eb86a7c90e6c2c92ec77cc48468b20faea8347d0a6b849d5a57ae` |

</details>

## 5. Memory checks (phase 1's gate, N-V4-12)

The whole-process peak must be at most 1536.0 MiB (`peak-process-memory`) and the accounted peak at most 1196.0 MiB at four workers (`byte-accounting`); each must be `pass`, and `model-too-large` 0.

| Cell | Side | Peak process | peak-process-memory | Peak accounted | byte-accounting | model-too-large |
| --- | --- | ---: | --- | ---: | --- | --- |
| 14x14-master | old | 213.1 MiB | pass | 16.1 MiB | pass | pass (0) |
| 14x14-master | new | 224.1 MiB | pass | 16.6 MiB | pass | pass (0) |
| 26x26-master | old | 561.9 MiB | pass | 217.9 MiB | pass | pass (0) |
| 26x26-master | new | 544.1 MiB | pass | 215.3 MiB | pass | pass (0) |
| 26x26-expert | old | 456.4 MiB | pass | 182.9 MiB | pass | pass (0) |
| 26x26-expert | new | 474.3 MiB | pass | 175.3 MiB | pass | pass (0) |
| 26x26-nightmare | old | 556.0 MiB | pass | 229.8 MiB | pass | pass (0) |
| 26x26-nightmare | new | 527.8 MiB | pass | 230.8 MiB | pass | pass (0) |
| 10x10-nightmare | old | 177.4 MiB | pass | 11.3 MiB | pass | pass (0) |
| 10x10-nightmare | new | 171.3 MiB | pass | 11.4 MiB | pass | pass (0) |
| 12x12-nightmare | old | 183.2 MiB | pass | 16.8 MiB | pass | pass (0) |
| 12x12-nightmare | new | 184.1 MiB | pass | 16.8 MiB | pass | pass (0) |
| 18x18-nightmare | old | 294.1 MiB | pass | 64.4 MiB | pass | pass (0) |
| 18x18-nightmare | new | 299.3 MiB | pass | 63.3 MiB | pass | pass (0) |

## 6. Ledger of the owner's separate allowance

4 invocations, 2244.925 counted seconds of the allowance of 2700 s (counted = node seconds + the lock wait, at most 45 s).

| Group | Side | Limit (s) | Node (s) | Lock wait (s) | Quiet (s) | Counted (s) | Killed | Exit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| A | old | 900 | 482.539 | 45.173 | 45 | 527.539 | false | 0 |
| A | new | 900 | 440.116 | 114.314 | 45 | 485.116 | false | 0 |
| B | new | 900 | 552.106 | 395.219 | 45 | 597.106 | false | 0 |
| B | old | 900 | 590.164 | 78.205 | 45 | 635.164 | false | 0 |

## 7. Limitations

- Five requests per cell provide descriptive results only; the nearest-rank p95 is the maximum of the available sample.
- Response medians include partial responses: each side's ten of n stands beside it.
- The landscape profile's diagnostic sampling runs after the T1, T10 and response timing, but it takes invocation time and counts in the whole-process peak memory.
- The order (A old then new, B new then old) reduces one order imbalance but does not cancel temporal drift within a cell.
