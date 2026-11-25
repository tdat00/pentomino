# Review-1 task-command dry run: parses all PowerShell blocks and exercises the log/static-record blocks with
# copied historical logs and synthetic focused data. No test runner, lock invocation, remote mutation or benchmark.
# From Q:\git: pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-astra\pack-r1-dryrun.ps1
$ErrorActionPreference = 'Stop'
$root = 'Q:\git\pentomino'
$here = 'docs\improve-generating-phase-1\evidence\sa-astra'
$pack = 'tasks\improve-generating-phase-1'
$checks = [Collections.Generic.List[string]]::new()
$negative = [Collections.Generic.List[object]]::new()
function Assert-R1([bool]$Condition, [string]$Label) {
  if (-not $Condition) { throw $Label }
  $checks.Add($Label)
}
function Get-Blocks([string]$Path) {
  foreach ($m in [regex]::Matches((Get-Content -Raw -LiteralPath (Join-Path $root $Path)), '(?ms)^[ \t]*```powershell[ \t]*\r?\n(.*?)^[ \t]*```[ \t]*\r?$')) {
    $m.Groups[1].Value
  }
}
function Expect-Rejection([scriptblock]$Action, [string]$Label) {
  $rejected = $false
  $message = ''
  try { & $Action | Out-Null } catch { $rejected = $true; $message = $_.Exception.Message }
  Assert-R1 $rejected "Reject: $Label"
  $negative.Add([ordered]@{ case = $Label; message = $message })
}
$taskFiles = @(
  "$pack\check-list.md", "$pack\P1-01-source-bound-adoption.md", "$pack\P1-02-fold-width-eight.md",
  "$pack\P1-03b-current-qualification.md", "$pack\P1-04-readiness-and-pr-description.md", "$pack\P1-05-publish-phase-one.md"
)
$blockCount = 0
foreach ($file in $taskFiles) {
  foreach ($block in @(Get-Blocks $file)) {
    $tokens = $null
    $errors = $null
    [void][Management.Automation.Language.Parser]::ParseInput($block, [ref]$tokens, [ref]$errors)
    Assert-R1 ($errors.Count -eq 0) "PowerShell block parses: $file #$blockCount"
    $blockCount++
  }
}
$guardBlocks = @(Get-Blocks "$pack\check-list.md")
$qualification = @(Get-Blocks "$pack\P1-03b-current-qualification.md")
$publication = @(Get-Blocks "$pack\P1-05-publish-phase-one.md")
Assert-R1 ($guardBlocks.Count -eq 6 -and $qualification.Count -eq 5 -and $publication.Count -eq 6) 'Expected literal block boundaries'
$beforeNet = [Environment]::CurrentDirectory
$beforeRelative = [IO.Path]::GetFullPath('docs\improve-generating-phase-1\evidence\verification\index.json')
Invoke-Expression $guardBlocks[0]
Assert-R1 ([Environment]::CurrentDirectory -ceq $root) '.NET directory synchronized to repository'
$afterRelative = [IO.Path]::GetFullPath('docs\improve-generating-phase-1\evidence\verification\index.json')
Assert-R1 ($afterRelative.StartsWith("$root\", [StringComparison]::Ordinal)) 'Relative .NET output resolves inside repository'
$inputFiles = @($taskFiles) + @(
  "$here\pack-r1-dryrun.ps1", 'docs\improve-generating-phase-1\plan.md',
  'tests\generate.test.js', 'docs\design-detail.md', 'tools\check-conventions.mjs',
  'docs\improve-generating-phase-1\evidence\sa-opus\p1-full-node26.log',
  'docs\improve-generating-phase-1\evidence\sa-opus\p1-full-node22.log',
  'docs\improve-generating-phase-1\evidence\sa-opus\p1-fixtures.log',
  'docs\improve-generating-phase-1\evidence\sa-opus\p1-replay-case.log',
  'docs\improve-generating-phase-1\evidence\sa-opus\p1-verify.log'
)
$inputs = @($inputFiles | ForEach-Object {
  [ordered]@{ path = $_.Replace('\', '/'); sha256 = (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLowerInvariant() }
})
$scratch = "$here\pack-r1-scratch"
if (Test-Path -LiteralPath $scratch) { throw 'Owned dry-run folder already exists' }
New-Item -ItemType Directory -Path $scratch | Out-Null
try {
  Invoke-Expression $guardBlocks[1] | Out-Null
  Assert-R1 $true 'G-PROTECTED passes on untouched assigned tree'
  Expect-Rejection { Invoke-Expression $guardBlocks[3] } 'G-STAGE rejects the unedited base tree'
  $test = [IO.File]::ReadAllText('tests\generate.test.js')
  $start = $test.IndexOf("describe('deterministic parallel simulation', () => {")
  $end = $test.IndexOf("describe('recorded generation fixture', () => {", $start)
  $oldName = 'pool sizes 1-4 and shuffled completion orders agree on'
  $newName = 'pool sizes 1-4 and 8 with shuffled completion orders agree on'
  $edit = $test.Substring($start, $end - $start).Replace($oldName, $newName).Replace('for (const width of [1, 2, 3, 4]) {', 'for (const width of [1, 2, 3, 4, 8]) {')
  $testCopy = "$scratch\generate.test.js"
  $docCopy = "$scratch\design-detail.md"
  [IO.File]::WriteAllText($testCopy, $test.Substring(0, $start) + $edit + $test.Substring($end), $utf8)
  $doc = [IO.File]::ReadAllText('docs\design-detail.md')
  [IO.File]::WriteAllText($docCopy, $doc.Replace('Fold determinism: identical output for pool sizes 1 and 4 and shuffled completion orders (simulated).',
    'Fold determinism: identical output for simulated pool widths 1, 2, 3, 4 and 8 and three shuffled completion orders, against the serial fold. Width 8 is a test-only simulation; the production pool remains limited to four.'), $utf8)
  $stageHits = $guardBlocks[3].Substring($guardBlocks[3].IndexOf('function Get-Hits'))
  Invoke-Expression ($stageHits.Replace("'tests\generate.test.js'", "'$testCopy'").Replace("'docs\design-detail.md'", "'$docCopy'")) | Out-Null
  Assert-R1 $true 'G-STAGE line checks pass on the edited scratch copies'
  $numTest = @(git --no-pager diff --no-index --numstat -- tests\generate.test.js $testCopy)
  Assert-R1 ($LASTEXITCODE -eq 1 -and $numTest.Count -eq 1 -and $numTest[0] -cmatch "^2`t2`t") 'Git confirms exactly two test-line replacements'
  $numDoc = @(git --no-pager diff --no-index --numstat -- docs\design-detail.md $docCopy)
  Assert-R1 ($LASTEXITCODE -eq 1 -and $numDoc.Count -eq 1 -and $numDoc[0] -cmatch "^1`t1`t") 'Git confirms exactly one specification-line replacement'

  $Plan = 'eca0f94717a56de43c52f6cb54d739360670fef8'
  $Q = $Plan
  $d = 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4'
  $Tested = @('core', 'generator', 'player', 'assets', 'index.html', 'redirect.js', 'sitemap.xml', 'tests', 'tools', 'package.json', '.github')
  $Site = @('index.html', 'redirect.js', 'sitemap.xml', 'assets', 'core', 'generator', 'player')
  $V = "$scratch\verification"
  $FW = "$scratch\fold-width8"
  $id = 'sa-astra-r1-dry-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
  $dir = "$V\$id"
  New-Item -ItemType Directory -Path $dir | Out-Null
  New-Item -ItemType Directory -Path $FW | Out-Null
  $oldEvidence = 'docs\improve-generating-phase-1\evidence\sa-opus'
  $oldSummary = Get-Content -LiteralPath "$oldEvidence\p1-verify.log"
  $results = @()
  foreach ($g in @(
    @{ id = 'full-node26'; old = 'p1-full-node26.log'; task = 'P1-SAO full node26'; which = 'self'; args = @('--test', '--test-reporter=tap', 'tests/**/*.test.js') },
    @{ id = 'fixtures'; old = 'p1-fixtures.log'; task = 'P1-SAO fixtures'; which = 'self'; args = @('tools\record-fixtures.mjs', '--check') },
    @{ id = 'replay-case'; old = 'p1-replay-case.log'; task = 'P1-SAO replay case'; which = 'self'; args = @('tools\record-fixtures.mjs', '--replay-case', '--check') },
    @{ id = 'full-node22'; old = 'p1-full-node22.log'; task = 'P1-SAO full node22'; which = 'IG_NODE22'; args = @('--test', '--test-reporter=tap', 'tests/**/*.test.js') }
  )) {
    $log = "$dir\$($g.id).log"
    $helper = "$dir\$($g.id).helper.log"
    $task = "P1-03b $($g.id)"
    [IO.File]::WriteAllText($log, [IO.File]::ReadAllText("$oldEvidence\$($g.old)").Replace($oldName, $newName), $utf8)
    $oldHelper = @($oldSummary | Where-Object { $_ -clike "$($g.task): IG $($g.task) exit=*" })
    Assert-R1 ($oldHelper.Count -eq 1) "One historical helper line for $($g.id)"
    $line = $oldHelper[0].Substring($g.task.Length + 2).Replace("IG $($g.task) ", "IG $task ")
    [IO.File]::WriteAllText($helper, "$line`n", $utf8)
    $results += [ordered]@{ id = $g.id; task = $task; which = $g.which; args = $g.args; exit = 0; seconds = $null
      log = $log.Replace('\', '/'); helperLog = $helper.Replace('\', '/') }
  }
  $v26 = [regex]::Match((Get-Content -LiteralPath "$dir\full-node26.log" -TotalCount 1), ' (v26\.\d+\.\d+); node ').Groups[1].Value
  $v22 = [regex]::Match((Get-Content -LiteralPath "$dir\full-node22.log" -TotalCount 1), ' (v22\.\d+\.\d+); node ').Groups[1].Value
  $fv = $v26
  $caseLines = @(Get-Content -LiteralPath "$dir\full-node26.log" | Where-Object { $_ -cmatch $Fold[0] -or $_ -cmatch $Fold[1] })
  Assert-R1 ($caseLines.Count -eq 2) 'Both renamed cases present in the copied log'
  $focused = (@("p1-run: C:\synthetic\node.exe $fv; node --test copied-example") + $caseLines +
    @('# pass 2', '# fail 0', '# cancelled 0', 'p1-run: exit 0')) -join "`n"
  [IO.File]::WriteAllText("$FW\run.log", "$focused`n", $utf8)
  [IO.File]::WriteAllText("$FW\helper.log", "IG P1-02 fold8 exit=0 seconds=40.5 quiet=45`n", $utf8)
  ConvertTo-CrlfLog $FW
  Invoke-Expression $qualification[2]
  Assert-R1 ([math]::Abs($total - 531.529) -lt 0.0001) 'Block C computes 531.529 illustrative seconds from old logs plus the 40.5-s synthetic focused result'
  Invoke-Expression $qualification[3]
  Assert-R1 (-not (Test-Path -LiteralPath $own)) 'Block D cleans its owned staged site'
  $generated = @(Get-ChildItem -LiteralPath $V -Recurse -File) + @(Get-ChildItem -LiteralPath $FW -File)
  $FormatFiles = @($generated | ForEach-Object { [IO.Path]::GetRelativePath($root, $_.FullName) })
  Invoke-Expression $guardBlocks[5]
  Assert-R1 ($generated.Count -eq 15) 'All 15 generated example files pass strict G-FORMAT'
  Assert-R1 ($index.site.files -eq 120) 'Static site has the 120 tracked files'
  Assert-R1 ($index.focused.node -ceq $fv -and $index.node.node22 -ceq $v22) 'Actual log versions retained, including the focused runtime'
  $indexAgain = Get-Content -Raw -LiteralPath "$V\index.json" | ConvertFrom-Json
  Assert-R1 ($indexAgain.gates.Count -eq 4 -and $indexAgain.evidence.Count -eq 11 -and $indexAgain.focused.files.Count -eq 2) 'Index fields and evidence cardinality round-trip'
  $goodRun = [IO.File]::ReadAllText("$FW\run.log")
  $goodHelper = [IO.File]::ReadAllText("$FW\helper.log")
  $probe = { Test-GateLog "$FW\run.log" "$FW\helper.log" 'P1-02 fold8' 26 @('# pass 2', '# fail 0', '# cancelled 0', 'p1-run: exit 0') $Fold }
  foreach ($case in @(
    @{ name = 'missing pass line'; run = $goodRun.Replace('# pass 2', '# pass 1'); helper = $goodHelper },
    @{ name = 'duplicate pass line'; run = $goodRun + "# pass 2`r`n"; helper = $goodHelper },
    @{ name = 'missing selected case'; run = $goodRun.Replace('agree on fixture-set-0', 'agree on another-seed'); helper = $goodHelper },
    @{ name = 'selected case skipped'; run = $goodRun.Replace('agree on fixture-set-0', 'agree on fixture-set-0 # SKIP'); helper = $goodHelper },
    @{ name = 'wrong Node major'; run = $goodRun.Replace(" $fv;", ' v22.23.5;'); helper = $goodHelper },
    @{ name = 'empty output'; run = ''; helper = $goodHelper },
    @{ name = 'nonzero helper'; run = $goodRun; helper = $goodHelper.Replace('exit=0', 'exit=1') },
    @{ name = 'short quiet'; run = $goodRun; helper = $goodHelper.Replace('quiet=45', 'quiet=15') },
    @{ name = 'overlong gate'; run = $goodRun; helper = $goodHelper.Replace('seconds=40.5', 'seconds=301') },
    @{ name = 'duplicate helper status'; run = $goodRun; helper = $goodHelper + $goodHelper }
  )) {
    [IO.File]::WriteAllText("$FW\run.log", $case.run, $utf8)
    [IO.File]::WriteAllText("$FW\helper.log", $case.helper, $utf8)
    Expect-Rejection $probe $case.name
  }
  [IO.File]::WriteAllText("$FW\run.log", $goodRun, $utf8)
  [IO.File]::WriteAllText("$FW\helper.log", $goodHelper, $utf8)
  $rawChecks = $guardBlocks[4].Substring($guardBlocks[4].IndexOf('foreach ($f in @($index.evidence)'))
  Invoke-Expression $rawChecks | Out-Null
  Assert-R1 $true 'G-QUALIFIED raw-hash loop accepts unchanged example bytes'
  [IO.File]::WriteAllText("$FW\run.log", $goodRun.Replace("`r`n", "`n"), $utf8)
  Expect-Rejection { Invoke-Expression $rawChecks } 'Raw-hash loop rejects an LF-only rewrite with identical text'
  [IO.File]::WriteAllText("$FW\run.log", $goodRun, $utf8)
  foreach ($case in @(
    @{ name = 'LF-only format'; file = 'lf.txt'; bytes = [Text.Encoding]::UTF8.GetBytes("x`n") },
    @{ name = 'Markdown hard-break whitespace'; file = 'hard-break.md'; bytes = [Text.Encoding]::UTF8.GetBytes("x  `r`n") },
    @{ name = 'missing final newline'; file = 'no-newline.txt'; bytes = [Text.Encoding]::UTF8.GetBytes('x') },
    @{ name = 'BOM'; file = 'bom.txt'; bytes = [byte[]](0xef, 0xbb, 0xbf, 0x78, 13, 10) },
    @{ name = 'invalid UTF-8'; file = 'invalid.txt'; bytes = [byte[]](0xff, 13, 10) }
  )) {
    $bad = "$scratch\$($case.file)"
    [IO.File]::WriteAllBytes($bad, $case.bytes)
    $FormatFiles = @($bad)
    Expect-Rejection { Invoke-Expression $guardBlocks[5] 2>&1 | Out-Null } $case.name
  }
  [IO.File]::WriteAllText("$scratch\body-source.md", "# Synthetic publication body`r`n`r`nReview fixture, not a phase-1 completion claim.`r`n", $utf8)
  $fork = $Plan
  $bodyBlock = $publication[3].Replace("'tests\artifacts\improve-generating-phase-1\P1-05'", "'$scratch\publication'").Replace(
    "'docs\improve-generating-phase-1\pr-body.md'", "'$scratch\body-source.md'")
  Invoke-Expression $bodyBlock
  Assert-R1 ((& $norm ([IO.File]::ReadAllText("$raw\body.md"))) -ceq (& $norm $body)) 'Publication footer survives the required CRLF file round trip'
  $FormatFiles = @("$raw\body.md")
  Invoke-Expression $guardBlocks[5]
  Assert-R1 $true 'Publication body passes strict format check'
  foreach ($f in $inputs) {
    Assert-R1 ((Get-FileHash -LiteralPath $f.path.Replace('/', '\') -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $f.sha256) "Input unchanged: $($f.path)"
  }
  $tracked = @(git --no-pager diff --exit-code $Plan -- .)
  Assert-R1 ($LASTEXITCODE -eq 0 -and $tracked.Count -eq 0) 'No tracked production, tests, plans or old evidence changed'
  $result = [ordered]@{
    base = $Plan; scope = 'Literal command validation only: copied/renamed old logs and synthetic focused data, not a qualification or a test run.'
    engineInvocations = 0; remoteMutations = 0; parsedPowerShellBlocks = $blockCount
    dotNetBefore = $beforeNet; relativeBefore = $beforeRelative; relativeAfter = $afterRelative
    illustrativeNodePlusQuietSeconds = $total; illustrativeFiles = $generated.Count; stagedSiteFiles = $index.site.files
    checks = @($checks); negativeCases = @($negative); inputs = $inputs
  }
} finally {
  Remove-Item -LiteralPath $scratch -Recurse -Force
}
$result.scratchRemoved = -not (Test-Path -LiteralPath $scratch)
$out = (($result | ConvertTo-Json -Depth 6) -replace '\r?\n', "`r`n") + "`r`n"
[IO.File]::WriteAllText("$here\pack-r1-dryrun.json", $out, $utf8)
$md = @(
  '# Phase-1 pack review-1 dry run (SA-Astra)', '',
  'Command, from Q:\git: `pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-astra\pack-r1-dryrun.ps1`.', '',
  'Task-command validation only. The full logs are copies of round-1 observations with case titles renamed;',
  'the focused result is synthetic. No test runner, lock invocation, measured row or GitHub mutation ran.',
  'All example records and staged copies were removed; they are not task-completion evidence.', '',
  "- Parsed PowerShell blocks: $blockCount.",
  "- Checks passed: $($checks.Count); negative cases rejected: $($negative.Count).",
  "- .NET directory before: ``$beforeNet``; after: ``$root``.",
  "- Static-site files: $($index.site.files); example files passing G-FORMAT: $($generated.Count).",
  "- Illustrative node+quiet arithmetic: $total s (old log durations plus synthetic focused 40.5 s); not new machine time.",
  "- Scratch removed: $($result.scratchRemoved).", '',
  'See `pack-r1-dryrun.json` for cases, checked input hashes and exact errors.', ''
)
[IO.File]::WriteAllText("$here\pack-r1-dryrun.md", $md -join "`r`n", $utf8)
$md
