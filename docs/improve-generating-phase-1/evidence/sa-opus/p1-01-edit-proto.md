# P1-01 edit list: scratch application (SA-Opus)

Command: `node docs\improve-generating-phase-1\evidence\sa-opus\p1-01-edit-proto.mjs` (unlocked; scratch copy in the
git-ignored tests/artifacts/p1r/, removed afterwards; the historical phase1-audit.mjs is only read).

- Edits applied: 26 anchored replacements plus two deleted analysis blocks; edited copy 218 lines, SHA-256 of its CRLF bytes `cfd0b9639f36293cf97e898a9d10d5f80ef58c62ba65e4c44a6595e379453137` (location-independent: SELF is computed at run time).
- First run: exit 0; stdout `phase1-adoption: recorded eca0f94717a56de43c52f6cb54d739360670fef8 (70 rows, 35 equal pairs, 14 memory side-cells)`.
- Record: format pentomino-phase1-adoption, inspected eca0f94717a56de43c52f6cb54d739360670fef8, versions gen-v3/mixed-v3/xoshiro128ss-v1/difficulty-v3/1.0.0, bridges main-to-inspected core/engine/clues.js, core/engine/difficulty.js, core/engine/types.js, closure 9 files, rows 70, equal pairs 35/35, memory side-cells 14 (both checks pass: true), inputs 58.
- Second run (write-once): exit 1; Error: adoption output exists; the record is written once; outputs unchanged: true.
