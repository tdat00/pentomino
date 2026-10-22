# T19 — Player loading, library, and game shell

**ID:** T19  
**Depends on:** T12, T13, T14, T16  
**Estimated size:** 850–1,300 implementation/test/fixture lines  
**Owner role:** player-ui  
**Milestone:** MVP
**Design refs:** §5.3, §9.4–§9.6, §11.1, §11.9–§11.12.

## Goal & business context

The Player must work without the Generator: a link, file, pasted code, recent pack or sample should open a valid game and preserve progress safely.

## Scope

**In scope:** player shell/store, all import paths, pack navigation, library, verification status, sample pack and board/tray adapters.  
**Out of scope:** move gestures/toolbar implementation completed in T20 and post-MVP hints.

## Inputs & context

Consume T12 `readIncoming`, codec/pack validators, library/progress helpers; T13 `createGame`, `snapshot`, `canPlace`; T16 render mounts; T14 a pool of size1 for verification.

`PlayerState` owns `{pack,index,game,loading,error,verificationByPuzzle,revision,prefs}`. Keep the old validated pack/game while a replacement is loading. Commit a new game only after schema/geometry validation succeeds.

`createPlayerStore(initial?)` returns `{getState():PlayerState, subscribe(listener):unsubscribe, update(patchOrUpdater):void, destroy():void}`. The normalized Pack contains `board.rows`, `presentation.rotation`, `pieces:{id,label,color,cells}[]`, and `puzzles:{id,title?,clues,solution?,rating?,certificate?}[]`. A Pose is `{piece,x,y,turn:0|1|2|3,mirrored:boolean}`. T13's `game.restoreWarnings` supplies discarded-progress notices.

### Agreed screen layout

```text
┌ ☰ Pack ▾ │ Hard #2 · score20 │ timer │ moves │ Undo │ Redo │ Reset │ Straighten │ Import ┐
├────────────────────── Board (SVG, angle theta) ────────────────────┬──── Tray ──────────┤
│ locked clues / preview ghost / focus / zoom and pan                │ A B D F …          │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ Selected: F  [⟲][⟳][⇋][⇵][Place][↩ to tray]                         N pieces left       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

Preserve top-bar order. Below900 px: compact top bar, board, selection toolbar, then two-row horizontal-scrolling tray. Straighten is a **top-bar toggle**, shown only for touch with fitted cells<24; it is not relocated to the View menu. View menu owns Labels, Patterns and Timer.

Supported entry paths:

- `#pack=<code>&i=<index>` or local-only `#lib=<packId>&i=<index>`;
- Import file or drag/drop, ≤512 KiB;
- pasted code, full link, surrounding text or raw JSON, using the shared extractor;
- Recent library, max30 packs;
- Sample at `player/samples/sample-pack.json`.

With no hash and an empty library, open the Import screen offering Sample; do not auto-replace it with a game. Recent entries expose Delete and Export again. Deleting a library entry does not mutate another pack or foreign storage.

A `piece-set` document displays exactly:

> This file has pieces but no puzzle — open it in the generator.

An invalid index, file or unsupported format gives an explanation without replacing the current game. Never fetch an arbitrary pasted URL.

Messages/badges to inline in `player/strings.js`:

| Situation | Text |
|---|---|
| Invalid pack | This file is not a valid Pentomino pack: {firstIssue.message} |
| Unsupported version/rules | Unsupported puzzle version or rules. |
| Missing local record | This puzzle is not in this browser's library. Import a file or use a portable link. |
| Invalid index | Puzzle index is out of range. |
| Verification pending / inconclusive | Checking solvability… / Solvability not verified |
| Proven impossible | No solution exists |
| No certificate / pending | Uniqueness not checked / Checking… |
| Runtime certificate | Unique solution ✓ / Several solutions / Uniqueness not proved |
| Imported certificate | Claimed unique solution / Claimed several solutions / Claimed uniqueness not proved |

Imported ratings show “Claimed {level} · score {score}” until a runtime re-rate exists. Solvability verification alone never upgrades a uniqueness claim.

Verification:

- A validated included solution proves solvability, not uniqueness.
- Without a solution, call `verifyPack`/bounded `solveFirst` through the worker; import verification limit2,000,000 rows.
- Play is allowed while checking or after an inconclusive result; only exhausted zero solutions means “No solution exists”.
- Stored ratings/certificates show claimed status until recomputed. Proof data arriving for a stale revision must be discarded.
- A missing module-worker capability does not disable manual play; show Not verified where appropriate.

Progress:

- Use exact-coordinate `progressFingerprint(board,pieces,clues)`, not puzzle ID.
- T13 drops invalid saved moves and recomputes solved state; show a restoration notice.
- Offer Continue (default) or Restart when valid progress exists.
- Switching puzzles saves current progress before creating the next state.
- Preserve the hash; update `i` using `history.replaceState`. A local-library link remains labeled local.

UI contract for T20:

- Shell supplies `boardHost`, `trayHost`, `toolbarHost`, `winHost`, `statusHost` and an app store subscription.
- `board-view.js` renders `game.placed`, immutable clues, preview and selected handle via T16; it never commits moves.
- `tray-view.js` renders each unplaced piece in its current t and effective display angle; expose selected/drag callbacks with the grabbed source-cell index.
- Pack menu lists level, score, new/in-progress/solved state and previous/next actions. Reserve revealed status for T25.
- View menu has independent Labels/Patterns toggles (both initially on) and Timer on. Patterns appears only for K>20. The conditional Straighten control stays in the top bar.
- Generator preview rotation is pack data. Player Straighten changes only the local effective angle, never the pack or fingerprint.

Sample: a self-contained 10×6 pack with Easy, Normal and Hard puzzles, using the same set and different layouts. T10 supplies `tests\fixtures\generated-sample-pack.json`; validate its geometry and recompute its three ratings, then copy it to the player sample path. Do not hand-label unmeasured scores or copy prototype files. Include valid answers; all claims are still loaded through the ordinary path.

Responsive shell: board plus right-hand tray on desktop; below900 px use board, toolbar, then a two-row horizontally scrolling tray. Large boards support pan/zoom and pieces up to about50 cells.

## Files to create/modify

`player\index.html`, `player\app.js`, `player\state.js`, `player\strings.js`, `player\player.css`; `player\ui\import-view.js`, `player\ui\board-view.js`, `player\ui\tray-view.js`; `player\samples\sample-pack.json`; `tests\player-import.test.js`; `tests\browser\player-import.html`, `tests\browser\player-import.js`.

## Implementation steps

1. Build import and game shell states with atomic replacement.
2. Route every entry path through shared parsing and validation.
3. Hydrate games/progress and start nonblocking verification.
4. Add pack/library navigation and independent display preferences.
5. Generate/validate the sample pack and publish input hooks to T20.

## Acceptance criteria — Business

- **BAC-1:** The Player opens from a link or standalone file without generator storage.
- **BAC-2:** Each invalid/missing/piece-set-only case displays its exact mapped message above and leaves the old game unchanged.
- **BAC-3:** Continue/Restart and next/previous puzzle navigation preserve the correct game’s progress.
- **BAC-4:** Verification uncertainty is never displayed as unsatisfiable or unique.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\player-import.test.js"` and `node tools\check-conventions.mjs` pass.
- **TAC-2:** `sample-pack.json` passes `validatePack`, has real in-band ratings and independent valid solutions.
- **TAC-3:** The browser import harness covers link/file/paste/library/sample, stale replies, unavailable storage/workers and same-ID/different-content saves.
- **TAC-4:** No new runtime dependency, remote data request, unsafe HTML or inline script is introduced; all paths remain relative.

## Test plan

Use the exact T11 fixture, generated sample, malicious title, answer-free file and a deliberately unsatisfiable tiny rules-valid pack. Test 0°,45°,90°,315° loading and viewport changes. Ensure labels/pattern toggles are independent and remain device preferences.

## Definition of done & handoff

T20 receives the rendered game/store/hooks. This task owns its shell/import/library layout and accessibility fixes. Full playing acceptance waits for T20 and T23, not the release-tooling task.

## Execution log

| Field | Value |
| --- | --- |
| Status | Done (real touch-device behaviour not verifiable here — deferred to T23) |
| Start | 2026-10-22 21:04:03 (+07:00) |
| End | 2026-10-22 21:26:44 (+07:00) |
| Duration | 22 min 41 s |
| Model | claude-sonnet-5.5 (sub-agent `T19-player-shell`, general-purpose); ran in parallel with T15, T17, T18, T21 |
| Token usage | 97 model calls; 18,771,419 input (18,493,015 cache read), 155,954 output |
| AI credits | 410.48 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** `node --test tests\player-import.test.js` → 24 pass / 0 fail; `check-conventions` OK. Agent run: `npm run test:quick` 581 pass / 0 fail; `npm run check` OK; headless-Edge harness `tests\browser\player-import.html` (port 8123) → 18/18 at 1280 px and 18/18 at 600 px emulated mobile, 0 CSP violations, 0 remote requests; screenshots reviewed (desktop, 390 px, Import screen).

**Acceptance:** BAC-1..4 and TAC-1..4 pass. Link/file/paste/library/sample all open without generator storage; invalid pack, unsupported version/rules, piece-set, out-of-range index, missing local record and oversized file each show their exact message and leave the current game untouched; progress saved before switching puzzles, Continue/Restart works per game; "Solvability not verified" distinct from "No solution exists" (only an exhausted zero-solution search proves impossible, tested with the real module worker); sample pack is byte-identical to `tests\fixtures\generated-sample-pack.json` and `verifySample` recomputes its three ratings; pasted URLs are never fetched; hostile titles render as text.

**Issues & resolutions:**
- A botched edit in `import-view.js` caused a SyntaxError caught by the CDP driver; fixed.
- Two harness assertions were wrong (a 14 px minimum cell legitimately scrolls a narrow board; hidden menu buttons were counted as top-bar targets); corrected.
- `verifySample` expects raw JSON (absent certificate = `undefined`, whereas `parsePack` yields `null`); the test passes raw JSON.
- Touch: Straighten under `(pointer: coarse)` tested only via an injected flag; the 44 px target rule checked only as CSS.
- Scope boundary: Undo/Redo/Reset rendered in the agreed order but disabled until T20; selection toolbar shows only "Selected: X" and "N pieces left".
- Extra file beyond the list: `player\ui\pack-menu.js` (☰ Pack menu) to keep `app.js` small. Shared-file edit: `README.md` (+2 bullets under "Using the Player").
- Design choices (no owner input needed): with no hash and a non-empty library the Import screen shows Recent (nothing auto-opens); file/paste/library/sample packs get a local `#lib=<id>&i=n` address only when saved; Restart writes an empty progress record immediately; only the open puzzle is verified (one-puzzle `verifyPack`); a puzzle with a validated stored solution is marked solvable without a worker.

**Handoff (for T20):** `mountPlayer(root, env)` → `{store, controller, ready, hosts:{board, tray, toolbar, win, status, live}, boardView, trayView, announce, renderStraighten, destroy}` (env injects storage, address, history, fetch, pool, download; auto-mounts on `[data-player-root]`). `player\state.js` → `createPlayerStore`, `createPlayerController` (`start`, `openHash`, `importText`, `importFile`, `openLibraryPack`, `openSample`, `goToPuzzle`/`nextPuzzle`/`previousPuzzle`, `resume`, `select`, `saveNow`, `setPref`, `showImport`/`closeImport`, `removeLibraryPack`, `exportLibraryPack`, `dismissError`/`dismissNotice`, `destroy`), `effectiveRotation`, `offersPatterns`, `hashWithIndex`. T20 adds the 250 ms debounce around `saveNow()` and commits moves with `store.update({game: reduce(...)})`. `boardView.render(state, angle, {cursor, invalidCells})` draws `game.preview` via `canPlace`; attach pointer trackers to `boardView.view.surface`. `trayView` takes `onSelect(id)`, `onGrab({pieceId, sourceCell, event})`, offers `buttonFor(id)`, `refresh()`. `player\strings.js` holds messages, claim/verification labels and `LABELS`; pack-menu status `new|in-progress|solved` leaves room for T25's `revealed`.
