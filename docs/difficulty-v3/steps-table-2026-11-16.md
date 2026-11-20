# Generation steps table: browser page, gate GB-P5 and the release-notes amendment (MP18b, 2026-11-16)

Task MP18b of `tasks/difficulty-v3/` (the second part of MP18, added after MP17 by owner decision P-OD14). MP18a replaced the
Generator's card button and its dialog by the section "Generation steps" in step 3, under "Pieces to place". This task proves it in a real
browser: it rewrites `tests/browser/replay.html` and `tests/browser/replay.js` for the section, updates the two card-button expectations,
adds the check instrumentation that the runner's watchdog reads to six existing pages, runs gate GB-P5 (nine page runs), and records the
amended release notes and the amendments of the description of pull request #10. It changes no file of `core/`, `tools/`, `player/` or
`tests/fixtures/` and no file of MP18a (no GB-P5 page needed a fix). The scratch files of the run (the runner, the lock helper, the
evidence of the nine runs) are under `tests/artifacts/MP18b/`, which git ignores.

**GB-P5 result.** All nine page runs passed at the first attempt, with no CSP violation, no uncaught error and no watchdog failure; the
longest check of the gate took 17.9 s and the longest setup 1.3 s. No page run was repeated. The quick set passes with 1,485 tests,
`npm run -s check` passes, and the D35 guard and the repository-wide removal check print nothing.

## 1. Header

| Item | Value |
|---|---|
| Date | 2026-11-16 (all times +07:00) |
| Code revision | `3d36592` (`difficulty-v3 MP18a: Generation steps table (model, section, wiring, documents)`); this task's changes are on top of it, uncommitted when the gate ran |
| Base of the D35 guard | `0ed8800` |
| Node, browser | Node v26.13.0; Windows; Microsoft Edge 157.0.4341.60 (headless; `browser` of every `browser.json`) |
| Announcement | "GB-P5: nine page runs, one per invocation of the lock helper (`replay` main, keys and narrow, `rendering`, `generator-flow`, `generator-editor`, `acceptance`, `watchdog`, `puzzle-code-acceptance`; about 5–10 minutes of machine time plus the lock waits)". It was made in the orchestrator's dispatch brief of this task, which gave the go (the brief names the lock helper and the ports 8818 and 9318); every page run then went through the lock helper. |
| Developer start, end | 12:01:05; 12:25 (the record written last) |
| Gate start, end | the first page run starts at 12:09:56 and the last one ends at 12:14:48 (the loop returns at 12:15:04, after the helper's 15 s wait) |
| Machine time | the nine page runs took 167.1 s of command time in all and waited 5 s for the lock (all of it before the keys run of `replay`); the targeted tests 3.4 s (no wait); the quick set 35.3 s after a wait of 215.3 s (the Sudoku repository ran its technique task on the same machine) |
| Helper | `tests/artifacts/MP18b/dv3-lock.ps1`: the verbatim copy of `Invoke-Dv3Timed` of check-list section 7 (the 20-minute slot rule; compared with the check-list block, identical). Every invocation was bounded at 590 s or less; none was stopped at its limit; no lock was held across commands; the helper waited 15 s after each release. |
| Runner | `tests/artifacts/MP18b/pages.mjs`: the verbatim code block of "Running the pages" of `MP18b-steps-page-and-gate.md` (compared with the task file, identical; `node --check` passes), ports 8818 and 9318, profile `tests\artifacts\edge-MP18b\` |

### 1.1 Invocations of the lock helper

Label, exit (the runner's exit for a page: 0 when the run passed), start and end of the command, its seconds and the lock wait before
it. `npm run -s check`, the git commands and the removal check ran without the helper, as the task allows.

| # | Label | Exit | Start | End | Seconds | Lock wait (s) |
|---:|---|---:|---|---|---:|---:|
| 1 | MP18b targeted tests | 0 | 12:09:20 | 12:09:23 | 3.4 | 0 |
| 2 | MP18b GB-P5 replay | 0 | 12:09:56 | 12:10:05 | 9.4 | 0 |
| 3 | MP18b GB-P5 replay:keys | 0 | 12:10:26 | 12:10:35 | 9.5 | 5 |
| 4 | MP18b GB-P5 replay:narrow | 0 | 12:10:50 | 12:11:00 | 9.8 | 0 |
| 5 | MP18b GB-P5 rendering | 0 | 12:11:15 | 12:11:22 | 7.3 | 0 |
| 6 | MP18b GB-P5 generator-flow | 0 | 12:11:37 | 12:12:22 | 44.5 | 0 |
| 7 | MP18b GB-P5 generator-editor | 0 | 12:12:37 | 12:12:45 | 8.5 | 0 |
| 8 | MP18b GB-P5 acceptance | 0 | 12:13:00 | 12:13:18 | 17.3 | 0 |
| 9 | MP18b GB-P5 watchdog | 0 | 12:13:33 | 12:13:46 | 13.2 | 0 |
| 10 | MP18b GB-P5 puzzle-code-acceptance | 0 | 12:14:01 | 12:14:48 | 47.6 | 0 |
| 11 | MP18b quick set | 0 | 12:20:28 | 12:21:04 | 35.3 | 215.3 |

The same quick set ran once before (start 12:15:32, 1,485 of 1,485 tests passed, 34.7 s as the Node runner reports it); its helper line
was not kept (the command's output was assigned to a variable by mistake), so it was run again as invocation 11 for the record. No
page run was repeated and no fix was made after a run, so `tests/artifacts/MP18b/pages/earlier/` does not exist.

## 2. D35

```text
git --no-pager diff --stat 0ed8800 -- core tools player tests/fixtures      (nothing; exit 0, before the gate and after the work)
git --no-pager status --short -- core tools player tests/fixtures           (nothing; exit 0, before the gate and after the work)
```

No file under `core/`, `tools/`, `player/` or `tests/fixtures/` differs from `0ed8800`, so no rating, puzzle or generated value changed.

## 3. GB-P5

Nine runs of `tests/artifacts/MP18b/pages.mjs` (ports 8818 and 9318), one page and phase per invocation of the lock helper, in the order of
the task. Evidence: one directory per run, `tests/artifacts/MP18b/pages/NN/<page>/<phase>/` (`browser.json`, `page.png`, the screenshots)
and `tests/artifacts/MP18b/pages/NN/runs.json`. "Checks" counts the checks (a setup is counted apart); "longest" is the longest check by
the runner's clock and by the page's.

| # | Page | Phase | Result | Summary | Page s | Keys | CSP, uncaught | Checks | Longest check, runner / page (s) | Watchdog | Server PID | Edge PID | Invocation s | Lock wait s |
|---:|---|---|---|---|---:|---:|---|---:|---|---|---:|---:|---:|---:|
| 1 | `replay` | main | pass | 13/13 | 3 | 0 | 0, 0 | 13 + setup | 0.3 / 0.3 (setup 1 / 1.1) | none | 15336 | 24128 | 9.4 | 0 |
| 2 | `replay` | keys | pass | 1/1 | 3.2 | 8 | 0, 0 | 1 + setup | 1.3 / 1.4 (setup 1.3 / 1.3) | none | 13012 | 26240 | 9.5 | 5 |
| 3 | `replay` | narrow | pass | 1/1 | 2.1 | 0 | 0, 0 | 1 + setup | 0.4 / 0.4 (setup 1 / 1) | none | 15708 | 11916 | 9.8 | 0 |
| 4 | `rendering` | main | pass | PASS 18/18 | 0.9 | 0 | 0, 0 | 18 | 0.2 / 0.2 | none | 18664 | 18100 | 7.3 | 0 |
| 5 | `generator-flow` | main | pass | PASS 21/21 | 38 | 0 | 0, 0 | 21 | 17.9 / 17.9 | none | 9880 | 25968 | 44.5 | 0 |
| 6 | `generator-editor` | main | pass | PASS 29/29 | 2.1 | 0 | 0, 0 | 29 | 1 / 0.9 | none | 8276 | 24888 | 8.5 | 0 |
| 7 | `acceptance` | main | pass | PASS 16 checks, 4 blocked | 10.9 | 0 | 0, 0 | 16 | 3.1 / 3.1 | none | 17268 | 21680 | 17.3 | 0 |
| 8 | `watchdog` | main | pass | PASS 5/5 | 6.8 | 0 | 0, 0 | 5 | 5.8 / 5.8 | none | 18560 | 18488 | 13.2 | 0 |
| 9 | `puzzle-code-acceptance` | main | pass | `{"total":24,"spawned":123,"terminated":123,"failed":[]}` | 41.1 | 0 | 0, 0 | 24 | 10.1 / 10.1 | none | 11680 | 11212 | 47.6 | 0 |

- **Blocked checks of `acceptance.html`:** A1 (touch targets on a coarse pointer), B1 (a real screen reader), B2 (an approved axe audit) and
  B3 (Safari, Firefox on reference hardware, Android Chrome and iPhone Safari): the four known checks that need a person or a device; no
  other check is blocked.
- **Watchdog.** In every `browser.json` the field `watchdog` is `null` and every entry of `checks` is `PASS`. Every check of every run
  ended under 60 s by the runner's clock and by the page's (the longest is 17.9 s, `generator-flow`) and the setups of `replay.html`
  under 240 s (the longest is 1.3 s).
- **`puzzle-code-acceptance`** (KI-1's rule, no re-run allowance): passed at the first run, no module-worker error.
- **Processes.** Each run printed `server PID <n> stopped; profile removed`; the runner stopped each server and each Edge by PID, and the
  profile `tests\artifacts\edge-MP18b\` does not exist after the gate. No other process was stopped.
- **Failures and reruns:** none.
- **Existing pages changed.** `generator-flow.js` and `acceptance.js` (the card's buttons `select` and `remove`, the two expectations of
  the task); the function `check` only (the `CHECK-START` and `CHECK-END` lines) of `rendering.js`, `generator-flow.js`,
  `generator-editor.js`, `acceptance.js`, `watchdog.js` and `puzzle-code-acceptance.js`. No assertion, result count, phase filter or
  blocked check of these pages changed. No file of MP18a needed a fix.
- **Screenshots** (for the description of pull request #10): `tests/artifacts/MP18b/pages/01/replay/main/steps-wide.png` (a rated step
  opened, with its small board and score table, at 1280 x 900) and `tests/artifacts/MP18b/pages/03/replay/narrow/steps-narrow.png` (the
  rows stacked with their column names at 390 px).

## 4. The checks of `replay.html`

Seconds from the `checks` of each `browser.json`, by the runner's clock and by the page's. The setup runs first in every phase and adds no
result when it passes.

| Phase | Check | Result | Runner s | Page s |
|---|---|---|---:|---:|
| main | 0 setup: the shared run (a Hard set on the 10 x 6 board, two puzzles) and its candidate card | PASS | 1 | 1.1 |
| main | 1 section: under Pieces to place, the replay matches, every stage has a heading, cards have two buttons | PASS | 0.2 | 0.2 |
| main | 2 rows: Key steps by default, numbered steps, stage headings, the final row's pieces, rules and score | PASS | 0 | 0 |
| main | 3 expand: a layout step and a rated step open in turn; the focus stays; the main board is unchanged | PASS | 0.2 | 0.2 |
| main | 4 view: Every step shows more rows; an open step stays only when shown; the status line does not change | PASS | 0.1 | 0.1 |
| main | 5 shown again: the view is kept for another puzzle; a puzzle shown before comes back at once, without a run | PASS | 0.2 | 0.2 |
| main | 7 language: Vietnamese texts with a step open; the same step stays open and keeps the focus | PASS | 0.3 | 0.3 |
| main | 8 calibration: stage 4 needed no steps; highlights only in stages 5 and 6 | PASS | 0.1 | 0.1 |
| main | 6 unavailable: an imported puzzle keeps the section, with one row for the stored puzzle | PASS | 0.3 | 0.3 |
| main | 9 another puzzle: its own signal is aborted; a puzzle shown before is not run again | PASS | 0.1 | 0.1 |
| main | 10 a new generation: the replay is submitted again; the waiting text | PASS | 0 | 0 |
| main | 11 failure: the worker message and Try again | PASS | 0.1 | 0.1 |
| main | 12 incomplete, mismatch and unavailable: the status names the limit, the field or the reason; the last row is the stored puzzle | PASS | 0.1 | 0.1 |
| main | 13 no CSP violations and no uncaught errors | PASS | 0 | 0 |
| keys | 0 setup (as above) | PASS | 1.3 | 1.3 |
| keys | K keyboard: Tab and Shift+Tab go from one step button to the next; Enter opens and closes; an open step has no tab stop | PASS | 1.3 | 1.4 |
| narrow | 0 setup (as above) | PASS | 1 | 1 |
| narrow | N narrow: at 390 px with a coarse pointer the section is there, its rows stack with their column names, the table roles stay, nothing scrolls sideways | PASS | 0.4 | 0.4 |

- **Keys run:** the runner pressed 8 trusted keys, in this order: `Tab`, `Tab`, `Tab`, `Shift+Tab`, `Enter`, `Tab`, `Shift+Tab`, `Enter`.
- **Narrow run:** the viewport of its `browser.json` is 390 x 844 with `coarse: true` (a coarse pointer), as the check requires.
- **Main run:** the viewport is 1280 x 900 (`coarse: false`); the screenshot `steps-wide` was taken after check 3.

## 5. Quick set, check and removal

| Command | Result |
|---|---|
| `node --test --test-skip-pattern=slow tests/replay-model.test.js tests/generator-i18n.test.js tests/generator-state.test.js tests/generator-import.test.js` (through the helper, limit 300 s) | 97 tests, 97 passed, 0 failed, 3.3 s |
| `node --test --test-skip-pattern=slow "tests/**/*.test.js"` (the quick set, through the helper) | 1,485 tests in 127 suites, 1,485 passed, 0 failed, 0 skipped, 35.2 s (the helper's 35.3 s; lock wait 215.3 s); the same result in the earlier run (34.7 s) |
| `npm run -s check` | `check-conventions: OK`, `check-site: OK`, exit 0 |
| the D35 guard (section 2) | nothing printed |
| the repository-wide removal check (the `git --no-pager grep -n -I --untracked -E ...` command of the task, case-sensitive, excluding `tasks`, `docs/difficulty-v3` and `tests/replay-model.test.js`) | nothing printed, exit 1 (no match) |

No Node test changed in this task.

## 6. MP17's named item

"Generation Steps on phones (MP16b; the pack author's ruling Q3)" of MP17's record section 10 is closed by P-OD14: the steps are in step 3
on every screen size (check N). MP17's record (`final-2026-11-15.md`) stays as it is, as history.

## 7. Release notes amendment

The paragraph below replaces, for every reader after MP18, the paragraph "Generation Steps." of section 11 "For users" of
`final-2026-11-15.md` (that record is not edited):

> **Generation Steps.** In step 3 of the Generator, under "Pieces to place", the section "Generation steps" shows how
> the puzzle on show was made, step by step (the piece count, the carving, the pieces, the layout, the clue sets that
> were rated, the repairs and the final puzzle), with the pieces of each step, the deduction rules (by name) and
> decisive guesses it used, and its score, in key steps or every step; opening a step shows a small board of that step
> and its full score table, and the main board keeps showing the puzzle. It is there on every screen size, phones
> included; it fills in by itself when a puzzle is shown, waits while a generation runs and never delays one, and a
> puzzle shown before comes back at once. A puzzle whose steps cannot all be replayed (an imported puzzle, one made
> by an earlier version, or one made on a piece set saved by an earlier version) keeps the section, which says that
> its steps are not available and shows the stored puzzle with its score. Packs written by this version carry a small
> optional provenance record (`generation.setOrigin`, `generation.made`) for it. A replay is bounded by work, not by
> a clock; one measurement on a 20 x 18 Nightmare puzzle took 1.7 seconds.

## 8. Amendments of the description of pull request #10

For the orchestrator, who applies them after accepting this task. Each is "replace ... with ...", quoted exactly; `<...>` marks a value
the orchestrator fills (`<date>` is 2026-11-16 and `<a>`, `<b>`, `<c>`, `<k>` and `<count>` are filled from the gate). The two screenshots
to upload are in section 3.

1. In "Summary", replace

   ````text
   The Generator also gets a new **"How it was made"** dialog that replays how a puzzle was generated, step by step, with its score table.
   ````

   with

   ````text
   The Generator also shows **Generation steps** in step 3, under "Pieces to place": a table of how the puzzle on show was generated, step by step, with the pieces, the deduction rules and the score of each step.
   ````

2. In "Summary", replace `(MP01 to MP17)` with

   ````text
   (MP01 to MP18b; MP18a and MP18b were added after MP17 by owner decision P-OD14)
   ````

   and after `The final regression gate (GZ, MP17) passed on this branch.` add

   ````text
   Gate GB-P5 (MP18b) passed after the Generation steps change; its record is [`docs/difficulty-v3/steps-table-2026-11-16.md`](<link pinned to the commit, as the link of the final record>).
   ````

3. Replace the block **Generation Steps ("How it was made")** and its four bullets with:

   ````markdown
   **Generation steps** (owner decision P-OD14, which replaced the "How it was made" card button and its dialog)
   - **Where:** in step 3 of the Generator, under "Pieces to place", on every screen size, phones included.
   - **What it shows:** one row per step, under its stage (piece count, carving, pieces, layout, rating clue sets, uniqueness repair, the final puzzle), in key steps or every step: the step's sentence, its pieces, the deduction rules it used (by name, with counts) and its decisive guesses, and its score (in or outside the band of the requested level, an estimate, refused or unrateable).
   - **Opening a step:** a small board of that step and its full score table; the main board keeps showing the puzzle.
   - **Puzzles whose steps cannot all be replayed** (imported, made by an earlier version, or made on a piece set saved by an earlier version): the section stays and says that the steps are not available, with one row for the stored puzzle and its score.
   - **Provenance:** packs written by this version carry a small optional provenance record (`generation.setOrigin`, `generation.made`) for it.
   - **Bounds:** a replay is bounded by work, not by a clock. It runs by itself when a puzzle is shown, waits while a generation runs and is kept for the puzzles shown before. One 20x18 Nightmare puzzle replayed in 1.7 s.
   ````

4. In "Screenshots", replace the three images of the card and the dialog and their captions with the following (the orchestrator uploads
   both images from the paths of section 3):

   ````text
   From gate GB-P5 (headless Edge, page tests/browser/replay.html, real engine and workers):
   Generation steps under "Pieces to place", with a step opened (its small board and score table):
   [image steps-wide.png]
   On a phone (390 px), the rows stack with their column names:
   [image steps-narrow.png]
   ````

   (the first line is the introduction, the second and the fourth are the two captions, the third and the fifth are the images.)

5. In "Implementation overview", **Generator**: replace

   ````text
   `ui/replay-dialog.js` and `ui/replay-model.js`: new, the Generation Steps dialog and its model.
   ````

   with

   ````text
   `ui/generation-steps.js` and `ui/replay-model.js`: new, the Generation steps section and its model.
   ````

   and replace

   ````text
   `ui/puzzle-panel.js`: the card button.
   ````

   with

   ````text
   `ui/puzzle-panel.js`: the Generation steps section under the pieces to place.
   ````

   The size figures and the commit count are recounted by the orchestrator.

6. In "Validation", add a bullet:

   ````text
   **Generation steps (MP18b, gate GB-P5):** the nine page runs pass (`replay` main 13/13, keys 1/1 with 8 trusted keys, narrow 1/1; `rendering`, `generator-flow`, `generator-editor`, `acceptance` (16 checks, 4 blocked), `watchdog` and `puzzle-code-acceptance`), with no CSP violation, no uncaught error and every check under a minute (the runner's check watchdog); the quick set passes with 1,485 tests.
   ````

7. In "Known limitations", **Interface**: delete the bullet

   ````text
   **Phones:** Generation Steps cannot be opened below 768 px, where the Generator shows no cards.
   ````

8. In "Commits by task": add the row

   ````text
   | MP18a, MP18b | <MP18a commit>, <MP18b commit> | Generation steps table in step 3 (P-OD14) |
   ````

   after the MP17 row, and add the two pack commits of P-OD14 (`2daf57c`, the pack, and the commit "difficulty-v3: MP18a/MP18b
   amendments after SA2 cross-review", `<commit>`) to the row "Pack and decisions", whose subject becomes

   ````text
   Owner decisions P-OD1 to P-OD14, pack reviews and amendments
   ````
