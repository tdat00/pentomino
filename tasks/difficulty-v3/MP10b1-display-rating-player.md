# MP10b1 — Derived display rating: the shared rules and the Player

| Header | Value |
|---|---|
| ID | MP10b1 (first half of the report's display part of MP10; MP10b2 does the Generator, the browser pages and gate GC-P2 display) |
| Depends on | MP10a (accepted and committed: `controller.submitAuxiliary`); MP09d2 (`rate` is v3); MP09b (v3 claims and summary claims) |
| Estimated size | Large: about 650–850 changed lines (the new module about 200, print and texts about 60, the Player about 120, tests about 300–400, documents about 60); about 50–60 minutes |
| Owner role | Apps |
| Milestone | M6 — display rating |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-23 (derived display rating, the estimate note), RES-29 (auxiliary requests), RES-05 and C1 (b) (`censored`, the estimate note with and without n), RES-04 (unrateable puzzles); clarifications SA2-Q-P08 / SA1-Q-P2 (a), JR-P1 (a) (v2 and v1 claims), C1 (b) (owner); check-list §4.2 D27 |
| Gates owned | none (the browser part of GC-P2 display is MP10b2's) |
| Implementation status | Not started |

## Goal & business context

Puzzles made before v3 carry a `difficulty-v2` or `difficulty-v1` claim: a level and a score on the old scale, which
no longer match what a new "Hard" means. The plan author decided (SA2-Q-P08 / SA1-Q-P2 (a), JR-P1 (a)) that the apps
show such a puzzle with a **derived display rating**: the puzzle is rated again with today's v3 scale in the
background, and the app shows the v3 level and score with the note "Re-rated with the current scale (original: Easy
8, difficulty-v2)". The stored claim, the code, the link, the title and the puzzle's identity never change; a puzzle
without any claim is not rated.

The owner also decided (C1 (b)) that a v3 rating whose census did not finish is marked as an estimate wherever it is
shown: "decisive estimate: n alternatives undecided within the work limit" when the metrics are known, "decisive
estimate" for the summary claim of a code.

This task writes the shared rules (which puzzles are re-rated, how a request is scheduled, what is shown) and puts them
in the Player: its rating line, its puzzle cards and its print and share captions. MP10b2 does the same in the
Generator and updates and runs the browser pages.

## Scope

### In scope

- New `core/browser/display-rating.js`: `needsDisplayRating`, `displayRatingKey`, `createDisplayRatings` (the
  scheduler) and `ratingDisplay` (what a view shows).
- `core/browser/print-texts.js`: the four note texts in English and Vietnamese (both apps' locale packs spread them).
- `core/browser/print-dialog.js`: `puzzleDetails` prints the notes.
- Player: `player/state.js` (state field `displayRatings`, the scheduler), `player/ui/rating-dom.js` (notes),
  `player/app.js` (the rating line, print and share captions), `player/ui/puzzle-list.js` (cards).
- Tests: `tests/display-rating.test.js` (new), `tests/player-load.test.js`, `tests/print-details.test.js`.
- Documents: `docs/design-detail.md` §7.7 and §11 (Player), `USERGUIDE.md`, `USERGUIDE.vn.md` (Player part).

### Out of scope

- The Generator (MP10b2); the browser pages and their expected texts (MP10b2, gate GC-P2 display).
- `core/browser/auxiliary.js`, `core/browser/generation-client.js` (MP10a; a defect goes back as a fix round).
- Any engine change; any change of a stored claim, a pack, a code or a URL.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Browser modules: `// @ts-check`, JSDoc types; `core/browser/display-rating.js` has no DOM and no storage.
- Every visible text in both languages, through the locale packs; the i18n tests check keys and placeholders.
- Tests do not pin knob-dependent v3 levels or scores (the knobs move in MP12): use scripted ratings from fake pools,
  or properties (a level id of `LEVELS`, an integer score).
- Run only the commands of the test plan; no browser page, no gate. Never stage, commit, stash, reset, push or switch
  branches; never edit `tasks/difficulty-v3/`, the reports or `docs/difficulty-v3/`. UTF-8 without BOM, CRLF.

## Inputs & context

### Code (anchors at HEAD `7604eff`; MP10a adds `submitAuxiliary` to `player/state.js`)

- `core/engine/difficulty.js`: `MODEL` (`'difficulty-v3'` after MP09d2). `core/engine/keys.js:459`:
  `progressFingerprint(board, pieces, clues)`; `core/engine/board.js`: `boardFromRows`; `core/engine/pack.js`:
  `packBoard(pack)`.
- The worker `rate` task: payload `{ boardRows, pieces, clues }` (`core/engine/protocol.js:671`), value a `RatingV3`
  (`model`, `score`, `level`, `saturated: false`, `censored: true` only for an estimate, `metrics` with
  `censusUndecided`); failures `WorkerTaskError` with code `rating-incomplete` (a capped path, RES-04) or
  `unsatisfiable`.
- `controller.submitAuxiliary(kind, payload, { signal })` (MP10a): rejects with `PoolAbortError('cancelled')` (its own
  signal or a new verification), `PoolAbortError('closed')`, `WorkerTaskError`, or `PoolError` (code
  `worker-unavailable` when there is no worker or the pool runs no auxiliary task).
- Player store (`player/state.js`): state fields at 63-76 (`pack`, `index`, `fingerprints` = `progressFingerprint`
  of every puzzle of the pack, computed in `prepare`, 307-318, committed at 449-470); `createPlayerStore` (85).
- Rating views: `setRating(target, rating, tail)` (`player/ui/rating-dom.js:13-25`) writes the line "level in bold:
  score" and appends `tail` after " · "; it is called for the rating line (`player/app.js:646`, `renderHeadline`) and
  for each card (`player/ui/puzzle-list.js:224-225`). `ratingParts(rating)` (`player/strings.js:107-115`) formats the
  line with `rating.line` and `scoreText` ("+" only for `saturated: true`).
- Print and share: `printJobAt(at)` (`player/app.js:387-407`) and `printList()` (412-432) call
  `puzzleDetails(t, { level: levelLabel(rating.level), score, saturated })`; the Share dialog and the Print dialog use
  these jobs (the share link is made from the same snapshots).
- `puzzleDetails(t, rating)` (`core/browser/print-dialog.js:48-65`) returns the print lines: one line
  `print.sheet.ratingOnly` ("{level}: score {score}", 48 and 108 of `core/browser/print-texts.js`) with the level in
  bold. `tests/puzzlecode-acceptance.test.js:715` asserts `puzzleDetails.length === 2`: keep two declared parameters.
- Plural texts: keys suffixed `_one` / `_other`, chosen by `args.count` (`core/browser/i18n.js:2, 137-160`); the i18n
  parity tests compare base keys (Vietnamese may have only `_other`).

### Which puzzles are re-rated (RES-23, JR-P1 (a))

`needsDisplayRating(claim)` is true exactly when `claim` is an object whose `model` is `'difficulty-v2'` or
`'difficulty-v1'`. Null or missing claims (no rating), `difficulty-v3` claims (full or summary) and unknown models
are not re-rated.

### Key and request (RES-23)

- `displayRatingKey(fingerprint)` = `` `${fingerprint}|${MODEL}` ``, where `fingerprint` is the puzzle's
  `progressFingerprint(board, pieces, clues)` (in the Player: `state.fingerprints[index]`). Two equal puzzles share one
  derived rating; a later model gets new keys.
- The request is `submitAuxiliary('rate', { boardRows: pack.board.rows, pieces: pack.pieces, clues: puzzle.clues }, {
  signal })`.

### The scheduler (check-list D27)

```js
/**
 * @typedef {{ status: 'pending' } | { status: 'rated', rating: object } | { status: 'failed', code: string }
 *   | { status: 'unavailable' }} DisplayEntry
 * @typedef {{ key: string, payload: { boardRows: string[], pieces: object[], clues: object[] } }} DisplayWish
 */

/**
 * @param {{ submit: (kind: 'rate', payload: object, o: { signal: AbortSignal }) => Promise<unknown>,
 *   onChange: (key: string, entry: DisplayEntry | undefined) => void, limit?: number }} options
 * @returns {{ want: (wishes: DisplayWish[]) => void, get: (key: string) => DisplayEntry | undefined, dispose: () => void }}
 */
export function createDisplayRatings(options) { … }
```

- `want(wishes)` replaces the wish list (priority order: the puzzle on show first, then the others in pack order;
  duplicates by key are ignored after the first). When the request in flight is for a key that is no longer wished, it
  is aborted through its own `AbortController` and its entry is removed (`onChange(key, undefined)`).
- **One request at a time**: the first wished key without an entry gets `{ status: 'pending' }` (`onChange`) and is
  submitted. Its outcome:
  - a value → `{ status: 'rated', rating: value }`;
  - `PoolAbortError` with reason `'cancelled'` that the scheduler did **not** cause (a new verification or generation
    began, MP10a rule 4) → submit the same key again at once (it waits for that main request) and keep `pending`;
  - an abort it caused (`want` or `dispose`), or reason `'closed'` → remove the entry, nothing else;
  - `PoolError` with code `worker-unavailable` → `{ status: 'unavailable' }` for this key and for every later wish
    (no further request until the next `want` with new keys);
  - any other error (`WorkerTaskError` `rating-incomplete`, `unsatisfiable`, other codes; another `PoolError`) →
    `{ status: 'failed', code }`.
  Then the next wished key without an entry. Rated and failed entries are kept (the cache) and are never requested
  again; at most `limit` entries (default 1,000) are kept, the oldest settled entries first removed.
- Every settle checks that the scheduler is not disposed; a late value for a removed key is dropped (no `onChange`).
- `dispose()` aborts the request in flight and drops everything.

### What a view shows (RES-23, RES-05, C1 (b))

```js
/**
 * @param {object | null | undefined} claim The stored claim of the puzzle.
 * @param {DisplayEntry | undefined} entry The scheduler's entry for the puzzle's key.
 * @param {{ t: (key: string, args?: object) => string, levelLabel: (id: string) => string }} text
 * @returns {{ rating: object, notes: string[] } | null} null: no rating line at all.
 */
export function ratingDisplay(claim, entry, text) { … }
```

| Stored claim | Entry | `rating` shown | `notes` |
|---|---|---|---|
| none (null or missing) | any | — (returns null) | — |
| `difficulty-v3` (full or summary) | any | the claim | the estimate note when `claim.censored === true` |
| `difficulty-v2` or `difficulty-v1` | `rated` | the derived v3 rating | the re-rated note, then the estimate note when the derived rating has `censored: true` |
| `difficulty-v2` or `difficulty-v1` | `failed` | the claim | the not-re-rated note |
| `difficulty-v2` or `difficulty-v1` | none, `pending`, `unavailable` | the claim | none |
| another model | any | the claim | none |

Notes (keys in `core/browser/print-texts.js`, below):

- re-rated: `t('rating.note.rerated', { level: levelLabel(claim.level), score: <the claim's score as shown today:
  rounded, "+" when saturated>, model: claim.model })`;
- not re-rated: `t('rating.note.notRerated')`;
- estimate: with `metrics` and a finite `metrics.censusUndecided`: `t('rating.note.estimate', { count:
  metrics.censusUndecided })`; without metrics (a summary claim from a code): `t('rating.note.estimateShort')`;
- a rating without `censored: true` gets no estimate note; `censored` never adds "+".

### Texts (add to `PRINT_TEXTS_EN` and `PRINT_TEXTS_VI` in `core/browser/print-texts.js`; both apps spread them)

| Key | English | Vietnamese (suggested; natural wording is the developer's choice) |
|---|---|---|
| `rating.note.rerated` | Re-rated with the current scale (original: {level} {score}, {model}) | Đã chấm lại theo thang điểm hiện tại (gốc: {level} {score}, {model}) |
| `rating.note.notRerated` | Could not be re-rated | Không chấm lại được |
| `rating.note.estimate_one` | Decisive estimate: {count} alternative undecided within the work limit | — (Vietnamese has one form: `_other`) |
| `rating.note.estimate_other` | Decisive estimate: {count} alternatives undecided within the work limit | Ước lượng quyết định: {count} phương án chưa phân định trong giới hạn tính toán |
| `rating.note.estimateShort` | Decisive estimate | Ước lượng quyết định |

### Where the Player shows it

- State: add `displayRatings: {}` (key → `DisplayEntry`) to the initial state (63-76) and to the `PlayerState`
  typedef; it is never saved. The controller creates the scheduler with `submit: (kind, payload, o) =>
  aux.submit(kind, payload, o)` (MP10a's queue) and `onChange: (key, entry) => store.update((s) => { const next = {
  ...s.displayRatings }; if (entry === undefined) delete next[key]; else next[key] = entry; return { displayRatings:
  next }; })`. After every commit of a pack or an index (where `fingerprints` is written, about 449-470) and on
  removals, call `want(...)` with the wishes of the pack's puzzles that `needsDisplayRating`, the open puzzle first.
  `destroy()` disposes it before the queue.
- Views: compute `ratingDisplay(puzzle.rating, state.displayRatings[displayRatingKey(state.fingerprints[i])], { t,
  levelLabel })` and pass `rating` and `notes`:
  - `setRating(target, rating, tail, notes = [])`: the line as today for `rating`, then each note after " · ", then
    `tail`; give the notes a class (`rating-note`) so a page can find them.
  - `renderHeadline` (`player/app.js:646`) and the cards (`player/ui/puzzle-list.js:224`).
  - `printJobAt` and `printList`: `puzzleDetails(t, { level, score, saturated, notes })`.
- `puzzleDetails(t, rating)`: `rating` may carry `notes?: string[]`; each note becomes one more line `[{ text: note }]`
  after the rating line. The declared parameters stay two.

## Files to create/modify

| File | Change |
|---|---|
| `core/browser/display-rating.js` (new) | the four exports |
| `core/browser/print-texts.js` | the note texts (EN, VI) |
| `core/browser/print-dialog.js` | `puzzleDetails` notes |
| `player/state.js` | `displayRatings`, the scheduler, `want` calls, `destroy` |
| `player/ui/rating-dom.js`, `player/app.js`, `player/ui/puzzle-list.js` | the views |
| `tests/display-rating.test.js` (new), `tests/player-load.test.js`, `tests/print-details.test.js` | tests |
| `docs/design-detail.md`, `USERGUIDE.md`, `USERGUIDE.vn.md` | documents |

Exclusive ownership while active: the files above. Documentation slot: design §7.7 and the Player sections of §11;
the user guides' Player part. Must not edit: the Generator, the browser pages, engine files, `auxiliary.js`.

### Documents

- `docs/design-detail.md` §7.7 (about line 1571, as MP09d2 left it): a paragraph **Derived display rating** with the
  table of "What a view shows", the key (fingerprint and `MODEL`), the scheduler (one request at a time, re-submitted
  after a new main request, cache of 1,000, never saved), the notes and their texts, and that the stored claim, the
  code and the URL never change; a v3 rating with `censored: true` always shows the estimate note. §11 (Player): where
  the line, the cards and the captions show the notes.
- `USERGUIDE.md` (Player part, "Using the Player", the rating line; and "Printing") and `USERGUIDE.vn.md` (the same
  places): two sentences each, for example "A puzzle made before the current scale shows its level and score re-rated
  on today's scale, with the original rating in a note; a puzzle whose rating could not be finished within the work
  limit shows 'decisive estimate'." and the natural Vietnamese equivalent.

## Implementation steps

1. `core/browser/display-rating.js` and `tests/display-rating.test.js` (pure parts and the scheduler with a scripted
   `submit`); the texts; `puzzleDetails`; `tests/print-details.test.js`.
2. The Player state and views; `tests/player-load.test.js` cases.
3. Documents; `npm run test:quick`; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP10b1-B01 | In the Player, a puzzle with a v2 or v1 claim shows a v3 level and score with the original rating in a note, on its rating line, its card, and its print and share captions; the stored claim, the code and the address never change | Player tests |
| MP10b1-B02 | A puzzle without a claim is not re-rated; a puzzle that cannot be re-rated keeps its stored rating with "Could not be re-rated" | Player tests |
| MP10b1-B03 | Every v3 estimate is marked: "Decisive estimate: n alternatives …" with metrics, "Decisive estimate" for a code's summary claim, in English and Vietnamese | unit and Player tests |
| MP10b1-B04 | Re-rating never delays or cancels the verification of a puzzle | overlap test |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP10b1-T01 | `needsDisplayRating`, `displayRatingKey` and `ratingDisplay` follow the tables exactly | `tests/display-rating.test.js` |
| MP10b1-T02 | The scheduler runs one request at a time in wish order, re-submits after a main-request cancel, drops a late reply after `want` or `dispose`, caches rated and failed entries (limit 1,000), and stops on `worker-unavailable` | `tests/display-rating.test.js` |
| MP10b1-T03 | `displayRatings` is in the Player state and never saved; `pack.puzzles[i].rating` is never changed | Player tests |
| MP10b1-T04 | `puzzleDetails` prints the notes as extra lines and still declares two parameters | `tests/print-details.test.js`; `tests/puzzlecode-acceptance.test.js` passes |
| MP10b1-T05 | The texts exist in both languages with the same placeholders; `npm run test:quick` and `npm run check` pass | i18n tests; command output |
| MP10b1-T06 | Design §7.7 and §11 and the user guides (both languages) describe the display rating and the notes | review |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests\display-rating.test.js tests\print-details.test.js tests\player-load.test.js tests\player-i18n.test.js tests\generator-i18n.test.js tests\puzzlecode-acceptance.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required test cases

`tests/display-rating.test.js`:

1. `needsDisplayRating`: true for `{ model: 'difficulty-v2', … }` and `{ model: 'difficulty-v1', … }`; false for
   null, undefined, `difficulty-v3` (full and summary) and `{ model: 'other' }`.
2. `ratingDisplay`, every row of the table, with an English `t` built from `PRINT_TEXTS_EN` and the real
   `levelLabel`: a v2 claim `{ model: 'difficulty-v2', score: 8, level: 'easy', saturated: false }` with a rated entry
   `{ model: 'difficulty-v3', score: 14, level: 'normal', saturated: false, metrics: {…} }` gives that rating and the
   note "Re-rated with the current scale (original: Easy 8, difficulty-v2)"; a saturated v2 claim shows "8+" in the
   note; a derived rating with `censored: true` and `censusUndecided: 3` adds "Decisive estimate: 3 alternatives
   undecided within the work limit" (and `censusUndecided: 1` the `_one` form); a summary claim with `censored: true`
   gives "Decisive estimate"; a failed entry gives the claim and "Could not be re-rated"; a pending, missing or
   unavailable entry gives the claim without notes; a v3 claim without `censored` has no note; null claim → null.
3. Scheduler with a scripted `submit` (deferred promises): order (the first wish first, one at a time); a value →
   `rated`; `WorkerTaskError('rating-incomplete', …)` → `failed` with that code; a `PoolAbortError('cancelled')` it
   did not cause → submitted again, still `pending`, then `rated`; `want` without the key in flight → its signal is
   aborted, the entry removed, and a late value is dropped; `PoolError('worker-unavailable')` → `unavailable` and no
   further submit; the cache is not re-requested by a later `want`; the limit (with `limit: 2`) removes the oldest
   settled entry; `dispose` aborts and stops.

`tests/print-details.test.js`: notes become extra lines in both languages; without notes the output is as today;
`puzzleDetails.length === 2`.

`tests/player-load.test.js` (scripted pool with `runIdle` answering `rate` with a fixed v3 rating object, or held):

4. A pack with a v2 claim and one with a v1 claim (the Player sample's first puzzle has a v2 claim; build a v1 variant
   by changing the model of the claim in a parsed copy): after the scripted reply, the state's `displayRatings` has the
   rated entry, and `ratingDisplay` of the open puzzle gives the derived rating with the re-rated note;
   `pack.puzzles[0].rating` is deep-equal to the stored claim before and after.
5. A puzzle without a claim: no `rate` task is ever posted.
6. Navigation: a reply that arrives after the pack was replaced is dropped (no entry for the old key appears after the
   replacement); the request in flight was aborted through its signal.
7. No worker (`createPool` throws `PoolError('worker-unavailable')`, or a pool without `runIdle`): entries
   `unavailable`, no note, no error state.
8. Unrateable: the scripted `rate` answers `{ error: 'rating-incomplete' }` (or `unsatisfiable`) → `failed`, and the
   view shows the stored claim with "Could not be re-rated".
9. Overlap: with a verification in flight (its `run` held), the display request waits; the verification's result is
   applied unchanged; then the display request runs. Opening another puzzle (a new verification) while a display
   request runs aborts it and it is submitted again after (it ends `rated`).
10. Estimate notes: a v3 claim in a pack with `censored: true` and metrics (`censusUndecided: 2`) shows the note with
    2; a summary claim with `censored: true` (a pack without metrics, as a code gives) shows "Decisive estimate".
11. The code of a re-rated puzzle is the code of its stored claim: `puzzleSnapshot(...)` of the open puzzle carries the
    stored v2 claim (the print and share snapshots are unchanged).

## Definition of done & handoff

- Every criterion has its evidence; the reply lists the exports of `core/browser/display-rating.js`, the state field,
  the texts, and the test counts.
- Handoff to MP10b2: use the same module in the Generator (`client.submitAuxiliary`), update the browser pages whose
  expected rating texts change in the Player (`tests/browser/player-load.js:228-229, 275-277, 570`,
  `tests/browser/puzzle-code-print.js:466`, `tests/browser/puzzle-code-acceptance.js:1024`, `tests/browser/print.js`
  if it uses the Player's jobs, `tests/browser/acceptance.js:240-243`) and run gate GC-P2 display.

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
