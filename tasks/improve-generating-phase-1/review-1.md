# Phase-1 task pack: review 1 (SA-Opus)

| Item | Value |
|---|---|
| Pack | `tasks/improve-generating-phase-1/`: check-list, P1-01, P1-02, P1-03a, P1-03b, P1-04, P1-05 (pack author SA-Astra), read uncommitted on 2026-11-25 |
| Plan | `docs/improve-generating-phase-1/plan.md`, final at `eca0f94` |
| Reviewer | SA-Opus |
| Verdict | **Changes requested.** The pack is right in substance and route but out of proportion in method; one step would fail in execution and one format gate checks nothing. Apply R1-1 to R1-11, or answer them with evidence; then I sign. |

## 1. Summary

1. **Faithful to the plan.**
   - Traceability is complete, and the developer never commits or pushes.
   - The route is D-P1-07/D-P1-08: PR #11 into `main`; phase 2 on `gen-v4` from the published close-out, in a new PR into `main`; neither PR is merged.
   - The PR body covers every item of plan §4.7, including N-P1-DOC. Code claims hold at `eca0f94`, except one section number (R1-10).
2. **Out of proportion.**
   - Plan §8 sizes phase 1 at about 2.7 hours: P1-01 SA 1 h, P1-02 0.5 h, P1-03 orchestrator 0.5 h, P1-04 SA 0.5 h, P1-05 0.2 h.
   - The pack asks for 7 developer hours plus 1.15 orchestrator hours. Almost all of it builds machinery the plan does not ask for:
     - a P1-01 reader with I/O seams, stage transforms, a live-check contract and four in-memory probes;
     - a whole new five-mode qualification reader (P1-03a) with six probes;
     - a publication made of two pushes and two description edits, with a self-reference rule and three record files.
   - The runtime is already built and unchanged; the only change is three lines of test and specification text. Git already binds every file by content, so most of this machinery re-proves what `git diff --exit-code` proves.
3. **The replacements keep every guarantee of the plan.** That is: fail-closed gates, write-once records, exact log checks, source binding, the static-site check, and fast-forward-only publication. Each replacement was dry-run (section 5). Totals: about 2.5 developer hours (1.5 h if SA-Astra writes P1-01, as plan §8 assigns) and about 0.9 orchestrator hours, with the same five locked invocations (at most 1,725 s node+quiet).
4. **One step would fail in execution, and one gate checks nothing.**
   - P1-03b step 4 writes `commands.json` through .NET with a relative path, but the orchestrator's process directory is `Q:\git`. It fails after the four expensive gates (R1-11).
   - `npm run check` never reads `docs/` or `tasks/`, so no command checks the "formats pass" criteria of the document tasks (R1-9).

## 2. Verified claims

Code is at `eca0f94`. [V] means verified in this review.

- `tests/generate.test.js` [V]:
  - `summary` is at :139; `describe('deterministic parallel simulation'` at :774; `simulate` at :782.
  - The seed loop is at :807, the test title at :808 and the targeted loop at :821.
  - The other loop at :420 has the identical text `for (const width of [1, 2, 3, 4]) {`, so P1-02's replacement limited to the block is necessary.
- `docs/design-detail.md` [V]:
  - The old sentence is at :3076, once.
  - The production guarantee "any pool size (1–4)" is at :2190, in §8.2, not §8.4 (R1-10).
- `core/browser/worker-pool.js:75`: `MAX_POOL_SIZE = 4`; the guard is at :195. [V]
- Digest and comparison [V], see `p1-pack-review-checks.md`:
  - `tools/bench/report.js` `computeSourceDigest(readText)` normalizes CRLF, and the worktree digest is `a51e8196…`.
  - In `tools/ig-proto/phase1/p6-bench.mjs`, `compareReports` (:612) re-creates `compare.json` deep-equal, and `renderMarkdown` (:773) re-creates `compare.md` (LF-equal).
- Versions [V]: `provenanceVersions()` plus `APP_VERSION` give `gen-v3 / mixed-v3 / xoshiro128ss-v1 / difficulty-v3 / 1.0.0`. `generation-case.json` and `replay-case.json` store the same tuple.
- The import walk from `core/engine/deduce.js` gives exactly the nine files, each LF-equal to `3fc65f4`. [V]
- Bridges [V]:
  - `3fc65f4`..`b5eb858` on the site paths: empty.
  - `b5eb858`..`eca0f94` on the site paths: the three P6 files.
  - `27c6189`..`eca0f94` on runtime and tests: empty.
  - `tools/record-fixtures.mjs`: +3/−2.
- `p7.json` is tracked and equal to `eca0f94`. 9 of its 12 `meta.inputs` are git-ignored raw files, and the pack rightly does not require them. [V]
- Command interfaces [V]:
  - `tools/stamp-version.mjs <siteDir> <sha8>` (:136-138).
  - `tools/check-site.mjs [root] --expect-version <sha8>` (:242-287).
  - `pages.yml` runs on Node 22, on a push to `main` and on `workflow_dispatch`.
- `Invoke-IgNode` throws on a nonzero exit (without `-AllowExit1`) and on a timeout. It writes `IG <task> exit=<n> seconds=<s> quiet=<q>` with `Write-Host`. [V]
- PR #11 [V]:
  - It is OPEN, `mergedAt` is null, the head `improve-generating` is at `826ce79…` and the base `main` is at `b5eb858…` (= `origin/main`).
  - The origin is `https://github.com/tdat00/pentomino.git`.
  - `gh pr view --json baseRefOid,…` works (gh 2.105.0).
- T14 [V]:
  - 2,244.925 of 2,700 counted seconds.
  - 35/35 equal pairs; 10x10 has 4/5 ten with an equal 9/9 pair.
  - The limits are 1,610,612,736 and 1,254,096,896 bytes.
  - The phase-0 line is at `V4-S4F/verdicts.md:316`.
- Width 8 adds no test case, so the full counts stay 1,514 tests and 128 suites. [A] The edit keeps the same two parameterized tests. P1-03b's exact-line check fails closed if this is wrong.
- `check-conventions.mjs` covers only `core generator player tools tests .github` plus root files, and skips `artifacts` (:6-9). Its doc comment says "Historical docs, tasks and prototypes are out of scope" (:90-91). [V]
- PowerShell 7.6.10, with `$PSNativeCommandUseErrorActionPreference` False: a nonzero native exit does not throw, so each `$LASTEXITCODE` check is needed. [V]

## 3. Findings and exact replacement text

### R1-1 (major, proportionality): withdraw P1-03a; P1-03b runs a literal fail-closed sequence

**Why.**

- Plan §4.6 requires these items:
  - four locked gates: fail-closed, no `-AllowExit1`, a fresh attempt folder, output preserved;
  - an owned static-site stamp and check, with a manifest and clean-up;
  - "a `qualifiedCommit`, runtime digest and tested-file hashes in the final verification index". Later documentation-only commits may reuse them "after proving runtime/tests/workflow unchanged".
- Plan §8 gives P1-03 to the orchestrator, at about 0.5 h.
- P1-03a adds a 2.5-hour program to check what a short PowerShell sequence checks directly:
  - five CLI modes and five exported functions, with I/O seams;
  - six data probes;
  - before, commands and site records.
- Its `verify` mode re-hashes committed files at later commits. Git's content addressing and one `git diff --exit-code <qualifiedCommit> -- <tested paths>` prove the same thing (G-QUALIFIED, R1-8).
- Blocks A, C and D below were dry-run on the round-1 logs, from `Q:\git` as the orchestrator runs. All 15 generated files pass G-FORMAT, and nine negative probes are rejected (`p1-03b-dryrun.md`).

**Changes.**

1. Delete `tasks/improve-generating-phase-1/P1-03a-qualification-reader.md`.
2. In P1-03b, replace these header rows:

   | Item | Value |
   |---|---|
   | Feature, plan | `improve-generating-phase-1`; plan §4.6, P1-T04-T09, §8 P1-03; D-P1-03/D-P1-05 |
   | Depends on | P1-02 accepted and committed |
   | Estimate | developer 0 h, orchestrator 0.5 h plus lock contention; machine about 7.4 min node+quiet before the extra width, four invocations at most 1,380 s |

3. Replace the second and fourth bullets of Authority:
   - Use `E/sa-opus/p1-run.mjs` (the runner of plan §4.6), the lock helper, `tools/stamp-version.mjs`, `tools/check-site.mjs` and Git. No code change and no new program in this task.
   - Read this task, the check-list (§3.2 shared log-check block, §3.3 guards), plan §4.6 and `.github/workflows/pages.yml`.
4. Replace Scope with:
   - Create `docs/improve-generating-phase-1/evidence/verification/<attempt>/` with the four run logs, the four helper logs, `conventions.log`, `site.log`, `tested-files.txt` and any failure output.
   - Create `docs/improve-generating-phase-1/evidence/verification/index.json` and `summary.md` once, only after every check has passed.
   - The staged site is a temporary owned copy under `tests/artifacts/improve-generating-phase-1/<attempt>/site/`, removed after its check.
   - Change only orchestrator bookkeeping. No source, test, fixture, tool, guide or earlier record.
   - G-PROTECTED empty; G-STAGE passes; G-WORKTREE only these new paths and bookkeeping; G-QUALIFIED after the commit.
5. Replace Steps 1-6 with:

   1. Run, in this order and in **one** PowerShell session: the check-list's §3.2 shared block, then blocks A, B, C and D. Variables do not survive a new tool call.
      - If the run outlives the tool's initial wait, read that session; never start a second copy.
      - Any `throw` stops the sequence. Keep the attempt folder and send `QUESTION:` with the message. Do not retry, and do not resume a partial attempt.
      - The Node 22 path below is this host's supplied value, recorded at the base in `E/sa-opus/p1-verify.ps1`, not a portable default. If it is missing or wrong, send a QUESTION; no `npx` download.

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
      if ((git --no-pager branch --show-current) -ne 'improve-generating') { throw 'QUESTION: not on improve-generating' }
      git --no-pager merge-base --is-ancestor $Plan HEAD
      if ($LASTEXITCODE -ne 0) { throw 'QUESTION: the plan commit is not an ancestor of HEAD' }
      if (git --no-pager status --porcelain --untracked-files=all -- $Tested) { throw 'QUESTION: tested paths have uncommitted or untracked changes' }
      # paste G-STAGE (check-list §3.3) here
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
      ```

      **Block B: the four locked gates.** Use the current step-3 code block, unchanged.

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
        $total += $r.seconds + 45
      }
      $fr = Test-GateLog "$FW\run.log" "$FW\helper.log" 'P1-02 fold8' 26 @('# pass 2', '# fail 0', '# cancelled 0', 'p1-run: exit 0') $Fold
      $total += $fr + 45
      if ($total -gt 1725) { throw "QUESTION: $total node+quiet seconds exceed 1,725" }
      ```

      **Block D: conventions, static site and records, unlocked.**

      ```powershell
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
      ```

   2. Read `summary.md` against the logs, not just the shell's final exit:
      - each full suite: 1,514 tests, all passing, 128 suites, no failed, cancelled, skipped or todo test;
      - both renamed fold cases appear in each full log;
      - the fixture and replay markers are correct;
      - the actual Node versions are recorded, every helper line shows quiet 45, and each duration is at most 300 s;
      - the staged site matches the qualified SHA8;
      - the five-invocation total includes the P1-02 focused run once and is at most 1,725 node+quiet seconds.

      The Node 22 run is Windows verification, not an Ubuntu CI result.
   3. Run G-PROTECTED, G-STAGE, G-WORKTREE, and G-FORMAT on every new file of the attempt plus `index.json` and `summary.md`. The orchestrator commits the attempt folder, `index.json` and `summary.md` as the P1-03b commit. Then it runs G-QUALIFIED once: a Git check, not a suite. A failed attempt, if a ruling allows a new one, stays archived and is never presented as the successful attempt.
6. Replace the last row of the Tests table with:

   | Test file | Case name | Input | Expected |
   |---|---|---|---|
   | `verification/index.json` | complete binding | the four gate logs and helper logs, the focused logs, the site and the tested-file list | written once, only after blocks C and D pass; G-QUALIFIED passes after the commit |

   Replace its `tools/check-site.mjs` row's Input with "an owned copy stamped with the qualified SHA8; its file set equal to `git ls-tree` at the qualified commit".
7. Replace the Commands and gates table with:

   | Command | Where | Expected | Time limit |
   |---|---|---|---|
   | §3.2 shared block and block A (preflight, G-STAGE, digest) | root, unlocked | no throw; attempt folder created | 2 min |
   | Block B: four `Invoke-IgNode` calls | root | all exit 0, quiet 45 | 300 s Node each, plus lock wait |
   | Blocks C and D | root, unlocked | no throw; `index.json` and `summary.md` written | 3 min |
   | G-PROTECTED, G-STAGE, G-WORKTREE, G-FORMAT; G-QUALIFIED after the commit | root | as defined in check-list §3.3 | 1 min |

8. Technical AC, "How verified":
   - T01: "block C's exact-line checks of both full logs and both fixture logs; clean tested paths; `tested-files.txt`".
   - T02: "block D: staged file set equal to `git ls-tree` at the qualified commit, stamp and check output, owned copy removed".
   - T03: "blocks C and D; `nodePlusQuietSeconds` at most 1,725".

   Evidence for T01-T03: "attempt logs, `site.log`, `index.json`".
9. In the Checklist, replace "Static site cleaned; canonical record verifies" with "Static site cleaned; `index.json` and `summary.md` written once; G-QUALIFIED passes after the commit".

### R1-2 (major, proportionality): P1-01 becomes a retargeted copy of the round-1 audit script

**Why.**

- Plan §4.4 asks for the six record items and "the data-only reader that produces them". Plan §8 assigns P1-01 to SA-Astra, at about 1 h.
- SA-Astra's round-1 `E/sa-astra/phase1-audit.mjs` already does items 2-6, and checks fail-closed before any write:
  - `compareReports`, deep-equal to `compare.json`;
  - raw-hash bindings to `compare.json` and the ledger;
  - `computeSourceDigest`;
  - the frozen and measured diffs;
  - the nine-file closure;
  - the fixtures against `3fc65f4`;
  - an input index with hashes, and the read-only Git command list.
- P1-01 instead specifies a new 3-hour program: an export contract, an I/O seam, stage transforms, a LiveCheck shape, three CLI modes and four probes. Its only consumers are:
  - G-STAGE, which Git does in a few lines (R1-8);
  - later re-checks, which G-PROTECTED and G-QUALIFIED already cover, since every adoption input is a protected path.
- A copy with 26 anchored edits produces the plan's record. I applied the list to a scratch copy:
  - first run: exit 0, `phase1-adoption: recorded eca0f94… (70 rows, 35 equal pairs, 14 memory side-cells)`, with the three bridges, the version tuple, the nine-file closure and 58 indexed inputs;
  - second run: exit 1 (`adoption output exists; the record is written once`), and the outputs are unchanged (`p1-01-edit-proto.md`).

**Changes to P1-01.**

- Header:
  - Executor: "SA-Astra, as plan §8 assigns (SA-Opus reviews), or Dev-Sonnet with the exact edit list below. Both SAs approve the adoption reading."
  - Estimate: "about 1 h; machine 0 measured min, unlocked reads only".
- Goal: delete the last sentence ("Later tasks reuse its checks after the precisely defined fold-test edit."). Later stages use G-STAGE and G-QUALIFIED.
- Authority, last bullet: replace "`E/sa-astra/phase1-audit.mjs` as reference only" with "`E/sa-astra/phase1-audit.mjs` (copied in step 2; the original is not edited)".
- Scope: replace with:
  - Create `docs/improve-generating-phase-1/evidence/adoption-reader.mjs`, `adoption.json` and `adoption.md`.
  - Change no existing file. `E/sa-astra/phase1-audit.mjs` stays byte-identical.
  - Guards:
    - G-PROTECTED;
    - G-WORKTREE (only the three Create paths);
    - `git --no-pager diff --exit-code eca0f94 -- tests docs/design-detail.md`;
    - G-FORMAT on the three files.
- Steps 2-9: replace with:

  2. Copy the historical script, then edit only the copy:

     ```powershell
     Copy-Item docs\improve-generating-phase-1\evidence\sa-astra\phase1-audit.mjs docs\improve-generating-phase-1\evidence\adoption-reader.mjs
     ```

     - Apply exactly the edit list in `docs/improve-generating-phase-1/evidence/sa-opus/p1-01-edit-proto.mjs`, lines 22-144:
       - the 26 entries of `EDITS`, each anchor occurring exactly once;
       - then its two block deletions;
       - then its final `console.log` line.
     - The result, in CRLF, has SHA-256 `cfd0b9639f36293cf97e898a9d10d5f80ef58c62ba65e4c44a6595e379453137` (218 lines).
     - A different hash is allowed only for a change you list in the final report for the SAs' review.
     - What the edits do:

     | Edits | Change |
     |---|---|
     | 1-4 | Header comment; `existsSync`; imports three levels up, adding `renderMarkdown`, `provenanceVersions` and `APP_VERSION`; `ROOT` three parents up; constants `SELF` (the reader's own path, computed at run time), `PLAN`, `MEASURED_NEW`, `MAIN_REFERENCE`, `P6_DIGEST`, `SITE`, `P6_FILES`, `NINE`, `OUT` |
     | 5 | The fixed-base assertion becomes five checks: both outputs absent; `inspected` = HEAD; the plan commit is an ancestor; `origin/main` = `MAIN_REFERENCE`; the tested paths are clean |
     | 6-7 | `compare.json` names `MEASURED_NEW`; `compare.md` re-renders from the recomputation; the digest equals `P6_DIGEST` |
     | 8-11 | The diffs use `inspected`. Three deployed-site bridges: frozen = main; measured = inspected; main to inspected = exactly the three P6 files |
     | 12-13 | The closure drops the git-ignored `tree-frozen` snapshot and must be exactly the nine files |
     | 14-16 | `p7.json` is pinned to its blob at the plan commit; its git-ignored inputs are not re-checked; the wording says context only |
     | 17 | The version tuple `gen-v3 / mixed-v3 / xoshiro128ss-v1 / difficulty-v3 / 1.0.0` is checked, also against the fixtures' stored tuples. The input list becomes the plan, the T14 task and the reader itself |
     | 18-19 | The record keys become `format`, `version`, `planCommit`, `inspectedCommit`, `versions`, `bridges`, and the historical and current statements; the analysis projection is removed |
     | 20 | Writes are exclusive (`flag: 'wx'`), to `adoption.json` and `adoption.md` |
     | 21-26 | Markdown: the title; the inspected and plan line; the bridge and versions line; the P7 context line; the reproduction command; the file names |
     | deletions, last line | The analysis reading list and the `fixtureVerification` projection are removed. The last line prints the one-line result |

  3. Run `node --check docs\improve-generating-phase-1\evidence\adoption-reader.mjs`, then run the reader once: `node docs\improve-generating-phase-1\evidence\adoption-reader.mjs`.
     - It prints `phase1-adoption: recorded <HEAD> (70 rows, 35 equal pairs, 14 memory side-cells)` and writes `adoption.json` and `adoption.md`.
     - A failed check exits 1 before any write. Send a QUESTION. Never patch an input, a constant or a check to make a mismatch vanish.
  4. Record the SHA-256 of both outputs, then run the reader a second time. It must exit 1 with `adoption output exists; the record is written once`, and both hashes must be unchanged.
  5. Run `npm run check`, G-FORMAT on the three files, G-PROTECTED and G-WORKTREE. Report for the two SAs' adoption review. Acceptance requires their approval, not exit 0 alone.

- Tests: replace the table with this text: "No probe suite. The reader fails closed by construction: every read throws on a missing file, every comparison is a `check()` before the first write, and the writes are exclusive. Step 4's second run is the write-once test. The reviewers read the 218-line reader."
- Commands and gates: replace with:

  | Command | Where | Expected | Time limit |
  |---|---|---|---|
  | `node --check docs\improve-generating-phase-1\evidence\adoption-reader.mjs` | root | exit 0 | 30 s |
  | `node docs\improve-generating-phase-1\evidence\adoption-reader.mjs` | root, unlocked | the `recorded` line; both outputs exist | 2 min |
  | the same command again | root | exit 1, `adoption output exists`; output hashes unchanged | 2 min |
  | `npm run check`; G-FORMAT on the three files | root | both OK | 2 min |
  | G-PROTECTED; G-WORKTREE; the diff guard of Scope | root | the stated empty or allowed paths | 1 min |

- Technical AC: replace with:

  | ID | Criterion | How verified | Evidence |
  |---|---|---|---|
  | P1-01-T01 | Complete source, report, ledger, fixture, bridge, version and nine-file bindings | the reader's checks and the record | `adoption.json` |
  | P1-01-T02 | Later stages need no adoption rewrite | G-STAGE and G-QUALIFIED cover the later edit and commits | check-list §3.3 |
  | P1-01-T03 | The record is written once and is reproducible | step 4; the record has no wall-clock field | hashes before and after |
  | P1-01-T04 | Only the three scoped files; formats pass | guards, `npm run check`, G-FORMAT | output |

- Checklist: replace the first two items with "Every step done; the second run refused; guards pass" and "No engine or test-runner invocation, no protected file change, the historical script unchanged".

### R1-3: P1-02 uses G-STAGE (Git) and the shared log check, with no index file

- Authority, last bullet: replace with "Read the two Change files, check-list §3.3 (G-STAGE) and `core/browser/worker-pool.js:75,194-196`."
- Scope:
  - Third bullet: replace with "The orchestrator creates the focused-gate evidence `docs/improve-generating-phase-1/evidence/fold-width8/run.log` and `helper.log`."
  - Last bullet: replace with "Guards: G-PROTECTED empty; G-STAGE passes; G-WORKTREE only these paths and bookkeeping."
- Step 1: replace with "Run `git --no-pager diff --exit-code eca0f94 -- tests docs/design-detail.md`. Expected: no output, exit 0. A difference is a QUESTION."
- Step 3: change the last sentence as R1-10 says.
- Step 4: replace with this text:

  > Run `node --check tests\generate.test.js`, G-STAGE, `npm run check`, G-PROTECTED and G-WORKTREE. Report `READY FOR LOCKED GATE: P1-02` with `git --no-pager diff -- tests/generate.test.js docs/design-detail.md` and those results. The developer does not start a test run. The orchestrator's one focused run below is the acceptance test, which avoids a sixth invocation outside the plan's five.

- Step 5 (orchestrator, before committing): replace the code with:

  ```powershell
  # paste check-list §3.2's shared block first
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
    throw
  }
  ```

  `New-Item` throws if the folder exists. A repeat needs a ruling, which names a new folder.
- Step 6: replace with this text:

  > In the same session run `ConvertTo-CrlfLog $dir`, then `Test-GateLog "$dir\run.log" "$dir\helper.log" 'P1-02 fold8' 26 @('# pass 2', '# fail 0', '# cancelled 0', 'p1-run: exit 0') $Fold`. It prints the node seconds; record them in the execution log. A throw is a QUESTION: keep the folder, no retry. Unselected tests may be reported as skipped. The summary compares status, reason, ordered layout and clue keys, and scores: 30 simulation comparisons. It is not eight physical workers, nor a full-provenance comparison.

- Step 7: replace with "Run G-STAGE, `npm run check` and G-PROTECTED again. The orchestrator commits the two edits and the two logs as one task. No index file."
- Tests table, third row: replace with:

  | Test file | Case name | Input | Expected |
  |---|---|---|---|
  | check-list G-STAGE | G-STAGE | current files after the edit | exactly the planned two and one replacements; nothing else changed under `tests/` or in `docs/design-detail.md` |

- Commands and gates, second row: replace with:

  | Command | Where | Expected | Time limit |
  |---|---|---|---|
  | G-STAGE (check-list §3.3) | root, unlocked | no throw | 1 min |

- AC:
  - P1-02-T01: Evidence "G-STAGE output".
  - P1-02-T02: Evidence "`fold-width8/run.log` and `helper.log`".
- Checklist: replace "Evidence index names actual versions, hashes, case results and helper line" with "`run.log` and `helper.log` pass `Test-GateLog`; node seconds recorded".

### R1-4 (major, proportionality): P1-05 publishes with one push and one description edit

**Why.**

- Plan §4.7 and D-P1-08 ask for:
  - a fast-forward push of the close-out, and PR #11's description rewritten;
  - verification that the published head is the SHA, OPEN, `mergedAt` null, base `main`, head `improve-generating`;
  - that head recorded as the phase-2 fork point.
- The pack's extra parts exist only to put observations made after the push into Git, and then to avoid the self-reference this creates: two pushes, two description edits, `publication.json` and `.md`, raw receipts, and `fork-point.json`.
- The PR description is not in Git, so its footer can carry the pushed SHA with no loop. The SHA then persists in:
  - the PR footer;
  - the final report;
  - phase 2's `request.md`, the first commit on `gen-v4`.

  `git merge-base gen-v4 improve-generating` also recovers it.
- Step 1 says "a different known fast-forward ancestor already explained by task records". That asks the orchestrator to infer. Nothing in this pack pushes earlier, so the remote head must be exactly `826ce79`.
- The read-only parts were dry-run against the live remote and PR #11 (`p1-05-preflight-dryrun.md`).

**Changes to P1-05.**

- Estimate: "developer 0 h, orchestrator 0.3 h; machine 0 measured min, Git and GitHub I/O only".
- Authority, last bullet: replace with this text:

  > Publication is **one bookkeeping commit, one fast-forward push and one description edit**. The pushed commit is the published head and the phase-2 fork point. Its full SHA goes into PR #11's description footer (outside Git), into the final report and, later, into phase 2's `request.md` on `gen-v4`. No committed file states its own commit's SHA.

- Scope: replace with:
  - Change only this task's execution log and the check-list's index and summary row (orchestrator bookkeeping), in the one P1-05 commit.
  - Transient files (the body with its footer, the final PR read) go to `tests/artifacts/improve-generating-phase-1/P1-05/`, which is git-ignored.
  - Remote mutations: one fast-forward of `origin/improve-generating`, and PR #11's description.
  - Do not alter `readiness.md`, `pr-body.md`, the qualification, sources, tests, guides or other records. Never stage unlisted files or use `git add -A`.
  - G-PROTECTED and G-QUALIFIED pass; G-WORKTREE as stated.
- Steps 1-7: replace with these. Run steps 1-5 in **one** PowerShell session.

  1. **Preflight, no mutation.** Paste the first three lines of check-list §3.2's shared block. Run G-PROTECTED, G-QUALIFIED and `npm run check` (exit 0), then:

     ```powershell
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
     ```

     Then review `git --no-pager log --oneline eca0f94..HEAD`, and recheck `pr-body.md`: the required file and section lists, the verification table, N-P1-DOC, the FAIL line and the two-PR, no-merge text. Require both readiness approvals in the committed `readiness.md`.
  2. **Bookkeeping commit.** Fill this task's execution log:
     - its start time and preflight results;
     - Commit: "this commit: the published head and phase-2 fork point; its full SHA is in PR #11's footer and the final report".

     Fill the check-list §6 P1-05 row: Start, Commit as above, and End, Duration and AI credits as "see the final report". Then:

     ```powershell
     git --no-pager add -- tasks/improve-generating-phase-1/P1-05-publish-phase-one.md tasks/improve-generating-phase-1/check-list.md
     git --no-pager commit -m 'improve-generating-phase-1 P1-05: Publish phase 1 and update PR #11, never merge' -m '<the session trailers, check-list §3.1>'
     if ($LASTEXITCODE -ne 0) { throw 'QUESTION: the bookkeeping commit failed' }
     $fork = (git --no-pager rev-parse HEAD).Trim()
     if ((@(git --no-pager diff --name-only "$fork~1" $fork) -join '|') -cne 'tasks/improve-generating-phase-1/P1-05-publish-phase-one.md|tasks/improve-generating-phase-1/check-list.md') { throw 'QUESTION: the bookkeeping commit has other files' }
     ```

  3. **Push, once.**

     ```powershell
     git --no-pager push origin "${fork}:refs/heads/improve-generating"
     if ($LASTEXITCODE -ne 0) { throw 'QUESTION: the push failed; read the remote state, then stop' }
     ```

  4. **Description, once.**

     ```powershell
     $raw = 'tests\artifacts\improve-generating-phase-1\P1-05'
     New-Item -ItemType Directory -Path $raw | Out-Null
     $norm = { param([string]$t) ($t -replace "`r`n", "`n").TrimEnd() + "`n" }
     $footer = "## Published phase-1 checkpoint`n`nPublished head and phase-2 fork point: ``$fork``.`n`nPhase 2 will branch ``gen-v4`` from this commit and use a separate PR into ``main``. Neither PR is merged.`nThe phase-2 PR initially includes the unmerged phase-1 prefix and must disclose that dependency.`n"
     $body = (& $norm ([IO.File]::ReadAllText('docs\improve-generating-phase-1\pr-body.md'))).TrimEnd() + "`n`n" + $footer
     [IO.File]::WriteAllText("$raw\body.md", $body, [Text.UTF8Encoding]::new($false))
     gh pr edit 11 --repo tdat00/pentomino --body-file "$raw\body.md"
     if ($LASTEXITCODE -ne 0) { throw 'QUESTION: gh pr edit failed after the push; read the PR, then stop' }
     ```

  5. **Verify.** GitHub may show the new head a few seconds late, so the script reads it at most three times.

     ```powershell
     for ($i = 0; $i -lt 3; $i++) {
       $after = gh pr view 11 --repo tdat00/pentomino --json $Fields | ConvertFrom-Json
       if ($after.headRefOid -eq $fork) { break }
       Start-Sleep -Seconds 10
     }
     $remote = Get-Remote
     if ($remote['refs/heads/main'] -ne $Main -or $remote['refs/heads/improve-generating'] -ne $fork -or $after.state -ne 'OPEN' -or
       $null -ne $after.mergedAt -or $after.headRefName -ne 'improve-generating' -or $after.headRefOid -ne $fork -or
       $after.baseRefName -ne 'main' -or $after.baseRefOid -ne $Main -or (& $norm $after.body) -cne (& $norm $body)) { throw 'QUESTION: the published state differs' }
     $after | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath "$raw\pr-after.json"
     "published $fork; PR #11 OPEN, unmerged, improve-generating -> main"
     ```

  6. **Report and stop.**
     - The final report gives `$fork` literally, the PR URL and state, and the SHA-256 of the normalized body.
     - The orchestrator keeps `$fork` in its session state for phase 2's request.
     - No further commit on `improve-generating`.
     - Do not create or check out `gen-v4`, open another PR, merge, dispatch Pages or start phase-2 work.
- Stop points: add "If the push succeeded but the description edit or its check failed, read the PR and the refs again and stop for a ruling. After the ruling only the edit is repeated, never the push."
- Tests: replace the table with:

  | Test file | Case name | Input | Expected |
  |---|---|---|---|
  | Git and GitHub reads | preflight identity | origin, PR #11, refs | the origin URL; PR OPEN and unmerged, `improve-generating` -> `main`; remote head `826ce79` = PR head, an ancestor of HEAD; main = `MAIN_REFERENCE` |
  | Git | bookkeeping commit | `$fork~1..$fork` | exactly the two bookkeeping files |
  | Git and GitHub reads | final publication | refs and PR after the edit | remote head = PR head = `$fork`; main unchanged; OPEN, `mergedAt` null; normalized body equal |

- Commands and gates: replace with:

  | Command | Where | Expected | Time limit |
  |---|---|---|---|
  | G-PROTECTED, G-QUALIFIED, `npm run check` | root | pass | 2 min |
  | Step 1's reads | root | no throw | 2 min per network command |
  | `git push`, once | root, orchestrator | exit 0, fast-forward | 5 min; if still running, read that session, never repeat |
  | `gh pr edit`, once, and step 5's reads | root, orchestrator | exit 0; exact head, state and body | 2 min |

- AC:

  | ID | Criterion | How verified | Evidence |
  |---|---|---|---|
  | P1-05-B02 | Phase 2 has one unambiguous published fork, without starting phase 2 or deploying | step 5: the remote head, the PR head and `$fork` are equal | PR footer, `pr-after.json`, final report |
  | P1-05-T03 | One task commit; the fork SHA recorded outside the commit it names | step 2's two-file check; the footer | PR, final report |

- Checklist: replace three items:
  - "Two fast-forward pushes and two verified description updates completed" becomes "One fast-forward push and one verified description update".
  - "One documentary task commit; no self-SHA follow-up commit" becomes "One bookkeeping commit; no follow-up commit".
  - "Final full fork SHA persisted in receipt, PR footer and final report; Git rule agrees" becomes "Fork SHA in the PR footer and the final report, equal to the remote head and the PR head".
- Documentation: replace with "The PR footer gives the published head and the phase-2 fork SHA. The PR body keeps every P1-04 detail and N-P1-DOC. No app EN/VI text or guide edits."

### R1-5: the PR body's living-specification list misses §7.1

In P1-04 step 4, replace the "Living specification" paragraph with:

```markdown
`docs/design-detail.md`: shared types and engine APIs (§§4.1-4.2), history and P6 (§§6.9-6.10), lean clue-search
ratings in the metrics section (§7.1), rating (§7.10), capacity-trim history (§10.5), and the generate test-table
sentence (§13.2).
```

Evidence: `git diff -U0 b5eb858 eca0f94 -- docs/design-detail.md` has these hunks:

- :268 and :533 (§§4.1-4.2);
- :1507, :1599 and :1611 (§§6.9-6.10);
- :1710 (§7.1), which adds "The ratings of the clue search carry no DLX diagnostic until `conclude` completes the returned one (§6.10).";
- :2106 and :2120 (§7.10);
- :2560 (§10.5);
- :3072-3073 (§13.2);
- and P1-02's :3076.

Plan §4.7's list also omits §7.1. The owner asked for the details of the changes, so the PR text lists it.

### R1-6: the PR body overstates the client test

In P1-04 step 4, replace "`tests/generation-client.test.js`: fold-ordered streaming at supported client widths." with:

> `tests/generation-client.test.js`: accepted puzzles stream in slot order, identical at one and four workers.

Evidence: the only test that T13 added there is `progressive presentation: accepted puzzles stream in slot order, the same at one and four workers` (`git diff -U0 b5eb858 eca0f94 -- tests/generation-client.test.js`).

### R1-7: P1-04 reads the new records and guards

- Authority, third bullet: delete "the two reader contracts".
- Step 1: replace with "Run G-PROTECTED and G-QUALIFIED (check-list §3.3). Check that phase 0's recorded line is exactly `Phase 0: FAIL (control 26x26-nightmare: fail)` (`docs/improve-generating/evidence/frozen/V4-S4F/verdicts.md:316`). A different line, a missing gate or a stale binding is a QUESTION; do not make a new verdict."
- Step 2: replace the token table with:

  | Token | Source and rule |
  |---|---|
  | `QUALIFIED` | `verification/index.json` `qualifiedCommit`, full SHA |
  | `DIGEST` | index `runtimeDigest`; it must equal `adoption.json` `source.currentDigest` |
  | `NODE26`, `NODE22` | index `node.node26` and `node.node22`, printed unchanged |
  | `FULL26`, `FULL22` | the `P1-03b full-node26` and `full-node22` rows of `summary.md`, and index `gates[].seconds` |
  | `FOCUSED` | index `focused`: task, seconds and the two log paths and hashes. Two cases, 30 simulation comparisons |
  | `COST` | index `nodePlusQuietSeconds / 60`, rounded to two decimals; label it node+quiet, not wall time |
  | `CELL_ROWS` | `adoption.json` `bench.cells`, in T14 order: `cell`, `oldTen/newTen` of 5, `equal/pairs`, `response.median.toFixed(5)` |
  | `MEMORY` | `adoption.json` `bench.memory`: `processPeak`, `processLimit`, `accountedPeak`, `accountedLimit` divided by 1,048,576, to three decimals; `sideCells` 14 and `bothChecksPass` true |

  In the readiness note's "Scope and source" line, "the three unchanged-source bridges" are `adoption.json` `bridges`.
- Step 6: replace its first sentence with "Run G-QUALIFIED, G-PROTECTED, G-FORMAT on the two files, and `npm run check`." Replace its last sentence with "After those document edits, re-run only these checks; no suite."
- Tests, first row: replace with:

  | Test file | Case name | Input | Expected |
  |---|---|---|---|
  | G-QUALIFIED | existing sealed qualification | current HEAD plus the new documents only | no throw; tested files and sealed evidence unchanged |

- Commands and gates, first two rows: replace with:

  | Command | Where | Expected | Time limit |
  |---|---|---|---|
  | G-QUALIFIED (check-list §3.3) | root | no throw | 1 min |
  | G-FORMAT on `readiness.md` and `pr-body.md` | root | `format: OK (2 files)` | 30 s |

### R1-8: check-list changes

- **Header row "Executors":** "Dev-Sonnet (`claude-sonnet-5.5`) for the test and specification edit and the readiness and PR drafts; SA-Astra (or Dev-Sonnet with the exact edit list) for the adoption reader; the orchestrator for the locked gates, qualification and publication; the two SAs approve adoption and readiness".
- **Intro paragraph:** replace with this text:

  > Each task stays within the plan's §8 sizing. Qualification (P1-03b) and publication (P1-05) are the orchestrator's literal PowerShell sequences; no qualification program is written (P1-03a was withdrawn at review, review-1 R1-1, and the ID P1-03b is kept). P1-01's reader is a retargeted copy of the round-1 audit script. The outputs of P1-01 and P1-04 need the two SAs' recorded approval, as the plan requires.

- **Index:**
  - Delete the P1-03a line.
  - P1-03b depends on P1-02.
- **Task table:**

  | ID | File | Developer h | Orchestrator h | Machine scope |
  |---|---|---:|---:|---|
  | P1-01 | `P1-01-source-bound-adoption.md` | 1 | - | unlocked reads; 0 measured minutes |
  | P1-02 | `P1-02-fold-width-eight.md` | 0.5 | 0.1 | one locked focused test; about 1 min node+quiet, limit 345 s |
  | P1-03b | `P1-03b-current-qualification.md` | 0 | 0.5 | four locked invocations; about 7.4 min before the extra width, limit 1,380 s |
  | P1-04 | `P1-04-readiness-and-pr-description.md` | 1 | - | unlocked records and documents; 0 measured minutes |
  | P1-05 | `P1-05-publish-phase-one.md` | 0 | 0.3 | Git and GitHub operations only; 0 measured minutes |

  Below the table: "Developer total **2.5 h** (1.5 h if SA-Astra writes P1-01, as plan §8 assigns), plus about 0.9 orchestrator hours and the SA reviews."
- **Traceability.**
  - Rows that name P1-03a:
    - "§4.6; D-P1-05" maps to "P1-02, P1-03b".
    - "P1-T04 / P1-T05 / P1-T06" maps to "P1-03b".
    - "§§7-8 risks, fail-closed method, verification cost" maps to "shared rules; P1-03b; stop points in every task".
  - The row "§4.4 adoption" adds "(executor per plan §8)".
- **§3.1:** add "`npm run check` does not read `docs/` or `tasks/`. New or changed files there also pass G-FORMAT (§3.3)."
- **§3.2:**
  - Replace the "data checks" paragraph with this text:

    > P1-01's reader is unlocked reader work (plan §4.4): stored records, hashes, read-only Git and arithmetic only. It runs no `node --test`, solver, rating, generation, replay, worker, benchmark or browser.

  - Add **Shared log-check block** (paste it first in every session of P1-02 step 5, P1-03b and P1-05; P1-05 needs only its first three lines). It normalizes only line endings, trailing whitespace and ANSI colour codes; it changes no message or value.

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
      if ($lines[0] -notmatch "^p1-run: .+ v$Major\.\d+\.\d+; node ") { throw "QUESTION: $Log did not run on Node $Major" }
      foreach ($x in $Exact) { if (@($lines | Where-Object { $_ -ceq $x }).Count -ne 1) { throw "QUESTION: $Log lacks exactly one '$x'" } }
      foreach ($p in $Patterns) { if (@($lines | Where-Object { $_ -cmatch $p }).Count -ne 1) { throw "QUESTION: $Log lacks exactly one match of $p" } }
      $h = @(Get-Content -LiteralPath $Helper | Where-Object { $_ -cmatch "^IG $([regex]::Escape($Task)) exit=0 seconds=\d+(\.\d+)? quiet=45$" })
      if ($h.Count -ne 1) { throw "QUESTION: $Helper lacks exactly one 'IG $Task exit=0 ... quiet=45' line" }
      $s = [double]([regex]::Match($h[0], 'seconds=([0-9.]+)').Groups[1].Value)
      if ($s -gt 300) { throw "QUESTION: $Task took $s s" }
      return $s
    }
    ```

- **§3.3:** replace the paragraph "P1-01's `check --stage base|fold8` adds G-STAGE … P1-03a's `verify` adds G-QUALIFIED …" with the following three guards.
  - **G-STAGE.** The only test and specification change since the plan commit is P1-02's three lines. Run it from the root after the shared block:

    ```powershell
    $numstat = @(git --no-pager diff --numstat eca0f94 -- tests docs/design-detail.md)
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
    ```

  - **G-QUALIFIED.** The tested files are unchanged since the qualified commit, and the sealed evidence is unchanged since its commit. It applies after P1-03b's commit.

    ```powershell
    $Tested = @('core', 'generator', 'player', 'assets', 'index.html', 'redirect.js', 'sitemap.xml', 'tests', 'tools', 'package.json', '.github')
    $Q = (Get-Content -Raw -LiteralPath docs\improve-generating-phase-1\evidence\verification\index.json | ConvertFrom-Json).qualifiedCommit
    $S = @(git --no-pager log --diff-filter=A --format=%H -- docs/improve-generating-phase-1/evidence/verification/index.json)
    if ($S.Count -ne 1) { throw 'QUESTION: G-QUALIFIED: the qualification record was not added exactly once' }
    git --no-pager merge-base --is-ancestor $Q HEAD
    if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-QUALIFIED: the qualified commit is not an ancestor of HEAD' }
    git --no-pager diff --exit-code --stat $Q -- $Tested
    if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-QUALIFIED: tested files changed since the qualified commit' }
    if (git --no-pager status --porcelain --untracked-files=all -- $Tested) { throw 'QUESTION: G-QUALIFIED: uncommitted or untracked tested files' }
    git --no-pager diff --exit-code --stat $S[0] -- docs/improve-generating-phase-1/evidence/verification docs/improve-generating-phase-1/evidence/fold-width8 docs/improve-generating-phase-1/evidence/adoption.json docs/improve-generating-phase-1/evidence/adoption.md docs/improve-generating-phase-1/evidence/adoption-reader.mjs
    if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-QUALIFIED: sealed evidence changed after the qualification commit' }
    ```

  - **G-FORMAT** is given in R1-9.
  - Replace the paragraph on the fixed-base analysis readers with this text:

    > The fixed-base analysis scripts under `E/sa-astra/` and `E/sa-opus/` are historical evidence. Do not edit them, and do not rerun them to replace their observations. Two uses are allowed: P1-01 copies `E/sa-astra/phase1-audit.mjs` into a new file, and `E/sa-opus/p1-run.mjs` is the log runner that plan §4.6 names.

- **§3.4:**
  - Keep the bullet "Bind raw bytes of observed logs/reports and normalized LF text …"; the adoption reader records both hashes.
  - In the bullet "The qualification records its code/test commit …", replace "preserve the same `boundFiles`" with "keep the tested files unchanged (G-QUALIFIED)".
  - Replace the last bullet with this text:

    > P1-05 makes one bookkeeping commit, one fast-forward push and one description edit. The pushed commit is the published head and the phase-2 fork point. Its full SHA goes into PR #11's description footer (outside Git), the final report and phase 2's `request.md` on `gen-v4`. No committed file states its own commit's SHA, and no second commit or push records it.

- **§6:** delete the P1-03a row.

### R1-9: `npm run check` does not read docs/ or tasks/; add G-FORMAT

**Why.**

- `tools/check-conventions.mjs` checks only `core generator player tools tests .github` and a few root files, and it skips `artifacts`.
- The pack nevertheless relies on `npm run check` for "formats pass" in documents-only tasks: the P1-01 record, P1-04's documents, and the orchestrator's records under `docs/`.

**Change.** Add to check-list §3.3:

> **G-FORMAT.** From the root, with the files as arguments. Expected `format: OK (<n> files)`, exit 0. It applies the repository's own `checkText` (BOM, final newline, mixed endings, trailing whitespace) and also requires CRLF:

```powershell
node --input-type=module -e "import { readFileSync } from 'node:fs'; import { checkText } from './tools/check-conventions.mjs'; let bad = 0; for (const f of process.argv.slice(1)) { const b = readFileSync(f); const p = checkText(f, b); if (b.includes(10) && !b.toString('utf8').includes('\r\n')) p.push(f + ': LF line endings, not CRLF'); for (const x of p) { console.error(x); bad += 1; } } console.log(bad ? 'format: ' + bad + ' problem(s)' : 'format: OK (' + (process.argv.length - 1) + ' files)'); process.exitCode = bad ? 1 : 0;" <file> <file> ...
```

Verified [V]:

- It flags an LF file, a trailing space and a missing final newline (3 problems, exit 1).
- It passes the seven pack files and the 15 files of the dry run.

### R1-10 (minor): P1-02 cites §8.4 for what is in §8.2

In P1-02 step 3, replace "Do not change the separate production guarantee at §8.4 (pool sizes 1-4)." with:

> Do not change the separate production guarantee in §8.2 (`docs/design-detail.md:2190`, "any pool size (1–4)").

### R1-11 (major if R1-1 is not applied): .NET path resolution in P1-03b step 4

**Why.**

- In PowerShell, `Set-Location` does not change the process's .NET current directory, and the orchestrator's sessions start in `Q:\git`.
- P1-03b step 4 writes `commands.json` with `[IO.File]::WriteAllText($target, …)`, where `$target = "$dir\commands.json"` is relative.
- .NET therefore resolves it under `Q:\git\docs\…` and throws "Could not find a part of the path". This happens after the four locked gates have run.
- [V] The same kind of call failed in this review with "Could not find a part of the path 'Q:\git\docs\improve-generating-phase-1\…'". The dry run records the .NET directory as `Q:\git` before the shared block.

**Change.**

- R1-1's shared block fixes it with `[Environment]::CurrentDirectory = (Get-Location).Path`.
- If R1-1 is not applied, add that line after `Set-Location Q:\git\pentomino` in P1-03b step 2.

## 4. Resulting sizes

| Task | Pack: developer h / orchestrator h | Proposed: developer h / orchestrator h |
|---|---|---|
| P1-01 | 3 / - | 1 (SA-Astra per plan §8, or Dev-Sonnet) / - |
| P1-02 | 0.5 / the locked gate | 0.5 / 0.1 |
| P1-03a | 2.5 / - | withdrawn |
| P1-03b | 0 / 0.75 | 0 / 0.5 |
| P1-04 | 1 / - | 1 / - |
| P1-05 | 0 / 0.4 | 0 / 0.3 |
| Total | 7 / 1.15 | 2.5 (1.5 if P1-01 is SA work) / 0.9 |

- Locked invocations are unchanged: five, each at most 300 + 45 s, so at most 1,725 s in total.
- Nothing changes a plan decision. P1-01's executor and the P1-01, P1-02 and P1-03 sizes are plan §8's. P1-04 keeps the pack's Dev-Sonnet drafting (plan §8: SAs, 0.5 h), which is the pack author's choice. No owner question is needed.

## 5. Evidence

These are the review's own measurements and scripts. No locked invocation was made and no suite was run. The dry runs ran `npm run check` and one owned static-site stamp and check, each within seconds.

| File (in `docs/improve-generating-phase-1/evidence/sa-opus/`) | Command, from the root unless stated | Result |
|---|---|---|
| `p1-pack-review-checks.mjs` / `.md` | `node docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review-checks.mjs` | 12 checks; 11 pass. "FAIL" is the expected finding that 9 of `p7.json`'s 12 inputs are git-ignored. Includes the planned-edit hunks `-808/+808`, `-821/+821` and `-3076/+3076` |
| `p1-01-edit-proto.mjs` / `.md` | `node docs\improve-generating-phase-1\evidence\sa-opus\p1-01-edit-proto.mjs` | 26 edits applied; the record is written (70/35/14, nine-file closure, three bridges, version tuple); the second run is refused; reader SHA-256 `cfd0b963…` |
| `p1-03b-dryrun.ps1` / `.md` | `Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-03b-dryrun.ps1` | G-STAGE passes on the edited copies. Blocks A, C and D pass on the round-1 logs (531.529 node+quiet s with a 40.5-s synthetic focused run). The staged site has 120 files, equal to `git ls-tree`. Generated files pass G-FORMAT. Nine negative probes are rejected |
| `p1-05-preflight-dryrun.ps1` / `.md` | `Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-05-preflight-dryrun.ps1` | Step 1 passes against the live remote and PR #11. The body and footer compose, and their normalization survives a CRLF round trip |

Inline commands used for section 2:

- `git diff --name-only` for the four bridges;
- `Select-String -SimpleMatch` for the anchors;
- `git diff -U0 b5eb858 eca0f94 -- docs/design-detail.md` and `-- tests/generation-client.test.js`;
- `gh pr view 11 --repo tdat00/pentomino --json number,state,mergedAt,headRefName,headRefOid,baseRefName,baseRefOid,url`;
- a `Select-String` of `tools/check-conventions.mjs` for its scope;
- a G-QUALIFIED sanity run with `Q = eca0f94`, which exits 0, plus a negative probe, which exits 1.

## 6. Sign-off condition

- I sign the pack when R1-1 to R1-11 are applied or answered with evidence.
- R1-5, R1-6, R1-9, R1-10 and R1-11 are corrections. R1-1 to R1-4, R1-7 and R1-8 are the proportionality changes.
- If SA-Astra keeps P1-03a or the two-push P1-05, please give the guarantee that the replacement loses. The owner delegated supervisor-level questions to the two SAs jointly. A disagreement we cannot settle goes to the owner through the orchestrator as a cost question, because it changes developer hours, not scope or behaviour.

SA-Opus, 2026-11-25.
