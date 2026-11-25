# P2-15: fixture diff

Recorded with `tools\record-fixtures.mjs --replace --reason "gen-v4 cutover (improve-generating phase 2, D-P2-06): versions only"`, locked (`IG P2-15 replace exit=0 seconds=0.607`). Every changed JSON path, from the files at the base to the re-recorded files:

## tests/fixtures/generation-case.json (3 paths)

| JSON path | Before | After |
|---|---|---|
| `$.versions.algo` | `"gen-v3"` | `"gen-v4"` |
| `$.versions.priorTable` | absent | `"prior-s3-v1"` |
| `$.versions.screenTable` | absent | `"screen-v4-v1"` |

## tests/fixtures/generated-sample-pack.json (1 path)

| JSON path | Before | After |
|---|---|---|
| `$.generation.algo` | `"gen-v3"` | `"gen-v4"` |

Only version paths changed: no other path of either file.

## New files

- `replay-case-v4.json`: seed `replay-case-0`, subset skip no (as `replay-case.json`, seed `replay-case-0`). The Hard search ended at seed 49 with `no seed with a subset skip` (`search-hard.log`); the pack author ruled (P2-15 question 1, 2026-11-26) to record `replay-case-0` with the qualifier unchanged: `--replay-case --create --seed 0 --recipe hard`.
- `replay-case-v4-screen.json`: seed `replay-case-screen-0`, screen steps yes (`search-screen.log`): `--replay-case --create --seed 0 --recipe screen`.
- `replay-case.json` is unchanged, byte for byte (G-PROTECTED).

## Checks after the recordings

| Command | Result |
|---|---|
| `--check` | `record-fixtures: OK` |
| `--replay-case --check --recipe hard` | `record-fixtures: replay case OK` |
| `--replay-case --check --recipe screen` | `record-fixtures: replay case OK` |
| `--replay-case --refusal` | `record-fixtures: refusal case OK` |
