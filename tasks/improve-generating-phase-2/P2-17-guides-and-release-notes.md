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
| Slot, base SHA | |
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator (merge gate) | |
| Commit (slot), commit on `gen-v4` | |
| Issues and named items | |
