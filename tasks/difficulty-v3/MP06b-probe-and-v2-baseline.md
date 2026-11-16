# MP06b — GV2 baseline, the probe corpus and the `DEDUCE` values

| Header | Value |
|---|---|
| ID | MP06b |
| Depends on | MP06a (accepted and committed) |
| Estimated size | Medium + machine time: about 300–500 changed lines (record about 250–400, values and pins about 20; throw-away scripts under `tests/artifacts/` are not counted); about 45–60 active minutes plus about 2–3 hours of gate runs |
| Owner role | Measurement |
| Milestone | M3 — measured fit |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-04 ("Budget"), RES-05 ("Measurement", the 5 % rule C5), RES-10 (caps), RES-12 (record contents), RES-13 (order noise), RES-14 (GV2, identity), RES-19 (DLX diagnostic cost), RES-35 ("Measurement", completed in MP06c), §5.3 gate GV2; check-list §4.2 D13, D19 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The deduction solver is finished but has never met real generated puzzles at scale. Before the v3 rating is switched
on, this task measures it on the puzzles the Generator makes today, and records the old (v2) behaviour as a baseline
that later calibration (MP12) is compared with:

- the **v2 baseline** (gate GV2): a reduced score landscape at HEAD on four boards from easy to master;
- the **probe corpus**: the same requests regenerated exactly and rated by the probe, plus small samples with
  uniqueness required and on the largest board;
- the **caps**: `DEDUCE.work` and `DEDUCE.nodes` so that no rating path of the corpus is capped on boards up to
  20 x 18 at levels up to master (a capped path makes a candidate unrateable, RES-04), and `DEDUCE.census` by the
  5 % rule (an unfinished census makes a rating a labelled estimate, RES-05);
- the facts the owner asked for: rating cost per board size, the share of estimates, the noise of G under the tie
  rule, the distributions per level and board.

MP06c then fits the candidate v3 knobs on the same corpus. No rating, puzzle or user-visible text changes here.

## Scope

### In scope

- Gate GV2 (calibration shards) and the probe runs listed below.
- `core/engine/policy.js`: the values of `DEDUCE.work`, `DEDUCE.nodes` and `DEDUCE.census` (only these fields; each
  only if the rule below requires it), with a comment naming the record; `tests/policy.test.js`: the `DEDUCE` pin;
  `docs/design-detail.md` §7.9: the `DEDUCE` values where §7.9 states them.
- New records `docs/difficulty-v3/baseline-v2/` (the calibration reports of the shards) and
  `docs/difficulty-v3/probe-<date>.md`.

### Out of scope

- The knob fit, the v2-to-v3 confusion matrix and the RES-35 rejection counts (MP06c).
- `DEDUCE.lookaheadWidth`, `DEDUCE.solutions`, `DEDUCE.memoryBytes` (report a memory finding; do not change it).
- Any engine code, any other policy value, any fixture, any test other than the `DEDUCE` pin.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first. This task owns gate GV2 and the probe at
  scale; nothing else heavy is run.
- **Announce to the orchestrator before starting (the Sudoku repository runs in parallel on the same machine; never
  two heavy runs at once).** Your first message lists the shard plan below with the expected wall time; start the
  first shard only when the orchestrator has confirmed that no Sudoku gate, landscape or timing run is active, and
  report each finished block.
- Every command runs attached, from the repository root, in PowerShell, and finishes within 10 minutes (the shard
  plan keeps each one shorter); check `$LASTEXITCODE` after each. A run that exceeds 10 minutes has a problem: stop
  it (by PID, only your own process), record it, investigate. Never two runs at once in this checkout.
- Scratch scripts and raw outputs go to `tests/artifacts/MP06b/` (git-ignored); only the files named in this task are
  written under `docs/difficulty-v3/`, once each. UTF-8 without BOM, CRLF (normalise tool-written Markdown and
  JSON with the check-list's one-liner before the hand-off), final newline, no trailing whitespace.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/` or the reports.

## Inputs & context

### Tools (from MP06a and earlier)

- `tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --cases "<regex>" --output <base>`
  runs the landscape cases whose id matches the regex; it writes `<base>-<date>.json` (the report, with the run
  records in `runs`, each with `caseId`, `seed`, `acceptedCount`, `partialReason` and `details.resultDigest`),
  `<base>-<date>.md` and the resumable `<base>.checkpoint.jsonl`; exit 0 complete, 2 incomplete, 1 invalid. A shard
  re-run with the same command resumes from its checkpoint. Case ids are `<board id>-<level id>` with board ids
  `<cols>x<rows>` (`tools/bench/calibration-reference.js:175, 214-232`); seeds are `landscape/<case id>/<rep>`.
- `tools\rate-probe.mjs` (MP06a): pack, generation and landscape modes; `--expect <report.json>` checks the
  regenerated digest; `--orders`, `--tie-orders`, `--deduce`, `--output`; one JSON line per puzzle with `v2`,
  `deduction` (`path`, `first` with `G`, `Gproved`, `info`, `Cmax`, `choices`, `census`, `deductionTier`, `rules`;
  `search` with `nodes`, `work`, `stop`; `count`; `census` with `complete`, `undecided`, `nodes`, `work`), `orders`,
  `timing`, `modelSize`, `identity`.
- `DEDUCE` today (`core/engine/policy.js`, pinned in `tests/policy.test.js`): `{ lookaheadWidth: 4, nodes: 20000,
  solutions: 8, work: 50000000, census: 10000000, memoryBytes: 32 * 1048576 }`; `work`, `nodes`, `census` and
  `memoryBytes` are provisional (RES-01, RES-10).

### Cases of GV2 (RES-14)

Boards `6x10`, `10x10`, `12x12` and `18x20` (the plan's 20 x 18), levels easy to master, as far as the landscape
offers them. First list them:

```powershell
node -e "import('./tools/bench/calibration-reference.js').then(m=>console.log(m.buildLandscapeMatrix({seeds:20}).cases.map(c=>c.id).filter(id=>/^(6x10|10x10|12x12|18x20)-(easy|normal|hard|expert|master)$/.test(id)).join('\n')))"
if ($LASTEXITCODE -ne 0) { throw 'case list failed' }
```

Expected: 18 cases (6x10, 10x10 and 12x12 with easy, normal, hard, expert, master; 18x20 with hard, expert, master,
because easy and normal are not offered at 360 cells). Use the printed list; a difference is recorded, not forced.

### Shard plan (gate GV2; expected wall time about 1–1.5 hours)

One case per shard, each well under 10 minutes (earlier landscape runs: 0.3–6 s per request on 6x10 and 10x10,
up to about 20 s on 18x20 master, plus about 1–2 s of process start per run):

```powershell
node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --cases "^6x10-easy$" --output docs\difficulty-v3\baseline-v2\6x10-easy
if ($LASTEXITCODE -ne 0) { throw 'GV2 shard 6x10-easy incomplete' }
```

and the same for every case id of the list. Record for each shard: command, start, end, duration, exit code, runs
recorded. A shard whose rows would not finish within 10 minutes is stopped after the current row (Ctrl+C in the
attached console) and resumed by the same command later; the checkpoint makes it resumable. After a shard completes,
delete its `.checkpoint.jsonl` (the report JSON keeps every run).

### The probe corpus (expected wall time about 1–1.5 hours)

All probe runs use `--orders 5 --tie-orders 3` and high main-search caps, so that the needed caps can be read off:
`--deduce '{"work":1000000000,"nodes":2000000}'` (the census budget stays at its default). Outputs go to
`tests\artifacts\MP06b\<name>.jsonl`.

1. **A. Landscape, regenerated** (the measured puzzles of GV2): for each case of the list, reps 0-4:

   ```powershell
   node tools\rate-probe.mjs --landscape 6x10-easy --reps 0-4 --workers 4 --expect docs\difficulty-v3\baseline-v2\6x10-easy-<date>.json --orders 5 --tie-orders 3 --deduce '{"work":1000000000,"nodes":2000000}' --output tests\artifacts\MP06b\A-6x10-easy.jsonl
   ```

   Exit 2 marks an identity mismatch or a partial request: record it (RES-14: a mismatch is a mismatch, never
   substituted); the lines are kept and marked in the analysis.
2. **B. Uniqueness required**: `--board 6x10` with easy, normal, hard, expert, master and `--board 18x20` with hard,
   expert, master; `--count 10 --uniqueness require --workers 4`, seeds `probe-require/<board>-<level>/0` and `/1`
   (two requests per cell); same options as A.
3. **C. Largest board, cost only**: `--board 26x26 --level master --count 10 --workers 4 --seed probe-cost/26x26-master/0`
   with the same options (26 x 26 is outside the cap rule; it gives the cost row of the record).

If a probe command would run longer than 10 minutes, split it (fewer reps per command, `--reps 0-1` then `2-4`).

### Rules for the values (RES-04, RES-05, RES-10; check-list D19)

Let the **cap cohort** be the corpus lines (A and B) with boards up to 20 x 18 (all of A and B) and levels up to
master. For each line, `mainWork = deduction.search.work - deduction.census.work` and
`mainNodes = deduction.search.nodes - deduction.census.nodes` (with the high caps of the probe).

- **`work`**: the smallest multiple of 10,000,000 that is at least `2 * max(mainWork)` over the cap cohort, and never
  below 50,000,000. If that value exceeds 500,000,000, keep the computed value, and state in the record and the reply
  the rating time it implies (median and maximum ms of the cohort's deductions) as a finding for the owner.
- **`nodes`**: the smallest multiple of 10,000 that is at least `2 * max(mainNodes)`, never below 20,000.
- Check: with the new `work` and `nodes`, no line of the cap cohort would be capped (`mainWork` and `mainNodes`
  stay below both); report the capped share per level and board at the old values (lines with `mainWork > 50,000,000`
  or `mainNodes > 20,000`) and at the new ones (0).
- **`census`** (C5, plan author): per level and board cell of the corpus (A and B separately, A being the reference),
  `estimates = #{ lines with deduction.census.complete === false }` over `#{ lines with deduction.path === 'complete' }`.
  An empty cell is "unavailable", never 0 %. If some cell has strictly more than 5 %, re-probe that cell's puzzles
  with `--deduce '{"work":<new work>,"nodes":<new nodes>,"census":X}'` for X = 20,000,000, 40,000,000, 80,000,000
  and take the smallest X for which every cell is at or below 5 %; if 80,000,000 is not enough, keep 10,000,000 and
  report the cells, shares and census work to the owner as a finding (RES-05). Record numerator and denominator of
  every cell at the default and at the chosen value.
- **Memory**: report the largest `modelSize.bytes` per board; if a 26 x 26 deduction threw `model-too-large`, report
  it (no change of `memoryBytes` here).
- Pin the new values: edit `DEDUCE` in `core/engine/policy.js` (same frozen object, same field order; a comment
  `// measured: docs/difficulty-v3/probe-<date>.md`) and the pin in `tests/policy.test.js`; run the deduce tests to
  confirm no pinned vector changes (they use small boards).

### What the record says (`docs/difficulty-v3/probe-<date>.md`)

In the style of `docs/calibration/landscape-slice-2026-10-22.md` (headings, short paragraphs, tables; no absolute
paths):

1. **Header**: date, source commit (`git rev-parse HEAD`), Node version, machine (CPU count), the commands, the shard
   table (case, start, end, duration, exit, runs).
2. **GV2 baseline**: per case the request in-band rate, T10 median and p95, from the shard reports; any incomplete
   or partial cell.
3. **Identity** (RES-14): per case, matched, mismatched and partial reps of corpus A; nothing substituted.
4. **Cost** (RES-12 (b)): per board (6x10, 10x10, 12x12, 18x20, 26x26) the median, p95 and maximum of the deduction
   ms, `search.work`, `search.nodes`, `census.work` share, `modelSize.bytes`, and of the canonical v2 rating ms (the
   DLX diagnostic); the ratio of the DLX diagnostic to the deduction. If the diagnostic more than doubles the rating
   time on 18x20 or 26x26, say so: it is an owner question (RES-19), not a change.
5. **Caps**: the rule, the maxima, the old and new values, the capped share per level and board before and after.
6. **Census**: the estimate share per level and board (numerator / denominator) at the default and the chosen
   budget, and the `census` value chosen (or the finding).
7. **Order noise** (RES-13): per level and board, the share of puzzles whose G differs between tie orders 0-2, the
   largest spread of G and of info, and the spread of B over the five DLX orders; if G at Hard varies by more than
   about 1, say so (no aggregation is adopted).
8. **Distributions** (RES-12 (c)): per level and board, for A and for B: count, and median, p10, p90 of G, `Gproved`,
   info, Cmax; the shares of `deductionTier` 0-3 and of `solutions` unique / few / many / unknown.
9. **Values** pinned in `DEDUCE`, and the findings for the owner (if any).

## Files to create/modify

### Exclusive ownership

- `core/engine/policy.js` (`DEDUCE` values only), `tests/policy.test.js` (the `DEDUCE` pin only).
- `docs/difficulty-v3/baseline-v2/` (new: the shard reports `<case>-<date>.json` and `.md`).
- `docs/difficulty-v3/probe-<date>.md` (new).
- `docs/design-detail.md` §7.9 (the `DEDUCE` values only, where stated).

### Documentation slot

The record above; design §7.9 states the measured `DEDUCE` values and points to the record. No guide changes (the
probe's usage is in the developer guides since MP06a).

## Implementation steps

1. Announce the plan; list the cases; wait for the orchestrator's go.
2. Run the GV2 shards one by one; delete completed checkpoints; normalise the reports to CRLF.
3. Run the probe corpus A, B and C.
4. Write the analysis scripts under `tests/artifacts/MP06b/`; compute the caps, the census rule, the tables.
5. Re-probe census cells if needed; pin the values; run the deduce and policy tests.
6. Write the record; update design §7.9; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP06b-B01 | The v2 baseline exists for every GV2 case, so MP12 can compare Hard and Expert hit rates with it | `baseline-v2/` reports; record §2 |
| MP06b-B02 | The probe corpus is the same puzzles as the baseline (identity checked), and mismatches are recorded, not hidden | record §3 |
| MP06b-B03 | No rating path of the corpus is capped up to master on boards up to 20 x 18 with the pinned caps | record §5 |
| MP06b-B04 | The share of labelled estimates is at most 5 % in every level and board cell, or the owner is told with numbers | record §6 |
| MP06b-B05 | The owner sees the rating cost per board size and the noise of G | record §4, §7 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP06b-T01 | Every GV2 shard and probe command ran attached, under 10 minutes, with its command, times and exit code recorded; no two runs overlapped | record §1; reply |
| MP06b-T02 | The values follow the rules above exactly; `DEDUCE` keeps its shape and frozen state; the pin matches | `tests/policy.test.js`; review |
| MP06b-T03 | The record has sections 1-9 with numerators and denominators; empty cells say "unavailable" | review |
| MP06b-T04 | `npm run test:quick` and `npm run check` pass after the value change; every file is CRLF; no file outside the ownership list changed | command output |

## Test plan

### Exact commands (after the runs and the value change)

```powershell
node --test tests\policy.test.js tests\deduce.test.js tests\deduce-rules.test.js tests\deduce-census.test.js tests\rate-probe.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required checks

| Check | Expected |
|---|---|
| Case list | the printed list, 18 cases expected |
| GV2 | one report per case under `docs/difficulty-v3/baseline-v2/`, every shard exit 0 (or a recorded resume) |
| Probe corpus | A: 5 reps per case; B: 16 requests; C: one request; every line parses |
| Caps | computed values and the "no capped line" check |
| Pin | `tests/policy.test.js` pins the new `DEDUCE` |

## Definition of done & handoff

- The record and the baseline reports exist, every value is pinned with its evidence, the quick set and the check
  pass, nothing outside the ownership list changed.
- Leave the probe outputs in `tests/artifacts/MP06b/` (git-ignored) for MP06c, and list their names and line counts
  in the reply.
- Handoff to MP06c: the corpus files, which lines are identity mismatches or partial, the pinned `DEDUCE`, any cell
  re-probed with another census budget, and the findings for the owner.

## Amendment A1 (cross-review FP01, FP05)

Issued 2026-11-12 after SA2's review `docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md` (FP01, FP05), for
phase 2b only. Phase 2a (GV2, 18 shards, reports in `docs/difficulty-v3/baseline-v2/`) is done and unchanged. Where
this amendment and the sections above differ, **this amendment wins**: it replaces "The probe corpus", "Rules for
the values" (the evidence part; the cap formulas stay) and the probe-output names. Points already approved by the
orchestrator stay: the `run-logged.mjs` wrapper for every command; GV2 checkpoints deleted; real puzzle counts (a
request may have fewer than 10 puzzles); the timing semantics of the probe as delivered; capped lines reported
separately; the two B requests of a cell merged in the tables; `policy.js` edited only after the last probe run;
`Gproved = 0` counts in the record; C may be re-run once with `--count 4` as a labelled, reduced, cost-only sample.

### A1.1 Requests and their captured inputs (FP05)

Every request is generated **once**, its pack is captured, and every rating run reads the captured pack (`--pack`
mode). Nothing is regenerated for a rating run.

| Corpus | Requests | Request id | Generation |
|---|---|---|---|
| A | the 18 GV2 cases x reps 0-4 (90) | `A-<case id>-r<rep>`, for example `A-6x10-easy-r0` | the landscape recipe of the case and rep, exactly as `rate-probe --landscape` builds it: `version` 1, the case's `boardRows`, `rotation`, `levelId`, `quantity` 10, `seedText` = `seedFor(case, rep)` (`landscape/<case id>/<rep>`), `batchIndex` 1, `batchSeed` = seedText + `#1`, `uniqueness` `any`, `versions` = `currentVersions()`; `node tools\generate.mjs --recipe <recipe file> --workers 4 --max-active <case maxActive> --output <pack file>` |
| B | 6x10 easy, normal, hard, expert, master and 18x20 hard, expert, master, seeds 0 and 1 (16) | `B-<board>-<level>-s<k>`, for example `B-18x20-hard-s1` | `node tools\generate.mjs --board <board> --level <level> --count 10 --uniqueness require --seed probe-require/<board>-<level>/<k> --workers 4 --output <pack file>` |
| C | 26x26 master (1; once more with `--count 4` if the first run would exceed 10 minutes) | `C-26x26-master-s0` (`C-26x26-master-s0-count4`) | `node tools\generate.mjs --board 26x26 --level master --count 10 --seed probe-cost/26x26-master/0 --workers 4 --output <pack file>` |

- **Durable inputs** (owned by this task, written once, never overwritten): the captured packs
  `docs/difficulty-v3/probe-corpus-2026-11-12/packs/<request id>.json` (as `tools/generate.mjs --output` writes them,
  CRLF) and `docs/difficulty-v3/probe-corpus-2026-11-12/manifest.json`. The recipe files passed to `--recipe` are
  scratch (`tests\artifacts\MP06b\recipes\<request id>.json`); the manifest carries each recipe inline.
- **Manifest** (`schema` 1, `date`, `sourceCommit` = `git rev-parse HEAD`, `requests` in canonical order: A in the
  order of the GV2 case list, then by rep; B in the order of the table, then by seed; C): one row per request, also
  when it yields no puzzle or no pack: `request`, `corpus`, `caseId` (A) or null, `board` (`<cols>x<rows>`), `level`
  (requested), `uniqueness`, `seed`, `count` (requested), `generate` (the exact argument list; for A also the
  recipe object), `exit` (0 complete, 2 partial, 1 no usable result), `accepted` (puzzles in the pack; 0 without a
  pack), `pack` (relative path or null), `identity` (A: `{ digest, expected, match }` with `digest` =
  `landscapeDigest(pack, levelId)` exported by `tools/rate-probe.mjs` and `expected` = the `details.resultDigest`
  of the first run with the same `caseId` and seed in `docs/difficulty-v3/baseline-v2/<case id>-2026-11-12.json`,
  null when absent; B and C: null), and, after A1.3, `finalDeduce` at the top level (the six `DEDUCE` fields of the
  final run).
- The capture driver refuses to overwrite an existing pack or manifest row (a re-capture needs the orchestrator).
  A mismatched A request (`match === false`) stays in the corpus and is marked; nothing is substituted (RES-14).

### A1.2 Observation runs (all on the captured packs)

Each run label rates each captured pack with
`node tools\rate-probe.mjs --pack <pack file> <options> --output tests\artifacts\MP06b\runs\<label>\<request id>.jsonl`;
an existing output file is never overwritten (the driver refuses). `--orders 0 --tie-orders 1` unless stated.

| Label | Packs | Options | Purpose |
|---|---|---|---|
| `old` | A, B, C | none: today's `DEDUCE` (nodes 20,000, work 50,000,000, census 10,000,000) | the old shares (A1.4) |
| `diag` | A, B, C | `--orders 5 --tie-orders 3 --deduce '{"work":1000000000,"nodes":2000000}'` | the cap inputs, the order noise (RES-13), cost and model sizes |
| `diag2` | only the packs with a cohort line that is `capped`, or a count cutoff (A1.3), under `diag` | `--deduce '{"work":10000000000,"nodes":20000000}'` | re-measure capped diagnostic paths once |
| `base` | A, B, C | `--deduce '{"work":W,"nodes":N}'` (census default 10,000,000) | the C5 shares at the default census budget |
| `trial-20m`, `trial-40m`, `trial-80m` | only the packs of A and B cells above 5 % (A1.3) | `--deduce '{"work":W,"nodes":N,"census":X}'`, X = 20,000,000, 40,000,000, 80,000,000, in this order, stopping at the first X that brings every such cell to 5 % or less | choosing `census` |
| `final` | A, B, C | `--deduce` with the full chosen tuple `{"lookaheadWidth":4,"nodes":N,"solutions":8,"work":W,"census":X,"memoryBytes":33554432}` | the authoritative rows |

If no cell is above 5 % under `base`, the `final` run is still made with the full tuple (X = 10,000,000); it then
repeats `base`'s values, which is the check that the tuple is complete.

### A1.3 Classification, caps and census (FP01)

1. **Classify every line before reading anything else**: `error` (the line has `error`), `complete`
   (`deduction.path === 'complete'`), `capped` (`'capped'`), `none` (`'none'`). Only `complete` lines have
   `deduction.first` and `deduction.census`; a missing value is never read as 0. Among `complete` lines, a **count
   cutoff** is a line whose `deduction.search.stop` is `node-cap` or `work-cap` (the path is rateable; only the count
   was cut). Every table that uses `first` or `census` counts the other classes in separate columns.
2. **Cap cohort**: the lines of A and B (boards up to 18 x 20, levels up to master). C is reported, never part of the
   rule.
3. **Cap inputs** (`diag`, and `diag2` for its packs): over the `complete` lines of the cohort,
   `mainWork = search.work - census.work`, `mainNodes = search.nodes - census.nodes` (main search: first path and
   count). `W` = the smallest multiple of 10,000,000 that is at least `2 * max(mainWork)`, never below 50,000,000
   (above 500,000,000: keep it and report the implied rating time as a finding); `N` = the smallest multiple of
   10,000 that is at least `2 * max(mainNodes)`, never below 20,000. A cohort line still `capped` under `diag2`, or
   `error` or `none` under `diag`, is **not excluded**: it is listed as an unresolved failure of MP06b-B03 in the
   record and the reply, and the orchestrator decides before `final` is used. For a re-measured pack the `diag2`
   lines replace its `diag` lines in the maxima. A line that is still a count cutoff under `diag2` (complete path,
   count cut) is left out of the maxima, because its values are lower bounds, and is listed as a finding with its
   request, puzzle, `search.work` and `search.nodes`; the `final` check (step 5) still requires its path.
4. **C5 rule** (plan author, 5 % per level and board cell): per cell (board, requested level) of A, and of B
   reported separately, `numerator` = `complete` lines with `deduction.census.complete === false`, `denominator` =
   `complete` lines; an empty cell is "unavailable". Evaluated on `base`; a cell of A above 5 % triggers the trials
   on that cell's packs (and B's cells above 5 % are tried too, but only A decides X). X = the smallest trial budget
   for which every A cell is at 5 % or less; if 80,000,000 is not enough, X = 10,000,000 and the cells, shares and
   census work go to the owner as a finding (RES-05).
5. **Final check** (`final`): every cohort line is `complete` (MP06b-B03); otherwise the failure is recorded with the
   lines and nothing is excluded. The C5 shares, the `Gproved = 0` counts, the distributions and the cost table of
   the record are computed from `final` only; the order noise (record §7) comes from `diag`; `old`, `diag`, `diag2`,
   `base` and the trials appear only in their own columns and sections, each with its budget tuple.
6. Then edit `DEDUCE` in `core/engine/policy.js` to exactly the `final` tuple (comment naming the record), update its
   pin, and confirm by re-rating two captured packs (one 6x10, one 18x20) without `--deduce` into
   `tests\artifacts\MP06b\runs\pinned\`: every line equals its `final` line except `timing`.

### A1.4 Old shares (FP01)

From `old`, per board and requested level: the `capped` path share (numerator `deduction.path === 'capped'`,
denominator all lines), the count-cutoff share (among `complete` lines), `none` and `error` counts. The earlier
"`mainWork > 50,000,000` or `mainNodes > 20,000`" statistic is withdrawn: it counted count cutoffs as unrateable
paths. The record states the old and final path shares, count-cutoff shares, errors and budget tuples, with
numerators and denominators.

### A1.5 What MP06c receives

- `docs/difficulty-v3/probe-corpus-2026-11-12/final.jsonl` (durable, CRLF): one line per puzzle of every captured
  pack (A, B and C), in manifest order and then pack order; each line is the `final` probe line unchanged, with
  `request` and `corpus` added in front. The merge asserts that each request has exactly `accepted` lines and that
  `(request, puzzleId)` is unique.
- The manifest (A1.1) with `finalDeduce`. The join key is `(request, puzzleId)`; the requested level, board and
  identity come from the manifest row of `request`.
- The `old`, `diag`, `diag2`, `base` and trial outputs stay in `tests\artifacts\MP06b\runs\` (scratch, reproducible
  from the packs and the commands); the record summarises them.

### A1.6 Commands, files and time

- Driver (scratch): `tests\artifacts\MP06b\corpus.mjs` with `capture <group>`, `rate <label> <group> <options>`,
  `merge` and `analyse`, run through `run-logged.mjs`; a group is A per board (6x10, 10x10, 12x12, 18x20), B per board
  and C, so that every command stays under 10 minutes (18 x 20 `diag` may be split per case). It may import
  `landscapeDigest` and `probePack` (`tools/rate-probe.mjs`), `buildLandscapeMatrix`
  (`tools/bench/calibration-reference.js`), `seedFor` (`tools/bench/runner.js`) and `currentVersions`
  (`tools/record-fixtures.mjs`); it runs `tools/generate.mjs` and `tools/rate-probe.mjs` through their exported `run`
  with argument arrays (no shell quoting of the `--deduce` JSON) or as child processes.
- Ownership added: `docs/difficulty-v3/probe-corpus-2026-11-12/` (`manifest.json`, `final.jsonl`, `packs/`).
  `docs/difficulty-v3/probe-2026-11-12.md` stays the record; its §5 and §6 follow A1.3 and A1.4.
- Expected machine time of phase 2b: about 60-100 minutes (captures about 15-30, `old` about 5, `diag` about 25-40,
  `base` and `final` about 5-10 each, trials if needed about 5-15). Announce each block to the orchestrator before
  starting it (the Sudoku repository runs in parallel; never two heavy runs at once).
- Handoff (replaces the old one): the manifest and `final.jsonl` paths, the `final` tuple, the request counts per
  corpus (exit, accepted, identity), the unresolved failures if any, the C5 cells and X, and the findings.

AMENDMENT A1 READY

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP06b: Probe and GV2 runs, the DEDUCE values and the probe record`); the two owner findings of record section 9 (census 5 % rule not met, `work` above 500,000,000) were reported to the owner |
| Start | 2026-11-12 14:44 (+07:00) |
| End | 2026-11-12 15:29 developer (phase 1, 2a and 2b); 15:33 orchestrator review and commit |
| Duration | 45 min developer (2,683 s over three turns), of which machine time about 9 min (GV2) and under 10 min (phase 2b); about 6 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 99 model calls; 19,431,324 input tokens (18,992,569 cache reads); 143,197 output tokens |
| AI credits | about 443 (developer) |
| Verification | Developer: phase 1 plan with three tiny smoke runs; phase 2a 18 GV2 shards (`tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process`), each 20/20 rows, exit 0, 16-83 s; phase 2b per Amendment A1: 107 requests captured once (A 90 with 896 puzzles, B 16 with 160, C 1 with 10; every generation exit 0; A identity 90/90 match), runs `old`, `diag` (all 1,066 complete, `diag2` not needed), `base`, `trial-20m/40m/80m`, `final` (all 1,066 complete) and `pinned` (3 packs re-rated without `--deduce` equal `final` except `timing`); targeted 89/89, `npm run test:quick` 1,177/1,177, `npm run check` OK. Orchestrator re-run: `node --test tests\policy.test.js tests\deduce.test.js tests\deduce-census.test.js tests\rate-probe.test.js` 72/72, `npm run test:quick` 1,177/1,177, `npm run check` OK; every durable file (36 GV2 reports, 107 packs, manifest, `final.jsonl`, record) CRLF, no BOM, no trailing whitespace, no absolute path |
| Acceptance | MP06b-B01, B02, B03 (no capped path under the pinned caps), B05 and MP06b-T01..T04 met; MP06b-B04 (5 % census rule) not met: by the accepted rule `census` stays 10,000,000 and the finding goes to the owner (record sections 6 and 9). Pinned `DEDUCE = { lookaheadWidth: 4, nodes: 30000, solutions: 8, work: 760000000, census: 10000000, memoryBytes: 33554432 }` (frozen, same field order); `policy.js` JSDoc and `docs/design-detail.md` sections 4.2 and 7.9 consistent |
| Issues & resolutions | (1) SA2's cross-review FP01 (count cutoffs counted as capped paths; no final-cap verification) and FP05 (corpus not immutable or replayable) were resolved by the author's Amendment A1 before phase 2b; the old "more than 50M work or 20k nodes" statistic is withdrawn. (2) Owner findings: `work` 760,000,000 is above 500,000,000 (rule: keep it and report; deduction median 2.8 ms, p95 83 ms, maximum 986 ms; a full-cap rating extrapolated at about 1.8 s); 5 % census rule not met (5 A cells above 5 % at 10M; at 80M 10x10-master 3/50 remains; 40M would leave only 10x10-master above 5 %). (3) RES-19: the DLX diagnostic raises the combined rating time by 1.67 times on 18 x 20 (v2:deduction 0.61 on 26 x 26), below the "more than doubles" threshold, so RES-19 requires no owner question; recorded as information. (4) `Gproved = 0` shares for AR1: in A, Hard cells 58-86 %, Expert 0-40 %, Master 0-4 %; in B (uniqueness required) 18 x 20 Hard, Expert and Master 20/20 each; MP06c and MP07 use these. (5) The Execution log section was missing for a while after the amendment was appended; the author restored it. (6) Machine time was about ten times below the estimates |
| Handoff | MP06c reads `docs/difficulty-v3/probe-corpus-2026-11-12/final.jsonl` (1,066 lines in manifest then pack order, `request` and `corpus` first, then the `final` probe line) and `manifest.json` (join key `(request, puzzleId)`; requested level, board, identity and `finalDeduce` per request). GV2 baseline reports: `docs/difficulty-v3/baseline-v2/<case>-2026-11-12.json` and `.md`. Record: `docs/difficulty-v3/probe-2026-11-12.md`. Scratch runs (`old`, `diag`, `base`, trials, `pinned`) stay in `tests\artifacts\MP06b\runs\`, reproducible from the packs |
