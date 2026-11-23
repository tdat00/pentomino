# improve-generating-stages-2-4 (Pentomino): the frozen round's stages 2 to 4, task pack: index and shared rules

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4; [`docs/improve-generating-stages-2-4/plan.md`](../../docs/improve-generating-stages-2-4/plan.md), **Final (2026-11-23, base ff9adcf)**, a sub-plan under [`docs/improve-generating/plan.md`](../../docs/improve-generating/plan.md) version 4 (`c3ef770`) |
| Joint report | [`docs/improve-generating-stages-2-4/report.md`](../../docs/improve-generating-stages-2-4/report.md) (the stage-2 report, the freeze proposal, the joint decisions) |
| Repository, branch | `Q:\git\pentomino`, `improve-generating` |
| Base commit | `57ef5cf` (the final plan); the frozen source is `3fc65f4` (D-V4-01) |
| Pack author / reviewer | SA-Opus (claude-opus-5.5) / SA-Astra (gpt-6-astra) |
| Executor | Dev-Sonnet (claude-sonnet-5.5), one task at a time in this repository; the run tasks `S01` to `S07` are the orchestrator's, `T11` and `T16` the SAs' |
| Inherited pack | `tasks/improve-generating-v4/` (`0edc636`, its §8 hand-over): its run rules, decisions and named items are restated in §3, §5 and §6 below where they bind this pack |

**Scope of this pack.** Everything of the plan's §8 task outline, in its order: the harness fixes N-V4-19 and N-V4-20;
the control pilot `V4-S2B` with its reading tool; P7's scoped spike (N-V4-05: three composites, their equality tests
and the timing run `V4-P7`); the frozen family (the prior table `prior-s3-v1`, P5's budget by mode, the per-set level
filter, the live request deadline of N-V4-13, the four variants `fr-frozen`, `fr-frozen-none`, `fr-frozen-uncapped`,
`fr-frozen-none-uncapped` and their checks); the live-deadline receipt and its acceptance; the plan `V4-S3P` (the four
P-1 proofs and the 20-request uncapped Hell 1 check) and the SAs' reading of it; the freeze record `freeze.json`
(N-V4-03); `V4-LIVE`; the stage-4 activation with S4-6; `V4-S4`; `V4-S4C`; the verdicts and the stage-4 report with
phase 0's decision (N-V4-06). Nothing reaches users: no task edits `core/` or `generator/` (D-V4-11, plan §4.9).

## 1. Index (execution order)

Tasks run serially in this order (one repository). `S` tasks are runs that the orchestrator executes; a **STOP** is
an owner stop: the orchestrator re-reads the approval with `manifest.mjs approval --plan <id>` and the round's account
at that time, asks the owner on Discord, and the plan waits for his answer.

- [x] T01a N-V4-19: publish every done shard of an arm (`arm.mjs publish --done-only`) (depends on none)
- [x] T01b N-V4-20: the self-test's git guard sees `git -C` and calls inside expressions; `--list` for the gates (depends on T01a)
- [x] T02a The plan writer (`manifest.mjs write-plan`) and the plan `V4-S2B` (depends on T01b)
- [x] T02b The fitting reader, part 1: the declared grid, the no-regression preview and the call prefixes (pure) (depends on T02a)
- [x] T02c The fitting reader, part 2: the commands `preview` and `prefixes` and their records (depends on T02b)
- [x] S01 Run `V4-S2B` and read it (orchestrator, then the SAs; approved by the owner, D-S24-26; the approval re-read before the run) (depends on T02c)
- [x] T02d The fitting reader indexes the publication metadata it reads (`fit-read.mjs prefixes`; the S01 reading's W3, ruling R-P24-05) (depends on S01)
- [x] T03a P7: the equality and timing items and their memory fixtures (`p7-probe.mjs`, part 1) (depends on S01)
- [x] T03b P7: the experiment declaration, the log and corpus checks and the verdicts (`p7-probe.mjs`, part 2) (depends on T03a)
- [ ] T03c P7: the equality bindings, the go rule and the probe's commands (`p7-probe.mjs`, part 3) (depends on T03b)
- [ ] T03d P7 C1: ordered live-row lists for R4 (`p7-c1`) (depends on T03c)
- [ ] T04 P7: R5 on the live-row lists (`p7-c1r5`) (depends on T03d; skipped or revised when the pack author's ruling on a dropped `p7-c1` says so)
- [ ] T05a P7 C5: `select`, `liveRowOf` and `listRows` on the lists (`p7-c1r5c5`) (depends on T04; the same rule)
- [ ] T05b P7: the full equality runs and the plan `V4-P7` (depends on T05a; with no eligible composite, no plan)
- [ ] S02 Run `V4-P7` and write the spike report (orchestrator, then the SAs; approved by the owner up to 20 counted minutes, D-S24-28; the approval re-read before the run; with no eligible composite, the report only) (depends on T05b)
- [ ] T06a The prior table `prior-s3-v1` and its generator `fit-prior-s3.mjs` (depends on S02)
- [ ] T06b P5's call budget by uniqueness mode and the per-set prior's level filter (`p5-mode`, `ps-levels`) (depends on T06a)
- [ ] T07a The live request deadline in the client and the pool (`live`) (depends on T06b)
- [ ] T07b The live request deadline's hard response bound in the host (depends on T07a)
- [ ] T07c The live request deadline's scripted-pool cases (depends on T07b)
- [ ] T08a The four frozen variants, a candidate epoch (depends on T07c)
- [ ] T08b The freeze's constants and checks (`freeze.mjs check`) (depends on T08a)
- [ ] T08c The frozen family's real-call and live cases on the frozen trees (depends on T08b)
- [ ] T09a The live verification's identity record and the live-deadline row and verification checks (depends on T08c)
- [ ] T09b The live-deadline receipt (`live-deadline.mjs receipt`) (depends on T09a)
- [ ] T09c The `live-deadline` kind of `v4-check accept` (depends on T09b)
- [ ] T10 The plan `V4-S3P` (depends on T09c)
- [ ] S03 Run `V4-S3P` (orchestrator; **STOP: the owner approves the four proofs' cap at their gate**; the 20 Hell 1 rows are approved, D-S24-27) (depends on T10)
- [ ] T11 The SAs' reading of `V4-S3P` and `V4-S2B`: the read gate of D-S24-24 (SA-Opus and SA-Astra; may stop for a joint SA ruling and the owner) (depends on S03, S01, T02d)
- [ ] T12a The freeze's fit index: the validated transitive inputs of every fitted value (depends on T11's jointly signed acceptance of the final epoch)
- [ ] T12b The freeze record `freeze.json` (`freeze.mjs write`) (depends on T12a)
- [ ] S04 Run `V4-LIVE` (orchestrator; **STOP: the owner approves its cap at its turn**) (depends on T12b)
- [ ] S05 The stage-4 activation (orchestrator; **STOP: the owner decides S4-6 and authorizes `activate`**) (depends on S04)
- [ ] S06 Run `V4-S4` (orchestrator; **STOP: the owner approves its allowance, a raise of the cumulative cap**) (depends on S05)
- [ ] S07 Run `V4-S4C` (orchestrator; **STOP: the owner approves its scope at its turn**) (depends on S06)
- [ ] T16 The stage-4 report and phase 0's decision (N-V4-06) to the owner (SA-Opus and SA-Astra) (depends on S07)

| ID | File | Developer (h) | Machine: formal projected / guard (counted min); timing proxy | Owner stop |
|---|---|---:|---|---|
| T01a | [T01a](T01a-publish-done-shards.md) | 3 | - | - |
| T01b | [T01b](T01b-git-guard.md) | 2 | locked verification only | - |
| T02a | [T02a](T02a-plan-writer-and-v4-s2b.md) | 2.5 | - | - |
| T02b | [T02b](T02b-fit-reader-core.md) | 3 | - | - |
| T02c | [T02c](T02c-fit-reader-commands.md) | 3 | - | - |
| S01 | [S01](S01-run-v4-s2b.md) | - | 22.59 / 28.24; 16.0-20.0 | approved (D-S24-26); re-read |
| T02d | [T02d](T02d-fit-read-publication-inputs.md) | 0.5 | - | - |
| T03a | [T03a](T03a-p7-probe-items.md) | 3 | locked verification only | - |
| T03b | [T03b](T03b-p7-probe-declaration-and-verdicts.md) | 3 | - | - |
| T03c | [T03c](T03c-p7-probe-bindings-and-commands.md) | 3 | - | - |
| T03d | [T03d](T03d-p7-c1-live-row-lists.md) | 3 | locked verification only | - |
| T04 | [T04](T04-p7-r5-on-lists.md) | 2 | locked verification only | - |
| T05a | [T05a](T05a-p7-c5-select-on-lists.md) | 2.5 | locked verification only | - |
| T05b | [T05b](T05b-p7-full-equality-and-v4-p7.md) | 2 | locked verification only | - |
| S02 | [S02](S02-run-v4-p7-and-spike-report.md) | - | 15.50 / 19.37; 11.4-12.9 (three composites; 0 with no eligible composite) | approved up to 20 min (D-S24-28); re-read |
| T06a | [T06a](T06a-prior-s3-v1.md) | 2 | - | - |
| T06b | [T06b](T06b-budget-by-mode-and-per-set-levels.md) | 3 | locked verification only | - |
| T07a | [T07a](T07a-live-deadline-client-and-pool.md) | 3 | locked verification only | - |
| T07b | [T07b](T07b-live-deadline-host-bound.md) | 3 | locked verification only | - |
| T07c | [T07c](T07c-live-deadline-scripted-cases.md) | 3 | locked verification only | - |
| T08a | [T08a](T08a-frozen-variants.md) | 2.5 | locked verification only | - |
| T08b | [T08b](T08b-freeze-checks.md) | 2 | - | - |
| T08c | [T08c](T08c-frozen-real-calls.md) | 3 | locked verification only | - |
| T09a | [T09a](T09a-live-deadline-checks.md) | 3 | - | - |
| T09b | [T09b](T09b-live-deadline-receipt.md) | 3 | - | - |
| T09c | [T09c](T09c-accept-live-deadline.md) | 3 | - | - |
| T10 | [T10](T10-plan-v4-s3p.md) | 1 | - | - |
| S03 | [S03](S03-run-v4-s3p.md) | - | 71.20 / 89.00 (proofs) + 67.69 / 84.61 (Hell 1 rows); 20.0-22.0 + 20.0-22.0 | **the proofs' cap** |
| T11 | [T11](T11-sa-reading-of-the-fit-runs.md) | SA | - | only for a new measured scope or a recorded-decision change |
| T12a | [T12a](T12a-fit-index.md) | 2.5 | - | - |
| T12b | [T12b](T12b-freeze-record.md) | 2.5 | - | - |
| S04 | [S04](S04-run-v4-live.md) | - | 35.12 / 43.91; 4-5 | **its cap** |
| S05 | [S05](S05-activation.md) | - | none (S4-6, only if chosen: 58.00 / 72.50) | **S4-6 and the authorization of `activate`** |
| S06 | [S06](S06-run-v4-s4.md) | - | 1,185.49 / 1,481.86; 464.3-509.8 | **the raise** |
| S07 | [S07](S07-run-v4-s4c.md) | - | 585.62 / 732.02; 169.8-182.8 | **its scope** |
| T16 | [T16](T16-stage4-report-and-phase0.md) | SA | - | phase 0's result to the owner |
| | **Total (36 tasks)** | **69** | **1,983.21 / 2,479.01 formal from S01 to S07 (the guard chain ends at 2,651.343 on the account); 877.8-946.8 counted minutes for the whole round at the timing proxy** | |
The machine column is the formal price by T11g's rules (`stepPrice`, `price`; projected counted minutes / their 1.25
guard), with the timing-proxy estimate beside it (V4-S2's measured times of the same steps plus 15 s or 45 s of quiet
per invocation, `docs/improve-generating-stages-2-4/evidence/sa-opus/j1-numbers.md` §3, equal to SA-Astra's
`evidence/sa-astra/draft-review-check.json`); formal prices are the approval basis, timing proxies are never caps
(D-S24-20). "Locked verification only" means the task's gates execute real ratings through the lock helper with no
benchmark allocation (D-V4-15): its time is reported apart and needs no approval. The figures of `V4-S2B` and `V4-S3P`
are reproduced by `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-plans.mjs` (allocation 23 and 139 minutes;
guards 28.243734 and 173.609948 counted minutes); `V4-P7`'s by `j1-numbers.mjs` §2.

**The round's account and the grant (2026-11-23).** Logged 10,252.712 counted seconds plus 87.4 s off-log =
172.3352 counted minutes of the **749** granted (owner, 2026-11-18 05:59:59); runs pass `-ApprovedRoundMinutes 747`
(the grant less the 87.4 s off-log, rounded up, §3.2). Approved on 2026-11-23 inside the 749 (D-S24-26 to D-S24-28):
`V4-S2B`, `V4-P7` up to 20 counted minutes, and the 20 Hell 1 rows of `V4-S3P`. Asked at their turn: the four proofs of
`V4-S3P`, `V4-LIVE`, S4-6 and `activate`, `V4-S4` (a raise: its minimum cap is about 1,726 to 1,737 at the timing-proxy
spend) and `V4-S4C`. The minimum caps at the timing-proxy spend in the plan's order: `V4-S2B` 201, `V4-P7` 208-212,
`V4-S3P` 374-379, `V4-LIVE` 284-294, `V4-S4` 1,726-1,737, `V4-S4C` 1,441-1,497 (plan §8.3): minimum quotes for a scope,
never replacement grants; an active higher grant is kept unless the owner changes it.

## 2. Traceability

### 2.1 The plan (`docs/improve-generating-stages-2-4/plan.md`)

| Plan item | Tasks or named items |
|---|---|
| §1 Goal (the stage-2 report done; P7's spike; stage 3; the live deadline and `V4-LIVE`; stage 4; phase 0's decision) | T03a-S02; T06a-T12b; T07a-T09c, S04; S05-S07; T16 |
| §2 Scope, In: the stage-2 report and its readings | done (`report.md` §1); re-read on the frozen arms in T16 (N-V4-16, N-V4-17) |
| §2 Scope, In: P7's scoped spike (isolated variants, equality runs, one timing probe) | T03a, T03b, T03c, T03d, T04, T05a, T05b, S02 |
| §2 Scope, In: fitting runs before the freeze (`V4-S2B`; the 20-request Hell 1 check with its read gate) | T02a, T02b, T02c, S01, T02d; T10, S03, T11 |
| §2 Scope, In: the freeze (N-V4-03) and the four variants | T06a, T06b, T07a-T07c, T08a, T08b, T08c, T12a, T12b |
| §2 Scope, In: N-V4-19, N-V4-20, the budget lookup by mode, the per-set levels, the live deadline, `live-deadline.mjs`, the acceptance of its receipt, the plans `V4-S2B`, `V4-P7`, `V4-S3P` | T01a, T01b, T06b, T07a-T07c, T09a, T09b, T09c, T02a, T02b, T02c, T05b, T10 |
| §2 Scope, In: `V4-S3P`, `V4-LIVE`, `activate`, `V4-S4`, `V4-S4C`, the verdicts, the stage-4 report and N-V4-06 | S03, S04, S05, S06, S07, T16 |
| §2 Scope, In: S4-6 on the owner's choice at the activation | S05 |
| §2 Scope, Out (N-V4-18; production; stage 5; browser; offers; service level; phase 4; N-V4-15; a remedy of N-V4-14; Hell 2 and 3; P8; prefetch; the per-set prior on Nightmare; other `W`) | §6 named items; the global guards of §3.2 (`core/`, `generator/` unchanged) |
| §3 Current state (the account; `V4-LIVE` compiled and waiting; the absent pieces; `harnessInfo()`) | §1 account; S04 (`V4-LIVE` as compiled); T07a-T09c, T08a, T12a, T12b (the absent pieces); §3.3 (the window) |
| §4.1 The freeze contents (classes and `W_screen`, prior, per-set, P5 budgets, bound, reserve and deadline, mechanisms, kernel) | T06a (prior), T06b (budget by mode, per-set levels), T07a-T07c (deadline), T08a (values as parameters), T08b (class and `W` check), T12a (the fit index), T12b (the record) |
| §4.2 `freeze.json` (its fields, the readers, `activate`'s refusal, the check against T11e's `activation`) | T08b (the classes and values as constants, the checks), T12a (the validated fit index), T12b (the record, written once) |
| §4.3 The four variants (one edit set, four parameter sets; composition; runtime classes; records; the candidate epoch and D-V4-05's identity rule; unchanged after the bindings) | T08a, T08b (runtime classes), T08c; S03 and T11 (the epoch's proofs and its acceptance); §3.3 (never resume after an identity change) |
| §4.4 P5 (lookup by mode; values; bound 4; tests: real-worker transport, `require` returns no unfinished final, observer modes) | T06b, T08c |
| §4.5 The live deadline (mechanism; tests; receipt and acceptance) | T07a, T07b, T07c, T08c, T09a, T09b, T09c, S04 |
| §4.6 Plans to add (`V4-S2B`, `V4-P7`, `V4-S3P`; T11c's exported functions; never `compile`) | T02a, T05b, T10 |
| §4.7 Seeds (fitting reps only; validation, Master and second-validation reps never read by a fit) | T02a, T05b, T06a, T10 (the plans' reps), T02b (the declared grid refuses reps outside 0-4), T11 (the reading), T12a (validation reps refused among the fit inputs), T12b (`seeds` in the record) |
| §4.8 Harness changes (N-V4-19, N-V4-20, the frozen family, N-V4-13, the plans, the window) | T01a, T01b, T06a-T09c, T02a, T02b, T02c, T05b, T10; §3.3 |
| §4.9 Compatibility (nothing reaches users; records never rewritten; notes for phase 2) | the global guards; §3.3; §6 (N-V4-07) |
| §5 D-S24-01 to D-S24-29 | §5 register; each task's Authority section |
| §6 B1, B2, B3, B5 (phase 0's gates, controls, class verdicts, the reports) | S06, S07 (the verdicts), T16 (the report) |
| §6 B4 (the reserve and deadline frozen and proved on real rows) | T12b, S04 |
| §6 B6 (no run beyond its approved cap; every new scope approved first) | S01-S07 (the approval re-read, `-ApprovedRoundMinutes`) |
| §6 T1 (`freeze.json`) | T12a, T12b |
| §6 T2 (the four variants; `check-edits`; `check-binding --current v4`; differ only as declared; runtime `W`) | T08a, T08b |
| §6 T3 (real calls: `W` per class, budget per mode and level, per-set on Hell 1 only, the bound's reason by a real worker) | both checks (SA-Astra's review R11): T08b (`W` of the 19 comparator cells, pure) and T08c (`fz: W reaches real calls in every frozen class`: one real call per verdict class on `fr-frozen` and `fr-frozen-none`, `W` read from the journal's `start` line), with T08c's budget, per-set and real-worker cases |
| §6 T4 (the live deadline's scripted cases on both bounded twins; widths 1, 2, 4, 8; `check-prerequisites --plan V4-LIVE` `pass`) | T07b, T07c, T08c (both bounded twins, the pinned prefixes, the host bound), T09a-T09c (the verification bound to its trees), T12b |
| §6 T5 (`V4-S3P`'s four P-1 receipts pass, replay blocks included) | S03 |
| §6 T6 (P7: complete equality, memory rule, one composite against one reference) | T03a (the near-32-MiB memory fixtures, the input constructor `instr`), T03b (the declared verdicts against the required corpus, the log protocol, the memory coverage), T03c (the bindings requiring the run's declaration, state and log and rechecking every input, the go rule), T03d (the storage rule), T04, T05a, T05b, S02 |
| §6 T7 (`V4-S4`'s P-1 passes; rows published or closed; the selection final; `V4-S4C`; the final verdict) | S06, S07 |
| §6 T8 (the stage-4 report re-reads N-V4-16 and N-V4-17) | T16 |
| §6 T9 (`npm run check`; self-test groups; the firewall) | every task's gates |
| §7 Risks | T11 (the Hell 1 gate), S01 (controls), T08c (P5's transport), S06 (long run detached, N-V4-19, the closure route), §3.2 (the run checks), §3.3 (tree, window and recipe identity) |
| §8.1 Order and dependencies | §1 index |
| §8.2 T01 | T01a, T01b |
| §8.2 T02, S-1 | T02a, T02b, T02c, S01, T02d |
| §8.2 T03-T05, S-2 | T03a, T03b, T03c, T03d, T04, T05a, T05b, S02 |
| §8.2 T06 | T06a, T06b |
| §8.2 T07 | T07a, T07b, T07c |
| §8.2 T08 | T08a, T08b, T08c |
| §8.2 T09 | T09a, T09b, T09c |
| §8.2 T10, S-3, T11, T12 | T10, S03, T11, T12a, T12b |
| §8.2 S-4 to S-7, T16 | S04, S05, S06, S07, T16 |
| §8.2 T11's acceptance and read gate | T11 (verbatim) |
| §8.3 The account at each owner stop | §1; S01-S07 |
| §8.4 What follows | §6 (N-V4-05 phase 1, N-V4-06, N-V4-07 to N-V4-11, N-V4-01, N-V4-04, N-V4-10) |
| §9 Named open items (T11's gate; N-V4-16; N-V4-17; N-V4-15; N-V4-14; S4-6) | T11; T16; §6; S05 |

### 2.2 The inherited named items (`tasks/improve-generating-v4/check-list.md` §6)

| Item | Here |
|---|---|
| N-V4-01 browser calibration | §6, the owner when he asks |
| N-V4-02 stage 2 | done (V4-S2, `35b401e`); its rules stay in §3.2 |
| N-V4-03 stage 3, the freeze | T06a-T12b |
| N-V4-04 stage 5 | §6 |
| N-V4-05 P7's spike | T03a-S02; phase 1's adoption is §6 |
| N-V4-06 phase 0 | T16 |
| N-V4-07 to N-V4-11 | §6 |
| N-V4-13 live deadline | T07a-T09c, S04 |
| N-V4-14 interval widths | reported (`report.md` §1.4); a remedy is out of scope (D-S24-18); §6 |
| N-V4-15 `require` on large boards | §6 (the production pack) |
| N-V4-16, N-V4-17 | T16 (re-read on the frozen arms) |
| N-V4-18 | not implemented (D-S24-29); closed |
| N-V4-19 | T01a |
| N-V4-20 | T01b |
| N-V4-21 P5 and `require` | the finite `require` budget (D-S24-23, D-S24-25) in T06b and T08a; its replay proof in S03 (the four P-1 passes with `--require-pass`) |

## 3. Shared rules

### 3.1 Conventions

- **Files.** CRLF line endings, UTF-8 without BOM, no trailing whitespace, a final newline, and no character from
  U+0000 to U+001F other than CR, LF and a tab. Node tools are `.mjs` with `// @ts-check` first, JSDoc types, 2-space
  indent, single quotes and semicolons; variant manifests are JSON (`tools/ig-proto/variants/<id>.json`, two-space
  indent like `v4-p5.json`) and their edits are anchored text edits (`find`/`replace`, `append`, or
  `from`/`through`/`lines`, `lib/tree.mjs` `applyEdit`). An edit never targets a copy-only file under
  `tools/ig-proto/variants/files/` (the builder applies edits to the copied sources only, `lib/tree.mjs` `planTree`),
  and a copy never overrides a source file (`lib/tree.mjs:249`). The text of an edit is the text of the built tree it
  extends (`tests/artifacts/ig-proto/tree-frozen/<parent>/...`), LF line ends. `npm run check` passes at the end of
  every task.
- **Harness conventions** are those of `tasks/improve-generating/check-list.md` §3 and §7 and of
  `tasks/improve-generating-v4/check-list.md` §3.1: code under `tools/ig-proto/`; production files are never edited;
  trees are copies (`tests/artifacts/ig-proto/tree-frozen/<variant>/` under `--label frozen`, built from the verified
  snapshot `tests/artifacts/ig-proto/frozen-source/`, D-V4-01); records carry the `meta` block; plans are
  `tools/ig-proto/plans/V4-<ID>.json` with `"task": "V4-<ID>"`; records go under
  `docs/improve-generating/evidence/frozen/V4-<ID>/`, raw files under `tests/artifacts/ig-proto/frozen/V4-<ID>/`.
- **Cited lines.** A line number in a harness file (`tools/ig-proto/**`) is the line at the base commit `57ef5cf`; an
  earlier task of this pack that edits the file moves it, so the developer finds the cited code by the name or the text
  the task gives and reports the new lines in the final report (not a question). Lines in the frozen source
  (`tests/artifacts/ig-proto/frozen-source/**`, equal to `3fc65f4`) and in a built tree do not move. A different text at
  the named place is a `QUESTION:`.
- **Historical namespaces** (D-V4-18, the v4 pack §3.1): `IGP-02`, `V4-T04`, `V4-T04v4`, `V4-T04f`, `V4-T04i`, `V4-S2`,
  `V4-S2P`, `V4-S2K` and `V4-S2W` under `tests/artifacts/ig-proto/frozen/` and `docs/improve-generating/evidence/frozen/`
  are records that accepted bindings and the stage-2 report hash: no run, verification or self-test of this pack uses
  these task ids, and nothing deletes, moves or rewrites a file under them; a reader opens them read-only. A
  verification uses its own id (D-P24-06).
- **Self-test groups** (`tools/ig-proto/self-test.mjs`): default (real ratings, locked), `--frozen` (unlocked), `--v4`
  (locked: real uniqueness counts and deductions), `--items` (synthetic, unlocked). A task that adds a case names
  `self-test.mjs` in its scope, appends its cases at the end of the named group's array and gives each its exact name;
  the number of cases a group prints is reported, never an acceptance oracle. `check-edits` must report no error and
  apply every declared edit once.
- **The case selection block** (SA-Astra's review R20). A gate never types a case index: each task gives the literal
  array of its required case names, and this block (PowerShell 7 at the repository root) maps them to indices with
  the self-test's `--list` switch (T01b), runs exactly those cases and compares the recorded results with the names.
  The task sets the first four lines; the rest is fixed. Missing or duplicate names stop before any locked call; a
  wrong selection cannot pass silently (`--only` alone would run zero cases and exit 0, `self-test.mjs:10188-10227`).

  ```powershell
  $Id = 'S24-T06b'                  # the verification id (D-P24-06); the task gives it
  $GroupArgs = @('--v4')            # @() for the default group, @('--v4'), @('--items') or @('--frozen'); the task gives it
  $Locked = $true                   # $true for the default and --v4 groups, $false for --items and --frozen
  $Required = @('<name 1>', '<name 2>')   # the task's literal array of case names
  $listed = @(node tools\ig-proto\self-test.mjs @GroupArgs --list --label frozen)
  if ($LASTEXITCODE -ne 0) { throw "self-test --list failed with exit $LASTEXITCODE" }
  $byName = @{}
  foreach ($line in $listed) {
    if ($line -match '^(\d+) (.+)$') {
      if (-not $byName.ContainsKey($Matches[2])) { $byName[$Matches[2]] = [System.Collections.Generic.List[int]]::new() }
      $byName[$Matches[2]].Add([int]$Matches[1])
    }
  }
  if (@($Required | Sort-Object -Unique).Count -ne $Required.Count) { throw 'a required case name is given twice' }
  $bad = @($Required | Where-Object { -not $byName.ContainsKey($_) -or $byName[$_].Count -ne 1 })
  if ($bad.Count -gt 0) { throw "required cases missing or listed more than once: $($bad -join ' | ')" }
  $only = (@($Required | ForEach-Object { $byName[$_][0] }) | Sort-Object) -join ','
  $nodeArgs = @('tools\ig-proto\self-test.mjs') + $GroupArgs + @('--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--task', $Id, '--horizon-s', '285', '--only', $only)
  if ($Locked) {
    . .\tools\ig-proto\lock\ig-lock.ps1
    Invoke-IgNode -Repo pentomino -Task "$Id cases" -NodeArgs $nodeArgs
  } else {
    node @nodeArgs
    if ($LASTEXITCODE -ne 0) { throw "self-test failed with exit $LASTEXITCODE" }
  }
  $state = Get-Content -Raw "tests\artifacts\ig-proto\frozen\$Id\self-test\state.json" | ConvertFrom-Json
  $names = @($state.results | ForEach-Object { $_.name })
  $failed = @($state.results | Where-Object { -not $_.pass } | ForEach-Object { $_.name })
  if (-not $state.done -or $failed.Count -gt 0 -or $names.Count -ne $Required.Count -or @(Compare-Object @($names | Sort-Object) @($Required | Sort-Object)).Count -gt 0) {
    throw "the recorded results differ from the required cases (failed: $($failed -join ' | '))"
  }
  "cases: $($names.Count) passed, as required"
  ```

  A gate that needs more than one locked invocation of 300 s splits `$Required` into parts, each with its own `$Id`
  suffix (`S24-T08c-1`, `S24-T08c-2`, ...), and runs the block once per part. The literal `<name 1>`, `<name 2>` above
  are the only placeholders of this pack's executable gates: every task replaces them with its exact names.
- **Variant ids** have at most 40 characters (D-V4-05); an arm's algo id `gen-v4-proto:<variant>` has at most 36 (plan
  §4.3; `gen-v4-proto:fr-frozen-none-uncapped` has 36). Test-only variants end in `-test` and are never an arm, a plan
  step or a `current` id of a binding.

### 3.2 Commands and the lock

**The owner's lock rules** (2026-11-17, 21:33 +07:00; restated from the v4 pack §3.2): a locked invocation lasts at
most 900 s; its quiet period is 15 s when Sudoku's difficulty-v3 has nothing scheduled (the idle declaration below) and
45 s otherwise; timed requests stay sequential, one locked invocation at a time on this machine and four workers per
request row.

**The lock helper** is `tools\ig-proto\lock\ig-lock.ps1` (T11h of the v4 pack). Dot-sourced at the repository root in
the same PowerShell 7 process, `Invoke-IgNode -Repo pentomino -Task <label> -NodeArgs <args> [-LimitSeconds <s>]
[-IdleQuietSeconds 15]` runs `node <args>` once both `$env:TEMP\dv3-sudoku.lock` and `$env:TEMP\dv3-timing.lock` have
been absent for the quiet period, holds `dv3-timing.lock`, kills the process tree at `-LimitSeconds` (default 300, at
most 900), throws on a non-zero exit and prints `IG <label> exit=<code> seconds=<s> quiet=<q>`. Sudoku's difficulty-v3
keeps priority.

**The idle declaration.** Only the owner knows difficulty-v3's schedule. When he states that it has nothing scheduled
until a time T, at most 24 h ahead, the orchestrator writes `$env:TEMP\dv3-idle.json` with the command of the v4 pack
§3.2 (`format 'dv3-idle'`, `version 1`, `setAt`, `idleUntil`, `setBy`, `source`) and deletes it when the owner says
difficulty-v3 is scheduled again. Nobody else writes it, and no task, test or check creates it, `dv3-sudoku-seen.txt`
or a lock file in the real `$env:TEMP`. Any missing, expired, unreadable or contradicted declaration fails closed to
45 s.

- **Unlocked** (no rating, search, uniqueness count, generation request or replay): `npm run check`; `firewall.mjs`;
  `lib\tree.mjs build` and `check-edits`; the `--frozen` and `--items` self-test groups; `manifest.mjs`, `verdicts.mjs`,
  `fit-read.mjs`, `fit-prior-s3.mjs`, `freeze.mjs`, `live-deadline.mjs`, `p7-probe.mjs report`,
  `v4-check.mjs receipt|accept|check-binding`; dry runs.
- **Locked verification** (real work that is not a benchmark; D-V4-15): the default and `--v4` self-test groups and
  the P7 equality runs, each in its own helper invocation with the default limit of 300 s (a gate that needs more is
  split into parts, each with its own `$Id` suffix, or resumes by its own items, never run unlocked); it needs no
  benchmark allocation and its helper seconds are reported apart. Self-test cases are always run through §3.1's case
  selection block (`$Locked = $true`), never with a typed `--only` index.

- **Locked measurements** (benchmark allocation): the plans, under the runner, which calls the helper for each locked
  step with `-LimitSeconds 900 -IdleQuietSeconds 15` and a horizon of at most 885 s:

  ```powershell
  $lock = 'tools\ig-proto\lock\ig-lock.ps1'
  pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-<ID>.json -Label frozen -SourceLabel 'frozen 3fc65f4' -DryRun -ApprovedRoundMinutes <run cap>
  pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-<ID>.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <run cap>
  ```

  Every plan is dry-run first and every locked step must be `go`. **`<run cap>`** is the cumulative cap the owner has
  granted less the off-log minutes, rounded up: **747** while the grant is 749 (87.4 off-log seconds; the v4 pack §3.2
  and its ruling of 2026-11-23), and `G - 2` for a later grant `G` while the off-log total stays 87.4 s. A run is
  **started detached** so that the end of the orchestrator's session cannot end it (the orchestrator's `powershell` tool
  with `mode: "async", detach: true`, the command redirecting its output with `*>` to
  `tests\artifacts\ig-proto\frozen\V4-<ID>\run-<n>.log`, `<n>` 1 for the first run and one more per resume), and a
  running runner is never killed. A non-zero exit ends the run: the output and the state files stay as they are and
  are reported; a stopped step is never re-run and no budget is raised without a ruling.
- **The run checks** (SA-Astra's review R21; every `S` task uses these blocks, PowerShell 7 at the repository root):
  - *Before any edit or run* — no runner is active. A matching or unidentifiable relevant runner is a stop, not proof
    of idleness; it is never terminated:

    ```powershell
    $shells = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('pwsh.exe', 'powershell.exe') -and $_.ProcessId -ne $PID })
    $runners = @($shells | Where-Object { $null -ne $_.CommandLine -and $_.CommandLine -match 'run-task\.ps1' })
    $unknown = @($shells | Where-Object { $null -eq $_.CommandLine })
    if ($runners.Count -gt 0 -or $unknown.Count -gt 0) { $runners + $unknown | Format-List ProcessId, ParentProcessId, CommandLine; throw 'a runner is active or cannot be identified: stop and report (never terminate it)' }
    'no runner is active'
    ```

  - *After the detached launch* — record the shell id (and PID) the orchestrator's tool returns; within one minute, that
    process is alive, a `pwsh.exe` process whose command line matches `run-task\.ps1` and the plan's file name exists,
    and the run's own log has started:

    ```powershell
    $Plan = 'V4-<ID>'; $Log = "tests\artifacts\ig-proto\frozen\$Plan\run-<n>.log"   # the S task gives both literally
    $live = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'pwsh.exe' -and $null -ne $_.CommandLine -and $_.CommandLine -match 'run-task\.ps1' -and $_.CommandLine -match [regex]::Escape("$Plan.json") })
    if ($live.Count -lt 1) { throw "no runner of $Plan is alive" }
    if (-not (Test-Path $Log) -or (Get-Item $Log).Length -eq 0) { throw "the log $Log has not started" }
    "runner of $Plan alive (PID $($live.ProcessId -join ', ')); log started"
    ```

  - *After the first completed locked invocation* (its row is appended only when the invocation ends,
    `run-task.ps1:142-149`): the first row of `tests\artifacts\ig-proto\frozen\V4-<ID>\invocations.jsonl` written by
    this run has `quietS` 15 or 45 and `horizonS` at most 885, checked separately.
- **After an owner-authorized closure** (SA-Astra's review R21, verbatim): "After an owner-authorized closure, publish
  every done shard first, write the closure with the exact owner reason, and resume only the remaining unlocked
  selection/finalization suffix. For S4 that suffix is `prerequisites,firewall-snapshot,trees,verdict-input,verdicts,
  resolve-comparators,firewall-check`, excluding any already immutable completed step. This suffix presupposes that all
  mandatory proof bindings passed; otherwise route the proof stop first, without inventing a passing selection. No row
  or default incomplete-shard publish step is selected after closure. Dry-run that exact selection first. If an
  immutable selection/final artifact already exists, stop for the named ruling rather than overwrite it."
  The closure route is `V4-S4`'s only: `close --collection initial` reads and writes `V4-S4`'s activation and closure
  (`manifest.mjs:1941-1946,2027-2077`). Both finalization suffixes (S06, S07) also presuppose that every arm
  `verdict-input` reads is published with its tree identity (`manifest.mjs:2593-2595`); otherwise the measured stop is
  reported and the SAs rule jointly, with no fake runs file and no harness edit inside D-V4-20's window. A stop of
  `V4-S4C`'s comparator collection follows S07 step 7 (SA-Astra's review R2-08), never a comparator closure.
- **The approval re-read** (D-V4-02, the v4 pack §3.4): before each plan runs, `node tools\ig-proto\manifest.mjs approval
  --plan V4-<ID> --label frozen --source-label 'frozen 3fc65f4'` prints `roundCountedSBeforeApproval` (the logs only)
  and `requestedAdditionalGuardS`; the **cap on the account** is `ceil((roundCountedSBeforeApproval + 87.4 +
  requestedAdditionalGuardS) / 60)` counted minutes and must not exceed the grant in force; otherwise the orchestrator
  asks the owner for a raise first. The guard of a plan is `planGuardS` of its required locked steps (1.25 x their
  counted seconds).
- **Resuming a stopped plan** (the v4 pack §3.2, rulings of 2026-11-17 and 2026-11-23): only after the ruling its stop
  needs, with the stopped run's parameters and `-Only` = `prerequisites,firewall-snapshot,trees,` followed by the
  stopped step and every later step (built from the plan file with the v4 pack's PowerShell block), never a complete
  step (a done locked step, a passing receipt, an existing binding, a `publish-<arm>` step once a verdict manifest lists
  its runs files, a `verdict-input` step once a decided selection binds its manifest, `resolve-comparators` once
  `V4-S4C` started); after a closure, no row step of the closed collection; the same `-Only` is dry-run first. The
  approval re-read of a resumed plan compares the grant with the account plus the guard of the steps still to run
  (`planGuardS` of the steps from the stopped one, the v4 pack §3.2's `node --input-type=module` line). A step killed
  from outside needs its own ruling (archived in place as `<step>-a1`, the killed invocation joins the account off-log).
- **A receipt that cannot pass for want of evidence the observation does not hold** (`incomplete`, no correctness
  failure) is not run again; the plan resumes after it only by a ruling that names the missing proof in a named item
  (the v4 pack's ruling of 2026-11-23 on `receipt-fr-p5`, N-V4-21).
- **The global guards** (every task, at its end; each prints nothing):
  - G1: `git diff --stat 57ef5cf -- core generator tests/fixtures`
  - G2: `git diff --stat --diff-filter=MDR 57ef5cf -- tools/ig-proto/data tools/ig-proto/plans tools/ig-proto/variants docs/improve-generating`
    (no file that existed at the base is modified, deleted or renamed under the frozen data, the compiled plans and
    item manifests, the variants and every record of `docs/improve-generating/`)
  - G3: `git status --short` lists only the paths of the task's Scope (Create and Change); git-ignored raw files under
    `tests/artifacts/` do not show.

| Command | When | Expected | Time limit |
|---|---|---|---|
| `npm run check` | end of every task | `check-conventions: OK`, `check-site: OK`, exit 0 | 2 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | every harness task | one `ok <variant>: <n> edits match` line per variant, no error | 3 min |
| `node tools\ig-proto\firewall.mjs snapshot --task S24-<ID> --label frozen` at the start, `node tools\ig-proto\firewall.mjs check --task S24-<ID> --label frozen` at the end | every harness task | `firewall: OK, <n> production files unchanged since the snapshot of S24-<ID>`, exit 0 | 1 min |
| `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --current v4 --label frozen --source-label "frozen 3fc65f4"` | every task that adds a variant | `binding: pass` (the `v4` chain did not move) | 2 min |
| the global guards G1, G2, G3 | end of every task | as above | 1 min |

### 3.3 Process

- The developer **does not commit**, **never edits `tasks/`** (this pack included), `docs/improve-generating/plan.md`,
  `docs/improve-generating-stages-2-4/plan.md`, any `clarifications.md`, the SAs' folders or any record under
  `docs/improve-generating/evidence/` that an earlier run wrote, and runs only read-only git commands (`git status`,
  `git diff`, `git show`, `git log`); the harness code runs no git (the README's one exception is
  `phase1/p6-bench.ps1`).
- One commit per accepted task, made by the orchestrator: `improve-generating-stages-2-4 <ID>: <title>` with the
  session's trailers. Nothing is pushed unless the owner asks.
- **Records are written once** (the v4 pack §3.3): a receipt that passed, a binding, the freeze record, an activation, a
  closure, a decided selection and a final verdict are never rewritten; a correction is a new file with a suffix (`-r2`)
  under its own task id. Raw journals under `tests/artifacts/ig-proto/frozen/` (git-ignored) are kept until phase 0 is
  decided.
- **The candidate epoch** (plan §4.3, D-S24-19): T08a's four trees are a candidate epoch that `V4-S3P`'s bindings prove;
  if T11 rejects it, every observation, receipt and binding stays, and a plan is never resumed after its identity
  changed. **The recipe-identity rule of plan §4.3, in full** (SA-Astra's review R17, verbatim): "The four reserved
  names are compiled references, not an exemption from D-V4-05. A parameter-only refit may retain them only with a
  distinctly versioned effective configuration, new tree/parameter identities and fresh proof tasks; earlier
  observations, receipts and bindings remain immutable. A result-changing code edit for the same parameters requires a
  new variant identity. Every replay-relevant change must be distinguishable by the stored experimental recipe
  identity, not merely hashes outside that recipe. If the existing compiled references cannot express the replacement,
  stop for a joint SA ruling on the versioned variant/plan mapping. Do not recompile historical plans, silently rename
  their references, overwrite a binding or reuse an observed namespace. Additional measured scope needs the owner's
  approval." (The tree's `versions` store the algo, prior and screen ids, not the budget or deadline id,
  `variants/v4.json:33-40,61-69`: a budget-only refit therefore needs a recipe-visible version, not only new hashes.)
  The joint SA ruling is under the owner's delegation. Once the freeze records the trees, the four variants and their
  chains do not change until the final verdict (`V4-LIVE`'s binding names `current: ['fr-frozen', 'fr-frozen-none']`;
  `V4-S4P`'s the four).
- **The harness window** (D-V4-20): no edit of `tools/ig-proto/lib/`, `tools/ig-proto/data/` or a top-level `.mjs` or
  `.ps1` of `tools/ig-proto/` while a plan runs, and none from `V4-S4`'s `verdicts` step until `V4-S4C`'s final verdict
  is written. Every harness task of this pack precedes S06.
- **No production change in progress** during a plan run (D-V4-11): no task of this pack edits `core/` or `generator/`.
- **Stops and questions.** The developer stops and reports at every stop point of its task, and sends `QUESTION:` to the
  pack author (through the orchestrator) when the task looks wrong or contradicts the code, an ambiguity changes
  behaviour or a contract, a gate fails for a reason the task does not cover, a change is needed outside the scope, or a
  recorded decision would change. A slow cell, a low completion or a losing candidate is a measurement, never a stop.

### 3.4 Stop points that need the owner (relayed by the orchestrator on Discord)

| When | What the owner decides | Facts given |
|---|---|---|
| S01 (before `V4-S2B`) | nothing new: approved on 2026-11-23 (D-S24-26); the orchestrator re-reads the approval and asks only if the cap on the account exceeds the grant in force | the approval line; the account |
| S02 (before `V4-P7`) | nothing new: up to 20 counted minutes approved (D-S24-28; the runner's task cap is 1.25 x the plan's allocation, 20 minutes for three composites); asked only if the re-read exceeds the grant | the approval line; the composites measured |
| S03 (before `V4-S3P`) | **the four proofs' cap** (71.20 / 89.00 formal; 20.0-22.0 proxy); the 20 Hell 1 rows are approved (D-S24-27; 67.69 / 84.61) | the approval line (both parts), the account |
| T11 (the read gate) | only when the SAs' reading needs a new measured scope (priced under a new task and manifest) or would change one of his recorded decisions | the SAs' note and the priced proposal |
| S04 (before `V4-LIVE`) | **its cap** (35.12 / 43.91 formal; 4-5 proxy) | the approval line, the account |
| S05 (the activation, two steps, the v4 pack's R4-07) | **first** S4-6 (the paired factor on the five failing cells, 58.00 / 72.50 formal; recommended no) and the authorization of the data-only `activate`; **then** S06's allowance; no locked step before the second answer | the universe's prices and the go checks below; then the activation's printout |
| S06 (before `V4-S4`) | **the raise** of the cumulative cap (`approval --plan V4-S4`: minimum about 1,726 to 1,737 at the timing-proxy spend; 8 to 9 hours of runs; formal 1,185.49 / 1,481.86) | the approval line, the account, the proxy beside the guard |
| When a collection stops at its recorded ceiling | whether it is closed with its missing rows listed (T11e's `close`, only on his instruction); its done shards are published first (`arm.mjs publish --done-only`, T01a) | the published and the missing rows |
| S07 (before `V4-S4C`) | **its scope** (`approval --plan V4-S4C`; formal 585.62 / 732.02; a raise only if its minimum exceeds the grant then active) | the approval line, the account |
| T16 | phase 0's result (N-V4-06) and what follows | the stage-4 report |
| Whenever a shorter quiet is wanted | whether difficulty-v3 has nothing scheduled, and until when (at most 24 h) | his own schedule; without an answer the quiet stays 45 s |

**The go of `activate`** (the v4 pack §3.4, ruling of 2026-11-17): before relaying the owner's authorization as a go,
the orchestrator checks and reports (1) the five-seed pilots of `24x24-hell-1` and `14x14-hell-1` are published (`5 of
5` each, the v4 pack's count command); (2) `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` and the four
variants exist and `V4-LIVE`'s live-deadline binding is accepted; (3) neither `tools/ig-proto/data/frozen-round-v1.json`
nor `tools/ig-proto/plans/V4-S4.universe.json` changed since T11g's manifest (`git log --oneline c802fae..HEAD -- <both>`
and `git status --short -- <both>` print nothing); (4) the freeze file's classes name exactly the comparator cells of
the collection, each once (T12b checks it; `activate` refuses otherwise and writes nothing).

## 4. Decisions of this pack (pack author)

| ID | Decision | Reason |
|---|---|---|
| D-P24-01 | **Variant names and composition.** `p5-mode` (extends `v4`; edits `fz-1`, `fz-2`) and `ps-levels` (extends `v4-ps`; edits `fz-3`, `fz-4`) are T06b's; `live` (extends `v4-link`; edits `lv-1` to `lv-9` of T07a, `lv-10` to `lv-19` of T07b; params `{ "liveDeadline": null }`) is T07a's and T07b's; `fr-frozen` extends `["fr-base", "v4-ps", "v4-p5", "live", "p5-mode", "ps-levels"]` with no edit of its own, `fr-frozen-none` and `fr-frozen-uncapped` extend `fr-frozen`, `fr-frozen-none-uncapped` extends `fr-frozen-none`, each with parameters only (T08a). Test-only: `live-test` (T07b, used by T07c), `fr-frozen-live-test`, `fr-frozen-none-live-test`, `fr-frozen-nowindow-test` (T08c). P7: `p7-c1` extends `base`, `p7-c1r5` extends `p7-c1`, `p7-c1r5c5` extends `p7-c1r5` (T03d, T04, T05a) | plan §4.3 ("one edit set, four parameter sets"; the composition), §4.4, §4.5; D-V4-05; an edit cannot target a copy-only file (§3.1), so the budget by mode is applied in the copy's dispatch through the call's `igBudget` |
| D-P24-02 | **The frozen parameters** (T08a), exactly: `fr-frozen` `paramFiles` `{ "prior": "data/prior-s3-v1.json" }` and `params` `{ "priorTable": "prior-s3-v1", "screenTable": "screen-s3-v1", "screenClasses": { "hell-1": null, "n-small": null, "n-mid": 190000000, "n-large": 190000000 }, "rerate": "rescue", "rerateMax": 4, "c4": false, "callBudget": { "id": "budget-s3-v1", "any": { "nightmare": 10000000000, "hell-1": 40000000000 }, "require": { "nightmare": 32000000000, "hell-1": 40000000000 } }, "setAttemptsBound": 4, "liveDeadline": { "id": "deadline-s3-v1", "levels": ["nightmare", "hell-1"], "reserve": 0.6, "setStageCapMs": 46000, "generationStopMs": 115000, "responseBoundMs": 120000, "hostMarginMs": 1000 }, "perSetLevels": ["hell-1"] }`; `fr-frozen-none` `{ "screenTable": "screen-s3-none", "screenClasses": { "hell-1": null, "n-small": null, "n-mid": null, "n-large": null } }`; the two uncapped twins `{ "callBudget": null, "setAttemptsBound": null, "liveDeadline": null }` | plan §4.1, §4.2, §4.3; D-S24-09 to D-S24-14, D-S24-23; the table ids of the budget and the deadline sit inside the parameters the twins differ by, so the twins differ only in `callBudget`, `setAttemptsBound` and `liveDeadline` (`data/frozen-round-v1.json` `comparatorDifferences`) |
| D-P24-03 | **The plan writer.** `manifest.mjs write-plan --plan <V4-S2B | V4-S3P | V4-P7>` builds the plan with T11c's exported functions and writes `tools/ig-proto/plans/<id>.json` (and its item manifests) once, `generatedBy` `manifest.mjs write-plan`; an existing file is refused; `compile` is never run (N-V4-02) | plan §4.6 |
| D-P24-04 | **New stop reasons.** The set stage cut by the reserve returns `{ status: 'failed', reason: 'reserve-cut', failures }` (a bench row's `partialReason` `set:reserve-cut`); the host's hard bound (T07b, started at the request origin before the set call) ends a set phase at once with `{ status: 'failed', reason: 'response-bound', failures: {} }` (`partialReason` `set:response-bound`) and a batch phase at once with the client's prefix snapshot `igPrefix()`, `{ status: 'partial', reason: 'response-bound', accepted, made, seenLayouts, seenClues, pack }` (the batch's own prefix, provenance and seen histories, the pack assembled from the same parts as the batch's own and validated at once; `partialReason` `response-bound`), never awaiting the batch, its tasks or its pack assembly after the bound; the generation stop at 115 s keeps today's `time-limit` | plan §4.5 ("its own failure reason"); SA-Astra's reviews R09 and R2-02 |
| D-P24-05 | **P7's spike.** Reference `base`; candidates `p7-c1`, `p7-c1r5`, `p7-c1r5c5`, at most these three composites; equality of the complete `DeductionResult` (or of the thrown error's name, `code`, message and details) on the tiers of T03a (`quick` in every kernel task, `full` once per composite in T05b), the declared memory-boundary fixtures included (T03a); the kernel inputs are built by the fixed input constructor `instr` (rule `kernel-window-v1`, catalogue `tools/ig-proto/data/boards-v1.json`), never by the reference or a candidate, outside every timed interval (T03a; SA-Astra's review R2-01); every verdict checks the declaration against the corpus recomputed from its sources (`P7_COUNTS`: quick 30 + 112 + 7, full 30 + 676 + 7, timing 90), the run's producer and the item log's protocol (`resumePlan`), and every binding requires the run's `experiment.json`, `state.json` and `items.jsonl` and the nine corpus inputs, each exactly once, and rechecks the report's complete input index (T03b, T03c; R2-04, R3-01); a candidate that is not equal on every item is dropped and leaves the reference (a dropped candidate is a valid task result, T03d to T05b); timing on `V4-P7`: 90 paired items per composite (T10a's 30 subsets x 3 rounds), one rating per tree per item, the order alternating by round; a rating whose deduction path is capped (`IncompleteRatingError`, RES-04) is timed like any other, and a pair is equal only when both outcomes and both errors' `counters` are (T03a step 10, `capped`; R-P24-06); `timeVerdict` is `measured` only for the complete declared 90 unique items, each with a structurally valid completed outcome, `outcome: 'ok'`, `same: true` and finite positive `refMs`/`candMs`, otherwise incomplete or failed with the missing, error, censored and differing ids, and no ratio is computed from a subset; **`go = quickEqual && fullEqual && timing.verdict === 'measured' && timing.notSame.length === 0 && timing.ratio >= 1.04`**, where both equality verdicts are bound to the timed candidate and reference identities and the declared corpus and coverage (checked before timing and again in the report), recorded here before the measurement | plan v4 P7; report §3; D-S24-15, D-S24-22, D-S24-28; SA-Astra's review R07, R22.4; review 2 R2-01, R2-04; review 3 R3-01; R-P24-06 |
| D-P24-06 | **The verification ids** of this pack: self-test runs `S24-<task>` (a second group of the same task adds a suffix, for example `S24-T07c-items`); P7 equality runs `V4-P7E-<candidate>-<tier>`; the live verification of S04 `V4-LIVE-verify`; scratch runs of a developer `S24-<task>-dev` (never read by a record) | §3.1 (historical namespaces) |
| D-P24-07 | **The fitting reader** `fit-read.mjs` (T02b, T02c, T02d) reads exactly the plan's declared rows (`fitScope`), checks each row's declared identity before `ingestRow` (`declaredRowProblem`) and, for the prefixes, its raw shard declaration and row identity against the publication's metadata (`rawIdentityProblems`: every identity field required, a duplicate shard entry or row header a problem; kept apart from the ledger), reports every missing, invalid, ambiguous or misidentified member as a warning with its reason, binds its inputs, and serves S01 (controls preview and call prefixes against 10 G) and T11 (call prefixes against the Hell 1 budgets and the four same-side no-window attempts); its records go to `docs/improve-generating/evidence/frozen/<task>/fit-read-<command>-<arm>.json` and `.md`, written once per task and arm | plan §4.6, §8.2 T02 and T11; SA-Astra's review R03; review 2 R2-03; review 3 R3-02; the S01 reading's W3 (R-P24-05) |
| D-P24-08 | **`freeze.mjs`** holds the freeze's classes, bounds, table ids and values as constants (T08b) and writes the record once with its validated transitive fit index (the indices, their scripts and T11's two scripts) and the captured harness sources, each a normalized text capture (CRLF, UTF-8 without BOM) of `57ef5cf:<path>` checked by `sha256Lf` and written once by the developer's read-only git, never by the harness (T12a, T12b); the constants equal plan §4.1 and §4.2 | plan §4.2; SA-Astra's review R18; review 2 R2-07 |
| D-P24-09 | **The case selection** of every self-test gate is by name (§3.1's block, `--list` of T01b), never a typed index; the live verification selects the exported `LIVE_CASES` (fifteen, T09a) | SA-Astra's review R20 |
| D-P24-10 | **The live verification's identity** is a separate record `self-test/identity.json` written by every self-test run (T09a); the receipt (T09b) and the acceptance (T09c) each validate its format, version and fields and check it against the freeze, the test derivatives and the rows' raw shard identities; each test derivative must be its frozen parent with `w8` and its test deadline only, checked on the captured `ig-tree.json` (`twinDerivationProblems`), even when its recorded tree id equals the captured one; the acceptance requires the receipt's complete evidence index | SA-Astra's review R12, R13, R14; review 2 R2-06 |
| D-P24-11 | **P7's pure helpers** live in `tools/ig-proto/lib/p7-core.mjs` (re-exported by `p7-probe.mjs`) so that the lane worker keeps importing only Node built-ins and label-free `lib/` modules (`lib/lane-worker.mjs:12-16` at the base; the case `frozen: worker modules do not read the label`, `self-test.mjs:620-630`), never the command's graph (a worker's `process.argv[1]` is its own file, Node v26.13.0, `bt-worker-argv.mjs`); the memory fixtures are synthetic boards (no valid product input reaches 32 MiB) | T03a; SA-Astra's review R05, R06 |

## 5. Decisions register (binding, with sources)

### 5.1 The owner and the plan author (inherited)

| ID | Decision | Source |
|---|---|---|
| IG-P-D1 (IG-P-Q02) | One end-to-end request deadline: a 115-s generation stop inside a hard 120-s response bound, with a reserved batch share fitted as a pilot parameter; work caps first, the clock as backstop; a cut response returns the puzzles accepted so far; lost completions counted against the uncapped search | owner, 2026-11-15; plan v4 §3 P5, §7 |
| IG-P-D3 (OD-P6) | The level is the score band, the centre rule and AR1; the population reported two-sided; (c4) measured; a blind play comparison before any phase-3 offer | owner, 2026-11-15 |
| IG-P-D4 (OD-P7) | No screen by default on Nightmare boards of up to 144 cells | owner, 2026-11-15 |
| IG-P-D6 (OD-P9) | Hell 2 and Hell 3 closed for this feature; 24x24 and 14x14 Hell 1 get request-level arms as candidate populations | owner, 2026-11-15 |
| IG-P-D7 (OD-P10) | A separately priced, staged frozen-round manifest; each plan approved at its turn | owner, 2026-11-15 |
| IG-P-Q25, IG-P-Q27 | Fitting seeds and validation seeds apart; P4's table prior from the measured shares of IG-P-Q27's sources; no refit on validation seeds | plan author; plan v4 §5.1, §5.2 |
| IG-P-Q37 | The work condition of rule (c5) on proved bounds (D-V4-17) | plan author, `288669b` |
| Owner, 2026-11-17 21:33 | The lock rules: 900-s invocations, 15-s quiet when idle else 45 s, timed requests sequential at four workers (§3.2) | the owner's form answers; the v4 pack §5 |
| Owner, 2026-11-18 05:59 | The frozen round's cumulative cap is 749 counted minutes; `V4-LIVE`, `V4-S4` and `V4-S4C` are asked at their turn | the v4 pack §1, §5 |
| Owner, 2026-11-23 09:25 | `V4-S2` resumes as the ruling of 2026-11-23 says; runs pass 747 (87.4 off-log seconds) | the v4 pack §5 |
| Owner, 2026-11-23 12:54 | "Continue doing all the work until it is finished" (this feature's request) | `docs/improve-generating-stages-2-4/request.md` |
| Owner, 2026-11-23 15:29 | Delegation: the two SAs decide jointly what would have gone to the supervisor; owner approvals remain; a joint decision changing his recorded decision needs his confirmation | Discord message 1574341211701907457 |
| Owner, 2026-11-23 16:30 | Q-S24-3 to Q-S24-7 all (a): D-S24-25 to D-S24-29 | Discord message 1574356572102991934; `ff9adcf` |

### 5.2 The inherited pack (`tasks/improve-generating-v4/check-list.md` §4 and §5, `0edc636`)

| ID | Decision (binding here) |
|---|---|
| D-V4-01 | The frozen source is `3fc65f4`; with `--label frozen` the harness verifies the snapshot and builds its trees under `tests/artifacts/ig-proto/tree-frozen/` |
| D-V4-02 | The `frozen` label's round cap is 0: every locked frozen step needs `-ApprovedRoundMinutes`; the cap is cumulative; each approval states the counted seconds spent, the additional guard and the cap; invocation records are never deleted |
| D-V4-03 | `selectCluesV4` serves Nightmare and Hell 1 targets (53 to 111); every other target runs the frozen search |
| D-V4-04 | One subset-ordinal sequence; a `gen-v4` record's skip bounds are 2,192 and 64 |
| D-V4-05 | Each tree has its algo id `gen-v4-proto:<variant>` and the table versions `priorTable`, `screenTable`; a variant whose results change for the same parameters gets a new id; ids at most 40 characters |
| D-V4-06 | The frozen event kinds and phases; the journal keeps the prototype's phase names |
| D-V4-08 | The post-hoc reserve table is a diagnostic; the live deadline (N-V4-13) and its accepted binding are prerequisites of stage 4 and phase 0; validation runs with the frozen P5 policy and the live deadline |
| D-V4-09 | The per-set prior is the calibration's window count, sent as `igPrior` when the calibration matches the batch |
| D-V4-11 | No frozen-round plan starts, resumes or runs while a production change is in progress |
| D-V4-12 | Developers run read-only git; the harness runs none |
| D-V4-13 | Pilot reps 0-4, validation reps 20-39, Master identity reps 20-24, second validation 40-59; row limits 260 s, 130 s only for the stage-4 groups of arms with the live deadline; resample seed 20261116 |
| D-V4-14 | Every frozen measurement runs as items of `lib/items.mjs` with an identity; an ended item is never rerun; a started item without an end needs a ruling |
| D-V4-15 | Real rating, generation, uniqueness or replay work runs through the lock helper; synthetic tests run unlocked; verification needs no allocation |
| D-V4-16 | Completion and the deadline are apart: a request that holds ten puzzles completes whatever its time; a response after 120 s is a deadline violation, reported apart and enforced by the live-deadline receipt |
| D-V4-17 | Rule (c5)'s work condition on proved bounds (begin lines, `lo` and `hi` per call; `work-unknown` otherwise) |
| D-V4-18 | Typed receipts (`ig-v4-proof` version 1) checked by `proofCheck` against an expectation built apart from the receipt; accepted bindings (`ig-v4-accepted`), written once, compare today's trees for the `current` arms only; evidence is an index of immutable inputs; historical namespaces never reused; a projection never satisfies the live-deadline prerequisite |
| D-V4-19 | Plans in order (`V4-S2`, `V4-LIVE` compiled; `V4-S4` at the activation; `V4-S4C` from the final selection); every locked step `repeatUntilDone` with its state and `minHorizonS`; every mandatory proof `--require-pass` and accepted before use; a plan refuses at `check-prerequisites` while a prerequisite is missing; each step priced alone (`units x 945` ceiling) |
| D-V4-20 | Stage 4 measures one declared collection at a time (`activate` once, `close` only on the owner's instruction, comparators only from a final selection); no harness edit from `V4-S4`'s `verdicts` step to `V4-S4C`'s final verdict |
| Ruling 2026-11-23 (`V4-S2` stopped in `parity-fr-base`) | A step killed from outside is archived in place and observed again under its own id; the killed invocation joins the account off-log (87.4 s in all); runs pass 747; plans start so that the session's end cannot end them |
| Ruling 2026-11-23 (`receipt-fr-p5`) | An `incomplete` receipt for want of evidence the observation cannot give is not re-run; the plan resumes past it only by a ruling naming the missing proof (N-V4-21) |

### 5.3 This feature's decisions (`docs/improve-generating-stages-2-4/plan.md` §5, final at `57ef5cf`)

| ID | Decision | Decided by | Source |
|---|---|---|---|
| D-S24-01 | Stage order: stage 2, then P7's scoped spike and C5, then the freeze, then stage 4; stage 3 freezes `W_screen` and its classes, the priors, any ranker, P5's budget table and bounded-attempt policy, the reserve and deadline | plan v4 §5.1 | `c3ef770` |
| D-S24-02 | Fitting and validation seeds as in plan §4.7; no refit after the validation seeds run; a failed class falls back to no screen | plan v4; D-V4-13 | `c3ef770`; `0edc636` |
| D-S24-03 | The admission statistics, phase 0's completion gate (18 of 20, no dead end), the no-regression bound 0.9, Master identity, Hell 1 reported, as plan v4 §5.2 | plan v4 §5.2 | `c3ef770` |
| D-S24-04 | One request deadline (115-s stop, 120-s response), work caps first, the accepted prefix returned, lost completions counted against the uncapped search | owner (IG-P-D1) | `c3ef770` |
| D-S24-05 | No screen by default on Nightmare up to 144 cells | owner (IG-P-D4) | `c3ef770` |
| D-S24-06 | (c4) only if it costs less than 10 % of T10 | plan v4 P3 | `c3ef770` |
| D-S24-07 | The run rules of §3.2 | owner; pack author; plan author | `0edc636` |
| D-S24-08 | The grant is 749 counted minutes; `V4-LIVE`, `V4-S4`, `V4-S4C` asked at their turn | owner | `0edc636` |
| D-S24-09 | Classes and `W_screen`: `n-small` none; `n-mid` 196-256, `n-upper` 257-324, `n-large` 360+ at 190 M; `hell-1` none; 145-195 and 325-359 unlisted | SAs | `c159ab4` |
| D-S24-10 | `prior-s3-v1`: Nightmare unchanged; Hell 1 from the seed-balanced pilot window share on four boards and PM1's windows on eight | SAs | `c159ab4` |
| D-S24-11 | The per-set prior on Hell 1 only | SAs | `c159ab4` |
| D-S24-12 | No (c4), no bracket close, the rescue kept (`rerateMax` 4), no ranker | SAs | `c159ab4` |
| D-S24-13 | P5 `any` budgets 10 G (Nightmare) and 40 G (Hell 1); four same-side attempts; budget stops never counted | SAs | `c159ab4` |
| D-S24-14 | The reserve: 0.6 of the deadline for the batch (a 46-s set-stage cap); 115-s stop; 120-s response | SAs | `c159ab4` |
| D-S24-15 | P7's spike before the freeze (C1 on R4, then R5, then C5; at most three composites; complete equality and the memory rule; go at x1.04); no `fewestColumn` buckets, no R4 cache | SAs; plan v4 §5.1 | `c159ab4` |
| D-S24-16 | `V4-S2B` and `V4-S3P` belong to the pack; `V4-S2B` approved (D-S24-26); `V4-S3P`'s proofs asked at their gate; `V4-S4P` still runs in `V4-S4` | SAs | `c159ab4`; `ff9adcf` |
| D-S24-17 | N-V4-18 is not implemented | SAs; owner | `ff9adcf` |
| D-S24-18 | No remedy for N-V4-14 in this round; a later one is a new proposal with the owner's approval of any machine time | SAs (delegation) | `c159ab4` |
| D-S24-19 | Task order: the live composition before the variants that extend it; the four trees a candidate epoch before `V4-S3P`; `accept` extended by the receipt's typed kind (no `--kind` flag); the per-cell class and `W` check | SAs | `c159ab4` |
| D-S24-20 | Formal prices are the approval basis; timing proxies stand beside them, never as caps; caps are minimum quotes, not replacement grants | SAs | `c159ab4` |
| D-S24-21 | P4's Hell 1 table completed at the stage-3 fit from IG-P-Q27's sources; V4-S2 stays valid evidence of its configuration | SAs (delegation) | `8ca5bc2` |
| D-S24-22 | P7's spike before the freeze; the four frozen arms keep the reference kernel; no P7 speed credit in this round | SAs (delegation) | `8ca5bc2` |
| D-S24-23 | `require` budgets 32 G (Nightmare) and 40 G (Hell 1) per selection call; the four final arms pass their real parity and replay proofs; N-V4-15 stays open | SAs (delegation) | `8ca5bc2`; `ff9adcf` |
| D-S24-24 | The Hell 1 check before the freeze: the four P-1 passes, then 20 `fr-frozen-none-uncapped` requests on 14x14, 20x20, 24x24 and 26x26 Hell 1, reps 0-4, in `V4-S3P`, read through T11's gate; no 14x14 Nightmare rows, no `V4-S2F` by default | SAs (delegation) | `8ca5bc2`; `ff9adcf` |
| D-S24-25 | Q-S24-3 (a): a finite `require` limit per selection call, 32 G and 40 G, one rule for both modes; the proofs of the four final arms show a `require` request completing under it | owner | `ff9adcf` |
| D-S24-26 | Q-S24-4 (a): `V4-S2B` approved (40 rows, 22.59 / 28.24, inside the 749) | owner | `ff9adcf` |
| D-S24-27 | Q-S24-5 (a): the 20-request uncapped Hell 1 check approved (67.69 / 84.61, inside the 749, read through T11's gate); no further paired run or replacement epoch pre-authorized; the four proofs asked at their gate | owner | `ff9adcf` |
| D-S24-28 | Q-S24-6 (a): up to 20 counted minutes for `V4-P7` (at most three composites; 15.50 / 19.37) | owner | `ff9adcf` |
| D-S24-29 | Q-S24-7 (a): N-V4-18 not implemented; stage 4 keeps both identical arms' rows on the seven boards fixed without a screen | owner | `ff9adcf` |

### 5.4 Rulings on developer questions (pack author)

| ID | Date | Task, question | Ruling | Changed in the pack |
|---|---|---|---|---|
| R-P24-01 | 2026-11-23 | T01a, QUESTION 1 (Dev-Sonnet, agent 3993e5d4): `publishPlan` as written judged the shards in name order, so in the default mode `pilot-b` (not done) refused before `pilot-c` (partial), against the Tests row (`incomplete publication fr/pilot-c: a ruling is required` in both modes) | Option A, the developer's default: a partial publication refuses the command first, in both modes, before any other shard is judged (the first partial shard in name order is named); the default mode's not-done refusal applies only when no publication is partial. This is the contract the task already stated (the doc comment "a partial publication always refuses it", review R01's "a partial one is refused", the Tests row); Step 1's code contradicted it. No other test, refusal text or output changes | T01a Step 1 (`publishPlan` and its doc comment, a note after the code), the Tests row's Expected (the precedence stated) |
| R-P24-02 | 2026-11-23 | T02a, QUESTION 1 (Dev-Sonnet, agent f6899ad0): step 4 puts `write-plan` in `main`'s unknown-command text, which the existing case `activate: the inputs are checked` checks (`self-test.mjs:6843` at `83c78c1`), outside the Scope's one appended case; and the deviation: the dry run's horizons are 885 s for five row steps, then 762, 640 and 481 s, not 885 s for all eight | Option (a): that one assertion takes the new text, `... price, approval, write-plan)`, and the label `an unknown command lists the nine`; the case's name stays. The horizons are correct: the dry run adds each locked step's forecast to the plan's counted total, so the plan's own guard (1.25 x 23 min = 1,725 s; `lib/budget.mjs:85-90`) sets them, not the round's 747; the run computes each horizon from the seconds actually counted, and `arm.mjs run` starts a row only when its 260-s limit fits (`arm.mjs:177`), so no row is cut; a budget stop needs a counted total near 1,398 s while rows remain (formal 22.59 min, timing proxy 16 to 20). The pack's expected texts were wrong; no price, scope or approval changes. `V4-S3P` (S03, allocation 139 min) keeps 885 s on every step | T02a Scope, step 4, the Tests table (the existing case's row), the dry-run gate; S01 step 3 |
| R-P24-03 | 2026-11-23 | T02b, the details the developer (Dev-Sonnet, agent 0392a3de) reported as left open, no QUESTION | Accepted, no fix round. (1) The firewall snapshot was taken after the harness edits: no effect here, since it covers production files and G1 shows none changed; the gates' order stands for later tasks. (2) `fitScope` refuses a matching step without `--cases` (`fit-read: the step <id> of <arm> has no --cases`) and a reversed range (`fit-read: bad --cases entry <entry>`), as `arm.mjs`'s `parseCases` refuses `bad --cases range` (`arm.mjs:39-41`); a single-rep entry such as `x:3`, which `parseCases` accepts, stays refused by step 2's pattern, and the pack's plans use `<cell>:0-4` only. (3) `callPrefixes`'s row problem `invalid start line <index>` is `rowLedger`'s, in the same words (`verdicts.mjs:719`). (4) `boundFirings` reads only the `set`-stage calls (step 5) and does not fire when an attempt has two calls; `rowLedger` then reports `unmatched set attempt <a>` for that attempt's link line (one ended call per attempt, `verdicts.mjs:822-837`), so such a row is never clear. (5) `declaredRowProblem` of a row that is not an object returns `wrong declared identity (row <JSON>, declared <JSON rowKey>)`, step 3's format. (6) The `invalid units` variant on a minimal call tests the same rule as on `c1`. T02c amendment: since `rowLedger` and `callPrefixes` report an unowned line and an invalid start line in the same words, a prefixes row lists each reason once | T02c step 4 (the row's `problems`), its Tests row (scenario (2): listed once) |
| R-P24-04 | 2026-11-24 | T02c, the details the developer (Dev-Sonnet, agent 62d90955) reported as left open, no QUESTION, and its stated gaps (synthetic fixtures only; the `.md` wording untested) | Accepted, no fix round. (1) A missing `--budget` is refused `needs --budget`. (2) A level given twice is `bad --budget <value>`. (3) The preview's top-level `problems` (an unreadable runs file, a file without rows, a row that is not an object), its `.md` section and its count in the printed line follow "missing or invalid evidence is a warning". (4) A missing, unreadable or run-less MP12b1 report puts its reason on every pair of the cell (`<problem>; <reason>` after an earlier problem). (5) The raw `state.json` is in `inputs`, as step 2 requires of every file read. (6) The `unreadable <rel path>` identity problems come after the declared-row problem and before `rawIdentityProblems`' output. (7) `maxSpent` is null for a row without a call (never zero work). (8) The README section was inserted before `## Phase-1 bench of P6 (V4-T14)` at that heading's moved line. (9) `summary.unexpected` includes the raw `.row.jsonl` keys, as step 4's "published or raw row keys" says. The gap is closed by a check on real records: the two commands on `V4-S2`'s `fr-none` records through their `io` seam under the scratch id `V4-SX` (`docs/improve-generating-stages-2-4/evidence/sa-opus/bt-t02c-real.mjs` and its two `.md` records): 8 cells, 0 problems, stage 2's preview reproduced (26x26 Nightmare's lower bound 0.881); 40 rows, 821 calls (the count of `s2-calls.md`), 0 missing, 0 incomplete, 0 ambiguous, 0 affected at 10 G and 40 G, 0 firings of the bound 4; 40 identity problems, each the scratch id's `the shard declaration is of V4-S2/fr-none/<shard>` | S01 step 7 (run once, after completion or the SAs' ruling; the counts of a complete run; the check's result) |
| R-P24-05 | 2026-11-24 | The S01 reading (`docs/improve-generating-stages-2-4/s01-reading.md`), SA-Astra's review finding 2: `prefixesCommand` reads each shard's `<shard>.runs.md` through `publicationOf` (`arm.mjs:254-263`) without `addInput` (`fit-read.mjs:728-740` at `dd38457`), so S01's prefixes record indexes 334 files and none of the eight `.runs.md` | A defect of T02c's `prefixes` input binding against T02c step 2 ("every file read is added once to `inputs`"), which T02c's Tests row did not catch (it listed no `.runs.md`). S01's two records stay as written; SA-Astra's `evidence/sa-astra/s01-review-checks.json`, field `publicationInputs`, binds the eight files (the reading's W3, joint decision (a) under the owner's delegation). Repair before the next prefixes record (T11's on `V4-S3P`): the new task T02d (0.5 h, after S01; T11 depends on it), and T12a's `FIT_INDICES` and `FIT_INPUTS` bind the supplement into the freeze. The same ruling records the joint text of the reading's S06 sentence (W1, W2) | T02d (new); T11 (Depends on); T12a step 1 (`FIT_INDICES`, `FIT_INPUTS`); S06 step 2 (the sentence of the reading's section 6); §1 index (36 tasks, 69 h), §2.1, D-P24-07, §6.2 |
| R-P24-06 | 2026-11-24 | T03a, the details the developer (Dev-Sonnet, agent 218e44b2) reported as left open, its named items and gaps; above all, the `p7-time` item of `26x26-hell-1` subset 0 (base against base, a locked scratch smoke run) ended `a rating threw`: both trees threw `IncompleteRatingError` ("the deduction path was capped") | **Fix round on T03a.** A capped rating is the frozen engine's normal outcome for an unrateable clue subset (RES-04, `difficulty.js:63-79` and `:316-322` of the frozen source), and the generator charges its work and goes on (`clues.js:323-344`): its time is real kernel work. The timing corpus (T10a's 30 subsets, D-P24-05) holds such Hell 1 subsets, so counting the pair as an item error would leave every `V4-P7` timing `incomplete`, and no composite could be a go. T03a step 10 now records a pair whose two ratings each returned or threw `IncompleteRatingError` as `{ outcome: 'ok', refMs, candMs, same, capped }`, where `same` compares the outcomes and the errors' `counters`; any other thrown error stays an item error. A locked `--v4` case `p7: timing items of base against base` commits the `p7-time` path: 10x10 rounds 0 and 1 give `capped: 'none'`, 26x26 Hell 1 `capped: 'both'`. T03b's `timeVerdict` reports `capped`, never as a problem. The developer's six deviations are accepted: (1) `horizonS: elapsedS() + 285` and the label `selftest`, as in the other `--v4` cases; (2) a memory item's `extraBytes` built in a fresh main workspace (list bytes are a function of the model); (3) `refBytes` null and `extraBytes` 0 on the sequence and capacity items (T03b reads the fixtures' manifest values for their steps); (4) the reference's canonical run reused for the `canonical` step (deterministic); (5) the extra assertions of the `--items` case (149, 713 and 90 items, the first and last ids, 123 screen settings); (6) `pm4.mjs` imported by `p7-probe.mjs` only (the lane worker imports `p7-core.mjs`, D-P24-11). The scratch smoke rating ran under the lock helper on base against base: locked verification without allocation (D-V4-15), accepted; later smoke checks are committed cases, as the new `--v4` case is. Subset 9's `no-subset` is outside the corpus, which uses subsets 0-5. `differing`, `representation`, `listBytes`, `mem-ref` and `mem-fast` are exercised by T03d's memory case and the candidates' equality runs | T03a step 10, Scope, Tests (the new `--v4` case), the gate's `$Required`, T03a-T02, Documentation; T03b step 7 and its timing Tests row; D-P24-05 |
| R-P24-07 | 2026-11-24 | T03b, the details the developer (Dev-Sonnet, agent 309b6a23) reported as left open, no QUESTION | Accepted, no fix round; T03c builds on them unchanged. (1) `items`, `ended` and `equal` are counts (step 6: "with no declaration every count is 0"); the id lists stay arrays. (2) `coverage.memory` holds `{ fixture, refBytes, listBytes, representation, expected, ok }` per fixture, sequence step and capacity step, a null representation matching `model-too-large`, as step 6 says. (3) A `budget` entry is `{ id, setting, refBytes, listBytes, wsBytes, memoryBytes, capacityBytes }`, and a `lists` step with a missing or non-finite number is a break, which fails closed. (4) `declared.corpusVersion` is the declaration's `corpus.version`: the corpus of `expectedCorpus` has no version, and T03c's binding compares it with `P7_CORPUS_VERSION`. `timeVerdict`'s `declared` also carries `rounds`. (5) `timeVerdict` lists no `duplicates` or `unexpected`: `runProblems`' `resumePlan` check makes such a log `incomplete` with its reason (step 7 names neither list). (6) `readRun` reports `unreadable <file>` for a file that exists but does not parse, and `no declaration` or `no state` only when the file is absent; `runProblems` then adds `no declaration` for a null declaration, so the verdict is `incomplete` either way. `declareRun`, `expectedCorpus` and `readRun` are first exercised on real trees and files by T03d's quick equality run and its `report`; any fault there fails closed as a named problem of an `incomplete` verdict, which is T03d's stop point | none (accepted as delivered) |

## 6. Named items

### 6.1 Open for later packs (inherited and of the plan)

| ID | Description | Numbers | Routed to |
|---|---|---|---|
| N-V4-01 | Browser calibration (IG-P-Q23) | unpriced browser parts | the owner, when he asks |
| N-V4-04 | Stage 5 and the second validation (`V4-S4X`, `V4-S4XC`) | unpriced | owner approval per item |
| N-V4-05 (phase 1) | P7's production adoption of a passing composite, with its own equality, fixture, test and memory gates (D-S24-22) | S02's spike report | phase-1 pack after phase 0 |
| N-V4-07 | Phase 2: `gen-v4` in production from the frozen configuration (the budget and deadline tables part of `gen-v4`'s definition; the production `W_screen` from the class verdicts with `freeze.json`'s bounds; `require` keeps the frozen budget until N-V4-15 measures it), with the frozen round's validation repeated on the production code | plan §4.9 | pack after N-V4-06 passes |
| N-V4-08 to N-V4-11 | Offers, the blind play comparison, the service level, phase 4 | plan v4 §6 | later; owner decisions |
| N-V4-14 | A tighter bound or relaxation for 257+ cells | `report.md` §1.4 | a new proposal only if wanted (D-S24-18) |
| N-V4-15 | `require` on the Generator's largest boards | the frozen `require` budget 32 G / 40 G | the production pack (N-V4-07) |

### 6.2 Found during this pack (filled as the tasks are accepted)

| ID | Description | Numbers | Routed to |
|---|---|---|---|
| N-P24-01 | A transient `EPERM, Permission denied` on `docs/improve-generating/evidence/frozen/V4-T11d-selftest` failed the existing `--items` case `receipt: a passing receipt is written once` once during T02c's gate re-run; the case passed alone and the group re-ran clean; the empty untracked folder stays | 1 of 3 runs on 2026-11-24 | watch; act only if it recurs (R-P24-04) |
| N-P24-02 | `fit-read.mjs prefixes` omitted the `<shard>.runs.md` files that `publicationOf` reads from its `inputs` (the S01 reading's W3) | 8 files missing from S01's 334-entry index; bound by SA-Astra's supplementary `publicationInputs` | T02d (the fix, before T11); T12a (the supplement in the freeze's fit index); R-P24-05 |
| | | | |

## 7. Summary (filled by the orchestrator)

| ID | Start | End | Duration | AI credits | Commit |
|---|---|---|---|---|---|
| T01a | 2026-11-23 23:16 | 2026-11-23 23:28 | 12 min | 70.37 | this task's commit |
| T01b | 2026-11-23 23:28 | 2026-11-23 23:31 | 5 min | 26.09 | this task's commit |
| T02a | 2026-11-23 23:32 | 2026-11-23 23:47 | 15 min | 83.86 | this task's commit |
| T02b | 2026-11-23 23:47 | 2026-11-23 23:57 | 11 min | 53.20 | this task's commit |
| T02c | 2026-11-23 23:57 | 2026-11-24 00:13 | 16 min | 112.29 | this task's commit |
| S01 | 2026-11-24 00:13 | 2026-11-24 01:05 | about 57 min (run 14 min) | – (orchestrator run; SA reading in the SA agents) | this task's commit |
| T02d | 2026-11-24 01:05 | 2026-11-24 01:09 | 5 min | 28.98 | this task's commit |
| T03a | 2026-11-24 01:09 | 2026-11-24 01:35 | 26 min | 224.15 | this task's commit |
| T03b | 2026-11-24 01:35 | 2026-11-24 01:46 | 12 min | 129.64 | this task's commit |
| T03c | | | | | |
| T03d | | | | | |
| T04 | | | | | |
| T05a | | | | | |
| T05b | | | | | |
| S02 | | | | | |
| T06a | | | | | |
| T06b | | | | | |
| T07a | | | | | |
| T07b | | | | | |
| T07c | | | | | |
| T08a | | | | | |
| T08b | | | | | |
| T08c | | | | | |
| T09a | | | | | |
| T09b | | | | | |
| T09c | | | | | |
| T10 | | | | | |
| S03 | | | | | |
| T11 | | | | | |
| T12a | | | | | |
| T12b | | | | | |
| S04 | | | | | |
| S05 | | | | | |
| S06 | | | | | |
| S07 | | | | | |
| T16 | | | | | |
