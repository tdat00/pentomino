# Pentomino

**Live apps:**
[Pentomino Generator](https://tdat00.github.io/pentomino/generator/) ·
[Pentomino Player](https://tdat00.github.io/pentomino/player/)

**User guide:** [English](USERGUIDE.md) · [Tiếng Việt](USERGUIDE.vn.md)  
**Developer guide:** [English](DEVELOPERGUIDE.md) · [Tiếng Việt](DEVELOPERGUIDE.vn.md)

Two static web apps for pentomino-style tiling puzzles, in plain HTML, CSS and JavaScript. Everything runs in the
browser: no account, no backend, no remote solver, no upload, no build step and no runtime dependency.

## Features

- **[Pentomino Generator](generator/)**: draws a board (presets, blocked squares, 45° views), generates piece sets that
  provably tile it, makes puzzles from a set at ten levels (optionally with a proven unique solution), prints them and
  imports a puzzle from its link or code.
- **[Pentomino Player](player/)**: plays a puzzle from its link: drag or tap to place pieces, undo / redo, proven hints,
  a timer, saved progress, printing, and sharing a puzzle or the whole list as a link with a QR code.
- **Both**: English and Vietnamese, light, dark and high-contrast themes, mouse, touch and keyboard. A puzzle travels
  as a code in the `#p=` part of its link, so a bookmark keeps it and sending the address shares it. Work and progress
  stay in this browser's `localStorage`.
- **Printing** on A4 paper, with cut-out pieces, the board, an optional solution and a QR code to play the puzzle
  online.

`/pentomino/` redirects to the Generator. See the [user guide](USERGUIDE.md) for every feature, the limits and the
storage keys.

## Run locally

The apps use native ES modules and workers, so they must be served over HTTP (`file://` is not supported):

```text
node tools\serve.mjs --port 8080 --prefix /pentomino/
```

Then open `http://localhost:8080/pentomino/`. Also available as `npm run serve`; on Windows, `run.cmd [port]` starts
the same server and opens the Generator.

## Develop and test

Node.js 22 or newer. There is no build step and there are no runtime dependencies.

```text
npm run check        # repository conventions and site references
npm run test:quick   # unit tests without the slow ones: node --test --test-skip-pattern=slow "tests/**/*.test.js"
npm test             # all unit tests: node --test "tests/**/*.test.js"
```

Browser test pages live in `tests/browser/` (open them through `npm run serve`). Headless generation:
`node tools\generate.mjs --board 10x6 --level hard --count 5 --seed demo --workers 4`. The
[developer guide](DEVELOPERGUIDE.md#develop-and-test) lists the test pages, the generator options and the code layout.

## Publishing

`.github/workflows/pages.yml` runs the tests, stages the site, stamps it with the commit version and verifies it before
publishing it on GitHub Pages. Only `index.html`, `redirect.js`, `core`, `generator` and `player` are deployed.

```text
node tools\stamp-version.mjs _site abc12345
node tools\check-site.mjs _site --expect-version abc12345
```

Details are in the [developer guide](DEVELOPERGUIDE.md#publishing).

## Documents

- [USERGUIDE.md](USERGUIDE.md) / [USERGUIDE.vn.md](USERGUIDE.vn.md): how to use both apps, in English and Vietnamese.
- [DEVELOPERGUIDE.md](DEVELOPERGUIDE.md) / [DEVELOPERGUIDE.vn.md](DEVELOPERGUIDE.vn.md): running, testing, code layout,
  storage, publishing and how to contribute, in English and Vietnamese.
- [docs/design-brief.md](docs/design-brief.md) and [docs/design-detail.md](docs/design-detail.md): the living
  specification (user experience and developer detail), kept in sync with the code.
- [AGENTS.md](AGENTS.md): how AI agents should work here.

## License

Released under the [MIT License](LICENSE) © 2026 Dat Le. Third-party files: the
[Nayuki QR Code generator library](https://www.nayuki.io/page/qr-code-generator-library) (MIT) in
`core/browser/vendor/`, and jsQR 1.4.0 (Apache-2.0) in `tests/vendor/`, for tests only.
