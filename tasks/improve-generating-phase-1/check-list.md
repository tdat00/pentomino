# Improve generating, phase 1: task pack

| Item | Value |
|---|---|
| Feature | `improve-generating-phase-1` |
| Plan | `docs/improve-generating-phase-1/plan.md`, Final, committed at `eca0f94`; joint `report.md` |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, `eca0f94717a56de43c52f6cb54d739360670fef8` |
| Pack author / reviewer | SA-Astra / SA-Opus |
| Executors | SA-Astra for adoption; Dev-Sonnet (`claude-sonnet-5.5`) for the test/specification edit and readiness/PR drafts; the orchestrator for locked gates, qualification, bookkeeping, commits and publication; both SAs approve adoption and readiness |
| Status | Accepted (2026-11-25): SA-Opus's review 2 conditions R2-1 to R2-4 applied and verified by the orchestrator |

Each task stays within the plan's sizing. Qualification (P1-03b) and publication (P1-05) are literal
PowerShell sequences, not new programs. P1-03a was withdrawn at review (R1-1); the ID P1-03b is retained for
the plan's P1-03. P1-01 retargets the existing audit. Its executor is SA-Astra, as plan §8 assigns.
Dev-Sonnet mechanically drafts P1-04; both SAs still decide and approve its reading.

## 1. Index and estimates

- [x] P1-01 Source-bound adoption (depends on final plan and accepted task pack)
- [x] P1-02 Width-8 fold simulation and test-table sentence (depends on P1-01)
- [x] P1-03b Current qualification (depends on P1-02)
- [ ] P1-04 Readiness note and detailed PR description (depends on P1-03b)
- [ ] P1-05 Publish phase 1 and update PR #11, never merge (depends on P1-04)

| ID | File | SA h | Developer h | Orchestrator h | Machine scope |
|---|---|---:|---:|---:|---|
| P1-01 | `P1-01-source-bound-adoption.md` | 1 | 0 | - | Unlocked reads/arithmetic; 0 measured minutes |
| P1-02 | `P1-02-fold-width-eight.md` | - | 0.5 | 0.1 | One locked focused test; about 1 min node+quiet, ceiling 345 s |
| P1-03b | `P1-03b-current-qualification.md` | - | 0 | 0.5 | Four locked invocations; about 7.4 min before the extra width, ceiling 1,380 s |
| P1-04 | `P1-04-readiness-and-pr-description.md` | review | 1 | - | Unlocked documents/records; 0 measured minutes |
| P1-05 | `P1-05-publish-phase-one.md` | - | 0 | 0.3 | Git/GitHub I/O only; 0 measured minutes |

Totals: **1.5 developer hours**, **1 SA hour plus the joint reviews**, and **0.9 orchestrator hours**.
Lock contention is additional wall time, not an engine allowance. Execute serially, one task per commit.

## 2. Traceability

| Plan section / decision / criterion | Task or named destination |
|---|---|
| §§1-2, unchanged production scope; D-P1-05 | All tasks; G-PROTECTED and G-WORKTREE |
| §§3, 4.1-4.4; D-P1-03; P1-B01; P1-T01, P1-T07 | P1-01 (executor per plan §8); P1-03b rechecks existing P6/fixture contracts |
| §4.2 history; P1-B02 | P1-03b full suites; P1-04's accurate explanation; no new runtime change |
| §4.3 identities, replay, locales; P1-T04, P1-T06 | P1-01 bindings, P1-03b fixture/full checks, all scope guards |
| §4.5; D-P1-04; P1-T02, P1-T03 | P1-02, P1-03b |
| §4.6; D-P1-05 | P1-02, P1-03b |
| P1-T04 / P1-T05 / P1-T06 | P1-03b |
| P1-T08 / P1-T09 | P1-03b; every task's convention/format/scope checks |
| §4.7; P1-B03, P1-B04; P1-T10; D-P1-06/D-P1-07 | P1-04, P1-05 |
| §4.7, D-P1-08, no phase-2 commit on `improve-generating` | P1-05 fork in PR footer/final report; phase-2 request later on `gen-v4` |
| Superseded D-P1-01/D-P1-02 | Retain in register only; active route D-P1-07/D-P1-08 |
| §§7-8 risks, fail-closed method, verification cost | Shared rules, P1-03b, stop points in every task |
| §9 N-P1-DOC | P1-04 disclosure, P1-05 publication; later task fixes both guides before any merge |
| §9 other named items, phase 2 and later work | §5 below; no implementation here |

## 3. Shared rules

### 3.1 Authority, scope and commits

- Read `AGENTS.md`, this file, the assigned task and the files it names. This authorized new task pack and
  its new close-out evidence are the exception to the repository's historical-documents rule. Existing
  plans, observations, independent analyses and review evidence are immutable.
- `E` in prose means `docs/improve-generating-phase-1/evidence/`; commands start at `Q:\git\pentomino`.
  Git/JSON path identifiers use `/`; Windows filesystem commands use `\`.
- Write CRLF, UTF-8 without BOM, no trailing whitespace, final newline. `npm run check` does not read
  `docs/` or `tasks/`; new/changed files there also pass G-FORMAT (§3.3), including logs and bookkeeping.
- The developer never edits `tasks/`, commits, pushes or edits a PR. The orchestrator fills execution logs,
  verifies every AC and commits one accepted task at a time. SA-Astra writes only the adoption evidence in
  P1-01, not production/test code. Both SAs approve adoption and readiness.
- Commit message: `improve-generating-phase-1 <ID>: <title>`. Include:

  ```text
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  Copilot-Session: 7e6bf34f-be87-427e-9bec-bb2d049b46cc
  ```

- Stage only the assigned paths and the orchestrator's task/check-list bookkeeping; never `git add -A`.
  Do not overwrite or remove another person's dirty/untracked work. Unexpected paths cause `QUESTION:`.
- No production, fixture, version, locale, pool-admission or guide edits. No package install/download,
  engine benchmark, browser-page run, release, merge, force-push, rebase or deployment-workflow dispatch.
  Only P1-05 pushes and edits PR #11. No phase-2 commit on `improve-generating`.
- Record unobservable agent usage as `unavailable`, with its reason; never invent tokens or AI credits.
  A failing/missing gate is a stop, not permission to change its expected count or inputs.

### 3.2 Locked runs and shared log check

Exactly five engine/test invocations are planned: the focused P1-02 run and P1-03b's full Node 26,
generation fixture, replay fixture and full Node 22 runs. Each uses `Invoke-IgNode -Repo pentomino
-LimitSeconds 300 -QuietSeconds 45` from `tools\ig-proto\lock\ig-lock.ps1`. There is no idle declaration.
Do not use `-AllowExit1`, run a redundant quick suite, start a second copy, or auto-retry a failure.
Use a sufficiently long tool wait; if still running, read the same session.

The four earlier invocations used 266.029 node seconds plus 180 quiet seconds. Plan roughly 8-10 minutes
node+quiet for all five, ceiling **1,725 s** (5 × (300 + 45)), excluding lock waits. This is verification,
charged to neither closed measurement grant; it grants no new timed study.

P1-01's reader is unlocked work: stored files, hashes, read-only Git and pure report arithmetic only.
It runs no test runner, generation, solver, rating, replay, worker, benchmark or browser.

Paste this **shared log-check block** first in the session for P1-02's focused run and P1-03b. P1-05
needs its first three lines. PowerShell variables and location do not survive a fresh tool session.
The `.NET` directory assignment is required: `Set-Location` alone leaves it at `Q:\git`.
Normalization changes only ANSI SGR codes, trailing whitespace and line endings, never messages/values.

```powershell
Set-Location Q:\git\pentomino
[Environment]::CurrentDirectory = (Get-Location).Path
$ErrorActionPreference = 'Stop'
$utf8 = [Text.UTF8Encoding]::new($false)
function ConvertTo-CrlfLog([string]$Dir) {
  foreach ($f in Get-ChildItem -LiteralPath $Dir -File -Filter '*.log') {
    $t = [IO.File]::ReadAllText($f.FullName) -replace '\x1b\[[0-9;]*m', ''
    [IO.File]::WriteAllText($f.FullName, ((($t -split '\r?\n' | ForEach-Object { $_.TrimEnd() }) -join "`r`n").TrimEnd() + "`r`n"), $utf8)
  }
}
$Fold = @(
  '^\s*ok \d+ - pool sizes 1-4 and 8 with shuffled completion orders agree on fixture-set-0$',
  '^\s*ok \d+ - pool sizes 1-4 and 8 with shuffled completion orders agree on fixture-set-1 \(slow\)$'
)
function Test-GateLog([string]$Log, [string]$Helper, [string]$Task, [int]$Major, [string[]]$Exact, [string[]]$Patterns) {
  $lines = @(Get-Content -LiteralPath $Log)
  if ($lines.Count -eq 0 -or $lines[0] -notmatch "^p1-run: .+ v$Major\.\d+\.\d+; node ") { throw "QUESTION: $Log did not run on Node $Major" }
  foreach ($x in $Exact) { if (@($lines | Where-Object { $_ -ceq $x }).Count -ne 1) { throw "QUESTION: $Log lacks exactly one '$x'" } }
  foreach ($p in $Patterns) { if (@($lines | Where-Object { $_ -cmatch $p }).Count -ne 1) { throw "QUESTION: $Log lacks exactly one match of $p" } }
  $h = @(Get-Content -LiteralPath $Helper | Where-Object { $_ -cmatch "^IG $([regex]::Escape($Task)) " })
  if ($h.Count -ne 1 -or $h[0] -cnotmatch "^IG $([regex]::Escape($Task)) exit=0 seconds=\d+(\.\d+)? quiet=45$") { throw "QUESTION: $Helper lacks exactly one valid 'IG $Task exit=0 ... quiet=45' line" }
  $s = [double]::Parse([regex]::Match($h[0], 'seconds=([0-9.]+)').Groups[1].Value, [Globalization.CultureInfo]::InvariantCulture)
  if ($s -gt 300) { throw "QUESTION: $Task took $s s" }
  return $s
}
```

### 3.3 Guards

Run from the root, with `$ErrorActionPreference = 'Stop'`. Every native command's exit must be checked; PowerShell's error preference alone does not make a nonzero native exit fail. Each tool command is a fresh process. Put a guard in the same command as the `$Allowed`, `$FormatFiles` or other variables it reads, after them, and re-paste those definitions in every command that runs the guard.

**G-PROTECTED.** No plan-base file changes except the test/spec pair. New committed paths stay within
this feature's docs/tasks. `--no-renames` makes a moved protected file appear as a forbidden deletion.

```powershell
git --no-pager diff --exit-code --stat --no-renames --diff-filter=MDTUXB eca0f94 -- . ':(exclude)tests/generate.test.js' ':(exclude)docs/design-detail.md'
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-PROTECTED: a protected base file changed' }
$paths = @(git --no-pager diff --name-only --no-renames eca0f94 -- .)
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-PROTECTED: diff failed' }
$outside = @($paths | Where-Object { $_ -notmatch '^(docs|tasks)/improve-generating-phase-1/' -and $_ -cne 'tests/generate.test.js' -and $_ -cne 'docs/design-detail.md' })
if ($outside.Count) { throw "QUESTION: G-PROTECTED: out-of-scope paths $($outside -join ', ')" }
'G-PROTECTED: OK'
```

**G-WORKTREE.** Each task defines `$Allowed` (Git-style exact paths, including its bookkeeping). Run
after defining that list. Untracked files are not ignored; ignored owned artifacts are handled separately.

```powershell
$wt = @(git --no-pager -c core.quotepath=false status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-WORKTREE: status failed' }
foreach ($line in $wt) {
  if ($line.Substring(0, 2) -match '[DRU]' -or $Allowed -cnotcontains $line.Substring(3)) { throw "QUESTION: G-WORKTREE: $line" }
}
'G-WORKTREE: OK'
```

**G-STAGE.** After P1-02, Git proves that only its two test lines and one specification line changed.
This intentionally fails on the unedited plan-base tree; P1-01/P1-02 preflight instead require an empty diff.

```powershell
$numstat = @(git --no-pager diff --numstat eca0f94 -- tests docs\design-detail.md)
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-STAGE: numstat failed' }
if (($numstat -join '|') -cne "1`t1`tdocs/design-detail.md|2`t2`ttests/generate.test.js") { throw "QUESTION: G-STAGE: $($numstat -join '; ')" }
function Get-Hits([string]$Path, [string]$Text) { @(Select-String -LiteralPath $Path -SimpleMatch -CaseSensitive -Pattern $Text | ForEach-Object LineNumber) -join ',' }
$gstage = @(
  @('tests\generate.test.js', 'pool sizes 1-4 and 8 with shuffled completion orders agree on ${seedText}${tag}', '808'),
  @('tests\generate.test.js', 'pool sizes 1-4 and shuffled completion orders', ''),
  @('tests\generate.test.js', 'for (const width of [1, 2, 3, 4, 8]) {', '821'),
  @('tests\generate.test.js', 'for (const width of [1, 2, 3, 4]) {', '420'),
  @('docs\design-detail.md', 'Fold determinism: identical output for simulated pool widths 1, 2, 3, 4 and 8 and three shuffled completion orders, against the serial fold. Width 8 is a test-only simulation; the production pool remains limited to four.', '3076'),
  @('docs\design-detail.md', 'pool sizes 1 and 4 and shuffled completion orders (simulated)', '')
)
foreach ($w in $gstage) {
  $h = Get-Hits $w[0] $w[1]
  if ($h -cne $w[2]) { throw "QUESTION: G-STAGE: '$($w[1])' at lines [$h] of $($w[0]), expected [$($w[2])]" }
}
'G-STAGE: OK'
```

**G-QUALIFIED.** After P1-03b's commit, Git checks the tested tree and the sealed evidence. Raw SHA-256
checks retain the byte bindings of logs, which Git's CRLF normalization alone does not prove.

```powershell
$Tested = @('core', 'generator', 'player', 'assets', 'index.html', 'redirect.js', 'sitemap.xml', 'tests', 'tools', 'package.json', '.github')
$index = Get-Content -Raw -LiteralPath docs\improve-generating-phase-1\evidence\verification\index.json | ConvertFrom-Json
$Q = $index.qualifiedCommit
if ($index.format -cne 'pentomino-phase1-qualification' -or $index.version -ne 1 -or $index.status -cne 'pass' -or $Q -cnotmatch '^[0-9a-f]{40}$' -or
  ($index.testedPaths -join '|') -cne ($Tested -join '|')) { throw 'QUESTION: G-QUALIFIED: invalid qualification index' }
$S = @(git --no-pager log --diff-filter=A --format=%H -- docs\improve-generating-phase-1\evidence\verification\index.json)
if ($LASTEXITCODE -ne 0 -or $S.Count -ne 1) { throw 'QUESTION: G-QUALIFIED: the qualification record was not added exactly once' }
git --no-pager merge-base --is-ancestor $Q HEAD
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-QUALIFIED: the qualified commit is not an ancestor of HEAD' }
git --no-pager diff --exit-code --stat $Q -- $Tested
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-QUALIFIED: tested files changed since the qualified commit' }
$dirty = @(git --no-pager status --porcelain --untracked-files=all -- $Tested)
if ($LASTEXITCODE -ne 0 -or $dirty.Count) { throw 'QUESTION: G-QUALIFIED: status failed or tested paths are dirty/untracked' }
git --no-pager diff --exit-code --stat $S[0] -- docs\improve-generating-phase-1\evidence\verification docs\improve-generating-phase-1\evidence\fold-width8 docs\improve-generating-phase-1\evidence\adoption.json docs\improve-generating-phase-1\evidence\adoption.md docs\improve-generating-phase-1\evidence\adoption-reader.mjs
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-QUALIFIED: sealed evidence changed after the qualification commit' }
foreach ($f in @($index.evidence) + @($index.focused.files)) {
  $actual = (Get-FileHash -LiteralPath ($f.path.Replace('/', '\')) -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -cne $f.sha256) { throw "QUESTION: G-QUALIFIED: raw bytes changed: $($f.path)" }
}
'G-QUALIFIED: OK'
```

**G-FORMAT.** Set `$FormatFiles` to every new/changed text file in the task (plus bookkeeping the
orchestrator edits), then run this block. It uses repository `checkText`, additionally requiring CRLF and
forbidding even Markdown two-space hard breaks. Missing files throw; no format claim rests on `npm` alone.

```powershell
if (@($FormatFiles).Count -eq 0) { throw 'QUESTION: G-FORMAT: no files supplied' }
node --input-type=module -e "import { readFileSync } from 'node:fs'; import { checkText } from './tools/check-conventions.mjs'; let bad = 0; for (const f of process.argv.slice(1)) { const b = readFileSync(f); const t = b.toString('utf8'); const p = checkText(f, b); if (b.includes(10) && !t.includes('\r\n')) p.push(f + ': LF line endings, not CRLF'); t.replace(/\r\n/g, '\n').split('\n').forEach((l, i) => { const m = f + ':' + (i + 1) + ': trailing whitespace'; if (/[ \t]+$/.test(l) && !p.includes(m)) p.push(m); }); for (const x of p) { console.error(x); bad += 1; } } console.log(bad ? 'format: ' + bad + ' problem(s)' : 'format: OK (' + (process.argv.length - 1) + ' files)'); process.exitCode = bad ? 1 : 0;" @FormatFiles
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-FORMAT failed' }
```

Expected: `format: OK (<n> files)`, exit 0. Ordinary guards take at most one minute, the format check
30 seconds. No guard invokes the engine or the test runner.

The fixed-base scripts under `E/sa-astra/` and `E/sa-opus/` are historical evidence. Do not edit them or
rerun them to replace observations. Two execution uses are authorized: P1-01 copies
`E/sa-astra/phase1-audit.mjs`, and P1-02/P1-03b execute `E/sa-opus/p1-run.mjs`, the existing log runner.
The review's `p1-01-edit-proto.mjs` is read for its literal edit list only, never executed; it and review
validation evidence are new task-pack support inputs, not files claimed to exist at the plan base.

### 3.4 Evidence and the publication boundary

- Bind raw bytes of observed logs/reports and normalized LF source text, with the normalization stated.
  Adoption retains both input hashes and read-only Git commands; no input is silently dropped.
- T14 data stays historical: 70 rows, 35 equal pairs, 14 memory side-cells, 2,244.925 of 2,700 counted
  seconds. T1 is set validation/calibration, not first playable card; T10 is conditional on reaching ten.
  Preserve the 10x10 4/5 ten and equal 9/9 pair. No new timing, browser, universal or ±5% claim.
- Qualification records its code/test commit, tested Git blob identities and raw log hashes. After
  documentation-only commits keep tested files unchanged (G-QUALIFIED), check static/docs changes, and
  do not endlessly rerun the suites merely to commit their output.
- Attempts are fresh and immutable after their checks. A failed attempt is retained and cannot be called
  a successful qualification. A retry or changed folder requires a ruling and explicit cost accounting.
- P1-05 makes one bookkeeping commit, one fast-forward push and one description edit. The pushed commit
  is the published head and phase-2 fork. Its full SHA goes into PR #11's footer (outside Git), the final
  report and later phase 2's `request.md` on `gen-v4`. No committed file names its own commit SHA; no
  second commit/push records it. Pre-push bookkeeping says publication is pending; the final outcome is
  attested by the verified PR footer and final report, not a preclaimed success in that commit.

## 4. Decisions register

Copied from plan §5. In rows saying "this plan's commit pending", that historical label now resolves to
`eca0f94717a56de43c52f6cb54d739360670fef8`; the plan itself is not rewritten.

| ID | Decision | Decided by | Date | Source commit / record |
|---|---|---|---|---|
| D-P1-01 | **Superseded in its one-PR clause by D-P1-07.** The 07:00 instruction initially combined the phases in one unmerged PR. Its no-merge restriction remains in force for both PRs. | Owner | 2026-11-25 | `a90c2d0`; request, Discord 1574937911546085528; superseded by `c63c553` |
| D-P1-02 | **Superseded by D-P1-07/D-P1-08.** The earlier draft routed both phases through PR #11. It is not the active publication route. | Joint SAs' earlier draft routing | 2026-11-25 | `a90c2d0`; both cross-reviews; replaced under `c63c553` |
| D-P1-03 | Adopt T12-T14 with explicit source/report/fixture bindings. The corpus argument uses all nine unchanged deduction dependency files plus P6 tests; the 713-item P7 report is context only. No new P6 bench or mandatory browser-page run. Closes Q-P1-A1 and merged Q-P1-3. | Joint SAs under the owner's supervisor delegation | 2026-11-25 | `fb893c3`, `373e74a`, `826ce79`; request/delegation at `a90c2d0`; both cross-reviews; this plan's commit pending |
| D-P1-04 | Select Q-P1-A2(a): width 8 in the existing fold simulation, both seeds and three orders; production/client pool limit stays four. No `runRecipe(8)` or P8 admission. | Joint SAs under the owner's supervisor delegation | 2026-11-25 | `006ca68` test/pool source; both cross-reviews; this plan's commit pending |
| D-P1-05 | Preserve P6, history, UI, versions, fixtures and matched `gen-v3` replay. Qualification is fail-closed on Node 26/22 with the two fixture checks, conventions and static site. | Joint SAs within plan v4 | 2026-11-25 | Plan v4; T12/T13; `006ca68` workflow/tests; this plan's commit pending |
| D-P1-06 | Preserve the phase-0 FAIL and D-S24-35. Phase 2 follows the phase-1 close-out under D-P1-07; its changed runtime needs its own validation. Phase-1 adoption qualifies only its checkpoint. | Owner for phase-2 scope; SAs for evidence separation | 2026-11-25 | T16 `ec8ec0c`, owner register `ca46067`, current follow-up `c63c553` |
| D-P1-07 | **Current owner route:** two separate PRs. Finish phase 1, push `improve-generating` and update current PR #11 into `main` with the details of the changes. Then phase 2 uses `gen-v4`, branched from the phase-1 close-out, and a new PR into `main`. Neither PR is merged; no release/tag/deployment now. Answers Q-P1-1b. | Owner | 2026-11-25, 07:46 +07:00 | `c63c553`; request, second CLI follow-up and the owner's branch/base choices |
| D-P1-08 | Record the published phase-1 head before phase 2 starts. Branch origin is that close-out; phase-2 PR base is `main`. Disclose the inherited, unmerged phase-1 prefix rather than retargeting or claiming a disjoint main-based diff. P1-05 is phase 1's last task; phase 2 is a separate analyze feature on its new branch. | Joint SAs, operational execution of the owner's route | 2026-11-25 | `c63c553`; this plan's commit pending |

R1-1 to R1-11 simplify execution without changing these decisions; see `review-1.md` and
`review-1-response.md`. No owner question is reopened.

## 5. Named items and hand-over

| ID | Description / state | Numbers or limit | Routed to |
|---|---|---|---|
| Phase-1 completion | Not claimed complete until P1-01 through P1-05 are verified | Five locked invocations, 1,725 s node+quiet ceiling | This pack |
| N-V4-07 | Phase 2 continues only after PR #11's update; new `gen-v4` branch from the published fork, new PR into `main`, never merge | No phase-2 commit on `improve-generating` | Separate phase-2 analyze feature |
| D-S24-35 / N-V4-15 | Preserve the phase-0 FAIL and the owner's later legacy route on 26x26 Nightmare; phase 2 needs `require`, replay and production gates | `Phase 0: FAIL (control 26x26-nightmare: fail)` | Phase-2 plan, not this qualification |
| N-V4-05 | Closed: no P7 composite to adopt | Spike no-go | Retain record |
| N-V4-12 | Closed by T14; adopt only for this identical-source phase-1 checkpoint | 14/14 memory side-cells pass both checks | P1-01; no blanket future qualification |
| N-V4-20 | Closed by stages-2-4 T01b; strengthened guard remains | No reopening | Preserve code/evidence |
| N-P1-DOC | Both developer guides still omit `tools/ig-proto/`; visible before any merge | EN and VI; non-blocking for unmerged close-out | Disclose P1-04/P1-05; fix on branch to be merged in a later task |
| N-V4-08/N-V4-09/N-V4-10 | Offers and service level, as already routed | No changed offer/service promise here | Later owner-approved work |
| N-V4-11/N-V4-14 | Optional later work, no new scope | Existing decisions stand | Later plan |
| Eventual merge/release | Not authorized, even when phase 2 is done | Neither PR merged; no release/tag/deployment | Explicit later owner instruction |

## 6. Execution summary (orchestrator)

| ID | Start | End | Duration | AI credits | Commit |
|---|---|---|---|---|---|
| P1-01 | 2026-11-25 11:08 | 2026-11-25 11:29 | about 21 min | 428.24 | this task's commit |
| P1-02 | 2026-11-25 11:31 | 2026-11-25 11:40 | about 9 min | 21.67 | this task's commit |
| P1-03b | 2026-11-25 11:29 | 2026-11-25 11:40 | about 11 min | - (orchestrator) | this task's commit |
| P1-04 | | | | | |
| P1-05 | | | | | |

P1-05's one bookkeeping commit precedes its push. At that commit, its index entry stays pending and its
row refers End/Duration/AI credits to the final report. Once verified, that report and the PR footer carry
the final result/fork. Do not make a second commit just to mark the local checklist or insert its own SHA.

## 7. Pack review

- SA-Astra: R1-1 to R1-11 applied; revised pack ready for SA-Opus's review.
- SA-Opus: **accepted**, on the condition that R2-1 to R2-4 are applied verbatim. The orchestrator records the sign-off in check-list §7 once a diff shows the four edits. Any other change to the pack needs a new review.
- Orchestrator, 2026-11-25: R2-1, R2-2 and R2-4 verified in the pack text (no "one PowerShell session" left; P1-01 cites `:22-124` and `:135-144`; diff in `docs/improve-generating-phase-1/evidence/sa-astra/pack-r2-diff.txt`); R2-3 done by the task-pack commit. SA-Opus's acceptance recorded; the pack is accepted.
