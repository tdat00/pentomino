# Phase-1 task pack, review 2: literal-block dry run (SA-Opus)

Command: `Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review2-dryrun.ps1`
(no lock, no test runner, no commit, push or PR edit; scratch removed).

- .NET current directory at start: Q:\git.
- Literal blocks: check-list 6, P1-03b 5, P1-05 6.
- Shared block: location Q:\git\pentomino; .NET directory Q:\git\pentomino.
- G-WORKTREE accepts the 28 current untracked paths when all are allowed.
- G-WORKTREE with one current path not allowed: rejected (QUESTION: G-WORKTREE: ?? docs/improve-generating-phase-1/evidence/sa-astra/pack-contract-checks.json)
- P1-03b block A: pass. Q eca0f94717a56de43c52f6cb54d739360670fef8; Node v26.13.0 and v22.23.5; digest a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4; focused 40.5 s on v26.13.0; attempt folder created: True.
- P1-03b block A with a different adoption digest: rejected (QUESTION: the adoption digest differs)
- P1-03b block A with a focused helper line at quiet 15: rejected (QUESTION: tests\artifacts\improve-generating-phase-1\review2-dryrun\fold-width8\helper.log lacks exactly one valid 'IG P1-02 fold8 exit=0 ... quiet=45' line)
- P1-03b step 3 lists: 5 allowed paths, the last tests/artifacts/improve-generating-phase-1/review2-dryrun/verification/P1-03b-20261125T035553570Z/example.log; 5 format paths.
- P1-05 step 1: pass. Remote main b5eb85805f609af7deaa2489eb08675c60b2cc49; remote head 826ce79dcc4a77daaaea00894a6dcea46bcbd8b7; PR #11 OPEN, mergedAt null, improve-generating -> main; HEAD descends from 826ce79; no out-of-scope commit since eca0f94.
- P1-05 G-WORKTREE today (review files still untracked): rejected (QUESTION: G-WORKTREE: ?? docs/improve-generating-phase-1/evidence/sa-astra/pack-contract-checks.json)
- P1-05 step 5 (stand-ins): pass. Printed: `published 826ce79dcc4a77daaaea00894a6dcea46bcbd8b7; PR #11 OPEN, unmerged, improve-generating -> main; normalized body SHA-256 ba6f96d29a30e87768f76010e9a0947ca8817f25805ad4404935862766f68bb3`; pr-after.json written: True.
- P1-05 step 5 with a body that differs from the PR: rejected (QUESTION: the published head or description differs)
