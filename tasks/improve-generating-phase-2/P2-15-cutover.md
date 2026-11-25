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
  | K3 | `tests/generate.test.js` | `provenanceVersions follows ALGO_ID's family` (P2-08) | seven keys, in the order `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`, `priorTable`, `screenTable`, with `priorTable: 'prior-s3-v1'` and `screenTable: 'screen-v4-v1'`; its line `assert.ok(!('igPrior' in c.made));` becomes `assert.equal(c.made.igPrior, null);` (the family's record; scoped ruling of 2026-11-26) |
  | K4 | `tests/cli.test.js` | `the CLI scope follows the route` (P2-10) | the Nightmare 10x10 call returns `{ origin: 0, setCutAt: 46000 }`; the Hard call stays `undefined` |
  | K5 | `tests/generate.test.js` | the asserts P2-14a added in the record-fixtures test (lines 901-921 at the base) | `run('--replay-case', '--refusal')`: status 0 with `record-fixtures: refusal case OK`; `run('--replay-case', '--check', '--file', 'replay-case.json')`: status 1 (the old case's versions differ) |
  | K6 | the five readers: `tests/generation-client.test.js:959`, `tests/protocol.test.js:55`, `tests/replay-model.test.js:33`, `tests/replay.test.js:27`, `tests/tasks.test.js:615` | the `replay-case.json` constant | reads `replay-case-v4.json`. Only the constants that name the recipe's seed text or puzzle counts change, to the new file's values |
  | K7 | `tests/clues.test.js` | `run` (line 32) and `a band no subset reaches fails without relabelling and within 64 ratings` (lines 265-274) | `run` calls `(o.select ?? selectClues)(...)`; that test passes `select: selectCluesV3` (its subject is today's selector); `selectCluesV3` is added to the import of line 5 |
  | K8 | `tests/clues.test.js` | `slow: a 15 x 20 Nightmare calibration (K = 24) is in band under v3 (D36: replaces the Hell 2 case)` (671-681) | the two literals of the selection's outcome, `score` 70 and the clue count 3, become the values of the `gen-v4` run, which the final report gives; every other assertion stays |
  | K9 | `tests/fixtures/ui-flow-recipes.json` | the recipe `square-22x22-nightmare` | `expect.pieces`, `expect.puzzles` (it must stay 10) and `expect.scores` re-recorded from the `gen-v4` run, by step 4; the other two recipes do not change |
  | K10 | `tests/generate.test.js` | `a candidate carries the record of its origin: fields in the order of RES-27, nothing excluded` | the expected `made` gains `igPrior: null` between `skips` and `versions`, and its key list gains `'igPrior'` before `'versions'`; the expected `provenanceVersions()` object gains `priorTable: 'prior-s3-v1', screenTable: 'screen-v4-v1'`, and its key list ends `'ratingModel', 'priorTable', 'screenTable'` |
  | K11 | `tests/generation-client.test.js` | `one and four workers reproduce the recorded recipe and an importable pack` | the expected `fixed` record gains `igPrior: null` before `versions` (the recipe is Hard: no per-set prior) |
  | K12 | `tests/generator-import.test.js` | `a display request gives way to a generation, is asked again, and ends rated after it; the generation is the same without it` | the inline fake client gains, after its `cancel()`, the members P2-11b gave `generator-controller.test.js`'s `fakeClient`: `clock: () => ({ now: () => 0, setTimeout: () => 0, clearTimeout: () => {} }),`, `newScope: (/** @type {boolean} */ reserve) => ({ origin: 0, setCutAt: reserve ? 46000 : null }),` and `prefixSnapshot: () => null,`. This repairs P2-11b's regression (`df15064`; `generator/jobs.js:407` calls `client.newScope(false)`), which fails at the `gen-v4` head without this task |
  | K13 | `tests/generator-state.test.js` | the constant `CANDIDATE_RECORD` (above `originState`) | gains `igPrior: null` between `skips` and `versions` (its `versions` are `provenanceVersions()`, now the family's) |
  | K14 | `tests/replay-model.test.js` | `replay cache: the key holds the running provenance tuple` | its last assert becomes two: `replayKeyFor(source, { ...provenanceVersions(), priorTable: 'prior-s3-v2' })` and `replayKeyFor(source, { ...provenanceVersions(), screenTable: 'screen-v4-v2' })`, each `notEqual` to `key`, with the messages `'the prior table id'` and `'the screen table id'`. No production change: `replayKeyFor` keys the whole `versions` object |
  | K15 | `tests/replay.test.js` | `a version mismatch makes the stage unavailable; with both records changed nothing runs at all` | the two `g.setOrigin.versions.algo = 'gen-v0'` become `g.setOrigin.versions.algo = 'gen-v4-proto:other'` (a seven-key origin with a non-family algo is malformed and reads as no origin); the loop's comment says "seven ids", its list ends `'ratingModel', 'priorTable', 'screenTable'`, and both of its edits assign `name === 'algo' ? 'gen-v4-proto:other' : 'other'` |
  | K16 | `tests/replay.test.js` | `sameVersions compares the table ids` | the line `assert.equal(sameVersions(seven, provenanceVersions()), false);` becomes `assert.equal(sameVersions(seven, /** @type {any} */ ({ algo: seven.algo, policy: seven.policy, rng: seven.rng, seedScheme: seven.seedScheme, ratingModel: seven.ratingModel })), false);` (five keys against seven) |
  | K17 | `tests/replay.test.js` | `the fixture still replays while ALGO_ID is gen-v3` | renamed `the fixture replays while ALGO_ID is gen-v4`; its first two asserts become `assert.equal(provenanceVersions().algo, 'gen-v4');` and the key list `['algo', 'policy', 'rng', 'seedScheme', 'ratingModel', 'priorTable', 'screenTable']`; the replay asserts stay (`INPUTS[0]` is now `replay-case-v4.json`'s, K6) |
  | K18 | `tests/tasks.test.js` | `an igPrior payload is accepted and today's search ignores it` | the single deep-equal becomes `const withPrior = /** @type {any} */ (executeTask('puzzleCandidate', { ...payload, igPrior: 5 }, execution()));`, `const without = /** @type {any} */ (executeTask('puzzleCandidate', payload, execution()));`, `assert.equal(withPrior.made.igPrior, 5);`, `assert.equal(without.made.igPrior, null);` and `assert.deepEqual({ ...withPrior, made: { ...withPrior.made, igPrior: null } }, without);` (the family's record keeps the request's `igPrior`; today's search ignores it) |

  K10 to K18 are the pack author's scoped ruling on the first full-suite run (2026-11-26). Each changes only the
  named place; a further failure outside K1 to K18 stops again.

- **The fixtures.**
  - `tests/fixtures/replay-case.json` stays byte for byte and becomes the refusal case.
  - `generation-case.json` and `generated-sample-pack.json` change in their versions only (a scope proof).

## Scope

- **Change:**
  - `core/engine/gen-v4.js` (`GEN_V4_LIVE = true`) and `core/engine/version.js` (`ALGO_ID = 'gen-v4'`);
  - the test files of K1 to K18;
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
    'tests/generator-import.test.js', 'tests/generator-state.test.js',
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
   each pack of `tests/fixtures/replay-case-v4.json`. Expected: `ok`, every puzzle kept; each candidate `made` record
   and each pack's `setOrigin` dropped with the existing `provenance-ignored` warning; a calibration record
   (`{ schema: 1, kind: 'calibration' }`, which has no `versions` and no `igPrior`, the same in both families) kept
   (ruling on P2-15, 2026-11-26). It writes its result lines to `E/P2-15/forward-check.log` itself (CRLF, UTF-8 without
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
| the files of K1 to K18 | as the table | as the table | as the table |
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
| the forward check (locked) | §3.3 | `ok`; puzzles kept; candidate `made` records and `setOrigin` dropped with warnings; calibration records kept | 120 s |
| G-COPIES without the flag: `node tools\ig-proto\phase2\copies.mjs check --source gen-v4` | slot root | `copies: OK (5 variants, ...)` | 1 min |
| the full suite (a full-suite point) | §3.3 | `# fail 0`, `# cancelled 0`, within 600 s | 600 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **Stop and report** after the first full-suite run: list every failing test. A failure that is not one of K1 to K18
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
| P2-15-T03 | R10: only the enumerated test edits | the final report's list against K1 to K18; G-WORKTREE | report, guard output |
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
| Slot, base SHA | w2, 9bc10e65e985904c053be8786fa6ba60ded3912d |
| Start, end, duration | dispatched 2026-11-25 23:59 +07:00 (developer 23:59 to 00:07, QUESTION 1; to about 00:24, QUESTION 2; resumed to 00:55); accepted 2026-11-26 00:57 |
| Waiting for rulings | about 26 min (QUESTION 1 about 9 min; QUESTION 2 about 17 min; the forward-check point about 3 min; SA-Opus) |
| Agent id, model | c920fe82-3187-4ae2-b311-b6fa0ed8fac9, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 91; 11,208,699 / 56,674 / 10,794,657 |
| AI credits | 268.12 |
| Questions and rulings | QUESTION 1 (the hard search ran 50 seeds in 157.9 s, no seed with a subset skip): SA-Opus ruled option 1, record replay-case-0 with the qualifier unchanged (the gen-v3 fixture was also replay-case-0 without a skip; skip replay stays covered by replay-recorders.test.js and the screen case); K2's 26x26 input accepted with an added no-counters assertion. QUESTION 2 (14 full-suite failures, 2 in K8/K9 and 12 outside): scoped ruling K10 to K18 plus K3 extended, pack amendment 703f03f; no production change; K12 repairs P2-11b's regression (df15064: generator-import.test.js:512, client.newScope missing in its fake client, confirmed failing on gen-v4 3b06cbc by the orchestrator). Forward check: the calibration made record is kept (it has no versions or igPrior, the phase-1 reader reads it); the task text was corrected in 67b87f5. K8 test name kept ("v3" is the rating model). Other deviations accepted (stale gen-v4.js comments, extra accurate design-detail edits, string-replace reader paths) |
| Fix rounds | 2 (K2 assertion; K3 and K10 to K18) |
| Gates re-run by the orchestrator (merge gate) | slot static guards; merge gate with the locked full suite (full-suite point), G-COPIES without --rehearse-cutover, and the six P2-16b browser checks on the combined tree (P2-15 merges second; check-list 3.7) (results in the bookkeeping); developer: fixture checks OK (record-fixtures --check, hard and screen replay checks, --refusal), hard search 157.9 s no seed (ruled), screen search 17.3 s seed 0, ui-recipe 9.2 s puzzles 10, forward check ok, locked full suite 1626/1626 (60.98 s), G-PROTECTED, G-WORKTREE, G-FORMAT (28 files), G-CHECK OK, copies 25 and 3 edits |
| Commit (slot), commit on `gen-v4` | this commit; its SHA on gen-v4 in the bookkeeping |
| Issues and named items | N-P2-15-K8 (15x20 Nightmare, seed t18-big-a, K = 24: the gen-v4 calibration has 5 clues and score 69, in band; gen-v3 had 3 clues and score 70; one seed, a P2-21 deviation note, not population evidence); replay-case-v4.json has no subset skip (ruled); the set-stage bound's false-stop rate is not established (the statement says so) |
