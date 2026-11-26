# Review of the phase-2 joint drafts — SA-Astra

Status: Changes requested: six bounded contract/ordering fixes below. No new owner question.

| Item | Value |
|---|---|
| Reviewed | `report.md`, `plan.md`, `clarifications.md`, and `evidence/sa-opus/p2-q1-options.mjs/.md` |
| Code base | `7c1bad226830667fa6626ff97c960ca3bddd7794` |
| Reviewer | SA-Astra |
| Owner answers | Discord `1575060196269490259`, 2026-11-25 15:06:53 +07:00 |
| Interpretation | Accept the orchestrator's reading: Q-P2-1 approves the recommended separate 812-minute ledger, A 410 then B 402 after the readout; Q-P2-5 approves the recommended plain-language EN/VI texts and document correction. No ambiguity requiring another owner question. |
| Scope of findings | Preserve that approval, the 1,013-row design and its price; make the source-port and execution contracts complete enough for `break-tasks`. |

## What passes

- Independent recomputation confirms **812 = 410 + 402**, stress **1,303 = 901 + 402**, and the unselected
  no-sentinel alternative **729 = 327 + 402**. The latter is 873 planned rows, not 1,013.
- The main quote remains 651.913452 counted / 810.766816 guard minutes. Account arithmetic is correct:
  871.19995 spent, 853.80005 nominal balance, 1,683.19995 combined maximum if the old-balance alternative were
  expressly chosen. It was not the recommendation the owner just approved.
- **17 developer tasks total 46 hours**, each at most three; there are five further SA/orchestrator tasks.
  The draft decisions table has 14 rows: three owner and eleven joint-SA rows, before recording the new answers.
- All nine proposed locale keys match the clarification's recommended texts exactly. All English/Vietnamese
  placeholders match; the four plain no-window strings are the ones both SAs agreed. The four technical
  alternatives are accurate but are not the approved recommendation.
- The Vietnamese is readable and consistent with the existing UI (`mảnh đặt sẵn`, `đề`, `bộ mảnh`, `Ác mộng`,
  `giới hạn phép tính`). The guide's abbreviated “cùng một cách” must be understood as the same no-window side,
  not four arbitrary failures; the exact code rule remains the one in plan §4.4. No change to the approved
  wording is requested in this review.
- The priors, budgets, deadline values, fixed screen panel, seed domains, worker widths, 18/20 gates and account
  figures agree with the audit and governing records. The 1,196 MiB accounted limit is 300 + 4 × (160 + 32 + 32);
  process peak is 1.5 GiB = 1,536 MiB.
- Two possible concerns are **not findings**:
  - canonical 760 M means no screen in the frozen implementation (`screened = W < DEDUCE.work`), so plan §4.3
    is not accidentally requesting a full-cap screening pass;
  - the two 10x6 fixtures contain no `made` records, so their version-only update does not conflict with the new
    candidate `igPrior` field.

Evidence: `evidence/sa-astra/joint-review-audit.mjs/.json`. The JSON preserves the three reviewed drafts, their
hashes, the recalculated options, task counts, locale tables and source checks. No engine ran.

## R1 — Required: make the P4 contract exactly the frozen contract

**Where:** plan §4.4, P4 row; the corresponding tests/task P2-07.

The no-table start is clamped, not raw `K - 8`. More importantly, “same set and layout, level and uniqueness”
can be implemented as equality with the new candidate's layout or the calibration's original mode, or by reusing
`calibrationCandidate`'s unseen-key test. All would narrow the frozen per-set rule.

**Source:** `ig-select-v4.js:194–205,947–950`; `v4-ps.json` `ps-5`–`ps-7`; `ps-levels.json` `fz-3`;
`generation-client.js:433–446`; `generate.js:427–449`. The calibration must be self-consistent for the current
board/pieces. The prior check requires the target level and, only for a current `require` request, a unique
certificate. It does not require the calibration to be unseen or the candidate to reuse its layout.

Replace the P4 contract cell with:

> Exact key `<level>@<active cells>` in `prior-s3-v1`: start `clamp(round(share × K), 1, K - 2)` with step 1;
> without a cell, start `clamp(K - 8, 1, K - 2)` with step 8 (no interpolation or refit). On Hell 1, apply the
> frozen per-set rule to the batch's usable calibration: its solution and clue poses must be self-consistent for
> the current board/pieces, its rating must name the target level, and the current `require` mode additionally
> needs `certificate.status === 'unique'`. A valid `igWindow.wc` supplies the clamped start for every ordinary
> candidate, including candidates on different layouts and later batches where the calibration's keys are
> already seen. Do not compare the calibration's original uniqueness mode or require an unseen calibration.
> Otherwise use the table. The completion pass takes no per-set override; calibration remains session-only.

Add after the contract table:

> P4's tests include the low-K fallback clamp, reuse after the calibration's layout/clue keys are seen, a new
> candidate layout, and the unique-certificate condition when the current request changes to `require`.

This clarifies existing P4, rather than adding a new policy.

## R2 — Required: bind the new runtime and distinguish counterfactual identities

**Where:** plan §§4.1, 4.3, 7.1; P2-12/P2-13; technical acceptance.

`tools/bench/report.js:35–47` hashes a fixed list of 40 files. It does not include any of the four proposed new
runtime modules. Neither the component list nor the tasks currently require extending it. A later change to
`select-v4.js`, its tables or the new deadline module must not retain an unchanged measured-source identity.

Also, no-screen/uncapped copies change the stored recipe. They cannot silently emit the shipping version tuple.
The frozen seven-key reader already recognizes `gen-v4-proto:<variant>` (`v4.json`, `pv-7`); “other records keep
exactly five” must not remove the identity mechanism the phase-2 copies need.

Add this component row:

> `tools/bench/report.js` and the phase-2 receipt/preflight code — extend `SOURCE_FILES` to the new runtime/table
> dependency closure; bind every row, proof and replay to its effective source, configuration and observer mode.

Replace the seven-key bullet of §4.3 with:

> **Seven keys (IG-P-Q36).** The gen-v4 family (`gen-v4` and the frozen D-V4-05 namespace
> `gen-v4-proto:<variant>`) uses `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`, `priorTable`, `screenTable`
> and the gen-v4 candidate/skip shape. Other algorithms, including `gen-v3`, retain their five-key shape.
> Reading/copying follows the record's own family; replay still requires equality with the running tuple, so an
> experimental record is unavailable in the shipping build rather than being replayed under its recipe.

Append to §7.1:

> **Counterfactual identities and source binding.** Use distinct experimental identities for altered recipes:
> `gen-v4-proto:p2-none` with `screen-p2-none-v1` (no screen), and `gen-v4-proto:p2-uncapped` with the selected
> production prior/screen tables but P5's budget, bound and combined deadline disabled. A diagnostic-offer or trace
> layer is separately identified in the receipt, including when combined with a counterfactual. These copies are
> never published as the shipping build.
>
> Extend the candidate's `SOURCE_FILES` closure to `core/engine/gen-v4.js`, `core/engine/clue-primitives.js`,
> `core/engine/select-v4.js`, `core/browser/generation-deadline.js` and any separately loaded table/runtime
> modules. Baseline receipts bind the `6b94ffb` runtime and its explicitly identified measurement adapter; do not
> claim that the adapter is an unmodified old CLI. Browser receipts additionally bind the host/controller and
> locale/cache code they exercise. Each receipt records the runtime source digest/base, driver and patch hashes,
> effective configuration, observer mode, seeds/settings, and raw evidence bindings. Preflight rejects drift.

Add technical criterion P2-T14:

> The new runtime/table files are fingerprinted; altered experimental recipes have distinct identities; every
> proof/row/replay/browser receipt is source/configuration bound. A changed new module or table makes the receipt
> stale and fails preflight — verified by focused fingerprint/binding tests and the sealed manifest.

No new measured cohort is needed for these guards.

## R3 — Required: distinguish the set and batch hard-bound results

**Where:** plan §4.5 Host guard; P2-T09/P2-11.

The current paragraph says every hard-bound response returns a fold prefix with `made` and histories. During
set creation there is no batch prefix. The frozen implementation returns a typed set failure instead
(`live.json` `lv-14`: its `set` and `batch` races are distinct).

Replace the Host guard bullet with:

> **Host guard.** `generation-deadline.js` covers the whole operation, including pack assembly. At the work stop
> it cancels outstanding tasks. At the hard bound, an unsettled set operation returns
> `{ status: 'failed', reason: 'response-bound', failures: {} }`, leaving the previously displayed set unchanged.
> An unsettled batch returns `partial` / `response-bound` with its consumed, validated fold prefix, `made` records
> and seen histories (no pack when that prefix is empty), without awaiting a held assembly. Late set or batch
> completions are fenced by request id and revision; only one terminal result is delivered. A shown puzzle
> remains in history. The guard is cleared on every terminal path.

In P2-T09, replace “hard bound through a held assembly” with:

> typed set failure and batch-prefix return through separately held set and batch assemblies

## R4 — Required: give counters the right owner and specify the N-V4-16 glue reading

**Where:** plan §4.6 and P2-T10.

A selection call cannot count a four-attempt request-level bound firing. Counts of no-window calls alone also
cannot identify “attempts 0–3 all same side, but the row did not end `set:no-window-<side>`”.

**Source:** `v4-p5.json` `p5-1`–`p5-3`; `stage4-report.md:286` (F2), which explicitly retains the natural
condition/matches/firings/glue reading for phase 2.

Replace the first bullet in §4.6 with:

> **Counter ownership.** The selection result carries per-call integer counts for budget stops, screen-capped
> profiles, rescue and tail re-ratings. `setAttempt` transports the terminal no-window side. The client set-stage
> loop, not the selector, counts set attempts and bound firings. These fields reach the benchmark without `record`,
> `onRate` or rating detail, and are not provenance identity fields.

Append to §4.6:

> **N-V4-16's ordered glue record.** For each gen-v4 row, retain the first four set-attempt outcomes/reasons and
> their decision/transport ordering, whether the same-side condition was met, whether the client bound fired,
> and the public terminal reason. Per arm and cell report natural same-side matches, firings and
> `set:no-window-*` rows. List every same-side match without the expected public reason, distinguishing the
> declared higher-priority cancellation/time-out from an unexplained transport/order defect. Keep the real-worker
> synthetic-ratings test. Zero natural matches is still “unexercised”, not a real-data pass.

Replace P2-T10's criterion with:

> Per-cell F2/F4/F7 readings: N-V4-16's ordered condition/firing/public-reason reconciliation, budget stops, and
> rescue/tail re-rating starts and completions; zero reach remains unexercised. Conditional P5 coverage uses §7.5's
> disjoint analytical-only, observed-pair and unresolved categories.

## R5 — Required: separate replay tooling from qualification and keep the source epoch fixed

**Where:** plan §§4.7, 7.6, 8, 9; task dependencies.

P2-14 currently includes “`REPLAY` measurement” before cutover, while the eight real resource probes are already
priced in stage A. P2-12's copies need the per-algo/event work but depend only on P2-11; P2-14's new screened replay
recipe likewise cannot depend only on P2-08. Most importantly, measuring after cutover and then changing `REPLAY`
in `policy.js` changes a fingerprinted runtime file. It cannot silently preserve a qualification of the old source.

Make these exact task-table changes:

- P2-12 dependencies: **`P2-09; P2-11`**.
- P2-14 dependencies: **`P2-12`**.
- P2-14 task text:

  > Fixture modes and replay-resource tooling: fixed recipes, the separated refusal check, bounded fixture
  > discovery with a declared candidate/time limit, and preparation of the resource probes; no qualification
  > measurement or speculative increase of `REPLAY` here.

Append to §4.7:

> The eight real replay-resource probes run once in P2-19, charged to the approved stage-A allowance, on the
> cutover source. Fixture preparation and ordinary bounded regression checks are separate from those measured
> probes. The task pack fixes the fixture-search candidate set/time limit and excludes reserved reps 40–59.
> If the probes establish adequate margin, keep the limits. If a limit, fixture or runtime change is needed,
> stop for the pack author's ruling; do not turn an incomplete replay into a pass by increasing a limit in place.

Append to §7.6 Stops:

> P2-18 and P2-19 share the single 410-minute stage-A account; the task boundary does not reset that allowance.
> The measured runtime/configuration is sealed before P2-18. A later runtime, table, deadline or replay-limit
> change starts a new source epoch: identify the affected receipts/gates, reprice the required verification from
> the remaining authorization, and obtain an owner decision if scope, selected configuration or allowance would
> change. Never relabel old rows as measurements of the new source.

Replace P2-B05 and the matching §8 risk mitigation with:

> If (c5) fails or is inconclusive on production, stop publication and present the no-screen fallback and its
> new table identity to the owner before changing the selected configuration or continuing qualification.
> No refit on validation seeds and no automatic relabelling of already measured rows.

This does not add measurements to the quote; it prevents double-running or changing the qualified code beneath it.

## R6 — Required: tighten evidence claims and preserve the historical lock

**Where:** plan §4.4 opening, P2-B06, report summary/price, and the pending clarification summary.

1. Replace the opening paragraph of plan §4.4 with:

   > For identical selector-call inputs and observer/skip configuration, the port preserves the frozen primitive
   > work and skip ordinals. At request level it preserves deterministic puzzle keys in fold order. P6 and clock
   > cuts may change speculative work and the returned prefix length, not keys within a genuine common prefix.
   > Aggregate request-work equality is not claimed; current work intervals are measured. An empty/no-set prefix
   > is no positive equality evidence.

   The old text demands equal work for a whole request, contrary to our agreed per-call/proof distinction.

2. In `report.md`'s summary and `clarifications.md`'s context, replace “equality with the frozen … on every measured
   row” with:

   > equality on every eligible measured row with a same-cell frozen/legacy oracle, before any ratio is read;
   > new sentinel and `require` rows have no frozen oracle

   When the answered questions are removed, the finalized plan/report must retain this scope.

3. Replace P2-B06 with:

   > Report population (clue share, score position, census-estimate share and completion) per measured cell and
   > arm, beside its timing. Give contemporaneous two-sided comparisons where the approved matrix has paired
   > arms; label any historical population separately and never imply a fresh today's arm on an unpaired cell.
   > Hell 1 is reported against 18/20, not gated for an offer.

   Governing plan `:579–583` explicitly permits today's arm only where a gate needs it; do not accidentally
   require an unpriced extra baseline cohort through the acceptance wording.

4. In report §5, replace the first pricing bullet with:

   > Matching main/smoke rows use the frozen arm/cell mean response +2 s; sentinel timings use the explicitly
   > weak neighbouring-cell proxy. The ten historically triggered twins use their matching uncapped-row
   > response +2 s, not the cell mean. REQUIRE and the five unknown twin slots use their row limits.

5. In plan §4.10 replace the §7.8/line 1922 item with:

   > §7.8: retain the historical MP12b2/MP12b3 `gen-v3` lock and its evidence. Add a later, explicitly versioned
   > `gen-v4` qualification paragraph with the phase-2 source/receipts and route; the rating/model/policy locks
   > remain unchanged. Do not relabel the old calibration as `gen-v4`.

   `design-detail.md:1922` names a historical commit/qualification, not merely the running algorithm constant.
   Old nested documents/release notes remain historical; current specs and PR #14's new notes describe gen-v4.

6. Minor summary precision: report “46 developer hours in **17 developer tasks, plus five SA/orchestrator
   tasks**”, rather than implying there are only seventeen task IDs.

7. Report §2's reserve-cut count: say **“one distinct cell/seed, 14x14 Hell 1 rep 33 (two bounded-arm rows)”**.
   The selected arm has one such row; the full frozen evidence has one in each bounded arm. The 16.1-s maximum
   offered-board gen-v4 Nightmare set stage and the class/control ratios check against the raw rows/verdicts.

## Finalization after the fixes

The six corrections implement the already agreed port/measurement semantics. They do not reopen the owner's
812-minute approval or the approved plain-language UI texts. Record both answers and message ID in Decisions,
clear the answered questions, and finalize after the corrected drafts are accepted.

The current review itself wrote only this author's evidence/review paths. No production/test changes, engine run
or commit.

## Validation

2026-11-25 15:33:46–15:33:49 +07:00:

- `node --check docs\improve-generating-phase-2\evidence\sa-astra\joint-review-audit.mjs`: pass.
- `node docs\improve-generating-phase-2\evidence\sa-astra\joint-review-audit.mjs`: pass; 1,500 historical rows,
  all three price scenarios, task/decision counts and EN/VI tables checked; 127 bound input files.
- `npm run check`: conventions and site checks pass.
- Protected runtime/test/old-plan/spec paths: `git diff --exit-code 7c1bad2 -- <protected paths>` is empty.
- Strict UTF-8/no BOM, CRLF, no trailing whitespace, final newline: all 12 own phase-2 files pass.

Input-index SHA-256: `c6775dd64688bda5df4a27c015609f145d00c2c80859b3963d7c3e5df52b2302`.
