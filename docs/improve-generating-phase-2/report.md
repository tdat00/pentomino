# improve-generating phase 2: joint report (`gen-v4` in production)

| Item | Value |
|---|---|
| Authors | SA-Opus (drafter, round 1), SA-Astra (reviewer); one agreed text |
| Base | `gen-v4` at `7c1bad2`; draft PR #14 into `main`, not merged |
| Sources | both round-1 analyses and cross-reviews, `evidence/sa-astra/round1-cross-audit.*`, `evidence/sa-opus/p2-*` |
| Plan, questions | [plan.md](plan.md) (Final, 2026-11-25, base `7c1bad2`), [clarifications.md](clarifications.md) (no open questions) |

## Summary

- **What phase 2 does.** It puts the frozen `gen-v4` search into the production code for Nightmare and Hell 1, with
  the class choices of the frozen round:
  - the 190 M screen only on Nightmare boards of 196 to 256 cells;
  - the prior table;
  - the per-set prior on Hell 1;
  - the call budgets and the bound of four set attempts.

  Today's search stays on the full 26x26 Nightmare board and on every level up to Master.
- **Identity and replay.** Every new record carries `gen-v4` with seven version keys. Old records stay playable, and
  their generation steps are refused by version.
- **Deadline.** The Generator's two actions keep 115/120 s each. Automatic `gen-v4` requests of the CLI and the bench
  share one 46/115/120-s clock. A real hard guard bounds the response, pack assembly included.
- **Validation before anything ships.**
  - proof bundles and smoke requests;
  - equality on every eligible measured row with a same-cell frozen/legacy oracle, before any ratio is read; new
    sentinel and `require` rows have no frozen oracle;
  - the (c5) re-check of the one screened class;
  - conditional P5 comparisons;
  - `require` on the largest boards first;
  - 140 rows on boards without a prior cell.
- **Price: 812 counted minutes**, stage A (410) and then, after a readout, stage B (402). It is a spend cap, not a
  promise of completion.
- **Effort:** about 46 developer hours in 17 developer tasks, plus five SA/orchestrator tasks.
- **Owner answers** (2026-11-25, Discord message `1575060196269490259`):
  - Q-P2-1, approved: a separate phase-2 ledger of 812 counted minutes, 410 then 402 after the stage-A readout;
  - Q-P2-5, approved: the plain-language English and Vietnamese texts and the "no early stop" correction; the owner
    may reword them later.

  All other questions were settled by the two SAs under the owner's delegation. No question is open.

## 1. What the owner asked

- **D-S24-35** (Q-T16 (a), 2026-11-25): today's search is kept on 26x26 Nightmare, and `gen-v4` is proposed for the
  other boards with the recorded class choices. The phase-2 pack must:
  - implement the route;
  - prove compatibility and replay;
  - measure `require` on the largest boards first (N-V4-15);
  - repeat the validation on the production code;
  - come back with its plan and price before anything runs or ships.

  The phase-0 FAIL stays recorded and Hell 1's offer rules are unchanged (`request.md:35-40`; register `ca46067`).
- **Branch and PR.** Phase 2 lives on `gen-v4`, from the published phase-1 head, with a PR into `main`. Neither PR is
  merged (`c63c553`, `request.md:21-27`).
- **Delegation.** The two SAs answer supervisor-level questions jointly (`request.md:29-31`).

## 2. What the two analyses established

| Finding | Evidence |
|---|---|
| The frozen implementation cannot be copied: journals, `IG` globals and Node imports, built on `3fc65f4` before phase 1 | `evidence/sa-opus/p2-variant-chain.md`; `ig-select-v4.js:23-30, 226` |
| Only `n-mid` ships the screen, so the production screen table needs its own id; the frozen selector's classes are wider | `freeze.json` `values.W`; `stage4-report.md:36-55`; `ig-select-v4.js:97-132` |
| The Generator page offers boards up to 484 cells (360 on a phone) and no Hell 1. The CLI defaults to 676 cells, so the 26x26 route does reach users | `policy.js:24-31`; `state.js:322-324`; `tools/generate.mjs:40` |
| The CLI and the bench make a set and a batch in one request; the Generator's two actions are separate requests | `generate.mjs:548-562`; `generator/jobs.js:303-440` |
| The 120-s response bound is defined but enforced nowhere today; `finish(job)` precedes pack assembly; the Generator's job times use `Date.now`, the pool `performance.now` | `policy.js:69`; `generation-client.js:1172-1186`; `jobs.js:201`; `worker-pool.js:132-136` |
| The frozen live deadline acted only with a host origin, which only the bench gave | `live.json` `lv-9`..`lv-12`; `lane-worker.mjs:186` |
| The longest `gen-v4` Nightmare set stage on an offered board was 16.1 s; the 46-s reserve cut acted on one distinct cell/seed, 14x14 Hell 1 rep 33 (two bounded-arm rows) | `evidence/sa-opus/p2-xr-setstage.md` |
| Only 29 of 295 offered desktop rectangles have a prior cell (W <= H; not a user-frequency figure); the frozen validation measured only table cells | `evidence/sa-opus/p2-prior-coverage.md`; `evidence/sa-astra/round1-cross-audit.md` |
| Stage 4 ran no `require` row, and no budget stop, bound firing, rescue or tail re-rating occurred. Zero false stops is vacuous (F2) | `stage4-report.md:177-190, 281-291` |
| Phase 1's P6 sped today's search by ×1.00 to ×1.32 on Nightmare, so the thin controls (32x15 lower bound 0.9127, 3x29 0.9473) may move on production | `tasks/improve-generating-v4/check-list.md:634`; `stage4-report.md:66-82` |
| A null `made.igPrior` must be omitted on replay; an explicit null disables the table | `variants/v4.json` `pv-17`; `ig-select-v4.js:199-205` |
| The budget is checked before each primitive and can overshoot by the last one; "at most 2 x 40 G" is not a replay bound | `ig-select-v4.js:407-426, 624-638` |

## 3. How the two analyses were reconciled

| Point | SA-Opus, round 1 | SA-Astra, round 1 | Agreed |
|---|---|---|---|
| 26x26 route | every Nightmare board above 576 cells | the exact full 26x26 board | the exact board: 26 by 26, 676 active cells, rotation-independent (D-S24-35's words) |
| Deadline | no shared clock at all | the 46-s cut also on a standalone set | Generator actions 115/120 s each; one 46/115/120-s clock for automatic `gen-v4` CLI and bench requests; a real host guard |
| Seeds | frozen reps 20-39 | fresh reps 60-79 | reps 20-39 (Master 20-24) as a source-port replication with no retuning; 40-59 reserved |
| Port proof | equality on every row | reference parity in tests | four proof bundles and eight smoke requests, then equality on every eligible row before any ratio is read |
| (c5) | not repeated | repeated for `n-mid` | repeated: the fixed three-cell panel |
| P5 comparison | none (carried by equality) | 360 unconditional twins | twins for every row that meets a predeclared trigger; analytical zeros reported apart; 15 priced slots, not a quota |
| `require` (N-V4-15) | Nightmare, today and `gen-v4` | Nightmare and Hell 1, bounded and uncapped | 50 rows: Nightmare with three arms, Hell 1 diagnostic with two |
| Boards without a prior cell | 80 rows | not measured | 140 sentinel rows, 20 per arm, gates declared before the run |
| Counters | in the production result | a trace in measurement copies | both: minimal counts in production, the detailed trace in symmetric copies |
| Price | 377 expected, 480 envelope | 945, or 1,126 for full breadth | 812, enumerated by SA-Astra and reproduced row by row by SA-Opus (`p2-xr-verify-astra.md`) |
| Screen table | `screen-p2-v1` | `screen-v4-v1` | `screen-v4-v1` |
| No-window texts | "every clue count tried" | "without finding a suitable window" | plain words that state only what the search did; approved by the owner (Q-P2-5), the technical wording not selected |

## 4. The agreed design in brief

The plan has the details (sections 4 and 5).

- **Route.** `gen-v4` for Hell 1 and for Nightmare except the exact 26x26 board; every other level runs `gen-v3`'s
  selection. The route governs every stage.
- **Identity.**
  - Algo `gen-v4` for all new records, with the seven keys and the tables `prior-s3-v1` and `screen-v4-v1`.
  - The budgets, the bound, the re-rating rule, the deadline and the route belong to the `gen-v4` definition; no
    eighth key.
  - `made.igPrior` and subset ordinals below 2,192.
  - Altered measurement recipes carry their own `gen-v4-proto:` identities, and every proof, row, replay and browser
    receipt is bound to its source and configuration (`SOURCE_FILES` extended to the new modules).
- **Search.** The frozen P1 to P5 with P6 kept. Prior by exact key, otherwise `clamp(K - 8, 1, K - 2)` with step 8.
  On Hell 1, the frozen per-set rule from the batch's usable calibration. Budgets: `any` 10 G (Nightmare) and 40 G
  (Hell 1); `require` 32 G and 40 G.
- **Deadline.** As in the summary. The set loop keeps the frozen order. At the hard bound an unsettled set returns a
  typed `response-bound` failure and an unsettled batch its consumed, validated fold prefix; late results are fenced.
- **Counters.** The selector counts per call; the client's set loop counts set attempts and bound firings; each row
  keeps N-V4-16's ordered record of its first four set attempts.
- **Replay.** `replay-case.json` stays the `gen-v3` refusal case. There are new `gen-v4` cases, and the 10x6 fixtures
  change in their versions only. The saved-steps key holds the running tuple. `REPLAY` is checked by eight measured
  resource replays in stage A; a needed limit, fixture or runtime change stops for a ruling and starts a new source
  epoch.
- **Texts.** The new step sentences and notices are in English and Vietnamese, with the plain-language wording of the
  four no-window strings, as the owner approved. The "no fail-fast" statement of `design-detail.md:1805` is replaced
  (plan 4.11).

## 5. The production validation and its price

The matrix:
- the 19 frozen Nightmare and Hell 1 cells on the shipped code;
- today's search on the ten controls;
- 16 Master cells on both arms;
- `n-mid` without the screen;
- 140 sentinel rows;
- 50 `require` rows;
- eight smoke rows;
- up to 15 planned conditional twins.

That is 1,013 rows, plus four proof bundles, eight resource replays and six browser checks.

**Pricing basis.**
- Matching main/smoke rows use the frozen arm/cell mean response +2 s; sentinel timings use the explicitly weak
  neighbouring-cell proxy. The ten historically triggered twins use their matching uncapped-row response +2 s, not the
  cell mean. `require` rows and the five unknown twin slots use their row limits.
- The frozen row steps really took 0.99 to 1.08 s beyond their responses, and no P6 credit is taken.
- The proof bundles are priced at their measured cost.
- The schedule follows the 885/900/45-s rules.

| Stage | Rows | Counted min | Guard min | Authorization |
|---|---:|---:|---:|---:|
| A: proofs, smoke, `require`, sentinels, thin controls, replays, browser checks | 318 | 330.656 | 409.195 | 410 |
| B: the rest of the matrix and the conditional twins | 695 | 321.258 | 401.572 | 402 |
| Total | 1,013 | 651.913 | 810.767 | **812** |

- **Spend cap.** The sentinels' times are weak neighbour proxies; at their row limits the cap would be 1,303 minutes.
  812 is therefore a spend cap: observations beyond it stop incomplete, never counted as passes.
- **Funding (approved).** A separate phase-2 ledger of 812 counted minutes (Q-P2-1, option (a)). The closed round's
  grant keeps its 853.8 unused minutes of 1,725; they are not used, and nothing rolls over.

## 6. The owner's answers

The owner answered both questions on 2026-11-25 at 15:06:53 +07:00 (Discord message `1575060196269490259`), verbatim:
"Q-P2-1: đồng ý duyệt. Q-P2-5: đồng ý duyệt, tôi sẽ sửa sau nếu thấy không phù hợp." ("Q-P2-1: approved. Q-P2-5:
approved; I will change it later if I find it unsuitable.") Both SAs read them as the recommended options.

| ID | Decision needed | Answer | Recorded |
|---|---|---|---|
| Q-P2-1 | Approve the validation and 812 counted minutes (410, then 402 after the stage-A readout), and say which account pays | approved, option (a): a separate phase-2 ledger of 812, a spend cap | plan D-P2-15 |
| Q-P2-5 | Approve the English and Vietnamese texts (the plain-language wording of the four no-window strings, or the technical alternative) and the correction of the "no early stop" statement | approved, option (a): the plain-language wording, the guide sentence and the statement of plan 4.11; a later rewording is an ordinary task | plan D-P2-16 |

The questions as answered are in `sa-opus/answered-questions.md`; [clarifications.md](clarifications.md) has no open
question. No task waits for the owner: the developer tasks start with `break-tasks`, and the measurements (P2-18 to
P2-20) run on the approved ledger.

## 7. What follows

- Phase 2's tasks P2-01 to P2-22 (plan section 9).
- The validation report, then PR #14's description (no merge).
- Phase 3, the Hell 1 offers and the blind play comparison, uses this round's Hell 1 and `require` diagnostics.
- N-V4-14 (the screen on `n-upper` and `n-large`) needs its own proposal.
- Reps 40-59 stay reserved for N-V4-04.
- Any merge or release needs a later explicit owner instruction.

## 8. Evidence and review

- **SA-Opus:**
  - `sa-opus/round-1-analysis.md`, `sa-opus/round-1-cross-review.md` (§8.6, the final agreement);
  - `evidence/sa-opus/p2-variant-chain.*`, `p2-price-basis.*`, `p2-prior-coverage.*`, `p2-xr-price.*`,
    `p2-xr-setstage.*`, `p2-xr-verify-astra.*`.
- **SA-Astra:**
  - `sa-astra/round-1-analysis.md`, `sa-astra/round-1-cross-review.md`;
  - `evidence/sa-astra/round1-audit.*`, `round1-cross-audit.*`, `round1-validation.txt`,
    `round1-cross-validation.txt`, `joint-review-audit.*`.
- **No engine run.** Neither SA ran an engine, a generation, a replay or a timed measurement for this report; all work
  was unlocked reading and arithmetic.
- **Review.** SA-Astra reviewed this report and the plan (`sa-astra/review-report-plan.md`, findings R1 to R6, all
  applied, with `evidence/sa-astra/joint-review-audit.*`); the plan's sign-off records both acceptances.
