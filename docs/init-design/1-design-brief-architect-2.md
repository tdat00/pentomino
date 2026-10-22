# Design brief — Architect 2

**Independent proposal · 22 October 2026**

## The experience

A browser-based, account-free puzzle workshop. Casual players can start with most of the board filled; enthusiasts can create unusual boards and harder challenges.

Each set contains **10–18 differently shaped, differently colored pieces**, each with at least three squares. Turn or flip pieces to cover every available square exactly once.

## Main journey

**Home → Generator → Generate Piece Set → New Puzzle → Play → Player**

1. **Choose a board.** Start with 6×10, 5×12, another size, or a heart-shaped template. Paint squares to block them; undo, redo, and reset are available. A counter shows available squares.
2. **Choose a challenge.** Select Very Easy through Nightmare, or supported Hell tiers. The page explains the expected experience.
3. **Generate Piece Set.** Inspect the pieces, sizes, and actual count. Regenerate for another set; an optional seed supports reproduction. The app checks that the pieces can fill the board.
4. **New Puzzle.** Request 1–10 puzzles with this exact set. Each has a different underlying arrangement and some locked starting pieces. Cards show level, score, and pieces left to place.
5. **Play.** Open the selected puzzle directly in the separate player. Alternatively, download one puzzle or the whole pack as a JSON file.

Changing board cells warns before discarding generated results. Rotating the view does not discard them.

## Screens and controls

| Screen | What the user sees and controls |
|---|---|
| Generator: board | Size inputs, cell editor, heart preset, rotation, available-cell count, clear explanations of impossible configurations. |
| Generator: pieces | Difficulty choice, Generate Piece Set, labeled colored pieces, size distribution, reproducible seed, progress and Cancel. |
| Generator: puzzles | Quantity 1–10, New Puzzle, optional “Require one solution,” puzzle cards, Play, download, and any shortfall explanation. |
| Player | Board, locked starting pieces, remaining-piece tray, rotate/flip buttons, undo/redo, reset, import, and completion feedback. |

The player also works independently: **choose or drop a puzzle file**, then select a puzzle. Invalid files produce an explanation without replacing the current game.

## Playing comfortably

Drag a piece or select it and click a board square. A preview shows its destination; invalid drops change nothing. Turn, flip, move, or return pieces to the tray. Starting pieces cannot move.

Keyboard controls and buttons offer the same actions. Phones support select-then-tap. Letters and outlines supplement color; player moves support undo.

Cover every available square without overlap and use every piece. **Any valid completion wins**, even if it differs from the generator’s original arrangement.

## Difficulty, honestly explained

| Level | Typical experience |
|---|---|
| Very Easy / Easy | Many pieces already placed; short, approachable decisions. |
| Normal / Hard | More pieces to fit and more plausible alternatives. |
| Expert / Master | Few starting clues; substantial planning and backtracking. |
| Nightmare / Hell tiers | Very few clues and unusually demanding searches; generation may take longer. |

One scoring rule considers remaining pieces, empty squares, placement choices, and search effort. Labels are **estimates**, not promised solving times. Piece count and starting clues guide generation but do not determine the label alone.

## Important expectations

- **Board size limits piece count.** Eighteen distinct pieces cannot fit in 60 squares; the proposed size-balance rules allow at most 12. The app explains this instead of making duplicate or undersized pieces.
- **45° rotation changes the view, not the square-grid rules.** Shape the board by blocking cells; diagonal display makes a stepped heart easier to recognize. Pieces still turn in 90° steps relative to the board.
- **One solution is optional.** Enable “Require one solution” to request a verified unique puzzle. Otherwise multiple correct completions are allowed.
- **Ten puzzles are a request, not a promise.** Show only genuinely different arrangements and explain any shortfall.
- **Browser transfer is convenient, files are portable.** Play transfers locally between the two pages. Download a file to share with someone else or keep a durable copy.
