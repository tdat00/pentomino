# T11: the transport of the prior on V4-S3P (fr-frozen-none-uncapped, Hell 1, reps 0-4)

Written by `docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport.mjs`; inputs `docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport-inputs.json` (145 files, sha256Lf de2b3ae568c57f256fea71bf92921c3ad660ffffabc5303f26475f1042a5ea9f).
The table prior is `prior-s3-v1`; W must be DEDUCE.work = 760000000 (no screen on Hell 1).

| Cell | rows | valid | share | set starts (ended) | set mismatches | matching calibrations | batch starts (ended) | batch mismatches | batch starts where the per-set prior differs from the table | unattributed | other mismatches |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 14x14-hell-1 | 5 | 5 | 0.4 | 20 (13) | 0 | 5 | 81 (65) | 0 | 31 | 0 | 0 |
| 20x20-hell-1 | 5 | 5 | 0.368421 | 20 (10) | 0 | 5 | 94 (80) | 0 | 58 | 0 | 0 |
| 24x24-hell-1 | 5 | 5 | 0.219512 | 20 (12) | 0 | 5 | 89 (74) | 0 | 62 | 0 | 0 |
| 26x26-hell-1 | 5 | 5 | 0.2 | 20 (9) | 0 | 5 | 88 (74) | 0 | 22 | 0 | 0 |

| Row | winning set attempt | K | calibration level, score | wc | table prior | per-set prior | batch starts | where they differ |
|---|---|---|---|---|---|---|---|---|
| 14x14-hell-1~0 | 0 | 32 | hell-1 87 | 13 | 13 | 13 | 17 | 0 |
| 14x14-hell-1~1 | 0 | 34 | hell-1 102 | 16 | 14 | 16 | 16 | 16 |
| 14x14-hell-1~2 | 0 | 35 | hell-1 86 | 14 | 14 | 14 | 16 | 0 |
| 14x14-hell-1~3 | 0 | 32 | hell-1 91 | 11 | 13 | 11 | 15 | 15 |
| 14x14-hell-1~4 | 0 | 32 | hell-1 79 | 13 | 13 | 13 | 17 | 0 |
| 20x20-hell-1~0 | 0 | 42 | hell-1 94 | 17 | 15 | 17 | 25 | 25 |
| 20x20-hell-1~1 | 0 | 38 | hell-1 88 | 15 | 14 | 15 | 18 | 18 |
| 20x20-hell-1~2 | 0 | 39 | hell-1 94 | 14 | 14 | 14 | 17 | 0 |
| 20x20-hell-1~3 | 0 | 38 | hell-1 103 | 11 | 14 | 11 | 15 | 15 |
| 20x20-hell-1~4 | 0 | 38 | hell-1 94 | 14 | 14 | 14 | 19 | 0 |
| 24x24-hell-1~0 | 0 | 39 | hell-1 92 | 11 | 9 | 11 | 16 | 16 |
| 24x24-hell-1~1 | 0 | 42 | hell-1 101 | 12 | 9 | 12 | 14 | 14 |
| 24x24-hell-1~2 | 0 | 40 | hell-1 86 | 8 | 9 | 8 | 14 | 14 |
| 24x24-hell-1~3 | 0 | 39 | hell-1 95 | 9 | 9 | 9 | 27 | 0 |
| 24x24-hell-1~4 | 0 | 41 | hell-1 94 | 7 | 9 | 7 | 18 | 18 |
| 26x26-hell-1~0 | 0 | 42 | hell-1 95 | 7 | 8 | 7 | 22 | 22 |
| 26x26-hell-1~1 | 0 | 41 | hell-1 86 | 8 | 8 | 8 | 20 | 0 |
| 26x26-hell-1~2 | 0 | 39 | hell-1 102 | 8 | 8 | 8 | 13 | 0 |
| 26x26-hell-1~3 | 0 | 40 | hell-1 90 | 8 | 8 | 8 | 16 | 0 |
| 26x26-hell-1~4 | 0 | 40 | hell-1 94 | 8 | 8 | 8 | 17 | 0 |

Mismatches: none.

Stored-recipe transport is not observed in this row dataset: the request rows persist no candidate `made` records and no packs
(`arm.mjs`, `ig-log.js`), so `priorVerdict` does not apply to them and no pack check is claimed.
