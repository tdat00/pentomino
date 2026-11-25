# P2-17: Guides, N-P1-DOC, README, tools README and the release-notes text

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.9 (guide sentence), §4.10 (documents), §10 (N-P1-DOC); D-P2-02, D-P2-16; review-1 R14, R15 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-17` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | join; P2-15, P2-12c, P2-12e, P2-13f, P2-14b, P2-16b and P2-16c (every tool and page it documents) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.5 h; machine: none (documents) |

## Goal

Players read in both languages that a hopeless Nightmare set request stops early; developers find the phase-2 tools,
the new fixtures and `tools/ig-proto/` in both developer guides (closing N-P1-DOC before any merge); PR #14 gets a
draft description that states what changed, what is not validated yet, the phase-1 dependency and that nothing is
merged.

## Authority and fixed points

- The guide sentence, verbatim (plan §4.9, D-P2-16):
  - English: For a Nightmare set, if the first four piece sets tried all end the same way without a puzzle of the
    level, the Generator stops early and says so, instead of running to the time limit.
  - Vietnamese: Với bộ mảnh mức Ác mộng, nếu bốn bộ mảnh thử đầu tiên đều kết thúc theo cùng một cách mà không tìm
    được đề đạt mức, trình tạo dừng sớm và báo lý do, thay vì chạy đến hết thời gian cho phép.
- `AGENTS.md`: `README.md` is a short English overview; the guides stay in step in both languages.
- Not claimed: any validation result (P2-18 to P2-21 have not run); Hell 1 offers (phase 3); a merge or release.

## Scope

- **Change:** `USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `README.md` (only if its
  feature list names the generator's behaviour), and `tools/ig-proto/README.md` (a new section at the end).
- **Create:** `docs/improve-generating-phase-2/pr-body.md`, the draft PR #14 description.
- **Do not change:** anything else. Guard: G-PROTECTED (`tools/ig-proto/README.md` is excluded from it, for this task
  only), and G-WORKTREE with

  ```powershell
  $Allowed = @('USERGUIDE.md', 'USERGUIDE.vn.md', 'DEVELOPERGUIDE.md', 'DEVELOPERGUIDE.vn.md', 'README.md',
    'tools/ig-proto/README.md', 'docs/improve-generating-phase-2/pr-body.md',
    'tasks/improve-generating-phase-2/P2-17-guides-and-release-notes.md')
  ```

## Steps

1. `USERGUIDE.md` and `USERGUIDE.vn.md`: add the guide sentence, verbatim, as its own paragraph directly after the
   paragraph that explains "New piece set" (find it with `Select-String -Path USERGUIDE.md -Pattern 'piece set'`; the
   Vietnamese file's matching paragraph with `bộ mảnh`).
2. `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`:
   - a paragraph "Measurement harness (`tools/ig-proto/`)": what it is (test-side tooling of the improve-generating
     work; copies, never production edits; its own README), the lock rule (every timed or heavy run through
     `tools\ig-proto\lock\ig-lock.ps1`), and the phase-2 tools of `tools/ig-proto/phase2/` (copies, trace, reader,
     proofs, driver, comparator, replay probes, browser runner). This closes N-P1-DOC;
   - in the browser pages list (`DEVELOPERGUIDE.md` lines 59-63, `DEVELOPERGUIDE.vn.md` lines 60-64), add the page of
     P2-16b: "`watchdog.html` or `acceptance.html`" becomes "`watchdog.html`, `deadline.html` or `acceptance.html`",
     and "`watchdog.html` hoặc `acceptance.html`" becomes "`watchdog.html`, `deadline.html` hoặc `acceptance.html`".
3. `README.md`: if its feature list describes generation, add this line, verbatim (R14): "Nightmare uses the `gen-v4`
   search except on the full 26×26 board; its bounded set search can stop early with a reason." Otherwise no change;
   the final report says which.
4. `tools/ig-proto/README.md`: append a section `## Phase 2 (production validation)` with:
   - the layout of `tools/ig-proto/phase2/`;
   - every command of P2-12b to P2-16e with its arguments: `copies.mjs`, `proofs.mjs`, `p2.mjs` (`plan`, `seal`,
     `ledger`, `reserve`, `release`, `run-group`, `status`, `publish`, `report`, `twins`), `run-group.ps1`,
     `replay-probe.mjs`, `browser-run.mjs`, and the test files;
   - the record formats: a pointer to `tasks/improve-generating-phase-2/contracts.md` (C1 to C16);
   - the ledger rule (check-list §3.5 of the phase-2 pack) and where raw files and evidence go.
5. `docs/improve-generating-phase-2/pr-body.md`: sections "What changes" (the route, `gen-v4`, seven keys, P5 bound,
   deadlines and the host guard, texts), "Compatibility" (old records stay, steps refused by version, forward check),
   "Not yet validated" (the phase-2 validation P2-18 to P2-21 is pending; no performance claim), "Depends on" (PR #11,
   phase 1, unmerged), "Not merged" (no merge, release or deployment without the owner's instruction). English.
6. G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| (text checks) | guide sentence | `Select-String -SimpleMatch` of each language's sentence | one hit each |
| (text checks) | the page list | `Select-String -SimpleMatch` of `` `deadline.html` `` in both developer guides | one hit each |
| `npm run check` | site files | the guides | `check-site: OK` |

## Documentation

This task is the documentation.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| the two sentence checks | root | one hit each | 30 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |
| the merge order and the usage check (the orchestrator; ruling on P2-17, 2026-11-26) | main worktree | P2-17 merges after the P2-14b fix round, on the rebased branch. `tools/ig-proto/README.md` is a sealed input (`tools/ig-proto/`, C13), so its two `replay-probe.mjs` command lines must equal the merged script's usage. Run `node tools\ig-proto\phase2\replay-probe.mjs` with no argument: exit 2, and it prints the usage. A difference is a doc fix round before the seal | 1 min |

## Stop points and questions

- `QUESTION:` if the user guides have no "New piece set" paragraph to attach the sentence to.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-17-B01 | Both languages say the same, verbatim the approved sentence | sentence checks | command output |
| P2-17-B02 | N-P1-DOC closed in both developer guides | diff | diff |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-17-T01 | The PR draft claims no validation result and states the dependency and no merge | review of `pr-body.md` | file |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Documents updated in each language
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

Start and end times; files changed; the sentence checks; whether `README.md` changed; each AC row with its evidence;
questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w1, f8e1f939979541e2306c9cef87e727f8b11cf281 |
| Start, end, duration | dispatched 2026-11-26 02:33 +07:00 (developer 02:33:41 to about 02:40:30, QUESTION 1; doc fix round about 03:25); accepted 03:07 |
| Waiting for rulings | about 6 min (QUESTION 1 and seven deviations, SA-Opus); then held for the merge order (after the P2-14b fix round) |
| Agent id, model | 7e3ffb23-be3f-4188-9f02-ff2fa4fb12ea, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 64; 10,934,997 / 52,444 / 10,216,144 |
| AI credits | 334.31 |
| Questions and rulings | QUESTION 1 (G-FORMAT flagged README.md:7, an existing Markdown hard break): SA-Opus ruled the guard was stricter than tools/check-conventions.mjs; check-list 3.4 amended (9780bb4) to allow a Markdown line ending in exactly two spaces after text; README.md unchanged. Seven deviations accepted (sentence as an indented paragraph in list item 2; the harness bullet in Develop and test; the README line on the Generator bullet; --seed-index documented on condition of the merge order; tools README extras; --rehearse-cutover noted obsolete; the log is the orchestrator's). Merge order: after the P2-14b fix round, with the usage check |
| Fix rounds | 1 (the usage check found [--seed-index <i>] against the script's [--seed-index <0 to 3>]; the placeholder and its prose fixed) |
| Gates re-run by the orchestrator (merge gate) | usage check before the fix round: `node tools\ig-proto\phase2\replay-probe.mjs` (953347e) exit 2, usage `--all --out <dir> [--trees <dir>] | --item <n> --out <dir> [--trees <dir>] [--seed-index <0 to 3>]`: the --all line matched, the --item line differed (fixed); slot static guards with the amended G-FORMAT; merge gate and the usage check on the merged tree in the bookkeeping; developer: sentence, deadline.html and README checks one hit each, G-CHECK, G-PROTECTED, G-WORKTREE OK, copies 195 and 32 |
| Commit (slot), commit on `gen-v4` | this commit; its SHA on gen-v4 in the bookkeeping |
| Issues and named items | N-P1-DOC closed (both developer guides list tools/ig-proto/); the owner may reword approved texts (D-P2-16); the Vietnamese harness paragraph has had no native review (owner's text pass if wanted); re-check the tools README commands if P2-18 to P2-20 change a tool |
