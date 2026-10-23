# Pentomino

An account-free **Generator** that builds pentomino-style tiling puzzles, and an independent **Player** that plays them. Both run entirely in the browser as static pages: no account, no backend, no remote solver and no upload.

> **Status.** This README describes the designed product. The repository is built task by task, so a feature listed here may not be implemented yet. Release acceptance (browser matrix, performance gates) is tracked separately and nothing below promises browser timings before that qualification has been reported.

## Entry points

| URL | Purpose |
| --- | --- |
| `/pentomino/` | Redirects to the Generator, carrying any query string and `#hash` across. |
| `/pentomino/generator/` | Generator: edit a board, generate puzzles, import and export JSON. |
| `/pentomino/player/` | Player: open a puzzle from a link, a file or the local library, and play it. |

The Generator and the Player load independently. **Play** in the Generator opens the Player with a portable **hash link** that contains the whole puzzle. When a link would be too long, the Generator falls back to a **local-only library** link; that link works only in the same browser and is labelled as not shareable. Puzzles can also be saved and opened as **JSON files**.

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
- Check repository conventions (UTF-8 without BOM, CRLF, final newline, no trailing whitespace) and the static site references: `npm run check`.
- Browser regression pages (not deployed): serve with `npm run serve` and open `http://localhost:8080/pentomino/tests/browser/player-controls.html`, `player-import.html` or `hints.html`; each writes a pass/fail list and `data-summary` on `<html>`.
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

The Generator's interface text is bilingual (English and Vietnamese): `generator/i18n.js` looks texts up in the flat packs `generator/locale.en.js` (base pack, every key) and `generator/locale.vi.js` (same keys and `{placeholders}`; `tests/generator-i18n.test.js` checks both). A new user-visible text needs a key in both packs. The Player keeps its own English texts.

## Using the Generator

The page is a three-step wizard laid out as three panels: the puzzles made so far on the left, the screen of the current step in the middle, and the three steps stacked on the right (on narrow screens the steps form a row on top and the puzzles go under the main screen). Each step shows only its own controls. Step 2 opens once the board can get a piece set (otherwise Next and the step button are disabled and step 1 says why), and step 3 opens once a piece set exists. **Next** and **Back** at the top right of the main screen, or the step buttons on the right, move between steps. The current step is kept in the address (`?step=2`), so a reload, the browser's Back and Forward buttons, and a shared link return to it. Click or drag squares to block or unblock them; blocked squares are marked with a cross.

1. **Create board.** Size, presets, painting squares, view rotation.
2. **Create piece set.** Pick the level and the seed, generate the pieces for the board, review them, or import a piece set or pack.
3. **Create puzzles.** Generate puzzles from the board and the piece set, then play, export or share them.

The **EN | VI** switch in the header changes the language without reloading; the choice is remembered in this browser, and `?lang=vi` or `?lang=en` in the address overrides it. The theme switch next to it picks the light, dark or high-contrast theme (`generator/theme.css`); without a choice the page follows the system's light or dark setting.

- **Board.** Sizes are written **columns×rows**. The board may be rotated by a display-only 45° view; the puzzle itself is unchanged by rotation. The **Heart** preset is a square board whose top-right quarter is a block.
- **Pieces.** The piece set has at least 3 pieces and all pieces are distinct. Any valid tiling of the board with the piece set counts as a solution.
- **Seed.** Seed text makes a result repeatable. **Keep seed** reuses the same text for the next generation. Repeated generation from one seed produces numbered batches (D41 batch index), so batch 2 continues deterministically after batch 1.
- **New layouts.** Results must be strictly new layouts compared with the ones already shown. Some piece sets have fewer different arrangements than you ask for. When a request stops short because no new arrangement was found, the Generator counts the arrangements of the piece set exhaustively (symmetric images count once, with a fixed work limit). If the count finishes, the result is complete and the Generator says so, for example **Found 6/6 arrangements** (or **Found 2/2 remaining arrangements (6 in total)** when earlier requests used some); **Generate new piece set** stays available for more. Arrangements that the normal search did not reach are not wasted: a completion pass turns each unused arrangement into a puzzle through the same clue selection, level band and distinctness rules, in a fixed order, until the request is full or none is left. If an unused arrangement has no clue set in the level's band, the Generator says how many were tried and that none fits. If the count cannot finish, it reports an honest shortfall without claiming a maximum.
- **Limits.** Boards launch at up to **484** cells on desktop and **360** on a phone. The design sizes **576** and **484** are enabled only after they have been qualified. A **676** board is an opt-in, experimental setting. A board side is at most **32**. Each generation action has a **60 s** target and a **120 s** hard limit, after which it stops and reports what it has.
- **Difficulty.** Scores are estimates. Ordinary puzzles do not wait for a uniqueness proof. A puzzle you require to be unique can still fail to be proven; the Generator then says so rather than returning an unproven puzzle. Claims in imported files are unverified until checked.

## Using the Player

- **Opening a puzzle.** Follow a player link, use **Import file** (or drop a `.json` file, 512 KiB at most), paste a link, share code or pack JSON, choose a pack under **Recent** (each can be exported or deleted), or try the **Sample**. A file with pieces but no puzzle is explained, and a rejected import never replaces the puzzle you are playing.
- **Claims and checks.** Ratings and uniqueness read from a file are shown as *Claimed* until the Player recomputes them. Solvability is checked in the background; play is never blocked, and *Solvability not verified* is never the same as *No solution exists*.
- **Placing pieces.** Drag a piece onto the board (the mouse wheel turns it while it is held), or select a piece, tap or click a cell to preview it and tap the same cell again or press **Place** to drop it. A drop that does not fit, `Escape`, a resize or an interrupted touch puts the piece back; clue pieces are locked and never move. Rotating or mirroring a placed piece keeps its grabbed cell in place and tries a one-cell nudge before saying *No room to rotate here*.
- **Keyboard.** `E` or `R` turn the selected piece clockwise and `Q` counter-clockwise; `F` and `V` mirror it horizontally and vertically on screen; arrow keys move it one cell and `Shift`+arrow three cells; `Enter` or `Space` picks it up or commits a valid preview; `Escape` cancels; `Delete` or `Backspace` returns it to the tray; `Ctrl`/`Cmd`+`Z` undoes and `Ctrl`/`Cmd`+`Shift`+`Z` or `Ctrl`+`Y` redoes; `?` lists the shortcuts. Every action also has a visible button.
- **Finishing.** Any complete, legal tiling wins, not only the stored answer. The win dialog shows time, moves and level (and the hints used) with **Next puzzle**, **Replay** and **Back to generator**. **Reset** asks first and can be undone.
- **Hints.** **Hint** makes only proven statements, computed in a background worker (each query is capped at 50,000 row trials, the whole action stays inside the 115/120 s limits). It either highlights one more piece that fits a complete solution keeping everything you placed (**Place it** puts it down as one undoable move), or proves that removing one named piece lets the puzzle be completed with all your other pieces kept (**Remove it**); that piece is not claimed to be the only culprit, and every placed piece is tested, newest first, before anything is said. Otherwise the answer is *No repair identified within this check.* — a timeout or a capped search is never presented as proof. A result is dropped if you change the board while it is computed, and the pulse is off with reduced motion.
- **Show solution.** Asks first, keeps the locked clues and fills in a solution that agrees with your pieces (the stored answer when it does, otherwise one found by the solver). If your pieces cannot be completed, you are asked to **Reset, then reveal**; nothing is overwritten silently, and **Undo** brings your pieces back. The puzzle is then marked **Revealed**: it shows no victory dialog, is not counted as solved in the pack menu or the library, and stays revealed when reopened until **Replay** starts a fresh, unassisted session.
- **View.** **Labels** and **Patterns** are independent switches. The **timer** and **Straighten** view are local to the browser.
- Progress is saved locally and restored when the same puzzle is opened again. Progress records are version 2 (they also remember *revealed* and the hint count); version 1 records are still read as not revealed with no hints and keep their pieces and time. The pack format is unchanged. The Generator and the Player are both version 1.0.0.

## Storage and privacy

- Everything stays in the browser. There is no upload, no remote solver and no analytics. Pasted links are read for their data only and are never fetched.
- Library, progress and preferences use `localStorage` keys under the `pentomino:v1:` namespace; the Generator's language choice is the key `pentomino:v1:lang` and its theme choice `pentomino:v1:theme`. The app never reads, changes or clears other keys of the same origin.
- Browser storage can be disabled, shared or full. On a quota error the oldest entries of this namespace are dropped once; if saving still fails, play continues in memory and the page says that progress cannot be saved.
- Exported files and share links may omit the answer.
- A local-library link only works in the browser that created it.

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
