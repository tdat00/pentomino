# T17 — Generator board editor, levels, and settings

**ID:** T17  
**Depends on:** T04, T05, T12, T16  
**Estimated size:** 900–1,400 implementation/test lines  
**Owner role:** generator-ui  
**Milestone:** MVP
**Design refs:** §6.2–§6.3, §7.5, §8.6, §10.1–§10.3, §10.6–§10.7.

## Goal & business context

A maker can choose a playable board, paint blocked cells, rotate only its view, and understand which levels/counts the board supports before starting generation.

## Scope

**In scope:** generator shell/store, board editing, presets, level/advanced controls, validation and preferences.  
**Out of scope:** generation jobs and result cards, connected in T18.

## Inputs & context

Own `GeneratorState`:

```ts
{
 board:Board;rotation:number;editUnrotated:boolean;
 levelId:string;seedText:string;keepSeed:boolean;uniqueness:'any'|'require';
 largeBoards:boolean;omitSolutions:boolean; // largeBoards is derived from prefs, not stored twice
 setSeed:string|null;batchIndex:number;
 set:PieceSet|null;calibration:Puzzle|null;puzzles:Puzzle[];
 seenLayouts:string[];seenClues:string[];
 setHistory:readonly SavedSet[];stale:boolean;
 job:null|{requestId:number;revision:string;stage:string;startedAt:number};
 prefs:{labels:boolean;patterns:boolean;timer:boolean;straighten:boolean};
}
```

`createGeneratorStore(initial?)` returns `{getState():GeneratorState, subscribe(listener):unsubscribe, update(patchOrUpdater):void, destroy():void}`. An updater receives the old state and returns a new state; no in-place map/board mutation. State contains editor board separately from `set.board`: stale puzzles must retain their original board and remain playable/exportable.

Consume, do not duplicate:

- T04 `offeredLevels`, `pieceCountRange`, `sizeWindow`, `enabledMaxActive`, qualification flags.
- T05 `preset`, `activeCount`, `validateForGeneration`, `trimMargins`, view math.
- T12 namespaced storage and safe DOM helpers.
- T16 `mountBoard(...,{mode:'edit'})`, `cellAt(...,{includeBlocked:true})`.

### Agreed screen layout (columns × rows notation)

```text
┌ Pentomino Puzzle Generator ───────────────────────────────────── [Open player] ┐
│ ① Board                         │ ② Level                 │ ③ Piece set       │
│ Cols [10] Rows [6] Preset [Rect]│ ○ Very easy ○ Easy       │ A B C D …         │
│ View ⟲45 ⟳45  Edit unrotated    │ ○ Normal ● Hard          │ sizes / Ready ✓   │
│ Trim margins · Undo · Reset     │ Expert · Master · …      │ Show solution     │
│ [editable rotated board]        │ count / size / share     │ previous / next   │
│ 60 / 484 playable · connected   │ Advanced / Generate Set  │ Export set        │
├───────────────────────────────────────────────────────────────────────────────┤
│ ④ Puzzles [quantity] [own level] New Puzzles · Add more · Play all · Export · 🔗│
│ [cards]                     progress · elapsed · Cancel                       │
└───────────────────────────────────────────────────────────────────────────────┘
```

T17 owns the header/Open player link, Board and Level columns, and the shared grid/sticky action-area scaffolding. T18 fills the set/puzzle regions. At≥900 px use three columns above a full-width puzzle row; below900 stack numbered steps1–4 and keep the current Generate/New-Puzzles/Cancel action reachable in a sticky bar. The status text is `{active} / {max} playable squares · connected` (or the applicable validation error).

Limits/device classification:

```text
phone = pointer:coarse AND (deviceMemory<=4 OR deviceMemory unknown OR hardwareConcurrency<=4)
normal desktop484 ->576 only after BQ-1
phone360 ->484 only after BQ-3
desktop largeBoards=true ->676; experimental until BQ-2
generator: active>=30, side<=32, one connected active region
```

Editor:

- Inputs explicitly labeled Columns and Rows, each3–32. Default10 columns×6 rows.
- Resize retains cells still inside bounds and makes new cells active; confirm if edits exist.
- Presets: Rectangle; Heart even N with top-right quarter blocked (N10→75 cells, rounded73), θ45; Diamond N8→64/45°; Cross N9→45/0°; Ring8×8 minus central2×2→60/0°.
- Pointer-down toggles one cell, then paints that new value throughout the gesture. One gesture is one undo step; history50. Keyboard cursor arrows and Space toggle.
- Preserve the gesture’s mapping/view until it ends; do not let active-bound changes move the grid under the pointer.
- View-left adds45°, view-right subtracts45° modulo360; Edit unrotated temporarily renders0. Neither changes logical board or stored angle unexpectedly.
- Trim margins is an explicit structural edit. First structural edit after a set exists asks confirmation, then sets stale; old cards retain their original set.
- Disable painting/settings while a generation job runs; Cancel/navigation remain usable.

Levels/settings:

- Frozen area intervals: VE30–87, Easy32–215, Normal36–348, Hard41+, Expert50+, Master59+, Nightmare81+, Hell-1 164+, Hell-2 266+, Hell-3 450+. Generation never exceeds676.
- Show disabled levels with “needs a larger board” / “needs a smaller board”.
- Show actual range and sizes from APIs, e.g. “Uses 16–18 pieces of 12–34 squares · about 38% pre-placed” for360/Hard.
- The visible set seed is trim+NFC,1–64 code points. Keep seed defaults off. Typing a seed turns Keep seed on; 🎲 draws a fresh seed immediately. Generate Piece Set with Keep seed off first replaces the field with a fresh random seed; with it on, use the text unchanged.
- A newly accepted set stores its actual `setSeed`, starts `batchIndex=0` and has empty layout/clue history, even when regenerated with Keep seed on. Every New Puzzles/Add more request increments that set's index and derives `setSeed+"#"+batchIndex`; failure/cancel does not roll it back. Never reuse a batch seed on the same growing history. Regenerating the same set with Keep seed on reproduces the #1,#2,… sequence from fresh history.
- Uniqueness defaults any. Require is standard at area≤200 or below Hell; above that show its experimental warning, do not claim impossibility.
- Desktop-only Large boards is off initially. Phone policy ignores a persisted desktop opt-in.
- Omit solutions controls export, never solvability or play.
- Changing level/uniqueness keeps pieces but marks old calibration as for its prior settings.

Exact notices needed here:

| ID | Text |
|---|---|
| N-COUNT | This board uses {kmin}–{kmax} pieces at {level}, about {share} % pre-placed. |
| N-LEVELS | Levels above {highest} need a larger board. / Levels below {lowest} need a smaller board. |
| N-CAP | This board has {area} playable squares; the limit on this device is {max}. |
| N-SMALL | A board needs at least 30 playable squares to generate puzzles. |
| N-LARGE | Large board: generation can take up to 2 minutes. |
| N-EXPERIMENTAL | Experimental: boards above {limit} squares may not finish all {q} puzzles within 2 minutes. |
| N-UNIQUE-EXP | On large Hell puzzles, 'Require one solution' is experimental and usually fails. |
| N-STALE | Board changed — generate a new piece set. |

Persist serialized board rows, rotation, settings and committed set state after300 ms; never persist timers, active workers, preview DOM or partial unvalidated candidates. Restore through validators.

Storage DTO: `{v:1,boardRows,rotation,levelId,seedText,keepSeed,uniqueness,omitSolutions,setSeed,batchIndex,setPack:Pack|null,calibrationPack:Pack|null,batchPack:Pack|null,history:{layouts:string[],clues:string[]},setHistory:SavedSet[]}`. Each SavedSet retains its packs, setSeed, batchIndex and history; at most5. Store largeBoards only in prefs; ignore a legacy duplicate in gen:state. Restore that preference before deriving device caps. T18 validates packs and treats restored calibration as an unverified claim.

## Files to create/modify

`generator\index.html`, `generator\app.js`, `generator\state.js`, `generator\strings.js`, `generator\generator.css`; `generator\ui\board-editor.js`, `generator\ui\level-panel.js`; `tests\generator-state.test.js`; `tests\browser\generator-editor.html`, `tests\browser\generator-editor.js`.

## Implementation steps

1. Replace the shell with three desktop panels and stacked numbered mobile steps (<900 px).
2. Add store, device classification and safe persistence.
3. Implement editor/history, rotated hit-testing and structural-change confirmation.
4. Bind level/settings APIs and notices.
5. Expose Generate/New-Puzzles callbacks for T18; keep unfinished job controls disabled until wired.

## Acceptance criteria — Business

- **BAC-1:** Paint/undo/resize/trim/presets work at0°,45°,90°,315°, including reactivating blocked cells.
- **BAC-2:** Rotation never changes active count, pieces or existing puzzle identity.
- **BAC-3:** A 60-cell board offers VE–Master, 360 offers Hard–Hell-2, and device caps are correctly explained.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\generator-state.test.js"` and `node tools\check-conventions.mjs` pass.
- **TAC-2:** At `http://localhost:8080/pentomino/tests/browser/generator-editor.html`, served by T01's Node server, the editor harness passes board counts, stale state and Keep-seed rules.
- **TAC-3:** The current source files keep the app CSP, relative imports, UTF-8/CRLF and no runtime dependency.
- **TAC-4:** No generation, proof or score formula is duplicated in UI code; storage failures do not break editing.

## Test plan

Test default60, Heart75/73, disconnected/<30 masks, phone unknown memory and desktop experimental676. Verify old cards retain their board; largeBoards comes only from prefs; Keep seed regenerates the same set and resets index/history. This task fixes its own layout, focus, sticky-bar and responsive-control defects reported by QA.

## Definition of done & handoff

T18 owns job/result wiring next. Publish store events and action callbacks. Do not consult or copy the parallel static prototype.

## Execution log

| Field | Value |
| --- | --- |
| Status | Done |
| Start | 2026-10-22 21:01:21 (+07:00) |
| End | 2026-10-22 21:17:33 (+07:00) |
| Duration | 16 min 12 s |
| Model | claude-sonnet-5.5 (sub-agent `T17-gen-editor`, general-purpose); ran in parallel with T14, T15, T19 |
| Token usage | 56 model calls; 9,163,446 input (8,939,273 cache read), 134,586 output |
| AI credits | 280.02 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** `node --test tests\generator-state.test.js` (with T15 tests) → green; `check-conventions` OK. Agent run: task tests 25 pass; `npm run test:quick` 557 pass; `npm run check` OK; headless-Edge harness `tests\browser\generator-editor.html` (served on port 8317) → 24/24 pass, no CSP violations; screenshots at 1280 px and 480 px show the three-column layout and the stacked mobile steps with sticky bar.

**Acceptance:** BAC-1..3 and TAC-1..4 pass. Painting with real pointer events at 0°/45°/90°/315° (one drag = one undo step, Heart exterior cell reactivated at 45°); resize, trim and all presets (Heart 75 / 73 rounded); view rotation and Edit-unrotated never touch board/set/puzzles/stale flag; 60 cells → Very easy..Master, 360 → Hard..Hell-2 with "Uses 16–18 pieces of 12–34 squares · about 38% pre-placed"; caps 484 desktop / 360 phone / 676 only with desktop Large boards, each with its N-CAP/N-LARGE/N-EXPERIMENTAL notice; throwing/denied storage does not break editing.

**Issues & resolutions:**
- One wrong test expectation and a harness setup problem, fixed in tests.
- A transient `check-site` failure (`player/index.html` missing `./app.js`) came from T19's in-progress files; it passed on re-run.
- UX note: when an edit makes the selected level unavailable, the level moves to the nearest offered one and does not move back after a later resize (can surprise users typing Columns then Rows through an intermediate size). Recommendation: choose the level after sizing the board.
- Design choices (no owner input needed): Level column shows the "Uses … pieces" line, N-COUNT notice under the board; typing a seed turns Keep seed on, clearing turns it off, 🎲 leaves it unchanged; resize/preset confirm only when blocked cells exist (one combined prompt with a set, first-edit prompt once); view rotation usable during a job; default level Normal; confirmations via `window.confirm`.

**Handoff (for T18):** `createGeneratorApp(document, {storage, env, confirm, random})` → `{store, hardware, editor, level, regions:{set, puzzles}, setHandlers, destroy}`; `setHandlers({onGenerateSet({seed, state}), onNewPuzzles, onAddMore, onCancel})` (buttons disabled until set; sticky bar mirrors the current action). `createGeneratorStore` → `getState`, `subscribe(listener(state, previous))`, `update`, `destroy`; added field `calibrationFor` + `calibrationCurrent(state)`; `job` is owned by T18 and `isBusy(state)` disables painting/settings. Helpers: `beginSetRequest`, `acceptSet`, `nextBatch` → `{state, batchSeed}`, `recordBatch`, `savedSetOf`, `useSavedSet`, `describeBoard`, `describeLevels`, `describeCount`, `withBoard`, `serializeState`, `restoreState`, `loadGeneratorState(storage)`, `createPersistence` (300 ms debounce, shrinking retry, never throws). Restored ratings/certificates are unverified claims; sets keep carving/`macroRegion` via `setPack.meta`. `strings.js` has all 16 N-* notices and `formatNotice`. `ui\board-editor.js` → `mountBoardEditor` (`resize`, `applyPreset`, `reset`, `trim`, `undo`, `rotate`); `ui\level-panel.js` → `mountLevelPanel` (`generate()`).
