# SA-Opus, round 1: analysis of improve-generating, stages 2 to 4 of the frozen round

| Item | Value |
|---|---|
| Analyst | SA-Opus (claude-opus-5.5), role sa; round 1 of `analyze`, written without reading SA-Astra's folders |
| Date | 2026-11-23 |
| Request | [`../request.md`](../request.md): the owner, 2026-11-23 12:54 +07:00, "continue doing all the work until it is finished" |
| Binding plan | [`docs/improve-generating/plan.md`](../../improve-generating/plan.md) version 4, final for break-tasks, plan author claude-fable-5-2 (SA-Fable); a deviation from it is a question for the supervisor |
| Inherited pack | `tasks/improve-generating-v4/` (check-list §3, §4, §5, §6 N-V4-02 to N-V4-21, §8 "What the stages 2 to 4 pack inherits") |
| Repository | `Q:\git\pentomino`, branch `improve-generating`, HEAD `5807bd1`; V4-S2's evidence commit `35b401e` |
| What ran | No locked or timed run, no rating, search or generation. Read-only computations on V4-S2's records by the scripts of [`../evidence/sa-opus/`](../evidence/sa-opus/) (section 10), and one read-only harness command, `manifest.mjs approval --plan V4-LIVE` |

**Labels.** **[V]** verified: read at the cited `path:line`, or computed from the records by the cited script (its command is
in section 10). **[A]** assumed: a projection, a judgement or a reading of intent, with its basis. A *counted minute* is the
round's unit (node seconds plus at most 45 quiet seconds per locked invocation, check-list §1). Pilot statistics are on five
fitting seeds per cell: they are readings, never verdicts.

**Where the request's parts are.** A, the stage-2 report: section 3.3 (A.1 to A.14). B, the freeze proposal: sections 4.1 to
4.8 (options) and 5.1 to 5.3 (the proposal). C, P7's spike: sections 4.9 and 5.4. D, the stages 2 to 4 pack outline and the
owner's stops: section 8. Questions: section 9. Commands and records: section 10.

## 1. Summary

1. V4-S2 is complete and clean [V]: 164 of 165 requests reached ten, no dead end, every ledger complete; equal configurations
   gave equal puzzles on 20 of 20 seeds with T10 within 0.99 to 1.11, so 10 to 20 % effects are readable at five seeds.
2. Freeze [A, fitted on V4-S2]: `W_screen` 190 M on Nightmare 196-256 cells (x2.2-2.6, no same-set clue shift), evaluated at
   190 M on 257-324 and 360+, none up to 144 cells and on Hell 1; Hell 1's prior refitted, per-set prior on Hell 1; no (c4), no
   bracket close; P5 10 G / 40 G per `any` call (Nightmare / Hell 1), none for `require`, bound 4; 115 s, set reserve 0.6, 120 s.
3. Main risk [V]: T02d's bound of an open primitive is 2 to 780 times what a rating charges, so rule (c5)'s work condition is
   undecidable for every class with a board of 300 cells or more (Q1, supervisor). Also: 8 of 10 controls never piloted (Q3), the
   bound's glue never ran on a real call (N-V4-16), and P5's pilot budget stopped 41 % of Hell 1 calls (N-V4-21).
4. Next: harness fixes, a 16-20 min control pilot, the freeze, the live deadline, proofs `V4-S3P` and `V4-LIVE` (inside the 749),
   activation, `V4-S4` (~470-515 counted min; cap ~1,700 on the account), `V4-S4C` (~170-185); P7's spike after phase 0.

## 2. Understanding of the request

### 2.1 Goal

- **[V]** The owner asks for "all the work until it is finished" ([`../request.md`](../request.md)): the hand-over of the v4 pack
  (`tasks/improve-generating-v4/check-list.md:701-723`): the stage-2 report (N-V4-14, N-V4-16, N-V4-17, N-V4-21, the kernel and
  width probes), P7's spike (N-V4-05), the freeze and its encoding (N-V4-03, N-V4-18 optional), the live deadline and `V4-LIVE`
  (N-V4-13), stage 4 (activation, `V4-S4`, `V4-S4C`, verdicts), then phase 0 (N-V4-06) and the later phases, each at its gate.
- **[V]** This analysis is round 1 of `analyze`: its sections are the material of the joint report and of this feature's
  `plan.md` (a sub-plan under plan v4: the stage-2 report, the freeze proposal, the stages 2 to 4 pack outline).
- **[A]** "Finished" for this pack means phase 0 decided (N-V4-06) with its report to the owner; phases 2 to 4 are later packs,
  each behind its own gate and approvals (plan §6; check-list §8 "Later packs").

### 2.2 Who decides what

| Who | Decides in this pack | Source |
|---|---|---|
| Owner | every machine allowance (each plan's cap on the round's account), the authorization of `activate` and the optional S4-6, any `close`, the idle declaration, scope additions (Q3, Q4), any push, merge or release | check-list §3.4 (`:486-515`); agent roles |
| Supervisor (SA-Fable) | anything that changes plan v4 or a recorded decision: the N-V4-14 remedy (Q1), P5 for `require` against IG-P-D1's "work caps first" (Q2) | agent roles; N-V4-14 (`check-list.md:636`) |
| SAs | the fit of the freeze within plan v4 (class boundaries, priors, budgets, reserve: plan §5.1 stage 3, `plan.md:547`; N-V4-03 "the fit is the analysts' work", `check-list.md:625`); the pack and its rulings | plan §5.1, §5.2 first paragraph (`plan.md:590-593`) |
| Dev-Sonnet | the tasks' code, tests and documents; never an open point | agent roles |

### 2.3 Constraints that bind the work [V]

- **Plan v4.** Stage 3 freezes "the `W_screen` table, the priors, any ranker, P5's budget table and bounded-attempt policy, and
  the IG-P-D1 reserve and deadline configuration" (`plan.md:547`); the table and its class boundaries are fitted on pilot seeds
  and frozen before the validation seeds run (`plan.md:270`); a class that fails validation falls back to no screen and is never
  refitted on validation seeds (`plan.md:645`); validation seeds are disjoint from every fitting seed (IG-P-Q25, `plan.md:558`);
  the freeze of P4 uses MP12b1's medians, PM1's first slice, R28 and stage 2's pilots (IG-P-Q27, `plan.md:551`); the fit
  criterion of `W_screen` is the least expected total work per accepted puzzle (IG-P-Q09, `clarifications.md` at `1731c6b`, line
  275); budgets are "a versioned table per level and area class ... so that a call can afford the locate-and-window pattern it
  needs" (IG-P-Q10, same file, line 299); rule (c5)'s work condition is judged on proved bounds (IG-P-Q37, `plan.md:744`), and a
  width that leaves a class undecidable is "reported then as a finding; the remedy (a tighter proved bound, or the owner changing
  the rule ...) is a new proposal" (IG-P-Q37 answer point 4, `clarifications.md` at `288669b`, line 476).
- **Owner decisions.** IG-P-D1 (one deadline, work caps first, the reserve a pilot parameter, lost completions counted against
  the uncapped search, `plan.md:331-340`); IG-P-D3 ((c4) adopted only below 10 % of T10, `plan.md:293-294`); IG-P-D4 (no screen
  by default up to 144 cells); IG-P-D6 (24x24 and 14x14 Hell 1 as candidate populations); IG-P-D7 (a staged, priced round).
- **Inherited run rules** (`check-list.md:703-716`): the lock helper copy, 900 s per locked invocation, a 45-s quiet unless the
  owner's idle declaration holds, timed requests sequential at four workers; caps asked on the round's account, runs passing the
  grant less the off-log minutes (747 today); every plan dry-run first and started so that the end of the orchestrator's session
  cannot end it; a stopped plan resumed only by a ruling with `-Only`; D-V4-11 (no plan runs during a production change); N-V4-02
  (`manifest.mjs compile` is never run again); §3.1 (historical namespaces); §3.3 (decided records written once); D-V4-18 and
  D-V4-19 (typed receipts, accepted bindings, required passes); D-V4-20's window (no edit of the files `harnessInfo()` hashes from
  `V4-S4`'s `verdicts` step until `V4-S4C`'s final verdict) and §3.4's go of `activate` (`check-list.md:498-509`).
- **Bindings that pin trees** (each is a prerequisite later): the P-0 binding with `current: ['v4']` (`plans/V4-LIVE.json`
  prerequisites; T11e `:42-44`; T11f `:101-106`), the live-deadline binding with `current: ['fr-frozen', 'fr-frozen-none']`
  (`V4-S4`'s prerequisites and the final verdict), and `V4-S4P`'s parity bindings with `current: [<arm>]` (the final verdict). So
  no file of the `v4` chain (`base>instr>log>v4`) may change from now on, no file of `fr-frozen`'s and `fr-frozen-none`'s chains
  after `V4-LIVE`, and no file of the four frozen arms after `V4-S4P`, until the final verdict.
- **Repository rules.** `docs/` subfolders and `tasks/` are records (`AGENTS.md`); new records are new files.

### 2.4 Assumptions

- **[A] A1.** The request authorises analysis and planning now; every locked run waits for its owner approval (check-list §3.4).
- **[A] A2.** Sudoku's difficulty-v3 keeps priority; prices reserve a 45-s quiet; realistic estimates show 15 s and 45 s.
- **[A] A3.** Stage 4 runs on the same 16-thread EPYC 7763 machine as V4-S2 (V4-S2W `width.md`, "Machine").
- **[A] A4.** Stage-4 row times resemble V4-S2's per cell; used only for the realistic cost beside the formal guards.
- **[A] A5.** Production (`core/`, `generator/`) does not change before phase 0 is decided (D-V4-11), so nothing here reaches users.

## 3. Current state

### 3.1 Code, harness and plans [V]

- **Branch.** `improve-generating` at `5807bd1` (this request) over `35b401e` (V4-S2's evidence). Phase 1's production changes,
  P6 (T12) and the history policy (T13), are committed and unreleased; T14 closed N-V4-12 (`check-list.md:634`).
- **Stage-2 arms** (`tools/ig-proto/variants/fr-*.json`; README `:1464-1520`): `fr-base` (screen classes `hell-1` null, `n-small`
  null, `n-mid` 190 M, `n-large` null), `fr-screen` (Hell 1 380 M, every Nightmare class 190 M), `fr-none`, `fr-close` (`rerate:
  'close'`), `fr-c4` (`c4: true`), `fr-ps` (`v4-ps`), `fr-p5` (`v4-p5`: `callBudget { default: 2e9 }`, `setAttemptsBound` 4).
- **Code facts the freeze depends on** (`tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js`): `callBudgetOf` keys the
  budget by level id only (`:82-88`); `screenClass` fixes `n-small` up to 144 cells, `n-mid` 196 to 324, `n-large` from 360, any
  other area `null` (`:97-112`); `classW` fails closed to the canonical 760 M (`:122-129`); the table prior is
  `round(share x K)` from `IG.prior['<level>@<area>']`, else none (`:199-205`); `igRatingBound` is `setup + limits.work +
  limits.census + 2 (P + U)` from upper bounds of the model's sizes, with R9's term `3 (NC^2 / 2) K L` (`:257-279`); a budget stop
  returns the best waiting candidate in `any` mode and only a finished final in `require` mode (`:1303-1316`); the no-window side
  is reported only when `setAttemptsBound` is set (`:1071-1082`).
- **The freeze file's readers** use only `classes` and check each class's `id`, `cells`, `screen` and `noScreen`
  (`tools/ig-proto/manifest.mjs:2246`, `:2619`), so extra top-level keys are tolerated; `activate` refuses a freeze whose classes
  do not name exactly the comparator cells, each once (`freezeMismatch`, T11f).
- **Absent today** (expected, N-V4-03 and N-V4-13): the four `fr-frozen*` variants,
  `docs/improve-generating/evidence/frozen/V4-S3/freeze.json`, `tools/ig-proto/live-deadline.mjs`, and the `live-deadline` kind
  of `v4-check accept` (only `LIVE_DEADLINE_FIELDS` exists, `tools/ig-proto/lib/proof.mjs:25-26`). `V4-LIVE`
  (`tools/ig-proto/plans/V4-LIVE.json`) is compiled: `fr-frozen` on `14x14-nightmare` and `26x26-hell-1`, reps 0 to 4, row limit
  260, then `publish-fr-frozen`, `live-receipt --require-pass` and `accept-live`; its prerequisites are the `fr-frozen` variant,
  the freeze file, `live-deadline.mjs` and the P-0 binding with `current: ['v4']`.
- **Receipts of V4-S2P** (`docs/improve-generating/evidence/frozen/V4-S2P/`): `p0-identity pass`; `parity pass` and accepted
  bindings for `fr-base`, `fr-screen`, `fr-none`, `fr-close`, `fr-c4`, `fr-ps`; `fr-p5` `incomplete` (`replay: no record obtained
  for 12x12-nightmare (fr-p5) (no-set)`), no binding (N-V4-21; ruling of 2026-11-23, `check-list.md:617`).

### 3.2 The round's account [V]

| Item | Value | Source |
|---|---:|---|
| Logged counted seconds | 10,252.712 (IGP-02 1,020.460; V4-T04 1,353.690; V4-T05 186.086; V4-T06 163.493; V4-T10a 69.035; V4-T10b 60.087; V4-T10c 61.059; V4-S2 7,338.802) | `s2-account.mjs` |
| Off-log seconds | 87.4 (T10a's scratch 55.4; the killed V4-S2 invocation 32) | `check-list.md:616` |
| Account | 10,340.112 s = 172.34 min of 749 granted; 576.66 min left; runs pass 747 | `s2-account.mjs` |
| V4-S2 against its price | 122.3 counted min in 44 invocations (none killed) against a projection of 559.2 and a guard of 699.0 | `s2-account.mjs`; T11g `manifest.md` §1.1 |
| `approval --plan V4-LIVE` now | `roundCountedSBeforeApproval` 10,252.712, guard 2,634.330 s, cap 215 (logs only); 217 with the off-log seconds | command in section 10 |

V4-S2 cost a fifth of its price because T11b projects every row from today's search times 1.25 (the frozen arms are 2 to 10
times faster on the failing cells, `s2-today.md`) and reserves a 45-s quiet, while every V4-S2 invocation after P-0 had 15 s.
The pack's "`V4-LIVE` asked at 793 on the account" assumed V4-S2 spent its whole guard; today the cap `V4-LIVE` needs is 217,
inside the 749 granted.

### 3.3 The stage-2 report

#### A.1 Rows per arm and cell [V]

All 165 rows are `valid` (T09a's `ingestRow`); 164 reached ten; 1,642 puzzles; 2 responses above 120 s (both 14x14 Hell 1,
under today's two separate timers). Times in seconds; work in G units (1e9) per accepted puzzle, T09c's ledger (`lo` completed,
`hi` with the open primitives' bounds); census-estimate share = rated with an incomplete census (T09d's `population`).
Source: `s2-table.md` (from `s2-rows.mjs` and `s2-calls.mjs`).

| Cell (class) | Arm | Ten of 5 | T1 med s | T10 med (max) s | Response max s | Clues med (share) | Census-estimate share | Work lo / hi per puzzle G | W of the start lines |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 12x12-nightmare (n-small) | fr-base | 5 | 1.4 | 12.8 (28.4) | 28.6 | 4.0 (0.211) | 0.42 | 1.66 / 2.35 | 760 M |
| 12x12-nightmare (n-small) | fr-screen | 5 | 1.4 | 6.8 (16.1) | 16.3 | 5.0 (0.263) | 0.16 | 0.89 / 1.24 | 190 M |
| 12x12-nightmare (n-small) | fr-none | 5 | 1.4 | 12.9 (28.4) | 28.6 | 4.0 (0.211) | 0.42 | 1.66 / 2.40 | 760 M |
| 12x12-nightmare (n-small) | fr-close | 5 | 1.4 | 12.9 (28.3) | 28.4 | 4.0 (0.211) | 0.42 | 1.66 / 2.39 | 760 M |
| 10x10-nightmare (n-small) | fr-screen | 5 | 4.1 | 16.3 (72.8) | 73.0 | 4.0 (0.235) | 0.50 | 2.20 / 2.37 | 190 M |
| 10x10-nightmare (n-small) | fr-none | 5 | 4.3 | 10.6 (51.4) | 51.6 | 3.0 (0.176) | 0.86 | 1.64 / 2.02 | 760 M |
| 14x14-nightmare (n-mid) | fr-base | 5 | 1.6 | 8.9 (11.5) | 11.7 | 7.0 (0.292) | 0.10 | 0.92 / 1.71 | 190 M |
| 14x14-nightmare (n-mid) | fr-screen | 5 | 1.6 | 8.9 (11.6) | 11.7 | 7.0 (0.292) | 0.10 | 0.95 / 1.75 | 190 M |
| 14x14-nightmare (n-mid) | fr-none | 5 | 4.7 | 24.1 (30.8) | 30.9 | 6.0 (0.273) | 0.08 | 2.58 / 3.73 | 760 M |
| 14x14-nightmare (n-mid) | fr-close | 5 | 1.6 | 9.0 (15.8) | 16.0 | 6.5 (0.289) | 0.06 | 1.01 / 1.81 | 190 M |
| 14x14-nightmare (n-mid) | fr-c4 | 5 | 2.2 | 10.7 (11.7) | 11.8 | 6.0 (0.279) | 0.10 | 1.09 / 1.84 | 190 M |
| 14x14-nightmare (n-mid) | fr-p5 | 5 | 1.7 | 8.7 (11.5) | 11.6 | 7.0 (0.292) | 0.10 | 0.92 / 1.71 | 190 M |
| 15x15b10-nightmare (n-mid) | fr-screen | 5 | 1.8 | 8.1 (14.5) | 14.7 | 6.0 (0.267) | 0.04 | 0.99 / 2.10 | 190 M |
| 15x15b10-nightmare (n-mid) | fr-none | 5 | 4.8 | 24.3 (31.3) | 31.4 | 6.0 (0.261) | 0.14 | 2.69 / 4.14 | 760 M |
| 16x16-nightmare (n-mid) | fr-screen | 5 | 1.5 | 7.9 (13.2) | 13.4 | 6.0 (0.250) | 0.30 | 1.00 / 3.00 | 190 M |
| 16x16-nightmare (n-mid) | fr-none | 5 | 2.6 | 17.8 (28.4) | 28.6 | 5.0 (0.217) | 0.40 | 2.27 / 4.83 | 760 M |
| 15x20-nightmare (n-mid) | fr-screen | 5 | 1.7 | 10.4 (11.6) | 11.8 | 6.0 (0.231) | 0.18 | 0.86 / 3.94 | 190 M |
| 15x20-nightmare (n-mid) | fr-none | 5 | 4.2 | 19.7 (22.0) | 22.2 | 5.0 (0.200) | 0.30 | 1.41 / 4.78 | 760 M |
| 26x26-nightmare (n-large) | fr-base | 5 | 2.1 | 17.5 (19.3) | 19.5 | 5.0 (0.161) | 0.88 | 1.58 / 68.95 | 760 M |
| 26x26-nightmare (n-large) | fr-screen | 5 | 2.1 | 11.7 (14.5) | 14.7 | 5.0 (0.161) | 0.86 | 1.11 / 61.65 | 190 M |
| 26x26-nightmare (n-large) | fr-none | 5 | 2.1 | 17.9 (19.5) | 19.6 | 5.0 (0.161) | 0.88 | 1.58 / 68.88 | 760 M |
| 26x26-nightmare (n-large) | fr-c4 | 5 | 3.4 | 20.3 (24.3) | 24.5 | 5.0 (0.159) | 0.88 | 2.01 / 72.22 | 760 M |
| 26x26-hell-1 (hell-1) | fr-base | 5 | 6.1 | 31.9 (44.3) | 44.5 | 8.0 (0.200) | 1.00 | 4.21 / 64.65 | 760 M |
| 26x26-hell-1 (hell-1) | fr-screen | 5 | 7.0 | 35.8 (41.2) | 41.4 | 8.0 (0.200) | 0.98 | 3.86 / 52.55 | 380 M |
| 26x26-hell-1 (hell-1) | fr-none | 5 | 6.0 | 32.3 (44.3) | 44.5 | 8.0 (0.200) | 1.00 | 4.24 / 64.19 | 760 M |
| 26x26-hell-1 (hell-1) | fr-close | 5 | 5.9 | 32.1 (43.9) | 44.1 | 8.0 (0.200) | 1.00 | 4.21 / 64.73 | 760 M |
| 26x26-hell-1 (hell-1) | fr-ps | 5 | 5.9 | 28.0 (41.8) | 42.0 | 8.0 (0.200) | 1.00 | 3.71 / 55.17 | 760 M |
| 26x26-hell-1 (hell-1) | fr-p5 | 5 | 6.0 | 35.1 (59.9) | 60.1 | 8.0 (0.193) | 1.00 | 5.02 / 70.63 | 760 M |
| 20x20-hell-1 (hell-1) | fr-base | 5 | 5.9 | 38.4 (48.6) | 48.8 | 14.0 (0.350) | 0.38 | 5.22 / 10.37 | 760 M |
| 20x20-hell-1 (hell-1) | fr-ps | 5 | 5.9 | 32.5 (45.8) | 46.0 | 13.0 (0.342) | 0.38 | 4.75 / 9.57 | 760 M |
| 20x20-hell-1 (hell-1) | fr-p5 | 5 | 5.4 | 42.0 (48.9) | 49.1 | 12.0 (0.316) | 0.62 | 5.06 / 10.72 | 760 M |
| 24x24-hell-1 (hell-1) | fr-base | 5 | 8.1 | 37.1 (42.9) | 43.1 | 9.0 (0.217) | 0.88 | 4.27 / 29.20 | 760 M |
| 14x14-hell-1 (hell-1) | fr-base | 4 | 19.0 | 93.6 (142.8) | 150.6 | 13.0 (0.382) | 0.74 | 15.13 / 16.03 | 760 M |

Calls [V, `s2-ends.mjs`]: 3,410 selection calls, 843 of them closed by a worker termination (the speculative tail and the set
attempts that lost the race). **Every ended call of every uncapped arm ended `ok`**; the only `not-in-band` ends are `fr-p5`'s 69
budget stops. Locate results: 2,172 `hit`, 339 `window`, 4 `hit` by bracket close (`closed-in`), 52 without a result (all of them
`fr-p5` budget stops, `s2-nullloc.mjs`); **no call ended without a window**, the rescue never fired, and the only canonical
re-ratings are `fr-close`'s 8. Dead-end entries (T09d's `deadEnds`, the `p2` phase): 0 in every row. Work ledgers (T09c's
`rowLedger`): complete in 165 of 165 rows.

#### A.2 Determinism and timing noise [V]

`fr-base` and `fr-none` have the same effective configuration on `12x12-nightmare`, `26x26-nightmare` and `26x26-hell-1`, and
`fr-base` and `fr-screen` on `14x14-nightmare` (T08's tables). On those 20 seed pairs the ordered puzzle keys are identical, and
the capped-T10 ratios lie in 0.994 to 1.110 (19 of 20 within 2.6 %), geometric means 1.003, 1.017, 1.004 and 1.022 (`s2-rows.md`,
"same configuration"); under the plan's resampling recipe `fr-none` against `fr-base` gives 0.992 with a 10th percentile of 0.989
(`s2-gains.md`). Two readings follow. The prototype is deterministic across arm ids and runs. Machine noise is a few per cent, so
a 10 to 20 % effect at five seeds is a signal, a 5 % one is not. A mechanism that changes no puzzle on a seed did not act there.

#### A.3 The screen classes (S2-2) and rule (c5) at pilot size [V]

Ratio per seed = capped T10 of `fr-none` over `fr-screen` (above 1: the screen is faster); d = the per-set median clue count with
the screen less without it, over the matched sets (equal `igSetKey`: 5 of 5 on every cell); work = T09c's `workRule` on the
ledgers (`pass` when the screen arm's `hi` per puzzle is at most the no-screen arm's `lo`). Sources: `s2-rows.md`, `s2-work.md`.

| Cell (area) | Ratios rep 0-4 | geo | median d | moved >= 2 | Work, screen [lo, hi] vs none [lo, hi] G/puzzle | Work rule | Same puzzles |
|---|---|---:|---:|---:|---|---|---|
| 10x10 (100) | 0.45 0.71 0.71 1.04 0.65 | 0.687 | +1.0 | 0 | [2.20, 2.37] vs [1.64, 2.02] | worse | 0 of 5 |
| 12x12 (144) | 1.12 1.20 3.54 1.76 1.71 | 1.702 | +1.0 | 0 | [0.89, 1.24] vs [1.66, 2.40] | pass | 0 of 5 |
| 14x14 (196) | 3.13 2.10 2.66 2.77 2.46 | 2.601 | 0 | 0 | [0.95, 1.75] vs [2.58, 3.73] | pass | 0 of 5 |
| 15x15b10 (215) | 2.35 2.77 3.21 2.15 2.06 | 2.474 | 0 | 0 | [0.99, 2.10] vs [2.69, 4.14] | pass | 0 of 5 |
| 16x16 (256) | 2.26 2.15 2.23 2.34 2.22 | 2.239 | +0.5 | 0 | [1.00, 3.00] vs [2.27, 4.83] | unknown | 0 of 5 |
| 15x20 (300) | 1.71 1.89 2.37 1.77 0.91 | 1.651 | 0 | 0 | [0.86, 3.94] vs [1.41, 4.78] | unknown | 0 of 5 |
| 26x26 Nightmare (676) | 1.28 1.28 1.34 1.66 1.81 | 1.458 | 0 | 0 | [1.11, 61.65] vs [1.58, 68.88] | unknown | 0 of 5 |
| 26x26 Hell 1 (676, 380 M) | 0.66 1.09 1.45 1.25 1.09 | 1.074 | +0.5 | 0 | [3.86, 52.55] vs [4.24, 64.19] | unknown | 0 of 5 |

Pooled per candidate class, with the faster rule's recipe (geo, 10th percentile of 10,000 seed resamples, the lowest cell):

| Class | Cells | Faster geo / lower / lowest cell | Clue n / median d / moved >= 2 | Work, screen vs none (G/puzzle) | Work rule |
|---|---|---|---|---|---|
| n-small (up to 144) | 10x10, 12x12 | 1.081 / 0.921 / 0.687 | 10 / +1.0 / 0 | [1.55, 1.81] vs [1.65, 2.21] | unknown |
| n-mid as T08 has it (196-324), piloted cells | 14x14, 15x15b10, 16x16, 15x20 | 2.208 / 2.050 / 1.651 | 20 / 0 / 0 | [0.95, 2.70] vs [2.24, 4.37] | unknown |
| 196-256 | 14x14, 15x15b10, 16x16 | 2.433 / 2.349 / 2.239 | 15 / 0 / 0 | [0.98, 2.28] vs [2.51, 4.23] | pass |
| 196-215 | 14x14, 15x15b10 | 2.537 / 2.406 / 2.474 | 10 / 0 / 0 | [0.97, 1.93] vs [2.63, 3.94] | pass |
| n-large (360+), piloted cell | 26x26 Nightmare | 1.458 / 1.348 / 1.458 | 5 / 0 / 0 | [1.11, 61.65] vs [1.58, 68.88] | unknown |
| hell-1 at 380 M, piloted cell | 26x26 Hell 1 | 1.074 / 0.919 / 1.074 | 5 / +0.5 / 0 | [3.86, 52.55] vs [4.24, 64.19] | unknown |

Readings:

- **[V] 196 to 256 cells.** The screen cuts the time by 2.2 to 2.6 times and the completed work per puzzle by 2.3 to 2.7 times on
  14x14, 15x15b10 and 16x16 (the lowest seed 2.06), with no same-set clue shift (d 0, 0, +0.5). Every condition of rule (c5)
  that the pilots can read is met.
- **[V] 15x20 (300 cells).** Faster (1.65; one seed 0.91) with no clue shift, but its work interval is undecidable.
- **[V] Up to 144 cells.** The screen adds one clue on the same set on both cells (d +1.0: the clue rule's 0.5 fails) and is
  slower and dearer on 10x10 (0.687, work `worse`): IG-P-D4's "no screen by default" is confirmed by the pilots.
- **[V] 26x26 Nightmare.** Faster (1.458, lowest seed 1.28) with no clue shift and 30 % less completed work (1.11 against 1.58
  G/puzzle), but the work interval is undecidable: its open bounds would have to shrink about 130-fold (A.4).
- **[V] Hell 1 at 380 M.** 1.074 with a lower bound of 0.919: it fails the faster rule's 1.15, as plan P2's table expected.

#### A.4 N-V4-14: the width of the work intervals

- **[V] Where the width comes from.** In every row the gap `hi - lo` is the sum of the proved bounds of the open primitives of the
  calls closed by a worker termination: about five per request (19 to 28 per cell over five rows; `s2-work.md`, second table). The
  bound of one open primitive against the median units of a completed primitive of the same kind and cell:

  | Cell | Screen arm: median open bound / median completed rating, G (ratio) | No-screen arm: same (ratio) |
  |---|---|---|
  | 10x10 Nightmare | 0.42 / 0.133 (3.1) | 1.00 / 0.300 (3.3) |
  | 12x12 Nightmare | 0.72 / 0.134 (5.4) | 1.32 / 0.360 (3.7) |
  | 14x14 Nightmare | 1.55 / 0.173 (8.9) | 2.20 / 0.329 (6.7) |
  | 15x15b10 Nightmare | 2.14 / 0.167 (12.8) | 2.88 / 0.273 (10.6) |
  | 16x16 Nightmare | 4.01 / 0.139 (28.8) | 4.74 / 0.179 (26.5) |
  | 15x20 Nightmare | 6.39 / 0.113 (56.3) | 7.30 / 0.126 (57.8) |
  | 26x26 Hell 1 | 100.07 / 0.305 (328.5) | 101.26 / 0.566 (178.9) |
  | 26x26 Nightmare | 142.08 / 0.182 (781.7) | 144.41 / 0.186 (777.5) |
  | 14x14, 20x20, 24x24 Hell 1 (fr-base) | - | 1.34 / 0.760 (1.8); 8.87 / 0.141 (63.1); 57.34 / 0.591 (97.0) |

- **[V] The plan author expected about 840 M per open rating** ("one open rating can hide up to 840 M units (760 M + 80 M)",
  IG-P-Q37 answer point 4). T02d's bound adds twice the largest stretch between two limit checks plus a full undo, from upper
  bounds of the model's sizes; on large boards R9's term `3 (NC^2 / 2) K L` (RV4-01) dominates (`ig-select-v4.js:272-276`).
- **[V] What decides at pilot size.** `pass` for 12x12, 14x14, 15x15b10 and the pools 196-215 and 196-256; `worse` for 10x10;
  `unknown` for 16x16 alone, 15x20, 26x26 Nightmare, 26x26 Hell 1, n-small and every pool that holds 15x20.
- **[V] At validation size.** A paired bootstrap of the pilot rows (20 seeds per cell, 4,000 draws; `s2-boot.md`) gives the work
  rule `pass` in 100 % of draws for 196-256 and 196-215, and in 0 % for 196-324 with 15x20, 16x16 alone, 15x20 alone and 26x26
  Nightmare (all `unknown`). More seeds do not narrow it: the width per puzzle is a per-request constant (about five open
  primitives over ten puzzles).
- **[V] How tight a bound would decide.** With the pilots' `lo` and open counts, the screen arm passes when each open bound is at
  most about 1.07 G on 26x26 Nightmare, 1.15 G on 15x20 and 2.53 G on the pool 196-324 (arithmetic on `s2-work.md`). A bound of
  the limits alone (190 M + 80 M + a small overshoot) would decide every Nightmare class [A: assumes such a bound is provable].
- **[A] A tighter proved bound is not cheap.** R9's term grows with `NC^2`; even with exact model sizes it stays above 1 G on a
  26x26 board with few clues, so deciding n-large would likely need a limit check inside R9, a kernel change that IG-P-Q37's
  instrumentation rule ("no change to the kernel") excluded.
- **Answer to N-V4-14 [V]:** the work condition is decidable for the Nightmare classes up to 256 cells and undecidable (`unknown`,
  hence `inconclusive` and no screen) for every class that contains a board of 300 cells or more. Reported as IG-P-Q37 point 4
  asks; the remedy is question Q1.

#### A.5 The per-set prior on Hell 1 (S2-1) [V]

- `fr-ps` against `fr-base` (capped T10 of `fr-base` over `fr-ps`): 26x26 Hell 1 0.66 1.46 1.14 1.24 1.09 (geo 1.081), 20x20
  Hell 1 1.06 0.79 1.27 1.22 1.27 (geo 1.107); pooled 1.094 with a 10th percentile of 1.008 (`s2-gains.md`). The batch time
  (T10 - T1) shrinks by geo 1.109 and 1.139, so gamma is 0.90 and 0.88 (plan §4: 0.65 to 1.0, central 0.8).
- Locate probes per batch call (median): 3 to 2 (26x26), 6 to 2 (20x20); matched sets 10 of 10 with d 0: no clue shift.
- 20x20 Hell 1 has **no table prior** (`prior-v1.json` has no `hell-1@400`), so its calls start at K - 8 with steps of 8; the
  per-set prior gains most there. The table is 3 to 5 clues below the windows on the other Hell 1 boards (A.11).
- Reading: the per-set prior paid modestly (8 to 11 % on T10, lower bound just above 1) against a poor table prior; its margin
  over a refitted table is unmeasured.

#### A.6 (c4), bracket close and N-V4-17 [V]

- **N-V4-17, `W`.** The `start` lines' `W` equals the arm's class value in all 33 arm-cell groups (`s2-calls.md`): `fr-base` (and
  `fr-close`, `fr-c4`, `fr-ps`, `fr-p5`) 190 M on 14x14 Nightmare and 760 M elsewhere; `fr-screen` 190 M on Nightmare and 380 M on
  26x26 Hell 1; `fr-none` 760 M. The class table reached every call.
- **(c4)** acted (`locate.c4` present) in 61 of 73 ended calls on 14x14 Nightmare (`above/too-few` 39, `above/rated` 5,
  `below/rated` 2, `in/rated` 15) and 71 of 74 on 26x26 Nightmare (`above/rated` 32, `above/too-few` 9, `in/rated` 29,
  `below/rated` 1). It cost T10: `fr-base` over `fr-c4` 0.837 and 0.831, pooled 0.834 (10th percentile 0.776), that is +20 %;
  per-set clues unchanged (d 0 on 10 matched sets; the pooled share moved from 0.292 to 0.279 on 14x14). Plan P3 adopts (c4) only
  below 10 % of T10 (`plan.md:293-294`): **not adopted**.
- **Bracket close (D-IG7)** acted on 14x14 Nightmare only, in 8 of 74 ended calls (`in/rated` 4, `above/too-few` 3, `above/rated`
  1). On 12x12 Nightmare and 26x26 Hell 1 it could not act: `fr-base`'s table has no screen there, so no probe is screen-capped,
  and the puzzles are identical to `fr-base`'s on 10 of 10 seeds. On 14x14 it cost T10 (0.874, 10th percentile 0.804); on rep 0
  its two re-ratings confirmed the capped side and cost 30 % for identical puzzles. **Not adopted**. Stage 2 measured D-IG7 on one
  of its three cells: a design gap of T11a's S2-4 (A.14).

#### A.7 The Hell 1 pilots on 24x24 and 14x14 (S2-5) and the activation rule [V]

- 24x24 Hell 1: 5 of 5, T10 27.4 to 43.0 s (median 37.1). 14x14 Hell 1: 4 of 5, T10 84.4 to 142.8 s (median 93.6); rep 3
  stopped at 2 puzzles (`time-limit`); reps 1 and 3 responded after 143.0 and 150.6 s under the two separate timers.
- D-V4-20's rule (T11a's `conditionalActivated`: at least three valid requests reaching ten) activates both boards
  (`s3-activation.mjs`: 5 of 5 and 4 of 5 valid reaching ten); plan §5.1's "reached ten on most requests" holds for both.
- Under one 115-s deadline 14x14 Hell 1 would complete 3 of 5 (rep 1 is lost to the stop whatever the reserve: T09d's post-hoc
  projection, labelled, `s2-p5.md`); 24x24 keeps 5 of 5. A Hell 1 result is reported, not gated (IG-P-Q30).
- 14x14 Hell 1 rep 3 failed by **head-of-line blocking in the fold**: slot 3's attempt 1 ran from 34 s into the batch to its
  115-s end without returning, while slots 4 to 10 and slot 3's attempt 3 held finished candidates, all discarded at the end
  (`tests/artifacts/ig-proto/frozen/V4-S2/fr-base/pilot-14x14-hell-1/logs/14x14-hell-1~3.link.jsonl`). Successful calls on that
  board reach 26.2 G (A.8), so long calls, not search failures, cost the Hell 1 completions.

#### A.8 P5 (S2-6), N-V4-16 and N-V4-21 [V]

- **The 2-G budget** (`s2-calls.md`, `s2-p5.md`). 14x14 Nightmare: it never acted (puzzles identical to `fr-base` on 5 of 5).
  20x20 Hell 1: 52 of 123 batch calls and 7 of 22 set calls stopped; 19 and 3 of them still returned a waiting candidate (`any`).
  26x26 Hell 1: 58 of 122 batch and 1 of 20 set calls stopped; 26 and 1 returned a candidate. In all 65 batch calls (and 4 set
  calls) ended `not-in-band` by the budget. T10: 0.894 on 26x26 Hell 1 (slower), 1.093 on 20x20 Hell 1 (sets differ on 2
  seeds), pooled 0.988 with a 10th percentile of 0.863: **no gain**; 20x20's clue share fell from 0.350 to 0.316.
- **Successful call work in the uncapped arms** (2,258 `ok` calls; `s2-p5.md`): Nightmare maximum 6.61 G (10x10), p99 at most
  5.87 G, 4 to 13 % above 2 G; Hell 1 maximum 26.17 G (14x14), 13.85 (20x20), 8.53 (26x26), 6.51 (24x24); 44 to 91 % of Hell 1
  calls pass 2 G. IG-P-Q10's "on 196-cell Hell 1 ... more than seven near-cap ratings" is confirmed: p50 6.1 G there.
- **N-V4-16.** No set call of any arm ended without a window (0 no-window proofs in 2,567 ended calls; 314 ended set calls, all
  `ok` except `fr-p5`'s 4 budget stops). So the bound had no qualifying input, the glue `p5-1` never handled a real no-window
  result, and `fr-p5`'s zero false stops are vacuous. No defect is visible and none is excluded: the glue stays proved only by
  reading and `check-edits`. Every `fr-p5` row has `partialReason` null (`s2-p5.md`, first table).
- **N-V4-21 (a).** 4 `fr-p5` set attempts ended `not-in-band` by a budget stop with no side (20x20 Hell 1: rep 0 attempts 0 and
  3, rep 2 attempt 3, rep 4 attempt 0); the bound counts none of them, by design. Together with the `require` generation of
  `parity-fr-p5` (15 attempts, all budget stops, the request ended by the clock at 115,014 ms; `check-list.md:643`), P5 as piloted
  is unusable for `require` and dear for Hell 1.

#### A.9 The deadline and the reserve (post-hoc projection; not a live deadline gate) [V]

- The set stage ended by 35.6 s at most (14x14 Hell 1, 0.309 of 115 s); every other cell by 21.1 s (0.184), Nightmare cells by
  20.3 s (`s2-p5.md`, last table).
- T09d's `deadlineProjection` on the uncapped arms: with a reserve r of 0.3 to 0.6 (a set-stage cap of 80.5 to 46 s) no pilot
  set is cut; at 0.7 two 14x14 Hell 1 sets are. The only lost completion at any r is 14x14 Hell 1 rep 1 (T10 142.8 s). So IG-P-D1
  condition 4 ("lost completions counted against the uncapped new search, per cell, before the reserve is fixed") reads 0 for the
  reserve and 1 for the deadline itself.

#### A.10 The journal linkage [V]

- `linkSummary`'s `idleWorkerMs` is 0.0 s in 32 of 33 arm-cell groups and 0.1 s in one (`s2-calls.md`): no worker waits behind
  an awaited call, so IG-P-Q22's bounded-prefetch variant is not indicated.
- The fold waits: 33 to 100 s per five rows on Nightmare, 117 to 166 s on 20x20, 24x24 and 26x26 Hell 1, 459 s on 14x14 Hell 1; at
  the end about four in-flight tasks per request are discarded, plus 5 to 40 finished but unconsumed ones per five rows. The
  batch's time is set by slow slots, as IG-P-Q22 described.

#### A.11 The population, two-sided [V]

"Today" is `prior-v1.json`'s share, the median clue share of MP12b1's accepted puzzles of reps 10 to 19 (n in brackets);
"after" is V4-S2's accepted median share; the change is in clues at the cell's median K (`s2-prior.md`, `s2-table.md`).

| Cell (K) | Today | After, no screen | After, screen | Score position median | Census-estimate share |
|---|---:|---:|---:|---:|---:|
| 10x10 Nightmare (17) | 0.200 (100) | 0.176 (-0.4) | 0.235 (+0.6) | 0.50 / 0.46 | 0.86 / 0.50 |
| 12x12 Nightmare (19) | 0.211 (97) | 0.211 (0) | 0.263 (+1.0) | 0.52 / 0.42 | 0.42 / 0.16 |
| 14x14 Nightmare (22) | 0.190 (57) | 0.273 (+1.8) | 0.292 (+2.2) | 0.50 / 0.48 | 0.08 / 0.10 |
| 15x15b10 Nightmare (23) | 0.182 (74) | 0.261 (+1.8) | 0.267 (+2.0) | 0.44 / 0.46 | 0.14 / 0.04 |
| 16x16 Nightmare (23) | 0.174 (92) | 0.217 (+1.0) | 0.250 (+1.8) | 0.50 / 0.50 | 0.40 / 0.30 |
| 15x20 Nightmare (26) | 0.192 (93) | 0.200 (+0.2) | 0.231 (+1.0) | 0.50 / 0.46 | 0.30 / 0.18 |
| 26x26 Nightmare (31) | 0.133 (100) | 0.161 (+0.9) | 0.161 (+0.9) | 0.52 / 0.50 | 0.88 / 0.86 |
| 26x26 Hell 1 (40) | 0.128 (50) | 0.200 (+2.9) | 0.200 (+2.9) | 0.44 / 0.43 | 1.00 / 0.98 |
| 24x24 Hell 1 (40) | 0.141 (4) | 0.217 (+3.0) | - | 0.51 | 0.88 |
| 14x14 Hell 1 (32) | 0.265 (2) | 0.382 (+3.7) | - | 0.43 | 0.74 |
| 20x20 Hell 1 (38) | none | 0.350 | - | 0.41 | 0.38 |

The shift is the one plan §2.3 and OD-P6 describe (Nightmare +1 to +2 clues on 196 to 256 cells, Hell 1 about +3), and the
screen adds about one clue up to 144 cells and on 16x16 and 15x20 against the no-screen arm's pooled median (but d 0 to +0.5 on
the same set there). Hell 1 puzzles are mostly census estimates (plan §8).

#### A.12 A no-regression preview against today's search on the same seeds [V, an indication]

MP12b1 ran today's search on the same seeds (`landscape/<case>/<rep>`); the stage-1 identity receipt found today's search
unchanged on the frozen source (factor 1.0236). Per seed, capped T10 of MP12b1 over V4-S2 (`s2-today.md`; below 1 the new search
is slower):

| Cell | Arm | Ratios rep 0-4 | geo | min |
|---|---|---|---:|---:|
| 10x10 Nightmare (control) | fr-none | 1.38 1.58 2.33 0.93 2.50 | 1.64 | 0.93 |
| 26x26 Nightmare (control) | fr-none | 0.55 1.71 1.42 1.33 1.01 | 1.12 | 0.55 |
| 26x26 Nightmare (control) | fr-screen | 0.70 2.18 1.90 2.20 1.84 | 1.64 | 0.70 |
| failing cells (12x12, 14x14, 15x15b10, 16x16, 15x20) | fr-none | - | 3.80, 4.08, 3.66, 4.43, 1.90 | 2.32, 1.50, 2.95, 2.62, 0.42 |

The controls are judged by the 10th percentile of the resampled geometric mean of today over after, at least 0.9 (plan §5.2,
`plan.md:641-644`). 26x26 Nightmare without the screen is at 1.12 with one seed at 0.55 [V], and **eight of the ten controls
were never piloted** (3x29, 18x18, 18x20, 20x20, 20x21, 32x15, 22x22 and 24x24 Nightmare): their no-regression risk is
unmeasured. With n-upper and n-large expected `inconclusive` (A.4), these controls are judged on the no-screen arm.

#### A.13 The kernel and width probes [V]

- **Counters** (V4-S2K `kernel.md`): `counters: equal` on 30 of 30 items (the `r4c` tree's complete `DeductionResult` equals
  `instr`'s). Per case, dirty pieces over piece visits 0.848 to 0.941 and visits whose live-row count changed 0.716 to 0.871;
  live rows over static rows 0.263 (10x10), 0.328 (12x12), 0.333 (14x14), 0.584 (26x26 Nightmare), 0.591 (26x26 Hell 1)
  (my division of the table's columns).
- **Profile** (`profile: complete`): `fewestColumn` 4.8 ms of 10,099.6 ms in `deduce.js` (share 0.0005) on 14x14 and 0 on 26x26.
  Self time from the raw profiles (`s2-profile.md`): `ruleR4` 16.6 % (14x14) and 19.0 % (26x26 Nightmare) of the total;
  `reachable` 17.9 % and 1.1 %; `select` 13.3 % and 10.5 %; `gather` 11.0 % and 2.3 %; `kill` + `undo` 11.2 % and 11.0 %; the DLX
  diagnostic (`cover` + `uncover`) 2.4 % and 23.2 % (`rate()` keeps it; P6 removes it from search ratings in production).
- **Width** (V4-S2W `width.md`): one rating's median at 8 concurrent workers is 1.085 (26x26 Nightmare) and 1.022 (14x14) times
  its median at 4, against R23's 9 to 28 %. P8 stays parked (an opt-in after a device measurement, plan P8, N-V4-11), with less
  contention than feared.

#### A.14 What V4-S2 should have measured and did not

1. **[V] The eight unpiloted controls** (A.12): no `gen-v4` time on 3x29 and 18x18 to 24x24 Nightmare, so no-regression, their
   class fit and plan §8's "the small Nightmare boards stay in the frozen round's pilots" (3x29, 87 cells) are open (Q3).
2. **[V] Bracket close on cells that have a screen**: S2-4 ran `fr-close` on two cells where `fr-base` has no screen (A.6).
3. **[V] P5 at a budget that can pay**, and on 14x14 Hell 1, the board where one long call blocks the fold (A.7, A.8); and
   anything on `require` (N-V4-15, N-V4-21).
4. **[V] The bound and its glue on a real no-window request** (N-V4-16): no validated cell produces one.
5. **[V] The per-set prior on Nightmare**, and the per-set prior over a refitted table: not piloted.
6. **[V] A second `W` value per Nightmare class**: only 190 M ran, so IG-P-Q09's least-work fit can only choose between 190 M and
   none.
7. **[V] The live deadline**: not built yet (N-V4-13); the reserve is read post hoc only.
8. **[V] The interval width** was measurable and is now known (A.4); the pack had not foreseen that T02d's overshoot terms, not the
   limits, would set it.

## 4. Options

### 4.1 Rule (c5)'s work condition beyond 256 cells (N-V4-14)

| Option | Design | Cost | Risk | Effect on users |
|---|---|---|---|---|
| (a) Keep the rule; fit the class boundaries to the evidence | screen class 196-256 (decidable, expected `admitted`); 257-324 and 360+ screened in `fr-frozen` and evaluated, expected `inconclusive` (`work-unknown`); no rule change | none: both twins run on every validated cell anyway (T11a) | low: the headline cells keep a decidable verdict; 15x20, 18x18 and 360+ ship without the screen unless stage 4 decides otherwise | 15x20 and the 360+ boards keep their no-screen speed (15x20: T10 19.7 s against 10.4 s with the screen) |
| (b) A tighter proved bound before `V4-S4` | a new derivation of the open primitive's bound (or a bound refined after the model build, with a ledger line type), reviewed, in the frozen arms only | a reviewed task of 1 to 2 days; no machine time | high: R9's term may need a kernel limit check that IG-P-Q37 excluded; a mistake in a proof weakens the gate | possibly the screen on 300+ cells (x1.46 to 1.65 in the pilots) |
| (c) A relaxation by the owner | for example judge `lo` (completed work) with the interval reported, or exclude the end-of-request speculative tail | none | weakens what the plan author fixed in IG-P-Q37 point 1 ("speculative and losing calls included") | as (b) |
| (d) Keep T08's 196-324 class | as piloted | none | high: the class is `unknown` in 100 % of the bootstrap draws, so 14x14, 15x15b10 and 16x16 would ship without the screen (x2.2 to 2.6 slower) | the headline cells lose the screen |

**Recommended: (a)** [A]. It changes no rule, uses the freeze's own authority over class boundaries (plan §5.2: "Class
boundaries are settled at the freeze from the pilots (16x16 and 15x20 included)", `plan.md:630-634`; plan §8: "The class
boundaries fixed at the freeze are the only remedy", `plan.md:771-774`), keeps the evidence of 300+ cells growing at no cost, and
leaves (b) or (c) to phase 2's repeat of the validation on the production code. Because N-V4-14 routes undecidability to the
plan author, (a) is put to the supervisor as Q1.

### 4.2 P5 for `require` calls (N-V4-21 (b))

| Option | Effect | Risk |
|---|---|---|
| (i) No call budget in `require` mode; the deadline is the backstop, as today | the `require` P-1 generation behaves as `fr-base`'s (set and batch in 42.0 s, `check-list.md:643`), so the frozen arms' replay proofs can pass | the clock, not a cap, ends a runaway `require` call: only the number of puzzles can change, never which puzzle fills a slot (plan §6, "Determinism of budgets") |
| (ii) A separate, larger `require` budget | keeps IG-P-D1's "work caps first" literally | no `require` data exists to fit it (the frozen round measures `any`); an unfitted number |
| (iii) A bound that counts budget stops | turns a slow success into a fast failure (12x12 Nightmare `require`: 42 s success under (i), a stop after four stopped attempts here) | loses completions |

**Recommended: (i)** [A], with `require` measured on the Generator's largest offered boards in the production pack (N-V4-15).
Because it leaves one mode without a work cap, it is put to the supervisor as Q2.

### 4.3 P5's budget values

| Option | Design | Evidence | Effect |
|---|---|---|---|
| Tight (the pilot's 2 G) | cut long calls to speed up batches | `fr-p5`: no gain (0.988, lower 0.863), 69 calls ended without a result, a population shift on 20x20 (A.8) | rejected |
| Generous (recommended) | per level, the smallest round value at least 1.5 times the largest successful call in the uncapped pilots: Nightmare 10 G (max 6.61), Hell 1 40 G (max 26.17) | 0 of 2,258 successful pilot calls cut (`s2-p5.md`) | P5 is what the plan says it is ("no speed; completion loss to be measured", plan §3 table): a deterministic cap that rarely binds |
| Per area class | a class table | the code keys by level only (`ig-select-v4.js:82-88`) | not needed: a per-level table is the class table with equal entries |

### 4.4 The count prior (P4)

| Option | Design | Risk |
|---|---|---|
| (a) Refit every piloted cell | `prior-v2` = the median window share of the pilots on 11 cells | changes the start on the gated Nightmare cells by up to 1.8 clues (14x14, 15x15b10) without a pilot of the new start; the population may move up |
| (b) Refit Hell 1 only, keep Nightmare (recommended) | `prior-v2` = `prior-v1` with Hell 1 196, 400 (new), 576 and 676 from the pilots' windows, the other Hell 1 boards interpolated by area | Hell 1's new start is unpiloted, but Hell 1 is reported, not gated (IG-P-Q30); Nightmare is frozen as piloted |
| (c) Keep `prior-v1` | as piloted everywhere | 20x20 Hell 1 keeps no table prior (starts at K - 8); Hell 1 starts 3 to 5 clues low |

Plan IG-P-Q27 allows the freeze to use "stage 2's own pilots" (`plan.md:551-555`); (b) applies it where the table is wrong and
keeps the gated cells exactly as piloted [A].

### 4.5 The per-set prior

Adopt on Hell 1 (piloted; 8 to 11 % on T10, lower bound 1.008; no clue shift), not on Nightmare (not piloted; the table is within
two clues there) [A]. Plan §6: "the per-set prior, if its pilot paid".

### 4.6 N-V4-18 (fixed no-screen classes without their duplicate twin)

| Option | Saving | Cost and risk |
|---|---|---|
| Implement | formal 140.8 + 99.6 counted minutes (T11h's figures for n-small, Hell 1 26x26 and 20x20, and the two conditional boards); realistic about 90 (`s4-cost.md`: the duplicate twins of 3x29, 10x10, 12x12 Nightmare and the four Hell 1 boards, 5,280 node s plus quiet) | a reviewed change of about ten places in the verdict chain (`check-list.md:640`), right before the validation, with end-to-end cases |
| Do not implement (recommended) | none | none; the identical twins of a no-screen class are a free integrity check (equal puzzles expected, as in A.2) |

### 4.7 A supplementary control pilot `V4-S2B`

`fr-none` (the arm the n-upper and n-large controls ship under option 4.1 (a), and n-small's 3x29) on the eight unpiloted controls,
reps 0 to 4, against MP12b1's runs of the same seeds. Formal price 22.6 counted minutes (guard 28.2), realistic 16 to 20
(`s4-cost.md`); inside the 749 granted. It warns before a 10-hour validation if a control is at risk of failing no-regression,
and covers 3x29 (plan §8). **Recommended** (Q3).

### 4.8 Pre-activation proofs `V4-S3P`

The four P-1 passes of the frozen arms under their own task id, before `V4-LIVE` binds `fr-frozen`'s trees (N-V4-21 (c) allows
exactly this). Realistic 20 to 22 counted minutes (V4-S2's six passing P-1 passes averaged 285.6 node s each). Without it, a
failing proof inside `V4-S4` after the activation would need new variant ids, a new live-deadline binding and a new activation,
none of which the write-once records allow cheaply. **Recommended.**

### 4.9 P7's spike: before or after the freeze (N-V4-05)

P7 keeps the units, so no frozen table depends on it; the frozen round reads the snapshot of `3fc65f4`, so a later kernel change
cannot move it; its timing probes compete for the locked machine; its production edit of `deduce.js` falls under D-V4-11, and
any harness probe under D-V4-20's window. **Recommended: after phase 0 is decided**, as its own small pack beside phase 2's
design [A].

## 5. Proposed plan

### 5.1 The freeze (stage 3, N-V4-03)

**What the freeze may use** [V]: the pilot seeds (reps 0 to 4) of V4-S2 and of the supplementary pilot, the provisional reps 0 to
5, MP12b1's reps 10 to 19 (which filled `prior-v1`), MP12b1's reps 0 to 9 as today's baseline, PM1's first slice and R28
(IG-P-Q25, IG-P-Q27; `plan.md:551-562`). **It may not use** the validation reps 20 to 39, the Master reps 20 to 24, the second
validation's 40 to 59, or any stage-4 record; after the validation seeds run, no boundary, value or statistic changes
(`plan.md:590-593`, `:630-634`, `:645`).

**`docs/improve-generating/evidence/frozen/V4-S3/freeze.json`** [A, proposal]; `classes` is the schema T09e and T11f read, the
other keys are tolerated (`manifest.mjs:2246`, `:2619`) and record the frozen values with their version ids and fit evidence:

```json
{
  "format": "ig-v4-freeze", "version": 1,
  "classes": [
    { "id": "n-small", "cells": ["3x29-nightmare", "10x10-nightmare", "12x12-nightmare"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" },
    { "id": "n-mid", "cells": ["14x14-nightmare", "15x15b10-nightmare", "16x16-nightmare"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" },
    { "id": "n-upper", "cells": ["15x20-nightmare", "18x18-nightmare"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" },
    { "id": "n-large", "cells": ["18x20-nightmare", "20x20-nightmare", "20x21-nightmare", "32x15-nightmare", "22x22-nightmare", "24x24-nightmare", "26x26-nightmare"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" },
    { "id": "hell-1", "cells": ["26x26-hell-1", "20x20-hell-1", "24x24-hell-1", "14x14-hell-1"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" }
  ],
  "tables": {
    "screen": { "id": "tab-f1", "areas": { "n-small": "<= 144: none", "n-mid": "196-256: 190000000", "n-upper": "257-324: 190000000", "n-large": ">= 360: 190000000", "hell-1": "none" }, "unlisted": "none (Nightmare 145-195 and 325-359, every other level)" },
    "prior": { "id": "prior-v2", "file": "tools/ig-proto/data/prior-v2.json", "perSet": ["hell-1"] },
    "callBudget": { "id": "budget-f1", "any": { "nightmare": 10000000000, "hell-1": 40000000000 }, "require": null },
    "setAttemptsBound": 4,
    "deadline": { "id": "deadline-f1", "generationStopMs": 115000, "setReserve": 0.6, "setStageCapMs": 46000, "responseBoundMs": 120000 },
    "c4": false, "rerate": "rescue", "ranker": null
  },
  "fit": { "evidence": "<path and SHA-256 of each V4-S2 runs file and of the SA scripts and outputs that fitted each value>" }
}
```

The five classes name exactly the 19 comparator cells of the activated collection, each once (verified against T11e's pure
`activation` on the published pilots by `s3-activation.mjs`: 19 cells, none missing, none extra, none twice) [V].

**The values and their fit** (each [A] as a choice; its evidence [V]):

| Item | Frozen value | Fit rule and evidence |
|---|---|---|
| `W_screen`, n-mid (196-256) | 190 M | IG-P-Q09: the least work per puzzle (0.98 against 2.51 G, A.3) and rule (c5) readable and met at pilot size; 15 matched sets of 15 |
| n-upper (257-324), n-large (360+) | 190 M, evaluated | IG-P-Q09 favours the screen (15x20: 0.86 against 1.41 G; 26x26: 1.11 against 1.58 G), but the work rule is `unknown` (A.4): expected `inconclusive`, so no screen ships unless stage 4 decides otherwise |
| n-small (up to 144), Hell 1 | none | IG-P-D4; clue rule fails (d +1.0) and 10x10 is slower; Hell 1 at 380 M fails the faster rule (1.074) |
| Class boundaries | 196/256 and 257/324 split T08's `n-mid` | separates the decidable cells from the undecidable ones (A.4); 145-195 and 325-359 stay unlisted (no screen, IG-P-Q26) |
| Prior (P4) | `prior-v2` = `prior-v1` with Hell 1 196: 0.403125, 400: 0.368421 (new), 576: 0.219512, 676: 0.200000; the other Hell 1 candidate boards interpolated linearly in area between them (215: 0.400, 256: 0.393, 300: 0.385, 324: 0.381, 360: 0.375, 420: 0.352, 480: 0.301, 484: 0.297) | the median window share (`wc / K`) of the ended calls of the arms that start from the table (68 to 264 calls per board, `s2-prior.md`); Nightmare unchanged (frozen as piloted, 4.4) |
| Per-set prior | on, Hell 1 only | A.5; 4.5 |
| (c4), bracket close | off; re-rating by the rescue only (`rerateMax` 4, as piloted) | A.6: +20 % and +14 % of T10 |
| Ranker | none | C3's data-only test has not run (N-V4-04) |
| P5 call budget | `any`: Nightmare 10 G, Hell 1 40 G; `require`: none | 4.2, 4.3; 0 of 2,258 successful pilot calls cut |
| Bounded set attempts | 4 attempts failing without a window on the same side (as piloted) | inert on every pilot (no no-window attempt, A.8); kept for boards and levels without windows |
| Deadline (IG-P-D1) | one 115-s generation stop from the request's start; the set stage cut at 46 s (reserve 0.6 for the batch); the cut response returns the accepted prefix; a hard 120-s response bound | A.9: no pilot set cut at r 0.6; plan P5's "a set-stage cap near 40 %" (`plan.md:333-335`) |

### 5.2 The four frozen variants

- **Composition** [A]: `fr-frozen` extends `fr-base`, `v4-ps`, `v4-p5` and a new `live` variant (N-V4-13), with parameters
  `screenClasses { hell-1: null, n-small: null, n-mid: 190e6, n-large: 190e6 }`, `screenTable 'tab-f1'`, `priorTable 'prior-v2'`
  with `paramFiles.prior` `data/prior-v2.json`, `perSetPrior` limited to Hell 1, `callBudget { nightmare: 10e9, hell-1: 40e9 }` for
  `any` calls only, `setAttemptsBound` 4 and the deadline parameters; `fr-frozen-none` = `fr-frozen` with every class null and its
  own `screenTable`; `fr-frozen-uncapped` and `fr-frozen-none-uncapped` = the twins with `callBudget` and `setAttemptsBound` null
  and no live deadline (today's two timers), as `data/frozen-round-v1.json` sets (`comparatorDifferences`).
- **Two small edits in the frozen family's own variant files, never in `v4`'s**: the budget lookup reads the call's uniqueness mode
  (no budget in `require`), and the per-set prior's transport (`igPriorOf`, edits `ps-5` to `ps-7`) sends `igPrior` for Hell 1 only.
- **Fixed by the bindings** (2.3): nothing in the `v4` chain changes (`check-binding --current v4` against the P-0 binding must
  stay `pass` in every task); `fr-frozen` and `fr-frozen-none` are final before `V4-LIVE`; all four before `V4-S3P`.
- **Records**: each variant's algo id is `gen-v4-proto:<variant>` (at most 40 characters; the longest is 23), so its records carry
  the configuration; `versions.priorTable` and `versions.screenTable` carry the two table ids (IG-P-Q36).

### 5.3 The live deadline (N-V4-13)

[A, design points for the task]: one deadline per request measured from the request's start and shared by the set stage and the
batch; the set stage stopped at `(1 - 0.6) x 115 s` = 46 s with a failed request and its own reason; at 115 s the batch stops, the
response holds the fold-order prefix of accepted puzzles and the outstanding tasks are cancelled (workers terminated with their
closure lines, so the ledgers stay complete); the host returns at 120 s at the latest. Tests with the scripted pool
(`lib/fake-pool.mjs`): a reserve-cut set, a partial prefix at the stop, cancellation of outstanding work, response assembly at the
hard bound, the same prefix at widths 1, 2, 4 and 8. `tools/ig-proto/live-deadline.mjs receipt --task V4-LIVE --require-pass`
writes `live-deadline.json` with `LIVE_DEADLINE_FIELDS` (`live: true, postHoc: false, workCutoffMs: 115000, responseBoundMs:
120000, reserveChecked: true`, `lib/proof.mjs:25-26`) from `V4-LIVE`'s rows; `v4-check accept` gains the kind `live-deadline`.
`V4-LIVE`'s rows (14x14 Nightmare, 26x26 Hell 1) end well before 115 s in the pilots, so the receipt proves the configuration and
the bounds on real rows, and the synthetic tests prove the cuts; stage 4's 14x14 Hell 1 rows will exercise the stop for real.

### 5.4 P7's scoped spike (N-V4-05)

- **Decided now from the counters** [V/A]: a per-piece cache of R4 (skip clean pieces) saves at most the 6 to 15 % of piece visits
  that are clean, about 1 to 3 % of a rating: dropped. Ordered live-row lists cut R4's row visits by 41 to 74 % (live over static
  0.26 to 0.59); with `ruleR4` at 16.6 to 19.0 % of the profile, the ceiling is about 8 to 11 % of a rating before the cost of
  keeping the lists in `kill` and `undo` (11 % of the profile), so x1.04 to 1.10 is the realistic range [A], inside plan P7's
  x1.04 to 1.15. `fewestColumn` is not pursued (share 0.0005 and 0).
- **Spike content** (plan P7 rules): C1 as live-row lists for R4 with the charge computed from the static lengths as today, then
  R5; equality of the complete `DeductionResult` (work and nodes included) on PM4's corpus and T10a's, with tie order and cap
  boundaries; the memory-limit rule; a T10b-style probe at one worker on T10a's corpus; go when the rating time falls by at least
  x1.04 (the plan's lower end), else stop. C5 only after C1; `reachable` (R7, 17.9 % on 14x14) needs its own accounting and is
  C1's next candidate only after R5.
- **When**: after phase 0 is decided, in its own pack; equality runs are locked verification (no allocation), the timing probe
  about 5 to 10 counted minutes (the owner's allowance then).

### 5.5 Compatibility and later phases

- Nothing reaches production in this pack (D-V4-11). Phase 2 (N-V4-07) ports the frozen configuration; its notes from this
  analysis [A]: the budget table and the deadline parameters are part of `gen-v4`'s definition (any change is a new `algo`),
  since IG-P-Q36's seven keys version only P4's and `W_screen`'s tables; the production `W_screen` table has the freeze's
  boundaries (196-256 separate from 257-324); `require` keeps no budget until N-V4-15 measures it.
- D-V4-20's window: every harness edit of this pack (`lib/`, `data/`, top-level `.mjs` and `.ps1`) comes before `V4-S4` starts.

## 6. Acceptance

| # | Criterion | Kind | How verified |
|---|---|---|---|
| B1 | Phase 0's completion gate: at least 18 of 20 on each failing Nightmare cell, on the arm its class ships, with no dead-end entry | business | `V4-S4C`'s final `verdicts.json` phase-0 line (T09d's `cellGate`) |
| B2 | No regression: every control's lower bound at least 0.9; Master identity on 16 cells | business | the same record (`noRegression`, `masterIdentity`) |
| B3 | Every class has a (c5) verdict, with the deciding condition | business | `class-selection.json` (`V4-S4`), the final record |
| B4 | The reserve and the deadline are frozen and proved on real rows | business | `freeze.json`; `V4-LIVE/live-deadline.accepted.json` |
| B5 | Hell 1 reported per board (candidate or not), the population two-sided per cell, lost completions and false stops per cell | business | the final record (`hell1`, `population`, `p5`) |
| B6 | No run beyond its approved cap; the account stays within each grant | business | each plan's dry run and invocation rows; `s2-account.mjs` re-run |
| T1 | `freeze.json` names the 19 comparator cells, each once, and binds its fit evidence by SHA-256 | technical | the encoding task's check against T11e's `activation`; `activate` refuses otherwise |
| T2 | The four variants exist; `check-edits --all` clean; `check-binding --current v4` against the P-0 binding `pass` | technical | the encoding task's gates |
| T3 | A real call per class shows the frozen `W` on its `start` line, the budget per mode and the per-set prior on Hell 1 only | technical | `--v4` self-test cases of the encoding task (N-V4-17's reading applied to the frozen arms) |
| T4 | The live deadline's synthetic tests pass; `check-prerequisites --plan V4-LIVE` prints `prerequisites: pass` | technical | the live-deadline tasks' gates |
| T5 | `V4-S3P`'s four parity receipts pass, replay blocks included (the `require` generation on 12x12 Nightmare) | technical | `V4-S3P/*.receipt.json` |
| T6 | `V4-S4`'s P-1 passes pass; every declared row published or closed; the selection final; `V4-S4C` resolved and run; the final record written | technical | the plans' receipts and records |
| T7 | The stage-4 report re-reads N-V4-16 and N-V4-17 on the frozen arms' journals | technical | the SAs' stage-4 report |
| T8 | `npm run check` passes; the self-test groups pass; the firewall reports production files unchanged | technical | each task's gates |

## 7. Risks and mitigations

| Risk | Likelihood and effect | Mitigation |
|---|---|---|
| N-V4-14: classes beyond 256 cells `inconclusive` by bookkeeping | high [V]; 15x20, 18x18 and 360+ ship without the screen | Q1; option 4.1 (a); (b) or (c) re-offered for phase 2 |
| A control fails no-regression on the no-screen arm | unknown for 8 controls; 26x26 Nightmare's preview geo 1.12 with a seed at 0.55 [V]; one failure stops phase 2 | Q3 (`V4-S2B`) before the freeze; a failure there goes to the supervisor before stage 4 |
| The bound or its glue misbehaves when it first fires | low (never fired) [V]; a false stop or a run to the clock | `p5Stops` against the uncapped twins in stage 4; the N-V4-16 journal check in the stage-4 report; a real-call test in phase 2 |
| A frozen arm's proof fails inside `V4-S4` | low after `V4-S3P` | `V4-S3P` (4.8) |
| A screen-class cell gets fewer than 15 matched sets | low: the twins served the same set on 15 of 15 n-mid pilot pairs [V]; P5 inert on Nightmare | the generous budget keeps the set stages alike |
| 14x14 Hell 1 fails 18 of 20 under the deadline | likely (3 of 5 projected) [V/A]; reported only (IG-P-Q30) | none needed; its validation still settles its candidacy and serves the blind play comparison (IG-P-D3) |
| A long `V4-S4` run (8 to 9 hours) is killed or stops | possible | started detached (check-list §3.2); resume by ruling; N-V4-19 before it |
| A tree moves after a binding | low if the pack's guards hold | `check-binding` in every task's gates; no edit of the `v4` chain |
| A harness edit inside D-V4-20's window | low | every harness task precedes `V4-S4` |
| The formal caps look large (about 1,700, then 1,410 to 1,470 minutes on the account) | certain | each approval shows the realistic estimate beside the guard (section 8) |
| Hell 1's refitted prior with the per-set prior is unpiloted | moderate; Hell 1 is reported, not gated | stage 4 measures it; the population is reported two-sided |
| Census-estimated Hell 1 scores | certain (0.38 to 1.00 of Hell 1 puzzles) [V] | reported per cell (plan §8) |

**Effect on performance, tests and documents.** No production code changes, so no user-facing behaviour, test suite or guide
changes [V: D-V4-11]. Harness tests grow (self-test cases per task); `tools/ig-proto/README.md` gains the sections of each task;
records are new files under `docs/improve-generating/evidence/frozen/` (`V4-S2B`, `V4-S3`, `V4-S3P`, `V4-LIVE`, `V4-S4`, `V4-S4C`,
`V4-S4F`); the SA reports are new files under `docs/improve-generating-stages-2-4/`.

## 8. Effort and phasing: the stages 2 to 4 pack outline

**The account at each owner stop** (formal caps from T11g's and T11e's prices, re-read with `approval --plan <id>` when asked;
realistic from `s4-cost.md`) [V for the arithmetic, A for the realistic estimates]:

| Stop | Plan | Formal guard (min) | Cap on the account (min) | Realistic counted min | Within 749? |
|---|---|---:|---:|---:|---|
| S-1 (optional, Q3) | `V4-S2B` | 28.2 | ceil((10,340.1 + 1,692) / 60) = 201 | 16 to 20 | yes |
| S-2 | `V4-S3P` and `V4-LIVE` | 89.0 + 43.9 | ceil((10,340.1 + 5,340 + 2,634.3) / 60) = 306, plus the guard of S-1 if it ran first (334) | 20 to 22 + 4 to 5 | yes |
| S-3 | `activate` (data only), then `V4-S4` | 1,143.9 (initial groups) + 89.0 (four P-1 passes) + 249.0 (both conditional boards' twins) = 1,481.9; + 72.5 with S4-6 | about account + 1,482, that is about 1,700 | 468 to 514 | no: raise |
| S-4 | close (only if `V4-S4` stops at a recorded ceiling) | - | - | - | - |
| S-5 | `V4-S4C` at its resolution | 601.6 + 130.4 (the conditional comparators) = 732.0 | about account + 732, that is about 1,410 to 1,470 | 170 to 183 | no: raise |

The realistic total of the remaining work is about 680 to 745 counted minutes (11.3 to 12.4 hours of machine), which would close
the round's account near 850 to 920 minutes [A].

**Tasks, in order** (pack author: one SA; the other cross-reviews):

| ID | Task | Inputs | Gates | Machine | Stops |
|---|---|---|---|---|---|
| F01 | Harness hygiene before the freeze window: N-V4-19 (`arm.mjs publish` of every done shard, naming the shards not done) and N-V4-20 (the `GIT_CALL` guard widened, `phase1/p6-bench.ps1` its one exception) | `check-list.md:641-642` | `--items` and default self-test groups; `check-edits`; firewall; `npm run check` | none (locked verification only) | none |
| F02 | (if Q3 is yes) `V4-S2B`: a plan written with T11c's exported `rowStep`, `planOf` and `stepPrice` (no `compile`), `fr-none` on the 8 unpiloted controls, reps 0 to 4, `publish-fr-none`; then the SAs' reading against MP12b1's reps 0 to 4 | `s2-today.mjs`'s method | dry run `go`; publish complete | 16 to 20 realistic (guard 28.2) | owner S-1 |
| F03 | The freeze's encoding (N-V4-03): `data/prior-v2.json` with its generator, `V4-S3/freeze.json` and `freeze.md`, the four variants (5.2), the check of the classes against T11e's `activation` on the published pilots, `--v4` cases (frozen `W` per class on real calls, budget by mode, per-set prior Hell 1 only), README | this analysis after Q1, Q2 (and F02) | `check-edits`; `check-binding --current v4` `pass`; self-test groups; firewall | none | supervisor rulings Q1, Q2 first |
| F04 | The live deadline, mechanism (N-V4-13): the `live` variant's client and host edits composed into `fr-frozen` and `fr-frozen-none`; scripted-pool tests | 5.3 | self-test groups; widths 1, 2, 4, 8 equal | none | none |
| F05 | The live deadline, proof: `live-deadline.mjs receipt`, `v4-check accept --kind live-deadline`, cases | `lib/proof.mjs:25-26`; T04f, T11d | `check-prerequisites --plan V4-LIVE` `pass`; dry run of `V4-LIVE` `go` | none | none |
| F06 | `V4-S3P`: the four frozen arms' P-1 passes under their own task id (T11c's `parityPass`, `parityManifest`), receipts with `--require-pass`, bindings | N-V4-21 (c) | dry run `go`; four `parity pass` receipts | 20 to 22 realistic (guard 89.0) | owner S-2 (with F07) |
| F07 | `V4-LIVE` (orchestrator): approval re-read, run, receipt `pass`, binding accepted | the compiled plan | `live-deadline pass`; binding `pass` | 4 to 5 realistic (guard 43.9) | owner S-2 |
| F08 | The activation (orchestrator): §3.4's go checks (1) to (4), the owner's S4-6 decision and authorization, `manifest.mjs activate --collection initial` | `freeze.json`, the published pilots | the printout (80 groups, 1,120 declared rows, 19 comparator cells with both boards) | none | owner S-3, first step |
| F09 | `V4-S4` (orchestrator): `approval --plan V4-S4`, the run (proofs first, rows, publishes, the selection verdict, `resolve-comparators`) | the activation | receipts; class selection final or a closure | 468 to 514 realistic | owner S-3; S-4 if needed |
| F10 | `V4-S4C` (orchestrator): `approval --plan V4-S4C`, the run, the final verdict input and record | the final selection | the phase-0 line written | 170 to 183 realistic | owner S-5 |
| F11 | The stage-4 report and phase 0 (SAs): the verdicts, the N-V4-16 and N-V4-17 readings on the frozen arms, P5's stops and lost completions, the population, the deadline violations; N-V4-06's decision to the owner | the final record | the joint report | none | owner (phase 0's result) |

Developer effort [A]: F01 2.5 h, F02 1.5 h, F03 4.5 h, F04 4.5 h, F05 3 h, F06 2 h, the orchestrator's F07 to F10 about 3 h of
attention spread over about 12 hours of machine, F11 the SAs'. Order constraints [V]: F01 to F06 before `V4-S4` (D-V4-20); F03 to
F05 final before F06 and F07 (the bindings); F02 before F03 (its result feeds the freeze); no production change from F02 to F10
(D-V4-11).

**Branches by the answers** [A]. Q1 (b): a task F03b (the tighter bound in the frozen family's `begin` lines, with T09c's ledger
reading it, reviewed by both SAs) before F06, and the n-upper and n-large classes then expected decidable. Q1 (c): the owner's
relaxation written into the verdict code before F06 (a harness edit, made before D-V4-20's window opens). Q2 (ii): a `require` value cannot
be fitted from the frozen round, which measures `any`; it would need a `require` pilot, an owner allowance. Q3 no: F02 is
skipped and the controls' no-regression risk is carried into stage 4. Q4 yes: the reviewed N-V4-18 task joins F03 and the
universe's twins of the fixed no-screen classes leave the activation.

**What follows** (later packs, each at its gate) [V: `check-list.md:626-643`, plan §6]: phase 0's result (N-V4-06) to the owner;
if it passes, phase 2, `gen-v4` in production (N-V4-07), with N-V4-15 (`require` on large boards) and the frozen round's
validation repeated on the production code; P7's spike (N-V4-05, 5.4) beside phase 2's design; phase 3 offers (N-V4-08) with the
blind play comparison (N-V4-09) before any offer; phase 4 items (N-V4-11); N-V4-01 (browser calibration) and N-V4-04 (stage 5)
when the owner asks; N-V4-10 with the owner. If phase 0 fails, the failing item goes to the supervisor before any refit (a class
that fails is never refitted on validation seeds, `plan.md:645`).

## 9. Questions

| ID | To | Question | Options | Recommendation | Evidence |
|---|---|---|---|---|---|
| Q1 | supervisor | N-V4-14 found that rule (c5)'s work condition is undecidable for every class holding a board of 300+ cells (T02d's bound of one open primitive is 2 to 780 times a rating's units, not the 840 M expected in IG-P-Q37 point 4). Do you accept freezing the class boundaries at 196-256 (screened, decidable) and 257-324 and 360+ (screened, expected `inconclusive`), with no change of rule, and leave a tighter bound or a relaxation to phase 2? | (a) as asked; (b) a tighter proved bound before `V4-S4` (a reviewed derivation; may need a kernel limit check that IG-P-Q37 excluded; the owner's approval per N-V4-14); (c) a relaxation, which the owner must approve; (d) keep 196-324, which makes the headline class `unknown` | (a) | A.3, A.4; `s2-work.md`, `s2-boot.md` |
| Q2 | supervisor | N-V4-21: may the frozen P5 give `require` calls no work budget (the deadline as backstop, as today), although IG-P-D1 says "work caps first"? | (i) no budget for `require`; (ii) a separate unfitted `require` budget; (iii) a bound that counts budget stops | (i) | 4.2; A.8; `check-list.md:643` |
| Q3 | owner | Run the supplementary control pilot `V4-S2B` (`fr-none`, 8 unpiloted controls, reps 0 to 4) before the freeze, inside the 749 minutes granted (formal guard 28.2, realistic 16 to 20 counted minutes)? | yes; no (accept an unmeasured no-regression risk on 8 controls) | yes | A.12, A.14; `s4-cost.md` |
| Q4 | owner | Implement N-V4-18 (drop the duplicate twin rows of the no-screen classes) to save about 90 realistic counted minutes (240 formal) of `V4-S4` and `V4-S4C`? | yes (a reviewed change of the verdict chain before stage 4); no | no | 4.6; `check-list.md:640` |
| Q5 | owner (asked at the activation, F08) | Approve the optional S4-6 (today's arm on the five failing cells, reps 20 to 24: a paired before-and-after factor, an indication, not a gate; formal 58.0 projected, guard 72.5)? | yes; no | no: MP12b1's records already give the unpaired "before", and no gate reads S4-6 | T11g `manifest.md` §2; plan §5.1 (`plan.md:564-566`) |

## 10. Evidence index

**Scratch scripts** (all read-only and unlocked; each writes its outputs beside itself in
`docs/improve-generating-stages-2-4/evidence/sa-opus/`), run from the repository root in this order:

```powershell
cd Q:\git\pentomino
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-account.mjs     # the round's account (stdout)
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-rows.mjs        # s2-rows.json|md: rows, comparisons, noise
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-calls.mjs       # s2-calls.json|md: W, close, c4, budget stops, ledgers, linkage
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-table.mjs       # s2-table.md: the table of A.1
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-ends.mjs        # how every call ended (stdout)
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-nullloc.mjs     # the ended calls without a locate result (stdout)
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-work.mjs        # s2-work.json|md: rule (c5) and N-V4-14
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-boot.mjs        # s2-boot.json|md: decidability at 20 seeds
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-gains.mjs       # s2-gains.md: per-set prior, (c4), close, P5
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-p5.mjs          # s2-p5.json|md: N-V4-16, N-V4-21, call work, reserve
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-prior.mjs       # s2-prior.json|md: the prior and its refit
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-today.mjs       # s2-today.md: the no-regression preview
node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-profile.mjs     # s2-profile.md: self time per function
node docs\improve-generating-stages-2-4\evidence\sa-opus\s3-activation.mjs  # the activation's go checks (stdout)
node docs\improve-generating-stages-2-4\evidence\sa-opus\s4-cost.mjs        # s4-cost.json|md: stage 4 and V4-S2B at measured times
node docs\improve-generating-stages-2-4\evidence\sa-opus\s0-conventions.mjs # the text conventions of the SA-Opus folders
node tools\ig-proto\manifest.mjs approval --plan V4-LIVE --label frozen --source-label "frozen 3fc65f4"
```

They import the harness's pure functions without changing them: `tools/ig-proto/verdicts.mjs` (`ingestRow`, `reachedTen`,
`cappedT10`, `pairRows`, `ratiosOf`, `matchedSets`, `clueRule`, `fasterRule`, `parseLines`, `rowLedger`, `workRule`,
`deadEnds`, `population`, `deadlineProjection`, `mulberry32`), `tools/ig-proto/linkage.mjs` (`linkSummary`) and
`tools/ig-proto/manifest.mjs` (`matrixData`, `controlsFrom`, `expandMatrix`, `conditionalActivated`, `activation`, `refS`,
`factor`, `projectedRowS`, `simulateRows`, `withoutSampling`); importing `verdicts.mjs` reads the frozen snapshot only.

**Records read** [V]:

| Record | What |
|---|---|
| `docs/improve-generating/evidence/frozen/V4-S2/<arm>/pilot-<cell>.runs.json` (33 files) | the published rows of the seven arms |
| `tests/artifacts/ig-proto/frozen/V4-S2/<arm>/pilot-<cell>/logs/` | the raw worker journals and link journals of every row (git-ignored; kept until phase 0) |
| `tests/artifacts/ig-proto/frozen/<task>/invocations.jsonl` | the round's invocation logs |
| `docs/improve-generating/evidence/frozen/V4-S2P/*.receipt.json`, `*.accepted.json` | P-0 and P-1 receipts and bindings |
| `docs/improve-generating/evidence/frozen/V4-S2K/kernel.json|md`; `tests/artifacts/ig-proto/frozen/V4-S2K/profile/out/*/*.cpuprofile` | counters, profile and raw CPU profiles |
| `docs/improve-generating/evidence/frozen/V4-S2W/width.md` | the pool probe |
| `docs/improve-generating/evidence/frozen/V4-T11/manifest.md|json` | the prices and the approval chain |
| `tools/ig-proto/data/frozen-round-v1.json`, `prior-v1.json`, `boards-v1.json`; `tools/ig-proto/plans/V4-LIVE.json`, `V4-S4.universe.json` | the matrix, the table prior, the catalogue, the compiled plans |
| MP12b1's reports through `lib/paths.mjs` `mp12b1Report` | today's runs on the same seeds |

**Documents cited**: `docs/improve-generating/plan.md` (v4); `docs/improve-generating/clarifications.md` (and at `1731c6b` for
IG-P-Q09 and IG-P-Q10, at `288669b` for IG-P-Q37); `tasks/improve-generating-v4/check-list.md`, `T11a`, `T11c`, `T11e`, `T11f`;
`tools/ig-proto/README.md`; `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js`; `tools/ig-proto/lib/proof.mjs`;
`tools/ig-proto/manifest.mjs`.
