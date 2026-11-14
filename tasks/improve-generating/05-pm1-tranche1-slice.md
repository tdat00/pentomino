# IGP-05 — PM1 tranche 1, reduced first slice

| Header | Value |
|---|---|
| ID | IGP-05 |
| Depends on | IGP-00 (accepted and committed) |
| Estimated size | Medium: about 450 new lines (`pm1.mjs`); about 1 to 2 hours of developer work; machine time about 23 minutes (projection: part 1 about 7 min of rating on four lanes, part 2 about 1 min, part 3 about 6 min, a dry run, nine quiet periods) |
| Owner role | Measurement prototype |
| Confirms or refutes | IG-P-Q16 and report §2/§3: whether Hell 1 on 215-484 cells, Hell 2 and Hell 3 show any in-band rating, score-in-band and AR1-eligible counted apart (R27); why Hell 1 sets fail on 14x14 and 24x24 (R28); the fine count curves and start-count capped shares of 14x14, 12x12 and 26x26 Nightmare (R29) |
| Design refs | plan §5 PM1; `clarifications.md` IG-P-Q04 (tranche 1, in this order; record work and nodes to the first solution, the count tail and the census apart; MP12b1's coarse curves not repeated), Q16 (Hell 2 and 3 route); check-list §4 D-IG10, D-IG12, D-IG13 |
| Label | provisional (pre-freeze); frozen re-run by check-list §6 |
| Implementation status | Not started |

## Goal & business context

No in-band rating has ever been observed for Hell 2 or Hell 3, nor for Hell 1 on 215 to 484 cells: MP12b1's prescreens
made no set in three requests each. The plan author's tranche 1 answers first whether those bands contain any window
at all, then gives fine counts on three Nightmare cells that span the regimes, then the failed-set populations of Hell 1
on 14x14 and 24x24 (IG-P-Q04). Tranche 1 is capped at about 10 worker-hours, which does not fit this round's 3 hours,
so this task runs a reduced first slice in the same order (about 0.8 worker-hours) and states the rest as a later round
that needs the owner's approval. Its part 1 is a reduced diagnostic (one boundary search and a short scan per family),
not Fable's full fine-count tranche: non-monotone windows can be missed, so a cell without an in-band rating is reported
as "none observed", never as "no window".

## Scope

### In scope

- `pm1.mjs` with `windows`, `scan`, `failed-sets` and `report`; the three parts below; the records.

### Out of scope (the later round, D-IG10)

- The rest of tranche 1: per cell 10 sets × 3 layouts (the witness and two walked layouts) × 2 orders in part 1, with
  full count scans; the same scope on the three Nightmare cells of part 2; 20 sets per cell in part 3. About 9
  worker-hours, 2.5 hours on four lanes.
- Tranche 2 (walked layouts on further cells, the held-out window audit), P4's table (IGP-01 fits a provisional one).

## Repository rules

The check-list §3 and §7. Locked commands through the runner only; no git.

## Inputs & context

- IGP-00's lanes (`rate` and `call` jobs on the `instr` tree, admission and supervisor), `caseBoard` (the catalogue),
  `firstCarvedSet`, `rateRecord`.
- Case ids (catalogue): Hell 1 on 215-484 cells: `15x15b10-hell-1`, `16x16-hell-1`, `15x20-hell-1`, `18x18-hell-1`,
  `18x20-hell-1`, `20x20-hell-1`, `20x21-hell-1`, `32x15-hell-1`, `22x22-hell-1`; Hell 2: `15x20-hell-2`, `18x18-hell-2`,
  `18x20-hell-2`, `20x20-hell-2`, `20x21-hell-2`, `32x15-hell-2`, `22x22-hell-2`, `24x24-hell-2`, `26x26-hell-2`; Hell 3:
  `32x15-hell-3`, `22x22-hell-3`, `24x24-hell-3`, `26x26-hell-3`. MP12b1's prescreens of these 22 cells
  (`<case>-s3-2026-11-14.json`) made no set.
- MP12b1's start-count capped shares (report §1): 14x14 Nightmare 0.89, 12x12 0.53, 26x26 0.10.

## Design

All ratings are canonical (`DEDUCE`), on the `instr` tree (with diagnostic offers, D-IG13); each record holds the tuple
fields of IGP-00 §4 by name, plus in band (score), AR1-eligible (`Gproved >= 1` when the level is Hard or above), side,
censored, solutions and the count tail (main work − work to the first solution). Every set records `offeredInSource`.

**Families.** A family is a set and an order: set seed `ig-pm1/<case>/<i>` (the first attempt from 0 whose carve
succeeds, up to 8), order `o` from `createRng(normalizeSeedText(seed), 'ig-pm1/order/<o>')` shuffling the witness
positions; `clues(c)` = the first `c` positions of the order, sorted (nested: every count's clues contain the next
smaller count's). Families are driven from the main thread, up to four in flight (one per lane), probe by probe: each
probe is a `rate` job admitted by its bound (check-list §7), and the family's state (part, step, the counts rated, the
algorithm's variables) is checkpointed after every probe, so an invocation can stop between any two probes and the next
one resumes the family where it stopped. A state file says `done` when every family of the part is complete.

**Discoveries.** Every rating whose score is in the cell's band is a discovery: its full inputs (`boardRows`, `pieces`,
`clues`) and its rating are written to `discoveries.jsonl`, so that its canonical rating and structure can be verified
later, with `eligible` true or false.

### Part 1: windows of the cells without curves (`windows`), in the plan author's order

Cells: the nine Hell 1 cells, then the nine Hell 2 cells, then the four Hell 3 cells, each in the order listed above;
two sets × two orders per cell (88 families). Per family, a boundary search from the cheap side and a short scan next
to the cap, where the highest scores lie:

```text
c = clamp(K - 8, 1, K - 2); rate(c)
capped -> try c = K - 4, then c = K - 2 (each once, if not yet rated): the first complete one becomes the start;
          all capped -> result 'capped-at-cheap-side' (the limitation is recorded), stop
lastComplete = c; U = K - c
repeat: U = 2 U; c = max(1, K - U); if c == lastComplete -> result 'no-cap', stop
        rate(c): capped -> cappedAt = c, leave; complete -> lastComplete = c; if c == 1 -> result 'no-cap', stop
while lastComplete - cappedAt > 1: mid = floor((cappedAt + lastComplete) / 2); rate(mid): capped -> cappedAt = mid,
        complete -> lastComplete = mid
scan: rate every count from lastComplete + 1 to min(K - 2, lastComplete + 5) not yet rated
result 'boundary'
```

Per cell: score-in-band ratings and AR1-eligible in-band ratings, each with how many and in how many families; the
maximum score and its gap to the band's lower edge; the boundary counts; the cost per rating and per in-band rating.
The verdict wording: "in-band ratings observed: n (e eligible) in f of 4 families", or "none observed in 4 families".

### Part 2: fine counts with nested orders (`scan`)

Cells `14x14-nightmare` (dead end), `12x12-nightmare` (dear ratings), `26x26-nightmare` (start already right); two sets
× two orders each. Per family every count from K - 8 down to 1, stopping after three consecutive capped counts. Per
cell: per count the score (median, min, max), the capped share, the in-band and eligible shares; the start count's
capped share (R29, against MP12b1's); the window counts (in-band share above zero); work to the first solution and the
count tail by count.

### Part 3: failed-set populations of Hell 1 (`failed-sets`)

Cells `14x14-hell-1` and `24x24-hell-1`; four sets each (seeds `ig-pm1/<case>/fs/<i>`). Per set: today's set-stage call
(`call` job, canonical profiles streamed, as PM4's; a call cut at the invocation deadline is recorded `censored` with its
profiles) and its outcome. For each set whose call made no puzzle, two orders with the part-1 algorithm. The call's
failure is classified from its profiles: `dead-end` (no rated candidate: every profile at the start count capped or
refused), `never-in-band` (rated, none in band), `in-band-refused` (in-band scores all refused by AR1), `limit` (64
profiles without a final result), `censored` (cut at the deadline), `other`.

### `pm1.mjs`

```text
node tools\ig-proto\pm1.mjs windows --cases <ids> --sets 2 --orders 2 --label <L> [--run-id <id>]
node tools\ig-proto\pm1.mjs scan --cases <ids> --sets 2 --orders 2 --label <L> [--run-id <id>]
node tools\ig-proto\pm1.mjs failed-sets --cases <ids> --sets 4 --orders 2 --label <L> [--run-id <id>]
node tools\ig-proto\pm1.mjs report --label <L> [--run-id <id>]
```

Artifacts under `tests/artifacts/ig-proto/<L>/IGP-05/<run-id>/<part>/` (default run id `main`; the dry run uses `dry`):
`families.jsonl` (completed families), `progress.json` (the per-probe checkpoint of unfinished families, with `treeId`
and harness hash in its header), `discoveries.jsonl`, `calls.json` (part 3), `state.json`. Flags are recorded **per
part**: the first invocation of a part writes its `state.json` header with the part's cells, sets and orders, and every
later invocation of that part checks them, the `treeId` and the harness hash, and exits 1 on a difference. `--max-probes`
and `--horizon-s` limit one invocation and are not part of the flags.

## Files to create/modify

| File | Change |
|---|---|
| `tools/ig-proto/pm1.mjs` | new |
| `tools/ig-proto/plans/IGP-05.json` | new |
| `tools/ig-proto/README.md` | one section (PM1) |
| `docs/improve-generating/evidence/provisional/IGP-05/` | new: `pm1.json`, `pm1.md`, `families-<part>.jsonl`, `discoveries.jsonl` |

## Implementation steps

1. `pm1.mjs`; a dry family on `15x15b10-hell-1` (run id `dry`) through the runner, stopped and resumed once between two
   probes (`--max-probes 3`, a test option) to prove the checkpoint.
2. The plan; the report; `npm run check`; the firewall check.

## Commands

The run plan `tools/ig-proto/plans/IGP-05.json` (allocation 23 minutes; the runner adds `--label` and
`--source-label`):

| Step | Locked | Node arguments | projectS | State |
|---|---|---|---:|---|
| firewall-snapshot | no | `tools/ig-proto/firewall.mjs snapshot --task IGP-05` | | |
| tree | no | `tools/ig-proto/lib/tree.mjs build instr` | | |
| dry | yes, until done | `tools/ig-proto/pm1.mjs windows --cases 15x15b10-hell-1 --sets 1 --orders 1 --run-id dry --max-probes 3` | 90 | `IGP-05/dry/windows/state.json` |
| part1 | yes, until done | `tools/ig-proto/pm1.mjs windows --cases 15x15b10-hell-1,16x16-hell-1,15x20-hell-1,18x18-hell-1,18x20-hell-1,20x20-hell-1,20x21-hell-1,32x15-hell-1,22x22-hell-1,15x20-hell-2,18x18-hell-2,18x20-hell-2,20x20-hell-2,20x21-hell-2,32x15-hell-2,22x22-hell-2,24x24-hell-2,26x26-hell-2,32x15-hell-3,22x22-hell-3,24x24-hell-3,26x26-hell-3 --sets 2 --orders 2` | 330 | `IGP-05/main/windows/state.json` |
| part2 | yes, until done | `tools/ig-proto/pm1.mjs scan --cases 14x14-nightmare,12x12-nightmare,26x26-nightmare --sets 2 --orders 2` | 330 | `IGP-05/main/scan/state.json` |
| part3 | yes, until done | `tools/ig-proto/pm1.mjs failed-sets --cases 14x14-hell-1,24x24-hell-1 --sets 4 --orders 2` | 330 | `IGP-05/main/failed-sets/state.json` |
| report | no | `tools/ig-proto/pm1.mjs report` | | |
| firewall-check | no | `tools/ig-proto/firewall.mjs check --task IGP-05` | | |

```powershell
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-05.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1"
if ($LASTEXITCODE -ne 0) { throw "IGP-05 run plan stopped: exit $LASTEXITCODE" }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

Projection: part 1 about 88 families × 13 ratings × 1.5 s on four lanes (about 430 s, two invocations); part 2 about
70 s; part 3's calls one cell per invocation (a failing Hell 1 call can make 64 profiles at up to about 2.4 s), then
the families of failed sets (about 80 s).

## Record formats

- `families-<part>.jsonl`: one line per family: `{ case, level, band: { min, max }, set: { seed, attempt, K, area,
  offeredInSource }, order, probes: [ <rating record> ], result, boundary, cappedAt, maxScore, inBand, eligible }`.
- `discoveries.jsonl`: `{ case, family, count, boardRows, pieces, clues, rating, eligible }`.
- `pm1.json`: `{ meta, part1: { '<case>': { families, inBand: { ratings, families }, eligible: { ratings, families },
  maxScore, gapToBand, boundaries, cheapSideCapped, msPerRating, msPerInBand } }, part2: { '<case>': { counts: { '<c>':
  { n, scoreMedian, scoreMin, scoreMax, cappedShare, inBandShare, eligibleShare, workFirst, countTail } }, startCount,
  startCountCappedShare, windowCounts } }, part3: { '<case>': { sets: [{ seed, callResult, failure, families }] } },
  limitations: [...], laterRound: { scope, workerHours, wallHours } }`.
- `pm1.md`: the banner; part 1 in the plan author's order with the verdict per cell; part 2's curves; part 3's failure
  classes; the limitations (reduced diagnostic, possible non-monotone windows, cheap-side caps); the later round's scope
  and cost.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| IGP-05-B01 | Each of the 22 cells without curves has a first answer on whether any in-band rating occurs, score-in-band and AR1-eligible apart, in the plan author's order, worded as observations with the reduced design's limits | `pm1.md` part 1 |
| IGP-05-B02 | The three Nightmare cells have fine counts with nested orders; the start-count capped shares are set against MP12b1's | `pm1.md` part 2 |
| IGP-05-B03 | The failing Hell 1 sets of 14x14 and 24x24 are classified by why they fail | `pm1.md` part 3 |
| IGP-05-B04 | Every in-band discovery is reproducible from its saved inputs; the rest of tranche 1 is stated as a later round with its scope and cost | `discoveries.jsonl`; `pm1.md` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| IGP-05-T01 | Every rating is canonical and records work and nodes to the first solution, the count tail and the census apart | `families-<part>.jsonl` |
| IGP-05-T02 | Families are nested, seeded as specified, recorded in a fixed order, and resumed from their per-probe checkpoints (the dry run proves it) | code review; runner log |
| IGP-05-T03 | Locked commands within their bounds, in `invocations.jsonl`; records per the check-list §3; `npm run check` and the firewall check pass | runner log; command output |

## Test plan

The dry run with its stop and resume before the plan; the report's checks: every family of the plan recorded once; a
`boundary` family has a capped count right below its boundary and a complete one at it; every in-band rating is in
`discoveries.jsonl`.

## Definition of done & handoff

- The reply gives part 1's verdicts per cell, part 2's start-count capped shares and window counts, part 3's classes,
  the limitations, the later round's cost, the counted machine time and the lock waits.
- Handoff to IGP-07: `pm1.json` (R27, R28, R29); to the plan author: whether Hell 2 and Hell 3 show any in-band or
  eligible rating (IG-P-Q16).

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
