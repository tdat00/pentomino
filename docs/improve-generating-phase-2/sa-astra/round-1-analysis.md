# Improve generating, phase 2: independent analysis (SA-Astra)

Status: Independent round-1 proposal; not an implementation or measurement approval.

| Item | Value |
|---|---|
| Author | SA-Astra |
| Date | 2026-11-25 |
| Repository / branch | `Q:\git\pentomino`, `gen-v4` |
| Inspected base | `7c1bad226830667fa6626ff97c960ca3bddd7794` |
| Phase-1 fork / comparison baseline | `6b94ffb45fd8b887c47805739478eeb872088bfd` |
| Request | `docs/improve-generating-phase-2/request.md` |
| Authority | Plan v4, especially §§3, 5.1-5.2, 6, 9; D-S24-35; the frozen selection, not the provisional forecasts |
| Independence | No phase-2 file of SA-Opus was read. Production and tests were read only. |

`[V]` means verified in the cited source or immutable record. `[A]` means a proposal, interpretation,
estimate or assumption; it is not an observed production result. Paths and line numbers refer to the
inspected base unless a historical commit is named. `E` means this feature's `evidence/sa-astra/`.

Citation aliases: bare `plan.md` is `docs/improve-generating/plan.md`; `stage4-report.md` is under
`docs/improve-generating-stages-2-4/`; bare engine filenames are under `core/engine/`;
`generation-client.js` and `worker-pool.js` are under `core/browser/`; `ig-select-v4.js` is
`tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js`; variant JSON files are under
`tools/ig-proto/variants/`. `freeze.json` is `docs/improve-generating/evidence/frozen/V4-S3/freeze.json`.

## 1. Summary

1. [A] Port the frozen search semantically into the existing production pipeline; do not copy the instrumented tree wholesale.
2. [V] Production still runs `gen-v3` with P6; the 40-file source digest is unchanged from phase 1.
3. [V] Ship the 190 M screen only on Nightmare active areas 196-256; every other area uses the canonical limit.
4. [A] Preserve the complete legacy search route on the full 26x26 Nightmare board and on Very easy-Master.
5. [V] The frozen hard-response guard is partly in the bench host; production UI actions and clocks differ from that host.
6. [A] Use a client-owned monotonic deadline scope, seven-key gen-v4 provenance and stored nullable `igPrior`; preserve old records without reinterpreting them.
7. [A] Repeat every applicable production gate on a proposed 1,160-row matrix, with fresh seeds, all controls and the 26x26 identity exception.
8. [A] Price the named `require` pilot first: 40 rows on the largest Generator shapes, Hell 1 diagnostic only.
9. [A] The proposed measured/functional envelope has a 944.23-minute guard: ask for a new 945-minute grant, not automatic use of the closed round's balance.
10. [V] This analysis ran no generator, solver, replay, tree builder, test suite or benchmark; the unresolved decisions are listed in §9.

## 2. Understanding of the request

### Goal and users

- [V] The owner wants phase 2 finished on `gen-v4`, in PR #14 into `main`, without a merge. This follows the
  published phase-1 checkpoint, not a fresh branch from main. The PR therefore inherits the unmerged
  phase-1 prefix and must disclose it (`request.md:5-10,23-30,54-55`).
- [V] D-S24-35 keeps today's search on 26x26 Nightmare. It approves a proposed phase-2 scope, not a
  production-validation result or permission to alter the failed control's record. Plan and price return
  to the owner before the measured work runs or anything ships (`request.md:34-43`).
- [A] The users are Generator users, callers of the generation client/CLI, and people reopening saved sets,
  puzzle packs and Generation steps. The first group must not lose shown puzzles or histories; the last
  must not receive fabricated replays after an algorithm change.

### Fixed constraints

- [V] P1-P5 are for Nightmare and Hell 1. Very easy-Master remain on the old selection algorithm.
  Hell 2/3, a P7 kernel, a wider production pool, offers, score changes and a service level are not in this
  phase (`docs/improve-generating/plan.md:153-159,660-698`; stage-4 report §8).
- [V] The model remains `difficulty-v3`, the policy `mixed-v3`, the RNG and seed scheme unchanged.
  The new algorithm identity is `gen-v4`; the pack and puzzle-code formats are not version-bumped by this
  change (`plan.md:701-716,760-772,790-815`).
- [V] Phase 0 remains `FAIL (control 26x26-nightmare: fail)`. No class is refitted from validation results;
  no screen is admitted on `n-upper` or `n-large` merely because its observed time was better.
- [V] The current Generator limits are 484 active cells on desktop and 360 on phones, with side length
  at most 32. `capFor` forces `largeBoards: false`; the 676-cell option is a CLI/client limit, not a
  Generator switch (`generator/state.js:322-323`; `core/engine/policy.js:24-45`;
  `core/engine/qualification.js:13-17`; `docs/design-brief.md:94-96`).
- [V] No Hell level is currently offered. A diagnostic Hell 1 measurement does not enable that level in
  `AREAS`, `LISTED_LEVEL_IDS`, page metadata or either user guide (`policy.js:1-6,336-340`;
  `docs/design-brief.md:35`).

### Assumptions made explicit

- [A] Use phase 1's P6-enabled source at `6b94ffb` as the new legacy comparator, not main's older
  diagnostic-heavy source. Both sides retain P6, so a phase-1 gain is not attributed to gen-v4.
- [A] The precise geometric predicate for the 26x26 exception and the request boundary for the live
  clock need the joint rulings in §9. Neither is silently inferred from an area or a timestamp.
- [A] Prices use existing Node observations as proxies on this machine, with no P6/kernel speed credit.
  They are not measurements of the new code or a prediction of browser qualification.

## 3. Current state: production versus the frozen implementation

### 3.1 Source and frozen configuration

[V] `E/round1-audit.json` recomputes the phase-1 digest
`a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4` over the existing 40
`SOURCE_FILES`. The fork-to-base diff is empty for runtime, tools and tests. Current
`core/engine/version.js:3-4` is still app `1.0.0`, algo `gen-v3`.

[V] The configuration to port is the **selection of frozen arms**, not all entries of the screen arm's
parameter table:

| Production case | Frozen reading | Effective search settings |
|---|---|---|
| Nightmare, active area 196-256 | `n-mid` admitted | P1/P3/P4/P5; screen 190,000,000 |
| Other Nightmare areas, except the owner exception | Other classes not admitted; unlisted gaps fail closed | P1/P3/P4/P5; canonical 760,000,000 |
| Full 26x26 Nightmare, predicate to be pinned | D-S24-35 | Legacy route, not a newly admitted screen |
| Hell 1 | No screen, candidate results only | P1/P3/P4/P5; canonical 760,000,000; matching per-set prior |
| Very easy-Master | Legacy identity scope | Existing selection behavior, with phase 1's P6 |

Sources: `freeze.json:4-123`; `stage4-report.md:36-54,333-343,389-407`;
`docs/improve-generating/plan.md:266-274`. Areas 145-195 and 325-359 are explicitly unlisted,
not holes the implementer may fill with 190 M.

[V] Frozen fixed values:

- `prior-s3-v1`: 27 exact `level@activeArea` entries, 15 Nightmare and 12 Hell 1.
- `any`: Nightmare 10 G units, Hell 1 40 G; `require`: Nightmare 32 G, Hell 1 40 G.
- Bound: the first four set attempts must **all** fail without a window on the **same** side.
  A budget stop has no side and does not count.
- Reserve 0.6: set cut 46,000 ms; work stop 115,000 ms; response bound 120,000 ms; the frozen host
  starts its backstop at 119,000 ms, allowing a 1,000-ms margin.
- `(c4)` off, bracket-close re-rating off, rescue and tail re-rating share the allowance of four;
  no ranker, no P7 kernel.

The frozen selector's runtime class `n-mid` still spans 196-324, and its screen arm also enables 190 M on
360+ (`ig-select-v4.js:97-132`; `variants/fr-frozen.json:12-20`). Copying that table as the production
default would be wrong: the validated production boundary is 196-256.

### 3.2 The engine gap

| Component | [V] Current production | [V] Frozen mechanism / port consequence |
|---|---|---|
| Selection | `clues.js:258-516`: capped/AR1-refused profiles are spent; legacy samples/beam/stall | `ig-select-v4.js:554-600,950-1029,1140-1325`: nested-family locate, sided results, rescue, window, beam, bounded end |
| Rating and P6 | `difficulty.js:312-478`; `clues.js:274-284`: lean only with no seam, recorder or `onRate`; complete the returned diagnostic | Frozen `rateScreen` and `igRateDetailedWithLimits` are built around the older measurement core. Compose with P6 explicitly; do not reinstall a mutable global P6 switch |
| Certificate | Canonical `rate` exposes no lower-limit search profile | Frozen check is `metrics.work - metrics.censusWork <= W`, not total work <= W (`ig-select-v4.js:475-501`) |
| Prior | No `igPrior`/window in production worker payloads or candidate records | Exact table lookup, not interpolation (`ig-select-v4.js:194-205`); matching calibration's `igWindow.wc` crosses client/protocol/task boundaries (`v4-ps.json`) |
| Budget | Current `charge` observes completed rating/count work | Frozen internal `spent` is independent of observers; check before every primitive; `any` may return the best waiting candidate, `require` only a finished final (`ig-select-v4.js:407-426,624-638,1302-1325`) |
| Set bound | `generation-client.js:665-700`: ordered lowest-success scan, no same-side rule | `v4-p5.json`: bound read before that scan; reason transport through `setAttempt` is essential |

[V] A particularly easy budget regression is to copy the legacy `onAdd: record ? ... : undefined`.
The v4 uniqueness repair **always** installs its `onAdd` hook: it checks the budget before a further
count even when no recorder is present (`ig-select-v4.js:630-638`). The existing `makeUnique` calls
`onCount` after the count and `onAdd` after choosing the next clue (`clues.js:174-220`).

[V] Capped screen results are direction only and carry no accepted score. An AR1 refusal retains its
canonical score for direction, including an in-band hit, but remains ineligible and does not enter the
stall count. A failed or incomplete rating must not be turned into a successful canonical rating.

### 3.3 The deadline is not already a production feature

- [V] Production pool requests get a new `performance.now()` origin and a 115-s timer on every
  `beginRequest` (`worker-pool.js:132-135,630-647`). The client separately begins set and batch jobs
  (`generation-client.js:454-487,597,849`).
- [V] `variants/live.json:lv10-lv19` puts the hard-response race in **`tools/bench/runner.js`** and
  adds a prefix snapshot to the copied client. Copying only the selector/pool edits would leave that
  host guard absent from the Generator and CLI.
- [V] The production batch calls `finish(job)` before awaiting pack assembly
  (`generation-client.js:1172-1217`). A timeout that covers workers but not that await is not the
  promised end-to-end response bound.
- [V] The UI has separate **New piece set** and **New puzzle** actions, with an arbitrary human pause
  between them (`generator/jobs.js:303-424`; `design-brief.md:21-27`). The CLI calls set then batch
  within one invocation (`tools/generate.mjs:530-562`).
- [V] The UI job timestamp uses `Date.now()` (`jobs.js:201`), whereas pool/client deadlines use
  `performance.now()`. Passing the UI timestamp as `igOrigin` would put it in the wrong clock domain;
  the prototype's fallback could then silently restore separate timers.

### 3.4 Identity, replay and histories

- [V] The current provenance reader requires exactly five version keys, the current candidate key set
  and subset ordinals below 2,128 (`pack.js:45-62,1147-1347`). The frozen gen-v4 family has seven keys,
  candidate `igPrior: integer 1..128 | null`, and a subset bound of 2,192
  (`variants/v4.json:pv7-pv15`; `ig-select-v4.js:56-62`).
- [V] `made.igPrior === null` means **no explicit override** on replay, so the versioned table is used.
  It does not mean passing `ctx.igPrior = null`, which explicitly disables the table
  (`v4.json:pv17`; `ig-select-v4.js:199-205`).
- [V] Calibration is session-only. `acceptSet` retains its object, including a private window field;
  restoring a saved set clears calibration/trust and retains puzzles, histories, batch index and
  provenance (`generator/state.js:606-619,913-1000`). No persistent calibration migration is required.
- [V] The cache key contains the running `ALGO_ID` and app version but **not running table versions**
  (`generator/ui/replay-cache.js:72-80`). Stored versions in `source.made` do not substitute for the
  running tuple.
- [V] Replay currently maps only the old event kinds and renders every unrateable step as a canonical
  path cap (`replay.js:765-894`; `replay-model.js:285-325`). New phases/reasons and bounded/no-window
  endings need explicit mappings; they are not proved by the prototype's candidate replay alone.
- [V] Five tests read `replay-case.json`: generation-client, protocol, replay, replay-model and tasks.
  `tools/record-fixtures.mjs:502-541` currently regenerates it and expects a match, so the checking tool
  must change along with those consumers.
- [V] Opaque `meta` has a 4-KiB cap, **not** `generation`. Generation uses the JSON value/depth limits;
  the entire pack has its own 512-KiB cap (`pack.js:35-44,1805-1820`). The audit's hypothetical candidate
  grows from 313 to 384 serialized bytes; this is size arithmetic, not a generated gen-v4 record.

### 3.5 What the previous measurements did not establish

[V] Stage 4 had no `require` request. No natural set call met the four-attempt condition, no call
stopped at its call budget, and no rescue/tail re-rating ran. Zero false stops therefore do not prove
the bound on natural data. Controlled tests remain necessary, and zero future reach must still be
reported as unexercised (`stage4-report.md:157-246,281-291`).

[V] The largest completed-primitive call prefix was 8.39 G on Nightmare and 23.08 G on Hell 1, not an
upper bound on unfinished work. The two lost completions on 14x14 Hell 1 came from the live deadline;
that board remains a non-candidate. The original 26x26 control failure is not measurement noise by
declaration, nor a reason to admit the unvalidated large-board screen.

## 4. Options and recommendation

| Option [A] | Design and cost | Risk / effect on users | Reading |
|---|---|---|---|
| Copy the frozen tree into production | Fast textual port, but carries logging globals, experimental ids, broad screen classes and a bench-only host guard | Wrong screening, broken browser imports or replay, loss of P6, missing response guard | Reject |
| Port only the selector first and call phase 2 done | Less initial work | Leaves stored identity, replay, deadlines and production validation incomplete | Reject as a final scope; inert preparation commits are useful |
| Semantic port with one policy/router, retained legacy implementation and shared deadline host | Approximately 43 developer hours before fix rounds; staged measured envelope in §8 | More integration work, but preserves the agreed behavior boundaries and makes proofs reviewable | Recommend |

[A] Keep the new implementation inert until a deliberate version/cutover task. Prefer a small shared
clue-primitives module plus a retained legacy selector and a separate v4 selector behind the existing
`selectClues` interface; avoid the prototype's circular `clues`/`ig-select-v4` dependency and its global
logger/P6 state. New module names in §5 are proposed, not existing files.

## 5. Proposed plan

### 5.1 Policy, routing and identities [A]

1. Create a pure production configuration module, proposed `core/engine/generation-v4.js`, containing
   the frozen budgets, prior data and the **selected** screen policy. Generate/copy the 27 prior entries
   exactly; do not refit or interpolate. For an absent prior entry use `null`, hence the frozen
   `clamp(K - 8, 1, K - 2)` start and step 8; a real prior starts with step 1.
2. Use `prior-s3-v1` unchanged. Give the selected production screen table a distinct id, proposed
   **`screen-v4-v1`**: `screen-s3-v1` names a different, broader frozen experimental table.
   The production table has 190 M only for Nightmare active area 196-256 and canonical work otherwise.
3. Keep `budget-s3-v1` and `deadline-s3-v1` as immutable parts of the definition of `gen-v4`.
   Do not add two more provenance keys to the mandated seven-key shape. A future result-changing
   budget/deadline change needs a distinct algorithm or an explicitly versioned contract.
4. One `searchRoute(board, target)` policy must govern selection, P5, prior application and the new
   deadline, not just the selector. Proposed 26x26 predicate: Nightmare, `board.width === 26`, `board.height === 26`,
   `activeCount === 676`; it ignores display rotation but does not catch arbitrary 676-cell masks.
   Resolve Q-P2-A1 before encoding it.
5. All newly generated records use `gen-v4`, including legacy-route puzzles. Keeping the old search
   algorithm does **not** enable replay of `gen-v3` records in a gen-v4 build.
6. Keep score model, policy id, RNG, seed labels, app version, pack format and puzzle-code formats
   unchanged. No offer, device-limit or `MAX_POOL_SIZE` increase.

### 5.2 Selection, certificate and P5 [A]

- Preserve the frozen nested-family shuffle, doubling march, bisection, fallback sample, window
  choice, centre rule, beam and tie ordering. Keep the dead-end fallback instrumented rather than
  deleting its counter to manufacture a zero.
- Preserve `IN` from an AR1-refused profile as locate guidance; never accept it or count it towards
  stall. Preserve estimated/census information in observations.
- Add a typed search-rating entry point in `difficulty.js` using the existing measurement core.
  Lower only main work, not nodes/census/other caps. A screen-capped outcome is a discriminated
  search result, not a stored `RatingV3` with an invented score.
- Retain P6: full ratings for `record` or `onRate`, with the detail channel only for `record`; lean
  intermediates otherwise, canonical diagnostic completion before returning a successful rating. Prove the certificate on full canonical
  results, including completion of a lean result; test full key order as well as score equality.
- Meter every rating attempt, capped attempt, canonical re-rating and uniqueness count exactly once.
  Check before each primitive. Preserve the always-installed uniqueness `onAdd` budget check.
  The threshold is not a strict upper bound on consumed work: the last primitive can overshoot.
- At budget end, `any` may choose an already waiting in-band result; `require` may return only an
  already finished unique final. Start no further rating/count after the stop. Complete P6's returned
  diagnostic consistently with the existing definition of selection-work units.
- Preserve rescue/rebracketing and tail re-rating, with one shared allowance of four, higher-count
  tie preference and no second rescue. `(c4)` and bracket-close probes remain disabled.
- Keep independent subset/repair skip ordinals, overflow policy and unused/unreachable-skip refusal.
  The gen-v4 subset bound is 2,192; gen-v3's remains 2,128.
- Share the four-failure predicate between the ordered client and any serial set-attempt helper
  that claims to implement the same request. A higher speculative success must not bypass a bound
  already established by attempts 0-3. Budget failures or mixed sides never establish it.

### 5.3 Request clock, workers and UI host [A; Q-P2-A2]

Proposed interface: a client-owned opaque request scope, created from the **same monotonic clock**
as its pool, with immutable origin/route/cutoffs. `generateSet` and `generateBatch` accept that scope
without changing their ordinary result shapes; absent a scope, each standalone action creates a fresh
one. The CLI and bench create one scope for their automatic set-plus-batch request.

- New piece set and New puzzle remain separate UI actions. Never keep a timer alive across the
  user's time browsing/selecting a set. Never pass `state.job.startedAt` (`Date.now`) into the pool.
- Proposed new-route policy: the set stage uses the frozen 46-s cut, including a standalone set
  action; a standalone puzzle action gets a fresh 115-s work interval. A combined CLI/bench request
  shares one origin and therefore reserves its batch time. Legacy routes retain their old timing
  semantics. These exact boundaries need the joint ruling, not an implementer's guess.
- The set loop keeps the frozen order: cancellation/timeout, same-side bound, ordered winner scan,
  reserve cut, new dispatch. Do not move the reserve test ahead of the ordered winner without proof.
- Move the hard host race/prefix behavior out of a bench-only dependency into a production,
  DOM-free component, proposed `core/browser/generation-deadline.js`; use it from client/hosts,
  `tools/generate.mjs` and the bench. It remains active through pack assembly, not merely worker work.
- At work stop cancel/terminate outstanding tasks. At the hard backstop return only the consumed,
  validated fold prefix, with its `made` records and seen histories; do not await a held assembly.
  Preserve the 1-s host margin. Fence late completions/assembly and expired-request auxiliary work
  by request id/revision, with one terminal result and no later puzzle acceptance.
- Preserve `onAccepted` ordering and immediate history insertion. Cancellation, budget/deadline
  shortfalls and later capacity trimming never erase a shown puzzle's history. Play/busy policy,
  one puzzle per press, random seed behavior and UI layout stay unchanged.
- Real pools stay at 1-4. Use scripted pool widths 1/2/4/8 and real-candidate fold simulation for
  logical width 8; do not change production admission to satisfy the plan's invariance wording.

### 5.4 Prior transport, records, replay and migration [A]

- Keep the frozen nullable candidate field `igPrior`. Only a matching Hell 1 calibration supplies
  the override: same set/layout, target level, and a unique certificate for `require`. Send the
  integer through client, `protocol.js`, `tasks.js`, `BatchContext` and `puzzleCandidate`.
  Leave the completion pass without a per-set override, as the frozen implementation does.
- Retain session-only calibration. After reload/import or a target/mode mismatch, rebuild the
  starting choice from the table and set; do not reconstruct a window by pretending the final
  accepted clue count is necessarily the locate's window count.
- `versions` for gen-v4 has exactly
  `algo, policy, rng, seedScheme, ratingModel, priorTable, screenTable`.
  Keep the prototype-family schema support needed by separately identified validation variants,
  following T02c/D-V4-05; foreign experimental records never replay as the running release.
- Read/copy each record according to **its own** algo. Valid five-key gen-v3 records survive loading
  and saving, including mixed old `setOrigin` and newer candidate records. Never restamp a saved
  set. Invalid shapes produce the existing pack provenance warning; retain storage's existing
  invalid-record handling rather than resetting all saved work.
- Compare all seven current version keys before replay. Preserve `replay-case.json` byte-for-byte
  as the valid gen-v3 refusal case, reason `set-versions`, not a provenance-corruption case.
  Add a gen-v4 matched fixture exercising the new screen path and an explicit 26x26 legacy-route
  replay case. Prove Hell 1's stored prior in the labelled diagnostic build; do not enable a Hell
  offer merely to make a shipping fixture pass.
- Update all five fixture consumers and `record-fixtures.mjs`; separate old refusal checking from
  regeneration of a matched new fixture. Active generation/sample fixtures may change their
  declared algorithm/provenance, but the Hard recipe and all Easy/Normal/Hard sample puzzles must
  retain phase 1's semantic keys/scores.
- Restore a non-null recorded `igPrior` explicitly. For recorded `null`, omit the override so the
  table still applies. Test a non-table prior and a null prior; do not rely on a coincidentally
  identical puzzle to prove that transport occurred.
- Put the **running** provenance tuple into saved-steps cache identity or validate it before any
  cached result is shown. Old cached matched steps must not bypass `set-versions`.
- Re-derive `REPLAY.work`, `maxSteps` and `maxBytes` from the new call/event paths and measure
  representative replays. The current defaults are 4,096 steps, 4 MiB and
  `256 * (760 M + 80 M)` units (`policy.js:130-136`); do not increase them merely to turn an
  incomplete replay green. No generated rating, history or stored record is rewritten by a replay.

### 5.5 Generation steps and language text [A]

Extend `ClueEvent`, the replay step maker and the viewer together. The existing rated/rejected/unrateable
kinds can carry `locate`, `window`, `rescue` and `rerate` phases; add explicit budget/no-window terminal
events where needed. Keep the existing seven UI stages. Screen-capped steps have `rating`, `detail`
and score breakdown absent/null, never a displayed canonical score.

Proposed new locale keys and exact texts:

| Key | English | Vietnamese |
|---|---|---|
| `replay.step.locate` | Clue set {sequence} tests {count} clues while locating the target band: score {score}. | Nhóm mảnh đặt sẵn {sequence} thử {count} mảnh để tìm khoảng điểm mục tiêu: điểm {score}. |
| `replay.step.screenCapped` | The quick rating of clue set {sequence} reached its work limit. It only guides the search; no score is accepted. | Lần chấm nhanh nhóm mảnh đặt sẵn {sequence} đã chạm giới hạn xử lý. Kết quả chỉ định hướng tìm kiếm; không chấp nhận điểm. |
| `replay.step.rerate` | Clue set {sequence} is checked again with the full rating limit: score {score}. | Nhóm mảnh đặt sẵn {sequence} được chấm lại với giới hạn đầy đủ: điểm {score}. |
| `replay.step.rerateCapped` | The full recheck of clue set {sequence} reached the rating limit; no score is available. | Lần chấm lại đầy đủ nhóm mảnh đặt sẵn {sequence} đã chạm giới hạn chấm điểm; không có điểm để hiển thị. |
| `replay.step.budget` | This clue search reached its work budget. No further rating or uniqueness check was started. | Lần tìm nhóm mảnh đặt sẵn này đã hết hạn mức xử lý. Không bắt đầu thêm lần chấm điểm hay kiểm tra tính duy nhất. |
| `replay.step.noWindowBelow` | No target-band window was found down to one clue. | Chưa tìm được khoảng số mảnh đặt sẵn đạt mức mục tiêu khi giảm tới một mảnh. |
| `replay.step.noWindowAbove` | No target-band window was found up to the largest allowed clue count. | Chưa tìm được khoảng số mảnh đặt sẵn đạt mức mục tiêu khi tăng tới số mảnh tối đa cho phép. |
| `notice.N-SET-WINDOW` | Search stopped after four piece sets without a suitable clue-count window. Try another seed or level. | Đã dừng tìm sau bốn bộ mảnh chưa tìm được khoảng số mảnh đặt sẵn phù hợp. Hãy thử hạt giống hoặc mức khác. |
| `notice.N-SET-RESERVE` | The piece-set search reached its time limit. Try another seed. | Việc tìm bộ mảnh đã chạm giới hạn thời gian. Hãy thử hạt giống khác. |

Map `reserve-cut` to the set-stage notice and `no-window-*` to the bound notice. Map a batch
`response-bound` to the existing time-limit shortfall presentation, preserving accepted results;
today `batchShortfall` otherwise returns no notice for that new reason (`generator/jobs.js:132-164`).
Keep existing user-cancellation messages and the existing EN/VI `set-versions` messages.

The wording says a window was **not found**, not that none exists. The above-max rescue may remain
heuristic after four re-ratings. Controlled renderer tests must also cover a capped canonical recheck
and an AR1-refused estimated rating.

Update the living specification with the active cutover, including §§6.10, 6.12, 7.5 and 8.2-8.4.
Both user guides and PR #14 state that old sets/puzzles remain stored and playable but their
Generation steps are unavailable under the new version, including a new puzzle made on an older set.
Add the research-harness navigation line to both developer guides on **this branch** (N-P1-DOC);
that alone does not repair the separate, unmerged PR #11.

### 5.6 Validation design, source identity and instrumentation [A; Q-P2-A3]

Use a new producer/ledger namespace, proposed `P2-*`, and a source-pinned snapshot of the completed
implementation. Do not mutate the frozen trees, variants, plans, receipts or journals.
Add every new runtime/configuration module to `SOURCE_FILES` or an equally explicit transitive
fingerprint. Bind the release source, measurement-only edits, variant parameters and producer code separately.
The browser receipt additionally binds Generator host, locale and replay-cache/viewer files; a Node
engine digest alone does not establish that the UI wiring is unchanged.

The diagnostic-offer override currently lives in `variants/instr.json:47-60`; it bypasses the
`pieceCountPlan` admission check. Reuse that **idea only in a labelled measurement copy**. It must not
become a release default or a public Generator control. Experimental uncapped/no-screen builds need
distinct identities; an uncapped build cannot masquerade as the same stored request definition.

Instrument budget ends, locate outcomes, re-rating reach and the before-primitive bounds needed by
IG-P-Q37. Preserve dispatch/selection/completion/consumption/cancellation linkage. Missing end lines
are terminated calls with the appropriate bound, not zero work. A separate diagnostic pass cannot
lend its different clock-cut prefix or speculative work to an uninstrumented timing row.

Keep the public `record` observer absent in timing comparisons, so validation does not silently
disable P6. Any validation-only trace instrumentation must be matched in both arms, separately
fingerprinted and proved result/work/skip invariant. If a full `record` pass is used instead, label
both arms accordingly and do not call it the unobserved timing configuration.

**Recommended applicable repeat:**

| Population | Rows | Purpose |
|---|---:|---|
| Shipped configuration, 19 Nightmare/Hell 1 cells x 20 | 380 | Completion, population, deadline, budget/bound/re-rating reach; 26x26 Nightmare follows the legacy exception |
| Shipped configuration, 16 Master cells x 5 | 80 | Legacy identity |
| Phase-1 baseline, 10 Nightmare controls x 20 | 200 | Nine new-search non-regression comparisons; 26x26 legacy identity and reported timing |
| Phase-1 baseline, 16 Master cells x 5 | 80 | Matched legacy identity |
| No-screen counterpart, 3 admitted `n-mid` cells x 20 | 60 | Repeat the screen certificate/admission comparison on production |
| Selected uncapped counterpart, 18 new-search cells x 20 | 360 | P5 false stops/lost completions; no redundant P5 comparator for the legacy 26x26 route |
| **Total** | **1,160** | All 35 boards retained; no failing control removed from the population |

This removes 320 duplicate/unshipped bounded-arm rows and 20 inapplicable uncapped rows from the
old 1,500-row arrangement. It is an **explicit proposed interpretation**, not an already authorized
reduction of the phase-2 gate. Q-P2-A3 settles it; the full-scope price is also given below.

Use fresh `landscape/<cell>/<rep>` reps **60-79**, with Master **60-64**. Leave the old 20-39 observations
and reserved 40-59 cohort intact. Neither these seeds nor the `require` pilot results may refit a
table. Use the existing bootstrap recipe, seed 20261116 and 10,000 resamples.

For N-V4-15 first, propose `22x22-nightmare`, `32x15-nightmare`, `22x22-hell-1`,
`32x15-hell-1`: areas 484/480, `maxActive: 484`, mode `require`, quantity 10, four workers, five seeds
`ig-p2/require/<cell>/<rep>` with reps 0-4, bounded and uncapped. The Hell rows are diagnostic.
These 40 rows exercise the named Generator-size question; they do not qualify larger CLI-only
`require` workloads, nor constitute a browser offer or a 90% completion claim.

Measure the first available candidate replay per cell/arm (up to eight). A missing candidate is
unobserved replay coverage, not a pass and not permission for an unbounded seed search. Report
`require` completion, verified uniqueness, work/overshoot, budget stops, reserve/deadline cuts and
lost completions before the main matrix; a result requiring a frozen-value change stops for a ruling.

## 6. Acceptance and verification

All rows below are proposed criteria [A], grounded in the governing gate, not claims that the code exists.

| ID | Business criterion | Verification |
|---|---|---|
| B1 | Five failing Nightmare boards meet the production gate | At least 18/20 reach ten on each; zero dead-end entry; missing/invalid cohort is incomplete, not pass |
| B2 | No unintended change outside the new search | Legacy Very easy-Master scope tests; all 16 Master identities; 26x26 Nightmare identity and its own replay case |
| B3 | No unsupported screen or offer | 190 M only on active 196-256 Nightmare, default no screen elsewhere; Hell/UI availability and device caps unchanged |
| B4 | Honest production qualification | Population per cell/two-sided: clue share, score position, census-estimated share and completion; all ten controls retained; original phase-0 FAIL preserved |
| B5 | Existing work is retained | Old records survive load/save without restamping; old puzzles playable; new steps obey version/table identity; shown histories survive all terminal outcomes |
| B6 | No release implied | PR #14 remains unmerged into main with the phase-1 dependency and phase-2-only range visible |

| ID | Technical criterion | Verification |
|---|---|---|
| T1 | Exact frozen search semantics, including AR1 direction | Focused locate/window/rescue/repair tests and reference parity; explicit below-to-one, above-to-max, skipped probe, rebracket and shared re-rating allowance cases |
| T2 | Screen certificate and P6 compose | Corpus deep equality against canonical ratings, including overshoots, R7 cuts and caps before/after first solution; returned full diagnostic/key order; no capped score exposed |
| T3 | Deterministic work budget | Tests with no observers, charge alone, record+charge and throwing observers; uniqueness-count budget checks; `require` never returns an unfinished final |
| T4 | Set bound and reason transport | First-four same-side, mixed-side, budget-stop and higher-speculative-success cases; real-worker synthetic transport; natural match/firing/glue counts per cell, zero explicitly unexercised |
| T5 | P4 identity | Matching/nonmatching calibration, target/mode, null versus non-null prior; no per-set override in completion pass; stored prior/table round trip and replay |
| T6 | Replay compatibility | Old gen-v3 fixture unchanged and unavailable with `set-versions`; new matched fixtures; wrong shapes warn/drop without destroying puzzles; foreign table cannot reuse cached matched steps |
| T7 | Pool independence | Actual supported widths 1/2/4; logical 8 via fold/scripted pools using the new route, not only the old Hard fixture; under a clock cut every result is a common-slot-equal prefix |
| T8 | Live browser/client deadline | Client-clock origin; fake-clock reserve/work/host cuts, held assembly, late messages, repeated cancel and a fresh action after a long user pause; no stale acceptance |
| T9 | Quantitative gates | New-search controls >=18/20 and lower 90% bound >=0.9; `n-mid` (c5) retains matched-set, clue, time and proved-work rules; Hell 1 reported, not offered or silently gated as production success |
| T10 | Resource/report integrity | Both existing memory limits; source/config/producer hashes; no missing work treated as zero; P5 and rescue/tail reach per cell; replay steps/bytes/work measured |
| T11 | Complete checks/docs | Targeted then full Node suites, active fixture check and legacy refusal check, browser functional cases, `npm run check`, explicit docs/evidence CRLF checks, current living spec and EN/VI guides |

[A] A production (c5), control, identity, replay or deadline failure is a stop. Do not silently drop a
cell, raise a budget, reclassify the old FAIL or retune on the observed validation seeds. Any
replacement configuration needs its own identity, ruling, source binding and newly approved work.

## 7. Risks, mitigations and effects

| Risk [V where sourced above; mitigation A] | Mitigation / consequence |
|---|---|
| Broad frozen screen table copied literally | Test active-area boundaries 144/145, 195/196, 256/257, 324/325, 359/360; selected table and identity are explicit |
| 26x26 exception applied only inside one selector | One shared route controls calibration, candidates, completion, P5 and deadline; cover both modes and display rotation |
| Date-based UI timestamp disables the deadline | Client-owned monotonic scope; reject invalid/future/foreign scopes rather than silently falling back |
| Host returns late or leaks a later result | Guard remains through assembly; prefix is a validated snapshot; revision fences and late-result tests |
| P6 lost under screening or diagnostic collection | Same measurement core; explicit lean/full tests and matched trace setup; no unlabelled recorder timing |
| Unknown prior areas or a lost calibration window | Exact-area lookup only; preserve session-only calibration and fallback; store nullable actual override |
| Budget reached inside uniqueness repair | Always-on count hook; no new count/rating after stop; independently test `require` finished-only return |
| Replay metadata silently stripped | Per-algo shape/copy helpers, all five fixture consumers, mixed-version storage and packed round trips; unchanged file/value/depth limits |
| Old cached steps appear verified | Key/validate against the running seven-key tuple before showing cached output |
| Zero natural bound/re-rating reach misreported | Separate controlled coverage from observed reach; retain N-V4-16/F7 as unexercised when zero |
| Source fingerprint omits a new module/table | Extend fingerprint coverage and bind every diagnostic override and producer file |
| Diagnostic Hell 1 accidentally becomes an offer | Separate copied validation build; release policy/listed levels/qualification guarded byte-for-byte |
| Validation or replay finds a missing proof | Report incomplete; no automatic fixture replacement, retry or limit increase |
| Fresh controls fail despite an earlier pass | Keep all controls and stop; the old lower bounds for 3x29 and 32x15 were only 0.9473 and 0.9127. No automatic new legacy exception |
| More provenance consumes pack/storage space | Preserve existing trimming/drop/eviction rules and shown histories; audit actual serialized sizes, not a mistaken 4-KiB generation cap |

[A] Browser timer throttling or a suspended tab is not a hard-real-time platform. Functional tests
must exercise the active-host clock contract and actual worker cleanup, not advertise a new universal
service level. Long browser performance/offer qualification remains phase 3, not a conclusion from
scaled-clock tests or Node ratios.

[A] Carry the new Hell 1 per-board candidate reading to phase 3, including any changed reading on
14x14; never overwrite its historical non-candidate result or treat a new candidate result as an offer.

[V] Repository browser checks must finish within one minute each and complete test runs within ten
minutes (`AGENTS.md`). [A] Use injected clocks/scaled watchdogs for logical 46/115/119/120-s boundaries;
do not hide a 120-s real request inside an overlong unit-page check. The ordinary suite is verification,
not another performance cohort.

## 8. Effort, phasing and machine price

### 8.1 Developer outline [A]

Each row is a prospective coherent task, no more than three developer hours before review/fixes.
Preparatory code is inert until the version cutover; active behavior and its living specification
change together. The developer never chooses an open point or commits.

| Task | Work | Developer h | Prerequisite / gate |
|---|---|---:|---|
| P2-01 | Pin configuration, selected screen id and route policy | 2 | Joint rulings; boundary/scope cases |
| P2-02 | Isolate retained legacy selector/shared primitives | 2 | Existing fixtures and legacy observer behavior unchanged |
| P2-03 | Search-rating certificate with P6 | 3 | Canonical/lean/detail equality |
| P2-04 | Locate, sided profiles and AR1 direction | 3 | Controlled frozen-reference cases |
| P2-05 | Window/beam, canonical rescue and tail | 3 | Tie/order/skip/stall and re-rating tests |
| P2-06 | Call budget and four-attempt predicate | 2.5 | Any/require, overshoot, observer and order cases |
| P2-07 | Prior/window, worker payload and serial/client consistency | 2.5 | Matching/null/fallback and real-worker reason transport |
| P2-08 | Per-algo provenance and cache identity | 3 | Valid gen-v3 preserved; wrong shapes/table mismatches refused |
| P2-09 | Replay event mapping and EN/VI text | 3 | Screen cap has no score; budget/no-window and final-step cases |
| P2-10 | Shared monotonic clock/pool plumbing | 2.5 | Fake-clock origin and legacy-route isolation |
| P2-11 | Host guard, Generator/CLI wiring and prefix/history | 3 | Held assembly, late/cancelled work, separate UI actions |
| P2-12 | New source-bound validation/telemetry adapter | 3 | No frozen mutation; production fingerprints and measured-clone parity |
| P2-13 | Fixture modes and bounded replay-resource tooling | 2.5 | Old refusal fixture immutable; no unbounded seed search |
| P2-14 | Deliberate `gen-v4` cutover, active fixtures and living docs | 3 | Full compatibility/scope gates; no early release |
| P2-15 | Integrated worker/browser cases and final gate manifest | 3 | All proposals become concrete bounded commands/inputs |
| P2-16 | User/developer docs, evidence links and PR draft | 2 | Both languages, N-P1-DOC on this branch, no-merge/dependency text |
| **Total** | **Before fix rounds, SA reviews and measurement operation** | **43** | |

[A] Separate orchestrator/SA execution tasks then run and read the proof bundles, N-V4-15 **before
the main production measurements**, resource replays, the 800-row core and 360-row comparator,
and six browser functional checks. Each measured phase has its own stop, immutable outputs and
approval/account check. Final publication updates only `gen-v4`/PR #14; neither PR is merged.

### 8.2 Price and the closed account

[V] The old round spent **52,271.997 s = 871.19995 min** of **1,725 min**. Its numerical balance is
**853.80005 min**, but it is a closed frozen-round authorization. The phase-2 repeat explicitly has
its own manifest (`plan.md:581-585`; `s06-reading.md:145-147`; request D-S24-35).

[V] The audit independently reproduces all **103 locked-step quotes** of `V4-S4`/`V4-S4C`.
Their original guards are **1,481.86 + 732.02 = 2,213.88 min**. They are historical quotes, not a
current phase-2 grant.

[A] The proposed price below uses the unchanged T11g schedule rules, with a new stated proxy:
**1.25 x the appropriate frozen arm/cell median response**. It grants no P6/kernel speed credit.
The helper assumptions are 885-s horizon, 900-s invocation kill, 45-s quiet, 2-s startup, 10-s
row admission margin and a 1.25 guard. The audit evaluates the exact pure pricing block in memory;
it does not import/run the tree-building manifest module.

| Proposed scope | Units | Counted-time proxy (min) | Guard / request allowance (min) |
|---|---:|---:|---:|
| Core applicable production matrix | 800 rows / 64 groups | 342.61 | 428.27 |
| Selected uncapped counterparts | 360 rows / 18 groups | 180.09 | 225.11 |
| N-V4-15, four cells x five seeds x two arms | 40 rows / 8 groups | 139.40 | 174.25 |
| Four parity/certificate/prior/legacy-route proof bundles | 48 items | 71.20 | 89.00 |
| Candidate resource replays, bounded/uncapped groups | Up to 8 items | 8.88 | 11.10 |
| Six browser functional checks | 6 invocations | At most 16.50 | 16.50 enforced ceiling |
| **Total** | **1,200 rows, 56 proof/replay items, 6 browser checks** | **758.68** | **944.23** |

[A] Ask for a **new 945-counted-minute phase-2 envelope**, staged rather than spent in one run.
The two `require` arms have no applicable timing observations, so they are priced at their row
limits, 130 s and 260 s; applying `any` timings to them would be unjustified. The proof bundles use
the existing reserve-based item template: nine selections, one generation and two replays per
bundle. The final task pack must enumerate their concrete cases/manifests and bind their source.

[A] The six browser checks are proposed individual checks of at most 60 s, each inside a helper
invocation capped at 120 s plus 45 s quiet: `6 * 165 / 60 = 16.5 min`. They cover a real-worker
happy path, unique-mode/calibration mismatch, reserve/bound transport, held assembly and late work,
version/cache refusal, and a fresh action after a simulated long pause. They are not a browser
landscape or calibration.

[V/A] Relative to the old account, the unrounded proposed guard would require a cumulative cap of
**1,816 min**, above 1,725. Even a numerically sufficient old balance would not authorize this new
scope. If the owner explicitly transfers/extends funding, preserve the old ledger and state that
decision; otherwise use the fresh ledger. Do not silently reset or reuse the frozen namespace.

[A] If the joint reading instead requires the full old 1,500-row breadth, the same history-based
proxy gives **834.66 min row guard**, and **1,125.51 min** with the same supplements: a new cap of
**1,126 min**. That is a separately declared alternative, not extra rows hidden inside 945.

[V/A] A guard is a spend cap, **not a promise to finish**. T11g's conservative enforced ceiling for
the 1,160 rows is `1160 * 945 / 60 = 18,270 min`; the smaller grant stops an incomplete plan first.
The row admission margin and reserve durations are assumptions, not independent hard deadlines.
The audit's projected completed/censored counts describe **observations**, not requests reaching ten.
Final manifests must retain this distinction, list grace/concurrency, and price any additional scope.

[A] No allowance here covers a refit, automatic retries, expanded CLI-size `require` claims, a
browser-to-Node calibration, phase-3 offers or blind play comparison. Routine unit/fixture verification
is bounded separately (repository maximum 600 s per run; targeted commands smaller), with no redundant
quick suite before a full run. Every engine/browser invocation still uses the shared lock and 45-s quiet.

## 9. Questions

### Q-P2-01 — Owner: authorize the measured scope and funding

- **Decision needed [A]:** approve the separately staged production-validation/N-V4-15 envelope after the
  technical matrix is fixed, or defer it.
- **Evidence [V]:** old account 871.19995/1,725; no `require` stage-4 row; Generator cap 484;
  the audit's independently reproduced prices and §8's explicit populations.
- **Recommended [A]:** the 1,160-row applicable repeat, 40-row Generator-size `require` pilot (Hell 1
  diagnostic only), proof/resource items and six browser checks; **945 counted minutes in a new
  phase-2 ledger**. Approve staged ceilings and their concrete manifest before execution.
- **Alternatives [A]:** full-scope alternative, **1,126 min**, if Q-P2-A3 selects it; explicitly extend
  the old funding authorization with a new scope/cap rather than infer a rollover; or defer measured
  work. Larger CLI-only `require` workloads need an added named scope/price, not a blanket claim.
- **Blocked:** measurement execution and production-readiness claims; no run has been made here.

### Q-P2-A1 — SAs jointly: exact 26x26 legacy predicate

- **Decision needed [A]:** identify the board that D-S24-35 exempts in production.
- **Evidence [V]:** the failed cell is the full 26x26 board; screen classes use active area; the editor
  supports masks and dimensions up to 32. D-S24-35 says that one board at Nightmare, not all large areas.
- **Recommended [A]:** Nightmare + 26 by 26 + 676 active cells, independent of display rotation,
  piece seed or uniqueness. Both set calibration and batch/completion use the same route; all P1-P5
  switches follow it. Test masked 26x26 and other 676-cell masks as non-exceptions.
- **Alternative [A]:** exempt every 26x26 grid including masked ones, or an entire area class. Those
  broaden the recorded exception; if desired, seek owner confirmation rather than silently doing so.
- **Blocked:** final routing predicate and its compatibility/validation case definitions.

### Q-P2-A2 — SAs jointly: request boundaries and standalone set reserve

- **Decision needed [A]:** apply the one-clock contract to the two UI actions and to combined CLI/bench calls.
- **Evidence [V]:** `jobs.js:303-424` has two user actions; its timestamps are `Date.now`;
  the worker clock is `performance.now`; the frozen hard guard is in the bench host.
- **Recommended [A]:** a fresh client-clock scope per UI press; 46-s set cut for eligible new-search
  set actions, fresh 115-s work stop for a standalone batch; one shared scope for an automatic
  set-plus-batch CLI/bench request; hard response guard covers assembly. No clock spans a human pause.
  Legacy routes keep their old search/timer semantics.
- **Alternative [A]:** give a standalone new-search set the full 115 s instead of the frozen 46-s
  cut. That changes the reserve's application and user-visible cutoff and needs a recorded ruling,
  with owner confirmation if treated as a change to IG-P-D1 rather than a caller clarification.
- **Blocked:** final host/client interface, deadline tests and measured request definition.

### Q-P2-A3 — SAs jointly: freeze the production-repeat design before any run

- **Decision needed [A]:** confirm the 1,160-row applicable matrix, legacy exception gate, source/trace
  identity and fresh seed cohort, or require the full diagnostic breadth.
- **Evidence [V]:** the phase-2 gate repeats validation on production, with controls and population;
  fixed selected screening is now only `n-mid`; original 1,500 rows include unshipped/duplicate arms.
  The 26x26 decision preserves legacy behavior, not a new statistical claim for its rejected v4 arm.
- **Recommended [A]:** §5.6: all 35 boards retained; new-search controls keep their 0.9 lower-bound
  gate; 26x26 is judged by legacy identity/replay with timing reported; no reclassification of the
  historical FAIL. Recheck (c5) for `n-mid`, quantify P5 on the 18 eligible cells, use fresh reps
  60-79/60-64, and bind matched trace instrumentation without changing the P6 observer route.
- **Alternative [A]:** enumerate the full 1,500-row diagnostic arrangement, with every nonshipping
  override explicitly identified and no new screen admission. Use its separately higher price.
- **Blocked:** final measured manifest and grant request. No threshold, cohort or arm is changed after
  reading new validation outcomes.

These are questions to the owner or the two SAs under the recorded delegation, not to Fable.
No question reopens Hell 1 offers, a wider default pool, the score model or the old phase-0 verdict.

## 10. Evidence index and validation

| Evidence | Content / exact command |
|---|---|
| `E/round1-audit.mjs` | Read-only auditor. From `Q:\git\pentomino`: `node docs\improve-generating-phase-2\evidence\sa-astra\round1-audit.mjs` |
| `E/round1-audit.json` | Source/fork identity; raw/LF input hashes; 99 published files / 1,500 rows; 27 prior entries; original 103-step price reproduction; every proposed row group, proxy and guard; budget-account math; metadata-size illustration |
| `E/round1-validation.txt` | Syntax, the audit command/output, `npm run check`, explicit CRLF/UTF-8/no-trailing-whitespace checks, and protected-tree/independence scope check |
| Governing records | `request.md`; plan v4 §§3/5/6/9; stage-4 report §§1/3/4/5/6/7/8; stages-2-4 plan §§4.1-4.9; `s06-reading.md:128-160`; both older task registers for D-S24-35/N-V4-15 |
| Immutable configuration / observations | `V4-S3/freeze.json`; `V4-S4F/verdicts.json/.md`; `V4-S4` and `V4-S4C` published row files; `prior-s3-v1.json`; the two existing compiled plans |
| Runtime trace | The concrete source/line citations in §§3-7; the audit index hashes those files, including the CLI and five replay-fixture consumers |

[V] The existing design brief is `docs/design-brief.md`; no Vietnamese brief file was found.
Product strings are in `generator/locale.en.js` and `generator/locale.vi.js`; user/developer guides
have their EN/VI pairs. Do not invent an absent documentation path in the task pack.

[A] This report is input to cross-review and a joint plan, not an approved task pack. [V] All work in
this analysis is unlocked reading/hash/arithmetic and document authoring; **new measured engine time
is zero**. No production/test file, historical observation, branch ref or PR was changed.
