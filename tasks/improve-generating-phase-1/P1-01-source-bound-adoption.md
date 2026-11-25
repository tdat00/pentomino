# P1-01: Source-bound adoption

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-1`; plan §§3, 4.1-4.4, P1-B01/B03, P1-T01/T04/T07, §8 P1-01; D-P1-03/D-P1-05/D-P1-06 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, `eca0f94717a56de43c52f6cb54d739360670fef8` |
| Depends on | Final plan and accepted task pack |
| Pack author / reviewer | SA-Astra / SA-Opus |
| Executor | SA-Astra, as plan §8 assigns; SA-Opus reviews; both SAs approve the adoption reading |
| Estimate | SA about 1 h, developer 0 h; machine 0 measured min, unlocked reads only |

## Goal

Bind the already implemented P6/history work to its historical T14 reports and this source checkpoint.
Recompute the stored results without running the engine and make the distinction between historical
measurements and current source checks explicit. Preserve every original observation.

## Authority and fixed points

- Plan §4.4 defines the record; D-P1-03 adopts T12-T14, not P7 or a new timing campaign.
- Frozen source `3fc65f4681a53d3984d9218c15efbf696cc3a1a5`; measured P6 source
  `27c6189e40bfe2000a454f755797c5745d7c2e84`; main reference
  `b5eb85805f609af7deaa2489eb08675c60b2cc49`; plan
  `eca0f94717a56de43c52f6cb54d739360670fef8`.
- Runtime digest remains `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4`.
  Versions remain `gen-v3 / mixed-v3 / xoshiro128ss-v1 / difficulty-v3 / 1.0.0`.
- Read the plan/report, `E/sa-astra/phase1-audit.mjs` (copied below, original immutable),
  `E/sa-opus/p1-01-edit-proto.mjs` (review edit list only), `tools/ig-proto/phase1/p6-bench.mjs`
  (`compareReports`, `readLedger`, `renderMarkdown`), `tools/bench/report.js` (`computeSourceDigest`),
  and `tasks/improve-generating-v4/T14-p6-phase1-bench.md`.
- The prototype is supplied with this reviewed task pack; never execute it, since it owns a different
  scratch folder and the reviewer's output. No generator/solver/rating/replay/test command is authorized.

## Scope

- Create `docs/improve-generating-phase-1/evidence/adoption-reader.mjs`, `adoption.json`, `adoption.md`.
- Change no existing file. `E/sa-astra/phase1-audit.mjs` remains byte-identical.
- Do not change runtime, tests, fixtures, tools, plans or old evidence. Guards: G-PROTECTED, G-WORKTREE,
  `git --no-pager diff --exit-code eca0f94 -- tests docs\design-detail.md` (empty, exit 0),
  and G-FORMAT on the three Create files.
- The orchestrator alone updates this task's execution log and the check-list.

## Steps

1. At the repository root, require branch `improve-generating`, plan commit an ancestor of HEAD and
   clean protected/tested paths. Run G-PROTECTED and the empty diff guard above; a nonzero exit is
   `QUESTION:`. None of the three output paths may exist. Set the exact G-WORKTREE allow-list:

   ```powershell
   $Allowed = @(
     'docs/improve-generating-phase-1/evidence/adoption-reader.mjs',
     'docs/improve-generating-phase-1/evidence/adoption.json',
     'docs/improve-generating-phase-1/evidence/adoption.md',
     'tasks/improve-generating-phase-1/P1-01-source-bound-adoption.md',
     'tasks/improve-generating-phase-1/check-list.md'
   )
   ```

2. Copy the original, edit only the copy:

   ```powershell
   Copy-Item docs\improve-generating-phase-1\evidence\sa-astra\phase1-audit.mjs docs\improve-generating-phase-1\evidence\adoption-reader.mjs
   ```

   Apply `E/sa-opus/p1-01-edit-proto.mjs`'s 26 `EDITS` entries (:22-124), each find anchor occurring
   exactly once, then its two block deletions and final `console.log` replacement (:135-144).
   Do not copy its leftover check or scratch runner/report writer (:145-178).

   | Edits | Exact purpose |
   |---|---|
   | 1-4 | Header, `existsSync`, imports three levels up including `renderMarkdown`, `provenanceVersions`, `APP_VERSION`; `ROOT`, `SELF`, `PLAN`, `MEASURED_NEW`, `MAIN_REFERENCE`, `P6_DIGEST`, `SITE`, `P6_FILES`, `NINE`, `OUT` |
   | 5 | Outputs absent, inspected HEAD, plan ancestry, pinned `origin/main`, clean tested paths |
   | 6-7 | Stored measured commit, exact Markdown re-render, pinned source digest |
   | 8-11 | Use inspected commit; frozen=main and measured=inspected site bridges; main-to-inspected exactly the three P6 files |
   | 12-13 | Drop ignored P7 snapshot dependency; closure exactly the nine deduction dependency files |
   | 14-16 | P7 publication pinned to plan blob, ignored raw inputs not required, context-only wording |
   | 17 | Version tuple/fixtures checked; retained source input list is plan, T14 task and reader |
   | 18-19 | Adoption format/commit/version/bridge/historical/current fields; no analysis-only projection |
   | 20 | `adoption.json/.md`, exclusive `flag: 'wx'` writes |
   | 21-26 | Adoption title, source/bridge/versions, P7 limit, reproduction command and output names |
   | Deletions/final line | Remove analysis-only reading list and `fixtureVerification`; one-line result |

   Make **one further specified replacement** to retain repository-relative writes:

   ```javascript
   const write = (name, value) => writeFileSync(relative(process.cwd(), join(HERE, name)),
   ```

   This replaces the prototype's `const write = (name, value) => writeFileSync(join(HERE, name),`;
   the following CRLF normalization and `{ encoding: 'utf8', flag: 'wx' }` remain unchanged.
   The exact 218-line CRLF result has SHA-256
   **`9130200bae6301c1a6f7da2f75edcf919377a93379bcacbcb4dc67c10c3c6ecc`**.
   The review's unadapted hash was `cfd0b9639f36293cf97e898a9d10d5f80ef58c62ba65e4c44a6595e379453137`.
   Any other hash or missing/multiple anchor is a QUESTION; do not make an unlisted refactor.

3. Run `node --check docs\improve-generating-phase-1\evidence\adoption-reader.mjs`, then
   `node docs\improve-generating-phase-1\evidence\adoption-reader.mjs`, checking each native exit.
   Expected: `phase1-adoption: recorded <HEAD> (70 rows, 35 equal pairs, 14 memory side-cells)`.
   Every required input/comparison is checked before any output write. On a failure keep any output,
   report the exact error and stop; never patch an input, digest, constant or threshold to get a pass.
4. Record both output SHA-256 hashes. Run the same reader again: expect exit **1** and
   `adoption output exists; the record is written once`. Compare hashes before/after; both must be
   unchanged. This expected refusal is a data-reader test, not permission for engine gate exit 1.
5. Read the record with SA-Opus. It must include:
   - Exact four report/Markdown publications in `docs/improve-generating/evidence/phase1/P6-bench/`:
     `old/A-2026-11-18`, `new/A-2026-11-18`, `new/B-2026-11-18`, `old/B-2026-11-18`;
     comparison and ledger bindings, all indexed inputs and reader hash.
   - `format: pentomino-phase1-adoption`, `version: 1`, plan/inspected/frozen/measured/main commits,
     `source.currentDigest`, `versions`, `bridges`, `bench.cells`, `bench.memory`, nine-file
     `equality.kernelClosure`, three fixtures, historical/current distinctions and exact commands.
   - 70 rows, 35 equal pairs; 14 memory side-cells with both checks pass, process peak 589,246,464
     of 1,610,612,736 bytes and accounted peak 242,014,758 of 1,254,096,896; `model-too-large` zero.
     10x10 Nightmare is 4/5 ten on both sides, with an equal 9/9 pair. T14 cost 2,244.925 of
     2,700 historical counted seconds; no new measurement or deduction-corpus run is claimed.
6. Run `npm run check`, G-PROTECTED, G-WORKTREE, the Scope diff guard, and G-FORMAT with
   `$FormatFiles = @($Allowed[0..2] | ForEach-Object { $_.Replace('/', '\') })`.
   Both SAs explicitly approve the adoption reading. The orchestrator
   records approvals, commands, actual inspected commit and refusal hashes in the execution log,
   checks its two bookkeeping files with G-FORMAT, and commits the task once.

## Tests

No new probe suite. Every required read throws when missing, comparisons use `check()` before the first
write, and writes are exclusive. Both reviewers read the 218-line reader.

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `adoption-reader.mjs` | Source-bound recomputation | Four T14 publications, ledger/comparison, source and fixture inputs | 70 rows / 35 equal pairs / 14 passing memory side-cells; required bindings present |
| Same reader, second run | Write-once refusal | Existing `adoption.json/.md` | Exit 1, exact refusal text, both raw hashes unchanged |

## Documentation

The two records are this task's documentation. No UI/EN/VI string, guide, living-spec or old record edit.
Clearly label historical observations, source checks, P7 context and the limits of timing/memory claims.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --check docs\improve-generating-phase-1\evidence\adoption-reader.mjs` | Root | Exit 0 | 30 s |
| `node docs\improve-generating-phase-1\evidence\adoption-reader.mjs` | Root, unlocked | `recorded` line; both outputs exist | 2 min |
| Same command again; `Get-FileHash -Algorithm SHA256` before/after | Root | Exit 1, `adoption output exists`; unchanged hashes | 2 min |
| `npm run check`; G-FORMAT on the three files | Root | Both repository checks OK; `format: OK (3 files)` | 2 min |
| G-PROTECTED, G-WORKTREE, Scope diff guard | Root | Empty protected/test/spec diffs; only allowed paths | 1 min |
| Joint SA reading | Record and reader | Both accept; orchestrator records the replies | Before acceptance |

## Stop points and questions

- Stop on any absent/mismatched input or unexpected hash; do not run the engine or alter a reference.
- Stop for both SAs' adoption approval before P1-02.
- `QUESTION:` to the pack author through the orchestrator when the task is wrong or contradicts code,
  an ambiguity changes behaviour, a gate fails for an uncovered reason, outside-scope change is needed,
  or a recorded decision would change. Do not decide such a point alone.

## Acceptance criteria

### Business

| ID | Criterion | How verified | Evidence |
|---|---|---|---|
| P1-01-B01 | Adopt existing work without changing puzzles or claiming new measurements | Source bindings and both SAs' reading | Adoption and recorded approvals |
| P1-01-B02 | Honest timing/memory/corpus limits | Historical/current distinction, retained 10x10 result and P7 context only | `adoption.md/.json` |

### Technical

| ID | Criterion | How verified | Evidence |
|---|---|---|---|
| P1-01-T01 | Complete source, report, ledger, fixture, bridge, version and nine-file bindings | Reader checks and record | `adoption.json` |
| P1-01-T02 | Later stages need no adoption rewrite | G-STAGE/G-QUALIFIED cover the test edit and later commits | Check-list §3.3 |
| P1-01-T03 | Written once and reproducible, without a wall-clock field | Step 4 refusal and raw hashes | Execution log and record |
| P1-01-T04 | Only three scoped evidence files; formats pass | Guards, `npm run check`, G-FORMAT | Gate outputs |

## Checklist

- [ ] Every step done; second run refused; exact reader/output hashes recorded
- [ ] No engine/test-runner invocation, protected edit or historical-script rewrite
- [ ] Both SAs approved the source-bound reading and limitations
- [ ] Format, convention and scope gates pass, including orchestrator bookkeeping
- [ ] Every AC has evidence; no commit or push by the executor

## Final report

Start/end/duration; three files; reader/output hashes before/after refusal; inspected commit; recomputed
counts/peaks; each AC's evidence; joint approvals, questions/rulings/deviations. No commit or push.

## Execution log

| Item | Value |
|---|---|
| Start, end, duration | dispatched 11:08 +07:00; SA-Astra 11:08:45 to 11:15:18; SA-Opus review to 11:27; accepted 11:29; about 21 min |
| Waiting for rulings | none |
| Agent id, model | SA-Astra 56d9faa7 (gpt-6-astra), executor per plan §8; SA-Opus a607e081 (claude-opus-5.5), reviewer |
| Calls; input, output and cache-read tokens | SA-Astra since 11:08: 9; 2,045,180 / 29,388 / 1,978,409 |
| AI credits | 428.24 (SA-Astra) |
| Questions and rulings | none; SA-Opus: accept, both SAs approve the adoption reading; his review evidence committed separately (4e4f10f) |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | second `node docs\improve-generating-phase-1\evidence\adoption-reader.mjs` refused (exit 1); reader sha256 9130200b..., adoption.json dbc8b1b9... unchanged; `npm run check` OK; `git diff --stat eca0f94 -- core generator tests docs/design-detail.md` empty |
| Commit | this task's commit |
| Issues and named items | none; record: 70 rows, 35/35 equal pairs, 14/14 memory side-cells, 58 input bindings |
