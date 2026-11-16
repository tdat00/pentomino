# T09b: Admission statistics: pairing, matched sets and the class rules of rule (c5)

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.2 (IG-P-Q19, Q26, Q35: the unit, rule (c5) clue and faster, one endpoint for both arms, the recipe, no regression); decision D-V4-16; review RV1-12 (R12), RV3-08 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T09a |
| Depends on | T09a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min (pure functions; synthetic cases, unlocked) |

## Goal

Rule (c5) compares the two arms of a screen class request by request. This task writes that comparison as pure
functions: pairing by full request identity, the matched sets with complete clue evidence, the pooled clue rule, the
faster rule with shared resampling and its per-cell floor, and the no-regression bound of the controls. A pair whose
clue evidence is incomplete is reported, never counted as a zero difference and never dropped silently.

## Authority and fixed points

Plan §5.2 and review R12 (accepted), with these readings fixed here (pack author):

- **Pairing.** Two rows are the same request when `caseId`, `rep` and `seed` are equal; the manifest declares each
  cell's replicate list; a declared replicate without a row, a row outside the list, two rows with one identity, a seed
  that differs between the arms at one rep, or a row whose status (T09a's `ingestRow`) is not `valid` is a pairing
  problem; an `incorrect` row is also listed as a correctness failure.
- **The per-set clue value** is the median of `run.details.puzzles[].clues`; the median of an even list is the mean of
  its two middle values; "moves by two clues or more" is `Math.abs(d) >= 2` of `d` = screen less no screen.
- **A matched set (IG-P-Q35)**: a pair of valid rows whose `run.details.igSetKey` (written by the `instr` variant,
  `tools/ig-proto/variants/instr.json`) are strings and equal, both with `acceptedCount >= 1`, and both with complete
  clue evidence (T09a's `puzzleEvidence(run).clues === null`, RV3-08). A pair that meets the first conditions but not
  the clue evidence is an **evidence problem** of the class: it is listed, it is not a matched set, and T09c makes the
  class `inconclusive` by it; its completion outcome stays in the completion record.
- **Resampling**: `R` resamples of the declared replicate indices with replacement, drawn from `mulberry32(seed)` (step
  1), the same drawn indices applied to every cell of the class; the lower bound is the value at index
  `Math.ceil(0.1 * R) - 1` of the ascending list.
- The faster ratio of a rep is `cappedT10(noScreen) / cappedT10(screen)`; the no-regression ratio of a rep is
  `cappedT10(today) / cappedT10(after)` (T09a's `cappedT10`).

## Scope

- Change: `tools/ig-proto/verdicts.mjs` (step 1), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T09a's section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T09b --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T09b --label frozen`.
1. **Pure exports** added to `verdicts.mjs`:
   - `mulberry32(seed)`:

     ```js
     export function mulberry32(seed) {
       let a = seed >>> 0;
       return () => {
         a = (a + 0x6D2B79F5) >>> 0;
         let t = a;
         t = Math.imul(t ^ (t >>> 15), t | 1);
         t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
         return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
       };
     }
     ```

   - `median(values)`; `geoMean(values)` (`Math.exp` of the mean of `Math.log`).
   - `pairRows(rowsA, rowsB, reps)` over ingested rows of one cell (class use: A the screen arm, B the no-screen arm;
     no-regression use: A the after arm, B today's): `{ pairs: [{ rep, seed, a, b }], problems: string[], incorrect:
     [{ side: 'a' | 'b', rep }] }`; a pair only where both rows exist and are `valid`.
   - `matchedSets(pairs)`: `{ matched: [{ rep, seed, screen, noScreen, d }], evidence: [{ rep, side: 'a' | 'b',
     problem }] }` by the reading above (`screen` and `noScreen` the per-set clue values of A and B, `d = screen -
     noScreen`); a pair with incomplete clue evidence on both sides gives two `evidence` entries.
   - `clueRule(matched)`: `{ n, medianDiff, moved2, pass }`, `pass = n > 0 && medianDiff <= 0.5 && 5 * moved2 <= n`.
   - `ratiosOf(pairs, reps, { quantity, capMs })`: the array, in the order of `reps`, of `cappedT10(b.run) /
     cappedT10(a.run)`; `null` when a rep has no pair.
   - `fasterRule(ratiosByCell, reps, { resamples, resampleSeed })`: `ratiosByCell` maps a cell to `ratiosOf(...)`;
     returns `{ geoMean, lower, cellGeoMeans, pass }`; each resample draws `reps.length` indices `Math.floor(rand() *
     reps.length)` and takes the geometric mean over every (cell, drawn index) pair; `pass = geoMean >= 1.15 && lower
     > 1.0 &&` every cell's geometric mean `>= 1.0`.
   - `noRegression(ratios, reps, { resamples, resampleSeed })`: the same recipe for one cell, `pass = lower >= 0.9`.
2. **Self-test** cases appended to `--items` (Tests table), with T09a's `row` helper.
3. **README.md**: T09a's section gains the readings of the Authority section.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, pure.

| Case name | Input | Expected |
|---|---|---|
| `verdicts: basic statistics` | `median([3, 1, 2])`, `median([1, 2, 3, 4])`; `mulberry32(7)` twice | 2 and 2.5; the first five values of both generators equal and in [0, 1) |
| `verdicts: pairing problems` | reps `[0, 1, 2]`; A: rep 0 twice, rep 1, and rep 2 built with `over: { errors: [{ phase: 'validation', code: 'invalid-puzzle', message: 'x' }] }`; B: reps 0 and 2 (rep 1 missing) | three problems, naming the duplicate (A, rep 0), the missing row (B, rep 1) and the status (A, rep 2, `incorrect`); `incorrect` `[{ side: 'a', rep: 2 }]`; `pairs` empty |
| `verdicts: matched sets` | pairs where (a) both `setKey` `'k'`, A `accepted: 2, clues: [10, 12]`, B `accepted: 1, clues: [11]`; (b) `setKey` `'k'` and `'m'`; (c) both `'k'` with B's `accepted` 0 | `matched` has one set, (a), with `screen` 11, `noScreen` 11, `d` 0; `evidence` empty |
| `verdicts: incomplete clue populations are not zero differences` | pairs with both `setKey` `'k'` and `accepted: 10`: (a) A `clues: []`; (b) B `clues` of 9 entries; (c) both with the default complete clues | (a) and (b) are not matched; `evidence` lists `{ rep, side: 'a', problem: 'clues: 0 of 10' }` and `{ rep, side: 'b', problem: 'clues: 9 of 10' }`; (c) is matched with `d` 0 |
| `verdicts: the clue rule is pooled` | 15 matched sets of `d` 1 (cell a) and 15 of `d` 0 (cell b); then cell a with `d` 2 on 8 of its sets | first: `medianDiff` 0.5, `moved2` 0, `pass` true although cell a alone has median 1; second: `moved2` 8, `pass` false |
| `verdicts: faster rule and its floor` | `fasterRule({ a: [2, 2, 2, 2], b: [2, 2, 2, 2] }, [0, 1, 2, 3], { resamples: 1000, resampleSeed: 7 })`; then `b` all 0.5 | first: `geoMean` 2 and `lower` 2 (within 1e-12), `pass` true; second: `geoMean` 1 (within 1e-12), `cellGeoMeans.b` 0.5, `pass` false |
| `verdicts: failed requests at the common endpoint` | `ratiosOf` of 20 pairs whose A rows all have 9 accepted and whose B rows reach ten at 60,000 | every ratio 0.5; `fasterRule` on one cell of these: `pass` false |
| `verdicts: no regression` | `noRegression` of 20 ratios 1.0, then of 20 ratios 0.8 (reps 0 to 19, 1,000 resamples, seed 7) | `pass` true (`lower` 1.0); `pass` false |

## Documentation

`tools/ig-proto/README.md` (step 3).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T09b` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T09b --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing any reading of the Authority section.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09b-B01 | Rule (c5)'s statistics exist in code with their readings written down before any validation seed runs | the functions; the README | diff; README |
| T09b-B02 | A pair without complete clue evidence is reported, never a zero difference | case 4 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09b-T01 | Pairing, matched sets, the pooled clue rule | cases 2 to 5 | self-test output |
| T09b-T02 | Shared resampling, the per-cell floor, the common endpoint and no regression | cases 1, 6 to 8 | self-test output |
| T09b-T03 | Nothing else changed; formats | guards; `npm run check` | command output |

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
