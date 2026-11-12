# MP09a2 — Saved Generator sets with two pieces of the same shape: removal and a one-time notice

| Header | Value |
|---|---|
| ID | MP09a2 (second part of the report's MP09a) |
| Depends on | MP09a1 (accepted and committed) |
| Estimated size | Small: about 200–300 changed lines (state and app about 50, locales about 6, tests about 120–200, documents about 25); about 25–40 minutes |
| Owner role | Generator |
| Milestone | M5 — v3 active |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-34 (duplicate shapes refused; the saved-set notice); clarifications C4 (b) (owner), C6; cross-review FP03, FP07 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`); check-list §4.1 (traceability only) |
| Gates owned | none |
| Implementation status | Not started |

## Goal & business context

Since MP09a1, a piece set with two pieces of the same shape is refused everywhere. A Generator user may still have
such a set saved in the browser from before (it was importable). The owner decided (C4 (b)) that such a set is
removed, and that the Generator says so **once**, in English and Vietnamese, the first time it starts after the
change. Once means once: the cleaned state is saved at that start, so a reload neither shows the notice again nor
finds the removed sets. The other saved sets and the settings restore exactly as before.

## Scope

### In scope

- `generator/state.js`: the refusal count and the notice in `restoreState`; a startup save helper
  `saveRestoreCleanup`.
- `generator/app.js`: one call of `saveRestoreCleanup` after the persistence is created.
- `generator/locale.en.js`, `generator/locale.vi.js`: the notice texts.
- Tests in `tests/generator-state.test.js` (and the i18n parity test if it lists keys).
- Documents: design §10.7, `docs/design-brief.md`, both user guides.

### Out of scope

- The pack reader, the codes and the import dialog (MP09a1); anything else in the Generator.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Every new visible text has a key in both Generator packs with the same keys and `{count}` placeholder (the i18n tests
  check it); natural Vietnamese with the locale's existing terms (mảnh, bộ mảnh, hình dạng).
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no test name containing `slow`.
- Run only the commands of the test plan (no browser page; no gate); never stage, commit, stash, reset, push or switch
  branches; never edit `tasks/difficulty-v3/` or the reports.

## Inputs & context

### Restore today (anchors at HEAD `3fd99ff`; find moved lines by the quoted text)

- `restoreState(stored, base)` (`generator/state.js:992`) keeps a saved set only when `readSavedSet` (885-899)
  returns non-null (the `keep` closure at 1022-1027, and the current set at 1048); a refused set is silently dropped.
  Since MP09a1, `readSavedSet` refuses a set whose `setPack` has two pieces of the same shape, because
  `validatePack` reports `duplicate-shape` (an error with `params { piece, first }`).
- `loadGeneratorState(storage)` (1079-1087) reads the stored snapshot and returns `restoreState(stored)`; it never
  writes.
- `createPersistence(store, storage, o)` (1104-1190): `dirty` starts false and the subscriber sets it only when a key
  of `PERSISTED_KEYS` (1090-1094) changes; `flush()` and `destroy()` write only when a timer is pending; `saveNow()`
  writes the full current state at once (failures go to `o.onFailure`, never thrown: `attempt`, 1141-1153).
- `createGeneratorApp` (`generator/app.js:90`) creates the store from `loadGeneratorState(io)` (96) and the
  persistence (101-108, with the `toast.saveFailed` toast as `onFailure`). Nothing saves at start, so without this
  task the cleaned state is written only after the user's first edit: a reload before it shows the notice again
  (SA2's read-only probe: zero writes after `flush()` and `destroy()` without an edit).

### The removal and the notice (C4 (b), owner)

- `duplicateShapeRefusal(saved)` (new, not exported unless a test needs it): true when `saved` is an object whose
  `setPack` fails `validatePack` with a first issue of code `duplicate-shape`.
- In `restoreState`, count the dropped saved sets for which it is true: every list of `setsByBoard`, the old
  `setHistory`, and the current set. The other sets restore as before.
- When the count n is at least 1, `restoreState` returns `{ ...fitSet(state), notice }` with
  `notice = { code: 'M-DUPLICATE-SETS', text, kind: 'warning', actions: [], retext }`, where `text = retext()` and
  `retext = () => t('message.M-DUPLICATE-SETS', { count: n })` (the `_one` form for n = 1). Setting it after
  `fitSet` keeps it from being cleared by `freshSetExtras`. `notice` is not in `PERSISTED_KEYS` and `serializeState`
  (970-983) does not write it: the notice itself is transient.
- **Startup save** (FP03): new export in `generator/state.js`:

  ```js
  /**
   * Saves the restored state once when restoring removed saved sets with two pieces of the same shape (C4 (b)), so
   * that a reload neither shows the notice again nor finds the removed sets. A failed write is reported through the
   * persistence's `onFailure` and never thrown; the notice stays on screen either way.
   * @param {GeneratorStore} store
   * @param {{ saveNow(): void }} persistence
   * @returns {boolean} Whether a save was requested.
   */
  export function saveRestoreCleanup(store, persistence) {
    if (store.getState().notice?.code !== 'M-DUPLICATE-SETS') {
      return false;
    }
    persistence.saveNow();
    return true;
  }
  ```

  In `createGeneratorApp`, call `saveRestoreCleanup(store, persistence);` right after `const persistence =
  createPersistence(...)` (before the address import at 263-279), and import it with the other state functions (line
  15). Nothing else in `app.js` changes. The notice is on screen at start through the existing notice host and
  follows a language switch through `retext` (app.js:303).
- An invalid set is never kept as playable.

### Texts (Generator only)

| Key | File(s) | English | Vietnamese (suggested) |
|---|---|---|---|
| `message.M-DUPLICATE-SETS` | `generator/locale.*.js` | {count} saved piece sets with two pieces of the same shape were removed: such sets can no longer be used. | Đã xóa {count} bộ mảnh đã lưu có hai mảnh cùng hình dạng: những bộ mảnh như vậy không còn dùng được nữa. |
| `message.M-DUPLICATE-SETS_one` | `generator/locale.en.js` only (plural form, as `card.toPlace_one`) | {count} saved piece set with two pieces of the same shape was removed: such sets can no longer be used. | (none: Vietnamese has one form) |

### Test fixtures

- The existing pattern of `tests/generator-state.test.js:433-460`: `dto = JSON.parse(JSON.stringify(serializeState(
  { ...state, puzzles: samplePuzzles })))` holds a valid saved set (`sampleSet`, the Player sample's piece set), and
  `restoreState({ ...dto, setsByBoard: { whatever: [dto, { bad: true }, dto] } })` restores two sets (a damaged set
  is left out; equal sets are not merged on restore).
- **Twin set**: `twinDto`, a deep copy of `dto` whose `setPack.pieces[1].cells` is replaced by a copy of
  `setPack.pieces[0].cells` (two pieces of the same shape). The test first asserts that `validatePack(twinDto.setPack)`
  fails with the first issue `duplicate-shape`, so that the fixture tests this rule and not another refusal.
- `fakeStorage` of `tests/generator-state.test.js:35-50` (it records every write in `writes.state`; `failState`
  makes a write fail) and `fakeTimers` (54) as the existing persistence tests use them (537-600).

## Files to create/modify

### Exclusive ownership

- `generator/state.js` (`restoreState`, `duplicateShapeRefusal`, `saveRestoreCleanup` only), `generator/app.js` (the
  one call and its import), `generator/locale.en.js`, `generator/locale.vi.js` (the notice keys only).
- `tests/generator-state.test.js`; `tests/generator-i18n.test.js` (only if a parity list must name the keys).
- Documents of the documentation slot.

### Documentation slot

- `docs/design-detail.md` §10.7 (Generator notices and messages): M-DUPLICATE-SETS, shown once at start when saved
  sets were removed, and the startup save that makes it once.
- `docs/design-brief.md` (FP07), section "Generator: make a challenge", the paragraph "Board edits never delete work …
  are kept in this browser": one sentence: a saved piece set with two pieces of the same shape (mirror images
  included) can no longer be used; it is removed the first time the Generator starts after this change, with a
  one-time message.
- `USERGUIDE.md` and `USERGUIDE.vn.md`, the item "Saved work" (English guide around line 120): the same sentence.

## Implementation steps

1. `duplicateShapeRefusal`, the count and the notice in `restoreState`.
2. `saveRestoreCleanup` and its call in `createGeneratorApp`.
3. Locale keys; tests (test plan); documents; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP09a2-B01 | A saved Generator set with two pieces of the same shape is removed at start with a notice that names how many sets were removed, in English and Vietnamese; the other saved sets restore unchanged | generator-state tests |
| MP09a2-B02 | The notice appears once: after the start that removed the sets, a reload shows no notice and the removed sets are gone from storage, even when the user changed nothing | startup-save test |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP09a2-T01 | The notice is set once by `restoreState`, follows a language switch (`retext`) and is never persisted | generator-state tests |
| MP09a2-T02 | `saveRestoreCleanup` writes exactly once when the notice is present and never otherwise; a failing storage does not throw, reports through `onFailure`, and leaves the notice on screen | generator-state tests |
| MP09a2-T03 | `createGeneratorApp` calls `saveRestoreCleanup` right after creating the persistence; no other change in `app.js` | diff review |
| MP09a2-T04 | `docs/design-detail.md` §10.7, `docs/design-brief.md` and both user guides describe the removal and the one-time notice (FP07) | review |
| MP09a2-T05 | Key parity of the Generator packs; the targeted run, `npm run test:quick` and `npm run check` pass | command output |

## Test plan

### Required test cases (`tests/generator-state.test.js`)

| Case | Expected |
|---|---|
| storage `{ ...dto, setsByBoard: { [key]: [dto, twinDto, dto] } }` | the twin set is dropped, the two others restore unchanged, `notice.code === 'M-DUPLICATE-SETS'` with the `_one` English text |
| two twin sets (`[twinDto, dto, twinDto]`) | the plural text with 2 |
| a twin current set (`{ ...twinDto, setsByBoard: {} }`) | counts too |
| storage without twins | no notice; `saveRestoreCleanup` returns false and nothing is written |
| startup save (FP03) | `loadGeneratorState(io)` with one twin set, a store from it, `createPersistence(store, io, timers)`, then `saveRestoreCleanup(store, persistence)` returns true and makes exactly one write; the written snapshot equals `serializeState` of the restored state: the valid sets, not the twin set; `loadGeneratorState(fakeStorage({ state: <that write> }))` has no notice; `flush()` and `destroy()` afterwards add no write |
| failing storage | with `failState` returning true (and with a throwing `setGeneratorState`), `saveRestoreCleanup` does not throw, `onFailure` is called, and the store's notice is still there |
| `serializeState` of the restored state | has neither the notice nor the twin set |
| `retext` after switching to Vietnamese | the Vietnamese text |

### Exact commands

```powershell
node --test tests\generator-state.test.js tests\generator-i18n.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; the reply lists every changed test expectation with its reason.
- Handoff to MP17: the release-note sentence about removed saved sets.

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
