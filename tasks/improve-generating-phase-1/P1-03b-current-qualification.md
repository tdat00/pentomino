# P1-03b: Current qualification

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-1`; plan §4.6, P1-T04-T09, §8 P1-03; D-P1-03/D-P1-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, `eca0f94717a56de43c52f6cb54d739360670fef8` |
| Depends on | P1-02 accepted and committed |
| Pack author / reviewer | SA-Astra / SA-Opus |
| Executor | The orchestrator |
| Estimate | Developer 0 h, orchestrator 0.5 h plus lock contention; machine about 7.4 min node+quiet before the extra width, four invocations at most 1,380 s |

## Goal

Verify the approved test delta and unchanged phase-1 production checkpoint on Node 26 and Node 22,
including both fixture checks and the staged site. Bind the actual results to one qualified commit so
later documentary commits can reuse them without repeating the suites.

## Authority and fixed points

- D-P1-05 and plan §4.6: fail closed; exactly four new locked invocations, 300-s Node limit and
  45-s quiet each. No `-AllowExit1`, shortened quiet, quick-suite duplicate, automatic retry or bench.
- Use `E/sa-opus/p1-run.mjs`, the lock helper, `tools/stamp-version.mjs`, `tools/check-site.mjs` and
  Git. No code change or new qualification program. P1-03a was withdrawn at review.
- Node 22 Windows verification is not Ubuntu CI. Static staging is neither a browser test nor a
  deployment. Do not dispatch `.github/workflows/pages.yml`.
- Read this task, check-list §§3.2-3.3, plan §4.6, `.github/workflows/pages.yml`,
  `package.json`, `tools/record-fixtures.mjs`, the runner/helper and P1-02's two committed logs.

## Scope

- Create `docs/improve-generating-phase-1/evidence/verification/<attempt>/` with four run logs,
  four helper logs, `conventions.log`, `site.log`, `tested-files.txt` and any failure output.
- Create `E/verification/index.json` and `summary.md` once, only after all checks pass.
- An owned staged site under `tests/artifacts/improve-generating-phase-1/<attempt>/site/` is removed
  after its check. Never stamp the checkout or reuse/remove another attempt's folder.
- Change only orchestrator bookkeeping. No source, test, fixture, tool, guide or earlier record change.
- G-PROTECTED empty; G-STAGE passes; G-WORKTREE only the new attempt/canonical files and bookkeeping.
  G-QUALIFIED passes after the task commit.

## Steps

1. Run check-list §3.2's shared block, G-PROTECTED and G-STAGE, then blocks A, B, C and D below,
   in order as **one PowerShell command**. No variable survives a new tool command.
   - If the tool wait expires, read the same session; never start another copy.
   - Any `throw` stops. Keep the attempt's output and send `QUESTION:` with the error. Do not retry
     or resume a partial attempt.
   - The Node 22 path is this host's supplied value, recorded at the base in `E/sa-opus/p1-verify.ps1`,
     not a portable default. Missing/wrong Node 22 is a QUESTION; no `npx` download.

   **Block A: preflight, unlocked.**

   ```powershell
   $env:FORCE_COLOR = '0'
   $Plan = 'eca0f94717a56de43c52f6cb54d739360670fef8'
   $Digest = 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4'
   $Tested = @('core', 'generator', 'player', 'assets', 'index.html', 'redirect.js', 'sitemap.xml', 'tests', 'tools', 'package.json', '.github')
   $Site = @('index.html', 'redirect.js', 'sitemap.xml', 'assets', 'core', 'generator', 'player')
   $V = 'docs\improve-generating-phase-1\evidence\verification'
   $FW = 'docs\improve-generating-phase-1\evidence\fold-width8'
   $Node22Path = 'Q:\.tools\.npm\_npx\52027bd8fc0022aa\node_modules\node\bin\node.exe'
   $branch = @(git --no-pager branch --show-current)
   if ($LASTEXITCODE -ne 0 -or $branch.Count -ne 1 -or $branch[0] -cne 'improve-generating') { throw 'QUESTION: not on improve-generating' }
   git --no-pager merge-base --is-ancestor $Plan HEAD
   if ($LASTEXITCODE -ne 0) { throw 'QUESTION: the plan commit is not an ancestor of HEAD' }
   $dirty = @(git --no-pager status --porcelain --untracked-files=all -- $Tested docs\design-detail.md)
   if ($LASTEXITCODE -ne 0 -or $dirty.Count) { throw 'QUESTION: status failed or tested/spec paths are dirty/untracked' }
   $head = @(git --no-pager rev-parse HEAD)
   if ($LASTEXITCODE -ne 0 -or $head.Count -ne 1 -or $head[0] -cnotmatch '^[0-9a-f]{40}$') { throw 'QUESTION: no qualified HEAD' }
   $Q = $head[0]
   if ((Test-Path -LiteralPath "$V\index.json") -or (Test-Path -LiteralPath "$V\summary.md")) { throw 'QUESTION: qualification output exists; run G-QUALIFIED and report it, never overwrite' }
   $v26 = (node --version).Trim()
   if ($LASTEXITCODE -ne 0 -or $v26 -cnotmatch '^v26\.\d+\.\d+$') { throw "QUESTION: the default Node is $v26, not 26" }
   if (-not (Test-Path -LiteralPath $Node22Path -PathType Leaf)) { throw 'QUESTION: the supplied Node 22 is missing' }
   $v22 = (& $Node22Path --version).Trim()
   if ($LASTEXITCODE -ne 0 -or $v22 -cnotmatch '^v22\.\d+\.\d+$') { throw "QUESTION: the supplied runtime is $v22, not Node 22" }
   $d = (node --input-type=module -e "import { readFileSync } from 'node:fs'; import { computeSourceDigest } from './tools/bench/report.js'; console.log(await computeSourceDigest((p) => readFileSync(p, 'utf8')));").Trim()
   if ($LASTEXITCODE -ne 0 -or $d -cne $Digest) { throw "QUESTION: source digest failed or changed: $d" }
   $adoption = Get-Content -Raw -LiteralPath docs\improve-generating-phase-1\evidence\adoption.json | ConvertFrom-Json
   if ($adoption.source.currentDigest -cne $d) { throw 'QUESTION: the adoption digest differs' }
   $fr = Test-GateLog "$FW\run.log" "$FW\helper.log" 'P1-02 fold8' 26 @('# pass 2', '# fail 0', '# cancelled 0', 'p1-run: exit 0') $Fold
   $fv = [regex]::Match((Get-Content -LiteralPath "$FW\run.log" -TotalCount 1), '^p1-run: .+ (v26\.\d+\.\d+); node ').Groups[1].Value
   $env:IG_NODE22 = $Node22Path
   $id = 'P1-03b-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
   $dir = "$V\$id"
   New-Item -ItemType Directory -Path $dir | Out-Null
   . .\tools\ig-proto\lock\ig-lock.ps1
   $runner = 'docs\improve-generating-phase-1\evidence\sa-opus\p1-run.mjs'
   ```

   **Block B: the four locked gates.** The full-suite arguments are the TAP form of `npm test`.
   The quoted test glob is a Node glob, not a Windows directory to create.

   ```powershell
   $results = @()
   foreach ($gate in @(
     @{ Id = 'full-node26'; Which = 'self'; Args = @('--test', '--test-reporter=tap', 'tests/**/*.test.js') },
     @{ Id = 'fixtures'; Which = 'self'; Args = @('tools\record-fixtures.mjs', '--check') },
     @{ Id = 'replay-case'; Which = 'self'; Args = @('tools\record-fixtures.mjs', '--replay-case', '--check') },
     @{ Id = 'full-node22'; Which = 'IG_NODE22'; Args = @('--test', '--test-reporter=tap', 'tests/**/*.test.js') }
   )) {
     $log = "$dir\$($gate.Id).log"
     $helper = "$dir\$($gate.Id).helper.log"
     $task = "P1-03b $($gate.Id)"
     try {
       Invoke-IgNode -Repo pentomino -Task $task -LimitSeconds 300 -QuietSeconds 45 -NodeArgs (@($runner, $log, $gate.Which, '--') + $gate.Args) 6>&1 2>&1 | Tee-Object -FilePath $helper
     } catch {
       ($_ | Out-String) | Tee-Object -FilePath $helper -Append
       ConvertTo-CrlfLog $dir
       throw
     }
     $results += [ordered]@{
       id = $gate.Id; task = $task; which = $gate.Which; args = $gate.Args; exit = 0; seconds = $null
       log = $log.Replace('\', '/'); helperLog = $helper.Replace('\', '/')
     }
   }
   ```

   **Block C: log checks, unlocked.**

   ```powershell
   ConvertTo-CrlfLog $dir
   $suite = @('# tests 1514', '# suites 128', '# pass 1514', '# fail 0', '# cancelled 0', '# skipped 0', '# todo 0', 'p1-run: exit 0')
   $expect = @{
     'full-node26' = @(26, $suite, $Fold)
     'fixtures'    = @(26, @('record-fixtures: OK', 'p1-run: exit 0'), @())
     'replay-case' = @(26, @('record-fixtures: replay case OK', 'p1-run: exit 0'), @())
     'full-node22' = @(22, $suite, $Fold)
   }
   $total = 0.0
   foreach ($r in $results) {
     $e = $expect[$r.id]
     $r.seconds = Test-GateLog "$dir\$($r.id).log" "$dir\$($r.id).helper.log" $r.task $e[0] $e[1] $e[2]
     $expectedVersion = if ($r.id -eq 'full-node22') { $v22 } else { $v26 }
     $first = Get-Content -LiteralPath "$dir\$($r.id).log" -TotalCount 1
     if ($first -cnotmatch " $([regex]::Escape($expectedVersion)); node ") { throw "QUESTION: $($r.id) used a different Node patch version" }
     $total += $r.seconds + 45
   }
   $fr = Test-GateLog "$FW\run.log" "$FW\helper.log" 'P1-02 fold8' 26 @('# pass 2', '# fail 0', '# cancelled 0', 'p1-run: exit 0') $Fold
   $total += $fr + 45
   if ($total -gt 1725) { throw "QUESTION: $total node+quiet seconds exceed 1,725" }
   ```

   **Block D: conventions, static site and records, unlocked.** Preserve any failure output in the
   owned attempt; clean only the staged site created by this block, including after a site failure.

   ```powershell
   $conv = @(npm run check 2>&1 | ForEach-Object { "$_" })
   $convExit = $LASTEXITCODE
   [IO.File]::WriteAllText("$dir\conventions.log", ((($conv | ForEach-Object { $_.TrimEnd() }) -join "`r`n").TrimEnd() + "`r`n"), $utf8)
   if ($convExit -ne 0) { throw 'QUESTION: npm run check failed' }
   foreach ($x in 'check-conventions: OK', 'check-site: OK') { if (-not ($conv -ccontains $x)) { throw "QUESTION: npm run check lacks '$x'" } }
   $sha8 = $Q.Substring(0, 8)
   $own = "tests\artifacts\improve-generating-phase-1\$id"
   $stage = "$own\site"
   if (Test-Path -LiteralPath $own) { throw 'QUESTION: staged-site owner folder already exists' }
   New-Item -ItemType Directory -Path $stage | Out-Null
   $siteLines = [Collections.Generic.List[string]]::new()
   try {
     foreach ($p in $Site) { Copy-Item -LiteralPath $p -Destination $stage -Recurse }
     $stamp = @(node tools\stamp-version.mjs $stage $sha8 2>&1 | ForEach-Object { "$_" })
     $stampExit = $LASTEXITCODE
     foreach ($l in $stamp) { $siteLines.Add($l) }
     if ($stampExit -ne 0) { throw 'QUESTION: stamp-version failed on the staged site' }
     $check = @(node tools\check-site.mjs $stage --expect-version $sha8 2>&1 | ForEach-Object { "$_" })
     $checkExit = $LASTEXITCODE
     foreach ($l in $check) { $siteLines.Add($l) }
     if ($checkExit -ne 0 -or -not ($check -ccontains 'check-site: OK')) { throw 'QUESTION: check-site failed on the staged site' }
     $stageRoot = (Resolve-Path -LiteralPath $stage).Path
     [string[]]$staged = Get-ChildItem -LiteralPath $stage -Recurse -File -Force | ForEach-Object { $_.FullName.Substring($stageRoot.Length + 1).Replace('\', '/') }
     [string[]]$trackedSite = git --no-pager ls-tree -r --name-only $Q -- $Site
     if ($LASTEXITCODE -ne 0) { throw 'QUESTION: tracked-site listing failed' }
     [Array]::Sort($staged, [StringComparer]::Ordinal)
     [Array]::Sort($trackedSite, [StringComparer]::Ordinal)
     if (($staged -join "`n") -cne ($trackedSite -join "`n")) { throw 'QUESTION: the staged files differ from the tracked site files' }
     $siteLines.Insert(0, "staged $($Site -join ', ') at $sha8; $($staged.Count) files, equal to git ls-tree -r $Q")
   } catch {
     $siteLines.Add(($_ | Out-String).TrimEnd())
     throw
   } finally {
     [IO.File]::WriteAllText("$dir\site.log", ((($siteLines -join "`n") -split '\r?\n' | ForEach-Object { $_.TrimEnd() }) -join "`r`n") + "`r`n", $utf8)
     Remove-Item -LiteralPath $own -Recurse -Force
   }
   $currentHead = @(git --no-pager rev-parse HEAD)
   if ($LASTEXITCODE -ne 0 -or ($currentHead -join '') -cne $Q) { throw 'QUESTION: HEAD changed during qualification' }
   git --no-pager diff --exit-code --stat $Q -- $Tested docs\design-detail.md
   if ($LASTEXITCODE -ne 0) { throw 'QUESTION: qualified files changed during the gates' }
   $dirty = @(git --no-pager status --porcelain --untracked-files=all -- $Tested docs\design-detail.md)
   if ($LASTEXITCODE -ne 0 -or $dirty.Count) { throw 'QUESTION: status failed or qualified paths are now dirty/untracked' }
   git --no-pager diff --exit-code --stat --no-renames --diff-filter=MDTUXB $Plan -- . ':(exclude)tests/generate.test.js' ':(exclude)docs/design-detail.md'
   if ($LASTEXITCODE -ne 0) { throw 'QUESTION: protected base file changed during qualification' }
   $testedFiles = @(git --no-pager ls-tree -r $Q -- $Tested)
   if ($LASTEXITCODE -ne 0 -or $testedFiles.Count -eq 0) { throw 'QUESTION: tested-file listing failed' }
   [IO.File]::WriteAllText("$dir\tested-files.txt", (($testedFiles -join "`r`n") + "`r`n"), $utf8)
   ConvertTo-CrlfLog $dir
   $hash = { param($path) [ordered]@{ path = $path.Replace('\', '/'); sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() } }
   $index = [ordered]@{
     format = 'pentomino-phase1-qualification'; version = 1; status = 'pass'
     planCommit = $Plan; qualifiedCommit = $Q; attempt = $id; runtimeDigest = $d
     node = [ordered]@{ node26 = $v26; node22 = $v22 }
     testedPaths = $Tested
     focused = [ordered]@{ task = 'P1-02 fold8'; node = $fv; seconds = $fr; files = @((& $hash "$FW\run.log"), (& $hash "$FW\helper.log")) }
     gates = @($results)
     site = [ordered]@{ version = $sha8; files = $staged.Count; stamp = ($stamp -join ' '); check = 'check-site: OK' }
     nodePlusQuietSeconds = [math]::Round($total, 3)
     evidence = @(Get-ChildItem -LiteralPath $dir -File | Sort-Object Name | ForEach-Object { & $hash "$dir\$($_.Name)" })
     limitations = @(
       'Node 22 verification ran on Windows, not Ubuntu CI.',
       'The static-site check is not a browser run or deployment.',
       'Node plus quiet seconds exclude lock waits; this is verification, not a benchmark.'
     )
   }
   $rel = { param($path) $path.Replace('\', '/') }
   $md = @(
     '# Phase-1 qualification', '',
     "Qualified commit ``$Q``; runtime digest ``$d``; attempt ``$id``.", '',
     '| Gate | Node | Result | Node seconds | Log |', '|---|---|---|---:|---|',
     "| Focused width-8 test (P1-02) | $fv | pass 2, fail 0, cancelled 0; both width-8 fold cases ok | $fr | ``$(& $rel "$FW\run.log")`` |"
   )
   foreach ($r in $results) {
     $what = switch ($r.id) {
       'fixtures' { 'record-fixtures: OK' }
       'replay-case' { 'record-fixtures: replay case OK' }
       default { '1514 of 1514 pass; 128 suites; 0 fail, cancelled, skipped, todo; both width-8 fold cases ok' }
     }
     $md += "| $($r.task) | $(if ($r.id -eq 'full-node22') { $v22 } else { $v26 }) | $what | $($r.seconds) | ``$($r.log)`` |"
   }
   $md += @(
     "| ``npm run check`` | $v26 | check-conventions: OK; check-site: OK | - | ``$(& $rel "$dir\conventions.log")`` |",
     "| Static site | $v26 | stamped ``$sha8``; check-site: OK; $($staged.Count) files, equal to the tracked site files | - | ``$(& $rel "$dir\site.log")`` |",
     '', "Five locked invocations: $([math]::Round($total, 3)) node+quiet seconds (ceiling 1,725).", '',
     'Node 22 verification ran on Windows, not Ubuntu CI. The static-site check is not a browser run or deployment.',
     'Node plus quiet seconds exclude lock waits; this is verification, not a benchmark.'
   )
   New-Item -ItemType File -Path "$V\index.json" -Value ((($index | ConvertTo-Json -Depth 6) -replace '\r?\n', "`r`n") + "`r`n") | Out-Null
   New-Item -ItemType File -Path "$V\summary.md" -Value (($md -join "`r`n") + "`r`n") | Out-Null
   ```

2. Read `summary.md` against the logs, not just the shell's final status:
   - Each full suite has 1,514 tests, 128 suites, all passing; zero failures, cancellations, skipped
     and todo. Both renamed fold cases are present in each full log.
   - Both fixture markers are exact. Versions match the commands; focused `node` is its own actual
     log version, not inferred from a later Node installation.
   - Every helper shows quiet 45 and at most 300 seconds; the five-invocation total includes P1-02
     once and is at most 1,725 node+quiet seconds.
   - The staged manifest matches the qualified tree; stamp is its SHA8, check passes, owned copy
     is removed. `tested-files.txt` gives each tested path's Git blob identity and is raw-hash-bound
     by `index.evidence`. Do not describe this as an Ubuntu CI/browser result.
3. In a new command, set the scope and format lists, then run G-PROTECTED, G-STAGE, G-WORKTREE and G-FORMAT in the same command. `$dir` comes from `index.json`.

   ```powershell
   Set-Location Q:\git\pentomino
   [Environment]::CurrentDirectory = (Get-Location).Path
   $ErrorActionPreference = 'Stop'
   $V = 'docs\improve-generating-phase-1\evidence\verification'
   $dir = "$V\" + (Get-Content -Raw -LiteralPath "$V\index.json" | ConvertFrom-Json).attempt
   if (-not (Test-Path -LiteralPath $dir -PathType Container)) { throw 'QUESTION: the attempt folder named by index.json is missing' }
   $Allowed = @(
     'docs/improve-generating-phase-1/evidence/verification/index.json',
     'docs/improve-generating-phase-1/evidence/verification/summary.md',
     'tasks/improve-generating-phase-1/P1-03b-current-qualification.md',
     'tasks/improve-generating-phase-1/check-list.md'
   ) + @(Get-ChildItem -LiteralPath $dir -File | ForEach-Object { [IO.Path]::GetRelativePath((Get-Location).Path, $_.FullName).Replace('\', '/') })
   $FormatFiles = @($Allowed | ForEach-Object { $_.Replace('/', '\') })
   ```

   Commit the fresh attempt folder, canonical index/summary and bookkeeping as the single P1-03b
   task commit. Then run G-QUALIFIED once: Git/hashes, not a suite. Never rewrite a pass record.
   A failed attempt remains archived; a ruling that authorizes a new attempt must name it and
   account for previous time, not silently extend the five-run allowance.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/**/*.test.js` | Full suite, Node 26 and 22 | Qualified tree including width-8 edit | Each 1,514 pass, 128 suites; no fail/cancelled/skipped/todo; both renamed cases |
| `tools/record-fixtures.mjs` | `--check` | Existing generation/sample fixtures | `record-fixtures: OK`, no rewrite |
| Same tool | `--replay-case --check` | Existing `gen-v3` replay fixture | `record-fixtures: replay case OK`, no rewrite |
| `tools/check-site.mjs` | Stamped site | Owned copy stamped with qualified SHA8; file set equal to qualified `git ls-tree` | `check-site: OK`; copy removed |
| `verification/index.json` | Complete binding | Four run/helper logs, focused logs, site, tested-file list | Written once only after checks pass; G-QUALIFIED passes after commit |

## Documentation

The attempt logs and canonical `summary.md`/`index.json` are the documentation. Do not change any app
text, guide, fixture or previous evidence. State Windows/Node versions, five-run accounting and limits.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| Shared block, G-PROTECTED, G-STAGE, block A | Root, unlocked | No throw; fresh attempt, correct runtimes/digest | 2 min |
| Block B: four `Invoke-IgNode` calls | Root | All exit 0, quiet 45 | 300 s Node each, plus lock wait |
| Blocks C and D | Root, unlocked | Complete logs; static gates pass; index/summary written | 3 min |
| G-PROTECTED, G-STAGE, G-WORKTREE, G-FORMAT; G-QUALIFIED after commit | Root | As in check-list §3.3 | 1 min |

## Stop points and questions

- Stop before the locked sequence if a prerequisite, path, Node version or source binding differs.
- Stop after any failure/timeout/malformed log; preserve output. No automatic retry, fixture
  regeneration, production patch, download, scope expansion or time-limit increase.
- `QUESTION:` to the pack author through the orchestrator when the task is wrong or contradicts
  code, an ambiguity changes behaviour, a gate fails for an uncovered reason, outside-scope change
  is needed or a recorded decision would change.

## Acceptance criteria

### Business

| ID | Criterion | How verified | Evidence |
|---|---|---|---|
| P1-03b-B01 | Same-puzzle/history/identity contracts remain covered on both supported verification runtimes | Existing P6/client/controller/recorder/replay suites | Full and fixture logs |
| P1-03b-B02 | Honest current checkpoint, no benchmark/browser/deployment claim | Source binding and limitation statements | Index/summary |

### Technical

| ID | Criterion | How verified | Evidence |
|---|---|---|---|
| P1-03b-T01 | Both full suites and fixture checks pass on the qualified unchanged tree | Block C's exact-line checks; clean tested paths; `tested-files.txt` | Attempt logs and index |
| P1-03b-T02 | Site matches qualified source and is checked without touching checkout | Block D manifest, stamp/check output, owned copy removed | `site.log`, index |
| P1-03b-T03 | Exactly five accounted gates including P1-02; safe limits | Blocks C/D; `nodePlusQuietSeconds` <=1,725, quiet45, each <=300 | Helper logs, index |
| P1-03b-T04 | Binding survives documentary commits; output immutable and well formatted | G-QUALIFIED, G-FORMAT and scope guards | Index, Git tree, guard outputs |

## Checklist

- [ ] Correct Node binaries, digest, clean tree and focused gate checked before locked work
- [ ] Four fresh locked runs completed; exact output/versions/helper status checked
- [ ] Static site cleaned; canonical index/summary written once
- [ ] All five gates' node+quiet time recorded; no automatic retry
- [ ] Formats/scope guards pass; G-QUALIFIED passes after the single task commit
- [ ] Every AC has evidence; limits and any questions/rulings recorded

## Final report

Start/end/duration and lock waits; qualified commit; actual Node versions; counts, fixture/static
markers, per-run seconds and total node+quiet; each AC's evidence; any questions/rulings/deviations.
State the commit and successful post-commit G-QUALIFIED. No push or PR edit here.

## Execution log

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-25 11:29 to 11:37 +07:00 (one command: shared block, G-PROTECTED, G-STAGE, blocks A-D); accepted 11:40; about 11 min |
| Waiting for rulings | none |
| Agent id, model | the orchestrator (no developer) |
| Calls; input, output and cache-read tokens | - |
| AI credits | - |
| Questions and rulings | none |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | attempt P1-03b-20261125T042920136Z, qualified commit 02edc6a48662fd81d38d86044881de20a5d8f4ff, digest a51e8196...: full Node 26 (v26.13.0) 1514/1514 pass, 128 suites, 0 fail/cancelled/skipped/todo, 122.063 s; fixtures `record-fixtures: OK` 0.673 s; replay case `record-fixtures: replay case OK` 1.306 s; full Node 22 (v22.23.5) 1514/1514 pass, 141.735 s; every helper quiet 45; `npm run check` OK; staged site stamped 02edc6a4, check-site OK, 120 files equal to git ls-tree, owned copy removed; five locked invocations 509.741 node+quiet s of 1,725; then G-PROTECTED, G-STAGE, G-WORKTREE, G-FORMAT and, after the commit, G-QUALIFIED |
| Commit | this task's commit |
| Issues and named items | none; limitations recorded: Node 22 on Windows, not Ubuntu CI; static-site check is not a browser run or deployment |
