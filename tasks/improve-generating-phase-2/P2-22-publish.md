# P2-22: Publish `gen-v4` and PR #14's description, never merge

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §2 (pushing `gen-v4`, PR #14's description, never merging), §4.10 (§7.8's versioned paragraph), §10; D-P2-01, D-P2-02 |
| Repository, branch, base | `Q:\git\pentomino` (the main worktree; step 1 in a slot of check-list §3.7), `gen-v4`, P2-21's commit |
| Starts when | P2-21 is accepted by both SAs, and the owner has answered any question it raised that changes what is published |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet for step 1 (two text edits); the orchestrator for steps 2-4 |
| Estimate | developer 0.5 h (step 1); machine: none |

## Goal

The branch on GitHub and PR #14 state what phase 2 changed and what its validation found, with the phase-1 dependency
and no merge. Nothing is merged, released or deployed.

## Authority and fixed points

- D-P2-02: two PRs, phase 2 on `gen-v4` into `main`; neither merged. Merge or release only on a later explicit owner
  instruction.
- R6.5's §7.8 paragraph names the phase-2 source and receipts; the historical `gen-v3` lock stays.

## Scope

- Step 1 (Dev-Sonnet): `docs/design-detail.md` §7.8 (the paragraph P2-15 added: replace "pending the phase-2
  validation" by the report's verdict line and the paths `E/seal/seal.json`, `validation-report.md`), and
  `docs/improve-generating-phase-2/pr-body.md` ("Not yet validated" becomes "Validation" with the verdict line, the
  ledger account and the link to the report). `$Allowed` = these two files plus this task file.
- Steps 2-4 (orchestrator): commit, push, PR edit.

## Steps

1. Dev-Sonnet: the two edits above; G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT. Stop with `READY FOR PUBLICATION`.
2. Orchestrator: verify that the tested files did not change since the sealed commit:

   ```powershell
   Set-Location Q:\git\pentomino
   [Environment]::CurrentDirectory = (Get-Location).Path
   $ErrorActionPreference = 'Stop'
   $seal = Get-Content -Raw -LiteralPath docs\improve-generating-phase-2\evidence\seal\seal.json | ConvertFrom-Json
   git --no-pager diff --exit-code --stat $seal.commit -- core generator player tests tools package.json index.html
   if ($LASTEXITCODE -ne 0) { throw 'STOP: tested files changed after the seal (a new source epoch)' }
   ```

   Commit step 1 as `improve-generating-phase-2 P2-22: publication record`.
3. Push and describe:

   ```powershell
   Set-Location Q:\git\pentomino
   [Environment]::CurrentDirectory = (Get-Location).Path
   $ErrorActionPreference = 'Stop'
   git push origin gen-v4
   if ($LASTEXITCODE -ne 0) { throw 'STOP: push failed' }
   gh pr edit 14 --body-file docs\improve-generating-phase-2\pr-body.md
   if ($LASTEXITCODE -ne 0) { throw 'STOP: PR edit failed' }
   $pr = gh pr view 14 --json state,isDraft,baseRefName,headRefName,headRefOid | ConvertFrom-Json
   if ($LASTEXITCODE -ne 0) { throw 'STOP: PR view failed' }
   $head = (git --no-pager rev-parse HEAD).Trim()
   if ($LASTEXITCODE -ne 0) { throw 'STOP: rev-parse' }
   if ($pr.state -ne 'OPEN' -or -not $pr.isDraft -or $pr.baseRefName -ne 'main' -or $pr.headRefName -ne 'gen-v4' -or $pr.headRefOid -ne $head) {
     throw "STOP: PR #14 is not the open draft of gen-v4 at $head"
   }
   ```

   Never `gh pr merge`, `gh pr ready`, a tag, a release or a workflow dispatch.
4. **CI, truthfully (R14).** The workflow `.github/workflows/pages.yml` runs on `main` or a manual dispatch, not on a
   `gen-v4` push.

   ```powershell
   Set-Location -LiteralPath 'Q:\git\pentomino'
   [Environment]::CurrentDirectory = 'Q:\git\pentomino'
   $ErrorActionPreference = 'Stop'
   $head = (git --no-pager rev-parse HEAD).Trim()
   if ($LASTEXITCODE -ne 0) { throw 'STOP: rev-parse' }
   $runs = @(gh run list --commit $head --json databaseId,status,conclusion,workflowName | ConvertFrom-Json)
   if ($LASTEXITCODE -ne 0) { throw 'STOP: run list failed' }
   if ($runs.Count -eq 0) { 'CI: no run for this commit; none expected' } else { $runs | Format-Table | Out-String }
   ```

   An older branch run is never reported as this push's CI. The sealed local gates of P2-18 are the tested evidence.
   Report to the owner: the verdict line, the PR link, the CI statement and the named items.

## Tests

The sealed local gates of P2-18; no CI run is expected for a `gen-v4` push.

## Documentation

Step 1.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 2 diff | root | no output | 30 s |
| step 3 | root | push ok; PR open, draft, not merged | 2 min |

## Stop points and questions

- Stop before the push if step 2 shows a change; stop if an owner question from P2-21 is unanswered.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-22-B01 | PR #14 describes the change and its validation; nothing merged | `gh pr view` | command output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-22-T01 | The published head's tested files equal the sealed source | step 2 | command output |

## Checklist

- [ ] Step 1 edits accepted; tested files unchanged since the seal
- [ ] Pushed; PR #14 described; not merged
- [ ] CI result read and reported

## Final report

The pushed commit; `gh pr view`'s fields; the CI result; the owner report.

## Execution log

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
