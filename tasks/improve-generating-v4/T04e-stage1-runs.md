# T04e: Stage-1 runs: source and identity receipt, certificate re-proof, parity and replay on real calls

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 stage 1 (the identity receipt and the certificate re-proved on the frozen source, R14's cases), "Observers", "Parity passes", §9; decisions D-V4-01, D-V4-02, D-V4-06; drift DR-O05, DR-O08, DR-O13; review RV1-04, RV1-06, RV1-08, RV2-09, RV2-14, RV2-20 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T04d |
| Depends on | T04d; **the owner's stage-1 allowance, relayed by the orchestrator** (check-list §3.4) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 1.5 h (mostly waiting for the lock), machine 50 min allocated (IGP-02 25, V4-T04 25; guards 1,875 s each) |

## Goal

Run stage 1 on the frozen source: today's search gives MP12b1's puzzles again (the source changed, the search did
not, DR-O13), the screen certificate holds again with full coverage on R14's cases, and every prototype arm keeps its
observer contracts with the detail of its recorded ratings and replays its own records in full. The result is the
stage-1 receipt that the manifest (T11g) prices on.

## Authority and fixed points

- Plan §5.1 stage 1 and its output; check-list D-V4-02 (nothing runs on the frozen label without an approved budget)
  and §3.2 (the lock helper; difficulty-v3 keeps priority).
- The tools, manifests and plans are those of T04a to T04d and are used unchanged. A tool defect found here is reported
  (`QUESTION:`); it is not fixed in this task without the pack author's ruling.
- Review RV1-08: the second plan runs only after the first exited 0 and its certificate passed the PM4 gate; a
  stopped plan is never followed by the next one.

## Scope

- Create (by running the plans): `docs/improve-generating/evidence/frozen/IGP-02/` (PM4's records),
  `docs/improve-generating/evidence/frozen/V4-T04/` (the arms `base` and `log`, `identity.json|md`,
  `stage1.json|md` and `inputs/`, the captured tree and harness metadata of T04d's summary); raw files under
  `tests/artifacts/ig-proto/frozen/` (git-ignored; the namespaces `IGP-02`, `V4-T04`, `V4-T04v4`, `V4-T04f` and
  `V4-T04i` become historical records that no later run reuses, check-list §3.1).
- Change: nothing else, except `tools/ig-proto/plans/V4-T04.replay.json` in the second replay observation (section
  "Ruling of 2026-11-17"); no harness file (`tools/ig-proto/lib/`, the top-level `.mjs` and `.ps1` files, `data/`)
  until `stage1.json` passes; after it, only step 10's two edits (`tools/ig-proto/self-test.mjs`,
  `tools/ig-proto/README.md`).
- Do not change: any file outside the two evidence folders and that manifest. Guards: `git status --short` lists only
  files under `docs/improve-generating/evidence/frozen/IGP-02/` and `docs/improve-generating/evidence/frozen/V4-T04/`
  and `tools/ig-proto/plans/V4-T04.replay.json`, `tools/ig-proto/self-test.mjs` and `tools/ig-proto/README.md`;
  `node tools\ig-proto\firewall.mjs check --task V4-T04 --label frozen` (the plan's last step) prints `files
  unchanged`.

## Steps

1. Confirm the go: the orchestrator's message gives the owner's approved cumulative cap of the frozen round in minutes
   (92 requested for stage 1, check-list §1; the frozen round has spent nothing before it); use that number as
   `<approved>` below. Without it, stop.
2. In one PowerShell session at the repository root (each command runs until the runner prints its last line; the
   lock helper waits for difficulty-v3 whenever it runs):

   ```powershell
   $lock = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-02.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <approved>
   if ($LASTEXITCODE -ne 0) { throw ('STOP: IGP-02 run-task exited ' + $LASTEXITCODE) }
   node tools\ig-proto\v4-check.mjs pm4-gate --label frozen --source-label 'frozen 3fc65f4'
   if ($LASTEXITCODE -ne 0) { throw ('STOP: the PM4 gate exited ' + $LASTEXITCODE) }
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T04.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <approved>
   if ($LASTEXITCODE -ne 0) { throw ('STOP: V4-T04 run-task exited ' + $LASTEXITCODE) }
   ```

   A `throw` ends the step: keep the output and the state files as they are, report the runner's last 30 lines and
   the stopped step's `state.json` (and for an item step its `items.jsonl`); never re-run a stopped step, never
   continue with the next plan, never raise a budget. An item step that stops with `items: STOP: interrupted item
   <id> needs a ruling` or `identity mismatch` waits for the pack author's ruling.
3. Read `docs/improve-generating/evidence/frozen/V4-T04/stage1.md` and report its verdict line and blocks, the two
   runners' last lines (task and round counted seconds) and, from `tests/artifacts/ig-proto/frozen/IGP-02/` and
   `.../V4-T04/` `invocations.jsonl`, the counted seconds per step.

## Tests

No new tests. The runs are the gates (next section).

## Documentation

None; the evidence is the record.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| the IGP-02 command of step 2 | root | `Plan IGP-02 finished: task counted <= 1875 s ...`; exit 0 | each invocation ends by its horizon (at most 285 s); the plan within its guard of 1,875 s counted |
| `v4-check.mjs pm4-gate` | root | `pm4-gate: pass`; exit 0 | 1 min |
| the V4-T04 command of step 2 | root | `Plan V4-T04 finished: task counted <= 1875 s ...`; exit 0 | the plan within its guard of 1,875 s counted |
| `stage1.md` verdict and `stage1.json` | evidence | `Stage 1: holds.`; `stage1.json` is an `ig-v4-proof` envelope of kind `stage1` with `verdict: 'pass'` | — |
| `npm run check` | root | exit 0 (the new evidence files pass the conventions) | 2 min |

Diagnosis gates (each is a stop point when it fails or is incomplete):

| Gate | Expected | When it fails |
|---|---|---|
| Source | snapshot verified, digest `FROZEN_DIGEST`, every variant's edits apply | stop; report the block |
| PM4 certificate | `pm4-gate: pass` (0 violations, certified runs > 0, no coverage gap, every certified run equal to its canonical rating) | stop; report the block and `tests/artifacts/ig-proto/frozen/IGP-02/main/screens-<shard>-violations.json` when present |
| Identity | R00 holds; an MP12b1 run on every identity seed (`summary.withoutMp12b1` 0); every `mp12b1~base` pair `different-source` with `sameResult: true` (DR-O13); every `base~log` pair `puzzle-identity` | stop; report the seed, both runs' `describe` blocks and the first difference |
| Self-test | the four groups `done` with every result passing | stop; report the failing case and reason |
| Parity | `pass` (every arm, case and mode present; equal results and skips; complete and equal total work, rating and count work, and equal charge sequences; full detail on recorded ratings, rechecked against `rateDetailed`) | stop; report the group's rows |
| Replay | `pass` (a full candidate replay per generation case, with a measuring step) | `fail`: stop with the rows; `incomplete`: stop with the reasons and the findings (`incomplete` replays with reason, work units and bytes are also evidence for `REPLAY`'s re-derivation, N-V4-07) |

## Stop points and questions

- Stop and report before: step 2 without the orchestrator's go; any re-run of a failed or stopped step; any raise of
  a budget or the approved minutes.
- Stop and report after: each failed or incomplete diagnosis gate (table above), and at the end of the task with the
  stage-1 receipt (the orchestrator relays it; T04f to T11f do not depend on the owner, T11g ends at the owner's price stop).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Ruling of 2026-11-17: the second replay observation

The first run stopped with `Stage 1: INCOMPLETE (replay: no record obtained for 26x26-nightmare (v4) (no-set))`; every
other block passed. The pack author's diagnosis (read-only): the `26x26-nightmare` generation item ran its set stage
with `uniqueness: 'require'` on one pool worker; attempt 0 (K 31) ended `not-in-band` after 63.7 s (101 ratings,
13.9 G units: 16 central candidates at 4 or 5 clues, every unique repair to 7 to 9 clues refused by AR1 (24) or
below the band (9)); attempt 1 was still in its beam when the client's request deadline (`TIME.dispatchStopMs`,
115,000 ms) ended the set. Each rating took about 0.6 s, as 26x26 ratings do; the frozen search shows the same
failure mode under `require` (the `14x14-master` item's attempt 0, `not-in-band` after 97 ratings). It is a
measurement of that configuration, not a defect of the prototype or of the harness. The provisional 26x26 figures
and the identity runs use `uniqueness: 'any'` with four workers (`arm.mjs`), so they do not compare; 26x26 is never
generated with `require` in the product (the Generator's 484-cell limit, DR-O16) nor in the frozen round (`any`).
The stage-1 replay therefore uses `14x14-nightmare`, a headline validation cell, as its third case. The first
observation is kept, unchanged, as an archive; the replay step runs again with the same harness, so the producer
binding of T04d holds. No budget is raised.

4. Before any change, at the root: `git status --short -- tools/ig-proto` prints nothing, and

   ```powershell
   node --input-type=module -e "import { readFileSync } from 'node:fs'; import { harnessInfo } from './tools/ig-proto/lib/records.mjs'; const s = JSON.parse(readFileSync('tests/artifacts/ig-proto/frozen/V4-T04/parity/state.json', 'utf8')); console.log(harnessInfo().harnessHash === s.identity.harnessHash ? 'same harness' : 'HARNESS CHANGED');"
   ```

   prints `same harness`. Anything else: stop with `QUESTION:`.
5. Archive the first replay observation and receipt (moves; no content changes):

   ```powershell
   Move-Item tests\artifacts\ig-proto\frozen\V4-T04\replay tests\artifacts\ig-proto\frozen\V4-T04\replay-a1
   Move-Item docs\improve-generating\evidence\frozen\V4-T04\stage1.json docs\improve-generating\evidence\frozen\V4-T04\stage1-a1.json
   Move-Item docs\improve-generating\evidence\frozen\V4-T04\stage1.md docs\improve-generating\evidence\frozen\V4-T04\stage1-a1.md
   Copy-Item tools\ig-proto\plans\V4-T04.replay.json docs\improve-generating\evidence\frozen\V4-T04\replay-a1.manifest.json
   ```

   `stage1-a1.json` names the paths of the first observation: its raw files are now under `.../V4-T04/replay-a1/`
   (`invocations.jsonl` stays where it is, so the round's counted time keeps them).
6. In `tools/ig-proto/plans/V4-T04.replay.json`, replace the two `26x26-nightmare` rows by these two (every other
   line unchanged, so the manifest still expands to 9 items):

   ```json
   { "kind": "v4-generate", "variant": "v4", "caseId": "14x14-nightmare", "seedText": "ig-v4/replay/14x14-nightmare", "quantity": 2 },
   { "kind": "v4-replay", "variant": "v4", "caseId": "14x14-nightmare", "seedText": "ig-v4/replay/14x14-nightmare", "puzzles": 2 }
   ```

7. Dry run, then the run, in one PowerShell session (`$lock` as in step 2; `<approved>` stays 92):

   ```powershell
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T04.json -Label frozen -SourceLabel 'frozen 3fc65f4' -ApprovedRoundMinutes 92 -Only replay,summary,firewall-check -DryRun
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T04.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes 92 -Only replay,summary,firewall-check
   if ($LASTEXITCODE -ne 0) { throw ('STOP: V4-T04 replay run-task exited ' + $LASTEXITCODE) }
   ```

   The dry run must show `replay: go`; the run takes about two invocations (about 250 s counted, the task's cap
   1,875 s against 1,131 s counted so far).
8. Report as step 3, plus: the `packSha256` of the `14x14-master` and `12x12-nightmare` generation items, which must
   equal the first observation's (`c155ed73...` and `740ea23e...`, same seeds, one worker, fixed `createdAt`); a
   different hash is a stop with `QUESTION:` (generation would not be deterministic).
9. Stop points of the ruling: the `14x14-nightmare` generation ends `no-set` or `no-pack`, or any gate of the table
   fails or is incomplete: stop and report; never a third observation without a ruling.
10. Fix round after the passing receipt (ruling of 2026-11-17, the orchestrator's verification: `--items` case 10
    `checks: manifest expansion` still names the old third case). `stage1.json` is final: its producer is the stored
    `harnessHash` (`136d4c6c...`), which T04f binds (D-V4-18); `self-test.mjs` and `README.md` are not among its
    evidence files, so these two edits leave the receipt valid. Never run `v4-check.mjs summary --task V4-T04` or a
    `V4-T04` plan again (after any harness edit the summary reports `producer changed since the observation` and
    would overwrite the passing `stage1.json`), and never run a self-test group under the historical ids `V4-T04`,
    `V4-T04v4`, `V4-T04f` or `V4-T04i`.
    - `tools/ig-proto/self-test.mjs`, case `checks: manifest expansion`: the line
      `const cases = ['14x14-master', '12x12-nightmare', '26x26-nightmare'];` becomes
      `const cases = ['14x14-master', '12x12-nightmare', '14x14-nightmare'];` (the case's other expectations derive
      from it: ids, `caseBoard(caseId).maxActive`, pack paths).
    - `tools/ig-proto/README.md`, section "Stage 1 checks", the **Manifests** bullet: "for `14x14-master`,
      `12x12-nightmare` and `26x26-nightmare` one `v4-generate` row" becomes "for `14x14-master`, `12x12-nightmare` and
      `14x14-nightmare` one `v4-generate` row", and the bullet ends with the sentence "The third case was
      `26x26-nightmare` until the ruling of 2026-11-17 (no set under `require` with one pool worker within the
      115-second request deadline); that first observation is archived in `V4-T04/replay-a1/` and `stage1-a1.json`."
    - Gates (unlocked), at the root:

      ```powershell
      node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T04e-verify
      node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T04e-verify
      ```

      26 and 10 cases pass; T04f's step-0 one-liner on `stage1.json` prints `same` on every line; `npm run check`
      exits 0.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04e-B01 | The frozen source gives MP12b1's puzzles on the identity seeds (today's search unchanged) | identity gate | `evidence/frozen/V4-T04/identity.md` |
| T04e-B02 | The screen certificate holds on the frozen source with full coverage | PM4 gate | `evidence/frozen/IGP-02/pm4.md` |
| T04e-B03 | Every prototype arm keeps its observer contracts with full recorded detail, and its records replay in full | parity and replay gates | `evidence/frozen/V4-T04/stage1.md` |
| T04e-B04 | Stage 1 stayed within the approved allowance, under the lock | the runners' counted totals | runner output; `invocations.jsonl` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04e-T01 | Every record carries the frozen banner and `meta.source.frozenCommit`; `stage1.json` binds the stored arms, coverage and evidence hashes | read `pm4.json`, `identity.json`, `stage1.json` | the files |
| T04e-T02 | The second plan ran only after the first exited 0 and the PM4 gate passed | the session transcript | final report |
| T04e-T03 | Only the two evidence folders changed | guard | `git status --short` |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-17 08:16:21 +07:00 (dispatch, base `a082333`) to 11:18:47 +07:00 (acceptance): 3 h 2 min 26 s; the developer's own times 08:16:58-10:40:03 (first observation), 10:57:55-11:11:19 (second replay observation), 11:16:52-11:18:09 (fix round) |
| Waiting for rulings | about 17 min on the QUESTION (10:40 to 10:57) and about 5 min on the case-10 ruling (11:13 to 11:16); lock waits for Sudoku's difficulty-v3: 3,062 s (IGP-02), 3,981 s (V4-T04 first observation) and 604 s (second replay), counted at most 45 s per invocation |
| Agent id, model | `de89d541-565c-4f9b-885a-36db5d2c8c1b`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 94 calls; 9,895,344 input, 40,307 output, 9,513,660 cache-read |
| AI credits | 230.85 |
| Questions and rulings | QUESTION 1 (10:40): the first observation's receipt was `incomplete` (replay: the 26x26 Nightmare generation item ended `no-set` at the 115 s deadline). Ruling of the pack author (10:57): not a defect (`uniqueness: 'require'`, one worker; the provisional and identity runs used `any` with four workers); a second replay observation in place with `14x14-nightmare` (archive `replay-a1`, `stage1-a1.*`), same harness, within the granted cap; N-V4-15; pack amendment `984aff9`. The orchestrator's verification found the `--items` case 10 hard-coding the old case; ruling (11:16): T04e step 10 (case list and README); pack amendment `2f4905a` |
| Fix rounds | 1 (case 10's case list and the README's Manifests bullet) |
| Gates re-run by the orchestrator | Not re-run (they would rewrite the evidence; the ruling forbids a second summary): the records checked instead. `stage1.md`: `Stage 1: holds.`, blocks source, identity, pm4, self-test, parity, replay, inputs all `pass`; `stage1.json` verdict `pass`, frozen commit `3fc65f4…`, 5 arms, 20 evidence entries, 0 of 20 changed (lf-text SHA-256 recomputed); runners' last lines: IGP-02 task 1,020 s, V4-T04 task 1,354 s, round 2,374 s of 5,520 s. Unlocked gates re-run: `--items` 26 passed, 0 failed; `--frozen` 10 passed; firewall `check` (V4-T04): 289 production files unchanged; `npm run check`: OK; evidence formats: 0 problems (CRLF, no BOM, no trailing whitespace). Scope: `V4-T04.replay.json` (two rows), `self-test.mjs` (one line), README, and the evidence folders `IGP-02/` and `V4-T04/` |
| Commit | this task's commit, `improve-generating T04e: Stage-1 runs: source and identity receipt, certificate re-proof, parity and replay on real calls` |
| Issues and named items | N-V4-15 (`require` on the largest offered boards is unmeasured by the frozen round; for the production pack). The first observation stays as evidence (`replay-a1.manifest.json`, `stage1-a1.*`; raw logs under `tests/artifacts/`) |
