# T22 — Site versioning, deployment checks, and README

**ID:** T22  
**Depends on:** T01  
**Estimated size:** 650–1,100 implementation/test/documentation lines  
**Owner role:** infra  
**Milestone:** MVP release tooling; may run early
**Design refs:** §10–§12, §13.1, §15/I7; D42.

## Goal & business context

Publish a coherent asset/module graph under `/pentomino/`, without stale mixed versions, and give users/developers accurate operating instructions.

## Scope

**In scope:** staged-copy version stamping, site checking, workflow wiring, tests and README.  
**Out of scope:** UI accessibility/responsive implementation, app/controller fixes, multi-browser acceptance and BQ sign-off. T16–T20 own their UI fixes; T23 audits them and returns defects to those owners.

## Inputs & context

There is no build compiler or runtime dependency. Deploy only `index.html`, `redirect.js`, `core`, `generator`, `player`; exclude tasks/docs/tests/tools/`.github`.

Commands:

```text
node tools\stamp-version.mjs _site abc12345
node tools\check-site.mjs _site
node tools\check-site.mjs . --entry tools/bench/index.html
node tools\serve.mjs --root _site --port 8081 --prefix /pentomino/
```

`stamp-version.mjs <siteDir> <sha8>` modifies only the staged copy:

- Stamp relative asset/module references in HTML src/href, static/dynamic imports, export-from, literal `new URL(...,import.meta.url)` including workers, and CSS imports/URLs.
- Preserve existing queries/fragments. Never rewrite `#pack` data, local SVG fragment IDs, data/blob URLs, comments or ordinary strings.
- Use an auditable tokenizer or equivalent handling of supported syntax; fail on unresolved dynamic asset patterns instead of silently leaving a mixed graph.
- All references to one module get the same `?v=<sha8>` so there are no duplicate module instances.
- Browser-loaded graphs must use `.js`; Node-only tools may use `.mjs`.

`check-site.mjs <root> [--entry <relativeHtml>]` resolves static references, directory indexes, imports, worker URLs and CSS assets; rejects missing/root-absolute assets and browser `.mjs` imports. Default entries are root/generator/player indexes; an explicit entry supports the local bench/harness without publishing it.

Workflow remains checkout/setup-node@v4, Node22, quoted full test glob, copy staging, stamp/check, upload-pages-artifact@v4 and deploy-pages@v4. Preserve main/dispatch triggers and least required permissions. It must remain compatible with the T01 development scaffold while runtime tasks are being implemented.

README content, all inlined here:

- Account-free Generator and independent Player; root→generator; Play, portable hash link, local-only library fallback and JSON files.
- Local server command `node tools\serve.mjs --port 8080 --prefix /pentomino/`; open `http://localhost:8080/pentomino/`. No `file://` and no Python MIME assumption.
- Node22+, `node --test "tests/**/*.test.js"`; quick test skip pattern; generation/calibration CLI commands as supplied by T15/T21 when those tasks land.
- Native ES modules/no build/runtime dependencies; engine/browser/worker/app layering.
- Columns×rows notation; display-only45° rotation; Heart square/top-right-quarter block; shapes≥3, distinct; any valid tiling wins.
- Controls: drag or select/tap; E/R/Q turns; F/V flips; arrows/Shift; Enter; Escape; remove; undo/redo. View Labels/Patterns independent; timer and Straighten local.
- Seed text/Keep seed, D41 numbered batches, strict new layouts and honest shortfalls.
- Launch484 desktop/360 phone; design576/484 only after qualification; opt-in676 experimental; sides32; per-action target60/hard120.
- Scores are estimates; ordinary puzzles do not wait for uniqueness; imported claims remain unverified; required uniqueness can fail.
- Storage namespace/privacy/quota caveats; answers may be omitted; no remote upload/solver; no promised browser timings before BQ.

README is written from these contracts, not by consulting a prototype. Later T23 verifies the completed implementation matches it.

## Files to create/modify

`tools\stamp-version.mjs`, `tools\check-site.mjs`, `.github\workflows\pages.yml`, `README.md`, `tests\site-tools.test.js`, fixture files under `tests\fixtures\site-tools\`. No generator/player/core-browser files are owned by this task.

## Implementation steps

1. Implement stamping/checking on self-contained fixture graphs.
2. Verify byte preservation of source files and correct staged changes.
3. Wire final tools into the guarded workflow.
4. Write README commands/help and hand the tooling to T23 for integrated verification.

## Acceptance criteria — Business

- **BAC-1:** Staged navigation/assets remain under the project prefix and user links retain their payloads.
- **BAC-2:** README lists the real entry points, controls, seed behavior, limits and failure semantics.
- **BAC-3:** Missing assets or incompatible module graphs stop deployment instead of publishing a broken app.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\site-tools.test.js"` and conventions for owned files pass.
- **TAC-2:** Fixtures cover comments, strings, queries, fragments, workers, CSS, directory navigation and rejected browser `.mjs`.
- **TAC-3:** Stamp/check succeeds on an assembled scaffold and later on the complete T23 artifact; source hashes are unchanged by stamping.
- **TAC-4:** No UI files, prototype files, runtime dependency or service worker are added/modified here.

## Test plan

Use fixture files available immediately after T01, not unfinished app modules. Check both `/` and `/pentomino/` hosting with the Node server. T23 runs the full app/browser matrix; report any integration defect to its owning task.

## Definition of done & handoff

Tools/tests/README are ready for integration without editing other agents’ files. T23 depends on this task plus the completed apps and performance harness; this task does not claim release acceptance.
