# MP06c — Initial fit of the v3 knobs and the RES-35 counts

| Header | Value |
|---|---|
| ID | MP06c |
| Depends on | MP06b (accepted and committed, with its Amendment A1: the captured corpus, `manifest.json` and `final.jsonl` under `docs/difficulty-v3/probe-corpus-2026-11-12/`) |
| Estimated size | Small–Medium: about 200–350 changed lines (the record; the fit script under `tests/artifacts/` is not counted); about 40–60 minutes |
| Owner role | Measurement |
| Milestone | M3 — measured fit |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-14 ("Initial fit"), RES-18 (formula, invariants, ranges), RES-25 (criteria), RES-35 ("Measurement"); clarifications JR-P3 (a), PROC-P1 (a); MP06b Amendment A1 and cross-review FP01, FP05 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`); check-list §4.2 D19 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The v3 score adds a base for the number of pieces to place, a term for the hardest deduction needed and a term per
decisive guess, minus a penalty for puzzles with several solutions. The weights of these terms are **knobs**. Before
MP08 writes the production values, this task proposes them from data (PROC-P1 (a): fit before activation): the knob
set, inside the plan author's experimental ranges, under which the v3 levels of today's generated puzzles agree best
with the levels they were generated for, with the levels' medians in order on every board. It also counts how many
Hard-or-above puzzles the proved-guess rule (AR1, RES-35) would refuse. Nothing in the product changes.

## Scope

### In scope

- A fit over the authoritative `final` probe lines of MP06b (no new generation, no rating run).
- New record `docs/difficulty-v3/fit-<date>.md`.

### Out of scope

- Writing `SCORE_V3` (MP08), any code, test, fixture or other document.
- Re-running the probe. If a line is missing a needed field, report it instead.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first. No heavy run: the fit reads files and runs in
  seconds; it must finish well within 10 minutes.
- The fit script and its outputs live in `tests/artifacts/MP06c/` (git-ignored); the record is the only repository
  file written. UTF-8 without BOM, CRLF, final newline, no trailing whitespace, no absolute path.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/` or the reports.

## Inputs & context

### Data

- `docs/difficulty-v3/probe-corpus-2026-11-12/manifest.json` (MP06b, Amendment A1.1): `requests`, one row per
  generation request in canonical order, with `request` (for example `A-6x10-easy-r0`, `B-18x20-hard-s1`,
  `C-26x26-master-s0`), `corpus` (`A`, `B` or `C`), `caseId` (A) or null, `board` (`<cols>x<rows>`), `level` (the
  requested level), `uniqueness`, `seed`, `count`, `exit` (0 complete, 2 partial, 1 no usable result), `accepted`,
  `pack`, `identity` (A: `{ digest, expected, match }`; B and C: null); and `finalDeduce`, the pinned `DEDUCE`.
- `docs/difficulty-v3/probe-corpus-2026-11-12/final.jsonl` (CRLF: split on `/\r?\n/` and drop the empty last
  element): one line per puzzle, in manifest order and then pack order. Each line is `request`, `corpus`, then the
  MP06a probe line under the final tuple: `puzzleId`, `identity`, `v2` (`score`, `level`, `metrics` with `U`),
  `deduction` (`path`; `first` with `G`, `Gproved`, `info`, `Cmax`, `deductionTier`; `count.solutions`; `census`
  with `complete`), `timing`, `modelSize`; or `error` instead of `v2` and `deduction`. The **join key** is
  `(request, puzzleId)`; the requested level, board and identity of a line come from its manifest row.
- Checks before the fit (assert, stop with a message on failure): every manifest request has exactly `accepted`
  lines; every line's `request` is in the manifest; `(request, puzzleId)` is unique.
- **Classification** (MP06b A1.3), before any field is read: `error` (the line has `error`), `complete`
  (`deduction.path === 'complete'`), `capped`, `none`. Only `complete` lines have `deduction.first` and
  `deduction.census`; a missing value is never read as 0. Only `complete` lines enter the fit; the other classes are
  counted per cell and reported (after MP06b's final check there are none in A and B, unless the orchestrator
  accepted a recorded MP06b-B03 failure).
- Requests of A with `identity.match === false` are excluded from the fit and counted in the record; partial requests
  (exit 2) stay with their real puzzle counts; C (26 x 26, cost only) is not used.
- U = `v2.metrics.U` (pieces minus clues); `solutions` = `deduction.count.solutions`. MP06b's other observation runs
  (`old`, `diag`, `base`, the census trials) are not inputs of the fit; the record cites MP06b's record for them.
- `scoreWithKnobs(m, knobs)` exported by `tools/rate-probe.mjs` (MP06a, with
  `m = { U, deductionTier, G, info, solutions }`): the RES-18 formula; `levelForScore` from `core/engine/levels.js`;
  level indices from `level(id).index` (very-easy 0, easy 1, normal 2, hard 3, expert 4, master 5).

### The formula and the bounds (RES-18; JR-P3 (a))

```text
base    = base.max * (1 - exp(-U / base.scale))
rule    = rule[deductionTier]
guess   = weights.G * G + weights.info * info
penalty = solutions === 'few' ? penalty.few : solutions === 'many' ? penalty.many : 0
score   = U === 0 ? 0 : max(0, round(base + rule + guess - penalty))
```

- Invariants (hard): `base.max + max(rule) <= 16`; `rule[0] = rule[1] = 0 <= rule[2] <= rule[3]`;
  `0 <= penalty.few <= penalty.many`; weights >= 0. Then G = 0 never reaches 17 (Hard).
- Experimental ranges (plan author): `base.max` 8-12, `base.scale` 3-12, `weights.G` 0-8, `weights.info` 0.5-6,
  `penalty.many <= 8`. A value outside them needs a new answer from the plan author: do not propose one.
- Starting values: `base { max: 12, scale: 6 }`, `rule [0, 0, 2, 4]`, `weights { G: 6, info: 4 }`,
  `penalty { few: 2, many: 4 }`.

### The fit (check-list D19)

Grid (all combinations that satisfy the invariants):

| Knob | Values |
|---|---|
| `base.max` | 8, 9, 10, 11, 12 |
| `base.scale` | 3, 4, 5, 6, 8, 10, 12 |
| `rule[2]`, `rule[3]` | integers with `0 <= rule[2] <= rule[3] <= 16 - base.max` |
| `weights.G` | 0, 1, 2, 3, 4, 5, 6, 7, 8 |
| `weights.info` | 0.5, 1, 1.5, 2, 3, 4, 5, 6 |
| `(penalty.few, penalty.many)` | (0, 0), (1, 2), (2, 4), (3, 6), (4, 8) |

The grid has 365,400 admissible combinations (145 pairs of `base.max` and `(rule[2], rule[3])`, times 7 scales,
9 values of `weights.G`, 8 of `weights.info` and 5 penalty pairs). Timing (cross-review FP01): the script first
evaluates the first 10,000 sets in table order and prints the measured time and the projection for the whole grid. If
the projection is above 8 minutes, the grid runs as five shards, one per `base.max` value (`fit.mjs --base-max <v>`,
each under 10 minutes, one after the other), and a final `fit.mjs --merge` chooses among the shards' best sets with the
same objective; the record states the timings and the shard plan.

For each knob set and each line: `score`, `v3level = levelForScore(score).id`. A line is a **hit** when `v3level`
equals the requested level and, for a requested level index >= 3, `Gproved >= 1` (a candidate the RES-35 rule would
refuse is not a hit). Per board and level (a **cell**) of corpus A: the hit rate and the median score.

- **Constraint**: on every board of corpus A, the median score strictly increases with the requested level index.
- **Objective**, lexicographic: (1) the mean hit rate over the cells of A; (2) the smallest cell hit rate of A;
  (3) the smallest normalised L1 distance to the starting values (each knob's distance divided by its range width:
  `base.max` 4, `base.scale` 9, `rule[2]` and `rule[3]` 16, `weights.G` 8, `weights.info` 5.5, `penalty.many` 8);
  (4) the lexicographically smallest knob tuple in the table order.
- If no knob set meets the constraint on every board, choose by (0) the fewest violated board orderings, then (1)-(4),
  and report the violations as a finding for MP12 (which may also change `K60` and `SHARES`, RES-25).

### What the record says (`docs/difficulty-v3/fit-<date>.md`)

1. Data: the files and `finalDeduce`; the requests per corpus (exit, accepted, identity match); line counts per cell
   by class (`complete`, `capped`, `none`, `error`); the excluded lines and why.
2. The fit: the grid, the constraint, the objective (as above), the number of knob sets evaluated and admissible.
3. **Proposed knobs**, as a `SCORE_V3` literal ready for MP08, and the five next best sets with their objective values.
4. Per cell of A and of B: count, hit rate (numerator / denominator), median, p10 and p90 of the v3 score under the
   proposed knobs; the median ordering per board (pass or the violation).
5. **Confusion matrix** per board: rows the v2 level (`v2.level` recomputed by the probe), columns the v3 level under
   the proposed knobs, counts.
6. **RES-35 counts**: per level and board, the in-band Hard-or-above puzzles (v3 level index >= 3 and equal to the
   requested level) with `Gproved = 0`, numerator and denominator, next to the census-incomplete share of the cell
   (`deduction.census.complete === false` among the cell's `complete` lines of `final.jsonl`); an empty cohort is
   "unavailable".
7. Worked examples with the proposed knobs: U = 6, binary guesses, one and two guesses, deduction tiers 1-3, unique.
8. Findings for the owner or for MP12, if any.

## Files to create/modify

### Exclusive ownership

- `docs/difficulty-v3/fit-<date>.md` (new).

### Documentation slot

The record only.

## Implementation steps

1. Write the fit script under `tests/artifacts/MP06c/` (it imports `scoreWithKnobs` and `levelForScore`).
2. Load the manifest and `final.jsonl`, run the input checks, classify and exclude as specified, time the prefix,
   evaluate the grid (in shards if the projection says so), choose the knobs.
3. Compute the tables; write the record; normalise it to CRLF; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP06c-B01 | Proposed knobs inside the plan author's ranges, with the hard invariants, so that a puzzle without a real choice can never reach Hard | record §3 |
| MP06c-B02 | On every board the levels' median scores are in order under the proposed knobs, or the violation is reported | record §4 |
| MP06c-B03 | The owner sees how v2 levels map to v3 levels and how many Hard-or-above puzzles the proved-guess rule would refuse | record §5, §6 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP06c-T01 | The grid, constraint, objective and tie-breaks are exactly as specified; the counts of evaluated and admissible sets are recorded | record §2; review of the script |
| MP06c-T02 | Every table gives numerators and denominators; empty cells are "unavailable" | review |
| MP06c-T03 | `npm run test:quick` and `npm run check` pass; the record is CRLF; no other repository file changed | command output |

## Test plan

### Exact commands

```powershell
node tests\artifacts\MP06c\fit.mjs
if ($LASTEXITCODE -ne 0) { throw 'fit failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required checks

| Check | Expected |
|---|---|
| Input checks | every request has exactly `accepted` lines; `(request, puzzleId)` unique; every line's request in the manifest |
| Timing | prefix time, projection and total time printed and recorded; every run under 10 minutes |
| The starting values | evaluated and reported in §3 for comparison |
| The proposed set | satisfies every invariant and range (assert in the script) |
| Reproducibility | two runs of the script choose the same set |

## Definition of done & handoff

- The record exists and every criterion has its evidence; nothing else in the repository changed.
- Handoff to MP08: the proposed `SCORE_V3` literal, the record name, and any finding.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP06c: Initial fit of the v3 knobs and the RES-35 counts`); the penalty finding (fitted penalty (0, 0) against SA1-Q-P1 "the few/many penalty stays") was put to the owner before MP08 |
| Start | 2026-11-12 15:39 (+07:00) |
| End | 2026-11-12 15:54 developer; 16:00 orchestrator review and commit |
| Duration | 14 min developer (869 s); about 6 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 53 model calls; 8,041,219 input tokens (7,813,735 cache reads); 100,056 output tokens |
| AI credits | about 235 (developer) |
| Verification | Developer: scratch `fit.mjs` over the MP06b `final.jsonl` and manifest (input checks pass; 365,400 knob sets evaluated in 12.2 s; a second run gives the same set, digest `1258acd365c0...`; per-`base.max` shards and their merge agree; 3,776 sets re-checked against `scoreWithKnobs` and `levelForScore`); `record.mjs` generates the record; `npm run test:quick` 1,177/1,177; `npm run check` OK. Orchestrator: `npm run check` OK; the record is CRLF, no BOM, no trailing whitespace, no absolute path; no file under `core/` or `tools/` changed |
| Acceptance | MP06c-B01..B03 and MP06c-T01..T03 met. Proposed `SCORE_V3` knobs: `base { max: 12, scale: 3 }`, `rule [0, 0, 2, 2]`, `weights { G: 5, info: 0.5 }`, `penalty { few: 0, many: 0 }`, inside every accepted range with the hard invariants; median score strictly rising with the level on every board of corpus A; mean hit rate 56.5 % over the 18 A cells (starting values 14.8 %); smallest cell 18x20-hard 7/50 |
| Issues & resolutions | (1) Owner question (record finding 2): the fit switches the penalty off (0, 0), allowed by the range `0 <= few <= many <= 8` but against the intent of SA1-Q-P1; the best set with a penalty, `12 / 4 / 4 / 4 / 5 / 0.5 / (1, 2)`, reaches 55.47 % with no hit in 18x20-hard. (2) Four knobs sit on an edge of their range (`base.max` 12, `base.scale` 3, `weights.info` 0.5, penalty (0, 0)); moving one costs at most 1.1 points, all four 11.6 points; MP12 revisits on v3-generated puzzles. (3) The Hard hit rate is capped by the corpus: a line needs `Gproved >= 1`; 12x12-hard and 18x20-hard are at their ceilings (16/50, 7/50). (4) RES-35 counts are 0 in every cell: in this corpus `Gproved = 0` coincides with G = 0, which the formula already keeps below Hard. (5) Corpus B 18x20 (uniqueness required): 0/60 hits, all `Gproved = 0`, and the expert and master medians tie (14); whether a unique Hard puzzle with a decisive guess exists on 18x20 is for MP07 and MP12. (6) Developer decisions accepted: nearest-rank medians (lower middle value); the constraint counted per board; exact integer objective; the distance over the seven listed knobs; B reported, not fitted |
| Handoff | MP08 copies the `SCORE_V3` literal of record section 3 exactly (subject to the owner's answer on the penalty) and cites `docs/difficulty-v3/fit-2026-11-12.md`; MP07, MP09c and MP12 read the record's findings (Normal-to-Hard margin of one point on three boards; `rule[2] = rule[3]`; the Hard ceilings; B 18x20) |
