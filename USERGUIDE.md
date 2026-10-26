# Pentomino User Guide

<a id="top"></a>

**English** · [Tiếng Việt](USERGUIDE.vn.md) · [Developer guide](DEVELOPERGUIDE.md) · [README](README.md)

**Live apps:**
[Pentomino Generator](https://tdat00.github.io/pentomino/generator/) ·
[Pentomino Player](https://tdat00.github.io/pentomino/player/) ·
[GitHub](https://github.com/tdat00/pentomino)

- [What it is](#what-it-is)
- [Using the Generator](#using-the-generator)
- [Using the Player](#using-the-player)
- [Printing](#printing)
- [Privacy](#privacy)
- [License](#license)

---

## What it is

| App | Live | Source | What it does |
|---|---|---|---|
| **Pentomino Generator** | [tdat00.github.io/pentomino/generator](https://tdat00.github.io/pentomino/generator/) | [generator/](generator/) | Draws a board, generates piece sets that provably tile it, makes puzzles from a set at ten levels, prints them, imports a puzzle from its link or code and opens them in the Player |
| **Pentomino Player** | [tdat00.github.io/pentomino/player](https://tdat00.github.io/pentomino/player/) | [player/](player/) | Plays a puzzle from its link: drag or tap to place pieces, undo / redo, proven hints, a timer, saved progress, printing, sharing a puzzle or the whole list as a link with a QR code |

`/pentomino/` itself redirects to the Generator, carrying any query string and `#hash` across. Both apps are in English
and Vietnamese, with light, dark and high-contrast themes, and work with mouse, touch and keyboard.

**Play** in the Generator opens the Player in a new tab with a portable **hash link** that holds the puzzles of the
list as puzzle codes: `…/player/#p=<code>;<code>;…`, one code per puzzle, with `&i=<n>` when the puzzle to open is not
the first. When that link would be too long (over 16,000 characters), only the puzzle to open goes (and the Generator
says so). Neither app imports or exports files: the Player's address
always holds the open puzzle, so a bookmark keeps it and sending the address shares it.

To run a copy on your own computer or to work on the code, see the [developer guide](DEVELOPERGUIDE.md).

[Back to top](#top)

## Using the Generator

The page is a three-step wizard in three panels: the puzzles of the piece set on show on the left, the screen of the
current step in the middle, and the three steps on the right, each in its own frame with the settings and the button of
that step. From 768 px to 1359 px the puzzles go under the main screen. Below 768 px (a phone) the page is one column
of three frames, one per step, as on a wide screen: the step's header, with the summary of a finished step under it, and
the screen of the current step under its frame. The settings and the button of the current step are a bar fixed to the
bottom of the screen, and the puzzles are shown one at a time with ◀ ▶ buttons, like the piece sets, instead of a list of
cards. Under a finished step its frame shows a summary (the preset and size, as in
"Heart 8×15", with a thumbnail of the
board under it, under step 1; the set number, level, seed and piece sizes under step 2), and clicking the summary returns to that
step. The navigator buttons at the top right of the main screen (for example **‹ Step 1 - Create board** and
**Step 3 - Create puzzles ›**) or the step headers (on a phone, the three frames) move between steps. Step 2 opens once the board can get
a piece set (otherwise step 1 says why), and step 3 once a piece set is on show.

1. **Create board.** Choose a preset (Rectangle, Heart, Diamond, Cross or Ring) and the rows and columns (3–32 each),
   then click or drag squares to block or unblock them; blocked squares are grey with a cross. The tools on the board
   zoom in and out, fit the board, switch on a move tool that drags the view, and turn the view by 45° (⟲ ⟳).
   `Ctrl`/`Cmd`+`Z` undoes the last board change; with the keyboard, the arrow keys move a cursor and `Space` toggles a
   square. The status line counts the playable squares and says why a board cannot get a piece set.
2. **Create piece set.** A table lists every level from Very easy to Hell 3 with the number of pieces, the piece sizes
   and the pre-placed pieces it means on this board; the **?** next to a number shows how it is worked out, and levels
   the board cannot use are disabled with the reason. The step frame holds the **Seed** field (✕ clears it, 🎲 draws a
   random seed) and **New piece set**. Under the table, the set on show has a summary such as
   `Hard | 13 pieces | Piece sizes 7–12 | Seed ABCD-EFGH-JKLM` and its pieces. ◀ **Set n of total** ▶ steps through the
   sets made for this board, **Remove** drops the set on show with its puzzles, and **Remove all** drops every set of
   this board after a confirmation. **Select this piece set**, under the pieces, opens step 3 with that set. A new set
   that is the same as one already in the list is not added; that set is shown instead.
3. **Create puzzles.** The step frame holds the puzzle level (the set's level by default), the
   **Require unique solution** switch and **New puzzle**, which adds one puzzle per press. The list on the left shows the
   puzzles of the set on show, newest first: **Puzzle #n**, the level in bold with the score, the number of pieces to
   place, the solution status (*Checking…*, *Unique solution ✓*, *Multiple solutions*, *At least 1 solution*,
   *No solution exists* or *Uniqueness not checked*) and a preview. ✕ removes one puzzle and **Remove all** in the list
   header removes them all. The main screen shows the selected puzzle (the newest one until you click a card) with its
   seed, its board and the pieces to place; **Play** opens it in the Player in a new tab,    **Print** (the printer icon
      right of Play) prints it, and **Show solution**, under the board at its right, draws its solution on the board until
      pressed again (**Hide solution**).

While a job runs, its button shows a spinner and *Elapsed: m:ss* appears under it; after 30 s the button turns into
**Cancel**, and a cancelled batch keeps the puzzles already made. The outcome of the last action (a shortfall, a
cancellation, a repeated set or puzzle) is shown above the main screen, with a **Generate new piece set** button where a
new set would help.

The **EN | VI** switch in the header changes the language without reloading; the choice is remembered in this browser,
and `?lang=vi` or `?lang=en` in the address overrides it. The theme buttons next to it pick the light, dark or
high-contrast theme; without a choice the page follows the system's light or dark setting. The Player has the same two
switches, and both pages share the choices. On a phone (below 768 px) the header has only icons: **Settings** opens a
dialog with the language and the theme, and **Import puzzle** keeps its icon beside it.

**Import puzzle** (the header button left of the language switch; an icon on a phone) opens a dialog where you paste a puzzle link copied
from the Player (**Share**), or its puzzle code, and press **Import**. The board (at the angle of the
link), the piece set and the puzzle, with its stored solution and rating when the code carries them, are re-created: the
board becomes the board of step 1 and the puzzle appears in step 3 in a new piece set (marked *Imported*, with a fresh
seed). The set on show stays in the list of its board. A puzzle of the piece set that is already on show joins it, and
a puzzle that is already in the list is not added twice. A link that cannot be read is explained in the dialog and
changes nothing, as in the Player (a likely single typing mistake is offered as a correction). After an import, **New
puzzle** works on the imported set: the set's solution comes from the link when it carries one, and is otherwise found in
the background (if none is found, the button stays disabled with its reason). When the list of the
board already holds 50 sets, or the puzzle list is full, nothing is imported and a message says so.

- **Board.** Sizes are written **columns×rows**. The view may be turned in 45° steps; the turn is display-only and never
  changes the puzzle. The **Heart** preset is a square board whose top-right quarter is blocked, shown at 45°. Editing
  the board shows the piece sets and puzzles made for the new board, or empty lists; going back to an earlier board
  brings its sets back.
- **Pieces.** A piece set has at least 3 pieces and all pieces are distinct, even when turned or flipped. Any valid
  tiling of the board with the piece set counts as a solution.
- **Seed.** A set seed makes a piece set repeatable: the same board, level, uniqueness switch and seed give the same
  set. A seed you type or draw with 🎲 is used again by every **New piece set**; with an empty field each press draws a
  new random seed and shows it. Each **New puzzle** press draws its own random number as the puzzle seed.
- **New layouts.** Every puzzle is a strictly new arrangement compared with the puzzles already made from the set
  (removing a puzzle does not make its arrangement available again), and a puzzle equal to one already in the list is
  never added. Some piece sets have only a few different arrangements. When a request stops short because no new
  arrangement was found, the Generator counts the arrangements of the set exhaustively (symmetric images count once,
  within a fixed work limit). If the count finishes, the Generator says so, for example **Found 6/6 arrangements** (or
  **Found 2/2 remaining arrangements (6 in total)** when earlier requests used some), and offers
  **Generate new piece set**. Arrangements the normal search did not reach are not wasted: a completion pass turns each
  unused arrangement into a puzzle through the same clue selection, level band and distinctness rules, until the request
  is full or none is left. If the count cannot finish, the Generator reports an honest shortfall without claiming a
  maximum.
- **Saved work.** The board, the settings and the piece sets with their puzzles are kept in this browser: up to **50**
  sets for each of the last **10** boards used. With 50 sets, **New piece set** is disabled until a set is removed. A
  list holds at most **100** puzzles, and no more than fit one 512 KiB pack, because **Play** opens the whole list as
  one pack; when the list is full, **New puzzle** says so.
- **Address.** The address holds only the step (`?step=`; `?lang=` can pick the start language), so a reload returns to
  the step; the settings are in this
  browser's saved work. A `#p=` link (one code per puzzle, as **Play** makes it) in the address opens **Import puzzle**
  and imports its puzzles. Puzzles are not part of the address otherwise; use **Play** and share the Player's link.
- **Limits.** A board needs at least **30** playable squares in one connected region and sides of at most **32**. Boards
  launch at up to **484** playable squares on desktop and **360** on a phone; larger design sizes are enabled only after
  they have been qualified. Each generation action
  has a **60 s** target and a **120 s** hard limit, after which it stops and reports what it has.
- **Difficulty.** Scores are estimates. Ordinary puzzles do not wait for a uniqueness proof: their solution status is
  checked in the background after they appear. A puzzle you require to be unique can still fail to be proven; the
  Generator then says so rather than returning an unproven puzzle.

[Back to top](#top)

## Using the Player

The page has the Generator's look: a header with the title, the **EN | VI** switch, the theme buttons and **Help**,
and three panels. The **puzzles** of the open pack are on the left, the **game** (puzzle name and rating with Share and Print at its right, timer and move
count, Undo / Redo / Hint / Replay and the board) in the middle, and the **pieces to place**, under the toolbar
for the selected piece, on the right. The pieces panel has no scroll bar of its own: with many pieces the page scrolls.
From 768 px to 1359 px the puzzles go under the game.

On a phone (below 768 px) the header keeps only the icons of **Settings** (the language and the theme) and **Help**, the
buttons and fields are smaller, and the **pieces to place** are a bar fixed to the bottom of the screen: one row of
pieces that you swipe sideways. Swipe a piece up to lift it onto the board; press and hold it for its menu (turn, flip),
which replaces the turn and flip buttons of the wide layout. The puzzles of the pack are shown one at a time, with ◀ ▶
buttons above the puzzle's name (and **Remove** and **Remove all** under them), instead of a list of cards.

- **Opening a puzzle.** Follow a player link: the Generator's **Play**, or an address that was shared or bookmarked.
  Without a puzzle the page shows a start screen with **Try the sample** and a link to the Generator. A link with pieces
  but no puzzle is explained, and a link that cannot be opened never replaces the puzzle you are playing. A puzzle
  also opens from its code link, `…/player/#p=<code>`, and several puzzles from `…/player/#p=<code1>;<code2>;…`
  (optionally `&i=<n>`, the puzzle to open, counted from 0; they must share one board and piece set, and none may
  repeat): each code is decoded in a background worker, no Generator and no saved copy is needed, your saved progress is
  kept, and reloading reopens the same puzzles. With one code the address is never rewritten; with several it follows
  the open puzzle (`&i=`). The address
  always holds the open pack and puzzle. A card in the puzzle list (name, level and score, pieces to place, uniqueness,
  progress, preview), newest on top, opens that puzzle; ✕ on a card removes it and **Remove all** empties the list.
- **Entering a puzzle code.** There is no button for it: the **puzzle code** dialog opens by itself when a `#p=` address
  (a link or a scanned QR code) cannot be opened, with the address as its text, and there you can fix the code. It holds
  the code printed with a puzzle, or a whole puzzle link, or several codes separated by `;`. Spaces, line breaks and
  hyphens are ignored,
  lower case works, and O, I and L are read as 0, 1 and 1; the part after a dot is optional, and a code is at most
  16,000 characters (32,768 typed or pasted, at most 100 codes). **Open puzzle** opens it, and the address becomes
  `#p=<code>`. A code that
  cannot be opened is explained in the dialog (for a list, with the number of the puzzle) and changes nothing: your text,
  the open puzzle, its moves and the
  address stay as they were. If a single mistyped character is the likely cause, the dialog shows where and which
  character it may be; nothing is corrected until you press **Use this correction**. If only the part after the dot is
  damaged, **Open without the solution part** opens the puzzle from the part before it (the solution is then searched
  for in the background); both offers are made for one code only, not for a list. Saved moves for the puzzle come back
  silently (also when you reload the page or scan a link to it); **Replay** starts again as printed.
  **Cancel** or `Escape` closes the dialog.
- **Sharing a puzzle.** **Share** (the icon left of **Print**, on the row of the puzzle title, at its right; the Player
  only) opens a window with the link of the puzzle that is shown, `…/player/#p=<code>`, in a read-only field and its QR
  code beside it to scan with a phone: the address that the QR code of the printout carries for it, with its stored
  solution when it fits. With more than one puzzle in the list, **Share all puzzles in the list** makes one link for
  the whole list, opening at the selected puzzle. **Copy link** copies it; "Copied" appears only after the browser has
  taken the text, and if the browser refuses the clipboard the link is selected in the field to copy by hand. When the
  link is too long for a QR code, the stored solutions are left out first, then the QR code uses lower error correction,
  and only then is there no QR code (each step is noted); a link over 4,000 characters gets a warning, and one over
  16,000 characters is not made. Different encoders can write different but equivalent code text for the same puzzle;
  the puzzle it opens is the same.
- **Claims and checks.** Ratings and uniqueness carried by the pack are shown as the pack states them, with the level in
  bold. A puzzle without a uniqueness result reads *At least 1 solution* once a solution is known. Solvability is
  checked in the background; play is never blocked, and *Solvability not verified* never means *No solution exists*.
- **Placing pieces.** Drag a piece onto the board (in the pieces panel a press anywhere in the piece's frame grabs it;
  the mouse wheel turns it while it is held), or select a piece, tap or click a cell to preview it and tap the same cell
  again or press `Enter` to drop it. Letting go over the pieces panel puts a piece back. A drop that does not fit,
  `Escape`, a resize or an interrupted touch puts the piece back; pre-placed pieces are locked. A placed piece can be
  dragged to another place, but it is never turned or flipped on the board: rotating or flipping it (menu, toolbar or
  keys) sends it back to the tray, turned there, as one undoable step.
- **Piece menu.** Right-click a piece (in the pieces panel, or a placed one on the board), or press and hold it on a
  touch screen, to turn it, flip it or return it to the tray (a placed piece goes back to the tray first). The Menu key or `Shift`+`F10` opens it on a focused piece. A right-click on the board also offers
  **Return all pieces to the tray** and **Replay the puzzle** (after a confirmation).
- **Keyboard.** `E` or `R` turn the selected piece clockwise and `Q` counter-clockwise; `F` and `V` flip it left-right
  and top-bottom on screen; the arrow keys move it one cell and `Shift`+arrow three cells; `Enter` or `Space` picks it
  up or commits a valid preview; `Escape` cancels; `Delete` or `Backspace` returns it to the tray; `Ctrl`/`Cmd`+`Z`
  undoes and `Ctrl`/`Cmd`+`Shift`+`Z` or `Ctrl`+`Y` redoes; `?` or **Help** lists the shortcuts.
- **Finishing.** Any complete, legal tiling wins, not only the stored answer. The win dialog celebrates with a trophy
  and a short congratulation, shows the time, the moves (and the hints used), and has small **Next puzzle**, **Replay**
  and **Close** buttons at its bottom right. **Replay** (also the circular-arrow button in the game bar, which asks
  first) starts the puzzle again: all pieces go back to the tray, the timer and the moves start from zero and the saved
  progress of the puzzle is removed.
- **Hints.** The **Hint** button (a light bulb) makes only proven statements, computed in a background worker. It either
  highlights one more piece that fits a complete solution keeping everything you placed (**Place it** puts it down as
  one undoable move), or proves that removing one named piece lets the puzzle be completed with all your other pieces
  kept (**Remove it**). Otherwise the answer is *No repair identified within this check.*: a timeout or a capped search
  is never presented as proof. A result is dropped if you change the board while it is computed.
- **Show solution.** (The page has no button for it at the moment.) Asks first, keeps the pre-placed pieces and fills in
  a solution that agrees with your pieces; if they cannot be completed, you are asked to **Reset, then reveal**. The
  puzzle is then marked **Revealed**: no victory dialog, not counted as solved, until **Replay** starts a fresh session.
- **View.** Every piece shows its letter where its squares are large enough (zoom in for more). A label is always one
  character: past Z the letter is drawn in a circle, a square or a black disc. Colors and letters stay readable on a
  black-and-white print, and sets of more than 20 pieces add fill patterns. The language and the theme are remembered
  in this browser.
- **Progress** is saved locally and restored when the same puzzle is opened again.

[Back to top](#top)

## Printing

**Print** (a printer icon: right of **Play** in the Generator, at the right of the puzzle title in the Player) opens a dialog that
prints the puzzle on A4 paper, to solve it offline with cut-out pieces.

- The first sheet has a **QR code** at the top left, captioned "Play online", and to its right the puzzle's name (the one
  its card shows in the list: "Puzzle #n") with its level and score. Scan the
  QR code to play the same puzzle again in the Player, with no seed. The sheet prints no code text, address or seed. Then
  comes a small preview of the puzzle with the pieces to place (to read, not to cut).
- **Several puzzles.** When the list has more than one puzzle, the dialog has two columns. The right one has **Puzzles
  per page** (1, 2 or 4) and **Puzzles to print**: the puzzles of the list in the order of the panel (newest first), each
  as "Puzzle #n · Level: score n", with **Select all** and **Select none**; the puzzle on show is chosen when the dialog
  opens. The chosen puzzles are printed in numeric order, each with its own QR code, on the first sheets, 1, 2 (one above
  the other) or 4 (two by two) to a sheet, with dashed lines to cut along; a QR code too large for a quarter of a sheet is
  drawn smaller. The piece set and the board are printed once, whatever the number of puzzles.
- **The QR code** is made on your device when the dialog opens (**Print** waits for "Preparing the puzzle code…"). When
  the puzzle has a stored answer, it is carried in the code; that does not print a solution sheet. A code is never cut
  short; in the rare case that it is too long for one QR code, the optional solution part is left out, then the QR code
  uses lower error correction, and if even that is not possible the sheet says so and prints no QR code. The dialog says
  each of these before printing.
- **Where the QR code leads**: to the Player of the page you printed from, always (also on `localhost`, a network
  address or a file); there is no option to change it. **Share** (see [Using the Player](#using-the-player)) points at the same page
  and carries the same code.
- **Include piece set**: every piece of the set, the pre-placed ones too, ready to cut out.
- **Include board**: the playable squares. A board too big for a sheet is split into parts; a numbered mark on each
  shared edge shows which part joins there.
- **Print on both sides**: each piece and board part is mirrored on the back, so the cut-out matches on both sides
  (choose two-sided printing, flipped on the long edge).
- **Print solution** (Generator only): the solved board after the puzzle (with two sides, on its back). With several
  puzzles to a sheet, the solutions of the puzzles of that sheet share the next sheet, each behind its puzzle when
  printing on both sides.
- **Board size**: a table of Small, Medium and Large (cells of 10, 15 and 20 mm) and Fit to page, with the A4 sheets each
  needs. The pieces use the same cell size as the board, so they sit on it exactly.

Print at 100 % (actual size): the 50 mm bar on the first sheet shows whether the printer scaled the page. A diagonal view
(the Heart) is printed in its grid, because paper cannot turn by 45°.

[Back to top](#top)

## Privacy

- Everything stays in your browser: no account, no upload, no remote solver, no analytics. A puzzle travels in the
  `#p=` part of its link, which the browser never sends to the server. Share links may leave out the answer.
- The Generator keeps your work (the board, the settings, the piece sets and their puzzles) in this browser; the
  Player keeps your progress on up to 300 puzzles. Both remember the language and the theme. A puzzle list itself is
  never stored by the Player: it lives in its link, so keep or bookmark the link.
- Browser storage can be disabled, shared or full. When it is full, the oldest saved entries are dropped once (the
  Generator drops its oldest piece sets first); if saving still fails, you can keep working, the page says that your
  work cannot be saved, and it is lost when you close the tab.

[Back to top](#top)

## License

Released under the [MIT License](LICENSE) © 2026 Dat Le. The third-party parts are listed in the
[developer guide](DEVELOPERGUIDE.md#license).

[Back to top](#top)
