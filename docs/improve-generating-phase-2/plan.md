# improve-generating phase 2: plan (`gen-v4` in production)

Status: Final (2026-11-25, base 7c1bad2)

| Item | Value |
|---|---|
| Authors | SA-Opus (drafter, round 1), SA-Astra (reviewer); joint technical decisions under the owner's delegation |
| Repository, branch | `Q:\git\pentomino`, `gen-v4` (draft PR #14 into `main`, not merged) |
| Base commit | `7c1bad226830667fa6626ff97c960ca3bddd7794` (the request on the published phase-1 head `6b94ffb`) |
| Governing plan | `docs/improve-generating/plan.md` v4 (P1 to P5, §5.1, §5.2, §6 phase 2, §9); D-S24-35 |
| Request, report, questions | [request.md](request.md), [report.md](report.md), [clarifications.md](clarifications.md) (no open questions; the owner's answers to Q-P2-1 and Q-P2-5 are D-P2-15 and D-P2-16) |
| Inputs | `sa-opus/round-1-analysis.md`, `sa-astra/round-1-analysis.md`, `sa-opus/round-1-cross-review.md` (§8.6), `sa-astra/round-1-cross-review.md`, `evidence/sa-astra/round1-cross-audit.*`, `evidence/sa-opus/p2-*`, SA-Astra's review `sa-astra/review-report-plan.md` (R1 to R6, applied) |
| Next workflow | `break-tasks` |

## 1. Goal

Put `gen-v4` into the production code for Nightmare and Hell 1 with the class choices the frozen round recorded, keep
today's search on the full 26x26 Nightmare board and on every level below Nightmare, prove compatibility and replay,
measure `require` on the largest boards first (N-V4-15), and repeat the frozen round's validation on the production
code with the population per cell, before anything ships. Neither PR is merged; no release follows by default.

## 2. Scope

### In

- The `gen-v4` search (P1 to P5) as a semantic rebuild in `core/`, behind `selectClues`, with phase 1's P6 kept.
- The route: `gen-v4` for Nightmare and Hell 1, except the exact full 26x26 Nightmare board (section 4.2).
- Identity: algo `gen-v4`, seven provenance keys, `prior-s3-v1`, `screen-v4-v1`, `made.igPrior`, the `gen-v4` skip
  bounds; old records kept and refused for replay by version.
- The deadline: separate 115/120-s scopes for the Generator's two actions; one 46/115/120-s scope for automatic
  `gen-v4`-route requests of the CLI and the bench; a real hard host guard over pack assembly.
- The bound of four same-side set attempts and its notices; the new Generation-steps events and texts in English and
  Vietnamese.
- Minimal reach counters in the production result; fixtures; `REPLAY` checked by measured resource replays; the
  living specification and both guides; N-P1-DOC.
- Measurement copies (no-screen, uncapped, Hell 1 diagnostic offer, trace) with their own identities, source-bound
  receipts and a phase-2 comparator; the production validation of section 7, approved by the owner (D-P2-15).
- Pushing `gen-v4` and writing PR #14's description, never merging.

### Out

- Hell 1 offers, `LISTED_LEVEL_IDS`, `AREAS`, device limits, BQ-1 or BQ-3 qualifications, a browser landscape, the blind
  play comparison (phase 3: N-V4-08, N-V4-09).
- The screen on `n-upper` or `n-large` (N-V4-14), any refit of a frozen value, a nearest-area prior, a new class.
- Hell 2 and above, P7, a production pool wider than four, a service level (N-V4-10), the score model, the policy id.
- Changing the phase-0 FAIL record, the frozen trees, plans, receipts or reports, or the reserved reps 40-59.
- A merge, release, tag or deployment.

## 3. Current state

| Area | State at `7c1bad2` | Evidence |
|---|---|---|
| Versions | app `1.0.0`, algo `gen-v3`, policy `mixed-v3`; five provenance keys | `core/engine/version.js:3-4`; `core/engine/pack.js:49-62` |
| Search | `gen-v3` with P6 (lean ratings, completed diagnostic); a capped profile is spent | `core/engine/clues.js:258, 273-280`; `tests/clues.test.js:820` |
| Set stage | parallel attempts, the lowest success wins, no bound | `core/browser/generation-client.js:595-690` |
| Clocks | the pool stops a request at 115 s (`performance.now`); `TIME.responseMs` (120 s) is defined but read nowhere; `finish(job)` precedes `assemblePack`; the Generator's job times use `Date.now` | `core/browser/worker-pool.js:132-136, 642-643`; `core/engine/policy.js:69`; `generation-client.js:1172-1186`; `generator/jobs.js:201` |
| Requests | the Generator's "New piece set" and "New puzzle" are two requests; the CLI makes a set and a batch in one invocation and defaults to 676 active cells | `generator/jobs.js:303-440`; `tools/generate.mjs:40, 548-562` |
| Limits | Generator page: 484 cells (desktop), 360 (phone); BQ-1 and BQ-3 not run; real pools 1 to 4 | `policy.js:24-31`; `qualification.js:15-17`; `generator/state.js:322-324`; `worker-pool.js:75` |
| Offers | Nightmare from 81 cells; no Hell level offered up to 676 cells | `core/engine/levels.js:22-34`; `policy.js:336-339` |
| Replay, steps | five-key `sameVersions`; `set-versions` and `record-versions` refusals; the saved-steps key holds `ALGO_ID` and `APP_VERSION` only | `replay.js:180, 331, 362`; `generator/ui/replay-cache.js:71-74` |
| Fixtures | `replay-case.json`, `generation-case.json` and `generated-sample-pack.json` record `gen-v3` | `tests/fixtures/*`; `tools/record-fixtures.mjs:502-541` |
| Frozen `gen-v4` | 88 anchored edits on `3fc65f4` with journals, `IG` globals and Node imports; its live deadline applied only with a host origin, which only the bench supplied | `evidence/sa-opus/p2-variant-chain.md`; `tools/ig-proto/variants/live.json` `lv-9`..`lv-12` |
| Frozen result | `n-mid` admitted (×2.30); failing boards 20 of 20; nine controls pass, 26x26 fails (FAIL recorded); Master identical; P5: no budget stop, the bound never fired, no `require` row in stage 4 | `docs/improve-generating-stages-2-4/stage4-report.md:36-126, 177-190` |
| Prior coverage | 15 Nightmare cells; 29 of 295 offered desktop rectangles (W <= H) have one; not a user-frequency statistic | `evidence/sa-opus/p2-prior-coverage.md` |

## 4. Design

### 4.1 Components (proposed names; `break-tasks` fixes them)

| Component | Role |
|---|---|
| `core/engine/gen-v4.js` | the frozen values as data: `prior-s3-v1` (27 cells), `screen-v4-v1`, `budget-s3-v1`, the bound 4, the re-rating rule, `deadline-s3-v1`, `SKIP_BOUNDS_V4`, the table ids, and the route predicate `usesGenV4(level, board)` |
| `core/engine/clue-primitives.js` | the primitives shared by the two selectors, so that `clues.js` and the new selector do not import each other |
| `core/engine/clues.js` | `selectClues` keeps its interface, retains the `gen-v3` selector and dispatches on the route |
| `core/engine/select-v4.js` | the port of the frozen selection without journals, globals or Node imports |
| `core/engine/difficulty.js` | a screen-limited search rating with its certificate, composed with P6 |
| `core/engine/generate.js`, `tasks.js`, `protocol.js` | `no-window-<side>` reasons, `igPrior` transport, `made.igPrior`, seven keys, counters passed through |
| `core/engine/pack.js`, `replay.js`, `types.js` | shapes per `algo`, comparison with the table versions, new phases, reasons and events |
| `core/browser/generation-client.js` | the bound, the per-set prior, request scopes |
| `core/browser/generation-deadline.js` | the DOM-free hard host guard, used by the client hosts, `tools/generate.mjs` and the bench |
| `generator/jobs.js`, `generator/ui/replay-model.js`, `generator/ui/replay-cache.js`, both locales | notices, steps, the saved-steps key |
| `tools/record-fixtures.mjs`, `tests/fixtures/` | the `gen-v4` replay cases, the refusal case separated from regeneration |
| `tools/calibrate.mjs`, `tools/bench/runner.js` | a validation profile without landscape sampling, counters in the rows |
| `tools/ig-proto/phase2/` | measurement copies, trace, plans, ledger, comparator and reports of section 7 |
| `tools/bench/report.js` and the phase-2 receipt/preflight code | extend `SOURCE_FILES` to the new runtime/table dependency closure; bind every row, proof and replay to its effective source, configuration and observer mode |

The new code stays inert until one cutover task switches the route and `ALGO_ID` together (section 9).

**Interfaces.**
- `selectClues(ctx)` keeps its signature. On the `gen-v4` route it reads `ctx.igPrior` (an override; absent means the
  table) and the request's uniqueness. It returns today's result plus the window record and the counters.
- `setAttempt` returns `{ ok: false, reason: 'no-window-below' | 'no-window-above' }` when its calibration ends without
  a window. The client's set result can end `no-window-below`, `no-window-above` or `reserve-cut`, with its `failures`.
- `puzzleCandidate` and the worker protocol accept an optional integer `igPrior`; worker results carry the counters.
  Both are validated like today's fields.
- `generateSet` and `generateBatch` accept an optional request scope made by the client from the pool's clock; without
  one, each action makes a fresh scope. The CLI and the bench make one scope for an automatic set and batch on the
  `gen-v4` route.
- Every host (Generator, CLI, bench) answers through the host guard of 4.5.

### 4.2 The route

- `usesGenV4(level, board)` is true for `hell-1`, and for `nightmare` unless the board is the exact full 26x26 board:
  normalized width 26, height 26 and 676 active cells. Display rotation does not change it. A masked 26x26 board or
  another 676-cell shape is not the exception (D-S24-35: "today's search is kept on 26x26 Nightmare and `gen-v4` is
  proposed for the other boards").
- Every other level, Very easy to Master and Hell 2 and above, runs `gen-v3`'s selection unchanged.
- The route governs the set calibration, the batch candidates, the completion pass, P5, the prior, the deadline scope
  and replay. A legacy-route request keeps today's set stage, timers and no budgets.
- Reach today: the Generator page offers Nightmare on 81 to 484 cells (360 on a phone) and no Hell 1. The CLI reaches
  the 26x26 exception and boards of 577 to 675 cells, which run `gen-v4` (class `n-large`, no screen) without a
  measurement of their own.

### 4.3 Versions and identity

- **One running version** (IG-P-Q34): every new record carries `algo: 'gen-v4'`, legacy-route puzzles included; a
  `gen-v4` build replays `gen-v4` records only.
- **Seven keys (IG-P-Q36).** The gen-v4 family (`gen-v4` and the frozen D-V4-05 namespace `gen-v4-proto:<variant>`)
  uses `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`, `priorTable`, `screenTable` and the gen-v4
  candidate/skip shape. Other algorithms, including `gen-v3`, retain their five-key shape. Reading/copying follows the
  record's own family; replay still requires equality with the running tuple, so an experimental record is
  unavailable in the shipping build rather than being replayed under its recipe. A record of the wrong shape for its
  family is dropped with the existing warning (`v4.json` `pv-7`, `pv-8`).
- **Tables:**
  - `priorTable: 'prior-s3-v1'`, the frozen content; a test compares its digest with
    `tools/ig-proto/data/prior-s3-v1.json`;
  - `screenTable: 'screen-v4-v1'`: 190,000,000 units on Nightmare boards of 196 to 256 active cells, and the canonical
    760,000,000 everywhere else. It is new because `screen-s3-v1` also screens `n-upper` and `n-large`.
- **The definition of `gen-v4`** fixes `budget-s3-v1`, the bound, the re-rating rule, (c4) off, no ranker,
  `deadline-s3-v1` and the route. A change to any of them takes a new `algo`; no eighth key.
- **`made.igPrior`**: an integer from 1 to 128, or null when no per-set override was used. On replay a null is omitted,
  so the table applies; passing `ctx.igPrior = null` would disable the table (`v4.json` `pv-17`).
- **Skip ordinals**: subsets below 2,192 and repairs below 64 for `gen-v4`; 2,128 and 64 for `gen-v3`.

### 4.4 The search (port contract)

For identical selector-call inputs and observer/skip configuration, the port preserves the frozen primitive work and
skip ordinals. At request level it preserves deterministic puzzle keys in fold order. P6 and clock cuts may change
speculative work and the returned prefix length, not keys within a genuine common prefix. Aggregate request-work
equality is not claimed; current work intervals are measured. An empty/no-set prefix is no positive equality evidence.

| Part | Contract |
|---|---|
| P1 | the locate of plan P1 (`plan.md:161-239`): nested family, march from the start count, bisection, window choice, the AR1 direction (a refused profile keeps its canonical score for direction, never for acceptance or the stall count) |
| P2 | screen ratings at `W`; certified when the main-phase work (`work - censusWork`) is at most `W`, then equal to the canonical rating; otherwise screen-capped: direction only, never accepted, never shown as a score; the rescue re-rates screen-capped locate probes, sharing the allowance of four with the tail re-rating |
| P3 | a capped profile is `TOO_FEW`, a direction; `tests/clues.test.js:820` keeps pinning `gen-v3`, and `gen-v4` gets its own test |
| P4 | Exact key `<level>@<active cells>` in `prior-s3-v1`: start `clamp(round(share × K), 1, K - 2)` with step 1; without a cell, start `clamp(K - 8, 1, K - 2)` with step 8 (no interpolation or refit). On Hell 1, apply the frozen per-set rule to the batch's usable calibration: its solution and clue poses must be self-consistent for the current board/pieces, its rating must name the target level, and the current `require` mode additionally needs `certificate.status === 'unique'`. A valid `igWindow.wc` supplies the clamped start for every ordinary candidate, including candidates on different layouts and later batches where the calibration's keys are already seen. Do not compare the calibration's original uniqueness mode or require an unseen calibration. Otherwise use the table. The completion pass takes no per-set override; calibration remains session-only. |
| P5 budget | per call: `any` 10,000,000,000 units (Nightmare), 40,000,000,000 (Hell 1); `require` 32,000,000,000 and 40,000,000,000. Checked before each primitive, so the last primitive can overshoot; the uniqueness repair's `onAdd` check is always installed; at the stop `any` may return a waiting in-band result, `require` only a finished unique final; no rating or count starts after it |
| P5 bound | the request's set stage ends `no-window-below` or `no-window-above` when attempts 0 to 3 all ended without a window on the same side. A budget stop has no side. The bound is read before the ordered winner scan, so a later success cannot override it |

P4's tests include the low-K fallback clamp, reuse after the calibration's layout/clue keys are seen, a new candidate
layout, and the unique-certificate condition when the current request changes to `require` (`ig-select-v4.js:194-205,
947-950`; `v4-ps.json` `ps-5` to `ps-7`; `ps-levels.json` `fz-3`).

### 4.5 The deadline

- **Generator actions.** "New piece set" and "New puzzle" each get a fresh monotonic scope from the pool's clock: a
  115-s generation stop and a 120-s hard response bound, no reserve. No clock spans the user's pause, and no `Date.now`
  reading reaches the pool.
- **Automatic requests.** A `gen-v4`-route CLI request and a bench row make the set and the batch under one scope with
  `deadline-s3-v1`:
  - the set stage is cut at 46 s (reserve 0.6);
  - generation stops at 115 s;
  - the response is bounded at 120 s, the host acting at 119 s (1-s margin).
- **Legacy routes** (Master and below, the 26x26 exception) keep their two timers.
- **The set loop order:** cancellation or time-out, the same-side bound, the ordered winner scan, the reserve cut, a new
  dispatch.
- **Host guard.** `generation-deadline.js` covers the whole operation, including pack assembly. At the work stop it
  cancels outstanding tasks. At the hard bound, an unsettled set operation returns
  `{ status: 'failed', reason: 'response-bound', failures: {} }`, leaving the previously displayed set unchanged. An
  unsettled batch returns `partial` / `response-bound` with its consumed, validated fold prefix, `made` records and
  seen histories (no pack when that prefix is empty), without awaiting a held assembly. Late set or batch completions
  are fenced by request id and revision; only one terminal result is delivered. A shown puzzle remains in history. The
  guard is cleared on every terminal path (`live.json` `lv-14`: distinct set and batch races).

### 4.6 Counters and traces

- **Counter ownership.** The selection result carries per-call integer counts for budget stops, screen-capped
  profiles, rescue and tail re-ratings. `setAttempt` transports the terminal no-window side. The client set-stage loop,
  not the selector, counts set attempts and bound firings. These fields reach the benchmark without `record`, `onRate`
  or rating detail, and are not provenance identity fields (`v4-p5.json` `p5-1` to `p5-3`).
- **The validation** takes primitive starts, ends and cancellations from an identified trace in the measurement copies
  of both arms. It is proved not to change puzzles, work or skips; no claim of zero overhead is made. The counters
  alone cannot bound work abandoned by a cancellation.
- **Browser deadline checks** run on the shipping build.
- **N-V4-16's ordered glue record.** For each gen-v4 row, retain the first four set-attempt outcomes/reasons and their
  decision/transport ordering, whether the same-side condition was met, whether the client bound fired, and the public
  terminal reason. Per arm and cell report natural same-side matches, firings and `set:no-window-*` rows. List every
  same-side match without the expected public reason, distinguishing the declared higher-priority cancellation/time-out
  from an unexplained transport/order defect. Keep the real-worker synthetic-ratings test. Zero natural matches is
  still "unexercised", not a real-data pass (F2, `stage4-report.md:286`).

### 4.7 Records, replay and fixtures

- `tests/fixtures/replay-case.json` stays byte for byte: it loads, keeps its provenance through a load and a save, and
  replays "unavailable" with `set-versions`.
- A new `gen-v4` replay fixture re-records the Hard recipe; the five readers (`replay`, `replay-model`, `protocol`,
  `tasks`, `generation-client` tests) move to it. A second `gen-v4` case covers the screen path on a Nightmare board of
  196 to 256 cells (at least one locate and one screen-capped event), found by a bounded seed search. It is marked slow
  where needed, within the 10-minute suite limit.
- The large 26x26 legacy-route replay runs in the legacy-route proof bundle under the lock, not in `npm test`.
- `generation-case.json` and `generated-sample-pack.json` are re-recorded with `record-fixtures.mjs --replace --reason`.
  Only the versions change; the semantic keys and scores must not (a scope proof). `record-fixtures.mjs` checks the
  refusal case apart from regenerating the matched cases.
- New events (phases `locate`, `window`, `rescue`; reason `screen-capped`; budget and no-window ends) map to steps. A
  screen-capped step shows no score.
- The saved-steps key includes the running seven-key tuple, or the tuple is checked before a cached result is shown.
- `REPLAY` (steps, bytes, work) is checked against measured `gen-v4` replays, the budget overshoot included. A bound is
  not raised to make an incomplete replay pass.
- The eight real replay-resource probes run once in P2-19, charged to the approved stage-A allowance, on the cutover
  source. Fixture preparation and ordinary bounded regression checks are separate from those measured probes. The task
  pack fixes the fixture-search candidate set/time limit and excludes reserved reps 40-59. If the probes establish
  adequate margin, keep the limits. If a limit, fixture or runtime change is needed, stop for the pack author's ruling;
  do not turn an incomplete replay into a pass by increasing a limit in place.

### 4.8 Migration and compatibility

- **No data migration.** `gen-v3` sets, packs and histories load and play unchanged. Their Generation steps are
  unavailable with today's reasons, and so are the steps of a new puzzle made on a set saved before the release
  (`plan.md:792-795`).
- **Nothing is restamped;** old records keep their five keys through a load and a save.
- **Forward compatibility.** An older build reading a `gen-v4` pack drops the `made` record it cannot read, with a
  warning, and keeps the puzzles. One check with the `6b94ffb` reader confirms it.
- **The pack and puzzle-code formats, the app version, the policy, the RNG and the seed scheme do not change.**

### 4.9 User texts (English and Vietnamese)

Agreed by both SAs and approved by the owner (Q-P2-5, D-P2-16):

| Key | English | Vietnamese |
|---|---|---|
| `replay.step.locate` | Clue set {sequence} ({count} clues) is rated to find how many clues this level needs: score {score}. | Nhóm mảnh đặt sẵn {sequence} ({count} mảnh) được chấm để tìm số mảnh đặt sẵn mà mức này cần: điểm {score}. |
| `replay.step.screenCapped` | The quick rating of clue set {sequence} reached its work limit. It only guides the search; it has no score. | Lần chấm nhanh nhóm mảnh đặt sẵn {sequence} đã chạm giới hạn phép tính. Kết quả chỉ định hướng việc tìm kiếm; không có điểm. |
| `replay.step.rerate` | Clue set {sequence} is rated again with the full limit: score {score}. | Nhóm mảnh đặt sẵn {sequence} được chấm lại với giới hạn đầy đủ: điểm {score}. |
| `replay.step.rerateCapped` | The full rating of clue set {sequence} also reached its limit, so it has no score. | Lần chấm đầy đủ nhóm mảnh đặt sẵn {sequence} cũng chạm giới hạn nên không có điểm. |
| `replay.step.budget` | This clue search reached its work limit: no further rating or uniqueness check was started. | Lần tìm các mảnh đặt sẵn này đã chạm giới hạn phép tính: không bắt đầu thêm lần chấm điểm hay kiểm tra tính duy nhất nào. |
| Guide sentence, `USERGUIDE.md` / `USERGUIDE.vn.md`, after the piece-set paragraph | For a Nightmare set, if the first four piece sets tried all end the same way without a puzzle of the level, the Generator stops early and says so, instead of running to the time limit. | Với bộ mảnh mức Ác mộng, nếu bốn bộ mảnh thử đầu tiên đều kết thúc theo cùng một cách mà không tìm được đề đạt mức, trình tạo dừng sớm và báo lý do, thay vì chạy đến hết thời gian cho phép. |
| `notice.N-NOSET.below` | Couldn't create a {level} piece set for this board: on the first four piece sets tried, the search went down to one clue without finding a {level} puzzle. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, việc tìm kiếm đã giảm tới một mảnh đặt sẵn mà không tìm được đề mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `notice.N-NOSET.above` | Couldn't create a {level} piece set for this board: on the first four piece sets tried, the search went up to the largest allowed number of clues without finding a {level} puzzle. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, việc tìm kiếm đã tăng tới số mảnh đặt sẵn tối đa cho phép mà không tìm được đề mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `replay.step.noWindow.below` | The search reduced the number of clues to one without finding a clue set at this level. | Việc tìm kiếm đã giảm số mảnh đặt sẵn tới một mà không tìm được nhóm mảnh đặt sẵn đạt mức này. |
| `replay.step.noWindow.above` | The search increased the number of clues to the allowed maximum without finding a clue set at this level. | Việc tìm kiếm đã tăng số mảnh đặt sẵn tới mức tối đa cho phép mà không tìm được nhóm mảnh đặt sẵn đạt mức này. |

- **Existing notices reused:** a reserve cut shows the existing `notice.N-NOSET`, and a batch cut by the response bound
  shows the existing `notice.N-PARTIAL`. `batchShortfall` maps the new reason (`generator/jobs.js:132-164`).
- **The four no-window strings** state only what the search did, never a property of every clue count. The owner
  approved the plain-language wording above (D-P2-16); SA-Astra's technical alternative ("without finding a suitable
  window") was not selected. If the owner rewords a text later, that is an ordinary text task with no behaviour
  change, and the new wording must stay as accurate.

### 4.10 Documents

Each task that changes behaviour updates the living specification in the same change (`AGENTS.md:5`).

- **`docs/design-detail.md`:**
  - §6.5 and §6.9: the bound, the per-set prior, the counters;
  - §6.10 and §7.6: the `gen-v4` search, the route;
  - §6.12: events and steps;
  - §7.5, line 1805: the statement in 4.11 replaces "no fail-fast" for the `gen-v4` route;
  - §7.7: `gen-v4`, the seven keys;
  - §7.8: retain the historical MP12b2/MP12b3 `gen-v3` lock and its evidence. Add a later, explicitly versioned
    `gen-v4` qualification paragraph with the phase-2 source/receipts and route; the rating/model/policy locks remain
    unchanged. Do not relabel the old calibration as `gen-v4` (`design-detail.md:1922` names a historical commit and
    qualification);
  - §7.9: the screen limit and its certificate;
  - §8.2 to §8.4: budgets, scopes, the host guard.
- `docs/design-brief.md:100`: the new notice; line 29 already covers older versions' steps.
- `USERGUIDE.md` and `USERGUIDE.vn.md`: the sentence of 4.9.
- `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`: the new fixture modes, the phase-2 tools, and the `tools/ig-proto/`
  line (N-P1-DOC, needed before any merge because PR #14 carries phase 1).
- `README.md`, if its feature list names the generator's behaviour.
- `tools/ig-proto/README.md`: the phase-2 tools.
- PR #14's description: the release notes, the phase-1 dependency, no merge.

### 4.11 The design statement that replaces "no fail-fast" (English; `design-detail.md:1805`; approved, D-P2-16)

> **No fail-fast on today's route (owner decision P-OD12); a bounded set stage on `gen-v4`'s route.** On today's route
> no fail-fast is built: a set request whose attempts all end `not-in-band` runs to its time limit. On `gen-v4`'s route
> (Nightmare and Hell 1, except the full 26x26 Nightmare board) a set request ends early with the reason
> `no-window-below` or `no-window-above` when its first four attempts all end without a window on the same side (P5;
> the notices `N-NOSET.below` and `N-NOSET.above`). The frozen validation never saw the bound fire (F2), so its
> false-stop rate on real requests is not established.

## 5. Decisions

Joint-SA rows were accepted by both SAs under the owner's delegation ("2 agent SA tự phối hợp tìm câu trả lời, không
cần hỏi Fable", `request.md:29-31`). Their records are the two cross-reviews and SA-Astra's review of the drafts
(`sa-astra/review-report-plan.md`). D-P2-15 and D-P2-16 record the owner's answers to the two questions; their full
text, as answered, is `sa-opus/answered-questions.md` (also preserved in `evidence/sa-astra/joint-review-audit.json`,
`reviewedDrafts`).

| ID | Decision | Decided by | Date | Source commit / record |
|---|---|---|---|---|
| D-P2-01 | Phase-2 scope: `gen-v4` for the other boards with the recorded class choices; today's search kept on 26x26 Nightmare; the pack implements the route, proves compatibility and replay, measures `require` first (N-V4-15), repeats the validation on the production code and returns with its plan and price before anything runs or ships; Hell 1 offer rules unchanged; the phase-0 FAIL stays recorded | Owner (D-S24-35, Q-T16 (a)) | 2026-11-25 06:25 | `ca46067`; `7c1bad2` (`request.md:35-40`) |
| D-P2-02 | Two PRs: phase 2 on `gen-v4` from the published phase-1 head, a new PR into `main`; neither merged | Owner | 2026-11-25 07:46 | `c63c553`; `7c1bad2` |
| D-P2-03 | The two SAs answer supervisor-level questions jointly, without Fable | Owner | 2026-11-23 | `7c1bad2` (`request.md:29-31`) |
| D-P2-04 | A semantic rebuild with a retained `gen-v3` selector and shared primitives; no frozen globals, journals or Node imports; inert until one cutover task | Joint SAs | 2026-11-25 | both cross-reviews; this plan |
| D-P2-05 | The route of 4.2: `gen-v4` for Nightmare and Hell 1 except the exact full 26x26 Nightmare board (26 by 26, 676 active cells, rotation-independent), on every stage; the proposal "every Nightmare board above 576 cells" is withdrawn as broader than D-S24-35 | Joint SAs, implementing D-P2-01 | 2026-11-25 | both cross-reviews |
| D-P2-06 | Identity of 4.3: one running version, seven keys, `prior-s3-v1`, `screen-v4-v1`, budgets, bound, deadline and route inside the `gen-v4` definition, `made.igPrior` with null omitted on replay, skip bounds per `algo` | Joint SAs (IG-P-Q34, IG-P-Q36) | 2026-11-25 | both cross-reviews |
| D-P2-07 | The prior of 4.4: exact key, otherwise `clamp(K - 8, 1, K - 2)` with step 8; on Hell 1 the frozen per-set rule from the batch's usable calibration (self-consistent for the current board and pieces, rated at the target level, a unique certificate when the current request is `require`), for every ordinary candidate; otherwise the table | Joint SAs; contract wording per SA-Astra's R1 | 2026-11-25 | both cross-reviews; `sa-astra/review-report-plan.md` R1 |
| D-P2-08 | The deadline of 4.5: Generator actions 115/120 s each; one 46/115/120-s scope for automatic `gen-v4`-route CLI and bench requests; legacy timers on legacy routes; a real host guard over assembly. The standalone 46-s cut is withdrawn | Joint SAs, applying IG-P-D1 per request | 2026-11-25 | both cross-reviews; `live.json` `lv-9`..`lv-12` |
| D-P2-09 | Records, replay and fixtures of 4.7 | Joint SAs | 2026-11-25 | both cross-reviews |
| D-P2-10 | Counters of 4.6: minimal integers (per call in the selection result; set attempts and bound firings in the client's set loop), N-V4-16's ordered glue record per row, a symmetric proved trace in the measurement copies, browser deadline checks on the shipping build | Joint SAs | 2026-11-25 | both cross-reviews; `sa-astra/review-report-plan.md` R4 |
| D-P2-11 | Hell 1 is measured only through a labelled measurement copy with the diagnostic offer; no production switch, no offer change | Joint SAs | 2026-11-25 | both cross-reviews |
| D-P2-12 | The validation design of section 7, including the seeds as a source-port replication, the conditional P5 twins and their reporting rules, the 140 sentinel rows and N-V4-15's 50 rows; its price, 812 counted minutes, is approved and funded by D-P2-15 | Joint SAs; funding: owner (D-P2-15) | 2026-11-25 | both cross-reviews; `evidence/sa-astra/round1-cross-audit.*`; `evidence/sa-opus/p2-xr-verify-astra.md` |
| D-P2-13 | Pools stay 1 to 4; width 8 by the fold simulation | Joint SAs | 2026-11-25 | `worker-pool.js:75`; phase-1 P1-02 |
| D-P2-14 | The texts of 4.9 and the statement of 4.11, with the plain-language wording of the four no-window strings; approved by the owner (D-P2-16) | Joint SAs; texts: owner (D-P2-16) | 2026-11-25 | both cross-reviews (§6 of SA-Astra's, §8.6 of SA-Opus's) |
| D-P2-15 | Q-P2-1, option (a): the production validation of section 7 is approved, with a separate phase-2 ledger of 812 counted minutes: stage A, 410, first; stage B, 402, only after the SAs' stage-A readout. 812 is a spend cap, not an assurance of completion (1,303 at the sentinels' row limits). The closed round's 853.8-minute balance is not used, and nothing rolls over | Owner: "Q-P2-1: đồng ý duyệt." ("approved") | 2026-11-25 15:06:53 +07:00 | Discord message `1575060196269490259`; the question: `sa-opus/answered-questions.md` |
| D-P2-16 | Q-P2-5, option (a): the texts of 4.9 with the plain-language wording B of the four no-window strings, the guide sentence, and the statement of 4.11 replacing "no fail-fast" at `design-detail.md:1805`. The owner may reword later; that is an ordinary text task with no behaviour change | Owner: "Q-P2-5: đồng ý duyệt, tôi sẽ sửa sau nếu thấy không phù hợp." ("approved; I will change it later if I find it unsuitable") | 2026-11-25 15:06:53 +07:00 | Discord message `1575060196269490259`; the question: `sa-opus/answered-questions.md` |

## 6. Acceptance criteria

### Business

| ID | Criterion | Verified by |
|---|---|---|
| P2-B01 | The five formerly failing Nightmare boards (12x12, 14x14, 15x15b10, 16x16, 15x20) reach ten on at least 18 of 20 requests each, with no dead-end entry | stage B rows; plan §5.2 completion gate (`plan.md:626-629`) |
| P2-B02 | No regression on the ten controls: each new-search control reaches ten on at least 18 of 20, with a one-sided 90 % lower bound of at least 0.9 on today over `gen-v4` capped T10. 18x18 keeps the plan's tail clause. 26x26 runs today's search, identical puzzles, timing reported | stages A and B; plan §5.2 no-regression (`plan.md:642-645`) |
| P2-B03 | Very easy to Master and the 26x26 exception return today's puzzles (16 Master cells, reps 20-24) | identity in the comparator |
| P2-B04 | The sentinels without a prior cell: 11x11, 18x19 and 21x21 pass the B02 gate (declared before the run, with no inherited exemption); 15x15 reaches ten on at least 18 of 20 | stage A |
| P2-B05 | `n-mid` keeps its screen only if (c5) passes on production code. If (c5) fails or is inconclusive on production, stop publication and present the no-screen fallback and its new table identity to the owner before changing the selected configuration or continuing qualification. No refit on validation seeds and no automatic relabelling of already measured rows | stage B; plan §5.2 (c5) |
| P2-B06 | Report population (clue share, score position, census-estimate share and completion) per measured cell and arm, beside its timing. Give contemporaneous two-sided comparisons where the approved matrix has paired arms; label any historical population separately and never imply a fresh today's arm on an unpaired cell. Hell 1 is reported against 18/20, not gated for an offer | the validation report |
| P2-B07 | `require` (N-V4-15) read before the main matrix: completion, uniqueness, budget and deadline stops on the largest boards | stage A |
| P2-B08 | Users see the approved texts in English and Vietnamese. Old puzzles stay playable, with their steps refused by version. No shown puzzle leaves the history | locale and controller tests; browser checks |

### Technical

| ID | Criterion | Verified by |
|---|---|---|
| P2-T01 | Port equality: every eligible measured row has its reference's puzzle keys in slot order. On a clock-cut row the common prefix matches; an empty prefix is no evidence | the comparator, before any ratio is read |
| P2-T02 | Rating equality: certified screen ratings deep-equal canonical ones on a corpus; P6 composes (lean, completed, detailed) | `npm test` |
| P2-T03 | Observer parity: same keys, work and skips with no observer, `charge`, and `record` with `charge`; a throwing observer propagates | `npm test`; proof bundles |
| P2-T04 | Budget determinism, the overshoot rule, `require` returns only a finished final | `npm test` |
| P2-T05 | The bound: same side, mixed sides, budget stops, a later success; real-worker reason transport | `npm test` |
| P2-T06 | Pool invariance at 1, 2 and 4 real workers and 8 in the fold simulation; under a clock cut, results are common-slot prefixes | `npm test` |
| P2-T07 | Provenance and replay of 4.3 and 4.7: the refusal case, the matched cases, the table-version mismatch, the saved-steps key, the 10x6 fixtures with only their versions changed | `npm test`; `record-fixtures.mjs` checks |
| P2-T08 | The route of 4.2: boundary areas 144/145, 195/196, 256/257, 324/325, 359/360; masked 26x26 and other 676-cell shapes; rotation; legacy levels | `npm test` |
| P2-T09 | The deadline of 4.5 on fake clocks: reserve, stop, typed set failure and batch-prefix return through separately held set and batch assemblies, late messages, repeated cancel, a fresh action after a long pause | `npm test`; browser checks |
| P2-T10 | Per-cell F2/F4/F7 readings: N-V4-16's ordered condition/firing/public-reason reconciliation, budget stops, and rescue/tail re-rating starts and completions; zero reach remains unexercised. Conditional P5 coverage uses §7.5's disjoint analytical-only, observed-pair and unresolved categories | the validation report |
| P2-T11 | `REPLAY` holds on the measured `gen-v4` replays with margin | resource replays |
| P2-T12 | Memory at four workers: process peak at most 1,536 MiB, accounted at most 1,196 MiB, `model-too-large` 0 | the validation report |
| P2-T13 | `npm test` within 10 minutes, every browser check within 1 minute, `npm run check`, files CRLF and UTF-8 without BOM | the commands |
| P2-T14 | The new runtime/table files are fingerprinted; altered experimental recipes have distinct identities; every proof/row/replay/browser receipt is source/configuration bound. A changed new module or table makes the receipt stale and fails preflight | focused fingerprint/binding tests and the sealed manifest |

**The plan's phase-2 gate** (`plan.md:666`), "the frozen round's validation repeated on the production code, the
controls included; the population reported per cell", is P2-B01 to P2-B03, P2-B05 and P2-B06, read with P2-T01.
P2-B04 and P2-B07 are this plan's additions: the sentinels and N-V4-15.

## 7. Validation design

### 7.1 Settings

- **Runs:** Node v26.13.0, four workers, cold, one fresh process per request, quantity ten, no landscape sampling.
  Every run goes through `tools\ig-proto\lock\ig-lock.ps1` with a 45-s quiet period, in a new `P2-*` ledger namespace;
  no frozen tree, plan, receipt or namespace is changed.
- **Arms:**
  - `today`: the phase-1 source `6b94ffb`;
  - `gen-v4`: the phase-2 commit after the cutover;
  - measurement copies of `gen-v4`: no-screen for `n-mid`, uncapped (no call budget, no bound, no live deadline,
    today's two timers), and the Hell 1 diagnostic offer.
  - The trace instrumentation is the same in every arm and is labelled.
- **Seeds:**
  - `landscape/<cell>/<rep>`, reps 20-39 (Master 20-24): a source-port replication, not an independent confirmation,
    and nothing is fitted or retuned on them;
  - `ig-p2/require/<cell>/<rep>`, reps 0-4 for `require`;
  - reps 40-59 stay reserved (N-V4-04).

**Counterfactual identities and source binding.** Use distinct experimental identities for altered recipes:
`gen-v4-proto:p2-none` with `screen-p2-none-v1` (no screen), and `gen-v4-proto:p2-uncapped` with the selected
production prior/screen tables but P5's budget, bound and combined deadline disabled. A diagnostic-offer or trace layer
is separately identified in the receipt, including when combined with a counterfactual. These copies are never
published as the shipping build.

Extend the candidate's `SOURCE_FILES` closure to `core/engine/gen-v4.js`, `core/engine/clue-primitives.js`,
`core/engine/select-v4.js`, `core/browser/generation-deadline.js` and any separately loaded table/runtime modules.
Baseline receipts bind the `6b94ffb` runtime and its explicitly identified measurement adapter; do not claim that the
adapter is an unmodified old CLI. Browser receipts additionally bind the host/controller and locale/cache code they
exercise. Each receipt records the runtime source digest/base, driver and patch hashes, effective configuration,
observer mode, seeds/settings, and raw evidence bindings. Preflight rejects drift (today `SOURCE_FILES` is a fixed list
of 40 files, none of them new, `tools/bench/report.js:36-49`).

### 7.2 Population

| Component | Cells x repetitions x arms | Rows | Stage |
|---|---|---:|---|
| Shipped paths | 19 Nightmare and Hell 1 cells x 20 x 1 (26x26 by the legacy route) | 380 | A: 3x29, 32x15, 22x22; B: the rest |
| Today's controls | 10 x 20 x 1, 26x26 included | 200 | A: 3x29, 32x15, 22x22; B: the rest |
| Master identity | 16 x 5 x 2 | 160 | B |
| `n-mid` without the screen | 3 x 20 x 1 (14x14, 15x15b10, 16x16) | 60 | B |
| Sentinels without a prior cell | 11x11, 18x19, 21x21 x 20 x 2; 15x15 x 20 x 1 | 140 | A |
| `require` (N-V4-15) | Nightmare 22x22 and 32x15 x 5 x 3 (today, `gen-v4`, uncapped); Hell 1 22x22 and 32x15 x 5 x 2 (`gen-v4`, uncapped) | 50 | A |
| Smoke | 8 x 1, rep 20: 14x14, 10x10, 18x18, 22x22 and 26x26 Nightmare, 20x20 Hell 1, 15x20 Nightmare, 10x10 Master | 8 | A, first |
| Conditional uncapped twins | 10 known triggers and 5 slots | 15 planned | B |
| **Total** | 998 unconditional, 15 conditional | **1,013** | |

Also: four proof bundles (observer parity, the certificate, prior and replay identity, legacy-route isolation), eight
resource replays and six browser checks, all in stage A before the broad matrix.

### 7.3 Order and proof before interpretation

1. The four proof bundles, then the eight smoke requests. They are correctness observations, never pooled into the
   20-row cohorts.
2. Stage A: N-V4-15, the sentinels, the thin controls (3x29, 32x15, 22x22, both arms), the resource replays, the browser
   checks. The SAs read stage A; a failed gate goes to the owner before stage B.
3. Stage B: the rest of the matrix, then the conditional twins.
4. **Equality before interpretation.** Every eligible measured row is compared with its reference before any ratio is
   read:
   - the references are `fr-frozen` for `n-mid` and `fr-frozen-none` for the other shipped `gen-v4` cells. Today's
     controls and the legacy routes (26x26, Master) are compared with `log-link` and the `6b94ffb` source. The `n-mid`
     no-screen copy is compared with `fr-frozen-none`, and an uncapped twin with the matching V4-S4C uncapped row;
   - a difference stops the plan as a port defect;
   - the frozen clock-cut rows are 14x14 Hell 1 reps 21, 26, 27, 30, 31, 34, 36, 37 and 38 (stopped at 115 s) and rep 33
     (reserve cut);
   - the sentinel and `require` cells have no frozen oracle;
   - work and skip parity come from the proof bundles.

### 7.4 Gates

They are the plan's §5.2 recipe (`plan.md:589-646`):
- capped T10 at 120 s;
- per-seed ratios;
- the 10th percentile of 10,000 resamples of the seeds, resample seed 20261116.

The gates themselves are section 6's. (c5) for `n-mid` needs at least 15 matched sets per cell, the clue tolerance, the
speed rule (geometric mean at least 1.15, lower bound above 1.0, no cell below 1.0), non-worsening work on proved bounds
(IG-P-Q37) and completion within one request in 20.

### 7.5 The conditional P5 comparator and its report

- **Eligible rows:** the 360 shipped `gen-v4` rows (the legacy 26x26 excluded) and the 80 `gen-v4` sentinel rows. The
  20 bounded `require` rows have unconditional twins already.
- **Trigger, fixed before the run.** The production row or its frozen counterpart shows any of:
  - fewer than ten puzzles;
  - a set attempt ended `no-window-*`, or the bound fired;
  - a call budget stop;
  - a reserve cut, the work stop or the host bound.

  A missing outcome or reach field is unknown, never zero.
- **The twin:** the same request on the uncapped copy.
- **Readings:** a false stop is a bound firing whose twin makes a set; a lost completion is a bounded row below ten
  whose twin reaches ten (`tools/ig-proto/verdicts.mjs:1366-1441`).
- **Analytical zeros.** A valid bounded row that reaches ten, or that has no set-bound reason, contributes an analytical
  zero. It is not an observed pair, and not a proof that P5 did no work.
- **The report's columns:** eligible rows, analytical zeros, observed pairs, false stops, lost completions, and required
  twins still missing. The coverage categories are disjoint:
  - analytical-only: both endpoints settled, no measured twin;
  - observed pair: any row with a measured twin, even if its zero was deducible;
  - unresolved: a required twin is missing.

  A row whose false-stop contribution is zero still needs its twin while its loss is unresolved. The unchanged
  `p5Stops` reader is not used, so a missing pair is never read as a success.
- **Allowance.** Fifteen is a priced allowance, not a quota; the scope covers up to 440 twins. More than fifteen is a
  finding, repriced inside the authorized funds; otherwise the plan stops and the endpoint is marked incomplete. A
  required twin is never dropped.

### 7.6 Price

`node docs\improve-generating-phase-2\evidence\sa-astra\round1-cross-audit.mjs` gives the enumerated schedule.
`node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-verify-astra.mjs` reproduces it independently: 1,013 of
1,013 rows equal, and both stage schedules exact.

- **Per row:** the matching frozen arm and cell mean response + 2 s, an assumption. The frozen row steps really took
  0.99 to 1.08 s beyond their responses. No credit is taken for P6.
- **`require`** rows are priced at their row limits: 130 s for `gen-v4`; 260 s for today's two timers and the uncapped
  copy.
- **Twins:** the ten known ones at their matching V4-S4C row + 2 s; the five open slots at 260 s.
- **Items:** the proof bundles at their measured cost of 1,400.916 counted s (V4-S4's four parity steps); the resource
  replays at 533 s; the browser checks at their enforced ceiling of 990 s.
- **Schedule:** a stage driver with paired arms interleaved and a checkpoint at every row. Each invocation has a 2-s
  start-up and an 885-s horizon. A row is admitted while elapsed + row limit + 10 <= 885. The helper kills at 900 s;
  the quiet period counts 45 s.
- **Guard:** 1.25 x counted, a spend cap (the browser checks at their ceiling).

| Stage | Rows | Invocations | Counted min | Guard min | Authorization |
|---|---:|---:|---:|---:|---:|
| A | 318 | 23 | 330.656 | 409.195 | **410** |
| B | 695 | 26 | 321.258 | 401.572 | **402** |
| Total | 1,013 | 49 | 651.913 | 810.767 | **812** |

- **812 is a spend cap, not an assurance of completion.** The sentinels' times are weak neighbour proxies (10x10, 18x18,
  20x21 and 15x15b10). At their row limits the cap would be 1,302.491 minutes, so 1,303.
- **Funding (approved, D-P2-15).** The owner approved option (a) of Q-P2-1: a separate phase-2 ledger of 812 counted
  minutes, stage A (410) first and stage B (402) only after the SAs' stage-A readout. The closed round spent 871.19995
  of its 1,725 counted minutes, leaving 853.80005; that balance is not used, and nothing rolls over.
- **Stops.**
  - A stage starts only if its remaining guard covers it; stage B starts only after the stage-A readout.
  - A stage-A failure goes to the owner.
  - No completed observation is run again to fill a budget.
  - Missing data is incomplete, never a pass.
  - P2-18 and P2-19 share the single 410-minute stage-A account; the task boundary does not reset that allowance. The
    measured runtime/configuration is sealed before P2-18. A later runtime, table, deadline or replay-limit change
    starts a new source epoch: identify the affected receipts/gates, reprice the required verification from the
    remaining authorization, and obtain an owner decision if scope, selected configuration or allowance would change.
    Never relabel old rows as measurements of the new source.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A thin control (32x15 lower bound 0.9127, 3x29 0.9473) fails because P6 sped today's search more than `gen-v4` | measured in stage A; a failure goes to the owner, with options like Q-T16's |
| Boards without a prior cell are slower than today | three paired sentinels and one completion sentinel in stage A; a failure goes to the owner; no silent fallback or refit |
| `require` regresses or stops on budgets (N-V4-15, N-V4-21) | 50 rows first, with today's and uncapped arms; a frozen value change needs a ruling |
| A port defect | proof bundles, smoke, all-row equality before any ratio |
| The measured source drifts after sealing (a runtime, table, deadline or replay-limit change) | source-bound receipts and preflight (P2-T14); a new source epoch with its own repricing and, if scope, configuration or allowance changes, an owner decision (7.6) |
| Work accounting or overshoot differs | proof bundles compare work units; the overshoot rule is tested |
| (c5) fails or is inconclusive on production | If (c5) fails or is inconclusive on production, stop publication and present the no-screen fallback and its new table identity to the owner before changing the selected configuration or continuing qualification. No refit on validation seeds and no automatic relabelling of already measured rows |
| The host guard or clocks misbehave (late results, `Date.now`) | the monotonic scopes, revision fences and fake-clock tests of P2-T09; browser checks |
| Old builds or old records break | per-`algo` shapes, the refusal fixture, the forward-compatibility check |
| CLI boards of 577 to 675 cells run `gen-v4` unmeasured | stated in the release notes and PR #14 |
| Machine time overruns on the shared machine | the ledger refuses past the guard; stages; no idle assumption |
| The suite passes 10 minutes or a browser check 1 minute | small `gen-v4` cases; large proofs under the lock |
| Scope creep (N-V4-14, Hell 1 offers) | out of scope; later proposals |
| PR #14 carries phase 1's unmerged commits | the PR states the dependency on PR #11; N-P1-DOC fixed on this branch |

## 9. Phases and task outline for `break-tasks`

Each task is at most three developer hours. Developers never commit or decide an open point; each task updates its
part of the living specification.

| ID | Task | Executor | Depends on | Hours |
|---|---|---|---|---:|
| P2-01 | `gen-v4.js`: tables, ids, the route predicate; boundary and digest tests | Dev | final plan | 2 |
| P2-02 | Retained `gen-v3` selector and shared clue primitives; behaviour and fixtures unchanged | Dev | P2-01 | 2 |
| P2-03 | Screen rating with its certificate, composed with P6; the rating-equality corpus | Dev | P2-02 | 3 |
| P2-04 | `select-v4.js` part 1: the locate, sided profiles, the AR1 direction, the start and its low-K clamp, no-window proofs | Dev | P2-03 | 3 |
| P2-05 | `select-v4.js` part 2: window, beam, stall, centre rule, rescue and tail re-rating, skip ordinals, events | Dev | P2-04 | 3 |
| P2-06 | Call budgets by mode, the overshoot rule, the four-attempt predicate, the production counters | Dev | P2-05 | 2.5 |
| P2-07 | Prior transport: the per-set prior of 4.4 with P4's tests, worker payloads, the serial and client paths, real-worker reason transport | Dev | P2-06 | 2.5 |
| P2-08 | Per-`algo` provenance, `made.igPrior`, skip bounds, the saved-steps key | Dev | P2-07 | 3 |
| P2-09 | Replay event mapping, step texts and notices in English and Vietnamese (approved, D-P2-16), the `N-PARTIAL` mapping | Dev | P2-08 | 3 |
| P2-10 | Monotonic request scopes and pool plumbing for the Generator, the CLI and the bench | Dev | P2-07 | 2.5 |
| P2-11 | The host guard of 4.5 over assembly (typed set failure, batch prefix), Generator and CLI wiring, prefix and history fencing | Dev | P2-10 | 3 |
| P2-12 | Measurement copies and telemetry: the validation profile, counters in rows, N-V4-16's ordered glue record, the no-screen, uncapped and diagnostic-offer copies with their distinct identities of 7.1, the symmetric trace and its parity proof | Dev | P2-09; P2-11 | 3 |
| P2-13 | The phase-2 comparator and ledger: plans, preflight, the `SOURCE_FILES` closure and receipt binding of 7.1, equality, statistics, the P5 report columns, stage reports | Dev | P2-12 | 3 |
| P2-14 | Fixture modes and replay-resource tooling: fixed recipes, the separated refusal check, bounded fixture discovery with a declared candidate/time limit, and preparation of the resource probes; no qualification measurement or speculative increase of `REPLAY` here | Dev | P2-12 | 2.5 |
| P2-15 | The cutover: `ALGO_ID` `gen-v4`, the live route, fixtures re-recorded with version-only differences, consumers moved, the living specification | Dev | P2-01..P2-14 | 3 |
| P2-16 | Integrated worker and browser functional cases; the final gate manifest | Dev | P2-15 | 3 |
| P2-17 | User and developer guides in English and Vietnamese, N-P1-DOC, README, the tools README, the release-notes text | Dev | P2-16 | 2 |
| P2-18 | Proof bundles and smoke (locked), on the sealed cutover source | Orchestrator; SAs read | P2-17; D-P2-15 | - |
| P2-19 | Stage A (locked): N-V4-15, the sentinels, the thin controls, the eight resource replays of 4.7 and the browser checks; its readout; the owner if a gate fails | Orchestrator; SAs | P2-18 | - |
| P2-20 | Stage B (locked) with the conditional twins, after the stage-A readout | Orchestrator | P2-19 | - |
| P2-21 | The validation report, jointly signed, with any owner decision it raises | SAs | P2-20 | - |
| P2-22 | Push `gen-v4`; PR #14's description (changes, verification, release notes, the phase-1 dependency); never merge | Orchestrator | P2-21 | - |

- **Developer total:** about 46 developer hours in 17 developer tasks (P2-01 to P2-17), plus five SA/orchestrator
  tasks (P2-18 to P2-22). SA-Astra's 43-hour outline, with the comparator as its own task.
- **Machine time:** 812 counted minutes on the approved phase-2 ledger (D-P2-15), plus bounded routine verification
  (each test run at most 10 minutes).
- **Owner stops:**
  - Q-P2-1 and Q-P2-5 are answered (D-P2-15, D-P2-16); no developer task waits for the owner;
  - a stage-A failure;
  - (c5) failing or inconclusive (P2-B05);
  - a new source epoch that changes scope, the selected configuration or the allowance (7.6);
  - any decision the validation report raises.

## 10. Named open items for later

| Item | Routing |
|---|---|
| A later rewording of the approved texts (D-P2-16) | an ordinary text task when the owner asks; no behaviour change |
| N-V4-14 | the screen on `n-upper` (×1.79) and `n-large` (×1.59) needs a new proposal and validation; not here |
| N-V4-04 | reps 40-59 stay reserved for a later refit's second validation |
| Phase 3 (N-V4-08, N-V4-09) | Hell 1 offers, browser runs, D39, the blind play comparison; uses this round's Hell 1 and `require` diagnostics |
| BQ-1, BQ-3 | device limits stay 484 and 360 until their qualifications |
| CLI boards of 577 to 675 cells | run `gen-v4` without their own measurement; a later measurement if wanted |
| F2, F7 | reach reported per cell; zero stays "unexercised" |
| N-P1-DOC | fixed on this branch by P2-17 before any merge |
| Merge, release | only on a later explicit owner instruction |

## 11. References and sign-off

- `request.md`, `report.md`, `clarifications.md` (no open questions), `sa-opus/answered-questions.md` (Q-P2-1 and
  Q-P2-5 as answered).
- Analyses, cross-reviews and the review:
  - `sa-opus/round-1-analysis.md`, `sa-astra/round-1-analysis.md`;
  - `sa-opus/round-1-cross-review.md` (§8.6), `sa-astra/round-1-cross-review.md`;
  - `sa-astra/review-report-plan.md` (R1 to R6, all applied).
- Evidence:
  - `evidence/sa-astra/round1-audit.*`, `round1-cross-audit.*`, `joint-review-audit.*`;
  - `evidence/sa-opus/p2-variant-chain.*`, `p2-price-basis.*`, `p2-prior-coverage.*`, `p2-xr-price.*`,
    `p2-xr-setstage.*`, `p2-xr-verify-astra.*`, `p2-q1-options.*`.
- `docs/improve-generating/plan.md`: P1 to P5, §5.1, §5.2, §6, §7, §9.
- `docs/improve-generating-stages-2-4/stage4-report.md`, `s06-reading.md`.
- `docs/improve-generating/evidence/frozen/V4-S3/freeze.json`, `V4-S4F/verdicts.*`, and the V4-S4 and V4-S4C rows.
- `tasks/improve-generating-v4/check-list.md`: N-V4-07, N-V4-15, N-V4-16, N-V4-21.

Sign-off:

- SA-Opus (drafter): accept, 2026-11-25.
- SA-Astra (reviewer): accept, 2026-11-25, conditioned on her findings R1 to R6 (`sa-astra/review-report-plan.md`),
  which this version applies in full; she accepted the reading of both owner answers.
