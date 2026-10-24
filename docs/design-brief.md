# Pentomino Puzzle Studio — Design brief

> **Living document:** kept in sync with the current code. The original design is in `docs/init-design/`; the developer specification is `design-detail.md`.

## Purpose and main journey

An account-free puzzle workshop for players, enthusiasts, parents, and teachers. Create challenges in the **Generator** and solve them in the **Player**.

**Home → Generator: Create board → Create piece set (New Piece Set) → Create puzzles (New Puzzle) → Play → Player (new tab)**

Visiting `tdat00.github.io/pentomino` opens the Generator. The Player also opens shared links and imports puzzle files without using the Generator.

Generated pieces contain at least three joined squares. Sizes vary, but shapes never repeat after turning or flipping. Colors, patterns, and labels continuing beyond Z help distinguish them.

## Generator: make a challenge

The Generator is a three-step wizard. The steps sit on the right, each in a frame with its own settings and button; the main panel shows the current step, with **‹ Step N - name** and **Step N - name ›** at its top right; the puzzles made so far are listed on the left. The step is part of the address (`?step=2`), so reloads, Back/Forward and shared links return to it. Language (EN | VI) and theme (light, dark, high contrast; the system's light or dark by default) are switched in the header.

1. **Create board.** Choose a preset (Rectangle, Heart, Diamond, Cross, Ring) and enter rows and columns. Click or drag cells to block/unblock them; keep the playable area connected. Zoom, fit, a move tool, undo (Ctrl+Z), a square counter and warnings help.

2. **Turn the view.** Rotate in 45° steps with ⟲ ⟳ in the board's toolbar. **This never changes the grid, blocked cells, pieces, or difficulty.** The Heart preset is a square with its top-right quarter blocked, displayed at 45° counter-clockwise. Paint directly in the turned view.

3. **Create piece set.** A table compares every level on this board: piece count, piece sizes and pre-placed pieces, each with a "?" that explains the number. Levels the board cannot use are greyed out with the reason. The step frame holds a repeatable text seed (type one, or roll one with 🎲; leave it empty for a new random seed each time) and **New Piece Set**. The app verifies the pieces fill the board and finds a matching sample puzzle before showing the set.

4. **Browse piece sets.** The set's pieces and a summary ("Hard | 13 pieces | Piece sizes 7–12 | Seed …") appear under the table. ◀ Set n of total ▶ steps through the sets made for this board (up to 50); Remove and Remove all clean up. A set that repeats one in the list is not added again—the existing one is shown.

5. **Create puzzles.** Choose the puzzle level (the set's level by default) and, optionally, **Require unique solution**—experimental for Hell puzzles above 200 squares, where it may find no result. Each **New Puzzle** press adds one puzzle with its own random seed and a genuinely different arrangement; a puzzle equal to one already listed is never added. Some pieces are locked; at least two remain to play.

6. **Inspect and launch.** Cards on the left, newest first, show "Puzzle #n", the estimated level (bold) and score, the seed, the pieces to place and a preview. The solution status updates separately: Checking…, Unique solution ✓, Multiple solutions, At least 1 solution, No solution exists, or Uniqueness not checked. Clicking a card shows that puzzle in the main panel (otherwise the newest one) with its board and pieces to place; **Play** opens it in the Player in a new tab and need not wait.

Board edits never delete work: the lists switch to the piece sets and puzzles of the new board (or empty lists), and going back to an earlier board brings its sets back. View changes preserve everything. A different difficulty may need a new piece set. The board, the settings and the sets of the last 10 boards are kept in this browser. The board, view angle, level, seed and uniqueness choice are also kept in the address, so a shared link opens the same board and piece set (generated again from the seed when this browser does not have it); puzzles travel through Play instead.

## Levels and typical boards

Very Easy/Easy gives many starting pieces; Normal/Hard offers more choices; Expert/Master gives less guidance; Nightmare/Hell starts with very few pieces. One shared scoring method supplies **estimates, not promised solving times**.

| Board | Playable squares | Available levels | Example total piece counts |
|---|---:|---|---|
| 6×10 rectangle | 60 | Very Easy–Master | Easy 7–8; Master 12–13 |
| 10×10 rectangle | 100 | Easy–Nightmare | Easy 8–9; Nightmare 17–20 |
| Default Heart: 10×10 grid | 75 | Very Easy–Master | Easy 7–9; Master 13–15 |
| 18×20 rectangle | 360 | Hard–Hell-2 | Hard 16–18; Hell-1 37–42; Hell-2 50–56 |
| 22×22 rectangle | 484 | Hard–Hell-3 | Hard 17–19; Hell-3 73–80 |

Counts vary with the selected level and generated set. Blocking cells changes availability; turning the view does not. Device limits still apply.

## Player: solve comfortably

The Player looks like the Generator: a header with the title, the **EN | VI** language switch and the theme buttons (light, dark, high contrast), and three panels. The **puzzles** of the open pack are on the left as cards (name, level and score, pieces to place, progress and a preview); the **game** is in the middle (puzzle name and rating claim, the timer and move count, the board, and the toolbar under it); the **pieces to place** are on the right. Below 1360 px the puzzles move under the game, and on a phone the panels stack.

Open a link, choose a recent puzzle, or **Import** a `.json` file by choosing/dropping it. Invalid imports explain the problem without replacing the game.

- Click a puzzle card to play that puzzle, or use **Previous puzzle** and **Next puzzle**. The timer starts with your first move.
- Board, tray, and dragged pieces use matching angles; labels stay upright. Zoom, pan, and Straighten view help on small screens.
- Large boards can use pieces of about 50 squares; the pieces panel scrolls.
- Drag a piece, or select it, tap a board cell to preview, then confirm. A highlighted square anchors placement. Invalid drops leave the previous position unchanged.
- **Right-click a piece** (in the pieces panel or on the board) for a menu: rotate clockwise, rotate counter-clockwise, flip left-right, flip top-bottom, and return to the tray.
- Mouse, keyboard, and touch support every move. Arrows position; E/Q turn; F/V flip; Enter places. Visible buttons duplicate these actions. Pieces turn in 90° steps even on a diagonal board.
- Starting pieces stay locked. Move or remove your own pieces, undo/redo, or reset.
- **Any valid completion wins:** every piece used, every playable square covered, no overlaps. Continue with Next puzzle or Replay.
- Progress saves locally when storage is available; storage failure does not prevent play.

## Limits, waiting, and sharing

Boards need **at least 30 playable squares**, with sides ≤**32**. Launch limits are **484 squares on desktop and 360 in phone mode**. Passing browser checks can raise these to **576 and 484**. The Generator page offers no larger boards; the 676-square ceiling is reserved for the command-line tool.

Each generation action targets **one minute** and stops with its results or a clear explanation within **two minutes**. While it runs, its button shows a spinner and "Elapsed: m:ss"; after 30 seconds the button becomes **Cancel**, which keeps finished puzzles.

**A new puzzle is a request, not a guarantee.** For example: “Found 0 of 1 different Hard puzzles within the time limit. The piece set was not changed.” When a set runs out of arrangements the app says so plainly—“Found 6/6 arrangements, the most this piece set allows”—and offers **Generate new piece set**. Some arrangements may differ by only a few pieces. Never silently substitute clue-only variants.

**Play** hands the puzzles to the Player through a portable link; when the link would be too long, a same-browser-only library link is used instead. The Player's portable address can be shared, and the Player exports packs as files, the durable fallback. The Generator itself has no import or export of files; only puzzles moved aside at the 512 KiB pack limit can be exported (“Export earlier pack”).
