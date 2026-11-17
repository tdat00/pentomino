# V4-T04 identity of the arms against MP12b1

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T04.json -Label frozen -SourceLabel <label> -LockHelper <path>.

R00: holds. 0 of 4 seeds reached puzzle identity by digest or key prefix; 0 only metric-prefix agreement (puzzle identity not established). 4 on a source other than MP12b1's (4 same result, 0 other result); 0 without an MP12b1 run.

## Per seed

| Seed | Source | Accepted | T1 s | T10 s | Response s | Set |
|---|---|---:|---:|---:|---:|---|
| landscape/26x26-nightmare/0 | mp12b1 | 10 | 0.84 | 8.17 | 8.31 | K 31, attempt 0 |
| landscape/26x26-nightmare/0 | base | 10 | 1.06 | 8.72 | 8.85 | K 31, attempt 0 |
| landscape/26x26-nightmare/0 | log | 10 | 1.04 | 8.77 | 8.92 | K 31, attempt 0 |
| landscape/26x26-nightmare/1 | mp12b1 | 10 | 5.82 | 27.25 | 27.37 | K 30, attempt 0 |
| landscape/26x26-nightmare/1 | base | 10 | 5.91 | 28.23 | 28.39 | K 30, attempt 0 |
| landscape/26x26-nightmare/1 | log | 10 | 6.03 | 28.62 | 28.79 | K 30, attempt 0 |
| landscape/14x14-master/0 | mp12b1 | 10 | 4.38 | 11.02 | 11.18 | K 19, attempt 0 |
| landscape/14x14-master/0 | base | 10 | 4.37 | 11.14 | 11.29 | K 19, attempt 0 |
| landscape/14x14-master/0 | log | 10 | 4.37 | 11.29 | 11.42 | K 19, attempt 0 |
| landscape/14x14-master/1 | mp12b1 | 10 | 0.30 | 3.00 | 3.12 | K 17, attempt 0 |
| landscape/14x14-master/1 | base | 10 | 0.35 | 3.01 | 3.16 | K 17, attempt 0 |
| landscape/14x14-master/1 | log | 10 | 0.34 | 3.09 | 3.22 | K 17, attempt 0 |

## Level reached per pair

| Seed | Pair | Level | Accepted | Digest equal | Key prefix equal | Metric prefix | Note |
|---|---|---|---|---|---|---:|---|
| landscape/26x26-nightmare/0 | mp12b1~base | different source, same result | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/0 | mp12b1~log | different source, same result | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/0 | base~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/1 | mp12b1~base | different source, same result | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/1 | mp12b1~log | different source, same result | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/26x26-nightmare/1 | base~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/0 | mp12b1~base | different source, same result | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/0 | mp12b1~log | different source, same result | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/0 | base~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/1 | mp12b1~base | different source, same result | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/1 | mp12b1~log | different source, same result | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |
| landscape/14x14-master/1 | base~log | puzzle-identity | 10 / 10 | true | null | 10 | puzzle identity (resultDigest equal at equal accepted counts, 10) |

## Time ratios

| Seed | base / MP12b1 | log / MP12b1 | log / base |
|---|---:|---:|---:|
| landscape/26x26-nightmare/0 | 1.065 | 1.073 | 1.008 |
| landscape/26x26-nightmare/1 | 1.037 | 1.052 | 1.014 |
| landscape/14x14-master/0 | 1.010 | 1.022 | 1.012 |
| landscape/14x14-master/1 | 1.010 | 1.032 | 1.022 |
| median | 1.024 | 1.042 | 1.013 |

Cost of one journal append (self-test): 0.396 ms.

## Trees

| Arm | treeId | copyDigest |
|---|---|---|
| base | 963c625a51af… | e181df2cc2e7… |
| log | 0928ea0597dd… | e3386c3532fa… |

## Journal of the log arm

| Row | Calls | Unfinished | Stages | Phases | Row line seed |
|---|---:|---:|---|---|---|
| 14x14-master~0 | 18 | 5 | batch, set | beam, p1 | landscape/14x14-master/0 |
| 14x14-master~1 | 23 | 5 | batch, set | beam, p1 | landscape/14x14-master/1 |
| 26x26-nightmare~0 | 17 | 5 | batch, set | beam, p1 | landscape/26x26-nightmare/0 |
| 26x26-nightmare~1 | 30 | 4 | batch, set | beam, p1 | landscape/26x26-nightmare/1 |
