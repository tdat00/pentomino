# T21 — Production-engine performance and calibration harnesses

**ID:** T21  
**Depends on:** T15, T16  
**Estimated size:** 1,100–1,500 implementation/test lines; reuse one runner for BQ and landscape  
**Owner role:** qa / infra  
**Milestone:** MVP tooling
**Design refs:** §7.5–§7.8, §8.7, §13.4, §15/I3; D42.

## Goal & business context

Board limits must be supported by measurements of the actual implementation, not a prototype or an optimistic conversion factor. Produce comparable Node/browser evidence and truthful success statistics.

## Scope

**In scope:** one matrix/report schema, Node runner, unattended browser page, resource/responsiveness/cancel telemetry, the §7.8 calibration landscape and gate calculations.  
**Out of scope:** declaring BQ gates passed, changing limits, using design prototypes, or creating another engine.

## Inputs & context

Reuse T15’s generation client, T14’s pool/dispatcher, the Node worker adapter, T11 pack validation and T16 previews. Browser uses four module workers; Node uses four worker_threads. No algorithm may be duplicated inside a benchmark.

Matrix schema:

```ts
type BenchCase={id:string;boardRows:string[];rotation:number;levelId:string;
 maxActive:number;quantity:10;uniqueness:'any';seedPrefix:string;repetitions:number;
 seeds?:string[]};
type BenchMatrix={version:1;profile:'smoke'|'landscape'|'BQ-0'|'BQ-1'|'BQ-2'|'BQ-3';
 cases:BenchCase[]};
```

Seed text is `${seedPrefix}/${caseId}/${rep}`, or the explicit `seeds[rep]` when provided (length must equal repetitions); store it verbatim and validate it with `normalizeSeedText`. The smoke case uses the recorded successful T10 recipe through this override. Check every case’s area, side≤32 and offered level before execution. A benchmark may supply the **candidate cap being qualified** to generation validation; it never changes production qualification flags.

Per-run report:

```ts
{caseId,seed,sourceCommit,sourceDigest,versions,platform,browserOrNode,workerCount,
 startedAt,firstReadyMs:number|null,tenthReadyMs:number|null,responseMs,
 acceptedCount,partialReason,peakAccountedBytes,peakProcessBytes:number|null,
 ratingSaturatedCount,certificates:{unique,multiple,notProved,notChecked},
 certificatesSettledMs:number|null,maxModelRows,maxModelNodes,
 mainTaskMethod:'longtask-api'|'heartbeat'|'not-applicable',
 maxMainTaskMs:number|null,longTasksOver50:number|null,
 cancelLatencyMs:number|null,probeKind:'generation'|'cancel'|'scaled-watchdog',
 renderingEnabled:boolean,measurementValid:boolean,measurementNotes:string[],errors:[]}
```

- T1 starts at the Generate Piece Set click and ends at validated set/calibration readiness.
- T10 starts at the same click and includes immediate New Puzzles(10), ending at the tenth accepted puzzle.
- Lazy proof checks do not delay T10; report their settling time separately.
- Include request/pool startup and worker replacement; identify warm/cold lifecycle explicitly.
- Record partial/failed runs, not just successes. T10 conditional percentiles must be labeled as conditional and accompanied by all-run completion rates.
- Median is the usual middle value/average of two; p95 is nearest-rank `ceil(.95*n)`. Empty completion samples have null percentiles, not zero.
- Qualification checks: complete-ten rate≥90%; at-least-one≥99%; successful T10 median≤60,000 ms/p95≤115,000 ms; every response≤120,000 ms; real peak memory≤1.5 GiB; no model-too-large; no main-thread task>50 ms except rendering; Cancel<200 ms.
- Byte accounting logs actual allocated main/scratch/cache buffers from every worker plus known UI buffers; UI throttling must not hide allocation peaks.
- Node `--max-old-space-size=2048` is not a total RSS limit. Record whole-process RSS including workers and exact bytes. Fresh-process-per-run mode isolates retained history; do not multiply the same PID’s RSS four times.
- Browser memory API is optional and needs cross-origin isolation. Otherwise collect task-manager/about:memory evidence and deduplicate shared process measurements.
- Node planning factors are estimates only: `5s+4×Node` conservative laptop; they never enable a BQ flag.

### Criterion-4 measurement

- Browser runs keep thumbnails off and report `renderingEnabled:false`; full-preview UX checks are separate in T23.
- Install observers before a run and clear per-run accumulators. Use `PerformanceObserver` type `longtask` when supported: record maximum observed duration (0 when none) and count durations>50 ms overlapping the run.
- Otherwise schedule a `MessageChannel` heartbeat every10 ms. Record delay beyond the scheduled delivery time as `maxMainTaskMs`, method `heartbeat`, and count proxy delays>50 ms. This is explicitly a proxy, not a measured JavaScript task duration.
- Keep the tab foreground. Visibility loss, unsupported instrumentation or missing data marks the measurement invalid; never convert missing values to zero/pass. Node reports method not-applicable and null browser-only fields.
- Run one extra cancel probe per matrix cell, separate from completion statistics. At the first accepted puzzle, trigger Cancel through its click handler on the next main-thread turn, allowing normal dispatch to occur. Measure from that handler to worker-task promises settled/UI idle; preserve the accepted prefix. Record `cancelLatencyMs` and require<200 ms.
- Keep cancel, scaled-watchdog and ordinary generation rows distinct. Flush pending observer records without adding that flush delay to the recorded T10.

### Production-engine calibration landscape

Add `--profile landscape` to the same runner; no second generator. Build cases from every reference-table row below: use the explicit measured board when given, otherwise a deterministic board at the row's upper area. Use the closest-to-square factor pair with sides≤32; if no such rectangle exists, start with a square/rectangle≤32 and block rightmost cells of the final row while preserving connectivity. Store the exact rows.

Deduplicate boards, then run **every offered level at each board**, at least20 fixed seeds, quantity10, uniqueness any, four Node workers. Use D41 batch index1. This covers measured and n/m rows, not only BQ smoke cases.

After each timed set+batch run, sample distinct clue counts from shares `.05,.10,.25,.40,.55,.70,.85`, plus1, K−2 and the level's initial G. For each count, use two seeded subsets of the validated witness and run canonical rating; use labels `landscape/<case>/<rep>/g/<G>/<sample>`. Record all profiles, including out-of-band ones, to avoid measuring only accepted outcomes.

Reports include score distributions by U and area; request and sampled-profile in-band rates; K/size/G distributions; saturation share; profile latency (clearly labeled worker-execution or RPC latency); and proof outcomes. Store diagnostic samples separately as `{A,K,G,U,score,inBand,saturated,branchTrials,rowTrials,ratingMs,certificateStatus}`. Main per-run certificate counts describe accepted puzzles only. Close the timed-generation interval before diagnostic/profile/certificate sampling.

Calibration acceptance:

1. For each offered board/level, ≥90% of requests complete ten strictly distinct, in-band puzzles within the action budgets.
2. Every observed K obeys the exact policy/histogram. Its reference-row range must agree within the design's ±1-piece calibration tolerance; do not relax the actual generator rule.
3. Compare maximum Node T10 with2× the measured Node maximum below on the stated reference case. Flag a failed comparison; n/m forecasts are not timing acceptance bounds. The explicitly mismatched K28 reference is not automatically comparable and requires a reviewed new baseline.
4. Report new-pipeline/historical differences honestly. Do not pad layouts, alter bands or refresh a reference merely to pass. An unmet measured-row criterion is a calibration blocker pending optimization or an explicitly approved baseline correction.

Output: `docs\calibration\landscape-<date>.json/.md` plus a resumable per-run checkpoint. Resume only with matching code digest/versions/matrix; never pool incompatible revisions. This unattended sweep may be lengthy; incomplete cells remain incomplete.

Create tools with exact commands:

```text
node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\smoke.json --workers 4 --fresh-process --output docs\calibration\node-smoke
node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --output docs\calibration\landscape
node tools\serve.mjs --port 8080 --prefix /pentomino/
```

Browser page: `http://localhost:8080/pentomino/tools/bench/`, matrix picker, Start/Cancel, progress and report downloads. Every browser-loaded module uses `.js`, including shared runner/report modules; Node may import those `.js` modules through package type=module. Node entry tools alone retain `.mjs`. Use external modules/CSP and no remote service. Reports are UTF-8/CRLF. Later tasks supply BQ matrices; smoke uses the successful10×6/Hard recipe and a Heart case.

The Node adapter must report failures even if a child exits or a watchdog terminates it. Use actual production limits: 5,000 branch/50,000 rating rows, 3,000/5,000 LNS rows, 115/120 s action deadlines, 160/32/32 MiB workspace/scratch/cache per worker, ≤600k rows and≤5M nonzeros.

## Files to create/modify

`tools\calibrate.mjs`, `tools\bench\index.html`, `tools\bench\app.js`, `tools\bench\bench.css`, `tools\bench\runner.js`, `tools\bench\report.js`, `tools\bench\responsiveness.js`, `tools\bench\calibration-reference.js`, `tools\bench\matrices\smoke.json`; `tests\benchmark-report.test.js`, `tests\benchmark-matrix.test.js`, `tests\calibration.test.js`.

## Implementation steps

1. Implement matrix validation and one reusable case runner with injected host adapters.
2. Add timing, byte, long-task/heartbeat, cancel and certificate collection with explicit method/validity labels.
3. Add Node fresh-process mode and browser controls/downloads.
4. Add smoke matrices and interruption/resource-error handling.
5. Implement the landscape matrix/profile sampler, exact reference data and resumable report aggregation; document all denominators and conditional percentiles.

## Acceptance criteria — Business

- **BAC-1:** A reviewer can see how many requested puzzles actually completed, not a misleading fast partial result.
- **BAC-2:** Cancel retains completed measurements and marks the interrupted run accurately.
- **BAC-3:** A report clearly distinguishes measured browser results, Node results and planning estimates.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\benchmark-report.test.js" "tests\benchmark-matrix.test.js" "tests\calibration.test.js"` passes.
- **TAC-2:** The exact Node smoke command above writes valid reports; the browser smoke runs the same semantic seeds/results.
- **TAC-3:** Synthetic reports test thresholds, empty samples, missing browser measurements, heartbeat-proxy labels, cancel-probe exclusion, not-checked counts, and ≥99% first-puzzle rates.
- **TAC-4:** Every displayed accepted puzzle passes pack/layout validation; no clue-only variant is counted as ten.
- **TAC-5:** `node tools\check-conventions.mjs` passes. No prototype imports, external dependencies, runtime eval or hidden node-budget changes.
- **TAC-6:** The landscape command records every required cell/profile and satisfies the calibration acceptance above; no n/m forecast is mislabeled measured, and no unmeasured cell is silently skipped.

## Test plan

Use fake data/clocks for statistics, delayed heartbeat deliveries, long-task records and cancel timing. Real browser smoke uses correct `.js` MIME types from T01's server. Check landscape row selection, offered-level filtering, K bounds, reference compatibility and resume rejection on changed digests. Simulate worker crash/deadline/model-too-large; no real-time assertions enter core unit tests.

## Definition of done & handoff

T23/T24 use this harness unchanged to produce actual BQ evidence. Do not mark any limit qualified from smoke or Node-only results.

## Inlined calibration reference — design §7.5

W×H below means columns×rows. K/sizes/G0 are unions over the area band; verify the exact policy at the selected board. Node numbers are historical measured maxima unless `n/m`; browser plan is derived, not measured. Do not consult a prototype to fill this table.

| Level | Areas | K | Sizes | G0 | Reference board; Node max s | Browser plan s |
|---|---|---|---|---|---|---|
| very-easy | 30–80 | 5–7 | 3–18 | 3–4 | 6×10;0.2 | 6 |
| very-easy | 81–87 | 7 | 6–19 | 4 | n/m≈0.3 | ≈6 |
| easy | 32–80 | 6–9 | 3–18 | 3–5 | 6×10;0.1 | 5 |
| easy | 81–130 | 7–10 | 5–22 | 4–5 | 10×10;0.3 | 6 |
| easy | 131–200 | 9–11 | 7–28 | 5–6 | 12×12;0.3 | 6 |
| easy | 201–215 | 11 | 10–30 | 6 | n/m≈0.7 | ≈8 |
| normal | 36–80 | 7–10 | 3–15 | 3–5 | 6×10;2.6 | 15 |
| normal | 81–130 | 8–11 | 4–20 | 4–5 | 10×10;0.8 | 8 |
| normal | 131–200 | 10–13 | 6–28 | 5–6 | 12×12;0.9 | 9 |
| normal | 201–300 | 11–14 | 9–35 | 5–6 | 16×16;0.7 | 8 |
| normal | 301–348 | 14–15 | 12–38 | 6–7 | 18×18;0.7 | 8 |
| hard | 41–80 | 8–12 | 3–12 | 3–5 | 6×10;2.4 | 15 |
| hard | 81–130 | 10–13 | 4–17 | 4–5 | 10×10;1.0 | 9 |
| hard | 131–200 | 12–15 | 6–24 | 5–6 | 12×12;1.6 | 11 |
| hard | 201–300 | 13–17 | 8–31 | 5–6 | n/m≈0.7 | ≈8 |
| hard | 301–420 | 15–18 | 10–40 | 6–7 | 18×20;1.8 | 12 |
| hard | 421–484 | 16–19 | 13–43 | 6–7 | 22×22;1.2 | 10 |
| hard | 485–576 | 17–20 | 15–48 | 6–8 | n/m≈4.7 | ≈24 |
| hard | 577–676 | 19–21 | 17–51 | 7–8 | 26×26;4.7 | 24 |
| expert | 50–80 | 10–13 | 3–11 | 3–4 | 6×10;1.1 | 9 |
| expert | 81–130 | 12–15 | 3–15 | 4–5 | 10×10;15.1 | 65 |
| expert | 131–200 | 13–17 | 5–20 | 4–5 | 14×14;2.8 | 16 |
| expert | 201–300 | 15–19 | 7–27 | 5–6 | n/m≈0.7 | ≈8 |
| expert | 301–420 | 17–21 | 9–34 | 5–6 | n/m≈1.8 | ≈12 |
| expert | 421–484 | 19–22 | 12–39 | 6–7 | n/m≈1.2 | ≈10 |
| expert | 485–576 | 19–23 | 13–44 | 6–7 | n/m≈4.7 | ≈24 |
| expert | 577–676 | 20–24 | 15–49 | 6–7 | 26×26,K28;1.2 — outside current count policy | 10 |
| master | 59–80 | 12–15 | 3–10 | 3 | 6×10;0.9 | 9 |
| master | 81–130 | 13–17 | 3–13 | 3–4 | 10×10;4.0 | 21 |
| master | 131–200 | 15–19 | 4–18 | 3–4 | 12×12;3.6 | 19 |
| master | 201–300 | 17–22 | 6–24 | 4–5 | 16×16;4.7 | 24 |
| master | 301–420 | 19–24 | 8–30 | 4–5 | 18×20;9.3 | 42 |
| master | 421–484 | 21–25 | 10–33 | 5 | 22×22;1.4 | 11 |
| master | 485–576 | 22–26 | 11–38 | 5–6 | n/m≈3.1 | ≈17 |
| master | 577–676 | 23–27 | 13–43 | 5–6 | 26×26;3.1 | 17 |
| nightmare | 81–130 | 16–21 | 3–11 | 2–3 | 10×10;2.5 | 15 |
| nightmare | 131–200 | 19–24 | 3–15 | 3 | 12×12;29.8 | 124 |
| nightmare | 201–300 | 21–27 | 5–20 | 3–4 | 16×16;11.2 | 50 |
| nightmare | 301–420 | 24–29 | 6–25 | 3–4 | 18×20;10.2 | 46 |
| nightmare | 421–484 | 26–30 | 8–27 | 4 | n/m≈10 | ≈45 |
| nightmare | 485–576 | 27–32 | 9–31 | 4 | n/m≈10 | ≈45 |
| nightmare | 577–676 | 28–33 | 10–35 | 4–5 | n/m≈10 | ≈45 |
| hell-1 | 164–200 | 30–36 | 3–10 | 3–4 | 14×14;8.3 | 38 |
| hell-1 | 201–300 | 32–40 | 3–13 | 3–4 | 16×16;17.9 | 77 |
| hell-1 | 301–420 | 35–42 | 4–17 | 4 | 18×18;12.0 (K41 replay7.6) | 53 |
| hell-1 | 421–484 | 39–42 | 6–19 | 4 | 22×22;28.1 (K41 replay18.9) | 87 lazy estimate |
| hell-1 | 485–576 | 39–42 | 6–23 | 4 | 24×24;38.4 | 109 lazy estimate |
| hell-1 | 577–676 | 39–42 | 8–26 | 4 | 26×26;48.6,one seed | 153 lazy estimate |
| hell-2 | 266–300 | 46–53 | 3–10 | 3 | n/m≈11 | ≈49 |
| hell-2 | 301–420 | 47–58 | 3–13 | 3 | 20×20;13.7 | 60 |
| hell-2 | 421–484 | 52–61 | 4–14 | 3–4 | 22×22;8.3 | 38 |
| hell-2 | 485–576 | 54–62 | 4–16 | 3–4 | 24×24;15.2 | 66 |
| hell-2 | 577–676 | 57–62 | 5–18 | 3–4 | 26×26;25.6 | 107 |
| hell-3 | 450–484 | 71–80 | 3–11 | 3 | 22×22 /32×15;15.9 | 69 |
| hell-3 | 485–576 | 73–86 | 3–12 | 3 | 24×24;23.6 | 99 |
| hell-3 | 577–676 | 76–90 | 4–13 | 3–4 | 26×26;11.5 | 51 |

Historical notes: eager certificates and clue variants contributed to old timings; the final strict pipeline must be measured anew. The original Hell-3 reference also included40×12, now excluded by side32; do not put that board into a valid-input calibration/BQ matrix. Lazy-certificate browser figures are estimates, not timed runs.

## Execution log

| Field | Value |
| --- | --- |
| Status | **Partial** — harnesses, tests, Node and browser smoke runs complete; TAC-6 full landscape sweep (multi-hour, 105 cells) only partially measured (12 of 105 cells) |
| Start | 2026-10-22 21:19:21 (+07:00) |
| End | 2026-10-22 22:08:46 (+07:00) |
| Duration | 49 min 25 s |
| Model | claude-sonnet-5.5 (sub-agent `T21-perf-harness`, general-purpose); ran in parallel with T18, T19, T20 |
| Token usage | 125 model calls; 30,206,088 input (29,860,569 cache read), 216,498 output |
| AI credits | 601.47 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** `node --test tests\benchmark-report.test.js tests\benchmark-matrix.test.js tests\calibration.test.js` → 60 pass / 0 fail; `npm run check` OK; `node tools\check-site.mjs . --entry tools/bench/index.html` OK. Agent run: `npm run test:quick` 693 pass.

**Measured evidence (committed under `docs\calibration\`):**
- Node smoke (`--matrix tools\bench\matrices\smoke.json --workers 4 --fresh-process`): exit 0, 5 rows, 10/10 puzzles in every ordinary run, T10 288–567 ms, cancel latency 5–6 ms, peak process memory ~160–200 MiB (`node-smoke.md/.json`).
- Browser smoke (headless Edge, `tools\bench\?auto=smoke`): same source digest and semantic result digest as Node for every row; recorded recipe matches the T10 fixture; cancel via the real button 1.6–3.2 ms; no long tasks > 50 ms; peak memory `null` (page not cross-origin isolated) → verdict `incomplete-evidence` (`browser-smoke.json`).
- Landscape slice (`--cases '^(6x10|10x10)-'`, 20 seeds, 240 runs, 2,962 profile samples): 12/105 cells measured, 93 listed as NOT RUN (`landscape-slice-2026-10-22.md`; the 2 MB raw JSON stays in git-ignored `tests\artifacts`). 6×10 very-easy completes ten puzzles in 65% of runs and easy in 85% (below the 90% criterion); T10 max exceeds 2× the historical Node maximum on three reference rows (very-easy 6×10 0.56 s vs 0.4 s, easy 6×10 0.68 s vs 0.2 s, nightmare 10×10 5.5 s vs 5.0 s — the historical numbers likely exclude worker start-up, which T10 here includes per spec). Observed K matched policy everywhere measured; policy K agrees with all 56 reference rows within ±1.

**Acceptance:** BAC-1..3 pass; TAC-1..5 pass; **TAC-6 partial** (all 105 cells across 16 boards enumerated; unmeasured cells listed, not skipped; full sweep blocked here by multi-hour runtime; forecast-only rows labelled).

**Issues & resolutions:**
- **Open defect (for T23):** a native Node crash (exit 0xC0000005) in ~2–5% of fresh 4-worker processes; reproduces with `tools\generate.mjs` (2/80), not with 1 worker (0/100), not in long in-process loops (150 runs). Likely a first-run/multi-worker issue in the T14/T15 Node worker path or in Node itself. Not mitigated; crash rows are recorded as `error:child-exit` and lower the measured completion rates.
- Additional CLI options: `--lifecycle warm`, `--cases <regex>`, `--no-cancel-probe`, `--watchdog-scale N` (scaled-watchdog row overhead is amplified and noted).
- Landscape reports get a date suffix (`<output>-<date>.json/.md`); checkpoint name is stable; resume is automatic on matching checkpoint, mismatch exits 1 unless `--restart`.
- Browser memory needs cross-origin isolation (COOP/COEP) or a hand-recorded task-manager peak.
- Shared-file edits: `.gitignore` (+`docs/calibration/*.checkpoint.jsonl`), `README.md` harness commands.
- Remaining work to complete TAC-6: run `node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --output docs\calibration\landscape` unattended (hours, resumable).

**Handoff (T23/T24):** `tools\calibrate.mjs` → `run`, `parseArgs`, `loadMatrix`, `createNodeHost`, `runInChild`, `readCheckpoint`, `reportBase`, `readSource`. Browser page `tools\bench\` (`?auto=smoke`, `?commit=<sha>`; `window.__bench.reportJson()`). `runner.js` → `validateMatrix`/`checkMatrix`, `planRuns`, `runCase`, `runMatrix`, `validateAccepted`, `modelSize`, `scaledClock`, `seedFor` (injected `Host`; add BQ matrices as `BenchMatrix` JSON). `report.js` → `evaluateCell`, `buildReport`, `renderMarkdown`, `reportJson`/`toCrlf`, `computeSourceDigest` (never says "qualified"; only `meets-all-criteria` for a complete browser cell). `calibration-reference.js` → 56-row reference table, `buildLandscapeMatrix`, `aggregateLandscape`, `checkSetPolicy`.
