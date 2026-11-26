# Improve generating, phase 2: task pack (`gen-v4` in production)

| Item | Value |
|---|---|
| Feature | `improve-generating-phase-2` |
| Plan | `docs/improve-generating-phase-2/plan.md`, `Final (2026-11-25, base 7c1bad2)`, committed at `97a6326`; joint `report.md` |
| Repository, branch, base | `Q:\git\pentomino`, `gen-v4` (draft PR #14 into `main`, never merged), `97a6326` |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executors | Dev-Sonnet (`claude-sonnet-5.5`) for every developer task (at most three at once, D-P2-17); the orchestrator for every locked measurement, every commit, rebase and merge, the push and PR #14 (P2-18 to P2-20, P2-22); both SAs for the readouts and the validation report (P2-19, P2-21) |
| Status | Revision 3, answering `review-3.md` (R3-01, R3-02) after `review-2.md` (R2-01 to R2-06 and its §8), for SA-Astra's final acceptance |
| Shared contracts | `contracts.md` (C1 to C16): the trace, row, ledger, publication, activation, trigger, readout, seal, proof, replay-probe and browser formats |

The plan's 17 developer tasks keep their ids. Split to stay within three hours each:

| Plan task | Pack tasks |
|---|---|
| P2-05 | P2-05a, P2-05b |
| P2-11 | P2-11a, P2-11b |
| P2-12 | P2-12a to P2-12e |
| P2-13 | P2-13r, P2-13v, P2-13a, P2-13d, P2-13e, P2-13b, P2-13c, P2-13f |
| P2-14 | P2-14a, P2-14b |
| P2-16 | P2-16a, P2-16b, P2-16c, P2-16e (no P2-16d) |

**Developer total: 85.75 hours.** The round-0 pack had 59; the plan said "about 46". Revision 1 (78.25 h) added the
measurement tooling's contracts (review-1 R2 to R6, R13) and the concrete glue, browser and selector proofs (R7, R11,
R12). Revision 2 adds 7.5 h: review-2's source and row binding, coverage and glue work did not fit the three-hour cap of
the lane-T tasks, so it is in three new tasks, P2-13v (2.5 h), P2-13e (3 h) and P2-13f (2 h). R2-03 moves 0.5 h from
P2-12c to P2-12b. No scope, decision or machine minute changes.

`E` means `docs/improve-generating-phase-2/evidence/`. Developer commands start in the task's own slot (§3.7). Commands
marked "main worktree" run in `Q:\git\pentomino` and are the orchestrator's.

## 1. Index (lanes and start conditions)

A task starts when every task of its "starts when merged" list is merged into `gen-v4`. §3.7 gives the lanes, the
order and the merges.

### Lane S (selector)

- [x] P2-01 `gen-v4.js`: the frozen values, the route, the per-set rule and the family predicate (starts at the pack commit)
- [x] P2-02 Shared clue primitives, the retained `gen-v3` selector and the dispatcher (starts when P2-01 is merged)
- [x] P2-04 `select-v4.js`: the port of the frozen selector, with its two observer events (P2-02, P2-03)
- [x] P2-05a `select-v4.js`: the frozen synthetic vectors (P2-04)
- [x] P2-05b `select-v4.js`: budget stops, no-window events, skips and the frozen parity check (P2-05a)
- [x] P2-14a Replay fixture modes and the refusal check (P2-01)

### Lane C (client and records)

- [x] P2-06 No-window reasons, counters in results and the bounded set stage (P2-01)
- [x] P2-07 The per-set prior: transport and the serial path (P2-06)
- [x] P2-08 Provenance per algorithm family, `made.igPrior`, replay and the saved-steps key (P2-07)
- [x] P2-10 Monotonic request scopes, the set-stage reserve and the pool clock (P2-06)
- [x] P2-11a The response guard and the assembly hooks of the client (P2-10)
- [x] P2-11b The guard in the Generator, the CLI and the bench, with its lifetime rules (P2-11a)
- [x] P2-09 Generation-steps events, texts and notices in English and Vietnamese (P2-08, P2-11b)
- [x] P2-12a Validation telemetry in the bench rows (P2-06)

### Lane T (tooling)

- [x] P2-03 The screen rating with its certificate, composed with P6 (starts at the pack commit)
- [x] P2-13r The trace reader on the frozen work-ledger rules (starts at the pack commit)
- [x] P2-13v The binding verifiers: rows, proofs, replay probes and browser checks (starts at the pack commit)
- [x] P2-16e The browser runner (starts at the pack commit)
- [x] P2-13a The driver: plan, seal, ledger and the locked wrapper (P2-13r)
- [x] P2-13d The driver: rows, resume and publication (P2-13a)
- [x] P2-13e The driver's source and row binding (P2-13d, P2-13v)
- [x] P2-13b The comparator: cohorts, equality and the stage gates (P2-13e)
- [x] P2-13c P5's trigger, coverage and the activation of the twins (P2-13b)
- [x] P2-13f N-V4-16's glue and the reach readings (P2-13c)

### Joins

- [x] P2-12b Measurement copies, their source binding and the common proof runner (P2-05b, P2-11b, P2-13r)
- [x] P2-12d The copies' trace layer (P2-12b, P2-08)
- [x] P2-12c Proof bundles 1 and 2: observers and certificates (P2-12d)
- [x] P2-12e Proof bundles 3 and 4: prior and replay, legacy route (P2-12d)
- [x] P2-14b The replay-resource probes (P2-12b)
- [x] P2-15 The cutover: `gen-v4` live, fixtures re-recorded, living specification (P2-09, P2-12a, P2-12b, P2-14a)
- [x] P2-16c The real no-window glue on a scripted-rating copy (P2-12d, P2-09)
- [x] P2-16b The browser deadline page and its six checks (P2-09, P2-11b, P2-16e)
- [x] P2-16a Integrated worker cases and the pre-seal gate list (P2-15, P2-13a)
- [x] P2-17 Guides, README, tools README and the release-notes text (P2-15, P2-12c, P2-12e, P2-13f, P2-14b, P2-16b, P2-16c)

### After development (serial)

- [x] P2-18 Seal, proof bundles and stage A's first group (locked) (every task above accepted and merged; D-P2-15)
- [ ] P2-19 Stage A groups 2 to 23, the items and the readout (locked) (P2-18)
- [ ] P2-20 Stage B and the conditional twins (locked) (P2-19's committed readout, `contracts.md` C12)
- [ ] P2-21 The validation report (P2-20)
- [ ] P2-22 Publish `gen-v4` and PR #14's description, never merge (P2-21)

### Estimates

| ID | File | Developer h | Lane | Full suite | Machine |
|---|---|---:|---|---|---|
| P2-01 | `P2-01-gen-v4-tables.md` | 2.5 | S | - | locked focused runs |
| P2-02 | `P2-02-clue-primitives.md` | 2 | S | yes (shared primitives) | locked |
| P2-03 | `P2-03-screen-rating.md` | 2.5 | T | - | locked focused runs |
| P2-04 | `P2-04-select-v4-port.md` | 3 | S | - | locked focused runs |
| P2-05a | `P2-05a-select-v4-vectors.md` | 3 | S | - | locked focused runs |
| P2-05b | `P2-05b-select-v4-budget-parity.md` | 2.5 | S | - | locked; one parity run (at most 600 s) |
| P2-14a | `P2-14a-replay-fixture-modes.md` | 1.5 | S | - | locked focused runs |
| P2-06 | `P2-06-reasons-counters-bound.md` | 2.75 | C | yes (result shapes) | locked |
| P2-07 | `P2-07-per-set-prior.md` | 2.5 | C | - | locked focused runs |
| P2-08 | `P2-08-provenance-replay.md` | 2.75 | C | - | locked focused runs |
| P2-10 | `P2-10-request-scopes.md` | 2.5 | C | - | locked focused runs |
| P2-11a | `P2-11a-response-guard.md` | 2 | C | - | locked focused runs |
| P2-11b | `P2-11b-guard-wiring.md` | 2.5 | C | - | locked focused runs |
| P2-09 | `P2-09-steps-texts-notices.md` | 2.75 | C | - | locked focused runs |
| P2-12a | `P2-12a-bench-telemetry.md` | 2 | C | - | locked focused runs |
| P2-13r | `P2-13r-trace-reader.md` | 1.5 | T | - | unlocked synthetic tests |
| P2-13v | `P2-13v-binding-verifiers.md` | 2.5 | T | - | unlocked synthetic tests |
| P2-16e | `P2-16e-browser-runner.md` | 2 | T | - | one locked runner self-check (at most 120 s) |
| P2-13a | `P2-13a-stage-driver.md` | 3 | T | - | unlocked synthetic tests |
| P2-13d | `P2-13d-rows-and-publication.md` | 3 | T | - | unlocked synthetic tests |
| P2-13e | `P2-13e-source-and-row-binding.md` | 3 | T | - | unlocked synthetic tests |
| P2-13b | `P2-13b-comparator.md` | 3 | T | - | unlocked synthetic tests |
| P2-13c | `P2-13c-p5-coverage-twins.md` | 3 | T | - | unlocked synthetic tests |
| P2-13f | `P2-13f-glue-and-reach.md` | 2 | T | - | unlocked synthetic tests |
| P2-12b | `P2-12b-copies.md` | 3 | join | - | unlocked copy checks; locked focused runs |
| P2-12d | `P2-12d-trace-layer.md` | 3 | join | - | locked trace self-check (at most 300 s) |
| P2-12c | `P2-12c-proof-bundles.md` | 2 | join | - | locked rehearsals (at most 120 s each) |
| P2-12e | `P2-12e-proof-bundles-prior-legacy.md` | 2.5 | join | - | locked rehearsals (at most 300 s each) |
| P2-14b | `P2-14b-replay-probes.md` | 2 | join | - | unlocked synthetic tests |
| P2-15 | `P2-15-cutover.md` | 3 | join | yes (cutover) | locked; fixtures and two bounded searches (at most 540 s each) |
| P2-16c | `P2-16c-no-window-glue.md` | 2.5 | join | - | locked glue proof (at most 300 s) |
| P2-16b | `P2-16b-browser-deadline-checks.md` | 3 | join | - | six locked checks (at most 120 s each) |
| P2-16a | `P2-16a-integrated-cases.md` | 2 | join | yes (final integrated gate) | locked |
| P2-17 | `P2-17-guides-and-release-notes.md` | 2.5 | join | - | none (documents) |
| P2-18 | `P2-18-seal-proofs-smoke.md` | - | - | - | stage A: four proof bundles and group 1 |
| P2-19 | `P2-19-stage-a.md` | - | - | - | stage A: groups 2 to 23, the replay bundle, six browser checks |
| P2-20 | `P2-20-stage-b.md` | - | - | - | stage B: 402 |
| P2-21 | `P2-21-validation-report.md` | - (SAs) | - | - | none |
| P2-22 | `P2-22-publish.md` | 0.5 (step 1) | - | - | none |

Totals: **85.75 developer hours** in 34 developer task files plus P2-22's first step; the orchestrator and SA work of
P2-18 to P2-22. Machine time: the phase-2 ledger of **812 counted minutes** (D-P2-15), stage A 410 then stage B 402;
locked verification runs are not charged to it (§3.3).

## 2. Traceability

| Plan section / decision / criterion | Tasks |
|---|---|
| §1 goal, §2 scope in; D-P2-01, D-P2-04 | all; inert until P2-15 (`GEN_V4_LIVE`, `ALGO_ID`) |
| §2 scope out | G-PROTECTED (§3.4); every task's "Do not change" |
| §4.1 components | P2-01 (`gen-v4.js`), P2-02 (`clue-primitives.js`, `clues.js`), P2-03 (`difficulty.js`), P2-04/P2-05a/P2-05b (`select-v4.js`), P2-06/P2-07 (`generate.js`, `tasks.js`, `protocol.js`), P2-08 (`pack.js`, `replay.js`, `types.js`, `replay-cache.js`), P2-09 (`jobs.js`, `replay-model.js`, locales), P2-10/P2-11a/P2-11b (`generation-client.js`, `worker-pool.js`, `generation-deadline.js`, `jobs.js`, `tools/generate.mjs`, `tools/bench/runner.js`), P2-12a (`tools/bench/runner.js`), P2-12b to P2-16e (`tools/ig-proto/phase2/`), P2-14a (`tools/record-fixtures.mjs`), P2-15 (`tests/fixtures/`) |
| §4.1 `tools/bench/report.js` `SOURCE_FILES` (R2) | P2-01, P2-02, P2-04, P2-11a (each adds its new module); P2-13a and P2-13e (seal binding) |
| §4.1 interfaces | P2-04 (`selectClues` contract), P2-06 (`setAttempt` reasons, counters), P2-07 (`igPrior` payloads), P2-10 (request scopes), P2-11a/P2-11b (host guard) |
| §4.2 route; D-P2-05; P2-T08 | P2-01 (predicate and tests), P2-04 (dispatcher), P2-15 (live) |
| §4.3 identity; D-P2-06; IG-P-Q34, IG-P-Q36 | P2-01 (ids, tables, `isV4Family`), P2-08 (seven keys, family shapes, `made.igPrior`, skip bounds), P2-15 (`ALGO_ID`) |
| §4.4 P1 to P3; port contract | P2-04, P2-05a, P2-05b (vectors and frozen parity); P2-12c bundle 1; P2-18 equality |
| §4.4 P4; D-P2-07 (R1) | P2-01 (table, per-set rule), P2-04 (start and low-K clamp), P2-07 (transport, serial path), P2-12e (end-to-end prior proof) |
| §4.4 P5 budget and bound | P2-04 (budget by mode, overshoot, stop), P2-05b (tests), P2-06 (bound), P2-16c (real glue), P2-13f (glue readings) |
| §4.5 deadline; D-P2-08 (R3) | P2-10, P2-11a, P2-11b, P2-16b |
| §4.6 counters and the N-V4-16 glue record; D-P2-10 (R4) | P2-04 (per-call counters), P2-06 (results, set loop, `trail`), P2-12a (rows), P2-12d (trace), P2-13r (reader), P2-13f (glue and reach readings), P2-16c (real glue) |
| §4.7 records, replay, fixtures; D-P2-09 (R5) | P2-08, P2-09, P2-14a, P2-14b, P2-15; probes in P2-19 |
| §4.8 migration and compatibility | P2-08 (tests), P2-15 (forward check with the `6b94ffb` reader) |
| §4.9 texts; D-P2-14, D-P2-16 | P2-09 (strings), P2-17 (guide sentence) |
| §4.10 documents; §4.11 statement | each behaviour task updates `docs/design-detail.md`; P2-15 (§7.5 line 1805, §7.7, §7.8); P2-17 (guides, README, tools README, PR text) |
| §5 decisions D-P2-01 to D-P2-16; D-P2-17 (parallel execution) | §4 register below; §3.7 |
| §6 business P2-B01 to P2-B08 | P2-13b (gates), P2-13v (A4, A5), P2-19 to P2-21 (readings); P2-B08 also P2-09, P2-16b |
| §6 technical P2-T01 | P2-13b, P2-18 to P2-20 |
| P2-T02 | P2-03 |
| P2-T03 | P2-05a, P2-05b, P2-12c |
| P2-T04 | P2-04, P2-05a, P2-05b |
| P2-T05 | P2-06, P2-07, P2-16c |
| P2-T06 | P2-16a |
| P2-T07 | P2-08, P2-14a, P2-15 |
| P2-T08 | P2-01, P2-15 |
| P2-T09 | P2-10, P2-11a, P2-11b, P2-16b |
| P2-T10 | P2-12d, P2-13r, P2-13c, P2-13f, P2-21 |
| P2-T11 | P2-14b, P2-13v (A4), P2-19 |
| P2-T12 | P2-13b, P2-19, P2-20 |
| P2-T13 | every task (§3.3, §3.4) |
| P2-T14 (R2) | P2-12b, P2-12d, P2-13a, P2-13v, P2-13e, P2-18 |
| §6 the plan's phase-2 gate | P2-13b, P2-21 |
| §7.1 settings, counterfactual identities and source binding (R2) | P2-12b, P2-13a, P2-13v, P2-13e |
| §7.2 population; §7.6 price | P2-13a (plan from the enumerated rows, unchanged schedule), P2-13d, P2-13e, P2-18 to P2-20 |
| §7.3 order, equality before interpretation (R6) | P2-12b (proof runner), P2-12c, P2-12e, P2-13b, P2-18 to P2-20 |
| §7.4 gates; §7.5 P5 conditional comparator | P2-13b (gates, (c5)), P2-13v (A4, A5), P2-13c (P5 coverage, twins, activation), P2-13f (glue and reach), P2-20 |
| §7.6 stops, single stage-A account, source epochs (R5) | §3.5 below; P2-13a, P2-13d, P2-13e (write-once seal); P2-18 to P2-20 |
| §8 risks | the stop points of every task; §3.5; §3.7 |
| §9 tasks P2-01 to P2-22 | §1 above (the splits listed under the header) |
| §10 named items | §5 below |

## 3. Shared rules

### 3.1 Authority, scope and commits

- **What the developer reads.** `AGENTS.md`, this file, `contracts.md` when the task names it, the assigned task file and
  the files it names, and nothing else.
  - The task pack is the authorized exception to `AGENTS.md`'s rule on `tasks/` and on folders under `docs/`.
  - The new evidence folders under `E/<task id>/` are this feature's records.
- **What the developer never does.**
  - commit, rebase or merge;
  - edit `tasks/`;
  - push, or edit a PR;
  - run any git command other than these read-only ones: `git status`, `git diff`, `git show`, `git log`,
    `git hash-object`, `git rev-parse`;
  - decide an open point. A `QUESTION:` line goes to the pack author through the orchestrator (§3.6).
- **What the orchestrator does.**
  - re-runs the task's gates;
  - fills the execution log;
  - commits one accepted task as one commit in its slot, with the message `improve-generating-phase-2 <ID>: <title>`
    and the trailers below;
  - stages only the task's `$Allowed` paths, never with `git add -A`;
  - rebases, gates and merges as §3.7 says.

  ```text
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  Copilot-Session: 7e6bf34f-be87-427e-9bec-bb2d049b46cc
  ```

- **Review evidence.** SA rulings and review evidence are written only in the main worktree `Q:\git\pentomino`. They are
  committed there separately, with `improve-generating-phase-2 <ID>: review evidence`, so a slot never sees them in its
  G-WORKTREE. `check-list.md` bookkeeping is likewise edited only in the main worktree (§3.7).
- **File and code style.**
  - Files: CRLF, UTF-8 without BOM, no trailing whitespace, a final newline (G-FORMAT).
  - Code: ES modules, `// @ts-check`, 2-space indent, single quotes, semicolons, JSDoc types as in the surrounding code.
- **Fresh processes.** Each tool command is a fresh PowerShell process. Variables, functions, the location and
  `[Environment]::CurrentDirectory` do not survive. Every command block starts with the preamble of §3.2 and defines
  every variable it reads. Every file-tool read or edit names a path under the task's own slot.
- **Not allowed.**
  - No package install, no network download, no new dependency.
  - No release, tag, force-push or workflow dispatch.
- **Agent usage.** Record unobservable usage as `unavailable` with its reason; never invent tokens or AI credits.

### 3.2 Command preamble

Paste these lines first in every PowerShell command, with the literal absolute slot path that the orchestrator's
prompt names (`Q:\git\pentomino-p2-w1` to `-w5`, §3.7); `$root` is never inherited from another process. `.NET`
file APIs resolve relative paths against `[Environment]::CurrentDirectory`, which `Set-Location` does not change; use
absolute paths with `.NET` calls (`[IO.File]::ReadAllText((Join-Path $root 'path'))`).

```powershell
$root = 'Q:\git\pentomino-p2-w<n>'
Set-Location -LiteralPath $root
[Environment]::CurrentDirectory = $root
$ErrorActionPreference = 'Stop'
$base = '97a6326'
$utf8 = [Text.UTF8Encoding]::new($false)
```

Every native command's exit code is checked: after `git`, `node`, `npm` or `gh`, add
`if ($LASTEXITCODE -ne 0) { throw 'QUESTION: <what> failed' }` (the orchestrator's blocks use `STOP:`).

### 3.3 Locked verification (not charged to the phase-2 ledger)

- **What is locked.** Every engine or test run goes through the lock helper:
  - `node --test`;
  - `tools\record-fixtures.mjs` modes that generate, and `tools\generate.mjs`;
  - the proof bundles, the replay probes and the browser checks;
  - any script that rates or generates.

  Static checks run unlocked: `npm run check`, `node --check`, the G-guards, and the phase-2 synthetic self-tests
  marked unlocked in their task.

```powershell
. (Join-Path $root 'tools\ig-proto\lock\ig-lock.ps1')
Invoke-IgNode -Repo pentomino -Task 'P2-xx focused' -LimitSeconds 300 -QuietSeconds 45 -NodeArgs @('--test', 'tests/<a>.test.js', 'tests/<b>.test.js')
Invoke-IgNode -Repo pentomino -Task 'P2-xx full' -LimitSeconds 600 -QuietSeconds 45 -NodeArgs @('--test', 'tests/**/*.test.js')
```

- **The helper.** `-Task` is `P2-<ID> <word>`. The helper prints `IG <task> exit=<e> seconds=<s> quiet=<q>` and throws
  on a nonzero exit.
  - No `-AllowExit1`, and no retry of a failed run without a ruling.
  - No `-IdleQuietSeconds`: no idle declaration exists, so every run waits the 45-s quiet period. If the owner later
    states that Sudoku's difficulty-v3 has nothing scheduled, the pack author rules first.
- **Focused gates (R14).**
  - Each task names its **focused selectors**: the test files it changes or that read the code it changes. It runs
    them in **one** runner; the orchestrator re-runs that focused gate in the merge gate (§3.7).
  - The **full suite** runs only at the full-suite points of §1's table: P2-02, P2-06, P2-15 and P2-16a. It also runs
    when a focused result needs a broader look, which is a `QUESTION:` first.
  - Documentation-only tasks run their static and document gates only.
- **Limits.** Focused runs 300 s; the full suite 600 s (`AGENTS.md`: at most 10 minutes; phase 1 measured 122 s on Node
  26). A run that reaches its limit is an error to investigate, never a reason to raise the limit.
- **Expected results:** `# fail 0`, `# cancelled 0`, `# todo 0`.

### 3.4 Guards

Run each guard after the §3.2 preamble, in the same command as the variables it reads.

**G-PROTECTED.** No **base** file under the protected paths changes: modifying, deleting or renaming one fails; adding a
new file is G-WORKTREE's business (R13). `--no-renames` shows a move as a deletion.

```powershell
$Protected = @(
  'tools/ig-proto', 'docs/improve-generating', 'docs/improve-generating-stages-2-4', 'docs/improve-generating-phase-1',
  'docs/improve-generating-phase-2/request.md', 'docs/improve-generating-phase-2/plan.md',
  'docs/improve-generating-phase-2/report.md', 'docs/improve-generating-phase-2/clarifications.md',
  'docs/improve-generating-phase-2/sa-opus', 'docs/improve-generating-phase-2/sa-astra',
  'docs/improve-generating-phase-2/evidence/sa-opus', 'docs/improve-generating-phase-2/evidence/sa-astra',
  'tasks/improve-generating', 'tasks/improve-generating-v4', 'tasks/improve-generating-stages-2-4',
  'tasks/improve-generating-phase-1', 'tests/fixtures/replay-case.json', 'docs/difficulty-v3', 'docs/calibration',
  'docs/init-design', '.github', 'package.json'
)
git --no-pager diff --exit-code --stat --no-renames --diff-filter=CDMRTUXB $base -- $Protected ':(exclude)tools/ig-proto/README.md'
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-PROTECTED: a protected base file changed' }
$blob = git --no-pager rev-parse "${base}:tests/fixtures/replay-case.json"
$now = git --no-pager hash-object tests/fixtures/replay-case.json
if ($LASTEXITCODE -ne 0 -or $blob -cne $now) { throw 'QUESTION: G-PROTECTED: tests/fixtures/replay-case.json is not byte for byte the base blob' }
'G-PROTECTED: OK'
```

- `tools/ig-proto/README.md` may change only in P2-17.
- An approved amendment to an existing protected document needs an explicit updated guard baseline, ruled by the pack
  author; there is no informal exception.

**G-WORKTREE.** Each task defines `$Allowed`: Git-style paths (`/`), the task's own task file included (the
orchestrator's execution log). It never includes `check-list.md` (§3.7). Ignored files (`tests/artifacts/`) do not show.

```powershell
$wt = @(git --no-pager -c core.quotepath=false status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-WORKTREE: status failed' }
foreach ($line in $wt) {
  if ($line.Substring(0, 2) -match '[DRU]' -or $Allowed -cnotcontains $line.Substring(3)) { throw "QUESTION: G-WORKTREE: $line" }
}
'G-WORKTREE: OK'
```

**G-FORMAT.** Reads every changed or new text file of the slot; missing files throw.

```powershell
$FormatFiles = @(git --no-pager -c core.quotepath=false status --porcelain=v1 --untracked-files=all | ForEach-Object { $_.Substring(3) } | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
if ($FormatFiles.Count -eq 0) { throw 'QUESTION: G-FORMAT: no changed files' }
node --input-type=module -e "import { readFileSync } from 'node:fs'; import { checkText } from './tools/check-conventions.mjs'; let bad = 0; for (const f of process.argv.slice(1)) { const b = readFileSync(f); const t = b.toString('utf8'); const p = checkText(f, b); if (b.includes(10) && !t.includes('\r\n')) p.push(f + ': LF line endings, not CRLF'); if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) p.push(f + ': BOM'); t.replace(/\r\n/g, '\n').split('\n').forEach((l, i) => { const m = f + ':' + (i + 1) + ': trailing whitespace'; if (/[ \t]+$/.test(l) && !(/\.md$/i.test(f) && /\S  $/.test(l)) && !p.includes(m)) p.push(m); }); for (const x of p) { console.error(x); bad += 1; } } console.log(bad ? 'format: ' + bad + ' problem(s)' : 'format: OK (' + (process.argv.length - 1) + ' files)'); process.exitCode = bad ? 1 : 0;" @FormatFiles
if ($LASTEXITCODE -ne 0) { throw 'QUESTION: G-FORMAT failed' }
```

A Markdown line that ends in exactly two spaces after text is a hard line break. The repository's own check allows it
(`tools/check-conventions.mjs`, the `hardBreak` rule), so G-FORMAT allows it too; any other trailing whitespace is a
problem (ruling on P2-17, 2026-11-26).

**G-FORMAT-COMMIT** (the merge gate, §3.7): the same `node` one-liner over the task commit's files,
`$FormatFiles = @(git --no-pager -c core.quotepath=false diff --name-only --diff-filter=AM gen-v4 HEAD)`; an empty
list is a `STOP:`.

**G-CHECK.** `npm run check`; expected `check-conventions: OK` and `check-site: OK`, exit 0.

**G-COPIES** applies once P2-12b is merged.

- **The command.** `node tools\ig-proto\phase2\copies.mjs check --source gen-v4 @flag` and `node tools\ig-proto\phase2\copies.mjs check --source today --root Q:\git\pentomino-p2-today`.
- **Expected.** Each prints `copies: OK (<n> variants, <m> edits match)`, exit 0.
- **The flag is phase-aware (R13).** `$flag = @('--rehearse-cutover')` while `core\engine\version.js` still contains
  `export const ALGO_ID = 'gen-v3';`, else `@()`. Before P2-15 the proto-id anchors cannot match an unrehearsed
  `gen-v3`.

### 3.5 The phase-2 ledger (D-P2-15)

| Stage | Authorization (counted min) | Planned rows | Row invocations | Items | Priced counted min | Guard min |
|---|---:|---:|---:|---|---:|---:|
| A | **410** | 318 (8 smoke, 50 `require`, 140 sentinel, 120 thin-control) | 23 (group 1: the 8 smoke rows, then 3 `require` rows) | 4 proof bundles (4 invocations, 1,400.916 s); 8 replay probes (**one** invocation: two successive four-item groups, two lanes, 533 s); 6 browser checks (6 invocations of at most 120 s, 990 s) | 330.656 | 409.195 |
| B | **402** | 695 (incl. up to 15 conditional twins) | 26 | none | 321.258 | 401.572 |
| Total | **812** | 1,013 | 49 | | 651.913 | 810.767 |

- **Source.** `E/sa-astra/round1-cross-audit.json` (`rows`, `stages.A.schedule`, `stages.B.schedule`), reproduced by
  `E/sa-opus/p2-xr-verify-astra.md`.
  - The pack executes **that** schedule unchanged (R1): no group 0, and the replay probes as one invocation.
  - A different execution schedule needs a recomputed manifest and a ruling before it runs.
  - **812 is a spend cap, not an assurance of completion** (1,303 at the sentinels' row limits).
- **Counting.** An invocation counts its node seconds (the helper's `IG ... seconds=` value) plus 45 s of quiet.
  - A helper limit timeout (`<limit>-second limit reached`) counts its limit plus 45, and `killed: true`.
  - A nonzero exit counts its `IG` seconds plus 45.
  - Any other failure with no usable duration is an **accounting stop**: the reservation stays and the orchestrator
    reports.
  - **A host restart or crash** (ruling on P2-19, 2026-11-26) ends the wrapper before its `finally`: there is no ledger
    line, and the reservation and the lock file `%TEMP%\dv3-timing.lock` remain. The orchestrator resolves this
    accounting stop with P2-19's recovery block, without a new ruling, before any other invocation of either stage.
    - The node seconds are a proved upper bound, `min(limitS, T_end - T_node)`, rounded up to the millisecond. `T_node`
      is the lock file's UTC stamp when its text names `IG P2 <id>` (the helper writes it just before the node child
      starts); otherwise the reservation's `at` when a status line names `<id>`; otherwise the child never started and
      the node seconds are 0. `T_end` is the System log's Kernel-General event 13 ("The operating system is shutting
      down") before the next boot, else that boot's Kernel-General event 12.
    - The line adds the usual 45 s, with `killed: true`, `exit: -1` and `cause: 'exit'`; `start` is the reservation's
      `at` and `end` is `T_end`. `ledger --append` admits only the causes `ok`, `exit` and `timeout` and no other
      field, and the wrapper never writes `exit` with `killed: true`, so this combination marks a host restart.
    - Then `release --id <id>`. The lock file is removed only when its text names `IG P2 <id>` and its stamp is earlier
      than the boot.
    - A started key without a terminal line becomes `interrupted` at its group's next invocation (C5) and is never run
      again; the loop resumes at that group, never at an earlier one. An interrupted required row is missing evidence:
      its gate is `incomplete`, and in stage A it needs C12's owner continuation.
    - An interrupted item (a proof, the replay probes, a browser check) is charged the same way; whether it runs again
      is a pack-author ruling, and its partial output is kept.
  - Lock waits beyond the quiet period are not counted.
  - The wrapper appends every line in `E/ledger/ledger.jsonl` (`contracts.md` C7) in a `finally`, and rethrows the
    original failure.
- **Admission.** An invocation starts only if `spent(stage) + limit + 45 <= authorization(stage) x 60`.
  - The stage map, **A 410 and B 402**, is sealed (`contracts.md` C7) and is never a parameter. Nothing is borrowed
    from A for B.
  - Stage B starts only after the committed stage-A readout (`contracts.md` C12).
  - P2-18 and P2-19 share the single 410-minute stage-A account.
- **Stops.**
  - A failed gate in stage A goes to the owner before stage B.
  - No completed observation is run again to fill a budget.
  - Missing data is incomplete, never a pass.
  - More than 15 conditional twins is a finding: repriced inside the remaining authorization (`contracts.md` C10
    overflow), otherwise the plan stops with the endpoint `incomplete`. A required twin is never dropped.
- **Source epoch.** The measured runtime, the phase-2 tools and their fixed inputs are sealed before P2-18
  (`E/seal/seal.json`, P2-13a, hardened by P2-13e; R13; review-2 R2-04).
  - A later runtime, tool, table, deadline or replay-limit change starts a new source epoch: the affected receipts and
    gates are named, the verification is repriced from the remaining authorization, and the owner decides if scope, the
    selected configuration or the allowance would change.
  - Old rows are never relabelled as measurements of the new source.
  - The seal is write-once (`contracts.md` C13). A new source epoch stops for this ruling. The ruling names separate
    evidence and raw paths and the affected reruns; it does not reset or discard the cumulative ledger. Every record
    names its seal, and a row of another epoch is refused, never reused (C5).
- **Seeds.**
  - `landscape/<cell>/<rep>`, reps 20-39 (Master 20-24);
  - `ig-p2/require/<cell>/<rep>`, reps 0-4;
  - reps 40-59 are reserved (N-V4-04), and no task uses them;
  - nothing is fitted or retuned on these seeds.

### 3.6 Questions and stop points

- **When to stop with a `QUESTION:`.** Send `QUESTION: <text>` to the pack author (SA-Opus) through the orchestrator,
  and stop, when:
  - the task looks wrong or contradicts the code at its base;
  - an ambiguity changes behaviour, a contract or a user text;
  - a gate fails for a reason the task does not cover;
  - a change is needed outside the task's `$Allowed`;
  - a recorded decision (§4) would change.
- **Where it goes next.**
  - A question that changes scope, a user-visible behaviour the plan leaves open, the 812-minute allowance or a
    recorded owner decision goes on to the owner.
  - A disagreement between the SAs goes to both SAs jointly (D-P2-03).

### 3.7 Parallel execution (D-P2-17)

The owner allowed parallel developers (D-P2-17). `docs/improve-generating-phase-2/sa-opus/parallel-schedule.md` explains
this plan and `E/sa-opus/p2-parallel-plan.md` models it; where they differ, this section governs.

#### Developers, lanes and slots

- **At most three developers at once**, one per lane: S (selector), C (client and records) and T (tooling), as in §1.
  - A lane takes its next ready task in §1's order.
  - When it has none ready, it takes the ready join or other-lane task with the longest tail (the `Tail h` column of
    `E/sa-opus/p2-parallel-plan.md`); on a tie, the first in §1's order.
- **Five worktree slots** `Q:\git\pentomino-p2-w1` to `-w5`, one task per slot from its start to its merge, so a lane
  can start its next task while the previous one merges.
- **The main worktree** `Q:\git\pentomino` stays on `gen-v4`. It is used for fast-forwards, bookkeeping, SA rulings and
  review evidence, and the stages P2-18 to P2-22.

#### Setup

The orchestrator does this once, in the main worktree, after the pack commit.

```powershell
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'Q:\git\pentomino'
git worktree add --detach Q:\git\pentomino-p2-today 6b94ffb
if ($LASTEXITCODE -ne 0) { throw 'STOP: today worktree' }
foreach ($n in 1..5) {
  $wt = "Q:\git\pentomino-p2-w$n"
  git worktree add --detach $wt gen-v4
  if ($LASTEXITCODE -ne 0) { throw "STOP: worktree $wt" }
  New-Item -ItemType Directory -Force -Path "$wt\tests\artifacts\ig-proto" | Out-Null
  foreach ($d in 'frozen-source', 'tree-frozen') {
    New-Item -ItemType Junction -Path "$wt\tests\artifacts\ig-proto\$d" -Target "Q:\git\pentomino\tests\artifacts\ig-proto\$d" | Out-Null
  }
}
git worktree list
```

- **The two junctions are read-only inputs.**
  - `frozen-source` is `FROZEN_SOURCE_DIR` of `tools/ig-proto/lib/paths.mjs:22`, imported through `verdicts.mjs`.
  - `tree-frozen` holds the frozen trees that P2-05b and P2-13b read.
  - No task writes into them.
  - Every writable artifact stays in its own slot: `tests/artifacts/ig-proto/phase2/` (trees, journals, profiles,
    ledgers, self-test roots).
- **No install.** The repository has no npm dependencies, so a slot needs no install.

#### Starting a task

The orchestrator assigns a free slot and records the base SHA that `git log` prints.

```powershell
$ErrorActionPreference = 'Stop'
$id = 'P2-xx'; $wt = 'Q:\git\pentomino-p2-w<n>'
if (@(git -C $wt status --porcelain).Count -ne 0) { throw "STOP: $wt is not clean" }
git -C $wt switch -C "p2/$id" gen-v4
if ($LASTEXITCODE -ne 0) { throw 'STOP: switch failed' }
git -C $wt log -1 --format=%H
```

The developer's prompt names `$id`, the slot path (the §3.2 preamble's `$root`) and that base SHA.

#### Accepting and merging

The orchestrator merges one task at a time. When several are accepted together, the order is lane C, then S, then T
(R15). From step 3 to step 5, nothing else is committed on `gen-v4`.

1. **Static guards.** In the slot: G-PROTECTED, G-WORKTREE with the task's `$Allowed`, G-FORMAT and G-CHECK.
2. **Commit in the slot.** Fill the execution log fields known so far in the slot's task file. Stage the task's changed
   `$Allowed` paths and commit (§3.1).
3. **Rebase.** `git -C $wt rebase gen-v4`. On any conflict, run `git -C $wt rebase --abort` and send the pack author a
   `QUESTION:` with the paths. The orchestrator never resolves a conflict.
4. **Merge gate** in the slot, on the rebased commit:
   - G-PROTECTED, G-CHECK and G-FORMAT-COMMIT;
   - the task's focused gate, locked, in one runner (§3.3). A task that adds or changes a file under
     `tools/ig-proto/phase2/` adds every phase-2 test file that exists on the rebased branch (the list of gate 2 of
     `E/P2-16a/gates.md`, as far as merged), with a 600-s limit;
   - the full suite instead, at a full-suite point;
   - until P2-12b is merged, statically in the main worktree: `node docs\improve-generating-phase-2\evidence\sa-opus\p2-link-anchors.mjs --root <slot>`; expected `<slot>: 22 of 22 edits apply`, exit 0 (SA-Opus ruling on P2-06, 2026-11-25); after that G-COPIES covers the anchors;
   - G-COPIES from P2-12b's merge on;
   - the task's conditional re-runs below.
5. **Fast-forward.** `git -C Q:\git\pentomino merge --ff-only "p2/$id"`; the SHA on `gen-v4` goes into the execution
   log.
6. **Release the slot.** `git -C $wt switch --detach gen-v4`; `git -C $wt branch -d "p2/$id"`.
7. **Bookkeeping**, in the main worktree after the fast-forward: `check-list.md` (index box, §6 row, rulings, named
   items) and the merge-gate lines of the task's execution log.
   - It is committed as `improve-generating-phase-2: bookkeeping <IDs>`, at least once per three merges.
   - This is an execution convention, not a task or a measured-source change.

#### Conditional re-runs in a merge gate

- **The browser page.** The six checks of P2-16b run once on a tree holding both P2-15 and P2-16b, in the merge gate of
  whichever of the two merges second (P2-16b's six locked check commands).
- **The rehearsals.** A rehearsal or proof that ran on a base without P2-15 runs again, without `--rehearse-cutover`, in
  the merge gate of whichever of the two merges second:
  - P2-12c's two and P2-12e's two quick rehearsals;
  - P2-16c's glue proof (`glue.test.mjs`).

#### A failed merge gate

`gen-v4` is untouched. The task goes back to a developer as a fix round in the same slot, on the rebased branch. When
the failure comes from the interaction with a task merged meanwhile, the pack author decides which task fixes it.

Review-2 §8: Fixes on an unmerged private task branch are folded by the orchestrator into that task's candidate commit
(`git commit --amend`), followed by rebase and the complete merge gate again; the developer never commits. Never amend a
commit already fast-forwarded to `gen-v4`.

#### Shared-file exceptions (R15)

Two tasks that may run at the same time share a file only in these listed, separated places. Any other overlap of a
runtime file or a test helper forces them into order.

| File | Tasks and regions (lines at `97a6326`) |
|---|---|
| `tools/bench/report.js` `SOURCE_FILES` | in-line insertions only: P2-02 line 38, P2-04 line 43, P2-11a line 46 (P2-01's line 39 is merged before P2-02 starts) |
| `docs/design-detail.md` | each task's own named section or lines, kept as the task says (API and module-tree edits included). Concurrent pairs are always in different sections: P2-02 (line 169, lines 555-590), P2-03 (§7.9), P2-04 (§6.10), P2-06 and P2-07 (§6.5, §6.9), P2-08 (§7.7), P2-09 (§6.12), P2-10 and P2-11b (§8.4). A paragraph added at a section's end goes after the section's last text line and before the blank line preceding the next heading. P2-04 also updates line 169 and the `clues.js` API entry (555-567), after P2-02's merge (ruling 2026-11-25). |
| `core/browser/generation-client.js` | P2-07 (one line after `const base = { ... };` in `generateBatch`, lines 852-860; the dispatch at line 903); P2-10 (typedefs, `checkSet` and `checkBatch`, `begin` 470-497, `newScope`, `generateSet`, line 850, the client object); P2-11a (the options typedef line 450, `finishSet`'s `assemblePack` 735, after `detail` 879, the batch assembly 1185-1204, the client object, typedefs, the `pack.js` import line 14). The import from `../engine/gen-v4.js` is written once by P2-06. The lines of the copies' link edits (`link-3` to `link-15`) and the batch's `catch`/`finally` (1170-1175, `link-9`) stay byte for byte. |
| `tests/generation-client.test.js` | P2-07 inserts its cases directly after the test `a full history fails preflight without eviction or dispatch` (line 740); P2-06, P2-10 and P2-11a append at the end of the file, in their order |
| `tests/generate.test.js` | P2-06 and P2-08 add their cases directly after the test `lazy certification gives a proof status without changing the accepted fold` (it ends at line 689), before the nested `describe('completion pass'`; P2-07 at the end of `describe('calibration reuse and history capacity')` (lines 335-391); P2-14a stays inside the record-fixtures test (lines 901-921) |
| `tools/bench/runner.js` | P2-10 (`generate()` 535-590, and its import line directly after line 10) and P2-11b (`generate()`), serial in lane C; P2-12a in `checkCase` (174-176) and `fillRecord` with its JSDoc (616-739), with no import, keeping line 628 (`link-10`) byte for byte |
| `DEVELOPERGUIDE.md`, `.vn.md` | P2-12a (a sentence at the end of the calibrate bullet, line 80 / 81) and P2-14a (a sentence at the end of the fixtures paragraph, line 124 / 123). Every other guide change is P2-17's, which runs after both. |
| `tools/ig-proto/phase2/` | each task its own files; one test file per tool: `trace-reader.test.mjs` (P2-13r), `binding.test.mjs` (P2-13v), `p2.test.mjs` (P2-13a, P2-13d, P2-13e, P2-13b, P2-13c, P2-13f, serial in lane T), `copies.test.mjs` (P2-12b), `trace.test.mjs` (P2-12d), `proofs.test.mjs` (P2-12c), `proofs-prior-legacy.test.mjs` (P2-12e), `replay-probe.test.mjs` (P2-14b), `glue.test.mjs` (P2-16c), `browser-run.test.mjs` (P2-16e). P2-12b's `proofs.mjs` loads a bundle module `proof-<bundle>.mjs` by name on invocation, so P2-12c and P2-12e add their bundles without editing it (review-2 R2-03). |

#### Lane T's contracts

`contracts.md` is frozen by this revision.

- The tooling tasks import only modules that exist on their base. A copy, selector or client that does not exist yet is
  loaded only at execution, through an adapter, and their unit tests use synthetic adapters.
- P2-13v reads the formats C4, C5 and C13 to C16 before their producers exist (P2-12b, P2-13e, P2-14b, P2-16e). A
  producer writes exactly its contract; a field it cannot fill is a `QUESTION:` before any change of format.
- No real seal and no real row run in lane T.
- Self-tests use an isolated root under `tests\artifacts\ig-proto\phase2\self-test\<run>`.

## 4. Decisions register

Copied from `plan.md` §5 (committed at `97a6326`); the plan's text governs. D-P2-17 is recorded by this pack.

| ID | Decision | Decided by | Date | Source commit / record |
|---|---|---|---|---|
| D-P2-01 | Phase-2 scope: `gen-v4` for the other boards with the recorded class choices; today's search kept on 26x26 Nightmare; the pack implements the route, proves compatibility and replay, measures `require` first (N-V4-15), repeats the validation on the production code and returns with its plan and price before anything runs or ships; Hell 1 offer rules unchanged; the phase-0 FAIL stays recorded | Owner (D-S24-35, Q-T16 (a)) | 2026-11-25 06:25 | `ca46067`; `7c1bad2` (`request.md:35-40`) |
| D-P2-02 | Two PRs: phase 2 on `gen-v4` from the published phase-1 head, a new PR into `main`; neither merged | Owner | 2026-11-25 07:46 | `c63c553`; `7c1bad2` |
| D-P2-03 | The two SAs answer supervisor-level questions jointly, without Fable | Owner | 2026-11-23 | `7c1bad2` (`request.md:29-31`) |
| D-P2-04 | A semantic rebuild with a retained `gen-v3` selector and shared primitives; no frozen globals, journals or Node imports; inert until one cutover task | Joint SAs | 2026-11-25 | both cross-reviews; this plan |
| D-P2-05 | The route of 4.2: `gen-v4` for Nightmare and Hell 1 except the exact full 26x26 Nightmare board (26 by 26, 676 active cells, rotation-independent), on every stage; the proposal "every Nightmare board above 576 cells" is withdrawn as broader than D-S24-35 | Joint SAs, implementing D-P2-01 | 2026-11-25 | both cross-reviews |
| D-P2-06 | Identity of 4.3: one running version, seven keys, `prior-s3-v1`, `screen-v4-v1`, budgets, bound, deadline and route inside the `gen-v4` definition, `made.igPrior` with null omitted on replay, skip bounds per `algo` | Joint SAs (IG-P-Q34, IG-P-Q36) | 2026-11-25 | both cross-reviews |
| D-P2-07 | The prior of 4.4: exact key, otherwise `clamp(K - 8, 1, K - 2)` with step 8; on Hell 1 the frozen per-set rule from the batch's usable calibration (self-consistent for the current board and pieces, rated at the target level, a unique certificate when the current request is `require`), for every ordinary candidate; otherwise the table | Joint SAs; contract wording per SA-Astra's R1 | 2026-11-25 | both cross-reviews; `sa-astra/review-report-plan.md` R1 |
| D-P2-08 | The deadline of 4.5: Generator actions 115/120 s each; one 46/115/120-s scope for automatic `gen-v4`-route CLI and bench requests; legacy timers on legacy routes; a real host guard over assembly. The standalone 46-s cut is withdrawn | Joint SAs, applying IG-P-D1 per request | 2026-11-25 | both cross-reviews; `live.json` `lv-9`..`lv-12` |
| D-P2-09 | Records, replay and fixtures of 4.7 | Joint SAs | 2026-11-25 | both cross-reviews |
| D-P2-10 | Counters of 4.6: minimal integers (per call in the selection result; set attempts and bound firings in the client's set loop), N-V4-16's ordered glue record per row, a symmetric proved trace in the measurement copies, browser deadline checks on the shipping build | Joint SAs | 2026-11-25 | both cross-reviews; `sa-astra/review-report-plan.md` R4 |
| D-P2-11 | Hell 1 is measured only through a labelled measurement copy with the diagnostic offer; no production switch, no offer change | Joint SAs | 2026-11-25 | both cross-reviews |
| D-P2-12 | The validation design of section 7, including the seeds as a source-port replication, the conditional P5 twins and their reporting rules, the 140 sentinel rows and N-V4-15's 50 rows; its price, 812 counted minutes, is approved and funded by D-P2-15 | Joint SAs; funding: owner (D-P2-15) | 2026-11-25 | both cross-reviews; `evidence/sa-astra/round1-cross-audit.*`; `evidence/sa-opus/p2-xr-verify-astra.md` |
| D-P2-13 | Pools stay 1 to 4; width 8 by the fold simulation | Joint SAs | 2026-11-25 | `worker-pool.js:75`; phase-1 P1-02 |
| D-P2-14 | The texts of 4.9 and the statement of 4.11, with the plain-language wording of the four no-window strings; approved by the owner (D-P2-16) | Joint SAs; texts: owner (D-P2-16) | 2026-11-25 | both cross-reviews (§6 of SA-Astra's, §8.6 of SA-Opus's) |
| D-P2-15 | Q-P2-1, option (a): the production validation of section 7 is approved, with a separate phase-2 ledger of 812 counted minutes: stage A, 410, first; stage B, 402, only after the SAs' stage-A readout. 812 is a spend cap, not an assurance of completion (1,303 at the sentinels' row limits). The closed round's 853.8-minute balance is not used, and nothing rolls over | Owner: "Q-P2-1: đồng ý duyệt." ("approved") | 2026-11-25 15:06:53 +07:00 | Discord message `1575060196269490259`; the question: `sa-opus/answered-questions.md` |
| D-P2-16 | Q-P2-5, option (a): the texts of 4.9 with the plain-language wording B of the four no-window strings, the guide sentence, and the statement of 4.11 replacing "no fail-fast" at `design-detail.md:1805`. The owner may reword later; that is an ordinary text task with no behaviour change | Owner: "Q-P2-5: đồng ý duyệt, tôi sẽ sửa sau nếu thấy không phù hợp." ("approved; I will change it later if I find it unsuitable") | 2026-11-25 15:06:53 +07:00 | Discord message `1575060196269490259`; the question: `sa-opus/answered-questions.md` |
| D-P2-17 | Parallel development is allowed and should be optimized for speed: this overrides "one task per repository at a time" for this pack. At most three developers at once (lanes S, C, T; §3.7), each task in its own worktree slot and short branch; the orchestrator commits, rebases and merges one task at a time after its merge gate. Locked and timed runs stay one at a time through the lock; no idle declaration is granted; the ledger, staging and every other decision are unchanged | Owner: "cho phép chạy song song, hãy tối ưu để tăng tốc độ" ("parallel running is allowed; optimize to increase speed"); execution rules: pack author, reviewed by SA-Astra (R15) | 2026-11-25 17:45:12 +07:00 | Discord message `1575100035077771386`; `sa-opus/parallel-schedule.md`; `review-1.md` R15 |

## 5. Named items

| ID | Description / state | Numbers or limit | Routed to |
|---|---|---|---|
| N-V4-14 | The screen on `n-upper` (x1.79) and `n-large` (x1.59) | no screen there in `screen-v4-v1` | a later proposal and validation |
| N-V4-04 | Reps 40-59 reserved | no task uses them | a later refit's second validation |
| N-V4-08, N-V4-09 | Hell 1 offers, browser runs, D39, the blind play comparison | Hell 1 measured only through the diagnostic copy | phase 3 |
| BQ-1, BQ-3 | Device limits stay 484 and 360 | no change | their qualifications |
| CLI 577-675 cells | Run `gen-v4` (`n-large`, no screen) without a measurement of their own | stated in the release notes | a later measurement if wanted |
| F2, F7 | Reach reported per cell; zero stays "unexercised" | P2-13b's reports | P2-21 |
| N-P1-DOC | Both developer guides omit `tools/ig-proto/` | fixed by P2-17 | before any merge |
| D-P2-16 rewording | The owner may reword the approved texts later | ordinary text task, no behaviour change | when the owner asks |
| Developer hours | The pack's estimate is 85.75 h against the plan's "about 46", round 0's 59 and revision 1's 78.25 | the review-1 contracts and proofs (R2 to R7, R11 to R13); review-2's binding, coverage and glue tasks (P2-13v, P2-13e, P2-13f) | informational; no credit forecast |
| N-P2-09-CELL | The score cell of a screen-capped or re-rating-capped step shows `replay.table.unrateable` ("the deduction path was capped"), while the step text says it reached its work limit | one new EN/VI cell string; no behaviour change | the owner's text pass (D-P2-16 rewording) |
| N-P2-15-K8 | On 15x20 Nightmare, seed `t18-big-a`, K = 24, the calibration under `gen-v4` has 5 clues and score 69, still in band; under `gen-v3` it had 3 clues and score 70 | one seed; not population evidence | P2-21, as a deviation note |
| INC-P2-11b | `tests/generator-import.test.js:512` failed on `gen-v4` from P2-11b (`df15064`) to P2-15: its fake client lacked `newScope`; P2-11b's gate was focused | repaired by P2-15's K12 | closed |
| N-P2-14b-REQ | Early warning for stage A (P2-B07): in the pre-seal replay-probe rehearsal under `require`, 3 of 4 sets hit the 115-s stop (22x22 Hell 1, 22x22 Nightmare, 32x15 Nightmare, seed index 0); 32x15 Hell 1's batch ended partial with one ordinary puzzle besides the calibration | seed index 0 only; not population evidence | stage A's 50 require rows; the stage-A readout reads them first (SA-Opus ruling, 6cf7e8c) |
| INC-P2-19-RESTART | Windows Update (`MoUsoCoreWorker.exe`, System event 1074) restarted the host at 2026-11-26 05:00:05 +07:00, during `A-9.13` (stage A, group 9). Charged under §3.5's host-restart rule: node 238.273 s, from the lock stamp 21:56:56.514Z to the kernel's shutdown event 13 at 22:00:54.787Z; 283.273 counted; `cause: 'exit'`, `killed: true`, `exit: -1`; `rowsWritten` 1. `require/uncapped/32x15-hell-1/2` was running: it becomes `interrupted` (`no-report`) and is never run again, so A3 lacks one of its 50 row lines and is `incomplete` | one row of 318; A spent 5,357.556 s (89.293 min) after the charge | the stage-A readout (C12's owner continuation); Windows Update itself: the owner's Q-P2-R1 |
| Merge, release | Not authorized | neither PR merged | a later explicit owner instruction |

## 6. Execution summary (orchestrator)

| ID | Slot, base | Start | End | Duration | AI credits | Commit on `gen-v4` |
|---|---|---|---|---|---|---|
| P2-01 | w1, 203f5ca | 2026-11-25 22:01 | 2026-11-25 22:07 | about 6 min | 43.69 | c4d74b4 |
| P2-02 | w1, fb67ba0 | 2026-11-25 22:13 | 2026-11-25 22:24 | about 11 min | 70.10 | df72615 |
| P2-03 | w3, 203f5ca | 2026-11-25 22:01 | 2026-11-25 22:09 | about 8 min | 37.32 | ec8c583 |
| P2-04 | w1, df72615 | 2026-11-25 22:27 | 2026-11-25 22:55 | about 28 min | 241.42 | 6c35eda |
| P2-05a | w1, 6c35eda | 2026-11-25 22:53 | 2026-11-25 23:02 | about 9 min | 65.10 | c701d1a |
| P2-05b | w1, c701d1a | 2026-11-25 23:02 | 2026-11-25 23:11 | about 9 min | 69.28 | 17b3de0 |
| P2-06 | w2, fb67ba0 | 2026-11-25 22:13 | 2026-11-25 22:39 | about 26 min | 175.81 | 85f5c46 |
| P2-07 | w2, 85f5c46 | 2026-11-25 22:43 | 2026-11-25 22:52 | about 9 min | 74.28 | 0183938 |
| P2-08 | w2, 6c35eda | 2026-11-25 22:53 | 2026-11-25 23:00 | about 7 min | 88.62 | a53cb60 |
| P2-09 | w2, df15064 | 2026-11-25 23:34 | 2026-11-25 23:46 | about 12 min | 113.04 | 944669d |
| P2-10 | w2, c701d1a | 2026-11-25 23:02 | 2026-11-25 23:12 | about 10 min | 114.55 | e807adf |
| P2-11a | w2, e807adf | 2026-11-25 23:14 | 2026-11-25 23:22 | about 8 min | 66.69 | abdf82a |
| P2-11b | w2, abdf82a | 2026-11-25 23:26 | 2026-11-25 23:33 | about 7 min | 54.28 | df15064 |
| P2-12a | w2, 944669d | 2026-11-25 23:47 | 2026-11-25 23:58 | about 11 min | 54.42 | 9bc10e6 |
| P2-12b | w1, 0bdfd04 | 2026-11-25 23:37 | 2026-11-25 23:52 | about 15 min | 121.56 | 5314b2d |
| P2-12c | w1, 6c039de | 2026-11-26 01:46 | 2026-11-26 02:33 | about 47 min | 111.93 | f8e1f93 |
| P2-12d | w1, 953f3b2 | 2026-11-25 23:55 | 2026-11-26 00:18 | about 23 min | 226.15 | 3b06cbc |
| P2-12e | w1, cf24d85 | 2026-11-26 00:52 | 2026-11-26 01:41 | about 49 min | 205.90 | 86813c6 |
| P2-13r | w2, 203f5ca | 2026-11-25 22:01 | 2026-11-25 22:12 | about 11 min | 62.36 | fb67ba0 |
| P2-13v | w3, fb67ba0 | 2026-11-25 22:13 | 2026-11-25 22:21 | about 8 min | 61.28 | 030475d |
| P2-13a | w3, 85f5c46 | 2026-11-25 22:43 | 2026-11-25 23:06 | about 23 min | 176.39 | 6267e86 |
| P2-13b | w3, 953f3b2 | 2026-11-25 23:55 | 2026-11-26 00:46 | about 51 min | 459.62 | 478eca3 |
| P2-13c | w3, 478eca3 | 2026-11-26 00:48 | 2026-11-26 01:16 | about 28 min | 258.28 | 3c77a46 |
| P2-13d | w3, 6267e86 | 2026-11-25 23:07 | 2026-11-25 23:23 | about 16 min | 155.75 | fe9e120 |
| P2-13e | w3, fe9e120 | 2026-11-25 23:31 | 2026-11-25 23:53 | about 22 min | 298.38 | 953f3b2 |
| P2-13f | w3, 3c77a46 | 2026-11-26 01:18 | 2026-11-26 01:45 | about 27 min | 178.14 | 6c039de |
| P2-14a | w1, 17b3de0 | 2026-11-25 23:12 | 2026-11-25 23:36 | about 24 min | 103.37 | 0bdfd04 |
| P2-14b | w2, 6c039de | 2026-11-26 01:46 | 2026-11-26 02:04 | about 18 min | 81.64 | 035a632 |
| P2-15 | w2, 9bc10e6 | 2026-11-25 23:59 | 2026-11-26 01:13 | about 74 min | 268.12 | de37517 |
| P2-16a | w3, 6c039de | 2026-11-26 01:46 | 2026-11-26 02:08 | about 22 min | 92.93 | 80a7699 |
| P2-16b | w1, 3b06cbc | 2026-11-26 00:20 | 2026-11-26 00:51 | about 31 min | 158.87 | cf24d85 |
| P2-16c | w2, 3c77a46 | 2026-11-26 01:18 | 2026-11-26 01:26 | about 8 min | 71.43 | 1369fd2 |
| P2-16e | w3, df72615 | 2026-11-25 22:27 | 2026-11-25 22:36 | about 9 min | 54.34 | e14e7a4 |
| P2-17 | w1, f8e1f93 | 2026-11-26 02:33 | 2026-11-26 03:28 | about 55 min | 334.31 | 570d522 |
| P2-18 | main, fa0bda2 (seal bca8cfd2) | 2026-11-26 03:09 | 2026-11-26 04:05 | about 56 min (stage A charged 28.344 min) | orchestrator | 46d9af6 |
| P2-19 | main | | | | | |
| P2-20 | main | | | | | |
| P2-21 | main | | | | | |
| P2-22 | main | | | | | |

## 7. Pack review

- **Round 0.** SA-Opus (pack author) drafted the pack, 2026-11-25.
- **Review 1.** SA-Astra (reviewer), 2026-11-25 18:21: changes requested (`review-1.md`, R1 to R15).
- **Revision 1.** SA-Opus applied all 15 findings, 2026-11-25. No counter-position. Where a finding left a choice,
  the pack author made it; those choices are marked "choice".

| Finding | Disposition | Where |
|---|---|---|
| R1 schedule | Applied: the audit's groups unchanged, with group 1's smoke rows first and an in-process smoke gate before its `require` rows; the replay probes as one invocation of two four-item groups with two lanes. Stage A stays at 330.656 counted and 409.195 guard minutes, within 410 (`E/sa-opus/p2-xr-verify-astra.md`). | §3.5; P2-13a, P2-13b, P2-13d, P2-14b, P2-18, P2-19, P2-20 |
| R2 wrapper and accounting | Applied: the script is invoked with `&`, with the `Rows`, `Item` and `OverflowGroup` parameter sets; accounting in `try/catch/finally`; timeout at its limit; the sealed stage map; native exits checked; tools write their own CRLF receipts; fake-invoker tests | P2-13a; P2-16e; P2-18 to P2-20, P2-22 |
| R3 persistence and activation | Applied: row start and terminal records; per-group deferred retries; calibrate's `--output` as a base name; write-once snapshots; an immutable plan with an activation receipt; overflow groups; raw bindings; isolated self-test roots; B refused without the committed readout | `contracts.md` C4, C5, C8, C10, C12; P2-13d, P2-13c, P2-19, P2-20 |
| R4 comparator | Applied: component kept; smoke, `require` and twin cohorts apart; prefix equality only for the five wall-clock causes; the uncapped n-mid oracle `fr-frozen-uncapped`; stage-aware gates with "not due"; the `rowWork` adapter | P2-13b |
| R5 trace | Applied, with the frozen journal and link format so that `verdicts.rowLedger` judges coverage and closure unchanged (choice); dispatcher-level proofs; per-case journals; identity per task; raw no-window outcome at call end; negative fixtures | `contracts.md` C1 to C3, C9; P2-12d, P2-13r, P2-12c |
| R6 triggers | Applied: the full OR predicate, attempts beyond 3 and set-prefixed clock causes included; all-attempt no-window counts; bound historical readings; unresolved coverage | `contracts.md` C6, C11; P2-06, P2-12a, P2-13c |
| R7 selector | Applied: the `conclude` object verbatim; the `Select-String` gate; literal vectors from the frozen v4 synthetic cases (`self-test.mjs:11175-11258`), plus budget, overshoot and skip cases whose expectations were computed on the frozen selector (`E/sa-opus/p2-05-vectors.mjs`, `.jsonl`; choice) | P2-04, P2-05a, P2-05b |
| R8 prior | Applied: the pure rule in P2-01; dispatch and serial-path tests; the end-to-end transport proof on the diagnostic copy in P2-12e; the saved-steps test in `tests/replay-model.test.js` | P2-01, P2-07, P2-08, P2-12e |
| R9 guard lifetime | Applied: `responseGuard`; one composite timer; standalone and legacy guards cleared when settled; fixture updates; the distinguishing tests | P2-11a, P2-11b |
| R10 replay and cutover | Applied: family-dependent default fixture; `--file` wins; refusal reads the old fixture; `steps`, not `events`; nonempty samples; enumerated cutover edits | P2-14a, P2-14b, P2-15 |
| R11 real glue and widths | Applied: a scripted-rating copy that keeps the production chain; real widths 1, 2 and 4; the legacy 26x26 replay `matched`; nonempty samples; real forwarding. Review 2 makes P2-12d a prerequisite of P2-16c (R2-03). | P2-16c, P2-16a, P2-12e |
| R12 browser | Applied: the watchdog pattern and one scaled clock; named fixtures and envelopes; held set and batch assembly; per-check watchdogs; a durable receipt; cleanup in `finally` | P2-16e, P2-16b |
| R13 binding and guards | Applied: the seal binds the phase-2 tools and their inputs; browser receipts bind their sources; the today worktree is verified; G-COPIES is phase-aware; G-PROTECTED gains `--diff-filter=CDMRTUXB` | §3.4; P2-12b, P2-13a, P2-16b |
| R14 gates and publication | Applied: focused gates and four full-suite points; P2-18 commits once; P2-22 reports CI truthfully and checks `headRefOid`; P2-17's README line verbatim; tooling re-estimated (78.25 h) | §3.3; P2-17, P2-18, P2-22 |
| R15 parallel | Applied: D-P2-17; three lanes, at most three developers; absolute roots; read-only junctions; frozen contracts before lane T; no 3.25-h task (the events go to P2-04, their tests to P2-05b); own test files; P2-16b's guide line in P2-17; merge order C, S, T; the shared-file exceptions listed; bookkeeping as an execution convention. Choice: five slots, so a lane starts its next task while the previous one merges. | §3.7; every task header |

- **Review 2.** SA-Astra (reviewer), 2026-11-25, relayed 21:07: changes requested (`review-2.md`, R2-01 to R2-06 and
  its §8).
- **Revision 2.** SA-Opus applied every replacement, 2026-11-25, with one counter-position (in R2-04, one sentence),
  given with its evidence below. The 812-minute schedule is unchanged. The developer estimate rises to 85.75 h, because
  three new lane-T tasks hold work that did not fit the three-hour cap. `E/sa-opus/p2-review2-check.mjs` checks that
  each replacement text is present; its output is `E/sa-opus/p2-review2-check.md`.

| Finding | Disposition | Where |
|---|---|---|
| R2-01 reach evidence | Applied verbatim: the complete `rowWork` result persisted (P2-13d step 3.5; C9); `workLedger` only at the statistical boundary (P2-13b); the historical applicability and coverage text (P2-13c; C11); B8 over both final snapshots (P2-13c step 3). Of the four cases, three are in P2-13c; the end-to-end one is in P2-13f, because it reads the reach readings. | C9, C11; P2-13b, P2-13c, P2-13d, P2-13f |
| R2-02 raw glue | Applied verbatim: N-V4-16 from the raw outcomes, joined by `attempt` (C11; P2-13f, which now holds the glue and reach readings); P2-16c's raw-side check by `start` line and equal `call`; the worker header per destination (C1; P2-12d). Of the three cases, two are in P2-13f and one in P2-12d. | C1, C11; P2-12d, P2-13f, P2-16c |
| R2-03 prerequisites | Applied verbatim: the proof runner moved to P2-12b (0.5 h moved from P2-12c); P2-12e's focused gate names only its own test file; P2-16c starts after P2-12d, with a mandatory trace, and revision 1's conditional raw-side rule is removed; P2-16e's unit test uses its own fixture page; P2-16a writes gate 2 without running it. | §1, §3.7; P2-12b, P2-12c, P2-12e, P2-16a, P2-16c, P2-16e |
| R2-04 binding | Applied, in two new tasks: P2-13v (`binding.mjs`: `verifyRow`, `verifyProof` and the A4 and A5 gate functions, at the pack commit) and P2-13e (the seal, `sealSha256` on every record, resume, skip, publication and `loadSnapshot`). **Counter-position, one sentence:** "Do not equate this runtime fingerprint with the whole-tree `copyDigest`" assumes that `copyDigest` is a whole-tree digest. The frozen builder computes it with the copy's own `computeSourceDigest` (`tools/ig-proto/lib/tree.mjs:306-307`). So `runtimeDigest` must equal both recorded `copyDigest` values, and the whole-tree fingerprint is a new `filesDigest` (C13), which also binds the copy files outside `SOURCE_FILES`. Choices: the seal's inventory also holds `core/` and `tests/browser/`, so that A5 checks browser sources against the sealed shipping build; the run's source label is its `sourceCommit` (`meta-1`); uniqueness and quantity are checked through `report.meta.matrixDigest`. | §3.5; C4, C5, C7, C13, C14; P2-13a, P2-13b, P2-13e, P2-13v |
| R2-05 resource and browser gates | Applied verbatim: A4 and A5 (P2-13b's table, computed by `resourceGate` and `browserGate` of P2-13v); C12's owner continuation for A4 and A5; the three tests (P2-13b, with unit forms in P2-13v); P2-19's two catch filters. | C12, C15, C16; P2-13b, P2-13v, P2-19 |
| R2-06 small contracts | Applied verbatim: `rowsWritten` by the start join, with its two wrapper examples (P2-13a; C7); the reprice with its 2-s allowance and guard projection, 3,308 s and 4,135 s (P2-13c; C10; P2-20); P2-15's capture block, outside the list so that its here-string closes at column 0, and the two evidence scripts' own logs. | C7, C10; P2-13a, P2-13c, P2-15, P2-20 |
| §8 integration | Applied verbatim: the amend sentence under "A failed merge gate" (§3.7). The parallel model is regenerated from the amended dependencies and labelled a scenario (`sa-opus/parallel-schedule.md`). | §3.7 |

- **Review 3.** SA-Astra (reviewer), 2026-11-25, relayed 21:52: the R2-04 counter accepted; two corrections
  (`review-3.md`, R3-01 and R3-02).
- **Revision 3.** SA-Opus applied both verbatim, 2026-11-25. No counter-position, no estimate or schedule change.
  `E/sa-opus/p2-review2-check.mjs` now also checks review-3's texts.

| Finding | Disposition | Where |
|---|---|---|
| R3-01 `seal --check` | Applied verbatim: the creation-only refusals (HEAD equal to `--commit`, a clean tracked worktree) are not repeated by `seal --check`; ledger lines, published observations, readouts, task logs and commits of only such files are allowed; a sealed-file change still fails. P2-13e exports `checkSeal`, injects `sourceDigestOf`, and adds the case `the check allows ledger-only changes and refuses sealed changes`. | C13; P2-13a step 3, P2-13e step 2 |
| R3-02 positive receipt predicates | Applied verbatim in P2-13v steps 4 and 5: A4 passes only `measured` with margin `ok`; A5 passes only `pass` with the complete C16 inventory and a finite, nonnegative `CHECK-END PASS` reading of at most 60 s; absent or unknown values are incomplete. The four requested cases extend the two gate tests. Choice: C16 and P2-16e now say "base name without its extension", so the producer binds `deadline.js` as A5 requires. | C16; P2-13v, P2-16e |
