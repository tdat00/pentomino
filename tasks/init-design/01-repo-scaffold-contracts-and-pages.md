# T01 — Repository scaffold, shared contracts, and initial Pages deployment

**ID:** T01  
**Depends on:** None  
**Estimated size:** 1,000–1,500 implementation/test lines  
**Owner role:** infra  
**Milestone:** MVP foundation
**Design refs:** §3, §4.1, §12.1–§12.7, §13.1, §15/I0; D42.

## Goal & business context

Give every later agent a working, deployable starting point. Visiting the project home must lead to the Generator, while Generator and Player remain independent pages sharing one engine.

## Scope

**In scope:** root redirect, minimal app shells, package/scripts, conventions, public JSDoc contracts, version identifiers, initial tests, MIME-correct local serving, static-site checking, Pages workflow.  
**Out of scope:** game algorithms, finished UI, performance qualification, and all files under `docs\init-design\prototype\`. Do not use the prototype as an implementation source.

## Inputs & context

Authoritative architecture, inlined from the signed-off design:

- Native ES2022 JavaScript modules, `// @ts-check`, JSDoc types, no mandatory build and no runtime dependencies.
- `core\engine\` imports engine modules only: no DOM, storage, timers, or wall-clock inputs to results. Explicit seed creation may use `crypto.getRandomValues`.
- `core\workers\engine.worker.js` imports engine modules only. Browser helpers may import the engine. Neither app imports the other app.
- Production URL: `https://tdat00.github.io/pentomino/`; app directories each contain a real `index.html`.
- Filesystem paths in these tasks use backslashes. URL/module specifiers and the Node glob `tests/**/*.test.js` intentionally use forward slashes.
- Authored JS/MJS/HTML/CSS/JSON/YAML/Markdown: UTF-8 without BOM, CRLF, final newline, two-space indentation, no trailing whitespace except exactly two spaces for intentional Markdown hard breaks. Empty `.nojekyll` is exempt from the final-newline check. Do not reformat historical design/prototype files.
- Browser-loaded page/worker modules use `.js` only. Reserve `.mjs` for Node-only tools; never link/import one into a browser graph.

Exact convention files:

```gitattributes
* text=auto eol=crlf
*.png binary
```

```editorconfig
root = true
[*]
charset = utf-8
end_of_line = crlf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
[*.md]
trim_trailing_whitespace = false
```

The convention checker still rejects unintended Markdown whitespace; exactly two trailing spaces may represent a hard break. Explicit CRLF checkout makes the Ubuntu CI convention check agree with Windows.

Root HTML must include an external module, fallback link and meta refresh to `./generator/`. Root CSP:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'">
<meta http-equiv="refresh" content="0; url=./generator/">
<script type="module" src="./redirect.js"></script>
```

`redirect.js` uses `new URL('./generator/', import.meta.url)`, copies `location.search` and `location.hash`, and calls `location.replace(target)`. No inline script.

Each app page uses:

```text
default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self';
img-src 'self' data: blob:; connect-src 'self'; object-src 'none';
base-uri 'self'; form-action 'none'
```

Create `core\engine\types.js` as JSDoc-only shared contracts (`export {}` is sufficient at runtime). This resolves the design’s unnamed request/action types; it is not a new game rule:

```ts
type XY = [number, number];
type Turn = 0 | 1 | 2 | 3;
type Pose = { piece: string; x: number; y: number; turn: Turn; mirrored: boolean };
type Board = { width: number; height: number; active: Uint8Array };
type Piece = { id: string; label: string; color: string; cells: XY[] };
type PieceSet = { board: Board; pieces: Piece[]; witness: Pose[] | null;
  carving: 'macro' | 'flat' | 'imported'; macroRegion: number[] | null };
type Issue = { code: string; path: string; message: string };
type Result<T> = { ok: true; value: T; warnings: Issue[] } |
  { ok: false; issues: Issue[] };
type Metrics = { U:number; B:number; branchTrials:number; rowTrials:number;
  stop:'solution'|'branch-cap'|'row-cap'; R:number; H:number };
type Rating = { model:'difficulty-v2'; score:number; level:string;
  saturated:boolean; metrics:Metrics };
type Certificate = { status:'unique'|'multiple'|'not-proved'|'unsatisfiable';
  model:'dlx-v1'; rowLimit:number; verified:boolean };
type Puzzle = { id:string; title?:string; clues:Pose[]; solution:Pose[]|null;
  rating:Rating|null; certificate:Certificate|null };
type RatingClaim = { model:string; score:number; level:string;
  saturated?:boolean; censored?:boolean; metrics?:object };
type CertificateClaim = { status:Certificate['status']; model:string; rowLimit?:number };
type PackPuzzle = { id:string; title?:string; clues:Pose[];
  solution?:Pose[]|null; rating?:RatingClaim|null; certificate?:CertificateClaim|null };
type Pack = { format:'pentomino-pack'; version:1; kind:'piece-set'|'puzzle-pack';
  rules:'free-polyomino-v1'; board:{rows:string[]};
  presentation?:{rotation:number}; pieces:Piece[]; witness?:Pose[]|null;
  puzzles:PackPuzzle[]; generation?:object; meta?:object };
```

Shared execution conventions:

- `macroRegion[i]` belongs to `pieces[i]`, even when solver columns use another order.
- `EngineExecution = {main: Workspace, scratch: Workspace, onProgress?: callback}` is engine-only, injected by the worker; it is never structured-cloned.
- `SetRequest = {board, rotation, levelId, seedText, uniqueness:'any'|'require', execution}`.
- `SetAttemptResult = {ok:true, set, calibration, attempt}` or `{ok:false, reason:'carve'|'internal'|'not-in-band'|'uniqueness-not-proved'}`. Invalid request arguments are typed control errors, not another failed-search spelling.
- `BatchContext = {set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts:ReadonlySet<string>, seenClues:ReadonlySet<string>, calibration?:Puzzle, execution}`; quantity is 1–10.
- `PuzzleCandidate = {layout:Pose[], layoutKey:string, clueKey:string, clues:Pose[], rating:Rating, certificate:Certificate|null}`.
- `BatchResult = {status:'complete'|'partial'|'cancelled', pack?:Pack, accepted:Puzzle[], seenLayouts:string[], seenClues:string[], reason?:'layouts-not-found'|'difficulty-not-found'|'uniqueness-not-proved'|'time-limit'}`. This is also T15's host batch result; there is no competing `puzzles` field.
- Wire tasks are plain JSON-compatible DTOs: board as `boardRows:string[]`, sets as pieces/witness/carving/macroRegion plus boardRows, sets of history keys as arrays. T14 hydrates engine types and execution workspaces.
- Coordinates: x right, y down. A pose mirrors x first, turns clockwise, normalizes, then adds its origin. Presentation angles are counter-clockwise and never affect generation identity or seeds.
- Module-specific game/fold/render/transport types are exported as JSDoc by their owning modules, avoiding concurrent edits to this shared file. Consumers receive the relevant contracts in their task files.

`version.js` exports `APP_VERSION = '1.0.0'` and `ALGO_ID = 'gen-v2'`. Policy, RNG and score identifiers remain owned by their respective modules, not duplicated here.

Package scripts:

```json
{
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test \"tests/**/*.test.js\"",
    "test:quick": "node --test --test-skip-pattern=slow \"tests/**/*.test.js\"",
    "check": "node tools/check-conventions.mjs && node tools/check-site.mjs .",
    "serve": "node tools/serve.mjs --port 8080 --prefix /pentomino/"
  }
}
```

CI uses Node 22+, runs the quoted test glob, copies only `index.html`, `redirect.js`, `core`, `generator`, `player` into `_site`, conditionally invokes `tools/stamp-version.mjs` if present, and runs `tools/check-site.mjs _site`. Use checkout/setup-node/upload-pages-artifact/deploy-pages actions with permissions `contents:read`, `pages:write`, `id-token:write`; deploy only from main or workflow dispatch. Do not depend on later-task files without an existence guard.

Initial workflow contract (the assembly shell is Ubuntu Bash, not local PowerShell):

```yaml
name: test-and-deploy
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: node --test "tests/**/*.test.js"
      - name: Assemble site
        run: |
          mkdir -p _site
          cp index.html redirect.js _site/
          cp -r core generator player _site/
          if [ -f tools/stamp-version.mjs ]; then node tools/stamp-version.mjs _site "${GITHUB_SHA::8}"; fi
          if [ -f tools/check-site.mjs ]; then node tools/check-site.mjs _site; fi
      - uses: actions/upload-pages-artifact@v4
        with: { path: _site }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Pages settings must select GitHub Actions. `.nojekyll` supports a separately authorized branch-deploy fallback; it is not needed in the Actions artifact.

### Local static server

Create zero-dependency Node `tools\serve.mjs` using `node:http`, `node:fs` and `node:path`. Export `createStaticServer({root,prefix})` for tests; listen only when invoked as a CLI. Defaults: repository cwd, port8080, host127.0.0.1, prefix `/pentomino/`. Accept `--root`, `--port`, `--prefix`, and explicit `--host` for authorized LAN device testing.

```text
node tools\serve.mjs --port 8080 --prefix /pentomino/
node tools\serve.mjs --root _site --port 8081 --prefix /pentomino/
```

Map `/pentomino/path` to `<root>\path`; redirect `/` and a missing trailing prefix slash to `/pentomino/`. Append `index.html` for directories; no directory listings. Ignore query strings. Reject decoded traversal, NULs, backslash escapes, `.git` and private `docs/local` paths; GET/HEAD only. For authorized LAN phone tests, serve a reduced project-local runtime/bench snapshot rather than exposing the full repository.

Explicit MIME map: `.js`/`.mjs` → `text/javascript; charset=utf-8`, `.html` → `text/html; charset=utf-8`, `.css` → `text/css; charset=utf-8`, `.json` → `application/json; charset=utf-8`, `.svg` → `image/svg+xml`, `.png` → `image/png`; otherwise `application/octet-stream`. Use `Cache-Control: no-store` for development. Do not rely on the Windows registry/Python MIME map. Browser graphs still must use `.js`.

## Files to create/modify

`index.html`, `redirect.js`, `.nojekyll`, `.editorconfig`, `.gitattributes`, `package.json`, `.github\workflows\pages.yml`; append `_site/` and `tests/artifacts/` to `.gitignore` without removing existing exclusions; `core\engine\types.js`, `core\engine\version.js`; minimal `generator\index.html`, `generator\app.js`, `generator\generator.css`, `player\index.html`, `player\app.js`, `player\player.css`; `tools\serve.mjs`, `tools\check-site.mjs`, `tools\check-conventions.mjs`; `tests\serve.test.js`, `tests\scaffold.test.js`.

## Implementation steps

1. Create shells that import `../core/engine/version.js`; add links between the app directories.
2. Add the contracts and conventions above. Keep the checkers scoped to production/test/tool paths and designated root files, excluding historical docs and prototypes.
3. Implement the explicit-MIME server and a minimal site checker; T22 extends checking/stamping of the full module graph.
4. Add an actual scaffold test before enabling the globbed CI test command.
5. Add the guarded copy/deploy workflow; configure Pages to GitHub Actions when authorized.

## Acceptance criteria — Business

- **BAC-1:** Opening `/pentomino/` reaches `/pentomino/generator/`; a usable link remains when JavaScript is disabled.
- **BAC-2:** Both app shells open independently and navigation stays under the project prefix.
- **BAC-3:** A foundation deployment can succeed without any solver or late-stage stamping tool.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\scaffold.test.js" "tests\serve.test.js"` and `npm run check` pass.
- **TAC-2:** `node --test "tests/**/*.test.js"` runs on Node 22+ without installed packages.
- **TAC-3:** Root query/hash preservation is checked with JavaScript enabled; CSP contains no inline-script allowance.
- **TAC-4:** Checkers reject BOM/LF-only/trailing-whitespace violations in their owned text scope and root-absolute app asset paths.
- **TAC-5:** Deployment artifacts exclude tasks, docs, tests, tools and `.github`; no application runtime dependency or build compiler is introduced.

## Test plan

Unit-test redirect construction; use the server on an ephemeral port to verify GET/HEAD, every MIME type, prefix mapping, index redirects,404 and traversal rejection. Close it after tests. Inspect `http://localhost:8080/pentomino/`; never use `file://` for modules. Inject a missing local reference and require checker failure. Exercise deployment only through authorized GitHub operations; missing access is a blocker, never a claimed deployment.

## Definition of done & handoff

Commit-ready files, green targeted commands, and a short report of exact commands/results and any access blocker. Do not commit/push unless instructed by the orchestrator. Later tasks may replace app shells but retain their module paths, CSP and deployment contracts.
