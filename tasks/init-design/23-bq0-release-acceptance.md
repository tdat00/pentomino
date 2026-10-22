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
