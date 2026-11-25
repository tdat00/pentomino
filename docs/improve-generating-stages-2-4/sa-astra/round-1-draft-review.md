# SA-Astra: review of the joint drafts, round 1

Date: 2026-11-23. Draft base supplied by the orchestrator: `c159ab4`.
Reviewed working-tree files: `report.md`, `plan.md`, `clarifications.md`, and `evidence\sa-opus\j1-numbers.*`.
Verdict: **numbered findings below; not yet accept**. I did not edit the shared drafts.

**Decisions now:** D-3 is settled at **32 G Nightmare /40 G Hell 1 for `require`**. I **withdraw D-1**:
keep the reference kernel in the four frozen arms, with the P7 spike still before the freeze.
For D-2, I accept the **20-row uncapped Hell check as the first-stage technical design**, with the explicit
read/stop gate in finding 3. I withdraw the unconditional 50-row `V4-S2F` requirement. The owner approves
the selected scope and its price, not which internal experiment the SAs should design.

**Owner delegation received during this review:** 2026-11-23 15:29 +07:00, Discord message
`1574341211701907457`: the two SAs coordinate the answers themselves; no need to ask Fable.
I agree with SA-Opus on **Q-S24-1 option (a)'s route** and **Q-S24-2 option (a)**. The exact joint decisions
to add to `plan.md` are:

| ID | Decision | Decided by | Date / source |
|---|---|---|---|
| D-S24-21 | Complete P4's Hell 1 table at the stage-3 fit from the existing IG-P-Q27 sources and the agreed fitting checks. V4-S2 remains valid evidence of its actual configuration; no replacement of its historical observations or change to D-V4-20 is required. The numerical fit and technical checks are the SAs' work; new machine scopes still require the owner. | SA decision under the owner's delegation (2026-11-23 15:29, Discord) | 2026-11-23; message 1574341211701907457; this review and the drafter's Q-S24-1 recommendation |
| D-S24-22 | Run the isolated P7 spike before the freeze; retain the reference kernel in all four frozen arms. Passing composites are candidates for the later phase-1 production work, with its own gates; phase 2 repeats validation on production. No P7 speed credit is taken in this frozen round. | SA decision under the owner's delegation (2026-11-23 15:29, Discord) | 2026-11-23; message 1574341211701907457; this review and SA-Opus's Q-S24-2 option (a) |

These decisions change no recorded owner decision. Once they are recorded, remove Q-S24-1 and Q-S24-2 from
the open clarifications, without renumbering Q-S24-3 through Q-S24-7. The delegation does **not** approve a
machine allowance, activation, offer, push, merge or release, or waive owner confirmation of his own decisions.

**Exact authority text to add to `plan.md` and the clarifications header:**

> For a matter that would previously have required the supervisor, both SAs decide jointly under the owner's
> delegation (2026-11-23 15:29 +07:00, Discord message 1574341211701907457). Owner approvals remain mandatory,
> and a joint decision changing one of the owner's recorded decisions still needs his confirmation.

Update future escalation wording accordingly, including Q-S24-3 option (b), Q-S24-6 option (c), T11 and
the post-phase-0 route. Keep historical attribution to the plan author and his existing rulings unchanged.

**Verification:** new unlocked arithmetic in
`docs\improve-generating-stages-2-4\evidence\sa-astra\draft-review-check.mjs`, results in
`draft-review-check.json`. It reads original journals, runs, kernel items and compiled price inputs; it neither
runs an engine nor writes a plan/receipt. No git command was used. The four seed-balanced Hell priors, the
196-256 work interval, the 20-row price and the current 172.3352-minute account reproduce.

## 1. Settle D-3 at 40 G, but remove the work-monotonicity assertion

**Files/sections:** `report.md` Summary 4, §2.4, §6 D-3; `plan.md` §4.1, §4.2 JSON, §4.4, §5 open items;
`clarifications.md` Q-S24-3.

**Exact change:** replace every unresolved “Hell 1 40 G or 32 G” with **40 G**, and replace the `require`
bullet in `report.md` §2.4 with:

> **`require` calls (technical values agreed; owner policy confirmation pending, Q-S24-3):** Nightmare
> 32 G and Hell 1 40 G per selection call. These are conservative candidate limits, not measured general
> affordability guarantees. The successful Nightmare selection used 10.274 G; the generated set and candidate
> calls used 5.817 and 6.829 G. The 20.608 G Hell selection failed. The Hell limit is not set below the chosen
> 40 G `any` policy as a conservative design choice, not because `require` work is mathematically always
> `any` work plus an extra count: repair and acceptance can change the subsequent search path.
> A budget-stopped `require` call returns only an already finished final. The four final arms must pass their
> real parity/replay proofs, and N-V4-15 remains open before production claims on larger boards.

In the JSON use `"hell-1": 40000000000`; remove D-3 from the disagreement/open-item lists and record this
technical agreement. Q-S24-3 still asks the owner to confirm the finite-budget **policy**, not arbitrate 32/40.
In its owner-facing wording, use “selection call (one search for a puzzle, which can include many ratings and
uniqueness counts)” instead of “search step”; explicitly say canonical rating limits remain unchanged.

**Evidence:** `ig-select-v4.js:404-425,622-639,1303-1316`; original P-1 generation journals recompute
**5,816,758,768** and **6,829,466,707** units. Replay work is cumulative across stages and must not be used
as though 12.646 G were the candidate call alone.

## 2. Withdraw D-1; no Q-S24-2 is needed

**Files/sections:** `report.md` Summary 7-8, §3 last bullet, §6 D-1; `plan.md` §4.1 Kernel, §4.3,
§5 open items, §8 dependencies/tasks, §9; `clarifications.md` header and Q-S24-2.

**Exact replacement for the kernel decision:**

> The P7 spike runs before the freeze, on isolated harness variants. The four frozen arms and their stage-4
> comparators retain the frozen reference kernel. A passing P7 composite is recorded for the later phase-1
> production work; no P7 speed credit enters this frozen round's fit, prices or verdicts. Production adoption
> has its own equality, fixture, test and memory gates, and phase 2 repeats validation on the production code.
> Reference-kernel results are not claimed to be a mathematical lower bound on every later production ratio.

**Exact change:** record D-S24-21/D-S24-22 above and delete Q-S24-1/Q-S24-2 from the open clarifications,
without renumbering the remaining stable IDs;
remove all task dependencies on its answer and the conditional P7 edit in the frozen-family composition.
Replace D-1 by the agreement above. The open list becomes **Q-S24-3 through Q-S24-7**:
five owner questions and no supervisor question. Replace dependencies on Q-S24-1's answer by the recorded
P4 decision and its technical fit gate; keep the required owner approval for new measured scopes.

This withdraws my integration preference, not the pre-freeze spike. It also removes the draft's overly broad
“without it every gate is conservative” assertion: unequal speedups and deadline censoring can change ratios.
No new supervisor ruling is needed for this agreed reference-kernel route.

## 3. Settle D-2 technically: 20 uncapped rows, with a precise inference/stop gate

**Files/sections:** `report.md` §4, §5, §6 D-2; `plan.md` §2, §4.6, §8.1-8.3, T10/T11/T12,
T-S2F and the new P4 decision; `clarifications.md` Q-S24-5.

**Selected design:** the four final-family P-1 passes, then **20 `fr-frozen-none-uncapped` requests** on
14x14,20x20,24x24,26x26 Hell 1, reps 0-4, before writing `freeze.json`.
No extra 14x14 Nightmare rows and no candidate-arm `V4-S2F` are required by default.
The existing control pilot addresses the unmeasured Nightmare cells separately.

**Insert this acceptance/read gate in `plan.md` T11 and the corresponding report paragraph:**

> The SAs read all 20 valid published rows and their complete worker/link journals against the proposed bounded
> configuration, including losing and terminated calls. The reader accumulates main, census and uniqueness
> units in primitive order. It identifies any recorded next primitive whose selection-call spent total before it is at least
> the proposed budget; a terminated call whose completed spent total already reaches the budget is flagged
> as potentially affected, even without a following begin line. A currently running primitive is not assumed
> cut by P5: the check is between primitives, not inside one.
>
> The reader also tests the first-four same-side no-window condition from the set-call ends and reads the new
> table/per-set-prior transport. It computes the reserve/deadline projection from these new **uncapped**
> timelines, per cell, reporting projected reserve cuts and lost completions separately.
>
> If a budget or attempt bound could affect an observed path, or missing/ambiguous evidence prevents that
> determination, the freeze pauses for an SA ruling. Before accepting affected settings, the SAs specify the
> smallest necessary matched bounded experiment, price it under a new task/manifest and obtain the owner's
> approval. An uncapped prefix identifies risk; it does not identify which best candidate a truncated call
> would return, the changed fold timing, or request-level lost completions.
>
> If no observed path is flagged, the report may say the proposed deterministic limits would not intervene
> at the observed primitive boundaries. It must not call this a measured zero-loss bounded/uncapped comparison
> or a live-deadline proof. V4-LIVE and every declared V4-S4C comparison remain mandatory.

**Why this is necessary:** the draft's “the journals give every would-be stop exactly” is too broad. Ordinary
ended traces can identify the first exceeded check boundary, but a truncated call can return a retained
candidate; losing/terminated calls have unobserved suffixes; and clock censoring can alter returned length.
`ig-select-v4.js:422-477,624-637,1303-1316` defines the actual checks. The old 2 G arm already demonstrates
budget stops that still return a candidate.

**Configuration/receipt correction:** T08 prepares a *candidate epoch*, not irrevocably final trees regardless
of T11's result. Each P-1 binding proves that epoch. If T11 accepts it unchanged, those are the final trees
recorded by the freeze. If it rejects it, retain every observation/receipt and use a new configuration identity
and proof task/manifest for the replacement; never resume a plan after changing its identity or overwrite its
binding. Any additional measured scope requires a fresh approval. Apply this qualification to §4.3's
“trees final before the first binding” wording.

**Replace Q-S24-5 by this fixed-scope owner question (keep the ID):**

> **Decision needed:** approve the SAs' 20-request uncapped Hell 1 check, with the read/stop gate above, before
> the freeze? The four final-family proof passes are a separate required part of V4-S3P.
>
> **Scope and price:** four Hell 1 boards, reps 0-4, 20 rows; 67.687958 projected /84.609948 guard counted
> minutes, with a timing-proxy scenario of about 20-22 minutes. The 749-minute grant remains; this new scope
> still requires approval, with the account re-read. No additional paired run or replacement epoch is
> pre-authorized by this approval.
>
> **Options:** (a) approve this scope; (b) do not authorize it yet, so the freeze waits for a revised
> SA proposal. **Recommendation:** both SAs (a), subject to agreement on the read gate.

Remove the design-selection options `(a) Opus / (b) Astra / (c) none`, the default T-S2F branch and D-2 from the
disagreement list. The recorded P4 completion route should refer to the agreed checks, not “the check the owner
chooses, if any”.
The owner may refuse or constrain cost, but should not be asked to resolve the experiment's technical sufficiency.

## 4. Remove invented confidence from the fitting rationale

**Files/sections:** `report.md` Summary 2, §1.4 “196-256 against 196-215”, §2.4 first bullet, §6 corrections;
`plan.md` §7 first and fourth risk rows.

The **196-256 choice remains agreed**. The new probability/tail arguments are not needed to justify it.
The 0.724623 arithmetic reproduces, but it uses completed-work lower bounds and assumes the narrow class always
passes. Five fitting seeds do not identify a calibrated admission probability or the expected total consumed
work of future configurations. Likewise the exponential-tail figures are not measured stopped-success counts.

**Replace the “196-256 against 196-215” paragraph with:**

> Both candidate pools meet the measurable pilot conditions, not the validation minimum. The 196-256 pool
> gives a time factor 2.433033 and has screen upper work 2.283682 G/puzzle below no-screen lower work
> 2.512292 G/puzzle. Its margin is 0.228610 G/puzzle, smaller than 196-215's 0.709821; rep 0's pooled margin
> is negative. The SAs choose 196-256 to include the measured 16x16 benefit, accepting the risk that a failed
> class sends all three cells to the no-screen fallback. Only five independent seeds per cell were observed.
> The synthetic resampling is descriptive, not a calibrated probability of passing held-out validation.

**Replace the tail-model sentences in §2.4 and §6 with:**

> The 10 G/40 G `any` candidates exceed the successful pilot traces' pre-final-primitive work. This supports
> affordability on those traces, not a forecast of the number of stopped successes in validation or a guarantee
> about new priors, interrupted calls or unmeasured controls.

Do not present 0.1/0.4 or 0.9/1.6 predicted stops as evidence that the SAs' choice is established by the records.
Those exploratory models can stay in their author's historical evidence, explicitly as assumptions.

**Risk replacements:**

- Class failure likelihood: **“Unknown on held-out seeds; the smaller pilot margin increases coupling risk.
  Strict fail-closed validation remains. The fallback completed its five pilot requests, not a promised 20/20.”**
- P5 glue likelihood: **“Unknown: no real triggering pilot. The real-worker transport case and later journal
  reading are required.”** “Never fired” is not evidence that the risk is low.
- In Summary 2 replace “no same-set clue shift” by **“per-cell median shifts 0, 0 and +0.5 clues,
  within the tolerance”**.

## 5. Preserve the actual acceptance contracts

**Files/sections:** `plan.md` §6 B2/T4, §4.5 tests, T07 gates; `report.md` §1.7; `clarifications.md`
Q-S24-4 context. Do not carry Q-S24-1's overstatement into its recorded decision.

**Replace B2 with:**

> Every completion-passing Nightmare control has at least 18 of 20 requests reaching ten on its shipped arm
> and a one-sided 90% lower no-regression ratio of at least 0.9, with its complete declared evidence.
> All 16 Master cells pass five-seed ordered-puzzle identity; Master timing is reported, not gated.

**Replace the unqualified “widths 1,2,4,8 give the same prefix” with:**

> Without a clock cut, widths 1,2,4,8 return the same ordered puzzles. With a clock cut, returned lengths
> may differ; every result is a prefix of the same deterministic fold and common slots contain the same
> puzzles. Scripted-clock cases separately pin each expected prefix and verify cancellation/assembly.

**Add this qualification to `report.md` §1.7 instead of carrying forward Q-S24-1's “no phase-0 gate depends on it”:**

> Hell 1's 18-of-20 candidate result is reported and does not veto phase 0. Its declared P5 comparisons,
> required evidence, parity and live-deadline prerequisites still have to be complete and valid.

`verdicts.mjs:1550-1607` expressly requires every declared P5 pair and prerequisite, including those involving
Hell cells. IG-P-Q30 is not an evidence waiver.

**Replace Q-S24-4's “it also checks the 10 G work limit” with:**

> It also reads the uncapped call prefixes against the proposed 10 G limit to assess affordability;
> `fr-none` does not enforce that budget. This is a fitting warning, not a five-seed no-regression verdict.

## 6. Correct the timing-proxy arithmetic and distinguish minimum quotes from grants

**Files/sections:** `evidence\sa-opus\j1-numbers.mjs|json|md`, `report.md` Summary 5-6/§5,
`plan.md` §4.6/§8.3, `clarifications.md` Q-S24-6.

**Verified:** the raw kernel `itemMs` sum is 69.310 s. The bare three-repeat item time is 207.930 s per
candidate. `j1-numbers.mjs` then omits the pricing model's **2 s startup +3 s group-start per invocation**.
Using `simulateItems`/`price` with the measured durations and factor 1, rather than hand-summing items, gives
**11.3965-12.8965 counted minutes** for three candidates, not 11.1465-12.6465.
The formal 1.25-duration projection/guard **15.495625 /19.369531** and the **20-minute request do not change**.

**Exact change:** compute that proxy with the same item schedule as the formal projection, changing only the
duration factor from 1.25 to 1; keep 15/45-s quiet scenarios. Call it a **timing-proxy scenario**, not measured
time of the new configuration. Recompute the now-single selected account chain; remove the withdrawn S2F
branch from the joint plan's active choices.

Corrected selected-route figures (all are projections, not approvals):

| Gate | Guard min | Minimum cap at the timing-proxy spend | Cap if earlier guards are spent |
|---|---:|---:|---:|
| V4-S2B | 28.243734 | 201 | 201 |
| V4-P7 | 19.369531 | 208-212 | 220 |
| V4-S3P, proofs plus 20 Hell rows together | 173.609948 | **374-379** | 394 |
| V4-LIVE | 43.905504 | **284-294** | 438 |
| V4-S4 | 1,481.858106 | **1,726-1,737** | 1,920 |
| V4-S4C | 732.021379 | **1,441-1,497** | 2,652 |

End-of-round proxy: **877.817-946.817 counted minutes**; guard-chain account: **2,651.343 minutes**.
The formal S4 and S4C prices themselves are unchanged.

**Insert beside the account table:**

> These are minimum quotes for the named scope at the assumed spend, not replacement grants. Preserve an
> already-active higher grant unless the owner explicitly changes it. Every new scope still needs approval;
> a raise is needed only if its current minimum exceeds the current grant. In particular S4C's minimum may
> be below the S4 grant after S4 underspends. Re-read the account and actual compiled plan at every gate.

Remove the unconditional “no: a raise” for S4C. Today's V4-LIVE arithmetic remains **217 including off-log
time**, the active grant **749**, and the historical **793** was a full-S2-guard scenario.

## 7. Make the population and prior statements exact

**Files/sections:** `report.md` §1.2/§1.11/§2.3 and any prior examples retained in the P4 decision.

**Replace the paragraph introducing the “Today (`prior-v1`)" population table with:**

> This table compares V4-S2 accepted-puzzle shares with MP12b1 reps 10-19 accepted-puzzle medians stored in
> `prior-v1`. These are unpaired population summaries, not `gen-v3`'s initial SHARES start counts and not
> paired (c5) clue deltas. The sparse Hell baselines (two and four accepted puzzles at 196 and 576 in the
> prior fit) must not be presented as precise population estimates.

**Add immediately after §1.2's timing table:**

> The complete two-sided population table is incorporated as part of this report:
> `evidence\sa-astra\stage2-computed.md:48-84`, covering all 33 arm/cell groups with clue-share and normalized
> score-position median/minimum/maximum and census-estimate share; full precision is in
> `stage2-computed.json.groups[*].population`. It is read beside the timing table, not replaced by the
> selected-cell summary in §1.11.

Alternatively embed that complete generated table in §1.11. The joint report currently omits normalized
score position from its own tables, although the binding population rule includes it.

**Clarify prior examples in §2.3:**

> At the reported median K values the proposed starts are 13,14,9,8 on 14x14,20x20,24x24,26x26 Hell 1.
> Each actual call still uses `clamp(round(share*K),1,K-2)`; these are representative counts, not fixed counts
> for every set.

The rechecked ended set calls already include 13 **and 14** on 14x14, and 14 **and 15** on 20x20 under the new
shares. The fitted share values themselves reproduce and remain accepted.

## Review outcome and verification

Subject to the exact corrections above, the former D-1/D-2/D-3 need no external arbitration:
reference kernel; the gated 20-row uncapped check; and 32/40 G `require` candidates are my settled positions.
Q-S24-1/Q-S24-2 are jointly answered under the owner's delegation; the five owner policy/scope questions remain.
If the drafter does not accept
the sufficiency/stop gate of finding 3, return that precise technical disagreement to the SAs rather than
asking the owner to choose experiments without a settled acceptance contract.

The new numeric results and LF-normalized input hashes are in
`evidence\sa-astra\draft-review-check.json`. All computations are unlocked reads/arithmetic.
No shared draft, original evidence, harness, production file or test was modified; no git command was used.
The shared draft hashes are unchanged; the numeric output reproduces byte-for-byte; `npm run check` passes.
Validation commands and results are in `evidence\sa-astra\draft-review-validation.txt`.
