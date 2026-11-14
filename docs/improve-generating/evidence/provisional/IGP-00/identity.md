# IGP-00 identity of the arms against MP12b1

> **Provisional (pre-freeze).** Measured on rating-v3 runtime cd5d17f (worktree 0e1283e) (source digest 34cea386…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-00.json -Label frozen -SourceLabel <label> -LockHelper <path>.

R00: holds. 4 of 4 seeds reached puzzle identity by digest or key prefix; 0 only metric-prefix agreement (puzzle identity not established).

## Per seed

| Seed | Source | Accepted | T1 s | T10 s | Response s | Set |
|---|---|---:|---:|---:|---:|---|
| landscape/26x26-nightmare/0 | mp12b1 | 10 | 0.84 | 8.17 | 8.31 | K 31, attempt 0 |
| landscape/26x26-nightmare/0 | base | 10 | 0.91 | 8.39 | 8.53 | K 31, attempt 0 |
| landscape/26x26-nightmare/0 | log | 10 | 0.92 | 8.68 | 8.84 | K 31, attempt 0 |
| landscape/26x26-nightmare/1 | mp12b1 | 10 | 5.82 | 27.25 | 27.37 | K 30, attempt 0 |
| landscape/26x26-nightmare/1 | base | 10 | 5.75 | 27.86 | 28.02 | K 30, attempt 0 |
| landscape/26x26-nightmare/1 | log | 10 | 5.73 | 27.90 | 28.03 | K 30, attempt 0 |
| landscape/14x14-master/0 | mp12b1 | 10 | 4.38 | 11.02 | 11.18 | K 19, attempt 0 |
| landscape/14x14-master/0 | base | 10 | 4.30 | 11.06 | 11.22 | K 19, attempt 0 |
| landscape/14x14-master/0 | log | 10 | 4.33 | 11.16 | 11.31 | K 19, attempt 0 |
| landscape/14x14-master/1 | mp12b1 | 10 | 0.30 | 3.00 | 3.12 | K 17, attempt 0 |
| landscape/14x14-master/1 | base | 10 | 0.27 | 2.91 | 3.05 | K 17, attempt 0 |
| landscape/14x14-master/1 | log | 10 | 0.32 | 3.12 | 3.24 | K 17, attempt 0 |

## Level reached per pair

| Seed | Pair | Level | Accepted | Digest equal | Key prefix equal | Metric prefix | Note |
|---|---|---|---|---|---|---:|---|
| landscape/26x26-nightmare/0 | mp12b1~base | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/0 | mp12b1~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/0 | base~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/1 | mp12b1~base | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/1 | mp12b1~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/1 | base~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/0 | mp12b1~base | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/0 | mp12b1~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/0 | base~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/1 | mp12b1~base | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/1 | mp12b1~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/1 | base~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

## Time ratios

| Seed | base / MP12b1 | log / MP12b1 | log / base |
|---|---:|---:|---:|
| landscape/26x26-nightmare/0 | 1.026 | 1.064 | 1.037 |
| landscape/26x26-nightmare/1 | 1.024 | 1.024 | 1.000 |
| landscape/14x14-master/0 | 1.004 | 1.012 | 1.008 |
| landscape/14x14-master/1 | 0.977 | 1.038 | 1.063 |
| median | 1.014 | 1.031 | 1.022 |

Cost of one journal append (self-test): 0.307 ms.

## Trees

| Arm | treeId | copyDigest |
|---|---|---|
| base | 13528b906a29… | 34cea38645e0… |
| log | 22b94e65a037… | 727938655308… |

## Journal of the log arm

| Row | Calls | Unfinished | Stages | Phases | Row line seed |
|---|---:|---:|---|---|---|
| 14x14-master~0 | 18 | 5 | batch, set | beam, p1 | landscape/14x14-master/0 |
| 14x14-master~1 | 23 | 5 | batch, set | beam, p1 | landscape/14x14-master/1 |
| 26x26-nightmare~0 | 17 | 5 | batch, set | beam, p1 | landscape/26x26-nightmare/0 |
| 26x26-nightmare~1 | 30 | 4 | batch, set | beam, p1 | landscape/26x26-nightmare/1 |
