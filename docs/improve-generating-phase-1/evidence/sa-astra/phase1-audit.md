# Phase-1 source and evidence audit (SA-Astra)

Base: `006ca68`; current measured-source digest `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4` (40 files), equal to T14's new source.
Only the three P6 production files differ from the frozen source. Production, tracked tests and fixture bytes are unchanged from the measured P6 commit.
The fixture-check tool has one later change: LF/CRLF-normalized comparison. No fixture or recipe was changed.

## Existing benchmark, recomputed from its four bound publications

| Cell | Equal pairs | Reached ten: old / new | Paired response ratio old/new (median) | Paired T10 ratio (median; n) |
|---|---:|---|---:|---|
| 14x14-master | 5/5 | 5/5 / 5/5 | 1.14669 | 1.15883; 5 |
| 26x26-master | 5/5 | 5/5 / 5/5 | 1.20652 | 1.20429; 5 |
| 26x26-expert | 5/5 | 5/5 / 5/5 | 1.14279 | 1.13916; 5 |
| 26x26-nightmare | 5/5 | 5/5 / 5/5 | 1.32283 | 1.32209; 5 |
| 10x10-nightmare | 5/5 | 4/5 / 4/5 | 0.99951 | 1.01588; 4 |
| 12x12-nightmare | 5/5 | 5/5 / 5/5 | 1.02356 | 1.02333; 5 |
| 18x18-nightmare | 5/5 | 5/5 / 5/5 | 1.13278 | 1.13269; 5 |

Whole-process peak 561.949 MiB / 1536.000; accounted peak 230.803 MiB / 1196.000.
14 side-cells pass both memory checks; model-too-large checks also pass. 70 rows, 35/35 equal pairs.
Historical ledger: 2244.925 counted s / 2700; four successful invocations, not a new allowance.
These five-seed Node figures are descriptive, not browser qualification or a first-visible-puzzle service level.

## Deduction and compatibility

9 runtime dependency files of measureDeduction are byte-identical after LF normalization to frozen 3fc65f4 and the historical P7 reference.
The historical full equality report is complete: 713/713 items, including the PM4 inputs and 16 memory observations. All 12 bound observation/corpus inputs still hash correctly.
Historical P7 equality is reference-kernel corpus evidence, not a fresh P6 lean/full-rating run. The unchanged runtime closure supports adoption only; no P7 candidate is proposed for production.
- `tests/fixtures/generation-case.json`: unchanged from the frozen source; LF SHA-256 `df7e1e06d1cb6f290a56994faebd3bfe3f0c1cdec1cd6587f6e34f558d3e357f`.
- `tests/fixtures/generated-sample-pack.json`: unchanged from the frozen source; LF SHA-256 `872f386d780a7882f27b619357ec34b5239730e55c0b9696187a1b336a200614`.
- `tests/fixtures/replay-case.json`: unchanged from the frozen source; LF SHA-256 `fa701844b2c8b7135757509bc24b2c29c3474098a265262de4237c0fba7068a3`.

## Reproduction and limitations

```
node docs\improve-generating-phase-1\evidence\sa-astra\phase1-audit.mjs
```

Unlocked source/evidence reads, hashes and pure statistics only. No rating, solving, generation, replay, tree build, npm test, fixture regeneration, browser run or measured request. New counted benchmark cost: 0.
Input index: 110 paths; SHA-256 `b83940b86106593228381cc829bb4da139c7cf0f3107a0bdf76373d5f2a9cbda`; complete hashes and read-only Git commands in `phase1-audit.json`.
