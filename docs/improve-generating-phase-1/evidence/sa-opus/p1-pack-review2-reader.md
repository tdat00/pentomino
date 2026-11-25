# Phase-1 task pack, review 2: P1-01 reader checks (SA-Opus)

Command: `node docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review2-reader.mjs` (unlocked; scratch removed).

| Check | Result | Detail |
|---|---|---|
| prototype line ranges | pass | EDITS 22-124; deletions 135-142; final line 143-144; line 145 starts the leftover check and 146-163 are the scratch runner (P1-01 cites "22-144" for EDITS and "146-163" for the deletions/final line) |
| review-1 edited reader | pass | 218 lines; SHA-256 cfd0b9639f36293cf97e898a9d10d5f80ef58c62ba65e4c44a6595e379453137 |
| P1-01 writer replacement anchor | pass | exactly one occurrence |
| P1-01 adapted reader | pass | 218 lines; SHA-256 9130200bae6301c1a6f7da2f75edcf919377a93379bcacbcb4dc67c10c3c6ecc |
| first run from Q:\git (relative writes) | pass | exit 0; `phase1-adoption: recorded eca0f94717a56de43c52f6cb54d739360670fef8 (70 rows, 35 equal pairs, 14 memory side-cells)` |
| second run from the repository (write-once) | pass | exit 1; outputs unchanged: true |
| fields read by P1-03b and P1-04 | pass | format pentomino-phase1-adoption; source.currentDigest; bench.cells x7 with cell/oldTen/newTen/equal/pairs/response.median; bridges |
| memory figures in P1-01 step 5 | pass | process 589246464 of 1610612736; accounted 242014758 of 1254096896; side-cells 14; both pass true |
| 10x10 and totals | pass | 10x10 4/5 and 4/5; rows 70; equal 35/35 |
| strict G-FORMAT on the reader and both outputs | pass | exit 0; format: OK (3 files) |
