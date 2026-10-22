# Review of the implementation task pack (architect-2)

**Reviewer:** architect-1 · **Date:** 2026-10-22
**Scope:** `tasks\init-design\01…25-*.md` and `check-list.md`, checked against the signed-off `7-design-detail.md` (the contract) and `7-design-brief.md`.
**Method:**
- compared every inlined contract section by section: signatures, constants, formulas, notice texts, shortcuts, BQ matrices;
- analysed dependencies and waves;
- ran three local probes (appendix).

Task files were not edited; architect-2 applies the fixes.

---

## 1. Verdict

**Approve with fixes. There are no blockers.**

The pack is very faithful to the detail. It inlines all of these correctly:
- constants, formulas, notice texts, badges and shortcuts;
- availability intervals, budgets and BQ matrices;
- the S7-01…S7-06 sign-off fixes.

Its §5 "contract clarifications" close real seams: a frozen request-start history, one action clock, a typed `GenerationError` and a reset command.

Seven **major** issues should be fixed before hand-off:
- **Runtime behaviour.** Two change it: speculation order (T9-01) and batch seeds (T9-02).
- **BQ gate.** Two make it unmeasurable as written: bench MIME types (T9-03) and the missing criterion-4 fields (T9-04).
- **Unassigned work.** One design acceptance criterion has no owner: the §7.8 calibration sweep (T9-05).
- **Layouts.** The agreed screen layouts are not inlined (T9-06).
- **Scope.** T22 is too broad (T9-07).

The 17 minor issues are clarity and consistency fixes.

| Severity | Blocker | Major | Minor |
|---|---|---|---|
| Count | 0 | 7 | 17 |

## 2. Coverage

**Checked and consistent (no action):**
- **Notices:** all 16 IDs and texts (§10.7 → T17 + T18).
- **Badges:** "Checking… / Unique solution ✓ / Several solutions / Uniqueness not proved / Uniqueness not checked" (§6.11 → T18).
- **Keyboard:** the shortcut table (§11.6 → T20, T22).
- **Score and levels:** the score, band edges and caps (§7.2–7.3 → T04, T09); availability intervals and examples such as 60 → VE–Master and 360 → Hard–Hell-2 (§7.5 → T04, T17, T23); K anchors, including 360/Hell-1 37–42 (§6.4 → T04, BA-09).
- **Budgets and workers:** budgets and memory 160/32/32 MiB plus 300 MiB (§8.3, §8.5); pool `min(4, hardwareConcurrency || 4)`, recycling, the 115/120 s watchdog, `verifyRows` 2,000,000.
- **BQ matrices:** sides ≤ 32, Hell-3 only at ≥ 450 cells, BQ-1/2 desktop-only, Heart-432/363 stop at Hell-2.
- **S7 fixes:** S7-02 editor `includeBlocked`, S7-03 `bestDistance`, S7-04 fresh partition state, S7-06 independent Labels/Patterns.
- **Interaction:** drag thresholds 6/10 px, touch lift 1.25 cells, rotation kicks, history 500/50 entries, debounce 250/300 ms.
- **Hand-off:** share-code limits (350,000 chars / 256 KiB / 16,000 URL / 4,000 warning) and storage keys and limits.

| Design section | Tasks | Status |
|---|---|---|
| §3 layout, runtime, tech | T01, T14, T15 | ✓ New modules (`types.js`, `placements.js`, `tasks.js`, `qualification.js`, `generation-client.js`, `hints.js`) are acceptable; list them (T9-22) |
| §4 module APIs | T02–T16 | ✓ |
| §5 pack, validation, versioning, metadata, progress | T07, T11, T12, T13 | ✓ |
| §6.1–6.3 geometry, board, display rotation | T03, T05, T16, T17, T20 | ✓ |
| §6.4–6.8 policy, carving, DLX, LNS, keys | T04, T06–T08, T10 | ✓ (RNG labels: T9-09) |
| §6.9 batch fold and speculation | T10, T15 | Partial (T9-01, T9-02) |
| §6.10–6.11 clues, certificates | T09, T15, T18 | ✓ |
| §7.1–7.7 score, levels, availability | T04, T09 | ✓ |
| §7.8, §13.4 calibration | — | **Gap** (T9-05) |
| §8.1–8.6 workers, budgets, memory, seeds | T02, T04, T06, T14, T15 | ✓ |
| §8.7 BQ | T21, T23, T24 | Partial (T9-03, T9-04) |
| §9 hand-off, import, storage, security | T11, T12, T18, T19 | ✓ |
| §10 generator UI | T17, T18 | Partial (T9-02, T9-06, T9-08) |
| §11.1–11.12 player UI | T13, T16, T19, T20 | Partial (T9-06, T9-13, T9-14) |
| §11.13 hints | T25 | ✓ |
| §12 deployment | T01, T22, T23 | ✓ (T9-16) |
| §13.1–13.2 unit suites | T02–T13 | ✓ |
| §13.3 browser checklist | T22, T23 | Partial: #6 screen reader (T9-14), #14 real deadline (T9-21) |
| §14 edge cases #1–#19 | various | ✓ (spot-checked) |
| §15 I0–I8 | T01–T25 | ✓ except the I3 calibrate criterion (T9-05), the I5 Heart-10 and 22×22 Hell-3 flows (T9-21) and the I7 axe check (T9-14) |

**Uncovered optional items, fine to defer:**
- §7.7 "Re-rate" action;
- the §13.4 nightly regression subset;
- I8 Playwright and playtests.

## 3. Issues

### Major

| ID | Task / section | Problem | Fix |
|---|---|---|---|
| T9-01 | T15 "Scheduling" step 6; T10 last paragraph | Speculation runs in "deterministic (slot,attempt) order", which is lexicographic: up to four attempts of the *current* slot run at once. §6.9 requires "first attempt 0 of upcoming slots, then retries of the current slot". When most slots succeed at attempt 0, three of the four workers are wasted, making T10 about 2–4× slower. That threatens the 60 s target and BQ-0. Results are unaffected. | Inline this priority, keeping ≤ poolSize tasks in flight: (1) the attempt the fold is waiting for; (2) attempt 0 of each later unfilled slot, ascending; (3) further attempts of the current slot; (4) further attempts of later slots. Cache results by (slot, attempt) and consume them in fold order. Later-slot candidates stay valid because they use the frozen request-start history. Test with a fake pool where every attempt 0 is accepted: q = 10 must finish in 3 dispatch rounds, not 10. |
| T9-02 | T17 seed controls; T18 `generateBatch` call; T15 metadata | Nothing says where `batchSeed` comes from or what "Keep seed" does. The detail also omits this (my gap in §10.3/§5.5). An implementer who reuses the set seed as `batchSeed` replays the same candidate stream on every New Puzzles. The second batch then finds almost only seen layouts and ends `layouts-not-found`. | Define the rules. **Generate Piece Set** uses the visible seed if 🔒 Keep seed is on; otherwise it first draws a fresh random seed (T02 format). 🎲 draws a new seed immediately. Each New Puzzles or Add more increments `batchIndex` (stored with the set; 1 = first batch) and uses `batchSeed = setSeed + "#" + batchIndex`. This seed is internal and exempt from the 64-code-point UI limit. Record setSeed, batchSeed and batchIndex in metadata. Test that two consecutive batches use different seeds and both return new layouts, and that a new session with the same seed and empty history reproduces batch 1. Add a row to check-list §5. |
| T9-03 | T21 bench files and serve command; serve commands in T16–T24 | T21 makes `tools\bench\runner.mjs` and `report.mjs` the one reusable runner for both Node and the browser bench page, and serves the page with `python -m http.server 8080`. On this machine Python 3.14.7 serves `.mjs` as `Content-type: text/plain` (a Windows registry mapping; verified). Browsers refuse module scripts with a non-JavaScript MIME type. T21 TAC-2, T23 and T24 therefore fail as written. | Add a zero-dependency `tools\serve.mjs`: an explicit MIME map (`.js`/`.mjs` → `text/javascript`, plus html, css, json, svg, png), `--port`, and an optional `--prefix /pentomino/` to emulate Pages (§12.7). Use it in every task and README command. At minimum, give every browser-loaded module the `.js` extension. |
| T9-04 | T21 per-run report and qualification checks; T23/T24 criterion 4 | BQ criterion 4 (no non-rendering main-thread task > 50 ms; Cancel < 200 ms) has no report field and no measurement method. The Long Tasks API exists only in Chromium, so Firefox and Safari cells cannot be judged. `certificates` also lacks a "not checked" count. | Add `maxMainTaskMs`, `longTasksOver50`, `mainTaskMethod: 'longtask-api' \| 'heartbeat'`, `cancelLatencyMs` and `certificates.notChecked`. Measure with `PerformanceObserver('longtask')` where supported; elsewhere use a `MessageChannel` heartbeat and report the maximum delay as a proxy. Keep thumbnails off during runs. Add one cancel probe per case at a fixed point (the first accepted puzzle), timed from the click handler to the settled state. |
| T9-05 | Coverage of §7.8, §13.4 and §15 I3; T21; check-list | No task runs the calibration sweep. §7.8 asks, for every offered (board, level): the score landscape by U and area, the in-band hit rate, the saturated share, the rating cost and certificate outcomes. §15 I3 adds "`calibrate.mjs` reproduces §7.5 within ± 1 piece and its Node times within 2×". T21's `calibrate.mjs` runs only BQ timing matrices (smoke: 10×6 Hard and a Heart). Several §7.5 rows are n/m (not measured) and would never be checked. | Add a `landscape` profile to T21, or a new task T21b. Run one board per §7.5 row × every offered level, ≥ 20 seeds, q = 10, `any`, in Node with 4 workers. Acceptance per §7.8: ≥ 90 % of requests complete 10 in-band puzzles, K lies within the row's range ± 1, and Node T10 ≤ 2× the row's time where measured. Write output to `docs\calibration\landscape-*`. Inline the §7.5 table as reference data, and add a TA row. |
| T9-06 | T17/T18 (generator), T19/T20 (player) | The agreed layouts (§10.1, §11.1) are not inlined, and the pack forbids consulting the prototype, so implementers have no layout reference. Missing or misplaced items: (a) the puzzles row's own level selector, which defaults to the set's level (§10.5); (b) 🔗 Copy pack link; (c) the board status line "{active} / {max} playable squares · connected"; (d) the player top-bar order; (e) the selection toolbar "Selected: F [⟲][⟳][⇋][⇵][Place][↩ to tray] … N pieces left"; (f) Straighten, which T19 puts in the View menu but §11.1 makes a top-bar toggle. | Paste the two ASCII layouts plus an inventory of their elements into T17/T18 and T19/T20. Add a BA row: "screen layout matches §10.1/§11.1 on desktop and below 900 px". |
| T9-07 | T22 scope and size | T22 bundles four kinds of work: a tokenizer-based stamper, site checks and workflow wiring; cross-app accessibility and responsive fixes "in owned app/browser files" (in practice T17–T20's files, unbounded); the README; and multi-browser and device acceptance. That is too much for one session, and it edits other tasks' files. | Split it. **T22a**, release tooling (stamper, check-site, workflow, `site-tools` tests), depends only on T01 and can run in an early wave. **T22b**, cross-app accessibility and acceptance (a harness plus a defect report), sends fixes back to the owning tasks. **T22c** writes the README. |

### Minor

| ID | Task / section | Problem → fix |
|---|---|---|
| T9-08 | T18 notices | The notice table has no triggers. Map them: `time-limit` → N-PARTIAL; `layouts-not-found` → N-FEWLAYOUTS; `difficulty-not-found` → N-SETLEVEL; `uniqueness-not-proved` → N-UNIQUE; set `failed` → N-NOSET; `GenerationError('model-too-large')` → N-TOOLARGE; `history-full` → the reset prompt. Show **Generate new piece set** for both `layouts-not-found` and `difficulty-not-found` (§10.5); BAC-4 covers only the latter. |
| T9-09 | T08 API; T10 "set attempts" | Inline the §6.5 `setAttempt` pseudo-code. Stream `set/j` draws K; then `derive('macro')`, `derive('flat')` and `derive('cal')`. Each restart i uses `derive('r'+i)` (§6.7). Export `carveFlatSet(board, K, rng, budgets)` (≤ 6 `planSizes` tries) from T08; today the budget list only implies it. |
| T9-10 | T15 puzzle conversion | `title = level + ' #' + slot` repeats titles after Add more. Number titles by position in the visible batch instead. |
| T9-11 | T17 storage DTO | `largeBoards` is stored both in `gen:state` and in prefs (T12). Keep it in prefs only (§9.6, §10.2). |
| T9-12 | T15 CLI | The CLI has no area cap (Node has no device class). Add `--max-active`, default 676 (the generation ceiling), and keep rejecting sides > 32. |
| T9-13 | T19 | Three items are missing: (1) with no hash and an empty library, open the Import screen offering the Sample (§11.12); (2) library entries can be deleted or exported again; (3) the player's badge texts, including the claimed/verified marking (§6.11), are not listed. |
| T9-14 | T20, T22 | Missing items: `role="application"` with `aria-describedby` instructions; the accessible-name formats "Piece F, 5 cells, in tray" and "…on board at row 3, column 5" (§11.11); axis arrows next to the ghost on rotated boards (§6.3); the 200 ms shake (§11.5); the win celebration unless reduced motion (§11.8); a screen-reader smoke test (§13.3 #6); and I7 "no critical axe findings", run manually from devtools or an extension so the repo gains no dependency. |
| T9-15 | check-list dependencies | T19 does not use T15: drop that dependency, which moves T19 to wave 10. T25 → T24 puts post-MVP work behind a hardware-bound gate, while §15 calls I7b independent. Make T25 depend on T23, and add the rule "no engine, worker or client changes merged while a BQ run is in progress". |
| T9-16 | T01 `.gitattributes` / `.editorconfig` | Their content is not specified. Ubuntu CI checks files out with LF unless `eol=crlf` is set, while `check-conventions` rejects LF-only files. Specify `* text=auto eol=crlf` and `*.png binary`, and an editorconfig: utf-8, crlf, 2-space indent, final newline, trim trailing whitespace except in `*.md`. |
| T9-17 | T01 types vs T15 | T01's `BatchResult{puzzles}` differs from T15's batch result `{accepted, pack?, seenLayouts, seenClues}`; align them or drop one. Also enumerate the `SetAttemptResult` failure reasons: `carve`, `internal`, `not-in-band`, `uniqueness-not-proved`. |
| T9-18 | T24 fixtures | "Bottom-right 2×3" is ambiguous. Give explicit ranges as T23 does: 558 cells → x22..23 / y21..23; 658 cells → x24..25 / y23..25. |
| T9-19 | T25 TAC-2 | Puzzle example-1 in the fixture also has J as a clue. State "T11 fixture board and pieces with clues = [A] only". The scenario itself is correct (appendix). |
| T9-20 | T16 BAC-1, T19 BAC-2, T22 BAC-3 | Three criteria are subjective ("looks like a heart", "clear messages", "understandable"). Make them objective: at 45° the notch points up and the bottom-left cell is lowest (§6.2); list the exact message strings; map each claim to its notice or badge. |
| T9-21 | T22/T23 vs §13.3 #14, §15 I5 | Two checks are missing: (1) a watchdog test in a real browser; (2) the I5 flows (Heart N = 10 and 22×22 Hell-3 → 10 puzzles → Play). T18 BAC-1 covers only the default board with 5 puzzles. Add both. For the watchdog, use a bench-only scaled clock injected through T14's `clock`; production `TIME` stays unchanged. |
| T9-22 | check-list §1, §3, §5 | The check-list says "design section references provide traceability", yet no task cites a § (grep finds 0). Add a "Design refs" line to each task header and a § column to the BA table. List the added modules in §5, plus `node-worker.mjs` and `record-fixtures.mjs`. State the pack's notation: "W×H = columns×rows" (the UI says rows × columns). |
| T9-23 | T02 vector table | Typo in "ac19d7fd,1f47dc98,**0x**444f9bb4,bbb91ffa": drop the stray `0x`. |
| T9-24 | T10 size and critical path | T10 bundles discovery (`randomTiling`, LNS), set attempts, the fold and fixture recording, all on the critical path. Split it: **T10a**, discovery in `tiling.js`, depends only on T07 and can run in wave 7 next to T08/T09; **T10b** covers `generate.js` and the fixtures. |

## 4. Positive notes

- **Self-contained constants.** The pack includes:
  - the SHA-256 and xoshiro vectors;
  - every `BUDGETS`/`LIMITS` value;
  - band edges, availability intervals and K anchors;
  - notices, badges and shortcuts;
  - the BQ matrices.

  An implementer rarely needs the design itself.
- **Determinism seams closed well:**
  - the frozen request-start history (1 and 4 workers give the same output);
  - lowest-successful-attempt selection;
  - one action clock (`beginRequest`/`endRequest`);
  - a typed `GenerationError` that keeps the accepted prefix;
  - a reset command union;
  - the `history-full` pre-flight check;
  - clocks kept out of the engine.
- **Honest evidence rules:**
  - Node never qualifies a gate, and a missing device means "blocked";
  - nearest-rank p95 and conditional percentiles are defined;
  - failed runs never count as fast successes.
- **Reproducible fixtures:**
  - the exact asymmetric 466-cell mask;
  - record-fixtures `--create` / `--check` / `--replace`;
  - "success" fixtures that fail when every attempt fails.
- **Complete task headers:** every task has business and technical acceptance criteria, file ownership and handoff notes.
- **Dependencies:** there are no cycles, and the waves match the declared dependencies.

## Appendix: probes

1. **Test commands (Node v24.21, Windows).** These forms all work:
   - quoted single files with backslashes (`node --test "tests\a.test.js"`);
   - several files in one command;
   - the quoted forward glob `"tests/**/*.test.js"` (the form CI uses);
   - `--test-skip-pattern=slow`.

   Only a bare directory (`node --test tests`) fails, and the pack never uses it. The `tests\browser\*.js` harnesses do not match `*.test.js`, so Node never picks them up.
2. **MIME types (Python 3.14.7 `http.server`, this machine).** `HEAD /a.mjs` returns `Content-type: text/plain`; `HEAD /b.js` returns `application/javascript` (supports T9-03).
3. **T25 regression scenario.** A clue at (0,0) occupies (1,0); B at turn 1, x 1, y 0 occupies (3,0), (1,1), (2,1), (3,1), (4,1), (2,2) and (4,2).
   - Cell (2,0) is therefore enclosed by A and B, so the position is unsatisfiable.
   - E–J never touch (2,0), so removing any one of them keeps it enclosed.
   - Removing B restores the stored solution.

   The helper must therefore blame B, not J, which matches A.9.
