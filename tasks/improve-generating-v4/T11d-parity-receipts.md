# T11d: Parity and P-0 receipts with required passes, and their accepted bindings

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 ("Parity passes": "the puzzles, work units and skip ordinals are equal with observers absent, with `charge` alone and with `record` and `charge`"; the P-0 re-check on the final trees), §6 ("Observers"); decisions D-V4-14, D-V4-18, D-V4-19; review RV1-06 (R06), RV1-17, RV2-09, RV2-11, RV3-02 (R3-02), RV3-06, RV4-03 (R4-03), RV4-08, RV5-03 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11h |
| Depends on | T11c (the plans name these commands; T11h runs between the two, serial order); T04c (`expandManifest`, `parityVerdict`, `replayVerdict`), T04d (`stepEvidence`, `proofEnvelope`), T04f (`accept`, `acceptedBinding`, `checkAccepted`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3.5 h (3 h, then a fix round of 0.5 h after its report: ruling of 2026-11-17), machine 0 min (synthetic step folders; nothing locked runs here) |

## Goal

Every arm used later needs a typed parity receipt, and `v4` needs a proof that its stage-1 results still hold on the
final trees. This task writes the two receipt kinds the plans call, `parity` (P-1) and `p0-identity` (P-0), a
required-pass mode that stops a plan at a failed or incomplete proof after writing its evidence, and the accepted
bindings of both kinds, so that later gates check them without trusting the receipts' own claims.

## Authority and fixed points

- Review R3-02 (accepted): "Compare old/new observations by `(variant, caseId, seedText, mode)`, not the
  storage-namespace item ID. For every declared absent-mode comparison, require a present, completed observation with
  a string `result.digest` on each side and compare that digest. Do not compare `eventsDigest`: it is null in absent
  mode. Check the effective input/parameter binding and record both historical and new identities without
  relabelling either." "Give this receipt `kind: 'p0-identity'`; it requires the parity block and the
  baseline-result comparison, not a new generation/replay block that its manifest does not contain. Its arm bindings
  cover all variants actually observed. Ordinary P-1 receipts continue to require both parity and replay." "Add a
  `--require-pass` receipt/gate mode that writes the evidence first and exits nonzero for `fail` or `incomplete`."
- After stage 1 the harness work of T05 to T10 moves the `v4`-family tree ids (T07a: `v4` `006431d6...` to
  `61729ef5...`) while the parameters stay (D-V4-05); `check-binding --current v4` against the stage-1 binding is then
  `stale arm v4` by design. The stage-1 binding is declared with `current: []` by every consumer; `p0-identity`
  compares results and parameter hashes, never tree ids, and the P-0 binding names today's final trees.
- The baseline is read only through the stage-1 accepted binding (T04f): `checkAccepted` re-hashes the stage-1
  receipt and every evidence file it lists (the stage-1 parity step's `state.json` and `items.jsonl` among them), so
  the historical rows are read without comparing their trees with today's (`historical: true` below). `v4.json` and
  the parameter files of the stage-1 variants do not change after stage 1 (T05 to T08 guard them), so the
  parameters of every observed variant must equal those the stage-1 binding captured.
- R06 and R2-14: the block rules are T04c's `parityVerdict` and `replayVerdict`, unchanged.
- D-V4-18 and RV3-06: an accepted binding's expectation comes from the step's stored identity and its manifest, never
  from the receipt.

## Scope

- Change: `tools/ig-proto/v4-check.mjs` (`stepEvidence`'s option, the subcommand `receipt`, the kinds `parity` and
  `p0-identity` of `accept`; steps 1 to 4), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T04c's section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T11d --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib tools/ig-proto/plans tools/ig-proto/data docs/improve-generating/evidence`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T11d --label frozen`.
1. **Captured inputs** (R4-03, as T04d's for stage 1): `captureStepInputs(T, S, identity)` writes, before the receipt,
   `docs/improve-generating/evidence/frozen/<T>/inputs/<S>/<variant>.ig-tree.json` for every variant of
   `identity.treeIds` (the current `readTreeInfo(variant)` when its `treeId` equals the stored id, else no copy and
   the reason `stale tree <variant> (<stored> vs <current>)`) and `inputs/<S>/harness.json` (`harnessInfo()` when its
   `harnessHash` equals `identity.harnessHash`, else no copy and the reason `producer changed since the
   observation`), and returns `{ copies: { <variant>: <the copy> }, reasons }`. `stepEvidence`'s option `historical`
   is T04f's. `isV4(variant)` in this task is `(v) => v !== 'base'`: every variant of the parity manifests other than
   `base` (`v4`, `v4-w760`, `v4-w095`, `v4-w380`, the `fr-*` arms of T08) has `v4` in its chain, so the routes and
   the manifest hash equal those of the run, without reading a tree folder.
2. **`baselineVerdict(rows, baseRows, params)`** (pure export): `key(r) = r.variant + '|' + r.caseId + '|' +
   r.seedText + '|' + r.mode`; for every row of `rows` with mode `absent`: no row of `baseRows` with its key: `fail`
   (`no baseline for <key>`); either row not `completed`, or either `result.digest` not a string: `incomplete` (`no
   result digest for <key> (<now|baseline>)`); different digests: `fail` (`result changed <key>`). `params` is `[{
   variant, now, baseline }]` (parameter hashes; `baseline` `null` when the binding lacks the variant): `baseline ===
   null`: `fail` (`no baseline parameters for <variant>`); `now !== baseline`: `fail` (`parameters changed
   <variant>`). Returns `{ verdict, reasons, rows: [{ key, now, baseline, equal }] }` (`fail` wins over
   `incomplete`).
3. **`receipt --kind <parity | p0-identity> --task <T> --step <S> --manifest <M> --arm <A> [--baseline <binding>]
   [--require-pass] --label frozen --source-label <SL>`**: a missing option, another kind, or `p0-identity` without
   `--baseline`: stderr and exit 1, nothing written. Else:
   - `ev = stepEvidence(T, S, M, isV4)`; its problems make the receipt `incomplete` with them as reasons.
   - Blocks: `parity = parityVerdict(ev.rows.filter((row) => row.mode !== null))` (the selection rows: a P-1 manifest also
     holds its generation item and its replays, which carry no mode and no route and which `parityVerdict` would put
     in a failing group of unknown routes; stage 1's parity step held selection rows only; ruling of 2026-11-17,
     T11d's QUESTION 1); kind `parity`: `replay = replayVerdict(ev.rows)` (it reads the generation and replay rows
     only); kind `p0-identity`:
     `binding = JSON.parse(readRepoFile(<baseline>))` and `bcheck = checkAccepted(binding, { current: [] })`; when
     `bcheck` is not `pass`, `baseline` is `{ verdict: 'incomplete', reasons: ['baseline binding: ' + <its reasons>],
     rows: [] }`; else `base = stepEvidence('V4-T04', 'parity', 'tools/ig-proto/plans/V4-T04.parity.json', isV4, {
     historical: true })` and `baseline = baselineVerdict(ev.rows, base.rows, <for each variant of ev.identity.treeIds:
     { variant, now: sha256(JSON.stringify(copies[variant].params)), baseline: binding.params[variant] === undefined ?
     null : sha256(JSON.stringify(binding.params[variant])) }>)` (a variant without a copy: `now` `null`, so the
     pair fails as `parameters changed <variant>`).
   - Arms: every variant of `ev.identity.treeIds` (all observed variants), `{ id, treeId: <stored>, paramsHash:
     sha256(JSON.stringify(copies[id].params)) }`; the reasons of `captureStepInputs` make the receipt `incomplete`.
   - `verdict`: `fail` when a block fails; else `incomplete` when a block or `ev` is incomplete; else `pass`.
   - It writes `docs/improve-generating/evidence/frozen/<T>/<S>.receipt.json` = `proofEnvelope({ kind, verdict, source:
     { frozenCommit: FROZEN_COMMIT, sourceDigest: ev.identity.sourceDigest }, harnessHash: ev.identity.harnessHash, arms,
     coverage: { expected: <the ids of expandManifest(M, ...)>, observed: <ids with an item-end of status completed>,
     missing: <expected less observed>, censored: <ids ended censored> }, evidence: [<the step's items.jsonl>, <its
     state.json>, <M>, <every captured copy and harness.json>, and for p0-identity <the baseline binding> and <the
     stage-1 parity items.jsonl>], fields: {
     blocks: { parity: <verdict>, <replay or baseline>: <verdict> }, details: { parity, <replay or baseline> },
     identities: { now: ev.identity, baseline: <base.identity for p0-identity, else null> }, reasons: <ev's problems,
     then `'<block>: <reason>'` for each reason of a block that is not `pass`; `[]` on `pass`: `proofCheck` reports
     them for a failing receipt, T04d> } })` (repository-relative
     paths, `sha256File`), and prints `receipt: <kind> <verdict> -> <path>`.
   - `--arm` must name one of the observed variants, else the receipt is `incomplete` with the reason `arm <A> is not
     among the observed variants (<ids>)` (ruling of 2026-11-17, T11d's QUESTION 2).
   - A passing receipt is written once (ruling of 2026-11-17, T11d's QUESTION 3; check-list §3.3, as T09e's decided
     records and T04f's bindings): before it builds anything or captures an input, the command reads the receipt path
     `evidence/frozen/<T>/<S>.receipt.json`; an existing file that does not parse as a JSON object with a string
     `verdict` is refused (`v4-check: an unreadable receipt exists: <path>`, exit 1) and one whose `verdict` is `pass`
     is refused (`v4-check: receipt <path> exists (a passing receipt is never rewritten)`, exit 1), `<path>`
     repository-relative; a refusal writes nothing, so the receipt, its captured inputs and an accepted binding that
     hashes them stay as they were. A receipt of another verdict is replaced (case 4); a resumed plan names no receipt
     step that has passed (check-list §3.2).
   - Exit: 0 when written; with `--require-pass`, 2 when the verdict is not `pass` (the receipt is written first).
4. **`accept`** gains the kinds `parity` and `p0-identity` (T04f's dispatch on the receipt's `kind`; `--step` and
   `--manifest` required for them, else exit 1): `stepExpectation(T, S, M, kind)` returns `{ harnessHash, arms, params,
   coverage, fields }` from `stepEvidence(T, S, M, isV4, { historical: true })` (RV5-03: no current-tree comparison;
   every manifest, log and source check stays; its problems: `accept: <problem>`, exit 1): `harnessHash` the
   stored `identity.harnessHash`; `arms` and `params` from the captured copies of step 1 by T04f's rule (each copy's
   `treeId` must equal the stored id; no tree folder is read);
   `coverage` the manifest's item ids; `fields` `{ blocks: { parity: 'pass', replay: 'pass' } }` for `parity` and `{
   blocks: { parity: 'pass', baseline: 'pass' } }` for `p0-identity`. Another kind: `v4-check: accept knows the kinds
   stage1, parity, p0-identity` (exit 1; N-V4-13 adds `live-deadline`).
5. **Self-test** cases appended to `--items` (Tests table); **README.md**: T04c's section gains the two receipt
   kinds, the semantic join, `--require-pass`, the write-once rule of a passing receipt (step 3) and the bindings of
   both kinds.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, on synthetic step folders written under `artifactDir('frozen',
'V4-T11d-selftest', <step>)` (a manifest, a `state.json` whose identity carries `manifestHash(expandManifest(...))`,
`FROZEN_COMMIT`, `FROZEN_DIGEST`, the tree ids `(await ensureTree('v4')).treeId` and `(await
ensureTree('base')).treeId`, `harnessHash: harnessInfo().harnessHash`, and an `items.jsonl` with one `item-start` and
`item-end` per item); `rowOf(variant, caseId, seedText, mode, digest)` builds a completed row whose `result` has
`digest` and `eventsDigest: null`. Both folders, `artifactDir('frozen', 'V4-T11d-selftest')` and
`evidenceDir('frozen', 'V4-T11d-selftest')`, are deleted at the end of each case.

| Case name | Input | Expected |
|---|---|---|
| `receipt: absent digests decide, not event digests` | `baselineVerdict` with now and baseline rows of the same four keys, all `eventsDigest` null, one `result.digest` different; `params` equal | `fail`, `result changed v4\|12x12-nightmare\|ig-v4/parity/12x12-nightmare\|absent` |
| `receipt: storage ids do not matter` | the same rows, every digest equal, the baseline item ids `parity:...` and the new ids `p0-v4:...` | `pass`; four rows with `equal: true` |
| `receipt: a missing baseline fails closed` | (a) one new absent row without a baseline row; (b) a new row whose `result.digest` is `undefined`; (c) `params` with `baseline: null` for `v4` | (a) `fail`, `no baseline for <key>`; (b) `incomplete`, `no result digest for <key> (now)`; (c) `fail`, `no baseline parameters for v4` |
| `receipt: a required pass stops the plan` | `main(['receipt', '--kind', 'parity', '--task', 'V4-T11d-selftest', '--step', 'p', '--manifest', <its manifest>, '--arm', 'v4', '--label', 'frozen', '--source-label', 'x', '--require-pass'])` on a step whose parity block fails; then the same without `--require-pass` | returns 2 and the receipt exists with `verdict: 'fail'`; then returns 0 |
| `receipt: each kind has its blocks` | kind `parity` on the rows of a P-1 manifest (selection, generation and replay items) whose selection rows pass parity and whose generation case has no matched candidate replay; kind `p0-identity` on rows whose parity and baseline pass and that have no replay item | `parity`: `incomplete` (`no matched candidate replay ...`); `p0-identity`: `pass`, the envelope root's `blocks` with `parity` and `baseline` only |
| `receipt: the stage-1 files keep their hashes` | a `p0-identity` receipt over a synthetic baseline step and binding | `sha256File` of the baseline `items.jsonl`, `state.json` and receipt are equal before and after |
| `accept: a parity binding from the stored identity` | `accept` of a passing synthetic `parity` receipt over the rows of a P-1 manifest (selection, generation and replay items); then of a receipt whose `coverage.expected` and `observed` lack one manifest id | the binding's `expected.coverage.expected` is the manifest's ids and its `fields` the two passing blocks; the second is refused with `accept: incomplete (coverage gap <id>)` (exit 1) |
| `receipt: a passing receipt is written once` | (a) `main(['receipt', '--kind', 'parity', ...])` on a synthetic step whose blocks pass, returning 0; the text `marker` written over `inputs/<step>/harness.json`; the same command again; (b) the receipt file's text replaced by `{`, the same command again (a `fail` receipt is replaced: case 4) | (a) returns 1, stderr `v4-check: receipt <path> exists (a passing receipt is never rewritten)`, the receipt's `sha256File` equal before and after and `harness.json` still `marker`; (b) returns 1, stderr `v4-check: an unreadable receipt exists: <path>`, the file still `{` |

## Documentation

`tools/ig-proto/README.md` (step 5).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11d` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T11d --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a block rule of T04c or a comparison key.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11d-B01 | P-0 proves that `v4`'s stage-1 results hold on the final trees by the results themselves, with the same inputs and parameters, and fails closed on a missing baseline | cases 1 to 3 and 6 | self-test output |
| T11d-B02 | A required proof that fails or is incomplete stops its plan after writing its evidence | case 4 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11d-T01 | Each receipt kind requires exactly its blocks | case 5 | self-test output |
| T11d-T02 | Bindings of both kinds come from the stored identity and the manifest | case 7 | self-test output |
| T11d-T03 | Nothing else changed; formats | guards; `npm run check` | command output |
| T11d-T04 | A passing receipt is written once; an unreadable one is refused; a refusal writes nothing | case 8 | self-test output |

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
| Start, end, duration | 2026-11-17 23:04:40 +07:00 (dispatch, base `e3044a9`) to 23:44:41 +07:00 (acceptance): 40 min 1 s; the developer's own times 23:04:37-23:27:16 and, in the fix round, 23:40:52-about 23:43 |
| Waiting for rulings | about 13 min (SA-Opus's ruling, 23:27-23:40) |
| Agent id, model | `1d3a8acd-d856-4df2-846c-e5ecf67f2178`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 110 calls; 31,092,671 input, 182,889 output, 30,248,902 cache-read |
| AI credits | 696.31 |
| Questions and rulings | Q1: step 3's `parityVerdict(ev.rows)` fails every P-1 manifest that mixes select and generation rows (`rows of mixed or unknown routes`), so every `receipt-<arm>` would fail; ruled default (a): the parity block reads the selection rows only, T04c unchanged. Q2: `--arm` must be an observed variant, else `incomplete` (default (b)). Q3 changed by the ruling: a passing receipt is written once (an existing passing or unreadable receipt is refused with exit 1, nothing written). Named item 1: check-list §3.2 gains a resume rule (a stopped plan resumes only after a ruling, with `-Only`; a done locked step is never re-run). Deviations, readings, named item 2 and gaps accepted. Pack amendment `330a9d6` (T11d 3.5 h, pack 104 h) |
| Fix rounds | 1 (a passing receipt is written once; one case; README) |
| Gates re-run by the orchestrator | `--items`: 174 passed, 0 failed (31.013 s; the twelve receipt cases, last `receipt: a passing receipt is written once`); `--frozen`: 10 passed; `check-edits --all`: 34 `ok`, no other line; firewall `check` (V4-T11d): 289 production files unchanged; guard on `core generator tests tools/bench tools/ig-proto/variants data plans lib lock docs tasks`: empty; stage-1 `evidence-check`: unchanged (20 files); `check-binding`: pass; `npm run check`: OK. The developer's mutants (no mode filter, a non-historical read, no `checkAccepted`, copies without the tree-id check, no path scrubbing, then the two new refusals) were each caught. No locked command and no machine time |
| Commit | this task's commit, `improve-generating T11d: Parity and P-0 receipts with required passes, and their accepted bindings` |
| Issues and named items | The first real parity and P-0 receipts come in stage 2 (N-V4-02); real `legacy` groups such as `14x14-master` on the `fr-*` arms are judged only by those runs. The real-data case reads the git-ignored stage-1 raw logs |
