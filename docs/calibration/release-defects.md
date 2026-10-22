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

## Fix round 1 (2026-10-22)

Scope: D2, D5, D7 fixed; D6 partly; D1, D3 and R1 analysed but **not** changed (they need a design decision, see below); D4 untouched. Nothing is committed (pending orchestrator). Generation output is unchanged: result digests of 120 re-run Node rows (irr466 Hard 20, 6x10 Very Easy 20 and Easy 20 against `bq-2026-10-22-0-node-*-*.json`; 22x22 Hard/Master, Heart 432 Hard/Nightmare, 32x15 Expert, 18x20 Hard, 12x12 Normal, 3 seeds each, against `bq-2026-10-22-0-node.json`) are identical to the T23 rows, and `tools\record-fixtures.mjs --check`, `tests\generate.test.js`, `tests\generation-client.test.js` and `tests\cli.test.js` stay green.

### Fixed

| ID | Change |
| --- | --- |
| D2 | Engine: `board.js` `symmetries` no longer sorts 8 oriented copies of the whole board (index check against the active mask); `keys.js` keeps one normalized frame plus its symmetry maps per board content (8-entry LRU) and one shape-rank table per piece set, `layoutDistance` compares typed arrays, new `minLayoutDistance` places the candidate once for all accepted layouts (`foldAccept` uses it); `geometry.js` `canonicalT` caches the 8 answers per shape. Client: `pack.js` gains `validatePackSliced` (same result as `validatePack`, pauses after board/pieces/witness and after each puzzle) and `generation-client.js` assembles every pack through it with a macrotask pause per slice (`generateSet`/`generateBatch` stay one promise each). Measurement: `tools\bench\runner.js` now ends the previous row's post-processing task (`uiIdle`) before it starts the next row's monitor. |
| D5 | `core\browser\favicon.svg` (F-pentomino, no script) linked with a relative `<link rel="icon" type="image/svg+xml">` from `index.html`, `generator\`, `player\`, `tools\bench\` and the `tests\browser\*.html` harnesses. `stamp-version` already stamps `rel=icon`; assembled `_site` (`index.html redirect.js core generator player`) stamps 220 references, `check-site --expect-version` OK, only the five expected entries in `_site`. The icon request now returns 200 under the page CSP and relative paths. |
| D6 (part) | `tools\bench\index.html?matrix=<path>` loads a same-origin matrix relative to the page, `?auto=matrix` starts it on load (no file chooser needed). The browser-memory part of D6 (COOP/COEP header option, short rows) is untouched. |
| D7 | `player\puzzle-title.js` `puzzleDisplayName`: a title that already ends in `#<n>` (every generated title) is shown as it is; other titles still get `#<index+1>` appended; untitled stays "Puzzle n". `player\app.js` `renderTopbar` uses it (two lines). The pack menu list is unchanged. |

### D2 measurements (Edge 155 headless, `tools\bench\` via CDP, Long Tasks API, `longTasksOver50` per generation row)

Finding: part of the T23 figure was a **bench artifact**. `runCase` ran the previous row's `fillRecord` (`validateAccepted`, `modelSize`: 50-150 ms on large boards, after `responsiveness.stop()`) and then called `responsiveness.start()` for the next row in the same task, so the observer counted that task as a stall of the next row (this is why the first row of every cell showed none and later rows about one: 57-221 ms). The rest was real engine/client work.

| Run | d22x22-hard | d32x15-hard | heart432-hard | irr466-nightmare | p18x20-hard | 22x22 nightmare/hell-3, 32x15 nightmare, irr466 hell-1, 18x20 hell-1 |
| --- | --- | --- | --- | --- | --- | --- |
| HEAD, T23 (rows with >50 ms / rows) | 1 per run (57-162 ms) | 1 per run | 1 per run | up to 221 ms | 57-92 ms | 1 per run |
| HEAD engine + runner fix only (3 reps) | 0/3 | 0/3 | 0/3 | **2/3 (191 ms, 50 ms)** | 0/3 | 22x22 nightmare 1/3 (90 ms) |
| This round (3 reps) | **0/3** | **0/3** | **0/3** | **0/3** | **0/3** | **0/15 rows** |

All rows completed ten puzzles; cancel latency 3-8 ms; no console error or failed request (favicon 404 gone). Residual risk: a slower reference machine may make the (now sliced) fold step or `createPack` (about 1 ms warm, 8 ms cold in Node) cross 50 ms; re-measure in BQ-0.

Node warm cost per call before/after (22x22 Hard, 19 pieces, scratch profile): `layoutKey` 4.6 ms to 0.9 ms; `foldAccept` at the 9th accepted puzzle 14.8 ms to 3.7 ms; `foldStart` 8.7 ms to 2.0 ms; `createPack` (10 puzzles) 9.7 ms cold to 0.6 ms warm; `validatePack` 19.8 ms cold, now delivered in 11 slices of about 1-3 ms.

Regression tests: `tests\keys.test.js` (symmetry maps built once per board; `minLayoutDistance`), `tests\board.test.js` (symmetry search equals the direct comparison on 60 random masks), `tests\pack.test.js` (`validatePackSliced` equals `validatePack`, one pause per slice), `tests\benchmark-matrix.test.js` (monitor starts after `uiIdle`), `tests\player-controller.test.js` (title formatting); `tests\generation-client.test.js` `settle` now also waits on timers because pack assembly pauses.

### D1 / D3 root cause (not changed, needs a decision)

The shortfalls are not a time-out, a bug or a diversity problem of restarts: the **piece set itself has fewer than ten arrangements**. Evidence (scratch scripts, 300 LNS walks of 8 steps from the witness; the walk from the witness is the only discovery on boards over 150 cells):

- irr466 Hard seeds with 4 accepted puzzles have exactly **4** distinct layouts reachable (witness plus three alternatives, all from a single macro region; the other 3-4 regions have a unique tiling); seeds with 8 accepted have 8; the only 10/10 seed (3) has 32. The reachable counts come in products of the regions' alternatives (4, 8, 16, 32), which is why accepted counts cluster at 4 and 8. Pieces are 22-31 cells and all different, so a region (3-6 such pieces) rarely has a second tiling.
- Fold trace of a failing seed (`bq0/dirr466-hard/14`): after four accepted puzzles every remaining candidate is a valid, in-band puzzle whose layout key is already accepted (`layoutDup=true`); `layouts-not-found` is simply "twelve attempts, all duplicates".
- 6x10 Very Easy (K = 6-7 pieces of 8-10 cells): the same, with 7-9 reachable arrangements; global `randomTiling` restarts (attempts 2, 5, 8, 11) find nothing new, so the set has only those arrangements.
- Share of seeds whose first set has at least 11 reachable layouts (24 walks plus witness): irr466 Hard 23% (30 seeds), 6x10 Very Easy 73% (60 seeds); 22x22, Heart 432, 32x15, 18x20 Hard 100% (20 seeds each), which is why those cells pass.
- Checked and rejected: widening the macro cluster on every stuck step (not just every eighth step) changes nothing (same reachable counts on all seven seeds probed), because broadened clusters of large distinct pieces are rigid too. The code matches design §6.5/§6.7; there is no implementation bug to fix.

### Options for D1 / D3 (each changes a design rule; none applied)

1. **Set-capacity filter in `setAttempt` (recommended).** After carving and calibration, reject (as a failed attempt, so the lowest successful attempt still wins and pool width stays irrelevant) a set whose LNS probe reaches fewer than N = 12 distinct layout keys. Serial simulation with the real engine, 20 seeds: ten puzzles reached in 20/20 for irr466 Hard (was 2), Expert (9), Master (14) and 6x10 Very Easy (16) and Easy (18); set attempts used 1-12 (irr466 Hard mean about 5, 6x10 mean 1.4); cells that pass today keep their first attempt (all probed sets have 14 or more layouts), so their output would not change. Costs and rule changes: new set-acceptance rule (design §6.4/6.5 and the `setAttempt` contract), a probe budget in `BUDGETS` (a new constant; the existing ones do not change), `ALGO_ID` bump and re-recorded fixtures for any seed whose first set is rejected, the probe costs about 0.2 s per walk on 18x20 and 0.03 s on 466 cells (12 walks minimum), so a cheaper estimator (count alternatives per macro region from one `lnsStep` each) should be preferred; distinctness, bands, score caps, TIME, LIMITS and qualification stay as they are.
2. **Require several tilings per macro region at carve time** (`carveMacro`): closer to the design text ("each macro region is a small sub-puzzle with several tilings"), but regions of 3-6 distinct 22-31-cell pieces rarely have two, so it would fail most partitions and fall back to flat carving (single arrangement, worse); not measured further.
3. **Piece-count/size policy** (fewer, larger pieces is what causes it; K = 18-19 on 466 cells at Hard): raising K or narrowing sizes on irregular masks changes `pieceCountRange`/size windows, a policy change to bands and calibrated difficulty; not recommended.
4. **Keep the design, amend BQ-0 criterion 2** for large irregular boards at low levels and small boards at Very Easy/Easy (the product already shows N-FEWLAYOUTS with a "new piece set" button): no code change, but the 90% completion rule must be reworded by the owner.

### R1 and D4

R1 (irr466 Nightmare heavy tail) is not addressed here: it is a search-time question for the full 20-seed BQ-0 run. D4 was not touched.

### Verification (this round)

| Command | Result |
| --- | --- |
| `node --test "tests/**/*.test.js"` | 747 pass, 0 fail (before the last added test; the bench-matrix file re-run: 16 pass) |
| `npm run check` / `node tools\record-fixtures.mjs --check` | OK / OK |
| Headless Edge 155 (CDP, `tools\serve.mjs`): `generator-flow.html`, `player-import.html`, `player-controls.html`, `acceptance.html`, `rendering.html`, `generator-editor.html` | 12/12, 18/18, 25/25, 15 pass + 4 blocked, 15/15, 24/24; zero console errors and zero failed requests |
| Edge bench, `?matrix=` loader, 20 cells x 3 reps | `longTasksOver50` 0 in all 30 rows (table above) |
| Repro of T23 commands (before/after, unchanged behaviour) | irr466 Hard 2/20, 6x10 Very Easy 16/20, Easy 18/20 both times |

### Still needs the full BQ-0 rerun

All 43 cells on every platform (this round measured 20 of them with 3 reps on one Edge); Firefox (heartbeat proxy) and the other platforms of blockers B1-B5; D1/D3 cells after the owner picks an option; R1 with 20 seeds; hand-recorded memory peaks.

## T24 findings (2026-10-23)

Scope: T24 (BQ-1/BQ-2/BQ-3 higher-limit qualification) on HEAD `5948723`; no engine, worker, client or gate code changed; `QUALIFICATION` untouched. Evidence index: `bq-higher-latest.md`. **T24 outcome: BLOCKED** (no phone, no Safari/Mac, no reference laptop, reduced seeds; D1 would fail the gates anyway). Everything measured is screening on this non-reference machine.

| ID | Sev. | Owner | Summary |
| --- | --- | --- | --- |
| D8 | High | T10 / T04 (same root cause as D1/D3) | Irregular 558 and 658 boards (and irregular 466 in BQ-3) return fewer than ten puzzles at Hard and Master, so BQ-1, BQ-2 and BQ-3 cannot pass |
| D9 | Medium | T15 (worker pool / generation client) or the browser | One unreproduced `worker-crashed` ("The worker stopped: unknown error") in Edge 155 at the start of a cell |
| R2 | Risk | T10 | Irregular 558 Nightmare T10 has a heavy tail close to the 115 s p95 limit even on this fast machine |
| R3 | Risk | T15 / T11 | Whole-Firefox private memory reached 1,421 MiB at 26x26 Hell-3, near the 1,536 MiB limit (upper bound; per-tab peak unknown) |

### D8. Irregular masks at Hard and Master fail the ten-puzzle criterion

- **Evidence (identical in Node, Edge 155 and Firefox 158, 3 seeds per cell; `bq-2026-10-23-1-*`, `-2-*`, `-3-*`):** irregular 558 Hard 1/3 and Master 2/3 (BQ-1); irregular 658 Hard 2/3 and Master 2/3 (BQ-2); irregular 466 Hard 2/3 (BQ-3, the T23 fixture). Every shortfall is `layouts-not-found` after 4 accepted puzzles (1 for irregular 466 Hard seed 2) in 0.6-1.7 s, so it is not a time-out. At least one puzzle: 3/3 in every cell. Nightmare and above pass 3/3 on the same masks; the full rectangles (24x24, 32x18, 26x26, 32x21, 22x22) and Heart 363 pass 3/3 at every level. At 3 seeds the sample cannot estimate the rate, but 1/3, 2/3 and 2/3 are far from 90% and match D1's 20-seed Node rates (10%, 45%, 70%).
- **Cause (from D1):** the carved piece sets admit fewer than ten distinct layouts, a property of the large pieces at low levels on a mask with holes; not a browser or timing effect.
- **Repro:** `node --max-old-space-size=2048 tools\calibrate.mjs --matrix docs\calibration\bq-2026-10-23-1-reduced3.matrix.json --workers 4 --fresh-process --cases "^dirr558-(hard|master)$" --output docs\calibration\repro` (about 30 s); raise `repetitions` to 20 in a copy of the matrix for a rate.
- **Fix direction (owner):** the same D1 decision (options 1-4 above; the set-capacity filter was recommended and simulated at 20/20 for irregular 466 and 6x10). It changes `ALGO_ID`, so every BQ-0..BQ-3 timing must then be re-measured; BQ-1/2/3 cells with Hard/Master on irregular boards must be re-run after the fix with at least 20 seeds. Option 4 (reword the criterion for these cells) would need a new, explicit BQ rule; this task did not change it.

### D9. Single `worker-crashed` in Edge (unreproduced)

- **Evidence:** `bq-2026-10-23-1-edge155-reduced3.json`, cell `d24x24-master`, seed `bq1/d24x24-master/0`: `{phase: batch, code: worker-crashed, message: "The worker stopped: unknown error"}` 469 ms after the click, 2 puzzles retained (`partialReason: error:worker-crashed`), the second cell of a long-lived page, cross-origin isolated, memory API polling on, while a Node screen ran on the same machine. Not seen in the other 199 rows of the three Edge matrices, in T23's 473 Edge rows, in 32 Firefox rows, or in 20 consecutive reruns of the same cell (`bq-2026-10-23-1-edge155-repro-worker-crash.json`, all ten puzzles, no error). Node showed no crash (T21's 0xC0000005 is a different symptom, D4).
- **Impact:** counts as a failed run in the ten-puzzle rate (one run in 54 for BQ-1) and the client reports it as an error with the retained puzzles, so users are not left without feedback. A rate of about 1 in 190 generation rows cannot be tested away at 3 seeds, so any qualification run must record `worker-crashed` explicitly.
- **Fix direction (owner):** reproduce under memory pressure or with a `worker.onerror` capture (the event carries no detail here), check whether `measureUserAgentSpecificMemory` polling or first-cell start-up plays a role, and keep the pool's recovery behaviour (retained puzzles, N-PARTIAL) covered by a test.

### R2 and R3

- R2: irregular 558 Nightmare T10 at 3 seeds: Edge 2.6 s, 41.0 s, 89.1 s; Node 2.4 s, 41.6 s, 91.8 s (same seeds, same result digests as accepted counts). The 115 s p95 limit is 25 s away on this machine; a slower reference laptop is a *forecast* risk, not a measurement. Irregular 466 Nightmare in BQ-0 (R1) behaves the same way.
- R3: the Firefox whole-process private-memory sum (browser, GPU, content and worker processes, sampled every 3 s) reached 1,421 MiB at 26x26 Hell-3 and 1,115 MiB at BQ-1 sizes; accounted bytes were 332 MiB. The sum includes browser overhead, so the per-tab peak is lower, but only a hand-recorded task-manager / `about:memory` peak can settle criterion C3 at 676 cells.

### Passing evidence worth keeping (screening only)

- The D2 fix holds at 576-676 cells: Edge Long Tasks API saw one 52 ms task in 150 generation rows over the three matrices (first cell of BQ-1) and none elsewhere; the Firefox heartbeat proxy saw at most 37 ms; Cancel settled in at most 12 ms (Edge), 10 ms (Firefox) and 46 ms (Node).
- No `model-too-large` and accounted bytes at most 332 MiB (budget 1,196 MiB) at 26x26 Hell-3; whole-Edge private memory at most 1,043 MiB.
- Node and Edge agree on accepted counts and shortfall cells in BQ-2 and BQ-3 (same seeds and engine), and the source digest `ad96b258...` is identical in Node, Edge and Firefox reports.
- The T24 fallback tests (`tests\bq-limits.test.js`) pin desktop 484 / phone 360 / experimental 676 and show that only `pass` can move a limit.

### Blockers (T24)

| # | Blocker | Exact owner steps |
| --- | --- | --- |
| B9 | D1/D3/D8 decision and fix | Pick one of options 1-4 above, implement it (new `ALGO_ID`, re-recorded fixtures where a first set changes), re-run BQ-0 in full (B1-B3) and the Hard/Master cells of irregular 466/558/658. |
| B10 | Full BQ-1/BQ-2 desktop runs | On the reference laptop (B2) with Chrome or Edge, Firefox and Safari on a comparable Mac: serve with `node tools\serve.mjs --port 8080 --prefix /pentomino/` and open `http://localhost:8080/pentomino/tools/bench/?matrix=../../tools/bench/matrices/bq-1.json&auto=matrix&commit=<sha>` (then `bq-2.json`); the memory API additionally needs COOP/COEP headers, otherwise record the per-tab peak by hand. At least 20 seeds (60 for Hell-1 at the largest area) are already encoded; do not reduce them. Node pre-screen as in the task text (`bq-1-node`, `bq-2-node`). Freeze `core`, `generator`, `player` and `tools\bench` during each run. |
| B11 | BQ-3 phones | Android Chrome and iPhone Safari (B3) on the same seeds: open the same bench page on the phone (the matrix needs a reachable same-origin server, for example the dev machine's LAN address or a temporary deployment; the bench page has no file chooser for phones), run `bq-3.json`, record per-tab memory by hand (Android: Chrome task manager / `chrome://inspect`; iPhone: Safari Web Inspector), keep the phone plugged in and foregrounded, do not spoof the browser. |
| B12 | Gate update | Only after a complete, reviewed pass: change `core\engine\qualification.js` for that gate (`status: 'pass'`, `report: <repo-relative report>`), update the pinned assertions in `tests\policy.test.js` and `tests\bq-limits.test.js` in the same commit, add the gate lines to `tasks\init-design\check-list.md`, and re-run the affected cells after any implementation change. A completed honest failure is recorded as `fail` with its report and does not change a limit. |
