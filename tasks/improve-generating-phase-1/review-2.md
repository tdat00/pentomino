# Phase-1 task pack: review 2 (SA-Opus)

| Item | Value |
|---|---|
| Pack | `tasks/improve-generating-phase-1/` as revised by SA-Astra after `review-1.md` (check-list, P1-01, P1-02, P1-03b, P1-04, P1-05, `review-1-response.md`), read uncommitted on 2026-11-25 |
| Base | `eca0f94717a56de43c52f6cb54d739360670fef8` |
| Verdict | **Accept, subject to four small text edits (R2-1 to R2-4).** R1-1 to R1-11 are applied correctly. The four edits fix command boundaries, the order of the first commit and two line citations. If they are applied verbatim, no further review round is needed: the orchestrator can check them by diff and record my sign-off. |

## 1. What I verified

- **R1-1 to R1-11.** Every finding is applied as written or with stricter checks.
  - P1-03a is gone. P1-03b runs literal blocks.
  - P1-01 is SA-Astra's 1-hour copy-and-edit.
  - P1-02 uses G-STAGE with no index file.
  - P1-05 is one commit, one push and one edit.
  - The PR text includes §7.1 and "one and four workers".
  - G-FORMAT is explicit, the .NET directory is aligned, and the production guarantee is cited as §8.2.
- **SA-Astra's added safeguards** are sound, and I found no regression:
  - exit checks on every native call;
  - HEAD and the tested files re-checked before the pass record is written;
  - the raw-hash loop in G-QUALIFIED;
  - the patch-version check per log;
  - `focused.node` taken from the focused log;
  - site clean-up in `finally`;
  - the staged-path check before the commit;
  - poll only a lagging head;
  - pre-push bookkeeping that says "publication pending".
- **The pack's decision rows** are byte-identical to plan §5 (8 rows). Sizes:
  - developer 1.5 h (P1-02 0.5 h, P1-04 1 h);
  - SA 1 h (P1-01, plus the joint reviews);
  - orchestrator 0.9 h (0.1 + 0.5 + 0.3);
  - five locked runs, at most 1,725 s.
- **P1-01** [V] (`p1-pack-review2-reader.md`):
  - The cited edit list rebuilds the review-1 reader (SHA-256 `cfd0b963…`, 218 lines).
  - P1-01's one writer replacement then gives exactly `9130200bae6301c1a6f7da2f75edcf919377a93379bcacbcb4dc67c10c3c6ecc`.
  - Run from `Q:\git` (another working directory), the adapted reader writes the record: 70 rows, 35/35 equal, 14 side-cells both pass, process 589,246,464 of 1,610,612,736 bytes, accounted 242,014,758 of 1,254,096,896, and 10x10 at 4/5 on both sides.
  - A second run refuses, and both outputs are unchanged.
  - The fields that P1-03b block A and P1-04 step 2 read exist: `source.currentDigest`, `bench.cells[].cell/oldTen/newTen/equal/pairs/response.median`, `bench.memory.*` and `bridges`.
  - The strict G-FORMAT passes on the reader and both outputs.
- **Literal blocks** that SA-Astra's `pack-r1-dryrun.ps1` does not execute, extracted from the task files and run [V] (`p1-pack-review2-dryrun.md`):
  - The shared block aligns the .NET directory: it is `Q:\git` before the block.
  - G-WORKTREE accepts an exact allow-list and rejects a missing path.
  - P1-03b block A passes with a stub digest and synthetic focused logs. It rejects a different adoption digest and a focused helper line at quiet 15.
  - P1-03b step 3's lists work.
  - P1-05 step 1 passes, read-only, against the live remote and PR #11: main `b5eb858…`, head `826ce79…`, OPEN, unmerged.
  - P1-05 step 5 passes with the current head and body as stand-ins, and rejects a differing body.
- **Git and format behaviour** [V]:
  - Backslash pathspecs work in this Git (`git diff --numstat b5eb858 eca0f94 -- docs\design-detail.md` gives `15 7`).
  - `--diff-filter=MDTUXB` governs `--exit-code`: an added-only path exits 0, a modified path exits 1. So G-PROTECTED is correct.
  - The strict G-FORMAT passes today on `tests\generate.test.js` and `docs\design-detail.md` (P1-02 step 4 runs it on them) and on all eight pack files.

## 2. Findings and exact replacement text

### R2-1 (needed): P1-05 cannot run steps 1-5 in one session

**Why.**

- In this CLI each tool command is a fresh process, and nothing carries over. Check-list §3.2 already says so.
- P1-05 says "Run steps 1-5 in one PowerShell session", but two kinds of work sit inside that sequence:
  - step 1 ends with a manual review (`git log`, `pr-body.md`, approvals);
  - step 2 requires editing the two bookkeeping files before `git add`.

  Neither can happen inside one command. Run as separate commands, steps 2-5 would lack `$Main`, `$Before`, `$Fields`, `$Allowed` and `Get-Remote`.
- My own R1-4 text had the same flaw.

**Changes to P1-05.**

- Replace the paragraph under "## Steps" ("Run steps 1-5 in **one PowerShell session**. …") with:

  > Steps 1-5 run as **two PowerShell commands**. Each tool command is a fresh process: no variable, function or location survives it, and no file edit can happen inside one.
  >
  > - **Command 1** is step 1 and is read-only.
  > - The orchestrator then reviews the state and edits the bookkeeping (step 2's first paragraph).
  > - **Command 2** is the rest of step 2 and steps 3-5, run without a pause. It starts by repeating step 1's checks, so a change of state between the two commands stops it.
  >
  > Set a long tool wait; if a command is still running, read its output instead of starting it again. A failure is a stop, not an automatic retry. All writes below are relative to the repository after the shared directory fix.

- Step 1: replace its first two sentences ("**Preflight, read-only.** Paste the first three lines of check-list §3.2. Run G-PROTECTED, G-QUALIFIED and `npm run check` (check exit 0), then:") with:

  > **Preflight, read-only (command 1).** In one command, run:
  >
  > - the first three lines of check-list §3.2;
  > - G-PROTECTED and G-QUALIFIED;
  > - `npm run check`, followed by `if ($LASTEXITCODE -ne 0) { throw 'QUESTION: npm run check failed' }`;
  > - the block below;
  > - G-WORKTREE.

- Step 1, the paragraph after the code: replace "Run G-WORKTREE with the list above. Review" with "After command 1, review".
- Step 2: replace its title "**Bookkeeping commit.**" with "**Bookkeeping, then command 2.**". Keep the bookkeeping paragraph. Replace the sentence "Run G-WORKTREE and G-FORMAT with `$FormatFiles = @($Allowed | ForEach-Object { $_.Replace('/', '\') })` after those edits, then:" with:

  > Then run **command 2**, in this order:
  >
  > 1. the first three lines of check-list §3.2;
  > 2. step 1's code block again (it re-checks the refs, PR #11, ancestry and scope, and defines the constants, `$Allowed` and `Get-Remote`);
  > 3. G-WORKTREE;
  > 4. G-FORMAT with `$FormatFiles = @($Allowed | ForEach-Object { $_.Replace('/', '\') })`;
  > 5. the code block below;
  > 6. step 3's block;
  > 7. step 4's body block;
  > 8. G-FORMAT with `$FormatFiles = @("$raw\body.md")`;
  > 9. step 4's edit block;
  > 10. step 5's block;
  > 11. step 5's closing checks.

- Step 4: replace "Run G-FORMAT with `$FormatFiles = @("$raw\body.md")` before the edit:" with "In command 2, G-FORMAT with `$FormatFiles = @("$raw\body.md")` runs between this block and the edit:".
- Step 5: replace the paragraph after the code ("Run G-FORMAT on the two transient files, G-QUALIFIED and `git --no-pager status --porcelain --untracked-files=all` (exit 0, empty). Keep the ignored read/body until hand-over; do not stage them.") with:

  > End command 2 with three checks:
  >
  > - G-FORMAT with `$FormatFiles = @("$raw\body.md", "$raw\pr-after.json")`;
  > - G-QUALIFIED;
  > - `$st = @(git --no-pager status --porcelain --untracked-files=all); if ($LASTEXITCODE -ne 0 -or $st.Count) { throw 'QUESTION: the worktree is not clean after publication' }`.
  >
  > Keep the ignored read and body until hand-over; do not stage them.

- Commands and gates, second row: change the Command cell to "Command 1 (step 1, read-only)". Add this row after it:

  | Command | Where | Expected | Time limit |
  |---|---|---|---|
  | Command 2 (step 1 again, then steps 2-5) | Root, orchestrator | No throw; one commit, one push, one edit, verified | 10 min; read the same command if still running |

### R2-2 (clarity): command boundaries in the check-list, P1-02 and P1-03b

- **Check-list §3.3.** Replace the first paragraph ("Run from the root, with `$ErrorActionPreference = 'Stop'`. …") with:

  > Run from the root, with `$ErrorActionPreference = 'Stop'`. Every native command's exit must be checked; PowerShell's error preference alone does not make a nonzero native exit fail. Each tool command is a fresh process. Put a guard in the same command as the `$Allowed`, `$FormatFiles` or other variables it reads, after them, and re-paste those definitions in every command that runs the guard.

- **P1-02 step 6.** Replace "In the **same session** run:" with:

  > Append this to step 5's command. The gate and these checks are one command: a later command has neither `$dir` nor the shared functions.

- **P1-03b step 1.** Replace "in order in **one PowerShell session**. No variable survives a new tool call." with "in order as **one PowerShell command**. No variable survives a new tool command."
- **P1-03b step 3.** Step 3 is a new command, run after step 2's reading. Replace "Set the scope/format lists, run G-PROTECTED, G-STAGE, G-WORKTREE and G-FORMAT:" with:

  > In a new command, set the scope and format lists, then run G-PROTECTED, G-STAGE, G-WORKTREE and G-FORMAT in the same command. `$dir` comes from `index.json`.

  Insert these lines at the start of its code block, before `$Allowed = @(`:

  ```powershell
  Set-Location Q:\git\pentomino
  [Environment]::CurrentDirectory = (Get-Location).Path
  $ErrorActionPreference = 'Stop'
  $V = 'docs\improve-generating-phase-1\evidence\verification'
  $dir = "$V\" + (Get-Content -Raw -LiteralPath "$V\index.json" | ConvertFrom-Json).attempt
  if (-not (Test-Path -LiteralPath $dir -PathType Container)) { throw 'QUESTION: the attempt folder named by index.json is missing' }
  ```

### R2-3 (needed before P1-01): commit the pack and the review evidence first

**Why.** G-WORKTREE at P1-01 accepts only P1-01's outputs and bookkeeping. Today the pack and its review files are untracked (28 paths at my dry run). Run literally, the guard rejects the first of them (`?? docs/improve-generating-phase-1/evidence/sa-astra/pack-contract-checks.json`, in `p1-pack-review2-dryrun.md`). The response says to "include it with the reviewed pack before execution", but no task states that commit.

**Change.** In the check-list, insert after the index list in §1:

> **Before P1-01.** After both SAs sign the pack, the orchestrator makes one commit, `improve-generating-phase-1: task pack`, containing:
>
> - `tasks/improve-generating-phase-1/`: the check-list, the five task files, `review-1.md`, `review-1-response.md`, `review-2.md` and any later review file;
> - the review evidence `docs/improve-generating-phase-1/evidence/sa-astra/pack-*`;
> - the review evidence `docs/improve-generating-phase-1/evidence/sa-opus/p1-01-edit-proto.*`, `p1-03b-dryrun.*`, `p1-05-preflight-dryrun.*`, `p1-pack-review-checks.*` and `p1-pack-review2-*`.
>
> P1-01 then starts with `git --no-pager status --porcelain --untracked-files=all` printing nothing. G-WORKTREE rejects any other untracked file.

### R2-4 (minor): P1-01's line citations into the prototype

**Why.** In `p1-01-edit-proto.mjs` (178 lines) the line ranges are:

- `EDITS`: 22-124;
- the apply loop: 126-134;
- the two deletions: 135-142;
- the final `console.log` replacement: 143-144;
- the leftover check and the scratch runner: 145-178.

P1-01 cites ":22-144" for `EDITS` and ":146-163" for the deletions and final line. The second range points into the scratch runner, which the step says not to copy. [V] `p1-pack-review2-reader.md`, first row.

**Change.** In P1-01 step 2:

- replace "26 `EDITS` entries (:22-144)" with "26 `EDITS` entries (:22-124)";
- replace "final `console.log` replacement (:146-163)" with "final `console.log` replacement (:135-144)";
- replace "Do not copy its scratch runner/report writer." with "Do not copy its leftover check or scratch runner/report writer (:145-178)."

## 3. Evidence

These are unlocked reads only. There was no test runner, engine, commit, push or PR edit. Scratch folders under `tests/artifacts/` were removed.

| File (in `docs/improve-generating-phase-1/evidence/sa-opus/`) | Command | Result |
|---|---|---|
| `p1-pack-review2-reader.mjs` / `.md` | from `Q:\git`: `node pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review2-reader.mjs` | 10 checks pass: the prototype ranges, both reader hashes, relative writes from `Q:\git`, write-once, the record fields and figures, strict G-FORMAT |
| `p1-pack-review2-dryrun.ps1` / `.md` | from `Q:\git`: `pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review2-dryrun.ps1` | Literal blocks (check-list 6, P1-03b 5, P1-05 6) extracted and run as listed in section 1. Five rejections behave as expected, including today's G-WORKTREE stop (R2-3) |

Inline checks:

- the decision rows of plan §5 against the check-list (8 rows, identical);
- backslash pathspecs and `--diff-filter` exit codes (section 1);
- the strict G-FORMAT on `tests\generate.test.js`, `docs\design-detail.md` and the eight pack files;
- the R2-2 `$dir` derivation on a scratch `index.json`.

## 4. Sign-off

- SA-Opus: **accepted**, on the condition that R2-1 to R2-4 are applied verbatim. The orchestrator records the sign-off in check-list §7 once a diff shows the four edits. Any other change to the pack needs a new review.

SA-Opus, 2026-11-25.
