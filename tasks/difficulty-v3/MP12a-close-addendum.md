# MP12a — Closing addendum (binding)

| Header | Value |
|---|---|
| ID | MP12a, close (the task file `MP12a-calibration-slice.md` and its TP29 addendum stay frozen as dispatched) |
| Written by | SA1 (claude-opus-5.5), 2026-11-13, after the plan author's answer to PR-P1 and the owner decisions P-OD8 and P-OD9 (`docs/difficulty-v3/clarifications-resolved.md` Part H, Part I PR-P1) |
| Given by | the orchestrator, to the developer who closes MP12a, together with the task file; it binds where it differs from the task file |
| Starting point | HEAD after the pause-state commit `a25960c`, Fable's answer `55c0c61` and the pack revision of the resume; the working tree holds no change of MP12a (everything of the three rounds is committed in `a25960c`) |
| Estimated size | Small: about 80–150 changed lines (four new sections and the handoff of the record; three sentences of `docs/design-detail.md`); about 20–30 minutes of developer work plus about 10–15 minutes of machine time under the lock (the fixture check, the UI-flow file, the final `npm test`, the quick set) |
| Gates owned | GA-P2 for the round-2 tuple (its verification: the UI-flow file and the final `npm test`); the GF-P2 check (`--check` only) |

## Why

MP12a stopped after round 2 by its orders (record §6.7): C4 failed in 10x10-master (7.0 %). The owner then accepted
those estimates (P-OD8 (a), 17:44: `census` stays 80,000,000 and MP12a closes). At 17:44 the orchestrator ran GF-P2
for the round-2 tuple; at 17:45-17:47 the first GA-P2 run failed in three places (the `scores` of `heart-n10-master`
and `square-22x22-nightmare`, and an EPERM in the cleanup hook of `tests/site-tools.test.js`); at 17:48 the two
recipes were migrated (`expect.scores` only) and `tests/site-tools.test.js` passed alone; at about 17:49 the pause
cancelled the developer (`docs/difficulty-v3/working-status.md` §2.2). Four closing steps remain (working-status §2.2):
the GA-P2 verification, the final checks, the record and design text, and the orchestrator's commit.

The plan author's answer to PR-P1 adds what the record and the design must now say: the tuple to lock is
`12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)` (`base.max / base.scale / rule / weights.G / weights.info /
penalty`), unless MP12b1 breaks C1 or C3; values on range edges are acceptable; R7 (order noise) is confirmed as one
canonical order without a median and is a known limitation of design §7.8; on the full landscape a cell above 5 %
census estimates is a listed finding and only a cell above 25 % goes to the owner, with no census change in MP12b;
and P-OD9 decides D36 (i) and the stop and review rules of the remaining parts.

## What does not change

- Nothing is measured again: no round, no landscape shard, no probe capture, no rating run, no knob search. No value
  of `SCORE_V3`, `DEDUCE`, `K60`, `POLICY_ID`, `SHARES` or `STALL_LIMIT` changes.
- **No file of `SOURCE_FILES` is edited** (`tools/bench/report.js:37-46`: every `core/engine/*.js`,
  `core/browser/worker-pool.js`, `core/browser/generation-client.js` and `core/browser/auxiliary.js`), not even a
  comment: the source digest of the tree must stay `34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918`,
  the digest of the 18 round-2 reports, because MP12b1 reuses those reports only under an equal digest and MP12b2's
  `Assert-CriteriaSource` checks the same. The stale comment above `SCORE_V3` in `core/engine/policy.js` ("Defined but
  not yet the rating …") therefore stays; MP12b3 corrects it.
- GF-P2 is not run again with `--replace`: the fixtures written at 17:44 stay unless the check of step 2 fails.
- The task file's rules stay in force (the lock helper, CRLF, no history edit, no stage or commit). Under P-OD9 a
  new performance or availability observation is a named item in the record (section 8.6 below), never a stop; a
  correctness failure (a check or test that fails, an identity that differs) stops the close: report it.

## Closing steps (in this order)

1. **Check the start.** Save the helper block of check-list §7 verbatim as `tests/artifacts/MP12a/dv3-lock.ps1`
   again (it replaces the copy of 12:25, which still had the 10-minute wait). Then, without the lock (nothing is
   generated):

   ```powershell
   git --no-pager status --short
   git --no-pager diff --stat f33aa71 HEAD -- core tools tests/fixtures tests/policy.test.js tests/difficulty-v3.test.js tests/clues.test.js
   node --input-type=module -e "import { readFileSync } from 'node:fs'; import { computeSourceDigest } from './tools/bench/report.js'; import { currentVersions } from './tools/record-fixtures.mjs'; console.log(JSON.stringify({ sourceDigest: await computeSourceDigest((p) => readFileSync(p, 'utf8')), versions: currentVersions() }))"
   if ($LASTEXITCODE -ne 0) { throw 'identity failed' }
   ```

   Expected: no change in the working tree outside `tests/artifacts/`; the diff since `f33aa71` touches exactly
   `core/engine/policy.js`, `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json`,
   `tests/fixtures/ui-flow-recipes.json`, `tests/policy.test.js`, `tests/difficulty-v3.test.js` and
   `tests/clues.test.js`; the digest above and the versions `gen-v3`, `mixed-v2`, `xoshiro128ss-v1`, `difficulty-v3`.
   Anything else: stop and report.
2. **The fixture check (GF-P2, check only)**, under the lock:

   ```powershell
   . tests\artifacts\MP12a\dv3-lock.ps1
   $r = Invoke-Dv3Timed -Task 'MP12a close fixture check' -NodeArgs @('tools/record-fixtures.mjs', '--check')
   if ($r.Exit -ne 0) { throw 'record-fixtures --check failed: stop and report' }
   ```

3. **GA-P2 for the round-2 tuple**, under the lock: first the UI-flow file, then the final `npm test`:

   ```powershell
   . tests\artifacts\MP12a\dv3-lock.ps1
   $r = Invoke-Dv3Timed -Task 'MP12a close UI-flow recipes' -NodeArgs @('--test', 'tests/generator-controller.test.js')
   if ($r.Exit -ne 0) { throw 'the UI-flow recipes fail: stop and report' }
   $r = Invoke-Dv3Timed -Task 'MP12a close GA-P2 final' -NodeArgs @('--test', '--test-reporter=spec',
     '--test-reporter-destination=stdout', '--test-reporter=tap',
     '--test-reporter-destination=tests/artifacts/MP12a/ga-p2-r2-final.txt', 'tests/**/*.test.js')
   "GA-P2 final: exit $($r.Exit), stopped at the limit $($r.TimedOut)"
   ```

   Before the runs, check that `tests/fixtures/ui-flow-recipes.json` holds, for `heart-n10-master`,
   `[44, 43, 48, 44, 41, 48, 46, 49, 43, 49]` and, for `square-22x22-nightmare`,
   `[71, 60, 67, 66, 60, 61, 63, 63, 60, 65]` (the values the failing run printed, record §8.4), and that
   `git --no-pager diff f33aa71 HEAD -- tests/fixtures/ui-flow-recipes.json` changes only the three `scores` lines of
   `default-10x6-normal`, `heart-n10-master` and `square-22x22-nightmare`. The final `npm test` must pass. One
   exception, from the incident of 17:45: when its only failure is `tests/site-tools.test.js` with an EPERM from its
   cleanup hook under `tests/artifacts/site-tools-*`, run that file alone under the lock, then the final `npm test`
   once more (label `MP12a close GA-P2 final 2`); record every run. A second EPERM in a full run, or any other
   failure, stops the close: report it with the TAP file. The EPERM is recorded in section 8.6 as a named item for
   MP17 (it predates this task's change: the test touches no rating).
4. **The quick set and the self-tests:** the quick set under the lock; the two self-tests without it:

   ```powershell
   . tests\artifacts\MP12a\dv3-lock.ps1
   $r = Invoke-Dv3Timed -Task 'MP12a close quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
   if ($r.Exit -ne 0) { throw 'quick set failed' }
   node docs/difficulty-v3/landscape-v3/launch.mjs --self-test
   if ($LASTEXITCODE -ne 0) { throw 'launcher self-test failed' }
   node docs/difficulty-v3/landscape-v3/criteria.mjs --self-test
   if ($LASTEXITCODE -ne 0) { throw 'criteria self-test failed' }
   ```

   Expected: `launch self-test: 23 of 23 cases as expected` and `criteria self-test: 5 of 5 synthetic rounds as
   expected` (record §1).
5. **The record** `docs/difficulty-v3/calibration-slice-2026-11-13.md` (this task's own record, not committed as
   final; edit it in place, keeping sections 1 to 8.5 as written except the two additions named here):
   - §7.2, finding 1: add at its end "Decided by the owner on 2026-11-13 at 17:44: P-OD8 (a), 10x10-master's census
     estimates are accepted like 18x20-master's; `census` stays 80,000,000 and the task closes (sections 8.6-8.9)."
   - §8.5: add one closing line "Done after P-OD8 (a): sections 8.6 to 8.9."
   - New §8.6 "The owner's decision P-OD8 and the plan author's answer to PR-P1": P-OD8 (question, evidence, the
     answer, its time); the rows of the PR-P1 answer that concern the slice, quoted briefly with the reference
     `clarifications-resolved.md` Part I, PR-P1: the tuple to lock (above) unless MP12b1 breaks C1 or C3, values on
     range edges accepted; K6 (a puzzle without a decisive guess scores at most 15); K10 and G6 (on the full landscape
     a cell above 5 % census estimates is a listed finding, shipped with the estimate note and the `censored` flag;
     only a cell above 25 % goes to the owner; no census change in MP12b); R7 (one canonical order, no median: a
     property of the label, not an instability; a known limitation in design §7.8, with the numbers of §6.4); P-OD9
     (D36 decided (i); the stop and review rules). Then the named items of the close (or "none"): the EPERM of
     `tests/site-tools.test.js` (time, the run, the folder it could not remove) for MP17, and anything new of step 3.
   - New §8.7 "GF-P2 for the round-2 tuple": the rewrite of 17:44 by the orchestrator (the command's reason text is
     not recorded; the fixtures do not store it); the `--check` of step 2 (result, seconds, lock wait); the diff stat
     of the two fixtures against `f33aa71`; whether the rewrite changed the content written after round 1: not
     recorded (that output was overwritten before any commit), and §8.4's state check (`--check` OK under
     80,000,000 before the rewrite) says it reproduced the same puzzles.
   - New §8.8 "GA-P2 for the round-2 tuple": the first run (17:45:18-17:47:22,
     `tests/artifacts/MP12a/ga-p2-r2-first.txt`: 1,361 tests, 1,358 pass, 3 fail, as above); the migration of 17:48
     (`expect.scores` of the two recipes, the values of §8.4; no key, level, count or other recipe changed);
     `tests/site-tools.test.js` alone at 17:48:16-17:48:22, exit 0; then the runs of step 3 with their counts, seconds
     and lock waits.
   - New §8.9 "The test plan on the round-2 tree": the table of §8.3 for the commands of steps 2 to 4.
   - §9: retitle it "9. Handoff" and rewrite it as the final handoff: the knobs and caps in the tree (as now); the
     slice evidence is `landscape-v3/r2/` with its identity (digest above, `sourceCommit`
     `f33aa71…+uncommitted-changes`, committed in `a25960c`); GF-P2 and GA-P2 ran for the round-2 tuple (sections
     8.7, 8.8); for MP12b1: reuse the 18 round-2 reports by digest and by the four version keys `algo`, `policy`,
     `rng`, `model` (the reports also carry `app`, which `currentVersions()` lacks, section 1.1), the most costly
     cells (the Master cells and 18x20-expert; 10x10-master's work at 58.6 % of the cap); for MP12b2: the tuple to
     lock, the two accepted census exceptions, R7 as a known limitation, `STALL_LIMIT` 12 with its re-examination
     skipped; for the owner: nothing open from this task.
6. **The design** `docs/design-detail.md` (the slice's documentation slot; no other section):
   - §7.8, first bullet: replace "`DEDUCE` unchanged" by "`DEDUCE.census` 10,000,000 to 80,000,000 (owner decision
     P-OD7), with the census estimates of 18x20 master (11.0 %) and 10x10 master (7.0 %) accepted (P-OD7, P-OD8)".
   - §7.8, a new bullet after the first: "**Known limitation: one search order (R7).** The deduction uses one canonical
     search order and no median over several orders (SA2-Q-P06 (a), confirmed by the plan author in PR-P1). Under
     another tie order the decisive guesses of a puzzle can differ by up to 2 and its score by up to 12 points at Hard
     (13 at Master) in the calibration slice (`docs/difficulty-v3/calibration-slice-2026-11-13.md` §6.4), so a puzzle
     near a band edge could be labelled one level apart under another order. A given puzzle always gets the same
     rating, and the Generator aims at the band centre; a median of three orders would triple the rating cost."
   - §7.9, the paragraph on the measured limits: after "accepts the remaining estimates of 18x20 master (11 % of its
     puzzles in the slice's round 2)" add "and of 10x10 master (7 %, owner decision P-OD8)"; in the same paragraph
     delete the second copy of the two sentences on `diagnostics.verifyUndo` and `diagnostics.tieOrder` and of
     "Production callers pass no diagnostics. No RNG and no clock are used." (duplicated since MP08; working-status
     §6.2), keeping the first copy word for word.
   - §4.2, the `policy.js` block: the comment of `SCORE_V3` "§7.10; deeply frozen; fitted, defined but not yet the
     rating" becomes "§7.10; deeply frozen; the knobs of the v3 rating (fit and calibration slice)".
7. **Last:** the format check of the edited documents, then `npm run check`:

   ```powershell
   foreach ($f in 'docs/difficulty-v3/calibration-slice-2026-11-13.md', 'docs/design-detail.md',
       'docs/difficulty-v3/landscape-v3/launch.mjs', 'docs/difficulty-v3/landscape-v3/criteria.mjs') {
     node -e "const t=require('fs').readFileSync(process.argv[1],'utf8');console.log(process.argv[1], /[^\r]\n/.test(t)?'LF found':'CRLF only', t.charCodeAt(0)===0xfeff?'BOM':'no BOM')" $f
   }
   npm run check
   if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
   ```

## Acceptance of the close

| ID | Criterion | Evidence |
|---|---|---|
| MP12a-C01 | No file of `SOURCE_FILES` changed: the tree's digest is still `34cea386…`, the versions unchanged | step 1 output; `git --no-pager diff --stat` |
| MP12a-C02 | `record-fixtures --check` passes; the UI-flow file and the final `npm test` pass under the lock (with only the recorded EPERM exception of step 3) | steps 2-3; the TAP file |
| MP12a-C03 | The quick set, `npm run check` and both self-tests pass; the record, the scripts and the design are CRLF without BOM | step 4 output |
| MP12a-C04 | The record has P-OD8, the PR-P1 rows of the slice, the GF-P2 and GA-P2 sections of round 2, the named items and the final handoff | record §7.2, §8.5-§8.9, §9 |
| MP12a-C05 | Design §7.8 states the census change, the two accepted exceptions and R7 as a known limitation; §7.9 names both exceptions and has no duplicated sentence; §4.2 has no stale `SCORE_V3` comment | the diff of `docs/design-detail.md` |

The task file's own criteria stay as they were evaluated in its record (MP12a-B01 to B03, T01 to T06); this close adds
the evidence for T04 (GF-P2 and GA-P2 after the last change) and T05 (the quick set and `npm run check`).

## Reply

As check-list §8: the commands with their labels, exits, seconds and lock waits; the counts of the final `npm test`
and the quick set; the changed files (only the record and `docs/design-detail.md`); the named items. Then the
orchestrator reviews, fills MP12a's Execution log (the close is part of MP12a's log, not a new task) and commits the
close's changes as `difficulty-v3 MP12a: Calibration slice: the GV2 cases again with v3, and the knob changes` (the
rounds' files are already in the pause-state commit `a25960c`). Under P-OD9 the orchestrator checks this close; no
analyst cross-review is needed.
