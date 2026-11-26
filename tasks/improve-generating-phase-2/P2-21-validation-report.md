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
  - **Supplemental input** (ruling on P2-21, 2026-11-26, SA-Astra's R21-03): P2-18's committed execution log, solely
    for pre-seal verification results, hashed in the input table.
  - **Transitive input:** `docs/improve-generating-stages-2-4/stage4-report.md`, which `report-B gates.B8` binds;
    hashed after LF normalization, as B8 binds it.
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
| Start, end, duration | 2026-11-26 21:00 +07:00 (request to SA-Opus after P2-20's commit); end 2026-11-26 21:40 +07:00 (commit); about 40 min |
| Waiting for rulings | none from the owner (Q-P2-V1 is raised by this report and answered after it; P2-22 waits for it) |
| Agent id, model | SA-Opus (`claude-opus-5.5`), SA-Astra (`gpt-6-astra`) |
| Calls; input, output and cache-read tokens | SA-Opus e5de0a5f-b2e9-40cc-a148-6e89d41227b4: 57 calls; 32,366,711 input, 174,550 output, 30,101,360 cache-read (includes the P2-20 projection script and the D-P2-18 rebase ruling). SA-Astra 53bbea9e-b968-4aee-b81d-9959756c75a3: 14 calls; 2,631,160 input, 27,482 output, 2,253,422 cache-read |
| AI credits | SA-Opus 2,083.790; SA-Astra 834.914; total 2,918.704 |
| Questions and rulings | SA-Astra review 1: R21-01 (P2-T01 incomplete: one eligible row, shipped/gen-v4/14x14-hell-1/33, without equality evidence; verdict INCOMPLETE), R21-02 (Q-P2-V1 discloses and asks acceptance; P2-22 waits), R21-03 (provenance: P2-18 log as supplemental hashed input; stage4-report.md as B8's transitive LF-normalized input); all applied by SA-Opus, the SAs agree, no supervisor question. Owner instruction (Discord 1575515759550144573): PR #11 merged, rebase PR #14 without merging; SA-Opus ruling D-P2-18 (pack amendment 13a35b8, rebased da6f3d2): the rebase block of check-list §3.7 run once before this commit. Owner question (Discord 1575516817886154843) on re-measuring the row: answered by SA-Opus (short in machine time, not allowed in the sealed campaign, and cannot produce evidence since the frozen side has no set either) |
| Fix rounds | 1 (SA-Astra review 1, then accept) |
| Gates re-run by the orchestrator | G-FORMAT via check-conventions on both files: OK; seal --check OK. Rebase block (D-P2-18): 79 commits replayed onto 626918c, every tree identical, `seal: OK`, hash map 459d482, force-push with lease 7c1bad2...459d482; PR #14 OPEN, draft, base main, head gen-v4 at 459d482, 80 commits; sealed fa0bda2 -> 0320e00 |
| Commit | this commit (improve-generating-phase-2 P2-21: the validation report) |
| Issues and named items | Verdict `Phase 2: INCOMPLETE (P2-B01 to P2-B03, P2-B05 and P2-B06: pass; P2-T01: incomplete—one eligible row without equality evidence; P2-B04: pass; P2-B07: read on 49 of 50 rows, owner continuation recorded)`; owner decision Q-P2-V1 (posted on Discord 1575520365877395496 / 1575520368167354569); the 10x10 Master rep 24 trace gap (investigate the trace tooling); the `require` finding to phase 3 |
