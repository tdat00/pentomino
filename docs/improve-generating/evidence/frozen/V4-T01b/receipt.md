# Frozen source receipt (V4-T01b)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: node tools\ig-proto\receipt.mjs --label frozen --source-label "frozen 3fc65f4".

## Snapshot

| Item | Value |
|---|---|
| Verified against its manifest | yes |
| Files in the folder | 88 |
| Files in the manifest | 88 |
| Manifest digest | f4ed453da26cd8090385bb2af35448a1598221c67c8bf21c342b8594e90f4abc |
| Differences | none |

## Source

| Item | Value |
|---|---|
| Frozen commit | 3fc65f4681a53d3984d9218c15efbf696cc3a1a5 |
| Source digest (computed) | e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b |
| Expected digest (FROZEN_DIGEST) | e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b |
| Equal | yes |

## Versions

| Key | Value |
|---|---|
| algo | gen-v3 |
| policy | mixed-v3 |
| rng | xoshiro128ss-v1 |
| model | difficulty-v3 |
| app | 1.0.0 |

## Anchored edits of the variants (check-edits)

| Variant | Edits applied | Errors |
|---|---:|---|
| base | 1 | none |
| instr | 11 | none |
| log | 19 | none |
| log-p6 | 21 | none |
| log-p6-w8 | 22 | none |
| p1p5 | 21 | none |
| p1p5-main | 21 | none |
| p1p5-main-a3 | 21 | none |
| p1p5-main-p6-w8 | 24 | none |
| p1p5-w095 | 21 | none |
| p1p5-w380 | 21 | none |
| p1p5-w760 | 21 | none |
| p6 | 4 | none |
| w8 | 3 | none |

## Catalogue against the frozen source

| Difference | Count | Cases |
|---|---:|---|
| In the catalogue, not offered by the frozen source | 25 | 14x14-hell-1, 15x15b10-hell-1, 16x16-hell-1, 15x20-hell-1, 15x20-hell-2, 18x18-hell-1, 18x18-hell-2, 18x20-hell-1, 18x20-hell-2, 20x20-hell-1, 20x20-hell-2, 20x21-hell-1, 20x21-hell-2, 32x15-hell-1, 32x15-hell-2, 32x15-hell-3, 22x22-hell-1, 22x22-hell-2, 22x22-hell-3, 24x24-hell-1, 24x24-hell-2, 24x24-hell-3, 26x26-hell-1, 26x26-hell-2, 26x26-hell-3 |
| Offered by the frozen source, not in the catalogue | 0 | none |
| Differs | 0 | none |

Not offered, per level: hell-1: 12, hell-2: 9, hell-3: 4.

## Source-dependent imports (audit)

| Module | Import | Class | Frozen-label handling |
|---|---|---|---|
| lib/records.mjs | computeSourceDigest, currentVersions, APP_VERSION | source-dependent | read from sourceRoot() (T01a) |
| lib/sets.mjs | pieceCountRange | source-dependent | removed; the engine's own levels.js (step 1) |
| boards.mjs | buildLandscapeMatrix | source-dependent | provisional tool; the frozen catalogue check is receipt.mjs's, from sourceRoot() |
| budgets.mjs, compare-r2.mjs, compare.mjs, fit-prior.mjs, identity.mjs, pm2.mjs, pm4.mjs, summary.mjs | median, percentile, summarize | harness statistics | none needed: pure arithmetic, not part of a measured source |
| self-test.mjs | SOURCE_FILES, checkText | harness checks | none needed: a guard of the harness and the convention checker |
| lib/records.mjs | checkText | harness check | none needed |
