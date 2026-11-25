# Phase 2: the parallel execution plan (SA-Opus, pack author), revision 2

| Item | Value |
|---|---|
| Status | Revision 2, after SA-Astra's `tasks/improve-generating-phase-2/review-2.md` (R2-03 and §8). The binding text is `tasks/improve-generating-phase-2/check-list.md` §1 (lanes and start conditions) and §3.7 (parallel execution); this note explains it |
| Base | `gen-v4` at `97a6326` plus the pack commit |
| Owner's decision | D-P2-17: Discord `1575100035077771386`, 2026-11-25 17:45:12 +07:00, verbatim: "cho phép chạy song song, hãy tối ưu để tăng tốc độ" ("parallel running is allowed; optimize to increase speed") |
| What it overrides | "One task per repository at a time", for this pack's developer tasks P2-01 to P2-17 |
| What stays | Every locked or timed run goes one at a time through `tools\ig-proto\lock\ig-lock.ps1`, with its 45-s quiet period. Stages A and B, the 812-minute ledger and D-P2-15's staging are unchanged. No idle declaration exists, and no saving is claimed from one |
| Evidence | `E/sa-opus/p2-parallel-plan.mjs` and its output `E/sa-opus/p2-parallel-plan.md`, where `E` is `docs/improve-generating-phase-2/evidence/`. The script is unlocked and starts no engine |

Command: `node docs\improve-generating-phase-2\evidence\sa-opus\p2-parallel-plan.mjs`.

## 1. Summary

- **How it runs.**
  - At most **three developers** at once, one per lane: S (the selector), C (the client and the records) and T (the
    measurement tooling). A lane takes its next ready task in check-list §1's order. When it has none, it takes the
    ready join or other-lane task with the longest remaining path (the `Tail h` column of the model's first table); on
    a tie, the first in check-list §1's order.
  - Each task has its own worktree slot (`Q:\git\pentomino-p2-w1` to `-w5`) and short branch `p2/<ID>`, made from the
    current `gen-v4` head. Five slots let a lane start its next task while the previous one merges.
  - The orchestrator merges one task at a time: commit in the slot, rebase onto `gen-v4`, the merge gate in the slot,
    then a fast-forward. When several are ready together, the order is lane C, then S, then T. A fix to an unmerged
    task is amended into its candidate commit, then rebased and gated again (check-list §3.7).
  - `check-list.md` bookkeeping, SA rulings and review evidence are written only in the main worktree.
- **Expected time: a scenario, not a delivery promise (§4).** About **8 to 11 elapsed hours** for the developer
  phase, against about **22 to 31** with one task at a time. The developer hours do not change with parallelism: 85.75
  in all (85.25 in the 34 development tasks, plus P2-22's half hour). The longest path is 24 estimated hours.
- **The machine part does not change (§5).** The timed rows of stages A and B run one invocation at a time under the
  lock, after every development task is merged.
- **What review 2 changed.**
  - Three new lane-T tasks: P2-13v (the binding verifiers, at the pack commit), P2-13e (the driver's source and row
    binding, after P2-13d and P2-13v) and P2-13f (the glue and reach readings, after P2-13c).
  - Four producer prerequisites, which are not same-file conflicts: P2-12b now holds the common proof runner that
    P2-12e uses; P2-16c starts after P2-12d, whose copies carry the context tags its seams need; P2-16e's unit test
    uses its own fixture page, not P2-16b's future page; P2-16a writes gate 2 of `gates.md` and P2-18 runs it.

## 2. The lanes and the start conditions

The tables are those of `E/sa-opus/p2-parallel-plan.md`, which the script checks against the start conditions.

| Lane | Tasks, in order (starts when merged) |
|---|---|
| S | P2-01 (the pack commit); P2-02 (P2-01); P2-04 (P2-02, P2-03); P2-05a (P2-04); P2-05b (P2-05a); P2-14a (P2-01) |
| C | P2-06 (P2-01); P2-07 (P2-06); P2-08 (P2-07); P2-10 (P2-06); P2-11a (P2-10); P2-11b (P2-11a); P2-09 (P2-08, P2-11b); P2-12a (P2-06) |
| T | P2-03, P2-13r, P2-13v and P2-16e (the pack commit); P2-13a (P2-13r); P2-13d (P2-13a); P2-13e (P2-13d, P2-13v); P2-13b (P2-13e); P2-13c (P2-13b); P2-13f (P2-13c) |
| Joins | P2-12b (P2-05b, P2-11b, P2-13r); P2-12d (P2-12b, P2-08); P2-12c and P2-12e (P2-12d); P2-14b (P2-12b); P2-15 (P2-09, P2-12a, P2-12b, P2-14a); P2-16c (P2-12d, P2-09); P2-16b (P2-09, P2-11b, P2-16e); P2-16a (P2-15, P2-13a); P2-17 (P2-15, P2-12c, P2-12e, P2-13f, P2-14b, P2-16b, P2-16c) |

The longest path is P2-01, P2-02, P2-04, P2-05a, P2-05b, P2-12b, P2-12d, P2-12e or P2-16c, P2-17: 24 estimated hours.
Lane T's own chain (P2-13r to P2-13f, then P2-17) is 21 estimated hours.

## 3. Why the concurrent tasks are independent

**Shared code or a produced input forces an order.** These start conditions exist because a task changes the same
function, line or helper as another, or needs a file or context field that another produces:

- **P2-09 after P2-11b:** both change `generator/jobs.js` and the controller test's `fakeClient`.
- **P2-07 and P2-10 after P2-06:** P2-06 writes the client's single import from `../engine/gen-v4.js`, and the
  `generateSet` loop both build on.
- **P2-08 after P2-07:** the same import line in `core/engine/generate.js`.
- **P2-12b after P2-05b and P2-11b:** the copies anchor on their final lines.
- **P2-12d after P2-08:** the trace anchors on the final `generate.js`.
- **P2-12c and P2-12e after P2-12d:** they run on the traced copies, through P2-12b's runner (review-2 R2-03).
- **P2-16c after P2-12d:** its seams read `ctx.igStage` and `ctx.igAttempt`, which only the traced and linked copies
  have, and its raw-side check reads the trace (R2-03).
- **P2-15 after every production task:** it switches the route and `ALGO_ID` together.
- **Lane T in order:** P2-13a, P2-13d, P2-13e, P2-13b, P2-13c and P2-13f all change `p2.mjs` and `p2.test.mjs`.
  P2-13e also needs P2-13v's `binding.mjs`.

**Tasks that may run together and share a file** edit separated regions only. The script lists 42 such entries:
`docs/design-detail.md` sections, `tools/bench/report.js` lines 38, 43 and 46, `core/browser/generation-client.js`
regions, test-file places, `tools/bench/runner.js` functions, and the two developer guides' paragraphs. Check-list
§3.7's table fixes each region, with the copies' link anchors kept byte for byte. An overlap not in that table forces an
order. Git merges edits separated by at least one unchanged line, and rejects abutting edits and two appends at a
file's end; the placements avoid both.

**Behaviour.** The route stays off until P2-15. Every production task before it changes nothing a user sees, and its
tests pass on today's search. The tooling tasks use synthetic inputs, import only what exists on their base, and read
the frozen formats of `contracts.md` (C1 to C16).

## 4. Expected time (a scenario, not a delivery promise)

The model's assumptions are in the script's header. In short:

- a task's agent time is r times its estimate, with r 0.15 or 0.25;
- every locked run waits its 45-s quiet period and holds the lock, first come first served;
- the full suite runs only at the four full-suite points (P2-02, P2-06, P2-15, P2-16a);
- merges are serial, with the merge gate's locked run;
- there are no fix rounds, no question waits and no Sudoku runs.

| r | Developers | Elapsed h | Lock busy |
|---:|---|---:|---:|
| 0.15 | 1, one task at a time | 22.5 | 24 % |
| 0.15 | 3, lanes S, C and T | 8.3 | 66 % |
| 0.25 | 1, one task at a time | 31.0 | 18 % |
| 0.25 | 3, lanes S, C and T | 10.8 | 51 % |

**Reading.** Three lanes cut the elapsed time by a factor of about 2.7 to 2.9. The lock is busy 51 to 66 % of the
time, so a fourth developer would mostly wait for it; the joins, not the lanes, then set the pace. The figures depend
on the multiplier r and on the assumed test durations. Questions, fix rounds and Sudoku's runs add to both columns
alike, so these are scenarios, not an independently established delivery time (review-2 §8).

## 5. The machine part (P2-18 to P2-20)

- **Timed rows never run at the same time.** Two rows at once on one machine would change each other's timings, and
  the lock forbids it. Stage A (410 counted minutes) and stage B (402) are invocations in series, each with its 45-s
  quiet period.
- **What may overlap.**
  - While stage A runs, the SAs prepare the readout's structure and their reading scripts on the frozen rows and on
    P2-13b's synthetic fixtures. The readout itself follows P2-19's step 4 (publish and report), as P2-19 orders. This
    shortens the pause between the stages to the reading itself.
  - While stage B runs, the SAs draft the parts of P2-21's report that depend only on stage A's committed records. The
    stage-B numbers wait for P2-20's snapshot.
  - During a locked run, SA scripts only read files: no engine and no test run (those take the lock, check-list §3.3).
  - No development task overlaps the stages: P2-18 starts when every development task is merged.
- **A shorter quiet period** needs an idle declaration from the owner. None exists. If the owner later states that
  Sudoku's difficulty-v3 has nothing scheduled, the pack author rules first (check-list §3.3). The ledger counts 45 s
  per invocation either way (check-list §3.5), so the approved minutes do not change.

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A rebase conflict | the fixed placements of check-list §3.7; a conflict is aborted and goes to the pack author as a `QUESTION:`; the orchestrator never resolves one |
| Two tasks pass alone but fail together | the merge gate on the rebased branch: the focused gate, G-COPIES and the phase-2 test files present; a failure is a fix round, amended into the task's candidate commit, and the pack author decides which task fixes it |
| A produced input missing on a task's base | the start conditions name every producer (review-2 R2-03); lane-T tasks read only the frozen contracts and use synthetic adapters |
| A copy anchor broken by a later task | G-COPIES in every merge gate from P2-12b's merge on; the placement rules keep the link, trace and uncapped anchors byte for byte |
| Lock contention slows the developers | focused gates; the full suite only at four points; the lock serializes and the model includes the waits |
| Review load | at most three developers; one merge at a time |
| Shared bookkeeping | only the orchestrator edits `check-list.md`, in the main worktree; no task lists it in `$Allowed` |

## 7. The stage plan within the approval (R1)

Review-1's R1 found that a separate smoke group and serial replay runs would cost 829 minutes, not the approved 812.
The pack keeps the approved schedule unchanged: no group 0; the smoke gate inside group 1 (its 8 smoke rows, then its 3
`require` rows); and the replay probes as one invocation. Stage A stays at 330.656 counted and 409.195 guard minutes,
within 410; stage B at 321.258 and 401.572, within 402 (check-list §3.5). Review 2 confirmed it and changes no row,
invocation or minute.
