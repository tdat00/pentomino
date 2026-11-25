# Frozen-round manifest for the owner (V4-T11g, OD-P10)

> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: node tools\ig-proto\manifest.mjs price --label frozen --source-label "frozen 3fc65f4".

This is the priced, staged manifest of the frozen round (plan 5.1 "Budget", IG-P-D7, OD-P10). It was made by reading records: the compiled plans, the universe of stage 4, T03's inventory, the invocation logs and the plan's own text. **Nothing ran for it.** Nothing of stages 2 to 5, the parity passes, the probes, the live-deadline receipt or the browser calibration runs before the owner approves the price of that plan, and each approval is asked again with `node tools\ig-proto\manifest.mjs approval --plan <id> ...` when it is needed, never from this quote.

**Reading the numbers.** A time is counted machine time (check-list 1): the node seconds of a locked invocation plus at most 45 quiet seconds. *Projected* is the schedule that T11b simulates for each emitted step under the runners' own rules; *guard* is 1.25 times it, the runner's budget guard; *ceiling* is `units x 945` seconds from the bounds the code enforces (at most one invocation per row or item, each of at most 900 node seconds and 45 quiet seconds), rounded up to minutes; *completed* and *censored* are the observations (request rows or bounded items) that the simulation predicts to finish and to be cut. A guard is a budget, not a promise that every observation completes.

## 1. The price per plan, collection and item

### 1.1 The plans compiled now

| Item | Steps or groups | Units | Invocations | Projected (min) | Guard (min) | Ceiling (min) | Completed | Censored |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| V4-S2 (allocation 560 min) | 44 | 312 | 68 | 559.2 | 699.0 | 4,914 | 312 | 0 |
| V4-LIVE (allocation 36 min; blocked by N-V4-03, N-V4-13) | 2 | 10 | 4 | 35.1 | 43.9 | 158 | 10 | 0 |

The dry run of a plan prints a forecast equal to its projected counted seconds: V4-S2 33,551 s, V4-LIVE 2,107 s.

V4-S2 by kind of step:

| Item | Steps or groups | Units | Invocations | Projected (min) | Guard (min) | Ceiling (min) | Completed | Censored |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| P-0 pass | 1 | 23 | 1 | 7.0 | 8.8 | 363 | 23 | 0 |
| P-1 passes | 7 | 84 | 14 | 124.6 | 155.8 | 1,323 | 84 | 0 |
| request rows | 33 | 165 | 50 | 422.4 | 528.0 | 2,599 | 165 | 0 |
| probes | 3 | 40 | 3 | 5.2 | 6.5 | 630 | 40 | 0 |

V4-LIVE by kind of step:

| Item | Steps or groups | Units | Invocations | Projected (min) | Guard (min) | Ceiling (min) | Completed | Censored |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| request rows | 2 | 10 | 4 | 35.1 | 43.9 | 158 | 10 | 0 |

### 1.2 The universe of stage 4, per collection

An indication, not an allocation (plan §5.1). The universe is the priced matrix, not a plan: `V4-S4` and its price are written at the data-only activation (T11e), `V4-S4C` at the resolution of the comparators (T11f), and the second validation with N-V4-04. Every option that is not activated is priced apart and is **not** in the initial total.

| Item | Steps or groups | Units | Invocations | Projected (min) | Guard (min) | Ceiling (min) | Completed | Censored |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| initial collection: the declared groups (S4-1 to S4-4) | 76 | 1,040 | 113 | 915.1 | 1,143.9 | 16,380 | 920 | 120 |
| initial collection: the comparators (S4-C) | 17 | 340 | 43 | 481.2 | 601.6 | 5,355 | 340 | 0 |
| **initial collection, total** | 93 | 1,380 | 156 | 1,396.3 | 1,745.4 | 21,735 | 1,260 | 120 |
| conditional board 24x24-hell-1: the twins (S4-5) | 2 | 40 | 8 | 99.6 | 124.5 | 630 | 0 | 40 |
| conditional board 24x24-hell-1: the comparator | 1 | 20 | 4 | 52.2 | 65.2 | 315 | 20 | 0 |
| conditional board 14x14-hell-1: the twins (S4-5) | 2 | 40 | 8 | 99.6 | 124.5 | 630 | 0 | 40 |
| conditional board 14x14-hell-1: the comparator | 1 | 20 | 4 | 52.2 | 65.2 | 315 | 20 | 0 |
| optional S4-6: today's arm on the failing Nightmare cells | 5 | 25 | 7 | 58.0 | 72.5 | 394 | 25 | 0 |
| second validation: the groups (S4-7) | 8 | 160 | 32 | 391.7 | 489.7 | 2,520 | 40 | 120 |
| second validation: the comparators | 4 | 80 | 20 | 267.6 | 334.5 | 1,260 | 80 | 0 |
| **second validation, total** | 12 | 240 | 52 | 659.4 | 824.2 | 3,780 | 120 | 120 |
| **the whole universe of stage 4** | 116 | 1,765 | 239 | 2,417.2 | 3,021.5 | 27,799 | 1,445 | 320 |

The initial collection by item (a group listed by two items would be counted in each; the items sum to the collection):

| Item | What | Groups | Rows | Projected (min) | Guard (min) | Ceiling (min) | Completed | Censored |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| S4-1 | headline: both twins on every failing Nightmare cell | 10 | 200 | 404.0 | 504.9 | 3,150 | 120 | 80 |
| S4-2 | Hell 1: both twins on every validated Hell 1 board | 4 | 80 | 192.5 | 240.7 | 1,260 | 40 | 40 |
| S4-3 | controls: both twins and today's arm on every completion-passing Nightmare cell | 30 | 600 | 277.1 | 346.4 | 9,450 | 600 | 0 |
| S4-4 | Master identity: the frozen arm and today's arm on every Master cell | 32 | 160 | 41.5 | 51.9 | 2,520 | 160 | 0 |
| S4-C | comparators: the uncapped search of the arm each cell of S4-1 to S4-3 ships | 17 | 340 | 481.2 | 601.6 | 5,355 | 340 | 0 |

planning projection: 1.25 x factor x MP12b1 median; not a bound. The factor is 1.0236 (`summary.medianRatioBase` of the stage-1 identity record). A twin whose projection exceeds its 130-s row limit is priced at the limit and predicted censored (120 rows of the initial collection, 320 of the universe): a projection from today's search, not the frozen arms' expected time. No MP12b1 report gives a median for 20x20-hell-1: those cells are priced at their row limit.

### 1.3 The PM1 inventory

Data-only PM1 inventory, stage 1 (IG-P-Q24 (b); it opens no route): docs/improve-generating/evidence/frozen/V4-T03/inventory.md, 116 families, 113 alternate rows in 24 populations.

### 1.4 Unpriced

Stage 5 and the browser parts have no runner with enforced bounds in this pack (R3-05, RV3-05). They are listed with an indication only: **unpriced**, with no ceiling and no approval request, each with the item that prices it.

| Item | What | Indication | Basis | Priced by |
|---|---|---|---|---|
| S5-1 (unpriced) | the PM1 Hell 1 cells with the failing-set work | 28.1 min of work, not counted time | 60 x the cell's mean probes per family x its mean probe ms / 1000 / 4 (10 sets x 3 layouts x 2 orders, four lanes), over IGP-05's families | N-V4-04 |
| S5-2 (unpriced) | the Hell 2 cells of IGP-05, for the central share only | 23.4 min of work, not counted time | 60 x the cell's mean probes per family x its mean probe ms / 1000 / 4 (10 sets x 3 layouts x 2 orders, four lanes), over IGP-05's families | N-V4-04 |
| S5-3 (unpriced) | C4's counting | 18.7 min of work, not counted time | 1.25 x the sum of canonical.ms / 1000 of the 676 profiles of PM4 (IGP-02) | N-V4-04 |
| S5-4 (unpriced) | C3's capped-input features | 0 (data only) | data only: no run | N-V4-04 |
| S5-5 (unpriced) | further browser runs | none | no indication: nothing of them is enumerated | N-V4-04 |
| B-1 browser part (unpriced) | the bench page served from the frozen snapshot, on the Node part's requests | 54.0 min projected (4.5 x the Node part's node seconds) | a projection; no runner with enforced bounds | N-V4-01 |
| B-2 (unpriced) | the Generator page with its Generation steps prefetch | 44.8 min projected (4.5 x the node seconds of its Node rows) | a projection; no runner with enforced bounds | N-V4-01 |

S5-1 by cell (seconds of work at four lanes, an indication): 14x14-hell-1 204.0, 15x15b10-hell-1 184.1, 16x16-hell-1 181.6, 15x20-hell-1 167.6, 18x18-hell-1 148.7, 18x20-hell-1 135.4, 20x20-hell-1 149.0, 20x21-hell-1 106.2, 32x15-hell-1 146.9, 22x22-hell-1 102.5, 24x24-hell-1 160.5. No indication, no family in IGP-05's records: 26x26-hell-1.

S5-2 by cell (seconds of work at four lanes, an indication): 15x20-hell-2 158.9, 18x18-hell-2 149.4, 18x20-hell-2 154.2, 20x20-hell-2 119.1, 20x21-hell-2 200.0, 32x15-hell-2 129.2, 22x22-hell-2 102.7, 24x24-hell-2 190.1, 26x26-hell-2 203.2.

B-1's Node part is priced like any request rows (section 5): 15.0 projected minutes, 315 minutes of ceiling; its browser part and B-2 are not.

## 2. What the owner approves, now and later

The round has one cumulative cap (D-V4-02). Each approval is a cap in minutes that covers the counted time already spent, the guards of the earlier approvals (assumed spent to their guard) and the guard it asks for: RV2-13's three fields are `roundCountedSBeforeApproval`, `requestedAdditionalGuardS` and `requestedCumulativeRoundMinutes`. A lower approved cap gives an honest stop; prior invocation records are never deleted or reset.

| # | Approval | When | Price | Covers | roundCountedSBeforeApproval (s) | requestedAdditionalGuardS (s) | requestedCumulativeRoundMinutes |
|---:|---|---|---|---|---:|---:|---:|
| 1 | `V4-S2` | now | priced (compiled plan) | stage 2: the isolated P-0 pass, the seven P-1 passes, the pilots' request rows, the publishes and the probes | 2,913.910 | 41,938.170 | 748 |
| 2 | `V4-LIVE` | when N-V4-03 and N-V4-13 have unblocked it | priced (compiled plan) | the live-deadline receipt: the request rows of fr-frozen on the two live cells, then the receipt and its binding | 44,852.080 | 2,634.330 | 792 |
| 3 | `V4-S4` | after its data-only activation: the optional scope first, then the timed allowance | indication | exactly the activated declared rows: the initial collection, any activated conditional board and the approved optional S4-6, and the four P-1 passes of the stage-4 arms | 47,486.410 | 73,971.486 | 2,025 |
| 4 | `V4-S4C` | at the resolution of the comparators (T11f), from the final class selection | indication | the uncapped comparator of the arm each cell ships | 121,457.897 | 36,093.083 | 2,626 |
| 5 | `V4-S4X` | with N-V4-04: its own activation, selection, comparators and verdict | indication | the conditional second validation: both twins on a fresh cohort | 157,550.980 | 29,380.000 | 3,116 |
| 6 | `V4-S4XC` | with N-V4-04, at the resolution of the second comparators | indication | the uncapped comparators of the second validation | 186,930.980 | 20,071.387 | 3,451 |

`roundCountedSBeforeApproval` of each entry is the counted seconds now plus the guards of the entries above it (what `approval --after` computes for plans that have a file), and every entry after the first assumes each earlier approval is spent to its guard; re-read when asked. The first two requests are exact (they read the compiled plans); the stage-4 entries are indications from the universe's template, asked again from their own plan at the activation or the resolution; the second validation is priced with N-V4-04.

The basis of each entry:

- `V4-S2`: the compiled plan V4-S2: the sum of its required locked steps.
- `V4-LIVE`: the compiled plan V4-LIVE: the sum of its required locked steps.
- `V4-S4`: the universe's initial collection (the declared groups, comparators apart) and the four P-1 passes at their reserves; the plan and its price are written at the activation, and `approval --plan V4-S4` asks then.
- `V4-S4C`: the universe's initial comparators; the plan is written at the resolution, and `approval --plan V4-S4C` asks then.
- `V4-S4X`: the second-validation template; N-V4-04 compiles its plan.
- `V4-S4XC`: the second-validation template.

Not asked here (unpriced, no approval request): S5-1, S5-2, S5-3, S5-4, S5-5 are approved with N-V4-04's manifest, the browser calibration with N-V4-01's.

`V4-S4` is approved in two steps (R4-07): first the owner decides the optional S4-6 (the paired factor on the failing Nightmare cells) and authorizes the data-only `activate` (T11e; the conditional Hell 1 boards follow their pilots, not a decision), which writes the plan and its price; then `approval --plan V4-S4` asks its timed allowance, covering exactly the activated declared rows.

**Time already spent.** The frozen round has counted 2,913.910 s (48.6 min) in its invocation logs (`readInvocations('frozen')`), re-read when this manifest was made. The owner has granted 92 minutes cumulative so far (2026-11-17 08:12, the stage-1 allowance, option A). The register also counts 55.4 s that are in no log (T10a's deleted scratch run), so the round's account is 2,969.310 s; the budget guard and the requests above read the logs only, and with those seconds each cumulative cap would be at most one minute higher (`requestedCumulativeRoundMinutesWithOffLog` in `manifest.json`).

Options priced apart: each raises the caps of the later entries by its guard when it is chosen or activated (the chain above assumes none of them).

| Option | Adds to | Groups | Projected (min) | Guard (min) | Ceiling (min) | Completed | Censored |
|---|---|---:|---:|---:|---:|---:|---:|
| S4-6 | V4-S4 | 5 | 58.0 | 72.5 | 394 | 25 | 0 |
| conditional board 24x24-hell-1 | V4-S4 (the twins) and V4-S4C (the comparator) | 3 | 151.8 | 189.7 | 945 | 20 | 40 |
| conditional board 14x14-hell-1 | V4-S4 (the twins) and V4-S4C (the comparator) | 3 | 151.8 | 189.7 | 945 | 20 | 40 |

## 3. The plans, their steps, commands and prerequisites

Every command is run by `run-task.ps1`, which appends `--label frozen --source-label <SL>` and, for a locked step, `--horizon-s <H>` under the lock helper `tools\ig-proto\lock\ig-lock.ps1`.

### V4-S2 (runnable now)

Prerequisites (the first step, `prerequisites`, refuses the plan until they hold):

- the accepted binding `docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json` (today's trees compared for no arm)

| Step | Kind | Command | Units | Invocations | Projected (min) | Guard (min) |
|---|---|---|---:|---:|---:|---:|
| `prerequisites` | unlocked | `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-S2` |  |  |  |  |
| `firewall-snapshot` | unlocked | `node tools\ig-proto\firewall.mjs snapshot --task V4-S2` |  |  |  |  |
| `trees` | unlocked | `node tools\ig-proto\lib\tree.mjs build base instr r4c v4 v4-w760 v4-w095 v4-w380 log-link fr-base fr-screen fr-none fr-close fr-c4 fr-ps fr-p5` |  |  |  |  |
| `p0-v4` | locked, P-0 pass | `node tools\ig-proto\v4-check.mjs run --task V4-S2P --step p0-v4 --manifest tools\ig-proto\plans\items\V4-S2P.p0-v4.json` | 23 | 1 | 7.0 | 8.8 |
| `receipt-p0` | unlocked | `node tools\ig-proto\v4-check.mjs receipt --kind p0-identity --task V4-S2P --step p0-v4 --manifest tools\ig-proto\plans\items\V4-S2P.p0-v4.json --arm v4 --baseline docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json --require-pass` |  |  |  |  |
| `accept-p0` | unlocked | `node tools\ig-proto\v4-check.mjs accept --task V4-S2P --step p0-v4 --manifest tools\ig-proto\plans\items\V4-S2P.p0-v4.json --receipt docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.receipt.json --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --by V4-S2` |  |  |  |  |
| `parity-fr-base` | locked, P-1 passes | `node tools\ig-proto\v4-check.mjs run --task V4-S2P --step parity-fr-base --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-base.json` | 12 | 2 | 17.8 | 22.3 |
| `receipt-fr-base` | unlocked | `node tools\ig-proto\v4-check.mjs receipt --kind parity --task V4-S2P --step parity-fr-base --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-base.json --arm fr-base --require-pass` |  |  |  |  |
| `accept-fr-base` | unlocked | `node tools\ig-proto\v4-check.mjs accept --task V4-S2P --step parity-fr-base --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-base.json --receipt docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-base.receipt.json --binding docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-base.accepted.json --by V4-S2` |  |  |  |  |
| `parity-fr-screen` | locked, P-1 passes | `node tools\ig-proto\v4-check.mjs run --task V4-S2P --step parity-fr-screen --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-screen.json` | 12 | 2 | 17.8 | 22.3 |
| `receipt-fr-screen` | unlocked | `node tools\ig-proto\v4-check.mjs receipt --kind parity --task V4-S2P --step parity-fr-screen --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-screen.json --arm fr-screen --require-pass` |  |  |  |  |
| `accept-fr-screen` | unlocked | `node tools\ig-proto\v4-check.mjs accept --task V4-S2P --step parity-fr-screen --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-screen.json --receipt docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-screen.receipt.json --binding docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-screen.accepted.json --by V4-S2` |  |  |  |  |
| `parity-fr-none` | locked, P-1 passes | `node tools\ig-proto\v4-check.mjs run --task V4-S2P --step parity-fr-none --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-none.json` | 12 | 2 | 17.8 | 22.3 |
| `receipt-fr-none` | unlocked | `node tools\ig-proto\v4-check.mjs receipt --kind parity --task V4-S2P --step parity-fr-none --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-none.json --arm fr-none --require-pass` |  |  |  |  |
| `accept-fr-none` | unlocked | `node tools\ig-proto\v4-check.mjs accept --task V4-S2P --step parity-fr-none --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-none.json --receipt docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-none.receipt.json --binding docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-none.accepted.json --by V4-S2` |  |  |  |  |
| `parity-fr-close` | locked, P-1 passes | `node tools\ig-proto\v4-check.mjs run --task V4-S2P --step parity-fr-close --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-close.json` | 12 | 2 | 17.8 | 22.3 |
| `receipt-fr-close` | unlocked | `node tools\ig-proto\v4-check.mjs receipt --kind parity --task V4-S2P --step parity-fr-close --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-close.json --arm fr-close --require-pass` |  |  |  |  |
| `accept-fr-close` | unlocked | `node tools\ig-proto\v4-check.mjs accept --task V4-S2P --step parity-fr-close --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-close.json --receipt docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-close.receipt.json --binding docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-close.accepted.json --by V4-S2` |  |  |  |  |
| `parity-fr-c4` | locked, P-1 passes | `node tools\ig-proto\v4-check.mjs run --task V4-S2P --step parity-fr-c4 --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-c4.json` | 12 | 2 | 17.8 | 22.3 |
| `receipt-fr-c4` | unlocked | `node tools\ig-proto\v4-check.mjs receipt --kind parity --task V4-S2P --step parity-fr-c4 --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-c4.json --arm fr-c4 --require-pass` |  |  |  |  |
| `accept-fr-c4` | unlocked | `node tools\ig-proto\v4-check.mjs accept --task V4-S2P --step parity-fr-c4 --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-c4.json --receipt docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-c4.receipt.json --binding docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-c4.accepted.json --by V4-S2` |  |  |  |  |
| `parity-fr-ps` | locked, P-1 passes | `node tools\ig-proto\v4-check.mjs run --task V4-S2P --step parity-fr-ps --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-ps.json` | 12 | 2 | 17.8 | 22.3 |
| `receipt-fr-ps` | unlocked | `node tools\ig-proto\v4-check.mjs receipt --kind parity --task V4-S2P --step parity-fr-ps --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-ps.json --arm fr-ps --require-pass` |  |  |  |  |
| `accept-fr-ps` | unlocked | `node tools\ig-proto\v4-check.mjs accept --task V4-S2P --step parity-fr-ps --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-ps.json --receipt docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-ps.receipt.json --binding docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-ps.accepted.json --by V4-S2` |  |  |  |  |
| `parity-fr-p5` | locked, P-1 passes | `node tools\ig-proto\v4-check.mjs run --task V4-S2P --step parity-fr-p5 --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-p5.json` | 12 | 2 | 17.8 | 22.3 |
| `receipt-fr-p5` | unlocked | `node tools\ig-proto\v4-check.mjs receipt --kind parity --task V4-S2P --step parity-fr-p5 --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-p5.json --arm fr-p5 --require-pass` |  |  |  |  |
| `accept-fr-p5` | unlocked | `node tools\ig-proto\v4-check.mjs accept --task V4-S2P --step parity-fr-p5 --manifest tools\ig-proto\plans\items\V4-S2P.parity-fr-p5.json --receipt docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-p5.receipt.json --binding docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-p5.accepted.json --by V4-S2` |  |  |  |  |
| `rows-fr-base-pilot-26x26-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-base --shard pilot-26x26-hell-1 --variant fr-base --workers 4 --cases 26x26-hell-1:0-4 --row-limit-s 260` | 5 | 2 | 18.4 | 23.0 |
| `rows-fr-base-pilot-20x20-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-base --shard pilot-20x20-hell-1 --variant fr-base --workers 4 --cases 20x20-hell-1:0-4 --row-limit-s 260` | 5 | 2 | 23.2 | 29.0 |
| `rows-fr-ps-pilot-26x26-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-ps --shard pilot-26x26-hell-1 --variant fr-ps --workers 4 --cases 26x26-hell-1:0-4 --row-limit-s 260` | 5 | 2 | 18.4 | 23.0 |
| `rows-fr-ps-pilot-20x20-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-ps --shard pilot-20x20-hell-1 --variant fr-ps --workers 4 --cases 20x20-hell-1:0-4 --row-limit-s 260` | 5 | 2 | 23.2 | 29.0 |
| `rows-fr-screen-pilot-10x10-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-screen --shard pilot-10x10-nightmare --variant fr-screen --workers 4 --cases 10x10-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 3.4 | 4.2 |
| `rows-fr-screen-pilot-12x12-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-screen --shard pilot-12x12-nightmare --variant fr-screen --workers 4 --cases 12x12-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 7.7 | 9.7 |
| `rows-fr-screen-pilot-14x14-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-screen --shard pilot-14x14-nightmare --variant fr-screen --workers 4 --cases 14x14-nightmare:0-4 --row-limit-s 260` | 5 | 2 | 16.8 | 21.0 |
| `rows-fr-screen-pilot-15x15b10-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-screen --shard pilot-15x15b10-nightmare --variant fr-screen --workers 4 --cases 15x15b10-nightmare:0-4 --row-limit-s 260` | 5 | 2 | 14.8 | 18.5 |
| `rows-fr-screen-pilot-16x16-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-screen --shard pilot-16x16-nightmare --variant fr-screen --workers 4 --cases 16x16-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 11.1 | 13.8 |
| `rows-fr-screen-pilot-15x20-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-screen --shard pilot-15x20-nightmare --variant fr-screen --workers 4 --cases 15x20-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 7.6 | 9.5 |
| `rows-fr-screen-pilot-26x26-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-screen --shard pilot-26x26-nightmare --variant fr-screen --workers 4 --cases 26x26-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 2.8 | 3.5 |
| `rows-fr-screen-pilot-26x26-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-screen --shard pilot-26x26-hell-1 --variant fr-screen --workers 4 --cases 26x26-hell-1:0-4 --row-limit-s 260` | 5 | 2 | 18.4 | 23.0 |
| `rows-fr-none-pilot-10x10-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-none --shard pilot-10x10-nightmare --variant fr-none --workers 4 --cases 10x10-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 3.4 | 4.2 |
| `rows-fr-none-pilot-12x12-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-none --shard pilot-12x12-nightmare --variant fr-none --workers 4 --cases 12x12-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 7.7 | 9.7 |
| `rows-fr-none-pilot-14x14-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-none --shard pilot-14x14-nightmare --variant fr-none --workers 4 --cases 14x14-nightmare:0-4 --row-limit-s 260` | 5 | 2 | 16.8 | 21.0 |
| `rows-fr-none-pilot-15x15b10-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-none --shard pilot-15x15b10-nightmare --variant fr-none --workers 4 --cases 15x15b10-nightmare:0-4 --row-limit-s 260` | 5 | 2 | 14.8 | 18.5 |
| `rows-fr-none-pilot-16x16-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-none --shard pilot-16x16-nightmare --variant fr-none --workers 4 --cases 16x16-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 11.1 | 13.8 |
| `rows-fr-none-pilot-15x20-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-none --shard pilot-15x20-nightmare --variant fr-none --workers 4 --cases 15x20-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 7.6 | 9.5 |
| `rows-fr-none-pilot-26x26-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-none --shard pilot-26x26-nightmare --variant fr-none --workers 4 --cases 26x26-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 2.8 | 3.5 |
| `rows-fr-none-pilot-26x26-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-none --shard pilot-26x26-hell-1 --variant fr-none --workers 4 --cases 26x26-hell-1:0-4 --row-limit-s 260` | 5 | 2 | 18.4 | 23.0 |
| `rows-fr-c4-pilot-14x14-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-c4 --shard pilot-14x14-nightmare --variant fr-c4 --workers 4 --cases 14x14-nightmare:0-4 --row-limit-s 260` | 5 | 2 | 16.8 | 21.0 |
| `rows-fr-c4-pilot-26x26-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-c4 --shard pilot-26x26-nightmare --variant fr-c4 --workers 4 --cases 26x26-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 2.8 | 3.5 |
| `rows-fr-base-pilot-14x14-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-base --shard pilot-14x14-nightmare --variant fr-base --workers 4 --cases 14x14-nightmare:0-4 --row-limit-s 260` | 5 | 2 | 16.8 | 21.0 |
| `rows-fr-base-pilot-26x26-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-base --shard pilot-26x26-nightmare --variant fr-base --workers 4 --cases 26x26-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 2.8 | 3.5 |
| `rows-fr-close-pilot-12x12-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-close --shard pilot-12x12-nightmare --variant fr-close --workers 4 --cases 12x12-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 7.7 | 9.7 |
| `rows-fr-close-pilot-14x14-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-close --shard pilot-14x14-nightmare --variant fr-close --workers 4 --cases 14x14-nightmare:0-4 --row-limit-s 260` | 5 | 2 | 16.8 | 21.0 |
| `rows-fr-close-pilot-26x26-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-close --shard pilot-26x26-hell-1 --variant fr-close --workers 4 --cases 26x26-hell-1:0-4 --row-limit-s 260` | 5 | 2 | 18.4 | 23.0 |
| `rows-fr-base-pilot-12x12-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-base --shard pilot-12x12-nightmare --variant fr-base --workers 4 --cases 12x12-nightmare:0-4 --row-limit-s 260` | 5 | 1 | 7.7 | 9.7 |
| `rows-fr-base-pilot-24x24-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-base --shard pilot-24x24-hell-1 --variant fr-base --workers 4 --cases 24x24-hell-1:0-4 --row-limit-s 260` | 5 | 1 | 13.0 | 16.3 |
| `rows-fr-base-pilot-14x14-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-base --shard pilot-14x14-hell-1 --variant fr-base --workers 4 --cases 14x14-hell-1:0-4 --row-limit-s 260` | 5 | 1 | 13.0 | 16.3 |
| `rows-fr-p5-pilot-14x14-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-p5 --shard pilot-14x14-nightmare --variant fr-p5 --workers 4 --cases 14x14-nightmare:0-4 --row-limit-s 260` | 5 | 2 | 16.8 | 21.0 |
| `rows-fr-p5-pilot-26x26-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-p5 --shard pilot-26x26-hell-1 --variant fr-p5 --workers 4 --cases 26x26-hell-1:0-4 --row-limit-s 260` | 5 | 2 | 18.4 | 23.0 |
| `rows-fr-p5-pilot-20x20-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-S2 --arm fr-p5 --shard pilot-20x20-hell-1 --variant fr-p5 --workers 4 --cases 20x20-hell-1:0-4 --row-limit-s 260` | 5 | 2 | 23.2 | 29.0 |
| `publish-fr-base` | unlocked | `node tools\ig-proto\arm.mjs publish --task V4-S2 --arm fr-base` |  |  |  |  |
| `publish-fr-screen` | unlocked | `node tools\ig-proto\arm.mjs publish --task V4-S2 --arm fr-screen` |  |  |  |  |
| `publish-fr-none` | unlocked | `node tools\ig-proto\arm.mjs publish --task V4-S2 --arm fr-none` |  |  |  |  |
| `publish-fr-close` | unlocked | `node tools\ig-proto\arm.mjs publish --task V4-S2 --arm fr-close` |  |  |  |  |
| `publish-fr-c4` | unlocked | `node tools\ig-proto\arm.mjs publish --task V4-S2 --arm fr-c4` |  |  |  |  |
| `publish-fr-ps` | unlocked | `node tools\ig-proto\arm.mjs publish --task V4-S2 --arm fr-ps` |  |  |  |  |
| `publish-fr-p5` | unlocked | `node tools\ig-proto\arm.mjs publish --task V4-S2 --arm fr-p5` |  |  |  |  |
| `kernel-counters` | locked, probes | `node tools\ig-proto\kernel-probe.mjs counters --task V4-S2K --cases 10x10-nightmare,12x12-nightmare,14x14-nightmare,26x26-nightmare,26x26-hell-1` | 30 | 1 | 1.8 | 2.3 |
| `kernel-profile` | locked, probes | `node tools\ig-proto\kernel-probe.mjs profile --task V4-S2K --cases 14x14-nightmare,26x26-nightmare` | 2 | 1 | 1.0 | 1.3 |
| `kernel-report` | unlocked | `node tools\ig-proto\kernel-probe.mjs report --task V4-S2K` |  |  |  |  |
| `width` | locked, probes | `node tools\ig-proto\width-probe.mjs run --task V4-S2W --cases 26x26-nightmare,14x14-nightmare --rounds 3` | 8 | 1 | 2.4 | 2.9 |
| `width-report` | unlocked | `node tools\ig-proto\width-probe.mjs report --task V4-S2W` |  |  |  |  |
| `firewall-check` | unlocked | `node tools\ig-proto\firewall.mjs check --task V4-S2` |  |  |  |  |

### V4-LIVE (blocked by N-V4-03, N-V4-13)

Prerequisites (the first step, `prerequisites`, refuses the plan until they hold):

- the variant `fr-frozen` exists
- the file `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` exists
- the file `tools/ig-proto/live-deadline.mjs` exists
- the accepted binding `docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json` (today's trees compared for `v4`)

| Step | Kind | Command | Units | Invocations | Projected (min) | Guard (min) |
|---|---|---|---:|---:|---:|---:|
| `prerequisites` | unlocked | `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-LIVE` |  |  |  |  |
| `firewall-snapshot` | unlocked | `node tools\ig-proto\firewall.mjs snapshot --task V4-LIVE` |  |  |  |  |
| `trees` | unlocked | `node tools\ig-proto\lib\tree.mjs build fr-frozen` |  |  |  |  |
| `rows-fr-frozen-live-14x14-nightmare` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-LIVE --arm fr-frozen --shard live-14x14-nightmare --variant fr-frozen --workers 4 --cases 14x14-nightmare:0-4 --row-limit-s 260` | 5 | 2 | 16.8 | 21.0 |
| `rows-fr-frozen-live-26x26-hell-1` | locked, request rows | `node tools\ig-proto\arm.mjs run --task V4-LIVE --arm fr-frozen --shard live-26x26-hell-1 --variant fr-frozen --workers 4 --cases 26x26-hell-1:0-4 --row-limit-s 260` | 5 | 2 | 18.4 | 23.0 |
| `publish-fr-frozen` | unlocked | `node tools\ig-proto\arm.mjs publish --task V4-LIVE --arm fr-frozen` |  |  |  |  |
| `live-receipt` | unlocked | `node tools\ig-proto\live-deadline.mjs receipt --task V4-LIVE --require-pass` |  |  |  |  |
| `accept-live` | unlocked | `node tools\ig-proto\v4-check.mjs accept --task V4-LIVE --receipt docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json --binding docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json --by V4-LIVE` |  |  |  |  |
| `firewall-check` | unlocked | `node tools\ig-proto\firewall.mjs check --task V4-LIVE` |  |  |  |  |

### Plans written later

- `V4-S4`: `manifest.mjs activate` (T11e) writes the activation record, `plans\V4-S4.json` and `plans\V4-S4C.template.json` once, on the owner's authorization; then `approval --plan V4-S4`. Its prerequisites are N-V4-03's variants and freeze file, the accepted stage-1, P-0 and live-deadline bindings.
- `V4-S4C`: `manifest.mjs resolve-comparators` (T11f) writes it from the final class selection; then `approval --plan V4-S4C`.
- `V4-S4X` and `V4-S4XC`: the template `plans\V4-S4X.template.json`; N-V4-04 gives them their own activation, selection, comparators and verdict.

### The named items that unblock them

| Item | Provides | Unblocks |
|---|---|---|
| N-V4-03 | stage 3, the freeze: the four stage-4 variants and `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` | `V4-LIVE`, `V4-S4` |
| N-V4-13 | the live request deadline in the prototype and the live-deadline receipt (`tools/ig-proto/live-deadline.mjs`, its accepted binding) | `V4-LIVE`, `V4-S4` |
| N-V4-04 | stage 5 (separately approved) and the second validation: its bounded schedule, its price and its adoption record | stage 5, `V4-S4X`, `V4-S4XC` |
| N-V4-01 | the browser calibration: the runner of its browser parts, enumerated and priced | the browser calibration |

## 4. Seeds, limits, concurrency and rules

- Seeds (the matrix data file): pilots reps 0 to 4 (fitting seeds, by design), the live receipt reps 0 to 4, validation reps 20 to 39, Master identity reps 20 to 24, the paired factor reps 20 to 24, the second validation reps 40 to 59. Row limits: 260 s by default, 130 s only for the stage-4 groups of the arms with the live deadline; 4 workers per request row.
- Concurrency: one locked invocation at a time on this machine, under the lock helper, of at most 900 s; timed requests sequential at four workers; a quiet period of 15 s under the owner's idle declaration, else 45 s; Sudoku's difficulty-v3 keeps priority (the owner's lock rules of 2026-11-17 21:33, check-list §3.2).
- Stopping (plan §5.1, verbatim): **Stopping.** A cell's gate verdict is settled at its third request that fails to reach ten; the remaining seeds still run if the cell's budget allows. In a screen class both arms run all 20 seeds on every cell: a third failure settles that arm's completion verdict only and ends the sampling of neither arm (IG-P-Q32). Each task has a ceiling; a task that reaches it is reported as incomplete and never extrapolated.
- Resume: a stopped plan resumes only after a ruling, with `-Only` from the stopped step on; a done step, a passing receipt and an existing binding are never run again (check-list §3.2; ruling of 2026-11-17 on T11d).
- The verdict recipe (plan §5.2): `verdicts.mjs`, resample seed 20261116, 10,000 resamples.
- Completion apart from the deadline (D-V4-16): a valid request completes when it holds ten puzzles, whatever its time; a response after 120 s is a deadline violation, reported apart and enforced by the live-deadline receipt (N-V4-13).
- The work rule (IG-P-Q37, D-V4-17): judged on the proved intervals and reported with the completed-unit ratio; it adds no timed run.
- P5's false stops are counted against the uncapped comparator over the declared pairs (P-OD12, DR-O11, T09d).

## 5. The browser calibration (optional)

A separate option with its own approval (N-V4-01), never part of the frozen round's plans. B-1 compares today's generator in Node and in a browser with matching source and matching observers; its result is labelled a **bench-page factor**, not a measured Generator-page response with prefetch.

- **B-1, Node part (priced).** The frozen `base` tree, rows of the arm `base` on `10x10-nightmare`, `12x12-nightmare`, `26x26-nightmare`, `14x14-master`, reps 0 to 4, row limit 260 s, four workers, no observers, journal or Generation steps prefetch, each row at the planning projection of its cell, priced by `stepPrice`:

| Cell | Rows | Row (s) | Invocations | Projected (min) | Guard (min) | Ceiling (min) |
|---|---:|---:|---:|---:|---:|---:|
| 10x10-nightmare | 5 | 31.3 | 1 | 3.4 | 4.2 | 79 |
| 12x12-nightmare | 5 | 83.5 | 1 | 7.7 | 9.7 | 79 |
| 26x26-nightmare | 5 | 24.0 | 1 | 2.8 | 3.5 | 79 |
| 14x14-master | 5 | 3.5 | 1 | 1.1 | 1.3 | 79 |
| **Node part** | 20 | | 4 | 15.0 | 18.7 | 315 |

- **B-1, browser part (unpriced).** The bench page served from the frozen snapshot, on the same requests, seeds, quantities and four workers: `node tools\serve.mjs --root tests\artifacts\ig-proto\frozen-source --port 8091 --prefix /pentomino/`, then `http://127.0.0.1:8091/pentomino/tools/bench/index.html`. Projected 4.5 x the Node part's node seconds (719.4 s), that is 3,237.2 s (54.0 min): a projection with the planning factor 4.5, not a measurement. **Ceiling unpriced** until N-V4-01 enumerates that runner.
- **B-2 (unpriced).** the Generator page with its Generation steps prefetch on `10x10-nightmare`, `12x12-nightmare`, `14x14-master` (26x26 exceeds the Generator's 484-cell limit, DR-O16), projected like B-1's browser part from the node seconds of its Node rows (597.3 s): 2,687.7 s (44.8 min). **Ceiling unpriced** until N-V4-01. A separate option: its prefetch state is named, never mixed with B-1's.

## 6. The risks of plan §8 that bear on the price

- Plan §8: **Small samples.** Every gain rests on two to six seeds per cell, one machine and a pre-freeze source. No completion claim or reliable tail exists yet.
  - Bears on the price: the sample is the reps of section 4 and no more: a cell that fails its third request still runs its remaining seeds, so a failure does not shrink the price; more seeds are another price.
- Plan §8: **Browser against Node.** Every number is Node on a server CPU. The factor decides Hell 1, 10x10 and 12x12; only the calibration and the browser runs settle it.
  - Bears on the price: the calibration (section 5) is the only way to settle the factor, and its browser parts are the unpriced items.
- Plan §8: **A per-call budget can lose completions.** MP12b2's false stops are the warning; the arm counts them against the uncapped search before any budget is set.
  - Bears on the price: the uncapped comparator (`V4-S4C`) is priced for exactly this: lost completions are counted against it, over the declared pairs.
- Plan §8: **A screen class can come out inconclusive.** One cell short of 15 matched sets leaves its whole class without the screen, so 14x14 and 15x15b10 may ship at the no-screen times (14x14: x2.6 slower in the provisional pair). The class boundaries fixed at the freeze are the only remedy.
  - Bears on the price: both twins run on every validated cell because the class table is unknown before stage 3 (section 8 gives the second twin's minutes).
- Plan §8: **A second validation is possible** if PM1's Hell 1 output changes P4's table after the freeze.
  - Bears on the price: the second validation is priced as an indication (`V4-S4X`, `V4-S4XC`) and approved with N-V4-04.
- Plan §9: **Replay prefetch.** The Generator replays every new puzzle in the background once a generation ends, and a new request terminates those workers. Browser runs name their harness and keep the prefetch in the same state in both arms. `REPLAY`'s bounds were derived from `gen-v3`; they are re-derived for `gen-v4`, whose replays are measured.
  - Bears on the price: the calibration's bench page runs without prefetch in both arms and B-2 keeps it, so each browser run names its harness (section 5).

## 7. T11b's pricing rules, its ceilings and the overhead assumptions

- The rules (`PRICING`): a horizon of 885 s for every invocation under the owner's 900-s cap, 45 quiet seconds per invocation, a cut margin of 15 s for items, a row margin of 10 s, 2 s of start-up per invocation and 3 s per item group (the pack author's assumptions, D-V4-13), a projection and a guard factor of 1.25 and 1.25.
- The ceilings come from enforced bounds (RV4-05): `units x 945` (900 node seconds and 45 quiet seconds at most per invocation, at most one invocation per row or item), which grew with the cap (it was `units x 345` under the 300-s limit); the binding limit of a run stays its plan's guard, checked before every invocation. A reserve controls admission only and is never a duration or a ceiling.
- 885 s is assumed for every invocation although the runner's `decide` lowers the horizon near the approved cap, which the price does not model; the quiet is counted at 45 s per invocation in every price, although the owner's idle declaration shortens it to 15 s, so the quiet-period component can be lower. Runtime and total cost remain projections (fail-closed): with 15 s throughout, the first approvals' 34.4 h would be 32.4 h.
- The first approvals' set: `V4-S2`, `V4-LIVE`, the initial collection and the four P-1 passes of `V4-S4`: 2,061.8 counted minutes in 236 invocations.
- `factor()` is 1 when the identity file is absent (it is present); a cell without an MP12b1 report is priced at its row limit (20x20-hell-1 today).
- The P-1 passes are priced at their reserves for want of a measured `fr-*` item (T11c's `durationSource` `reserve`: `v4-generate`, `v4-replay`, `v4-select` on `fr-base`, `fr-c4`, `fr-close`, `fr-none`, `fr-p5`, `fr-ps`, `fr-screen`): the 7 of `V4-S2` 124.6 counted minutes, about 31.4 at the `v4` measures of 34.6, 23.6 and 16.3 s per select, generate and replay item (one invocation a pass), so that `V4-S2` would be about 465.9 minutes instead of 559.2; the four of `V4-S4`, priced at its activation, about 71.2 minutes at their reserves (rulings of 2026-11-17: T11c's QUESTION 2 and the owner's lock rules).

## 8. The difference from the plan's indication

The plan's indication for stage 4 is about 3.4 to 4.2 hours (204 to 252 minutes; plan §5.1 "Budget": an indication, not an allocation), the analysts' projection with today's arm only where a gate needs it and Master identity on five seeds. This manifest enumerates the matrix and prices it at today's search times:

| What | Counted minutes | Hours |
|---|---:|---:|
| the initial collection (the validation rows and the comparators) | 1,396.3 | 23.3 |
| the whole universe of stage 4 (the initial collection, the conditional boards, S4-6, the second validation) | 2,417.2 | 40.3 |
| stage 4 with `V4-LIVE` | 2,452.4 | 40.9 |

The causes, each with its minutes (the initial collection, 1,396.3 minutes; the items add up to it):

| Cause | Counted minutes |
|---|---:|
| S4-1: headline: both twins on every failing Nightmare cell | 404.0 |
| S4-2: Hell 1: both twins on every validated Hell 1 board | 192.5 |
| S4-3: controls: both twins and today's arm on every completion-passing Nightmare cell | 277.1 |
| S4-4: Master identity: the frozen arm and today's arm on every Master cell | 41.5 |
| S4-C: comparators: the uncapped search of the arm each cell of S4-1 to S4-3 ships | 481.2 |

Cuts across those items:

| Cause | Counted minutes |
|---|---:|
| both twins on every validated cell: `fr-frozen` | 411.4 |
| both twins on every validated cell: the second twin `fr-frozen-none` | 390.6 |
| the comparator (S4-C), of which on the ten controls 92.4 | 481.2 |
| the ten controls (T11a's ruling of 2026-11-17; 10 cells: both twins and today's arm; their comparators are in the line above) | 277.1 |
| today's arm on the controls (the no-regression ratio) | 92.4 |
| the quiet periods (156 invocations x 45 s) | 117.0 |
| the rows priced at their limit and predicted censored (120 rows) | 298.8 |

Before the owner's lock rules of 2026-11-17 21:33 a group of 260-s rows admitted one row per invocation under the 300-s cap (a horizon of 285 s), so that each row paid a 45-s quiet period: the same request rows of the whole matrix priced 3,604.0 counted minutes in 1,224 invocations, 918.0 of them quiet, stage 4 with `V4-LIVE` 3,091.6. Under the 900-s cap (a horizon of 885 s) rows share invocations: 2,874.7 counted minutes in 293 invocations, 219.8 of them quiet, stage 4 with `V4-LIVE` 2,452.4 and the universe alone 2,417.2.

The conditional saving of N-V4-18, after the freeze and only if that later task is accepted and its activation approved: omitting the duplicate `fr-frozen` request rows of the cells whose provisional class has no screen (plan P2: Hell 1 and Nightmare up to 144 cells) saves 140.8 minutes of the initial collection (60.5 more if the class of 360 cells and more stays without a screen), 99.6 of the conditional boards and 195.9 of the second validation. This manifest prices both twins until then.

The planning projection from today's search times (`1.25 x factor x refS`) is the other cause: a twin whose projection exceeds its 130-s limit is priced at the limit and predicted censored, 120 rows of the initial collection. The figures are a projection from today's search, not the frozen arms' expected time; if the frozen arms were that slow, those requests would fail the completion gate, which is a measurement and not a pricing fault.
