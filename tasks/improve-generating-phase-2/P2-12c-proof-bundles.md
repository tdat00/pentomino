# P2-12c: Proof bundles 1 and 2: observers and certificates

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §7.2 (four proof bundles), §7.3 step 1, §4.4 port contract, §4.6; D-P2-10, D-P2-12; P2-T02, P2-T03; review-1 R5; review-2 R2-03 (the runner is P2-12b's); `contracts.md` C14 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-12c` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | join; P2-12d (the traced copies) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2 h; machine: two locked rehearsals (at most 120 s each) |

## Goal

Two scripted proofs run before any timed row (P2-18):

- **The observers proof:** `charge`, `record` and the trace leave the selection's results, work and skips unchanged,
  and the traced units equal the metered units.
- **The certificates proof:** a certified screen rating is the canonical rating, and the screen never changes a result.

Each bundle is one locked invocation with a durable pass or fail record, written by P2-12b's common runner
`proofs.mjs`, which loads a bundle by name. P2-12e adds the other two bundles.

## Authority and fixed points

- **The price.** The four bundles are priced at the four observed V4-S4 parity steps: 1,400.916 counted s in all, about
  305 node s each plus 45 s of quiet. Each bundle's invocation limit is 900 s, and the stage-A ledger charges what it
  really uses (check-list §3.5).
- **Seeds:** `p2-proof/<cell>/<i>` only; never a `landscape/...` rep, never reps 40 to 59.
- **R5, verbatim:**
  - "The traced proof calls the active copy's **`clues.selectClues` dispatcher**, not an unwrapped direct selector.
    Give every proof case its own journal directory/`IG_ROW`, so its units cannot include earlier cases."
  - "Compare outputs for no-observer, charge, and record+charge runs. Compare metered units between observable charge
    runs and the traced primitive sum; do not compare a nonexistent no-observer charge sum to zero."
- **The sources.**
  - The production modules are those of the slot, or of the main worktree in P2-18.
  - The copies are under `tests/artifacts/ig-proto/phase2/trees/gen-v4/`: P2-12b builds them and P2-12d traces them.
  - Before P2-15 the copies are built with `--rehearse-cutover`, so the copy's dispatcher routes Nightmare to
    `gen-v4`.
  - P2-18 runs the bundles on the sealed, cut-over sources.
- **The runner and the record (read by P2-13b's smoke gate S1)** are P2-12b's: `proofs.mjs <bundle> --out <dir> [--quick]`
  imports `./proof-<bundle>.mjs` on invocation and calls its `run({ out, quick, root, trees })`, which returns
  `{ status, cases, counts, copies }`, `copies` being the ids of the copies the bundle used. It writes `result.json`
  (`contracts.md` C14, with `quick` and `sources`) and `result.md`. Bundles use its exported `compare(a, b)`.
- **The sets.** Each is made as P2-05b's parity script makes them: `setAttempt`'s lines 113-135 with the case's seed and
  `attempt = 0`, then the selection rng `rng.derive('cal')`.

## Scope

- **Create** under `tools/ig-proto/phase2/`:
  - `proof-observer.mjs` and `proof-certificate.mjs`: the bundles;
  - `proofs.test.mjs`: their tests.
- **Do not change:** anything else, `proofs.mjs` included (P2-12b's). Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/proof-observer.mjs',
    'tools/ig-proto/phase2/proof-certificate.mjs', 'tools/ig-proto/phase2/proofs.test.mjs',
    'tasks/improve-generating-phase-2/P2-12c-proof-bundles.md')
  ```

## Steps

1. **The bundles' interface.** Each bundle module exports `run({ out, quick, root, trees })` and returns
   `{ status, cases, counts, copies }`: `proof-observer` returns `copies: ['p2-gen4']`; `proof-certificate` uses
   production modules only and returns `copies: []`. `quick` runs only the first case of each kind.
2. **`proof-observer.mjs`.**
   - **Cases:** cells `14x14-nightmare` and `15x15b10-nightmare` (screened), `10x10-nightmare` and `15x20-nightmare`;
     three seeds each, uniqueness `any`; plus `10x10-nightmare` with `require` on two seeds.
   - **The four runs of each case:**
     - (a) production `selectCluesV4(ctx)` with no observer;
     - (b) the same with `charge`, collecting the units;
     - (c) the same with `record` and `charge`;
     - (d) the copy `p2-gen4`'s `clues.selectClues` (the traced dispatcher), with `charge`, and with
       `ctx.igStage = 'set'`, `ctx.igAttempt = 0`. Before the call, `process.env.IG_LOG_DIR` is set to the absolute
       path `resolve(out, 'journal', <case>)` (a new folder; `contracts.md` C1) and `IG_ROW` to `<case>`.
   - **Equal across (a) to (d):** `ok`, the clue piece ids, `rating` (deep), `skips`, `igWindow` and `counters`.
   - **Equal across (b) to (d):** the summed `charge` units.
   - **The journal of (d)** is read with `readRowFolder` (P2-13r). Then `rowLedger(lines, [])` must be `complete`,
     with `lo === hi` equal to (d)'s units.
   - **One more case:** a `record` that throws on its third event propagates out of the call.
3. **`proof-certificate.mjs`.**
   - **Cases:** `14x14-nightmare`, `15x15b10-nightmare` and `16x16-nightmare`, three seeds each.
   - Run production `selectCluesV4` with a `rateScreen` seam that calls
     `rateWithLimits(board, pieces, clues, ws, W, 'lean')` and records `(clues, W, rating or the IncompleteRatingError)`.
     The call's result must equal the call without the seam.
   - Then, for each recorded screen rating:
     - certified (`screenCertified(rating.metrics, W)`) implies that `rateLean(clues)` deep-equals the rating;
     - not certified implies that `rateLean` throws `IncompleteRatingError`, or that its main work exceeds `W`.
   - **Counts:** certified, screen-capped, capped.
4. **`proofs.test.mjs`:** the cases below. They are synthetic, except the two quick rehearsals, which run as locked
   commands.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/proofs.test.mjs` | `a missing or incomplete journal fails the observer case` | case records with `journal: null`; with `complete: false` | `fail`, naming the problem |
| same | `a traced sum different from the charge fails` | a case record with charge units 100 and ledger `lo` 90 | `fail` |
| same | `a certified rating different from the canonical one fails` | a recorded corpus with one mismatch | `fail`, listing the case |

## Documentation

None here; P2-17 writes the README section.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| the rehearsal copies: `node tools\ig-proto\phase2\copies.mjs build --source gen-v4 @flag` (G-COPIES' `$flag`) | slot root, unlocked | one line per copy | 2 min |
| locked focused gate: `-NodeArgs @('--test', 'tools/ig-proto/phase2/proofs.test.mjs')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| locked rehearsal, each of `observer` and `certificate`: `Invoke-IgNode -Repo pentomino -Task 'P2-12c <bundle> quick' -LimitSeconds 120 -QuietSeconds 45 -NodeArgs @('tools\ig-proto\phase2\proofs.mjs', '<bundle>', '--out', 'tests\artifacts\ig-proto\phase2\rehearsal\<bundle>', '--quick')` | §3.3 | exit 0; `result.json` `status: 'pass'` | 120 s each |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **Stop and report** when a rehearsal fails. A difference in `observer` is a port defect for the pack author.
- **`QUESTION:`** when a copy's modules cannot be loaded in process beside the production modules.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-12c-B01 | The two proofs that P2-18 runs exist and pass their rehearsal | the rehearsal records | `tests/artifacts/ig-proto/phase2/rehearsal/<bundle>/result.json` (reported, not committed) |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-12c-T01 | R5: the traced call goes through the copy's dispatcher; one journal per case; units compared only between observable runs | the observer bundle; tests | rehearsal record; test output |
| P2-12c-T02 | P2-T02 and P2-T03 on real data, as steps 2 and 3 | rehearsal | rehearsal record |
| P2-12c-T03 | Missing evidence is a failure | tests | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] Two quick rehearsals pass
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- each rehearsal's helper line, status and counts;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | |
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator (merge gate) | |
| Commit (slot), commit on `gen-v4` | |
| Issues and named items | |
