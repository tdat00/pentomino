# T09c: The `live-deadline` kind of `v4-check accept`

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.5 ("`v4-check accept` recognizes the receipt's typed kind `live-deadline` with an expectation built apart from the receipt (both bounded twins' trees and parameter hashes), with no new command-line flag: the compiled `accept-live` step passes none"), §6 T4, §8.2 T09; N-V4-13; RV3-06 (an expectation apart from the receipt) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T09b |
| Depends on | T09b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (unlocked; synthetic cases in a private namespace) |

## Goal

`V4-LIVE`'s step `accept-live` runs `v4-check.mjs accept --task V4-LIVE --receipt
docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json --binding
docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json --by V4-LIVE` (and the runner's `--label`
and `--source-label`). Today `accept` refuses every kind but `stage1`, `parity` and `p0-identity`
(`v4-check.mjs:1595-1596`). This task adds the `live-deadline` kind, whose expectation is read from the freeze record,
the captured copies, the published runs files and their raw shard identities, never from the receipt, and which
requires the receipt's evidence index to hold every mandatory input.

## Authority and fixed points

- `acceptedBinding(o, readFile)` (`lib/proof.mjs:183`) checks the receipt with `proofCheck` against `{ kind:
  receipt.kind, source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST }, harnessHash, arms, coverage: {
  expected: coverage }, fields }` and throws unless it passes; the binding stores that expectation; `checkAccepted`
  (`lib/proof.mjs:209`) later re-checks it with today's `current` trees. `proofCheck` validates only the evidence the
  receipt lists (`lib/proof.mjs:161-167`): the mandatory index is checked here (SA-Astra's review R13: "Acceptance
  verifies that the complete required evidence index is present; it must not accept a receipt whose `evidence: []`
  omits all verification inputs").
- `V4-S4`'s prerequisite (`manifest.mjs:1809`) requires the binding's `expected.kind` to be `live-deadline` and its
  `expected.fields` to equal `LIVE_DEADLINE_FIELDS` exactly, with `current: ['fr-frozen', 'fr-frozen-none']`: the
  expectation's `fields` are exactly `{ ...LIVE_DEADLINE_FIELDS }` and its `arms` both twins.
- No new flag: `--step` and `--manifest` are not needed for this kind (as for `stage1`). For its tests, `accept` and
  `main` take an optional second parameter `io` (`{ liveLayout }`, T09b's layout) that no command line passes
  (SA-Astra's review R14: the actual `accept` dispatch, in a private namespace).

## Scope

- Change: `tools/ig-proto/v4-check.mjs`: the import of `./live-deadline.mjs`; `LIVE_DEADLINE_FIELDS` added to the
  `./lib/proof.mjs` import; the exported `liveExpectation` and `liveRequiredEvidence`; `accept(argv, io = {})` (lines
  1571-1610 at the base) and `main(argv, io = {})` (line 1848), which passes `io` to the subcommand.
- Change: `tools/ig-proto/self-test.mjs`: two cases appended to `itemCases`; `runCheck(args, io = {})` passes `io` to
  `main`; in the existing case `accept: a binding is never rewritten` (`self-test.mjs:2837-2840` at the base), whose
  example of an unknown kind was `live-deadline`, the receipt becomes `w.write({ kind: 'deadline-projection' })` (the
  post-hoc projection's kind, which never satisfies the live deadline, D-V4-18) and the expected refusal `v4-check: accept
  knows the kinds stage1, parity, p0-identity, live-deadline\n` (step 4's text); the case's name and its other
  assertions are unchanged (ruling R-P24-15).
- Change: `tools/ig-proto/README.md`: the subsection of T09a gains the acceptance; the `accept` usage line names the
  kind.
- Guards: G1, G2, G3 (the three files).

## Steps

1. In `tools/ig-proto/v4-check.mjs`, add `import { FREEZE_PATH, LIVE_ARMS, LIVE_COVERAGE, LIVE_ROWS, LIVE_TWINS,
   LIVE_VERIFY_TASK, liveEvidencePaths, liveLayout, twinDerivationProblems } from './live-deadline.mjs';` after the `./lib/proof.mjs` import,
   and add `LIVE_DEADLINE_FIELDS` to that import's names.
2. After `stepExpectation` (`v4-check.mjs:1178`), add `export function liveExpectation(task, { layout =
   liveLayout(task), readFile = readRepoFile, listDir = (p) => (existsSync(abs(p)) ? readdirSync(abs(p)).sort() : [])
   } = {})`, which throws `accept: <reason>` at the first problem, in this order, and otherwise returns `{ harnessHash,
   arms, params, coverage: [...LIVE_COVERAGE], fields: { ...LIVE_DEADLINE_FIELDS } }`:
   - `no freeze record with variants (<layout.freeze>)`;
   - for each of `LIVE_ARMS`: `the freeze record has no identity of <id>`; `no captured tree metadata for <id>`
     (`<layout.inputs>/<id>.ig-tree.json`); `the captured tree <id> differs from the freeze record` (its `treeId`, or
     `sha256(JSON.stringify(copy.params))`, differs); `arms` gets `{ id, treeId, paramsHash }` and `params[id]` the copy's
     `params`;
   - the runs files (`<layout.runsDir>/*.runs.json` by `listDir`): `no published rows`; per file: `runs file <path> is
     not of the frozen source`; `rows of another tree <path>`; `no raw shard identity <shard>`
     (`<layout.rawDir>/<shard>/shard.json`); `runs file <path> differs from its raw shard`; then `the runs files name
     <n> producers` unless exactly one `meta.harness.harnessHash` (that is `harnessHash`);
   - the verification identity copy (`<layout.inputs>/verify-identity.json`): `no verification identity`; `the
     verification identity is not ig-selftest-identity version 1`; `the verification identity lacks <field>` (T09a's
     fields and types); `the verification record is <task>/<label>/<group>, not V4-LIVE-verify/frozen/v4`; `the verification ran another
     producer` (not `harnessHash`); `the verification ran another source`; for each of `LIVE_ARMS` `the verification
     tested another tree <id>` (against the freeze record); for each of `LIVE_TWINS`: `no captured tree metadata for
     <id>` and `the verification tested another tree <id>` (its `treeId` against `<layout.inputs>/<id>.ig-tree.json`);
     then the first of `twinDerivationProblems(<the two arms' copies>, <the two twins' copies>)` (T09a: each twin is its
     frozen parent with `w8` and its test deadline only, even when its recorded tree id equals the copy's; SA-Astra's
     review R2-06).
   The rules and texts are T09b's, applied to the copies and records this function reads itself; it never reads a
   tree folder or today's harness.
3. Add `export function liveRequiredEvidence(task, { layout = liveLayout(task), readFile = readRepoFile, listDir })`
   (the same `listDir` default): the runs files as step 2 lists them (`{ path, shard }`), the journal files of each
   `LIVE_ROWS` key (`<layout.rawDir>/<shard>/logs/` names starting `<rowKey>.` and ending `.jsonl`, except the row
   identity file `<rowKey>.row.jsonl`: exactly the files T09b's `receiptCommand` reads and binds, ruling R-P24-14; for
   the shard whose runs file holds the key), and returns `liveEvidencePaths(layout, { runs, journalFiles })`. A real
   logs folder holds one `<rowKey>.row.jsonl` per row and `liveFixture` writes them too, so the second case's passing
   `accept` checks that the receipt's index and this list agree.
4. In `accept` (`v4-check.mjs:1595-1601` at the base), replace the kind check, the `--step` check and the expectation
   with:

   ```js
   if (!['stage1', 'live-deadline', ...RECEIPT_KINDS].includes(receipt?.kind)) {
     return refuse('accept knows the kinds stage1, parity, p0-identity, live-deadline');
   }
   if (!['stage1', 'live-deadline'].includes(receipt.kind) && (args.step === undefined || args.manifest === undefined)) {
     return refuse(`accept needs --step and --manifest for a ${receipt.kind} receipt`);
   }
   if (receipt.kind === 'live-deadline') {
     const layout = io.liveLayout ?? liveLayout(args.task);
     const listed = new Map((Array.isArray(receipt.evidence) ? receipt.evidence : []).map((e) => [e?.path, e?.sha256]));
     for (const path of liveRequiredEvidence(args.task, { layout })) {
       if (!listed.has(path)) {
         return refuse(`the receipt's evidence index lacks ${path}`);
       }
       if (!existsSync(abs(path)) || sha256File(abs(path)) !== listed.get(path)) {
         return refuse(`the receipt's evidence ${path} changed`);
       }
     }
   }
   const expectation = receipt.kind === 'stage1' ? stage1Expectation(args.task)
     : receipt.kind === 'live-deadline' ? liveExpectation(args.task, { layout: io.liveLayout ?? liveLayout(args.task) })
       : stepExpectation(args.task, args.step, args.manifest, receipt.kind);
   ```

   Change the signature to `async function accept(argv, io = {})` with the JSDoc `@param {{ liveLayout?: ReturnType<typeof
   liveLayout> }} [io] A test seam: the layout of a live-deadline receipt (no command line passes it).`; update the
   JSDoc's kinds ("`stage1`, `parity`, `p0-identity` or `live-deadline`; the two middle kinds need `--step` and
   `--manifest`"). In `main`, change the signature to `export async function main(argv, io = {})` and the call
   `subcommands[command](rest)` to `subcommands[command](rest, io)` (the other subcommands ignore the second argument);
   the file's own `main(process.argv.slice(2))` call is unchanged.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `live-deadline: the acceptance expectation` | `liveFixture('tests/artifacts/ig-proto/selftest/S24-T09c-dev', 'S24-T09c-dev')`, then T09b's `receiptCommand([... '--require-pass' ...], { layout })` (a passing receipt with its captures); `liveExpectation('S24-T09c-dev', { layout })`; then, each in a fresh namespace, one change after the receipt: (1) `verify-identity.json` (the copy) with `task` `S24-T09c`; (2) with `label` `selftest`; (3) the copy of `fr-frozen-none-live-test.ig-tree.json` with another `treeId` (a stale test tree); (4) one runs file's `meta.harness.harnessHash` `'g'` and its raw `shard.json`'s `harnessHash` `'g'` (a mixed producer, each file consistent with its shard); (5) one runs file's `meta.harness.harnessHash` `'g'` only (a raw identity mismatch); (6) `verify-identity.json` removed (a missing recorded identity); (7) one runs file's `meta.source.sourceDigest` `'x'` (mixed source digests); (8) the copy of `fr-frozen-live-test.ig-tree.json` with a `chain` naming `fr-frozen-none` in place of `fr-frozen` (its `treeId` and the identity's unchanged: a consistent identity of the wrong parent); (9) the copy of `fr-frozen-none-live-test.ig-tree.json` with an extra edit `{ id: 'x-1' }` before `w8-1`; (10) `verify-identity.json` (the copy) with `version` 2; the folder is removed at the end | `harnessHash` today's; two arms; `params` of both; `coverage` equal to `LIVE_COVERAGE` (25 ids); `fields` deep-equal to `LIVE_DEADLINE_FIELDS`; then the throws (1) `accept: the verification record is S24-T09c/frozen/v4, not V4-LIVE-verify/frozen/v4`; (2) `... V4-LIVE-verify/selftest/v4 ...`; (3) `accept: the verification tested another tree fr-frozen-none-live-test`; (4) `accept: the runs files name 2 producers`; (5) `accept: runs file <path> differs from its raw shard`; (6) `accept: no verification identity`; (7) `accept: runs file <path> is not of the frozen source`; (8) `accept: the test derivative fr-frozen-live-test is not fr-frozen with w8`; (9) `accept: the test derivative fr-frozen-none-live-test has an edit other than w8-1`; (10) `accept: the verification identity is not ig-selftest-identity version 1` |
| same (`--items`) | `live-deadline: CLI receipt and accept` | a fresh `liveFixture` namespace `.../S24-T09c-cli`; `receiptCommand(['--task', 'S24-T09c-cli', '--require-pass', '--label', 'frozen', '--source-label', 'self-test'], { layout })`; then `main(['accept', '--task', 'S24-T09c-cli', '--receipt', layout.receipt, '--binding', layout.binding, '--by', 'S24-T09c', '--label', 'frozen', '--source-label', 'self-test'], { liveLayout: layout })` (the argument shape of `plans/V4-LIVE.json`'s `accept-live`, no kind, step or manifest flag); `checkAccepted(binding, { current })` with today's identities of `fr-frozen` and `fr-frozen-none`, then with `fr-frozen-none`'s `treeId` `'t9'`; the same `main(['accept', ...])` again; then a copy of the receipt at `<base>/omit.json` whose `evidence` lacks `<inputs>/verify-state.json`, accepted to `<base>/omit.accepted.json` | the receipt returns 0; `accept` returns 0 and writes the binding with `expected.kind` `live-deadline` and `expected.fields` deep-equal to `LIVE_DEADLINE_FIELDS`; `checkAccepted` `pass`, then `incomplete` with `stale arm fr-frozen-none`; the second `accept` returns 1 (`binding ... exists (an accepted binding is never rewritten)`) and the binding's bytes are unchanged; the omitted file returns 1 with `v4-check: the receipt's evidence index lacks <base>/evidence/S24-T09c-cli/inputs/live-deadline/verify-state.json` and writes no `omit.accepted.json` |

## Documentation

README, the subsection `### The live-deadline receipt (T09a to T09c)`: the acceptance (what `liveExpectation` reads and
checks, the required evidence index, why no flag, the test seam `io`), and the `accept` line in `## Commands` names the
four kinds.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T09c --label frozen` | repository root, first | `firewall: snapshot of S24-T09c` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T09c --horizon-s 285` | repository root (unlocked) | every case `PASS`; no folder `tests\artifacts\ig-proto\selftest\S24-T09c-*` left | 5 min |
| `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --current v4 --label frozen --source-label "frozen 3fc65f4"` | repository root | `binding: pass` (the other kinds' bindings are unaffected) | 2 min |
| `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-LIVE --label frozen --source-label "frozen 3fc65f4"` | repository root | `prerequisites: blocked (missing file docs/improve-generating/evidence/frozen/V4-S3/freeze.json)`, exit 1 (T12b writes it) | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T09c --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the three files | 1 min |

## Stop points and questions

- Stop and report if `plans/V4-LIVE.json`'s `accept-live` step differs from the Goal's command (the plan is fixed).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09c-B01 | A passing live-deadline receipt becomes the binding that stage 4 requires, for both bounded twins, only when its identities and its complete evidence index are confirmed from records the receipt did not write | the two cases | the PASS lines |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09c-T01 | `liveExpectation` reads the freeze record, the copies, the runs files and their raw shards and the verification identity, refuses the Tests table's ten changes, and its `fields` equal `LIVE_DEADLINE_FIELDS` | the first case | the PASS line |
| T09c-T02 | The actual `accept` dispatch with `V4-LIVE`'s argument shape writes the binding of a passing receipt once, without `--step` or `--manifest`; the binding passes `checkAccepted` for the two arms; an omitted mandatory input is refused | the second case | the PASS line |
| T09c-T03 | The other kinds behave as before; `npm run check`, the firewall and G1 to G3 pass | `check-binding`; the gates | their output |

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
| Start, end, duration | 2026-11-24 06:48 +07:00 (dispatch, base `5f3e9a3`); 2026-11-24 07:01 +07:00 (accepted); 14 min. The developer reported 06:48:08-06:53 and, after the ruling, -06:59:14 |
| Waiting for rulings | about 5 min (QUESTION 1 at 06:53, ruling relayed about 06:58) |
| Agent id, model | `b4db4924-803f-43f7-8ac4-707db651428d`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 44 calls; 4,437,218 input, 37,437 output, 4,319,777 cache-read tokens |
| AI credits | 109.99 (developer only) |
| Questions and rulings | QUESTION 1 (the existing case `accept: a binding is never rewritten` used `live-deadline` as its unknown kind): ruling R-P24-15 by SA-Opus, option (a) with the kind `deadline-projection` and the new refusal text listing `live-deadline`; the six open details accepted; pack amendment `b6f4eaa` |
| Fix rounds | 0 (the ruling round only) |
| Gates re-run by the orchestrator | `self-test --items --task S24-T09c-orch`: 231 passed, 0 failed (49 s; cases 230, 231 PASS); no `S24-T09c-*` scratch folder; P-0 `check-binding`: pass; `check-prerequisites --plan V4-LIVE`: blocked on `freeze.json` only, as expected; `firewall check --task S24-T09c`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 the three Scope files |
| Commit | this task's commit |
| Issues and named items | the first real acceptance is V4-LIVE's `accept-live` (S04), after T12b writes `freeze.json` |
