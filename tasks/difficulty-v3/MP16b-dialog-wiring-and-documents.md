# MP16b — Generation Steps: card button, wiring, browser page (GB-P4) and documents

| Header | Value |
|---|---|
| ID | MP16b (second part of the report's MP16) |
| Depends on | MP16a (accepted and committed: `createReplayDialog`, `replay-model.js`, `highlightedIds`, the locale keys) |
| Estimated size | Medium: about 500–700 changed lines (wiring about 60, the browser page about 300, rendering check about 30, documents about 120 in both languages); about 50–60 minutes plus the gate |
| Owner role | Generator UI |
| Milestone | M9 — Generation Steps |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-31 (the button inside `li.puzzle-card`, the browser page), RES-32 (documents of MP13-MP16), §5.3 GB-P4; clarification SA2-Q-P10 (a) (plan author); check-list §7 |
| Gates owned | **GB-P4**: `tests/browser/replay.html` and the affected pages (`rendering.html`, `generator-flow.html`, `acceptance.html`), headless Edge, ports 8816 and 9316 |
| Implementation status | Not started |

## Goal & business context

This task makes Generation Steps reachable: every puzzle card of the Generator gets a "How it was made" button that
opens the dialog of MP16a for that puzzle. It proves in a real browser that the dialog works end to end — open, step,
play, slider, keyboard, closing, unavailable steps, the incomplete and mismatch states and the language switch — and
that the card's selection, removal and keyboard order are unchanged. It also finishes the living documents of the
provenance and replay work (MP13a to MP16b) for users and developers, in English and Vietnamese.

## Scope

### In scope

- `generator/ui/puzzle-panel.js`: the third card button and its `onReplay` option.
- `generator/app.js`: the replay dialog, the `onReplay` wiring, language refresh and disposal.
- `generator/state.js`: the pure helper `replaySourceOf(state, puzzleId)`.
- `generator/ui/replay-dialog.js` and `generator/ui/replay-model.js`: **only** fixes that the browser page shows to
  be needed (each listed in the reply with the failing check).
- Tests: `tests/generator-state.test.js` (the helper), `tests/browser/replay.html` and `tests/browser/replay.js`
  (new), `tests/browser/rendering.js` (the highlight check), and existing browser pages only where the third button
  changes an expectation (each change listed).
- Documents: `docs/design-detail.md` §10.5; `docs/design-brief.md`; `USERGUIDE.md`, `USERGUIDE.vn.md`;
  `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`; `README.md` (one feature line).

### Out of scope

- The engine, the replay, the client and the protocol (report a defect instead). The Player.
- New locale keys beyond MP16a's list, unless a check proves one missing (then add it in both packs and list it).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Browser pages run **only** in gate GB-P4, announced first; each check logs its start and finishes within 1 minute;
  each page within 10 minutes.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports or
  `docs/difficulty-v3/`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no absolute path in a document.

## Inputs & context

Anchors are at HEAD `60575a4`; MP09a2, MP10b2 and MP13b edited `generator/app.js`, `generator/state.js` and
`generator/ui/puzzle-panel.js`: find moved lines by the quoted text.

### The card (`generator/ui/puzzle-panel.js`)

`createCard(id, cellPx)` (line 287) builds

```js
const item = /** @type {HTMLLIElement} */ (el('li', { className: 'puzzle-card', dataset: { puzzleId: id } }, select, remove));
```

with `select` = `button.card-select` (heading, rating, clue count, certificate, thumbnail) and `remove` =
`button.card-remove`; their listeners follow (lines 298-310: selection, and removal that keeps the focus on the next
`.card-remove`, else the previous, else the New puzzle button).

Change (RES-31, SA2-4 JC13): when the panel's options have `onReplay`, create `replay` = `button.card-replay
ghost-small` (`type="button"`, `data-action="replay"`, text `t('replay.button')`, `aria-label` =
`t('replay.button.aria', { title })` with the card's displayed title, kept current where the heading text is set) and
build the item as `el('li', …, select, replay, remove)`: a **third button inside the same `li`**, not inside
`button.card-select` and not a direct child of the list. Its click calls `onReplay(id, replay)`. Selection, removal,
focus return and the Tab order (select, How it was made, remove) are otherwise unchanged; the removal focus logic still
uses `.card-remove`. Without `onReplay` the card is exactly as before. `mountPuzzlePanel(host, options)` (line 156)
documents the new option `onReplay?: (puzzleId: string, opener: HTMLElement) => void`. Style the button in
`generator/generator.css` only if MP16a's styles do not cover `.card-replay` (list the change).

### The app (`generator/app.js`)

- After the client is created (line 120: `const client = options.client ?? createGenerationClient(…)`): when
  `typeof client.replayPuzzle === 'function'`, create `replayDialog = createReplayDialog({ host: doc.body, t, closeKey:
  'replay.close', run: (source, signal) => client.replayPuzzle(source, { signal }) })`; otherwise no dialog and no
  `onReplay` (scripted test clients keep today's cards).
- Pass `onReplay: (puzzleId, opener) => { const source = replaySourceOf(store.getState(), puzzleId); if (source !==
  null) replayDialog.open(source, opener); }` to `mountPuzzlePanel` (line 139).
- In the language-change handler (`const unsubscribeLanguage = onChange(() => { … importDialog?.refresh(); … })`,
  line 302), call `replayDialog?.refreshTexts()`; in `destroy()` (line 400), `replayDialog?.dispose()`.

### The source (`generator/state.js`)

```js
/**
 * What Generation Steps needs for one listed puzzle (RES-27, RES-29), or null without a set or that puzzle.
 * @param {GeneratorState} state
 * @param {string} puzzleId
 * @returns {{ set: PieceSet, puzzle: Puzzle, setOrigin: SetOrigin | null, made: Made | null } | null}
 */
export function replaySourceOf(state, puzzleId)
```

`made` = `state.puzzleMade[puzzleId] ?? null` (own property only); `setOrigin` = `state.setOrigin`.

### The browser page (`tests/browser/replay.html`, `tests/browser/replay.js`)

Copy the structure of `tests/browser/generator-flow.html` / `generator-flow.js` (same CSP meta, `common.css` and
`generator.css`, the `check`, `assert`, `equal`, `waitFor`, `h`, `memoryStorage` and `mountApp` helpers, a sandbox
section). Each check logs `CHECK-START <name>` with `console.log` before it runs and must finish within 60 s; at the
end the page sets `data-result` (`pass` or `fail`) and `data-summary` (`<passed>/<total>`) on `<html>`, like the pages
of `tasks/regenerate-puzzle/check-list.md` §7.

Part A — the real Generator with real workers (`mountApp` with a fixed `random` seed; the 10 x 6 board; level Hard;
quantity 2):

1. "open": make a set and two puzzles; click the first card's `button.card-replay`; the dialog
   (`[data-role="replay-dialog"]`) is open, the focus is on its close control, the status line reaches
   `replay.status.matched` text within 60 s, the stage list shows seven stages.
2. "step": Next and Previous change the step sentence and the slider value; at stage 4 the board has a highlighted
   piece (`[data-highlighted="true"]`) for a `retile` step that lifted pieces.
3. "play": Play advances the slider at least three steps, the play button has `aria-pressed="true"` while playing;
   Pause stops it; the live region text did not change during playback (compare before Play and before Pause).
4. "slider": setting the slider to the last value shows the final step (stage 7) and its score table with a Total
   equal to the card's score.
5. "keyboard": Tab moves through the controls in visual order; Escape closes the dialog; the focus returns to the
   card's `button.card-replay`.
6. "card": the card's `li.puzzle-card` has exactly three buttons in the order `card-select`, `card-replay`,
   `card-remove`; `button.card-replay` is not inside `button.card-select`; selecting and removing a card still work
   and removal still moves the focus to the next `.card-remove`.
7. "unavailable": import the code of the Player sample's first puzzle (G1 of `tests/fixtures/puzzlecode-v1.json`)
   through the Import puzzle dialog; its card's replay shows "Steps not available for this puzzle." for stages 1 to 6
   and the stored puzzle at stage 7; status `replay.status.unavailable`.
8. "language": with the dialog open, switch the language to Vietnamese with `setLocale('vi')` of `generator/i18n.js`
   (the harness has no language buttons); the dialog title, controls and status use the Vietnamese texts of
   `generator/locale.vi.js`; switch back with `setLocale('en')`.

Part B — the dialog alone (`createReplayDialog` on the page with a scripted `run`):

9. "incomplete": `run` resolves a result with `status: 'incomplete'`, `reason: 'work'` and three steps plus the final:
   the status line names the work limit, and the final step's sentence is the "stored puzzle" one, not "generated".
10. "mismatch": `status: 'mismatch'`, `reason: 'rating'`: the status line names the rating; the final step is the
    "stored puzzle" one.
11. "cancel": `run` returns a promise that never settles; closing the dialog aborts the signal given to `run` (record
    `signal.aborted`) and nothing else; a `run` that rejects with `PoolAbortError('cancelled')` while open shows the
    interrupted message; `PoolError('worker-unavailable')` shows the worker message.

`tests/browser/rendering.js` (one check): "highlighted pieces": render the page's existing pack model with
`highlightedIds: ['C']`: the group of piece C has `data-highlighted="true"` and contains a `.pm-highlight` path; the
same model without `highlightedIds` has no `.pm-highlight` in the SVG.

### Running the pages (check-list §7)

Headless Microsoft Edge through CDP with the native client and the procedure of `tasks/regenerate-puzzle/check-list.md`
§7; server `node tools/serve.mjs --port 8816 --prefix /pentomino/`; CDP port 9316; throwaway profile
`tests\artifacts\edge-MP16b\`. Record the server and browser PIDs, stop them by PID and remove the profile
afterwards, also on failure; if a port is busy, report it and never stop someone else's process. Pages, one at a
time:

```text
http://127.0.0.1:8816/pentomino/tests/browser/replay.html
http://127.0.0.1:8816/pentomino/tests/browser/rendering.html
http://127.0.0.1:8816/pentomino/tests/browser/generator-flow.html
http://127.0.0.1:8816/pentomino/tests/browser/acceptance.html
```

Announce the gate in your reply plan ("GB-P4: four pages, about 10 minutes in total"): the Sudoku repository runs in
parallel on the same machine; never two heavy runs at once: start only when the orchestrator says the machine is free.
`tests/browser/acceptance.html` reported "16 checks, 4 blocked" at the regenerate-puzzle release (blocked checks need
a physical device): the same blocked checks are expected; any new blocked or failed check is reported.

### Documents (RES-32, MP13-MP16 row; EN and VI in the same task)

- `docs/design-detail.md` §10.5 "Step 3: Create puzzles" (line 2170 at HEAD): the "How it was made" button on each
  card, the dialog (link §6.12 and §11.11), what "Steps not available for this puzzle" means (imported puzzles, sets or
  puzzles made by an older version, completion-pass puzzles, an overflowing record).
- `docs/design-brief.md`: the Generator's feature list gains Generation Steps in one or two sentences.
- `USERGUIDE.md` (Generator part, line 41 at HEAD) and `USERGUIDE.vn.md` (line 40): a short subsection "How a puzzle
  was made": open it from a card, the two views (key steps, every step), Play and the slider, the score table, and when
  steps are not available.
- `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` "Code layout" (line 91 at HEAD): `core/engine/replay.js`,
  `generator/ui/replay-model.js`, `generator/ui/replay-dialog.js`, `tests/browser/replay.html`, and the
  `--replay-case` mode of `tools/record-fixtures.mjs` (MP13b).
- `README.md` "Features" (lines 13-24): one line, for example "Generation Steps: replay how the generator made a
  puzzle, step by step, with its score table."

## Files to create/modify

| File | Change |
|---|---|
| `generator/ui/puzzle-panel.js` | the third button, `onReplay` |
| `generator/app.js` | the dialog and its wiring |
| `generator/state.js` | `replaySourceOf` |
| `generator/ui/replay-dialog.js`, `generator/ui/replay-model.js` | fixes proven by the page only |
| `generator/generator.css` | only `.card-replay` if needed |
| `tests/generator-state.test.js` | case N1 |
| `tests/browser/replay.html`, `tests/browser/replay.js` | new |
| `tests/browser/rendering.js` | one check |
| existing browser pages | only expectations changed by the third button (listed) |
| documents of the list above | as described |

Exclusive ownership while this task runs: the files above; scratch under `tests/artifacts/MP16b/` and the Edge
profile `tests\artifacts\edge-MP16b\`.

## Implementation steps

1. `replaySourceOf` and its Node test; the card button; the app wiring.
2. The browser page and the rendering check.
3. Run the targeted Node tests and the quick set; announce GB-P4; run the four pages one at a time; fix what they
   show (only in the files of this task); record the results.
4. The documents in both languages; `npm run test:quick`; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP16b-B01 | Every generated puzzle card has a "How it was made" button that opens Generation Steps for that puzzle, and the replay confirms the puzzle | page checks 1, 4 |
| MP16b-B02 | The dialog can be used with the keyboard and a screen reader: focus, Tab order, Escape, focus return, labelled controls, no announcement of playback ticks | page checks 3, 5 |
| MP16b-B03 | Puzzles without steps say so; incomplete and mismatching replays show their status and never pass for the generated puzzle | page checks 7, 9, 10 |
| MP16b-B04 | Closing the dialog cancels only the replay | page check 11 |
| MP16b-B05 | The cards keep their selection, removal and keyboard behaviour | page check 6; generator-flow |
| MP16b-B06 | Users and developers can read about the feature in English and Vietnamese | documents |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP16b-T01 | The button is the third button inside `li.puzzle-card`; without `onReplay` the card is unchanged | page check 6; review |
| MP16b-T02 | `replaySourceOf` returns the set, the puzzle, the state's origin and the puzzle's record, or null | case N1 |
| MP16b-T03 | `highlightedIds` renders `data-highlighted` and `.pm-highlight` only when given | rendering check |
| MP16b-T04 | GB-P4: the four pages pass (acceptance: the known blocked checks only), no CSP violation, no uncaught error; checks under 1 minute | gate record |
| MP16b-T05 | `npm run test:quick` and `npm run check` pass; documents in step in both languages | command output; review |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests/generator-state.test.js tests/generator-i18n.test.js tests/replay-model.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }

# announced gate GB-P4: ports 8816 / 9316, one page at a time (the list above), the procedure of
# tasks/regenerate-puzzle/check-list.md section 7

npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
```

### Required test cases

N1. `tests/generator-state.test.js`: `replaySourceOf` returns `{ set, puzzle, setOrigin, made }` for a listed puzzle
    with a record, `made: null` for a puzzle without one (also when `puzzleMade` has an inherited property of that
    name), and null without a set or for an unknown id.

The browser checks are those of "The browser page" above, plus the rendering check.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the gate record (pages, results, durations, PIDs stopped), any
  change to an existing page's expectation, any fix to MP16a's files with its failing check, and the test counts.
- Handoff to MP17: the pages of GB-P4 and their results; the documents of the feature.

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
