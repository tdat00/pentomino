# T06a: The prior table `prior-s3-v1` and its generator `fit-prior-s3.mjs`

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.1 (the count prior P4: `prior-s3-v1`), §4.7 (fitting seeds only), §4.8 ("`data/prior-s3-v1.json` with a reproducible generator (`tools/ig-proto/fit-prior-s3.mjs`, check and write modes like `fit-prior.mjs`, reading V4-S2's journals, IGP-05's families and `prior-v1.json`)"), §8.2 T06; D-S24-10, D-S24-21; `report.md` §2.3 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of S02 |
| Depends on | S02 (and S01's reading: a change of the Nightmare entries would have been decided there; with none, the Nightmare entries are `prior-v1`'s) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2 h, machine 0 min (reads committed records; unlocked) |

## Goal

P4's table prior gives each Nightmare and Hell 1 call its start count. Stage 2 showed the Hell 1 table was incomplete
(only three boards) and off on the piloted boards; the SAs fitted a complete Hell 1 table from the stage-2 pilots on
four boards and PM1's windows on eight (D-S24-21). This task writes that table once, as a data file with a generator
that reproduces it from committed records, so that the freeze binds a table anyone can recompute.

## Authority and fixed points

- Plan §4.1: `prior-s3-v1` = "`prior-v1`'s 15 Nightmare entries; Hell 1 196 0.400000, 215 0.404412, 256 0.358108, 300
  0.443429, 324 0.347222, 360 0.331514, 400 0.368421, 420 0.390244, 480 0.297161, 484 0.287500, 576 0.219512, 676
  0.200000; start `clamp(round(share x K), 1, K - 2)`". The start rule is the prototype's (`ig-select-v4.js`
  `priorCount`, unchanged).
- The rule of each Hell 1 entry (reproduced from committed files only by
  `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-prior-check.mjs`, which prints `all 12 Hell 1 entries
  reproduced`):
  - **piloted boards** (`14x14-hell-1` 196, `20x20-hell-1` 400, `24x24-hell-1` 576, `26x26-hell-1` 676): from
    `docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-<cell>.calls.jsonl`, every call (lines grouped by
    `call`) whose `end` line has a finite `locate.wc`; per rep (the `start` line's `row`, `<cell>~<rep>`, reps 0 to 4)
    the median of `end.locate.wc / start.K`; the share is the median of the five per-rep medians, rounded to 6
    decimals (`Math.round(x * 1e6) / 1e6`);
  - **the other eight areas** (215, 256, 300, 324, 360, 420, 480, 484): from
    `docs/improve-generating/evidence/provisional/IGP-05/families-windows.jsonl` and `families-failed-sets.jsonl`, the
    families with `level === 'hell-1'` grouped by `case`; per family the probes with `eligible && inBand`, each giving
    `count / set.K`; a family without such a probe is skipped; per seed (`set.seed`) the list of its families'
    medians; the share is the median over the seeds of each seed's median, rounded to 6 decimals; the key's area is the
    families' `set.area`;
  - every median is `verdicts.mjs` `median` (the mean of the two middle values for an even count).
- Fitting seeds only (plan §4.7): V4-S2's reps 0 to 4 and IGP-05's slice; no validation, Master or second-validation
  rep is read.
- Written once: the file is a frozen table; a different table is a new id (`prior-s3-v2`), never a rewrite (§3.3).

## Scope

- Create: `tools/ig-proto/fit-prior-s3.mjs`; `tools/ig-proto/data/prior-s3-v1.json` (written by the generator).
- Change: `tools/ig-proto/self-test.mjs`: two cases appended to `itemCases` (`--items`).
- Change: `tools/ig-proto/README.md`: a new section `## The frozen family (stages 2 to 4 pack)` right before
  `## Admission statistics (V4-T09a)` (line 1521 at the base), with its first subsection `### The prior table
  prior-s3-v1 (T06a)`; T06b to T12b add their subsections to this section.
- Do not change: `tools/ig-proto/data/prior-v1.json`, `tools/ig-proto/fit-prior.mjs` and every other file. Guards: G1,
  G2, G3 (G3 lists the four files of the Scope: the generator, the prior JSON, `self-test.mjs` and the README).

## Steps

1. Create `tools/ig-proto/fit-prior-s3.mjs` (`// @ts-check`; header comment: "P4's table prior of the freeze
   (stages 2 to 4 pack T06a, plan 4.1, D-S24-10, D-S24-21): `prior-v1`'s Nightmare entries and a complete Hell 1 table
   from V4-S2's fr-base pilots (four boards) and IGP-05's windows (eight boards). Unlocked: it reads committed records
   and rates nothing. Check mode by default; `--write` writes the file once." and the usage `node
   tools\ig-proto\fit-prior-s3.mjs [--write] --label frozen --source-label <SL>`). Imports: `median` from
   `./verdicts.mjs`; `IG_DIR`, `ROOT`, `parseArgs` from `./lib/paths.mjs`; `lf`, `writeJson`, `sha256File` from
   `./lib/records.mjs` (`sha256File(path)`, `records.mjs:28`); `loadCatalogue` from `./lib/sets.mjs`.
2. Exports:
   - `export const PRIOR_S3_FILE = join(IG_DIR, 'data', 'prior-s3-v1.json');`
   - `export const PILOT_CELLS = Object.freeze(['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1']);`
   - `export function pilotShare(lines)`: the piloted rule over the lines of one calls file (returns `{ share, n }`,
     `n` the number of calls with a finite `wc`; throws `fit-prior-s3: rep <r> has no call` when a rep 0 to 4 has none);
   - `export function familyShare(families)`: the PM1 rule over the families of one case (returns `{ share, n, seeds }`,
     `n` the number of eligible in-band probes, `seeds` the number of seeds with a value; throws `fit-prior-s3: no
     eligible probe` when none);
   - `export function computePriorS3()`: returns `{ version: 1, id: 'prior-s3-v1', rule: 'Nightmare: prior-v1; Hell 1:
     the seed-balanced window share of V4-S2's fr-base pilots on 196, 400, 576 and 676 cells, else of IGP-05's eligible
     in-band windows (plan 4.1, D-S24-21)', source: { priorV1: <ref>, pilots: [<ref>...], families: [<ref>...] }, cells }`
     where each `<ref>` is `{ path: <repository-relative, '/'>, sha256: sha256File(<abs path>) }`; `cells` is the 15
     `nightmare@<area>` entries of `prior-v1.json` copied unchanged, then `hell-1@<area>` for the four pilots (`{ caseId,
     share, n, source: 'V4-S2 fr-base window share' }`, `area` from `loadCatalogue().cases[<cell>].area`) and for the
     eight other IGP-05 cases (`{ caseId: <case>, share, n, source: 'IGP-05 window share' }`), the keys sorted as
     `fit-prior.mjs` sorts them (`a < b ? -1 : 1`). A Hell 1 case of IGP-05 whose area is a piloted area is not used.
     `prior-v1.json` holds 83 cells; the other 68 (the levels below Nightmare and its three Hell 1 entries) are not
     copied: the v4 search runs only on Nightmare and Hell 1 (`v4Target`, `ig-select-v4.js:213`), and the Hell 1
     entries are the new ones. Call ids are unique in a calls file (`<row>:<n>:<attempt>:<k>`, verified on the four
     pilots: 95, 102, 93 and 92 `start` lines, as many ids; 68, 75, 70 and 64 `end` lines, each with a finite `wc`).
3. `main(argv)`: values `label`, `source-label`; switch `write`. Without `--write`: the file must exist and
   `lf(readFileSync(PRIOR_S3_FILE, 'utf8')).trimEnd() === lf(JSON.stringify(computePriorS3(), null, 2)).trimEnd()`;
   prints `fit-prior-s3: data/prior-s3-v1.json reproduced (27 cells)` and returns 0, else prints `fit-prior-s3:
   data/prior-s3-v1.json differs from the recomputed table` (or `... is absent`) and returns 1. With `--write`: refuses
   an existing file (`fit-prior-s3: data/prior-s3-v1.json exists: a frozen table is never rewritten`, exit 1), else
   `writeJson(PRIOR_S3_FILE, computePriorS3())` and prints `fit-prior-s3: wrote data/prior-s3-v1.json (27 cells: 15
   Nightmare, 12 Hell 1)`.
4. Run `node tools\ig-proto\fit-prior-s3.mjs --write --label frozen --source-label "frozen 3fc65f4"`, then the check
   mode.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `prior-s3: the rules on synthetic records` | `pilotShare` of lines: for each rep r of 0 to 4, two calls `c<r>a`, `c<r>b` with `start` `{ t: 'start', call, row: 'x~<r>', K: 10 }` and `end` `{ t: 'end', call, locate: { wc } }`, wc 3 and 5 for every rep except rep 4 (wc 6 and 8), plus one call of rep 0 whose `end` has `locate.wc` null | `{ share: 0.4, n: 10 }` (per-rep medians 0.4, 0.4, 0.4, 0.4, 0.7; median 0.4) |
| same case | (families) | `familyShare` of three families: seed `s1` probes `[{ eligible: true, inBand: true, count: 4 }, { eligible: true, inBand: false, count: 9 }]` K 10; seed `s1` probes `[{ eligible: true, inBand: true, count: 6 }]` K 10; seed `s2` probes `[{ eligible: false, inBand: true, count: 2 }]` K 10 | `{ share: 0.5, n: 2, seeds: 1 }` |
| same case | (missing rep) | `pilotShare` with no call of rep 3 | throws `fit-prior-s3: rep 3 has no call` |
| same file (`--items`) | `prior-s3: the table of plan 4.1` | `computePriorS3()` on the committed records | `Object.keys(cells).length` 27; the 12 `hell-1@<area>` shares equal plan §4.1's (0.4, 0.404412, 0.358108, 0.443429, 0.347222, 0.331514, 0.368421, 0.390244, 0.297161, 0.2875, 0.219512, 0.2); the 15 `nightmare@<area>` entries deep-equal `prior-v1.json`'s; the pilots' `n` 68, 75, 70, 64 (196, 400, 576, 676) |

## Documentation

README, the new section `## The frozen family (stages 2 to 4 pack)`: one introductory sentence ("The variants, tables
and checks of the freeze of plan v4's stage 3 and of the stage-4 runs; plan
`docs/improve-generating-stages-2-4/plan.md`, pack `tasks/improve-generating-stages-2-4/`."), then the subsection
`### The prior table prior-s3-v1 (T06a)`: the file, its rule (the Authority section's two rules in short), the check and
write modes with their two command lines, "written once; a different table is a new id", and that `fr-frozen` loads it
through `paramFiles.prior` with `priorTable` `prior-s3-v1` (T08a).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T06a --label frozen` | repository root, first | `firewall: snapshot of S24-T06a` | 1 min |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-prior-check.mjs` | repository root | `bt-prior-check: all 12 Hell 1 entries reproduced` (the pack author's check; it must still hold) | 1 min |
| `node tools\ig-proto\fit-prior-s3.mjs --write --label frozen --source-label "frozen 3fc65f4"` | repository root | `fit-prior-s3: wrote data/prior-s3-v1.json (27 cells: 15 Nightmare, 12 Hell 1)` | 1 min |
| `node tools\ig-proto\fit-prior-s3.mjs --label frozen --source-label "frozen 3fc65f4"` | repository root | `fit-prior-s3: data/prior-s3-v1.json reproduced (27 cells)` | 1 min |
| `node tools\ig-proto\fit-prior.mjs --label frozen --source-label "frozen 3fc65f4"` | repository root | `fit-prior: data/prior-v1.json reproduced (83 cells)` (the old table untouched) | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T06a --horizon-s 285` | repository root (unlocked) | every case `PASS` | 5 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T06a --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the four files | 1 min |

## Stop points and questions

- Stop and report when a recomputed Hell 1 share differs from plan §4.1 or a Nightmare entry differs from `prior-v1`:
  the frozen values are the plan's; a difference is a `QUESTION:` to the pack author, never a new value.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T06a-B01 | The freeze's prior table holds a start for every Nightmare and Hell 1 board, reproducible from committed fitting records | the check mode; the case | the outputs |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T06a-T01 | `pilotShare`, `familyShare` and `computePriorS3` give the Tests table's values | `--items` | the PASS lines |
| T06a-T02 | `data/prior-s3-v1.json` holds 27 cells and is reproduced; `prior-v1.json` is unchanged | the two check modes; G2 | the outputs |
| T06a-T03 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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
| Start, end, duration | 2026-11-24 05:10 +07:00 (dispatch, base `dcce593`); 2026-11-24 05:16 +07:00 (accepted); the developer reported 05:10:26-05:12:29 |
| Waiting for rulings | about 4 min (the pack author's review of the open details) |
| Agent id, model | `e1a730da-3df6-4167-b0fa-26ede04a6efa`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 22 calls; 1,649,714 input, 16,274 output, 1,550,484 cache-read tokens |
| AI credits | 56.58 (developer only) |
| Questions and rulings | no QUESTION; the open details (`pilotShare` reads reps 0 to 4 only; `call <id> has no start line`; the short README rules) accepted by SA-Opus as ruling R-P24-10 |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `bt-prior-check.mjs`: all 12 Hell 1 entries reproduced; `fit-prior-s3`: `data/prior-s3-v1.json reproduced (27 cells)`; a second `--write`: exit 1, `exists: a frozen table is never rewritten`; `fit-prior`: `data/prior-v1.json reproduced (83 cells)`; `self-test --items --task S24-T06a-orch`: 224 passed, 0 failed (35 s; cases 223, 224 PASS); `firewall check --task S24-T06a`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 the four Scope files |
| Commit | this task's commit |
| Issues and named items | none |
