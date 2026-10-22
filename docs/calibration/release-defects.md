# Release defects and blockers (T23, 2026-10-22)

Scope: BQ-0 and first-release acceptance of HEAD `6e91263` (no runtime source changed by T23). QA does not edit owner code; every item below goes back to its owner task. Evidence index: `bq-0-latest.md`. **T23 outcome: BLOCKED** (two failed BQ-0 criteria, incomplete coverage, missing platforms, no deployment).

## Defects and failed criteria

| ID | Sev. | Owner | Summary |
| --- | --- | --- | --- |
| D1 | High | T10 (layout discovery / batches); T08 and T04 to review the policy side | Irregular 466 board returns fewer than ten puzzles at Hard, Expert and Master (C2 fails) |
| D2 | High | T15 (generation client main-thread work); T07 (`keys.js`), T10 (`generate.js`), T11 (`pack.js`) functions involved | Main-thread tasks of 50-221 ms during generation on every board of 360+ cells (C4 fails) |
| D3 | High | T10 / T04 | 6x10 Very Easy completes ten puzzles in only 16/20 Node runs (80%, C2 fails); Easy is exactly at the line (18/20) |
| D4 | Medium | T14 / T15 (Node worker path) or Node itself | T21's native crash (exit 0xC0000005) in fresh 4-worker Node processes: not reproducible now (0 of 1,467 fresh-process runs) |
| D5 | Low | T01 (scaffold) with T17/T19 pages | Every page requests `/favicon.ico`, which 404s and logs a console error |
| D6 | Low | T21 | Browser memory has no per-cell value for short rows; BQ matrix needs a file chooser |
| D7 | Low | T18 (titles) / T20 (player top bar) | Player title of a generated puzzle reads "Normal #1 #1" (title already numbered, number appended again) |
| R1 | Risk | T10 | Irregular 466 Nightmare T10 has a very long tail (Edge, 10 seeds: 2.3 s to 72.2 s) |

### D1. Irregular 466: ten distinct puzzles not reached at Hard/Expert/Master (C2)

- **Criterion:** at least 90% of runs return ten distinct valid puzzles (BAC-1, BQ-0 criterion 2).
- **Evidence (genuine, reproduced in two environments):**
  - Node, 20 seeds (`bq-2026-10-22-0-node-irr466-lower.json`): Hard 2/20 (10%), Expert 9/20 (45%), Master 14/20 (70%) reach ten. First puzzle: 20/20 in each cell.
  - Edge 155, 10 seeds (`bq-2026-10-22-0-edge-b.json`): Hard 1/10, Expert 5/10, Master 6/10. First puzzle 10/10.
  - Every shortfall is `partialReason: layouts-not-found` after 1, 2, 4, 7 or 8 accepted puzzles (most often 4 at Hard) in well under 3 s, so this is not a time-out. The same levels pass on 22x22 (10/10) and Heart 432 (10/10); Nightmare and above on this mask pass 10/10.
  - The matrix and fixture follow the task text exactly (`tests\fixtures\bq-irregular-466.json`; 466 cells, connected, 3 holes, no symmetry), the runner re-validates every accepted puzzle, and the user-facing message for this reason (N-FEWLAYOUTS) is the usable partial result path.
- **Repro:** `node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\bq-0.json --workers 4 --fresh-process --cases "^dirr466-hard$" --output docs\calibration\repro` (20 seeds, about 40 s), or run `tools\bench\` in a browser with the same matrix subset.
- **Fix direction (owner):** low levels use few, large pieces (K = 18-19 at Hard on 466 cells), so distinct-layout discovery is exhausted on a mask with holes. Fix in layout discovery (T10) or the piece-count/size policy (T04/T08) without relaxing strict layout+clue-key distinctness, bands or budgets. Re-run the cell after any fix.

### D2. Main-thread tasks over 50 ms (C4)

- **Criterion:** no non-rendering main-thread task over 50 ms during generation.
- **Evidence (Edge 155, Long Tasks API, thumbnails off):** 31 of 43 cells fail: every 22x22, 32x15, Heart 432, irregular 466 and 18x20 cell has about one task over 50 ms per run (57-221 ms; worst 221 ms at irregular 466 Nightmare; 22x22 Hell-3 162 ms; 18x20 cells 57-92 ms). Firefox (heartbeat proxy, 3 seeds) flags 9 cells with stalls of 51-107 ms. All 12 cells on 6x10 and 12x12 have none. Cancel stays at 3-7 ms, so only the generation phases block the thread.
- **Attribution (`bq-2026-10-22-0-edge-longtask-profile.json`, CDP sampling profile, non-isolated server, so not caused by the memory API):** the busy stretches in the timed interval are
  1. `generateBatch` (generation-client.js:724) -> `foldAccept` (engine/generate.js:406) -> `layoutDistance` (engine/keys.js:275) -> `symmetryMaps` / `symmetries` (engine/board.js:350) -> `orientedCells` -> `normalizeCells` (engine/geometry.js): 40-109 ms per accepted-puzzle fold;
  2. `generateSet` -> `finishSet` (generation-client.js:633) -> `assemblePack` (:346) -> `validatePack`/`readPack` (engine/pack.js) -> `layoutKey`, and `calibrationCandidate` -> `foldStart` (engine/generate.js:255/295): 54 ms.
  The other long stretches in the profile (`runCase` -> `fillRecord` -> `validateAccepted`/`modelSize`) run after the timed interval and are not counted.
- **Repro:** run `tools\bench\` in Chromium with the 22x22 Hard cell (any seed), read `longTasksOver50` / `maxMainTaskMs` in the report.
- **Fix direction (owner):** move the symmetry/identity folding and pack assembly off the main thread or slice them (< 50 ms) in the client; no limit, band or distinctness change. Firefox has no Long Tasks API, so its heartbeat proxy figures are reported separately.

### D3. 6x10 Very Easy completion below 90%

- Node, 20 seeds (`bq-2026-10-22-0-node-6x10-low.json`): Very Easy 16/20 reach ten (80%; shortfalls stop at 7, 8, 8, 9 puzzles with `layouts-not-found`), Easy 18/20 (90%, exactly at the limit, shortfalls at 8 puzzles). First puzzle 20/20. Edge, 10 seeds: Very Easy 9/10 (one run stopped at 7). T21's landscape slice measured 65% (Very Easy) and 85% (Easy). Browser 20-seed confirmation is still missing, but the Node figure is the same engine code. Owner T10/T04, same direction as D1 (no relaxation of distinctness).
- Repro: `node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\bq-0.json --workers 4 --fresh-process --cases "^d6x10-(very-easy|easy)$" --output docs\calibration\repro` (about 1 minute).

### D4. Native crash in fresh multi-worker Node processes (T21 open defect): not reproduced

T21 saw exit code 0xC0000005 in about 2-5% of fresh 4-worker Node processes (2/80 with `tools\generate.mjs`, 0/100 with one worker). Investigated here without touching any source (scratch scripts only, Node v24.21.0, Windows 11, AMD EPYC):

| Experiment (fresh `node` process each) | Runs | Crashes |
| --- | --- | --- |
| `tools\generate.mjs --recipe tests\fixtures\generation-case.json --workers 4`, machine idle | 100 | 0 |
| same, `--workers 1` | 100 | 0 |
| same, `--workers 4`, 6 loops in parallel (24 busy worker threads on 16 logical CPUs) | 240 | 0 |
| `tools\calibrate.mjs --fresh-process`, 4 workers, one child per row (BQ-0 screens: heavy 22x22/32x15/irregular rows, Cancel probes terminating busy workers) | 277 rows | 0 |
| 4 empty `worker_threads` (no engine), natural exit / `process.exit` | 150 + 150 | 0 |
| 4 workers loading `tools\node-worker.mjs` (engine module graph), `terminate()` not awaited / `process.exit` / awaited | 150 + 150 + 150 | 0 |

- Result: 1,467 fresh-process runs, 0 crashes, so the failure is not reproducible on a quiet or loaded machine now, with or without the engine modules, and with each termination style. It is Node-only by construction (browsers use module workers; no Node worker code ships in `_site`). The T21 observations were made while several other agent processes were running heavy jobs, so a transient external condition (memory pressure, antivirus scan of freshly spawned workers) is plausible but unproven.
- Recommendation (owner T14/T15/T21, no release impact): keep `error:child-exit` recording in `tools\calibrate.mjs` (it already counts crashes against the completion rate and none occurred in any T23 Node run), and re-test on any machine/Node version where it reappears with a plain loop that spawns fresh processes and tallies exit codes; if it reproduces, capture a crash dump (`WER LocalDumps`) and compare Node 22 (the CI version in `pages.yml`) with Node 24.

### D5. `/favicon.ico` returns 404 on every page

- Chromium logs `Failed to load resource: 404 /favicon.ico` as a console error for the root page, generator, player and every harness; the acceptance rule is "no console errors". It is the only console error in all Edge runs and the Firefox runs report none of it. Fix (T01/T17/T19): ship a favicon or add `<link rel="icon" href="data:,">` to the three HTML shells. No CSP or external-request problem was found.

### D6. Bench page limitations for BQ runs

- The benchmark page can load a matrix only through its file chooser (no `?auto=bq-0`), so unattended runs need browser automation (CDP/BiDi `setFileInputFiles`). Browser memory (`measureUserAgentSpecificMemory`) needs COOP/COEP (not served by `tools\serve.mjs`) and yields no sample for rows shorter than one GC cycle; 22 of 43 Edge cells report no API peak. Hand-recorded task-manager peaks are still required for every platform. Owner T21: optional `?auto=<matrix>` and a header option for `tools\serve.mjs` (coordinate with T22).

### D7. Duplicated numbering in the player title

- Opening a generated puzzle in the player (Edge, deployed-artifact smoke and acceptance harness) shows the top-bar title `Normal #1 #1 · Claimed Normal · score 16`. The generator names the puzzle "Normal #1"; `player/app.js` (`renderTopbar`) appends `#${index + 1}` when the pack title is non-empty. Owner T20 (player top bar) or T18 (title numbering): decide one numbering source. Cosmetic; no data is affected.

### R1. Heavy tail on irregular 466 Nightmare

- Edge T10 (10 seeds): 2.3, 2.9, 3.8, 4.9, 9.6, 10.7, 11.1, 27.6, 60.7, 72.2 s; p95 = max = 72.2 s (limit 115 s), median 10.1 s. A 20-seed run could exceed the 115 s p95 or the 120 s response limit; this cell needs the full seed count before any conclusion.

## Passing evidence worth keeping

- Real-page acceptance (Edge): three recorded recipes reproduce the recorded scores through the real generator and player pages; root redirect; fresh-profile file import; Recent/`#lib=`; pasted link; invalid import keeps the open game; below-900 px and desktop structure; 44 px targets with a coarse pointer; contrast, names, live regions; no CSP/external request.
- Scaled watchdog (20x clock, production constants): busy workers terminated at 115,278 virtual ms (5,764 real ms), response at 115,680 virtual ms (5,784 real ms) with the retained calibration puzzle, N-PARTIAL notice, UI idle.
- Existing harnesses re-run on HEAD in headless Edge 155: `rendering.html` 15/15, `generator-editor.html` 24/24, `generator-flow.html` 12/12, `player-import.html` 18/18, `player-controls.html` 25/25; no CSP violation; the only console error is the favicon 404 (D5).

## Verification commands run

| Command | Result |
| --- | --- |
| `node --test "tests\bq0-matrix.test.js"` | 11 pass, 0 fail |
| `npm run test:quick` | 704 pass, 0 fail |
| `node --test "tests/**/*.test.js"` (full, 92 suites) | 714 pass, 0 fail, 0 skipped, 45 s |
| `node tools\check-conventions.mjs` / `npm run check` | OK / OK (check-site `.` OK) |
| `node --max-old-space-size=2048 tools\calibrate.mjs --matrix docs\calibration\bq-2026-10-22-0-reduced3.matrix.json --workers 4 --fresh-process --output docs\calibration\bq-2026-10-22-0-node` | 172 of 172 rows, 0 errors, 10 min (3 seeds per cell; screening) |
| same with `--matrix tools\bench\matrices\bq-0.json --cases "^dirr466-(hard\|expert\|master)$"` and `"^d6x10-(very-easy\|easy)$"` (20 seeds) | 63 and 42 rows; completion shortfalls D1/D3 |
| Edge 155 `tools\bench\` with the two 10-seed matrices (file chooser through CDP), then Firefox 158 with the 3-seed matrix (WebDriver BiDi) | 154 + 319 rows, and 172 rows; results in `bq-0-latest.md` |
| `tests\browser\acceptance.html` (fine pointer; then `pointer: coarse` emulated) and `tests\browser\watchdog.html` in headless Edge | acceptance 15 pass + 4 blocked, then 16 pass + 3 blocked, 0 failures; watchdog 5/5 |
| Deployment artifact: assemble `_site` exactly as `.github\workflows\pages.yml` (`index.html redirect.js core generator player`), `node tools\stamp-version.mjs _site 6e912637` (202 references in 48 of 63 files), `node tools\check-site.mjs _site --expect-version 6e912637` | OK; `_site` holds only `core`, `generator`, `player`, `index.html`, `redirect.js` (64 files); no `docs`, `tasks`, `tests` or `tools` directory; those URLs return 404 when served |
| `node tools\serve.mjs --root _site --port 8082 --prefix /pentomino/`, root -> generator (Normal, seed `site-smoke-1`, 5 puzzles) -> Play -> player; sample puzzle in a fresh player page | all steps work in Edge; version label 1.0.0; only console error is the favicon 404 (D5); no external request. `_site` deleted afterwards |

The deployed URL (`https://tdat00.github.io/pentomino/`) was not touched (blocker B6).

## Blockers (cannot be done on this machine)

| # | Blocker | Exact owner steps |
| --- | --- | --- |
| B1 | Full-duration BQ-0 runs | On each reference platform run `tools\bench\` with `tools\bench\matrices\bq-0.json` (20 seeds per cell, 60 for 22x22 and 18x20 Hell-1), foreground tab, battery saver off. For the Node pre-screen: `node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\bq-0.json --workers 4 --fresh-process --output docs\calibration\bq-0-node` (about 60 minutes here). Export the JSON/Markdown report, record hand-measured browser peak memory (task manager / `about:memory`) per cell group, and file the reports as `docs\calibration\bq-YYYY-MM-DD-0.*`. |
| B2 | Reference hardware | A mid-range 4-core/8-thread laptop with 8-16 GB RAM (this machine is a 16-thread server-class VM with 64 GB). Record CPU, RAM, OS, browser versions. |
| B3 | Chrome, Safari, phones | Current Chrome (not installed), Safari on a comparable Mac, a mid-range Android phone with Chrome and a two-to-three-year-old iPhone with Safari at areas <= 360 (18x20 cells at Hard, Nightmare, Hell-1, Hell-2). Do not spoof browser identity. |
| B4 | Screen reader | Real NVDA (Windows) and VoiceOver (macOS/iOS), TalkBack optional: tab through generator and player, check piece/control names, `role=application` instructions, focus after placing, live announcements, win dialog, no focus trap; record versions and findings. |
| B5 | axe | Approved local axe DevTools run (no repository or runtime dependency) on generator (empty, with set, with puzzles), player import screen, game screen and win dialog; record version, pages, results; zero critical findings required. |
| B6 | GitHub Pages deployment | Not authorized here. After D1/D2 are fixed and BQ-0 passes: dispatch the `test-and-deploy` workflow, then verify `https://tdat00.github.io/pentomino/` (root -> generator -> player, import a file, worker and modules, no console/CSP errors, version `sha8` matches the commit), and record the deployed revision. |
| B7 | Sign-off | Reviewer / product-owner / date. |
| B8 | Qualification flag | `QUALIFICATION.bq0` may be set to `pass` (with `report` pointing at the passing report) only after every cell and platform passes; it stays `not-run`. |

Local deployment-artifact check (assembled `_site`, `stamp-version`, `check-site --expect-version`, served under `/pentomino/`, root -> generator -> player smoke in Edge) is documented in the verification section above; it proves the artifact, not the deployment.
