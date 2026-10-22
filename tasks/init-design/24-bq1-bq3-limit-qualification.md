# T24 — Higher-limit browser qualification and controlled enablement

**ID:** T24  
**Depends on:** T23  
**Estimated size:** 300–900 config/test/report lines plus unattended browser runs  
**Owner role:** qa / core  
**Milestone:** Post-release qualification; not required to ship initial defaults
**Design refs:** §6.2, §8.7/BQ-1/BQ-2/BQ-3, §15/I7b.

## Goal & business context

Raise normal desktop/phone limits or remove the experimental label only when the final engine passes the specified browser tests.

## Scope

**In scope:** BQ-1/BQ-2/BQ-3 matrices, reports, gate updates and safe fallback verification.  
**Out of scope:** automatic elevation from Node timings, unrelated score/rule changes, or claiming all boards succeed because reference boards passed.

## Inputs & context

Existing state: desktop484; phone360; desktop opt-in up to676, experimental. Side limit32; active minimum30. On passing:

| Gate | Change | Platforms and matrix |
|---|---|---|
| BQ-1 | Normal desktop576 | Desktop Chromium/Firefox/Safari:24×24,32×18, irregular558 below × Hard, Master, Nightmare, Hell-1, Hell-2, Hell-3 |
| BQ-2 | Remove experimental label above normal limit;676 remains opt-in | Desktop only:26×26,32×21, irregular658 below × the same six levels |
| BQ-3 | Phone484 | Android Chrome and iPhone Safari:Heart N22 at45° (363) × Hard, Nightmare, Hell-1, Hell-2;22×22 and irregular466 × those plus Hell-3 |

Fixtures:

- Irregular558:24×24 full; block x0..2/y0..2, x22..23/y21..23, and `(7,6),(17,16),(5,19)`:18 blocked,558 active.
- Irregular658:26×26 full; block x0..2/y0..2, x24..25/y23..25, and `(7,6),(19,18),(5,21)`:18 blocked,658 active.
- Irregular466 is T23’s fixture:22×22 minus the analogous corner blocks and `(7,6),(15,14),(5,17)`.

All fixtures must remain one connected active component. Only test offered levels. In particular, Heart363 never receives Hell-3. Tests use the **candidate cap**, not production fallback caps, without changing those fallback flags before results pass.

Fixture JSON is `{rows:string[]}`; copy rows into each BenchCase’s `boardRows`. Update `QUALIFICATION.bqN={status,report}` in the T04 gate module; only status pass permits its predefined limit/label change.

For every browser/cell: ≥20 seeds (≥60 Hell-1 at the largest area), quantity10, any-valid mode, same seeds across platforms:

- T10 median≤60 s, p95≤115 s; response≤120 s on every run;
- complete-ten≥90%, at-least-one≥99%;
- actual browser peak≤1.5 GiB; allocated bytes within300 MiB main plus four160/32/32 MiB workspaces/scratch/cache; no model-too-large;
- non-rendering main tasks≤50 ms; Cancel<200 ms.

Reports must include T21's `mainTaskMethod`, `maxMainTaskMs`, `longTasksOver50`, `cancelLatencyMs`, and certificates.notChecked. Long-task API where supported; otherwise the labeled10 ms MessageChannel heartbeat proxy. Thumbnails off during timed runs; one extra cancel probe per cell, excluded from success rates. Missing/invalid measurements never pass.

The BQ-0 reference laptop/Mac/phones and measurement definitions remain unchanged. Node is a pre-screen, never qualification:

```text
node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\bq-1.json --workers 4 --fresh-process --output docs\calibration\bq-1-node
node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\bq-2.json --workers 4 --fresh-process --output docs\calibration\bq-2-node
node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\bq-3.json --workers 4 --fresh-process --output docs\calibration\bq-3-node
```

Start `node tools\serve.mjs --port 8080 --prefix /pentomino/` and use `http://localhost:8080/pentomino/tools/bench/`; all browser modules are `.js`. Each gate gets dated reports, method labels, source commit and runtime digest.

Gate outcomes:

- Pass: update only the corresponding qualification record/flag and effective limit, with a report reference.
- Fail: keep the fallback/experimental label. A completed, honestly failed qualification is a valid test outcome, not authorization to enable the feature.
- Missing hardware/evidence: blocked/deferred, never pass.
- Partial-area qualification may raise only to the largest area whose cells all pass, searched in roughly25-cell steps. Any availability-rule change needs a new policy ID and complete boundary tests.
- Predefined gate enablement must not alter score weights, seed streams or the result for an already supported semantic request.

## Files to create/modify

`tools\bench\matrices\bq-1.json`, `bq-2.json`, `bq-3.json`; `tests\fixtures\bq-irregular-558.json`, `bq-irregular-658.json`; `tests\bq-limits.test.js`; gate data in `core\engine\qualification.js` and, only where the documented outcome requires it, `core\engine\policy.js`/`levels.js`; `docs\calibration\bq-1-latest.md`, `bq-2-latest.md`, `bq-3-latest.md` and dated raw reports; gate-status portions of `tasks\init-design\check-list.md`.

## Implementation steps

1. Create and mechanically validate the three matrices and masks.
2. Freeze runtime code during each run; execute/reference the full BQ reports.
3. Apply gate results atomically and test all device-mode combinations.
4. Document failed/blocked outcomes without changing product claims.
5. Coordinate a measurement lock: no engine, worker or client changes may be merged or served mid-run. Post-MVP development may otherwise proceed independently after T23.

## Acceptance criteria — Business

- **BAC-1:** A passed BQ-1 unlocks576 only for normal desktop, not phones.
- **BAC-2:** BQ-2 removes only the experimental label; large boards remain explicit opt-in.
- **BAC-3:** BQ-3 unlocks phone484; failure keeps360. No unsupported level appears on Heart363.
- **BAC-4:** Every gate’s status is visible in evidence and matches the shipped controls.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\bq-limits.test.js" "tests\policy.test.js" "tests\levels.test.js"` and `node tools\check-conventions.mjs` pass.
- **TAC-2:** Every run has valid dimensions/area/levels and strict layout/clue-key checks.
- **TAC-3:** Flags reference passing reports; failed or missing reports cannot raise limits. Retained lower-limit behavior is regression-tested.
- **TAC-4:** Completion requires all three gates to have an executed and reviewed outcome; an unavailable platform leaves this task blocked, while initial release remains permitted by T23.
- **TAC-5:** English UTF-8/CRLF reports distinguish measurements from forecasts; no historical design/prototype edits.

## Test plan

Test default desktop, experimental desktop, phone with known low memory, phone with unknown memory and stored largeBoards=true. Confirm gate changes do not alter replay results for a fixed supported60-cell recipe. Re-run affected cells after any implementation change; do not combine incompatible revisions’ timings.

## Definition of done & handoff

Publish pass/fail evidence and matching flags. Higher limits require pass. T25 does not depend on these hardware-bound gates; coordinate active-run source freezes rather than blocking unrelated post-MVP work indefinitely.

## Execution log

| Field | Value |
| --- | --- |
| Status | **Blocked (partial)** — matrices, fixtures, tests, reduced screening runs and reports complete; BQ-1/BQ-2/BQ-3 NOT passed or qualified; all gates remain `not-run`; no engine/app/gate code changed. |
| Start | 2026-10-23 00:31:21 (+07:00) |
| End | 2026-10-23 01:16:55 (+07:00) |
| Duration | 45 min 34 s |
| Model | claude-sonnet-5.5 (sub-agent `T24-bq1-bq3`, general-purpose); ran alone after T23, the T23 defect-fix round and T25 were committed |
| Token usage | 61 model calls; 7,054,844 input (6,898,097 cache read), 71,363 output |
| AI credits | 179.52 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** `node --test tests\bq-higher-matrix.test.js tests\bq-limits.test.js` → 20 pass / 0 fail; `npm run check` OK. Agent run: full `node --test "tests/**/*.test.js"` 768 pass / 0 fail; `npm run test:quick` 758 pass.

**Screening evidence (3 seeds/cell, labelled "screening, not qualification"; index `docs\calibration\bq-higher-latest.md`):**
- Edge 155 headless (AMD EPYC 7763, not a reference laptop): BQ-1 18 cells, BQ-2 18 cells, BQ-3 matrix 14 cells on desktop (not a phone). Node (4 workers, fresh process) on all three matrices; Firefox 158 on 5 BQ-1 + 3 BQ-2 cells. A Node screen ran concurrently with each Edge matrix, so timings may be slightly pessimistic.
- No timing, memory, cancel or model-size limit failure: worst T10 median 41 s / max 89 s (irregular 558 Nightmare), every response < 120 s; cancel ≤ 12 ms; accounted bytes ≤ 332 MiB; whole-Edge OS ≤ 1,043 MiB, whole-Firefox ≤ 1,421 MiB (upper bounds, not per-tab); one 52 ms Long Task in 150 Edge rows; Firefox heartbeat proxy max 37 ms.
- Completion shortfalls only on irregular masks (same in Node/Edge/Firefox) — see D8.

**Acceptance:** BAC-1/BAC-2/BAC-3 gates blocked (tests prove only a `pass` status moves a limit; 484 / 360 / 676-opt-in hold today); Heart 363 never gets Hell-3 (pass); BAC-4 pass (evidence status matches shipped controls, all gates `not-run`). TAC-1 pass; TAC-2 pass for reduced runs (every accepted puzzle re-validated); TAC-3 pass (failed/missing reports cannot raise limits; fallback regression-tested); **TAC-4 blocked** (no phones, Mac/Safari or reference laptop; BQ-0 not passed); TAC-5 pass (measurements and forecasts separated).

**Defects / risks (appended to `docs\calibration\release-defects.md` → "T24 findings"):**
- D8 High (same root cause as D1): irregular 558 Hard 1/3, Master 2/3; irregular 658 Hard 2/3, Master 2/3; irregular 466 Hard 2/3 stop with `layouts-not-found` — BQ-1/2/3 cannot pass until D1 is resolved.
- D9 Medium: one Edge `worker-crashed` (24×24 Master seed 0); not reproduced in 20 reruns or the other 199 Edge rows.
- R2: irregular 558 Nightmare heavy tail (2.4–91.8 s) near the 115 s p95 limit on a slower reference laptop (forecast risk).
- R3: whole-Firefox 1,421 MiB at 26×26 Hell-3 is near the 1,536 MiB limit; needs a per-tab measurement.

**Blockers (owner steps B9–B12 in `release-defects.md`):** resolve D1/D3/D8 and rerun BQ-0 in full; full BQ-1/BQ-2 (≥ 20 seeds, ≥ 60 Hell-1 at the largest area) on the reference laptop with Chromium, Firefox and Mac Safari; BQ-3 on Android Chrome and iPhone Safari with the same seeds and hand-recorded per-tab memory; only after a complete reviewed pass update `qualification.js`, pinned assertions in `tests\policy.test.js` / `tests\bq-limits.test.js`, and the check-list.

**Handoff:** bench page loads any repo-served matrix via `?matrix=../../<path>&auto=matrix&commit=<sha>`; Edge memory API needs COOP/COEP headers (`tools\serve.mjs` has no option for that yet).
