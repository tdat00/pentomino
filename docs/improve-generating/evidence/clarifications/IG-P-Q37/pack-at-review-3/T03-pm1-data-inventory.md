# T03: PM1 data-only inventory (IG-P-Q24)

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 stage 1 ("the data-only inventory of PM1's existing records (IG-P-Q24), which needs no machine budget"), §7 (IG-P-D5 = OD-P8, IG-P-D6 = OD-P9) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T02c |
| Depends on | T02c (serial order; it uses T01a's frozen label and `sourceRoot()`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 1.5 h, machine 0 min (reads records; rates nothing; runs unlocked, check-list §3.2) |

## Goal

The plan author's answer to IG-P-Q24 closed Hell 2 and Hell 3 as a scope and resource decision and asked first for a
data-only inventory of the alternate populations that PM1's existing records already hold (Hell 3 scores at two
and three clues on a 215-cell board, central Hell 2 scores on 144- and 215-cell boards, outside the policy areas).
This task writes that inventory from the provisional PM1 records, without any rating, so that the manifest (T11d)
and stage 5 (N-V4-04) can cite it. It opens no route (IG-P-D6).

## Authority and fixed points

- IG-P-Q24 answer ("(a) and (b)": the closure is a scope and resource decision; "First the data-only inventory of
  the existing records (IG-P-Q24), which needs no machine budget") and IG-P-D6 ("The data-only inventory is part of
  OD-P8's first stage and opens no route"), text at commit `1731c6b` of `docs/improve-generating/clarifications.md`.
- Input, read-only: `docs/improve-generating/evidence/provisional/IGP-05/families-failed-sets.jsonl`,
  `families-scan.jsonl`, `families-windows.jsonl` (one family per line: `case`, `level`, `band`, `set` with `K`,
  `area`, `offeredInSource`, and `probes`, each with `count`, `offset`, `outcome`, `score`, `level`, `inBand`,
  `eligible`, `ar1`, `censored`, `solutions`, `mainWork`, `censusWork`, `stop`, `ms`).
- The provisional records are never rewritten; the inventory is a new record under the frozen label.

## Scope

- Create: `tools/ig-proto/pm1-inventory.mjs`; evidence `docs/improve-generating/evidence/frozen/V4-T03/inventory.json`
  and `inventory.md`; `tools/ig-proto/plans/V4-T03.json`.
- Change: `tools/ig-proto/self-test.mjs` (one case appended to T01a's `frozenCases`), `tools/ig-proto/README.md` (one
  paragraph in T01a's section).
- Do not change: everything else, the provisional evidence included. Guards:
  `node tools\ig-proto\firewall.mjs check --task V4-T03 --label frozen`, expected `files unchanged`;
  `git status --short -- docs/improve-generating/evidence/provisional core generator`, expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T03 --label frozen`.
1. **`pm1-inventory.mjs`** (`// @ts-check`; `node tools\ig-proto\pm1-inventory.mjs --label frozen --source-label
   <SL>`; any other label: exit 1 with `pm1-inventory: --label frozen only`). Exports:
   - `export function readFamilies(dir)`: reads the three files in the order `failed-sets`, `scan`, `windows` and
     returns `{ part, family }[]` (`part` from the file name).
   - `export function buildInventory(families, levels)`: `levels` is the frozen source's `core/engine/levels.js`
     (imported by file URL from `sourceRoot()`). Returns:

     ```js
     {
       totals: { families, probes, rated },          // rated: probes with score !== null
       alternate: [ /* one row per rated probe whose levels.levelForScore(score).id starts with 'hell-'
                       and differs from its family's level */
         { part, case, familyLevel, area, K, count, offset, score, ratedLevel, censored, ar1, solutions,
           mainWorkM, censusWorkM, offeredAtFrozen } ],
       populations: [ /* one row per (ratedLevel, case), sorted by ratedLevel descending, then case */
         { ratedLevel, case, familyLevel, area, n, notRefused, censored, solutions: { unique, few, many, unknown },
           counts: [min, max], scores: [min, max], mainWorkM: { median, max }, offeredAtFrozen } ],
       q24: [ /* the four facts of the IG-P-Q24 question, each with found: true | false */ ],
     }
     ```

     `mainWorkM` and `censusWorkM` are millions rounded to one decimal; `offeredAtFrozen` is
     `levels.offeredLevels(area).some((l) => l.id === ratedLevel)`; `notRefused` counts `ar1 === false`; the median
     is the lower middle value of the sorted list. `q24` lists `{ case: '15x15b10-hell-1', count: 2, score: 179,
     ratedLevel: 'hell-3' }`, `{ case: '15x15b10-hell-1', count: 3, score: 165, ratedLevel: 'hell-3' }`,
     `{ case: '15x15b10-hell-1', count: 6, score: 146, ratedLevel: 'hell-2' }` and `{ case: '12x12-nightmare',
     count: 1, score: 129, ratedLevel: 'hell-2' }`, each with `found` true when an `alternate` row has those
     values.
   - `main`: writes `inventory.json` (`meta` from `buildMeta({ task: 'V4-T03', label: 'frozen', kind:
     'pm1-inventory' })`, then the inventory and `inputs`: the three file paths with their SHA-256) and
     `inventory.md`; exits 1 with `pm1-inventory: an IG-P-Q24 fact is missing: <fact>` when a `q24` entry is not
     found.
2. **`inventory.md`**: title "PM1 data-only inventory (V4-T03, IG-P-Q24)"; the banner; this paragraph verbatim:
   "Data-only inventory of the provisional PM1 records (IG-P-Q24 (b)). It rates nothing and opens no route: Hell 2
   and Hell 3 stay closed for this feature as a scope and resource decision (IG-P-D6); no generation, pack claim or
   offer follows from these census-estimated witnesses. Hell levels are not offered on any board at the frozen
   source (`offeredAtFrozen` is false on every row)."; then the totals; the four `q24` facts with found or not; the
   `populations` table (columns: rated level, case, family level, area, n, not refused, censored, solutions u/f/m/?,
   counts, scores, main work median / max M); and the `alternate` rows grouped by rated level.
3. **Plan** `plans/V4-T03.json`: `{ "task": "V4-T03", "allocationMinutes": 0, "optionalMinutes": 0, "steps": [ firewall
   snapshot, `pm1-inventory.mjs`, firewall check ] }`, every step unlocked, in the format of `plans/IGP-00.json`.
4. **Self-test** case `frozen: PM1 inventory` appended to `frozenCases` (Tests table).
5. **README.md**: one paragraph "PM1 inventory (V4-T03)" in T01a's section: the command, the inputs, that it rates
   nothing and runs without the lock (it executes no rating, generation, uniqueness count or replay).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --frozen` | `frozen: PM1 inventory` | `buildInventory(readFamilies(<IGP-05 provisional folder>), <frozen levels.js>)` | `totals` deep-equals `{ families: 116, probes: 1362, rated: 987 }`; `alternate.length` 113; every `q24` entry has `found: true`; every `alternate` row has `offeredAtFrozen: false`; the `populations` row `{ ratedLevel: 'hell-3', case: '15x15b10-hell-1' }` has `n: 2`, `counts: [2, 3]`, `scores: [165, 179]`, `area: 215` |

The totals were counted by the pack author on the records at the base commit; a different count means the reader
differs from this task (report it with `QUESTION:`).

## Documentation

`tools/ig-proto/README.md` (step 5). The inventory itself is the evidence.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T03.json -Label frozen -SourceLabel 'frozen 3fc65f4' -DryRun` | root | three `[dry run] ...: unlocked` lines | 1 min |
| `node tools\ig-proto\pm1-inventory.mjs --label frozen --source-label "frozen 3fc65f4"` | root | `inventory.json` and `inventory.md` written; exit 0 | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T03` | root | nine `--frozen` cases pass (T01a's five, T01b's three, this one) | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T03 --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: rating or re-rating any record (never: this task is data-only), changing a provisional
  record.
- `QUESTION:` when a total or a `q24` fact differs from the Tests table.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T03-B01 | The alternate Hell 2 and Hell 3 populations of PM1's records are inventoried without machine time, as IG-P-Q24 (b) asks, and the record says it opens no route | `inventory.md` paragraph and tables | `evidence/frozen/V4-T03/inventory.md` |
| T03-B02 | The four facts quoted in IG-P-Q24 are found in the records | `q24` entries all `found: true` | `inventory.json` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T03-T01 | Totals and rows as counted at the base commit | self-test case | self-test output |
| T03-T02 | `offeredAtFrozen` comes from the frozen `levels.js` | code review; every row false | diff; `inventory.json` |
| T03-T03 | Inputs identified by hash; meta block present | `inventory.json` `inputs`, `meta` | `inventory.json` |
| T03-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

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
