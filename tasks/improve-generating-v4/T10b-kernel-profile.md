# T10b: Kernel probe: the `fewestColumn` attribution under a reduced-inlining profile

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P7 ("`fewestColumn` buckets only after its share is attributed (a reduced-inlining profile, diagnostic only)"), §5.1 stage 2 ("a diagnostic attribution of `fewestColumn`"); review RV1-05, RV1-16, RV1-17 (R17), RV2-03 (R2-03), RV2-04 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T10a |
| Depends on | T10a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 4 min allocated (guard 300 s) |

## Goal

`fewestColumn` must be attributed before anyone spends work on it. This task adds a reduced-inlining CPU profile of
the canonical ratings of the kernel corpus, run as child processes that the parent bounds, cuts and cleans up before
the lock helper's limit, and runs it once so that stage 2 can price its full run.

## Authority and fixed points

- Plan §3 P7: the profile is diagnostic only; the rating code does not change.
- R05, R17, RV2-04 and R2-03: a profile item is one case; its start line is written before the child is spawned and
  its PID in a separate `item-spawn` line; the child is killed at `horizonS - 15` and awaited before the item ends
  `censored`; no child outlives its locked invocation; the identity holds only the experiment (case, seed, tree,
  flags, output folder), never a remaining time; the item log, identity and resume rules are those of
  `lib/items.mjs` (T04a); the derived `profile.jsonl` is rebuilt from the completed items, never appended.
- The corpus is T10a's: the first carved set of seed `ig-v4/kernel/<caseId>` and its six window subsets.

## Scope

- Change: `tools/ig-proto/lib/items.mjs` (`runProcessItems`, step 1), `tools/ig-proto/kernel-probe.mjs` (subcommands
  `profile` and `profile-child`, `profileItems`, `rebuildProfiles`, the report's profile block, step 2),
  `tools/ig-proto/self-test.mjs` (the `--items` cases of the Tests table), `tools/ig-proto/README.md` (T10a's section).
- Create: `tools/ig-proto/plans/V4-T10b.json` (step 3).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T10b --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib/lanes.mjs tools/ig-proto/lib/lane-worker.mjs`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T10b --label frozen`.
1. **`runProcessItems(o)`** in `lib/items.mjs` (RV2-04), with `o = { task, step, label, horizonS, items, reserveS,
   identity?, command? }` and items whose payload is `{ argv: string[], outDir: string }` (`outDir` a path relative to
   `ROOT`, POSIX separators). `reserveS`, `horizonS` and the cut are the execution envelope, never part of an item or
   its identity (R2-03). In this order:
   1. The identity, `resumePlan` and refusal of `runItems` (T04a step 1, steps 1 and 2): the log is read and validated
      before any output folder is touched; a refusal writes nothing and returns `exitCode` 3.
   2. Output folders: for every pending item (by `resumePlan`, an item without any log line: a started item without
      an end was refused), `abs(outDir)` must be absent or an empty folder, else refuse with `unexpected output in
      <outDir> for unstarted item <id>` (exit 3, nothing written, the folder kept); then each is created
      (`mkdirSync(..., { recursive: true })`). A completed or interrupted item's folder is never emptied or written.
   3. Items run one at a time in order; an item is admitted while `elapsedS() + reserveS <= horizonS - 15`, else the
      run stops.
   4. Per item: `logStart(logPath, hash, item)` **before** `spawn` (durable intent); then `child = spawn(o.command ??
      process.execPath, argv, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })`; on the child's `'spawn'` event
      `logSpawn(logPath, hash, item.id, child.pid)`; stdout and stderr are collected as chunks; a timer at `horizonS -
      15` (seconds from the process start) calls `child.kill()` and marks the item cut. The item ends exactly once
      (a guard flag), with `logEnd`: an `'error'` event before `'spawn'` (the child never started) ends it `error`
      with `{ code: null, error: <message> }` at once; an `'error'` after `'spawn'` is kept as `result.error` and the
      end waits for `'close'`; at `'close'` (every stdio stream has ended): a cut item ends `censored`; exit code 0
      ends `completed` with `result: { stdout: <the last non-empty stdout line parsed as JSON, or null> }`; another
      code ends `error` with `{ code, stderr: <the last 2,000 characters> }`.
   5. A `finally` kills every child still running and awaits its `'close'`. A crash of the parent leaves a start line
      without an end: the next invocation refuses it (`interrupted item <id> needs a ruling`).
   State and return value as `runItems` (T04a step 1, step 4). Export it.
2. **`kernel-probe.mjs`**:
   - `export function profileItems(caseIds, { task, sourceLabel })`: one item per case, id
     `profile:instr:<caseId>:ig-v4/kernel/<caseId>`, kind `process`, variant `instr`, payload `{ outDir:
     rel(join(artifactDir('frozen', task, 'profile'), 'out', caseId)), argv: ['--cpu-prof', '--cpu-prof-dir',
     <outDir>, '--no-turbo-inlining', 'tools/ig-proto/kernel-probe.mjs', 'profile-child', '--case', caseId, '--task',
     task, '--label', 'frozen', '--source-label', sourceLabel] }`. No argument depends on the invocation (no horizon:
     the parent owns the cut, R2-03).
   - `profile --task <T> --label frozen --source-label <SL> [--cases <ids>] [--horizon-s <H>]`: `parseCases` (T10a);
     `runProcessItems` with `profileItems(...)` and `reserveS: 120`; then `rebuildProfiles(T)`.
   - `profile-child --case <id> --task <T> --label frozen --source-label <SL>` (`--case` required, an unknown id exits
     1): in the `instr` tree, rates the case's six subsets (T10a's corpus) with `e.difficulty.rate` (an
     `IncompleteRatingError` counts as a rating), then prints one JSON line `{ caseId, ratings, ms }` and exits 0.
   - `export function rebuildProfiles(task)` (R2-03): reads the item log of step `profile`; for each item in
     manifest order whose `item-end` is `completed`, the `*.cpuprofile` files of its `outDir`: exactly one gives the
     record `{ item, caseId, file: <rel path>, sha256: <of the file>, totalMs, deduceMs, fewestColumnMs, share:
     fewestColumnMs / deduceMs }` (a node's self time is the sum of `timeDeltas[i]` in µs over the samples `i` with
     `samples[i]` equal to the node's `id`, divided by 1,000; `fewestColumnMs` sums the nodes whose
     `callFrame.functionName` is `fewestColumn`, `deduceMs` those whose `callFrame.url` ends with
     `core/engine/deduce.js`, `totalMs` all nodes); none or several give `{ item, caseId, error: 'profile files: <n>'
     }`. It writes `artifactDir('frozen', task, 'profile', 'profile.jsonl')` whole (one line per such item, each ending
     with `\n`), never appending, so that a second call writes the same bytes.
   - `report` gains the profile block: per case the record, the note "reduced-inlining profile, diagnostic only (plan
     P7)", and `profile: complete`, or `profile: incomplete (<cases>)` when an item is missing, censored, an error or
     an evidence error. `report --task <T>` writes only the blocks whose step folder exists under
     `artifactDir('frozen', T)` (`counters` for V4-T10a, `profile` for V4-T10b).
3. **Plan** `plans/V4-T10b.json`: `"allocationMinutes": 4`, `"optionalMinutes": 0`; steps `firewall-snapshot`
   (unlocked), `trees` (`tools\ig-proto\lib\tree.mjs build instr`, unlocked), `profile` (locked, `repeatUntilDone`
   true, `projectS` 150, `minHorizonS` 150, `invocations` 1, node `tools\ig-proto\kernel-probe.mjs profile --task
   V4-T10b`, state `V4-T10b\profile\state.json`), `report` (unlocked, `tools\ig-proto\kernel-probe.mjs report --task
   V4-T10b`), `firewall-check` (unlocked). Forecast 150 + 45 = 195 s within 240 s.
4. **Self-test** cases (Tests table), unlocked: they start only `node -e` children that do no rating, and write only
   under `tests/artifacts/ig-proto/selftest/`.
5. **README.md**: T10a's section gains the profile, its flag, the process items (durable start, `item-spawn`, one
   end, cleanup), the output-folder rule and the rebuilt `profile.jsonl`.
6. Run, after the unlocked checks pass, in one PowerShell session at the root:

   ```powershell
   $lock = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T10b.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <approved>
   if ($LASTEXITCODE -ne 0) { throw ('STOP: V4-T10b run-task exited ' + $LASTEXITCODE) }
   ```

## Tests

All in `tools/ig-proto/self-test.mjs --items`, with `label: 'selftest'`, a fresh task folder per case and the
identity override of T04a's cases; the item helpers come from `lib/items.mjs` (T04a), not from copies.

| Case name | Input | Expected |
|---|---|---|
| `process items: completion and error` | items `p1` with `argv: ['-e', "process.stdout.write(JSON.stringify({ ok: 1 }))"]` and `p2` with `argv: ['-e', 'process.exit(3)']` (each with its own empty `outDir`), `reserveS` 1, `horizonS` 285 | `p1` ends `completed` with `result.stdout` `{ ok: 1 }`; `p2` ends `error` with code 3; for each item the log has, in order, `item-start`, `item-spawn` (a numeric `pid`) and `item-end`, all with the run's `identityHash` |
| `process items: log before spawn, spawn error without exit` | item `p1` with `command` set to `<the self-test folder>/no-such-node.exe` | `p1` ends `error` with `code` null and the spawn error's message; the log has `item-start` then `item-end` and no `item-spawn`; exactly one end line |
| `process items: trailing stdout after exit` | item `p1` with `argv: ['-e', "process.stdout.write('x'.repeat(1 << 20) + '\\n' + JSON.stringify({ ok: 2 }))"]` | `p1` ends `completed` with `result.stdout` `{ ok: 2 }` (parsed at `'close'`) |
| `process items: cut and cleanup` | item `p1` with `argv: ['-e', 'setTimeout(() => {}, 600000)']`, `reserveS` 0, `horizonS = elapsedS() + 17` | the call returns within 10 s; `p1` ends `censored`; `process.kill(pid, 0)` then throws (the child has exited) |
| `process items: a started item is never rerun` | a log with the `item-start` line of `p1` (with the identity's hash) and no end | `exitCode` 3, `interrupted item p1 needs a ruling`; no child is started; the log is unchanged |
| `process items: an unstarted item with output is refused` | item `p2` without log lines whose `outDir` holds a file `old.txt` | `exitCode` 3, `unexpected output in <outDir> for unstarted item p2`; `old.txt` still there; no child is started |
| `process items: resume and verification` | a log where `p1` has start, spawn and a `completed` end (written with the line helpers and the identity), and `p2` has no line; then a second invocation | first: only `p2` runs (one new start, spawn and end); second: no child, `progress` 1 (`verified`), the log byte-equal to the one after the first |
| `profile: identity without the horizon` | `manifestHash(profileItems(['14x14-nightmare'], { task: 'V4-T10b', sourceLabel: 'frozen 3fc65f4' }))` computed twice, before and after `elapsedS()` has advanced | equal hashes; no `argv` element contains `horizon` |
| `profile: the derived records are rebuilt` | a self-test step folder with two `completed` items, each `outDir` with one minimal `.cpuprofile` (`{ nodes: [{ id: 1, callFrame: { functionName: 'fewestColumn', url: 'file:///x/core/engine/deduce.js' } }], samples: [1, 1], timeDeltas: [1000, 3000] }`), and a third `completed` item with two files; `rebuildProfiles` called twice | two records with `fewestColumnMs` 4, `deduceMs` 4, `share` 1 and the files' SHA-256, and `{ item: <third>, error: 'profile files: 2' }`; three lines both times, byte-equal |
## Documentation

`tools/ig-proto/README.md` (step 5).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T10b` | root | every `--items` case passes | 3 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T10b.json -Label frozen -SourceLabel 'frozen 3fc65f4' -ApprovedRoundMinutes <approved> -DryRun` | root | the locked step `go`; forecast 195 s, allocation 240 s, guard 300 s | 1 min |
| step 6 | root | `profile: complete`; `Plan V4-T10b finished: task counted <= 300 s` | each invocation at most 285 s |
| `node tools\ig-proto\firewall.mjs check --task V4-T10b --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: step 6 if the dry run says `stop`.
- Stop and report after: `profile: incomplete` (a diagnosis gate: the cut cases and their item lines).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T10b-B01 | `fewestColumn`'s share is attributed with reduced inlining before any work on it | `kernel.md` profile block | `evidence/frozen/V4-T10b/kernel.md` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T10b-T01 | A profile child is logged before it is spawned, ends once, is bounded, cut, awaited and never rerun; an unstarted item never overwrites output | the seven `process items` cases | self-test output |
| T10b-T02 | The profile identity holds no invocation value; the derived records are rebuilt, one per completed item, byte-equal on a second call | the two `profile` cases | self-test output |
| T10b-T03 | Nothing else changed; formats | guards; `npm run check` | command output |

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
