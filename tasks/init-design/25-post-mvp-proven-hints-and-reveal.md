# T25 — Post-MVP proven hints and solution reveal

**ID:** T25  
**Depends on:** T23  
**Estimated size:** 850–1,400 implementation/test lines  
**Owner role:** player-ui / core  
**Milestone:** Post-MVP; initial release does not wait for this task
**Design refs:** §11.13, Appendix A.9, §15/I8.

## Goal & business context

Provide useful help without falsely blaming a correct piece or treating a timeout as proof. Revealed games must be distinguished from independently solved games.

## Scope

**In scope:** compatible-placement hints, proven repairing removals, honest inconclusive results, explicit reveal, counters and progress migration.  
**Out of scope:** changing generation policy, difficulty, certificate truth rules or the ordinary win validator.

## Inputs & context

Reuse the game reducer, exact-coordinate state identity and T14 solve task:

```ts
{kind:'solveFirst',payload:{boardRows,pieces,clues,rowLimit,maxSolutions:1}}
// returns full layout|null, actual counters, exhausted and stop reason
```

A hint action is one request under the same115/120-second watchdog. Use the existing50,000-row rating row budget as a per-query work cap for this post-MVP check; the global deadline still bounds multiple queries. This is a documented hint default, not a change to the score’s branch/row caps.

Pure helper result:

```ts
type HintResult=
 | {kind:'place';pose:Pose;proof:'compatible-layout'}
 | {kind:'remove';piece:string;proof:'repairing-layout'}
 | {kind:'unknown';message:'No repair identified within this check.'};
```

Define these exports in `core\engine\hints.js`:

```ts
compatibleStoredLayout(board,pieces,fixed:Pose[],solution:Pose[]|null):Pose[]|null;
chooseHintPlacement(board,pieces,fixed:Pose[],solution:Pose[]):Pose|null;
repairCandidates(placed:ReadonlyMap<string,Pose>,history:readonly MoveCommand[]):string[];
```

The first validates the full answer and exact occupied-cell agreement with fixed placements. The second chooses only an unplaced piece from a compatible answer. The third gives every currently placed movable ID once, most-recent first, with canonical ID order for pieces whose move is outside retained history. Browser orchestration uses the existing solveFirst worker task; no new worker operation is required.

Algorithm:

1. Validate current clues and user placements.
2. If a stored solution contains every current placement by occupied cells, it is a compatible witness.
3. Otherwise solve with all current placements fixed. A found complete layout proves compatibility. Choose an unplaced piece touching the most occupied/border cells; deterministic canonical tie.
4. If no solution and search is **not exhausted**, return unknown. Never substitute an arbitrary empty stored-solution target.
5. If current state is proven unsatisfiable, test removing each movable placed piece, most-recent first, without a fixed “last six” cutoff.
6. A found completion after one removal proves a repairing removal with every other placement retained. It does not mean that piece is the only possible culprit.
7. If queries exhaust/cap/time out without a proved result, return the exact unknown message. Never blame the last move by default.

Apply results only if request ID and a fingerprint of the current board/clues/**user placements** still match. Revalidate a suggested pose at commit time. A place hint previews/pulses and offers Place it; applying it is one undoable game action. Reduced-motion mode has no pulse animation.

Reveal:

- Confirm explicitly before changing the board.
- Prefer a stored answer only if compatible with current placements; otherwise obtain a compatible complete solution.
- If the current state is proven unsatisfiable, offer an explicit Reset then reveal, never silently overwrite moves.
- Preserve clues; animate or immediately apply the verified answer.
- Geometry may be complete, but mark the session **revealed**, not an earned win. Do not show the ordinary victory celebration or increment solved-achievement counts.

Progress extension: introduce local progress `v:2` with `revealed:boolean` and `hintsUsed:number`, retaining v1 placements/elapsed/moves/updatedAt. Migrate v1 to v2 with false/0. The pack wire format remains version1. A restored revealed game stays revealed; Replay creates a fresh unassisted session.

The engine’s `isSolved` still checks geometry only. UI/library earned completion is `isSolved && !revealed`; this resolves the design’s “revealed, not solved” wording without weakening move validation.

## Files to create/modify

`core\engine\hints.js`; `player\ui\hint-panel.js`, player app/state/toolbar/win handling; progress loading in `core\browser\storage.js`; game-local progress typedefs and application version data; `tests\hints.test.js`, `tests\progress-migration.test.js`, `tests\browser\hints.html`, `tests\browser\hints.js`; `README.md`. Keep the existing worker protocol/dispatcher unchanged.

## Implementation steps

1. Implement pure proof-based selection/result helpers and bounded worker queries.
2. Add revision-safe hint previews and undoable application.
3. Add confirmed compatible reveal and explicit reset/reveal path.
4. Add v1→v2 local progress migration and earned-versus-revealed UI status.
5. Update help/README and browser regression coverage without changing generation IDs.

## Acceptance criteria — Business

- **BAC-1:** Every positive hint comes with a valid compatible or repairing layout; unknown searches say unknown.
- **BAC-2:** A correct recent piece is never blamed merely because older repair candidates were not checked.
- **BAC-3:** Reveal needs confirmation, preserves clues and is never presented as an unassisted win.
- **BAC-4:** Existing saved v1 games resume without losing their placements/time.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\hints.test.js" "tests\progress-migration.test.js"` and the full test/convention commands pass.
- **TAC-2:** Copy T11's fixture **board and pieces**, but replace its clues with **[A] only**; J is not a clue in this regression. Place B at turn1/mirrored=false/x1/y0, then E,F,G,H,I,J at their documented solution positions; leave C,D unplaced. Prove current state unsatisfiable, removing any E–J still unsatisfiable, and removing B repairs it. Never blame J.
- **TAC-3:** Timeout, stale results, missing solutions, alternative valid paths, invalid last-moment hint commits and cancelled reveals are tested.
- **TAC-4:** Browser checks verify reduced motion, keyboard access, status announcements and v2 progress restoration.
- **TAC-5:** No runtime dependency, unsafe HTML, eval, main-thread search or changed puzzle score/rule is introduced; all files use UTF-8/CRLF.

## Test plan

Use independent small oracle problems and the exact regression above. Test an existing non-witness valid path, a compatible stored solution, a capped query, and a reset/reveal cancellation. Keep deadline unit tests on fake clocks; real browser interaction confirms responsiveness.

## Definition of done & handoff

Post-MVP help is documented and verified, local migration is safe, and generation/BQ behavior remains unchanged. Record an application-version change for the feature; do not relabel existing puzzle scores.

This task does not wait for hardware-bound BQ-1/2/3 completion. It may proceed after T23, but no engine, worker or client change may be merged—or alter files currently served by a qualification run—while that run is active. Coordinate a measurement lock or use an immutable local runtime snapshot.

## Execution log

| Field | Value |
| --- | --- |
| Status | Done (real-device touch and screen-reader checks not performed; nothing deployed) |
| Start | 2026-10-22 23:34:10 (+07:00) |
| End | 2026-10-23 00:04:14 (+07:00) |
| Duration | 30 min 4 s |
| Model | claude-sonnet-5.5 (sub-agent `T25-hints-reveal`, general-purpose); ran in parallel with the T23 defect-fix round. Started after T23 finished as BLOCKED (release-only blockers); the milestone states the initial release does not wait for T25. |
| Token usage | 156 model calls; 36,797,190 input (36,445,673 cache read), 167,548 output |
| AI credits | 619.87 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run on the combined tree):** full `node --test "tests/**/*.test.js"` → 748 pass / 0 fail (44.6 s); `npm run check` OK; `node tools\record-fixtures.mjs --check` OK. Agent run: `tests\hints.test.js` + `tests\progress-migration.test.js` 28 pass; headless Edge (port 18742, 1280 px and 600 px): `hints.html` 10/10 (also 10/10 with reduced motion), `player-controls.html` 25/25, `player-import.html` 18/18, 0 CSP violations; real CDP keyboard flow on the player page (Tab → Hint → Enter → Place it → Show solution → Escape → confirm → reload).

**Acceptance:** BAC-1..4 and TAC-1..5 pass (TAC-4 in headless Edge only). Positive hints carry an `isValidLayout`-revalidated compatible layout; 160-round brute-force oracle agrees on place/remove/unknown; the T11 regression blames only B after testing J..E (no last-six cutoff); reveal asks first, cancel changes nothing, clues preserved, no win dialog, toolbar "Solution revealed", pack menu Revealed, library solved count excludes it; v1 progress keeps placements/time/moves and saves as v2; timeouts/capped queries/stale replies/invalid last-moment commits handled honestly; search runs only in the worker via `solveFirst` at 50,000 rows per query.

**Issues & resolutions:**
- Bumping `APP_VERSION` to 1.1.0 broke `record-fixtures --check` (recorded `generation.app` stamps); reverted and added `PLAYER_VERSION = '1.1.0'` (shown in the player footer) instead — sent to the owner for confirmation.
- New hint dialogs changed which `dialog.pm-confirm` the T20 harness found; the hint panel is created after the reset dialog so existing selectors are unchanged.
- Shared-file edits: `core\engine\game.js` (progress v2, `revealed`/`hintsUsed`, `isEarned`, `reveal`/`hint` actions), `core\browser\storage.js` (v1→v2 migration on read; revealed not counted as solved), `core\engine\version.js` (`PLAYER_VERSION`), `tools\bench\report.js` (`core/engine/hints.js` added to `SOURCE_FILES`), `README.md`, `tests\game.test.js` (v2 snapshot keys; `v:3` now the unsupported version). Orchestrator added the favicon link to the new `tests\browser\hints.html` (D5 consistency).
- No `tsc` script; `// @ts-check` not machine-verified.
- Design choices (sent to owner, non-blocking): a hint counts only when a proven positive result is shown; revealed stays revealed through undo/redo/reset; hint panel is a status-line box (Place it / Remove it / Dismiss / Cancel check / Replay); Show solution runs the solver once when no stored answer exists; a capped (not proven) search makes reveal report "nothing found" and change nothing.

**Handoff:** `core\engine\hints.js` → `compatibleStoredLayout`, `chooseHintPlacement`, `repairCandidates`, `findCompatibleLayout`, `resolveHint`, `HINT_ROW_LIMIT`, `HINT_UNKNOWN_MESSAGE` (search injected as `solve`). `player\hints.js` → `createHintController`, `hintFingerprint`. `mountPlayer` also returns `hints`, `hintPanel` and accepts `env.createHintPool`; `play.apply(action)` commits any reducer action; revealed games never call `onSolved`. Hints use their own `size:1` pool. `hints.js`, `game.js`, `version.js`, `bench\report.js` are now part of the bench source digest — do not merge during an active qualification run.
