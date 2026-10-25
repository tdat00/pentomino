# Pentomino

<a id="top"></a>

**Live apps · Ứng dụng trực tuyến:**
[Pentomino Generator](https://tdat00.github.io/pentomino/generator/) ·
[Pentomino Player](https://tdat00.github.io/pentomino/player/) ·
[GitHub](https://github.com/tdat00/pentomino)

- [Table of Contents](#english)
  - [What it is](#what-it-is)
  - [Using the Generator](#using-the-generator)
  - [Using the Player](#using-the-player)
  - [Printing](#printing)
  - [Storage and privacy](#storage-and-privacy)
  - [Run locally](#run-locally)
  - [Develop and test](#develop-and-test)
  - [Publishing](#publishing)
  - [Documents](#documents)
  - [License](#license)
- [Mục lục](#tieng-viet)
  - [Giới thiệu](#giới-thiệu)
  - [Dùng trình tạo đề](#dùng-trình-tạo-đề)
  - [Dùng trình chơi](#dùng-trình-chơi)
  - [In ra giấy](#in-ra-giấy)
  - [Lưu trữ và quyền riêng tư](#lưu-trữ-và-quyền-riêng-tư)
  - [Chạy trên máy](#chạy-trên-máy)
  - [Phát triển và kiểm thử](#phát-triển-và-kiểm-thử)
  - [Xuất bản](#xuất-bản)
  - [Tài liệu](#tài-liệu)
  - [Giấy phép](#giấy-phép)

---

Two static web apps for pentomino-style tiling puzzles, in plain HTML, CSS and JavaScript. **Pentomino Generator**
draws a board, makes a piece set that tiles it and turns it into puzzles at the level you choose; **Pentomino Player**
plays them. Everything runs in the browser: no account, no backend, no remote solver, no upload, no build step and no
runtime dependency. (The Vietnamese part is [below](#tieng-viet).)

Hai ứng dụng web tĩnh về câu đố xếp hình kiểu pentomino, viết bằng HTML, CSS và JavaScript thuần. **Pentomino
Generator** (trình tạo đề) vẽ bàn chơi, tạo một bộ mảnh lấp kín bàn và biến nó thành các đề ở mức độ bạn chọn;
**Pentomino Player** (trình chơi) để chơi các đề đó. Mọi thứ chạy trong trình duyệt: không tài khoản, không máy chủ xử lý,
không bộ giải từ xa, không tải dữ liệu lên, không bước biên dịch và không thư viện chạy kèm. (Phần tiếng Việt nằm ở
[phía dưới](#tieng-viet).)

---

<a id="english"></a>

# English

## What it is

| App | Live | Source | What it does |
|---|---|---|---|
| **Pentomino Generator** | [tdat00.github.io/pentomino/generator](https://tdat00.github.io/pentomino/generator/) | [generator/](generator/) | Draws a board, generates piece sets that provably tile it, makes puzzles from a set at ten levels, prints them, copies a puzzle's link and opens them in the Player |
| **Pentomino Player** | [tdat00.github.io/pentomino/player](https://tdat00.github.io/pentomino/player/) | [player/](player/) | Plays a puzzle from its link: drag or tap to place pieces, undo / redo, proven hints, a timer, saved progress, printing, copying a puzzle's link |

`/pentomino/` itself redirects to the Generator, carrying any query string and `#hash` across. Both apps are in English
and Vietnamese, with light, dark and high-contrast themes, and work with mouse, touch and keyboard.

**Play** in the Generator opens the Player in a new tab with a portable **hash link** that holds the puzzles of the
list. When that link would be too long, the Generator falls back to a **same-browser** `#lib=` link, which only works in
the browser that made it. Neither app imports or exports files: the Player's address always holds the open puzzle, so a
bookmark keeps it and sending the address shares it.

> **Status.** The repository is built task by task, so a feature listed here may not be finished yet. Release acceptance
> (browser matrix, performance gates) is tracked separately, and nothing below promises browser timings before that
> qualification has been reported.

[Back to top](#top)

## Using the Generator

The page is a three-step wizard in three panels: the puzzles of the piece set on show on the left, the screen of the
current step in the middle, and the three steps on the right, each in its own frame with the settings and the button of
that step. From 768 px to 1359 px the puzzles go under the main screen; below 768 px the steps form a row on top and the
settings of the current step take a row under them. Under a finished step its frame shows a summary (a thumbnail of the
board under step 1; the set number, level, seed and piece sizes under step 2), and clicking the summary returns to that
step. The navigator buttons at the top right of the main screen (for example **‹ Step 1 - Create board** and
**Step 3 - Create puzzles ›**) or the step headers on the right move between steps. Step 2 opens once the board can get
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
   seed, its board and the pieces to place; **Play** opens it in the Player in a new tab, **Print** (the printer icon
   right of Play) prints it, **Copy this puzzle link** (right of Print) copies the Player address of that one puzzle,
   and **Show solution**, under the board at its right, draws its solution on the board until
   pressed again (**Hide solution**).

While a job runs, its button shows a spinner and *Elapsed: m:ss* appears under it; after 30 s the button turns into
**Cancel**, and a cancelled batch keeps the puzzles already made. The outcome of the last action (a shortfall, a
cancellation, a repeated set or puzzle) is shown above the main screen, with a **Generate new piece set** button where a
new set would help.

The **EN | VI** switch in the header changes the language without reloading; the choice is remembered in this browser,
and `?lang=vi` or `?lang=en` in the address overrides it. The theme buttons next to it pick the light, dark or
high-contrast theme; without a choice the page follows the system's light or dark setting. The Player has the same two
switches, and both pages share the choices.

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
- **Address.** The settings live in the address, so a reload or a shared link returns to them: `step`, `preset`, `angle`
  (the view angle), `cells` (the board key `WxH:<base64url bits>`), `level`, `seed` and `unique=1`. A link with a `seed`
  and step 2 or 3 shows the set made with that seed: the one saved in this browser, or the same set generated again.
  Puzzles are not part of the address; use **Play** and share the Player's link.
- **Limits.** A board needs at least **30** playable squares in one connected region and sides of at most **32**. Boards
  launch at up to **484** playable squares on desktop and **360** on a phone; larger design sizes are enabled only after
  they have been qualified (the headless `tools\generate.mjs` accepts boards of up to **676**). Each generation action
  has a **60 s** target and a **120 s** hard limit, after which it stops and reports what it has.
- **Difficulty.** Scores are estimates. Ordinary puzzles do not wait for a uniqueness proof: their solution status is
  checked in the background after they appear. A puzzle you require to be unique can still fail to be proven; the
  Generator then says so rather than returning an unproven puzzle.

[Back to top](#top)

## Using the Player

The page has the Generator's look: a header with the title, **Enter puzzle code**, **Help**, the **EN | VI** switch and
the theme buttons, and three panels. The **puzzles** of the open pack are on the left, the **game** (puzzle name and rating, timer and move
count, Undo / Redo / Hint / Replay / Print / Copy this puzzle link and the board) in the middle, and the **pieces to place**, under the toolbar
for the selected piece, on the right. The pieces panel has no scroll bar of its own: with many pieces the page scrolls.
From 768 px to 1359 px the puzzles go under the game; below 768 px the panels stack.

- **Opening a puzzle.** Follow a player link: the Generator's **Play**, or an address that was shared or bookmarked.
  Without a puzzle the page shows a start screen with **Try the sample** and a link to the Generator. A link with pieces
  but no puzzle is explained, and a link that cannot be opened never replaces the puzzle you are playing. A single
  puzzle also opens from its one-puzzle code link, `…/player/#p=<code>`: it is decoded in a background worker, needs no
  Generator and no saved copy, keeps your saved progress, and reloading it reopens the same puzzle. The address
  always holds the open pack and puzzle. A card in the puzzle list (name, level and score, pieces to place, uniqueness,
  progress, preview), newest on top, opens that puzzle; ✕ on a card removes it and **Remove all** empties the list.
- **Entering a puzzle code.** **Enter puzzle code** (on the start screen and in the header) opens a dialog where you
  type or paste the code printed with a puzzle, or a whole puzzle link. Spaces, line breaks and hyphens are ignored,
  lower case works, and O, I and L are read as 0, 1 and 1; the part after a dot is optional, and a code is at most
  16,000 characters (32,768 typed or pasted). **Open puzzle** opens it, and the address becomes `#p=<code>`. A code that
  cannot be opened is explained in the dialog and changes nothing: your text, the open puzzle, its moves and the
  address stay as they were. If a single mistyped character is the likely cause, the dialog shows where and which
  character it may be; nothing is corrected until you press **Use this correction**. If only the part after the dot is
  damaged, **Open without the solution part** opens the puzzle from the part before it (the solution is then searched
  for in the background). Saved moves for the puzzle come back with a short notice; **Replay** starts again as printed.
  **Cancel** or `Escape` closes the dialog.
- **Copying a puzzle link.** **Copy this puzzle link** (the link icon after **Print** in the game bar, and in the
  Generator right of **Print**) copies `…/player/#p=<code>` for the puzzle that is shown: the address that the QR code
  of the printout carries for it, with its stored solution when it fits. It is never a pack link. While the link is
  prepared the button is marked busy; "Link copied" appears only after the browser has taken the text, and if the
  browser refuses the clipboard a window shows the link in a read-only field to copy by hand. A puzzle with no
  fitting QR code is still copied, with a note; a link over 4,000 characters is copied with a warning, and one over
  16,000 characters is not copied. Different encoders can write different but equivalent code text for the same puzzle;
  the puzzle it opens is the same.
- **Claims and checks.** Ratings and uniqueness carried by the pack are shown as the pack states them, with the level in
  bold. A puzzle without a uniqueness result reads *At least 1 solution* once a solution is known. Solvability is
  checked in the background; play is never blocked, and *Solvability not verified* never means *No solution exists*.
- **Placing pieces.** Drag a piece onto the board (in the pieces panel a press anywhere in the piece's frame grabs it;
  the mouse wheel turns it while it is held), or select a piece, tap or click a cell to preview it and tap the same cell
  again or press `Enter` to drop it. Letting go over the pieces panel puts a piece back. A drop that does not fit,
  `Escape`, a resize or an interrupted touch puts the piece back; pre-placed pieces are locked. Rotating or mirroring a
  placed piece keeps its grabbed cell in place and tries a one-cell nudge before saying *No room to rotate here*.
- **Piece menu.** Right-click a piece (in the pieces panel, or a placed one on the board) to turn it, flip it or return
  it to the tray. The Menu key or `Shift`+`F10` opens it on a focused piece. A right-click on the board also offers
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
  black-and-white print, and sets of more than 20 pieces add fill patterns. The **Straighten** view, the language and the
  theme are remembered in this browser.
- **Progress** is saved locally and restored when the same puzzle is opened again.

[Back to top](#top)

## Printing

**Print** (a printer icon: right of **Play** in the Generator, right of **Replay** in the Player) opens a dialog that
prints the puzzle on A4 paper, to solve it offline with cut-out pieces.

- The first sheet shows the puzzle's name (the one the Player shows: "Puzzle #n" when it has no title, a number added to
  other titles), its level and score, and its piece set's level and seed. Under them is the puzzle's **code** with a **QR
  code** at the top right: scan the QR code, or type the code into the Player's **Enter puzzle code**, to play the same
  puzzle again, with no seed. Then comes a small preview of the puzzle with the pieces to place (to read, not to cut).
- **The code and its QR code** are made on your device when the dialog opens (**Print** waits for "Preparing the puzzle
  code…"). When the puzzle has a stored answer, it is carried in the part after the dot, printed smaller under "+
  solution, optional"; that does not print a solution sheet. A long code continues on extra numbered sheets (the QR code
  stays on the first). A code is never cut short; in the rare case that it is too long for one QR code, the optional
  solution part is left out, then the QR code uses lower error correction, and if even that is not possible the sheet
  says so and prints neither code nor QR code. The dialog says each of these before printing.
- **Where the QR code leads**: to the Player of the page you printed from; from a local page (`localhost`, a network
  address, a file) to the public Player, which a phone can reach. A checkbox shown only on local pages points it at the
  local Player instead, for development; it is not remembered. **Copy this puzzle link** (see Using the Player) copies
  that same address, without the checkbox.
- **Include piece set**: every piece of the set, the pre-placed ones too, ready to cut out.
- **Include board**: the playable squares. A board too big for a sheet is split into parts; a numbered mark on each
  shared edge shows which part joins there.
- **Print on both sides**: each piece and board part is mirrored on the back, so the cut-out matches on both sides
  (choose two-sided printing, flipped on the long edge).
- **Print solution** (Generator only): the solved board on the sheet after the puzzle (with two sides, on its back).
- **Board size**: a table of Small, Medium and Large (cells of 10, 15 and 20 mm) and Fit to page, with the A4 sheets each
  needs. The pieces use the same cell size as the board, so they sit on it exactly.

Print at 100 % (actual size): the 50 mm bar on the first sheet shows whether the printer scaled the page. A diagonal view
(the Heart) is printed in its grid, because paper cannot turn by 45°.

[Back to top](#top)

## Storage and privacy

- Everything stays in the browser: no upload, no remote solver, no analytics. A puzzle travels in the `#pack=` part of
  its link (or, for a single puzzle, its `#p=` code), which the browser never sends to the server. Share links may omit
  the answer.
- Both apps use `localStorage` keys under `pentomino:v1:` only, and never touch other keys of the same origin:
  - Generator: its work (board, settings, piece sets and puzzles) in `gen:state`;
  - Player: the progress of each puzzle (`progress:<fingerprint>`, up to 300, save times in `progress-index`), the
    Straighten choice (`prefs`), and a copy of a pack only for a same-browser `#lib=` link (`lib:index` and one
    `lib:<packId>` per pack, the 30 most recently opened);
  - both: the language (`lang`) and the theme (`theme`).
- Browser storage can be disabled, shared or full. On a quota error the oldest entries of this namespace are dropped
  once (the Generator first drops its oldest saved piece sets); if saving still fails, work continues in memory and the
  page says that it cannot be saved.

[Back to top](#top)

## Run locally

The apps use native ES modules and workers, so they must be served over HTTP (`file://` is not supported). Use the
bundled static server, which serves `.js` and `.mjs` with the right MIME type:

```text
node tools\serve.mjs --port 8080 --prefix /pentomino/
```

Then open `http://localhost:8080/pentomino/`. Also available as `npm run serve`. Options: `--root DIR`, `--port N`,
`--prefix /path/`, `--host ADDR` (`--prefix /` tests hosting at the root). On Windows, `run.cmd [port]` starts the same
server (default port 8080) and opens the Generator; set `NO_BROWSER=1` to skip opening it.

[Back to top](#top)

## Develop and test

Node.js 22 or newer. There is no build step and there are no runtime dependencies.

```text
npm run check        # repository conventions (UTF-8, line endings, final newline, no trailing whitespace) and site references
npm run test:quick   # unit tests without the slow ones: node --test --test-skip-pattern=slow "tests/**/*.test.js"
npm test             # all unit tests: node --test "tests/**/*.test.js"
```

- **Browser test pages** (not deployed): run `npm run serve` and open `http://localhost:8080/pentomino/tests/browser/`
  followed by `player-controls.html`, `player-load.html`, `hints.html`, `print.html`, `rendering.html`,
  `generator-flow.html`, `generator-editor.html`, `puzzle-code-worker.html`, `puzzle-code-entry.html`,
  `puzzle-code-print.html`, `puzzle-code-copy.html`, `puzzle-code-cli-parity.html` or
  `acceptance.html`. Each writes a pass/fail list and `data-summary` on `<html>`. Use a window narrower than 1360 px:
  some checks expect the one- or two-column layout.
- **Headless generation**: `node tools\generate.mjs --board 10x6 --level hard --count 5 --seed demo --workers 4`. The
  pack goes to stdout (or `--output`), messages to stderr. Exit codes: `0` complete (including a set whose
  arrangements were all found and proven to be all); `2` a valid partial or cancelled pack; `1` no usable result or
  invalid input. Add `--code` (a flag without a value, also allowed with `--recipe`) to print the puzzle code of every
  accepted puzzle instead of the pack: one ungrouped, upper-case line per puzzle in pack order, the same code that Print
  makes for that puzzle (see Printing). With `--output file` the pack is still written to the file; without it no
  file is made. Progress and errors stay on stderr, and the exit codes and the generation itself do not change, for
  example `node tools\generate.mjs --recipe tests\fixtures\generation-case.json --workers 1 --code --output pack.json`.
- **Performance and calibration** (screening only; they never change a qualification gate):
  `node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\smoke.json --workers 4 --fresh-process --output docs\calibration\node-smoke`,
  the score landscape (`--profile landscape`, hours, resumable), and the browser page
  `http://localhost:8080/pentomino/tools/bench/` (keep the tab in the foreground).

**Code layout.** Native ES modules with JSDoc types and `// @ts-check`, in four layers:

```text
core/engine/    pure, deterministic logic: geometry, boards, tiling, generation, rating, packs, puzzle codes (no DOM, clock or storage)
core/browser/   rendering (SVG board), storage, i18n, themes, pointer handling, printing, the generation and puzzle-code clients
core/workers/   the module worker that runs generation and puzzle codes off the main thread, with cancel and deadline watchdogs
generator/      Pentomino Generator: page, state, jobs and UI
player/         Pentomino Player: page, state, play, hints and UI
tests/          Node unit tests (*.test.js) and browser test pages (tests/browser/)
tools/          Node-only tools (.mjs): server, headless generation, calibration, site checks
```

Every module loaded by a page or worker uses `.js`; `.mjs` is reserved for Node-only tools. The interface text is in the
flat packs `generator/locale.en.js` / `locale.vi.js` and `player/locale.en.js` / `locale.vi.js` (printing texts in
`core/browser/print-texts.js`), looked up by `core/browser/i18n.js`. The English pack has every key; the Vietnamese pack
has the same keys and `{placeholders}`, which the i18n tests check. A new visible text needs a key in both packs.

[Back to top](#top)

## Publishing

`.github/workflows/pages.yml` runs the tests, stages the site, stamps it and verifies it before publishing it on GitHub
Pages; a failure stops the deployment. Only `index.html`, `redirect.js`, `core`, `generator` and `player` are deployed.
The site lives under `/pentomino/`, so every link is relative.

| Address | Content |
|---|---|
| [tdat00.github.io/pentomino/](https://tdat00.github.io/pentomino/) | redirects to the Generator |
| [tdat00.github.io/pentomino/generator/](https://tdat00.github.io/pentomino/generator/) | Pentomino Generator |
| [tdat00.github.io/pentomino/player/](https://tdat00.github.io/pentomino/player/) | Pentomino Player |

```text
node tools\stamp-version.mjs _site abc12345
node tools\check-site.mjs _site --expect-version abc12345
node tools\check-site.mjs . --entry tools/bench/index.html
node tools\serve.mjs --root _site --port 8081 --prefix /pentomino/
```

- `stamp-version.mjs <siteDir> <sha8>` works on a staged copy only and appends `?v=<sha8>` to every relative asset and
  module reference (HTML, `import`, `export … from`, `new URL(…, import.meta.url)`, CSS `@import`/`url()`), so a module
  is never loaded twice; unresolved dynamic patterns make it fail without writing anything.
- `check-site.mjs <root>` resolves HTML, imports, worker URLs, CSS assets and directory indexes, and fails on missing
  files, root-absolute or external assets, a browser `.mjs` import, inline scripts or styles, a missing Content Security
  Policy and a mixed-version graph. `--expect-version <sha8>` also requires every reference to carry that version;
  `--entry <relativeHtml>` checks only the given pages.

There is no service worker. GitHub Pages caches for up to ten minutes, which is why every reference carries the commit
version.

[Back to top](#top)

## Documents

- [docs/design-brief.md](docs/design-brief.md): the user experience of the Generator and the Player.
- [docs/design-detail.md](docs/design-detail.md): the developer specification (engine, formats, workers, storage,
  address, both apps).

Both are living documents, kept in sync with the code. `docs/init-design/` holds the original design and its process
records, unchanged. [AGENTS.md](AGENTS.md) says how AI agents should work here.

[Back to top](#top)

## License

Released under the [MIT License](LICENSE) © 2026 Dat Le.

The repository also contains two third-party source files, neither an npm package, so the app still has no runtime
dependencies: the [Nayuki QR Code generator library](https://www.nayuki.io/page/qr-code-generator-library) (MIT) in
`core/browser/vendor/`, with its notice in `qrcodegen.LICENSE`; and, for tests only, jsQR 1.4.0 (Apache-2.0) in
`tests/vendor/`, which is never part of the site.

[Back to top](#top)

---

<a id="tieng-viet"></a>

# Tiếng Việt

## Giới thiệu

| Ứng dụng | Trực tuyến | Mã nguồn | Làm gì |
|---|---|---|---|
| **Pentomino Generator** | [tdat00.github.io/pentomino/generator](https://tdat00.github.io/pentomino/generator/) | [generator/](generator/) | Vẽ bàn chơi, tạo các bộ mảnh được chứng minh là lấp kín bàn, tạo đề từ một bộ mảnh ở mười mức độ, in đề, sao chép liên kết của một đề và mở đề trong trình chơi |
| **Pentomino Player** | [tdat00.github.io/pentomino/player](https://tdat00.github.io/pentomino/player/) | [player/](player/) | Chơi một đề từ liên kết của nó: kéo thả hoặc chạm để đặt mảnh, hoàn tác / làm lại, gợi ý đã được chứng minh, đồng hồ, lưu tiến độ, in đề, sao chép liên kết của đề |

Địa chỉ `/pentomino/` chuyển thẳng tới trình tạo đề, giữ nguyên chuỗi truy vấn và phần `#hash`. Cả hai ứng dụng có tiếng
Anh và tiếng Việt, giao diện sáng, tối và tương phản cao, dùng được bằng chuột, cảm ứng và bàn phím.

Nút **Chơi** của trình tạo đề mở trình chơi trong thẻ mới bằng một **liên kết hash** mang theo các đề của danh sách. Khi
liên kết đó quá dài, trình tạo đề dùng liên kết `#lib=` **chỉ trong trình duyệt này**, chỉ mở được trong trình duyệt đã
tạo ra nó. Không ứng dụng nào nhập hay xuất tệp: địa chỉ của trình chơi luôn chứa đề đang mở, nên lưu dấu trang là giữ
được đề, và gửi địa chỉ đó là chia sẻ được đề.

> **Trạng thái.** Kho mã được xây dựng theo từng nhiệm vụ, nên một tính năng nêu ở đây có thể chưa hoàn tất. Việc nghiệm
> thu bản phát hành (ma trận trình duyệt, ngưỡng hiệu năng) được theo dõi riêng, và nội dung dưới đây không hứa hẹn thời
> gian chạy trên trình duyệt trước khi có kết quả kiểm định đó.

[Lên đầu trang](#top)

## Dùng trình tạo đề

Trang là một trình hướng dẫn ba bước trong ba khung: bên trái là các đề của bộ mảnh đang hiển thị, ở giữa là màn hình của
bước hiện tại, bên phải là ba bước, mỗi bước một khung riêng với các thiết lập và nút của bước đó. Từ 768 px đến 1359 px,
danh sách đề chuyển xuống dưới màn hình chính; dưới 768 px, các bước thành một hàng ở trên và thiết lập của bước hiện tại
nằm ở hàng dưới. Bên dưới một bước đã xong, khung của nó hiện phần tóm tắt (ảnh thu nhỏ của bàn chơi ở bước 1; số thứ
tự, mức độ, seed và cỡ mảnh của bộ ở bước 2); nhấn vào phần tóm tắt để quay lại bước đó. Các nút điều hướng ở góc trên
bên phải màn hình chính (ví dụ **‹ Bước 1 - Tạo bàn chơi** và **Bước 3 - Tạo đề ›**) hoặc tiêu đề các bước bên phải dùng
để chuyển bước. Bước 2 mở khi bàn chơi đủ điều kiện để tạo bộ mảnh (nếu không, bước 1 cho biết lý do), bước 3 mở khi đã
có một bộ mảnh đang hiển thị.

1. **Tạo bàn chơi.** Chọn một hình mẫu (Hình chữ nhật, Trái tim, Hình thoi, Chữ thập hoặc Vòng) cùng số hàng và số cột
   (mỗi chiều 3–32), rồi nhấn hoặc kéo trên các ô để chặn hay bỏ chặn; ô bị chặn có nền xám và dấu chéo. Các công cụ trên
   bàn chơi dùng để phóng to, thu nhỏ, hiển thị vừa khung nhìn, bật công cụ di chuyển góc nhìn và xoay góc nhìn 45°
   (⟲ ⟳). `Ctrl`/`Cmd`+`Z` hoàn tác thay đổi gần nhất của bàn chơi; với bàn phím, các phím mũi tên di chuyển con trỏ và
   `Space` chuyển đổi trạng thái một ô. Dòng trạng thái đếm số ô chơi được và cho biết vì sao bàn chơi chưa thể tạo bộ
   mảnh.
2. **Tạo bộ mảnh.** Một bảng liệt kê mọi mức độ từ Rất dễ đến Địa ngục 3, với số mảnh, cỡ mảnh và số mảnh đặt sẵn tương
   ứng trên bàn chơi này; nút **?** cạnh mỗi con số giải thích cách tính, và các mức bàn chơi không dùng được thì bị vô
   hiệu kèm lý do. Khung của bước có ô **Seed** (✕ để xóa, 🎲 để lấy seed ngẫu nhiên) và nút **Tạo bộ mảnh mới**. Dưới
   bảng là phần tóm tắt của bộ đang hiển thị, ví dụ `Khó | 13 mảnh | Cỡ mảnh 7–12 | Seed ABCD-EFGH-JKLM`, cùng các mảnh
   của nó. ◀ **Bộ n/tổng** ▶ chuyển qua các bộ đã tạo cho bàn chơi này, **Xóa** bỏ bộ đang hiển thị cùng các đề của nó,
   **Xóa tất cả** bỏ mọi bộ của bàn chơi này sau khi xác nhận. Nút **Chọn bộ mảnh này** bên dưới các mảnh mở bước 3 với bộ
   đó. Một bộ mới trùng với bộ đã có trong danh sách sẽ không được thêm; bộ đã có sẽ được hiển thị.
3. **Tạo đề.** Khung của bước có mức độ của đề (mặc định là mức của bộ mảnh), công tắc **Yêu cầu lời giải duy nhất** và
   nút **Tạo đề mới**, mỗi lần nhấn thêm một đề. Danh sách bên trái hiện các đề của bộ đang hiển thị, mới nhất ở trên:
   **Đề #n**, mức độ in đậm kèm điểm, số mảnh cần đặt, tình trạng lời giải (*Đang kiểm tra…*, *Lời giải duy nhất ✓*,
   *Nhiều lời giải*, *Có ít nhất 1 lời giải*, *Không có lời giải* hoặc *Chưa kiểm tra tính duy nhất*) và hình xem trước.
   ✕ xóa một đề, **Xóa tất cả** ở đầu danh sách xóa hết. Màn hình chính hiện đề đang chọn (đề mới nhất cho tới khi bạn
   nhấn một thẻ) với seed, bàn chơi và các mảnh cần đặt; **Chơi** mở đề trong trình chơi ở thẻ mới, **In** (biểu tượng
   máy in bên phải nút Chơi) in đề, **Sao chép liên kết đề này** (bên phải nút In) sao chép địa chỉ trình chơi của riêng
   đề đó, còn **Xem lời giải** ở góc phải bên dưới bàn chơi vẽ lời giải lên bàn cho tới khi
   nhấn lại (**Ẩn lời giải**).

Khi một tác vụ đang chạy, nút của nó hiện vòng quay và dòng *Đã chạy: m:ss* bên dưới; sau 30 giây nút đổi thành **Hủy**,
và một lượt tạo đề bị hủy vẫn giữ các đề đã tạo xong. Kết quả của thao tác gần nhất (thiếu đề, đã hủy, bộ mảnh hay đề bị
trùng) hiện phía trên màn hình chính, kèm nút **Tạo bộ mảnh mới** khi một bộ mới có thể giúp ích.

Nút **EN | VI** ở đầu trang đổi ngôn ngữ mà không tải lại trang; lựa chọn được nhớ trong trình duyệt này, và `?lang=vi`
hoặc `?lang=en` trên địa chỉ sẽ được ưu tiên. Các nút giao diện bên cạnh chọn giao diện sáng, tối hoặc tương phản cao;
nếu chưa chọn, trang theo chế độ sáng hay tối của hệ thống. Trình chơi có hai nút này giống vậy, và hai trang dùng chung
lựa chọn.

- **Bàn chơi.** Kích thước ghi theo **cột×hàng**. Góc nhìn có thể xoay theo từng bước 45°; việc xoay chỉ để hiển thị,
  không bao giờ đổi đề. Hình mẫu **Trái tim** là một bàn vuông bị chặn một phần tư góc trên bên phải, hiển thị nghiêng
  45°. Sửa bàn chơi sẽ hiện các bộ mảnh và đề đã tạo cho bàn mới, hoặc danh sách trống; quay lại một bàn trước đó sẽ đưa
  các bộ của nó trở lại.
- **Mảnh.** Một bộ mảnh có ít nhất 3 mảnh và các mảnh đều khác nhau, kể cả khi xoay hay lật. Mọi cách xếp hợp lệ lấp kín
  bàn chơi bằng bộ mảnh đều được tính là lời giải.
- **Seed.** Seed của bộ mảnh giúp tạo lại đúng bộ đó: cùng bàn chơi, mức độ, công tắc lời giải duy nhất và seed sẽ cho
  cùng một bộ. Seed bạn gõ vào hoặc lấy bằng 🎲 được dùng lại cho mỗi lần **Tạo bộ mảnh mới**; nếu để trống, mỗi lần nhấn
  sẽ lấy một seed ngẫu nhiên mới và hiển thị nó. Mỗi lần **Tạo đề mới** lấy một số ngẫu nhiên riêng làm seed của đề.
- **Cách xếp mới.** Mỗi đề là một cách xếp hoàn toàn mới so với các đề đã tạo từ bộ mảnh (xóa một đề không làm cách xếp
  của nó dùng lại được), và một đề trùng với đề đã có trong danh sách không bao giờ được thêm. Có bộ mảnh chỉ có vài cách
  xếp khác nhau. Khi một yêu cầu dừng sớm vì không tìm được cách xếp mới, trình tạo đề đếm vét cạn các cách xếp của bộ
  (các ảnh đối xứng chỉ tính một lần, trong một giới hạn công việc cố định). Nếu đếm xong, trình tạo đề nói rõ, ví dụ
  **Đã tìm được 6/6 cách xếp** (hoặc **2/2 cách xếp còn lại (tổng cộng 6)** khi các lần trước đã dùng một số), và đề nghị
  **Tạo bộ mảnh mới**. Các cách xếp mà lần tìm thông thường chưa chạm tới không bị bỏ phí: một lượt hoàn tất biến từng
  cách xếp chưa dùng thành đề theo cùng quy tắc chọn mảnh đặt sẵn, khoảng mức độ và tính khác biệt, cho tới khi đủ số đề
  hoặc hết cách xếp. Nếu không đếm xong, trình tạo đề báo thiếu một cách trung thực mà không khẳng định đó là tối đa.
- **Dữ liệu đã lưu.** Bàn chơi, các thiết lập và các bộ mảnh cùng đề của chúng được giữ trong trình duyệt này: tối đa
  **50** bộ cho mỗi bàn trong **10** bàn dùng gần nhất. Khi đã có 50 bộ, **Tạo bộ mảnh mới** bị vô hiệu cho tới khi bạn
  xóa một bộ. Một danh sách chứa tối đa **100** đề, và không quá lượng vừa một gói 512 KiB, vì **Chơi** mở cả danh sách
  thành một gói; khi danh sách đầy, **Tạo đề mới** sẽ báo.
- **Địa chỉ.** Các thiết lập nằm trên địa chỉ, nên tải lại trang hoặc mở liên kết được chia sẻ sẽ trở về đúng chúng:
  `step`, `preset`, `angle` (góc nhìn), `cells` (khóa bàn chơi `WxH:<base64url bits>`), `level`, `seed` và `unique=1`.
  Một liên kết có `seed` ở bước 2 hoặc 3 hiện bộ mảnh tạo từ seed đó: bộ đã lưu trong trình duyệt này, hoặc tạo lại đúng
  bộ đó. Đề không nằm trên địa chỉ; hãy dùng **Chơi** và chia sẻ liên kết của trình chơi.
- **Giới hạn.** Bàn chơi cần ít nhất **30** ô chơi được trong một vùng liền nhau và mỗi cạnh tối đa **32**. Khi phát hành,
  bàn chơi được dùng tới **484** ô trên máy tính và **360** ô trên điện thoại; các cỡ lớn hơn chỉ được bật sau khi qua
  kiểm định (công cụ dòng lệnh `tools\generate.mjs` nhận bàn tới **676** ô). Mỗi thao tác tạo nhắm tới **60 giây** và có
  giới hạn cứng **120 giây**; khi hết giờ nó dừng và báo những gì đã có.
- **Độ khó.** Điểm chỉ là ước lượng. Đề thông thường không chờ chứng minh tính duy nhất: tình trạng lời giải được kiểm tra
  ngầm sau khi đề xuất hiện. Một đề bạn yêu cầu lời giải duy nhất vẫn có thể không chứng minh được; khi đó trình tạo đề
  nói rõ thay vì trả về một đề chưa được chứng minh.

[Lên đầu trang](#top)

## Dùng trình chơi

Trang có cùng phong cách với trình tạo đề: đầu trang có tiêu đề, **Nhập mã đề**, **Trợ giúp**, nút **EN | VI** và các nút
giao diện, cùng ba khung. Bên trái là các **đề** của gói đang mở, ở giữa là **ván chơi** (tên đề và mức độ, đồng hồ và số nước đi,
Hoàn tác / Làm lại / Gợi ý / Chơi lại / In / Sao chép liên kết đề này và bàn chơi), bên phải là **các mảnh cần đặt**, dưới thanh công cụ của mảnh
đang chọn. Khung các mảnh không có thanh cuộn riêng: khi có nhiều mảnh, cả trang sẽ cuộn. Từ 768 px đến 1359 px, danh
sách đề chuyển xuống dưới ván chơi; dưới 768 px các khung xếp chồng lên nhau.

- **Mở một đề.** Mở một liên kết của trình chơi: nút **Chơi** của trình tạo đề, hoặc một địa chỉ được chia sẻ hay đã lưu
  dấu trang. Khi chưa có đề, trang hiện màn hình bắt đầu với **Thử đề mẫu** và liên kết tới trình tạo đề. Liên kết chỉ có
  mảnh mà không có đề sẽ được giải thích, và một liên kết không mở được không bao giờ thay thế đề bạn đang chơi. Một đề
  đơn cũng mở được từ liên kết mã đề của nó, `…/player/#p=<mã>`: mã được giải trong một worker chạy nền, không cần trình
  tạo đề hay bản sao đã lưu, giữ tiến độ đã lưu của bạn, và tải lại sẽ mở lại đúng đề đó. Địa chỉ
  luôn chứa gói và đề đang mở. Mỗi thẻ trong danh sách đề (tên, mức độ và điểm, số mảnh cần đặt, tính duy nhất, tiến độ,
  hình xem trước), mới nhất ở trên, mở đề đó; ✕ trên thẻ xóa đề và **Xóa tất cả** làm trống danh sách.
- **Nhập mã đề.** **Nhập mã đề** (trên màn hình bắt đầu và ở đầu trang) mở một hộp thoại để gõ hoặc dán mã in kèm đề, hoặc
  cả liên kết của đề. Dấu cách, dấu xuống dòng và dấu gạch ngang được bỏ qua, chữ thường cũng được, và chữ O, I, L được
  đọc là 0, 1, 1; phần sau dấu chấm là không bắt buộc, và một mã dài tối đa 16.000 ký tự (32.768 khi gõ hoặc dán).
  **Mở đề** sẽ mở đề, và địa chỉ trở thành `#p=<mã>`. Mã không mở được sẽ được giải thích ngay trong hộp thoại và không
  làm thay đổi gì: văn bản của bạn, đề đang mở, các nước đi và địa chỉ vẫn như cũ. Nếu nhiều khả năng chỉ do gõ sai một
  ký tự, hộp thoại cho biết vị trí và ký tự có thể đúng; không có gì được sửa cho đến khi bạn nhấn **Dùng cách sửa này**.
  Nếu chỉ phần sau dấu chấm bị hỏng, **Mở đề không có phần lời giải** mở đề từ phần đứng trước nó (lời giải khi đó được
  tìm ngầm). Các nước đi đã lưu của đề được khôi phục kèm một thông báo ngắn; **Chơi lại** bắt đầu lại như bản in.
  **Hủy** hoặc `Escape` đóng hộp thoại.
- **Sao chép liên kết của đề.** **Sao chép liên kết đề này** (biểu tượng liên kết sau nút **In** trong thanh ván chơi, và
  trong trình tạo đề ở bên phải nút **In**) sao chép `…/player/#p=<mã>` của đề đang hiện: chính địa chỉ mà mã QR trên
  bản in mang theo cho đề đó, kèm lời giải đã lưu khi vừa. Đây không bao giờ là liên kết gói đề. Trong lúc liên kết được
  chuẩn bị, nút hiện trạng thái đang bận; "Đã sao chép liên kết" chỉ xuất hiện sau khi trình duyệt đã nhận văn bản, và
  nếu trình duyệt từ chối bảng nhớ tạm thì một cửa sổ hiện liên kết trong ô chỉ đọc để bạn tự sao chép. Đề không có mã QR
  vừa vẫn được sao chép, kèm một ghi chú; liên kết dài hơn 4.000 ký tự được sao chép kèm cảnh báo, còn dài hơn 16.000 ký
  tự thì không được sao chép. Các bộ mã hóa khác nhau có thể viết văn bản mã khác nhau nhưng tương đương cho cùng một đề;
  đề mà nó mở ra là như nhau.
- **Thông tin và kiểm tra.** Mức độ và tính duy nhất do gói mang theo được hiển thị đúng như gói ghi, với mức độ in đậm.
  Đề chưa có kết quả về tính duy nhất sẽ ghi *Có ít nhất 1 lời giải* khi đã biết một lời giải. Khả năng giải được kiểm tra
  ngầm; việc chơi không bao giờ bị chặn, và *chưa xác minh khả năng giải* không bao giờ có nghĩa là *không có lời giải*.
- **Đặt mảnh.** Kéo một mảnh lên bàn chơi (trong khung các mảnh, nhấn vào bất kỳ đâu trong khung của mảnh để cầm nó; con
  lăn chuột xoay mảnh khi đang cầm), hoặc chọn một mảnh, chạm hay nhấn vào một ô để xem trước rồi chạm lại ô đó hoặc nhấn
  `Enter` để đặt. Thả mảnh lên khung các mảnh để trả nó về. Một lần thả không vừa, `Escape`, việc đổi kích thước cửa sổ
  hoặc thao tác chạm bị gián đoạn đều trả mảnh về; các mảnh đặt sẵn bị khóa. Xoay hay lật một mảnh đã đặt sẽ giữ nguyên ô
  đang cầm và thử dịch một ô trước khi báo *Không đủ chỗ để xoay ở đây*.
- **Menu mảnh.** Nhấn chuột phải vào một mảnh (trong khung các mảnh, hoặc mảnh đã đặt trên bàn) để xoay, lật hoặc trả nó
  về khay. Phím Menu hoặc `Shift`+`F10` mở menu cho mảnh đang được chọn. Nhấn chuột phải trên bàn chơi còn có
  **Trả mọi mảnh về khay** và **Chơi lại đề** (sau khi xác nhận).
- **Bàn phím.** `E` hoặc `R` xoay mảnh đang chọn theo chiều kim đồng hồ, `Q` theo chiều ngược lại; `F` và `V` lật mảnh
  trái-phải và trên-dưới trên màn hình; phím mũi tên di chuyển một ô và `Shift`+mũi tên ba ô; `Enter` hoặc `Space` nhấc
  mảnh lên hoặc đặt bản xem trước hợp lệ; `Escape` hủy; `Delete` hoặc `Backspace` trả mảnh về khay; `Ctrl`/`Cmd`+`Z`
  hoàn tác, `Ctrl`/`Cmd`+`Shift`+`Z` hoặc `Ctrl`+`Y` làm lại; `?` hoặc **Trợ giúp** liệt kê các phím tắt.
- **Hoàn thành.** Mọi cách xếp đầy đủ và hợp lệ đều thắng, không chỉ đáp án đã lưu. Hộp thoại chiến thắng chúc mừng bằng
  biểu tượng cúp và một lời khen ngắn, hiện thời gian, số nước đi (và số gợi ý đã dùng), cùng các nút nhỏ **Đề tiếp theo**,
  **Chơi lại** và **Đóng** ở góc dưới bên phải. **Chơi lại** (cũng là nút mũi tên vòng trên thanh ván chơi, có hỏi xác nhận)
  bắt đầu lại đề: mọi mảnh về khay, đồng hồ và số nước đi về 0, tiến độ đã lưu của đề bị xóa.
- **Gợi ý.** Nút **Gợi ý** (bóng đèn) chỉ đưa ra những khẳng định đã được chứng minh, tính trong một worker chạy nền. Nó
  hoặc tô sáng thêm một mảnh khớp với một lời giải hoàn chỉnh giữ nguyên mọi mảnh bạn đã đặt (**Đặt mảnh này** đặt nó
  thành một nước có thể hoàn tác), hoặc chứng minh rằng gỡ một mảnh được nêu tên thì đề vẫn hoàn thành được mà giữ nguyên
  mọi mảnh khác (**Gỡ mảnh này**). Nếu không, câu trả lời là không tìm thấy cách sửa trong lần kiểm tra này: hết giờ hay
  tìm kiếm bị giới hạn không bao giờ được coi là chứng minh. Kết quả bị bỏ nếu bạn thay đổi bàn chơi trong lúc đang tính.
- **Xem lời giải.** (Hiện trang chưa có nút cho chức năng này.) Có hỏi trước, giữ các mảnh đặt sẵn và điền một lời giải
  phù hợp với các mảnh của bạn; nếu không thể hoàn thành từ các mảnh đó, bạn sẽ được hỏi **Đặt lại rồi xem lời giải**. Đề
  khi đó được đánh dấu **Đã xem lời giải**: không có hộp thoại chiến thắng, không tính là đã giải, cho tới khi
  **Chơi lại** bắt đầu một lượt mới.
- **Hiển thị.** Mỗi mảnh hiện chữ cái của nó khi các ô đủ lớn (phóng to để thấy thêm). Nhãn luôn là một ký tự: sau Z, chữ
  cái được vẽ trong vòng tròn, trong hình vuông hoặc trên nền tròn đen. Màu và chữ vẫn dễ đọc khi in trắng đen, và các bộ
  hơn 20 mảnh có thêm hoa văn tô. Chế độ **Làm thẳng**, ngôn ngữ và giao diện được nhớ trong trình duyệt này.
- **Tiến độ** được lưu trên máy và khôi phục khi mở lại cùng đề.

[Lên đầu trang](#top)

## In ra giấy

Nút **In** (biểu tượng máy in: bên phải **Chơi** trong trình tạo đề, bên phải **Chơi lại** trong trình chơi) mở hộp thoại
in đề ra giấy A4, để giải ngoại tuyến với các mảnh cắt rời.

- Tờ đầu tiên in tên đề (đúng tên trình chơi hiển thị: "Đề #n" khi đề không có tên, các tên khác được thêm số), mức độ và
  điểm của đề, cùng mức độ và seed của bộ mảnh. Bên dưới là **mã đề** cùng một **mã QR** ở góc trên bên phải: quét mã QR,
  hoặc gõ mã vào **Nhập mã đề** của trình chơi, để chơi lại đúng đề này, không cần seed. Sau đó là một hình xem trước nhỏ
  của đề với các mảnh cần đặt (để đọc, không để cắt).
- **Mã đề và mã QR** được tạo ngay trên máy khi mở hộp thoại (nút **In** chờ "Đang chuẩn bị mã đề…"). Khi đề có lời giải
  đã lưu, lời giải nằm ở phần sau dấu chấm, in nhỏ hơn dưới dòng "+ lời giải, không bắt buộc"; việc đó không in tờ lời
  giải. Mã dài sẽ tiếp tục trên các tờ phụ có đánh số (mã QR chỉ ở tờ đầu). Mã không bao giờ bị cắt ngắn; trong trường
  hợp hiếm khi mã quá dài cho một mã QR, phần lời giải không bắt buộc được bỏ đi, rồi mã QR dùng mức sửa lỗi thấp hơn, và
  nếu vẫn không được thì tờ giấy nói rõ và không in mã lẫn mã QR. Hộp thoại báo từng việc này trước khi in.
- **Mã QR dẫn tới đâu**: tới trình chơi của trang bạn in; từ một trang chạy cục bộ (`localhost`, địa chỉ mạng nội bộ,
  một tệp) thì tới trình chơi công khai mà điện thoại truy cập được. Một ô chọn chỉ hiện trên trang cục bộ cho phép trỏ mã
  QR tới trình chơi cục bộ, dùng khi phát triển; lựa chọn này không được nhớ. **Sao chép liên kết đề này** (xem Dùng
  trình chơi) sao chép chính địa chỉ đó, không có ô chọn.
- **In cả bộ mảnh**: mọi mảnh của bộ, kể cả các mảnh đặt sẵn, sẵn sàng để cắt.
- **In cả bàn chơi**: các ô chơi được. Bàn chơi quá lớn so với một tờ sẽ được chia thành nhiều phần; một dấu có đánh số
  trên mỗi cạnh chung cho biết phần nào ghép vào đó.
- **In hai mặt**: mỗi mảnh và mỗi phần bàn chơi được in đối xứng ở mặt sau, nên khi cắt ra hai mặt khớp nhau (chọn in hai
  mặt, lật theo cạnh dài).
- **In lời giải** (chỉ có trong trình tạo đề): bàn chơi đã giải ở tờ ngay sau đề (khi in hai mặt thì ở mặt sau của đề).
- **Cỡ bàn chơi**: một bảng gồm Nhỏ, Vừa và Lớn (ô 10, 15 và 20 mm) và Vừa một tờ, kèm số tờ A4 mỗi cỡ cần. Các mảnh dùng
  cùng kích thước ô với bàn chơi nên đặt lên khớp chính xác.

Hãy in ở tỉ lệ 100% (kích thước thật): thanh 50 mm trên tờ đầu cho biết máy in có co giãn trang hay không. Góc nhìn chéo
(Trái tim) được in theo lưới gốc, vì giấy không thể xoay 45°.

[Lên đầu trang](#top)

## Lưu trữ và quyền riêng tư

- Mọi thứ ở lại trong trình duyệt: không tải lên, không bộ giải từ xa, không thu thập số liệu. Một đề đi theo phần
  `#pack=` của liên kết (hoặc, với một đề đơn, phần mã `#p=`), phần mà trình duyệt không bao giờ gửi lên máy chủ. Liên
  kết chia sẻ có thể không kèm đáp án.
- Cả hai ứng dụng chỉ dùng các khóa `localStorage` có tiền tố `pentomino:v1:`, và không bao giờ đụng tới các khóa khác
  của cùng nguồn gốc:
  - trình tạo đề: công việc của bạn (bàn chơi, thiết lập, bộ mảnh và đề) trong `gen:state`;
  - trình chơi: tiến độ của từng đề (`progress:<fingerprint>`, tối đa 300, thời điểm lưu trong `progress-index`), lựa
    chọn Làm thẳng (`prefs`), và bản sao của một gói chỉ khi dùng liên kết `#lib=` trong cùng trình duyệt (`lib:index` và
    một `lib:<packId>` cho mỗi gói, 30 gói mở gần nhất);
  - cả hai: ngôn ngữ (`lang`) và giao diện (`theme`).
- Bộ nhớ trình duyệt có thể bị tắt, dùng chung hoặc đầy. Khi vượt hạn mức, các mục cũ nhất trong không gian tên này bị xóa
  một lần (trình tạo đề xóa các bộ mảnh đã lưu cũ nhất trước); nếu vẫn không lưu được, công việc tiếp tục trong bộ nhớ và
  trang báo rằng không thể lưu.

[Lên đầu trang](#top)

## Chạy trên máy

Hai ứng dụng dùng ES module và worker gốc của trình duyệt, nên phải được phục vụ qua HTTP (không hỗ trợ `file://`). Hãy
dùng máy chủ tĩnh đi kèm, vốn trả đúng kiểu MIME cho `.js` và `.mjs`:

```text
node tools\serve.mjs --port 8080 --prefix /pentomino/
```

Rồi mở `http://localhost:8080/pentomino/`. Lệnh tương đương: `npm run serve`. Tùy chọn: `--root DIR`, `--port N`,
`--prefix /path/`, `--host ADDR` (`--prefix /` để thử khi đặt ở gốc). Trên Windows, `run.cmd [port]` chạy cùng máy chủ đó
(cổng mặc định 8080) và mở trình tạo đề; đặt `NO_BROWSER=1` để không mở trình duyệt.

[Lên đầu trang](#top)

## Phát triển và kiểm thử

Node.js 22 trở lên. Không có bước biên dịch và không có thư viện chạy kèm.

```text
npm run check        # quy ước của kho mã (UTF-8, ký tự xuống dòng, dòng trống cuối tệp, không khoảng trắng thừa) và tham chiếu của trang
npm run test:quick   # kiểm thử đơn vị, bỏ qua các bài chạy chậm: node --test --test-skip-pattern=slow "tests/**/*.test.js"
npm test             # toàn bộ kiểm thử đơn vị: node --test "tests/**/*.test.js"
```

- **Trang kiểm thử trên trình duyệt** (không được xuất bản): chạy `npm run serve` rồi mở
  `http://localhost:8080/pentomino/tests/browser/` kèm `player-controls.html`, `player-load.html`, `hints.html`,
  `print.html`, `rendering.html`, `generator-flow.html`, `generator-editor.html`, `puzzle-code-worker.html`,
  `puzzle-code-entry.html`, `puzzle-code-print.html`, `puzzle-code-copy.html`, `puzzle-code-cli-parity.html` hoặc
  `acceptance.html`. Mỗi trang ghi danh sách đạt/không đạt và `data-summary` trên `<html>`. Hãy dùng cửa sổ hẹp hơn
  1360 px: một số bài kiểm tra cần bố cục một hoặc hai cột.
- **Tạo đề không cần giao diện**: `node tools\generate.mjs --board 10x6 --level hard --count 5 --seed demo --workers 4`.
  Gói đề in ra stdout (hoặc `--output`), thông báo ra stderr. Mã thoát: `0` hoàn tất (kể cả khi bộ mảnh đã được tìm đủ và
  chứng minh là hết cách xếp); `2` gói hợp lệ nhưng thiếu hoặc bị hủy; `1` không có kết quả dùng được hoặc đầu vào sai.
  Thêm `--code` (cờ không có giá trị, dùng được cả với `--recipe`) để in mã đề của từng đề được chấp nhận thay cho gói
  đề: mỗi đề một dòng, viết hoa, không chia nhóm, theo thứ tự trong gói, đúng mã mà nút In tạo cho đề đó (xem phần In ra
  giấy). Với `--output tệp`, gói đề vẫn được ghi vào tệp; không có thì không tạo tệp nào. Thông báo và lỗi vẫn ra stderr,
  còn mã thoát và việc tạo đề không đổi, ví dụ
  `node tools\generate.mjs --recipe tests\fixtures\generation-case.json --workers 1 --code --output pack.json`.
- **Hiệu năng và hiệu chỉnh** (chỉ để sàng lọc; không bao giờ thay đổi ngưỡng kiểm định):
  `node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\smoke.json --workers 4 --fresh-process --output docs\calibration\node-smoke`,
  bản đồ điểm (`--profile landscape`, chạy nhiều giờ, tiếp tục được), và trang trình duyệt
  `http://localhost:8080/pentomino/tools/bench/` (giữ thẻ ở phía trước).

**Cấu trúc mã.** ES module gốc với kiểu JSDoc và `// @ts-check`, chia thành các lớp:

```text
core/engine/    logic thuần, tất định: hình học, bàn chơi, lát kín, tạo đề, chấm độ khó, gói đề, mã đề (không DOM, đồng hồ hay lưu trữ)
core/browser/   hiển thị (bàn chơi SVG), lưu trữ, đa ngôn ngữ, giao diện, xử lý con trỏ, in, client tạo đề và client mã đề
core/workers/   module worker chạy việc tạo đề và mã đề ngoài luồng chính, có cơ chế hủy và giới hạn thời gian
generator/      Pentomino Generator: trang, trạng thái, tác vụ và giao diện
player/         Pentomino Player: trang, trạng thái, ván chơi, gợi ý và giao diện
tests/          kiểm thử đơn vị Node (*.test.js) và các trang kiểm thử trình duyệt (tests/browser/)
tools/          công cụ chỉ chạy bằng Node (.mjs): máy chủ, tạo đề không giao diện, hiệu chỉnh, kiểm tra trang
```

Mọi module được trang hoặc worker nạp đều dùng đuôi `.js`; `.mjs` dành riêng cho công cụ Node. Chữ trên giao diện nằm
trong các gói phẳng `generator/locale.en.js` / `locale.vi.js` và `player/locale.en.js` / `locale.vi.js` (chữ khi in nằm
trong `core/browser/print-texts.js`), được tra qua `core/browser/i18n.js`. Gói tiếng Anh có mọi khóa; gói tiếng Việt có
cùng các khóa và `{placeholder}`, điều mà các kiểm thử i18n kiểm tra. Một dòng chữ hiển thị mới cần có khóa trong cả hai
gói.

[Lên đầu trang](#top)

## Xuất bản

`.github/workflows/pages.yml` chạy các kiểm thử, dựng bản trang, đóng dấu phiên bản và kiểm tra nó trước khi xuất bản lên
GitHub Pages; nếu có lỗi thì việc triển khai dừng lại. Chỉ `index.html`, `redirect.js`, `core`, `generator` và `player`
được triển khai. Trang nằm dưới `/pentomino/`, nên mọi liên kết đều là đường dẫn tương đối.

| Địa chỉ | Nội dung |
|---|---|
| [tdat00.github.io/pentomino/](https://tdat00.github.io/pentomino/) | chuyển thẳng tới trình tạo đề |
| [tdat00.github.io/pentomino/generator/](https://tdat00.github.io/pentomino/generator/) | Pentomino Generator |
| [tdat00.github.io/pentomino/player/](https://tdat00.github.io/pentomino/player/) | Pentomino Player |

```text
node tools\stamp-version.mjs _site abc12345
node tools\check-site.mjs _site --expect-version abc12345
node tools\check-site.mjs . --entry tools/bench/index.html
node tools\serve.mjs --root _site --port 8081 --prefix /pentomino/
```

- `stamp-version.mjs <siteDir> <sha8>` chỉ chạy trên bản sao đã dựng và thêm `?v=<sha8>` vào mọi tham chiếu tương đối tới
  tài nguyên và module (HTML, `import`, `export … from`, `new URL(…, import.meta.url)`, CSS `@import`/`url()`), nên một
  module không bao giờ bị nạp hai lần; các mẫu động không phân giải được sẽ làm lệnh thất bại mà không ghi gì.
- `check-site.mjs <root>` phân giải HTML, import, URL của worker, tài nguyên CSS và trang mục lục thư mục, và báo lỗi khi
  thiếu tệp, có tài nguyên dùng đường dẫn tuyệt đối từ gốc hoặc bên ngoài, trình duyệt nạp `.mjs`, có script hay style
  nội tuyến, thiếu Content Security Policy, hoặc lẫn phiên bản. `--expect-version <sha8>` còn yêu cầu mọi tham chiếu mang
  đúng phiên bản đó; `--entry <relativeHtml>` chỉ kiểm tra các trang được chỉ định.

Không có service worker. GitHub Pages lưu bộ nhớ đệm tới mười phút, vì vậy mọi tham chiếu đều mang phiên bản của commit.

[Lên đầu trang](#top)

## Tài liệu

- [docs/design-brief.md](docs/design-brief.md): trải nghiệm người dùng của trình tạo đề và trình chơi.
- [docs/design-detail.md](docs/design-detail.md): đặc tả cho lập trình viên (bộ máy, định dạng, worker, lưu trữ, địa chỉ,
  cả hai ứng dụng).

Cả hai là tài liệu sống, luôn được cập nhật theo mã. `docs/init-design/` chứa thiết kế ban đầu và hồ sơ quá trình, giữ
nguyên không sửa. [AGENTS.md](AGENTS.md) hướng dẫn cách các tác tử AI làm việc ở đây.

[Lên đầu trang](#top)

## Giấy phép

Phát hành theo [giấy phép MIT](LICENSE) © 2026 Dat Le.

Kho mã còn chứa hai tệp nguồn của bên thứ ba, không phải gói npm, nên ứng dụng vẫn không có phụ thuộc lúc chạy:
[thư viện tạo mã QR của Nayuki](https://www.nayuki.io/page/qr-code-generator-library) (MIT) trong
`core/browser/vendor/`, kèm thông báo bản quyền trong `qrcodegen.LICENSE`; và, chỉ cho kiểm thử, jsQR 1.4.0 (Apache-2.0)
trong `tests/vendor/`, không bao giờ thuộc về trang web.

[Lên đầu trang](#top)
