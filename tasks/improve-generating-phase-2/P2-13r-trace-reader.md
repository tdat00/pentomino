# P2-13r: The trace reader on the frozen work-ledger rules

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.6, §7.3; D-P2-10; P2-T10; review-1 R5; `contracts.md` C1 to C3, C9 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-13r` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | T; the pack commit (it reads only the frozen contracts and the frozen harness) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 1.5 h; machine: unlocked synthetic tests |

## Goal

One function reads a measured row's journal folder and returns its work ledger. It applies the frozen ledger rules
unchanged, plus the checks that a lost file, a lost row line or empty evidence must fail. Missing evidence is
incomplete, never zero work. The comparator (P2-13b), the P5 coverage (P2-13c) and the glue and reach readings
(P2-13f) read rows only through it.

## Authority and fixed points

- **`contracts.md` C1, C2, C3 and C9** fix the inputs and the output; this task implements C9 exactly. The trace
  layer that writes C1 is P2-12d's; here the inputs are synthetic.
- **The frozen functions, imported, never copied or changed:** `parseLines(text, file)` and
  `rowLedger(lines, linkLines)` of `tools/ig-proto/verdicts.mjs` (lines 618-850). Importing `verdicts.mjs` needs the
  slot's read-only `frozen-source` junction (check-list §3.7).
- **R5:** "Missing files/calls, malformed/duplicate primitives, inconsistent totals, or unproved closure make work
  incomplete, never zero. A known terminated open primitive contributes its proved upper bound; 'complete' means
  complete interval evidence, not that every call ended normally."

## Scope

- **Create:** `tools/ig-proto/phase2/trace-reader.mjs` and `tools/ig-proto/phase2/trace-reader.test.mjs`.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/trace-reader.mjs', 'tools/ig-proto/phase2/trace-reader.test.mjs',
    'tasks/improve-generating-phase-2/P2-13r-trace-reader.md')
  ```

## Steps

1. **`trace-reader.mjs`** (`// @ts-check`), exporting:
   - `export function readRowFolder(dir, row)`, returning
     `{ rowLine, linkLines, workerFiles: [{ name, pid, threadId, lines }], problems }`:
     - the folder's files in name order;
     - `${row}.row.jsonl` gives `rowLine`, its single parsed line, or `null`;
     - `${row}.link.jsonl` gives `linkLines`, or `null` when the file is absent;
     - a name matching `${row}.<pid>.<threadId>.jsonl` (two decimal integers) is a worker file;
     - any other name is the problem `foreign file <name>`;
     - every file is read as UTF-8 and parsed with `parseLines(text, name)`; its problems join `problems`.
   - `export function rowWork(dir, expect)`, with `expect = { row, seed, acceptedCount }`. It returns the result of
     `rowLedger(lines, linkLines)`, where `lines` are the worker files' lines in file-name order, each file's lines in
     order. Its `problems` gain, in this order:
     - the problems of `readRowFolder`;
     - `no row line` when `rowLine` is `null`; `row line mismatch` when its `row` differs from `expect.row` or its
       `seed` from `expect.seed`;
     - `empty evidence` when no line has `t: 'start'` and `expect.acceptedCount > 0`;
     - `missing worker journal <pid>/<threadId>` for each `worker-end` link line whose worker has no file, or a file
       whose first line is not `{ t: 'worker', pid, threadId }` with the same numbers.

     `complete` is `problems.length === 0`. The result adds `outcomes`: every call with an `end` line, in the order of
     its `start` line, as `{ stage, attempt, result, igNoWindow, budgetStop }`; and `rerateStarts`, the `rerate`
     lines counted by `phase` as `{ close, rescue, rerate }` (C9).
   - `export function workLedger(result)`: the object of C9's ten fields, the exact `ledger` input of `workRule` and
     `classVerdict` of `verdicts.mjs`.
2. **`trace-reader.test.mjs`** (`node:test`): the cases below. Each writes its synthetic files under
   `tests/artifacts/ig-proto/phase2/self-test/reader-<start ms>/<case>/` with `writeFileSync`, and an `after` hook
   removes the folder.
3. **Gates.** Run the tests unlocked (no engine): `node --test tools/ig-proto/phase2/trace-reader.test.mjs`.

## Tests

The fixtures use row `r1`, seed `s1`, and a worker `9/1` (pid 9, thread 1). A **complete call** is the lines `worker`,
`start` (`call: 'r1:9:1:1'`, `stage: 'set'`, `attempt: 0`, `at: 1`), `caps`, `begin` (`kind: 'rate'`, `bound: 1000`),
`p` (`tuple: ['call', 5, 'rated', 60, 90, 10]`), `end` (`result: 'ok'`, `work: 100`, `profiles: 1`,
`locate: { countWork: 0 }`, `igNoWindow: null`, `budgetStop: false`). Its link lines are
`{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }` and `{ t: 'link', ev: 'worker-end', pid: 9, threadId: 1, at: 50 }`.
The row line is `{ t: 'row', row: 'r1', seed: 's1', caseId: 'c', localRep: 20, pid: 9 }`.

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/trace-reader.test.mjs` | `a complete row` | the complete call, its link lines, the row line; `acceptedCount` 1 | `complete` true; `lo` 100; `hi` 100; `outcomes` `[{ stage: 'set', attempt: 0, result: 'ok', igNoWindow: null, budgetStop: false }]` |
| same | `a terminated worker's open primitive adds its bound` | a second call `r1:9:1:2` (`stage: 'batch'`, `attempt: '1/0'`, `at: 2`) with `caps` and a `begin` (`bound: 5000`), no `p`, no `end` | `complete` true; `terminated` 1; `open` 1; `lo` 100; `hi` 5100 |
| same | `a whole worker journal is missing` | the complete row plus a link line `worker-end` for pid 9 thread 2, with no file `r1.9.2.jsonl` | `complete` false; problem `missing worker journal 9/2` |
| same | `empty evidence despite accepted puzzles` | only the `worker` line and the link and row lines; `acceptedCount` 3 | problem `empty evidence` |
| same | `an unmatched completed task` | the complete row plus a link line `{ ev: 'complete', slot: 1, attempt: 0, ok: true, outcome: 'candidate' }` | problem `unmatched batch candidate 1/0` (from `rowLedger`) |
| same | `a call ended without its primitive's end line` | the complete call with its `p` line removed and `end.work` 0, `profiles` 0 | problem `unfinished primitive r1:9:1:1` |
| same | `a cut line is a lost measurement` | the complete call with its last line cut to `{"t":"en` | `complete` false; a problem starting `unparseable line` |
| same | `no row line, or another row's` | the complete row without the row file; then with `seed: 's2'` | `no row line`; `row line mismatch` |
| same | `a foreign file` | the complete row plus `r2.9.1.jsonl` | problem `foreign file r2.9.1.jsonl` |
| same | `re-rating starts are counted` | the complete call plus two `rerate` lines with `phase: 'rescue'` and one with `phase: 'rerate'` | `complete` true; `rerateStarts` `{ close: 0, rescue: 2, rerate: 1 }` |
| same | `the raw no-window side is kept` | the complete call with `end.result: 'not-in-band'`, `igNoWindow: 'below'`; link outcome `no-window-below` | `outcomes[0]` has `result: 'not-in-band'`, `igNoWindow: 'below'` |
| same | `the ledger input of the verdicts` | `workLedger` of the complete row | exactly the keys `complete`, `problems`, `calls`, `ended`, `terminated`, `open`, `lo`, `hi`, `ratingWork`, `countWork` |

## Documentation

None here; P2-17 documents `tools/ig-proto/phase2/` in `tools/ig-proto/README.md`.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --test tools/ig-proto/phase2/trace-reader.test.mjs` | slot root, unlocked (synthetic, no engine) | `# fail 0`, `# cancelled 0` | 2 min |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when `rowLedger` reports a problem that a case above does not expect: report its text. The frozen
  functions are not changed, and C9 changes only by a pack-author ruling.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13r-B01 | A lost journal, row line or primitive can never be read as zero work | the negative cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13r-T01 | C9 exactly: `rowLedger` unchanged plus the five added checks | the cases | test output |
| P2-13r-T02 | A terminated worker's open primitive adds its proved bound | the terminated case | test output |
| P2-13r-T03 | The raw outcomes are exposed for N-V4-16 | the no-window case | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the test pass counts;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w2, 203f5ca727301df0a7b1a976748c571189d60db4 (rebased onto gen-v4 after P2-01 and P2-03) |
| Start, end, duration | dispatched 2026-11-25 22:01 +07:00; developer 22:01:54 to about 22:05, fix round to about 22:31; accepted 22:33; about 32 min |
| Waiting for rulings | about 10 min (SA-Opus ruling on the deviations) |
| Agent id, model | 6b40a2d0-7019-410f-917d-bc774ce32d9a, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 17; 1,232,241 / 27,349 / 1,137,710 |
| AI credits | 62.36 |
| Questions and rulings | no QUESTION; SA-Opus ruling: deviations 1-5 and the two gaps accepted; one fix: a row file with more than one parsed line adds `row line mismatch` (case `a second row line is a mismatch`); no contract change (C3, C9) |
| Fix rounds | 1 |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 3 files); rebased onto ec8c583 cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked `IG P2-13r merge exit=0 seconds=0.341 quiet=45`, every phase-2 test file (trace-reader.test.mjs) 15/15 pass |
| Commit (slot), commit on `gen-v4` | slot 0cbf896, rebased fb67ba0; gen-v4 fb67ba0aba87ed85c8e85b677b0ef66ededbe2e2 |
| Issues and named items | none; P2-13b, P2-13c and P2-13f read rows only through rowWork; P2-17 documents the module |
