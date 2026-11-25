# Phase-1 readiness

Status: Ready for publication (phase 1 only; not merged)

This note says what phase 1 of "improve generating" has finished, what is qualified and by which observed results,
and what stays separate. Every number below is read from the sealed adoption record and the sealed qualification
index; none is copied from an older pass claim. The detailed PR description is [pr-body.md](pr-body.md).

## Scope and source

- Plan: [plan.md](plan.md), final, committed at `eca0f94`
  ([commit](https://github.com/tdat00/pentomino/commit/eca0f94717a56de43c52f6cb54d739360670fef8)).
- Qualified commit: `02edc6a48662fd81d38d86044881de20a5d8f4ff`
  ([commit](https://github.com/tdat00/pentomino/commit/02edc6a48662fd81d38d86044881de20a5d8f4ff)).
- Runtime digest: `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4` (40 source files), equal to
  the measured digest of T14's new source `27c6189e40bfe2000a454f755797c5745d7c2e84`.
- Source bridges, from `adoption.json` `bridges`:
  - frozen `3fc65f4681a53d3984d9218c15efbf696cc3a1a5` to main `b5eb85805f609af7deaa2489eb08675c60b2cc49`: empty;
  - measured `27c6189e40bfe2000a454f755797c5745d7c2e84` to inspected `fce2f36f1fa171c0ab718f68e8200ab619aefa1d`: empty;
  - main `b5eb85805f609af7deaa2489eb08675c60b2cc49` to inspected `fce2f36f1fa171c0ab718f68e8200ab619aefa1d`: exactly
    `core/engine/clues.js`, `core/engine/difficulty.js` and `core/engine/types.js` (the three P6 files).
- Versions are unchanged: `gen-v3`, `mixed-v3`, `xoshiro128ss-v1`, `difficulty-v3`, app `1.0.0`.
- P6 ([T12](https://github.com/tdat00/pentomino/commit/fb893c3876e1bc2adaafbe258c7cf857f652d008)) and the original
  history implementation ([T13](https://github.com/tdat00/pentomino/commit/373e74a57a7c05de0b92eb03cb6eb7ee4e6f8281))
  already existed. This close-out adds the width-8 simulation and test-table sentence
  ([P1-02](https://github.com/tdat00/pentomino/commit/02edc6a48662fd81d38d86044881de20a5d8f4ff)), the source-bound
  adoption record ([P1-01](https://github.com/tdat00/pentomino/commit/bf9bc847a5888f1b4210fb120ca76c178b87d1f0)),
  the current qualification ([P1-03b](https://github.com/tdat00/pentomino/commit/dac2ff25400b6bb92c775260e8de59c393161fcf))
  and these two documents.
- Records: [adoption.json](evidence/adoption.json), [adoption.md](evidence/adoption.md),
  [verification/index.json](evidence/verification/index.json),
  [verification/summary.md](evidence/verification/summary.md).

## Verification

Observed on the qualified commit (attempt `P1-03b-20261125T042920136Z`). Node 26 is `v26.13.0` and Node 22 is
`v22.23.5`. The evidence paths are under `docs/improve-generating-phase-1/evidence/`; the raw SHA-256 of every
file is in the table that follows.

| Check | Node | Outcome | Node seconds | Evidence |
|---|---|---|---:|---|
| Focused width-8 fold test (P1-02, `P1-02 fold8`) | v26.13.0 | pass 2, fail 0, cancelled 0; two cases, 30 simulation comparisons | 18.964 | [fold-width8/run.log](evidence/fold-width8/run.log), [fold-width8/helper.log](evidence/fold-width8/helper.log) |
| Full suite, Node 26 (`full-node26`) | v26.13.0 | 1514 of 1514 pass; 128 suites; 0 fail, cancelled, skipped, todo; both width-8 fold cases ok | 122.063 | [full-node26.log](evidence/verification/P1-03b-20261125T042920136Z/full-node26.log), [helper](evidence/verification/P1-03b-20261125T042920136Z/full-node26.helper.log) |
| Full suite, Node 22 (`full-node22`) | v22.23.5 | 1514 of 1514 pass; 128 suites; 0 fail, cancelled, skipped, todo; both width-8 fold cases ok | 141.735 | [full-node22.log](evidence/verification/P1-03b-20261125T042920136Z/full-node22.log), [helper](evidence/verification/P1-03b-20261125T042920136Z/full-node22.helper.log) |
| Generation fixture check (`tools\record-fixtures.mjs --check`) | v26.13.0 | `record-fixtures: OK` | 0.673 | [fixtures.log](evidence/verification/P1-03b-20261125T042920136Z/fixtures.log), [helper](evidence/verification/P1-03b-20261125T042920136Z/fixtures.helper.log) |
| Replay fixture check (`tools\record-fixtures.mjs --replay-case --check`) | v26.13.0 | `record-fixtures: replay case OK` | 1.306 | [replay-case.log](evidence/verification/P1-03b-20261125T042920136Z/replay-case.log), [helper](evidence/verification/P1-03b-20261125T042920136Z/replay-case.helper.log) |
| Conventions (`npm run check`) | v26.13.0 | `check-conventions: OK`; `check-site: OK` | - | [conventions.log](evidence/verification/P1-03b-20261125T042920136Z/conventions.log) |
| Static site | v26.13.0 | stamped `02edc6a4`; 120 files, equal to the tracked site files; `check-site: OK`; 414 references in 91 of 114 files stamped | - | [site.log](evidence/verification/P1-03b-20261125T042920136Z/site.log) |
| Adoption record | - | source digest `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4` equals the measured digest; three bridges as above; nine deduction dependency files byte-identical (LF-normalized) to frozen `3fc65f4`; three fixtures unchanged from frozen; 35 of 35 equal pairs; input index SHA-256 `a8a0029f9d6a8dfe7e890447c88d0adc97259508d47e536b3909a372bd80cdbd` | - | [adoption.json](evidence/adoption.json), [adoption.md](evidence/adoption.md) |
| Source guards (G-QUALIFIED) | - | tested paths unchanged since the qualified commit; sealed evidence unchanged since its commit; raw SHA-256 of every indexed log matches; run while drafting this note on head `dac2ff25400b6bb92c775260e8de59c393161fcf`, no throw | - | [verification/index.json](evidence/verification/index.json) |

The five locked engine/test invocations (the focused run and the four P1-03b runs) cost 509.741 node+quiet
seconds, which is 8.50 minutes. This is node plus quiet seconds, excluding lock waits, not wall time, within the
planned ceiling of 1,725 seconds. It is verification, not a benchmark.

Raw SHA-256 of the 13 indexed evidence files, from the index. The two `fold-width8/` files are under
`docs/improve-generating-phase-1/evidence/`; the others are under
`docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/`.

| File | SHA-256 |
|---|---|
| `fold-width8/run.log` | `968659377ff16e33a0de664309420454cfd94ed2c32fbd8b1e68d9e1f2581d47` |
| `fold-width8/helper.log` | `aa208e0d402028d5f2b084ad0e9af8e47bb05d5c2dcaadeb8ace9c18debc6e63` |
| `full-node26.log` | `cd4e148b52bc0d95d9ceacc846ba7fbcfd81b8c82472289260dbc86725a630b1` |
| `full-node26.helper.log` | `5d2ca905ddfc69208c89f4fe3db0aa7e787727a5911021ef03edf305697fbe4b` |
| `full-node22.log` | `b8df1ef34d24f187ae32fd825e5732c45beaa6182f680f25aa4e514bcfcb4954` |
| `full-node22.helper.log` | `5922cb4ce2634e458453fd6c03974c9cbacfda0da4dac58716f9aefad1513dbc` |
| `fixtures.log` | `badee78ea1627550f2951b90179741fb8a8d64ab1d0fe102a814829fe89bf428` |
| `fixtures.helper.log` | `fb4864121a09f98423f9c7a72e3ede9de2a3f8b05c0460299ad63d59c9043ded` |
| `replay-case.log` | `e475e4b334366a42a741f51cf27ba5dfd204462fe57950bd9125c6304ba61f27` |
| `replay-case.helper.log` | `94faed4a829d84bdbaa211c662b6f54ba51da101381f9d7d5a41438516145109` |
| `conventions.log` | `68db173301c5f85116e641689058beb8fc33881b4c2845d1470e9c0ea60bcae9` |
| `site.log` | `ec82932bf2876d0402f6e7c07e97941fb8987a972ee7d0ea7422beff63c459ca` |
| `tested-files.txt` | `3d3670fe1c70a3aa43422691a66a92280dfc24c7017c7e04849a85e3fe1fc2ba` |

## Historical measurement adopted

T14's measurement of P6 is adopted for this identical-source checkpoint; it was not repeated. The old source is
`3fc65f4681a53d3984d9218c15efbf696cc3a1a5` and the new source is `27c6189e40bfe2000a454f755797c5745d7c2e84`;
the publication is T14's commit
[`826ce79dcc4a77daaaea00894a6dcea46bcbd8b7`](https://github.com/tdat00/pentomino/commit/826ce79dcc4a77daaaea00894a6dcea46bcbd8b7),
with the four publications A/B, old/new, under `docs/improve-generating/evidence/phase1/P6-bench/` (their paths and
raw-byte hashes are in `adoption.json`). They are not newly measured at the qualified commit.

| Cell | Requests reaching ten, old and new | Equal pairs | Median response ratio, old/new |
|---|---|---:|---:|
| 14x14-master | 5 of 5, 5 of 5 | 5/5 | 1.14669 |
| 26x26-master | 5 of 5, 5 of 5 | 5/5 | 1.20652 |
| 26x26-expert | 5 of 5, 5 of 5 | 5/5 | 1.14279 |
| 26x26-nightmare | 5 of 5, 5 of 5 | 5/5 | 1.32283 |
| 10x10-nightmare | 4 of 5, 4 of 5 | 5/5 | 0.99951 |
| 12x12-nightmare | 5 of 5, 5 of 5 | 5/5 | 1.02356 |
| 18x18-nightmare | 5 of 5, 5 of 5 | 5/5 | 1.13278 |

The ratio is the old source's response time divided by the new source's, per seed pair: above 1, the new source answered sooner.

- 10x10-nightmare reached ten in 4 of 5 requests on both sides; the request with seed `landscape/10x10-nightmare/2`
  accepted 9 puzzles on both sides, an equal 9/9 pair.
- 70 rows and 35 of 35 observed pairs are equal (same accepted puzzles on both sides).
- Memory: whole-process peak 561.949 MiB of a 1536.000 MiB limit; accounted peak 230.803 MiB of a 1196.000 MiB
  limit; 14 side-cells, both memory checks pass in every one.
- T14 counted 2,244.925 seconds of a separate 2,700-second grant, over four successful invocations. This is not a
  new allowance and not part of the 509.741 seconds above.
- These are five-seed Node results at four workers, cold, with a fresh process per request. T14's T1 ends at set
  validation/calibration, not at a user's first playable card. T10 is conditional on reaching ten. They are
  descriptive; not browser qualification, a first-puzzle service level or a universal non-regression guarantee.
  No new timing campaign was run for this close-out.

## Limits and known item

- Node 22 verification ran on Windows, not Ubuntu CI. The static-site check is not a browser run or deployment.
- This repository's Pages workflow does not run on PR updates; empty PR checks are not a green CI result.
- The equality of generated puzzles rests on unchanged deduction code and dependencies for the same corpus inputs,
  together with P6's own canonical returned-rating, observer and replay checks; the historical 713-item P7 report is
  context only and was not rerun.
- Width 8 is a test-only simulation. The production pool remains limited to four workers.
- The frozen round's result remains `Phase 0: FAIL (control 26x26-nightmare: fail)`
  (`docs/improve-generating/evidence/frozen/V4-S4F/verdicts.md`, line 316). D-S24-35 scopes the later phase-2
  proposal; phase 1 does not reclassify the failure or qualify phase 2's changed runtime.
- Known before any merge, N-P1-DOC: the developer guides (EN and VI) do not yet name `tools/ig-proto/`, which this
  branch adds. A later documentation task adds the line before any merge (`AGENTS.md`). It is not silently fixed by
  documentation on another branch, and it is still open.

## Publication and phase-2 hand-over

- PR #11, `improve-generating` into `main`, is not merged. No release, tag or deployment is requested.
- Phase 2 starts after this close-out on a new branch `gen-v4`, from the head that P1-05 publishes, with its own
  PR whose base is `main`. While PR #11 is unmerged, that PR inherits the phase-1 commits; it must disclose this
  and show its phase-2-only range from the recorded fork point.
- P1-05 records the exact fork. No phase-2 qualification is implied by this note.

## Sign-off

SA-Astra: accepted, 2026-11-25; merged review edits and sealed evidence verified.

SA-Opus: accepted, 2026-11-25. Every value checked against `verification/index.json`, `adoption.json` and the logs; review evidence `evidence/sa-opus/p1-04-review.md` and `p1-04-findings.md` (F1 to F4 applied).
