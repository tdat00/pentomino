# P2-13f: N-V4-16's glue and the reach readings

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.6 (N-V4-16's ordered glue record, R4), §6 P2-T10 (part), F7; D-P2-10; review-1 R6; review-2 R2-01 (the end-to-end case), R2-02; `contracts.md` C6, C9, C11 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-13f` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | T; P2-13c (`p5.mjs`, B8 and the `twins` command) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2 h; machine: unlocked synthetic tests (no engine) |

## Goal

The stage-B report says, per component, arm and cell:

- whether the bound and its glue ran on real requests, and how each raw selector outcome reached the client and the
  public reason;
- how often budget stops, re-ratings and screen-capped profiles happened.

A path that never ran is named "unexercised" only when complete raw evidence shows it. Missing evidence is never
reported as zero.

## Authority and fixed points

- **R4 (plan §4.6), verbatim:** "For each gen-v4 row, retain the first four set-attempt outcomes/reasons and their
  decision/transport ordering, whether the same-side condition was met, whether the client bound fired, and the public
  terminal reason. Per arm and cell report natural same-side matches, firings and `set:no-window-*` rows. List every
  same-side match without the expected public reason, distinguishing the declared higher-priority cancellation/time-out
  from an unexplained transport/order defect. Keep the real-worker synthetic-ratings test. Zero natural matches is
  still "unexercised", not a real-data pass."
- **N-V4-16 (review-2 R2-02, verbatim; `contracts.md` C11).** "Derive a natural same-side match from the raw ended set
  calls for attempts 0, 1, 2 and 3: all four must exist and have the same non-null `igNoWindow` side. A known
  pre-selection failure is not a no-window end. Keep raw-match count, client `sameSide` count, bound firings and public
  `set:no-window-*` count as separate columns. A disagreement is evidence, not zero reach.

  Join each raw outcome to the client entry by its `attempt` field, never by the array index; retain the client's
  `arrival` ordering. Compare an actual transported reason with `no-window-<raw side>`. Missing required transport is
  unresolved unless explained by the declared higher-priority cancellation/time cut; it is still listed. Report the
  priority explanation separately from unexplained defects.

  For bound-enabled gen-v4 routes, reconcile every raw first-four match with the client condition, firing and public
  reason; list a mismatch as declared-priority or unexplained. On `p2-uncapped` and `p2-uncapped-diag`, firing/public-bound
  expectations are not applicable: continuing after four same-side ends is intended. Still compare their raw and
  transported per-attempt reasons. Print `unexercised` only when complete raw evidence establishes zero natural
  matches."
- **The evidence of a row** (C5, C6, C9), read through `loadSnapshot` (P2-13e): `ledger.outcomes` (the raw ended calls,
  `{ stage, attempt, result, igNoWindow, budgetStop }`), `ledger.complete`, `ledger.rerateStarts`,
  `telemetry.trail` (`attempts` as `{ attempt, outcome, reason, arrival }`, `sameSide`, `boundFired`), `setCounters`,
  `batchCounters` and `run.partialReason`. A row whose `binding.ok` is false is left out and listed.
- **The declared higher-priority reasons:** `cancelled`, `set:time-limit`, `set:reserve-cut` and `set:response-bound`.
- **The routes.** Bound-enabled: the variants `p2-gen4`, `p2-gen4-diag` and `p2-none`. Bound disabled by design:
  `p2-uncapped` and `p2-uncapped-diag`. `p2-today` runs today's search, whose raw outcomes have no `igNoWindow`.

## Scope

- **Create:** `tools/ig-proto/phase2/glue-reach.mjs` (pure functions).
- **Change:** `tools/ig-proto/phase2/p2.mjs` (the stage-B `report` readings) and `tools/ig-proto/phase2/p2.test.mjs`
  (new cases, and the fake calibrate mode `nowindow`).
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/glue-reach.mjs', 'tools/ig-proto/phase2/p2.mjs',
    'tools/ig-proto/phase2/p2.test.mjs', 'tasks/improve-generating-phase-2/P2-13f-glue-and-reach.md')
  ```

## Steps

1. **`glue-reach.mjs`** exports `glue(rows)` and `reach(rows)`, each grouped by `component`, `arm` and `cell`.
2. **`glue(rows)`.** Per row:
   - **The raw side.** The outcomes with `stage === 'set'` and `attempt` 0, 1, 2 or 3. A raw natural match is all four
     present with the same non-null `igNoWindow`. The raw evidence is complete when `ledger.complete` is true,
     `ledger.outcomes` exists, every one of these outcomes has `igNoWindow` `null`, `'below'` or `'above'` (C1 writes
     it on every `end` line), and the repeated outcomes of one attempt (a pool retry) agree on it. A missing or
     malformed `igNoWindow`, or repeats that disagree, make the row incomplete, never a "no match" (ruling on P2-13f,
     2026-11-26).
   - **The transport.** For each raw outcome with a non-null `igNoWindow`, the client entry is the element of
     `trail.attempts` whose `attempt` equals the outcome's. Its `reason` must be `` `no-window-${igNoWindow}` ``.
     - A different reason is a glue discrepancy, `unexplained`.
     - No entry is `declared` when `run.partialReason` is a declared higher-priority reason; otherwise it is
       `unresolved`. Both are listed.
   - **The reconciliation**, on bound-enabled routes, for each raw natural match: `trail.sameSide` equals its side,
     `trail.boundFired` is true and `run.partialReason` is `set:no-window-<side>`. A mismatch is `declared` when
     `run.partialReason` is a declared higher-priority reason, otherwise `unexplained`. On `p2-uncapped` and
     `p2-uncapped-diag` there is no reconciliation.
   - **Per group**, the separate columns: `rawMatches`, `clientSameSide` (`trail.sameSide !== null`), `firings`
     (`boundFired`), `publicNoWindow` (`partialReason` `set:no-window-*`), and the lists `transport` and `reconcile`
     (`{ key, attempt, raw, transported or expected, class }`, with the client entries in `arrival` order), and
     `refused` (rows without a valid binding).
   - **`status`:** `exercised` when `rawMatches > 0`; `unexercised` when it is 0 and every row's raw evidence is
     complete; otherwise `unknown`, with the incomplete keys. A group whose rows all have `variant` `p2-today` is
     `not-applicable`: today's search has no bound, and its `igNoWindow` is always `null` (ruling on P2-13f,
     2026-11-26).
3. **`reach(rows)`**, per group:
   - the budget stops: the sum of `budgetStops` of `setCounters` and `batchCounters` (F4);
   - the re-rating starts: `ledger.rerateStarts`, by phase;
   - the re-rating completions: `rescueReratings` and `tailReratings`;
   - the screen-capped profiles: `screenCapped` (F7).

   A zero is printed `0 (unexercised)`. A row without these fields is listed as unknown and adds no zero. In a group
   whose rows all have `variant` `p2-today`, every reading prints `n/a (today's search)`: today's search has no budget,
   screen or re-rating, so neither a zero nor an unknown applies.
4. **The report.** `p2.mjs report --stage B` adds `readings: { glue, reach }` to `report.json`, over the rows of both
   final snapshots, and one table per reading to `report.md`. The readings are not gates; B8 stays P2-13c's.
5. **Tests.** Write the cases below. The end-to-end case adds the mode `nowindow` to P2-13d's fake calibrate: it writes
   the `ok` mode's files, with the set call's `end` line carrying `igNoWindow: 'below'` and one `rerate` line of phase
   `rescue`, under P2-13e's `fakeSeal`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/p2.test.mjs` | `a raw match survives a broken transport` | raw set sides all `below`; client entries in arrival order `[2, 0, 3, 1]`, each with reason `not-in-band` | one raw natural match; four `unexplained` transport discrepancies; `status` not `unexercised` |
| same | `an uncapped row that continues is no missing-bound defect` | the same raw match on a `p2-uncapped` row whose transported reasons are `no-window-below` and which later succeeds | no `reconcile` entry; no transport discrepancy |
| same | `the glue names a discrepancy by attempt` | raw set attempt 1 `igNoWindow: 'above'`; the client entry with `attempt: 1` has `reason: 'not-in-band'` | one `unexplained` discrepancy for that row and attempt 1 |
| same | `the glue classifies an unexpected public reason` | a raw match `below` on `p2-gen4`, `sameSide: 'below'`, `boundFired: false`, `partialReason: 'set:time-limit'`; then the same with `partialReason: null` | `declared`; `unexplained` |
| same | `unexercised needs complete raw evidence` | rows with no raw match, all with complete ledgers; then one with `ledger.complete` false; then one whose set outcome of attempt 2 has no `igNoWindow` field; then one with two outcomes of attempt 1, `'below'` and `null` | `unexercised`; `unknown`, naming that row; `unknown`, naming that row; `unknown`, naming that row |
| same | `today's search is not applicable` | two `p2-today` rows of one cell, `telemetry: null`, complete ledgers whose set outcomes have `igNoWindow: null` | glue `status: 'not-applicable'`; every reach reading prints `n/a (today's search)` |
| same | `zero reach is unexercised` | rows with zero counters and zero `rerateStarts` | each reading printed `0 (unexercised)` |
| same | `raw outcomes and rescue starts survive to the readings` | fake calibrate `nowindow`; `runGroup`; `publish`; `loadSnapshot`; then P2-13c's `triggered` and this task's `reach` | the row's `ledger.outcomes` and `rerateStarts` are present; `triggered` with `no-window` and no unknown; `reach` counts one `rescue` start |

## Documentation

None here; P2-17 writes the README section.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --test tools/ig-proto/phase2/p2.test.mjs` | slot root, unlocked (no engine) | `# fail 0`, `# cancelled 0` | 5 min |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when a field named here is missing from its contract (C6, C9), or when the declared higher-priority
  reasons do not cover a reason the rows show.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13f-B01 | Whether the early stop and its glue ran on real requests is reported from the raw outcomes; untested paths are "unexercised" only on complete evidence | the cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13f-T01 | Review-2 R2-02 and R4: raw matches, joins by `attempt`, separate columns, declared or unexplained mismatches, the uncapped exception | the glue cases | test output |
| P2-13f-T02 | F4 and F7 readings, never zero from missing evidence | the reach cases | test output |
| P2-13f-T03 | Review-2 R2-01: the raw fields survive the driver, publication and the readers | the end-to-end case | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the test pass counts;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w3, 3c77a46af08b12cdcbcbc840f8a10fff44aa4d8e |
| Start, end, duration | dispatched 2026-11-26 01:18 +07:00 (developer 01:18:18 to about 01:25:10; fix round to about 01:43); accepted 01:43 |
| Waiting for rulings | about 9 min (eight deviations and the gaps, SA-Opus) |
| Agent id, model | 4d9df110-7386-48a4-af68-c7a365aaa4b6, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 45; 5,589,703 / 50,418 / 5,290,418 |
| AI credits | 178.14 |
| Questions and rulings | no QUESTION; SA-Opus ruled (pack amendment 40d7730, P2-13f task file): deviations 1 to 8 accepted (fake partialReason null; transport check on attempts 0 to 3 (C6); missing or not-ok binding refused; refused rows make a group unknown; clientSameSide counts a string; null counters a known zero; duplicate keys refused for the readings; extras); declared reasons: the four accepted; fixes: an absent or malformed igNoWindow makes the row incomplete; disagreeing repeats make the row incomplete; groups of only p2-today rows are not-applicable and their reach prints n/a (today's search); two test inputs and one new case |
| Fix rounds | 1 (the three ruled fixes and their tests) |
| Gates re-run by the orchestrator (merge gate) | slot static guards; merge gate with every phase-2 test file and G-COPIES (results in the bookkeeping); developer: unlocked p2.test.mjs 97/97 (64.7 s), G-PROTECTED, G-WORKTREE, G-FORMAT (3 files), G-CHECK OK |
| Commit (slot), commit on `gen-v4` | this commit; its SHA on gen-v4 in the bookkeeping |
| Issues and named items | P2-17 documents the readings; the report.md cell for an unknown glue status gives a row count (report.json lists the keys); verified on synthetic rows and the fake calibrate only |
