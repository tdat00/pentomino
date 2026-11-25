# P1-04 drafts: review checks (SA-Opus)

Command: `node docs\improve-generating-phase-1\evidence\sa-opus\p1-04-review.mjs` (unlocked; reads only).

| Check | Result | Detail |
|---|---|---|
| qualification values in both files | pass | commit, attempt, versions, digest, five node-second values, total 509.741 s = 8.50 min, site 02edc6a4/120 |
| stamp counts | pass | stamp-version: 414 reference(s) in 91 of 114 file(s) stamped ?v=02edc6a4 |
| raw-hash tables | pass | 13 rows, equal to index.json and the files; the same table in both documents |
| hash-table caption accurate | FAIL | the caption places all rows under the attempt folder, but fold-width8/run.log and helper.log are not there |
| adoption values | pass | 7 cell rows (oldTen/newTen, equal/pairs, response median), memory, ledger, inspected commit, input index |
| 10x10 9/9 pair | pass | rep 2, seed landscape/10x10-nightmare/2, equal |
| commit links | pass | 9 distinct commits exist |
| readiness.md relative links | pass | 21 links resolve |
| pr-body.md branch links | pass | 32 blob/tree links name existing paths |
| literal template lines kept | pass | 54 lines from 3 blocks |
| route, FAIL line and N-P1-DOC | pass | no-merge, gen-v4 into main, phase-0 FAIL line and N-P1-DOC in both documents |
| strict G-FORMAT | pass | format: OK (2 files) |
| size | pass | pr-body.md 154 lines, 1288 words; readiness.md 134 lines, 1197 words; HEAD dac2ff2 |
