# T14 restated per cell (source `docs/improve-generating/evidence/phase1/P6-bench/compare.json`, sha256 of its LF text `7fabb8eb5442e9ab7d23101fd7e36612af4da06ccce2185def652f2a25f19280`)

| Cell | Level | T1 ratio old/new | T10 ratio | Response ratio | T1 median, s (old -> new) | Response median, s | Memory checks old / new | Peak process MiB old / new |
|---|---|---|---|---|---|---|---|---|
| 14x14-master | Master | x1.14 [0.95-1.21] n 5 | x1.16 [1.12-1.28] n 5 | x1.15 [1.12-1.28] n 5 | 0.5 -> 0.5 | 3.2 -> 2.5 | pass / pass | 213 / 224 |
| 26x26-master | Master | x1.05 [0.97-1.28] n 5 | x1.2 [1.13-1.23] n 5 | x1.21 [1.14-1.22] n 5 | 1.5 -> 1.4 | 12.4 -> 10.4 | pass / pass | 562 / 544 |
| 26x26-expert | Expert | x1.01 [0.78-1.12] n 5 | x1.14 [0.99-1.24] n 5 | x1.14 [1-1.24] n 5 | 0.6 -> 0.7 | 3.9 -> 3.5 | pass / pass | 456 / 474 |
| 26x26-nightmare | Nightmare | x1.34 [0.97-1.39] n 5 | x1.32 [1.21-1.42] n 5 | x1.32 [1.21-1.42] n 5 | 5.9 -> 4.4 | 24.7 -> 18.7 | pass / pass | 556 / 528 |
| 10x10-nightmare | Nightmare | x1 [0.98-1.04] n 5 | x1.02 [0.99-1.05] n 4 | x1 [0.99-1.05] n 5 | 5.5 -> 5.5 | 17.9 -> 18.2 | pass / pass | 177 / 171 |
| 12x12-nightmare | Nightmare | x1.04 [0.93-1.08] n 5 | x1.02 [1.01-1.07] n 5 | x1.02 [1.01-1.07] n 5 | 8.6 -> 8 | 51.9 -> 51.1 | pass / pass | 183 / 184 |
| 18x18-nightmare | Nightmare | x1.11 [1.05-1.18] n 5 | x1.13 [1.07-1.15] n 5 | x1.13 [1.07-1.15] n 5 | 10.7 -> 9.7 | 60 -> 52.3 | pass / pass | 294 / 299 |

Identity: pairs 35, equal 35, metricPrefixOnly 0, noPuzzleEvidence 0, differ 0, incomplete 0.
