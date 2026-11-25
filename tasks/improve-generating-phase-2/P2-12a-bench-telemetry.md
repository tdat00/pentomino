# P2-12a: Validation telemetry in the bench rows

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1 (`tools/calibrate.mjs`, `tools/bench/runner.js`: a validation profile without landscape sampling, counters in the rows), §4.6, §7.1; D-P2-10, D-P2-12; review-1 R6; `contracts.md` C6 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-12a` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | C; P2-06 (`counters` and `trail` in the results) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2 h; machine: locked focused runs |

## Goal

One production bench row carries what the validation reads besides time: the selection counters of the set and of the
batch, and the set stage's ordered `trail` (N-V4-16), and a bench matrix may hold `require` cases (N-V4-15). Rows of a
`--matrix` run are already without landscape sampling (`tools/calibrate.mjs` line 528); phase 2 uses that path.

## Authority and fixed points

- `tools/bench/runner.js`: `checkCase` refuses `uniqueness !== 'any'` (lines 174-176); `fillRecord` (624-739) builds
  `run.details` only when a set exists.
- The counters and the trail come from P2-06's `SetJobResult.counters` and `trail` and `BatchJobResult.counters`. The
  shape is `contracts.md` C6, `trail.noWindow` included (R6: every no-window set attempt, beyond the first four too).
- Not provenance, not stored in packs (R4).
- **Parallel placement (check-list §3.7).** P2-10 and P2-11b may run beside this task and edit `generate()` (lines
  535-590) and the import block of `runner.js`. This task changes only `checkCase` (174-176) and `fillRecord` with its
  JSDoc, adds no import, and keeps the line `run.responseMs = s.tDone - s.t0;` (628) byte for byte: the copies' link
  edit `link-10` anchors on it.

## Scope

- **Change:** `tools/bench/runner.js` (steps 1-2); `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`, the calibrate
  bullet only (step 3).
- **Change tests**, new cases at the end of each file: `tests/benchmark-matrix.test.js`, `tests/calibration.test.js`.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/bench/runner.js', 'tests/benchmark-matrix.test.js', 'tests/calibration.test.js',
    'DEVELOPERGUIDE.md', 'DEVELOPERGUIDE.vn.md', 'tasks/improve-generating-phase-2/P2-12a-bench-telemetry.md')
  ```

## Steps

1. `checkCase`: accept `c.uniqueness` `'any'` or `'require'`; the message becomes `uniqueness must be "any" or
   "require"`. The `generate()` path already passes `caseDef.uniqueness` to both requests.
2. `fillRecord`: directly after the line `run.ratingCensoredCount = kept.filter((v) => isCensored(v.puzzle.rating)).length;`
   (631), add
   `run.telemetry = { setCounters: s.set?.counters ?? null, batchCounters: s.batch?.counters ?? null, trail: s.set?.trail ?? null };`
   It runs for every record, so a failed set has it too. Document the field in `fillRecord`'s JSDoc, citing
   `contracts.md` C6. `tools/bench/report.js` and its `validateRunRecord` stay unchanged: extra fields are accepted.
3. The guides: append one sentence at the end of the calibrate bullet, after its last sentence, which ends
   "(score, decisive guesses, deduction tier, census estimates)." (`DEVELOPERGUIDE.md` line 80) and
   "(điểm, các lần đoán quyết định, bậc suy luận, các điểm chấm ước lượng)." (`DEVELOPERGUIDE.vn.md` line 81).
   Keep the guides' line width; the texts are:
   - English: "A `--matrix` case may set `"uniqueness": "require"`, and every run record has `telemetry`: the
     clue-selection counters of the piece set and of the puzzles, and the trail of the piece-set stage (its first four
     attempts, the early stop by the bound, and the number of attempts that found no suitable clue count)."
   - Vietnamese: "Một trường hợp của `--matrix` có thể đặt `"uniqueness": "require"`, và mỗi bản ghi lượt chạy có
     `telemetry`: các bộ đếm của bước chọn mảnh đặt sẵn cho bộ mảnh và cho các đề, và vết của bước tạo bộ mảnh (bốn lần
     thử đầu tiên, việc dừng sớm theo giới hạn và số lần không tìm được số mảnh đặt sẵn phù hợp)."
4. Tests below; the locked focused gate.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/benchmark-matrix.test.js` | `a matrix case may require uniqueness` | the file's valid case with `uniqueness: 'require'`; with `'maybe'` | valid; refused with path `cases[0].uniqueness` |
| `tests/calibration.test.js` | `a run record carries the telemetry` | the file's scripted host run of one case | `run.telemetry` has `setCounters`, `batchCounters` (objects with the four counter fields) and `trail` (with `attempts`, `sameSide`, `boundFired` and `noWindow: { below, above }`) |
| same | `a failed set still has telemetry` | the scripted host with a set that fails `time-limit` | `run.telemetry.trail` present, `batchCounters` null |

## Documentation

`DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`: the sentence of step 3, verbatim, in both languages.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked focused gate: `-NodeArgs @('--test', 'tests/benchmark-matrix.test.js', 'tests/calibration.test.js', 'tests/benchmark-report.test.js')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| the link-10 check: `Select-String -SimpleMatch -LiteralPath (Join-Path $root 'tools\bench\runner.js') -Pattern 'run.responseMs = s.tDone - s.t0;'` | slot root | the line still present, unchanged | 30 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- `QUESTION:` if a report renderer or aggregate of `tools/bench/` assumes `any` and fails on a `require` row.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-12a-B01 | `require` and the bound's reach become measurable in ordinary bench rows | the tests | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-12a-T01 | Telemetry in every row, also for a failed set; no provenance field | calibration cases | test output |
| P2-12a-T02 | Guides in step in both languages | diff | diff |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] Both developer guides updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

Start and end times; files changed; helper lines and pass counts; each AC row with its evidence; questions and
deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | |
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator (merge gate) | |
| Commit (slot), commit on `gen-v4` | |
| Issues and named items | |
