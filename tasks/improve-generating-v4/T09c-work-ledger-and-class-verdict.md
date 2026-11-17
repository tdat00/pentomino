# T09c: Admission statistics: the work ledger of a request, its bounds and the class verdict

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.2 (rule (c5) faster: "Work units per accepted puzzle are reported beside it and may not be worse with the screen", with the sentence of IG-P-Q37; rule (c5) fails closed; completion apart; admission against the cell gates), §3 P2 and P5 (the work units), §7 (IG-P-Q37); decisions D-V4-16, D-V4-17 (rewritten to IG-P-Q37's answer); review RV1-12 (R12), RV2-07 (R2-07), RV3-01 (IG-P-Q37), RV3-07, RV3-08, RV4-02, RV4-06 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T09b |
| Depends on | T09b; the journal lines of T02a (`start`, `p`, `phase`, `end`, `caps`, `count`), T02d (`begin`), T06a and T06b (`link`); T04b (`pairPrimitives` of `lib/ledger.mjs`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure functions; synthetic cases, unlocked) |

## Goal

The work condition of plan §5.2 judges the selection work a request consumed, speculative and losing calls included.
A worker killed inside a primitive leaves that primitive's work unreported, but never unbounded: the primitive
started with a proved upper bound of the units it can charge. This task writes the work ledger of one request row as
an interval `[lo, hi]` of consumed units, from its journal and linkage lines, with the conditions under which its
bookkeeping is complete; the work rule on those intervals; and then the class verdict of rule (c5) in its fixed order
on T09b's statistics.

## Authority and fixed points

- Plan §5.2 and R12 (accepted): the class procedure below, its order and its verdicts.
- **IG-P-Q37** (plan author, 2026-11-16; question at `cfcb735`, answer at `288669b`; plan §7 and §5.2), option (c),
  interval accounting from the primitives' own limits, decision D-V4-17 as rewritten:
  - per call, `lo` is the sum of its reported units (every completed rating's `tuple[4] + tuple[5]`, `ig-log.js`
    `recordRating`; every completed uniqueness count's `units`, T02a); an ended call has `hi = lo`; a call closed by
    a recorded termination has `hi = lo + bound` of its open primitive (a `begin` line, T02d, without its completion
    line) and `hi = lo` when none is open; more than one open primitive, a `bound` that is not a finite number from 0,
    or a completed primitive whose reported units exceed its own `bound` is a ledger problem (incomplete); every
    unrecorded loss stays incomplete;
  - per arm, `lo` and `hi` are summed over the rows and divided by the accepted puzzles. **Pass:** the screen's `hi`
    per accepted puzzle is at most the no-screen arm's `lo`. **Worse:** the screen's `lo` is above the no-screen
    arm's `hi`: `failed`. **Otherwise, or with an incomplete ledger: `unknown`**: the class is `inconclusive`
    (`work-unknown`) and uses no screen. A kill count is never a bound;
  - reported, not judged: both intervals, the completed-unit ratio (D-V4-17's former quantity) and `terminatedCalls`
    per arm. Feasibility is not claimed: the width is read from the stage-2 pilot journals and reported before the
    stage-3 freeze (T09e reports it; N-V4-03).
- RV3-07 (accepted): a call is closed only by its own `end` or by a confirmed `worker-end` link line (never by a
  `worker-end-request` or a `worker-end-failed` line) whose `threadId` equals the call id's second field from the end,
  whose `pid` equals its third field from the end, and whose `at` is at least the call's `start` `at`; every returned
  selection task matches its own ended call by identity (set attempt, batch slot and attempt, completion layout key);
  a completed speculative call counts in the sums but never stands in for another task's missing call.
- The journal facts this task relies on: a call id is `<row>:<pid>:<threadId>:<sequence>` (`ig-log.js` `startCall`);
  a call's lines are in one journal file, in the order the worker wrote them; the `start` line carries `stage` (`set`,
  `batch`, `completion`; `other` without `igStage`) and `attempt` (the set attempt number, log-5; `"<slot>/<attempt>"`
  for a batch call, T06a's link-1; `"c/<layout key>"` for a completion call, T06b); the `end` line carries `work`
  (the sum over the call's `p` lines), `profiles` (their number) and, for a `gen-v4` call, `locate.countWork`
  (T02a); a `caps` line `{ t: 'caps', call, count: true }` follows the `start` of every `gen-v4` call (T02a); a
  `begin` line `{ t: 'begin', call, kind: 'rate' | 'screen' | 'count', bound }` precedes every rating (`p` line) and
  every uniqueness count (`count` line) of a `gen-v4` call (T02d). Link lines (T06a, T06b): `set-complete`
  (`attempt`, `outcome`), `complete` (`slot`, `attempt`, `ok`, `outcome`), `completion-complete` (`index`, `key`,
  `valueKey`, `outcome`), `worker-end-request`, `worker-end` and `worker-end-failed` (`pid`, `threadId`, `at`).
  Pre-selection outcomes (no selection call ran): `carve` and `internal` for a set attempt
  (`core/engine/generate.js:131-136`), `layout` for a batch or completion candidate (`generate.js:226-237`, `:309`);
  every other returned outcome is a selection outcome.
- RV3-08 (accepted): a class with an evidence problem of T09b's `matchedSets` is `inconclusive` by `evidence`.
- RV4-02 (accepted, review 4): primitive accounting fails closed. At most one primitive is pending per call; a
  `begin` while one is pending is a problem at once, which a later completion never removes; a completion must match
  the pending kind and carry measured units (a `p` line of outcome `unsat` or `error` has zero placeholders, not
  measured work; `difficulty.js:313-318` throws `UnsatisfiableError` after the deduction has worked); an ended call,
  whatever its result, has no pending primitive; only a confirmed termination carries the one open primitive's
  bound into `hi`. Every malformed or lost sequence is incomplete even when its interval would otherwise pass. The
  rule of IG-P-Q37 is unchanged: these are the cases its "every unrecorded loss stays incomplete" covers.

## Scope

- Change: `tools/ig-proto/verdicts.mjs` (steps 1 and 2), `tools/ig-proto/self-test.mjs` (cases appended to
  `--items`), `tools/ig-proto/README.md` (T09a's section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T09c --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T09c --label frozen`.
1. **The work ledger** (pure exports of `verdicts.mjs`):
   - `parseLines(text, file)`: `{ lines, problems }`; an empty last line is ignored; a line that is not JSON gives
     the problem `unparseable line <n> of <file>`.
   - `rowLedger(lines, linkLines)`: `lines` are every line of the row's worker journals, each file's lines in file
     order; `linkLines` the lines of its `<rowKey>.link.jsonl` (`null` when the file is absent). Returns `{ complete,
     problems, calls, ended, terminated, open, lo, hi, ratingWork, countWork }`, `complete = problems.length === 0`, by
     these rules:
     1. `linkLines === null`: problem `no linkage`.
     2. Calls: one per `start` line; a second `start` with the same `call`: `duplicate start <call>`.
     3. Ownership: a `p`, `phase`, `caps`, `begin`, `count` or `end` line whose `call` has no `start` line (a `call` of
        `null` included): `unowned <t> line <call>`.
     4. Values: a `p` tuple whose `tuple[4]` or `tuple[5]` is not a finite number from 0, or a `count` whose `units`
        is not: `invalid work <call>`.
     5. Capability: a call with an `end`, `p`, `begin` or `count` line and not exactly one `caps` line with `count:
        true`: `missing caps <call>` (a call cut before its `caps` line, with no other line, has no work and no
        problem).
     6. Primitives (RV4-02): the problems of `pairPrimitives(<the call's lines in order>, call)` of
        `tools/ig-proto/lib/ledger.mjs` (T04b, imported unchanged): at most one pending primitive per call; `invalid
        begin`, `invalid bound`, `overlapping begin` (at once, never removed by a later completion), `unpaired <t>
        line`, `unquantified <outcome>` (a paired `p` line of outcome `unsat` or `error`; an unpaired one gives
        `unpaired p line` only) and `bound exceeded`, each with the
        call and the primitive's index among the call's `begin` lines; its `open` is the call's open primitive and
        its `lo` the call's `lo`.
     7. Closure: a call with two `end` lines: `duplicate end <call>`; a call without `end` is closed only by a
        `worker-end` line (`ev` exactly `'worker-end'`) whose `threadId` equals the call id's second field from the
        end, whose `pid` equals its third field from the end and whose `at` is at least the `start` line's `at`;
        else `open call <call>`. `ended` and `terminated` count the two kinds of closed calls. A worker that died
        before its termination was requested has `threadId` -1 in its `worker-end` line (Node's value once the
        thread is gone, T06b's report): it matches no call, so its calls stay open (incomplete, never zero work).
     8. Reconciliation of an ended call: the sum of its `p` lines' `tuple[4] + tuple[5]` equals `end.work`, their
        number equals `end.profiles`, and the sum of its `count` units equals `end.locate.countWork` (a finite number
        from 0); else `reconcile <call>: <field> <sum> != <end value>`. With no `count` line the sum is an explicit 0.
        An ended call with an open primitive, whatever its `result`: `unfinished primitive <call>` (its work is
        unreported; only a confirmed termination carries an open primitive's bound, RV4-02).
     9. Stage: a call of stage `other`: `unattributed call <call>`.
     10. Tasks to calls, by identity: every `set-complete` with a selection outcome needs exactly one ended call of
         stage `set` whose `attempt` equals its `attempt` (`unmatched set attempt <j>`); every `complete` with `ok:
         true` and a selection outcome needs exactly one ended call of stage `batch` whose `attempt` equals
         `` `${slot}/${attempt}` `` (`unmatched batch candidate <slot>/<attempt>`); every `completion-complete` with a
         selection outcome needs exactly one ended call of stage `completion` whose `attempt` equals its `key`
         (`unmatched completion task <key>`), and a string `valueKey` must equal `key` (`completion key mismatch
         <index>`).
     The interval: per closed call, `lo` the sum of its completed primitives' units; `hi = lo +` the `bound` of its
     open primitive for a terminated call, else `hi = lo` (a termination between primitives included); the row's `lo`,
     `hi`, `ratingWork` and `countWork` sum over the closed calls; `open` counts the open primitives.
   - `workRule(screenRows, noScreenRows)`: each row `{ ingested, ledger }` (T09a's `ingestRow` and this task's
     `rowLedger`); per arm `{ lo, hi, accepted, loRatio: lo / accepted, hiRatio: hi / accepted,
     completedRatio: lo / accepted,
     complete, rows, terminatedCalls }` (`accepted` the sum of `run.acceptedCount` of valid rows; `complete` when every
     row is valid and every ledger complete); `{ screen, noScreen, verdict }` with `verdict` `unknown` (an arm not
     complete or `accepted` 0), else `pass` (`screen.hiRatio <= noScreen.loRatio`), else `worse` (`screen.loRatio >
     noScreen.hiRatio`), else `unknown`.
2. **`classVerdict(input)`** with `input = { cells: [{ cell, screenRows, noScreenRows, screenLedgers, noScreenLedgers,
   screenCellGate }], reps, resamples, resampleSeed, quantity, capMs }` (rows: T09a's ingested rows; ledgers: objects
   from `rowKey` to `rowLedger` results; `screenCellGate`: `'pass' | 'fail' | 'incomplete'`, computed by T09d on the
   screen arm). It applies, in this order, the first condition that decides:
   1. `correctness`: a pairing of a cell (`pairRows(screenRows, noScreenRows, reps)`, T09b) has an `incorrect` row:
      `failed`;
   2. `incomplete-validation`: a pairing has a problem: `inconclusive`;
   3. `evidence`: `matchedSets` of a cell has an `evidence` entry: `inconclusive`;
   4. `matched-sets`: a cell has fewer than 15 matched sets with distinct seeds: `inconclusive`;
   5. `clue`: `clueRule` over the matched sets of every cell fails: `failed`;
   6. `faster`: `fasterRule` over `ratiosOf` per cell fails: `failed`;
   7. `work`: `workRule` over every row of the class (each with its ledger; a row without a ledger has `ledger: {
      complete: false, problems: ['no journal'], lo: 0, hi: 0 }`) is `worse`: `failed`; `unknown`: `inconclusive` with
      `decidedBy` `work-unknown`;
   8. `completion`: on a cell, the screen arm's valid rows reaching ten (counted with T09a's `reachedTen(run, {
      quantity })`; T09a's `completion` needs `responseBoundMs`, which this input does not carry) are fewer than the
      no-screen arm's minus 1: `failed`;
   9. `cell-gate`: a cell's `screenCellGate` is `fail`: `failed`; `incomplete`: `inconclusive`;
   else `admitted`. Returns `{ verdict: 'admitted' | 'failed' | 'inconclusive', decidedBy, clue, faster, work,
   evidence, completion: { [cell]: { screen, noScreen } }, problems }` (`decidedBy` `null` for `admitted`; `screen`
   and `noScreen` are the two counts of rule 8).
3. **Self-test** cases appended to `--items` (Tests table; through `const { v, row } = await verdictKit()`, as in
   T09b).
4. **README.md**: T09a's section gains the ledger's rules (the interval of IG-P-Q37, the ten rules), the work rule
   with its three verdicts and the class procedure.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, pure. Ledger lines are written literally: `S(call, stage, attempt, at)`
is `{ t: 'start', call, stage, attempt, at }`, `C(call)` `{ t: 'caps', call, count: true }`, `B(call, kind, bound)`
`{ t: 'begin', call, kind, bound }`, `P(call, i, main, census)` `{ t: 'p', call, i, tuple: ['locate', 6, 'in', 60,
main, census] }`, `N(call, units)` `{ t: 'count', call, units }`, `E(call, work, profiles, countWork, result = 'ok')`
`{ t: 'end', call, result, work, profiles, locate: { countWork } }`, `W(ev, threadId, at)` `{ t: 'link', ev, pid: 1,
threadId, at }`; call ids `r:1:<thread>:<seq>`; every `P` and `N` below is preceded by its `B` with bound 1,000 unless
stated. `arm(lo, hi, accepted)` is a row list whose ledgers sum to `lo` and `hi` with `accepted` puzzles. T09a's `row`
helper (`const { v, row } = await verdictKit()`) builds rows; `synthClass(spec)` builds a `classVerdict` input over
`spec.cells` and reps 0 to 19 where, unless
`spec` overrides a cell's rep, the screen row of rep `r` is `row(r, 's' + r, { accepted: 10, tenth: 30000, setKey: 'k'
+ r, clue: 12, K: 30 })` with ledger `{ complete: true, problems: [], lo: 100, hi: 100 }`, the no-screen row the same
(`K: 30` included) with `tenth: 45000`, `screenCellGate` `'pass'`, `quantity` 10, `capMs` 120,000, `resamples` 1,000 and `resampleSeed` 7.

| Case name | Input | Expected |
|---|---|---|
| `ledger: an open call is incomplete` | `S('r:1:2:1', 'batch', '1/0', 10)`, `C`, `B`, `P(.., 0, 100, 0)`; link lines `[]` | `complete` false; problems include `open call r:1:2:1` |
| `ledger: a missing count capability` | `S('r:1:2:1', 'set', 0, 10)`, `B`, `P(.., 0, 100, 0)`, `B`, `P(.., 1, 50, 10)`, `E(.., 160, 2, 0)`; link `[{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }]` | `complete` false; `missing caps r:1:2:1` |
| `ledger: an omitted losing attempt` | the previous call with its `C` line, and a second link line `set-complete` attempt 1 outcome `not-in-band` | `complete` false; `unmatched set attempt 1` |
| `ledger: an ended call with an explicit zero count` | the previous call with its `C` line and only the attempt-0 link line | `complete` true; `lo` 160; `hi` 160; `countWork` 0; `ended` 1 |
| `ledger: an open primitive at a confirmed termination` | `S('r:1:3:1', 'batch', '1/1', 10)`, `C`, `B(.., 'rate', 1000)`, `P(.., 0, 70, 0)`, `B(.., 'count', 500)`, `N(.., 30)`, `B(.., 'rate', 840)`; link `[W('worker-end', 3, 20)]` | `complete` true; `terminated` 1; `open` 1; `lo` 100; `hi` 940 |
| `ledger: a kill between primitives` | the previous call without its last `B`; same link | `complete` true; `open` 0; `lo` 100; `hi` 100 |
| `ledger: an overlapping begin` | the case-5 call with one more `B(.., 'screen', 300)` at the end | `complete` false; `overlapping begin r:1:3:1 3` |
| `ledger: an overlap is never erased` | `S('r:1:4:1', 'batch', '2/0', 10)`, `C`, `B(.., 'rate', 100)`, `B(.., 'rate', 10)`, `P(.., 0, 5, 0)`; link `[W('worker-end', 4, 20)]` | `complete` false; `overlapping begin r:1:4:1 1` (the completion of 5 units does not repair it) |
| `ledger: unquantified ratings` | `S('r:1:5:1', 'batch', '2/1', 10)`, `C`, `B(.., 'rate', 100)`, `{ t: 'p', call: 'r:1:5:1', i: 0, tuple: ['locate', 6, 'error', null, 0, 0] }`, `E(.., 0, 1, 0, 'error')`, link `[]`; then the same with outcome `'unsat'` | `complete` false; `unquantified error r:1:5:1 0`; then `unquantified unsat r:1:5:1 0` (never `lo` 0 as exact work) |
| `ledger: an ended error with an open primitive` | `S('r:1:6:1', 'batch', '2/2', 10)`, `C`, `B(.., 'rate', 100)`, `E(.., 0, 0, 0, 'error')`, link `[]` | `complete` false; `unfinished primitive r:1:6:1` |
| `ledger: a work-cap rating is quantified` | `S('r:1:7:1', 'batch', '3/0', 10)`, `C`, `B(.., 'rate', 1000)`, `{ t: 'p', call: 'r:1:7:1', i: 0, tuple: ['locate', 6, 'capped', null, 760, 0] }`, `E(.., 760, 1, 0)`, link `[{ t: 'link', ev: 'complete', slot: 3, attempt: 0, ok: true, outcome: 'not-in-band' }]` | `complete` true; `lo` 760; `hi` 760 |
| `ledger: an exceeded bound and an invalid bound` | the case-6 call with its first `B` bound 50 (the `P` reports 70); then the case-6 call with its second `B` bound `-1` | first: `bound exceeded r:1:3:1 0`; second: `invalid bound r:1:3:1`; both incomplete |
| `ledger: a termination request is not an end` | the case-5 call with link `[W('worker-end-request', 3, 12)]`; then `[W('worker-end', 3, 5)]` (before the start); then `[W('worker-end-request', 3, 12), W('worker-end', 3, 20)]`; then `[W('worker-end', -1, 20)]` (Node's `threadId` of a worker that died before its termination was requested, T06b) | first, second and fourth: `open call r:1:3:1`; third: closed, as in case 5 |
| `ledger: reconciliation and values` | the case-4 call with `E(.., 150, 2, 0)`; then with an added `B` and `N(.., -1)` | first: `reconcile r:1:2:1: work 160 != 150`; second: the problems include `invalid work r:1:2:1`; both incomplete |
| `ledger: completion tasks match by key` | ended completion calls (each with `C` and `E(.., 0, 0, 0)`) with `attempt` `'c/k1'` and `'c/k3'`; link `completion-complete` for `key` `'c/k1'` and `'c/k2'` (outcome `not-in-band`), and `complete` slot 2 attempt 0 outcome `layout` | `complete` false; the only problem is `unmatched completion task c/k2` (two returned tasks and two ended calls: equal counts do not match) |
| `ledger: an unowned line and no linkage` | a `P` line of call `r:1:9:9` without `start`; then a complete call with `linkLines` `null` | `unowned p line r:1:9:9`; `no linkage` |
| `work: the counterexample of IG-P-Q37 does not pass` | screen `arm(900, 1100, 10)` (completed 900, one open primitive bound 200) against no-screen `arm(1000, 1010, 10)` | `verdict` `unknown` (screen `hiRatio` 110 > no-screen `loRatio` 100; screen `loRatio` 90 not above 101); `completedRatio` 90 and 100 reported |
| `work: pass and worse` | screen `arm(800, 800, 10)` against no-screen `arm(1000, 1000, 10)`; then screen `arm(1200, 1200, 10)` against no-screen `arm(1000, 1010, 10)` | `pass`; then `worse` |
| `class: the defaults admit` | `synthClass({ cells: ['a', 'b'] })` | `admitted`, `decidedBy` `null`; `faster.geoMean` 1.5 (within 1e-12) |
| `class: 14 versus 15 matched sets` | cell `b`'s screen rows of reps 0 to 5 with `accepted` 0, `tenth` null and ledger `lo: 0, hi: 0`; then reps 0 to 4 only | first: `inconclusive`, `matched-sets`; second: `failed`, `completion` (15 against 20 reach ten) |
| `class: correctness before missing rows` | cell `a`'s no-screen rep 3 removed; then also cell `a`'s screen rep 2 with `over: { errors: [{ phase: 'validation', code: 'invalid-pack', message: 'x' }] }` | first: `inconclusive`, `incomplete-validation`; second: `failed`, `correctness` |
| `class: an evidence problem` | cell `a`'s screen rep 0 with `clues: []` | `inconclusive`, `evidence` |
| `class: the clue rule` | cell `a`'s screen rows of reps 0 to 8 with `clue: 14` (`K` stays 30); the case first asserts that `puzzleEvidence(run).clues` (T09a) is `null` for each of those nine rows | `failed`, `decidedBy` `clue` (`moved2` 9 of 40); never `evidence` (RV4-06) |
| `class: the faster rule` | every screen row with `tenth: 45000` | `failed`, `faster` |
| `class: the work rule` | every screen ledger `lo: 110, hi: 110`; then every screen ledger `lo: 90, hi: 120` | `failed`, `work`; then `inconclusive`, `work-unknown` |
| `class: a faster screen arm failing a cell gate` | `screenCellGate` `'fail'` on cell `b`; then `'incomplete'` | `failed`, `cell-gate`; then `inconclusive`, `cell-gate` |

## Documentation

`tools/ig-proto/README.md` (step 4).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T09c` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T09c --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a ledger rule, the interval rule of IG-P-Q37 or the order of the class procedure.
- `QUESTION:` when a journal fact of the Authority section does not hold in the `v4-link` tree (for example a `gen-v4`
  `end` line without `locate.countWork`, or a rating without its `begin` line).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09c-B01 | The work condition judges the consumed selection work on proved bounds: it passes only when the screen's upper bound per accepted puzzle is at most the no-screen arm's lower bound; IG-P-Q37's counterexample never passes | the two `work` cases; `class: the work rule` | self-test output |
| T09c-B02 | Missing journal data is never read as zero work: an open call, a missing capability, an omitted losing attempt, a returned task without its own call, an overlapping begin, an unquantified rating, an unfinished primitive, an exceeded or invalid bound or a failed reconciliation makes the work rule `unknown` | the ledger cases | self-test output |
| T09c-B03 | A class is admitted only by the procedure of plan §5.2; a correctness failure is never reported as missing evidence; incomplete clue evidence never admits | the class cases | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09c-T01 | Only a confirmed termination of the same process and thread after the call's start closes it; an open primitive adds its bound, a kill between primitives adds nothing; overlaps, unquantified ratings and unfinished primitives are incomplete (RV4-02) | cases 5 to 11 and 13 | self-test output |
| T09c-T02 | Tasks match their calls by identity | cases 3 and 15 | self-test output |
| T09c-T03 | The deciding conditions in their order | the class cases | self-test output |
| T09c-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

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
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |
