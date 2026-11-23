# T05a: P7 C5: `select`, `liveRowOf` and `listRows` on the lists (`p7-c1r5c5`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §6 T6, §8.2 T03-T05; `report.md` §3 ("then C5 (`select`, `undo`, the kill loops: 21.5 to 24.5 %)"); plan v4 §3 P7 ("C5: `select`, `undo` and the kill loops ... After C1, which changes the same loops"); D-S24-15; pack decisions D-P24-01, D-P24-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T04 |
| Depends on | T04 |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min allocated (the quick equality run, about 12 to 15 min of locked verification) |

## Goal

`select` kills the live rows of every column the selected row covers by scanning each column's whole range; `liveRowOf`
and `listRows` scan whole columns for live rows. With T03d's lists these loops visit only live rows, charging the
reference's units: the third and last candidate composite `p7-c1r5c5` (C1, R5 and C5). `undo` already restores the
lists in T03d; its own loop is not changed further (each trail entry is visited once in both versions).

## Authority and fixed points

- As T03d and T04: the same units, the same kills in the same order, the memory rule (`useLists`).
- The frozen functions (`tests/artifacts/ig-proto/frozen-source/core/engine/deduce.js`): `select` lines 443-466
  (its kill loop 455-463), `liveRowOf` 506-519 (the function 510-519), `listRows` 1571-1587 (the function 1577-1587).
  The reference charges: `select` `work += to - from` per covered column whatever its live rows; `liveRowOf` one unit per
  position visited up to and including the first live row (the column's static length when there is none, then it
  throws); `listRows` one unit per position of the column.
- `p7-c1r5c5` extends `p7-c1r5` (D-P24-01); a spike variant, never an arm. At most three composites (D-P24-05): this is
  the last.

## Scope

- Create: `tools/ig-proto/variants/p7-c1r5c5.json`; by the quick run
  `docs/improve-generating/evidence/frozen/V4-P7E-p7-c1r5c5-quick/p7.json` and `p7.md`.
- Change: `tools/ig-proto/README.md`: the P7 section gains the paragraph on `p7-c1r5c5`.
- Do not change: every other file. Guards: G1, G2, G3 (G3 lists the four files above).

## Steps

1. Create `tools/ig-proto/variants/p7-c1r5c5.json`: `{ "id": "p7-c1r5c5", "extends": ["p7-c1r5"], "description": "P7 C1,
   R5 and C5 (stages 2 to 4 pack T05a; plan v4 P7): select, liveRowOf and listRows on T03d's live-row lists, the same
   work units and kills. A spike variant: never an arm.", "edits": [<c5-1>, <c5-2>, <c5-3>], "files": [], "params": {} }`.
2. **`c5-1`** (`core/engine/deduce.js`), `select`'s kill loop: `find`

   ```js
         const from = colStart[c];
         const to = colStart[c + 1];
         for (let j = from; j < to; j += 1) {
           const r2 = colRows[j];
           if (live[r2] === 1) {
             kill(r2);
           }
         }
         work += to - from;
   ```

   `replace`

   ```js
         const from = colStart[c];
         const to = colStart[c + 1];
         if (useLists) {
           const head = NZ + c;
           for (let j = lnext[head]; j !== head;) {
             const next = lnext[j];
             kill(colRows[j]);
             j = next;
           }
         } else {
           for (let j = from; j < to; j += 1) {
             const r2 = colRows[j];
             if (live[r2] === 1) {
               kill(r2);
             }
           }
         }
         work += to - from;
   ```

   (`kill(colRows[j])` unlinks node `j` and the selected row's other nodes; the saved `next` is a node of another row
   in the same column, so it stays linked; the kills are in ascending position, as the reference's.)
3. **`c5-2`**, `liveRowOf`: `find` `"  function liveRowOf(c) {\n    const to = colStart[c + 1];\n"`; `replace`

   ```js
     function liveRowOf(c) {
       if (useLists) {
         const j = lnext[NZ + c];
         if (j !== NZ + c) {
           work += j - colStart[c] + 1;
           return colRows[j];
         }
         work += colStart[c + 1] - colStart[c];
         throw new Error('deduce: column without a live row');
       }
       const to = colStart[c + 1];
   ```

4. **`c5-3`**, `listRows`: `find` `"  function listRows(c, base) {\n    let end = base;\n    const to = colStart[c + 1];\n"`;
   `replace`

   ```js
     function listRows(c, base) {
       let end = base;
       const to = colStart[c + 1];
       if (useLists) {
         work += to - colStart[c];
         for (let j = lnext[NZ + c]; j !== NZ + c; j = lnext[j]) {
           alt[end++] = colRows[j];
         }
         return end;
       }
   ```

5. Build: `node tools\ig-proto\lib\tree.mjs build p7-c1r5c5 --label frozen --source-label "frozen 3fc65f4"`;
   `check-edits` prints `ok p7-c1r5c5: 13 edits match` (`meta-1`, seven of `p7-c1`, one of `p7-c1r5`, three here,
   `meta-2`).
6. **The quick equality run** of `p7-c1r5c5` (task `V4-P7E-p7-c1r5c5-quick`) and its report, as in Commands and gates.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| the quick equality run (T03c's commands) | every item of `equalDeclarations('p7-c1r5c5', 'quick')` | `p7-c1r5c5` against `base` | `V4-P7E-p7-c1r5c5-quick/p7.json` `equal.verdict` `equal` and `equal.coverage.complete` true |

## Documentation

README, the P7 section: "`p7-c1r5c5` (T05a): `p7-c1r5` plus C5: `select` kills each covered column's live rows from its
list, `liveRowOf` takes the list's head (charged `j - colStart[c] + 1`), `listRows` copies the list (charged the
column's length)."

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T05a --label frozen` | repository root, first | `firewall: snapshot of S24-T05a` | 1 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | repository root | no error; `ok p7-c1r5c5: 13 edits match` | 3 min |
| The quick equality run: `. .\tools\ig-proto\lock\ig-lock.ps1; for ($i = 1; $i -le 8; $i += 1) { Invoke-IgNode -Repo pentomino -Task "V4-P7E-p7-c1r5c5-quick equal $i" -NodeArgs @('tools\ig-proto\p7-probe.mjs', 'equal', '--candidate', 'p7-c1r5c5', '--tier', 'quick', '--task', 'V4-P7E-p7-c1r5c5-quick', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--horizon-s', '285'); if ((Get-Content -Raw tests\artifacts\ig-proto\frozen\V4-P7E-p7-c1r5c5-quick\equal\state.json \| ConvertFrom-Json).done) { break } }` | PowerShell 7 at the repository root | each invocation `exit=0`; the last `done true` | about 15 to 20 min (the six Hell 1 kernel inputs included) |
| `node tools\ig-proto\p7-probe.mjs report --task V4-P7E-p7-c1r5c5-quick --label frozen --source-label "frozen 3fc65f4"` | repository root | `equal.verdict` `equal` and `equal.coverage.complete` true | 1 min |
| `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --current v4 --label frozen --source-label "frozen 3fc65f4"` | repository root | `binding: pass` | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T05a --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the four files | 1 min |

## Stop points and questions

- Stop and report when an equality item is not `same`, or the report is `incomplete` (the item and its `differing`
  list, each entry the setting and the two outcomes, from `p7.json`'s `equal.diagnostics` (T03b), or the problems and
  coverage); no change of the reference, of the rule or of the memory manifest. **Two
  accepted outcomes** (SA-Astra's review R08): complete equality; or a documented dropped-candidate result ruled by the
  pack author (the observations kept, the candidate not timed). A fix round needs a fresh observation identity; no
  ended item is rerun. This task starts only when T04's candidate `p7-c1r5` was accepted with complete equality, or the
  pack author's ruling on T03d or T04 names this task as still to run.
- Send `QUESTION:` to the pack author (through the orchestrator) when: an anchor does not occur once in the
  `p7-c1r5` tree's `deduce.js`; the task looks wrong or contradicts the code; an ambiguity changes behaviour or a
  contract; a gate fails for a reason not covered here; a change is needed outside the scope; a recorded decision would
  change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T05a-B01 | The third composite either gives exactly the reference's results on the quick tier, with complete memory coverage, or is dropped by a documented ruling of the pack author | the report; the ruling | `V4-P7E-p7-c1r5c5-quick/p7.json`; the execution log |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T05a-T01 | `p7-c1r5c5` builds; its three edits match once | `check-edits` | the line |
| T05a-T02 | Every quick item equal and the coverage complete, or the dropped-candidate ruling | the report; the ruling | `p7.json`; the execution log |
| T05a-T03 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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
