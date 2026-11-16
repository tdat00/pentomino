# T05: Per-set prior (P4 part 2) in the prototype: value and transport

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P4 item 2 ("the calibration returns the count and the window at which it found the band; `generateBatch` passes them in every `puzzleCandidate` task, and the candidate's `locateCount` starts there") and P4's identity rule (IG-P-Q03), §5.1 stage 2 ("the per-set prior on Hell 1 first"); decisions D-V4-05, D-V4-09; drift DR-O04; review RV1-02, RV1-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T04f |
| Depends on | T04f (the stage-1 binding is written before this task changes the `v4` files; the stage-1 allowance covers this task's locked steps) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 6 min allocated (guard 450 s) |

## Goal

The per-set prior is the frozen round's first pilot arm: on Hell, the profiles before the first in-band hit are about
half of the batch profile time, and the calibration has already found the window of the same set. This task builds
the arm `v4-ps`: the calibration's window count travels with the request to every candidate and starts its locate.
The record side (`made.igPrior`, its reader and its replay) is already in every `v4`-family tree (T02c); this task
adds only the value and its transport.

## Authority and fixed points

- Plan §3 P4 item 2 and IG-P-Q03 ("The prior, its table version, the target and the uniqueness mode are stored with
  the request and in the pack's generation meta. Without a matching calibration ... the prior is rebuilt from the
  table and the set."); check-list D-V4-05 (the arm has its own algo id `gen-v4-proto:v4-ps`) and D-V4-09.
- The match rule is the one by which the batch reuses the calibration puzzle (`calibrationCandidate`,
  `core/engine/generate.js:427-433`): the calibration's `rating.level` is the target level, and in `require` mode
  its certificate is `unique`. Without a match the candidate uses the table prior (T02a's `priorCount`).
- T02c's edits `pv-5` (the candidate passes `ctx.igPrior` to `selectClues`), `pv-6` (`made.igPrior: ctx.igPrior ??
  null`) and `pv-17` (the replay passes `m.igPrior` back) stay as they are; `v4.json` does not change.
- Edits are copy-only anchored edits of the variant; production files do not change.

## Scope

- Create: `tools/ig-proto/variants/v4-ps.json`; `tools/ig-proto/plans/V4-T05.json`,
  `tools/ig-proto/plans/V4-T05.prior-gen.json`, `tools/ig-proto/plans/V4-T05.prior-replay.json`.
- Change: `tools/ig-proto/lib/lane-worker.mjs` (two fields of the `v4-generate` result, step 2),
  `tools/ig-proto/v4-check.mjs` (subcommand `prior-verdict`, step 3), `tools/ig-proto/self-test.mjs` (one `--items`
  case), `tools/ig-proto/README.md` (one paragraph).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T05 --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/ig-proto/variants/files tools/ig-proto/variants/v4.json`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T05 --label frozen`.
1. **`variants/v4-ps.json`**: `"id": "v4-ps"`, `"extends": ["v4"]`, `"description"`: "gen-v4 prototype with the
   per-set prior (V4-T05, plan P4 item 2): the calibration's window count starts every candidate's locate.",
   `"files": []`, `"params": { "perSetPrior": true }`, and these edits (`\n` is a line break; every `find` occurs
   exactly once in its file of the `v4` tree; checked by the pack author on `3fc65f4` with the `instr` and `log`
   edits applied):

   | Id | File | Find | Replace |
   |---|---|---|---|
   | `ps-1` | `core/engine/generate.js` | `      certificate: cal.certificate,\n    },\n    attempt,\n` | `      certificate: cal.certificate,\n      igWindow: cal.igWindow ?? null,\n    },\n    attempt,\n` |
   | `ps-2` | `core/engine/protocol.js` | `'seenLayouts', 'seenClues', 'slot', 'attempt'],\n  },\n` | `'seenLayouts', 'seenClues', 'slot', 'attempt'],\n    optional: ['igPrior'],\n  },\n` |
   | `ps-3` | `core/engine/protocol.js` | `    return [set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts, seenClues, slot, attempt].includes(undefined)\n      ? undefined\n      : { set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts, seenClues, slot, attempt };\n` | `    const igPrior = o.igPrior === undefined ? null : readInt(ctx, o.igPrior, 'payload.igPrior', 1, 128);\n    return [set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts, seenClues, slot, attempt, igPrior].includes(undefined)\n      ? undefined\n      : { set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts, seenClues, slot, attempt, ...(igPrior === null ? {} : { igPrior }) };\n` |
   | `ps-4` | `core/engine/tasks.js` | `        seenClues: new Set(p.seenClues),\n        execution,\n      }, p.slot, p.attempt);\n` | `        seenClues: new Set(p.seenClues),\n        ...(p.igPrior === undefined ? {} : { igPrior: p.igPrior }),\n        execution,\n      }, p.slot, p.attempt);\n` |
   | `ps-5` | `core/browser/generation-client.js` | `      seenClues: [...frozen.seenClues],\n    };\n` | `      seenClues: [...frozen.seenClues],\n    };\n    const igPrior = igPriorOf(request.calibration, levelId, uniqueness);\n` |
   | `ps-6` | `core/browser/generation-client.js` | `'puzzleCandidate', { ...base, slot, attempt }` | `'puzzleCandidate', { ...base, ...igPrior, slot, attempt }` |
   | `ps-7` | `core/browser/generation-client.js` | append | the function below |

   `ps-7` appends:

   ```js

   // ig-proto, variant v4-ps (V4-T05): the per-set prior of plan P4 item 2, under the match rule of
   // calibrationCandidate (generate.js): the calibration shows the target level, and `require` needs a unique
   // certificate. The completion pass gets no prior (its payload has no such field).
   /**
    * @param {any} cal The batch's usable calibration puzzle, or undefined.
    * @param {string} levelId
    * @param {'any' | 'require'} uniqueness
    * @returns {{ igPrior?: number }}
    */
   function igPriorOf(cal, levelId, uniqueness) {
     if (cal === undefined || cal === null || cal.rating === null || cal.rating.level !== levelId) {
       return {};
     }
     if (uniqueness === 'require' && cal.certificate?.status !== 'unique') {
       return {};
     }
     const wc = cal.igWindow?.wc;
     return Number.isInteger(wc) && wc >= 1 ? { igPrior: wc } : {};
   }
   ```

2. **`lib/lane-worker.mjs`**: the `v4-generate` result (outcome `ok`) gains `calibrationWindow:
   set.calibration?.igWindow ?? null` and `madeRecords: b1.accepted.map((p) => b1.made[p.id] ?? null)`.
3. **`v4-check.mjs prior-verdict --task V4-T05 --label frozen --source-label <SL>`** and the pure export `export
   function priorVerdict(rows, starts)`: `rows` are the joined rows of the steps `prior-gen` and `prior-replay`;
   `starts` are the journal `start` lines with `stage: 'batch'` of the generation item's `logDir`. `pass` when the
   generation item is `completed` with outcome `ok`, `w = calibrationWindow.wc` is an integer, every `madeRecords`
   entry of kind `candidate` has `igPrior === w` and `versions.algo === 'gen-v4-proto:v4-ps'`, every start line has
   `priorCount === Math.min(K - 2, Math.max(1, w))` (`K` from the line), there is at least one candidate, and
   `replayVerdict(rows)` (T04c) is `pass`; `incomplete` when the generation gave no candidate or a row is missing or
   censored; else `fail` with the reasons. It writes `evidence/frozen/V4-T05/prior.json|md` (the rows, the start
   lines, the verdict) and prints `prior: <verdict>` (with the reasons when not `pass`); exit 0 when written.
4. **Manifests and plan.** `plans/V4-T05.prior-gen.json`: step `prior-gen`, one row `{ kind: 'v4-generate', variant:
   'v4-ps', caseId: '14x14-nightmare', seedText: 'ig-v4/prior/14x14-nightmare', quantity: 3 }`.
   `plans/V4-T05.prior-replay.json`: step `prior-replay`, one row `{ kind: 'v4-replay', variant: 'v4-ps', caseId:
   '14x14-nightmare', seedText: 'ig-v4/prior/14x14-nightmare', puzzles: 3, packStep: 'prior-gen' }`.
   `plans/V4-T05.json`: `"allocationMinutes": 6`, `"optionalMinutes": 0`, steps `firewall-snapshot` (unlocked),
   `trees` (`tools\ig-proto\lib\tree.mjs build v4 v4-ps`, unlocked), `prior-gen` (locked, `repeatUntilDone` true,
   `projectS` 150, `minHorizonS` 270, `invocations` 1, `tools\ig-proto\v4-check.mjs run --task V4-T05 --step
   prior-gen --manifest tools\ig-proto\plans\V4-T05.prior-gen.json`, state `V4-T05\prior-gen\state.json`),
   `prior-replay` (locked, `repeatUntilDone` true, `projectS` 90, `minHorizonS` 150, `invocations` 1, the same with
   `prior-replay`), `verdict` (unlocked, `tools\ig-proto\v4-check.mjs prior-verdict --task V4-T05`),
   `firewall-check` (unlocked). Forecast 150 + 90 + 2 x 45 = 330 s within the allocation of 360 s.
5. **Self-test** case `items: per-set prior verdict` appended to `--items` (Tests table).
6. **README.md**: a paragraph on `v4-ps` (the match rule, the payload field, the replay, the verdict).
7. Run, after the unlocked checks pass and in one PowerShell session at the root:

   ```powershell
   $lock = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T05.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <approved>
   if ($LASTEXITCODE -ne 0) { throw ('STOP: V4-T05 run-task exited ' + $LASTEXITCODE) }
   ```

   with the stage-1 allowance's `<approved>` (check-list §1).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --items` | `items: per-set prior verdict` | `priorVerdict` on synthetic rows: (a) generation `ok` with `calibrationWindow.wc` 6, two candidate records with `igPrior` 6 and algo `gen-v4-proto:v4-ps`, one calibration record, start lines with `K` 30 and `priorCount` 6, replays `matched` (calibration) and `matched` with `detailStep` 3 (candidates); (b) the same with one candidate `igPrior` 5; (c) the same with one start line `priorCount` 4; (d) generation `no-pack` | (a) `pass`; (b) `fail`; (c) `fail`; (d) `incomplete` |
| run of step 7 | `prior` verdict | the `v4-ps` request on `14x14-nightmare` | `prior: pass` |

## Documentation

`tools/ig-proto/README.md` (step 6).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | one `ok` line per declared variant, no error; report the printed counts | 2 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T05` | root | every `--items` case passes, exit 0 | 3 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T05.json -Label frozen -SourceLabel 'frozen 3fc65f4' -ApprovedRoundMinutes <approved> -DryRun` | root | both locked steps `go`; forecast 330 s, allocation 360 s, guard 450 s | 1 min |
| step 7 | root | `prior: pass`; `Plan V4-T05 finished: task counted <= 450 s` | each invocation at most 285 s |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: step 7 if the dry run says `stop`; any change to `v4.json`, `ig-select-v4.js` or a
  production file.
- Stop and report after: `prior: fail` or `prior: incomplete` (a diagnosis gate: report the verdict reasons, the rows
  and the batch `start` lines); any `throw` of step 7.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T05-B01 | A batch's candidates start their locate at the calibration's window count of the same set, and a replay starts there too | `prior: pass` | `evidence/frozen/V4-T05/prior.md` |
| T05-B02 | Without a matching calibration the table prior is used (no prior field is sent) | `igPriorOf` code review; the completion payload unchanged | diff |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T05-T01 | The seven edits apply on the `v4` tree | `check-edits` | command output |
| T05-T02 | The verdict rules of step 3 | self-test case | self-test output |
| T05-T03 | Within the allocated machine time | runner totals | runner output |
| T05-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

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
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |
