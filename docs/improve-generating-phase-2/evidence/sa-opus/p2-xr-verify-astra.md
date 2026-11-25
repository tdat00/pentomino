# Independent check of SA-Astra's enumerated price (SA-Opus)

Command: `node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-verify-astra.mjs` (read-only; her script is not run).
Input: `docs/improve-generating-phase-2/evidence/sa-astra/round1-cross-audit.json` (`rows`, `stages`, `items`) and the published
frozen rows each planned row names as its source.

## 1. Per-row seconds: 1013 rows checked, 0 differ by more than 1e-6 s

Bases used: mean + 2 948; row limit 55; twin: matching row + 2 10.

## 2. Stage schedules replayed in her execution order (the keys of her `stages.<S>.schedule`)

| Stage | Rows (scheduled) | Invocations (mine / hers) | Counted min (mine / hers) | Guard min (mine / hers) |
|---|---:|---:|---:|---:|
| A | 318 (318) | 23 / 23 | 330.656 / 330.656 | 409.195 / 409.195 |
| B | 695 (695) | 26 / 26 | 321.258 / 321.258 | 401.572 / 401.572 |
| Total | 1013 | | 651.913 | 810.767 |

Grant by stage, rounded up: 410 + 402 = 812 counted minutes.
Packing the same rows in the order of her `rows` array (grouped by component, arms not interleaved) needs 22 and 26 invocations: the order moves at most one 47-s invocation.
