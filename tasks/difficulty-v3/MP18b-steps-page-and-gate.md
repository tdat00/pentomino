# MP18b — Generation steps table: browser page, gate GB-P5 and the release-notes amendment

| Header | Value |
|---|---|
| ID | MP18b (second part of MP18, added after MP17 by owner decision P-OD14) |
| Depends on | MP18a (accepted and committed: the section "Generation steps", `createStepsController`, `mountGenerationSteps`, the card button and the dialog removed, the documents of MP18a) |
| Estimated size | Medium + gate: about 750–1,050 changed lines (`tests/browser/replay.js` rewritten, about −800/+740 with the setup; `replay.html` about 10; two page expectations; the check instrumentation of six pages, about 30; the record about 160; documents about 10 in both languages; the runner is scratch, copied from this file); about 70–100 minutes of developer work plus about 10–15 minutes of machine time (the targeted tests, the quick set and the nine page runs of GB-P5) and the lock waits |
| Owner role | Generator UI and QA |
| Milestone | M11 — Generation steps table (P-OD14) |
| Design refs | check-list §4.1 P-OD14 and §4.2 D43; `tasks/difficulty-v3/MP18a-generation-steps-table.md` (the section, its selectors, its handoff); `tasks/difficulty-v3/MP16b-dialog-wiring-and-documents.md` (the page frame and the code block "The browser runner", from which this file's runner is built); check-list §7 (GB-P5 and the lock) |
| Gates owned | **GB-P5**: `tests/browser/replay.html` (main, keys and narrow phases), `rendering.html`, `generator-flow.html`, `generator-editor.html`, `acceptance.html`, `watchdog.html` and `puzzle-code-acceptance.html` (main): nine runs in headless Microsoft Edge with this file's runner (MP16b's runner with the check watchdog: every check under 60 s, the setup of `replay.html` under 240 s), ports 8818 and 9318 |
| Implementation status | Not started |

## Goal & business context

MP18a replaced the card button "How it was made" and its dialog by the section "Generation steps" in step 3, under
"Pieces to place", on every screen size (owner decision P-OD14, with Q1 (a), a small board in an opened row, Q2 (a), a
puzzle without a record keeps the section, and Q3 (a), a puzzle whose record is only partly there shows its stored
puzzle only). This task proves it in a real browser: the section and its rows, opening a step, the two views, the
cache, the keyboard and a screen reader's view of the table, the phone layout, a puzzle without a record, the language
switch, and that the replay never disturbs a generation. It runs gate GB-P5 over the pages the change touches, writes a
short record with the amended release notes and the amendments of the description of pull request #10 (`rating-v3` →
`main`, open), and closes MP17's named item about phones.

## Scope

### In scope

- `tests/browser/replay.html` and `tests/browser/replay.js`: rewritten for the section (main, keys and narrow phases).
- `tests/browser/generator-flow.js` (lines 265-266 at `0ed8800`) and `tests/browser/acceptance.js` (line 250): a card
  has the buttons `select` and `remove` again (MP16b had added `replay`).
- `tests/browser/rendering.js`, `generator-flow.js`, `generator-editor.js`, `acceptance.js`, `watchdog.js` and
  `puzzle-code-acceptance.js`: the check instrumentation only (their function `check` logs `CHECK-START` and
  `CHECK-END`, "The check instrumentation"; SA2's cross-review of 2026-11-16); no assertion, result count, phase filter
  or blocked check of these pages changes, so the two card expectations above stay the only changed assertions.
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
- Browser pages run **only** in gate GB-P5. Every check of a GB-P5 page logs `CHECK-START <name>` before its callback
  and `CHECK-END <PASS|FAIL> <seconds> s <name>` after it ("The check instrumentation"), and the setup of `replay.html`
  logs `SETUP-START <name>` and `SETUP-END <PASS|FAIL> <seconds> s <name>` ("The frame"). The runner's watchdog
  ("Running the pages") fails a run as soon as a check reaches 60 s or the setup 240 s, by the runner's clock or the
  page's, or a check starts before the previous one ended, or an end names another check, and stops that run's Edge by
  PID at once (the later checks do not run, and nothing waits for the page bound); a check or the setup still open when
  the page ends, or a page that ran no check, fails the run too. `browser.json` names the check (`watchdog`, `checks`).
  Each page stays within the runner's 540 s bound.
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
- the runner of "Running the pages" fails for a reason that is not a page's (it is the pack author's code: report its
  output, never change its limits);
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
the buttons `select` and `remove`; there is no dialog and no `button.card-replay`. The controller presents an
`unavailable` result as its final step alone (MP18a, controller rule 4; P-OD14 Q2 (a) and Q3 (a)), so such a puzzle
has one row and six "Steps not available for this puzzle." stages, also when the engine replayed some of its stages.

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

Its header comment (lines 1-7 at `0ed8800`) becomes, exactly:

```js
// @ts-check
// Browser regression harness for Generation steps (MP18b, gate GB-P5): the section of step 3 under "Pieces to
// place". Part A drives the real Generator with its real engine workers (a Hard set on the 10 x 6 board, two
// puzzles); Part B mounts the section alone with scripted replays. A setup makes the shared run and finds its
// candidate card before the first check of every phase. `?phase=keys` runs only check K, whose keys the runner
// presses (trusted keys, never synthetic events); `?phase=narrow` runs only check N, in the runner's 390 px touch
// viewport; the main phase runs the other checks. The setup and every check log their start and end for the runner's
// watchdog. It writes a pass/fail list into the page and sets data-result and data-summary on <html>. It is a
// developer fixture, not deployed.
```

After `const CHECK_LIMIT_MS = 60000;` add `const SETUP_LIMIT_MS = 240000;`, and after the function `check` add:

```js
/**
 * Runs the setup of a phase between a SETUP-START and a SETUP-END console line (the runner's watchdog bounds it at
 * 240 s too) and fails it when it takes longer; a failed setup is the page's only result (no check of the phase runs).
 * @param {string} name
 * @param {() => Promise<void>} fn
 * @returns {Promise<boolean>} Whether the setup passed.
 */
async function setup(name, fn) {
  console.log(`SETUP-START ${name}`);
  const started = performance.now();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const seconds = () => Math.round((performance.now() - started) / 100) / 10;
  /** @type {string | null} */
  let failure = null;
  try {
    await Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`the setup ran past ${SETUP_LIMIT_MS / 1000} s`)), SETUP_LIMIT_MS);
      }),
    ]);
  } catch (error) {
    failure = String(/** @type {Error} */ (error)?.stack ?? error);
    results.push({ name, ok: false, seconds: seconds(), error: failure });
  } finally {
    clearTimeout(timer);
  }
  console.log(`SETUP-END ${failure === null ? 'PASS' : 'FAIL'} ${seconds()} s ${name}${failure === null ? '' : ` :: ${failure.split('\n')[0].slice(0, 220)}`}`);
  return failure === null;
}
```

The summary at the end of the page is MP16b's, with the title ``document.title = `${summary.textContent} - Generation
steps harness`;``.

**The phases.** `const phase = new URLSearchParams(location.search).get('phase') ?? 'main';` Every phase (main, keys
and narrow) starts with the setup, before its first check:

```js
const SETUP_NAME = '0 setup: the shared run (a Hard set on the 10 x 6 board, two puzzles) and its candidate card';
/** @type {Ctx} */
let SHARED = /** @type {any} */ (null);
let CANDIDATE = '';
const ready = await setup(SETUP_NAME, async () => {
  SHARED = await sharedRun();
  CANDIDATE = await candidateOf(SHARED);
});
```

Checks 1 to 5, 7, 8, K and N use `SHARED` as their `ctx` and `CANDIDATE` as "the candidate card"; no check calls
`sharedRun()` or `candidateOf()`. When `ready` is false the page runs no check and goes to its summary (the setup's
failure is its one result). Otherwise the main phase runs checks 1 to 5, 7 and 8, then `releaseShared()`, then 6, then
Part B (9 to 12) and 13; `?phase=keys` runs K only; `?phase=narrow` runs N only (the runner sets a 390 x 844 touch
viewport there). The page ends as MP16b's does: `if (sharedPromise !== null) { await releaseShared(); }`, then the
summary. A passing setup adds no result, so the counts stay 13 (main), 1 (keys) and 1 (narrow).

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
level Hard; quantity 2). The kind of each card comes from the state, `kindsOf(SHARED)`; the candidate card is the
setup's `CANDIDATE`. The setup's app (`SHARED`) serves checks 1 to 5, 7 and 8 (and K, N in their phases); check 6 mounts
its own after `releaseShared()` (`createGeneratorApp` finds its slots document-wide). The comment of `sharedRun`
becomes `/** The run that the setup makes and that checks 1 to 5, 7, 8, K and N share. */`.

1. **"1 section: under Pieces to place, the replay matches, every stage has a heading, cards have two buttons"**. Select
   the candidate card (`selectCard(SHARED, CANDIDATE)`), `waitSteps`. The section's `previousElementSibling` is
   `ul.detail-pieces` and its parent `section.puzzle-detail`; `h4.steps-title` reads `t('replay.title')` and its id is
   the table's `aria-labelledby`; `statusLines` equals `[t('replay.status.matched')]` and `data-result` is `matched`;
   the `data-stage` values of the `tbody.steps-group` elements cover 1 to 7; there is at least one `tr.steps-row`;
   `document.querySelector('button[data-action="replay"], [data-role^="replay-"]')` is null (the retired card button
   and every part of the retired dialog, named by their attributes, so the page itself stays clear of the removal
   check); every `li.puzzle-card` has exactly two child elements, `button.card-select` then `button.card-remove`; the
   section does not scroll sideways (`scrollWidth <= clientWidth + 1`) in the 1280 x 900 viewport.
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
/** @param {'matched' | 'incomplete' | 'mismatch' | 'unavailable'} status @param {string | null} reason */
const scriptedResult = (status, reason) => ({
  status,
  reason,
  stages: { set: 'replayed', candidate: status === 'incomplete' ? 'stopped' : status === 'mismatch' ? 'mismatch'
    : status === 'unavailable' ? 'unavailable' : 'replayed', final: status === 'matched' ? 'compared' : 'not-compared' },
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
12. **"12 incomplete, mismatch and unavailable: the status names the limit, the field or the reason; the last row is the
    stored puzzle"**. Each result in a section of its own (mounted and disposed as above), shown with `A`, then
    `data-phase="ready"` awaited:
    - `scriptedResult('incomplete', 'work')`: `data-result="incomplete"`, `statusLines`
      `[t('replay.status.incomplete', { reason: t('replay.limit.work') })]`, the stage rows of groups 4 to 6 have
      `data-mark="stopped"`;
    - `scriptedResult('mismatch', 'rating')`: `statusLines` `[t('replay.status.mismatch', { field:
      t('replay.field.rating') })]`, groups 4 to 6 `data-mark="notAvailable"`;
    - `scriptedResult('unavailable', 'no-record')` (stages 1 to 3 and the final step, as the engine replays a puzzle
      without its record; P-OD14 Q2 (a) and Q3 (a)): `data-result="unavailable"`, `statusLines`
      `[t('replay.status.unavailable'), t('replay.reason.no-record')]`, exactly one `tr.steps-row` (`data-index="0"`,
      `data-kind="final"`, `labelOf` `t('replay.row', { n: 1 })`), and the stage rows of groups 1 to 6 have
      `data-mark="notAvailable"` and the mark text `t('replay.notAvailable')`; after `chooseView(section, 'all')`, still
      that one row and those six marks.

    In all three, the final row's `td.steps-what` reads `t('replay.step.final.stored')`.
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

`tests/browser/rendering.js` (the `highlightedIds` check of MP16b) keeps its checks: the small boards use the same
option; only its function `check` changes ("The check instrumentation").

**The two expectations.** `tests/browser/generator-flow.js` lines 265-266 become `assert(qa(ctx, '.puzzle-card
a').length === 0 && qa(ctx, '.puzzle-card button').length === 2 * puzzles.length && qa(ctx, '.puzzle-card
button').every((b) => ['select', 'remove'].includes(b.dataset.action ?? '')), 'a card only has its select and remove
buttons');` and `tests/browser/acceptance.js` line 250 becomes `assert(qa(d, '.puzzle-card a').length === 0 && qa(d,
'.puzzle-card button').every((b) => ['select', 'remove'].includes(b.dataset.action ?? '')), 'the card only has its
select and remove buttons');` (keep each statement on the lines it uses today).

### The check instrumentation (six existing pages)

So that the runner's watchdog sees every check of GB-P5, the function `check` of six existing pages logs the start and
the end of each check, as `replay.js` already does. Only that function changes in these files: no assertion, result
entry, result count, phase filter, blocked check or summary changes, and a check that the phase filter skips logs
nothing.

- `tests/browser/rendering.js` (lines 46-57 at `0ed8800`, the JSDoc included), `tests/browser/generator-flow.js`
  (lines 21-32), `tests/browser/generator-editor.js` (lines 20-31) and `tests/browser/watchdog.js` (lines 28-39): the
  function becomes

  ```js
  /**
   * Runs one check between a CHECK-START and a CHECK-END console line, which the runner's watchdog reads (GB-P5).
   * @param {string} name
   * @param {() => void | Promise<void>} fn
   */
  async function check(name, fn) {
    console.log(`CHECK-START ${name}`);
    const started = performance.now();
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({ name, ok: false, error: String(/** @type {Error} */ (error)?.stack ?? error) });
    }
    const seconds = Math.round((performance.now() - started) / 100) / 10;
    console.log(`CHECK-END ${results[results.length - 1].ok ? 'PASS' : 'FAIL'} ${seconds} s ${name}`);
  }
  ```

- `tests/browser/acceptance.js` (lines 23-35): the function becomes (its `blocked` stays as it is: a blocked check runs
  nothing and logs nothing)

  ```js
  /**
   * Runs one check between a CHECK-START and a CHECK-END console line, which the runner's watchdog reads (GB-P5).
   * @param {string} id
   * @param {string} name
   * @param {() => unknown | Promise<unknown>} fn Returns optional evidence; throwing fails the check.
   */
  async function check(id, name, fn) {
    console.log(`CHECK-START ${id} ${name}`);
    const started = performance.now();
    try {
      const detail = await fn();
      results.push({ id, name, status: 'pass', detail });
    } catch (error) {
      results.push({ id, name, status: 'fail', detail: String(/** @type {Error} */ (error)?.message ?? error) });
    }
    const seconds = Math.round((performance.now() - started) / 100) / 10;
    console.log(`CHECK-END ${results[results.length - 1].status === 'pass' ? 'PASS' : 'FAIL'} ${seconds} s ${id} ${name}`);
  }
  ```

- `tests/browser/puzzle-code-acceptance.js` (lines 84-118): the line ``console.log(`CHECK-START ${name}`);`` moves from
  the start of the `try` block to just before the `try`, followed by `const started = performance.now();`; after the
  last line of the function, `generatorI18n.setLocale('en', document);`, add

  ```js
    const seconds = Math.round((performance.now() - started) / 100) / 10;
    console.log(`CHECK-END ${results[results.length - 1].ok ? 'PASS' : 'FAIL'} ${seconds} s ${name}`);
  ```

  so the end is logged after the check's cleanup. Its phase filters (`own`, `only`) stay before the start line.

`tests/browser/replay.js` keeps MP16b's `check` (it logs both lines and has its own 60 s timeout) and adds `setup`
("The frame").

### Running the pages (check-list §7; GB-P5)

Save the code block below verbatim as `tests/artifacts/MP18b/pages.mjs`. It is MP16b's runner (the code block "The
browser runner" of `tasks/difficulty-v3/MP16b-dialog-wiring-and-documents.md`, which MP17 used as it was) with the
**check watchdog** that SA2's cross-review of 2026-11-16 asked for: MP16b's runner bounds a whole page only (540 s), so
a check of more than a minute could pass. The differences, and nothing else:

- the header comment and `LIMIT_MS` (`CHECK` 60,000 ms, `SETUP` 240,000 ms);
- `connect(endpoint, onLog)` gives every console line of the page, whole, to `onLog` (`logs`, and so `lastLogs`, keep
  the first 300 characters of each line, as before);
- `createWatchdog(stop)`, one per run: `CHECK-START <name>` and `SETUP-START <name>` start a timer of their limit,
  `CHECK-END <PASS|FAIL> <seconds> s <name>` and `SETUP-END …` stop it and record `{ kind, name, result, seconds,
  pageSeconds }` (the runner's seconds and the page's) in `checks`. The run fails, and `stop` stops its Edge by PID at
  once, when a timer fires (`result` `TIMEOUT`), when either duration reaches the limit (the page's own 60 s timeout of
  `replay.js` included), when a start comes while another is open, or when an end does not match the open check (the
  same kind, and after `s ` exactly the open check's name, or for a `FAIL` that name followed by ` :: ` and the error;
  SA2's final review of 2026-11-16); it also fails, with Edge left to the cleanup, when a check or the setup is still
  open as the page ends, or when the page ran no check;
- `runPage(url, phase, out, watchdog)` races every CDP call of its loop against the watchdog (a late answer is
  dropped), stops polling at once when the watchdog fails, then skips the final screenshot and the viewport, and writes
  `browser.json` in every case that reaches its end, with `watchdog` (the reason, or null) and `checks`;
- the run loop creates the watchdog after Edge starts (its `stop` kills that Edge by PID only), gives it to `runPage`,
  disposes it in the cleanup, adds `watchdog` and `checks` to the row (a watchdog failure fails the row) and prints the
  number of checks and the longest in its PASS/FAIL line.

The ports, the 540 s page bound, the profile, the cleanup by PID, the evidence layout and the exit codes are MP16b's: it
serves the repository on port 8818 (`node tools/serve.mjs --port 8818 --prefix /pentomino/`), starts Edge for every run
with the throwaway profile `tests\artifacts\edge-MP18b\` and CDP port 9318, presses the trusted keys a page asks for,
emulates the 390 x 844 touch viewport in the narrow phase (with a coarse pointer: MP17's `puzzle-code-acceptance`
narrow run asserted it), saves the screenshots a page asks for, bounds every run at 540 s, stops Edge and the server by
PID, removes the profile (also on failure), and writes one evidence directory per page and phase (`browser.json`,
`page.png`, the screenshots) and `runs.json` with the PIDs. It refuses to start when a port is busy: report it and never
stop someone else's process. The pack author built this block from MP16b's, checked it with `node --check` and checked
`createWatchdog` on scripted console lines (a passing and a failing check, a check and a setup at their limits, a
page-reported limit, a start while a check is open, an end without a start, a check open when the page ends, a page
without checks; an end that names another check, which fails the run and stops Edge once, a longer name, a ` :: ` after
a `PASS`, an end of the other kind; matching names, matching `FAIL` names followed by ` :: ` and the error, and a
350-character name passed through `connect`, which `logs` keeps at 300 characters); it was not run against Edge (the
Sudoku gate held the machine). If it fails on this machine for a reason that is not a page's, stop with `QUESTION:` and
its output; never change its limits.

```js
// @ts-check
// Scratch browser runner of gate GB-P5 (git-ignored, tests/artifacts/MP18b/pages.mjs): MP16b's runner with a check
// watchdog. It serves the repository, starts a headless Edge with a throwaway profile for each run, opens one harness
// page per run over CDP (Node's fetch and WebSocket, no package), presses the trusted keys the page asks for
// (<html data-stage="key-<name>">, "Shift+" for a shifted key), saves the screenshots it asks for
// (data-stage="shot-<name>"), and writes the evidence of each page and phase to its own directory. The watchdog reads
// the page's console: "CHECK-START <name>" and "CHECK-END <PASS|FAIL> <seconds> s <name>" around each check (limit
// 60 s), "SETUP-START <name>" and "SETUP-END <PASS|FAIL> <seconds> s <name>" around a setup (limit 240 s); an end
// names the open check, and a FAIL may add " :: <error>". A check or a setup that reaches its limit, by this runner's
// clock or by the page's, or that starts while another is open, and an end that does not name the open check, fail the
// run and stop its Edge at once; one still open when the page ends, or a page that ran no check, fails the run.
// Run it from the repository root:
//   node tests/artifacts/<task>/pages.mjs --task <id> --http <port> --cdp <port> --evidence <dir> <page>[:<phase>] ...
// phase: main (1280 x 900, the default), keys (1280 x 900, "?phase=keys"), narrow (390 x 844 touch, "?phase=narrow").
// Exit 0 when every run passed, 1 when a run failed, 2 on a usage or start-up error (a busy port, no Edge).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const EDGE = join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
const RUN_MS = 540000;
/** The longest check and the longest setup of a page, in ms (check-list §7: a browser check ends within 1 minute). */
const LIMIT_MS = { CHECK: 60000, SETUP: 240000 };
/** @type {Record<string, { key: string, code: string, windowsVirtualKeyCode: number, text?: string }>} */
const KEYS = {
  Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
  Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
  Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 },
  Home: { key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 },
  End: { key: 'End', code: 'End', windowsVirtualKeyCode: 35 },
};
const PHASES = ['main', 'keys', 'narrow'];
const sleep = (/** @type {number} */ ms) => new Promise((done) => setTimeout(done, ms));

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: { task: { type: 'string' }, http: { type: 'string' }, cdp: { type: 'string' }, evidence: { type: 'string' } },
});
const runs = positionals.map((s) => {
  const [page, phase = 'main'] = s.split(':');
  return { page, phase };
});
if (!o.task || !/^\d+$/.test(o.http ?? '') || !/^\d+$/.test(o.cdp ?? '') || !o.evidence || runs.length === 0
  || runs.some((r) => !/^[a-z0-9-]+$/.test(r.page) || !PHASES.includes(r.phase))) {
  console.error('usage: pages.mjs --task <id> --http <port> --cdp <port> --evidence <dir> <page>[:main|keys|narrow] ...');
  process.exit(2);
}
const root = process.cwd();
if (!existsSync(join(root, 'tools', 'serve.mjs')) || !existsSync(EDGE)) {
  console.error('run it from the repository root, with Microsoft Edge installed at the usual place');
  process.exit(2);
}
const http = Number(o.http);
const cdp = Number(o.cdp);
const evidence = resolve(root, o.evidence);
const profile = join(root, 'tests', 'artifacts', `edge-${o.task}`);

/** True when something already answers on the port (then it is somebody else's: report it, never stop it). */
async function busy(/** @type {number} */ port) {
  try {
    await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch (error) {
    return error instanceof Error && error.name === 'TimeoutError';
  }
}

/**
 * One CDP connection: calls with a 30 s timeout, the page's errors and console lines (the first 300 characters of
 * each); every console line also goes, whole, to onLog.
 */
async function connect(/** @type {string} */ endpoint, /** @type {(line: string) => void} */ onLog = () => {}) {
  const socket = new WebSocket(endpoint);
  let serial = 0;
  /** @type {Map<number, { resolve: (v: any) => void, reject: (e: Error) => void, timer: any }>} */
  const pending = new Map();
  /** @type {any[]} */ const errors = [];
  /** @type {string[]} */ const logs = [];
  socket.addEventListener('message', (event) => {
    const m = JSON.parse(String(event.data));
    if (m.id !== undefined) {
      const item = pending.get(m.id);
      if (item === undefined) return;
      clearTimeout(item.timer);
      pending.delete(m.id);
      if (m.error) item.reject(new Error(JSON.stringify(m.error)));
      else item.resolve(m.result);
    } else if (m.method === 'Runtime.consoleAPICalled') {
      const line = m.params.args.map((/** @type {any} */ a) => a.value ?? a.description ?? '').join(' ');
      logs.push(line.slice(0, 300));
      onLog(line);
    } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Network.loadingFailed'
      || (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')
      || (m.method === 'Network.responseReceived' && m.params.response.status >= 400)) {
      errors.push(m);
    }
  });
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });
  const call = (/** @type {string} */ method, /** @type {object} */ params = {}) => new Promise((done, fail) => {
    const id = ++serial;
    const timer = setTimeout(() => {
      pending.delete(id);
      fail(new Error(`CDP timeout: ${method}`));
    }, 30000);
    timer.unref();
    pending.set(id, { resolve: done, reject: fail, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (/** @type {string} */ expression) => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`evaluation failed: ${expression.slice(0, 60)}`);
    return r.result.value;
  };
  return { call, evaluate, errors, logs, close: () => socket.close() };
}

/**
 * The watchdog of one run (see the header of this file).
 * @param {() => void} stop Stops the run's Edge by its PID.
 */
function createWatchdog(stop) {
  /** @type {Array<{ kind: 'CHECK' | 'SETUP', name: string, result: string, seconds: number, pageSeconds: number | null }>} */
  const checks = [];
  /** @type {{ kind: 'CHECK' | 'SETUP', name: string, started: number, timer: ReturnType<typeof setTimeout> } | null} */
  let open = null;
  /** @type {string | null} */
  let failure = null;
  /** @type {() => void} */
  let wake = () => {};
  /** @type {Promise<void>} Settles when the watchdog fails the run. */
  const stopped = new Promise((done) => {
    wake = () => done(undefined);
  });
  /**
   * @param {string} why
   * @param {boolean} kill Whether to stop Edge now (not when the page has already ended).
   */
  const fail = (why, kill) => {
    if (failure !== null) return;
    failure = why;
    if (kill) stop();
    wake();
  };
  /**
   * @param {string} result PASS or FAIL as the page logged it, or TIMEOUT.
   * @param {number | null} pageSeconds The seconds the page logged, null on TIMEOUT.
   */
  const close = (result, pageSeconds) => {
    if (open === null) return;
    const { kind, name, started, timer } = open;
    open = null;
    clearTimeout(timer);
    const seconds = Math.round((Date.now() - started) / 100) / 10;
    checks.push({ kind, name, result, seconds, pageSeconds });
    const limit = LIMIT_MS[kind] / 1000;
    if (result === 'TIMEOUT' || seconds >= limit || (pageSeconds ?? 0) >= limit) {
      fail(`${kind} "${name}" reached its limit of ${limit} s (runner ${seconds} s, page ${pageSeconds ?? '-'} s)`, true);
    }
  };
  return {
    checks,
    stopped,
    failure: () => failure,
    /** @param {string} line One console line of the page. */
    onLog(line) {
      if (failure !== null) return;
      const start = /^(CHECK|SETUP)-START (.+)$/.exec(line);
      const end = /^(CHECK|SETUP)-END (PASS|FAIL) (\d+(?:\.\d+)?) s /.exec(line);
      if (start !== null) {
        if (open !== null) {
          fail(`${open.kind} "${open.name}" has no end (${start[1]} "${start[2]}" started)`, true);
          return;
        }
        const kind = /** @type {'CHECK' | 'SETUP'} */ (start[1]);
        open = { kind, name: start[2], started: Date.now(), timer: setTimeout(() => close('TIMEOUT', null), LIMIT_MS[kind]) };
      } else if (end !== null) {
        const tail = line.slice(end[0].length);
        const matchesName = open !== null && (tail === open.name
          || (end[2] === 'FAIL' && tail.startsWith(`${open.name} :: `)));
        if (open === null || open.kind !== end[1] || !matchesName) {
          fail(`an end without its matching start: ${line.slice(0, 160)}`, true);
          return;
        }
        close(end[2], Number(end[3]));
      }
    },
    /** The page has ended: a check or a setup still open has no end, and a page must have run a check. */
    finish() {
      if (open !== null) {
        clearTimeout(open.timer);
        const { kind, name } = open;
        open = null;
        fail(`${kind} "${name}" has no end`, false);
      } else if (!checks.some((c) => c.kind === 'CHECK')) {
        fail('the page ran no check', false);
      }
    },
    dispose() {
      if (open !== null) clearTimeout(open.timer);
    },
  };
}

/** Opens one page in the running Edge and follows it to its final data-result, unless the watchdog stops the run. */
async function runPage(/** @type {string} */ url, /** @type {string} */ phase, /** @type {string} */ out,
  /** @type {ReturnType<typeof createWatchdog>} */ watchdog) {
  mkdirSync(out, { recursive: true });
  const base = `http://127.0.0.1:${cdp}`;
  const info = await (await fetch(`${base}/json/version`)).json();
  const target = await (await fetch(`${base}/json/new?about:blank`, { method: 'PUT' })).json();
  const page = await connect(target.webSocketDebuggerUrl, watchdog.onLog);
  const started = Date.now();
  /** @type {any} */ let final = null;
  /** @type {any} */ let viewport = null;
  /** @type {string[]} */ const pressed = [];
  /** @type {string[]} */ const shots = [];
  let timedOut = true;
  let evaluationErrors = 0;
  const stopped = () => watchdog.failure() !== null;
  /** A CDP answer, or undefined as soon as the watchdog stops the run (a late answer or error is dropped). */
  const until = (/** @type {Promise<any>} */ answer) => {
    answer.catch(() => {});
    return Promise.race([answer, watchdog.stopped.then(() => undefined)]);
  };
  try {
    for (const domain of ['Page', 'Runtime', 'Log', 'Network']) await page.call(`${domain}.enable`);
    await page.call('Emulation.setFocusEmulationEnabled', { enabled: true });
    if (phase === 'narrow') {
      await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await page.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    } else {
      await page.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    }
    await page.call('Page.navigate', { url });
    while (Date.now() - started < RUN_MS && !stopped()) {
      try {
        const polled = await until(page.evaluate('(() => { const d = document.documentElement.dataset; return { result: d.result ?? null, '
          + 'stage: d.stage ?? null, summary: d.summary || document.querySelector("#summary")?.textContent || "" }; })()'));
        if (stopped()) break;
        final = polled;
        evaluationErrors = 0;
      } catch (error) {
        // A navigation can replace the context between two polls: retry, but not forever.
        if (++evaluationErrors > 50) throw error;
        await sleep(100);
        continue;
      }
      const stage = final?.stage;
      if (typeof stage === 'string' && stage.startsWith('key-') && !stage.endsWith('-done')) {
        const name = stage.slice(4);
        const shift = name.startsWith('Shift+');
        const k = KEYS[shift ? name.slice(6) : name];
        if (k === undefined) throw new Error(`the page asked for an unknown key: ${name}`);
        const modifiers = shift ? 8 : 0;
        const typed = k.text !== undefined && !shift;
        const key = { modifiers, key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode };
        await until(page.call('Input.dispatchKeyEvent', { type: typed ? 'keyDown' : 'rawKeyDown', ...key, ...(typed ? { text: k.text } : {}) }));
        await until(page.call('Input.dispatchKeyEvent', { type: 'keyUp', ...key }));
        if (stopped()) break;
        pressed.push(name);
        await until(page.evaluate(`document.documentElement.dataset.stage = ${JSON.stringify(`${stage}-done`)}`));
        continue;
      }
      if (typeof stage === 'string' && stage.startsWith('shot-') && !stage.endsWith('-done')) {
        const image = await until(page.call('Page.captureScreenshot', { format: 'png' }));
        if (stopped()) break;
        writeFileSync(join(out, `${stage.slice(5)}.png`), Buffer.from(image.data, 'base64'));
        shots.push(stage.slice(5));
        await until(page.evaluate(`document.documentElement.dataset.stage = ${JSON.stringify(`${stage}-done`)}`));
        continue;
      }
      if (final?.result === 'pass' || final?.result === 'fail') {
        timedOut = false;
        break;
      }
      await sleep(100);
    }
    if (stopped()) {
      // Edge is already stopped: no screenshot, no viewport; the run did not reach the page bound.
      timedOut = false;
    } else {
      watchdog.finish();
      const image = await page.call('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(out, 'page.png'), Buffer.from(image.data, 'base64'));
      viewport = await page.evaluate('({ w: innerWidth, h: innerHeight, coarse: matchMedia("(pointer: coarse)").matches })');
    }
  } finally {
    page.close();
  }
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  const failure = watchdog.failure();
  const pass = failure === null && !timedOut && final?.result === 'pass' && page.errors.length === 0;
  writeFileSync(join(out, 'browser.json'), JSON.stringify({
    browser: info.Browser, url, phase, viewport, final, timedOut, seconds, pressed, shots, errors: page.errors,
    watchdog: failure, checks: watchdog.checks, lastLogs: page.logs.slice(-50),
  }, null, 2));
  return { pass, seconds, final, timedOut, errors: page.errors.length, pressed: pressed.length, logs: page.logs.slice(-5) };
}

if ((await busy(http)) || (await busy(cdp))) {
  console.error(`port ${http} or ${cdp} is in use by another process: report it (never stop it)`);
  process.exit(2);
}
mkdirSync(evidence, { recursive: true });
const server = spawn(process.execPath, ['tools/serve.mjs', '--port', String(http), '--prefix', '/pentomino/'], { cwd: root, stdio: 'ignore' });
console.log(`server PID ${server.pid}`);
/** @type {object[]} */ const rows = [];
let failed = 0;
try {
  for (const run of runs) {
    const query = run.phase === 'main' ? '' : `?phase=${run.phase}`;
    const url = `http://127.0.0.1:${http}/pentomino/tests/browser/${run.page}.html${query}`;
    rmSync(profile, { recursive: true, force: true });
    const edge = spawn(EDGE, ['--headless=new', '--disable-extensions', '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${cdp}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
      'about:blank'], { stdio: 'ignore' });
    const exited = new Promise((done) => edge.once('exit', done));
    // The watchdog stops this run's Edge by its PID, never another process.
    const watchdog = createWatchdog(() => {
      if (edge.exitCode === null && edge.signalCode === null) edge.kill();
    });
    /** @type {any} */ let row = { page: run.page, phase: run.phase, edgePid: edge.pid, pass: false };
    try {
      let ready = false;
      for (let i = 0; i < 80 && !ready; i += 1) {
        try {
          const a = await fetch(`http://127.0.0.1:${http}/pentomino/tests/browser/${run.page}.html`);
          const b = await fetch(`http://127.0.0.1:${cdp}/json/version`);
          ready = a.ok && b.ok;
        } catch {
          // not yet
        }
        if (!ready) await sleep(250);
      }
      if (!ready) throw new Error('the server or Edge did not start');
      row = { ...row, ...(await runPage(url, run.phase, join(evidence, run.page, run.phase), watchdog)) };
    } catch (error) {
      row.error = error instanceof Error ? error.message : String(error);
    } finally {
      watchdog.dispose();
      /** @type {any} */ let browser = null;
      try {
        const info = await (await fetch(`http://127.0.0.1:${cdp}/json/version`)).json();
        browser = await connect(info.webSocketDebuggerUrl);
        browser.call('Browser.close').catch(() => {});
      } catch {
        // already gone
      }
      await Promise.race([exited, sleep(5000)]);
      if (edge.exitCode === null && edge.signalCode === null) edge.kill();
      await Promise.race([exited, sleep(5000)]);
      browser?.close();
      for (let i = 0; i < 10 && existsSync(profile); i += 1) {
        try {
          rmSync(profile, { recursive: true, force: true });
        } catch {
          await sleep(500);
        }
      }
    }
    row.watchdog = watchdog.failure();
    row.checks = watchdog.checks;
    if (row.watchdog !== null) row.pass = false;
    if (!row.pass) failed += 1;
    rows.push(row);
    const summary = String(row.final?.summary ?? '').replace(/\s+/g, ' ').slice(0, 160);
    const longest = watchdog.checks.reduce((most, c) => Math.max(most, c.seconds, c.pageSeconds ?? 0), 0);
    console.log(`${row.pass ? 'PASS' : 'FAIL'} ${run.page} [${run.phase}] ${row.seconds ?? '-'} s, result ${row.final?.result ?? '-'}`
      + `${row.timedOut ? ' (timed out)' : ''}, "${summary}", errors ${row.errors ?? '-'}, keys ${row.pressed ?? 0}`
      + `, checks ${watchdog.checks.length} (longest ${longest} s), Edge PID ${edge.pid}`
      + `${row.watchdog ? `, watchdog: ${row.watchdog}` : ''}${row.error ? `, runner error: ${row.error}` : ''}`);
    if (!row.pass) for (const line of row.logs ?? []) console.log(`  log: ${line}`);
  }
} finally {
  server.kill();
  console.log(`server PID ${server.pid} stopped; profile ${existsSync(profile) ? 'NOT removed' : 'removed'}`);
}
writeFileSync(join(evidence, 'runs.json'), JSON.stringify({ server: server.pid, runs: rows.map(({ logs, ...r }) => r) }, null, 2));
process.exitCode = failed === 0 ? 0 : 1;
```

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

A run passes with `data-result="pass"`, no CSP violation, no uncaught error and no watchdog failure (the runner's
`PASS` line; `watchdog` null in `browser.json`); `acceptance.html` with its four known blocked checks only (A1, B1, B2,
B3: they need a person or a device). At MP17 (`final-2026-11-15.md` §4) these pages took: `rendering` 0.8 s,
`generator-flow` 34.8 s, `generator-editor` 2.2 s, `acceptance` 10.6 s, `watchdog` 6.8 s, `puzzle-code-acceptance`
37.9 s; `generator-editor`, `watchdog` and `puzzle-code-acceptance` mount the Generator, carried MP16b's closed dialog,
and now carry the section: they pass with no change of theirs but the check instrumentation. The screenshots for the
pull request are `tests/artifacts/MP18b/pages/01/replay/main/steps-wide.png` and
`tests/artifacts/MP18b/pages/03/replay/narrow/steps-narrow.png`.

### The record (`docs/difficulty-v3/steps-table-<date>.md`)

English, CRLF, no BOM, relative links only. Sections:

1. **Header**: the date, the code revision (`git rev-parse --short HEAD`, MP18a's commit), the base `0ed8800`, the Node
   version, the Edge version (`browser.json`), the gate's announcement, start and end, the machine time and the lock
   waits.
2. **D35**: the outputs of the two guard commands (nothing) and the statement that no file under `core/`, `tools/`,
   `player/` or `tests/fixtures/` differs from `0ed8800`, so no rating, puzzle or generated value changed.
3. **GB-P5**: a table of the nine runs (page, phase, result, summary, seconds, keys pressed, CSP and uncaught errors,
   the number of checks and the longest check's seconds (runner and page), the watchdog (none), server PID, Edge PID,
   lock wait) from the `runs.json` files; the blocked checks of `acceptance.html`; the statement that every check of
   every run ended under 60 s and the setups of `replay.html` under 240 s (the `checks` of the nine `browser.json`), that
   every server and Edge was stopped by PID and the profile removed; every failing run and rerun with its reason and fix
   (evidence under `pages/earlier/`).
4. **The checks of `replay.html`**: one row per check (the setup, 1–13, K, N) with its result and the runner's and the
   page's seconds (`checks` of `browser.json`), and the viewport of the narrow run (`browser.json` `viewport`, coarse
   pointer included).
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
   > puzzle shown before comes back at once. A puzzle whose steps cannot all be replayed (an imported puzzle, one made
   > by an earlier version, or one made on a piece set saved by an earlier version) keeps the section, which says that
   > its steps are not available and shows the stored puzzle with its score. Packs written by this version carry a small
   > optional provenance record (`generation.setOrigin`, `generation.made`) for it. A replay is bounded by work, not by
   > a clock; one measurement on a 20 x 18 Nightmare puzzle took 1.7 seconds.

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
      - **Puzzles whose steps cannot all be replayed** (imported, made by an earlier version, or made on a piece set saved by an earlier version): the section stays and says that the steps are not available, with one row for the stored puzzle and its score.
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
      `acceptance` (16 checks, 4 blocked), `watchdog` and `puzzle-code-acceptance`), with no CSP violation, no
      uncaught error and every check under a minute (the runner's check watchdog); the quick set passes with <count>
      tests.`` (the developer fills `<a>`, `<b>`, `<c>`, `<k>` and `<count>` from the gate.)
   7. In "Known limitations", **Interface**: delete the bullet `**Phones:** Generation Steps cannot be opened below
      768 px, where the Generator shows no cards.`
   8. In "Commits by task": add the row `| MP18a, MP18b | <MP18a commit>, <MP18b commit> | Generation steps table in
      step 3 (P-OD14) |` after the MP17 row, and add the two pack commits of P-OD14 (`2daf57c`, the pack, and the
      commit "difficulty-v3: MP18a/MP18b amendments after SA2 cross-review", `<commit>`) to the row "Pack and
      decisions", whose subject becomes `Owner decisions P-OD1 to P-OD14, pack reviews and amendments`.

### Documents

- `docs/design-detail.md` §13.3 item 25: after `step 3 shows one puzzle at a time with ◀ ▶` add `, with its Generation
  steps under the pieces to place`.
- `docs/design-detail.md` §13.3 item 26: replace the whole item with:

```markdown
26. `tests/browser/replay.html` (strict policy; `?phase=keys` for the check that needs trusted keys, `?phase=narrow` for the 390 px touch viewport) tests Generation steps (§6.12, §10.5, §11.11). Part A runs the real Generator with its real workers (a Hard set on the 10 × 6 board with a fixed seed, two puzzles) and checks: the section right after "Pieces to place", the replay matching the stored puzzle, a heading for every stage, and cards with their select button and ✕ only (no card button, no dialog); the rows of Key steps (step numbers, the stage headings, the final row's pieces equal to the puzzle's clues, the rules by name and never as codes, the score in band and equal to the stored score); opening a layout step (its small board with the lifted pieces highlighted, "No score for this step.") and then a rated step (the first closes; a score table with a caption and row headers), with the focus kept on the step's button and the board of the puzzle unchanged; the two views (more rows in Every step, an opened step kept only when shown, no status change); the view kept for another puzzle and a puzzle shown again appearing at once from the cache; an imported puzzle (the section stays, with its reason, stages 1 to 6 not available and one row with the stored score); the language switch with a step open (the texts, the same step open, the focus kept); and the set's calibration card (stage 4 with "No steps were needed" and no rows, highlights only in stages 5 and 6). Part B mounts the section alone with scripted replays: another puzzle aborting the replay's own signal and the cache (no second run), a new generation (the replay submitted again, the waiting text), the worker-unavailable message with **Try again**, and the incomplete, mismatch and unavailable statuses (an unavailable result that kept some of its stages shows its stored puzzle alone, in one row). Every phase begins with a setup that makes the shared run and finds its candidate card; the setup and every check log their start and end, which the gate's runner bounds (240 s and 60 s). The keys phase presses trusted keys over CDP: Tab and Shift+Tab from one step button to the next, Enter opening and closing a step with the focus kept, and Tab passing an opened step's board. The narrow phase checks the phone layout at 390 px with a coarse pointer: the section after the pieces to place, the rows stacked with their column names, the table roles kept, no sideways scrolling, the board above the score table and 36 px targets. It asserts that there was no policy violation or uncaught error.
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
| `tests/browser/replay.html`, `tests/browser/replay.js` | rewritten: the setup, Parts A and B, checks 1–13, K and N |
| `tests/browser/generator-flow.js`, `tests/browser/acceptance.js` | the card's buttons `select` and `remove` |
| `tests/browser/rendering.js`, `generator-flow.js`, `generator-editor.js`, `acceptance.js`, `watchdog.js`, `puzzle-code-acceptance.js` | the check instrumentation only (their function `check`) |
| MP18a's files | only fixes proven by a GB-P5 page, each listed with its failing check |
| `docs/design-detail.md` | §13.3 items 25 and 26 |
| `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | "Browser test pages": the narrow phase |
| `docs/difficulty-v3/steps-table-<date>.md` | new: the record |

Exclusive ownership while this task runs: the files above; scratch under `tests/artifacts/MP18b/` (the runner
`pages.mjs`, the lock helper `dv3-lock.ps1` and the evidence) and the Edge profile `tests\artifacts\edge-MP18b\`.

## Implementation steps

1. The D35 guard; the page (the setup, Parts A and B, K, N), the two expectations and the check instrumentation of the
   six pages.
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
| MP18b-B04 | A puzzle whose steps cannot be replayed keeps the section, says why its steps are not available and shows its stored puzzle and score in one row, also when the engine replayed some of its stages (Q2 (a), Q3 (a)) | checks 6, 12 |
| MP18b-B05 | The replay never disturbs a generation: another puzzle cancels only the replay, a new generation submits it again, a failure offers Try again, a puzzle shown before is not replayed again | checks 5, 9–11 |
| MP18b-B06 | The cards have their select button and ✕ only; the dialog is gone | check 1; `generator-flow`; `acceptance` |
| MP18b-B07 | The texts follow the language, with the step kept open | check 7 |
| MP18b-B08 | The release notes and PR #10's description have their amendments, and MP17's named item about phones is closed | the record §6–§8 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP18b-T01 | GB-P5: the nine runs pass (`replay` main 13 checks, keys 1, narrow 1, each after its setup; `rendering`; `generator-flow`; `generator-editor`; `acceptance` with its four known blocked checks only; `watchdog`; `puzzle-code-acceptance` main), no CSP violation, no uncaught error, no watchdog failure: every check of every run logged its start and end and ended under 60 s by the runner's clock and the page's, the setups under 240 s; one evidence directory per page and phase | the record §3 and §4; the `checks` and `watchdog` of the nine `browser.json`; the nine `runs.json` |
| MP18b-T02 | Check K pressed trusted keys only (the runner's `pressed` list has the 8 keys); check N ran in the 390 x 844 viewport with a coarse pointer | `browser.json` of runs 2 and 3 |
| MP18b-T03 | Only the two listed expectations changed among the assertions of existing pages; the six pages of "The check instrumentation" changed only in their function `check`, as written there; the runner is this file's code block; every fix of MP18a's files is listed with its failing check | diff; review |
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

The browser checks of "The browser page" (the setup of each phase, then checks 1–13 in the main phase, K in the keys
phase, N in the narrow phase) and the existing checks of the other GB-P5 pages, each logged for the watchdog. No Node
test changes in this task.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the gate record (pages, phases, results, durations, the number of
  checks and the longest check of each run, the watchdog's verdict, PIDs stopped, lock waits), every change to an
  existing page and every fix of MP18a's files with its failing check, the D35 guard, the removal check and the test
  counts, and the path of the record.
- Handoff to the orchestrator: the record's §7 (release notes) and §8 (PR #10 amendments, with the two screenshots to
  upload); P-OD14 complete.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (orchestrator check; outside the analyst review set). Gate GB-P5 passed at the first attempt on all nine runs; no question |
| Start | 2026-11-16 12:01:05 (+07:00), base `3d36592` |
| End | About 12:25 gate, record and checks; orchestrator re-check and commit at about 12:28 |
| Duration | About 24 min developer; nine browser invocations (7.3-47.6 s each) and the quick set through `Invoke-Dv3Timed`, lock wait 5 s in the gate and 215.3 s for the quick set (the sudoku repository held the slot) |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (orchestrator) |
| Token usage | 91 model calls; 16,895,498 input tokens (16,627,017 cache reads); 107,044 output tokens (developer) |
| AI credits | about 340 (developer) |
| Verification | `tests/browser/replay.html` and `replay.js` rewritten for the inline section (checks 1-13, keys and 390 px narrow phases); `generator-flow.js` and `acceptance.js` changed only in the two card-button expectations; the `check` function of six pages instrumented with `CHECK-START`/`CHECK-END` only; design-detail §13.3 items 25-26 and both developer guides; record `docs/difficulty-v3/steps-table-2026-11-16.md` (release-notes amendment §7, PR #10 edits §8). **GB-P5:** `replay` main 13/13, keys 1/1 (8 trusted keys), narrow 1/1 (390 x 844, coarse pointer); `rendering` 18/18; `generator-flow` 21/21; `generator-editor` 29/29; `acceptance` 16 checks, 4 blocked (A1, B1, B2, B3); `watchdog` 5/5; `puzzle-code-acceptance` 24 checks, no worker error; watchdog `null` in all nine, no CSP violation or uncaught error, longest check 17.9 s, every server and Edge stopped by PID. Quick set 1,485/1,485; `npm run -s check` OK; D35 guard and removal check empty. Orchestrator: locked quick set 1,485/1,485 (34.7 s), `npm run -s check` OK, D35 guard empty, `tasks/` untouched; the two screenshots inspected |
| Acceptance | MP18b-B01 to B08 and T01 to T05 met (developer's mapping to the checks of `replay.html` and the record §3-§8) |
| Issues & resolutions | None blocking. Deviations: the gate's announcement was taken from the dispatch brief (no mid-run channel); `replay.html`'s `<h1>` reads "Generation steps harness"; the K and N check names were the developer's choice. The first quick-set run's helper line was lost and the run repeated for the record (both 1,485/1,485). MP17's named item "Generation Steps on phones" is closed (record §6) |
| Handoff | Pentomino difficulty-v3 with the Generation steps table is complete. The orchestrator pushes `rating-v3` and applies the record's §8 edits, with the two screenshots, to PR #10's description; merging is the owner's |
