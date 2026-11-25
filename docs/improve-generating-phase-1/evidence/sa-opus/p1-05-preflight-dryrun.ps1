# SA-Opus, improve-generating phase 1, review of the task pack (review-1.md, R1-4): a read-only dry run of the proposed
# single-push P1-05: step 1's preflight against the live remote and PR #11, and step 4's body composition with a
# stand-in pr-body.md (the joint plan) and a stand-in fork SHA (HEAD), written to a git-ignored scratch folder that is
# removed. No commit, push or PR edit. It writes p1-05-preflight-dryrun.md here.
#   Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-05-preflight-dryrun.ps1
$report = [Collections.Generic.List[string]]::new()

# ---- Step 1 as proposed (G-PROTECTED, G-QUALIFIED and npm run check are tested elsewhere) ----
Set-Location Q:\git\pentomino
[Environment]::CurrentDirectory = (Get-Location).Path
$ErrorActionPreference = 'Stop'
$env:GIT_TERMINAL_PROMPT = '0'
$env:GH_PROMPT_DISABLED = '1'
$Main = 'b5eb85805f609af7deaa2489eb08675c60b2cc49'
$Before = '826ce79dcc4a77daaaea00894a6dcea46bcbd8b7'
$Fields = 'number,state,mergedAt,headRefName,headRefOid,baseRefName,baseRefOid,body,url'
if ((git --no-pager branch --show-current) -ne 'improve-generating') { throw 'QUESTION: not on improve-generating' }
if ((git --no-pager remote get-url origin) -ne 'https://github.com/tdat00/pentomino.git') { throw 'QUESTION: unexpected origin URL' }
function Get-Remote {
  $r = @{}
  foreach ($l in @(git --no-pager ls-remote origin refs/heads/main refs/heads/improve-generating)) { $sha, $ref = $l -split '\s+'; $r[$ref] = $sha }
  if ($LASTEXITCODE -ne 0) { throw 'QUESTION: git ls-remote failed' }
  $r
}
$remote = Get-Remote
$pr = gh pr view 11 --repo tdat00/pentomino --json $Fields | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: gh pr view failed' }
if ($remote['refs/heads/main'] -ne $Main -or $remote['refs/heads/improve-generating'] -ne $Before -or $pr.number -ne 11 -or
  $pr.state -ne 'OPEN' -or $null -ne $pr.mergedAt -or $pr.headRefName -ne 'improve-generating' -or $pr.headRefOid -ne $Before -or
  $pr.baseRefName -ne 'main' -or $pr.baseRefOid -ne $Main) { throw 'QUESTION: unexpected remote or PR state' }
git --no-pager merge-base --is-ancestor $Before HEAD
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: the push would not be a fast-forward' }
$scope = @(git --no-pager diff --name-only eca0f94 HEAD | Where-Object {
    $_ -notmatch '^(tasks|docs)/improve-generating-phase-1/' -and $_ -ne 'tests/generate.test.js' -and $_ -ne 'docs/design-detail.md' })
if ($scope) { throw "QUESTION: out-of-scope changes since eca0f94: $($scope -join ', ')" }
$report.Add("- Step 1 preflight: pass. Remote main $($remote['refs/heads/main']); remote head $($remote['refs/heads/improve-generating']);" +
  " PR #$($pr.number) $($pr.state), mergedAt null, $($pr.headRefName) -> $($pr.baseRefName), base $($pr.baseRefOid.Substring(0, 7));" +
  " fast-forward from $($Before.Substring(0, 7)) to HEAD $((git --no-pager rev-parse --short HEAD).Trim()); out-of-scope paths since eca0f94: none.")

# ---- Step 4 body composition as proposed, with stand-ins ----
$fork = (git --no-pager rev-parse HEAD).Trim()
$raw = 'tests\artifacts\improve-generating-phase-1\P1-05-dryrun'
New-Item -ItemType Directory -Path $raw | Out-Null
try {
  $norm = { param([string]$t) ($t -replace "`r`n", "`n").TrimEnd() + "`n" }
  $footer = "## Published phase-1 checkpoint`n`nPublished head and phase-2 fork point: ``$fork``.`n`nPhase 2 will branch ``gen-v4`` from this commit and use a separate PR into ``main``. Neither PR is merged.`nThe phase-2 PR initially includes the unmerged phase-1 prefix and must disclose that dependency.`n"
  $body = (& $norm ([IO.File]::ReadAllText('docs\improve-generating-phase-1\plan.md'))).TrimEnd() + "`n`n" + $footer
  [IO.File]::WriteAllText("$raw\body.md", $body, [Text.UTF8Encoding]::new($false))
  $written = [IO.File]::ReadAllText("$raw\body.md")
  $tail = @(($written -split "`n") | Select-Object -Last 6)
  $report.Add("- Step 4 body: $($written.Length) chars; normalized equality with itself after a CRLF round trip:" +
    " $((& $norm ($written -replace "`n", "`r`n")) -ceq (& $norm $body)); footer lines:")
  foreach ($t in $tail) { $report.Add("  - ``$t``") }
  $report.Add("- Current PR #11 body under the same normalization: $((& $norm $pr.body).Length) chars (read only).")
} finally {
  Remove-Item -LiteralPath $raw -Recurse -Force
  if (-not (Get-ChildItem -LiteralPath 'tests\artifacts\improve-generating-phase-1' -Force)) { Remove-Item -LiteralPath 'tests\artifacts\improve-generating-phase-1' }
}
$out = @('# P1-05 proposed single push: read-only dry run (SA-Opus)', '',
  'Command: `Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-05-preflight-dryrun.ps1`',
  '(read-only: no commit, push or PR edit; stand-ins: plan.md for pr-body.md, HEAD for the fork SHA).', '') + $report
[IO.File]::WriteAllText('docs\improve-generating-phase-1\evidence\sa-opus\p1-05-preflight-dryrun.md', ((($out | ForEach-Object { "$_".TrimEnd() }) -join "`r`n") + "`r`n"), [Text.UTF8Encoding]::new($false))
$out
