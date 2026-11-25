# improve-generating phase 2: round-1 cross-review of SA-Astra's analysis (SA-Opus)

| Item | Value |
|---|---|
| Author | SA-Opus (`claude-opus-5.5`) |
| Reviewed | `docs/improve-generating-phase-2/sa-astra/round-1-analysis.md` and `evidence/sa-astra/` (read after my analysis was written) |
| Own analysis | `docs/improve-generating-phase-2/sa-opus/round-1-analysis.md` |
| Repository, head | `Q:\git\pentomino`, `gen-v4`, `7c1bad2`; every code claim below re-checked there, not against either report |
| New evidence | `evidence/sa-opus/p2-xr-price.mjs`, `.md`, `.json` (one price for the reconciled matrix); `evidence/sa-opus/p2-xr-setstage.mjs`, `.md` (set-stage times against the 46-s cut); read-only, no engine run (0 counted s) |
| Marks | [V] verified at `7c1bad2` or in a published record; [A] assumed or proposed |

## 1. Summary

- **We agree on the port:**
  - a semantic rebuild, inert until one cutover task;
  - 190 M only on Nightmare 196-256 cells, under a new screen id;
  - seven version keys, with the budget and deadline tables fixed by `gen-v4`;
  - `replay-case.json` kept unchanged as the `gen-v3` refusal case;
  - Hell 1 measured only in a labelled measurement copy, never offered;
  - no clock across the human pause between the Generator's two actions.
- **Corrections to my analysis.**
  - SA-Astra is right that the CLI makes a set and a batch under one invocation, with a 676-cell default. So the one
    deadline must be ported, and the 26x26 route does reach users.
  - The owner's text exempts only the full 26x26 board.
  - My completion threshold was stricter than the plan's.
  - I withdraw three questions (Q-P2-2, Q-P2-4, Q-P2-S5) and adopt her fresh seeds.
- **Agreed price: 812 counted minutes, stage A 410 then stage B 402** (counted 651.913, guard 810.767), for 1,013
  planned rows (998 unconditional, 15 conditional slots). SA-Astra enumerated it; I reproduced every row and both stage
  schedules exactly (`p2-xr-verify-astra.md`). It supersedes my 480, my 786 and my interim 852, and her 945 and 1,126.
- **After the coordination with SA-Astra (section 8, 14:00 and 14:44): one joint recommendation.** Agreed:
  - the deadline: separate Generator actions at 115/120 s; one clock with the 46-s reserve for `gen-v4`-route CLI and
    bench requests; a real host guard over assembly;
  - the seeds: the frozen reps 20-39, Master 20-24, as a source-port replication;
  - port equality on every measured row;
  - the (c5) comparator;
  - the predeclared conditional P5 twins;
  - N-V4-15 with Hell 1;
  - 140 sentinel rows for boards without a prior cell;
  - the reach-counter split;
  - `screen-v4-v1`.
- **One wording proposal remains:** plain words instead of "window" in four strings (8.6). Both versions are accurate;
  the owner chooses in Q-P2-5.

## 2. Agreements

| Topic | Shared position | Evidence |
|---|---|---|
| Port strategy | semantic rebuild behind `selectClues`, retained legacy selector, no frozen globals, journals or Node imports; inert until a cutover task | her §4, §5.1; mine §4.1; `ig-select-v4.js:23-30, 226` [V] |
| Screen | 190,000,000 only on Nightmare active areas 196-256; every other area canonical; unlisted 145-195 and 325-359 fail closed; boundary tests 144/145, 195/196, 256/257, 324/325, 359/360 | `freeze.json` `values.W`, `bounds`; `stage4-report.md:36-55` [V] |
| Identity | seven keys; `prior-s3-v1` unchanged; a new screen-table id (hers `screen-v4-v1`; I adopt it); `budget-s3-v1`, the bound and `deadline-s3-v1` fixed by `gen-v4`, a change takes a new `algo` | `plan.md:526-531` [V]; her §5.1 items 2-3; my Q-P2-S1, Q-P2-S2 |
| One running version | every new record `gen-v4`, legacy routes included; old records never restamped, unavailable by `set-versions` or `record-versions` | `plan.md:522-525` [V] |
| Records | per-`algo` shape and copy; `made.igPrior` 1-128 or null; subset ordinals below 2,192 | `v4.json` `pv-7`..`pv-15`; `ig-select-v4.js:56-62` [V] |
| Calibration | session-only; restoring a set clears calibration and trust; no migration | `generator/state.js:606-619, 983-985` [V] |
| Saved steps | the cache key, or a check before a hit is shown, takes the running seven-key tuple | `generator/ui/replay-cache.js:71-74` [V] |
| Fixtures | `replay-case.json` byte for byte as the refusal case; five consumers move to a new `gen-v4` fixture; the 10x6 fixtures change in their declared versions only | `tests/*.test.js` (5 readers) [V]; `record-fixtures.mjs:502-541` [V] |
| Hell 1 | ported, unreachable from the apps, measured only by a diagnostic offer in a labelled measurement copy, reported not gated | `policy.js:336-339`; `levels.js:30`; `instr.json` `diag-1` [V]. I withdraw my tools-only production flag (my 5.3) in favour of her measurement copy |
| UI clocks | no clock spans the pause between "New piece set" and "New puzzle"; never pass `Date.now()` job times to the pool | `generator/jobs.js:201` (`Date.now`); `worker-pool.js:132-136, 642-643` (`performance.now`, a 115-s timer per request) [V] |
| Combined requests | the CLI and the bench make a set and a batch in one invocation and share one clock with `deadline-s3-v1`; the hard bound covers pack assembly | `tools/generate.mjs:548-562`; `generation-client.js:1172-1186` (`finish(job)` precedes `assemblePack`) [V] |
| Pools | real widths 1, 2 and 4 (`MAX_POOL_SIZE` 4); width 8 by the fold simulation, as P1-02 did | `worker-pool.js:75` [V] |
| Validation | Node v26.13.0, four workers, cold; the recipe of plan §5.2 (capped T10, 10,000 resamples, seed 20261116, 10th percentile); all ten controls kept with 20 reps each, 26x26 by identity; the failed control's record unchanged | `plan.md:604-645` [V] |
| Effort | about 43 developer hours, her 16-task outline as the base (it has the clock and host tasks my outline lacked) | her §8.1 |

## 3. The six divergences, with the evidence and a proposed resolution

Section 8 records how the coordination with SA-Astra after this review changed 3.1 to 3.3 and 3.5; it supersedes them where
they differ.

### 3.1 Validation scope, seeds and price

**What the plan's gate requires** [V `plan.md:548, 604-645, 666`]:
- the frozen validation repeated on the production code, the controls included, the population per cell;
- the completion gate on the five failing cells: at least 18 of 20 reach ten, with no dead-end entry;
- no regression on the controls: at least 18 of 20 reach ten, and a one-sided 90 % lower bound of at least 0.9;
- Master identity;
- Hell 1 reported against 18 of 20;
- rule (c5) for every class that ships a screen;
- the uncapped search as the comparator for lost completions.

| Item | SA-Astra | SA-Opus (round 1) | Proposed reconciliation |
|---|---|---|---|
| Core | 800 rows: shipped 19 cells x 20 (26x26 by the route), Master 16 x 5 both arms, today on 10 controls x 20, `n-mid` without the screen 3 x 20 | no `n-mid` no-screen arm; 26x26 at 5 reps | **hers.** `n-mid` is the one class that ships a screen, so (c5) must be re-decided on production. 20 reps on 26x26 keep all ten controls as they were |
| P5 comparator | 360 unconditional uncapped twins | none (equality carried P5 over) | **conditional twins**: a twin only for a row where P5 acted (below ten, a bound match or firing, a set ended by a budget stop, a reserve or clock cut). With per-call reach counts, this gives exactly the false-stop and lost-completion counts (3.1.1) |
| Boards without a prior cell | none | 4 boards x 10 x 2 | 11x11, 18x19 and 21x21 both arms x 20 (no-regression), 15x15 `gen-v4` x 20 (3.5) |
| Port equality | reference parity in tests | on every row (frozen seeds) | the frozen reps 20-21 of the 19 cells and the `n-mid` no-screen copy, before any timed row (3.2) |
| N-V4-15 | 22x22 and 32x15 Nightmare and Hell 1, bounded and uncapped x 5 | 22x22, 32x15, 18x20 Nightmare, today and `gen-v4` x 10 | 22x22 and 32x15 Nightmare, **today and `gen-v4`** x 5, plus conditional uncapped twins. Hell 1 `require` is an owner option (not offered; phase 3) |
| Proof bundles | 4 bundles at the frozen plan's reserve-based quote, 71.2 min | none priced | hers, priced at their **measured** cost: V4-S4's four parity steps took 1,400.916 counted s (3.1.2) |
| Replays, browser | 8 replay items; 6 checks, 16.5-min ceiling | about 30 replays; smoke unpriced | hers |
| Seeds | fresh reps 60-79, Master 60-64 | frozen 20-39 | **hers** for every timed row: the frozen controls passed on 20-39 before the 26x26 decision was taken, so re-testing them there would not be independent. Reps 40-59 stay reserved for N-V4-04 (`tasks/improve-generating-stages-2-4/check-list.md:519, 601`). Reps 20-21 are used only for port equality |
| Price basis | T11g's pure pricing, 1.25 x the arm/cell median | mean + 2.1 s per row + 45 s per invocation | **hers.** It is the round's method, and conservative: on the frozen row steps it gives 1.081 (V4-S4) and 1.163 (V4-S4C) times the counted seconds they really took (`p2-xr-price.md` §1) |

**The proposed agreed price** (`node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-price.mjs`):

| Component | Rows | Counted (min) | Guard (min) |
|---|---:|---:|---:|
| Core (her 800 rows; reproduces her 342.61 and 428.27 exactly) | 800 | 342.6 | 428.3 |
| Boards without a prior cell: 3 both arms, 1 `gen-v4` only | 140 | 64.9 | 81.2 |
| Port equality, frozen reps 20-21, one mixed step | 44 | 20.2 | 25.2 |
| N-V4-15 pilot, priced at the row limits (no `require` timings exist) | 20 | 69.7 | 87.1 |
| Conditional twins: 15 main rows (the frozen round had 10, all 14x14 Hell 1), 10 `require` rows at 260 s | 25 | 85.3 | 106.6 |
| Proof bundles at their measured cost; her replays; her browser ceiling | - | 48.7 | 56.8 |
| **Total** | **1,029** | **631.4** | **785.1** |

- **Grant: 786 counted minutes, in a new phase-2 ledger.** `plan.md:583-584` [V]: "Phase 2's repeat of the
  validation on the production code is priced in phase 2's own manifest". The 853.8 minutes left of the 1,725 belong to
  the closed frozen round.
- **Stages.**
  - Stage A, guard 315.9: the items that can stop the plan, run first: port equality, the proof bundles, N-V4-15 and its
    twins, the boards without a prior cell, and the thin controls 3x29, 32x15 and 22x22.
  - Stage B, guard 469.2.
  - A stage-A failure returns to the owner before stage B.
- **Alternatives:**
  - her unconditional twins: +176.6, about 962;
  - the Hell 1 `require` diagnostic: +87.1;
  - the literal 1,500-row breadth: her 1,126;
  - without the boards lacking a prior cell: -81.2.
- **A saving for the pack author, not taken in the price.** T11g prices one cell per step, so 32 Master groups cost 32
  quiet periods. Grouping the Master cells by arm would save about 22 minutes.

#### 3.1.1 Why conditional twins give the same counts

- **A false stop** needs a request that the bound ended; **a lost completion** needs a bounded request below ten
  (`stage4-report.md:116-126` [V]).
- A bounded request without a budget stop, a bound firing or a clock cut follows the same trajectory as its uncapped
  twin. Budgets count deterministic work and bind only when spent; the bound acts only after four same-side failures;
  the clock only when it cuts. Its twin therefore adds timing noise, not a count.
- The per-call reach counts that both analyses require mark exactly the rows where P5 acted (her §5.6; my 5.2 `stats`).
- The frozen round's twins confirm it: no budget stop, no bound firing, and lost completions only where the 115-s stop
  cut a 14x14 Hell 1 request (`stage4-report.md:116-126, 177-190`).

#### 3.1.2 The proof bundles' price

- Her proof price re-prices the frozen plan's own quote of the four `items` steps (`round1-audit.mjs`, `oldProofs`):
  4,272 counted s, built on reserves before any bundle had run.
- The same four bundles took 1,400.916 counted s in V4-S4. That figure is the four `parity-*` steps of
  `tests/artifacts/ig-proto/frozen/V4-S4/invocations.jsonl` [V].
- T11g's own rule prices items at "the mean measured seconds of its kind and variant, else its reserve"
  (`tools/ig-proto/manifest.mjs`, `ItemGroup.durationsS`) [V].

### 3.2 Proof before timing (my Q-P2-S4)

- **Her analysis.** It has reference parity in the unit tests (T1) and "measured-clone parity" (P2-12). It does not
  compare production requests with the frozen arms' requests.
- **My proposal, adapted to fresh seeds.**
  - Run the 19 frozen cells and the `n-mid` no-screen copy on the frozen reps 20-21 before any timed row.
  - Each request's puzzle keys, in slot order, must equal the frozen shipped arm's (`run.details.igPuzzleKeys`,
    `tools/ig-proto/verdicts.mjs:237-245` [V]).
  - Where a clock stop cut either request, the shorter list must be a prefix of the longer (IG-P-D1 condition 2,
    `plan.md:335-336` [V]).
  - Any other difference stops the plan as a port defect.
- **Cost:** 44 rows, 20.2 counted and 25.2 guard minutes.
- **Value:** about 440 puzzles and their set calibrations compared exactly. P1 to P5 are proved request by request
  before any timing is read; neither unit parity nor bundles prove that.
- **Status:** open until SA-Astra accepts.

### 3.3 The deadline

**Agreed:**
- a fresh monotonic scope per Generator action;
- one shared scope with `deadline-s3-v1` for the CLI and the bench;
- the hard bound through pack assembly;
- legacy routes keep their timing;
- a batch `response-bound` mapped to the existing shortfall notice (`jobs.js:132-164` [V]).

**Divergent: the standalone set action.**
- She applies the frozen 46-s set cut to it.
- I give it the full 115-s stop. The reserve exists to keep time for a batch on the same clock (`plan.md:331-339`
  [V]), and that action has none.

**Data** (`p2-xr-setstage.md`, 1,340 frozen Nightmare and Hell 1 rows):
- The longest `gen-v4` Nightmare set stage on a board the Generator offers is 16.1 s (22x22); 16.5 s on 24x24.
- One set stage exceeded 46 s: a 14x14 Hell 1 uncapped twin, at 52.0 s, which did not reach ten.
- The reserve cut acted once in the bounded arms, on 14x14 Hell 1 rep 33 (`set:reserve-cut` at 46.0 s, no set, in both
  bounded arms).
- 14x14 Hell 1's other bounded set stages reach 44.9 s.

**Reading.**
- For Nightmare, the only level offered, the choice has almost no effect on this machine. On a slower browser the cut
  binds first, and it can only lose sets.
- I read IG-P-D1 applied per request as a caller clarification, not a change. If SA-Astra agrees, the SAs settle it. If
  not, it goes to the owner as Q-P2-3, with both readings and these numbers.
- **Settled in section 8:** SA-Astra withdrew the standalone 46-s cut. In the frozen harness, the live deadline applied
  only with an explicit host origin, which only the bench supplied (`live.json` `lv-9`, `lv-10`, `lv-12`;
  `tools/ig-proto/lib/lane-worker.mjs:186`) [V].

### 3.4 The 26x26 route (my Q-P2-4, her Q-P2-A1)

**Verified** [V]:
- The Generator page stops at 484 cells on a desktop and 360 on a phone (`policy.js:24-31`; `qualification.js:15-17`;
  `state.js:322-324`; `design-brief.md:96`).
- The CLI's `--max-active` defaults to 676 (`tools/generate.mjs:40, 63, 204-206`).

So the route does reach CLI users, and my F-P2-01 ("no user effect in this release") is corrected.

**The domain.**
- The owner's decision reads "Keep today's search on 26x26 Nightmare … `gen-v4` is proposed for the other boards with
  the recorded class choices" (`stage4-report.md:366-368` [V]). Boards of 577 to 675 cells are among "the other boards":
  class `n-large`, no screen.
- I withdraw my recommendation (b) (every Nightmare board above 576 cells) and agree with her predicate: Nightmare,
  26 by 26, 676 active cells, independent of rotation, for the set calibration, the batch and the completion pass.
- The plan records as a risk, not a question, that CLI boards of 577 to 675 cells run `gen-v4` unmeasured.
- **Resolved.**

### 3.5 Boards without a prior cell (my Q-P2-S3)

**Her analysis** ports the exact rule (`null` gives K - 8 with step 8; her §5.1 item 1) and lists the risk. It does
not measure the path. That path is what most user boards take:
- of 295 offered desktop rectangles, 29 have a cell (`p2-prior-coverage.md` [V]);
- P1 records 6 to 7 probes without a prior, against a median of 2 with one (`plan.md:231-233` [V]).

**Proposal:**
- Choose 11x11 (121, `n-small`), 18x19 (342, unlisted) and 21x21 (441, `n-large`), each next to a control on which
  today's search completes (10x10, 18x18, 20x21). Run both arms x 20 under the control gate.
- Add 15x15 (225, `n-mid`, screen) `gen-v4` only x 20 under the completion count.
- Price: 81.2 guard minutes, in stage A.
- **If a board fails,** the owner decides (route or remedy). The prepared remedy is a nearest-area share piloted on
  fitting seeds, frozen, then validated.

**Status:** open until SA-Astra accepts.

### 3.6 Provenance, table ids and texts

- **Provenance and ids: agreed** (section 2).
- **Texts.** Both proposals were checked against `locale.en.js:303-326` and `locale.vi.js:298-321` [V].
  - Her wording is better in two places: a window "was not found" (mine asserted that none exists, too strong for a
    heuristic rescue), and a neutral screen-capped step. Her `rerateCapped` step is a needed addition.
  - My notices are better for users: they name the side in plain words and keep N-NOSET's advice.
  - A reserve cut reuses the existing N-NOSET ("within the time limit"); no new key.

  Merged proposal for the owner (Q-P2-5):

| Key | English | Vietnamese |
|---|---|---|
| `notice.N-NOSET.below` | Couldn't create a {level} piece set for this board: on the first four piece sets tried, every clue count tried gave puzzles easier than {level}. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, mọi số mảnh đặt sẵn đã thử đều cho đề dễ hơn mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `notice.N-NOSET.above` | Couldn't create a {level} piece set for this board: on the first four piece sets tried, every clue count tried gave puzzles harder than {level} or too hard to rate. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, mọi số mảnh đặt sẵn đã thử đều cho đề khó hơn mức {level} hoặc quá khó để chấm điểm. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `replay.step.locate` | Clue set {sequence} ({count} clues) is rated to find how many clues this level needs: score {score}. | Nhóm mảnh đặt sẵn {sequence} ({count} mảnh) được chấm để tìm số mảnh đặt sẵn mà mức này cần: điểm {score}. |
| `replay.step.screenCapped` | The quick rating of clue set {sequence} reached its work limit. It only guides the search; it has no score. | Lần chấm nhanh nhóm mảnh đặt sẵn {sequence} đã chạm giới hạn phép tính. Kết quả chỉ định hướng việc tìm kiếm; không có điểm. |
| `replay.step.rerate` | Clue set {sequence} is rated again with the full limit: score {score}. | Nhóm mảnh đặt sẵn {sequence} được chấm lại với giới hạn đầy đủ: điểm {score}. |
| `replay.step.rerateCapped` | The full rating of clue set {sequence} also reached its limit, so it has no score. | Lần chấm đầy đủ nhóm mảnh đặt sẵn {sequence} cũng chạm giới hạn nên không có điểm. |
| `replay.step.budget` | This clue search reached its work limit: no further rating or uniqueness check was started. | Lần tìm các mảnh đặt sẵn này đã chạm giới hạn phép tính: không bắt đầu thêm lần chấm điểm hay kiểm tra tính duy nhất nào. |
| `replay.step.noWindow.below` | No clue count was found that gives a puzzle of this level: down to one clue, every clue set tried was easier. | Không tìm được số mảnh đặt sẵn cho đề ở mức này: giảm tới một mảnh, mọi nhóm đã thử đều dễ hơn. |
| `replay.step.noWindow.above` | No clue count was found that gives a puzzle of this level: up to the largest allowed count, every clue set tried was harder or could not be rated. | Không tìm được số mảnh đặt sẵn cho đề ở mức này: tăng tới số mảnh tối đa cho phép, mọi nhóm đã thử đều khó hơn hoặc không chấm được. |

"giới hạn phép tính" follows the existing `replay.limit.work` ("quá nhiều phép tính", `locale.vi.js`) [V].

## 4. Errors and gaps found in SA-Astra's analysis (re-checked at `7c1bad2`)

| # | Her text | Finding | Evidence |
|---|---|---|---|
| X-1 | §8.2: four proof bundles, 71.20 counted min (89.00 guard) | priced from the frozen plan's reserve-based quote, while the same bundles took 23.3 counted min; T11g prices measured items at their measured means | `invocations.jsonl` `parity-*`, 1,400.916 s; `manifest.mjs` `ItemGroup` [V] |
| X-2 | §5.6: 360 unconditional uncapped rows | informative only where P5 acted; conditional twins give the same counts for about 25 rows (3.1.1) | `stage4-report.md:116-126, 177-190` [V] |
| X-3 | §5.6, Q-P2-01: N-V4-15 compares bounded and uncapped `gen-v4` only | without today's arm it cannot show whether `require` regresses for users. Stage 1 already saw `require` fail on 26x26 under v4 (`tasks/improve-generating-v4/check-list.md:637`) | [V] |
| X-4 | §5.1, §7: the exact prior lookup with a K - 8 start | correct, but unmeasured on the boards most users pick (90 % of offered rectangles) | `p2-prior-coverage.md` [V] |
| X-5 | §5.3, Q-P2-A2: the 46-s cut on a standalone set action | protects no batch in that action. On this machine it would never bind for Nightmare (longest offered-board set stage 16.1 s); on slower devices it binds first and loses sets. **Withdrawn by SA-Astra (section 8)** | `p2-xr-setstage.md` [V] |
| X-6 | §5.4: "an explicit 26x26 legacy-route replay case" | a 676-cell replay in `npm test` risks the 10-minute limit (`AGENTS.md:16`); better as the legacy-route proof bundle under the lock | [A] |
| X-7 | header table: `request.md:54-55` | the file has 54 lines | [V] |

The other code claims I re-checked hold [V]:
- the certificate on main-phase work (`ig-select-v4.js:497`);
- the always-installed `onAdd` budget check (`:630-638`);
- `null` `made.igPrior` omitted on replay (`v4.json` `pv-17`, `replay.js`), so the table applies;
- the 115-s timer per `beginRequest` (`worker-pool.js:642-643`);
- `Date.now` job times (`jobs.js:201`);
- `finish(job)` before `assemblePack` (`generation-client.js:1172-1186`; the assembly is a sliced validation, so its
  time is small but unbounded);
- the CLI's set then batch (`generate.mjs:548-562`);
- `MAX_META_BYTES` 4,096 for `meta` only (`pack.js:35-44`);
- session-only calibration (`state.js:72, 983-985`);
- `MAX_POOL_SIZE` 4 (`worker-pool.js:75`);
- the 484/360 limits;
- the account 52,271.997 s.

## 5. Corrections to my own analysis

| # | My text | Correction |
|---|---|---|
| C-1 | F-P2-01, Q-P2-4: the route has no user effect | the CLI defaults to 676 active cells (`generate.mjs:40`), so the route reaches CLI users. Q-P2-4 is withdrawn; the domain is the full 26x26 board (3.4) |
| C-2 | Q-P2-3 (a), 5.2, 5.5: `deadline-s3-v1` not ported | the CLI is a combined request (`generate.mjs:548-562`). The one deadline is ported for the CLI and the bench, with a monotonic shared scope and the bound over assembly. Only the standalone set action's cut stays open (3.3) |
| C-3 | 6.1 B-1: 20 of 20 and no response above 120 s | the plan's gate is at least 18 of 20 with no dead-end entry; responses above 120 s are reported (`plan.md:626-629`) |
| C-4 | 6.1 B-2 | adds "at least 18 of 20 reach ten" per control; the lower bound is the 10th percentile of 10,000 seed resamples (`plan.md:607-611, 642-645`) |
| C-5 | 6.2 T-3: 1, 2, 4 and 8 workers | real pools 1, 2 and 4; width 8 by the fold simulation (`worker-pool.js:75`; P1-02) |
| C-6 | 5.2, 5.5: `made.igPrior` null | on replay a null `igPrior` is omitted, so the table prior applies. Passing `ctx.igPrior = null` would disable the table (`v4.json` `pv-17`; `ig-select-v4.js:199-205`) |
| C-7 | 5.4 step texts | merged texts of 3.6: "not found" wording, neutral screen-capped step, added `rerateCapped` |
| C-8 | 8.2 price basis: 2.1 s per row, about 20 rows per invocation | the 2.1 s included V4-S4's parity steps. Row steps cost 0.99 s per row beyond the responses plus 45 s per invocation, and T11g runs one cell per step (V4-S4: 90 row invocations for 80 groups). My 377 and 480 are superseded by 3.1 |
| C-9 | 4.2 V-a, 5.9 | adds the `n-mid` no-screen arm, conditional P5 twins, proof bundles and browser checks |
| C-10 | 5.9, Q-P2-S5: seeds 20-39 | in this review: fresh reps 60-79. After the coordination: **back to reps 20-39, Master 20-24**, as a source-port replication with no retuning (section 8) |
| C-11 | 5.9 N-V4-15 | 22x22 and 32x15 only, 5 reps; after the coordination, three arms on Nightmare and two on Hell 1 (8.3) |
| C-12 | 8.1: about 38 hours | about 43: her clock, host and legacy-isolation tasks are needed |
| C-13 | 5.3: a tools-only `diagnosticOffer` in production | withdrawn: the diagnostic offer lives only in a labelled measurement copy (her §5.6) |
| C-14 | 9 Q-P2-5 evidence: "0 false stops on 19 pairs" | the bound never fired, so zero false stops is vacuous (F2). The statement changes because the behaviour changes; the evidence is "never fired on the validation rows, unexercised" |
| C-15 | 5.6: a set call and a candidate call "at most 2 x 40 G" | the budget is checked before each primitive, so a call can overshoot by its last primitive. `REPLAY.work` comes from measured replays plus that overshoot, not from the budget alone |
| C-16 | 1 point 3: "`require` has never run under `gen-v4`" | it ran in the parity, replay and stage-1 (V4-T04) passes; no **stage-4 validation** row used it (`stage4-report.md:189-190`) |

## 6. Merged question list (final, after the coordination of section 8)

### 6.1 For the owner

| ID | Question | Status |
|---|---|---|
| **Q-P2-1** (mine and her Q-P2-01, merged) | Approve the agreed validation (section 8; her cross-review §3) and **812 counted minutes**: stage A, 410, first; after its readout, stage B, 402. A stage-A failure comes back to you before stage B. We recommend a separate phase-2 ledger. Alternatively you may expressly authorize 812 minutes from the 853.8 left of the closed 1,725-minute grant; there is no automatic rollover. 812 is a spend cap: the boards without a prior cell are priced from weak neighbour proxies, and at their row limits the cap would be 1,303. Observations beyond the funds stop incomplete. Or defer | kept; agreed by both SAs |
| **Q-P2-5** | Approve the English and Vietnamese texts and the change of the absolute "no early stop" statement (`design-detail.md:1805`, release notes), which P5 makes false. The bound never fired on the validation rows (F2), so zero false stops is no evidence either way. The four no-window strings are offered in two accurate wordings (8.6) | kept; agreed by both SAs |
| Q-P2-3 (mine and her Q-P2-A2) | the standalone set action's limit | **withdrawn**: agreed in 8.1 (Generator actions 115/120 each; the 46-s reserve only on the `gen-v4`-route CLI and bench clock) |
| Q-P2-2 | the grant | withdrawn: merged into Q-P2-1 |
| Q-P2-4 | the 26x26 domain | withdrawn: the owner's text decides it (3.4) |

### 6.2 For the SAs jointly (the owner's delegation): all resolved

| ID | Question | Status |
|---|---|---|
| Q-P2-S1 | budget table in provenance | resolved: seven keys; the budget, bound, route and deadline belong to the immutable `gen-v4` definition |
| Q-P2-S2 | the production screen table's id | resolved: `screen-v4-v1` |
| Q-P2-A1 | the 26x26 predicate | resolved: Nightmare, 26 by 26, 676 active cells, rotation-independent, every stage |
| Q-P2-S5 | seeds | resolved: reps 20-39 and Master 20-24 as a source-port replication, with no retuning; 40-59 stay reserved (N-V4-04) |
| Q-P2-S4 | port equality | resolved: four proof bundles and eight separate smoke requests before the matrix, then equality on every eligible measured row before any ratio is read |
| Q-P2-A3 | the production-repeat design | resolved: the fixed three-cell (c5) panel; the predeclared conditional P5 twins with her accounting rules (8.6); the 50-row N-V4-15 |
| Q-P2-S3 | boards without a prior cell | resolved: 140 sentinel rows, 20 per arm, predeclared gates (8.6) |
| Q-P2-S6 | where the reach counters live | resolved: minimal integer counts in the production result, plus a symmetric, parity-checked trace in the measurement copies of both arms (8.6) |

**No divergence remains.** The one open choice is the wording of four strings (8.6), which goes to the owner in Q-P2-5.

## 7. Evidence index

| File | Content | Command |
|---|---|---|
| `evidence/sa-opus/p2-xr-verify-astra.mjs`, `.md` | an independent check of SA-Astra's enumerated price: every row's seconds recomputed from the published rows (1,013 of 1,013 equal), and both stage schedules replayed (A 23 invocations, 330.656 counted, 409.195 guard; B 26, 321.258 and 401.572; 410 + 402 = 812) | `node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-verify-astra.mjs` |
| `evidence/sa-opus/p2-xr-price.mjs`, `.md`, `.json` | the calibration of both price bases on the frozen row steps; the converged matrix of section 8 priced with T11g's pure pricing (evaluated as in her audit); stages A and B | `node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-price.mjs` |
| `evidence/sa-opus/p2-xr-setstage.mjs`, `.md` | set-stage times (`igSetMs`) of the 1,340 frozen Nightmare and Hell 1 rows against the 46-s cut, and the rows the reserve cut | `node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-setstage.mjs` |
| `evidence/sa-opus/p2-prior-coverage.md`, `p2-price-basis.md` | round 1 (unchanged) | round 1 |
| `tests/artifacts/ig-proto/frozen/V4-S4/invocations.jsonl`, `V4-S4C/invocations.jsonl` | counted seconds by step (`rows-*`, `parity-*`) | read by `p2-xr-price.mjs` |
| `tools/generate.mjs:40, 63, 204-206, 548-562`; `core/browser/generation-client.js:1172-1186`; `core/browser/worker-pool.js:75, 132-136, 642-643`; `generator/jobs.js:201`; `generator/state.js:72, 606-619, 983-985`; `core/engine/pack.js:35-44`; `tools/ig-proto/variants/v4.json` `pv-17`; `ig-select-v4.js:497, 630-638`; `docs/improve-generating/plan.md:331-339, 583-584, 604-645`; `docs/improve-generating-stages-2-4/stage4-report.md:366-368` | the code and plan claims of this review | read at `7c1bad2` |

## 8. Coordination with SA-Astra after the cross-review (2026-11-25 14:00)

SA-Astra's message (agent `56d9faa7`) answered my round-1 analysis. I re-checked each point at `7c1bad2`.

### 8.1 Settled

- **Deadline.** She withdrew the standalone 46-s cut: the frozen `igLiveOf` reads a host origin that only the bench
  supplied (`live.json` `lv-9`, `lv-10`, `lv-12`; `lane-worker.mjs:186`) [V]. Agreed:
  - the Generator's two actions keep 115/120 s each, with no clock across the human pause;
  - the CLI and the bench keep IG-P-D1's one 115/120-s clock with the 46-s reserve;
  - both paths get a real hard host guard over pack assembly. `TIME.responseMs` is defined at `policy.js:69` and read
    nowhere in `core/` or `generator/`, so the 120-s bound is not enforced today [V], and `finish(job)` precedes
    `assemblePack` (`generation-client.js:1172-1186`) [V].
- **Seeds.** She offered the frozen reps 20-39 (Master 20-24) as a source-port replication, not an independent
  confirmation and not a fit, with no retuning on them. I accept: it lets port equality be read on every measured row
  at no extra engine row. My fresh-seed position (C-10) is withdrawn.
- **Port equality** (her design, which I accept):
  - an eight-row smoke before the timed matrix;
  - then a fail-fast comparison of every measured row with its frozen row before any ratio is read, the 26x26 rows
    against today's legacy rows (`log-link`, and phase 1's `6b94ffb`);
  - puzzle keys must be identical (P6 changes no key);
  - the clock-prefix rows of the frozen round are the nine 14x14 Hell 1 rows stopped at 115 s plus rep 33's reserve cut
    [V, `V4-S4/fr-frozen-none/val-14x14-hell-1.runs.json`];
  - an empty or no-set prefix counts as no evidence;
  - work and skip parity come from the proof bundles, whose inputs carry them; published keys cannot.
- **Her corrections to my analysis,** accepted:
  - 26x26 reaches CLI users (C-1);
  - B1 is 18 of 20 (C-3);
  - "not found" wording (C-7);
  - zero false stops is vacuous (C-14);
  - the budget overshoot (C-15);
  - `require` ran outside stage 4 (C-16);
  - the price basis 0.99 s per row beyond the responses (C-8). She keeps 2 s per row as a stated, conservative
    assumption; agreed.
- **Her point 6, the no-window names,** not accepted as stated:
  - the frozen code renames end to end: `ig-select-v4.js:1079` sets `igNoWindow` to `below` or `above`, and `v4-p5.json`
    edit `p5-1` makes the reason `no-window-<side>`, so `set:no-window-below` and `set:no-window-above` are the frozen
    transported names [V];
  - the internal states and proofs keep `below-to-one` and `above-to-max`;
  - both names stay as they are, unless renamed everywhere.

### 8.2 The predeclared conditional P5 comparator (proposed for her acceptance)

- **Trigger, fixed before the run.** A production bounded row gets an uncapped twin when either that row or its frozen
  counterpart (same case and rep) shows any of:
  1. fewer than ten puzzles;
  2. a set attempt that ended `no-window-*`, or the bound fired;
  3. a call ended by a budget stop;
  4. a reserve cut, the 115-s stop or the host bound.

  The triggers come from the per-call reach counts that the validation records anyway (F2, F4, F7).
- **The twin.** The same request on the uncapped measurement copy of production: no call budget, no bound, no live
  deadline, today's two timers, the same settings. Twins run in stage B, after the bounded rows of their cell.
- **Readings per cell.** False stops: the bound fired and the twin made a set. Lost completions: the bounded row is
  below ten and the twin reached ten. Also the number of triggered rows.
- **Why it is exact.** A row with no trigger, in production or frozen, has no P5 action. With all-row port equality,
  the deterministic outcomes are the frozen ones, and the frozen V4-S4C pairs (`stage4-report.md:116-126`) already
  compare them. Every timing-dependent row gets a fresh production twin, so no frozen timing or work is adopted under P6.
- **Reserve and stop.**
  - Priced allowance: 15 twins. In the frozen round, 10 rows would trigger, all 14x14 Hell 1.
  - More than 15 triggered rows is a finding. Its twins are priced from the reserve, and beyond it the plan stops for
    the owner.

### 8.3 N-V4-15 (converged)

- **Nightmare, 22x22 and 32x15:** `require` x 5 on three arms: today's search (`6b94ffb`), `gen-v4`, and `gen-v4`
  uncapped. Today's arm answers whether users regress; the uncapped arm answers N-V4-21's P5-under-`require` question.
- **Hell 1, 22x22 and 32x15** (diagnostic; not offered): `gen-v4` and uncapped x 5.
- **Seeds:** hers, `ig-p2/require/<cell>/<rep>`, reps 0-4.
- **Price:** priced at the enforced row limits, because no `require` validation timing exists: 130 s for `gen-v4`,
  260 s for today's two timers and for the uncapped copy. 50 rows.
- **Stop:** results read before the main matrix; a result that needs a frozen value to change stops for a ruling.

### 8.4 The boards without a prior cell

- She accepts the cohorts and notes that 29 of 295 and 20 of 236 count rectangles with W <= H, not user frequency.
  Agreed; it is a coverage measure.
- **Size:** 20 requests per arm, because the control gate needs 18 of 20 and the seed bootstrap of plan §5.2.
- **Boards:**
  - 11x11 (121, `n-small`), 18x19 (342, unlisted) and 21x21 (441, `n-large`), both arms, under the control gate;
  - 15x15 (225, `n-mid`, screen), `gen-v4` only, read against 18 of 20.
- **Seeds:** reps 20-39, never used on these boards.
- **Schedule:** stage A, 140 rows.

### 8.5 Price

- **Interim quote** (superseded by 8.6). `p2-xr-price.mjs`, now on the converged matrix: 1,013 rows; counted 684.3; guard 851.2, so about
  **852** counted minutes; stage A 382.0, stage B 469.2. It uses her round-1 basis, 1.25 x the frozen median, with
  N-V4-15 at its row limits.
- **Final.** SA-Astra computes the enumerated schedule:
  - mean response + 2 s per row;
  - 45-s quiet;
  - the measured proof timings (1,400.916 counted s for the four bundles);
  - explicit reserves for the unknown cases;
  - batching of cells inside a stage where the driver enforces 900 s and checkpoints every row, which removes most
    per-cell quiet periods.

  Her figure replaces mine in Q-P2-1.

### 8.6 Final agreement (2026-11-25 14:44)

SA-Astra's cross-review (`sa-astra/round-1-cross-review.md`, evidence `evidence/sa-astra/round1-cross-audit.*`)
accepts the positions of 8.1 to 8.5 with the refinements below. I accept them all, so the two SAs give one
recommendation.

- **Price.**
  - 1,013 planned rows: 998 unconditional and 15 conditional slots.
  - Bases:
    - matching frozen mean response + 2 s per row (an assumption), with no P6 credit;
    - `require` at its 130/260-s row limits;
    - the ten known triggers at their matching V4-S4C twin rows + 2 s, the five unknown slots at 260 s;
    - the proofs at their measured 1,400.916 s, the resource replays at 533 s, the browser checks at their 990-s ceiling.
  - Schedule: a heterogeneous stage driver with paired arms interleaved and a checkpoint at every row; 885/900/45 s.
  - **Stage A** has 318 rows in 23 invocations: 330.656 counted, 409.195 guard, so 410. **Stage B** has 695 rows in 26
    invocations: 321.258 and 401.572, so 402. **Total 812.**
  - [V] I reproduced every row's seconds from the published rows (1,013 of 1,013 equal) and both stage schedules
    exactly in her execution order (`p2-xr-verify-astra.md`). Packed in her `rows` array order instead, stage A needs
    22 invocations, one 47-s period fewer, which is immaterial.
  - At the row limits, the 140 sentinel rows would raise the cap to 1,303; 812 is a spend cap, not a promise of
    completion.
- **P5 accounting** (her §3.3).
  - The eligible rows are the 360 shipped `gen-v4` rows (the legacy 26x26 excluded) and the 80 `gen-v4` sentinel rows.
    The 20 bounded `require` rows already have unconditional twins.
  - A valid bounded row that reaches ten, or that has no set-bound reason, adds an **analytical zero**: not an observed
    pair, and no proof of zero internal P5 work.
  - Every possible contributor gets a fresh twin. A missing outcome or reach field counts as unknown, never zero.
  - The report keeps separate columns: eligible rows, analytical zeros, observed pairs, false stops and lost
    completions, and required twins still missing. The unchanged `p5Stops` reader is not used, so a missing pair is
    never read as a success.
  - Fifteen is a priced allowance, not a quota; the scope covers up to 440 twins. More than fifteen is a finding,
    repriced inside the authorized funds; otherwise the plan stops and the endpoint is incomplete.
- **Sentinels** (her §3.4).
  - 11x11, 18x19 and 21x21, today's search and `gen-v4` x 20, gated at 18 of 20 with a lower bound of at least 0.9.
    Both gates are declared before the run, and none inherits 18x18's tail exemption.
  - 15x15, `gen-v4` x 20: a completion sentinel only, not a fourth (c5) cell. The (c5) panel stays 14x14, 15x15b10
    and 16x16.
  - A failure goes to the owner before stage B. No fit and no route change without a ruling.
- **Proof before interpretation** (her §3.2).
  - Four proof bundles and eight separate smoke requests at rep 20, never pooled into the 20-row cohorts. Then
    equality on every eligible measured row before any ratio is read.
  - The reference is `fr-frozen` for `n-mid`, `fr-frozen-none` for the other `gen-v4` cells, and `log-link` or phase 1's
    legacy source for 26x26 and Master.
  - New sentinel and `require` cells have no frozen oracle.
  - A clock-cut row is compared on its common prefix; an empty prefix is no evidence.
- **Counters (Q-P2-S6)** (her §3.6).
  - Minimal integer budget, bound and re-rating counts in the production result, without `record`, `onRate` or rating
    detail.
  - Call and primitive starts, ends and cancellations come from an identified trace in the measurement copies of both
    arms, with observer parity proved (not zero overhead). The trace covers cancelled work, which completed-call
    counters cannot bound.
  - The browser deadline checks use the shipping build.
- **Deadline scope.** The shared 46/115/120-s clock applies to automatic `gen-v4`-route CLI and bench requests. Master
  and below, and the exact 26x26 exception, keep their legacy search and timers. The Generator's actions stay at
  115/120 s each, with a real host guard.
- **Names.** `screen-v4-v1`. She withdrew her objection to `no-window-below/above`: `ig-select-v4.js:1079` maps them,
  and both vocabularies stay as frozen.
- **The four no-window strings.**
  - I accept her accuracy point: neither "every clue count tried" nor "too hard to rate" holds after a rescue
    (`ig-select-v4.js:1119-1174`).
  - Her replacements (her §6) say what the search did, not what each count was. I offer the same content without the
    word "window", which users do not know:
    - `N-NOSET.below`: "Couldn't create a {level} piece set for this board: on the first four piece sets tried, the
      search went down to one clue without finding a {level} puzzle. Try again, choose another level, or change the
      board." / "Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, việc tìm kiếm đã giảm tới
      một mảnh đặt sẵn mà không tìm được đề mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn."
    - `N-NOSET.above`: the same, with "went up to the largest allowed number of clues" / "đã tăng tới số mảnh đặt sẵn
      tối đa cho phép".
    - The two steps: "The search reduced the number of clues to one without finding a clue set at this level." /
      "Việc tìm kiếm đã giảm số mảnh đặt sẵn tới một mà không tìm được nhóm mảnh đặt sẵn đạt mức này."; the above step
      with "increased … to the allowed maximum" / "đã tăng … tới mức tối đa cho phép".
  - Both sets are accurate. If she prefers hers, hers stand; the owner chooses either in Q-P2-5.
