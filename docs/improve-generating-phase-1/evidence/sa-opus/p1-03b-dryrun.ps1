# SA-Opus, improve-generating phase 1, review of the task pack (review-1.md, R1-1, R1-3, R1-8): a dry run of the
# proposed shared log-check block (check-list §3.2), G-STAGE (§3.3) and P1-03b blocks A, C and D, in the git-ignored
# scratch folder tests\artifacts\improve-generating-phase-1\review-dryrun\. Block B (the four locked gates, the task's
# unchanged step-3 code) is replaced by copies of the round-1 logs (p1-*.log) with the two fold-case names renamed as
# P1-02 will rename them, and helper lines rebuilt from p1-verify.log; the focused P1-02 logs are synthetic. G-STAGE
# runs on scratch copies carrying the planned edits. No lock, no test runner, no engine. It writes p1-03b-dryrun.md
# here and removes the scratch folders.
# Run it from Q:\git (not the repository) so that, as in the orchestrator's sessions, the process's .NET current
# directory differs from the PowerShell location until the shared block aligns them.
#   Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-03b-dryrun.ps1
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..'))
$scratch = 'tests\artifacts\improve-generating-phase-1\review-dryrun'
if (Test-Path -LiteralPath $scratch) { throw 'the dry-run scratch folder exists' }
$here = 'docs\improve-generating-phase-1\evidence\sa-opus'
$report = [Collections.Generic.List[string]]::new()
$report.Add("- .NET current directory before the shared block: $([Environment]::CurrentDirectory).")

# ---- Check-list §3.2 shared log-check block, as proposed ----
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
  if ($lines[0] -notmatch "^p1-run: .+ v$Major\.\d+\.\d+; node ") { throw "QUESTION: $Log did not run on Node $Major" }
  foreach ($x in $Exact) { if (@($lines | Where-Object { $_ -ceq $x }).Count -ne 1) { throw "QUESTION: $Log lacks exactly one '$x'" } }
  foreach ($p in $Patterns) { if (@($lines | Where-Object { $_ -cmatch $p }).Count -ne 1) { throw "QUESTION: $Log lacks exactly one match of $p" } }
  $h = @(Get-Content -LiteralPath $Helper | Where-Object { $_ -cmatch "^IG $([regex]::Escape($Task)) exit=0 seconds=\d+(\.\d+)? quiet=45$" })
  if ($h.Count -ne 1) { throw "QUESTION: $Helper lacks exactly one 'IG $Task exit=0 ... quiet=45' line" }
  $s = [double]([regex]::Match($h[0], 'seconds=([0-9.]+)').Groups[1].Value)
  if ($s -gt 300) { throw "QUESTION: $Task took $s s" }
  return $s
}

# ---- G-STAGE as proposed (check-list §3.3), on scratch copies carrying the planned edits ----
$g = "$scratch\gstage"
New-Item -ItemType Directory -Path $g | Out-Null
$test = ((git --no-pager show eca0f94:tests/generate.test.js) -join "`r`n") + "`r`n"
$i = $test.IndexOf("describe('deterministic parallel simulation', () => {")
$j = $test.IndexOf("describe('recorded generation fixture', () => {")
$block = $test.Substring($i, $j - $i).Replace('pool sizes 1-4 and shuffled completion orders agree on ${seedText}${tag}', 'pool sizes 1-4 and 8 with shuffled completion orders agree on ${seedText}${tag}').Replace('for (const width of [1, 2, 3, 4]) {', 'for (const width of [1, 2, 3, 4, 8]) {')
[IO.File]::WriteAllText("$g\generate.test.js", $test.Substring(0, $i) + $block + $test.Substring($j), $utf8)
$spec = ((git --no-pager show eca0f94:docs/design-detail.md) -join "`r`n") + "`r`n"
[IO.File]::WriteAllText("$g\design-detail.md", $spec.Replace('Fold determinism: identical output for pool sizes 1 and 4 and shuffled completion orders (simulated).', 'Fold determinism: identical output for simulated pool widths 1, 2, 3, 4 and 8 and three shuffled completion orders, against the serial fold. Width 8 is a test-only simulation; the production pool remains limited to four.'), $utf8)
$map = @{ 'tests\generate.test.js' = "$g\generate.test.js"; 'docs\design-detail.md' = "$g\design-detail.md" }
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
  $h = Get-Hits $map[$w[0]] $w[1]
  if ($h -cne $w[2]) { throw "QUESTION: G-STAGE: '$($w[1])' at lines [$h] of $($w[0]), expected [$($w[2])]" }
}
$report.Add('- G-STAGE hit checks on the edited copies: pass (808; none; 821; 420; 3076; none).')
foreach ($w in $gstage) {
  $h = Get-Hits $w[0] $w[1]
  $report.Add("  - at the base worktree: '$($w[1].Substring(0, [Math]::Min(60, $w[1].Length)))...' in $($w[0]) at [$h], fold8 expects [$($w[2])]")
}

# ---- Block A as proposed ($V and $FW redirected to the scratch folder; G-STAGE ran above on the copies) ----
$env:FORCE_COLOR = '0'
$Plan = 'eca0f94717a56de43c52f6cb54d739360670fef8'
$Digest = 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4'
$Tested = @('core', 'generator', 'player', 'assets', 'index.html', 'redirect.js', 'sitemap.xml', 'tests', 'tools', 'package.json', '.github')
$Site = @('index.html', 'redirect.js', 'sitemap.xml', 'assets', 'core', 'generator', 'player')
$V = "$scratch\verification"
$FW = "$scratch\fold-width8"
$Node22Path = 'Q:\.tools\.npm\_npx\52027bd8fc0022aa\node_modules\node\bin\node.exe'
if ((git --no-pager branch --show-current) -ne 'improve-generating') { throw 'QUESTION: not on improve-generating' }
git --no-pager merge-base --is-ancestor $Plan HEAD
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: the plan commit is not an ancestor of HEAD' }
if (git --no-pager status --porcelain --untracked-files=all -- $Tested) { throw 'QUESTION: tested paths have uncommitted or untracked changes' }
$Q = (git --no-pager rev-parse HEAD).Trim()
if (Test-Path -LiteralPath "$V\index.json") { throw 'QUESTION: a qualification is already recorded; run G-QUALIFIED and report it' }
$v26 = (node --version).Trim()
if ($v26 -notmatch '^v26\.\d+\.\d+$') { throw "QUESTION: the default Node is $v26, not 26" }
if (-not (Test-Path -LiteralPath $Node22Path -PathType Leaf)) { throw 'QUESTION: the supplied Node 22 is missing' }
$v22 = (& $Node22Path --version).Trim()
if ($v22 -notmatch '^v22\.\d+\.\d+$') { throw "QUESTION: the supplied runtime is $v22, not Node 22" }
$d = (node --input-type=module -e "import { readFileSync } from 'node:fs'; import { computeSourceDigest } from './tools/bench/report.js'; console.log(await computeSourceDigest((p) => readFileSync(p, 'utf8')));").Trim()
if ($d -ne $Digest) { throw "QUESTION: the runtime digest is $d" }
$env:IG_NODE22 = $Node22Path
$id = 'P1-03b-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$dir = "$V\$id"
New-Item -ItemType Directory -Path $dir | Out-Null
. .\tools\ig-proto\lock\ig-lock.ps1
$runner = 'docs\improve-generating-phase-1\evidence\sa-opus\p1-run.mjs'

# ---- Block B replaced: the round-1 logs stand in for the four gates (renamed fold cases, rebuilt helper lines) ----
$old = 'pool sizes 1-4 and shuffled completion orders agree on'
$new = 'pool sizes 1-4 and 8 with shuffled completion orders agree on'
$verify = Get-Content -LiteralPath "$here\p1-verify.log"
$results = @()
foreach ($gate in @(
    @{ Id = 'full-node26'; Which = 'self'; Old = 'p1-full-node26.log'; Sao = 'P1-SAO full node26'; Args = @('--test', '--test-reporter=tap', 'tests/**/*.test.js') },
    @{ Id = 'fixtures'; Which = 'self'; Old = 'p1-fixtures.log'; Sao = 'P1-SAO fixtures'; Args = @('tools\record-fixtures.mjs', '--check') },
    @{ Id = 'replay-case'; Which = 'self'; Old = 'p1-replay-case.log'; Sao = 'P1-SAO replay case'; Args = @('tools\record-fixtures.mjs', '--replay-case', '--check') },
    @{ Id = 'full-node22'; Which = 'IG_NODE22'; Old = 'p1-full-node22.log'; Sao = 'P1-SAO full node22'; Args = @('--test', '--test-reporter=tap', 'tests/**/*.test.js') })) {
  $log = "$dir\$($gate.Id).log"
  $helper = "$dir\$($gate.Id).helper.log"
  $task = "P1-03b $($gate.Id)"
  [IO.File]::WriteAllText($log, ([IO.File]::ReadAllText("$here\$($gate.Old)").Replace($old, $new)).Replace("`r`n", "`n"), $utf8)
  $line = @($verify | Where-Object { $_ -like "$($gate.Sao): IG $($gate.Sao) exit=*" })[0].Substring($gate.Sao.Length + 2).Replace("IG $($gate.Sao) ", "IG $task ")
  [IO.File]::WriteAllText($helper, "$line`n", $utf8)
  $results += [ordered]@{
    id = $gate.Id; task = $task; which = $gate.Which; args = $gate.Args; exit = 0
    log = $log.Replace('\', '/'); helperLog = $helper.Replace('\', '/')
  }
}
New-Item -ItemType Directory -Path $FW | Out-Null
$okLines = @(Get-Content -LiteralPath "$dir\full-node26.log" | Where-Object { $_ -like "*ok * - $new *" })
[IO.File]::WriteAllText("$FW\run.log", ((@("p1-run: C:\Program Files\nodejs\node.exe $v26; node --test --test-reporter=tap --test-name-pattern=pool sizes 1-4 and 8 with shuffled completion orders tests\generate.test.js") + $okLines + @('# tests 2', '# suites 1', '# pass 2', '# fail 0', '# cancelled 0', '# skipped 0', '# todo 0', 'p1-run: exit 0')) -join "`n") + "`n", $utf8)
[IO.File]::WriteAllText("$FW\helper.log", "IG P1-02 fold8 exit=0 seconds=40.5 quiet=45`n", $utf8)
ConvertTo-CrlfLog $FW
$report.Add("- P1-02 step 6 check on the synthetic focused logs: $(Test-GateLog "$FW\run.log" "$FW\helper.log" 'P1-02 fold8' 26 @('# pass 2', '# fail 0', '# cancelled 0', 'p1-run: exit 0') $Fold) s.")

# ---- Block C as proposed ----
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
  $total += $r.seconds + 45
}
$fr = Test-GateLog "$FW\run.log" "$FW\helper.log" 'P1-02 fold8' 26 @('# pass 2', '# fail 0', '# cancelled 0', 'p1-run: exit 0') $Fold
$total += $fr + 45
if ($total -gt 1725) { throw "QUESTION: $total node+quiet seconds exceed 1,725" }

# ---- Block D as proposed ----
$conv = @(npm run check)
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: npm run check failed' }
foreach ($x in 'check-conventions: OK', 'check-site: OK') { if (-not ($conv -ccontains $x)) { throw "QUESTION: npm run check lacks '$x'" } }
[IO.File]::WriteAllText("$dir\conventions.log", ((($conv | ForEach-Object { "$_".TrimEnd() }) -join "`r`n").TrimEnd() + "`r`n"), $utf8)
$sha8 = $Q.Substring(0, 8)
$own = "tests\artifacts\improve-generating-phase-1\$id"
$stage = "$own\site"
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($p in $Site) { Copy-Item -LiteralPath $p -Destination $stage -Recurse }
$stamp = @(node tools\stamp-version.mjs $stage $sha8)
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: stamp-version failed on the staged site' }
$check = @(node tools\check-site.mjs $stage --expect-version $sha8)
if ($LASTEXITCODE -ne 0 -or -not ($check -ccontains 'check-site: OK')) { throw 'QUESTION: check-site failed on the staged site' }
$stageRoot = (Resolve-Path -LiteralPath $stage).Path
[string[]]$staged = Get-ChildItem -LiteralPath $stage -Recurse -File | ForEach-Object { $_.FullName.Substring($stageRoot.Length + 1).Replace('\', '/') }
[string[]]$trackedSite = git --no-pager ls-tree -r --name-only $Q -- $Site
[Array]::Sort($staged, [StringComparer]::Ordinal)
[Array]::Sort($trackedSite, [StringComparer]::Ordinal)
if (($staged -join "`n") -cne ($trackedSite -join "`n")) { throw 'QUESTION: the staged files differ from the tracked site files' }
[IO.File]::WriteAllText("$dir\site.log", (((@("staged $($Site -join ', ') at $sha8; $($staged.Count) files, equal to git ls-tree -r $Q") + $stamp + $check) -join "`r`n") + "`r`n"), $utf8)
Remove-Item -LiteralPath $own -Recurse -Force
[IO.File]::WriteAllText("$dir\tested-files.txt", (((git --no-pager ls-tree -r $Q -- $Tested) -join "`r`n") + "`r`n"), $utf8)
$hash = { param($path) [ordered]@{ path = $path.Replace('\', '/'); sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() } }
$index = [ordered]@{
  format = 'pentomino-phase1-qualification'; version = 1; status = 'pass'
  planCommit = $Plan; qualifiedCommit = $Q; attempt = $id; runtimeDigest = $d
  node = [ordered]@{ node26 = $v26; node22 = $v22 }
  testedPaths = $Tested
  focused = [ordered]@{ task = 'P1-02 fold8'; seconds = $fr; files = @((& $hash "$FW\run.log"), (& $hash "$FW\helper.log")) }
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
New-Item -ItemType File -Path "$V\index.json" -Value ((($index | ConvertTo-Json -Depth 6) -replace '\r?\n', "`r`n") + "`r`n") | Out-Null
$rel = { param($path) $path.Replace('\', '/') }
$md = @(
  '# Phase-1 qualification', '',
  "Qualified commit ``$Q``; runtime digest ``$d``; attempt ``$id``.", '',
  '| Gate | Node | Result | Node seconds | Log |', '|---|---|---|---:|---|',
  "| Focused width-8 test (P1-02) | $v26 | pass 2, fail 0, cancelled 0; both width-8 fold cases ok | $fr | ``$(& $rel "$FW\run.log")`` |"
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
New-Item -ItemType File -Path "$V\summary.md" -Value (($md -join "`r`n") + "`r`n") | Out-Null

# ---- Dry-run report: the outputs, negative probes of the shared block, then the scratch folder is removed ----
$generated = @(Get-ChildItem -LiteralPath $dir, $V, $FW -File | ForEach-Object { $_.FullName.Substring((Get-Location).Path.Length + 1).Replace('\', '/') })
$format = @(node --input-type=module -e "import { readFileSync } from 'node:fs'; import { checkText } from './tools/check-conventions.mjs'; let bad = 0; for (const f of process.argv.slice(1)) { const b = readFileSync(f); const p = checkText(f, b); if (b.includes(10) && !b.toString('utf8').includes('\r\n')) p.push(f + ': LF line endings, not CRLF'); for (const x of p) { console.error(x); bad += 1; } } console.log(bad ? 'format: ' + bad + ' problem(s)' : 'format: OK (' + (process.argv.length - 1) + ' files)'); process.exitCode = bad ? 1 : 0;" @generated)
$head = @('# P1-03b proposed blocks: dry run (SA-Opus)', '',
  'Command: `Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-03b-dryrun.ps1`',
  '(no lock, no test run). Inputs: the round-1 logs p1-full-node26/node22, p1-fixtures, p1-replay-case (fold names',
  'renamed in the copies, line endings turned to LF as p1-run.mjs writes them), helper lines from p1-verify.log,',
  'synthetic P1-02 focused logs (40.5 s). Real: preflight, digest, npm run check, static site, records.',
  "Generated files, G-FORMAT one-liner: $($format -join ' ') (exit $LASTEXITCODE).", '', '## Shared block and G-STAGE', '')
$report.InsertRange(0, [string[]]$head)
$report.AddRange([string[]](@('', '## summary.md produced', '') + @(Get-Content -LiteralPath "$V\summary.md") + @('', '## index.json keys and evidence', '',
  "Keys: $((($index.Keys) -join ', ')).", "Evidence files: $(($index.evidence | ForEach-Object { $_.path.Split('/')[-1] }) -join ', ').",
  "Tested files listed: $((Get-Content -LiteralPath "$dir\tested-files.txt").Count).", '', '## Negative probes of Test-GateLog', '')))
$probe = "$scratch\probe"
New-Item -ItemType Directory -Path $probe | Out-Null
$base26 = [IO.File]::ReadAllText("$dir\full-node26.log")
foreach ($case in @(
    @{ Name = 'one failing test'; Text = $base26.Replace("# fail 0`r`n", "# fail 1`r`n") },
    @{ Name = 'old fold-case names'; Text = $base26.Replace($new, $old) },
    @{ Name = 'skipped slow case'; Text = $base26.Replace("# skipped 0`r`n", "# skipped 1`r`n") },
    @{ Name = 'child exit 1'; Text = $base26.Replace('p1-run: exit 0', 'p1-run: exit 1') })) {
  [IO.File]::WriteAllText("$probe\x.log", $case.Text, $utf8)
  try {
    Test-GateLog "$probe\x.log" "$dir\full-node26.helper.log" 'P1-03b full-node26' 26 $suite $Fold | Out-Null
    $report.Add("- $($case.Name): ACCEPTED (wrong)")
  } catch { $report.Add("- $($case.Name): rejected ($($_.Exception.Message.Replace((Get-Location).Path + '\', '')))") }
}
foreach ($case in @(
    @{ Name = 'helper quiet 15'; Text = 'IG P1-03b full-node26 exit=0 seconds=119.73 quiet=15' },
    @{ Name = 'helper exit 1'; Text = 'IG P1-03b full-node26 exit=1 seconds=119.73 quiet=45' },
    @{ Name = 'helper 301 s'; Text = 'IG P1-03b full-node26 exit=0 seconds=301 quiet=45' },
    @{ Name = 'helper of another task'; Text = 'IG P1-03b full-node22 exit=0 seconds=119.73 quiet=45' })) {
  [IO.File]::WriteAllText("$probe\h.log", "$($case.Text)`r`n", $utf8)
  try {
    Test-GateLog "$dir\full-node26.log" "$probe\h.log" 'P1-03b full-node26' 26 $suite $Fold | Out-Null
    $report.Add("- $($case.Name): ACCEPTED (wrong)")
  } catch { $report.Add("- $($case.Name): rejected ($($_.Exception.Message))") }
}
try {
  Test-GateLog "$dir\full-node22.log" "$dir\full-node22.helper.log" 'P1-03b full-node22' 26 $suite $Fold | Out-Null
  $report.Add('- Node 22 log checked as Node 26: ACCEPTED (wrong)')
} catch { $report.Add("- Node 22 log checked as Node 26: rejected ($($_.Exception.Message))") }
Remove-Item -LiteralPath $scratch -Recurse -Force
if (-not (Get-ChildItem -LiteralPath 'tests\artifacts\improve-generating-phase-1' -Force)) { Remove-Item -LiteralPath 'tests\artifacts\improve-generating-phase-1' }
[IO.File]::WriteAllText("$here\p1-03b-dryrun.md", ((($report | ForEach-Object { "$_".TrimEnd() }) -join "`r`n") + "`r`n"), $utf8)
$report
