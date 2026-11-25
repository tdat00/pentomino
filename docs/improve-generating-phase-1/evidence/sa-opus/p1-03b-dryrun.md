# P1-03b proposed blocks: dry run (SA-Opus)

Command: `Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-03b-dryrun.ps1`
(no lock, no test run). Inputs: the round-1 logs p1-full-node26/node22, p1-fixtures, p1-replay-case (fold names
renamed in the copies, line endings turned to LF as p1-run.mjs writes them), helper lines from p1-verify.log,
synthetic P1-02 focused logs (40.5 s). Real: preflight, digest, npm run check, static site, records.
Generated files, G-FORMAT one-liner: format: OK (15 files) (exit 0).

## Shared block and G-STAGE

- .NET current directory before the shared block: Q:\git.
- G-STAGE hit checks on the edited copies: pass (808; none; 821; 420; 3076; none).
  - at the base worktree: 'pool sizes 1-4 and 8 with shuffled completion orders agree o...' in tests\generate.test.js at [], fold8 expects [808]
  - at the base worktree: 'pool sizes 1-4 and shuffled completion orders...' in tests\generate.test.js at [808], fold8 expects []
  - at the base worktree: 'for (const width of [1, 2, 3, 4, 8]) {...' in tests\generate.test.js at [], fold8 expects [821]
  - at the base worktree: 'for (const width of [1, 2, 3, 4]) {...' in tests\generate.test.js at [420,821], fold8 expects [420]
  - at the base worktree: 'Fold determinism: identical output for simulated pool widths...' in docs\design-detail.md at [], fold8 expects [3076]
  - at the base worktree: 'pool sizes 1 and 4 and shuffled completion orders (simulated...' in docs\design-detail.md at [3076], fold8 expects []
- P1-02 step 6 check on the synthetic focused logs: 40.5 s.

## summary.md produced

# Phase-1 qualification

Qualified commit `eca0f94717a56de43c52f6cb54d739360670fef8`; runtime digest `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4`; attempt `P1-03b-20261125T025642932Z`.

| Gate | Node | Result | Node seconds | Log |
|---|---|---|---:|---|
| Focused width-8 test (P1-02) | v26.13.0 | pass 2, fail 0, cancelled 0; both width-8 fold cases ok | 40.5 | `tests/artifacts/improve-generating-phase-1/review-dryrun/fold-width8/run.log` |
| P1-03b full-node26 | v26.13.0 | 1514 of 1514 pass; 128 suites; 0 fail, cancelled, skipped, todo; both width-8 fold cases ok | 119.73 | `tests/artifacts/improve-generating-phase-1/review-dryrun/verification/P1-03b-20261125T025642932Z/full-node26.log` |
| P1-03b fixtures | v26.13.0 | record-fixtures: OK | 0.665 | `tests/artifacts/improve-generating-phase-1/review-dryrun/verification/P1-03b-20261125T025642932Z/fixtures.log` |
| P1-03b replay-case | v26.13.0 | record-fixtures: replay case OK | 1.243 | `tests/artifacts/improve-generating-phase-1/review-dryrun/verification/P1-03b-20261125T025642932Z/replay-case.log` |
| P1-03b full-node22 | v22.23.5 | 1514 of 1514 pass; 128 suites; 0 fail, cancelled, skipped, todo; both width-8 fold cases ok | 144.391 | `tests/artifacts/improve-generating-phase-1/review-dryrun/verification/P1-03b-20261125T025642932Z/full-node22.log` |
| `npm run check` | v26.13.0 | check-conventions: OK; check-site: OK | - | `tests/artifacts/improve-generating-phase-1/review-dryrun/verification/P1-03b-20261125T025642932Z/conventions.log` |
| Static site | v26.13.0 | stamped `eca0f947`; check-site: OK; 120 files, equal to the tracked site files | - | `tests/artifacts/improve-generating-phase-1/review-dryrun/verification/P1-03b-20261125T025642932Z/site.log` |

Five locked invocations: 531.529 node+quiet seconds (ceiling 1,725).

Node 22 verification ran on Windows, not Ubuntu CI. The static-site check is not a browser run or deployment.
Node plus quiet seconds exclude lock waits; this is verification, not a benchmark.

## index.json keys and evidence

Keys: format, version, status, planCommit, qualifiedCommit, attempt, runtimeDigest, node, testedPaths, focused, gates, site, nodePlusQuietSeconds, evidence, limitations.
Evidence files: conventions.log, fixtures.helper.log, fixtures.log, full-node22.helper.log, full-node22.log, full-node26.helper.log, full-node26.log, replay-case.helper.log, replay-case.log, site.log, tested-files.txt.
Tested files listed: 452.

## Negative probes of Test-GateLog

- one failing test: rejected (QUESTION: tests\artifacts\improve-generating-phase-1\review-dryrun\probe\x.log lacks exactly one '# fail 0')
- old fold-case names: rejected (QUESTION: tests\artifacts\improve-generating-phase-1\review-dryrun\probe\x.log lacks exactly one match of ^\s*ok \d+ - pool sizes 1-4 and 8 with shuffled completion orders agree on fixture-set-0$)
- skipped slow case: rejected (QUESTION: tests\artifacts\improve-generating-phase-1\review-dryrun\probe\x.log lacks exactly one '# skipped 0')
- child exit 1: rejected (QUESTION: tests\artifacts\improve-generating-phase-1\review-dryrun\probe\x.log lacks exactly one 'p1-run: exit 0')
- helper quiet 15: rejected (QUESTION: tests\artifacts\improve-generating-phase-1\review-dryrun\probe\h.log lacks exactly one 'IG P1-03b full-node26 exit=0 ... quiet=45' line)
- helper exit 1: rejected (QUESTION: tests\artifacts\improve-generating-phase-1\review-dryrun\probe\h.log lacks exactly one 'IG P1-03b full-node26 exit=0 ... quiet=45' line)
- helper 301 s: rejected (QUESTION: P1-03b full-node26 took 301 s)
- helper of another task: rejected (QUESTION: tests\artifacts\improve-generating-phase-1\review-dryrun\probe\h.log lacks exactly one 'IG P1-03b full-node26 exit=0 ... quiet=45' line)
- Node 22 log checked as Node 26: rejected (QUESTION: tests\artifacts\improve-generating-phase-1\review-dryrun\verification\P1-03b-20261125T025642932Z\full-node22.log did not run on Node 26)
