# T23 — BQ-0 and first-release acceptance

**ID:** T23  
**Depends on:** T18, T20, T21, T22  
**Estimated size:** 650–1,100 harness/config/report lines plus unattended browser runs  
**Owner role:** qa / release  
**Milestone:** Mandatory MVP release gate
**Design refs:** §8.7/BQ-0, §13.3–§13.4, §15/I5/I7.

## Goal & business context

Confirm that the actual application meets the target experience at the shipped default limits. Node estimates and old prototypes cannot authorize release.

## Scope

**In scope:** BQ-0, cross-app/browser/accessibility acceptance harnesses, defect reports, release evidence and deployed Pages verification.  
**Out of scope:** editing app/UI owners' files, enabling higher caps, redefining success, or pretending unavailable hardware was tested. Return implementation defects to T16–T20 and rerun affected checks after their fixes.

## Inputs & context

Use T21’s unchanged production-engine harness. BQ-0 tests `uniqueness:'any'`, quantity10, four workers, default desktop484 and phone360, with sides≤32 and only offered levels.

Reference platforms:

- Mid-range four-core/eight-thread laptop,8–16 GB RAM, battery saver off: current Chromium and Firefox.
- Comparable Mac: current Safari.
- Mid-range Android phone/Chrome and a two-to-three-year-old iPhone/Safari, at areas≤360.
- Record actual hardware/browser versions. Missing a platform is a blocker, not a pass or browser-identity spoof.

Matrix, at least20 seeds per board/level and at least60 for Hell-1 at the largest tested area:

| Platform | Boards | Levels |
|---|---|---|
| Desktop | 22×22 (484),32×15 (480),Heart N24 at45° (432), irregular mask below (466) | Every offered level from Hard upward; Heart432 stops at Hell-2, others allow Hell-3 |
| Desktop | 6×10 (60),12×12 (144) | Every offered level |
| Phones | 18×20 (360) | Hard, Nightmare, Hell-1, Hell-2 |

Irregular fixture definition, zero-based: start22×22 active; block x0..2/y0..2 (9 cells), x20..21/y19..21 (6), and `(7,6),(15,14),(5,17)` (3). Result466, connected, asymmetric, with holes. This is a reproducible test fixture, not a new preset.

The fixture file schema is `{rows:string[]}`. The matrix’s `boardRows` copies those rows, so browser runs need no filesystem lookup or guessed fixture adapter.

Offered intervals: VE30–87; Easy32–215; Normal36–348; Hard41+; Expert50+; Master59+; Nightmare81+; H1 164+; H2 266+; H3 450+. Filter matrix entries through `offeredLevels`; never request Hell-3 on360.

Metrics:

- T1: Generate click→validated set/calibration ready.
- T10: same click→tenth accepted puzzle after immediate New Puzzles.
- Certificates settle separately and do not block T10.
- Per-run accepted count/reason, score saturation, workspace bytes, browser memory for tab+workers and errors.
- Conditional T10 percentiles are labeled and combined with the completion-rate requirements below; failed runs are never zero-duration successes.

**Every matrix cell and listed browser must pass:**

1. T10 median≤60 s, nearest-rank p95≤115 s; every response≤120 s.
2. ≥90% return ten distinct valid puzzles; ≥99% return at least one.
3. Browser peak≤1.5 GiB, own byte accounting within300 MiB main +4×(160+32+32) MiB worker budgets; no model-too-large at an offered level.
4. No non-rendering main-thread task>50 ms; Cancel settles<200 ms.

For criterion4, use T21's measured fields: Chromium Long Tasks API, otherwise the10 ms MessageChannel heartbeat **proxy**, with method recorded. Thumbnail rendering is off during timed BQ runs. Record `maxMainTaskMs`, `longTasksOver50`, and one separate per-cell cancel probe with `cancelLatencyMs`; missing/inactive-tab measurements cannot pass. Cancel probes do not count as incomplete generation runs. Certificates include a notChecked count.

Use the same mask/seed set for every browser. Record strict layout+clue-key uniqueness, not just count10. With20 or60 runs, a single first-puzzle failure fails the99% criterion.

Commands/entry points:

```text
node --test "tests/**/*.test.js"
node tools\check-conventions.mjs
node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\bq-0.json --workers 4 --fresh-process --output docs\calibration\bq-0-node
node tools\serve.mjs --port 8080 --prefix /pentomino/
```

Run `http://localhost:8080/pentomino/tools/bench/` with BQ-0 on actual browsers. Export raw reports under `docs\calibration\`, dated `bq-YYYY-MM-DD-0.*`, with a stable latest index and source digests. No runtime code changes during measurement.

### Cross-app and accessibility acceptance

Use real app components, never the static prototype. Verify:

1. Default10×6→set→5 puzzles→Play; Heart N10/Master→set→10→Play;22×22/Hell-3→set→10→Play using recorded successful production recipes.
2. Root/prefix loading, file import in a fresh profile, pasted link, library fallback, and an invalid import preserving the old game.
3. Paint/unblock at0°/45°, player drag/tap/keyboard at0°/45°/90°/315°, page scroll/zoom, alternate valid win and cancel retaining accepted results.
4. Desktop layouts and below900 px layouts match the inlined T17–T20 diagrams, including sticky actions, puzzle-level selector, Copy pack link, top-bar Straighten and selection toolbar.
5. Keyboard-only completion plus a real screen-reader smoke test (e.g. NVDA and VoiceOver on the listed platforms): named pieces/controls, role=application instructions, focus, live announcements, and no focus trap.
6. Contrast≥4.5:1, touch targets≥44 px, independent Labels/Patterns, reduced-motion rejection/celebration, and no console/CSP errors or external runtime requests.
7. Run an approved local axe DevTools/extension audit, record version/pages/results, and require **zero critical findings** without adding a repository/runtime dependency. Route fixes to the owning UI task.

Add a real-browser watchdog wiring probe using T14's injected clock, separate from BQ timing statistics. Scale the host clock20× (`now=20*elapsed`, timers divide delays by20) while production TIME constants remain unchanged. Use module-worker test fixtures that remain busy for10 real seconds; retain a previously engine-verified calibration puzzle in the batch. At5.75 real seconds the115 s virtual stop must terminate busy workers; by6 real seconds/120 s virtual, the client returns the retained prefix with time-limit and UI idle. Record virtual stop/response timestamps and scale. This proves browser watchdog wiring, not a real120 s performance pass.

## Files to create/modify

`tools\bench\matrices\bq-0.json`, `tests\fixtures\bq-irregular-466.json`, `tests\bq0-matrix.test.js`; `tests\browser\acceptance.html`, `acceptance.js`, `watchdog.html`, `watchdog.js`, `watchdog-worker.js`; BQ-0 record only in `core\engine\qualification.js`; `docs\calibration\bq-0-latest.md`, dated raw reports and `release-defects.md`; acceptance evidence in the checklist. Do not modify app-owner files directly.

## Implementation steps

1. Materialize/validate the exact matrix and fixture; record runtime source identity.
2. Run Node pre-screening, then real browsers and cancellation/resource probes.
3. Verify geometry, scores and strict identities for every accepted result.
4. Mark `QUALIFICATION.bq0` pass only after the full evidence passes; leave BQ-1/2/3 unchanged. Complete the overall checklist and deploy through the authorized Pages workflow. Earlier foundation deployments are not release qualification.
5. Verify `https://tdat00.github.io/pentomino/`, generator/player modules and a worker with no console/CSP errors.

## Acceptance criteria — Business

- **BAC-1:** Every default-limit matrix cell meets the four pass criteria, with usable partial/failure messaging tested separately.
- **BAC-2:** Root→Generator→Play→Player and independent file import work on the deployed project URL.
- **BAC-3:** Release limits remain484/360; experimental labels remain. Every failure/claim maps to the exact notice/badge in T18/T19, not an ambiguous success message.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\bq0-matrix.test.js"` and the full test/convention commands pass.
- **TAC-2:** Dated raw reports identify every platform, seed, outcome and measurement method; no unmeasured/estimated value is marked measured.
- **TAC-3:** Deployment artifact checks pass, test/qualification source revision matches the released runtime, and no docs/tasks/tests/tools are published.
- **TAC-4:** BQ-0 evidence is a real release prerequisite. A missing device, failed threshold or unverified deployment leaves this task blocked.
- **TAC-5:** Report/task updates use English UTF-8/CRLF and modify no historical design/prototype file.
- **TAC-6:** Screen-reader/axe/layout evidence and the real-browser scaled-watchdog probe pass. Failures return to owners; QA does not rewrite their code.

## Test plan

Execute the acceptance list above and each BQ-0 cell. Inject cancellation, storage failure and a controlled model-too-large fixture outside success statistics. Deduplicate shared PIDs for memory; retain metric methods/proxy labels. Source changes invalidate affected evidence and must be rerun.

## Definition of done & handoff

Record reviewer/product-owner/date sign-off and the deployed revision. T24 may qualify higher limits afterward; T25 is post-MVP. Never lower distinctness, raise budgets, or change bands merely to turn a failing report green.

## Execution log

| Field | Value |
| --- | --- |
| Status | **Blocked** — harnesses, matrix, fixture, tests and reduced evidence complete; BQ-0 NOT passed (failed criteria D1–D3) and reference platforms, screen reader, axe and deployment unavailable. `QUALIFICATION.bq0` left `not-run`. |
| Start | 2026-10-22 22:10:18 (+07:00) |
| End | 2026-10-22 23:32:23 (+07:00) |
| Duration | 1 h 22 min 5 s |
| Model | claude-sonnet-5.5 (sub-agent `T23-bq0-acceptance`, general-purpose); ran alone (no runtime code changed during measurement) |
| Token usage | 152 model calls; 34,227,979 input (33,895,115 cache read), 177,717 output |
| AI credits | 599.87 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** `node --test tests\bq0-matrix.test.js` → 11 pass / 0 fail; `npm run check` OK. Agent run: full `node --test "tests/**/*.test.js"` 714 pass / 0 fail; `npm run test:quick` 704 pass; existing Edge harnesses on HEAD: rendering 15/15, generator-editor 24/24, generator-flow 12/12, player-import 18/18, player-controls 25/25. Source digest identical across Node, Edge and Firefox reports (HEAD `6e91263`).

**Evidence (all under `docs\calibration\`, index `bq-0-latest.md`):**
- Matrix `tools\bench\matrices\bq-0.json`: 43 cells, 940 generation rows; fixture `tests\fixtures\bq-irregular-466.json` (466 cells, connected, 3 holes, asymmetric).
- Node screen (3 seeds/cell, 4 workers, fresh process): 172 rows, 0 errors. Node 20-seed reruns of short cells: irregular 466 Hard 2/20, Expert 9/20, Master 14/20; 6×10 Very Easy 16/20, Easy 18/20.
- Edge 155 (AMD EPYC 7763, 16 threads, 64 GB — not a reference laptop), 10 seeds/cell, 473 rows: T10 within limits everywhere (e.g. 22×22 Hell-3 median 9.7 s / p95 13.4 s; irregular 466 Nightmare median 10.1 s / max 72.2 s); cancel ≤ 7 ms; accounted bytes ≤ 165 MiB; memory API ≤ 143 MiB; whole-Edge OS sample ≤ 794 MiB; no `model-too-large`.
- Firefox 158 (reduced, 3 seeds/cell, heartbeat proxy): 172 rows, max response 29 s.
- Cross-app acceptance harness (Edge): 0 failures (4 items blocked fine-pointer, 3 with emulated `pointer: coarse`). Scaled watchdog probe 5/5: busy workers terminated at 115,278 virtual ms, client returned N-PARTIAL with 1 retained puzzle at 115,680 virtual ms, UI idle.
- Local deployment artifact: `_site` assembled as in `pages.yml`, `stamp-version _site 6e912637` + `check-site --expect-version 6e912637` OK; only `core`, `generator`, `player`, `index.html`, `redirect.js` published; root → generator → player works under `/pentomino/`.

**Acceptance:** BAC-1 **fail** (D1, D2, D3); BAC-2 partial (local OK, deployed URL blocked); BAC-3 not demonstrated (no limit changed; notice wording mapping not checked). TAC-1 pass; TAC-2 pass for reduced runs (methods labelled); TAC-3 pass locally, deployed revision blocked; TAC-4 **blocked**; TAC-5 pass; TAC-6 watchdog + automated acceptance pass, screen reader/axe/narrow-layout diagram match blocked or structural only.

**Defects (details, repro and fix direction in `docs\calibration\release-defects.md`):**
- D1 High (T10; T04/T08 review): irregular 466 Hard/Expert/Master stop with `layouts-not-found` (Node 10%/45%/70% reach ten; same in Edge/Firefox).
- D2 High (T15 with T07/T10/T11 functions): one 57–221 ms main-thread task per run on boards ≥ 360 cells (31/43 Edge cells); profile points at `foldAccept` → `layoutDistance` → `symmetryMaps` and `assemblePack` → `validatePack`.
- D3 High (T10/T04): 6×10 Very Easy completes ten in 80% of Node runs (< 90%); Easy exactly 90%.
- D4 Medium (T14/T15/T21): T21's native Node crash 0xC0000005 not reproduced in 1,467 fresh-process runs; Node-only, no release impact.
- D5 Low (T01/T17/T19): `/favicon.ico` 404 logs a console error on every page.
- D6 Low (T21): bench page loads matrices only through a file chooser; memory API yields no value for short rows.
- D7 Low (T18/T20): player title reads "Normal #1 #1".
- R1 Risk (T10): irregular 466 Nightmare heavy tail (2.3–72.2 s at 10 seeds).

**Blockers (owner steps B1–B8 in `release-defects.md`):** full 20/60-seed runs; reference laptop hardware; Chrome, Mac/Safari, Android and iPhone; NVDA/VoiceOver smoke test; approved axe audit; GitHub Pages deployment and deployed-URL verification; reviewer/product-owner sign-off.

**Handoff:** T24/T25 should not be qualified until D1–D3 are fixed and BQ-0 is rerun in full on real platforms (source changes invalidate evidence). To mark `bq0` pass later, edit only `core\engine\qualification.js` with a passing report link and update the pinned `policy.test.js` assertion in the same commit. Bench page needs a CDP/BiDi file chooser or manual upload to load `bq-0.json`. Edge and Firefox are both available on this machine for cheap harness reruns.

## Execution log — defect fix round 1 (D2, D5, D7, D6 partial; D1/D3 analysed)

| Field | Value |
| --- | --- |
| Status | D2, D5, D7 fixed; D6 partially fixed; D1/D3 root-caused, not changed (needs owner decision); D4/R1 untouched. T23 remains **blocked** (full BQ-0 rerun on reference platforms, devices, screen reader, axe, deployment). |
| Start | 2026-10-22 23:34:11 (+07:00) |
| End | 2026-10-23 00:28:29 (+07:00) |
| Duration | 54 min 18 s |
| Model | claude-sonnet-5.5 (sub-agent `T23-defect-fixes`, general-purpose); ran in parallel with T25 |
| Token usage | 154 model calls; 24,152,489 input (23,911,333 cache read), 104,955 output |
| AI credits | 404.34 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification:** full `node --test "tests/**/*.test.js"` 748 pass / 0 fail; `npm run check` OK; `node tools\record-fixtures.mjs --check` OK. Result digests of 141 re-run Node rows (irr466 Hard, 6×10 Very Easy/Easy, 22×22, Heart 432, 32×15, 18×20, 12×12) identical to T23 → generated output unchanged, no fixture re-record. Headless Edge: generator-flow 12/12, player-import 18/18, player-controls 25/25, acceptance 15 pass + 4 blocked, rendering 15/15, generator-editor 24/24; no console errors or failed requests. Edge bench 20 cells × 3 reps (incl. 22×22, 32×15, irr466, 18×20): `longTasksOver50` = 0 in all rows. `_site` stamp + `check-site --expect-version` OK.

**Per defect:**
- **D2 fixed.** Part was a bench artifact (previous row's `fillRecord` leaked into the next timing window — runner now awaits `uiIdle`). Real cost cut by per-board cached symmetry maps, index-based `symmetries`, typed-array `layoutDistance`, one-pass `minLayoutDistance`, cached `canonicalT`, and sliced pack validation (`validatePackSliced`, macrotask yield per slice). Warm Node: `layoutKey` 4.6 → 0.9 ms; fold at the 9th accepted puzzle 14.8 → 3.7 ms.
- **D5 fixed.** Relative `<link rel="icon">` to shared `core\browser\favicon.svg` on all pages/harnesses (CSP- and prefix-safe).
- **D7 fixed.** `player\puzzle-title.js` `puzzleDisplayName`: a title already ending in `#n` is shown as is.
- **D6 partial.** `tools\bench\index.html?matrix=<path>&auto=matrix` loads a same-origin matrix without the file chooser; memory peak / COOP-COEP untouched.
- **D1/D3 not changed — root cause:** the carved piece sets themselves admit fewer than ten distinct arrangements (irr466 Hard seeds stopping at 4 have exactly 4 reachable layouts — one macro region with alternatives, the rest rigid; 6×10 Very Easy shortfalls have 7–9). Code matches the design; no bug. Options sent to the owner: (1) set-capacity filter in `setAttempt` (reject sets with < 12 distinct layout keys under a bounded LNS probe; serial simulation 20/20 for all failing cells; needs new rule/budget and `ALGO_ID` bump) — recommended; (2) require multiple tilings per macro region at carve time; (3) change irregular-board piece policy; (4) keep design and reword BQ-0 criterion 2 for these cells.

**Issues & resolutions:** a brief `git stash`/`stash pop` touched T25's in-progress files (state restored); pack assembly now yields on timers, so `settle` in `tests\generation-client.test.js` also waits on timers; T25's new `tests\browser\hints.html` lacked the icon link (added by orchestrator in the T25 commit). Details appended to `docs\calibration\release-defects.md` ("Fix round 1").

## Execution log — owner decisions 2026-10-23 (fix round 2)

| Field | Value |
| --- | --- |
| Status | Implemented. Owner decisions: (1) when a piece set has fewer distinct arrangements than requested, show the proven maximum (e.g. "Found 6/6 arrangements") and treat it as a complete outcome; (2) keep `APP_VERSION = '1.0.0'` for both Generator and Player (never released). T23 remains **blocked** on full-matrix/reference-platform evidence, devices, screen reader, axe and deployment (owner chose not to push, so Pages cannot deploy). |
| Start | 2026-10-23 06:46:40 (+07:00) |
| End | 2026-10-23 07:28:37 (+07:00) |
| Duration | 41 min 57 s |
| Model | claude-sonnet-5.5 (sub-agent `owner-decisions-fix2`, general-purpose) |
| Token usage | 174 model calls; 42,213,901 input (41,808,306 cache read), 158,312 output |
| AI credits | 677.78 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** full `node --test "tests/**/*.test.js"` → 783 pass / 0 fail; `npm run check` OK; `node tools\record-fixtures.mjs --check` OK (no re-record, no `ALGO_ID` change). Agent: all 100 re-run Node rows have identical result digests and accepted counts to T23; headless Edge 156 — generator-flow 13/13 (new 7×5 Easy "demo" proven-maximum flow), player-import 18/18, player-controls 25/25, hints 10/10, acceptance 15 pass + 4 blocked, generator-editor and rendering green; 0 console errors / failed requests.

**Implementation:** new `core\engine\enumerate.js` (first-empty-cell backtracking enumerator of distinct, symmetry-reduced layout keys, cross-checked against DLX) exposed as worker task `enumerateLayouts` (`protocol.js`, `tasks.js`) with separate `ENUMERATION` limits in `policy.js` (`BUDGETS` unchanged); `generation-client.js` runs it after `layouts-not-found` and adds `result.arrangements`; generator notices in `jobs.js`/`strings.js`/`ui\progress.js`; CLI `tools\generate.mjs`; bench criterion 2 counts a proven-maximum run as complete (`report.js`, `runner.js`, `app.js`, `calibrate.mjs`); `PLAYER_VERSION` removed, player footer uses `APP_VERSION`.

**Wording:** proven, none used before — "Found 6/6 arrangements, the most this piece set allows. Generate a new piece set for more {level} puzzles." (info; **Generate new piece set** stays available); proven with earlier use — "Found 2/2 remaining arrangements (6 in total), …"; proven, none left — "This piece set has no arrangements left: all 6 have been used. …"; unused arrangement exists but yielded no puzzle — warning "This piece set has more arrangements, but none gave another … puzzle in the search."; not proven — "…; no more were found. This piece set may allow only a few different arrangements …". CLI: `generate: found 6/6 arrangements, the most this piece set allows (complete)` exits 0; other shortfalls exit 2.

**Before → after (Node, 20 seeds, criterion 2 = ten puzzles or a proven maximum):** irr466 Hard 2/20 → 20/20; Expert 9/20 → 18/20 (exactly 90%); Master 14/20 → 18/20 (exactly 90%); 6×10 Very Easy 16/20 → 19/20; Easy 18/20 → 20/20. 41 shortfalls: 36 proven maxima, 5 "more arrangements exist", 0 unproven by cap. Enumeration cost: Hard median 217 ms / max 816 ms; Expert 412 ms / 6.3 s; Master 2.2 s / 7.4 s; 6×10 < 130 ms; max response 8.6 s. Edge subset (27 rows, hand-picked shortfall seeds + 22×22 Hard): no long task > 50 ms; cancel 0.7–3.6 ms; 22×22 Hard 10/10, T10 438–666 ms. Reports: `docs\calibration\bq-2026-10-23-0-fix2-*`.

**Issues & resolutions:** the first DLX-based count was correct but unbounded in wall time (Master seed 3: 16.8 s; a row cap cannot bound it) → replaced by a bounded backtracker (worst ~9 s before "unproven" on this machine). Expert/Master sit exactly at 90% (seed-list sensitive). Landscape criterion 1 (`calibration-reference.js`) left unchanged (decision names BQ criterion 2 only). Progress v2 format kept; the reader still accepts v1. ~50 orphan Edge processes left by `taskkill /T` were stopped by PID.

**Open questions (sent to owner):** (1) add a completion pass that tries remaining enumerated arrangements as candidates (would turn most of the 5 "more" cases into puzzles; needs determinism/fixture review); (2) is a worst-case ~9 s unproven-count wait (CPU-dependent) acceptable, or lower the placement cap? Still to re-run before any gate change: full 43-cell BQ-0 on every platform and the D8 cells (irregular 558/658, ≥ 20 seeds).

## Execution log — completion pass (fix round 3, owner-approved 2026-10-23)

| Field | Value |
| --- | --- |
| Status | Implemented. Owner approved the completion pass and kept the enumeration wait (~9 s worst case). All former "more arrangements" shortfalls now end at a proven maximum. T23 remains **blocked** on full 43-cell BQ-0 on reference platforms/devices, D8 re-run, screen reader, axe and deployment (not pushed). |
| Start | 2026-10-23 07:36:41 (+07:00) |
| End | 2026-10-23 08:06:25 (+07:00) |
| Duration | 29 min 44 s |
| Model | claude-sonnet-5.5 (sub-agent `completion-pass-fix3`, general-purpose) |
| Token usage | 132 model calls; 23,989,659 input (23,709,479 cache read), 111,821 output |
| AI credits | 418.95 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** full `node --test "tests/**/*.test.js"` → 799 pass / 0 fail; `npm run check` OK; `node tools\record-fixtures.mjs --check` OK (no re-record). Agent: headless Edge 156 — generator-flow 13/13, player-controls 25/25, acceptance 15 pass + 4 blocked, generator-editor 24/24, hints 10/10, player-import 18/18, rendering 15/15; no console errors or failed requests.

**How it works:** after `layouts-not-found`, `enumerateLayouts` (new `collect` mode, `ENUMERATION.collect = 32`; placement/node limits unchanged) returns up to 32 unused arrangements sorted by layout key; new worker task `completionCandidate` runs each through the same clue selection, band, uniqueness and strict key rules with an RNG derived from the batch seed and the layout key; the client consumes results strictly in key order (pool-width/answer-order independent); cancel and the 115 s watchdog keep the accepted prefix. New warning `N-LAYOUTS-UNUSED` for an arrangement with no in-band clue set.

**Determinism:** all 59 batches that already reached ten are byte-for-byte unchanged (same result digests as fix round 2); all 41 shortfalls keep their earlier puzzles as an exact prefix; no fixture affected; `ALGO_ID` not bumped (only extends previously short batches; app never released).

**Before → after (Node, 20 seeds; criterion 2 = ten puzzles or a proven maximum):** irr466 Hard 20/20 → 20/20; Expert 18/20 → 20/20; Master 18/20 → 20/20; 6×10 Very Easy 19/20 → 20/20; Easy 20/20 → 20/20 (strict ten unchanged: 2, 9, 14, 16, 18 of 20). Remaining "more" cases 0; unproven 0; no measured arrangement lacked an in-band clue set. Pass adds 9–145 ms; max response unchanged (~8.4 s). Edge (12 rows: 5 former "more" seeds, 3 × 22×22 Hard, cancel probes): 0 long tasks > 50 ms; 22×22 Hard 10/10, T10 540–865 ms. Reports: `docs\calibration\bq-2026-10-23-0-fix3-*`.

**Issues:** the `N-LAYOUTS-UNUSED` path is covered only by scripted tests and a faulted-worker CLI test (never occurred naturally); the fold's distance preference does not apply inside the pass (key distinctness remains strict). Questions sent to owner: bump `ALGO_ID` (would require re-recording fixtures)? accept the 32-candidate cap?
