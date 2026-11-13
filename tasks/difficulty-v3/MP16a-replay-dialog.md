# MP16a — Generation Steps dialog: model, dialog, board highlight and score table

| Header | Value |
|---|---|
| ID | MP16a (first part of the report's MP16; MP16b adds the card button, the wiring, the browser page, gate GB-P4 and the documents) |
| Depends on | MP15b (accepted and committed: `client.replayPuzzle`, `ReplayResult`, the step table of MP15a2) |
| Estimated size | Large: about 800–1,000 changed lines (`replay-model.js` about 250, `replay-dialog.js` about 250, `svg-board.js` about 20, locales about 160, CSS about 80, tests about 250); about 60 minutes |
| Owner role | Generator UI |
| Milestone | M9 — Generation Steps |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-30 (score tables and views), RES-31 (dialog), RES-29 (statuses; closing cancels only the replay); clarification SA2-Q-P10 (a) (plan author); design §11.11 (accessibility); check-list §4.2 D33, D34 |
| Gates owned | none (the browser checks of this dialog run in MP16b, gate GB-P4) |
| Implementation status | Not started |

## Goal & business context

The owner asked for a way to see how the generator made a puzzle (plan P4). This task builds the "How it was made"
dialog of the Generator: it plays the steps that the replay returns — the piece count, the carving, the pieces, the
layout walk, the clue sets that were rated, the repairs and the final puzzle — on a board, with a sentence for each
step and the score table of every rated step (rules, guesses with their alternatives and census, penalty, total,
band). It says plainly when steps are not available for a puzzle and when a replay did not match or was stopped.
MP16b puts the button on each puzzle card and verifies the dialog in a browser.

## Scope

### In scope

- `generator/ui/replay-model.js` (new, pure, no DOM): views, the compact filter, step sentences, score-table rows,
  stage availability, status texts, and a controller (state machine) for loading, stepping, playing and closing.
- `generator/ui/replay-dialog.js` (new, DOM): the native `<dialog>` built like the share dialog, using the model.
- `core/browser/svg-board.js`: the additive `highlightedIds` option.
- `generator/locale.en.js`, `generator/locale.vi.js`: every text of the dialog (D34 key list) in both languages.
- `generator/generator.css`: the dialog's styles.
- Tests: `tests/replay-model.test.js` (new).
- Documents: `docs/design-detail.md` §6.12 (views and score table) and §11.11 (the dialog's accessibility).

### Out of scope

- The card button, `generator/app.js` and `generator/ui/puzzle-panel.js` wiring, the browser page and gate GB-P4,
  the other living documents (MP16b).
- Any change to the replay, the client or the engine. The Player has no Generation Steps.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Browser modules: `// @ts-check`, JSDoc, ES modules with `.js`; `replay-model.js` has no DOM, no timers of its own
  (the scheduler is injected) and no storage.
- Every visible text has a key in both packs with the same `{placeholders}` (`tests/generator-i18n.test.js:23`), in
  natural Vietnamese. No text is built by concatenating translated fragments.
- Run only the commands of the test plan; no browser page in this part. Never stage, commit, stash, reset, push or
  switch branches; never edit `tasks/difficulty-v3/`, the reports or `docs/difficulty-v3/`.
- **Amendment L1 (lock; orchestrator decision 2026-11-13).** The Sudoku repository runs on the same machine. Save the
  helper `Invoke-Dv3Timed` of check-list §7 ("Shared-machine lock protocol") verbatim as
  `tests/artifacts/MP16a/dv3-lock.ps1` and dot-source it in every call. Every test run of the test plan goes through
  it, as written there: one bounded command per acquisition of the lock, at most 590 s, at least 15 s between
  releasing the lock and taking it again (the helper waits), never a lock held across a series of commands. Only
  `npm run check` and, while you work, a single test file that ends within 10 seconds run without it. A command that
  the helper stops at its limit has an error: report it, never rerun it outside the helper. The reply gives each
  invocation's label, exit, seconds and lock wait.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

### The replay result (MP15a1, MP15a2, MP15b)

```text
client.replayPuzzle({ set, puzzle, setOrigin, made }, { signal }) -> Promise<ReplayResult>
  rejects: PoolAbortError('cancelled' | 'closed'), WorkerTaskError, PoolError ('worker-unavailable')
ReplayResult = { status: 'matched' | 'unavailable' | 'mismatch' | 'incomplete', reason,
                 stages: { set, candidate, final }, compared, work, steps }
  stages.set, stages.candidate: 'replayed' | 'unavailable' | 'mismatch' | 'stopped' (candidate also 'calibration')
Step = { stage (1-7), kind, board: { placed: { id, cells, pose }[], lifted: string[], clues: string[] },
         rating, breakdown, detail, band, note, args }
```

- Stages: 1 piece count (`count`), 2 carving (`carve`), 3 pieces (`piece`), 4 layout (`start`, `retile`), 5 clues
  (`rated`, `skip`, `unrateable`, `rejected`, `selected`), 6 uniqueness (`repair`), 7 the puzzle (`final`, always the
  last step). Steps come in the order they happened: in `require` mode stages 5 and 6 interleave (a repair, then more
  rated clue sets). A calibration puzzle has no stage 4 and its clue steps carry `args.source === 'calibration'`. A
  stage whose state is `stopped` was cut by a limit: it has its steps so far, or none.
- `note` is `replay.step.<kind>`; `args` per kind as MP15a2's table: `count { k, min, max }`, `carve { mode, parts }`,
  `piece { n }`, `start { start }`, `retile { step, lifted, changed }`, `rated { sequence, phase, source }`, `skip {
  sequence, source }`, `unrateable { sequence, phase, source, reason }`, `rejected { sequence, phase, source, reason
  }`, `repair { repairSequence, added, accepted, reason }` (`added` is null for a uniqueness check that failed before
  adding a clue, D31), `selected { sequence, repairSequence, source }`, `final { status, detailStep }`.
- `breakdown`: `{ base, rule, guess, penalty, unrounded, score }` (`breakdownV3`) for a v3 rating with metrics; `{
  model: 'difficulty-v2', u, b, score }` for a v2 claim whose `U` and `B` are valid numbers; null otherwise (a summary
  claim, opaque legacy metrics, another model): null means "not available", never 0 (cross-review SP12). `detail`
  (`RatingDetail`): `first.choices` and `first.census` (`{ c, kLow, f, u }` per final-path guess node) when the step's
  rating was computed during the replay; null otherwise. The final step's `detail` is always null; when the replay
  matched a full claim, `args.detailStep` is the index of the step whose `detail` measured the final puzzle (the
  winning `rated` step, or the accepted `repair` step), else null (cross-review SP11). The final step's `placed` holds
  the stored solution, or only the stored clues when the puzzle was shared without its solution. `rating.metrics` has
  `U`, `deductionTier`, `rules` (R1-R9), `G`, `Gproved`, `info`, `solutions`, `censusComplete`, `censusUndecided`;
  `rating.censored === true` marks an estimate.
- Unavailable stages have no steps; the result's `reason` names why (`no-set-origin`, `set-versions`, `no-record`,
  `record-invalid`, `completion`, `overflow`, `record-versions`, `calibration-needs-set`); mismatch reasons: `set`,
  `skips`, `candidate-failed`, `board`, `pieces`, `witness`, `clues`, `rating`, `solution`; incomplete reasons:
  `steps`, `bytes`, `work`.

### Views (RES-30)

- **Every step**: all steps in order.
- **Compact** (default): the first step of each stage, every `repair` step, the `selected` step, the final step, and
  each `rated` step that strictly improves the best so far under the P1 comparator `ranked` of
  `core/engine/clues.js` (cross-review SP15: all three of its keys), computed over the `rated` steps in order: `d(step)
  = [bandDistance, centreDistance, key]` with `bandDistance = 0` when `min <= score < max` (max null: no upper edge),
  else the distance to the nearest in-band score (`min - score`, or `score - max + 1`); `centreDistance = |score -
  (min + max) / 2|` (0 when `max` is null); and `key` the canonical clue key of the step's clue set,
  `clueKey(set.board, set.pieces, poses)` (`core/engine/keys.js`) with `poses` = the poses of the `board.placed` items
  whose ids are in `board.clues`. A step is kept when `d` is lexicographically smaller (numbers, then the key as a
  string with `<`) than every earlier `rated` step's `d`; an equal `d` (the same clue set) is not an improvement. The
  filter takes the key function as a parameter (`compactSteps(steps, keyOf)`), so tests can give synthetic keys. Keep
  the original order; never duplicate a step. Generation's own tie-break is not changed.
- Neither view presents a partial trace as the generated puzzle: with status `incomplete` or `mismatch` the status
  line stays visible on every step and the final step's sentence says "stored puzzle", not "generated puzzle".

### Score table (RES-30)

For a step with a rating:

| Row | Content |
|---|---|
| Base | `breakdown.base` with U |
| Rules | `breakdown.rule` with the deduction tier and the counts R1-R9 (only nonzero ones listed, or "none") |
| Guesses | `breakdown.guess` with G, `Gproved` and `info` (at most 6 decimals, presentation only) |
| Guess nodes | from `detail`: one row per final-path guess node: c alternatives, kLow still possible, f proved impossible, u undecided, counted (kLow < c) or not; "not available" when `detail` is null |
| Penalty | `breakdown.penalty` with the `solutions` class (few, many; none for unique and unknown) |
| Total | the rounded score (`rating.score`); with `censored: true` the estimate note (with the number of undecided alternatives `metrics.censusUndecided` for a full claim; without a number for a summary claim) |
| Band | `band` (`min`–`max`, or "from min" when `max` is null) |

- A summary claim (no metrics, `breakdown` null) shows only the total and the band; every other row reads "not
  available" — never 0 (SA2-4 JC09). The same holds for any rating whose `breakdown` is null (opaque legacy metrics,
  another model; cross-review SP12).
- A legacy v2 claim with a breakdown shows the rows "2 × U" (`breakdown.u`), "8 × log10(1 + B)" (`breakdown.b`) and
  the total.
- The final step's Guess nodes come from `steps[args.detailStep].detail` when `args.detailStep` is not null (the
  measurement of the matched final puzzle, cross-review SP11), else "not available".
- An `unrateable` step shows "unrateable: the deduction path was capped" and no score; a `rejected` step shows its
  table and "refused: no proved guess" (RES-35).

### The controller (in `replay-model.js`)

```js
/**
 * @param {{ run: (source: ReplaySource, signal: AbortSignal) => Promise<ReplayResult>,
 *   schedule: (fn: () => void, ms: number) => unknown, unschedule: (handle: unknown) => void,
 *   onChange: (state: ReplayViewState) => void, intervalMs?: number }} o   // intervalMs default 900
 */
export function createReplayController(o)
// methods: open(source), close(), setView('compact' | 'all'), prev(), next(), seek(index), play(), pause(),
//          getState(), dispose()
// ReplayViewState = { phase: 'closed' | 'loading' | 'ready' | 'failed', result: ReplayResult | null,
//                     failure: 'worker-unavailable' | 'interrupted' | 'failed' | null, view: 'compact' | 'all',
//                     index: number, playing: boolean }
```

- `open` starts `run(source, controller.signal)` with a fresh `AbortController`; `loading` until it settles; a
  rejection after `close` is ignored; while open, `PoolAbortError('cancelled')` (a new generation took the worker,
  RES-29) gives `failure: 'interrupted'`, `PoolError` `worker-unavailable` gives `failure: 'worker-unavailable'`, any
  other rejection `failure: 'failed'`. A result or rejection from an earlier `open` (stale) is ignored. Reopening
  starts a new run.
- `close` aborts the controller's signal (this cancels **only** the replay, RES-29/RES-31), stops playback and returns
  to `closed`; it never calls anything else (no client `cancel`, no generation call).
- `play` advances one visible step every `intervalMs` until the last, then stops; `pause`, `prev`, `next`, `seek` and
  `setView` stop playback; `setView` keeps the current step when it is visible in the new view, else the nearest
  earlier visible one. Playback state changes call `onChange`; the dialog decides what the live region announces.

### Board highlight (`core/browser/svg-board.js`, additive)

- `BoardViewModel` (lines 31-42) gains `@property {readonly string[]} [highlightedIds] Pieces drawn with a highlight
  outline (Generation Steps); clues and placements alike.`
- In `renderPieces` (near line 780, `const selected = !clue && m.selectedId === pose.piece;`), compute `highlighted =
  m.highlightedIds?.includes(pose.piece) === true` and pass it to `drawPiece`; in `drawPiece` (line 467) a highlighted
  piece gets `data-highlighted="true"` on its group and, after the outline, `svgEl('path', { class: 'pm-highlight', d,
  fill: 'none', stroke: FOCUS_COLOR, 'stroke-width': 0.1, 'stroke-dasharray': '0.25 0.15', 'stroke-linejoin': 'round',
  'pointer-events': 'none' })`. Without `highlightedIds` the output is unchanged (the existing rendering checks keep
  passing). The browser check of this option is MP16b's.

### The dialog (`generator/ui/replay-dialog.js`)

```js
/**
 * @param {{ host: HTMLElement, t: (key: string, params?: object) => string,
 *   run: (source: ReplaySource, signal: AbortSignal) => Promise<ReplayResult>, closeKey: string }} options
 *   run is (source, signal) => client.replayPuzzle(source, { signal }); ReplaySource = { set, puzzle, setOrigin, made }
 * @returns {{ element: HTMLDialogElement, open(source: ReplaySource, from?: Element | null): void, close(): void,
 *   isOpen(): boolean, refreshTexts(): void, dispose(): void }}
 */
export function createReplayDialog(options)
```

- Built like `createShareDialog` (`core/browser/share-dialog.js:288-345`: the `el` helper of `core/browser/dom.js`,
  the header with title and close cross, `data-i18n` on fixed texts, `refreshTexts()` for the rest), class
  `pm-replay-dialog pm-pop`, `aria-labelledby` the title, `data-role="replay-dialog"`.
- Content: the status line (`role="status"`); the stage list (seven stages, each marked available or "steps not
  available for this puzzle"; stages 1-3 follow `result.stages.set` and stages 4-6 `result.stages.candidate`: every
  stage of a group whose state is `stopped` is marked `replay.stage.stopped`, with or without steps, and any other
  stage without steps `replay.notAvailable`; stage 7 always has the final step; cross-review SP14, TP12); a board
  host (`mountBoard(host, { mode: 'thumbnail', … })` or the play mode without interaction, `label` from the locale)
  rendered from the current step: `placements` = the `placed` items with a pose that are not clues, `clues` = the
  poses of `board.clues` ids, `highlightedIds` = `board.lifted` for stage 4, the added piece for a `repair` step (none
  when `args.added` is null), the clue ids for `selected`; items without a pose are not drawn (stage 1-3 of an
  incomplete replay); the step sentence; the score table (a `<table>` with a caption) or "no score for this step";
  controls: previous, next, play/pause (one toggle button with `aria-pressed`), a labelled range slider over the
  visible steps (`aria-valuetext` = the step sentence), the view switch (two radio buttons: key steps / every step),
  Close.
- Keyboard: Tab order follows the visual order; Left/Right arrows on the slider (native); Escape closes (native
  `<dialog>` `cancel` event); focus goes to the close button on open and back to the opener on close (as the share
  dialog, lines 445-456); `showModal()` traps focus.
- Live region: the step sentence is in a `role="status"` element that is updated on manual steps and on pause, not on
  every playback tick (RES-31: no announcement of animation ticks); the `prefers-reduced-motion` media query turns
  playback transitions off (steps still advance).
- Loading shows "Replaying the generation…" with the stage list; `failure` shows its message and Close.
- Closing (cross, Close button, Escape) calls `controller.close()`; disposing removes the element.

### Locale keys (D34; EN and VI; placeholders as written)

`replay.button`, `replay.button.aria` (`{title}`), `replay.title`, `replay.close`, `replay.loading`, `replay.failed`,
`replay.failed.worker`, `replay.failed.interrupted`, `replay.board`, `replay.view.label`, `replay.view.compact`,
`replay.view.all`, `replay.prev`, `replay.next`, `replay.play`, `replay.pause`, `replay.slider` (`{n}`, `{total}`),
`replay.stages`, `replay.stage.1` … `replay.stage.7`, `replay.notAvailable` ("Steps not available for this puzzle."),
`replay.status.matched`, `replay.status.unavailable`, `replay.status.mismatch` (`{field}`), `replay.status.incomplete`
(`{reason}`), `replay.reason.<r>` for the eight unavailable reasons, `replay.field.<f>` for the nine mismatch reasons,
`replay.limit.<l>` for `steps`, `bytes`, `work`, the step sentences `replay.step.count` (`{k}`, `{min}`, `{max}`),
`replay.step.carve.macro` (`{parts}`), `replay.step.carve.flat`, `replay.step.piece` (`{n}`),
`replay.step.start.witness`, `replay.step.start.restart`, `replay.step.retile.changed` (`{step}`, `{lifted}`),
`replay.step.retile.same` (`{step}`, `{lifted}`), `replay.step.rated` (`{sequence}`, `{score}`),
`replay.step.rated.calibration` (`{sequence}`, `{score}`), `replay.step.skip` (`{sequence}`), `replay.step.unrateable`
(`{sequence}`), `replay.step.rejected` (`{sequence}`, `{score}`), `replay.step.repair.added` (`{piece}`),
`replay.step.repair.accepted` (`{piece}`, `{score}`), `replay.step.repair.rejected.<reason>` (`{piece}`) for
`not-proved`, `path-capped`, `no-proved-guess`, `out-of-band`, `excluded`, `replay.step.repair.failedBeforeClue` (no
placeholder: "The uniqueness check failed before any clue was added."; used when `args.added` is null, cross-review
SP14, so that no piece name such as "null" is ever shown), `replay.stage.stopped` ("Stopped at a limit."),
`replay.step.selected`,
`replay.step.final.generated`, `replay.step.final.stored`, and the table `replay.table.caption`, `replay.table.base`
(`{u}`), `replay.table.rules` (`{tier}`, `{counts}`), `replay.table.rules.none`, `replay.table.guess` (`{g}`,
`{gproved}`, `{info}`), `replay.table.node` (`{n}`, `{c}`, `{klow}`, `{f}`, `{u}`), `replay.table.counted`,
`replay.table.notCounted`, `replay.table.penalty` (`{solutions}`), `replay.table.total`, `replay.table.band` (`{min}`,
`{max}`), `replay.table.bandOpen` (`{min}`), `replay.table.unavailable`, `replay.table.none`, `replay.table.v2.u`,
`replay.table.v2.b`, `replay.table.unrateable`, `replay.table.refused`. The estimate note reuses
`rating.note.estimate_one`, `rating.note.estimate_other` (`{count}`) and `rating.note.estimateShort` of
`core/browser/print-texts.js` (MP10b1). `replay.step.<kind>` sentences are chosen by `stepText(step)`: the note plus a
variant (`carve` by `args.mode`, `start` by `args.start`, `retile` by `args.changed`, `rated` by `args.source`, `repair`
by `added` (null: `failedBeforeClue`), `accepted` and `reason`, `final` by the result's status: `generated` only for
`matched`). The stage list marks a stage `stopped` (its state in `result.stages`) with `replay.stage.stopped`.

## Files to create/modify

| File | Change |
|---|---|
| `generator/ui/replay-model.js` | new |
| `generator/ui/replay-dialog.js` | new |
| `core/browser/svg-board.js` | `highlightedIds` |
| `generator/locale.en.js`, `generator/locale.vi.js` | the D34 keys |
| `generator/generator.css` | `.pm-replay-dialog` styles |
| `tests/replay-model.test.js` | new: cases 1–10 |
| `docs/design-detail.md` | §6.12 (views and table) and §11.11 |

Exclusive ownership while this task runs: the files above.

### Documentation slot

- §6.12 "Generation Steps (replay)" (created by MP15a1, steps by MP15a2): a paragraph on the two views, the compact
  filter (the full `ranked` comparator) and the score table (unavailable data never shown as zero).
- §11.11 "Accessibility" (line 2443 at HEAD): the dialog's focus, keyboard, live region (no tick announcements),
  reduced motion and labelled slider.

## Implementation steps

1. `replay-model.js`: pure helpers and the controller; its tests.
2. `svg-board.js`: `highlightedIds`.
3. Locales (EN, then natural VI), CSS (layout: board and table side by side on wide screens, stacked on phones;
   theme variables of `core/browser/page.css` `.pm-dialog` 355-374; scrollable body).
4. `replay-dialog.js`; the documents; the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP16a-B01 | A user can step or play through how a puzzle was made, with a sentence and, for every rated clue set, the full score table | cases 2–6; MP16b's browser checks |
| MP16a-B02 | Steps that cannot be shown say "Steps not available for this puzzle"; a mismatch or a stopped replay is shown with its status and never as the generated puzzle | cases 7, 8 |
| MP16a-B03 | Closing the dialog cancels only the replay, never a generation | case 9 |
| MP16a-B04 | Everything is in English and Vietnamese | `tests/generator-i18n.test.js` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP16a-T01 | Compact filter exactly as specified (deterministic, ordered, no duplicates); every-step view is the identity | cases 1, 2 |
| MP16a-T02 | Score-table rows as specified, including summary, v2, unrateable, refused and estimate cases, a null breakdown with metrics, and the final step's guess nodes through `args.detailStep`; unavailable never 0 | cases 3–6 |
| MP16a-T03 | Controller state machine: loading, ready, failure kinds, stale results ignored, playback, view switch, close aborts only its own signal | cases 9, 10 |
| MP16a-T04 | `highlightedIds` is additive: no change without it | review; MP16b's rendering check |
| MP16a-T05 | Locale parity and placeholders | `tests/generator-i18n.test.js` |

## Test plan

### Exact commands

```powershell
. tests\artifacts\MP16a\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP16a targeted tests' -NodeArgs @('--test', '--test-skip-pattern=slow',
  'tests/replay-model.test.js', 'tests/generator-i18n.test.js', 'tests/render-model.test.js')
if ($r.Exit -ne 0) { throw 'targeted tests failed' }
$r = Invoke-Dv3Timed -Task 'MP16a quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
```

### Required test cases (`tests/replay-model.test.js`)

Use a real result: `replayPuzzle` (MP15a2) on the first candidate puzzle of `tests/fixtures/replay-case.json`, built
once per file, plus small synthetic step lists.

1. Compact filter on synthetic `rated` steps with band 17–25 (centre 21) and scores 10, 30, 12, 20, 21, 21, 22 (in
   that order) and synthetic keys `k1` … `k7` given by `keyOf`: `d` is [7, 11, k1], [6, 9, k2], [5, 9, k3], [0, 1, k4],
   [0, 0, k5], [0, 0, k6], [0, 1, k7], so kept are 10, 30, 12, 20 and the first 21; the second 21 is not kept
   (`k6 > k5`) and 22 is not kept. With the second 21's key `k0` (smaller than `k5`) it is kept: a tied score with a
   smaller clue key is a strict improvement under `ranked` (cross-review SP15). With `max: null` and min 17, scores
   10, 12, 17, 30 (`d` [7, 0, …], [5, 0, …], [0, 0, …], [0, 0, …], keys increasing) keep 10, 12 and 17. On the real
   result, `keyOf` is `clueKey` as specified and the kept `rated` steps are those an independent loop with
   `clueKey` keeps.
2. On the real result: the compact view contains the first step of each stage present, every `repair` step, the
   `selected` step and the final step, in the original order, without duplicates; the every-step view equals
   `result.steps`.
3. Score table of a real `rated` step: rows Base, Rules, Guesses, Guess nodes (one per `detail.first.census` entry,
   counted exactly when kLow < c), Penalty, Total (equal to `rating.score`), Band; the sum `base + rule + guess -
   penalty` equals `breakdown.unrounded`. The final step of the real result (SP11, TP12): its own `detail` is null,
   `args.detailStep` is the index i of the step that measured the final puzzle (`steps[i].detail` not null), and its
   Guess nodes rows equal those of `steps[i]` (same count, same c, kLow, f, u and counted marks); a synthetic copy of
   the final step with `args.detailStep: null` shows the Guess nodes row as the "not available" key.
4. A summary claim step (rating without metrics, breakdown null): only Total and Band have values; every other row is
   the "not available" key, never a 0. The same for a synthetic step whose rating has metrics but whose `breakdown` is
   null (as MP15a2 gives for opaque or overflowing legacy metrics, SP12, TP11): no row shows 0, `Infinity` or `NaN`.
5. A v2 final claim with metrics: rows "2 × U", "8 × log10(1 + B)" and Total.
6. An `unrateable` step: the unrateable row and no score; a `rejected` step: the table and the refused row; a
   `censored: true` rating: the estimate note with the count from `censusUndecided` (full claim) and without it
   (summary claim).
7. `stepText` returns an existing locale key (checked against `generator/locale.en.js`) with the documented
   placeholders for every kind and variant of the real result and of synthetic `carve` (macro, flat), `start`
   (witness, restart), `retile` (changed, same) and the five repair reasons; the final step uses
   `replay.step.final.generated` only for status `matched`. A synthetic `repair` step with `args: { repairSequence: 1,
   added: null, accepted: false, reason: 'not-proved' }` (a uniqueness check that failed before adding a clue; SP14,
   TP12) gives `replay.step.repair.failedBeforeClue` with no placeholder; its English and Vietnamese texts exist, the
   sentence rendered in each language contains neither "null" nor "{piece}", and the step highlights no piece.
8. Stage list and status text (SP14, TP12): (a) status `unavailable` (reason `completion`): every stage without steps
   is marked `replay.notAvailable` and the status text names `replay.reason.completion`; (b) `mismatch` (reason
   `rating`): the status text names `replay.field.rating`; (c) `incomplete` (reason `work`) with `stages.set ===
   'replayed'` and `stages.candidate === 'stopped'` (a synthetic result cut after one `rated` step): stages 4-6 are
   marked `replay.stage.stopped`, stage 5 keeps its step, and none of stages 4-6 is marked `replay.notAvailable`;
   (d) the early stop of MP15a1's case 8 (`maxSteps` 1: `stages.set` and `stages.candidate` both `'stopped'`, the
   final step only): stages 1-6 are marked `replay.stage.stopped`, distinct from `replay.notAvailable`, and the status
   text names `replay.limit.steps`.
9. Controller: `open` → `loading` → `ready`; `close` aborts the signal given to `run` and nothing else; a result that
   arrives after `close` or after a second `open` is ignored; a rejection `PoolError('worker-unavailable')` gives
   `failure: 'worker-unavailable'`, a `WorkerTaskError` gives `failure: 'failed'`, a `PoolAbortError('cancelled')`
   while open gives `failure: 'interrupted'` and after `close` changes nothing.
10. Playback with an injected scheduler: `play` advances one visible step per tick and stops at the last;
    `pause`, `next`, `prev`, `seek` and `setView` stop playback; `setView('all')` then `setView('compact')` keeps the
    current step or moves to the nearest earlier visible step.

## Definition of done & handoff

- Every criterion has its evidence; the reply lists the exports, the locale keys added (count) and the test counts.
- Handoff to MP16b: `createReplayDialog({ host, t, run, closeKey })` with `open(source, from)`; the source is `{ set,
  puzzle, setOrigin, made }` from the Generator state; `highlightedIds` on `BoardViewModel`; the browser checks still
  to write (open, step, play, slider, keyboard, cancel, unavailable stages, incomplete and mismatch states, language
  switch, the `pm-highlight` rendering).

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
