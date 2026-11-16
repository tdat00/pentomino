# T09b: Admission statistics: the work ledger of a request and the class verdict

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.2 ("Work units per accepted puzzle are reported beside it and may not be worse with the screen"; rule (c5) fails closed; completion apart; admission against the cell gates), §3 P2 and P5 (the work units); decisions D-V4-16, D-V4-17; review RV1-12 (R12), RV2-07 (R2-07) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T09a |
| Depends on | T09a; the journal lines of T02a (`start`, `p`, `phase`, `end`, `caps`, `count`) and T06 (`link`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure functions; synthetic cases, unlocked) |

## Goal

The work rule of plan §5.2 needs the work of every selection call of a request, losing and speculative attempts
included, and it must never read missing journal data as zero work. This task writes the work ledger of one request
row from its journal and linkage lines, with the conditions under which it is complete, then the class verdict of
rule (c5) in its fixed order on T09a's statistics.

## Authority and fixed points

- Plan §5.2 and R12 (accepted): the class procedure below, its order and its verdicts.
- R2-07 (review 2), with the unit fixed by the pack author (D-V4-17): the work of a request is the sum of the
  **metered units of its completed primitives**: every rating's `tuple[4] + tuple[5]` (main and census work of a `p`
  line, `ig-log.js` `recordRating`) and every uniqueness count's `units` (a `count` line, T02a); the same units P5's
  budget meters (T07a). A primitive that a worker termination interrupts has no line and no units: the frozen pool
  terminates the worker of every aborted task (`core/browser/worker-pool.js:293-325`, `discard` from `abortEntry`), and
  the batch aborts its in-flight speculative tasks at its end (`generation-client.js`, `controller.abort()` in the
  `finally` of the batch), so such terminations are routine; a call cut by a **recorded** termination (T06's
  `worker-end` line, written by the pool's own `terminate`) is closed with its completed primitives and counted in
  `terminatedCalls`, reported beside the ratio. An unrecorded loss (a call open without a recorded termination, a
  missing capability line, an unowned or invalid line, a failed reconciliation, a returned selection task without its
  call) makes the ledger incomplete, and an incomplete ledger never passes the work rule.
- The journal facts this task relies on (`tools/ig-proto/variants/files/log/core/engine/ig-log.js`): a call id is
  `<row>:<pid>:<threadId>:<sequence>` (`startCall`); the `start` line carries `stage` (`set`, `batch`, `completion`;
  `other` without `igStage`) and `attempt` (the set attempt number, log-5; `"<slot>/<attempt>"` for a batch call,
  T06's link-1; `null` for a completion call); the `end` line carries `work` (the sum over the call's `p` lines),
  `profiles` (their number) and, for a `gen-v4` call, `locate.countWork` (T02a); a `caps` line `{ t: 'caps', call,
  count: true }` follows the `start` of every `gen-v4` call (T02a). Link lines (T06): `set-complete` (`attempt`,
  `outcome`), `complete` (`slot`, `attempt`, `ok`, `outcome`), `completion-complete` (`index`, `outcome`),
  `worker-end` (`threadId`, `at`). Pre-selection outcomes (no selection call ran): `carve` and `internal` for a set
  attempt (`core/engine/generate.js:131-136`), `layout` for a batch or completion candidate (`generate.js:226-237`,
  `:309`); every other returned outcome is a selection outcome.

## Scope

- Change: `tools/ig-proto/verdicts.mjs` (steps 1 and 2), `tools/ig-proto/self-test.mjs` (cases appended to
  `--items`), `tools/ig-proto/README.md` (T09a's section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T09b --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T09b --label frozen`.
1. **The work ledger** (pure exports of `verdicts.mjs`):
   - `parseLines(text, file)`: `{ lines, problems }`; an empty last line is ignored; a line that is not JSON gives
     the problem `unparseable line <n> of <file>`.
   - `rowLedger(lines, linkLines)`: `lines` are every line of the row's worker journals, `linkLines` the lines of its
     `<rowKey>.link.jsonl` (`null` when the file is absent). Returns `{ complete, problems, calls, ended, terminated,
     ratingWork, countWork, work }`, `complete = problems.length === 0`, by these rules:
     1. `linkLines === null`: problem `no linkage`.
     2. Calls: one per `start` line; a second `start` with the same `call`: `duplicate start <call>`.
     3. Ownership: a `p`, `phase`, `caps`, `count` or `end` line whose `call` has no `start` line (a `call` of `null`
        included): `unowned <t> line <call>`.
     4. Values: a `p` tuple whose `tuple[4]` or `tuple[5]` is not a finite number from 0, or a `count` whose `units`
        is not: `invalid work <call>`.
     5. Capability: a call with an `end`, `p` or `count` line and not exactly one `caps` line with `count: true`:
        `missing caps <call>` (a call cut before its `caps` line, with no other line, has no work and no problem).
     6. Closure: a call with two `end` lines: `duplicate end <call>`; a call without `end` is closed when a
        `worker-end` link line has `threadId` equal to the call id's second-to-last field and `at` at least the
        `start` line's `at`; else `open call <call>`. `ended` and `terminated` count the two kinds of closed calls.
     7. Reconciliation of an ended call: the sum of its `p` lines' `tuple[4] + tuple[5]` equals `end.work`, their
        number equals `end.profiles`, and the sum of its `count` units equals `end.locate.countWork` (a finite number
        from 0); else `reconcile <call>: <field> <sum> != <end value>`. With no `count` line the sum is an explicit 0.
     8. Stage: a call of stage `other`: `unattributed call <call>`.
     9. Tasks to calls: every `set-complete` with a selection outcome needs exactly one ended call of stage `set`
        whose `attempt` equals its `attempt` (`unmatched set attempt <j>`); every `complete` with `ok: true` and a
        selection outcome needs exactly one ended call of stage `batch` whose `attempt` equals `` `${slot}/${attempt}` ``
        (`unmatched batch candidate <slot>/<attempt>`); the number of `completion-complete` lines with a selection
        outcome is at most the number of ended calls of stage `completion` (`unmatched completion tasks <n> > <m>`).
     `ratingWork` and `countWork` are the sums over all closed calls (ended and terminated); `work = ratingWork +
     countWork`.
   - `workRule(screenRows, noScreenRows)`: each row `{ ingested, ledger }` (T09a's `ingestRow` and `rowLedger`); per
     arm `{ work, accepted, ratio, complete, rows, terminatedCalls }` with `work` the sum of the ledgers' `work`,
     `accepted` the sum of `run.acceptedCount` of valid rows, `ratio = work / accepted`, `complete` when every row is
     valid and every ledger complete; `{ screen, noScreen, verdict }` with `verdict` `unknown` (an arm not complete or
     `accepted` 0), `worse` (`screen.ratio > noScreen.ratio`) or `pass`.
2. **`classVerdict(input)`** with `input = { cells: [{ cell, screenRows, noScreenRows, screenLedgers, noScreenLedgers,
   screenCellGate }], reps, resamples, resampleSeed, quantity, capMs }` (rows: T09a's ingested rows; ledgers: objects
   from `rowKey` to `rowLedger` results; `screenCellGate`: `'pass' | 'fail' | 'incomplete'`, computed by T09c on the
   screen arm). It applies, in this order, the first condition that decides:
   1. `correctness`: a pairing of a cell (`pairRows(screenRows, noScreenRows, reps)`) has an `incorrect` row: `failed`;
   2. `incomplete-validation`: a pairing has a problem: `inconclusive`;
   3. `matched-sets`: a cell has fewer than 15 matched sets with distinct seeds: `inconclusive`;
   4. `clue`: `clueRule` over the matched sets of every cell fails: `failed`;
   5. `faster`: `fasterRule` over `ratiosOf` per cell fails: `failed`;
   6. `work`: `workRule` over every row of the class (each with its ledger; a row without a ledger has `ledger: {
      complete: false, problems: ['no journal'], work: 0 }`) is `worse`: `failed`; `unknown`: `inconclusive` with
      `decidedBy` `work-unknown`;
   7. `completion`: on a cell, the screen arm's valid rows reaching ten are fewer than the no-screen arm's minus 1:
      `failed`;
   8. `cell-gate`: a cell's `screenCellGate` is `fail`: `failed`; `incomplete`: `inconclusive`;
   else `admitted`. Returns `{ verdict: 'admitted' | 'failed' | 'inconclusive', decidedBy, clue, faster, work,
   completion: { [cell]: { screen, noScreen } }, problems }` (`decidedBy` `null` for `admitted`).
3. **Self-test** cases appended to `--items` (Tests table).
4. **README.md**: T09a's section gains the ledger's rules (the metered unit, recorded terminations, the nine rules),
   the work rule and the class procedure.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, pure. Ledger lines are written literally: `S(call, stage, attempt, at)`
is `{ t: 'start', call, stage, attempt, at }`, `C(call)` `{ t: 'caps', call, count: true }`, `P(call, i, main, census)`
`{ t: 'p', call, i, tuple: ['locate', 6, 'in', 60, main, census] }`, `N(call, units)` `{ t: 'count', call, units }`,
`E(call, work, profiles, countWork)` `{ t: 'end', call, result: 'ok', work, profiles, locate: { countWork } }`; call
ids `r:1:<thread>:<seq>`. T09a's `row` helper builds rows; `synthClass(spec)` builds a `classVerdict` input over
`spec.cells` and reps 0 to 19 where, unless `spec` overrides a cell's rep, the screen row of rep `r` is `row(r, 's' + r,
{ accepted: 10, tenth: 30000, setKey: 'k' + r, clues: [12] })` with ledger `{ complete: true, problems: [], work: 100 }`,
the no-screen row the same with `tenth: 45000`, `screenCellGate` `'pass'`, `quantity` 10, `capMs` 120,000,
`resamples` 1,000 and `resampleSeed` 7.

| Case name | Input | Expected |
|---|---|---|
| `ledger: an open call is incomplete` | `S('r:1:2:1', 'batch', '1/0', 10)`, `C`, `P(.., 0, 100, 0)`; link lines `[]` | `complete` false; problems include `open call r:1:2:1` |
| `ledger: a missing count capability` | `S('r:1:2:1', 'set', 0, 10)`, `P(.., 0, 100, 0)`, `P(.., 1, 50, 10)`, `E(.., 160, 2, 0)`; link `[{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }]` | `complete` false; `missing caps r:1:2:1` |
| `ledger: an omitted losing attempt` | the previous call with its `C` line, and a second link line `set-complete` attempt 1 outcome `not-in-band` | `complete` false; `unmatched set attempt 1` |
| `ledger: complete with an explicit zero count` | the previous call with its `C` line and only the attempt-0 link line | `complete` true; `ratingWork` 160; `countWork` 0; `work` 160; `ended` 1 |
| `ledger: a recorded termination closes a call` | `S('r:1:3:1', 'batch', '1/1', 10)`, `C`, `P(.., 0, 70, 0)`, `N(.., 30)`; link `[{ t: 'link', ev: 'worker-end', threadId: 3, at: 20 }]` | `complete` true; `terminated` 1; `work` 100 |
| `ledger: reconciliation and values` | the zero-count case with `E(.., 150, 2, 0)`; then with an added `N(.., -1)` | first: `reconcile r:1:2:1: work 160 != 150`; second: the problems include `invalid work r:1:2:1`; both incomplete |
| `ledger: batch and completion tasks` | an ended batch call `'1/0'` with its `C`; link `complete` slot 1 attempt 0 `ok: true` outcome `candidate`, `complete` slot 2 attempt 0 outcome `layout`, `completion-complete` outcome `not-in-band` | `complete` false; the only problem is `unmatched completion tasks 1 > 0` |
| `ledger: an unowned line and no linkage` | a `P` line of call `r:1:9:9` without `start`; then a complete call with `linkLines` `null` | `unowned p line r:1:9:9`; `no linkage` |
| `class: the defaults admit` | `synthClass({ cells: ['a', 'b'] })` | `admitted`, `decidedBy` `null`; `faster.geoMean` 1.5 (within 1e-12) |
| `class: 14 versus 15 matched sets` | cell `b`'s screen rows of reps 0 to 5 with `accepted` 0, `tenth` null and ledger `work: 0`; then reps 0 to 4 only | first: `inconclusive`, `matched-sets`; second: `failed`, `completion` (15 against 20 reach ten) |
| `class: correctness before missing rows` | cell `a`'s no-screen rep 3 removed; then also cell `a`'s screen rep 2 with `over: { errors: [{ phase: 'validation', code: 'invalid-pack', message: 'x' }] }` | first: `inconclusive`, `incomplete-validation`; second: `failed`, `correctness` |
| `class: the clue rule` | cell `a`'s screen rows of reps 0 to 8 with `clues: [14]` | `failed`, `clue` (`moved2` 9 of 40) |
| `class: the faster rule` | every screen row with `tenth: 45000` | `failed`, `faster` |
| `class: the work rule` | every screen ledger `work: 110`; then one screen ledger `complete: false` | `failed`, `work`; then `inconclusive`, `work-unknown` |
| `class: a faster screen arm failing a cell gate` | `screenCellGate` `'fail'` on cell `b`; then `'incomplete'` | `failed`, `cell-gate`; then `inconclusive`, `cell-gate` |

## Documentation

`tools/ig-proto/README.md` (step 4).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T09b` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T09b --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a ledger rule, the unit of D-V4-17 or the order of the class procedure.
- `QUESTION:` when a journal fact of the Authority section does not hold in the `v4-link` tree (for example a `gen-v4`
  `end` line without `locate.countWork`).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09b-B01 | Missing journal data is never read as zero work: an open call, a missing capability, an omitted losing attempt or a failed reconciliation makes the work rule `unknown` | ledger cases 1 to 3, 6 to 8; `class: the work rule` | self-test output |
| T09b-B02 | A class is admitted only by the procedure of plan §5.2, and a correctness failure is never reported as missing evidence | the class cases | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09b-T01 | A recorded termination closes a call with its completed primitives and is counted; an explicit zero count is complete | ledger cases 4 and 5 | self-test output |
| T09b-T02 | The deciding conditions in their order | the class cases | self-test output |
| T09b-T03 | Nothing else changed; formats | guards; `npm run check` | command output |

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
