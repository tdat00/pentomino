# Phase-1 task pack: response to review 1

| Item | Value |
|---|---|
| Author | SA-Astra, pack author |
| Review | SA-Opus, `review-1.md`, R1-1 through R1-11 |
| Base | `eca0f94717a56de43c52f6cb54d739360670fef8`, branch `improve-generating` |
| Disposition | All findings accepted. Revised pack ready for SA-Opus's sign-off; no counter-position or new owner question |

## 1. Changes

| Finding | Disposition and implemented change |
|---|---|
| R1-1 | Accepted. Deleted P1-03a. P1-03b depends on P1-02 and runs literal PowerShell blocks using the existing runner, helper, site tools and Git. No qualification program/API is added. Four locked runs, immutable attempt files and canonical index/summary remain. |
| R1-2 | Accepted. P1-01 is SA-Astra's approximately one-hour task, as plan §8 assigns. It copies the historical audit and applies the review's 26 edits, two deletions and final result line; no reusable stage API, I/O seam or probe suite. The one specified repository-relative writer adaptation is documented below. Both SAs approve the reading. |
| R1-3 | Accepted. P1-02 uses G-STAGE and the shared log check. Only `run.log` and `helper.log` are created for the focused run; no focused index. The developer stops before the one orchestrator-run test. |
| R1-4 | Accepted. P1-05 has one bookkeeping commit, one fast-forward push and one description edit. Full fork SHA is in the PR footer/final report and later phase-2 request, not a self-referencing Git record. Exact initial remote head `826ce79...` is required. |
| R1-5 | Accepted. P1-04's literal PR text includes the metrics change in `docs/design-detail.md` §7.1. |
| R1-6 | Accepted. The client-test claim says accepted puzzles stream in slot order, identical at **one and four workers**, not all supported widths. |
| R1-7 | Accepted. P1-04 reads the actual `bench.cells`, `bench.memory` and qualification fields, uses G-PROTECTED/G-QUALIFIED, and checks its own files with G-FORMAT. No obsolete reader commands remain. |
| R1-8 | Accepted. Five active tasks; P1-03b's suffix retained. Index, dependencies, traceability, roles, estimates, shared guards and execution-summary rows updated. Plan decisions copied without changing them. |
| R1-9 | Accepted. Explicit G-FORMAT covers docs/tasks/logs/bookkeeping and transient publication text; `npm run check` is no longer claimed to cover them. It uses repository `checkText`, requires CRLF and also rejects Markdown hard-break trailing spaces. |
| R1-10 | Accepted. The production guarantee is correctly cited as §8.2, line 2190. |
| R1-11 | Accepted. Every relevant session begins with the shared `.NET` current-directory assignment after `Set-Location`. Relative `.NET` output now resolves inside `Q:\git\pentomino`. |

No phase-1 design decision, runtime scope, fixture, version, machine allowance or owner instruction changes.
The final plan and historical reports remain untouched.

## 2. Small execution safeguards retained

These are inline checks, not replacement machinery or additional measured work:

- **Relative reader output.** After the review's edit list, the writer remains
  `writeFileSync(relative(process.cwd(), join(HERE, name)), ...)` with exclusive `flag: 'wx'`.
  The resulting CRLF reader SHA-256 is
  `9130200bae6301c1a6f7da2f75edcf919377a93379bcacbcb4dc67c10c3c6ecc`.
  The unadapted review result independently reproduces
  `cfd0b9639f36293cf97e898a9d10d5f80ef58c62ba65e4c44a6595e379453137`.
- **Fail-closed native calls.** Added missing exit checks for Git, runtime version/digest and GitHub
  reads. Publication polling permits only a valid lagging head, not an error or changed state.
  Staged files are checked before the bookkeeping commit, as well as after it.
- **Qualified source and raw bytes.** Recheck HEAD/tested files before writing the pass record;
  G-QUALIFIED also verifies the index's raw log/manifest hashes. An LF-only rewrite can be invisible
  to Git's text normalization but must not silently change a raw-byte binding.
- **Exact runtime labels.** Qualification checks each full/fixture log's actual patch version.
  `focused.node` stores the focused log's own version; later Node installation changes cannot
  relabel that observation. P1-04 uses the same field.
- **Owned output and formatting.** Site staging is removed in `finally`, while its output/error is
  retained in the attempt. Publication files are CRLF on disk and LF-normalized only for comparison/hash.
- **Truthful publication bookkeeping.** The one pre-push commit explicitly says publication is
  pending; it does not mark an unperformed remote action complete. Its P1-05 index entry stays
  pending at that commit, with final outcome/fork attested outside Git by the verified PR footer
  and final report. No second commit or push is needed to change a checkbox.

`E/sa-opus/p1-01-edit-proto.mjs` is a read-only task-pack support input, supplied by this review rather
than by the plan-base tree. Include it with the reviewed pack before execution; do not execute or edit
the prototype. Its literal edit data is the only dependency on that new support file.

## 3. Revised execution order and estimates

| Order | Task | Executor | Estimate |
|---|---|---|---|
| 1 | P1-01 Source-bound adoption | SA-Astra; both SAs approve | SA 1 h; no engine run |
| 2 | P1-02 Width-8 fold simulation/spec sentence | Dev-Sonnet; orchestrator runs focused gate | Developer 0.5 h + orchestrator 0.1 h |
| 3 | P1-03b Current qualification | Orchestrator | 0.5 h plus contention; four locked runs |
| 4 | P1-04 Readiness and detailed PR description | Dev-Sonnet drafts; both SAs approve | Developer 1 h plus review |
| 5 | P1-05 Publication, never merge | Orchestrator | 0.3 h |

Developer total **1.5 h**, SA **1 h plus joint reviews**, orchestrator **0.9 h**.
The same five locked invocations remain: 300 s Node + 45 s quiet each, **1,725 s ceiling**, roughly
8-10 min node+quiet expected, not a wall-time promise or new benchmark allocation.

## 4. Validation evidence

Paths below are under `docs/improve-generating-phase-1/evidence/sa-astra/`.

| Evidence | Command | Verified result |
|---|---|---|
| `pack-r1-checks.mjs/.json` | From root: `node docs\improve-generating-phase-1\evidence\sa-astra\pack-r1-checks.mjs` | 219 checks; five tasks, exact decision rows/dependencies/roles/traceability, source anchors and strict format. Exact 26-edit reader copied to an owned ignored scratch folder: first run 70 rows / 35 equal pairs / 14 passing memory side-cells, nine-file closure, 58 inputs; second run refuses, output hashes unchanged. Scratch removed. |
| `pack-r1-dryrun.ps1/.json/.md` | From `Q:\git`: `pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-astra\pack-r1-dryrun.ps1` | 23 PowerShell blocks parse; 78 checks pass, 17 negative cases rejected. Literal log/static-record blocks pass on explicitly copied/renamed old logs and synthetic focused data; all 15 example files pass format checks; 120-file staged site checked and removed. |
| `pack-r1-validation.txt` | Root: `npm run check`; check-list G-FORMAT on the revised authored files; `git --no-pager diff --exit-code eca0f94 -- .` | Final convention/site, explicit text-format and unchanged tracked-file checks; log records the exact results. |

The dry run verifies command behaviour, not phase-1 completion. Its illustrative 531.529-second sum
uses old durations and a synthetic 40.5-second focused value; it is **not new machine time**.
No engine/test invocation, benchmark, commit, push or PR mutation was performed in this review revision.
No canonical P1-01/P1-03b deliverable was created. Original first-draft checks and SA-Opus's review
evidence were preserved rather than rewritten.

## 5. Sign-off

- SA-Astra: accepts R1-1 through R1-11 with the specified execution safeguards; revised pack submitted.
- SA-Opus:
