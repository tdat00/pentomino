# T05 — Board model, display transforms, and piece presentation data

**ID:** T05  
**Depends on:** T03, T04  
**Estimated size:** 850–1,400 implementation/test lines  
**Owner role:** core  
**Milestone:** MVP
**Design refs:** §6.1–§6.3, §11.9, §13.2.

## Goal & business context

Makers must edit blocked-cell boards, including the Heart, without a display rotation changing the puzzle. Players need consistent controls and distinguishable pieces even in large sets.

## Scope

**In scope:** board data/presets/validation, active-frame symmetries, pure view mathematics, color/label/pattern data.  
**Out of scope:** DOM rendering, pointer events, storage and solver search.

## Inputs & context

```ts
type Board={width:number;height:number;active:Uint8Array}; // row-major, 1 active
type XY=[number,number];
// board.js
boardFromRows(rows:string[]):Board; boardToRows(b:Board):string[];
rectangle(w:number,h:number):Board;
preset(id:'rectangle'|'heart'|'diamond'|'cross'|'ring',
 p:{n?:number;w?:number;h?:number;roundLobes?:boolean}):{board:Board;rotation:number};
activeCount(b:Board):number; regions(b:Board):number[][];
classifyBlocked(b:Board):Uint8Array; // 0 active,1 exterior,2 enclosed hole
normalizedActive(b:Board):{board:Board;dx:number;dy:number};
symmetries(b:Board):number[];
trimMargins(b:Board):Board;
validateForGeneration(b:Board,cap:number):{errors:Issue[];warnings:Issue[]};
// view.js
ANGLES=[0,45,90,135,180,225,270,315];
normalizeAngle(deg:number):number;
rotatedExtent(cells:XY[],theta:number):{w:number;h:number;minX:number;minY:number};
fitCellSize(ext:{w:number;h:number},availW:number,availH:number,
 o?:{min?:number;max?:number;marginCells?:number}):number;
screenRotate(t:number,dir:'cw'|'ccw'):number;
screenFlip(t:number,theta:number,axis:'horizontal'|'vertical'):number;
arrowToGrid(theta:number,key:'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown'):XY;
straightenAngle(theta:number):number;
// palette.js
BASE_COLORS:readonly string[];
colorFor(index:number):string; labelFor(index:number):string;
patternFor(index:number,k:number):'none'|'dots'|'hlines'|'vlines';
textColorFor(hex:string):'#000000'|'#ffffff';
```

Use T03’s `orientedCells`, `normalizeCells`, `compose`, and transforms. Grid t=4f+r is clockwise; presentation θ is **counter-clockwise**. No board rotation/resampling function is introduced.

Board rules:

- Files use `#` active, `.` blocked. Rows must be equal-length nonempty strings with only those characters.
- Flood-fill active regions with four neighbors. Classify blocked cells via a padded exterior flood fill.
- Keep authored W×H. `normalizedActive` is an analysis copy with offsets; `trimMargins` is an explicit edit. For an all-blocked edit state, return a safe empty analysis result/identity symmetry and reject generation; do not crash the renderer.
- Find D4 symmetries by transforming/normalizing active cells and comparing numerically. Expected counts: non-square rectangle 4; square 8; Heart 2 (identity and t=5 anti-diagonal reflection), including asymmetric blocked margins.
- Generation rejects area <30, area > supplied cap, disconnected active cells, or side >32; validates positive integer dimensions/mask length. Warn above 360 with “Large board: generation can take up to 2 minutes”. Import limits are separately owned by T11.

Presets:

| Name | Mask | Default / angle |
|---|---|---|
| Rectangle | all W×H active | 10 columns ×6 rows / 0 |
| Heart | even N square; block x≥N/2 and y<N/2; optional round lobes block (0,0),(N−1,N−1) | N10:75 cells, rounded73 / 45 |
| Diamond | all N×N active | N8:64 / 45 |
| Cross | centered horizontal/vertical bars, thickness ceil(N/3) | N9:45 / 0 |
| Ring | rectangle minus centered 2×2 hole, walls at least2 | 8×8:60 / 0 |

Use integer centering `floor((dimension−thickness)/2)`; validate even Heart sizes and ring dimensions. Heart counts N8/12/14/22/24/26 =48/108/147/363/432/507.

View mathematics:

```text
SVG view transform uses rotate(-theta,cx,cy); labels counter-rotate +theta.
For t=4f+r and k=(theta/45) mod4:
 screen CW: r=(r+1)%4; CCW: r=(r+3)%4
 screen horizontal flip: r=(k-r) mod4; f=1-f
 screen vertical flip: r=(k+2-r) mod4; f=1-f
arrow grid vector = R^floor(theta/90)(screen arrow vector)
straighten = nearest multiple90, ties toward theta-45, normalized
```

`normalizeAngle` accepts only finite multiples of45 and wraps negative values. Extents rotate cell corners around the active bounding-box center; minX/minY are in that same board-coordinate frame. For empty active cells return a zero extent; callers fall back to the authored frame. `normalizedActive` returns an empty0×0 analysis board with zero offsets, while `trimMargins` on an empty editor board is a no-op. Default fit: `clamp(floor(min(availW/(ext.w+1),availH/(ext.h+1))),14,64)`; marginCells=.5 per side. Heart10 at45 gives 14.1421×10.6066; 10×6 at45 gives 11.3137×11.3137. In a 900×500 viewport the latter uses40 px cells. Rotation must never enter board data, scoring, seeds or identities.

Palette:

```text
#e6194b #3cb44b #ffe119 #4363d8 #f58231 #911eb4 #42d4f4 #f032e6 #bfef45 #fabed4
#469990 #dcbeff #9a6324 #fffac8 #800000 #aaffc3 #808000 #ffd8b1 #000075 #a9a9a9
```

For i≥20: hue `(i*137.508)%360`, saturation65%, lightness45% for even i and65% for odd; convert deterministically to `#rrggbb`. Labels use spreadsheet numbering: 0=A,25=Z,26=AA,701=ZZ,702=AAA; reject invalid indices/labels beyond four characters. Patterns: none when K≤20 or i<20; otherwise `['dots','hlines','vlines'][floor(i/20)%3]`. Text color uses standard sRGB linearization and relative luminance `.2126R+.7152G+.0722B`, choosing whichever of black/white has higher contrast.

## Files to create/modify

`core\engine\board.js`, `core\engine\view.js`, `core\engine\palette.js`; `tests\board.test.js`, `tests\view.test.js`, `tests\palette.test.js`.

## Implementation steps

1. Implement masks, region/exterior analysis and explicit trimming.
2. Implement presets and generation validation with structured issues/cell coordinates.
3. Implement view operations and verify against independent matrix transformations.
4. Add label/color/pattern data; no DOM or user preferences belong here.

## Acceptance criteria — Business

- **BAC-1:** Heart is 75 playable cells at45°, and rotating it never changes those cells.
- **BAC-2:** Blocked margins do not hide true layout symmetries or silently alter authored coordinates.
- **BAC-3:** Pieces beyond Z/20 colors receive usable labels and pattern identifiers.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\board.test.js" "tests\view.test.js" "tests\palette.test.js"` passes.
- **TAC-2:** All eight display angles × all eight piece orientations match geometric reference flips; arrow ties and negative angles are covered.
- **TAC-3:** Preset counts, holes versus exterior, connectivity, cap errors, zero-active editor state and asymmetric margins are tested.
- **TAC-4:** `node tools\check-conventions.mjs` passes; all output is deterministic, DOM/clock/storage-free, dependency-free, UTF-8/CRLF.

## Test plan

Include Heart with extra blocked padding, an enclosed hole, a diagonal-only connection, exact fit examples and all label boundary indices above. Check valid distinct RGB colors over the 128-piece import envelope without claiming all are perceptually distinguishable.

## Definition of done & handoff

T07 consumes board symmetries; T16 uses extents/presentation data; T17/T20 call view operations rather than inventing rotation semantics. Preserve both analysis offsets and raw board coordinates.

## Execution log

| Field | Value |
| --- | --- |
| Status | Done |
| Start | 2026-10-22 19:58:54 (+07:00) |
| End | 2026-10-22 20:03:12 (+07:00) |
| Duration | 4 min 18 s |
| Model | claude-sonnet-5.5 (sub-agent `T05-presets-view`, general-purpose) |
| Token usage | 18 model calls; 1,198,594 input (1,136,199 cache read), 38,504 output |
| AI credits | 65.46 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** `node --test "tests/**/*.test.js"` → 184 pass / 0 fail (task tests: 29 pass); `npm run check` OK.

**Acceptance:** BAC-1..3 and TAC-1..4 pass. Heart N=10 has 75 cells and display angle never enters board data; asymmetric blocked margins still give symmetries `[0,5]`; labels A..ZZZZ (index 475253) and patterns for index ≥ 20 when K > 20; 8 angles × 8 orientations match an independent matrix reference.

**Issues & resolutions:**
- File tool emitted LF; converted to CRLF and re-checked.
- Some initial test expectations were wrong; tests corrected, implementation unchanged.
- No TypeScript type-check script exists in the repo; `// @ts-check` JSDoc only.
- Design choices (no owner input needed): invalid arguments throw RangeError while `validateForGeneration` returns issues; presets cap width/height at 64 as an allocation guard (the 32-side editor limit is enforced by `validateForGeneration`); Ring preset accepts `n` as square shorthand.

**Handoff:** `board.js` → `boardFromRows`, `boardToRows`, `rectangle`, `preset`, `activeCount`, `activeCells` (row-major `[x,y]`), `regions`, `classifyBlocked`, `normalizedActive`, `trimMargins`, `symmetries` (`[0]` for empty), `validateForGeneration` → `{errors, warnings}` with issues `{code, path, message, cells?}`; error codes `board-invalid`, `board-side-too-large`, `board-too-few-cells`, `board-too-many-cells`, `board-disconnected` (lists cells outside the largest region), warning `board-large`; constants `MIN_ACTIVE`, `MAX_SIDE`, `LARGE_BOARD_WARNING_CELLS`, `LARGE_BOARD_MESSAGE`. `view.js` → `ANGLES`, `normalizeAngle`, `activeCenter`, `rotatedExtent`, `fitCellSize` (1e-9 epsilon), `screenRotate`, `screenFlip`, `arrowToGrid`, `straightenAngle`. `palette.js` → `BASE_COLORS`, `colorFor` (distinct lowercase `#rrggbb` for 0..127), `labelFor` (throws above 475253), `patternFor`, `textColorFor`.
