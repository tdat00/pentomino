# Review 1 of the stages 2 to 4 task pack: the pack author's response

| Field | Value |
|---|---|
| Review | `tasks/improve-generating-stages-2-4/review-1.md` (SA-Astra; 22 findings: 10 P1, 11 P2, 1 P3) |
| Response | SA-Opus, pack author, 2026-11-23 |
| Pack | `tasks/improve-generating-stages-2-4/`, base `57ef5cf`, branch `improve-generating`; frozen source `3fc65f4` |
| Result | 22 findings applied: 19 as written, 3 with a stated adaptation (R06, R09, R15); none rejected |
| Owner or supervisor | no question: no finding changes an allowance, a scope, an owner decision or plan v4 |

## Summary

- All 22 findings are accepted and applied. Where the review gives exact text, the task carries it verbatim: R03's
  warning and gate sentence, R06's main-work rule and declaration contract, R07's go rule, R09's host contract, R10's
  assertion, R11's case, R12's row rule, R13's verification contract, R14's command cases, R15's (B) and (C) texts,
  R16's transport text, R17's recipe-identity rule, R18's record contract, R19's refusal text, R20's selection rule,
  R21's run checks and closure route, and R22's four corrections.
- Three adaptations keep the finding's requirement and change only a mechanism or a task id; each is explained below
  with its evidence.
- Five tasks grew past about three developer hours and were split. The index now has 34 tasks and 64.5 developer hours
  (it had 30 and 49.5). The machine minutes are unchanged: S01 to S07 formal 1,983.21 / 2,479.01 counted minutes, the
  guard chain ending at 2,651.343 on the account. S02 now also states 0 minutes for R08's branch with no eligible
  composite.
- The owner stops are unchanged: S01 (approved, D-S24-26; re-read), S02 (approved up to 20 minutes, D-S24-28;
  re-read), S03 (the proofs' cap), S04 (its cap), S05 (S4-6 and `activate`), S06 (the raise), S07 (its scope), T11
  (only for a new measured scope or a recorded-decision change) and T16 (phase 0's result).

## Per finding

| ID | Priority | Status | Where now | What was done |
|---|---|---|---|---|
| R01 | P1 | applied | T01a (1.5 to 3 h) | `arm.mjs publish --done-only` publishes every done shard and names the others; both modes keep a complete existing publication byte for byte, refuse a partial one and refuse a producer other than the measuring one (`publicationOf`, `publishPlan`, `publishCommand`) |
| R02 | P1 | applied | T01b (1 to 2 h) | the guard is a regex literal that cannot match its own source; its samples live in `tools/ig-proto/data/git-guard-cases.json` (`GIT_GUARD_CASES`), outside the scan; the exception list is `GIT_EXCEPTION` |
| R03 | P1 | applied | T02b, T02c (new), S01, T11, T12a | `fitScope` reads only the declared, uniquely published, valid rows paired with today's valid run of the same seed; every other member is a warning with its reason; `callPrefixes` marks malformed journals ambiguous; S01 carries the warning text; T11 cannot choose (A) from a mere total |
| R04 | P1 | applied | T03c (the old T03b) | the call-local live-row lists are built after the views and counted against the worker's budget (`igListBytes`, `igRepresentation`), with a memory case |
| R05 | P2 | applied | T03a, T03b | five fixtures computed with the frozen engine around 32 MiB (`mem-small`, `mem-mid`, `mem-near-lists`, `mem-near-reference`, `mem-above`) in `tools/ig-proto/data/p7-memory-fixtures.json`; the memory coverage is part of the verdict |
| R06 | P2 | applied, adapted | T03a, T03b (new) | main work = `search.work` - census work (the 107/100 test gives limits 3, 6, 7); screen settings from the Map's keys; `experiment.json` written before the first dispatch, `checkDeclaration` on resume, the report reads only the declaration; the six requested tests. Adaptation 1 below |
| R07 | P1 | applied | T03b, T05b, S02 | `goDecision` is `go` only when both tiers are equal on the timed tree, the timing verdict is `measured`, no pair differs and the ratio is at least 1.04; `time` and `bind` refuse a candidate without bound equality reports |
| R08 | P2 | applied | T03c, T04, T05a, T05b, S02 | a dropped candidate follows the pack author's ruling; with no eligible composite T05b writes no plan and S02 writes the report only, at 0 minutes |
| R09 | P1 | applied, adapted | T07b (2 to 3 h), T07c | one bound starts at the request origin before the set call (`igBoundStart`), covers both phases and is cleared on every path; the set phase ends at once with `set:response-bound`; the batch phase waits for the client's real cancelled result, relabelled `response-bound`; the synthetic no-pack race is removed. Adaptation 2 below |
| R10 | P2 | applied | T07c, T08c, T09a, S04 | `same(lengths, { 1: 3, 2: 6, 4: 10, 8: 10 }, ...)` with the statuses and `want.slice(0, length)`; the end times are printed in the case's `NOTE` line; the calibration is pinned to level `hard`; `hostBoundCase` and the factory run on both bounded twins; `LIVE_CASES` has fifteen names and S04 selects them |
| R11 | P2 | applied | T08c, check-list §2 | the case `fz: W reaches real calls in every frozen class` as specified; T08b's pure check stays; the traceability row names both checks |
| R12 | P1 | applied | T09a (new) | the row rule verbatim in `rowChecks` (`ingestRow`, the ten declared keys once, `igSetMs` in [0, 48000] for a completed set, a set-stage failure within 48,000 ms, closed journals); the counterexamples are fourteen table variants; the clean reserve cut is at 46,000 ms |
| R13 | P1 | applied | T09a, T09b, T09c (new) | every self-test run writes `self-test/identity.json` (producer, frozen commit and digest, group, selected names, tree ids and parameter hashes); the receipt and `liveExpectation` validate it independently; the acceptance requires the complete evidence index (`liveRequiredEvidence`); the six requested tests |
| R14 | P2 | applied | T02c, T09b, T09c | `live-deadline: CLI receipt`, `live-deadline: CLI receipt and accept` (through `v4-check main` with `V4-LIVE`'s argument shape) and `fit-read: command refusals`, in private namespaces under `tests/artifacts/ig-proto/selftest/S24-<task>-dev/`, through `io` seams (`liveLayout`, the fit reader's folders) |
| R15 | P1 | applied, adapted | T11 | the (B) and (C) texts verbatim, the stop points with them. Adaptation 3 below |
| R16 | P2 | applied | T11 | the transport text verbatim; the scripts write `t11-transport-inputs.json` and `t11-projection-inputs.json` |
| R17 | P1 | applied | check-list §3.3, T12b | the recipe-identity rule verbatim for a replacement epoch |
| R18 | P2 | applied | T12a, T12b (new) | `FIT_INDICES`, `FIT_INPUTS`, `FIT_CAPTURE`, `FIT_SEEDS_USED` and `fitIndex` (`sha256Lf` interpreted as the SHA-256 of the text with CRLF replaced by LF; a capture for a harness source the pack edits; a validation rep refused); T12b captures with `git show 57ef5cf:<path>` and refuses a changed or missing input before writing either file |
| R19 | P2 | applied | T02a, T05b, T10 | one oracle: `manifest: unknown written plan <id>`; the usage text lists the supported plans |
| R20 | P2 | applied | T01b, check-list §3.1, every gate | `--list` moved from T07c to T01b; §3.1's selection block selects by name, refuses a missing or duplicate name and compares the PASS names; each task gives its literal name array; S04 uses `LIVE_CASES`; no placeholder remains |
| R21 | P2 | applied | check-list §3.2, S01 to S07 | the `Get-CimInstance Win32_Process` pre-check, the post-launch check, the first completed invocation (`run-task.ps1:142-149`) and the closure route verbatim; S07 has its own `New-Item` and detached `run-task.ps1` command with `G - 2` and its own stop path |
| R22 | P3 | applied | T06a, T01b, T10, check-list D-P24-05 | "four files"; "all files selected by the guard's scan"; the `DURATION_LOGS` text (`manifest.mjs:839-840,967-969`); `code` in the error equality |

## Adaptations

1. **R06, where the shared helpers live.** The review's text has the worker import `limitsFor` and `outcomeOf` from
   `../p7-probe.mjs`. They live in `tools/ig-proto/lib/p7-core.mjs`, re-exported by `p7-probe.mjs` and imported by the
   lane worker. Reason: `lib/lane-worker.mjs:12-16` imports only Node built-ins and label-free `lib/` modules, the rule
   of the case `frozen: worker modules do not read the label` (`self-test.mjs:620-630` at `57ef5cf`); importing the
   command would load its whole graph (the label, the lanes, the records) in every lane thread. The behaviour the
   review asks for is unchanged. Correction of my own earlier rationale: a worker's `process.argv[1]` is its own file
   (Node v26.13.0, `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-worker-argv.mjs`), so the main-guard
   re-entry I first gave as the reason does not happen; T03a and D-P24-11 now give the import-graph reason.
2. **R09, where the identity checks run.** The bench's run record exposes no puzzle ids or recipe entries, so the
   checks of unchanged common-slot ids, one recipe entry per accepted candidate, the assembled pack, the response
   time, the cancellation and a late acceptance run at the client level, through T07b's exported `igBoundStart`, in
   T07c's case `live <variant>: the host bound waits for the assembled prefix`. T07b's host case covers the set and
   batch phases, the response time, the runner's pack validation and that no task stays held. Every item of R09's test
   list is covered by one of the two cases, on both bounded twins.
3. **R15, a task id.** The quoted sentence names T12; T12 is now T12a and T12b (R18's split), so T11 keeps the quote
   and states that the rule binds T12a, which T12b follows.

## Index changes

| Before | After | Reason |
|---|---|---|
| T01a 1.5 h | T01a 3 h | R01 |
| T01b 1 h, no machine | T01b 2 h, locked verification only | R02, R20 (`--list`), R22 |
| T02b 3 h | T02b 3 h (the pure core) + T02c 2.5 h (the commands) | R03, R14 |
| T03a 3 h | T03a 3 h (items and fixtures) + T03b 3 h (commands, declaration, verdicts, go) | R05, R06, R07 |
| T03b 3 h (C1) | T03c 3 h (C1), depends on T03b | R04, R08 |
| T07b 2 h | T07b 3 h | R09 |
| T09a 3 h (receipt), T09b 2 h (accept) | T09a 3 h (identity and checks), T09b 3 h (receipt), T09c 2.5 h (accept) | R12, R13, R14 |
| T12 2.5 h | T12a 2.5 h (fit index) + T12b 2.5 h (record) | R18 |
| 30 tasks, 49.5 h | 34 tasks, 64.5 h | |

Dependencies: S01 after T02c; T03c after T03b; T04 after T03c; T10 after T09c; T12a after T11's jointly signed
acceptance of the final epoch; T12b after T12a; S04 after T12b, T09a to T09c and T08c. The traceability matrix, the
register (D-P24-01, D-P24-04, D-P24-05, D-P24-07, D-P24-08, new D-P24-09 to D-P24-11) and the summary table follow.

## Verification

Run at the repository root on 2026-11-23, unlocked, no engine run beyond the scratch checks named:

| Command | Result |
|---|---|
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-git-guard.mjs` | four js blocks read from T01b; the JSON equals the eleven samples; the guard does not match itself; every check passed |
| `node --experimental-vm-modules --no-warnings docs\improve-generating-stages-2-4\evidence\sa-opus\bt-variants.mjs --label frozen` and the same with `--draft` | 11 manifests, every check passed (both modes) |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-prior-check.mjs` | all 12 Hell 1 entries reproduced |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-fit-index.mjs --check` | SA-Astra's three indices: 0 missing, 0 changed; `fit-input-index.json` 2,403 entries |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-p7-memory.mjs` (earlier) | the five fixtures' bytes and outcomes in `bt-p7-memory.json` |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-worker-argv.mjs` | a worker's `process.argv[1]` is its own file (Node v26.13.0) |
| `npm run check` | `check-conventions: OK`, `check-site: OK` |

## Note on four files

During the last sweep of task-id references, a faulty bulk replacement of mine swapped one character throughout
`check-list.md`, `S03-run-v4-s3p.md`, `T06a-prior-s3-v1.md` and `T09c-accept-live-deadline.md`. I restored them from
my own recorded edits and checked each restored file against the damaged copy, character for character under the
same swap, before re-applying the intended replacement. The content is the one I meant to deliver; no review text
was lost.
