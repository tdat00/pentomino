# improve-generating (Pentomino), phase 0 — prototype task pack: index and acceptance

**Scope:** prototype harnesses that measure the estimates of the joint report
([`docs/improve-generating/report.md`](../../docs/improve-generating/report.md)) on this machine before any `gen-v4`
design. First the headline rows of report §2 (14x14, 15x15b10, 12x12 and 26x26 Nightmare, Master, Hell 1 26x26) before
and after a prototype of P1 to P5 on paired seeds; then the multipliers behind them (PM4's screen certificate and the
`W_screen` variants, PM3's probes and variants, the first-phase factor of P6 and P8); then a reduced first slice of PM1
tranche 1 and PM2 on 10x10 and 12x12. Measurement only: nothing in `core/`, `generator/`, `player/` or `tests/`
changes (plan author's "Direction after the joint report"; owner instruction of 2026-11-14: "create prototype code to
verify the estimates in the report; only prototype code that checks puzzle generation; do not change other functions
of the generator source; give difficulty-v3 priority for resources").
**Status:** written and cross-reviewed (gpt-6-astra, 18 findings applied); provisional round complete (IGP-00 to IGP-07 and IGP-03h accepted, 2026-11-15). Nine tasks: IGP-00 to IGP-07 and the follow-up IGP-03h.
**Label:** every number of this round is **provisional (pre-freeze)**. It is measured on the `rating-v3` runtime of
this worktree (runtime commit `cd5d17f`; the worktree head `0e1283e` adds documents only). Its source digest is MP12b1's
(`34cea386…`, the `sourceDigest` of every MP12b1 report, whose `sourceCommit` is `917052a`), so the same seed gives
MP12b1's puzzles; IGP-00's self-test recomputes the digest. The plan author wants the gating numbers on the frozen
post-MP17 source; every harness re-runs there with one command per task (§6).
**Traceability:** report.md §2, §3, §4 and §6; [`clarifications.md`](../../docs/improve-generating/clarifications.md):
the plan author's answers to IG-P-Q01 to IG-P-Q16, "Direction after the joint report" and the owner decisions of
2026-11-14 (OD-P1 and OD-P2 approved, IG-P-Q02 open, phase 0 confirmed); [`plan.md`](../../docs/improve-generating/plan.md)
§3 (P1 to P8) and §5 (PM1 to PM4); the analysts' P1 to P5 scenario rows (`claude-opus-5.5/2-cross-review.md` §1.3-§1.5
and `gpt-6-astra/2-cross-review.md` §6). The measured baselines are MP12b1's reports in
`docs/difficulty-v3/landscape-v3-full/` and the slice reports it reused in `docs/difficulty-v3/landscape-v3/r2/`.
**Execution:** one `claude-sonnet-5.5` developer per task, one task at a time, in this worktree (branch
`improve-generating`). The orchestrator reviews, fills the Execution logs and the §5 rows, commits and pushes. Developer
questions go to the pack author (agent Opus, claude-opus-5.5) through the orchestrator.
**Code base:** `0e1283e`. Line anchors quote that tree; a later task finds an anchor by its quoted text.

Each task carries the design it needs: algorithms, cells, seeds, sample sizes, commands and record formats. They are
decisions of this pack (§4), not open questions for the developer.

## 1. Task index

| Done | ID | File | Title | Depends on | Size | Machine time (projection) | Confirms or refutes (§5 rows) | Order |
|---|---|---|---|---|---|---|---|---:|
| [x] | IGP-00 | [00](00-harness-foundation.md) | Harness foundation: copies, variants, bounded runners, lanes, records, identity | none | Large, about 1,300 lines | 9 min | harness fidelity (R00) | 1 |
| [x] | IGP-01 | [01](01-p1p5-prototype-headline.md) | PM3 prototype of P1 to P5 and the headline before/after | IGP-00 | Large, about 950 lines | 62 min (high 78) | report §2 rows 14x14, 15x15b10, 12x12, 26x26 Nightmare, two Master cells, Hell 1 26x26; dead-end share; window profiles; batch waves; locate profiles (R01 to R08, R10 to R13, R18, R19, R29) | 2 |
| [x] | IGP-02 | [02](02-pm4-screen-certificate.md) | PM4: the screen certificate and the `W_screen` economics | IGP-00 | Medium, about 450 lines | 25 min | IG-P-Q01's certificate; P2's saving; useful ratings lost at 95, 190 and 380 M (R14, R15, R17) | 3 |
| [x] | IGP-03 | [03](03-pm3-variants-and-budgets.md) | PM3 variants (W 95 and 380 M, no screen, arity 3) and the P5 budget inputs | IGP-01 | Medium, about 330 lines | 23 min | IG-P-Q08, Q09, Q10; the screen's share of the gain and of the clue-count shift (IG-P-Q17); re-rating cost (R16, R18, R20, R21, R32, R33) | 4 |
| [x] | IGP-03h | [03](03-pm3-variants-and-budgets.md#follow-up-igp-03h-the-no-screen-arm-on-hell-1-and-more-12x12-seeds-optional) | Optional follow-up: the no-screen arm on Hell 1 26x26; optionally on Hell 1 20x20 and more 12x12 seeds | IGP-03, IGP-06 | none (a report-only addition allowed) | about 5 min (+11 optional) | R33 on Hell 1 and 12x12 (IG-P-Q17); a request-level indication for Hell 1 on 400 cells (IG-P-Q16, OD-P4) | 7a |
| [x] | IGP-04 | [04](04-first-phase-factor.md) | First-phase factor: P6, and eight workers as an unadmitted upper bound | IGP-01 | Medium, about 200 lines | 28 min | P6, P8's upper bound, the ÷1.9 assumption, memory (R22, R23, R25, R26) | 5 |
| [x] | IGP-05 | [05](05-pm1-tranche1-slice.md) | PM1 tranche 1, reduced first slice | IGP-00 | Medium, about 450 lines | 23 min | windows of Hell 1 on 215-484 cells, Hell 2, Hell 3; fine counts; failed Hell 1 sets (R27 to R29) | 6 |
| [x] | IGP-06 | [06](06-pm2-kernel-profile.md) | PM2 rating profile on 10x10 and 12x12 Nightmare | IGP-00 | Small, about 300 lines | 8 min | P7's sensitivity; IG-P-Q12 (R24, R30) | 7 |
| [x] | IGP-07 | [07](07-results-summary.md) | Estimate-vs-measured summary and re-run index | IGP-01 to IGP-06 | Small, about 250 lines | none | the §5 table and R31 | 8 |
|  |  |  | **Total** |  |  | **about 178 min (actual so far: §7)** |  |  |

Sizes count new harness lines. Developer time comes on top: about 3 to 4 hours each for IGP-00 and IGP-01, 1 to 2
hours for the others. Machine time is counted as in §7 (node time plus the wrapper's 45 s quiet period per locked
command; longer waits while difficulty-v3 runs are not counted).

## 2. Order, ownership and protocol

### Order

Strictly one task at a time, in the order of §1. IGP-01 comes right after the foundation so that the headline rows get
paired before/after numbers first (orchestrator's instruction for this round). IGP-01 re-rates every accepted prototype
puzzle canonically, so a failure of the screen certificate cannot leak into its numbers; PM4 (IGP-02) then covers the
certificate in full. The frozen round may follow the plan author's order instead (PM4 and PM1 tranche 1 first,
`clarifications.md` "Next actions" 2): the run plans are independent files.

### Exclusive ownership

| Task | Owns (creates or edits) | Must not edit |
|---|---|---|
| IGP-00 | `tools/ig-proto/` (new): `README.md`, `lib/paths.mjs`, `lib/records.mjs`, `lib/tree.mjs`, `lib/engine.mjs`, `lib/sets.mjs`, `lib/calls.mjs`, `lib/lanes.mjs`, `lib/lane-worker.mjs`, `lib/budget.mjs`, `firewall.mjs`, `boards.mjs`, `data/boards-v1.json`, `variants/base.json`, `variants/instr.json`, `variants/log.json`, `variants/files/log/core/engine/ig-log.js`, `arm.mjs`, `identity.mjs`, `self-test.mjs`, `run-task.ps1`, `plans/IGP-00.json`; evidence `docs/improve-generating/evidence/provisional/IGP-00/` | every file outside `tools/ig-proto/` and its evidence folder |
| IGP-01 | `tools/ig-proto/`: `variants/p1p5.json`, `variants/p1p5-main.json`, `variants/files/p1p5/core/engine/ig-select-proto.js`, `fit-prior.mjs`, `data/prior-v1.json`, `verify.mjs`, `compare.mjs`, `plans/IGP-01.json`; additions to `lib/tree.mjs` (`paramFiles`), `ig-log.js` (the API the prototype calls), `self-test.mjs` (`--proto`) and `README.md`; the IGP-00 review fixes, first and only those: `run-task.ps1` (charging of failed invocations), `variants/instr.json` and `ig-log.js` (main-search and census R7 cuts apart), `lib/calls.mjs` (`r7CutCensus`; `recordedCall` refuses a `log`-chain tree), `lib/lanes.mjs` (`setHorizon` only lowers); evidence `IGP-01/` | as IGP-00; IGP-00's tested behaviour (an addition keeps the IGP-00 self-test passing) |
| IGP-02 | `tools/ig-proto/pm4.mjs`, `plans/IGP-02.json`, `README.md` (one section); evidence `IGP-02/` | as IGP-00; `lib/` except a bug fix the review names |
| IGP-03 | `tools/ig-proto/variants/p1p5-w095.json`, `p1p5-w380.json`, `p1p5-w760.json`, `p1p5-main-a3.json`, the arity-3 branch of `ig-select-proto.js`, `budgets.mjs`, additions to `compare.mjs` (task-qualified arms; per-`W`, split, shift, offset and arity-3 sections; the w760 journal check) and `self-test.mjs` (their cases), `plans/IGP-03.json`; evidence `IGP-03/` | as IGP-00; the default path of `ig-select-proto.js` (the IGP-01 numbers must stay reproducible); `pm4.mjs` (IGP-02's `run.json` pins its hash) |
| IGP-04 | `tools/ig-proto/variants/p6.json`, `w8.json`, `log-p6.json`, `log-p6-w8.json`, `p1p5-main-p6-w8.json`, the P6 branch of `ig-log.js` (`withP6`) and its call in `ig-select-proto.js`, additions to `compare.mjs` (factors, identity across arms, memory; first, the IGP-03 review's arity-3 note) and `self-test.mjs` (`--p6`), `plans/IGP-04.json`; evidence `IGP-04/` | as IGP-00; the default paths of `ig-log.js` and `ig-select-proto.js` |
| IGP-05 | `tools/ig-proto/pm1.mjs`, `plans/IGP-05.json`, `README.md` (one section); evidence `IGP-05/` | as IGP-00 |
| IGP-06 | `tools/ig-proto/pm2.mjs`, `pm2-worker.mjs`, `plans/IGP-06.json`, `README.md` (one section); evidence `IGP-06/` | as IGP-00 |
| IGP-03h | `tools/ig-proto/plans/IGP-03h.json`; report-only additions to `compare.mjs` (the arm-only section for a cell without a before partner, `--pm1`, the by-seed screen-against-no-screen section across tasks, `--reproduce` with `--common-seeds`; accepted in the IGP-03h review); evidence `IGP-03h/` | as IGP-00; every other tool and variant (no measurement code) |
| IGP-07 | `tools/ig-proto/summary.mjs`, `plans/IGP-07.json`, `README.md` (the re-run index), `verify.mjs` (the wording of its record only, after the IGP-04 review); evidence `docs/improve-generating/evidence/provisional/summary.json` and `summary.md` | as IGP-00; every earlier record (read only) |

A record is written once. A correction is a new file with a suffix (`-r2`) and a line in the task's Markdown. Before the
task's reply, a report step that only reads published arms (`compare`, `budgets`) may be re-run through the runner
after a report-only change of its tool; the reply names the re-run and both harness hashes. Arm rows, journals and
states are never rewritten.

### Per-task protocol

1. Step 0 (orchestrator, once): this pack is committed on `improve-generating` (`improve-generating: phase-0 prototype
   pack (Pentomino)`).
2. The orchestrator launches the developer of the next task with the task file and this check-list.
3. The developer implements, runs the task's run plan through the runner (§7) and replies with the evidence of §8. It
   runs **no git command at all**, read-only ones included, and never edits this pack, an Execution log,
   `docs/improve-generating/plan.md`, `clarifications.md`, `report.md` or the analysts' folders.
4. The orchestrator reviews the result against the task's acceptance tables, runs `npm run check`, fills the Execution
   log and the §5 rows the task measured, and commits once per accepted task (`improve-generating IGP-NN: <title>`). It
   pushes at the milestones: after IGP-01 (the headline), after IGP-04 (the multipliers) and after IGP-07 (the round).
5. A rejected task goes back to its developer with the review notes; a defect found later goes back to the owner of
   the file as a fix round recorded in both Execution logs.

### Stops and questions

- **Stop for the pack author** only for a correctness or control failure: a production file changed (the firewall
  check); an accepted prototype rating that differs from its canonical rating; a certificate violation in IGP-02; a
  required identity that fails (§3 "Determinism"); an anchored edit that no longer matches; a tree, harness or flag
  change under a started shard; a started observation without its record (a killed or crashed invocation); a wrapper
  kill at 300 s (the bounds of §7 make it impossible, so it is a defect); the budget guard of §7.
- **Never a stop:** a slow cell, a low completion rate, a refuted estimate, a losing variant, a censored call. These are
  the measurements: they go into the records and §5 with their numbers, and the task goes on.
- **Never an automatic rerun** of a started observation. Only work that never started is resumed; anything else needs a
  fix-round decision of the pack author, and the earlier evidence stays.
- **Questions.** A developer never settles a design question (an algorithm, a cell, a seed, a sample size, a
  threshold, the meaning of a record field). It asks the pack author through the orchestrator; the answer is binding
  unless it needs the plan author or the owner.

## 3. Conventions for the harness

- **Where the code lives: outside every fingerprint (checked for this pack).**
  - Bench and calibration identity: `SOURCE_FILES` (`tools/bench/report.js:37-47`) hashed by `computeSourceDigest`
    (`tools/bench/report.js:662`): the `core/engine/*.js` files, three `core/browser/` modules,
    `core/workers/engine.worker.js` and four `tools/bench/` files. `tests/benchmark-report.test.js:289` requires every
    `core/engine/*.js` file to be listed, so a new engine file would fail `npm test`.
  - Published Generator and Player: `.github/workflows/pages.yml:17-22` copies `core`, `generator` and `player` (plus
    the root page files) into the site and stamps it; `tools/check-site.mjs:9` forbids `tools`, `tests`, `docs` and
    `tasks` in the artifact.
  - Puzzle and version identity: `progressFingerprint` (`core/engine/keys.js:459`) hashes board, pieces and clues;
    `ALGO_ID` `gen-v3` (`core/engine/version.js:4`), `POLICY_ID` (`core/engine/policy.js:17`), `MODEL`
    (`core/engine/difficulty.js:49`); the regression fixtures are written only by `tools/record-fixtures.mjs`.
  - Hence: the harness code lives in **`tools/ig-proto/`** (not hashed, not published, not in the `npm test` glob
    `tests/**/*.test.js`, not under `tools/bench/`, whose files are digest inputs). The convention checker scans
    `tools/` (`tools/check-conventions.mjs:8`), so the format rules hold there. Patched copies, logs and checkpoints
    live under **`tests/artifacts/ig-proto/`** (git-ignored by `.gitignore`, skipped by the checker). Records go to
    **`docs/improve-generating/evidence/<label>/<task>/`** (the plan's evidence folder, plan §5).
- **No git.** No developer command and no harness code runs git, read-only commands included. Identity comes from
  content: the source digest of `SOURCE_FILES`, the firewall manifest (`firewall.mjs`: SHA-256 of every file under
  `core/`, `generator/`, `player/`, `tests/` without `tests/artifacts/`, `tools/` without `tools/ig-proto/`, and the root
  files), the tree identities, and a source label the runner receives (`-SourceLabel`). Every tree patches its copy of
  `tools/calibrate.mjs` so that its `readSource` (lines 241-252) runs no git either (IGP-00 "meta" edits). The label of
  this provisional round stays `rating-v3 runtime cd5d17f (worktree 0e1283e)` for every task, even after commits of
  documents or of the harness move the worktree's head: it names the runtime and the pack's starting point, and the
  source digest (`34cea386…`, MP12b1's) is the identity of the measured code.
- **Copies, never edits.** A variant is a copy of `core/`, `tools/` (without `tools/ig-proto/`) and `package.json`
  under `tests/artifacts/ig-proto/tree/<variant>/`, with anchored text edits and added files (IGP-00 §2). Every edit's
  anchor must occur exactly once; otherwise the build stops and names the edit. A production file is never edited, not
  even for a moment.
- **Tree identity.** A tree's `treeId` is the SHA-256 over every copied source text, the resolved manifests, the
  copy-only files and the parameter files; the `harnessHash` covers `tools/ig-proto/lib/` and the driver scripts. Every
  shard, state file and checkpoint header records both; a run whose tree or harness differs from the one its shard
  started with exits before it measures anything. In every tree except `base`, the copy's `SOURCE_FILES` also lists the
  added engine files, so the copy's own source digest tells variants apart.
- **Modules.** Node tools are `.mjs`, with `// @ts-check` on the first line, JSDoc types, 2-space indent, single quotes
  and semicolons; no dependency is installed. Copy-only engine files under `tools/ig-proto/variants/files/` are `.js`,
  written for their place in a copy (`core/engine/`) with the engine's conventions; they may use `node:fs`,
  `node:worker_threads` and `performance.now()`, because a copy only runs in Node.
- **Paths.** `lib/paths.mjs` resolves the repository root as `fileURLToPath(new URL('../../../', import.meta.url))`
  (three parents of `tools/ig-proto/lib/`); `run-task.ps1` uses `Join-Path $PSScriptRoot '..\..'` (two parents of
  `tools/ig-proto/`). PowerShell commands in this pack use backslashes, and so do the file-system paths in plan files
  (escaped in JSON); the step tables of the task files show script paths with `/` for readability only. Record fields
  keep repository-relative paths with `/`: they are identifiers, not file-system paths.
- **Determinism.** Randomness comes only from seeded `createRng` streams named in the task; the prototype search draws
  only from `ctx.rng`. Results are written in job order, never in completion order. A run record's
  `details.puzzles[].clues` is a clue **count** (`tools/bench/runner.js:715-725`), so numeric summaries never prove that
  two runs made the same puzzles. The comparison of two runs of one seed uses three levels, each named as such:
  - **puzzle identity:** `details.resultDigest` (over the accepted layout keys, clue keys and scores, lines 726-730) is
    equal, compared whenever both runs accepted the same number of puzzles, partial responses included; or, between two
    arms that both carry the test-side keys (every tree except `base`, IGP-00 edit `instr-7`), the common prefix of
    `details.igPuzzleKeys` is equal, and `details.igSetKey` is equal (**prefix identity**);
  - **metric-prefix agreement:** the set summary (`details.K`, `sizes`, `setAttempt`) and the accepted puzzles' `clues`
    (count), `U`, `score`, `metrics.work` and `metrics.nodes` agree on the common prefix. It is the only check when the
    accepted counts differ and one side has no keys (MP12b1, `base`); the record then says "metric-prefix agreement;
    puzzle identity not established", never "identity";
  - a shorter run (fewer accepted puzzles) is a deadline effect and is recorded as such.

  Required (a failure is a stop): the `base` copy has the worktree's source digest; `base` and `log` agree with MP12b1
  on every seed at the strongest level available (a differing digest at equal counts, or a disagreement inside the
  common prefix, is a failure); `log`, `log-p6` and `log-p6-w8` agree on every seed by prefix identity, as do
  `p1p5-main` and `p1p5-main-p6-w8`; every accepted prototype rating equals its canonical rating (`verify.mjs`).
- **Records.** JSON with 2-space indent plus a Markdown summary; UTF-8 without BOM, CRLF, a final newline, no trailing
  whitespace; repository-relative paths with `/`; no absolute path. Raw files (copies, logs, checkpoints, profiles) stay
  under `tests/artifacts/ig-proto/`. A published JSONL file stays below 5 MB; above that, publish the per-call summary
  only and say so in the Markdown. Every JSON record has this `meta` block:

  ```json
  "meta": {
    "format": "ig-proto-<kind>", "version": 1, "task": "IGP-01",
    "label": "provisional", "labelText": "provisional (pre-freeze)", "createdAt": "<ISO time>",
    "source": {
      "label": "<-SourceLabel>", "sourceDigest": "<computeSourceDigest of the worktree>",
      "versions": { "algo": "gen-v3", "policy": "mixed-v2", "rng": "xoshiro128ss-v1", "model": "difficulty-v3", "app": "1.0.0" },
      "equalsMp12b1Source": true, "firewall": "<SHA-256 of the firewall manifest>"
    },
    "harness": { "harnessHash": "<sha256>", "files": { "tools/ig-proto/<file>": "<sha256>" } },
    "trees": { "<variant>": { "treeId": "<sha256>", "copyDigest": "<sha256>", "edits": ["<edit id>"], "params": {} } },
    "machine": { "cpu": "<model>", "logicalCores": 16, "totalMemoryBytes": 0, "node": "v26.13.0", "platform": "<os>" },
    "invocations": { "count": 0, "nodeSeconds": 0, "countedSeconds": 0, "lockWaitSeconds": 0 },
    "rerun": "pwsh -NoProfile -File tools\\ig-proto\\run-task.ps1 -Plan tools\\ig-proto\\plans\\IGP-01.json -Label frozen -SourceLabel <label> -LockHelper <path>"
  }
  ```

  Every Markdown record starts, after its title, with the banner: `> **Provisional (pre-freeze).** Measured on <source
  label> (source digest <first 8 hex>…, equal to MP12b1's source), not on the frozen post-MP17 source. Re-run:
  <command>.` (`frozen` records say "Frozen post-MP17 source" instead).
- **Kinds of numbers,** as in the report: *Measured*; *Derived* (computed from measured data; the record names the
  formula); *Projection* (depends on an assumption, which the record names). A proxy says so in its name.
- **Statistics.** `median`, `percentile` and `summarize` of `tools/bench/report.js:220-257` (median of an even count is
  the mean of the two middle values; p95 is nearest-rank), so that "today" reproduces the report's values. T10
  statistics use the requests that reached ten; completion is "reached ten of n" and is always shown beside a time. A
  paired comparison uses only matched cohorts (the same seeds in both arms).
- **Hand-off checks.** `npm run check` passes; `node tools\ig-proto\firewall.mjs check --task <id>` reports the
  production files unchanged against the snapshot taken at the task's start; under `tools/`, only `tools/ig-proto/`
  changed.

## 4. Decisions taken for this pack

| Id | Decision | Why |
|---|---|---|
| D-IG1 | Harness in `tools/ig-proto/`, copies and logs in `tests/artifacts/ig-proto/`, records in `docs/improve-generating/evidence/<label>/` | §3 fingerprint check; plan §5 names the evidence folder |
| D-IG2 | Every measured arm runs a patched copy of the source (a "tree"), never the worktree's modules: `base` (only the no-git edit of the copied `tools/calibrate.mjs`), `instr` (instrumentation, diagnostic offers), `log` (durable per-probe logs of today's search), `p1p5-*` (the prototype), `p6`, `w8` and their compositions | one mechanism for all tasks; module identity stays consistent inside a copy; production files are never touched |
| D-IG3 | Request-level arms use MP12b1's seeds `landscape/<case>/<rep>` (explicit `seeds` of a bench matrix), so that the "before" arm reproduces MP12b1's puzzles and both arms pair seed by seed; harness corpora use their own seeds (`ig-pm4/…`, `ig-pm1/…`, `ig-pm2/…`, `ig-selftest/…`) | pairing, identity check, and no reuse of the measured seeds for fitting |
| D-IG4 | Matched cohorts in IGP-01: on the fast shard (26x26 Nightmare reps 0-5, 14x14 and 26x26 Master reps 0-4) and on the slow cells (14x14, 15x15b10, 12x12 Nightmare and Hell 1 26x26, reps 0-2) both arms run the same seeds. No after-only extension. They can show a large factor; they cannot give a p95 | 3 h machine budget; one slow request per invocation (D-IG12) |
| D-IG5 | The prototype implements P1 (sequential bracketing on one nested family), P2 (screen with the certificate of IG-P-Q01), P3 (a screen-capped profile reads as too few clues), P4 (a fitted table prior), P5 (fail at once only on a canonical no-window verdict; budgets recorded, not enforced), with IG-P-Q07's AR1 direction. `W_screen` in IGP-01: 190 M for Master and Nightmare, 380 M for the Hell levels; IGP-03 adds 95 M (control) and 380 M on Nightmare, and the prototype without the screen (760 M, the canonical limit) on 14x14 and 12x12 Nightmare (IGP-02 review, IG-P-Q17) | IG-P-Q01, Q07, Q09, Q17; Hell 1's useful ratings are near the cap (report §4) |
| D-IG6 | P4's table prior: per cell, the median clue share of the accepted puzzles of MP12b1 reps 10-19 (held out from the measured reps 0-9), with its source and version recorded. The per-set calibration prior is not prototyped (it needs a new payload field) | IG-P-Q03 and Q04; no in-sample fit |
| D-IG7 | The re-rating rule of IG-P-Q01: a call that would end without a final in-band result first re-rates canonically up to four screen-capped profiles nearest the window (by distance to the window count, then the higher count, then probe order). The four are one **shared allowance per call** (`rerateMax`): the no-window rescue of phase A and the end-of-call re-rating draw from it, and so would the window re-rating. The "re-rate when the bracket closes" reading is deferred to a later round (IGP-02 review): on IGP-01's journals it would fire on 2 of 39 calls on 12x12 Nightmare (7 of 48 on 14x14, 10 of 47 on Hell 1 26x26), and it re-rates probes one clue below the window count, so it acts on IG-P-Q17's clue-count shift and is measured with the criterion that answer chooses | the plan author's rule first; one allowance keeps a call's extra canonical work bounded and comparable across variants |
| D-IG8 | The arity-3 set-stage variant (IG-P-Q08) is simulated in one worker; its T1 effect is an idealised call-level Projection (a lower bound on T1, assuming idle lanes); every probe, wasted ones included, is counted; nothing is adopted from it | the smallest prototype that gives the number; the real set stage already runs attempts in parallel |
| D-IG9 | Not prototyped in this round: P7 (PM2 gives a sensitivity only), the per-set calibration prior, P5's enforced budgets and attempt limit, a lowered `N_screen` (the plan author's first version does not lower it), P8's width and admission rules (IG-P-Q05; eight workers are run only as an unadmitted upper bound), walked layouts and the held-out window audit (PM1 tranche 2), the error rate of estimated AR1 directions (needs a raised census budget), repeated exact states (PM2, later), browser runs, 16x16 and 15x20 Nightmare | outside the 3 h budget or not needed for the numbers of this round |
| D-IG10 | PM1 tranche 1 is reduced to a first slice of about 0.8 worker-hours (IGP-05). The rest of tranche 1 (about 9 worker-hours, 2.5 h on four lanes) is a later round that needs the owner's approval | tranche 1's 10 worker-hours do not fit the 3 h budget |
| D-IG11 | Budget guard: before every locked invocation the runner computes the allowance left (the task's §1 allocation with a 25 % margin, and the round's 180 minutes, each less what was counted) and gives the invocation a horizon that fits it; when the horizon is too short for the step's smallest unit of work, it stops and asks for the orchestrator's approval (`-ApprovedRoundMinutes`, `-ApprovedTaskMinutes`), which is logged. Forecasts (`projectS`) only feed the projection tables | owner's budget for this round; an invocation can never take more than its horizon, whatever it was forecast to take |
| D-IG12 | Bounded invocations: every locked command ends by its horizon (at most 285 s) by construction (§7): one-row calibrate runs with an admission check, supervised calls cut before the horizon and recorded as censored, supervised rating jobs admitted by a fixed bound, families checkpointed after each probe | the wrapper's 300 s kill must never act as the sharder |
| D-IG13 | Frozen-round Hell cells: the board catalogue is frozen now (`data/boards-v1.json`, every landscape case of this source), and every tree except `base` bypasses the offer check of `pieceCountPlan` (copy only, `diagnosticOffers`), so that PM1, PM4 and the Hell headline can still examine Hell cells that the frozen source no longer offers. Such a run is labelled "diagnostic offer"; it never enables a production offer | the plan author's main phase-0 question (Hell 2 and 3 windows) must stay answerable on the frozen source |

## 5. Estimate vs measured (filled by IGP-07, provisional)

The estimates are the analysts' **P1 to P5 scenario rows at four workers** (Opus: `claude-opus-5.5/2-cross-review.md`
§1.3-§1.4, reconciled factors applied to today's medians; Astra: `gpt-6-astra/2-cross-review.md` §6, "First search work
P1-P5, 4W"), all Projections. The plan author: report midpoints and these values order the work; they are not gates.
Descriptive verdicts (IGP-07): for a time, **below both**, **between** (each analyst's value widened by a factor 1.35
for the small samples) or **above both**, and **inconclusive** with fewer than three after-arm values (requests that
reached ten) in the matched cohort; a paired factor is always given with its n and is no factor estimate below n = 3
(14x14 Nightmare in IGP-01: n = 1, because today reaches ten on one of its three seeds; its response ratio and
completion carry the comparison). For a factor with a stated range, **inside** or **outside**; for R14, **holds** or
**fails**. A row that uses an unmeasured factor (P7) stays a Projection. A faster request that delivers fewer puzzles is
never read as a gain: completion is always shown beside. The estimates assume today's puzzle population; a measured
shift of the accepted puzzles (R32) is reported beside every time verdict of the cell.

| Row | Quantity | Estimate (kind; source) | Measured, provisional | Task, record | Verdict |
|---|---|---|---|---|---|
| R00 | Harness fidelity: `base` and `log` agree with MP12b1 (puzzle identity by digest where the accepted counts are equal; otherwise metric-prefix agreement, puzzle identity not established) | required agreement | identity on 4 / 28 / 14 seeds (IGP-00 / IGP-01 / IGP-04 A); arm E reproduces IGP-01's after arm | IGP-00 `identity` | holds |
| R01 | 14x14 Nightmare today: T10 median / p95, ten of 20 | 112.98 / 151.64 s, 11 of 20 (Measured; MP12b1) | 46.54 s, n 1 of 3 reached ten; drift 1.009 | IGP-01 `compare` | inconclusive |
| R02 | 14x14 Nightmare after P1-P5, four workers: T10 median | Opus 17.7 s (112.98 / 6.4); Astra 16.0 s (tail 21.5-35.3) | 8.94 s (n 3); response x20.3; clue share 0.190 -> 0.255; paired n 1, no factor estimate | IGP-01 | below both |
| R03 | Completion after P1-P5 on 12x12, 14x14 and 15x15b10 Nightmare | Opus about 19-20 of 20 after all phases; Astra unknown (report §3) | after arm 3 of 3 on each of the three cells (n 3; cannot separate 19 from 20 of 20; a lower bound for after-all) | IGP-01 | inside |
| R04 | 15x15b10 Nightmare after P1-P5: T10 median | Opus 13.8 s (86.23 / 6.25); Astra 13.7 s | 8.45 s (n 3); x8.22 (paired n 2, no factor estimate) | IGP-01 | below both |
| R05 | 12x12 Nightmare after P1-P5: T10 median | Opus about 39-48 s (P1 and P4 about 1.3 to 1.6); Astra 44.5 s | 5.74 s (n 3); x9.26 | IGP-01 | below both |
| R06 | 26x26 Nightmare after P1-P5: T10 median | Opus 15.5 s (18.61 / 1.2); Astra 17.8 s | 11.94 s (n 6; band 11.48-24.03); x2.01 | IGP-01 | between |
| R07 | Master after P1-P5 (14x14 and 26x26) | unchanged (both); today 2.57 s and 8.36 s | against the matched before arm: 14x14 2.66 vs 3.17 s; 26x26 13.43 vs 12.26 s; 380 M 11.85 s; paired 1.25 / 0.83 / 0.79 (geometric mean 0.98, n 5); drift vs MP12b1 1.24x / 1.47x | IGP-01; IGP-03 (26x26 at 380 M) | between x3 |
| R08 | Hell 1 26x26 after P1-P5: T10 median; ten of n | Opus about 28 s; Astra 50-60 s; both only if a window holds | 37.25 s (n 3); x5.03 (paired n 2, no factor estimate) | IGP-01 | between |
| R09 | 16x16 and 15x20 Nightmare after P1-P5 | not measured in this round (D-IG9) | not measured | | later round |
| R10 | Dead-end share of today's batch profile time | a heuristic 30-60 % on 196-300 cells; 5-10 % on 12x12 and 18x18 (report §4) | batch share 14x14 39.7 %, 15x15b10 37.1 %, 12x12 18.7 %; other cells no estimate | IGP-01 `before` arm | inside, inside, outside |
| R11 | Dead-end entries per call after P1-P5 | expected none (a hypothesis, not a requirement) | 0 dead-end entries on 7 cells | IGP-01 | holds |
| R12 | Window profiles per successful call | about four (a scenario parameter, report §2) | mean window profiles per ok call 0.84-2.45 on five cells; 26x26 Master 3.62; Hell 1 4.15 (band 2.96-5.40) | IGP-01 | below x5, inside x2 |
| R13 | Batch waves for nine slots at four workers (a proxy) | 2.25 (Opus) or 2.75 (Astra) | 12x12 3.38; other cells 3.84-6.24 | IGP-01 | between (12x12); above both x6 |
| R14 | Screen certificate (IG-P-Q01 (b)): certified screens equal canonical | 0 violations required; otherwise fallback (c) | 0 violations of 862, no coverage gaps | IGP-02 | holds |
| R15 | Useful ratings lost (in band, screen-capped) at 95 / 190 / 380 M | "95 M is low for Nightmare"; 190-380 M is about 0.6-1.2 s of main work (report §4, IG-P-Q09) | useful ratings lost 19 / 13 / 9 of 47 at 95 / 190 / 380 M | IGP-02 | measured (no estimate) |
| R16 | Work per accepted puzzle at 95 / 190 / 380 M and without the screen (14x14 and 12x12 Nightmare) | the minimiser picks W (IG-P-Q09); on 12x12, P2 gives "about nothing" | least work at 95 M on 14x14 and 12x12 (IGP-03, n 2); 12x12 six seeds: no screen / 190 M T10 x1.56 (geometric mean 1.65); c5 paired work 2,676.0 vs 1,182.4 M units | IGP-03 | measured (no estimate) |
| R17 | P2's saving on today's call profiles | the capped share at the start count (3-89 %) times the cap's cost less the screen's | saving 4.0 / 2.7 / 1.7x | IGP-02 | measured (no estimate) |
| R18 | Canonical re-ratings per call and their share of work | priced in PM4 and PM3 (no number) | no re-rating in 942 calls | IGP-01, IGP-03 | measured (no estimate) |
| R19 | Locate profiles per call with the table prior (P4) | "2 to 6 profiles per candidate instead of up to 64" (plan P4); P4 x 1.05-1.15 (report §4) | median locate probes per call 2 (Hell 1 4; 14x14 Master 1: the prior hits at once); P4 factor not isolated, not measured | IGP-01 | inside x6, outside x1 |
| R20 | Arity-3 set stage: probes counted, idealised call-level T1 bound | adopted only with a clear gain (IG-P-Q08) | arity-3 bound / main 1.01 and 0.99; no clear gain: nothing adopted | IGP-03 | measured (no estimate) |
| R21 | P5 budget inputs: share of ok calls whose work passes 1 to 12 G units | the 6 G figure is withdrawn (IG-P-Q10) | beyond 6 G units: 0 % (main), 3 % (a3) | IGP-03 | measured (no estimate) |
| R22 | P6 factor on T10 | x 1.03-1.2 at Nightmare, x 1.15-1.6 at Master | A:B level-pooled T10 factor: Nightmare 1.322 (n 4); Master 1.148 (n 8; cells 1.181 inside, 1.117 outside) | IGP-04 | outside (+0.122); outside (-0.002) |
| R23 | Eight workers, unadmitted upper bound | batch x 1.3-1.9 (likely 1.6), set stage x 1.0-1.3 | B:C batch 1.257 / 0.946, set stage 0.939 / 0.724 (Nightmare / Master); A:C beside; twin-call slowdown 0.92 / 0.80 / 0.78; 16 logical cores | IGP-04 | outside x4 |
| R24 | P7 sensitivity | x 1.1-1.8 (likely 1.3); PM2 first | kernel about 96 % of rating time (89.4-99.9 % by class); P7 needs about 1.9-2.1x kernel speed for /1.9 | IGP-06 | Projection |
| R25 | First-phase factor P6 x P7 x P8 on T10 (Projection: P7 assumed) | ÷1.9 (Opus's illustrative assumption) | /1.9 inside the band (measured factor x P7 1.1-1.8) only for 26x26 Nightmare and Master; outside for 12x12, 14x14 Master and the prototype (P7 needed 1.87) | IGP-04, IGP-06 | Projection |
| R26 | Memory at eight workers: both bench criteria | can exceed 1.5 GiB in the worst case (2,092 MiB accounted) | accounted peak 450 of 2,092 MiB; process peak 914 of 1,536 MiB (worst-case ceiling stands) | IGP-04 | holds |
| R27 | In-band ratings on Hell 1 at 215-484 cells, Hell 2, Hell 3 (score-in-band and AR1-eligible apart) | unknown: no in-band rating ever observed (report §2, IG-P-Q16) | in band: Hell 1 47 / 389, Hell 2 8 / 404, Hell 3 0 / 201 ratings; request level: Hell 1 20x20 without the screen 7 of 20 accepted puzzles censored (35 %), 26x26 without the screen 20 of 20 | IGP-05 | measured (no estimate) |
| R28 | Why Hell 1 sets fail on 14x14 and 24x24 | unknown | 8 of 8 failing sets dead-end at the start count; 7 of 8 have eligible windows at +2 to +11 | IGP-05 | measured (no estimate) |
| R29 | Capped share at the start count; window counts (14x14, 12x12, 26x26 Nightmare) | 0.89, 0.53, 0.10 (`claude-opus-5.5/2-cross-review.md` §1.2, from MP12b1's samples; report §1 gives only the range 78-89 %) | 0.906 / 0.652 / 0.083 (IGP-01 before arm); PM1 part 2 counts in the summary | IGP-01 `before`, IGP-05 | measured (no estimate) |
| R30 | Rating-time shares by phase and function on 10x10 and 12x12 Nightmare | unknown; P7 and P11 targets (IG-P-Q12) | 12x12: search 91.3 %, census 4.4 %, DLX 4.0 % (phases firm; categories indicative) | IGP-06 | measured (no estimate) |
| R31 | After all phases (Projection): measured P1-P5 ÷ (measured P6 x eight-worker bound, with a stated transfer range) ÷ P7 assumption | the analysts' after-all values: 14x14 8.0 / 7.94 s, 15x15b10 6.3 / 7.22 s, 12x12 16 / 21.7 s, 26x26 7.0 / 8.84 s, Hell 1 26x26 15 / 25-30 s | likely after all 14x14 6.8, 15x15b10 6.4, 12x12 4.4, 26x26 9.1, Hell 1 28.3 s (fast / slow in the summary; likely factor 1.01, range 0.93-1.53; P7 1.3) | IGP-07 | Projection |
| R32 | Population of the accepted puzzles, before (and MP12b1's 20 reps) against after: clue share p10 / median / p90, U, score position in the band, central share, per cell | the same population (implicit in both analyses' factors) | clue-share median after vs MP12b1 +0.033 to +0.077 on the Nightmare and Hell 1 cells (-0.029 to +0.013 on Master); after vs the before arm up to +0.112 (per cell in the summary) | IGP-01 `compare-r2`; IGP-03 per `W` | no verdict |
| R33 | The split of P1-P5's gain and of the clue-count shift between the search without the screen and the screen (before → no screen → 190 M on 14x14 and 12x12 Nightmare), with the shift's two parts: requests served on an earlier set than today's; the clue shift on the same set | none in the analyses (added after IGP-02); IG-P-Q17's addendum gives a rough split, an indication only: on today's call profiles the screen alone saves 2.0 times on 12x12 and 4.0 on 14x14 Nightmare | 12x12 six seeds: no screen x2.91 over today, 190 M x1.56 over no screen, shift +0.75 clues; Hell 1 0.88 | IGP-03 `compare`; IGP-03h on Hell 1 26x26 (optional) | no verdict |

## 6. Re-run on the frozen source

When difficulty-v3 is frozen (after MP17) and the orchestrator has brought `improve-generating` onto that source:

1. `node tools\ig-proto\lib\tree.mjs check-edits --all` (no lock: it builds nothing and rates nothing). It lists every
   anchored edit that no longer matches. Edits of `core/engine/clues.js`, `core/engine/generate.js`,
   `core/engine/policy.js` and `tools/calibrate.mjs` are expected to need new anchors after MP12b3, MP13a, MP14a and
   MP14b. The pack author re-derives them (a maintenance change of `tools/ig-proto/variants/`, recorded in IGP-07's
   re-run index); the developer does not.
2. Per task, in the order the plan author wants (PM4, PM1, PM3, PM2):
   `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-0N.json -Label frozen
   -SourceLabel <label> -LockHelper <path>`. Records go to `docs/improve-generating/evidence/frozen/`; nothing
   provisional is overwritten.
3. `node tools\ig-proto\summary.mjs --label frozen`.

On the frozen source the "before" arms measure the frozen `gen-v3`; MP12b1 is then a different source, and the
identity rows report "different source" instead of a stop. Cells come from the frozen catalogue `data/boards-v1.json`;
a cell that the frozen source no longer offers runs as a "diagnostic offer" (D-IG13) and is labelled so. The pack author
sets the frozen round's sample sizes when that round is approved (the plans carry the reps; a frozen plan may widen
them), with its own budget.

## 7. Machine, priority and lock protocol

difficulty-v3 has priority on this machine. The Sudoku repository's difficulty-v3 runs are active; Pentomino's
difficulty-v3 is paused (P-OD11) until Sudoku reaches MS07e, but its lock rules still apply; Sudoku's improve-generating
pack competes for the same quiet slots.

- **One wrapper.** Every command that may run longer than 10 s goes through `Invoke-IgNode` of the low-priority helper
  `$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1` (the orchestrator
  gives the new path if it moves). The runner `tools/ig-proto/run-task.ps1` dot-sources it from `-LockHelper` and calls:

  ```powershell
  . $LockHelper
  Invoke-IgNode -Repo pentomino -Task '<task> <step>' -NodeArgs @('--max-old-space-size=2048', '<script>', '<arguments>', '--label', '<label>')
  ```

  The helper starts only after both difficulty-v3 locks (`dv3-sudoku.lock` and `dv3-timing.lock` in `$env:TEMP`) have
  been absent for 45 s, holds the Pentomino lock (`dv3-timing.lock`) while node runs, kills the process tree at 300 s and
  throws on a non-zero exit. It has no environment parameter: configuration goes into the node arguments.
- **Never** use `Invoke-Dv3Timed`, MP12a's launcher or any difficulty-v3 wrapper for this pack; never create, hold or
  delete a lock file by hand; never run a timed command, a generation or a rating corpus outside the wrapper. Commands
  that take seconds and rate nothing (building a tree, the firewall, publishing, comparing, reports, summaries,
  `npm run check`) run directly.
- **Exit protocol.** A locked script exits 0 whenever it recorded its work, finished or not; `state.json` says
  `done`, keeps the inner tool's codes (for example `calibrateCode: 2`) and reports the invocation's progress
  (`lastInvocation.progress`: rows, calls, jobs or probes recorded); it exits 1 only on an error or a stop. The runner
  repeats a `repeatUntilDone` step while it exits 0 with `done: false`; an invocation that exits 0 with no progress is
  a stop (exit 4).
- **Horizon.** The runner gives every locked invocation a horizon `H` (seconds from the start of the node process):
  `H = min(285, A − 45 − 10)`, where `A` is the allowance left (below). Every locked script takes `--horizon-s H` and
  admits no work that could end after `H`.
- **Bounded invocations (D-IG12).** With elapsed time `e` since the process started:
  - request rows (`arm.mjs`): calibrate runs one row at a time with a child limit R (90 s on the fast shard, 260 s on
    slow cells; a row above R is recorded as censored at R, and above 260 s it is a defect); a row starts only when
    e + R + 10 s ≤ H, so slow cells run one row per invocation and need H ≥ 270 s;
  - rating jobs (lanes, `rate`, and PM2's profiled ratings): a canonical rating does at most 760 M + 80 M units of work
    (about 5.4 s at the slowest probe rate, 157 M units/s); a job starts only when e + 30 s ≤ H, and a supervisor
    outside the rating's thread cuts any job at 30 s as a defect;
  - call jobs (lanes, `call`): a selectClues call is not bounded by itself, so the supervisor cuts every call at H − 15
    s, terminates its lane and records the call as censored with every profile it had completed (profiles are streamed
    one by one); a call starts only when at least 120 s remain before H − 15 s;
  - families (PM1): driven probe by probe, checkpointed after each probe, admitted like rating jobs.
- **Kills and reruns.** A kill at 300 s is a defect and a stop (the bounds above exclude it). Nothing started is rerun
  automatically: the runner stops and the pack author decides a fix round; resumption covers only work that never
  started, and every earlier record stays.
- **Accounting.** The runner appends one line per locked invocation to
  `tests/artifacts/ig-proto/<label>/<task>/invocations.jsonl`: step, start, end, wall seconds, node seconds (from the
  step's state file; for a failed invocation without it, the node seconds the lock helper printed, 300 when killed, 0
  when node never started; never the wall time), lock wait = wall − node, counted = node + min(lock wait, 45 s), the
  horizon and the budget decision. Waiting for difficulty-v3 is never charged: waits beyond the 45 s quiet period are
  not counted. The record's `meta.invocations` sums them.
- **Debugging runs.** A developer's locked run outside the task's plan (debugging, a partial self-test) also goes
  through the runner, with a scratch plan whose task id is `<task>-dev` (for example `IGP-01-dev`), so that its
  invocations are logged and count in the round's total (not in the task's cap). Invocation records, journals and
  states are never deleted; the reply lists the debugging invocations and their counted time. Scratch output of an
  unlocked synthetic test (no rating, no timing) may be removed, and the reply names it (IGP-06 review). Debugging
  output stays under `tests/artifacts/ig-proto/` (the `selftest` label or an artifacts output folder), never under
  `docs/improve-generating/evidence/`. No git command at all, not even `git --version`.
- **Budget guard (D-IG11).** Before each locked invocation the allowance left is `A = min(1.25 × the task's §1
  allocation − the task's counted total, 10,800 s − the round's counted total)`, each cap raised by an approval. When
  `H` is below the step's `minHorizonS` (its smallest unit of work: R + 20 s for an arm step, otherwise the value in its
  plan, IGP-00 §8), the runner stops with exit code 4 and prints what it needs; it goes on only with
  `-ApprovedRoundMinutes` or `-ApprovedTaskMinutes` given by the orchestrator, recorded in the log. Because no
  invocation outlives its horizon, the counted total cannot pass a cap without an approval. `projectS` (the step's
  forecast) is used only for the projections and for `-DryRun`.
- **One run at a time** in this worktree; the developer starts nothing else while a runner is active.

**Budget of this round (projection).**

| Task | Locked commands (about) | Node time | Quiet periods | Counted |
|---|---:|---:|---:|---:|
| IGP-00 | 6 | 4.5 min | 4.5 min | 9 min |
| IGP-01 | 30 | 40 min (high 55) | 22.5 min | 62 min (high 78) |
| IGP-02 | 9 | 18 min | 7 min | 25 min |
| IGP-03 | 19 | 8.5 min | 14 min | 23 min (allocation 28) |
| IGP-03h (optional, not in the total) | 3 (+5 optional) | 3 min (+5 optional) | 2 min (+6 optional) | 5 min (+11 optional; allocation 6 + 12) |
| IGP-04 | 16 | 16 min | 12 min | 28 min |
| IGP-05 | 9 | 16 min | 7 min | 23 min |
| IGP-06 | 3 | 5.5 min | 2.5 min | 8 min |
| IGP-07 | 0 | 0 | 0 | 0 |
| **Total** | **92** | **about 109 min** | **about 70 min** | **about 178 min** |

Counts follow the bounds above: one slow row per invocation, every self-test, dry run and verification invocation
included. The high case of a prototype that gains nothing did not happen (IGP-01). About 39 % of the counted time is the
wrapper's quiet period, the price of one slow request per invocation. IGP-03's row was raised after the IGP-02 review
(the no-screen arm); the measured position is in the paragraphs below.

**Actual after IGP-01** (from the invocation logs): 4,087 s counted (68.1 min): IGP-00 407.9 s and its debugging 356 s
(a reconstructed line), IGP-01 3,152.4 s (52.5 min against its 62) and its debugging 170.5 s. Left in the round:
6,713 s (111.9 min) for IGP-02 to IGP-06, projected at about 101 min (25 + 17 + 28 + 23 + 8; the optional step of
IGP-03 not included, to be run only if at least 15 min remain after IGP-04). The guard stops the round at 180 min
unless the orchestrator approves more (D-IG11).

**Actual after IGP-02** (from the invocation logs): 5,216 s counted (86.9 min): the 4,087 s above, IGP-02 1,018.5 s
(17.0 min against its 25) and its debugging 110.5 s. Left in the round: 5,584 s (93.1 min) for IGP-03 to IGP-06,
projected at about 82 min (23 + 28 + 23 + 8): IGP-03 gained the no-screen arm and lost the window re-rating arm in the
IGP-02 review. This replaces the rule above for IGP-03's optional step, now the no-screen arm on Hell 1 26x26 (about 5
min): it runs only with the owner's approval of extra round minutes, or when at least 97 min (the projection, the step
and 10 min of margin) are left when IGP-03 is dispatched; otherwise it is a later-round item.

**Actual after IGP-03** (from the invocation logs): 6,212 s counted (103.5 min): the 5,216 s above, IGP-03 949.6 s
(15.8 min against its 23; 13 locked invocations instead of 19, as fast rows shared an invocation where the horizon
admitted them) and its debugging 46.2 s. Left in the round: 4,588 s (76.5 min) for IGP-04 to IGP-06, projected at
about 59 min (28 + 23 + 8). IGP-03's optional step did not run; it becomes the follow-up IGP-03h (about 5 min, 03
"Follow-up IGP-03h"), run after IGP-06 when at least 8 min are left in the round, before IGP-07; otherwise it is a
frozen-round item.

**Actual after IGP-04** (from the invocation logs): 7,469 s counted (124.5 min): the 6,212 s above and IGP-04 1,257.4 s
(21.0 min against its 28; 11 locked invocations, no debugging runs). Left in the round: 3,331 s (55.5 min) for IGP-05
(23 min), IGP-06 (8 min) and, when at least 8 min are left after IGP-06, IGP-03h (about 5 min); then IGP-07, which
locks nothing. At their 25 % caps the three would take 46.3 min, so the plan fits without an approval.

**Actual after IGP-05** (from the invocation logs): 8,485 s counted (141.4 min): the 7,469 s above, IGP-05 752.1 s
(12.5 min against its 23) and its debugging 263.7 s. Left in the round: 2,315 s (38.6 min) for IGP-06 (8 min) and
IGP-03h (5 min, and 11 more for its optional parts: Hell 1 20x20 and four more 12x12 seeds, added in the IGP-05
review), about 24 min in all; at their 25 % caps 32.5 min, so it fits without an approval. Order: IGP-06; IGP-03h, its
optional parts only when at least 20 min are left at its dispatch; then IGP-07.

**Actual after IGP-06** (from the invocation logs): 8,912 s counted (148.5 min): the 8,485 s above, IGP-06 337.3 s
(5.6 min against its 8) and its debugging 89.6 s. Left in the round: 1,888 s (31.5 min). IGP-03h is the round's last
locked task: its required part (5 min) and, as at least 20 min are left, its optional parts (11 min); about 16 min,
22.5 at its 25 % cap, so it fits without an approval and leaves about 9 min of the round unused at the cap. IGP-07
locks nothing.

**Actual after IGP-03h** (from the invocation logs): 9,772 s counted (162.9 min): the 8,912 s above and IGP-03h 859.9 s
(14.3 min, all parts, against its 16; 11 locked invocations). The round's locked work is complete; 1,028 s (17.1 min)
stay unused. IGP-07 locks nothing.

**Actual after IGP-07:** unchanged, 9,771.5 s counted (IGP-07 0 s); 1,028.5 s unused and not carried over.

## 8. Evidence and sign-off

Each developer's reply gives: the files created; the run plan's steps with their exits, node seconds and lock waits;
the counted machine time against the projection and any budget approval; the firewall result; the records written; the
acceptance table with the evidence per row; the values of the §5 rows the task measured; the named findings; any
question for the pack author.

The round is complete when IGP-07's summary exists, every §5 row has a value or "later round", and the orchestrator
has pushed `improve-generating`. The plan author then receives the summary for plan version 2 (`clarifications.md`
"Next actions" 4) and decides the frozen round.

### Execution summary

| ID | Status | Start | End | Machine time (counted) | Lock waits | Commit |
|---|---|---|---|---|---|---|
| IGP-00 | accepted (R00 holds; self-test 9/9) | 2026-11-14 21:00 | 21:56 (accepted 22:10) | 407.9 s (+ 356 s reconstructed debug) | 496.5 s | `improve-generating IGP-00` |
| IGP-01 | accepted (headline measured; population shift, IG-P-Q17) | 2026-11-14 22:07 | 2026-11-15 00:41 (accepted 00:50) | 3,152 s (+ 170.5 s dev) | 4,912 s | `improve-generating IGP-01` |
| IGP-02 | accepted (certificate holds, 0 violations / 862; no W yet) | 2026-11-15 00:59 | 02:02 (accepted 02:10) | 1,018.5 s (+ 110.5 s dev) | about 1,468 s | `improve-generating IGP-02` |
| IGP-03 | accepted (R33 split; no W yet) | 2026-11-15 02:28 | 03:06 (accepted 03:20) | 949.6 s (+ 46.2 s dev) | 648.3 s | `improve-generating IGP-03` |
| IGP-03h | accepted (Hell 1 20x20 2/2 ten without screen; 12x12 six seeds) | 2026-11-15 07:32 | 08:13 (accepted 08:20) | 859.9 s | 1,201 s | `improve-generating IGP-03h` |
| IGP-04 | accepted (/1.9 refuted as a general factor) | 2026-11-15 03:21 | 05:35 (accepted 05:42) | 1,257 s | 5,636 s | `improve-generating IGP-04` |
| IGP-05 | accepted (Hell 1 windows on 215-484 cells; Hell 3 none observed) | 2026-11-15 05:45 | 06:31 (accepted 06:38) | 752 s (+ 264 s dev) | 837 s | `improve-generating IGP-05` |
| IGP-06 | accepted (kernel about 96 %, 89-100 % by class; P7 needs about 2x kernel for /1.9) | 2026-11-15 06:47 | 07:26 (accepted 07:31) | 337.3 s (+ 89.6 s dev) | about 458 s | `improve-generating IGP-06` |
| IGP-07 | accepted with fixes (R00-R33 from the records; round closed) | 2026-11-15 08:21 | 09:26 (accepted 09:30) | 0 s (unlocked) | 0 s | `improve-generating IGP-07` |
