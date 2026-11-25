# Review round 4: the pack author's response

| Item | Value |
|---|---|
| Review | [`review-4.md`](review-4.md) (SA-Astra, gpt-6-astra): changes required; prior findings 11 resolved, 6 not resolved; RV4 1 blocking, 6 major, 1 minor; N-V4-14 stays a named item |
| Pack | `tasks/improve-generating-v4/`, round 5 (base `345d29d`, code `3fc65f4`): 36 tasks, 97.5 developer hours, 73 machine minutes allocated |
| Author | SA-Opus (claude-opus-5.5), pack author |
| Result | 14 rows: 14 accepted, 0 rejected; IG-P-Q37's rule unchanged; no question to the supervisor or the owner |

Every change below is in the named files. Line numbers of the code are those of `3fc65f4`; those of the harness are
of the working tree at the base. The plan is unchanged in this round.

## The prior findings that review 4 left open

| ID | Disposition | What changed (files, sections) | Reason |
|---|---|---|---|
| RV1-15 | accepted | Through RV4-05: T11b (row ceiling `units x 345`; the 10-s margin an assumption), T11c (no zero-row step) | the remaining gap was the row ceiling |
| RV1-17 | accepted | Through RV4-04: T11c (argv arrays, `repeatUntilDone`, explicit `minHorizonS`, `accept-p0`'s script path, probe populations) | as review 4 asks |
| RV2-09 | accepted | Through RV4-03: T04d (explicit immutable input index, captured `inputs/`), T04f (`V4-T04f-verify`, `evidence-check`, reserved self-test ids, the expectation from the captured copies), T11d (captured inputs of the parity kinds) | as review 4 asks |
| RV2-12 | accepted | Through RV4-05 (T11b, T11c) | as review 4 asks |
| RV3-05 | accepted | Through RV4-05 (T11b, T11c); T11g's ceilings are T11b's | as review 4 asks |
| RV3-06 | accepted | Through RV4-03 (T04d, T04f, T11d; check-list §3.1 and D-V4-18) | as review 4 asks |

## Round 4 findings

| ID | Disposition | What changed (files, sections) | Reason |
|---|---|---|---|
| RV4-01 | accepted | T02d: the R9 term is `3 NZ + NC^2 / 2 + 3 (NC^2 / 2) K L` in the derivation and in `igRatingBound` (the two piece-column scans of `deduce.js:1387-1406` per qualifying pair, `2 K (L - 1)`, beside `coversBoth`'s `K L`); the derivation now also states why a stretch runs each rule at most once (every pass starts with a check; R7's check returns `NONE` without stopping, so R8, R9, `fewestColumn` and `listRows` may follow it) and that a chain of returns pops disjoint parts of the trail. The magnitudes, recomputed with `bound-cheap.mjs`: about 1.13 G units (10x10), 1.85 G (12x12), 3.7 G (14x14), 8.0 G (16x16), 15.3 G (18x18), 242 G (26x26) with no clue; N-V4-14's examples follow them. Case 2 is labelled a sanity check, not a proof | the pack author re-read every other rule term against `deduce.js` (R1 to R8, `select`, `undo`, the setup, the search, probe and census checks) and found no other gap |
| RV4-02 | accepted | T04b: `pairPrimitives(callLines, call)` in `lib/ledger.mjs` (at most one pending primitive; `invalid begin`, `invalid bound`, `overlapping begin` at once and never removed, `unpaired`, `unquantified <outcome>` for a `p` line of outcome `unsat` or `error`, `bound exceeded`); every route flags unquantified ratings; an open primitive at an ordinary `end` of any result is `unfinished primitive`; cases (m) to (p). T09c: rule 6 is `pairPrimitives` (shared code, the same rules), rule 8 no longer allows an ended error call with an open primitive; four new ledger cases (an overlap never erased, unquantified `error` and `unsat`, an ended error with an open primitive, a quantified work-cap rating). D-V4-17 names the cases | `recordRating` (`ig-log.js`) sets the units only for a returned rating or an `IncompleteRatingError`; IG-P-Q37's "every unrecorded loss stays incomplete" covers these cases, so its rule is unchanged |
| RV4-03 | accepted | T04d: the receipt's evidence is `stage1Inputs(task, variants)` (the manifests, the observation states and logs, the identity, PM4 and self-test records, `inputs/harness.json` and `inputs/<variant>.ig-tree.json`, captured by `summary` before the receipt; a stale tree or another producer is incomplete); the PM4 block reads the captured `instr` copy; case 4. T04f: its snapshot and verification use `V4-T04f-verify`; step 0 checks every stage-1 input before any edit and `evidence-check` before acceptance; `self-test.mjs` refuses the four stage-1 self-test ids once their state exists; `stage1Expectation` reads the captured copies and `stepEvidence(..., { historical: true })`, no tree folder; tests for a binding that survives later work without reading tree, variant or harness files, a changed input, the reserved ids and `evidence-check`; estimate 3 h. T11d: the same captured inputs for the parity kinds; `isV4` without a tree folder. T04e's scope, check-list §3.1 and D-V4-18 | R4-03 applied in full; the real sequence "stage-1 receipt, T04f verification, accept" no longer touches an input |
| RV4-04 | accepted | T11c: every `node` is an argv array (as `plans/IGP-00.json`), the runner's appended arguments stated; every locked step has `repeatUntilDone: true`, its `state` and an explicit `minHorizonS` (rows `rowLimitS + 12`, P-1 parity 270, P-0 and probes 150); `accept-p0` names `tools\ig-proto\v4-check.mjs`; `trees` also builds `instr` and `r4c`; the profile's two cases are written out; each probe's price input carries the same cases (30, 2 and 8 units); new cases `compile: bounded steps resume` and `compile: populations as priced`; T11e and T11f follow the same rules | `run-task.ps1:155-157` stops a step whose first invocation leaves it unfinished without the flag |
| RV4-05 | accepted | T11b: `ceilingInvocations = units`, `ceilingS = units x 345` for rows and items (the helper's 300 s, at most 45 counted quiet seconds, `run-task.ps1:137-139`, and the progress rule of `:152-154`); the 10-s row margin and post-processing are labelled assumptions; the 20-row example's ceiling is 6,900 s. T11c: a zero-row step throws | `arm.mjs:175` only admits a row; no code bounds a row's post-processing |
| RV4-06 | accepted | T09c: `synthClass` rows carry `K: 30`; the clue-rule case first asserts complete clue evidence for its nine rows; expected `failed` by `clue`, never `evidence` | the evidence validator stays as it is |
| RV4-07 | accepted | T11e: data first, time next (the owner decides S4-6 and authorizes the data-only `activate`; then `approval --plan V4-S4`; no locked step before it); every selected group's row step is required (`optional: false`), its origin recorded; new case `activate: the selected scope is required`. T11g's approval order; check-list §3.4, N-V4-03 and D-V4-20 | as review 4 asks |
| RV4-08 | accepted | T02d and T11b: O(board area + pieces) plus journal I/O, inside measured durations; T04f: the non-variant harness edits do not move the trees; T11c: 8 manifest rows expanding to 23 items; T11d: the envelope root's `blocks`; T09d: a valid zero-accepted row is an empty key and clue list, `details` not read, with a Master case (f) | wording and the zero-count normalization |

N-V4-14: kept as a named item, as review 4 rules; its examples now follow the corrected R9 term.
