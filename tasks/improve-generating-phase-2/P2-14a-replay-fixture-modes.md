# P2-14a: Replay fixture modes and the refusal check

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.7 (fixtures, `REPLAY`); D-P2-09; P2-T07; review-1 R10 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-14a` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | S; P2-01 (`isV4Family` and the table ids) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 1.5 h; machine: locked focused runs (no fixture is written here) |

## Goal

`tools/record-fixtures.mjs` keeps the old `gen-v3` replay case as a refusal case. It can record two `gen-v4` replay
cases at the cutover: the Hard recipe, and a Nightmare recipe whose steps show the screen, found by a bounded search.
Before the cutover nothing changes for today's checks. Nothing is recorded here, and `REPLAY` is not changed.

## Authority and fixed points

- **R10, verbatim:** "Before cutover, the default Hard check uses `replay-case.json`; in the gen-v4 family it uses
  `replay-case-v4.json`. An explicit `--file` always wins; the refusal mode always reads the old fixture. Screen
  discovery reads `result.steps`, `step.args.phase` and `step.args.reason`."
- **R5 (plan §9 P2-14), verbatim:** "Fixture modes and replay-resource tooling: fixed recipes, the separated refusal
  check, bounded fixture discovery with a declared candidate/time limit, and preparation of the resource probes; no
  qualification measurement or speculative increase of `REPLAY` here."
- **The fixture.** `tests/fixtures/replay-case.json` stays byte for byte (G-PROTECTED). After P2-15 it is the refusal
  case.
- **Today's code** (`tools/record-fixtures.mjs` at the base):
  - the usage comment (lines 14-22), `REPLAY_FILE` (52), `REPLAY_SEARCH_BOUND_MS` 540,000 (54), `SEED_COUNT` 50 (49);
  - `currentVersions` (87-89), `replayRecipeOf` (377-381), `generateReplaySeed` (415-453), `checkReplayCase` (502-549);
  - `replayMain` (567-612): exit 0 success, 1 refused or differs, 2 usage.
- **Fixed here** (pack author):
  - The screen recipe is `rectRows(14, 14)` (`tools/bench/calibration-reference.js`; 196 active cells, `n-mid`),
    level `nightmare`, uniqueness `any`, quantity 4, seeds `replay-case-screen-0` to `-49`, with the same 540-s bound.
  - Its condition replaces the "subset skip" note: the replays (`replayPuzzle` of `core/engine/replay.js`, as the
    probe in `checkReplayCase` uses it) of the two packs' `candidate` puzzles hold at least one step with
    `kind === 'rated'` and `args.phase === 'locate'`, and at least one with `kind === 'unrateable'` and
    `args.reason === 'screen-capped'`.
  - The Hard recipe stays `replayRecipeOf` (seeds `replay-case-0` to `-49`).

## Scope

- **Change:**
  - `tools/record-fixtures.mjs`: steps 1 to 4;
  - `tests/generate.test.js`: only inside the test `the recorder refuses to overwrite, requires a reason to replace, and --check replays cleanly`
    (lines 901-921);
  - `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`: the fixtures paragraph only (step 5).
- **Do not change:** `tests/fixtures/` (no file is written here), `core/`, anything else. Guard: G-PROTECTED, and
  G-WORKTREE with

  ```powershell
  $Allowed = @('tools/record-fixtures.mjs', 'tests/generate.test.js', 'DEVELOPERGUIDE.md', 'DEVELOPERGUIDE.vn.md',
    'tasks/improve-generating-phase-2/P2-14a-replay-fixture-modes.md')
  ```

## Steps

1. **Versions.** `currentVersions()` returns `{ algo: ALGO_ID, policy: POLICY_ID, rng: RNG_ID, model: MODEL }` plus,
   when `isV4Family(ALGO_ID)`, `priorTable: PRIOR_TABLE_ID, screenTable: SCREEN_TABLE_ID`. These three come from
   `../core/engine/gen-v4.js`. The `Recipe['versions']` typedef gains the two optional keys.
2. **`--recipe` and `--file`.** The `--replay-case` modes accept `--recipe hard|screen` (default `hard`) and
   `--file <name>` (a file name inside `--dir`).
   - The default file is:
     - for `hard`: `replay-case-v4.json` when `isV4Family(ALGO_ID)`, else `replay-case.json`;
     - for `screen`: `replay-case-v4-screen.json`.
   - `--file` always wins. `--search`, `--create`, `--check` and `--replace` work on that recipe and file as today.
   - `--recipe screen` while `isV4Family(ALGO_ID)` is false exits 2 with
     `record-fixtures: the screen recipe needs the gen-v4 family`, after the usage checks.
   - An unknown `--recipe` value is a usage error (exit 2).
3. **The screen recipe.** `replayRecipeOf(n, recipe)` returns the screen recipe above for `recipe === 'screen'`.
   `generateReplaySeed` runs the same flow for it (the set; batch 1, which reuses the calibration; batch 2), then
   checks the screen condition with `client.replayPuzzle` and returns `{ failed: 'no locate and screen-capped steps' }`
   when it is not met. The printed note says `screen steps yes` in place of `subset skip yes`.
4. **`--replay-case --refusal`** (new). It reads `replay-case.json` of `--dir` (default `tests/fixtures/`), whatever
   `--recipe` or `--file` say, and:
   - checks that each pack parses with `parsePack` and serializes back with every `generation` provenance field
     unchanged;
   - when `provenanceVersions()` (`core/engine/generate.js`) differs from the packs' `generation.setOrigin.versions`:
     runs `replayPuzzle` on every puzzle, requiring `status: 'unavailable'` with `reason: 'set-versions'`, then prints
     `record-fixtures: refusal case OK` and exits 0;
   - when they are equal (before P2-15): prints
     `record-fixtures: refusal case skipped (the running versions are the file's)` and exits 0;
   - otherwise prints each problem and exits 1.

   The usage text and the header comment (lines 14-22) list `--recipe`, `--file` and `--refusal`.
5. **The guides.** Append one sentence to the fixtures paragraph, after "...the way `--check` checks the generation
   fixtures." (`DEVELOPERGUIDE.md` line 124) and after "...giống cách `--check` kiểm tra các dữ liệu mẫu tạo đề."
   (`DEVELOPERGUIDE.vn.md` line 123):
   - English: "From the `gen-v4` cutover on, the default replay case is `tests/fixtures/replay-case-v4.json`
     (`--recipe hard`), with a second case `replay-case-v4-screen.json` (`--recipe screen`) whose steps show the
     screen; `--file <name>` picks another file, and `--replay-case --refusal` checks that the old
     `replay-case.json`, made by `gen-v3`, is refused by version."
   - Vietnamese: "Từ khi chuyển sang `gen-v4`, dữ liệu mẫu chạy lại mặc định là `tests/fixtures/replay-case-v4.json`
     (`--recipe hard`), kèm dữ liệu thứ hai `replay-case-v4-screen.json` (`--recipe screen`) có các bước cho thấy lần
     chấm nhanh; `--file <tên>` chọn tệp khác, và `--replay-case --refusal` kiểm tra rằng `replay-case.json` cũ, do
     `gen-v3` tạo, bị từ chối theo phiên bản."
6. **Tests.** Write the cases below; run the locked focused gate and the two locked commands.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/generate.test.js`, inside the test of lines 901-921 | the existing asserts | unchanged | still pass: `--replay-case --check` reads `replay-case.json` while `ALGO_ID` is `gen-v3` |
| same, added asserts | the new options | `run('--replay-case', '--refusal')`; `run('--replay-case', '--recipe', 'screen', '--create')`; `run('--replay-case', '--recipe', 'nope', '--check')`; `run('--replay-case', '--check', '--file', 'replay-case.json')` | status 0 with the skipped line; status 2 (a recording needs a seed); status 2; status 0 |

## Documentation

`DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`: the sentence of step 5, verbatim, in both languages.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked: `-NodeArgs @('tools\record-fixtures.mjs', '--replay-case', '--check')` | §3.3 | `record-fixtures: replay case OK` | 300 s |
| locked: `-NodeArgs @('tools\record-fixtures.mjs', '--replay-case', '--refusal')` | §3.3 | the skipped line, exit 0 | 300 s |
| locked focused gate: `-NodeArgs @('--test', 'tests/generate.test.js')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| the `REPLAY` check: `git --no-pager diff --exit-code gen-v4 -- core/engine/policy.js` | slot root | exit 0, nothing printed | 30 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when the screen condition cannot be read from the replayed steps' `args`, or when a mode would need
  a `REPLAY` change.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-14a-B01 | Old replay steps will be refused by version, never replayed wrongly; the new cases can be recorded at the cutover | the modes and the tests | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-14a-T01 | R10: the family-dependent default file; `--file` wins; the refusal reads the old fixture | tests | test output |
| P2-14a-T02 | P2-T07 (fixture part): the refusal check apart from regeneration; fixed recipes; the bounded search; no `REPLAY` change | tests; the `REPLAY` check | test and command output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] Both developer guides updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the helper lines and outputs;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w1, 17b3de00fc48929439794c4a1deda95ebd4155b5 |
| Start, end, duration | dispatched 2026-11-25 23:12 +07:00 (developer 23:12:09 to 23:31:09); accepted 23:35 |
| Waiting for rulings | about 4 min (eleven deviations, SA-Opus) |
| Agent id, model | 6904288c-6284-475a-b3f8-850fa0b90ebd, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 46; 4,329,500 / 36,679 / 4,231,982 |
| AI credits | 103.37 |
| Questions and rulings | no QUESTION; eleven deviations, all accepted by SA-Opus with no fix and no pack amendment: generateReplaySeed returns qualifies (internal); --file a bare name (exit 2 otherwise); an unknown --recipe is a usage error in every mode, no gen-v4 check for --refusal (R10); the refusal check compares the whole generation object (fails closed); the refusal replays use the engine's replayPuzzle directly; the screen condition replays candidate puzzles through client.replayPuzzle (R10); no probe exists in checkReplayCase at the base, the task text was wrong and the developer's reading follows R10 (such a mismatch should normally be a QUESTION); guide sentence wrapped and appended; --create and --search name the recipe's file or seed prefix; test lines about 950-985; the usage text lists the new options |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 5 files); rebased onto df15064 cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked focused `IG P2-14a merge exit=0 seconds=27.705 quiet=45`, 45/45 pass, 0 fail/cancelled/todo; link anchors 22 of 22 |
| Commit (slot), commit on `gen-v4` | rebased 0bdfd04; gen-v4 0bdfd04ec808f904307d241df779deb0568da346 |
| Issues and named items | P2-15 step 2 records replay-case-v4.json and replay-case-v4-screen.json and runs the real --refusal (the OK branch) and the screen flow; the screen generation path and hasScreenSteps first run end to end at the cutover |
