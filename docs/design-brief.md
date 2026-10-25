# Pentomino Puzzle Studio — Design brief

> **Living document:** kept in sync with the current code. The original design is in `docs/init-design/`; the developer specification is `design-detail.md`.

## Purpose and main journey

An account-free puzzle workshop for players, enthusiasts, parents, and teachers. Create challenges in the **Generator** and solve them in the **Player**.

**Home → Generator: Create board → Create piece set (New Piece Set) → Create puzzles (New Puzzle) → Play → Player (new tab)**

Visiting `tdat00.github.io/pentomino` opens the Generator. The Player also opens shared and bookmarked links without using the Generator.

Generated pieces contain at least three joined squares. Sizes vary, but shapes never repeat after turning or flipping. Colors, patterns, and labels continuing beyond Z help distinguish them.

## Generator: make a challenge

The Generator is a three-step wizard. The steps sit on the right, each in a frame with its own settings and button; the main panel shows the current step, with **‹ Step N - name** and **Step N - name ›** at its top right; the puzzles made so far are listed on the left. The step is part of the address (`?step=2`), so reloads, Back/Forward and shared links return to it. Language (EN | VI) and theme (light, dark, high contrast; the system's light or dark by default) are switched in the header.

1. **Create board.** Choose a preset (Rectangle, Heart, Diamond, Cross, Ring) and enter rows and columns. Click or drag cells to block/unblock them; keep the playable area connected. Zoom, fit, a move tool, undo (Ctrl+Z), a square counter and warnings help.

2. **Turn the view.** Rotate in 45° steps with ⟲ ⟳ in the board's toolbar. **This never changes the grid, blocked cells, pieces, or difficulty.** The Heart preset is a square with its top-right quarter blocked, displayed at 45° counter-clockwise. Paint directly in the turned view.

3. **Create piece set.** A table compares every level on this board: piece count, piece sizes and pre-placed pieces, each with a "?" that explains the number. Levels the board cannot use are greyed out with the reason. The step frame holds a repeatable text seed (type one, or roll one with 🎲; leave it empty for a new random seed each time) and **New Piece Set**. The app verifies the pieces fill the board and finds a matching sample puzzle before showing the set.

4. **Browse piece sets.** The set's pieces and a summary ("Hard | 13 pieces | Piece sizes 7–12 | Seed …") appear under the table. ◀ Set n of total ▶ steps through the sets made for this board (up to 50); Remove and Remove all clean up. A set that repeats one in the list is not added again—the existing one is shown.

5. **Create puzzles.** Choose the puzzle level (the set's level by default) and, optionally, **Require unique solution**—experimental for Hell puzzles above 200 squares, where it may find no result. Each **New Puzzle** press adds one puzzle with its own random seed and a genuinely different arrangement; a puzzle equal to one already listed is never added. Some pieces are locked; at least two remain to play.

6. **Inspect and launch.** Cards on the left, newest first, show "Puzzle #n", the estimated level (bold) and score, the seed, the pieces to place and a preview. The solution status updates separately: Checking…, Unique solution ✓, Multiple solutions, At least 1 solution, No solution exists, or Uniqueness not checked. Clicking a card shows that puzzle in the main panel (otherwise the newest one) with its board and pieces to place; **Play** opens it in the Player in a new tab and need not wait, and **Print** (right of Play) prepares it for paper (see "Print on paper" below).

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

The Player looks like the Generator: a header with the title, the **EN | VI** language switch and the theme buttons (light, dark, high contrast), and three panels. The **puzzles** of the open pack are on the left as cards (name, rating with the level in bold, pieces to place, uniqueness, progress and a preview); the **game** is in the middle (puzzle name and rating, the timer and move count, Undo, Redo, Print, Hint and Replay, the hint message and the board); the **pieces to place** are on the right, under the toolbar for the selected piece. Below 1360 px the puzzles move under the game, and on a phone the panels stack.

Uniqueness uses the Generator's words. A puzzle that carries no uniqueness result reads **At least 1 solution**, as a new puzzle does in the Generator, once a solution is known.

> [!WARNING]
> **To be confirmed by the owner.** "Uniqueness not checked" was replaced by "At least 1 solution" to match the Generator. The Player shows it only when a solution is known: the pack includes a checked answer, or the background solvability check found one. For a puzzle shared without its answer, while that check runs or when it is inconclusive or finds no solution, the uniqueness text stays empty, so that no solvability claim appears without proof (acceptance check 11 of `design-detail.md` §13.3). Puzzles from the Generator and the sample always include their answer, so they always show it. If "At least 1 solution" should show in every case, this rule and that acceptance check must change together.

Puzzles open from their link: the Generator's Play, or an address someone shared or bookmarked. There is no file import or export. The address always holds the open puzzle, so a bookmark keeps it and sending the address shares it; a pack that did not arrive by a portable link (the sample, or a pack after a puzzle was removed) gets one in the address as soon as it is ready. Without a puzzle, a start screen offers the sample and a link to the Generator. A link that cannot be opened explains the problem without replacing the game.

- Click a puzzle card to play that puzzle; ✕ on a card removes it and **Remove all** empties the list. The timer starts with your first move.
- Board, tray, and dragged pieces use matching angles; labels stay upright. Every piece shows its letter where the squares are big enough, and sets of more than 20 pieces add fill patterns. Zoom, pan, and Straighten view help on small screens.
- Large boards can use pieces of about 50 squares; the pieces panel scrolls.
- Drag a piece, or select it, tap a board cell to preview, then confirm. A highlighted square anchors placement. Invalid drops leave the previous position unchanged.
- **Right-click a piece** (in the pieces panel or on the board) for a menu: rotate clockwise, rotate counter-clockwise, flip left-right, flip top-bottom, and return to the tray. **Right-click anywhere on the board** for **Return all pieces to the tray** and **Replay the puzzle**.
- Mouse, keyboard, and touch support every move. Arrows position; E/Q turn; F/V flip; Enter places. The toolbar of the pieces panel also turns and flips the selected piece. Pieces turn in 90° steps even on a diagonal board.
- Starting pieces stay locked. Move or remove your own pieces, undo/redo, or start again with Replay.
- **Any valid completion wins:** every piece used, every playable square covered, no overlaps. Continue with Next puzzle or Replay.
- Progress saves locally when storage is available; storage failure does not prevent play. Replay erases the saved progress of the puzzle. Only the Straighten choice, the language and the theme are remembered as preferences.

## Print on paper

Both apps have a **Print** button (the Generator's is right of **Play**, the Player's is the printer icon left of **Hint**) to play offline with cut-out pieces. Its dialog offers:

- **Print piece set**: every piece of the set, also those already placed on the board, in the style of an unlocked piece, ready to cut out.
- **Include board** and its **size**: Small, Medium or Large (cells of 10, 15 or 20 mm) or Fit page (the whole board on one sheet). A board that is too big for a sheet is split into parts to cut out and join. The pieces use the same cell size, so a piece sits on the board without shifting.
- **Print 2 sides**: the back of every piece or board part is its mirror image, so when cut out both sides match (choose two-sided printing, flipped on the long edge, in the printer settings).

The first sheet always shows the puzzle as a medium-sized preview with the pieces to place; it is for reading, not for cutting. Print on A4 at 100 % (actual size); a 50 mm bar on the first sheet lets you check it. Paper cannot turn by 45°, so a diagonal view (the Heart) is printed in its grid; the board may be turned a quarter when that saves paper.

## Limits, waiting, and sharing

Boards need **at least 30 playable squares**, with sides ≤**32**. Launch limits are **484 squares on desktop and 360 in phone mode**. Passing browser checks can raise these to **576 and 484**. The Generator page offers no larger boards; the 676-square ceiling is reserved for the command-line tool.

Each generation action targets **one minute** and stops with its results or a clear explanation within **two minutes**. While it runs, its button shows a spinner and "Elapsed: m:ss"; after 30 seconds the button becomes **Cancel**, which keeps finished puzzles.

**A new puzzle is a request, not a guarantee.** For example: “Found 0 of 1 different Hard puzzles within the time limit. The piece set was not changed.” When a set runs out of arrangements the app says so plainly—“Found 6/6 arrangements, the most this piece set allows”—and offers **Generate new piece set**. Some arrangements may differ by only a few pieces. Never silently substitute clue-only variants.

**Play** hands the puzzles to the Player through a portable link; when the link would be too long, a same-browser link is used instead, which keeps a copy of the pack in this browser. The Player's portable address can be shared and bookmarked. Neither app imports or exports files. Play opens the whole puzzle list as one pack of at most 512 KiB, so the list is full at that size: New Puzzle then says so, and a new puzzle that would not fit is not added.
