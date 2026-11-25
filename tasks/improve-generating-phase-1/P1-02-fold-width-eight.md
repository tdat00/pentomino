# P1-02: Width-8 fold simulation and test-table sentence

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-1`; plan §4.5, P1-T02/T03/T09, §8 P1-02; D-P1-04/D-P1-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, `eca0f94717a56de43c52f6cb54d739360670fef8` |
| Depends on | P1-01 accepted and committed |
| Pack author / reviewer | SA-Astra / SA-Opus |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) for two edits; the orchestrator runs the one focused gate |
| Estimate | Developer 0.5 h, orchestrator 0.1 h; machine about 1 min node+quiet, one invocation capped at 300 + 45 s |

## Goal

Close the width-8 fold-simulation gap without admitting eight production workers.
Exercise the existing real candidate/fold with both seeds and all three completion orders, preserving
its serial reference and other assertions. Document exactly what the test covers.

## Authority and fixed points

- Plan §4.5 provides the exact three replacements; production `MAX_POOL_SIZE` stays 4.
- No `runRecipe(8)`, fake candidate/fold, new seed, new test framework, provenance change or new UI text.
- Read the two Change files, check-list §3.3 (G-STAGE), and
  `core/browser/worker-pool.js:75,194-196`. `summary` at `tests/generate.test.js:139` compares status,
  partial reason, ordered layout keys, ordered clue keys and scores, not every provenance/rating field.

## Scope

- Change `tests/generate.test.js`, only the title and width loop in
  `describe('deterministic parallel simulation', ...)`, at base lines 808 and 821.
- Change `docs/design-detail.md`, only the existing generate test-table sentence at base line 3076.
- The orchestrator creates `E/fold-width8/run.log` and `helper.log`; no index file.
- Do not change the dispatch-priority width loop at test line 420, any other test, fixtures, runtime,
  production width guarantee, original evidence, versions or locales.
- Guards: G-PROTECTED empty; G-STAGE passes; G-WORKTREE only these paths and bookkeeping.

## Steps

1. Run `git --no-pager diff --exit-code eca0f94 -- tests docs\design-detail.md`.
   Expected: no output, exit 0; otherwise QUESTION. Set:

   ```powershell
   $Allowed = @(
     'tests/generate.test.js', 'docs/design-detail.md',
     'docs/improve-generating-phase-1/evidence/fold-width8/run.log',
     'docs/improve-generating-phase-1/evidence/fold-width8/helper.log',
     'tasks/improve-generating-phase-1/P1-02-fold-width-eight.md',
     'tasks/improve-generating-phase-1/check-list.md'
   )
   ```

2. Within the `deterministic parallel simulation` describe block only:
   - Replace title `pool sizes 1-4 and shuffled completion orders agree on ${seedText}${tag}` with
     `pool sizes 1-4 and 8 with shuffled completion orders agree on ${seedText}${tag}`.
   - Replace that block's `for (const width of [1, 2, 3, 4]) {` with
     `for (const width of [1, 2, 3, 4, 8]) {`.
   - Retain `simulate`, the serial result, memoization/candidate-purity and history non-mutation checks.
     Retain both `fixture-set-0` and `fixture-set-1` (slow), 10x6 Hard `any`, quantity 5,
     batch seed `${seedText}#1`, matching calibration, prior history and the three order seeds
     `${order}${width}`, `order` in `['a', 'b', 'c']`. Change no other line.
3. In `docs/design-detail.md`'s generate test-table row replace exactly:

   > Fold determinism: identical output for pool sizes 1 and 4 and shuffled completion orders (simulated).

   with this one physical-line sentence:

   > Fold determinism: identical output for simulated pool widths 1, 2, 3, 4 and 8 and three shuffled completion orders, against the serial fold. Width 8 is a test-only simulation; the production pool remains limited to four.

   Do not change the separate production guarantee in §8.2 (`docs/design-detail.md:2190`,
   "any pool size (1–4)"). No EN/VI user-facing text changes.
4. Run `node --check tests\generate.test.js`, G-STAGE, `npm run check`, G-PROTECTED, G-WORKTREE
   and G-FORMAT on the two edited files. Check each native exit. Report
   `READY FOR LOCKED GATE: P1-02` with
   `git --no-pager diff -- tests\generate.test.js docs\design-detail.md` and those results.
   The developer does not run tests. The orchestrator's one focused run is the acceptance gate,
   avoiding an unplanned sixth invocation.
5. **Orchestrator, before committing:** paste check-list §3.2's shared block, then run:

   ```powershell
   $env:FORCE_COLOR = '0'
   . .\tools\ig-proto\lock\ig-lock.ps1
   $dir = 'docs\improve-generating-phase-1\evidence\fold-width8'
   New-Item -ItemType Directory -Path $dir | Out-Null
   $runner = 'docs\improve-generating-phase-1\evidence\sa-opus\p1-run.mjs'
   try {
     Invoke-IgNode -Repo pentomino -Task 'P1-02 fold8' -LimitSeconds 300 -QuietSeconds 45 -NodeArgs @(
       $runner, "$dir\run.log", 'self', '--', '--test', '--test-reporter=tap',
       '--test-name-pattern=pool sizes 1-4 and 8 with shuffled completion orders',
       'tests\generate.test.js'
     ) 6>&1 2>&1 | Tee-Object -FilePath "$dir\helper.log"
   } catch {
     ($_ | Out-String) | Tee-Object -FilePath "$dir\helper.log" -Append
     ConvertTo-CrlfLog $dir
     throw
   }
   ```

   `New-Item` must throw if the folder exists. Keep a failed attempt and stop; a repeat needs a ruling
   naming a fresh folder and adjusting downstream references/accounting. Never overwrite this folder.
6. Append this to step 5's command. The gate and these checks are one command: a later command has neither `$dir` nor the shared functions.

   ```powershell
   ConvertTo-CrlfLog $dir
   Test-GateLog "$dir\run.log" "$dir\helper.log" 'P1-02 fold8' 26 @('# pass 2', '# fail 0', '# cancelled 0', 'p1-run: exit 0') $Fold
   ```

   Record the returned node seconds and actual Node version from the first log line. A throw is a
   QUESTION, not a retry. Unselected tests may appear as skipped. The two cases give 30 comparisons
   of the existing summary (2 seeds × 5 widths × 3 orders), not eight physical workers or all
   provenance fields.
7. Re-run G-STAGE, `npm run check`, G-PROTECTED and G-WORKTREE.
   Set `$FormatFiles = @($Allowed | ForEach-Object { $_.Replace('/', '\') })`
   and run G-FORMAT after bookkeeping. The orchestrator commits the two edits and two logs, with
   its task/check-list bookkeeping, as one task. P1-03b rechecks these logs; no focused index file.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/generate.test.js` | `pool sizes 1-4 and 8 with shuffled completion orders agree on fixture-set-0` | Existing 10x6 Hard `any`, quantity 5, widths 1/2/3/4/8 and orders a/b/c | 15 summaries equal serial; purity/history assertions unchanged |
| Same file | `pool sizes 1-4 and 8 with shuffled completion orders agree on fixture-set-1 (slow)` | Second existing seed, same widths/orders | Another 15 summaries equal serial |
| Check-list G-STAGE | Exact edit | Current files after edit | Only two test-line and one spec-line replacements; other tests unchanged |

## Documentation

Only the exact generate test-table sentence changes. Production §8.2 remains 1-4; no design-brief,
guide, translation, stored identity or runtime documentation change.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| Empty preflight diff; `node --check tests\generate.test.js` | Root, unlocked | Exit 0 | 30 s |
| G-STAGE, G-PROTECTED, G-WORKTREE | Root, unlocked | No throw; only listed delta | 1 min |
| `npm run check`; G-FORMAT on two edits, then all six allowed files | Root | Both checks OK; formats pass | 2 min |
| Step 5's one `Invoke-IgNode` | Root, orchestrator | Exit 0; both named cases pass | 300 s Node, 45 s quiet, plus lock wait |
| `Test-GateLog` | Root, same session | Pass 2, fail/cancelled 0, actual seconds <=300, quiet 45 | 30 s |

## Stop points and questions

- Developer stops with `READY FOR LOCKED GATE: P1-02`; no uncoordinated test run.
- A timeout/nonzero/missing case or existing output folder stops. Preserve logs, do not widen a
  timeout, replace a fixture, add a substitute test or raise the production pool cap.
- `QUESTION:` to the pack author through the orchestrator when the task is wrong or contradicts
  code, behaviour is ambiguous, a gate fails for an uncovered reason, outside-scope change is needed
  or a recorded decision would change.

## Acceptance criteria

### Business

| ID | Criterion | How verified | Evidence |
|---|---|---|---|
| P1-02-B01 | Width-8 assurance without changing players' behaviour or pool admission | Real fold simulation plus production guard | Focused logs, G-PROTECTED |

### Technical

| ID | Criterion | How verified | Evidence |
|---|---|---|---|
| P1-02-T01 | Exactly the three prescribed replacements | G-STAGE | Guard output and diff |
| P1-02-T02 | Both seeds/three orders/five widths pass; <=300 s, quiet 45 | Test-GateLog and unchanged simulation loops | `fold-width8/run.log`, `helper.log` |
| P1-02-T03 | Source, fixtures and production width remain unchanged | G-PROTECTED; original line 420 retained | Scope output |
| P1-02-T04 | Correct spec wording and formats | Exact sentence; `npm run check`, G-FORMAT | Diff, gate outputs |

## Checklist

- [ ] Only the two test lines and one specification sentence changed
- [ ] Developer handed off before the one orchestrator-run focused gate
- [ ] Logs pass Test-GateLog; node seconds and exact Node version recorded
- [ ] Width 8 stays simulation-only; 30 comparisons and summary limits stated correctly
- [ ] Conventions/formats/guards and every AC's evidence complete
- [ ] No task-pack edit, commit or push by the developer

## Final report

Start/end/duration; two edited files/diff; all static gates; ready-for-lock hand-off. The orchestrator
adds the focused gate's version, pass count, seconds/quiet and AC evidence before committing. List
questions/rulings/deviations; no independent retry or extra test run.

## Execution log

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |
