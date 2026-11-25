# T02d: The fitting reader indexes the publication metadata it reads (`fit-read.mjs prefixes`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §8.2 T02 and T11 (the read gate); `docs/improve-generating-stages-2-4/s01-reading.md` W3 (SA-Astra's review of the S01 reading, finding 2); pack decision D-P24-07; ruling R-P24-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of S01 |
| Depends on | S01 (its records stay as written; T02c's `fit-read.mjs` as committed at `dd38457`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 0.5 h, machine 0 min (one registration, one test expectation; unlocked) |

## Goal

A fitting record must index every file it read. `fit-read.mjs prefixes` reads each shard's publication markdown
`<runsDir>/<shard>.runs.md` through T01a's `publicationOf` (`arm.mjs:254-263`, to find the journal the markdown names),
but T02c's `prefixesCommand` never registers that file with `addInput`. So S01's prefixes record of `V4-S2B` indexes 334
files and none of its eight `.runs.md`. This task registers the file before `publicationOf` runs, so the next prefixes
record, T11's on `V4-S3P`, binds it. S01's two records are not rewritten: SA-Astra's supplementary index binds their eight
files (`evidence/sa-astra/s01-review-checks.json`, field `publicationInputs`; T12a carries it into the freeze).

## Authority and fixed points

- T02c step 2 (the rule this task enforces): "Every file read is added once to `inputs` as `{ path: rel(file), sha256:
  sha256File(file) }`; the plan file first."
- The S01 reading, W3 (joint decision under the owner's delegation, verbatim): "Correct the reader's input registration
  before the next prefixes record is produced, and carry the supplementary index into the freeze. This is an in-scope
  provenance repair, not another pilot or an owner question."
- SA-Astra's review of the S01 reading, the repair (verbatim): "In `prefixesCommand`, register the existing
  `join(ctx.runsDir, \`${shard}.runs.md\`)` with `addInput` before calling `publicationOf`; extend the existing clean
  prefixes fixture to require its `runs.md` hash in `inputs`. No engine run is needed for this correction; do not
  regenerate S01's records."
- Records are written once (D-P24-07): no command of this task writes into `docs/improve-generating/evidence/`.
- `publicationOf` only checks whether the journal that the markdown names exists. It does not read it, so this task adds
  no journal to `inputs`.

## Scope

- Change: `tools/ig-proto/fit-read.mjs`: the row callback of `prefixesCommand` only.
- Change: `tools/ig-proto/self-test.mjs`: the existing case `fit-read: prefixes of a declared grid` (one line of its clean
  scenario).
- Change: `tools/ig-proto/README.md`: one phrase of the section `## The fitting reader (stages 2 to 4 pack, T02b and T02c)`.
- Do not change: every other file; S01's records under `docs/improve-generating/evidence/frozen/V4-S2B/`. Guards: G1, G2,
  G3; G3 lists only the three files above.

## Steps

1. In `tools/ig-proto/fit-read.mjs`, in the row callback of `prefixesCommand` (`const rows = grid.map((declared) => {`),
   insert immediately before the line `const ledger = rowLedger(lines, links);` (line 713 at `dd38457`), at the callback's
   indentation:

   ```js
         // The publication's markdown is read by publicationOf (it names the published journal): index it first (T02d).
         const runsMd = join(ctx.runsDir, `${shard}.runs.md`);
         if (existsSync(runsMd)) {
           addInput(runsMd);
         }
         const publication = publicationOf(ctx.runsDir, shard);
   ```

   Then, in the object the callback returns, replace the property `publication: publicationOf(ctx.runsDir, shard),` (line
   730 at `dd38457`) by `publication,`. Nothing else changes. `addInput` keeps one entry per path, so the five rows of one
   shard add the file once.
2. In `tools/ig-proto/self-test.mjs`, in the case `fit-read: prefixes of a declared grid`, its clean scenario, replace
   the line (line 8393 at `dd38457`)

   ```js
           const wanted = [fx.plansDir + '\\V4-XX.json', fx.files.runs, fx.files.shard];
   ```

   by

   ```js
           const wanted = [fx.plansDir + '\\V4-XX.json', fx.files.runs, join(fx.runsDir, 'pilot-x.runs.md'), fx.files.shard];
   ```

   The existing loop then requires exactly one `inputs` entry for the fixture's `pilot-x.runs.md`, with the file's
   `sha256File`. The other scenarios and cases do not change.
3. In `tools/ig-proto/README.md`, in the bullet that begins `- **\`prefixes\`** reads, for every declared key`, replace
   `its publication (\`publicationOf\`),` by `its publication (\`publicationOf\`, which reads \`<shard>.runs.md\`),`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `fit-read: prefixes of a declared grid` (existing; its clean scenario) | the fixture of T02c (`fitFixture`), `prefixesCommand` as before | as before, and `inputs` holds `pilot-x.runs.md` of the fixture's runs folder once, with its `sha256File`; every other scenario's expectation unchanged |

## Documentation

`tools/ig-proto/README.md`, step 3 (the phrase only).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T02d --label frozen` | repository root, first | `firewall: snapshot of S24-T02d` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T02d --horizon-s 285` | repository root (unlocked) | every case `PASS`; no folder `tests\artifacts\ig-proto\selftest\S24-T02c-dev` left | 5 min |
| `git --no-pager status --short -- docs/improve-generating/evidence/frozen/V4-S2B` | repository root | prints nothing (S01's records unchanged) | 1 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T02d --label frozen` | repository root, last | `firewall: OK, <n> production files unchanged since the snapshot of S24-T02d` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the three files of the Scope | 1 min |

## Stop points and questions

- Stop and report before: running either `fit-read.mjs` command on a real task (T11 runs `prefixes` on `V4-S3P`; S01's
  records are never rewritten).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the line of step 1 or step 2 is not found as
  quoted; the task looks wrong or contradicts the code; an ambiguity changes behaviour or a contract; a gate fails for a
  reason not covered here; a change is needed outside the scope; a recorded decision would change. Never decide such a
  point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02d-B01 | The next prefixes record binds every file it read, the publication markdown included, so T11's read gate rests on a complete input index | the clean scenario | the PASS line |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02d-T01 | `prefixesCommand` indexes each existing `<shard>.runs.md` once, before `publicationOf` reads it; its rows and every other output are unchanged | `--items` | the PASS line |
| T02d-T02 | S01's records are unchanged; `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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
| Start, end, duration | 2026-11-24 01:05 +07:00 (dispatch, base `ab34a2c`); 2026-11-24 01:09 +07:00 (accepted); about 5 min. The developer reported 01:05:53-01:07:13 |
| Waiting for rulings | none |
| Agent id, model | `cc9f41a4-87d3-4f71-8bd5-05f4c285ff78`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 14 calls; 726,261 input, 6,586 output, 663,217 cache-read tokens |
| AI credits | 28.98 (developer only) |
| Questions and rulings | none |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `self-test --items --task S24-T02d-orch`: 215 passed, 0 failed (35.2 s); `git status --short -- docs/improve-generating/evidence/frozen/V4-S2B` empty; `firewall check --task S24-T02d`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 the three Scope files. The developer also showed case 213 fails without the fix (negative check, reverted) |
| Commit | this task's commit |
| Issues and named items | none (N-P24-02 closed by this task) |
