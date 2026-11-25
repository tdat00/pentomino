# P2-14b: The replay-resource probes

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.7 (`REPLAY`, the eight probes: R5); D-P2-09, D-P2-12; P2-T11; review-1 R1, R2, R10 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-14b` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | join; P2-12b (the copies) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2 h; machine: unlocked synthetic tests (no probe runs here) |

## Goal

One script runs the eight replay-resource probes that P2-19 charges once to stage A, exactly as they were priced: two
successive groups of four items, on two lanes, in one locked invocation. Every item is checkpointed, so a resumed run
never repeats a started item. The script writes its own durable receipt. A probe with nothing to replay is
"not measured", never a pass.

## Authority and fixed points

- **R1, verbatim:** "Resource probes use two successive four-item groups with **two lanes**, with the original 885-s
  horizon, admission reserve and cut rules. Add `replay-probe.mjs --all --out <dir>` to execute that schedule and
  checkpoint every item. The 120 seconds/item remains a price proxy/admission reserve, not a duration guarantee or a hard
  item deadline. A started/censored item is never silently repeated; only not-started items may resume."
- **The price** (check-list §3.5): one invocation of 2 + (3 + 240) + (3 + 240) = 488 node s, plus 45 s of quiet = 533 s.
- **R10, verbatim:** "Resource probes record `result.steps.length`, `utf8Length(JSON.stringify(result.steps))`, and
  `result.work`. A probe needs the declared nonempty matched sample; no set/puzzle or no ordinary candidate is **not
  measured**, never an empty "every replay matched" pass. Preserve its failure/shortfall and stop for the defined
  readout, rather than inventing records or retrying another seed without the stated rule."
- **R2.** The script writes its own CRLF UTF-8 receipt to `--out`; the console output is not evidence. The receipt's
  format is `contracts.md` C15, which P2-13v's `resourceGate` reads for gate A4 (review-2 R2-05).
- **R5 (plan §4.7).** "If the probes establish adequate margin, keep the limits. If a limit, fixture or runtime change is
  needed, stop for the pack author's ruling." The margin of P2-T11: each item's maximum steps, bytes and work are at
  most half of `REPLAY.maxSteps`, `REPLAY.maxBytes` and `REPLAY.work` (`core/engine/policy.js:130-135`).
- **The client's API.** `client.replayPuzzle(input)` resolves with `{ status, reason, stages, compared, work, steps }`
  (`core/engine/replay.js:944-953`).
- **The items, fixed** (pack author). Seed `p2-replay/<cell>/0`, `quantity` 4, through each copy's own client and pool
  (4 workers per lane):

  | Item | Group | Cell | Uniqueness | Copy |
  |---|---|---|---|---|
  | 1 | `any` | `26x26-hell-1` | `any` | `p2-gen4-diag` |
  | 2 | `any` | `20x20-hell-1` | `any` | `p2-gen4-diag` |
  | 3 | `any` | `24x24-nightmare` | `any` | `p2-gen4` |
  | 4 | `any` | `22x22-nightmare` | `any` | `p2-gen4` |
  | 5 | `require` | `22x22-hell-1` | `require` | `p2-gen4-diag` |
  | 6 | `require` | `32x15-hell-1` | `require` | `p2-gen4-diag` |
  | 7 | `require` | `22x22-nightmare` | `require` | `p2-gen4` |
  | 8 | `require` | `32x15-nightmare` | `require` | `p2-gen4` |

- **The lanes.** Group 1 is items 1 to 4, and group 2, items 5 to 8, starts when group 1 has ended. In each group,
  lane 1 runs the group's first and third items and lane 2 its second and fourth, each lane in order.
- **Admission.** An item starts only while `elapsed + 120 + 10 <= 885`, with `elapsed` the seconds since the script
  started. An item not admitted stays `not-started`.

## Scope

- **Create:** `tools/ig-proto/phase2/replay-probe.mjs` and `tools/ig-proto/phase2/replay-probe.test.mjs`.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/replay-probe.mjs', 'tools/ig-proto/phase2/replay-probe.test.mjs',
    'tasks/improve-generating-phase-2/P2-14b-replay-probes.md')
  ```

## Steps

1. **`replay-probe.mjs --all --out <dir> [--trees <dir>]`** (default `--trees` `tests/artifacts/ig-proto/phase2/trees`),
   and `--item <n> --out <dir>` for one item.
   - **Before an item runs**, write `<out>/items/<n>.started` (with `wx`).
   - **One item:**
     1. generate the set, then a batch of `quantity` 4 with the set's calibration, through the copy's client;
     2. for each accepted puzzle, call `client.replayPuzzle({ set, puzzle, setOrigin, made })` and record
        `{ id, kind: made.kind, status, steps: result.steps.length, bytes: utf8Length(JSON.stringify(result.steps)), work: result.work }`, with `utf8Length` of the copy's `core/engine/replay.js` (line 83);
     3. compute the item's maxima and its margin, `'ok'` or `'exceeded'` with the limit named;
     4. write `<out>/items/<n>.json` (CRLF).
   - **The item's status:**
     - `measured`: at least one accepted `candidate` puzzle was replayed;
     - `not-measured`, with a `reason` (`no set`, `no puzzle` or `no ordinary candidate`), otherwise;
     - `failed`: any replay is not `matched`, or the margin is `exceeded`.
   - **Resume.** On a new run with the same `--out`, an item with its `.json` is kept. An item with `.started` and no
     `.json` is `censored`, recorded as such, and not run again. Only items without `.started` may run.
   - **`--all`** runs the lanes and groups above, with the admission rule. Then it writes `<out>/receipt.json` (CRLF):
     `{ format: 'p2-replay-probes', version: 1, limits: REPLAY, items: [ ... the eight items, in order, each with n, cell, uniqueness, copy: { id, treeId }, status, reason, puzzles, maxima, margin ... ], sources: { trees } }`.
   - **Exit:** 0 when every item is `measured` with margin `ok`; 1 when any item is `failed`; 3 when any item is
     `not-measured`, `censored` or `not-started`. The receipt is written in every case.
2. **`replay-probe.test.mjs`** (`node:test`): the cases below. They inject a fake client factory and a fake clock through
   the exported `runProbes({ out, items, makeClient, now })`; no engine runs.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/replay-probe.test.mjs` | `the items are fixed` | `ITEMS` | the eight items of the table; no seed starts with `landscape/` |
| same | `two lanes, two groups` | fake items that record their start order and lane | group 1's items 1 and 2 start before 3 and 4, on lanes 1 and 2; no item of group 2 starts before group 1 ends |
| same | `the margin rule` | synthetic maxima at 0.5 and at 0.51 of `REPLAY.maxBytes` | `ok`; `exceeded`, naming `maxBytes` |
| same | `an empty sample is not measured` | an item with no accepted puzzle; one whose puzzles are all `calibration` | `not-measured`, `no puzzle`; `not-measured`, `no ordinary candidate`; exit 3 |
| same | `a started item is never repeated` | `<out>/items/3.started` without `3.json`; `5.json` present | item 3 `censored`, not run; item 5 kept; the others run |
| same | `admission leaves late items not started` | a fake clock at 760 s when item 7 would start | item 7 `not-started` (760 + 130 > 885); the receipt lists it; exit 3 |
| same | `the receipt is written on failure too` | one replay `unavailable` | item `failed`; the receipt exists; exit 1 |

## Documentation

None here; P2-17 writes the README section.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --test tools/ig-proto/phase2/replay-probe.test.mjs` | slot root, unlocked (fakes only) | `# fail 0`, `# cancelled 0` | 2 min |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |
| the merge gate's rehearsal (the orchestrator, after the merge, on the merged `gen-v4` head in the main worktree; ruling on P2-14b, 2026-11-26): the copies built with `node tools\ig-proto\phase2\copies.mjs build --source gen-v4`, then `Invoke-IgNode -Repo pentomino -Task 'P2-14b replay-probe rehearsal' -LimitSeconds 900 -QuietSeconds 45 -NodeArgs @('tools\ig-proto\phase2\replay-probe.mjs', '--all', '--out', 'tests\artifacts\ig-proto\phase2\rehearsal\replay-probes')` | §3.3, uncharged (before the seal) | exit 0: the eight items `measured`, margin `ok`; the execution log records each item's status, `seconds` and maxima, and the helper's node seconds | 900 s |

No probe runs in the developer's slot. P2-19 runs `--all` once, locked, through the stage-A ledger. Before that, the
orchestrator runs the rehearsal above once, uncharged. Its `--out` is a scratch folder, never `E/replay-probes/`. The
seeds are fixed, so it does P2-19's work, and the first real run of the two-lane client path happens before the seal. Any
other exit, or a kill, stops for the pack author's ruling before P2-18:

- exit 2 is a wiring defect, fixed before the seal;
- a `not-measured` item may get a seed rule, stated before the seal;
- a `failed` item (a replay not `matched`, a margin `exceeded`, or an error) falls under R5. Its seed is never swapped
  to avoid the failure.

## Stop points and questions

- **`QUESTION:`** when an item needs a `REPLAY`, fixture or runtime change to run, or when the copies cannot run two
  clients in one process.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-14b-B01 | The replay limits can be judged against real `gen-v4` records without inventing a pass | the cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-14b-T01 | R1: two lanes, two successive groups, the 885-s admission, no repeated item | lane, resume and admission cases | test output |
| P2-14b-T02 | R10: `steps`, bytes and `work` per replay; a nonempty sample; the margin rule | margin and sample cases | test output |
| P2-14b-T03 | R2: the script's own receipt, also on failure | receipt case | test output |

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
| Slot, base SHA | w2, 6c039dec1f04072b0e8bcdf52b0c2347ab58485b |
| Start, end, duration | dispatched 2026-11-26 01:46 +07:00 (developer 01:46:45 to 01:50:35); accepted 01:56 |
| Waiting for rulings | about 6 min (ten deviations and the pre-seal rehearsal, SA-Opus) |
| Agent id, model | d3c9abf7-fcd7-41fd-af32-5315119ca6f0, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 21; 1,798,187 / 34,658 / 1,677,346 |
| AI credits | 81.64 |
| Questions and rulings | no QUESTION; ten deviations accepted by SA-Opus, pack amendment eb1e6c4 (P2-14b commands table and C15): extra runProbes options; sources.trees a folder path; a thrown item error is failed with reason error and detail, never re-run (C15); extra receipt fields; margin null when nothing was measured (C15); --all exits 2 before .started when a tree is missing; a stale receipt deleted; --item writes only its item; an unreadable or foreign .json is no result; the real client reuses openCopy and moduleOf. Pre-seal rehearsal: after the merge, one locked, uncharged replay-probe --all (900 s) from the main worktree on the merged head into tests/artifacts/ig-proto/phase2/rehearsal/replay-probes (never E/replay-probes) |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | slot static guards; merge gate with every phase-2 test file and G-COPIES; then the uncharged rehearsal on the merged head (results, item statuses, seconds and maxima in the bookkeeping); developer: unlocked replay-probe.test.mjs 7/7 (0.36 s), G-PROTECTED, G-WORKTREE, G-FORMAT (2 files), G-CHECK OK, copies 195 and 32 edits |
| Commit (slot), commit on `gen-v4` | this commit; its SHA on gen-v4 in the bookkeeping |
| Issues and named items | P2-19 runs --all once, locked; P2-17 writes the README section |
