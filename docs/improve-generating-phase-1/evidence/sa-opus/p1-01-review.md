# P1-01 adoption record: review checks (SA-Opus)

Command: `node docs\improve-generating-phase-1\evidence\sa-opus\p1-01-review.mjs` (unlocked; scratch removed).

| Check | Result | Detail |
|---|---|---|
| commits and digest | pass | inspected fce2f36f1fa171c0ab718f68e8200ab619aefa1d (HEAD fce2f36f1fa171c0ab718f68e8200ab619aefa1d); digest a51e8196fd16… of 40 files |
| bridges | pass | frozen=main; measured=inspected; main to inspected core/engine/clues.js, core/engine/difficulty.js, core/engine/types.js |
| four publications and their Markdown indexed | pass | 4 JSON + 4 Markdown publications, compare.json, ledger.jsonl |
| counts and identity | pass | 70 rows; 35/35 equal, 0 differ/incomplete; 10x10 4/5 and 4/5 ten; its 9/9 pair (rep 2) equal |
| memory | pass | process 589246464/1610612736; accounted 242014758/1254096896; 14 side-cells pass |
| ledger and limitations | pass | 2244.925 of 2700 counted s, 4 invocations; 4 T14 limitations kept |
| nine-file closure | pass | deduce.js, policy.js, tiling.js, levels.js, qualification.js, dlx.js, geometry.js, placements.js, workspace.js; P7 713/713 context |
| fixtures and versions | pass | generation-case.json, generated-sample-pack.json, replay-case.json; gen-v3 / mixed-v3 / xoshiro128ss-v1 / difficulty-v3 / 1.0.0 |
| historical, current, reader, commands | pass | reader indexed at 9130200bae63…; 14 read-only Git commands; historical and current statements present |
| input index re-hashed | pass | 58/58 raw and LF hashes and sizes match; inputIndexHash consistent |
| Markdown statements | pass | inspected commit, memory, 10x10, ledger, browser limit, P7 context and input-index hash stated |
| independent re-run at the same HEAD | pass | exit 0; record equal apart from the copy's own path: true; Markdown equal apart from the index-hash line: true |
