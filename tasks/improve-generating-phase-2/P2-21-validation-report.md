# P2-21: The validation report

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §6 (acceptance, the phase-2 gate), §7, §8, §10; D-P2-12 |
| Repository, branch, base | `Q:\git\pentomino` (the main worktree), `gen-v4`, P2-20's commit |
| Starts when | P2-20 is committed |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | both SAs, jointly (one drafts, the other reviews until both accept) |
| Estimate | SA work; machine: none (unlocked reads of the published records) |

## Goal

One jointly signed report says whether production `gen-v4` passed the plan's phase-2 gate, with every number traced to
a published record, and names every decision the owner must take before anything ships.

## Authority and fixed points

- The plan's phase-2 gate (plan §6): P2-B01 to P2-B03, P2-B05 and P2-B06, read with P2-T01; P2-B04 and P2-B07 are this
  plan's additions. Hell 1 is reported against 18 of 20, never gated.
- Inputs only: `E/report-smoke/`, `E/report-A/`, `E/report-B/`, `E/proofs/`, `E/replay-probes/`, `E/browser/`,
  `E/twins/`, `E/rows-smoke/`, `E/rows-before-twins/`, `E/rows/`, `E/ledger/ledger.jsonl`, `E/seal/`,
  `stage-a-readout.md`. No new measurement.
- The report binds the exact inputs it read (R3): the SHA-256 of each snapshot's `.jsonl` (its `.sha256` file), of
  `activation.json`, of `seal.json` and of each `report.json`, in a table at its end.
- Missing data is incomplete, never a pass; zero reach is "unexercised".

## Scope

- Create `docs/improve-generating-phase-2/validation-report.md` (and `validation-report.json` with the gate table).

## Steps

1. Sections: summary (at most 10 lines: the gate verdict, the decisions needed); equality (P2-T01, per arm and cell);
   each business gate P2-B01 to P2-B08 with its rows and numbers; (c5) for `n-mid` (P2-B05); population (P2-B06,
   paired and historical labelled); `require` (P2-B07, N-V4-15); Hell 1 report; P5 (§7.5's categories); N-V4-16 glue;
   reach F2/F4/F7; replay margins (P2-T11); memory (P2-T12); browser checks; the ledger account (A and B: spent,
   authorized, remaining); deviations; named items for later; owner decisions needed (each with options and the SAs'
   recommendation, written as a clarification for the analyze procedure).
2. Every number cites its record path and field.
3. The input table of the authority section, with each path and SHA-256.
4. Sign-off lines: SA-Opus, SA-Astra, each "accept" with the date.

## Tests

The cross-review of the other SA.

## Documentation

The report.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| G-FORMAT on the two files | §3.4 | `format: OK` | 1 min |

## Stop points and questions

- A gate failing or incomplete: the report recommends; the owner decides (plan §7.6). The orchestrator relays the
  owner question; P2-22 waits for the answer when it changes what is published.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-21-B01 | The owner can see in one page whether `gen-v4` may ship and what is open | the summary | report |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-21-T01 | Every number traced; missing data incomplete; zero reach unexercised | the other SA's review | review record |

## Checklist

- [ ] Both SAs accept
- [ ] Every number cites its record
- [ ] Owner decisions written as clarifications

## Final report

The gate verdict line; the owner decisions needed.

## Execution log

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | SA-Opus (`claude-opus-5.5`), SA-Astra (`gpt-6-astra`) |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |
