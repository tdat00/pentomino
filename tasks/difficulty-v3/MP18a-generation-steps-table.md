# MP18a — Generation steps table: row model, section, wiring, removal of the dialog, documents

| Header | Value |
|---|---|
| ID | MP18a (first part of MP18, added after MP17 by owner decision P-OD14; MP18b adds the browser page, gate GB-P5 and the release-notes amendment) |
| Depends on | MP17 (accepted and committed; the code at `0ed8800`) and the pack revision of P-OD14 (this file, MP18b, check-list §4.1 P-OD14 and §4.2 D43) |
| Estimated size | Large: about 1,100–1,500 changed lines, deletions included (`replay-model.js` about +270/−200, `generation-steps.js` about 420 new, `replay-dialog.js` −382, `puzzle-panel.js` and `app.js` about +30/−45, the locales about +50/−24, CSS about +210/−230, `tests/replay-model.test.js` about +400/−290, documents about +120/−80 in both languages); about 100–150 minutes of developer work and about 5 minutes of machine time |
| Owner role | Generator UI |
| Milestone | M11 — Generation steps table (P-OD14) |
| Design refs | check-list §4.1 P-OD14 (the owner's request of 2026-11-16 and his answers Q1 (a) and Q2 (a)) and §4.2 D43 (this design; it supersedes in part D34 and RES-31's card button and dialog); `docs/difficulty-v3/report-detailed.md` RES-29 and RES-30 (the replay and its score tables, unchanged); the Sudoku repository's Generation steps (its `generator/design.md` §7.3; the idea only, nothing is copied) |
| Gates owned | none (the browser page and gate GB-P5 are MP18b's) |
| Implementation status | Not started |

## Goal & business context

The owner asked on 2026-11-16 at 07:37 (P-OD14): "pentominio difficulty-v3: thay nút "How it was made" bằng 1 table bên
dưới "Pieces to place" (step 3), tương tự "Generation Steps" trong sudoku. Cần hiện các steps sinh đề, mỗi step thể hiện
các kỹ thuật, các mảnh, số điểm... nếu có" — replace the "How it was made" button with a table below "Pieces to place"
(Generator step 3), similar to Generation Steps in Sudoku, showing the steps that generated the puzzle, each with its
techniques, its pieces and its score where applicable. He then chose **Q1 (a)**: an opened step shows a small board of
that step next to its score table, and the main board keeps showing the puzzle; **Q2 (a)**: a puzzle without a record
of how it was made (imported or older) keeps the section, which says "Steps not available for this puzzle" and shows one
row for the stored puzzle with its score.

This task builds the section "Generation steps" in step 3, directly under "Pieces to place", in every layout (phones
included): a status line, the view switch (Key steps, Every step) and a table of the steps of the replay that MP15a1 to
MP15b deliver, grouped under their stages, each row with its sentence, its pieces, the deduction rules and decisive
guesses it used, and its score; a row opens to show its small board and its full score table. The replay runs by itself
for the puzzle on show, is kept for the puzzles shown before, gives way to a generation and comes back after it. It
removes the card button "How it was made", the dialog of MP16a and MP16b and its playback, and updates the documents.
The engine, the replay data, the worker task, the protocol and the client do not change (D35). MP18b proves it in a
browser and amends the release notes.

## Scope

### In scope

- `generator/ui/replay-model.js`: the row model (`rowLabel`, `stepPieces`, `stepTechniques`, `stepScore`), the stage
  groups (`stageGroups`), the rule names in the Rules line, list parameters in descriptors, and the section's controller
  `createStepsController`, which replaces the dialog's controller; the playback and the `interrupted` failure removed.
- `generator/ui/generation-steps.js` (new, DOM): `mountGenerationSteps`, the section.
- `generator/ui/puzzle-panel.js`: the section mounted after `ul.detail-pieces` and fed on every render; the card button
  removed.
- `generator/app.js`: the option `replay` passed to the panel; the dialog removed.
- `generator/ui/replay-dialog.js`: deleted.
- `generator/locale.en.js`, `generator/locale.vi.js`: the keys of "Locale keys" below, added, changed and removed.
- `generator/generator.css`: the section's styles; the card button's and the dialog's rules removed.
- Tests: `tests/replay-model.test.js` ("Tests that change" and cases 1 to 9).
- Documents: `docs/design-detail.md` §3.1, §4.2 (one comment), §6.12, §8.1 (one sentence), §10.5, §11.7 (one item)
  and §11.11; `docs/design-brief.md` (step 6); `USERGUIDE.md`, `USERGUIDE.vn.md`; `DEVELOPERGUIDE.md`,
  `DEVELOPERGUIDE.vn.md` (the code-layout paragraph); `README.md` (the feature line). The exact texts are in "Documents"
  below.

### Out of scope

- Everything under `core/`, `tools/`, `player/` and `tests/fixtures/`: the engine and the replay
  (`core/engine/replay.js`), the worker task and protocol (`core/engine/tasks.js`, `core/engine/protocol.js`), the
  client, the pool and the auxiliary queue (`core/browser/generation-client.js`, `worker-pool.js`, `auxiliary.js`),
  `core/browser/svg-board.js` (its `highlightedIds` is used as it is), `core/browser/piece-look.js` (used as it is) and
  the Player. The Player's own **Replay** button and its `onReplay` callbacks (`player/app.js`, `player/ui/*`) are a
  different feature and stay.
- `generator/state.js` (`replaySourceOf` and `isBusy` are used as they are) and `generator/jobs.js`.
- `tests/browser/` (MP18b rewrites `replay.html` and `replay.js` and changes two expectations of `generator-flow.js` and
  `acceptance.js`), gate GB-P5, design §13.3 and the release-notes amendment (MP18b).
- Any rating, generated puzzle, fixture or pinned value (check-list D35).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Browser modules: `// @ts-check`, JSDoc types, ES modules with `.js`, 2-space indent, single quotes, semicolons.
  `replay-model.js` stays pure: no DOM, no timer, no storage. `generation-steps.js` touches no DOM at module top level
  (Node imports it through `puzzle-panel.js` in `tests/generator-import.test.js` and `tests/puzzle-snapshot.test.js`).
- Every visible text has a key in both packs with the same `{placeholders}` (`tests/generator-i18n.test.js`). No text is
  built by gluing translated fragments, except a list of descriptors joined with ", " (the rules of a step) and the
  glyphs ▸ and ▾ of the step buttons, which are icons hidden from assistive technology (as ✕ and ⟲ elsewhere).
- No inline style: the CSP of the pages forbids `style` attributes (`el` and `svgEl` refuse them); a swatch colour is the
  SVG presentation attribute `fill`, as `svg-board.js` draws pieces.
- **D35 guard.** Nothing under `core/`, `tools/`, `player/` or `tests/fixtures/` changes. Before the reply both commands
  print nothing: `git --no-pager diff --stat 0ed8800 -- core tools player tests/fixtures` and
  `git --no-pager status --short -- core tools player tests/fixtures`.
- Run only the commands of the test plan; no browser page in this part (MP18b's gate). Never stage, commit, stash, reset,
  push or switch branches; never edit `tasks/difficulty-v3/`, the reports, `docs/difficulty-v3/` or `tests/browser/`.
- **Amendment L1 (lock; orchestrator decision 2026-11-13).** The Sudoku repository runs on the same machine. Save the
  helper `Invoke-Dv3Timed` of check-list §7 ("Shared-machine lock protocol") verbatim as
  `tests/artifacts/MP18a/dv3-lock.ps1` and dot-source it in every call. Every test run of the test plan goes through it:
  one bounded command per acquisition of the lock, at most 590 s, at least 15 s between releasing the lock and taking it
  again (the helper waits), never a lock held across a series of commands; a slot that stays taken for 20 minutes is
  reported to the orchestrator, not guessed away. Only `npm run check`, the git commands, the removal check and, while
  you work, a single test file that ends within 10 seconds run without it (`node --test tests/replay-model.test.js`
  takes about 3 seconds). A command that the helper stops at its limit has an error: report it, never rerun it outside
  the helper. The reply gives each invocation's label, exit, seconds and lock wait.
- Every test run finishes within 10 minutes (`AGENTS.md`); a longer run has an error: cancel it and investigate.
- Scratch files go under `tests/artifacts/MP18a/` and never end in `.test.js` (the test glob reaches that folder).
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace, no tab indentation; no absolute path in a document.
  Check `$LASTEXITCODE` after every `node`, `npm` and `git` command.

### Stop points (`QUESTION:`)

Stop, write a line starting `QUESTION:` with the facts and the answer you propose, and wait; the orchestrator forwards it
to the pack author (SA1), whose answer is binding unless it needs the owner:

- a change seems needed outside the files of this task, in particular anything under `core/`, `tools/`, `player/`,
  `tests/fixtures/` or `tests/browser/`, or in `generator/state.js` or `generator/jobs.js`;
- a test of an earlier task would have to change beyond "Tests that change" below, or a quick-set test fails for a reason
  this file does not explain;
- a visible text, a layout or a behaviour that this file does not decide, or an anchor that does not match the code;
- the D35 guard or the removal check prints anything you cannot remove within the files of this task.

## Inputs & context

Anchors are at `0ed8800`; find a moved line by the quoted text.

### What exists at `0ed8800`

- `generator/ui/puzzle-panel.js` (696 lines): the typedef `PuzzlePanelOptions` with `onReplay` (lines 43-44);
  `thumbnailCellPx(board, px)` (line 55, exported: the cell size that fits a board of any rotation into a square of `px`
  CSS pixels, clamped to 3–14); `mountPuzzlePanel(host, options)` (line 188); the detail
  `const detail = el('section', { className: 'puzzle-detail', … }, nav.element, detailHead, detailFrame,
  el('div', { className: 'detail-solution' }, solutionButton), detailTrayTitle, detailPieces);` (lines 257-258, where
  `detailPieces` is `ul.detail-pieces`); the `Card` typedef with `replay` (line 294); `createCard` (line 320) with
  `const onReplay = options.onReplay;` and the third button `card-replay ghost-small` (lines 329-334, 341, 350); the
  texts of that button in `renderCards` (lines 394-397); `renderDetail(state)` (line 458): the hidden branch
  (lines 461-468), `detailView.render({ … })` (lines 506-510), then `const signature = …` (line 511) and an early return
  when the pieces to place are already drawn; the returned `refresh` (lines 667-672) and `destroy` (lines 673-694).
- `generator/app.js`: the import of `replaySourceOf` from `./state.js` (line 15) and of `createReplayDialog` (line 23);
  the dialog (lines 124-132, created only when `typeof client.replayPuzzle === 'function'`); `onReplay` (lines 151-160)
  passed to the panel (line 165); `replayDialog?.refreshTexts()` in the language handler (line 334);
  `replayDialog?.dispose()` in `destroy()` (line 442). `destroy()` calls `controller.destroy()` before
  `puzzlePanel.destroy()`.
- `generator/state.js`: `replaySourceOf(state, puzzleId)` (line 199) → `{ set, puzzle, setOrigin, made }` or null; the
  fields keep their identity between store updates (`state.set`, `state.setOrigin`, `state.puzzleMade[id]`);
  `isBusy(state)` is `state.job !== null`. Puzzle ids are `p` + 12 hex digits of the progress fingerprint.
- `generator/ui/replay-model.js` (832 lines): `Desc` (line 25), `ReplayViewState` (line 49), `STAGE_COUNT` and
  `DEFAULT_INTERVAL_MS` (lines 58-59), `RULE_NAMES` (line 62), `descriptorKeys` (line 110), `renderDesc` (line 128),
  `compactIndices`, `compactSteps`, `stepKeyOf` (line 230), `visibleIndices` (line 248), `stepText` (line 261), the
  private `countsText(rules)` (line 323: today the string "R1 ×3, R3 ×2" or the descriptor `replay.table.rules.none`),
  `scoreTable` (line 426), `boardOf` (line 484), `stageList` (line 524), `statusText` (line 560), `failureText`
  (line 585), the private `failureOf` (line 596) and `createReplayController` (line 613, the dialog's, with playback).
- `generator/ui/replay-dialog.js` (382 lines): read `rowElement` and `drawScore` before deleting it; the section draws
  the score table with the same markup and classes (`table.pm-replay-table` with a caption, `th.pm-replay-row-head` with
  `scope="row"`, `span.pm-replay-name`, `span.pm-replay-detail`, `td.pm-replay-value`, `p.pm-replay-noscore`), whose
  CSS stays.
- `core/browser/svg-board.js`: `mountBoard(host, { mode: 'thumbnail', cellPx, rotation, label })` →
  `{ render(model), setRotation(theta), getState(), svg, destroy() }`; a thumbnail is `role="img"` with no focusable part
  and its `.pm-scroll` has `overflow: hidden` (`common.css`); `render` takes `highlightedIds`.
- `core/browser/piece-look.js`: `displayColor(color)` (the colour the board draws for a stored piece colour) and
  `pieceLabelText(label)` (the label as text, as piece names write it).
- `client.replayPuzzle(source, { signal })` (MP15b, design §8.1 **Replay task**): an auxiliary request. It waits while a
  generation runs; it rejects with `PoolAbortError('cancelled')` when its own signal aborts or a new generation begins,
  with `PoolError('worker-unavailable')` without a worker, with `PoolAbortError('closed')` when the client is disposed,
  and otherwise as MP15b lists. `REPLAY` bounds it (unchanged). Measured: about 0.07–0.24 s for the fixture's 10 x 6
  puzzles (the pack author's scratch run) and 1.7 s for one 20 x 18 Nightmare puzzle (MP17's record).
- `tests/fixtures/replay-case.json`: the real results of `tests/replay-model.test.js`. `RESULT` (the first candidate
  puzzle, 54 steps, `matched`) and `CALIBRATION_RESULT` (the calibration puzzle, 39 steps, `matched`, no stage-4 step)
  give the pinned values of cases 1, 3 and 4.

### The section (P-OD14, D43)

**Placement.** In step 3's puzzle detail, directly after "Pieces to place" (`ul.detail-pieces`), as the last child of
`section.puzzle-detail`, in every layout. Below 768 px the detail is the puzzle shown with ◀ ▶, so phones have the
section (P-OD14 closes MP17's named item "Generation Steps on phones"; MP17's record stays as history). It exists only
when the panel gets `PuzzlePanelOptions.replay` (a scripted test client without `replayPuzzle` gets no section, as its
cards had no button), and it is hidden with the detail.

**Content, top to bottom** (`generation-steps.js` builds it; `uid` is `generation-steps-<n>`, n counting the mounted
sections from 1):

```text
section.generation-steps [data-role="generation-steps"] [data-phase=idle|loading|ready|failed] [data-result=<status> or ""]
  h4.steps-title #<uid>-title                                   t('replay.title')            "Generation steps"
  div.steps-status [role="status"] [data-role="steps-status"]   one <p> per sentence (below)
  button.steps-retry [type="button"] [data-action="steps-retry"] [hidden unless failed]       t('replay.retry')
  fieldset.steps-view [hidden unless ready]
    legend                                                      t('replay.view.label')
    label.pm-toggle > input [type="radio"] [name="<uid>-view"] [value="compact"] [data-field="steps-view-compact"]
                      + span                                    t('replay.view.compact')
    label.pm-toggle > input [type="radio"] [name="<uid>-view"] [value="all"] [data-field="steps-view-all"]
                      + span                                    t('replay.view.all')
  table.steps-table [role="table"] [aria-labelledby="<uid>-title"] [hidden unless ready]
    thead [role="rowgroup"] > tr [role="row"] > th [scope="col"] [role="columnheader"] x 5
                                                                replay.col.step / what / pieces / techniques / score
    tbody.steps-group [role="rowgroup"] [data-stage="<n>"]      one per stage group (stageGroups, below)
      tr.steps-stage [role="row"] [data-mark=<mark or "available">]
        th [scope="rowgroup"] [colspan="5"] [role="rowheader"]
          span.steps-stage-name                                 the group's heading, "Stage 4: Piece layout"
          span.steps-stage-mark                                 its mark text, only when the group has a mark
      tr.steps-row [role="row"] [data-index="<i>"] [data-kind="<step.kind>"]   one per visible step of the group
        th [scope="row"] [role="rowheader"]
          button.steps-toggle [type="button"] [data-action="steps-toggle"] [aria-expanded="false"|"true"]
                             [aria-controls="<uid>-detail-<i>"] only while open
            span.steps-toggle-icon [aria-hidden="true"]         "▸" closed, "▾" open
            span.steps-toggle-label                             rowLabel(i): "Step 21"
        td.steps-what [role="cell"] [data-label=t('replay.col.what')]             the sentence, stepText(step)
        td.steps-pieces [role="cell"] [data-label=t('replay.col.pieces')]         span.steps-chips > span.steps-piece...
        td.steps-techniques [role="cell"] [data-label=t('replay.col.techniques')] span.steps-line per line
        td.steps-score [role="cell"] [data-label=t('replay.col.score')]           span.steps-line per line
      tr.steps-detail [role="row"] #<uid>-detail-<i> [data-index="<i>"]          only right after the open step's row
        td [colspan="5"] [role="cell"]
          div.steps-detail-body
            div.steps-board                                     mountBoard (thumbnail) of the step
            div.steps-score-table                               table.pm-replay-table, or p.pm-replay-noscore
```

- **The status line** (`p` elements in `div.steps-status`): `idle` none; `loading` `t('replay.waiting')` while the panel
  says a job runs (`busy`), else `t('replay.loading')`; `ready` the sentences of `statusText(result)`, each written with
  `renderDesc`; `failed` the sentence of `failureText(failure)`. The paragraphs are replaced only when the joined text
  changes (as the dialog's `drawStatus` did), so a redraw with the same text announces nothing.
- **A cell without content** (no piece, no technique, no score) holds the text `t('replay.cell.none')`, "—", and no
  span.
- **A piece chip** (`span.steps-piece[data-piece-id="<id>"]`, in the order `stepPieces` gives): an
  `svg.steps-swatch` (`viewBox="0 0 10 10"`, `aria-hidden="true"`, `focusable="false"`) holding one
  `rect` (`x` 0.5, `y` 0.5, `width` 9, `height` 9, `rx` 1.5, `fill` = `displayColor(piece.color)`), then a `span` with
  `pieceLabelText(piece.label)`. An id that is not in `set.pieces` is a chip with the id as its text and no swatch.
- **A line** of Techniques or Score (`span.steps-line`): a number is written with `format` (below), a descriptor with
  `renderDesc(desc, t, format)`, a list of descriptors with `renderDesc` for each, joined with ", ".
- **Numbers**: `format = (n) => formatNumber(n, { maximumFractionDigits: 6 })` of `generator/i18n.js`, as the dialog
  did; every model text goes through `renderDesc(desc, t, format)`.
- **The opened step's row** (`tr.steps-detail`): the board is
  `mountBoard(boardHost, { mode: 'thumbnail', cellPx: cellPxOf(source.set.board), rotation, label: t('replay.board') })`
  rendered with `{ board: source.set.board, pieces: source.set.pieces, clues, placements, highlightedIds, showLabels:
  true, showPatterns: true }` from `boardOf(step)`; the score table is `scoreTable(step, result.steps)` drawn as the
  dialog's `drawScore` and `rowElement` drew it (classes and markup above; a `message` gives
  `p.pm-replay-noscore`). `cellPxOf` is an option of the section; the panel passes
  `(board) => thumbnailCellPx(board, STEPS_BOARD_PX)` with `const STEPS_BOARD_PX = 240;` beside `DETAIL_BOARD_PX`.

**Drawing rules** (`generation-steps.js`):

1. `draw(state)` runs on every `onChange` of the controller. It sets `data-phase` and `data-result` (the result's status
   when `ready`, else the empty string), the status line, `hidden` of the retry button, the fieldset and the table, and
   `checked` of the two radios (`state.view`).
2. The table body is rebuilt (`drawTable`) when the phase becomes `ready`, when the result or the view changed since the
   last drawing, and on `refreshTexts()`. It keeps the `thead` element, replaces every `tbody` with those of
   `stageGroups(result, controller.visible())`, and draws the opened step's row when `state.expanded` is not null. If the
   focus was on a step button of this section before the rebuild, the button with the same `data-index` gets it back
   afterwards (`focus({ preventScroll: true })`) when it is still shown; otherwise the focus is not moved.
3. When only `expanded` changed, the rows are updated in place and nothing is rebuilt: the button that was open gets
   `aria-expanded="false"`, loses `aria-controls`, shows ▸, and its `tr.steps-detail` is removed (its board destroyed
   first); the newly open button gets `aria-expanded="true"`, `aria-controls`, ▾, and its `tr.steps-detail` is inserted
   right after its row. The focus stays where it was (on the pressed button).
4. Any other phase clears the table body (the open board destroyed) and hides the table and the fieldset.
5. Listeners: a step button's `click` calls `controller.toggle(index)`; a radio's `change` calls
   `controller.setView(value)` when it is checked; the retry button's `click` calls `controller.retry()`.

**The section's API:**

```js
/**
 * Generation steps of step 3 (owner decision P-OD14; design §6.12, §10.5, §11.11).
 * @param {HTMLElement} host The puzzle detail; the section is appended as its last child.
 * @param {{ t: (key: string, params?: Record<string, unknown>) => string,
 *   run: (source: ReplaySource, signal: AbortSignal) => Promise<ReplayResult>,
 *   cellPxOf: (board: { width: number, height: number }) => number }} options
 * @returns {{ element: HTMLElement, show(source: ReplaySource | null, context: { rotation: number, busy: boolean }): void,
 *   refreshTexts(): void, dispose(): void }}
 */
export function mountGenerationSteps(host, options)
```

- `show(source, context)` keeps `context.rotation` and `context.busy`, then calls `controller.show(source)`. When that
  call changed nothing (no `onChange`) but `busy` changed while the phase is `loading`, the status line is written again
  (waiting or loading). When the rotation changed and a step is open, its board gets `setRotation(rotation)` and is
  rendered again with the same model.
- `refreshTexts()` writes every fixed text again (the heading, the legend, the two radio labels, the retry button, the
  five column headers), the open board's `aria-label` (`t('replay.board')`) and then draws the current state with a
  rebuilt table and status line (rule 2, focus kept).
- `dispose()` disposes the controller, destroys the open board and removes the section.

### The row model (`generator/ui/replay-model.js`)

```js
/** @typedef {{ key: string, params?: Record<string, string | number | Desc | Desc[]> }} Desc */
/** @typedef {number | Desc | Desc[]} Line One line of a cell: a raw number, a descriptor or a list (joined with ", "). */
/**
 * @typedef {object} StageGroup
 * @property {1 | 2 | 3 | 4 | 5 | 6 | 7} stage
 * @property {Desc} heading `{ key: 'replay.stage.heading', params: { n: stage, name: { key: 'replay.stage.<stage>' } } }`
 * @property {'stopped' | 'none' | 'notAvailable' | null} mark The stage's mark of `stageList(result)`.
 * @property {Desc | null} markText The stage's mark text of `stageList(result)`.
 * @property {number[]} indices The visible steps of the group, in order; empty for a stage without steps.
 */
export const STEPS_CACHE_SIZE = 16;
export function rowLabel(index)            // { key: 'replay.row', params: { n: index + 1 } }
export function stepPieces(step, set)      // string[]: piece ids, set order first
export function stepTechniques(step)       // Line[]
export function stepScore(step)            // Line[]
export function stageGroups(result, visible)   // StageGroup[]
export function createStepsController(o)   // below
```

- **`renderDesc` and `descriptorKeys` take lists.** A parameter that is an array of descriptors is written as each
  descriptor written with the same `t` and `format`, joined with ", "; `descriptorKeys` walks the items of such an
  array in order (its own keys, depth first, as for a nested descriptor). Every other parameter is handled as today.
- **`countsText(rules)`** (private, used by the Rules line of `scoreTable` and by `stepTechniques`) returns, for R1 to
  R9 in that order, one descriptor `{ key: 'replay.uses', params: { rule: { key: 'replay.rule.R<k>' }, n } }` per rule
  whose count is a finite number above 0, as an array; or the descriptor `{ key: 'replay.table.rules.none' }` when
  there is none (also for `rules` that is not an object). The Rules line of the score table therefore names the rules:
  "Deduction tier 3; rule uses: Forced cell ×3, Forced piece ×1, Neck ×18".
- **`stepPieces(step, set)`** → piece ids by kind:

  | Kind | Ids |
  |---|---|
  | `piece` | the id of `step.board.placed[args.n - 1]`, when `args.n` is an integer of at least 1, that item exists and its id is not null; else none |
  | `retile` | `step.board.lifted` |
  | `rated`, `rejected`, `unrateable`, `selected`, `final` | `step.board.clues` |
  | `repair` | `[args.added]` when `args.added` is a string; else none |
  | `count`, `carve`, `start`, `skip`, any other kind | none |

  Order: the ids that `set.pieces` holds, by their index in `set.pieces`; then the other ids in the order given;
  duplicates dropped.
- **`stepTechniques(step)`**: no rating (`step.rating` not an object) → `[]`; a rating whose `model` is not
  `difficulty-v3` or whose `metrics` is not an object → `[{ key: 'replay.table.unavailable' }]` ("not available");
  else `[countsText(metrics.rules)]` followed, when `metrics.G` is a finite number above 0, by
  `{ key: 'replay.guesses', params: { count: metrics.G, proved: numOr(metrics.Gproved) } }`.
- **`stepScore(step)`**: an `unrateable` step → `[{ key: 'replay.table.unrateable' }]`; no rating → `[]`; else
  `numOr(rating.score)`, then, for a `difficulty-v3` rating with a finite score and `step.band` not null,
  `{ key: 'replay.score.inBand' }` when `band.min <= score` and (`band.max` is null or `score < band.max`), else
  `{ key: 'replay.score.outOfBand' }`; then `{ key: 'rating.note.estimateShort' }` when `rating.censored === true`; then
  `{ key: 'replay.table.refused' }` for a `rejected` step.
- **`stageGroups(result, visible)`**: when `result.status` is `'unavailable'` (a presented result, controller rule 4),
  seven groups in stage order, each with its heading: stages 1 to 6 with `mark` `'notAvailable'`, `markText`
  `{ key: 'replay.notAvailable' }` and `indices` `[]`, whatever `stageList(result)` says (it would say `none` for the
  stages of a group that was replayed); stage 7 with `mark` and `markText` null and `indices` `[last]`, `last =
  result.steps.length - 1` (0 for a presented result), when `visible` holds it, else `[]`. Otherwise: walk `visible`
  (indices into `result.steps`, in order) and cut it into runs of consecutive indices with the same `stage`; take the
  stages whose `stageList(result)` entry has `steps === 0`, in stage order; put each such stage, as a group with no
  indices, before the first run whose stage is greater, or after the last run when none is greater. Every group has the
  heading, the mark and the mark text of its stage. A stage that has steps always has a visible one in both views (the
  compact view keeps the first step of each stage).
- **`failureText(failure)`** takes `'worker-unavailable' | 'failed'` and returns `replay.failed.worker` or
  `replay.failed`.
- **Removed:** `ReplayViewState`, `DEFAULT_INTERVAL_MS`, `createReplayController` with its playback (`play`, `pause`,
  the scheduler, `intervalMs`) and `prev`, `next` and `seek`; the `interrupted` failure.

### The controller (`createStepsController`, in `replay-model.js`; pure, no timer)

```js
/**
 * @typedef {object} StepsState
 * @property {'idle' | 'loading' | 'ready' | 'failed'} phase
 * @property {ReplaySource | null} source The puzzle on show (null when idle).
 * @property {ReplayResult | null} result The presented result (rule 4): an `unavailable` one holds its final step only.
 * @property {'worker-unavailable' | 'failed' | null} failure
 * @property {'compact' | 'all'} view Kept from one puzzle to the next.
 * @property {number | null} expanded The index in `result.steps` of the open step, always a visible one, or null.
 */
/**
 * @param {{ run: (source: ReplaySource, signal: AbortSignal) => Promise<ReplayResult>,
 *   onChange: (state: StepsState) => void }} o
 * @returns {{ show(source: ReplaySource | null): void, retry(): void, setView(view: 'compact' | 'all'): void,
 *   toggle(index: number): void, visible(): number[], getState(): StepsState, dispose(): void }}
 */
export function createStepsController(o)
```

1. The first state is `{ phase: 'idle', source: null, result: null, failure: null, view: 'compact', expanded: null }`;
   creating the controller calls nothing. `onChange` gets a copy of the state after every change and never otherwise.
2. Two sources are **the same** when `a.set === b.set`, `a.puzzle.id === b.puzzle.id`, `a.made === b.made` and
   `a.setOrigin === b.setOrigin`.
3. `show(source)`: after `dispose()` nothing. `null`: when the state is already `idle` with no source nothing; else the
   running run is cancelled (rule 5) and the state becomes `idle` with `source`, `result`, `failure` and `expanded`
   null (the view is kept). The same source as `state.source`: nothing (no run, no change). Another source: the running
   run is cancelled; when `source.set` is not the set of the cache, the cache is emptied and takes this set; a cache
   entry of `source.puzzle.id` whose `made` and `setOrigin` are the same objects as the source's is a hit: it becomes the
   most recently shown, and the state becomes `ready` with its result (`failure` null, `expanded` null) at once; else the
   state becomes `loading` (`result`, `failure` and `expanded` null) and a run starts (rule 4).
4. A **run** calls `run(source, signal)` with a new `AbortController`'s signal (a synchronous throw counts as a
   rejection). A resolved value that is not an object with a non-empty `steps` array gives `failed` with `failed`. Any
   other value is **presented** first (P-OD14 Q2 (a)): a value whose `status` is `'unavailable'` becomes the new object
   `{ ...value, steps: [value.steps[value.steps.length - 1]] }` when that last step's `kind` is `'final'` (the same
   `status`, `reason`, `stages`, `compared` and `work`; the resolved value and its `steps` array are never changed),
   and gives `failed` with `failed` when it is not; every other value is presented as it is. The engine replays the
   stages that it can also for an `unavailable` result (with `FIRST` of the test file: 12 steps without the puzzle's
   record or with a completion record, 43 without the set's origin), but the section shows such a puzzle as its stored
   puzzle only, as Q2 (a) and the documents say. The presented result is stored in the cache (rule 6) and gives
   `ready` with that result and `expanded` null. A rejection with `PoolAbortError` whose `reason` is `'cancelled'` while
   the run's own signal is not aborted (a new generation began) starts a new run with the same source at once, changes
   nothing and calls no `onChange`. `PoolError` with `code` `'worker-unavailable'` gives `failed` with
   `worker-unavailable`; any other rejection gives `failed` with `failed`.
5. A run is **cancelled** by aborting its signal; its later answer, resolved or rejected, is ignored. A run is also
   ignored after `dispose()`.
6. **The cache:** a `Map` from puzzle id to `{ made, setOrigin, result }` for the set of the cache, in the order the
   puzzles were last shown; storing a result puts its id last; when it holds more than `STEPS_CACHE_SIZE` (16) entries
   the first one is dropped. A failed or cancelled run stores nothing.
7. `retry()`: in `failed` with a source, the state becomes `loading` (`failure` null) and a run starts; otherwise
   nothing.
8. `setView(view)`: a value other than `'compact'` or `'all'`, or the current view: nothing. Else `view` changes in any
   phase, and `expanded` stays when the new view shows it, else becomes null.
9. `toggle(index)`: in `ready`, when `index` is visible, `expanded` becomes null if it was `index`, else `index` (one open
   step at a time); otherwise nothing.
10. `visible()`: in `ready`, `visibleIndices(result.steps, view, stepKeyOf(source.set))` (a new array, computed once per
    result and view); otherwise `[]`. `getState()` returns a copy of the state.
11. `dispose()`: cancels the running run, empties the cache and stops every later call; it calls no `onChange`.

The panel calls `show` for the puzzle of its detail on every render, whichever wizard step is on screen; the replay is
an auxiliary request, so it never delays a generation (D26), and the cache makes a second showing free.

### The panel and the app

`generator/ui/puzzle-panel.js`:

1. Imports: add `replaySourceOf` to the import from `'../state.js'` (line 14) and
   `import { mountGenerationSteps } from './generation-steps.js';`.
2. Constants: `const STEPS_BOARD_PX = 240;` after `DETAIL_PIECE_SCALE` (line 22).
3. `PuzzlePanelOptions`: replace the `onReplay` property (lines 43-44) with

   ```js
    * @property {(source: import('./replay-model.js').ReplaySource, signal: AbortSignal) =>
    *   Promise<import('../../core/engine/replay.js').ReplayResult>} [replay] Runs the replay of a puzzle for Generation
    *   steps, the section under "Pieces to place". Without it step 3 has no such section.
   ```
4. After `const detail = …;` (line 258): `const steps = options.replay === undefined ? null : mountGenerationSteps(detail,
   { t, run: options.replay, cellPxOf: (board) => thumbnailCellPx(board, STEPS_BOARD_PX) });`
5. `Card` loses `replay`; `createCard` loses `onReplay`, the button `card-replay`, its listener and `replay` in the
   returned object, and builds `el('li', { className: 'puzzle-card', dataset: { puzzleId: id } }, select, remove)`;
   `renderCards` loses the block `if (card.replay !== null) { … }` (lines 394-397).
6. `renderDetail`: in the hidden branch, before `return;` (line 467):
   `steps?.show(null, { rotation: state.rotation, busy: isBusy(state) });`; after `detailView.render({ … });`
   (line 510) and before `const signature`: `steps?.show(replaySourceOf(state, puzzle.id), { rotation: state.rotation,
   busy: isBusy(state) });`.
7. `refresh`: `steps?.refreshTexts();` right after `render(store.getState());`. `destroy`: `steps?.dispose();` right
   after `printDialog.destroy();`.

`generator/app.js`: remove `replaySourceOf` from the import of `./state.js` (line 15), the import of
`createReplayDialog` (line 23), the comment and the dialog (lines 124-132), `onReplay` with its JSDoc (lines 151-160),
`replayDialog?.refreshTexts();` (line 334) and `replayDialog?.dispose();` (line 442); in the options of
`mountPuzzlePanel` replace `onReplay: …` (line 165) with

```js
    // A scripted client without replayPuzzle gets no Generation steps section.
    replay: typeof client.replayPuzzle === 'function' ? (source, signal) => client.replayPuzzle(source, { signal }) : undefined,
```

### Focus, announcements and layouts

- No modal and no focus trap. Opening or closing a step keeps the focus on the pressed button (drawing rule 3); a
  rebuilt table gives the focus back to the same step's button when it is still shown (drawing rule 2).
- The status line is the only live region (`role="status"`, polite). It changes when the phase changes, when a result
  arrives, when a waiting replay starts (waiting → loading) and on a language switch; never when a step opens or closes
  or the view changes. Nothing is announced per row.
- Tab goes from one step button to the next in row order: the stage rows have no focusable element and the small board
  has none (a thumbnail board is `role="img"` and does not scroll).
- **Wide layouts** (768 px and up): the table spans the detail's width; long texts wrap inside their cells
  (`overflow-wrap: anywhere`); the opened step's board and score table are side by side, the table wrapping under the
  board when the cell is narrow.
- **Narrow layout** (below 768 px; CSS only, `generator.css` below): the column headers are visually hidden (the
  `.sr-only` pattern of `common.css`), every row and cell of the body is a block, each `td` starts with its
  `data-label`, the opened step's board is above its score table, nothing scrolls sideways at 390 px, and the step
  buttons keep the 36 px target of the narrow layout (`--pm-target` 2.25rem of `common.css`; no rule of this task
  lowers a button's `min-height`). The explicit `role` attributes keep the table semantics when `display` changes.
- `prefers-reduced-motion`: the section has no transition and no animation.

### Styles (`generator/generator.css`)

Delete the rules of the card button (the comment "The "How it was made" button of a puzzle card" and its three rules,
lines 1131-1148) and of the dialog (the comment "Generation Steps ("How it was made")" through
`.pm-replay-stage[data-mark="stopped"] .pm-replay-stage-mark { … }`, lines 1150-1341, and `.pm-replay-actions` with the
two media blocks that name `.pm-replay-dialog`, lines 1397-1414). Keep the score-table rules as they are
(`.pm-replay-table` through `.pm-replay-noscore`, lines 1343-1395) and put this comment above them:
`/* The score table of an opened step (Generation steps, generation-steps.js). */`. Add, in their place before the
score-table rules, exactly:

```css
/* Generation steps (step 3, under "Pieces to place"; owner decision P-OD14): the replay of the puzzle on show as a
   table. Below 768 px every row stacks its cells; the table keeps its roles (set in generation-steps.js). */
.generation-steps {
  margin-top: 1.25rem;
}

.steps-title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.steps-status {
  margin: 0 0 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--gen-color-surface-2);
  border: 1px solid var(--gen-color-divider);
  border-radius: var(--gen-radius-2);
}

.steps-status:empty {
  display: none;
}

.steps-status p {
  margin: 0;
}

.steps-status p + p {
  margin-top: 0.25rem;
}

.generation-steps[data-result="matched"] .steps-status {
  border-color: var(--gen-color-success);
}

.generation-steps[data-phase="failed"] .steps-status,
.generation-steps[data-result="mismatch"] .steps-status,
.generation-steps[data-result="incomplete"] .steps-status,
.generation-steps[data-result="unavailable"] .steps-status {
  color: var(--gen-color-warning);
  background: var(--gen-color-warning-bg);
  border-color: var(--gen-color-warning);
}

.steps-retry {
  margin: 0 0 0.5rem;
}

.steps-view {
  min-width: 0;
  margin: 0 0 0.5rem;
  padding: 0;
  border: 0;
}

.steps-view legend {
  padding: 0;
  color: var(--pm-muted);
  font-size: 0.875rem;
}

.steps-view .pm-toggle {
  margin-inline-end: 1rem;
}

.steps-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.steps-table > thead > tr > th {
  padding: 0.375rem 0.5rem;
  color: var(--pm-muted);
  font-weight: 600;
  text-align: start;
  white-space: nowrap;
}

.steps-table > tbody > tr > th,
.steps-table > tbody > tr > td {
  padding: 0.375rem 0.5rem;
  text-align: start;
  vertical-align: top;
  overflow-wrap: anywhere;
  border-top: 1px solid var(--gen-color-divider);
}

.steps-stage > th {
  background: var(--gen-color-surface-2);
}

.steps-stage-name {
  font-weight: 600;
}

.steps-stage-mark {
  margin-inline-start: 0.5rem;
  color: var(--pm-muted);
  font-style: italic;
  font-weight: 400;
}

.steps-stage[data-mark="stopped"] .steps-stage-mark {
  color: var(--gen-color-warning);
}

.steps-row > th {
  font-weight: 400;
  white-space: nowrap;
}

button.steps-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  white-space: nowrap;
}

button.steps-toggle[aria-expanded="true"] {
  background: var(--gen-color-accent-soft);
  border-color: var(--gen-color-accent);
}

.steps-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.steps-piece {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.375rem;
  border: 1px solid var(--gen-color-divider);
  border-radius: var(--gen-radius-1);
}

.steps-swatch {
  flex: none;
  width: 0.75rem;
  height: 0.75rem;
}

.steps-swatch rect {
  stroke: var(--pm-border);
  stroke-width: 1;
}

.steps-line {
  display: block;
}

.steps-detail > td {
  background: var(--gen-color-surface-2);
}

.steps-detail-body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem 1rem;
}

.steps-board {
  flex: none;
  max-width: 100%;
  padding: 0.5rem;
  background: var(--gen-board-bg);
  border: 1px solid var(--gen-color-divider);
  border-radius: var(--gen-radius-2);
}

.steps-board .pm-board {
  width: max-content;
  max-width: 100%;
  height: auto;
}

.steps-board .pm-board[data-mode="thumbnail"] .pm-scroll {
  width: auto;
  height: auto;
}

.steps-score-table {
  flex: 1 1 18rem;
  min-width: 0;
}

@media (max-width: 767.98px) {
  .steps-table,
  .steps-table > tbody,
  .steps-table > tbody > tr,
  .steps-table > tbody > tr > th,
  .steps-table > tbody > tr > td {
    display: block;
  }

  .steps-table > thead {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .steps-table > tbody > tr {
    border-top: 1px solid var(--gen-color-divider);
  }

  .steps-table > tbody > tr > th,
  .steps-table > tbody > tr > td {
    padding: 0.125rem 0.5rem;
    border-top: 0;
  }

  .steps-table > tbody > tr > td[data-label]::before {
    content: attr(data-label);
    display: block;
    color: var(--pm-muted);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .steps-detail-body {
    display: block;
  }

  .steps-board {
    display: inline-block;
    margin-bottom: 0.5rem;
  }
}
```

The child combinators keep these rules off the score table nested in an opened step's row. Every colour is a theme
variable (all exist in `core/browser/theme.css`); the swatch's `fill` is the piece's display colour, as on the board.

### Locale keys (both packs; the i18n tests check the keys and placeholders)

In `generator/locale.en.js` (line 258) and `generator/locale.vi.js` (line 253) the comment
`// How it was made (the Generation Steps dialog)` becomes `// Generation steps (step 3, under Pieces to place)`.

**Changed value** (both packs): `replay.title` — EN `Generation steps`, VI `Các bước tạo đề`.

**Removed** (both packs, 10 keys): `replay.button`, `replay.button.aria`, `replay.close`, `replay.prev`, `replay.next`,
`replay.play`, `replay.pause`, `replay.slider`, `replay.stages`, `replay.failed.interrupted`.

**Added**, after `replay.table.refused`, in this order (23 keys; EN also has `replay.guesses_one`, so EN gets 24 lines and
VI 23; the plural convention of these packs: the base key is the plural form, `_one` the English singular):

| Key | English | Vietnamese |
|---|---|---|
| `replay.rule.R1` | `Forced cell` | `Ô bắt buộc` |
| `replay.rule.R2` | `Forced piece` | `Mảnh bắt buộc` |
| `replay.rule.R3` | `Pocket placement` | `Đặt mảnh vào vùng kín` |
| `replay.rule.R4` | `Piece claims cells` | `Mảnh chiếm ô` |
| `replay.rule.R5` | `Cell claims a piece` | `Ô chỉ nhận một mảnh` |
| `replay.rule.R6` | `Dead placement` | `Cách đặt dẫn tới mâu thuẫn` |
| `replay.rule.R7` | `Parity` | `Chẵn lẻ màu ô` |
| `replay.rule.R8` | `Neck` | `Chỗ thắt` |
| `replay.rule.R9` | `Pair exclusion` | `Loại trừ cặp` |
| `replay.uses` | `{rule} ×{n}` | `{rule} ×{n}` |
| `replay.guesses` | `{count} decisive guesses ({proved} proved)` | `{count} lần đoán quyết định ({proved} được chứng minh)` |
| `replay.guesses_one` (EN only) | `{count} decisive guess ({proved} proved)` | — |
| `replay.score.inBand` | `in band` | `trong khoảng điểm` |
| `replay.score.outOfBand` | `outside the band` | `ngoài khoảng điểm` |
| `replay.col.step` | `Step` | `Bước` |
| `replay.col.what` | `What happened` | `Diễn biến` |
| `replay.col.pieces` | `Pieces` | `Mảnh` |
| `replay.col.techniques` | `Techniques` | `Kỹ thuật` |
| `replay.col.score` | `Score` | `Điểm` |
| `replay.row` | `Step {n}` | `Bước {n}` |
| `replay.stage.heading` | `Stage {n}: {name}` | `Giai đoạn {n}: {name}` |
| `replay.cell.none` | `—` | `—` |
| `replay.retry` | `Try again` | `Thử lại` |
| `replay.waiting` | `The steps appear when the generation is done.` | `Các bước sẽ hiện khi việc tạo đề xong.` |

The nine English names are those of the rule table of design §7.9 (R3 is counted only when a pocket is placed). Each
pack then holds 116 (EN) and 115 (VI) keys that start with `replay.` (102 at `0ed8800`); the reply states both counts.
The other texts the section shows are existing keys: `replay.loading`, `replay.board`, `replay.view.label`,
`replay.view.compact`, `replay.view.all`, `replay.failed`, `replay.failed.worker`, `replay.stage.<n>`,
`replay.notAvailable`, `replay.stage.none`, `replay.stage.stopped`, `replay.status.*`, `replay.reason.*`,
`replay.field.*`, `replay.limit.*`, `replay.step.*`, `replay.table.*` and `rating.note.estimate*`.

### The removal list and the removal check

Removed: `generator/ui/replay-dialog.js` (the file); in `puzzle-panel.js` `onReplay`, `Card.replay`, the button
`card-replay` and its texts; in `app.js` the dialog, `onReplay`, `replaySourceOf` in the import and the two calls; in
`replay-model.js` `createReplayController`, `ReplayViewState`, `DEFAULT_INTERVAL_MS`, the playback and the
`interrupted` failure; in `generator.css` the rules listed under "Styles"; the 10 keys listed under "Locale keys".

The removal check (PowerShell, from the repository root; the three commands print nothing; all three are
case-sensitive, as `git grep` is):

```powershell
Get-ChildItem generator\*.js, generator\ui\*.js, generator\*.css, generator\*.html, tests\*.test.js |
  Where-Object Name -ne 'replay-model.test.js' |
  Select-String -CaseSensitive -Pattern ('replay-dialog|createReplayDialog|createReplayController|card-replay|' +
  'pm-replay-dialog|onReplay|DEFAULT_INTERVAL_MS|How it was made|Cách tạo đề|' +
  'replay\.(button|close|prev|next|play|pause|slider|stages)\b|replay\.failed\.interrupted')
Select-String -CaseSensitive -Path tests\replay-model.test.js -Pattern ("import\(.*replay-dialog|createReplayDialog|" +
  "createReplayController|DEFAULT_INTERVAL_MS|'interrupted'")
git --no-pager grep -l -I --untracked -E ("replay-dialog|createReplayDialog|createReplayController|card-replay|" +
  "pm-replay-dialog|DEFAULT_INTERVAL_MS|How it was made|Cách tạo đề|" +
  "replay\.(button|close|prev|next|play|pause|slider|stages)\b|replay\.failed\.interrupted") `
  -- . ':(exclude)tasks' ':(exclude)docs/difficulty-v3' ':(exclude)tests/replay-model.test.js' ':(exclude)tests/browser'
```

`-CaseSensitive` matters (the MP18a developer's `QUESTION:`, ruled on 2026-11-16): the retired label is "How it was
made" / "Cách tạo đề" with a capital letter, while three texts that stay use the words in lower case and are not
leftovers: `replay.reason.no-record` (EN "This puzzle has no record of how it was made.") and
`replay.reason.record-invalid` and `replay.reason.overflow` (VI "Ghi chép về cách tạo đề này …"). Without the switch
`Select-String` ignores case and prints those three lines. With it, the first command lists at `0ed8800` the same
seven files as below and nothing after this task.

The third command checks the documents too (it exits 1 when nothing matches: the expected result). At `0ed8800` it
lists 13 files: `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `USERGUIDE.md`, `USERGUIDE.vn.md`,
`docs/design-brief.md`, `docs/design-detail.md` and the seven Generator files below; the texts of "Documents" remove
every match.

(The pack author ran the first command at `0ed8800`: it lists `generator/app.js`, `generator.css`, both locales,
`puzzle-panel.js`, `replay-dialog.js` and `replay-model.js`, whose header comment, lines 2-6, names "How it was made":
rewrite that comment to describe the section's model — the views, the sentences, the row model, the stage groups, the
score table, the status and the controller that runs, keeps and resubmits the replay, with no playback.)
`tests/replay-model.test.js` names the removed keys and the deleted file only as data of case 8 and case 9.
`tests/browser/` still names the button and the dialog until MP18b rewrites `replay.*` and the two expectations; no
browser page runs in this part.

### Documents (EN and VI in this task)

Replace exactly as written; keep the surrounding text. In the guides, wrap new lines at 120 characters at most.

**`docs/design-detail.md`**

1. §3.1: after the line `│          set-panel.js  set-summary.js  puzzle-panel.js  elapsed.js  i18n-dom.js` add the line
   `│          replay-model.js  generation-steps.js`.
2. §4.2 (line 605): `// the steps of the dialog (§6.12)` → `// the steps of Generation steps (§6.12)`.
3. §6.12, the heading (line 1649): `### 6.12 Generation Steps (replay)` → `### 6.12 Generation steps (replay)`.
   **Steps** (line 1663): `the steps of the Generation Steps dialog:` → `the steps of the Generation steps
   section:`; `the dialog owns the texts` → `the section owns the texts`. **The final step** (line 1681): `so the dialog
   shows the final score table` → `so the section shows the final score table`. **Breakdowns** (line 1682): `the dialog
   shows the total only` → `the section shows the total only`; `the dialog tells the two tables apart` → `the section
   tells the two tables apart`.
4. §6.12, replace the whole bullet **The dialog: views, sentences and stages** (line 1684) with:

```markdown
- **The Generation steps section: views, stage groups, rows and the opened step** (`generator/ui/replay-model.js`, `generator/ui/generation-steps.js`; RES-30, owner decision P-OD14, check-list D43; its place in step 3 is §10.5 and its accessibility §11.11). The section shows a result's steps in a table in two views, chosen by two radio buttons: **Key steps** (`compact`, the default) and **Every step** (`all`: the steps as they are, the identity). `compactSteps(steps, keyOf)` keeps, in the original order and without duplicates, the first step of each stage, every `repair` step, the `selected` step, the final step and each `rated` step that strictly improves the best so far under the P1 comparator `ranked` of `clues.js` (all three of its keys), computed over the `rated` steps in order: `d = [bandDistance, centreDistance, key]` with `bandDistance` 0 when `min <= score < max` (no upper edge when `max` is null), else `min - score` or `score - max + 1`, `centreDistance = |score - (min + max) / 2|` (0 when `max` is null) and `key` the canonical `clueKey` of the step's clue set (the poses of the `placed` items whose ids are in `board.clues`; the section passes `stepKeyOf(set)`); a step is kept when its `d` is lexicographically smaller (numbers, then the key as a string) than that of every earlier `rated` step, so a tied score with a smaller key is an improvement and the same clue set is not. Generation's own tie-break is not changed. **Stage groups** (`stageGroups(result, visible)`): the visible steps keep their order, and each run of consecutive visible steps of one stage is a row group under the heading "Stage n: name" (stages 5 and 6 interleave in `require` mode, so their headings can come back); a stage without steps has a heading of its own, with no rows, before the first run of a later stage. A heading of stages 1-6 carries the mark of `stageList`, which follows the group state (stages 1-3 `stages.set`, 4-6 `stages.candidate`): every stage of a `stopped` group says "Stopped at a limit.", with or without steps; a stage with steps has no other mark; a stage without steps says "Steps not available for this puzzle." in an `unavailable` or `mismatch` group, and "No steps were needed for this puzzle." in a `replayed` or `calibration` group (a repair stage nothing needed, the layout stage of a calibration puzzle, always), except that an `incomplete` result says "Stopped at a limit." there too (a byte cut keeps the group states and drops the later steps). An `unavailable` result is shown as its final step alone (**Controller**): its stages 1-6 all say "Steps not available for this puzzle." and its one row is the stored puzzle with the stored score, also when the engine replayed some of its stages (a puzzle without its record or with a completion record, a set without its origin). **A row** is one step: **Step** (the button "Step n", n the step's index in the result plus one, so a step keeps its number in both views), **What happened** (its sentence), **Pieces**, **Techniques** and **Score** (below; "—" where the step has none). A step's sentence is the locale key of its note plus a variant (`carve` by `mode`, `start`, `retile` by `changed`, `rated` by `source`, `repair` by `added` (null: "the uniqueness check failed before any clue was added", never a piece name), `accepted` and `reason`, `final` by the status: "generated puzzle" only for `matched`, else "stored puzzle"); `{sequence}` and `{step}` are the stored ordinals plus one. **Pieces** (`stepPieces(step, set)`, in set order, each a chip with the piece's display colour and label, an id the set does not know after them as text): the piece a `piece` step carved (its `placed` item `n`; none when its id is not known), the pieces a `retile` step lifted, the clues of a `rated`, `rejected`, `unrateable` or `selected` step and of the final step, and the piece a repair added (none when `added` is null); none for `count`, `carve`, `start` and `skip`. **Techniques** (`stepTechniques(step)`), for a step with a `difficulty-v3` rating with metrics (`rated`, `rejected`, a `repair` with a rating, the final step): the rules used, by name with their counts in rule order ("Forced cell ×3, Neck ×18"; "none" when no rule was used), then, when G > 0, "G decisive guesses (Gproved proved)"; "not available" for any other rating (a summary claim, a v2 or v1 claim). **Score** (`stepScore(step)`): the score; for a `difficulty-v3` rating with a band, "in band" when `min <= score < max` (no upper edge when `max` is null), else "outside the band"; "Decisive estimate" for `censored: true`; "refused: no proved guess" for a `rejected` step; an `unrateable` step shows "unrateable: the deduction path was capped" and no score. The model returns descriptors `{ key, params }` (a parameter can be a list of descriptors, written one by one and joined with ", ") and the section writes them with `t` and `formatNumber` (decimals up to 6, the language's separator). **An opened step** (one at a time) gets a row under its own: a small board of the step (`mountBoard` in thumbnail mode, the cell size that fits 240 px, the view angle of step 1) and its score table, side by side from 768 px and the board above the table below 768 px. The board is drawn with the additive `highlightedIds` option of `core/browser/svg-board.js` (a dashed outline, `pm-highlight`, `data-highlighted`): the lifted pieces of stage 4, the piece a repair added (none when `added` is null) and the clues of the `selected` step; a placed item without a pose is not drawn. The board of the selected puzzle never changes. The status line above the table is a headline (`matched`; `unavailable` followed by a second sentence naming the reason; `mismatch` naming the field; `incomplete` naming the limit), so a partial or mismatched trace is never shown as the generated puzzle.
```

5. §6.12, **The score table** (line 1685): `the deduction tier and the nonzero counts R1-R9, or "none")` → `the deduction
   tier and the rules used with their counts, by name in rule order: Forced cell (R1), Forced piece (R2), Pocket
   placement (R3), Piece claims cells (R4), Cell claims a piece (R5), Dead placement (R6), Parity (R7), Neck (R8), Pair
   exclusion (R9), or "none"; the codes R1-R9 are never shown)`.
6. §6.12, replace the whole bullet **Controller** (line 1686) with:

```markdown
- **Controller.** `createStepsController({ run, onChange })` (`replay-model.js`) is the section's state machine: `phase` `idle`, `loading`, `ready` or `failed`, `source`, `result`, `failure` (`worker-unavailable` or `failed`), `view` (`compact` or `all`, kept from one puzzle to the next) and `expanded` (the index in `result.steps` of the opened step, always a visible one, or null). The panel calls `show(source)` with `replaySourceOf(state, puzzleId)` for the puzzle of its detail on every render, whichever wizard step is on screen, and `show(null)` when the detail is hidden. The same puzzle (the same set object, puzzle id, `made` and `setOrigin`) does nothing; another puzzle aborts the running replay's own signal (its late answer is ignored) and closes the opened step, then shows a cached result at once or calls `run(source, signal)` with a fresh `AbortController`. **Presentation (P-OD14 Q2 (a)):** an `unavailable` result is kept and shown as a copy that holds its final step alone, with its status, reason, stages, compared fields and work (the engine's result is not changed); one whose last step is not the final one is a failure. **Cache:** the results of the set on show by puzzle id, kept with their `made` and `setOrigin`, which must be the same objects for a hit; at most 16 (`STEPS_CACHE_SIZE`), the least recently shown dropped first; a new set object empties it; a failed or aborted run is not kept. **A new generation:** a `PoolAbortError('cancelled')` that the run's own signal did not cause (a generation began, §8.1 rule 4) submits the same source again at once, once for each interruption, and the new request waits for the generation to end; the phase stays `loading` and nothing is announced. **Failures:** a `PoolError('worker-unavailable')` gives `worker-unavailable`, every other rejection (`WorkerTaskError`, `PoolError('invalid-task')`, a `TypeError`, `PoolAbortError('closed')`) and a result without steps give `failed`; `retry()` (**Try again**) runs the replay again. `setView` keeps the opened step when the new view shows it, else closes it; `toggle(index)` opens a visible step (the one open before closes) or closes it; `visible()` lists the visible indices (`visibleIndices` with `stepKeyOf(set)`); `dispose()` aborts the run. The replay never cancels a generation or calls the client's `cancel`, and its bounds are those of `REPLAY`.
```

7. §8.1, **Auxiliary requests** (line 2154): `(Generation Steps, **Replay task** below)` → `(Generation steps,
   **Replay task** below)`. **Replay task** (line 2166): `so the Generation Steps dialog never freezes the page` →
   `so the Generation steps section never freezes the page`.
8. §10.5, **Puzzle cards** (line 2550): `with a ✕ in its corner and, under the details, a **How it was made** button
   (below):` → `with a ✕ in its corner:`.
9. §10.5: delete the bullet **How it was made (card button).** and its three sub-bullets (lines 2557-2560).
10. §10.5, **Selected puzzle (main panel)** (line 2561): after its last sentence `Play is disabled while a job runs.`
    add ` **Generation steps** follows "Pieces to place" (below).`; then insert after that bullet:

```markdown
- **Generation steps (under "Pieces to place").** In every layout, phones included (below 768 px it follows the puzzle shown with ◀ ▶), the detail of the selected puzzle ends with the section `section.generation-steps` (`data-role="generation-steps"`; `generator/ui/generation-steps.js`, §6.12 and §11.11; owner decision P-OD14, which replaced a button of the puzzle cards and its dialog): the heading "Generation steps", a status line, **Try again** after a failure, the view switch (**Key steps**, **Every step**) and the table of the steps. `mountPuzzlePanel` mounts it only when it gets the option `replay`, which `generator/app.js` passes as `(source, signal) => client.replayPuzzle(source, { signal })` when the generation client has `replayPuzzle` (a scripted client without it gets no section). On every render of the detail the panel calls the section's `show(replaySourceOf(state, puzzleId), { rotation, busy })` (`busy` while a job runs: the status line then says "The steps appear when the generation is done." instead of "Replaying the generation…"), and `show(null, …)` when the detail is hidden; a language switch writes its texts again (`refreshTexts()`), and the panel's `destroy()` disposes it. The replay runs by itself for the puzzle on show as an auxiliary request (§8.1: it waits while a generation runs and never delays one), and its result is kept for the puzzles shown before (§6.12, **Controller**). **Step n** opens that step: its small board and its score table appear under its row; the board of the selected puzzle, **Show solution** and **Play** are unchanged. The cards have their select button and ✕ only.
  - **Steps not available for this puzzle** (§6.12): an imported puzzle, a set or a puzzle made by an older version (no record, or a record or origin of other code versions), a puzzle of the completion pass and a record that overflowed. The section stays: its status line says that the steps cannot be replayed and why, stages 1 to 6 say "Steps not available for this puzzle.", and its one row is the stored puzzle (stage 7) with the stored score; the card and the puzzle are unchanged.
  - **Two other stage marks**: "No steps were needed for this puzzle." for a stage that this puzzle's generation did not need (the layout stage of the set's calibration puzzle, which keeps the set's layout; the uniqueness stage when no clue had to be added), and "Stopped at a limit." for a stage the replay's work, step or byte limit cut.
```

11. §10.5, **Origin records** (line 2563): `Generation Steps reads them (the card's **How it was made** button, above)` →
    `Generation steps reads them (the section under "Pieces to place", above)`.
12. §11.7 **Touch** (line 2782): in `(**Remove all** of the puzzle lists, **How it was made** of the puzzle cards,
    **Remove** and **Remove all** of the piece sets)` delete `**How it was made** of the puzzle cards, ` (the step
    buttons of Generation steps are ordinary buttons: 44 px with a coarse pointer from 768 px and 36 px below, by the
    rules of `common.css`).
13. §11.11: replace the bullet **The Generator's "How it was made" dialog** (line 2834) with:

```markdown
- **The Generator's Generation steps** (`generator/ui/generation-steps.js`; §6.12, §10.5) is a section of the page, not a dialog: no modal and no focus trap. Its heading ("Generation steps", an `h4` like "Pieces to place") names the table (`aria-labelledby`). The table has column headers (`th scope="col"`), a row header per stage heading ("Stage n: name" and its mark, `th scope="rowgroup"`) and a row header per step: the step's **Step n** button, which is a disclosure button with `aria-expanded` and, while its step is open, `aria-controls` naming the row that holds the step's board and score table. Tab goes from one step button to the next in row order (the small board has no tab stop); Enter or Space opens or closes a step and the focus stays on its button; a new result, the view switch and the language switch keep the focus on the same step's button when it is still shown. The status line is the only live region (`role="status"`, polite): it changes when the replay starts, waits for a generation, ends or fails, never when a step is opened or the view changes, and nothing is announced per row. Below 768 px the rows stack (each cell a block that begins with its column's name, by CSS only) and every element of the table keeps its role through explicit `role` attributes (`table`, `rowgroup`, `row`, `columnheader`, `rowheader`, `cell`), so the table stays a table for a screen reader; nothing scrolls sideways at 390 px and the buttons keep the 36 px targets of the narrow layout. The section has no transition or animation. The highlighted pieces are drawn with a dashed outline (not by colour alone), the piece chips carry their labels, stages and rows are marked by text, and the section uses the theme variables.
```

Design §13.3 items 25 and 26 (the browser checklist) are MP18b's.

**`docs/design-brief.md`**, step 6 "Inspect and launch" (line 29): delete the two sentences from `Each card also has a
**How it was made** button` through `not on a phone, which lists no cards.` (and the space before them); after the
sentence that ends `draws its solution on the board until pressed again.` insert, in the same line after one space:

```markdown
Under the pieces to place, **Generation steps** shows how the generator made the puzzle on show, on every screen size: a table of its steps (the piece count, the carving, the pieces, the layout, the clue sets it rated, the uniqueness repair and the finished puzzle), grouped by stage, each with its sentence, its pieces, the deduction rules and decisive guesses it used and its score, in key steps or every step; opening a step shows its small board and its score table, and the board above keeps showing the puzzle. It fills in by itself, waits while a generation runs, and when a puzzle has no steps to show (an imported puzzle, or a set or puzzle made by an older version) it says so and shows the stored puzzle's score.
```

In the same document, line 31 (the paragraph on boards and saved sets): `so Generation Steps has no steps for its
puzzles.` → `so Generation steps shows no steps for its puzzles, only the stored puzzle and its score.`

**`USERGUIDE.md`**: replace lines 152-182 (from `### How a puzzle was made` through the bullet `- **Phones.** …` that
ends `the steps cannot be opened there.`) with:

```markdown
### Generation steps

Under **Pieces to place**, step 3 shows **Generation steps**: how the Generator made the puzzle on show, step by step. It
is there on every screen size, phones included, and fills in by itself when a puzzle is shown. While a generation runs
it waits ("The steps appear when the generation is done."), so it never slows a generation down, and a puzzle shown
before comes back at once. The table has a row for each step, in the order the steps happened, under the stages of the
generation: the number of pieces, the carving of the board into pieces, the pieces, their layout, the clue sets the
search rated, the repair that made the solution unique, and the finished puzzle.

- **The columns.** **Step** (its number; press it to open the step), **What happened** (a sentence), **Pieces** (the
  piece just carved, the pieces lifted by a layout step, the clues of a rated clue set, the clue a repair added, the
  chosen clues and the clues of the finished puzzle, each with its colour and letter), **Techniques** (the deduction
  rules the rating used, each with how many times, and the decisive guesses, for example "1 decisive guess (1 proved)")
  and **Score** (the score, "in band" or "outside the band" of the level asked for, "Decisive estimate" for an
  estimate, and "refused" or "unrateable" where so). "—" means that the step has none.
- **The deduction rules**, from the simplest to the deepest: Forced cell, Forced piece, Pocket placement, Piece claims
  cells, Cell claims a piece, Dead placement, Parity, Neck and Pair exclusion.
- **Two views.** **Key steps** (the default) shows the first step of each stage, each clue set that scored better than
  the ones before it, the repairs, the chosen clues and the finished puzzle; **Every step** shows all of them. A step
  keeps its number in both views.
- **Opening a step.** **Step n** opens the step and closes the one open before: a small board of the pieces at that
  step, with a dashed outline around the pieces lifted by a layout step, the clue a repair added or the chosen clues, and
  the score table beside it (under it on a phone): the base for the pieces to place, the hardest deduction, the real
  guesses with each guess node, the penalty for a few or many solutions, and the total, with the band of the level. At
  the last step the total is the score of the puzzle. The board above keeps showing the puzzle.
- **Checked against the puzzle.** The Generator makes the steps again and compares them with the stored puzzle. The line
  under the heading says "The replay matched the stored puzzle, so these are the steps that generated it", or why it
  could not: when the replay differs from the puzzle, or was stopped at a limit, only a part of it is shown and the last
  step says "This is the stored puzzle", never "the generated puzzle". When no background worker can replay it, or the
  replay fails, the line says so and **Try again** runs it again.
- **When there are no steps.** A puzzle you imported, a puzzle of a piece set made or saved by an older version and a
  puzzle of the completion pass have nothing to replay: the section stays, its line says "The steps of this puzzle
  cannot be replayed." and why, stages 1 to 6 say "Steps not available for this puzzle.", and its one row is the stored
  puzzle with its score. "No steps were needed for this puzzle." means that this puzzle did not need that stage (for
  example the layout stage of the sample puzzle that was made together with the piece set, which keeps the set's layout,
  or the uniqueness stage when no clue had to be added). "Stopped at a limit." means that the replay reached one of its
  limits there.
```

**`USERGUIDE.vn.md`**: replace lines 142-171 (from `### Cách tạo một đề` through the bullet `- **Điện thoại.** …` that
ends `các bước ở đó.`) with:

```markdown
### Các bước tạo đề

Dưới **Các mảnh cần đặt**, bước 3 hiện **Các bước tạo đề**: trình tạo đề đã tạo đề đang hiển thị như thế nào, từng bước
một. Phần này có trên mọi kích thước màn hình, kể cả điện thoại, và tự điền khi một đề được hiển thị. Khi đang tạo đề, nó
chờ ("Các bước sẽ hiện khi việc tạo đề xong."), nên không bao giờ làm chậm việc tạo đề, và một đề đã xem trước đó hiện lại
ngay. Bảng có một dòng cho mỗi bước, theo đúng thứ tự các bước đã diễn ra, dưới các giai đoạn của việc tạo đề: số mảnh,
cách bàn được chia thành mảnh, các mảnh, cách xếp các mảnh, các nhóm mảnh đặt sẵn mà việc tìm kiếm đã chấm điểm, bước
sửa để lời giải trở nên duy nhất và đề hoàn chỉnh.

- **Các cột.** **Bước** (số thứ tự của bước; nhấn vào để mở bước), **Diễn biến** (một câu mô tả), **Mảnh** (mảnh vừa được
  cắt ra, các mảnh bị nhấc ra ở một bước xếp, các mảnh đặt sẵn của một nhóm được chấm điểm, mảnh đặt sẵn mà một bước sửa
  thêm vào, các mảnh đặt sẵn được chọn và các mảnh đặt sẵn của đề hoàn chỉnh, mỗi mảnh kèm màu và chữ cái của nó),
  **Kỹ thuật** (các quy tắc suy luận mà việc chấm điểm đã dùng, mỗi quy tắc kèm số lần dùng, và các lần đoán quyết định,
  ví dụ "1 lần đoán quyết định (1 được chứng minh)") và **Điểm** (điểm, "trong khoảng điểm" hoặc "ngoài khoảng điểm" của
  mức độ đã chọn, "Ước lượng quyết định" khi điểm là ước lượng, và "bị từ chối" hoặc "không chấm được" khi đúng như vậy).
  "—" nghĩa là bước đó không có.
- **Các quy tắc suy luận**, từ đơn giản nhất tới sâu nhất: Ô bắt buộc, Mảnh bắt buộc, Đặt mảnh vào vùng kín, Mảnh chiếm
  ô, Ô chỉ nhận một mảnh, Cách đặt dẫn tới mâu thuẫn, Chẵn lẻ màu ô, Chỗ thắt và Loại trừ cặp.
- **Hai cách xem.** **Bước chính** (mặc định) hiện bước đầu của mỗi giai đoạn, mỗi nhóm mảnh đặt sẵn có điểm tốt hơn các
  nhóm trước, các bước sửa, các mảnh đặt sẵn được chọn và đề hoàn chỉnh; **Mọi bước** hiện tất cả. Mỗi bước giữ nguyên
  số thứ tự ở cả hai cách xem.
- **Mở một bước.** **Bước n** mở bước đó và đóng bước đang mở trước đó: một bàn chơi nhỏ với các mảnh ở bước ấy, có viền
  nét đứt quanh các mảnh bị nhấc ra ở một bước xếp, mảnh đặt sẵn mà một bước sửa thêm vào hoặc các mảnh đặt sẵn được
  chọn, và bảng điểm bên cạnh (bên dưới trên điện thoại): điểm cơ bản theo số mảnh cần đặt, bước suy luận khó nhất, các
  lần đoán thật cùng từng nút đoán, điểm trừ khi có một vài hoặc nhiều lời giải, và tổng điểm, kèm khoảng điểm của mức
  độ. Ở bước cuối, tổng điểm là điểm của đề. Bàn chơi phía trên vẫn hiện đề.
- **Đối chiếu với đề.** Trình tạo đề chạy lại các bước và so với đề đã lưu. Dòng dưới tiêu đề cho biết "Việc chạy lại
  khớp với đề đã lưu, nên đây là các bước đã tạo ra đề", hoặc vì sao không được: khi việc chạy lại khác đề, hoặc dừng ở
  một giới hạn, phần này chỉ hiện một phần các bước và bước cuối ghi "Đây là đề đã lưu", không bao giờ ghi "đề đã được
  tạo". Khi không có tiến trình nền nào chạy lại được, hoặc việc chạy lại thất bại, dòng này cho biết và nút **Thử lại**
  chạy lại lần nữa.
- **Khi không có bước nào.** Đề bạn đã nhập, đề của một bộ mảnh được tạo hoặc lưu bởi phiên bản cũ hơn và đề của lượt bổ
  sung không có gì để chạy lại: phần này vẫn hiện, dòng của nó ghi "Không thể chạy lại các bước của đề này." kèm lý do,
  các giai đoạn 1 đến 6 ghi "Không có các bước cho đề này.", và dòng duy nhất của bảng là đề đã lưu cùng điểm của đề.
  "Đề này không cần bước nào ở giai đoạn này." nghĩa là đề đó không cần giai đoạn ấy (ví dụ giai đoạn xếp của đề mẫu
  được tạo cùng bộ mảnh, giữ nguyên cách xếp của bộ, hoặc giai đoạn làm cho lời giải duy nhất khi không phải thêm mảnh
  đặt sẵn nào). "Đã dừng ở giới hạn." nghĩa là việc chạy lại đã chạm một giới hạn ở đó.
```

**`DEVELOPERGUIDE.md`**, "Code layout": replace the text from `The Generator's Generation Steps dialog is` (line 112)
through `tests all of it in a real browser.` (line 116) with the text below, and wrap the paragraph again at 120
characters:

```markdown
The Generator's Generation steps, in step 3 under **Pieces to place**, are `generator/ui/replay-model.js` (no DOM: the views, the sentences, the pieces, techniques and score of each step, the stage groups, the score table and the controller that runs, keeps and resubmits the replay) and `generator/ui/generation-steps.js` (the section and its table); `generator/ui/puzzle-panel.js` mounts the section under the pieces to place and gives it `replaySourceOf` of `generator/state.js`, and `generator/app.js` passes it the client's `replayPuzzle`. `tests/browser/replay.html` tests all of it in a real browser.
```

**`DEVELOPERGUIDE.vn.md`**, "Cấu trúc mã": replace the text from `Cửa sổ Các bước tạo đề của trình tạo đề gồm` (line 113)
through `kiểm thử toàn bộ trên trình duyệt thật.` (line 116) with the text below, wrapped again at 120 characters:

```markdown
Phần Các bước tạo đề của trình tạo đề, ở bước 3 dưới **Các mảnh cần đặt**, gồm `generator/ui/replay-model.js` (không có DOM: các cách xem, câu mô tả, các mảnh, kỹ thuật và điểm của từng bước, các nhóm giai đoạn, bảng điểm và bộ điều khiển chạy, giữ lại và gửi lại việc chạy lại) và `generator/ui/generation-steps.js` (phần này và bảng của nó); `generator/ui/puzzle-panel.js` gắn phần này dưới các mảnh cần đặt và đưa cho nó `replaySourceOf` của `generator/state.js`, còn `generator/app.js` đưa cho nó hàm `replayPuzzle` của client. `tests/browser/replay.html` kiểm thử toàn bộ trên trình duyệt thật.
```

**`README.md`**, "Features" (line 18): replace the line with

```markdown
- **Generation steps** (in the Generator): in step 3, under the pieces to place, a table of how the generator made the
  puzzle, step by step, with the pieces, the deduction rules and the score of each step.
```

## Files to create/modify

| File | Change |
|---|---|
| `generator/ui/replay-model.js` | the row model, `stageGroups`, list parameters, the named Rules line, `createStepsController`; the dialog's controller and playback removed |
| `generator/ui/generation-steps.js` | new: `mountGenerationSteps(host, { t, run, cellPxOf })` |
| `generator/ui/replay-dialog.js` | deleted |
| `generator/ui/puzzle-panel.js` | the section after `ul.detail-pieces`, `PuzzlePanelOptions.replay`, `STEPS_BOARD_PX`; the card button removed |
| `generator/app.js` | `replay` passed to the panel; the dialog removed |
| `generator/locale.en.js`, `generator/locale.vi.js` | the keys of "Locale keys" |
| `generator/generator.css` | the section's styles; the card button's and the dialog's rules removed |
| `tests/replay-model.test.js` | "Tests that change"; cases 1–9 |
| documents | "Documents" above |

Exclusive ownership while this task runs: the files above and scratch under `tests/artifacts/MP18a/`.

## Implementation steps

1. `replay-model.js`: list parameters, `countsText`, the row model, `stageGroups`, `createStepsController`; remove the
   dialog's controller. `tests/replay-model.test.js`: "Tests that change", then cases 1–8 (run the file alone while you
   work).
2. `generation-steps.js`; the panel and the app; delete `replay-dialog.js`; the CSS (wide, then narrow); case 9.
3. The locales (the table above, exactly).
4. The documents; the test plan; the D35 guard and the removal check.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP18a-B01 | In step 3, under "Pieces to place", the section "Generation steps" shows how the puzzle on show was made: one row per step, under its stage, with its sentence, pieces, techniques and score | cases 1–3; MP18b checks 1–2 |
| MP18a-B02 | Opening a step shows its small board and its full score table; the main board keeps showing the puzzle (Q1 (a)) | design and drawing rules; MP18b check 3 |
| MP18a-B03 | A puzzle whose steps cannot be replayed (an `unavailable` result: an imported puzzle, no record or set origin, a completion pass, other versions) keeps the section: "Steps not available for this puzzle" for stages 1–6 and one row for the stored puzzle with its score, also when the engine replayed some of its stages (Q2 (a)) | cases 3, 6; MP18b checks 6, 12 |
| MP18a-B04 | The steps appear by themselves when a puzzle is shown, never delay a generation, come back after one, and are not replayed for a puzzle shown before | cases 5, 6; MP18b checks 5, 9, 10 |
| MP18a-B05 | The card button "How it was made" and the dialog are gone; a card has its select button and ✕ | the removal check; MP18b check 1 |
| MP18a-B06 | Every text is in English and Vietnamese; the nine rules have the names of this file and no R1–R9 code is shown | cases 4, 8; `tests/generator-i18n.test.js` |
| MP18a-B07 | The guides (both languages), the design documents and the README describe the section and no longer the button or the dialog | review; the third command of the removal check |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP18a-T01 | `stepPieces`, `stepTechniques`, `stepScore`, `rowLabel` and `countsText` follow this file for every kind of step | cases 1, 2, 4 |
| MP18a-T02 | `stageGroups` keeps the order of the steps, repeats a stage's heading per run, places stages without steps as specified and carries the marks of `stageList`; an `unavailable` result has six `notAvailable` stages and its final row | cases 3, 6 |
| MP18a-T03 | The controller follows rules 1–11: one run per puzzle, the presentation of an `unavailable` result (its final step only, the resolved value unchanged), the cache (16, least recently shown first, emptied by a new set, `made` and `setOrigin` by identity), abort on another puzzle and on null, a new run per interruption, the failures and retry, toggle, view and dispose | cases 5–7 |
| MP18a-T04 | The section's DOM, attributes, roles and drawing rules are those of "The section"; it is created only with `replay`, after `ul.detail-pieces` | review; MP18b checks 1, 3, K, N |
| MP18a-T05 | The removal list is done: the removal check prints nothing; the removed keys are in neither pack | removal check; case 8 |
| MP18a-T06 | D35: both guard commands print nothing; the replay data, the step sentences and the score table are unchanged except the named Rules line | the guard; cases 1, 4; review |
| MP18a-T07 | `npm run test:quick` passes with 1,485 tests (1,482 at `0ed8800`, as MP16b's Execution log and PR #10's validation give it; 6 removed, 9 added) and `npm run check` passes; the documents are in step in both languages | command output; review |

## Test plan

### Exact commands

```powershell
. tests\artifacts\MP18a\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP18a targeted tests' -LimitSeconds 300 -NodeArgs @('--test', '--test-skip-pattern=slow',
  'tests/replay-model.test.js', 'tests/generator-i18n.test.js', 'tests/generator-state.test.js',
  'tests/generator-import.test.js', 'tests/puzzle-snapshot.test.js')
if ($r.TimedOut -or $r.Exit -ne 0) { throw 'targeted tests failed' }
$r = Invoke-Dv3Timed -Task 'MP18a quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.TimedOut -or $r.Exit -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
git --no-pager diff --stat 0ed8800 -- core tools player tests/fixtures
git --no-pager status --short -- core tools player tests/fixtures
# then the three commands of "The removal list and the removal check"; these five commands print nothing
```

Expected: the targeted run passes within a minute; the quick set passes with 1,485 tests within a few minutes (every
run under the 590 s bound); `npm run check` prints its OK lines and exits 0.

### Tests that change (`tests/replay-model.test.js`; P-OD14 is the intended contract change)

- The header comment (lines 1-4): it also names the steps table (MP18a). The import list (lines 18-21): without
  `createReplayController`, with `createStepsController`, `rowLabel`, `stageGroups`, `stepPieces`, `stepScore`,
  `stepTechniques` and `STEPS_CACHE_SIZE`; add `existsSync` to the import from `node:fs` (case 9).
- "the score table of a real rated step: the rows, the guess nodes, the sum and the band" (line 220): lines 234-235
  become

  ```js
  const counts = Object.entries(metrics.rules).filter(([, n]) => /** @type {number} */ (n) > 0)
    .map(([name, n]) => ({ key: 'replay.uses', params: { rule: { key: `replay.rule.${name}` }, n } }));
  assert.deepEqual(rules.detail?.params?.counts, counts.length === 0 ? { key: 'replay.table.rules.none' } : counts);
  ```
  Nothing else of that test changes (its `{ key: 'replay.table.rules.none' }` assertion stays).
- "every key that the model returns exists in both packs with the placeholders of its descriptor" (line 576): line 590
  without `failureText('interrupted')`.
- "a failure says what happened" (line 637): line 640 (the `interrupted` assertion) removed.
- The controller helpers: `scheduler()` (lines 672-693), `harness()` (lines 695-716) and `readyHarness()`
  (lines 831-839) are removed; `deferred`, `flush`, `smallResult`, `playbackResult` and `COMPACT` stay (case 7 uses
  `playbackResult` and `COMPACT`).
- Removed with the dialog: "controller: open, loading, ready; close aborts only its own signal; a stale answer is
  ignored" (line 722), "controller: the failure kinds, and what a rejection does after close" (line 777), "controller:
  playback advances one visible step per tick and stops at the last" (line 841), "controller: the compact view of a real
  result uses the real clue keys; dispose aborts the run and stops the timer" (line 880), "controller: pause, prev, next,
  seek and setView stop playback; the view keeps the step or the nearest earlier one" (line 906) and "the dialog module
  loads" (line 969). Cases 5–7 and 9 replace them.
- Every other test stays as it is.

### Required test cases (`tests/replay-model.test.js`, added)

Helpers of the cases (in the test file):

```js
const uses = (/** @type {string} */ rule, /** @type {number} */ n) => ({ key: 'replay.uses', params: { rule: { key: `replay.rule.${rule}` }, n } });
const guesses = (/** @type {number} */ count, /** @type {number} */ proved) => ({ key: 'replay.guesses', params: { count, proved } });
const IN = { key: 'replay.score.inBand' };
const OUT = { key: 'replay.score.outOfBand' };
const NA = { key: 'replay.table.unavailable' };
/** @param {import('../generator/ui/replay-model.js').Line} line */
const lineText = (line) => (typeof line === 'number' ? String(line)
  : Array.isArray(line) ? line.map((d) => renderDesc(d, t)).join(', ') : renderDesc(line, t));
```

1. **"steps: the pieces, techniques and score of the real steps"** on `RESULT` (`R = RESULT.steps`, `stepPieces(R[i],
   SET)`):

   | i | kind | pieces | techniques | score |
   |---:|---|---|---|---|
   | 0 | count | `[]` | `[]` | `[]` |
   | 1 | carve | `[]` | `[]` | `[]` |
   | 2 | piece | `['G']` | `[]` | `[]` |
   | 10 | piece | `['B']` | `[]` | `[]` |
   | 11 | start | `[]` | `[]` | `[]` |
   | 12 | retile | `['B', 'C', 'E']` | `[]` | `[]` |
   | 19 | retile | `['A', 'B', 'C', 'E']` | `[]` | `[]` |
   | 20 | rated | `['D', 'H', 'I']` | `[[uses('R1', 3)], guesses(3, 3)]` | `[29, OUT]` |
   | 21 | rated | `['A', 'G', 'H']` | `[[uses('R1', 5)], guesses(1, 1)]` | `[15, OUT]` |
   | 22 | rated | `['C', 'D', 'H']` | `[[uses('R1', 4), uses('R4', 27), uses('R6', 5), uses('R8', 12)], guesses(2, 2)]` | `[24, IN]` |
   | 23 | rated | `['A', 'D', 'F']` | `[[uses('R1', 4), uses('R4', 18), uses('R6', 2), uses('R7', 146)], guesses(1, 1)]` | `[17, IN]` |
   | 26 | repair (F, no rating) | `['F']` | `[]` | `[]` |
   | 27 | repair (G, refused) | `['G']` | `[[uses('R1', 4)]]` | `[9]` |
   | 29 | rejected | `['C', 'D', 'F', 'H']` | `[[uses('R1', 5), uses('R4', 10)]]` | `[12, OUT, { key: 'replay.table.refused' }]` |
   | 52 | selected | `['D', 'E', 'H', 'I']` | `[]` | `[]` |
   | 53 | final | `['D', 'E', 'H', 'I']` | `[[uses('R1', 3), uses('R2', 1), uses('R8', 18)], guesses(1, 1)]` | `[19, IN]` |

   Written in English: `stepTechniques(R[53]).map(lineText)` is `['Forced cell ×3, Forced piece ×1, Neck ×18',
   '1 decisive guess (1 proved)']`, `stepTechniques(R[20]).map(lineText)` is `['Forced cell ×3', '3 decisive guesses
   (3 proved)']`, `stepScore(R[53]).map(lineText)` is `['19', 'in band']` and `stepScore(R[29]).map(lineText)` is
   `['12', 'outside the band', 'refused: no proved guess']`; in Vietnamese (`setLocale('vi', null)`)
   `stepTechniques(R[53]).map(lineText)` is `['Ô bắt buộc ×3, Mảnh bắt buộc ×1, Chỗ thắt ×18', '1 lần đoán quyết định
   (1 được chứng minh)']` and `stepScore(R[53]).map(lineText)` is `['19', 'trong khoảng điểm']`. `rowLabel(0)` is
   `{ key: 'replay.row', params: { n: 1 } }` and `rowLabel(53)` `{ key: 'replay.row', params: { n: 54 } }`.
2. **"steps: pieces, techniques and score of synthetic steps the real result lacks"** (the file's `step`, `rated` and
   `finalStep` helpers; `FIRST` and `SET` as in the file):
   - `step({ kind: 'skip', args: { sequence: 2, source: 'candidate' } })`: `[]`, `[]`, `[]`;
   - `step({ kind: 'unrateable', board: { placed: [], lifted: [], clues: ['C', 'A'] }, band: { min: 17, max: 25 },
     args: { sequence: 3, phase: 'beam', source: 'candidate', reason: 'path-capped' } })`: pieces `['A', 'C']`,
     techniques `[]`, score `[{ key: 'replay.table.unrateable' }]`;
   - a repair that failed before a clue, `step({ stage: 6, kind: 'repair', args: { repairSequence: 1, added: null,
     accepted: false, reason: 'not-proved' } })`: `[]`, `[]`, `[]`;
   - a `piece` step whose item has no id, `step({ stage: 3, kind: 'piece', board: { placed: [{ id: null, cells:
     [[0, 0]], pose: null }], lifted: [], clues: [] }, args: { n: 1 } })`: pieces `[]`;
   - a `retile` step lifting an id the set does not know, `step({ stage: 4, kind: 'retile', board: { placed: [], lifted:
     ['Z', 'C', 'A'], clues: [] }, args: { step: 0, lifted: 3, changed: true } })`: pieces `['A', 'C', 'Z']`;
   - a final step without a claim, `finalStep({ ...FIRST, puzzle: { ...FIRST.puzzle, rating: null } }, 'matched',
     null)`: pieces `['D', 'E', 'H', 'I']`, techniques `[]`, score `[]`;
   - a summary claim, `finalStep({ ...FIRST, puzzle: { ...FIRST.puzzle, rating: { model: 'difficulty-v3', score: 19,
     level: 'hard', saturated: false, censored: true } } }, 'matched', null)`: techniques `[NA]`, score `[19, IN,
     { key: 'rating.note.estimateShort' }]`;
   - a v2 claim, `finalStep({ ...FIRST, puzzle: { ...FIRST.puzzle, rating: { model: 'difficulty-v2', score: 31, level:
     'master', saturated: false, metrics: { U: 8, B: 120, branchTrials: 3, rowTrials: 9, stop: 'solution', R: 1,
     H: 0.5 } } } }, 'matched', null)`: techniques `[NA]`, score `[31]` (no band line for v2);
   - `rated(19)` (a v3 rating without metrics): techniques `[NA]`, score `[19, IN]`; `rated(25)`: score `[25, OUT]`;
     `rated(17)`: score `[17, IN]`; `rated(80, { min: 53, max: null })`: `[80, IN]`; `rated(40, { min: 53, max: null
     })`: `[40, OUT]`;
   - a censored real step, `{ ...R[22], rating: { ...R[22].rating, censored: true } }`: score `[24, IN, { key:
     'rating.note.estimateShort' }]` and the same techniques as `R[22]`.
3. **"steps: stage groups follow the steps in order; a stage without steps keeps its heading and mark"**:
   - `stageGroups(RESULT, RESULT.steps.map((_, i) => i))`: stages `[1, 2, 3, 4, 5, 6, 5, 6, 5, 7]`, sizes
     `[1, 1, 9, 9, 6, 2, 6, 1, 18, 1]`, the indices of all groups in order equal to 0–53, every `mark` and `markText`
     null, and the heading of the group of stage s equal to `{ key: 'replay.stage.heading', params: { n: s, name:
     { key: 'replay.stage.<s>' } } }` (for example `replay.stage.4` for s = 4);
   - Key steps, `visibleIndices(RESULT.steps, 'compact', stepKeyOf(SET))` = `[0, 1, 2, 11, 20, 21, 22, 25, 26, 27, 34,
     52, 53]`: stages `[1, 2, 3, 4, 5, 6, 5, 7]`, sizes `[1, 1, 1, 1, 4, 3, 1, 1]`;
   - `CALIBRATION_RESULT`, every step: stages `[1, 2, 3, 4, 5, 6, 5, 7]`, sizes `[1, 1, 9, 0, 4, 2, 21, 1]`, the stage-4
     group `{ mark: 'none', markText: { key: 'replay.stage.none' }, indices: [] }`; Key steps (`[0, 1, 2, 11, 12, 14,
     15, 16, 37, 38]`): stages `[1, 2, 3, 4, 5, 6, 5, 7]`, sizes `[1, 1, 1, 0, 3, 2, 1, 1]`;
   - Q2 (a), a puzzle without a record: `{ ...RESULT, status: 'unavailable', reason: 'no-set-origin', stages: { set:
     'unavailable', candidate: 'unavailable', final: 'not-compared' }, compared: [], steps: [finalStep(FIRST,
     'unavailable', null)] }` with `visible` `[0]`: stages `[1, 2, 3, 4, 5, 6, 7]`, the mark `notAvailable` for
     stages 1 to 6 and null for stage 7, indices `[[], [], [], [], [], [], [0]]`, and its one row has the score
     `[19, IN]` and the sentence key `replay.step.final.stored`; the same seven groups, marks and indices with `stages:
     { set: 'replayed', candidate: 'unavailable', final: 'compared' }` and `reason: 'no-record'` (a presented result
     whose stages 1 to 3 were replayed: `stageList` alone marks them `none`);
   - the early stop `replayPuzzle(FIRST, workspaces, { ...REPLAY, maxSteps: 1 })` with `visible` `[0]`: stages
     `[1, 2, 3, 4, 5, 6, 7]`, the mark `stopped` for stages 1 to 6 and null for stage 7.
4. **"steps: the rules are named, never coded, in the techniques and the score table, in both languages"**: the Rules
   row of `scoreTable(R[53], R)` has `detail.params.counts` `[uses('R1', 3), uses('R2', 1), uses('R8', 18)]` and is
   written `Deduction tier 3; rule uses: Forced cell ×3, Forced piece ×1, Neck ×18` in English and `Bậc suy luận 3; số
   lần dùng quy tắc: Ô bắt buộc ×3, Mảnh bắt buộc ×1, Chỗ thắt ×18` in Vietnamese; `descriptorKeys({ key:
   'replay.table.rules', params: { tier: 3, counts: [uses('R1', 3), uses('R8', 18)] } })` is `['replay.table.rules',
   'replay.uses', 'replay.rule.R1', 'replay.uses', 'replay.rule.R8']`; for every step of `RESULT` and
   `CALIBRATION_RESULT`, in English and in Vietnamese, no written techniques line, score line or score-table row (head,
   detail, value) matches `/\bR[1-9]\b/`.
5. **"steps controller: one run per puzzle; another puzzle aborts its own run; a cache of 16 per set"**, with a harness
   `stepsHarness(over)` (the `run` records `{ source, signal, answer }` with `answer = deferred()` and returns
   `answer.promise`; `onChange` pushes each state) and sources `src(id, set = SET, made = null, setOrigin = null)` =
   `{ set, puzzle: { ...FIRST.puzzle, id }, setOrigin, made }`:
   - the first state is `{ phase: 'idle', source: null, result: null, failure: null, view: 'compact', expanded: null }`
     and no `onChange` was called;
   - `show(A)`: one call with `A` and a live signal, phases `['loading']`; `show({ ...A })` (same fields): no call, no
     `onChange`;
   - `show(B)`: the first call's signal is aborted, a second call with `B`; `A`'s late answer (`RESULT`) changes
     nothing; `B`'s answer (`smallResult()`) gives `ready` with that result;
   - `show(A)`: a third call (an aborted run is not kept); its answer gives `ready`; `show(B)`: no call, `ready` with
     `B`'s result at once (before any `await`);
   - the cache, on a fresh harness: show and answer `src('c0')` to `src('c16')` (17 calls); `show(src('c16'))` and
     `show(src('c1'))`: no call; `show(src('c0'))`: call 18 (evicted); after its answer `show(src('c1'))`: no call;
     `show(src('c2'))`: call 19 (`c1` was shown again, so `c2` was the least recently shown);
   - a new set object empties the cache: `show(src('c16', { ...SET }))` makes a call, then `show(src('c16'))` makes
     another;
   - `made` by identity: `src('pX', SET, { schema: 1, kind: 'candidate' })` answered, `src('pY')` answered, then
     `src('pX', SET, { schema: 1, kind: 'candidate' })` (a new object) makes a call;
   - `show(null)` while a run waits: its signal is aborted, the state is `idle` with `source` null and the view kept;
     `show(null)` again calls no `onChange`.
6. **"steps controller: a new generation resubmits the replay; failures and Try again; an unavailable result shows its
   final step"**:
   - a `run` that rejects with `new PoolAbortError('cancelled')` on its first call and resolves `RESULT` on the second:
     two calls with the same source, the phases `['loading', 'ready']` (no `failed`); a `run` that rejects twice, then
     resolves: three calls, the same phases;
   - the failure of each rejection: `new PoolError('worker-unavailable', 'no worker')` → `worker-unavailable`;
     `new PoolError('invalid-task', 'refused')`, `new PoolError('worker-crashed', 'crash')`,
     `new WorkerTaskError('invalid-request', 'bad')`, `new TypeError('malformed source')`,
     `new PoolAbortError('closed')` and `new Error('x')` → `failed`; a `run` that throws synchronously and a result
     `{ status: 'matched', steps: [] }` → `failed`;
   - `retry()`: after a `worker-unavailable` failure the phase becomes `loading` and a second call resolves to `ready`;
     `retry()` in `ready` makes no call; a failed run is not kept (`show(B)`, then `show(A)` makes a call);
   - the presentation of `unavailable` results (P-OD14 Q2 (a)), on three real results of `FIRST`, each made with
     `replayPuzzle(input, workspaces, REPLAY)` and shown with a fresh controller whose `run` resolves it (`show(SOURCE)`,
     then `await flush()`):
     - without the puzzle's record, `input = { ...FIRST, generation: { ...FIRST.generation, made:
       Object.fromEntries(Object.entries(FIRST.generation.made).filter(([id]) => id !== FIRST.puzzle.id)) } }`: reason
       `no-record`, 12 steps;
     - without the set's origin, `input = { ...FIRST, generation: Object.fromEntries(Object.entries(FIRST.generation)
       .filter(([key]) => key !== 'setOrigin')) }`: reason `no-set-origin`, 43 steps;
     - with a completion record, `input = { ...FIRST, generation: { ...FIRST.generation, made: {
       ...FIRST.generation.made, [FIRST.puzzle.id]: { schema: 1, kind: 'completion' } } } }`: reason `completion`, 12
       steps.

     For each: the resolved result has `status` `'unavailable'`, its reason and its number of steps, before and after
     it is shown (it is not changed); the phases are `['loading', 'ready']`; `getState().result` is another object with
     the same `status`, `reason`, `stages`, `compared` and `work` and the `steps` `[raw.steps[raw.steps.length - 1]]`
     (the same step object, `kind` `'final'`); `stepScore(getState().result.steps[0])` is `[19, IN]`; `visible()` is
     `[0]`, and `[0]` again after `setView('all')`; `stageGroups(getState().result, [0])` has the stages `[1, 2, 3, 4,
     5, 6, 7]`, the mark `notAvailable` for stages 1 to 6 and null for stage 7, and the indices `[[], [], [], [], [],
     [], [0]]`;
   - an `unavailable` result whose last step is not the final one, `{ ...RESULT, status: 'unavailable', reason:
     'no-record', steps: RESULT.steps.slice(0, 3) }`: `failed` with `failed`.
7. **"steps controller: toggle, view, the real clue keys and dispose"**, with a `run` that resolves `playbackResult()`:
   - `visible()` is `COMPACT`; `toggle(9)` → `expanded` 9; `toggle(9)` → null; `toggle(9)`, then `toggle(12)` → 12;
     `toggle(8)` (hidden in Key steps) and `toggle(99)` change nothing;
   - `setView('all')` keeps 12 and `visible()` has 15 indices; `toggle(8)` → 8; `setView('compact')` → `expanded`
     null; `setView('compact')` again and `setView('bogus')` call no `onChange`;
   - the view is kept for another puzzle: `setView('all')`, `show(B)`, its answer: `view` `'all'`, `expanded` null;
   - the real clue keys: the puzzle `decided` of the old test 880 (the first of `ALL` whose compact view differs with
     `stepKeyOf(input.set)` and with `() => ''`), shown as `{ ...SOURCE, set: decided.input.set }` with a `run` that
     resolves `decided.result`: `visible()` equals `compactIndices(decided.result.steps, stepKeyOf(decided.input.set))`
     and is shorter than its steps;
   - `dispose()` while a run waits: its signal is aborted, no `onChange` follows, and a later `show(A)` makes no call.
8. **"steps: every key of the row model exists in both packs; the nine rule names; the removed keys are gone"**:
   `assertKnown` (the file's helper) for every descriptor of `stepTechniques`, `stepScore` (list items included),
   `stageGroups` (heading, `name` inside it, mark text) and `rowLabel` over `RESULT` and `CALIBRATION_RESULT` in both
   views and over the synthetic steps of case 2; every key the section writes directly (`replay.title`,
   `replay.loading`, `replay.waiting`, `replay.retry`, `replay.view.label`, `replay.view.compact`, `replay.view.all`,
   `replay.col.step`, `replay.col.what`, `replay.col.pieces`, `replay.col.techniques`, `replay.col.score`,
   `replay.cell.none`, `replay.board`, `replay.table.caption`) is in both packs; `EN['replay.title']` is
   `'Generation steps'` and `VI['replay.title']` `'Các bước tạo đề'`; the nine rule names of both packs equal the table
   of "Locale keys" (R1 to R9 in order); the 10 removed keys are in neither pack (`textOf(pack, key) === undefined`).
9. **"the Generation steps module loads and the dialog module is gone"**: `await import('../generator/ui/generation-steps.js')`
   gives a function `mountGenerationSteps`, and `existsSync(new URL('../generator/ui/replay-dialog.js', import.meta.url))`
   is false.

## Definition of done & handoff

- Every criterion has its evidence. The reply gives: the exports of `replay-model.js` and `generation-steps.js`; the
  `replay.*` key counts of both packs (116 and 115) and the keys added, changed and removed; the outputs of the two D35
  commands and of the removal check (all empty); the test counts and durations of each locked invocation.
- Handoff to MP18b: the section's selectors (`section.generation-steps`, `data-phase`, `data-result`,
  `[data-role="steps-status"]`, `[data-action="steps-retry"]`, `[data-field="steps-view-compact|all"]`,
  `table.steps-table`, `tbody.steps-group[data-stage]`, `tr.steps-stage[data-mark]`, `.steps-stage-name`,
  `.steps-stage-mark`, `tr.steps-row[data-index][data-kind]`, `button.steps-toggle`, `.steps-toggle-label`,
  `tr.steps-detail`, `.steps-board`, `.steps-score-table`, `span.steps-piece[data-piece-id]`, `span.steps-line`, the
  `data-label` cells), `mountGenerationSteps` for a scripted page, and the browser pages still naming the removed
  button and dialog (`tests/browser/replay.*`, `generator-flow.js` lines 265-266, `acceptance.js` line 250).

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (orchestrator check; outside the analyst review set). One question (removal check 1 matched three kept lowercase texts); SA1 ruled option A and made checks 1 and 2 case-sensitive (`cae9d4d`, task file only); no code change |
| Start | 2026-11-16 11:32:11 (+07:00), base `4904241` (pack commits `c13aa23` and `cae9d4d` landed during the task) |
| End | 11:54:35 implementation and gates, with the question; 11:58-12:03 SA1 ruling; 11:58:25 removal checks re-run case-sensitive (all empty); orchestrator re-check and commit at about 12:03 |
| Duration | About 24 min developer; about 6 min ruling; quick set 33.9 s and 34.2 s through `Invoke-Dv3Timed`, lock wait 0 s (the sudoku repository ran MS11a on the same machine) |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (SA1 ruling; orchestrator) |
| Token usage | 122 model calls; 35,724,424 input tokens (35,239,111 cache reads); 177,623 output tokens (developer) |
| AI credits | about 651 (developer) |
| Verification | New `generator/ui/generation-steps.js` (`mountGenerationSteps`); `generator/ui/replay-model.js` gains `STEPS_CACHE_SIZE`, `rowLabel`, `stepPieces`, `stepTechniques`, `stepScore`, `stageGroups` and `createStepsController` (the dialog's `createReplayController`, `DEFAULT_INTERVAL_MS` and `ReplayViewState` removed); `generator/ui/replay-dialog.js` deleted; `puzzle-panel.js` mounts the section under "Pieces to place" and drops the card button; `app.js`, `generator.css`; locales EN +24 / VI +23 keys (the nine rule names included), 10 dialog keys removed, `replay.title` changed. Documents: design-detail, design-brief, both guides in both languages (7 user-guide lines re-wrapped to at most 120 characters, whitespace only), README. Tests: `tests/replay-model.test.js` cases 1-9 (P-OD14 Q1-Q3 included); targeted 108/108; quick set **1,485/1,485** (was 1,482). Removal checks 1-3 empty (1 and 2 with `-CaseSensitive`, per SA1); D35 diff and status against `0ed8800` for `core/engine/`, `tools/`, the protocol and the client: empty; `npm run -s check` OK. T04 by a fake-DOM smoke run in scratch (busy, loading, ready; rows, chips, cells; expand and collapse with focus; view and language switch; cache; the no-record row; failure and retry; dispose); the real browser is MP18b's GB-P5. Orchestrator: locked quick set 1,485/1,485 (34 s), `npm run -s check` OK, D35 guard empty, `tasks/` untouched |
| Acceptance | MP18a-B01 to B07 and T01 to T07 met (B01-B04 test cases 1-7; B05 removal checks; B06 case 8 and `generator-i18n`; B07 the ten document blocks verbatim; T04 by smoke, real browser at GB-P5) |
| Issues & resolutions | Removal check 1 as first written was case-insensitive and matched the kept texts `replay.reason.no-record` (EN), `replay.reason.record-invalid` and `replay.reason.overflow` (VI); SA1 ruled the check case-sensitive (option A), option B (changing the texts) refused. Not done here, by design: the browser pages still naming the retired button and dialog (`tests/browser/replay.*`, `generator-flow.js` lines 265-266, `acceptance.js` line 250) and design §13.3 items 25-26 belong to MP18b. No type check (no `tsc`) |
| Handoff | To MP18b: the section is in place (`mountGenerationSteps`, `createStepsController`); quick set 1,485; rewrite `tests/browser/replay.*`, update the two card-button expectations, run GB-P5 with the name-matching watchdog (`c13aa23`), and amend the release notes and PR #10 text |
