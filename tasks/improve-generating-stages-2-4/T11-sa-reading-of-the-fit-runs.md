# T11: The SAs' reading of `V4-S3P` and `V4-S2B`: the read gate of D-S24-24

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §8.2 T11 and "T11's acceptance and read gate" (verbatim below), §4.3 (the candidate epoch), §4.7 (seeds), §9 (T11's gate); D-S24-19, D-S24-24, D-S24-27; the owner's delegation of 2026-11-23 15:29 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of S03 |
| Depends on | S03 (the 20 published rows, the four bindings), S01 (`s01-reading.md`), T02d (the prefixes record indexes the `.runs.md` it reads; R-P24-05) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | SA-Opus drafts, SA-Astra reviews; one joint note (no production code, no test, no harness edit) |
| Estimate | SAs; machine 0 min (unlocked reads; scratch scripts in the SAs' evidence folders) |

## Goal

Decide, from the 20 uncapped Hell 1 requests and the controls' reading, whether the freeze's bounded configuration
(Hell 1 budget 40 G in both modes, the bound of 4 same-side no-window attempts, the reserve and deadline of
`deadline-s3-v1`, the prior `prior-s3-v1` and the per-set prior on Hell 1) can be recorded as it is (T12a, T12b), or needs a
ruling first.

## Authority and fixed points

The read gate, verbatim from plan §8.2 (D-S24-24):

> The SAs read all 20 valid published rows and their complete worker/link journals against the proposed bounded
> configuration, including losing and terminated calls. The reader accumulates main, census and uniqueness
> units in primitive order. It identifies any recorded next primitive whose selection-call spent total before it is at least
> the proposed budget; a terminated call whose completed spent total already reaches the budget is flagged
> as potentially affected, even without a following begin line. A currently running primitive is not assumed
> cut by P5: the check is between primitives, not inside one.
>
> The reader also tests the first-four same-side no-window condition from the set-call ends and reads the new
> table/per-set-prior transport. It computes the reserve/deadline projection from these new **uncapped**
> timelines, per cell, reporting projected reserve cuts and lost completions separately.
>
> If a budget or attempt bound could affect an observed path, or missing/ambiguous evidence prevents that
> determination, the freeze pauses for an SA ruling. Before accepting affected settings, the SAs specify the
> smallest necessary matched bounded experiment, price it under a new task/manifest and obtain the owner's
> approval. An uncapped prefix identifies risk; it does not identify which best candidate a truncated call
> would return, the changed fold timing, or request-level lost completions.
>
> If no observed path is flagged, the report may say the proposed deterministic limits would not intervene
> at the observed primitive boundaries. It must not call this a measured zero-loss bounded/uncapped comparison
> or a live-deadline proof. V4-LIVE and every declared V4-S4C comparison remain mandatory.

- The SA ruling is joint (SA-Opus and SA-Astra) under the owner's delegation (2026-11-23 15:29, Discord); the owner is
  asked only for a new measured scope (its price and a new task id) or a change of one of his recorded decisions.
- A rejected epoch keeps every record and is replaced under a new identity (plan §4.3; check-list §3.3, which restates
  the full recipe-identity rule of plan §4.3 that any replacement must keep).
- The 20 rows are fitting seeds (reps 0-4, plan §4.7); nothing here reads a validation, Master or second-validation rep.
- **The evidence rule** (SA-Astra's review R03): every declared row/pair must be present, unique, correctly identified
  and valid. Every missing, unexpected, invalid, censored, erroneous, unreadable or ambiguous input is a warning
  requiring an SA ruling. T11 cannot choose (A) from a mere total of 20 rows or 20 complete ledgers.
- **What the row runs record** (SA-Astra's review R16): `arm.mjs` produces row reports and journals, not packs
  (`arm.mjs:176-178,245-291`); the accepted journal payload has board, pieces, clues and rating, not `made`
  (`ig-log.js:222-228`), and publication removes that payload; `priorVerdict` reads `madeRecords` of generation items
  whose pack was saved (`v4-check.mjs:461-518`, `lib/lane-worker.mjs:180-243`), which `V4-S3P`'s request rows are not.

## Scope

- Create (by the reader): `docs/improve-generating/evidence/frozen/V4-S3P/fit-read-prefixes-fr-frozen-none-uncapped.json`
  and `.md`.
- Create (the SAs): `docs/improve-generating-stages-2-4/t11-reading.md`; scratch scripts and their outputs under
  `docs/improve-generating-stages-2-4/evidence/sa-opus/` and `evidence/sa-astra/` (`t11-*.mjs`, `.json`, `.md`).
- Do not change: code, plans, variants, records of runs. Guards: G1, G2.

## Steps

1. **The call prefixes and the bound** (unlocked): `node tools\ig-proto\fit-read.mjs prefixes --task V4-S3P --arm
   fr-frozen-none-uncapped --budget hell-1=40000000000 --bound 4 --label frozen --source-label "frozen 3fc65f4"`. It
   prints `fit-read: wrote docs/improve-generating/evidence/frozen/V4-S3P/fit-read-prefixes-fr-frozen-none-uncapped.json
   (20 rows, <m> missing, <i> incomplete, <a> affected, <p> potentially affected, <q> ambiguous, <b> bound firings)`.
   Every declared row must be present once with `rowStatus` `valid`, `complete` true, `unreadable` false and no
   `problems`; `summary.missing` and `summary.unexpected` must be empty; anything else is a warning (step 5).
2. **The transport** (SA-Opus's scratch `docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport.mjs`, reading the raw journals
   `tests/artifacts/ig-proto/frozen/V4-S3P/fr-frozen-none-uncapped/<shard>/logs/` and the valid published rows): every
   set-stage `start` line has `priorCount` = `clamp(round(share x K), 1, K - 2)` with `prior-s3-v1`'s share of
   `hell-1@<area>` (196, 400, 576, 676: 0.4, 0.368421, 0.219512, 0.2) and its own `K`; the start lines' `W` is
   `DEDUCE.work` (no screen on Hell 1). The batch transport, verbatim from SA-Astra's review R16: "Identify the winning
   set call by the valid row's `run.details.setAttempt`, its matching `set-complete` linkage and its unique set-stage
   start/end. Read its successful rating score and `end.locate.wc`. For a matching Hell 1 calibration, every batch
   start has `priorCount = clamp(wc, 1, K - 2)`; otherwise it has the table prior. Require complete attribution and
   report counts/mismatches per cell. These row runs do not persist candidate `made` records or packs. Report
   stored-recipe transport as not observed in this row dataset; do not apply `priorVerdict` to it or claim a pack check.
   Cite the separate controlled transport/provenance checks for the code path, distinguishing them from request-row
   evidence." (The controlled checks are T08c's `fz: the per-set prior on Hell 1 only (payloads)` and the v4 pack's
   provenance cases.) Counts per cell; any mismatch or unattributed start is a finding. The script writes its input
   index `docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport-inputs.json` (`[{ path, sha256Lf }]` of
   every file it read, `sha256Lf` the SHA-256 of the text with CRLF replaced by LF), which T12a binds, with the script
   itself (`FIT_INPUTS`; SA-Astra's review R2-07).
3. **The projection** (SA-Opus's scratch `docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection.mjs`): per cell, `deadlineProjection(rows.map((r) =>
   ingestRow(r, { quantity: 10 })), { reserve: 0.6, deadlineMs: 115000, quantity: 10 })` (`verdicts.mjs:1332`, `:139`)
   over the published rows; report per cell the rows, `setCut` (projected reserve cuts) and `lost` (projected lost
   completions) apart, and `served` per row; label the table "post-hoc projection (D-V4-08), not a live-deadline proof".
   The script writes its input index `docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection-inputs.json`
   (the same shape), which T12a binds, with the script itself.
4. **The controls** (S01's `s01-reading.md`): restate its warnings and the decisions already taken; nothing new is read
   from `V4-S2B` unless the note named a pending point.
5. **The gate.** Flag every row with an `affected`, `potentially-affected` or `ambiguous` call, every bound firing,
   every missing, unexpected, invalid, censored, erroneous, incomplete, unreadable or ambiguous row or input, every row
   with an identity problem (a non-empty `identity`: a wrong declared identity, a missing or mismatched shard
   declaration or row identity, or a publication whose tree, copy or producer is not the shard's; SA-Astra's review
   R2-03), and every transport mismatch. **Every declared row/pair must be present, unique, correctly identified and valid; T11 cannot
   choose (A) from a mere total of 20 rows or 20 complete ledgers** (R03). Then:
   - **(A) nothing flagged**: the note says "the proposed deterministic limits would not intervene at the observed
     primitive boundaries" with the gate's caveat (not a measured zero-loss comparison, not a live-deadline proof;
     `V4-LIVE` and every declared `V4-S4C` comparison remain mandatory) and accepts the candidate epoch unchanged: T12b
     records T08a's trees;
   - **(B) A correction/refit is proposed** (SA-Astra's review R15, verbatim): "stop; the joint SA ruling names the
     exact correction, its evidence and its replacement epoch/tasks. It does not itself accept settings whose observed
     path remains affected or uncertain. Any change to the owner's recorded 32/40-G `require` policy, allowance or
     approved scope needs his confirmation before it is applied." A replacement epoch follows check-list §3.3's
     recipe-identity rule in full;
   - **(C) A path is affected or the required determination remains missing/ambiguous** (R15, verbatim): "before
     accepting those settings, specify the smallest matched bounded experiment, its cases/reps/arms, new task/manifest
     and price; obtain the owner's approval and execute/read it. An uncapped prefix or a new P-1 proof is not a
     substitute for that comparison."
   "T12 starts only after a jointly signed acceptance of the final epoch and all evidence required by this gate. A
   proposal, new table hash or passing parity proof alone does not authorize freezing." (R15; T12 is now T12a and T12b,
   so the rule binds T12a, which T12b follows.)
6. **The note** `docs/improve-generating-stages-2-4/t11-reading.md` (CRLF, UTF-8 without BOM): the commands and their
   outputs; per cell the table `| Cell | rows | valid | complete | calls | affected | potentially affected | ambiguous |
   max call spent (G) | bound firings |`; every warning with its ruling; the transport counts (with "stored-recipe
   transport not observed in this row dataset"); the projection table; the controls' restatement; the gate verbatim; the
   outcome (A), (B) or (C) with its reason; both SAs' sign-off ("jointly signed acceptance of the final epoch" for (A)).

## Tests

None (a reading). The scratch scripts print their inputs' hashes and are kept with their outputs.

## Documentation

`t11-reading.md`; a line in the orchestrator's progress report.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1's `fit-read.mjs prefixes` | repository root | the `wrote` line; 20 rows | 2 min |
| the SAs' scratch scripts | repository root | their outputs under `evidence/sa-*/` | - |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2 | repository root | print nothing | 1 min |

## Stop points and questions

- **Outcome (B)**: stop the pack at T11; the SAs' ruling (the exact correction, its evidence, the replacement epoch
  and its tasks) goes to the register; the orchestrator re-opens the named tasks under new ids; settings whose observed
  path remains affected or uncertain are not accepted by the ruling itself; the owner confirms first any change of his
  recorded 32/40-G `require` policy, an allowance or an approved scope.
- **Outcome (C)**: STOP for the owner with the priced experiment (minutes, cap on the account, consequence of a no);
  after his approval it is executed and read before any setting is accepted.
- T12a starts only after a jointly signed acceptance of the final epoch and all the evidence this gate requires.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11-B01 | The freeze is recorded only when every declared row and pair is present, unique, identified and valid and the observed uncapped Hell 1 paths show that its limits would not intervene, or after a ruling and, when a path is affected or undetermined, an approved, executed and read matched experiment | `t11-reading.md` | the note |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11-T01 | The prefix record holds one row per declared key (20), each valid with a complete ledger, or every exception is ruled | the `fit-read` JSON's rows and `summary` | the file |
| T11-T02 | The transport (with stored-recipe transport stated as not observed), the projection and the gate's outcome are stated with their numbers and the gate's caveat | the note | the note |
| T11-T03 | No code, plan or run record changed | G1, G2 | empty outputs |

## Checklist (the executor confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green (none: a reading)
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the SAs' reply)

The outcome (A), (B) or (C); the numbers per cell; the files written; the rulings and the questions; the named items.

## Execution log (filled by the orchestrator)

| Item | Value |
|---|---|
| Start, end, duration | |
| Agents, models | |
| Outcome | |
| Rulings (register) and owner questions | |
| Commit | |
| Issues and named items | |
