# improve-generating phase 2 (`gen-v4` in production): round-1 analysis (SA-Opus)

| Item | Value |
|---|---|
| Author | SA-Opus (`claude-opus-5.5`), solution architect; independent of SA-Astra's analysis (not read) |
| Request | `docs/improve-generating-phase-2/request.md` (commit `7c1bad2`) |
| Repository, branch, head | `Q:\git\pentomino`, `gen-v4`, `7c1bad2` (= the published phase-1 head `6b94ffb` + the request) |
| Binding plan | `docs/improve-generating/plan.md` v4 (FINAL; plan author SA-Fable); the owner delegated supervisor questions to the two SAs jointly (request.md:30-31) |
| Evidence | `docs/improve-generating-phase-2/evidence/sa-opus/` (section 10); no timed measurement was run (0 counted s) |
| Marks | [V] verified in the repository or its records, with the path; [A] assumed, with the reason |

## 1. Summary

1. **Recommendation.** Port the frozen `gen-v4` as a semantic rebuild under one new algo id `gen-v4`: P1 to P5 exactly as the
   frozen arms ran them (`fr-frozen` on Nightmare 196-256 cells with the 190 M screen, `fr-frozen-none` elsewhere), today's
   search on every other level and on Nightmare above 576 cells (the 26x26 route, Q-P2-4), seven-key provenance, a new
   replay fixture.
2. **Prove the port before timing it:** on every complete request of the frozen validation seeds, production `gen-v4` must
   return the frozen shipped arm's puzzles. Then re-time on production in two locked stages, the risky cells first:
   about 377 counted minutes expected, an envelope of 480 (a new grant; it would also fit the 853.8 minutes left of the
   closed round's 1,725).
3. **Main risks.** (i) Phase 1's P6 made today's search faster, so the thin controls (32x15 lower bound 0.9127, 3x29 0.9473)
   may fail on production. (ii) About 90 % of the offered Nightmare rectangles have no prior-table cell and start at K - 8,
   a path never validated on real rows. (iii) `require` has never run under `gen-v4` (N-V4-15). (iv) Hell 1 has no offer,
   so its production runs need a tools-only diagnostic offer.
4. **Product facts that shape the plan:** the Generator offers Nightmare on 81-484 cells (phones 360; BQ-1/BQ-3 not run), so
   the 26x26 route has no user effect in this release. Set and batch are separate actions with their own 115/120-s limits,
   so IG-P-D1's 46-s set-stage reserve has nothing to protect in the Generator. Effort about 38 developer hours.

## 2. Understanding of the request

**Goal** [V request.md:35-40, 44-52; stage4-report.md:396-407]. Ship `gen-v4` for Nightmare and Hell 1 in the production code,
with the recorded class choices, keep today's search (`gen-v3`) on 26x26 Nightmare and on Very easy to Master, prove
compatibility and replay, measure `require` on the largest boards first (N-V4-15), repeat the frozen round's validation on
the production code with the population per cell and the reach reports of F2, F4 and F7, and return to the owner with the
plan and its price before anything runs or ships. Hell 1's offer rules do not change (phase 3).

**Users.**
- Generator users who make Nightmare puzzles: faster sets and batches, and on five boards puzzles where today fails.
- Every Generator user: their saved sets, packs and history keep working; the steps of older puzzles become unavailable.
- The owner: approves the plan, the price and the user texts; decides the open behaviour questions (section 9).
- Developers and the SAs: a production engine with one running version, tests and fixtures.

**Constraints.**
- Plan v4 binds [V plan.md:660-700, 776-829]; a deviation is a question for the SAs jointly (delegated) and, for scope,
  cost or user-visible behaviour, for the owner.
- The frozen values are not refitted (stage4-report.md F4 and F7 rows) [V].
- One running version (IG-P-Q34): a `gen-v4` build replays `gen-v4` records only [V plan.md:522-525].
- Provenance per `algo` (IG-P-Q36): a `gen-v4` record has seven version keys [V plan.md:526-531].
- Timed runs go through `tools\ig-proto\lock\ig-lock.ps1` with a 45-s quiet period on a machine shared with sudoku
  [V `tools/ig-proto/README.md:24, 38`].
- A change that alters behaviour, storage or UI updates `docs/design-brief.md` and `docs/design-detail.md` in the same
  change; the English and Vietnamese guides stay in step [V AGENTS.md:5, 8-10].
- Every unit-test run finishes within 10 minutes and every browser check within 1 minute [V AGENTS.md:16-17].
- Two PRs, neither merged; phase 2 is draft PR #14 from `gen-v4` into `main`, which also shows phase 1's commits until
  PR #11 is merged [V request.md:9, 21-27, 53-54].

**Assumptions.**
- [A] "Hell 1 offers are not in scope" means the Generator keeps not listing Hell 1 and `mixed-v3` keeps its areas. Hell 1's
  `gen-v4` code ships but is unreachable from the app until phase 3.
- [A] "Nightmare" in the route means the level `nightmare`; levels above Hell 1 (Hell 2 and up) keep `gen-v3`, as in the
  frozen arms (`v4Target`, `ig-select-v4.js:208-215`) [V for the frozen rule].
- [A] Node v26.13.0 at four workers, cold, one fresh process per request is the measurement setting (the frozen round's and
  T14's); the results are Node screening evidence, not a browser qualification (D39).
- [A] The validation reuses the frozen validation seeds (reps 20-39, Master 20-24) so that port equality can be read;
  nothing was fitted on them [V freeze.json `seeds.excluded`].

## 3. Current state

### 3.1 Production (`gen-v4` branch at `7c1bad2`)

| Area | State | Evidence |
|---|---|---|
| Versions | `APP_VERSION` `1.0.0`, `ALGO_ID` `gen-v3`; policy `mixed-v3` | [V] `core/engine/version.js:3-4`; `core/engine/policy.js:18` |
| Clue search | `selectClues` (`gen-v3`): start at `SHARES` (Nightmare 0.14) via `initialClueCount`, count changes, stall stop 12; P6 rates lean unless `onRate` or a recorder observes | [V] `clues.js:80-92, 258, 273-280, 658`; `levels.js:18` |
| Capped profiles | "unrateable", spent; D21's test pins it | [V] `tests/clues.test.js:820` |
| Set stage | attempts in parallel, the lowest success wins, no bound; `time-limit` at the watchdog | [V] `core/browser/generation-client.js:595-690` |
| Records | `made` candidate with five version keys; skip bounds 2,128 subset and 64 repair ordinals | [V] `generate.js:205-295`; `pack.js:49-62, 1147` |
| Replay | `sameVersions` on five keys; `set-versions` and `record-versions` refusals | [V] `replay.js:180, 331, 362` |
| Steps events | phases `sample`, `seed`, `beam`; unrateable reason only `path-capped` | [V] `core/engine/types.js:322-334` |
| Saved steps | key holds `ALGO_ID` and `APP_VERSION`, not table versions | [V] `generator/ui/replay-cache.js:71-74` |
| Offers | Nightmare from 81 cells; every Hell level `[∞, ∞]` up to Hell 3, Hell 4 from 744; `pieceCountPlan` returns null for an unoffered area | [V] `levels.js:22-34`; `policy.js:336-339` |
| Board limits | desktop 484 (576 only after BQ-1), phone 360 (484 after BQ-3), both `not-run`; the large-board switch (676) is never set | [V] `policy.js:24-31`; `qualification.js:15-17`; `generator/state.js:322-324` |
| Generator flow | "Create piece set" and "add puzzles" are two separate client requests, each with the pool's 115-s stop and 120-s bound | [V] `generator/jobs.js:303-355, 357-440`; `policy.js:69` (`TIME`) |
| Notices | `N-NOSET` ("… within the time limit …"), `N-PARTIAL`; EN and VI | [V] `locale.en.js:218, 229`; `locale.vi.js:214, 225`; `jobs.js:132-136, 352` |
| Bench | production bench `tools/calibrate.mjs --profile landscape` runs diagnostic profile sampling after the timed interval; unoffered levels are refused | [V] `calibrate.mjs:528`; `tools/bench/runner.js:180, 415-482` |

### 3.2 The frozen harness that ran `gen-v4`

- **Chain** [V `evidence/sa-opus/p2-variant-chain.md`]: `base` → `instr` → `log` → `v4` → `link` → `v4-link` → `fr-base` →
  `v4-ps` → `v4-p5` → `live` → `p5-mode` → `ps-levels` → `fr-frozen` (→ `fr-frozen-none`): 88 anchored edits in 15 files
  plus the added modules `ig-log.js`, `ig-select-v4.js` and `ig-link.js`, on the frozen source `3fc65f4`.
- **The selection** `selectCluesV4` (`tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js`, 1,320 lines) [V]:
  - Node-only and harness-only parts: `node:fs` and `node:worker_threads` imports, `process.env.IG_LOG_DIR`, the `IG`
    parameter global, the journal (`ig-log.js`) [V :23-30, :226].
  - Parameters [V `tools/ig-proto/variants/fr-frozen.json`]: `priorTable` `prior-s3-v1`; `screenTable` `screen-s3-v1` with
    `screenClasses` `{ hell-1: null, n-small: null, n-mid: 190 M, n-large: 190 M }`; `rerate` `rescue`, `rerateMax` 4;
    `c4` false; `callBudget` `budget-s3-v1` (`any`: Nightmare 10 G, Hell 1 40 G; `require`: 32 G and 40 G);
    `setAttemptsBound` 4; `liveDeadline` `deadline-s3-v1` (reserve 0.6, set-stage cap 46 s, stop 115 s, bound 120 s,
    host margin 1 s); `perSetLevels` `['hell-1']`.
  - The code's `screenClass` maps 196-324 cells to `n-mid` [V :97-112]. That equals the freeze table, because
    `screen-s3-v1` gives 190 M to both `n-mid` and `n-upper` [V `freeze.json` `values.W`].
  - Prior lookup by exact key `<level>@<active cells>`; without a cell the locate starts at K - 8 with step 8 [V :199-205].
  - Events reuse today's kinds with the phases `locate`, `window`, `seed` (the journal's `p2`), `beam` and `rescue`, and
    the unrateable reason `screen-capped`; the result carries `igWindow` [V :582-602, 725, 1130-1192].
  - The bound is read before the ordered scan of the set attempts, so it does not depend on the pool width
    [V `v4-p5.json` edit `p5-2`]; `setAttempt` returns `no-window-<side>` [V edit `p5-1`].
- **Hell 1 ran by a diagnostic offer**: `IG.diagnosticOffers` bypasses `pieceCountPlan`'s area check
  [V `tools/ig-proto/variants/instr.json` edits `diag-1`, `diag-2`].
- **No landscape sampling** in the frozen rows (`samples` 0) [V `V4-S4/fr-frozen-none/val-18x18-nightmare.runs.json`].

### 3.3 The frozen round's evidence that phase 2 inherits

| Item | Result | Evidence |
|---|---|---|
| Class selection | `n-mid` (196-256) admitted with the screen (×2.30, lower bound 2.17); `n-small` and `hell-1` failed (both arms the same search); `n-upper` ×1.79 and `n-large` ×1.59 but inconclusive (work unknown, N-V4-14) | [V] stage4-report.md:36-55 |
| Failing Nightmare boards (B1) | 12x12, 14x14, 15x15b10, 16x16, 15x20: 20 of 20 reached ten each, no dead end, no response above 120 s | [V] stage4-report.md:57-64 |
| Controls (B2) | today over shipped, geometric mean / lower bound: 3x29 1.0592 / 0.9473; 10x10 1.5221 / 1.3173; 18x18 2.0012 / 1.6984; 18x20 1.6591 / 1.4374; 20x20 2.0889 / 1.7330; 20x21 1.5840 / 1.3793; 32x15 1.0540 / 0.9127; 22x22 1.1554 / 1.0388; 24x24 1.2434 / 1.1271; 26x26 1.0006 / 0.8864 (fail) | [V] stage4-report.md:66-82 |
| Master identity | 16 of 16 cells identical on reps 20-24 | [V] stage4-report.md:84-89 |
| Hell 1 (report) | 20x20, 24x24, 26x26 20 of 20 (candidates); 14x14 10 of 20 | [V] stage4-report.md:91-102 |
| P5 | 0 false stops on 19 declared pairs; lost completions only 14x14 Hell 1 (2, by the 115-s stop); the bound never fired; no budget stop (largest 8.39 G of 10 G on 18x18 Nightmare, 23.08 G of 40 G on Hell 1); no `require` call ran | [V] stage4-report.md:116-126, 177-190 |
| Reach (F7) | prior, `W` and per-set prior matched the freeze on every start; (c4), close, rescue and tail re-rating never ran | [V] stage4-report.md:291 |
| Cost | V4-S4 467.4 counted min (94 invocations, 1,120 rows); V4-S4C 161.2 min (23, 380 rows); per-row overhead about 2.1 s plus 45 s per invocation | [V] `evidence/sa-opus/p2-price-basis.md` |
| Phase 1's P6 on today's search | old/new ×1.17 Master, ×1.14 Expert, ×1.07 Nightmare (26x26 ×1.32, 18x18 ×1.13, 12x12 ×1.02, 10x10 ×1.00); 35 of 35 pairs equal | [V] `tasks/improve-generating-v4/check-list.md:634` |

### 3.4 Findings

- **F-P2-01 [V]. The 26x26 route has no user effect in this release.** The Generator's largest board is 484 cells on a
  desktop and 360 on a phone (`policy.js:24-31`, `qualification.js:15-17`, `state.js:322-324`). Nightmare above 576
  cells exists only in the bench and in a later qualification (BQ-1 raises the limit to 576, still below the route).
- **F-P2-02 [V]. Hell 1 cannot be generated by the production engine.** `mixed-v3` lists no Hell 1 area (`levels.js:30`),
  `pieceCountPlan` returns null (`policy.js:339`) and the bench refuses the case (`runner.js:180`). A production run of
  the frozen Hell 1 cells needs a tools-only diagnostic offer, as the frozen harness had (`instr` `diag-1`).
- **F-P2-03 [V]. Most user boards have no prior cell.** Of the 295 offered desktop rectangles only 29 (9.8 %) have a
  `prior-s3-v1` cell; on a phone 20 of 236 (8.5 %). 9x9, 11x11, 13x13, 15x15, 17x17, 19x19 and 21x21 have none
  (`evidence/sa-opus/p2-prior-coverage.md`). Without a cell the locate starts at K - 8 with step 8; plan P1 reports 6 to 7
  probes and one to three canonical caps of about 2 s in that case, against a median of 2 probes with the prior
  [V plan.md:231-233]. The frozen validation measured only table cells.
- **F-P2-04 [V]. Only `n-mid` ships the screen**, so the production screen table is not `screen-s3-v1` (which gives 190 M
  to `n-upper` and `n-large`). It needs its own id.
- **F-P2-05 [V]. IG-P-D1's reserve has no target in the Generator.** The reserve protects a batch that shares the set's
  clock; the Generator's set and batch are separate requests with their own limits (section 3.1).
- **F-P2-06 [V]. The frozen arms are timed without P6, the production arms with it.** Both `fr-frozen` and `log-link` extend
  `log`, which sets `p6: false`, and neither chain contains the `p6` variant (`tools/ig-proto/variants/log.json`,
  `p6.json`; `p2-variant-chain.md`), while production rates lean (`clues.js:273-280`). P6 sped
  today's search up by ×1.00 to ×1.32 on Nightmare. Its effect on `gen-v4`, which rates fewer expensive profiles, is
  unmeasured, so the production ratios can be lower than the frozen ones.
- **F-P2-07 [V]. The frozen selection cannot be copied.** It writes journals with `node:fs`, reads `IG` globals and
  `process.env`, and was built on `3fc65f4`'s `clues.js`, not on phase 1's (P6, fold order).
- **F-P2-08 [V]. Sampling costs a few seconds per row and was off in the frozen round.** T14 (production bench with the
  landscape sampling) spent 3.5 to 5.6 s per row beyond the responses and the 45-s quiet period (old A: 527.5 counted s for
  25 rows and 395.1 s of responses; old B: 635.2 s for 10 rows and 534.3 s); the frozen harness, without sampling,
  2.1 s per row ((28,043.4 - 21,487.0 - 94 × 45) / 1,120) (`docs/improve-generating/evidence/phase1/P6-bench/ledger.jsonl`
  and `old|new/*.json`; `p2-price-basis.md`). Sampling off saves about 20 to 50 minutes on 890 rows and keeps the memory
  peaks comparable with the frozen rows.

## 4. Options

### 4.1 How to put `gen-v4` into production

| Option | Design | Cost | Risk | User effect |
|---|---|---|---|---|
| **A. Semantic rebuild (recommended)** | a production module `core/engine/select-v4.js` ported from `ig-select-v4.js` without journals, globals or Node imports; a versioned configuration module; dispatch inside `selectClues`; P6's lean rating kept | about 38 developer hours | a port defect; caught by the port-equality gate (T-1, Q-P2-S4) and by ported unit tests | faster Nightmare on offered boards; identical below Nightmare |
| B. Copy the frozen module, stub the globals | keep `IG`, journals behind flags | lower first cost | Node imports break the browser build; dead harness code in production; P6 absent | same |
| C. Apply the variant edits to production | the 88 anchored edits | low if they applied | anchors drifted since `3fc65f4` (phase 1); the edits carry harness code | same |

### 4.2 What the validation repeats

| Option | Cells | Expected counted min | Plan fit |
|---|---|---:|---|
| **V-a (recommended)** | the shipped configuration on every frozen Nightmare cell; today on the ten controls and Master; four non-table Nightmare boards both arms; `require` first (N-V4-15); Hell 1's four cells by a diagnostic offer | about 377 | the plan's gate, plus the non-table risk |
| V-b | V-a without Hell 1's timed cells (Hell 1 checked by equality only; timed in phase 3) | about 328 | deviates from the plan's gate on Hell 1 |
| V-c | controls and route only; the rest by equality to the frozen rows | about 170 | deviates widely; no production completion evidence on the failing boards |

Why V-a: it is the plan's gate (plan.md:666) at a cost close to V-b, it measures the per-set prior on production code
before phase 3 needs it, and it adds the non-table boards that F-P2-03 shows most users reach.

### 4.3 How the production rows are measured

| Option | Design | Risk |
|---|---|---|
| **T-a (recommended)** | the production bench in two detached worktrees (old `6b94ffb`, new the phase-2 candidate), as T14 did, with sampling off, per-request reach counters in the results, and a comparator `tools/ig-proto/phase2/p2-validate.mjs` (+ `.ps1` for the locked invocations) that reuses `tools/ig-proto/verdicts.mjs`' statistics | new tooling (about 6 h) |
| T-b | the ig-proto harness re-targeted to the production source | its variants are anchored on the frozen text; its window (D-V4-20) is closed |
| T-c | journals through `record` | the recorder disables P6, so the timing is not what ships; an untimed second pass doubles the cost |

### 4.4 Other choices (each a question in section 9)

- **The deadline in the Generator (Q-P2-3):** keep the two per-action limits (recommended) / cap the set action at 46 s /
  build a one-click set-and-batch flow.
- **The 26x26 route's domain (Q-P2-4):** the 26x26 rectangle / Nightmare above 576 cells (recommended) / 676 cells and up.
- **Boards without a prior cell (Q-P2-S3):** port the exact-key rule and measure first (recommended) / a nearest-cell prior
  now / `gen-v4` only on table areas.
- **Fixtures:** re-record the Hard replay recipe under `gen-v4` for the five consumers and add a small Nightmare case
  for the new events (recommended), or move every consumer to one Nightmare case (more churn, slower tests).

## 5. Proposed plan

### 5.1 Components

| Component | Change |
|---|---|
| `core/engine/gen-v4.js` (new) | the frozen configuration as data: `ALGO_TABLES` (`priorTable` `prior-s3-v1` with its 27 cells, `screenTable` `screen-p2-v1`), `SCREEN_P2_V1` (Nightmare 196-256 cells → 190,000,000; every other class canonical), `BUDGET_S3_V1`, `SET_ATTEMPTS_BOUND` 4, `RERATE` (`rescue`, 4), `C4` false, `ROUTE_MAX_AREA` 576, `SKIP_BOUNDS_V4` (2,192 / 64), `PER_SET_LEVELS` `['hell-1']`, and `usesGenV4(levelId, area)` |
| `core/engine/select-v4.js` (new) | the port of `selectCluesV4`: P1 locate with march, bisect, the AR1 direction and the no-window proofs; P3 sided caps; P2 screen with certificate and the rescue; P4 start; P5 call budget (`BudgetStop`) by mode; window phase, beam, stall and centre rule; skip ordinals; events and `charge`; P6 lean rating with the returned rating completed; a `stats` object per call |
| `core/engine/difficulty.js` | a screen-limited rating with its certificate (main-phase work at most `W` gives the canonical rating), lean and detailed forms |
| `core/engine/clues.js` | `selectClues` dispatches to `select-v4.js` when `usesGenV4`; otherwise unchanged |
| `core/engine/generate.js`, `tasks.js`, `protocol.js` | `setAttempt` returns `no-window-<side>`; candidates take `igPrior`; `made.igPrior`; seven-key versions for `gen-v4`; per-call `stats` passed through |
| `core/engine/pack.js`, `replay.js`, `types.js` | per-`algo` shape (keys, skip bounds, `made` keys); version comparison with the table versions; new phases, reasons and events |
| `core/engine/version.js` | `ALGO_ID` `gen-v4` |
| `core/browser/generation-client.js` | the bound before the ordered scan; the per-set prior for Hell 1 (`igPriorOf(calibration)`, else the table); per-request `stats` |
| `generator/jobs.js`, locales | the `N-NOSET` variants for the bound (5.4) |
| `generator/ui/replay-model.js`, `replay-cache.js`, locales | the new steps and sentences; the saved-steps key with the running provenance tuple (DR-O17) |
| `tools/record-fixtures.mjs`, `tests/fixtures/` | `replay-case-v4.json` and `replay-case-v4-nightmare.json` (new); `generation-case.json` and `generated-sample-pack.json` re-recorded (versions only); `replay-case.json` stays as the refusal case |
| `tools/calibrate.mjs`, `tools/bench/runner.js` | a validation profile without sampling; the `stats` counters in each row; a tools-only diagnostic offer for Hell 1 |
| `tools/ig-proto/phase2/` (new) | `p2-validate.mjs` (plans, preflight, ledger, comparison, report) and `p2-validate.ps1` (locked invocations) |

### 5.2 Data and identities

- **Tables.**
  - `prior-s3-v1` is embedded with the same content as `tools/ig-proto/data/prior-s3-v1.json`; a test compares its digest.
  - `screen-p2-v1` is new: Nightmare 196-256 → 190 M, derived from `screen-s3-v1` by the V4-S4F selection (Q-P2-S2).
  - `budget-s3-v1` and the bound 4 are part of `gen-v4`'s definition (Q-P2-S1).
  - `deadline-s3-v1` is not ported if Q-P2-3 is (a).
- **Provenance (IG-P-Q36):** a `gen-v4` record carries `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`, `priorTable`
  and `screenTable` (seven keys); every other record keeps five. All new records carry `gen-v4` (one running version),
  including Very easy to Master and the 26x26 route, whose `made.igPrior` is null.
- **`made` (D-V4-05, ported from T02c):** candidate field `igPrior`, an integer from 1 to 128 or null; skip ordinals
  below 2,192 (subsets) and 64 (repairs); [A] at most 64 and 16 kept, as today.
- **Per-call `stats`** (new, diagnostics only, never part of an identity): probes, screen-capped profiles, rescue and tail
  re-ratings with their outcomes, the budget stop and the work units used, the no-window side and proof, the start
  count and its source (table, per set, none).

### 5.3 Interfaces

- `selectClues(ctx)` keeps its signature. For a `gen-v4` target it reads `ctx.igPrior` (per-set prior, Hell 1 only) and
  `ctx.uniqueness` (budget by mode), and returns today's result plus `igWindow` and `stats`.
- `setAttempt` result `{ ok: false, reason: 'no-window-below' | 'no-window-above' }` when the calibration call ends without
  a window; the client's result `{ status: 'failed', reason: 'no-window-<side>', failures }` when the bound fires.
- The worker protocol accepts `igPrior` on `puzzleCandidate` and passes `stats` back; both are validated like today's
  fields. The tools-only `diagnosticOffer` is accepted only from a client created with that option, which the apps
  never set; a test pins that the Generator and the Player never set it.

### 5.4 User texts (English and Vietnamese)

Notices, as variants of `N-NOSET` (the pattern of `N-LEVELS.above` and `.below`, `locale.en.js:216-217`); the base
`N-NOSET` stays for a time-limit failure:

| Key | English | Vietnamese |
|---|---|---|
| `notice.N-NOSET.below` | Couldn't create a {level} piece set for this board: the first piece sets tried only gave puzzles easier than {level}. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: các bộ mảnh thử đầu tiên chỉ cho đề dễ hơn mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `notice.N-NOSET.above` | Couldn't create a {level} piece set for this board: the first piece sets tried only gave puzzles harder than {level}. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: các bộ mảnh thử đầu tiên chỉ cho đề khó hơn mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |

Generation steps (`replay.step.*`, the style of `locale.en.js:303-326` and `locale.vi.js:298-321`):

| Key | English | Vietnamese |
|---|---|---|
| `replay.step.locate` | Clue set {sequence} with {count} clues is rated to find how many clues the level needs: score {score}. | Nhóm mảnh đặt sẵn {sequence} gồm {count} mảnh được chấm để tìm số mảnh đặt sẵn mà mức cần: điểm {score}. |
| `replay.step.screenCapped` | Clue set {sequence} with {count} clues stops at the quick check's limit: too few clues for this level, so it has no score. | Nhóm mảnh đặt sẵn {sequence} gồm {count} mảnh dừng ở giới hạn của lần kiểm tra nhanh: quá ít mảnh đặt sẵn cho mức này nên không có điểm. |
| `replay.step.rerated` | Clue set {sequence} is rated again without the quick check's limit: score {score}. | Nhóm mảnh đặt sẵn {sequence} được chấm lại không có giới hạn của lần kiểm tra nhanh: điểm {score}. |
| `replay.step.budget` | The clue search stops here: it has used its work limit. | Việc tìm các mảnh đặt sẵn dừng ở đây: đã dùng hết giới hạn phép tính. |
| `replay.step.noWindow.below` | No number of clues gives a puzzle of this level with these pieces: every number tried gives an easier puzzle. | Không có số mảnh đặt sẵn nào cho đề ở mức này với các mảnh này: mọi số đã thử đều cho đề dễ hơn. |
| `replay.step.noWindow.above` | No number of clues gives a puzzle of this level with these pieces: every number tried gives a harder puzzle. | Không có số mảnh đặt sẵn nào cho đề ở mức này với các mảnh này: mọi số đã thử đều cho đề khó hơn. |

- A screen-capped step shows no score (plan.md:796-798).
- "Harder" covers both scores above the band and profiles that stay capped up to K - 2 clues (`above-to-max`).
- The user guides add, in English and Vietnamese, one sentence on the early end of a Nightmare set and keep the existing
  sentence on older puzzles' steps (`USERGUIDE.md:186-189`).

### 5.5 Algorithms

- **The port contract.** For the same effective request, production `gen-v4` returns the frozen shipped arm's puzzles,
  work units and skip ordinals. Two exceptions only: P6 completes the returned rating's diagnostic (as `gen-v3` does), and
  the live deadline is not ported (Q-P2-3 (a)), which changes only the number of puzzles of a request cut by the clock.
  - [A] P6 does not change the work units that the call budget counts: the DLX diagnostic is not deduction work.
  - The port-equality gate (6.2 T-1) verifies this.
- **Dispatch.** `usesGenV4(levelId, area)` is true for `hell-1` and for `nightmare` with at most `ROUTE_MAX_AREA` active
  cells (Q-P2-4 (b)). Every other request runs `gen-v3`'s selection unchanged (the scope test).
- **Screen class.** The freeze's bounds (`freeze.json` `bounds`), not the frozen code's `screenClass`. Only `n-mid` has a
  number; an unlisted class fails closed to `DEDUCE.work` (IG-P-Q26).
- **The bound.** It is read before the ordered scan; attempts 0 to 3 must all be `no-window-<side>` on one side. A success at
  attempt 4 or later does not override it (pool invariance).
- **The per-set prior.** Hell 1 only. It is taken from the matching calibration (same level and uniqueness), else rebuilt
  from the table. The value is stored in `made.igPrior`.

### 5.6 Versions, replay and fixtures

- `tests/fixtures/replay-case.json` stays as written (`gen-v3`). It loads, keeps its provenance through a load and a save,
  and replays "unavailable" with `set-versions` (plan.md:688-694).
- `tests/fixtures/replay-case-v4.json` (new) is the same Hard recipe recorded under `gen-v4`. The five consumers
  (`replay.test.js`, `replay-model.test.js`, `protocol.test.js`, `tasks.test.js`, `generation-client.test.js`) move to it.
  Its packs must equal the old fixture's except the version keys and `made.igPrior`: a scope test for free.
- `tests/fixtures/generation-case.json` and `generated-sample-pack.json` (the 10x6 recipe with its semantic keys, and the
  Easy, Normal and Hard sample pack; 13 test files read them) record `algo` `gen-v3`
  [V `tests/fixtures/generation-case.json:19`, `generated-sample-pack.json:821`]. They are re-recorded with
  `record-fixtures.mjs --replace --reason`, the change limited to the versions (the semantic keys unchanged: another
  scope test).
- The `ALGO_ID` flip and the re-recorded fixtures land in one task, after the dispatch, so that every commit is green and
  no fixture is recorded from an intermediate commit.
- `tests/fixtures/replay-case-v4-nightmare.json` (new): a Nightmare request, one or two puzzles, found by a bounded seed
  search with these conditions: at least one `locate` event, one `screen-capped` event (a board of 196 to 256 cells),
  and a matched replay. Its test is `slow` if it takes longer than the suite's quick budget.
- `tools/record-fixtures.mjs` gets a second recipe mode for it, with the same `--search | --create | --check | --replace`.
  Its `--replay-case` modes then target `replay-case-v4.json`; the `gen-v3` file is never regenerated again
  (`tests/generate.test.js:911-920` runs `--replay-case --check`).
- `REPLAY` (steps, bytes, work) is re-derived from measured `gen-v4` replays (DR-O05). The current work bound is 215 G
  units; a `gen-v4` set call and candidate call are budgeted at most 2 × 40 G [V policy.js `REPLAY`; `fr-frozen.json`;
  A: the budget's units are `REPLAY.work`'s].

### 5.7 Migration and compatibility

- **No data migration.** Saved sets, packs and history made by `gen-v3` load and play unchanged. Their steps are unavailable
  with today's reasons (`set-versions`, `record-versions`; IG-P-Q34, P-OD14 Q3). A new puzzle made on a set saved before the
  release also shows no steps, because its set origin is `gen-v3` (plan.md:792-795). Release notes and both guides say so.
- **Saved steps.** The key includes the running provenance tuple (seven keys), so a table-version change invalidates a
  cached replay (DR-O17).
- **History.** A batch that ends short keeps phase 1's policy: a shown puzzle is in the history. `gen-v4` adds two ways
  to end short: a call that ends by its budget, and the bound.
- **An older build reading a `gen-v4` pack** (forward compatibility, [A] from plan.md:529-531): the old reader drops a
  `made` record of an unknown shape with a warning and keeps the puzzles. The pack verifies this once with the
  `6b94ffb` reader on the new fixture.

### 5.8 The 26x26 route

- Nightmare on more than 576 active cells runs today's selection, today's set stage (no bound fires, because `gen-v3`
  never returns `no-window-*`) and no budgets. The records still carry `gen-v4` with seven keys and `igPrior` null.
- Tests pin it: a 26x26 Nightmare request and a 577-cell Nightmare request return `gen-v3`'s puzzles, and a 576-cell one
  takes `gen-v4`.
- Its user effect is nil until a board limit above 576 ships (F-P2-01). Any later change of the route takes a new `algo`.

### 5.9 The production validation (V-a with T-a)

- **Arms.** `today` = `6b94ffb` (`gen-v3` with phase 1). `gen-v4` = the phase-2 candidate commit.
- **Setting.** Node v26.13.0, four workers, cold, one fresh process per request, sampling off, through `ig-lock.ps1`.
  Ledger and preflight as `p6-bench.mjs` (allowance, horizon, refusals).
- **Seeds.** Landscape reps 20-39 (Master 20-24). Reps 40-59 stay reserved (`freeze.json`).
- **Stage A, the risky cells first:**
  - N-V4-15: `require` on 22x22, 32x15 and 18x20 Nightmare (the largest offered desktop square and oblong, the phone
    maximum), reps 20-29, both arms;
  - the thin controls 32x15, 3x29 and 22x22, reps 20-39, both arms;
  - non-table boards 13x13, 15x15, 17x17 and 21x21 Nightmare, reps 20-29, both arms;
  - the 26x26 route, reps 20-24, both arms (identity).
- **After stage A,** the SAs report. A failed gate goes to the owner before stage B (Q-P2-2); otherwise stage B follows
  if the allowance covers its ceiling.
- **Stage B:**
  - the other controls 10x10, 18x18, 18x20, 20x20, 20x21 and 24x24, both arms;
  - the five failing boards, `gen-v4` only;
  - the 16 Master cells, both arms (identity);
  - Hell 1 14x14, 20x20, 24x24 and 26x26 by the diagnostic offer, `gen-v4` only.
- **Readings per cell** (verdicts.mjs statistics: capped T10, geometric mean with a bootstrap lower bound, 10,000
  resamples, seed 20261116):
  - the gates of section 6;
  - the population, two-sided where today has puzzles;
  - port equality against the frozen shipped arm's `igPuzzleKeys` (V4-S4 rows of the same case and rep), the comparator
    computing the same keys from the production results;
  - budget stops (F4); bound-condition matches, firings, `set:no-window-*` rows and glue defects (N-V4-16, F2); rescue and
    tail re-rating reach including zero (F7);
  - memory at four workers (process peak at most 1,536 MiB, accounted at most 1,196 MiB, `model-too-large` 0).

### 5.10 Documents

Each part is written by the task that changes the behaviour (8.1; AGENTS.md:5).

- `docs/design-detail.md`:
  - §6.5 and §6.9: the bound on set attempts, the per-set prior on Hell 1, the `stats` of a request;
  - §6.10 and §7.6: the `gen-v4` search (P1 to P4), its dispatch and the route;
  - §6.12: the new events and steps;
  - §7.5 and line 1805: the bounded attempts replace "no fail-fast" for Nightmare and Hell 1, with the 0-false-stop
    evidence of V4-S4F;
  - §7.7: `gen-v4`, the seven keys, one running version;
  - §7.8 (line 1922): `gen-v4` is the new algorithm id of the lock text, qualified by the phase-2 validation;
  - §7.9: the screen limit and its certificate;
  - §8.3 and §8.4: the call budgets, and the deadline mapping of Q-P2-3.
- `docs/design-brief.md:100` ("A new puzzle is a request, not a guarantee"): add the bound's notice; line 29 already says
  that a set or puzzle made by an older version has no steps.
- `USERGUIDE.md` and `USERGUIDE.vn.md` (5.4).
- The release notes in PR #14's description.
- `tools/ig-proto/README.md` (the phase-2 comparator).
- N-P1-DOC: the developer guides' gap on `tools/ig-proto/`, before any merge, because PR #14 contains phase 1.

## 6. Acceptance

### 6.1 Business criteria

| ID | Criterion | Verified by |
|---|---|---|
| B-1 | The five failing Nightmare boards reach ten on 20 of 20 requests each with no dead end and no response above 120 s; p95 reported | stage B rows; `p2-validate.mjs report` |
| B-2 | No regression on each Nightmare control and (proposed, Q-P2-S3) each non-table board: today over `gen-v4` capped T10, geometric mean with a lower bound of at least 0.9 (phase 0's criterion) | stages A and B; the same statistics as V4-S4F |
| B-3 | Very easy to Master and the 26x26 route return today's puzzles (16 Master cells × reps 20-24; 26x26 reps 20-24) | identity in the comparator |
| B-4 | The population per cell (clue share, score position, census-estimate share, completion), two-sided where today has puzzles | the report |
| B-5 | `require` on 22x22, 32x15 and 18x20 Nightmare: completion and capped T10 of both arms read before any claim; a regression goes to the owner | stage A (N-V4-15) |
| B-6 | Hell 1 reported per cell (reached ten, population), never gated; no offer changes | stage B |
| B-7 | Users see the bound's notice, the new step sentences and the unchanged older-steps reasons in English and Vietnamese | browser smoke (T-11) and locale tests |

### 6.2 Technical criteria

| ID | Criterion | Verified by |
|---|---|---|
| T-1 | Port equality: every complete `gen-v4` row of a frozen cell has the frozen shipped arm's puzzle keys, in slot order; where a clock stop cut either request (in the frozen round, 14x14 Hell 1 reps 26 and 38), the shorter list is a prefix of the longer (IG-P-D1 condition 2) | comparator; any other difference stops the run as a port defect |
| T-2 | Rating equality: every certified screen run deep-equals its canonical rating on a corpus | `npm test` |
| T-3 | Pool invariance at 1, 2, 4 and 8 workers on `gen-v4` requests, the bound included | `npm test` (slow group) |
| T-4 | Budget determinism: a slow and a fast clock end a request the same way | `npm test` |
| T-5 | Observers: equal results with no observer, `charge`, `record` and `charge`; a throwing observer propagates | `npm test` |
| T-6 | Replay and provenance: the `gen-v4` fixtures `matched`; the `gen-v3` fixture `unavailable` (`set-versions`); wrong shapes dropped with a warning; a table-version-only mismatch unavailable; the saved-steps key changes with a table version | `npm test`; `record-fixtures.mjs --check` for both cases |
| T-7 | Scope and pins: `tests/clues.test.js:820` still pins `gen-v3`; `gen-v4` has its own P3 test; the route tests of 5.8 | `npm test` |
| T-8 | The real-worker no-window test with synthetic ratings (F2) passes, end to end to the client's `no-window-<side>` | `npm test` |
| T-9 | Reach reports per cell (F2, F4, F7), zero reported as unexercised | the report |
| T-10 | `REPLAY` bounds hold on the measured `gen-v4` replays, with margin | measurement record |
| T-11 | Browser smoke in Edge or Chrome on `tests/browser/generator-flow.html`, `replay.html` and `watchdog.html`, with a test seam forcing the bound; recorded; not a browser qualification | the record |
| T-12 | Memory checks at four workers pass on every cell | the report |
| T-13 | `npm test`, `npm run check` and CI pass; files CRLF, UTF-8 without BOM | the commands |

**The plan's phase-2 gate** (plan.md:666), "the frozen round's validation repeated on the production code, the controls
included; the population reported per cell", is B-1 to B-4 with B-6, read with T-1. B-5 is N-V4-15's condition.

## 7. Risks, and the effect on performance, tests and documents

| ID | Risk | Likelihood, impact | Mitigation |
|---|---|---|---|
| R-P2-01 | A thin control fails on production because P6 sped today up more than `gen-v4` (F-P2-06) | medium, high (another 26x26-like decision) | measured in stage A first; the owner decides before stage B with options like Q-T16's |
| R-P2-02 | Non-table boards regress (F-P2-03) | medium, high (most user boards) | four non-table boards in stage A; a prepared remedy (Q-P2-S3) |
| R-P2-03 | `require` regresses on large boards (N-V4-15: stage 1's 26x26 attempt 0 ended `not-in-band` after 63.7 s) | medium, medium (`require` is optional) | stage A first; the owner decides on a regression |
| R-P2-04 | The port differs from the frozen arms | medium, high | T-1 on every complete row; unit tests ported from the ig-proto self-tests |
| R-P2-05 | P6 changes the counted work and so a budget stop point | low, medium | [A] in 5.5; T-1 and T-4 |
| R-P2-06 | Hell 1 code ships unreachable and drifts before phase 3 | low, low | B-6 now; unit tests; phase 3 re-measures before any offer |
| R-P2-07 | Replay or steps break on new events | medium, medium | the two new fixtures; replay-model tests |
| R-P2-08 | Machine time overruns on a shared machine | medium, low | the ledger refuses past the allowance; the stage boundary; sampling off |
| R-P2-09 | Scope creep into N-V4-14 (the screen on `n-upper` and `n-large`) | low, medium | out of scope; a later proposal (stage4-report.md:413-414) |
| R-P2-10 | The suite passes 10 minutes or a browser check 1 minute (AGENTS.md:16-17) with Nightmare cases | medium, medium | small `gen-v4` cases (one or two puzzles, 10x10 or 14x14), the slow group; the suite timed in P2-08b |

**Performance.**
- Offered Nightmare boards should become faster: in the frozen round ×1.05 to ×2.09 on the controls, and `n-mid` ×2.3
  from the screen. The five failing boards get puzzles where today fails.
- Very easy to Master is unchanged: same puzzles and the same code path.
- Memory is unchanged: same models and caps.
- The deadline is unchanged in the Generator if Q-P2-3 is (a).

**Tests.**
- New suites for `select-v4.js`, `gen-v4.js`, the certificate, provenance shapes, the bound, the per-set prior, the
  route and the steps mapping; the two new fixtures.
- Expectations in the five replay-fixture consumers move to the new fixture; the two 10x6 fixtures change in their
  versions only.
- Run time: plus one slow Nightmare replay case and the pool-invariance case.

**Documents.** Listed in 5.10.

## 8. Effort and phasing

### 8.1 Task outline for `break-tasks`

| ID | Task | Role | Hours | Gate |
|---|---|---|---:|---|
| P2-01 | `gen-v4.js`: tables, ids, `usesGenV4`, route; digest test against the frozen data | dev | 2 | `npm test` |
| P2-02 | The screen certificate in `difficulty.js`; the rating-equality corpus | dev | 3 | T-2 |
| P2-03 | `select-v4.js` part 1: locate (P1, P3, P4 start, proofs, no-window) with ported unit tests | dev | 3 | unit tests |
| P2-04 | `select-v4.js` part 2: window, beam, stall, rescue, budget stop, skip ordinals, events, P6, `stats` | dev | 3 | T-4, T-5 |
| P2-05 | Dispatch in `selectClues`; scope and route tests; `gen-v4`'s P3 test; `:820` kept | dev | 2 | T-7 |
| P2-06 | Per-`algo` provenance (both shapes read and written), `made.igPrior`, skip bounds per `algo`, protocol and tasks fields; `ALGO_ID` still `gen-v3` | dev | 3 | T-6 (records part, on synthetic records) |
| P2-07 | Client: the bound, the per-set prior, `stats`; the real-worker no-window test; pool invariance | dev | 3 | T-3, T-8 |
| P2-08a | The version flip: `ALGO_ID` `gen-v4`; `generation-case.json`, `generated-sample-pack.json` and `replay-case-v4.json` recorded (version-only differences); the five replay consumers moved; `replay-case.json` as the refusal case | dev | 3 | T-6; `record-fixtures.mjs --check` |
| P2-08b | The Nightmare replay case: a second recipe in `record-fixtures.mjs`, its seed search and slow test; replay per `algo` with the table versions | dev | 2.5 | T-6 |
| P2-09 | Steps: types, replay-model mapping, EN and VI sentences, the `N-NOSET` variants, the saved-steps key | dev | 3 | locale and replay-model tests |
| P2-10 | User and developer guides (EN and VI in step), `README.md`, the release-notes text, N-P1-DOC; a consistency pass over design-brief and design-detail | dev | 2 | `npm run check`; SA review |
| P2-11a | Bench: the validation profile without sampling, `stats` in rows, the diagnostic offer | dev | 3 | dry run |
| P2-11b | `tools/ig-proto/phase2/p2-validate.mjs` and `.ps1`: plans, preflight, ledger, comparison, report | dev | 3 | an untimed equality smoke on two reps of four cells |
| P2-12 | `REPLAY` re-derived from measured `gen-v4` replays | dev + orchestrator | 1.5 | T-10 |
| P2-13 | Stage A (locked) | orchestrator | — | the stage-A reading by the SAs |
| P2-14 | Stage B (locked) | orchestrator | — | complete ledger |
| P2-15 | Validation report, jointly signed | SAs | — | section 6 |
| P2-16 | Browser smoke | orchestrator | 0.5 | T-11 |
| P2-17 | Push `gen-v4`; PR #14's description (changes, verification, release notes, phase 1's commits until PR #11 merges); never merge | orchestrator | 0.5 | the PR text |

- Developer total: about 38 hours in 14 tasks, each at most 3 h.
- Each task that changes behaviour updates its part of `docs/design-detail.md` and `docs/design-brief.md` in the same
  change (AGENTS.md:5): P2-02 §7.9 (the screen limit and its certificate); P2-03 and P2-04 §6.10 and §7.6 (the search),
  §8.3 (the call budgets); P2-05 §7.7 and §7.8 (the route and the lock text, line 1922); P2-06 §7.7 (provenance); P2-07
  §6.5, §6.9 and §7.5 with line 1805 (the bound, the per-set prior); P2-08a, P2-08b and P2-09 §6.12. Hence P2-10's
  smaller scope.
- Order: P2-01 to P2-10 in sequence. P2-11a/b may start after P2-07. P2-12 needs P2-08b. P2-13 needs every
  developer task. P2-15 needs P2-14.
- Owner stops:
  - the plan and price (now);
  - after stage A if a gate fails;
  - any decision the validation report raises (a failed gate in stage B, N-V4-15's reading).

### 8.2 Machine minutes (counted, through the lock)

Priced from the frozen rows' mean responses (`p2-price-basis.md`), plus 2.1 s per row and 45 s per invocation, sampling off:

| Item | Rows | Expected min | Ceiling min |
|---|---:|---:|---:|
| Stage A: N-V4-15 `require` (3 cells × 10 reps × 2 arms) | 60 | 47 | 127 (every row at 120 s) |
| Stage A: thin controls (3 × 20 × 2) | 120 | 31 | 40 |
| Stage A: non-table boards (4 × 10 × 2) | 80 | 40 (assumed 25 to 120 s per row today, 15 s `gen-v4`) | 70 (today fails on two) |
| Stage A: 26x26 route (5 × 2) | 10 | 4 | 5 |
| Stage B: other controls (6 × 20 × 2) | 240 | 118 | 140 |
| Stage B: failing boards (5 × 20) | 100 | 30 | 40 |
| Stage B: Master identity (16 × 5 × 2) | 160 | 26 | 30 |
| Stage B: Hell 1 (4 × 20) | 80 | 65 | 80 |
| `REPLAY` measurements and the equality smoke | about 40 | 16 | 28 |
| **Total** | **about 890** | **377** | **560** |

**Cap math.**
- The stages 2-4 round account is 871.2 of 1,725 counted minutes, 853.8 left [V stage4-report.md:274]. That grant and
  its harness window (D-V4-20) closed with V4-S4F, and D-S24-35 makes phase 2's price the owner's approval.
- Recommended: a new phase-2 grant of 480 counted minutes. That is the expected 377 plus a reserve; it covers the ceiling of
  stage A (242) and, at the stage boundary, the remaining stage B (290) only if stage A ends near its expectation.
- If the owner prefers the old grant: 871.2 + 480 = 1,351.2 ≤ 1,725.
- A stage whose ceiling exceeds the remaining allowance is not started without the owner.

## 9. Questions

### 9.1 For the owner

**Q-P2-1. Scope of the production validation.**
- Options:
  - (a) V-a: all of plan §6's gate on production, Hell 1 included by a tools-only diagnostic offer, plus four boards
    without a prior cell; about 377 counted min.
  - (b) V-b: Hell 1 by equality only now, its timed cells in phase 3; about 328.
  - (c) V-c: controls and the route only; about 170; leaves the failing boards unmeasured on production.
- Recommendation: (a).
- Evidence: plan.md:666; F-P2-02, F-P2-03; 8.2.

**Q-P2-2. Machine time and the stage-A stop.**
- Options:
  - (a) a new phase-2 grant of 480 counted minutes; stage B starts without a new question when stage A passes and the
    allowance covers stage B's ceiling.
  - (b) draw on the 853.8 minutes left of the 1,725-minute grant, with the same rule.
  - (c) another figure.
- Either way a failed stage-A gate (a control, a non-table board, `require`) comes back to you before stage B.
- Recommendation: (a).
- Evidence: 8.2.

**Q-P2-3. IG-P-D1's one deadline in the Generator.**
- Options:
  - (a) keep the two per-action limits (set: 115-s stop, 120-s answer; batch: the same). No 46-s set cap; the validation
    measures this.
  - (b) also cap the set action at 46 s (the frozen reserve).
  - (c) build a one-click "set and first batch" with one shared clock.
- Recommendation: (a). The reserve only protects a batch that shares the set's clock, which no Generator action does.
  (b) would only lose sets that finish between 46 and 115 s. (c) is new UI outside this scope.
- Evidence: F-P2-05; plan.md:331-339; `jobs.js:303-355, 357-440`.

**Q-P2-4. The domain of the 26x26 route.**
- Options:
  - (a) only the 26x26 rectangle;
  - (b) every Nightmare board above 576 cells, which is above the largest control that passed;
  - (c) 676 cells and up.
- Recommendation: (b). It fails closed where the gain fell to ×1.0006, and it has no user effect today because the
  Generator stops at 484 cells.
- Evidence: F-P2-01; stage4-report.md:66-82.

**Q-P2-5. The new user texts.**
- Approve the English and Vietnamese texts of 5.4 (the two `N-NOSET` variants and the six step sentences), and the change
  of the public "no early stop" statement for Nightmare and Hell 1 (design-detail.md:1805, release notes).
- Recommendation: approve as written.
- Evidence: V4-S4F, 0 false stops on 19 pairs; plan.md:805-808.

### 9.2 For the SAs jointly (delegated by the owner)

**Q-P2-S1. The budget table in provenance.**
- Options:
  - (a) keep IG-P-Q36's seven keys. `gen-v4` fixes `budget-s3-v1`, the bound, the rescue, (c4) off, no ranker and the
    route, and any change takes a new `algo`.
  - (b) add an eighth key `budgetTable`.
- Recommendation: (a). No refit of the budgets is planned, while the prior and screen tables have planned refits.
- Evidence: plan.md:526-531 (IG-P-Q36); plan.md:306-307 (the prior table's refit route); `fr-frozen.json` `callBudget`.

**Q-P2-S2. The production screen table's id.**
- Options:
  - (a) `screen-p2-v1` (190 M on Nightmare 196-256 only);
  - (b) reuse `screen-s3-v1`.
- Recommendation: (a). `screen-s3-v1`'s content gives 190 M to `n-upper` and `n-large`, so the same id would name two
  behaviours.
- Evidence: `freeze.json` `values.W`; stage4-report.md:36-55; F-P2-04.

**Q-P2-S3. Boards without a prior cell.**
- Options:
  - (a) port the exact-key rule (start at K - 8) and measure four such boards in stage A. If one fails, pilot a
    nearest-area share on fitting seeds (reps 0-4), freeze it, and validate it.
  - (b) adopt the nearest-area share now, with that pilot first.
  - (c) `gen-v4` only on table areas.
- Recommendation: (a). It is faithful to what was validated and decides early; `gen-v4` without a prior still avoids
  today's capped profiles (75.7 % of Nightmare raw attempts capped, `docs/difficulty-v3/calibration-2026-11-15.md:442-443`).
- Evidence: F-P2-03; `p2-prior-coverage.md`; plan.md:231-233; `ig-select-v4.js:199-205`.

**Q-P2-S4. Port equality as a gate (T-1).**
- Options:
  - (a) yes: every complete `gen-v4` row on a frozen cell must have the frozen shipped arm's puzzle keys (where a clock
    stop cut either request, the shorter list is a prefix); a difference is a port defect, fixed before any timing is read;
  - (b) no: timing and population only, as the plan's gate states.
- Recommendation: (a). It ties production to the validated evidence for no extra rows.
- Evidence: the frozen rows carry `run.details.igPuzzleKeys` (`tools/ig-proto/verdicts.mjs:237-245`, used for Master
  identity at :1263-1292); IG-P-D1 condition 2 (plan.md:335-336).

**Q-P2-S5. Validation seeds.**
- Options:
  - (a) reps 20-39 and Master 20-24, the frozen validation seeds; nothing was fitted on them, and they give paired port
    equality;
  - (b) the reserved reps 40-59.
- Recommendation: (a). Keep 40-59 reserved for a later refit (N-V4-14 or phase 3).
- Evidence: `freeze.json` `seeds.excluded` ("validation reps 20-39", "Master reps 20-24", "second validation reps 40-59").

## 10. Evidence index

| File or source | Content | Command |
|---|---|---|
| `docs/improve-generating-phase-2/evidence/sa-opus/p2-variant-chain.mjs`, `.md` | the frozen variant chains of `fr-frozen` and `fr-frozen-none`: edits per file, added modules, parameters | `node docs\improve-generating-phase-2\evidence\sa-opus\p2-variant-chain.mjs` |
| `docs/improve-generating-phase-2/evidence/sa-opus/p2-price-basis.mjs`, `.md`, `.json` | rows, reached ten, mean and max response per task, arm and cell of V4-S4 and V4-S4C; counted seconds per task | `node docs\improve-generating-phase-2\evidence\sa-opus\p2-price-basis.mjs` |
| `docs/improve-generating-phase-2/evidence/sa-opus/p2-prior-coverage.mjs`, `.md` | offered Nightmare rectangles per screen class and with or without a prior cell | `node docs\improve-generating-phase-2\evidence\sa-opus\p2-prior-coverage.mjs` |
| `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` | classes, bounds, `W`, budgets, deadline, seeds | read |
| `tools/ig-proto/data/prior-s3-v1.json` | the prior table (15 Nightmare and 12 Hell 1 cells) | read |
| `tools/ig-proto/variants/fr-frozen.json`, `v4-p5.json`, `instr.json`; `files/v4/core/engine/ig-select-v4.js`; `files/log/core/engine/ig-log.js` | the frozen implementation | read |
| `docs/improve-generating-stages-2-4/stage4-report.md` | class selection, controls, Hell 1, P5, F1-F7, §8 item 3 | read |
| `docs/improve-generating/plan.md` | P1-P5 (161-347), §5.1 (510-540), §6 (660-700), §9 (776-829) | read |
| `tasks/improve-generating-v4/check-list.md` | N-V4-07 (629), N-V4-12 (634), N-V4-15 (637), N-V4-16 (638), N-V4-21 (643) | read |
| Production code | `version.js`, `clues.js`, `generate.js`, `pack.js`, `replay.js`, `types.js`, `levels.js`, `policy.js`, `qualification.js`, `generation-client.js`, `generator/jobs.js`, `generator/state.js`, `generator/ui/replay-cache.js`, the locales, `tools/calibrate.mjs`, `tools/bench/runner.js`, `tools/record-fixtures.mjs` | read at `7c1bad2` |
| `docs/improve-generating/evidence/phase1/P6-bench/ledger.jsonl`, `old/*.json`, `new/*.json` | T14's counted seconds per invocation and its response sums (with sampling) | read; the sums by a one-line `node -e` over `run.responseMs` |
