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
