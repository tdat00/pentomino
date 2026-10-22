# Pentomino Puzzle Studio — Design Brief (architect-1)

> Status: proposal for cross-review · Author: architect-1 · Date: 2026-10-22
> Companion document (for developers): `1-design-detail-architect-1.md`

## 1. What we are building

Two small websites that run entirely in the browser (no server, no account):

- **Generator** (`tdat00.github.io/pentomino/generator/`) — design a board, get a random set of
  colored pieces, and create 1–10 puzzles at a chosen difficulty.
- **Player** (`tdat00.github.io/pentomino/player/`) — solve those puzzles by dragging, rotating and
  flipping pieces until the board is completely filled.

Opening `tdat00.github.io/pentomino` goes straight to the Generator.

The game follows classic pentomino / Puzzlia rules: fill every open cell of the board using every
piece exactly once. You may rotate and flip pieces, and pieces must not overlap. Unlike classic
pentominoes, pieces have random shapes and sizes (at least 3 cells each), and no two pieces in a set
are the same, even after rotating or flipping.

## 2. Who uses it

| User | Goal |
|---|---|
| Puzzle maker (teacher, parent, hobbyist) | Create fresh puzzles at the right difficulty and share them. |
| Player (kids to puzzle experts) | Open a puzzle from a link or file and solve it on desktop or phone. |

Often this is the same person: they generate a puzzle and press **Play** right away.

## 3. Main flow

1. **Board.** Enter a size (for example 6×10 or 5×12) or choose a shape preset (Rectangle, Heart,
   Diamond, Plus, Ring). Click or drag over cells to block or unblock them. Rotate the board by
   45° or 90° to get new shapes: a 45° turn turns a rectangle into a diamond-like shape. A live
   counter shows the number of open cells and warns about problems, such as areas too small to fill.
2. **Difficulty.** Choose one of nine levels, from *Very easy* to *Hell 2*. The page shows how
   many pieces the set will have and whether the board is big enough for that level.
3. **Generate Piece Set.** The app creates 10–18 distinct, colored, lettered pieces (fewer on
   small boards) that exactly fill the board. It also shows the hardest level this set can reach.
   Press the button again to get another set.
4. **New Puzzles.** Choose how many (1–10) and press **New Puzzles**. Every puzzle uses the same
   piece set but a different arrangement. Some pieces start already placed and locked: many on
   easy levels and few or none on hard levels. Each puzzle card shows its level, difficulty
   score (0–100), number of pre-placed pieces, and whether the solution is unique. Cards appear one
   by one as they are ready.
5. **Play / Share.** **Play** opens the puzzle in the Player. **Copy link** creates a link that
   contains the whole puzzle. **Export** downloads a `.json` file. Everything is saved
   automatically, so going back restores your work.

Long jobs, such as big boards on Hell levels, show a progress bar and a **Cancel** button. An
optional *seed* lets you recreate exactly the same set and puzzles later.

## 4. Generator screen (at a glance)

```
┌ Board ──────────────┐ ┌ Difficulty ───────────┐ ┌ Piece set ────────────┐
│ W [10] H [6] Preset │ │ ( ) Very easy … Hell 2│ │ A B C D …  (colored)  │
│ ⟲45 ⟳45 ⟲90 ⟳90     │ │ 12 pieces · ok for    │ │ 12 pieces · 3–7 cells │
│ [grid: click=block] │ │ this board            │ │ reaches up to: Master │
│ 60 open cells       │ │ [Generate Piece Set]  │ │ [ ] show a solution   │
└─────────────────────┘ └───────────────────────┘ └───────────────────────┘
┌ Puzzles  count [5]  [New Puzzles]  [Play all] [Export pack] [Copy link] ───┐
│ [card: thumbnail · Hard · 41 · 4 pre-placed · unique ✓ · ▶ Play ⬇ 🔗] …    │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Player screen

- **Loading puzzles:** opens automatically from a **Play** link. You can also **Import** a `.json`
  file (button or drag-and-drop), paste a link or code, pick from *Recent*, or try a built-in sample.
- **Board and tray:** the board appears in the center. Remaining pieces sit in a tray (to the side
  on desktop, below on phones). Pre-placed pieces are locked and marked with a pin or hatching.
- **Moving pieces:** drag a piece onto the board. A shadow shows where it will land: green if
  it fits, red if it doesn't. Drop it on a valid spot to place it, or anywhere else to return it to
  the tray. Drag a placed piece to move it. Double-tap a placed piece to send it back to the tray.
- **Rotate and flip:** tap or click a piece to select it, and tap the selected piece again to
  rotate it 90°. Toolbar buttons rotate either way and flip horizontally or vertically. On desktop,
  `R` / `Shift+R` rotate, `F` / `V` flip, and the mouse wheel rotates while dragging.
- **Keyboard-only play:** `Tab` chooses a piece, arrow keys move it, `Enter` places it, and `Esc`
  cancels.
- **Help:** **Undo/Redo**, **Reset**, and **Hint** (shows where one piece goes, or which piece is
  probably wrong). **Show solution** asks for confirmation first.
- **Winning:** when every cell is filled, you win, even if your arrangement differs from the
  generator's. A summary shows your time, moves and hints, with **Next puzzle**.
- **Progress:** saved automatically per puzzle, so you can close the tab and continue later.

## 6. Difficulty levels

Every puzzle gets a **difficulty score from 0 to 100**, calculated by one shared formula. Its main
inputs are:

1. how many pieces **you** must place (most important);
2. how much trial-and-error a methodical solver needs;
3. whether the solution is unique;
4. how often pieces must be flipped as well as rotated.

The level is simply the score band:

| Level | Score | Pieces you place (typical) | Pre-placed pieces | Board needed (open cells) |
|---|---|---|---|---|
| Very easy | 0–14 | 3–4 | most of the set | any |
| Easy | 15–24 | 5–6 | many | ≥ 20 |
| Normal | 25–34 | 7–8 | about a third | ≥ 30 |
| Hard | 35–44 | 8–9 | a few | ≥ 44 |
| Expert | 45–54 | 10–11 | 1–3 | ≥ 52 |
| Master | 55–64 | 11–13 | 0–2 | ≥ 60 (6×10, 5×12) |
| Nightmare | 65–74 | 13–15 | 0–1 | ≥ 72 (8×9, large heart) |
| Hell 1 | 75–84 | 15–17 | 0–2 | ≥ 90 (9×10) |
| Hell 2 | 85–100 | 17–18 | 0–1 | ≥ 110 (10×11) |

Harder levels use more pieces in the set and fewer pre-placed pieces.

Small boards cannot hold enough different pieces for the top levels. For example, a 6×10 board fits
at most 13 distinct pieces and usually tops out at Master. In that case the generator gives the
closest match, shows its real level, and suggests a larger board.

## 7. Good to know

- **Fair puzzles:** every puzzle is guaranteed to have a solution. Harder levels prefer puzzles
  with exactly one solution. An *Unique solution only* option is also available.
- **Private and offline-friendly:** nothing is uploaded. Links carry the puzzle inside them, and
  saved data stays in your browser.
- **Supported browsers:** current Chrome, Edge, Firefox and Safari, on desktop and mobile.
