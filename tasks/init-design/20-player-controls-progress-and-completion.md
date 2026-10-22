# T20 — Player interaction, saving, and completion

**ID:** T20  
**Depends on:** T13, T16, T19  
**Estimated size:** 1,000–1,500 implementation/test lines  
**Owner role:** player-ui  
**Milestone:** MVP
**Design refs:** §6.3, §11.1–§11.12, §13.3.

## Goal & business context

Finish the fully playable mouse/keyboard/touch experience, including rotated boards, safe invalid drops, undo, saving and victory on any valid tiling.

## Scope

**In scope:** gestures, toolbar/keyboard, view navigation, timer, progress, reset/replay and win UI.  
**Out of scope:** solving, changing puzzle difficulty, hints and reveal.

## Inputs & context

Use T13’s pure reducer/canPlace/isSolved, T16’s pointer/render APIs, T19’s store/hosts and T12 storage. No UI occupancy or geometry implementation may replace the shared engine.

Concrete calls: `reduce(game,{type:'place'|'move',pose})`, `{type:'remove',piece}`, `{type:'orient',piece,t,pose?}`, or `{type:'reset'|'undo'|'redo'}`; `canPlace(game,pose,ignorePiece?)`; `snapshot(game)`; `createGame(pack,index,saved?)`. For placed orientation, include the kicked/anchored pose; for tray orientation supply t only. The store exposes `getState/subscribe/update`; rendering reads `game.placed`, `game.tray`, `game.selected`, `game.preview`, `game.solved`, `game.moves`, and `game.elapsedMs`.

### Agreed playing layout and inventory

```text
┌ ☰ Pack ▾ │ level/score │ timer │ moves │ Undo │ Redo │ Reset │ Straighten │ Import ┐
├──────────────────────────── Board ──────────────────────────┬──── Tray ────────┤
│ clues locked/hatched; ghost, handle, focus; zoom/pan          │ unplaced pieces │
├──────────────────────────────────────────────────────────────────────────────┤
│ Selected: F  [⟲][⟳][⇋][⇵][Place][↩ to tray]                    N pieces left   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Keep the top-bar order; Straighten is conditional in that bar. Below900 px the order is top bar→board→selection toolbar→two-row scrolling tray. This task owns interaction/toolbar/win accessibility fixes; T19 owns import/shell structure.

Pose: mirror x, clockwise turn, normalize, add origin. Presentation θ is counter-clockwise. `t=4f+r`. T05 functions:

```ts
screenRotate(t,'cw'|'ccw'):number;
screenFlip(t,theta,'horizontal'|'vertical'):number;
arrowToGrid(theta,key):[number,number];
straightenAngle(theta):number;
```

For reference, screen horizontal flip sets `r=(theta/45-r) mod4,f=1-f`; vertical adds2 to that r expression. Arrow grid vector is `R^floor(theta/90)(screenVector)`; odd45° ties use the preceding quarter-turn. Use the **effective** player angle after Straighten.

Gestures:

1. Pointer-down on a movable piece selects it and stores its source-cell handle; capture on a stable surface.
2. Start drag after6 px mouse/pen or10 px touch. Hide its original drawing and draw a clone in the drag layer; **do not remove its committed occupancy/state**.
3. For touch, shift the screen pointer up by `1.25*cellPx` before inverse mapping.
4. Transform the original grabbed source cell under the new t, including normalization; ghost origin=`floor(localPointer)-orientedHandle`.
5. Check against all occupancy except the moving piece’s own old cells. Preview valid/invalid status without mutation.
6. On valid drop commit one place/move action; on tray drop remove; elsewhere revert. Pointercancel, Escape, resize and device-orientation changes revert.
7. Wheel rotates while dragging; shortcuts remain active. Other manipulation pointers are ignored.

Tap placement: first select the piece; choose an occupied handle nearest its current centroid, tie by y/x, and retain its source index. Tap a board cell for preview; tap the same cell again, press Place or Enter to commit. Another cell moves the preview; Escape/tray cancels. Tapping the selected tray piece rotates CW.

Placed rotation/flip: keep the handle anchored; test the natural pose, then kicks `(0,-1),(-1,0),(1,0),(0,1)`. Commit once if valid; otherwise keep state and announce “No room to rotate here”, with a200 ms shake unless reduced motion is requested.

Keyboard:

| Key | Action |
|---|---|
| Tab / Shift+Tab | Focus tray then placed movable pieces |
| Enter / Space | Pick up or commit valid preview |
| Arrows; Shift+arrows | Move1 or3 cells using screen-aware mapping |
| E or R / Q | CW / CCW quarter-turn |
| F / V | Screen horizontal / vertical mirror |
| Delete / Backspace | Return selected movable piece to tray |
| Escape | Cancel manipulation / close dialog |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z or Ctrl+Y | Redo |
| ? | Shortcut help |

Ignore game shortcuts in text inputs/dialogs. Prevent default only when handling the key. Duplicate every action with visible buttons. Never focus/drag a clue.

The board has `role="application"` and `aria-describedby` instructions. Names follow “Piece F, 5 cells, in tray” / “Piece F, on board at row 3, column 5”. Announce changes through `aria-live="polite"`. While moving by keyboard on a rotated board, draw grid-axis arrow hints next to the ghost.

Keyboard pickup of a placed piece starts at its current pose. Pickup from the tray aligns the occupied handle with the first active board cell in row-major order; the preview may be invalid until moved, but no state is committed automatically.

View/persistence:

- Pan empty board space or use two-finger pan only when no piece is being manipulated. Zoom14–64 px; Straighten is display-only and local.
- Labels and Patterns are independent; both default on. Accessible piece names include label and size regardless of visual toggles.
- Timer is on by default, starts on the first committed move, pauses while hidden, and stops at completion. Browser code owns clocks.
- Save after committed actions with250 ms debounce; stamp actual `updatedAt` outside the engine. Unplaced tray orientations/undo history are not in v1 snapshots and reset on reload.
- Reset confirms and is undoable; Replay creates a fresh game. Storage failure warns without interrupting play.
- On a valid complete cover, stop/save and show time/moves/level/score, Next puzzle, Replay and Back to generator. Use a short celebration unless reduced motion is requested. A reference answer is never the victory criterion.
- Respect reduced motion. Hints/reveal remain absent until T25.

## Files to create/modify

`player\app.js`, `player\state.js`, `player\strings.js`, `player\player.css`; `player\ui\toolbar.js`, `player\ui\keyboard.js`, `player\ui\win-dialog.js`; extend board/tray adapters as needed; `tests\player-controller.test.js`; `tests\browser\player-controls.html`, `tests\browser\player-controls.js`.

## Implementation steps

1. Bind semantic pointer events to previews and reducer actions.
2. Implement handle-preserving transformations and rotation kicks.
3. Add keyboard/buttons, pan/zoom, independent view toggles and help.
4. Add timer/save lifecycle and completion/replay/navigation.
5. Test the same move sequences through each input method.

## Acceptance criteria — Business

- **BAC-1:** A puzzle can be completed with mouse only, touch select/tap, or keyboard only at rotated views.
- **BAC-2:** Invalid drops/cancellation preserve old placements; clues never move.
- **BAC-3:** Undo/redo/reset work, refreshing restores board progress, and a non-reference completion wins.
- **BAC-4:** Labels/Patterns switches remain independent and saving failure never blocks play.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\player-controller.test.js"` and `node tools\check-conventions.mjs` pass.
- **TAC-2:** The browser control harness passes at0°,45°,90°,315°, scrolled and zoomed, including an empty bounding-box-corner piece.
- **TAC-3:** `canPlace`/reducer are the sole move validators; display preferences never change scores, poses or fingerprints.
- **TAC-4:** UI controls target≥44×44 px, focus stays visible, outcomes are announced through `aria-live`, and reduced-motion behavior is checked.
- **TAC-5:** No engine work is added to the main thread; CSP, relative paths, native modules and CRLF remain intact.

## Test plan

Cancel a drag after rotating, move onto one’s own old footprint, reject a clue overlap, exercise every kick and the no-kick case, and test a second touch while dragging. Pause/resume the timer via visibility changes. Switch puzzles rapidly while a verification reply/save debounce is pending.

## Definition of done & handoff

T23 runs cross-browser/screen-reader/axe acceptance and reports defects back to this owner. Publish manual evidence; never claim touch/Safari coverage from mouse emulation.
