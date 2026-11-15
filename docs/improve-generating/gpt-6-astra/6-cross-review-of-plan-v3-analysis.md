# Plan version 3: cross-review of Opus's analysis (Pentomino)

Astra (SA2), 2026-11-15, phase 2.

Reviewed `claude-opus-5.5\5-plan-v3-analysis.md` (264 lines), my phase-1 analysis, the plan and
clarifications at `8d795f8`, and the committed provisional/Landscape records. Production source was read
only through `git show 6122dc9:<path>`, not from the mutable rating-v3 working files.
No engine, test, generation, benchmark or timing run was made. Small scripts only read existing JSON and
calculate arithmetic. Only this cross-review is written.

**O-Pnn** means Opus's `JV3-Pnn`; **A-Pnn** means mine. Existing IDs collide and must be renumbered only
when the joint report is compiled.

**Disposition of Opus's seventeen findings: 7 agree, 8 agree with a change, 2 disagree.**
I accept the additional source/manifest corrections. I do not treat the explicit global completion gate
as an unanswered question, or require an extra screen pilot merely because a future revisit is permitted.
The broken P1 pseudocode, memory-cap equivalence and incomplete (c5) admission rule from my analysis remain.

## 1. Finding-by-finding settlement

| Opus finding and analysis line | Verdict | Evidence and proposed joint position |
|---|---|---|
| O-P01, 124: Hell prior denominator | **Agree** | Same issue as A-P04: `plan.md:277-280` says batch time, but 418-421 scales all T10. On the literal batch-only reading use `T1 + gamma*(T10-T1)` before the kernel term: **17.4 s [11.6-27.5]** and **21.8 s [14.5-34.5]**. Keep the denominator question because a different intended mechanism would require a separately stated assumption |
| O-P02, 125: 14x14 Hell clue share | **Agree with a change** | `IGP-05\families-failed-sets.jsonl` and `pm1.md` part 3 give K 32/34 and eligible windows at 11-14 clues: about 34.4-43.8%. Fix `plan.md:605-606`. Lines 266-267 already state the correct +8 to +11 offset; do not label that passage wrong or reopen the approved blind comparison. The uncertainty about subjective difficulty remains |
| O-P03, 126: nonexistent MP12b3 fail-fast | **Agree** | `6122dc9:tasks\difficulty-v3\MP12b3-hell-availability-and-fail-fast.md:25-28,51-52,68` explicitly says none was built under P-OD12. F1/F2 were evaluated proposals, not the retained implementation. Correct `plan.md:115-117,253-254,410,616`; cite the false-stop experiment as the reason for rejecting them |
| O-P04, 127: new runtime contracts bypassed by the old prototype | **Agree with a change** | `tools\ig-proto\variants\p1p5.json:13-16` replaces the dispatch with `igSelectProto(ctx)`, bypassing the updated native body. At `6122dc9`, `core\engine\clues.js:257-300,379-385` contains recorder/detail and skip-replay contracts. Add **RES-29's existing `charge` contract** too (`clues.js:51-53,258`, `generate.js:28-38`), not only MP13-MP14. Rebase semantically, not just textually. Match observer modes between timed arms; do not force optional recorders on and call that default production timing |
| O-P05, 128: budgets/reserve omitted from the freeze | **Agree** | `plan.md:471-474` fits the P5 budget/reserve but freezes only “the table, the priors and any ranker”. Explicitly version and freeze the budget table, bounded-attempt policy and reserve/deadline configuration too; validation must exercise the intended production configuration and retain the uncapped comparator needed to measure lost completions |
| O-P06, 129: reduced PM1 after the freeze | **Agree with a change** | There is a dependency ambiguity, not proof that the existing prior cannot be validated. The built table already uses recorded windows; the new failing-set work may inform a later refit. State either that the needed Hell 1 work precedes stage 3, or that its later output cannot change the validated prior without a new fit/freeze/validation. Retain the owner's separate pricing/approval and the data-only-first order; do not silently move all PM1 into the mandatory pilot budget |
| O-P07, 130: global versus per-cell completion gate | **Disagree** | `plan.md:512-513` says 18/20 on **each** failing Nightmare cell; phase 0's “gate to continue” at 537 makes that a global prerequisite for phase 2. This is conservative but unambiguous. The fact that two cells are unmeasured makes the gate important, not undefined. Extending Master's legacy route to failed Nightmare cells is a new release/routing policy, not a clarification already required by the plan. Keep the written gate unless a separately justified change is proposed |
| O-P08, 131: the 5-9 h price indication | **Agree with a change** | The arm matrix can materially increase the price, and phase 2 repeats validation. However, the revised totals are **Projections**, not measured round costs; even their baseline input includes a 20-request extrapolation from a three-request prescreen. Retain the budget question, reject “20x20's baseline is never worth running”, and decide which paired comparators actually bind before pricing. Section 2 below checks the inputs |
| O-P09, 132: stale line anchors | **Agree** | The engine anchors describe the older snapshot. For example, `selectClues`' count loop is now at `core\engine\clues.js:653-685`, and `dispatchOrder` at `generate.js:638`. Pin old-source claims to `cd5d17f` and identify the current semantic/preparation contract at `6122dc9`; refresh the receipt at the final freeze |
| O-P10, 133: “changes no gate” | **Agree with a change** | The clarification summary is too broad: v3 specifies admission statistics and operational conditions more tightly. Say in the new joint report that it refines the previously approved gates and proves none passed. Do not rewrite the dated decision log as cleanup; Fable can append a correction if needed |
| O-P11, 134: the 12x12 population denominator | **Agree** | `evidence\provisional\summary.md:43-44,136-139` distinguishes 0.200 on six seeds from 0.211 over MP12b1's 185 accepted puzzles. Section 4 defines “today” as the latter cohort, so print **0.211 -> 0.211**, or explicitly label the six-seed comparison. No general zero-shift conclusion follows beyond those populations |
| O-P12, 135: 16/47 window ratings citation | **Agree** | The 380 M loss is in `IGP-05\pm1.md:48`, in R27's Hell window population, not R33's request comparison. Correct the citation without changing the observation |
| O-P13, 136: `SHARES` and the lock | **Agree with a change** | Distinguish an unchanged `SHARES` constant/legacy default from the new versioned start-count override. Do **not** scope the entire score/work/cap lock to `gen-v3`: canonical rating, 760 M/80 M caps and work-unit meanings also bind `gen-v4`. Only its search prior/routing changes under the new generator identity |
| O-P14, 137: compulsory 12x12 screen pilot | **Disagree** | `clarifications.md:1405-1415` and IG-P-D4 choose no screen by default; revisiting it is conditional on matched evidence. That does not require the current manifest to fund a 190 M arm, nor require deletion of the future reopening condition. Keep no screen unless a separately named, priced pilot and its evidence justify reopening. Five extra seeds would not by themselves establish the (c5) validation gate |
| O-P15, 138: “no accepted puzzle on candidate boards” | **Agree** | R27 records 5 accepted puzzles on 14x14 Hell 1, 13 on 24x24 and 134 on 26x26. Narrow `plan.md:274-275` to the prescreened no-set populations. These are puzzle counts, not counts of complete requests |
| O-P16, 139: Master control cost | **Agree with a change** | A smaller identity-only design can be proposed when pricing, but identity is not proved by calling the route “legacy”: shared integration and observers still require verification. An untimed replay consumes essentially the same generation work. Any saving comes from fewer/reused requests, not deleting the timer; it remains costed and priority-controlled. Do not silently reduce the currently specified validation population |
| O-P17, 140: P6/progressive-presentation ordering | **Agree with a change** | Make clear that these small equal-result/presentation items need not wait for the full new-search completion gate. This is after the feature's frozen-source prerequisite and their own identity/history checks; “now” is not permission to edit active difficulty-v3 production. P7 still depends on its spike. Lines 543-544 already permit P6 to ship first relative to phase 2 |

## 2. Additional checks and corrections to the peer analysis

### 2.1 The actual budget inputs

I read the raw `runs` arrays named by
`docs\difficulty-v3\landscape-v3-full\aggregate-2026-11-14.json`'s coverage manifest, including the four reused
Master records under `landscape-v3\r2`. No engine was loaded.

| Input | Checked value | Kind / implication |
|---|---|---|
| Five failing Nightmare cells | Sum of observed response times **9,983.990 s**, 20 requests each | Derived from measured records; agrees with Opus's rounded 9,984 s |
| 26x26 Hell 1 | **2,856.555 s**, 20 requests | Derived; agrees with about 2,857 s |
| 20x20 Hell 1 | **345.036 s, three requests**, zero accepted puzzles | Measured population; `20x20-hell-1-s3-2026-11-14.md:7-8,22` is explicit about n=3 |
| 20x20 scaled to twenty requests | **2,300.238 s** if each costs the old prescreen mean | Projection: `20*345.0356251/3`; not an observed 20-request sum |
| All sixteen Master cells | **1,781.200 s**, 320 historical requests | Derived; doubling it gives **3,562.400 s** only as an equal-cost after-arm projection |
| Optional Hell 1 baseline cells | 24x24 **2,800.641 s**; 14x14 **2,746.729 s**, 20 requests each | Derived historical inputs, not future source costs |

Thus Opus's roughly 4.2 h additional headline baseline is a plausible **planning scenario**:
`(9983.990 + 2856.555 + 2300.238)/3600 = 4.206 h`.
Its 16x16/15x20 new-search transfers, the new controls' 0.5-1.0 multiplier, pilot costs and browser calibration
are further assumptions. Neither 5-9 h nor 10-12.5 h is the approved envelope or an upper bound.

The statement at Opus lines 201-202 that today's 20x20 arm is **never** worthwhile is too strong.
Three censored failures do not prove failure on every new independent seed or on the final source.
Matched final records may avoid new baseline work where their identity and fitting exclusions pass;
otherwise choose a bounded baseline cohort if it is needed for a claimed comparison. Do not invent a
zero-success control for unrun validation seeds.

### 2.2 The source contract extends beyond MP14

The pinned source already accepts a `charge` observer independently of `record`; its exception propagates,
and set calibration is included (`core\engine\generate.js:28-38`).
The native clue selector also verifies that every recorded replay skip is consumed, including failed returns.
An old prototype that simply replaces the selector cannot acquire these semantics because sixteen textual
anchors happen to match.

The required receipt should cover:

- native/no-op identity and the new algorithm's full request/provenance, including prior and budget versions;
- versioned subset/repair skip ordering and bounds; unchanged replay of `gen-v3` records;
- recorder/detail and work-charge semantics, including throwing observers and terminal paths;
- separate parity checks with observers absent and present, with the same observer mode in paired timings;
- `difficulty.js`, where `p6-1` changes the diagnostic call, and the engine/app/pack/CLI consumers.

This is a preparation/implementation correction, not a new speed credit or a request to run the old harness now.

### 2.3 Speed settlement

No measured time moves. Both analyses find the same batch-only Hell correction:

```text
T_mix = [T1 + gamma*(T10-T1)] * (1-g+g/k)
central: gamma=0.8, g=0.95, k=1.7
```

| Cell | V3's current mix | Batch-only corrected mix | Browser sensitivity, not a browser result |
|---|---|---|---|
| Hell 1 26x26 | 16.7 s [10.6-27.5] | **17.4 s [11.6-27.5]** | Central **74.7 s**, optimistic 51.6 s |
| Hell 1 20x20 | 20.9 s [13.3-34.5] | **21.8 s [14.5-34.5]** | Central **92.0 s**, optimistic 62.9 s |

Basis: recorded T1/T10 medians 6.2113/34.2440 and 7.1530/42.8880; the same kernel endpoints as v3;
browser illustration `5+4*T`. In these n=2 cohorts the medians are means, so this decomposition is exact
for the stated sensitivity. It remains a Projection, not a confidence interval or an offer result.

Opus also agrees in section C that Master P6's 2.2/7.5 s are not measured after-arm medians.
The actual four-request A:B medians are **2.37 -> 2.01 s** and **10.86 -> 9.52 s**
(`IGP-04\compare.md`). Keeping 2.2/7.5 requires a **Projection** label, because those numbers transfer
paired factors onto another cohort. Even “Derived” alone would hide the transfer assumption.

## 3. Findings from my analysis that remain for the joint report

| My finding | Disposition |
|---|---|
| A-P01, High: incomplete P1 pseudocode | **Keep as a correction to Fable**, not a cleanup cut. `plan.md:179-196` can enter bisection with undefined `lo`; it does not implement the measured prototype's two starting directions and endpoints (`ig-select-proto.js:651-664`). Ask Fable to replace it with the complete contract or a valid reference, not the cleanup operator to redesign it |
| A-P02: memory-equivalent kernel and lock wording | **Keep.** `6122dc9:core\engine\deduce.js:303-309` has a real memory-limit outcome. Additional storage needs accounting and a reference fallback where it would change that outcome. Two external memory gates alone are not parity. The line-360 wording must not prohibit the proved-equal source edits P7 proposes |
| A-P03: incomplete (c5) admission | **Keep as proposed Q26.** Zero/few matched sets, unlisted classes, the common censor endpoint and the fixed aggregation/resampling recipe must be settled before evaluation |
| A-P04: gamma | **Shared with O-P01**, proposed Q29 |
| A-P05: P6 measurement label | **Shared with Opus section C**, as corrected above |
| A-P06: sample p95 versus population evidence | **Keep.** At n=2-6 the observed nearest-rank p95 is the maximum, not nonexistent. Say that it does not establish a reliable population tail; retain observed slow outcomes |
| A-P07: Hell clue counts | **Shared with O-P02**; no new owner decision |
| A-P08: other current-versus-historical wording | **Keep.** PM2 does report `fewestColumn` (including 40.3 ms on 12x12, rounded to 0.0%); its isolation is unreliable. Current Hell offers are closed. P10 remains a possible later fallback, so a service level is not the only route. Old gains must name their source, not claim timing at `6122dc9` |

Opus's “nothing that binds a gate is missing” summary is too broad in light of (c5), memory equivalence and
the production-configuration freeze. These corrections should be visible before the frozen manifest is used.

## 4. Unified questions for Fable

Proposed numbering for the joint report follows. It does not alter either phase-1 document.

| Original question | Open and worth asking? | Proposed disposition |
|---|---|---|
| Opus IG-P-Q25: today's validation arm | **Yes**, to enumerate the costly comparator matrix and any intended reduction | Keep **IG-P-Q25**, including Master identity-only coverage and the production repeat |
| Opus IG-P-Q26: global or per-cell gate | **No ambiguity as written** | **Do not carry as an unanswered question.** The written global gate stands. A per-cell release route would be a new proposal |
| Opus IG-P-Q27: PM1 versus the freeze | **Yes**, about which data may fit the validated prior | Keep **IG-P-Q27**, allowing either pre-freeze use or a later separately validated refit |
| Opus IG-P-Q28: MP13-MP14 contracts | **Yes**, extended by the pinned RES-29 contract and observer-mode distinction | Keep **IG-P-Q28** |
| Astra IG-P-Q25: gamma denominator | **Yes**; same issue as O-P01, not a second question | Renumber **IG-P-Q29** |
| Astra IG-P-Q26: fail-closed (c5) | **Yes**, not a duplicate of the global completion question | Keep **IG-P-Q26** |

### IG-P-Q25: Which today's-arm requests and production repeats belong in the priced manifest?

**Question:** Does the same-source/same-seed rule require twenty new today's-arm requests on every headline
cell, or only where a specified gate/population comparison needs them? What is the Master identity-only
coverage, and is the phase-2 production validation priced separately?

**Recommendation:** twenty paired comparisons where the no-regression gate needs them; use compatible final
records where allowed, and explicitly price a smaller baseline cohort on failing headline cells if that is
the intended comparison. Alternatively retain the full twenty and price the larger envelope. Do not exempt
20x20 categorically or treat reused fitting seeds as independent validation.

### IG-P-Q26: How does rule (c5) fail closed on insufficient, unmatched or censored data?

**Question:** What minimum matched-set/independent-seed population is admissible, which common request
endpoint supplies a failed T10, and what happens for unlisted/unvalidated classes or too few matched sets?
Which aggregate, class weighting and resampling rule are fixed before validation?

**Recommendation:** no screen/inconclusive unless all admission conditions are evaluable and pass; keep
unmatched and failed outcomes in completion reporting. The chosen endpoint must not reward a failed arm
against a longer completed control. State the actual deadline configuration of each comparison.

### IG-P-Q27: Which PM1 results may feed the prior frozen for validation?

**Question:** Does the new Hell 1 failing-set work precede stage 3, or does the first validation use the
existing window/table evidence, with stage-5 PM1 reserved for a later refit?

**Recommendation:** inventory the existing data first. Move only the needed, separately priced Hell 1 work
before the freeze if its output will fit that prior. Otherwise freeze the existing inputs and require another
fit/freeze/validation before adopting the later output. Hell 2 central-share work stays separate.

### IG-P-Q28: What is the frozen prototype's complete replay, provenance and observer contract?

**Question:** Confirm that both `gen-v4` and its measurement prototype adopt the then-frozen provenance,
skip-replay, recorder/detail and work-charge contracts, with version-appropriate ordinal bounds/fixtures.
Which observer modes are correctness checks and which are the timed production comparator?

**Recommendation:** preserve `gen-v3` replay; specify `gen-v4`'s changed search transcript under its own
identity; rebase `difficulty.js` and all consumers as well as `clues.js`. Compare like observer modes.
Textual anchor success is not semantic compatibility.

### IG-P-Q29: Is the new prior factor batch-only, or does it include an additional set-stage mechanism?

**Question:** Does gamma price only the unbuilt per-set prior, as P4 says, or an additional improvement of
set calibration too?

**Recommendation:** use the batch-only formula and corrected times. The existing table prior is already in
`T_search`; it cannot be credited again. Any further set-stage factor needs its own stated mechanism,
assumption and measurement, rather than silently multiplying all T10.

**New owner decisions: none.** The manifest's eventual price and existing later enablement/offer/SLA choices
still need their specified receipts. Keeping the current global gate does not authorise a new fallback.

## 5. Final pruning position

I accept archiving the v2 reports once the v3 joint report exists, and withdraw my proposed trims/heading
changes in `clarifications.md`. The decision log is not the place to remove dated history.

### 5.1 Companion files

| Item | Final position | Reason / condition |
|---|---|---|
| `report.md` | **Keep; pin historical references in existing metadata** | The provisional summary, audit and executed tasks cite its estimates. A current-plan banner must not make those historical inputs appear to be v3 forecasts |
| `plan-v2-joint-report.md` | **Delete after the v3 joint report and link fixes** | Its binding choices are in v3/clarifications; current corrections must be carried into the new joint report. The exact old report remains at `ed52013` |
| Both analysts' 3/4 v2 files | **Delete in the same archival change** | Superseded reasoning; the active R4/guard/memory/identity requirements must remain in the current documents and review. Nonbinding implementation estimates can stay archived |
| Both `1-speed-summary.md` files | **Delete after reference fixes** | Duplicate superseded tables, no unique binding content or live harness reader identified. I retain this position; it is the remaining disagreement with Opus's phase-1 keep recommendation |
| Both `1-analysis.md` and `2-cross-review.md` files | **Keep** | `summary.md`, `summary.mjs` and the executed checklist cite substantive derivations in them |
| `clarifications.md` | **Keep every section; commit-pin links only** | Withdraw my proposed trims at 982-995 and 1016-1040 and the rename at 1339. Dates and the final decision table distinguish historical status |
| `evidence\` | **Keep all recorded packages** | No disposable working draft identified; old comparisons and audit records remain immutable provenance |
| `tasks\improve-generating\*` | **Keep** | Approved populations, limits and execution history remain necessary |

Git blob IDs for the v2 joint report and all four 3/4 files are identical at **`ed52013`** and **`8d795f8`**.
The proposed archive therefore preserves the exact reviewed versions.

### 5.2 Link fixes

| Referrer | Replacement |
|---|---|
| `plan.md:5`, `clarifications.md:1104,1341` | The full v2 joint-report path at `ed52013`; keep the decision text unchanged |
| The new v3 joint report's basis | All archived 3/4 reports at `ed52013`, not live relative links |
| This round's snapshot-qualified analysis references | Preserve their historical meaning; state the archive convention in the joint report |
| `report.md:8` and both `2-cross-review.md:3-5`, if speed summaries are deleted | Each full summary path at `8d795f8` |
| `report.md:5` | The historical v1 plan at `555197b`, with the current plan identified separately |

The committed Markdown/script scan found no other live v2-document callers. The retained evidence and
task readers cite the **1/2** generation of analyses; those are not proposed for deletion.
Do not edit recorded evidence or firewall inventories to remove historical filenames.

### 5.3 Pure-history cuts in the active plan

| Exact v3 lines | Final cleanup position |
|---|---|
| 3-8 | **Trim** to the version identifier, old plan commits, current decision-log authority and commit-pinned v2 report |
| 25-48, section 0 | **Delete the duplicated changelog**; every operative choice remains in sections 1 and 3-7 |
| 103-104, old-forecast comparison only | **Delete the comparison clause**; keep the measured shares and “profile time, not a critical path” |
| 208-209, old three-to-four / two-to-three slogan only | **Delete the retirement narrative**; keep observed call counts and the absence of a demonstrated universal search bound |
| 239, “of version 2” quotation | **Remove the historical framing only**; retain the 0/0 and 0/2 observations, their screen setting and their limited population |
| 335, “from the joint report” | **Delete that historical attribution** once the authority link is pinned; retain the full variable-piece-size charge formula |
| 447-448, the first report's “correction 10%” | **Delete that historical comparison**; retain PM4's observed 0% and its population |
| 620-621, “The cohorts version 2 named for this” | **Trim to “the measured 3x29 and 10x10 Nightmare cohorts”**. Do not rewrite it as a universal K=17-19 property of those boards |
| 179-196 P1 pseudocode | **Not a cleanup edit.** Fable must correct the substantive algorithm; my phase-1 proposed delete/replace is withdrawn from the pruning list |
| 520-531 evidence index; operative scope, contracts, gates and decisions | **Keep.** I withdraw the broader index/history cuts. Substantive corrections at 122-123, 360, 614-615 and elsewhere go to Fable |

Only agreed pure-history/link changes should be executed. The incomplete pseudocode, gamma formula,
protocol, memory rule and source-contract changes are the author's corrections, not our cleanup.
