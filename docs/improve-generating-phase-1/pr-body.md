## Phase 1: complete, not merged

This PR contains phase 1: P6's same-puzzle rating improvement, the progressive-presentation/history checks,
and their close-out evidence. Do not merge. No release, tag or deployment is requested.

Phase 2 (`gen-v4`) will continue on branch `gen-v4` from this branch's published phase-1 close-out, in a
separate PR into `main`. No phase-2 implementation is part of this phase-1 close-out.

## Details of the changes

### Engine
- [`core/engine/difficulty.js`](https://github.com/tdat00/pentomino/blob/improve-generating/core/engine/difficulty.js): the shared DLX diagnostic, `rateLean` and `completeDiagnostic`.
- [`core/engine/clues.js`](https://github.com/tdat00/pentomino/blob/improve-generating/core/engine/clues.js): lean profiles only without a seam, recorder or `onRate`; successful returned ratings
  are completed. Observed/replay ratings retain the full diagnostic.
- [`core/engine/types.js`](https://github.com/tdat00/pentomino/blob/improve-generating/core/engine/types.js): the internal-only `dlxStop: 'skipped'` type; valid stored ratings never contain it.

Scores, work units, selection, uniqueness, fixtures and stored puzzle identities are unchanged.
The algorithm remains `gen-v3`, the policy `mixed-v3`, the model `difficulty-v3`, the RNG `xoshiro128ss-v1`
and the app version `1.0.0`.

Evidence: T12, commit [`fb893c3`](https://github.com/tdat00/pentomino/commit/fb893c3876e1bc2adaafbe258c7cf857f652d008),
task record [`T12-p6-diagnostic-for-returned-ratings.md`](https://github.com/tdat00/pentomino/blob/improve-generating/tasks/improve-generating-v4/T12-p6-diagnostic-for-returned-ratings.md).

### Tests
- [`tests/difficulty.test.js`](https://github.com/tdat00/pentomino/blob/improve-generating/tests/difficulty.test.js): lean/full completion, field/key order, immutability and stored-claim refusal.
- [`tests/clues.test.js`](https://github.com/tdat00/pentomino/blob/improve-generating/tests/clues.test.js): returned canonical rating and observed/unobserved/recorded selection equality.
- [`tests/generation-client.test.js`](https://github.com/tdat00/pentomino/blob/improve-generating/tests/generation-client.test.js): accepted puzzles stream in slot order, identical at one and four workers.
- [`tests/generator-controller.test.js`](https://github.com/tdat00/pentomino/blob/improve-generating/tests/generator-controller.test.js): shown-puzzle history after short, cancelled, failed and size-trimmed batches.
- [`tests/generate.test.js`](https://github.com/tdat00/pentomino/blob/improve-generating/tests/generate.test.js): the close-out adds logical width 8 to the existing simulation at widths 1, 2, 3,
  4 and 8, two real seed cases and three completion orders: 30 comparisons against the serial fold.

Width 8 is test-only simulation. The production pool remains limited to four workers.

Evidence: T12 as above (`tests/difficulty.test.js`, `tests/clues.test.js`); T13, commit
[`373e74a`](https://github.com/tdat00/pentomino/commit/373e74a57a7c05de0b92eb03cb6eb7ee4e6f8281), task record
[`T13-progressive-presentation-history.md`](https://github.com/tdat00/pentomino/blob/improve-generating/tasks/improve-generating-v4/T13-progressive-presentation-history.md)
(`tests/generation-client.test.js`, `tests/generator-controller.test.js`); P1-02, commit
[`02edc6a`](https://github.com/tdat00/pentomino/commit/02edc6a48662fd81d38d86044881de20a5d8f4ff), focused run log
[`fold-width8/run.log`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/fold-width8/run.log)
(`tests/generate.test.js`).

### Living specification
[`docs/design-detail.md`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/design-detail.md): shared types and engine APIs (§§4.1-4.2), history and P6 (§§6.9-6.10), lean clue-search
ratings in the metrics section (§7.1), rating (§7.10), capacity-trim history (§10.5), and the generate test-table
sentence (§13.2).

The UI stays one puzzle per press, newest-first cards, Play disabled while busy, with no EN/VI text change.
A shown puzzle stays in its set's seen-history after every terminal outcome or later card/capacity removal,
until an explicit history reset. Existing save/flush/failure semantics remain; no new crash-durability promise.

## Close-out verification

Qualified commit: [`02edc6a48662fd81d38d86044881de20a5d8f4ff`](https://github.com/tdat00/pentomino/commit/02edc6a48662fd81d38d86044881de20a5d8f4ff).
Runtime digest: `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4` (40 source files), equal to the
measured digest of T14's new source `27c6189e40bfe2000a454f755797c5745d7c2e84`.

Observed on the qualified commit (attempt `P1-03b-20261125T042920136Z`). Node 26 is `v26.13.0` and Node 22 is
`v22.23.5`. Evidence paths are under `docs/improve-generating-phase-1/evidence/`; raw-byte hashes for all 13 indexed files are in `verification/index.json`, linked below.

| Check | Node | Outcome | Node seconds | Evidence |
|---|---|---|---:|---|
| Focused width-8 fold test (P1-02, `P1-02 fold8`) | v26.13.0 | pass 2, fail 0, cancelled 0; two cases, 30 simulation comparisons | 18.964 | [`fold-width8/run.log`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/fold-width8/run.log), [`helper.log`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/fold-width8/helper.log) |
| Full suite, Node 26 (`full-node26`) | v26.13.0 | 1514 of 1514 pass; 128 suites; 0 fail, cancelled, skipped, todo; both width-8 fold cases ok | 122.063 | [`full-node26.log`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/full-node26.log), [`helper`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/full-node26.helper.log) |
| Full suite, Node 22 (`full-node22`) | v22.23.5 | 1514 of 1514 pass; 128 suites; 0 fail, cancelled, skipped, todo; both width-8 fold cases ok | 141.735 | [`full-node22.log`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/full-node22.log), [`helper`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/full-node22.helper.log) |
| Generation fixture check (`tools\record-fixtures.mjs --check`) | v26.13.0 | `record-fixtures: OK` | 0.673 | [`fixtures.log`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/fixtures.log), [`helper`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/fixtures.helper.log) |
| Replay fixture check (`tools\record-fixtures.mjs --replay-case --check`) | v26.13.0 | `record-fixtures: replay case OK` | 1.306 | [`replay-case.log`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/replay-case.log), [`helper`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/replay-case.helper.log) |
| Conventions (`npm run check`) | v26.13.0 | `check-conventions: OK`; `check-site: OK` | - | [`conventions.log`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/conventions.log) |
| Static site | v26.13.0 | stamped `02edc6a4`; 120 files, equal to the tracked site files; `check-site: OK`; 414 references in 91 of 114 files stamped | - | [`site.log`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/site.log) |
| Adoption of T14 (P1-01) | - | the runtime is the source T14 measured (same 40-file digest); among deployed sources, only the three P6 files differ from `main`; the nine deduction files and the three fixtures are unchanged from the frozen source; 35 of 35 pairs equal | - | [`adoption.json`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/adoption.json), [`adoption.md`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/adoption.md) |
| Source guard (G-QUALIFIED) | - | later commits change documents only: no tested file has changed since the qualified commit, and every sealed log keeps its recorded SHA-256 | - | [`verification/index.json`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/index.json) |

The five locked engine/test invocations cost 509.741 node+quiet seconds, which is 8.50 minutes. This is node plus
quiet seconds, excluding lock waits, not wall time, within the planned ceiling of 1,725 seconds.

Records: [`adoption.json`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/adoption.json),
[`verification/index.json`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/index.json),
[`verification/summary.md`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/summary.md),
[`readiness.md`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/readiness.md).

Node 22 verification ran on Windows, not Ubuntu CI. The static-site check is not a browser run or deployment.
This repository's Pages workflow does not run on PR updates; empty PR checks are not a green CI result.

## Historical timing and memory

Measured by T14 ([`826ce79`](https://github.com/tdat00/pentomino/commit/826ce79dcc4a77daaaea00894a6dcea46bcbd8b7)),
old source [`3fc65f4`](https://github.com/tdat00/pentomino/commit/3fc65f4681a53d3984d9218c15efbf696cc3a1a5) against
new source [`27c6189`](https://github.com/tdat00/pentomino/commit/27c6189e40bfe2000a454f755797c5745d7c2e84); the four
publications are under [`docs/improve-generating/evidence/phase1/P6-bench/`](https://github.com/tdat00/pentomino/tree/improve-generating/docs/improve-generating/evidence/phase1/P6-bench).
They are not newly measured at the qualified commit.

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

10x10-nightmare reached ten in 4 of 5 requests on both sides; the request with seed `landscape/10x10-nightmare/2`
accepted 9 puzzles on both sides, an equal 9/9 pair. All 35 observed pairs (70 rows) are equal.

Memory: whole-process peak 561.949 MiB of a 1536.000 MiB limit; accounted peak 230.803 MiB of a 1196.000 MiB limit;
14 side-cells, both memory checks pass in every one. T14 counted 2,244.925 seconds of a separate 2,700-second grant,
over four successful invocations; it is not part of the 509.741 seconds above.

These are five-seed Node results at four workers, cold, with a fresh process per request. T14's T1 ends at
set validation/calibration, not at a user's first playable card. T10 is conditional on reaching ten.
The results are descriptive: not browser qualification, a first-puzzle service level or a universal
non-regression guarantee. The production digests cover ordered layout/clue keys and scores; the P6/fixture
tests cover full returned-rating compatibility. No new timing campaign was run for this close-out.

## Research records, not deployed application code

This branch also carries `tools/ig-proto/`, `tasks/improve-generating-v4/`,
`tasks/improve-generating-stages-2-4/`, and the improve-generating analysis/evidence records. The apps do not
load the research harness and the Pages artifact does not include it.

The frozen round is complete. Its result remains:
`Phase 0: FAIL (control 26x26-nightmare: fail)`.
D-S24-35 scopes the later phase-2 proposal: today's search on 26x26 Nightmare, with `gen-v4` proposed for the
other boards and its own required production, replay and `require` validation. Phase 1 does not reclassify
the failure or qualify phase 2's changed runtime.

## Known before any merge

The developer guides (EN and VI) do not yet name `tools/ig-proto/`, which this branch adds; a later
documentation task adds the line before any merge (`AGENTS.md`). This is N-P1-DOC and is not silently
fixed by documentation on another branch.

Neither this PR nor the later phase-2 PR is merged under the current instruction. The phase-2 PR targets
`main` and initially includes the unmerged phase-1 prefix; it must disclose that dependency and show its
phase-2-only range from the recorded fork point.
