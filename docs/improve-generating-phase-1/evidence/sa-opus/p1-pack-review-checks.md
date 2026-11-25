# Phase-1 task-pack review checks (SA-Opus)

Command: `node docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review-checks.mjs` (unlocked; reads only).

HEAD eca0f94717a56de43c52f6cb54d739360670fef8; plan eca0f94717a56de43c52f6cb54d739360670fef8.

| Check | Result | Detail |
|---|---|---|
| compareReports deep-equals compare.json | pass | 4 reports |
| renderMarkdown equals compare.md (LF) | pass | rendered 19334 chars, stored 19334 |
| provenanceVersions + APP_VERSION tuple | pass | {"algo":"gen-v3","policy":"mixed-v3","rng":"xoshiro128ss-v1","model":"difficulty-v3","app":"1.0.0"} |
| generation-case.json versions | pass | {"algo":"gen-v3","policy":"mixed-v3","rng":"xoshiro128ss-v1","model":"difficulty-v3"} |
| replay-case.json versions | pass | {"algo":"gen-v3","policy":"mixed-v3","rng":"xoshiro128ss-v1","model":"difficulty-v3"} |
| computeSourceDigest at the worktree | pass | a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4 |
| the P1-03b digest one-liner | pass | exit 0; a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4 |
| deduction closure is the nine files, equal to FROZEN | pass | deduce.js, policy.js, tiling.js, levels.js, qualification.js, dlx.js, geometry.js, placements.js, workspace.js |
| p7.json tracked and equal to the plan blob | pass | equal 713/713 |
| p7.json meta.inputs tracked | FAIL | 12 inputs; untracked: tests/artifacts/ig-proto/frozen/V4-P7E-p7-c1-full/equal/experiment.json, tests/artifacts/ig-proto/frozen/V4-P7E-p7-c1-full/equal/items.jsonl, tests/artifacts/ig-proto/frozen/V4-P7E-p7-c1-full/equal/state.json, tests/artifacts/ig-proto/frozen/IGP-02/main/10x10-nightmare/calls.json, tests/artifacts/ig-proto/frozen/IGP-02/main/12x12-nightmare/calls.json, tests/artifacts/ig-proto/frozen/IGP-02/main/14x14-nightmare/calls.json, tests/artifacts/ig-proto/frozen/IGP-02/main/15x15b10-nightmare/calls.json, tests/artifacts/ig-proto/frozen/IGP-02/main/26x26-hell-1/calls.json, tests/artifacts/ig-proto/frozen/IGP-02/main/26x26-master/calls.json, tests/artifacts/ig-proto/frozen/IGP-02/main/26x26-nightmare/calls.json |
| planned edit of tests/generate.test.js | pass | numstat 2 2; hunks `@@ -808 +808 @@ describe('deterministic parallel simulation', () => {`, `@@ -821 +821 @@ describe('deterministic parallel simulation', () => {` |
| planned edit of docs/design-detail.md | pass | numstat 1 1; hunks `@@ -3076 +3076 @@ jobs:` |
