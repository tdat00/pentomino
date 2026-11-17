# Kernel probe: the `fewestColumn` profile (V4-T10b)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T10b.json -Label frozen -SourceLabel <label> -LockHelper <path>.

profile: complete

## The `fewestColumn` profile

reduced-inlining profile, diagnostic only (plan P7)

Each case ran in a child process started with `--cpu-prof --no-turbo-inlining` and rated the six window subsets of its first carved set in the `instr` tree with `rate()` (an incomplete rating counts as a rating); the rating code is not changed. A node's self time is the sum of the sample deltas that name it; `totalMs` sums every node, `deduceMs` the nodes of `core/engine/deduce.js`, `fewestColumnMs` the nodes named `fewestColumn`, and `share` is `fewestColumnMs / deduceMs`. `ratings` and `ms` are the child's own report and `itemMs` the parent's time of the item.

| case | status | ratings | ms | itemMs | file | sha256 | totalMs | deduceMs | fewestColumnMs | share |
|---|---|---|---|---|---|---|---|---|---|---|
| 14x14-nightmare | completed | 6 | 10511.137 | 10905 | tests/artifacts/ig-proto/frozen/V4-T10b/profile/out/14x14-nightmare/CPU.20261117.181357.3272.0.001.cpuprofile | cda4a3681fdcee09 | 10802.173 | 10209.85 | 4.934 | 0.0005 |
| 26x26-nightmare | completed | 6 | 3515.399 | 3929 | tests/artifacts/ig-proto/frozen/V4-T10b/profile/out/26x26-nightmare/CPU.20261117.181408.24844.0.001.cpuprofile | cc4c725627e327c5 | 3827.95 | 2374.449 | 0 | 0 |
