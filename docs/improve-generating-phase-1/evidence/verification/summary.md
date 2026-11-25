# Phase-1 qualification

Qualified commit `02edc6a48662fd81d38d86044881de20a5d8f4ff`; runtime digest `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4`; attempt `P1-03b-20261125T042920136Z`.

| Gate | Node | Result | Node seconds | Log |
|---|---|---|---:|---|
| Focused width-8 test (P1-02) | v26.13.0 | pass 2, fail 0, cancelled 0; both width-8 fold cases ok | 18.964 | `docs/improve-generating-phase-1/evidence/fold-width8/run.log` |
| P1-03b full-node26 | v26.13.0 | 1514 of 1514 pass; 128 suites; 0 fail, cancelled, skipped, todo; both width-8 fold cases ok | 122.063 | `docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/full-node26.log` |
| P1-03b fixtures | v26.13.0 | record-fixtures: OK | 0.673 | `docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/fixtures.log` |
| P1-03b replay-case | v26.13.0 | record-fixtures: replay case OK | 1.306 | `docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/replay-case.log` |
| P1-03b full-node22 | v22.23.5 | 1514 of 1514 pass; 128 suites; 0 fail, cancelled, skipped, todo; both width-8 fold cases ok | 141.735 | `docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/full-node22.log` |
| `npm run check` | v26.13.0 | check-conventions: OK; check-site: OK | - | `docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/conventions.log` |
| Static site | v26.13.0 | stamped `02edc6a4`; check-site: OK; 120 files, equal to the tracked site files | - | `docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/site.log` |

Five locked invocations: 509.741 node+quiet seconds (ceiling 1,725).

Node 22 verification ran on Windows, not Ubuntu CI. The static-site check is not a browser run or deployment.
Node plus quiet seconds exclude lock waits; this is verification, not a benchmark.
