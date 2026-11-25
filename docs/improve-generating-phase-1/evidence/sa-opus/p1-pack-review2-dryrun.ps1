# SA-Opus, improve-generating phase 1, review 2 of the task pack (review-2.md): runs literal PowerShell blocks of the
# revised pack that SA-Astra's pack-r1-dryrun.ps1 does not execute, extracted from the task files themselves:
# the check-list's shared block and G-WORKTREE; P1-03b block A (verification and focused folders redirected to a
# git-ignored scratch folder, adoption.json replaced by a stub holding only source.currentDigest, synthetic focused
# logs); P1-05 step 1 (read-only Git and GitHub reads against the live remote and PR #11); P1-05 step 5 (read-only,
# with the current head and body standing in for the fork and the published body); and P1-03b step 3's allow-list
# expression. No lock, no test runner, no commit, push or PR edit. It writes p1-pack-review2-dryrun.md here and
# removes the scratch folder.
#   Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review2-dryrun.ps1
$report = [Collections.Generic.List[string]]::new()
$report.Add("- .NET current directory at start: $([Environment]::CurrentDirectory).")
$root = 'Q:\git\pentomino'
$pack = "$root\tasks\improve-generating-phase-1"
function Get-Blocks([string]$Path) {
  foreach ($m in [regex]::Matches([IO.File]::ReadAllText($Path), '(?ms)^[ \t]*```powershell[ \t]*\r?\n(.*?)^[ \t]*```[ \t]*\r?$')) {
    # Remove the list indentation of blocks nested in numbered steps.
    $text = $m.Groups[1].Value
    $indent = [regex]::Match($text, '^[ \t]*').Value
    ($text -split '\r?\n' | ForEach-Object { if ($indent -and $_.StartsWith($indent)) { $_.Substring($indent.Length) } else { $_ } }) -join "`n"
  }
}
$guards = @(Get-Blocks "$pack\check-list.md")
$qual = @(Get-Blocks "$pack\P1-03b-current-qualification.md")
$pub = @(Get-Blocks "$pack\P1-05-publish-phase-one.md")
$report.Add("- Literal blocks: check-list $($guards.Count), P1-03b $($qual.Count), P1-05 $($pub.Count).")
function Expect-Throw([scriptblock]$Action, [string]$Label) {
  try { & $Action | Out-Null; $report.Add("- $Label`: NOT rejected (wrong)") } catch { $report.Add("- $Label`: rejected ($($_.Exception.Message))") }
}

# ---- check-list shared block (literal) ----
Invoke-Expression $guards[0]
$report.Add("- Shared block: location $((Get-Location).Path); .NET directory $([Environment]::CurrentDirectory).")
$scratch = 'tests\artifacts\improve-generating-phase-1\review2-dryrun'
if (Test-Path -LiteralPath $scratch) { throw 'the dry-run scratch folder exists' }
New-Item -ItemType Directory -Path $scratch | Out-Null
try {
  # ---- G-WORKTREE (literal), with today's untracked files as the allow-list, then with one missing ----
  $now = @(git --no-pager -c core.quotepath=false status --porcelain=v1 --untracked-files=all | ForEach-Object { $_.Substring(3) })
  $Allowed = $now
  Invoke-Expression $guards[2] | Out-Null
  $report.Add("- G-WORKTREE accepts the $($now.Count) current untracked paths when all are allowed.")
  $Allowed = @($now | Select-Object -Skip 1)
  Expect-Throw { Invoke-Expression $guards[2] } 'G-WORKTREE with one current path not allowed'

  # ---- P1-03b block A (literal, with the scratch substitutions) ----
  $sv = "$scratch\verification"
  $sf = "$scratch\fold-width8"
  New-Item -ItemType Directory -Path $sf | Out-Null
  [IO.File]::WriteAllText("$scratch\adoption.json", '{ "source": { "currentDigest": "a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4" } }' + "`r`n", $utf8)
  $v26now = (node --version).Trim()
  $okLines = @(Get-Content -LiteralPath 'docs\improve-generating-phase-1\evidence\sa-opus\p1-full-node26.log' | Where-Object { $_ -like '*ok * - pool sizes 1-4 and shuffled completion orders agree on *' } |
    ForEach-Object { $_.Replace('pool sizes 1-4 and shuffled', 'pool sizes 1-4 and 8 with shuffled') })
  [IO.File]::WriteAllText("$sf\run.log", ((@("p1-run: C:\Program Files\nodejs\node.exe $v26now; node --test --test-reporter=tap --test-name-pattern=pool sizes 1-4 and 8 with shuffled completion orders tests\generate.test.js") + $okLines + @('# tests 2', '# suites 1', '# pass 2', '# fail 0', '# cancelled 0', '# skipped 0', '# todo 0', 'p1-run: exit 0')) -join "`r`n") + "`r`n", $utf8)
  [IO.File]::WriteAllText("$sf\helper.log", "IG P1-02 fold8 exit=0 seconds=40.5 quiet=45`r`n", $utf8)
  $blockA = $qual[0].Replace("'docs\improve-generating-phase-1\evidence\verification'", "'$sv'").Replace(
    "'docs\improve-generating-phase-1\evidence\fold-width8'", "'$sf'").Replace(
    'docs\improve-generating-phase-1\evidence\adoption.json', "$scratch\adoption.json")
  if ($blockA -ceq $qual[0] -or $blockA -notlike "*$sv*" -or $blockA -notlike "*$scratch\adoption.json*") { throw 'block A substitutions did not apply' }
  Invoke-Expression $blockA
  $report.Add("- P1-03b block A: pass. Q $Q; Node $v26 and $v22; digest $d; focused $fr s on $fv; attempt folder created: $(Test-Path -LiteralPath $dir).")
  $stub = Get-Content -Raw -LiteralPath "$scratch\adoption.json"
  [IO.File]::WriteAllText("$scratch\adoption.json", $stub.Replace('a51e8196', 'b51e8196'), $utf8)
  $id0 = $id
  Expect-Throw { Invoke-Expression $blockA } 'P1-03b block A with a different adoption digest'
  [IO.File]::WriteAllText("$scratch\adoption.json", $stub, $utf8)
  [IO.File]::WriteAllText("$sf\helper.log", "IG P1-02 fold8 exit=0 seconds=40.5 quiet=15`r`n", $utf8)
  Expect-Throw { Invoke-Expression $blockA } 'P1-03b block A with a focused helper line at quiet 15'

  # ---- P1-03b step 3's allow-list expression (literal), with $dir from block A ----
  $dir = "$sv\$id0"
  [IO.File]::WriteAllText("$dir\example.log", "x`r`n", $utf8)
  Invoke-Expression $qual[4]
  $report.Add("- P1-03b step 3 lists: $($Allowed.Count) allowed paths, the last $($Allowed[-1]); $($FormatFiles.Count) format paths.")

  # ---- P1-05 step 1 (literal; read-only Git and GitHub reads) ----
  Invoke-Expression $pub[0]
  $report.Add("- P1-05 step 1: pass. Remote main $($remote['refs/heads/main']); remote head $($remote['refs/heads/improve-generating']); PR #$($pr.number) $($pr.state), mergedAt null, $($pr.headRefName) -> $($pr.baseRefName); HEAD descends from $($Before.Substring(0, 7)); no out-of-scope commit since eca0f94.")
  Expect-Throw { Invoke-Expression $guards[2] } 'P1-05 G-WORKTREE today (review files still untracked)'

  # ---- P1-05 step 5 (literal; read-only), current head and body standing in for the fork and the body ----
  $fork = $Before
  $norm = { param([string]$t) ($t -replace "`r`n", "`n").TrimEnd() + "`n" }
  $body = $pr.body
  $raw = "$scratch\publication"
  New-Item -ItemType Directory -Path $raw | Out-Null
  $printed = @(Invoke-Expression $pub[5])
  $report.Add("- P1-05 step 5 (stand-ins): pass. Printed: ``$($printed[-1])``; pr-after.json written: $(Test-Path -LiteralPath "$raw\pr-after.json").")
  $body = $pr.body + "`nchanged"
  Expect-Throw { Invoke-Expression $pub[5] } 'P1-05 step 5 with a body that differs from the PR'
} finally {
  Remove-Item -LiteralPath $scratch -Recurse -Force
  if (-not (Get-ChildItem -LiteralPath 'tests\artifacts\improve-generating-phase-1' -Force)) { Remove-Item -LiteralPath 'tests\artifacts\improve-generating-phase-1' }
}
$md = @('# Phase-1 task pack, review 2: literal-block dry run (SA-Opus)', '',
  'Command: `Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review2-dryrun.ps1`',
  '(no lock, no test runner, no commit, push or PR edit; scratch removed).', '') + $report
[IO.File]::WriteAllText("$root\docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review2-dryrun.md", ((($md | ForEach-Object { "$_".TrimEnd() }) -join "`r`n") + "`r`n"), [Text.UTF8Encoding]::new($false))
$md
