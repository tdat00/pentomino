# MP18b — Generation steps table: browser page, gate GB-P5 and the release-notes amendment

| Header | Value |
|---|---|
| ID | MP18b (second part of MP18, added after MP17 by owner decision P-OD14) |
| Depends on | MP18a (accepted and committed: the section "Generation steps", `createStepsController`, `mountGenerationSteps`, the card button and the dialog removed, the documents of MP18a) |
| Estimated size | Medium + gate: about 700–1,000 changed lines (`tests/browser/replay.js` rewritten, about −800/+700; `replay.html` about 10; two page expectations; the record about 150; documents about 10 in both languages); about 60–90 minutes of developer work plus about 10–15 minutes of machine time (the targeted tests, the quick set and the nine page runs of GB-P5) and the lock waits |
| Owner role | Generator UI and QA |
| Milestone | M11 — Generation steps table (P-OD14) |
| Design refs | check-list §4.1 P-OD14 and §4.2 D43; `tasks/difficulty-v3/MP18a-generation-steps-table.md` (the section, its selectors, its handoff); `tasks/difficulty-v3/MP16b-dialog-wiring-and-documents.md` (the page frame and the code block "The browser runner"); check-list §7 (GB-P5 and the lock) |
| Gates owned | **GB-P5**: `tests/browser/replay.html` (main, keys and narrow phases), `rendering.html`, `generator-flow.html`, `generator-editor.html`, `acceptance.html`, `watchdog.html` and `puzzle-code-acceptance.html` (main): nine runs in headless Microsoft Edge with MP16b's runner, ports 8818 and 9318 |
| Implementation status | Not started |

## Goal & business context

MP18a replaced the card button "How it was made" and its dialog by the section "Generation steps" in step 3, under
"Pieces to place", on every screen size (owner decision P-OD14, with Q1 (a), a small board in an opened row, and Q2 (a),
a puzzle without a record keeps the section). This task proves it in a real browser: the section and its rows, opening
a step, the two views, the cache, the keyboard and a screen reader's view of the table, the phone layout, a puzzle
without a record, the language switch, and that the replay never disturbs a generation. It runs gate GB-P5 over the
pages the change touches, writes a short record with the amended release notes and the amendments of the description of
pull request #10 (`rating-v3` → `main`, open), and closes MP17's named item about phones.

## Scope

### In scope

- `tests/browser/replay.html` and `tests/browser/replay.js`: rewritten for the section (main, keys and narrow phases).
- `tests/browser/generator-flow.js` (lines 265-266 at `0ed8800`) and `tests/browser/acceptance.js` (line 250): a card
  has the buttons `select` and `remove` again (MP16b had added `replay`).
- Fixes of MP18a's files (`generator/ui/generation-steps.js`, `generator/ui/replay-model.js`,
  `generator/ui/puzzle-panel.js`, `generator/app.js`, `generator/generator.css`, the Generator's locales,
  `tests/replay-model.test.js`) that a GB-P5 page proves needed, each listed in the reply with its failing check; no
  other change of an existing page unless a GB-P5 run proves one needed (then a `QUESTION:` first).
- Documents: `docs/design-detail.md` §13.3 items 25 and 26; `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` ("Browser
  test pages": the narrow phase).
- The record `docs/difficulty-v3/steps-table-<date>.md` (new; `<date>` is the date of the GB-P5 runs, `YYYY-MM-DD`).

### Out of scope

- Everything under `core/`, `tools/`, `player/` and `tests/fixtures/` (check-list D35; the guard below).
- MP17's record `docs/difficulty-v3/final-2026-11-15.md` and every earlier record: history, never edited.
- The pull request itself: the developer never pushes, comments or edits PR #10; the orchestrator applies the amendments
  of the record after accepting this task.
- New behaviour or texts beyond MP18a's (a `QUESTION:` instead).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- **Announce the gate to the orchestrator before starting it** (the Sudoku repository runs on the same machine):
  "GB-P5: nine page runs, one per invocation of the lock helper (`replay` main, keys and narrow, `rendering`,
  `generator-flow`, `generator-editor`, `acceptance`, `watchdog`, `puzzle-code-acceptance`; about 5–10 minutes of
  machine time plus the lock waits)". Start after the orchestrator's go.
- Browser pages run **only** in gate GB-P5. Each check logs `CHECK-START <name>` before it runs and finishes within
  1 minute; each page within the runner's 540 s bound; a longer run has an error: the last `CHECK-START` lines of its
  `browser.json` (`lastLogs`) show the check that stalled.
- **D35 guard.** `git --no-pager diff --stat 0ed8800 -- core tools player tests/fixtures` and
  `git --no-pager status --short -- core tools player tests/fixtures` print nothing, before the gate and before the
  reply.
- **Amendment L1 (lock; orchestrator decision 2026-11-13).** Save the helper `Invoke-Dv3Timed` of check-list §7
  ("Shared-machine lock protocol") verbatim as `tests/artifacts/MP18b/dv3-lock.ps1` and dot-source it in every call.
  Every test run and every browser run goes through it, as written in the test plan and in "Running the pages": one
  bounded command per acquisition of the lock (one page and phase per runner invocation), at most 590 s, at least 15 s
  between releasing the lock and taking it again (the helper waits), never a lock held across a series of commands; a
  slot that stays taken for 20 minutes is reported to the orchestrator. Only `npm run check`, the git commands, the
  removal check and, while you work, a single test file that ends within 10 seconds run without it. A command that the
  helper stops at its limit has an error: report it, never rerun it outside the helper. The reply gives each
  invocation's label, exit, seconds and lock wait.
- **Reruns.** A page run that fails is fixed and run again through the helper; the failing run's evidence directory is
  moved under `tests/artifacts/MP18b/pages/earlier/` and stays in the record. A rerun after a fix names the fix and the
  check it answers. No run is repeated without a change; `puzzle-code-acceptance` keeps KI-1's rule (check-list "Known
  issues"): a failure of its signature (a module worker emits `error` shortly after creation, "Puzzle code processing
  failed") is a regression, reported, never rerun to obtain a pass.
- Scratch files go under `tests/artifacts/MP18b/` and never end in `.test.js`.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports or the
  earlier records of `docs/difficulty-v3/`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no absolute path in a document. Check
  `$LASTEXITCODE` after every `node`, `npm` and `git` command (`git grep` exits 1 when nothing matches: that is the
  expected result of the removal check).

### Stop points (`QUESTION:`)

Stop, write a line starting `QUESTION:` with the facts and the answer you propose, and wait (the orchestrator forwards it
to the pack author, SA1):

- a fix seems needed outside the files of this task, in particular under `core/`, `tools/`, `player/` or
  `tests/fixtures/`;
- a page other than those of this file would have to change, or an existing page of GB-P5 fails for a reason that is
  not a stale expectation of the card's buttons;
- a behaviour or a text that MP18a does not decide, or a check of this file that contradicts MP18a's file;
- the D35 guard or the removal check prints a file.

## Inputs & context

### What MP18a provides

The section `section.generation-steps` (`data-role="generation-steps"`, `data-phase` `idle`/`loading`/`ready`/`failed`,
`data-result` the result's status when ready) is the last child of `section.puzzle-detail`, right after
`ul.detail-pieces`, created only when the client has `replayPuzzle`. Inside: `h4.steps-title` (`replay.title`,
"Generation steps", with an id that the table's `aria-labelledby` names); the status line
`div.steps-status[role="status"][data-role="steps-status"]` with one `p` per sentence; **Try again**
`button.steps-retry[data-action="steps-retry"]` (hidden unless failed); the view radios
`input[data-field="steps-view-compact"]` and `input[data-field="steps-view-all"]` in `fieldset.steps-view`;
`table.steps-table[role="table"]` with a `thead` of five `th[scope="col"][role="columnheader"]`, one
`tbody.steps-group[role="rowgroup"][data-stage]` per stage group (a run of consecutive steps of one stage, or a stage
without steps), each opened by `tr.steps-stage[data-mark]` (`.steps-stage-name` "Stage n: name", `.steps-stage-mark`),
then `tr.steps-row[role="row"][data-index][data-kind]` with `th[scope="row"][role="rowheader"]` >
`button.steps-toggle[data-action="steps-toggle"][aria-expanded]` (`.steps-toggle-icon` hidden, `.steps-toggle-label`
"Step n", n = `data-index` + 1, `aria-controls` only while open) and four `td[role="cell"][data-label]`
(`td.steps-what`, `td.steps-pieces` with `span.steps-piece[data-piece-id]` chips, `td.steps-techniques` and
`td.steps-score` with `span.steps-line` lines, or the text "—"); the open step's `tr.steps-detail` (its id is the open
button's `aria-controls`) right after its row, with `div.steps-board` (a thumbnail board) and `div.steps-score-table`
(`table.pm-replay-table` with a caption, or `p.pm-replay-noscore`). `mountGenerationSteps(host, { t, run, cellPxOf })`
→ `{ element, show(source, { rotation, busy }), refreshTexts(), dispose() }` mounts it alone (Part B). The cards have
the buttons `select` and `remove`; there is no dialog and no `button.card-replay`.

### The browser page (`tests/browser/replay.html`, `tests/browser/replay.js`)

**The frame.** `replay.html` keeps its head (the CSP meta, `common.css`, `theme.css`, `generator.css`, the module
script); its `<title>` becomes `MP18b Generation steps harness` and its paragraph says: "Developer regression page for
Generation steps (step 3, under Pieces to place). It is not part of the deployed site. Open it with `?phase=keys` for
the checks that need trusted keys and with `?phase=narrow` in a 390 px touch viewport." `replay.js` keeps from MP16b's
page, unchanged: `check`, `assert`, `equal`, `sleep`, `waitFor`, `press`, `shot`, `h`, `memoryStorage`, `mountApp`,
`q`, `qa`, `state`, `chooseLevel`, `setField`, `SET_SEED` (`'REPLAY-16B'`), `batchNumber` (7000), `kindsOf`,
`pressNewPuzzle`, `makeRun`, `sharedRun`, `releaseShared`, `candidateOf`, `numberText`, `sampleCode`, `samplePack`,
`sampleSet`, the violation and error listeners and the summary at the end (`data-result`, `data-summary`, the list).
It drops the dialog helpers (`replayButtonOf`, `openDialog`, `inside`, `role`, `action`, `sliderOf`, the dialog's
`statusLines`, `currentStage`, `highlights`, `openReplay`, `closeReplay`, `computed`) and the import of
`createReplayDialog`. Imports: `PoolAbortError`, `PoolError` (`core/browser/worker-pool.js`); `packBoard`, `parsePack`
(`core/engine/pack.js`); `pieceLabelText` (`core/browser/piece-look.js`); `createGeneratorApp` (`generator/app.js`);
`formatNumber`, `packOf`, `setLocale`, `t` (`generator/i18n.js`); `mountGenerationSteps`
(`generator/ui/generation-steps.js`); `thumbnailCellPx` (`generator/ui/puzzle-panel.js`).

**The phases.** `const phase = new URLSearchParams(location.search).get('phase') ?? 'main';` The main phase runs checks
1 to 5, 7 and 8 on the shared run, then `releaseShared()`, then 6, then Part B (9 to 12) and 13; `?phase=keys` runs K
only; `?phase=narrow` runs N only (the runner sets a 390 x 844 touch viewport there). When making the set nears a
check's 60 s, the setup moves before check 1 and the reply says so.

**New helpers** (exact):

```js
/** @param {Ctx} ctx */
const sectionOf = (ctx) => q(ctx, 'section.generation-steps');
/** @param {Ctx} ctx @param {string} id */
const selectCard = (ctx, id) => q(ctx, `li.puzzle-card[data-puzzle-id="${id}"] button.card-select`).click();
/** @param {HTMLElement} section */
const statusLines = (section) => [...section.querySelectorAll('[data-role="steps-status"] p')].map((p) => p.textContent);
/** @param {HTMLElement} section @returns {HTMLElement[]} */
const stepRows = (section) => [...section.querySelectorAll('tr.steps-row')];
/** @param {HTMLElement} row */
const toggleOf = (row) => /** @type {HTMLButtonElement} */ (row.querySelector('button[data-action="steps-toggle"]'));
/** @param {HTMLElement} row */
const labelOf = (row) => toggleOf(row).querySelector('.steps-toggle-label')?.textContent;
/** @param {HTMLElement} row */
const detailRowOf = (row) => document.getElementById(toggleOf(row).getAttribute('aria-controls') ?? '');
/** @param {Element} cell @returns {string[]} The lines of a cell, or its text when it has none ("—"). */
const linesOf = (cell) => (cell.querySelector('.steps-line') === null ? [cell.textContent ?? '']
  : [...cell.querySelectorAll('.steps-line')].map((line) => line.textContent ?? ''));
/** @param {HTMLElement} section @param {'compact' | 'all'} view */
const chooseView = (section, view) => /** @type {HTMLElement} */ (section.querySelector(`[data-field="steps-view-${view}"]`)).click();
/** @param {HTMLElement} section */
async function waitSteps(section) {
  await waitFor(() => section.dataset.phase === 'ready' || section.dataset.phase === 'failed', 'the replay', 50000);
  equal(section.dataset.phase, 'ready', `the replay answered (${statusLines(section).join(' ')})`);
}
/** @template T */
function deferred() {
  /** @type {(value: T) => void} */ let resolve = () => {};
  /** @type {(reason?: unknown) => void} */ let reject = () => {};
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
const RULE_KEYS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'].map((r) => `replay.rule.${r}`);
```

**Part A — the real Generator with real workers** (`mountApp` with the fixed seeds of `makeRun`; the 10 x 6 board;
level Hard; quantity 2). The kind of each card comes from the state, `kindsOf(ctx)`; a check that needs a layout walk
uses `candidateOf(ctx)`. One mounted app serves checks 1 to 5, 7 and 8 (and K, N in their phases); check 6 mounts its
own after `releaseShared()` (`createGeneratorApp` finds its slots document-wide).

1. **"1 section: under Pieces to place, the replay matches, every stage has a heading, cards have two buttons"**. Select
   the candidate card (`selectCard`), `waitSteps`. The section's `previousElementSibling` is `ul.detail-pieces` and its
   parent `section.puzzle-detail`; `h4.steps-title` reads `t('replay.title')` and its id is the table's
   `aria-labelledby`; `statusLines` equals `[t('replay.status.matched')]` and `data-result` is `matched`; the
   `data-stage` values of the `tbody.steps-group` elements cover 1 to 7; there is at least one `tr.steps-row`;
   `document.querySelector('button.card-replay, [data-role="replay-dialog"], dialog.pm-replay-dialog')` is null;
   every `li.puzzle-card` has exactly two child elements, `button.card-select` then `button.card-remove`; the section
   does not scroll sideways (`scrollWidth <= clientWidth + 1`) in the 1280 x 900 viewport.
2. **"2 rows: Key steps by default, numbered steps, stage headings, the final row's pieces, rules and score"**. On the
   same card: `steps-view-compact` is checked; the rows' `data-index` values increase; each row's `labelOf` equals
   `t('replay.row', { n: index + 1 })`; each `tbody.steps-group` starts with its `tr.steps-stage`, whose
   `.steps-stage-name` equals `t('replay.stage.heading', { n: s, name: t('replay.stage.<s>') })`; the last row has
   `data-kind="final"`; its chips (`[data-piece-id, textContent]`) equal, in the order of `state(ctx).set.pieces`, the
   pieces of `puzzle.clues` with `pieceLabelText(piece.label)`; its first techniques line equals the rule uses of
   `puzzle.rating.metrics.rules` as the section writes them (for R1 to R9 in order, each count above 0 as
   `t('replay.uses', { rule: t('replay.rule.R<k>'), n: numberText(count) })`, joined with ", ", or
   `t('replay.table.rules.none')` when there is none), and when `puzzle.rating.metrics.G > 0` its second line equals
   `t('replay.guesses', { count: G, proved: numberText(Gproved) })`; its score lines equal
   `[numberText(puzzle.rating.score), t('replay.score.inBand')]`; the card's `.card-rating` text contains
   `String(Math.round(puzzle.rating.score))`; a `rated` row's score lines are a whole number and then
   `t('replay.score.inBand')` or `t('replay.score.outOfBand')`; the section's `textContent` does not match
   `/\bR[1-9]\b/`.
3. **"3 expand: a layout step and a rated step open in turn; the focus stays; the main board is unchanged"**. Record
   `q(ctx, '.detail-board svg').outerHTML`. `chooseView(section, 'all')`. Take the first `retile` row with at least one
   chip; `focus()` its button, then `click()` it: `aria-expanded` is `true`, `detailRowOf(row)` is the row's next
   sibling, its `.steps-board` holds as many `[data-highlighted="true"]` pieces as the row has chips, it holds
   `p.pm-replay-noscore` with `t('replay.table.noScore')`, and `document.activeElement` is the button. Then `focus()`
   and `click()` the first `rated` row's button: the first button has `aria-expanded="false"` and no `aria-controls`,
   the section has exactly one `tr.steps-detail`, the new one holds `table.pm-replay-table` whose `caption` reads
   `t('replay.table.caption')` and every `tbody tr` of which starts with `th[scope="row"]`; the focus is on the rated
   row's button; the main board's `outerHTML` equals the recorded one. Scroll the open row into view
   (`scrollIntoView({ block: 'center' })`) and `await shot('steps-wide')`.
4. **"4 view: Every step shows more rows; an open step stays only when shown; the status line does not change"**.
   `chooseView(section, 'compact')`; record `statusLines(section)` and the set K of the rows' `data-index` values. Open
   the final row (click its button unless it is open; the final row is in both views); `chooseView(section, 'all')`:
   there are more rows than in K and the final row is still `aria-expanded="true"`. Open a row whose `data-index` is not
   in K; `chooseView(section, 'compact')`: no button has `aria-expanded="true"` and there is no `tr.steps-detail`.
   `statusLines(section)` is still the recorded one.
5. **"5 shown again: the view is kept for another puzzle; a puzzle shown before comes back at once, without a run"**.
   `chooseView(section, 'all')`; select another card than the candidate (`state(ctx).puzzles`), `waitSteps`;
   `steps-view-all` is still checked. Observe the status element with a `MutationObserver` (`childList`, `subtree`,
   `characterData`) that records its `textContent` at each callback; select the candidate card again, `await new
   Promise(requestAnimationFrame)`, disconnect: `data-phase` is `ready`, the rows are there, `statusLines` is
   `[t('replay.status.matched')]`, and the recorded texts include neither `t('replay.loading')` nor
   `t('replay.waiting')`.
7. **"7 language: Vietnamese texts with a step open; the same step stays open and keeps the focus"**. Open the first
   `rated` row and `focus()` its button. In a `try`, `setLocale('vi')`: the heading equals `packOf('vi')['replay.title']`
   ("Các bước tạo đề"); the five column headers equal the Vietnamese `replay.col.step`, `.what`, `.pieces`,
   `.techniques`, `.score`; `statusLines` equals `[vi['replay.status.matched']]`; the heading of the stage-1 group reads
   `Giai đoạn 1: Số mảnh`; some `td.steps-techniques` contains one of the nine Vietnamese rule names; the row with the
   same `data-index` has `aria-expanded="true"` and its button is `document.activeElement`. In `finally`,
   `setLocale('en')`; then the heading and the status line are English again.
8. **"8 calibration: stage 4 needed no steps; highlights only in stages 5 and 6"**. Select the card whose kind is
   `calibration` (fail and print `kindsOf(ctx)` when there is none), `waitSteps`; `statusLines` is
   `[t('replay.status.matched')]`; the `tbody.steps-group[data-stage="4"]` has `data-mark="none"` on its stage row, the
   mark text `t('replay.stage.none')` and no `tr.steps-row`, also after `chooseView(section, 'all')`. Click every step
   button in turn (Every step): the rows whose small board holds a `[data-highlighted="true"]` piece are all in groups of
   stage 5 or 6, and there is at least one.

`releaseShared()` here (the page's slots are document-wide).

6. **"6 unavailable: an imported puzzle keeps the section, with one row for the stored puzzle"**. A new app
   (`mountApp({ quantity: 1, importButton: true })`) imports the code of the Player sample's first puzzle (`sampleCode`,
   G1 of `tests/fixtures/puzzlecode-v1.json`) through the Import puzzle dialog, as MP16b's check 7 did (the
   `dialog.pm-code`, its `.pm-code-field`, an `input` event, `[data-action="code-open"]`, then the wait for one
   puzzle). Its section: `waitSteps`; `data-result` is `unavailable`; `statusLines` equals
   `[t('replay.status.unavailable'), t('replay.reason.no-set-origin')]` (an imported set has no `setOrigin`); the groups
   of stages 1 to 6 each have `data-mark="notAvailable"`, the mark text `t('replay.notAvailable')` and no row; the only
   `tr.steps-row` has `data-kind="final"`, the sentence `t('replay.step.final.stored')`, the score lines
   `[numberText(puzzle.rating.score)]` (a `difficulty-v2` summary claim: no band line) and the techniques text
   `t('replay.table.unavailable')`; Every step shows the same single row. The app is destroyed in a `finally`.

**Part B — the section alone** (`mountGenerationSteps` in a `div` appended to the sandbox, with `t` of
`generator/i18n.js`, `cellPxOf: (board) => thumbnailCellPx(board, 240)` and a scripted `run`; `dispose()` and the
`div` removed in a `finally`). The sources are `A = { set: sampleSet, puzzle: samplePack.puzzles[0], setOrigin: null,
made: null }` and `B = { ...A, puzzle: samplePack.puzzles[1] }` (one set object); the context is
`{ rotation: 0, busy: false }`. The results:

```js
const scriptedStep = (stage, kind, args = {}) => ({
  stage, kind, board: { placed: [], lifted: [], clues: [] }, rating: null, breakdown: null, detail: null, band: null,
  note: `replay.step.${kind}`, args,
});
/** @param {'matched' | 'incomplete' | 'mismatch'} status @param {string | null} reason */
const scriptedResult = (status, reason) => ({
  status,
  reason,
  stages: { set: 'replayed', candidate: status === 'incomplete' ? 'stopped' : status === 'mismatch' ? 'mismatch' : 'replayed',
    final: status === 'matched' ? 'compared' : 'not-compared' },
  compared: [],
  work: 0,
  steps: [scriptedStep(1, 'count', { k: 9, min: 9, max: 9 }), scriptedStep(2, 'carve', { mode: 'flat', parts: 0 }),
    scriptedStep(3, 'piece', { n: 1 }), scriptedStep(7, 'final', { status, detailStep: null })],
});
```

9. **"9 another puzzle: its own signal is aborted; a puzzle shown before is not run again"**. The `run` records
   `{ source, signal }` and returns a `deferred()` promise. `show(A, context)`, then `show(B, context)`: the first
   call's signal is aborted and the second call's source is `B`; resolve it with `scriptedResult('matched', null)` and
   wait for `data-phase="ready"` (four step rows). `show(A, context)`: a third call (an aborted run is not kept);
   resolve it and wait for `ready`. `show(B, context)`: still three calls, and `data-phase` is `ready` at once.
10. **"10 a new generation: the replay is submitted again; the waiting text"**. A `run` that rejects with
    `new PoolAbortError('cancelled')` on its first call and resolves `scriptedResult('matched', null)` on the second,
    with a `MutationObserver` on the status element: after `show(A, context)` the section becomes `ready`, `run` was
    called twice, and no recorded text is `t('replay.failed')` or `t('replay.failed.worker')`. A second section with a
    `run` that never settles: `show(A, { rotation: 0, busy: true })` gives `statusLines` `[t('replay.waiting')]`, then
    `show(A, { rotation: 0, busy: false })` gives `[t('replay.loading')]` and makes no second call.
11. **"11 failure: the worker message and Try again"**. A `run` that rejects with `new PoolError('worker-unavailable',
    'no worker')` on its first call and resolves `scriptedResult('matched', null)` on the second: after `show(A,
    context)` the section is `failed`, `statusLines` is `[t('replay.failed.worker')]`, the retry button is not hidden
    and reads `t('replay.retry')`; clicking it calls `run` again, the section becomes `ready` and the button is hidden.
12. **"12 incomplete and mismatch: the status names the limit or the field; the last row is the stored puzzle"**. For
    `scriptedResult('incomplete', 'work')`: `data-result="incomplete"`, `statusLines` `[t('replay.status.incomplete',
    { reason: t('replay.limit.work') })]`, the stage rows of groups 4 to 6 have `data-mark="stopped"`; for
    `scriptedResult('mismatch', 'rating')`: `statusLines` `[t('replay.status.mismatch', { field:
    t('replay.field.rating') })]`, groups 4 to 6 `data-mark="notAvailable"`. In both, the final row's `td.steps-what`
    reads `t('replay.step.final.stored')`.
13. **"13 no CSP violations and no uncaught errors"**: the two lists are empty.

**K — "keyboard: Tab and Shift+Tab go from one step button to the next; Enter opens and closes; an open step has no
tab stop"** (`?phase=keys` only; trusted keys through `press(key)`, never synthetic events). The shared run (it waits
for the certificates), the candidate card selected, `waitSteps`, Key steps; the buttons `b = stepRows(section).map(
toggleOf)` (at least five). `b[0].focus()`; `press('Tab')` three times: the focus is on `b[1]`, `b[2]`, `b[3]` in turn;
`press('Shift+Tab')`: `b[2]`; `press('Enter')`: `b[2]` has `aria-expanded="true"` and the focus; `press('Tab')`:
`b[3]` (the open row's board has no tab stop); `press('Shift+Tab')`: `b[2]`; `press('Enter')`: `aria-expanded="false"`
and the focus on `b[2]`. Eight keys in all.

**N — "narrow: at 390 px with a coarse pointer the section is there, its rows stack with their column names, the table
roles stay, nothing scrolls sideways"** (`?phase=narrow` only). `matchMedia('(pointer: coarse)').matches` is true and
`innerWidth <= 420`. The shared run, the candidate card selected, `waitSteps`, `section.scrollIntoView({ block:
'start' })`: the section's box is not empty and its previous sibling is `ul.detail-pieces`; every cell of the first
`tr.steps-row` computes `display: block`; its four `td` have `data-label` `t('replay.col.what')`, `.pieces`,
`.techniques`, `.score` in order; the roles are set (`table` on the table, `rowgroup` on `thead` and each `tbody`,
`row` on each `tr`, `columnheader` on each `thead th`, `rowheader` on each step row's `th` and stage row's `th`, `cell`
on each `td`); `section.scrollWidth <= section.clientWidth + 1` and `document.documentElement.scrollWidth <= innerWidth
+ 1`. `chooseView(section, 'all')`, open the first `rated` row: its `.steps-board` bottom is at or above its
`table.pm-replay-table` top (+ 0.5 px), nothing scrolls sideways, and the open button and the two radio labels are at
least 34.5 px high and wide (the 36 px targets of the narrow layout, measured as `smallTargets` of
`tests/browser/puzzle-code-acceptance.js` measures them). Scroll the open row into view and `await shot('steps-narrow')`.

`tests/browser/rendering.js` (the `highlightedIds` check of MP16b) stays as it is: the small boards use the same option.

**The two expectations.** `tests/browser/generator-flow.js` lines 265-266 become `assert(qa(ctx, '.puzzle-card
a').length === 0 && qa(ctx, '.puzzle-card button').length === 2 * puzzles.length && qa(ctx, '.puzzle-card
button').every((b) => ['select', 'remove'].includes(b.dataset.action ?? '')), 'a card only has its select and remove
buttons');` and `tests/browser/acceptance.js` line 250 becomes `assert(qa(d, '.puzzle-card a').length === 0 && qa(d,
'.puzzle-card button').every((b) => ['select', 'remove'].includes(b.dataset.action ?? '')), 'the card only has its
select and remove buttons');` (keep each statement on the lines it uses today).

### Running the pages (check-list §7; GB-P5)

Copy the code block "The browser runner" of `tasks/difficulty-v3/MP16b-dialog-wiring-and-documents.md` verbatim to
`tests/artifacts/MP18b/pages.mjs` (as MP17 did). It serves the repository on port 8818 (`node tools/serve.mjs --port
8818 --prefix /pentomino/`), starts Edge for every run with the throwaway profile `tests\artifacts\edge-MP18b\` and CDP
port 9318, presses the trusted keys a page asks for, emulates the 390 x 844 touch viewport in the narrow phase (with a
coarse pointer: MP17's `puzzle-code-acceptance` narrow run asserted it), saves the screenshots a page asks for, bounds
every run at 540 s, stops Edge and the server by PID, removes the profile (also on failure), and writes one evidence
directory per page and phase (`browser.json`, `page.png`, the screenshots) and `runs.json` with the PIDs. It refuses to
start when a port is busy: report it and never stop someone else's process.

Nine invocations of the lock helper, one page and phase each, in this order (start the loop in async mode and read its
output):

```powershell
. tests\artifacts\MP18b\dv3-lock.ps1
$pages = @('replay', 'replay:keys', 'replay:narrow', 'rendering', 'generator-flow', 'generator-editor', 'acceptance',
  'watchdog', 'puzzle-code-acceptance')
$failed = @()
for ($i = 0; $i -lt $pages.Count; $i++) {
  $r = Invoke-Dv3Timed -Task "MP18b GB-P5 $($pages[$i])" -NodeArgs @('tests/artifacts/MP18b/pages.mjs', '--task', 'MP18b',
    '--http', '8818', '--cdp', '9318', '--evidence', ('tests/artifacts/MP18b/pages/{0:d2}' -f ($i + 1)), $pages[$i])
  "page $($i + 1) $($pages[$i]): exit $($r.Exit)"
  if ($r.TimedOut -or $r.Exit -eq 2) { throw "page run $($pages[$i]) stopped at the limit or did not start: report it" }
  if ($r.Exit -ne 0) { $failed += $pages[$i] }
}
"failed runs: $($failed.Count) $($failed -join ', ')"
```

A run passes with `data-result="pass"`, no CSP violation and no uncaught error (the runner's `PASS` line);
`acceptance.html` with its four known blocked checks only (A1, B1, B2, B3: they need a person or a device). At MP17
(`final-2026-11-15.md` §4) these pages took: `rendering` 0.8 s, `generator-flow` 34.8 s, `generator-editor` 2.2 s,
`acceptance` 10.6 s, `watchdog` 6.8 s, `puzzle-code-acceptance` 37.9 s; `generator-editor`, `watchdog` and
`puzzle-code-acceptance` mount the Generator, carried MP16b's closed dialog, and now carry the section: they pass with
no change of theirs. The screenshots for the pull request are
`tests/artifacts/MP18b/pages/01/replay/main/steps-wide.png` and
`tests/artifacts/MP18b/pages/03/replay/narrow/steps-narrow.png`.

### The record (`docs/difficulty-v3/steps-table-<date>.md`)

English, CRLF, no BOM, relative links only. Sections:

1. **Header**: the date, the code revision (`git rev-parse --short HEAD`, MP18a's commit), the base `0ed8800`, the Node
   version, the Edge version (`browser.json`), the gate's announcement, start and end, the machine time and the lock
   waits.
2. **D35**: the outputs of the two guard commands (nothing) and the statement that no file under `core/`, `tools/`,
   `player/` or `tests/fixtures/` differs from `0ed8800`, so no rating, puzzle or generated value changed.
3. **GB-P5**: a table of the nine runs (page, phase, result, summary, seconds, keys pressed, CSP and uncaught errors,
   server PID, Edge PID, lock wait) from the `runs.json` files; the blocked checks of `acceptance.html`; the statement
   that every server and Edge was stopped by PID and the profile removed; every failing run and rerun with its reason
   and fix (evidence under `pages/earlier/`).
4. **The checks of `replay.html`**: one row per check (1–13, K, N) with its result and seconds (the `CHECK-END` lines of
   `lastLogs`), and the viewport of the narrow run (`browser.json` `viewport`, coarse pointer included).
5. **Quick set, check and removal**: the counts and durations of the targeted run and of the quick set (1,485 expected),
   `npm run check`, and the output of the repository-wide removal check (nothing).
6. **MP17's named item**: "Generation Steps on phones (MP16b; the pack author's ruling Q3)" of MP17's record §10 is
   closed by P-OD14: the steps are in step 3 on every screen size (check N). MP17's record stays as it is, as history.
7. **Release notes amendment**: the paragraph below replaces, for every reader after MP18, the paragraph
   "Generation Steps." of §11 "For users" of `final-2026-11-15.md` (that record is not edited):

   > **Generation Steps.** In step 3 of the Generator, under "Pieces to place", the section "Generation steps" shows how
   > the puzzle on show was made, step by step (the piece count, the carving, the pieces, the layout, the clue sets that
   > were rated, the repairs and the final puzzle), with the pieces of each step, the deduction rules (by name) and
   > decisive guesses it used, and its score, in key steps or every step; opening a step shows a small board of that step
   > and its full score table, and the main board keeps showing the puzzle. It is there on every screen size, phones
   > included; it fills in by itself when a puzzle is shown, waits while a generation runs and never delays one, and a
   > puzzle shown before comes back at once. A puzzle without a record of how it was made (an imported puzzle, or one
   > made by an earlier version) keeps the section, which says that its steps are not available and shows the stored
   > puzzle with its score. Packs written by this version carry a small optional provenance record
   > (`generation.setOrigin`, `generation.made`) for it. A replay is bounded by work, not by a clock; one measurement on
   > a 20 x 18 Nightmare puzzle took 1.7 seconds.

8. **Amendments of the description of PR #10** (for the orchestrator, who applies them after accepting this task; each
   is "replace … with …", quoted exactly; `<…>` marks a value the orchestrator fills):
   1. In "Summary", replace the sentence `The Generator also gets a new **"How it was made"** dialog that replays how a
      puzzle was generated, step by step, with its score table.` with `The Generator also shows **Generation steps** in
      step 3, under "Pieces to place": a table of how the puzzle on show was generated, step by step, with the pieces,
      the deduction rules and the score of each step.`
   2. In "Summary", replace `(MP01 to MP17)` with `(MP01 to MP18b; MP18a and MP18b were added after MP17 by owner
      decision P-OD14)`, and after `The final regression gate (GZ, MP17) passed on this branch.` add ``Gate GB-P5
      (MP18b) passed after the Generation steps change; its record is [`docs/difficulty-v3/steps-table-<date>.md`](<link
      pinned to the commit, as the link of the final record>).``
   3. Replace the block **Generation Steps ("How it was made")** and its four bullets with:

      ```markdown
      **Generation steps** (owner decision P-OD14, which replaced the "How it was made" card button and its dialog)
      - **Where:** in step 3 of the Generator, under "Pieces to place", on every screen size, phones included.
      - **What it shows:** one row per step, under its stage (piece count, carving, pieces, layout, rating clue sets, uniqueness repair, the final puzzle), in key steps or every step: the step's sentence, its pieces, the deduction rules it used (by name, with counts) and its decisive guesses, and its score (in or outside the band of the requested level, an estimate, refused or unrateable).
      - **Opening a step:** a small board of that step and its full score table; the main board keeps showing the puzzle.
      - **Puzzles without a record** (imported, or made by an earlier version): the section stays and says that the steps are not available, with one row for the stored puzzle and its score.
      - **Provenance:** packs written by this version carry a small optional provenance record (`generation.setOrigin`, `generation.made`) for it.
      - **Bounds:** a replay is bounded by work, not by a clock. It runs by itself when a puzzle is shown, waits while a generation runs and is kept for the puzzles shown before. One 20x18 Nightmare puzzle replayed in 1.7 s.
      ```
   4. In "Screenshots", replace the three images of the card and the dialog and their captions with: `From gate GB-P5
      (headless Edge, page tests/browser/replay.html, real engine and workers):`, the caption `Generation steps under
      "Pieces to place", with a step opened (its small board and score table):` and the image `steps-wide.png`, then the
      caption `On a phone (390 px), the rows stack with their column names:` and the image `steps-narrow.png` (the
      orchestrator uploads both from the paths above).
   5. In "Implementation overview", **Generator**: replace `` `ui/replay-dialog.js` and `ui/replay-model.js`: new, the
      Generation Steps dialog and its model. `` with `` `ui/generation-steps.js` and `ui/replay-model.js`: new, the
      Generation steps section and its model. `` and `` `ui/puzzle-panel.js`: the card button. `` with
      `` `ui/puzzle-panel.js`: the Generation steps section under the pieces to place. ``; the size figures and the
      commit count are recounted by the orchestrator.
   6. In "Validation", add a bullet: ``**Generation steps (MP18b, gate GB-P5):** the nine page runs pass (`replay` main
      <a>/<a>, keys <b>/<b> with <k> trusted keys, narrow <c>/<c>; `rendering`, `generator-flow`, `generator-editor`,
      `acceptance` (16 checks, 4 blocked), `watchdog` and `puzzle-code-acceptance`), with no CSP violation and no
      uncaught error; the quick set passes with <count> tests.`` (the developer fills `<a>`, `<b>`, `<c>`, `<k>` and
      `<count>` from the gate.)
   7. In "Known limitations", **Interface**: delete the bullet `**Phones:** Generation Steps cannot be opened below
      768 px, where the Generator shows no cards.`
   8. In "Commits by task": add the row `| MP18a, MP18b | <MP18a commit>, <MP18b commit> | Generation steps table in
      step 3 (P-OD14) |` after the MP17 row, and add the pack commit of P-OD14 (`<commit>`) to the row "Pack and
      decisions", whose subject becomes `Owner decisions P-OD1 to P-OD14, pack reviews and amendments`.

### Documents

- `docs/design-detail.md` §13.3 item 25: after `step 3 shows one puzzle at a time with ◀ ▶` add `, with its Generation
  steps under the pieces to place`.
- `docs/design-detail.md` §13.3 item 26: replace the whole item with:

```markdown
26. `tests/browser/replay.html` (strict policy; `?phase=keys` for the check that needs trusted keys, `?phase=narrow` for the 390 px touch viewport) tests Generation steps (§6.12, §10.5, §11.11). Part A runs the real Generator with its real workers (a Hard set on the 10 × 6 board with a fixed seed, two puzzles) and checks: the section right after "Pieces to place", the replay matching the stored puzzle, a heading for every stage, and cards with their select button and ✕ only (no card button, no dialog); the rows of Key steps (step numbers, the stage headings, the final row's pieces equal to the puzzle's clues, the rules by name and never as codes, the score in band and equal to the stored score); opening a layout step (its small board with the lifted pieces highlighted, "No score for this step.") and then a rated step (the first closes; a score table with a caption and row headers), with the focus kept on the step's button and the board of the puzzle unchanged; the two views (more rows in Every step, an opened step kept only when shown, no status change); the view kept for another puzzle and a puzzle shown again appearing at once from the cache; an imported puzzle (the section stays, with its reason, stages 1 to 6 not available and one row with the stored score); the language switch with a step open (the texts, the same step open, the focus kept); and the set's calibration card (stage 4 with "No steps were needed" and no rows, highlights only in stages 5 and 6). Part B mounts the section alone with scripted replays: another puzzle aborting the replay's own signal and the cache (no second run), a new generation (the replay submitted again, the waiting text), the worker-unavailable message with **Try again**, and the incomplete and mismatch statuses. The keys phase presses trusted keys over CDP: Tab and Shift+Tab from one step button to the next, Enter opening and closing a step with the focus kept, and Tab passing an opened step's board. The narrow phase checks the phone layout at 390 px with a coarse pointer: the section after the pieces to place, the rows stacked with their column names, the table roles kept, no sideways scrolling, the board above the score table and 36 px targets. It asserts that there was no policy violation or uncaught error.
```

- `DEVELOPERGUIDE.md` "Browser test pages": after the sentence that ends `wait for trusted key presses that only a runner
  over the DevTools protocol sends.` add `` `replay.html?phase=narrow` and `puzzle-code-acceptance.html?phase=narrow`
  expect the 390 px touch viewport that such a runner sets. `` (wrap at 120 characters).
- `DEVELOPERGUIDE.vn.md` "Trang kiểm thử trên trình duyệt": after the sentence that ends `mới gửi được.` add
  `` `replay.html?phase=narrow` và `puzzle-code-acceptance.html?phase=narrow` cần khung nhìn cảm ứng rộng 390 px do
  trình chạy đó thiết lập. `` (wrap at 120 characters).

## Files to create/modify

| File | Change |
|---|---|
| `tests/browser/replay.html`, `tests/browser/replay.js` | rewritten: Parts A and B, checks 1–13, K and N |
| `tests/browser/generator-flow.js`, `tests/browser/acceptance.js` | the card's buttons `select` and `remove` |
| MP18a's files | only fixes proven by a GB-P5 page, each listed with its failing check |
| `docs/design-detail.md` | §13.3 items 25 and 26 |
| `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | "Browser test pages": the narrow phase |
| `docs/difficulty-v3/steps-table-<date>.md` | new: the record |

Exclusive ownership while this task runs: the files above; scratch under `tests/artifacts/MP18b/` (the runner
`pages.mjs`, the lock helper `dv3-lock.ps1` and the evidence) and the Edge profile `tests\artifacts\edge-MP18b\`.

## Implementation steps

1. The D35 guard; the page (Parts A and B, K, N) and the two expectations.
2. The targeted Node tests; save the runner and the helper; announce GB-P5 and wait for the orchestrator's go; the nine
   runs (one helper invocation each); fix what they show (only in the files of this task, else `QUESTION:`); run again
   the pages a fix touches.
3. The documents; the quick set; `npm run check`; the D35 guard; the removal check; the record.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP18b-B01 | In a real browser, step 3 shows the section under "Pieces to place" with the steps of the puzzle on show, their pieces, techniques (named rules) and scores; opening a step shows its board and score table and leaves the main board as it was | checks 1–3, 8 |
| MP18b-B02 | The steps can be read on a phone: the section is there at 390 px, its rows stack with their column names, nothing scrolls sideways, targets are 36 px | check N |
| MP18b-B03 | The table works with the keyboard and keeps its table roles for a screen reader; opening keeps the focus; the status line does not change on opening or on a view switch | checks K, N, 3, 4 |
| MP18b-B04 | A puzzle without a record keeps the section, says why its steps are not available and shows its stored score (Q2 (a)) | check 6 |
| MP18b-B05 | The replay never disturbs a generation: another puzzle cancels only the replay, a new generation submits it again, a failure offers Try again, a puzzle shown before is not replayed again | checks 5, 9–11 |
| MP18b-B06 | The cards have their select button and ✕ only; the dialog is gone | check 1; `generator-flow`; `acceptance` |
| MP18b-B07 | The texts follow the language, with the step kept open | check 7 |
| MP18b-B08 | The release notes and PR #10's description have their amendments, and MP17's named item about phones is closed | the record §6–§8 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP18b-T01 | GB-P5: the nine runs pass (`replay` main 13 checks, keys 1, narrow 1; `rendering`; `generator-flow`; `generator-editor`; `acceptance` with its four known blocked checks only; `watchdog`; `puzzle-code-acceptance` main), no CSP violation, no uncaught error, each check under 1 minute, one evidence directory per page and phase | the record §3; the nine `runs.json` |
| MP18b-T02 | Check K pressed trusted keys only (the runner's `pressed` list has the 8 keys); check N ran in the 390 x 844 viewport with a coarse pointer | `browser.json` of runs 2 and 3 |
| MP18b-T03 | Only the two listed expectations changed in existing pages; every fix of MP18a's files is listed with its failing check | diff; review |
| MP18b-T04 | The D35 guard prints nothing | command output; the record §2 |
| MP18b-T05 | `npm run test:quick` passes (1,485 tests) and `npm run check` passes; the repository-wide removal check prints nothing; the record is CRLF without BOM, with a final newline and no absolute path; the documents are in step in both languages | command output; the record §5; review |

## Test plan

### Exact commands

```powershell
git --no-pager diff --stat 0ed8800 -- core tools player tests/fixtures
git --no-pager status --short -- core tools player tests/fixtures
. tests\artifacts\MP18b\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP18b targeted tests' -LimitSeconds 300 -NodeArgs @('--test', '--test-skip-pattern=slow',
  'tests/replay-model.test.js', 'tests/generator-i18n.test.js', 'tests/generator-state.test.js',
  'tests/generator-import.test.js')
if ($r.TimedOut -or $r.Exit -ne 0) { throw 'targeted tests failed' }

# announced gate GB-P5 (after the orchestrator's go): ports 8818 / 9318, the loop of "Running the pages"

$r = Invoke-Dv3Timed -Task 'MP18b quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.TimedOut -or $r.Exit -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
git --no-pager diff --stat 0ed8800 -- core tools player tests/fixtures
git --no-pager status --short -- core tools player tests/fixtures
git --no-pager grep -n -I --untracked -E ("replay-dialog|createReplayDialog|createReplayController|card-replay|" +
  "pm-replay-dialog|DEFAULT_INTERVAL_MS|How it was made|Cách tạo đề|" +
  "replay\.(button|close|prev|next|play|pause|slider|stages)\b|replay\.failed\.interrupted|'select', 'replay', 'remove'") `
  -- . ':(exclude)tasks' ':(exclude)docs/difficulty-v3' ':(exclude)tests/replay-model.test.js'
```

Expected: the four git commands print nothing (the last exits 1: no match); the targeted run and the quick set pass
(1,485 tests) within the 590 s bound; `npm run check` exits 0. At `0ed8800` the removal check lists 17 files (the
documents, the Generator files and the four browser files); after MP18a only the four browser files may remain, and
this task removes them.

### Required test cases

The browser checks of "The browser page" (checks 1–13 in the main phase, K in the keys phase, N in the narrow phase)
and the existing checks of the other GB-P5 pages. No Node test changes in this task.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the gate record (pages, phases, results, durations, PIDs stopped,
  lock waits), every change to an existing page and every fix of MP18a's files with its failing check, the D35 guard,
  the removal check and the test counts, and the path of the record.
- Handoff to the orchestrator: the record's §7 (release notes) and §8 (PR #10 amendments, with the two screenshots to
  upload); P-OD14 complete.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
