# T16 — Shared SVG rendering and pointer primitives

**ID:** T16  
**Depends on:** T03, T05, T12  
**Estimated size:** 900–1,400 implementation/test lines  
**Owner role:** generator-ui / player-ui  
**Milestone:** MVP
**Design refs:** §6.3, §11.1, §11.3–§11.7, §11.9–§11.11.

## Goal & business context

The board, tray and thumbnails must show the same pieces at the same viewing angle. Makers must be able to unblock cells at45°, and players must not lose a piece when a gesture is cancelled.

## Scope

**In scope:** shared SVG board/piece rendering, hit-testing, zoom/pan plumbing, safe DOM helpers and a reusable single-pointer tracker.  
**Out of scope:** occupancy rules, committing moves, editor history and app orchestration.

## Inputs & context

```ts
mountBoard(el:HTMLElement,opts:BoardViewOptions):{
 render(model:BoardViewModel):void;
 setRotation(theta:number):void; setZoom(cellPx:number):void;
 panTo(x:number,y:number):void;
 cellAt(clientX:number,clientY:number,o?:{includeBlocked?:boolean}):XY|null;
 localPoint(clientX:number,clientY:number):DOMPoint;
 destroy():void;
};
```

Explicit task-pack adapter contracts:

```ts
BoardViewOptions={mode:'play'|'edit'|'thumbnail';rotation?:number;cellPx?:number;
 onCell?:(cell:XY,event:PointerEvent)=>void;
 onPiece?:(pieceId:string,event:PointerEvent)=>void};
BoardViewModel={board:Board;pieces:Piece[];clues:Pose[];placements:Pose[];
 preview?:{pose:Pose;valid:boolean;reason?:string}|null;
 selectedId?:string|null;cursor?:XY|null;invalidCells?:XY[];
 showLabels:boolean;showPatterns:boolean};
mountPiecePreview(el,piece,opts):{render({t,rotation,showLabels,showPatterns});
 sourceCellAt(clientX,clientY):number|null;destroy()};
createPointerTracker(el,handlers):{cancel(reason:string):void;destroy():void};
```

Pointer handlers receive `select`, `dragStart`, `dragMove`, `dragEnd` and `cancel` with pointer ID/type, client coordinates, piece ID if applicable, and original grabbed source-cell index. No handler mutates game state. T20 interprets these signals; T17 uses the coordinate/paint path.

Shared types: Board is `{width,height,active:Uint8Array}`; Piece has normalized cells/ID/label/hex color; Pose is `{piece,x,y,turn,mirrored}`. T03 supplies `outlineLoops`, `poseCells`, `orientedCells`; T05 supplies `rotatedExtent`, `fitCellSize`, `classifyBlocked`, palette/pattern/text-color functions.

Rendering:

- SVG viewBox uses logical cell units. One board group applies `rotate(-theta,cx,cy)`; θ is counter-clockwise, in45° steps. Counter-rotate labels +θ.
- Use one outline path per piece, even-odd fill for imported holes; merge/retain outline contours from T03.
- Active cells have light fill and thin grid lines; enclosed blocked cells are dark/hatched. Exterior cells are invisible in play and faint dashed guides in edit mode.
- Clues carry a lock icon plus diagonal hatching, independent of Labels/Patterns switches.
- Piece outline is35% black-mixed color, width .06 cell; inner seams .02 cell at25% opacity.
- Labels and patterns are independent, default on. Labels appear only when a cell is≥10 CSS px; accessible names always remain. Pattern identifiers come from T05; no diagonal clue-like pattern for movable pieces.
- Make SVG definition IDs unique per mounted view so multiple puzzle cards cannot reference another card’s pattern.
- Tray/drag previews apply the same display angle as the board, preserving logical t. No extra45° piece orientation exists.

Hit-testing:

```text
local = DOMPoint(clientX,clientY) × inverse(boardGroup.getScreenCTM())
cell = (floor(local.x),floor(local.y))
outside W×H => null
play/default => require active cell
editor includeBlocked=true => accept active, hole and exterior cells inside W×H
```

The editor’s scroll/pan surface must allow access to the entire authored grid, including blocked margins. Rendering a state update must not silently move the viewport during a paint/drag gesture; controllers refit deliberately.

Fit: `clamp(floor(min(availW/(extent.w+1),availH/(extent.h+1))),14,64)`. Scroll/pan instead of shrinking below14. Touch users may use `straightenAngle` when fitted cells are below24; that preference is device-local, not a pack mutation.

Pointer primitives: capture on a stable surface, mouse/pen drag threshold6 px, touch10 px; one active manipulation pointer. Ignore additional pointers during piece manipulation. Report pointercancel/lost capture/Escape/resize to the controller. Throttle visual move callbacks with `requestAnimationFrame`. Do not take over page scrolling outside the board/tray surfaces.

## Files to create/modify

`core\browser\svg-board.js`, `core\browser\pointer.js`, `core\browser\common.css`; `tests\browser\rendering.html`, `tests\browser\rendering.js`; `tests\render-model.test.js` for pure helper logic.

## Implementation steps

1. Implement reusable DOM/SVG mounts and teardown with no global per-game state.
2. Add display transformations, label counter-rotation, editor/play filtering and consistent piece previews.
3. Add zoom/pan/fit and viewport stability during active gestures.
4. Add the pointer tracker and browser regression harness.

## Acceptance criteria — Business

- **BAC-1:** At45° the Heart notch points upward and its bottom-left logical cell is lowest;75 active cells remain. Clicking a blocked notch cell unblocks it.
- **BAC-2:** A piece keeps its appearance between tray, ghost and board; labels stay upright.
- **BAC-3:** Labels and Patterns toggle independently; locked clues remain visually distinct.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\render-model.test.js"` and `node tools\check-conventions.mjs` pass.
- **TAC-2:** Serve with `node tools\serve.mjs --port 8080 --prefix /pentomino/`; `http://localhost:8080/pentomino/tests/browser/rendering.html` passes round-trip hit tests at all eight angles, with scroll and zoom.
- **TAC-3:** Multiple mounted boards have no SVG-ID collisions; destroy removes observers/listeners.
- **TAC-4:** No game-state mutation, solving, unsafe HTML, inline script/style markup, dependency or external asset request is introduced.

## Test plan

Use the T11 fixture, a Heart with exterior guides, an enclosed hole, a piece with an empty bounding-box corner and a >20-piece display fixture. Test mouse/touch thresholds, cancellation, labels-off/patterns-on and the reverse, and width changes while a gesture is active.

This task owns shared responsive/accessibility fixes: focus rings, control hit targets≥44×44 CSS px on touch/coarse pointers, safe names and independent toggles. Later QA reports defects back here; it does not edit these files itself.

## Definition of done & handoff

Publish render/pointer event contracts for T17/T19/T20. The rendering fixture is not a design prototype and is not deployed. Controllers own board edits and game commits.
