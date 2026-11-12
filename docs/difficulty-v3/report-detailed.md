# difficulty-v3: joint report and implementation spec (Pentomino)

| | |
|---|---|
| Purpose | The corrected specification of `docs/difficulty-v3/plan.md` from which the developer task packs are derived: one resolution per decision or contract, the plan's errata, the agreed task breakdown with its gates, risks and effort, and a traceability table |
| Authors | SA1, claude-opus-5.5 (lead author for this repository) and SA2, gpt-6-astra (checked and co-signed); signatures in §9 |
| Date | 2026-11-12 |
| Code examined | `77e62cb`, branch `rating-v3` (Windows, Node v26.13.0) |
| Status | **JOINT DRAFT — co-signed by SA1 and SA2, pending clarifications (for review by the plan author).** Written before the answers of the plan author (claude-fable-5-2) and the owner to `docs/difficulty-v3/clarifications.md`. Agreed items are final. Items still open there are marked `PENDING <question id>` and every branch is specified, so the task packs can be finalised by picking one |

**Inputs**

| File | Content |
|---|---|
| `docs/difficulty-v3/plan.md` | the plan |
| `docs/difficulty-v3/claude-opus-5.5/1-report.md`, `docs/difficulty-v3/gpt-6-astra/1-report.md` | 1. the independent analyses |
| `docs/difficulty-v3/claude-opus-5.5/2-review-of-gpt-6-astra.md`, `docs/difficulty-v3/gpt-6-astra/2-review-of-claude-opus-5.5.md` | 2. the cross-reviews |
| `docs/difficulty-v3/claude-opus-5.5/3-response-to-review.md`, `docs/difficulty-v3/gpt-6-astra/3-response-to-review.md` | 3. the responses, final positions and merged breakdowns |
| `docs/difficulty-v3/clarifications.md` | every question (parts A-C), the plan corrections (part D) and their status |
| `docs/difficulty-v3/gpt-6-astra/4-check-of-joint-report.md` | 4. SA2's check of the first draft: required changes JC01-JC13 |

**Change log**

| Date and time | Change |
|---|---|
| 2026-11-12 08:48 | First draft by SA1 |
| 2026-11-12 09:45 | Applied SA2's check JC01-JC13 (SA2-4): re-measured prototype numbers (§2.4); separate path, count and census statuses (RES-04, RES-05); quotient by placement multisets (RES-09); first-path rows, a complete metric domain, accounted buffers (RES-04, RES-10, RES-19, RES-21); no quantisation of `info` (RES-18); unbounded band maxima in clue selection (RES-15); the full landscape in GL-P3 and identity checks of regenerated requests (RES-12, RES-14, RES-25); execution-based, bounded skips (RES-27); a recorder detail channel and selection events (RES-19, RES-28); isolated auxiliary requests (RES-29, new question JR-P4); replay work bound and final comparison (RES-29 to RES-31); orchestrator commits, earlier answers and documentation (RES-01, RES-32, §5); the replay button inside the card (RES-31). SA1 notes on JC01 and JC10 explain where the applied text differs from SA2-4 |

**Conventions**

- Repository files are cited by their path from the repository root, with line numbers at `77e62cb`. "plan:n" is
  line n of the plan. SA1-1, SA1-2, SA1-3 are SA1's three files in the order above; SA2-1, SA2-2, SA2-3 are SA2's;
  SA2-4 is SA2's check.
- **Resolutions are numbered RES-01 to RES-33.** The plan already names the deduction rules R1 to R9; they keep
  those names.
- Tasks are MP01 to MP17 and the conditional MP04b (§5); gates are GV2, GF-P1, GA-P1, GF-P2, GA-P2, GC-P2, GL-P3,
  GF-P4, GB-P4 and GZ (§5.3).
- "Must" marks what the implementation and its tests check. **Final**: agreed by both analysts and not open in
  `clarifications.md`. **PENDING `<id>`**: open; the analysts' recommendation is named but not adopted.
- Fixed and not open: the decisions of plan §1.3 (model change `difficulty-v3`; a fully forced puzzle caps at
  Normal; several solutions lower the score and the uniqueness default stays `any`; band edges frozen), the full
  scope P0-P4, and the APPROVAL GATE runs (pre-approved; the task that needs a gate runs it and records the result).
- Notation: U pieces to place; G guesses on the path to the first solution; c alternatives at a guess node; S
  solutions found; K pieces in the set. Bands (`core/engine/levels.js:42-44`): very easy [0, 8), easy [8, 12),
  normal [12, 17), hard [17, 25), expert [25, 37), master [37, 53), nightmare [53, 77), hell-1 [77, 112), and so on.

---

## 0. Summary

1. **The diagnosis reproduces.** Both analysts re-ran the probes of plan §6 and got the plan's numbers (20x18 Hard:
   U 9-10, B 0, 0, 2), except the piece sizes of 10x6 Hard (4..9, not 5..8). Every code-level cause of plan §1.2 is
   at the cited lines or within a few lines (§2).
2. **The direction is sound; the plan cannot be executed literally.** The formula has two base maxima (12 in the
   equation, 16 in `SCORE_V3`; 16 breaks "a forced puzzle caps at Normal"); R9 and the "place" half of R3 are
   unsound as written; the listed metrics cannot rebuild the score; a node cap does not bound the work; the protocol
   warning is wrong; P1's acceptance and P4's provenance are incomplete; several tests and gate commands cannot work
   as written. RES-01 to RES-33 give the corrected specification; §4 lists the errata.
3. **Several solutions and free choices.** Sound deductions never remove a row of any solution, so a puzzle with
   S >= 2 always has a branch on the path to its first solution. With the plan's G a free choice adds at least
   a + b = 10 points while the penalty refunds 2 or 4: decision 3 is not contradicted literally (the penalty lowers an
   equal metric vector), but multiplicity raises scores in practice. Whether free choices count is the owner's
   question SA1-Q-P1 (RES-05).
4. **The starting knobs are far from real data.** After propagation and lookahead a guess node has 2 to 28 live
   alternatives (2 to 10 on the recipes' first paths, up to 28 on a 20x18 Expert puzzle), not about 2 as the plan's
   worked examples assume; with the plan's knobs and the agreed rule term the six 10x6 recipes rate 5, 6, 9, 38, 66,
   104: the Hard, Expert and Master recipes two bands above their v2 level, the Easy and Normal ones one band below (a
   partial prototype, §2.4). The knobs are fitted from the P0.3 probe before v3 is activated and locked before P4
   (RES-14, RES-25).
5. **Agreed contracts** (final): a base term of at most 12 with `base.max + rule.max <= 16` (starting value 12; the
   fit range is JR-P3); the rule bonus from the hardest deduction tier; R4/R5 per piece and cell only; separate path,
   count and census statuses; one canonical search order; centre-seeking acceptance with memoised repairs; uniform
   clue sampling; summary claims in puzzle codes; a derived display rating for old claims; provenance in
   `generation.made` with execution-based, bounded skips; isolated auxiliary worker requests; calibration order.
6. **Open** (`PENDING`): SA1-Q-P1 (raw or decisive guesses), SA2-Q-P02 (cap hit before the first solution),
   SA2-Q-P03 / SA1-Q-P6 (identical shapes), SA2-Q-P09 (calibration freedoms), AUTH-P1 (provenance format, including
   the skip encoding), the author's confirmation of SA2-Q-P04 (centre search), and the questions raised by this
   report: JR-P1 (old claims to re-rate), JR-P3 (fit ranges), JR-P4 (scheduling of auxiliary requests), and the
   author's confirmation of the agreed JR-P2 (set-origin key) (§8).
7. **Work**: 17 numbered tasks (MP05's scope depends on SA1-Q-P1) plus the conditional MP04b, one developer at a time;
   about 69-105 agent hours plus machine time for the gate runs (SA2's engineering estimate: 88-139 hours). §5 and §6.

---

## 1. Decisions and the status of every question

Status as recorded in `docs/difficulty-v3/clarifications.md`, in the analysts' third files and in SA2-4.

| Question | Topic | Status | Resolution |
|---|---|---|---|
| SA1-Q-P1 | free choices: raw or decisive guesses | **PENDING** (owner; analysts close: SA1 decisive with the census rule, SA2 a bounded decisive prototype first and an explicit incomplete-census policy) | RES-05 |
| SA2-Q-P02 | cap hit before the first solution | **PENDING** (owner; SA1 saturated rating for hell-1 and higher targets, rejected below; SA2 unrateable, candidate skipped) | RES-04 |
| SA2-Q-P03 / SA1-Q-P6 | identical shapes | **PENDING** (owner; SA1 raw counts, SA2 quotient by placement multisets for G and S) | RES-09 |
| SA2-Q-P09 | calibration freedoms | **PENDING** (plan author; whether K60, SHARES and caps may change without the owner) | RES-25 |
| AUTH-P1 | provenance record format, skip encoding | **PENDING** (plan author; analysts agree on the record, the skip encoding has branches) | RES-27 |
| SA2-Q-P04 | centre search | agreed; **author confirmation pending** | RES-15 |
| JR-P1 | old claims that get a derived display rating | **PENDING**, disputed (minor) (plan author; SA1 (a) v2 and v1, SA2 (b) v2 only) | RES-23 |
| JR-P2 | key of the immutable set origin | agreed: (a) `generation.setOrigin`; **author confirmation pending** (SA2: (b) could work if specified) | RES-27 |
| JR-P3 | ranges of the knob fit | **PENDING** (plan author; SA1 accept the proposed ranges, SA2 approve ranges as candidates before production values) | RES-18, RES-25 |
| JR-P4 | scheduling of auxiliary worker requests | **PENDING** (plan author; raised by SA2-4 JC10; SA1 a queue in the existing pool) | RES-29 |
| SA2-Q-P01 | base maximum | final: (a) a base term of at most 12, starting value 12; `base.max + rule.max <= 16`; the fit range is JR-P3 | RES-18 |
| SA2-Q-P13 | input of the rule bonus | final: (a) hardest deduction tier used | RES-08, RES-18 |
| SA2-Q-P12 | R4 cell-to-cell | final: (a) piece/cell R4 and R5 only | RES-06 |
| SA2-Q-P05 / SA1-Q-P5 | weighted clue sampling | final: skip (uniform sampling) | RES-16 |
| SA2-Q-P06 | one or several search orders | final: (a) one canonical order; the spread is reported | RES-13 |
| SA2-Q-P07 / SA1-Q-P3 | rating in puzzle codes | final: summary claims (`model`, `score`, `level`, `saturated`); full metrics in packs | RES-22 |
| v3 metrics size | compatibility bound | final: <= 4,096 UTF-8 bytes and depth <= 8 | RES-21 |
| SA2-Q-P08 / SA1-Q-P2 | old v2 ratings in the apps | final: (a) derived display rating with a note; stored claim untouched | RES-23 |
| PROC-P1 | when the knobs are fitted | final: (a) fit before activation, lock before P4, regression after P4 | RES-14, RES-25 |
| SA2-Q-P10 / SA1-Q-P4 | where provenance lives | final: `generation.made` (format details: AUTH-P1) | RES-27 |
| SA2-Q-P11 | rule-based Player hints | final: (a) excluded from this release | RES-33 |
| task order | one developer, sequential; timing runs never in parallel on the machine | final | §5 |
| part D | plan corrections | accepted by both analysts; item 10's second half is superseded by SA2-Q-P12 (a) | §4 |

---

## 2. Baseline and verified findings

Details: SA1-1 §1-§3, SA2-1 §1-§3.

### 2.1 Tests at HEAD

| Command (repository root) | SA1 | SA2 |
|---|---|---|
| `npm run test:quick` | 1,110 tests in 111 suites, all pass, 15.9 s (16.7 s wall) | isolated run: 1,110 pass, runner 15.3 s, command 16.2 s |
| `npm run check` | `check-conventions: OK`, `check-site: OK`, 1.1 s | both checks pass, 1.1 s |

Both analysts' first quick runs overlapped and failed once in `tests/calibration.test.js:284-319`: the test recreates
`tests/artifacts/t21-calibration/node-smoke` and appends to a fixed checkpoint, so two runs on one working tree
collide. Not a code fault, but a process rule (RES-01): **one test run at a time per working tree**.

### 2.2 The probes of plan §6 (both analysts, `--workers 4`)

| Board / level / seed | K, piece sizes | U | B | v2 score |
|---|---|---|---|---|
| 10x6 hard `probe1` (5) | 9; **4..9** (plan: 5..8) | 6 | 32, 10, 6, 13, 6 | 24, 20, 19, 21, 19 |
| 20x18 hard `probe2` (3) | 16; 19..27 | 9, 10, 10 | 0, 0, 2 | 18, 20, 24 |
| 20x18 expert `probe3` (3) | 18; 14..24 | 13 | 17, 8, 7 | 36, 34, 33 |
| 10x6 easy (seed not in the plan; SA1 `probe0`, SA2 `probe-easy`) | 7 | 3 | 1-2 | 8-10 |

Order noise (SA2-1 §1.2): the Hard puzzle of `tests/fixtures/generated-sample-pack.json` has canonical B = 14 and
B = 4, 3, 14, 13, 4, 14 under six seeded DLX orders (v2 17-21). The seeded DLX changes the MRV column ties as well
as the row order (`core/engine/dlx.js:230-278`).

### 2.3 Code-level causes of plan §1.2

All verified (SA1-1 §2.2, SA2-1 §2), with these precisions: the hint (`core/engine/hints.js:140-183`) maximises
contact with occupied, blocked and border cells in a known solution, it does not count placements; a v2 claim is
written in the compact code form only when it can be rebuilt exactly (`core/engine/puzzlecode-v1.js:928-978`);
"strict" v2 pack reading validates fields and types, it does not recompute scores; BQ-0 counted 1,656 proved
multiple, 1,445 not proved and 94 unchecked among 4,204 accepted puzzles (`docs/calibration/bq-0-latest.md:223-224`).
Anchor drift: `readMetricsV2` is at `core/engine/pack.js:734-764` and `ratingClaim` at 1193-1211; the generation
fixtures are read at `tests/generate.test.js:47-48` and asserted at 716-754; the 1-4 worker test is
`tests/generate.test.js:687` and `tests/generation-client.test.js:836`; the typedefs of `core/engine/types.js` are
`Metrics` 55-64, `Rating` 66-73, `RatingClaim` 94-102, `PackPuzzle` from 111 and `PuzzleCandidate` from 180.

### 2.4 Measured facts the resolutions rely on

**Prototype characterisation** (SA1-1 §2.3 as corrected in SA1-3 §1.3; a throw-away solver with R1, R2, the R3 check
inside an R6 lookahead of width 4, MRV guesses; not an upper bound of the full ladder). Re-measured for this revision
with the agreed rule term (RES-08: `rule[2] = 2` when R6 removed a row before the first solution, else 0; the earlier
figures 40, 68, 106 and 17 used the plan's superseded guess-dependent rule term of 4). The six recipes of
`tests/fixtures/clue-recipes.js`:

| Recipe | v2 | U | G | alternatives on the first path | sum log2 c | v3, plan knobs | v3 level |
|---|---|---|---|---|---|---|---|
| very-easy / easy / normal | 6 / 8 / 12 | 3 / 4 / 5 | 0 / 0 / 0 | - | 0 | 5 / 6 / 9 | very easy, very easy, easy |
| hard | 22 | 7 | 2 | 3, 5 | 3.91 | 38 | master |
| expert | 25 | 8 | 3 | 7, 10, 9 | 9.30 | 66 | nightmare |
| master | 43 | 10 | 6 | 6, 2, 7, 5, 7, 6 | 14.11 | 104 | hell-1 |

On the probe puzzles (same prototype and scoring): the 20x18 Hard puzzles with B = 0 have G = 0 and rate 9-10 (Easy),
as plan §5 expects; three of five 10x6 Easy puzzles have two solutions and rate 15 (Normal) under the plan's G, 3
under decisive guesses; the 20x18 Expert puzzles have guess nodes with up to 28 alternatives; the first-solution pass
costs at most 5 ms on 6,500 rows (SA1-1 §2.3). These probes establish large alternative counts and the inflation by
free choices, not final v3 coefficients: MP06 repeats the comparison with the full ladder and final-path attribution.

**SA1 note on JC01.** SA2-4 asked to keep 5, 6, 9, 40, 68, 106 as "the corrected recipe scores". The re-run (the
prototype of SA1-1 §2.3 with only the rule term changed, 0.3 s) shows that 40, 68 and 106 also carried the old rule
term of 4; with the agreed term they are 38, 66 and 104, in the same bands. The table above uses the re-measured
values.

**Theorem** (SA1-2, accepted in SA2-3 §1.1): every sound rule keeps all rows of every solution; if X and Y are two
solutions, the first node on the path to X that excludes Y is a branch. So S >= 2 implies at least one guess node on
the path under the plan's raw G.

**Code lengths** (SA1-3 §1.3, both analysts' synthetic payloads): a full v3 JSON claim makes a 10x6 code about
390-455 characters (compact v2 form today: 46) and a 20x18 code about 540-570 (v2: 154); a summary claim
(`model`, `score`, `level`, `saturated`) about 155-170 and 265-285. All fit `MAX_CODE_SYMBOLS` (16,000) and QR
version 40. The full-claim figures predate the fields added in this revision (about 80 more bytes of JSON, RES-19);
codes carry summary claims only (RES-22).

---

## 3. Resolutions

| RES | Topic | Plan | SA1 | SA2 | Clarifications | Status |
|---|---|---|---|---|---|---|
| RES-01 | Invariants and process | §3, §5 | SA1-1 §1, §6 | SA2-1 §6 | task order | final |
| RES-02 | Model metadata | P0.1 | SA1-1 §4 P0.1 | SA2-1 §4 P0.1 | part D 11 | final |
| RES-03 | Deduction state, ladder and search | P0.2 | SA1-1 §4 P0.2, SA1-3 §1.2 | SA2-1 §4 P0.2 | - | final |
| RES-04 | Result, statuses and saturation | P0.2, P2.1 | SA1-3 §4 row 8 | SA2-3 §2.2 | SA2-Q-P02, part D 2, 9 | final except **PENDING SA2-Q-P02** |
| RES-05 | Guess measure: raw or decisive | P0.2, P2.1 | SA1-3 §3 | SA2-3 §2.1 | SA1-Q-P1 | **PENDING SA1-Q-P1** |
| RES-06 | Rules R1-R6 | P0.2b | SA1-1 §4 P0.2b | SA2-1 §4 P0.2b | SA2-Q-P12, part D 1, 10 | final |
| RES-07 | Rules R7-R9 | P0.2b | SA1-1 §4 P0.2b | SA2-1 §4 P0.2b | part D 1 | final |
| RES-08 | Tiers and rule counts | P0.2b | SA1-3 §2 | SA2-3 §0 | SA2-Q-P13 | final |
| RES-09 | Identical shapes | P0.2b | SA1-3 §4 row 6 | SA2-3 §3 | SA2-Q-P03, SA1-Q-P6 | **PENDING SA2-Q-P03 / SA1-Q-P6** |
| RES-10 | Caps, work and memory | P0.2, P3.4 | SA1-3 §1.2 | SA2-1 §4 P0.2 | - | final |
| RES-11 | Deduction tests | P0.2, P0.2b | SA1-1 §4 | SA2-1 §4 | part D 5 | final |
| RES-12 | Probe tool | P0.3 | SA1-1 §4 P0.3 | SA2-1 §4 P0.3 | - | final |
| RES-13 | Order noise and aggregation | P0.3, §5 | SA1-3 §4 row 10 | SA2-3 §3 | SA2-Q-P06, part D 14 | final |
| RES-14 | Initial fit and v2 baseline | P0.3, P3 | SA1-3 §4 rows 15-16 | SA2-3 §1.1 D8 | PROC-P1, part D 4, 8 | final |
| RES-15 | Centre-seeking acceptance | P1 | SA1-3 §1.2 | SA2-3 §1.2 | SA2-Q-P04 | final; author confirmation pending |
| RES-16 | Uniform sampling | P1 step 2 | SA1-1 §4 P1 | SA2-1 §4 P1 | SA2-Q-P05 / SA1-Q-P5, part D 7, 13 | final |
| RES-17 | P1 versions, tests, gate, docs | P1 | SA1-1 §4 P1 | SA2-1 §4 P1 | part D 13 | final |
| RES-18 | v3 formula, policy and breakdown | P2.1 | SA1-1 §4 P2.1 | SA2-1 §4 P2.1 | SA2-Q-P01, SA2-Q-P13, part D 8 | final; knob ranges **PENDING JR-P3** |
| RES-19 | Measurement, rating and v2 retention | P2.1 | SA1-3 §4 row 23 | SA2-1 §4 P2.1 | part D 2 | final |
| RES-20 | Types and protocol | P2.2, §3 rule 6 | SA1-1 §3 | SA2-1 §4 P2.2 | part D 3 | final |
| RES-21 | Pack reader and writer | P2.3 | SA1-1 §4 P2.3 | SA2-3 §2.3 | v3 metrics size | final |
| RES-22 | Puzzle codes | P2.4 | SA1-3 §1.2 | SA2-3 §2.3 | SA2-Q-P07 / SA1-Q-P3, part D 6 | final |
| RES-23 | Derived display rating | P2.5 | SA1-3 §1.1 | SA2-1 §4 P2.5 | SA2-Q-P08 / SA1-Q-P2, JR-P1 | final; scope **PENDING JR-P1** |
| RES-24 | Tests and fixtures moved by P2 | P2 gate | SA1-1 §4 P2.5 | SA2-1 §3.1 | part D 12 | final |
| RES-25 | Calibration and lock | P3 | SA1-3 §4 rows 11, 15 | SA2-3 §3 | SA2-Q-P09, PROC-P1 | **PENDING SA2-Q-P09** |
| RES-26 | v3 tests | P3.1, P3.2 | SA1-1 §4 P3 | SA2-1 §4 P3 | part D 5 | final |
| RES-27 | Provenance | P4.1 | SA1-3 §1.2 | SA2-3 §1.2 | AUTH-P1, SA2-Q-P10 / SA1-Q-P4, JR-P2 | **PENDING AUTH-P1**; JR-P2 agreed, confirmation pending |
| RES-28 | Recorders | P4.2 | SA1-1 §4 P4 | SA2-1 §4 P4.2 | - | final |
| RES-29 | Replay engine and worker task | P4.2 | SA1-1 §4 P4 | SA2-1 §4 P4.2 | JR-P4 | final; scheduling **PENDING JR-P4** |
| RES-30 | Score tables and views | P4.3 | SA1-1 §4 P4 | SA2-1 §4 P4.3 | - | final |
| RES-31 | Generation Steps dialog | P4.4 | SA1-1 §4 P4 | SA2-1 §4 P4.4 | - | final |
| RES-32 | Documents | all | SA1-1 §4 | SA2-1 §4 docs | - | final |
| RES-33 | Out of scope | P0.2b, P1, P2.4, §5 | SA1-3 §4 | SA2-3 §3 | SA2-Q-P11 | final |

### RES-01. Invariants and process

- **Purity.** Engine modules (`core/engine/*.js`) stay pure `// @ts-check` ES modules with JSDoc types: no DOM, no
  clocks, no randomness except an injected `Rng` (plan §3 rule 5). A rating is a pure function of board, pieces,
  clues and the model constants; `measureDeduction` uses no RNG; clue selection uses only its injected `rng`.
- **Determinism and invariance.** Ratings do not depend on piece ids, colours or input order beyond the canonical
  model order (`core/engine/placements.js:1-9, 185-192`), nor on the number of workers (`tests/generate.test.js:687`,
  `tests/generation-client.test.js:836`). Every new metric is a deterministic integer or a value computed from
  integers with one documented formula.
- **Frozen.** Band edges (`core/engine/levels.js:42-44`); the v2 maths (`SCORE` in `core/engine/policy.js:48-52`, the
  codec's own copy `RATING` in `core/engine/puzzlecode-v1.js:111-124`); the v2 code goldens
  (`tests/fixtures/puzzlecode-v1.json`); `docs/calibration/`, `docs/init-design/`, `docs/regenerate-puzzle/`, `tasks/`.
- **Versions.** `MODEL` becomes `difficulty-v3` (design §7.7, `docs/design-detail.md:1571-1576`); `ALGO_ID` becomes
  `gen-v3` with P1 (RES-17); `POLICY_ID` becomes `mixed-v3` if P3 changes K60 or another table that design §5.5
  assigns to the policy (`docs/design-detail.md:752`). After the lock (end of MP12) any change to a weight, cap, rule,
  counter, the clue search or `SHARES` needs a new id and a new qualification.
- **Provisional values.** The starting `SCORE_V3` knobs, the `DEDUCE` work, memory and census budgets and the `REPLAY`
  bounds are test and prototype defaults until MP06 measures them and the ranges of JR-P3 and SA2-Q-P09 are approved;
  they are not release policy. The policy is what MP08 writes after those answers and MP12 locks (SA2-4 JC12).
- **Process.** One developer per repository at a time; **one test run at a time per working tree** (§2.1). Every task
  ends with `npm run test:quick` and `npm run check` green. The developer never stages, commits, stashes, resets,
  pushes or switches branches; the orchestrator re-runs the checks, reviews the change, records it and commits each
  accepted task on `rating-v3`; nothing is pushed. `docs/design-brief.md` and `docs/design-detail.md` change in the
  same commit as the behaviour they describe; the English and Vietnamese guides stay in step (`AGENTS.md`). Records
  under `docs/difficulty-v3/` are new dated files, written once and never edited afterwards (a correction is a new
  file). Every test run finishes within 10 minutes and every browser check within 1 minute (`AGENTS.md`); long tool
  runs are split into bounded shards, run attached and monitored. Timing-sensitive runs (landscape, probe timings,
  browser timing) never run at the same time as the Sudoku repository's. Files written by tools are normalised to
  CRLF before the orchestrator stages them (`core.autocrlf` and `core.safecrlf` are on).
- **Gates.** Every APPROVAL GATE of the plan is pre-approved and owned by one task (§5.3); the task runs it and
  records the command, its duration and its result in its record and in its final reply.

### RES-02. Model metadata (P0.1)

`buildModel` (`core/engine/tiling.js:54-74`) also returns, as views without copies, and the `Model` typedef
(`core/engine/tiling.js:24-36`) declares:

| Field | Source | Use |
|---|---|---|
| `rowCount` | `arena.rows` | array sizes |
| `rowCols`, `rowStart` | `arena.rowCols`, `arena.rowStart` | row columns: cells ascending, piece column last |
| `columns` | `arena.columns` | `freeCells + freePieceCount` |
| `cellColumn` | `arena.cellColumn` (the workspace's copy of the plan's map) | column of board cell `y * width + x`, or -1 |
| `freePieceCount` | `plan.freePieceIds.length` | piece columns `freeCells + i` |
| `width`, `height` | `plan.width`, `plan.height` | adjacency, parity colour |
| `pieceSizes` | `plan.pieceSizes` (canonical free-piece order) | R3, R7, R8 |
| `shapeGroup` | only under RES-09 branch B or C: shape class index per free piece | quotient |

- Lifetime: the arena views (`rowCols`, `rowStart`, `cellColumn`) are valid only while the model is live (the next
  `buildModel` on the same workspace overwrites them); `pieceSizes` is owned by the plan and is not a workspace view.
- `measureDeduction` refuses a stale model: export the existing liveness check (`core/engine/tiling.js:77-83`) as
  `assertLive(model)` or `isLive(model)`.
- Precondition, documented in the typedef: pieces are connected (imported sets: `core/engine/pack.js:486`; generated
  sets: `core/engine/carve.js:697`). R3, R7 and R8 rely on it.
- Tests (`tests/tiling.test.js`): the fields agree with `preparePlacements` (dimensions, canonical mapping through
  `freePieceSource`, sizes); a non-square masked board; a model with no free piece; a stale model is refused. No
  output changes.

### RES-03. Deduction state, ladder and search (P0.2)

- **Module.** New `core/engine/deduce.js`, importing `./policy.js`, the liveness check of `./tiling.js` and types
  only. Export `measureDeduction(model, limits = DEDUCE)` returning a `DeductionResult` (RES-04).
- **State**, built once per call in accounted workspace buffers (RES-10): a CSR transpose (`colStart:
  Int32Array(columns + 1)`, `colRows: Int32Array(nonzeros)`); `live: Uint8Array(rowCount)`; `colCount:
  Int32Array(columns)`, the live rows of each uncovered column; `covered: Uint8Array(columns)`; the multiset of
  remaining piece sizes; a trail of killed rows and covered columns.
- **Select a row**: cover its columns; kill every live row that touches a covered column (the selected row leaves the
  eligible set too); record every change once on the trail. **Undo** restores live rows, counts, covered flags,
  remaining pieces and path counters exactly.
- **Ladder**: R1, R2, R3, R4, R5, R6, R7, R8, R9, restarting at R1 after any rule changes the state (plan:205-207),
  until a fixpoint or a contradiction (an uncovered column with no live row, or a failed R3, R7 or R8 check).
- **Guess**: at a fixpoint with uncovered columns, take the uncovered column with the fewest live rows; ties: cell
  columns before piece columns, then the lowest column index; no RNG. Its live rows, in ascending row index, are the
  alternatives: select, run the ladder, recurse. A column with c >= 2 live rows at a fixpoint is a guess node (c = 1
  cannot happen there: R1 or R2 would fire). Under RES-09 branch B or C the eligible columns, c and the
  alternatives follow RES-09.
- **Final path only.** F, E, the rule counts, G, info, Cmax and Dmax count only the state changes on the path from the
  root to the first solution (a snapshot is taken before undoing), and `rows` keeps that solution's selected rows.
  Abandoned branches and the solution count change only the search totals Gt, nodes and work (agreed, SA1-3 §4
  row 22).
- **Count.** After the first solution the same search continues until `limits.solutions` solutions, exhaustion or a
  cap.

### RES-04. Result, statuses and saturation (P0.2, P2.1)

```text
DeductionResult = {
  path:   'complete' | 'capped' | 'none',
  first:  FirstPath | null,          // non-null iff path === 'complete'
  prefix: PrefixPath | null,         // non-null iff path === 'capped'; used by a rating only under SA2-Q-P02 branch B
  search: { Gt, nodes, work, stop: 'exhausted' | 'solution-limit' | 'node-cap' | 'work-cap' },
  count:  { S, limit, exhausted, solutions: 'unique' | 'few' | 'many' | 'unknown' | 'none' },
  census: { complete, undecided, nodes, work } | null    // RES-05 branches B and B' only
}
FirstPath  = { F, E, rules: { R1, R2, R3, R4, R5, R6, R7, R8, R9 }, deductionTier: 0 | 1 | 2 | 3,
               G, info, Cmax, Dmax, choices: number[], rows: number[], census?: CensusNode[] }
PrefixPath = { G, info, Cmax, Dmax, choices: number[] }   // raw c of the guess nodes on the search path at the cap
```

- `path`: `complete` when a first solution was found; `none` when the search was exhausted without one (the caller
  throws `UnsatisfiableError`); `capped` when a node or work cap stopped the search before the first solution.
- Path completion, count exhaustion and census completion are **independent statuses** (SA2-4 JC02). `prefix` holds
  the raw guess nodes on the search path at the cap; MP02 fills it for every capped path as a diagnostic, so the
  solver does not depend on the answer to SA2-Q-P02; it is never a `FirstPath`.
- `solutions`: exhausted with S = 0 `none`; exhausted with S = 1 `unique`; 2 <= S < limit `few`, also when a cap
  stopped the count (S is then a lower bound); S >= limit `many`; not exhausted with S <= 1 `unknown`.
  `limit = DEDUCE.solutions` (8; at least 2). A cap never proves uniqueness.
- `saturated` (in the rating) is true only for a capped path; a cap during the count changes `solutions`, never
  `saturated` (part D item 9). A capped count after a complete path is a complete measurement of the raw first-path
  metrics; under RES-05 B or B' the census can still be incomplete (`census.complete` false), a separate status.
- **Valid metric domain** (SA2-4 JC04): G = 0 implies info = 0, Cmax = 0 and Dmax = 0 (a maximum over no node is 0);
  for G > 0, info and Cmax aggregate the counted nodes of the selected guess measure (RES-05).
- `rows` (the selected rows of the first solution, clues excluded, in selection order) is an owned copy for tests and
  the replay; it never enters rating metrics. `choices` (the c of each final-path guess node) and `census` stay in
  the result for the probe and the replay; ratings keep aggregates only (RES-19). `Dmax` is the **placement depth
  before the deepest counted guess**: the number of pieces placed (clues excluded) on the final path before its
  deepest counted guess node, 0 when G = 0; diagnostic, not scored, and not a guess-nesting depth (never asserted to
  equal G).

**PENDING SA2-Q-P02: a capped path.**

| | Branch A (SA2 recommends) | Branch B (SA1 recommends) |
|---|---|---|
| `rate()` | throws `IncompleteRatingError` (`code: 'rating-incomplete'`, with the work counters) | returns a rating with `saturated: true` and `path: 'capped'`; G, info and Cmax come from `prefix` (raw c, no census), labelled "search budget exhausted; not a bound" |
| `selectClues` | catches `IncompleteRatingError` at the subset rating (`core/engine/clues.js:216`) and at the repaired rating (`:241`); the subset counts as a profile and is neither in band nor below or above (neutral for the count steering); a failed repair is memoised and falls through to the next ranked candidate; cancellation and other errors propagate; recorded for diagnostics | uses the **requested target**: below a hell-1 target (level index 7) a saturated rating counts as not in band and as above the band for the count steering; from a hell-1 target up it is accepted as rated when in band (plan:367-368 accepts saturation there); a pure `rate()` call has no target |
| derived display rating (RES-23) | keeps the stored claim, note "could not be re-rated within the work limit" | shows the saturated v3 rating with its "+" |
| v3 "+" mark | never used | used for capped paths only |
| measurement | MP06 reports the capped share per level and board; MP12 the lost hit rate | the same; if a level below hell-1 caps more than 1 % of its probe ratings, MP06 raises `DEDUCE.work` (RES-10) |

### RES-05. Guess measure: raw or decisive (P0.2, P2.1)

**PENDING SA1-Q-P1.** The answer is needed before MP08 writes the formula; MP05 and MP06 produce the data either way.

- **Branch A, raw (the plan as written).** G = the guess nodes on the final path; `info = sum of log2(c_i)`;
  `Cmax = max c_i`. MP05 is reduced to a raw-metric contract check (S).
- **Branch B, decisive with SA1's census rule (SA1 recommends).** Each final-path guess node records
  `CensusNode = { c, kLow, f, u }` with `kLow + f + u = c`: kLow alternatives proved solvable (at least 1, the path's
  own), f proved impossible (subtree exhausted without a solution), u undecided. Sources, cheapest first: (1) the
  alternatives the main search tried before the path's one, exhausted: f; (2) the solution-count continuation:
  exhausted subtrees f, subtrees with a solution kLow; (3) an existence probe (same ladder, stops at its first
  solution) for each alternative still undecided, in canonical order, under one deterministic census work budget
  `DEDUCE.census` per rating; a probe stopped by the budget leaves its alternative in u; a cutoff is never a failure.
  Score inputs: `G = #{ i : kLow_i < c_i }`, `info = sum of log2(c_i / kLow_i)`, `Cmax = max c_i` over counted nodes.
  `result.census` and the metrics add `censusComplete` (every u = 0), `censusUndecided` (sum of u), `censusNodes`
  and `censusWork` (the existence probes' share of the totals, RES-10). Properties: on a unique puzzle **whose count
  completed within the caps** kLow = 1 and u = 0, and the values equal branch A at no extra cost (a capped count
  never proves uniqueness); a node proved free (kLow = c) adds nothing. With u > 0 the published value is a
  **decisive upper estimate**: it uses kLow and lies between the true decisive value and the raw value; the rating
  has `path: 'complete'` and `censusComplete: false`. Its label and UI note ("decisive estimate: n alternatives
  undecided within the work limit") are part of the SA1-Q-P1 answer and independent of the `+` policy of SA2-Q-P02.
- **Branch B', decisive with a complete census required (SA2's condition).** As B, but an ordinary decisive rating
  needs `censusComplete: true`. With u > 0, `rate()` throws `IncompleteRatingError` (`code: 'rating-incomplete'`,
  `reason: 'census-incomplete'`) carrying the completed first-path evidence (raw first-path metrics, `count`, the
  census counters and the per-node interval `[log2(c / (c - f)), log2(c / kLow)]`), so nothing measured is lost;
  `selectClues` catches it at the two points named in RES-04 branch A, whatever the answer to SA2-Q-P02. The probe
  reports the intervals. Publishing the interval or the estimate instead of throwing is branch B.
- **Branch C.** The raw G and info of branch A; the multiplicity penalty is
  `S >= 2 ? weights.info * log2(min(S, 8)) : 0` and replaces the fixed few/many penalty of RES-18 (S <= 1, `unknown`
  and `none` give 0, so a capped path with S = 0 never evaluates log2(0); a count stopped by a cap uses its lower
  bound S). Branch C needs raw S also under RES-09 branch C.
- **Rating error.** `IncompleteRatingError` exists only if SA2-Q-P02 branch A or SA1-Q-P1 branch B' is selected;
  `reason` is `'path-capped'` or `'census-incomplete'`. Cancellation and every other error stay distinct and
  propagate.
- **Recommendations.** SA1: B, measured in MP06 against A on the same puzzles. SA2: build B as a bounded prototype
  (MP05), measure hit rates, cost and census completeness (MP06), then the owner selects between B and B' (or A);
  no automatic replacement of raw G without an explicit incomplete-census policy.

### RES-06. Rules R1-R6 (P0.2b)

| Rule | Tier | Sound specification (must) | Counted as |
|---|---|---|---|
| R1 forced cell | 1 | an uncovered cell column with one live row: select it; with none: contradiction. When R1 and R2 explain the same row in one scan, R1 is credited | placement |
| R2 forced piece | 1 | an uncovered piece column with one live row: select it; with none: contradiction | placement |
| R3 pocket | 1 | components are the 4-connected components of uncovered cells (coordinates from `cellColumn`, `width`). **Contradiction**: a component smaller than the smallest remaining piece, or whose size is not the sum of a sub-multiset of the remaining sizes. **Place**: only when the component's size cannot be written as a sum of two or more remaining sizes (a DP that tracks one versus several pieces) and exactly one live row covers exactly the component's cells | placement (place half) |
| R4 piece claims cells | 2 | for an uncovered piece column P: the cells common to every live row of P; kill the live rows of other pieces that cover one of them | killed rows |
| R5 cell claims a piece | 2 | for an uncovered cell column c whose live rows all belong to one piece P: kill P's live rows that do not cover c | killed rows |
| R6 dead placement | 2 | for each uncovered column with at most `lookaheadWidth` live rows, each of its live rows in row order: select it tentatively and run the cheap closure (R1, R2 and the R3 contradiction check, to a fixpoint; never R4-R9, never R6 again); if a contradiction is proved, undo and kill the row, else undo. A closure stopped by a cap proves nothing | killed rows (= E) |

- R4 and R5 may share one kernel ("every live row of column A contains column B: kill rows(B) \ rows(A)"), enabled
  only for (A piece, B cell) and (A cell, B piece); **no cell-to-cell pairing** (SA2-Q-P12 (a); part D item 10's
  second half is superseded). R4 and R5 work on labelled pieces in every branch of RES-09 and are not extended to
  shape-group capacities.
- F = R1 + R2 + R3 placements; E = R6 kills (final path).
- Near-miss test for R3: two 4-cell pockets, one square tetromino and two dominoes: no placement.

### RES-07. Rules R7-R9 (P0.2b)

| Rule | Tier | Sound specification (must) | Tests |
|---|---|---|---|
| R7 parity | 3 | dark cell: `((x + y) & 1) === 0`; `imb` = dark minus light cells. For a component C, the reachable set is the pairs (area, imbalance) obtainable by an **optional** sub-multiset of the remaining pieces, each used at most once, each contributing one imbalance of its live rows inside C. (|C|, imb(C)) unreachable: contradiction. A live row r inside C is killed when (|C| - |r|, imb(C) - imb(r)) is unreachable by the other remaining pieces. Exact 2-D DP (one bitset of imbalances per area) charged to the work counter; a DP stopped by the cap cannot reject; interval checks only as an over-approximation | positive: a mutilated-chessboard board proved impossible without search. Negative (SA2-1 §4 P0.2b): two separated equal-colour T-shaped regions with two T pieces must not be rejected |
| R8 neck | 3 | articulation cells of the uncovered-cell graph (charged to work). For an articulation cell a whose column has more than `lookaheadWidth` live rows (narrower ones are R6's), each live row r covering a: remove r's cells, compute the actual residual components, apply the R3 contradiction check with r's piece removed; kill r if it fails | positive: an hourglass whose neck cell has more than 4 live rows; negative: sides still connected elsewhere |
| R9 pair exclusion | 3 | two uncovered cell columns a, b whose supporting pieces together are exactly {P, Q} and **no live row covers both a and b**: kill every live row of P or Q that covers neither. Pairs come only from cells with at most two supporting pieces, grouped by pair; charged to work | positive witness; regression (SA2-1 §4 P0.2b): board `###/###`, vertical domino D and 2x2 square O, cells (0,0) and (0,1): D covers both, so R9 must not fire (DLX counts two solutions) |

### RES-08. Tiers and rule counts (SA2-Q-P13 (a))

- Tier of R1-R3 is 1, R4-R6 is 2, R7-R9 is 3.
- `deductionTier`: the highest tier of a rule that changed the state on the final path; 0 when none did.
- `tier` (diagnostic): 4 when G > 0, otherwise `deductionTier`.
- `rules`: final-path counts per rule (placements for R1-R3, killed rows for R4-R9); contradictions are not counted.
- The score's rule term uses `deductionTier` only (RES-18); a guess is scored by the guess term only.

### RES-09. Identical shapes (P0.2b)

**PENDING SA2-Q-P03 / SA1-Q-P6.** Facts: generated sets never contain two pieces of one shape
(`core/engine/carve.js:697-707`); imported packs may (`core/engine/pack.js:569-574` only warns). Twins (free pieces
with equal `canonicalKey`, `core/engine/geometry.js:126`) have identical placement sets and are adjacent in the
canonical model order (`core/engine/placements.js:186-189`). R1-R9 are sound for labelled pieces in every branch.
For a set without twins (every generated set) branches A, B and C give identical results.

- **Branch A, raw (SA1 recommends; SA1-Q-P6 (c), SA2-Q-P03 (a)).** Per-piece rules; G, alternatives and S counted on
  labelled pieces, like the DLX certificate. A swap of twins can count as a guess and double S. The limitation is
  documented (design §7.8 caveats, user guide). No extra task.
- **Branch B, quotient by placement multisets (SA2 recommends; SA1-Q-P6 (b), SA2-Q-P03 (b)).** Specification as
  corrected by SA2-4 JC03:
  - *Equivalence.* The key of a solution is the sorted list of records
    `(shapeGroup, sorted occupied board-cell indices)` of its free placements. Copy ids are omitted; piece boundaries
    are kept; whole-board symmetries are not quotiented (that would be a separate owner policy). The existing
    `layoutKey` is a different relation and is neither used nor changed; no layout or clue key of the apps changes.
  - *S* counts distinct keys: the count keeps the keys found so far (at most `DEDUCE.solutions`) and skips labelled
    duplicates, whose work is charged.
  - *Guess classes.* At a fixpoint the live rows of a column are grouped into classes by `(shapeGroup, cell set)`;
    c is the number of classes. Eligible guess columns: every uncovered cell column, and a piece column whose shape
    group has exactly one uncovered copy (branching on a copy of a group with two or more uncovered copies does not
    split the placement multisets into disjoint sets). MRV takes the eligible column with the smallest c, ties as in
    RES-03. A column with c = 1 is one orbit and **not a guess**: it counts in none of G, info, Cmax, Dmax and Gt,
    and no rule is credited for it. A column with c >= 2 is a guess node with c alternatives, one per class, in the
    order of each class's lowest row index.
  - *Inside a class* the labelled rows (one per copy) are tried in row order as bookkeeping sub-branches. No
    symmetry pruning is used, so every placement multiset keeps a representative whatever the MRV order; no ordering
    constraint such as "copies in increasing first-cell order" is imposed. The extra work is bounded by the caps and
    occurs only for imported sets with twins.
  - *Rules.* R1-R9 stay labelled and unchanged; bookkeeping choices are never credited as R1-R9 work.
  - *Census* (SA1-Q-P1 branch B or B'): kLow, f and u count classes; a class is solvable when one of its copies'
    sub-branches reaches a solution.
  - *Output.* `first.rows` and any returned poses use canonical copy labels: within each shape group, placements
    sorted by smallest cell index go to the group's copies in canonical piece order. The DLX certificate and
    `certify` stay raw, so for such sets the rating and the certificate can disagree about "several solutions",
    which the docs explain.
  - Needs `shapeGroup` (RES-02: per free piece, the canonical index of the first free piece with the same
    `canonicalKey`) and the conditional task MP04b.
  - *Tests* (MP04b): a 2x2 board with two domino twins: raw S = 4, quotient S = 2; a 3x2 board with three domino
    twins: 18 and 3; two separated 1x2 pockets with two domino twins: 2 and 1, with G = 0 (no identity guess); on tiny
    boards (renamed and reordered copies, with clues) every raw DLX solution mapped to its key gives exactly the
    quotient's key set (orbit preservation); the recipes give identical results in branches A and B. The labelled
    soundness oracle of RES-11 and the orbit-preservation test stay separate tests.
- **Branch C (SA2-Q-P03 (c)).** Guess classes as in branch B; S counted raw (labelled solutions, no key
  deduplication), as RES-05 branch C needs.

### RES-10. Caps, work and memory

- `core/engine/policy.js`: `export const DEDUCE = Object.freeze({ lookaheadWidth: 4, nodes: 20000, solutions: 8,
  work: 50000000, memoryBytes: 32 * 1048576 })`, plus `census` under RES-05 branch B or B'. `work`, `memoryBytes`
  and `census` are provisional test defaults (RES-01): MP06 sets them so that no path is capped on boards up to
  20x18 at levels up to master in the probe corpus, and reports the capped share per level and board.
- **Work units** (deterministic): one per row-column incidence visited (kills, restores, scans, **including the CSR
  transpose build and every other setup scan**), per cell visited by a component or articulation search, per DP
  state update and per trial selection. Checked at least once per rule application and per node. `DEDUCE.work` and
  `DEDUCE.nodes` cap everything except the census probes, which `DEDUCE.census` caps; exceeding a cap stops that
  part with its `stop` value. The reported `nodes` and `work` are totals including the census probes, whose share
  is `census.nodes` and `census.work` (RES-04, RES-19).
- **Memory** (SA2-4 JC04): every deduction and census buffer is a named slot `deduce.*` of the model's workspace
  (`model.cover.ws`, `core/engine/tiling.js:80`), allocated with the public `ws.int32` and `ws.uint8`
  (`core/engine/workspace.js:218-230`), so `bytes()` and `peakBytes()` (163-170) account for it; there is no
  untracked allocation path. Before the first allocation `measureDeduction` computes the bytes of all its slots from
  the model counts (`colRows` costs 4 bytes per nonzero, up to 20 MB at the 5,000,000-nonzero model limit,
  `core/engine/placements.js:47-48`; the trail holds at most `rowCount + columns` entries, since a row dies and a
  column is covered at most once on any path) and throws `ModelError('model-too-large')` if they exceed
  `DEDUCE.memoryBytes`; the workspace's own check (`core/engine/workspace.js:195-197`) guards its capacity, including
  growth and replacement, before every allocation. Slots are grow-only and reused by later measurements; no
  allocation per row, node or trail entry. No `workspace.js` API change is needed; MP01 lists the `deduce.*` slots
  in its header comment (lines 1-11).
- No clocks: caps are the only bound. If ratings are too slow on 20x18 at hell levels, lower `nodes` or `work` before
  changing the algorithm (plan:367-368), within RES-25.

### RES-11. Deduction tests (P0.2, P0.2b)

- `tests/deduce.test.js` (MP02, quick):
  1. the 3x2 board with a P pentomino and a monomino **clued at (0, 0)**, as `tests/difficulty.test.js:69-81` does:
     F = 1, G = 0, `unique`;
  2. tiny exact solution sets: unique; two solutions (two distinct shapes that fit two ways); eight or more (`many`);
     none (`path: 'none'`); cap before the first solution (`capped`); a count cutoff after a complete path
     (`searchStop` a cap, `unknown` or `few`, complete first-path metrics; a cap never gives `unique`);
  3. invariance under renamed ids, recoloured pieces and reversed piece order (as
     `tests/difficulty.test.js:127-138` does);
  4. determinism (two calls give equal results); a stale model is refused; undo after a failed lookahead restores
     the state exactly; the first path's `rows`, mapped with `rowPose`, form a valid layout with the clues
     (`isValidLayout`);
  5. the six recipes: their measured values pinned as a characterisation table attributed to the solver version,
     **not** a monotonicity theorem (part D item 5; the recipe clue sets are not nested,
     `tests/fixtures/clue-recipes.js:31-38`);
  6. the metric domain (every result with G = 0 has info = 0, Cmax = 0 and Dmax = 0) and buffer accounting: after a
     measurement `ws.bytes()` includes the `deduce.*` slots; a second measurement of the same model allocates nothing
     (`allocationCount()` unchanged); a model whose buffers exceed a small test `memoryBytes` throws
     `ModelError('model-too-large')` before allocating. MP05 adds, under RES-05 B or B', a census cutoff that gives
     `census.complete: false` while the raw first-path metrics stay unchanged.
- `tests/deduce-rules.test.js` (MP03, MP04, quick): one positive board per rule where exactly that rule is needed and
  the cheaper ones do not fire, and the negative near-misses of RES-06 and RES-07; an **all-solutions soundness
  oracle**: on tiny boards (rectangular, masked, with clues, parity-sensitive, with a repeated shape) every solution
  is enumerated with DLX and no rule may remove a row of any of them (one planted solution is not enough); rules
  never change a solved board.

### RES-12. Probe tool (P0.3)

- New `tools/rate-probe.mjs`, modelled on `tools/generate.mjs:29-72` (flag parsing, `boardFromRows` and presets,
  `createWorkspace(capacityBytes)`, the headless client). Read-only.
- Input: `--pack <file.json>` (validated with `validatePack`) or `--board`, `--level`, `--count`, `--seed`,
  `--workers`, `--uniqueness` (generates first through `createGenerationClient`).
- Options: `--orders k` (default 5): DLX B under k seeded orders, `solveFirst(model, { rng: createRng(seedText,
  'order/' + i), rowTrialLimit, branchTrialLimit })`; `--tie-orders k`: G and info under k deterministic MRV tie
  variants through a diagnostic-only `tieOrder` limit of `measureDeduction` (0 = canonical; never used in
  production); `--knobs <json>`: v3 scores and breakdowns for given `SCORE_V3` knobs (exploration only, RES-18);
  `--census` (RES-05 branch B or B'): raw and decisive values side by side, with the per-node intervals.
- Output: one JSON line per puzzle on stdout, progress on stderr. Timings never enter deterministic comparisons; the
  median of an even count is the lower middle value; `identity` records the `resultDigest` check of a regenerated
  request (RES-14).

  ```text
  { puzzleId, board: { width, height, active }, sourceModel, storedScore, identity,
    v2: { score, metrics }, deduction: { path, first, prefix, search, count, census },
    orders: { B, G, info, summary }, v3?: { score, level, breakdown },
    timing: { buildMs, dlxMs, deduceMs }, modelSize: { rows, nonzeros, bytes } }
  ```

- `tests/rate-probe.test.js` (quick, a few seconds): the tool on `tests/fixtures/generated-sample-pack.json` with
  `--orders 2`; every line parses and has the fields.
- Record `docs/difficulty-v3/probe-<date>.md` (new): (a) the noise of G versus B (RES-13); (b) the cost of
  `measureDeduction` on 10x6, 12x12, 20x18 and 26x26 (nodes, work, ms, memory peaks) and of the DLX diagnostic;
  (c) the distributions of G, info, Cmax, `deductionTier` and `solutions` per level and board, both uniqueness modes,
  with sample counts; capped and census-incomplete shares; the initial fit (RES-14).

### RES-13. Order noise and aggregation (SA2-Q-P06 (a))

- Production uses the canonical order only (RES-03). For a complete deterministic search the first-path G, info and
  Cmax of a unique puzzle do not depend on the alternative order, only on the column tie rule (part D item 14).
- MP06 measures the spread of G and info under `--tie-orders` and of B under `--orders` and reports both. If G at Hard
  varies by more than about 1 (plan §5), the record says so; a median of several orders is not adopted without a new
  owner decision (cost x3 and a rule for which metrics and trace are kept).

### RES-14. Initial fit and v2 baseline (PROC-P1 (a))

- **v2 baseline, gate GV2 (MP06, before P1 lands).** A reduced landscape at HEAD, in shards of at most 10 minutes:

  ```text
  node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --cases "<regex>" --output docs\difficulty-v3\baseline-v2
  ```

  over the boards 6x10, 10x10, 12x12 and the landscape's `18x20` board (the plan's 20x18), levels easy to master (case
  ids are `<board id>-<level id>`, `tools/bench/calibration-reference.js:214-232`). The landscape runner saves no packs
  (`tools/bench/runner.js:682-701`), so the probe regenerates matching requests with `tools\generate.mjs` and rates
  them with `rate-probe`.
- **Identity of regenerated requests** (SA2-4 JC07). A regenerated request keeps the run's complete recipe: board
  rows, rotation, quantity 10, the calibration candidate, batch index 1, uniqueness mode, the seed of
  `seedFor(case, rep)` (`tools/bench/runner.js:94`) and the relevant execution limits. Its result is verified against
  the run's `resultDigest` (layout keys, clue keys and scores, `tools/bench/runner.js:696-700`) before its puzzles are
  used as the same measured puzzles. A mismatch (for example near a deadline) is recorded as a mismatch or partial
  observation and is never substituted silently; when exact regeneration cannot be established, the record keeps
  enough accepted-puzzle data (board, pieces, clues) to rate them again.
- **Initial fit (MP06).** From the probe corpus, MP06 proposes `SCORE_V3` knobs within the ranges of RES-18 that
  satisfy the invariants and order the medians of v3 scores by requested level on each board size, and reports the
  v2-to-v3 level confusion matrix. MP08 writes them into `core/engine/policy.js` once JR-P3 is answered; MP12 changes
  them only when a P3 criterion fails; the lock is the end of MP12. P4 never refits; MP17 is a regression run only.

### RES-15. Centre-seeking acceptance (P1)

Final between the analysts; the plan author's confirmation of SA2-Q-P04 is pending. In `selectClues`
(`core/engine/clues.js:183-368`):

```text
finite  = Number.isFinite(target.max)
centre  = (target.min + target.max) / 2      // finite only; the centre ranked() already uses, core/engine/clues.js:171
window  = (target.max - target.min) / 4      // finite only; the central half of the band
reserve = 16                                 // stop point: profiles >= limit - reserve (48 of 64)
inBand  = []                                 // rated in-band candidates, in rating order

after each rated candidate c (rateSubset returned non-null):
  if inBand(c.rating, target):
    inBand.push(c)
    if not finite or |c.rating.score - centre| <= window:
      r = finishOnce(c); if r !== null: return r
  if finite and profiles >= limit - reserve and inBand is not empty:
    r = chooseRanked(); if r !== null: return r
when the search ends (phase 1, the phase-2 seeding and the beam are done):
  r = chooseRanked(); if r !== null: return r
  return { ok: false, reason: unproved ? 'uniqueness-not-proved' : 'not-in-band' }

chooseRanked(): candidates = finite ? ranked(target, inBand) : inBand (rating order, no centre arithmetic)
                for c of candidates: r = finishOnce(c); if r !== null: return r; return null
finishOnce(c):  finish(c), memoised by c's raw subset id; in 'require' mode the repaired clue set is rejected
                when its rating leaves the band (as today) or when its clueKey is in excludeClueKeys (new)
```

- In `any` mode `finish` cannot fail: the result is the first central hit, else the ranked best in-band candidate at
  profile 48 or at the end. In `require` mode the ranking uses the raw ratings; each repair runs at most once
  (deterministic RNG use); repair ratings are not search profiles (`core/engine/clues.js:239-241`) and are counted
  separately in diagnostics.
- Phase 1's count steering is unchanged; an in-band off-centre sample counts neither below nor above.
- **Unbounded bands** (SA2-4 JC06). A level's maximum can be non-finite: `bandEdge` overflows for very deep Hell
  levels (`core/engine/levels.js:53-66`; e.g. `hell-1899` has `max = Infinity`). For a non-finite maximum there is no
  centre, window or `Infinity - Infinity` arithmetic: the result is the first in-band candidate, in rating order,
  whose memoised finish succeeds; in `require` mode the search continues after a failed repair. Recorder data
  (RES-28) writes such an upper bound as `null`.
- Tests (`tests/clues.test.js`): MP07 adds a direct `selectClues` call with an unbounded target (no deep Hell level is
  generated). MP09 adds, under SA2-Q-P02 branch A or SA1-Q-P1 branch B', an `IncompleteRatingError` from a repaired
  rating that neither aborts the search nor consumes a subset profile a second time.
- Author confirmation: the algorithm above (recommended: the plan's text made explicit), or `reserve = 0` (search all
  64 profiles when no central hit occurs): one constant, more rating cost.

### RES-16. Uniform sampling (P1 step 2)

`sample(count)` stays the uniform shuffle (`core/engine/clues.js:252`); no placement-count bias and no empty-board
model. If the owner reopens the bias later (a new question, e.g. if Hard/Expert hit rates fall in P3), counts come
from `countPlacements(preparePlacements(board, pieces, [])).perPiece`, mapped to layout indices through
`freePieceSource` and copied at once (part D items 7 and 13); a failure to count must not block generation.

### RES-17. P1 versions, tests, gate and docs

- `ALGO_ID` becomes `'gen-v3'` (`core/engine/version.js:4`; part D item 13; seeds reproduce only within one algo id,
  `docs/design-detail.md:751`).
- `tests/clues.test.js` keeps its expectations (in band for every level on the 12-pentomino set, `require` proofs,
  the nightmare / hell-1 behaviour within 64 profiles, a repair that leaves the band is rejected) and adds: in `any`
  mode the returned clue set is the first central candidate rated before profile 48, otherwise the ranked best of the
  in-band candidates rated (reconstructed from `onRate`); in `require` mode a failed best repair falls through to the
  next ranked candidate, a repaired key in `excludeClueKeys` is rejected, and each repair runs once; ties by key; no
  candidate; budget exhausted. No assertion that repairs and profiles together stay within 64.
- Gates GF-P1 and GA-P1 (§5.3). The set attempt may change too: set calibration also calls `selectClues`.
- Docs: `docs/design-detail.md` §5.5 (algo id, line 751), §6.10 (1314), §6.11 (1364), §7.6 (1564);
  `docs/design-brief.md` where it describes clue selection.

### RES-18. v3 formula, policy and breakdown (P2.1)

In `core/engine/policy.js`, next to `SCORE` (which stays v2):

```js
export const SCORE_V3 = Object.freeze({
  model: 'difficulty-v3',
  base: Object.freeze({ max: 12, scale: 6 }),
  rule: Object.freeze([0, 0, 2, 4]),            // by deductionTier 0..3 (SA2-Q-P13 (a))
  weights: Object.freeze({ G: 6, info: 4 }),    // starting values: MP06 fits them, MP12 locks them
  penalty: Object.freeze({ few: 2, many: 4 }),
});
```

```text
base    = base.max * (1 - exp(-U / base.scale))
rule    = rule[deductionTier]
guess   = weights.G * G + weights.info * info
penalty = solutions === 'few' ? penalty.few : solutions === 'many' ? penalty.many : 0
score   = U === 0 ? 0 : max(0, round(base + rule + guess - penalty))
```

- Under RES-05 branch C (PENDING SA1-Q-P1) the `penalty` table is replaced by
  `penalty = S >= 2 ? weights.info * log2(min(S, 8)) : 0`; `breakdownV3`, the invariants and the tests use the
  selected branch.
- `breakdownV3(metrics)` in `core/engine/difficulty.js` returns `{ base, rule, guess, penalty, unrounded, score }`
  and `scoreV3(metrics) = breakdownV3(metrics).score`: one implementation for the score and the P4.3 table.
- `info` is stored and scored as the full finite double the measurement computed; it is **not quantised** (SA2-4
  JC05). `JSON.stringify` and `JSON.parse` preserve every finite Number exactly (e.g. `log2(3)`), so
  `breakdownV3(claim.metrics)` reproduces `claim.score` exactly from a stored claim. Only the final score is rounded;
  screens and records show `info` with at most 6 decimals as presentation only.
- **Invariants (must, tested in `tests/policy.test.js` and `tests/difficulty-v3.test.js`):**
  `base.max + max(rule) <= 16` (16.5 would round to 17); `rule[0] = rule[1] = 0 <= rule[2] <= rule[3]`;
  `0 <= penalty.few <= penalty.many`; weights >= 0. Hence G = 0 gives at most 16 (never Hard) for every U, tier and
  `solutions` (decision 2 of plan §1.3).
- Worked examples with the starting knobs (U = 6, binary guesses): one guess 18 / 20 / 22 for deduction tier
  1 / 2 / 3; two guesses 28 / 30 / 32 (the plan's "about 20" and "about 30" hold for tier 2).
- **Fit ranges** (analysts' candidate ranges, not findings; how far P3 may move the knobs is **PENDING JR-P3** and
  SA2-Q-P09): `base.max` 8-12 (the default and starting value is 12, SA2-Q-P01; a value below 12 needs JR-P3),
  `base.scale` 3-12, `rule[2]` and `rule[3]` with `base.max + rule[3] <= 16`, `weights.G` 0-8, `weights.info` 0.5-6,
  `penalty.few` 0-4, `penalty.many` from `penalty.few` to 8. MP06 may explore values in these ranges before the
  answers; MP08 writes production values only after JR-P3 (and SA2-Q-P09 for anything beyond `SCORE_V3`) is
  answered. Prototype evidence (§2.4): with `weights.G = 2` and `weights.info = 1.5` the Hard, Expert and Master
  recipes rate about 20-22, 31-33 and 45-47 (rule term 2-4), inside their bands; the guess-free Normal recipe
  (U = 5) reaches Normal only with a smaller `base.scale` or a tier-3 rule. These are pointers for the fit on the
  full ladder, not values.

### RES-19. Measurement, rating and v2 retention (P2.1)

- `core/engine/difficulty.js`: `MODEL = 'difficulty-v3'`. The v2 functions are kept as `scoreV2(U, B)` and
  `measureV2(...)` (plan:315); every importer in `core/`, `tools/` and `tests/` is updated in the same task. `SCORE`
  is unchanged (it describes v2; `tests/policy.test.js:371` pins it); the plan's "`SCORE.model` likewise" is dropped.
- `measureV3(board, pieces, clues, ws, limits = { deduce: DEDUCE, dlx: SCORE.caps })` returns
  `{ metrics: MetricsV3, saturated }`:
  1. U = 0: `isValidLayout` or `UnsatisfiableError`; zero metrics with `path: 'complete'`, `searchStop: 'exhausted'`,
     `S: 1`, `solutionLimit: limits.deduce.solutions`, `solutions: 'unique'`, `deductionTier: 0`,
     `dlxStop: 'solution'`;
  2. `buildModel` once; a free piece without placements throws `UnsatisfiableError` (as `measure` does,
     `core/engine/difficulty.js:69-75`);
  3. `measureDeduction(model, limits.deduce)` while the model is live; `path: 'none'` throws `UnsatisfiableError`;
     `path: 'capped'` follows RES-04 (PENDING SA2-Q-P02); an incomplete census follows RES-05 (PENDING SA1-Q-P1);
  4. the DLX diagnostic on the same live model: `solveFirst(model, { rowTrialLimit: limits.dlx.rows,
     branchTrialLimit: limits.dlx.branch })`. `B`, `branchTrials`, `rowTrials` and `dlxStop` keep their v2 meanings
     (B pinned to the cap when capped); they never enter the v3 score or `saturated`. DLX exhausted without a solution
     while the deduction found one is an internal error.
- `rate(board, pieces, clues, ws)` returns `{ model: 'difficulty-v3', score: scoreV3(metrics),
  level: levelForScore(score).id, saturated, metrics }`; `inBand` is unchanged.
- **Detail channel** (SA2-4 JC09; built in MP14): `rateDetailed(board, pieces, clues, ws)` returns
  `{ rating, detail }`, where `rating` equals what `rate` returns and `detail` is an owned copy of the
  `DeductionResult` of the **same** measurement (`first.choices`, `first.census`, `first.rows`, `count`, `search`,
  `census`), copied before the workspace is reused; there is no second solve. `rate` is `rateDetailed(...).rating`
  without the copy. Only recorders (RES-28) call it; claims, packs and codes stay aggregate-only. The `RatingDetail`
  typedef lives in `core/engine/types.js`.
- The DLX diagnostic is kept (agreed). MP06 measures its cost; if it more than doubles the rating time on large
  boards, the record says so and a new owner question is raised: dropping it is not an implementer choice.

**MetricsV3** (fixed field order, all fields present in computed ratings except the census group; no per-node
arrays):

| Field | Type | Meaning |
|---|---|---|
| `U`, `R`, `H` | integer, integer, number | as v2: pieces to place, free cells, mean log2(1 + placements) |
| `B`, `branchTrials`, `rowTrials` | integers | DLX diagnostic, v2 meaning |
| `dlxStop` | `'solution'` \| `'branch-cap'` \| `'row-cap'` | the v2 `stop`, renamed |
| `path` | `'complete'` \| `'capped'` | first-solution status of the deduction |
| `searchStop` | `'exhausted'` \| `'solution-limit'` \| `'node-cap'` \| `'work-cap'` | how the deduction search ended (`search.stop`, RES-04); the count is exhausted iff `'exhausted'` |
| `F`, `E` | integers | final-path placements by R1-R3; R6 kills |
| `rules` | `{ R1 ... R9 }` integers | final-path counts (RES-08) |
| `deductionTier`, `tier` | 0-3, 0-4 | RES-08 |
| `G`, `info`, `Cmax`, `Dmax` | integer, finite number (full double), integers | RES-04, RES-05; valid tuples only (RES-04) |
| `Gt`, `nodes`, `work` | integers | search totals, including setup scans, the CSR transpose and census probes (RES-10) |
| `S`, `solutionLimit`, `solutions` | integer <= `solutionLimit`; integer >= 2 (`DEDUCE.solutions`); `'unique'` \| `'few'` \| `'many'` \| `'unknown'` | RES-04 |
| `censusComplete`, `censusUndecided`, `censusNodes`, `censusWork` | boolean, integers | RES-05 branches B and B' only; all four or none; the census share of `nodes` and `work` |

A computed v3 claim is about 450-650 bytes (synthetic typical and extreme values with every field of the table): it
must stay within 4,096 UTF-8 bytes and depth 8 (RES-21).

### RES-20. Types and protocol (P2.2)

- `core/engine/types.js`: `MetricsV2` (today's `Metrics`, lines 55-64) and `MetricsV3`; `RatingV2` and `RatingV3`
  (lines 66-73 today) with `Rating = RatingV2 | RatingV3` discriminated by `model`; the engine produces `RatingV3`
  only. `RatingClaim` (94-102) keeps optional metrics. `PuzzleCandidate` (from line 180) gains its origin in MP13.
- `core/engine/protocol.js`: **no change for v3 metrics**. Worker results pass through (lines 824-867) and
  `readRatingClaim` (491-516) copies any bounded plain metrics (part D item 3). Add v3 round-trip tests through the
  worker boundary (`tests/worker-pool.test.js`, `tests/protocol.test.js`). The replay task kind (RES-29) is the only
  protocol change of this plan, and `RatingDetail` (RES-19) never crosses the worker boundary except inside replay
  steps, as plain JSON.

### RES-21. Pack reader and writer (P2.3)

- `core/engine/pack.js`: `RATING_V3_FIELDS` (`model`, `score`, `level`, `saturated`, `metrics`),
  `METRICS_V3_FIELDS` (RES-19) and `readMetricsV3(ctx, v, path)` next to `readMetricsV2` (734-764): required
  fields, non-negative integers and finite numbers, enums (`dlxStop` from `STOPS`, line 47; `path`; `searchStop`;
  `solutions`), `rules` with exactly the keys R1-R9, `deductionTier` 0-3, `tier` 0-4, `solutionLimit` >= 2.
- **Cross-field checks** (SA2-4 JC04; a failure rejects the metrics like any invalid field):
  G = 0 implies info = 0, Cmax = 0 and Dmax = 0; G > 0 implies info > 0 and Cmax >= 2; `deductionTier` is the
  highest tier with a non-zero rule count (0 when all are 0); `F = R1 + R2 + R3`, `E = R6`;
  `tier = G > 0 ? 4 : deductionTier`; `S <= solutionLimit`; `solutions` agrees with `S`, `solutionLimit` and
  `searchStop` as defined in RES-04 (`'unique'` only with `searchStop: 'exhausted'` and S = 1, `'many'` only with
  S = `solutionLimit`); `path: 'capped'` implies a cap in `searchStop`, S = 0 and `'unknown'`; in the rating,
  `saturated` is true iff `path` is `'capped'`; the four census fields are present together or not at all, and
  `censusComplete` iff `censusUndecided` = 0.
- `readRating` (774-838): `difficulty-v3` is the current model. Required: `model`, `score`, `level`, `saturated`;
  **`metrics` optional** (summary claims from codes, RES-22). Present metrics are read strictly and must also meet
  the generic bound: at most 4,096 UTF-8 bytes and depth 8 (`MAX_CLAIM_METRICS_BYTES`, `CLAIM_JSON_DEPTH`, lines
  40-41), so current app versions, which read v3 as a foreign model, keep the claim. `difficulty-v2` becomes a
  legacy model read like `difficulty-v1` today: basic fields, metrics as opaque bounded JSON, no `unsupported-model`
  warning (line 820). Other models are unchanged (warned, kept, not used).
- `ratingClaim` (1193-1211): writes v3 metrics in the fixed order of RES-19 (deterministic pack bytes); a claim
  without metrics stays without metrics (never zeros); v2 as today.
- Writer rule (tested): packs written from computed ratings (Generator, `tools/generate.mjs`) carry full v3 metrics.
- Tests (`tests/pack.test.js`): v3 round trip; v3 without metrics; unknown and missing fields; negative and
  non-finite counters; impossible enum combinations and every cross-field check above (valid and invalid tuples);
  the generic 4,096/4,097-byte boundary with an opaque legacy or foreign-model claim, and the largest legal strict
  v3 metrics separately (well under the bound; no padding field is added to the strict schema to build a size test);
  depth 9; v2 read as legacy without warning; `omitSolutions`; today's v2 cases (`tests/pack.test.js:483, 630`)
  become legacy-claim cases.

### RES-22. Puzzle codes (P2.4)

Final (SA2-Q-P07 / SA1-Q-P3): summary claims in codes, full metrics in packs.

- When a puzzle code is written, a `difficulty-v3` claim is reduced to `{ model, score, level, saturated }` in the
  code-snapshot path (`core/engine/puzzlecode.js` and its snapshot builder). The frozen v1 codec already writes a
  non-rebuildable claim as JSON text (`core/engine/puzzlecode-v1.js:958-967`): no codec version, no change to the
  frozen v1 maths, no change to `ratingJsonBytes` (8,192).
- Decoding validates the snapshot through the pack boundary (`core/engine/puzzlecode.js:163-205`), where RES-21
  accepts a v3 claim without metrics. A decoded summary claim is shown as it is; missing metrics are absent evidence,
  never manufactured zeros; its Generation Steps table shows the total only.
- v2 claims keep the compact v2 code form. The v2 goldens (`tests/fixtures/puzzlecode-v1.json` and the
  `tests/puzzlecode*.test.js` families) stay unchanged as compatibility tests; v3 cases are added (summary round trip;
  a full v3 claim in a hand-made code is read strictly; a current-version reader accepts a summary claim).
- Gate GC-P2, format part (MP09): the size matrix on 676-cell production samples (26x26): raw and DEFLATE codes,
  with and without the answer tail, summary and full claims, against `MAX_CODE_SYMBOLS` 16,000
  (`core/engine/puzzlecode-input.js:12`), the URL limits (16,000, warning above 4,000, `core/engine/sharecode.js:11-13`)
  and QR version 40 with the M and L fallback through the real share preparer (`core/browser/qr.js:47-56, 111-145`);
  one run of `tests/browser/puzzle-code-acceptance.html`. Record `docs/difficulty-v3/codes-<date>.md`.
- A compact v3 codec is not scheduled (RES-33).

### RES-23. Derived display rating (P2.5)

Final (SA2-Q-P08 / SA1-Q-P2 (a)); which old models are re-rated is **PENDING JR-P1**; the scheduling of the request is
**PENDING JR-P4** (RES-29).

- Player and Generator compute a **derived display rating** for every puzzle whose stored claim is `difficulty-v2`
  (JR-P1 branch b, SA2's preference and the plan's default) or `difficulty-v2` and `difficulty-v1` (JR-P1 branch a,
  SA1's recommendation), with the existing `rate` task (`core/engine/tasks.js:192-194`) as an **auxiliary request**
  (RES-29). A puzzle without any claim is not re-rated by this task under either branch (a separate display branch,
  not implied by re-rating). The stored claim, the code, the URL, the title and the gameplay identity never change.
- Keyed by the puzzle fingerprint (board, pieces, clues) and `MODEL`; stale replies are dropped; navigation cancels
  only the display request, through its own `AbortSignal`.
- Player: extend the pool kind contract (`player/state.js:210` allows only `verifyPack`). A completed stored layout
  bypasses verification (`player/state.js:584-587`), so the request cannot ride on `verifyPack`. The request must not
  cancel or supersede verification, hints or certificates (RES-29 auxiliary contract).
- Generator: imported puzzles (`#p=` links, packs) and restored saved puzzles (`generator/state.js:838-847`); the
  request never calls `beginRequest` or `cancelAll` while a generation is active
  (`core/browser/worker-pool.js:575-588, 609`; `core/browser/generation-client.js:1190-1194`).
- Display: the v3 level and score with the note "Re-rated with the current scale (original: {level} {score},
  {model})"; print captions (`core/browser/print-dialog.js:45-62`) and share views use the same rating and note. An
  unrateable puzzle (RES-04 branch A) or a rating error keeps the stored claim with "could not be re-rated".
- Strings in `player/locale.en.js`, `player/locale.vi.js`, `generator/locale.en.js`, `generator/locale.vi.js` (the
  `strings.js` files are formatting helpers); parity tests `tests/player-i18n.test.js`, `tests/generator-i18n.test.js`.
- Tests (`tests/player-load.test.js`, `tests/generator-import.test.js`, `tests/print-details.test.js`,
  `tests/generation-client.test.js`): a late reply after navigation, cancellation, no worker, an invalid legacy
  puzzle, the original code unchanged, and **overlapping work**: a display request started while a generation (or, in
  the Player, a verification) runs neither cancels nor supersedes it, and a new generation started while a display
  request runs follows the JR-P4 contract. Tests do not pin knob-dependent levels (the knobs move in MP12).

### RES-24. Tests and fixtures moved by P2

- Pinned v2 values that MP09 replaces or turns into legacy cases: `tests/difficulty.test.js:56-66` (deep-equal of a
  v2 zero rating); `tests/clues.test.js:58-71, 86-96, 145-177` (v2 bands, recipe scores, targets 34-36 and 36-38
  chosen for v2 scores, and the nightmare / hell-1 "unreachable" test, which is re-evaluated, never weakened
  silently); `tests/fixtures/clue-recipes.js` (expected scores); `tests/generate.test.js:50, 716-754`;
  `tests/pack.test.js:483, 630`; `tests/worker-pool.test.js:815`. `tests/policy.test.js:371` keeps pinning `SCORE`.
- Gate GF-P2: `tests/fixtures/generation-case.json` and `tests/fixtures/generated-sample-pack.json` are re-recorded
  with the reason "P2: difficulty-v3"; the recipe expectations are updated by hand from the new measurements, with
  the reason in the commit; the v2 code goldens stay (RES-22). Then GA-P2 (`npm test`).

### RES-25. Calibration and lock (P3)

- **Order (PROC-P1 (a)).** Initial fit in MP06; activation in MP08 and MP09; tooling in MP11; generation
  qualification and the lock in MP12; then P4; MP17 is a regression run only.
- **Run (gate GL-P3, MP12; SA2-4 JC07).** First the reduced landscape of GV2 again (same boards, levels,
  `--seeds 20`, `--fresh-process`, `--output docs\difficulty-v3\landscape-v3`) for the matched comparison; then the
  **full current landscape matrix** (`buildLandscapeMatrix`: 105 cases on 16 boards at HEAD, 20 repetitions per
  case; `--output docs\difficulty-v3\landscape-v3-full`), all in shards of at most 10 minutes, run attached and
  monitored; `rate-probe` on the regenerated matching requests, verified as in RES-14. Record
  `docs/difficulty-v3/calibration-<date>.md`: every case id and its
  coverage; per level and board the distributions of G, info, Cmax, `deductionTier`, `solutions` and the v3 score,
  the hit rate, time per run and memory; capped, census-incomplete, partial and incomplete outcomes; repaired
  candidates; the order-noise table; the final knobs and every change with its before and after data. The full-matrix
  evidence is kept even where availability is poor.
- **Criteria** (plan P3 step 3): levels ordered on every board size (the median accepted v3 score strictly increases
  with the requested level on every board of the GV2 matrix); Hard and above need G >= 1 (follows from RES-18;
  tested); each Hard and Expert cell **with a GV2 baseline** keeps a hit rate of at least its GV2 hit rate minus 10
  percentage points (the unit is part of SA2-Q-P09); cells without a v2 baseline are reported, never compared with an
  invented baseline. After each knob change the quick and slow tests run again; the last change re-runs GF-P2 and
  GA-P2. The end of MP12 is the **lock**.
- **PENDING SA2-Q-P09** (what P3 may change):

| Change | Branch A (SA1 recommends) | Branch B (SA2 recommends) |
|---|---|---|
| `SCORE_V3` knobs within the RES-18 ranges | allowed | allowed |
| `DEDUCE` caps | allowed (plan:367-368) | allowed, recorded; no change of the incomplete-rating policy |
| `K60` (`core/engine/policy.js:95`), `SHARES` (`core/engine/levels.js:18`) | allowed: "not frozen; changing them is part of P3 calibration" (plan:456-457); recorded; a K60 change bumps `POLICY_ID` | only within ranges the owner approves |
| new estimator, multi-order aggregation, dropped diagnostic, carving redesign | not allowed | not allowed |

- **Tooling (MP11).** `tools/bench/runner.js` keeps the v3 metrics of accepted puzzles and renames its clue-count
  field from `G` to `clues` (`tools/bench/runner.js:687-690`; old records stay readable); `tools/bench/report.js` and
  `tools/bench/calibration-reference.js` report the v3 columns; `tests/calibration.test.js` and
  `tests/benchmark-report.test.js` follow. No pack capture: matching requests are regenerated exactly (RES-14).

### RES-26. v3 tests (P3.1, P3.2)

- `tests/difficulty-v3.test.js`, quick part (MP08, finished in MP12): the invariants of RES-18 over a grid of **valid
  metric tuples** (U, deduction tier, G, info, Cmax, `solutions`; G = 0 implies info = 0 and Cmax = 0, RES-04): G = 0
  never reaches 17; `breakdownV3` terms add up to the unrounded score with one rounding; the penalty branch selected
  by SA1-Q-P1 and the saturation branches; a JSON round trip of computed ratings reconstructs the score exactly
  (`info = log2(3)`, and a tuple whose unrounded score lies within 1e-9 of a half-integer); the worked-example table
  of the final knobs; the recipes' v3 values pinned as a characterisation (no strict monotonicity, part D item 5).
- Slow part (MP11; the test name starts with `slow:` so `npm run test:quick` skips it): generation per offered level on
  10x6 and on a 12x12 fixture board, 3 puzzles each, fixed seeds: the median v3 score increases with the level index
  and no Hard-or-above puzzle has G = 0; it also records hit and miss counts; under 10 minutes.

### RES-27. Provenance (P4.1)

**PENDING AUTH-P1** (format confirmation, including the skip encoding below). The set-origin key is agreed
(JR-P2 (a) `generation.setOrigin`; author confirmation pending). Location final (SA2-Q-P10 / SA1-Q-P4). Record agreed
by both analysts:

```text
generation.setOrigin = { schema: 1, seed, level, attempt, uniqueness,
                         versions: { algo, policy, rng, seedScheme, ratingModel } }
generation.made      = { [puzzleId]: Made }
Made = { schema: 1, kind: 'calibration' }
     | { schema: 1, kind: 'candidate', batchSeed, targetLevel, uniqueness, slot, attempt,
         start: 'witness' | 'restart', skips: Skips,
         versions: { algo, policy, rng, seedScheme, ratingModel } }
     | { schema: 1, kind: 'completion' }
Skips = { subsets: number[], repairs: number[] } | 'overflow'    // AUTH-P1 encoding branch a (SA1 recommends)
Skips = { subsets: string, repairs: string }                     // AUTH-P1 encoding branch b: base64 bitsets
```

- Both keys live in the free-form `generation` object (`core/engine/pack.js:978-979`), which every current version
  keeps; a per-puzzle field would fail `PUZZLE_FIELDS` (line 55) in current readers. Puzzle codes carry no provenance.
- **Pack limits** (SA2-4 JC08). Every current reader copies `generation` with at most 100,000 JSON nodes and
  512 KiB (`MAX_JSON_NODES`, `MAX_FILE_BYTES`, `core/engine/pack.js:30, 39`) and **fails the whole pack** above either
  (`readJsonObject`, 323-337, called at 978-979 with `generation-too-large`); the writer throws `pack-too-large` above
  512 KiB (1302-1303). Provenance therefore needs a complete byte and node bound for 100 puzzles (`MAX_PUZZLES`,
  line 37) plus the set origin; the existing limits are not raised.
- **The origin travels with the candidate.** `puzzleCandidate` and `completionCandidate`
  (`core/engine/generate.js:172-214, 222-252`) put it on the `PuzzleCandidate`; calibration reuse
  (`core/engine/generate.js:350-365`), the fold (`foldAccept`, 495-541, which may accept the slot's earlier `best`,
  line 528), the browser `accept` (`core/browser/generation-client.js:854-866`) and the Generator state carry it
  unchanged; `checkOutcome` (872) checks its shape. `start` is the observed outcome: a restart can fall back to the
  witness (`core/engine/generate.js:178-189`).
- **Skips, defined by execution** (SA2-4 JC08):
  - *Subset ordinal*: the 0-based index, within one `selectClues` call, of a `rateSubset` call that passed the
    budget and repeat checks and executed `tried.add` (`core/engine/clues.js:207-210`). A subset skip is such a call
    whose clue key is in `excludeClueKeys` (line 213); it is recorded there, before rating, and replay skips at the
    same point.
  - *Repair ordinal*: the 0-based index of an executed `finish` in `require` mode; memoised finishes (`finishOnce`,
    RES-15) get no ordinal. A repair skip is an executed finish whose repaired clue key is in `excludeClueKeys`; it is
    decided **after** `makeUnique`, its RNG draws and the repaired rating, and replay executes the same repair,
    rating and draws before it rejects at the recorded ordinal.
  - Bounds come from the loop limits: subset ordinals < 2,128 and repair ordinals < 64
    (`core/engine/clues.js:260-366`), not from the number of excluded keys: two subsets can share a clue key on a
    repeated-shape set, and two repairs can reach the same excluded key.
  - Validation: strictly increasing integers within the bounds; during replay every recorded skip is consumed
    exactly. An unsorted, duplicate, out-of-bound, unreachable or unused entry makes the record invalid (stages 4-6
    `unavailable`) or the replay a `mismatch`; it is never ignored silently.
  - **Encoding, PENDING AUTH-P1.** Branch a (SA1 recommends): integer lists of at most 64 subset and 16 repair
    ordinals per puzzle; above either, `skips: 'overflow'` and stages 4-6 of that puzzle are unavailable; bound about
    80 KB and 10,000 JSON nodes for 100 puzzles. Branch b: base64 little-endian bitsets of 2,128 and 64 bits per
    puzzle (about 370 characters, two nodes); no overflow state; about 65 KB and 2,000 nodes for 100 puzzles. SA2
    accepts either. In both branches the writer drops `generation.made` (and keeps `setOrigin`) when the serialized
    pack would otherwise exceed 512 KiB; the replay then reports stages 4-6 unavailable.
- **Set origin.** The Generator keeps the winning set attempt (`generateSet`'s `attempt`,
  `core/browser/generation-client.js:697`, ignored today by `generator/jobs.js:283-296`; no attempt in
  `generator/state.js:50`), persists it in the saved state (`generator/state.js:869-871`, `readSavedSet` 885) and
  writes `generation.setOrigin` with the versions of the set's creation; it is never re-stamped at export
  (`generationOf`, `generator/state.js:1300-1328`, keeps writing the current versions in its existing keys). The CLI
  client writes it too (`core/browser/generation-client.js:336-360`). JR-P2 branch b (reuse the existing set keys and
  stop re-stamping them, with immutable set versions) is the alternative SA2 calls workable if specified; neither
  analyst recommends it.
- **Stage availability** (shown by the dialog; SA2-4 JC11): stages 1-3 iff `setOrigin` exists, its versions equal the
  running code's and the regenerated set equals the pack's pieces and witness; stages 4-6 iff the record is
  `candidate`, its skips are valid and not `'overflow'`, and its versions equal the running code's (set and witness
  come from the pack); stage 7 always. For a `calibration` puzzle the set-origin replay exposes the calibration's own
  clue and repair events, labelled calibration, with no retile stage; `completion` puzzles and puzzles without a
  record show stages 1-3 (if available) and 7.
- Limitation (documented): a Generator older than this change drops `generation.made` and `generation.setOrigin`
  when it re-exports a pack.
- Fixture (gate GF-P4): `tests/fixtures/generated-sample-pack.json` comes from special sample streams
  (`tools/record-fixtures.mjs:132-165`) and gets no ordinary provenance. A new `tests/fixtures/replay-case.json` is
  recorded through the ordinary client path by a new mode of `tools/record-fixtures.mjs`.
- Tests: pack round trip of both keys; a fold that accepts an earlier best keeps that candidate's origin; calibration
  reuse; mixed target levels and uniqueness in one pack; saved-set reload and export; duplicate-shape aliases (two
  subsets with one clue key, both skipped and recorded); repaired exclusions; memoised finishes without ordinals;
  malformed ordinals; overflow (branch a); a near-limit pack (the writer drops `generation.made`, the pack stays
  valid in current readers); malformed or oversized records are ignored with a warning and never replayed, and the
  puzzle stays usable.

### RES-28. Recorders (P4.2)

- Opt-in observers, separate from control hooks: `record?: (event) => void` on `setAttempt`
  (`core/engine/generate.js:86-139`), `puzzleCandidate`, `carveMacro` (`core/engine/carve.js:494`; a new observer
  beside its control hooks, 514-523), `carveFlatSet` (281) and `carveFlat` (105, no hooks today), `lnsWalk`
  (`core/engine/tiling.js:473`), `selectClues` (`ctx.record`; also the set calibration's call) and `makeUnique`
  (`core/engine/clues.js:111-151`).
- Replay control, separate: `ctx.replaySkips` makes `selectClues` skip exactly the recorded ordinals instead of
  consulting `excludeClueKeys`, at the points defined in RES-27 (a subset skip after the budget and repeat checks and
  `tried.add`, before rating; a repair rejection after the repair, its RNG draws and its rating).
- **Detail channel** (SA2-4 JC09): with a recorder present, every rating that `selectClues` and the repair make
  (ordinary subsets, repaired sets, the set calibration's) uses `rateDetailed` (RES-19), and the event carries the
  owned `detail`, copied before the workspace is reused; there is no second solve. Without a recorder, `rate` is
  used as today.
- Events are plain owned JSON (no typed-array views, carve sets, RNG instances or functions) and are never mutated
  after delivery. A rated event is an observation, not a selection; the winner is announced by a later `selected`
  event (`repairSequence` null when no repair changed the clues). `source` is `'calibration'` or `'candidate'`;
  `band` is `{ min, max }` with `max: null` for an unbounded band (RES-15).

  ```text
  { stage: 'set', kind: 'count', range, k }
  { stage: 'set', kind: 'carve', mode, parts }
  { stage: 'set', kind: 'piece', cells }                                  // accepted regions only
  { stage: 'layout', kind: 'retile', step, liftedIds, changed, layout }
  { stage: 'clues', kind: 'rated', source, phase, sequence, clueIds, rating, detail, band }
  { stage: 'clues', kind: 'skip', source, sequence }
  { stage: 'unique', kind: 'repair', source, repairSequence, addedId, clues, rating, detail, accepted }
  { stage: 'clues', kind: 'selected', source, sequence, repairSequence }
  ```

  `phase` is `'sample'`, `'seed'` or `'beam'`.
- Must: recorder off and on give identical sets, puzzles and RNG draws, with 1 and 4 workers. Tests
  (`tests/replay-recorders.test.js`): that equality; complete final-path detail on rated events; repair detail; the
  `selected` event names the accepted candidate and repair; calibration events carry `source: 'calibration'`.

### RES-29. Replay engine and worker task (P4.2)

- New pure module `core/engine/replay.js` exporting `replayPuzzle(input, workspaces, limits = REPLAY)`, with
  `input = { set, puzzle, generation }` and `workspaces = { ws, scratch }` (a main and a scratch workspace like
  generation; scratch capacity affects restarts and local re-tiling). It returns:

  ```text
  ReplayResult = { status: 'matched' | 'unavailable' | 'mismatch' | 'incomplete', reason,
                   stages: { set, candidate, final }, compared: string[], steps: Step[] }
  ```

- Preflight versions and stage availability (RES-27) before expensive work. Stages 1-3 re-run `setAttempt` from the
  set origin with a recorder; stages 4-6 re-run `puzzleCandidate` from the record with `replaySkips`.
- **Final comparison** (SA2-4 JC11), exact: the board; per piece its canonical geometry and its mapping to the pack's
  piece ids; the set witness; the final clue poses (not only the symmetry-quotiented `clueKey`); the rating model
  and its scoring inputs; and the stored complete solution when the pack has one. `compared` lists exactly the fields
  that were compared; without a stored solution (`omitSolutions` packs) the solution is not claimed as verified. Only
  a full trace whose comparison passes is `matched`; a partial trace never is.
- `Step = { stage, kind, board: { placed, lifted, clues }, rating, breakdown, band, note, args }`: plain JSON,
  structured-clone safe, no text (`note` is a locale key); unrated states (carving, re-tiling) have `rating: null`.
- Bounds: `REPLAY = Object.freeze({ maxSteps: 4096, maxBytes: 4 * 1048576, work })` in `core/engine/policy.js`, all
  provisional test defaults (RES-01) that MP15 checks on the largest fixture. `work` bounds the total computation of
  one replay: the sum of the `work` counters of every rating (census included) and the trial counters of every
  uniqueness repair, plus one per recorder event; it is checked after every rating and event (carving and tiling stay
  bounded by their own budgets). Exceeding any bound gives `status: 'incomplete'` (reason `steps`, `bytes` or `work`)
  with the steps so far; cancellation is checked at every event.
- Worker task kind `replayPuzzle`: `core/engine/protocol.js` (`TASK_KINDS`, lines 17 and 34-37; the payload field
  table near 660; a bounded payload reader like those from 557) and `core/engine/tasks.js` (`executeTask`, 152-208),
  submitted as an auxiliary request (below).
- **Auxiliary requests** (SA2-4 JC10; the derived display rating of RES-23 and the replay). Contract for both
  branches: an auxiliary request never calls `beginRequest` or `cancelAll` while a generation request is active
  (`beginRequest` supersedes every earlier entry, `core/browser/worker-pool.js:575-588`; the client's `cancel()`
  cancels the whole pool, `core/browser/generation-client.js:1190-1194`); it is cancelled through its own
  `AbortSignal`; starting or closing it never cancels generation, verification, hints or certificates; a new
  generation may supersede or queue it. **PENDING JR-P4**, the mechanism:
  - Branch a (SA1 recommends): an auxiliary method on the existing client, for example
    `submitAuxiliary(kind, payload, { signal })` in `core/browser/generation-client.js`, and the same in the Player's
    pool wrapper (`player/state.js`). It waits while a generation or verification request is active, then runs as an
    idle task under the client's current valid token without `beginRequest`; it ends when its signal aborts, and is
    aborted (reported as cancelled) when a new generation or verification begins. No extra worker or memory.
  - Branch b: a separate one-worker pool instance for auxiliary requests, created on first use and disposed when
    idle, with its own memory budget (a main and a scratch workspace, 160 MiB and 32 MiB today,
    `core/engine/policy.js:76-77`) and a fallback when no worker can be created (the display rating keeps the stored
    claim; the replay reports unavailable). It costs memory on phones.
  - SA2 accepts either branch provided the choice is made before MP10. MP10 builds the mechanism; MP15 adds the
    `replayPuzzle` kind to it.
  - **SA1 note on JC10.** SA2-4 requires the mechanism to be specified before MP10 and MP15 are dispatched and offers
    both forms without choosing. The report specifies both and asks the plan author (JR-P4). SA1 recommends a
    because a second pool adds a worker with its own main and scratch workspaces (160 and 32 MiB today,
    `core/engine/policy.js:76-77`) on phones, while the existing pool already has the request and token model the
    queue needs (`core/browser/worker-pool.js:575-588`).
- Tests (`tests/replay.test.js`, `tests/tasks.test.js`, `tests/protocol.test.js`, `tests/generation-client.test.js`):
  every puzzle of a freshly generated 10x6 pack replays `matched` and its last step equals the puzzle; a version
  mismatch gives `unavailable`; a known differing replay gives `mismatch` (a tampered attempt is not a valid general
  mismatch fixture: it can produce the same puzzle); a stored-solution mismatch; a pack without solutions (`compared`
  lists what was matched); total-work exhaustion before many events, and the step and byte caps (`incomplete`);
  cancellation; malformed provenance; calibration reuse and completion fallbacks; structured cloning; determinism;
  overlapping work (a replay during a generation and a generation during a replay follow the auxiliary contract).

### RES-30. Score tables and views (P4.3)

- Every rated step and the final puzzle show the `breakdownV3` table: base(U), rule (deduction tier and the counts
  R1-R9), guess (G, info and, from the recorded `detail` of RES-28, the alternatives `choices` and, under RES-05
  branch B or B', the census of each guess node), penalty (`solutions`, or the branch-C formula), the rounded total
  and the band. A summary claim shows the total only; a legacy v2 final claim shows `2U`, `8 log10(1 + B)` and the
  total with the frozen v2 constants. Data that is not available (a summary claim, a stage without a trace) is
  labelled unavailable and never shown as zero (SA2-4 JC09).
- Views: **compact** (stage boundaries, repairs, strict best-so-far improvements under the P1 comparator `ranked`,
  and the final puzzle) and **every step** (all recorded rated candidates, out-of-band ones and failed repairs
  included). Ties are deterministic. An `incomplete` or `mismatch` result is shown with its status; neither view
  presents a partial endpoint as the verified generated puzzle (SA2-4 JC11).

### RES-31. Generation Steps dialog (P4.4)

- New `generator/ui/replay-dialog.js`, wired through `generator/app.js` and `generator/ui/puzzle-panel.js`.
  `createCard` (`generator/ui/puzzle-panel.js:287-296`) builds `li.puzzle-card` containing `button.card-select` and
  `button.card-remove`; the "How it was made" button is a **third button inside that same `li`**, not inside the
  select button and not a direct child of the list. Selection, removal, focus return and keyboard order are kept; a
  DOM and accessibility test asserts this nesting (SA2-4 JC13).
- The board uses `core/browser/svg-board.js` with an additive `highlightedIds` option (it supports one `selectedId`
  today, lines 34-44) and renderer tests. Controls: previous, next, play, a labelled slider, the step sentence, the
  stage availability message and the score table; a live region that does not announce animation ticks; focus trap,
  Escape, focus return, scrolling and theme as the existing dialogs (`core/browser/share-dialog.js`, design §11.11).
  Closing stops playback and cancels only the replay request, through its own signal (RES-29); it never cancels a
  generation.
- Strings in `generator/locale.en.js` and `generator/locale.vi.js` (parity: `tests/generator-i18n.test.js`); styles in
  `generator/generator.css`.
- Browser page `tests/browser/replay.html` with `tests/browser/replay.js` (each check logs its start and finishes
  within 1 minute): open, step, play, slider, keyboard, cancel, unavailable stages, the explicit `incomplete` and
  `mismatch` states, language switch.

### RES-32. Documents

| Task | `docs/design-detail.md` | Other living documents |
|---|---|---|
| MP01 | the `Model` type (lines 410-412) and the `workspace.js` note (383-387): new fields, `deduce.*` slots | - |
| MP02 | new §7.9 "Deduction solver" after §7.8 (line 1578; §8 starts at 1588): state, ladder, R1, R2, R3 check, R6, guesses, statuses, caps, work and memory (SA2-4 JC12) | - |
| MP03, MP04 | §7.9: the rules R3 place, R4-R9 with their preconditions, tiers and rule counts | - |
| MP04b | §7.9: identical shapes (RES-09 branch B or C) | - |
| MP05 | §7.9: the guess measure (RES-05 branch) and the census | - |
| MP06 | - (the record `probe-<date>.md` is new) | `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`: `deduce.js`, `rate-probe.mjs` |
| MP07 | §5.5 (line 751), §6.10 (1314), §6.11 (1364), §7.6 (1564) | `docs/design-brief.md` where it describes clue selection |
| MP09 | §7.1-7.3 (1389, 1403, 1433): v3 replaces v2 with a short "v2 (historical)" paragraph, linking §7.9; §7.7 (1571); §7.8 (1578); §14.1 (2566); claim versus display rating | `docs/design-brief.md` difficulty paragraph; `USERGUIDE.md`, `USERGUIDE.vn.md` where the score, the levels or "+" are explained; `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` |
| MP10 | §7.7 (display rating), §8.1 (1590): auxiliary requests (RES-29), the Player and Generator sections that show ratings | `USERGUIDE.md`, `USERGUIDE.vn.md` (re-rated note) |
| MP12 | §7.8: measured v3 parameters and availability | - |
| MP13-MP16 | §5.2 (619), §5.5 (756), new §6.12 "Generation Steps (replay)", §8.1 (1590), §10.5 (1996), §11.11 (2269); MP14 adds `rateDetailed` and the recorder events to §7.9 | `docs/design-brief.md`; `USERGUIDE.md`, `USERGUIDE.vn.md` (feature); `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` (modules); `README.md` feature line |

### RES-33. Out of scope

- Rule-based Player hints (plan P0.2b, last paragraph; SA2-Q-P11 (a)).
- Placement-weighted clue sampling (RES-16).
- A compact v3 puzzle-code codec (RES-22).
- A production median over several search orders (RES-13).
- Quotienting identical shapes, unless RES-09 branch B or C is chosen.
- Replaying stages 4-6 of completion-pass puzzles (RES-27).

---

## 4. Errata of the plan

Part D of `clarifications.md` (D1-D14) folded in with the analysts' other corrections. Both analysts accept every
row; the plan author may object to any of them.

| E | Plan text | Correction | Part D | RES |
|---|---|---|---|---|
| E01 | §1.1: 10x6 hard piece sizes "5..8" | 4..9 for its own seed `probe1` | - | - |
| E02 | header: companion path | obsolete; each project lives at its own repository root | - | - |
| E03 | §1.2: hints use the "most constrained piece" | the hint maximises contact with occupied, blocked and border cells in a known solution; it counts no placements | - | - |
| E04 | §3 rule 6, P2.2: the protocol must accept v3 metric fields | no protocol change for v3 metrics; the replay task kind is a protocol change | D3 | RES-20 |
| E05 | P0.1: the exposed fields; "`deduce.js` imports only `./policy.js`" | add `rowCount`, `width`, `height`, `pieceSizes`, the liveness check; `deduce.js` also imports the liveness check of `tiling.js` | D11 | RES-02 |
| E06 | P0.2: `stop`, `solutions`, `saturated = stop === 'node-cap'` | separate path, count and census statuses; a cap with 2 <= S < limit is `few`; saturated only before the first solution | D2, D9 | RES-04 |
| E07 | P0.2: the node cap bounds the cost | deterministic work and memory caps as well | - | RES-10 |
| E08 | P0.2 test: 3x2 P + monomino gives F = 1, unique | only with the monomino clued at (0, 0) | - | RES-11 |
| E09 | P0.2 test: G and Gt non-decreasing over the recipes | a pinned characterisation, not a theorem | D5 | RES-11 |
| E10 | P0.2b: R3 "place", R7 sums, R9 | the sound conditions of RES-06 and RES-07 | D1, D10 (first half) | RES-06, RES-07 |
| E11 | part D item 10, second half: R4 and R5 as one rule with cell-to-cell | superseded: piece/cell pairings only | D10 (second half) | RES-06 |
| E12 | P0.2b: group identical shapes by `canonicalKey` in R4/R5/R9 | ill-defined; rules stay per labelled piece; the quotient is an owner question | - | RES-09 |
| E13 | P0.2b: soundness checked against "a known solution" | against every solution of tiny boards | - | RES-11 |
| E14 | P0.3: `Bk` under "k seeded row orders" | the seeded DLX also changes the column ties; the deduction gets its own tie study | - | RES-12, RES-13 |
| E15 | P1 step 1: acceptance | the explicit state machine of RES-15 (memoised repairs, exclusion check) | - | RES-15 |
| E16 | P1 step 2: the bias direction and `buildModel(board, pieces, [], ws).placementsPerPiece` | uniform sampling; if ever reopened, `countPlacements(preparePlacements(...))` copied at once | D7, D13 | RES-16 |
| E17 | P1 gate: fixtures read by `tests/generate.test.js` ~719-754 | read at 47-48, asserted at 716-754 | - | RES-17 |
| E18 | P1: no version change | `ALGO_ID` `gen-v3` | D13 | RES-17 |
| E19 | P2.1: `base: { max: 16 }` versus the equation's 12 | 12; `base.max + rule.max <= 16` | - | RES-18 |
| E20 | P2.1: one binary guess "about 20", two "about 30" | 18 / 20 / 22 and 28 / 30 / 32 by deduction tier | - | RES-18 |
| E21 | P2.1 / P0.2b: `tier` 4 for a guess and "tier >= 3 -> 4" | the rule term uses the deduction tier only | - | RES-08 |
| E22 | P2.1: a = 6, b = 4 | starting values; with them the Hard, Expert and Master recipes rate two bands high and Easy and Normal one band low; fit before activation | D8 (corrected: Normal 9; no universal factor) | RES-14, RES-18 |
| E23 | P2.1: "`SCORE.model` likewise" | `SCORE` stays v2; `MODEL` and `SCORE_V3` are v3 | - | RES-19 |
| E24 | P2.1: the metrics list | `MetricsV3` of RES-19 (info, tiers, rules, statuses, `dlxStop`) | D2 | RES-19 |
| E25 | P2.3: `readMetricsV2` 734-749 | 734-764 | - | - |
| E26 | P2.4: "no change"; the acceptance page lists the limits | summary claims in codes and a reader that accepts them; the limits are in code (`core/engine/puzzlecode-input.js:12`, `core/engine/sharecode.js:11-13`, `core/browser/qr.js:47-56`) | - | RES-22 |
| E27 | P2 gate: re-record the code goldens | keep the v2 goldens; add v3 cases | D6 | RES-22 |
| E28 | P2: the tests it breaks | the full list of RES-24 | D12 | RES-24 |
| E29 | P2.5, P4.4: strings in `player/strings.js`, `generator/strings.js` | the locale files `*/locale.en.js`, `*/locale.vi.js` | - | RES-23, RES-31 |
| E30 | P3.3: `calibrate.mjs --profile landscape` | `--output` is mandatory and goes under `docs/difficulty-v3/` (never `docs/calibration/`); the runner saves no packs | D4 | RES-14, RES-25 |
| E31 | §4 order "P0 -> P1 -> P2 -> P3" with calibration after P2 | fit before activation; lock before P4 | - | RES-14, RES-25 |
| E32 | P4.1: "only the set records `setAttempt`" | only the CLI client writes it; the Generator keeps no attempt | - | RES-27 |
| E33 | P4.1: a per-puzzle `made` written where a candidate is accepted | `generation.made`; the origin travels with the candidate from its creation | - | RES-27 |
| E34 | P4.1: `start: 'completion'` and "steps not available" for completion puzzles | completion puzzles show stages 1-3 (if available) and 7 | - | RES-27 |
| E35 | P4.1 / P4 tests: the sample pack gains `made` | special sample streams; a new ordinary replay fixture | - | RES-27 |
| E36 | P4.2: `replayPuzzle(set, puzzle, generation, ws) -> { steps, match }` | two workspaces, four statuses, a total work bound, an exact comparison with a `compared` list | - | RES-29 |
| E37 | P4 test (c): a tampered `made.attempt` gives a mismatch | use a version mismatch or a known differing replay | - | RES-29 |
| E38 | P4.3: "every step (all rated subsets, up to 64)" | repairs and set calibration are outside the 64; steps, bytes and total work bounded separately | - | RES-29, RES-30 |
| E39 | P4.4: the board highlights the lifted group; a button on each card | an additive `highlightedIds`; the button is a third button inside the card's `li.puzzle-card`, beside `button.card-select` and `button.card-remove` | - | RES-31 |
| E40 | §5: "median of 3 tie-break variants" if G varies | measured and reported; no production median without the owner | D14 | RES-13 |

---

## 5. Agreed task breakdown

SA1-3 §5 (MP01-MP14 with MP02b) and SA2-3 §4 (P-01 to P-15) reconciled; SA2-4 §4 accepts MP01-MP17 with the
conditional MP04b and the corrections of JC12. Adopted from SA2: the rules split in two tasks, the conditional
quotient task, the census after the rules, the summary codes inside activation, the display rating before the
calibration tooling, recorders and replay in separate tasks. Kept from SA1: the v2 baseline inside the probe task;
the dialog and the final evidence as separate tasks (each is large enough on its own, and the final gate belongs to
the last task). Dropped: the compact codec task (summary codes agreed). The breakdown has 17 numbered tasks (MP05's
scope depends on SA1-Q-P1) plus the conditional MP04b.

Every task: one developer holds the repository; the task ends with `npm run test:quick` and `npm run check` green
(never two runs at once), the living documents of RES-32 updated in both languages and tool-written files
normalised to CRLF. **Commits** (SA2-4 JC12): the developer never stages, commits, stashes, resets, pushes or
switches branches; the orchestrator re-runs the quick checks, reviews the change, records it and commits each
accepted task on `rating-v3` with the message `difficulty-v3 MPnn: <title>`; nothing is pushed. Sizes: S about
100-300 changed lines, M 300-800, L 800-1,600 including tests and docs; a task that outgrows L is split before
dispatch. Agent hours are developer-agent working time, excluding machine time of gates.

### 5.1 Tasks

| ID | Title and scope | Depends on | Files owned (exclusive while active) | Gates | Size, agent h | Acceptance focus | SA1-3 / SA2-3 |
|---|---|---|---|---|---|---|---|
| MP01 | Model metadata (P0.1; RES-02; RES-10 slot names) | - | `core/engine/tiling.js`, `core/engine/workspace.js` (header comment only), `core/engine/placements.js` (only if a field is missing), `tests/tiling.test.js`, `tests/workspace.test.js`, `docs/design-detail.md` (RES-32) | - | S-M, 1-2 | fields equal the plan's; stale model refused; no output change | MP01 / P-01 |
| MP02 | Deduction core, non-production (P0.2; RES-03, RES-04, RES-10, RES-11): state, R1, R2, R3 check, R6, MRV guess, statuses with `prefix` and `rows`, work and memory in `deduce.*` slots, provisional `DEDUCE` | MP01 | `core/engine/deduce.js` (new), `DEDUCE` in `core/engine/policy.js`, `tests/deduce.test.js` (new), `tests/policy.test.js`, `docs/design-detail.md` (new §7.9) | - | L, 5-8 | tiny exact solution sets; invariance; caps; undo; valid metric domain; accounted buffers | MP02 / P-02 |
| MP03 | R3 place, R4, R5 (P0.2b; RES-06, RES-08) | MP02 | `core/engine/deduce.js`, `tests/deduce-rules.test.js` (new), `docs/design-detail.md` (§7.9) | - | M, 3-4 | positive and near-miss boards; all-solutions oracle | MP03 / P-03a |
| MP04 | R7, R8, R9, tiers, rule counts, oracle on every rule (P0.2b; RES-07, RES-08, RES-11) | MP03 | `core/engine/deduce.js`, `tests/deduce-rules.test.js`, `docs/design-detail.md` (§7.9) | - | L, 5-7 | R9 regression board; parity and neck boards | MP03 / P-03b |
| MP04b | *Conditional* (RES-09 branch B or C): guess classes by placement multisets, and S by solution keys under B | MP04; SA2-Q-P03 | `core/engine/deduce.js`, `shapeGroup` in `core/engine/tiling.js` and `core/engine/placements.js`, `tests/deduce-rules.test.js`, `docs/design-detail.md` (§7.9) | - | L, 5-8 | the 2x2, 3x2 and pocket counts; no identity guess; orbit preservation | - / P-03c |
| MP05 | *Conditional* (RES-05): decisive census (branch B, B'), or the raw-metric contract check (branch A) | MP04 (MP04b); SA1-Q-P1, or the owner's request for data first | `core/engine/deduce.js`, `census` in `core/engine/policy.js`, `tests/deduce-census.test.js` (new), `docs/design-detail.md` (§7.9) | - | L, 4-6 (A: S, 1) | unique puzzles unchanged; a free node adds nothing; a cut probe leaves u; census cutoff independent of the count | MP02b / P-04 |
| MP06 | Probe, order study, cap and census rates, `DEDUCE` values (allowed under both SA2-Q-P09 branches), candidate knobs explored and proposed, v2 baseline (P0.3; RES-10, RES-12-RES-14) | MP05 | `tools/rate-probe.mjs` (new), `tests/rate-probe.test.js` (new), the `tieOrder` diagnostic in `core/engine/deduce.js`, `DEDUCE` values in `core/engine/policy.js`, `docs/difficulty-v3/probe-<date>.md` and `docs/difficulty-v3/baseline-v2/` (new), `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | GV2 | M, 3-5 | the three answers of plan P0.3; proposed knobs; confusion matrix; regenerated requests verified | MP04 / P-05 |
| MP07 | Centre-seeking acceptance and `gen-v3` (P1; RES-15-RES-17) | MP06; SA2-Q-P04 confirmation | `core/engine/clues.js`, `core/engine/version.js`, `tests/clues.test.js`, `tests/generate.test.js`, `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json`, `docs/design-detail.md`, `docs/design-brief.md` | GF-P1, GA-P1 | M-L, 3-5 | centre test; `require` fallbacks; 1 and 4 workers | MP05 / P-06 |
| MP08 | Pure v3: `breakdownV3`, `scoreV3`, fitted `SCORE_V3` within the approved ranges, v3 types; the default stays v2 (P2.1, P2.2; RES-18, RES-20, RES-26 quick part) | MP07; SA1-Q-P1, JR-P3 | `core/engine/difficulty.js` (new exports only), `SCORE_V3` in `core/engine/policy.js`, `core/engine/types.js`, `tests/difficulty-v3.test.js` (new), `tests/policy.test.js` | - | M, 2-3 | valid-tuple invariant grid; worked examples; one rounding; exact JSON round trip | MP06a / P-07 |
| MP09 | Activate v3: `measureV3`, `rate`, `MODEL`, v2 renamed, pack v3 and v2 legacy, summary code claims, pinned tests, docs §7 (P2.1-P2.4; RES-04, RES-19, RES-21, RES-22, RES-24) | MP08; SA2-Q-P02 | `core/engine/difficulty.js`, `core/engine/pack.js`, `core/engine/puzzlecode.js`, `core/engine/clues.js` (RES-04 handling only), `tests/difficulty.test.js`, `tests/pack.test.js`, `tests/puzzlecode.test.js`, `tests/clues.test.js`, `tests/fixtures/clue-recipes.js`, `tests/generate.test.js`, `tests/worker-pool.test.js`, `tests/protocol.test.js`, generation fixtures, `docs/design-detail.md`, `docs/design-brief.md`, `USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | GF-P2, GA-P2, GC-P2 (format) | L, 6-9 | full suite green; v2 goldens unchanged; cross-field reader checks; code sizes recorded | MP06b, MP09 / P-08 |
| MP10 | Derived display rating and the auxiliary request mechanism (P2.5; RES-23, RES-29 auxiliary contract) | MP09; JR-P1, JR-P4 | `player/state.js`, `player/app.js`, `player/strings.js`, `player/locale.en.js`, `player/locale.vi.js`, `generator/state.js`, `generator/jobs.js`, `generator/ui/puzzle-panel.js`, `generator/strings.js`, `generator/locale.en.js`, `generator/locale.vi.js`, `core/browser/print-dialog.js`, `core/browser/generation-client.js`, `core/browser/worker-pool.js` (only if JR-P4 needs it), `tests/player-load.test.js`, `tests/generator-import.test.js`, `tests/print-details.test.js`, `tests/player-i18n.test.js`, `tests/generator-i18n.test.js`, `tests/generation-client.test.js`, `tests/worker-pool.test.js`, `docs/design-detail.md` (§7.7, §8.1), user guides | GC-P2 (display) | L, 6-9 | stored claim never changed; stale replies dropped; overlapping work never cancels generation or verification | MP10 / P-09 |
| MP11 | Calibration tooling and the slow test (P3.2; RES-25, RES-26) | MP10 | `tools/bench/runner.js`, `tools/bench/report.js`, `tools/bench/calibration-reference.js`, `tests/calibration.test.js`, `tests/benchmark-report.test.js`, `tests/difficulty-v3.test.js` (slow part) | - | M-L, 3-5 | old records readable; slow test under 10 minutes | MP07 / P-10 |
| MP12 | Calibration run and **lock** (P3; RES-25, RES-26) | MP11; SA2-Q-P09 (JR-P3 answered before MP08) | knob values in `core/engine/policy.js` (`SCORE_V3`, `DEDUCE`; `K60` and `POLICY_ID` only per SA2-Q-P09), `SHARES` in `core/engine/levels.js` (only per SA2-Q-P09), generation fixtures, `tests/difficulty-v3.test.js`, `docs/difficulty-v3/calibration-<date>.md`, `docs/difficulty-v3/landscape-v3/` and `docs/difficulty-v3/landscape-v3-full/` (new), `docs/design-detail.md` | GL-P3 (GV2 slice, then the full landscape); GF-P2 and GA-P2 again | M, 3-5 | the criteria of RES-25 met or recorded; full-matrix evidence kept | MP08 / P-11 |
| MP13 | Provenance (P4.1; RES-27) | MP12; AUTH-P1, JR-P2 | `core/engine/generate.js`, `core/engine/types.js`, `core/engine/clues.js` (skip ordinals), `core/engine/pack.js` (provenance checks; the writer's size fallback), `core/browser/generation-client.js`, `generator/state.js`, `generator/jobs.js`, `tools/record-fixtures.mjs`, `tests/generation-client.test.js`, `tests/generator-state.test.js`, `tests/pack.test.js`, `tests/fixtures/replay-case.json` (new), `docs/design-detail.md` | GF-P4 | L, 7-10 | origins survive the fold, reload and export; skips bounded and consumed exactly; a near-limit pack stays valid | MP11 / P-12 |
| MP14 | Recorders and the detail channel (P4.2; RES-19 `rateDetailed`, RES-28) | MP13 | `core/engine/carve.js`, `core/engine/tiling.js` (`lnsWalk`), `core/engine/clues.js` (`record`, `replaySkips`), `core/engine/generate.js`, `core/engine/difficulty.js` (`rateDetailed`), `core/engine/types.js` (`RatingDetail`, event types), `tests/replay-recorders.test.js` (new), `docs/design-detail.md` (§7.9) | - | L, 6-9 | recorder off and on identical; detail from the same measurement; `selected` events | MP12 / P-13 |
| MP15 | Replay engine and worker task (P4.2, P4.3 data; RES-29, RES-30) | MP14; JR-P4 | `core/engine/replay.js` (new), `REPLAY` in `core/engine/policy.js`, `core/engine/tasks.js`, `core/engine/protocol.js`, `core/browser/generation-client.js` (the new kind on the auxiliary path), `tests/replay.test.js` (new), `tests/tasks.test.js`, `tests/protocol.test.js`, `tests/generation-client.test.js`, `docs/design-detail.md` | - | L, 7-10 | `matched` on fresh packs; `unavailable`, `mismatch` and `incomplete` (work); stored solution compared | MP12 / P-14 |
| MP16 | Generation Steps dialog (P4.3 views, P4.4; RES-30, RES-31) | MP15 | `generator/ui/replay-dialog.js` (new), `generator/app.js`, `generator/ui/puzzle-panel.js`, `generator/generator.css`, `core/browser/svg-board.js`, `generator/locale.en.js`, `generator/locale.vi.js`, `tests/browser/replay.html` and `tests/browser/replay.js` (new), affected UI tests, `docs/design-detail.md`, `docs/design-brief.md`, guides, `README.md` | GB-P4 | L, 6-9 | keyboard and screen reader; the button inside `li.puzzle-card`; explicit incomplete and mismatch states; checks under 1 minute | MP13 / P-15 |
| MP17 | Final compatibility and regression evidence (plan §7, last item) | MP16 | justified final fixture, test and doc corrections; `docs/difficulty-v3/final-<date>.md` (new) | GZ | M, 2-4 | no Hard-or-above puzzle with G = 0; levels ordered on 10x6 and 20x18; no scoring change since the lock | MP14 / P-15 |

### 5.2 Order, lock point and answers needed

```text
MP01 -> MP02 -> MP03 -> MP04 -> [MP04b] -> MP05 -> MP06 -> MP07 -> MP08 -> MP09
     -> MP10 -> MP11 -> MP12 (lock) -> MP13 -> MP14 -> MP15 -> MP16 -> MP17
```

- **Knobs.** Candidate values explored in MP06; production values written in MP08 within the ranges approved under
  JR-P3, active from MP09; **locked at the end of MP12**. The provisional `DEDUCE` and `REPLAY` values are test
  defaults until MP06 and MP15 measure them (RES-01). After the lock, a change to a weight, cap, rule, counter, the
  clue search, `SHARES` or `K60` needs a new model, algo or policy id and a new qualification (RES-01); MP13-MP17
  must not change any rating or generated puzzle (the recorders are observers; provenance does not change outputs).
- **Answers needed before a task starts:** SA2-Q-P03 before MP04b (or MP04 ends the rules without it); SA1-Q-P1
  before MP05, or the owner asks for the prototype data, and in all cases before MP08; JR-P3 before MP08 (MP06 only
  explores candidate values before it); the confirmation of SA2-Q-P04 before MP07; SA2-Q-P02 before MP09; JR-P1 and
  JR-P4 before MP10; SA2-Q-P09 before MP12 (and before MP06 or MP08 sets anything beyond `DEDUCE` and `SCORE_V3`);
  AUTH-P1 and JR-P2 before MP13.
- **Tasks MP01-MP04 need no answer** (SA2-4 JC12): they build non-production solver code only (nothing in generation
  or rating calls `measureDeduction` before MP09) and must not resolve SA2-Q-P02, SA1-Q-P1 or SA2-Q-P03 in code.
  MP02 implements the three statuses, `prefix` as a diagnostic and the raw counters; the branch-specific behaviour
  lands in MP04b, MP05 and MP09.
- **Parallelism.** None inside the repository: the tasks share `core/engine/policy.js`, `core/engine/deduce.js`,
  the fixtures, `tests/artifacts/` and the living documents, and some arrows serialise file ownership rather than
  express an algorithmic need. This chain runs in parallel with the Sudoku chain; timing-sensitive runs of the two
  repositories are never run at the same time.

### 5.3 Gates (pre-approved; run by the owning task)

| Gate | Task | Command or check | Record |
|---|---|---|---|
| routine | every task | `npm run test:quick`; `npm run check` | counts, failures, duration |
| GV2 | MP06 | `node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --cases "<regex>" --output docs\difficulty-v3\baseline-v2`, shards of at most 10 minutes over 6x10, 10x10, 12x12 and `18x20`, easy to master; `rate-probe` on regenerated matching requests verified against `resultDigest` (RES-14) | `probe-<date>.md`: hit rates, times, distributions, identity checks |
| GF-P1, GA-P1 | MP07 | `node tools\record-fixtures.mjs --replace --reason "P1: clue selection aims at the band centre"`; then `npm test` | old and new versions; why pieces, layouts or clue keys moved |
| GF-P2, GA-P2 | MP09 (again in MP12 after the last knob change) | `node tools\record-fixtures.mjs --replace --reason "P2: difficulty-v3"`; recipe expectations by hand; v3 code cases added, v2 goldens kept; then `npm test` | the changed expectations and why |
| GC-P2 | MP09 (format), MP10 (display) | the 676-cell code matrix and `tests/browser/puzzle-code-acceptance.html` (MP09); share and print browser checks with derived ratings (MP10) | `codes-<date>.md`; check results |
| GL-P3 | MP12 | first the GV2 slice again with `--output docs\difficulty-v3\landscape-v3`; then the full landscape (`--profile landscape --seeds 20 --fresh-process --output docs\difficulty-v3\landscape-v3-full`, all 105 cases on 16 boards) in shards selected by `--cases`; `rate-probe` on regenerated matching requests verified against `resultDigest`; the knob changes | `calibration-<date>.md`: every case id, coverage, incomplete, capped and partial outcomes, times; Hard and Expert comparison only on cells with a GV2 baseline |
| GF-P4 | MP13 | the new replay-fixture mode of `tools\record-fixtures.mjs` writes `tests/fixtures/replay-case.json`; then `npm test` | the fixture's provenance |
| GB-P4 | MP16 | `tests/browser/replay.html` and the affected dialog and share pages | check results |
| GZ | MP17 | `npm test`; the affected browser pages; the plan §6 probe and a small `rate-probe` run on 10x6 and 20x18 | `final-<date>.md` |

---

## 6. Risks, effort and timing

### 6.1 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| An unsound rule removes a solution row and inflates or deflates ratings | critical | sound specifications (RES-06, RES-07), all-solutions oracle and near-miss tests (RES-11) |
| A capped search reported as "no guess" | critical | separate statuses; no G before a first solution unless SA2-Q-P02 branch B is chosen, then labelled (RES-04) |
| Free choices make multi-solution puzzles Hard | high | SA1-Q-P1 decided with probe data before MP08 (RES-05) |
| Hard hit rate collapses on large boards (forced 20x18 Hard puzzles fall to Easy; more partial batches) | high | probe before activation; centre-seeking acceptance; matched GV2/GL-P3 comparison; K60 and SHARES within SA2-Q-P09 |
| Rule work or memory exceeds the budgets despite the node cap | high | work and memory caps, reusable guarded buffers, per-size timings and peaks (RES-10, MP06) |
| Rating cost x 64 profiles per candidate (deduction plus the DLX diagnostic) | medium-high | MP06 cost table; an owner question if the diagnostic doubles the cost (RES-19) |
| Identical shapes give fake guesses in imported sets | medium | SA2-Q-P03 decided; documented limitation under branch A (RES-09) |
| Normal unreachable for guess-free small puzzles (base 12, U <= 8 on 10x6) | medium | `base.scale` and rule terms in the fit (RES-18) |
| Tests pinned to v2 numbers break unnoticed | medium | the list of RES-24, owned by MP09 |
| Replay wrong after reload, mixed batches or a fold that accepts an earlier candidate | high | origin travels with the candidate; exact final comparison; honest stage availability (RES-27, RES-29) |
| Unbounded provenance makes a pack unreadable in every version (`generation` above 100,000 JSON nodes or 512 KiB fails the whole pack) | critical | bounded skip encoding (AUTH-P1 branches), the writer drops `generation.made` near the limit, near-limit tests (RES-27) |
| A display-rating or replay request cancels or supersedes a generation, a verification or a hint | high | auxiliary request contract, decided mechanism (JR-P4), overlapping-work tests (RES-23, RES-29) |
| A partial or mismatched replay is presented as the verified generated puzzle | medium | `compared` list, explicit `incomplete` and `mismatch` states, total work bound (RES-29-RES-31) |
| Old app versions drop or refuse new pack data | medium | provenance inside `generation`; v3 metrics within the old reader's bounds (RES-21, RES-27) |
| Worker scheduling changes results near deadlines | medium | deterministic semantics tested with 1 and 4 workers; no clocks in ratings |
| Two test runs collide in `tests/artifacts/` | medium | one run at a time per working tree (RES-01) |
| Calibration looks good because only accepted puzzles are counted | high | records include capped, incomplete, repaired and partial outcomes with sample sizes (RES-25) |
| Long gate runs exceed the 10-minute rule | medium | bounded shards, attached and monitored |
| The full landscape (GL-P3) has never been run (the only record covers 12 of 105 cells, with two child-process crashes, `docs/calibration/landscape-slice-2026-10-22.md:8, 200-201`) | medium | shards by `--cases`, every outcome recorded, crashes kept as outcomes and re-run once |

### 6.2 Effort and timing

| Part | Tasks | Agent hours (SA1 basis) |
|---|---|---|
| Model and deduction solver with R1-R9 | MP01-MP04 | 14-21 |
| Conditional: identical shapes, census | MP04b, MP05 | 1 (raw check) to 14 (both) |
| Probe, fit, v2 baseline | MP06 | 3-5 |
| Clue selection | MP07 | 3-5 |
| v3 model, activation, display rating, auxiliary requests | MP08-MP10 | 14-21 |
| Calibration tooling, run and lock | MP11-MP12 | 6-10 |
| Generation Steps | MP13-MP16 | 26-38 |
| Final evidence | MP17 | 2-4 |
| **Total** | 17 numbered tasks (MP05's scope depends on SA1-Q-P1) + conditional MP04b | **69-105**, up to about 118 with both conditional tasks in full |

SA2's estimate of the same scope is 88-139 engineering hours (SA2-1 §8). The two are different measures and are not
averaged (SA2-3 §1.1 D10); neither promises an elapsed delivery time. The corrections of SA2-4 added about 4 hours
(MP10, MP13-MP15).

Machine time of the gates (measured where possible): quick set 15.3-15.9 s and `npm run check` 1.1 s at HEAD (§2.1);
landscape runs on 6x10 and 10x10 take 0.3-3.1 s per request (`docs/calibration/landscape-slice-2026-10-22.md`, 240
timed runs on 12 cells), more on 20x18. Estimates: GV2 1-3 hours of shards; GL-P3 several hours: the slice again
(1-3 hours) plus the full 105-case matrix, never run before and not measured (an estimate of 4-10 hours of shards,
boards up to 26x26 and 32x15), plus re-runs after knob changes; fixture recording a few minutes; `npm test` was not
run during the analysis (it must finish within 10 minutes); browser pages a few minutes, each check under 1 minute.

---

## 7. Traceability

| Plan section | Resolutions | Tasks | Clarifications |
|---|---|---|---|
| §1.1, §1.2, §6 findings | §2 | MP06, MP17 | - |
| §1.3 decisions | RES-01, RES-04, RES-05, RES-18 | all | SA1-Q-P1 |
| §2 orientation, §3 rules | RES-01, RES-02, RES-20 | all | part D 3 |
| P0.1 | RES-02 | MP01 (MP04b) | part D 11; SA2-Q-P03 |
| P0.2 | RES-03, RES-04, RES-05, RES-10, RES-11 | MP02, MP05 | SA1-Q-P1, SA2-Q-P02, part D 2, 5, 9 |
| P0.2b | RES-06, RES-07, RES-08, RES-09, RES-11, RES-33 | MP03, MP04, MP04b | SA2-Q-P12, SA2-Q-P13, SA2-Q-P03 / SA1-Q-P6, SA2-Q-P11, part D 1, 10 |
| P0.3 | RES-12, RES-13, RES-14 | MP06 | SA2-Q-P06, PROC-P1, part D 14 |
| P1 | RES-15, RES-16, RES-17 | MP07 | SA2-Q-P04, SA2-Q-P05 / SA1-Q-P5, part D 7, 13 |
| P2.1 | RES-18, RES-19 | MP08, MP09 (MP14: `rateDetailed`) | SA2-Q-P01, SA2-Q-P13, SA2-Q-P02, JR-P3, part D 2, 8 |
| P2.2 | RES-20 | MP08 | part D 3 |
| P2.3 | RES-21 | MP09 | v3 metrics size |
| P2.4 | RES-22 | MP09 | SA2-Q-P07 / SA1-Q-P3, part D 6 |
| P2.5 | RES-23, RES-29 (auxiliary requests) | MP10 | SA2-Q-P08 / SA1-Q-P2, JR-P1, JR-P4 |
| P2 gate and docs | RES-24, RES-32 | MP09 | part D 12 |
| P3 | RES-25, RES-26 | MP11, MP12 | SA2-Q-P09, PROC-P1, JR-P3, part D 4, 8 |
| P4.1 | RES-27 | MP13 | AUTH-P1, SA2-Q-P10 / SA1-Q-P4, JR-P2 |
| P4.2 | RES-28, RES-29 | MP14, MP15 | JR-P4 |
| P4.3 | RES-30 | MP15, MP16 | - |
| P4.4 | RES-31 | MP16 | - |
| P4 docs, §7 checklist | RES-32 | MP13-MP17 | - |
| §5 risks | §6.1, RES-10, RES-13, RES-25 | MP06, MP12 | SA2-Q-P06, SA2-Q-P09 |

---

## 8. Open items

### 8.1 PENDING

| Id | Resolution | Branches | Analysts' recommendation | Needed before |
|---|---|---|---|---|
| SA1-Q-P1 | RES-05 | A raw; B decisive, published as a decisive upper estimate (kLow) when the census is incomplete; B' decisive, an incomplete census makes the rating unrateable (first-path evidence kept); C raw with the penalty `S >= 2 ? weights.info * log2(min(S, 8)) : 0` | SA1: B. SA2: prototype B, measure, then the owner selects with an explicit incomplete-census policy (B or B') | MP05 (or the data request), MP08 |
| SA2-Q-P02 | RES-04 | A unrateable: `IncompleteRatingError` caught at `core/engine/clues.js:216, 241`, the candidate skipped and neutral for steering, a failed repair falls through; B saturated rating from `prefix` for a hell-1 or higher requested target, below it not in band and "above" for steering | SA1: B. SA2: A | MP09 |
| SA2-Q-P03 / SA1-Q-P6 | RES-09 | A raw counts; B quotient by placement multisets for guesses and S; C classes for guesses, raw S | SA1: A. SA2: B | MP04b |
| SA2-Q-P09 | RES-25 | A knobs, caps, K60 and SHARES within recorded ranges; B knobs and caps, tables only with owner ranges | SA1: A (plan:456-457). SA2: B | MP12 (MP06 and MP08 for anything beyond `DEDUCE` and `SCORE_V3`) |
| AUTH-P1 | RES-27 | the agreed record, or the plan's per-puzzle `made` (a format change refused by current readers); skip encoding a: integer lists capped at 64 subset and 16 repair ordinals, else `'overflow'`; b: base64 bitsets; in both the writer drops `generation.made` near 512 KiB | record: both analysts agree. Encoding: SA1 a; SA2 either | MP13 |
| SA2-Q-P04 (confirmation) | RES-15 | the agreed state machine (`reserve = 16`), or `reserve = 0` | both: `reserve = 16` | MP07 |
| JR-P1 | RES-23 | a v2 and v1 claims; b v2 only, as the plan says; c also puzzles without a claim | SA1: a. SA2: b, the plan's default; a is a reasonable explicit extension; c is a separate new display branch | MP10 |
| JR-P2 | RES-27 | a `generation.setOrigin`; b the existing set keys, no longer re-stamped, plus immutable set versions | both: a (SA2: b could work if specified); agreed, author confirmation pending | MP13 |
| JR-P3 | RES-18, RES-25 | a accept the proposed ranges; b other ranges; c the invariants only | SA1: a. SA2: approve ranges as candidate experimental ranges before production values are chosen; they are not findings | MP08 |
| JR-P4 | RES-29 | a an auxiliary method on the existing client and the Player's pool wrapper (waits for generation or verification, idle task, own signal); b a separate one-worker pool with its own memory budget and no-worker fallback | SA1: a. SA2: either, chosen before MP10 | MP10 (and MP15) |

### 8.2 New questions for the plan author (raised by this report)

- **JR-P1. Which old claims get a derived display rating (P2.5)?** The plan names `difficulty-v2`. (a) v2 and v1 claims
  (both are older scales; v1 is read today without a warning); (b) v2 only, as written; (c) also puzzles without a
  claim. SA1 recommends (a); (c) adds a new display to puzzles that have none and is out of the plan's scope. SA2
  (SA2-4 §4) prefers (b) as the plan's default and calls (a) a reasonable explicit extension; (c) is a separate new
  display branch, not implied by re-rating.
- **JR-P2. Where does the immutable set origin live (P4.1)?** AUTH-P1 fixes `generation.made[puzzleId]` but not the
  set origin. (a) a new key `generation.setOrigin` with its own versions (RES-27); (b) the existing keys `setSeed`,
  `setLevel`, `setAttempt`, no longer re-stamped, plus a new immutable `generation.setVersions`. Both analysts
  recommend (a): the existing keys are re-stamped with the current versions at every export
  (`generator/state.js:1300-1328`), so a separate immutable object is clearer. SA2 adds that (b) could work if
  specified precisely.
- **JR-P3. Which ranges may the P3 fit use (P2.1, P3)?** The plan calls `a`, `b`, the 16 and the 6 knobs without
  ranges. Proposal (RES-18): `base.max` 8-12, `base.scale` 3-12, `rule[2] <= rule[3]` with `base.max + rule[3] <= 16`,
  `weights.G` 0-8, `weights.info` 0.5-6, `0 <= penalty.few <= penalty.many <= 8`. (a) accept; (b) other ranges;
  (c) no ranges, only the invariants. SA1 recommends (a). SA2 treats them as candidate experimental ranges, not
  findings, to be approved before production values are chosen; `base.max` below 12 is a relaxation of the default
  12 (SA2-Q-P01). The answer is needed before MP08 (SA2-4 JC12).
- **JR-P4. How are auxiliary worker requests scheduled (P2.5, P4.2)?** Raised by SA2-4 JC10. Today `beginRequest`
  aborts every earlier entry as superseded (`core/browser/worker-pool.js:575-588`) and the Generator client's
  `cancel()` cancels the whole pool (`core/browser/generation-client.js:1190-1194`), so a display rating or a replay
  submitted the ordinary way would cancel a running generation. (a) An auxiliary method on the existing client and
  on the Player's pool wrapper: it waits while generation or verification is active, runs as an idle task under the
  current token, is cancelled by its own `AbortSignal` and aborted when a new generation or verification begins;
  no extra worker. (b) A separate one-worker pool for auxiliary requests, with its own memory budget (a main and a
  scratch workspace, 160 and 32 MiB, `core/engine/policy.js:76-77`), creation and disposal and a no-worker fallback.
  SA1 recommends (a): no extra memory on phones and no second worker lifecycle. SA2 accepts either, provided the
  choice is made before MP10.
- **AUTH-P1, extended by SA2-4 JC08.** The AUTH-P1 context in `clarifications.md` ("each skip is a distinct excluded
  key", "at most 99", "no overflow state") is superseded: two subsets can share a clue key on repeated-shape sets,
  and an unbounded `generation` makes the whole pack invalid in every current reader (RES-27). The author also picks
  the skip encoding: (a) capped integer lists with `'overflow'` (SA1 recommends: readable, about 80 KB for 100
  puzzles) or (b) base64 bitsets (no overflow state, about 65 KB).

---

## 9. Sign-off

| Analyst | Signature | Notes |
|---|---|---|
| SA1, claude-opus-5.5 | **signed**, 2026-11-12 | lead author; this revision applies SA2-4 JC01-JC13 |
| SA2, gpt-6-astra | **signed subject to JC01-JC13 — applied in this revision** | `docs/difficulty-v3/gpt-6-astra/4-check-of-joint-report.md` §5; SA2 accepts MP01-MP17 with the conditional MP04b (SA2-4 §4) |

Corrections applied at sign-off: JC01-JC13, all accepted. Two differ in detail from SA2-4's text, with a note at the
place: **SA1 note on JC01** (§2.4: the recipe values re-measured with the agreed rule term are 38, 66 and 104, not
40, 68 and 106) and **SA1 note on JC10** (RES-29: the mechanism is put to the plan author as JR-P4 with SA1's
recommendation). JC08 adds the skip-encoding branches to AUTH-P1. Policy branches remain pending in
`docs/difficulty-v3/clarifications.md`; a co-signature does not choose them.
