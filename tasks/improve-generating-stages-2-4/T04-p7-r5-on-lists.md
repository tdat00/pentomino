# T04: P7: R5 on the live-row lists (`p7-c1r5`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §6 T6, §8.2 T03-T05; `report.md` §3 ("then R5 (2.5 to 4.3 % of the profile)"); plan v4 §3 P7 ("C1: incremental R4, then R5"); D-S24-15; pack decisions D-P24-01, D-P24-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T03d |
| Depends on | T03d |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2 h, machine 0 min allocated (the quick equality run, about 12 to 15 min of locked verification) |

## Goal

R5 scans each uncovered cell's column until it finds two pieces, then the claimed piece's column, visiting dead rows
too. On T03d's live-row lists it can visit only live rows while charging the reference's units: the second candidate
composite `p7-c1r5` (C1 plus R5), proved equal on the quick tier here.

## Authority and fixed points

- As T03d (the same charge rule; "R1 to R5, R8 and R9 contain no cap check: equality is needed as a sum per call, with
  the same kills in the same order"); the memory rule (the lists exist only when `useLists`).
- The frozen `ruleR5` is in `tests/artifacts/ig-proto/frozen-source/core/engine/deduce.js` (its JSDoc lines 775-781,
  the function lines 782-833); T03d's edits do not touch it.
- The reference charges, per uncovered cell column `c`, one unit per visited position up to and including the
  position where a second piece appears (the `break`), or the column's static length when no break happens; then, for
  the claimed piece's column, one unit per visited position plus, per live row, one unit per cell visited until the
  cell `c` is found or the row's cells end. The list version charges the same: `k - colStart[c] + 1` at a break (the
  node index `k` is the position), else `colStart[c + 1] - colStart[c]`; the piece column's static length once; the
  per-row inner loop unchanged.
- `p7-c1r5` extends `p7-c1` (D-P24-01); a spike variant, never an arm.

## Scope

- Create: `tools/ig-proto/variants/p7-c1r5.json`; by the quick run
  `docs/improve-generating/evidence/frozen/V4-P7E-p7-c1r5-quick/p7.json` and `p7.md`.
- Change: `tools/ig-proto/README.md`: the P7 section gains the paragraph on `p7-c1r5`.
- Do not change: every other file, `p7-c1.json` included. Guards: G1, G2, G3 (G3 lists the four files above).

## Steps

1. Create `tools/ig-proto/variants/p7-c1r5.json`: `{ "id": "p7-c1r5", "extends": ["p7-c1"], "description": "P7 C1
   and R5 (stages 2 to 4 pack T04; plan v4 P7): R5 on T03d's live-row lists, the same work units and kills. A spike
   variant: never an arm.", "edits": [<r5-1>], "files": [], "params": {} }`.
2. **`r5-1`** (`core/engine/deduce.js`): `find` the whole function `ruleR5`, the frozen lines 782-833, from
   `  function ruleR5(counting) {` through its closing `  }` and newline; `replace` the same text with the name changed
   to `ruleR5Ref`, followed by a blank line and:

   ```js
     /**
      * R5 on the live-row lists (P7, after C1): the same kills in the same order and the same work units as `ruleR5Ref`.
      * @param {boolean} counting
      * @returns {number} NONE or APPLIED (rows killed).
      */
     function ruleR5(counting) {
       if (!useLists) {
         return ruleR5Ref(counting);
       }
       for (let c = 0; c < NC; c += 1) {
         if (covered[c] === 1) {
           continue;
         }
         let P = -1;
         let one = true;
         const headC = NZ + c;
         let scanned = colStart[c + 1] - colStart[c];
         for (let k = lnext[headC]; k !== headC; k = lnext[k]) {
           const piece = rowPiece[colRows[k]];
           if (P === -1) {
             P = piece;
           } else if (piece !== P) {
             one = false;
             scanned = k - colStart[c] + 1;
             break;
           }
         }
         work += scanned;
         if (!one || P === -1) {
           continue;
         }
         let killed = 0;
         const pc = NC + P;
         const headP = NZ + pc;
         work += colStart[pc + 1] - colStart[pc];
         for (let k = lnext[headP]; k !== headP;) {
           const next = lnext[k];
           const r = colRows[k];
           let covers = false;
           const end = rowStart[r + 1] - 1;
           for (let j = rowStart[r]; j < end && !covers; j += 1) {
             work += 1;
             covers = rowCols[j] === c;
           }
           if (!covers) {
             kill(r);
             killed += 1;
           }
           k = next;
         }
         if (killed > 0) {
           if (counting) {
             rules[4] += killed;
           }
           return APPLIED;
         }
       }
       return NONE;
     }
   ```

   (The anchor must occur once in the text of the `p7-c1` tree, `tests/artifacts/ig-proto/tree-frozen/p7-c1/core/engine/deduce.js`.)
3. Build: `node tools\ig-proto\lib\tree.mjs build p7-c1r5 --label frozen --source-label "frozen 3fc65f4"`;
   `check-edits` prints `ok p7-c1r5: 10 edits match` (`meta-1`, the seven of `p7-c1`, `r5-1`, `meta-2`).
4. **The quick equality run** of `p7-c1r5` (task `V4-P7E-p7-c1r5-quick`) and its report, as in Commands and gates.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| the quick equality run (T03c's commands) | every item of `equalDeclarations('p7-c1r5', 'quick')` | `p7-c1r5` against `base` | `V4-P7E-p7-c1r5-quick/p7.json` `equal.verdict` `equal` and `equal.coverage.complete` true |

## Documentation

README, the P7 section: "`p7-c1r5` (T04): `p7-c1` plus R5 on the live-row lists (the cell column scanned to the second
piece, charged `k - colStart[c] + 1` at the break; the claimed piece's column scanned on its list)."

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T04 --label frozen` | repository root, first | `firewall: snapshot of S24-T04` | 1 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | repository root | no error; `ok p7-c1r5: 10 edits match` | 3 min |
| The quick equality run: `. .\tools\ig-proto\lock\ig-lock.ps1; for ($i = 1; $i -le 8; $i += 1) { Invoke-IgNode -Repo pentomino -Task "V4-P7E-p7-c1r5-quick equal $i" -NodeArgs @('tools\ig-proto\p7-probe.mjs', 'equal', '--candidate', 'p7-c1r5', '--tier', 'quick', '--task', 'V4-P7E-p7-c1r5-quick', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--horizon-s', '285'); if ((Get-Content -Raw tests\artifacts\ig-proto\frozen\V4-P7E-p7-c1r5-quick\equal\state.json \| ConvertFrom-Json).done) { break } }` | PowerShell 7 at the repository root | each invocation `exit=0`; the last `done true` | about 15 to 20 min (the six Hell 1 kernel inputs included) |
| `node tools\ig-proto\p7-probe.mjs report --task V4-P7E-p7-c1r5-quick --label frozen --source-label "frozen 3fc65f4"` | repository root | `equal.verdict` `equal` and `equal.coverage.complete` true | 1 min |
| `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --current v4 --label frozen --source-label "frozen 3fc65f4"` | repository root | `binding: pass` | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T04 --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the four files | 1 min |

## Stop points and questions

- Stop and report when an equality item is not `same`, or the report is `incomplete` (the item and its `differing`
  list, each entry the setting and the two outcomes, from `p7.json`'s `equal.diagnostics` (T03b), or the problems and
  coverage); no change of the reference, of the rule or of the memory manifest. **Two
  accepted outcomes** (SA-Astra's review R08): complete equality; or a documented dropped-candidate result ruled by the
  pack author (the observations kept, the candidate not timed, and the pack author records whether T05a, its
  descendant, is skipped or gives a specific corrected task and identity). A fix round needs a fresh observation
  identity; no ended item is rerun. This task starts only when T03d's candidate `p7-c1` was accepted with outcome (1),
  or the pack author's ruling on T03d names this task as still to run.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the anchor does not occur once; the task looks
  wrong or contradicts the code; an ambiguity changes behaviour or a contract; a gate fails for a reason not covered
  here; a change is needed outside the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04-B01 | The second composite either gives exactly the reference's results on the quick tier, with complete memory coverage, or is dropped by a documented ruling of the pack author | the report; the ruling | `V4-P7E-p7-c1r5-quick/p7.json`; the execution log |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04-T01 | `p7-c1r5` builds; its edit matches once | `check-edits` | the line |
| T04-T02 | Every quick item equal and the coverage complete, or the dropped-candidate ruling | the report; the ruling | `p7.json`; the execution log |
| T04-T03 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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
