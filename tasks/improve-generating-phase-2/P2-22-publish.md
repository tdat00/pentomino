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
  `docs/improve-generating-phase-2/pr-body.md`. `$Allowed` = these two files plus this task file. In `pr-body.md`
  (ruling on P2-21 and D-P2-18, 2026-11-26), "Not yet validated" becomes "Validation", with:
  - the verdict line and the owner's answer to Q-P2-V1;
  - the equality limitation: one eligible row, 14x14 Hell 1 rep 33, gives no equality evidence. Accepting it does not
    make it a pass;
  - automatic `require` requests on large boards often end empty at the 46-s set cut; the browser Generator does not use
    that cut;
  - the bound was not exercised in production either;
  - the ledger account and the link to the report.

  "Depends on" becomes: PR #11 is squash-merged into `main` as `626918c`; PR #14 is rebased onto it (D-P2-18) and
  carries only phase 2's commits. The measured source is sealed at `fa0bda2`, from before the rebase; its rebased
  counterpart has the identical tree (`evidence/rebase/rebase-map.json`).
- Steps 2-4 (orchestrator): commit, push, PR edit.

## Steps

1. Dev-Sonnet: the two edits above; G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT. Stop with `READY FOR PUBLICATION`.
2. Orchestrator: verify that the tested files did not change since the sealed commit. After the rebase (D-P2-18), the
   check runs against the sealed commit's rebased counterpart, after proving that it has the sealed commit's tree.
   `gen-v4-pre-rebase` keeps the sealed commit itself.

   ```powershell
   Set-Location Q:\git\pentomino
   [Environment]::CurrentDirectory = (Get-Location).Path
   $ErrorActionPreference = 'Stop'
   $seal = Get-Content -Raw -LiteralPath docs\improve-generating-phase-2\evidence\seal\seal.json | ConvertFrom-Json
   $map = Get-Content -Raw -LiteralPath docs\improve-generating-phase-2\evidence\rebase\rebase-map.json | ConvertFrom-Json
   if ($map.sealCommit.old -cne $seal.commit) { throw 'STOP: the rebase map does not name the sealed commit' }
   git merge-base --is-ancestor $map.sealCommit.new HEAD
   if ($LASTEXITCODE -ne 0) { throw 'STOP: the rebased sealed commit is not on gen-v4' }
   $sealedTree = (git --no-pager rev-parse "$($seal.commit)^{tree}").Trim()
   if ($LASTEXITCODE -ne 0 -or $sealedTree -cne (git --no-pager rev-parse "$($map.sealCommit.new)^{tree}").Trim()) {
     throw 'STOP: the rebased sealed commit has another tree'
   }
   git --no-pager diff --exit-code --stat $map.sealCommit.new -- core generator player tests tools package.json index.html
   if ($LASTEXITCODE -ne 0) { throw 'STOP: tested files changed after the seal (a new source epoch)' }
   ```

   Commit step 1 as `improve-generating-phase-2 P2-22: publication record`.
3. Push and describe. The push is a normal fast-forward: the history was rewritten once, at the rebase (D-P2-18). A
   rejected push is a `STOP`, never forced.

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
| Start, end, duration | 2026-11-26 21:37 +07:00 (dispatch, slot w1, base e71b66f); end 2026-11-26 21:47 +07:00 (PR #14 edited and checked); about 10 min |
| Waiting for rulings | SA-Opus ruling on the developer's QUESTION 1 and six deviations: 21:40-21:42 (about 2 min) |
| Agent id, model | Dev-Sonnet 8167dc51-41c2-4606-8d03-fa23efd0fea5 (claude-sonnet-5.5), step 1; the orchestrator, steps 2-4 |
| Calls; input, output and cache-read tokens | 22 calls; 1,265,318 input, 16,454 output, 1,190,911 cache-read |
| AI credits | 46.96 |
| Questions and rulings | Owner Q-P2-V1: `b` (Discord 1575520697659166882): accept the limitation, keep PR #14 a draft. Developer QUESTION 1 (pr-body.md line 3 contradicted the Validation section): SA-Opus ruled option (ii) with the exact text "Draft description for PR #14 (into `main`). The validation verdict is in "Validation" below, and nothing is merged.", plus the owner's message id in the answer bullet. Deviations accepted: full paths in design-detail.md (E is pack shorthand); G-PROTECTED's $base stays 97a6326, which has the identical tree to its rebased counterpart e14e074 (rebase-map); absolute report URL (relative links do not resolve in a PR description); the phase-3 bullet kept; the no-claim sentence replaced by the bound bullet; wrapping |
| Fix rounds | 1 (the ruling's two edits) |
| Gates re-run by the orchestrator | static guards in the slot: G-PROTECTED OK, G-WORKTREE OK, `format: OK (3 files)`, G-CHECK OK; merge gate (docs only, no focused tests): G-PROTECTED OK (base 97a6326, identical tree to e14e074), G-CHECK OK, G-FORMAT-COMMIT OK, G-COPIES `copies: OK (5 variants, 195 edits match)` and today `copies: OK (1 variants, 32 edits match)`; fast-forward b7151db. Step 2: `step 2: OK` (rebase map names fa0bda2; 0320e00 is on gen-v4 with the identical tree; tested files unchanged). Step 3: `459d482..b7151db gen-v4 -> gen-v4` (fast-forward, not forced); `gh pr edit 14` OK; PR #14 OPEN, draft, base main, head gen-v4 at b7151db; the report link resolves on gen-v4. Step 4: `CI: no run for this commit; none expected` (pages.yml runs on main or a manual dispatch) |
| Commit | b7151db (publication record); this bookkeeping commit, pushed as a fast-forward |
| Issues and named items | Nothing merged, released or deployed; PR #14 stays a draft by the owner's Q-P2-V1 (b). Named items for later (validation report §16): the `require` finding, the 10x10 Master rep 24 trace gap, CLI boards of 577 to 675 cells unmeasured, Hell 1 offers (phase 3); local backup branch gen-v4-pre-rebase kept until phase 2 closes |
