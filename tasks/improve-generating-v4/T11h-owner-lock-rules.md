# T11h: The owner's lock rules: the 900-s cap and the idle quiet period in the helper, the runner, the budget and the price

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 ("Budget": "concurrency"; "Each task has a ceiling"), §3 P8 ("every gate is read at four workers"); the owner's decision of 2026-11-17 21:33 (check-list §5: `helperCap=900`, `quiet=15-when-idle`, `timedConcurrency=sequential`); decisions D-V4-02, D-V4-14, D-V4-15, D-V4-19 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11c |
| Depends on | T11c (the compiled plans; its edit of `run-task.ps1` line 39); T11b (the pricing whose constants change) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3.5 h (2.5 h, 0.5 h for SA-Astra's review of 2026-11-17: the rechecks and cases (k) to (m), and a fix round of 0.5 h after its report: `lock-check.ps1` robust and diagnosable), machine 0 min (a helper copy checked in a scratch `TEMP` with `node -e`, constants, a recompile and dry runs; nothing locked) |

## Goal

On 2026-11-17 at 21:33 the owner decided that a locked invocation may last up to 900 s instead of 300 s, that the quiet
period before an invocation is 15 s when Sudoku's difficulty-v3 has nothing scheduled and 45 s otherwise, and that
timed requests stay sequential at four workers. Under the 300-s cap a request row of a 260-s group ran alone in its
invocation and paid its own quiet period (918 of the 3,604 counted minutes of T11b's matrix); under the 900-s cap rows
share invocations. This task carries the two rules into a pentomino copy of the lock helper, the runner, the budget
decision and the price, recompiles T11c's plans, and leaves the shared helper, and so the Sudoku side, untouched.

## Authority and fixed points

- The owner's fields (check-list §5, 2026-11-17 21:33): `helperCap=900` (a locked invocation may last up to 900 s);
  `quiet=15-when-idle` (the quiet period is 15 s when Sudoku's difficulty-v3 has nothing scheduled, otherwise 45 s);
  `timedConcurrency=sequential` (timed requests stay sequential at four workers); `schedule=continue`.
- The shared helper `C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1`
  (SHA-256 `28f36df68f428aa69d4902193f9f9f087187a12efd6f3cde901e5eae077307ae` on 2026-11-17; its text is `PAUSE.md`'s
  Appendix A) serves Sudoku's improve-generating work too and is never edited: its defaults, its refusal of more than
  300 s and its printed line stay. Pentomino uses a copy in this repository (step 1). Both use the same two lock files
  and the same priority rule, which is how the two repositories coordinate; nothing else is shared.
- The idle declaration (check-list §3.2): only the owner knows difficulty-v3's schedule; the orchestrator writes
  `$env:TEMP\dv3-idle.json` on his statement and deletes it when he says difficulty-v3 is scheduled again. The helper
  uses the short quiet only while the declaration is valid and no Sudoku lock has been seen since it was set; in every
  other case 45 s (fail-closed).
- Counting and pricing: the runner keeps charging `node + min(lockWait, 45)` per invocation, so a 15-s quiet is charged
  as the time waited; a budget decision keeps reserving 45 s (`QUIET_S`), and the price reserves 45 s per invocation
  (fail-closed: whether difficulty-v3 will be idle is not known when a plan is approved; the idle quiet can lower the
  quiet-period component of the spend, never the price). The horizon becomes `min(885, A - 45 - 10)` and a unit's
  ceiling `900 + 45 = 945` s (D-V4-19). Unchanged: the item cut at `horizonS - 15` and the reserves (D-V4-14), the row
  admission (`arm.mjs:175`), the row limits (T11a), four workers per row and one locked invocation at a time.

## Scope

- Create: `tools/ig-proto/lock/ig-lock.ps1` (step 1), `tools/ig-proto/lock/lock-check.ps1` (step 2).
- Change: `tools/ig-proto/run-task.ps1` (step 3; its line 39 is T11c's and stays), `tools/ig-proto/lib/budget.mjs`
  (step 4), `tools/ig-proto/manifest.mjs` (step 5: T11b's constants and their comments only),
  `tools/ig-proto/self-test.mjs` (step 6), `tools/ig-proto/README.md` (step 7); rewritten by `manifest.mjs compile`
  (step 8): `tools/ig-proto/plans/V4-S2.json`, `V4-LIVE.json`, `V4-S4.universe.json` and `V4-S4X.template.json`.
- Do not change: everything else, the twelve item manifests under `tools/ig-proto/plans/items/` (the compile rewrites
  them byte-identical) and the shared helper above. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T11h
  --label frozen` (`files unchanged`); `git status --short -- core generator tests tools/bench tools/ig-proto/variants
  tools/ig-proto/data tools/ig-proto/plans/items tools/ig-proto/plans/V4-T04.parity.json
  tools/ig-proto/plans/V4-T04.replay.json` (no output); `git status --short -- tools/ig-proto/lib` (only
  `lib/budget.mjs`); `Get-FileHash -Algorithm SHA256` of the shared helper equal to the value above at the start and at
  the end; nothing of this task creates `dv3-idle.json`, `dv3-sudoku-seen.txt` or a lock file in the real `$env:TEMP`.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T11h --label frozen`; `Get-FileHash -Algorithm SHA256` of the
   shared helper. Another value than the Authority's is a `QUESTION:` (the copy starts from the recorded text).
1. **The copy** `tools/ig-proto/lock/ig-lock.ps1`: the shared helper's text (CRLF, UTF-8 without BOM, a final newline),
   then exactly these edits:
   a. after its four header comment lines, three more:
      `# Pentomino copy of the shared helper C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1,`,
      `# with the owner's rules of 2026-11-17 21:33 for -Repo pentomino only: a limit up to 900 s and -IdleQuietSeconds`
      and `# (the short quiet while the owner's idle declaration holds, check-list 3.2); lock files, defaults and priority are the shared helper's.`;
   b. the parameter `[int]$IdleQuietSeconds = 0` after `$QuietSeconds` (0: off);
   c. the line `if ($LimitSeconds -gt 300) { throw 'improve-generating runs are limited to 300 s; shard the work' }`
      becomes three lines:
      `if ($LimitSeconds -gt 900) { throw 'a locked invocation is limited to 900 s (owner, 2026-11-17)' }`,
      `if ($LimitSeconds -gt 300 -and $Repo -ne 'pentomino') { throw 'improve-generating runs are limited to 300 s; shard the work' }`
      and `if ($IdleQuietSeconds -lt 0 -or $IdleQuietSeconds -gt $QuietSeconds -or ($IdleQuietSeconds -gt 0 -and $Repo -ne 'pentomino')) { throw '-IdleQuietSeconds is 0 to -QuietSeconds, for -Repo pentomino only' }`;
   d. a function `Test-IgIdle` that returns `$true` only when `$env:TEMP\dv3-idle.json` exists and parses
      (`ConvertFrom-Json -AsHashtable -DateKind String`) with `format` `dv3-idle` and `version` 1, its `setAt` and
      `idleUntil` parse as ISO 8601 times (`[DateTimeOffset]::Parse(<text>, [cultureinfo]::InvariantCulture)`) with
      `setAt <= now < idleUntil` and `idleUntil - setAt <= 24 h`, and `$env:TEMP\dv3-sudoku-seen.txt` is absent or
      holds a time before `setAt`; any other value and any exception return `$false`. Require a top-level object,
      numeric `version: 1`, and string timestamps. Before parsing each timestamp, require the case-sensitive pattern
      `\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})\z`; then use the stated invariant-culture
      parser. This applies to the declaration and any seen timestamp. A shape, type, pattern or parse failure returns
      false (SA-Astra's review of 2026-11-17: the parser alone accepts `11/17/2026 21:00:00`);
   e. At invocation entry initialise `$forceFullQuiet = $false`. At the start of each acquisition attempt, choose
      `$IdleQuietSeconds` only when it is positive, `$forceFullQuiet` is false and `Test-IgIdle` succeeds; otherwise
      choose `$QuietSeconds`. Recheck `Test-IgIdle` on every wait-loop iteration and immediately before acquiring the
      lock. If the short quiet becomes invalid, set `$forceFullQuiet = $true` and `$quiet = $QuietSeconds`; do not
      shorten it again during this invocation. Before acquiring, require both locks to have remained absent
      continuously for the resulting quiet period. Observing either lock restarts that period. Every observation of
      `dv3-sudoku.lock`, including the existing post-acquisition collision check, writes the UTC observation time
      (`[DateTime]::UtcNow.ToString('o')`) to `dv3-sudoku-seen.txt` and forces the full quiet. After acquiring, recheck a
      short-quiet declaration immediately before starting Node; if invalid, release the acquired lock and resume
      acquisition with the full quiet. Preserve the existing exclusive creation, collision check, timeout and cleanup
      (SA-Astra's review of 2026-11-17: a declaration deleted or expired during a wait, or a Sudoku lock seen at the
      collision check, must not leave a short quiet in force);
   f. the printed line ends with ` quiet=$quiet`: `IG <task> exit=<code> seconds=<s> quiet=<q>` (the runner's pattern
      `exit=-?\d+ seconds=(?<s>[0-9.]+)` still matches).
   Report `git diff --no-index` of the shared helper against the copy: these edits and nothing else.
2. **`tools/ig-proto/lock/lock-check.ps1`** (unlocked, about three minutes; it runs alone, after the other gates and with
   nothing else running, because it asserts wall-clock waits with margins of 0.3 to 1 s): each case dot-sources the copy
   in a child `pwsh -NoProfile` whose `$env:TEMP` is a fresh folder `tests\artifacts\ig-proto\selftest\lock\<run>\<case>`
   (`<run>` is `<yyyyMMddTHHmmss>-<PID>` of that run, so that no run deletes another's folders; removed at the end unless
   `-Keep` or a case failed; the real `$env:TEMP` is never read or written), calls `Invoke-IgNode` with `-QuietSeconds 6`
   `-IdleQuietSeconds 2` (the logic of 45 and 15 s at about a seventh of the time), `-LimitSeconds 30` (a node that does not
   exit is then killed by the helper and reported as such) and `-NodeArgs @('-e', '0')` unless the case says otherwise;
   the script prints `lock-check: <case> ok` per case, then `lock-check: <n> cases ok` (exit 0), or the failing case and
   exit 1. A child that times out (150 s) or exits nonzero makes the FAIL line print diagnostics before its tree is
   killed: the last progress marker it wrote (`prelude`, `before-call`, `after-call`, `result`, each with its UTC time,
   in `progress.txt` of its folder), the files of its folder with their sizes and the content of a `dv3-*.lock` file,
   its process tree (PID, name and command line of each descendant, from `Get-CimInstance Win32_Process`), then its
   partial stdout and stderr (awaited at most 5 s after the kill); the folder is kept. `-HarnessCheck` runs one case
   only, `z-harness-timeout` (a child that sleeps 20 s under a 5-s harness timeout), which must fail with those
   diagnostics and leave no process (ruling of 2026-11-17, T11h's report: a first run beside other gates failed with
   `the child did not finish within 150 s` in case (f), a run alone passed).
   Cases: (a) no declaration: `quiet=6`, the call waits at least 6 s; (b) a valid declaration
   (`setAt` a minute ago, `idleUntil` an hour ahead): `quiet=2`, the wait under 6 s; (c) the same with
   `dv3-sudoku-seen.txt` a second after `setAt`: `quiet=6`; (d) an expired declaration, (e) an unparseable one, (f) one
   that spans 25 h and (g) one with another `format`: `quiet=6` each; (h) a valid declaration and a `dv3-sudoku.lock`
   that a thread job creates 1 s into the wait and removes 3 s later: `quiet=6`, the wait restarts after the removal,
   and `dv3-sudoku-seen.txt` holds a time after `setAt`; (i) `-Repo pentomino -LimitSeconds 900` runs, `-LimitSeconds
   901` throws `a locked invocation is limited to 900 s`, `-Repo sudoku -LimitSeconds 301` throws `improve-generating
   runs are limited to 300 s` and `-Repo sudoku -IdleQuietSeconds 2` throws; (j) `-Repo pentomino -LimitSeconds 3`
   with `-NodeArgs @('-e', 'setTimeout(() => {}, 10000)')` throws `3-second limit reached`, no node process it started
   is left and its lock file is removed; (k) a declaration valid initially but expiring one second into the wait; (l) a
   valid declaration deleted by a thread job one second into the wait; (m) otherwise-valid dates expressed as
   `MM/dd/yyyy HH:mm:ss` rather than ISO timestamps. Each must print `quiet=6` and wait at least six seconds. Cases (k)
   and (l) start with a valid short-quiet declaration.
3. **`run-task.ps1`**: the `Invoke-IgNode` call of a locked step (line 120) adds `-LimitSeconds 900 -IdleQuietSeconds
   15`; a killed invocation counts 900 node seconds instead of 300 (line 137 and the comment above it); the invocation
   row adds `quietS`, the `quiet=(?<q>\d+)` of the helper's printed line (`$null` when absent); the counted seconds stay
   `node + min(lockWait, 45)`. Given the shared helper as `-LockHelper`, the first locked step stops on the unknown
   parameter before anything runs, as intended.
4. **`lib/budget.mjs`**: `MAX_HORIZON_S = 885` (the owner's 900-s cap less the 15-s margin) and the comment of `decide`
   (`H = min(885, A - 45 - 10)`); `QUIET_S` stays 45.
5. **`manifest.mjs`**, T11b's pricing: `HORIZON_S = 885`, `KILL_S = 900` (`CEILING_PER_UNIT_S` 945), their comments,
   `horizonOf`'s message (`horizonS must be at most 885`) and the ceiling's JSDoc (`units x 945`); `QUIET_S` stays 45
   and its comment says that the price reserves 45 s per invocation even where the idle quiet is 15 s. Nothing else.
6. **Self-test**: every case whose numbers rest on the 285-s horizon or the 300-s kill keeps testing the schedule it
   tests. T11b's `price:` cases pass `horizonS: 285` explicitly where they rely on the default horizon (among them the
   20 rows of 55 s, the third row of 130 s, the two rows of 300 s at a limit of 260 s, the fifth row of 40 s, the row of
   280 s that fits no invocation, the cut at 270 s, the item past the cut and the one-lane case) and keep their numbers;
   their ceilings become `units x 945` (18,900 for the 20 rows, 1,890 for the two 120-s items, 945 for the 200-s item);
   `price: the inputs are checked` refuses `horizonS: 900` with `horizonS must be at most 885`; T01a's `frozen: round
   cap 0` expects `horizonS` 545 (`min(885, 600 - 45 - 10)`). One new `--items` case, `price: the 900-s cap (owner,
   2026-11-17)`: `stepPrice({ type: 'rows', rows: 20, rowS: 55, rowLimitS: 260 })` at the default horizon gives two
   invocations of 12 and 8 rows, `nodeS` 662 and 442, `projectS` 1,104, `quietS` 90, `countedS` 1,194 and `ceilingS`
   18,900; `simulateProcess({ durationsS: [120, 200], reserveS: 120 })` gives one invocation, `nodeS` 322, `completed`
   2 and `censored` 0. In `compile: bounded steps resume`, replace the final assertion with:

   ```javascript
   same([row.invocations, row.price.rows], [2, 5],
     'the five 260-s-limit rows need two invocations at horizon 885: four rows, then one');
   ```

   The other `compile:` cases remain unchanged. Preserve their `repeatUntilDone`, state and minimum-horizon checks.
   Report every changed assertion (SA-Astra's review of 2026-11-17: the first row step, `rows-fr-base-pilot-26x26-hell-1`
   at 201.5 s a row, runs four rows and then one at horizon 885).
7. **README**: the Commands section (`-LockHelper tools\ig-proto\lock\ig-lock.ps1`), the budget guard (`H = min(885,
   A - 45 - 10)`), the bounds of a locked invocation (900 s), T11b's pricing rules (a horizon of 885 s, the ceiling
   `units x 945`, 45 s reserved/priced per invocation; actual charging remains `node + min(lockWait, 45)`), a section
   "The owner's lock rules (2026-11-17)" (the copy and why the shared helper stays untouched, `-IdleQuietSeconds`, the
   idle declaration and its fail-closed rules as check-list §3.2 states them, `lock-check.ps1`), and every number the
   README gives for the compiled plans (step 8).
8. **Recompile**: `node tools\ig-proto\manifest.mjs compile --label frozen --source-label "frozen 3fc65f4"`: 16 `wrote`
   lines and `compile: 16 files`; on stderr `compile: V4-S2 allocation 560 min, optional 0 min (73 steps)` and
   `compile: V4-LIVE allocation 36 min, optional 0 min (9 steps)`; the twelve item manifests byte-identical to T11c's;
   a second run byte-identical.

## Tests

| Where | Case | Input | Expected |
|---|---|---|---|
| `self-test.mjs --items` | `price: the 900-s cap (owner, 2026-11-17)` | step 6 | step 6 |
| `self-test.mjs --items` and `--frozen` | the changed asserts of step 6 | their inputs, with `horizonS: 285` where step 6 says so | their earlier numbers; the ceilings `units x 945`; `horizonS` 545 |
| `tools/ig-proto/lock/lock-check.ps1` | (a) to (m) | step 2 | step 2 |

## Documentation

`tools/ig-proto/README.md` (step 7).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11h` | root | every case passes, exit 0 | 3 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T11h-frozen` | root | 10 passed | 2 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | 34 `ok` lines, no other line | 2 min |
| `pwsh -NoProfile -File tools\ig-proto\lock\lock-check.ps1`, alone, after the other gates and with nothing else running (ruling of 2026-11-17, T11h's report) | root | `lock-check: 13 cases ok`, exit 0 | 5 min |
| `pwsh -NoProfile -File tools\ig-proto\lock\lock-check.ps1 -HarnessCheck` (the fix round's harness check) | root | `lock-check: FAIL z-harness-timeout: ...` followed by its diagnostic lines; no process of its tree left; exit 1 | 1 min |
| `node tools\ig-proto\manifest.mjs compile --label frozen --source-label "frozen 3fc65f4"`, twice | root | step 8 | 2 min |
| `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-S2 --label frozen --source-label "frozen 3fc65f4"`, then `--plan V4-LIVE` | root | `prerequisites: pass`; then `prerequisites: blocked (variant fr-frozen missing; ...)`, exit 1 | 1 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S2.json -Label frozen -SourceLabel 'frozen 3fc65f4' -ApprovedRoundMinutes 92 -DryRun` (92 is the cap the owner granted, and a run never passes more: check-list §3.2; ruling of 2026-11-17, T11h's report) | root | exit 0; the first locked steps `go` with `horizon 885 s` (three on 2026-11-17), the others `stop` with the budget reason once the forecast passes the granted cap; the last line `[dry run] forecast of the plan: 33,551 s counted (allocation 33,600 s, guard 42,000 s)` (the sum of `projectS + 45 x invocations` of the 44 locked steps is 33,550.5 s) | 2 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-LIVE.json -Label frozen -SourceLabel 'frozen 3fc65f4' -DryRun` | root | exit 0; the last line `[dry run] forecast of the plan: 2,107 s counted (allocation 2,160 s, guard 2,700 s)` (2,107.5 s, so 2,108 is the same) | 1 min |
| `node tools\ig-proto\v4-check.mjs evidence-check --label frozen --receipt docs\improve-generating\evidence\frozen\V4-T04\stage1.json`; `node tools\ig-proto\v4-check.mjs check-binding --label frozen --binding docs\improve-generating\evidence\frozen\V4-T04\accepted-binding.json` | root | `evidence: unchanged (20 files)`; `binding: pass` | 1 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T11h --label frozen`; the other guards of the Scope | root | `files unchanged`; as the Scope says | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Never edit the shared helper; never create a lock file, `dv3-idle.json` or `dv3-sudoku-seen.txt` in the real
  `$env:TEMP`; never run a plan without `-DryRun`; nothing of this task is locked.
- `QUESTION:` when the shared helper's hash differs (step 0), when another harness file holds a 285-s or 300-s rule that
  a plan run reaches, or when a number of steps 6 and 8 or of the dry runs differs.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11h-B01 | The owner's rules hold for pentomino's plan runs: invocations of up to 900 s, the 15-s quiet only under a valid declaration of the owner and 45 s otherwise (fail-closed), timed requests unchanged (one at a time, four workers per row) | `lock-check.ps1` (a) to (m); the runner's call; the dry runs | command output |
| T11h-B02 | The Sudoku side is unchanged: the shared helper's hash is the same before and after, and the copy refuses more than 300 s and the short quiet for `-Repo sudoku` | step 0 and the end; case (i) | command output |
| T11h-B03 | The prices follow the rules and stay fail-closed: `V4-S2` 560 min, `V4-LIVE` 36 min, 45 s reserved/priced per invocation; actual charging remains `node + min(lockWait, 45)`; ceilings `units x 945` | the compile; the dry runs; the new case | command output; self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11h-T01 | The budget and pricing constants; T11b's and T01a's cases keep testing their schedules | `--items`, `--frozen` | self-test output |
| T11h-T02 | The compile rewrites the four plan and template files only; the item manifests are byte-identical | the compile; `git status` | command output |
| T11h-T03 | Nothing else changed; formats; the stage-1 evidence unchanged | the guards; `npm run check`; `evidence-check`, `check-binding` | command output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-17 22:09:30 +07:00 (dispatch, base `d107c56`) to 23:03:26 +07:00 (acceptance): 53 min 56 s; the developer's own times 22:09:23-22:38:22 and, in the fix round, 22:51:32-23:00:20 |
| Waiting for rulings | about 12 min (SA-Opus's review and the lock-check ruling, 22:39-22:50) |
| Agent id, model | `e31dfbb1-63a6-4dee-bf06-f6910f7e2e9e`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 115 calls; 32,489,098 input, 210,387 output, 31,679,621 cache-read |
| AI credits | 729.54 |
| Questions and rulings | none from the developer. SA-Opus ruled (`fee8ff8`): the deviations (case (h) strengthened into h1-h4, extra direct checks, a new price case, README rows, dry runs at the granted 92 minutes plus a read-only `decide` replay at 800), the readings and the named items accepted. After the orchestrator's first `lock-check` run failed (`FAIL f-25-hours: the child did not finish within 150 s` while other gates ran in parallel; a run alone passed), one fix round limited to `lock-check.ps1` and the README (`0e36e62`): a scratch root per run, `LimitSeconds = 30`, progress markers, diagnostics on a timeout or a nonzero exit, `-HarnessCheck`, and the rule that it runs alone after the other gates (T11h 3.5 h, pack 103.5 h). The pack amendments `8b51362` and `d107c56` (the owner's decision of 21:33, reviewed by SA-Astra) preceded the dispatch |
| Fix rounds | 1 (lock-check.ps1 made robust and diagnosable, run alone) |
| Gates re-run by the orchestrator | Shared helper SHA-256 `28F36DF6…07AE` unchanged before and after, no `dv3-*` file in the real `$env:TEMP`; `--items`: 162 passed, 0 failed (23.551 s); `--frozen`: 10 passed; `check-edits --all`: 34 `ok`, no other line; `compile`: 16 files, byte-identical twice, `V4-S2 allocation 560 min`, `V4-LIVE allocation 36 min`; `check-prerequisites --plan V4-S2`: pass; dry runs with `-ApprovedRoundMinutes 92`: `V4-S2` `33,551 s counted (allocation 33,600 s, guard 42,000 s)`, `V4-LIVE` `2,107 s counted (allocation 2,160 s, guard 2,700 s)`, `V4-T10c` unchanged `165 s (240, 300)`; firewall `check` (V4-T11h): 289 production files unchanged; guard empty (lib: only `budget.mjs`); stage-1 `evidence-check`: unchanged (20 files); `check-binding`: pass; `npm run check`: OK. `lock-check.ps1`: first run under parallel load FAIL at case (f) (150-s timeout, before the fix); after the fix, alone and last: `lock-check: 13 cases ok`, exit 0, 124 s; `-HarnessCheck`: the FAIL line with its diagnostics, no process left, exit 1, 8 s. No locked command and no machine time |
| Commit | this task's commit, `improve-generating T11h: The owner's lock rules: the 900-s cap and the idle quiet period in the helper, the runner, the budget and the price` |
| Issues and named items | The root cause of the first `lock-check` stall was not observed; the fixed check can no longer cause it and now prints which stage stalled. Named items: `ConvertFrom-Json -DateKind` needs pwsh 7.5 or later (older pwsh falls back to 45 s); direct-run `--horizon-s` defaults of 285 in the probes are never reached by the runner; older `invocations.jsonl` rows have no `quietS`. The 15-s quiet waits for the owner's statement about difficulty-v3 |
