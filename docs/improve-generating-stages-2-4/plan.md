# Improve generating, stages 2 to 4 of the frozen round: plan

| Item | Value |
|---|---|
| Status | **Draft (round 1)**, revised after SA-Astra's review (`sa-astra/round-1-draft-review.md`) |
| Authors | SA-Opus (drafter), SA-Astra (reviewer) |
| Base commit | `c159ab4` |
| Binding plan | [`../improve-generating/plan.md`](../improve-generating/plan.md) version 4 (`c3ef770`, plan author SA-Fable). This plan is a sub-plan under it: it fixes what plan v4 leaves to the fit, the encoding and the pack |
| Authority | For a matter that would previously have required the supervisor, both SAs decide jointly under the owner's delegation (2026-11-23 15:29 +07:00, Discord message 1574341211701907457). Owner approvals remain mandatory, and a joint decision changing one of the owner's recorded decisions still needs his confirmation. |
| Inherited pack | `tasks/improve-generating-v4/` (`0edc636`): §3 run rules, §4 decisions D-V4-01 to D-V4-20, §5 register, §6 named items N-V4-02 to N-V4-21, §8 hand-over |
| Joint report | [`report.md`](report.md) (the stage-2 report, the freeze proposal, the joint decisions) |
| Open questions | [`clarifications.md`](clarifications.md): Q-S24-3 to Q-S24-7, all for the owner |

## 1. Goal

Finish the frozen round of plan v4 and hand its result to the owner: the stage-2 report (done, [`report.md`](report.md) §1),
P7's scoped spike, stage 3 (the freeze and its encoding), the live deadline and `V4-LIVE`, stage 4 (the activation, `V4-S4`,
`V4-S4C`, the verdicts), and phase 0's decision (N-V4-06). The pack is done when phase 0's final-purpose verdict is written and
reported to the owner with the stage-4 report, or when a measured stop (a failed or incomplete gate) is reported and routed.
Later phases follow at their own gates (section 8.4).

## 2. Scope

**In:**

- The stage-2 report and its readings of N-V4-14, N-V4-16, N-V4-17 and N-V4-21 ([`report.md`](report.md) §1).
- P7's scoped spike (N-V4-05): isolated harness variants, equality runs, one timing probe.
- Fitting runs on fitting seeds before the freeze: the control pilot `V4-S2B`, and the 20-request uncapped Hell 1 check in
  `V4-S3P` with its read gate (D-S24-24; its scope is Q-S24-5).
- The freeze (N-V4-03): `prior-s3-v1`, the class table and `W_screen`, P5's budget table and bounded-attempt policy, the
  reserve and deadline configuration, `freeze.json`, and the four variants `fr-frozen`, `fr-frozen-none`,
  `fr-frozen-uncapped`, `fr-frozen-none-uncapped`.
- The harness changes this needs: N-V4-19, N-V4-20, the budget lookup by mode, the per-set prior's levels, the live deadline
  (N-V4-13), `tools/ig-proto/live-deadline.mjs`, the acceptance of the `live-deadline` receipt, the plans `V4-S2B`, `V4-P7`
  and `V4-S3P`.
- `V4-S3P` (the frozen arms' P-1 passes before the activation), `V4-LIVE`, `activate`, `V4-S4`, `V4-S4C`, the verdicts, the
  stage-4 report and N-V4-06's decision to the owner.
- On the owner's choice only: N-V4-18 and S4-6.

**Out:**

- Every production change (`core/`, `generator/`): P7's adoption (phase 1) and `gen-v4` (phase 2, N-V4-07) are later packs;
  no frozen-round plan runs while a production change is in progress (D-V4-11).
- Stage 5 (N-V4-04) and the second validation (`V4-S4X`, `V4-S4XC`); the browser calibration (N-V4-01); offers and the blind
  play comparison (N-V4-08, N-V4-09); the service level (N-V4-10); phase 4 (N-V4-11); `require` on large boards (N-V4-15).
- A remedy for N-V4-14 (a tighter proved bound or a relaxed accounting): a new proposal, decided jointly by the SAs under the
  owner's delegation, with the owner's approval of any machine time (D-S24-18).
- Hell 2 and Hell 3 (closed, IG-P-D6); P8 as a default; bounded prefetch; the per-set prior on Nightmare; other `W` values.

## 3. Current state

- **V4-S2 is complete** ([`report.md`](report.md) §1): 165 valid requests, 164 reaching ten, 1,642 puzzles, every ledger and
  timeline complete; P-0 and six P-1 bindings accepted; `fr-p5`'s receipt `incomplete`, no binding (N-V4-21).
- **The account:** 10,252.712 s logged + 87.4 s off-log = 172.335 counted minutes of the 749 granted for `V4-S2`
  (`check-list.md:561`); runs pass 747 (`check-list.md:616`); the quiet period is 45 s unless the owner's idle declaration
  holds (15 s, `check-list.md:560`).
- **Compiled and waiting:** `V4-LIVE` (`tools/ig-proto/plans/V4-LIVE.json`): `fr-frozen` on 14x14 Nightmare and 26x26 Hell 1,
  reps 0-4, row limit 260 s, then `publish-fr-frozen`, `live-receipt` (`live-deadline.mjs receipt --task V4-LIVE
  --require-pass`) and `accept-live` (`v4-check.mjs accept --task V4-LIVE --receipt ... --binding ... --by V4-LIVE`, no step,
  manifest or kind argument). Its prerequisites: the variant `fr-frozen`, `V4-S3/freeze.json`, `tools/ig-proto/live-deadline.mjs`
  and the P-0 binding with `current: ['v4']`.
- **Absent:** the four frozen variants, `freeze.json`, `live-deadline.mjs`, the `live-deadline` kind of `v4-check accept`
  (it knows `stage1`, `parity`, `p0-identity`, `v4-check.mjs:1595-1596`; only `LIVE_DEADLINE_FIELDS` exists,
  `lib/proof.mjs:26`), a budget lookup by uniqueness mode (`callBudgetOf` keys by level, `ig-select-v4.js:82-88`), and a level
  filter on the per-set prior (`v4-ps`'s `igPriorOf` serves every level whose calibration matches).
- **What `harnessInfo()` hashes:** `tools/ig-proto/lib/`, `tools/ig-proto/data/` and the top-level `.mjs` and `.ps1` files;
  not `plans/`, `variants/` or the evidence (`lib/records.mjs:112-125`; D-V4-20).

## 4. Design

### 4.1 The freeze contents

| Item | Frozen value | Id | Fit and evidence |
|---|---|---|---|
| Class table and `W_screen` | `n-small` (Nightmare up to 144): none; `n-mid` (196-256): 190 M; `n-upper` (257-324): 190 M, evaluated; `n-large` (360 and more): 190 M, evaluated; `hell-1`: none; 145-195 and 325-359 unlisted (no screen) | `screen-s3-v1` (`fr-frozen`), `screen-s3-none` (`fr-frozen-none`) | [`report.md`](report.md) §1.4 and §2.2; IG-P-Q09's least work per puzzle; IG-P-D4 |
| Count prior (P4) | `prior-s3-v1`: `prior-v1`'s 15 Nightmare entries; Hell 1 196 0.400000, 215 0.404412, 256 0.358108, 300 0.443429, 324 0.347222, 360 0.331514, 400 0.368421, 420 0.390244, 480 0.297161, 484 0.287500, 576 0.219512, 676 0.200000; start `clamp(round(share x K), 1, K - 2)` | `prior-s3-v1` | [`report.md`](report.md) §2.3; IG-P-Q27; the route D-S24-21 |
| Per-set prior | on, Hell 1 only | `perSetLevels: ['hell-1']` | [`report.md`](report.md) §1.5 |
| P5 call budget | `any`: Nightmare 10 G, Hell 1 40 G; `require`: Nightmare 32 G, Hell 1 40 G (D-S24-23), once the owner confirms the finite policy (Q-S24-3) | `budget-s3-v1` | [`report.md`](report.md) §1.8, §2.4 |
| Bounded set attempts | 4 attempts failing without a window on the same side; budget stops never count | (in `budget-s3-v1`) | T07b; [`report.md`](report.md) §1.8 |
| Reserve and deadline | one deadline from the request's start; 0.6 for the batch, set stage cut at 46 s; 115-s generation stop; fold-order prefix on a cut; hard 120-s response | `deadline-s3-v1` | [`report.md`](report.md) §1.9, §2.5; IG-P-D1 |
| Mechanisms | (c4) off; bracket close off; rescue on (`rerateMax` 4); no ranker | - | [`report.md`](report.md) §1.6 |
| Kernel | the frozen reference kernel in all four frozen arms and their comparators; no P7 speed credit in this round (D-S24-22) | - | [`report.md`](report.md) §3 |

### 4.2 `freeze.json`

`docs/improve-generating/evidence/frozen/V4-S3/freeze.json` and `freeze.md`, written once (§3.3 of the pack) by the encoding
task from the values of 4.1:

```json
{
  "format": "ig-v4-freeze", "version": 1,
  "classes": [
    { "id": "n-small", "cells": ["3x29-nightmare", "10x10-nightmare", "12x12-nightmare"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" },
    { "id": "n-mid", "cells": ["14x14-nightmare", "15x15b10-nightmare", "16x16-nightmare"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" },
    { "id": "n-upper", "cells": ["15x20-nightmare", "18x18-nightmare"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" },
    { "id": "n-large", "cells": ["18x20-nightmare", "20x20-nightmare", "20x21-nightmare", "32x15-nightmare", "22x22-nightmare", "24x24-nightmare", "26x26-nightmare"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" },
    { "id": "hell-1", "cells": ["14x14-hell-1", "20x20-hell-1", "24x24-hell-1", "26x26-hell-1"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" }
  ],
  "bounds": { "n-small": ["nightmare", 1, 144], "n-mid": ["nightmare", 196, 256], "n-upper": ["nightmare", 257, 324], "n-large": ["nightmare", 360, null], "hell-1": ["hell-1", 1, null] },
  "tables": { "screen": "screen-s3-v1", "prior": "prior-s3-v1", "budget": "budget-s3-v1", "deadline": "deadline-s3-v1" },
  "values": { "W": { "n-small": null, "n-mid": 190000000, "n-upper": 190000000, "n-large": 190000000, "hell-1": null },
    "callBudget": { "any": { "nightmare": 10000000000, "hell-1": 40000000000 }, "require": { "nightmare": 32000000000, "hell-1": 40000000000 } },
    "setAttemptsBound": 4, "deadline": { "reserve": 0.6, "setStageCapMs": 46000, "generationStopMs": 115000, "responseBoundMs": 120000 },
    "c4": false, "rerate": "rescue", "rerateMax": 4, "ranker": null, "perSetLevels": ["hell-1"] },
  "variants": "<the four variants' tree ids and parameter hashes>",
  "seeds": { "fitting": "<the recipes of section 4.7>", "excluded": "<validation, Master and second-validation reps>" },
  "fit": "<SHA-256 of every input and script that fitted a value>"
}
```

The readers use `classes` only and accept extra keys (`manifest.mjs:2246`, `:2619`); `activate` refuses a file whose classes do
not name exactly the 19 comparator cells, each once (`freezeMismatch`, `manifest.mjs:2265`). The encoding checks the file
against T11e's pure `activation` on the published pilots (both conditional boards) before writing it.

### 4.3 The four frozen variants

- **One edit set, four parameter sets.** All four variants carry the same anchored edits, each inert under a null parameter,
  and differ only by parameters: `fr-frozen` (the class `W` of 4.1, budgets, bound, live deadline); `fr-frozen-none` (every
  class `W` null, its own `screenTable`); `fr-frozen-uncapped` and `fr-frozen-none-uncapped` (as their twins with `callBudget`,
  `setAttemptsBound` and `liveDeadline` null, so the two separate timers of today apply), which is what
  `data/frozen-round-v1.json`'s `comparatorDifferences` declares.
- **Composition.** They extend `fr-base` (the `v4-link` instrumented chain), `v4-ps`, `v4-p5` and a new `live` variant
  (N-V4-13), plus frozen-family-only edits: the budget lookup by uniqueness mode (`callBudget { any: {...}, require: {...} }`)
  and the per-set prior's level filter (`perSetLevels`); the kernel stays the frozen reference (D-S24-22). No file of the `v4`
  chain (`base > instr > log > v4`) changes: `check-binding --current v4` against the P-0 binding stays `pass`. Files are never
  overridden by a copy (the builder refuses it, `lib/tree.mjs:249`); edits are anchored and checked by `check-edits`.
- **Runtime classes.** `fr-frozen` keeps T08's four runtime classes with `n-mid` (196-324) and `n-large` at 190 M
  (`ig-select-v4.js:97-112`), so no screen-class edit is needed; a pure check proves, for every comparator cell, that the
  runtime `W` of `fr-frozen` and `fr-frozen-none` equals its verdict class's value in 4.1.
- **Records.** Algo ids `gen-v4-proto:<variant>` (D-V4-05, at most 36 characters); `versions.priorTable` and
  `versions.screenTable` carry the table ids (IG-P-Q36); the budget and deadline tables are part of the variant's parameters
  and identity.
- **A candidate epoch, then final trees.** T08 prepares a *candidate epoch*, not irrevocably final trees regardless of T11's
  result. Each P-1 binding proves that epoch. If T11 accepts it unchanged, those are the final trees recorded by the freeze. If
  it rejects it, retain every observation/receipt and use a new configuration identity and proof task/manifest for the
  replacement; never resume a plan after changing its identity or overwrite its binding. Any additional measured scope requires
  a fresh approval.

  The four reserved names are the references used by the current compiled plans, not an exemption from
  D-V4-05. Before the freeze, a parameter-only refit may retain those names only with a distinctly versioned
  effective configuration, new tree/parameter identities and fresh proof tasks; all earlier observations,
  receipts and bindings remain immutable. A result-changing code edit for the same parameters still requires
  a new variant identity under D-V4-05. Any replay-relevant change must also be distinguishable by the stored
  experimental recipe identity, not merely by hashes held outside that recipe.

  If a replacement requires an identity that the existing compiled references cannot express, the current
  task stops for a joint SA ruling under the owner's delegation on the versioned replacement and its
  plan/variant mapping. Do not rerun `compile`, silently rename references, overwrite historical plans or
  reuse an observed task namespace. Any additional measured scope requires the owner's approval.

  Once the freeze records the trees, `fr-frozen` and `fr-frozen-none` stay unchanged from `V4-LIVE`'s binding
  (`current: ['fr-frozen', 'fr-frozen-none']`), and all four from `V4-S3P`'s and `V4-S4P`'s bindings, until the final verdict.

### 4.4 P5

- **Lookup.** The call's budget is read from `callBudget[mode][level]`, `mode` being the call's uniqueness; an absent entry is
  no budget. The check stays where it is: before every rating and every uniqueness count, `spent >= budget` ends the call
  (`ig-select-v4.js:422-426`); in `any` the best waiting in-band candidate is returned, in `require` only an already finished
  final (`ig-select-v4.js:1303-1316`).
- **Values.** 4.1 (D-S24-13, D-S24-23); the `require` values apply once the owner confirms the finite policy (Q-S24-3).
- **Bound.** `setAttemptsBound` 4 (T07b), read before the ordered winner scan; budget stops carry no side.
- **Tests.** A real-worker reason-transport case for the bound in addition to T07b's scripted pools (N-V4-16 has not fired in
  a real run); a `require` call stopped by its budget returns no unfinished final; equal results across observer modes.

### 4.5 The live deadline (N-V4-13)

- **Mechanism** (the `live` variant; client and host of the copy): one origin per request shared by the set stage and the
  batch; the set stage is cut at `(1 - reserve) x 115 s` = 46 s with its own failure reason; at 115 s the batch stops,
  outstanding tasks are cancelled with their closure lines (ledgers stay complete) and the response holds the fold-order prefix
  of accepted puzzles; the host returns that prefix by 120 s at the latest. The clock may shorten the prefix, never change which
  puzzle fills a slot. Legacy levels keep today's paths.
- **Tests** (scripted pools, both bounded twins): a reserve-cut set; a partial prefix at the stop; cancellation of outstanding
  work and late messages; assembly at the hard bound. Without a clock cut, widths 1,2,4,8 return the same ordered puzzles. With a
  clock cut, returned lengths may differ; every result is a prefix of the same deterministic fold and common slots contain the
  same puzzles. Scripted-clock cases separately pin each expected prefix and verify cancellation/assembly.
- **Receipt and acceptance.** `tools/ig-proto/live-deadline.mjs receipt --task V4-LIVE --require-pass` writes
  `docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json` (kind `live-deadline`, fields `LIVE_DEADLINE_FIELDS`:
  `live: true`, `postHoc: false`, `workCutoffMs: 115000`, `responseBoundMs: 120000`, `reserveChecked: true`), binding the
  verification records and the ten `V4-LIVE` rows; it exits 2 after writing a receipt that does not pass. `v4-check accept`
  recognizes the receipt's typed kind `live-deadline` with an expectation built apart from the receipt (both bounded twins'
  trees and parameter hashes), with no new command-line flag: the compiled `accept-live` step passes none.

### 4.6 Plans to add

Written with T11c's exported functions (`rowStep`, `parityPass`, `parityManifest`, `planOf`, `stepPrice`), never by `manifest.mjs
compile` (N-V4-02); each dry-run first; prices by T11g's rules.

| Plan | Steps | Prerequisites | Projected / guard (counted min) | Timing proxy |
|---|---|---|---:|---:|
| `V4-S2B` | `fr-none` rows on 3x29, 18x18, 18x20, 20x20, 20x21, 32x15, 22x22 and 24x24 Nightmare, reps 0-4 (40 rows, row limit 260 s); `publish-fr-none` | the variant `fr-none`; its accepted P-1 binding `V4-S2P/parity-fr-none.accepted.json` (`current: ['fr-none']`) | 22.59 / 28.24 | 16.0-20.0 |
| `V4-P7` | the spike's timing probe: at most three composites x 90 paired items, one lane, reserve 90 s | the spike's variants and its equality records | 15.50 / 19.37 | 11.4-12.9 |
| `V4-S3P` | P-1 passes of the four frozen arms (48 items; receipts `--require-pass`; bindings `--by V4-S3`); then, if the owner approves the scope (Q-S24-5), `fr-frozen-none-uncapped` rows on the four Hell 1 boards, reps 0-4 (20 rows), and their publish (D-S24-24) | the four variants (the candidate epoch); the P-0 binding | 71.20 / 89.00 (+ 67.69 / 84.61) | 20.0-22.0 (+ 20.0-22.0) |

### 4.7 Seeds

Fitting only: `landscape/<cell>/<rep>` reps 0-4 (V4-S2, `V4-S2B`, the Hell 1 check), the provisional reps 0-5, MP12b1's reps 0-19
(10-19 fitted `prior-v1`), PM1's first slice (`ig-pm1/...`), R28, the parity and kernel streams (`ig-v4/parity/...`,
`ig-v4/replay/...`, `ig-v4/kernel/...`). Validation reps 20-39, Master reps 20-24 and the second validation's 40-59 are never read
by a fit (D-V4-13, IG-P-Q25).

### 4.8 Harness changes

- **N-V4-19:** `arm.mjs publish` publishes every done shard of an arm and names the shards not done (their rows stay unpublished
  and count as missing), before any closure, activation reading or fit after a stopped plan.
- **N-V4-20:** the self-test's `GIT_CALL` guard also matches `git -C <dir> <command>` and calls inside expressions, with
  `phase1/p6-bench.ps1` as its one named exception.
- **The frozen family:** `data/prior-s3-v1.json` with a reproducible generator (`tools/ig-proto/fit-prior-s3.mjs`, check and
  write modes like `fit-prior.mjs`, reading V4-S2's journals, IGP-05's families and `prior-v1.json`); the variant edits of 4.3 to
  4.5.
- **N-V4-13:** `live-deadline.mjs`; `v4-check accept` of the `live-deadline` kind.
- **Plans** (not hashed by `harnessInfo()`): `plans/V4-S2B.json`, `plans/V4-P7.json`, `plans/V4-S3P.json` and their item
  manifests.
- **Window.** Every edit of `lib/`, `data/` or the top-level `.mjs` and `.ps1` files is made before `V4-S4` starts and never while
  a plan runs; none from `V4-S4`'s `verdicts` step until `V4-S4C`'s final verdict (D-V4-20).

### 4.9 Compatibility

- Nothing reaches users in this pack (D-V4-11): `core/` and `generator/` do not change; the firewall checks it in every plan.
- Historical records and namespaces are never rewritten or reused (`V4-S2`, `V4-S2P`, `V4-S2K`, `V4-S2W`); new records are new
  files under `docs/improve-generating/evidence/frozen/<task>/`.
- Notes for phase 2 (N-V4-07): the production `W_screen` table follows the class verdicts with `freeze.json`'s bounds (for
  example `n-mid` admitted and `n-upper` inconclusive gives 190 M on 196-256 and no screen on 257-324); the budget and deadline
  tables are part of `gen-v4`'s definition (a change is a new `algo` or a versioned table); `require` keeps the frozen budget
  until N-V4-15 measures it.

## 5. Decisions

Only what is decided. SA technical decisions are those both SAs hold in their cross-reviews (`c159ab4`), in this draft and in
SA-Astra's review of it; decisions on matters that would previously have gone to the supervisor are marked "SA decision under
the owner's delegation (2026-11-23 15:29, Discord)" (the authority row of the header).

| ID | Decision | Decided by | Date | Source |
|---|---|---|---|---|
| D-S24-01 | Stage order: stage 2 (pilots, then the scoped C1 spike and C5) before stage 3 (the freeze) before stage 4 (validation); stage 3 freezes the `W_screen` table and its classes, the priors, any ranker, P5's budget table and bounded-attempt policy, the reserve and deadline configuration | plan v4 §5.1 (`plan.md:546-548`) | 2026-11-16 | `c3ef770` |
| D-S24-02 | Fitting seeds and validation seeds as in 4.7; no refit after the validation seeds run; a failed class falls back to no screen | plan v4 (IG-P-Q25, IG-P-Q27, §5.2); D-V4-13 | 2026-11-16 | `c3ef770`; `0edc636` |
| D-S24-03 | The admission statistics, the phase-0 completion gate (18 of 20, no dead end), the no-regression bound (0.9), Master identity and Hell 1 reported, not gated, all as plan §5.2 states them; the work condition judged on proved bounds | plan v4 §5.2; IG-P-Q37 | 2026-11-16 | `c3ef770` |
| D-S24-04 | One request deadline: a 115-s stop inside a hard 120-s response, the reserve a pilot parameter, work caps first and the clock as backstop, the accepted prefix returned, lost completions counted against the uncapped search | owner (IG-P-D1) | 2026-11-15 | `c3ef770` (plan §7) |
| D-S24-05 | No screen by default on Nightmare boards up to 144 cells | owner (IG-P-D4) | 2026-11-15 | `c3ef770` |
| D-S24-06 | (c4) is adopted only if it costs less than 10 % of T10 | plan v4 P3 (`plan.md:293-294`) | 2026-11-16 | `c3ef770` |
| D-S24-07 | Run rules: the lock helper, 900-s invocations, a 45-s quiet (15 s under the owner's idle declaration), timed requests sequential at four workers; caps asked on the round's account; runs pass the grant less the off-log minutes (747 today); every plan dry-run first and started so that the end of the orchestrator's session cannot end it; no `compile` (N-V4-02); typed receipts and accepted bindings (D-V4-18, D-V4-19); one collection at a time and the harness window (D-V4-20) | owner (2026-11-17 21:33); pack author; plan author | 2026-11-17 to 2026-11-23 | `0edc636` |
| D-S24-08 | The frozen round's grant is 749 counted minutes, given for `V4-S2`; `V4-LIVE`, `V4-S4` and `V4-S4C` are asked at their turn | owner | 2026-11-18 | `0edc636` (`check-list.md:561`) |
| D-S24-09 | Classes and `W_screen` of 4.1: `n-small` none; `n-mid` 196-256, `n-upper` 257-324 and `n-large` 360+ at 190 M; `hell-1` none; 145-195 and 325-359 unlisted | SAs (SA-Astra's cross-review D1; this draft) | 2026-11-23 | `c159ab4` |
| D-S24-10 | `prior-s3-v1` of 4.1 (Nightmare unchanged; Hell 1 from the seed-balanced pilot window share on four boards and PM1's windows on eight) | SAs (SA-Astra's cross-review D3; this draft); the P4 route is D-S24-21 | 2026-11-23 | `c159ab4` |
| D-S24-11 | The per-set prior on Hell 1 only | SAs | 2026-11-23 | `c159ab4` |
| D-S24-12 | No (c4), no bracket close, the rescue kept (`rerateMax` 4), no ranker | SAs | 2026-11-23 | `c159ab4` |
| D-S24-13 | P5 `any` budgets 10 G (Nightmare) and 40 G (Hell 1); four same-side attempts; budget stops never counted | SAs (SA-Astra's cross-review D2; this draft) | 2026-11-23 | `c159ab4` |
| D-S24-14 | The reserve: 0.6 of the deadline for the batch (a 46-s set-stage cap); 115-s stop; 120-s response | SAs | 2026-11-23 | `c159ab4` |
| D-S24-15 | P7's spike before the freeze, with the content of [`report.md`](report.md) §3 (C1 on R4, then R5, then C5; at most three composites; complete equality and the memory rule; go at x1.04); no `fewestColumn` buckets, no R4 cache | SAs; plan v4 §5.1 | 2026-11-23 | `c159ab4` |
| D-S24-16 | `V4-S2B` (the control pilot) and `V4-S3P` (the four frozen arms' P-1 passes before `V4-LIVE` and the activation) belong to the pack; their machine time waits for the owner (Q-S24-4; the gate of `V4-S3P`); `V4-S4P` still runs in `V4-S4` | SAs | 2026-11-23 | `c159ab4` |
| D-S24-17 | N-V4-18 is not implemented unless the owner asks for it (Q-S24-7) | SAs | 2026-11-23 | `c159ab4` |
| D-S24-18 | No remedy for N-V4-14 in this round (the finding is reported, [`report.md`](report.md) §1.4); a later tighter bound or relaxation would be a new proposal for a joint SA decision, with the owner's approval of any machine time | SA decision under the owner's delegation (2026-11-23 15:29, Discord) | 2026-11-23 | Discord message 1574341211701907457; `c159ab4` |
| D-S24-19 | Task order: the live composition before the variants that extend it; the four trees a candidate epoch before `V4-S3P` (4.3); `accept` extended by the receipt's typed kind (no `--kind` flag); the per-cell class and `W` consistency check | SAs (SA-Astra's cross-review D5, E6; its draft review, finding 3) | 2026-11-23 | `c159ab4` |
| D-S24-20 | Formal prices by T11g's rules are the approval basis; timing-proxy estimates stand beside them, never as caps; caps are minimum quotes for a scope, not replacement grants | SAs (SA-Astra's cross-review D7; its draft review, finding 6) | 2026-11-23 | `c159ab4` |
| D-S24-21 | Complete P4's Hell 1 table at the stage-3 fit from the existing IG-P-Q27 sources and the agreed fitting checks. V4-S2 remains valid evidence of its actual configuration; no replacement of its historical observations or change to D-V4-20 is required. The numerical fit and technical checks are the SAs' work; new machine scopes still require the owner. | SA decision under the owner's delegation (2026-11-23 15:29, Discord) | 2026-11-23 | message 1574341211701907457; `sa-astra/round-1-draft-review.md` and the drafter's Q-S24-1 recommendation |
| D-S24-22 | Run the isolated P7 spike before the freeze; retain the reference kernel in all four frozen arms. Passing composites are candidates for the later phase-1 production work, with its own gates; phase 2 repeats validation on production. No P7 speed credit is taken in this frozen round. | SA decision under the owner's delegation (2026-11-23 15:29, Discord) | 2026-11-23 | message 1574341211701907457; `sa-astra/round-1-draft-review.md` and SA-Opus's Q-S24-2 option (a) |
| D-S24-23 | `require` budgets of 32 G (Nightmare) and 40 G (Hell 1) per selection call: conservative candidate limits, not measured general affordability guarantees, the Hell 1 value not set below the 40 G `any` budget as a design choice; they apply once the owner confirms the finite policy (Q-S24-3); the four final arms must pass their real parity and replay proofs; N-V4-15 stays open | SA decision under the owner's delegation (2026-11-23 15:29, Discord) | 2026-11-23 | message 1574341211701907457; `sa-astra/round-1-draft-review.md` finding 1 |
| D-S24-24 | The check of the new Hell 1 settings before the freeze: the four final-family P-1 passes, then 20 `fr-frozen-none-uncapped` requests on 14x14, 20x20, 24x24 and 26x26 Hell 1, reps 0-4, in `V4-S3P` before `freeze.json`, read through the gate of T11 ([`report.md`](report.md) §2.7); no 14x14 Nightmare rows and no candidate-arm `V4-S2F` by default; the owner approves the scope and its minutes, not the experiment's design (Q-S24-5) | SA decision under the owner's delegation (2026-11-23 15:29, Discord) | 2026-11-23 | message 1574341211701907457; `sa-astra/round-1-draft-review.md` finding 3 |

These joint decisions change no decision the owner recorded.

**Not decided** (open, all for the owner): the `require` policy (Q-S24-3), the control pilot's allowance (Q-S24-4), the scope
of the Hell 1 check (Q-S24-5), the spike probe's allowance (Q-S24-6), N-V4-18 (Q-S24-7); later: the proofs of `V4-S3P` at
their gate, S4-6 and every allowance of section 8.

## 6. Acceptance criteria

| # | Criterion | Kind | Verified by |
|---|---|---|---|
| B1 | Phase 0's completion gate: at least 18 of 20 on each failing Nightmare cell (12x12, 14x14, 15x15b10, 16x16, 15x20) on the arm its class ships, no dead-end entry | business | `V4-S4C`'s final `verdicts.json` (T09d `cellGate`) |
| B2 | Every completion-passing Nightmare control has at least 18 of 20 requests reaching ten on its shipped arm and a one-sided 90% lower no-regression ratio of at least 0.9, with its complete declared evidence. All 16 Master cells pass five-seed ordered-puzzle identity; Master timing is reported, not gated. The old 18x18 baseline is described as completion-passing, not as meeting the absolute tail-time target (20/20 reached ten; p95 134.5 s). This reporting note does not exempt 18x18 from either control gate above: its shipped arm still needs at least 18/20 completions and the one-sided 90% no-regression lower bound of at least 0.9. No separate absolute tail-time qualification is inferred for the old baseline. | business | the same record (`noRegression`, `masterIdentity`) |
| B3 | Every class has a rule (c5) verdict with its deciding condition | business | `V4-S4`'s class selection; the final record |
| B4 | The reserve and the deadline are frozen and proved on real rows | business | `freeze.json`; `V4-LIVE/live-deadline.accepted.json` |
| B5 | Hell 1 reported per board (candidate or not), the population two-sided per cell, P5's lost completions and false stops per cell | business | the final record (`hell1`, `population`, `p5`); the stage-4 report |
| B6 | No run beyond its approved cap; every new scope approved by the owner before it runs | business | dry runs; the invocation rows; the orchestrator's execution log |
| T1 | `freeze.json` names the 19 comparator cells, each once, with bounds, values, ids, seeds and fit hashes, and matches T11e's `activation` | technical | the encoding task's check; `activate` refuses otherwise |
| T2 | The four variants exist; `check-edits --all` clean; `check-binding --current v4` against the P-0 binding `pass`; the four differ only as declared; every comparator cell's runtime `W` equals its class's value | technical | the encoding task's gates |
| T3 | Real calls show the frozen `W` per class, the budget per mode and level, the per-set prior on Hell 1 only; the bound's reason transported by a real worker | technical | `--v4` self-test cases |
| T4 | The live deadline's scripted-pool cases pass on both bounded twins. Without a clock cut, widths 1,2,4,8 return the same ordered puzzles. With a clock cut, returned lengths may differ; every result is a prefix of the same deterministic fold and common slots contain the same puzzles. Scripted-clock cases separately pin each expected prefix and verify cancellation/assembly. `check-prerequisites --plan V4-LIVE` prints `pass` | technical | the live-deadline tasks' gates |
| T5 | `V4-S3P`'s four P-1 receipts pass, replay blocks included (a `require` generation completed under the frozen budget) | technical | `V4-S3P/*.receipt.json` and bindings |
| T6 | P7: complete `DeductionResult` equality (work, nodes, caps, ties, undo paths, near-32-MiB models), the memory rule kept, one composite measured against one reference; a failing candidate leaves the reference | technical | the spike's equality records and probe |
| T7 | `V4-S4`'s P-1 passes pass; every declared row published or closed by the owner; the selection final; `V4-S4C` resolved from it and run; the final verdict written | technical | the plans' receipts and records |
| T8 | The stage-4 report re-reads N-V4-16 and N-V4-17 on the frozen arms' journals | technical | the stage-4 report |
| T9 | `npm run check` passes; the self-test groups pass; the firewall reports production files unchanged | technical | each task's gates |

## 7. Risks

| Risk | Likelihood and effect | Mitigation |
|---|---|---|
| 196-256 fails its work condition at 20 seeds (a margin of 0.229 G per puzzle) and the headline pair loses its screen | Unknown on held-out seeds; the smaller pilot margin increases coupling risk. Strict fail-closed validation remains. The fallback completed its five pilot requests, not a promised 20/20. | accepted to include the measured 16x16 benefit; no refit after validation |
| A control fails no-regression on its shipped arm (one failure stops phase 2) | unknown for 8 controls; 26x26 Nightmare's preview lower bound 0.881 | `V4-S2B` before the freeze; a warning there is decided jointly by the SAs (under the owner's delegation) before stage 4, with the owner for any scope or recorded-decision change |
| The new Hell 1 table with the per-set prior behaves unlike the pilots | moderate; Hell 1 is reported, not gated | the 20-request uncapped check and its read gate (D-S24-24; scope Q-S24-5) before `freeze.json` |
| P5's glue or bound misbehaves when it first fires | Unknown: no real triggering pilot. The real-worker transport case and later journal reading are required. | a real-worker test (4.4); `p5Stops` against the uncapped twins; N-V4-16 re-read in stage 4 |
| A frozen arm's proof fails after the activation | low after `V4-S3P` | `V4-S3P` before `V4-LIVE` |
| A `require` call on a large board needs more than its budget | unknown (N-V4-15) | the stage-4 proofs use 12x12 Nightmare only; production measures large boards first |
| 14x14 Hell 1 fails 18 of 20 under the deadline | likely (3 of 5 projected) | reported only; it keeps or loses its own board |
| A long `V4-S4` run (8 to 9 hours) stops or is killed | possible | started detached; resumed by a ruling with `-Only`; N-V4-19 before it |
| A tree moves after a binding, or a harness edit falls in D-V4-20's window | low | `check-binding` in every gate; the order of section 8; no harness edit while a plan runs |
| The P7 spike's 14 to 22 developer hours delay the freeze | certain under the plan's order | accepted (plan order, D-S24-22); moving it after the freeze would be a joint SA decision under the owner's delegation |
| The formal caps look large (about 1,726 to 1,737 for `V4-S4`) | certain | each approval shows the timing-proxy estimate beside the guard; caps are minimum quotes, not grants |
| Census-estimated Hell 1 scores (38 to 100 % of Hell 1 puzzles) | certain | reported per cell (plan §8) |

## 8. Phases and the task outline for break-tasks

### 8.1 Order and dependencies

```text
T01 hygiene -> T02 V4-S2B plan -> [S-1] V4-S2B run and reading
  -> T03-T05 P7 spike (C1, R5, C5) -> [S-2] V4-P7 probe -> spike report
  -> T06 frozen parameters -> T07 live mechanism -> T08 four frozen variants -> T09 live receipt and acceptance
  -> T10 V4-S3P plan -> [S-3] V4-S3P run -> T11 SAs' reading -> T12 freeze.json
  -> [S-4] V4-LIVE -> [S-5] S4-6 and activate -> [S-6] V4-S4 -> [S-7] V4-S4C -> T16 stage-4 report and phase 0
```

Optional: T-N18 (N-V4-18) between T08 and T12, only if the owner chooses it (Q-S24-7). The joint decisions D-S24-21 to D-S24-24
(the owner's delegation) replace the former supervisor questions and SA disagreements; no task waits for a supervisor answer.

### 8.2 Tasks

Machine minutes: formal projected / guard (T11g's rules), and the timing proxy (V4-S2's measured times of the same steps, 15 or
45 s quiet; for `V4-P7`, T11g's item schedule at V4-S2K's measured item times). Developer hours are estimates. "Locked
verification" (tests that execute real ratings) runs through the lock helper and is reported apart, with no allocation
(D-V4-15).

| ID | Task | Inputs | Gates | Machine | Dev | Stops |
|---|---|---|---|---|---:|---|
| T01 | N-V4-19 (publish every done shard, name the others) and N-V4-20 (the `GIT_CALL` guard, its one exception) | `check-list.md:641-642` | self-test groups; synthetic stopped-shard cases; `check-edits --all`; firewall; `npm run check` | locked verification only | 3-5 h | - |
| T02 | The plan `V4-S2B` (4.6) and its reading script: the no-regression preview against MP12b1's reps 0-4, and the uncapped call prefixes read against the proposed 10 G limit (`fr-none` does not enforce that budget; a fitting warning, not a five-seed no-regression verdict) | `s2-today.mjs`'s method | dry run `go`; `check-prerequisites` `pass` | - | 1.5-2 h | - |
| S-1 | Run `V4-S2B` (orchestrator); the SAs' reading | T02 | publish complete; reading in the SAs' notes | 22.59 / 28.24; 16-20 | - | owner: Q-S24-4 (minimum cap 201 if run first) |
| T03-T05 | P7: C1 (live-row lists for R4), then R5, then C5, each with equality on PM4's and T10a's corpora and the memory rule; the probe items; the frozen arms keep the reference kernel (D-S24-22) | [`report.md`](report.md) §3; T10a, T10b | equality records complete; at most three composites | locked verification | 14-22 h | - |
| S-2 | `V4-P7`: the timing probe; the spike report (go at x1.04) for phase 1 | T03-T05 | probe complete; report | 15.50 / 19.37; 11.4-12.9 | - | owner: Q-S24-6 |
| T06 | The frozen family's parameters: `fit-prior-s3.mjs` and `data/prior-s3-v1.json`; the budget lookup by mode; the per-set level filter; tests | 4.1, 4.4; the S-1 reading; D-S24-21, D-S24-23 | `fit-prior-s3.mjs` reproduces the file; self-test cases; `check-edits` | - | 4-6 h | the owner's answer to Q-S24-3 |
| T07 | The live deadline mechanism (`live` variant) and its scripted-pool tests | 4.5 | every case of 4.5, the widths rule included | - | 5-8 h | - |
| T08 | The four frozen variants (4.3) as a candidate epoch, the class and `W` consistency check, the comparator-difference check | T06, T07 | `check-edits --all`; `check-binding --current v4` `pass`; `--v4` cases (T3) | - | 3-5 h | - |
| T09 | `live-deadline.mjs receipt` and the `live-deadline` kind of `accept` | 4.5; T04d, T04f, T11d | synthetic receipt and acceptance cases; `check-prerequisites --plan V4-LIVE` `pass` except `freeze.json` | - | 3-4 h | - |
| T10 | The plan `V4-S3P` (4.6), with the 20 Hell 1 rows if the owner approves their scope (Q-S24-5) | T08 | dry run `go` | - | 1-2 h | - |
| S-3 | Run `V4-S3P` (orchestrator) | T10 | four receipts `pass` with replay; bindings accepted; the 20 rows published | 71.20 / 89.00; 20-22 (+ 67.69 / 84.61; 20-22) | - | owner: cap at the gate; the rows' scope (Q-S24-5) |
| T11 | The SAs' reading of the Hell 1 check (the gate below) and of `V4-S2B`; the freeze values confirmed, or a ruling sends T06/T08 back | S-1, S-3 | the gate below; the SAs' note | - | SA | a joint SA decision under the owner's delegation; the owner's confirmation if one of his recorded decisions would change; the owner for any new measured scope |
| T12 | `freeze.json` and `freeze.md`, written once | 4.1, 4.2; T08; T11 | the check against T11e's `activation`; T1 | - | 2-3 h | - |
| S-4 | `V4-LIVE` (orchestrator): approval re-read, run, receipt `pass`, binding | T09, T12 | `live-deadline pass`; binding accepted | 35.12 / 43.91; 4-5 | - | owner: cap at its turn (217 if nothing else ran) |
| S-5 | The activation (orchestrator): §3.4's go checks; `manifest.mjs activate --collection initial` | S-4 | 80 groups, 1,120 declared rows, 19 comparator cells | - | - | owner: S4-6 (recommended no) and the authorization |
| S-6 | `V4-S4` (orchestrator): approval, run (detached), P-1 passes, rows, publishes, the class selection, `resolve-comparators` | S-5 | T7 | 1,185.49 / 1,481.86; 464-510 | - | owner: a raise (minimum cap about 1,726-1,737 at the proxy spend); a closure only on his instruction |
| S-7 | `V4-S4C` (orchestrator): approval, run, the final verdict | S-6 | the phase-0 line written | 585.62 / 732.02; 170-183 | - | owner: approval of the scope at its turn (a raise only if its minimum exceeds the grant then active) |
| T16 | The stage-4 report (verdicts, N-V4-16 and N-V4-17 on the frozen arms, P5's stops and lost completions, the population, the deadline violations) and N-V4-06's decision | S-7 | the joint report | - | SAs | owner: phase 0's result |
| T-N18 | (optional) N-V4-18's coordinated change, all its places at once, with end-to-end synthetic cases | `check-list.md:640` | its cases; the activation re-priced | saves 240.37 / 300.46; 90-95 | 5-8 h | owner: Q-S24-7 |

**T11's acceptance and read gate** (D-S24-24):

> The SAs read all 20 valid published rows and their complete worker/link journals against the proposed bounded
> configuration, including losing and terminated calls. The reader accumulates main, census and uniqueness
> units in primitive order. It identifies any recorded next primitive whose selection-call spent total before it is at least
> the proposed budget; a terminated call whose completed spent total already reaches the budget is flagged
> as potentially affected, even without a following begin line. A currently running primitive is not assumed
> cut by P5: the check is between primitives, not inside one.
>
> The reader also tests the first-four same-side no-window condition from the set-call ends and reads the new
> table/per-set-prior transport. It computes the reserve/deadline projection from these new **uncapped**
> timelines, per cell, reporting projected reserve cuts and lost completions separately.
>
> If a budget or attempt bound could affect an observed path, or missing/ambiguous evidence prevents that
> determination, the freeze pauses for an SA ruling. Before accepting affected settings, the SAs specify the
> smallest necessary matched bounded experiment, price it under a new task/manifest and obtain the owner's
> approval. An uncapped prefix identifies risk; it does not identify which best candidate a truncated call
> would return, the changed fold timing, or request-level lost completions.
>
> If no observed path is flagged, the report may say the proposed deterministic limits would not intervene
> at the observed primitive boundaries. It must not call this a measured zero-loss bounded/uncapped comparison
> or a live-deadline proof. V4-LIVE and every declared V4-S4C comparison remain mandatory.

### 8.3 The account at each owner stop

Counted minutes (`evidence/sa-opus/j1-numbers.md` §3, equal to `evidence/sa-astra/draft-review-check.json`; all are
projections, not approvals):

| Gate | Guard min | Minimum cap at the timing-proxy spend | Cap if earlier guards are spent |
|---|---:|---:|---:|
| V4-S2B | 28.243734 | 201 | 201 |
| V4-P7 | 19.369531 | 208-212 | 220 |
| V4-S3P, proofs plus 20 Hell rows together | 173.609948 | 374-379 | 394 |
| V4-LIVE | 43.905504 | 284-294 | 438 |
| V4-S4 | 1,481.858106 | 1,726-1,737 | 1,920 |
| V4-S4C | 732.021379 | 1,441-1,497 | 2,652 |

These are minimum quotes for the named scope at the assumed spend, not replacement grants. Preserve an
already-active higher grant unless the owner explicitly changes it. Every new scope still needs approval;
a raise is needed only if its current minimum exceeds the current grant. In particular S4C's minimum may
be below the S4 grant after S4 underspends. Re-read the account and actual compiled plan at every gate.

End-of-round proxy: 877.817-946.817 counted minutes; guard-chain account: 2,651.343 minutes. Every stop before `V4-S4` fits
inside the 749 granted; `V4-S4` needs a raise.

### 8.4 What follows (later packs, each at its gate)

Phase 0's result (N-V4-06) to the owner. If it passes: phase 1's P7 items if the spike passed (N-V4-05; plan §6), phase 2's
`gen-v4` in production (N-V4-07) with N-V4-15 and the validation repeated on the production code; phase 3's offers (N-V4-08)
after the blind play comparison (N-V4-09); phase 4 (N-V4-11); N-V4-01, N-V4-04 and N-V4-10 when the owner asks. If it fails
or is incomplete: the failing item is decided jointly by the SAs under the owner's delegation before any refit, with the
owner's confirmation if one of his recorded decisions would change (no class is refitted on validation seeds).

## 9. Named open items

| ID | Item | Where |
|---|---|---|
| Q-S24-3 to Q-S24-7 | The open questions, all for the owner | [`clarifications.md`](clarifications.md) |
| T11's gate | Whether a budget or attempt bound could affect an observed path of the Hell 1 check | T11 (8.2) |
| N-V4-16 | P5's bound and glue on a real no-window request | the stage-4 report (T16) |
| N-V4-17 | The mechanisms' reach on the frozen arms | the stage-4 report (T16) |
| N-V4-15 | `require` on the Generator's largest boards | the production pack (N-V4-07) |
| N-V4-14 | A tighter bound or relaxation for 257+ cells | a new proposal, only if wanted (D-S24-18) |
| S4-6 | Today's arm on the failing cells (an indication, 58.00 / 72.50) | the owner, at the activation |

## 10. References

- Plan v4: [`../improve-generating/plan.md`](../improve-generating/plan.md) (`c3ef770`): P2 (`:240-275`), P3 (`:276-298`), P4
  (`:300-319`), P5 (`:321-346`), P7 (`:357-398`), §5.1 (`:500-588`), §5.2 (`:589-646`), §6 (`:660-700`); the plan author's
  answers IG-P-Q09 and IG-P-Q10 (`docs/improve-generating/clarifications.md` at `1731c6b`), IG-P-Q37 (`4c48cf1`).
- The v4 pack: `tasks/improve-generating-v4/check-list.md` (`0edc636`): §3 (run rules), §4 (D-V4-01 to D-V4-20, `:516-539`), §5
  (`:541-617`), §6 (N-V4-02 to N-V4-21, `:621-643`), §8 (`:688-729`).
- This feature: [`request.md`](request.md), [`report.md`](report.md), [`clarifications.md`](clarifications.md); the analyses and
  cross-reviews in `sa-opus/` and `sa-astra/`; the evidence in `evidence/sa-opus/` and `evidence/sa-astra/`.
- Harness: `tools/ig-proto/README.md`; `manifest.mjs`, `verdicts.mjs`, `v4-check.mjs`, `arm.mjs`, `lib/`, `data/frozen-round-v1.json`,
  `plans/V4-LIVE.json`, `plans/V4-S4.universe.json`, `variants/`.
