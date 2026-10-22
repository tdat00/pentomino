# Initial implementation — task index and overall acceptance

**Location:** repository-root `tasks\init-design\`  
**Source of truth:** final signed-off `docs\init-design\7-design-detail.md` and `7-design-brief.md`  
**Scope:** production implementation, not the parallel static prototype  
**Status:** implementation not started by this documentation task

These task files contain the contracts needed by their implementers; design section references provide traceability, not missing instructions. Do not consult or modify `docs\init-design\prototype\`. Do not silently substitute an earlier design, prototype algorithm, score or quota.

## 1. Task index and execution order

Task numbers are topologically ordered, not a demand to run every task serially. A task starts only after its listed prerequisites are accepted. Status boxes mean the **implementation** is accepted, not merely that this task document exists.

| Done | ID | File / task | Depends on | Owner |
|---|---|---|---|---|
| [ ] | T01 | [Repository scaffold, contracts and Pages](01-repo-scaffold-contracts-and-pages.md) | — | infra |
| [ ] | T02 | [Hashing and seeded randomness](02-hashing-and-seeded-randomness.md) | T01 | core |
| [ ] | T03 | [Polyomino geometry and outlines](03-polyomino-geometry-and-outlines.md) | T01 | core |
| [ ] | T04 | [Generation policy and levels](04-generation-policy-and-levels.md) | T02 | core |
| [ ] | T05 | [Board, presets, view math and palette](05-board-presets-view-math-and-palette.md) | T03,T04 | core |
| [ ] | T06 | [Packed workspaces and DLX](06-packed-workspaces-and-dlx.md) | T02,T03,T05 | core |
| [ ] | T07 | [Tiling models and puzzle identities](07-tiling-models-and-puzzle-identities.md) | T02,T03,T05,T06 | core |
| [ ] | T08 | [Flat and macro carving](08-flat-and-macro-piece-set-carving.md) | T02,T03,T04,T05,T07 | core |
| [ ] | T09 | [Difficulty, clues and certificates](09-difficulty-clues-and-certificates.md) | T02,T04,T07 | core |
| [ ] | T10 | [Discovery and deterministic batches](10-layout-discovery-and-deterministic-batches.md) | T08,T09 | core |
| [ ] | T11 | [Pack format and validation](11-puzzle-pack-format-and-validation.md) | T02,T03,T05,T07 | core |
| [ ] | T12 | [Sharing, storage and Play hand-off](12-sharing-storage-and-play-handoff.md) | T07,T11 | core/browser |
| [ ] | T13 | [Player state and undo](13-player-game-state-and-undo.md) | T05,T07,T11 | core |
| [ ] | T14 | [Workers, protocol and watchdogs](14-worker-protocol-pool-and-watchdogs.md) | T06,T09,T10,T11 | core/infra |
| [ ] | T15 | [Generation client and CLI](15-generation-client-and-headless-cli.md) | T10,T11,T14 | core/infra |
| [ ] | T16 | [SVG and pointer primitives](16-shared-svg-rendering-and-pointer-primitives.md) | T03,T05,T12 | UI |
| [ ] | T17 | [Generator editor and settings](17-generator-board-editor-and-settings.md) | T04,T05,T12,T16 | generator-ui |
| [ ] | T18 | [Generator jobs, cards and imports](18-generator-jobs-results-and-import.md) | T15,T17 | generator-ui |
| [ ] | T19 | [Player loading/library/shell](19-player-import-library-and-shell.md) | T12,T13,T14,T16 | player-ui |
| [ ] | T20 | [Player controls/save/win](20-player-controls-progress-and-completion.md) | T13,T16,T19 | player-ui |
| [ ] | T21 | [Performance/calibration harnesses](21-performance-and-calibration-harnesses.md) | T15,T16 | qa/infra |
| [ ] | T22 | [Release tooling and README](22-release-tooling-and-readme.md) | T01 | infra |
| [ ] | T23 | [Cross-app acceptance, BQ-0 and release](23-bq0-release-acceptance.md) | T18,T20,T21,T22 | qa/release |
| [ ] | T24 | [BQ-1/BQ-2/BQ-3 qualification](24-bq1-bq3-limit-qualification.md) | T23 | qa/core |
| [ ] | T25 | [Post-MVP proven hints/reveal](25-post-mvp-proven-hints-and-reveal.md) | T23 | player-ui/core |

### Ready waves

| Wave | Tasks that may run in parallel |
|---:|---|
| 1 | T01 |
| 2 | T02, T03, T22 |
| 3 | T04 |
| 4 | T05 |
| 5 | T06 |
| 6 | T07 |
| 7 | T08, T09, T11 |
| 8 | T10, T12, T13 |
| 9 | T14, T16 |
| 10 | T15, T17, T19 |
| 11 | T18, T20, T21 |
| 12 | T23 |
| 13 | T24, T25 (subject to the measurement lock below) |

Parallel agents own disjoint implementation files. Shared contract edits need one designated owner; they are not permission to change another agent’s files concurrently. T10 extends `tiling.js` only after T07. T18 extends the generator shell only after T17; T20 extends the player shell only after T19.

**Milestones:** first release requires T01–T23 and BQ-0. T24 is post-release qualification; failed higher gates retain fallbacks. T25 is post-MVP and depends on T23, not hardware-bound T24. Full completion includes both; MVP sign-off records them as deferred.

**Measurement lock:** no engine, worker or client change may be merged or alter files served by an active BQ run. T24/T25 may otherwise proceed independently. Use an immutable project-local runtime snapshot or serialize only the conflicting edits/run. QA writes harnesses/reports and reopens defects with the owning T16–T20 task; it does not edit those owners' UI files.

## 2. Shared working conventions

- All documents, UI strings and handoff notes in this task pack are English.
- New/modified production and task text: UTF-8 without BOM, CRLF, final newline; two-space indentation; no trailing whitespace except two-space Markdown hard breaks. Do not reformat unrelated historical documents.
- Runtime: ES2022 native ES modules, `// @ts-check` and JSDoc, no mandatory build, no runtime dependencies/CDN/remote solver.
- Node≥22; `node:test`/`node:assert/strict`. Full command:

  ```text
  node --test "tests/**/*.test.js"
  node tools\check-conventions.mjs
  ```

- Small targeted suites run first; a task’s BAC/TAC must have evidence, not assertions that “it looks fine.”
- Correctness uses seeds/work limits, not timing thresholds. Real timing/memory gates run in T23/T24.
- Keep filesystem references Windows-style; URL/module specifiers and Node’s quoted glob use their standard forward-slash syntax.
- Board notation **W×H means columns×rows** throughout this pack; UI controls label Columns and Rows explicitly. Counts depend on active area, not display orientation.
- Serve with `node tools\serve.mjs --port 8080 --prefix /pentomino/` and open `http://localhost:8080/pentomino/`. All browser page/worker modules use `.js`; `.mjs` is Node-only.
- No eval/new Function/untrusted HTML; no inline script/handler/style attributes. Use external modules, textContent, CSSOM/classes and safe SVG attributes.
- No prototype imports/copying. No state-changing Git action, push, Pages setting change or remote test upload without the orchestrator’s authorization.
- Do not claim unavailable Safari/mobile/BQ evidence. Record a blocker; keep gates disabled.
- Keep scratch/test outputs in designated project artifact paths and clean only outputs you created; no OS temporary directories.

## 3. Business acceptance and requirement traceability

Each row must be signed off against the final implementation. The task IDs identify where the requirement is implemented and tested.

| Done | ID | Observable acceptance | Implementing tasks | Design refs |
|---|---|---|---|---|
| [ ] | BA-01 | Independent static Generator/Player share core, without accounts or runtime service. | T01,T12,T18,T19,T22 | §1.1,§3 |
| [ ] | BA-02 | Actual Pages root redirects to generator; relative modules/workers load under `/pentomino/`. | T01,T22,T23 | §12 |
| [ ] | BA-03 | Labeled dimensions, active count and minimum30/side32/connectivity/device-cap errors are correct. | T04,T05,T17 | §6.2,§10.2 |
| [ ] | BA-04 | Paint/block/unblock, undo/reset/resize/trim work; structural edits warn and old puzzles remain usable. | T05,T16,T17,T18 | §6.3,§10.2,§10.6 |
| [ ] | BA-05 | 45°/90° display changes never alter logical cells, score, seeds, poses, keys or progress identity. | T05,T07,T09,T16,T17,T20 | §6.3,D1–D6 |
| [ ] | BA-06 | Heart10 has75 cells (rounded73), blocked top-right quarter, notch up at45°CCW; all presets match. | T05,T16,T17 | §6.2–§6.3 |
| [ ] | BA-07 | Very Easy–Hell-n use final bands and gap-free area windows; disabled levels explain why. | T04,T09,T17,T18 | §7.4–§7.5 |
| [ ] | BA-08 | One score `round(2U+8log10(1+B_eff))`;5000/50000 work saturation is not time or uniqueness. | T04,T06,T09,T10 | §7.1–§7.3 |
| [ ] | BA-09 | K anchors:60/Easy7–8,60/Master12–13,360/Hard16–18,H1 37–42,484/H3 73–80; histograms feasible. | T04,T08,T17,T18 | §6.4,§7.5 |
| [ ] | BA-10 | Generated shapes≥3 cells, connected/hole-free/free-distinct; total area exactly covers the mask. | T03,T04,T08,T10 | §6.1,§6.4–§6.5 |
| [ ] | BA-11 | μ≥4.5, proportional window,≤floor(.4K) size3–4 pieces and catalogue limits; large pieces allowed. | T04,T08 | §6.4 |
| [ ] | BA-12 | Colors, labels beyond Z and independent patterns identify pieces; clues remain locked/hatched. | T05,T16,T19,T20,T23 | §11.9 |
| [ ] | BA-13 | Ready requires validated witness and an in-band calibration; seeds reproduce semantic attempts. | T02,T08,T09,T10,T15,T18 | §6.5,§8.6 |
| [ ] | BA-14 | Requests1–10 keep the set and require both new layout and clue keys; no clue-only padding. | T07,T10,T15,T18 | §6.8–§6.9 |
| [ ] | BA-15 | Seeded clues satisfy1≤G≤K−2; shares guide search, score decides; player clues never move. | T09,T13,T18,T20 | §6.10,§7.4,§11.2 |
| [ ] | BA-16 | Partial/error notices map to real reasons; both layout/difficulty shortfalls offer a new set. | T09,T10,T14,T15,T18 | §6.9,§10.5,§10.7 |
| [ ] | BA-17 | Play, portable/local links and file transfer preserve the right puzzle across pages/profiles. | T11,T12,T18,T19,T22,T23 | §9.1–§9.4 |
| [ ] | BA-18 | Hash/file/drop/paste/Recent/Sample work independently; bad input preserves the game. | T11,T12,T19 | §9.4–§9.5,§11.12 |
| [ ] | BA-19 | Mouse/touch/keyboard moves and screen transforms preserve handles at rotated/scrolled/zoomed views. | T05,T13,T16,T20 | §6.3,§11.3–§11.7 |
| [ ] | BA-20 | Every legal complete cover wins, including non-witness answers; no overlap/blocked coverage. | T07,T13,T20 | §11.8 |
| [ ] | BA-21 | Undo/redo/reset, Continue/Restart and saved progress work; storage failure does not block play. | T12,T13,T19,T20 | §5.6,§9.6,§11.10 |
| [ ] | BA-22 | Estimated ratings and all pending/claimed/verified proof states use the exact badge mapping. | T09,T11,T14,T18,T19 | §6.11,§7.6,§9.5 |
| [ ] | BA-23 | Require mode accepts only raw exhaustive uniqueness; large Hell is experimental, cutoff not unsat. | T07,T09,T14,T18,T19 | §6.6,§6.11 |
| [ ] | BA-24 | ≤4 workers;60 s target,115 s dispatch stop,120 s response; Cancel retains completed results. | T06,T14,T15,T21,T23,T24 | §8.1–§8.4 |
| [ ] | BA-25 | Planned2 GB/actual BQ≤1.5 GiB, guarded workspaces and safe resource failures are demonstrated. | T06,T07,T14,T21,T23,T24 | §8.5,§8.7 |
| [ ] | BA-26 | Launch484/360, qualified576/484, opt-in676 experimental until BQ-2; side32 and no generation above676. | T04,T05,T17,T23,T24 | §6.2,§8.7,D36/D40 |
| [ ] | BA-27 | Area changes level availability; display rotation does not; an existing set may need replacement for another level. | T04,T09,T17,T18 | §7.5,§10.5,§10.7 |
| [ ] | BA-28 | Exact geometry/clues, not public ID or symmetry, identify saved progress; invalid moves are dropped. | T07,T12,T13,T19 | §5.6 |
| [ ] | BA-29 | Keyboard, real screen-reader smoke, contrast,≥44 px touch targets, focus/announcements and motion preferences pass. | T16,T17,T19,T20,T23 | §11.11,§13.3 |
| [ ] | BA-30 | Post-MVP hints use proof; reveal is not an earned win and old progress migrates safely. | T25 | §11.13,§15/I8 |
| [ ] | BA-31 | Desktop/narrow layouts match the inlined diagrams, including puzzle-level selector, Copy pack link, status line, top-bar Straighten and selection toolbar. | T16,T17,T18,T19,T20,T23 | §10.1,§10.5,§11.1 |
| [ ] | BA-32 | Keep seed keeps text; every batch increments index and uses setSeed#index; regenerated same set resets history/index and replays #1. Add more continues titles. | T02,T10,T15,T17,T18 | §5.5,§8.6,§10.3,§10.5,D41 |

## 4. Technical acceptance

### Core and integration

- [ ] **TA-01 — Complete test suite:** `node --test "tests/**/*.test.js"` passes on Node22+; slow goldens run in CI. T01,T23.
- [ ] **TA-02 — Hash/RNG:** independent SHA oracle, exact seed/state vectors, Unicode normalization, rejection sampling and label-derived streams. T02.
- [ ] **TA-03 — Geometry:** D4 algebra, numeric canonicalization, symmetric orientation deduplication, holes/outlines and catalogue enumeration. T03.
- [ ] **TA-04 — Board/view/palette:** preset counts, active-frame symmetry, mask validation, all angle/flip/arrow cases and label/color/pattern boundaries. T05.
- [ ] **TA-05 — Solver memory/correctness:** count-before-allocation, arena reuse, abort restoration, branch/row counters, tiny oracle and classic counts8/1472/4040/9356. T06,T07.
- [ ] **TA-06 — Policy:** exact count/level anchors, all availability boundaries and nonempty ranges over30–676, independent histogram DP, no stale historical slack/size rule. T04.
- [ ] **TA-07 — Generation:** independent witness validation, global distinctness/quotas, rollback after failed macro partitions, bounded seeded successes, strict fold and best-distance fallback. T08–T10.
- [ ] **TA-08 — Evidence semantics:** finite saturated ratings, actual counters separate, raw uniqueness proof, no certificate on ordinary acceptance, honest cutoff outcomes. T09,T14.
- [ ] **TA-09 — Wire format:** exact version/rules, bounded JSON/metadata, answer omission, nonstandard imports, safe claims, fixture round trips. T11.
- [ ] **TA-10 — Sharing/storage:** both codecs and missing-codec behavior, streaming decompression limit, correct prefix URLs, namespace/LRU/quota handling and no foreign-key mutation. T12.
- [ ] **TA-11 — Player rules:** transactional moves, moving-piece exclusion, immutable clues, alternate wins, history/reset and restored-progress validation. T13,T20.
- [ ] **TA-12 — Worker scheduling:** all task promises settle; stale IDs/revisions ignored; one action deadline across RPCs; lower-index acceptance; pool1/4 output identity; cancellation/recycling and idle priorities. T14,T15.
- [ ] **TA-13 — UI integration:** same parser/rules, no main-thread solver/console errors/preview mutation, exact notice mapping and zero critical local axe findings. Owners T16–T20; acceptance T23.

### Deployment, security and conventions

- [ ] **TA-14:** `node tools\check-conventions.mjs` passes; UTF-8/no BOM/CRLF and final newlines in owned authored files; no unrelated reformatting. T01,T22.
- [ ] **TA-15:** No runtime packages/CDN/remote solver, eval/new Function, inline scripts/handlers, untrusted innerHTML or user-controlled CSS; CSP remains effective. T01,T11,T12,T22.
- [ ] **TA-16:** `stamp-version` changes the staged copy only; imports/workers/CSS assets are consistently versioned and source bytes unchanged. T22.
- [ ] **TA-17:** `check-site _site` passes; artifacts contain only root entry points and core/generator/player. `tasks`, docs, tests, tools and workflow files are excluded. T01,T22,T23.
- [ ] **TA-18:** Actual Pages workflow/deployment verified at `https://tdat00.github.io/pentomino/`; root redirect, both apps and worker succeed under the prefix without console/CSP/network errors. T23.
- [ ] **TA-19:** README gives exact serve/test/CLI commands, control/help information, limits, claim semantics and storage/sharing caveats. T22.

### Qualification evidence

Record each gate’s actual outcome; estimates, missing platforms and old prototype measurements never count as a pass.

| Gate | Status: not run / blocked / fail / pass | Report path / tested revision | Product state required |
|---|---|---|---|
| BQ-0 | __________ | __________ | Must pass before first release at484 desktop/360 phone |
| BQ-1 | __________ | __________ | Normal desktop stays484 until pass; then576 |
| BQ-2 | __________ | __________ |676 remains opt-in; experimental label removed only on pass |
| BQ-3 | __________ | __________ | Phone stays360 until pass; then484 |

- [ ] **TA-20:** Harness uses the production engine and identical semantic seeds; Node/browser reports separate T1, T10, certificates, completion rates, bytes and actual memory. T21.
- [ ] **TA-21:** BQ-0 matrix/platforms, all success/performance thresholds and raw data are accepted; no unavailable level or40-cell side is accidentally tested. T23.
- [ ] **TA-22:** BQ-1/2/3 are executed and reviewed for full task-pack completion. Failed gates retain fallbacks; unavailable hardware stays blocked. They do not block the initial release already accepted by BQ-0. T24.
- [ ] **TA-23:** Runtime source is frozen during qualification. Changes are tied to source commit/digests; changed behavior is re-tested. Node estimates do not enable a gate. T23,T24.
- [ ] **TA-24:** Post-MVP hints/progress migration pass proof-based, cancellation, accessibility and reveal-status tests without altering generation semantics. T25.
- [ ] **TA-25 — Calibration:** T21's landscape covers every reference row/selected board and offered level,≥20 seeds/q10; records U/area distributions, hit rates, saturation, cost and certificates;≥90% strict in-band completion, exact policy K and documented2× measured-reference checks.
- [ ] **TA-26 — Serving/modules:** T01's Node server sends explicit MIME types at `/pentomino/`; browser graphs use `.js` only. No Python registry dependency. T01,T21,T22,T23.
- [ ] **TA-27 — Responsiveness evidence:** BQ reports include longtask/heartbeat method, maximum/count, not-checked certificates and separate per-cell Cancel latency; missing measurements never pass. T21,T23,T24.
- [ ] **TA-28 — Browser watchdog/flows:** real-browser scaled-clock115/120 wiring test retains a prefix; Heart N10/Master and22×22/Hell-3 each complete10 and Play in recorded success flows. T18,T23.

## 5. Contract clarifications made by this task pack

These complete underspecified implementation seams; they do not change settled game/score/limit rules.

| Gap | Resolution / owner |
|---|---|
| Task folder differs from historical layout examples | This pack is under root `tasks\init-design\`, per the latest user correction; do not move/edit the signed-off design files. |
| Several request/fold/action/browser callback types were named but undefined | T01 establishes shared primitives and semantic requests. Owning modules export their detailed local types; T14 wire DTOs are separate from injected engine workspaces; T16/T17/T19 define render/store hooks. |
| Pool API did not expose the logical-action boundary | T14 adds compatible beginRequest/endRequest methods so115/120 s spans all RPCs, not each RPC separately. |
| Resource/transport faults did not fit the four ordinary partial reasons | T15 preserves accepted results in a typed GenerationError and lets the UI render the actual fault; no false difficulty or time reason. |
| Speculation could capture timing-dependent seen-key snapshots | Freeze initial history after calibration reuse; fold mutations remain local. Candidate outputs never depend on worker completion timing. T10,T15. |
| Speculation priority was underspecified | Awaited attempt, then later-slot attempt0, then current/later retries; cache and consume only fold order. Ten immediate successes use three pool4 rounds. |
| Set/batch seed controls lacked a sequence rule | D41 is explicit in T02/T10/T15/T17/T18: every request advances index; Keep seed replays by regenerating the set, never by duplicating a batch on grown history. |
| Solver model did not retain clues/order for complete witnesses | T07 retains copied clues and canonical piece order; wrappers return full layouts. |
| Runtime nulls, wire omission and legacy claims differed | T11 normalizes absent nullable fields, omits them on writing and never transports runtime verification trust. Legacy/foreign well-typed model claims are not executable game rules. |
| A reset affects multiple pieces; timer/counter semantics were incomplete | T13 uses a reset command snapshot. Browser owns elapsed time/save timestamps; undo does not rewind elapsed time or erase the effort counter. Replay is fresh. |
| Generator metadata was opaque yet macro hints were reused | Player preserves it as data; generator separately validates recognized hints, otherwise uses flat LNS. Valid but operationally unsupported imports remain playable/exportable. T11,T18. |
| Card Play needed an href before asynchronous encoding/navigation | T12 supplies preparePlayerLink; T18 exposes a real validated anchor, with stale-encoding checks and truthful local-only fallback. |
| App storage helpers and cumulative Add-more limits were implicit | T12 freezes concrete library/progress/preferences APIs. T11/T18 enforce output byte/count limits and preserve overflow results in a separate valid pack. |
| BQ irregular masks/report schema/source identity were not fixed | T21 defines reporting; T23/T24 provide exact asymmetric masks, matrix construction and candidate-cap handling. |
| Qualification flags had no module-level representation | T04 supplies QUALIFICATION status/report records; T23/T24 change only the appropriate gate on real evidence. |
| Post-MVP reveal status and saved schema were incomplete | T25 separates geometric completion from earned/revealed status and migrates local progress v1→v2; puzzle-pack format remains v1. |

### Added implementation modules/adapters

These names complete the design's seams without adding a second engine:

- T01: `core\engine\types.js`, `tools\serve.mjs`, `tools\check-conventions.mjs`.
- T04: `core\engine\qualification.js`.
- T06: `core\engine\placements.js`.
- T10: `tools\record-fixtures.mjs`.
- T14: `core\engine\tasks.js`.
- T15: `core\browser\generation-client.js`, `tools\node-worker.mjs`.
- T21: `tools\bench\runner.js`, `report.js`, `responsiveness.js`, `calibration-reference.js`.
- T25: `core\engine\hints.js`.

Node-only tools keep `.mjs`; every browser-loaded helper is `.js`. The landscape reference table is inlined in T21; no task needs to research or run an older prototype.

Do not resolve a discovered contradiction by silently changing the settled score, board rotation meaning, strict distinctness, public format, or enabled limits. Record the blocker and a proposed compatible resolution for the orchestrator.

## 6. Evidence and sign-off

Every completed task handoff records:

1. changed paths and public contract additions;
2. exact commands and pass/fail output summary;
3. business/manual scenarios and expected versus actual behavior;
4. browser/device/source revision for relevant evidence;
5. blockers, skipped checks and intentionally deferred gates.

| Sign-off | Person/role | Date | Runtime commit/digest | Evidence / exceptions |
|---|---|---|---|---|
| Core correctness | __________ | __________ | __________ | __________ |
| Generator business acceptance | __________ | __________ | __________ | __________ |
| Player business acceptance | __________ | __________ | __________ | __________ |
| Accessibility/responsive/security | __________ | __________ | __________ | __________ |
| BQ-0 and release | __________ | __________ | __________ | __________ |
| Product-owner MVP acceptance | __________ | __________ | __________ | T24/T25 status explicitly recorded |
| BQ-1/BQ-2/BQ-3 outcomes | __________ | __________ | __________ | __________ |
| Post-MVP / full task-pack acceptance | __________ | __________ | __________ | __________ |

No checkbox is pre-accepted merely because the design was signed off. Final acceptance requires the implemented behavior and its evidence.
