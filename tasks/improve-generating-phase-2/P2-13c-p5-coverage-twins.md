# P2-13c: P5's trigger, coverage and the activation of the twins

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §7.5 (the conditional P5 comparator and its report), §6 P2-T10 (part); D-P2-12; review-1 R3, R6; review-2 R2-01, R2-06; `contracts.md` C5, C6, C9 to C11 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-13c` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | T; P2-13b (`gates.mjs`, the report) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 3 h; machine: unlocked synthetic tests (no engine) |

## Goal

The stage-B report says, per cell and arm, whether P5 cost a completion or a set (false stops, lost completions), with
honest, disjoint coverage categories over all 440 eligible rows of both stages. The `twins` command names exactly which
uncapped twins stage B runs, in an immutable activation receipt. More than the fifteen priced twins becomes a costed
finding; a required twin is never dropped. P2-13f adds the N-V4-16 glue and the reach readings.

## Authority and fixed points

- **`contracts.md` C10 and C11, exactly:** the OR predicate, any attempt index included; the receipt's fields and the
  overflow rule.
- **The eligible rows:** the 360 shipped `gen-v4` rows except `26x26-nightmare` (60 in A, 300 in B), and the 80
  `non-table` `gen-v4` rows of A: 140 eligible bounded rows in A and 300 in B.
- **The production evidence of a row** (C5, C6, C9), read through `loadSnapshot` (P2-13e), so each row has its
  `binding`:
  - `run.acceptedCount`, `run.partialReason`, `run.errors`, `run.interrupted`;
  - `telemetry` (`setCounters`, `batchCounters`, `trail` with `attempts`, `sameSide`, `boundFired`, `noWindow`);
  - `ledger.outcomes` (the raw ended calls).

  A missing field is **unknown**, never zero.
- **Historical applicability and coverage (review-2 R2-01, verbatim; `contracts.md` C11).** "A row in the original
  validation cells requires its declared frozen counterpart and the bound F2/F4 readings. A missing required counterpart
  or reading is unknown. A `non-table` sentinel has no historical counterpart by design: its historical side is
  `not-applicable`, and its trigger is evaluated on production alone.

  Classify coverage only after validating the bounded observation and, when present, the twin against the sealed source
  and receipt bindings. A row line alone is not a valid measured pair. Unknown required evidence, or an invalid,
  erroneous, censored or interrupted required observation, is `unresolved` and cannot become an analytical zero.
  Otherwise a valid measured twin gives `observed-pair`. A triggered row without its required valid twin is
  `unresolved`. Only a fully settled, untriggered row without a measured twin is `analytic-only`: reached ten implies
  zero lost completion; no set-bound reason implies zero false stops. Count the two endpoints separately, without
  mixing observed pairs and analytical zeros."
- **The historical evidence of an original-cell row** is its frozen counterpart: P2-13b's oracle row, `fr-frozen` or
  `fr-frozen-none`. It gives `acceptedCount` and `partialReason`. Its no-window, bound and budget fields are not in the
  frozen rows. They are settled to zero only through the signed readings of
  `docs/improve-generating-stages-2-4/stage4-report.md`, accepted by both SAs (line 475):
  - **F2** (line 286): "no observed natural set call ended without a window, so the bound and glue were unexercised in
    stages 2 and 4";
  - **F4** (line 288): "No recorded call-budget stop".

  The receipt binds that file's SHA-256 and the SHA-256 of every frozen oracle file read. Without them, those fields
  are unknown.
- **A valid observation** (the bounded row, or its twin): its row line exists, its `binding.ok` is true,
  `run.interrupted` is false and `run.errors` is empty. A row line whose binding fails is invalid; a key whose status
  line is `interrupted` (killed, or no report) is censored or interrupted; a run with errors is erroneous.
- **The twins.** The ten fixed plan rows `conditional-twin/uncapped/14x14-hell-1/<rep>` (reps 21, 26, 27, 30, 31, 33,
  34, 36, 37 and 38) cover their triggered rows. Any other triggered row takes the next open slot, in key order. After
  the five slots, it goes to `overflow`, three twins per group (the 885-s horizon at 260 s each).
- **The reprice (review-2 R2-06, verbatim; `contracts.md` C10).** "`repriceCountedS = sum over overflow groups of (2 + 260 * group.length + 45)`.
  Give its separate guard projection as `1.25 * repriceCountedS`; the ledger still admits at the enforced invocation
  limit, never at the price estimate. For four groups of three twins, counted is **3,308 s**, guard is **4,135 s**.
  Keep the pending fixed groups in the continuation quote."

## Scope

- **Create:** `tools/ig-proto/phase2/p5.mjs` (pure functions).
- **Change:** `tools/ig-proto/phase2/p2.mjs` (the `twins` command), `tools/ig-proto/phase2/gates.mjs` (gate B8),
  `tools/ig-proto/phase2/p2.test.mjs` (new cases).
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/p5.mjs', 'tools/ig-proto/phase2/p2.mjs', 'tools/ig-proto/phase2/gates.mjs',
    'tools/ig-proto/phase2/p2.test.mjs', 'tasks/improve-generating-phase-2/P2-13c-p5-coverage-twins.md')
  ```

## Steps

1. **`p5.mjs`** exports:
   - **`triggered(row, historical)`** returns `{ triggered, reasons, unknown }`. The reasons, on either row:
     - `fewer-than-ten`: `acceptedCount < 10`;
     - `no-window`: a `ledger.outcomes` entry with `stage: 'set'` and `igNoWindow` not `null`, or
       `telemetry.trail.noWindow.below + above > 0`;
     - `bound`: `telemetry.trail.boundFired`, or `partialReason` `set:no-window-below` or `set:no-window-above`;
     - `budget-stop`: an outcome with `budgetStop: true`, or `budgetStops > 0` in `setCounters` or `batchCounters`;
     - `clock-cut`: `partialReason` `set:time-limit`, `set:reserve-cut`, `set:response-bound`, `time-limit` or
       `response-bound`.

     A field needed by a reason and absent on the production row (no `telemetry`, no `ledger.outcomes`, or an
     incomplete `ledger`) is listed in `unknown`. `historical` is `{ applicable: false }` for a `non-table` row: its
     trigger is evaluated on production alone and adds no unknown. For an original-cell row it is
     `{ applicable: true, row, readings }`: a missing counterpart `row` is unknown, and its `no-window`, `bound` and
     `budget-stop` are settled to "not triggered" only when `readings` holds the bound F2 and F4 hashes, otherwise
     unknown.
   - **`coverage(rows, twinRows, historical)`**: per eligible row, exactly one category, by the R2-01 text above.
     - `unresolved`: the row is not a valid observation; or it has any `unknown`; or it is triggered and has no valid
       twin.
     - `observed-pair`: otherwise, when the row has a valid twin. Count a **false stop** when the row's `bound` reason
       holds and the twin's set completed; count a **lost completion** when the row has fewer than ten and the twin
       reached ten.
     - `analytic-only`: otherwise (settled, untriggered, no measured twin). Reached ten gives zero lost completion; no
       set-bound reason gives zero false stop.
     - The two endpoints, lost completions and false stops, are counted separately, and each count says how many come
       from observed pairs and how many are analytical zeros.
2. **`p2.mjs twins --out <dir>`.** Its inputs:
   - `E/rows/A.jsonl` and `E/rows-before-twins/B.jsonl`, each read with `loadSnapshot` (P2-13e);
   - the frozen oracle files of the original-cell eligible rows;
   - `stage4-report.md`.

   It writes `<dir>/activation.json` (write-once, C10) and `<dir>/twins.md`:
   - `planSha256` and `sealSha256`, from the real plan and seal;
   - `inputs`: `{ A, Bbounded, frozen: [{ path, sha256 }], readings: { path, sha256 } }`;
   - `predicateVersion: 'p2-twins-v1'`;
   - `eligible: 440`. A different count of eligible rows in the snapshots exits 5 with the count;
   - `required`: the triggered rows' keys, in key order;
   - `slots`: each open slot key mapped to a required key, or `null`;
   - `inactive`: the open slots mapped to `null`;
   - `overflow`: `{ keys, groups, repriceCountedS, repriceGuardS }`, with the reprice formula above.

   It exits 0 without overflow and 4 with overflow (a finding, check-list §3.5). An existing `activation.json` with
   other bytes exits 3.
3. **The B report (review-2 R2-01, verbatim).** B8 reads both final snapshots, `E/rows/A.jsonl` and `E/rows/B.jsonl`.
   Its coverage cohort is exactly the 360 original shipped gen-v4 rows excluding full 26x26 Nightmare, plus the 80
   shipped sentinel rows: 140 eligible bounded rows in A and 300 in B. Join their twins by cell, repetition, seed and
   uniqueness, not by group or slot key. Smoke, REQUIRE, Master and the no-screen comparator are not added to this
   cohort. Glue and reach are separate per-component/arm/cell readings, so those diagnostic cohorts are not lost or
   silently pooled. Any unresolved eligible row leaves B8 incomplete.
   - In `gates.mjs`, `stageGates('B', ...)` computes B8 from `coverage` over that cohort. Its `detail` holds the counts
     per category and per endpoint, and the `unresolved` keys with their reasons. P2-13f adds the glue and reach
     readings.
4. **Tests.** Write the cases below, with synthetic rows that carry a `binding` as `loadSnapshot` gives it.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/p2.test.mjs` | `a no-window attempt followed by success triggers` | a row of ten whose `ledger.outcomes` has set attempt 0 with `igNoWindow: 'below'` and attempt 1 `ok` | triggered, `no-window` |
| same | `a no-window attempt after index 3 triggers` | `trail.noWindow.above` 1, with `trail.attempts` all `ok` or `fail` without a side | triggered, `no-window` |
| same | `both set-prefixed clock reasons trigger` | `partialReason` `set:time-limit`; then `set:response-bound` | triggered, `clock-cut`, for both |
| same | `missing production reach is unknown` | a row without `telemetry` | `unknown` holds `telemetry`; the coverage category is `unresolved` |
| same | `historical zeros need the signed readings` | an untriggered original-cell row whose historical counterpart reached ten, with and without the F2/F4 hashes | `analytic-only`; `unresolved` |
| same | `a valid new sentinel has no historical unknown` | a `non-table` row with no oracle, all production trigger fields settled and untriggered; then the same row triggered with a valid twin | `analytic-only`, no unknown; `observed-pair` |
| same | `a missing counterpart or an invalid twin is unresolved` | an original-cell row whose frozen counterpart is missing; separately, a triggered row whose twin line is present but whose twin `binding.ok` is false (receipt hash) | `unresolved` in each case |
| same | `a reached-ten row with an observed twin is a pair` | a row of ten with a valid twin of ten | `observed-pair`; no false stop; no lost completion |
| same | `false stops and lost completions` | a `bound` row whose twin made a set; a row of 7 whose twin reached 10 | one false stop; one lost completion; both counted as observed pairs |
| same | `a required twin missing is unresolved` | a triggered row whose twin is `interrupted` | `unresolved`, never zero |
| same | `B8 covers both stages` | 140 eligible A rows and 300 eligible B rows, every B twin present, one required A twin missing | B8 includes all 440 and is `incomplete`, naming the A key |
| same | `the activation receipt` | snapshots where three 14x14 Hell 1 rows covered by fixed twins and two other rows are triggered | `required` 5; two slots mapped; three slots `inactive`; no overflow; exit 0; a second run with other inputs exits 3 |
| same | `more than fifteen required twins is a costed finding` | 17 triggered rows outside the ten fixed twins | five slots filled; `overflow.keys` 12; `overflow.groups` 4 groups of 3; `repriceCountedS` 3,308; `repriceGuardS` 4,135; exit 4 |

## Documentation

None here; P2-17 writes the README section.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --test tools/ig-proto/phase2/p2.test.mjs` | slot root, unlocked (no engine) | `# fail 0`, `# cancelled 0` | 5 min |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when a trigger field of C11 has no source in the rows, for example when the work stop cannot be told
  from `time-limit`. Report the field; do not guess.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13c-B01 | P5's cost is reported with honest coverage over all 440 eligible rows; no required twin is dropped | the cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13c-T01 | P2-T10 (part) and R6: the full OR predicate, attempts beyond 3, both clock forms, unknowns, the historical readings bound | trigger cases | test output |
| P2-13c-T02 | Review-2 R2-01: historical applicability, coverage after validation, B8 over A and B | coverage and B8 cases | test output |
| P2-13c-T03 | C10 and review-2 R2-06: an immutable activation receipt with slots, inactive slots and costed overflow | activation cases | test output |

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
| Slot, base SHA | |
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator (merge gate) | |
| Commit (slot), commit on `gen-v4` | |
| Issues and named items | |
