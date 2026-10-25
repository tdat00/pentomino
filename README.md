# Pentomino

An account-free **Generator** that builds pentomino-style tiling puzzles, and an independent **Player** that plays them. Both run entirely in the browser as static pages: no account, no backend, no remote solver and no upload.

> **Status.** This README describes the designed product. The repository is built task by task, so a feature listed here may not be implemented yet. Release acceptance (browser matrix, performance gates) is tracked separately and nothing below promises browser timings before that qualification has been reported.

## Documentation

- [Design brief](docs/design-brief.md): the user experience of the Generator and the Player.
- [Detailed design](docs/design-detail.md): the developer specification (engine, formats, workers, storage, address, both apps).

Both are living documents, kept in sync with the code. `docs/init-design/` holds the original design and its process records, unchanged.

## Entry points

| URL | Purpose |
| --- | --- |
| `/pentomino/` | Redirects to the Generator, carrying any query string and `#hash` across. |
| `/pentomino/generator/` | Generator: draw a board, generate piece sets and puzzles, and open a puzzle in the Player. |
| `/pentomino/player/` | Player: open a puzzle from its link (or try the sample) and play it. |

The Generator and the Player load independently. **Play** in the Generator opens the Player in a new tab with a portable **hash link** that contains the puzzles of the list. When a link would be too long, the Generator falls back to a **same-browser** `#lib=` link, which works only in the browser that made it. Neither app imports or exports files: the Player's address always holds the open puzzle, so a bookmark keeps it and sending the address shares it.

## Run locally

The app uses native ES modules and workers, so it must be served over HTTP. `file://` is not supported, and the repository does not assume any particular MIME mapping of a third-party server (Python's `http.server` can serve `.mjs` as `text/plain`); use the bundled static server instead:

```text
node tools\serve.mjs --port 8080 --prefix /pentomino/
```

Open `http://localhost:8080/pentomino/`. Also available as `npm run serve`. Options: `--root DIR`, `--port N`, `--prefix /path/`, `--host ADDR`. Use `--prefix /` to test hosting at the root.

On Windows, `run.cmd [port]` starts the same server (default port 8080) and opens the Generator in the default browser; set `NO_BROWSER=1` to skip opening it.

## Develop and test

- Node.js 22 or newer. There is no build step and there are no runtime dependencies.
- Run all tests: `node --test "tests/**/*.test.js"` (keep the quotes: Node expands the glob itself).
- Skip the slow tests: `node --test --test-skip-pattern=slow "tests/**/*.test.js"` (`npm run test:quick`).
- Check repository conventions (UTF-8 without BOM, consistent line endings, final newline, no trailing whitespace) and the static site references: `npm run check`.
- Browser regression pages (not deployed): serve with `npm run serve` and open `http://localhost:8080/pentomino/tests/browser/player-controls.html`, `player-load.html` or `hints.html`; each writes a pass/fail list, `data-summary` on `<html>` and, for `player-load.html`, `data-result`. Use a window narrower than 1360 px: some checks shrink the player and expect the one- or two-column layout.
- Headless generation: `node tools\generate.mjs --board 10x6 --level hard --count 5 --seed demo --workers 4`. The pack goes to stdout (or `--output`), messages to stderr. Exit codes: `0` complete, which includes a piece set that has fewer arrangements than `--count` and whose arrangements were all found and proven to be all (stderr: `found 6/6 arrangements, the most this piece set allows (complete)`); `2` a valid partial or cancelled pack, including a shortfall that is not proven to be the maximum; `1` no usable result or invalid input.
- Performance and calibration harnesses (screening evidence only; they never change a qualification gate):
  - Node smoke: `node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\smoke.json --workers 4 --fresh-process --output docs\calibration\node-smoke`.
  - Score landscape on the real engine (hours; resumable, `--cases <regex>` runs a subset): `node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --output docs\calibration\landscape`.
  - Browser page (four module workers, Start/Cancel, JSON and Markdown downloads): `http://localhost:8080/pentomino/tools/bench/` after `npm run serve`. Keep the tab in the foreground.

### Code layout

Native ES modules with JSDoc types and `// @ts-check`, in four layers:

- **Engine** (`core/engine`): pure, deterministic logic with no DOM, clock, storage or randomness other than seeded generators.
- **Browser** (`core/browser`): rendering, storage, clipboard, files and pointer handling.
- **Workers**: module workers (and Node `worker_threads` for the CLI) that run generation off the main thread with cancel and deadline watchdogs.
- **Apps** (`generator`, `player`): page controllers that wire the layers above to the DOM.

Every module loaded by a browser page or worker uses the `.js` extension. `.mjs` is reserved for Node-only tools under `tools`.

The interface text of both apps is bilingual (English and Vietnamese): `core/browser/i18n.js` is the shared lookup, over the flat packs of each app, `generator/locale.en.js` and `generator/locale.vi.js`, `player/locale.en.js` and `player/locale.vi.js` (the English pack is the base and has every key; the Vietnamese pack has the same keys and `{placeholders}`; `tests/generator-i18n.test.js` and `tests/player-i18n.test.js` check both). A new user-visible text needs a key in both packs of its app.

## Using the Generator

The page is a three-step wizard in three panels: the puzzles of the piece set on show on the left, the screen of the current step in the middle, and the three steps on the right, each in its own frame with the settings and the button of that step. From 768 px to 1359 px the puzzles go under the main screen; below 768 px the steps form a row on top and the settings of the current step take a row under them. Under a finished step its frame shows a summary (a thumbnail of the board under step 1; the set number, level, seed and piece sizes under step 2), and clicking the summary returns to that step. The navigator buttons at the top right of the main screen, for example **‹ Step 1 - Create board** and **Step 3 - Create puzzles ›**, or the step headers on the right, move between steps. Step 2 opens once the board can get a piece set (otherwise the buttons are disabled and step 1 says why), and step 3 opens once a piece set is on show.

1. **Create board.** Choose a preset (Rectangle, Heart, Diamond, Cross or Ring) and the rows and columns (3–32 each), then click or drag squares to block or unblock them; blocked squares are marked with a cross. The tools on the board zoom in and out, fit the board, switch on a move tool that drags the view, and turn the view by 45° (⟲ ⟳). `Ctrl`/`Cmd`+`Z` undoes the last board change; with the keyboard, the arrow keys move a cursor and `Space` toggles a square. The status line counts the playable squares and says why a board cannot get a piece set.
2. **Create piece set.** A table lists every level from Very easy to Hell 3 with the number of pieces, the piece sizes and the pre-placed pieces it means on this board; the **?** next to a number shows how it is worked out, and levels the board cannot use are disabled with the reason. The step frame holds the **Seed** field (✕ clears it, 🎲 draws a random seed) and **New Piece Set**. Under the table, the set on show has a summary such as `Hard | 13 pieces | Piece sizes 7–12 | Seed ABCD-EFGH-JKLM` and its pieces. ◀ **Set n of total** ▶ steps through the sets made for this board, **Remove** drops the set on show with its puzzles, and **Remove all** drops every set of this board after a confirmation. A new set that is the same as one already in the list is not added; that set is shown instead.
3. **Create puzzles.** The step frame holds the puzzle level (the set's level by default), the **Require unique solution** switch and **New Puzzle**, which adds one puzzle per press. The list on the left shows the puzzles of the set on show, newest first: **Puzzle #n**, the level in bold with the score, the seed, the number of pieces to place, the solution status (*Checking…*, *Unique solution ✓*, *Multiple solutions*, *At least 1 solution*, *No solution exists* or *Uniqueness not checked*) and a preview. ✕ removes one puzzle and **Remove all** in the list header removes them all. The main screen shows the selected puzzle (the newest one until you click a card) with its board, the pieces to place and **Play**, which opens the puzzle in the Player in a new tab.

While a job runs, its button shows a spinner and *Elapsed: m:ss* appears under it; after 30 s the button turns into **Cancel**, and a cancelled batch keeps the puzzles already made. The outcome of the last action (a shortfall, a cancellation, a repeated set or puzzle) is shown above the main screen, with a **Generate new piece set** button where a new set would help.

The **EN | VI** switch in the header changes the language without reloading; the choice is remembered in this browser, and `?lang=vi` or `?lang=en` in the address overrides it. The theme buttons next to it pick the light, dark or high-contrast theme (`core/browser/theme.css`); without a choice the page follows the system's light or dark setting. The Player has the same two switches, and both pages share the choices.

- **Board.** Sizes are written **columns×rows**. The view may be turned in 45° steps; the turn is display-only and never changes the puzzle. The **Heart** preset is a square board whose top-right quarter is blocked, shown at 45°. Editing the board shows the piece sets and puzzles made for the new board, or empty lists; going back to an earlier board brings its sets back.
- **Pieces.** The piece set has at least 3 pieces and all pieces are distinct. Any valid tiling of the board with the piece set counts as a solution.
- **Seed.** A set seed makes a piece set repeatable: the same board, level, uniqueness switch and seed give the same set. A seed you type or draw with 🎲 is used again by every **New Piece Set**; with an empty field each press draws a new random seed and shows it. Each **New Puzzle** press draws its own random number as the puzzle seed, shown on the card.
- **New layouts.** Every puzzle must be a strictly new arrangement compared with the puzzles already made from the set (removing a puzzle does not make its arrangement available again), and a puzzle equal to one already in the list is never added. Some piece sets have only a few different arrangements. When a request stops short because no new arrangement was found, the Generator counts the arrangements of the piece set exhaustively (symmetric images count once, with a fixed work limit). If the count finishes, the result is complete and the Generator says so, for example **Found 6/6 arrangements** (or **Found 2/2 remaining arrangements (6 in total)** when earlier requests used some), and offers **Generate new piece set** for more. Arrangements that the normal search did not reach are not wasted: a completion pass turns each unused arrangement into a puzzle through the same clue selection, level band and distinctness rules, in a fixed order, until the request is full or none is left. If an unused arrangement has no clue set in the level's band, the Generator says how many were tried and that none fits. If the count cannot finish, it reports an honest shortfall without claiming a maximum.
- **Saved work.** The board, the settings and the piece sets with their puzzles are kept in this browser: up to **50** sets for each of the last **10** boards used. With 50 sets, **New Piece Set** is disabled until a set is removed. A list holds at most **100** puzzles, and no more than fit one 512 KiB pack, because **Play** opens the whole list as one pack; when the list is full, **New Puzzle** says so, and a new puzzle that would not fit is not added.
- **Address.** The settings live in the address, so a reload or a shared link returns to them: `step`, `preset`, `angle` (the view angle), `cells` (the board key `WxH:<base64url bits>`: its size and every enabled and blocked square), `level`, `seed` and `unique=1`. A link with a `seed` and step 2 or 3 shows the set made with that seed: the one saved in this browser, or the same set generated again. Puzzles are not part of the address; use **Play** and share the Player's link.
- **Limits.** A board needs at least **30** playable squares in one connected region and sides of at most **32**. Boards launch at up to **484** playable squares on desktop and **360** on a phone; the design sizes **576** and **484** are enabled only after they have been qualified. The Generator page does not offer larger boards (the headless `tools\generate.mjs` accepts boards of up to **676**). Each generation action has a **60 s** target and a **120 s** hard limit, after which it stops and reports what it has.
- **Difficulty.** Scores are estimates. Ordinary puzzles do not wait for a uniqueness proof: their solution status is checked in the background after they appear. A puzzle you require to be unique can still fail to be proven; the Generator then says so rather than returning an unproven puzzle.

## Using the Player

The page has the Generator's look: a header with the title, the **EN | VI** switch and the theme buttons, and three panels. The **puzzles** of the open pack are on the left, the **game** (puzzle name and rating, timer and move count, Undo / Redo / Hint / Replay and the board) in the middle and the **pieces to place**, with the toolbar for the selected piece, on the right. From 768 px to 1359 px the puzzles go under the game; below 768 px the panels stack.

- **Opening a puzzle.** Follow a player link: the Generator's **Play**, or an address that was shared or bookmarked. Without a puzzle the page shows a start screen with **Try the sample** and a link to the Generator. A link with pieces but no puzzle is explained, and a link that cannot be opened never replaces the puzzle you are playing. The address always holds the open pack and puzzle: when a pack did not come from a portable link (the sample, or a pack after a puzzle was removed), the address becomes its `#pack=` link as soon as the link is ready, if it is not too long. A card in the puzzle list (name, level and score, pieces to place, certificate, progress, preview), newest on top, opens that puzzle; ✕ on a card removes the puzzle and **Remove all** empties the list.
- **Claims and checks.** Ratings and uniqueness carried by the pack are shown with the generator's wording (the level in bold), as the pack states them. A puzzle without a uniqueness result reads *At least 1 solution*, as in the Generator, once a solution is known (the pack includes the answer, or the background check found one). Solvability is checked in the background; play is never blocked, and *Solvability not verified* is never the same as *No solution exists*.
- **Placing pieces.** Drag a piece onto the board (the mouse wheel turns it while it is held), or select a piece, tap or click a cell to preview it and tap the same cell again or press `Enter` to drop it. Letting go over the pieces panel puts a piece back. A drop that does not fit, `Escape`, a resize or an interrupted touch puts the piece back; clue pieces are locked and never move. Rotating or mirroring a placed piece keeps its grabbed cell in place and tries a one-cell nudge before saying *No room to rotate here*.
- **Piece menu.** Right-click a piece (in the pieces panel, or a placed one on the board) to rotate it clockwise or counter-clockwise, flip it left-right or top-bottom, or return it to the tray. The Menu key or `Shift`+`F10` opens it on a focused piece. A right-click anywhere on the board also offers **Return all pieces to the tray** and **Replay the puzzle** (after a confirmation).
- **Keyboard.** `E` or `R` turn the selected piece clockwise and `Q` counter-clockwise; `F` and `V` flip it left-right and top-bottom on screen; arrow keys move it one cell and `Shift`+arrow three cells; `Enter` or `Space` picks it up or commits a valid preview; `Escape` cancels; `Delete` or `Backspace` returns it to the tray; `Ctrl`/`Cmd`+`Z` undoes and `Ctrl`/`Cmd`+`Shift`+`Z` or `Ctrl`+`Y` redoes; `?` or the **Help** button in the page header lists the shortcuts. The toolbar of the pieces panel also turns and flips the selected piece.
- **Finishing.** Any complete, legal tiling wins, not only the stored answer. The win dialog shows time, moves and level (and the hints used) with **Next puzzle**, **Replay** and **Back to generator**. **Replay** (the circular-arrow button next to Hint, which asks first) starts the puzzle again: all pieces go back to the tray, the timer and the move count start from zero and the saved progress of the puzzle is removed.
- **Hints.** The **Hint** button (a light bulb, next to Undo, Redo and Replay) makes only proven statements, computed in a background worker (each query is capped at 50,000 row trials, the whole action stays inside the 115/120 s limits). It either highlights one more piece that fits a complete solution keeping everything you placed (**Place it** puts it down as one undoable move), or proves that removing one named piece lets the puzzle be completed with all your other pieces kept (**Remove it**); that piece is not claimed to be the only culprit, and every placed piece is tested, newest first, before anything is said. Otherwise the answer is *No repair identified within this check.* — a timeout or a capped search is never presented as proof. A result is dropped if you change the board while it is computed, and the pulse is off with reduced motion.
- **Show solution.** (The page has no button for it at the moment.) Asks first, keeps the locked clues and fills in a solution that agrees with your pieces (the stored answer when it does, otherwise one found by the solver). If your pieces cannot be completed, you are asked to **Reset, then reveal**; nothing is overwritten silently, and **Undo** brings your pieces back. The puzzle is then marked **Revealed**: it shows no victory dialog, is not counted as solved in the puzzle list, and stays revealed when reopened until **Replay** starts a fresh, unassisted session.
- **View.** There are no display switches: every piece shows its letter where its squares are large enough (zoom in for more), sets of more than 20 pieces add fill patterns, and the timer always shows. The **Straighten** view, the language and the theme are remembered in this browser.
- Progress is saved locally and restored when the same puzzle is opened again. Progress records are version 2 (they also remember *revealed* and the hint count); version 1 records are still read as not revealed with no hints and keep their pieces and time. The pack format is unchanged. The Generator and the Player are both version 1.0.0.

## Storage and privacy

- Everything stays in the browser. There is no upload, no remote solver and no analytics. A puzzle travels in the `#pack=` part of its link, which the browser never sends to the server.
- Progress and preferences use `localStorage` keys under the `pentomino:v1:` namespace. The Player keeps the progress of each puzzle (`progress:<fingerprint>`, up to 300, with the save times in `progress-index`) and the Straighten choice (`prefs`). It keeps a copy of a pack only for a same-browser `#lib=` link, used when a pack is too large for a portable link (`lib:index` and one `lib:<packId>` per pack, the 30 most recently opened); a pack opened from a `#pack=` link is not copied. The Generator keeps its work (board, settings, piece sets and puzzles) in `pentomino:v1:gen:state`. The language choice (`pentomino:v1:lang`) and the theme choice (`pentomino:v1:theme`) are shared by the Generator and the Player. The app never reads, changes or clears other keys of the same origin.
- Browser storage can be disabled, shared or full. On a quota error the oldest entries of this namespace are dropped once (the Generator first drops its oldest saved piece sets); if saving still fails, work continues in memory and the page says that it cannot be saved.
- Share links may omit the answer.
- A same-browser `#lib=` link only works in the browser that created it, while its copy is kept.

## Release tooling

GitHub Pages serves the site under `/pentomino/`, so all links are relative and the repository contains no root-absolute URLs. Only `index.html`, `redirect.js`, `core`, `generator` and `player` are deployed; `tasks`, `docs`, `tests`, `tools` and `.github` never are.

```text
node tools\stamp-version.mjs _site abc12345
node tools\check-site.mjs _site --expect-version abc12345
node tools\check-site.mjs . --entry tools/bench/index.html
node tools\serve.mjs --root _site --port 8081 --prefix /pentomino/
```

- `stamp-version.mjs <siteDir> <sha8>` works on a staged copy only (it refuses a source checkout) and appends `?v=<sha8>` to every relative asset and module reference: HTML `src`/`href` of assets, static and dynamic `import`, `export ... from`, `new URL('...', import.meta.url)` (including workers), and CSS `@import`/`url()`. Existing queries and fragments are kept, so `#pack` data, local SVG fragment ids, `data:`/`blob:` URLs, comments and ordinary strings are never rewritten. Navigation links and directory targets are not stamped. Every reference to a module gets the same version, so a module is never loaded twice. Unresolved dynamic patterns (for example `import(name)` or `new Worker('./w.js')`) make it fail without writing anything.
- `check-site.mjs <root>` resolves HTML, imports, worker URLs, CSS assets and directory indexes, and fails on missing files, root-absolute or external assets, a browser `.mjs` import, inline scripts or styles, a missing Content Security Policy, and a mixed-version graph. `--expect-version <sha8>` additionally requires every asset and module reference to carry that version. `--entry <relativeHtml>` checks only the given page(s), for local harnesses that are not published.
- `.github/workflows/pages.yml` runs the tests, stages the site, stamps it and verifies it before uploading the Pages artifact; a failure stops the deployment.

There is no service worker. GitHub Pages caches for up to ten minutes, which is why every reference carries the commit version.
