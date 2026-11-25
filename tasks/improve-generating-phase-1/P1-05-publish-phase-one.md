# P1-05: Publish phase 1 and update PR #11, never merge

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-1`; plan §4.7, P1-B04/P1-T10, §8 P1-05; D-P1-06/D-P1-07/D-P1-08 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, `eca0f94717a56de43c52f6cb54d739360670fef8` |
| Depends on | P1-04 accepted and committed, including both readiness sign-offs |
| Pack author / reviewer | SA-Astra / SA-Opus |
| Executor | The orchestrator |
| Estimate | Developer 0 h, orchestrator 0.3 h; machine 0 measured min, Git/GitHub I/O only |

## Goal

Publish the verified phase-1 checkpoint to the existing PR and give the owner the detailed change
description requested. Keep PR #11 open and unmerged, and record its actual published head as the
unambiguous fork for phase 2. Do not start phase 2 or change the live site.

## Authority and fixed points

- D-P1-07 supersedes the earlier one-PR route: PR #11 is `improve-generating` -> `main`; phase 2 later
  uses `gen-v4` from this close-out with a separate PR into `main`. Neither PR is merged.
- The owner's instruction at `c63c553` already authorizes this phase-1 push/description update;
  no new approval is inferred for merge, release, rebase, force-push or Pages dispatch.
- Read committed `readiness.md`, `pr-body.md`, qualification/index and summary, the plan §4.7,
  this task and check-list. Require both SAs' recorded readiness acceptance.
- Publication is **one bookkeeping commit, one fast-forward push and one description edit**.
  The pushed commit is the published head and phase-2 fork. Its full SHA goes into the PR footer
  (outside Git), the final report and later phase 2's `request.md` on `gen-v4`.
  No committed file names its own commit SHA; no second commit/push is made to record it.

## Scope

- Change only this task's execution log and the check-list's P1-05 bookkeeping/index annotation and
  summary row, in one commit.
- Transient body-with-footer and final PR JSON go under ignored
  `tests/artifacts/improve-generating-phase-1/P1-05/`.
- Remote mutations: one fast-forward of `origin/improve-generating` and PR #11's description.
- Do not alter readiness/PR-body source, qualification, runtime, tests, guides or other records.
  Never stage unlisted files or use `git add -A`.
- G-PROTECTED, G-QUALIFIED and G-WORKTREE pass. No branch creation, second PR, main write,
  merge, release/tag/deployment, phase-2 commit or CI workflow dispatch.

## Steps

Steps 1-5 run as **two PowerShell commands**. Each tool command is a fresh process: no variable, function or location survives it, and no file edit can happen inside one.

- **Command 1** is step 1 and is read-only.
- The orchestrator then reviews the state and edits the bookkeeping (step 2's first paragraph).
- **Command 2** is the rest of step 2 and steps 3-5, run without a pause. It starts by repeating step 1's checks, so a change of state between the two commands stops it.

Set a long tool wait; if a command is still running, read its output instead of starting it again. A failure is a stop, not an automatic retry. All writes below are relative to the repository after the shared directory fix.

1. **Preflight, read-only (command 1).** In one command, run:

   - the first three lines of check-list §3.2;
   - G-PROTECTED and G-QUALIFIED;
   - `npm run check`, followed by `if ($LASTEXITCODE -ne 0) { throw 'QUESTION: npm run check failed' }`;
   - the block below;
   - G-WORKTREE.

   ```powershell
   $env:GIT_TERMINAL_PROMPT = '0'
   $env:GH_PROMPT_DISABLED = '1'
   $Main = 'b5eb85805f609af7deaa2489eb08675c60b2cc49'
   $Before = '826ce79dcc4a77daaaea00894a6dcea46bcbd8b7'
   $Fields = 'number,state,mergedAt,headRefName,headRefOid,baseRefName,baseRefOid,body,url'
   $Allowed = @(
     'tasks/improve-generating-phase-1/P1-05-publish-phase-one.md',
     'tasks/improve-generating-phase-1/check-list.md'
   )
   $branch = @(git --no-pager branch --show-current)
   if ($LASTEXITCODE -ne 0 -or $branch.Count -ne 1 -or $branch[0] -cne 'improve-generating') { throw 'QUESTION: not on improve-generating' }
   $origin = @(git --no-pager remote get-url origin)
   if ($LASTEXITCODE -ne 0 -or $origin.Count -ne 1 -or $origin[0] -cne 'https://github.com/tdat00/pentomino.git') { throw 'QUESTION: unexpected origin URL' }
   function Get-Remote {
     $rows = @(git --no-pager ls-remote origin refs/heads/main refs/heads/improve-generating)
     if ($LASTEXITCODE -ne 0 -or $rows.Count -ne 2) { throw 'QUESTION: git ls-remote failed or a ref is missing' }
     $r = @{}
     foreach ($l in $rows) {
       $sha, $ref = $l -split '\s+'
       if ($sha -cnotmatch '^[0-9a-f]{40}$' -or $r.ContainsKey($ref)) { throw 'QUESTION: malformed or duplicate remote ref' }
       $r[$ref] = $sha
     }
     $r
   }
   $remote = Get-Remote
   $prText = @(gh pr view 11 --repo tdat00/pentomino --json $Fields)
   if ($LASTEXITCODE -ne 0) { throw 'QUESTION: gh pr view failed' }
   $pr = ($prText -join "`n") | ConvertFrom-Json
   if ($remote['refs/heads/main'] -cne $Main -or $remote['refs/heads/improve-generating'] -cne $Before -or $pr.number -ne 11 -or
     $pr.state -cne 'OPEN' -or $null -ne $pr.mergedAt -or $pr.headRefName -cne 'improve-generating' -or $pr.headRefOid -cne $Before -or
     $pr.baseRefName -cne 'main' -or $pr.baseRefOid -cne $Main) { throw 'QUESTION: unexpected remote or PR state' }
   git --no-pager merge-base --is-ancestor $Before HEAD
   if ($LASTEXITCODE -ne 0) { throw 'QUESTION: the push would not be a fast-forward' }
   $changed = @(git --no-pager diff --name-only eca0f94 HEAD)
   if ($LASTEXITCODE -ne 0) { throw 'QUESTION: scope diff failed' }
   $scope = @($changed | Where-Object { $_ -notmatch '^(tasks|docs)/improve-generating-phase-1/' -and $_ -cne 'tests/generate.test.js' -and $_ -cne 'docs/design-detail.md' })
   if ($scope.Count) { throw "QUESTION: out-of-scope changes since eca0f94: $($scope -join ', ')" }
   ```

   After command 1, review `git --no-pager log --oneline eca0f94..HEAD` (exit 0)
   for only the accepted pack/tasks and their evidence; no phase-2 implementation. Re-read committed
   `pr-body.md`: literal three engine/five test files, all spec sections including §7.1, actual
   verification table, N-P1-DOC, original FAIL, separate-PR and no-merge statements.
   The remote head must be exactly `826ce79...`, not an unexplained alternate ancestor.

2. **Bookkeeping, then command 2.** Record the start time, preflight/gates and state "publication pending at
   this commit; final outcome in PR #11's footer and the final report". Keep P1-05's index checkbox
   pending at commit time, with that annotation; never claim an unperformed push passed.
   Set Commit to "this commit: the published head and phase-2 fork point; full SHA in PR #11's footer
   and the final report". End/duration/AI credits in both execution-log and summary rows say
   "see the final report". No other task/check-list decision or acceptance text changes.

   Then run **command 2**, in this order:

   1. the first three lines of check-list §3.2;
   2. step 1's code block again (it re-checks the refs, PR #11, ancestry and scope, and defines the constants, `$Allowed` and `Get-Remote`);
   3. G-WORKTREE;
   4. G-FORMAT with `$FormatFiles = @($Allowed | ForEach-Object { $_.Replace('/', '\') })`;
   5. the code block below;
   6. step 3's block;
   7. step 4's body block;
   8. G-FORMAT with `$FormatFiles = @("$raw\body.md")`;
   9. step 4's edit block;
   10. step 5's block;
   11. step 5's closing checks.

   ```powershell
   git --no-pager add -- tasks\improve-generating-phase-1\P1-05-publish-phase-one.md tasks\improve-generating-phase-1\check-list.md
   if ($LASTEXITCODE -ne 0) { throw 'QUESTION: staging bookkeeping failed' }
   $staged = @(git --no-pager diff --cached --name-only)
   if ($LASTEXITCODE -ne 0 -or ($staged -join '|') -cne ($Allowed -join '|')) { throw 'QUESTION: staged files are not exactly the two bookkeeping files' }
   $trailers = "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: 7e6bf34f-be87-427e-9bec-bb2d049b46cc"
   git --no-pager commit -m 'improve-generating-phase-1 P1-05: Publish phase 1 and update PR #11, never merge' -m $trailers
   if ($LASTEXITCODE -ne 0) { throw 'QUESTION: the bookkeeping commit failed' }
   $head = @(git --no-pager rev-parse HEAD)
   if ($LASTEXITCODE -ne 0 -or $head.Count -ne 1 -or $head[0] -cnotmatch '^[0-9a-f]{40}$') { throw 'QUESTION: committed HEAD cannot be read' }
   $fork = $head[0]
   $committed = @(git --no-pager diff --name-only "$fork~1" $fork)
   if ($LASTEXITCODE -ne 0 -or ($committed -join '|') -cne ($Allowed -join '|')) { throw 'QUESTION: the bookkeeping commit has other files' }
   ```

3. **Push, once.** Re-read the refs just before the push; no force or lease workaround:

   ```powershell
   $remote = Get-Remote
   if ($remote['refs/heads/main'] -cne $Main -or $remote['refs/heads/improve-generating'] -cne $Before) { throw 'QUESTION: refs changed after preflight' }
   git --no-pager push origin "${fork}:refs/heads/improve-generating"
   if ($LASTEXITCODE -ne 0) { throw 'QUESTION: the push failed; read the remote state, then stop' }
   ```

4. **Description, once.** Append a footer outside Git; do not modify committed `pr-body.md`.

   ```powershell
   $raw = 'tests\artifacts\improve-generating-phase-1\P1-05'
   New-Item -ItemType Directory -Path $raw | Out-Null
   $norm = { param([string]$t) ($t -replace "`r`n", "`n").TrimEnd() + "`n" }
   $footer = "## Published phase-1 checkpoint`n`nPublished head and phase-2 fork point: ``$fork``.`n`nPhase 2 will branch ``gen-v4`` from this commit and use a separate PR into ``main``. Neither PR is merged.`nThe phase-2 PR initially includes the unmerged phase-1 prefix and must disclose that dependency.`n"
   $body = (& $norm ([IO.File]::ReadAllText('docs\improve-generating-phase-1\pr-body.md'))).TrimEnd() + "`n`n" + $footer
   [IO.File]::WriteAllText("$raw\body.md", ($body -replace "`n", "`r`n"), [Text.UTF8Encoding]::new($false))
   ```

   In command 2, G-FORMAT with `$FormatFiles = @("$raw\body.md")` runs between this block and the edit:

   ```powershell
   gh pr edit 11 --repo tdat00/pentomino --body-file "$raw\body.md"
   if ($LASTEXITCODE -ne 0) { throw 'QUESTION: gh pr edit failed after the push; read the PR, then stop' }
   ```

5. **Verify.** Only a valid read whose head is still `$Before` may be polled again. At most three
   reads, with a 10-s wait between lagging reads; a failed/invalid read or other state stops.

   ```powershell
   for ($i = 0; $i -lt 3; $i++) {
     $afterText = @(gh pr view 11 --repo tdat00/pentomino --json $Fields)
     if ($LASTEXITCODE -ne 0) { throw 'QUESTION: post-edit PR read failed' }
     $after = ($afterText -join "`n") | ConvertFrom-Json
     if ($after.number -ne 11 -or $after.state -cne 'OPEN' -or $null -ne $after.mergedAt -or $after.headRefName -cne 'improve-generating' -or
       $after.baseRefName -cne 'main' -or $after.baseRefOid -cne $Main) { throw 'QUESTION: PR state changed after publication' }
     if ($after.headRefOid -ceq $fork) { break }
     if ($after.headRefOid -cne $Before) { throw 'QUESTION: unexpected post-push head' }
     if ($i -lt 2) { Start-Sleep -Seconds 10 }
   }
   $remote = Get-Remote
   if ($remote['refs/heads/main'] -cne $Main -or $remote['refs/heads/improve-generating'] -cne $fork -or $after.headRefOid -cne $fork -or
     (& $norm $after.body) -cne (& $norm $body)) { throw 'QUESTION: the published head or description differs' }
   $json = (($after | ConvertTo-Json -Depth 4) -replace '\r?\n', "`r`n") + "`r`n"
   [IO.File]::WriteAllText("$raw\pr-after.json", $json, [Text.UTF8Encoding]::new($false))
   $bodyHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes((& $norm $body)))).ToLowerInvariant()
   "published $fork; PR #11 OPEN, unmerged, improve-generating -> main; normalized body SHA-256 $bodyHash"
   ```

   End command 2 with three checks:

   - G-FORMAT with `$FormatFiles = @("$raw\body.md", "$raw\pr-after.json")`;
   - G-QUALIFIED;
   - `$st = @(git --no-pager status --porcelain --untracked-files=all); if ($LASTEXITCODE -ne 0 -or $st.Count) { throw 'QUESTION: the worktree is not clean after publication' }`.

   Keep the ignored read and body until hand-over; do not stage them.
6. **Report and stop.** Give the full `$fork`, PR URL/state, body SHA-256 (LF-normalized with one
   final newline), actual end/duration/usage and all AC evidence. Persist `$fork` in the
   orchestrator's session state for phase 2's request. The PR footer and final report are the durable
   publication record; no further commit on `improve-generating`.
   Do not create/check out `gen-v4`, open another PR, merge, dispatch Pages or start phase-2 work here.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| Git/GitHub reads | Preflight identity | Origin, PR #11, refs | Exact origin; OPEN/unmerged, correct branches, head `826ce79...` an ancestor, main `b5eb858...` |
| Git | Bookkeeping commit | Staged paths and `$fork~1..$fork` | Exactly the two bookkeeping files |
| Git/GitHub reads | Final publication | Refs and PR after description edit | Remote head = PR head = `$fork`; main unchanged; OPEN/unmerged; normalized body equal |

## Documentation

The PR footer gives the published head and phase-2 fork SHA. Preserve every P1-04 detail and
N-P1-DOC in the body. No app EN/VI text, guide, readiness or committed PR-body edit.
Post-push completion facts live in the final report/footer, not a self-referencing follow-up commit.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| G-PROTECTED, G-QUALIFIED, `npm run check` | Root | Pass | 2 min |
| Command 1 (step 1, read-only) | Root | No throw; exact origin/refs/PR state | 2 min per network command |
| Command 2 (step 1 again, then steps 2-5) | Root, orchestrator | No throw; one commit, one push, one edit, verified | 10 min; read the same command if still running |
| G-WORKTREE, G-FORMAT, staged/committed path checks | Root | Only the two bookkeeping files; formats pass | 1 min |
| One bookkeeping `git commit` | Root, orchestrator | Exit 0; two paths and session trailers | 1 min |
| `git push`, once | Root, orchestrator | Exit 0, fast-forward | 5 min; read same session if still running, never repeat |
| `gh pr edit`, once; step 5 reads | Root, orchestrator | Exit 0; exact head, state and body | 2 min per command |

## Stop points and questions

- Stop before publication for any unexpected ref/origin, divergence, scope change, missing approval,
  stale qualification, closed/merged PR or changed main. No inferred alternate fast-forward ancestor.
- If push succeeded but body creation/edit/check failed, read PR/refs and stop for a ruling. After
  that ruling repeat only the missing description edit/verification, never the successful push or
  bookkeeping commit. Keep any existing transient evidence rather than overwriting it.
- If a command's result is uncertain, read state; do not repeat a mutation to find out.
- `QUESTION:` to the pack author through the orchestrator when the task is wrong or contradicts
  code, behaviour is ambiguous, a gate fails for an uncovered reason, outside-scope change is needed
  or a recorded decision would change. Route any changed owner decision back to the owner.

## Acceptance criteria

### Business

| ID | Criterion | How verified | Evidence |
|---|---|---|---|
| P1-05-B01 | Owner's detailed phase-1 PR update is published, never merged | Exact normalized P1-04 body plus footer; PR OPEN/unmerged | PR #11 and `pr-after.json` |
| P1-05-B02 | Phase 2 has one published fork, without starting it or deploying | Remote head = PR head = `$fork` | PR footer, final read, final report |

### Technical

| ID | Criterion | How verified | Evidence |
|---|---|---|---|
| P1-05-T01 | Fast-forward intended scope; main unchanged; correct head/base | Steps 1, 3 and 5 | Git/GitHub output |
| P1-05-T02 | Qualified tree and evidence remain unchanged; formats valid | G-QUALIFIED, G-PROTECTED, G-FORMAT, clean status | Guard output and qualified index |
| P1-05-T03 | One task commit; fork SHA outside the commit it names | Two-file pre/post commit check and footer | Git, PR, final report |

## Checklist

- [ ] Preconditions, both approvals, actual verification and detailed PR wording checked
- [ ] One bookkeeping commit; no preclaimed remote success or follow-up commit
- [ ] One fast-forward push and one verified description update
- [ ] Fork SHA in PR footer/final report, equal to remote and PR heads
- [ ] Main unchanged, both-PR no-merge route explicit; no phase-2 or deployment action
- [ ] Every AC verified; format/qualification checks pass; final report supplies post-commit facts

## Final report

Start/end/duration; usage or explicit unavailability; preflight refs; full published/fork SHA;
PR URL/head/base/state/mergedAt; normalized-body SHA-256; every AC and guard result; N-P1-DOC and
phase-2-only-range hand-over. Distinguish any failure/recovery from normal flow. Do not make a
second commit or push to complete bookkeeping after publication.

## Execution log

| Item | Value |
|---|---|
| Start, end, duration | start 2026-11-25 12:12 +07:00 (preflight); end and duration: see the final report |
| Waiting for rulings | none |
| Agent id, model | the orchestrator (no developer) |
| Calls; input, output and cache-read tokens | - |
| AI credits | see the final report |
| Questions and rulings | none |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | command 1 (read-only preflight): G-PROTECTED, G-QUALIFIED, `npm run check`, remote refs (main b5eb858, improve-generating 826ce79), PR #11 OPEN and unmerged, fast-forward ancestry, scope since eca0f94, G-WORKTREE: all OK; `pr-body.md` re-read. Publication pending at this commit; final outcome in PR #11's footer and the final report |
| Commit | this commit: the published head and phase-2 fork point; full SHA in PR #11's footer and the final report |
| Issues and named items | N-P1-DOC stays open (disclosed in PR #11) |
