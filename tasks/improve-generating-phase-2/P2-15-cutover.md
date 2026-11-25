# P2-15: The cutover: `gen-v4` live, fixtures re-recorded, living specification

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1 ("one cutover task switches the route and `ALGO_ID` together"), §4.2, §4.3, §4.7, §4.8, §4.10, §4.11; D-P2-05, D-P2-06, D-P2-09, D-P2-16; P2-T07, P2-T08; review-1 R10; review-2 R2-06 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-15` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | join; P2-09, P2-12a, P2-12b and P2-14a (with them, every production task: P2-01 to P2-11b, P2-14a) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 3 h; machine: locked runs, two bounded fixture searches (at most 540 s each), fixture recordings, the full suite (a full-suite point) |

## Goal

The production build runs `gen-v4` on its route, and stamps every new record `gen-v4` with seven keys, in one change.
The route is Nightmare except the full 26x26 board, and Hell 1 where it is reached. Old records stay playable, with
their steps refused by version. The fixtures record the new versions, and the living specification describes the
running code.

## Authority and fixed points

- **The statement.** Plan §4.11's statement (approved, D-P2-16) replaces the paragraph at `docs/design-detail.md`
  line 1805, verbatim (copied below).
- **R6.5 (plan §4.10), verbatim:** "§7.8: retain the historical MP12b2/MP12b3 `gen-v3` lock and its evidence. Add a later,
  explicitly versioned `gen-v4` qualification paragraph with the phase-2 source/receipts and route; the
  rating/model/policy locks remain unchanged. Do not relabel the old calibration as `gen-v4`."
- **R10, verbatim:** "Enumerate the known cutover changes now: the live-route test; the dispatcher test's live gen-v4
  target; `provenanceVersions`' seven-key expectation; `cliScope`'s live Nightmare result; the refusal mode's new OK
  line; and the five matched-fixture readers. Pin the existing gen-v3 **selector** tests with `selectCluesV3` where that
  is their actual subject. Do not reroute arbitrary generation tests to 26x26 to make them pass, change geometry while
  retaining unrelated expectations, or enlarge `$Allowed` after discovering failures. Any other failure stops for a
  scoped ruling."
- **The known changes, enumerated by the pack author.** Every test edit of this task is one of these rows; nothing
  else.

  | # | File | Test or place | The change |
  |---|---|---|---|
  | K1 | `tests/gen-v4.test.js` | `the route is off until the cutover` (P2-01) | renamed `the route is live with the gen-v4 algo id`: `GEN_V4_LIVE === true`, `ALGO_ID === 'gen-v4'`, `usesGenV4('nightmare', rectangle(10, 10)) === true`, `usesGenV4('nightmare', rectangle(26, 26)) === false` |
  | K2 | `tests/select-v4.test.js` | `the dispatcher keeps today's search while the route is off` (P2-04) | renamed `the dispatcher routes Nightmare to gen-v4 except the full 26x26 board`: on `rectangle(10, 10)` the result deep-equals `selectCluesV4`'s; on `rectangle(26, 26)` it deep-equals `selectCluesV3`'s |
  | K3 | `tests/generate.test.js` | `provenanceVersions follows ALGO_ID's family` (P2-08) | seven keys, in the order `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`, `priorTable`, `screenTable`, with `priorTable: 'prior-s3-v1'` and `screenTable: 'screen-v4-v1'` |
  | K4 | `tests/cli.test.js` | `the CLI scope follows the route` (P2-10) | the Nightmare 10x10 call returns `{ origin: 0, setCutAt: 46000 }`; the Hard call stays `undefined` |
  | K5 | `tests/generate.test.js` | the asserts P2-14a added in the record-fixtures test (lines 901-921 at the base) | `run('--replay-case', '--refusal')`: status 0 with `record-fixtures: refusal case OK`; `run('--replay-case', '--check', '--file', 'replay-case.json')`: status 1 (the old case's versions differ) |
  | K6 | the five readers: `tests/generation-client.test.js:959`, `tests/protocol.test.js:55`, `tests/replay-model.test.js:33`, `tests/replay.test.js:27`, `tests/tasks.test.js:615` | the `replay-case.json` constant | reads `replay-case-v4.json`. Only the constants that name the recipe's seed text or puzzle counts change, to the new file's values |
  | K7 | `tests/clues.test.js` | `run` (line 32) and `a band no subset reaches fails without relabelling and within 64 ratings` (lines 265-274) | `run` calls `(o.select ?? selectClues)(...)`; that test passes `select: selectCluesV3` (its subject is today's selector); `selectCluesV3` is added to the import of line 5 |
  | K8 | `tests/clues.test.js` | `slow: a 15 x 20 Nightmare calibration (K = 24) is in band under v3 (D36: replaces the Hell 2 case)` (671-681) | the two literals of the selection's outcome, `score` 70 and the clue count 3, become the values of the `gen-v4` run, which the final report gives; every other assertion stays |
  | K9 | `tests/fixtures/ui-flow-recipes.json` | the recipe `square-22x22-nightmare` | `expect.pieces`, `expect.puzzles` (it must stay 10) and `expect.scores` re-recorded from the `gen-v4` run, by step 4; the other two recipes do not change |

- **The fixtures.**
  - `tests/fixtures/replay-case.json` stays byte for byte and becomes the refusal case.
  - `generation-case.json` and `generated-sample-pack.json` change in their versions only (a scope proof).

## Scope

- **Change:**
  - `core/engine/gen-v4.js` (`GEN_V4_LIVE = true`) and `core/engine/version.js` (`ALGO_ID = 'gen-v4'`);
  - the test files of K1 to K9;
  - `tests/fixtures/generation-case.json` and `tests/fixtures/generated-sample-pack.json` (re-recorded);
  - `docs/design-detail.md` (step 6).
- **Create:**
  - `tests/fixtures/replay-case-v4.json` and `tests/fixtures/replay-case-v4-screen.json`;
  - `tests/replay-refusal.test.js`;
  - `docs/improve-generating-phase-2/evidence/P2-15/`: `fixture-diff.md`, `forward-check.mjs`, `forward-check.log`,
    `search-hard.log`, `search-screen.log`, `ui-recipe.mjs` and `ui-recipe.log`.
- **Do not change:** `tests/fixtures/replay-case.json` and anything not listed. Guard: G-PROTECTED, G-COPIES without
  the flag, and G-WORKTREE with

  ```powershell
  $Allowed = @('core/engine/gen-v4.js', 'core/engine/version.js', 'tests/gen-v4.test.js', 'tests/select-v4.test.js',
    'tests/generate.test.js', 'tests/cli.test.js', 'tests/clues.test.js', 'tests/generation-client.test.js',
    'tests/protocol.test.js', 'tests/replay-model.test.js', 'tests/replay.test.js', 'tests/tasks.test.js',
    'tests/replay-refusal.test.js', 'tests/fixtures/ui-flow-recipes.json', 'tests/fixtures/generation-case.json',
    'tests/fixtures/generated-sample-pack.json', 'tests/fixtures/replay-case-v4.json',
    'tests/fixtures/replay-case-v4-screen.json', 'docs/design-detail.md',
    'docs/improve-generating-phase-2/evidence/P2-15/fixture-diff.md',
    'docs/improve-generating-phase-2/evidence/P2-15/forward-check.mjs',
    'docs/improve-generating-phase-2/evidence/P2-15/forward-check.log',
    'docs/improve-generating-phase-2/evidence/P2-15/search-hard.log',
    'docs/improve-generating-phase-2/evidence/P2-15/search-screen.log',
    'docs/improve-generating-phase-2/evidence/P2-15/ui-recipe.mjs',
    'docs/improve-generating-phase-2/evidence/P2-15/ui-recipe.log',
    'tasks/improve-generating-phase-2/P2-15-cutover.md')
  ```

## Steps

1. **The switch.** `gen-v4.js`: `export const GEN_V4_LIVE = true;`. `version.js`: `export const ALGO_ID = 'gen-v4';`.
   Then K1, K2, K3 and K4.
2. **The fixtures**, each command locked (`Invoke-IgNode`, limit 600 s):
   - `-NodeArgs @('tools\record-fixtures.mjs', '--replace', '--reason', 'gen-v4 cutover (improve-generating phase 2, D-P2-06): versions only')`.
     Then write `E/P2-15/fixture-diff.md`: for both files, every changed JSON path. Expected: the `versions` fields and
     the `generation` provenance versions only. Any other path is a stop.
   - **The two searches** write `search-hard.log` and `search-screen.log` through a child-owning capture, not
     `Tee-Object` (review-2 R2-06; the helper's console is not captured): run the search block below, complete, in a
     fresh process, with the slot substituted. A killed search remains a failed gate; its partial log is not a selected
     fixture. Then run `--replay-case --create --seed <n> --recipe hard` with the seed that `search-hard.log` selects,
     and the same with `--recipe screen` and `search-screen.log`. A search that ends at its bound without a seed is a
     stop.
   - The checks: `--check`, `--replay-case --check --recipe hard`, `--replay-case --check --recipe screen` and
     `--replay-case --refusal`, which now prints `record-fixtures: refusal case OK`.

The search block of step 2 (the here-string's closing `'@` starts its line):

```powershell
$root = 'Q:\git\pentomino-p2-w<n>' # the assigned slot, substituted before dispatch
Set-Location -LiteralPath $root
[Environment]::CurrentDirectory = $root
$ErrorActionPreference = 'Stop'
. (Join-Path $root 'tools\ig-proto\lock\ig-lock.ps1')
$E = Join-Path $root 'docs\improve-generating-phase-2\evidence'
$capture = @'
import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const [log, ...args] = process.argv.slice(1);
mkdirSync(dirname(log), { recursive: true });
const fd = openSync(log, 'w');
let result;
try {
  result = spawnSync(process.execPath, ['tools\\record-fixtures.mjs', ...args], { stdio: ['ignore', fd, fd] });
} finally {
  closeSync(fd);
  const text = readFileSync(log, 'utf8').replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  writeFileSync(log, text, 'utf8');
}
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
'@
foreach ($recipe in 'hard', 'screen') {
  Invoke-IgNode -Repo pentomino -Task "P2-15 search $recipe" -LimitSeconds 600 -QuietSeconds 45 -NodeArgs @(
    '--input-type=module', '-e', $capture, (Join-Path $E "P2-15\search-$recipe.log"),
    '--replay-case', '--search', '--recipe', $recipe)
  if ($LASTEXITCODE -ne 0) { throw "QUESTION: search $recipe failed" }
}
```

3. **The readers and the refusal test.** K5 and K6. Create `tests/replay-refusal.test.js`, case
   `the gen-v3 replay case is refused by version`:
   - `replay-case.json` loads;
   - it keeps every provenance field through `parsePack` and `serializePack`;
   - `runReplay` of each puzzle is `unavailable` with reason `set-versions`.

   A reader case that replays the screen case and takes more than 5 s gets `slow: ` at the start of its name.
4. **The `gen-v3` pins and the UI recipe.** K7 and K8. For K9, write `E/P2-15/ui-recipe.mjs`: it runs the test flow of
   `tests/generator-controller.test.js` lines 843-895 for the recipe `square-22x22-nightmare`, writes the line
   `pieces <n> puzzles <n> scores <list>` to `E/P2-15/ui-recipe.log` itself (CRLF, UTF-8 without BOM), and only then
   prints it (review-2 R2-06). Run it locked (limit 600 s), and write those three values into the recipe's `expect`.
5. **Forward compatibility.** `E/P2-15/forward-check.mjs` imports `parsePack` from
   `Q:\git\pentomino-p2-today\core\engine\pack.js` (the `6b94ffb` reader, by its absolute `file://` URL), and parses
   each pack of `tests/fixtures/replay-case-v4.json`. Expected: `ok`, every puzzle kept, and each `made` record dropped
   with the existing warning. It writes its result lines to `E/P2-15/forward-check.log` itself (CRLF, UTF-8 without
   BOM) before printing its summary (review-2 R2-06). Run it locked (it only parses; limit 120 s).
6. **`docs/design-detail.md`.**
   - Replace line 1805's paragraph by the statement below.
   - §7.7: `gen-v4` is the running algo (seven keys).
   - §7.8: R6.5's paragraph, "`gen-v4` qualification: pending the phase-2 validation, P2-18 to P2-21; the route of
     §7.6".
   - Remove "not yet live" from the paragraphs that P2-01, P2-04, P2-06, P2-07 and P2-09 added (§6.5, §6.9, §6.10,
     §6.12, §7.6, §7.9).
7. **Gates.** G-COPIES without the flag, then the full suite (a full-suite point).

The statement (plan §4.11, approved):

> **No fail-fast on today's route (owner decision P-OD12); a bounded set stage on `gen-v4`'s route.** On today's route
> no fail-fast is built: a set request whose attempts all end `not-in-band` runs to its time limit. On `gen-v4`'s route
> (Nightmare and Hell 1, except the full 26x26 Nightmare board) a set request ends early with the reason
> `no-window-below` or `no-window-above` when its first four attempts all end without a window on the same side (P5;
> the notices `N-NOSET.below` and `N-NOSET.above`). The frozen validation never saw the bound fire (F2), so its
> false-stop rate on real requests is not established.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| the files of K1 to K9 | as the table | as the table | as the table |
| `tests/replay-refusal.test.js` | `the gen-v3 replay case is refused by version` | `replay-case.json` | it loads; provenance kept; every replay `unavailable`, `set-versions` |
| every test | the full suite | | `# fail 0`, `# cancelled 0` |

## Documentation

Step 6.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 2's recordings and checks (locked) | §3.3 | `record-fixtures: OK`, `replay case OK` twice, `refusal case OK` | 600 s each |
| `fixture-diff.md` | slot root | version paths only | 1 min |
| `ui-recipe.mjs` (locked) | §3.3 | `puzzles 10` | 600 s |
| the forward check (locked) | §3.3 | `ok`; puzzles kept; `made` dropped with warnings | 120 s |
| G-COPIES without the flag: `node tools\ig-proto\phase2\copies.mjs check --source gen-v4` | slot root | `copies: OK (5 variants, ...)` | 1 min |
| the full suite (a full-suite point) | §3.3 | `# fail 0`, `# cancelled 0`, within 600 s | 600 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **Stop and report** after the first full-suite run: list every failing test. A failure that is not one of K1 to K9
  stops for a scoped ruling of the pack author (R10); `$Allowed` is never widened without it.
- **Stop** when `fixture-diff.md` shows a non-version change, when a search ends without a seed, when the 22x22 recipe
  makes fewer than 10 puzzles, or when the full suite passes 600 s.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-15-B01 | `gen-v4` runs on its route; old records stay playable, their steps refused by version | the refusal test; the full suite | test output |
| P2-15-B02 | Older builds keep the puzzles of a new pack | the forward check | `forward-check.log` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-15-T01 | P2-T07: the refusal case, the matched cases, and the 10x6 fixtures with only their versions changed | step 2; `fixture-diff.md` | logs |
| P2-15-T02 | P2-T08: the route live, with its exception | K1, K2 | test output |
| P2-15-T03 | R10: only the enumerated test edits | the final report's list against K1 to K9; G-WORKTREE | report, guard output |
| P2-15-T04 | The copies still anchor on the cutover source | G-COPIES | command output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Fixtures recorded and checked; `replay-case.json` unchanged
- [ ] Tests green; the full suite green
- [ ] `docs/design-detail.md` updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED, G-COPIES pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the selected seeds, and the fixture diff summary;
- the values of K8 and K9;
- every test changed, each with its K row;
- the helper lines;
- each AC row with its evidence;
- the questions and deviations.

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
