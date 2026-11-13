# MP10b2 — Derived display rating in the Generator; the browser pages and gate GC-P2 (display)

| Header | Value |
|---|---|
| ID | MP10b2 (second half of the report's display part of MP10) |
| Depends on | MP10b1 (accepted and committed: `core/browser/display-rating.js`, the note texts, the Player views); MP10a (`client.submitAuxiliary`) |
| Estimated size | Medium–Large: about 400–650 changed lines (the Generator about 100, Node tests about 150–200, browser pages about 150–250, documents about 50); about 50–60 minutes plus the browser runs (about 10–15 minutes); Amendment D1 (known issue KI-1) adds about 150–180 lines (the worker pool about 35, its Node tests about 110–130, the design about 5), about 20–30 minutes and about 17 minutes of page runs |
| Owner role | Apps |
| Milestone | M6 — display rating |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-23 (derived display rating; Generator: imported and restored puzzles), RES-29 (auxiliary requests), RES-05 and C1 (b) (estimate note), RES-22 (gate GC-P2); check-list §4.2 D27, §7 (GC-P2 display, browser checks) |
| Gates owned | GC-P2, display part (check-list §7) |
| Implementation status | Not started |

## Goal & business context

MP10b1 made the Player show puzzles of the old scale with a rating on today's scale and the original in a note, and
mark every v3 estimate. The Generator must do the same for the puzzles it did not make with v3: puzzles imported from a
link, a code or a pack, and the puzzles of sets saved before this version (RES-23). A generation in progress must never
be slowed down or stopped by this background work; a new generation makes it give way and it resumes afterwards
(RES-29).

This task also runs the owner's display gate (GC-P2, display part): the browser pages that show ratings, print
captions included, now show the derived rating and the estimate note in a real browser, with and without the number
of undecided alternatives.

## Scope

### In scope

- Generator: `generator/state.js` (the state field `displayRatings`, never saved), `generator/jobs.js` (the scheduler
  and its wishes), `generator/ui/puzzle-panel.js` (cards and print captions), `generator/app.js` (only if the client
  must be passed on).
- Node tests: `tests/generator-import.test.js`, `tests/generator-state.test.js` (new cases).
- Browser pages (the expected rating texts and waits for the derived rating only; one new check each in
  `tests/browser/print.js`, `tests/browser/generator-flow.js` and `tests/browser/player-load.js`, the last one being
  MP10b1's case 13): `tests/browser/player-load.js`,
  `tests/browser/puzzle-code-print.js`, `tests/browser/puzzle-code-acceptance.js`, `tests/browser/acceptance.js`,
  `tests/browser/print.js`, `tests/browser/generator-flow.js`; and their runs (gate GC-P2 display).
- Documents: `docs/design-detail.md` §10 (where the Generator shows ratings), `docs/design-brief.md` (one sentence),
  `USERGUIDE.md`, `USERGUIDE.vn.md` (Generator part).

### Out of scope

- `core/browser/display-rating.js`, the note texts, `puzzleDetails`, the Player (MP10b1; a defect goes back as a fix
  round); `core/browser/auxiliary.js` and the client (MP10a).
- Generated puzzles: they carry v3 claims and are never re-rated.
- Any other browser page; the Share dialog (it shows the puzzle's name only, no rating:
  `core/browser/share-dialog.js:369`).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Browser checks: each check finishes within 1 minute, each page within 10 minutes; a check waits for an asynchronous
  derived rating with the page's `waitFor` helper (never a fixed long sleep). Expected texts never pin a knob-dependent
  v3 level or score: match patterns (a level name, an integer score) and the stored original in the note.
- This task owns the GC-P2 display runs (the six pages of the test plan). **Announce to the orchestrator before
  starting them** (the Sudoku repository runs in parallel on the same machine; never two heavy runs at once): give the
  pages and the expected wall time (about 10–15 minutes, plus about 17 minutes for the 20 runs of Amendment D1) in
  your plan, and start only when the orchestrator says the machine is free.
- Ports HTTP 8810 and CDP 9310; profile `tests\artifacts\edge-MP10b2\`; evidence `tests\artifacts\MP10b2\`; the
  procedure and native CDP client of `tasks/regenerate-puzzle/check-list.md` §7 (client wait raised to 540,000 ms).
  Two more changes to the copied client (cross-review TP17): set `RP_EVIDENCE_DIR` to
  `tests\artifacts\MP10b2\<page-name>\main` for each page (the client writes the fixed names `browser.json` and
  `browser.png`, so one shared directory keeps only the last page), and read the summary as
  `summary:(document.documentElement.dataset.summary||document.querySelector('#summary')?.textContent||'')` in its
  evaluation expression (`tests/browser/acceptance.js:716-717` and `generator-flow.js:987-988` write their counts only
  to `#summary`). Keep its pass/error assertions.
  Stop only your own processes, by PID; remove the profile afterwards, also on failure.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports or
  `docs/difficulty-v3/`. UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

### From MP10b1 (read its module before starting)

- `core/browser/display-rating.js`: `needsDisplayRating(claim)`, `displayRatingKey(fingerprint)` (``
  `${fingerprint}|${MODEL}` ``), `createDisplayRatings({ submit, onChange, limit })` with `want(wishes)`, `get(key)`,
  `dispose()`, and `ratingDisplay(claim, entry, { t, levelLabel })` → `{ rating, notes }` or null. Entries: `pending`,
  `rated` (`rating`), `failed` (`code`), `unavailable`. One request at a time, re-submitted after a main request
  cancelled it.
- The notes (keys in `core/browser/print-texts.js`, spread into both apps): "Re-rated with the current scale
  (original: {level} {score}, {model})", "Could not be re-rated", "Decisive estimate: {count} alternatives undecided
  within the work limit" (`_one` / `_other`), "Decisive estimate"; and their Vietnamese texts.
- `puzzleDetails(t, { level, score, saturated, notes })` prints each note as one more line.

### The Generator (anchors at HEAD `041ff83`; MP10a changes nearby lines; find them by the quoted text)

- State: `defaultGeneratorState` (`generator/state.js:119`); the saved shape `serializeState` (970-988) lists its
  fields explicitly ("Jobs, timers and session-only data never appear"), so a new field is not saved unless added
  there — do not add it. Puzzles: `state.puzzles` (each `{ id, title, seed?, clues, solution, rating, certificate }`),
  the set `state.set` (`board`, `pieces`). Imported puzzles: `importPuzzle(state, pack)` (595) and the import job
  `importPuzzleCode` (`generator/jobs.js:551-602`); restored sets: `readSavedSet` (885), `restoreState` (992).
- Controller: `createJobController(options)` (`generator/jobs.js:197`; `client` from options; `destroy` at 641);
  `stopBackground()` (212-216) calls `options.cancelPending?.()` (the app passes `() => pool?.cancelAll()`): by MP10a's
  rule 6 a running auxiliary task is then put back in its queue, not lost. Every main request (`generateSet`,
  `generateBatch`, `solveWitness` for an imported set without an answer, 598-600) aborts the display request, and the
  scheduler submits it again (MP10b1).
- Views: `describeRating(puzzle)` (`generator/ui/puzzle-panel.js:70-80`: `card.noRating` or `card.rating` with
  "level: score[+]"), used for the cards (355-359, the level in bold); print captions in `printJobOf(state,
  selectedId)` (101-128, `puzzleDetails` at 118-119) and `printListOf(state, selectedId)` (131-154, at 139-140).
- `client.submitAuxiliary(kind, payload, { signal })` (MP10a). A test or app client without it (`options.client` in
  `tests/generator-*.test.js` fakes): the scheduler's `submit` must then reject with
  `new PoolError('worker-unavailable', 'No auxiliary requests')` (`PoolError` from `core/browser/worker-pool.js:92`),
  which gives `unavailable` entries; also when `options.workersAvailable === false`, even if the client has the
  method (`generator/app.js:124-128` passes both a client and the flag; cross-review TP19).

### What to build in the Generator

1. `displayRatings: {}` in `defaultGeneratorState` and the `GeneratorState` typedef (not saved; `restoreState` keeps
   the default).
2. In `createJobController`: `const display = createDisplayRatings({ submit, onChange })` with `submit = (kind,
   payload, o) => options.workersAvailable === false || typeof client?.submitAuxiliary !== 'function' ?
   Promise.reject(new PoolError('worker-unavailable', 'No auxiliary requests')) : client.submitAuxiliary(kind, payload,
   o)` (the flag is checked first: TP19) and `onChange` writing `displayRatings[key]` through `store.update` (delete
   the key for `undefined`). A function
   `wishDisplayRatings(state)` calls `display.want(wishes)` with one wish per puzzle of `state.puzzles`, in list order,
   whose claim `needsDisplayRating`: `{ key: displayRatingKey(progressFingerprint(state.set.board, state.set.pieces,
   puzzle.clues)), payload: { boardRows: boardToRows(state.set.board), pieces: state.set.pieces, clues: puzzle.clues
   } }`; no set → `want([])`. Call it **once when the controller is created**, with `store.getState()` (the app builds
   the store from `loadGeneratorState` before the controller, `generator/app.js:97, 124`, and `store.subscribe` does
   not call a new listener at once, `generator/state.js:179-190`: without this call a restored set that the user does
   not touch would never be rated; cross-review SP04). Then subscribe to the store: when `state.set` or
   `state.puzzles` changes (compare by reference with the last values seen), call it again. `destroy()` unsubscribes
   and disposes the scheduler.
3. `describeRating(puzzle, entry)`: with `const shown = ratingDisplay(puzzle.rating, entry, { t, levelLabel })`, null →
   `t('card.noRating')`; otherwise the card line of `shown.rating` as today, then each note after " · ". The cards look
   the entry up with the puzzle's key in `state.displayRatings`; the bold level stays the level of the rating shown.
4. `printJobOf` and `printListOf`: `puzzleDetails(t, { level: levelLabel(shown.rating.level), score:
   shown.rating.score, saturated: shown.rating.saturated, notes: shown.notes })` (null when `shown` is null).

### Browser pages whose expected rating texts change (MP10b1's Player display; RES-23)

The Player sample (`player/samples/sample-pack.json`, frozen by check-list D20) has `difficulty-v2` claims, so with a
worker the Player now shows derived v3 ratings with the re-rated note. Edit only these expectations, each after a
`waitFor` until the note is present (`.rating-note` in the Player views; the sheet's extra detail line in print):

| Page and line (HEAD `041ff83`; MP09e adds a check to `puzzle-code-acceptance.js`: find the line by its text) | Today | After |
|---|---|---|
| `tests/browser/player-load.js:228-229` | `.puzzle-info` starts with "Normal: score "; bold "Normal" | a level name in bold and "score N", then the note "Re-rated with the current scale (original: Normal N, difficulty-v2)" (the original level of that puzzle) |
| `tests/browser/player-load.js:275-277` | cards "Easy: score N", "Normal…", "Hard…" | each card: a level and a score, then the note with the original Easy, Normal and Hard |
| `tests/browser/player-load.js:570` | Vietnamese "Trung bình: điểm " | the Vietnamese note with the original "Trung bình" |
| `tests/browser/puzzle-code-print.js:466` | `['Easy: score 8']` | two lines: "<level>: score N" and the re-rated note with "Easy 8, difficulty-v2" |
| `tests/browser/puzzle-code-acceptance.js:1024` | `/^Normal: score \d+/` on `details[0]` | `details[0]` matches `/^.+: score \d+$/` and `details[1]` is the re-rated note with "Normal" |
| `tests/browser/puzzle-code-acceptance.js:1415-1416` (Generator) | `details.length === 1` | `details.length === (puzzle.rating.censored === true ? 2 : 1)`; the second line, when present, is the estimate note |
| `tests/browser/acceptance.js:240-243` | card lines `/^\w[\w ]*: score \d+\+?$/` | the rating part before " · " matches; a following note, if any, is the re-rated note |

If another page check fails only because of the new notes, report it with its name and the text; do not edit it
without the orchestrator's approval.

### New browser checks (gate GC-P2 display)

- `tests/browser/print.js`: "the sheet prints the notes of a rating: re-rated, estimate with n and without n, in both
  languages": `puzzleDetails(t, { level: 'Normal', score: 14, saturated: false, notes: [<re-rated note of a v2 Easy 8
  claim>, <estimate note with count 3>] })` built through `ratingDisplay` and the real texts; the sheet shows three
  detail lines in order, the level in bold only on the first; the same with the short estimate note; and in Vietnamese.
- `tests/browser/generator-flow.js`: "an imported puzzle of the old scale is re-rated on its card; generated puzzles
  are not": import the code of the Player sample's first puzzle (G1 of `tests/fixtures/puzzlecode-v1.json`, a
  `difficulty-v2` claim) through the Import puzzle dialog of the real Generator (real workers); `waitFor` the card's
  note "Re-rated with the current scale (original: Easy 8, difficulty-v2)"; generate one more puzzle in that set and
  check that a generated card shows no re-rated note; start a generation while a display request is still pending
  (import a second code and click New puzzle at once): the generation completes with its usual number of puzzles and
  the second card gets its note afterwards.
- `tests/browser/player-load.js` (MP10b1's case 13, cross-review SP04): "a derived rating alone redraws the cards":
  open the sample, wait until it is verified, then make no navigation, language or verification change and `waitFor`
  every card with a `difficulty-v2` claim to show a `.rating-note` with the re-rated text (the reply changes only the
  display ratings, so this fails if the card renderer's `drawn` state ignores them).

## Files to create/modify

| File | Change |
|---|---|
| `generator/state.js` | `displayRatings` (default, typedef) |
| `generator/jobs.js` | the scheduler, its wishes, `destroy` |
| `generator/ui/puzzle-panel.js` | cards and print captions |
| `generator/app.js` | only if the client must be passed on |
| `tests/generator-import.test.js`, `tests/generator-state.test.js` | new cases |
| `core/browser/worker-pool.js`, `tests/worker-pool.test.js` | Amendment D1 (KI-1): the delayed load retry and its five Node cases |
| the six browser pages of the table and the new checks | expectations and three checks |
| `docs/design-detail.md`, `docs/design-brief.md`, `USERGUIDE.md`, `USERGUIDE.vn.md` | documents |

Exclusive ownership while active: the files above; scratch under `tests/artifacts/MP10b2/`. Documentation slot: design
§10 (Generator), design §8.1's **Pool.** bullets (Amendment D1), the brief's levels paragraph, the user guides'
Generator part. Must not edit: the Player, the shared display module, the texts, engine files, other pages.

### Documents

- `docs/design-detail.md` §10 (Generator application; the puzzle cards and printing, about lines 2140-2183): imported
  and restored puzzles with a v1 or v2 claim show the derived display rating of §7.7 with its note; generated puzzles
  show their v3 rating; an estimate shows its note; the derived ratings are never saved.
- `docs/design-brief.md`, "Levels and typical boards" (where MP09d2 added the v3 sentence): "Puzzles made before this
  version keep their stored score and are shown re-rated on today's scale, with the original in a note, in both
  apps." (MP10b1 added the Player's sentence; this one covers the Generator's imported and restored puzzles.)
- `USERGUIDE.md` (Generator part: importing and the puzzle cards) and `USERGUIDE.vn.md`: one or two sentences each, in
  the terms of MP10b1's Player sentences.

## Implementation steps

0. Amendment D1 (at the end of this file): the worker pool's load retry, its five Node cases and the design bullet.
1. The Generator state, controller and views; the Node tests; run them.
2. The browser page edits and the three new checks.
3. Announce and run the six pages (one at a time), then Amendment D1's 20 runs of `puzzle-code-acceptance.html`;
   record the results.
4. Documents; `npm run test:quick`; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP10b2-B01 | In the Generator, imported puzzles and puzzles of saved sets with a v2 or v1 claim show a v3 level and score with the original in a note, on the card and on paper, also when the user does not touch the restored set; when no worker can rate them they show their claim with "Could not be re-rated"; generated puzzles show their own rating | Node tests; the generator-flow check |
| MP10b2-B02 | Re-rating in the Generator never slows down or stops a generation; after the generation it completes | Node test; the generator-flow check |
| MP10b2-B03 | In a real browser, both apps show the derived rating and the estimate notes (with and without the number) in English and Vietnamese, on screen and on the printed sheet | GC-P2 display runs |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP10b2-T01 | `displayRatings` is in the Generator state and not in `serializeState`; stored claims and saved sets are unchanged byte for byte | `tests/generator-state.test.js` |
| MP10b2-T02 | Wishes: one per listed puzzle with a v1 or v2 claim, in list order, keyed by fingerprint and `MODEL`; none for v3, unknown or missing claims; a client without `submitAuxiliary`, or `workersAvailable: false` with a client that has it (zero calls), gives `unavailable` entries, shown as the claim with "Could not be re-rated", and no error notice | `tests/generator-import.test.js` |
| MP10b2-T03 | `describeRating`, `printJobOf` and `printListOf` show the rating and notes of `ratingDisplay` | Node tests |
| MP10b2-T04 | The six pages pass in the main phase with no CSP violation and no uncaught error; only the listed expectations changed, plus the three new checks (the card-redraw check among them) | browser evidence; diff |
| MP10b2-T05 | `npm run test:quick` and `npm run check` pass; documents in both languages | command output; review |
| MP10b2-T06 | The controller sends the wishes of the state it starts with once at creation, with no store update needed; it re-sends them when `state.set` or `state.puzzles` changes; after `destroy()` nothing is sent | `tests/generator-state.test.js` case 3 |
| MP10b2-T07 | Amendment D1's pool contract: a load failure (a plain `error` event before any reply) is retried once, after `LOAD_RETRY_DELAY_MS`, on a new worker with the same message while the slot stays reserved; every other `error` still rejects with `worker-crashed`; aborts, `recycle` and `close` cancel a pending retry; the three existing crash tests pass unchanged | `tests/worker-pool.test.js` (Amendment D1, cases 1-5) |
| MP10b2-T08 | Amendment D1's 20-run check: 20 consecutive runs of `puzzle-code-acceptance.html` whose page result is `pass`, or the documented stop | `tests/artifacts/MP10b2/ki1-loop.log` and the runs' evidence |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests\generator-import.test.js tests\generator-state.test.js tests\generator-i18n.test.js tests\display-rating.test.js tests\worker-pool.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }

# announced gate GC-P2 display: ports 8810 / 9310, one page at a time, main phase, the procedure of
# tasks/regenerate-puzzle/check-list.md section 7
#   http://127.0.0.1:8810/pentomino/tests/browser/print.html
#   http://127.0.0.1:8810/pentomino/tests/browser/player-load.html
#   http://127.0.0.1:8810/pentomino/tests/browser/puzzle-code-print.html
#   http://127.0.0.1:8810/pentomino/tests/browser/puzzle-code-acceptance.html
#   http://127.0.0.1:8810/pentomino/tests/browser/acceptance.html
#   http://127.0.0.1:8810/pentomino/tests/browser/generator-flow.html
# then Amendment D1: 20 runs of puzzle-code-acceptance.html, one locked command each; log in
# tests\artifacts\MP10b2\ki1-loop.log

npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

`tests/browser/acceptance.html` reported "16 checks, 4 blocked" at the regenerate-puzzle release (blocked checks need
a physical device): the same blocked checks are expected; any new blocked or failed check is reported.

### Required test cases (Node)

1. `tests/generator-import.test.js`: importing a code whose puzzle has a v2 claim with a scripted client
   (`submitAuxiliary` resolving a fixed v3 rating) → the state gets a `rated` entry under the puzzle's key and
   `describeRating(puzzle, entry)` gives the derived line with the note; a v1 claim likewise; a v3 summary claim with
   `censored: true` → no request, and the card shows "Decisive estimate"; an import of a puzzle without a claim → no
   request; the stored claim of the imported puzzle is deep-equal before and after; a scripted `rating-incomplete` →
   "Could not be re-rated"; a client without `submitAuxiliary` → `unavailable`, and the card shows the claim with
   "Could not be re-rated" (MP10b1's table, cross-review SP04), no notice; a client whose `submitAuxiliary` is a spy,
   with `workersAvailable: false` → the spy is never called, the entry is `unavailable` with the same card text, and
   no error notice (TP19).
2. Overlap (scripted client): a display request held while `generateBatch` starts → the client's `submitAuxiliary`
   promise is rejected `cancelled` by the client and submitted again; the batch's result equals the result without the
   import; after the batch the entry ends `rated`.
3. `tests/generator-state.test.js` and the controller: a store created from a saved state with a set whose puzzles
   have v2 claims, then `createJobController` with a scripted client, and **no store update afterwards** → the client
   receives the wishes' `rate` requests in list order and the entries end `rated` (the start-up call of SP04); after
   `destroy()` a later store update sends nothing. The saved string of `serializeState` is the same with and without
   entries in `displayRatings`.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the page verdicts, summaries, check counts, Edge version and error
  counts, and lists every changed expectation; and Amendment D1's result (its "Handoff" paragraph).
- Handoff to MP11 and later: the display rating needs no calibration change; MP17 re-runs these pages in GZ.

## Amendment D1 (before dispatch: known issue KI-1, a delayed load retry in the worker pool)

Added by SA1 on 2026-11-13, before dispatch; the analysis is in
`docs/difficulty-v3/claude-opus-5.5/7-response-to-second-pass.md` §9. It adds step 0, two code files, one design
bullet, criteria MP10b2-T07 and T08 and a 20-run browser check; the header, the repository rules, the files table, the
steps, the criteria, the test plan and the definition of done point here. Nothing else above changes.

**Why.** Known issue KI-1 (check-list "Known issues"): `tests/browser/puzzle-code-acceptance.html` fails in 2 to 3 of
10 runs, in BA09, BA05 or the first BA01 check. MP09e's instrumented runs (git-ignored:
`tests/artifacts/MP09e/dbg53.console.json` and `dbg31.console.json`) show the sequence. BA09 starts with
`mount({ hash: await packHash(sample, 0) })`: `packHash` disposes its client, which terminates its worker (worker 8, at
2,465 ms); the Player creates its decode worker 5 ms later (worker 9), and that worker fires `error` 41 ms after
creation, before any reply, as a plain `Event` with no `message`, `filename` or `lineno`. In `dbg31` the failing
worker is BA09's first (`packHash`'s), created just after the previous check's cleanup; it fires the same event 19 ms
after creation, and that run's only CDP error is a canceled `Script` request. A browser fires such an event when a
worker's script or a static import fails to load; a runtime exception arrives as an `ErrorEvent` with a message. The
pool turns it into `worker-crashed`, so the puzzle-code step fails, and the check's message depends on the step:
"the codes of the pack could be made", "timed out: the view to turn", "the Print dialog is ready", "expected "game",
got "start"" (BA05) or "the entry accepted the text (Puzzle code processing failed. Try again.)". The apps run the
same sequence (an aborted or stale busy task whose worker is discarded and replaced; `recycle` after a set change,
D38; a disposed client followed by a new one), so the fix belongs in the pool, not in the page. The retry waits
because the failure follows a termination by a few milliseconds, and a retry follows one too (that of the failed
worker).

**Files** (this task's exclusive ownership; the check-list's ownership row, §2 "Exclusive ownership", lists them):

| File | Change |
|---|---|
| `core/browser/worker-pool.js` | `LOAD_RETRY_DELAY_MS` (new export), the `Slot` and `Entry` typedefs and literals, `discard`, a new `reload`, the listeners of `spawn` |
| `tests/worker-pool.test.js` | five cases in `describe('crashes and unavailable workers')` |
| `docs/design-detail.md` §8.1 | one bullet in **Pool.** |

No other file changes for D1: not `core/browser/puzzle-code-client.js`, not the pages (beyond this task's table), not
`tools/node-worker.mjs`, whose `error` events always carry a `message` (`tools/node-worker.mjs:29-30`), so Node keeps
today's behaviour.

**Contract** (`core/browser/worker-pool.js`).

1. `export const LOAD_RETRY_DELAY_MS = 100;` next to `MEMORY_UI_INTERVAL_MS`.
2. An instance is *answered* once it has delivered a `message` or a `messageerror` event (a flag local to `spawn`,
   set first in both listeners).
3. A *load failure* is an `error` event of the slot's current instance that arrives before the instance is answered
   and whose `message` is not a string (`typeof event?.message !== 'string'`).
4. On a load failure, when the slot has a busy entry whose `reloaded` is false, call `reload(slot, entry)`:
   `entry.reloaded = true`; terminate the instance as `discard` does (`slot.worker = null`, `slot.bytes = 0`,
   `terminate()` in a try block, `account()`) but keep `slot.busy === entry` and `entry.slot === slot`, so that the
   slot stays reserved and every abort still finds the task; then `slot.retryTimer = clock.setTimeout(fire,
   LOAD_RETRY_DELAY_MS)`. `fire`: `slot.retryTimer = null`; if `closed`, `entry.settled` or `slot.busy !== entry`,
   return; otherwise `slot.busy = null`, `entry.slot = null`, `dispatch(entry, slot)` (the new worker gets the same
   message and id; if no worker can be created, `dispatch` rejects the task as today and the slot stays free), then
   `pump()`. The caller sees nothing: no rejection, no progress, no new error code.
5. Every other `error` keeps today's `failSlot(slot, 'worker-crashed', ...)`: a second load failure of the same
   entry, an error after the instance answered, an error whose `message` is a string (also `''`), or no busy entry.
   Events of a non-current instance stay ignored.
6. `discard` first clears a pending retry (`clock.clearTimeout(slot.retryTimer)`, then `null`), so that `abortEntry`
   (signal, deadline, supersession, `cancelAll`, preemption), `recycle` and `close` cancel it.
7. The `Slot` typedef gains `@property {unknown} retryTimer` (`null` in the slot literal of `createPool`); the
   `Entry` typedef gains `@property {boolean} reloaded` (`false` in the entry literal of `enqueue`). Each task has its
   own single retry.

**Node tests** (`tests/worker-pool.test.js`, `describe('crashes and unavailable workers')`, with the file's `setup`
(its `clock` is the fake clock), `task`, `track`, `flush` and `FakeWorker`'s `emit`, `send` and `result`;
`new Event('error')` is a Node global; "advance" is `clock.advance(LOAD_RETRY_DELAY_MS)`):

1. Load failure, then success: `workers[0].emit('error', new Event('error'))` before any reply → the task is pending,
   `workers[0].terminated`, still one worker; after the advance two workers, and `workers[1].messages` deep-equals
   `workers[0].messages` (one message, same id); `workers[1].result('ok')` → the task resolves `'ok'`.
2. Second load failure: case 1 up to the replacement, then the same event from `workers[1]` → the task rejects at once
   with a `PoolError` of code `worker-crashed`; another advance creates no worker; a new task gets its own retry.
3. Not a load failure: `emit('error', { message: '' })` before any reply → `worker-crashed` at once; a `progress`
   message (`{ type: 'progress', id: w.taskId(), stage: 's', rowTrials: 0, bytes: 1 }`) and then the plain event →
   `worker-crashed`; in both, an advance creates no worker.
4. The slot stays reserved: pool size 1, tasks a and b; worker 0 fails to load with a → no worker is created for b
   before the advance; after it the replacement holds a's message only; `result('a')` → a resolves and b is sent to
   the same worker.
5. A pending retry is cancelled: during the pause, `pool.close()` → the task rejects `closed`, `clock.pending()` is 0
   and an advance creates no worker; in a second pool, the task's `signal` aborts it → `cancelled`, `clock.pending()`
   drops by one (the retry timer; the request's deadline timer stays) and an advance creates no worker.

The three existing tests that emit `error` with a message (lines 326, 351 and 776) pass unchanged.

**Design** (`docs/design-detail.md` §8.1, a bullet of **Pool.** after "Recycling (D38)"): "**Load failure** (KI-1). A
worker whose script does not load fires a plain `error` event before it sends anything; a browser can cancel the
script request of a worker started just after another one was terminated. The pool then terminates that worker and,
after 100 ms (`LOAD_RETRY_DELAY_MS`), sends the same task to a new one, once per task; the slot stays reserved
meanwhile. A second load failure of the task, or any other `error`, rejects the task with `worker-crashed` as
before."

**Step 0** (before step 1): the pool change, the five cases, `node --test tests\worker-pool.test.js`, the design
bullet.

**The 20-run check** (part of the announced GC-P2 display runs, after the six pages):

- `puzzle-code-acceptance.html` with this task's page edits, 20 consecutive runs, one at a time, each its own locked
  command, each with the page procedure of "Repository rules", a fresh profile and `RP_EVIDENCE_DIR` =
  `tests\artifacts\MP10b2\puzzle-code-acceptance\ki1-<i>`. The GC-P2 run of that page may count as run 1.
- One line per run in `tests\artifacts\MP10b2\ki1-loop.log`: the run, the page result, the failed check names, the
  CDP error count and kinds, the wall time and the summary's `spawned` count. In MP09e's passing runs that count was
  always 122; take the most frequent count of the 20 runs as the reference: one more marks a run in which the pool
  replaced a worker (reported, not a criterion).
- MP09e's git-ignored `tests\artifacts\MP09e\baseline-loop.ps1` and `run-page.ps1` may be copied into
  `tests\artifacts\MP10b2\` and adapted (ports 8810 and 9310, profile `edge-MP10b2`, this task's evidence paths and
  client); never edit MP09e's files.
- Pass (MP10b2-T08): 20 of 20 runs with page result `pass`. At the measured rate (5 of 20 runs in MP09e's two loops),
  20 clean runs by chance have a probability of about 0.3 % (0.75^20), and about 1.2 % at 2 in 10.
- The client's error rule stays. A run whose page passed and whose only CDP error is a canceled `Script` request
  (`Network.loadingFailed`, `canceled: true`) is listed as such and counts as a pass for T08; if it is the GC-P2 run
  of the page (MP10b2-T04), that run is repeated once. Of MP09e's 24 recorded runs, only the instrumented `dbg31`
  captured that event.
- A failure of another signature is handled as any page failure of this task. A failure of the KI-1 signature (a
  failed check whose message is one of the five of "Why", or any failed check whose message contains "Puzzle code
  processing failed"): raise `LOAD_RETRY_DELAY_MS` to 300 once (code, test and design text) and restart the count at
  run 1. If it fails again with that signature, stop the loop, keep the change (it is correct and its tests pass),
  record the runs and report: GC-P2 display is then judged with the known-flake rule (one re-run of the page on this
  signature), and KI-1 stays open.

**Handoff.** The reply gives the 20-run table (page results, failed names, CDP errors, `spawned` counts), the delay in
force (100 or 300 ms) and whether KI-1 can be closed. MP17: once T08 has passed, a failure of the KI-1 signature is a
regression, not the known flake.

AMENDMENT D1 READY

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP10b2: Derived display rating in the Generator; the browser pages and gate GC-P2 (display); KI-1 closed`) |
| Start | 2026-11-13 09:19 (+07:00) |
| End | 2026-11-13 10:03 developer; 10:05 orchestrator commit |
| Duration | 45 min developer (about 25 min of it page runs, 20 of them the D1 check); about 2 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 194 model calls; 41,066,875 input tokens (40,523,723 cache reads); 175,668 output tokens |
| AI credits | about 717 (developer) |
| Verification | Developer: targeted `node --test` (the task's five files) 121/121; `npm run test:quick` 1333/1333 (29 s); `npm run check` OK; `record-fixtures --check` OK; GC-P2 display, each page under its own timing lock (Edge 157, ports 8810/9310, fresh profile): `print` 10 pass, `puzzle-code-print` 13, `player-load` 19, `puzzle-code-acceptance` 24 (9/9 QR, 0 CDP errors, spawned 123 = terminated 123), `acceptance` "PASS 16 checks, 4 blocked" as expected, `generator-flow` 21/21; D1 20-run check 20/20 (09:40-10:00, 43-49 s each, 0 CDP errors, no KI-1 signature, delay stays 100 ms). Orchestrator re-run: `test:quick` 1333/1333; `worker-pool`, `generator-import`, `generator-state`, `display-rating`, `player-load` 153/153; `check` OK; `record-fixtures --check` OK |
| Acceptance | MP10b2-B01..B03 and T01..T05, T07, T08 met. Diff reviewed: the Generator's job controller wishes display ratings for the puzzles of the set on show whose claim is on an older scale (at creation and when the set or the puzzles change), through `client.submitAuxiliary` (rejected as `worker-unavailable` without it), into `state.displayRatings` (never saved); cards, list and print jobs show the derived rating and notes; generation is never held back. D1: `worker-pool.js` retries a task once, after `LOAD_RETRY_DELAY_MS` (100 ms) on a new worker, when its worker fires a plain `error` (no message) before any reply; the slot stays reserved, `discard` clears a pending retry, every other error stays `worker-crashed`; five Node cases; design §8.1 bullet |
| Issues & resolutions | (1) SA1 refined D1's "20-run check" after dispatch; the orchestrator passed the refinements (KI-1 signature, canceled-Script rule, `spawned` column, the 300 ms rule) to the developer; none triggered. (2) `tests/browser/player-load.js` had not passed since MP09a1 (`dfea36d`): its `bigSet()` of 21 monominoes is refused as duplicate shapes; replaced by the 21 distinct free polyominoes of 1-5 cells on a 9 x 10 board without one corner (tiling found by the engine, validated by `validatePack`). (3) `generator-flow.js`: the scripted `makePuzzle` carried v2 claims and the scripted client has no `submitAuxiliary`, so cards read "Could not be re-rated"; it now carries a v3 summary claim. (4) Task table against the code: `puzzle-code-print.js:466` reads a hand-built job, so the expected details are built with `ratingDisplay` and compared with `fitDetailLine`; `puzzle-code-acceptance.js:1024` used a stub pool that never answers, now a real `createPool({ size: 1 })` (spawned 122 to 123); `acceptance.js:243` cards are generated v3 puzzles, so only a "Decisive estimate" note is allowed. (5) No announcement channel for page runs: the timing-lock protocol was used. (6) KI-1 closed by T08 (check-list "Known issues") |
| Handoff | MP11: nothing to calibrate (no scale change). MP17: re-run `print`, `puzzle-code-print`, `player-load`, `puzzle-code-acceptance`, `acceptance`, `generator-flow` in GZ; `puzzle-code-acceptance` spawns 123 workers as it stands; KI-1 is closed, so a failure of its signature is a regression, with no re-run allowance; a scripted client or stub that carries v2 claims without `submitAuxiliary` shows "Could not be re-rated" |
