# Pentomino Puzzle Studio — Final design brief

**Phase 7 · 22 October 2026**

## Purpose and main journey

An account-free puzzle workshop for players, enthusiasts, parents, and teachers. Create challenges in the **Generator** and solve them in the **Player**.

**Home → Generator → Generate Piece Set → New Puzzles → Play → Player**

Visiting `tdat00.github.io/pentomino` opens the Generator. The Player also opens shared links and imports puzzle files without using the Generator.

Generated pieces contain at least three joined squares. Sizes vary, but shapes never repeat after turning or flipping. Colors, patterns, and labels continuing beyond Z help distinguish them.

## Generator: make a challenge

1. **Shape the board.** Enter rows and columns or choose a preset. Paint cells to block/unblock them; keep the playable area connected. Undo, reset, a square counter, and warnings help.

2. **Turn the view.** Rotate in 45° steps. **This never changes the grid, blocked cells, pieces, or difficulty.** The Heart preset is a square with its top-right quarter blocked, displayed at 45° counter-clockwise. Paint in that view or choose Edit unrotated.

3. **Choose a level.** See available levels and piece counts. Optional controls include a repeatable text seed and **Require one solution**—experimental for Hell puzzles above 200 squares, where it may find no result.

4. **Generate Piece Set.** Inspect the pieces and sizes. The app verifies they can fill the board and finds a matching sample puzzle before declaring the set ready.

5. **New Puzzles.** Request **1–10 puzzles with this exact set**. Each has a genuinely different arrangement and starting clues. Some pieces are locked; at least two remain to play.

6. **Inspect and launch.** Cards show a preview, estimated level/score, and starting-piece count. Badges update separately: Checking, Unique solution, Several solutions, or Uniqueness not proved. **Play**, Copy link, and Export need not wait.

Board edits ask before invalidating generated results; old puzzles remain playable/exportable. View changes preserve everything. A different difficulty may need a new piece set.

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

Open a link, choose a recent puzzle, or **Import** a `.json` file by choosing/dropping it. Invalid imports explain the problem without replacing the game.

- Board, tray, and dragged pieces use matching angles; labels stay upright. Zoom, pan, and Straighten view help on small screens.
- Large boards can use pieces of about 50 squares; the tray scrolls.
- Drag a piece, or select it, tap a board cell to preview, then confirm. A highlighted square anchors placement. Invalid drops leave the previous position unchanged.
- Mouse, keyboard, and touch support every move. Arrows position; E/Q turn; F/V flip; Enter places. Visible buttons duplicate these actions. Pieces turn in 90° steps even on a diagonal board.
- Starting pieces stay locked. Move or remove your own pieces, undo/redo, or reset.
- **Any valid completion wins:** every piece used, every playable square covered, no overlaps. Continue with Next puzzle or Replay.
- Progress saves locally when storage is available; storage failure does not prevent play.

## Limits, waiting, and sharing

Boards need **at least 30 playable squares**, with sides ≤**32**. Launch limits are **484 squares on desktop and 360 in phone mode**. Passing browser checks can raise these to **576 and 484**. Desktop **Large boards** mode allows up to **676**, experimental beyond the normal limit.

Each generation action targets **one minute** and stops with its results or a clear explanation within **two minutes**. Progress shows the stage, elapsed time, and accepted count; Cancel keeps finished puzzles.

**Ten is a request, not a guarantee.** For example: “Found 3 of 10 different Hard puzzles within the time limit. The piece set was not changed.” Some arrangements may differ by only a few pieces. Try again or generate another set; never silently substitute clue-only variants.

Share portable links or export puzzles, with or without answers. Files are the durable fallback; same-browser-only transfers are labeled clearly.
