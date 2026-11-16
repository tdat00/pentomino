# T02b: `gen-v4` prototype: observers, skip replay and legacy dispatch

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 ("Skip replay", "Observers", "Parity passes"), §6 (the tests every phase keeps: observers, replay, scope), §9; decisions D-V4-03, D-V4-04, D-V4-06; drift DR-O08, DR-O14, DR-A06; review RV1-04, RV1-20, RV2-19 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T02a |
| Depends on | T02a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (synthetic ratings on one carved set; verification through the lock helper) |

## Goal

Before any machine time is spent, prove that the rebuilt prototype keeps the frozen contracts that plan §5.1 lists:
observers change nothing and propagate their exceptions, every rating attempt is charged once before its event, a
recorded skip list replays to the same result and an extra entry is refused, and the levels outside the new scope run
the frozen search unchanged. The version and provenance contract is T02c's.

## Authority and fixed points

- Plan §5.1: "An observer that returns normally changes neither a result nor a loop's control flow. An exception
  thrown by `record` or `charge` propagates unchanged"; "Every rating attempt is charged once, before its event";
  "a recorded skip list replays to the same puzzles"; §6 "Scope: for Very easy to Master, `gen-v4` returns the puzzles
  of `gen-v3` for the same effective request".
- The synthetic seams (`ctx.igScreen`, `ctx.igCanonical`, `ctx.rate`) carry no detail by design; the recorded detail
  path (RV1-04) is proved on real calls in the stage-1 runs (T04e, with the checks of T04a to T04d).
- IG-P-Q37 point 5: the begin line that T02d adds later before every rating and count joins these observer-parity
  passes; it is proved by T02d's case `bound: the journal changes no result` and by the stage-1 parity passes of T04e,
  whose trees contain it. This task's cases run before T02d and need no change for it.
- Nothing outside `tools/ig-proto/self-test.mjs` changes. If a case fails because `ig-select-v4.js` is wrong, stop
  with `QUESTION:` (the fix belongs to T02a's file and is ruled by the pack author).

## Scope

- Change: `tools/ig-proto/self-test.mjs` (five cases appended to `v4Cases`; helpers; the header line of `--v4`).
- Do not change: everything else, `ig-select-v4.js` included. Guards:
  `node tools\ig-proto\firewall.mjs check --task V4-T02b --label frozen`, expected `files unchanged`;
  `git status --short -- tools/ig-proto/variants core generator tests/fixtures`, expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T02b --label frozen`.
1. **Helpers** in `self-test.mjs`, next to `v4Call`:
   - `v4Ctx(e, ws, name, extra)`: returns the `SelectContext` that `v4Call` builds (the K = 15 set of `k15Set()`,
     `target: BAND`, `rng: e.rng.createRng(e.rng.normalizeSeedText('ig-selftest/v4/' + name), 'selftest/' + name)`,
     `uniqueness: 'any'`, `excludeClueKeys: new Set()`, `ws`, `igStage: 'set'`) merged with `extra`.
   - `synth(e, fn)`: the `make` function of `protoCall` (a count function that returns a rating or `'cap'`, the cap
     thrown as the tree's `IncompleteRatingError` with `{ nodes: 1, work: e.policy.DEDUCE.work, stop: 'work-cap' }`).
   - `REBRACKETED = { screen: () => 'cap', canon: (c) => synthetic(100 - 10 * c) }` and
     `DOWN = (c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c))`.
2. **Cases** (in this order, after T02a's three):
   1. `v4: observers parity (synthetic, require)`.
   2. `v4: throwing observers propagate`.
   3. `v4: skip replay round trip`.
   4. `v4: legacy dispatch equals the frozen search`.
   5. `v4: the rate seam keeps priority on the screened route`.
   Inputs and expected values are in the Tests table; each case asserts with the file's `assert` and `same`.
3. **README.md** is not changed (T02a's section covers the prototype); the `--v4` line of the file header lists the
   eight cases.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --v4` | `v4: observers parity (synthetic, require)` | three calls of the `v4` tree's `selectClues` with `v4Ctx(e, ws, 'parity', { uniqueness: 'require', igPrior: null, igScreen: synth(e, REBRACKETED.screen), igCanonical: synth(e, REBRACKETED.canon) })`: (A) no observer; (B) `charge: (u) => log.push(['charge', u])`; (C) the same `charge` and `record: (ev) => log.push(['event', ev])`, each with a fresh rng of the same seed | A, B and C results deep-equal (with `skips` and, when `ok`, `igWindow`); the charged units of B deep-equal those of C; in C every event of kind `rated`, `unrateable` or `rejected` comes right after a `charge` entry; every event's `kind` is one of `rated`, `unrateable`, `rejected`, `skip`, `repair`, `selected`; every `phase` present is one of `locate`, `window`, `seed`, `beam`, `rescue`, `rerate`; every `sequence` present is an integer from 0 to 2191; one `selected` event, the last one, exactly when `A.ok` |
| same | `v4: throwing observers propagate` | `v4Ctx(e, ws, 'throw', { igPrior: null, igScreen: synth(e, REBRACKETED.screen), igCanonical: synth(e, REBRACKETED.canon) })` with (i) a `charge` that throws `boomC = new Error('charge-stop')` at its third call; (ii) a `record` that throws `boomR = new Error('record-stop')` at its second event; `IG_LOG_DIR` set as in `v4Call` | (i) the call throws exactly `boomC` (`caught === boomC`); (ii) exactly `boomR`; in both journals the `end` line has `result: 'error'` |
| same | `v4: skip replay round trip` | R0: `v4Ctx(e, ws, 'skip', { igPrior: null, igScreen: synth(e, DOWN), igCanonical: synth(e, DOWN), record })`; `K0` = the `clueKey`s (tree's `keys.clueKey` on `carved.set.witness` filtered to the event's `clueIds`) of the events with `sequence` 0 and 1. R1: the same context without `record` and with `excludeClueKeys: new Set(K0)`. R2: `excludeClueKeys: new Set()`, `replaySkips: R1.skips`. R3: `replaySkips: { subsets: [...R1.skips.subsets, 2191], repairs: [] }` | `R1.skips.subsets[0] === 0`; R2 deep-equals R1; R3 throws the tree's `SkipReplayError` with `reason: 'unused'`, `list: 'subsets'`, `ordinal: 2191` |
| same | `v4: legacy dispatch equals the frozen search` | the K = 15 set, `target: e.levels.level('master')`, `uniqueness: 'any'`, `rate: (b, p, c) => synthetic(c.length <= 2 ? 60 : Math.max(5, 75 - 5 * c.length))`, the same rng seed, called in the `v4` tree (with `IG_LOG_DIR`, no recorder) and in the `base` tree; then the same two calls with `record: (ev) => list.push(ev)` (one list per tree) and no `IG_LOG_DIR` | the two unrecorded results deep-equal; the `v4` journal's `start` line has `W: null` and `priorCount: null`; its phases contain `p1` and no `locate`; the two recorded results deep-equal and their event lists deep-equal (the recorded route calls the frozen search directly) |
| same | `v4: the rate seam keeps priority on the screened route` | `v4Ctx(e, ws, 'seam', { igPrior: null, rate })` with no `igScreen` and no `igCanonical` (the `v4` tree screens at 190 M, so the screened path is taken), `IG_LOG_DIR` set as in `v4Call`: (i) `rate = () => { throw boom; }` with `boom = new Error('seam')`; (ii) `rate = (b, p, c) => { calls += 1; return synthetic(100 - 10 * c.length); }` | (i) the call throws exactly `boom`; (ii) `calls` equals the number of `p` lines of the call's journal (every rating went through the seam; none was a native solve) and is at least 1 |

The expected values follow from the frozen code. If a case fails, report the actual values with the case's input
(`QUESTION:`); never change an expected value or `ig-select-v4.js`.

## Documentation

The header comment of `self-test.mjs` (the `--v4` line). No other document.

## Commands and gates

The `--v4` group runs through the lock helper (check-list §3.1 and §3.2): case 1 runs real uniqueness counts.

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `Invoke-IgNode -Repo pentomino -Task 'V4-T02b verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--v4', '--task', 'V4-T02b')` (check-list §3.2) | root | eight cases pass (T02a's three and these five), exit 0 | 5 min (the helper's 300 s) |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T01b` | root | the eight `--frozen` cases pass | 2 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | one `ok` line per declared variant, no error | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T02b --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: editing `ig-select-v4.js`, a variant manifest, the fixture or a production file.
- `QUESTION:` when a case fails; with the actual values and the input.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02b-B01 | The prototype keeps plan §5.1's observer and skip-replay contracts, proved before any machine time | cases 1 to 3 pass | self-test output |
| T02b-B02 | A level outside the new scope gives the frozen search's results and events in a `v4` tree | case 4 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02b-T01 | Observers absent, `charge` alone and `record` with `charge` give equal results and units; charge before event | case 1 | self-test output |
| T02b-T02 | `charge` and `record` exceptions propagate unchanged | case 2 | self-test output |
| T02b-T03 | Skip replay round trip; an unused entry is refused | case 3 | self-test output |
| T02b-T04 | Master in a `v4` tree equals the frozen `base` search, unrecorded and recorded | case 4 | self-test output |
| T02b-T05 | An explicit `ctx.rate` seam is used on the screened route, with no native solve | case 5 | self-test output |
| T02b-T06 | Nothing else changed; formats | guards; `npm run check` | command output |

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
