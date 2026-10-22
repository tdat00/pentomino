# Pentomino — Unified design brief

**Phase 4 · 22 October 2026**

## Purpose and users

An account-free, browser-based puzzle workshop for casual players, puzzle enthusiasts, parents, and teachers. Makers create boards and challenges; players fit every piece into the available space.

Pieces have varied shapes and sizes, with at least three squares each. No two shapes match even after turning or flipping. Colors and visible labels help distinguish them.

## Site map

**Home → Generator → Generate Piece Set → New Puzzle → Play → Player**

Visiting `tdat00.github.io/pentomino` opens the Generator. The Player also works independently: open a shared link or import a puzzle file.

## Generator: create, inspect, and play

1. **Choose the board.** Enter rows and columns, or start with a Rectangle or Heart preset. Click or paint cells to block/unblock them, keeping the available area connected. Undo, reset, an available-cell counter, and clear warnings support experimentation.

2. **Choose the view.** Turn the display in 45° steps, including 90°. **This never changes the grid, blocked cells, pieces, or difficulty.** The Heart preset is a grid with its top-right region blocked, displayed at a 45° angle to form a heart. Painting also works in the rotated view.

3. **Choose difficulty.** Read a short description of the selected level. Optionally enable **Require one solution** or enter a text seed to reproduce a generation attempt.

4. **Generate Piece Set.** Inspect the colored, labeled pieces and their sizes. The app checks that they can fill the board and finds a sample challenge at the requested level before declaring the set ready. Regenerate to try another set. Piece count depends on the board and difficulty.

5. **New Puzzle.** Request **1–10 puzzles using this exact set**. Each accepted puzzle has a genuinely different arrangement, with some pieces already placed and locked and at least two left to play.

6. **Inspect results.** Cards appear as they become ready, showing a preview, estimated level and score, pieces remaining, and solution status: **one verified solution**, **multiple solutions**, or **not proved**. A partial-batch message explains any shortfall.

7. **Play or export.** Open a selected puzzle or the pack in the Player, copy a shareable link, or download a `.json` file. Export can include or omit answers. Large or unsupported link transfers fall back to files or a clearly labeled same-browser transfer.

Changing board cells requires a new piece set; warn before discarding existing work. Changing only the view angle preserves everything.

## Player: solve comfortably

Open from Play, a shared link, the recent-puzzle library, or **Import** by choosing/dropping a file. Select a puzzle from a pack. Invalid imports explain the problem without replacing the current game.

- The board and tray show pieces at matching viewing angles; labels remain readable. Fit-to-screen, zoom, and view controls keep rotated boards usable.
- Drag a piece, or select it and tap a board cell to preview, then confirm. A highlighted square anchors placement. Invalid drops leave the previous position unchanged.
- Turn pieces in 90° steps or flip them using visible buttons and keyboard shortcuts. Mouse, keyboard, and touch support the full playing flow. A diagonal board view never permits extra 45° piece turns.
- Starting pieces stay locked. Move your own pieces, return them to the tray, undo/redo, or reset.
- **Any valid completion wins:** use every piece, cover every available square, and leave no overlaps. It need not match the stored answer. Continue to the next puzzle or replay.
- Progress saves locally when browser storage is available. If saving fails, warn clearly while allowing play to continue.

## Difficulty and expectations

| Levels | Typical experience |
|---|---|
| Very Easy / Easy | Many starting pieces and approachable choices. |
| Normal / Hard | More alternatives and planning. |
| Expert / Master | Less guidance and sustained reasoning. |
| Nightmare / Hell tiers | Demanding challenges, generally on larger boards. |

One shared scoring method estimates difficulty; labels are not promises of solving time.

**PROVISIONAL — finalized in Phase 5:** which levels each board supports, pieces per level, size balance, maximum board size, and final score bands. **Harder levels unlock on larger boards**; not every board offers every level. This brief promises no fixed piece-count range or board-size ceiling.

Generation shows its current activity, elapsed time, completed results, and **Cancel**. Finished puzzles remain usable after cancellation. Ten puzzles are a request, not a guarantee: return fewer rather than repeat an arrangement with different clues. If a requested level or required single solution cannot be established within the attempt, explain that honestly and offer another attempt or different settings.
