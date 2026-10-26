# Pentomino Developer Guide

<a id="top"></a>

**English** · [Tiếng Việt](DEVELOPERGUIDE.vn.md) · [User guide](USERGUIDE.md) · [README](README.md)

**Live apps:**
[Pentomino Generator](https://tdat00.github.io/pentomino/generator/) ·
[Pentomino Player](https://tdat00.github.io/pentomino/player/) ·
[GitHub](https://github.com/tdat00/pentomino)

- [Project status](#project-status)
- [Run locally](#run-locally)
- [Develop and test](#develop-and-test)
- [Browser storage](#browser-storage)
- [Publishing](#publishing)
- [Documents](#documents)
- [How to contribute](#how-to-contribute)
- [License](#license)

---

## Project status

> **Status.** The repository is built task by task, so a feature listed here may not be finished yet. Release acceptance
> (browser matrix, performance gates) is tracked separately, and nothing below promises browser timings before that
> qualification has been reported. The automated acceptance of printing a puzzle code, reading it back and opening it
> in the Player (`puzzle-code-acceptance.html` and `tests/puzzlecode-acceptance.test.js`) is not evidence of a printed
> sheet: scanning a printed QR code with real Android and iPhone cameras, the 50 mm bar of a physical print at 100 % and
> typing a printed code on a phone remain checks for the owner before a release.

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
  `puzzle-code-print.html`, `puzzle-code-cli-parity.html`, `puzzle-code-acceptance.html`, `puzzle-qr.html`,
  `watchdog.html` or `acceptance.html`. Each writes a pass/fail list, and `data-summary` and `data-result` (`pass` or
  `fail`) on `<html>`. Use a window narrower than 1360 px:
  some checks expect the one- or two-column layout.
- **Headless generation**: `node tools\generate.mjs --board 10x6 --level hard --count 5 --seed demo --workers 4`. It accepts boards of up to **676** playable squares
  (the apps launch at 484 on desktop and 360 on a phone). The pack goes to stdout (or `--output`), messages to stderr. Exit codes: `0` complete (including a set whose
  arrangements were all found and proven to be all); `2` a valid partial or cancelled pack; `1` no usable result or
  invalid input. Add `--code` (a flag without a value, also allowed with `--recipe`) to print the puzzle code of every
  accepted puzzle instead of the pack: one ungrouped, upper-case line per puzzle in pack order, the same code that Print
  makes for that puzzle (see [Printing](USERGUIDE.md#printing)). With `--output file` the pack is still written to the file; without it no
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

## Browser storage

- Nothing is uploaded: a puzzle travels in the `#p=` part of its link (one code per puzzle, separated by `;`), which
  the browser never sends to the server.
- Both apps use `localStorage` keys under `pentomino:v1:` only, and never touch other keys of the same origin:
  - Generator: its work (board, settings, piece sets and puzzles) in `gen:state`;
  - Player: the progress of each puzzle (`progress:<fingerprint>`, up to 300, save times in `progress-index`); no pack
    is stored, a pack lives in its link;
  - both: the language (`lang`) and the theme (`theme`).
- Browser storage can be disabled, shared or full. On a quota error the oldest entries of this namespace are dropped
  once (the Generator first drops its oldest saved piece sets); if saving still fails, work continues in memory and the
  page says that it cannot be saved.

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

## How to contribute

1. Read [AGENTS.md](AGENTS.md): it lists the conventions and checks that every change follows (it is written for AI
   agents, but holds for everyone).
2. Run the app locally ([Run locally](#run-locally)) and make the change in the layer it belongs to
   ([Code layout](#develop-and-test)): pure logic in `core/engine/`, browser code in `core/browser/`, app code in
   `generator/` or `player/`. A new visible text needs a key in both language packs.
3. Run `npm run check` and `npm run test:quick` (and `npm test` before a pull request); run the browser test page of
   the area you touched. Every test run must finish within 10 minutes.
4. When behaviour, storage, addresses or the UI change, update [docs/design-brief.md](docs/design-brief.md) and
   [docs/design-detail.md](docs/design-detail.md), and the user guide or this guide, in English and Vietnamese, in the
   same change.
5. Keep one meaningful change per commit, and open a pull request against `main`.

[Back to top](#top)

## License

Released under the [MIT License](LICENSE) © 2026 Dat Le.

The repository also contains two third-party source files, neither an npm package, so the app still has no runtime
dependencies: the [Nayuki QR Code generator library](https://www.nayuki.io/page/qr-code-generator-library) (MIT) in
`core/browser/vendor/`, with its notice in `qrcodegen.LICENSE`; and, for tests only, jsQR 1.4.0 (Apache-2.0) in
`tests/vendor/`, which is never part of the site.

[Back to top](#top)
