# T03d: P7 C1: ordered live-row lists for R4 (`p7-c1`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §2, §6 T6, §8.2 T03-T05; `report.md` §3 ("C1 first, ordered live-row lists for R4 ... with the reference charge"); plan v4 §3 P7 (C1, Rules); D-S24-15, D-S24-22; pack decisions D-P24-01, D-P24-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T03c |
| Depends on | T03c |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min allocated (one locked memory case of about a minute and the quick equality run, about 12 to 15 min of locked verification) |

## Goal

R4 rescans every row of an uncovered piece's column, and every row of a common cell's column, live or dead: T10a
counted live rows at 26 % to 59 % of the static ones. C1 keeps, per column, an ordered list of its live rows,
maintained by `kill` and `undo`, so that R4 visits only live rows while charging exactly the reference's work units.
The result, the work and the node counts stay identical; only the time may change. This is the first candidate of the
spike (`p7-c1`), proved equal on the quick tier here; its full tier and timing come in T05b and S02.

## Authority and fixed points

- Plan v4 P7: "An implementation may compute a step faster and still charge the same units"; R4's exact charge per
  piece `L_p + 2 n_p s_p + (n_p > 0 ? s_p : 0) + sum(L_c) + sum(s_piece(r) + 1)`; "R1 to R5, R8 and R9 contain no cap
  check: equality is needed as a sum per call, with the same kills in the same order"; the memory rule ("A new
  representation may add storage only while the reference slots plus that storage stay within `limits.memoryBytes`
  (and the worker budget); otherwise the rating runs on the reference representation").
- **The storage rule of this variant** (SA-Astra's review R04, verbatim): "Preserve the reference memory precheck and
  allocate its reference slots in the reference order. Only then decide whether the extra representation fits both the
  current model's deduction limit and the workspace/worker capacity, including all retained extra storage and
  allocation growth. A previous model's list storage must not survive unaccounted into the next model build or a
  reference fallback. Do not retain the current untracked grow-only `WeakMap` design. The simple permitted
  implementation is call-local list arrays, allocated after the reference views, with no cross-call cache. When the
  combined storage does not fit, allocate no lists and run the unchanged reference loops. A failed auxiliary allocation
  also falls back without changing the reference memory-limit outcome. Report auxiliary storage separately in the
  probe's diagnostics." Here: the decision comes after the views are allocated and destructured (the arena's
  `bytes()` then holds the model, every retained buffer and this model's reference slots); the lists fit when `bytes +
  listBytes <= limits.memoryBytes` and `ws.bytes() + listBytes <= ws.capacityBytes` (the main workspace's capacity is
  the worker's budget); they are local to the call, so nothing survives it; the decision is reported in the caller's
  diagnostics object as `igRepresentation` (`'lists'` or `'reference'`) and `igListBytes` (the list bytes, 0 for the
  reference), which T03a's worker reads from its own copy.
- The frozen `deduce.js` (`tests/artifacts/ig-proto/frozen-source/core/engine/deduce.js`, equal to `3fc65f4`, the text
  of the `base` tree): `kill` lines 431-441, `undo` 481-504, the CSR transpose 351-363, the memory precheck 302-309,
  `ruleR4` 709-773. Liveness changes only in `kill` (line 433) and `undo` (line 489) after `live.fill(1)` (line 365).
- A spike variant only (D-S24-22): never an arm, no production edit, nothing in the `v4` chain; `p7-c1` extends `base`
  (D-P24-01).
- The R4 work charge of the list version equals the reference's: each reference `work += 1` per visited position is
  replaced by adding the static length of the scanned range once (`colStart[c + 1] - colStart[c]`), each per-cell
  `work += 1` by the row's cell count; kills charge inside `kill` as before; the kills happen in the same order (the
  common cells in the order of the first live row's cells, and within a cell the live rows in ascending position).

## Scope

- Create: `tools/ig-proto/variants/p7-c1.json` (the variant below); by the quick equality run (step 10)
  `docs/improve-generating/evidence/frozen/V4-P7E-p7-c1-quick/p7.json` and `p7.md` (raw items under
  `tests/artifacts/ig-proto/frozen/V4-P7E-p7-c1-quick/equal/`, git-ignored).
- Change: `tools/ig-proto/README.md`: the P7 section of T03a gains the paragraph on `p7-c1`.
- Change: `tools/ig-proto/self-test.mjs`: one case appended to `v4Cases` (`p7: C1 memory rule (p7-c1)`).
- Do not change: every other file (the reference `base` and every other variant included). Guards: G1, G2 (the new
  variant is an addition), G3 lists only the variant file, the README, `self-test.mjs` and the two report files.

## Steps

1. Create `tools/ig-proto/variants/p7-c1.json`, two-space JSON like `variants/v4-p5.json`:
   `{ "id": "p7-c1", "extends": ["base"], "description": "P7 C1 (stages 2 to 4 pack T03d; plan v4 P7): R4 on ordered live-row lists that kill and undo keep, the same work units and kills; the lists only within the memory rule. A spike variant: never an arm.", "edits": [<c1-1 to c1-7>], "files": [], "params": {} }`.
   Every `find` is the exact text of the frozen `deduce.js` (LF), every `replace` the text below.
2. **`c1-1`** (`file` `core/engine/deduce.js`), the decision and the call-local arrays, after the reference views:
   `find` `"  // Reused slots hold unspecified data: everything read below is initialised first.\n"` (it occurs once, line
   323, right after the destructuring of `views`); `replace` that line followed by:

   ```js
     // ig-proto P7 C1 (variant p7-c1): ordered live-row lists. Each column's rows (positions of colRows) form a circular
     // doubly linked list whose sentinel is the node NZ + c; only live rows are linked. The lists are local to this call,
     // 4 (3 NZ + 2 C) bytes, decided after the reference slots above exist: they are used only while the reference slots
     // plus them stay within limits.memoryBytes and the arena's bytes plus them within its capacity (plan v4 P7, the
     // memory rule); otherwise, or when an allocation fails, every changed function runs its reference loop.
     const igLists = igListArrays(bytes, limits.memoryBytes, ws, NZ, C);
     const useLists = igLists !== null;
     const lnext = igLists === null ? IG_EMPTY : igLists.next;
     const lprev = igLists === null ? IG_EMPTY : igLists.prev;
     const lpos = igLists === null ? IG_EMPTY : igLists.pos;
     /** @type {any} */ (diagnostics).igRepresentation = useLists ? 'lists' : 'reference';
     /** @type {any} */ (diagnostics).igListBytes = useLists ? 4 * (3 * NZ + 2 * C) : 0;
   ```

3. **`c1-2`**, the positions and the links at the transpose: `find`

   ```js
     for (let r = 0; r < R; r += 1) {
       for (let k = rowStart[r]; k < rowStart[r + 1]; k += 1) {
         colRows[colCount[rowCols[k]]++] = r;
       }
     }
     work += 2 * NZ;
   ```

   `replace`

   ```js
     for (let r = 0; r < R; r += 1) {
       for (let k = rowStart[r]; k < rowStart[r + 1]; k += 1) {
         if (useLists) {
           lpos[k] = colCount[rowCols[k]];
         }
         colRows[colCount[rowCols[k]]++] = r;
       }
     }
     work += 2 * NZ;
     if (useLists) {
       for (let c = 0; c < C; c += 1) {
         const head = NZ + c;
         let prev = head;
         for (let j = colStart[c]; j < colStart[c + 1]; j += 1) {
           lprev[j] = prev;
           lnext[prev] = j;
           prev = j;
         }
         lnext[prev] = head;
         lprev[head] = prev;
       }
     }
   ```

4. **`c1-3`**, `kill`: `find` the reference loop of `kill` (lines 436-440)

   ```js
       for (let k = begin; k < end; k += 1) {
         colCount[rowCols[k]] -= 1;
       }
       work += end - begin;
       trail[trailLength++] = r;
   ```

   `replace`

   ```js
       if (useLists) {
         for (let k = begin; k < end; k += 1) {
           colCount[rowCols[k]] -= 1;
           const j = lpos[k];
           const a = lprev[j];
           const b = lnext[j];
           lnext[a] = b;
           lprev[b] = a;
         }
       } else {
         for (let k = begin; k < end; k += 1) {
           colCount[rowCols[k]] -= 1;
         }
       }
       work += end - begin;
       trail[trailLength++] = r;
   ```

5. **`c1-4`**, `undo`'s row restore: `find` (lines 489-495)

   ```js
           live[x] = 1;
           const begin = rowStart[x];
           const end = rowStart[x + 1];
           for (let k = begin; k < end; k += 1) {
             colCount[rowCols[k]] += 1;
           }
           work += end - begin;
   ```

   `replace`

   ```js
           live[x] = 1;
           const begin = rowStart[x];
           const end = rowStart[x + 1];
           if (useLists) {
             for (let k = begin; k < end; k += 1) {
               colCount[rowCols[k]] += 1;
               const j = lpos[k];
               lnext[lprev[j]] = j;
               lprev[lnext[j]] = j;
             }
           } else {
             for (let k = begin; k < end; k += 1) {
               colCount[rowCols[k]] += 1;
             }
           }
           work += end - begin;
   ```

   (The trail is last-in first-out, so every list is restored in the exact reverse order of its removals, and the
   neighbours `lprev[j]`, `lnext[j]` a removed node keeps are valid when it is relinked.)
6. **`c1-5`**, the list check in `undo`'s diagnostics: `find`

   ```js
       if (copies !== null && !sameState(/** @type {StateCopy} */ (copies.pop()), copyState())) {
         throw new Error('deduce: undo mismatch');
       }
   ```

   `replace` the same three lines followed by

   ```js
       if (copies !== null && useLists && !igListsMatch()) {
         throw new Error('deduce: list mismatch');
       }
     }

     /** Diagnostics only (verifyUndo): every column's list holds exactly its live rows, in ascending position. */
     function igListsMatch() {
       for (let c = 0; c < C; c += 1) {
         const head = NZ + c;
         let j = colStart[c];
         let steps = 0;
         for (let k = lnext[head]; k !== head; k = lnext[k]) {
           while (j < colStart[c + 1] && live[colRows[j]] === 0) {
             j += 1;
           }
           if (k !== j || lprev[lnext[k]] !== k) {
             return false;
           }
           j += 1;
           steps += 1;
           if (steps > colStart[c + 1] - colStart[c]) {
             return false;
           }
         }
         while (j < colStart[c + 1] && live[colRows[j]] === 0) {
           j += 1;
         }
         if (j !== colStart[c + 1]) {
           return false;
         }
       }
       return true;
   ```

   (The closing `}` of `undo` that followed the three lines now closes `igListsMatch`: the replacement ends inside the
   new function, whose last line is the frozen file's `  }` that ended `undo`. Check with `tree.mjs build p7-c1` and a
   read of the built `deduce.js` that `undo` and `igListsMatch` are both well formed.)
7. **`c1-6`**, R4 on the lists: `find` the whole function `ruleR4`, the frozen lines 709-773 from `  function ruleR4(counting) {`
   through its closing `  }` and newline; `replace` the same text with the name changed to `ruleR4Ref` (the reference,
   unchanged), followed by a blank line and:

   ```js
     /**
      * R4 on the live-row lists (P7 C1): the same kills in the same order and the same work units as `ruleR4Ref`; each
      * reference charge per visited position is the scanned range's static length, added once.
      * @param {boolean} counting
      * @returns {number} NONE or APPLIED (rows killed).
      */
     function ruleR4(counting) {
       if (!useLists) {
         return ruleR4Ref(counting);
       }
       for (let p = 0; p < NP; p += 1) {
         const pc = NC + p;
         if (covered[pc] === 1) {
           continue;
         }
         const headP = NZ + pc;
         let nLive = 0;
         let first = -1;
         work += colStart[pc + 1] - colStart[pc];
         for (let k = lnext[headP]; k !== headP; k = lnext[k]) {
           const r = colRows[k];
           nLive += 1;
           if (first === -1) {
             first = r;
           }
           const end = rowStart[r + 1] - 1;
           for (let j = rowStart[r]; j < end; j += 1) {
             cellMark[rowCols[j]] += 1;
           }
           work += end - rowStart[r];
         }
         let killed = 0;
         if (nLive > 0) {
           const end = rowStart[first + 1] - 1;
           work += end - rowStart[first];
           for (let j = rowStart[first]; j < end; j += 1) {
             const c = rowCols[j];
             if (cellMark[c] !== nLive) {
               continue;
             }
             work += colStart[c + 1] - colStart[c];
             const headC = NZ + c;
             for (let k = lnext[headC]; k !== headC;) {
               const next = lnext[k];
               const r2 = colRows[k];
               if (rowPiece[r2] !== p) {
                 kill(r2);
                 killed += 1;
               }
               k = next;
             }
           }
         }
         for (let k = lnext[headP]; k !== headP; k = lnext[k]) {
           const r = colRows[k];
           const end = rowStart[r + 1] - 1;
           for (let j = rowStart[r]; j < end; j += 1) {
             cellMark[rowCols[j]] = 0;
           }
           work += end - rowStart[r];
         }
         if (killed > 0) {
           if (counting) {
             rules[3] += killed;
           }
           return APPLIED;
         }
       }
       return NONE;
     }
   ```

   (Make the `find` text exactly the frozen lines 709-773; the anchor must occur once.)
8. **`c1-7`**, an `append` to `core/engine/deduce.js`:

   ```js

   // ig-proto P7 C1 (variant p7-c1): the list arrays are local to one measureDeduction call (no cache across calls).
   const IG_EMPTY = new Int32Array(0);

   /**
    * The list arrays of one deduction call, or null when they do not fit: the reference slots plus the lists must stay
    * within the deduction's memory limit, and the arena's allocated bytes (this model's reference slots and every buffer
    * the arena retains from earlier models included) plus the lists within the arena's capacity. A failed allocation
    * also gives null; the caller then runs the reference loops.
    * @param {number} bytes The reference slot bytes of this model (the precheck's sum).
    * @param {number} memoryBytes limits.memoryBytes (an integer or Infinity).
    * @param {{ bytes: () => number, capacityBytes: number }} ws The model's arena, after the reference slots exist.
    * @param {number} NZ
    * @param {number} C
    * @returns {{ next: Int32Array, prev: Int32Array, pos: Int32Array } | null}
    */
   export function igListArrays(bytes, memoryBytes, ws, NZ, C) {
     const listBytes = 4 * (3 * NZ + 2 * C);
     if (bytes + listBytes > memoryBytes || ws.bytes() + listBytes > ws.capacityBytes) {
       return null;
     }
     try {
       return { next: new Int32Array(NZ + C), prev: new Int32Array(NZ + C), pos: new Int32Array(NZ) };
     } catch {
       return null;
     }
   }

   /**
    * The bytes the lists add to a model's deduction (the memory rule's extra storage); `p7-probe.mjs` reads it.
    * @param {import('./tiling.js').Model} model
    * @returns {number}
    */
   export function igListBytes(model) {
     return 4 * (3 * model.rowStart[model.rowCount] + 2 * model.columns);
   }
   ```

   (`const` declarations at the end of the module are initialised before any call of `measureDeduction`, which only
   runs after the module has loaded.)
9. Build and check: `node tools\ig-proto\lib\tree.mjs build p7-c1 --label frozen --source-label "frozen 3fc65f4"` prints
   `p7-c1 <treeId> <copyDigest> built`; `check-edits` prints `ok p7-c1: 9 edits match` (the builder's own `meta-1` and
   `meta-2` and the variant's seven).
10. **The memory case** (`self-test.mjs`, appended to `v4Cases`, name `p7: C1 memory rule (p7-c1)`), as the Tests
    table says; run it with check-list §3.1's selection block (Commands and gates).
11. **The quick equality run** (locked verification, task `V4-P7E-p7-c1-quick`), as in Commands and gates, then
    `node tools\ig-proto\p7-probe.mjs report --task V4-P7E-p7-c1-quick --label frozen --source-label "frozen 3fc65f4"`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs` (`--v4`, locked) | `p7: C1 memory rule (p7-c1)` | (a) `const { igListArrays } = await treeModule(await engine('p7-c1'), 'deduce')`, with `fake(b, cap) = { bytes: () => b, capacityBytes: cap }`: `igListArrays(1000, Infinity, fake(5000, 5499), 35, 10)` (lists of 500 bytes: the reviewer's counterexample, 4,000 retained + 1,000 new reference slots + 500 > 5,499), the same with capacity 5,500, `igListArrays(1000, 1499, fake(0, Infinity), 35, 10)`, the same with memory 1,500, and `igListArrays(0, Infinity, fake(0, Infinity), 2 ** 53, 0)` (an allocation that throws); (b) `runItems` on the scratch task `S24-T03d-dev` (step `equal`, horizon 285) with `runtimeItems` of the seven memory items of `equalDeclarations('p7-c1', 'quick')`; the folder is removed at the end | (a) null; three arrays of lengths 45, 45, 35; null; arrays; null; (b) every item `completed`, `same: true`; the `fixture` step of `mem-small`, `mem-mid` and `mem-near-lists` `representation` `'lists'` with `listBytes` 48,960, 1,218,816 and 80,940; of `mem-near-reference` `'reference'` with `listBytes` 0; of `mem-above` null (the reference's `model-too-large`, equal on both trees); the nine sequence steps' representations `lists, lists, lists, reference, lists, reference, lists, null, lists`; the capacity steps `lists`, `reference`; every `lists` step has `refBytes + listBytes <= memoryBytes` and `wsBytes + listBytes <= capacityBytes` (the fixtures' manifest `refBytes`) |
| the quick equality run of T03c's commands | every item of `equalDeclarations('p7-c1', 'quick')` (30 kernel items with six settings, 112 PM4 items at canonical limits, seven memory items: 149) | `p7-c1` against `base` | `docs/improve-generating/evidence/frozen/V4-P7E-p7-c1-quick/p7.json` `equal.verdict` `equal` and `equal.coverage.complete` true: every item `completed` and `same: true`; the `undo` setting compared on every kernel item (no `deduce: list mismatch`); at least one normal item on `lists` |

## Documentation

README, the P7 section: "`p7-c1` (T03d): R4 on ordered live-row lists (a circular doubly linked list per column over
the positions of `colRows`, sentinel `NZ + c`), unlinked in `kill` and relinked in `undo`, charging the reference's
units; the lists are local to one deduction call, decided after the reference slots exist, and used only while the
reference slots plus them stay within `limits.memoryBytes` and the arena's bytes plus them within its capacity
(`igListArrays`; `igListBytes(model) = 4 (3 NZ + 2 C)`); each call reports `igRepresentation` and `igListBytes` in its
diagnostics object; `verifyUndo` also checks the lists."

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T03d --label frozen` | repository root, first | `firewall: snapshot of S24-T03d` | 1 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | repository root | no error; the `p7-c1` line | 3 min |
| `node tools\ig-proto\lib\tree.mjs build p7-c1 --label frozen --source-label "frozen 3fc65f4"` | repository root | `p7-c1 <treeId> <copyDigest> built` | 2 min |
| check-list §3.1's selection block with `$Id = 'S24-T03d'`, `$GroupArgs = @('--v4')`, `$Locked = $true`, `$Required = @('p7: C1 memory rule (p7-c1)')` | PowerShell 7 at the repository root | `PASS <n> p7: C1 memory rule (p7-c1)`; `IG S24-T03d cases exit=0`; `cases: 1 passed, as required` | 5 min |
| The quick equality run: `. .\tools\ig-proto\lock\ig-lock.ps1; for ($i = 1; $i -le 8; $i += 1) { Invoke-IgNode -Repo pentomino -Task "V4-P7E-p7-c1-quick equal $i" -NodeArgs @('tools\ig-proto\p7-probe.mjs', 'equal', '--candidate', 'p7-c1', '--tier', 'quick', '--task', 'V4-P7E-p7-c1-quick', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--horizon-s', '285'); if ((Get-Content -Raw tests\artifacts\ig-proto\frozen\V4-P7E-p7-c1-quick\equal\state.json \| ConvertFrom-Json).done) { break } }` | PowerShell 7 at the repository root | each invocation `IG ... exit=0`; the last prints `done true` | about 15 to 20 min, the six Hell 1 kernel inputs built by `instr` included (at most eight invocations of 300 s) |
| `node tools\ig-proto\p7-probe.mjs report --task V4-P7E-p7-c1-quick --label frozen --source-label "frozen 3fc65f4"` | repository root | `p7-probe: wrote docs/improve-generating/evidence/frozen/V4-P7E-p7-c1-quick/p7.json`; its `equal.verdict` `equal` and `equal.coverage.complete` true | 1 min |
| `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --current v4 --label frozen --source-label "frozen 3fc65f4"` | repository root | `binding: pass` | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T03d --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the variant file, the README, `tools/ig-proto/self-test.mjs` and the two report files of the Scope | 1 min |

## Stop points and questions

- Stop and report when an equality item is not `same`, or the report is `incomplete`: give the item id and its
  `differing` list (each entry the setting and the two outcomes) from `p7.json`'s `equal.diagnostics` entry of that item
  (T03b), or the report's problems and coverage. Do not change the reference, the
  equality rule or the memory manifest. **Two accepted outcomes** (SA-Astra's review R08): (1) complete equality
  (`equal`, coverage complete); or (2) a documented dropped-candidate result ruled by the pack author: the failed or
  incomplete observations are kept as they are, the candidate is not timed, and the pack author records whether T04 and
  T05a (its descendants) are skipped or gives a specific corrected task and identity. A fix round needs a fresh
  observation identity (a new task id); no ended item is rerun.
- Stop and report before: any timing run (S02 is the orchestrator's).
- Send `QUESTION:` to the pack author (through the orchestrator) when: an anchor of steps 2 to 8 does not occur exactly
  once in the frozen `deduce.js`; the task looks wrong or contradicts the code; an ambiguity changes behaviour or a
  contract; a gate fails for a reason not covered here; a change is needed outside the scope; a recorded decision would
  change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T03d-B01 | The first P7 candidate either gives exactly the reference's results on the quick tier, with complete memory coverage, or is dropped by a documented ruling of the pack author (D-P24-05) | the equality report; the ruling | `V4-P7E-p7-c1-quick/p7.json`; the ruling in the execution log |
| T03d-B02 | Nothing of the frozen arms or production changes | `check-binding --current v4`; G1, G2 | the outputs |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T03d-T01 | `p7-c1` builds; its seven edits match once (`ok p7-c1: 9 edits match` with the builder's two) | `check-edits`; `build` | the outputs |
| T03d-T02 | The lists are decided after the reference slots, local to the call, within both budgets, and reported per call; a reference fallback and a rejected model give the reference's outcome | the memory case | its PASS line |
| T03d-T03 | Outcome (1): every quick item equal, the undo paths and memory settings included, coverage complete; or outcome (2): the dropped-candidate ruling | the report; the ruling | `p7.json`; the execution log |
| T03d-T04 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (the equality report's counts and the helper
seconds of each invocation); each AC row with its evidence; the questions and rulings; the deviations; and the named
items for later.

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
